import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cifrarToken } from "../../src/services/musica/crypto.js";

const fetchMock = vi.fn();
vi.stubEnv("LASTFM_API_KEY", "lastfm-test-key");
vi.stubEnv("MUSICA_TOKEN_KEY", Buffer.alloc(32, 5).toString("base64"));
vi.stubGlobal("fetch", fetchMock);

vi.mock("../../src/services/EmailService.js", () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}));

const { default: app } = await import("../../src/app.js");
const { default: prisma } = await import("../../src/database/prisma.js");
const { limparCacheMusica } = await import("../../src/services/musica/MusicaModel.js");
const { limparTokensSpotifyEmMemoria } = await import("../../src/services/musica/spotifyOAuth.js");

type Conta = { id: number; token: string };
let dono: Conta;
let membro: Conta;
let intruso: Conta;
let idClube = 0;

const auth = (conta: Conta) => ({ Authorization: `Bearer ${conta.token}` });

async function cadastrar(nome: string): Promise<Conta> {
  const result = await request(app).post("/api/usuarios").send({
    nome_completo: `Música ${nome}`,
    email: `musica-${nome}-${Date.now()}-${Math.random()}@example.com`,
    senha: "123456",
  });
  expect(result.status).toBe(201);
  return { id: result.body.usuario.id_usuario, token: result.body.token };
}

beforeAll(async () => {
  dono = await cadastrar("dono");
  membro = await cadastrar("membro");
  intruso = await cadastrar("intruso");
  const clube = await prisma.clube.create({ data: { nome: `Clube Música ${Date.now()}` } });
  idClube = clube.id_clube;
  await prisma.clubeMembro.createMany({
    data: [
      { id_clube: idClube, id_usuario: dono.id },
      { id_clube: idClube, id_usuario: membro.id },
    ],
  });
});

afterAll(async () => {
  await prisma.conexaoMusica.deleteMany({ where: { id_usuario: { in: [dono.id, membro.id, intruso.id] } } });
  if (idClube) await prisma.clube.delete({ where: { id_clube: idClube } });
  for (const conta of [dono, membro, intruso]) {
    await request(app).delete(`/api/usuarios/${conta.id}`).set(auth(conta));
  }
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  fetchMock.mockReset();
  limparCacheMusica();
});

describe("API de leitura de Música", () => {
  it("retorna sem conexão sem consultar qualquer provedor", async () => {
    const response = await request(app).get(`/api/musica/usuario/${dono.id}/agora`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conectado: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("conecta Last.fm após validar o usuário e permite gerenciar visibilidade/desconexão", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      user: { name: "ArtistaLastFm", realname: "Artista Last.fm" },
    }), { status: 200 }));
    const connected = await request(app)
      .post("/api/musica/lastfm/conectar")
      .set(auth(dono))
      .send({ username: "artista_lastfm" });
    expect(connected.status).toBe(200);
    expect(connected.body).toMatchObject({
      conectado: true,
      provedor: "lastfm",
      id_externo: "ArtistaLastFm",
      nome_exibicao: "Artista Last.fm",
    });
    expect(connected.body).not.toHaveProperty("refresh_token_cifrado");

    const status = await request(app).get("/api/musica/minha").set(auth(dono));
    expect(status.body).toMatchObject({ conectado: true, visibilidade: "publico" });
    expect((await request(app)
      .patch("/api/musica/minha")
      .set(auth(dono))
      .send({ visibilidade: "oculto" })).body.visibilidade).toBe("oculto");
    expect((await request(app)
      .delete("/api/musica/minha")
      .set(auth(dono))).body).toEqual({ desconectado: true });
    expect((await request(app).get("/api/musica/minha").set(auth(dono))).body).toEqual({ conectado: false });
  });

  it("aplica privacidade de clubes no servidor e permite dados a membros do mesmo clube", async () => {
    await prisma.conexaoMusica.create({
      data: {
        id_usuario: dono.id,
        provedor: "lastfm",
        id_externo: "usuario-teste",
        nome_exibicao: "Conta Last.fm",
        visibilidade: "clubes",
      },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ recenttracks: { track: [] } }), { status: 200 }));

    const bloqueado = await request(app).get(`/api/musica/usuario/${dono.id}/agora`);
    const permitido = await request(app)
      .get(`/api/musica/usuario/${dono.id}/agora`)
      .set(auth(membro));

    expect(bloqueado.body).toMatchObject({ conectado: false, estado: "oculto" });
    expect(permitido.body).toMatchObject({
      conectado: true,
      provedor: "lastfm",
      nome_exibicao: "Conta Last.fm",
      tocando: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explica atividade Last.fm privada e propaga Retry-After em 429", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 17 }), { status: 200 }));
    const privado = await request(app)
      .get(`/api/musica/usuario/${dono.id}/agora`)
      .set(auth(dono));
    expect(privado.body).toEqual({ conectado: false, estado: "atividade_privada" });

    limparCacheMusica();
    fetchMock.mockResolvedValueOnce(new Response(null, {
      status: 429,
      headers: { "Retry-After": "45" },
    }));
    const limitado = await request(app)
      .get(`/api/musica/usuario/${dono.id}/top?tipo=artistas`)
      .set(auth(dono));
    expect(limitado.status).toBe(429);
    expect(limitado.headers["retry-after"]).toBe("45");
  });

  it("oculta conteúdo ao não membro e deduplica consultas simultâneas do Last.fm", async () => {
    await prisma.conexaoMusica.update({
      where: { id_usuario: dono.id },
      data: { visibilidade: "publico" },
    });
    let completar!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { completar = resolve; }));
    const primeira = request(app)
      .get(`/api/musica/usuario/${dono.id}/top?tipo=artistas&periodo=curto&limite=5`)
      .then((response) => response);
    const segunda = request(app)
      .get(`/api/musica/usuario/${dono.id}/top?tipo=artistas&periodo=curto&limite=5`)
      .then((response) => response);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    completar(new Response(JSON.stringify({
      topartists: {
        artist: [{ name: "Artista Top", mbid: "lastfm-id", url: "https://last.fm/artist/test", image: [] }],
      },
    }), { status: 200 }));
    const [top1, top2] = await Promise.all([primeira, segunda]);
    await prisma.conexaoMusica.update({
      where: { id_usuario: dono.id },
      data: { visibilidade: "clubes" },
    });
    const oculto = await request(app)
      .get(`/api/musica/usuario/${dono.id}/top?tipo=artistas`)
      .set(auth(intruso));

    expect(top1.body.itens[0]).toMatchObject({ tipo: "artista", nome: "Artista Top" });
    expect(top2.body.itens).toEqual(top1.body.itens);
    expect(oculto.body).toMatchObject({ conectado: false, estado: "oculto" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normaliza faixa atual e respeita períodos e limites de top do Last.fm", async () => {
    await prisma.conexaoMusica.update({
      where: { id_usuario: dono.id },
      data: { visibilidade: "publico" },
    });
    fetchMock.mockImplementation(async (input: URL) => {
      if (input.searchParams.get("method") === "user.getRecentTracks") {
        return new Response(JSON.stringify({ recenttracks: { track: [{
          name: "Agora",
          artist: { "#text": "Artista" },
          "@attr": { nowplaying: "true" },
        }] } }), { status: 200 });
      }
      return new Response(JSON.stringify({ toptracks: { track: [] } }), { status: 200 });
    });
    const agora = await request(app).get(`/api/musica/usuario/${dono.id}/agora`);
    const top = await request(app)
      .get(`/api/musica/usuario/${dono.id}/top?tipo=faixas&periodo=longo&limite=7`);
    const consulta = fetchMock.mock.calls.find(([input]) =>
      (input as URL).searchParams.get("method") === "user.getTopTracks",
    )?.[0] as URL;

    expect(agora.body).toMatchObject({
      tocando: true,
      item: { nome: "Agora", artistas: ["Artista"], ouvindo_agora: true },
    });
    expect(top.body).toMatchObject({ conectado: true, tipo: "faixa", periodo: "longo", itens: [] });
    expect(consulta.searchParams.get("period")).toBe("12month");
    expect(consulta.searchParams.get("limit")).toBe("7");
    expect((await request(app).get(`/api/musica/usuario/${dono.id}/top?tipo=faixas&limite=51`)).status).toBe(400);
  });

  it("renova token após 401, traduz 403 do Spotify e respeita Retry-After em 429", async () => {
    await prisma.conexaoMusica.create({
      data: {
        id_usuario: intruso.id,
        provedor: "spotify",
        id_externo: "spotify-user",
        nome_exibicao: "Conta Spotify",
        refresh_token_cifrado: cifrarToken("refresh-secret"),
        visibilidade: "publico",
      },
    });
    limparTokensSpotifyEmMemoria(intruso.id);
    let tokenRequests = 0;
    let playbackRequests = 0;
    fetchMock.mockImplementation(async (input: string | URL) => {
      if (String(input) === "https://accounts.spotify.com/api/token") {
        tokenRequests += 1;
        return new Response(JSON.stringify({ access_token: `access-${tokenRequests}`, expires_in: 3600 }), { status: 200 });
      }
      if (String(input) === "https://api.spotify.com/v1/me/player/currently-playing") {
        playbackRequests += 1;
        if (playbackRequests === 1) return new Response(null, { status: 401 });
        if (playbackRequests === 2) return new Response(JSON.stringify({
          is_playing: true,
          progress_ms: 12_000,
          item: {
            id: "track-id",
            name: "Faixa Atual",
            artists: [{ name: "Artista" }],
            duration_ms: 120_000,
            album: { name: "Álbum", images: [] },
            external_urls: { spotify: "https://open.spotify.com/track/track-id" },
          },
        }), { status: 200 });
        return new Response(null, { status: 403 });
      }
      if (String(input).startsWith("https://api.spotify.com/v1/me/top/")) {
        return new Response(null, { status: 429, headers: { "Retry-After": "30" } });
      }
      throw new Error(`URL não mockada: ${String(input)}`);
    });

    const renovado = await request(app).get(`/api/musica/usuario/${intruso.id}/agora`);
    expect(renovado.body).toMatchObject({
      conectado: true,
      tocando: true,
      item: { nome: "Faixa Atual", progresso_ms: 12_000 },
    });
    expect(tokenRequests).toBe(2);
    expect(playbackRequests).toBe(2);
    expect(JSON.stringify(renovado.body)).not.toContain("access-");

    limparCacheMusica();
    const bloqueado = await request(app).get(`/api/musica/usuario/${intruso.id}/agora`);
    expect(bloqueado.status).toBe(200);
    expect(bloqueado.body).toEqual({ conectado: false, estado: "nao_autorizado" });

    const limitado = await request(app)
      .get(`/api/musica/usuario/${intruso.id}/top?tipo=faixas`);
    expect(limitado.status).toBe(429);
    expect(limitado.headers["retry-after"]).toBe("30");
    expect(limitado.body.estado).toBe("limite_atingido");
  });

  it("remove a conexão Spotify quando o refresh retorna invalid_grant", async () => {
    await prisma.conexaoMusica.create({
      data: {
        id_usuario: membro.id,
        provedor: "spotify",
        id_externo: "spotify-revoked-user",
        nome_exibicao: "Conta revogada",
        refresh_token_cifrado: cifrarToken("refresh-revogado"),
      },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant" }), {
      status: 400,
    }));
    const response = await request(app).get(`/api/musica/usuario/${membro.id}/agora`);
    const conexao = await prisma.conexaoMusica.findUnique({ where: { id_usuario: membro.id } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conectado: false, estado: "desconectado" });
    expect(conexao).toBeNull();
  });
});
