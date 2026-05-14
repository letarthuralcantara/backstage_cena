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