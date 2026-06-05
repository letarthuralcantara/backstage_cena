import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { open, Database as SqliteDb } from 'sqlite'

// Caminho absoluto baseado no arquivo atual — funciona em qualquer diretório
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dbFile = resolve(__dirname, 'db.sqlite')

async function connect(): Promise<SqliteDb> {
  return open({
    filename: dbFile,
    driver: sqlite3.Database,
  })
}

export default { connect }
