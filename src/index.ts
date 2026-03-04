import "dotenv/config";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { generateScript } from "./scriptGenerator.js";
import { requestApproval, sendConfirmation, sendError } from "./telegramBot.js";
import { generateAllAudio } from "./tts.js";
import { generateAllImages } from "./imageGen.js";
import { assembleVideo } from "./videoAssembler.js";
import { uploadToYouTube } from "./uploader.js";

const TOPICS: string[] = [
  "Top 10 Strangest Historical Facts Most People Don't Know",
  "Top 10 Ancient Civilizations That Mysteriously Disappeared",
  "Top 10 Unbelievable Facts About the Roman Empire",
  "Top 10 Most Brutal Battles in Ancient History",
  "Top 10 Lost Treasures That Were Never Found",
  "Top 10 Historical Figures Who Were Completely Different Than You Think",
  "Top 10 Inventions That Changed the World Forever",
  "Top 10 Strangest Laws From Ancient Civilizations",
  "Top 10 Unsolved Mysteries of the Ancient World",
  "Top 10 Greatest Empires in Human History",
];

let topicIndex = 0;

async function runPipeline(): Promise<void> {
  const topic = TOPICS[topicIndex % TOPICS.length];
  topicIndex++;

  const jobId = Date.now();
  const workDir = path.resolve(`./assets/jobs/${jobId}`);
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`\n${"━".repeat(60)}`);
  console.log(`🚀 Pipeline started: "${topic}"`);
  console.log(`${"━".repeat(60)}\n`);

  try {
    console.log("📝 [1/6] Generating script...");
    const script = await generateScript(topic);
    fs.writeFileSync(
      path.join(workDir, "script.json"),
      JSON.stringify(script, null, 2),
    );
    console.log(`   ✅ "${script.title}"\n`);

    console.log("📲 [2/6] Waiting for Telegram approval...");
    const decision = await requestApproval(script);
    if (decision !== "approve") {
      console.log("   ❌ Rejected. Pipeline stopped.\n");
      return;
    }
    console.log("   ✅ Approved!\n");

    console.log("🎙️  [3/6] Generating narration...");
    const audioSegments = await generateAllAudio(
      script,
      path.join(workDir, "audio"),
    );
    console.log(`   ✅ ${audioSegments.length} segments\n`);

    console.log("🖼️  [4/6] Generating AI images...");
    const segmentsWithImages = await generateAllImages(
      audioSegments,
      path.join(workDir, "images"),
    );
    console.log(`   ✅ ${segmentsWithImages.length} images\n`);

    console.log("🔧 [5/6] Assembling video...");
    const finalVideoPath = path.join(workDir, "final.mp4");
    await assembleVideo(segmentsWithImages, workDir, finalVideoPath);
    console.log("   ✅ Video assembled\n");

    console.log("⬆️  [6/6] Uploading to YouTube...");
    const videoId = await uploadToYouTube(finalVideoPath, script);
    const videoUrl = `https://youtube.com/watch?v=${videoId}`;
    console.log(`   ✅ ${videoUrl}\n`);

    await sendConfirmation(videoUrl, script.title);

    console.log(`${"━".repeat(60)}`);
    console.log(`🎉 Done! ${videoUrl}`);
    console.log(`${"━".repeat(60)}\n`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("\n❌ Pipeline error:", error.message);
    await sendError(error);
  }
}

// Scheduled for 6pm WAT daily
cron.schedule(
  "0 17 * * *",
  () => {
    console.log("⏰ 6pm WAT — starting pipeline");
    runPipeline();
  },
  { timezone: "Africa/Lagos" },
);

console.log("🤖 YouTube Autopilot running");
console.log("   Scheduled: 6:00 PM WAT daily");
console.log(`   Topics loaded: ${TOPICS.length}`);
console.log(
  "\n💡 To test now, uncomment runPipeline() at the bottom of index.ts\n",
);

// Uncomment to test immediately:
runPipeline();
