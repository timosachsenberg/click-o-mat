import { chromium } from 'playwright';

// "Folge dem Bass" — inside the Hölderlinturm: out of the Picasso, past the
// Epplehaus onto the Neckarbrücke, along the promenade to the tower and in
// through its door. Otto R.'s Rössler attractor throws the room between
// three time layers (house style, 1987 pixels, modern cartoon collage); the
// riddle runs across them: meet Otto (stuck in 1987), fold back the rug,
// pick up the black hole underneath (only possible in the modern layer, as
// a cartoon portable hole), and put it on the wall under his PUT PUT
// graffiti — in 1987 — so he can walk out. He leaves his pocket attractor.
// Back out on the bridge, the chapter's end still works.

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';
const url = new URL(BASE);
url.searchParams.set('game', 'goa');

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await page.goto(url.toString());
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);
const ev = (fn, arg) => page.evaluate(fn, arg);

await click(480, 300); // start
await page.waitForTimeout(1500);

const settle = async () => {
  for (let i = 0; i < 300; i++) {
    const st = await ev(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode, c: window.__engine.choicesShowing }));
    if (!st.b && !st.d) return;
    if (st.c) return;
    if (st.b && !st.i) await click(480, 120);
    await page.waitForTimeout(200);
  }
  throw new Error('settle timeout');
};
const choices = () => ev(() => window.__engine.uiScene.choiceContainer.list
  .filter((t) => t.type === 'Text' && t.visible && t.text.startsWith('●'))
  .map((t) => { const b = t.getBounds(); return { text: t.text.slice(2), x: b.centerX, y: b.centerY }; }));
const pick = async (prefix) => {
  for (let i = 0; i < 40 && !(await ev(() => window.__engine.choicesShowing)); i++) await page.waitForTimeout(150);
  const list = await choices();
  const c = list.find((l) => l.text.startsWith(prefix));
  if (!c) throw new Error(`no choice "${prefix}" in: ${list.map((l) => l.text).join(' | ')}`);
  await click(c.x, c.y);
  await page.waitForTimeout(200);
  if (await ev(() => window.__engine.choicesShowing)) {
    const again = (await choices()).find((l) => l.text.startsWith(prefix));
    if (again) await click(again.x, again.y);
    await page.waitForTimeout(200);
  }
  await settle();
};
const flag = (k) => ev((k) => window.__engine.state.getFlag(k), k);
const inv = () => ev(() => [...window.__engine.state.inventory]);
const room = () => ev(() => window.__engine.state.currentRoom);
const era = async () => (await flag('turmEra')) ?? 0;
const hotspotAt = (x, y) => ev(({ x, y }) => window.__engine.roomScene.hotspotAt({ x, y })?.id ?? null, { x, y });
const bgKey = () => ev(() => window.__engine.roomScene.layerObj('bg').texture.key);
const waitFor = async (fn, ms, label) => {
  for (let t = 0; t < ms; t += 200) {
    if (await fn()) return true;
    await page.waitForTimeout(200);
  }
  console.log(`  (timed out waiting for ${label})`);
  return false;
};
const goTo = async (id, x, y, opts) => {
  await click(x, y, opts);
  await waitFor(async () => (await room()) === id, 15000, id);
  await settle();
};
// The verb grid: three columns, three rows.
const VERBS = {
  give: [40, 486], pickup: [178, 486], use: [318, 486],
  open: [50, 524], lookat: [190, 524], push: [318, 524],
  close: [60, 562], talkto: [190, 562], pull: [304, 562],
};
const verb = async (id) => {
  await settle();
  for (let i = 0; i < 20; i++) {
    await click(...VERBS[id]);
    await page.waitForTimeout(150);
    if ((await ev(() => window.__engine.selectedVerb)) === id) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`could not select verb ${id}`);
};
const doVerb = async (id, x, y) => {
  await verb(id);
  await click(x, y);
  await settle();
};
/** Take an item in hand (by its inventory slot) and use it on a point. */
const useItemOn = async (item, x, y) => {
  await settle();
  const i = (await inv()).indexOf(item);
  if (i < 0) throw new Error(`no ${item} in the inventory`);
  await click(522 + i * 112, 505);
  await page.waitForTimeout(150);
  await click(x, y);
  await settle();
};

await settle(); // intro lines

// --- out of the Picasso, past the Epplehaus, onto the bridge
await goTo('epplehaus', 311, 220, { button: 'right' });
await goTo('neckar', 932, 380);
check('on the Neckarbrücke', (await room()) === 'neckar');

// --- along the promenade, and in through the tower's door
check('the Hölderlinturm is a hotspot on the bridge', (await hotspotAt(440, 200)) === 'turm');
await verb('open');
await click(440, 200);
await waitFor(async () => (await room()) === 'hoelderlinturm', 25000, 'the tower');
await settle();
check('opening the Hölderlinturm leads inside', (await room()) === 'hoelderlinturm');
const pl = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y, s: a.sprite.scale }; });
check('the player comes in at the door, at full size', pl.x < 200 && pl.y > 380 && pl.s > 0.95, JSON.stringify(pl));
check('starts in the house-style layer', (await era()) === 0);
check('attractor, rug, graffiti, desk and door are there',
  (await hotspotAt(480, 190)) === 'attraktor' && (await hotspotAt(470, 420)) === 'teppich' && (await hotspotAt(824, 170)) === 'graffiti'
  && (await hotspotAt(200, 260)) === 'pult' && (await hotspotAt(50, 280)) === 'tuer');
check('Otto R. is nowhere to be seen (yet)', (await hotspotAt(724, 320)) !== 'otto');
await page.screenshot({ path: `${SHOT}/hoel-01-toon.png` });
const keyToon = await bgKey();

// --- turn the attractor: 1987
await click(480, 190); // default verb: use
await settle();
check('the attractor switches to the pixel layer', (await era()) === 1);
const keyPixel = await bgKey();
check('the backdrop is redrawn', keyPixel !== keyToon, `${keyToon} -> ${keyPixel}`);
check('Otto R. appears in 1987 and greets us', (await flag('ottoMet')) === true && (await hotspotAt(724, 320)) === 'otto');
await page.screenshot({ path: `${SHOT}/hoel-02-pixel.png` });

// --- talk to Otto: he's stuck, wants a hole in the wall, there's one under the rug
await click(724, 320, { button: 'right' });
await settle();
await pick('Warum gehst du nicht');
await pick('Was heißt PUT PUT');
await pick('Wo krieg ich ein Loch her');
await pick('Bis später');
check('Otto explained his predicament', (await flag('ottoExplained')) === true);

// --- the hole can't be put without having it
await doVerb('pull', 420, 404);
check('pulling the rug folds it back: a black hole underneath', (await flag('rugMoved')) === true && (await hotspotAt(500, 398)) === 'loch');
await doVerb('pickup', 500, 398);
check('in 1987 the hole is part of the floor', !(await flag('holeTaken')));
await page.screenshot({ path: `${SHOT}/hoel-03-hole-pixel.png` });

// --- on to the modern layer: the hole is a cartoon portable hole
await click(480, 190);
await settle();
check('turning on: the modern collage layer', (await era()) === 2 && (await bgKey()) !== keyPixel && (await bgKey()) !== keyToon);
check('Otto exists only in 1987', (await hotspotAt(724, 320)) !== 'otto');
await page.screenshot({ path: `${SHOT}/hoel-04-modern.png` });
await doVerb('pickup', 500, 398);
check('picked up the portable hole', (await flag('holeTaken')) === true && (await inv()).includes('loch'), JSON.stringify(await inv()));
check('the hole is gone from the floor in every layer', (await hotspotAt(500, 398)) === 'teppich' || (await hotspotAt(500, 398)) === null);

// --- the wrong layer: putting the hole here won't help Otto
await useItemOn('loch', 824, 300);
check('the hole stays in the pocket outside 1987', !(await flag('wallHole')) && (await inv()).includes('loch'));

// --- back to 1987 (pull turns the attractor backwards) and PUT PUT
await doVerb('pull', 480, 190);
check('pulling turns the attractor back to 1987', (await era()) === 1);
await useItemOn('loch', 824, 300);
check('the hole is in the wall', (await flag('wallHole')) === true && !(await inv()).includes('loch'));
check('Otto walked out through it', (await flag('ottoFree')) === true && (await hotspotAt(724, 320)) !== 'otto');
check('and left his pocket attractor', (await inv()).includes('taschenattraktor'), JSON.stringify(await inv()));
check('the hole in the wall is a hotspot now', (await hotspotAt(816, 300)) === 'mauerloch');
await page.screenshot({ path: `${SHOT}/hoel-05-free.png` });

// --- round the cycle back to the house style; the hole in the wall stays
await click(480, 190);
await settle();
await click(480, 190);
await settle();
check('back in the house-style layer', (await era()) === 0 && (await bgKey()) === keyToon);
check('the hole in the wall is still there', (await hotspotAt(816, 300)) === 'mauerloch');
await page.screenshot({ path: `${SHOT}/hoel-06-toon-after.png` });

// --- out through the door, back on the promenade by the tower
await goTo('neckar', 50, 280);
const out = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('out of the door: back at the tower on the promenade', (await room()) === 'neckar' && Math.abs(out.x - 478) < 12 && Math.abs(out.y - 304) < 12, JSON.stringify(out));

// --- the chapter's end still works (password and cap given directly here)
await ev(() => { window.__engine.state.setFlag('password'); window.__engine.makeContext().addItem('muetze', { silent: true }); });
await click(15, 432);
await waitFor(async () => (await flag('chapterDone')) === true, 30000, 'chapter end');
await settle();
check('towards the forest: chapter done', (await flag('chapterDone')) === true);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
