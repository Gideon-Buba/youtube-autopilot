import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const result = await genAI.listModels();
  for await (const model of result) {
    console.log(model.name, '-', model.supportedGenerationMethods);
  }
}

main().catch(console.error);
