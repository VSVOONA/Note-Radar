import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function explainTopic(topic: string, subject: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain the topic "${topic}" in the context of "${subject}" for a college student. 
      Provide:
      1. A simple explanation.
      2. Key exam points.
      3. Important concepts.
      Format the response in Markdown.`,
    });

    return response.text || "Could not generate explanation.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating explanation. Please try again later.";
  }
}
