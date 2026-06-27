import "dotenv/config";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { generateTheologyScript } from "./scriptGenerator.js";
import { generateAllAudio } from "./tts.js";
import { generateAllImages } from "./imageGen.js";
import { assembleVideo } from "./videoAssembler.js";
import { uploadLongform, uploadShorts } from "./uploader.js";
import { requestApproval, sendConfirmation, sendError } from "./telegramBot.js";
import type { RenderedSegment } from "./types.js";

const TOPICS: string[] = [
  "John 5:1-47 — Why would Jesus ask a sick man if he wants to be healed?",
  "Genesis 22 — What kind of God asks Abraham to sacrifice his son?",
  "Job 38-42 — God answers Job out of the whirlwind: is that an answer?",
  "Luke 15 — The prodigal son and the brother who stayed: who is the real subject of this parable?",
  "Exodus 3 — The burning bush and the name no one can pin down",
  "John 11 — Jesus weeps at Lazarus's tomb: why, if he knew what he was about to do?",
  "Matthew 5:38-48 — Turn the other cheek: resistance or passivity?",
  "Mark 5:1-20 — The Gerasene demoniac: what does Legion mean?",
  "Romans 9 — Does God harden hearts? The problem of divine sovereignty",
  "Revelation 21 — A new heaven and earth: what is the shape of the end?",
];

let topicIndex = 0;

async function runPipeline(): Promise<void> {
  const topic = TOPICS[topicIndex % TOPICS.length];
  topicIndex++;

  const jobId = Date.now();
  const workDir = path.resolve(`./assets/theophany/${jobId}`);
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`\n${"━".repeat(60)}`);
  console.log(`📖 Theophany: "${topic}"`);
  console.log(`${"━".repeat(60)}\n`);

  try {
    console.log("📝 [1/6] Generating script...");
    const script = await generateTheologyScript(topic);
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

    console.log("🎨 [4/6] Generating images...");
    const imageMap = await generateAllImages(
      audioSegments,
      path.join(workDir, "images"),
    );
    const rendered: RenderedSegment[] = audioSegments.map((seg) => ({
      ...seg,
      imagePath: imageMap.get(seg.id)!,
    }));
    console.log(`   ✅ ${rendered.length} images\n`);

    console.log("🔧 [5/6] Assembling video (16:9 + 9:16)...");
    const landscapePath = path.join(workDir, "final_landscape.mp4");
    const shortsPath = path.join(workDir, "final_shorts.mp4");
    await assembleVideo(rendered, workDir, landscapePath, shortsPath);
    console.log("   ✅ Both formats assembled\n");

    console.log("⬆️  [6/6] Uploading to YouTube...");
    const longformId = await uploadLongform(landscapePath, script);
    const shortsId = await uploadShorts(shortsPath, script);
    const longformUrl = `https://youtube.com/watch?v=${longformId}`;
    const shortsUrl = `https://youtube.com/shorts/${shortsId}`;
    console.log(`   ✅ Long-form: ${longformUrl}`);
    console.log(`   ✅ Shorts:    ${shortsUrl}\n`);

    await sendConfirmation(longformUrl, shortsUrl, script.title);

    console.log(`${"━".repeat(60)}`);
    console.log(`🎉 Done!`);
    console.log(`${"━".repeat(60)}\n`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("\n❌ Theophany pipeline error:", error.message);
    await sendError(error);
  }
}

// 8pm WAT daily (offset from youtube-autopilot's 6pm slot)
cron.schedule(
  "0 19 * * *",
  () => {
    console.log("⏰ 8pm WAT — starting Theophany pipeline");
    runPipeline();
  },
  { timezone: "Africa/Lagos" },
);

console.log("📖 Theophany pipeline running");
console.log("   Scheduled: 8:00 PM WAT daily");
console.log(`   Topics loaded: ${TOPICS.length}`);

// Uncomment to run immediately:
// runPipeline().catch((err) => { console.error("Fatal:", err); process.exit(1); });
