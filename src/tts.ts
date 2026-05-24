import axios from "axios";
import fs from "fs";
import path from "path";
import type { Script, AudioSegment } from "./types.js";
import "dotenv/config";

async function synthesize(text: string, outputPath: string): Promise<string> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    throw new Error("ELEVENLABS_VOICE_ID and ELEVENLABS_API_KEY must be set");
  }

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
      timeout: 60_000,
    },
  );

  fs.writeFileSync(outputPath, Buffer.from(response.data as ArrayBuffer));
  return outputPath;
}

export async function generateAllAudio(
  script: Script,
  audioDir: string,
): Promise<AudioSegment[]> {
  fs.mkdirSync(audioDir, { recursive: true });
  const segments: AudioSegment[] = [];

  const hookPath = path.join(audioDir, "hook.mp3");
  console.log("    🎙️  Hook...");
  await synthesize(script.hook, hookPath);
  segments.push({
    label: "hook",
    audioPath: hookPath,
    imagePrompt: "cinematic documentary history epic wide shot",
  });

  for (const fact of script.facts) {
    const audioPath = path.join(audioDir, `fact_${fact.number}.mp3`);
    const narration = `Number ${fact.number}. ${fact.heading}. ${fact.narration}`;
    console.log(`    🎙️  Fact ${fact.number}: ${fact.heading}`);
    await synthesize(narration, audioPath);
    segments.push({
      label: `fact_${fact.number}`,
      audioPath,
      imagePrompt: fact.imagePrompt,
    });
  }

  const outroPath = path.join(audioDir, "outro.mp3");
  console.log("    🎙️  Outro...");
  await synthesize(script.outro, outroPath);
  segments.push({
    label: "outro",
    audioPath: outroPath,
    imagePrompt: "YouTube subscribe history channel",
  });

  return segments;
}
