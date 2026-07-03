import { Compiler } from 'inkjs/full';
import blobboSource from './blobbo.ink?raw';
import type { ScriptContext } from '../engine/ScriptContext';
import type { InkStory } from '../engine/InkDialogRunner';

// Compiled once, lazily, and reused: ink itself remembers read counts and
// exhausted once-only choices across conversations, and the engine persists
// that state into the `ink:blobbo` flag so it also survives save/load.
let story: InkStory | null = null;

export async function talkToBlobbo(ctx: ScriptContext): Promise<void> {
  story ??= new Compiler(blobboSource).Compile() as unknown as InkStory;
  await ctx.inkDialog(story, {
    entry: 'chat',
    stateFlag: 'ink:blobbo',
    speakers: { BLOBBO: 'critter', NORB: 'norb' },
    // Game state in…
    vars: {
      has_hamster: ctx.hasItem('hamster'),
      is_glowing: ctx.hasItem('glowhamster'),
    },
    bindings: {
      sfx: (name: string) => ctx.sfx(name),
    },
    // …and out again.
    onEnd: (getVar) => {
      if (getVar('friend') === true) ctx.setFlag('blobboFriend');
    },
  });
}
