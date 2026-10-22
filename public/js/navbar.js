import {
  aplicarFotoNoElemento,
  authHeaders,
  fazerLogout,
  verificarAutenticacao,
} from "./auth.js";
import { initSearchOverlay } from "./search-overlay.js";

const MENU_ITEMS = [
  { href: "perfil.html", icon: "fa-user", label: "Meu Perfil" },
  { href: "feed.html", icon: "fa-stream", label: "Feed" },
  { href: "clubes.html", icon: "fa-people-group", label: "Clubes" },
  { href: "workons.html", icon: "fa-compact-disc", label: "Work On" },
  { href: "publicar.html", icon: "fa-plus-circle", label: "Nova Postagem" },
  { href: "config.html", icon: "fa-cog", label: "Configurações" },
];

const TAB_ITEMS = [
  { href: "feed.html", icon: "fa-stream", label: "Feed", key: "feed" },
  { action: "buscar", icon: "fa-search", label: "Buscar", key: "buscar" },
  {
    href: "clubes.html",
    icon: "fa-people-group",
    label: "Clubes",
    key: "clubes",
  },
  {
    href: "publicar.html",
    icon: "fa-plus",
    label: "Postar",
    key: "publicar",
    cta: true,
  },
  { href: "perfil.html", icon: "fa-user", label: "Perfil", key: "perfil" },
];

function paginaAtual() {
  const arquivo = window.location.pathname.split("/").pop();
  if (arquivo === "pesquisar_usuarios.html") return "buscar";
  if (["clubes.html", "clube.html"].includes(arquivo)) return "clubes";
  if (["editar.html", "config.html"].includes(arquivo)) return "perfil";
  return arquivo?.replace(".html", "") || "feed";
}

function montarMenu(dropdown) {
  const itens = MENU_ITEMS.map(
    ({ href, icon, label }) =>
      `<a href="${href}" class="dropdown-item"><i class="fas ${icon}"></i> ${label}</a>`,
  ).join("");

  dropdown.innerHTML = `
    <button type="button" class="profile-trigger" id="profileTrigger" aria-label="Abrir menu do perfil" aria-expanded="false"></button>
    <div class="profile-incomplete-badge" id="profileIncompleteBadge" aria-label="Cadastro incompleto">!</div>
    <div class="dropdown-menu">
      ${itens}
      <div class="dropdown-divider"></div>
      <button type="button" class="dropdown-item logout" id="btnSair"><i class="fas fa-sign-out-alt"></i> Sair</button>
    </div>`;

  const trigger = dropdown.querySelector("#profileTrigger");
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const aberto = dropdown.classList.toggle("active");
    trigger.setAttribute("aria-expanded", String(aberto));
  });
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove("active");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
  dropdown.querySelector("#btnSair").addEventListener("click", fazerLogout);
}

function montarTabBar(nav) {
  const atual = paginaAtual();
  nav.innerHTML = TAB_ITEMS.map((item) => {
    const classe = [
      "tab-bar-item",
      item.cta ? "tab-bar-cta" : "",
      item.key === atual ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const aria = item.key === atual ? ' aria-current="page"' : "";
    if (item.action === "buscar")
      return `<button type="button" class="${classe}" id="tabBarBuscar"${aria}><i class="fas ${item.icon}"></i>${item.label}</button>`;
    return `<a class="${classe}" href="${item.href}"${aria}><i class="fas ${item.icon}"></i>${item.label}</a>`;
  }).join("");
}

function configurarAutoHideNavegacao() {
  const header = document.querySelector(".header");
  const tabBar = document.querySelector(".tab-bar");
  if (!header && !tabBar) return;
  let ultimaPosicao = window.scrollY;
  let raf = false;
  const atualizar = () => {
    const atual = window.scrollY;
    const descendo = atual > ultimaPosicao + 8;
    const subindo = atual < ultimaPosicao - 8;
    if (atual <= 12 || subindo) {
      header?.classList.remove("nav-is-hidden");
      tabBar?.classList.remove("nav-is-hidden");
    } else if (descendo && atual > 70) {
      header?.classList.add("nav-is-hidden");
      tabBar?.classList.add("nav-is-hidden");
      document.querySelector(".profile-dropdown.active")?.classList.remove("active");
    }
    ultimaPosicao = atual;
    raf = false;
  };
  window.addEventListener("scroll", () => { if (!raf) { raf = true; requestAnimationFrame(atualizar); } }, { passive: true });
}

function montarBuscaSeNecessario(headerCenter, escopo, placeholder) {
  if (!headerCenter || headerCenter.querySelector(".header-search")) return;
  const editavel = escopo === "clubes";
  headerCenter.innerHTML = `
    <div class="header-search" id="searchBar">
      <i class="fas fa-search header-search-icon" aria-hidden="true"></i>
      <input type="text" id="headerSearchInput" class="header-search-input" placeholder="${placeholder}" ${editavel ? 'maxlength="60"' : "readonly"}>
      <button type="button" class="header-search-btn" id="headerSearchSubmit">Buscar</button>
    </div>`;
}

function restaurarPlayerPersistente() {
  if (document.getElementById("workonPlayer") || document.querySelector(".backstage-persistent-player")) return;
  let salvo;
  try { salvo = JSON.parse(localStorage.getItem("backstage:workon-player") || "null"); } catch { salvo = null; }
  if (!salvo?.url || !salvo?.titulo) return;
  const player = document.createElement("div");
  player.className = "backstage-persistent-player";
  player.innerHTML = `<div class="persistent-player-art"></div><div class="persistent-player-info"><strong></strong><span></span></div><div class="persistent-player-controls"><button type="button" data-player-skip="prev" aria-label="Faixa anterior"><i class="fas fa-backward-step"></i></button><audio controls preload="metadata"></audio><button type="button" data-player-skip="next" aria-label="Próxima faixa"><i class="fas fa-forward-step"></i></button></div><button type="button" class="persistent-player-close" aria-label="Fechar player"><i class="fas fa-xmark"></i></button>`;
  const audio = player.querySelector("audio");
  const arte = player.querySelector(".persistent-player-art");
  player.querySelector("strong").textContent = salvo.titulo;
  player.querySelector("span").textContent = salvo.projeto || "Backstage";
  if (salvo.capa) arte.style.backgroundImage = `url("${encodeURI(salvo.capa)}")`;
  audio.src = salvo.url;
  audio.addEventListener("loadedmetadata", () => { if (salvo.tempo) audio.currentTime = Math.min(salvo.tempo, audio.duration || salvo.tempo); });
  audio.addEventListener("timeupdate", () => { try { localStorage.setItem("backstage:workon-player", JSON.stringify({ ...JSON.parse(localStorage.getItem("backstage:workon-player") || "{}"), tempo: audio.currentTime })); } catch {} });
  audio.addEventListener("play", () => { try { localStorage.setItem("backstage:workon-player", JSON.stringify({ ...JSON.parse(localStorage.getItem("backstage:workon-player") || "{}"), playing: true })); } catch {} });
  audio.addEventListener("pause", () => { try { localStorage.setItem("backstage:workon-player", JSON.stringify({ ...JSON.parse(localStorage.getItem("backstage:workon-player") || "{}"), playing: false, tempo: audio.currentTime })); } catch {} });
  const queue = Array.isArray(salvo.queue) ? salvo.queue : [];
  const tocarFila = async (offset) => {
    const atual = Number(salvo.index ?? -1);
    const proximo = atual + offset;
    const item = queue[proximo];
    if (!item?.idVersao) return;
    const resposta = await fetch(`/api/workons/${salvo.idProjeto}/versoes/${item.idVersao}/url`, { headers: authHeaders() });
    if (!resposta.ok) return;
    const dados = await resposta.json();
    audio.src = dados.url; audio.load(); audio.play().catch(() => undefined);
    localStorage.setItem("backstage:workon-player", JSON.stringify({ ...salvo, ...item, idVersao: item.idVersao, url: dados.url, titulo: item.titulo, index: proximo, tempo: 0, playing: true }));
  };
  audio.addEventListener("ended", () => tocarFila(1));
  player.querySelector('[data-player-skip="prev"]').addEventListener("click", () => tocarFila(-1));
  player.querySelector('[data-player-skip="next"]').addEventListener("click", () => tocarFila(1));
  audio.addEventListener("error", async () => {
    if (!salvo.idProjeto || !salvo.idVersao) return;
    try { const resposta = await fetch(`/api/workons/${salvo.idProjeto}/versoes/${salvo.idVersao}/url`, { headers: authHeaders() }); if (resposta.ok) { const dados = await resposta.json(); audio.src = dados.url; audio.load(); localStorage.setItem("backstage:workon-player", JSON.stringify({ ...salvo, url: dados.url })); } } catch {}
  });
  player.querySelector(".persistent-player-close").addEventListener("click", () => { audio.pause(); localStorage.removeItem("backstage:workon-player"); player.remove(); });
  document.body.appendChild(player);
  if (salvo.playing) setTimeout(() => audio.play().catch(() => undefined), 120);
}

export async function initNavbar({
  redirecionar = true,
  escopo = "geral",
  idClube,
  buscar,
  placeholder,
  usuarioServidor,
} = {}) {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) montarMenu(dropdown);

  const nav = document.querySelector(".tab-bar");
  if (nav) montarTabBar(nav);
  configurarAutoHideNavegacao();

  const textoBusca =
    placeholder ||
    (escopo === "clube"
      ? "Buscar neste clube..."
      : escopo === "clubes"
        ? "Buscar clube pelo nome..."
        : "Buscar músicos...");
  montarBuscaSeNecessario(
    document.querySelector(".header-center"),
    escopo,
    textoBusca,
  );

  if (escopo === "clube") {
    initSearchOverlay({ escopo, idClube, buscar, placeholder: textoBusca });
  } else if (escopo === "clubes" || escopo === "busca") {
    initSearchOverlay({ escopo });
  } else {
    initSearchOverlay();
  }

  const usuarioLogado = verificarAutenticacao(redirecionar);
  if (!usuarioLogado) return null;

  restaurarPlayerPersistente();

  const trigger = document.getElementById("profileTrigger");
  const nome = usuarioLogado.nome_artistico || usuarioLogado.nome_completo || "B";
  if (trigger) trigger.textContent = nome.trim().slice(0, 2).toUpperCase();

  let usuarioDoServidor =
    String(usuarioServidor?.id_usuario) === String(usuarioLogado.id_usuario)
      ? usuarioServidor
      : undefined;
  if (!usuarioDoServidor) {
    try {
      const res = await fetch(`/api/usuarios/${usuarioLogado.id_usuario}`);
      if (res.ok) usuarioDoServidor = await res.json();
    } catch {
      usuarioDoServidor = undefined;
    }
  }

  const caminhoFoto =
    usuarioDoServidor?.imagem?.caminho || usuarioLogado.imagem?.caminho;
  if (caminhoFoto) aplicarFotoNoElemento(trigger, caminhoFoto, nome);
  const badge = document.getElementById("profileIncompleteBadge");
  if (badge) {
    badge.classList.toggle(
      "show",
      Number(
        usuarioDoServidor?.cadastro_completo ?? usuarioLogado.cadastro_completo ?? 0,
      ) === 0,
    );
  }
  return { ...usuarioLogado, ...usuarioDoServidor };
}
