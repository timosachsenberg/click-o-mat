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
await page.waitForTimeout(300);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title screen
await page.waitForTimeout(1000);
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);
const scroll = () => page.evaluate(() => {
  const c = window.__engine.roomScene.cameras.main;
  return { x: c.scrollX, y: c.scrollY, zoom: c.zoom };
});
const clickWorld = async (wx, wy, opts = {}) => {
  const s = await scroll();
  await click(wx - s.x, wy - s.y, opts);
};
const settle = async () => {
  for (let i = 0; i < 160; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const busy = () => page.evaluate(() => window.__engine.busy);
const flag = (k) => page.evaluate((key) => window.__engine.state.flags[key], k);
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const player = () => page.evaluate(() => {
  const p = window.__engine.roomScene.actors.get('norb');
  return { x: p.x, y: p.y };
});
const CHECK = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await settle(); // lab intro

// --- Esc skips the mountain intro cutscene
await page.evaluate(async () => await window.__engine.roomScene.enterRoom('stairhall', 'fromGallery'));
await settle();
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1050, 720));
await page.waitForTimeout(900);
await clickWorld(1138, 580, { button: 'right' }); // front door -> mountain
// wait until the cutscene is running (busy, in mountain, not walking)
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => ({ r: window.__engine.state.currentRoom, b: window.__engine.busy, i: window.__engine.interruptible }));
  if (st.r === 'mountain' && st.b && !st.i) break;
}
await page.waitForTimeout(600); // first line is now showing
const tEsc = Date.now();
await page.keyboard.press('Escape');
let skipMs = -1;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(100);
  if (!(await busy())) { skipMs = Date.now() - tEsc; break; }
}
CHECK('Esc fast-forwards the intro cutscene', skipMs >= 0 && skipMs < 2500, `(${skipMs}ms)`);
CHECK('zoom back at 1 after skip', Math.abs((await scroll()).zoom - 1) < 0.02, `(zoom=${(await scroll()).zoom.toFixed(2)})`);
CHECK('ctx.once flag set by intro', (await flag('once:mountain-intro')) === true);

// --- leaving without having climbed: no parting line about calves
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(300, 812));
await page.waitForTimeout(900);
await clickWorld(132, 700, { button: 'right' }); // door -> stairhall
await settle();
CHECK('no outro before climbing (flag unset)', !(await flag('once:mountain-outro')));
CHECK('back in stairhall', (await room()) === 'stairhall');

// --- re-entering: intro must NOT rerun (once), so busy clears fast, no zoom dip
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1050, 720));
await page.waitForTimeout(900);
await clickWorld(1138, 580, { button: 'right' });
let minZoom = 1;
let clearMs = -1;
const t0 = Date.now();
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(150);
  if ((await room()) !== 'mountain') continue;
  minZoom = Math.min(minZoom, (await scroll()).zoom);
  if (!(await busy())) { clearMs = Date.now() - t0; break; }
}
CHECK('intro did not rerun on re-entry (no zoom dip)', minZoom > 0.95, `(minZoom=${minZoom.toFixed(2)})`);

// --- region: walking onto the trailhead stops the player and fires once
await clickWorld(900, 820);
await settle();
await page.waitForTimeout(600);
await clickWorld(1245, 766); // target inside the region; he should be stopped at its edge
await settle();
let p = await player();
CHECK('region onEnter fired (flag set)', (await flag('region:mountain:trailhead:enter')) === true);
CHECK('region stopped the walk at its boundary', p.x < 1235, `(x=${p.x.toFixed(0)})`);

// --- once: crossing again does not fire (walk completes to target)
await clickWorld(1000, 830);
await settle();
await page.waitForTimeout(500);
await clickWorld(1245, 766);
await settle();
p = await player();
CHECK('second crossing did not fire (walk completed)', Math.abs(p.x - 1245) < 18, `(x=${p.x.toFixed(0)})`);

// --- Esc during a plain walk must NOT teleport (not skippable)
await clickWorld(1000, 830);
await settle();
await page.waitForTimeout(600);
await clickWorld(1430, 845); // long walk to the right, inside the view
await page.waitForTimeout(500); // he is now mid-walk
const mid = await player();
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
p = await player();
CHECK('walk actually in progress when Esc pressed', mid.x > 1020 && mid.x < 1390, `(x=${mid.x.toFixed(0)})`);
CHECK('Esc does not teleport plain walks', p.x < 1390, `(x=${p.x.toFixed(0)})`);
await settle();

// --- after setting foot on the trail, the front door plays the outro (once)
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(300, 812));
await page.waitForTimeout(900);
await clickWorld(132, 700, { button: 'right' }); // door -> stairhall (outro line first)
await settle();
CHECK('outro fired after climbing (flag set)', (await flag('once:mountain-outro')) === true);
CHECK('back in stairhall after outro', (await room()) === 'stairhall');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
