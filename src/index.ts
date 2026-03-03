import "dotenv/config";
import path from "path";
import fs from "fs";
import { generateScript } from "./scriptGenerator";
import { sendForApproval } from "./telegramBot";
import { generateAudio } from "./tts";
import { generateImages } from "./imageGen";
import { assembleVideo } from "./videoAssembler";
import { uploadToYouTube } from "./uploader";

async function main() {
  const topic = process.argv[2];
  if (!topic) {
    console.error("Usage: ts-node src/index.ts \"<topic>\"");
    console.error("Example: ts-node src/index.ts \"black holes\"");
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), "output", Date.now().toString());
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("\n=== YouTube Autopilot ===");
  console.log(`Topic:  ${topic}`);
  console.log(`Output: ${outputDir}\n`);

  // Step 1: Generate script
  console.log("[1/6] Generating script with Gemini...");
  const script = await generateScript(topic);
  fs.writeFileSync(path.join(outputDir, "script.json"), JSON.stringify(script, null, 2));
  console.log(`Done: "${script.title}"\n`);

  // Step 2: Telegram approval
  console.log("[2/6] Awaiting Telegram approval (5 min timeout)...");
  const decision = await sendForApproval(script);
  if (decision === "reject") {
    console.log("Script rejected. Pipeline stopped.");
    process.exit(0);
  }
  console.log("Approved!\n");

  // Step 3: Generate TTS audio
  console.log("[3/6] Generating TTS audio...");
  const audioSegments = await generateAudio(script, path.join(outputDir, "audio"));
  console.log(`Done: ${audioSegments.length} segments\n`);

  // Step 4: Generate images
  console.log("[4/6] Generating images...");
  const segmentsWithImages = await generateImages(audioSegments, path.join(outputDir, "images"));
  console.log(`Done: ${segmentsWithImages.length} images\n`);

  // Step 5: Assemble video
  console.log("[5/6] Assembling video with ffmpeg...");
  const videoPath = await assembleVideo(segmentsWithImages, outputDir, script.title);
  console.log(`Done: ${videoPath}\n`);

  // Step 6: Upload to YouTube
  console.log("[6/6] Uploading to YouTube...");
  const videoId = await uploadToYouTube(videoPath, script);
  console.log(`\n=== Pipeline complete! ===`);
  console.log(`Video ID: ${videoId}`);
  console.log(`URL: https://www.youtube.com/watch?v=${videoId}\n`);
}

main().catch((err) => {
  console.error("\nPipeline failed:", err.message ?? err);
  process.exit(1);
});
