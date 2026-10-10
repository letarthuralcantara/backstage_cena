const ESTADOS_MUSICA = {
  nao_autorizado: "Sua conta ainda não está autorizada para este app do Spotify.",
  limite_atingido: "O provedor limitou as consultas. Tente novamente mais tarde.",
  oculto: "Esta pessoa não compartilha suas informações musicais com você.",
  desconectado: "Reconecte sua conta musical para voltar a compartilhar.",
  atividade_privada: "Torne pública a atividade do seu perfil Last.fm para exibir scrobbles.",
};

export function rotuloPeriodoMusica(periodo) {
  return {
    curto: "Últimas 4 semanas",
    medio: "Últimos 6 meses",
    longo: "Últimos 12 meses",
  }[periodo] || "Últimas 4 semanas";
}

export function calcularProgressoMusica(item, consultadoEm, agora = Date.now()) {
  if (!item || !Number.isFinite(item.duracao_ms) || item.duracao_ms <= 0 ||
      !Number.isFinite(item.progresso_ms) || item.progresso_ms < 0) return null;
  const consultado = Date.parse(consultadoEm);
  const decorrido = Number.isFinite(consultado) ? Math.max(0, agora - consultado) : 0;
  return Math.min(100, Math.max(0, ((item.progresso_ms + decorrido) / item.duracao_ms) * 100));
}

export function consultasMusicaisAtivas(abaVisivel, cardVisivel) {
  return Boolean(abaVisivel && cardVisivel);
}

export function atrasoRetryAfter(valor, agora = Date.now(), fallback = 15_000) {
  if (!valor) return fallback;
  const segundos = Number(valor);
  if (Number.isFinite(segundos) && segundos >= 0) return segundos * 1000;
  const data = Date.parse(valor);
  return Number.isFinite(data) ? Math.max(0, data - agora) : fallback;
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function definirImagem(elemento, url, alt = "") {
  if (!url) return false;
  try {
    const segura = new URL(url, window.location.href);
    if (segura.protocol !== "https:" && segura.protocol !== "http:") return false;
    const imagem = criarElemento("img", "music-cover");
    imagem.src = segura.href;
    imagem.alt = alt;
    elemento.append(imagem);
    return true;
  } catch {
    return false;
  }
}

function renderizarEstado(container, payload) {
  const mensagem = ESTADOS_MUSICA[payload?.estado] ||
    (!payload?.conectado ? "Nenhuma conexão musical compartilhada." : "Não está ouvindo nada agora.");
  container.replaceChildren(criarElemento("p", "music-empty-state", mensagem));
}

export function renderizarAgoraMusica(container, payload) {
  container.replaceChildren();
  if (!payload?.conectado || payload.estado === "nao_autorizado" || payload.estado === "limite_atingido" ||
      payload.estado === "oculto" || !payload.tocando || !payload.item) {
    renderizarEstado(container, payload);
    return;
  }

  const card = criarElemento("div", "music-now-playing");
  const cover = criarElemento("div", "music-cover-wrap");
  if (!definirImagem(cover, payload.item.imagem, `Capa de ${payload.item.album || payload.item.nome}`)) {
    cover.append(criarElemento("span", "music-cover-placeholder", "♪"));
  }
  const equalizer = criarElemento("span", "music-equalizer");
  equalizer.setAttribute("aria-label", "Tocando agora");
  equalizer.setAttribute("role", "img");
  for (let index = 0; index < 3; index += 1) equalizer.append(criarElemento("i"));
  cover.append(equalizer);

  const info = criarElemento("div", "music-now-info");
  info.append(
    criarElemento("strong", "music-track-title", payload.item.nome),
    criarElemento("span", "music-track-artist", payload.item.artistas.join(", ")),
  );
  if (payload.item.album) info.append(criarElemento("span", "music-track-album", payload.item.album));
  if (payload.item.duracao_ms && payload.item.progresso_ms !== null) {
    const progress = criarElemento("div", "music-progress");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Progresso da faixa");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.dataset.duracao = String(payload.item.duracao_ms);
    progress.dataset.progresso = String(payload.item.progresso_ms);
    progress.dataset.consultadoEm = payload.consultado_em || "";
    const bar = criarElemento("span", "music-progress-bar");
    bar.style.width = `${calcularProgressoMusica(payload.item, payload.consultado_em) ?? 0}%`;
    progress.append(bar);
    info.append(progress);
  }

  card.append(cover, info);
  if (payload.item.url) {
    try {
      const linkUrl = new URL(payload.item.url);
      if (linkUrl.protocol === "https:") {
        const link = criarElemento("a", "music-open-link", payload.provedor === "spotify" ? "Abrir no Spotify" : "Abrir no Last.fm");
        link.href = linkUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
    } catch {
      // Ignore malformed external provider URLs.
    }
  }
  container.append(card);
  const attribution = criarElemento("p", "music-attribution",
    payload.provedor === "spotify" ? "Música fornecida por Spotify." : "Música fornecida por Last.fm; scrobbles públicos.");
  container.append(attribution);
}

export function atualizarBarraProgressoMusica(container, agora = Date.now()) {
  container.querySelectorAll(".music-progress").forEach((progress) => {
    const item = {
      duracao_ms: Number(progress.dataset.duracao),
      progresso_ms: Number(progress.dataset.progresso),
    };
    const valor = calcularProgressoMusica(item, progress.dataset.consultadoEm, agora);
    if (valor === null) return;
    progress.setAttribute("aria-valuenow", String(Math.round(valor)));
    const bar = progress.querySelector(".music-progress-bar");
    if (bar) bar.style.width = `${valor}%`;
  });
}

export function renderizarTopMusica(container, payload) {
  container.replaceChildren();
  if (!payload?.conectado || payload.estado) {
    renderizarEstado(container, payload);
    return;
  }
  if (!payload.itens?.length) {
    container.append(criarElemento("p", "music-empty-state", "Ainda não há dados musicais para este período."));
    return;
  }

  const lista = criarElemento("div", "music-top-list");
  payload.itens.forEach((item, index) => {
    const linha = criarElemento("div", "music-top-item");
    const imagem = criarElemento("div", "music-top-image");
    if (!definirImagem(imagem, item.imagem, "")) imagem.append(criarElemento("span", "", "♪"));
    const texto = criarElemento("div", "music-top-text");
    texto.append(criarElemento("strong", "", item.nome));
    if (item.artistas?.length) texto.append(criarElemento("span", "", item.artistas.join(", ")));
    const ordem = criarElemento("span", "music-top-rank", String(index + 1));
    linha.append(ordem, imagem, texto);
    if (item.url) {
      try {
        const url = new URL(item.url);
        if (url.protocol === "https:") {
          const link = criarElemento("a", "music-open-link", payload.provedor === "spotify" ? "Abrir no Spotify" : "Abrir no Last.fm");
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          linha.append(link);
        }
      } catch {
        // Ignore malformed external provider URLs.
      }
    }
    lista.append(linha);
  });
  container.append(lista, criarElemento("p", "music-attribution",
    payload.provedor === "spotify" ? "Dados fornecidos por Spotify." : "Dados scrobblados fornecidos por Last.fm."));
}
