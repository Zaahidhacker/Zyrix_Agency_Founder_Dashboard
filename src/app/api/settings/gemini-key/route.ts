import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser, getGeminiKey, setGeminiKey, getGeminiModel, setGeminiModel } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureFounderUser();
    await requireUser();
    const [key, model] = await Promise.all([getGeminiKey(), getGeminiModel()]);
    // Return masked — never expose full key to client
    const masked = key
      ? key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4)
      : "";
    return NextResponse.json({ keySet: Boolean(key), masked, model });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFounderUser();
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const { apiKey, model } = body || {};

    if (apiKey !== undefined) {
      if (typeof apiKey !== "string") {
        return NextResponse.json({ error: "apiKey must be a string." }, { status: 400 });
      }
      await setGeminiKey(apiKey);
    }

    if (model !== undefined) {
      if (typeof model !== "string") {
        return NextResponse.json({ error: "model must be a string." }, { status: 400 });
      }
      await setGeminiModel(model);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings." },
      { status: 500 }
    );
  }
}
