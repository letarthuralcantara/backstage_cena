/**
 * loading.js — Loading overlay reutilizável
 * Uso: import { showLoading, hideLoading } from './loading.js';
 */

function injectLoader() {
  if (document.getElementById("loading-overlay")) return;

  const style = document.createElement("style");
  style.textContent = `
    #loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--bg, #0a0a0c);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      transition: opacity 0.25s ease;
    }
    /* display:flex !important mantém o fade de saída apesar do .hidden global */
    #loading-overlay.hidden {
      display: flex !important;
      opacity: 0;
      pointer-events: none;
    }
    .loader-logo {
      width: 110px;
      opacity: 0.9;
    }
    .loader-scene {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .loader-ring {
      width: 36px;
      height: 36px;
      border: 3px solid var(--line-strong, rgba(255, 255, 255, .14));
      border-top-color: var(--accent-text, #a78bfa);
      border-radius: 50%;
      animation: loader-spin 0.9s linear infinite;
    }
    @keyframes loader-spin {
      to { transform: rotate(360deg); }
    }
    .loader-note {
      display: none;
    }
    .loader-text {
      font-family: var(--font, 'Inter', sans-serif);
      font-size: 14px;
      font-weight: 500;
      color: var(--text-2, #a1a1a6);
    }
    @media (prefers-reduced-motion: reduce) {
      .loader-ring { animation-duration: 3s; }
    }
  `;
  document.head.appendChild(style);

  const notes = ["♩", "♪", "♫", "♬", "𝅘𝅥𝅮", "♭"];

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.innerHTML = `
    <img src="../images/logo.png" alt="Backstage" class="loader-logo" onerror="this.style.display='none'">
    <div class="loader-scene">
      ${notes.map((n) => `<span class="loader-note">${n}</span>`).join("")}
      <div class="loader-ring"></div>
    </div>
    <span class="loader-text" id="loader-msg">Carregando...</span>
  `;
  document.body.appendChild(overlay);
}

injectLoader();

export function showLoading(msg = "Carregando...") {
  // injectLoader() é idempotente (sai cedo se já existir), então é seguro
  // chamar sempre — cobre o caso de hideLoading() ter removido o overlay do DOM.
  injectLoader();
  const overlay = document.getElementById("loading-overlay");
  const msgEl = document.getElementById("loader-msg");
  if (overlay) overlay.classList.remove("hidden");
  if (msgEl) msgEl.textContent = msg;
}

export function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
  }, 400);
}
