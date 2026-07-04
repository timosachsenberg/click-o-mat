import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch();
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
  throw new Error('settle timeout');
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const layer = (id) => page.evaluate((lid) => {
  const o = window.__engine.roomScene.layerObj(lid);
  return { depth: o.depth, visible: o.visible, x: o.x, y: o.y, anim: o.anims?.currentAnim?.key ?? null, frame: o.anims?.currentFrame?.index ?? null, playing: o.anims?.isPlaying ?? false };
}, id);
const playerDepth = () => page.evaluate(() => window.__engine.roomScene.actors.get('norb').sprite.depth);

await settle(); // lab intro

// --- lab: migrated layers exist with correct depths
const labBg = await layer('bg');
const lamp = await layer('lamp');
check('lab bg layer at BEHIND', labBg.depth === -1000, `(depth=${labBg.depth})`);
check('lab lamp occluder at 342', lamp.depth === 342, `(depth=${lamp.depth})`);

// --- hallway: plant layer occlusion, both sides of the baseline
await click(880, 220, { button: 'right' });
await settle();

// Stand behind the plant (feet above its 424 baseline). Clicking there would
// hit the plant hotspot, so place the actor directly for the depth check.
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(700, 398));
await page.waitForTimeout(150);
let pd = await playerDepth();
const plant = await layer('plant');
check('player BEHIND plant (depth < 424)', pd < plant.depth, `(player=${pd}, plant=${plant.depth})`);
await page.screenshot({ path: `${SHOT}/lay-01-behind-plant.png`, clip: { x: gx(560), y: gy(230), width: (box.width * 280) / 960, height: (box.height * 230) / 600 } });

// Stand in front of the plant (feet below the baseline)
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(700, 440));
await page.waitForTimeout(150);
pd = await playerDepth();
check('player IN FRONT of plant (depth > 424)', pd > plant.depth, `(player=${pd})`);
await page.screenshot({ path: `${SHOT}/lay-02-front-plant.png`, clip: { x: gx(560), y: gy(230), width: (box.width * 280) / 960, height: (box.height * 230) / 600 } });

// Plant push still works through the layer repaint path
await click(300, 524); // Push verb
await click(700, 380); // plant
await settle();
const moved = await page.evaluate(() => !!window.__engine.state.flags.plantMoved);
check('plant push (paint layer + dynamic hole) still works', moved);

// --- gallery: showcase layers
await click(872, 220, { button: 'right' });
await settle();

const pillar = await layer('pillar');
check('pillar at Layer.FRONT', pillar.depth === 5000, `(depth=${pillar.depth})`);

const s1 = await layer('sconce-left');
check('sconce plays sconce-flicker', s1.anim === 'sconce-flicker' && s1.playing, `(anim=${s1.anim})`);
await page.waitForTimeout(700);
const s2 = await layer('sconce-left');
check('sconce frames advance', s1.frame !== s2.frame, `(${s1.frame} -> ${s2.frame})`);

// --- bench collision: solid furniture, actors path around it
check('bench footprint is not walkable', !(await page.evaluate(() =>
  window.__engine.roomScene.walkArea.contains({ x: 490, y: 345 })
)));
await click(490, 345); // click INTO the bench: player stops at its edge
await settle();
let p = await page.evaluate(() => {
  const a = window.__engine.roomScene.actors.get('norb');
  return { x: a.x, y: a.y };
});
check('walking into the bench stops outside it',
  !(p.x > 422 && p.x < 558 && p.y > 318 && p.y < 370), `(${p.x.toFixed(0)},${p.y.toFixed(0)})`);
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(400, 345));
await page.waitForTimeout(150);
await click(600, 345); // cross to the far side: path must go AROUND
await settle();
p = await page.evaluate(() => {
  const a = window.__engine.roomScene.actors.get('norb');
  return { x: a.x, y: a.y };
});
check('pathfinding routes around the bench', Math.abs(p.x - 600) < 15, `(x=${p.x.toFixed(0)})`);

// Walk behind the pillar shaft (world x ~324-396) — player should be hidden
await click(360, 400);
await settle();
await page.screenshot({ path: `${SHOT}/lay-03-behind-pillar.png`, clip: { x: gx(240), y: gy(60), width: (box.width * 260) / 960, height: (box.height * 390) / 600 } });
const pdG = await playerDepth();
check('player depth < FRONT pillar', pdG < 5000, `(player=${pdG})`);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
