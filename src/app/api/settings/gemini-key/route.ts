import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser, getGeminiKey, setGeminiKey } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureFounderUser();
    await requireUser();
    const key = await getGeminiKey();
    // Return masked — never expose full key to client
    const masked = key
      ? key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4)
      : "";
    return NextResponse.json({ keySet: Boolean(key), masked });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch key." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFounderUser();
    await requireUser();
    const { apiKey } = await req.json();
    if (typeof apiKey !== "string") {
      return NextResponse.json({ error: "apiKey required." }, { status: 400 });
    }
    await setGeminiKey(apiKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save key." },
      { status: 500 }
    );
  }
}
