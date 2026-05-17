import Database from '../database/database.js';

async function listarInstrumentos() {
  const db = await Database.connect();
  const instrumentos = await db.all(`SELECT nome FROM instrumento ORDER BY nome`);
  await db.close();
  return instrumentos.map(i => i.nome);
}

async function listarGeneros() {
  const db = await Database.connect();
  const generos = await db.all(`SELECT nome FROM genero ORDER BY nome`);
  await db.close();
  return generos.map(g => g.nome);
}
async function listarDaws() {
  const db = await Database.connect();
  const daws = await db.all(`SELECT nome FROM daw ORDER BY nome`);
  await db.close();
  return daws.map(d => d.nome);
}
async function listarDisponibilidades() {
  const db = await Database.connect();
  const disponibilidades = await db.all(`SELECT descricao FROM disponibilidade ORDER BY id_disponibilidade`);
  await db.close();
  return disponibilidades.map(d => d.descricao);
}


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

  // Para cada usuário, busca instrumentos, gêneros e disponibilidades
  for (const u of usuarios) {
    const instrumentos = await db.all(`
      SELECT i.nome FROM instrumento i
      INNER JOIN usuario_instrumento ui ON i.id_instrumento = ui.id_instrumento
      WHERE ui.id_usuario = ?
    `, [u.id_usuario]);

    const generos = await db.all(`
      SELECT g.nome FROM genero g
      INNER JOIN usuario_genero ug ON g.id_genero = ug.id_genero
      WHERE ug.id_usuario = ?
    `, [u.id_usuario]);

    const disponibilidades = await db.all(`
      SELECT d.descricao FROM disponibilidade d
      INNER JOIN usuario_disponibilidade ud ON d.id_disponibilidade = ud.id_disponibilidade
      WHERE ud.id_usuario = ?
    `, [u.id_usuario]);
    const daws = await db.all(`
      SELECT d.nome FROM daw d
      INNER JOIN usuario_daw ud ON d.id_daw = ud.id_daw
      WHERE ud.id_usuario = ?
      `, [u.id_usuario]);

u.daws = daws.map(d => d.nome);

    u.instrumentos = instrumentos.map(i => i.nome);
    u.generos = generos.map(g => g.nome);
    u.disponibilidades = disponibilidades.map(d => d.descricao);
  }

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

export default { create, read, readById, update, remove, listarInstrumentos, listarGeneros, listarDaws, listarDisponibilidades };