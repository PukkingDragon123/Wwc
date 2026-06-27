import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync } from 'fs';

const EXEC = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.env.SHOT_DIR || '/tmp/wwc-shots';
mkdirSync(OUT, { recursive: true });

const server = await createServer({ configFile: false, root: process.cwd(), server: { port: 5181 } });
await server.listen();

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5181/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME_READY__ === true, { timeout: 20000 });
await page.waitForTimeout(900);

const state = () => page.evaluate(() => window.__WWC__ || {});
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name, JSON.stringify(await state()));
};
// hold a key until predicate true (polling game state) or timeout
const holdUntil = async (key, pred, max = 12000) => {
  await page.keyboard.down(key);
  const start = Date.now();
  while (Date.now() - start < max) {
    if (pred(await state())) break;
    await page.waitForTimeout(120);
  }
  await page.keyboard.up(key);
};

await shot('1-menu');

// New Game
await page.mouse.click(640, 720 * 0.56);
await page.waitForFunction(() => window.__WWC__ && window.__WWC__.scene === 'Bunker', { timeout: 8000 });
await page.waitForTimeout(800);
await shot('2-bunker');

// walk left to the door (x ~150, range 60) then venture out
await holdUntil('KeyA', (s) => s.x !== undefined && s.x <= 175);
await page.waitForTimeout(150);
await page.keyboard.press('KeyE');
await page.waitForFunction(() => window.__WWC__ && window.__WWC__.scene === 'World', { timeout: 8000 });
await page.waitForTimeout(900);
await shot('3-world');

// walk right toward the mutants (first threats spawn around x>=560)
await holdUntil('KeyD', (s) => s.x !== undefined && s.x >= 600, 16000);
await page.waitForTimeout(300);
await shot('4-approach');

// swing repeatedly to fight / dismember
for (let i = 0; i < 16; i++) {
  await page.mouse.click(760, 360);
  await page.waitForTimeout(220);
}
await page.waitForTimeout(500);
await shot('5-combat');

await browser.close();
await server.close();
process.exit(0);
