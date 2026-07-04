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
const settle = async () => {
  for (let i = 0; i < 80; i++) {
    if (!(await page.evaluate(() => window.__engine.busy))) return;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4);
    await page.waitForTimeout(200);
  }
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
await settle();

const LONG = 'This is a deliberately very long line of dialogue meant to stress the word wrap and check whether the speech text spills past the edges of the visible room area or overlaps the interface band.';
const ROOM_W = 960, ROOM_H = 450;

// Position the player, speak, and measure the speech text's on-screen bounds.
async function speechBounds(room, entry, px, py, camScroll) {
  const r = await page.evaluate(async ({ room, entry, px, py, camScroll, text }) => {
    window.__engine.roomScene.loadRoom(room, entry);
    const p = window.__engine.roomScene.actors.get('norb');
    p.setPosition(px, py);
    if (camScroll) { const c = window.__engine.roomScene.cameras.main; c.stopFollow(); c.setScroll(camScroll.x, camScroll.y); }
    p.say(text); // resolves only when dismissed — don't await
    await new Promise((res) => setTimeout(res, 150));
    const t = window.__engine.roomScene.children.list.find((o) => o.depth === 9000 && o.type === 'Text');
    const b = t.getBounds();
    const cam = window.__engine.roomScene.cameras.main;
    return { left: b.x, right: b.right, top: b.y, bottom: b.bottom, sx: cam.scrollX, sy: cam.scrollY, z: cam.zoom };
  }, { room, entry, px, py, camScroll, text: LONG });
  const s = {
    left: (r.left - r.sx) * r.z, right: (r.right - r.sx) * r.z,
    top: (r.top - r.sy) * r.z, bottom: (r.bottom - r.sy) * r.z,
  };
  await page.evaluate(() => window.__engine.events.emit('skipLine'));
  await page.waitForTimeout(120);
  return s;
}

const within = (s) => s.left >= -1 && s.right <= ROOM_W + 1 && s.top >= -1 && s.bottom <= ROOM_H + 1;
const fmt = (s) => `L${s.left.toFixed(0)} R${s.right.toFixed(0)} T${s.top.toFixed(0)} B${s.bottom.toFixed(0)}`;

for (const [name, room, entry, px, py, cam] of [
  ['left edge', 'lab', 'start', 70, 445, null],
  ['right edge', 'lab', 'start', 910, 445, null],
  ['top of room', 'lab', 'start', 480, 315, null],
  ['scrolled summit', 'mountain', 'fromDoor', 1200, 298, { x: 760, y: 60 }],
  ['scrolled stair right edge', 'stairhall', 'fromGallery', 1300, 700, { x: 440, y: 350 }],
]) {
  const s = await speechBounds(room, entry, px, py, cam);
  check(`long line stays on-screen: ${name}`, within(s), `[${fmt(s)}]`);
}

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
