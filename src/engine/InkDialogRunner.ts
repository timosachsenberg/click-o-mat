import type { Engine } from './Engine';

/**
 * Runs an [ink](https://www.inklestudios.com/ink/) story as a conversation,
 * through the same UI, speech, busy, and skip machinery as native dialogs.
 *
 * The engine only depends on this *structural* slice of the inkjs Story API —
 * content code compiles/loads the story (via `inkjs/full` or a precompiled
 * JSON + `inkjs`) and hands it in, so games that don't use ink don't pay for
 * it in the engine.
 *
 * Speaker attribution: lines prefixed `NAME: …` are spoken by the actor that
 * `opts.speakers[NAME]` maps to; unprefixed lines are the player's.
 *
 * Persistence: with `opts.stateFlag`, the full ink state (read counts,
 * exhausted once-only choices, VARs, seen text) is serialized into a normal
 * game flag after every conversation — so it survives save/load like any
 * other world state.
 */

export interface InkStory {
  canContinue: boolean;
  Continue(): string | null;
  currentChoices: Array<{ text: string }>;
  ChooseChoiceIndex(index: number): void;
  ChoosePathString(path: string): void;
  BindExternalFunction(
    name: string,
    fn: (...args: never[]) => unknown,
    lookaheadSafe?: boolean
  ): void;
  variablesState: Record<string, unknown>;
  state: { toJson(): string; LoadJson(json: string): void };
}

export interface InkDialogOptions {
  /** Knot to (re)start the conversation at, e.g. 'chat'. */
  entry: string;
  /** Map of line prefixes to actor ids, e.g. { BLOBBO: 'critter' }. */
  speakers?: Record<string, string>;
  /** Ink VARs to set before starting (sync game state in). */
  vars?: Record<string, string | number | boolean>;
  /** EXTERNAL functions the story declares (bound once per story). */
  bindings?: Record<string, (...args: never[]) => unknown>;
  /** Read ink VARs when the conversation ends (sync game state out). */
  onEnd?: (getVar: (name: string) => unknown) => void;
  /** Game flag to persist the full ink state under (survives save/load). */
  stateFlag?: string;
}

const boundStories = new WeakSet<InkStory>();
const LINE_PREFIX = /^([A-Z][A-Z0-9_]*):\s*(.*)$/;

export async function runInkDialog(
  eng: Engine,
  story: InkStory,
  opts: InkDialogOptions
): Promise<void> {
  eng.dialogMode = true;
  eng.uiScene.setDialogMode(true);
  const ctx = eng.makeContext();
  try {
    // Restore persisted read counts / choice history / VARs, if any.
    if (opts.stateFlag) {
      const saved = eng.state.getFlag<string>(opts.stateFlag);
      if (saved) story.state.LoadJson(saved);
    }
    if (opts.bindings && !boundStories.has(story)) {
      for (const [name, fn] of Object.entries(opts.bindings)) {
        story.BindExternalFunction(name, fn, false);
      }
      boundStories.add(story);
    }
    for (const [name, value] of Object.entries(opts.vars ?? {})) {
      story.variablesState[name] = value;
    }
    story.ChoosePathString(opts.entry);

    for (;;) {
      while (story.canContinue) {
        let line = (story.Continue() ?? '').trim();
        if (!line) continue;
        let actorId = eng.state.activeChar;
        const m = LINE_PREFIX.exec(line);
        if (m && opts.speakers?.[m[1]]) {
          actorId = opts.speakers[m[1]];
          line = m[2];
        }
        await ctx.say(actorId, line);
      }
      const choices = story.currentChoices;
      if (choices.length === 0) break;
      const picked = await eng.uiScene.presentChoices(choices.map((c) => c.text));
      if (picked < 0 || picked >= choices.length) break;
      await ctx.playerSay(choices[picked].text);
      story.ChooseChoiceIndex(picked);
    }

    opts.onEnd?.((name) => story.variablesState[name]);
    if (opts.stateFlag) eng.state.setFlag(opts.stateFlag, story.state.toJson());
  } finally {
    eng.dialogMode = false;
    eng.uiScene.setDialogMode(false);
  }
}
