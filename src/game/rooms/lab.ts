import { Layer, type RoomDef } from '../../engine/types';
import type { GameState } from '../../engine/GameState';

function paintLabBg(g: CanvasRenderingContext2D, state: GameState): void {
    // Wall & floor
    g.fillStyle = '#46586a';
    g.fillRect(0, 0, 960, 300);
    g.fillStyle = '#38475a';
    g.fillRect(0, 232, 960, 8); // wainscot rail
    g.fillStyle = '#6b5a48';
    g.fillRect(0, 300, 960, 150);
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = 310 + i * 26;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(960, y);
      g.stroke();
    }
    g.fillStyle = '#2e3a48';
    g.fillRect(0, 294, 960, 8); // baseboard

    // Poster
    g.fillStyle = '#e8e0c8';
    g.fillRect(100, 52, 80, 100);
    g.strokeStyle = '#8a2020';
    g.lineWidth = 3;
    g.strokeRect(100, 52, 80, 100);
    g.fillStyle = '#4fae4a';
    g.beginPath();
    g.arc(140, 92, 16, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#333333';
    g.font = 'bold 10px monospace';
    g.fillText('OBEY THE', 116, 124);
    g.fillText('TENTACLE', 116, 136);

    // ZAP-O-MATIC machine
    g.fillStyle = '#7a8290';
    g.fillRect(60, 160, 140, 150);
    g.fillStyle = '#5a626e';
    g.fillRect(72, 178, 116, 80);
    g.fillStyle = '#22262c';
    g.fillRect(80, 186, 100, 64); // dark chamber window
    g.fillStyle = state.getFlag('machinePowered') ? '#57e05a' : '#d04040';
    g.beginPath();
    g.arc(90, 280, 7, 0, Math.PI * 2); // power lamp
    g.fill();
    g.fillStyle = '#c8ccd4';
    g.font = 'bold 11px monospace';
    g.fillText('ZAP-O-MATIC', 96, 172);
    g.strokeStyle = '#22262c';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(160, 280, 10, 0, Math.PI * 2); // dial
    g.moveTo(160, 280);
    g.lineTo(166, 273);
    g.stroke();

    // Table (against the wall, feet above the walkable floor)
    g.fillStyle = '#5a4030';
    g.fillRect(388, 254, 10, 50);
    g.fillRect(552, 254, 10, 50);
    g.fillStyle = '#7a5838';
    g.fillRect(380, 240, 190, 16);

    // Battery on the table
    if (!state.getFlag('batteryTaken')) {
      g.fillStyle = '#d4b430';
      g.fillRect(452, 226, 26, 14);
      g.fillStyle = '#888888';
      g.fillRect(478, 229, 5, 8);
    }

    // Wall cabinet
    if (state.getFlag('cabinetOpen')) {
      g.fillStyle = '#3a2c20';
      g.fillRect(620, 180, 100, 110); // interior
      g.fillStyle = '#5a4430';
      g.fillRect(624, 240, 92, 6); // shelf
      if (!state.getFlag('hamsterTaken')) {
        g.fillStyle = '#b07840';
        g.beginPath();
        g.ellipse(668, 232, 14, 9, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#111111';
        g.beginPath();
        g.arc(660, 229, 1.5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#8a6a48'; // open door leaf
      g.fillRect(720, 180, 14, 110);
    } else {
      g.fillStyle = '#8a6a48';
      g.fillRect(620, 180, 100, 110);
      g.strokeStyle = '#5a4430';
      g.lineWidth = 2;
      g.strokeRect(620, 180, 100, 110);
      g.beginPath();
      g.moveTo(670, 180);
      g.lineTo(670, 290);
      g.stroke();
      g.fillStyle = '#33281c';
      g.beginPath();
      g.arc(664, 238, 3, 0, Math.PI * 2); // keyhole
      g.fill();
    }

    // Door to the hallway
    g.fillStyle = '#3a2c20';
    g.fillRect(834, 124, 96, 184);
    g.fillStyle = '#7a5838';
    g.fillRect(842, 132, 80, 176);
    g.strokeStyle = '#5a4430';
    g.lineWidth = 2;
    g.strokeRect(852, 146, 60, 70);
    g.strokeRect(852, 226, 60, 70);
    g.fillStyle = '#d4b430';
    g.beginPath();
    g.arc(850, 226, 4, 0, Math.PI * 2); // knob
    g.fill();
}

/** The floor lamp, in local coords of its 70×225 layer canvas. */
function paintLabLamp(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#2e3a48';
  g.beginPath();
  g.ellipse(32, 212, 22, 8, 0, 0, Math.PI * 2); // base
  g.fill();
  g.fillRect(29, 36, 7, 176); // pole
  g.fillStyle = '#c8b060';
  g.beginPath();
  g.moveTo(12, 40);
  g.lineTo(52, 40);
  g.lineTo(44, 6);
  g.lineTo(20, 6);
  g.closePath();
  g.fill(); // shade
}

export const labRoom: RoomDef = {
  id: 'lab',
  name: "Dr. Fred's Lab Annex",

  layers: [
    { id: 'bg', depth: Layer.BEHIND, paint: paintLabBg },
    // Occluder: actors whose feet are above y=342 render behind the lamp.
    { id: 'lamp', depth: 342, x: 270, y: 128, w: 70, h: 225, paint: paintLabLamp },
  ],

  walkArea: [
    { x: 70, y: 312 },
    { x: 920, y: 312 },
    { x: 940, y: 445 },
    { x: 25, y: 445 },
  ],
  holes: [
    // Floor lamp base (a walk-behind prop)
    [
      { x: 285, y: 322 },
      { x: 318, y: 322 },
      { x: 318, y: 348 },
      { x: 285, y: 348 },
    ],
    // Ned the tentacle
    [
      { x: 722, y: 395 },
      { x: 768, y: 395 },
      { x: 768, y: 418 },
      { x: 722, y: 418 },
    ],
  ],
  scaling: { yTop: 312, scaleTop: 0.72, yBottom: 445, scaleBottom: 1.05 },

  music: 'lab-theme',

  entries: {
    start: { x: 480, y: 410, facing: 'down' },
    fromHallway: { x: 866, y: 345, facing: 'down' },
  },

  actors: [{ id: 'tent', x: 745, y: 405, facing: 'down' }],

  async onEnter(ctx) {
    if (ctx.flag('introDone')) return;
    ctx.setFlag('introDone');
    await ctx.wait(400);
    await ctx.playerSay('Okay. Weird lab, weird smell, giant talking tentacle.');
    await ctx.playerSay('Tuesday, then.');
  },

  hotspots: [
    {
      id: 'poster',
      name: 'poster',
      rect: { x: 100, y: 52, w: 80, h: 100 },
      walkTo: { x: 140, y: 325 },
      facing: 'up',
      on: {
        lookat: "'OBEY THE TENTACLE.' Bold marketing strategy.",
        pull: "It's glued on. Aggressively.",
        push: "It's a poster. It has no moving parts.",
      },
    },
    {
      id: 'machine',
      name: 'Zap-O-Matic',
      rect: { x: 60, y: 160, w: 140, h: 150 },
      walkTo: { x: 150, y: 332 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          if (ctx.flag('machinePowered')) {
            await ctx.playerSay('The Zap-O-Matic is humming. The power light is green.');
          } else {
            await ctx.playerSay('A ZAP-O-MATIC 3000. The power light is dark.');
            await ctx.playerSay('Looks like it takes a battery. A suspiciously ordinary battery.');
          }
        },
        open: 'Better not. The warranty voids if you even look at the screws.',
        use: "I'm not sticking my hand in there.",
        pull: "It's bolted down, like everything fun in this lab.",
      },
      onItem: {
        use: {
          battery: async (ctx) => {
            ctx.removeItem('battery');
            ctx.setFlag('machinePowered');
            ctx.repaint();
            ctx.sfx('zap');
            ctx.flash(0xaaffaa, 250);
            await ctx.playerSay('The battery slots right in. The machine shudders awake.');
            await ctx.playerSay("That's either progress or a war crime.");
          },
          hamster: async (ctx) => {
            if (!ctx.flag('machinePowered')) {
              await ctx.playerSay('The machine has no power. The hamster looks relieved.');
              return;
            }
            await ctx.playerSay('In you go, little guy. For science.');
            ctx.sfx('zap');
            ctx.shake(400, 0.012);
            ctx.flash(0xaaffaa, 400);
            await ctx.wait(500);
            ctx.removeItem('hamster');
            ctx.addItem('glowhamster');
            await ctx.playerSay('He... glows now. And he seems fine? Great, even?');
          },
          glowhamster: 'Once was enough. He is still vibrating.',
        },
      },
    },
    {
      id: 'lamp',
      name: 'floor lamp',
      rect: { x: 278, y: 134, w: 52, h: 212 },
      walkTo: { x: 260, y: 350 },
      facing: 'right',
      on: {
        lookat: 'A floor lamp. It has seen things.',
        use: "There's no switch. Spooky.",
        push: "It's bolted to the floor.",
        pull: "It's bolted to the floor. Symmetrically.",
      },
    },
    {
      id: 'table',
      name: 'table',
      rect: { x: 380, y: 238, w: 190, h: 66 },
      walkTo: { x: 470, y: 332 },
      facing: 'up',
      on: {
        lookat: 'A sturdy lab table. Scorch marks included at no extra cost.',
      },
    },
    {
      id: 'battery',
      name: 'battery',
      rect: { x: 446, y: 220, w: 40, h: 24 },
      walkTo: { x: 466, y: 332 },
      facing: 'up',
      defaultVerb: 'pickup',
      visible: (state) => !state.getFlag('batteryTaken'),
      on: {
        lookat: 'A 9-volt battery, just lying on the table like bait.',
        pickup: async (ctx) => {
          ctx.setFlag('batteryTaken');
          ctx.addItem('battery');
          ctx.repaint();
        },
      },
    },
    {
      id: 'cabinet',
      name: 'wall cabinet',
      rect: { x: 620, y: 180, w: 100, h: 110 },
      walkTo: { x: 665, y: 332 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: async (ctx) => {
          if (!ctx.flag('cabinetOpen')) {
            await ctx.playerSay('A wall cabinet with a sturdy little lock.');
          } else if (!ctx.flag('hamsterTaken')) {
            await ctx.playerSay('Dusty shelves. Current occupancy: one (1) hamster.');
          } else {
            await ctx.playerSay('Empty now. The hamster left no forwarding address.');
          }
        },
        open: async (ctx) => {
          if (ctx.flag('cabinetOpen')) await ctx.playerSay("It's already open.");
          else {
            ctx.sfx('deny');
            await ctx.playerSay('Locked. Naturally.');
          }
        },
        close: async (ctx) => {
          if (ctx.flag('cabinetOpen')) await ctx.playerSay('I might still need it open.');
          else await ctx.playerSay("It's as closed as it gets.");
        },
      },
      onItem: {
        use: {
          key: async (ctx) => {
            if (ctx.flag('cabinetOpen')) {
              await ctx.playerSay("It's already open.");
              return;
            }
            ctx.setFlag('cabinetOpen');
            ctx.repaint();
            ctx.sfx('open');
            await ctx.playerSay('The key fits! And there is... a hamster?');
          },
        },
      },
    },
    {
      id: 'hamster',
      name: 'hamster',
      rect: { x: 645, y: 215, w: 50, h: 40 },
      walkTo: { x: 665, y: 332 },
      facing: 'up',
      defaultVerb: 'pickup',
      visible: (state) => !!state.getFlag('cabinetOpen') && !state.getFlag('hamsterTaken'),
      on: {
        lookat: 'A fat, judgmental hamster living in a locked cabinet. Sure.',
        pickup: async (ctx) => {
          ctx.setFlag('hamsterTaken');
          ctx.addItem('hamster');
          ctx.repaint();
          await ctx.playerSay("Come here, fuzzball. You have a destiny.");
        },
        talkto: 'He stares back. Volumes are spoken. None aloud.',
      },
    },
    {
      id: 'door',
      name: 'hallway door',
      rect: { x: 834, y: 124, w: 96, h: 184 },
      walkTo: { x: 876, y: 334 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'A door leading to the hallway.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('hallway', 'fromLab');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('hallway', 'fromLab');
        },
        close: "It's already closed. Doors are binary like that.",
      },
    },
    {
      id: 'tent',
      name: 'Ned the Tentacle',
      // Live-bound hotspot (he doesn't move, but this stays correct if he
      // ever does — and he turns to face whoever addresses him).
      actor: 'tent',
      defaultVerb: 'talkto',
      on: {
        lookat: 'A green tentacle. Friendly, in a boneless sort of way.',
        talkto: async (ctx) => {
          await ctx.dialog('tent-chat');
        },
        push: 'He would jiggle, and we would both be embarrassed.',
        pickup: "He's a tentacle, not a souvenir.",
      },
      onItem: {
        use: {
          battery: "He's not battery operated. I asked.",
          hamster: "He's not a tool. He's a tentacle.",
        },
        give: {
          battery: async (ctx) => {
            await ctx.say('tent', "No hands. Also: not fuzzy. ZERO of my criteria met.");
          },
          hamster: async (ctx) => {
            await ctx.say('tent', 'Cute! Warm! Fuzzy! But not radioactive. I have STANDARDS.');
            await ctx.playerSay('Everyone’s a critic.');
          },
          glowhamster: async (ctx) => {
            ctx.removeItem('glowhamster');
            await ctx.say('tent', 'A glowing hamster! Warm! Fuzzy! RADIOACTIVE!');
            ctx.sfx('win');
            ctx.flash(0xffffaa, 500);
            await ctx.say('tent', 'You are my hero. My squishy, opposable-thumbed hero.');
            await ctx.playerSay("All in a day's work.");
            ctx.setFlag('gameWon');
            ctx.showTitle('THE END\n(of the demo)');
          },
        },
      },
    },
  ],
};
