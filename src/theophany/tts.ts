import axios from "axios";
import fs from "fs";
import path from "path";
import type { TheologyScript, AudioSegment } from "./types.js";
import "dotenv/config";

const VOICE_ID =
  (process.env.THEOPHANY_VOICE_ID ?? process.env.ELEVENLABS_VOICE_ID)!;
const API_KEY = process.env.ELEVENLABS_API_KEY!;

async function synthesize(text: string, outputPath: string): Promise<void> {
  if (!VOICE_ID || !API_KEY) {
    throw new Error("ELEVENLABS_API_KEY and THEOPHANY_VOICE_ID (or ELEVENLABS_VOICE_ID) must be set");
  }

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.7,
        style: 0.15,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
      timeout: 60_000,
    },
  );

  fs.writeFileSync(outputPath, Buffer.from(response.data as ArrayBuffer));
}

export async function generateAllAudio(
  script: TheologyScript,
  audioDir: string,
): Promise<AudioSegment[]> {
  fs.mkdirSync(audioDir, { recursive: true });
  const segments: AudioSegment[] = [];

  for (const seg of script.segments) {
    const audioPath = path.join(audioDir, `${seg.id}.mp3`);
    console.log(`    🎙️  ${seg.label}...`);
    await synthesize(seg.narration, audioPath);
    segments.push({
      id: seg.id,
      label: seg.label,
      audioPath,
      imagePrompt: seg.imagePrompt,
    });
  }

  const outroPath = path.join(audioDir, "outro.mp3");
  console.log("    🎙️  Outro...");
  await synthesize(script.outro, outroPath);
  segments.push({
    id: "outro",
    label: "Outro",
    audioPath: outroPath,
    imagePrompt: "open ancient scroll with rays of light invitation to reflect",
  });

  return segments;
}
