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
  const abrirMenu = document.getElementById("abrirMenuProjeto");
  if (!dialog || !formulario || !abrirMenu) return;
  document.getElementById("fecharMetadados")?.addEventListener("click", () => dialog.close("cancel"));
  document.getElementById("cancelarMetadados")?.addEventListener("click", () => dialog.close("cancel"));
  abrirMenu.addEventListener("click", () => {
    if (!projeto.pode_editar) return mostrarErro(erro, new Error("Você não pode editar este projeto."));
    preencherMetadados(formulario, projeto);
    dialog.showModal();
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
  const tipoElemento = document.getElementById("workonTipoBadge") || document.getElementById("workonTipo");
  if (tipoElemento) tipoElemento.textContent = projeto.tipo || "Projeto";
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

  const formularioCriar = document.getElementById("formCriarWorkOn") || document.querySelector("#criarWorkOn form") || (document.getElementById("criarWorkOn")?.tagName === "FORM" ? document.getElementById("criarWorkOn") : null);
  formularioCriar?.addEventListener("submit", async (event) => {
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
  if (!player || !audio) return null;
  const titulo = document.getElementById("playerTrackTitle");
  const projetoNome = document.getElementById("playerTrackProject");
  const arte = document.getElementById("playerArt");
  const state = { player, audio, titulo, projetoNome, arte, queue: [], index: -1, loading: false };
  if (projeto.capa) {
    arte.style.backgroundImage = `url("${encodeURI(projeto.capa)}")`;
    arte.classList.add("has-art");
    arte.querySelector("i")?.remove();
  }
  const atualizarFaixaAtiva = () => {
    document.querySelectorAll(".workon-track").forEach((linha) => linha.classList.remove("is-playing"));
    const atual = state.queue[state.index];
    if (atual) document.querySelector(`[data-track-id="${atual.faixa.id_faixa}"]`)?.classList.add("is-playing");
  };
  const tocarItem = async (index, autoplay = true) => {
    const item = state.queue[index];
    if (!item || state.loading) return;
    state.loading = true;
    state.index = index;
    try {
      const resposta = await chamar(`/api/workons/${projeto.id_workon}/versoes/${item.versao.id_versao}/url`);
      audio.src = resposta.url;
      audio.load();
      titulo.textContent = item.faixa.titulo;
      projetoNome.textContent = `${projeto.titulo} · ${item.versao.rotulo || `Versão ${item.versao.numero}`}`;
      player.hidden = false;
      atualizarFaixaAtiva();
      if (autoplay) await audio.play();
      localStorage.setItem("backstage:workon-player", JSON.stringify({ idProjeto: projeto.id_workon, idVersao: item.versao.id_versao, url: resposta.url, titulo: item.faixa.titulo, projeto: projeto.titulo, capa: projeto.capa || "", tempo: 0, index, playing: autoplay, queue: state.queue.map((entry) => ({ idVersao: entry.versao.id_versao, titulo: entry.faixa.titulo })) }));
    } catch (error) { mostrarErro(erro, error); } finally { state.loading = false; }
  };
  state.tocarItem = tocarItem;
  audio.addEventListener("play", () => { player.hidden = false; atualizarFaixaAtiva(); const salvo = localStorage.getItem("backstage:workon-player"); if (salvo) { try { localStorage.setItem("backstage:workon-player", JSON.stringify({ ...JSON.parse(salvo), playing: true })); } catch {} } });
  audio.addEventListener("pause", () => { const salvo = localStorage.getItem("backstage:workon-player"); if (salvo) { try { localStorage.setItem("backstage:workon-player", JSON.stringify({ ...JSON.parse(salvo), playing: false, tempo: audio.currentTime })); } catch {} } });
  audio.addEventListener("timeupdate", () => { const salvo = localStorage.getItem("backstage:workon-player"); if (salvo) { try { localStorage.setItem("backstage:workon-player", JSON.stringify({ ...JSON.parse(salvo), tempo: audio.currentTime, index: state.index })); } catch {} } });
  audio.addEventListener("ended", () => { if (state.index + 1 < state.queue.length) tocarItem(state.index + 1); });
  document.getElementById("playerPrev")?.addEventListener("click", () => { if (state.index > 0) tocarItem(state.index - 1); });
  document.getElementById("playerNext")?.addEventListener("click", () => { if (state.index + 1 < state.queue.length) tocarItem(state.index + 1); });
  audio.addEventListener("error", () => mostrarErro(erro, new Error("Não foi possível reproduzir este arquivo de áudio.")));
  document.getElementById("fecharWorkonPlayer")?.addEventListener("click", () => { audio.pause(); audio.removeAttribute("src"); audio.load(); player.hidden = true; localStorage.removeItem("backstage:workon-player"); });
  return state;
}

function renderizarFaixas(projeto, container, erro, playerState) {
  container.replaceChildren();
  const detalhes = document.getElementById("dialogDetalhesFaixa");
  if (detalhes && !detalhes.dataset.bound) {
    detalhes.dataset.bound = "true";
    detalhes.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-detail-action]")?.dataset.detailAction;
      const contexto = detalhes._trackContext;
      if (!action || !contexto) return;
      if (action === "rename") {
        const titulo = window.prompt("Nome da faixa", contexto.faixa.titulo);
        if (titulo?.trim()) { await chamar(`/api/workons/${projeto.id_workon}/faixas/${contexto.faixa.id_faixa}`, { method: "PATCH", body: { titulo: titulo.trim() } }); window.location.reload(); }
      }
      if (action === "delete" && window.confirm(`Excluir “${contexto.faixa.titulo}”?`)) { await chamar(`/api/workons/${projeto.id_workon}/faixas/${contexto.faixa.id_faixa}`, { method: "DELETE" }); detalhes.close(); window.location.reload(); }
      if (action === "replace") contexto.uploadForm.elements.audio.click();
      if (action === "queue") { if (contexto.item >= 0) playerState.queue.push(playerState.queue[contexto.item]); detalhes.close(); }
      if (action === "notes") { detalhes.close(); document.getElementById("abrirNotasProjeto")?.click(); }
    });
  }
  if (!projeto.faixas?.length) { container.innerHTML = '<p class="workon-empty">Adicione a primeira faixa para organizar as versões.</p>'; return; }
  playerState.queue = projeto.faixas.flatMap((faixa) => { const versao = faixa.versoes?.[faixa.versoes.length - 1]; return versao ? [{ faixa, versao }] : []; });
  try {
    const salvo = JSON.parse(localStorage.getItem("backstage:workon-player") || "null");
    const indexSalvo = salvo?.idProjeto === projeto.id_workon ? playerState.queue.findIndex((entry) => entry.versao.id_versao === salvo.idVersao) : -1;
    if (indexSalvo >= 0 && salvo.playing) setTimeout(() => playerState.tocarItem(indexSalvo, true), 80);
  } catch {}
  projeto.faixas.forEach((faixa, index) => {
    const linha = document.createElement("article");
    linha.className = "workon-track";
    linha.dataset.trackId = faixa.id_faixa;
    const item = playerState.queue.findIndex((entry) => entry.faixa.id_faixa === faixa.id_faixa);
    const versao = faixa.versoes?.[faixa.versoes.length - 1];
    linha.innerHTML = `<button type="button" class="workon-track-main" aria-label="Tocar ${escaparHtml(faixa.titulo)}"><span class="workon-track-number">${String(index + 1).padStart(2, "0")}</span><span class="workon-track-play"><i class="fas fa-play"></i></span><span class="workon-track-copy"><strong>${escaparHtml(faixa.titulo)}</strong><small>${escaparHtml(versao?.rotulo || "Sem versão enviada")}</small></span><span class="workon-track-duration">${versao ? "Áudio" : "Sem áudio"}</span></button>`;
    linha.querySelector(".workon-track-main").addEventListener("click", () => { if (item >= 0) playerState.tocarItem(item); else mostrarErro(erro, new Error("Essa faixa ainda não possui um áudio.")); });
    if (projeto.pode_editar) {
      const menuWrap = document.createElement("div"); menuWrap.className = "track-actions";
      menuWrap.innerHTML = '<button type="button" class="track-menu-trigger" aria-label="Abrir detalhes da faixa"><i class="fas fa-ellipsis"></i></button>';
      const trigger = menuWrap.querySelector(".track-menu-trigger");
      const detalhes = document.getElementById("dialogDetalhesFaixa");
      const tituloDetalhes = document.getElementById("trackDetailsTitle");
      const metaDetalhes = document.getElementById("trackDetailsMeta");
      const arquivoDetalhes = document.getElementById("trackDetailsFile");
      const abrirDetalhes = () => {
        if (!detalhes) return;
        detalhes.dataset.faixaId = faixa.id_faixa;
        tituloDetalhes.textContent = faixa.titulo;
        metaDetalhes.textContent = `${versao?.rotulo || "Sem versão"}${faixa.bpm ? ` · ${faixa.bpm} BPM` : ""}${faixa.tom ? ` · ${faixa.tom}` : ""}`;
        arquivoDetalhes.textContent = versao?.observacao || "Nenhuma observação adicionada";
        detalhes._trackContext = { faixa, versao, item, uploadForm: null };
        detalhes.showModal();
      };
      trigger.addEventListener("click", (event) => { event.stopPropagation(); abrirDetalhes(); });
      const uploadForm = document.createElement("form"); uploadForm.className = "track-hidden-upload"; uploadForm.innerHTML = '<input type="file" name="audio" accept="audio/*">';
      uploadForm.addEventListener("change", async () => { const file = uploadForm.elements.audio.files[0]; if (!file) return; const data = new FormData(); data.append("audio", file); await chamar(`/api/workons/${projeto.id_workon}/faixas/${faixa.id_faixa}/versoes`, { method: "POST", body: data }); window.location.reload(); });
      if (detalhes?._trackContext) detalhes._trackContext.uploadForm = uploadForm;
      linha.append(menuWrap, uploadForm);
    }
    container.appendChild(linha);
  });
  document.getElementById("fecharDetalhesFaixa")?.addEventListener("click", () => document.getElementById("dialogDetalhesFaixa")?.close());
}

function configurarComposerFaixa(projeto, erro) {
  const dialog = document.getElementById("dialogNovaFaixa");
  const formulario = document.getElementById("formNovaFaixa");
  const abrir = document.querySelector(".project-add-track");
  const arquivo = document.getElementById("novaFaixaAudio");
  const nomeArquivo = document.getElementById("novaFaixaArquivo");
  if (!dialog || !formulario || !abrir || !projeto.pode_editar) return;

  abrir.addEventListener("click", () => {
    formulario.reset();
    if (nomeArquivo) nomeArquivo.textContent = "MP3, WAV, M4A ou outro formato de áudio";
    document.getElementById("erroNovaFaixa").textContent = "";
    dialog.showModal();
    formulario.elements.titulo.focus();
  });
  document.getElementById("fecharNovaFaixa")?.addEventListener("click", () => dialog.close("cancel"));
  document.getElementById("cancelarNovaFaixa")?.addEventListener("click", () => dialog.close("cancel"));

  arquivo?.addEventListener("change", () => {
    const escolhido = arquivo.files?.[0];
    if (nomeArquivo && escolhido) nomeArquivo.textContent = `${escolhido.name} · ${(escolhido.size / 1024 / 1024).toFixed(1)} MB`;
  });

  formulario.addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "save") return;
    event.preventDefault();
    const botao = document.getElementById("salvarNovaFaixa");
    const erroComposer = document.getElementById("erroNovaFaixa");
    const dados = Object.fromEntries(new FormData(formulario));
    const audio = arquivo?.files?.[0];
    if (!audio) {
      erroComposer.textContent = "Escolha um arquivo de áudio para continuar.";
      return;
    }
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Enviando...';
    erroComposer.textContent = "";
    try {
      const faixaCriada = await chamar(`/api/workons/${projeto.id_workon}/faixas`, { method: "POST", body: { titulo: dados.titulo } });
      const idFaixa = faixaCriada?.id_faixa ?? faixaCriada?.faixa?.id_faixa;
      if (!idFaixa) throw new Error("A faixa foi criada, mas o servidor não retornou o identificador dela.");
      const upload = new FormData();
      upload.append("audio", audio);
      if (dados.rotulo) upload.append("rotulo", dados.rotulo);
      if (dados.observacao) upload.append("observacao", dados.observacao);
      await chamar(`/api/workons/${projeto.id_workon}/faixas/${idFaixa}/versoes`, { method: "POST", body: upload });
      dialog.close();
      window.location.reload();
    } catch (error) {
      erroComposer.textContent = error.message;
      mostrarErro(erro, error);
    } finally {
      botao.disabled = false;
      botao.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Criar faixa';
    }
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
    const tipoElemento = document.getElementById("workonTipoBadge") || document.getElementById("workonTipo");
    if (tipoElemento) tipoElemento.textContent = projeto.tipo || "Projeto";
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
      document.querySelector(".project-cover-placeholder")?.setAttribute("hidden", "");
    } else if (projeto.capa) {
      capa.style.backgroundImage = `url("${encodeURI(projeto.capa)}")`;
      document.querySelector(".project-cover-placeholder")?.setAttribute("hidden", "");
    }
    document.getElementById("workonSemDetalhes").hidden = Boolean(projeto.faixas);
    [...document.querySelectorAll("[data-editor-only]")].forEach((elemento) => { elemento.hidden = !projeto.pode_editar; });
    if (!projeto.pode_editar) capa.removeAttribute("title");
    document.getElementById("workonFaixas").hidden = !projeto.faixas;
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
      const botao = document.getElementById("copiarLinkProjeto");
      try {
        await navigator.clipboard.writeText(window.location.href);
        botao.classList.add("is-copied");
        botao.innerHTML = '<i class="fas fa-check"></i><span>Link copiado</span>';
        erro.textContent = "";
        window.setTimeout(() => { botao.classList.remove("is-copied"); botao.innerHTML = '<i class="fas fa-link"></i>'; }, 2200);
      } catch {
        erro.textContent = "Não foi possível copiar o link.";
      }
    });
    const notasDialog = document.getElementById("dialogNotasProjeto");
    document.getElementById("abrirNotasProjeto")?.addEventListener("click", () => { document.getElementById("workonNotas").value = projeto.notas || ""; notasDialog?.showModal(); });
    capa.addEventListener("click", () => {
      if (projeto.pode_editar) document.getElementById("atualizarCapa")?.click();
    });
    capa.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && projeto.pode_editar) {
        event.preventDefault();
        document.getElementById("atualizarCapa")?.click();
      }
    });
    configurarComposerFaixa(projeto, erro);

    document.getElementById("criarFaixa")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.titulo;
      try {
        await chamar(`/api/workons/${projeto.id_workon}/faixas`, { method: "POST", body: { titulo: input.value } });
        window.location.reload();
      } catch (error) { mostrarErro(erro, error); }
    });
    document.getElementById("formNotasProjeto")?.addEventListener("submit", async (event) => {
      if (event.submitter?.value !== "save") return;
      event.preventDefault();
      try {
        await chamar(`/api/workons/${projeto.id_workon}`, { method: "PATCH", body: { notas: document.getElementById("workonNotas").value } });
        projeto.notas = document.getElementById("workonNotas").value;
        notasDialog?.close();
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
