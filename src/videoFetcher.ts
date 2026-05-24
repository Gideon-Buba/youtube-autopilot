import axios from "axios";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import type { AudioSegment, SegmentWithVideo } from "./types.js";
import "dotenv/config";

const PEXELS_API_URL = "https://api.pexels.com/videos/search";

interface PexelsVideoFile {
  link: string;
  quality: string;
  width: number;
  height: number;
}

interface PexelsVideo {
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  videos: PexelsVideo[];
}

async function fetchVideo(
  searchTerm: string,
  outputPath: string,
  retries = 3,
): Promise<string> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY must be set");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const searchRes = await axios.get<PexelsSearchResponse>(PEXELS_API_URL, {
        headers: { Authorization: apiKey },
        params: { query: searchTerm, per_page: 5, orientation: "landscape" },
        timeout: 15_000,
      });

      const videos = searchRes.data.videos;
      if (!videos.length)
        throw new Error(`No Pexels results for "${searchTerm}"`);

      const files = videos[0].video_files;
      const best =
        files
          .filter((f) => f.width >= 1280)
          .sort((a, b) => b.width - a.width)[0] ?? files[0];

      const videoRes = await axios.get<ArrayBuffer>(best.link, {
        responseType: "arraybuffer",
        timeout: 60_000,
      });

      fs.writeFileSync(outputPath, Buffer.from(videoRes.data));
      return outputPath;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(
        `    ⚠️  Pexels attempt ${attempt} failed, retrying in 5s...`,
      );
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }

  throw new Error("Video fetch failed");
}

function createBlackFallback(outputPath: string): void {
  execSync(
    `ffmpeg -f lavfi -i color=c=black:s=1920x1080:r=30 -t 5 -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`,
    { stdio: "pipe" },
  );
}

export async function fetchAllVideos(
  segments: AudioSegment[],
  videosDir: string,
): Promise<SegmentWithVideo[]> {
  fs.mkdirSync(videosDir, { recursive: true });
  const results: SegmentWithVideo[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const videoPath = path.join(videosDir, `${seg.label}.mp4`);
    console.log(`    🎬  Clip ${i + 1}/${segments.length}: ${seg.label}`);
    try {
      await fetchVideo(seg.imagePrompt, videoPath);
      results.push({ ...seg, videoPath });
    } catch {
      console.warn(
        `    ⚠️  Pexels fetch failed for "${seg.label}", using fallback`,
      );
      const fallbackPath = path.join(videosDir, `${seg.label}_fallback.mp4`);
      createBlackFallback(fallbackPath);
      results.push({ ...seg, videoPath: fallbackPath });
    }
  }

  return results;
}
