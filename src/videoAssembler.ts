import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { SegmentWithImage } from "./types";

function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration ?? 5);
    });
  });
}

function createClip(
  imagePath: string,
  audioPath: string,
  outputPath: string,
  duration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop 1", `-t ${duration}`])
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-tune stillimage",
        "-c:a aac",
        "-b:a 192k",
        "-pix_fmt yuv420p",
        "-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

export async function assembleVideo(
  segments: SegmentWithImage[],
  outputDir: string,
  title: string
): Promise<string> {
  const clipsDir = path.join(outputDir, "clips");
  fs.mkdirSync(clipsDir, { recursive: true });

  const clipPaths: string[] = [];

  for (const segment of segments) {
    const duration = await getAudioDuration(segment.audioPath);
    const clipPath = path.join(clipsDir, `${segment.label}.mp4`);
    console.log(`  Creating clip: ${segment.label} (${duration.toFixed(1)}s)`);
    await createClip(segment.imagePath, segment.audioPath, clipPath, duration);
    clipPaths.push(clipPath);
  }

  // Write concat list
  const concatListPath = path.join(outputDir, "concat.txt");
  fs.writeFileSync(concatListPath, clipPaths.map(p => `file '${p}'`).join("\n"));

  const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 60);
  const outputPath = path.join(outputDir, `${safeTitle}.mp4`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  return outputPath;
}
