import Database from './database.js';

async function up() {
  const db = await Database.connect();


    await db.run(`
    CREATE TABLE IF NOT EXISTS usuario (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_completo VARCHAR(150) NOT NULL,
      nome_artistico VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      telefone VARCHAR(20),
      cidade VARCHAR(100),
      estado VARCHAR(2),
      bairro VARCHAR(100),
      area_atuacao VARCHAR(100),
      anos_experiencia INT DEFAULT 0,
      biografia TEXT,
      cadastro_completo INTEGER DEFAULT 0
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS instrumento (
      id_instrumento INTEGER PRIMARY KEY AUTOINCREMENT,
      nome VARCHAR(100) NOT NULL UNIQUE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS genero (
      id_genero INTEGER PRIMARY KEY AUTOINCREMENT,
      nome VARCHAR(100) NOT NULL UNIQUE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS disponibilidade (
      id_disponibilidade INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS daw (
      id_daw INTEGER PRIMARY KEY AUTOINCREMENT,
      nome VARCHAR(100) NOT NULL UNIQUE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS usuario_instrumento (
      id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
      id_instrumento INTEGER REFERENCES instrumento(id_instrumento) ON DELETE CASCADE,
      principal INTEGER DEFAULT 0,
      PRIMARY KEY (id_usuario, id_instrumento)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS usuario_genero (
      id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
      id_genero INTEGER REFERENCES genero(id_genero) ON DELETE CASCADE,
      preferencia INTEGER DEFAULT 1,
      PRIMARY KEY (id_usuario, id_genero)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS usuario_disponibilidade (
      id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
      id_disponibilidade INTEGER REFERENCES disponibilidade(id_disponibilidade) ON DELETE CASCADE,
      PRIMARY KEY (id_usuario, id_disponibilidade)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS usuario_daw (
      id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
      id_daw INTEGER REFERENCES daw(id_daw) ON DELETE CASCADE,
      PRIMARY KEY (id_usuario, id_daw)
    )
  `);

  await db.close();
}

export default { up };