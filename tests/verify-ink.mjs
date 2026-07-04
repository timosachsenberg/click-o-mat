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
await page.waitForTimeout(300);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title screen
await page.waitForTimeout(1000);
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

const settle = async () => {
  for (let i = 0; i < 160; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const choices = () => page.evaluate(() =>
  window.__engine.choicesShowing
    ? window.__engine.uiScene.choiceContainer.list
        .filter((t) => t.type === 'Text' && t.visible && t.text.startsWith('●'))
        .map((t) => { const b = t.getBounds(); return { text: t.text, x: b.centerX, y: b.centerY }; })
    : null
);
/** Wait for choices, then pick the one whose text contains `substr`.
 *  Returns the choice texts that were on offer. */
const pick = async (substr) => {
  let list = null;
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, c: window.__engine.choicesShowing, d: window.__engine.dialogMode }));
    if (st.c) { list = await choices(); break; }
    if (!st.d && !st.b) throw new Error(`dialog ended while waiting to pick "${substr}"`);
    if (st.b && !st.i) await click(480, 240); // skip lines
    await page.waitForTimeout(250);
  }
  if (!list) throw new Error(`no choices appeared for "${substr}"`);
  const target = list.find((c) => c.text.includes(substr));
  if (!target) throw new Error(`choice "${substr}" not offered; got: ${list.map((c) => c.text).join(' | ')}`);
  await click(target.x, target.y);
  await page.waitForTimeout(300);
  return list.map((c) => c.text);
};
const talkToBlobbo = async () => {
  const c = await page.evaluate(() => {
    const a = window.__engine.roomScene.actors.get('critter');
    return { x: a.x, y: a.y };
  });
  await click(c.x, c.y - 25, { button: 'right' });
};

await settle(); // lab intro
await page.evaluate(() => window.__engine.roomScene.loadRoom('gallery', 'fromHallway'));
await settle();

// --- first conversation
await talkToBlobbo();
const first = await pick('Tell me about the paintings');
check('conditional choices hidden without items', !first.some((t) => t.includes('hamster')), `(${first.length} choices)`);
const subs = await pick('The landscape');
check('nested weave sub-choices offered', subs.some((t) => t.includes('squares')) && subs.some((t) => t.includes('night')));
const backAtRoot = await pick('Why do you say');
check('once-only choice gone after use', !backAtRoot.some((t) => t.includes('paintings')));
await pick('I should go');
await settle();
check('ink state persisted to a flag', await page.evaluate(() => typeof window.__engine.state.flags['ink:blobbo'] === 'string' && window.__engine.state.flags['ink:blobbo'].length > 50));

// --- second conversation with a glowing hamster
await page.evaluate(() => window.__engine.state.addItem('glowhamster'));
await talkToBlobbo();
const second = await pick('GLOWING hamster');
check('used topics still gone in conversation 2', !second.some((t) => t.includes('paintings')) && !second.some((t) => t.includes('Why do you say')));
check('inventory-conditional choice appeared', second.some((t) => t.includes('GLOWING')));
await pick('Goodbye, colleague');
await settle();
check('friend var synced out to a game flag', (await page.evaluate(() => window.__engine.state.flags.blobboFriend)) === true);

// --- save/load: ink state survives because it lives in a flag
await page.evaluate(() => window.__engine.save());
await page.evaluate(() => window.__engine.load());
await settle();
await page.evaluate(() => window.__engine.roomScene.loadRoom('gallery', 'fromHallway'));
await settle();
await talkToBlobbo();
const third = await pick('Goodbye, colleague');
check('after save/load: exhausted choices still gone', !third.some((t) => t.includes('GLOWING')) && !third.some((t) => t.includes('paintings')));
check('after save/load: friend greeting branch active', third.some((t) => t.includes('Goodbye, colleague')));
await settle();

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
