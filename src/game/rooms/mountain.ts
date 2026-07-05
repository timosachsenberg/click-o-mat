import { Layer, type RoomDef } from '../../engine/types';
import type { GameState } from '../../engine/GameState';
import { MOUNTAIN_ASSETS } from '../assets';

/**
 * The outdoor showcase (leave the mansion through the stair hall's front
 * door). A 1920×900 mountainside demonstrating all three "living scene"
 * mechanisms at once:
 *  - a **scale map** — `scaling` is a function, so the player shrinks
 *    non-linearly while climbing the switchback trail,
 *  - **ambients** — a bird crosses the sky and a cloud shadow drifts over
 *    the meadow on randomized timers, without ever locking input,
 *  - **camera zoom** — the entry cutscene pulls back to reveal the mountain,
 *    and looking at "the view" from the summit zooms out to the full room.
 */

// Switchback trail, matching the walk-area polygon below:
//   meadow (y 790..870)
//   leg 1 up-right  -> ledge 1 (x 1430..1640, y 610..650)
//   leg 2 up-left   -> ledge 2 (x 560..860,  y 430..466)
//   leg 3 up-right  -> summit  (x 1080..1400, y 280..316)

// The sky canvas is oversized (2320×1200, placed at -200,-150): a parallax
// layer drifts against the world by scroll*(1-parallax), and camera zoom-outs
// raise the minimum scroll, so an exactly-room-sized layer would expose its
// edges. Content is drawn in room coords via a translate.
function paintSky(g: CanvasRenderingContext2D): void {
  const grad = g.createLinearGradient(0, 0, 0, 1200);
  grad.addColorStop(0, '#79b0d8');
  grad.addColorStop(0.75, '#c8dfee');
  grad.addColorStop(1, '#e2ecf2');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2320, 1200);
  g.translate(200, 150);
  // Sun
  g.fillStyle = 'rgba(255,240,180,0.4)';
  g.beginPath();
  g.arc(350, 150, 70, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff0b4';
  g.beginPath();
  g.arc(350, 150, 42, 0, Math.PI * 2);
  g.fill();
  // Clouds
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, s] of [
    [600, 200, 1.2],
    [1150, 120, 1],
    [1650, 240, 1.4],
    [900, 320, 0.8],
  ]) {
    g.beginPath();
    g.ellipse(cx, cy, 70 * s, 18 * s, 0, 0, Math.PI * 2);
    g.ellipse(cx + 45 * s, cy - 12 * s, 45 * s, 14 * s, 0, 0, Math.PI * 2);
    g.ellipse(cx - 50 * s, cy - 6 * s, 40 * s, 12 * s, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Distant ridge line (extends past the room on both sides for parallax)
  g.fillStyle = 'rgba(150,170,195,0.6)';
  g.beginPath();
  g.moveTo(-200, 640);
  g.lineTo(300, 520);
  g.lineTo(560, 620);
  g.lineTo(880, 500);
  g.lineTo(1200, 610);
  g.lineTo(1560, 540);
  g.lineTo(2120, 640);
  g.lineTo(2120, 1050);
  g.lineTo(-200, 1050);
  g.closePath();
  g.fill();
}

function paintTerrain(g: CanvasRenderingContext2D, state: GameState): void {
  // Mountain mass
  g.fillStyle = '#8a7a68';
  g.beginPath();
  g.moveTo(180, 870);
  g.lineTo(700, 560);
  g.lineTo(950, 460);
  g.lineTo(1160, 260);
  g.lineTo(1255, 208);
  g.lineTo(1420, 300);
  g.lineTo(1610, 520);
  g.lineTo(1900, 870);
  g.closePath();
  g.fill();
  // Shaded facet
  g.fillStyle = 'rgba(60,50,40,0.18)';
  g.beginPath();
  g.moveTo(1255, 208);
  g.lineTo(1420, 300);
  g.lineTo(1610, 520);
  g.lineTo(1900, 870);
  g.lineTo(1420, 870);
  g.closePath();
  g.fill();
  // Snow cap
  g.fillStyle = '#eef2f6';
  g.beginPath();
  g.moveTo(1140, 300);
  g.lineTo(1255, 208);
  g.lineTo(1390, 300);
  g.lineTo(1330, 330);
  g.lineTo(1240, 312);
  g.lineTo(1180, 332);
  g.closePath();
  g.fill();
  // Scattered rocks
  g.fillStyle = 'rgba(70,60,50,0.5)';
  for (const [rx, ry, rr] of [
    [820, 620, 16],
    [1520, 700, 22],
    [1050, 520, 12],
    [700, 700, 14],
  ]) {
    g.beginPath();
    g.ellipse(rx, ry, rr, rr * 0.6, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Meadow in front of the mountain base
  g.fillStyle = '#7ba05a';
  g.fillRect(0, 770, 1920, 130);
  g.fillStyle = 'rgba(60,110,50,0.5)';
  for (let i = 0; i < 60; i++) {
    const tx = (i * 331) % 1920;
    const ty = 790 + ((i * 127) % 70);
    g.fillRect(tx, ty, 3, 6);
  }

  // A dark treeline at the far right — the edge of the woods, with a path in.
  g.fillStyle = '#1a2a1c';
  g.fillRect(1740, 560, 180, 340); // dense shadow behind the trees
  g.fillStyle = '#213524';
  for (let i = 0; i < 5; i++) {
    const tx = 1770 + i * 38;
    const th = 150 + ((i * 53) % 70);
    const top = 800 - th;
    g.beginPath();
    g.arc(tx, top, 44, 0, Math.PI * 2);
    g.fill();
    g.fillRect(tx - 9, top, 18, th);
  }
  g.fillStyle = '#3a3226';
  g.beginPath(); // the path leading in
  g.moveTo(1700, 870);
  g.lineTo(1815, 800);
  g.lineTo(1900, 812);
  g.lineTo(1900, 870);
  g.closePath();
  g.fill();
  // A canteen lying in the grass (until someone picks it up).
  if (!state.getFlag('canteenTaken')) {
    g.fillStyle = '#5a7a4a';
    g.beginPath();
    g.ellipse(492, 822, 11, 13, 0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a5230';
    g.fillRect(497, 808, 8, 6);
    g.fillStyle = '#e8e0c0';
    g.fillRect(484, 820, 14, 4);
  }

  // Trail: ledges + summit slab
  g.fillStyle = '#b39b6d';
  g.fillRect(1430, 602, 210, 50); // ledge 1
  g.fillRect(560, 424, 300, 44); // ledge 2
  g.fillRect(1080, 274, 320, 44); // summit slab
  // Trail: the three legs
  g.strokeStyle = '#b39b6d';
  g.lineCap = 'round';
  g.lineWidth = 46;
  g.beginPath();
  g.moveTo(1220, 795);
  g.lineTo(1465, 632);
  g.stroke();
  g.lineWidth = 36;
  g.beginPath();
  g.moveTo(1550, 608);
  g.lineTo(780, 448);
  g.stroke();
  g.lineWidth = 32;
  g.beginPath();
  g.moveTo(655, 428);
  g.lineTo(1175, 298);
  g.stroke();
  // Trail edge shading
  g.strokeStyle = 'rgba(90,70,45,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(1198, 792);
  g.lineTo(1445, 628);
  g.moveTo(1546, 620);
  g.lineTo(778, 460);
  g.moveTo(652, 440);
  g.lineTo(1172, 310);
  g.stroke();

  // The mansion's outside wall + front door (left edge)
  g.fillStyle = '#6a6270';
  g.fillRect(0, 520, 230, 350);
  g.fillStyle = '#57505c';
  g.beginPath();
  g.moveTo(0, 520);
  g.lineTo(230, 520);
  g.lineTo(150, 440);
  g.lineTo(0, 440);
  g.closePath();
  g.fill();
  g.fillStyle = '#3a2c20';
  g.fillRect(84, 634, 96, 160);
  g.fillStyle = '#1c1410';
  g.fillRect(94, 644, 76, 150);
  g.fillStyle = '#c8a24a';
  g.beginPath();
  g.arc(158, 722, 4, 0, Math.PI * 2);
  g.fill();

  // Summit flag
  g.strokeStyle = '#4a3626';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(1330, 300);
  g.lineTo(1330, 226);
  g.stroke();
  g.fillStyle = '#c03a30';
  g.beginPath();
  g.moveTo(1330, 228);
  g.lineTo(1374, 240);
  g.lineTo(1330, 252);
  g.closePath();
  g.fill();
}

function paintCloudShadow(g: CanvasRenderingContext2D): void {
  g.fillStyle = 'rgba(20,30,20,0.18)';
  g.beginPath();
  g.ellipse(180, 70, 170, 52, 0, 0, Math.PI * 2);
  g.fill();
}

export const mountainRoom: RoomDef = {
  id: 'mountain',
  name: 'The Mountain',
  features: [
    'a large scrolling outdoor room with a parallax sky',
    'a non-linear scale map (you shrink climbing the trail)',
    'a camera zoom-out (look at the view from the summit)',
    'an optional second playable character (Pia)',
    'ambient wildlife (a bird crossing the sky)',
  ],

  assets: MOUNTAIN_ASSETS, // the bird spritesheet, loaded on first entry

  size: { w: 1920, h: 900 },
  music: 'mountain-theme',

  layers: [
    { id: 'sky', depth: Layer.BEHIND, parallax: 0.8, x: -200, y: -150, w: 2320, h: 1200, paint: paintSky },
    { id: 'terrain', depth: Layer.BEHIND, paint: paintTerrain },
    // Drifts across the meadow via an ambient tween; above terrain, below actors.
    { id: 'cloud-shadow', depth: Layer.BEHIND, x: -400, y: 700, w: 360, h: 140, paint: paintCloudShadow },
    // Crosses the sky via an ambient tween; in front so it passes "close by".
    { id: 'bird', depth: Layer.FRONT, anim: 'bird-flap', x: -100, y: 180 },
  ],

  // Scale map: the higher (and further "into" the scene) you climb, the
  // smaller you get — non-linear, so the summit shrink is more dramatic.
  scaling: (_x, y) => {
    const t = Math.max(0, Math.min(1, (y - 270) / 600));
    return 0.26 + 0.84 * t * t * (3 - 2 * t); // smoothstep
  },

  // Meadow + three switchback legs + two ledges + summit, one polygon.
  walkArea: [
    { x: 80, y: 790 },
    { x: 1180, y: 790 },
    { x: 1430, y: 610 },
    { x: 1470, y: 610 },
    { x: 700, y: 466 },
    { x: 560, y: 466 },
    { x: 560, y: 430 },
    { x: 600, y: 430 },
    { x: 1120, y: 316 },
    { x: 1080, y: 316 },
    { x: 1080, y: 280 },
    { x: 1400, y: 280 },
    { x: 1400, y: 316 },
    { x: 1230, y: 316 },
    { x: 710, y: 430 },
    { x: 860, y: 430 },
    { x: 860, y: 466 },
    { x: 1630, y: 610 },
    { x: 1640, y: 610 },
    { x: 1640, y: 650 },
    { x: 1500, y: 650 },
    { x: 1250, y: 790 },
    { x: 1820, y: 790 },
    { x: 1850, y: 870 },
    { x: 80, y: 870 },
  ],

  entries: {
    fromDoor: { x: 170, y: 812, facing: 'right' },
    fromForest: { x: 1780, y: 800, facing: 'left' },
  },

  // Pia is a fellow climber at the summit — talk to her and she joins the
  // party. Once she's a party member she's spawned from her saved position,
  // not this placement (the engine skips party members here).
  actors: [{ id: 'pia', x: 1180, y: 300, facing: 'right' }],

  ambients: [
    {
      every: [8000, 15000],
      run: async (ctx) => {
        const bird = ctx.layerObj('bird');
        const y = 120 + Math.random() * 260;
        bird.setPosition(-60, y);
        await ctx.tween(bird, { x: 2000, y: y + 30 + Math.random() * 60 }, 5500 + Math.random() * 2000);
        bird.setPosition(-100, 180);
      },
    },
    {
      every: [12000, 22000],
      run: async (ctx) => {
        const shadow = ctx.layerObj('cloud-shadow');
        shadow.setPosition(-380, 660 + Math.random() * 120);
        await ctx.tween(shadow, { x: 2000 }, 15000);
        shadow.setPosition(-400, 700);
      },
    },
  ],

  // First-visit reveal cutscene (skippable with Esc, like all cutscenes).
  async onEnter(ctx) {
    await ctx.once('mountain-intro', async () => {
      await ctx.wait(400);
      await ctx.playerSay('Fresh air. Judgmental altitude.');
      await ctx.zoomCamera(0.55, 1600);
      await ctx.wait(900);
      await ctx.zoomCamera(1, 1200);
      await ctx.playerSay("And I'm going to climb that. For no reason whatsoever.");
    });
  },

  async onExit(ctx) {
    await ctx.once('mountain-outro', () =>
      ctx.playerSay('Back inside. My calves will remember this.')
    );
  },

  regions: [
    // Walk-on trigger at the foot of the trail: fires the first time the
    // player steps onto leg 1, never from the meadow below it.
    {
      id: 'trailhead',
      rect: { x: 1190, y: 744, w: 120, h: 44 },
      once: true,
      onEnter: async (ctx) => {
        await ctx.playerSay('Here we go. Cardio.');
      },
    },
  ],

  hotspots: [
    // A canteen in the meadow (picked up by whoever is active).
    // A path into the woods at the far edge of the meadow.
    {
      id: 'forest-path',
      name: 'edge of the woods',
      rect: { x: 1760, y: 700, w: 160, h: 170 },
      walkTo: { x: 1790, y: 800 },
      facing: 'right',
      defaultVerb: 'open',
      on: {
        lookat: 'A dark treeline. A path disappears into the woods. Ominous!',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('forest', 'fromMountain');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('forest', 'fromMountain');
        },
      },
    },
    {
      id: 'canteen',
      name: 'canteen',
      rect: { x: 470, y: 806, w: 44, h: 34 },
      walkTo: { x: 492, y: 828 },
      facing: 'down',
      defaultVerb: 'pickup',
      visible: (state) => !state.getFlag('canteenTaken'),
      on: {
        lookat: 'A canteen someone left in the grass. Finders keepers.',
        pickup: async (ctx) => {
          ctx.setFlag('canteenTaken');
          ctx.addItem('canteen');
          ctx.repaint();
        },
      },
    },
    // Pia — talk to recruit her; give her the canteen for a reward. Once she
    // joins, a plain click switches to her and she can carry her own items.
    {
      id: 'pia',
      name: 'Pia',
      actor: 'pia',
      defaultVerb: 'talkto',
      on: {
        lookat: 'A fellow climber, admiring the view and guarding the summit.',
        talkto: async (ctx) => {
          if (!ctx.flag('piaJoined')) {
            await ctx.say('pia', 'Made it! Took you long enough.');
            await ctx.playerSay('Who are you?');
            await ctx.say('pia', "Pia. I climb things. Want a partner? Two explorers, twice the reach.");
            await ctx.playerSay('Sure — welcome aboard.');
            ctx.setFlag('piaJoined');
            ctx.addToParty('pia');
            await ctx.say('pia', 'Click my portrait (or press 2) to take over. Oh — and I am parched.');
          } else if (!ctx.flag('piaThanked')) {
            await ctx.say('pia', 'Still parched. Got anything to drink up here?');
          } else {
            await ctx.say('pia', 'Best climb all week. Onward, partner.');
          }
        },
      },
      onItem: {
        give: {
          canteen: async (ctx) => {
            ctx.removeItem('canteen');
            ctx.sfx('pickup');
            await ctx.say('pia', 'Water! You beautiful genius.');
            await ctx.wait(300);
            ctx.setFlag('piaThanked');
            ctx.addItem('medal'); // she rewards whoever handed it over
            await ctx.say('pia', "Here — the summit medal. You earned half of it.");
            await ctx.playerSay('...Which half?');
            await ctx.say('pia', 'The heavy half.');
          },
        },
      },
    },
    {
      id: 'mansion-door',
      name: 'front door',
      rect: { x: 84, y: 634, w: 96, h: 160 },
      walkTo: { x: 140, y: 805 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The door back inside, where the oxygen lives.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('stairhall', 'fromOutside');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('stairhall', 'fromOutside');
        },
      },
    },
    {
      id: 'flag',
      name: 'summit flag',
      rect: { x: 1300, y: 215, w: 90, h: 95 },
      walkTo: { x: 1320, y: 300 },
      facing: 'up',
      on: {
        lookat: "Someone beat me up here. The flag just says 'FIRST'. Smug.",
        pickup: "It's wedged between two rocks and a century of spite.",
        pull: 'It flies for all of us now. Mostly for whoever planted it.',
      },
    },
    {
      id: 'vista',
      name: 'the view',
      rect: { x: 900, y: 60, w: 500, h: 145 },
      walkTo: { x: 1150, y: 300 },
      facing: 'left',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('Behold: geography.');
          await ctx.zoomCamera(0.5, 1400);
          await ctx.wait(1300);
          await ctx.zoomCamera(1, 1000);
          await ctx.playerSay('Worth every switchback.');
        },
      },
    },
    {
      id: 'trail',
      name: 'trail',
      polygon: [
        { x: 1180, y: 790 },
        { x: 1430, y: 620 },
        { x: 1500, y: 655 },
        { x: 1250, y: 790 },
      ],
      on: {
        lookat: 'A switchback trail. Designed by a sadist with a protractor.',
      },
    },
  ],
};
