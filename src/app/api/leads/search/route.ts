import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser } from "@/lib/auth";
import { searchLocalBusinesses, DEHIWALA_CENTER } from "@/lib/overpass";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureFounderUser();
    await requireUser();

    const body = await req.json().catch(() => ({}));
    const {
      query,
      category,
      lat,
      lng,
      radiusM,
      limit,
    } = body || {};

    const businesses = await searchLocalBusinesses({
      query: query || undefined,
      category: category || undefined,
      center:
        typeof lat === "number" && typeof lng === "number"
          ? { lat, lng, radiusM: radiusM || 5000 }
          : { ...DEHIWALA_CENTER, radiusM: radiusM || 5000 },
      limit: limit || 50,
    });

    return NextResponse.json({ businesses, count: businesses.length });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Local business search failed.",
      },
      { status: 500 }
    );
  }
}
