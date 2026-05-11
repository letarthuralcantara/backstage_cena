import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbFile = resolve('src', 'database', 'db.sqlite');

function parseParams(params = []) {
  return Array.isArray(params) ? params : [params];
}

function parseRow(row) {
  return row ? { ...row } : row;
}

function createPromiseDatabase(database) {
  return {
    async run(sql, params) {
      const result = database.prepare(sql).run(...parseParams(params));

      return {
        changes: result.changes,
        lastID: Number(result.lastInsertRowid),
      };
    },

    async get(sql, params) {
      return parseRow(database.prepare(sql).get(...parseParams(params)));
    },

    async all(sql, params) {
      return database.prepare(sql).all(...parseParams(params)).map(parseRow);
    },

    async close() {
      database.close();
    },
  };
}

async function connect() {
  return createPromiseDatabase(new DatabaseSync(dbFile));
}

export default { connect };