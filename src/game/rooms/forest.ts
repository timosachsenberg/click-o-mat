import { Layer, type RoomDef } from '../../engine/types';
import { FOREST_ASSETS } from '../assets';

/**
 * A stormy forest clearing (single screen). Shows off the weather side of the
 * ambient system: a looping rain overlay plus randomized lightning (a screen
 * flash and thunder that lags behind it) and gusts of wind — all non-blocking,
 * so the player keeps control through the storm.
 */

function paintBackdrop(g: CanvasRenderingContext2D): void {
  // Overcast sky
  const sky = g.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#2a3040');
  sky.addColorStop(1, '#3a4450');
  g.fillStyle = sky;
  g.fillRect(0, 0, 960, 300);

  // Distant treeline silhouette
  g.fillStyle = '#20342a';
  g.beginPath();
  g.moveTo(0, 300);
  for (let x = 0; x <= 960; x += 40) {
    const h = 150 + Math.sin(x * 0.05) * 40 + ((x * 37) % 50);
    g.lineTo(x, 300 - h);
    g.lineTo(x + 20, 300 - h + 30);
  }
  g.lineTo(960, 300);
  g.closePath();
  g.fill();

  // Mid trees (denser, closer)
  g.fillStyle = '#1a2c20';
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 120;
    g.beginPath();
    g.arc(x, 180, 70, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x - 8, 180, 16, 130);
  }

  // Forest floor
  g.fillStyle = '#2e3a28';
  g.fillRect(0, 300, 960, 150);
  g.fillStyle = 'rgba(20, 30, 18, 0.6)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 173) % 960;
    const y = 305 + ((i * 91) % 140);
    g.fillRect(x, y, 3, 5);
  }
  // A muddy path down the middle
  g.fillStyle = '#3a3226';
  g.beginPath();
  g.moveTo(400, 305);
  g.lineTo(560, 305);
  g.lineTo(700, 445);
  g.lineTo(260, 445);
  g.closePath();
  g.fill();
}

/** A foreground tree (trunk + canopy), local to a 200×360 layer canvas.
 *  The trunk base sits at the canvas bottom, so its layer depth = base-y. */
function paintTree(g: CanvasRenderingContext2D): void {
  // Trunk
  g.fillStyle = '#3a2c1e';
  g.fillRect(88, 150, 26, 200);
  g.fillStyle = 'rgba(20,14,8,0.5)';
  g.fillRect(88, 150, 8, 200); // shading
  // Canopy
  g.fillStyle = '#284a2e';
  for (const [dx, dy, r] of [
    [100, 90, 60],
    [60, 120, 44],
    [140, 120, 44],
    [100, 50, 46],
    [70, 60, 32],
    [130, 62, 34],
  ]) {
    g.beginPath();
    g.arc(dx, dy, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#315a38';
  for (const [dx, dy, r] of [
    [86, 84, 20],
    [120, 100, 18],
    [100, 60, 16],
  ]) {
    g.beginPath();
    g.arc(dx, dy, r, 0, Math.PI * 2);
    g.fill();
  }
}

function paintRain(g: CanvasRenderingContext2D): void {
  // Placeholder — the visible rain is the animated 'rain' layer; this keeps
  // a faint static wash so a paused frame still reads as wet.
  g.fillStyle = 'rgba(120, 140, 170, 0.06)';
  g.fillRect(0, 0, 960, 450);
}

export const forestRoom: RoomDef = {
  id: 'forest',
  name: 'Whispering Wood',

  assets: FOREST_ASSETS, // the rain spritesheet, loaded on first entry
  music: 'forest-theme',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, paint: paintBackdrop },
    { id: 'wash', depth: Layer.BEHIND, paint: paintRain },
    // Occluder trees: actors above the trunk base render behind them.
    { id: 'tree-l', depth: 402, x: 60, y: 60, w: 200, h: 360, paint: paintTree },
    { id: 'tree-r', depth: 428, x: 700, y: 80, w: 200, h: 360, paint: paintTree },
    // Rain falls in front of everything (still under speech/UI).
    { id: 'rain', depth: Layer.FRONT, anim: 'rain-fall', x: 0, y: 0, w: 960, h: 480 },
  ],

  // Clearing between the trees; trunk footprints are carved out.
  walkArea: [
    { x: 60, y: 318 },
    { x: 900, y: 318 },
    { x: 930, y: 445 },
    { x: 30, y: 445 },
  ],
  holes: [
    // tree-l trunk (world ~148-174, base ~402)
    [
      { x: 142, y: 392 },
      { x: 178, y: 392 },
      { x: 178, y: 414 },
      { x: 142, y: 414 },
    ],
    // tree-r trunk (world ~788-814, base ~428)
    [
      { x: 782, y: 418 },
      { x: 820, y: 418 },
      { x: 820, y: 440 },
      { x: 782, y: 440 },
    ],
  ],
  scaling: { yTop: 318, scaleTop: 0.74, yBottom: 445, scaleBottom: 1.05 },

  entries: {
    fromMountain: { x: 480, y: 410, facing: 'down' },
  },

  // Weather: non-blocking, so the storm never takes control from the player.
  ambients: [
    {
      // Lightning — a double-flicker, with thunder lagging behind the light.
      every: [7000, 16000],
      run: async (ctx) => {
        ctx.flash(0xdfe8ff, 110);
        await ctx.wait(70);
        ctx.flash(0xffffff, 90);
        await ctx.wait(500 + Math.random() * 1400); // sound is slower than light
        ctx.sfx('thunder');
      },
    },
    {
      // A gust nudges the trees sideways and back (subtle position sway).
      every: [4000, 9000],
      run: async (ctx) => {
        const l = ctx.layerObj('tree-l');
        const r = ctx.layerObj('tree-r');
        const lx = l.x;
        const rx = r.x;
        await ctx.tween(l, { x: lx - 4, ease: 'Sine.easeInOut' }, 900);
        await ctx.tween(r, { x: rx + 3, ease: 'Sine.easeInOut' }, 700);
        await ctx.tween(l, { x: lx, ease: 'Sine.easeInOut' }, 1100);
        await ctx.tween(r, { x: rx, ease: 'Sine.easeInOut' }, 900);
      },
    },
  ],

  async onEnter(ctx) {
    await ctx.once('forest-intro', async () => {
      await ctx.wait(500);
      await ctx.playerSay('A forest. In a thunderstorm. This is fine.');
      await ctx.wait(200);
      ctx.sfx('thunder');
      await ctx.playerSay('Totally fine.');
    });
  },

  hotspots: [
    {
      id: 'mountain-path',
      name: 'path out',
      rect: { x: 0, y: 316, w: 60, h: 130 },
      walkTo: { x: 70, y: 420 },
      facing: 'left',
      defaultVerb: 'open',
      on: {
        lookat: 'The path back to the mountainside.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromForest');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromForest');
        },
      },
    },
    {
      id: 'tree-l',
      name: 'old tree',
      rect: { x: 120, y: 120, w: 120, h: 240 },
      walkTo: { x: 210, y: 420 },
      facing: 'up',
      on: {
        lookat: 'A gnarled old tree. It creaks like it disapproves of me.',
        push: "It's a tree. It wins that contest.",
        pull: 'I am not strong enough to worry a tree.',
      },
    },
    {
      id: 'sky',
      name: 'storm',
      rect: { x: 240, y: 0, w: 480, h: 120 },
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('The sky is auditioning for a horror movie.');
          await ctx.wait(300);
          ctx.flash(0xdfe8ff, 120);
          await ctx.wait(600);
          ctx.sfx('thunder');
        },
      },
    },
  ],
};
