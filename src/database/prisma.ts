import path from 'node:path'
import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// DATABASE_URL (ex: "file:./dev.db") é resolvida a partir da raiz do
// projeto — a mesma convenção usada em prisma.config.ts (datasource.url)
// e assumida quando os scripts do package.json (ex: "tsx watch src/server.ts")
// são executados com a raiz do projeto como diretório de trabalho.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurada no .env')

const relativeDbPath = databaseUrl.replace(/^file:/, '')
const absoluteDbPath = path.resolve(process.cwd(), relativeDbPath)

const adapter = new PrismaLibSql({ url: `file:${absoluteDbPath}` })
const prisma = new PrismaClient({ adapter } as any)

export default prisma