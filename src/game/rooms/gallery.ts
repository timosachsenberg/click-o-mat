import type { RoomDef } from '../../engine/types';

/**
 * A room whose background is a preloaded **PNG** (`gallery-bg`) instead of a
 * paint() function, populated by a **PNG-spritesheet** NPC ("Blobbo", the
 * critter). Demonstrates the asset pipeline end to end.
 */
export const galleryRoom: RoomDef = {
  id: 'gallery',
  name: 'The Gallery',

  // No paint() — the engine draws this preloaded image instead.
  background: 'gallery-bg',

  walkArea: [
    { x: 60, y: 314 },
    { x: 905, y: 314 },
    { x: 935, y: 445 },
    { x: 30, y: 445 },
  ],
  scaling: { yTop: 314, scaleTop: 0.72, yBottom: 445, scaleBottom: 1.05 },

  music: 'gallery-theme',

  entries: {
    fromHallway: { x: 150, y: 360, facing: 'right' },
  },

  // Blobbo the critter, animated from the loaded spritesheet.
  actors: [{ id: 'critter', x: 640, y: 420, facing: 'down' }],

  async onEnter(ctx) {
    if (ctx.flag('gallerySeen')) return;
    ctx.setFlag('gallerySeen');
    await ctx.wait(400);
    await ctx.playerSay('An art gallery. Fancy. And that background is a real PNG.');
  },

  hotspots: [
    {
      id: 'gallery-exit',
      name: 'doorway',
      rect: { x: 30, y: 120, w: 116, h: 184 },
      walkTo: { x: 120, y: 360 },
      facing: 'left',
      defaultVerb: 'open',
      on: {
        lookat: 'The doorway back to the hall.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('hallway', 'fromGallery');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('hallway', 'fromGallery');
        },
      },
    },
    {
      id: 'painting-landscape',
      name: 'landscape painting',
      rect: { x: 112, y: 62, w: 166, h: 126 },
      walkTo: { x: 195, y: 330 },
      facing: 'up',
      on: {
        lookat: 'Rolling hills at sunset. The gift shop had it as a mousepad.',
        pull: "The little plaque says PLEASE DON'T. So I don't.",
      },
    },
    {
      id: 'painting-abstract',
      name: 'abstract painting',
      rect: { x: 412, y: 52, w: 136, h: 136 },
      walkTo: { x: 480, y: 330 },
      facing: 'up',
      on: {
        lookat: 'Nine colored squares. Bold. Provocative. Suspiciously like a spreadsheet.',
      },
    },
    {
      id: 'painting-night',
      name: 'night painting',
      rect: { x: 682, y: 66, w: 166, h: 116 },
      walkTo: { x: 765, y: 330 },
      facing: 'up',
      on: {
        lookat: 'A moon over dark hills. Peaceful. A little smug about it.',
      },
    },
    {
      id: 'bench',
      name: 'velvet bench',
      rect: { x: 425, y: 318, w: 130, h: 52 },
      walkTo: { x: 490, y: 380 },
      facing: 'up',
      on: {
        lookat: 'A velvet bench for contemplating art, or your life choices.',
        use: 'I could sit, but I have a tentacle to impress.',
      },
    },
    {
      id: 'critter',
      name: 'Blobbo',
      rect: { x: 596, y: 360, w: 90, h: 80 },
      walkTo: { x: 560, y: 425 },
      facing: 'right',
      defaultVerb: 'talkto',
      on: {
        lookat: 'A small orange critter. He appears to be an art enthusiast.',
        talkto: async (ctx) => {
          await ctx.say('critter', 'Bloop! Welcome to my gallery.');
          await ctx.playerSay('Your gallery? You have no arms to hang anything.');
          await ctx.say('critter', 'Bloop. I curate with my MIND.');
          if (!ctx.hasItem('battery') && !ctx.hasItem('key')) {
            await ctx.playerSay("Fair enough.");
          } else {
            await ctx.say('critter', "Also: nice inventory. Very adventurer-chic.");
          }
        },
        pickup: 'He is a protected local artist. Hands off.',
        push: 'You do not push a curator. It is simply not done.',
      },
      onItem: {
        give: {
          hamster: async (ctx) => {
            await ctx.say('critter', 'A hamster?! For me?? ...No. I have commitment issues. Keep it.');
          },
        },
      },
    },
  ],
};
