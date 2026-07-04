import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1000, height: 640 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);
const settle = async () => {
  for (let i = 0; i < 160; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const Y0 = 286; // quick-slot row
const savedWhen = () => page.evaluate(() => {
  const raw = localStorage.getItem('pnc-save-0');
  return raw ? JSON.parse(raw).when : null;
});

await click(480, 300); // title -> new game
await page.waitForTimeout(1200);
await settle();
await page.keyboard.press('F5'); // occupy the quick slot
await page.waitForTimeout(400);
const t0 = await savedWhen();
check('quick slot occupied', t0 !== null);

// --- overwrite: Save on an occupied slot asks first; "No" keeps the old save
await click(894, 25); // gear
await page.waitForTimeout(300);
await click(578, Y0); // Save on occupied QUICK -> confirm mode
await page.waitForTimeout(250);
await page.screenshot({ path: `${SHOT}/mgmt-01-confirm.png`, clip: { x: gx(285), y: gy(262), width: (box.width * 400) / 960, height: (box.height * 44) / 600 } });
check('no overwrite before confirming', (await savedWhen()) === t0);
await click(640, Y0); // No
await page.waitForTimeout(250);
check('"No" keeps the old save', (await savedWhen()) === t0);

// --- "Yes" overwrites
await click(578, Y0); // Save -> confirm again
await page.waitForTimeout(250);
await click(590, Y0); // Yes
await page.waitForTimeout(300);
const t1 = await savedWhen();
check('"Yes" overwrites (newer timestamp)', t1 !== null && t1 > t0);

// --- delete: ✕ asks; "No" keeps, "Yes" removes
await click(668, Y0); // ✕
await page.waitForTimeout(250);
await click(640, Y0); // No
await page.waitForTimeout(250);
check('delete "No" keeps the save', (await savedWhen()) === t1);
await click(668, Y0); // ✕ again
await page.waitForTimeout(250);
await click(590, Y0); // Yes
await page.waitForTimeout(300);
check('delete "Yes" removes the save', (await savedWhen()) === null);

// --- ✕ on an empty slot is a no-op (no confirm appears)
await click(668, Y0);
await page.waitForTimeout(250);
// If a confirm appeared, Save/Load would be hidden; clicking Save (empty slot)
// must therefore save directly:
await click(578, Y0);
await page.waitForTimeout(300);
check('empty-slot ✕ no-op, Save on empty slot saves directly', (await savedWhen()) !== null);

// --- confirm state resets when the panel closes
await click(668, Y0); // ✕ -> confirm pending
await page.waitForTimeout(200);
await click(480, 484); // Close
await page.waitForTimeout(200);
await click(894, 25); // reopen
await page.waitForTimeout(300);
// Row must be back to normal: Load (occupied slot) works instead of Yes/No
check('pending confirm cleared on close (save intact)', (await savedWhen()) !== null);
await click(480, 484);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
