import ffmpeg from "fluent-ffmpeg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { SegmentWithImage } from "./types.js";

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
  imagePath: string,
  audioPath: string,
  outputPath: string,
  duration: number,
): Promise<void> {
  const frames = Math.ceil(duration * 30);
  const vf = [
    `scale=1920:1080:force_original_aspect_ratio=increase`,
    `crop=1920:1080`,
    `zoompan=z='min(zoom+0.0006,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
  ].join(",");

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop 1"])
      .input(audioPath)
      .outputOptions([
        "-map 0:v",
        "-map 1:a",
        `-t ${duration}`,
        `-vf ${vf}`,
        "-c:v libx264",
        "-tune stillimage",
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
        "-c:a aac", // re-encode audio to ensure it's included
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
  segments: SegmentWithImage[],
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
    await buildChunk(seg.imagePath, seg.audioPath, chunkPath, duration);
    chunkPaths.push(chunkPath);
  }

  console.log("    🎞️  Concatenating chunks...");
  await concatChunks(chunkPaths, path.join(chunksDir, "list.txt"), finalPath);
  console.log(`    ✅ Final video: ${finalPath}`);
  return finalPath;
}
