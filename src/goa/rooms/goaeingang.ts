import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { GE, goaEingangBg, portal } from '../art/goaeingang';

// ---- layout ----------------------------------------------------------------------
// The Goa's entrance, deep in the forest: the wormhole spits the player out
// on the left (and stays open — the way back to the Hölderlinturm). In the
// middle the gate, the bouncer — a Goazwerg in a felt sauna hat — in front of it: here the password Chakabunga
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
const GATE_SPOT = P(560, 336);

async function throughTheGate(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('goaEntered')) {
    await ctx.say('tuersteher', 'Moment, Kollege. Erst die Parole.');
    return;
  }
  await ctx.playerSay('Folge dem Bass.');
  ctx.sfx('win');
  ctx.setFlag('chapterDone');
  ctx.showTitle('FORTSETZUNG FOLGT …');
}

async function backThroughWormhole(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Zurück durchs Wurmloch. Festhalten.');
  ctx.sfx('zap');
  ctx.flash(0xb06aff, 300);
  await ctx.goToRoom('hoelderlinturm', 'door');
}

const HOTSPOTS: HotspotDef[] = [
  at('wald', 'Wald', R(0, 60, 960, 250), P(480, 400), 'up', {
    on: { lookat: 'Tiefer Wald, Vollmond, und überall wummert es. Genau so hab ich mir das vorgestellt.' },
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
  at('wurmloch', 'Wurmloch', R(GE.portal.x - GE.portal.rx, GE.portal.y - GE.portal.ry, GE.portal.rx * 2, GE.portal.ry * 2), P(200, 392), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Das Wurmloch, aus dem ich gefallen bin. Es dreht sich noch. Zurück zum Hölderlinturm geht’s also auch.',
      use: backThroughWormhole,
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
    onItem: {
      give: {
        euro: async (ctx) => {
          await ctx.say('tuersteher', 'Zwei Euro? Hier kommt man mit Parole rein, nicht mit Kleingeld.');
        },
        doener: async (ctx) => {
          await ctx.say('tuersteher', 'Bestechung mit Döner? Fast. Aber Zwerge essen nur Pilze.');
        },
        muetze: async (ctx) => {
          await ctx.say('tuersteher', 'Eine Burschenmütze? Nee. Ich trag nur Filz. Saunamütze. Hält den Kopf kühl, wenn der Bass heiß läuft.');
        },
      },
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
    {
      id: 'portal',
      depth: Layer.BEHIND,
      x: GE.portal.x - GE.portal.rx,
      y: GE.portal.y - GE.portal.ry,
      w: GE.portal.rx * 2,
      h: GE.portal.ry * 2,
      svg: `<g transform="translate(${GE.portal.rx - GE.portal.x} ${GE.portal.ry - GE.portal.y})">${portal()}</g>`,
    },
  ],

  walkArea: [P(30, 340), P(940, 336), P(940, 446), P(30, 446)],
  holes: [[P(BOUNCER.x - 26, BOUNCER.y - 8), P(BOUNCER.x + 26, BOUNCER.y - 8), P(BOUNCER.x + 26, BOUNCER.y + 8), P(BOUNCER.x - 26, BOUNCER.y + 8)]],
  scaling: { yTop: 336, scaleTop: 0.92, yBottom: 446, scaleBottom: 1.16 },

  music: 'goa-theme',

  entries: {
    wurmloch: { x: 200, y: 392, facing: 'right' },
  },

  actors: [
    { id: 'tuersteher', x: BOUNCER.x, y: BOUNCER.y, facing: 'left' },
    { id: 'floh', x: FLOH.x, y: FLOH.y, facing: 'left' },
  ],

  async onEnter(ctx) {
    await ctx.once('goaArrival', async () => {
      ctx.flash(0xb06aff, 400);
      ctx.shake(400, 0.015);
      await ctx.wait(500);
      await ctx.playerSay('Uff. Das war ... schnell.');
      await ctx.playerSay('Bass! Lichter! Laser! Ich bin da. Ich bin wirklich da.');
      await ctx.say('floh', ctx.flag('flohFollows') ? 'Da bist du ja endlich! Klirr.' : 'Na, auch hier? Klirr.');
      await ctx.playerSay('Und wer bist du? Ein ... Gartenzwerg?');
      await ctx.say('tuersteher', 'Goazwerg. Türsteher. Und das ist eine Saunamütze, bevor du fragst.');
      await ctx.say('tuersteher', 'Du kommst aus einem Wurmloch. Respekt. Trotzdem: ohne Parole kein Einlass.');
    });
  },

  ambients: [
    {
      // The wormhole keeps turning.
      every: [10, 50],
      run: async (ctx) => {
        const p = ctx.layerObj('portal');
        if (p.originX !== 0.5) p.setOrigin(0.5).setPosition(GE.portal.x, GE.portal.y);
        await ctx.tween(p, { angle: p.angle + 360 }, 6000, { skippable: false });
      },
    },
    {
      // Flaschenfloh, at work.
      every: [9000, 16000],
      run: async (ctx) => {
        if (ctx.busy) return;
        const lines = ['Klirr.', 'Noch eine Grüne. Wunderbar.', 'Ravers trinken viel Wasser. Aus Pfandflaschen. Ich liebe Ravers.'];
        await ctx.say('floh', lines[Math.floor(Math.random() * lines.length)]);
      },
    },
  ],

  hotspots: HOTSPOTS,
};
