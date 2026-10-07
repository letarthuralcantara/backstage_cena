import request from "supertest";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/EmailService.js", () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}));

const { default: app } = await import("../../src/app.js");
const pastaTweets = path.join(process.cwd(), "public", "uploads", "tweets");
const pastaAvatares = path.join(process.cwd(), "public", "uploads", "avatars");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let usuarioId = 0;
let token = "";
const tweetsCriados: number[] = [];
const imagensCriadas: string[] = [];
let avatarCriado: string | null = null;

beforeAll(async () => {
  const res = await request(app).post("/api/usuarios").send({
    nome_completo: "Tweet com imagem",
    email: `tweet-imagem-${Date.now()}@example.com`,
    senha: "123456",
  });
  usuarioId = res.body.usuario.id_usuario;
  token = res.body.token;
});

afterAll(async () => {
  for (const id of tweetsCriados) {
    await request(app)
      .delete(`/api/tweets/${id}`)
      .set("Authorization", `Bearer ${token}`);
  }
  for (const imagem of imagensCriadas) {
    await unlink(path.join(pastaTweets, path.basename(imagem))).catch(
      () => undefined,
    );
  }
  if (avatarCriado) {
    await unlink(path.join(pastaAvatares, path.basename(avatarCriado))).catch(
      () => undefined,
    );
  }
  if (usuarioId && token) {
    await request(app)
      .delete(`/api/usuarios/${usuarioId}`)
      .set("Authorization", `Bearer ${token}`);
  }
});

describe("imagem opcional em tweets", () => {
  it("exige autenticação antes de receber a imagem", async () => {
    const res = await request(app)
      .post("/api/tweets")
      .field("texto", "Sem token")
      .attach("image", PNG, { filename: "teste.png", contentType: "image/png" });
    expect(res.status).toBe(401);
  });

  it("cria tweet com PNG validado e serve a imagem", async () => {
    const avatar = await request(app)
      .post("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", PNG, { filename: "avatar.png", contentType: "image/png" });
    expect(avatar.status).toBe(201);
    avatarCriado = avatar.body.imagem.caminho;

    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .field("texto", "Tweet com PNG")
      .attach("image", PNG, { filename: "original.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(res.body.imagem).toMatch(
      /^\/uploads\/tweets\/[0-9a-f]{32}\.png$/,
    );
    expect(res.body.autor.imagem).toBe(avatarCriado);
    tweetsCriados.push(res.body.id_tweet);
    imagensCriadas.push(res.body.imagem);

    const servido = await request(app).get(res.body.imagem);
    expect(servido.status).toBe(200);
    expect(servido.headers["content-type"]).toContain("image/png");
  });

  it("mantém compatibilidade com tweet JSON sem imagem", async () => {
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .send({ texto: "Tweet JSON" });

    expect(res.status).toBe(201);
    expect(res.body.imagem).toBeNull();
    tweetsCriados.push(res.body.id_tweet);
  });

  it("aceita tweet multipart sem imagem", async () => {
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .field("texto", "Tweet multipart")
      .field("expirar", "false");

    expect(res.status).toBe(201);
    expect(res.body.imagem).toBeNull();
    expect(res.body.expira_em).toBeNull();
    tweetsCriados.push(res.body.id_tweet);
  });

  it("aceita expiração booleana enviada como string multipart", async () => {
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .field("texto", "Tweet temporário")
      .field("expirar", "true");

    expect(res.status).toBe(201);
    expect(res.body.expira_em).not.toBeNull();
    tweetsCriados.push(res.body.id_tweet);
  });

  it("rejeita imagem acima de 2 MB", async () => {
    const antes = await readdir(pastaTweets);
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .field("texto", "Arquivo grande")
      .attach("image", Buffer.alloc(2 * 1024 * 1024 + 1, 1), {
        filename: "grande.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["body", "image"] }),
      ]),
    );
    expect(await readdir(pastaTweets)).toEqual(antes);
  });

  it("rejeita tipo não permitido antes de gravar", async () => {
    const antes = await readdir(pastaTweets);
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .field("texto", "Arquivo inválido")
      .attach("image", Buffer.from("texto"), {
        filename: "nota.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["body", "image"] }),
      ]),
    );
    expect(await readdir(pastaTweets)).toEqual(antes);
  });

  it("rejeita bytes falsos com MIME de imagem e apaga o arquivo", async () => {
    const antes = await readdir(pastaTweets);
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .field("texto", "PNG falso")
      .attach("image", Buffer.from("isto nao e um png"), {
        filename: "falso.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(await readdir(pastaTweets)).toEqual(antes);
  });

  it("exige texto e apaga imagem enviada sem texto", async () => {
    const antes = await readdir(pastaTweets);
    const res = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", PNG, { filename: "sem-texto.png", contentType: "image/png" });

    expect(res.status).toBe(400);
    expect(await readdir(pastaTweets)).toEqual(antes);
  });

  it("inclui imagem no feed e na lista do usuário", async () => {
    const comImagem = await request(app)
      .get("/api/tweets/feed")
      .then((res) =>
        res.body.find(
          (tweet: { imagem: string; texto: string }) =>
            tweet.texto === "Tweet com PNG",
        ),
      );
    const listaUsuario = await request(app).get(
      `/api/tweets/usuario/${usuarioId}`,
    );
    const daLista = listaUsuario.body.find(
      (tweet: { texto: string }) => tweet.texto === "Tweet com PNG",
    );

    expect(comImagem?.imagem).toBe(imagensCriadas[0]);
    expect(daLista?.imagem).toBe(imagensCriadas[0]);
  });

  it("remove a imagem do disco ao excluir o tweet", async () => {
    const imagem = imagensCriadas[0];
    const tweetId = tweetsCriados[0];
    const removido = await request(app)
      .delete(`/api/tweets/${tweetId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(removido.status).toBe(204);
    expect(await readdir(pastaTweets)).not.toContain(path.basename(imagem));
    tweetsCriados.splice(0, 1);
    imagensCriadas.splice(0, 1);
  });
});
