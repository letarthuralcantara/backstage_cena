const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function marcarCapaDeOrigem(event) {
  const card = event.target.closest?.("a.workon-card");
  if (!card) return;
  document.querySelectorAll(".workon-card.is-vt-source").forEach((el) => el.classList.remove("is-vt-source"));
  card.classList.add("is-vt-source");
}

function suavizarTrocaDeVista() {
  const grid = document.getElementById("workonGrid");
  if (!grid || REDUCED) return;
  document.querySelectorAll("[data-workon-view]").forEach((botao) => {
    botao.addEventListener("click", () => {
      grid.classList.add("is-switching");
      window.setTimeout(() => grid.classList.remove("is-switching"), 160);
    });
  });
}

function injetarSubnav() {
  const grid = document.querySelector(".workon-project .project-grid");
  if (!grid || document.querySelector(".workon-section-nav")) return;

  const slot = document.createElement("div");
  slot.className = "workon-section-nav-slot";

  const nav = document.createElement("nav");
  nav.className = "workon-section-nav";
  nav.setAttribute("aria-label", "Seções do projeto");
  nav.innerHTML = `
    <a href="#workonFaixas">Faixas</a>
    <a href="#workonGaleria">Galeria</a>
    <a href="#workonMembros">Pessoas</a>
  `;
  grid.before(slot);
  slot.after(nav);

  const links = [...nav.querySelectorAll("a")];
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const alvo = document.querySelector(link.getAttribute("href"));
      if (!alvo) return;
      event.preventDefault();
      alvo.hidden = false;
      alvo.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });

  const prender = () => {
    const header = document.querySelector(".header");
    const escondido = header?.classList.contains("nav-is-hidden");
    const topo = escondido ? 12 : (header?.offsetHeight || 52) + 10;
    const devePrender = slot.getBoundingClientRect().top <= topo;
    nav.classList.toggle("is-pinned", devePrender);
    if (devePrender) {
      nav.style.top = `${topo}px`;
      slot.style.height = `${nav.offsetHeight + 20}px`;
    } else {
      nav.style.top = "";
      slot.style.height = "0px";
    }
  };

  prender();
  window.addEventListener("scroll", prender, { passive: true });
  window.addEventListener("resize", prender);

  const secoes = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if (!secoes.length || !("IntersectionObserver" in window)) {
    links[0]?.classList.add("is-active");
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const visivel = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visivel) return;
    links.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${visivel.target.id}`);
    });
  }, { rootMargin: "-30% 0px -55% 0px", threshold: [0.15, 0.4] });

  secoes.forEach((secao) => observer.observe(secao));
}

function destacarFaixaAtual() {
  const aplicar = () => {
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem("backstage:workon-player") || "null"); } catch { salvo = null; }
    document.querySelectorAll(".workon-track.is-current").forEach((el) => el.classList.remove("is-current"));
    if (!salvo?.titulo) return;
    const faixa = [...document.querySelectorAll(".workon-track")].find((el) => el.textContent?.includes(salvo.titulo));
    faixa?.classList.add("is-current");
  };
  aplicar();
  window.addEventListener("storage", aplicar);
  document.addEventListener("play", aplicar, true);
  window.setInterval(aplicar, 1500);
}

document.addEventListener("click", marcarCapaDeOrigem, true);
suavizarTrocaDeVista();
injetarSubnav();
destacarFaixaAtual();