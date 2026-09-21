/**
 * search-overlay.js — leva pra tela de busca (pesquisar_usuarios.html)
 * já com o termo digitado na URL, no estilo "netflix.com/search?q=...":
 * é uma navegação real (então funciona com voltar/avançar do navegador
 * e dá pra compartilhar o link), mas some da caixinha do header e some
 * a página inteira de resultados, com filtros de verdade — não um
 * modal por cima com uma listinha curta.
 *
 * Uso: import { initSearchOverlay } from './search-overlay.js';
 *      initSearchOverlay(); // liga o clique de #searchBar e do item
 *                            // "Buscar" da tab-bar em qualquer página
 */

function irParaBusca() {
  window.location.href = "pesquisar_usuarios.html?focar=true";
}

export function initSearchOverlay() {
  document.getElementById("searchBar")?.addEventListener("click", irParaBusca);
  document
    .getElementById("tabBarBuscar")
    ?.addEventListener("click", irParaBusca);
}
