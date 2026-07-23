import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl(): string {
  // 1. On Vercel (Serverless), /var/task is read-only.
  // Copy seed custom.db to /tmp/custom.db so SQLite queries and writes succeed without Error Code 14 / EROFS.
  if (process.env.VERCEL === "1") {
    const tmpDbPath = "/tmp/custom.db";
    if (!fs.existsSync(tmpDbPath)) {
      const seedDbPath = path.join(process.cwd(), "db", "custom.db");
      if (fs.existsSync(seedDbPath)) {
        try {
          fs.copyFileSync(seedDbPath, tmpDbPath);
        } catch (err) {
          console.error("Failed to copy seed database to /tmp:", err);
        }
      }
    }
    return `file:${tmpDbPath}`;
  }

  // 2. Local environment: dynamically resolve db/custom.db from process.cwd()
  const localDbPath = path.join(process.cwd(), "db", "custom.db");
  const normalizedPath = localDbPath.replace(/\\/g, "/");
  return `file:${normalizedPath}`;
}

// Override process.env.DATABASE_URL before PrismaClient initializes
process.env.DATABASE_URL = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;