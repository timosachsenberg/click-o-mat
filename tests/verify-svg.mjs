/**
 * SVG art pipeline: `svg` room layers (static, visible-toggled, and state
 * functions with per-markup texture caching), manifest svgActors/svgImages
 * rasterized at boot, decode-error reporting, and the UI theme (panel art +
 * bundled web font).
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // start game
await page.waitForTimeout(1000);
const click = (x, y) => page.mouse.click(box.x + (x / 960) * box.width, box.y + (y / 600) * box.height);
const settle = async () => {
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
  throw new Error('settle timeout');
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const layer = (id) => page.evaluate((lid) => {
  const o = window.__engine.roomScene.layerObj(lid);
  const src = o.texture.getSourceImage();
  return { key: o.texture.key, visible: o.visible, kind: src?.constructor?.name, w: src?.width, h: src?.height };
}, id);
// Real framebuffer pixel in game coordinates.
const px = (x, y) => page.evaluate(([sx, sy]) => new Promise((res) => {
  window.__engine.roomScene.sys.game.renderer.snapshotPixel(sx, sy, (c) => res({ r: c.r, g: c.g, b: c.b }));
}), [x, y]);
const differs = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 30;
const setFlag = (name, v) => page.evaluate(([n, val]) => { window.__engine.state.flags[n] = val; }, [name, v]);

await settle(); // lab intro

// --- static svg layer: rasterized once into a canvas texture of the room's size
const bg = await layer('bg');
check('lab bg is an svg layer texture', bg.key.startsWith('room-svg-lab-bg'), `(key=${bg.key})`);
check('svg layer rasterized into a canvas', bg.kind === 'HTMLCanvasElement' && bg.w === 960 && bg.h === 450, `(${bg.kind} ${bg.w}x${bg.h})`);

// --- state-function svg layer: a new variant decodes, then caches
const closedKey = (await layer('cabinet')).key;
const closedPx = await px(668, 240);
await setFlag('cabinetOpen', true);
await page.evaluate(() => window.__engine.roomScene.repaintRoom()); // resolves once decoded
await page.waitForTimeout(100);
const open = await layer('cabinet');
const openPx = await px(668, 240);
check('state svg layer swaps texture on repaint', open.key !== closedKey, `(${closedKey} -> ${open.key})`);
check('the open cabinet looks different', differs(closedPx, openPx), `(${JSON.stringify(closedPx)} vs ${JSON.stringify(openPx)})`);
await page.screenshot({ path: `${SHOT}/svg-01-cabinet-open.png` });
await setFlag('cabinetOpen', false);
const backKey = await page.evaluate(() => {
  void window.__engine.roomScene.repaintRoom();
  return window.__engine.roomScene.layerObj('cabinet').texture.key; // read synchronously
});
check('known variant swaps back instantly (cache hit)', backKey === closedKey, `(${backKey})`);

// --- visible-toggled svg overlay
check('battery overlay visible at start', (await layer('battery')).visible);
await setFlag('batteryTaken', true);
await page.evaluate(() => window.__engine.roomScene.repaintRoom());
check('battery overlay hidden once taken', !(await layer('battery')).visible);
await setFlag('batteryTaken', false);
await page.evaluate(() => window.__engine.roomScene.repaintRoom());

// --- manifest svgActors / svgImages, rasterized at boot
const cast = await page.evaluate(() => {
  const s = window.__engine.roomScene;
  const walk = s.anims.get('guy-walk-side');
  const icon = s.textures.get('icon-battery').getSourceImage();
  return {
    frame: s.textures.exists('tent-back-talk-3'),
    walkFrames: walk?.frames.length ?? 0,
    playing: s.actors.get('norb').sprite.anims.currentAnim?.key ?? null,
    icon: `${icon.width}x${icon.height}`,
  };
});
check('svgActors frames rasterized', cast.frame);
check('svgActors animations registered', cast.walkFrames === 8, `(guy-walk-side: ${cast.walkFrames} frames)`);
check('actor plays an svg animation', !!cast.playing && cast.playing.startsWith('guy-'), `(${cast.playing})`);
check('svgImages icon rasterized at its size', cast.icon === '64x48', `(${cast.icon})`);

// --- broken markup is reported with the parser's reason
const decodeErr = await page.evaluate(async () => {
  const { decodeSvg } = await import('/src/engine/svgTex.ts');
  try {
    await decodeSvg('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>', 'broken');
    return null;
  } catch (e) {
    return e.message;
  }
});
check('undecodable SVG throws a descriptive error', !!decodeErr && decodeErr.includes('broken'), `(${decodeErr?.slice(0, 80)})`);

// --- UI theme: panel art and the bundled web font
const theme = await page.evaluate(() => ({
  font: window.__engine.theme.font,
  loaded: document.fonts.check('17px Fredoka'),
  panel: window.__engine.uiScene.textures.exists(window.__engine.theme.panel),
}));
check('UI theme font is the bundled Fredoka', theme.font.includes('Fredoka') && theme.loaded, `(${theme.font}, loaded=${theme.loaded})`);
check('UI theme panel texture exists', theme.panel);
const panelPx = await px(440, 470);
check('UI band shows the themed panel (not the flat default)', differs(panelPx, { r: 0x1a, g: 0x16, b: 0x26 }), JSON.stringify(panelPx));

await page.screenshot({ path: `${SHOT}/svg-02-lab.png` });
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
