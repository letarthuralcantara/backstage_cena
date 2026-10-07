import { describe, expect, it } from "vitest";
import {
  calcularDimensoesSaida,
  calcularZoomMinimo,
  converterMolduraParaOrigem,
  limitarDeslocamento,
  validarImagemOriginal,
} from "../../public/js/image-cropper.js";

describe("matemática do recorte de imagem", () => {
  it("calcula zoom mínimo para imagem mais larga que alta", () => {
    const zoom = calcularZoomMinimo(1600, 900, 300, 300);
    expect(zoom).toBeCloseTo(1 / 3);
    expect(1600 * zoom).toBeGreaterThanOrEqual(300);
    expect(900 * zoom).toBeGreaterThanOrEqual(300);
  });

  it("calcula zoom mínimo para imagem mais alta que larga", () => {
    const zoom = calcularZoomMinimo(900, 1600, 320, 400);
    expect(zoom).toBeCloseTo(320 / 900);
    expect(900 * zoom).toBeGreaterThanOrEqual(320);
    expect(1600 * zoom).toBeGreaterThanOrEqual(400);
  });

  it("mantém a moldura coberta no zoom mínimo", () => {
    const zoom = calcularZoomMinimo(1200, 800, 300, 300);
    const limitado = limitarDeslocamento(
      -500,
      20,
      1200 * zoom,
      800 * zoom,
      300,
      300,
    );
    expect(limitado.x).toBe(-150);
    expect(limitado.y).toBe(0);
    expect(limitado.x + 1200 * zoom).toBeGreaterThanOrEqual(300);
    expect(limitado.y + 800 * zoom).toBeGreaterThanOrEqual(300);
  });

  it("trava o deslocamento nas bordas de uma imagem maior que a moldura", () => {
    expect(limitarDeslocamento(-500, -100, 500, 350, 300, 200)).toEqual({
      x: -200,
      y: -100,
    });
    expect(limitarDeslocamento(50, 50, 500, 350, 300, 200)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("converte a seleção da moldura em coordenadas da imagem original", () => {
    expect(
      converterMolduraParaOrigem(-50, -25, 0.5, 200, 100, 1000, 500),
    ).toEqual({ x: 100, y: 50, largura: 400, altura: 200 });
  });

  it("limita a resolução de saída pelo maior lado", () => {
    expect(calcularDimensoesSaida(4000, 2000, 1600)).toEqual({
      largura: 1600,
      altura: 800,
    });
    expect(calcularDimensoesSaida(400, 200, 1600)).toEqual({
      largura: 400,
      altura: 200,
    });
  });

  it("aceita originais de até 15 MB e rejeita maiores", () => {
    expect(
      validarImagemOriginal(new File(["png"], "foto.png", { type: "image/png" })),
    ).toBeNull();
    expect(
      validarImagemOriginal(
        new File([new Uint8Array(15 * 1024 * 1024 + 1)], "foto.png", {
          type: "image/png",
        }),
      ),
    ).toContain("15 MB");
  });
});
