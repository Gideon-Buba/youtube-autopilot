import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: true });

console.log('Waiting for a message... Send any message to @yt_autopilot_bot on Telegram');

bot.on('message', (msg) => {
  console.log('✅ Your Chat ID is:', msg.chat.id);
  console.log('Update your .env: TELEGRAM_CHAT_ID=' + msg.chat.id);
  bot.stopPolling();
});
