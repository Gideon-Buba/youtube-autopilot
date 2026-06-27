import TelegramBot from "node-telegram-bot-api";
import type { TheologyScript, ApprovalDecision } from "./types.js";
import "dotenv/config";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function requestApproval(
  script: TheologyScript,
): Promise<ApprovalDecision> {
  const bot = new TelegramBot(TOKEN, { polling: false });

  const segmentPreview = script.segments
    .slice(0, 3)
    .map((s) => `  *${s.label}:* ${s.narration.slice(0, 90)}...`)
    .join("\n");

  const message = [
    `📖 *Theophany — Script Ready for Review*`,
    `*Title:* ${script.title}`,
    `*Passage:* ${script.passage}`,
    `*Hook:* _${script.hookQuestion}_`,
    ``,
    `*Preview:*`,
    segmentPreview,
    `  ...and ${script.segments.length - 3} more segments`,
    ``,
    `⚠️ Check: accuracy to the text, calm tone, no doctrine stated as fact.`,
    `Approving publishes both long-form and Shorts.`,
  ].join("\n");

  await bot.sendMessage(CHAT_ID, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve & Publish", callback_data: "approve" },
          { text: "❌ Reject", callback_data: "reject" },
        ],
      ],
    },
  });

  return new Promise<ApprovalDecision>((resolve, reject) => {
    const poller = new TelegramBot(TOKEN, { polling: true });
    poller.on("polling_error", () => {});

    const timer = setTimeout(
      () => {
        poller.stopPolling();
        reject(new Error("Theophany approval timed out after 10 minutes"));
      },
      10 * 60 * 1000,
    );

    poller.on("callback_query", (query) => {
      clearTimeout(timer);
      poller.stopPolling();
      resolve(query.data as ApprovalDecision);
    });
  });
}

export async function sendConfirmation(
  longformUrl: string,
  shortsUrl: string,
  title: string,
): Promise<void> {
  const bot = new TelegramBot(TOKEN, { polling: false });
  await bot.sendMessage(
    CHAT_ID,
    `🎉 *Theophany — Published!*\n*${title}*\n\n📺 Long-form: ${longformUrl}\n#️⃣ Shorts: ${shortsUrl}`,
    { parse_mode: "Markdown" },
  );
}

export async function sendError(error: Error): Promise<void> {
  const bot = new TelegramBot(TOKEN, { polling: false });
  await bot.sendMessage(
    CHAT_ID,
    `❌ *Theophany Pipeline Error*\n\`${error.message}\``,
    { parse_mode: "Markdown" },
  );
}
