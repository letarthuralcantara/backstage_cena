// Módulo responsável por funções utilitárias de manipulação do DOM

/**
 * Exibe uma mensagem de alerta na tela
 * @param {string} elementId - ID do elemento de alerta
 * @param {string} mensagem
 * @param {'error'|'success'} tipo
 */
export function mostrarAlerta(elementId, mensagem, tipo = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = mensagem;
    el.className = `alert alert-${tipo}`;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

/**
 * Gera checkboxes estilizados a partir de uma lista de opções
 * @param {HTMLElement} container - elemento onde os checkboxes serão inseridos
 * @param {Array} opcoes - [{ id, nome }]
 * @param {string} name - atributo name do input
 * @param {string} idPrefix - prefixo do id do input
 * @param {string[]} selecionados - IDs já selecionados
 */
export function gerarCheckboxes(container, opcoes, name, idPrefix, selecionados = []) {
    container.innerHTML = '';
    opcoes.forEach(op => {
        const marcado = selecionados.map(String).includes(String(op.id));
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="${idPrefix}_${op.id}" name="${name}" value="${op.id}" ${marcado ? 'checked' : ''}>
            <label for="${idPrefix}_${op.id}" class="checkbox-label">
                <div class="checkbox-icon"><i class="fa-solid fa-check"></i></div>
                ${op.nome}
            </label>`;
        container.appendChild(div);
    });
}

/**
 * Gera cards de área de atuação estilizados
 * @param {HTMLElement} container
 * @param {Array} areas - [{ id, nome, icone }]
 * @param {string[]} selecionadas
 */
export function gerarAreaCards(container, areas, selecionadas = []) {
    container.innerHTML = '';
    areas.forEach(area => {
        const marcado = selecionadas.includes(area.id);
        const div = document.createElement('div');
        div.className = 'area-card';
        div.innerHTML = `
            <input type="checkbox" id="area_${area.id}" name="areas_atuacao[]" value="${area.id}" ${marcado ? 'checked' : ''}>
            <label for="area_${area.id}" class="area-label">
                <div class="area-icon"><i class="fa-solid ${area.icone}"></i></div>
                <div class="area-name">${area.nome}</div>
                <div class="area-check"><i class="fa-solid fa-check"></i></div>
            </label>`;
        container.appendChild(div);
    });
}

/**
 * Lê os valores marcados de um grupo de checkboxes pelo name
 * @param {string} name
 * @returns {string[]}
 */
export function lerCheckboxes(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
        .map(el => el.value);
}

/**
 * Alterna visibilidade de senha em um input
 * @param {string} inputId
 * @param {HTMLElement} botao
 */
export function toggleSenha(inputId, botao) {
    const input = document.getElementById(inputId);
    const icon = botao.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}