import { google } from "googleapis";
import fs from "fs";
import type { TheologyScript } from "./types.js";
import { getAuthenticatedClient } from "./auth.js";
import "dotenv/config";

export async function uploadLongform(
  videoPath: string,
  script: TheologyScript,
): Promise<string> {
  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: "v3", auth });

  console.log(
    `  📤 Long-form: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)} MB`,
  );

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: script.title,
        description: `${script.description}\n\n${script.passage}`,
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

  return res.data.id!;
}

export async function uploadShorts(
  videoPath: string,
  script: TheologyScript,
): Promise<string> {
  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: "v3", auth });

  console.log(
    `  📤 Shorts: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)} MB`,
  );

  const shortsTitle = `${script.hookQuestion} #Shorts`;

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: shortsTitle.slice(0, 100),
        description: `${script.description}\n\n${script.passage} #Shorts #Theophany`,
        tags: [...script.tags, "Shorts"],
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

  return res.data.id!;
}
