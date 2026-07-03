import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const errors = [];

// Slot row geometry in the options panel: y = 284 + slot*34, Save x=590, Load x=645.
const SLOT_Y = (s) => 284 + s * 34;

const newPage = async (context) => {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
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
  return { page, click, settle, room };
};

// ============ main scenario: three slots, load, continue-latest ============
const ctx1 = await browser.newContext({ viewport: { width: 1000, height: 640 } });
let { page, click, settle, room } = await newPage(ctx1);

await click(480, 300); // title -> new game
await page.waitForTimeout(1200);
await settle();

// Quick save in the lab (F5)
await page.keyboard.press('F5');
await page.waitForTimeout(400);

// Hallway -> save to SLOT 1 via the menu
await click(880, 220, { button: 'right' });
await settle();
await click(894, 25); // gear
await page.waitForTimeout(300);
await click(578, SLOT_Y(1)); // Save on slot 1
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT}/slots-01-panel.png` });
await click(480, 448); // Close
await page.waitForTimeout(300);

// Gallery -> save to SLOT 2
await click(872, 220, { button: 'right' });
await settle();
await click(894, 25);
await page.waitForTimeout(300);
await click(578, SLOT_Y(2));
await page.waitForTimeout(300);

const saves = await page.evaluate(() => window.__engine.listSaves());
check('three slots filled, one empty', !!saves[0] && !!saves[1] && !!saves[2] && saves[3] === null,
  `(${saves.map((s) => s?.room ?? '·').join(' | ')})`);
check('slot metadata has room labels', saves[1].room.includes('Hall') && saves[2].room.includes('Gallery'), `(${saves[1].room}, ${saves[2].room})`);

// Load SLOT 1 from the menu -> hallway
await click(628, SLOT_Y(1));
await page.waitForTimeout(1200);
await settle();
check('menu Load restores slot 1 (hallway)', (await room()) === 'hallway');

// Loading an EMPTY slot: open menu, click slot 3 Load -> toast, still in menu
await click(894, 25);
await page.waitForTimeout(300);
await click(628, SLOT_Y(3));
await page.waitForTimeout(300);
check('empty-slot Load is a no-op (menu stays open)', await page.evaluate(() => window.__engine.menuOpen));
await click(480, 448);

// Reload page: Continue loads the LATEST save (slot 2, gallery)
await page.reload();
await page.waitForTimeout(3000);
await click(480, 492); // CONTINUE
await page.waitForTimeout(1800);
check('title Continue picks the most recent slot (gallery)', (await room()) === 'gallery');
await ctx1.close();

// ============ legacy migration: old single-key save becomes the quick slot ============
const ctx2 = await browser.newContext({ viewport: { width: 1000, height: 640 } });
await ctx2.addInitScript(() => {
  if (!localStorage.getItem('pnc-save-0')) {
    localStorage.setItem('pnc-adventure-save', JSON.stringify({
      flags: { legacyMarker: true },
      inventory: ['battery'],
      usedChoices: [],
      currentRoom: 'hallway',
      playerPos: { x: 321, y: 401 },
      playerFacing: 'down',
    }));
  }
});
({ page, click, settle, room } = await newPage(ctx2));
const migrated = await page.evaluate(() => ({
  slots: window.__engine.listSaves(),
  legacyGone: localStorage.getItem('pnc-adventure-save') === null,
}));
check('legacy save migrated into the quick slot', !!migrated.slots[0] && migrated.legacyGone);
await click(480, 492); // CONTINUE
await page.waitForTimeout(1800);
check('migrated save loads via Continue', (await room()) === 'hallway');
check('migrated save content intact', await page.evaluate(() => window.__engine.state.flags.legacyMarker === true && window.__engine.state.inventory.includes('battery')));
await ctx2.close();

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
