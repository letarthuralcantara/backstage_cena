// js/pesquisa.js
// Módulo da página de explorar músicos.
// Importa os dados dos JSONs e gera os cards dinamicamente.

import { fetchMusicos } from './dados.js';
import { getUsuarioLogado } from './auth.js';

let todosMusicos = [];

/**
 * Inicializa a página de pesquisa:
 * busca músicos do JSON e registra eventos dos filtros.
 */
export async function iniciarPesquisa() {
  // Busca músicos do arquivo JSON externo
  todosMusicos = await fetchMusicos();

  // Preenche iniciais do usuário logado no header
  const usuario = getUsuarioLogado();
  const trigger = document.getElementById('profileTrigger');
  if (trigger) {
    const nome = usuario ? (usuario.nome_artistico || usuario.nome_completo || '') : '?';
    trigger.textContent = nome.substring(0, 2).toUpperCase();
  }

  // Renderiza todos os músicos na carga inicial
  renderizar(todosMusicos);

  // ── Eventos de interação do usuário ──────────────────────────────────────

  // Evento: digitar no campo de busca
  document.getElementById('searchInput').addEventListener('input', filtrar);

  // Evento: pressionar Enter no campo de busca
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') filtrar();
  });

  // Evento: mudança em qualquer filtro de select
  ['filtroCidade', 'filtroInstrumento', 'filtroGenero', 'filtroDisponibilidade', 'filtroArea']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', filtrar);
    });

  // Evento: botão buscar
  const btnBuscar = document.getElementById('btnBuscar');
  if (btnBuscar) btnBuscar.addEventListener('click', filtrar);
}

/**
 * Filtra o array de músicos com base nos valores dos inputs e re-renderiza.
 */
export function filtrar() {
  const busca = document.getElementById('searchInput').value.toLowerCase();
  const cidade = document.getElementById('filtroCidade').value;
  const instrumento = document.getElementById('filtroInstrumento').value;
  const genero = document.getElementById('filtroGenero').value;
  const disponibilidade = document.getElementById('filtroDisponibilidade').value;
  const area = document.getElementById('filtroArea').value;

  const resultado = todosMusicos.filter(m => {
    const nomeExibir = (m.nomeArtistico || m.nome).toLowerCase();
    if (busca && !nomeExibir.includes(busca) && !m.nome.toLowerCase().includes(busca)) return false;
    if (cidade && m.cidade !== cidade) return false;
    if (instrumento && !m.instrumentos.includes(instrumento)) return false;
    if (genero && !m.generos.includes(genero)) return false;
    if (disponibilidade && !m.disponibilidade.includes(disponibilidade)) return false;
    if (area && m.area !== area) return false;
    return true;
  });

  renderizar(resultado);
}

/**
 * Recebe um array de músicos e gera os cards no DOM dinamicamente.
 * @param {Array} lista
 */
export function renderizar(lista) {
  const grid = document.getElementById('musiciansGrid');
  const empty = document.getElementById('emptyState');
  const totalCount = document.getElementById('totalCount');

  // Limpa o grid antes de renderizar
  grid.innerHTML = '';

  if (lista.length === 0) {
    empty.style.display = 'block';
    if (totalCount) totalCount.textContent = '0 músicos disponíveis';
    return;
  }

  empty.style.display = 'none';
  if (totalCount) {
    totalCount.textContent = `${lista.length} músico${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}`;
  }

  // Gera cada card dinamicamente a partir dos dados do JSON
  lista.forEach((musico, i) => {
    const card = criarCard(musico);
    card.style.animationDelay = `${0.1 + i * 0.05}s`;
    grid.appendChild(card);
  });
}

/**
 * Cria e retorna um elemento de card para um músico.
 * @param {Object} musico
 * @returns {HTMLElement}
 */
function criarCard(musico) {
  const nomeExibir = musico.nomeArtistico || musico.nome;
  const tags = [...musico.instrumentos, ...musico.generos].slice(0, 5);

  const tagsHTML = tags.map(t =>
    `<span class="tag"><i class="fas fa-music"></i> ${t}</span>`
  ).join('');

  const card = document.createElement('div');
  card.className = 'musician-card';
  card.innerHTML = `
    <div class="musician-photo">${musico.iniciais}</div>
    <div class="musician-info">
      <h3 class="musician-name">${nomeExibir}</h3>
      <p class="musician-location">
        <i class="fas fa-map-marker-alt"></i>
        ${musico.cidade}, ${musico.estado}
      </p>
      ${musico.bio ? `<p class="musician-bio">${musico.bio}</p>` : ''}
      <div class="musician-tags">${tagsHTML}</div>
      <button class="view-profile-btn">Ver Perfil Completo</button>
    </div>
  `;
  return card;
}
