import { verificarAutenticacao, fazerLogout } from './auth.js';

export async function iniciarPerfil() {
  // Verifica se tem ?id= na URL (visualizando perfil de outro usuário)
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');

  let u;
  if (idParam) {
    const res = await fetch(`/api/usuarios/${idParam}`);
    u = await res.json();
  } else {
    const usuarioLocal = verificarAutenticacao();
    if (!usuarioLocal) return;
    const res = await fetch(`/api/usuarios/${usuarioLocal.id_usuario}`);
    u = await res.json();
  }

  const nome = u.nome_artistico || u.nome_completo;
  const iniciais = nome.substring(0, 2).toUpperCase();

  document.getElementById('avatar').textContent = iniciais;
  document.getElementById('nomeExibir').textContent = nome;
  document.getElementById('emailExibir').textContent = u.email;
  document.getElementById('localExibir').textContent = `${u.cidade || ''}, ${u.estado || ''}`;
  document.getElementById('bioExibir').textContent = u.biografia || 'Sem descrição ainda.';

  const profileTrigger = document.getElementById('profileTrigger');
  if (profileTrigger) profileTrigger.textContent = iniciais;

  if (u.area_atuacao) {
    const badge = document.getElementById('areaBadge');
    badge.textContent = u.area_atuacao;
    badge.classList.remove('hidden');
  }

  if (u.telefone) {
    document.getElementById('telefoneExibir').textContent = u.telefone;
    document.getElementById('telefoneRow').classList.remove('hidden');
  }

  if (u.bairro) {
    document.getElementById('bairroExibir').textContent = u.bairro;
    document.getElementById('bairroRow').classList.remove('hidden');
  }

  if (u.anos_experiencia) {
    document.getElementById('expExibir').textContent = `${u.anos_experiencia} anos de experiência`;
    document.getElementById('expRow').classList.remove('hidden');
  }

  if (u.disponibilidades?.length) {
    const dispSection = document.getElementById('dispSection');
    const dispTags = document.getElementById('dispTags');
    dispSection.classList.remove('hidden');
    dispTags.innerHTML = u.disponibilidades.map(d =>
      `<span class="disp-tag"><i class="fas fa-clock"></i>${d}</span>`
    ).join('');
  }

  const talentosCont = document.getElementById('talentosCont');
  if (u.instrumentos?.length) {
    talentosCont.innerHTML = `<div class="tags-grid">${u.instrumentos.map(i =>
      `<span class="tag"><i class="fas fa-guitar"></i>${i}</span>`
    ).join('')}</div>`;
  } else {
    talentosCont.innerHTML = '<p class="empty-state">Nenhum instrumento cadastrado.</p>';
  }

  const generosCont = document.getElementById('generosCont');
  if (u.generos?.length) {
    generosCont.innerHTML = `<div class="tags-grid">${u.generos.map(g =>
      `<span class="tag">${g}</span>`
    ).join('')}</div>`;
  } else {
    generosCont.innerHTML = '<p class="empty-state">Nenhum gênero cadastrado.</p>';
  }

  // Dropdown e logout
  document.getElementById('profileDropdown')?.addEventListener('click', () => {
    document.getElementById('profileDropdown').classList.toggle('active');
  });

  document.getElementById('btnSair')?.addEventListener('click', fazerLogout);
}