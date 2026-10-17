/**
 * Regenerates the demo's PNG assets (gallery background, critter and sconce
 * spritesheets, pillar, bird, rain tile) in a real browser.
 *
 * The art itself is SVG, authored with the game's toon toolkit in
 * src/game/art/pngSources.ts and loaded here through Vite's SSR module
 * loader; Chromium rasterizes each frame into its spritesheet cell. (The
 * game could rasterize SVG at runtime — see `svg` layers — but the gallery
 * deliberately exercises the PNG file pipeline.)
 *
 * Usage:  OUT=public/img node tools/gen-assets.mjs
 * Requires playwright (devDependency) + `npx playwright install chromium`.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';

const OUT = process.env.OUT ?? 'public/img';

// SSR-only use: no file watching, and no dependency pre-bundling scan (it
// would race the immediate close below).
const vite = await createServer({
  server: { middlewareMode: true, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  logLevel: 'error',
});
const art = await vite.ssrLoadModule('/src/game/art/pngSources.ts');
const { svgDocument } = await vite.ssrLoadModule('/src/engine/svgTex.ts');
await vite.close();

const cell = (x, y, w, h, markup) => ({ x, y, w, h, svg: svgDocument(markup, w, h) });

// Each PNG: its size and the SVG cells composed into it.
const SHEETS = {
  // Posterized to 6 bits/channel: Chromium dithers gradients, and that ±1
  // noise alone doubles the PNG; at 6 bits it's invisible in this art.
  'gallery-bg.png': { w: 960, h: 450, posterize: 6, cells: [cell(0, 0, 960, 450, art.galleryBackdrop())] },
  // 8×3 grid of 48×48 frames (front/side/back × idle/walk/talk).
  'critter.png': {
    w: 384,
    h: 144,
    cells: art.CRITTER_SHEET.map(([variant, pose, f], i) =>
      cell((i % 8) * 48, Math.floor(i / 8) * 48, 48, 48, art.critterFrame(variant, pose, f))
    ),
  },
  'pillar.png': { w: 140, h: 360, cells: [cell(0, 0, 140, 360, art.pillar())] },
  'sconce.png': { w: 128, h: 48, cells: [0, 1, 2, 3].map((f) => cell(f * 32, 0, 32, 48, art.sconceFrame(f))) },
  'bird.png': { w: 80, h: 28, cells: [0, 1].map((f) => cell(f * 40, 0, 40, 28, art.birdFrame(f))) },
};

const browser = await chromium.launch();
const page = await browser.newPage();

// Rasterize every cell; each SVG's own viewport clips it to its cell.
const pngs = await page.evaluate(async (sheets) => {
  const out = {};
  for (const [name, sheet] of Object.entries(sheets)) {
    const c = document.createElement('canvas');
    c.width = sheet.w;
    c.height = sheet.h;
    const g = c.getContext('2d');
    for (const { x, y, w, h, svg } of sheet.cells) {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.src = url;
      await img.decode();
      g.drawImage(img, x, y, w, h);
      URL.revokeObjectURL(url);
    }
    if (sheet.posterize) {
      const data = g.getImageData(0, 0, sheet.w, sheet.h);
      const keep = 0xff & ~((1 << (8 - sheet.posterize)) - 1);
      for (let i = 0; i < data.data.length; i++) {
        if (i % 4 !== 3) data.data[i] = (data.data[i] & keep) | (data.data[i] >> sheet.posterize);
      }
      g.putImageData(data, 0, 0);
    }
    out[name] = c.toDataURL('image/png');
  }
  return out;
}, SHEETS);

const { rain } = await page.evaluate(() => {
  // ---------- rain: one seamlessly-tileable 256x256 tile ----------
  // A TileSprite repeats and scrolls this, so the motion is smooth (no frame
  // stepping) and there are no seams. Each streak is drawn again at every
  // neighbouring tile offset so streaks that cross an edge wrap cleanly.
  const RT = 256;
  const rc = document.createElement('canvas');
  rc.width = RT;
  rc.height = RT;
  const rg = rc.getContext('2d');
  rg.lineCap = 'round';
  // Deterministic pseudo-random so re-runs are byte-identical.
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const drops = [];
  for (let i = 0; i < 150; i++) {
    drops.push({ x: rnd() * RT, y: rnd() * RT, len: 14 + rnd() * 12, a: 0.18 + rnd() * 0.22 });
  }
  const DX = -5; // wind slant over the drop's length
  for (const d of drops) {
    rg.strokeStyle = `rgba(200, 218, 245, ${d.a.toFixed(3)})`;
    rg.lineWidth = 1 + (d.len > 20 ? 0.6 : 0);
    // 3x3 neighbourhood so edge-crossing streaks tile seamlessly.
    for (let ny = -1; ny <= 1; ny++) {
      for (let nx = -1; nx <= 1; nx++) {
        const ox = d.x + nx * RT;
        const oy = d.y + ny * RT;
        rg.beginPath();
        rg.moveTo(ox, oy);
        rg.lineTo(ox + DX * (d.len / 22), oy + d.len);
        rg.stroke();
      }
    }
  }

  return { rain: rc.toDataURL('image/png') };
});

const save = async (name, dataUrl) => {
  const b64 = dataUrl.split(',')[1];
  await writeFile(`${OUT}/${name}`, Buffer.from(b64, 'base64'));
  console.log('wrote', name);
};
for (const [name, dataUrl] of Object.entries(pngs)) await save(name, dataUrl);
await save('rain.png', rain);

await browser.close();
