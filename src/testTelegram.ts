import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: false });

bot.sendMessage(process.env.TELEGRAM_CHAT_ID as string, 'Test message from YouTube Autopilot!')
  .then(() => console.log('✅ Message sent!'))
  .catch(err => console.error('❌ Error:', err.message));
