const BASE_URL = '/api/usuarios';

export async function fetchMusicos() {
  const response = await fetch(BASE_URL);
  const usuarios = await response.json();
  return usuarios;
}

export async function fetchDados() {
  const response = await fetch('../data/dados.json');
  const dados = await response.json();
  return dados;
}