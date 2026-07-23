import { PrismaClient } from "@prisma/client";

// Normalize Windows backslashes in DATABASE_URL if present to prevent SQLite Error Code 14
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/\\/g, "/");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;