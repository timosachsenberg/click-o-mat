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
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

await settle(); // lab intro

// --- smart left-click: a plain click on the door opens it
await click(880, 220); // lab door, NO verb selected, left button
await settle();
check('smart click: plain left-click opens the door', (await room()) === 'hallway');

// --- autosave: the transition refreshed the AUTO slot
const auto = await page.evaluate(() => window.__engine.listSaves()[4]);
check('autosave written on room transition', !!auto && auto.room.includes('Hall'), `(${auto?.room})`);

// --- verb hotkeys: S selects Look at, S again clears
await page.keyboard.press('s');
await page.waitForTimeout(150);
check('verb hotkey S selects Look at', (await page.evaluate(() => window.__engine.selectedVerb)) === 'lookat');
await page.keyboard.press('s');
await page.waitForTimeout(150);
check('same hotkey toggles the verb off', (await page.evaluate(() => window.__engine.selectedVerb)) === null);

// --- Tab hotspot labels
await page.keyboard.down('Tab');
await page.waitForTimeout(250);
const labels = await page.evaluate(() => {
  const c = window.__engine.roomScene.hotspotLabels;
  return c ? c.list.length : 0;
});
check('Tab shows hotspot name labels', labels >= 4, `(${labels} labels)`);
await page.screenshot({ path: `${SHOT}/qol-01-tab.png` });
await page.keyboard.up('Tab');
await page.waitForTimeout(150);
check('releasing Tab hides the labels', await page.evaluate(() => window.__engine.roomScene.hotspotLabels === null));

// --- double-click sprint: fast real walk, not a teleport
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(860, 420));
await page.waitForTimeout(200);
const t0 = Date.now();
await click(110, 420);
await page.waitForTimeout(120);
await click(110, 420); // double
await page.waitForTimeout(150);
check('double-click sets sprint', await page.evaluate(() => window.__engine.roomScene.actors.get('norb').sprint === true));
await settle();
const elapsed = Date.now() - t0;
const pos = await page.evaluate(() => {
  const a = window.__engine.roomScene.actors.get('norb');
  return { x: a.x, y: a.y };
});
check('sprint arrives fast (real walk, ~2.5x)', Math.abs(pos.x - 110) < 20 && elapsed < 2600, `(${elapsed}ms, x=${pos.x.toFixed(0)})`);

// --- inventory right-click = look at
await page.evaluate(() => {
  window.__engine.state.addItem('battery');
  window.__engine.events.emit('ui');
});
await page.waitForTimeout(200);
await click(522, 505, { button: 'right' }); // slot 0
let sawBusy = false;
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(150);
  if (await page.evaluate(() => window.__engine.busy)) { sawBusy = true; break; }
}
check('right-click item speaks its look-at line', sawBusy);
await settle();
check('right-click look-at leaves no verb armed', await page.evaluate(() => window.__engine.selectedVerb === null && window.__engine.pendingItem === null));

// --- text speed scales speech duration
const timeSay = async () => page.evaluate(async () => {
  const t0 = performance.now();
  await window.__engine.makeContext().playerSay('x'.repeat(40));
  return performance.now() - t0;
});
await page.evaluate(() => window.__engine.setTextSpeed(1)); // fastest
const fast = await timeSay();
await page.evaluate(() => window.__engine.setTextSpeed(0)); // slowest
const slow = await timeSay();
await page.evaluate(() => window.__engine.setTextSpeed(0.5));
check('text speed: fast is fast, slow is slow', fast < 1100 && slow > 2800, `(fast=${fast.toFixed(0)}ms, slow=${slow.toFixed(0)}ms)`);
check('text speed persisted', (await page.evaluate(() => localStorage.getItem('pnc-text-speed'))) === '0.5');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
