import ffmpeg from "fluent-ffmpeg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { SegmentWithVideo } from "./types.js";

function getAudioDuration(audioPath: string): number {
  return parseFloat(
    execSync(
      `ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`,
    )
      .toString()
      .trim(),
  );
}

function buildChunk(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .inputOptions(["-stream_loop -1"])
      .input(audioPath)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        `-t ${duration}`,
        "-vf scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
        "-c:v libx264",
        "-c:a aac",
        "-b:a 192k",
        "-pix_fmt yuv420p",
        "-preset fast",
        "-r 30",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function concatChunks(
  chunkPaths: string[],
  listFile: string,
  finalPath: string,
): Promise<void> {
  fs.writeFileSync(
    listFile,
    chunkPaths.map((p) => `file '${path.resolve(p)}'`).join("\n"),
  );
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions([
        "-c:v copy",
        "-c:a aac",
        "-b:a 192k",
        "-movflags +faststart",
      ])
      .output(finalPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

export async function assembleVideo(
  segments: SegmentWithVideo[],
  workDir: string,
  finalPath: string,
): Promise<string> {
  const chunksDir = path.join(workDir, "chunks");
  fs.mkdirSync(chunksDir, { recursive: true });
  const chunkPaths: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const chunkPath = path.join(chunksDir, `chunk_${i}.mp4`);
    const duration = getAudioDuration(seg.audioPath);
    console.log(
      `    🔧 Chunk ${i + 1}/${segments.length}: ${seg.label} (${duration.toFixed(1)}s)`,
    );
    await buildChunk(seg.videoPath, seg.audioPath, chunkPath, duration);
    chunkPaths.push(chunkPath);
  }

  console.log("    🎞️  Concatenating chunks...");
  await concatChunks(chunkPaths, path.join(chunksDir, "list.txt"), finalPath);
  console.log(`    ✅ Final video: ${finalPath}`);
  return finalPath;
}
