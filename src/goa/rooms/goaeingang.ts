import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { GATE_CROWD, GATE_CROWD_FRAMES, GE, goaEingangBg } from '../art/goaeingang';

// ---- layout ----------------------------------------------------------------------
// The Goa's entrance, deep in the forest — seen from outside only by those
// the bouncer threw off the dance floor (the wormhole lands in the middle of
// it) or who walk out. In the middle the gate, the bouncer — a Goazwerg in a felt sauna hat — in front of it: here the password Chakabunga
// is finally needed. Flaschenfloh is already here, collecting empties. Past
// the bouncer and through the gate, the party goes on — in the next chapter.
//
// State: `goaEntered` (the bouncer let you in), `chapterDone` (through the gate).

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

const BOUNCER = P(560, 360);
const BOUNCER_SPOT = P(470, 372);
const FLOH = P(790, 352);
const GATE_SPOT = P(560, 340);

async function toForest(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('waldrand', 'wald');
}

async function throughTheGate(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('goaEntered')) {
    await ctx.say('tuersteher', 'Moment, Kollege. Erst die Parole.');
    return;
  }
  await ctx.once('throughGate', async () => {
    await ctx.playerSay('Folge dem Bass.');
  });
  await ctx.goToRoom('goa', 'eingang');
}

const HOTSPOTS: HotspotDef[] = [
  at('wald', 'Wald', R(0, 60, 960, 250), P(480, 400), 'up', {
    on: { lookat: 'Tiefer Wald, Vollmond, und überall wummert es. Genau so hab ich mir das vorgestellt.' },
  }),
  at('pilze', 'Leuchtpilze', R(296, 228, 110, 96), P(350, 352), 'up', {
    on: {
      lookat: 'Pilze, so groß wie Stehlampen. Und sie leuchten auch so. Schon der Eingang ist ein Versprechen.',
      pickup: 'Die stehen hier als Wegbeleuchtung. Und der Goazwerg guckt.',
    },
  }),
  at('faeden', 'Schwarzlicht-Fäden', R(262, 20, 160, 200), P(350, 352), 'up', {
    on: { lookat: 'Leuchtende Fäden, vom Baum zum Tor gespannt. Jeder einzelne gerade, alle zusammen eine Kurve.' },
  }),
  at('wegweiser', 'Wegweiser', R(662, 258, 92, 44), P(700, 352), 'up', {
    on: { lookat: '„MAINFLOOR“ geradeaus. „CHAI · CHILL“ irgendwo links. Erst mal Mainfloor.' },
  }),
  at('toWald', 'Zurück in den Wald', R(0, 300, 70, 146), P(36, 410), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Ein Trampelpfad durch den Wald, zurück zur Absperrung. Von dieser Seite ist sie kein Hindernis.',
      use: toForest,
      open: toForest,
    },
  }),
  at('mond', 'Mond', R(786, 36, 70, 70), P(700, 400), 'up', {
    on: { lookat: 'Vollmond. Wie auf dem Flyer versprochen. Die Goa hält, was sie verspricht.' },
  }),
  at('tor', 'Eingang', R(GE.gate.x0 - 24, GE.gate.top - 60, GE.gate.x1 - GE.gate.x0 + 48, GE.ground - GE.gate.top + 60), GATE_SPOT, 'up', {
    defaultVerb: 'use',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Ein Tor aus Bambus, Tücher in allen Neonfarben, ein Mandala obendrauf.');
        await ctx.playerSay('Dahinter: Lichter, Laser, Bass. Die Goa.');
      },
      use: throughTheGate,
      open: throughTheGate,
    },
  }),
  {
    id: 'tuersteher',
    name: 'Goazwerg',
    actor: 'tuersteher',
    walkTo: BOUNCER_SPOT,
    facing: 'right',
    defaultVerb: 'talkto',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Türsteher ist ein Goazwerg. Geht mir bis zum Knie. Rauschebart, Batikhemd, Sonnenbrille bei Nacht.');
        await ctx.playerSay('Und eine Saunamütze aus Filz, tief ins Gesicht gezogen. Mit aufgesticktem Fliegenpilz.');
      },
      talkto: async (ctx) => {
        if (ctx.flag('goaEntered')) {
          await ctx.say('tuersteher', 'Na los, rein mit dir. Der Bass wartet nicht.');
          return;
        }
        await ctx.say('tuersteher', 'Abend. Parole?');
        await ctx.dialog('tuersteher');
      },
      push: 'Einen Goazwerg schubst man nicht. Der steht fester als das Tor.',
      pickup: 'Einstecken? Er ist klein genug. Aber er guckt, als hätte das schon mal einer versucht. Und bereut.',
    },

  },
  {
    id: 'floh',
    name: 'Flaschenfloh',
    actor: 'floh',
    walkTo: P(FLOH.x - 70, FLOH.y + 10),
    facing: 'right',
    defaultVerb: 'talkto',
    on: {
      lookat: 'Flaschenfloh. Schon hier, mit zwei Tüten voller Leergut. Wie macht der das?',
      talkto: async (ctx) => {
        await ctx.playerSay('Flaschenfloh? Wie kommst du denn hierher?');
        if (ctx.flag('flohFollows')) {
          await ctx.say('floh', 'Ich bin dir doch gefolgt. Ganz unauffällig. Mit zwanzig Metern Abstand. Klirr.');
          await ctx.playerSay('Durch ein Wurmloch?');
          await ctx.say('floh', 'Pfandsammler kennen jeden Weg. Auch die krummen.');
        } else {
          await ctx.say('floh', 'Wo Leergut ist, da bin ich. Und auf einer Goa ist viel Leergut.');
        }
        await ctx.say('floh', 'Geh ruhig rein. Ich bleib hier draußen. Hier ist das Geschäft.');
      },
    },
  },
];

export const goaEingangRoom: RoomDef = {
  id: 'goaeingang',
  name: 'Goa-Eingang',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: goaEingangBg() },
    // The party, glimpsed through the gate: dancers stomping in time.
    { id: 'gatecrowd', depth: Layer.BEHIND, x: GATE_CROWD.x, y: GATE_CROWD.y, anim: 'goa-gatecrowd' },
    { id: 'light', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: '<rect width="960" height="450" fill="#2a1a6a"/>', alpha: 0.2 },
  ],

  walkArea: [P(30, 340), P(940, 336), P(940, 446), P(30, 446)],
  holes: [[P(BOUNCER.x - 26, BOUNCER.y - 8), P(BOUNCER.x + 26, BOUNCER.y - 8), P(BOUNCER.x + 26, BOUNCER.y + 8), P(BOUNCER.x - 26, BOUNCER.y + 8)]],
  scaling: { yTop: 336, scaleTop: 0.92, yBottom: 446, scaleBottom: 1.16 },

  music: 'goa-theme',

  assets: {
    svgImages: GATE_CROWD_FRAMES,
    anims: [{ key: 'goa-gatecrowd', textures: GATE_CROWD_FRAMES.map((f) => f.key), frameRate: 4000 / 856 }],
  },

  entries: {
    // Back out of the Goa, through the gate.
    tor: { x: 660, y: 356, facing: 'left' },
    // On foot from the edge of the forest.
    wald: { x: 80, y: 410, facing: 'right' },
  },

  actors: [
    { id: 'tuersteher', x: BOUNCER.x, y: BOUNCER.y, facing: 'left' },
    { id: 'floh', x: FLOH.x, y: FLOH.y, facing: 'left' },
  ],

  async onEnter(ctx) {
    await ctx.once('goaArrival', async () => {
      await ctx.playerSay('Das Tor. Von außen. So rum war das eigentlich gedacht.');
      await ctx.say('floh', ctx.flag('goaEntered') ? 'Na, frische Luft schnappen? Klirr.' : 'Na, rausgeflogen? Klirr. Passiert den Besten.');
      if (!ctx.flag('goaEntered')) await ctx.say('tuersteher', 'Erst Parole, dann Tor. Nicht erst Loch, dann Tanzfläche.');
    });
  },

  ambients: [
    {
      // The Goazwerg bobs along with the bass. He'd deny it.
      every: [30, 90],
      run: async (ctx) => {
        const z = ctx.actor('tuersteher').sprite;
        const y0 = ctx.actor('tuersteher').y;
        for (let i = 0; i < 4; i++) {
          await ctx.tween(z, { y: y0 - 3, ease: 'Quad.easeOut' }, 110, { skippable: false });
          await ctx.tween(z, { y: y0, ease: 'Quad.easeIn' }, 318, { skippable: false });
        }
      },
    },
    {
      // Flaschenfloh makes his rounds: from bottle to bottle, and back.
      every: [5000, 9000],
      run: async (ctx) => {
        if (ctx.busy) return;
        const spots: Array<[number, number]> = [[770, 404], [836, 380], [700, 420], [FLOH.x, FLOH.y]];
        const [x, y] = spots[Math.floor(Math.random() * spots.length)];
        await ctx.walkTo('floh', x, y);
        ctx.face('floh', 'down');
      },
    },
    {
      // Flaschenfloh, at work.
      every: [9000, 16000],
      run: async (ctx) => {
        if (ctx.busy) return;
        const lines = ['Klirr.', 'Noch eine Grüne. Wunderbar.', 'Raver trinken viel Wasser. Aus Pfandflaschen. Ich liebe Raver.'];
        await ctx.say('floh', lines[Math.floor(Math.random() * lines.length)]);
      },
    },
  ],

  hotspots: HOTSPOTS,
};
