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
};
