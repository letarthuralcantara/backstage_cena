import Database from '../database/database.js';

async function create(dados) {
  const db = await Database.connect();

  const sql = `
    INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const { lastID } = await db.run(sql, [
    dados.nome_completo,
    dados.nome_artistico,
    dados.email,
    dados.senha,
    dados.telefone || null,
    dados.cidade || null,
    dados.estado || null,
    dados.bairro || null,
    dados.area_atuacao || null,
    dados.anos_experiencia || 0,
    dados.biografia || null,
  ]);

  await db.close();
  return readById(lastID);
}

async function read(field, value) {
  const db = await Database.connect();

  let sql = `SELECT * FROM usuario`;
  let params = [];

  if (field && value) {
    sql += ` WHERE ${field} = ?`;
    params = [value];
  }

  const usuarios = await db.all(sql, params);
  await db.close();
  return usuarios;
}

async function readById(id) {
  const db = await Database.connect();

  const sql = `SELECT * FROM usuario WHERE id_usuario = ?`;
  const usuario = await db.get(sql, [id]);

  await db.close();

  if (!usuario) throw new Error(`Usuário com id ${id} não encontrado.`);
  return usuario;
}

async function update({ id_usuario, ...dados }) {
  const db = await Database.connect();

  const sql = `
    UPDATE usuario
    SET nome_completo = ?, nome_artistico = ?, email = ?, telefone = ?,
        cidade = ?, estado = ?, bairro = ?, area_atuacao = ?, anos_experiencia = ?, biografia = ?
    WHERE id_usuario = ?
  `;

  const { changes } = await db.run(sql, [
    dados.nome_completo,
    dados.nome_artistico,
    dados.email,
    dados.telefone || null,
    dados.cidade || null,
    dados.estado || null,
    dados.bairro || null,
    dados.area_atuacao || null,
    dados.anos_experiencia || 0,
    dados.biografia || null,
    id_usuario,
  ]);

  await db.close();

  if (changes === 0) throw new Error(`Usuário com id ${id_usuario} não encontrado.`);
  return readById(id_usuario);
}

async function remove(id) {
  const db = await Database.connect();

  const sql = `DELETE FROM usuario WHERE id_usuario = ?`;
  const { changes } = await db.run(sql, [id]);

  await db.close();

  if (changes === 0) throw new Error(`Usuário com id ${id} não encontrado.`);
  return true;
}

export default { create, read, readById, update, remove };