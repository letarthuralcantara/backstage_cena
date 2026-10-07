import request from "supertest";
import { access, unlink } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/EmailService.js", () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}));

const { default: app } = await import("../../src/app.js");

let donoId = 0;
let donoToken = "";
let membroId = 0;
let membroToken = "";
let clubeId = 0;
const imagensEnviadas: string[] = [];
const pastaImagensClubes = path.join(process.cwd(), "public", "uploads", "clubes");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const nomeClube = `Clube Teste ${Date.now()}`;

async function cadastrar(prefixo: string, extra: object = {}) {
  const r = await request(app)
    .post("/api/usuarios")
    .send({
      nome_completo: `Clubes ${prefixo}`,
      email: `${prefixo}-${Date.now()}@example.com`,
      senha: "123456",
      ...extra,
    });
  return { id: r.body.usuario.id_usuario as number, token: r.body.token as string };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  ({ id: donoId, token: donoToken } = await cadastrar("clube-dono", {
    generos: ["Rock"],
    instrumentos: ["Guitarra"],
    daws: ["FL Studio"],
  }));
  ({ id: membroId, token: membroToken } = await cadastrar("clube-membro"));
});

afterAll(async () => {
  if (clubeId)
    await request(app).delete(`/api/clubes/${clubeId}`).set(auth(donoToken));
  for (const [id, token] of [[donoId, donoToken], [membroId, membroToken]] as const)
    if (id && token)
      await request(app).delete(`/api/usuarios/${id}`).set(auth(token));
  for (const imagem of imagensEnviadas)
    await unlink(path.join(pastaImagensClubes, path.basename(imagem))).catch(
      () => undefined,
    );
});

describe("clubes", () => {
  it("exige autenticação", async () => {
    expect((await request(app).get("/api/clubes")).status).toBe(401);
    expect((await request(app).get("/api/clubes/recomendados")).status).toBe(401);
  });

  it("recomenda primeiro os clubes que combinam com o perfil, com o motivo", async () => {
    const res = await request(app)
      .get("/api/clubes/recomendados?limite=12")
      .set(auth(donoToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const [primeiro] = res.body;
    expect(primeiro.motivo).toMatch(/^Você (curte|toca|produz no) /);
    expect(["Rock", "Guitarra", "FL Studio"]).toContain(primeiro.tag);
    // Quem tem afinidade vem antes de quem não tem.
    const afinidades = res.body.map((c: any) => c.afinidade);
    expect(afinidades).toEqual([...afinidades].sort((a: number, b: number) => b - a));
  });

  it("preenche os clubes DAW existentes com os logos disponíveis", async () => {
    const res = await request(app).get("/api/clubes").set(auth(donoToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "FL Studio",
          imagem: "/images/clubes%20images/fl-studio_logo.png",
        }),
        expect.objectContaining({
          tag: "Ableton Live",
          imagem: "/images/clubes%20images/ableton_logo.jpg",
        }),
        expect.objectContaining({
          tag: "GarageBand",
          imagem: "/images/clubes%20images/Garageband_logo.png",
        }),
        expect.objectContaining({
          tag: "Cubase",
          imagem: "/images/clubes%20images/cubase_logo.svg",
        }),
        expect.objectContaining({
          tag: "Logic Pro",
          imagem: "/images/clubes%20images/logic_logo.webp",
        }),
        expect.objectContaining({
          tag: "Pro Tools",
          imagem: "/images/clubes%20images/protools_logo.svg",
        }),
        expect.objectContaining({
          tag: "Reaper",
          imagem: "/images/clubes%20images/reapper_logo.jpg",
        }),
        expect.objectContaining({
          tag: "Studio One",
          imagem: "/images/clubes%20images/studio-one_logo.webp",
        }),
      ]),
    );
    const logo = await request(app).get(
      "/images/clubes%20images/fl-studio_logo.png",
    );
    expect(logo.status).toBe(200);
    expect(logo.headers["content-type"]).toContain("image/png");
  });

  it("valida a criação (tipo sem tag, nome curto)", async () => {
    const semTag = await request(app)
      .post("/api/clubes")
      .set(auth(donoToken))
      .send({ nome: nomeClube, tipo: "daw" });
    expect(semTag.status).toBe(400);

    const curto = await request(app)
      .post("/api/clubes")
      .set(auth(donoToken))
      .send({ nome: "ab", tipo: "geral" });
    expect(curto.status).toBe(400);
  });

  it("cria clube (o criador vira dono e membro) e barra nome repetido", async () => {
    const res = await request(app)
      .post("/api/clubes")
      .set(auth(donoToken))
      .send({ nome: nomeClube, descricao: "Teste", tipo: "genero", tag: "Rock" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ participa: true, eh_dono: true, total_membros: 1 });
    clubeId = res.body.id_clube;

    const repetido = await request(app)
      .post("/api/clubes")
      .set(auth(donoToken))
      .send({ nome: nomeClube, tipo: "geral" });
    expect(repetido.status).toBe(409);
  });

  it("aceita foto válida só do dono e serve a imagem enviada", async () => {
    const semAuth = await request(app)
      .post(`/api/clubes/${clubeId}/imagem`)
      .attach("image", PNG, { filename: "clube.png", contentType: "image/png" });
    expect(semAuth.status).toBe(401);

    const intruso = await request(app)
      .post(`/api/clubes/${clubeId}/imagem`)
      .set(auth(membroToken))
      .attach("image", PNG, { filename: "clube.png", contentType: "image/png" });
    expect(intruso.status).toBe(403);

    const invalida = await request(app)
      .post(`/api/clubes/${clubeId}/imagem`)
      .set(auth(donoToken))
      .attach("image", Buffer.from("nao e png"), {
        filename: "falso.png",
        contentType: "image/png",
      });
    expect(invalida.status).toBe(400);

    const enviada = await request(app)
      .post(`/api/clubes/${clubeId}/imagem`)
      .set(auth(donoToken))
      .attach("image", PNG, { filename: "clube.png", contentType: "image/png" });
    expect(enviada.status).toBe(200);
    const caminho = enviada.body.clube.imagem as string;
    imagensEnviadas.push(caminho);
    expect(caminho).toMatch(/^\/uploads\/clubes\/[0-9a-f]{32}\.png$/);

    const estatica = await request(app).get(caminho);
    expect(estatica.status).toBe(200);
    expect(estatica.headers["content-type"]).toContain("image/png");

    const detalhe = await request(app)
      .get(`/api/clubes/${clubeId}`)
      .set(auth(donoToken));
    expect(detalhe.body.imagem).toBe(caminho);

    const substituida = await request(app)
      .put(`/api/clubes/${clubeId}/imagem`)
      .set(auth(donoToken))
      .attach("image", PNG, { filename: "outra.png", contentType: "image/png" });
    expect(substituida.status).toBe(200);
    const caminhoNovo = substituida.body.clube.imagem as string;
    imagensEnviadas.push(caminhoNovo);
    expect(caminhoNovo).not.toBe(caminho);
    await expect(
      access(path.join(pastaImagensClubes, path.basename(caminho))),
    ).rejects.toThrow();
  });

  it("clube em que já participa não aparece nos recomendados", async () => {
    const res = await request(app)
      .get("/api/clubes/recomendados?limite=30")
      .set(auth(donoToken));
    expect(res.body.some((c: any) => c.id_clube === clubeId)).toBe(false);
  });

  it("chat é restrito a membros", async () => {
    const semAuth = await request(app).get(
      `/api/clubes/${clubeId}/busca?q=clube`,
    );
    expect(semAuth.status).toBe(401);

    const ler = await request(app)
      .get(`/api/clubes/${clubeId}/mensagens`)
      .set(auth(membroToken));
    expect(ler.status).toBe(403);

    const escrever = await request(app)
      .post(`/api/clubes/${clubeId}/mensagens`)
      .set(auth(membroToken))
      .send({ texto: "oi" });
    expect(escrever.status).toBe(403);

    const buscar = await request(app)
      .get(`/api/clubes/${clubeId}/busca?q=clube`)
      .set(auth(membroToken));
    expect(buscar.status).toBe(403);
  });

  it("entrar no clube libera o chat e as mensagens chegam em ordem (polling)", async () => {
    const entrar = await request(app)
      .post(`/api/clubes/${clubeId}/entrar`)
      .set(auth(membroToken));
    expect(entrar.status).toBe(200);
    expect(entrar.body).toMatchObject({ participa: true, total_membros: 2 });

    const m1 = await request(app)
      .post(`/api/clubes/${clubeId}/mensagens`)
      .set(auth(donoToken))
      .send({ texto: "  Bem-vindos!  " });
    expect(m1.status).toBe(201);
    expect(m1.body.texto).toBe("Bem-vindos!");

    const lista = await request(app)
      .get(`/api/clubes/${clubeId}/mensagens`)
      .set(auth(membroToken));
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].minha).toBe(false);

    await request(app)
      .post(`/api/clubes/${clubeId}/mensagens`)
      .set(auth(membroToken))
      .send({ texto: "Valeu!" });

    const buscaMembro = await request(app)
      .get(`/api/clubes/${clubeId}/busca?q=clube-membro`)
      .set(auth(donoToken));
    expect(buscaMembro.status).toBe(200);
    expect(buscaMembro.body.membros).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id_usuario: membroId }),
      ]),
    );

    const buscaMensagem = await request(app)
      .get(`/api/clubes/${clubeId}/busca?q=Valeu`)
      .set(auth(donoToken));
    expect(buscaMensagem.status).toBe(200);
    expect(buscaMensagem.body.mensagens).toEqual([
      expect.objectContaining({ texto: "Valeu!" }),
    ]);

    const novas = await request(app)
      .get(`/api/clubes/${clubeId}/mensagens?depois=${m1.body.id_mensagem}`)
      .set(auth(donoToken));
    expect(novas.body.map((m: any) => m.texto)).toEqual(["Valeu!"]);
  });

  it("rejeita mensagem vazia ou acima de 500 caracteres", async () => {
    for (const texto of ["   ", "x".repeat(501)]) {
      const res = await request(app)
        .post(`/api/clubes/${clubeId}/mensagens`)
        .set(auth(donoToken))
        .send({ texto });
      expect(res.status).toBe(400);
    }
  });

  it("rejeita consulta vazia ou parâmetros desconhecidos na busca do clube", async () => {
    const vazia = await request(app)
      .get(`/api/clubes/${clubeId}/busca?q=%20%20`)
      .set(auth(donoToken));
    expect(vazia.status).toBe(400);

    const desconhecido = await request(app)
      .get(`/api/clubes/${clubeId}/busca?q=oi&outro=valor`)
      .set(auth(donoToken));
    expect(desconhecido.status).toBe(400);
  });

  it("o clube aparece no perfil público de quem participa", async () => {
    const res = await request(app).get(`/api/clubes/usuario/${membroId}`);
    expect(res.status).toBe(200);
    expect(res.body.map((c: any) => c.id_clube)).toContain(clubeId);
    expect(res.body[0]).not.toHaveProperty("total_membros");
  });

  it("lista e filtra por nome e tipo", async () => {
    const res = await request(app)
      .get(`/api/clubes?q=${encodeURIComponent(nomeClube)}&tipo=genero`)
      .set(auth(membroToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].participa).toBe(true);
  });

  it("dono não sai do clube; membro sai e perde o acesso ao chat", async () => {
    const dono = await request(app)
      .delete(`/api/clubes/${clubeId}/sair`)
      .set(auth(donoToken));
    expect(dono.status).toBe(400);

    const membro = await request(app)
      .delete(`/api/clubes/${clubeId}/sair`)
      .set(auth(membroToken));
    expect(membro.status).toBe(204);

    const chat = await request(app)
      .get(`/api/clubes/${clubeId}/mensagens`)
      .set(auth(membroToken));
    expect(chat.status).toBe(403);
  });

  it("só o dono exclui o clube", async () => {
    const intruso = await request(app)
      .delete(`/api/clubes/${clubeId}`)
      .set(auth(membroToken));
    expect(intruso.status).toBe(403);

    const dono = await request(app)
      .delete(`/api/clubes/${clubeId}`)
      .set(auth(donoToken));
    expect(dono.status).toBe(204);
    await expect(
      access(
        path.join(
          pastaImagensClubes,
          path.basename(imagensEnviadas[imagensEnviadas.length - 1]),
        ),
      ),
    ).rejects.toThrow();
    clubeId = 0;
  });

  it("clube inexistente responde 404", async () => {
    const res = await request(app).get("/api/clubes/99999999").set(auth(donoToken));
    expect(res.status).toBe(404);
  });
});
