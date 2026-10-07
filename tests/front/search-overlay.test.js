/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initSearchOverlay } from "../../public/js/search-overlay.js";

describe("overlay de busca no clube", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="searchBar"><input readonly></div>
      <button id="tabBarBuscar" type="button"></button>
      <div class="msg" data-mensagem-id="8"></div>
    `;
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value() {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value() {
        this.removeAttribute("open");
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("abre pelo header e tab bar, exibe resultados como texto e navega ao perfil/chat", async () => {
    const buscar = vi.fn().mockResolvedValue({
      membros: [
        {
          id_usuario: 5,
          nome: '<img src=x onerror="alert(1)">',
          foto: null,
        },
      ],
      mensagens: [
        {
          id_mensagem: 8,
          texto: "<script>alert(1)</script>",
          autor: { nome: "<b>Artista</b>" },
        },
      ],
    });
    initSearchOverlay({
      escopo: "clube",
      idClube: 3,
      placeholder: "Buscar neste clube...",
      buscar,
    });

    document.getElementById("searchBar").click();
    const dialog = document.querySelector(".search-overlay-dialog");
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector("input").placeholder).toBe("Buscar neste clube...");

    document.getElementById("tabBarBuscar").click();
    const input = dialog.querySelector("input");
    input.value = "termo";
    dialog.querySelector("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(dialog.querySelectorAll(".search-overlay-result")).toHaveLength(2),
    );

    expect(buscar).toHaveBeenCalledWith("termo");
    expect(dialog.querySelector("script, .search-overlay-result img")).toBeNull();
    expect(dialog.querySelector(".search-overlay-result").textContent).toContain(
      '<img src=x onerror="alert(1)">',
    );
    expect(dialog.querySelector(".search-overlay-result").getAttribute("href")).toBe(
      "perfil.html?id=5",
    );

    dialog.querySelector(".search-overlay-message").click();
    expect(document.querySelector(".msg").scrollIntoView).toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });
});