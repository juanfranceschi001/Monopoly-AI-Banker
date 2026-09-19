/**
 * Monopoly AI Banker image-scan proxy.
 *
 * Holds the real Gemini API key server-side (a Worker secret) so it never
 * ships inside the app's client bundle -- the app is a webpage wrapped in a
 * WebView, so a client-held key would be readable by anyone who opens it.
 *
 * The RATE_LIMITER binding is a burst-abuse guard (20 requests/60s per IP),
 * not a daily cap -- Cloudflare's native rate limiter only supports 10s/60s
 * windows. The actual daily cost ceiling is that GEMINI_API_KEY lives on a
 * Google Cloud project with no billing account linked, so once Gemini's own
 * free-tier quota is exhausted calls just fail (relayed below as a 502)
 * instead of charging anything.
 */

export interface Env {
  RATE_LIMITER: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
  GEMINI_API_KEY: string;
}

// Gemini's flash models occasionally return a transient 503 "high demand"
// error. Rather than retrying the same overloaded model, fall through an
// ordered list of models spanning different generations/tiers -- each is a
// separate capacity pool, so one being busy doesn't mean the others are.
// All confirmed working against this API key via a live test call before
// being added here. gemini-2.5-flash and gemini-2.5-flash-lite are
// confirmed dead (404 "no longer available to new users").
const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
];

const RETRYABLE_STATUS = new Set([503, 429]);
const FULL_CHAIN_RETRY_DELAY_MS = 2000;

const PROMPT = `Analyze this photo of Monopoly game assets. Identify:
1. The denominations of the Monopoly money shown and how many of each (e.g., $1, $5, $10, $20, $50, $100, $500).
2. Any property title deed cards visible (e.g., Boardwalk, Park Place, Reading Railroad).

Return the data as a clean JSON object. Only include clearly visible items. If nothing is visible, return empty arrays.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    detectedMoney: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          denomination: { type: "NUMBER" },
          count: { type: "NUMBER" },
        },
        required: ["denomination", "count"],
      },
    },
    detectedProperties: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    totalValue: { type: "NUMBER" },
  },
  required: ["detectedMoney", "detectedProperties", "totalValue"],
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://franceschiindustries.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

interface AttemptResult {
  ok: boolean;
  status: number;
  text: string;
}

async function callModel(model: string, image: string, apiKey: string): Promise<AttemptResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const upstream = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: image } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });
  const text = await upstream.text();
  return { ok: upstream.ok, status: upstream.status, text };
}

/** Tries each model in order, moving on only from capacity-related (503/429) failures. */
async function callWithFallback(image: string, apiKey: string): Promise<AttemptResult> {
  let lastResult: AttemptResult | null = null;
  for (const model of GEMINI_MODELS) {
    const result = await callModel(model, image, apiKey);
    if (result.ok) return result;
    console.error(`Gemini ${model} error ${result.status}: ${result.text}`);
    lastResult = result;
    if (!RETRYABLE_STATUS.has(result.status)) {
      return result; // Not a capacity issue -- retrying elsewhere won't help.
    }
  }
  return lastResult!;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/") {
      return json({ status: "ok" });
    }

    if (url.pathname !== "/analyze") {
      return json({ error: "not found" }, 404);
    }

    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return json({ error: "Too many requests. Please slow down and try again in a minute." }, 429);
    }

    let image: string;
    try {
      const payload = await request.json<{ image?: string }>();
      image = payload.image || "";
    } catch {
      return json({ error: "invalid request body" }, 400);
    }

    if (!image) {
      return json({ error: "missing image" }, 400);
    }

    console.log(`analyze request: base64 length=${image.length}`);

    let result = await callWithFallback(image, env.GEMINI_API_KEY);

    if (!result.ok && RETRYABLE_STATUS.has(result.status)) {
      // Every model in the chain was busy -- worth one full pass again
      // after a short wait, since these blips are usually brief.
      await new Promise((resolve) => setTimeout(resolve, FULL_CHAIN_RETRY_DELAY_MS));
      result = await callWithFallback(image, env.GEMINI_API_KEY);
    }

    if (!result.ok) {
      return json({ error: "upstream error", detail: result.text }, 502);
    }

    const parsed = JSON.parse(result.text) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const resultText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      return json({ error: "no response from AI" }, 502);
    }

    return new Response(resultText, {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
