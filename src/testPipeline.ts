import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { generateScript } from './scriptGenerator.js';
import { requestApproval } from './telegramBot.js';
import { generateAllAudio } from './tts.js';
import { generateAllImages } from './imageGen.js';
import { assembleVideo } from './videoAssembler.js';

async function test() {
  const workDir = path.resolve(`./assets/test_${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });

  console.log('Step 1: Generating script...');
  const script = await generateScript('Top 10 Strangest Historical Facts');
  console.log('✅ Script:', script.title);

  console.log('Step 2: Telegram approval...');
  const decision = await requestApproval(script);
  if (decision !== 'approve') { console.log('❌ Rejected'); return; }
  console.log('✅ Approved!');

  console.log('Step 3: Generating audio...');
  const audioSegments = await generateAllAudio(script, path.join(workDir, 'audio'));
  console.log('✅ Audio:', audioSegments.length, 'segments');

  console.log('Step 4: Generating images...');
  const segments = await generateAllImages(audioSegments, path.join(workDir, 'images'));
  console.log('✅ Images:', segments.length);

  console.log('Step 5: Assembling video...');
  const videoPath = path.join(workDir, 'final.mp4');
  await assembleVideo(segments, workDir, videoPath);
  console.log('✅ Video ready:', videoPath);
}

test().catch(err => console.error('❌ Error:', err.message));