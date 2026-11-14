import type { ScriptContext } from '../engine/ScriptContext';
import type { ItemDef } from '../engine/types';

export const ITEMS: Record<string, ItemDef> = {
  euro: {
    id: 'euro',
    name: 'Zwei-Euro-Münze',
    icon: 'icon-euro',
    lookAt: async (ctx) => {
      await ctx.playerSay('Zwei Euro. Mein gesamtes Vermögen.');
      await ctx.playerSay('Genug für eine Nacht im Wald. Hoffe ich.');
    },
  },
  magicwoman: {
    id: 'magicwoman',
    name: 'Magic Woman',
    icon: 'icon-magicwoman',
    lookAt: async (ctx) => {
      await ctx.playerSay('Eine Dose Magic Woman. Energydrink, Geschmacksrichtung „Lila“.');
      await ctx.playerSay('Kleingedruckt: „Nicht geeignet für Kinder, Schwangere und Beamte.“');
    },
    // Drink it: "Benutze Magic Woman".
    use: async (ctx) => {
      ctx.removeItem('magicwoman');
      ctx.sfx('open');
      await ctx.playerSay('*Gluck, gluck, gluck.*');
      ctx.addItem('dose', { silent: true });
      await ctx.playerSay('Woah. Ich kann Farben hören.');
      await ctx.playerSay('Und den Bass. Ganz weit weg. Im Wald.');
    },
  },
  dose: {
    id: 'dose',
    name: 'leere Dose',
    icon: 'icon-dose',
    lookAt: 'Leer. Aber nicht wertlos: Da ist Pfand drauf.',
    use: 'Die ist leer. Die Energie ist jetzt in mir.',
  },
  cent25: {
    id: 'cent25',
    name: '25-Cent-Stück',
    icon: 'icon-cent25',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein 25-Cent-Stück. Das Pfand für die Dose.');
      await ctx.playerSay('Ich wusste gar nicht, dass es die gibt.');
    },
  },
  ouzo: {
    id: 'ouzo',
    name: 'Alis Ouzo',
    icon: 'icon-ouzo',
    lookAt: 'Alis Feierabend-Ouzo. Schnell weg damit, bevor der Refrain vorbei ist.',
    use: 'Anis? Nein danke. Der ist für jemand anderen.',
  },
  stuhlbein: {
    id: 'stuhlbein',
    name: 'wurmstichiges Stuhlbein',
    icon: 'icon-stuhlbein',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein Stuhlbein, löchrig wie ein Emmentaler. Drinnen knuspert es.');
      await ctx.playerSay('Holzwürmer. Und so wie die mampfen, haben sie seit Wochen nichts Frisches gehabt.');
    },
    use: 'Ich bin doch kein Holzwurm. Die Würmer brauchen was Größeres.',
  },
  muetze: {
    id: 'muetze',
    name: 'Burschenschaftsmütze',
    icon: 'icon-muetze',
    lookAt: async (ctx) => {
      await ctx.playerSay('Eine grüne Couleurmütze, grün-weiß-rot. Noch ein bisschen nass.');
      await ctx.playerSay('Innen eingestickt: „Eigentum der Verbindung. Finder bitte Bier zurückbringen.“');
    },
    use: 'Aufsetzen? Über meine Mütze? Später vielleicht. Im richtigen Moment.',
  },
  loch: {
    id: 'loch',
    name: 'tragbares Loch',
    icon: 'icon-loch',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein tragbares schwarzes Loch. Dünn wie ein Pfannkuchen, tief wie das Weltall.');
      await ctx.playerSay('In der modernen Zeitebene gelten offenbar Zeichentrick-Gesetze. Ich frag lieber nicht, wie.');
    },
    use: 'Auf den Boden legen und reinspringen? Nein. Ich weiß nicht, wo das rauskommt.',
    // A black hole plus a strange attractor: a wormhole that knows where the chaos is.
    combine: { taschenattraktor: makeWormhole },
  },
  taschenattraktor: {
    id: 'taschenattraktor',
    name: 'Taschen-Attraktor',
    icon: 'icon-taschenattraktor',
    lookAt: async (ctx) => {
      await ctx.playerSay('Otto R.s Taschen-Attraktor. Eine Rössler-Spirale zum Mitnehmen.');
      await ctx.playerSay('Sie summt leise. Und zwar im Takt von einem Bass, ganz weit weg.');
    },
    use: async (ctx) => {
      await ctx.playerSay('Ich dreh an der Spirale ...');
      ctx.sfx('zap');
      await ctx.playerSay('Nichts. Otto meinte, hier draußen braucht es dafür mehr Chaos.');
      await ctx.playerSay('Oder irgendwas Dunkles, Rundes, um das sie kreisen kann.');
    },
  },
  brezel: {
    id: 'brezel',
    name: 'alte Brezel',
    icon: 'icon-brezel',
    lookAt: async (ctx) => {
      await ctx.playerSay('Brezelstücke von gestern. Hart wie Granit, salzig wie das Meer.');
      await ctx.playerSay('Für Menschen ungeeignet. Für Tauben ein Festmahl.');
    },
    use: 'Draufbeißen? Meine Zähne brauch ich noch für den Wald.',
  },
  taube: {
    id: 'taube',
    name: 'Put-Put-Taube',
    icon: 'icon-taube',
    lookAt: async (ctx) => {
      await ctx.playerSay('Die Taube, die alles nachplappert. Sie sitzt erstaunlich zufrieden in meiner Hand.');
      await ctx.playerSay('Ab und zu sagt sie „Put put“. Mit perfekter Betonung.');
    },
    use: async (ctx) => {
      await ctx.playerSay('Na, sag mal was.');
      await ctx.playerSay('*Taube:* „Put put.“');
      await ctx.playerSay('Genau so. Das muss nur noch jemand hören, der Wert drauf legt.');
    },
  },
  wurmloch: {
    id: 'wurmloch',
    name: 'Wurmloch',
    icon: 'icon-wurmloch',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein schwarzes Loch, um das der Taschen-Attraktor kreist. Es wummert.');
      await ctx.playerSay('Wenn ich reinhorche: Bass. Viel Bass. Es zeigt direkt auf die Goa.');
    },
    use: useWormhole,
  },
};

/** Black hole + Otto's pocket attractor = a wormhole to where the chaos is. */
async function makeWormhole(ctx: ScriptContext): Promise<void> {
  ctx.removeItem('loch');
  ctx.removeItem('taschenattraktor');
  ctx.sfx('zap');
  ctx.flash(0xb06aff, 260);
  ctx.addItem('wurmloch', { silent: true });
  await ctx.playerSay('Ich leg den Taschen-Attraktor aufs Loch ...');
  await ctx.playerSay('Die Spirale fängt an zu kreisen, schneller und schneller, und das Loch kreist mit.');
  await ctx.playerSay('Ein Wurmloch! Und es wummert. Im Takt.');
}

/** Through the wormhole, straight to the Goa in the forest. */
async function useWormhole(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('password')) {
    await ctx.playerSay('Da drüben wartet die Goa. Aber am Eingang wollen sie ein Passwort.');
    await ctx.playerSay('Erst Ali fragen. Sonst steh ich im Wald und komm nicht rein.');
    return;
  }
  await ctx.playerSay('Wurmloch auf, Augen zu, und: Chakabunga!');
  ctx.removeItem('wurmloch');
  ctx.sfx('zap');
  ctx.shake(700, 0.02);
  ctx.flash(0xff5ab4, 400);
  await ctx.wait(500);
  // ... and gone, sucked through (staging: the title card ends the chapter).
  const me = ctx.player;
  ctx.place(ctx.activeCharId, -400, me.y);
  ctx.flash(0x4ae8ff, 400);
  await ctx.wait(500);
  ctx.setFlag('wormholeUsed');
  ctx.setFlag('chapterDone');
  ctx.sfx('win');
  ctx.showTitle('FORTSETZUNG FOLGT …');
}
