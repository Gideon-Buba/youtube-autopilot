import TelegramBot from "node-telegram-bot-api";
import { Script, ApprovalDecision } from "./types";

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function sendForApproval(script: Script): Promise<ApprovalDecision> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;

  // Send-only bot for the initial message
  const sender = new TelegramBot(token, { polling: false });

  const factList = script.facts.map(f => `  ${f.number}. ${f.heading}`).join("\n");
  const message =
    `*New Video Script Ready*\n\n` +
    `*Title:* ${script.title}\n\n` +
    `*Hook:* ${script.hook}\n\n` +
    `*Facts (${script.facts.length}):*\n${factList}\n\n` +
    `*Outro:* ${script.outro}\n\n` +
    `*Tags:* ${script.tags.slice(0, 6).join(", ")}`;

  await sender.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Approve", callback_data: "approve" },
        { text: "❌ Reject", callback_data: "reject" },
      ]],
    },
  });

  return new Promise((resolve) => {
    const poller = new TelegramBot(token, { polling: true });

    const timer = setTimeout(() => {
      poller.stopPolling();
      console.log("Approval timed out — defaulting to reject");
      resolve("reject");
    }, APPROVAL_TIMEOUT_MS);

    poller.on("callback_query", async (query) => {
      if (query.message?.chat.id.toString() !== chatId) return;
      clearTimeout(timer);
      await poller.stopPolling();
      const decision = query.data as ApprovalDecision;
      await sender.answerCallbackQuery(query.id, { text: `Script ${decision}d!` });
      resolve(decision);
    });
  });
}
