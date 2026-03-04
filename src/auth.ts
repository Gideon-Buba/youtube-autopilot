import dotenv from "dotenv";
dotenv.config();

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import path from "path";
import readline from "readline";

const TOKEN_PATH = path.join(process.cwd(), ".youtube_token.json");
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob",
  );
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const client = createOAuthClient();

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    client.setCredentials(token);
    return client;
  }

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("\nAuthorize this app by visiting:\n");
  console.log(authUrl);

  const code = await new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("\nEnter the authorization code: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("✅ Token saved to", TOKEN_PATH);
  return client;
}

getAuthenticatedClient()
  .then(() => process.exit(0))
  .catch(console.error);
