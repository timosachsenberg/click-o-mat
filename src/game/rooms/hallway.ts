import type { RoomDef } from '../../engine/types';
import type { GameState } from '../../engine/GameState';

function plantX(state: GameState): number {
  return state.getFlag('plantMoved') ? 790 : 700;
}

export const hallwayRoom: RoomDef = {
  id: 'hallway',
  name: 'Hall of Science',

  paint(g, state) {
    // Wall & floor
    g.fillStyle = '#5a4a5e';
    g.fillRect(0, 0, 960, 300);
    g.fillStyle = '#4a3c4e';
    g.fillRect(0, 232, 960, 8);
    g.fillStyle = '#5e6b58';
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
    g.fillStyle = '#332a36';
    g.fillRect(0, 294, 960, 8);

    // Door back to the lab
    g.fillStyle = '#3a2c20';
    g.fillRect(34, 124, 96, 184);
    g.fillStyle = '#7a5838';
    g.fillRect(42, 132, 80, 176);
    g.strokeStyle = '#5a4430';
    g.lineWidth = 2;
    g.strokeRect(52, 146, 60, 70);
    g.strokeRect(52, 226, 60, 70);
    g.fillStyle = '#d4b430';
    g.beginPath();
    g.arc(114, 226, 4, 0, Math.PI * 2);
    g.fill();

    // Window
    g.fillStyle = '#2c3a50';
    g.fillRect(180, 90, 120, 90);
    g.fillStyle = '#7ba4c8';
    g.fillRect(186, 96, 108, 78);
    g.strokeStyle = '#2c3a50';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(240, 96);
    g.lineTo(240, 174);
    g.moveTo(186, 135);
    g.lineTo(294, 135);
    g.stroke();
    g.fillStyle = '#e8e8f0';
    g.beginPath(); // a cloud
    g.arc(215, 115, 8, 0, Math.PI * 2);
    g.arc(226, 112, 10, 0, Math.PI * 2);
    g.arc(237, 116, 7, 0, Math.PI * 2);
    g.fill();

    // Sign
    g.fillStyle = '#33281c';
    g.fillRect(430, 96, 200, 52);
    g.fillStyle = '#e8dcb8';
    g.fillRect(436, 102, 188, 40);
    g.fillStyle = '#33281c';
    g.font = 'bold 20px monospace';
    g.fillText('HALL OF SCIENCE', 442, 128);

    // Key on the floor, revealed once the plant has been pushed aside
    if (state.getFlag('plantMoved') && !state.getFlag('keyTaken')) {
      g.strokeStyle = '#e6c860';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(682, 410, 4, 0, Math.PI * 2);
      g.moveTo(686, 410);
      g.lineTo(700, 410);
      g.moveTo(696, 410);
      g.lineTo(696, 414);
      g.stroke();
    }
  },

  walkArea: [
    { x: 60, y: 312 },
    { x: 900, y: 312 },
    { x: 930, y: 445 },
    { x: 30, y: 445 },
  ],
  holes: (state) => {
    const x = plantX(state);
    return [
      [
        { x: x - 26, y: 404 },
        { x: x + 26, y: 404 },
        { x: x + 26, y: 428 },
        { x: x - 26, y: 428 },
      ],
    ];
  },
  scaling: { yTop: 312, scaleTop: 0.72, yBottom: 445, scaleBottom: 1.05 },

  walkBehinds: [
    {
      key: 'plant',
      x: 620,
      y: 316,
      w: 260,
      h: 120,
      depthY: 424,
      draw(g, state) {
        const x = plantX(state) - 620;
        // Pot
        g.fillStyle = '#a05a30';
        g.beginPath();
        g.moveTo(x - 24, 74);
        g.lineTo(x + 24, 74);
        g.lineTo(x + 17, 108);
        g.lineTo(x - 17, 108);
        g.closePath();
        g.fill();
        g.fillStyle = '#7e4624';
        g.fillRect(x - 26, 70, 52, 9);
        // Bush
        g.fillStyle = '#3e7a38';
        for (const [dx, dy, r] of [
          [0, 40, 26],
          [-20, 55, 18],
          [20, 55, 18],
          [-12, 28, 16],
          [14, 26, 15],
          [0, 14, 14],
        ]) {
          g.beginPath();
          g.arc(x + dx, dy, r, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#57a04e';
        for (const [dx, dy, r] of [
          [-8, 34, 9],
          [12, 44, 8],
          [2, 20, 7],
        ]) {
          g.beginPath();
          g.arc(x + dx, dy, r, 0, Math.PI * 2);
          g.fill();
        }
      },
    },
  ],

  entries: {
    fromLab: { x: 110, y: 345, facing: 'down' },
  },

  hotspots: [
    {
      id: 'labdoor',
      name: 'lab door',
      rect: { x: 34, y: 124, w: 96, h: 184 },
      walkTo: { x: 90, y: 334 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The door back to the lab.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('lab', 'fromHallway');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('lab', 'fromHallway');
        },
      },
    },
    {
      id: 'window',
      name: 'window',
      rect: { x: 180, y: 90, w: 120, h: 90 },
      walkTo: { x: 240, y: 334 },
      facing: 'up',
      on: {
        lookat: 'Outside: weather. Inconclusive.',
        open: "It's painted shut. Science demands a controlled climate.",
      },
    },
    {
      id: 'sign',
      name: 'sign',
      rect: { x: 430, y: 96, w: 200, h: 52 },
      walkTo: { x: 530, y: 334 },
      facing: 'up',
      on: {
        lookat: "'HALL OF SCIENCE.' The sign seems trustworthy.",
        pull: "It's screwed into the wall, and I respect that about it.",
      },
    },
    {
      id: 'plant-moved',
      name: 'potted plant',
      rect: { x: 742, y: 330, w: 96, h: 100 },
      walkTo: { x: 730, y: 428 },
      facing: 'right',
      visible: (state) => !!state.getFlag('plantMoved'),
      on: {
        lookat: 'A ficus. Possibly plastic. Definitely judging me.',
        push: "It's fine where it is now.",
        pull: "No. We've both moved on.",
      },
    },
    {
      id: 'plant',
      name: 'potted plant',
      rect: { x: 652, y: 330, w: 96, h: 100 },
      walkTo: { x: 640, y: 428 },
      facing: 'right',
      visible: (state) => !state.getFlag('plantMoved'),
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('A ficus. Possibly plastic. Definitely judging me.');
          await ctx.playerSay('Is something glinting behind it?');
        },
        push: async (ctx) => {
          await ctx.playerSay('Hnnngh...!');
          ctx.setFlag('plantMoved');
          ctx.repaint();
          ctx.sfx('step');
          await ctx.playerSay('There. And hey — something shiny was hiding back there!');
        },
        pull: "Pushing feels more dignified. Let me push it.",
        pickup: "It's heavier than my ambitions.",
      },
    },
    {
      id: 'key',
      name: 'small key',
      rect: { x: 664, y: 396, w: 48, h: 28 },
      walkTo: { x: 636, y: 420 },
      facing: 'right',
      defaultVerb: 'pickup',
      visible: (state) => !!state.getFlag('plantMoved') && !state.getFlag('keyTaken'),
      on: {
        lookat: 'A small brass key, dusty from its life behind a ficus.',
        pickup: async (ctx) => {
          ctx.setFlag('keyTaken');
          ctx.addItem('key');
          ctx.repaint();
        },
      },
    },
  ],
};
