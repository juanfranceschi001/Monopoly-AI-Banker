
import { ScanResult } from "../types";

const isRetryable = (status: number) => status === 503 || status === 429;

const requestScan = async (base64Image: string): Promise<{ ok: boolean; status: number; body: any }> => {
  const response = await fetch(`${process.env.PROXY_URL}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
};

// Gemini occasionally returns a transient 503 "high demand" error that
// resolves itself within a second or two -- worth one automatic retry
// before surfacing it to the user as a failure.
export const analyzeMonopolyImage = async (base64Image: string): Promise<ScanResult> => {
  let result = await requestScan(base64Image);

  if (!result.ok && isRetryable(result.status)) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    result = await requestScan(base64Image);
  }

  if (!result.ok) {
    const { body, status } = result;
    const message = isRetryable(status)
      ? "The AI service is busy right now. Please try again in a moment."
      : `${body.error || "Failed to analyze image"}${body.detail ? `: ${body.detail}` : ""}`;
    throw new Error(message);
  }

  return result.body as ScanResult;
};
