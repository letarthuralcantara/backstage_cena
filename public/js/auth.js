// js/auth.js
// Módulo de autenticação: cadastro e login via localStorage.
// Exporta funções usadas pelas páginas cadastro.html e login.html.

/**
 * Salva os dados do formulário de cadastro no localStorage.
 * @param {Object} dados - objeto com os campos do formulário
 */
export async function salvarCadastro(dados) {
  const body = {
    nome_completo: dados.nome_completo,
    nome_artistico: dados.nome_artistico || dados.nome_completo,
    email: dados.email,
    senha: dados.senha,
    telefone: dados.telefone || null,
    cidade: dados.cidade,
    estado: dados.estado,
    bairro: dados.bairro || null,
    area_atuacao: dados.areas_atuacao?.[0] || null,
    anos_experiencia: Number(dados.anos_experiencia) || 0,
    biografia: dados.biografia || null,
  };

  const res = await fetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.erro || 'Erro ao cadastrar');
  }

  const usuario = await res.json();
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  return usuario;
}

export function getUsuarioLogado() {
  const u = localStorage.getItem('usuarioLogado');
  return u ? JSON.parse(u) : null;
}

export function fazerLogout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'login.html';
}

/**
 * Valida e-mail e senha contra os cadastros salvos.
 * @param {string} email
 * @param {string} senha
 * @returns {Object} usuário encontrado
 * @throws {Error} se credenciais inválidas
 */
export function fazerLogin(email, senha) {
  const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

  const usuario = usuarios.find(u => u.email === email && u.senha === senha);
  if (!usuario) {
    throw new Error('E-mail ou senha incorretos.');
  }

  // Salva sessão do usuário logado
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  return usuario;
}

/**
 * Remove o usuário da sessão (logout).
 */
export function fazerLogout() {
  localStorage.removeItem('usuarioLogado');
}

/**
 * Retorna o usuário logado ou null se não houver sessão.
 * @returns {Object|null}
 */
export function getUsuarioLogado() {
  return JSON.parse(localStorage.getItem('usuarioLogado'));
}
