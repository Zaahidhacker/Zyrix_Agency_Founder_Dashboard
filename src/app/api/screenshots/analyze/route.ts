import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser, getGeminiKey } from "@/lib/auth";
import { analyzeImage } from "@/lib/gemini";
import { db } from "@/lib/db";
import { buildMasterPrompt } from "@/lib/master-prompt";

export const runtime = "nodejs";

const EXTRACTION_PROMPT = `You are analyzing a screenshot of a conversation between Zyrix (a web agency in Dehiwala, Sri Lanka) and a client.

Read the conversation carefully and extract structured project requirements.

Return STRICT JSON matching this exact schema:
{
  "businessName": "string — the client's business name if mentioned",
  "businessCategory": "string — e.g. Restaurant, Salon, Law Firm, Auto Repair",
  "websiteGoals": "string — 2-3 sentence summary of what the client wants the website to achieve",
  "requiredFeatures": ["string array — specific features requested, e.g. 'online booking', 'menu gallery', 'WhatsApp chat button'"],
  "targetAudience": "string — who the website is for, demographics and location",
  "designPreferences": "string — any style, color, or layout preferences mentioned",
  "contentSections": ["string array — page sections requested, e.g. 'Home', 'Services', 'About', 'Contact']",
  "contactInfo": "string — any contact details shared (phone, email, address)",
  "specialInstructions": "string — any other constraints, deadlines, or notes mentioned"
}

If a field is not mentioned in the conversation, return an empty string for string fields and an empty array for array fields. Do not invent details. Only output the JSON object — no commentary, no markdown fences.`;

export async function POST(req: NextRequest) {
  try {
    await ensureFounderUser();
    const user = await requireUser();
    const apiKey = await getGeminiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No Gemini API key set. Open Settings (top-right) and paste your Gemini API key first.",
        },
        { status: 400 }
      );
    }

    const { screenshotId } = await req.json();
    if (!screenshotId) {
      return NextResponse.json(
        { error: "screenshotId is required." },
        { status: 400 }
      );
    }

    const screenshot = await db.screenshot.findUnique({
      where: { id: screenshotId },
    });
    if (!screenshot || screenshot.userId !== user.userId) {
      return NextResponse.json(
        { error: "Screenshot not found." },
        { status: 404 }
      );
    }

    // Call Gemini vision for extraction
    const raw = await analyzeImage({
      apiKey,
      prompt: EXTRACTION_PROMPT,
      imageBase64: screenshot.fileData,
      mimeType: screenshot.fileType,
    });

    // Parse the JSON out of the response
    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          extracted = JSON.parse(match[0]);
        } catch {
          extracted = { rawExtraction: raw };
        }
      } else {
        extracted = { rawExtraction: raw };
      }
    }

    const requirements = {
      businessName: String(extracted.businessName || ""),
      businessCategory: String(extracted.businessCategory || ""),
      websiteGoals: String(extracted.websiteGoals || ""),
      requiredFeatures: Array.isArray(extracted.requiredFeatures)
        ? (extracted.requiredFeatures as string[])
        : [],
      targetAudience: String(extracted.targetAudience || ""),
      designPreferences: String(extracted.designPreferences || ""),
      contentSections: Array.isArray(extracted.contentSections)
        ? (extracted.contentSections as string[])
        : [],
      contactInfo: String(extracted.contactInfo || ""),
      specialInstructions: String(extracted.specialInstructions || ""),
    };

    // Get lead context if linked
    let leadContext = {
      businessName: requirements.businessName || "the client",
      category: requirements.businessCategory || "local business",
      address: "Sri Lanka",
      phone: "",
      email: "",
      whatsapp: "",
    };

    if (screenshot.leadId) {
      const lead = await db.lead.findUnique({
        where: { id: screenshot.leadId },
      });
      if (lead) {
        leadContext = {
          businessName: lead.businessName,
          category: lead.category || leadContext.category,
          address: lead.address || leadContext.address,
          phone: lead.phone || "",
          email: lead.email || "",
          whatsapp: lead.whatsapp || "",
        };
      }
    }

    const masterPrompt = buildMasterPrompt(requirements, leadContext);

    const updated = await db.screenshot.update({
      where: { id: screenshotId },
      data: {
        extractedText: raw,
        requirements: JSON.stringify(requirements),
        features: requirements.requiredFeatures.join("\n"),
        targetAudience: requirements.targetAudience,
        masterPrompt,
      },
    });

    return NextResponse.json({
      screenshot: {
        id: updated.id,
        requirements,
        masterPrompt,
        extractedText: raw,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screenshot analysis failed." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureFounderUser();
    const user = await requireUser();
    const screenshots = await db.screenshot.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        leadId: true,
        masterPrompt: true,
        requirements: true,
        targetAudience: true,
        features: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ screenshots });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch screenshots." },
      { status: 500 }
    );
  }
}
