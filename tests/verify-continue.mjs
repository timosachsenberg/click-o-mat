import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1000, height: 640 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await page.goto(BASE);
await page.waitForTimeout(3000);
let box = await page.locator('canvas').boundingBox();
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
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const player = () => page.evaluate(() => {
  const p = window.__engine.roomScene.actors.get('norb');
  return { x: p.x, y: p.y };
});

// --- fresh browser, no save: clicking the CONTINUE line starts a NEW game
await page.screenshot({ path: `${SHOT}/cont-01-title-nosave.png` });
await click(480, 492); // CONTINUE position, but no save exists
await page.waitForTimeout(1500);
check('no save: Continue click falls through to a new game', (await room()) === 'lab');
await settle();

// --- play a bit and save in the hallway
await click(880, 220, { button: 'right' }); // lab -> hallway
await settle();
await click(400, 420); // walk to a distinctive spot
await settle();
const savedAt = await player();
await page.keyboard.press('F5');
await page.waitForTimeout(500);
check('saved in the hallway', await page.evaluate(() => !!localStorage.getItem('pnc-save-0')));

// --- reload: Continue is offered and restores room + position
await page.reload();
await page.waitForTimeout(3000);
box = await page.locator('canvas').boundingBox();
await page.screenshot({ path: `${SHOT}/cont-02-title-withsave.png` });
await click(480, 492); // CONTINUE
await page.waitForTimeout(1800);
check('Continue restores the saved room', (await room()) === 'hallway');
const restored = await player();
check(
  'Continue restores the saved position',
  Math.abs(restored.x - savedAt.x) < 3 && Math.abs(restored.y - savedAt.y) < 3,
  `(saved ${savedAt.x.toFixed(0)},${savedAt.y.toFixed(0)} -> ${restored.x.toFixed(0)},${restored.y.toFixed(0)})`
);
const au = await page.evaluate(() => window.__audio.debug());
check('Continue unlocked audio + hallway music', au.state === 'running' && au.currentMusic === 'hall-theme', `(${au.currentMusic})`);

// --- reload again: center click (away from CONTINUE) starts a NEW game
await page.reload();
await page.waitForTimeout(3000);
box = await page.locator('canvas').boundingBox();
await click(480, 300); // canvas center — the path every test script uses
await page.waitForTimeout(1500);
check('center click still starts a fresh game (lab, start entry)', (await room()) === 'lab');
const fresh = await player();
check('fresh game starts at the lab entry', Math.abs(fresh.x - 480) < 3 && Math.abs(fresh.y - 410) < 3, `(${fresh.x.toFixed(0)},${fresh.y.toFixed(0)})`);
check('fresh game has clean state (no hallway flags)', await page.evaluate(() => !window.__engine.state.flags.plantMoved && window.__engine.state.inventory.length === 0));

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
