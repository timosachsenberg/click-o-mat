import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { DB, KNIFE, KNIFE_FRAMES, SPIT_FRAMES, doenerBg, openGlow, smell } from '../art/doener';
import { PIGEON_ACTORS } from '../art/epplehaus';
import { VOICE_ACTOR } from '../art/turm';

// ---- layout ----------------------------------------------------------------------
// The street between the Picasso (stairs down on the right) and the
// Epplehaus (left). In the middle: a döner stand. It redeems the full stamp
// card for a döner; otherwise it's there to smell good when you walk past (an ambient notices the player in
// front of the counter and says a line in passing).
// The döner man is a voice behind the counter (drawn into the backdrop; an
// invisible actor speaks for him).

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

const COUNTER_SPOT = P(480, 356);
/** Beside the döner man, so the player doesn't stand in front of him. */
const MAN_SPOT = P(DB.counter.x + 128, 352);
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

/** Ten stamps, one free döner. */
async function redeemCard(ctx: ScriptContext): Promise<void> {
  ctx.removeItem('stempelkarte');
  await ctx.say('doenermann', 'Zehn Stempel! Voll! Mein Freund, du bist Stammkunde!');
  await ctx.playerSay('Äh ... ja. Seit Jahren.');
  await ctx.say('doenermann', 'Einmal Döner gratis. Mit alles? Mit alles.');
  ctx.sfx('pickup');
  ctx.addItem('doener');
  await ctx.say('doenermann', 'Guten Appetit! Und bis zur nächsten Karte!');
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
  at('theke', 'Theke', R(DB.counter.x - 10, DB.counter.y + DB.counter.h - 8, DB.counter.w + 20, 18), COUNTER_SPOT, 'up', {
    on: { lookat: 'Die Theke. Blitzblank, bis auf einen einsamen Soßenfleck.' },
    onItem: { use: { stempelkarte: redeemCard } },
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
        await ctx.playerSay('Ganz unten, klein: „Stempelkarte voll? Döner gratis!“');
      },
    },
  }),
  {
    id: 'doenermann',
    name: 'Dönermann',
    rect: R(DB.counter.x + 170, DB.counter.y + 20, 60, 68),
    walkTo: MAN_SPOT,
    facing: 'right',
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
        stempelkarte: redeemCard,
      },
      use: { stempelkarte: redeemCard },
    },
  },
  at('tische', 'Stehtische', R(DB.tables[0] - 36, DB.ground - 40, DB.tables[1] - DB.tables[0] + 72, 90), P(180, 380), 'up', {
    on: {
      lookat: 'Stehtische mit Serviettenspendern. Und einem einsamen Zwiebelring.',
      pickup: 'Der Zwiebelring hat schon bessere Zeiten gesehen. Und mehrere Tauben.',
    },
  }),
  {
    id: 'doenertaube',
    name: 'Taube',
    actor: 'doenertaube',
    walkTo: P(DB.tables[1] + 56, 372),
    facing: 'left',
    on: {
      lookat: 'Eine Taube auf dem Stehtisch. Sie arbeitet sich an einem Zwiebelring ab. Mit Hingabe.',
      talkto: async (ctx) => {
        await ctx.playerSay('Schmeckt’s?');
        await ctx.say('doenertaube', 'Gurr.');
      },
      pickup: 'Die lässt ihren Zwiebelring nicht los. Und ich will keinen Streit.',
    },
  },
  at('katze', 'Katze', R(704, 136, 44, 22), P(760, 380), 'up', {
    on: { lookat: 'Eine schwarze Katze auf dem Fensterbrett. Sie beobachtet die Taube. Die Taube beobachtet den Zwiebelring. Kreislauf des Lebens.' },
  }),
  at('balkon', 'Balkon', R(188, 160, 86, 40), P(240, 380), 'up', {
    on: { lookat: 'Ein Balkon mit Wäscheleine. Vier Socken, keine zwei gleich. Hier wohnen Studenten.' },
  }),
  at('toPicasso', 'Treppe zum Picasso', R(DB.cellar.x - 10, DB.cellar.y - 50, DB.cellar.w + 20, DB.cellar.h + 50), P(DB.cellar.x + 39, 348), 'up', {
    defaultVerb: 'use',
    on: {
      lookat: 'Die Kellertreppe runter ins Picasso. Die Leuchtschrift flackert hier draußen genauso wie drinnen.',
      use: toPicasso,
      open: toPicasso,
    },
  }),
  at('toEpplehaus', 'Zum Epplehaus', R(0, 140, 30, 306), P(22, 400), 'left', {
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
    { id: 'knife', depth: Layer.BEHIND, x: KNIFE.x, y: KNIFE.y, anim: 'doener-knife' },
    { id: 'open', depth: Layer.BEHIND, x: 0, y: 0, w: 960, h: 450, svg: openGlow() },
    { id: 'light', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: '<rect width="960" height="450" fill="#c0507a"/>', alpha: 0.1 },
    { id: 'smell', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: smell(), alpha: 0.6 },
  ],

  walkArea: [P(20, 342), P(940, 342), P(940, 444), P(20, 444)],
  holes: DB.tables.map((tx) => [P(tx - 20, DB.ground + 38), P(tx + 20, DB.ground + 38), P(tx + 20, DB.ground + 48), P(tx - 20, DB.ground + 48)]),
  scaling: { yTop: 340, scaleTop: 0.94, yBottom: 446, scaleBottom: 1.2 },

  music: 'epple-theme',

  assets: {
    svgImages: [...SPIT_FRAMES, ...KNIFE_FRAMES],
    anims: [
      { key: 'doener-spit', textures: SPIT_FRAMES.map((f) => f.key), frameRate: 5 },
      { key: 'doener-knife', textures: KNIFE_FRAMES.map((f) => f.key), frameRate: 3 },
    ],
    svgActors: [VOICE_ACTOR, ...PIGEON_ACTORS],
  },

  entries: {
    picasso: { x: DB.cellar.x + 39, y: 354, facing: 'down' },
    epplehaus: { x: 44, y: 400, facing: 'right' },
  },

  actors: [
    // (An invisible voice: its feet are placed so the speech sits just above the drawn man's cap.)
    { id: 'doenermann', x: DB.counter.x + 200, y: DB.counter.y + 134, facing: 'down' },
    // A pigeon on the standing table, working on the lonely onion ring.
    { id: 'doenertaube', x: DB.tables[1] + 6, y: DB.ground - 20, facing: 'left' },
  ],

  async onEnter() {
    sniffed = false;
  },

  ambients: [
    {
      // The OPEN sign's neon flickers, as neon does.
      every: [1400, 4200],
      run: async (ctx) => {
        const o = ctx.layerObj('open');
        for (const a of [0.2, 1, 0.4, 1]) await ctx.tween(o, { alpha: a }, 70, { skippable: false });
      },
    },
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
            'Riecht das gut. Mein Magen meldet sich. Lautstark.',
            'Ich könnte jetzt ... nein. Konzentration.',
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
        await ctx.tween(s, { y: -18, alpha: 0.7, ease: 'Sine.easeOut' }, 1400, { skippable: false });
        await ctx.tween(s, { y: -40, alpha: 0, ease: 'Sine.easeIn' }, 1400, { skippable: false });
      },
    },
  ],

  hotspots: HOTSPOTS,
};
