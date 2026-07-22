import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureFounderUser();
    const user = await requireUser();
    const leads = await db.lead.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      include: { outrechMessages: true, screenshots: true },
    });
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch leads." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFounderUser();
    const user = await requireUser();
    const body = await req.json();

    const {
      businessName,
      category,
      address,
      phone,
      email,
      whatsapp,
      websiteStatus,
      osmId,
      lat,
      lng,
    } = body;

    if (!businessName) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 }
      );
    }

    // Dedupe by osmId if present
    if (osmId) {
      const existing = await db.lead.findFirst({
        where: { userId: user.userId, osmId },
      });
      if (existing) {
        return NextResponse.json({ lead: existing, dedupe: true });
      }
    }

    const lead = await db.lead.create({
      data: {
        userId: user.userId,
        businessName,
        category: category || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        whatsapp: whatsapp || null,
        websiteStatus: websiteStatus || "none",
        osmId: osmId || null,
        lat: lat ?? null,
        lng: lng ?? null,
      },
    });

    return NextResponse.json({ lead, dedupe: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save lead." },
      { status: 500 }
    );
  }
}
