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

// Modern default model is gemini-2.5-flash. Fallbacks ensure zero downtime if a model hits quota limits.
const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
];

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
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

function pickModel(model?: string): string {
  const m = (model || DEFAULT_MODEL).trim();
  return m || DEFAULT_MODEL;
}

async function callGemini(
  apiKey: string,
  model: string,
  contents: Array<{ role: string; parts: GeminiPart[] }>,
  systemInstruction?: string,
  generationConfigOverride?: Record<string, unknown>
): Promise<string> {
  const requestedModel = pickModel(model);
  const modelsToTry = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel),
  ];

  let lastError: Error | null = null;

  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          ...(generationConfigOverride || {}),
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
        
        const lowerMsg = msg.toLowerCase();
        if (
          res.status === 429 ||
          res.status === 404 ||
          lowerMsg.includes("quota") ||
          lowerMsg.includes("exceeded") ||
          lowerMsg.includes("limit") ||
          lowerMsg.includes("not found")
        ) {
          lastError = new Error(msg);
          console.warn(`Gemini model ${m} failed (${msg}). Trying fallback model...`);
          continue;
        }
        throw new Error(msg);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const blockReason =
          data.promptFeedback?.blockReasonMessage ||
          data.promptFeedback?.blockReason;
        throw new Error(
          blockReason
            ? `Gemini blocked the request: ${blockReason}.`
            : "Gemini returned no output. The request may have been blocked or the API key may be invalid."
        );
      }

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errStr = lastError.message.toLowerCase();
      if (
        errStr.includes("quota") ||
        errStr.includes("exceeded") ||
        errStr.includes("limit") ||
        errStr.includes("429") ||
        errStr.includes("404")
      ) {
        console.warn(`Gemini model ${m} error (${lastError.message}). Attempting next model...`);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("All Gemini models failed to generate content.");
}

export async function generateText(
  params: GeminiTextParams
): Promise<string> {
  const {
    apiKey,
    prompt,
    systemInstruction,
    temperature,
    model = DEFAULT_MODEL,
  } = params;

  return callGemini(
    apiKey,
    model,
    [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction,
    typeof temperature === "number" ? { temperature } : undefined
  );
}

export async function analyzeImage(
  params: GeminiVisionParams
): Promise<string> {
  const {
    apiKey,
    prompt,
    imageBase64,
    mimeType,
    model = DEFAULT_MODEL,
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

// Structured extraction helper — calls Gemini with strict JSON output requirement
export async function extractStructured<T = unknown>(
  apiKey: string,
  prompt: string,
  model?: string,
  systemInstruction?: string
): Promise<T> {
  const text = await callGemini(
    apiKey,
    model || DEFAULT_MODEL,
    [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction,
    {
      temperature: 0.3,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    }
  );

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
  return Promise.resolve(true);
}
