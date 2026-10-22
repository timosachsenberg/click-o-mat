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
  },
};
