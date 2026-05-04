import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import Musico from '../models/musico.js';

async function up() {
  const file = resolve('src', 'database', 'seeders.json');
  const seed = JSON.parse(readFileSync(file));

  for (const musico of seed.musicos) {
    await Musico.create(musico);
  }
}

export default { up };