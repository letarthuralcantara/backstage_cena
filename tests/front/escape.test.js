import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(process.cwd(), "public");
const PERIGOSO = `x" onfocus="alert(1)" y='z' <b>&`;

function listarArquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return listarArquivos(caminho);
    return /\.(js|html)$/.test(entrada.name) ? [caminho] : [];
  });
}

function extrairFuncao(codigo, nome) {
  const inicio = codigo.indexOf(`function ${nome}(`);
  if (inicio === -1) return null;
  const abre = codigo.indexOf("{", inicio);
  let nivel = 0;
  for (let i = abre; i < codigo.length; i += 1) {
    if (codigo[i] === "{") nivel += 1;
    if (codigo[i] === "}") {
      nivel -= 1;
      if (nivel === 0) return codigo.slice(inicio, i + 1);
    }
  }
  return null;
}

describe("escaparHtml em todo o front-end", () => {
  const definicoes = listarArquivos(RAIZ)
    .filter((arquivo) => !arquivo.endsWith("_styleguide.html"))
    .map((arquivo) => ({ arquivo, fonte: extrairFuncao(fs.readFileSync(arquivo, "utf8"), "escaparHtml") }))
    .filter((item) => item.fonte);

  it("encontra as funções de escape para poder testá-las", () => {
    expect(definicoes.length).toBeGreaterThan(0);
  });

  it.each(definicoes.map((d) => [path.relative(RAIZ, d.arquivo), d.fonte]))(
    "%s escapa aspas, apóstrofos e sinais de HTML",
    (_arquivo, fonte) => {
      const escapar = new Function(`${fonte}; return escaparHtml;`)();
      const saida = escapar(PERIGOSO);
      expect(saida).not.toMatch(/["'<>]/);
      expect(saida).toContain("&quot;");
    },
  );
});
