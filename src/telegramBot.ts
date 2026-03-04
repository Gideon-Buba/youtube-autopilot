import TelegramBot from "node-telegram-bot-api";
import type { Script, ApprovalDecision } from "./types.js";
import "dotenv/config";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function requestApproval(
  script: Script,
): Promise<ApprovalDecision> {
  const bot = new TelegramBot(TOKEN, { polling: false });

  const preview = script.facts
    .slice(0, 3)
    .map((f) => `  ${f.number}. ${f.heading}`)
    .join("\n");
  const message = [
    `🎬 *New Video Ready for Approval*`,
    `*Title:* ${script.title}`,
    `*Hook:* ${script.hook}`,
    `*Facts:*`,
    preview,
    `  ... and ${script.facts.length - 3} more`,
    `Approve?`,
  ].join("\n");

  await bot.sendMessage(CHAT_ID, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: "approve" },
          { text: "❌ Reject", callback_data: "reject" },
        ],
      ],
    },
  });

  return new Promise<ApprovalDecision>((resolve, reject) => {
    const pollerBot = new TelegramBot(TOKEN, { polling: true });

    pollerBot.on("polling_error", () => {}); // silence network errors

    const timer = setTimeout(
      () => {
        pollerBot.stopPolling();
        reject(new Error("Approval timed out"));
      },
      5 * 60 * 1000,
    );

    pollerBot.on("callback_query", (query) => {
      clearTimeout(timer);
      pollerBot.stopPolling();
      resolve(query.data as ApprovalDecision);
    });
  });
}

export async function sendConfirmation(
  videoUrl: string,
  title: string,
): Promise<void> {
  const bot = new TelegramBot(TOKEN, { polling: false });
  await bot.sendMessage(
    CHAT_ID,
    `🎉 *Video is Live!*\n*Title:* ${title}\n\n🔗 ${videoUrl}`,
    { parse_mode: "Markdown" },
  );
}

export async function sendError(error: Error): Promise<void> {
  const bot = new TelegramBot(TOKEN, { polling: false });
  await bot.sendMessage(CHAT_ID, `❌ *Pipeline Error*\n\`${error.message}\``, {
    parse_mode: "Markdown",
  });
}
