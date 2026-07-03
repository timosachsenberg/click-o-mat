import type { DialogDef } from '../engine/types';

export const DIALOGS: Record<string, DialogDef> = {
  'tent-chat': {
    id: 'tent-chat',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Who are you?',
            once: true,
            next: 'about',
            script: async (ctx) => {
              await ctx.say('tent', "I'm Ned. I guard this lab. Verbally.");
              await ctx.playerSay("You're doing great.");
              await ctx.say('tent', 'I know.');
            },
          },
          {
            text: 'What is this place?',
            once: true,
            script: async (ctx) => {
              await ctx.say(
                'tent',
                "Dr. Fred's old lab annex. He left in a hurry. Something about tentacles taking over the world."
              );
              await ctx.playerSay('...Should I be worried?');
              await ctx.say('tent', 'Nah. That was my cousin. Purple guy. Very driven.');
            },
          },
          {
            text: 'Is there anything you want?',
            script: async (ctx) => {
              ctx.setFlag('knowsWant');
              await ctx.say('tent', 'I crave something warm... fuzzy... and RADIOACTIVE.');
              await ctx.say('tent', "Bring me that, and I'll owe you one.");
              await ctx.playerSay('That is a deeply specific craving.');
            },
          },
          {
            text: 'I have to go now.',
            end: true,
            script: async (ctx) => {
              await ctx.say('tent', 'Slither back soon!');
            },
          },
        ],
      },
      about: {
        choices: [
          {
            text: 'Why are you green?',
            once: true,
            script: async (ctx) => {
              await ctx.say('tent', 'Jealousy, mostly.');
            },
          },
          {
            text: 'Do you ever get tired of standing there?',
            once: true,
            script: async (ctx) => {
              await ctx.say('tent', "I don't stand. I LOOM.");
            },
          },
          {
            text: 'Anyway...',
            next: 'root',
            say: false,
          },
        ],
      },
    },
  },
};
