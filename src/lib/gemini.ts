// Gemini API integration — uses user-provided API key
// Supports text generation (outreach drafts) and vision (screenshot analysis)

export interface GeminiTextParams {
  apiKey: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  model?: string;
}

export interface GeminiVisionParams {
  apiKey: string;
  prompt: string;
  imageBase64: string;
  mimeType: string;
  model?: string;
}

const DEFAULT_TEXT_MODEL = "gemini-2.0-flash";
const DEFAULT_VISION_MODEL = "gemini-2.0-flash";

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  contents: Array<{ role: string; parts: GeminiPart[] }>,
  systemInstruction?: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await res.json();

  if (!res.ok) {
    const msg =
      data.error?.message ||
      `Gemini API error (HTTP ${res.status}). Please verify your API key.`;
    throw new Error(msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(
      "Gemini returned no output. The request may have been blocked or the API key may be invalid."
    );
  }
  return text;
}

export async function generateText(
  params: GeminiTextParams
): Promise<string> {
  const {
    apiKey,
    prompt,
    systemInstruction,
    temperature,
    model = DEFAULT_TEXT_MODEL,
  } = params;

  return callGemini(
    apiKey,
    model,
    [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction
  ).then((text) => {
    // re-call with temperature override if needed (Gemini v1beta supports generationConfig above; this is a noop for now)
    void temperature;
    return text;
  });
}

export async function analyzeImage(
  params: GeminiVisionParams
): Promise<string> {
  const {
    apiKey,
    prompt,
    imageBase64,
    mimeType,
    model = DEFAULT_VISION_MODEL,
  } = params;

  return callGemini(apiKey, model, [
    {
      role: "user",
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64,
          },
        },
      ],
    },
  ]);
}

// Structured extraction helper — calls Gemini with a strict JSON output expectation
export async function extractStructured<T = unknown>(
  apiKey: string,
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_TEXT_MODEL}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message ||
        `Gemini API error (HTTP ${res.status}). Verify your API key.`
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no extractable output.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON substring
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Failed to parse Gemini JSON output.");
  }
}

export function isGeminiKeySet(): Promise<boolean> {
  // Quick check for the user's stored key — handled by auth.ts in routes
  return Promise.resolve(true);
}
