import { resolve } from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbFile = resolve('src', 'database', 'db.sqlite');

async function connect() {
  return open({
    filename: dbFile,
    driver: sqlite3.Database
  });
}

export default { connect };
