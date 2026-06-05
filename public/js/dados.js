const BASE_URL = '/api/usuarios';

export async function fetchMusicos() {
  const response = await fetch(BASE_URL);
  return response.json();
}

export async function fetchDados() {
  const [instrumentos, generos, daws, disponibilidades, areas] = await Promise.all([
    fetch(`${BASE_URL}/instrumentos`).then(r => r.json()),
    fetch(`${BASE_URL}/generos`).then(r => r.json()),
    fetch(`${BASE_URL}/daws`).then(r => r.json()),
    fetch(`${BASE_URL}/disponibilidades`).then(r => r.json()),
    fetch(`${BASE_URL}/areas`).then(r => r.json()),
  ]);
  return {
    instrumentos: instrumentos.map((nome, i) => ({ id: nome, nome })),
    generos: generos.map((nome, i) => ({ id: nome, nome })),
    daws,
    disponibilidade: disponibilidades.map(d => ({ id: d, label: d, icon: 'fa-clock' })),
    areas: areas.map(a => ({ id: a, icon: iconeArea(a) })),
  };
}

function iconeArea(area) {
  const icons = {
    'Vocalista': 'fa-microphone',
    'Instrumentista': 'fa-guitar',
    'Produtor': 'fa-sliders',
    'Compositor': 'fa-pen-nib',
    'DJ': 'fa-headphones',
    'Beatmaker': 'fa-drum',
  };
  return icons[area] || 'fa-music';
}