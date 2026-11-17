import { chromium } from 'playwright';

// "Folge dem Bass" — inside the Hölderlinturm: out of the Picasso, past the
// Epplehaus onto the Neckarbrücke, along the promenade to the tower and in
// through its door. The tower is a doll's house seen from the river: the
// Turmstube upstairs, the vaulted cellar below, joined by stairs. (Clicks go
// through the camera, should a room ever scroll.) Otto R.'s Rössler attractor throws it between
// three time layers (house style, 1987 pixels, modern cartoon collage); the
// riddle runs across them: meet Otto (stuck in the cellar in 1987), roll up the rug upstairs,
// pick up the black hole underneath (only possible in the modern layer, as
// a cartoon portable hole), and put it on the wall under his PUT PUT
// graffiti on the cellar wall — in 1987 — so he can walk out. He leaves his pocket attractor.
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
/** Wait for the camera to settle, then click a world point (rooms may scroll). */
const camY = () => ev(() => window.__engine.roomScene.cameras.main.scrollY);
const camSettle = async () => {
  let last = await camY();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(120);
    const y = await camY();
    if (Math.abs(y - last) < 0.5) return;
    last = y;
  }
};
const clickW = async (x, y, opts = {}) => {
  await camSettle();
  const sy = await camY();
  if (y - sy < 0 || y - sy > 450) throw new Error(`world point ${x},${y} is off screen (scrollY ${sy})`);
  await click(x, y - sy, opts);
};

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
/** Every choice on offer, across all pages (ends on the page it started on). */
const allChoices = async () => {
  const seen = [];
  for (let p = 0; p < 6; p++) {
    const page1 = await choices();
    if (page1.length && seen.some((t) => t === page1[0].text)) break;
    seen.push(...page1.map((c) => c.text));
    await ev(() => window.__engine.uiScene.choiceChangePage?.(1));
    await page.waitForTimeout(120);
  }
  return [...new Set(seen)];
};
const pick = async (prefix) => {
  for (let i = 0; i < 40 && !(await ev(() => window.__engine.choicesShowing)); i++) await page.waitForTimeout(150);
  let list = await choices();
  let c = list.find((l) => l.text.startsWith(prefix));
  // Long lists paginate (how many fit depends on the browser's text metrics):
  // leaf through the pages until the choice turns up.
  for (let p = 0; !c && p < 4; p++) {
    await ev(() => window.__engine.uiScene.choiceChangePage?.(1));
    await page.waitForTimeout(120);
    const more = await choices();
    list = [...list, ...more.filter((m) => !list.some((l) => l.text === m.text))];
    c = more.find((l) => l.text.startsWith(prefix));
  }
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
  await clickW(x, y);
  await settle();
};
/** Take an item in hand (by its inventory slot) and use it on a point. */
const useItemOn = async (item, x, y) => {
  await settle();
  const i = (await inv()).indexOf(item);
  if (i < 0) throw new Error(`no ${item} in the inventory`);
  await click(522 + i * 112, 505);
  await page.waitForTimeout(150);
  await clickW(x, y);
  await settle();
};

await settle(); // off the bus on the Neckarbrücke
// --- a full döner stamp card, lost on the bridge
check('a stamp card lies on the bridge', (await hotspotAt(824, 437)) === 'stempelkarte');
await click(824, 437); // default verb: take
await settle();
check('took the full stamp card', (await inv()).includes('stempelkarte'), JSON.stringify(await inv()));

// --- to the Picasso: past the Epplehaus and the döner stand (a free döner on the way)
await goTo('epplehaus', 15, 432);
await goTo('doener', 15, 400);
await verb('give');
await click(522 + (await inv()).indexOf('stempelkarte') * 112, 505);
await page.waitForTimeout(150);
await click(442, 230); // the döner man
await settle();
check('ten stamps: a free döner', (await inv()).includes('doener') && !(await inv()).includes('stempelkarte'), JSON.stringify(await inv()));
await goTo('picasso', 86, 260);
check('in the Picasso', (await room()) === 'picasso');

let said = [];
// --- the Picasso: pretzel crumbs in the bowl on the counter — by hand they trickle away
check('a bowl of pretzel crumbs on the counter', (await hotspotAt(560, 322)) === 'brezel');
await click(560, 322); // default verb: take
await settle();
check('crumbs can\'t be carried by hand', !(await flag('brezelTaken')) && !(await inv()).some((i) => i.startsWith('muetze')), JSON.stringify(await inv()));
// The cap comes from sinking the punt (covered by verify-goa); here it's handed over directly.
await ev(() => window.__engine.makeContext().addItem('muetze', { silent: true }));
await useItemOn('muetze', 560, 322);
check('the cap makes a crumb bag', (await inv()).includes('muetzekruemel') && !(await inv()).includes('muetze') && (await flag('brezelTaken')) === true, JSON.stringify(await inv()));

// --- the Epplehaus: Flaschenfloh feeds the pigeons — put, put, put! — and one parrots it
await goTo('doener', 311, 220, { button: 'right' });
await goTo('epplehaus', 945, 400);
const giveFloh = async (item) => {
  await verb('give');
  await click(522 + (await inv()).indexOf(item) * 112, 505);
  await page.waitForTimeout(150);
  await click(556, 300); // Flaschenfloh
  await settle();
};
await giveFloh('muetzekruemel');
check('hungry, Flaschenfloh won\'t feed the pigeons yet', !(await flag('putTaube')) && (await inv()).includes('muetzekruemel'));
await giveFloh('doener');
check('he eats the döner', (await flag('flohSatt')) === true && !(await inv()).includes('doener'));
await giveFloh('muetzekruemel');
check('Flaschenfloh feeds the pigeons, one starts saying "Put put"', (await flag('putTaube')) === true && (await flag('putHeard')) === true && !(await inv()).includes('muetzekruemel'));
check('and keeps the cap', !(await inv()).some((i) => i.startsWith('muetze')), JSON.stringify(await inv()));
const putPos = await ev(() => { const a = window.__engine.roomScene.actors.get('taube3'); return { x: a.x, y: a.y, h: a.sprite.displayHeight }; });
check('the parroting pigeon pecks crumbs by Flaschenfloh', Math.abs(putPos.x - 506) < 6 && Math.abs(putPos.y - 376) < 6, JSON.stringify(putPos));
await page.waitForTimeout(2500);
const stillThere = await ev(() => { const a = window.__engine.roomScene.actors.get('taube3'); return { x: a.x, y: a.y }; });
check('busy with its crumbs, it stays put', Math.abs(stillThere.x - 506) < 6, JSON.stringify(stillThere));
await page.screenshot({ path: `${SHOT}/hoel-00a-feeding.png` });
await doVerb('pickup', putPos.x, putPos.y - putPos.h * 0.4);
check('caught the Put-Put pigeon', (await inv()).includes('taube') && (await flag('taubeCaught')) === true, JSON.stringify(await inv()));

// --- on to the bridge
await goTo('neckar', 945, 380);
check('on the Neckarbrücke', (await room()) === 'neckar');

// --- the tower's door: Otto R. on the intercom wants the password
check('the Hölderlinturm is a hotspot on the bridge', (await hotspotAt(440, 200)) === 'turm');
await click(440, 200); // a plain click on the tower (its default verb) leads to the door too
await waitFor(async () => (await room()) === 'turmtuer', 25000, 'the door');
await settle();
check('a click on the tower itself leads to its door', (await room()) === 'turmtuer');
await goTo('neckar', 930, 400);
await goTo('turmtuer', 458, 284); // the tower's door (default verb): on to the close-up
check('a close-up of the door: door, intercom and graffiti', (await hotspotAt(480, 250)) === 'tuer' && (await hotspotAt(630, 235)) === 'sprechanlage' && (await hotspotAt(322, 250)) === 'putput');
await click(480, 250); // default verb: open — locked, so the intercom
await waitFor(() => ev(() => window.__engine.choicesShowing), 25000, 'the intercom');
check('the door is locked: Otto asks for the password', (await room()) === 'turmtuer' && (await flag('turmAsked')) === true);
said = await allChoices();
check('no Chakabunga at the intercom before Ali said it', !said.some((t) => t.startsWith('Chakabunga')), said.join(' | '));
await pick('Put put?');
check('saying "Put put" yourself: the voice is wrong', (await flag('putTried')) === true && !(await flag('turmOpen')));
await pick('Schon gut');
check('still outside', (await room()) === 'turmtuer');

// --- the pigeon says it, in the right voice: the door opens
await useItemOn('taube', 630, 235);
check('the pigeon says the password: the door is open', (await flag('turmOpen')) === true && !(await inv()).includes('taube'));
await click(480, 250);
await waitFor(async () => (await room()) === 'hoelderlinturm', 25000, 'the tower');
await settle();
check('opening the Hölderlinturm leads inside', (await room()) === 'hoelderlinturm');
const pl = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y, s: a.sprite.scale }; });
check('the player comes in at the door, upstairs', pl.x < 200 && pl.y > 236 && pl.y < 258 && Math.abs(pl.s - 0.8) < 0.01, JSON.stringify(pl));
check('the whole doll\'s house fits one screen', await ev(() => window.__engine.roomScene.roomSize.h === 450));
check('starts in the house-style layer', (await era()) === 0);
check('attractor, rug, graffiti, desk, bed, barrels and door are there',
  (await hotspotAt(382, 164)) === 'attraktor' && (await hotspotAt(540, 248)) === 'teppich' && (await hotspotAt(580, 296)) === 'graffiti'
  && (await hotspotAt(244, 214)) === 'pult' && (await hotspotAt(790, 220)) === 'bett' && (await hotspotAt(230, 350)) === 'faesser'
  && (await hotspotAt(122, 214)) === 'tuer');
check('Otto R. is nowhere to be seen (yet)', (await hotspotAt(760, 340)) !== 'otto');
await page.screenshot({ path: `${SHOT}/hoel-01-toon.png` });
const keyToon = await bgKey();

// --- down the stairs into the cellar (the barrels), and back up
await doVerb('lookat', 230, 350);
const down = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('down the stairs to the barrels in the cellar', down.y > 372 && down.y < 394 && Math.abs(down.x - 232) < 12, JSON.stringify(down));

// --- turn the attractor (back upstairs): 1987
await clickW(382, 164); // default verb: use
await settle();
check('the attractor switches to the pixel layer', (await era()) === 1);
const keyPixel = await bgKey();
check('the backdrop is redrawn', keyPixel !== keyToon, `${keyToon} -> ${keyPixel}`);
check('Otto R. appears in the cellar in 1987 and greets us', (await flag('ottoMet')) === true && (await hotspotAt(760, 340)) === 'otto');
await page.screenshot({ path: `${SHOT}/hoel-02-pixel.png` });

// --- talk to Otto: he's stuck, wants a hole in the wall, there's one under the rug
await clickW(760, 340, { button: 'right' });
await settle();
const otto = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('down the cellar stairs to talk to him', otto.y > 372, JSON.stringify(otto));
await pick('Warum gehst du nicht');
await pick('Was heißt PUT PUT');
await pick('Wo krieg ich ein Loch her');
await pick('Bis später');
check('Otto explained his predicament', (await flag('ottoExplained')) === true);

// --- the rug upstairs: roll it up, a black hole underneath
await doVerb('pull', 540, 248);
check('pulling the rug rolls it up: a black hole underneath', (await flag('rugMoved')) === true && (await hotspotAt(606, 248)) === 'loch');
const holes = await ev(() => window.__engine.roomScene.roomDef.holes(window.__engine.state).length);
check('the hole is a hole in the floor (walked round)', holes === 1);
await doVerb('pickup', 606, 248);
check('in 1987 the hole is part of the floor', !(await flag('holeTaken')));
await page.screenshot({ path: `${SHOT}/hoel-03-hole-pixel.png` });

// --- on to the modern layer: the hole is a cartoon portable hole
await clickW(382, 164);
await settle();
check('turning on: the modern collage layer', (await era()) === 2 && (await bgKey()) !== keyPixel && (await bgKey()) !== keyToon);
check('Otto exists only in 1987', (await hotspotAt(760, 340)) !== 'otto');
await page.screenshot({ path: `${SHOT}/hoel-04-modern.png` });
await doVerb('pickup', 606, 248);
check('picked up the portable hole', (await flag('holeTaken')) === true && (await inv()).includes('loch'), JSON.stringify(await inv()));
check('the hole is gone from the floor in every layer', (await hotspotAt(606, 248)) !== 'loch');

// --- the wrong layer: putting the hole here won't help Otto
await useItemOn('loch', 580, 296);
check('the hole stays in the pocket outside 1987', !(await flag('wallHole')) && (await inv()).includes('loch'));

// --- back to 1987 (pull turns the attractor backwards) and PUT PUT
await doVerb('pull', 382, 164);
check('pulling turns the attractor back to 1987', (await era()) === 1);
await useItemOn('loch', 580, 296);
check('the hole is in the cellar wall', (await flag('wallHole')) === true && !(await inv()).includes('loch'));
check('Otto walked out through it', (await flag('ottoFree')) === true && (await hotspotAt(760, 340)) !== 'otto');
check('and left his pocket attractor', (await inv()).includes('taschenattraktor'), JSON.stringify(await inv()));
check('the hole in the wall is a hotspot now', (await hotspotAt(671, 340)) === 'mauerloch');
await camSettle();
await page.screenshot({ path: `${SHOT}/hoel-05-free.png` });

// --- the hole stays in the wall in 1987; in the modern layer it peels off again
await doVerb('pickup', 671, 340);
check('in 1987 the hole is stuck in the wall', (await flag('wallHoleTaken')) !== true && (await hotspotAt(671, 340)) === 'mauerloch');
await useItemOn('taschenattraktor', 671, 340);
check('the pocket attractor on the stuck hole: no wormhole yet', !(await inv()).includes('wurmloch') && (await inv()).includes('taschenattraktor'), JSON.stringify(await inv()));
await clickW(382, 164);
await settle();
check('on to the modern layer', (await era()) === 2);
await doVerb('pickup', 671, 340);
check('took the hole off the wall again', (await flag('wallHoleTaken')) === true && (await inv()).includes('loch') && (await hotspotAt(671, 340)) !== 'mauerloch', JSON.stringify(await inv()));

// --- black hole + pocket attractor = wormhole
{
  await settle();
  const items = await inv();
  await click(522 + items.indexOf('loch') * 112, 505);
  await page.waitForTimeout(150);
  await click(522 + items.indexOf('taschenattraktor') * 112, 505);
  await settle();
}
check('combining hole and pocket attractor makes a wormhole', (await inv()).includes('wurmloch') && !(await inv()).includes('loch') && !(await inv()).includes('taschenattraktor'), JSON.stringify(await inv()));

// --- round the cycle back to the house style
await clickW(382, 164);
await settle();
check('back in the house-style layer', (await era()) === 0 && (await bgKey()) === keyToon);
await camSettle();
await page.screenshot({ path: `${SHOT}/hoel-06-toon-after.png` });

// --- out through the door, back on the promenade by the tower
await camSettle();
await clickW(122, 214);
await waitFor(async () => (await room()) === 'turmtuer', 15000, 'the door');
// No clicking to skip lines here: a stray click would walk the player off.
await waitFor(async () => !(await ev(() => window.__engine.busy)), 8000, 'arrival');
const out = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('out of the door: in front of it, in the close-up', (await room()) === 'turmtuer' && Math.abs(out.x - 479) < 12 && Math.abs(out.y - 366) < 12, JSON.stringify(out));
check('the door stands ajar now', await ev(() => window.__engine.roomScene.layerObj('ajar').visible === true));
await goTo('neckar', 930, 400);
const back = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('along the promenade: back at the tower on the bridge scene', Math.abs(back.x - 478) < 12 && Math.abs(back.y - 304) < 12, JSON.stringify(back));

// --- saving is refused while a scene is running
await verb('lookat');
await click(440, 200); // look at the tower: a line starts
await page.waitForTimeout(250);
const savesBefore = await ev(() => localStorage.getItem('pnc-save-goa-0'));
await page.keyboard.press('F5');
await page.waitForTimeout(200);
check('no quick save mid-scene', (await ev(() => localStorage.getItem('pnc-save-goa-0'))) === savesBefore && (await ev(() => window.__engine.busy)) === true);
await settle();

// --- the wormhole pair: useless here, it wants throwing at the forest's barrier
await verb('use');
await click(522 + (await inv()).indexOf('wurmloch') * 112, 505);
await page.waitForTimeout(200);
check('"Benutze" + an item takes it in hand, even one with a use of its own', (await ev(() => window.__engine.pendingItem)) === 'wurmloch' && !(await ev(() => window.__engine.busy)));
await click(522 + (await inv()).indexOf('wurmloch') * 112, 505); // a second click: use it on its own
await settle();
check('on the bridge the wormhole pair stays in the pocket', (await room()) === 'neckar' && (await inv()).includes('wurmloch') && !(await flag('portalOpen')));
await goTo('waldrand', 945, 432);
await useItemOn('wurmloch', 420, 330);
await waitFor(async () => (await flag('portalOpen')) === true, 20000, 'the throw');
await settle();
check('one end thrown over the barrier: a portal stands at the forest\'s edge', (await flag('portalOpen')) === true && !(await inv()).includes('wurmloch') && (await hotspotAt(724, 326)) === 'portal');
await page.screenshot({ path: `${SHOT}/hoel-07-portal.png` });
// The pockets: the two euros (Ali's drink was never bought in this suite) and something useless.
await ev(() => window.__engine.makeContext().addItem('pogostick', { silent: true }));
check('no password yet, and the coin for it still in the pocket', !(await flag('password')) && (await inv()).includes('euro') && (await inv()).includes('pogostick'), JSON.stringify(await inv()));
await click(724, 326); // the portal (default verb: use): it lets you through, password or not
await waitFor(async () => (await room()) === 'goa', 20000, 'the dance floor');
// The landing is a cutscene that ends in the Goazwerg's question.
await waitFor(async () => { if (await ev(() => window.__engine.choicesShowing)) return true; await page.keyboard.press('Escape'); return false; }, 40000, 'the Goazwerg');
check('out of the portal: in the middle of the dance floor', (await room()) === 'goa' && (await flag('wormholeUsed')) === true);
// The AUTO save taken on arrival must hold the state before the landing scene
// touched anything: on the ground, and still due the landing and the bouncer.
const auto = await ev(() => JSON.parse(localStorage.getItem('pnc-save-goa-4') ?? 'null'));
const autoPos = auto?.data?.chars?.[auto?.data?.activeChar]?.pos ?? null;
check('the autosave on landing has the player on the floor, not in the air', !!autoPos && autoPos.y > 380, JSON.stringify(autoPos));
check('and still owes the landing (a reload replays it, bouncer included)', JSON.stringify(auto).includes('"portalLanding":true') && !JSON.stringify(auto).includes('"once:goaIntro":true'));
const landed = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('the player landed on the floor, by the portal', Math.abs(landed.x - 384) < 30 && Math.abs(landed.y - 404) < 20, JSON.stringify(landed));
check('the wormhole takes what is useless and leaves what the password still costs', JSON.stringify(await inv()) === '["euro"]', JSON.stringify(await inv()));
said = await allChoices();
check('the Goazwerg wants the password — and without it there is no Chakabunga to say', said.length > 0 && !said.some((t) => t.startsWith('Chakabunga')), said.join(' | '));
const zwerg = await ev(() => { const a = window.__engine.roomScene.actors.get('tuersteher'); return { y: a.y, depth: a.sprite.depth }; });
check('the Goazwerg stands in front of the dancers while he asks', zwerg.y >= 440, JSON.stringify(zwerg));
await page.screenshot({ path: `${SHOT}/hoel-07b-zwerg.png` });
await pick('Ich komm gleich');
await waitFor(async () => (await room()) === 'goaeingang', 20000, 'thrown out');
await settle();
check('without the password: thrown out, in front of the gate', (await room()) === 'goaeingang' && !(await flag('goaEntered')));
const ent = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
check('thrown out beside the bouncer, not on top of him', Math.abs(ent.x - 560) > 60, JSON.stringify(ent));
// --- there is a way back from here: on foot to the forest's edge, and into the portal again
check('the entrance has a path back into the woods', (await hotspotAt(30, 400)) === 'toWald');
await goTo('waldrand', 30, 400);
check('back at the forest\'s edge with the coin: the password can still be had', (await room()) === 'waldrand' && (await inv()).includes('euro'));
// Ali's password (verify-goa plays his riddle; here it is simply known from now on).
await ev(() => window.__engine.state.setFlag('password', 'Chakabunga'));
await click(724, 326);
await waitFor(async () => (await room()) === 'goa', 20000, 'the dance floor again');
await waitFor(async () => { if (await ev(() => window.__engine.choicesShowing)) return true; await page.keyboard.press('Escape'); return false; }, 40000, 'the Goazwerg again');
check('landing again without having been let in: the Goazwerg asks again', (await room()) === 'goa' && (await ev(() => window.__engine.choicesShowing)) === true);
said = await allChoices();
check('with the password known, Chakabunga is on offer', said.some((t) => t.startsWith('Chakabunga')), said.join(' | '));
check('and now the wormhole has taken everything: nothing is needed any more', (await inv()).length === 0, JSON.stringify(await inv()));
await pick('Ich komm gleich');
await waitFor(async () => (await room()) === 'goaeingang', 20000, 'thrown out again');
await settle();
check('bouncer, Flaschenfloh and the gate are there',
  (await hotspotAt(560, 334)) === 'tuersteher' && (await hotspotAt(790, 300)) === 'floh' && (await hotspotAt(560, 160)) === 'tor' && (await hotspotAt(110, 300)) !== 'wurmloch');
await page.screenshot({ path: `${SHOT}/hoel-07-goa.png` });

// --- the gate: not without the bouncer's say-so
await click(560, 160); // the gate (default verb: use)
await settle();
check('no way past the bouncer yet', (await room()) === 'goaeingang' && !(await flag('chapterDone')));

// --- talking to the bouncer at the gate: other answers don't get you in
await click(560, 334, { button: 'right' }); // talk to him
await waitFor(() => ev(() => window.__engine.choicesShowing), 8000, 'bouncer');
await pick('Put put?');
await pick('Ich komm gleich');

// --- with the password: in through the gate
await click(560, 334, { button: 'right' });
await waitFor(() => ev(() => window.__engine.choicesShowing), 8000, 'bouncer');
await pick('Chakabunga');
check('Chakabunga: the bouncer lets you in', (await flag('goaEntered')) === true);
const gateFrames = new Set();
for (let i = 0; i < 6; i++) { gateFrames.add(await ev(() => window.__engine.roomScene.layerObj('gatecrowd').frame.texture.key)); await page.waitForTimeout(130); }
check('dancers are visible through the gate', gateFrames.size >= 2, [...gateFrames].join(','));
await click(560, 160);
await waitFor(async () => (await room()) === 'goa', 15000, 'the dance floor');
await settle();
check('through the gate: the Goa', (await room()) === 'goa' && !(await flag('chapterDone')));

// --- the Goa: dancers everywhere, stomping; mushrooms, threads, the DJ
const dancing = new Set();
for (let i = 0; i < 6; i++) { dancing.add(await ev(() => window.__engine.roomScene.layerObj('dancer3').frame.texture.key + '|' + window.__engine.roomScene.layerObj('far').frame.texture.key)); await page.waitForTimeout(130); }
check('the crowd dances (animated dancers near and far)', dancing.size >= 2, String(dancing.size));
check('eighteen dancers to walk among', await ev(() => { let n = 0; for (let i = 0; i < 40; i++) { try { window.__engine.roomScene.layerObj('dancer' + i); n++; } catch { break; } } return n; }) === 18);
check('the portal back, mushrooms, threads, mandala, DJ and the dance floor are there',
  (await hotspotAt(384, 402)) === 'portal' && (await hotspotAt(230, 220)) === 'pilze' && (await hotspotAt(200, 60)) === 'faeden' && (await hotspotAt(480, 140)) === 'mandala' && (await hotspotAt(480, 240)) === 'dj' && (await hotspotAt(480, 394)) === 'tanzflaeche');
await page.screenshot({ path: `${SHOT}/hoel-08-goa.png` });

// --- dance: the chapter ends on the dance floor
await click(480, 394); // the dance floor (default verb: use)
await waitFor(async () => (await flag('chapterDone')) === true, 30000, 'dance');
await settle();
check('danced: to be continued', (await flag('goaDanced')) === true && (await flag('chapterDone')) === true);
await page.screenshot({ path: `${SHOT}/hoel-09-end.png` });

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
