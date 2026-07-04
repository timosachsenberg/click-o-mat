/**
 * Regenerates the demo's placeholder PNG assets (gallery background, critter
 * and sconce spritesheets, pillar, bird) by drawing on a real browser canvas.
 *
 * Usage:  OUT=public/img node tools/gen-assets.mjs
 * Requires playwright (devDependency) + `npx playwright install chromium`.
 */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const OUT = process.env.OUT ?? 'public/img';
const browser = await chromium.launch();
const page = await browser.newPage();

// Draw all assets inside the browser (real canvas) and return PNG data URLs.
const { bg, sheet, pillar, sconce, bird } = await page.evaluate(() => {
  // ---------- background: a small art gallery (960x450) ----------
  const bgc = document.createElement('canvas');
  bgc.width = 960;
  bgc.height = 450;
  const g = bgc.getContext('2d');

  // Wall
  const wall = g.createLinearGradient(0, 0, 0, 300);
  wall.addColorStop(0, '#6b4a56');
  wall.addColorStop(1, '#815d68');
  g.fillStyle = wall;
  g.fillRect(0, 0, 960, 300);
  // Wainscot rail + baseboard
  g.fillStyle = '#4a3540';
  g.fillRect(0, 232, 960, 8);
  // Parquet floor
  g.fillStyle = '#7a5233';
  g.fillRect(0, 300, 960, 150);
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 1;
  for (let x = -300; x < 960; x += 60) {
    for (let y = 300; y < 450; y += 30) {
      const off = ((y - 300) / 30) % 2 === 0 ? 0 : 30;
      g.strokeRect(x + off, y, 60, 30);
    }
  }
  g.fillStyle = '#3a2a1c';
  g.fillRect(0, 294, 960, 8);

  // Red carpet runner
  g.fillStyle = '#7c1f28';
  g.beginPath();
  g.moveTo(360, 302);
  g.lineTo(600, 302);
  g.lineTo(720, 450);
  g.lineTo(240, 450);
  g.closePath();
  g.fill();
  g.fillStyle = '#e0b84a';
  g.fillRect(0, 0, 0, 0);
  g.strokeStyle = '#e0b84a';
  g.lineWidth = 3;
  g.stroke();

  // Archway to the stair hall (right wall)
  g.fillStyle = '#3a2a30';
  g.fillRect(830, 128, 116, 176);
  g.fillStyle = '#140e16';
  g.beginPath();
  g.moveTo(842, 304);
  g.lineTo(842, 180);
  g.quadraticCurveTo(888, 130, 934, 180);
  g.lineTo(934, 304);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(230,210,150,0.10)';
  g.fill();
  g.fillStyle = '#c8a24a';
  g.fillRect(878, 116, 20, 12); // keystone

  // Doorway back to the hallway (left wall)
  g.fillStyle = '#3a2a30';
  g.fillRect(30, 120, 116, 184);
  g.fillStyle = '#140e16';
  g.fillRect(42, 132, 92, 168);
  g.fillStyle = 'rgba(230,210,150,0.10)'; // faint light spill
  g.fillRect(42, 132, 92, 168);
  g.fillStyle = '#c8a24a'; // arch keystone
  g.fillRect(80, 118, 16, 10);

  // Framed paintings
  const painting = (x, y, w, h, paint) => {
    g.fillStyle = '#c8a24a'; // gold frame
    g.fillRect(x - 8, y - 8, w + 16, h + 16);
    g.fillStyle = '#2a2030';
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    paint(x, y, w, h);
    // little wall plaque
    g.fillStyle = '#d8cfa8';
    g.fillRect(x + w / 2 - 14, y + h + 14, 28, 8);
  };

  painting(120, 70, 150, 110, (x, y, w, h) => {
    const sky = g.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#8ec5e6');
    sky.addColorStop(1, '#d8ecc0');
    g.fillStyle = sky;
    g.fillRect(x, y, w, h);
    g.fillStyle = '#4f8a3c'; // hills
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + h - 30);
    g.quadraticCurveTo(x + w * 0.3, y + h - 60, x + w * 0.6, y + h - 25);
    g.quadraticCurveTo(x + w * 0.8, y + h - 10, x + w, y + h - 35);
    g.lineTo(x + w, y + h);
    g.closePath();
    g.fill();
    g.fillStyle = '#f4d35e'; // sun
    g.beginPath();
    g.arc(x + w - 34, y + 32, 15, 0, Math.PI * 2);
    g.fill();
  });

  painting(420, 60, 120, 120, (x, y, w, h) => {
    g.fillStyle = '#20222e';
    g.fillRect(x, y, w, h);
    // abstract squares
    const cols = ['#e05a4a', '#4a7dd4', '#e0b84a', '#4fae6a'];
    for (let i = 0; i < 9; i++) {
      g.fillStyle = cols[(i * 3 + 1) % 4];
      g.fillRect(x + 10 + (i % 3) * 36, y + 10 + Math.floor(i / 3) * 36, 30, 30);
    }
  });

  painting(690, 74, 150, 100, (x, y, w, h) => {
    g.fillStyle = '#122033';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#e8e0c0'; // moon
    g.beginPath();
    g.arc(x + 40, y + 34, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1c3a52';
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + h - 20);
    g.quadraticCurveTo(x + w * 0.5, y + h - 55, x + w, y + h - 18);
    g.lineTo(x + w, y + h);
    g.closePath();
    g.fill();
  });

  // A velvet bench on the floor
  g.fillStyle = '#3a2f4a';
  g.fillRect(430, 330, 120, 14);
  g.fillStyle = '#5a4a72';
  g.fillRect(430, 322, 120, 12);
  g.fillStyle = '#2a2438';
  g.fillRect(440, 344, 8, 22);
  g.fillRect(532, 344, 8, 22);

  // ---------- character spritesheet: a slime critter ----------
  // 8 columns x 3 rows of 48x48 cells (384x144).
  const sc = document.createElement('canvas');
  sc.width = 384;
  sc.height = 144;
  const s = sc.getContext('2d');

  // index -> [variant, pose, frameInAnim]
  const SPEC = {
    0: ['front', 'idle', 0], 1: ['front', 'idle', 1],
    2: ['side', 'idle', 0], 3: ['side', 'idle', 1],
    4: ['back', 'idle', 0], 5: ['back', 'idle', 1],
    6: ['front', 'talk', 0], 7: ['front', 'talk', 1],
    8: ['front', 'walk', 0], 9: ['front', 'walk', 1], 10: ['front', 'walk', 2], 11: ['front', 'walk', 3],
    12: ['side', 'walk', 0], 13: ['side', 'walk', 1], 14: ['side', 'walk', 2], 15: ['side', 'walk', 3],
    16: ['back', 'walk', 0], 17: ['back', 'walk', 1], 18: ['back', 'walk', 2], 19: ['back', 'walk', 3],
    20: ['side', 'talk', 0], 21: ['side', 'talk', 1],
    22: ['back', 'talk', 0], 23: ['back', 'talk', 1],
  };

  const drawCritter = (ctx, ox, oy, variant, pose, f) => {
    const cx = ox + 24;
    // Feet land at the cell's bottom edge (origin is 0.5,1). baseY+12 (feet)
    // + 3 (ellipse radius) must stay ≤ 48 or the art bleeds into the frame
    // packed below it in the sheet.
    const baseY = oy + 33;
    const bob = pose === 'walk' ? (f % 2 === 0 ? -2 : 0) : 0;
    const squish = pose === 'idle' && f % 2 === 1 ? 2 : 0;
    const cy = baseY + bob;
    const bodyW = 17 + squish;
    const bodyH = 15 - squish;

    // Feet
    ctx.fillStyle = '#a85f22';
    const step = pose === 'walk' ? [5, 0, -5, 0][f % 4] : 0;
    ctx.beginPath();
    ctx.ellipse(cx - 8 + step, cy + 12, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 8 - step, cy + 12, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (a rounded slime dome)
    const grad = ctx.createLinearGradient(0, cy - bodyH, 0, cy + bodyH);
    grad.addColorStop(0, '#f0a24a');
    grad.addColorStop(1, '#d47a28');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW, cy + bodyH);
    ctx.quadraticCurveTo(cx - bodyW, cy - bodyH - 4, cx, cy - bodyH - 4);
    ctx.quadraticCurveTo(cx + bodyW, cy - bodyH - 4, cx + bodyW, cy + bodyH);
    ctx.closePath();
    ctx.fill();
    // belly highlight
    ctx.fillStyle = 'rgba(255,235,190,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 4, bodyW * 0.5, bodyH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Antenna
    ctx.strokeStyle = '#b8641c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - bodyH - 2);
    ctx.lineTo(cx + (variant === 'side' ? 5 : 0), cy - bodyH - 12);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(cx + (variant === 'side' ? 5 : 0), cy - bodyH - 13, 3, 0, Math.PI * 2);
    ctx.fill();

    if (variant === 'back') return; // no face from behind

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#5a3410';
    ctx.lineWidth = 1;
    if (variant === 'front') {
      for (const dx of [-6, 6]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#221a12';
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 3, 1.8, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // side: one eye, facing right (Actor flips for left)
      ctx.beginPath();
      ctx.arc(cx + 7, cy - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#221a12';
      ctx.beginPath();
      ctx.arc(cx + 9, cy - 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    ctx.fillStyle = '#7a2a1a';
    const open = pose === 'talk' && f % 2 === 0;
    const mx = variant === 'side' ? cx + 8 : cx;
    ctx.beginPath();
    if (open) ctx.ellipse(mx, cy + 6, 3, 4, 0, 0, Math.PI * 2);
    else ctx.ellipse(mx, cy + 6, 3.5, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let i = 0; i < 24; i++) {
    const [variant, pose, f] = SPEC[i];
    const col = i % 8;
    const row = Math.floor(i / 8);
    drawCritter(s, col * 48, row * 48, variant, pose, f);
  }

  // ---------- foreground pillar (140x360, alpha) ----------
  const pc = document.createElement('canvas');
  pc.width = 140;
  pc.height = 360;
  const p = pc.getContext('2d');
  // Capital (top slab) and abacus
  p.fillStyle = '#b8b2a4';
  p.fillRect(10, 6, 120, 16);
  p.fillStyle = '#a8a294';
  p.fillRect(22, 22, 96, 12);
  // Shaft with vertical shading + flutes
  const shaft = p.createLinearGradient(34, 0, 106, 0);
  shaft.addColorStop(0, '#8a8478');
  shaft.addColorStop(0.35, '#d0cabc');
  shaft.addColorStop(0.65, '#c4beb0');
  shaft.addColorStop(1, '#7a7468');
  p.fillStyle = shaft;
  p.fillRect(34, 34, 72, 292);
  p.strokeStyle = 'rgba(90,84,74,0.5)';
  p.lineWidth = 2;
  for (const fx of [50, 66, 82, 98]) {
    p.beginPath();
    p.moveTo(fx, 38);
    p.lineTo(fx, 322);
    p.stroke();
  }
  // Base plinth
  p.fillStyle = '#a8a294';
  p.fillRect(22, 326, 96, 12);
  p.fillStyle = '#b8b2a4';
  p.fillRect(10, 338, 120, 16);

  // ---------- wall sconce spritesheet: 4 frames of 32x48 ----------
  const scn = document.createElement('canvas');
  scn.width = 128;
  scn.height = 48;
  const s2 = scn.getContext('2d');
  for (let f = 0; f < 4; f++) {
    const ox = f * 32;
    const cx = ox + 16;
    // Bracket + cup
    s2.fillStyle = '#4a3a28';
    s2.fillRect(cx - 2, 36, 4, 10);
    s2.beginPath();
    s2.ellipse(cx, 36, 9, 4, 0, 0, Math.PI * 2);
    s2.fill();
    // Candle
    s2.fillStyle = '#e8e0c8';
    s2.fillRect(cx - 3, 24, 6, 12);
    // Flame — height/lean/brightness vary per frame
    const lean = [0, 2, -1, 1][f];
    const hgt = [14, 11, 15, 12][f];
    const glow = s2.createRadialGradient(cx, 20, 1, cx, 20, 14);
    glow.addColorStop(0, 'rgba(255,220,120,0.55)');
    glow.addColorStop(1, 'rgba(255,220,120,0)');
    s2.fillStyle = glow;
    s2.fillRect(ox, 0, 32, 34);
    s2.fillStyle = '#ff9c2a';
    s2.beginPath();
    s2.ellipse(cx + lean, 24 - hgt / 2, 4, hgt / 2 + 2, lean * 0.08, 0, Math.PI * 2);
    s2.fill();
    s2.fillStyle = '#ffe27a';
    s2.beginPath();
    s2.ellipse(cx + lean * 0.6, 24 - hgt / 2 + 2, 2, hgt / 3, 0, 0, Math.PI * 2);
    s2.fill();
  }

  // ---------- bird spritesheet: 2 flap frames of 40x28 ----------
  const bc = document.createElement('canvas');
  bc.width = 80;
  bc.height = 28;
  const b = bc.getContext('2d');
  for (let f = 0; f < 2; f++) {
    const ox = f * 40;
    const cx = ox + 20;
    const cy = 16;
    b.fillStyle = '#2a2f3a';
    // Body
    b.beginPath();
    b.ellipse(cx, cy, 7, 4, 0, 0, Math.PI * 2);
    b.fill();
    // Beak + tail
    b.beginPath();
    b.moveTo(cx + 6, cy - 1);
    b.lineTo(cx + 12, cy);
    b.lineTo(cx + 6, cy + 2);
    b.closePath();
    b.fill();
    b.beginPath();
    b.moveTo(cx - 6, cy);
    b.lineTo(cx - 13, cy - 3);
    b.lineTo(cx - 13, cy + 3);
    b.closePath();
    b.fill();
    // Wings: up-stroke vs down-stroke
    const wy = f === 0 ? -10 : 8;
    b.beginPath();
    b.moveTo(cx - 2, cy - 2);
    b.quadraticCurveTo(cx - 4, cy + wy, cx - 12, cy + wy * 0.8);
    b.lineTo(cx - 4, cy + (f === 0 ? -2 : 2));
    b.closePath();
    b.fill();
    b.beginPath();
    b.moveTo(cx + 2, cy - 2);
    b.quadraticCurveTo(cx + 4, cy + wy, cx + 12, cy + wy * 0.8);
    b.lineTo(cx + 4, cy + (f === 0 ? -2 : 2));
    b.closePath();
    b.fill();
  }

  return {
    bg: bgc.toDataURL('image/png'),
    sheet: sc.toDataURL('image/png'),
    pillar: pc.toDataURL('image/png'),
    sconce: scn.toDataURL('image/png'),
    bird: bc.toDataURL('image/png'),
  };
});

const save = async (name, dataUrl) => {
  const b64 = dataUrl.split(',')[1];
  await writeFile(`${OUT}/${name}`, Buffer.from(b64, 'base64'));
  console.log('wrote', name);
};
await save('gallery-bg.png', bg);
await save('critter.png', sheet);
await save('pillar.png', pillar);
await save('sconce.png', sconce);
await save('bird.png', bird);

await browser.close();
