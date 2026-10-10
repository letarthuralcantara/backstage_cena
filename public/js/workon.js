import { authHeaders, fazerLogout } from "./auth.js";

const STATUS = ["ideia", "producao", "mixagem", "finalizado", "lancado"];
const STATUS_LABEL = {
  ideia: "Ideia",
  producao: "Produção",
  mixagem: "Mixagem",
  finalizado: "Finalizado",
  lancado: "Lançado",
};

function escaparHtml(valor) {
  const elemento = document.createElement("span");
  elemento.textContent = valor ?? "";
  return elemento.innerHTML;
}

async function chamar(url, { method = "GET", body } = {}) {
  const formulario = typeof FormData !== "undefined" && body instanceof FormData;
  const resposta = await fetch(url, {
    method,
    headers: authHeaders({}, body !== undefined && !formulario),
    body: body === undefined ? undefined : formulario ? body : JSON.stringify(body),
  });
  if (resposta.status === 401) {
    fazerLogout();
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  if (!resposta.ok) {
    let dados = {};
    try {
      dados = await resposta.json();
    } catch {
      dados = {};
    }
    throw new Error(dados.erro || "Não foi possível concluir esta ação.");
  }
  return resposta.status === 204 ? null : resposta.json();
}

function cardWorkOn(projeto) {
  const card = document.createElement("a");
  card.className = "workon-card";
  card.href = `workon.html?id=${encodeURIComponent(projeto.id_workon)}`;
  const imagem = projeto.capa
    ? `<img src="${escaparHtml(projeto.capa)}" alt="" loading="lazy">`
    : `<span class="workon-card-placeholder"><i class="fas fa-music"></i></span>`;
  card.innerHTML = `
    ${imagem}
    <span class="workon-card-info">
      <strong>${escaparHtml(projeto.titulo)}</strong>
      <span>${escaparHtml(projeto.tipo)} · ${escaparHtml(STATUS_LABEL[projeto.status] || projeto.status)}</span>
      <span>${escaparHtml(projeto.dono?.nome || "Projeto")}${projeto.papel ? ` · ${escaparHtml(projeto.papel)}` : ""}</span>
    </span>`;
  return card;
}

export async function renderizarWorkOnsDoUsuario(idUsuario, container) {
  if (!container) return [];
  container.innerHTML = '<p class="workon-empty">Carregando Work Ons...</p>';
  try {
    const projetos = await chamar(`/api/workons/usuario/${encodeURIComponent(idUsuario)}`);
    container.replaceChildren();
    if (!projetos.length) {
      container.innerHTML = '<p class="workon-empty">Nenhum Work On público por aqui ainda.</p>';
      return [];
    }
    projetos.forEach((projeto) => container.appendChild(cardWorkOn(projeto)));
    return projetos;
  } catch (erro) {
    container.innerHTML = `<p class="workon-empty">${escaparHtml(erro.message)}</p>`;
    return [];
  }
}

function mostrarErro(elemento, erro) {
  if (elemento) elemento.textContent = erro.message || "Não foi possível carregar os Work Ons.";
}

function renderizarQuadro(projetos, container) {
  container.replaceChildren();
  for (const status of STATUS) {
    const coluna = document.createElement("section");
    coluna.className = "workon-board-column";
    coluna.innerHTML = `<h3>${STATUS_LABEL[status]} <span>${projetos.filter((p) => p.status === status).length}</span></h3>`;
    projetos.filter((projeto) => projeto.status === status).forEach((projeto) => {
      coluna.appendChild(cardWorkOn(projeto));
    });
    container.appendChild(coluna);
  }
}

export async function iniciarBibliotecaWorkOn() {
  const grid = document.getElementById("workonGrid");
  const erro = document.getElementById("workonErro");
  const tabs = [...document.querySelectorAll("[data-workon-tab]")];
  const botoesVisualizacao = [...document.querySelectorAll("[data-workon-view]")];
  if (!grid) return;

  let abaAtual = "meus";
  let visualizacao = "galeria";
  let meus = [];
  let exploracao = [];

  async function carregar() {
    erro.textContent = "";
    grid.innerHTML = '<p class="workon-empty">Carregando projetos...</p>';
    try {
      if (abaAtual === "explorar") {
        exploracao = await chamar("/api/workons?limite=50");
      } else if (!meus.length) {
        meus = await chamar("/api/workons/meus");
      }
      const projetos = abaAtual === "explorar"
        ? exploracao
        : meus.filter((projeto) => abaAtual === "meus" ? projeto.eh_dono : !projeto.eh_dono);
      if (visualizacao === "quadro") {
        grid.className = "workon-board";
        renderizarQuadro(projetos, grid);
      } else {
        grid.className = `workon-grid ${visualizacao === "lista" ? "is-list" : ""}`;
        grid.replaceChildren();
        if (!projetos.length) {
          grid.innerHTML = `<p class="workon-empty">${abaAtual === "explorar" ? "Nenhum projeto público encontrado." : "Nenhum projeto nesta aba ainda."}</p>`;
        } else {
          projetos.forEach((projeto) => grid.appendChild(cardWorkOn(projeto)));
        }
      }
    } catch (error) {
      mostrarErro(erro, error);
      grid.replaceChildren();
    }
  }

  tabs.forEach((botao) => botao.addEventListener("click", () => {
    abaAtual = botao.dataset.workonTab;
    tabs.forEach((item) => {
      const ativo = item === botao;
      item.classList.toggle("active", ativo);
      item.setAttribute("aria-selected", String(ativo));
    });
    carregar();
  }));
  botoesVisualizacao.forEach((botao) => botao.addEventListener("click", () => {
    visualizacao = botao.dataset.workonView;
    botoesVisualizacao.forEach((item) => {
      const ativo = item === botao;
      item.classList.toggle("active", ativo);
      item.setAttribute("aria-pressed", String(ativo));
    });
    carregar();
  }));
  document.getElementById("criarWorkOn")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const dados = Object.fromEntries(new FormData(form));
    try {
      await chamar("/api/workons", { method: "POST", body: dados });
      form.reset();
      meus = [];
      abaAtual = "meus";
      tabs.find((botao) => botao.dataset.workonTab === "meus")?.click();
    } catch (error) {
      mostrarErro(erro, error);
    }
  });
  await carregar();
}

function criarTarefa(tarefa, podeEditar, idWorkOn) {
  const item = document.createElement("label");
  item.className = "workon-task";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = Boolean(tarefa.feita);
  check.disabled = !podeEditar;
  check.addEventListener("change", async () => {
    try {
      await chamar(`/api/workons/${idWorkOn}/tarefas/${tarefa.id_tarefa}`, {
        method: "PATCH",
        body: { feita: check.checked },
      });
    } catch (error) {
      check.checked = !check.checked;
      window.alert(error.message);
    }
  });
  const texto = document.createElement("span");
  texto.textContent = tarefa.texto;
  item.append(check, texto);
  return item;
}

function renderizarFaixas(projeto, container, erro) {
  container.replaceChildren();
  if (!projeto.faixas?.length) {
    container.innerHTML = '<p class="workon-empty">Adicione a primeira faixa para organizar as versões.</p>';
    return;
  }
  projeto.faixas.forEach((faixa) => {
    const card = document.createElement("article");
    card.className = "workon-track";
    const versoes = document.createElement("div");
    versoes.className = "workon-versions";
    versoes.innerHTML = `<h4>${escaparHtml(faixa.titulo)}${faixa.bpm ? ` <small>${faixa.bpm} BPM</small>` : ""}</h4>`;
    (faixa.versoes || []).forEach((versao) => {
      const bloco = document.createElement("div");
      bloco.className = "workon-version";
      bloco.innerHTML = `<span>${escaparHtml(versao.rotulo || `Versão ${versao.numero}`)}</span><audio controls preload="none"></audio>`;
      bloco.querySelector("audio").addEventListener("play", async (event) => {
        const player = event.currentTarget;
        if (player.src) return;
        try {
          const url = await chamar(`/api/workons/${projeto.id_workon}/versoes/${versao.id_versao}/url`);
          player.src = url.url;
          await player.play();
        } catch (error) {
          player.pause();
          mostrarErro(erro, error);
        }
      }, { once: true });
      versoes.appendChild(bloco);
    });
    if (projeto.pode_editar) {
      const form = document.createElement("form");
      form.className = "workon-upload";
      form.innerHTML = '<label>Nova versão <input type="file" name="audio" accept="audio/*" required></label><button type="submit">Enviar</button>';
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const dados = new FormData();
        dados.append("audio", form.elements.audio.files[0]);
        try {
          await chamar(`/api/workons/${projeto.id_workon}/faixas/${faixa.id_faixa}/versoes`, { method: "POST", body: dados });
          window.location.reload();
        } catch (error) {
          mostrarErro(erro, error);
        }
      });
      versoes.appendChild(form);
    }
    card.appendChild(versoes);
    container.appendChild(card);
  });
}

export async function iniciarPaginaWorkOn() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const erro = document.getElementById("workonErro");
  if (!id) {
    mostrarErro(erro, new Error("Projeto não informado."));
    return;
  }
  try {
    const projeto = await chamar(`/api/workons/${encodeURIComponent(id)}`);
    document.title = `Backstage | ${projeto.titulo}`;
    document.getElementById("workonTitulo").textContent = projeto.titulo;
    document.getElementById("workonDescricao").textContent = projeto.descricao || "Sem descrição.";
    document.getElementById("workonTipo").textContent = projeto.tipo;
    document.getElementById("workonStatus").textContent = STATUS_LABEL[projeto.status] || projeto.status;
    document.getElementById("workonDaw").textContent = projeto.daw || "Não definida";
    document.getElementById("workonGenero").textContent = projeto.genero || "Não definido";
    document.getElementById("workonPrazo").textContent = projeto.prazo ? new Date(projeto.prazo).toLocaleDateString("pt-BR") : "Sem prazo";
    document.getElementById("workonNotas").value = projeto.notas || "";
    document.getElementById("workonNotas").readOnly = !projeto.pode_editar;
    const capa = document.getElementById("workonCapa");
    if (projeto.capa) capa.style.backgroundImage = `linear-gradient(0deg, rgba(0,0,0,.65), transparent), url("${encodeURI(projeto.capa)}")`;
    document.getElementById("workonSemDetalhes").hidden = Boolean(projeto.faixas);
    const editorOnly = [...document.querySelectorAll("[data-editor-only]")];
    editorOnly.forEach((elemento) => { elemento.hidden = !projeto.pode_editar; });
    document.getElementById("workonNotasPanel").hidden = !projeto.faixas;
    document.getElementById("workonFaixas").hidden = !projeto.faixas;
    document.getElementById("workonChecklist").hidden = !projeto.tarefas;
    document.getElementById("workonGaleria").hidden = !projeto.fotos;

    const colaboradores = document.getElementById("workonMembros");
    if (projeto.membros) {
      colaboradores.replaceChildren();
      projeto.membros.forEach((membro) => {
        const item = document.createElement("span");
        item.className = "workon-member";
        item.textContent = `${membro.usuario.nome} · ${membro.papel}`;
        colaboradores.appendChild(item);
      });
    }
    renderizarFaixas(projeto, document.getElementById("workonFaixasLista"), erro);

    const tarefas = document.getElementById("workonTarefas");
    if (projeto.tarefas) {
      tarefas.replaceChildren();
      projeto.tarefas.forEach((tarefa) => tarefas.appendChild(criarTarefa(tarefa, projeto.pode_editar, projeto.id_workon)));
    }
    document.getElementById("criarTarefa")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.texto;
      try {
        await chamar(`/api/workons/${projeto.id_workon}/tarefas`, { method: "POST", body: { texto: input.value } });
        window.location.reload();
      } catch (error) {
        mostrarErro(erro, error);
      }
    });
    document.getElementById("criarFaixa")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.titulo;
      try {
        await chamar(`/api/workons/${projeto.id_workon}/faixas`, { method: "POST", body: { titulo: input.value } });
        window.location.reload();
      } catch (error) {
        mostrarErro(erro, error);
      }
    });
    document.getElementById("salvarNotas")?.addEventListener("click", async () => {
      try {
        await chamar(`/api/workons/${projeto.id_workon}`, { method: "PATCH", body: { notas: document.getElementById("workonNotas").value } });
        erro.textContent = "Notas salvas.";
      } catch (error) {
        mostrarErro(erro, error);
      }
    });
    document.getElementById("workonFotos").replaceChildren();
    (projeto.fotos || []).forEach((foto) => {
      const figure = document.createElement("figure");
      figure.innerHTML = `<img src="${escaparHtml(foto.caminho)}" alt="${escaparHtml(foto.legenda || "Foto do projeto")}" loading="lazy"><figcaption>${escaparHtml(foto.legenda || "")}</figcaption>`;
      document.getElementById("workonFotos").appendChild(figure);
    });
    document.getElementById("adicionarFoto")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formulario = new FormData(event.currentTarget);
      try {
        await chamar(`/api/workons/${projeto.id_workon}/fotos`, { method: "POST", body: formulario });
        window.location.reload();
      } catch (error) {
        mostrarErro(erro, error);
      }
    });
    document.getElementById("atualizarCapa")?.addEventListener("change", async (event) => {
      const arquivo = event.currentTarget.files[0];
      if (!arquivo) return;
      const formulario = new FormData();
      formulario.append("image", arquivo);
      try {
        await chamar(`/api/workons/${projeto.id_workon}/capa`, { method: "PUT", body: formulario });
        window.location.reload();
      } catch (error) {
        mostrarErro(erro, error);
      }
    });
  } catch (error) {
    mostrarErro(erro, error);
  }
}
