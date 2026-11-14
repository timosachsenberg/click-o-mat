import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { EP, PIGEON_ACTORS, epplehausBg } from '../art/epplehaus';

// ---- layout ----------------------------------------------------------------------
// The forecourt of the Epplehaus, between the Picasso and the Neckarbrücke:
// the cellar stairs down to the bar on the left, the street on to the
// bridge on the right, the graffiti-covered house in between. Flaschenfloh,
// the bottle collector, stands by the bottle banks next to his trolley.
//
// The pigeons are actors (so they can be looked at, talked to, shooed):
// an ambient sends one of them strolling every second or so, and any the
// player comes close to scurries off. All of that is transient staging.

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

/** Where everybody walks: the cobbles in front of the house. */
const FLOOR = { x0: 20, x1: 940, y0: 342, y1: 444 };
const FLOH = P(556, 352);

// ---- the pigeons -------------------------------------------------------------------

const PIGEONS: Array<{ id: string; x: number; y: number; facing: Facing }> = [
  { id: 'taube1', x: 210, y: 366, facing: 'right' },
  { id: 'taube2', x: 300, y: 412, facing: 'left' },
  { id: 'taube3', x: 392, y: 356, facing: 'right' },
  { id: 'taube4', x: 470, y: 430, facing: 'left' },
  { id: 'taube5', x: 540, y: 388, facing: 'right' },
  { id: 'taube6', x: 730, y: 380, facing: 'left' },
  { id: 'taube7', x: 806, y: 424, facing: 'right' },
  { id: 'taube8', x: 150, y: 428, facing: 'right' },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Send a pigeon towards a point (not awaited: they stroll on their own). */
function send(ctx: ScriptContext, id: string, x: number, y: number): void {
  void ctx.walkTo(id, clamp(x, FLOOR.x0 + 10, FLOOR.x1 - 10), clamp(y, FLOOR.y0 + 4, FLOOR.y1 - 4)).catch(() => {});
}

/** A pigeon scurries away from a point. */
function flee(ctx: ScriptContext, id: string, from: Vec2): void {
  const a = ctx.actor(id);
  const dx = a.x - from.x || 1;
  const dy = a.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const far = 110 + Math.random() * 70;
  send(ctx, id, a.x + (dx / len) * far, a.y + (dy / len) * far * 0.6 + (Math.random() - 0.5) * 40);
}

async function pigeonLife(ctx: ScriptContext): Promise<void> {
  const player = ctx.player;
  let fled = false;
  for (const p of PIGEONS) {
    const a = ctx.actor(p.id);
    if (Math.hypot(a.x - player.x, (a.y - player.y) * 1.6) < 62) {
      flee(ctx, p.id, player);
      fled = true;
    }
  }
  if (fled) return;
  // Otherwise one of them wanders a few steps, pecking its way across the yard.
  const p = pick(PIGEONS);
  const a = ctx.actor(p.id);
  send(ctx, p.id, a.x + (Math.random() - 0.5) * 220, a.y + (Math.random() - 0.5) * 70);
}

const pigeonHotspot = (id: string): HotspotDef => ({
  id,
  name: 'Taube',
  actor: id,
  on: {
    lookat: async (ctx) => {
      await ctx.playerSay(
        pick([
          'Eine Taube. Die eigentlichen Hausbesetzer vom Epplehaus.',
          'Eine Stadttaube. Kennt jeden Krümel hier persönlich.',
          'Sie guckt mich an, als hätte ich Pommes dabei. Hab ich nicht.',
        ])
      );
    },
    talkto: async (ctx) => {
      await ctx.playerSay('Na, du?');
      await ctx.say(id, pick(['Gurr.', 'Gurruu.', 'Ruckediguh.']));
    },
    pickup: async (ctx) => {
      flee(ctx, id, ctx.player);
      await ctx.playerSay('Zu schnell. Und will ich die wirklich in der Tasche haben?');
    },
    push: async (ctx) => {
      flee(ctx, id, ctx.player);
      await ctx.playerSay('Ksch!');
    },
  },
  onItem: {
    use: {
      stuhlbein: 'Die Holzwürmer wären ein Festmahl für sie. Aber die Würmer brauch ich noch.',
    },
    give: {
      stuhlbein: 'Die Holzwürmer wären ein Festmahl für sie. Aber die Würmer brauch ich noch.',
      magicwoman: 'Energydrink für Tauben? Die sind schon nervös genug.',
    },
  },
});

// ---- scripts ---------------------------------------------------------------------

async function toPicasso(ctx: ScriptContext): Promise<void> {
  ctx.sfx('open');
  await ctx.goToRoom('picasso', 'door');
}

async function toNeckar(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('neckar', 'picasso');
}

/** Flaschenfloh guards his trolley. */
async function handsOff(ctx: ScriptContext): Promise<void> {
  await ctx.say('floh', 'Finger weg von meiner Altersvorsorge!');
}

// ---- hotspots --------------------------------------------------------------------

const HOTSPOTS: HotspotDef[] = [
  at('haus', 'Epplehaus', R(EP.x0, EP.eaves, EP.x1 - EP.x0, 94), P(480, 350), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Das Epplehaus. Selbstverwaltetes Jugendzentrum seit 1972.');
        await ctx.playerSay('Hier hab ich mein erstes Konzert gesehen. Und mein Gehör zum ersten Mal verloren.');
      },
    },
  }),
  at('dach', 'Dach', R(EP.x0 - 20, 0, EP.x1 - EP.x0 + 40, EP.eaves), P(480, 350), 'up', {
    on: { lookat: 'Tauben auf dem First, Tauben auf dem Sims. Das Plenum der Tauben tagt offenbar öffentlich.' },
  }),
  at('graffiti', 'Graffiti', R(EP.x0, 168, EP.x1 - EP.x0, 136), P(320, 346), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Graffiti bis unters Fensterbrett. „EPPLE“, „ÄKTSCHN“, „1972“.');
        await ctx.playerSay('Und „KEIN BASS IST ILLEGAL“. Das sollte man dem Partykiller mal zeigen.');
      },
      use: 'Ohne Sprühdose? Ich könnte höchstens was mit dem Finger in den Dreck malen.',
      pickup: 'Das ist drangesprüht. Und Kulturgut.',
    },
  }),
  at('banner', 'Bettlaken', R(390, 148, 180, 40), P(480, 350), 'up', {
    on: {
      lookat: '„EPPLEHAUS“, mit Edding auf ein Bettlaken. Hängt da, seit ich denken kann. Dasselbe Laken.',
      pickup: 'Das hängt zu hoch. Und irgendwer vermisst es bestimmt als Bettlaken.',
    },
  }),
  at('tuer', 'Tür', R(EP.door.x - 8, EP.door.y - 8, EP.door.w + 16, EP.door.h + 24), P(480, 346), 'up', {
    defaultVerb: 'open',
    on: {
      lookat: 'Die Tür vom Epplehaus. Mehr Aufkleber als Tür. Dahinter brennt Licht.',
      open: async (ctx) => {
        ctx.sfx('deny');
        await ctx.playerSay('Zu. Am Türrahmen klebt ein Zettel:');
        await ctx.playerSay('„Heute Plenum. Dauert, bis alle einverstanden sind. Also lang.“');
      },
      use: 'Klopfen bringt nichts. Beim Plenum hört keiner zu. Dem Plenum auch nicht.',
      close: 'Ist zu. Bis das Plenum fertig ist.',
    },
  }),
  at('raeder', 'Fahrräder', R(EP.bikes.x, EP.bikes.y, EP.bikes.w, EP.bikes.h), P(310, 346), 'up', {
    on: {
      lookat: 'Zwei Fahrräder am Ständer. Beide mit drei Schlössern. Wir sind hier schließlich in Tübingen.',
      pickup: 'Fahrraddiebstahl? Dann hab ich den Partykiller für immer am Hals.',
      use: 'Sind abgeschlossen. Dreifach.',
    },
  }),
  at('altglas', 'Altglascontainer', R(EP.banks.x, EP.banks.y, EP.banks.w, EP.banks.h), P(740, 346), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Grünglas, Weißglas, Braunglas. Daneben stehen zwei Pfandflaschen.');
        await ctx.say('floh', 'Pfand gehört daneben! Das ist ein Gesetz der Straße.');
      },
      pickup: async (ctx) => {
        await ctx.say('floh', 'Die zwei da sind reserviert. Für mich.');
      },
      open: 'Da kommt man nur von oben rein. Und nicht wieder raus.',
    },
    onItem: {
      use: {
        dose: async (ctx) => {
          await ctx.say('floh', 'Halt! Dosen gehören nicht ins Altglas. Und auf der ist Pfand!');
          await ctx.playerSay('Stimmt. Die bring ich lieber zurück.');
        },
        magicwoman: 'Die ist noch voll. Und kein Glas.',
      },
    },
  }),
  at('wagen', 'Einkaufswagen', R(EP.trolley.x, EP.trolley.y - 10, EP.trolley.w + 14, EP.trolley.h + 10), P(676, 346), 'left', {
    on: {
      lookat: 'Ein Einkaufswagen voller Tüten voller Flaschen. Es klirrt schon beim Hinsehen.',
      pickup: handsOff,
      push: handsOff,
      pull: handsOff,
      use: handsOff,
    },
  }),
  at('wegweiser', 'Wegweiser', R(EP.sign.x - 6, EP.sign.y, 98, 50), P(880, 348), 'up', {
    on: { lookat: '„Neckarbrücke“ nach rechts. Und: „Wald 4 km“. Der Bass ist also schon ausgeschildert.' },
  }),
  at('lichterkette', 'Lichterkette', R(EP.x1 + 4, 110, 70, 84), P(820, 348), 'up', {
    on: { lookat: 'Eine Lichterkette, vom Haus zum Wegweiser gespannt. Jede zweite Birne brennt. Reicht.' },
  }),
  at('toPicasso', 'Treppe zum Picasso', R(EP.cellar.x - 10, EP.cellar.y - 50, EP.cellar.w + 20, EP.cellar.h + 50), P(88, 346), 'up', {
    defaultVerb: 'use',
    on: {
      lookat: 'Die Kellertreppe runter ins Picasso. Die Leuchtschrift flackert hier draußen genauso wie drinnen.',
      use: toPicasso,
      open: toPicasso,
    },
  }),
  at('toNeckar', 'Zur Neckarbrücke', R(900, 250, 60, 196), P(932, 400), 'right', {
    defaultVerb: 'use',
    on: {
      lookat: 'Da vorne ist die Neckarbrücke. Dahinter irgendwo: der Wald.',
      use: toNeckar,
      open: toNeckar,
    },
  }),
  {
    id: 'floh',
    name: 'Flaschenfloh',
    actor: 'floh',
    walkTo: P(FLOH.x - 76, FLOH.y + 8),
    facing: 'right',
    defaultVerb: 'talkto',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Flaschenfloh. Sammelt Pfandflaschen, seit es Pfand gibt.');
        await ctx.playerSay('Bommelmütze, Parka, und ein Blick für alles, was klirrt.');
      },
      talkto: async (ctx) => {
        await ctx.dialog('floh');
      },
      pickup: 'Er sammelt. Er wird nicht gesammelt.',
      push: 'Lieber nicht. Wer weiß, was dann alles klirrt.',
    },
    onItem: {
      give: {
        dose: async (ctx) => {
          await ctx.say('floh', 'Magic Woman? Die nimmt kein Automat der Welt. Zu lila.');
          await ctx.say('floh', 'Die nimmt nur einer zurück: Ali. Fünfundzwanzig Cent. Ehrensache.');
          await ctx.playerSay('Gut zu wissen.');
        },
        magicwoman: async (ctx) => {
          await ctx.say('floh', 'Voll? Ich handel nur mit leer. Erst austrinken, dann reden wir.');
        },
        euro: async (ctx) => {
          await ctx.say('floh', 'Almosen? Ich bin Unternehmer! Behalt dein Geld und gib mir lieber deine Flaschen.');
        },
        cent25: async (ctx) => {
          await ctx.say('floh', 'Ein Fünfundzwanziger! Selten. Aber geschenkt nehm ich nichts. Ich hab Prinzipien. Und Pfand.');
        },
        stuhlbein: async (ctx) => {
          await ctx.say('floh', 'Holz? Da ist kein Pfand drauf. Und es knuspert. Nimm das weg.');
        },
        muetze: async (ctx) => {
          await ctx.say('floh', 'Eine Burschenmütze! Die Burschen trinken aus Krügen. Kein Pfand. Kulturlos.');
          await ctx.say('floh', 'Behalt sie. Bei mir würde sie nur nach Bier riechen. Also wie vorher.');
        },
      },
    },
  },
  ...PIGEONS.map((p) => pigeonHotspot(p.id)),
];

// ---- room ------------------------------------------------------------------------

export const epplehausRoom: RoomDef = {
  id: 'epplehaus',
  name: 'Epplehaus',

  layers: [{ id: 'bg', depth: Layer.BEHIND, svg: epplehausBg() }],

  walkArea: [P(FLOOR.x0, FLOOR.y0), P(FLOOR.x1, FLOOR.y0), P(FLOOR.x1, FLOOR.y1), P(FLOOR.x0, FLOOR.y1)],
  holes: [[P(FLOH.x - 22, FLOH.y - 6), P(FLOH.x + 22, FLOH.y - 6), P(FLOH.x + 22, FLOH.y + 6), P(FLOH.x - 22, FLOH.y + 6)]],
  scaling: { yTop: 340, scaleTop: 0.94, yBottom: 446, scaleBottom: 1.2 },

  music: 'epple-theme',

  assets: { svgActors: PIGEON_ACTORS },

  entries: {
    picasso: { x: 96, y: 352, facing: 'down' },
    neckar: { x: 910, y: 400, facing: 'left' },
  },

  actors: [{ id: 'floh', x: FLOH.x, y: FLOH.y, facing: 'down' }, ...PIGEONS],

  async onEnter(ctx) {
    await ctx.once('eppleIntro', async () => {
      await ctx.wait(400);
      await ctx.playerSay('Abendrot? Alis Uhr geht also mal wieder ein paar Stunden vor.');
      await ctx.playerSay('Das Epplehaus. Und mehr Tauben als Gäste.');
    });
  },

  ambients: [
    { every: [500, 1300], run: pigeonLife },
    {
      // Flaschenfloh, talking shop to himself and to the pigeons.
      every: [12000, 22000],
      run: async (ctx) => {
        if (ctx.busy) return;
        await ctx.say(
          'floh',
          pick([
            'Klirr, klirr. Das ist Musik.',
            'Acht Cent sind acht Cent.',
            'Pfand gehört daneben!',
            'Ksch! Weg von meinen Flaschen, ihr Ratten der Lüfte!',
            'Nach dem Plenum gibt’s Leergut. Ich kann warten.',
          ])
        );
      },
    },
    {
      // Now and then a pigeon has something to say, too.
      every: [9000, 17000],
      run: async (ctx) => {
        if (ctx.busy) return;
        await ctx.say(pick(PIGEONS).id, pick(['Gurr.', 'Gurruu.', 'Gurr-gurr.']));
      },
    },
  ],

  hotspots: HOTSPOTS,
};
