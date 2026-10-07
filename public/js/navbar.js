import {
  aplicarFotoNoElemento,
  fazerLogout,
  verificarAutenticacao,
} from "./auth.js";
import { initSearchOverlay } from "./search-overlay.js";

const MENU_ITEMS = [
  { href: "perfil.html", icon: "fa-user", label: "Meu Perfil" },
  { href: "feed.html", icon: "fa-stream", label: "Feed" },
  { href: "clubes.html", icon: "fa-people-group", label: "Clubes" },
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

  const trigger = document.getElementById("profileTrigger");
  const nome = usuarioLogado.nome_artistico || usuarioLogado.nome_completo || "B";
  if (trigger) trigger.textContent = nome.trim().slice(0, 2).toUpperCase();

  let usuarioDoServidor =
    usuarioServidor?.id_usuario === usuarioLogado.id_usuario
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

  if (usuarioDoServidor?.imagem?.caminho)
    aplicarFotoNoElemento(trigger, usuarioDoServidor.imagem.caminho, nome);
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