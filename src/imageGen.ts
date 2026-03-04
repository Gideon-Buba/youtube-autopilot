import axios from "axios";
import fs from "fs";
import { execSync } from "child_process";
import type { AudioSegment, SegmentWithImage } from "./types.js";
import "dotenv/config";

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
export async function generateImage(
  prompt: string,
  outputPath: string,
  retries = 3,
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        HF_API_URL,
        {
          inputs: `${prompt}, cinematic 16:9, dramatic lighting, ultra detailed, 4k`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "image/png",
          },
          responseType: "arraybuffer",
          timeout: 90_000,
        },
      );
      fs.writeFileSync(outputPath, Buffer.from(response.data as ArrayBuffer));
      return outputPath;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`    ⚠️  HF attempt ${attempt} failed, retrying in 10s...`);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  throw new Error("Image generation failed");
}

export async function generateAllImages(
  segments: AudioSegment[],
  imagesDir: string,
): Promise<SegmentWithImage[]> {
  fs.mkdirSync(imagesDir, { recursive: true });
  const results: SegmentWithImage[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const imagePath = `${imagesDir}/${seg.label}.png`;
    console.log(`    🖼️  Image ${i + 1}/${segments.length}: ${seg.label}`);
    try {
      await generateImage(seg.imagePrompt, imagePath);
      results.push({ ...seg, imagePath });
    } catch {
      console.warn(
        `    ⚠️  Image gen failed for "${seg.label}", using fallback`,
      );
      const fallbackPath = `${imagesDir}/${seg.label}_fallback.png`;
      execSync(
        `ffmpeg -f lavfi -i color=c=black:s=1920x1080:d=1 -frames:v 1 "${fallbackPath}" -y`,
        { stdio: "pipe" },
      );
      results.push({ ...seg, imagePath: fallbackPath });
    }
  }

  return results;
}
