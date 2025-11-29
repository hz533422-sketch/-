import { GoogleGenAI } from "@google/genai";
import { AnalysisMetrics, Language } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeSlabData = async (
  metrics: AnalysisMetrics, 
  language: Language
): Promise<{ analysis: string; recommendations: string[] }> => {
  const ai = initGenAI();
  if (!ai) {
    return {
      analysis: "API Key missing. Cannot generate AI analysis.",
      recommendations: ["Check configuration"]
    };
  }

  const langPrompt = language === Language.ZH ? "Respond in Chinese (Simplified)." : "Respond in English.";
  
  const prompt = `
    You are a senior structural engineer and construction quality control expert.
    
    Data from a recent slab pouring scan:
    - Average Surface Deviation: ${metrics.averageDeviation.toFixed(2)} mm
    - Maximum Deviation: ${metrics.maxDeviation.toFixed(2)} mm
    - Minimum Deviation: ${metrics.minDeviation.toFixed(2)} mm
    - Overall Flatness Score: ${metrics.flatnessScore}/100
    - Standard Tolerance: +/- 5mm

    Task:
    1. Provide a concise technical assessment of the slab quality.
    2. Provide 3 specific, actionable remedial steps for the site team to fix the uneven areas (e.g., grinding high spots, using self-leveling compound for low spots).
    
    ${langPrompt}
    
    Format the response as a JSON object with two keys: "analysis" (string) and "recommendations" (array of strings). Do not use Markdown code blocks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    return {
      analysis: result.analysis || "Analysis failed.",
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      analysis: "Error connecting to AI service.",
      recommendations: ["Retry analysis"]
    };
  }
};
