import { describe, expect, it } from "vitest";
import {
  alterarSenhaSchema,
  cadastroSchema,
  buscarSchema,
  redefinirSenhaSchema,
} from "../../src/schema/usuario.schema.js";

describe("schemas de entrada", () => {
  it("aceita cadastro valido", () => {
    expect(
      cadastroSchema.safeParse({
        body: {
          nome_completo: "Ana Silva",
          email: "ana@example.com",
          senha: "123456",
        },
      }).success,
    ).toBe(true);
  });

  it("rejeita e-mail e senha invalidos com issues", () => {
    const result = cadastroSchema.safeParse({
      body: { nome_completo: "A", email: "invalido", senha: "1" },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
  });

  it("aceita somente ids positivos", () => {
    expect(buscarSchema.safeParse({ params: { id: "2" } }).success).toBe(true);
    expect(buscarSchema.safeParse({ params: { id: "0" } }).success).toBe(false);
  });

  it("rejeita campos extras em alteração e redefinição de senha", () => {
    const dadosAlteracao = {
      params: { id: "2" },
      body: {
        senha_atual: "123456",
        nova_senha: "abcdef",
        confirmar_senha: "abcdef",
        administrador: true,
      },
    };
    const dadosReset = {
      body: {
        email: "ana@example.com",
        codigo: "123456",
        nova_senha: "abcdef",
        confirmar_senha: "abcdef",
        administrador: true,
      },
    };

    expect(alterarSenhaSchema.safeParse(dadosAlteracao).success).toBe(false);
    expect(redefinirSenhaSchema.safeParse(dadosReset).success).toBe(false);
  });

  it("rejeita valores duplicados em catálogos sem diferenciar caixa ou espaços", () => {
    const result = cadastroSchema.safeParse({
      body: {
        nome_completo: "Ana Silva",
        email: "ana@example.com",
        senha: "123456",
        instrumentos: ["Guitarra", " guitarra "],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Instrumentos.*duplicados/i);
    }
  });
});
