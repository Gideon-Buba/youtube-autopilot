import "dotenv/config";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { generateScript } from "./scriptGenerator.js";
import { requestApproval, sendConfirmation, sendError } from "./telegramBot.js";
import { generateAllAudio } from "./tts.js";
import { fetchAllVideos } from "./videoFetcher.js";
import { assembleVideo } from "./videoAssembler.js";
import { uploadToYouTube } from "./uploader.js";

const TOPICS: string[] = [
  "Top 10 Darkest Secrets of the Nigerian Civil War",
  "Top 10 Most Powerful Ancient Kingdoms in Nigerian History",
  "Top 10 Political Assassinations That Shaped Nigeria",
  "Top 10 Brutal Facts About the Benin Kingdom Empire",
  "Top 10 Forgotten Heroes of Nigerian Independence",
  "Top 10 Most Controversial Nigerian Military Coups",
  "Top 10 Ancient Trade Empires of Northern Nigeria",
  "Top 10 Shocking Facts About Colonial Nigeria Under Britain",
  "Top 10 Most Influential Igbo, Yoruba and Hausa Rulers in History",
  "Top 10 Unsolved Mysteries and Conspiracies in Nigerian History",
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

    console.log("🎬  [4/6] Fetching Pexels video clips...");
    const segmentsWithVideos = await fetchAllVideos(
      audioSegments,
      path.join(workDir, "videos"),
    );
    console.log(`   ✅ ${segmentsWithVideos.length} clips\n`);

    console.log("🔧 [5/6] Assembling video...");
    const finalVideoPath = path.join(workDir, "final.mp4");
    await assembleVideo(segmentsWithVideos, workDir, finalVideoPath);
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
runPipeline().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
