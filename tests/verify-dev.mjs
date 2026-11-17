import { chromium } from 'playwright';
import { makeSettle, skipLine } from './helpers.mjs';

// Developer mode (?dev in the URL): the scene picker — a DEV button (or F4)
// opens a list of scenes, a click jumps there; ?dev=<id> starts the game in
// one. Players (no ?dev) get none of it. Checked on the adventure, whose
// content defines its scenes (rooms in particular story states), and on the
// demo, which defines none and gets one row per room.
const BASE = process.env.BASE_URL ?? 'http://localhost:5173/?game=demo';
const SHOT = process.env.SHOT_DIR ?? '.';
const urlFor = (game, dev) => {
  const u = new URL(BASE);
  u.searchParams.set('game', game);
  if (dev === undefined) u.searchParams.delete('dev');
  else u.searchParams.set('dev', dev);
  return u.toString();
};

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

/** Open the game at `url`, click through the title and wait for the first room. */
const start = async (url) => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  const click = (x, y, opts = {}) => page.mouse.click(box.x + (x / 960) * box.width, box.y + (y / 600) * box.height, opts);
  await click(480, 300); // start
  await page.waitForTimeout(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const settle = makeSettle(page, { stopAtChoices: true });
  await settle();
  return {
    page, click, ev, settle,
    room: () => ev(() => window.__engine.state.currentRoom),
    flag: (k) => ev((k) => window.__engine.state.getFlag(k), k),
    panelOpen: () => ev(() => !!window.__engine.uiScene.devPanel?.visible),
    /** Centre of the picker row of a scene. */
    row: (id) => ev((id) => {
      const r = window.__engine.uiScene.devRows.find((r) => r.scene.id === id);
      if (!r) return null;
      const b = r.text.getBounds();
      return { x: b.centerX, y: b.centerY, label: r.text.text };
    }, id),
    button: () => ev(() => { const b = window.__engine.uiScene.devButton?.getBounds(); return b ? { x: b.centerX, y: b.centerY } : null; }),
  };
};

// --- players: no ?dev, no picker --------------------------------------------
{
  const g = await start(urlFor('goa'));
  check('without ?dev: no developer mode, no DEV button, no panel',
    (await g.ev(() => window.__engine.devMode)) === false && (await g.button()) === null && (await g.ev(() => window.__engine.uiScene.devPanel)) === null);
  await g.page.keyboard.press('F4');
  await g.page.waitForTimeout(150);
  check('F4 does nothing for players', (await g.ev(() => window.__engine.menuOpen)) === false);
  const refused = await g.ev(() => window.__engine.devJump(window.__engine.devScenes.find((s) => s.id === 'goa')));
  check('and a jump is refused', refused === false && (await g.room()) === 'neckar');
  await g.page.close();
}

// --- the adventure with ?dev -------------------------------------------------
{
  const g = await start(urlFor('goa', ''));
  const scenes = await g.ev(() => window.__engine.devScenes.map((s) => ({ id: s.id, room: s.room, label: s.label })));
  check('?dev: developer mode, a DEV button, one row per scene the game defines',
    (await g.ev(() => window.__engine.devMode)) === true && !!(await g.button()) && scenes.length >= 15 &&
    (await g.ev(() => window.__engine.uiScene.devRows.length)) === scenes.length, `(${scenes.length} scenes)`);
  check('scene ids are unique and every scene names a room of the game',
    new Set(scenes.map((s) => s.id)).size === scenes.length &&
    (await g.ev(() => window.__engine.devScenes.every((s) => !!window.__engine.rooms[s.room] && (!s.entry || !!window.__engine.rooms[s.room].entries[s.entry])))));

  // The button opens the panel; it blocks the room like the options menu.
  const btn = await g.button();
  await g.click(btn.x, btn.y);
  await g.page.waitForTimeout(200);
  check('the DEV button opens the scene list', (await g.panelOpen()) && (await g.ev(() => window.__engine.menuOpen)) === true);
  const rows = await g.ev(() => window.__engine.uiScene.devRows.map((r) => { const b = r.text.getBounds(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; }));
  check('every row is on screen', rows.every((r) => r.l >= 0 && r.r <= 960 && r.t >= 0 && r.b <= 600), JSON.stringify(rows.find((r) => r.r > 960 || r.b > 600) ?? ''));
  check('rows do not run into each other', rows.every((a, i) => rows.every((b, j) => i === j || a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t)));
  await g.page.screenshot({ path: `${SHOT}/dev-01-picker.png` });
  const before = await g.ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
  await g.click(480, 300); // on the panel, not on a row
  await g.page.waitForTimeout(400);
  const after = await g.ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
  check('a click on the panel does not reach the room', (await g.panelOpen()) && Math.hypot(after.x - before.x, after.y - before.y) < 1);
  await g.page.keyboard.press('Escape');
  await g.page.waitForTimeout(150);
  check('Esc closes it', !(await g.panelOpen()) && (await g.ev(() => window.__engine.menuOpen)) === false);
  await g.page.keyboard.press('F4');
  await g.page.waitForTimeout(150);
  check('F4 opens it too', await g.panelOpen());

  // A click on a row: there, in the state the scene names.
  const goaRow = await g.row('goa');
  await g.click(goaRow.x, goaRow.y);
  await g.page.waitForTimeout(300);
  for (let i = 0; i < 50 && (await g.room()) !== 'goa'; i++) await g.page.waitForTimeout(200);
  await g.settle();
  check('a click on "Goa · Tanzfläche": on the dance floor, let in, the list closed',
    (await g.room()) === 'goa' && (await g.flag('goaEntered')) === true && (await g.flag('password')) === 'Chakabunga' && !(await g.panelOpen()) && (await g.ev(() => window.__engine.menuOpen)) === false);
  const onFloor = await g.ev(() => { const a = window.__engine.roomScene.actors.get('player'); return { x: a.x, y: a.y }; });
  check('at the entry the scene names (the gate side)', Math.abs(onFloor.x - 222) < 30, JSON.stringify(onFloor));
  await g.page.screenshot({ path: `${SHOT}/dev-02-goa.png` });

  // The options gear and the picker share the screen politely.
  await g.page.keyboard.press('F4');
  await g.page.waitForTimeout(150);
  await g.ev(() => window.__engine.uiScene.toggleOptions());
  await g.page.waitForTimeout(150);
  check('opening the options closes the scene list (one panel at a time)',
    !(await g.panelOpen()) && (await g.ev(() => window.__engine.menuOpen)) === true);
  await g.page.keyboard.press('Escape');
  await g.page.waitForTimeout(150);
  check('and Esc leaves no panel behind', (await g.ev(() => window.__engine.menuOpen)) === false);

  // While a scene runs, a jump is refused — like loading a save.
  await g.ev(() => { void window.__engine.runScript('x'.repeat(60), ''); });
  await g.page.waitForTimeout(250);
  const midScene = await g.ev(() => window.__engine.devJump(window.__engine.devScenes.find((s) => s.id === 'neckar')));
  check('a jump is refused while a scene runs', midScene === false && (await g.room()) === 'goa');
  await skipLine(g.page);
  await g.settle();

  // Every scene of the list can be jumped to, and shows what it names —
  // whatever was jumped to before.
  for (const s of scenes) {
    const jumped = await g.ev((id) => window.__engine.devJump(window.__engine.devScenes.find((x) => x.id === id)), s.id);
    await g.settle();
    const applied = await g.ev((id) => {
      const sc = window.__engine.devScenes.find((x) => x.id === id);
      // (Flags a scene's own intro consumes are not compared.)
      const skip = ['portalLanding', 'once:goaIntro', 'once:neckarIntro', 'busGone', 'bouncerMetFloor'];
      return Object.entries(sc.flags ?? {}).filter(([k]) => !skip.includes(k)).every(([k, v]) => window.__engine.state.getFlag(k) === v);
    }, s.id);
    check(`jump: ${s.label}`, jumped === true && (await g.room()) === s.room && applied, `(room ${await g.room()})`);
    await g.page.screenshot({ path: `${SHOT}/dev-scene-${s.id}.png` });
    if (s.id === 'epplehaus') {
      check('after the Goa (password, wormhole used) the plain Epplehaus has Flaschenfloh again',
        (await g.ev(() => window.__engine.roomScene.hotspotAt({ x: 556, y: 300 })?.id ?? null)) === 'floh');
    }
    if (s.id === 'turm-1987') check('the tower in 1987: its pixel layer', (await g.flag('turmEra')) === 1);
    if (s.id === 'waldrand-portal') check('the forest\'s edge with the portal standing', (await g.ev(() => window.__engine.roomScene.hotspotAt({ x: 724, y: 326 })?.id ?? null)) === 'portal');
  }
  // The last one (the landing without the password) ends in the Goazwerg's question.
  check('the landing scene plays up to the Goazwerg\'s question', (await g.ev(() => window.__engine.choicesShowing)) === true);
  const dialogJump = await g.ev(() => window.__engine.devJump(window.__engine.devScenes.find((s) => s.id === 'neckar')));
  check('a jump is refused in the middle of a dialog', dialogJump === false && (await g.room()) === 'goa');
  await g.page.close();
}

// --- ?dev=<id>: the game starts in that scene ----------------------------------
{
  const g = await start(urlFor('goa', 'turm-1987'));
  check('?dev=turm-1987 starts in the tower, in 1987', (await g.room()) === 'hoelderlinturm' && (await g.flag('turmEra')) === 1);
  check('with the picker at hand', !!(await g.button()));
  await g.page.screenshot({ path: `${SHOT}/dev-03-deeplink.png` });
  await g.page.close();
}
{
  const g = await start(urlFor('goa', 'nirgendwo'));
  check('an unknown scene id just starts the game as usual', (await g.room()) === 'neckar' && (await g.ev(() => window.__engine.devMode)) === true);
  await g.page.close();
}

// --- a game without scenes of its own: one row per room -------------------------
{
  const g = await start(urlFor('demo', ''));
  const rooms = await g.ev(() => Object.keys(window.__engine.rooms));
  const scenes = await g.ev(() => window.__engine.devScenes.map((s) => ({ id: s.id, room: s.room })));
  check('the demo defines no scenes: the list has every room once',
    scenes.length === rooms.length && rooms.every((r) => scenes.some((s) => s.id === r && s.room === r)), `(${scenes.length} rooms)`);
  const btn = await g.button();
  await g.click(btn.x, btn.y);
  await g.page.waitForTimeout(200);
  const row = await g.row('gallery');
  await g.click(row.x, row.y);
  for (let i = 0; i < 50 && (await g.room()) !== 'gallery'; i++) await g.page.waitForTimeout(200);
  await makeSettle(g.page)();
  check('a click on a room\'s row jumps there', (await g.room()) === 'gallery' && !(await g.panelOpen()));
  await g.page.screenshot({ path: `${SHOT}/dev-04-demo.png` });
  await g.page.close();
}

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
