/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  aplicarErroApiNoCampo,
  aplicarAvatarNaNavbar,
  authHeaders,
  fazerLogin,
  salvarCadastro,
  enviarFotoPerfil,
} from "../../public/js/auth.js";

describe("cliente da API", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("envia Bearer e Content-Type nos requests JSON", () => {
    localStorage.setItem("token", "abc123");
    expect(authHeaders()).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer abc123",
    });
  });

  it("exibe na navbar a foto salva no usuário autenticado", async () => {
    const trigger = document.createElement("div");
    await aplicarAvatarNaNavbar(trigger, {
      id_usuario: 2,
      nome_completo: "Ana",
      imagem: { caminho: "/uploads/avatars/ana.png" },
    });

    expect(trigger.querySelector("img").getAttribute("src")).toBe(
      "/uploads/avatars/ana.png",
    );
    expect(trigger.querySelector("img").alt).toBe("Ana");
  });

  it("busca e salva na sessão um avatar ausente no estado local", async () => {
    const usuario = { id_usuario: 3, nome_completo: "Bia", imagem: null };
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ imagem: { caminho: "/uploads/avatars/bia.png" } }),
          { status: 200 },
        ),
      ),
    );
    const trigger = document.createElement("div");

    await aplicarAvatarNaNavbar(trigger, usuario);

    expect(trigger.querySelector("img").getAttribute("src")).toBe(
      "/uploads/avatars/bia.png",
    );
    expect(JSON.parse(localStorage.getItem("usuarioLogado")).imagem.caminho).toBe(
      "/uploads/avatars/bia.png",
    );
  });

  it("atualiza a sessão local após enviar uma nova foto", async () => {
    localStorage.setItem("usuarioLogado", JSON.stringify({ id_usuario: 4 }));
    localStorage.setItem("token", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ imagem: { caminho: "/uploads/avatars/nova.png" } }),
          { status: 201 },
        ),
      ),
    );

    await enviarFotoPerfil(new File(["png"], "avatar.png", { type: "image/png" }), false);

    expect(JSON.parse(localStorage.getItem("usuarioLogado")).imagem.caminho).toBe(
      "/uploads/avatars/nova.png",
    );
  });

  it("salva usuario e token após cadastro", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ usuario: { id_usuario: 2 }, token: "token" }),
            { status: 201 },
          ),
        ),
    );
    await salvarCadastro({
      nome_completo: "Ana",
      email: "ANA@EXAMPLE.COM",
      senha: "123456",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/usuarios",
      expect.objectContaining({ method: "POST" }),
    );
    expect(localStorage.getItem("token")).toBe("token");
  });

  it("converte resposta de erro em excecao com status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ erro: "E-mail duplicado" }), {
            status: 409,
          }),
        ),
    );
    await expect(fazerLogin("ana@example.com", "123456")).rejects.toMatchObject(
      { status: 409, message: "E-mail duplicado" },
    );
  });

  it("aplica issues da API ao campo e limpa a validade customizada ao editar", () => {
    document.body.innerHTML = '<input id="email" type="email">';
    const email = document.getElementById("email");
    const error = {
      issues: [
        {
          path: ["body", "email"],
          message: "E-mail já cadastrado.",
        },
      ],
    };

    expect(aplicarErroApiNoCampo(error)).toBe(true);
    expect(email.validity.customError).toBe(true);
    expect(email.getAttribute("aria-invalid")).toBe("true");

    email.dispatchEvent(new Event("input"));
    expect(email.validity.customError).toBe(false);
    expect(email.hasAttribute("aria-invalid")).toBe(false);
  });
});
