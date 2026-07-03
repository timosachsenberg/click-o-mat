import { Layer, type LayerDef, type RoomDef } from '../../engine/types';

/**
 * The scrolling showcase: a 1400×800 side-view two-story room (the camera
 * follows the player both horizontally and vertically), with:
 *  - a parallax night-sky layer visible through window cutouts,
 *  - a staircase whose banister is sliced into three occluder layers, each
 *    with its own baseline (the engine's answer to diagonal occlusion),
 *  - uniform actor scale (no `scaling`) — correct for side-view rooms.
 * No `music` key: the gallery's theme keeps playing across the archway.
 */

// Stair geometry shared by art, walk area, and railing slices.
// Top edge of the walkable stair band:    (600,442) -> (1080,690)
// Bottom edge of the walkable stair band: (600,470) -> (1010,690)
// railY tracks the bottom edge — the banister sits along it.
const railY = (x: number) => 470 + ((x - 600) * 220) / 410;

/** A banister segment covering world x0..x1, anchored to its own canvas. */
function railSlice(x0: number, x1: number): LayerDef['paint'] {
  const top = railY(x0) - 56;
  return (g) => {
    // Posts
    g.fillStyle = '#2e2114';
    for (let x = x0; x <= x1; x += 34) {
      g.fillRect(x - x0, railY(x) - 44 - top, 5, 44);
    }
    // Handrail + base rail
    g.strokeStyle = '#4a3626';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(0, railY(x0) - 46 - top);
    g.lineTo(x1 - x0 + 5, railY(x1) - 46 - top);
    g.stroke();
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, railY(x0) - 4 - top);
    g.lineTo(x1 - x0 + 5, railY(x1) - 4 - top);
    g.stroke();
  };
}

function railSliceLayer(id: string, x0: number, x1: number): LayerDef {
  const mid = (x0 + x1) / 2;
  return {
    id,
    depth: Math.round(railY(mid)), // baseline: actors on the stairs are behind it
    x: x0,
    y: railY(x0) - 56,
    w: x1 - x0 + 8,
    h: railY(x1) - (railY(x0) - 56) + 8,
    paint: railSlice(x0, x1),
  };
}

function paintSky(g: CanvasRenderingContext2D): void {
  const grad = g.createLinearGradient(0, 0, 0, 800);
  grad.addColorStop(0, '#141f38');
  grad.addColorStop(1, '#2e3f5c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1400, 800);
  // Stars
  g.fillStyle = '#cdd8ee';
  for (let i = 0; i < 70; i++) {
    g.fillRect((i * 173) % 1400, (i * 97) % 420, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }
  // Moon
  g.fillStyle = 'rgba(232,228,200,0.25)';
  g.beginPath();
  g.arc(1200, 170, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8e4c8';
  g.beginPath();
  g.arc(1200, 170, 30, 0, Math.PI * 2);
  g.fill();
  // Clouds
  g.fillStyle = 'rgba(180,190,215,0.35)';
  for (const [cx, cy] of [
    [340, 210],
    [820, 130],
    [1240, 300],
  ]) {
    g.beginPath();
    g.ellipse(cx, cy, 55, 14, 0, 0, Math.PI * 2);
    g.ellipse(cx + 35, cy - 10, 35, 11, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function paintRoom(g: CanvasRenderingContext2D): void {
  // Wood-panelled wall over everything; windows are cut out to the sky layer.
  g.fillStyle = '#54423a';
  g.fillRect(0, 0, 1400, 800);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < 1400; x += 70) g.fillRect(x, 0, 2, 800); // panelling seams
  // Wainscot rails
  g.fillStyle = '#42332c';
  g.fillRect(0, 380, 1400, 8);
  g.fillRect(0, 622, 1400, 8);

  // Window cutouts (transparent → parallax sky shows through)
  const windows: Array<[number, number, number, number]> = [
    [250, 120, 140, 190],
    [1150, 120, 150, 190],
    [1230, 430, 140, 160],
  ];
  for (const [wx, wy, ww, wh] of windows) {
    g.clearRect(wx, wy, ww, wh);
    g.strokeStyle = '#33281c';
    g.lineWidth = 8;
    g.strokeRect(wx, wy, ww, wh);
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(wx + ww / 2, wy);
    g.lineTo(wx + ww / 2, wy + wh);
    g.moveTo(wx, wy + wh / 2);
    g.lineTo(wx + ww, wy + wh / 2);
    g.stroke();
  }

  // Ancestor portrait on the landing wall
  g.fillStyle = '#c8a24a';
  g.fillRect(322, 212, 106, 136);
  g.fillStyle = '#241c2c';
  g.fillRect(330, 220, 90, 120);
  g.fillStyle = '#d8c8a8';
  g.beginPath();
  g.ellipse(375, 268, 22, 28, 0, 0, Math.PI * 2); // a stern face
  g.fill();
  g.fillStyle = '#3a2c20';
  g.fillRect(353, 238, 44, 14); // severe haircut
  g.fillStyle = '#222222';
  g.fillRect(364, 262, 5, 5);
  g.fillRect(382, 262, 5, 5);
  g.fillRect(366, 284, 18, 3); // disapproving mouth
  g.fillStyle = '#2a2438';
  g.fillRect(345, 296, 60, 30); // formal collar

  // Chandelier
  g.strokeStyle = '#2e2114';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(835, 0);
  g.lineTo(835, 70);
  g.stroke();
  g.lineWidth = 6;
  g.beginPath();
  g.arc(835, 95, 55, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.fillStyle = '#4a3626';
  g.fillRect(825, 70, 20, 30);
  for (const dx of [-52, 0, 52]) {
    g.fillStyle = '#e8e0c8';
    g.fillRect(831 + dx, 118, 8, 14);
    g.fillStyle = 'rgba(255,220,120,0.5)';
    g.beginPath();
    g.arc(835 + dx, 112, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.ellipse(835 + dx, 113, 3, 6, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Under-landing alcove + support column
  g.fillStyle = '#38291f';
  g.fillRect(120, 486, 480, 204);
  g.fillStyle = '#4a3830';
  g.fillRect(586, 470, 26, 220);

  // Landing floor: walkable top surface (feet stand on 442..470), then the
  // slab's front edge below it.
  g.fillStyle = '#7d5a3a';
  g.fillRect(100, 440, 512, 30);
  g.fillStyle = '#8d6a46';
  g.fillRect(100, 440, 512, 3);
  g.fillStyle = '#6b4a2e';
  g.fillRect(100, 470, 512, 16);

  // Staircase: walkable ramp between the two stair edges, with step lines
  g.fillStyle = '#7a5838';
  g.beginPath();
  g.moveTo(600, 442);
  g.lineTo(1080, 690);
  g.lineTo(1010, 690);
  g.lineTo(600, 470);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(40,26,16,0.55)';
  g.lineWidth = 3;
  for (let i = 1; i < 15; i++) {
    const t = i / 15;
    g.beginPath();
    g.moveTo(600 + 480 * t, 442 + 248 * t);
    g.lineTo(600 + 410 * t, 470 + 220 * t);
    g.stroke();
  }
  // Stringer (the board under the steps)
  g.fillStyle = '#4a3222';
  g.beginPath();
  g.moveTo(600, 470);
  g.lineTo(1010, 690);
  g.lineTo(1010, 714);
  g.lineTo(600, 494);
  g.closePath();
  g.fill();

  // Ground floor
  g.fillStyle = '#3a2a1c';
  g.fillRect(0, 684, 1400, 6);
  g.fillStyle = '#6b5a48';
  g.fillRect(0, 690, 1400, 110);
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(0, 706 + i * 22);
    g.lineTo(1400, 706 + i * 22);
    g.stroke();
  }

  // Door back to the gallery (ground floor, left)
  g.fillStyle = '#3a2c20';
  g.fillRect(110, 508, 110, 178);
  g.fillStyle = '#7a5838';
  g.fillRect(118, 516, 94, 170);
  g.strokeStyle = '#5a4430';
  g.lineWidth = 2;
  g.strokeRect(128, 530, 74, 66);
  g.strokeRect(128, 606, 74, 66);
  g.fillStyle = '#d4b430';
  g.beginPath();
  g.arc(206, 606, 4, 0, Math.PI * 2);
  g.fill();

  // Front door to the outside (ground floor, right of the stairs)
  g.fillStyle = '#3a2c20';
  g.fillRect(1090, 500, 96, 186);
  g.fillStyle = '#6b4a30';
  g.fillRect(1098, 508, 80, 178);
  g.strokeStyle = '#4a3222';
  g.lineWidth = 2;
  g.strokeRect(1106, 522, 64, 70);
  g.strokeRect(1106, 602, 64, 74);
  g.fillStyle = '#d4b430';
  g.beginPath();
  g.arc(1106, 600, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c8a24a'; // "OUT" plate
  g.fillRect(1116, 486, 44, 12);
  g.fillStyle = '#33281c';
  g.font = 'bold 9px monospace';
  g.fillText('OUT', 1128, 495);
}

export const stairhallRoom: RoomDef = {
  id: 'stairhall',
  name: 'The Grand Staircase',

  size: { w: 1400, h: 800 },

  layers: [
    // Night sky drifts slower than the camera — visible through the windows.
    { id: 'sky', depth: Layer.BEHIND, parallax: 0.85, paint: paintSky },
    { id: 'room', depth: Layer.BEHIND, paint: paintRoom },
    // The banister, sliced into three occluders along the diagonal so an
    // actor climbing the stairs passes believably behind it.
    railSliceLayer('rail-low', 880, 1010),
    railSliceLayer('rail-mid', 750, 880),
    railSliceLayer('rail-high', 620, 750),
    // Landing banister: actors on the upper floor walk behind it.
    {
      id: 'rail-landing',
      depth: 471,
      x: 146,
      y: 404,
      w: 478,
      h: 72,
      paint(g) {
        g.fillStyle = '#2e2114';
        for (let x = 0; x <= 460; x += 34) g.fillRect(x + 4, 24, 5, 44);
        g.strokeStyle = '#4a3626';
        g.lineWidth = 9;
        g.beginPath();
        g.moveTo(0, 22);
        g.lineTo(478, 22);
        g.stroke();
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(0, 64);
        g.lineTo(478, 64);
        g.stroke();
      },
    },
  ],

  // Ground floor + diagonal stair band + upper landing, one concave polygon.
  walkArea: [
    { x: 150, y: 442 },
    { x: 600, y: 442 },
    { x: 1080, y: 690 },
    { x: 1330, y: 690 },
    { x: 1330, y: 780 },
    { x: 70, y: 780 },
    { x: 70, y: 690 },
    { x: 1010, y: 690 },
    { x: 600, y: 470 },
    { x: 150, y: 470 },
  ],
  // No `scaling`: side-view room, actors keep uniform size on both floors.

  entries: {
    fromGallery: { x: 250, y: 720, facing: 'right' },
    fromOutside: { x: 1138, y: 718, facing: 'down' },
  },

  async onEnter(ctx) {
    if (ctx.flag('stairhallSeen')) return;
    ctx.setFlag('stairhallSeen');
    await ctx.wait(400);
    await ctx.playerSay('A grand staircase. Every sinister mansion contract requires one.');
  },

  hotspots: [
    {
      id: 'stair-door',
      name: 'gallery door',
      rect: { x: 110, y: 508, w: 110, h: 178 },
      walkTo: { x: 220, y: 718 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The door back to the gallery.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('gallery', 'fromStairs');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('gallery', 'fromStairs');
        },
      },
    },
    {
      id: 'front-door',
      name: 'front door',
      rect: { x: 1090, y: 486, w: 96, h: 200 },
      walkTo: { x: 1138, y: 715 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The front door. Outside: nature, allegedly.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromDoor');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromDoor');
        },
      },
    },
    {
      id: 'banister',
      name: 'banister',
      polygon: [
        { x: 620, y: 478 },
        { x: 1010, y: 698 },
        { x: 1010, y: 734 },
        { x: 620, y: 508 },
      ],
      walkTo: { x: 800, y: 555 },
      facing: 'down',
      on: {
        lookat: 'A mahogany banister, polished by a century of dramatic exits.',
        push: "It's load-bearing. Probably. Let's not find out.",
        use: 'Sliding down it is for the epilogue.',
      },
    },
    {
      id: 'portrait',
      name: 'ancestor portrait',
      rect: { x: 322, y: 212, w: 106, h: 136 },
      walkTo: { x: 375, y: 456 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('An oil portrait of somebody important and deeply disappointed.');
          await ctx.playerSay('His eyes follow me. His eyebrows judge me.');
        },
        talkto: "'...' — we understand each other.",
      },
    },
    {
      id: 'chandelier',
      name: 'chandelier',
      rect: { x: 765, y: 40, w: 145, h: 115 },
      on: {
        lookat: "It's held up by hope and one very old chain.",
        use: "It's forty feet up. My ambitions are lower.",
        pull: 'In this genre? That NEVER goes wrong.',
      },
    },
    {
      id: 'upper-window',
      name: 'window',
      rect: { x: 250, y: 120, w: 140, h: 190 },
      walkTo: { x: 320, y: 456 },
      facing: 'up',
      on: {
        lookat: 'From up here you can see... more night. The moon is doing its best.',
        open: "It's painted shut, in keeping with tradition.",
      },
    },
    {
      id: 'ground-window',
      name: 'window',
      rect: { x: 1230, y: 430, w: 140, h: 160 },
      walkTo: { x: 1300, y: 715 },
      facing: 'up',
      on: {
        lookat: 'Clouds drifting past the moon. Very atmospheric. Very rent-inflating.',
      },
    },
  ],
};
