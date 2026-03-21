// js/auth.js
// Módulo de autenticação: cadastro e login via localStorage.
// Exporta funções usadas pelas páginas cadastro.html e login.html.

/**
 * Salva os dados do formulário de cadastro no localStorage.
 * @param {Object} dados - objeto com os campos do formulário
 */
export function salvarCadastro(dados) {
  // Busca cadastros existentes ou inicia array vazio
  const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

  // Verifica se o e-mail já está cadastrado
  const jaExiste = usuarios.some(u => u.email === dados.email);
  if (jaExiste) {
    throw new Error('E-mail já cadastrado.');
  }

  // Adiciona novo usuário e salva
  usuarios.push(dados);
  localStorage.setItem('usuarios', JSON.stringify(usuarios));

  // Define como usuário logado na sessão atual
  localStorage.setItem('usuarioLogado', JSON.stringify(dados));
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
