import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from './database.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function up() {
  const db = await Database.connect();

  // Instrumentos
  const instrumentos = [
    'Violão','Guitarra','Baixo','Bateria','Teclado','Piano',
    'Saxofone','Trompete','Violino','Contrabaixo','Flauta',
    'Vocal','DJ','Cavaquinho','Percussão',
  ];
  for (const nome of instrumentos) {
    await db.run(`INSERT OR IGNORE INTO instrumento (nome) VALUES (?)`, [nome]);
  }

  // Gêneros
  const generos = [
    'Rock','MPB','Forró','Samba','Pop','Hip Hop','Jazz',
    'Blues','Metal','Funk','Eletrônica','Gospel','Reggae',
    'Bossa Nova','Indie',
  ];
  for (const nome of generos) {
    await db.run(`INSERT OR IGNORE INTO genero (nome) VALUES (?)`, [nome]);
  }

  // Disponibilidades — grade dias x períodos
  const disponibilidades = [
    // Períodos simples
    'Manhã', 'Tarde', 'Noite',
    // Por dia
    'Segunda - Manhã', 'Segunda - Tarde', 'Segunda - Noite',
    'Terça - Manhã',   'Terça - Tarde',   'Terça - Noite',
    'Quarta - Manhã',  'Quarta - Tarde',  'Quarta - Noite',
    'Quinta - Manhã',  'Quinta - Tarde',  'Quinta - Noite',
    'Sexta - Manhã',   'Sexta - Tarde',   'Sexta - Noite',
    'Sábado - Manhã',  'Sábado - Tarde',  'Sábado - Noite',
    'Domingo - Manhã', 'Domingo - Tarde', 'Domingo - Noite',
    // Blocos especiais
    'Fins de semana', 'Integral',
  ];
  for (const descricao of disponibilidades) {
    await db.run(`INSERT OR IGNORE INTO disponibilidade (descricao) VALUES (?)`, [descricao]);
  }

  // DAWs
  const daws = [
    'FL Studio','Ableton Live','Logic Pro','Pro Tools',
    'GarageBand','Studio One','Reaper','Cubase','Reason','Bitwig',
  ];
  for (const nome of daws) {
    await db.run(`INSERT OR IGNORE INTO daw (nome) VALUES (?)`, [nome]);
  }

  await db.close();

  // Usuários do seeders.json
  const seedPath = resolve(__dirname, 'seeders.json');
  const raw = JSON.parse(readFileSync(seedPath, 'utf-8'));
  const usuarios = raw.usuarios || raw;

  for (const usuario of usuarios) {
    const db2 = await Database.connect();

    const existe = await db2.get(`SELECT id_usuario FROM usuario WHERE email = ?`, [usuario.email]);
    if (existe) { await db2.close(); continue; }

    const { lastID: id } = await db2.run(
      `INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, biografia, cadastro_completo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.nome_completo, usuario.nome_artistico || usuario.nome_completo,
        usuario.email, usuario.senha, usuario.telefone || null,
        usuario.cidade || null, usuario.estado || null, usuario.bairro || null,
        Array.isArray(usuario.areas_atuacao) ? usuario.areas_atuacao[0] : (usuario.area_atuacao || null),
        usuario.biografia || null, 1,
      ]
    );

    for (const nomeInst of (usuario.instrumentos || [])) {
      const inst = await db2.get(`SELECT id_instrumento FROM instrumento WHERE nome = ?`, [nomeInst]);
      if (inst) await db2.run(`INSERT OR IGNORE INTO usuario_instrumento (id_usuario, id_instrumento) VALUES (?, ?)`, [id, inst.id_instrumento]);
    }
    for (const nomeGen of (usuario.generos || [])) {
      const gen = await db2.get(`SELECT id_genero FROM genero WHERE nome = ?`, [nomeGen]);
      if (gen) await db2.run(`INSERT OR IGNORE INTO usuario_genero (id_usuario, id_genero) VALUES (?, ?)`, [id, gen.id_genero]);
    }
    for (const descDisp of (usuario.disponibilidades || [])) {
      const disp = await db2.get(`SELECT id_disponibilidade FROM disponibilidade WHERE descricao = ?`, [descDisp]);
      if (disp) await db2.run(`INSERT OR IGNORE INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES (?, ?)`, [id, disp.id_disponibilidade]);
    }
    for (const nomeDaw of (usuario.daws || [])) {
      const daw = await db2.get(`SELECT id_daw FROM daw WHERE nome = ?`, [nomeDaw]);
      if (daw) await db2.run(`INSERT OR IGNORE INTO usuario_daw (id_usuario, id_daw) VALUES (?, ?)`, [id, daw.id_daw]);
    }

    await db2.close();
  }
}

export default { up };