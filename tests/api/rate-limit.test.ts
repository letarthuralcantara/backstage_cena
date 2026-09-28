import request from "supertest";
import { describe, expect, it } from "vitest";

const { default: app } = await import("../../src/app.js");

describe("limite de requisições de autenticação", () => {
  it("limita pedidos de redefinição e retorna erro padronizado", async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app)
          .post("/api/usuarios/esqueci-senha")
          .send({ email: "email-invalido" }),
      ),
    );

    expect(responses.slice(0, 5).every((response) => response.status === 400)).toBe(
      true,
    );
    expect(responses[5].status).toBe(429);
    expect(responses[5].body.erro).toMatch(/muitas solicitações/i);
  });
});