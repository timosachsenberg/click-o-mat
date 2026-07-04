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
  for (let i = 0; i < 160; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const critter = () => page.evaluate(() => {
  const a = window.__engine.roomScene.actors.get('critter');
  return { x: a.x, y: a.y, facing: a.facing };
});
const player = () => page.evaluate(() => {
  const p = window.__engine.roomScene.actors.get('norb');
  return { x: p.x, y: p.y, facing: p.facing };
});
const hotspotAt = (x, y) => page.evaluate(({ x, y }) => window.__engine.roomScene.hotspotAt({ x, y })?.id ?? null, { x, y });
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await settle(); // lab intro

// --- Ned (stationary, actor-bound now): hotspot resolves on his sprite
const nedHit = await hotspotAt(745, 370);
check('Ned actor-bound hotspot hit-tests on his sprite', nedHit === 'tent', `(got ${nedHit})`);

// --- gallery: Blobbo wanders via ambient
await page.evaluate(async () => await window.__engine.roomScene.enterRoom('gallery', 'fromHallway'));
await settle();
const c0 = await critter();
let cMoved = null;
for (let i = 0; i < 50; i++) {
  await page.waitForTimeout(500);
  const c = await critter();
  if (Math.hypot(c.x - c0.x, c.y - c0.y) > 40) { cMoved = c; break; }
}
check('Blobbo wanders (ambient walk)', cMoved !== null, cMoved ? `(${c0.x.toFixed(0)},${c0.y.toFixed(0)}) -> (${cMoved.x.toFixed(0)},${cMoved.y.toFixed(0)})` : '');

// Wait until he pauses between strolls, then test the hotspot at his NEW spot
let cNow = await critter();
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(400);
  const c = await critter();
  if (Math.abs(c.x - cNow.x) < 1 && Math.abs(c.y - cNow.y) < 1) { cNow = c; break; }
  cNow = c;
}
const hitNew = await hotspotAt(cNow.x, cNow.y - 30);
check('hotspot follows the actor (hit at new position)', hitNew === 'critter', `(got ${hitNew} at ${cNow.x.toFixed(0)},${cNow.y.toFixed(0)})`);
if (Math.hypot(cNow.x - c0.x, cNow.y - c0.y) > 80) {
  const hitOld = await hotspotAt(c0.x, c0.y - 30);
  check('no hotspot left at his old position', hitOld !== 'critter', `(got ${hitOld})`);
} else {
  check('no hotspot left at his old position', true, '(skipped: positions overlap)');
}

// --- talk to him where he stands now: player approaches, he stops and faces
await click(cNow.x, cNow.y - 25, { button: 'right' }); // talkto (gallery is unscrolled)
// Blobbo's dialog is ink-based with choices now: exit via "I should go"/"Goodbye"
for (let i = 0; i < 80; i++) {
  const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, c: window.__engine.choicesShowing, d: window.__engine.dialogMode }));
  if (!st.b && !st.d) break;
  if (st.c) {
    const list = await page.evaluate(() => window.__engine.uiScene.choiceContainer.list
      .filter((t) => t.type === 'Text' && t.visible && t.text.startsWith('●'))
      .map((t) => { const b = t.getBounds(); return { text: t.text, x: b.centerX, y: b.centerY }; }));
    const exit = list.find((c) => c.text.includes('I should go') || c.text.includes('Goodbye'));
    if (exit) { await click(exit.x, exit.y); await page.waitForTimeout(300); continue; }
  }
  if (st.b && !st.i) await click(480, 240);
  await page.waitForTimeout(250);
}
await settle();
const pAfter = await player();
const cAfter = await critter();
check('player approached the wandering NPC', Math.hypot(pAfter.x - cAfter.x, pAfter.y - cAfter.y) < 140, `(dist=${Math.hypot(pAfter.x - cAfter.x, pAfter.y - cAfter.y).toFixed(0)})`);
const expectFacing = pAfter.x > cAfter.x ? 'right' : 'left';
check('NPC turned to face the player', cAfter.facing === expectFacing || cAfter.facing === 'down', `(facing=${cAfter.facing}, player on ${expectFacing} side)`);
await page.screenshot({ path: `${SHOT}/npc-01-talk.png` });

// Sentence line follows him on hover
await page.mouse.move(gx(cAfter.x), gy(cAfter.y - 25));
await page.waitForTimeout(300);
const hover = await page.evaluate(() => window.__engine.roomScene.hotspotAt({
  x: window.__engine.roomScene.actors.get('critter').x,
  y: window.__engine.roomScene.actors.get('critter').y - 25,
})?.name ?? null);
check('hover names him at his live position', hover === 'Blobbo', `(got ${hover})`);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
