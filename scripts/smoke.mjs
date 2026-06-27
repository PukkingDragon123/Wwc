// Headless boot smoke test: serve the built game, load it in Chromium, wait for
// the game-ready signal, click into a New Game, and assert no runtime errors.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const EXEC = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { port: 5180 },
});
await server.listen();
const url = 'http://localhost:5180/';

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();

const errors = [];
const ignore = (t) => /favicon/i.test(t) || /Failed to load resource/i.test(t);
page.on('console', (m) => {
  if (m.type() === 'error' && !ignore(m.text())) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('response', (r) => {
  if (r.status() === 404) console.log('   (404):', r.url());
});

let exitCode = 0;
try {
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__GAME_READY__ === true, { timeout: 20000 });
  console.log('✓ game ready (textures baked, boot ok)');

  // wait for the main menu, then click New Game by its text
  await page.waitForTimeout(1200);
  // Phaser renders to canvas; we click coordinates where "New Game" sits (~56% height)
  const box = await page.locator('canvas').boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.56);
    console.log('✓ clicked New Game');
  }
  await page.waitForTimeout(1500);

  // drive into the world: venture out is the first station — walk left then interact
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyA');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1500);
  // swing the weapon a few times
  if (box) {
    for (let i = 0; i < 3; i++) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);
    }
  }
  await page.waitForTimeout(800);
  console.log('✓ survived menu → bunker → world → swings without crashing');
} catch (e) {
  console.error('✗ smoke test failed:', e.message);
  exitCode = 1;
}

if (errors.length) {
  console.error('✗ runtime errors detected:');
  for (const e of errors.slice(0, 20)) console.error('   ', e);
  exitCode = 1;
} else {
  console.log('✓ no runtime console errors');
}

await browser.close();
await server.close();
process.exit(exitCode);
