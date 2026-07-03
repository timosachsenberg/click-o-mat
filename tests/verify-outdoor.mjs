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
const scroll = () => page.evaluate(() => {
  const c = window.__engine.roomScene.cameras.main;
  return { x: c.scrollX, y: c.scrollY, zoom: c.zoom };
});
const clickWorld = async (wx, wy, opts = {}) => {
  const s = await scroll();
  const sx = wx - s.x;
  const sy = wy - s.y;
  if (sx < 0 || sx > 960 || sy < 0 || sy > 450) throw new Error(`(${wx},${wy}) off-screen at scroll (${s.x.toFixed(0)},${s.y.toFixed(0)})`);
  await click(sx, sy, opts);
};
const settle = async () => {
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const player = () => page.evaluate(() => {
  const p = window.__engine.roomScene.actors.get('norb');
  return { x: p.x, y: p.y, scale: p.sprite.scale };
});
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await settle(); // lab intro

// Jump to the stair hall and use the NEW front door for real.
await page.evaluate(() => window.__engine.roomScene.loadRoom('stairhall', 'fromGallery'));
await settle();
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1000, 720));
await page.waitForTimeout(900);
await clickWorld(1138, 580, { button: 'right' }); // front door (default: open)

// The mountain onEnter cutscene zooms out and back — record the min zoom
// while it plays (no skip clicks; let it run).
let minZoom = 1;
let zoomShotTaken = false;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(250);
  if ((await room()) !== 'mountain') continue;
  const s = await scroll();
  minZoom = Math.min(minZoom, s.zoom);
  if (!zoomShotTaken && s.zoom < 0.62) {
    zoomShotTaken = true;
    await page.screenshot({ path: `${SHOT}/out-01-zoomed-out.png` });
  }
  const busy = await page.evaluate(() => window.__engine.busy);
  if (!busy && i > 8) break;
}
check('reached the mountain through the front door', (await room()) === 'mountain');
check('entry cutscene zoomed out (min zoom < 0.6)', minZoom < 0.6, `(min=${minZoom.toFixed(2)})`);
check('zoom restored to 1 after cutscene', Math.abs((await scroll()).zoom - 1) < 0.01, `(zoom=${(await scroll()).zoom.toFixed(2)})`);
const music = await page.evaluate(() => window.__audio.debug().currentMusic);
check('mountain music playing', music === 'mountain-theme', `(${music})`);

// --- scale map: big in the meadow, tiny at the summit
let p = await player();
const meadowScale = p.scale;
check('meadow scale ≈ 1', meadowScale > 0.9, `(scale=${meadowScale.toFixed(2)})`);
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1200, 298));
await page.waitForTimeout(300);
p = await player();
check('summit scale tiny (scale map)', p.scale < 0.32, `(scale=${p.scale.toFixed(2)})`);
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(170, 812));
await page.waitForTimeout(900);

// --- really climb: pathfind across the switchbacks with world clicks
await clickWorld(900, 820);
await settle();
await page.waitForTimeout(800);
await clickWorld(1350, 800);
await settle();
await page.waitForTimeout(800);
await clickWorld(1550, 628);
await settle();
await page.waitForTimeout(800);
p = await player();
if (Math.abs(p.x - 1550) > 20) {
  // The trailhead region fired on first crossing and stopped the walk —
  // expected on a fresh save. Resume the climb.
  await clickWorld(1550, 628);
  await settle();
  await page.waitForTimeout(800);
  p = await player();
}
check('reached ledge 1 via leg 1', Math.abs(p.x - 1550) < 20 && p.y < 660, `(x=${p.x.toFixed(0)}, y=${p.y.toFixed(0)})`);
await clickWorld(1000, 507);
await settle();
await page.waitForTimeout(800);
await clickWorld(760, 447);
await settle();
await page.waitForTimeout(800);
await clickWorld(1150, 300);
await settle();
await page.waitForTimeout(900);
p = await player();
const s = await scroll();
check('climbed to the summit', p.y < 320 && p.x > 1080, `(x=${p.x.toFixed(0)}, y=${p.y.toFixed(0)})`);
check('camera followed up (scrollY small)', s.y < 150, `(scrollY=${s.y.toFixed(0)})`);
check('summit walk scale small', p.scale < 0.33, `(scale=${p.scale.toFixed(2)})`);
await page.screenshot({ path: `${SHOT}/out-02-summit.png` });

// --- vista: scripted zoom-out from the summit
await click(180, 524); // Look at
await clickWorld(1100, 140); // "the view" (sky)
let vistaMin = 1;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(250);
  const z = (await scroll()).zoom;
  vistaMin = Math.min(vistaMin, z);
  if (vistaMin < 0.55 && z > 0.95 && i > 8) break;
}
await settle();
check('vista look-at zoomed to ~0.5 and back', vistaMin < 0.55 && Math.abs((await scroll()).zoom - 1) < 0.01, `(min=${vistaMin.toFixed(2)})`);

// --- ambients: the bird crosses without locking input
let birdSeen = false;
let busyDuringBird = null;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(500);
  const bx = await page.evaluate(() => window.__engine.roomScene.layerObj('bird').x);
  if (bx > 150 && bx < 1800) {
    birdSeen = true;
    busyDuringBird = await page.evaluate(() => window.__engine.busy);
    await page.screenshot({ path: `${SHOT}/out-03-bird.png` });
    break;
  }
}
check('ambient bird flew across', birdSeen);
check('ambient did not lock input (busy stayed false)', busyDuringBird === false);

// --- back inside
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(300, 812));
await page.waitForTimeout(900);
await clickWorld(132, 700, { button: 'right' });
await settle();
check('front door leads back to the stair hall', (await room()) === 'stairhall');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
