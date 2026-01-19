
import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult } from "../types";

export const analyzeMonopolyImage = async (base64Image: string): Promise<ScanResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `Analyze this photo of Monopoly game assets. Identify:
1. The denominations of the Monopoly money shown and how many of each (e.g., $1, $5, $10, $20, $50, $100, $500).
2. Any property title deed cards visible (e.g., Boardwalk, Park Place, Reading Railroad).

Return the data as a clean JSON object. Only include clearly visible items. If nothing is visible, return empty arrays.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedMoney: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  denomination: { type: Type.NUMBER },
                  count: { type: Type.NUMBER }
                },
                required: ["denomination", "count"]
              }
            },
            detectedProperties: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            totalValue: { type: Type.NUMBER }
          },
          required: ["detectedMoney", "detectedProperties", "totalValue"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");
    
    return JSON.parse(resultText) as ScanResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
