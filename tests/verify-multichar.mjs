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
const scroll = () => page.evaluate(() => { const c = window.__engine.roomScene.cameras.main; return { x: c.scrollX, y: c.scrollY }; });
const clickWorld = async (wx, wy, opts = {}) => { const s = await scroll(); await click(wx - s.x, wy - s.y, opts); };
// Stop the camera lerp and centre it, so world→screen clicks are stable.
const parkCam = (wx, wy) => page.evaluate(({ wx, wy }) => { const c = window.__engine.roomScene.cameras.main; c.stopFollow(); c.centerOn(wx, wy); }, { wx, wy });
const settle = async () => {
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const S = () => page.evaluate(() => ({
  active: window.__engine.state.activeChar,
  party: [...window.__engine.state.party],
  invNorb: [...window.__engine.state.inventoryOf('norb')],
  invPia: [...window.__engine.state.inventoryOf('pia')],
  room: window.__engine.state.currentRoom,
}));

await settle(); // lab intro

// --- single character until Pia joins: switcher hidden, party = [norb]
let s = await S();
check('starts single-character', s.party.length === 1 && s.active === 'norb', `(party=${s.party})`);

// Jump to the mountain (skip the climb) and pick up the canteen.
await page.evaluate(() => {
  window.__engine.state.setFlag('mountain-intro-done');
  window.__engine.state.setFlag('once:mountain-intro');
  window.__engine.roomScene.loadRoom('mountain', 'fromDoor');
});
await settle();
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(492, 828));
await page.waitForTimeout(150);
await page.evaluate(() => { const st = window.__engine.state; st.setFlag('canteenTaken'); st.addItem('canteen'); window.__engine.roomScene.repaintRoom(); window.__engine.events.emit('ui'); });
s = await S();
check('Norb picked up the canteen', s.invNorb.includes('canteen'));

// --- talk to Pia at the summit → she joins the party
// (She's tiny up here via the scale map, so click her sprite's centre.)
const piaAt = () => page.evaluate(() => { const b = window.__engine.roomScene.actors.get('pia').sprite.getBounds(); return { x: b.centerX, y: b.centerY }; });
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1250, 300));
await parkCam(1250, 300);
await page.waitForTimeout(200);
let pt = await piaAt();
await clickWorld(pt.x, pt.y, { button: 'right' }); // talk (default verb)
await settle();
s = await S();
check('Pia joined the party', s.party.length === 2 && s.party.includes('pia'), `(party=${s.party})`);
check('control stays with Norb on join', s.active === 'norb');

// --- switch to Pia (number key 2) → her inventory is separate (empty)
await page.keyboard.press('2');
await settle();
s = await S();
check('switched control to Pia', s.active === 'pia');
check("Pia's inventory is separate (empty)", s.invPia.length === 0 && s.invNorb.includes('canteen'));

// --- switch back to Norb (portrait click at top-left) and pass the canteen
await page.keyboard.press('1');
await settle();
check('switched back to Norb', (await S()).active === 'norb');

// Give canteen to Pia via her hotspot (arm item, click her). She's co-located.
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(1250, 300));
await parkCam(1250, 300);
await page.waitForTimeout(200);
await page.evaluate(() => { window.__engine.setPendingItem('canteen', 'give'); });
pt = await piaAt();
await clickWorld(pt.x, pt.y);
await settle();
s = await S();
check('canteen passed to Pia (scripted give)', !s.invNorb.includes('canteen'), `(norb=${s.invNorb})`);
check('Norb rewarded with the medal', s.invNorb.includes('medal'));

// --- save/load round-trips the whole party
await page.keyboard.press('F5');
await page.waitForTimeout(400);
await page.evaluate(() => { window.__engine.state.addItem('battery', 'pia'); }); // dirty Pia's inv
await page.evaluate(() => window.__engine.load());
await settle();
s = await S();
check('save/load restored the party', s.party.length === 2 && s.active === 'norb');
check('save/load restored per-character inventories', s.invNorb.includes('medal') && !s.invPia.includes('battery'));

// --- cross-room switch: Norb goes inside, Pia stays on the mountain
await page.evaluate(() => window.__engine.roomScene.actors.get('norb').setPosition(300, 812));
await parkCam(300, 812);
await page.waitForTimeout(200);
await clickWorld(132, 700, { button: 'right' }); // front door -> stairhall
await settle();
check('Norb moved inside (stairhall)', (await S()).room === 'stairhall');
check('Pia parked on the mountain', (await page.evaluate(() => window.__engine.state.chars.pia.room)) === 'mountain');
// Switch to Pia → camera fades back to the mountain.
await page.keyboard.press('2');
await settle();
await page.waitForTimeout(400);
s = await S();
check('switching to Pia transitions to her room', s.active === 'pia' && s.room === 'mountain');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
