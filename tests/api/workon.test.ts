import crypto from "node:crypto";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.WORKON_AUDIO_MAX_MB = "0.0001";

vi.mock("../../src/services/EmailService.js", () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}));

const { default: app } = await import("../../src/app.js");
const pastaAudio = path.join(process.cwd(), "storage", "workon", "audio");
const arquivoAudioValido = path.join(process.cwd(), "tests", "fixtures", "sample.mp3");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

type Conta = { id: number; token: string };
let dono: Conta;
let editor: Conta;
let ouvinte: Conta;
let naoMembro: Conta;
let idWorkOn = 0;
let idFaixa = 0;
let idClube = 0;
const arquivosAudioCriados: string[] = [];

const auth = (conta: Conta) => ({ Authorization: `Bearer ${conta.token}` });

async function cadastrar(nome: string): Promise<Conta> {
  const response = await request(app)
    .post("/api/usuarios")
    .send({
      nome_completo: `Work On ${nome}`,
      email: `workon-${nome}-${Date.now()}-${Math.random()}@example.com`,
      senha: "123456",
    });
  expect(response.status).toBe(201);
  return { id: response.body.usuario.id_usuario, token: response.body.token };
}

async function arquivosAtuais() {
  return new Set(await fs.readdir(pastaAudio));
}

async function anexarVersao(
  conta: Conta,
  arquivo: Buffer | string,
  nome: string,
  contentType: string,
) {
  const upload = request(app)
    .post(`/api/workons/${idWorkOn}/faixas/${idFaixa}/versoes`)
    .set(auth(conta));
  return typeof arquivo === "string"
    ? upload.attach("audio", arquivo)
    : upload.attach("audio", arquivo, { filename: nome, contentType });
}

beforeAll(async () => {
  await fs.mkdir(pastaAudio, { recursive: true });
  [dono, editor, ouvinte, naoMembro] = await Promise.all([
    cadastrar("dono"),
    cadastrar("editor"),
    cadastrar("ouvinte"),
    cadastrar("nao-membro"),
  ]);

  const projeto = await request(app)
    .post("/api/workons")
    .set(auth(dono))
    .send({ titulo: "Projeto de teste Work On", tipo: "album" });
  expect(projeto.status).toBe(201);
  idWorkOn = projeto.body.id_workon;

  for (const [conta, papel] of [[editor, "editor"], [ouvinte, "ouvinte"]] as const) {
    const membro = await request(app)
      .post(`/api/workons/${idWorkOn}/membros`)
      .set(auth(dono))
      .send({ id_usuario: conta.id, papel });
    expect(membro.status).toBe(201);
  }

  const faixa = await request(app)
    .post(`/api/workons/${idWorkOn}/faixas`)
    .set(auth(dono))
    .send({ titulo: "Faixa de teste" });
  expect(faixa.status).toBe(201);
  idFaixa = faixa.body.id_faixa;

  const clube = await request(app)
    .post("/api/clubes")
    .set(auth(dono))
    .send({ nome: `Clube Work On ${Date.now()}`, tipo: "geral" });
  expect(clube.status).toBe(201);
  idClube = clube.body.id_clube;

  const entrar = await request(app)
    .post(`/api/clubes/${idClube}/entrar`)
    .set(auth(ouvinte));
  expect(entrar.status).toBe(200);
});

afterAll(async () => {
  if (idWorkOn) {
    await request(app).delete(`/api/workons/${idWorkOn}`).set(auth(dono));
  }
  if (idClube) {
    await request(app).delete(`/api/clubes/${idClube}`).set(auth(dono));
  }
  for (const conta of [dono, editor, ouvinte, naoMembro]) {
    if (conta?.id) {
      await request(app).delete(`/api/usuarios/${conta.id}`).set(auth(conta));
    }
  }
  await Promise.all(
    arquivosAudioCriados.map((arquivo) =>
      fs.unlink(path.join(pastaAudio, arquivo)).catch(() => undefined),
    ),
  );
});

describe("API Work On", () => {
  it("compartilha no chat do clube sem criar prévia", async () => {
    const antes = await request(app).get(`/api/postagens/usuario/${dono.id}`);
    const response = await request(app)
      .post(`/api/workons/${idWorkOn}/compartilhar-em-clube`)
      .set(auth(dono))
      .send({ id_clube: idClube });
    const depois = await request(app).get(`/api/postagens/usuario/${dono.id}`);
    const mensagens = await request(app)
      .get(`/api/clubes/${idClube}/mensagens`)
      .set(auth(ouvinte));

    expect(response.status).toBe(201);
    expect(response.body.texto).toContain(`/api/workons/${idWorkOn}`);
    expect(mensagens.status).toBe(200);
    expect(mensagens.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          texto: expect.stringContaining(`/api/workons/${idWorkOn}`),
        }),
      ]),
    );
    expect(depois.body).toHaveLength(antes.body.length);
  });

  it("recusa compartilhar por ouvinte e por editor que não participa do clube", async () => {
    const ouvinteNaoAutorizado = await request(app)
      .post(`/api/workons/${idWorkOn}/compartilhar-em-clube`)
      .set(auth(ouvinte))
      .send({ id_clube: idClube });
    const editorForaDoClube = await request(app)
      .post(`/api/workons/${idWorkOn}/compartilhar-em-clube`)
      .set(auth(editor))
      .send({ id_clube: idClube });

    expect(ouvinteNaoAutorizado.status).toBe(403);
    expect(editorForaDoClube.status).toBe(403);
  });

  it("aplica os limites de edição de dono, editor e ouvinte", async () => {
    const donoEdita = await request(app)
      .patch(`/api/workons/${idWorkOn}`)
      .set(auth(dono))
      .send({ titulo: "Projeto editado pelo dono" });
    const editorEdita = await request(app)
      .patch(`/api/workons/${idWorkOn}`)
      .set(auth(editor))
      .send({ titulo: "Projeto editado pelo editor" });
    expect(donoEdita.status).toBe(200);
    expect(editorEdita.status).toBe(200);

    const ouvinteEdita = await request(app)
      .patch(`/api/workons/${idWorkOn}`)
      .set(auth(ouvinte))
      .send({ titulo: "Edição não permitida" });
    const ouvinteVersao = await anexarVersao(
      ouvinte,
      await fs.readFile(arquivoAudioValido),
      "listener.mp3",
      "audio/mpeg",
    );
    const ouvinteTarefa = await request(app)
      .post(`/api/workons/${idWorkOn}/tarefas`)
      .set(auth(ouvinte))
      .send({ texto: "Tarefa proibida" });
    const ouvinteFoto = await request(app)
      .post(`/api/workons/${idWorkOn}/fotos`)
      .set(auth(ouvinte))
      .attach("image", PNG, { filename: "foto.png", contentType: "image/png" });

    expect(ouvinteEdita.status).toBe(403);
    expect(ouvinteVersao.status).toBe(403);
    expect(ouvinteTarefa.status).toBe(403);
    expect(ouvinteFoto.status).toBe(403);
  });

  it("impede editor de mudar visibilidade, gerenciar membros, convidar ou excluir", async () => {
    const visibilidade = await request(app)
      .patch(`/api/workons/${idWorkOn}`)
      .set(auth(editor))
      .send({ visibilidade: "link" });
    const convite = await request(app)
      .post(`/api/workons/${idWorkOn}/convite`)
      .set(auth(editor))
      .send({});
    const membros = await request(app)
      .post(`/api/workons/${idWorkOn}/membros`)
      .set(auth(editor))
      .send({ id_usuario: naoMembro.id, papel: "ouvinte" });
    const exclusao = await request(app)
      .delete(`/api/workons/${idWorkOn}`)
      .set(auth(editor));

    expect(visibilidade.status).toBe(403);
    expect(convite.status).toBe(403);
    expect(membros.status).toBe(403);
    expect(exclusao.status).toBe(403);
  });

  it("oculta projeto por link de quem não é membro", async () => {
    const privado = await request(app)
      .patch(`/api/workons/${idWorkOn}`)
      .set(auth(dono))
      .send({ visibilidade: "link" });
    const leitura = await request(app)
      .get(`/api/workons/${idWorkOn}`)
      .set(auth(naoMembro));

    expect(privado.status).toBe(200);
    expect(leitura.status).toBe(404);
  });

  it("rejeita MIME não permitido, bytes falsos e áudio acima do limite sem deixar arquivos", async () => {
    const antesMime = await arquivosAtuais();
    const mime = await anexarVersao(
      dono,
      Buffer.from("not audio"),
      "arquivo.txt",
      "text/plain",
    );
    expect(mime.status).toBe(400);
    expect([...(await arquivosAtuais())].filter((arquivo) => !antesMime.has(arquivo))).toHaveLength(0);

    const antesFalso = await arquivosAtuais();
    const falso = await anexarVersao(
      dono,
      Buffer.from("bytes falsos com mime de audio"),
      "falso.mp3",
      "audio/mpeg",
    );
    expect(falso.status).toBe(400);
    expect([...(await arquivosAtuais())].filter((arquivo) => !antesFalso.has(arquivo))).toHaveLength(0);

    const antesGrande = await arquivosAtuais();
    const grande = await anexarVersao(
      dono,
      Buffer.alloc(256, 0),
      "grande.mp3",
      "audio/mpeg",
    );
    expect(grande.status).toBe(400);
    expect([...(await arquivosAtuais())].filter((arquivo) => !antesGrande.has(arquivo))).toHaveLength(0);
  });

  it("serve áudio somente por URL assinada e recusa links alterados ou expirados", async () => {
    const criado = await anexarVersao(dono, arquivoAudioValido, "sample.mp3", "audio/mpeg");
    expect(criado.status).toBe(201);
    const arquivo = criado.body.arquivo as string;
    arquivosAudioCriados.push(arquivo);
    const detalhe = await request(app)
      .get(`/api/workons/${idWorkOn}`)
      .set(auth(dono));
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.faixas[0].versoes[0]).toMatchObject({
      id_versao: criado.body.id_versao,
      numero: 1,
    });
    expect(detalhe.body.faixas[0].versoes[0]).not.toHaveProperty("arquivo");

    const url = await request(app)
      .get(`/api/workons/${idWorkOn}/versoes/${criado.body.id_versao}/url`)
      .set(auth(dono));
    expect(url.status).toBe(200);
    const assinada = new URL(url.body.url, "http://localhost");
    const acessoDireto = await request(app).get(`/storage/workon/audio/${arquivo}`);
    const acessoAssinado = await request(app).get(`${assinada.pathname}${assinada.search}`);
    expect(acessoDireto.status).toBe(404);
    expect(acessoAssinado.status).toBe(200);

    const segmentos = assinada.pathname.split("/");
    const tokenIndex = segmentos.length - 1;
    segmentos[tokenIndex] = `${segmentos[tokenIndex][0] === "a" ? "b" : "a"}${segmentos[tokenIndex].slice(1)}`;
    const alterada = await request(app).get(`${segmentos.join("/")}${assinada.search}`);
    expect(alterada.status).toBe(403);

    const secret = process.env.WORKON_FILE_SECRET || process.env.JWT_SECRET;
    expect(secret).toBeTruthy();
    const exp = 1;
    const tokenExpirado = crypto
      .createHmac("sha256", secret!)
      .update(JSON.stringify({ nome: arquivo, exp }))
      .digest("hex");
    const expirada = await request(app)
      .get(`/api/workons/arquivos/${tokenExpirado}`)
      .query({ nome: arquivo, exp });
    expect(expirada.status).toBe(403);
  });
});
