import Groq from "groq-sdk";
import type { Script } from "./types.js";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateScript(topic: string): Promise<Script> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a JSON API. You only respond with valid JSON. No markdown, no backticks, no explanation. Only raw JSON.",
      },
      {
        role: "user",
        content: `Write a YouTube Top 10 script for: "${topic}"
        
Return this exact JSON structure with exactly 10 facts:
{
  "title": "video title here",
  "description": "2-3 sentence description with hashtags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "hook": "one sentence opening hook",
  "facts": [
    {
      "number": 1,
      "heading": "Short Heading",
      "narration": "Two sentence narration of the fact.",
      "imagePrompt": "Cinematic image description for this fact."
    }
  ],
  "outro": "Short call to action."
}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0].message.content!;
  const script = JSON.parse(text) as Script;

  // Ensure exactly 10 facts
  if (!script.facts || script.facts.length !== 10) {
    throw new Error(`Expected 10 facts, got ${script.facts?.length ?? 0}`);
  }

  return script;
}
