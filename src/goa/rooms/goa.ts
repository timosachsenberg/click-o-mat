import { Layer, type Facing, type HotspotDef, type LayerDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { musicFile } from '../music';
import { DANCER_FRAMES, DANCER_SIZES, DH, DW, FAR, FAR_FRAMES, GO, LOOKS, dancerAnim, dancerKey, foregroundShrooms, goaBg, lasers, type DancerSize } from '../art/goa';
import { VOICE_ACTOR } from '../art/turm';
import { portalArt } from '../art/goaeingang';
import { wormholeToll } from './waldrand';

// ---- layout ----------------------------------------------------------------------
// The Goa: the dance floor in the forest, behind the gate. Blacklight, a
// stage with a huge mandala, a canopy of UV threads, giant glowing mushrooms,
// lasers — and dancers everywhere: a far crowd (one animated strip) and two
// dozen single dancers as animated occluder layers, so the player walks and
// dances among them. All of them stomp in time with the music (140 bpm).
//
// State: `goaDanced` (the first dance ends the chapter: `chapterDone`).

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

/** One beat at 140 bpm, ms; the dancers' four frames span two beats. */
const BEAT = 428;
const FPS = 4000 / (2 * BEAT);

/** The single dancers: feet position, look, size. Kept clear of the floor's centre. */
const DANCERS: Array<[x: number, y: number, look: number, size: DancerSize]> = [
  [176, 366, 3, 'm'], [44, 372, 0, 'm'], [250, 350, 5, 'm'], [330, 346, 1, 'm'], [640, 348, 2, 'm'], [716, 352, 6, 'm'], [790, 364, 4, 'm'], [866, 350, 7, 'm'],
  [60, 400, 2, 'l'], [150, 430, 6, 'l'], [236, 396, 4, 'l'], [300, 436, 7, 'l'], [668, 438, 0, 'l'], [730, 398, 5, 'l'], [820, 428, 1, 'l'], [900, 402, 3, 'l'],
  [398, 344, 7, 'm'], [566, 344, 0, 'm'],
];

const dancerLayers: LayerDef[] = DANCERS.map(([x, y, look, size], i) => ({
  id: `dancer${i}`,
  depth: y,
  x: Math.round(x - (DW * DANCER_SIZES[size]) / 2),
  y: Math.round(y - DH * DANCER_SIZES[size]),
  anim: dancerAnim(look, size),
}));

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Dance: the player stomps along for a few bars. The first time ends the chapter. */
async function dance(ctx: ScriptContext): Promise<void> {
  const sprite = ctx.player.sprite;
  const y = sprite.y;
  ctx.face(ctx.activeCharId, 'down');
  await ctx.playerSay(pick(['Und jetzt: tanzen.', 'Der Bass geht direkt in die Knie.', 'Augen zu. Und los.']));
  for (let i = 0; i < 8; i++) {
    await ctx.tween(sprite, { y: y - 14, ease: 'Quad.easeOut' }, BEAT / 2);
    await ctx.tween(sprite, { y, ease: 'Quad.easeIn' }, BEAT / 2);
    if (i === 3) ctx.face(ctx.activeCharId, pick<Facing>(['left', 'right']));
  }
  sprite.y = y;
  ctx.face(ctx.activeCharId, 'down');
  if (!ctx.flag('goaDanced')) {
    ctx.setFlag('goaDanced');
    ctx.setFlag('chapterDone');
    await ctx.playerSay('War ja ein Kinderspiel.');
    await ctx.playerSay('Bei der Halloweenparty reinzukommen war schwieriger.');
    ctx.sfx('win');
    ctx.showTitle('FORTSETZUNG FOLGT …');
    return;
  }
  await ctx.playerSay(pick(['Wann fängt das Lied eigentlich an? Ich warte seit drei Stunden auf den Refrain.', 'Ich hoffe sehr, dass der Pilz nicht echt ist. Da hat gerade einer reingebissen.', 'Die Magic Woman wirkt immer noch! Mein Herz schlägt mit 145 BPM.']));
}

/** The far end of the wormhole pair: it came down on the dance floor. */
const PORTAL = { x: GO.floor.cx - 96, y: GO.floor.cy + 8, rx: 48, ry: 15 };
const LANDING = P(PORTAL.x, PORTAL.y + 2);

async function backThroughPortal(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Zurück zum Waldrand? Na gut. Festhalten.');
  ctx.sfx('zap');
  ctx.flash(0xb06aff, 300);
  wormholeToll(ctx);
  await ctx.goToRoom('waldrand', 'portal');
}

/** What the wormhole's toll may leave in the pockets, as the player names it. */
const KEPT: Record<string, string> = { euro: 'die Zwei-Euro-Münze', magicwoman: 'die Magic Woman', dose: 'die leere Dose', cent25: 'das 25-Cent-Stück' };

/** First arrival: out of the hole, in the middle of the dance floor, with
 *  empty pockets — and the Goazwerg wants the password anyway. */
async function landing(ctx: ScriptContext): Promise<void> {
  const sprite = ctx.player.sprite;
  const y = sprite.y;
  sprite.y = y - 420;
  ctx.flash(0xb06aff, 400);
  await ctx.tween(sprite, { y, ease: 'Bounce.easeOut' }, 900);
  // (A skipped cutscene must not leave the player hanging in the air.)
  sprite.y = y;
  ctx.shake(300, 0.012);
  await ctx.playerSay('Uff.');
  await ctx.playerSay('Leuchtende Pilze. Fäden aus Licht bis in die Baumkronen. Und alle tanzen. Um mich rum.');
  await ctx.playerSay('Ich bin mitten auf der Tanzfläche gelandet!');
  if (ctx.flag('pocketsLost')) {
    const left = ctx.state.inventory.map((id) => KEPT[id]).filter(Boolean);
    if (left.length) {
      await ctx.playerSay('Moment. Meine Taschen. Fast alles weg!');
      await ctx.playerSay(`Das Wurmloch hat Zoll kassiert. Nur ${left[0]} hat es mir gelassen. Kleingeld und Pfand nimmt es offenbar nicht.`);
    } else {
      await ctx.playerSay('Moment. Meine Taschen. Leer! Alles weg.');
      await ctx.playerSay('Das Wurmloch hat Zoll kassiert. Egal. Hier brauch ich nur noch Beine.');
    }
  }
}

/** Whoever falls out of the hole without having been let in meets the
 *  Goazwerg: he walks over from the gate and wants the password. */
async function bouncerCheck(ctx: ScriptContext): Promise<void> {
  // He stops in front of the dancers, so he isn't hidden behind one.
  ctx.place('tuersteher', 20, 442, 'right');
  await ctx.walkTo('tuersteher', LANDING.x - 84, 442);
  ctx.face(ctx.activeCharId, 'left');
  if (ctx.flag('bouncerMetFloor')) {
    await ctx.say('tuersteher', 'Du schon wieder. Aus dem Loch. Passwort?');
  } else {
    ctx.setFlag('bouncerMetFloor');
    await ctx.say('tuersteher', 'Halt! Stopp! Musik ... nein, Musik bleibt an.');
    await ctx.playerSay('Und wer bist du? Ein ... Gartenzwerg?');
    await ctx.say('tuersteher', 'Goazwerg. Türsteher. Und das ist eine Saunamütze, bevor du fragst.');
    await ctx.say('tuersteher', 'Du bist nicht durchs Tor gekommen. Du bist aus einem Loch im Boden gefallen. Respekt. Trotzdem: Passwort?');
  }
  await ctx.dialog('tuersteher');
  if (ctx.flag('goaEntered')) {
    await ctx.say('tuersteher', 'Dann tanz. Ich muss zurück ans Tor. Und nächstes Mal vorne rum.');
    await ctx.walkTo('tuersteher', 34, 442);
    ctx.place('tuersteher', -300, 420);
    return;
  }
  await ctx.say('tuersteher', 'Ohne Passwort wird hier nicht getanzt. Könntest ja nen Zivi sein. Ab vors Tor.');
  ctx.place('tuersteher', -300, 420);
  await ctx.goToRoom('goaeingang', 'tor');
}

async function toEntrance(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('goaeingang', 'tor');
}

const HOTSPOTS: HotspotDef[] = [
  at('himmel', 'Sternenhimmel', R(0, 0, 960, 110), P(480, 420), 'up', {
    on: { lookat: 'Vollmond, Milchstraße, und darunter Laser in sechs Farben. Der Himmel macht mit.' },
  }),
  at('faeden', 'Schwarzlicht-Fäden', R(40, 14, 880, 110), P(480, 420), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Tausende leuchtende Fäden, von Baum zu Baum gespannt. Sie biegen sich zu Kurven, obwohl jeder einzelne gerade ist.');
        await ctx.playerSay('Otto würde sagen: ein Attraktor. Ich sage: wunderschön.');
      },
      pickup: 'Wenn ich an einem ziehe, locke ich vielleicht ne Spinne an.',
    },
  }),
  at('pilze', 'Leuchtpilze', R(150, 190, 160, 140), P(250, 350), 'up', {
    on: {
      lookat: 'Riesige Pilze, die von innen leuchten. Pink, Türkis, Grün. Echt? Deko? Hier fragt das keiner.',
      pickup: 'Ich kenn mich nur mit Röhrlingen aus.',
      use: 'Anknabbern? Bei Pilzen, die von innen leuchten? Ich lass sie lieber den Zwergen.',
      talkto: 'Hallo, Pilz. ... Er hat nicht geantwortet. Liegt wohl an mir.',
    },
  }),
  at('pilze2', 'Leuchtpilze', R(640, 170, 190, 160), P(720, 350), 'up', {
    on: {
      lookat: 'Noch mehr Zauberpilze. Der große grüne pulsiert im Takt. Oder ich.',
      pickup: 'Das ist aber kein Maronenröhrling.',
      use: 'Anknabbern? Bei Pilzen, die von innen leuchten? Ich sammel nur was ich bestimmen kann.',
    },
  }),
  at('chai', 'Chai-Stand', R(48, 230, 116, 96), P(150, 350), 'left', {
    defaultVerb: 'talkto',
    on: {
      lookat: 'Ein Chai-Stand unter einem gestreiften Dach. Der Kessel dampft, es riecht nach Zimt und Kardamom.',
      talkto: async (ctx) => {
        await ctx.playerSay('EINEN CHAI, BITTE! WAS KOSTET DER?');
        await ctx.playerSay('Die Chai-Frau zeigt auf ein Schild: „Ein Lächeln. Oder zwei Euro. Lächeln bevorzugt.“');
        await ctx.playerSay('Ich lächle. Der Chai ist heiß, süß und perfekt.');
      },
      use: 'Selber einschenken? Die Chai-Frau hat alles im Griff. Und im Blick.',
    },
  }),
  at('boxen', 'Boxentürme', R(GO.stage.x0 - 64, GO.stage.top + 58, 58, 140), P(310, 346), 'up', {
    on: {
      lookat: 'Ein Boxenturm, höher als der Hölderlinturm. Gefühlt.',
      use: async (ctx) => {
        await ctx.playerSay('Ich stell mich direkt davor.');
        ctx.shake(500, 0.012);
        await ctx.playerSay('Da flattert die Hose.');
      },
    },
  }),
  at('boxen2', 'Boxentürme', R(GO.stage.x1 + 6, GO.stage.top + 58, 58, 140), P(650, 346), 'up', {
    on: { lookat: 'Der zweite Boxenturm. Stereo ist hier Ehrensache.' },
  }),
  at('mandala', 'Mandala', R(396, 80, 168, 120), P(480, 344), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Ein riesiges Mandala über der Bühne. In der Mitte ein Auge.');
        await ctx.playerSay('Je länger ich hinschaue, desto mehr fühle ich mich beobachtet. Nebeneffekt der Magic Woman. Glaub ich.');
      },
    },
  }),
  {
    id: 'dj',
    name: 'DJ',
    rect: R(440, 212, 80, 50),
    walkTo: P(480, 344),
    facing: 'up',
    defaultVerb: 'talkto',
    on: {
      lookat: 'Der DJ. Kopfhörer, eine Hand in der Luft - quasi Antenne - die andere am Regler.',
      talkto: async (ctx) => {
        await ctx.playerSay('HALLO! SUPER SET!');
        await ctx.say('dj', pick(['WAS?', 'HÄ?!', 'WÜNSCHE NEHM ICH NICHT AN!']));
        await ctx.playerSay('ICH WOLLTE DOCH GAR NICHTS WÜNSCHEN!');
        await ctx.say('dj', 'NOCH EINEN AUF DIE GEMÜTLICHKEIT? NUR ÜBER MEINE LEICHE!');
      },
    },
  },
  at('menge', 'Tanzende', R(FAR.x, FAR.y + 20, FAR.w, FAR.h - 20), P(480, 346), 'up', {
    defaultVerb: 'talkto',
    on: {
      lookat: 'So viele Leute. Dreads, Glitzer, Leuchtarmbänder, nackte Füße. Alle lächeln. Keiner zeigt irgendwas an.',
      talkto: async (ctx) => {
        await ctx.playerSay('HALLO! SCHÖN HIER, ODER?');
        await ctx.playerSay(pick(['Jemand hat „JAAA!“ gerufen. Oder „Chai!“. Schwer zu sagen.', 'Jemand hat mir ein Leuchtarmband hingehalten und ist weitergetanzt.', 'Eine nickt. Im Takt. Ich zähl das als Ja.']));
      },
    },
  }),
  {
    id: 'tanzflaeche',
    name: 'Tanzfläche',
    polygon: Array.from({ length: 14 }, (_, k) => {
      const a = (k / 14) * Math.PI * 2;
      return P(GO.floor.cx + Math.cos(a) * GO.floor.rx * 0.8, GO.floor.cy + Math.sin(a) * GO.floor.ry * 0.9);
    }),
    walkTo: P(GO.floor.cx, GO.floor.cy + 4),
    facing: 'down',
    defaultVerb: 'use',
    on: {
      lookat: 'Eine Spirale in Leuchtfarbe, mitten auf der Lichtung. Hier ist der Bass am dichtesten.',
      use: dance,
    },
  },
  at('portal', 'Wurmloch', R(PORTAL.x - PORTAL.rx, PORTAL.y - PORTAL.ry - 4, PORTAL.rx * 2, PORTAL.ry * 2 + 8), P(PORTAL.x + 50, PORTAL.y + 6), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Das andere Ende von meinem Wurmloch-Paar. Liegt flach auf der Tanzfläche. Die anderen tanzen einfach drum herum. Hoffe es fällt keiner rein.',
      open: backThroughPortal,
      use: backThroughPortal,
      pickup: 'Das klebt am Boden wie Kaugummi. Kosmischer Kaugummi.',
    },
  }),
  at('toEingang', 'Zum Eingang', R(0, 250, 40, 196), P(40, 410), 'left', {
    defaultVerb: 'use',
    on: {
      lookat: 'Da geht’s zurück zum Tor. Und zum Goazwerg.',
      use: toEntrance,
      open: toEntrance,
    },
  }),
];

export const goaRoom: RoomDef = {
  id: 'goa',
  name: 'Goa',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: goaBg() },
    { id: 'portal', depth: Layer.BEHIND, x: PORTAL.x - PORTAL.rx, y: PORTAL.y - PORTAL.ry, w: PORTAL.rx * 2, h: PORTAL.ry * 2, svg: portalArt(PORTAL.rx, PORTAL.ry, 'goPortal') },
    { id: 'lasers', depth: Layer.BEHIND, x: 0, y: 0, w: 960, h: 450, svg: lasers(), alpha: 0.8 },
    { id: 'far', depth: Layer.BEHIND, x: FAR.x, y: FAR.y, anim: 'goa-far' },
    ...dancerLayers,
    { id: 'light', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: '<rect width="960" height="450" fill="#3a1a7a"/>', alpha: 0.16 },
    { id: 'frontShrooms', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: foregroundShrooms() },
  ],

  walkArea: [P(30, 342), P(930, 342), P(930, 446), P(30, 446)],
  scaling: { yTop: 340, scaleTop: 0.88, yBottom: 446, scaleBottom: 1.14 },

  music: 'goa-theme',

  assets: {
    audio: [musicFile('goa-theme')],
    svgImages: [...DANCER_FRAMES, ...FAR_FRAMES],
    anims: [
      { key: 'goa-far', textures: FAR_FRAMES.map((f) => f.key), frameRate: FPS },
      // Each look starts on its own frame, so the crowd isn't in lockstep.
      ...LOOKS.flatMap((_, v) =>
        (Object.keys(DANCER_SIZES) as DancerSize[]).map((size) => ({
          key: dancerAnim(v, size),
          textures: [0, 1, 2, 3].map((f) => dancerKey(v, size, (f + v) % 4)),
          frameRate: FPS,
        }))
      ),
    ],
    svgActors: [VOICE_ACTOR],
  },

  entries: {
    eingang: { x: 222, y: 440, facing: 'right' },
    // Out of the wormhole, in the middle of the floor.
    portal: { x: LANDING.x, y: LANDING.y, facing: 'down' },
  },

  // The DJ is drawn into the stage; this is his voice.
  actors: [
    { id: 'dj', x: 480, y: 262, facing: 'down' },
    // The Goazwerg: off stage, until somebody falls out of a hole in the floor.
    { id: 'tuersteher', x: -300, y: 420, facing: 'right' },
  ],

  async onEnter(ctx) {
    const viaPortal = !!ctx.flag('portalLanding');
    ctx.setFlag('portalLanding', false);
    if (viaPortal) await ctx.once('goaIntro', () => landing(ctx));
    else await ctx.once('goaIntro', async () => {
      await ctx.playerSay('Leuchtende Pilze. Fäden aus Licht bis in die Baumkronen. Und alle tanzen.');
    });
    if (viaPortal && !ctx.flag('goaEntered')) await bouncerCheck(ctx);
  },

  ambients: [
    {
      // The lasers breathe with the bass.
      every: [20, 80],
      run: async (ctx) => {
        const l = ctx.layerObj('lasers');
        for (let i = 0; i < 4; i++) {
          await ctx.tween(l, { alpha: 1, ease: 'Quad.easeOut' }, 80, { skippable: false });
          await ctx.tween(l, { alpha: 0.45, ease: 'Quad.easeIn' }, BEAT - 80, { skippable: false });
        }
      },
    },
    {
      // The big mushrooms in front sway a little.
      every: [200, 600],
      run: async (ctx) => {
        const m = ctx.layerObj('frontShrooms');
        await ctx.tween(m, { y: 4, ease: 'Sine.easeInOut' }, BEAT * 4, { skippable: false });
        await ctx.tween(m, { y: 0, ease: 'Sine.easeInOut' }, BEAT * 4, { skippable: false });
      },
    },
  ],

  hotspots: HOTSPOTS,
};
