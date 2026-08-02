import { verificarAutenticacao } from './auth.js';

// ── Ícone ────────────────────────────────────────────────────────────────────
// Ondinha de áudio em SVG (branca), sem depender de fontes de ícone externas.
function svgOnda(tamanho = 22) {
  return `
    <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="onda-svg">
      <rect x="1"  y="9"  width="2.4" height="6"  rx="1.2" fill="#fff"/>
      <rect x="5"  y="5"  width="2.4" height="14" rx="1.2" fill="#fff"/>
      <rect x="9"  y="10.5" width="2.4" height="3" rx="1.2" fill="#fff"/>
      <rect x="13" y="2"  width="2.4" height="20" rx="1.2" fill="#fff"/>
      <rect x="17" y="6.5" width="2.4" height="11" rx="1.2" fill="#fff"/>
      <rect x="21" y="9"  width="2.4" height="6"  rx="1.2" fill="#fff"/>
    </svg>
  `;
}

// ── Tempo relativo (ex: "agora", "12min", "3h") ─────────────────────────────────
// Como a prévia expira em 24h, nunca precisa mostrar em dias — só min/h.
function tempoRelativo(dataISO) {
  const diffMs = Date.now() - new Date(dataISO).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h`;
}

// ── Feed (barra de "bolinhas" tipo stories) ────────────────────────────────────

/**
 * Busca o feed de prévias ativas e desenha a barra de bolinhas dentro de `container`.
 * Ao clicar numa bolinha, abre o viewer com as prévias daquele usuário.
 */
export async function renderizarFeedPostagens(container) {
  if (!container) return;
  container.innerHTML = '<p class="feed-loading">Carregando prévias...</p>';

  const postagens = await buscarFeed();
  if (postagens === null) { container.innerHTML = ''; return; }

  container.innerHTML = '';
  if (postagens.length === 0) {
    container.innerHTML = '<p class="feed-vazio">Nenhuma prévia nas últimas 24h ainda.</p>';
    return;
  }

  for (const [, lista] of agruparPorAutor(postagens)) {
    container.appendChild(criarBolinha(lista, () => abrirViewer(lista)));
  }
}

/**
 * Versão em grade (cards maiores, com título) do feed — pensada pra uma
 * página dedicada de feed, separada da busca de usuários.
 */
export async function renderizarGradeFeedPostagens(container) {
  if (!container) return;
  container.innerHTML = '<p class="feed-loading">Carregando prévias...</p>';

  const postagens = await buscarFeed();
  if (postagens === null) { container.innerHTML = ''; return; }

  container.innerHTML = '';
  if (postagens.length === 0) {
    container.innerHTML = '<p class="feed-vazio">Nenhuma prévia nas últimas 24h ainda. Poste a sua no seu perfil!</p>';
    return;
  }

  for (const [, lista] of agruparPorAutor(postagens)) {
    container.appendChild(criarCardFeed(lista, () => abrirViewer(lista)));
  }
}

/**
 * Busca e desenha só as prévias ativas de UM usuário (usado na página de perfil).
 * Clicar na bolinha abre o viewer passando por todas as prévias dele em sequência.
 */
export async function renderizarGradePreviasDoUsuario(idUsuario, container, onContagem) {
  if (!container) return;
  container.innerHTML = '';

  let postagens = [];
  try {
    const res = await fetch(`/api/postagens/usuario/${idUsuario}`);
    if (!res.ok) throw new Error('Falha ao buscar prévias do usuário');
    postagens = await res.json();
  } catch (err) {
    console.error(err);
    onContagem?.(0);
    return;
  }

  onContagem?.(postagens.length);

  if (postagens.length === 0) {
    container.innerHTML = '<p class="feed-vazio" style="grid-column:1/-1;">Nenhuma prévia ativa no momento.</p>';
    return;
  }

  postagens.forEach((p, indice) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'story-thumb';
    thumb.setAttribute('aria-label', `Ouvir prévia: ${p.titulo || 'sem título'}`);
    thumb.innerHTML = `
      <div class="story-thumb-icone">${svgOnda(30)}</div>
      <div class="story-thumb-overlay">
        <span class="story-thumb-title">${escaparHtml(p.titulo || 'Sem título')}</span>
        <span class="story-thumb-tempo">${tempoRelativo(p.criado_em)}</span>
      </div>
    `;
    thumb.addEventListener('click', () => abrirViewer(postagens, indice));
    container.appendChild(thumb);
  });
}

export async function renderizarPostagensDoUsuario(idUsuario, container, onContagem) {
  if (!container) return;
  container.innerHTML = '';

  let postagens = [];
  try {
    const res = await fetch(`/api/postagens/usuario/${idUsuario}`);
    if (!res.ok) throw new Error('Falha ao buscar prévias do usuário');
    postagens = await res.json();
  } catch (err) {
    console.error(err);
    onContagem?.(0);
    return;
  }

  onContagem?.(postagens.length);

  if (postagens.length === 0) {
    container.innerHTML = '<p class="feed-vazio">Nenhuma prévia ativa no momento.</p>';
    return;
  }

  container.appendChild(criarBolinha(postagens, () => abrirViewer(postagens)));
}

async function buscarFeed() {
  try {
    const res = await fetch('/api/postagens/feed');
    if (!res.ok) throw new Error('Falha ao buscar prévias');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Agrupa por autor: cada bolinha/card representa um usuário, não uma postagem —
// se ele postou 3 prévias, o clique abre um viewer que passa pelas 3 em sequência.
function agruparPorAutor(postagens) {
  const porAutor = new Map();
  for (const p of postagens) {
    const lista = porAutor.get(p.autor.id_usuario) || [];
    lista.push(p);
    porAutor.set(p.autor.id_usuario, lista);
  }
  return porAutor;
}

function criarBolinha(postagensDoAutor, onClick) {
  const nomeAutor = postagensDoAutor[0].autor.nome;
  const bolinha = document.createElement('button');
  bolinha.className = 'story-bolinha';
  bolinha.type = 'button';
  bolinha.setAttribute('aria-label', `Ver prévias de ${nomeAutor}`);
  bolinha.innerHTML = `
    <span class="story-anel">
      <span class="story-icone">${svgOnda(20)}</span>
    </span>
    <span class="story-nome">${escaparHtml(nomeAutor)}</span>
  `;
  bolinha.addEventListener('click', onClick);
  return bolinha;
}

function criarCardFeed(postagensDoAutor, onClick) {
  const primeira = postagensDoAutor[0];
  const nomeAutor = primeira.autor.nome;
  const titulo = primeira.titulo || 'Prévia sem título';
  const qtd = postagensDoAutor.length;

  const card = document.createElement('button');
  card.className = 'feed-card';
  card.type = 'button';
  card.setAttribute('aria-label', `Ouvir prévias de ${nomeAutor}`);
  card.innerHTML = `
    <span class="feed-card-icone">${svgOnda(28)}</span>
    <span class="feed-card-texto">
      <span class="feed-card-titulo">${escaparHtml(titulo)}</span>
      <span class="feed-card-autor">${escaparHtml(nomeAutor)}${qtd > 1 ? ` · ${qtd} prévias` : ''} · há ${tempoRelativo(primeira.criado_em)}</span>
    </span>
  `;
  card.addEventListener('click', onClick);
  return card;
}

// ── Viewer (tela cheia, autoplay, barra de progresso) ───────────────────────────

let viewerAtual = null;

/**
 * Liga um AnalyserNode no <audio> e faz o círculo "pulsar" (escala) em
 * tempo real junto com o volume do trecho tocando — reação de verdade ao
 * áudio, não uma animação decorativa fixa.
 * Retorna uma função de "parar" pra ser chamada ao fechar o viewer.
 */
function iniciarVisualizer(audio, circulo) {
  let audioCtx, analyser, dataArray, frameId;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75; // suaviza pra não "tremer" demais
    source.connect(analyser);
    analyser.connect(audioCtx.destination); // sem isso o som para de tocar
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  } catch (err) {
    // Autoplay bloqueado, navegador sem suporte, etc — sem pulso, sem quebrar nada
    console.error('Visualizador de áudio indisponível:', err);
    return () => {};
  }

  function pulsar() {
    frameId = requestAnimationFrame(pulsar);

    analyser.getByteFrequencyData(dataArray);
    let soma = 0;
    for (let i = 0; i < dataArray.length; i++) soma += dataArray[i] / 255;
    const volumeMedio = soma / dataArray.length;

    circulo.style.transform = `scale(${1 + volumeMedio * 0.18})`;
  }

  // Autoplay policies exigem retomar o contexto após o gesto do usuário
  // (abrir o viewer já é um clique, então isso normalmente resolve na hora)
  audioCtx.resume().catch(() => {});
  frameId = requestAnimationFrame(pulsar);

  return function parar() {
    cancelAnimationFrame(frameId);
    circulo.style.transform = '';
    audioCtx.close().catch(() => {});
  };
}

function abrirViewer(postagens, indiceInicial = 0) {
  fecharViewer(); // garante que não existam dois viewers abertos

  let indice = 0;
  const overlay = document.createElement('div');
  overlay.className = 'story-viewer-overlay';
  overlay.innerHTML = `
    <div class="story-viewer-barra"><div class="story-viewer-progresso"></div></div>
    <button class="story-viewer-fechar" type="button" aria-label="Fechar">&times;</button>
    <div class="story-viewer-info"></div>
    <div class="story-viewer-area">
      <button class="story-viewer-nav story-viewer-anterior" type="button" aria-label="Anterior">‹</button>
      <div class="story-viewer-icone-grande">${svgOnda(56)}</div>
      <button class="story-viewer-nav story-viewer-proxima" type="button" aria-label="Próxima">›</button>
    </div>
    <div class="story-viewer-titulo"></div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  let timeoutId = null;

  // ── Pulso reagindo ao áudio (Web Audio API) ─────────────────────────────────
  const circulo = overlay.querySelector('.story-viewer-icone-grande');
  let pararVisualizer = iniciarVisualizer(audio, circulo);

  function tocar(i) {
    if (i < 0) { fecharViewer(); return; }
    if (i >= postagens.length) { fecharViewer(); return; }
    indice = i;

    const p = postagens[indice];
    overlay.querySelector('.story-viewer-info').textContent =
      `${p.autor.nome} · prévia ${indice + 1}/${postagens.length} · há ${tempoRelativo(p.criado_em)}`;
    overlay.querySelector('.story-viewer-titulo').textContent = p.titulo || '';

    clearTimeout(timeoutId);
    audio.pause();
    audio.src = p.audio_url;
    audio.currentTime = p.inicio_seg || 0;
    audio.play().catch(() => {}); // navegador pode bloquear autoplay sem interação — ok, tem play manual

    animarBarraProgresso(overlay.querySelector('.story-viewer-progresso'), p.duracao_seg);
    timeoutId = setTimeout(() => tocar(indice + 1), p.duracao_seg * 1000);
  }

  overlay.querySelector('.story-viewer-fechar').addEventListener('click', fecharViewer);
  overlay.querySelector('.story-viewer-anterior').addEventListener('click', () => tocar(indice - 1));
  overlay.querySelector('.story-viewer-proxima').addEventListener('click', () => tocar(indice + 1));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fecharViewer();
  });

  viewerAtual = { overlay, audio, limpar: () => { clearTimeout(timeoutId); pararVisualizer(); } };
  tocar(indiceInicial);
}

function fecharViewer() {
  if (!viewerAtual) return;
  viewerAtual.limpar();
  viewerAtual.audio.pause();
  viewerAtual.overlay.remove();
  document.body.style.overflow = '';
  viewerAtual = null;
}

function animarBarraProgresso(el, duracaoSeg) {
  el.style.transition = 'none';
  el.style.width = '0%';
  // força reflow antes de trocar a transition, senão o navegador "pula" a animação
  void el.offsetWidth;
  el.style.transition = `width ${duracaoSeg}s linear`;
  el.style.width = '100%';
}

// ── Criar postagem (usado na página de perfil, só pelo dono) ───────────────────

/**
 * Envia um arquivo de áudio + intervalo escolhido como uma nova prévia.
 * `arquivoAudio` é um File (input type="file"), inicioSeg/duracaoSeg em segundos.
 */
export async function criarPostagem(arquivoAudio, titulo, inicioSeg, duracaoSeg) {
  const usuarioLocal = verificarAutenticacao();
  if (!usuarioLocal) return null;

  const form = new FormData();
  form.append('audio', arquivoAudio);
  form.append('id_usuario', String(usuarioLocal.id_usuario));
  if (titulo) form.append('titulo', titulo);
  form.append('inicio_seg', String(inicioSeg));
  form.append('duracao_seg', String(duracaoSeg));

  const res = await fetch('/api/postagens', { method: 'POST', body: form });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro || 'Não foi possível publicar a prévia.');
  }
  return res.json();
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}