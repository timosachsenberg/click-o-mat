import { Layer, type Facing, type HotspotDef, type LayerDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { INK, defs, ellipse, glow, grainDefs, grainOverlay, group, inked, line, linear, path, poly, rect, vignette } from '../../game/art/toon';
import {
  PAL,
  acUnit,
  column,
  discoBall,
  djBooth,
  duct,
  exitDoor,
  flyer,
  heartStool,
  highTable,
  metalShelf,
  navyStool,
  neonSign,
  picassoPainting,
  slotMachine,
  tileFloor,
  wallClock,
  wcDoor,
  whiteboard,
} from '../art/props';

// ---- layout ----------------------------------------------------------------------
// The Picasso, a basement bar (after the concept art in issue #5). Left: the
// toilet door up two steps, the DJ booth under a disco ball, the stairs out.
// Centre: a row of slot machines. Right: the counter runs diagonally from
// the back left into the room, with Ali behind it in front of the lit back
// bar, and the Partykiller on a bar stool in front of it.
//
// Depth: the counter is one occluder (baseline 375) — Ali stands behind it
// at y=362, everybody else stays in front of its diagonal face (the walk
// area follows it). The bar stools, the front column and the front table
// are occluders at their feet.

const SCALING = { yTop: 300, scaleTop: 0.9, yBottom: 445, scaleBottom: 1.22 };
const scaleAt = (y: number) =>
  SCALING.scaleTop +
  (SCALING.scaleBottom - SCALING.scaleTop) * Math.max(0, Math.min(1, (y - SCALING.yTop) / (SCALING.yBottom - SCALING.yTop)));
/** Bar stools are sized so the Partykiller's seated hips meet the seat. */
const stoolScale = (y: number) => 0.647 * scaleAt(y);

/** The toilet landing: up two steps, so the player keeps the size they had
 *  at the bottom step instead of shrinking into the distance. */
const WC = { x0: 14, x1: 110, sill: 276, floor: 330 };
const onSteps = (x: number, y: number) => x < WC.x1 && y < WC.floor;

/** A layer whose art is drawn in room coordinates (translated into place). */
function roomLayer(id: string, depth: number, x: number, y: number, w: number, h: number, art: string): LayerDef {
  return { id, depth, x, y, w, h, svg: group(art, `translate(${-x} ${-y})`) };
}

function picassoBg(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(41),
      linear('pcWall', 0, 30, 0, 300, [
        [0, '#9a4e2a'],
        [0.35, PAL.wall1],
        [0.8, '#eaa444'],
        [1, '#b8642a'],
      ]),
      linear('pcCeil', 0, 0, 0, 50, [
        [0, PAL.ceil0],
        [1, PAL.ceil1],
      ])
    )
  );
  s.push(rect(0, 0, 960, 304, { fill: 'url(#pcWall)' }));
  s.push(glow('pcWallHot', 520, 190, 360, '#ffe08a', 0.35, 140));
  s.push(inked(poly([[-10, -10], [970, -10], [970, 36], [-10, 54]]), 'url(#pcCeil)', 3));
  s.push(path('M-10 60L970 42', { stroke: PAL.wallShade, sw: 10, opacity: 0.5 }));
  s.push(tileFloor(300, 450, 960, 31));
  s.push(rect(0, 294, 960, 10, { fill: '#3a1e3a', stroke: INK, sw: 2 }));

  // Left: clock, toilet up two steps, DJ booth under the disco ball, flyer.
  s.push(wallClock(158, 96, 17));
  s.push(wcDoor(26, 68, 134, WC.sill, WC.floor));
  s.push(flyer(192, 128, 48, 60));
  s.push(djBooth(150, 132, 300));
  s.push(discoBall(216, 52, 82, 14));
  // Back column, the stairs out, the air conditioner, the drinks board.
  s.push(column(306, 46, 302, 22));
  s.push(exitDoor(332, 148, 58, 152));
  s.push(acUnit(402, 54, 98, 26));
  s.push(whiteboard(398, 150, 116, 70));
  // The genuine Picasso, the neon sign, a row of slot machines.
  s.push(picassoPainting(528, 108, 44, 50));
  s.push(neonSign(668, 158, 22));
  const slots: Array<[string, string]> = [
    ['#5a2a9a', '#ff5ab4'],
    ['#d8602a', '#ffd34a'],
    ['#1e7a6a', '#5ae0a0'],
    ['#a82a3a', '#5ab4ff'],
  ];
  slots.forEach(([body, trim], i) => s.push(slotMachine(520 + i * 58, 186, 54, 114, body, trim, 3 + i * 2)));
  s.push(metalShelf(764, 70, 192, 228, 7));
  s.push(duct([418, 104], [990, 20], 17));

  s.push(glow('pcFloorPool', 560, 380, 300, '#ffc070', 0.22, 60));
  s.push(glow('pcDjPool', 216, 310, 120, '#4ae8ff', 0.18, 30));
  s.push(vignette('pcVig', 960, 450, 0.5, '#1e1040'));
  s.push(grainOverlay(960, 450));
  return s.join('');
}

/** The counter, running from the back left to the front right. */
function picassoCounter(): string {
  const s: string[] = [];
  s.push(defs(linear('pcTop', 0, 304, 0, 360, [[0, '#e08a3a'], [1, '#a8501e']])));
  // End face (left), the planked front, the glossy top.
  s.push(inked(poly([[408, 318], [430, 304], [433, 358], [412, 372]]), PAL.woodDark, 2.5));
  s.push(inked(poly([[408, 318], [960, 360], [960, 446], [412, 372]]), '#9a5226', 3));
  for (let x = 412, i = 0; x <= 960; x += 26, i++) {
    const yb = 372 + ((x - 412) / 548) * 68;
    const yt = 318 + ((x - 408) / 552) * 42 + 6;
    if (i % 2) s.push(path(poly([[x, yt], [x + 26, yt + 2], [x + 26, yb + 3], [x, yb]]), { fill: '#b4642c' }));
    s.push(line([x, yt], [x, yb], '#4e2612', 1.6));
  }
  s.push(path('M412 362L960 432L960 446L412 372Z', { fill: '#2a1020', opacity: 0.55 }));
  s.push(inked('M402 316Q406 304 430 302L962 330L962 362L408 324Q400 322 402 316Z', 'url(#pcTop)', 3));
  s.push(path('M420 310L940 338', { stroke: '#ffd08a', sw: 3, opacity: 0.6 }));
  s.push(glow('pcCounterGlow', 690, 330, 220, '#ffe0a0', 0.3, 22));
  // On the counter: glasses, a bowl of peanuts, a bottle.
  for (const [x, y] of [[860, 344], [874, 346], [888, 347]] as Array<[number, number]>) {
    s.push(inked(`M${x - 4} ${y - 14}h8l-1 14h-6z`, '#d8eef4', 1.4));
  }
  s.push(inked('M926 350V322h8V312h4V322h8V350z', '#8a2a1a', 1.6));
  s.push(rect(927, 330, 18, 8, { fill: '#f4f0e6', stroke: INK, sw: 1 }));
  s.push(ellipse(560, 328, 13, 4, { fill: '#e8dcc0', stroke: INK, sw: 1.4 }));
  s.push(ellipse(560, 325, 9, 2.5, { fill: '#c89a5a' }));
  return s.join('');
}

// ---- scripts ---------------------------------------------------------------------

/** "Ich zeig das an": the Partykiller reacts to petty offences — while awake. */
async function anzeige(ctx: ScriptContext, line: string): Promise<boolean> {
  if (ctx.flag('copAsleep')) return false;
  await ctx.say('cop', line);
  return true;
}

/** The Partykiller drinks the Magic Woman, dances, and sleeps. */
async function giveMagicWoman(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Eine kleine Aufmerksamkeit. Von einem dankbaren Bürger.');
  await ctx.say('cop', 'Ein Geschenk? Das ist Vorteilsannahme.');
  await ctx.wait(500);
  await ctx.say('cop', '...Aber ich bin ja außer Dienst.');
  ctx.removeItem('magicwoman');
  ctx.sfx('open');
  await ctx.wait(700);
  await ctx.say('cop', 'Hm. Schmeckt nach Gummibärchen und Ordnungswidrigkeit.');
  await ctx.wait(400);
  ctx.playMusic('disco-theme');
  await ctx.animate('cop', 'stand', 500);
  const traffic = ctx.animate('cop', 'traffic', 3200);
  await ctx.wait(500);
  await ctx.playerSay('Sieht aus, als würde er eine Kreuzung regeln.');
  await traffic;
  const disco = ctx.animate('cop', 'disco', 3600);
  await ctx.wait(400);
  await ctx.playerSay('Oh. Jetzt kommt die Hüfte dazu.');
  await ctx.playerSay('Und ein überraschend ehrgeiziger Discofinger.');
  await disco;
  await ctx.animate('cop', 'stand', 300);
  ctx.sfx('step');
  ctx.shake(150, 0.004);
  ctx.setFlag('copAsleep');
  await ctx.repaint();
  ctx.playMusic('pub-theme');
  await ctx.wait(900);
  await ctx.say('ali', 'Früher hat er wenigstens noch gewartet, bis die Party vorbei war.');
}

async function leave(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('password')) {
    await ctx.playerSay('Ohne zu wissen, wo die Goa steigt, bringt mir der Wald nichts.');
    await ctx.playerSay('Ali weiß es. Ali weiß alles.');
    return;
  }
  ctx.sfx('open');
  await ctx.playerSay('Folge dem Bass. Chakabunga. Los geht’s!');
  ctx.setFlag('chapterDone');
  ctx.sfx('win');
  ctx.showTitle('FORTSETZUNG FOLGT …');
}

// ---- hotspots --------------------------------------------------------------------

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const P = (x: number, y: number): Vec2 => ({ x, y });

function box(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  return [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
}

const HOTSPOTS: HotspotDef[] = [
  at('wc', 'Klotür', R(20, 128, 80, 148), P(58, 282), 'up', {
    defaultVerb: 'open',
    on: {
      lookat: 'Das Klo. Zwei Stufen rauf. Nach dem dritten Bier sind es gefühlt fünf.',
      open: async (ctx) => {
        ctx.sfx('deny');
        await ctx.playerSay('Klemmt.');
        await ctx.say('ali', 'Fester drücken, mein Lieber. Und dabei „Picasso“ sagen.');
        await ctx.playerSay('Ich muss eh nicht.');
      },
      push: 'Ich muss eh nicht.',
      close: 'Ist zu. Und soll so bleiben.',
    },
  }),
  at('steps', 'Stufen', R(8, 276, 108, 54), P(60, 338), 'up', {
    on: { lookat: 'Zwei Stufen. Der Höhepunkt jeder Nacht im Picasso.' },
  }),
  at('clock', 'Uhr', R(138, 76, 40, 40), P(170, 330), 'up', {
    on: { lookat: 'Kurz vor zwölf. Im Wald geht’s jetzt los.' },
  }),
  at('flyer', 'Flyer', R(188, 124, 56, 68), P(216, 326), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('„GOA IM WALD – Vollmond“. Ort: drei Fragezeichen.');
        await ctx.playerSay('Wer’s wissen muss, weiß es. Ali weiß es.');
      },
      pickup: async (ctx) => {
        if (!(await anzeige(ctx, 'Wildes Plakatieren wird auch beim Abhängen bestraft!'))) {
          await ctx.playerSay('Der bleibt hängen. Für die Nächsten.');
        }
      },
    },
  }),
  at('discoball', 'Discokugel', R(198, 54, 36, 44), P(216, 326), 'up', {
    on: { lookat: 'Eine Discokugel. Dreht sich nur, wenn jemand tanzt. Also nie.' },
  }),
  at('dj', 'DJ-Pult', R(148, 200, 136, 100), P(216, 326), 'up', {
    on: {
      lookat: 'Zwei Plattenspieler, ein Mischpult, Kopfhörer. Hier legte DJ Ali auf. 1994.',
      use: async (ctx) => {
        if (!(await anzeige(ctx, 'Musik nach 22 Uhr? Ruhestörung!'))) {
          await ctx.playerSay('Ohne Platte keine Party. Und die Party ist eh im Wald.');
        }
      },
      pickup: 'Die Kopfhörer kleben fest. Ich frag lieber nicht, womit.',
    },
  }),
  at('column', 'Säule', R(100, 0, 46, 410), P(170, 420), 'left', {
    on: {
      lookat: 'Eine Säule. Antik, sagt Ali. Baumarkt, sagt die Säule.',
      push: 'Die trägt das Haus. Lassen wir das.',
    },
  }),
  at('table', 'Stehtisch', R(0, 330, 96, 118), P(170, 436), 'left', {
    on: { lookat: 'Ein Stehtisch. Für die, die nicht am Tresen sitzen wollen. Also für niemanden.' },
  }),
  at('door', 'Ausgang', R(328, 142, 66, 158), P(362, 322), 'up', {
    defaultVerb: 'open',
    on: {
      lookat: 'Die Treppe rauf, raus in die Nacht. Irgendwo da draußen ist ein Wald.',
      open: leave,
      use: leave,
      close: 'Sie ist zu. Noch.',
    },
  }),
  at('ac', 'Klimaanlage', R(400, 52, 102, 72), P(402, 396), 'up', {
    on: {
      lookat: 'Eine Klimaanlage. Sie bläst warme Luft. Gegen den Willen aller.',
      use: async (ctx) => {
        if (!(await anzeige(ctx, 'Finger weg von der Haustechnik! Ich zeig das an!'))) {
          await ctx.playerSay('Die macht eh, was sie will.');
        }
      },
    },
  }),
  at('board', 'Getränkekarte', R(396, 148, 120, 74), P(402, 396), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Energydrinks, je zwei Euro inklusive Pfand:');
        await ctx.playerSay('Red Cow, Flying Pony und Magic Woman.');
        await ctx.playerSay('Die freie Getränkewahl. Herrlich.');
      },
      pickup: 'Die Karte gehört an die Wand. Sagt die Karte.',
    },
  }),
  at('painting', 'Gemälde', R(520, 100, 60, 66), P(520, 404), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Ein Gesicht, von vorne und von der Seite gleichzeitig.');
        await ctx.say('ali', 'Ein echter Picasso. Deshalb heißt der Laden so.');
        await ctx.playerSay('Signiert mit „P.“ in Kugelschreiber.');
      },
      pickup: async (ctx) => {
        if (!(await anzeige(ctx, 'Kunstraub! Unter meinen Augen!'))) {
          await ctx.playerSay('Ich bin Raver, kein Kunsträuber.');
        }
      },
    },
  }),
  at('neon', 'Leuchtschrift', R(604, 136, 128, 36), P(600, 412), 'up', {
    on: { lookat: '„Picasso“. Das zweite S flackert seit Jahren. Niemand traut sich, es zu reparieren.' },
  }),
  at('slots', 'Spielautomaten', R(518, 184, 234, 116), P(600, 412), 'up', {
    on: {
      lookat: 'Vier Spielautomaten. Sie blinken mich an, als wüssten sie von den zwei Euro.',
      use: async (ctx) => {
        if (ctx.hasItem('euro')) await ctx.playerSay('Die wollen Geld. Ich hab nur die zwei Euro, und die sind verplant.');
        else await ctx.playerSay('Ohne Geld spielen die nicht mit mir.');
      },
      push: async (ctx) => {
        if (!(await anzeige(ctx, 'Gewalt gegen Sachen! Ich zeig das an!'))) {
          await ctx.playerSay('Sie geben nichts her. Typisch.');
        }
      },
    },
    onItem: {
      use: {
        euro: async (ctx) => {
          await ctx.playerSay('Nee. Die zwei Euro verzocke ich nicht.');
          await ctx.playerSay('Die sind für was Wichtiges.');
        },
      },
    },
  }),
  at('shelf', 'Regal', R(758, 62, 202, 238), P(760, 436), 'up', {
    on: {
      lookat: 'Flaschen, Gläser, Einmachgläser mit Unbekanntem. Und kein Energydrink außer Magic Woman.',
      pickup: 'Da komme ich nicht ran. Und das ist auch besser so.',
    },
  }),
  at('counter', 'Tresen', R(408, 304, 552, 56), P(500, 404), 'up', {
    on: { lookat: 'Der Tresen. Klebt an genau den richtigen Stellen.' },
  }),
  at('stool', 'Barhocker', R(504, 334, 38, 66), P(492, 414), 'up', {
    on: {
      lookat: 'Ein Hocker mit Herz in der Lehne. Direkt neben dem Partykiller. Kein Zufall.',
      use: 'Ich setz mich lieber nicht neben ihn. Er nimmt bestimmt Fingerabdrücke.',
    },
  }),
  at('ali', 'Ali', R(696, 236, 50, 84), P(705, 428), 'up', {
    defaultVerb: 'talkto',
    on: {
      lookat: 'Ali. Wirt, Barmann, Seelsorger. Poliert seit 1987 dasselbe Glas.',
      talkto: async (ctx) => {
        await ctx.dialog('ali');
      },
      pickup: 'Ali ist hier eher das Inventar.',
    },
    onItem: {
      give: {
        euro: async (ctx) => {
          await ctx.say('ali', 'Wofür? Erst bestellen, mein Lieber.');
          await ctx.dialog('ali-order');
        },
        magicwoman: async (ctx) => {
          await ctx.say('ali', 'Hab ich dir gerade verkauft. Pfand gibt’s erst, wenn sie leer ist.');
        },
      },
    },
  }),
  at('cop', 'Partykiller', R(612, 280, 58, 132), P(566, 424), 'right', {
    defaultVerb: 'talkto',
    on: {
      lookat: async (ctx) => {
        if (ctx.flag('copAsleep')) {
          await ctx.playerSay('Er schläft. Arme verschränkt, Mütze auf. Schnarcht im Dienstton.');
          return;
        }
        await ctx.playerSay('Der einzige andere Gast. Ein Polizist im Ruhestand, noch in Uniform.');
        if (ctx.flag('knowsPartykiller')) await ctx.playerSay('Der Partykiller. Er zeigt immer noch alles an.');
      },
      talkto: async (ctx) => {
        if (ctx.flag('copAsleep')) {
          await ctx.playerSay('Den weck ich bestimmt nicht.');
          return;
        }
        await ctx.dialog('cop');
      },
      push: async (ctx) => {
        if (!(await anzeige(ctx, 'Körperverletzung! Versuchte! Ich zeig das an!'))) {
          await ctx.playerSay('Bloß nicht. Schlafende Polizisten soll man liegen lassen.');
        }
      },
      pull: async (ctx) => {
        if (!(await anzeige(ctx, 'Widerstand gegen ... äh ... mich!'))) {
          await ctx.playerSay('Bloß nicht. Schlafende Polizisten soll man liegen lassen.');
        }
      },
      pickup: 'Der ist schwerer als er aussieht. Und er sieht schwer aus.',
    },
    onItem: {
      give: {
        euro: async (ctx) => {
          if (await anzeige(ctx, 'Bestechung eines Beamten? Ich zeig das an!')) {
            await ctx.playerSay('Er zeigt wirklich alles an.');
          } else {
            await ctx.playerSay('Der schläft. Und die zwei Euro behalte ich.');
          }
        },
        magicwoman: async (ctx) => {
          if (ctx.flag('copAsleep')) {
            await ctx.playerSay('Der hatte genug.');
            return;
          }
          await giveMagicWoman(ctx);
        },
      },
    },
  }),
];

// ---- room ------------------------------------------------------------------------

export const picassoRoom: RoomDef = {
  id: 'picasso',
  name: 'Picasso',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: picassoBg() },
    roomLayer('counter', 375, 396, 296, 566, 154, picassoCounter()),
    roomLayer('stool', 399, 486, 300, 72, 104, heartStool(522, 398, stoolScale(398), true)),
    // His stool is turned round: he sits facing the room, the backrest behind him.
    roomLayer('copStool', 412, 600, 300, 82, 118, heartStool(640, 413, stoolScale(413), false)),
    roomLayer('stool3', 441, 766, 326, 86, 120, heartStool(808, 440, stoolScale(440), true)),
    roomLayer('stool4', 450, 886, 330, 74, 120, heartStool(930, 449, stoolScale(449), true)),
    roomLayer('frontColumn', 428, 66, -6, 116, 438, column(122, -4, 428, 40)),
    roomLayer('frontTable', 447, -16, 330, 150, 120, highTable(40, 447, 352, 48) + navyStool(100, 449, 0.86)),
  ],

  walkArea: [
    { x: 14, y: 330 },
    { x: 18, y: WC.sill + 2 },
    { x: 98, y: WC.sill + 2 },
    { x: 108, y: 316 },
    { x: 386, y: 316 },
    { x: 396, y: 386 },
    { x: 940, y: 446 },
    { x: 14, y: 446 },
  ],
  holes: [
    box(100, 414, 144, 430), // front column
    box(14, 434, 126, 446), // front table + stool
    box(504, 390, 540, 404), // stools at the counter
    box(618, 402, 662, 420),
    box(788, 428, 828, 446),
  ],
  // Perspective, except on the toilet steps: there the player climbs rather
  // than walks away from us, so they keep their size.
  scaling: (x, y) => scaleAt(onSteps(x, y) ? WC.floor : y),

  music: 'pub-theme',

  entries: {
    start: { x: 300, y: 420, facing: 'right' },
    door: { x: 362, y: 326, facing: 'down' },
  },

  actors: [
    { id: 'ali', x: 720, y: 362, facing: 'down' },
    { id: 'cop', x: 640, y: 413, facing: 'down' },
  ],

  async onEnter(ctx) {
    if (ctx.flag('introDone')) return;
    ctx.setFlag('introDone');
    await ctx.wait(400);
    await ctx.playerSay('Das Picasso. Wenn einer weiß, wo heute die Goa im Wald steigt, dann Ali.');
    await ctx.playerSay('Zwei Euro hab ich noch. Das muss reichen.');
  },

  ambients: [
    {
      // The Partykiller keeps a running commentary on everybody's misdeeds.
      every: [9000, 16000],
      run: async (ctx) => {
        if (ctx.busy || ctx.flag('copAsleep')) return;
        const lines = [
          'Ruhestörung ab 22 Uhr. Ich notier mir das.',
          'Die Automaten da hängen nicht ordnungsgemäß.',
          'Falsch geparkt, draußen. Ich hab’s im Gefühl.',
          'Ich hab mehr Partys beendet als ihr besucht habt.',
        ];
        await ctx.say('cop', lines[Math.floor(Math.random() * lines.length)]);
      },
    },
  ],

  hotspots: HOTSPOTS,
};
