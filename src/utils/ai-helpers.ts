import { GenerateContentResponse } from "@google/genai";

export function getResponseText(response: any): string {
  if (!response) return "";
  
  // If it's the SDK object with a getter (unlikely over JSON)
  if (typeof response.text === 'string') return response.text;
  
  // If it's the raw JSON structure
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      return candidate.content.parts[0].text || "";
    }
  }
  
  return "";
}
