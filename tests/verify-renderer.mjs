/**
 * Renderer compatibility: transparent canvas textures must not render as
 * opaque black boxes (a GPU/driver bug class — see src/engine/renderCompat.ts).
 * The Canvas renderer must be the default (real hardware corrupts alpha in
 * WebGL in ways boot-time probes can't detect), and ?renderer=webgl must
 * still boot a working WebGL game. Samples real framebuffer pixels around
 * the lab's floor-lamp layer: the layer's transparent margin must show
 * exactly what is behind it (the same pixel with the layer hidden), not black.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const near = (a, b, tol = 10) => Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
const fmt = (c) => `rgb(${c.r},${c.g},${c.b})`;

async function bootAndSample(browser, url, tag) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(url);
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // start game
  await page.waitForTimeout(1000);

  // Fast-forward the lab intro.
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) break;
    if (st.b && !st.i) await page.mouse.click(box.x + box.width / 2, box.y + (240 / 600) * box.height);
    await page.waitForTimeout(250);
  }

  const rendererType = await page.evaluate(() => window.__engine.roomScene.sys.game.renderer.type);
  // snapshotPixel reads the real framebuffer in game coordinates (960×600).
  const px = (x, y) => page.evaluate(
    ([sx, sy]) => new Promise((res) => {
      window.__engine.roomScene.sys.game.renderer.snapshotPixel(sx, sy, (c) => res({ r: c.r, g: c.g, b: c.b }));
    }),
    [x, y]
  );

  // Lamp layer canvas spans x 270..340, y 128..353; its left margin is
  // transparent (pole starts at local x 29). Each spot is sampled with the
  // layer shown and again hidden: the margin must not change, the shade
  // must. (The walls are textured, so a neighbouring wall pixel is no exact
  // reference — the same pixel without the layer is.)
  const lampVisible = (v) => page.evaluate(async (vis) => {
    window.__engine.roomScene.layerObj('lamp').setVisible(vis);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, v);
  const inLayer = await px(275, 208);
  const shade = await px(302, 148); // lamp shade art — the texture must still draw
  await page.screenshot({ path: `${SHOT}/renderer-${tag}.png` });
  await lampVisible(false);
  const wall = await px(275, 208);
  const behindShade = await px(302, 148);
  await lampVisible(true);

  await page.close();
  return { rendererType, wall, inLayer, shade, behindShade, errors };
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

// Default boot: the Canvas renderer, immune to the WebGL alpha bug class.
{
  const r = await bootAndSample(browser, BASE, 'default');
  check('default boot uses the Canvas renderer', r.rendererType === 1, `(type=${r.rendererType}, 1=CANVAS, 2=WEBGL)`);
  check('default: wall is not black (sanity)', r.wall.r + r.wall.g + r.wall.b > 60, fmt(r.wall));
  check('default: transparent layer margin shows wall', near(r.inLayer, r.wall, 3), `(in-layer ${fmt(r.inLayer)} vs without layer ${fmt(r.wall)})`);
  check('default: lamp shade still drawn', !near(r.shade, r.behindShade), `${fmt(r.shade)} vs without layer ${fmt(r.behindShade)}`);
  check('default: no console errors', r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
}

// Opt-in WebGL: must boot and render with transparency intact (the ImageData
// upload hardening is active on this path).
{
  const r = await bootAndSample(browser, `${BASE}?renderer=webgl`, 'webgl');
  check('?renderer=webgl boots the WebGL renderer', r.rendererType === 2, `(type=${r.rendererType})`);
  check('webgl: transparent layer margin shows wall', near(r.inLayer, r.wall, 3), `(in-layer ${fmt(r.inLayer)} vs without layer ${fmt(r.wall)})`);
  check('webgl: lamp shade still drawn', !near(r.shade, r.behindShade), `${fmt(r.shade)} vs without layer ${fmt(r.behindShade)}`);
  check('webgl: no console errors', r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
}

await browser.close();
