/* @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import {
  atualizarBarraProgressoMusica,
  atrasoRetryAfter,
  calcularProgressoMusica,
  consultasMusicaisAtivas,
  renderizarAgoraMusica,
  renderizarTopMusica,
  rotuloPeriodoMusica,
} from "../../public/js/musica.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("componentes de Música", () => {
  it("rotula períodos e calcula progresso local com limites", () => {
    expect(rotuloPeriodoMusica("curto")).toBe("Últimas 4 semanas");
    expect(rotuloPeriodoMusica("medio")).toBe("Últimos 6 meses");
    expect(calcularProgressoMusica(
      { duracao_ms: 100_000, progresso_ms: 20_000 },
      new Date(10_000).toISOString(),
      20_000,
    )).toBe(30);
    expect(calcularProgressoMusica(
      { duracao_ms: 100_000, progresso_ms: 200_000 },
      new Date(10_000).toISOString(),
      20_000,
    )).toBe(100);
    expect(calcularProgressoMusica({ duracao_ms: null, progresso_ms: null }, "")).toBeNull();
  });

  it("só mantém atualização quando a aba e o card estão visíveis", () => {
    expect(consultasMusicaisAtivas(true, true)).toBe(true);
    expect(consultasMusicaisAtivas(false, true)).toBe(false);
    expect(consultasMusicaisAtivas(true, false)).toBe(false);
  });

  it("respeita Retry-After em segundos, data HTTP e valores inválidos", () => {
    expect(atrasoRetryAfter("12", 0)).toBe(12_000);
    expect(atrasoRetryAfter(new Date(5_000).toUTCString(), 0)).toBe(5_000);
    expect(atrasoRetryAfter("inválido", 0, 9_000)).toBe(9_000);
  });

  it("renderiza texto externo como texto e descarta URLs de imagem inseguras", () => {
    const container = document.createElement("div");
    renderizarAgoraMusica(container, {
      conectado: true,
      provedor: "spotify",
      tocando: true,
      consultado_em: new Date().toISOString(),
      item: {
        nome: "<img src=x onerror=alert(1)>",
        album: null,
        artistas: ["Artista"],
        imagem: "javascript:alert(1)",
        url: "https://open.spotify.com/track/1",
        duracao_ms: 180_000,
        progresso_ms: 45_000,
      },
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".music-track-title").textContent).toBe("<img src=x onerror=alert(1)>");
    expect(container.querySelector("script, img[onerror]")).toBeNull();
    expect(container.querySelector('a[href="https://open.spotify.com/track/1"]').textContent).toBe("Abrir no Spotify");
  });

  it("mostra estados amigáveis, rankings e atualiza a barra sem outra consulta", () => {
    const container = document.createElement("div");
    renderizarAgoraMusica(container, { conectado: false, estado: "nao_autorizado" });
    expect(container.textContent).toContain("Spotify");

    renderizarTopMusica(container, {
      conectado: true,
      provedor: "lastfm",
      itens: [{ nome: "Faixa Top", artistas: ["Artista"], imagem: null, url: "https://last.fm/track/1" }],
    });
    expect(container.textContent).toContain("Faixa Top");
    expect(container.textContent).toContain("scrobblados");
    expect(container.querySelector('a[href="https://last.fm/track/1"]').textContent).toBe("Abrir no Last.fm");

    renderizarAgoraMusica(container, {
      conectado: true,
      provedor: "spotify",
      tocando: true,
      consultado_em: new Date(0).toISOString(),
      item: { nome: "Faixa", artistas: [], album: null, imagem: null, url: null, duracao_ms: 100_000, progresso_ms: 20_000 },
    });
    atualizarBarraProgressoMusica(container, 30_000);
    expect(container.querySelector(".music-progress-bar").style.width).toBe("50%");
  });
});
