/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  iniciarBibliotecaWorkOn,
  renderizarWorkOnsDoUsuario,
} from "../../public/js/workon.js";

const projetos = [
  {
    id_workon: 4,
    titulo: "Meu álbum",
    tipo: "album",
    status: "producao",
    eh_dono: true,
    dono: { nome: "Ana" },
  },
  {
    id_workon: 8,
    titulo: "Projeto compartilhado",
    tipo: "single",
    status: "mixagem",
    eh_dono: false,
    papel: "editor",
    dono: { nome: "Bia" },
  },
];

const json = (dados) => new Response(JSON.stringify(dados), { status: 200 });

describe("interface Work On", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.setItem("token", "token-teste");
    document.body.innerHTML = "";
  });

  it("carrega e categoriza a biblioteca em Meus e Compartilhados comigo", async () => {
    document.body.innerHTML = `
      <button data-workon-tab="meus"></button>
      <button data-workon-tab="compartilhados"></button>
      <button data-workon-tab="explorar"></button>
      <button data-workon-view="galeria"></button>
      <button data-workon-view="lista"></button>
      <button data-workon-view="quadro"></button>
      <form id="criarWorkOn"></form><p id="workonErro"></p><div id="workonGrid"></div>`;
    const fetchMock = vi.fn().mockResolvedValue(json(projetos));
    vi.stubGlobal("fetch", fetchMock);

    await iniciarBibliotecaWorkOn();
    expect(document.querySelectorAll(".workon-card strong")[0].textContent).toBe("Meu álbum");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/workons/meus");

    document.querySelector('[data-workon-tab="compartilhados"]').click();
    await vi.waitFor(() => {
      expect([...document.querySelectorAll(".workon-card strong")].map((item) => item.textContent))
        .toEqual(["Projeto compartilhado"]);
    });

    document.querySelector('[data-workon-view="quadro"]').click();
    await vi.waitFor(() => {
      expect(document.querySelector(".workon-board-column h3").textContent).toContain("Ideia");
      expect(document.querySelector(".workon-board-column:nth-child(3) .workon-card strong").textContent)
        .toBe("Projeto compartilhado");
    });
  });

  it("mostra Work Ons públicos e atalho de criação no perfil do próprio usuário", async () => {
    const container = document.createElement("div");
    const fetchMock = vi.fn().mockResolvedValue(json([projetos[0]]));
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await renderizarWorkOnsDoUsuario(17, container, true);

    expect(fetchMock).toHaveBeenCalledWith("/api/workons/usuario/17", expect.any(Object));
    expect(resultado).toHaveLength(1);
    expect(container.querySelector(".workon-card").getAttribute("href")).toBe("workon.html?id=4");
    expect(container.querySelector(".profile-workon-create").getAttribute("href")).toBe("workons.html#criarWorkOn");
    expect(container.querySelector(".profile-workon-create").textContent).toContain("+");
    expect(container.textContent).toContain("Meu álbum");
  });

  it("não mostra o atalho de criação no perfil de outra pessoa", async () => {
    const container = document.createElement("div");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));

    await renderizarWorkOnsDoUsuario(17, container);

    expect(container.querySelector(".profile-workon-create")).toBeNull();
  });
});
