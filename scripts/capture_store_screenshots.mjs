#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const wsUrl = process.env.PANIC_PASS_DEVTOOLS_WS;
const outputDir = process.env.PANIC_PASS_SCREENSHOT_DIR;

if (!wsUrl || !outputDir) {
  throw new Error('PANIC_PASS_DEVTOOLS_WS and PANIC_PASS_SCREENSHOT_DIR are required.');
}

fs.mkdirSync(outputDir, { recursive: true });

const scenarios = [
  ['01-home-raw.png', "document.getElementById('signage').classList.remove('on'); go('home');"],
  ['02-guided-sos-raw.png', "openSignage('guided');"],
  ['03-breath-guide-raw.png', "document.getElementById('signage').classList.remove('on'); go('breath');"],
  ['04-focus-game-raw.png', "document.getElementById('signage').classList.remove('on'); go('oddgame');"],
  ['05-calming-sounds-raw.png', "document.getElementById('signage').classList.remove('on'); go('music');"]
];

const socket = new WebSocket(wsUrl);
let messageId = 0;
const pending = new Map();

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  const resolver = pending.get(message.id);
  if (resolver) {
    pending.delete(message.id);
    resolver(message);
  }
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, message => {
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

for (const [filename, expression] of scenarios) {
  await command('Runtime.evaluate', { expression, awaitPromise: true });
  await new Promise(resolve => setTimeout(resolve, 350));
  const result = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true
  });
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
}

socket.close();
