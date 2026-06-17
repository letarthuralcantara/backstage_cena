import { verificarAutenticacao, fazerLogout } from './auth.js';

// ── Helpers de status ─────────────────────────────────────────────────────────
const STATUS_INFO = {
  disponivel:   { cor: '#22c55e', emoji: '🟢', label: 'Disponível' },
  ocupado:      { cor: '#eab308', emoji: '🟡', label: 'Ocupado' },
  nao_perturbe: { cor: '#ef4444', emoji: '🔴', label: 'Não perturbe' },
  invisivel:    { cor: '#6b7280', emoji: '⚫', label: 'Invisível' },
};

function getStatusInfo(status) {
  return STATUS_INFO[status] || STATUS_INFO['disponivel'];
}

function criarBolinhaStatus(status) {
  const info = getStatusInfo(status);
  const bolinha = document.createElement('span');
  bolinha.className = 'status-dot';
  bolinha.style.cssText = `
    position: absolute;
    bottom: 6px; right: 6px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: ${info.cor};
    border: 3px solid #0f0f0f;
    z-index: 10;
  `;
  bolinha.title = info.label;
  return bolinha;
}

// ── Helper de cadastro completo ───────────────────────────────────────────────
function calcularFaltando(u) {
  const faltando = [];
  if (!u.instrumentos || u.instrumentos.length === 0) faltando.push('pelo menos 1 instrumento');
  if (!u.generos || u.generos.length === 0) faltando.push('pelo menos 1 gênero');
  if (!u.estado) faltando.push('estado');
  const bio = (u.biografia || '').trim();
  if (bio.length < 20) faltando.push('biografia com mínimo 20 caracteres');
  const areas = Array.isArray(u.area_atuacao) ? u.area_atuacao : (u.area_atuacao ? [u.area_atuacao] : []);
  if (areas.length === 0) faltando.push('área de atuação');
  return faltando;
}

export async function iniciarPerfil() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  let u;

  if (idParam) {
    const res = await fetch(`/api/usuarios/${idParam}`);
    u = await res.json();
  } else {
    const usuarioLocal = verificarAutenticacao();
    if (!usuarioLocal) return;
    const res = await fetch(`/api/usuarios/${usuarioLocal.id_usuario}`);
    u = await res.json();
  }

  const nome = u.nome_artistico || u.nome_completo;
  const iniciais = nome.substring(0, 2).toUpperCase();

  document.getElementById('avatar').textContent = iniciais;
  document.getElementById('nomeExibir').textContent = nome;
  document.getElementById('emailExibir').textContent = u.email;
  document.getElementById('localExibir').textContent = `${u.cidade || ''}, ${u.estado || ''}`;
  document.getElementById('bioExibir').textContent = u.biografia || 'Sem descrição ainda.';

  const profileTrigger = document.getElementById('profileTrigger');
  if (profileTrigger) profileTrigger.textContent = iniciais;

  // ── Bolinha de status no avatar ───────────────────────────────────────────
  const avatarContainer = document.querySelector('.avatar-container');
  if (avatarContainer) {
    // Garantir position: relative no container
    avatarContainer.style.position = 'relative';
    const bolinha = criarBolinhaStatus(u.status || 'disponivel');
    avatarContainer.appendChild(bolinha);
  }

  // ── Área de atuação ───────────────────────────────────────────────────────
  const areas = Array.isArray(u.area_atuacao) ? u.area_atuacao : (u.area_atuacao ? [u.area_atuacao] : []);
  if (areas.length > 0) {
    const badge = document.getElementById('areaBadge');
    badge.textContent = areas.join(', ');
    badge.classList.remove('hidden');
  }

  if (u.telefone) {
    document.getElementById('telefoneExibir').textContent = u.telefone;
    document.getElementById('telefoneRow').classList.remove('hidden');
  }
  if (u.bairro) {
    document.getElementById('bairroExibir').textContent = u.bairro;
    document.getElementById('bairroRow').classList.remove('hidden');
  }
  if (u.anos_experiencia) {
    document.getElementById('expExibir').textContent = `${u.anos_experiencia} anos de experiência`;
    document.getElementById('expRow').classList.remove('hidden');
  }

  // ── Redes sociais ─────────────────────────────────────────────────────────
  const redes = u.redes_sociais || {};
  const socialSection = document.getElementById('socialSection');
  const socialLinks = document.getElementById('socialLinks');
  if (socialSection && socialLinks) {
    const redesEntries = Object.entries(redes).filter(([, v]) => v);
    if (redesEntries.length > 0) {
      const icones = {
        instagram: 'fa-instagram', youtube: 'fa-youtube', spotify: 'fa-spotify',
        soundcloud: 'fa-soundcloud', tiktok: 'fa-tiktok', twitter: 'fa-twitter',
        facebook: 'fa-facebook', linkedin: 'fa-linkedin', site: 'fa-globe'
      };
      socialLinks.innerHTML = redesEntries.map(([k, v]) =>
        `<a href="${v}" target="_blank" class="social-link">
          <i class="fab ${icones[k] || 'fa-link'}"></i> ${k}
        </a>`
      ).join('');
      socialSection.classList.remove('hidden');
    }
  }

  // ── Instrumentos e gêneros ────────────────────────────────────────────────
  const talentosCont = document.getElementById('talentosCont');
  if (u.instrumentos?.length) {
    talentosCont.innerHTML = `<div class="tags-grid">${u.instrumentos.map(i =>
      `<span class="tag"><i class="fas fa-guitar"></i>${i}</span>`
    ).join('')}</div>`;
  } else {
    talentosCont.innerHTML = '<p class="empty-state">Nenhum instrumento cadastrado.</p>';
  }

  const generosCont = document.getElementById('generosCont');
  if (u.generos?.length) {
    generosCont.innerHTML = `<div class="tags-grid">${u.generos.map(g =>
      `<span class="tag">${g}</span>`
    ).join('')}</div>`;
  } else {
    generosCont.innerHTML = '<p class="empty-state">Nenhum gênero cadastrado.</p>';
  }

  // ── Agenda/Disponibilidade por horário ────────────────────────────────────
  const agendaCont = document.getElementById('agendaCont');
  if (agendaCont) {
    if (u.disponibilidades?.length) {
      agendaCont.innerHTML = `<div class="tags-grid">${u.disponibilidades.map(d =>
        `<span class="tag"><i class="fas fa-calendar-alt"></i>${d}</span>`
      ).join('')}</div>`;
    } else {
      agendaCont.innerHTML = '<p class="empty-state">Nenhuma disponibilidade informada.</p>';
    }
  }

  // ── Banner de cadastro incompleto (só no perfil próprio) ──────────────────
  if (!idParam) {
    const faltando = calcularFaltando(u);
    if (faltando.length > 0) {
      const banner = document.createElement('div');
      banner.style.cssText = `
        background: rgba(139,92,246,0.15);
        border: 1px solid rgba(139,92,246,0.4);
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 24px;
      `;
      banner.innerHTML = `
        <div style="display:flex; align-items:flex-start; gap:12px;">
          <i class="fas fa-circle-exclamation" style="color:#a78bfa; font-size:20px; margin-top:2px; flex-shrink:0;"></i>
          <div style="flex:1;">
            <p style="font-weight:600; color:#e5e7eb; margin:0 0 6px;">Seu perfil está incompleto — você não aparece nas buscas</p>
            <p style="font-size:13px; color:#9ca3af; margin:0 0 8px;">Para aparecer nas pesquisas, adicione:</p>
            <ul style="margin:0; padding-left:18px; color:#9ca3af; font-size:13px;">
              ${faltando.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>
          <a href="editar.html" style="
            white-space: nowrap;
            padding: 10px 20px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border-radius: 8px;
            color: white;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            flex-shrink: 0;
          ">Completar agora</a>
        </div>
      `;
      document.querySelector('.container').prepend(banner);
    }

    // ── Dropdown de status no avatar (só no perfil próprio) ───────────────
    _adicionarDropdownStatus(u);
  }

  // ── Dropdown e logout ─────────────────────────────────────────────────────
  document.getElementById('profileDropdown')?.addEventListener('click', () => {
    document.getElementById('profileDropdown').classList.toggle('active');
  });
  document.getElementById('btnSair')?.addEventListener('click', fazerLogout);
}

function _adicionarDropdownStatus(u) {
  const avatarEl = document.getElementById('avatar');
  if (!avatarEl) return;

  // Criar menu de status
  const menu = document.createElement('div');
  menu.id = 'statusMenu';
  menu.style.cssText = `
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a2e;
    border: 1px solid rgba(139,92,246,0.3);
    border-radius: 12px;
    padding: 8px;
    z-index: 100;
    min-width: 180px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  `;

  const statusOpcoes = [
    { value: 'disponivel',   emoji: '🟢', label: 'Disponível' },
    { value: 'ocupado',      emoji: '🟡', label: 'Ocupado' },
    { value: 'nao_perturbe', emoji: '🔴', label: 'Não perturbe' },
    { value: 'invisivel',    emoji: '⚫', label: 'Invisível' },
  ];

  menu.innerHTML = statusOpcoes.map(s => `
    <div class="status-opcao" data-status="${s.value}" style="
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      color: #e5e7eb; font-size: 14px;
      transition: background 0.2s;
      ${(u.status || 'disponivel') === s.value ? 'background: rgba(139,92,246,0.2);' : ''}
    ">
      <span>${s.emoji}</span>
      <span>${s.label}</span>
      ${(u.status || 'disponivel') === s.value ? '<i class="fas fa-check" style="margin-left:auto; color:#a78bfa;"></i>' : ''}
    </div>
  `).join('');

  // Hover nos itens
  menu.querySelectorAll('.status-opcao').forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(139,92,246,0.15)';
    });
    item.addEventListener('mouseleave', () => {
      if (item.dataset.status !== (u.status || 'disponivel')) {
        item.style.background = '';
      }
    });
  });

  const avatarContainer = document.querySelector('.avatar-container');
  if (avatarContainer) {
    avatarContainer.style.position = 'relative';
    avatarContainer.appendChild(menu);
  }

  // Toggle menu ao clicar no avatar
  avatarEl.style.cursor = 'pointer';
  avatarEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
  });

  // Fechar ao clicar fora
  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  // Selecionar status
  menu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const opcao = e.target.closest('.status-opcao');
    if (!opcao) return;
    const novoStatus = opcao.dataset.status;
    const usuarioLocal = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLocal) return;
    try {
      const res = await fetch(`/api/usuarios/${usuarioLocal.id_usuario}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar status');
      const atualizado = await res.json();
      usuarioLocal.status = novoStatus;
      localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLocal));
      // Atualizar bolinha
      const bolinha = document.querySelector('.status-dot');
      if (bolinha) {
        const info = getStatusInfo(novoStatus);
        bolinha.style.background = info.cor;
        bolinha.title = info.label;
      }
      // Atualizar menu
      menu.querySelectorAll('.status-opcao').forEach(item => {
        const check = item.querySelector('.fa-check');
        if (check) check.remove();
        item.style.background = '';
        if (item.dataset.status === novoStatus) {
          item.style.background = 'rgba(139,92,246,0.2)';
          item.insertAdjacentHTML('beforeend', '<i class="fas fa-check" style="margin-left:auto; color:#a78bfa;"></i>');
        }
      });
      u.status = novoStatus;
      menu.style.display = 'none';
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  });
}