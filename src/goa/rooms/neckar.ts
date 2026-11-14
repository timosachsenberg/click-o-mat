import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { OTTO_ACTOR } from '../art/turm';
import { PIGEON_ACTORS } from '../art/epplehaus';
import { NK, PUNT_ACTOR, balustrade, bus, cardOnDeck, cuttersOnDeck, eckhausLayer, floatingPole, floatingCap, flyingLeg, neckarBg, promGap, quayFootY, quayTopY } from '../art/neckar';

// ---- layout ----------------------------------------------------------------------
// The Neckarbrücke in Tübingen at sunset, looking upstream along the
// Neckarfront: the player walks along the bridge in the foreground, in
// front of its sandstone balustrade (one occluder, baseline
// NK.parapetBase). The Altstadt is on the right (so that's the way back to
// the Epplehaus and the Picasso), the bridge goes on to the left towards the forest.
//
// From the right end of the bridge the player can walk round the back of
// the corner house (its own occluder layer hides them on the way) onto the
// promenade on top of the quay wall, and along the Neckarfront to the
// Hölderlinturm, where stairs lead down the wall to a jetty.
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

/** Perspective: on the bridge the player is close to us. The river recedes
 *  towards the bend (size by y); on the promenade on top of the quay wall
 *  distance goes by the wall's waterline below, not by the feet's y. */
const riverScale = (y: number) => Math.max(0.12, 0.15 + ((y - NK.far) / 125) * 0.78);
function scaling(x: number, y: number): number {
  if (y >= 370) return 0.93 + ((y - 370) / 78) * 0.2;
  if (x >= NK.quayFoot[0][0] && y < quayFootY(x) - 2) return riverScale(quayFootY(x));
  return riverScale(y);
}

/** The promenade ends at the Hölderlinturm; stairs lead down to the jetty at its foot. */
const PROM = NK.prom;
const TOWER_SPOT = P(478, 304);
/** Where the bus stops on the bridge (top-left of its art), and where the player gets off. */
const BUS = P(420, 270);
const BUS_STOP = P(652, 432);
/** Behind the tower's door: Otto R.'s voice on the intercom (an invisible actor). */
const DOOR_VOICE = P(452, 296);
/** Where the Put-Put pigeon perches to say the password. */
const PIGEON_PERCH = P(462, 300);
const JETTY_SPOT = P(504, 314);

// ---- the punt ------------------------------------------------------------------------

/** Its course: down from the bend along the quay wall, a turn in front of
 *  the bridge, and back upstream along the island (a Catmull-Rom spline). */
const COURSE: Vec2[] = [P(198, 250), P(262, 268), P(352, 306), P(470, 346), P(572, 363), P(540, 369), P(410, 364), P(262, 334), P(160, 296), P(122, 264), P(152, 247)];
const PASS_MS = 26000;
/** Within reach of a throw from the bridge (fraction of the course). */
const REACH = { t0: 0.26, t1: 0.72 };
/** Where the punt waits between passes: off screen. */
const OFF = P(-400, 300);
/** Where the player throws from, and where the cap washes up. */
const THROW_SPOT = P(680, 420);
const CAP_SPOT = P(506, 332);
/** Where the bolt cutters lie on the deck, and where the punt pole washes up. */
const CUTTERS = P(280, 426);
/** A full döner stamp card someone lost, by the street lamp. */
const CARD = P(812, 430);
const POLE = P(452, 316);

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
  'He, du da oben! Was ist das auf deinem Kopf? DAS hier ist eine Mütze!',
  'Schau mal, der Raver! Ohne Couleur, ohne Kahn, ohne Bier!',
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
      PASS_MS,
      { skippable: false }
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
  cap.setOrigin(0.5).setPosition(target.x, kahn.y - 4).setScale(1.5).setVisible(true);
  await ctx.wait(500);
  // ... upstream, of all directions.
  await ctx.tween(cap, { x: CAP_SPOT.x, y: CAP_SPOT.y, scale: 1, ease: 'Sine.easeInOut' }, 4200);
  ctx.setFlag('capAshore');
  await ctx.animate('kahn', null);
  kahn.setPosition(OFF.x, OFF.y);
  pass.running = false;
  await ctx.repaint();

  await ctx.playerSay('Ups.');
  await ctx.playerSay('Keine Panik: Der Neckar ist hier nur hüfttief. Die waten schon ans andere Ufer.');
  await ctx.playerSay('Und eine Mütze treibt ab. Flussaufwärts. Bis zum Steg am Hölderlinturm.');
  await ctx.playerSay('Der Neckar macht, was er will.');
}

// ---- hotspots ------------------------------------------------------------------------

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

async function toPicasso(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('epplehaus', 'neckar');
}

/** Into the Hölderlinturm, from the end of the promenade — once Otto R.
 *  has heard the password in the right voice. Until then: the intercom. */
async function toTower(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('turmOpen')) {
    ctx.sfx('deny');
    await ctx.playerSay('Zu. Neben der Tür eine uralte Gegensprechanlage. Ich drück mal.');
    await ctx.say('ottoTuer', ctx.flag('turmAsked') ? 'Schon wieder du? Parole!' : 'Halt! Wer da? Ohne Parole kommt hier keiner rein!');
    ctx.setFlag('turmAsked');
    await ctx.dialog('turmtuer');
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
  ctx.place('taubeTuer', PIGEON_PERCH.x, PIGEON_PERCH.y, 'left');
  await ctx.playerSay('Ich halt die Taube an die Gegensprechanlage. Na los, sag’s ihm.');
  await ctx.say('ottoTuer', 'Parole?');
  await ctx.say('taubeTuer', 'Put put!');
  await ctx.say('ottoTuer', 'PUT PUT! Korrekt! Und diese Stimme ... dieses Timbre ... endlich jemand mit Klangfarbe!');
  ctx.sfx('open');
  ctx.setFlag('turmOpen');
  await ctx.say('ottoTuer', 'Komm rein. Und bring den Sänger nächstes Mal wieder mit.');
  await ctx.say('taubeTuer', 'Gurr.');
  ctx.place('taubeTuer', -300, 300);
  await ctx.playerSay('Und weg ist sie. Zurück zu den Krümeln am Epplehaus, schätze ich.');
  await ctx.playerSay('Die Tür ist auf.');
}

/** Over the bridge to the edge of the forest. */
async function toForest(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('waldrand', 'neckar');
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
        if (!ctx.flag('puntSunk')) await ctx.playerSay('Alle naslang kommt einer vorbei und wendet vor der Brücke. Mit Burschenschaftlern drin.');
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
    polygon: [P(300, 232), P(300, 176), P(430, 120), P(560, 50), P(742, 0), P(742, 258)],
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
  {
    // The promenade: no verb of its own, a click just walks there.
    id: 'uferweg',
    name: 'Uferweg',
    polygon: [P(478, 243), P(742, 257), P(742, 281), P(478, 258)],
    on: { lookat: 'Der Weg oben auf der Ufermauer, die Neckarfront entlang bis zum Hölderlinturm.' },
  },
  at('turm', 'Hölderlinturm', R(408, 132, 64, 166), TOWER_SPOT, 'left', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Hölderlinturm. Hier hat Hölderlin sechsunddreißig Jahre gewohnt.');
        await ctx.playerSay('Gedichtet, aufs Wasser geschaut, Besuch verwirrt. Klingt nach einem guten Leben.');
        await ctx.playerSay('Unten an die Turmwand hat jemand „PUT PUT“ gesprüht. Sogar hier.');
        ctx.setFlag('putSeen');
        if (ctx.flag('ottoFree')) await ctx.playerSay('Und oben drin dreht sich eine Spirale durch drei Zeitebenen. Kein Witz.');
      },
      open: toTower,
      use: toTower,
      talkto: toTower,
    },
    onItem: {
      use: { taube: pigeonPassword },
      give: { taube: pigeonPassword },
    },
  }),
  at('weide', 'Trauerweide', R(346, 216, 62, 86), TOWER_SPOT, 'left', {
    on: { lookat: 'Eine Trauerweide. Hängt die Zweige ins Wasser, als hätte sie die Nacht im Picasso verbracht.' },
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
    // The stairs down the wall: a click just walks there.
    id: 'treppe',
    name: 'Treppe zum Steg',
    polygon: [P(510, 256), P(528, 258), P(502, 304), P(484, 300)],
    on: { lookat: 'Eine schmale Treppe die Ufermauer runter, zum Steg am Hölderlinturm.' },
  },
  {
    id: 'steg',
    name: 'Steg',
    polygon: NK.jetty.map(([x, y]) => P(x, y)),
    walkTo: JETTY_SPOT,
    facing: 'down',
    on: {
      lookat: 'Ein kleiner Bootssteg am Hölderlinturm. Hier legen die Stocherkähne an, wenn die Burschen mal müssen.',
    },
  },
  at('laterne', 'Laterne', R(850, 180, 44, 196), P(862, 424), 'up', {
    on: { lookat: 'Eine alte Laterne. Brennt schon. Feierabend für die Sonne, Schichtbeginn für die Laterne.' },
  }),
  at('toPicasso', 'Zum Epplehaus', R(930, 408, 30, 42), P(948, 432), 'right', {
    defaultVerb: 'use',
    on: {
      lookat: 'Da geht’s zurück zum Epplehaus. Dahinter die Dönerbude und die Treppe runter ins Picasso.',
      use: toPicasso,
      open: toPicasso,
    },
  }),
  at('toForest', 'Richtung Wald', R(0, 408, 30, 42), P(12, 432), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Über die Brücke, dann den Weg hoch zum Waldrand. Irgendwo da draußen wummert der Bass.',
      use: toForest,
      open: toForest,
    },
  }),
  at('schloesser', 'Liebesschlösser', R(262, 372, 92, 24), P(300, 420), 'up', {
    on: {
      lookat: 'Liebesschlösser am Geländer. Die meisten hat die Stadt schon abgezwickt. Die Liebe hält, die Schlösser nicht.',
      pickup: 'Die sind zu. Und die Schlüssel liegen im Neckar. So ist das gedacht.',
    },
  }),
  at('stempelkarte', 'Stempelkarte', R(CARD.x - 6, CARD.y - 6, 36, 24), P(CARD.x + 12, 428), 'down', {
    defaultVerb: 'pickup',
    visible: (state) => !state.getFlag('karteTaken'),
    on: {
      lookat: 'Ein Kärtchen auf dem Gehweg. Rot-weiß, mit lauter kleinen Stempeln.',
      pickup: async (ctx) => {
        ctx.setFlag('karteTaken');
        ctx.addItem('stempelkarte');
        await ctx.repaint();
        await ctx.playerSay('Eine Stempelkarte vom Neckar-Kebap. Und sie ist voll!');
      },
    },
  }),
  at('drahtschere', 'Drahtschere', R(CUTTERS.x - 4, CUTTERS.y - 4, 44, 24), P(CUTTERS.x + 18, 424), 'down', {
    defaultVerb: 'pickup',
    visible: (state) => !state.getFlag('schereTaken'),
    on: {
      lookat: 'Eine Drahtschere. Damit hat die Stadt wohl die Liebesschlösser abgeknipst. Und sie dann liegen lassen.',
      pickup: async (ctx) => {
        ctx.setFlag('schereTaken');
        ctx.addItem('drahtschere');
        await ctx.repaint();
        await ctx.playerSay('Eine Drahtschere. Mal sehen, wofür die gut ist.');
      },
    },
  }),
  at('stange', 'Stocherstange', R(POLE.x, POLE.y - 6, 120, 28), JETTY_SPOT, 'down', {
    defaultVerb: 'pickup',
    visible: (state) => !!state.getFlag('capAshore') && !state.getFlag('stangeTaken'),
    on: {
      lookat: 'Die Stocherstange der Burschen. Sie ist mit der Mütze angetrieben.',
      pickup: async (ctx) => {
        ctx.setFlag('stangeTaken');
        ctx.addItem('stange');
        await ctx.repaint();
        await ctx.playerSay('Vier Meter Stange. Passt erstaunlich gut in meine Tasche. Frag nicht.');
      },
    },
  }),
  at('muetze', 'Mütze', R(CAP_SPOT.x - 20, CAP_SPOT.y - 12, 40, 24), JETTY_SPOT, 'down', {
    defaultVerb: 'pickup',
    visible: (state) => !!state.getFlag('capAshore') && !state.getFlag('capTaken'),
    on: {
      lookat: 'Eine Couleurmütze, grün-weiß-rot. Sie dümpelt am Steg beim Hölderlinturm und wartet auf mich.',
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
        await ctx.playerSay('Ein Holzkahn, der schon bessere Jahrzehnte gesehen hat.');
        if (ctx.easyMode) await ctx.playerSay('Altes Holz. Sehr altes, sehr trockenes Holz.');
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
    // The corner house: whoever goes round it to the promenade is behind it.
    { id: 'eckhaus', depth: NK.parapetBase - 1, x: NK.eckhaus.x, y: NK.eckhaus.y, w: NK.eckhaus.w, h: NK.eckhaus.h, svg: eckhausLayer() },
    // After the corner house, so it runs on in front of it.
    { id: 'balustrade', depth: NK.parapetBase, x: 0, y: 160, w: 960, h: 260, svg: `<g transform="translate(0 -160)">${balustrade()}</g>` },
    // The bus the player arrives on; it drives off in the opening scene.
    { id: 'bus', depth: 420, x: BUS.x, y: BUS.y, w: 380, h: 150, svg: bus(), visible: (state) => !state.getFlag('busGone') },
    { id: 'karte', depth: 300, x: CARD.x, y: CARD.y, w: 24, h: 14, svg: cardOnDeck(), visible: (state) => !state.getFlag('karteTaken') },
    // Bolt cutters on the deck, the punt pole at the jetty (once the punt has sunk).
    { id: 'schere', depth: 300, x: CUTTERS.x, y: CUTTERS.y, w: 36, h: 16, svg: cuttersOnDeck(), visible: (state) => !state.getFlag('schereTaken') },
    { id: 'stange', depth: 300, x: POLE.x, y: POLE.y, w: 120, h: 20, svg: floatingPole(), visible: (state) => !!state.getFlag('capAshore') && !state.getFlag('stangeTaken') },
    // The cap, once it has washed up at the jetty.
    {
      id: 'cap',
      depth: 300,
      x: CAP_SPOT.x - 16,
      y: CAP_SPOT.y - 10,
      w: 32,
      h: 20,
      svg: floatingCap(),
      visible: (state) => !!state.getFlag('capAshore') && !state.getFlag('capTaken'),
    },
    // The chair leg in flight (shown only while it flies).
    { id: 'leg', depth: Layer.FRONT, x: 0, y: 0, w: 36, h: 14, svg: flyingLeg(), visible: () => false },
  ],

  // The bridge deck, a passage round the back of the corner house, and the
  // promenade on top of the quay wall, out to the Hölderlinturm.
  walkArea: [
    P(0, 448),
    P(0, 414),
    P(880, 414),
    P(PROM.x1 + 8, quayTopY(PROM.x1 + 8) - 1),
    // ... the stairs down the wall, the jetty, and back up ...
    P(NK.stairs.top[1], quayTopY(NK.stairs.top[1]) - 1),
    P(NK.stairs.bottom[1], 303),
    P(544, 318),
    P(540, 326),
    P(462, 307),
    P(468, 299),
    P(NK.stairs.bottom[0], 301),
    P(NK.stairs.top[0], quayTopY(NK.stairs.top[0]) - 1),
    P(PROM.x0, quayTopY(PROM.x0) - 1),
    P(PROM.x0, quayTopY(PROM.x0) - promGap(PROM.x0) + 1),
    P(PROM.x1 + 8, quayTopY(PROM.x1 + 8) - promGap(PROM.x1 + 8) + 1),
    P(940, 414),
    P(960, 414),
    P(960, 448),
  ],
  scaling,

  music: 'neckar-theme',

  assets: { svgActors: [PUNT_ACTOR, OTTO_ACTOR, ...PIGEON_ACTORS] },

  entries: {
    picasso: { x: 930, y: 432, facing: 'left' },
    // Out of the Hölderlinturm, at the end of the promenade.
    turm: { x: TOWER_SPOT.x, y: TOWER_SPOT.y, facing: 'right' },
    // The start of the game: off the bus.
    bus: { x: BUS_STOP.x, y: BUS_STOP.y, facing: 'down' },
    // Back from the edge of the forest.
    wald: { x: 40, y: 432, facing: 'right' },
  },

  actors: [
    { id: 'kahn', x: OFF.x, y: OFF.y, facing: 'right' },
    // Otto R. on the tower's intercom: a voice, never seen out here.
    { id: 'ottoTuer', x: DOOR_VOICE.x, y: DOOR_VOICE.y, facing: 'down' },
    // The Put-Put pigeon, off screen until it says the password.
    { id: 'taubeTuer', x: -300, y: 300, facing: 'left' },
  ],

  async onEnter(ctx) {
    // A fresh visit: no pass in flight; the punt waits off screen.
    pass.gen++;
    pass.running = false;
    pass.halted = false;
    pass.t = 0;
    ctx.place('kahn', OFF.x, OFF.y, 'right');
    // A save from mid-intro (older builds) must not strand the bus here.
    if (ctx.flag('once:neckarIntro') && !ctx.flag('busGone')) {
      ctx.setFlag('busGone');
      await ctx.repaint();
    }
    // The game starts here: off the bus, onto the bridge.
    await ctx.once('neckarIntro', async () => {
      ctx.sfx('open');
      await ctx.wait(700);
      await ctx.playerSay('Endstation Neckarbrücke. Alles aussteigen.');
      ctx.face(ctx.activeCharId, 'right');
      await ctx.wait(300);
      ctx.sfx('step');
      await ctx.tween(ctx.layerObj('bus'), { x: '+=900', ease: 'Quad.easeIn' }, 2200);
      ctx.setFlag('busGone');
      await ctx.repaint();
      ctx.face(ctx.activeCharId, 'down');
      await ctx.playerSay('Der Neckar im Abendrot. Kitschig. Schön.');
      await ctx.playerSay('Heute Nacht steigt im Wald eine Goa. Und ohne Passwort kommt da keiner rein.');
      if (ctx.easyMode) await ctx.playerSay('Wenn das einer weiß, dann Ali. Im Picasso, gleich hinterm Epplehaus.');
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
