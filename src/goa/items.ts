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
      await ctx.playerSay('Im Wald, auf der Goa, gibt’s genug davon.');
    },
  },
};
