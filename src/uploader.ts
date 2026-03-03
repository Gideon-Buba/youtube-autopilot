import { google } from "googleapis";
import fs from "fs";
import { Script } from "./types";
import { getAuthenticatedClient } from "./auth";

export async function uploadToYouTube(videoPath: string, script: Script): Promise<string> {
  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: "v3", auth });

  const fileSize = fs.statSync(videoPath).size;
  console.log(`  Uploading ${(fileSize / 1024 / 1024).toFixed(1)} MB...`);

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: script.title,
        description: script.description,
        tags: script.tags,
        categoryId: "27", // Education
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: "private", // Upload as private for manual review before publishing
      },
    },
    media: {
      mimeType: "video/mp4",
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = response.data.id!;
  console.log(`  Video ID: ${videoId}`);
  console.log(`  URL: https://www.youtube.com/watch?v=${videoId}`);

  return videoId;
}
