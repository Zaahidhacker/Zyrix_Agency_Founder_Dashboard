import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE = "zyrix_session";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "zyrix-agency-dehiwala-sri-lanka-secret-key-2024-change-in-production-please";
const SALT_ROUNDS = 10;

// Default founder credentials
export const FOUNDER_EMAIL = "zyrix@founder.agency";
const FOUNDER_PASSWORD = "Zaahid2290";

let seedPromise: Promise<void> | null = null;

export async function ensureFounderUser(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const existing = await db.user.findUnique({
      where: { email: FOUNDER_EMAIL },
    });
    if (!existing) {
      const passwordHash = await bcrypt.hash(FOUNDER_PASSWORD, SALT_ROUNDS);
      await db.user.create({
        data: {
          email: FOUNDER_EMAIL,
          passwordHash,
          name: "Zyrix Founder",
        },
      });
    }
  })();
  return seedPromise;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function signToken(payload: { userId: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(JWT_SECRET));
}

async function verifyToken(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, email: string) {
  const token = await signToken({ userId, email });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(): Promise<{
  userId: string;
  email: string;
}> {
  await ensureFounderUser();
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getGeminiKey(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { geminiApiKey: true },
  });
  return dbUser?.geminiApiKey || null;
}

export async function setGeminiKey(key: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  await db.user.update({
    where: { id: user.userId },
    data: { geminiApiKey: key.trim() || null },
  });
}
