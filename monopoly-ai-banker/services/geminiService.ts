
import { ScanResult } from "../types";

export const analyzeMonopolyImage = async (base64Image: string): Promise<ScanResult> => {
  const response = await fetch(`${process.env.PROXY_URL}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to analyze image");
  }

  return (await response.json()) as ScanResult;
};
