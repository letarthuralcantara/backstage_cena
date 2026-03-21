// js/perfil.js
// Módulo da página de perfil.
// Importa dados do auth e dos JSONs, e renderiza os elementos dinamicamente.

import { getUsuarioLogado, fazerLogout } from './auth.js';
import { fetchDados } from './dados.js';

/**
 * Inicializa a página de perfil:
 * busca os dados, pega o usuário logado e popula o HTML dinamicamente.
 */
export async function iniciarPerfil() {
  const usuario = getUsuarioLogado() || {
    nome_completo: 'Arthur Souza',
    nome_artistico: 'Arthurz',
    email: 'arthur@email.com',
    cidade: 'João Pessoa',
    estado: 'PB',
    telefone: '(83) 99999-9999',
    bairro: 'Tambaú',
    anos_experiencia: '3',
    biografia: 'Músico independente apaixonado por rock e MPB.',
    areas_atuacao: ['Instrumentista', 'Compositor'],
    instrumentos: ['2', '3'],
    generos: ['1', '3', '16'],
    disponibilidade: ['manha', 'noite']
  };

  // Busca os mapas de nomes do JSON
  const dados = await fetchDados();

  // Monta mapa id -> nome para instrumentos e gêneros
  const mapaInstrumentos = {};
  dados.instrumentos.forEach(i => { mapaInstrumentos[i.id] = i.nome; });

  const mapaGeneros = {};
  dados.generos.forEach(g => { mapaGeneros[g.id] = g.nome; });

  const mapaDisp = {};
  dados.disponibilidade.forEach(d => { mapaDisp[d.id] = d; });

  // Nome e iniciais
  const nomeExibir = usuario.nome_artistico || usuario.nome_completo || '';
  const iniciais = nomeExibir.substring(0, 2).toUpperCase();

  setTexto('avatar', iniciais);
  setTexto('profileTrigger', iniciais);
  setTexto('nomeExibir', nomeExibir);
  setTexto('emailExibir', usuario.email || '');

  // Localização
  const local = [usuario.cidade, usuario.estado].filter(Boolean).join(', ');
  setTexto('localExibir', local);

  // Telefone
  if (usuario.telefone) {
    setTexto('telefoneExibir', usuario.telefone);
    mostrar('telefoneRow');
  }

  // Bairro
  if (usuario.bairro) {
    setTexto('bairroExibir', usuario.bairro);
    mostrar('bairroRow');
  }

  // Experiência
  if (usuario.anos_experiencia) {
    setTexto('expExibir', usuario.anos_experiencia + ' anos de experiência');
    mostrar('expRow');
  }

  // Área de atuação
  const areas = normalizar(usuario.areas_atuacao || usuario['areas_atuacao[]']);
  if (areas.length > 0) {
    const badge = document.getElementById('areaBadge');
    badge.textContent = areas.join(', ');
    badge.classList.remove('hidden');
  }

  // Disponibilidade — gerada dinamicamente com dados do JSON
  const dispSelecionada = normalizar(usuario.disponibilidade || usuario['disponibilidade[]']);
  if (dispSelecionada.length > 0) {
    const dispTags = document.getElementById('dispTags');
    dispSelecionada.forEach(d => {
      const info = mapaDisp[d];
      if (!info) return;
      const div = document.createElement('div');
      div.className = 'disp-tag';
      div.innerHTML = `<i class="fas ${info.icon}"></i><span>${info.label}</span>`;
      dispTags.appendChild(div);
    });
    mostrar('dispSection');
  }

  // Biografia
  const bio = document.getElementById('bioExibir');
  if (usuario.biografia) {
    bio.textContent = usuario.biografia;
  } else {
    bio.classList.add('empty-state');
    bio.textContent = 'Nenhuma descrição adicionada.';
  }

  // Talentos — gerados dinamicamente a partir dos IDs e do mapa do JSON
  const instArr = normalizar(usuario.instrumentos || usuario['instrumentos[]']);
  const talentosCont = document.getElementById('talentosCont');

  if (instArr.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'tags-grid';
    instArr.forEach(id => {
      const nome = mapaInstrumentos[id] || id;
      const div = document.createElement('div');
      div.className = 'tag';
      div.innerHTML = `<i class="fas fa-music"></i><span>${nome}</span>`;
      grid.appendChild(div);
    });
    talentosCont.appendChild(grid);
  } else {
    talentosCont.innerHTML = '<p class="empty-state">Nenhum talento cadastrado</p>';
  }

  // Gêneros — gerados dinamicamente a partir dos IDs e do mapa do JSON
  const genArr = normalizar(usuario.generos || usuario['generos[]']);
  const generosCont = document.getElementById('generosCont');

  if (genArr.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'tags-grid';
    genArr.forEach(id => {
      const nome = mapaGeneros[id] || id;
      const div = document.createElement('div');
      div.className = 'tag';
      div.innerHTML = `<i class="fas fa-music"></i><span>${nome}</span>`;
      grid.appendChild(div);
    });
    generosCont.appendChild(grid);
  } else {
    generosCont.innerHTML = '<p class="empty-state">Nenhum gênero cadastrado</p>';
  }

  // Evento do dropdown
  document.getElementById('profileTrigger').addEventListener('click', () => {
    document.getElementById('profileDropdown').classList.toggle('active');
  });

  // Fecha dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Evento de logout
  document.getElementById('btnSair').addEventListener('click', () => {
    fazerLogout();
    window.location.href = 'login.html';
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function mostrar(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

/** Garante que o valor seja sempre um array */
function normalizar(valor) {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}
