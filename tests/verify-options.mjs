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
await page.waitForTimeout(300);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title screen
await page.waitForTimeout(1000);
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);
const settle = async () => {
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const playerPos = () => page.evaluate(() => {
  const p = window.__engine.roomScene.actors.get('norb');
  return { x: p.x, y: p.y };
});

await settle(); // lab intro

// Open via gear icon (origin(1,0) at x=906, so the glyph spans ~882..906)
await click(894, 25);
await page.waitForTimeout(300);
check('gear opens the options menu', await page.evaluate(() => window.__engine.menuOpen));
await page.screenshot({ path: `${SHOT}/opt-01-panel.png` });

// Room clicks are blocked while open
const before = await playerPos();
await click(700, 420);
await page.waitForTimeout(1200);
const after = await playerPos();
check('room clicks blocked while menu open', Math.abs(before.x - after.x) < 2 && Math.abs(before.y - after.y) < 2, `(moved ${Math.hypot(after.x - before.x, after.y - before.y).toFixed(1)}px)`);

// Music slider: click at 25% of the track (track x 440..620)
await click(440 + 0.25 * 180, 134);
await page.waitForTimeout(200);
let music = await page.evaluate(() => window.__audio.settings.music);
check('music slider sets ~0.25', Math.abs(music - 0.25) < 0.06, `(music=${music.toFixed(2)})`);

// Drag the same slider to ~0.9
await page.mouse.move(gx(440 + 0.25 * 180), gy(134));
await page.mouse.down();
await page.mouse.move(gx(440 + 0.9 * 180), gy(134), { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
music = await page.evaluate(() => window.__audio.settings.music);
check('slider drag sets ~0.9', Math.abs(music - 0.9) < 0.06, `(music=${music.toFixed(2)})`);

// Settings persisted
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pnc-audio')));
check('slider changes persist to localStorage', Math.abs(stored.music - music) < 0.001);

// Mute toggle row
await click(480, 234);
await page.waitForTimeout(200);
check('mute toggle in panel works', await page.evaluate(() => window.__audio.muted));
await click(480, 234);
await page.waitForTimeout(200);
check('unmute toggle works', !(await page.evaluate(() => window.__audio.muted)));

// Quick-slot Save button
await page.evaluate(() => localStorage.removeItem('pnc-save-0'));
await click(578, 308);
await page.waitForTimeout(300);
check('Save button writes a save', await page.evaluate(() => !!localStorage.getItem('pnc-save-0')));

// Close restores gameplay
await click(480, 500);
await page.waitForTimeout(200);
check('Close closes the menu', !(await page.evaluate(() => window.__engine.menuOpen)));
await click(700, 420);
await page.waitForTimeout(2500);
const moved = await playerPos();
check('room clicks work again after closing', Math.abs(moved.x - 700) < 20, `(x=${moved.x.toFixed(0)})`);

// ESC closes too
await click(894, 25);
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('ESC closes the menu', !(await page.evaluate(() => window.__engine.menuOpen)));

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
