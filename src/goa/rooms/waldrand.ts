import { Layer, type Facing, type HotspotDef, type Rect, type RoomDef, type Vec2 } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import { WR, foregroundTree, goaGlow, waldrandBg } from '../art/waldrand';
import { PIGEON_ACTORS } from '../art/epplehaus';

// ---- layout ----------------------------------------------------------------------
// The edge of the forest, past the Neckarbrücke's left end, at dusk: the
// path from the bridge (right) runs into the woods — and right there it's
// closed for tree felling. Behind the trees the Goa's lights throb with a
// bass you can only just hear (the room's music is nothing but that bass;
// an ambient pulses the glow layer in time). The only way to the Goa is
// Otto R.'s wormhole from the Hölderlinturm.

const P = (x: number, y: number): Vec2 => ({ x, y });
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function at(id: string, name: string, r: Rect, walkTo: Vec2, facing: Facing, rest: Partial<HotspotDef>): HotspotDef {
  return { id, name, rect: r, walkTo, facing, ...rest };
}

/** In front of the barrier. */
const BARRIER_SPOT = P(420, 380);
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
    await ctx.playerSay('Wobei: Ich weiß ja noch nicht mal, wo im Wald die Goa steigt. Ali weiß es.');
    return;
  }
  await ctx.once('forestClosed', async () => {
    await ctx.playerSay('Ich weiß, wo die Goa ist. Ich hab das Passwort. Ich hör sogar den Bass. Und dazwischen: ein Absperrgitter.');
  });
  if (ctx.hasItem('wurmloch')) {
    await ctx.playerSay('Brauch ich auch nicht. Ich hab ein Wurmloch in der Tasche.');
  } else if (ctx.easyMode && ctx.flag('ottoFree')) {
    await ctx.playerSay('Otto meinte, sein Taschen-Attraktor zeigt, wo das Chaos am schönsten ist. Vielleicht gibt’s eine Abkürzung.');
  } else {
    await ctx.playerSay('Es muss einen anderen Weg geben. Einen sehr anderen.');
  }
}

// ---- the red herrings: five ways past the barrier that don't work ---------------

/** Bounce the player up and down (transient staging). */
async function hop(ctx: ScriptContext, height: number, ms: number): Promise<void> {
  const sprite = ctx.player.sprite;
  const y = sprite.y;
  await ctx.tween(sprite, { y: y - height, ease: 'Quad.easeOut' }, ms / 2);
  await ctx.tween(sprite, { y, ease: 'Quad.easeIn' }, ms / 2);
}

async function cutChain(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Die Kette am Gitter einfach durchknipsen. Ganz leise.');
  ctx.sfx('step');
  await ctx.wait(300);
  ctx.sfx('deny');
  ctx.shake(180, 0.006);
  ctx.removeItem('drahtschere');
  await ctx.playerSay('*KNACK.*');
  await ctx.playerSay('Das war nicht die Kette. Das war die Schere. Die ist stumpfer als Alis Witze.');
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
}

async function poleVault(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Stabhochsprung. Mit Anlauf. Wie bei Olympia.');
  await ctx.walkTo(ctx.activeCharId, 700, 400);
  ctx.face(ctx.activeCharId, 'left');
  await ctx.playerSay('Drei ... zwei ... eins ...');
  await ctx.walkTo(ctx.activeCharId, 470, 382);
  await hop(ctx, 70, 700);
  ctx.sfx('deny');
  ctx.shake(350, 0.014);
  ctx.removeItem('stange');
  await ctx.playerSay('*SCHWUNG ... KNACK.*');
  await ctx.playerSay('Die Stange war zu biegsam. Sie hat mich nicht rüber-, sondern zurückkatapultiert. Und ist dann zerbrochen.');
}

async function dig(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Ich grab mich einfach unter dem Gitter durch. Wie im Gefängnisfilm.');
  for (let i = 0; i < 3; i++) {
    ctx.sfx('step');
    await ctx.wait(350);
  }
  ctx.sfx('deny');
  ctx.removeItem('klappspaten');
  await ctx.playerSay('*KLONK.* Eine Wurzel. So dick wie ich.');
  await ctx.playerSay('Und der Klappspaten ist zusammengeklappt. Mit meinen Fingern drin. Autsch.');
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
      pickup: 'Einen ganzen Baumstamm? Ich bin Raver, kein Holzfäller.',
      push: 'Der rührt sich keinen Millimeter. Holz hat Gewicht. Wer hätte das gedacht.',
      use: 'Draufklettern und rüber? Dahinter ist es noch dichter. Und noch dunkler.',
    },
    onItem: {
      use: { stuhlbein: 'Noch mehr Holz für den Stapel? Das wär bloß Angeberei.' },
    },
  }),
  at('stumpf', 'Baumstumpf', R(616, 316, 52, 26), P(640, 372), 'up', {
    on: {
      lookat: 'Ein frischer Baumstumpf. Ich zähl die Jahresringe ... zu viele. Älter als der Partykiller.',
      use: 'Hinsetzen? Nach dem Zocker-Hocker trau ich keinem Holz mehr.',
    },
  }),
  at('schild', 'Schild', R(WR.sign.x - 2, WR.sign.y - 32, 138, 100), P(580, 380), 'up', {
    on: {
      lookat: async (ctx) => {
        await ctx.playerSay('„BAUMFÄLLARBEITEN. Durchgang verboten! Lebensgefahr. Forstamt Tübingen.“');
        await ctx.playerSay('Heute. Am Abend der Goa. Das ist kein Zufall. Das riecht nach Partykiller.');
      },
      pickup: 'Das Schild ist einbetoniert. Das Forstamt kennt seine Pappenheimer.',
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
        drahtschere: cutChain,
        pogostick: pogo,
        ballon: balloon,
        stange: poleVault,
        klappspaten: dig,
        stuhlbein: 'Die Würmer fressen sich durchs Holz, nicht durch Stahl.',
        loch: 'Ein Loch ins Gitter? Dahinter liegen immer noch umgefallene Bäume. Ich brauch eher eine Abkürzung.',
      },
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
  },

  // A pigeon that only turns up to pop the balloon.
  assets: { svgActors: PIGEON_ACTORS },
  actors: [{ id: 'waldtaube', x: -200, y: 300, facing: 'left' }],

  async onEnter(ctx) {
    await ctx.once('waldrandIntro', async () => {
      await ctx.wait(500);
      await ctx.playerSay('Der Waldrand. Und da hinten ... hörst du das? Bumm. Bumm. Bumm.');
      await ctx.playerSay('Der Bass! Die Goa ist ganz nah!');
      await ctx.wait(300);
      await ctx.playerSay('Und davor: ein Absperrgitter. Natürlich.');
    });
  },

  ambients: [
    {
      // The lights behind the trees throb with the bass: four on the floor.
      every: [50, 120],
      run: async (ctx) => {
        const glowLayer = ctx.layerObj('goa');
        for (let i = 0; i < 4; i++) {
          await ctx.tween(glowLayer, { alpha: 0.95, ease: 'Quad.easeOut' }, 90);
          await ctx.tween(glowLayer, { alpha: 0.45, ease: 'Quad.easeIn' }, BEAT - 90);
        }
      },
    },
  ],

  hotspots: HOTSPOTS,
};
