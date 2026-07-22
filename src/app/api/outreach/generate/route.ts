import { NextRequest, NextResponse } from "next/server";
import { ensureFounderUser, requireUser, getGeminiKey } from "@/lib/auth";
import { generateText } from "@/lib/gemini";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are Zyrix's outreach copywriter. Zyrix is a web development agency based in Dehiwala, Sri Lanka.
Your job is to write a single, ready-to-send first-contact message (either email or WhatsApp) to a local business that doesn't have a website or has an outdated one.

Strict rules:
- Open warmly but professionally. Never sound spammy or generic.
- Mention Zyrix explicitly and that we're based in Dehiwala, Sri Lanka.
- Highlight our competitive pricing: we charge a MINIMUM of LKR 5,000 — competitors typically charge LKR 20,000+ for the same work.
- Reference the business by name and one specific detail (their category or address).
- Keep the message short and skimmable.
- For WhatsApp: keep under 200 words, no subject line, no formal salutation block.
- For email: include a subject line on the first line, then a body under 250 words.
- End with a clear, low-friction call to action (a yes/no question or a 5-min call request).
- Use Sri Lankan English spelling (e.g. "programme", "colour").
- Never invent phone numbers, websites, or testimonials.`;

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

    const body = await req.json();
    const { leadId, channel } = body as { leadId: string; channel: "email" | "whatsapp" };

    if (!leadId || !channel) {
      return NextResponse.json(
        { error: "leadId and channel are required." },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.userId !== user.userId) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const prompt = `Write a ${channel === "email" ? "cold email" : "WhatsApp direct message"} first-contact outreach for the business below.

Business details:
- Name: ${lead.businessName}
- Category: ${lead.category || "Local business"}
- Address: ${lead.address || "Sri Lanka"}
- Phone: ${lead.phone || "—"}
- Email: ${lead.email || "—"}
- WhatsApp: ${lead.whatsapp || "—"}
- Website status: ${lead.websiteStatus === "none" ? "No website" : lead.websiteStatus === "basic" ? "Basic website" : "Outdated website"}

Channel: ${channel}

Output the message only — no commentary, no markdown fences.`;

    const content = await generateText({
      apiKey,
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
    });

    const outreach = await db.outreach.create({
      data: { leadId, channel, content },
    });

    // Append to lead conversation history
    const history = lead.conversationHistory
      ? JSON.parse(lead.conversationHistory)
      : { messages: [] };
    history.messages.push({
      role: "agent",
      channel,
      content,
      timestamp: new Date().toISOString(),
    });
    await db.lead.update({
      where: { id: leadId },
      data: { conversationHistory: JSON.stringify(history), status: "contacted" },
    });

    return NextResponse.json({ outreach, content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate outreach." },
      { status: 500 }
    );
  }
}
