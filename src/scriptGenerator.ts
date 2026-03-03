import { GoogleGenerativeAI } from "@google/generative-ai";
import { Script } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateScript(topic: string, factCount = 10): Promise<Script> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a YouTube scriptwriter. Create a script for a "${factCount} Amazing Facts About ${topic}" video.

Return ONLY valid JSON matching this exact structure:
{
  "title": "string (YouTube video title, click-worthy, under 100 chars)",
  "description": "string (YouTube description, 150-200 words with keywords)",
  "tags": ["array", "of", "10-15", "relevant", "tags"],
  "hook": "string (opening 2-3 sentences to immediately hook the viewer)",
  "facts": [
    {
      "number": 1,
      "heading": "string (short punchy fact title, under 10 words)",
      "narration": "string (2-3 engaging sentences narrating this fact)",
      "imagePrompt": "string (detailed image generation prompt, photorealistic, cinematic lighting)"
    }
  ],
  "outro": "string (closing 2-3 sentences, ask viewers to like and subscribe)"
}

Generate exactly ${factCount} facts. Make narration engaging, conversational, and educational. Image prompts should be vivid and highly descriptive.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Gemini response");

  return JSON.parse(jsonMatch[0]) as Script;
}
