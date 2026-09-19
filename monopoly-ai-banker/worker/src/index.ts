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

// gemini-3-flash-preview showed capacity 503s under test; gemini-2.5-flash
// is sunset for new API keys as of this writing (404 "no longer available
// to new users"). gemini-3.6-flash is Google's own recommended replacement.
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

    const upstream = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
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

    if (!upstream.ok) {
      const errorBody = await upstream.text();
      console.error(`Gemini upstream error ${upstream.status}: ${errorBody}`);
      return json({ error: "upstream error", detail: errorBody }, 502);
    }

    const result = await upstream.json<{
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }>();
    const resultText = result.candidates?.[0]?.content?.parts?.[0]?.text;
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
