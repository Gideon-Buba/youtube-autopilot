import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { Script, AudioSegment } from "./types.js";

const VOICE = "en-US-GuyNeural";

export async function synthesize(
  text: string,
  outputPath: string,
): Promise<string> {
  const sanitized = text.replace(/"/g, "'").replace(/\n/g, " ").trim();
  execSync(
    `edge-tts --voice "${VOICE}" --text "${sanitized}" --write-media "${outputPath}"`,
    { stdio: "pipe" },
  );
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
    imagePrompt: "YouTube subscribe button glowing dark background cinematic",
  });

  return segments;
}
