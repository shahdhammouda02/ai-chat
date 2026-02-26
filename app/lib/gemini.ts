import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MODEL_NAME = "gemini-2.5-flash";

export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return text;
  } catch (error) {
    console.error("Gemini API error:", error);

    if (error instanceof Error && error.message.includes("404")) {
      console.log("Retrying with gemini-2.0-flash-exp...");
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const fallbackResult = await fallbackModel.generateContent(prompt);
      const fallbackText = fallbackResult.response.text();
      if (fallbackText) return fallbackText;
    }

    throw new Error("Failed to generate AI response. Please try again.");
  }
}