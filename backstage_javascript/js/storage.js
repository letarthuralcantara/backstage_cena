// Módulo responsável por ler e salvar dados no localStorage

const CHAVE = 'usuarioLogado';

/**
 * Retorna o objeto do usuário logado ou null
 * @returns {Object|null}
 */
export function getUsuario() {
    const dados = localStorage.getItem(CHAVE);
    return dados ? JSON.parse(dados) : null;
}

/**
 * Salva o objeto do usuário no localStorage
 * @param {Object} usuario
 */
export function salvarUsuario(usuario) {
    localStorage.setItem(CHAVE, JSON.stringify(usuario));
}

/**
 * Remove o usuário do localStorage (logout)
 */
export function removerUsuario() {
    localStorage.removeItem(CHAVE);
}

/**
 * Atualiza campos específicos do usuário sem sobrescrever o restante
 * @param {Object} camposNovos
 */
export function atualizarUsuario(camposNovos) {
    const atual = getUsuario() || {};
    salvarUsuario({ ...atual, ...camposNovos });
}