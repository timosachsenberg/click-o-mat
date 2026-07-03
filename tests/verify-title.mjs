import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

// Before any click: the title gates the game — no room loaded yet.
check('title screen gates the game (no room loaded)', (await page.evaluate(() => window.__engine.state.currentRoom)) === '');
await page.screenshot({ path: `${SHOT}/title-01.png` });

// Click to start.
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(1500);
check('click starts the game (lab loaded)', (await page.evaluate(() => window.__engine.state.currentRoom)) === 'lab');
const au = await page.evaluate(() => window.__audio.debug());
check('start click unlocked audio + lab music', au.state === 'running' && au.currentMusic === 'lab-theme', `(${au.state}, ${au.currentMusic})`);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
