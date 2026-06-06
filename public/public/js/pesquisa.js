import { fetchMusicos } from './dados.js';

function criarCard(musico) {
  const nomeExibir = musico.nome_artistico || musico.nome_completo;
  const iniciais = nomeExibir.substring(0, 2).toUpperCase();

  const card = document.createElement('div');
  card.className = 'musician-card';
  card.innerHTML = `
    <div class="musician-photo">${iniciais}</div>
    <div class="musician-info">
      <h3 class="musician-name">${nomeExibir}</h3>
      <p class="musician-location">
        <i class="fas fa-map-marker-alt"></i>
        ${musico.cidade || ''}, ${musico.estado || ''}
      </p>
      ${musico.biografia ? `<p class="musician-bio">${musico.biografia}</p>` : ''}
      <div class="musician-tags"></div>
      <button class="view-profile-btn">Ver Perfil Completo</button>
    </div>
  `;
  return card;
}

async function renderizarMusicos(lista) {
  const container = document.querySelector('.musicians-grid');
  if (!container) return;

  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p class="sem-resultados">Nenhum músico encontrado.</p>';
    return;
  }

  lista.forEach(musico => container.appendChild(criarCard(musico)));
}

async function init() {
  try {
    const musicos = await fetchMusicos();
    await renderizarMusicos(musicos);

    const inputBusca = document.querySelector('#busca');
    if (inputBusca) {
      inputBusca.addEventListener('input', () => {
        const termo = inputBusca.value.toLowerCase();
        const filtrados = musicos.filter(m =>
          (m.nome_completo || '').toLowerCase().includes(termo) ||
          (m.nome_artistico || '').toLowerCase().includes(termo)
        );
        renderizarMusicos(filtrados);
      });
    }
  } catch (erro) {
    console.error('Erro ao carregar músicos:', erro);
    const container = document.querySelector('.musicians-grid');
    if (container) container.innerHTML = '<p>Erro ao conectar com a API</p>';
  }
}

init();