/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initNavbar } from "../../public/js/navbar.js";

const usuario = {
  id_usuario: 7,
  nome_artistico: "Ana A",
  nome_completo: "Ana Artista",
  cadastro_completo: 0,
  imagem: { caminho: "/uploads/avatars/ana.png" },
};

const paginas = [
  ["feed.html", "Feed"],
  ["perfil.html", "Perfil"],
  ["editar.html", "Perfil"],
  ["config.html", "Perfil"],
  ["publicar.html", "Postar"],
  ["pesquisar_usuarios.html", "Buscar"],
  ["clubes.html", "Clubes"],
  ["clube.html", "Clubes"],
];

describe("navbar interna", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
    localStorage.setItem("token", "token-de-teste");
    document.body.innerHTML = `
      <header>
        <div class="header-center"></div>
        <div id="profileDropdown" class="profile-dropdown"></div>
      </header>
      <nav class="tab-bar"></nav>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(usuario), { status: 200 }),
      ),
    );
  });

  it.each(paginas)("monta a barra e marca %s como %s", async (pagina, ativo) => {
    window.history.replaceState(null, "", `/pages/${pagina}`);
    await initNavbar();

    expect(
      [...document.querySelectorAll(".tab-bar-item")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Feed", "Buscar", "Clubes", "Postar", "Perfil"]);
    expect(document.querySelector(".tab-bar-item.active").textContent.trim()).toBe(
      ativo,
    );
    expect(document.getElementById("tabBarBuscar").tagName).toBe("BUTTON");
    expect(
      [...document.querySelectorAll(".dropdown-menu a")].map((item) => [
        item.textContent.trim(),
        item.getAttribute("href"),
      ]),
    ).toEqual([
      ["Meu Perfil", "perfil.html"],
      ["Feed", "feed.html"],
      ["Clubes", "clubes.html"],
      ["Nova Postagem", "publicar.html"],
      ["Configurações", "config.html"],
    ]);
    expect(document.getElementById("profileTrigger").querySelector("img").src).toContain(
      usuario.imagem.caminho,
    );
    expect(document.getElementById("profileIncompleteBadge").classList.contains("show")).toBe(true);
  });

  it("abre e fecha o menu do perfil", async () => {
    await initNavbar();
    const wrapper = document.getElementById("profileDropdown");
    const trigger = document.getElementById("profileTrigger");

    trigger.click();
    expect(wrapper.classList.contains("active")).toBe(true);
    document.body.click();
    expect(wrapper.classList.contains("active")).toBe(false);
  });
});