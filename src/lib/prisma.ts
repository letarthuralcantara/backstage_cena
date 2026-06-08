import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}