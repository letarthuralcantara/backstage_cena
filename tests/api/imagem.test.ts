import request from "supertest";
import { readdir, unlink, access } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/EmailService.js", () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}));

const { default: app } = await import("../../src/app.js");

const pastaAvatares = path.join(process.cwd(), "public", "uploads", "avatars");

// PNG mínimo válido (1x1 pixel).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let aId = 0;
let aToken = "";
let bId = 0;
let bToken = "";
const criados: string[] = [];

async function cadastrar(prefixo: string, dados: object = {}) {
  const r = await request(app)
    .post("/api/usuarios")
    .send({
      nome_completo: `Avatar ${prefixo}`,
      email: `${prefixo}-${Date.now()}@example.com`,
      senha: "123456",
      ...dados,
    });
  return { id: r.body.usuario.id_usuario as number, token: r.body.token as string };
}

const arquivoNoDisco = (caminho: string) =>
  path.join(pastaAvatares, path.basename(caminho));

beforeAll(async () => {
  ({ id: aId, token: aToken } = await cadastrar("avatar-a", {
    estado: "SP",
    biografia: "Perfil com foto visível na busca.",
    instrumentos: ["Guitarra"],
    generos: ["Rock"],
    area_atuacao: ["Produtor"],
  }));
  ({ id: bId, token: bToken } = await cadastrar("avatar-b"));
});

afterAll(async () => {
  for (const [id, token] of [[aId, aToken], [bId, bToken]] as const)
    if (id && token)
      await request(app)
        .delete(`/api/usuarios/${id}`)
        .set("Authorization", `Bearer ${token}`);
  for (const caminho of criados)
    await unlink(arquivoNoDisco(caminho)).catch(() => undefined);
});

describe("avatar do perfil (upload de imagem)", () => {
  it("CA12.1 - exige autenticação", async () => {
    const res = await request(app)
      .post("/api/usuarios/imagem")
      .attach("image", PNG, { filename: "avatar.png", contentType: "image/png" });
    expect(res.status).toBe(401);
  });

  it("CA12.2/CA12.3 - envio válido devolve 201 e a imagem é servida", async () => {
    const res = await request(app)
      .post("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${aToken}`)
      .attach("image", PNG, { filename: "avatar.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.imagem.caminho).toMatch(/^\/uploads\/avatars\/[0-9a-f]{32}\.png$/);
    criados.push(res.body.imagem.caminho);

    const estatico = await request(app).get(res.body.imagem.caminho);
    expect(estatico.status).toBe(200);
    expect(estatico.headers["content-type"]).toContain("image/png");

    const lista = await request(app).get("/api/usuarios");
    const usuarioNaBusca = lista.body.find((u: any) => u.id_usuario === aId);
    expect(usuarioNaBusca.imagem.caminho).toBe(res.body.imagem.caminho);
  });

  it("CA12.4 - arquivo acima de 2 MB responde 400", async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 1)]);
    const res = await request(app)
      .put("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${aToken}`)
      .attach("image", grande, { filename: "grande.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["body", "image"] })]),
    );
  });

  it("CA12.5 - tipo fora da lista responde 400 e nada é gravado", async () => {
    const antes = await readdir(pastaAvatares);
    const res = await request(app)
      .post("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${bToken}`)
      .attach("image", Buffer.from("conteudo qualquer"), {
        filename: "nota.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
    expect(await readdir(pastaAvatares)).toEqual(antes);
  });

  it("rejeita arquivo cujo conteúdo não é imagem, mesmo com MIME de imagem", async () => {
    const antes = await readdir(pastaAvatares);
    const res = await request(app)
      .post("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${bToken}`)
      .attach("image", Buffer.from("isto nao e um png"), {
        filename: "falso.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(400);
    expect(await readdir(pastaAvatares)).toEqual(antes);
  });

  it("responde 400 quando nenhum arquivo é enviado", async () => {
    const res = await request(app)
      .post("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${bToken}`)
      .field("qualquer", "coisa");
    expect(res.status).toBe(400);
  });

  it("CA12.6 - dois usuários com avatar.png ficam com arquivos diferentes", async () => {
    const r = await request(app)
      .post("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${bToken}`)
      .attach("image", PNG, { filename: "avatar.png", contentType: "image/png" });
    expect(r.status).toBe(201);
    criados.push(r.body.imagem.caminho);

    const a = await request(app).get(`/api/usuarios/${aId}`);
    expect(a.body.imagem.caminho).not.toBe(r.body.imagem.caminho);
    await expect(access(arquivoNoDisco(a.body.imagem.caminho))).resolves.toBeUndefined();
    await expect(access(arquivoNoDisco(r.body.imagem.caminho))).resolves.toBeUndefined();
  });

  it("CA12.7 - novo envio atualiza o caminho e mantém um único avatar", async () => {
    const antes = await request(app).get(`/api/usuarios/${aId}`);
    const caminhoAntigo = antes.body.imagem.caminho;

    const res = await request(app)
      .put("/api/usuarios/imagem")
      .set("Authorization", `Bearer ${aToken}`)
      .attach("image", PNG, { filename: "avatar.png", contentType: "image/png" });
    expect(res.status).toBe(200);
    criados.push(res.body.imagem.caminho);
    expect(res.body.imagem.caminho).not.toBe(caminhoAntigo);

    const depois = await request(app).get(`/api/usuarios/${aId}`);
    expect(depois.body.imagem.caminho).toBe(res.body.imagem.caminho);
    expect(depois.body.imagem.id_imagem).toBe(antes.body.imagem.id_imagem);
    await expect(access(arquivoNoDisco(caminhoAntigo))).rejects.toThrow();
  });
});
