import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { OWL, OWL_FRAMES, WR, fireflies, fog, foregroundTree, goaGlow, lampFlash, waldrandBg } from '../art/waldrand';
import { PIGEON_ACTORS } from '../art/epplehaus';
import { portalArt } from '../art/goaeingang';

// ---- layout ----------------------------------------------------------------------
// The edge of the forest, past the Neckarbrücke's left end, at dusk: the
// path from the bridge (right) runs into the woods — and right there it's
// closed for tree felling. Behind the trees the Goa's lights throb with a
// bass you can only just hear (the room's music is nothing but that bass;
// an ambient pulses the glow layer in time). The only way to the Goa is
// Otto R.'s wormhole pair from the Hölderlinturm: one end is thrown over the
// barrier towards the lights (`portalOpen`), the other stands here — step in
// and you come out in the middle of the dance floor, with empty pockets.

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

/** In front of the barrier. */
const BARRIER_SPOT = P(420, 380);
/** Where this end of the wormhole pair stands once it's thrown: beside the barrier. */
const PORTAL = { x: 724, y: 326, rx: 40, ry: 58 };
const PORTAL_SPOT = P(PORTAL.x, 394);
/** One beat of the bass, ms (128 bpm). */
const BEAT = 469;

async function toNeckar(ctx: ScriptContext): Promise<void> {
  await ctx.goToRoom('neckar', 'wald');
}

/** The barrier: no way through. Hints depend on how far the player is. */
async function tryBarrier(ctx: ScriptContext): Promise<void> {
  ctx.sfx('deny');
  await ctx.playerSay('„Baumfällarbeiten. Durchgang verboten.“ Ausgerechnet heute.');
  if (!ctx.flag('password')) {
    await ctx.playerSay('Wobei: Ohne Passwort käm ich da eh nicht rein.');
    return;
  }
  await ctx.once('forestClosed', async () => {
    await ctx.playerSay('Ich weiß, wo die Goa ist. Ich hab das Passwort. Ich hör sogar den Bass. Und dazwischen: ein Absperrgitter.');
  });
  if (ctx.flag('portalOpen')) {
    await ctx.playerSay('Brauch ich auch nicht. Mein Wurmloch steht gleich daneben.');
  } else if (ctx.hasItem('wurmloch')) {
    await ctx.playerSay('Durch muss ich ja gar nicht. Nur drüber. Mit einem Ende von meinem Wurmloch-Paar.');
  } else if (ctx.easyMode && ctx.flag('ottoFree')) {
    await ctx.playerSay('Otto meinte, sein Taschen-Attraktor zeigt, wo das Chaos am schönsten ist. Vielleicht gibt’s eine Abkürzung.');
  } else {
    await ctx.playerSay('Es muss einen anderen Weg geben. Einen sehr anderen.');
  }
}

// ---- the red herrings: two ways past the barrier that don't work ----------------

/** Bounce the player up and down (transient staging). */
async function hop(ctx: ScriptContext, height: number, ms: number): Promise<void> {
  const sprite = ctx.player.sprite;
  const y = sprite.y;
  await ctx.tween(sprite, { y: y - height, ease: 'Quad.easeOut' }, ms / 2);
  await ctx.tween(sprite, { y, ease: 'Quad.easeIn' }, ms / 2);
}

/** After the first failed attempt: a nudge away from tools. */
async function afterFail(ctx: ScriptContext): Promise<void> {
  await ctx.once('herringHint', async () => {
    await ctx.playerSay('Mit Sportgerät komm ich an diesem Gitter nicht vorbei. Ich bräuchte eher eine Abkürzung.');
  });
}

async function pogo(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Mit dem Pogo-Stick einfach drüberhüpfen. Was soll schon schiefgehen?');
  ctx.face(ctx.activeCharId, 'up');
  for (const h of [24, 40, 58]) {
    ctx.sfx('step');
    await hop(ctx, h, 420);
  }
  ctx.sfx('deny');
  ctx.shake(400, 0.018);
  ctx.flash(0xffffff, 120);
  ctx.removeItem('pogostick');
  await ctx.playerSay('*BOING. BOING. KLONK.*');
  await ctx.playerSay('Ich hab das Gitter getroffen. Das Gitter hat gewonnen. Und der Pogo-Stick ist jetzt ein Pogo-Knick.');
  await afterFail(ctx);
}

async function balloon(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Ballon fest in die Hand, kurz abstoßen, und einfach drüberschweben.');
  ctx.face(ctx.activeCharId, 'up');
  const sprite = ctx.player.sprite;
  const y = sprite.y;
  await ctx.tween(sprite, { y: y - 46, ease: 'Sine.easeOut' }, 1400);
  await ctx.playerSay('Es klappt! Ich schwebe!');
  // A pigeon, all the way out here, flies in and has a go at the balloon.
  ctx.place('waldtaube', 980, y - 120, 'left');
  await ctx.tween(ctx.actor('waldtaube').sprite, { x: ctx.player.x + 18, y: y - 104 }, 900);
  await ctx.say('waldtaube', 'Gurr?');
  ctx.sfx('zap');
  ctx.flash(0xff5ab4, 120);
  ctx.removeItem('ballon');
  await ctx.say('waldtaube', 'Pock.');
  await ctx.tween(sprite, { y, ease: 'Quad.easeIn' }, 350);
  ctx.shake(220, 0.01);
  await ctx.tween(ctx.actor('waldtaube').sprite, { x: -80, y: y - 200 }, 1100);
  ctx.place('waldtaube', -200, 300);
  await ctx.playerSay('Eine Taube. Bis hier draußen. Hat meinen Ballon zerpickt und ist einfach weitergeflogen.');
  await ctx.playerSay('Die Tauben in dieser Stadt haben was gegen mich.');
  await afterFail(ctx);
}

// ---- the wormhole pair -----------------------------------------------------------

/** One end over the barrier, towards the lights; the other stands here. */
export async function throwWormhole(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('portalOpen')) return;
  await ctx.walkTo(ctx.activeCharId, BARRIER_SPOT.x + 60, BARRIER_SPOT.y);
  ctx.face(ctx.activeCharId, 'up');
  await ctx.playerSay('Zwei Enden. Eins fliegt, eins bleibt. Ich ziel auf die Lichter.');
  ctx.removeItem('wurmloch');
  const disc = ctx.layerObj('wurf');
  disc.setPosition(ctx.player.x, ctx.player.y - 90).setAlpha(1).setScale(1);
  ctx.sfx('step');
  await ctx.tween(disc, { x: 420, y: 150, ease: 'Sine.easeOut' }, 620);
  await ctx.tween(disc, { x: WR.glow.x, y: WR.glow.y, scale: 0.25, ease: 'Sine.easeIn' }, 700);
  disc.setAlpha(0);
  ctx.sfx('zap');
  ctx.flash(0xb06aff, 260);
  ctx.setFlag('portalOpen');
  await ctx.repaint();
  await ctx.playerSay('Drüber! Weit drüber. Irgendwo zwischen den Lichtern ist es runtergekommen.');
  await ctx.playerSay('Und das andere Ende steht jetzt hier neben dem Gitter und wummert.');
  if (ctx.easyMode) await ctx.playerSay('Ein Schritt rein, und ich bin drüben.');
}

/** Into the portal: out in the middle of the dance floor. Whatever is in the
 *  pockets doesn't make it through. */
async function enterPortal(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay(ctx.flag('wormholeUsed') ? 'Noch mal durch. Festhalten.' : 'Augen zu, Luft anhalten, und ...');
  ctx.sfx('zap');
  ctx.shake(600, 0.02);
  ctx.flash(0xff5ab4, 400);
  await ctx.wait(400);
  const lost = [...ctx.state.inventory];
  for (const id of lost) ctx.removeItem(id);
  if (lost.length) ctx.setFlag('pocketsLost');
  ctx.place(ctx.activeCharId, -400, ctx.player.y);
  ctx.flash(0x4ae8ff, 400);
  ctx.setFlag('wormholeUsed');
  await ctx.wait(300);
  await ctx.goToRoom('goa', 'portal');
}

const HOTSPOTS: HotspotDef[] = [
  at('wald', 'Wald', R(0, 120, 960, 210), BARRIER_SPOT, 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Der Wald. Irgendwo da drin wummert es. Bumm. Bumm. Bumm.');
        await ctx.playerSay('So nah. Und doch hinter einem Absperrgitter.');
      },
      use: async (ctx) => {
        await ctx.playerSay('Querfeldein? Im Dunkeln, zwischen frisch gefällten Bäumen?');
        await ctx.playerSay('Da komm ich nicht bis zur Goa. Da komm ich bis zur Notaufnahme.');
      },
    },
  }),
  at('lichter', 'Lichter', R(WR.glow.x - 110, WR.glow.y - 90, 220, 130), BARRIER_SPOT, 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Bunte Lichter zwischen den Stämmen. Laser. Und sie pulsieren im Takt.');
        await ctx.playerSay('Die Goa! Keine zwei Kilometer weit weg.');
      },
    },
    onItem: { use: { wurmloch: throwWormhole } },
  }),
  at('mond', 'Mond', R(770, 40, 60, 60), BARRIER_SPOT, 'up', {
    on: { lookat: 'Der Mond geht auf. Vollmond, wie auf dem Flyer. Die Goa hat einen guten Draht nach oben.' },
  }),
  at('baumstaemme', 'Baumstämme', R(WR.logs.x - 70, WR.logs.y - 20, WR.logs.w + 70, WR.logs.h + 24), P(250, 380), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Frisch gefällt und ordentlich gestapelt. Mit pinker Sprühfarbe nummeriert.');
        await ctx.playerSay('Riecht nach Harz. Und ein bisschen nach Kettensägenabgasen.');
      },
      pickup: 'Einen ganzen Baumstamm? Mit diesen Armen?',
      push: 'Der rührt sich keinen Millimeter. Holz hat Gewicht. Wer hätte das gedacht.',
      use: 'Draufklettern und rüber? Dahinter ist es noch dichter. Und noch dunkler.',
    },
    onItem: {
      use: { stuhlbein: 'Noch mehr Holz für den Stapel? Das wär bloß Angeberei.' },
    },
  }),
  at('stumpf', 'Baumstumpf', R(616, 316, 52, 26), P(640, 372), 'up', {
    on: {
      lookat: 'Ein frischer Baumstumpf. Ich zähl die Jahresringe ... zu viele. Älter als Ali.',
      use: (ctx) => ctx.playerSay(ctx.flag('stoolBroken') ? 'Hinsetzen? Nach dem Zocker-Hocker trau ich keinem Holz mehr.' : 'Hinsetzen? Nee. Ich will nicht sitzen, ich will tanzen.'),
    },
  }),
  at('schild', 'Schild', R(WR.sign.x - 2, WR.sign.y - 32, 138, 100), P(580, 380), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('„BAUMFÄLLARBEITEN. Durchgang verboten! Lebensgefahr. Forstamt Tübingen.“');
        await ctx.playerSay(ctx.flag('knowsPartykiller') ? 'Heute. Am Abend der Goa. Das ist kein Zufall. Das riecht nach Partykiller.' : 'Heute. Am Abend der Goa. Das ist doch kein Zufall.');
      },
      pickup: 'Das Schild ist einbetoniert. Das Forstamt kennt seine Pappenheimer.',
    },
  }),
  at('zettel', 'Zettel', R(WR.sign.x + 92, WR.sign.y + 40, 40, 34), P(580, 380), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Ein Zettel, mit Tesa ans Schild geklebt: „Fällarbeiten beantragt wegen dringendem Verdacht auf Ruhestörung.“');
        await ctx.playerSay(ctx.flag('knowsPartykiller') ? 'Unterschrift: „Ein besorgter Bürger a. D.“ Der Partykiller. Wusst ich’s doch.' : 'Unterschrift: „Ein besorgter Bürger a. D.“ Wer macht denn sowas?');
      },
      pickup: 'Der klebt da gut. Soll ruhig jeder lesen, wer das war.',
    },
  }),
  at('harvester', 'Harvester', R(724, 226, 180, 116), P(760, 392), 'up', {
    on: {
      lookat: 'Ein Harvester. Feierabend, Greifarm eingeklappt. Tagsüber frisst der einen Baum in zwanzig Sekunden.',
      use: 'Der Schlüssel steckt nicht. Und ich hab nicht mal einen Führerschein fürs Fahrrad.',
      open: 'Abgeschlossen. Das Forstamt kennt seine Pappenheimer.',
    },
  }),
  at('motorsaege', 'Motorsäge', R(WR.logs.x + 90, WR.logs.y - 42, 62, 26), P(250, 380), 'up', {
    on: {
      lookat: 'Eine Motorsäge, oben auf dem Stapel vergessen. Die Kette ist abgenommen. Schade. Oder zum Glück.',
      pickup: 'Ohne Kette ist das nur ein sehr lauter Briefbeschwerer. Und zu hoch liegt sie auch.',
    },
  }),
  at('eule', 'Eule', R(OWL.x - 4, OWL.y - 4, OWL.w + 8, OWL.h + 8), P(600, 380), 'up', {
    on: {
      lookat: 'Eine Eule. Sie schaut mich an, als wüsste sie genau, wie man an dem Gitter vorbeikommt. Sagt aber nichts.',
      talkto: async (ctx) => {
        await ctx.playerSay('Na? Auch auf dem Weg zur Goa?');
        await ctx.playerSay('Sie hat geblinzelt. Einmal. Ich zähl das als Ja.');
      },
    },
  }),
  at('absperrung', 'Absperrung', R(WR.barrier.x - 34, WR.barrier.base - 56, 196, 60), BARRIER_SPOT, 'up', {
    defaultVerb: 'use',
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Ein rot-weißes Absperrgitter, festgekettet an zwei Bäumen. Ein Warnlicht. Zwei Hütchen.');
        await ctx.playerSay('Dahinter führt der Weg in den Wald. Und zur Goa. Führte.');
      },
      use: tryBarrier,
      open: tryBarrier,
      push: 'Festgekettet. Und das Warnlicht blinkt mich vorwurfsvoll an.',
      pull: 'Festgekettet. Und das Warnlicht blinkt mich vorwurfsvoll an.',
      pickup: 'Ein Hütchen? Nee. Ich bin Raver, kein Student im ersten Semester.',
    },
    onItem: {
      use: {
        pogostick: pogo,
        ballon: balloon,
        wurmloch: throwWormhole,
        stuhlbein: 'Die Würmer fressen sich durchs Holz, nicht durch Stahl.',
        loch: 'Ein Loch ins Gitter? Dahinter liegen immer noch umgefallene Bäume. Ich brauch eher eine Abkürzung.',
      },
    },
  }),
  at('portal', 'Wurmloch', R(PORTAL.x - PORTAL.rx, PORTAL.y - PORTAL.ry, PORTAL.rx * 2, PORTAL.ry * 2), PORTAL_SPOT, 'up', {
    defaultVerb: 'use',
    visible: (state) => !!state.getFlag('portalOpen'),
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('Mein Ende vom Wurmloch-Paar. Es dreht sich, und es riecht nach Nebelmaschine.');
        await ctx.playerSay('Das andere Ende liegt irgendwo da drüben, mitten im Bass.');
      },
      use: enterPortal,
      open: enterPortal,
      pickup: 'Jetzt, wo es aufgespannt ist, krieg ich es nicht mehr in die Tasche. Es will benutzt werden.',
    },
  }),
  at('toNeckar', 'Zur Neckarbrücke', R(900, 300, 60, 146), P(936, 420), 'right', {
    defaultVerb: 'use',
    on: {
      lookat: 'Zurück zur Neckarbrücke. Und zur Zivilisation. Oder zu dem, was Tübingen dafür hält.',
      use: toNeckar,
      open: toNeckar,
    },
  }),
];

export const waldrandRoom: RoomDef = {
  id: 'waldrand',
  name: 'Waldrand',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: waldrandBg() },
    // The Goa's lights behind the trees: an ambient makes them throb.
    { id: 'goa', depth: Layer.BEHIND, x: 0, y: 0, w: 960, h: 450, svg: goaGlow(), alpha: 0.55 },
    // Night life: the owl on its branch, the barrier lamp's flash, fireflies, fog.
    { id: 'owl', depth: Layer.BEHIND, x: OWL.x, y: OWL.y, anim: 'wald-owl' },
    // The wormhole pair: this end, standing beside the barrier, and the one in flight.
    { id: 'portal', depth: Layer.BEHIND, x: PORTAL.x - PORTAL.rx, y: PORTAL.y - PORTAL.ry, w: PORTAL.rx * 2, h: PORTAL.ry * 2, svg: portalArt(PORTAL.rx, PORTAL.ry, 'wrPortal'), visible: (state) => !!state.getFlag('portalOpen') },
    { id: 'wurf', depth: Layer.FRONT, x: 0, y: 0, w: 44, h: 28, svg: portalArt(22, 14, 'wrWurf'), alpha: 0 },
    { id: 'flash', depth: Layer.BEHIND, x: 0, y: 0, w: 960, h: 450, svg: lampFlash(), alpha: 0 },
    { id: 'light', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: '<rect width="960" height="450" fill="#1a1a5a"/>', alpha: 0.24 },
    { id: 'fireflies', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: fireflies(), alpha: 0.6 },
    { id: 'fog', depth: Layer.FRONT, x: 0, y: 0, w: 960, h: 450, svg: fog() },
    // A big fir in front, on the left.
    { id: 'tree', depth: WR.tree.base, x: WR.tree.x, y: WR.tree.y, w: WR.tree.w, h: WR.tree.h, svg: foregroundTree() },
  ],

  // The floor in front of the barrier, from the edge of the woods to the path back.
  walkArea: [P(30, 376), P(330, 368), P(500, 372), P(700, 388), P(950, 396), P(950, 446), P(30, 446)],
  holes: [[P(56, 428), P(130, 428), P(130, 444), P(56, 444)]],
  scaling: { yTop: 366, scaleTop: 0.86, yBottom: 446, scaleBottom: 1.1 },

  // Nothing but the bass, far away behind the trees.
  music: 'wald-wummern',

  entries: {
    neckar: { x: 900, y: 420, facing: 'left' },
    // Back out of the wormhole.
    portal: { x: PORTAL_SPOT.x, y: PORTAL_SPOT.y, facing: 'down' },
  },

  // A pigeon that only turns up to pop the balloon.
  assets: {
    svgActors: PIGEON_ACTORS,
    svgImages: OWL_FRAMES,
    // Mostly staring; now and then a blink, a turn of the head.
    anims: [{ key: 'wald-owl', textures: [0, 0, 0, 0, 1, 0, 0, 0, 3, 3, 3, 0, 0, 1, 0, 0].map((f) => OWL_FRAMES[f].key), frameRate: 2 }],
  },
  actors: [{ id: 'waldtaube', x: -200, y: 300, facing: 'left' }],

  async onEnter(ctx) {
    await ctx.once('waldrandIntro', async () => {
      await ctx.wait(500);
      await ctx.playerSay('Der Waldrand. Und da hinten ... hörst du das? Bumm. Bumm. Bumm.');
      await ctx.playerSay('Der Bass! Die Goa ist ganz nah! Und hier draußen ist es schon fast Nacht.');
      await ctx.wait(300);
      await ctx.playerSay('Und davor: ein Absperrgitter. Natürlich.');
    });
  },

  ambients: [
    {
      // The wormhole breathes.
      every: [20, 60],
      run: async (ctx) => {
        if (!ctx.flag('portalOpen')) return;
        const p = ctx.layerObj('portal');
        await ctx.tween(p, { alpha: 0.7, ease: 'Sine.easeInOut' }, 700, { skippable: false });
        await ctx.tween(p, { alpha: 1, ease: 'Sine.easeInOut' }, 700, { skippable: false });
      },
    },
    {
      // The barrier's warning lamp flashes.
      every: [900, 900],
      run: async (ctx) => {
        const f = ctx.layerObj('flash');
        await ctx.tween(f, { alpha: 1 }, 60, { skippable: false });
        await ctx.tween(f, { alpha: 0 }, 240, { skippable: false });
      },
    },
    {
      // Fireflies drift and glimmer.
      every: [100, 300],
      run: async (ctx) => {
        const f = ctx.layerObj('fireflies');
        await ctx.tween(f, { alpha: 0.95, x: 6, y: -5, ease: 'Sine.easeInOut' }, 2200, { skippable: false });
        await ctx.tween(f, { alpha: 0.35, x: -5, y: 4, ease: 'Sine.easeInOut' }, 2600, { skippable: false });
      },
    },
    {
      // Ground fog creeps across the path.
      every: [100, 300],
      run: async (ctx) => {
        const f = ctx.layerObj('fog');
        await ctx.tween(f, { x: 40, ease: 'Sine.easeInOut' }, 9000, { skippable: false });
        await ctx.tween(f, { x: -40, ease: 'Sine.easeInOut' }, 9000, { skippable: false });
      },
    },
    {
      // The lights behind the trees throb with the bass: four on the floor.
      every: [50, 120],
      run: async (ctx) => {
        const glowLayer = ctx.layerObj('goa');
        for (let i = 0; i < 4; i++) {
          await ctx.tween(glowLayer, { alpha: 0.95, ease: 'Quad.easeOut' }, 90, { skippable: false });
          await ctx.tween(glowLayer, { alpha: 0.45, ease: 'Quad.easeIn' }, BEAT - 90, { skippable: false });
        }
      },
    },
  ],

  hotspots: HOTSPOTS,
};
