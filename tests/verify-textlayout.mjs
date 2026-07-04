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
const settle = async () => { for (let i=0;i<80;i++){ if(!(await page.evaluate(()=>window.__engine.busy))) return; await page.mouse.click(box.x+box.width*0.5, box.y+box.height*0.4); await page.waitForTimeout(200);} };
const check = (label, ok, extra='') => { console.log(`${ok?'PASS':'FAIL'}  ${label}${extra?'  '+extra:''}`); if(!ok) process.exitCode=1; };
await settle();

const ROOM_H = 450, GAME_H = 600, GAME_W = 960;

// 8 UNIQUE choices, several long enough to wrap — forces multiple pages.
// (Unique text so the test can map a picked choice back to its index.)
const CHOICES = Array.from({ length: 8 }, (_, i) =>
  i % 3 === 1
    ? `Choice ${i + 1}: a deliberately long dialogue option that wraps onto two lines because it exceeds the word-wrap width used for choices in the interface band.`
    : `Choice ${i + 1}: a short one.`
);

// Fire presentChoices and capture its resolution index.
await page.evaluate((choices) => {
  window.__pick = undefined;
  window.__engine.uiScene.presentChoices(choices).then((i) => { window.__pick = i; });
}, CHOICES);
await page.waitForTimeout(250);

const readPage = () => page.evaluate(() => {
  const list = window.__engine.uiScene.choiceContainer.list;
  const choices = list.filter((o) => o.type === 'Text' && o.visible && o.text.startsWith('●'))
    .map((t) => { const b = t.getBounds(); return { text: t.text, top: b.y, bottom: b.bottom, left: b.x, right: b.right, cx: b.centerX, cy: b.centerY }; });
  const nav = list.find((o) => o.type === 'Text' && o.visible && o.text.includes('More choices'));
  return { choices, nav: nav ? { text: nav.text, bottom: nav.getBounds().bottom } : null };
});

const p1 = await readPage();
check('multiple pages: nav is shown', !!p1.nav, `(${p1.nav?.text ?? 'no nav'})`);
check('page-1 choices all inside the UI band',
  p1.choices.every((c) => c.top >= ROOM_H - 1 && c.bottom <= GAME_H + 1),
  `(${p1.choices.length} shown, band ${ROOM_H}-${GAME_H})`);
check('page-1 choices do not overlap each other',
  p1.choices.every((c, i) => i === 0 || c.top >= p1.choices[i - 1].bottom - 1),
  `(tops/bottoms: ${p1.choices.map((c) => `${c.top.toFixed(0)}-${c.bottom.toFixed(0)}`).join(', ')})`);
check('page-1 choices do not overlap the nav',
  !p1.nav || p1.choices.every((c) => c.bottom <= p1.nav.bottom + 22),
  '');
check('choices stay within screen width',
  p1.choices.every((c) => c.left >= -1 && c.right <= GAME_W + 1), '');

// Page forward via the wheel over the choice band.
await page.mouse.move(gx(200), gy(ROOM_H + 40));
await page.mouse.wheel(0, 120);
await page.waitForTimeout(250);
const p2 = await readPage();
check('wheel advances to page 2 (different choices)',
  p2.choices.length > 0 && p2.choices[0].text !== p1.choices[0].text,
  `(p1[0]="${p1.choices[0].text.slice(2, 14)}" p2[0]="${p2.choices[0]?.text.slice(2, 14)}")`);
check('page-2 choices also inside the band + no overlap',
  p2.choices.every((c, i) => c.top >= ROOM_H - 1 && c.bottom <= GAME_H + 1 && (i === 0 || c.top >= p2.choices[i - 1].bottom - 1)));

// Pick a choice on page 2 → resolves with its ORIGINAL index.
const target = p2.choices[0];
const origIndex = CHOICES.findIndex((t) => `● ${t}` === target.text);
await page.mouse.click(gx(target.cx), gy(target.cy));
await page.waitForTimeout(200);
const picked = await page.evaluate(() => window.__pick);
check('picking a page-2 choice returns its original index',
  picked === origIndex, `(got ${picked}, expected ${origIndex})`);

// --- long title card stays on screen (wrap + shrink) ---
await page.evaluate(() => {
  window.__engine.makeContext().showTitle('AN ABSURDLY LONG TITLE CARD THAT WOULD DEFINITELY OVERFLOW WITHOUT WRAPPING OR SHRINKING TO FIT');
});
await page.waitForTimeout(700);
const title = await page.evaluate(() => {
  const t = window.__engine.roomScene.children.list.find((o) => o.depth === 20000 && o.type === 'Text');
  if (!t) return null;
  const b = t.getBounds();
  return { left: b.x, right: b.right, top: b.y, bottom: b.bottom };
});
check('long title fits within the room area',
  !!title && title.left >= -1 && title.right <= GAME_W + 1 && title.top >= -1 && title.bottom <= ROOM_H + 1,
  title ? `[L${title.left.toFixed(0)} R${title.right.toFixed(0)} T${title.top.toFixed(0)} B${title.bottom.toFixed(0)}]` : 'no title');

// --- long toast stays on screen (wrap) ---
await page.evaluate(() => window.__engine.uiScene.toast('Picked up: an item with an outrageously, unreasonably long descriptive name that would overflow'));
await page.waitForTimeout(200);
const toast = await page.evaluate(() => {
  const t = window.__engine.uiScene.toastText || null;
  if (!t) return null;
  const b = t.getBounds();
  return { left: b.x, right: b.right };
});
check('long toast fits within screen width',
  !!toast && toast.left >= -1 && toast.right <= GAME_W + 1,
  toast ? `[L${toast.left.toFixed(0)} R${toast.right.toFixed(0)}]` : 'no toast');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
