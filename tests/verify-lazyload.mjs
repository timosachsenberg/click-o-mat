import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// Count how many times each room PNG is fetched over the network.
const fetches = {};
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/img/') && u.endsWith('.png')) {
    const name = u.split('/').pop();
    fetches[name] = (fetches[name] || 0) + 1;
  }
});

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title
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
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const tex = (key) => page.evaluate((k) => window.__engine.roomScene.textures.exists(k), key);
const loadedRooms = () => page.evaluate(() => [...window.__engine.loadedRooms]);

await settle(); // lab intro

// --- at boot (in the lab), the gallery's PNGs are NOT loaded
check('gallery bg not loaded at boot', !(await tex('gallery-bg')));
check('critter spritesheet not loaded at boot', !(await tex('critter')));
check('bird spritesheet not loaded at boot', !(await tex('bird')));
check('critter.png not fetched at boot', !fetches['critter.png'], `(fetches=${JSON.stringify(fetches)})`);
check('lab marked loaded (no bundle)', (await loadedRooms()).includes('lab'));

// --- enter the gallery → its bundle loads
await click(880, 220, { button: 'right' }); // lab -> hallway
await settle();
check('gallery still not loaded from the hallway', !(await tex('critter')));
await click(872, 220, { button: 'right' }); // hallway -> gallery
await settle();
check('gallery bg loaded after entering', await tex('gallery-bg'));
check('critter + pillar + sconce loaded after entering',
  (await tex('critter')) && (await tex('pillar')) && (await tex('sconce')));
check('critter.png fetched exactly once', fetches['critter.png'] === 1, `(${fetches['critter.png']})`);
check('gallery marked loaded', (await loadedRooms()).includes('gallery'));
// The lazily-loaded assets actually work: Blobbo animates.
const anim = await page.evaluate(() => window.__engine.roomScene.actors.get('critter')?.sprite.anims.currentAnim?.key ?? null);
check('Blobbo animates from the lazily-loaded sheet', !!anim && anim.startsWith('critter'), `(${anim})`);

// --- leave and re-enter the gallery → cached, not re-fetched
await page.evaluate(async () => { await window.__engine.roomScene.transitionTo('stairhall', 'fromGallery'); });
await settle();
await page.evaluate(async () => { await window.__engine.roomScene.transitionTo('gallery', 'fromStairs'); });
await settle();
check('back in the gallery', (await page.evaluate(() => window.__engine.state.currentRoom)) === 'gallery');
check('critter.png NOT re-fetched on re-entry (cached)', fetches['critter.png'] === 1, `(${fetches['critter.png']})`);

// --- mountain bird loads only when reaching the mountain
check('bird not loaded before the mountain', !(await tex('bird')));
await page.evaluate(async () => { window.__engine.state.setFlag('once:mountain-intro'); await window.__engine.roomScene.transitionTo('mountain', 'fromDoor'); });
await settle();
check('bird spritesheet loaded on the mountain', await tex('bird'));
check('bird.png fetched once', fetches['bird.png'] === 1, `(${fetches['bird.png']})`);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
