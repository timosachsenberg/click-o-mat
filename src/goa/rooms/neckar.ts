import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { NK, PUNT_ACTOR, balustrade, floatingCap, flyingLeg, neckarBg } from '../art/neckar';

// ---- layout ----------------------------------------------------------------------
// The Neckarbrücke in Tübingen at sunset, looking upstream along the
// Neckarfront: the player walks along the bridge in the foreground, in
// front of its sandstone balustrade (one occluder, baseline
// NK.parapetBase). The Altstadt is on the right (so that's the way back to
// the Picasso); on the left a gap in the balustrade leads down a few steps
// onto a jetty, and the bridge goes on towards the forest.
//
// Every so often a Stocherkahn full of Burschenschaftler comes down the
// river along the quay wall, turns in front of the bridge (as they do) and
// poles back upstream. It is an actor (so its hotspot follows it and its
// crew can talk), moved by the ambient below along a curve; perspective
// scaling and depth come from the room's scaling map like for anyone else.
// Throw the worm-eaten chair leg into it and the woodworms eat it from
// under them — only a cap floats ashore.
//
// State: `puntSunk`, `capAshore`, `capTaken` (+ the inventory). The pass
// itself is transient staging and restarts on room entry.

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** Perspective: the river (and the jetty) recede towards the bend; on the
 *  steps and the bridge the player is close to us. */
function scaling(_x: number, y: number): number {
  if (y >= 370) return 0.93 + ((y - 370) / 78) * 0.2;
  return Math.max(0.12, 0.15 + ((y - NK.far) / 125) * 0.78);
}

// ---- the punt ------------------------------------------------------------------------

/** Its course: down from the bend along the quay wall, a turn in front of
 *  the bridge, and back upstream along the island (a Catmull-Rom spline). */
const COURSE: Vec2[] = [P(198, 250), P(300, 270), P(430, 306), P(540, 344), P(520, 364), P(400, 360), P(256, 332), P(160, 296), P(122, 264), P(152, 247)];
const PASS_MS = 26000;
/** Within reach of a throw from the bridge (fraction of the course). */
const REACH = { t0: 0.26, t1: 0.72 };
/** Where the punt waits between passes: off screen. */
const OFF = P(-400, 300);
/** Where the player throws from, and where the cap washes up. */
const THROW_SPOT = P(680, 420);
const CAP_SPOT = P(208, 364);

function course(t: number): Vec2 {
  const n = COURSE.length - 1;
  const i = Math.min(n - 1, Math.floor(t * n));
  const u = t * n - i;
  const at = (k: number) => COURSE[Math.max(0, Math.min(n, k))];
  const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  return P(cr(p0.x, p1.x, p2.x, p3.x), cr(p0.y, p1.y, p2.y, p3.y));
}

/** The current pass. `gen` is bumped on room entry: a pass from an earlier
 *  visit stops touching the (rebuilt) actor. `halted` freezes the punt
 *  where it is — it's about to be eaten. */
const pass = { gen: 0, running: false, t: 0, halted: false };

const SHOUTS = [
  'Ein Prosit der Gemütlichkeit!',
  'Stocher fester, Fuchs!',
  'Silentium! Der Kahn hat Vorfahrt!',
  'Ad fundum, Bundesbrüder!',
  'Ahoi, ihr Landratten da oben!',
  'An der Brücke wird gewendet! Das ist Tradition!',
];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

async function puntPass(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('puntSunk') || pass.running || pass.halted) return;
  const gen = pass.gen;
  const alive = () => gen === pass.gen && ctx.state.currentRoom === 'neckar';
  const kahn = ctx.actor('kahn');
  const start = course(0);
  kahn.setPosition(start.x, start.y);
  ctx.face('kahn', 'right');
  pass.running = true;
  pass.t = 0;
  const prog = { t: 0 };
  let shouted = false;
  let heading: Facing = 'right';
  try {
    await ctx.tween(
      prog,
      {
        t: 1,
        ease: 'Linear',
        onUpdate: () => {
          if (!alive() || pass.halted) return;
          pass.t = prog.t;
          const p = course(prog.t);
          const to: Facing = Math.abs(p.x - kahn.x) < 0.05 ? heading : p.x > kahn.x ? 'right' : 'left';
          if (to !== heading) ctx.face('kahn', (heading = to));
          kahn.setPosition(p.x, p.y);
          if (!shouted && prog.t > 0.3) {
            shouted = true;
            if (!ctx.busy) void ctx.say('kahn', pick(SHOUTS)).catch(() => {});
          }
        },
      },
      PASS_MS
    );
  } finally {
    if (alive()) {
      pass.running = false;
      if (!pass.halted) {
        pass.t = 0;
        kahn.setPosition(OFF.x, OFF.y);
      }
    }
  }
}

/** Throw the chair leg: only while the punt is close enough. */
async function throwLeg(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('puntSunk')) return;
  if (!pass.running) {
    await ctx.playerSay('Gerade ist kein Kahn in Sicht. Aber der nächste kommt bestimmt.');
    return;
  }
  if (pass.t < REACH.t0) {
    await ctx.playerSay('Noch zu weit weg. So weit werfe ich nicht. Ich warte, bis er näher ist.');
    return;
  }
  if (pass.t > REACH.t1) {
    await ctx.playerSay('Zu spät, der ist schon vorbei. Beim nächsten Kahn.');
    return;
  }
  pass.halted = true;
  const kahn = ctx.actor('kahn');
  const k = scaling(kahn.x, kahn.y);
  const target = P(kahn.x - 10 * k, kahn.y - 28 * k);

  ctx.removeItem('stuhlbein');
  await ctx.playerSay('Holzwürmer: Mahlzeit!');
  // The leg sails over the balustrade, spinning, and lands in the punt.
  const leg = ctx.layerObj('leg');
  const from = P(ctx.player.x, ctx.player.y - 110);
  leg.setOrigin(0.5).setPosition(from.x, from.y).setAngle(0).setVisible(true);
  const apex = P((from.x + target.x) / 2, Math.min(from.y, target.y) - 70);
  await ctx.tween(leg, { x: apex.x, y: apex.y, angle: 360, ease: 'Sine.easeOut' }, 450);
  await ctx.tween(leg, { x: target.x, y: target.y, angle: 720, ease: 'Sine.easeIn' }, 450);
  leg.setVisible(false);
  ctx.sfx('step');

  ctx.face('kahn', 'down');
  await ctx.say('kahn', 'Hoppla! Wer wirft denn hier mit Möbeln?');
  await ctx.say('kahn', 'Ein Stuhlbein. Ist das ein Fehdehandschuh?');
  void ctx.animate('kahn', 'panic');
  ctx.sfx('zap');
  await ctx.say('kahn', 'Moment ... es knuspert. Warum knuspert der Kahn?');
  await ctx.say('kahn', 'Holzwürmer! Die fressen uns den Kahn unterm Hintern weg!');
  void ctx.animate('kahn', 'sink1');
  await ctx.say('kahn', 'Silentium! Ein Bursch geht nicht unter!');
  void ctx.animate('kahn', 'sink2');
  await ctx.say('kahn', 'Rettet das Bier!');
  void ctx.animate('kahn', 'sink3');
  ctx.sfx('deny');
  await ctx.say('kahn', 'Blubb.');
  void ctx.animate('kahn', 'gone');
  ctx.setFlag('puntSunk');

  // Only a cap comes back up, and drifts over to the jetty.
  const cap = ctx.layerObj('cap');
  cap.setOrigin(0.5).setPosition(target.x, kahn.y - 4).setVisible(true);
  await ctx.wait(500);
  await ctx.tween(cap, { x: CAP_SPOT.x, y: CAP_SPOT.y, ease: 'Sine.easeInOut' }, 3200);
  ctx.setFlag('capAshore');
  await ctx.animate('kahn', null);
  kahn.setPosition(OFF.x, OFF.y);
  pass.running = false;
  await ctx.repaint();

  await ctx.playerSay('Ups.');
  await ctx.playerSay('Keine Panik: Der Neckar ist hier nur hüfttief. Die waten schon ans andere Ufer.');
  await ctx.playerSay('Und eine Mütze treibt rüber zum Steg. Wie nett.');
}

// ---- hotspots ------------------------------------------------------------------------

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

async function toPicasso(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('picasso', 'door');
}

async function toForest(ctx: ScriptContext): Promise<void> {
  if (!ctx.hasItem('muetze')) {
    if (ctx.flag('capAshore')) {
      await ctx.playerSay('Erst hol ich mir noch die Mütze da unten am Steg.');
    } else {
      await ctx.playerSay('Moment. Die Burschen da unten haben so schicke Mützen.');
      await ctx.playerSay('Irgendwas sagt mir, so eine brauch ich noch.');
    }
    return;
  }
  await ctx.playerSay('Folge dem Bass. Chakabunga. Und Mütze auf, wenn’s drauf ankommt.');
  ctx.setFlag('chapterDone');
  ctx.sfx('win');
  ctx.showTitle('FORTSETZUNG FOLGT …');
}

const HOTSPOTS: HotspotDef[] = [
  {
    id: 'neckar',
    name: 'Neckar',
    polygon: [P(150, 244), P(246, 250), P(812, 372), P(0, 372), P(0, 304)],
    walkTo: THROW_SPOT,
    facing: 'up',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Neckar im Abendrot. Rosa, orange, gemütlich, voller Stocherkähne.');
        if (!ctx.flag('puntSunk')) await ctx.playerSay('Alle paar Minuten kommt einer vorbei und wendet vor der Brücke. Mit Burschenschaftlern drin.');
        else await ctx.playerSay('Jetzt mit einem Kahn weniger. Und einem Schwarm satter Holzwürmer.');
      },
      use: 'Baden? Ohne Badehose? Doch nicht vor der ganzen Altstadt.',
      pickup: 'Den ganzen Neckar? So groß sind meine Taschen nicht.',
    },
    onItem: {
      use: {
        stuhlbein: 'Einfach ins Wasser? Schade ums Holz. Die Würmer haben was Besseres verdient.',
        muetze: 'Die hab ich gerade erst rausgefischt.',
      },
    },
  },
  {
    id: 'altstadt',
    name: 'Neckarfront',
    polygon: [P(300, 238), P(300, 176), P(430, 120), P(560, 50), P(742, 0), P(742, 282)],
    walkTo: P(600, 424),
    facing: 'up',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Die Neckarfront. Bunte Giebel, Fensterläden, und in den ersten Fenstern geht das Licht an.');
        await ctx.playerSay('In jedem zweiten Haus eine WG, in jedem dritten eine Verbindung.');
      },
    },
  },
  at('schloss', 'Schloss', R(244, 134, 100, 36), P(400, 424), 'up', {
    on: { lookat: 'Schloss Hohentübingen, oben auf dem Berg. Von da hat man alles im Blick. Außer die Goa.' },
  }),
  at('stiftskirche', 'Stiftskirche', R(464, 56, 28, 80), P(478, 424), 'up', {
    on: {
      lookat: 'Der Turm der Stiftskirche. Von da oben sieht man bestimmt bis in den Wald. Und den Bass.',
    },
  }),
  {
    id: 'quay',
    name: 'Ufermauer',
    polygon: [P(250, 236), P(742, 280), P(742, 357), P(246, 250)],
    walkTo: P(600, 424),
    facing: 'up',
    on: { lookat: 'Die alte Mauer am Ufer. Unten moosig, oben Laternen. Die brennen schon.' },
  },
  at('eckhaus', 'Eckhaus', R(742, 0, 218, 372), P(840, 424), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Das Eckhaus an der Brücke, mit Erker und spitzem Dach.');
        await ctx.playerSay('Im Erker brennt schon Licht. Da lernt wer für die Klausur. Oder tut so.');
      },
      open: 'Da wohn ich nicht. Leider. Bei dem Blick.',
    },
  }),
  at('turm', 'Hölderlinturm', R(254, 180, 32, 72), P(300, 424), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Hölderlinturm. Hier hat Hölderlin sechsunddreißig Jahre gewohnt.');
        await ctx.playerSay('Gedichtet, aufs Wasser geschaut, Besuch verwirrt. Klingt nach einem guten Leben.');
      },
      open: 'Zu weit weg. Aber irgendwas sagt mir: Da komm ich noch hin.',
    },
  }),
  at('weide', 'Trauerweiden', R(220, 208, 34, 46), P(300, 424), 'up', {
    on: { lookat: 'Trauerweiden. Hängen die Zweige ins Wasser, als hätten sie die Nacht im Picasso verbracht.' },
  }),
  at('platanen', 'Neckarinsel', R(0, 0, 112, 300), P(150, 424), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Die Neckarinsel mit der Platanenallee. Riesige alte Bäume, schwarz vor dem Abendrot.');
        await ctx.playerSay('Älter als jede Burschenschaft. Knapp.');
      },
      pickup: 'Ein Blatt vielleicht. Aber wozu.',
    },
  }),
  at('sonne', 'Sonne', R(94, 198, 54, 44), P(150, 424), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Die Sonne geht gleich unter. Genau über der Flussbiegung, wie bestellt.');
        await ctx.playerSay('Wenn sie weg ist, fängt im Wald der Bass an.');
      },
      pickup: 'Die ist in ein paar Minuten sowieso weg.',
    },
  }),
  at('gelaender', 'Brückengeländer', R(0, 366, 960, 42), P(680, 420), 'up', {
    on: {
      lookat: 'Das Geländer der Neckarbrücke. Sandstein, noch warm von der Sonne. Perfekt zum Drüberlehnen und Runterspucken. Mach ich aber nicht.',
      push: 'Hält. Zum Glück.',
    },
  }),
  {
    id: 'steg',
    name: 'Steg',
    polygon: NK.jetty.map(([x, y]) => P(x, y)),
    walkTo: P(110, 360),
    facing: 'right',
    on: {
      lookat: 'Ein kleiner Bootssteg. Hier legen die Stocherkähne an, wenn die Burschen mal müssen.',
    },
  },
  at('treppe', 'Treppe', R(58, 366, 60, 46), P(86, 392), 'up', {
    on: { lookat: 'Ein paar Stufen runter zum Steg.' },
  }),
  at('laterne', 'Laterne', R(850, 180, 44, 196), P(862, 424), 'up', {
    on: { lookat: 'Eine alte Laterne. Brennt schon. Feierabend für die Sonne, Schichtbeginn für die Laterne.' },
  }),
  at('toPicasso', 'Zum Picasso', R(930, 408, 30, 42), P(948, 432), 'right', {
    defaultVerb: 'use',
    on: {
      lookat: 'Da geht’s zurück in die Altstadt. Und die Treppe runter ins Picasso.',
      use: toPicasso,
      open: toPicasso,
    },
  }),
  at('toForest', 'Richtung Wald', R(0, 408, 30, 42), P(12, 432), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Über die Brücke, dann immer dem Bass nach. Irgendwo da draußen ist der Wald.',
      use: toForest,
      open: toForest,
    },
  }),
  at('muetze', 'Mütze', R(CAP_SPOT.x - 20, CAP_SPOT.y - 14, 40, 26), P(166, 360), 'right', {
    defaultVerb: 'pickup',
    visible: (state) => !!state.getFlag('capAshore') && !state.getFlag('capTaken'),
    on: {
      lookat: 'Eine Couleurmütze, grün-weiß-rot. Sie dümpelt am Steg und wartet auf mich.',
      pickup: async (ctx) => {
        ctx.setFlag('capTaken');
        ctx.addItem('muetze');
        await ctx.repaint();
        await ctx.playerSay('Ein bisschen nass. Aber eine echte Burschenschaftsmütze.');
        await ctx.playerSay('Die kann ich bestimmt noch gebrauchen.');
      },
    },
  }),
  {
    id: 'kahn',
    name: 'Stocherkahn',
    actor: 'kahn',
    walkTo: THROW_SPOT,
    facing: 'up',
    visible: (state) => !state.getFlag('puntSunk'),
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Ein Stocherkahn voller Burschenschaftler. Mützen, Bänder, ein Kasten Bier.');
        await ctx.playerSay('Der Kahn ist alt. Altes Holz. Sehr altes, sehr trockenes Holz.');
      },
      talkto: async (ctx) => {
        await ctx.playerSay('Ahoi! Wo geht’s denn hin?');
        await ctx.say('kahn', pick(['Wohin der Neckar will, Fuchs!', 'Zur nächsten Kneipe, und dann zur übernächsten!', 'Das geht dich nichts an, du Nicht-Mitglied!']));
      },
      pickup: 'Einen ganzen Kahn? Mitsamt Burschen? Nein danke.',
      push: 'Von hier oben? Ich bin doch kein Stocherer.',
    },
    onItem: {
      use: { stuhlbein: throwLeg },
      give: {
        stuhlbein: async (ctx) => {
          await ctx.playerSay('Geben? Die fangen bestimmt nicht. Ich werf’s einfach.');
          await throwLeg(ctx);
        },
      },
    },
  },
];

// ---- room ------------------------------------------------------------------------

export const neckarRoom: RoomDef = {
  id: 'neckar',
  name: 'Neckarbrücke',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: neckarBg() },
    { id: 'balustrade', depth: NK.parapetBase, x: 0, y: 160, w: 960, h: 260, svg: `<g transform="translate(0 -160)">${balustrade()}</g>` },
    // The cap, once it has washed up at the jetty.
    {
      id: 'cap',
      depth: 300,
      x: CAP_SPOT.x - 20,
      y: CAP_SPOT.y - 12,
      w: 40,
      h: 24,
      svg: floatingCap(),
      visible: (state) => !!state.getFlag('capAshore') && !state.getFlag('capTaken'),
    },
    // The chair leg in flight (shown only while it flies).
    { id: 'leg', depth: Layer.FRONT, x: 0, y: 0, w: 36, h: 14, svg: flyingLeg(), visible: () => false },
  ],

  walkArea: [
    P(0, 448),
    P(0, 414),
    P(60, 414),
    P(62, 372),
    P(10, 368),
    P(10, 352),
    P(170, 352),
    P(186, 366),
    P(112, 371),
    P(114, 414),
    P(960, 414),
    P(960, 448),
  ],
  scaling,

  music: 'neckar-theme',

  assets: { svgActors: [PUNT_ACTOR] },

  entries: {
    picasso: { x: 930, y: 432, facing: 'left' },
  },

  actors: [{ id: 'kahn', x: OFF.x, y: OFF.y, facing: 'right' }],

  async onEnter(ctx) {
    // A fresh visit: no pass in flight; the punt waits off screen.
    pass.gen++;
    pass.running = false;
    pass.halted = false;
    pass.t = 0;
    ctx.place('kahn', OFF.x, OFF.y, 'right');
    await ctx.once('neckarIntro', async () => {
      await ctx.wait(400);
      await ctx.playerSay('Abendrot über dem Neckar. Alis Uhr geht also mal wieder ein paar Stunden vor.');
      await ctx.playerSay('Umso besser: Über die Neckarbrücke, und wenn die Sonne weg ist, immer dem Bass nach.');
    });
  },

  ambients: [
    {
      // The punts come down the river, one after the other.
      every: [2500, 6000],
      run: puntPass,
    },
  ],

  hotspots: HOTSPOTS,
};
