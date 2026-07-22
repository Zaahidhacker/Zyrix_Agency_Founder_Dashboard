import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureFounderUser();
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead || lead.userId !== user.userId) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const allowed = [
      "status",
      "approved",
      "projectDeliveryDate",
      "conversationHistory",
      "websiteStatus",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key];
      }
    }

    // If approved is being toggled true and no status set, set status=approved
    if (data.approved === true && !data.status) {
      data.status = "approved";
    }
    if (data.approved === false && !data.status) {
      data.status = "contacted";
    }

    const updated = await db.lead.update({ where: { id }, data });
    return NextResponse.json({ lead: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update lead." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureFounderUser();
    const user = await requireUser();
    const { id } = await params;

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead || lead.userId !== user.userId) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    await db.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete lead." },
      { status: 500 }
    );
  }
}
