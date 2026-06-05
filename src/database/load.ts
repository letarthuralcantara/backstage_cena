import Migration from './migrations.js';
import Seed from './seeders.js';

async function load() {
  await Migration.up();
  await Seed.up();
}

load();