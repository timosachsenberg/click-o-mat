import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { DB, SPIT_FRAMES, doenerBg, smell } from '../art/doener';
import { OTTO_ACTOR } from '../art/turm';

// ---- layout ----------------------------------------------------------------------
// The street between the Picasso (stairs down on the left) and the
// Epplehaus (right). In the middle: a döner stand. It has no puzzle — it's
// there to smell good when you walk past (an ambient notices the player in
// front of the counter and says a line in passing).
// The döner man is a voice behind the counter (drawn into the backdrop; an
// invisible actor speaks for him).

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

const COUNTER_SPOT = P(480, 356);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** The smell gets you once per visit, not on every step. */
let sniffed = false;

async function toPicasso(ctx: ScriptContext): Promise<void> {
  ctx.sfx('open');
  await ctx.goToRoom('picasso', 'door');
}

async function toEpplehaus(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('epplehaus', 'doener');
}

const HOTSPOTS: HotspotDef[] = [
  at('haeuser', 'Altstadthäuser', R(0, 0, 960, 120), P(480, 380), 'up', {
    on: { lookat: 'Altstadthäuser. In den Küchen brennt Licht, und keiner kocht. Wozu auch, mit dem Döner unten.' },
  }),
  at('bude', 'Dönerbude', R(DB.kiosk.x - 16, DB.kiosk.y - 34, DB.kiosk.w + 32, 64), COUNTER_SPOT, 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('„Neckar-Kebap“. Seit Jahrzehnten an derselben Ecke. Älter als manche Fakultät.');
        await ctx.playerSay('Und es riecht ... himmlisch.');
      },
    },
  }),
  at('spiess', 'Dönerspieß', R(DB.spit.x, DB.spit.y, DB.spit.w, DB.spit.h), COUNTER_SPOT, 'up', {
    on: {
      lookat: 'Der Spieß dreht sich langsam und glänzt. Ich schau lieber nicht zu lange hin, sonst werd ich schwach.',
      pickup: 'Den ganzen Spieß? Der Mann hat ein langes Messer. Und Erfahrung.',
    },
  }),
  at('karte', 'Speisekarte', R(DB.kiosk.x + DB.kiosk.w - 58, DB.kiosk.y + 44, 52, 112), COUNTER_SPOT, 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Döner 7,50. Dürüm 8,00. Ayran 2,50.');
        await ctx.playerSay(ctx.hasItem('euro') ? 'Meine zwei Euro reichen nicht mal für den Ayran.' : 'Und ich hab genau gar nichts.');
      },
    },
  }),
  {
    id: 'doenermann',
    name: 'Dönermann',
    rect: R(DB.counter.x + 170, DB.counter.y + 20, 60, 68),
    walkTo: COUNTER_SPOT,
    facing: 'up',
    defaultVerb: 'talkto',
    on: {
      lookat: 'Der Dönermann. Weiße Mütze, mächtiger Schnurrbart, das Messer immer in Bewegung.',
      talkto: async (ctx) => {
        await ctx.playerSay('Guten Abend!');
        await ctx.say('doenermann', pick(['Einmal mit alles, mein Freund?', 'Mit scharf? Mit Zwiebel? Mit Liebe?', 'Heute Abend Goa im Wald? Dann brauchst du Kraft! Döner!']));
        await ctx.playerSay(ctx.hasItem('euro') ? 'Ich hab nur zwei Euro. Und die brauch ich für was anderes.' : 'Ich bin leider pleite.');
        await ctx.say('doenermann', pick(['Dann riech wenigstens. Riechen ist umsonst.', 'Komm wieder, wenn du reich bist. Ich bin immer da.']));
      },
    },
    onItem: {
      give: {
        euro: async (ctx) => {
          await ctx.say('doenermann', 'Zwei Euro? Dafür kriegst du eine Zwiebel. Eine halbe.');
          await ctx.playerSay('Dann behalt ich sie lieber.');
        },
      },
    },
  },
  at('tische', 'Stehtische', R(DB.tables[0] - 36, DB.ground - 40, DB.tables[1] - DB.tables[0] + 72, 90), P(760, 380), 'up', {
    on: {
      lookat: 'Stehtische mit Serviettenspendern. Und einem einsamen Zwiebelring.',
      pickup: 'Der Zwiebelring hat schon bessere Zeiten gesehen. Und mehrere Tauben.',
    },
  }),
  at('toPicasso', 'Treppe zum Picasso', R(DB.cellar.x - 10, DB.cellar.y - 50, DB.cellar.w + 20, DB.cellar.h + 50), P(88, 348), 'up', {
    defaultVerb: 'use',
    on: {
      lookat: 'Die Kellertreppe runter ins Picasso. Die Leuchtschrift flackert hier draußen genauso wie drinnen.',
      use: toPicasso,
      open: toPicasso,
    },
  }),
  at('toEpplehaus', 'Zum Epplehaus', R(930, 140, 30, 306), P(940, 400), 'right', {
    defaultVerb: 'use',
    on: {
      lookat: 'Da lang geht’s zum Epplehaus.',
      use: toEpplehaus,
      open: toEpplehaus,
    },
  }),
];

export const doenerRoom: RoomDef = {
  id: 'doener',
  name: 'Dönerbude',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: doenerBg() },
    { id: 'spit', depth: Layer.BEHIND, x: DB.spit.x, y: DB.spit.y, anim: 'doener-spit' },
    { id: 'smell', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: smell(), alpha: 0.6 },
  ],

  walkArea: [P(20, 342), P(940, 342), P(940, 444), P(20, 444)],
  holes: DB.tables.map((tx) => [P(tx - 20, DB.ground + 38), P(tx + 20, DB.ground + 38), P(tx + 20, DB.ground + 48), P(tx - 20, DB.ground + 48)]),
  scaling: { yTop: 340, scaleTop: 0.94, yBottom: 446, scaleBottom: 1.2 },

  music: 'epple-theme',

  assets: {
    svgImages: SPIT_FRAMES,
    anims: [{ key: 'doener-spit', textures: SPIT_FRAMES.map((f) => f.key), frameRate: 5 }],
    svgActors: [OTTO_ACTOR],
  },

  entries: {
    picasso: { x: 96, y: 354, facing: 'down' },
    epplehaus: { x: 920, y: 400, facing: 'left' },
  },

  actors: [{ id: 'doenermann', x: DB.counter.x + 200, y: DB.counter.y + 62, facing: 'down' }],

  async onEnter() {
    sniffed = false;
  },

  ambients: [
    {
      // Walk past the stand and the smell gets you — once per visit, without
      // stopping you (a line said in passing, not a cutscene).
      every: [250, 400],
      run: async (ctx) => {
        if (sniffed || ctx.busy) return;
        const p = ctx.player;
        if (p.x < DB.counter.x - 20 || p.x > DB.counter.x + DB.counter.w + 20) return;
        sniffed = true;
        await ctx.playerSay(
          pick([
            'Mmmh. Dieser Duft. Knoblauchsoße, gegrilltes Fleisch, frisches Fladenbrot.',
            'Oh nein. Der Döner-Geruch. Nicht hinschauen. Weitergehen.',
            'Riecht das gut. Mein Magen knurrt lauter als der Bass im Wald.',
            'Ich könnte jetzt ... nein. Zwei Euro. Konzentration.',
          ])
        );
      },
    },
    {
      // The smell drifts up and fades, again and again.
      every: [200, 400],
      run: async (ctx) => {
        const s = ctx.layerObj('smell');
        s.setPosition(0, 10).setAlpha(0);
        await ctx.tween(s, { y: -18, alpha: 0.7, ease: 'Sine.easeOut' }, 1400);
        await ctx.tween(s, { y: -40, alpha: 0, ease: 'Sine.easeIn' }, 1400);
      },
    },
  ],

  hotspots: HOTSPOTS,
};
