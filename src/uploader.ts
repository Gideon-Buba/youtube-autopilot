import { google } from "googleapis";
import fs from "fs";
import type { Script } from "./types.js";
import { getAuthenticatedClient } from "./auth.js";
import "dotenv/config";

export async function uploadToYouTube(
  videoPath: string,
  script: Script,
): Promise<string> {
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
        categoryId: "27",
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: "video/mp4",
      body: fs.createReadStream(videoPath),
    },
  });

  return response.data.id!;
}
