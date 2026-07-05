import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title
await page.waitForTimeout(1000);
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
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const enter = (room, entry) => page.evaluate(async ({ room, entry }) => window.__engine.roomScene.enterRoom(room, entry), { room, entry });
const narrations = () => page.evaluate(() => window.__narr.slice());

await settle(); // lab intro

// Record every narrateFeatures() call, and skip room intros for speed.
await page.evaluate(() => {
  const rs = window.__engine.roomScene;
  window.__narr = [];
  const o = rs.narrateFeatures.bind(rs);
  rs.narrateFeatures = (def) => { window.__narr.push(def.id); return o(def); };
  for (const f of ['forest-intro', 'mountain-intro', 'stairhall-intro', 'stairhall-outro']) {
    window.__engine.state.setFlag('once:' + f);
  }
});

// --- OFF by default: entering a room with features must NOT narrate
check('commentary off by default', (await page.evaluate(() => window.__engine.commentary)) === false);
await enter('gallery', 'fromHallway');
await settle();
check('no narration while commentary is off', (await narrations()).length === 0, `(${JSON.stringify(await narrations())})`);

// --- turning it on (F2) narrates the CURRENT room right away
await page.keyboard.press('F2');
await settle();
check('F2 turned commentary on', (await page.evaluate(() => window.__engine.commentary)) === true);
check('enabling narrates the current room', (await narrations()).includes('gallery'));
check('preference persisted', (await page.evaluate(() => localStorage.getItem('pnc-commentary'))) === '1');

// --- entering a new room with features narrates on first entry
await enter('forest', 'fromMountain');
await settle();
check('first entry narrates the new room', (await narrations()).filter((r) => r === 'forest').length === 1);

// --- re-entering an already-narrated room stays quiet
await enter('gallery', 'fromHallway');
await settle();
check('re-entry does not narrate again', (await narrations()).filter((r) => r === 'gallery').length === 1, `(${JSON.stringify(await narrations())})`);

// --- turning it off: entering a fresh room does NOT narrate
await page.keyboard.press('F2'); // off
await page.waitForTimeout(200);
check('F2 turned commentary off', (await page.evaluate(() => window.__engine.commentary)) === false);
await enter('stairhall', 'fromGallery');
await settle();
check('no narration after turning off', !(await narrations()).includes('stairhall'));

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
