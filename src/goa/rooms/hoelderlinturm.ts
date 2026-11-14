import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import type { GameState } from '../../engine/GameState';
import { FLOORS, OTTO_ACTOR, TM, blackHoleArt, rugArt, spiralGlow, turmBg, wallHoleArt, type Era } from '../art/turm';

// ---- layout ----------------------------------------------------------------------
// The Hölderlinturm as a doll's house, seen from the Neckar with its front
// wall cut away, all on one screen: upstairs the Turmstube (the door from
// the promenade opens onto it), downstairs the vaulted cellar at the
// river's level, joined by a flight of stairs — a side view, so no
// perspective scaling. In the Turmstube stands Otto R.'s Rössler
// attractor: turn it, and the whole picture jumps between three time
// layers (flag `turmEra`):
//
//   0  the house style, like everywhere else
//   1  a 1987 pixel adventure (sixteen colours) — where Otto R. is stuck
//   2  a modern cartoon collage with photo textures — where holes are portable
//
// The riddle: Otto R. sits in the cellar on his own strange attractor in
// 1987 and needs a way out. Under the rug upstairs there's a black hole; only
// in the modern layer can it be picked up (cartoon physics). Put it on the
// cellar wall where his graffiti says PUT PUT — in 1987, where Otto is — and
// he walks out through it, leaving his pocket attractor behind.
//
// State: `turmEra` (0|1|2), `rugMoved`, `holeTaken`, `ottoMet`, `wallHole`,
// `ottoFree` (+ the items `loch` and `taschenattraktor`). Everything visual
// is re-derived from those on repaint.

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const era = (state: GameState): Era => (state.getFlag<number>('turmEra') ?? 0) as Era;

const ERA_TRACK = ['turm-toon', 'turm-pixel', 'turm-modern'] as const;
const ERA_NAME = [
  'Zeitebene: handgemalt, 256 Farben',
  'Zeitebene: 1987, 16 Farben',
  'Zeitebene: heute, Fotos und Zeichentrick',
];

/** One line per time layer. */
const byEra = (ctx: ScriptContext, lines: [string, string, string]) => ctx.playerSay(lines[era(ctx.state)]);

const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 14): Vec2[] =>
  Array.from({ length: n }, (_, i) => P(cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry));

const [STUBE, KELLER] = FLOORS;
/** Where to stand on a floor: just in front of its back edge. */
const on = (f: (typeof FLOORS)[number], x: number) => P(x, f.back + 10);
const ATTRACTOR_SPOT = on(STUBE, TM.pedestal.x);
const RUG_SPOT = on(STUBE, TM.rug.cx - TM.rug.rx - 12);
const WALL_SPOT = on(KELLER, 600);
const OTTO_HOME = on(KELLER, 760);
/** Just in front of the hole in the cellar wall. */
const HOLE_DOOR = P(TM.arch.x + TM.arch.w / 2, KELLER.back + 3);
/** The floor a point on the back wall belongs to. */
const floorAt = (y: number) => (y < STUBE.back ? STUBE : KELLER);

/** Both floor bands and the stairs between them, as one outline. */
const [DN_T, DN_B] = [TM.stairDown.top, TM.stairDown.bottom];
const WALK: Vec2[] = [
  P(160, STUBE.back), P(840, STUBE.back), P(840, STUBE.front),
  P(DN_T[1], STUBE.front), P(DN_B[1], KELLER.back), P(840, KELLER.back), P(840, KELLER.front),
  P(170, KELLER.front), P(170, KELLER.back), P(DN_B[0], KELLER.back), P(DN_T[0], STUBE.front),
  P(160, STUBE.front),
];

// ---- scripts ---------------------------------------------------------------------

/** Turn the attractor: the room jumps to the next time layer. */
async function shiftEra(ctx: ScriptContext, dir: 1 | -1): Promise<void> {
  const next = (((era(ctx.state) + dir) % 3) + 3) % 3;
  ctx.sfx('zap');
  ctx.flash(next === 1 ? 0x55ffff : next === 2 ? 0xff55ff : 0xfff0a0, 420);
  ctx.shake(320, 0.006);
  ctx.setFlag('turmEra', next);
  await ctx.repaint();
  ctx.playMusic(ERA_TRACK[next]);
  ctx.toast(ERA_NAME[next]);
  if (next === 1) {
    await ctx.once('turmPixelSeen', async () => {
      await ctx.playerSay('Whoa. Alles pixelig. Sechzehn Farben, und die Hälfte davon ist Braun.');
      await ctx.playerSay('Nur ich nicht. Ich bin wohl zu hochauflösend für 1987.');
    });
    if (!ctx.flag('ottoFree') && !ctx.flag('ottoMet')) {
      ctx.setFlag('ottoMet');
      ctx.face('otto', 'left');
      await ctx.say('otto', 'Besuch! Endlich! Und so hochauflösend!');
      await ctx.say('otto', 'Otto R., sehr erfreut. Ich würde dir die Hand geben, aber die besteht aus vier Pixeln.');
    }
  } else if (next === 2) {
    await ctx.once('turmModernSeen', async () => {
      await ctx.playerSay('Jetzt sieht alles aus wie ein Zeichentrickfilm, in den jemand Fotos geklebt hat.');
      await ctx.playerSay('Die Wand ist ein Foto von einer Wand. Mit Umriss. Ich hab Angst, dass gleich ein Amboss runterfällt.');
    });
  } else {
    await ctx.once('turmToonBack', async () => {
      await ctx.playerSay('Und wieder handgemalt. Ah, das fühlt sich nach Zuhause an.');
    });
  }
}

/** Roll the rug back: underneath, the black hole. */
async function moveRug(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('rugMoved')) {
    await ctx.playerSay('Ich lass ihn lieber zusammengerollt. Wer weiß, was sonst noch reinfällt.');
    return;
  }
  ctx.sfx('step');
  ctx.setFlag('rugMoved');
  await ctx.repaint();
  await ctx.playerSay('Ein schwarzes Loch! Unterm Teppich!');
  await byEra(ctx, [
    'Das erklärt, warum hier nie Staub liegt. Der wird einfach eingesaugt.',
    'Ein schwarzes Pixel-Oval. Unendlich tief, aber nur ein Bit.',
    'Und es sieht aus, als könnte man es einfach so aufheben. Wie im Zeichentrick.',
  ]);
}

async function takeHole(ctx: ScriptContext): Promise<void> {
  const e = era(ctx.state);
  if (e === 0) {
    await ctx.playerSay('Ein schwarzes Loch kann man nicht nehmen. Es nimmt dich.');
    await ctx.playerSay('Es zieht schon an meinen Schnürsenkeln.');
    return;
  }
  if (e === 1) {
    await ctx.playerSay('> NIMM LOCH');
    await ctx.playerSay('„Das kannst du nicht nehmen.“ Typisch 1987.');
    return;
  }
  ctx.sfx('pickup');
  ctx.setFlag('holeTaken');
  ctx.addItem('loch');
  await ctx.repaint();
  await ctx.playerSay('Ich heb die Kante an ... und rolle es auf. Ein tragbares Loch.');
  await ctx.playerSay('Zeichentrick-Physik. Ich frag nicht. Ich steck’s ein.');
}

/** Put the portable hole on the wall, where PUT PUT says. */
async function putHole(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('wallHole')) return;
  const e = era(ctx.state);
  if (e !== 1) {
    if (ctx.flag('ottoMet')) {
      await ctx.playerSay('Moment. Otto steckt in der Pixel-Ebene fest. In dieser Ebene hilft ihm ein Loch in der Wand gar nichts.');
    } else {
      await ctx.playerSay('PUT PUT, und ein Pfeil auf die Wand ... Aber einfach so ein Loch in Hölderlins Wand?');
      await ctx.playerSay('Da bräuchte ich schon einen guten Grund. Oder jemanden, der raus will.');
    }
    return;
  }
  ctx.removeItem('loch');
  ctx.sfx('open');
  ctx.setFlag('wallHole');
  await ctx.repaint();
  await ctx.playerSay('PUT. PUT.');
  await ctx.say('otto', 'PUT PUT! Der Parser hat verstanden!');
  await ctx.say('otto', 'Ein Loch in der Wand, in 1987! Weißt du, wie viel Speicher das kostet?');
  await ctx.walkTo('otto', HOLE_DOOR.x - 30, HOLE_DOOR.y + 4);
  ctx.face('otto', 'left');
  await ctx.say('otto', 'Danke, Hochauflösender. Hier, nimm meinen Taschen-Attraktor.');
  ctx.addItem('taschenattraktor');
  await ctx.say('otto', 'Wenn du dem Bass folgst: Der zeigt dir, wo das Chaos am schönsten ist.');
  await ctx.playerSay('Und wohin gehst du?');
  await ctx.say('otto', 'Ich nehme die Abkürzung durch die Wand. Irgendwo da draußen gibt’s eine Ebene mit mehr als sechzehn Farben.');
  await ctx.walkTo('otto', HOLE_DOOR.x, HOLE_DOOR.y);
  ctx.face('otto', 'up');
  await ctx.wait(400);
  ctx.sfx('zap');
  ctx.setFlag('ottoFree');
  await ctx.repaint();
  await ctx.playerSay('Weg ist er. Durch ein Loch, das ich oben unter einem Teppich gefunden hab.');
  await ctx.playerSay('Ich schreib das nicht in meinen Lebenslauf.');
}

async function toNeckar(ctx: ScriptContext): Promise<void> {
  if (era(ctx.state) === 1) await ctx.playerSay('In 1987 ist die Tür nur gemalt. Aber für mich geht sie auf: Vorteile der Auflösung.');
  ctx.sfx('open');
  await ctx.goToRoom('neckar', 'turm');
}

// ---- hotspots --------------------------------------------------------------------

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

const sideWindow = (id: string, w: (typeof TM.windows)[number]): HotspotDef =>
  at(id, 'Fenster', R(w.x - 6, w.y - 6, w.w + 12, w.h + 12), on(floorAt(w.y), w.x + w.w / 2), 'up', {
    on: {
      lookat: (ctx) =>
        byEra(ctx, [
          'Draußen die Altstadt im Abendrot, Giebel an Giebel. Hölderlin hat hier sechsunddreißig Jahre rausgeschaut. Ich versteh’s.',
          'Fünf Farbstreifen, ein schwarzer Balken, Türkis. Sonnenuntergang in EGA. Rührend.',
          'Ein Foto vom Sonnenuntergang, ins Fenster geklebt. Die Wolken sind echt. Der Rahmen ist gemalt.',
        ]),
      open: 'Lieber nicht. Sonst weht der Abend die Manuskripte weg.',
    },
  });

const HOTSPOTS: HotspotDef[] = [
  ...TM.windows.map((w, i) => sideWindow(`fenster${i}`, w)),
  at('tuer', 'Tür', R(TM.door.x - 6, TM.door.top - 10, TM.door.w + 12, TM.door.foot - TM.door.top + 10), on(STUBE, 166), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: (ctx) =>
        byEra(ctx, [
          'Die Tür, durch die ich reingekommen bin. Dahinter die Treppe und der Neckar.',
          'Eine braune Tür mit einem gelben Pixel als Klinke.',
          'Eine Tür aus Foto-Holz. Mit einem Umriss so dick wie mein Daumen.',
        ]),
      use: toNeckar,
      open: toNeckar,
    },
  }),
  at('pult', 'Schreibpult', R(TM.desk.x - 8, TM.desk.top - 36, TM.desk.w + 16, TM.desk.foot - TM.desk.top + 36), on(STUBE, 244), 'up', {
    on: {
      lookat: async (ctx) => {
        if (era(ctx.state) === 1) {
          await ctx.playerSay('> SCHAU PULT');
          await ctx.playerSay('„Du siehst ein Pult. Du siehst nichts Besonderes.“ Danke, Parser.');
          return;
        }
        await ctx.playerSay('Hölderlins Schreibpult. Feder, Tinte, eine Kerze und ein Stapel Gedichte.');
        await ctx.playerSay('Ganz oben: „Mit gelben Birnen hänget / Und voll mit wilden Rosen / Das Land in den See.“');
        await ctx.playerSay('Darunter, mit Kugelschreiber: „Rössler-Attraktor: a = 0,2, b = 0,2, c = 5,7. Nicht drehen! — O. R.“');
      },
      pickup: 'Hölderlins Feder? Die bleibt hier. Ich schreib eh nur Nachrichten mit Daumen.',
      use: 'Ich und dichten? „Bass, du Bass, du tiefer Bass ...“ Nein. Das lass ich lieber.',
    },
  }),
  at('graffiti', 'PUT PUT', R(TM.graffiti.x, TM.graffiti.y, TM.graffiti.w, TM.arch.foot - TM.graffiti.y), WALL_SPOT, 'up', {
    on: {
      lookat: async (ctx) => {
        const e = era(ctx.state);
        if (e === 1) {
          await ctx.playerSay('„>PUT PUT_“ — wie eine Eingabezeile in einem uralten Textparser. Der Cursor blinkt.');
          await ctx.playerSay('PUT heißt „lege“. Lege was? Wohin? Der Pfeil zeigt auf den gestrichelten Bogen.');
          return;
        }
        await byEra(ctx, [
          'PUT PUT. Steht in Tübingen an jeder zweiten Wand. Jetzt also auch im Hölderlinturm.',
          'PUT PUT, als Foto von echtem Sprühlack. Man riecht es fast.',
          'PUT PUT',
        ]);
        await ctx.playerSay('Ein Pfeil zeigt nach unten auf einen gestrichelten Bogen, so groß wie eine Tür.');
      },
      pickup: 'Sprühlack geht nicht ab. Das weiß jeder Hausmeister in Tübingen.',
    },
    onItem: { use: { loch: putHole } },
  }),
  at('bett', 'Bett', R(TM.bed.x - 36, TM.bed.foot - 56, TM.bed.w + 36, 56), on(STUBE, TM.bed.x + 70), 'up', {
    on: {
      lookat: 'Hölderlins Bett. Schmal, hart, mit Blick auf den Neckar. Für den Schlaf eines Dichters reicht’s.',
      use: 'Nicht jetzt. Heute Nacht wird nicht geschlafen, heute Nacht wird dem Bass gefolgt.',
    },
  }),
  at('sofa', 'Sofa', R(TM.sofa.x - 10, TM.sofa.foot - 48, TM.sofa.w + 20, 46), RUG_SPOT, 'up', {
    on: {
      lookat: 'Ein gestreiftes Sofa. Davor ein Teppich, der sich verdächtig wölbt. Wer stellt bitte ein Sofa ins Schlafzimmer eines Dichters?',
      use: 'Hinsetzen? Dann steh ich nie wieder auf. Das Sofa hat Gravitation.',
    },
  }),
  at('faesser', 'Fässer', R(TM.barrels.x, TM.barrels.foot - 52, TM.barrels.w, 52), on(KELLER, TM.barrels.x + 66), 'up', {
    on: {
      lookat: (ctx) =>
        byEra(ctx, [
          'Fässer im Gewölbe. Ich klopfe: hohl. Hölderlin hat seinen Wein offenbar ernst genommen.',
          'Braune Ovale mit schwarzen Streifen. Fässer, sagt der Parser.',
          'Fotos von echten Eichenfässern. Mit Comic-Umriss. Riecht trotzdem nach Wein.',
        ]),
      open: 'Leer. Alle. Der letzte Schluck ist wohl schon zweihundert Jahre her.',
    },
  }),
  {
    id: 'mauerloch',
    name: 'Loch in der Wand',
    rect: R(TM.arch.x, TM.arch.top - 10, TM.arch.w, TM.arch.foot - TM.arch.top + 10),
    walkTo: WALL_SPOT,
    facing: 'up',
    visible: (state) => !!state.getFlag('wallHole'),
    on: {
      lookat: 'Das Loch, durch das Otto verschwunden ist. Dahinter: Abendhimmel und eine Ahnung von sehr viel mehr Farben.',
      use: 'Da durch? Dafür bin ich zu hochauflösend. Ich nehm die Tür.',
    },
  },
  at('attraktor', 'Rössler-Attraktor', R(TM.spiral.cx - TM.spiral.w / 2 - 6, TM.spiral.cy - TM.spiral.h / 2 - 8, TM.spiral.w + 12, TM.pedestal.foot - TM.spiral.cy + TM.spiral.h / 2 + 8), ATTRACTOR_SPOT, 'up', {
    defaultVerb: 'use',
    on: {
      lookat: async (ctx) => {
        await byEra(ctx, [
          'Eine Drahtspirale auf einem Sockel. Sie kreist und kreist, kommt nie zweimal an dieselbe Stelle — und doch nie davon los.',
          'Gelbe Pixel, die eine Spirale bilden. Wenn man blinzelt, sieht man einen Tornado.',
          'Eine Neonspirale, die summt. Pink und Türkis. Sehr 2026.',
        ]);
        await ctx.playerSay('Am Sockel ein Drehknopf mit drei Stellungen und ein Messingschild: „O. R.“');
      },
      use: (ctx) => shiftEra(ctx, 1),
      push: (ctx) => shiftEra(ctx, 1),
      pull: (ctx) => shiftEra(ctx, -1),
      pickup: 'Viel zu schwer. Und ich will nicht wissen, was passiert, wenn man den aus Versehen fallen lässt.',
      talkto: 'Hallo, Attraktor. Na, wieder im Kreis gedreht? Aber nie im selben, ich weiß.',
    },
    onItem: {
      use: {
        loch: 'Ein schwarzes Loch in einen seltsamen Attraktor? Danach gäbe es kein Tübingen mehr. Und keine Goa.',
        muetze: 'Die Mütze auf die Spirale? Sieht aus wie ein sehr kleiner Burschenschaftler. Nein.',
      },
    },
  }),
  {
    id: 'teppich',
    name: 'Teppich',
    polygon: ellipsePts(TM.rug.cx, TM.rug.cy, TM.rug.rx, TM.rug.ry),
    walkTo: RUG_SPOT,
    facing: 'right',
    on: {
      lookat: async (ctx) => {
        if (ctx.flag('rugMoved')) return ctx.playerSay('Zusammengerollt. Darunter war das Loch.');
        await byEra(ctx, [
          'Ein alter Teppich. In der Mitte wölbt er sich ein bisschen. Und er zieht nach unten. Teppiche sollten nicht ziehen.',
          'Ein rotes Oval mit gelbem Rand. In der Mitte ein Pixel, der dunkler ist als die anderen.',
          'Ein Teppich mit Foto-Fransen. In der Mitte eine Beule.',
        ]);
      },
      pull: moveRug,
      push: moveRug,
      pickup: moveRug,
      open: moveRug,
    },
  },
  {
    id: 'loch',
    name: 'schwarzes Loch',
    polygon: ellipsePts(TM.hole.cx, TM.hole.cy, TM.hole.rx + 6, TM.hole.ry + 5),
    walkTo: on(STUBE, TM.hole.cx - 50),
    facing: 'right',
    visible: (state) => !!state.getFlag('rugMoved') && !state.getFlag('holeTaken'),
    on: {
      lookat: (ctx) =>
        byEra(ctx, [
          'Ein echtes schwarzes Loch. Licht kommt nicht raus, Staub schon gar nicht. Am Rand kreisen Sternchen.',
          'Ein schwarzes Oval. Daran ist nichts zu machen: In 1987 sind Löcher Teil vom Boden.',
          'Ein Zeichentrick-Loch. Die Kante steht ein bisschen hoch, wie bei einem Pfannkuchen.',
        ]),
      pickup: takeHole,
      use: 'Reinspringen? Ohne zu wissen, wo das rauskommt? Ich bin Raver, kein Astronaut.',
      talkto: 'Hallo-o-o-o ... Kein Echo. Nicht mal das kommt zurück.',
    },
    onItem: {
      use: {
        muetze: 'Die Mütze ins Loch? Die brauch ich noch. Wofür auch immer.',
        euro: 'Geld in ein schwarzes Loch werfen kann ich auch an der Börse.',
      },
    },
  },
  {
    id: 'otto',
    name: 'Otto R.',
    actor: 'otto',
    defaultVerb: 'talkto',
    visible: (state) => era(state) === 1 && !state.getFlag('ottoFree'),
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Otto R. Weiße Haare in alle Richtungen, Laborkittel, Brille. Ganz aus Pixeln.');
        await ctx.playerSay('Er wirkt sehr zufrieden für jemanden, der seit 1987 in einem Turmzimmer feststeckt.');
      },
      talkto: async (ctx) => {
        ctx.setFlag('ottoMet');
        await ctx.dialog('otto');
      },
      pickup: 'Ihn einstecken? Er würde sofort in seine Zeitebene zurückspringen. Seltsamer Attraktor halt.',
    },
    onItem: {
      give: {
        loch: async (ctx) => {
          await ctx.say('otto', 'Nicht mir geben! Mit vier Pixeln pro Hand kann ich nichts halten.');
          await ctx.say('otto', 'PUT es an die Wand! Da, wo PUT PUT steht!');
        },
        muetze: async (ctx) => {
          await ctx.say('otto', 'Eine Couleurmütze? Ich war nie in einer Verbindung. Ich war immer in einer Rückkopplung.');
        },
        stuhlbein: async (ctx) => {
          await ctx.say('otto', 'Holzwürmer! Ein schönes Beispiel für exponentielles Wachstum. Behalt es.');
        },
      },
    },
  },
];

// ---- room ------------------------------------------------------------------------

export const hoelderlinturmRoom: RoomDef = {
  id: 'hoelderlinturm',
  name: 'Hölderlinturm',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: (state) => turmBg(era(state)) },
    { id: 'glow', depth: Layer.BEHIND, svg: (state) => spiralGlow(era(state)) },
    { id: 'wallhole', depth: Layer.BEHIND, svg: (state) => wallHoleArt(era(state)), visible: (state) => !!state.getFlag('wallHole') },
    {
      id: 'hole',
      depth: Layer.BEHIND,
      svg: (state) => blackHoleArt(era(state)),
      visible: (state) => !!state.getFlag('rugMoved') && !state.getFlag('holeTaken'),
    },
    { id: 'rug', depth: Layer.BEHIND, svg: (state) => rugArt(era(state), !!state.getFlag('rugMoved')) },
  ],

  // The floor of the round room, in front of the back wall.
  // The Turmstube, down the stairs, the cellar, and back up the other side.
  walkArea: WALK,
  // The black hole is a hole in the floor: the way round it is behind.
  holes: (state) =>
    state.getFlag('rugMoved') && !state.getFlag('holeTaken') ? [ellipsePts(TM.hole.cx, TM.hole.cy + 2, TM.hole.rx + 8, 7, 12)] : [],
  // A side view: everyone keeps their size on every floor.
  scaling: () => 0.8,

  assets: { svgActors: [OTTO_ACTOR] },

  entries: {
    door: { x: 166, y: STUBE.back + 12, facing: 'right' },
  },

  actors: [{ id: 'otto', x: OTTO_HOME.x, y: OTTO_HOME.y, facing: 'left' }],

  async onEnter(ctx) {
    ctx.playMusic(ERA_TRACK[era(ctx.state)]);
    await ctx.once('turmIntro', async () => {
      await ctx.wait(300);
      await ctx.playerSay('Der Hölderlinturm, von innen. Oben die Turmstube, unten am Wasser der Gewölbekeller, und alles knarzt.');
      await ctx.playerSay('Und mitten in Hölderlins Stube ... eine leuchtende Drahtspirale? Die stand bei Hölderlin bestimmt noch nicht hier.');
    });
  },

  ambients: [
    {
      // The attractor breathes.
      every: [0, 200],
      run: async (ctx) => {
        const g = ctx.layerObj('glow');
        if (!g) return;
        await ctx.tween(g, { alpha: 0.25, ease: 'Sine.easeInOut' }, 1400);
        await ctx.tween(g, { alpha: 1, ease: 'Sine.easeInOut' }, 1400);
      },
    },
  ],

  hotspots: HOTSPOTS,
};
