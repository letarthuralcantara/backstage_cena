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

function criarOverlayClube(buscar, placeholder) {
  const dialog = document.createElement("dialog");
  dialog.className = "search-overlay-dialog";
  dialog.innerHTML = `
    <div class="search-overlay-header">
      <h2>Buscar neste clube</h2>
      <button type="button" class="search-overlay-close" aria-label="Fechar busca"><i class="fas fa-times"></i></button>
    </div>
    <form class="search-overlay-form">
      <input type="search" class="search-overlay-input" aria-label="Termo de busca">
      <button type="submit" class="header-search-btn">Buscar</button>
    </form>
    <div class="search-overlay-results" aria-live="polite"></div>`;
  document.body.appendChild(dialog);

  const input = dialog.querySelector(".search-overlay-input");
  const form = dialog.querySelector(".search-overlay-form");
  const results = dialog.querySelector(".search-overlay-results");
  input.placeholder = placeholder;
  dialog.querySelector(".search-overlay-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  function adicionarSecao(titulo, itens) {
    const secao = document.createElement("section");
    secao.className = "search-overlay-section";
    const heading = document.createElement("h3");
    heading.textContent = titulo;
    secao.appendChild(heading);
    if (!itens.length) {
      const vazio = document.createElement("p");
      vazio.className = "search-overlay-empty";
      vazio.textContent = "Nenhum resultado.";
      secao.appendChild(vazio);
      results.appendChild(secao);
      return;
    }
    itens.forEach((item) => secao.appendChild(item));
    results.appendChild(secao);
  }

  function resultadoMembro(membro) {
    const link = document.createElement("a");
    link.className = "search-overlay-result";
    link.href = `perfil.html?id=${encodeURIComponent(membro.id_usuario)}`;
    if (membro.foto) {
      const img = document.createElement("img");
      img.src = membro.foto;
      img.alt = "";
      link.appendChild(img);
    } else {
      const icon = document.createElement("i");
      icon.className = "fas fa-user";
      icon.setAttribute("aria-hidden", "true");
      link.appendChild(icon);
    }
    const nome = document.createElement("span");
    nome.textContent = membro.nome;
    link.appendChild(nome);
    return link;
  }

  function resultadoMensagem(mensagem) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "search-overlay-result search-overlay-message";
    const autor = document.createElement("strong");
    autor.textContent = mensagem.autor.nome;
    const texto = document.createElement("span");
    texto.textContent = mensagem.texto;
    botao.append(autor, texto);
    botao.addEventListener("click", () => {
      const id = Number(mensagem.id_mensagem);
      const alvo = document.querySelector(`.msg[data-mensagem-id="${id}"]`);
      if (alvo) {
        dialog.close();
        alvo.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    return botao;
  }

  let timerBusca;
  let buscaAtual = 0;
  async function executarBusca() {
    const termo = input.value.trim();
    const chamada = ++buscaAtual;
    results.replaceChildren();
    if (!termo) return;

    const carregando = document.createElement("p");
    carregando.className = "search-overlay-empty";
    carregando.textContent = "Buscando...";
    results.appendChild(carregando);
    try {
      const dados = await buscar(termo);
      if (chamada !== buscaAtual) return;
      results.replaceChildren();
      adicionarSecao("Membros", (dados.membros || []).map(resultadoMembro));
      adicionarSecao("Mensagens", (dados.mensagens || []).map(resultadoMensagem));
    } catch (error) {
      if (chamada !== buscaAtual) return;
      results.replaceChildren();
      const erro = document.createElement("p");
      erro.className = "search-overlay-empty";
      erro.textContent = error.message || "Não foi possível buscar neste clube.";
      results.appendChild(erro);
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(executarBusca, 300);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(timerBusca);
    executarBusca();
  });

  return {
    abrir(event) {
      event?.preventDefault();
      if (!dialog.open) dialog.showModal();
      input.focus();
    },
  };
}

export function initSearchOverlay(opcoes = {}) {
  if (opcoes.escopo === "clube" && typeof opcoes.buscar === "function") {
    const overlay = criarOverlayClube(
      opcoes.buscar,
      opcoes.placeholder || "Buscar neste clube...",
    );
    document.getElementById("searchBar")?.addEventListener("click", overlay.abrir);
    document.getElementById("tabBarBuscar")?.addEventListener("click", overlay.abrir);
    return;
  }

  if (opcoes.escopo === "clubes" || opcoes.escopo === "busca") {
    document.getElementById("tabBarBuscar")?.addEventListener("click", irParaBusca);
    return;
  }

  document.getElementById("searchBar")?.addEventListener("click", irParaBusca);
  document.getElementById("tabBarBuscar")?.addEventListener("click", irParaBusca);
}
