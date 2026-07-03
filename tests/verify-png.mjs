import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT_DIR = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });

const errors = [];
const pngRequests = new Map();
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('response', (r) => {
  const u = r.url();
  if (u.endsWith('.png')) pngRequests.set(u.split('/').pop(), r.status());
});

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
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => ({
      busy: window.__engine.busy, inter: window.__engine.interruptible,
      dialog: window.__engine.dialogMode,
    }));
    if (!st.busy && !st.dialog) return;
    if (st.busy && !st.inter) await click(480, 240);
    await page.waitForTimeout(250);
  }
};
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) process.exitCode = 1; };

await settle(); // lab intro

// Lab -> hallway (right-click the lab door)
await click(880, 220, { button: 'right' });
await settle();
check('reached hallway', (await room()) === 'hallway');

// Hallway -> gallery (right-click the GALLERY door on the right wall)
await click(872, 220, { button: 'right' });
await settle();
check('reached gallery (PNG room)', (await room()) === 'gallery');
await page.screenshot({ path: `${SHOT_DIR}/png-01-gallery.png` });

// The background is a real loaded image, not a canvas texture.
const bgKind = await page.evaluate(() => {
  const src = window.__engine.roomScene.textures.get('gallery-bg').source[0];
  return src.image?.constructor?.name ?? 'none';
});
check(`background 'gallery-bg' is an HTMLImageElement (got ${bgKind})`, bgKind === 'HTMLImageElement');

// The critter's spritesheet is a loaded image too.
const critterKind = await page.evaluate(() => {
  const src = window.__engine.roomScene.textures.get('critter').source[0];
  return src.image?.constructor?.name ?? 'none';
});
check(`spritesheet 'critter' is an HTMLImageElement (got ${critterKind})`, critterKind === 'HTMLImageElement');

// The critter actor is present and playing a spritesheet animation.
const anim = await page.evaluate(() => {
  const a = window.__engine.roomScene.actors.get('critter');
  return { key: a?.sprite.anims.currentAnim?.key ?? null, playing: a?.sprite.anims.isPlaying ?? false };
});
check(`critter plays a 'critter-*' animation (${anim.key})`, !!anim.key && anim.key.startsWith('critter'));

// Its animation frame actually advances over time (proves the sheet
// animates). Poll for up to 3s: at 2fps idle a fixed two-sample gap can
// coincide on the same frame index.
const f1 = await page.evaluate(() => window.__engine.roomScene.actors.get('critter').sprite.anims.currentFrame.index);
let f2 = f1;
for (let i = 0; i < 10 && f2 === f1; i++) {
  await page.waitForTimeout(300);
  f2 = await page.evaluate(() => window.__engine.roomScene.actors.get('critter').sprite.anims.currentFrame.index);
}
check(`critter animation frame advanced (${f1} -> ${f2})`, f1 !== f2);

// (Talking to Blobbo is covered by verify-ink/verify-npc — this suite stays
// a pure PNG-pipeline check.)

// The PNGs were actually fetched successfully.
check(`gallery-bg.png fetched 200 (${pngRequests.get('gallery-bg.png')})`, pngRequests.get('gallery-bg.png') === 200);
check(`critter.png fetched 200 (${pngRequests.get('critter.png')})`, pngRequests.get('critter.png') === 200);

// Back to hallway, and the procedural rooms still work.
await click(120, 300, { button: 'right' }); // gallery doorway
await settle();
check('returned to hallway (procedural room still works)', (await room()) === 'hallway');

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 10).join('\n') : 'none');
await browser.close();
