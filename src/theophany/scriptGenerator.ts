import Groq from "groq-sdk";
import type { TheologyScript } from "./types.js";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateTheologyScript(
  topic: string,
): Promise<TheologyScript> {
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
        content: `Write a short-form theology explainer script for: "${topic}"

Guidelines:
- Tone: calm, reflective, intellectually curious — not preachy, not devotional
- Always distinguish "the text says" from "one reading is" or "this might suggest"
- Do not assert doctrine as fact; surface tensions and let the viewer sit with them
- The hook question should be a genuine puzzle in the text, not a rhetorical set-up
- Image prompts: symbolic and illustrative — ancient stone, water, light, scrolls — avoid depicting specific religious figures literally
- Each narration segment: 3-5 sentences, written for spoken delivery

Return this exact JSON:
{
  "title": "Short compelling video title (max 80 chars)",
  "description": "2-3 sentence description with hashtags",
  "tags": ["theology", "bible", "tag3", "tag4", "tag5"],
  "passage": "e.g. John 5:1-47",
  "hookQuestion": "The central question that opens the video",
  "segments": [
    {
      "id": "hook",
      "label": "Opening Hook",
      "narration": "3-5 sentences opening with the hook question, drawing the viewer into a genuine puzzle.",
      "imagePrompt": "symbolic 6-8 word image description, e.g. ancient stone pool five porticos golden light"
    },
    {
      "id": "context",
      "label": "Setting the Scene",
      "narration": "Brief historical and textual context for the passage.",
      "imagePrompt": "symbolic image prompt"
    },
    {
      "id": "text",
      "label": "What the Text Says",
      "narration": "Walk closely through what actually happens in the passage — stay near the text.",
      "imagePrompt": "symbolic image prompt"
    },
    {
      "id": "tension",
      "label": "The Tension",
      "narration": "Surface the genuine conflict or puzzle — theological, ethical, or narrative. Do not resolve it yet.",
      "imagePrompt": "symbolic image prompt"
    },
    {
      "id": "interpretation",
      "label": "One Reading",
      "narration": "Offer one thoughtful interpretation, clearly framed as one possible reading, not the answer.",
      "imagePrompt": "symbolic image prompt"
    },
    {
      "id": "application",
      "label": "The Bigger Question",
      "narration": "Widen the lens — what does this text ask of any reader, regardless of belief?",
      "imagePrompt": "symbolic image prompt"
    }
  ],
  "outro": "1-2 sentence close that invites reflection or a follow-up question, not a call to subscribe."
}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0].message.content!;
  return JSON.parse(text) as TheologyScript;
}
