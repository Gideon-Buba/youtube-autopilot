import axios from "axios";
import fs from "fs";
import path from "path";
import { Script, AudioSegment } from "./types";

const HF_TTS_MODEL = "facebook/mms-tts-eng";
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_TTS_MODEL}`;

async function textToSpeech(text: string, outputPath: string): Promise<void> {
  const response = await axios.post(
    HF_API_URL,
    { inputs: text },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 60_000,
    }
  );
  fs.writeFileSync(outputPath, Buffer.from(response.data));
}

export async function generateAudio(script: Script, outputDir: string): Promise<AudioSegment[]> {
  fs.mkdirSync(outputDir, { recursive: true });
  const segments: AudioSegment[] = [];

  // Hook
  const hookPath = path.join(outputDir, "hook.wav");
  await textToSpeech(script.hook, hookPath);
  segments.push({
    label: "hook",
    audioPath: hookPath,
    imagePrompt: script.facts[0]?.imagePrompt ?? "cinematic intro scene with dramatic lighting",
  });
  console.log("  Generated: hook");

  // Facts
  for (const fact of script.facts) {
    const narration = `${fact.heading}. ${fact.narration}`;
    const audioPath = path.join(outputDir, `fact_${fact.number}.wav`);
    await textToSpeech(narration, audioPath);
    segments.push({ label: `fact_${fact.number}`, audioPath, imagePrompt: fact.imagePrompt });
    console.log(`  Generated: fact ${fact.number}/${script.facts.length}`);
  }

  // Outro
  const outroPath = path.join(outputDir, "outro.wav");
  await textToSpeech(script.outro, outroPath);
  segments.push({
    label: "outro",
    audioPath: outroPath,
    imagePrompt: "like and subscribe animation, YouTube logo, red button, cinematic outro",
  });
  console.log("  Generated: outro");

  return segments;
}
