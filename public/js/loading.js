/**
 * loading.js — Loading overlay reutilizável
 * Uso: import { showLoading, hideLoading } from './loading.js';
 */

function injectLoader() {
  if (document.getElementById('loading-overlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      transition: opacity 0.35s ease;
    }
    #loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    /* Logo */
    .loader-logo {
      width: 130px;
      opacity: 0.85;
      margin-bottom: 4px;
    }

    /* Anel + notas wrapper */
    .loader-scene {
      position: relative;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Anel girando */
    .loader-ring {
      width: 62px;
      height: 62px;
      border: 4px solid rgba(139, 92, 246, 0.18);
      border-top-color: #8b5cf6;
      border-right-color: #a78bfa;
      border-radius: 50%;
      animation: loader-spin 0.9s linear infinite;
      box-shadow: 0 0 18px rgba(139,92,246,0.3);
    }
    @keyframes loader-spin {
      to { transform: rotate(360deg); }
    }

    /* Notas musicais */
    .loader-note {
      position: absolute;
      font-size: 16px;
      animation: note-float 2.4s ease-in-out infinite;
      opacity: 0;
      user-select: none;
    }
    .loader-note:nth-child(1) { top: 0;    left: 50%; transform: translateX(-50%); animation-delay: 0s;    font-size: 15px; }
    .loader-note:nth-child(2) { top: 20%;  right: 0;  animation-delay: 0.4s;  font-size: 13px; }
    .loader-note:nth-child(3) { bottom: 0; left: 50%; transform: translateX(-50%); animation-delay: 0.8s;  font-size: 17px; }
    .loader-note:nth-child(4) { top: 20%;  left: 0;   animation-delay: 1.2s;  font-size: 12px; }
    .loader-note:nth-child(5) { bottom: 20%; right: 0; animation-delay: 1.6s; font-size: 14px; }
    .loader-note:nth-child(6) { bottom: 20%; left: 0;  animation-delay: 2.0s; font-size: 13px; }

    @keyframes note-float {
      0%   { opacity: 0;   transform: translateY(4px)  scale(0.7); }
      30%  { opacity: 1;   transform: translateY(-6px) scale(1.1); }
      70%  { opacity: 0.7; transform: translateY(-12px) scale(1); }
      100% { opacity: 0;   transform: translateY(-20px) scale(0.8); }
    }

    /* Texto */
    .loader-text {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #a78bfa;
      letter-spacing: 0.5px;
      animation: loader-pulse 1.5s ease-in-out infinite;
    }
    @keyframes loader-pulse {
      0%, 100% { opacity: 0.6; }
      50%       { opacity: 1;   }
    }
  `;
  document.head.appendChild(style);

  const notes = ['♩','♪','♫','♬','𝅘𝅥𝅮','♭'];

  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.innerHTML = `
    <img src="../images/logo.png" alt="Backstage" class="loader-logo" onerror="this.style.display='none'">
    <div class="loader-scene">
      ${notes.map(n => `<span class="loader-note" style="color:#a78bfa">${n}</span>`).join('')}
      <div class="loader-ring"></div>
    </div>
    <span class="loader-text" id="loader-msg">Carregando...</span>
  `;
  document.body.appendChild(overlay);
}

injectLoader();

export function showLoading(msg = 'Carregando...') {
  // injectLoader() é idempotente (sai cedo se já existir), então é seguro
  // chamar sempre — cobre o caso de hideLoading() ter removido o overlay do DOM.
  injectLoader();
  const overlay = document.getElementById('loading-overlay');
  const msgEl = document.getElementById('loader-msg');
  if (overlay) overlay.classList.remove('hidden');
  if (msgEl) msgEl.textContent = msg;
}

export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 400);
}