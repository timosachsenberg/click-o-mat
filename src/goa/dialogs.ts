import type { DialogChoice, DialogDef } from '../engine/types';

/** Ordering at the bar: the free choice of drinks. Shared by talking to Ali
 *  and by handing him the coin. */
function drinkChoices(back: Partial<DialogChoice>): DialogChoice[] {
  return [
    {
      text: 'Eine Red Cow, bitte.',
      script: async (ctx) => {
        await ctx.say('ali', 'Aus.');
      },
    },
    {
      text: 'Ein Flying Pony?',
      script: async (ctx) => {
        await ctx.say('ali', 'Auch aus.');
      },
    },
    {
      text: 'Dann eine Magic Woman.',
      end: true,
      script: async (ctx) => {
        await ctx.say('ali', 'Die haben wir.');
        if (!ctx.hasItem('euro')) {
          await ctx.say('ali', 'Zwei Euro.');
          await ctx.playerSay('Hab ich nicht mehr.');
          return;
        }
        await ctx.say('ali', 'Zwei Euro, inklusive Pfand.');
        ctx.removeItem('euro');
        ctx.face('ali', 'up');
        await ctx.wait(800);
        ctx.sfx('open');
        ctx.face('ali', 'down');
        ctx.setFlag('boughtDrink');
        ctx.addItem('magicwoman');
        await ctx.say('ali', 'Bitte schön, mein Lieber.');
      },
    },
    { text: 'Doch nichts.', ...back },
  ];
}

export const DIALOGS: Record<string, DialogDef> = {
  ali: {
    id: 'ali',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Ich suche die Goa im Wald.',
            if: (s) => !s.getFlag('knowsPartykiller') && !s.getFlag('copAsleep'),
            script: async (ctx) => {
              await ctx.say('ali', 'Nicht so laut. Neben dir sitzt der Partykiller.');
              await ctx.playerSay('Ist der nicht im Ruhestand?');
              await ctx.say('ali', 'Er schon. Seine Anzeigen nicht.');
              await ctx.say('cop', 'Ich kann euch übrigens hören.');
              ctx.setFlag('knowsPartykiller');
            },
          },
          {
            text: 'Und die Goa? Nur ganz leise?',
            if: (s) => !!s.getFlag('knowsPartykiller') && !s.getFlag('copAsleep'),
            script: async (ctx) => {
              await ctx.say('ali', 'Nicht, solange er zuhört.');
              await ctx.say('cop', 'Ich höre immer zu. Vierzig Jahre Nachtschicht.');
            },
          },
          {
            text: 'Also. Die Party im Wald?',
            if: (s) => !!s.getFlag('copAsleep') && !s.getFlag('password'),
            script: async (ctx) => {
              await ctx.say('ali', 'Folge dem Bass. Am Eingang sagst du Chakabunga.');
              await ctx.playerSay('Chakabunga.');
              await ctx.say('ali', 'Genau, mein Lieber. Und jetzt weißt du auch, wofür du die Energie brauchst.');
              ctx.setFlag('password', 'Chakabunga');
              ctx.sfx('win');
              ctx.toast('Passwort erhalten: Chakabunga');
            },
          },
          {
            text: 'Wie war das Passwort nochmal?',
            if: (s) => !!s.getFlag('password'),
            script: async (ctx) => {
              await ctx.say('ali', 'Chakabunga. Und jetzt ab in den Wald, mein Lieber.');
            },
          },
          {
            text: 'Was gibt’s zu trinken?',
            if: (s) => !s.getFlag('boughtDrink'),
            next: 'drinks',
            script: async (ctx) => {
              await ctx.say('ali', 'Steht alles auf der Karte.');
            },
          },
          {
            text: 'Tschüss, Ali.',
            end: true,
            script: async (ctx) => {
              await ctx.say('ali', 'Mach’s gut, mein Lieber.');
            },
          },
        ],
      },
      drinks: { choices: drinkChoices({ next: 'root' }) },
    },
  },

  // Handing Ali the coin goes straight to ordering.
  'ali-order': {
    id: 'ali-order',
    start: 'drinks',
    nodes: {
      drinks: { choices: drinkChoices({ end: true }) },
    },
  },

  cop: {
    id: 'cop',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Guten Abend.',
            once: true,
            script: async (ctx) => {
              await ctx.say('cop', 'Ob der gut ist, entscheide ich.');
            },
          },
          {
            text: 'Sie sind also der Partykiller?',
            once: true,
            if: (s) => !!s.getFlag('knowsPartykiller'),
            script: async (ctx) => {
              await ctx.say('cop', 'Polizeihauptmeister außer Dienst.');
              await ctx.say('cop', 'Ich hab mehr Partys aufgelöst, als du je besuchen wirst.');
              await ctx.playerSay('Und jetzt?');
              await ctx.say('cop', 'Jetzt sitz ich hier. Und höre zu.');
            },
          },
          {
            text: 'Sie sehen müde aus.',
            script: async (ctx) => {
              await ctx.say('cop', 'Müde? Ich? Ich schlafe nicht. Ich lauere.');
              await ctx.playerSay('Auch nicht mit einem Energydrink? Geht aufs Haus.');
              await ctx.say('cop', 'Rühr ich nicht an. Letztes Mal hab ich getanzt.');
              await ctx.say('cop', 'Danach hab ich vierzehn Stunden geschlafen.');
              await ctx.playerSay('...Interessant.');
            },
          },
          {
            text: 'Schönen Abend noch.',
            end: true,
            script: async (ctx) => {
              await ctx.say('cop', 'Ich hab dich im Auge.');
            },
          },
        ],
      },
    },
  },
};
