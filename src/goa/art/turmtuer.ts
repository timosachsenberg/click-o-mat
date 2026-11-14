import { INK, circle, defs, ellipse, glow, grainDefs, grainOverlay, inked, line, linear, path, rect, rng, text, vignette } from '../../game/art/toon';
import { band } from './neckar';

/**
 * The Hölderlinturm's door, close up, from the promenade at sunset: the
 * round yellow tower wall, a heavy arched door under a lamp, „PUT PUT“
 * sprayed beside it — and an intercom that is plainly a piece of 1987 screwed
 * into the wall: coarse pixels, four colours. It is the one thing that reaches
 * into Otto R.'s time layer, which is why he can answer (and buzz the door
 * open) without being able to come out.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

export const TT = {
  ground: 330,
  wall: { x0: 250, x1: 770 },
  door: { x: 404, y: 118, w: 150, h: 212 },
  /** The intercom: a 5 px pixel grid. */
  intercom: { x: 600, y: 190, w: 60, h: 90 },
  graffiti: { x: 322, y: 236 },
  plaque: { x: 286, y: 150, w: 86, h: 40 },
};

/** The intercom, drawn on a 5 px grid in the 1987 palette. */
function intercom(): string {
  const { x, y, w, h } = TT.intercom;
  const b = (bx: number, by: number, bw: number, bh: number, c: string) => `<rect x="${x + bx}" y="${y + by}" width="${bw}" height="${bh}" fill="${c}"/>`;
  const s: string[] = [`<g shape-rendering="crispEdges">`];
  s.push(b(-5, -5, w + 10, h + 10, '#000000'));
  s.push(b(0, 0, w, h, '#aaaaaa'));
  s.push(b(0, 0, w, 5, '#ffffff') + b(0, 0, 5, h, '#ffffff') + b(w - 5, 5, 5, h - 5, '#555555') + b(5, h - 5, w - 5, 5, '#555555'));
  // The speaker grille.
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s.push(b(10 + c * 10, 10 + r * 10, 5, 5, (r + c) % 2 ? '#000000' : '#555555'));
  // A display line and the button.
  s.push(b(10, 52, 40, 10, '#000000') + b(15, 55, 5, 5, '#55ffff') + b(25, 55, 10, 5, '#55ffff') + b(40, 55, 5, 5, '#ff55ff'));
  s.push(b(20, 68, 20, 15, '#000000') + b(25, 70, 10, 10, '#ff55ff'));
  s.push(`</g>`);
  return s.join('');
}

export function turmtuerBg(): string {
  const { ground, wall, door, graffiti, plaque } = TT;
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(141),
      linear('ttSky', 0, 0, 0, 330, [
        [0, '#34347c'],
        [0.35, '#7c4a94'],
        [0.65, '#e2607a'],
        [0.88, '#ff9a52'],
        [1, '#ffe08a'],
      ]),
      linear('ttWall', wall.x0, 0, wall.x1, 0, [
        [0, '#fff0b0'],
        [0.18, '#f0c670'],
        [0.7, '#dca858'],
        [1, '#9a6a58'],
      ]),
      linear('ttGround', 0, ground, 0, 450, [
        [0, '#b08a8a'],
        [1, '#54406c'],
      ])
    )
  );
  // Sky, the river on both sides, the far bank.
  s.push(rect(0, 0, 960, 340, { fill: 'url(#ttSky)' }));
  s.push(glow('ttSun', 130, 250, 300, '#ffd27a', 0.6, 200));
  s.push(band(-40, 300, 60, 14, 11) + band(700, 1000, 90, 12, 13));
  s.push(path('M0 262Q120 236 250 258V340H0Z', { fill: '#5a3a70' }));
  s.push(path('M0 286H250V340H0ZM770 286H960V340H770Z', { fill: '#f08a6a' }));
  s.push(path('M20 300h70M120 312h90M800 300h60M870 314h70', { stroke: '#fff0b0', sw: 1.6, opacity: 0.7 }));
  // The bridge, far off on the right.
  s.push(inked('M770 262H964V280H770Z', '#b98274', 2));
  for (let x = 790; x < 960; x += 44) s.push(path(`M${x} 280Q${x + 22} 262 ${x + 44} 280V300H${x}Z`, { fill: '#8a5a64', stroke: INK, sw: 1.6 }));
  // The tower wall: round, so lit on the left and shaded on the right.
  s.push(inked(`M${wall.x0} ${ground}V-10H${wall.x1}V${ground}Z`, 'url(#ttWall)', 3));
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const cx = wall.x0 + 16 + r() * (wall.x1 - wall.x0 - 60);
    const cy = 10 + r() * (ground - 40);
    s.push(path(`M${cx.toFixed(0)} ${cy.toFixed(0)}h${(8 + r() * 18).toFixed(0)}`, { stroke: '#b88a48', sw: 1.2, opacity: 0.5 }));
  }
  s.push(path(`M${wall.x0} 60H${wall.x1}`, { stroke: '#b88a48', sw: 3 }));
  // Damp at the foot.
  s.push(path(`M${wall.x0} ${ground - 18}Q510 ${ground - 8} ${wall.x1} ${ground - 18}V${ground}H${wall.x0}Z`, { fill: '#3a4a40', opacity: 0.4 }));
  // A window above, lit.
  s.push(rect(628, 20, 50, 70, { fill: '#ffd870', stroke: INK, sw: 2.6 }) + path('M653 20V90M628 52H678', { stroke: '#a8742a', sw: 2 }));
  s.push(rect(618, 10, 70, 90, { fill: '#ffd870', opacity: 0.14 }, 8));
  // The door: an arch of stone, oak planks, iron bands, a ring.
  const { x, y, w } = door;
  s.push(inked(`M${x - 16} ${ground}V${y + 54}Q${x + w / 2} ${y - 62} ${x + w + 16} ${y + 54}V${ground}Z`, '#b8a088', 2.8));
  s.push(inked(`M${x} ${ground}V${y + 58}Q${x + w / 2} ${y - 38} ${x + w} ${y + 58}V${ground}Z`, '#6a3a1e', 2.6));
  for (let k = 1; k < 5; k++) s.push(line([x + (w / 5) * k, y + 16], [x + (w / 5) * k, ground], '#3a1e0e', 1.8, 0.8));
  for (const by of [y + 78, y + 160]) s.push(inked(`M${x + 2} ${by}h${w - 4}v10h${-(w - 4)}z`, '#3a3a4a', 1.6));
  s.push(circle(x + w - 26, y + 126, 9, { fill: 'none', stroke: INK, sw: 5 }) + circle(x + w - 26, y + 126, 9, { fill: 'none', stroke: '#c8a040', sw: 2.4 }));
  s.push(path(`M${x + w / 2} ${y + 14}V${ground}`, { stroke: INK, sw: 2.4 }));
  // The lamp over it.
  s.push(path(`M${x + w / 2} ${y - 62}v-14`, { stroke: INK, sw: 4 }));
  s.push(inked(`M${x + w / 2 - 12} ${y - 76}h24l-5 -16h-14z`, '#3a4a4a', 2) + inked(`M${x + w / 2 - 9} ${y - 76}l3 12h12l3 -12z`, '#fff4c0', 1.6));
  s.push(glow('ttLamp', x + w / 2, y - 60, 120, '#ffe08a', 0.5, 60));
  // The plaque.
  s.push(inked(`M${plaque.x} ${plaque.y}h${plaque.w}v${plaque.h}h${-plaque.w}z`, '#c8a040', 2));
  s.push(text(plaque.x + plaque.w / 2, plaque.y + 16, 'HÖLDERLIN-', { size: 9, fill: INK, weight: 900 }) + text(plaque.x + plaque.w / 2, plaque.y + 29, 'TURM', { size: 11, fill: INK, weight: 900 }));
  // Sprayed on, as on every other wall in town.
  s.push(text(graffiti.x, graffiti.y, 'PUT', { size: 34, fill: '#4ae8ff', stroke: INK, sw: 5, rotate: -6 }));
  s.push(text(graffiti.x + 6, graffiti.y + 38, 'PUT', { size: 34, fill: '#4ae8ff', stroke: INK, sw: 5, rotate: -4 }));
  s.push(path(`M${graffiti.x - 44} ${graffiti.y + 52}q22 -10 44 0t44 -2`, { stroke: '#ff4a8a', sw: 3.4 }));
  s.push(path(`M${graffiti.x + 30} ${graffiti.y + 44}v22`, { stroke: '#4ae8ff', sw: 2.4, opacity: 0.8 }));
  // The intercom, its cable into the wall, a faint 1987 glow.
  const ic = TT.intercom;
  s.push(glow('ttIcGlow', ic.x + ic.w / 2, ic.y + ic.h / 2, 80, '#55ffff', 0.3, 40));
  s.push(path(`M${ic.x + ic.w / 2} ${ic.y - 5}V${ic.y - 40}Q${ic.x + ic.w / 2} ${ic.y - 60} ${ic.x + 60} ${ic.y - 60}`, { stroke: INK, sw: 4 }));
  s.push(intercom());
  // The promenade: flagstones, the edge of the quay wall, a railing on the left.
  s.push(rect(0, ground, 960, 120, { fill: 'url(#ttGround)' }));
  s.push(path(`M0 ${ground}H960`, { stroke: INK, sw: 3 }));
  for (let gy = ground + 26; gy < 450; gy += 30) s.push(line([0, gy], [960, gy], '#3a2a50', 1.2, 0.45));
  for (let i = 0; i < 16; i++) s.push(line([i * 64 + ((i * 37) % 30), ground + 2], [i * 64 - 30 + ((i * 37) % 30), 450], '#3a2a50', 1.2, 0.35));
  for (const px of [30, 130, 230]) s.push(path(`M${px} ${ground + 4}V${ground - 52}`, { stroke: INK, sw: 6 }) + path(`M${px} ${ground + 4}V${ground - 52}`, { stroke: '#5a5a6a', sw: 3 }));
  s.push(path(`M0 ${ground - 52}H240M0 ${ground - 28}H240`, { stroke: INK, sw: 5 }) + path(`M0 ${ground - 52}H240M0 ${ground - 28}H240`, { stroke: '#7a7a8a', sw: 2.4 }));
  // Willow twigs hanging in from the top left.
  const rw = rng(9);
  for (let i = 0; i < 14; i++) {
    const wx = -10 + i * 19 + rw() * 8;
    const len = 90 + rw() * 130;
    s.push(path(`M${wx} -6q${8 + rw() * 10} ${len / 2} ${-4 + rw() * 8} ${len}`, { stroke: INK, sw: 4.4 }) + path(`M${wx} -6q${8 + rw() * 10} ${len / 2} ${-4 + rw() * 8} ${len}`, { stroke: i % 2 ? '#6a8a3a' : '#88a84a', sw: 2.6 }));
  }
  s.push(ellipse(480, ground + 14, 130, 12, { fill: '#ffe08a', opacity: 0.16 }));
  s.push(rect(0, 0, 960, 450, { fill: '#ff7a3a', opacity: 0.06 }));
  s.push(vignette('ttVig', 960, 450, 0.42, '#241040'));
  s.push(grainOverlay(960, 450, 0.3, 0.22));
  return s.join('');
}

/** The door standing ajar (once the password was said): light from inside. */
export function doorAjar(): string {
  const { x, y, w } = TT.door;
  const g = TT.ground;
  return (
    path(`M${x + w / 2} ${y + 12}Q${x + w - 20} ${y + 16} ${x + w} ${y + 58}V${g}H${x + w / 2}Z`, { fill: '#ffd870', stroke: INK, sw: 2.4 }) +
    path(`M${x + w / 2} ${y + 12}Q${x + w - 20} ${y + 16} ${x + w} ${y + 58}V${g}H${x + w / 2}Z`, { fill: '#ff9a52', opacity: 0.3 }) +
    inked(`M${x + w} ${y + 58}l22 -6V${g + 14}l-22 -14z`, '#5a2e16', 2.4) +
    path(`M${x + w / 2} ${g}l-30 60h150l-46 -60z`, { fill: '#ffd870', opacity: 0.2 })
  );
}

/** The intercom's display, blinking (a small overlay an ambient toggles). */
export function intercomBlink(): string {
  return '<rect width="5" height="5" fill="#ffff55"/>';
}
