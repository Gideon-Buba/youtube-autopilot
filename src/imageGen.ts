import axios from "axios";
import fs from "fs";
import path from "path";
import { AudioSegment, SegmentWithImage } from "./types";

const HF_IMG_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_IMG_MODEL}`;

async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const response = await axios.post(
    HF_API_URL,
    {
      inputs: prompt,
      parameters: {
        width: 1280,
        height: 720,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 120_000,
    }
  );
  fs.writeFileSync(outputPath, Buffer.from(response.data));
}

export async function generateImages(
  segments: AudioSegment[],
  outputDir: string
): Promise<SegmentWithImage[]> {
  fs.mkdirSync(outputDir, { recursive: true });
  const results: SegmentWithImage[] = [];

  for (const segment of segments) {
    const imagePath = path.join(outputDir, `${segment.label}.png`);
    console.log(`  Generating image: ${segment.label}`);
    await generateImage(segment.imagePrompt, imagePath);
    results.push({ ...segment, imagePath });
  }

  return results;
}
