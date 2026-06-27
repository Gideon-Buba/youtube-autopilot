import ffmpeg from "fluent-ffmpeg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { RenderedSegment } from "./types.js";

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
  vf: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop 1"])
      .input(audioPath)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        `-t ${duration}`,
        `-vf ${vf}`,
        "-c:v libx264",
        "-c:a aac",
        "-b:a 192k",
        "-pix_fmt yuv420p",
        "-preset fast",
        "-r 30",
        "-shortest",
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
      .outputOptions(["-c:v copy", "-c:a aac", "-b:a 192k", "-movflags +faststart"])
      .output(finalPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

const LANDSCAPE_VF =
  "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080";

const SHORTS_VF =
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";

export async function assembleVideo(
  segments: RenderedSegment[],
  workDir: string,
  landscapePath: string,
  shortsPath: string,
): Promise<void> {
  const landscapeDir = path.join(workDir, "chunks_landscape");
  const shortsDir = path.join(workDir, "chunks_shorts");
  fs.mkdirSync(landscapeDir, { recursive: true });
  fs.mkdirSync(shortsDir, { recursive: true });

  const landscapeChunks: string[] = [];
  const shortsChunks: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const duration = getAudioDuration(seg.audioPath);
    console.log(
      `    🔧 Chunk ${i + 1}/${segments.length}: ${seg.label} (${duration.toFixed(1)}s)`,
    );

    const lChunk = path.join(landscapeDir, `chunk_${i}.mp4`);
    const sChunk = path.join(shortsDir, `chunk_${i}.mp4`);

    await buildChunk(seg.imagePath, seg.audioPath, lChunk, duration, LANDSCAPE_VF);
    await buildChunk(seg.imagePath, seg.audioPath, sChunk, duration, SHORTS_VF);

    landscapeChunks.push(lChunk);
    shortsChunks.push(sChunk);
  }

  console.log("    🎞️  Assembling landscape (16:9)...");
  await concatChunks(
    landscapeChunks,
    path.join(landscapeDir, "list.txt"),
    landscapePath,
  );

  console.log("    🎞️  Assembling Shorts (9:16)...");
  await concatChunks(
    shortsChunks,
    path.join(shortsDir, "list.txt"),
    shortsPath,
  );
}
