import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { PIGEON_ACTORS } from '../art/epplehaus';
import { VOICE_ACTOR } from '../art/turm';
import { TT, doorAjar, intercomBlink, turmtuerBg } from '../art/turmtuer';

// ---- layout ----------------------------------------------------------------------
// The Hölderlinturm's door, close up, at the end of the promenade. The door
// is locked until the password „Put put“ is said in the right voice — into
// an intercom that is a piece of 1987 in the wall, the one thing reaching
// into Otto R.'s time layer (so he can answer and buzz the door open, but
// not come out). `ottoTuer` is his voice, `taubeTuer` the Put-Put pigeon.
//
// State: `turmAsked`, `turmOpen`, `putSeen` (the graffiti was read).

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

const IC = TT.intercom;
const DOOR_SPOT = P(TT.door.x + TT.door.w / 2, 366);
const IC_SPOT = P(IC.x - 34, 368);
/** Where the pigeon is held up to the intercom. */
const PERCH = P(IC.x + 8, IC.y + IC.h + 34);

/** Ring: Otto R. answers from 1987 and wants the password. */
async function ring(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('turmOpen')) {
    await ctx.say('ottoTuer', 'Ist offen! Komm rein. Und mach die Tür zu, es zieht durch drei Zeitebenen.');
    return;
  }
  ctx.sfx('deny');
  await ctx.say('ottoTuer', ctx.flag('turmAsked') ? 'Schon wieder du? Parole!' : 'Halt! Wer da? Ohne Parole kommt hier keiner rein!');
  ctx.setFlag('turmAsked');
  await ctx.dialog('turmtuer');
}

async function openDoor(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('turmOpen')) {
    ctx.sfx('deny');
    await ctx.playerSay('Zu. Massive Eiche. Aber daneben hängt eine Gegensprechanlage. Ich drück mal.');
    await ctx.walkTo('player', IC_SPOT.x, IC_SPOT.y);
    ctx.face('player', 'right');
    await ring(ctx);
    return;
  }
  ctx.sfx('open');
  await ctx.goToRoom('hoelderlinturm', 'door');
}

/** The Put-Put pigeon says the password into the intercom — in exactly the
 *  right voice. The door opens and the pigeon flies home to the Epplehaus. */
async function pigeonPassword(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('turmOpen')) return;
  ctx.removeItem('taube');
  ctx.place('taubeTuer', PERCH.x, PERCH.y, 'right');
  await ctx.playerSay('Ich halt die Taube an die Gegensprechanlage. Na los, sag’s ihm.');
  await ctx.say('ottoTuer', 'Parole?');
  await ctx.say('taubeTuer', 'Put put!');
  await ctx.say('ottoTuer', 'PUT PUT! Korrekt! Und diese Stimme ... dieses Timbre ... endlich jemand mit Klangfarbe!');
  ctx.sfx('open');
  ctx.setFlag('turmOpen');
  await ctx.repaint();
  await ctx.say('ottoTuer', 'Der Summer geht noch, der ist auch von 1987. Komm rein. Und bring den Sänger nächstes Mal wieder mit.');
  await ctx.say('taubeTuer', 'Gurr.');
  ctx.place('taubeTuer', -300, 300);
  await ctx.playerSay('Und weg ist sie. Zurück zu den Krümeln am Epplehaus, schätze ich.');
  await ctx.playerSay('Die Tür ist auf.');
}

async function toBridge(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('neckar', 'turm');
}

const HOTSPOTS: HotspotDef[] = [
  at('turm', 'Hölderlinturm', R(TT.wall.x0, 0, TT.wall.x1 - TT.wall.x0, TT.ground), DOOR_SPOT, 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Hölderlinturm, aus der Nähe. Gelb, rund, und älter als alles, was ich besitze.');
        await ctx.playerSay('Oben brennt Licht. Aber durchs Fenster sieht man niemanden.');
      },
    },
  }),
  at('neckar', 'Neckar', R(0, 240, 250, 90), P(180, 366), 'left', {
    on: { lookat: 'Der Neckar, im Abendrot. Von hier unten hört man ihn sogar.' },
  }),
  at('anleger', 'Stocherkahn-Anlegestelle', R(0, 204, 222, 126), P(150, 366), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Die Stocherkahn-Anlegestelle. Zwei Kähne, festgemacht, die Stangen ordentlich im Ständer.');
        if (ctx.flag('puntSunk')) await ctx.playerSay('Einer fehlt. Ich weiß auch, welcher. Und warum.');
        else await ctx.playerSay('Von hier legen sie ab, die Burschen mit ihren Mützen und ihrem Liedgut.');
      },
      use: 'Stochern? Ich? Ich würd mich im Kreis drehen, bis mir schlecht ist. Und die Kähne sind angekettet.',
      pickup: 'Einen ganzen Kahn? Der passt nicht mal in meine Vorstellung, geschweige denn in die Tasche.',
    },
    onItem: { use: { stuhlbein: 'Noch einen Kahn versenken? Einer am Abend reicht.' } },
  }),
  at('pflanzen', 'Efeu', R(TT.wall.x0, 0, 46, TT.ground), P(300, 366), 'up', {
    on: {
      lookat: 'Efeu, den ganzen Turm hoch. Und über der Tür ranken späte Rosen. Hier gießt jemand. Oder es war mal jemand hier, der gegossen hat.',
      pickup: 'Der Efeu hält den Turm zusammen. Oder der Turm den Efeu. Ich misch mich da nicht ein.',
    },
  }),
  at('geranien', 'Blumentöpfe', R(TT.door.x - 54, TT.ground - 56, 40, 60), P(TT.door.x - 34, 366), 'up', {
    on: {
      lookat: 'Geranien, Lavendel, da hinten ein Oleander. Für einen Turm, in dem seit 1987 keiner rauskommt, erstaunlich gepflegt.',
      pickup: 'Blumen klauen vorm Hölderlinturm? So tief sink ich nicht. Heute nicht.',
    },
  }),
  at('schild', 'Messingschild', R(TT.plaque.x, TT.plaque.y, TT.plaque.w, TT.plaque.h), P(330, 366), 'up', {
    on: {
      lookat: '„Hölderlinturm“. Darunter, kleiner: „Besichtigung nach Vereinbarung. Vereinbarung nach Parole.“',
      pickup: 'Angeschraubt. Vier Schrauben, alle rund gedreht.',
    },
  }),
  at('putput', 'Graffiti', R(TT.graffiti.x - 60, TT.graffiti.y - 34, 124, 96), P(330, 366), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('„PUT PUT“. Direkt neben der Tür. Wie an jeder zweiten Wand in Tübingen.');
        ctx.setFlag('putSeen');
        if (ctx.easyMode) await ctx.playerSay('Wenn das hier steht, hat es bestimmt was mit dem Turm zu tun.');
      },
    },
  }),
  at('lampe', 'Laterne', R(TT.door.x + TT.door.w / 2 - 18, TT.door.y - 96, 36, 40), DOOR_SPOT, 'up', {
    on: { lookat: 'Die Laterne über der Tür brennt. Da ist jemand zu Hause. Irgendwann.' },
  }),
  at('tuer', 'Turmtür', R(TT.door.x, TT.door.y - 30, TT.door.w, TT.door.h + 30), DOOR_SPOT, 'up', {
    defaultVerb: 'open',
    on: {
      lookat: async (ctx) => {
        if (ctx.flag('turmOpen')) await ctx.playerSay('Die Tür steht einen Spalt offen. Dahinter warmes Licht.');
        else await ctx.playerSay('Eine schwere Eichentür mit Eisenbändern. Kein Schlüsselloch, keine Klinke – nur ein Ring. Und der gibt nicht nach.');
      },
      open: openDoor,
      use: openDoor,
      pull: openDoor,
      push: openDoor,
      talkto: 'Die Tür sagt nichts. Aber die Sprechanlage daneben vielleicht.',
    },
    onItem: {
      use: {
        taube: async (ctx) => {
          await ctx.playerSay('Die Tür hört nicht zu. Die Sprechanlage schon.');
        },
        pogostick: 'Über den Turm hüpfen? Der ist dreimal so hoch wie das Absperrgitter im Wald.',
      },
    },
  }),
  at('sprechanlage', 'Gegensprechanlage', R(IC.x - 8, IC.y - 8, IC.w + 16, IC.h + 16), IC_SPOT, 'right', {
    defaultVerb: 'push',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Eine Gegensprechanlage. Aber guck dir die an: grobe Pixel, vier Farben, alles ruckelt ein bisschen.');
        await ctx.playerSay('Die ist nicht alt. Die ist von damals. Als hätte jemand ein Stück 1987 in die Wand geschraubt.');
      },
      push: ring,
      use: ring,
      talkto: ring,
      pickup: 'Die hängt nicht an der Wand. Die hängt in einer anderen Zeit. Da krieg ich sie nicht raus.',
    },
    onItem: {
      use: { taube: pigeonPassword },
      give: { taube: pigeonPassword },
    },
  }),
  at('toBridge', 'Zurück zur Neckarbrücke', R(900, 250, 60, 196), P(930, 400), 'right', {
    defaultVerb: 'use',
    on: {
      lookat: 'Der Uferweg zurück zur Neckarbrücke.',
      use: toBridge,
      open: toBridge,
    },
  }),
];

export const turmtuerRoom: RoomDef = {
  id: 'turmtuer',
  name: 'Vor dem Hölderlinturm',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: turmtuerBg() },
    { id: 'ajar', depth: Layer.BEHIND, svg: doorAjar(), visible: (state) => !!state.getFlag('turmOpen') },
    { id: 'blink', depth: Layer.BEHIND, x: IC.x + 40, y: IC.y + 55, w: 5, h: 5, svg: intercomBlink(), alpha: 0 },
    { id: 'light', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: '<rect width="960" height="450" fill="#c0507a"/>', alpha: 0.1 },
  ],

  walkArea: [P(30, 350), P(940, 350), P(940, 444), P(30, 444)],
  scaling: { yTop: 348, scaleTop: 1.3, yBottom: 446, scaleBottom: 1.5 },

  music: 'neckar-theme',

  assets: { svgActors: [VOICE_ACTOR, ...PIGEON_ACTORS] },

  entries: {
    // Along the promenade from the bridge.
    weg: { x: 880, y: 396, facing: 'left' },
    // Out of the tower.
    tuer: { x: DOOR_SPOT.x, y: DOOR_SPOT.y, facing: 'down' },
  },

  actors: [
    // Otto R. on the intercom (a voice: its feet are placed so the speech sits above the box).
    { id: 'ottoTuer', x: IC.x + IC.w / 2, y: IC.y + 150, facing: 'down' },
    // The Put-Put pigeon: only there while it says the password.
    { id: 'taubeTuer', x: -300, y: 300, facing: 'left' },
  ],

  async onEnter(ctx) {
    await ctx.once('turmtuerIntro', async () => {
      await ctx.playerSay('Der Hölderlinturm. Eine Tür, eine Laterne – und eine sehr seltsame Sprechanlage.');
    });
  },

  ambients: [
    {
      // The intercom's display blinks, a little out of step with the present.
      every: [300, 1400],
      run: async (ctx) => {
        const b = ctx.layerObj('blink');
        b.setAlpha(1);
        await ctx.wait(160);
        b.setAlpha(0);
      },
    },
  ],

  hotspots: HOTSPOTS,
};
