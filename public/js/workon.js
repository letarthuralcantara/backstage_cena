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
    try { dados = await resposta.json(); } catch { dados = {}; }
    throw new Error(dados.erro || "Não foi possível concluir esta ação.");
  }
  return resposta.status === 204 ? null : resposta.json();
}

function formatoProjeto(projeto) {
  return `${projeto.tipo || "Projeto"} · ${STATUS_LABEL[projeto.status] || projeto.status || "Em andamento"}`;
}

function cardWorkOn(projeto) {
  const card = document.createElement("a");
  card.className = "workon-card";
  card.href = `workon.html?id=${encodeURIComponent(projeto.id_workon)}`;
  const imagem = projeto.capa
    ? `<img src="${escaparHtml(projeto.capa)}" alt="" loading="lazy">`
    : `<span class="workon-card-placeholder"><i class="fas fa-music"></i></span>`;
  card.innerHTML = `
    <span class="workon-card-cover">${imagem}<span class="workon-card-open"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></span></span>
    <span class="workon-card-info">
      <strong>${escaparHtml(projeto.titulo)}</strong>
      <span>${escaparHtml(formatoProjeto(projeto))}</span>
      <span>${escaparHtml(projeto.dono?.nome || "Projeto")}${projeto.papel ? ` · ${escaparHtml(projeto.papel)}` : ""}</span>
    </span>`;
  return card;
}

function adicionarAtalhoCriarWorkOn(container, podeCriar) {
  if (!podeCriar) return;
  const atalho = document.createElement("a");
  atalho.className = "profile-workon-create";
  atalho.href = "workons.html#criarWorkOn";
  atalho.setAttribute("aria-label", "Criar um Work On");
  atalho.innerHTML = '<span class="profile-workon-create-icon">+</span><span>Criar Work On</span>';
  container.appendChild(atalho);
}

export async function renderizarWorkOnsDoUsuario(idUsuario, container, podeCriar = false) {
  if (!container) return [];
  container.innerHTML = '<p class="workon-empty">Carregando Work Ons...</p>';
  try {
    const projetos = await chamar(`/api/workons/usuario/${encodeURIComponent(idUsuario)}`);
    container.replaceChildren();
    if (!projetos.length) {
      container.innerHTML = '<p class="workon-empty">Nenhum Work On público por aqui ainda.</p>';
      adicionarAtalhoCriarWorkOn(container, podeCriar);
      return [];
    }
    projetos.forEach((projeto) => container.appendChild(cardWorkOn(projeto)));
    adicionarAtalhoCriarWorkOn(container, podeCriar);
    return projetos;
  } catch (erro) {
    container.innerHTML = `<p class="workon-empty">${escaparHtml(erro.message)}</p>`;
    adicionarAtalhoCriarWorkOn(container, podeCriar);
    return [];
  }
}

function mostrarErro(elemento, erro) {
  if (elemento) elemento.textContent = erro.message || "Não foi possível carregar os Work Ons.";
}

function preencherMetadados(formulario, projeto) {
  Object.entries({ titulo: projeto.titulo || "", descricao: projeto.descricao || "", tipo: projeto.tipo || "outro", status: projeto.status || "ideia", visibilidade: projeto.visibilidade || "link", daw: projeto.daw || "", genero: projeto.genero || "", prazo: projeto.prazo ? String(projeto.prazo).slice(0, 10) : "", notas: projeto.notas || "" }).forEach(([campo, valor]) => {
    const elemento = formulario.elements.namedItem(campo);
    if (elemento) elemento.value = valor;
  });
}

function configurarEdicaoMetadados(projeto, erro) {
  const dialog = document.getElementById("dialogMetadados");
  const formulario = document.getElementById("formMetadados");
  const menu = document.getElementById("menuProjeto");
  const abrirMenu = document.getElementById("abrirMenuProjeto");
  if (!dialog || !formulario || !menu || !abrirMenu) return;
  abrirMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
    abrirMenu.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && event.target !== abrirMenu) {
      menu.hidden = true;
      abrirMenu.setAttribute("aria-expanded", "false");
    }
  });
  document.getElementById("editarMetadados")?.addEventListener("click", () => {
    if (!projeto.pode_editar) return mostrarErro(erro, new Error("Você não pode editar este projeto."));
    preencherMetadados(formulario, projeto);
    menu.hidden = true;
    dialog.showModal();
  });
  document.getElementById("duplicarProjeto")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(window.location.href); erro.textContent = "Link do projeto copiado."; menu.hidden = true; }
    catch { mostrarErro(erro, new Error("Não foi possível copiar o link.")); }
  });
  formulario.addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "save") return;
    event.preventDefault();
    const botao = event.submitter;
    botao.disabled = true;
    document.getElementById("erroMetadados").textContent = "";
    const dados = Object.fromEntries(new FormData(formulario));
    if (!dados.prazo) dados.prazo = null;
    try {
      const atualizado = await chamar(`/api/workons/${projeto.id_workon}`, { method: "PATCH", body: dados });
      Object.assign(projeto, atualizado);
      atualizarCabecalhoWorkOn(projeto);
      dialog.close();
      erro.textContent = "Informações do projeto atualizadas.";
    } catch (error) { document.getElementById("erroMetadados").textContent = error.message; }
    finally { botao.disabled = false; }
  });
}

function atualizarCabecalhoWorkOn(projeto) {
  document.getElementById("workonTitulo").textContent = projeto.titulo;
  document.getElementById("workonDescricao").textContent = projeto.descricao || "Sem descrição.";
  document.getElementById("workonTipoBadge").textContent = projeto.tipo || "Projeto";
  document.getElementById("workonStatus").textContent = STATUS_LABEL[projeto.status] || projeto.status;
  document.getElementById("workonDaw").textContent = projeto.daw || "Não definida";
  document.getElementById("workonGenero").textContent = projeto.genero || "Não definido";
  document.getElementById("workonPrazo").textContent = projeto.prazo ? new Date(projeto.prazo).toLocaleDateString("pt-BR") : "Sem prazo";
  const notas = document.getElementById("workonNotas");
  if (notas && projeto.notas !== undefined) notas.value = projeto.notas || "";
  document.title = `Backstage | ${projeto.titulo}`;
}

function renderizarQuadro(projetos, container) {
  container.replaceChildren();
  for (const status of STATUS) {
    const coluna = document.createElement("section");
    coluna.className = "workon-board-column";
    coluna.innerHTML = `<h3>${STATUS_LABEL[status]} <span>${projetos.filter((p) => p.status === status).length}</span></h3>`;
    projetos.filter((projeto) => projeto.status === status).forEach((projeto) => coluna.appendChild(cardWorkOn(projeto)));
    container.appendChild(coluna);
  }
}

export async function iniciarBibliotecaWorkOn() {
  const grid = document.getElementById("workonGrid");
  const erro = document.getElementById("workonErro");
  const tabs = [...document.querySelectorAll("[data-workon-tab]")];
  const botoesVisualizacao = [...document.querySelectorAll("[data-workon-view]")];
  const busca = document.getElementById("workonBusca");
  const ordenar = document.getElementById("workonOrdenar");
  if (!grid) return;

  let abaAtual = "meus";
  let visualizacao = "galeria";
  let meus = [];
  let exploracao = [];

  function projetosAtuais() {
    const base = abaAtual === "explorar"
      ? exploracao
      : meus.filter((projeto) => abaAtual === "meus" ? projeto.eh_dono : !projeto.eh_dono);
    const termo = busca?.value.trim().toLocaleLowerCase("pt-BR") || "";
    const filtrados = termo
      ? base.filter((projeto) => `${projeto.titulo} ${projeto.tipo} ${projeto.status} ${projeto.dono?.nome || ""}`.toLocaleLowerCase("pt-BR").includes(termo))
      : [...base];
    if (ordenar?.value === "titulo") filtrados.sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), "pt-BR"));
    if (ordenar?.value === "status") filtrados.sort((a, b) => String(a.status).localeCompare(String(b.status), "pt-BR"));
    return filtrados;
  }

  function renderizar() {
    const projetos = projetosAtuais();
    if (visualizacao === "quadro") {
      grid.className = "workon-board";
      renderizarQuadro(projetos, grid);
      return;
    }
    grid.className = `workon-grid ${visualizacao === "lista" ? "is-list" : ""}`;
    grid.replaceChildren();
    if (!projetos.length) {
      grid.innerHTML = `<p class="workon-empty">${busca?.value ? "Nenhum projeto corresponde à busca." : abaAtual === "explorar" ? "Nenhum projeto público encontrado." : "Nenhum projeto nesta aba ainda."}</p>`;
    } else {
      projetos.forEach((projeto) => grid.appendChild(cardWorkOn(projeto)));
    }
  }

  async function carregar() {
    erro.textContent = "";
    grid.innerHTML = '<p class="workon-empty">Carregando projetos...</p>';
    try {
      if (abaAtual === "explorar") exploracao = await chamar("/api/workons?limite=50");
      else if (!meus.length) meus = await chamar("/api/workons/meus");
      renderizar();
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
    renderizar();
  }));
  busca?.addEventListener("input", renderizar);
  ordenar?.addEventListener("change", renderizar);

  document.getElementById("formCriarWorkOn")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const dados = Object.fromEntries(new FormData(form));
    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    try {
      await chamar("/api/workons", { method: "POST", body: dados });
      form.reset();
      meus = [];
      abaAtual = "meus";
      tabs.find((item) => item.dataset.workonTab === "meus")?.click();
    } catch (error) {
      mostrarErro(erro, error);
    } finally {
      botao.disabled = false;
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
      await chamar(`/api/workons/${idWorkOn}/tarefas/${tarefa.id_tarefa}`, { method: "PATCH", body: { feita: check.checked } });
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

function configurarPlayerGlobal(projeto, erro) {
  const player = document.getElementById("workonPlayer");
  const audio = document.getElementById("workonGlobalAudio");
  const fechar = document.getElementById("fecharWorkonPlayer");
  if (!player || !audio) return null;
  const titulo = document.getElementById("playerTrackTitle");
  const projetoNome = document.getElementById("playerTrackProject");
  const arte = document.getElementById("playerArt");
  const state = { player, audio, titulo, projetoNome, arte, activeButton: null };
  if (projeto.capa) arte.style.backgroundImage = `url("${encodeURI(projeto.capa)}")`;
  fechar?.addEventListener("click", () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    player.hidden = true;
  });
  audio.addEventListener("play", () => { player.hidden = false; });
  audio.addEventListener("pause", () => {
    state.activeButton?.classList.remove("is-playing");
    if (state.activeButton) {
      state.activeButton.querySelector("i").className = "fas fa-play";
      state.activeButton.querySelector("span").textContent = "Ouvir";
    }
  });
  audio.addEventListener("error", () => mostrarErro(erro, new Error("Não foi possível reproduzir este arquivo de áudio.")));
  return state;
}

function criarPlayerVersao(projeto, versao, erro, playerState) {
  const bloco = document.createElement("div");
  bloco.className = "workon-version";
  const info = document.createElement("div");
  info.className = "workon-version-info";
  info.innerHTML = `<span>${escaparHtml(versao.rotulo || `Versão ${versao.numero}`)}</span><small>${escaparHtml(versao.observacao || "Arquivo de áudio")}</small>`;
  const acoes = document.createElement("div");
  acoes.className = "workon-version-actions";
  const tocar = document.createElement("button");
  tocar.type = "button";
  tocar.className = "workon-play";
  tocar.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i><span>Ouvir</span>';
  tocar.setAttribute("aria-label", `Ouvir ${versao.rotulo || `versão ${versao.numero}`}`);
  let carregando = false;
  let carregado = false;

  async function carregarEReproduzir() {
    if (carregando) return;
    try {
      if (!carregado) {
        carregando = true;
        tocar.classList.add("is-loading");
        tocar.querySelector("span").textContent = "Carregando";
        const resposta = await chamar(`/api/workons/${projeto.id_workon}/versoes/${versao.id_versao}/url`);
        playerState.audio.src = resposta.url;
        playerState.audio.load();
        carregado = true;
      }
      playerState.titulo.textContent = versao.rotulo || `Versão ${versao.numero}`;
      playerState.projetoNome.textContent = projeto.titulo;
      playerState.player.hidden = false;
      document.querySelectorAll(".workon-play").forEach((botao) => {
        botao.classList.remove("is-playing");
        botao.querySelector("i").className = "fas fa-play";
        botao.querySelector("span").textContent = "Ouvir";
      });
      playerState.activeButton = tocar;
      await playerState.audio.play();
      tocar.classList.add("is-playing");
      tocar.querySelector("i").className = "fas fa-pause";
      tocar.querySelector("span").textContent = "Tocando";
    } catch (error) {
      mostrarErro(erro, error);
    } finally {
      carregando = false;
      tocar.classList.remove("is-loading");
      if (playerState.audio.paused) tocar.querySelector("span").textContent = "Ouvir";
    }
  }

  tocar.addEventListener("click", carregarEReproduzir);
  acoes.append(tocar);
  bloco.append(info, acoes);
  return bloco;
}

function renderizarFaixas(projeto, container, erro, playerState) {
  container.replaceChildren();
  if (!projeto.faixas?.length) {
    container.innerHTML = '<p class="workon-empty">Adicione a primeira faixa para organizar as versões.</p>';
    return;
  }
  projeto.faixas.forEach((faixa) => {
    const card = document.createElement("article");
    card.className = "workon-track";
    const cabecalho = document.createElement("div");
    cabecalho.className = "workon-track-heading";
    cabecalho.innerHTML = `<div><h3>${escaparHtml(faixa.titulo)}</h3><span>${faixa.versoes?.length || 0} versão(ões)${faixa.bpm ? ` · ${faixa.bpm} BPM` : ""}</span></div><i class="fas fa-waveform-lines" aria-hidden="true"></i>`;
    const versoes = document.createElement("div");
    versoes.className = "workon-versions";
    (faixa.versoes || []).forEach((versao) => versoes.appendChild(criarPlayerVersao(projeto, versao, erro, playerState)));
    if (!faixa.versoes?.length) versoes.innerHTML = '<p class="workon-empty">Nenhuma versão enviada ainda.</p>';
    if (projeto.pode_editar) {
      const form = document.createElement("form");
      form.className = "workon-upload";
      form.innerHTML = '<label>Arquivo de áudio <input type="file" name="audio" accept="audio/*" required></label><label class="upload-meta">Rótulo <input type="text" name="rotulo" maxlength="80" placeholder="Demo, mix 02..."></label><label class="upload-meta">Observação <input type="text" name="observacao" maxlength="500" placeholder="O que mudou nesta versão?"></label><button type="submit"><i class="fas fa-upload" aria-hidden="true"></i> Enviar versão</button>';
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const arquivo = form.elements.audio.files[0];
        if (!arquivo) return;
        const dados = new FormData();
        dados.append("audio", arquivo);
        if (form.elements.rotulo.value) dados.append("rotulo", form.elements.rotulo.value);
        if (form.elements.observacao.value) dados.append("observacao", form.elements.observacao.value);
        const botao = form.querySelector("button");
        botao.disabled = true;
        try {
          await chamar(`/api/workons/${projeto.id_workon}/faixas/${faixa.id_faixa}/versoes`, { method: "POST", body: dados });
          window.location.reload();
        } catch (error) {
          mostrarErro(erro, error);
          botao.disabled = false;
        }
      });
      versoes.appendChild(form);
    }
    card.append(cabecalho, versoes);
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
    const playerState = configurarPlayerGlobal(projeto, erro);
    configurarEdicaoMetadados(projeto, erro);
    document.title = `Backstage | ${projeto.titulo}`;
    document.getElementById("workonTitulo").textContent = projeto.titulo;
    document.getElementById("workonDescricao").textContent = projeto.descricao || "Sem descrição.";
    document.getElementById("workonTipoBadge").textContent = projeto.tipo || "Projeto";
    document.getElementById("workonStatus").textContent = STATUS_LABEL[projeto.status] || projeto.status;
    document.getElementById("workonDaw").textContent = projeto.daw || "Não definida";
    document.getElementById("workonGenero").textContent = projeto.genero || "Não definido";
    document.getElementById("workonPrazo").textContent = projeto.prazo ? new Date(projeto.prazo).toLocaleDateString("pt-BR") : "Sem prazo";
    document.getElementById("workonDono").textContent = projeto.dono?.nome || "Projeto colaborativo";
    document.getElementById("workonFaixasResumo").textContent = `${projeto.faixas?.length || 0} faixa(s) · ${projeto.faixas?.reduce((total, faixa) => total + (faixa.versoes?.length || 0), 0) || 0} versão(ões)`;
    document.getElementById("workonFaixasCount").textContent = `${projeto.faixas?.length || 0} faixa(s)`;
    document.getElementById("workonNotas").value = projeto.notas || "";
    document.getElementById("workonNotas").readOnly = !projeto.pode_editar;
    const capa = document.getElementById("workonCapa");
    const imagemCapa = document.getElementById("workonCapaImagem");
    if (projeto.capa && imagemCapa) {
      imagemCapa.src = projeto.capa;
      imagemCapa.hidden = false;
    }
    document.getElementById("workonSemDetalhes").hidden = Boolean(projeto.faixas);
    [...document.querySelectorAll("[data-editor-only]")].forEach((elemento) => { elemento.hidden = !projeto.pode_editar; });
    if (!projeto.pode_editar) capa.removeAttribute("title");
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
    renderizarFaixas(projeto, document.getElementById("workonFaixasLista"), erro, playerState);

    document.getElementById("copiarLinkProjeto")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        erro.textContent = "Link copiado.";
      } catch {
        erro.textContent = "Não foi possível copiar o link.";
      }
    });
    document.getElementById("buscarNoProjeto")?.addEventListener("click", () => {
      document.querySelector("#workonFaixas input[type=search]")?.focus();
    });
    capa.addEventListener("click", () => {
      if (projeto.pode_editar) document.getElementById("atualizarCapa")?.click();
    });
    capa.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && projeto.pode_editar) {
        event.preventDefault();
        document.getElementById("atualizarCapa")?.click();
      }
    });
    document.querySelector(".project-add-track")?.addEventListener("click", () => {
      document.querySelector("#criarFaixa input")?.focus();
    });

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
      } catch (error) { mostrarErro(erro, error); }
    });
    document.getElementById("criarFaixa")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.titulo;
      try {
        await chamar(`/api/workons/${projeto.id_workon}/faixas`, { method: "POST", body: { titulo: input.value } });
        window.location.reload();
      } catch (error) { mostrarErro(erro, error); }
    });
    document.getElementById("salvarNotas")?.addEventListener("click", async () => {
      try {
        await chamar(`/api/workons/${projeto.id_workon}`, { method: "PATCH", body: { notas: document.getElementById("workonNotas").value } });
        erro.textContent = "Notas salvas.";
      } catch (error) { mostrarErro(erro, error); }
    });
    const fotos = document.getElementById("workonFotos");
    fotos.replaceChildren();
    (projeto.fotos || []).forEach((foto) => {
      const figure = document.createElement("figure");
      figure.innerHTML = `<img src="${escaparHtml(foto.caminho)}" alt="${escaparHtml(foto.legenda || "Foto do projeto")}" loading="lazy"><figcaption>${escaparHtml(foto.legenda || "")}</figcaption>`;
      fotos.appendChild(figure);
    });
    document.getElementById("adicionarFoto")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formulario = new FormData(event.currentTarget);
      try {
        await chamar(`/api/workons/${projeto.id_workon}/fotos`, { method: "POST", body: formulario });
        window.location.reload();
      } catch (error) { mostrarErro(erro, error); }
    });
    document.getElementById("atualizarCapa")?.addEventListener("change", async (event) => {
      const arquivo = event.currentTarget.files[0];
      if (!arquivo) return;
      const formulario = new FormData();
      formulario.append("image", arquivo);
      try {
        await chamar(`/api/workons/${projeto.id_workon}/capa`, { method: "PUT", body: formulario });
        window.location.reload();
      } catch (error) { mostrarErro(erro, error); }
    });
  } catch (error) {
    mostrarErro(erro, error);
  }
}
