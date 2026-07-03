import { Layer, type RoomDef } from '../../engine/types';

/**
 * The layer-system showcase: a PNG image backdrop, two animated sconce
 * layers (spritesheet anims), and a foreground pillar (alpha PNG at
 * Layer.FRONT) that actors walk behind. Also home to Blobbo, the
 * PNG-spritesheet NPC.
 */
export const galleryRoom: RoomDef = {
  id: 'gallery',
  name: 'The Gallery',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, image: 'gallery-bg' },
    // Animated wall sconces (same depth as bg; array order stacks them above).
    { id: 'sconce-left', depth: Layer.BEHIND, anim: 'sconce-flicker', x: 362, y: 128 },
    { id: 'sconce-right', depth: Layer.BEHIND, anim: 'sconce-flicker', x: 600, y: 128 },
    // Foreground column: always in front of actors, alpha PNG.
    { id: 'pillar', depth: Layer.FRONT, image: 'pillar', x: 290, y: 90 },
  ],

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
    fromStairs: { x: 878, y: 368, facing: 'down' },
  },

  // Blobbo the critter, animated from the loaded spritesheet.
  actors: [{ id: 'critter', x: 640, y: 420, facing: 'down' }],

  // Blobbo strolls his gallery; his actor-bound hotspot follows him.
  ambients: [
    {
      every: [6000, 11000],
      run: async (ctx) => {
        if (ctx.busy) return; // don't wander off mid-conversation
        const x = 470 + Math.random() * 390;
        const y = 350 + Math.random() * 85;
        await ctx.walkTo('critter', x, y);
      },
    },
  ],

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
      id: 'archway',
      name: 'archway',
      rect: { x: 830, y: 116, w: 116, h: 188 },
      walkTo: { x: 885, y: 362 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'A grand archway. Somewhere beyond it, a staircase awaits.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('stairhall', 'fromGallery');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('stairhall', 'fromGallery');
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
      // Live-bound hotspot: follows him around the room as he wanders.
      actor: 'critter',
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
