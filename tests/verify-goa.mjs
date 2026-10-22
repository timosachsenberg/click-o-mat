import { chromium } from 'playwright';

// "Folge dem Bass" — the adventure next to the demo: the title-screen game
// picker, the German UI, the start inventory (the two-euro coin), the toilet
// steps, and the Picasso riddle played through the real UI: order the only drink in
// stock, hand it to the Partykiller (he dances, then sleeps), get the
// password from Ali, leave.

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
  await settle();
};
const flag = (k) => ev((k) => window.__engine.state.getFlag(k), k);
const inv = () => ev(() => [...window.__engine.state.inventory]);
const hotspotAt = (x, y) => ev(({ x, y }) => window.__engine.roomScene.hotspotAt({ x, y })?.id ?? null, { x, y });
const copAnim = () => ev(() => window.__engine.roomScene.actors.get('cop').sprite.anims.currentAnim?.key ?? null);

await settle(); // intro lines
check('starts in the Picasso', await ev(() => window.__engine.state.currentRoom === 'picasso'));
check('the two-euro coin is in the inventory from the start', JSON.stringify(await inv()) === '["euro"]', JSON.stringify(await inv()));
check('Ali hotspot sits on Ali', (await hotspotAt(720, 280)) === 'ali');
check('Partykiller hotspot sits on him', (await hotspotAt(640, 330)) === 'cop');
check('the DJ booth and the toilet door are there', (await hotspotAt(216, 250)) === 'dj' && (await hotspotAt(58, 200)) === 'wc');
check('Ali polishes a glass when idle (stance)', await ev(() => window.__engine.roomScene.actors.get('ali').sprite.anims.currentAnim?.key === 'ali-polish-front'));
await page.screenshot({ path: `${SHOT}/goa-02-pub.png` });

// --- up the two steps to the toilet: the player climbs, keeping their size
const scaleAt = (y) => 0.9 + 0.32 * Math.max(0, Math.min(1, (y - 300) / 145));
await click(58, 200, { button: 'right' }); // open the toilet door
await settle();
const up = await ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y, s: a.sprite.scale }; });
check('climbed the steps to the toilet door', Math.abs(up.x - 58) < 3 && Math.abs(up.y - 282) < 3, JSON.stringify(up));
check('no shrinking on the steps', Math.abs(up.s - scaleAt(330)) < 0.01, `(scale ${up.s.toFixed(3)})`);
await page.screenshot({ path: `${SHOT}/goa-02b-wc.png` });

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
await pick('Dann eine Magic Woman');
await settle();
check('paid two euros, got a Magic Woman', JSON.stringify(await inv()) === '["magicwoman"]', JSON.stringify(await inv()));

// --- give it to the Partykiller: Gib (verb grid, top left) → item → him
await click(46, 486); // "Gib"
await click(522, 505); // first inventory slot
check('sentence line reads German', await ev(() => window.__engine.uiScene.sentenceText?.text?.startsWith('Gib Magic Woman an') ?? true));
await click(640, 330);
const seen = new Set();
await settle(async () => {
  const k = await copAnim();
  if (k) seen.add(k);
});
check('he directs traffic', seen.has('cop-traffic-front'), [...seen].join(','));
check('then the disco finger', seen.has('cop-disco-front'));
check('and falls asleep', (await flag('copAsleep')) === true && (await copAnim()) === 'cop-sleep-front', String(await copAnim()));
check('the can is gone', (await inv()).length === 0);
await page.screenshot({ path: `${SHOT}/goa-03-asleep.png` });

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

// --- leave
await click(362, 220, { button: 'right' }); // open the door
await settle();
check('chapter done', (await flag('chapterDone')) === true);
await page.screenshot({ path: `${SHOT}/goa-04-end.png` });

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
