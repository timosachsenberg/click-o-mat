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
const room = () => page.evaluate(() => window.__engine.state.currentRoom);

await settle(); // lab intro

// --- reach the forest through the mountain's woodland path
await page.evaluate(async () => {
  window.__engine.state.setFlag('once:mountain-intro');
  await window.__engine.roomScene.enterRoom('mountain', 'fromDoor');
});
await settle();
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1790, 800));
await page.evaluate(() => { const c = window.__engine.roomScene.cameras.main; c.stopFollow(); c.centerOn(1790, 800); });
await page.waitForTimeout(200);
await page.evaluate(() => { const s = window.__engine.roomScene.cameras.main; window.__s = { x: s.scrollX, y: s.scrollY }; });
const s = await page.evaluate(() => window.__s);
await click(1810 - s.x, 800 - s.y, { button: 'right' }); // edge of the woods -> forest
await settle();
check('mountain woodland path reaches the forest', (await room()) === 'forest');

// --- rain: scrolling TileSprite layers (lazily-loaded texture)
check('rain texture loaded (lazy)', await page.evaluate(() => window.__engine.roomScene.textures.exists('rain')));
const rf1 = await page.evaluate(() => window.__engine.roomScene.layerObj('rain-near').tilePositionY);
await page.waitForTimeout(300);
const rf2 = await page.evaluate(() => window.__engine.roomScene.layerObj('rain-near').tilePositionY);
// Rain falls downward → tilePositionY decreases (see the update() comment).
check('rain scrolls downward', rf2 < rf1, `(${rf1.toFixed(0)} -> ${rf2.toFixed(0)})`);
check('rain is a FRONT overlay', (await page.evaluate(() => window.__engine.roomScene.layerObj('rain-near').depth)) === 5000);

// --- weather is configured as non-blocking ambients
const amb = await page.evaluate(() => window.__engine.roomScene.roomDef.ambients?.length ?? 0);
check('forest has ambient weather events', amb >= 1, `(${amb})`);

// --- lightning + thunder: trigger deterministically via the "storm" hotspot,
// recording sfx and watching for the camera flash.
await page.evaluate(() => {
  const a = window.__audio;
  if (!a.__wrapped) { const o = a.playSfx.bind(a); a.playSfx = (n) => { (window.__sfx ||= []).push(n); o(n); }; a.__wrapped = true; }
  window.__sfx = [];
  // Record camera.flash() calls (the effect's isRunning window is too brief to poll).
  const cam = window.__engine.roomScene.cameras.main;
  if (!cam.__wrapped) { const o = cam.flash.bind(cam); cam.flash = (...args) => { window.__flashed = true; return o(...args); }; cam.__wrapped = true; }
  window.__flashed = false;
});
await click(480, 60, { button: 'right' }); // the storm (sky) — look-at flashes + thunders
await settle();
check('lightning produced a screen flash', await page.evaluate(() => window.__flashed === true));
check('thunder sound played', await page.evaluate(() => (window.__sfx || []).includes('thunder')), `(${await page.evaluate(() => JSON.stringify(window.__sfx))})`);

// --- forest theme music is playing
check('forest theme playing', (await page.evaluate(() => window.__audio.debug().currentMusic)) === 'forest-theme');

// --- tree occlusion: standing above a trunk baseline renders behind it
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(160, 360));
await page.waitForTimeout(150);
const pDepth = await page.evaluate(() => window.__engine.roomScene.actors.get('norb').sprite.depth);
const treeDepth = await page.evaluate(() => window.__engine.roomScene.layerObj('tree-l').depth);
check('player behind the tree when above its base', pDepth < treeDepth, `(player=${pDepth}, tree=${treeDepth})`);

// --- path back out returns to the mountain
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(80, 420));
await page.waitForTimeout(150);
await click(30, 380, { button: 'right' }); // path out (forest is single-screen, no scroll)
await settle();
check('forest path returns to the mountain', (await room()) === 'mountain');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
