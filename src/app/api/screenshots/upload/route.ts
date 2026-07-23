import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// 8 MB upload ceiling — matches the UI copy ("up to 8MB each").
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await ensureFounderUser();
    const user = await requireUser();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data upload." },
        { status: 400 }
      );
    }

    const file = form.get("file");
    const rawLeadId = form.get("leadId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB).` },
        { status: 413 }
      );
    }

    // Resolve optional lead link — must belong to the signed-in user.
    let leadId: string | null = null;
    if (typeof rawLeadId === "string" && rawLeadId.trim()) {
      const lead = await db.lead.findUnique({
        where: { id: rawLeadId.trim() },
        select: { id: true, userId: true },
      });
      if (!lead || lead.userId !== user.userId) {
        return NextResponse.json(
          { error: "Lead not found." },
          { status: 404 }
        );
      }
      leadId = lead.id;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileData = buffer.toString("base64");

    const screenshot = await db.screenshot.create({
      data: {
        userId: user.userId,
        leadId,
        fileName: file.name || "screenshot",
        fileType: file.type || "image/png",
        fileSize: file.size,
        fileData,
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        leadId: true,
      },
    });

    return NextResponse.json(screenshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
