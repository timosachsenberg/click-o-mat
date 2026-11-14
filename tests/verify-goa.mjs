import { chromium } from 'playwright';

// "Folge dem Bass" — the adventure next to the demo: the title-screen game
// picker, the German UI, the start inventory (the two-euro coin), the toilet
// steps, and the Picasso riddle played through the real UI: buy the only
// drink in stock, drink it, swap the can for 25 cents, jam the coin in the
// jukebox, play Ali's song, and during three refrains slide Ali's ouzo in
// front of the Partykiller — he dances himself to sleep, Ali gives up the
// password. Sit on the Zocker-Hocker at the slot machines and it collapses: its worm-eaten leg
// comes along out onto the
// Neckarbrücke, and into the next punt full of Burschenschaftler with it:
// the woodworms sink it, and a cap floats to the jetty at the Hölderlinturm,
// a walk along the whole Neckarfront away. The bar can be left any time;
// between it and the bridge lies the Epplehaus, with Flaschenfloh and pigeons.

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';
const withGame = (id) => {
  const u = new URL(BASE);
  u.searchParams.set('game', id);
  return u.toString();
};

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await page.goto(withGame('goa'));
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);
const ev = (fn, arg) => page.evaluate(fn, arg);

// --- title: picker + German menu
check('launcher lists game and demo', await ev(() => window.__engine.launcher?.games.map((g) => g.id).join(',') === 'goa,demo'));
check('the adventure is the current game', await ev(() => window.__engine.launcher.current === 'goa'));
check('UI strings are German', await ev(() => window.__engine.strings.verbs.lookat === 'Schau an' && window.__engine.strings.newGame.includes('NEUES SPIEL')));
await page.screenshot({ path: `${SHOT}/goa-01-title.png` });
// Clicking the already-selected entry neither reloads nor starts the game.
await click(420, 62);
await page.waitForTimeout(600);
check('clicking the current game keeps the title up', await ev(() => !window.__engine.roomScene));

await click(480, 300); // start
await page.waitForTimeout(1500);

const settle = async (watch) => {
  for (let i = 0; i < 240; i++) {
    if (watch) await watch();
    const st = await ev(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode, c: window.__engine.choicesShowing }));
    if (!st.b && !st.d) return;
    if (st.c) return; // a dialog is waiting for a choice
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
    // The click landed while the choices were still settling: once more.
    const again = (await choices()).find((l) => l.text.startsWith(prefix));
    if (again) await click(again.x, again.y);
    await page.waitForTimeout(200);
  }
  await settle();
};
const flag = (k) => ev((k) => window.__engine.state.getFlag(k), k);
const inv = () => ev(() => [...window.__engine.state.inventory]);
const hotspotAt = (x, y) => ev(({ x, y }) => window.__engine.roomScene.hotspotAt({ x, y })?.id ?? null, { x, y });
const copAnim = () => ev(() => window.__engine.roomScene.actors.get('cop').sprite.anims.currentAnim?.key ?? null);
const aliAnim = () => ev(() => window.__engine.roomScene.actors.get('ali').sprite.anims.currentAnim?.key ?? null);
/** Pick a verb from the grid once the UI accepts input again. */
const verb = async (id, x) => {
  await settle();
  for (let i = 0; i < 20; i++) {
    await click(x, 486);
    await page.waitForTimeout(150);
    if ((await ev(() => window.__engine.selectedVerb)) === id) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`could not select verb ${id}`);
};
const useItemOn = async (x, y) => {
  await click(522, 505); // the (only) item, in hand
  await click(x, y);
  await settle();
};
const waitFor = async (fn, ms, label) => {
  for (let t = 0; t < ms; t += 200) {
    if (await fn()) return true;
    await page.waitForTimeout(200);
  }
  console.log(`  (timed out waiting for ${label})`);
  return false;
};

await settle(); // intro lines
check('starts in the Picasso', await ev(() => window.__engine.state.currentRoom === 'picasso'));
check('the two-euro coin is in the inventory from the start', JSON.stringify(await inv()) === '["euro"]', JSON.stringify(await inv()));
check('Ali hotspot sits on Ali', (await hotspotAt(720, 280)) === 'ali');
check('Partykiller hotspot sits on him', (await hotspotAt(640, 330)) === 'cop');
check('DJ booth, toilet door and jukebox are there', (await hotspotAt(194, 250)) === 'dj' && (await hotspotAt(58, 200)) === 'wc' && (await hotspotAt(376, 240)) === 'jukebox');
check('Ali polishes a glass when idle (stance)', await ev(() => window.__engine.roomScene.actors.get('ali').sprite.anims.currentAnim?.key === 'ali-polish-front'));
await page.screenshot({ path: `${SHOT}/goa-02-pub.png` });

// --- the door is open from the start: out onto the Neckarbrücke and back
const room = () => ev(() => window.__engine.state.currentRoom);
const goTo = async (id, x, y, opts) => {
  await click(x, y, opts);
  await waitFor(async () => (await room()) === id, 14000, id);
  await settle();
};
await goTo('epplehaus', 311, 220, { button: 'right' }); // open the door
check('the bar can be left before the riddle is solved: out in front of the Epplehaus', (await room()) === 'epplehaus' && !(await flag('password')));
await page.screenshot({ path: `${SHOT}/goa-02a-epplehaus.png` });

// --- the Epplehaus: Flaschenfloh by the bottle banks, pigeons strolling about
const actorsHere = await ev(() => [...window.__engine.roomScene.actors.keys()]);
check('Flaschenfloh is there', actorsHere.includes('floh') && (await hotspotAt(556, 300)) === 'floh', actorsHere.join(','));
const pigeons = () => ev(() => [...window.__engine.roomScene.actors.entries()].filter(([k]) => k.startsWith('taube')).map(([k, a]) => [k, Math.round(a.x), Math.round(a.y)]));
const before = await pigeons();
check('and a flock of pigeons', before.length >= 8, String(before.length));
await page.waitForTimeout(5000);
const after = await pigeons();
const moved = after.filter(([k, x, y], i) => Math.abs(x - before[i][1]) + Math.abs(y - before[i][2]) > 8).length;
check('the pigeons walk about', moved >= 2, `(${moved} moved)`);
await click(556, 300, { button: 'right' }); // talk to Flaschenfloh
await settle();
await pick('Wer bist du');
await pick('Kennst du die Goa');
await pick('Mach');
check('talked to Flaschenfloh (he does not follow yet)', !(await flag('flohFollows')));
await goTo('neckar', 932, 380); // on to the bridge
check('the street leads on to the Neckarbrücke', (await room()) === 'neckar');
await click(40, 420); // towards the forest
await settle();
check('the way to the forest is closed (forestry work)', !(await flag('chapterDone')) && (await hotspotAt(40, 420)) === 'toForest');
await goTo('epplehaus', 945, 432); // back to the Epplehaus
await goTo('picasso', 86, 260); // and down the cellar stairs
check('and back into the Picasso', (await room()) === 'picasso');

// --- up the two steps to the toilet: the player climbs, keeping their size
const scaleAt = (y) => 0.9 + 0.32 * Math.max(0, Math.min(1, (y - 300) / 145));
await click(58, 200, { button: 'right' }); // open the toilet door
await settle();
const up = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y, s: a.sprite.scale }; });
check('climbed the steps to the toilet door', Math.abs(up.x - 58) < 3 && Math.abs(up.y - 282) < 3, JSON.stringify(up));
check('no shrinking on the steps', Math.abs(up.s - scaleAt(330)) < 0.01, `(scale ${up.s.toFixed(3)})`);
await page.screenshot({ path: `${SHOT}/goa-02b-wc.png` });

// --- the slot machines blink; Hilde dances, and grabs when you pass too close
const slotFrames = new Set();
for (let i = 0; i < 8; i++) {
  slotFrames.add(await ev(() => window.__engine.roomScene.layerObj('slots').frame.texture.key));
  await page.waitForTimeout(120);
}
check('the slot machines are animated', slotFrames.size >= 3, [...slotFrames].join(','));
check('Hilde dances', await ev(() => window.__engine.roomScene.actors.get('hilde').sprite.anims.currentAnim?.key.startsWith('hilde-dance')));
await click(136, 445); // walk past her, right through her reach
const hildeSeen = new Set();
await settle(async () => hildeSeen.add(await ev(() => window.__engine.roomScene.actors.get('hilde').sprite.anims.currentAnim?.key)));
check('too close: Hilde grabs', hildeSeen.has('hilde-grab-front'), [...hildeSeen].join(','));

// --- Ali won't talk about the party while the Partykiller listens
await click(720, 280, { button: 'right' }); // talk to Ali
await settle();
await pick('Ich suche die Goa');
check('learned about the Partykiller', (await flag('knowsPartykiller')) === true);
let texts = (await choices()).map((c) => c.text);
check('no password while he listens', !texts.some((t) => t.startsWith('Also. Die Party')), texts.join(' | '));

// --- the free choice of drinks
await pick('Was gibt');
await pick('Eine Red Cow');
await pick('Ein Flying Pony');
await pick('Eine Magic Woman');
await pick('Dann eine Magic Woman');
await settle();
check('paid the last two euros, got a Magic Woman', JSON.stringify(await inv()) === '["magicwoman"]', JSON.stringify(await inv()));

// --- giving it back full: "Zwinker, zwinker" — and a wink
await verb('give', 46); // "Gib"
await click(522, 505);
check('sentence line reads German', await ev(() => window.__engine.uiScene.sentenceText.text.startsWith('Gib Magic Woman an')));
await click(720, 280);
const aliSeen = new Set();
await settle(async () => aliSeen.add(await aliAnim()));
check('Ali winks very conspicuously', aliSeen.has('ali-wink-front'), [...aliSeen].join(','));
check('and keeps out of a full can', JSON.stringify(await inv()) === '["magicwoman"]');

// --- drink it (Benutze + can), return the empty can for 25 cents
await verb('use', 304); // "Benutze"
await click(522, 505);
await settle();
check('drank the can', JSON.stringify(await inv()) === '["dose"]', JSON.stringify(await inv()));
await verb('give', 46);
await click(522, 505);
await click(720, 280);
await settle();
check('deposit: a 25-cent coin', JSON.stringify(await inv()) === '["cent25"]', JSON.stringify(await inv()));

// --- the jukebox eats the coin, but the credit stays
await useItemOn(376, 240);
check('the coin is stuck, the credit stays', (await flag('jukeboxCredit')) === true && (await inv()).length === 0);
await pick('„Polonaise');
check('a wrong song plays (costs nothing)', (await flag('song')) === 'polonaise');
await verb('use', 304); // Benutze
await click(376, 240); // jukebox
await settle();
await pick('„Noch einen auf die Gemütlichkeit');
check('Ali\'s song is on', (await flag('song')) === 'gemuetlichkeit');

// --- outside the refrain, hands off the ouzo
await click(772, 330, { button: 'right' }); // pick up
await settle();
check('grabbing the ouzo outside the refrain gets caught', (await inv()).length === 0 && ((await flag('ouzoAt')) ?? 'coaster') === 'coaster');

// --- three refrains, three ouzos
for (let n = 1; n <= 3; n++) {
  const inRefrain = await waitFor(() => flag('refrain'), 30000, `refrain ${n}`);
  if (n === 1) {
    check('refrain: Ali sings with his eyes shut, the guest gropes for a glass', inRefrain && (await aliAnim())?.startsWith('ali-sing') && (await copAnim()) === 'cop-reach-back', `${await aliAnim()} / ${await copAnim()}`);
    await page.screenshot({ path: `${SHOT}/goa-03-refrain.png` });
  }
  await click(772, 330, { button: 'right' }); // take the ouzo
  await settle();
  await useItemOn(684, 330); // onto the counter in front of him
  check(`ouzo ${n} served during the refrain`, (await flag('ouzoAt')) === 'cop' || ((await flag('ouzoCount')) ?? 0) >= n);
  const drunk = await waitFor(async () => ((await flag('ouzoCount')) ?? 0) >= n, 16000, `ouzo ${n}`);
  check(`he downs ouzo ${n} on "Trink!"`, drunk, `(count ${await flag('ouzoCount')})`);
  if (n < 3) {
    await waitFor(async () => !(await flag('refrain')), 16000, `end of refrain ${n}`);
    await settle();
    check(`Ali refills out of habit (${n})`, (await waitFor(async () => !(await flag('ouzoEmpty')), 6000, 'refill')) && (await flag('ouzoAt')) === 'coaster');
  }
}
const seen = new Set();
await settle(async () => {
  const k = await copAnim();
  if (k) seen.add(k);
});
await waitFor(() => flag('copAsleep'), 20000, 'sleep');
await settle(async () => {
  const k = await copAnim();
  if (k) seen.add(k);
});
check('"Und jetzt tanzt!": he directs traffic', seen.has('cop-traffic-front'), [...seen].join(','));
check('then the disco finger', seen.has('cop-disco-front'));
check('and falls asleep on his stool', (await flag('copAsleep')) === true && (await copAnim())?.startsWith('cop-sleep'), String(await copAnim()));
await page.screenshot({ path: `${SHOT}/goa-04-asleep.png` });

// --- now Ali talks
await click(720, 280, { button: 'right' });
await settle();
await pick('Also. Die Party im Wald');
check('password: Chakabunga', (await flag('password')) === 'Chakabunga');
await pick('Tschüss');

// --- saves are namespaced per game
await page.keyboard.press('F5');
await page.waitForTimeout(300);
check('quick save lands in the game\'s own slot', await ev(() => !!localStorage.getItem('pnc-save-goa-0') && !localStorage.getItem('pnc-save-0')));

// --- the Zocker-Hocker in front of the slot machines: sit down, it collapses
check('the Zocker-Hocker stands in front of the slot machines', (await hotspotAt(522, 372)) === 'rickety');
await click(522, 372); // default verb: sit on it
await settle();
check('it collapsed under me', (await flag('stoolBroken')) === true && (await hotspotAt(522, 372)) !== 'rickety');
await page.screenshot({ path: `${SHOT}/goa-04b-stool.png` });
await click(541, 400); // the worm-eaten leg among the debris (default verb: take)
await settle();
check('took the worm-eaten chair leg', JSON.stringify(await inv()) === '["stuhlbein"]' && (await flag('legTaken')) === true, JSON.stringify(await inv()));

// --- leave: up the stairs, out onto the Neckarbrücke
await goTo('epplehaus', 311, 220, { button: 'right' }); // open the door
await goTo('neckar', 932, 380);
check('past the Epplehaus to the Neckarbrücke', (await room()) === 'neckar');
await page.screenshot({ path: `${SHOT}/goa-05-neckar.png` });

// --- a punt full of Burschenschaftler comes down the river, again and again
const punt = () => ev(() => { const a = window.__engine.roomScene.actors.get('kahn'); return { x: a.x, y: a.y, h: a.sprite.displayHeight, s: a.sprite.scale }; });
await click(680, 430); // to the balustrade
await settle();
const seenAt = [];
const nearby = await waitFor(async () => {
  const p = await punt();
  seenAt.push(Math.round(p.x));
  return p.x > 420 && p.x < 600 && p.y > 322;
}, 40000, 'a punt within reach');
check('a punt comes down the river', nearby, seenAt.slice(-4).join(','));
const p1 = await punt();
check('it shrinks into the distance (perspective)', p1.s > 0.5, `(scale ${p1.s.toFixed(2)})`);
check('its hotspot follows it', (await hotspotAt(p1.x, p1.y - p1.h * 0.4)) === 'kahn');

// --- throw the chair leg in: the woodworms eat the punt, a cap floats ashore
await useItemOn(p1.x, p1.y - p1.h * 0.4);
check('the punt sank', (await flag('puntSunk')) === true && (await inv()).length === 0);
check('only a cap washed up at the jetty by the Hölderlinturm', (await flag('capAshore')) === true && (await hotspotAt(506, 332)) === 'muetze');
await page.screenshot({ path: `${SHOT}/goa-06-sunk.png` });
await waitFor(async () => (await punt()).x < 0, 4000, 'punt gone');
check('no more punts after that', (await punt()).x < 0);
await click(506, 332); // pick up the cap (default verb): along the Neckarfront, down to the jetty
await settle();
const far = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y, s: a.sprite.scale }; });
check('walked along the Neckarfront to the jetty at the Hölderlinturm, smaller with the distance', far.x < 560 && far.y < 330 && far.s < 0.7, JSON.stringify(far));
await page.screenshot({ path: `${SHOT}/goa-06b-turm.png` });
check('took the cap', JSON.stringify(await inv()) === '["muetze"]', JSON.stringify(await inv()));

// --- on towards the forest? Closed for forestry work, password or not —
// the way to the Goa is Otto R.'s wormhole (verify-hoelderlin plays it).
await click(40, 420);
await settle();
check('even with the password, the forest stays closed', (await flag('password')) === 'Chakabunga' && !(await flag('chapterDone')) && (await flag('once:forestClosed')) === true);
await page.screenshot({ path: `${SHOT}/goa-07-closed.png` });

// --- the picker switches to the demo (reload with ?game=demo)
await page.goto(withGame('goa'));
await page.waitForTimeout(3000);
await Promise.all([page.waitForURL(/game=demo/), click(557, 62)]);
await page.waitForTimeout(3000);
check('picking DEMO loads the demo', await ev(() => window.__engine.launcher.current === 'demo' && window.__engine.startRoom === 'lab'));
check('the demo keeps its English UI', await ev(() => window.__engine.strings.verbs.lookat === 'Look at'));
check('the demo starts empty-handed', await ev(() => window.__engine.state.inventory.length === 0));

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
