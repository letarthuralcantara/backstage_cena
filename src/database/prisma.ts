import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '../../dev.db')

const adapter = new PrismaLibSql({ url: `file:${dbPath}` })

const prisma = new PrismaClient({ adapter } as any)

export default prisma