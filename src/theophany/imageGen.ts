import axios from "axios";
import fs from "fs";
import "dotenv/config";

const HF_API_TOKEN = process.env.HF_API_TOKEN!;
const MODEL = "black-forest-labs/FLUX.1-schnell";
const STYLE_SUFFIX =
  "ancient illustrated manuscript style, warm ochre and gold tones, no text, no labels, symbolic not literal";

async function generateImage(
  prompt: string,
  outputPath: string,
  attempt = 0,
): Promise<void> {
  const fullPrompt = `${prompt}, ${STYLE_SUFFIX}`;

  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      { inputs: fullPrompt },
      {
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
        timeout: 120_000,
      },
    );

    fs.writeFileSync(outputPath, Buffer.from(response.data as ArrayBuffer));
  } catch (err) {
    if (attempt < 3) {
      const wait = (attempt + 1) * 8_000;
      console.log(`    ⏳ Image retry in ${wait / 1000}s (${prompt.slice(0, 40)}...)`);
      await new Promise((r) => setTimeout(r, wait));
      return generateImage(prompt, outputPath, attempt + 1);
    }
    throw err;
  }
}

export async function generateAllImages(
  segments: Array<{ id: string; imagePrompt: string }>,
  imagesDir: string,
): Promise<Map<string, string>> {
  fs.mkdirSync(imagesDir, { recursive: true });
  const map = new Map<string, string>();

  for (const seg of segments) {
    const outputPath = `${imagesDir}/${seg.id}.png`;
    console.log(`    🎨 ${seg.id}: ${seg.imagePrompt.slice(0, 50)}...`);
    await generateImage(seg.imagePrompt, outputPath);
    map.set(seg.id, outputPath);
  }

  return map;
}
