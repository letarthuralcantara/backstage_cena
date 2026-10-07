import {
  authHeaders,
  fazerLogout,
} from "./auth.js";
import { initNavbar } from "./navbar.js";

// ── Chamadas à API ────────────────────────────────────────────────────────────
async function chamar(url, { method = "GET", body } = {}) {
  const formulario = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: authHeaders({}, body !== undefined && !formulario),
    body: body === undefined ? undefined : formulario ? body : JSON.stringify(body),
  });
  if (res.status === 401) {
    fazerLogout();
    throw new Error("Sessão expirada.");
  }
  if (!res.ok) {
    let erro = {};
    try {
      erro = await res.json();
    } catch {
      /* corpo vazio */
    }
    const error = new Error(erro.erro || "Algo deu errado. Tente de novo.");
    error.status = res.status;
    error.issues = Array.isArray(erro.issues) ? erro.issues : [];
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

export const ClubesAPI = {
  listar: ({ q, tipo } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    const qs = params.toString();
    return chamar(`/api/clubes${qs ? `?${qs}` : ""}`);
  },
  recomendados: (limite) =>
    chamar(`/api/clubes/recomendados${limite ? `?limite=${limite}` : ""}`),
  meus: () => chamar("/api/clubes/meus"),
  doUsuario: (id) =>
    fetch(`/api/clubes/usuario/${id}`).then((r) => (r.ok ? r.json() : [])),
  detalhe: (id) => chamar(`/api/clubes/${id}`),
  buscar: (id, q) =>
    chamar(`/api/clubes/${id}/busca?${new URLSearchParams({ q })}`),
  criar: (dados) => chamar("/api/clubes", { method: "POST", body: dados }),
  enviarImagem: (id, arquivo) => {
    const formulario = new FormData();
    formulario.append("image", arquivo);
    return chamar(`/api/clubes/${id}/imagem`, {
      method: "POST",
      body: formulario,
    });
  },
  entrar: (id) => chamar(`/api/clubes/${id}/entrar`, { method: "POST" }),
  sair: (id) => chamar(`/api/clubes/${id}/sair`, { method: "DELETE" }),
  remover: (id) => chamar(`/api/clubes/${id}`, { method: "DELETE" }),
  mensagens: (id, depois) =>
    chamar(
      `/api/clubes/${id}/mensagens${depois !== undefined ? `?depois=${depois}` : ""}`,
    ),
  enviar: (id, texto) =>
    chamar(`/api/clubes/${id}/mensagens`, { method: "POST", body: { texto } }),
};

// ── Utilitários de UI ─────────────────────────────────────────────────────────
export function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

export function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return (nome || "B").substring(0, 2).toUpperCase();
}

const ICONES_TIPO = {
  genero: "fa-music",
  instrumento: "fa-guitar",
  daw: "fa-sliders",
  geral: "fa-users",
};
const ROTULOS_TIPO = {
  genero: "Gênero",
  instrumento: "Instrumento",
  daw: "DAW",
  geral: "Geral",
};
export const iconeTipo = (tipo) => ICONES_TIPO[tipo] || "fa-users";
export const rotuloTipo = (tipo) => ROTULOS_TIPO[tipo] || "Clube";

export function visualClubeHtml(clube, classe = "clube-icone") {
  const visual = clube.imagem
    ? `<img src="${escaparHtml(clube.imagem)}" alt="" loading="lazy">`
    : `<i class="fas ${iconeTipo(clube.tipo)}" aria-hidden="true"></i>`;
  return `<div class="${classe}" aria-hidden="true">${visual}</div>`;
}

export function textoMembros(n) {
  return `${n} ${n === 1 ? "membro" : "membros"}`;
}

/** Card de clube. `aoEntrar(clube, botao)` é chamado ao clicar em "Entrar". */
export function criarCardClube(clube, { aoEntrar, compacto = false } = {}) {
  const card = document.createElement("article");
  card.className = `clube-card${compacto ? " compacto" : ""}`;

  const tagHtml = clube.tag
    ? `<span class="clube-tag">${escaparHtml(clube.tag)}</span>`
    : "";
  const motivoHtml = clube.motivo
    ? `<p class="clube-motivo"><i class="fas fa-wand-magic-sparkles"></i> ${escaparHtml(clube.motivo)}</p>`
    : "";
  const descricaoHtml =
    !compacto && clube.descricao
      ? `<p class="clube-desc">${escaparHtml(clube.descricao)}</p>`
      : "";

  card.innerHTML = `
    <a class="clube-card-link" href="clube.html?id=${clube.id_clube}" aria-label="Abrir ${escaparHtml(clube.nome)}"></a>
    ${visualClubeHtml(clube)}
    <div class="clube-info">
      <h3 class="clube-nome">${escaparHtml(clube.nome)}</h3>
      <div class="clube-meta">${tagHtml}<span>${textoMembros(clube.total_membros)}</span></div>
      ${motivoHtml}
      ${descricaoHtml}
    </div>
    <div class="clube-acao"></div>
  `;

  const acao = card.querySelector(".clube-acao");
  if (clube.participa) {
    acao.innerHTML = '<span class="clube-participa"><i class="fas fa-check"></i> Membro</span>';
  } else if (aoEntrar) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-primary clube-btn";
    botao.textContent = "Entrar";
    botao.addEventListener("click", () => aoEntrar(clube, botao));
    acao.appendChild(botao);
  }
  return card;
}

/** Cabeçalho comum: avatar/iniciais, dropdown e botão de sair. */
export async function prepararCabecalho(redirecionar = true, opcoes = {}) {
  return initNavbar({ ...opcoes, redirecionar });
}
