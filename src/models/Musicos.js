import { musicos } from '../database/data.js';

let proximoId = 9;

function validarMusico(dados) {
  const erros = [];

  if (!dados.nome || dados.nome.trim() === '')
    erros.push('O campo nome é obrigatório.');

  if (!dados.cidade || dados.cidade.trim() === '')
    erros.push('O campo cidade é obrigatório.');

  if (!dados.area || dados.area.trim() === '')
    erros.push('O campo area é obrigatório.');

  return erros;
}

function create(dados) {
  const erros = validarMusico(dados);

  if (erros.length > 0) throw new Error(erros.join(', '));

  const novoMusico = {
    id: dados.id || proximoId++,
    nome: dados.nome,
    nomeArtistico: dados.nomeArtistico || '',
    cidade: dados.cidade,
    estado: dados.estado || '',
    bio: dados.bio || '',
    instrumentos: dados.instrumentos || [],
    generos: dados.generos || [],
    area: dados.area,
    disponibilidade: dados.disponibilidade || [],
    iniciais: dados.iniciais || dados.nome.substring(0, 2).toUpperCase(),
  };

  musicos.push(novoMusico);
  return novoMusico;
}

function read(field, value) {
  if (field && value) {
    return musicos.filter(m => m[field].includes(value));
  }
  return musicos;
}

function readById(id) {
  const musico = musicos.find(m => m.id === id);
  if (!musico) throw new Error(`Músico com id ${id} não encontrado.`);
  return musico;
}

function update({ id, ...dados }) {
  const erros = validarMusico(dados);
  if (erros.length > 0) throw new Error(erros.join(', '));

  const indice = musicos.findIndex(m => m.id === id);
  if (indice === -1) throw new Error(`Músico com id ${id} não encontrado.`);

  musicos[indice] = { ...musicos[indice], ...dados, id };
  return musicos[indice];
}

function remove(id) {
  const indice = musicos.findIndex(m => m.id === id);
  if (indice === -1) throw new Error(`Músico com id ${id} não encontrado.`);

  musicos.splice(indice, 1);
  return true;
}

export default { create, read, readById, update, remove };