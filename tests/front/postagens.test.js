/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderizarPostagensDoUsuario,
  renderizarAvatarAutor,
  validarImagemTweet,
} from "../../public/js/postagens.js";

function resposta(dados) {
  return new Response(JSON.stringify(dados), { status: 200 });
}

describe("postagens do perfil", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="postagens"></div>';
    vi.unstubAllGlobals();
  });

  it("mostra prévias e tweets juntos, do mais novo para o mais antigo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        Promise.resolve(
          url.includes("/tweets/")
            ? resposta([
                {
                  autor: {
                    nome: "Artista",
                    imagem: "/uploads/avatars/0123456789abcdef0123456789abcdef.png",
                  },
                  texto: "Tweet recente",
                  imagem: "/uploads/tweets/0123456789abcdef0123456789abcdef.png",
                  criado_em: "2026-10-07T11:00:00.000Z",
                },
              ])
            : resposta([
                {
                  autor: {
                    nome: "Artista",
                    imagem: "/uploads/avatars/0123456789abcdef0123456789abcdef.png",
                  },
                  titulo: "Prévia antiga",
                  duracao_seg: 30,
                  criado_em: "2026-10-06T11:00:00.000Z",
                },
              ]),
        ),
      ),
    );

    await renderizarPostagensDoUsuario(
      42,
      document.getElementById("postagens"),
    );

    const itens = document.querySelectorAll(".perfil-post");
    expect([...itens].map((item) => item.classList[1])).toEqual([
      "perfil-post--tweet",
      "perfil-post--previa",
    ]);
    expect(document.querySelector(".perfil-post-texto").textContent).toBe(
      "Tweet recente",
    );
    expect(document.querySelector(".perfil-post-audio-titulo").textContent).toBe(
      "Prévia antiga",
    );
    const imagem = document.querySelector(".perfil-post--tweet .tweet-imagem");
    expect(imagem.getAttribute("src")).toBe(
      "/uploads/tweets/0123456789abcdef0123456789abcdef.png",
    );
    expect(imagem.loading).toBe("lazy");
    expect(imagem.alt).toContain("Artista");
    expect(
      document.querySelectorAll(".perfil-post-avatar img"),
    ).toHaveLength(2);
    expect(
      document.querySelector(".perfil-post-avatar img").getAttribute("src"),
    ).toBe("/uploads/avatars/0123456789abcdef0123456789abcdef.png");
  });

  it("valida os formatos aceitos e o limite de 2 MB", () => {
    expect(
      validarImagemTweet(new File(["png"], "imagem.png", { type: "image/png" })),
    ).toBeNull();
    expect(
      validarImagemTweet(
        new File(["texto"], "imagem.txt", { type: "text/plain" }),
      ),
    ).toContain("JPEG, PNG ou GIF");
    expect(
      validarImagemTweet(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "grande.png", {
          type: "image/png",
        }),
      ),
    ).toContain("2 MB");
  });

  it("mantém as iniciais se o autor não tiver caminho de avatar válido", () => {
    const avatar = document.createElement("div");
    renderizarAvatarAutor(avatar, {
      nome: "Bia Beat",
      imagem: "https://example.com/avatar.png",
    });

    expect(avatar.textContent).toBe("BB");
    expect(avatar.querySelector("img")).toBeNull();
  });
});
