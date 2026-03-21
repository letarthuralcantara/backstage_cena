// js/dados.js
// Módulo responsável por buscar os dados dos arquivos JSON externos.
// Exporta funções que as outras páginas importam para não duplicar lógica.

/**
 * Busca os dados estáticos do sistema (instrumentos, gêneros, DAWs, etc.)
 * @returns {Promise<Object>} objeto com instrumentos, generos, daws, disponibilidade, areas
 */
export async function fetchDados() {
  const response = await fetch('../data/dados.json');
  const dados = await response.json();
  return dados;
}

/**
 * Busca a lista de músicos cadastrados
 * @returns {Promise<Array>} array de objetos músico
 */
export async function fetchMusicos() {
  const response = await fetch('../data/musicos.json');
  const musicos = await response.json();
  return musicos;
}
