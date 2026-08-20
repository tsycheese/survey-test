import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client"

const connectionString = process.env.DATABASE_URL || ""

const adapter = new PrismaPg({
  connectionString,
  ...(process.env.NODE_ENV === "development"
    ? {
        // 开发时保留已建立的远程连接，避免 node-postgres 默认 10 秒空闲回收
        // 导致每次编辑操作都重新进行跨区域 TLS/PostgreSQL 握手。
        min: 1,
        max: 5,
        idleTimeoutMillis: 5 * 60 * 1000,
        connectionTimeoutMillis: 15 * 1000,
        keepAlive: true,
      }
    : {}),
})

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
