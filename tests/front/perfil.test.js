/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  carregarUsuariosPerfil,
  renderizarIdentidadePerfil,
} from "../../public/js/perfil.js";

const usuarioA = {
  id_usuario: 10,
  nome_artistico: "Ana A",
  nome_completo: "Ana Artista",
  cadastro_completo: 0,
  imagem: { caminho: "/uploads/avatars/ana.png" },
};
const usuarioB = {
  id_usuario: 22,
  nome_artistico: "Bia B",
  nome_completo: "Bia Beat",
  email: "bia@example.com",
  cadastro_completo: 1,
  imagem: { caminho: "/uploads/avatars/bia.png" },
};

function resposta(usuario) {
  return new Response(JSON.stringify(usuario), { status: 200 });
}

describe("identidade do header no perfil", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.body.innerHTML = `
      <div id="profileDropdown">
        <button id="profileTrigger"></button>
        <span id="profileIncompleteBadge">!</span>
        <button id="btnSair"></button>
      </div>
      <div id="avatar"></div>
      <span id="nomeExibir"></span>
      <span id="emailExibir"></span>
    `;
    localStorage.setItem("usuarioLogado", JSON.stringify(usuarioA));
    localStorage.setItem("token", "token-da-ana");
  });

  it("mantém A no header ao abrir o perfil de B e não troca a sessão", async () => {
    const fetchMock = vi.fn((url) =>
      Promise.resolve(resposta(url.endsWith("/10") ? usuarioA : usuarioB)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const sessaoAntes = localStorage.getItem("usuarioLogado");
    const tokenAntes = localStorage.getItem("token");

    const { usuarioLogado, usuarioVisto, ehProprio } =
      await carregarUsuariosPerfil("22");
    renderizarIdentidadePerfil(usuarioVisto);

    expect(ehProprio).toBe(false);
    expect(usuarioLogado.id_usuario).toBe(usuarioA.id_usuario);
    expect(document.querySelector("#profileTrigger img").getAttribute("src")).toBe(
      usuarioA.imagem.caminho,
    );
    expect(document.getElementById("profileIncompleteBadge").classList.contains("show")).toBe(true);
    expect(document.querySelector("#avatar img").getAttribute("src")).toBe(
      usuarioB.imagem.caminho,
    );
    expect(document.getElementById("nomeExibir").textContent).toBe("Bia B");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/usuarios/10",
      "/api/usuarios/22",
    ]);
    expect(localStorage.getItem("usuarioLogado")).toBe(sessaoAntes);
    expect(localStorage.getItem("token")).toBe(tokenAntes);
  });

  it("reutiliza a resposta do header ao abrir o próprio perfil", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(usuarioA));
    vi.stubGlobal("fetch", fetchMock);

    const { usuarioLogado, usuarioVisto, ehProprio } =
      await carregarUsuariosPerfil(String(usuarioA.id_usuario));
    renderizarIdentidadePerfil(usuarioVisto);

    expect(ehProprio).toBe(true);
    expect(usuarioVisto).toBe(usuarioLogado);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector("#profileTrigger img").getAttribute("src")).toBe(
      usuarioA.imagem.caminho,
    );
    expect(document.getElementById("nomeExibir").textContent).toBe("Ana A");
  });
});