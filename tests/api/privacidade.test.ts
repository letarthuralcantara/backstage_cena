import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/EmailService.js", () => ({
  default: {
    enviarBoasVindas: vi.fn().mockResolvedValue(undefined),
    enviarCodigoRedefinicaoSenha: vi.fn().mockResolvedValue(undefined),
  },
}));

const { default: app } = await import("../../src/app.js");

const sufixo = Date.now();
const emailA = "privacidade-a-" + sufixo + "@example.com";
const emailB = "privacidade-b-" + sufixo + "@example.com";
const contas: { id: number; token: string }[] = [];

async function cadastrar(nome: string, email: string) {
  const res = await request(app)
    .post("/api/usuarios")
    .send({ nome_completo: nome, email, senha: "123456" });
  const conta = { id: res.body.usuario.id_usuario as number, token: res.body.token as string };
  contas.push(conta);
  return conta;
}

let dono = { id: 0, token: "" };
let outro = { id: 0, token: "" };

beforeAll(async () => {
  dono = await cadastrar("Privacidade Dono", emailA);
  outro = await cadastrar("Privacidade Outro", emailB);
});

afterAll(async () => {
  for (const conta of contas) {
    await request(app)
      .delete("/api/usuarios/" + conta.id)
      .set("Authorization", "Bearer " + conta.token);
  }
});

describe("privacidade do perfil público", () => {
  it("mostra o e-mail por padrão, porque a opção vem ligada", async () => {
    const res = await request(app).get("/api/usuarios/" + dono.id);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(emailA);
  });

  it("não devolve senha nem código de redefinição", async () => {
    const res = await request(app).get("/api/usuarios/" + dono.id);
    expect(res.body).not.toHaveProperty("senha");
    expect(res.body).not.toHaveProperty("codigo_reset_senha");
  });

  it("esconde o e-mail de anônimos e de outros usuários quando a opção é desligada", async () => {
    const desligar = await request(app)
      .put("/api/usuarios/" + dono.id + "/configuracoes")
      .set("Authorization", "Bearer " + dono.token)
      .send({ mostrar_email: 0 });
    expect(desligar.status).toBe(200);

    const anonimo = await request(app).get("/api/usuarios/" + dono.id);
    expect(anonimo.body.email ?? null).toBeNull();

    const logado = await request(app)
      .get("/api/usuarios/" + dono.id)
      .set("Authorization", "Bearer " + outro.token);
    expect(logado.body.email ?? null).toBeNull();
  });

  it("o dono continua vendo o próprio e-mail", async () => {
    const res = await request(app)
      .get("/api/usuarios/" + dono.id)
      .set("Authorization", "Bearer " + dono.token);
    expect(res.body.email).toBe(emailA);
  });

  it("não revela o telefone a outros, pois a opção vem desligada", async () => {
    const res = await request(app).get("/api/usuarios/" + dono.id);
    expect(res.body.telefone ?? null).toBeNull();
  });
});
