import { NextResponse } from "next/server";
import { ensureFounderUser, getSessionUser, getGeminiKey } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureFounderUser();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null, geminiKeySet: false });
    }
    const key = await getGeminiKey();
    return NextResponse.json({
      user: { id: user.userId, email: user.email },
      geminiKeySet: Boolean(key),
    });
  } catch {
    return NextResponse.json({ user: null, geminiKeySet: false });
  }
}
