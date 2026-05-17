import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import Database from './database.js';
import Musico from '../models/musico.js';

async function up() {
  const db = await Database.connect();

  const instrumentos = [
    'Violão','Guitarra','Baixo','Bateria','Teclado','Piano',
    'Saxofone','Vocal','DJ','Percussão','Sanfona','Zabumba',
    'Flauta','Trompete','Ukulele'
  ];
  for (const nome of instrumentos) {
    await db.run(`INSERT OR IGNORE INTO instrumento (nome) VALUES (?)`, [nome]);
  }

  const generos = [
    'Rock','Pop','MPB','Samba','Forró','Jazz','Blues','Reggae',
    'Hip Hop','Eletrônica','Funk','Gospel','Metal','Indie','Bossa Nova'
  ];
  for (const nome of generos) {
    await db.run(`INSERT OR IGNORE INTO genero (nome) VALUES (?)`, [nome]);
  }

  const disponibilidades = [
    'Manhã','Tarde','Noite','Segunda','Terça','Quarta',
    'Quinta','Sexta','Sábado','Domingo','Integral',
    'Fins de semana','Eventos','Shows','Gravações'
  ];
  for (const descricao of disponibilidades) {
    await db.run(`INSERT OR IGNORE INTO disponibilidade (descricao) VALUES (?)`, [descricao]);
  }
  const daws = [
  'FL Studio', 'Ableton Live', 'Logic Pro', 'Pro Tools',
  'Reaper', 'GarageBand', 'Studio One', 'Cubase',
  'Reason', 'Bitwig Studio'
];
for (const nome of daws) {
  await db.run(`INSERT OR IGNORE INTO daw (nome) VALUES (?)`, [nome]);
}

  await db.close();

  const file = resolve('src', 'database', 'seeders.json');
  const seed = JSON.parse(readFileSync(file));

  for (const usuario of seed.usuarios) {
    const criado = await Musico.create(usuario);
    const id = criado.id_usuario;

    const db2 = await Database.connect();

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