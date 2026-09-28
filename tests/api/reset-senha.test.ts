import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/EmailService.js", () => ({
  default: {
    enviarBoasVindas: vi.fn().mockResolvedValue(undefined),
    enviarCodigoRedefinicaoSenha: vi.fn().mockResolvedValue(undefined),
  },
}));

const { default: app } = await import("../../src/app.js");
const { default: prisma } = await import("../../src/database/prisma.js");
const { default: EmailService } =
  await import("../../src/services/EmailService.js");

let usuarioId = 0;
let usuarioEmail = "";
let codigoRecebido = "";
const senhaOriginal = "123456";

beforeAll(async () => {
  const res = await request(app)
    .post("/api/usuarios")
    .send({
      nome_completo: "Usuario Reset Senha",
      email: `reset-${Date.now()}@example.com`,
      senha: senhaOriginal,
    });
  usuarioId = res.body.usuario.id_usuario;
  usuarioEmail = res.body.usuario.email;
});

afterAll(async () => {
  if (!usuarioId) return;
  // Login com a senha final pra conseguir apagar o usuário de teste.
  const login = await request(app)
    .post("/api/usuarios/login")
    .send({ email: usuarioEmail, senha: "nova-senha-123" });
  const token = login.body?.token;
  if (token)
    await request(app)
      .delete(`/api/usuarios/${usuarioId}`)
      .set("Authorization", `Bearer ${token}`);
});

describe("POST /api/usuarios/esqueci-senha", () => {
  it("rejeita corpo sem e-mail valido", async () => {
    const res = await request(app)
      .post("/api/usuarios/esqueci-senha")
      .send({ email: "nao-e-email" });
    expect(res.status).toBe(400);
  });

  it("responde 200 com mensagem generica para um e-mail cadastrado", async () => {
    vi.mocked(EmailService.enviarCodigoRedefinicaoSenha).mockClear();
    const res = await request(app)
      .post("/api/usuarios/esqueci-senha")
      .send({ email: usuarioEmail });
    expect(res.status).toBe(200);
    expect(res.body.mensagem).toMatch(/código/i);
    codigoRecebido = vi.mocked(EmailService.enviarCodigoRedefinicaoSenha).mock
      .calls[0]?.[2];
    expect(codigoRecebido).toMatch(/^\d{6}$/);
  });

  it("responde a mesma mensagem generica para um e-mail que nao existe (nao revela quem esta cadastrado)", async () => {
    const res = await request(app)
      .post("/api/usuarios/esqueci-senha")
      .send({ email: `inexistente-${Date.now()}@example.com` });
    expect(res.status).toBe(200);
    expect(res.body.mensagem).toMatch(/código/i);
  });
});

describe("POST /api/usuarios/redefinir-senha", () => {
  it("rejeita codigo com formato invalido (400)", async () => {
    const res = await request(app).post("/api/usuarios/redefinir-senha").send({
      email: usuarioEmail,
      codigo: "abc",
      nova_senha: "nova-senha-123",
      confirmar_senha: "nova-senha-123",
    });
    expect(res.status).toBe(400);
  });

  it("rejeita confirmacao de senha que nao bate (400)", async () => {
    const res = await request(app).post("/api/usuarios/redefinir-senha").send({
      email: usuarioEmail,
      codigo: "123456",
      nova_senha: "nova-senha-123",
      confirmar_senha: "outra-coisa",
    });
    expect(res.status).toBe(400);
  });

  it("rejeita um codigo que nao é o gerado (400)", async () => {
    const codigoInvalido = codigoRecebido === "000000" ? "000001" : "000000";
    const res = await request(app).post("/api/usuarios/redefinir-senha").send({
      email: usuarioEmail,
      codigo: codigoInvalido,
      nova_senha: "nova-senha-123",
      confirmar_senha: "nova-senha-123",
    });
    expect(res.status).toBe(400);
  });

  it("redefine a senha com o codigo correto e o invalida depois de usado", async () => {
    const usuario = await prisma.usuario.findUnique({
      where: { email: usuarioEmail },
    });
    const codigo = codigoRecebido;
    expect(usuario?.codigo_reset_senha).toMatch(/^[a-f0-9]{64}$/);
    expect(usuario?.codigo_reset_senha).not.toBe(codigo);
    expect(codigo).toMatch(/^\d{6}$/);

    const res = await request(app).post("/api/usuarios/redefinir-senha").send({
      email: usuarioEmail,
      codigo,
      nova_senha: "nova-senha-123",
      confirmar_senha: "nova-senha-123",
    });
    expect(res.status).toBe(200);

    const login = await request(app)
      .post("/api/usuarios/login")
      .send({ email: usuarioEmail, senha: "nova-senha-123" });
    expect(login.status).toBe(200);

    // O mesmo código não pode ser reaproveitado.
    const segundaTentativa = await request(app)
      .post("/api/usuarios/redefinir-senha")
      .send({
        email: usuarioEmail,
        codigo,
        nova_senha: "outra-senha-456",
        confirmar_senha: "outra-senha-456",
      });
    expect(segundaTentativa.status).toBe(400);
  });
});
