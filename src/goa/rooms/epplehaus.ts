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
/** The heart balloon on its string (layer coordinates: 60×140 at 206,196). */
const BALLOON_ART =
  '<path d="M30 54Q24 90 34 136" fill="none" stroke="#e8e2d8" stroke-width="1.6"/>' +
  '<path d="M30 52C4 30 12 6 30 18C48 6 56 30 30 52Z" fill="#ff5ab4" stroke="#1e1424" stroke-width="2.4" stroke-linejoin="round"/>' +
  '<path d="M18 18Q21 13 26 16" fill="none" stroke="#ffffff" stroke-width="2.4" opacity="0.8"/>';

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

/** The pigeon that learns to say "Put put", and where it pecks once fed. */
const PUT_TAUBE = 'taube3';
const PUT_SPOT = P(506, 376);
/** Fed and parroting, not caught yet: it stays put, pecking crumbs. */
const pecking = (s: { getFlag: (k: string) => unknown }) => !!s.getFlag('putTaube') && !s.getFlag('taubeCaught');
/** Caught and in the player's pocket (until it opened the tower door and flew home). */
const pocketed = (s: { getFlag: (k: string) => unknown }) => !!s.getFlag('taubeCaught') && !s.getFlag('turmOpen');

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
  // The parroting pigeon is too busy with its crumbs to run, or gone.
  const free = PIGEONS.filter((p) => p.id !== PUT_TAUBE || (!pecking(ctx.state) && !pocketed(ctx.state)));
  if (pecking(ctx.state)) {
    // Shooed off its crumbs somehow? It comes straight back.
    const t = ctx.actor(PUT_TAUBE);
    if (Math.hypot(t.x - PUT_SPOT.x, t.y - PUT_SPOT.y) > 6) send(ctx, PUT_TAUBE, PUT_SPOT.x, PUT_SPOT.y);
  }
  for (const p of free) {
    const a = ctx.actor(p.id);
    if (Math.hypot(a.x - player.x, (a.y - player.y) * 1.6) < 62) {
      flee(ctx, p.id, player);
      fled = true;
    }
  }
  if (fled) return;
  // Otherwise one of them wanders a few steps, pecking its way across the yard.
  const p = pick(free);
  const a = ctx.actor(p.id);
  send(ctx, p.id, a.x + (Math.random() - 0.5) * 220, a.y + (Math.random() - 0.5) * 70);
}

/** Feed the pigeons: Flaschenfloh crumbles the pretzel and calls them —
 *  "Put, put, put!" — and one of them starts saying it too. */
/** Flaschenfloh's two worries: his own stomach first, then his pigeons. */
async function feedFloh(ctx: ScriptContext): Promise<void> {
  ctx.removeItem('doener');
  ctx.setFlag('flohSatt');
  await ctx.say('floh', 'Ein Döner? Für mich? Mit alles?');
  await ctx.say('floh', 'Junge. Seit gestern früh nix im Magen außer Pfandquittungen.');
  ctx.face('floh', 'down');
  await ctx.wait(600);
  await ctx.say('floh', 'Mmmpf. Mmmh. Mmmmmh!');
  await ctx.say('floh', 'Das war der beste Döner seit der Einführung des Dosenpfands. Danke.');
  await ctx.say('floh', 'Jetzt fehlt nur noch was für meine Kollegen. Die gucken schon ganz neidisch.');
}

async function feedPigeons(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('flohSatt')) {
    await ctx.say('floh', 'Krümel für die Tauben? Schön und gut.');
    await ctx.say('floh', 'Aber erst ich, dann die Tauben. Mit leerem Magen ruf ich kein Put put.');
    return;
  }
  ctx.removeItem('muetzekruemel');
  // From now on the parroting pigeon only has eyes for the crumbs (no fleeing).
  ctx.setFlag('putTaube');
  await ctx.say('floh', 'Brezelkrümel? In einer Burschenmütze? Du hast Stil, Junge.');
  await ctx.say('floh', 'Pass auf, so macht man das.');
  // Crumbs on the cobbles; everybody comes running.
  // The others peck on Flaschenfloh's right; the parroting one gets its own spot on his left.
  PIGEONS.filter((p) => p.id !== PUT_TAUBE).forEach((p, i) => {
    send(ctx, p.id, FLOH.x + 50 + (i % 4) * 34, FLOH.y + 18 + Math.floor(i / 4) * 34);
  });
  send(ctx, PUT_TAUBE, PUT_SPOT.x, PUT_SPOT.y);
  ctx.face('floh', 'down');
  await ctx.say('floh', 'Put, put, put, put, put!');
  await ctx.say('floh', 'Put, put, put! Putputputput!');
  await ctx.wait(600);
  await ctx.walkTo(PUT_TAUBE, PUT_SPOT.x, PUT_SPOT.y);
  ctx.place(PUT_TAUBE, PUT_SPOT.x, PUT_SPOT.y, 'right');
  ctx.setFlag('putHeard');
  await ctx.say(PUT_TAUBE, 'Put put!');
  await ctx.playerSay('Hat die Taube gerade „Put put“ gesagt?');
  await ctx.say('floh', 'Die da? Die plappert alles nach. Wie ein Papagei. Nur grauer.');
  await ctx.say(PUT_TAUBE, 'Put put! Put put!');
  await ctx.say('floh', 'Und jetzt ist sie so mit den Krümeln beschäftigt, die merkt nicht mal, wenn die Welt untergeht.');
  ctx.addItem('muetze', { silent: true });
  await ctx.say('floh', 'Hier, deine Mütze. Riecht jetzt nach Bier UND Brezel. Ein Upgrade.');
}

/** Catch the parroting pigeon — only while it's busy with the crumbs. */
async function catchPutTaube(ctx: ScriptContext): Promise<void> {
  if (!pecking(ctx.state)) {
    flee(ctx, PUT_TAUBE, ctx.player);
    await ctx.playerSay('Zu schnell. Ohne Ablenkung krieg ich keine Taube zu fassen.');
    return;
  }
  ctx.setFlag('taubeCaught');
  ctx.addItem('taube');
  ctx.place(PUT_TAUBE, -200, 400);
  await ctx.repaint();
  await ctx.playerSay('Sie pickt so konzentriert, dass sie mich gar nicht kommen sieht. Hab dich!');
  await ctx.say('floh', 'Na, die mag dich. Füttern nicht vergessen!');
}

const pigeonHotspot = (id: string): HotspotDef => ({
  id,
  name: 'Taube',
  actor: id,
  ...(id === PUT_TAUBE ? { visible: (state) => !pocketed(state) } : {}),
  on: {
    lookat: async (ctx) => {
      if (id === PUT_TAUBE && pecking(ctx.state)) {
        await ctx.playerSay('Die Put-Put-Taube. Pickt Brezelkrümel und plappert dabei Flaschenflohs Lockruf nach.');
        return;
      }
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
      if (id === PUT_TAUBE && ctx.flag('putTaube')) {
        await ctx.say(id, 'Put put!');
        return;
      }
      await ctx.say(id, pick(['Gurr.', 'Gurruu.', 'Ruckediguh.']));
    },
    pickup: async (ctx) => {
      if (id === PUT_TAUBE) return catchPutTaube(ctx);
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
      muetzekruemel: async (ctx) => {
        await ctx.playerSay('Wenn ich die Mütze hinhalte, flattert der ganze Schwarm auf mich drauf. Flaschenfloh hat da mehr Übung.');
      },
      stuhlbein: 'Die Holzwürmer wären ein Festmahl für sie. Aber die Würmer brauch ich noch.',
      magicwoman: 'Energydrink für Tauben? Die sind schon nervös genug.',
    },
  },
});

// ---- scripts ---------------------------------------------------------------------

async function toDoener(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('doener', 'epplehaus');
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
  at('haus', 'Epplehaus', R(EP.x0, 0, EP.x1 - EP.x0, 40), P(480, 350), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Das Epplehaus. Selbstverwaltetes Jugendzentrum seit 1972.');
        await ctx.playerSay('Hier hab ich mein erstes Konzert gesehen. Und mein Gehör zum ersten Mal verloren.');
      },
    },
  }),
  at('graffiti', 'Graffiti', R(EP.x0, 40, EP.x1 - EP.x0, 264), P(320, 346), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Graffiti vom Gehweg bis in den ersten Stock. „EPPLE“, „GOA“, „BASS“, „1972“, „PLENUM!“.');
        await ctx.playerSay('Und dazwischen überall „PUT PUT“. Wer schreibt das bloß? Und warum?');
        ctx.setFlag('putSeen');
        if (ctx.flag('knowsPartykiller')) await ctx.playerSay('Und „KEIN BASS IST ILLEGAL“. Das sollte man dem Partykiller mal zeigen.');
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
  at('ballon', 'Heliumballon', R(214, 200, 46, 52), P(236, 346), 'up', {
    defaultVerb: 'pickup',
    visible: (state) => !state.getFlag('ballonTaken'),
    on: {
      lookat: 'Ein pinker Herzballon, an den Fahrradständer geknotet. Vom letzten Konzert übrig. Er zerrt an der Schnur.',
      pickup: async (ctx) => {
        ctx.setFlag('ballonTaken');
        ctx.addItem('ballon');
        await ctx.repaint();
        await ctx.playerSay('Losgeknotet. Er zieht ganz schön nach oben.');
      },
    },
  }),
  at('raeder', 'Fahrräder', R(EP.bikes.x, EP.bikes.y, EP.bikes.w, EP.bikes.h), P(310, 346), 'up', {
    on: {
      lookat: 'Zwei Fahrräder am Ständer. Beide mit drei Schlössern. Wir sind hier schließlich in Tübingen.',
      pickup: 'Fahrraddiebstahl? Nicht mit mir. Und nicht mit drei Schlössern.',
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
  at('toDoener', 'Zur Dönerbude', R(0, 140, 30, 306), P(24, 400), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Da lang geht’s zur Dönerbude. Und dahinter die Treppe runter ins Picasso. Es riecht bis hierher.',
      use: toDoener,
      open: toDoener,
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
          if (ctx.easyMode) {
            await ctx.say('floh', 'Die nimmt nur einer zurück: Ali. Fünfundzwanzig Cent. Ehrensache.');
            await ctx.playerSay('Gut zu wissen.');
          }
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
        muetzekruemel: feedPigeons,
        doener: feedFloh,
        taube: async (ctx) => {
          await ctx.say('floh', 'Behalt sie. Die mag dich. Und sie hält mir keine Vorträge über Mehrweg.');
        },
        muetze: async (ctx) => {
          await ctx.say('floh', 'Eine Burschenmütze! Die Burschen trinken aus Krügen. Kein Pfand. Kulturlos.');
          if (ctx.easyMode) await ctx.say('floh', 'Aber als Futtersack für die Tauben, da wär sie was. Wenn was drin wär.');
        },
      },
    },
  },
  // The parroting pigeon last: on top when pigeons crowd together.
  ...PIGEONS.filter((p) => p.id !== PUT_TAUBE).map((p) => pigeonHotspot(p.id)),
  pigeonHotspot(PUT_TAUBE),
];

// ---- room ------------------------------------------------------------------------

export const epplehausRoom: RoomDef = {
  id: 'epplehaus',
  name: 'Epplehaus',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: epplehausBg() },
    // A heart balloon from the last concert, tied to the bike rack.
    { id: 'ballon', depth: Layer.BEHIND, x: 206, y: 196, w: 60, h: 140, svg: BALLOON_ART, visible: (state) => !state.getFlag('ballonTaken') },
  ],

  walkArea: [P(FLOOR.x0, FLOOR.y0), P(FLOOR.x1, FLOOR.y0), P(FLOOR.x1, FLOOR.y1), P(FLOOR.x0, FLOOR.y1)],
  holes: [[P(FLOH.x - 22, FLOH.y - 6), P(FLOH.x + 22, FLOH.y - 6), P(FLOH.x + 22, FLOH.y + 6), P(FLOH.x - 22, FLOH.y + 6)]],
  scaling: { yTop: 340, scaleTop: 0.94, yBottom: 446, scaleBottom: 1.2 },

  music: 'epple-theme',

  assets: { svgActors: PIGEON_ACTORS },

  entries: {
    doener: { x: 40, y: 400, facing: 'right' },
    neckar: { x: 910, y: 400, facing: 'left' },
  },

  actors: [{ id: 'floh', x: FLOH.x, y: FLOH.y, facing: 'down' }, ...PIGEONS],

  async onEnter(ctx) {
    // The parroting pigeon: pecking crumbs by Flaschenfloh, or in the pocket.
    if (pocketed(ctx.state)) ctx.place(PUT_TAUBE, -200, 400);
    else if (pecking(ctx.state)) ctx.place(PUT_TAUBE, PUT_SPOT.x, PUT_SPOT.y, 'right');
    await ctx.once('eppleIntro', async () => {
      await ctx.wait(400);
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
            ...(ctx.flag('flohSatt') ? ['Satt und zufrieden. Jetzt fehlt nur noch Leergut.'] : ['Mein Magen knurrt lauter als der Glascontainer.', 'Riecht ihr das? Der Neckar-Kebap. Grausam.']),
          ])
        );
      },
    },
    {
      // Now and then a pigeon has something to say, too.
      every: [9000, 17000],
      run: async (ctx) => {
        if (ctx.busy) return;
        if (pecking(ctx.state) && Math.random() < 0.6) {
          await ctx.say(PUT_TAUBE, pick(['Put put!', 'Put put put!', 'Gurr. Put put.']));
          return;
        }
        const talkers = PIGEONS.filter((p) => p.id !== PUT_TAUBE || !pocketed(ctx.state));
        await ctx.say(pick(talkers).id, pick(['Gurr.', 'Gurruu.', 'Gurr-gurr.']));
      },
    },
  ],

  hotspots: HOTSPOTS,
};
