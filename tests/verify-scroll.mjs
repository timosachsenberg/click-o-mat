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
  return { x: c.scrollX, y: c.scrollY };
});
/** Click a WORLD position by converting through the live camera scroll. */
const clickWorld = async (wx, wy, opts = {}) => {
  const s = await scroll();
  const sx = wx - s.x;
  const sy = wy - s.y;
  if (sx < 0 || sx > 960 || sy < 0 || sy > 450) throw new Error(`world (${wx},${wy}) off-screen at scroll (${s.x},${s.y})`);
  await click(sx, sy, opts);
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
const player = () => page.evaluate(() => {
  const p = window.__engine.roomScene.actors.get('norb');
  return { x: p.x, y: p.y, depth: p.sprite.depth };
});
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await settle(); // lab intro
await click(880, 220, { button: 'right' }); // lab -> hallway
await settle();
await click(872, 220, { button: 'right' }); // hallway -> gallery
await settle();
await click(885, 200, { button: 'right' }); // gallery -> stairhall (archway)
await settle();
check('reached stairhall', (await room()) === 'stairhall');

const bounds = await page.evaluate(() => {
  const b = window.__engine.roomScene.cameras.main.getBounds();
  return { w: b.width, h: b.height };
});
check('camera bounds = room size 1400x800', bounds.w === 1400 && bounds.h === 800, `(${bounds.w}x${bounds.h})`);

const s0 = await scroll();
check('camera starts bottom-left (scrollY at max 350)', s0.x === 0 && s0.y === 350, `(${s0.x},${s0.y})`);
const music = await page.evaluate(() => window.__audio.debug().currentMusic);
check('music continues across rooms without a music key', music === 'gallery-theme', `(${music})`);
await page.screenshot({ path: `${SHOT}/scr-01-entry.png` });

// --- horizontal scrolling + world-coordinate clicks
await clickWorld(930, 730);
await settle();
await page.waitForTimeout(800); // camera lerp
let p = await player();
let s = await scroll();
check('click resolves in world coords (player near 930)', Math.abs(p.x - 930) < 15, `(x=${p.x.toFixed(0)})`);
check('camera scrolled horizontally', s.x > 300, `(scrollX=${s.x.toFixed(0)})`);
await page.screenshot({ path: `${SHOT}/scr-02-scrolled-right.png` });

// --- climb the stairs to the landing (vertical scrolling), in hops so each
// next target is inside the camera view as it follows the player
await clickWorld(900, 610);
await settle();
await page.waitForTimeout(900); // camera lerp
await clickWorld(650, 480);
await settle();
await page.waitForTimeout(900);
await clickWorld(400, 456);
await settle();
await page.waitForTimeout(900);
p = await player();
s = await scroll();
check('player climbed to the landing', p.y < 480 && p.x < 620, `(x=${p.x.toFixed(0)}, y=${p.y.toFixed(0)})`);
check('camera scrolled vertically (up)', s.y < 280, `(scrollY=${s.y.toFixed(0)})`);
await page.screenshot({ path: `${SHOT}/scr-03-landing.png` });

// --- landing rail occlusion: player on the upper floor is behind it
const railLanding = await page.evaluate(() => window.__engine.roomScene.layerObj('rail-landing').depth);
check('player behind landing rail', p.depth < railLanding, `(player=${p.depth.toFixed(0)}, rail=${railLanding})`);

// --- mid-stair railing occlusion
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(820, 560));
await page.waitForTimeout(900); // camera pans to the actor
p = await player();
const railMid = await page.evaluate(() => window.__engine.roomScene.layerObj('rail-mid').depth);
check('player on stairs behind rail-mid slice', p.depth < railMid, `(player=${p.depth}, rail=${railMid})`);
s = await scroll();
await page.screenshot({
  path: `${SHOT}/scr-04-on-stairs.png`,
  clip: { x: gx(Math.max(0, 620 - s.x)), y: gy(Math.max(0, 380 - s.y)), width: (box.width * 440) / 960, height: (box.height * 330) / 600 },
});

// --- parallax
const sf = await page.evaluate(() => {
  const sky = window.__engine.roomScene.layerObj('sky');
  const roomL = window.__engine.roomScene.layerObj('room');
  return { sky: sky.scrollFactorX, room: roomL.scrollFactorX };
});
check('sky layer parallax 0.85, room layer 1.0', sf.sky === 0.85 && sf.room === 1, `(sky=${sf.sky})`);

// --- back through the door to the gallery
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(300, 720));
await page.waitForTimeout(900);
await clickWorld(165, 600, { button: 'right' });
await settle();
check('returned to gallery through stairhall door', (await room()) === 'gallery');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
