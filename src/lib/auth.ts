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
const FOUNDER_NAME = "Zaahid";

let seedPromise: Promise<void> | null = null;

export async function ensureFounderUser(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const existing = await db.user.findUnique({
        where: { email: FOUNDER_EMAIL },
      });
      if (!existing) {
        const passwordHash = await bcrypt.hash(FOUNDER_PASSWORD, SALT_ROUNDS);
        await db.user.create({
          data: {
            email: FOUNDER_EMAIL,
            passwordHash,
            name: FOUNDER_NAME,
            geminiModel: "gemini-2.5-flash",
          },
        });
      } else {
        const passwordMatches = await bcrypt.compare(
          FOUNDER_PASSWORD,
          existing.passwordHash
        );
        const dataToUpdate: Record<string, unknown> = {};
        if (!passwordMatches) {
          dataToUpdate.passwordHash = await bcrypt.hash(
            FOUNDER_PASSWORD,
            SALT_ROUNDS
          );
        }
        if (existing.name !== FOUNDER_NAME) {
          dataToUpdate.name = FOUNDER_NAME;
        }
        if ("geminiModel" in existing && (existing.geminiModel === "gemini-2.0-flash" || !existing.geminiModel)) {
          dataToUpdate.geminiModel = "gemini-2.5-flash";
        }
        if (Object.keys(dataToUpdate).length > 0) {
          try {
            await db.user.update({
              where: { email: FOUNDER_EMAIL },
              data: dataToUpdate,
            });
          } catch {
            delete dataToUpdate.geminiModel;
            if (Object.keys(dataToUpdate).length > 0) {
              await db.user.update({
                where: { email: FOUNDER_EMAIL },
                data: dataToUpdate,
              });
            }
          }
        }
      }
    } catch (err) {
      seedPromise = null;
      throw err;
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

async function signToken(payload: {
  userId: string;
  email: string;
  name?: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(JWT_SECRET));
}

async function verifyToken(token: string): Promise<{
  userId: string;
  email: string;
  name?: string;
} | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: (payload.name as string | undefined) ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  email: string,
  name?: string
) {
  const token = await signToken({ userId, email, name });
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

export interface SessionUser {
  userId: string;
  email: string;
  name?: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded) return null;

  // Always read the freshest name from the DB so a profile update is
  // reflected even before the JWT re-signs.
  const dbUser = await db.user.findUnique({
    where: { id: decoded.userId },
    select: { name: true },
  });
  return {
    userId: decoded.userId,
    email: decoded.email,
    name: dbUser?.name ?? decoded.name,
  };
}

export async function requireUser(): Promise<SessionUser> {
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

// Gemini model preferences. Stored per-user; the chosen model is passed to
// every Gemini call so we never silently fall back to a quota-exhausted one.
const FALLBACK_MODEL = "gemini-2.5-flash";

export async function getGeminiModel(): Promise<string> {
  const user = await getSessionUser();
  if (!user) return FALLBACK_MODEL;
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { geminiModel: true },
  });
  return dbUser?.geminiModel?.trim() || FALLBACK_MODEL;
}

export async function setGeminiModel(model: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  await db.user.update({
    where: { id: user.userId },
    data: { geminiModel: model.trim() || FALLBACK_MODEL },
  });
}
