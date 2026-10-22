import type { ScriptContext } from '../engine/ScriptContext';

/**
 * The jukebox and the refrain trick in the Picasso.
 *
 * Picking "Noch einen auf die Gemütlichkeit" starts a loop that runs in the
 * background while the player keeps control: a verse, then the refrain —
 * ♫ Trink, trink, trink! ♫ — during which Ali turns to the jukebox and
 * sings with his eyes shut and the Partykiller shuts his and gropes for a
 * glass. On each "Trink!" beat he grabs whatever stands on the counter in
 * front of him. Three of Ali's ouzos and he dances himself to sleep.
 *
 * State: `ouzoAt` ('coaster' (default) | 'player' | 'cop' | 'held'),
 * `ouzoEmpty`, `ouzoCount` (kept: drunk ouzos stay counted), `song`,
 * `jukeboxCredit`, and the transient `refrain` (reset on room entry, like
 * the loop itself).
 */

export const SONGS = {
  pfand: { title: 'Du hast mein Herz am Pfandautomat vergessen', track: 'song-pfand' },
  baggersee: { title: 'Barfuß am Baggersee', track: 'song-baggersee' },
  polonaise: { title: 'Polonaise bis nach Wanne-Eickel', track: 'song-polonaise' },
  gemuetlichkeit: { title: 'Noch einen auf die Gemütlichkeit', track: 'song-gemuetlichkeit' },
} as const;
export type SongId = keyof typeof SONGS;

/** Timing of "Noch einen auf die Gemütlichkeit" (ms). The refrain is a
 *  generous window; the "Trink!" beats are when the Partykiller grabs. */
export const VERSE_MS = 8000;
export const REFRAIN_MS = 14000;
const BEATS = [2500, 6500, 10500];

/** Bumped whenever the song changes or the room (re)loads: a running
 *  refrain loop from an older generation stops at its next step. */
let generation = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Room entry: no song is playing, nobody is mid-refrain, and Ali's ouzo is
 *  back on its coaster (a save made mid-trick must not strand it). */
export async function resetJukebox(ctx: ScriptContext): Promise<void> {
  generation++;
  ctx.setFlag('refrain', false);
  ctx.setFlag('song', null);
  if (ctx.hasItem('ouzo')) ctx.removeItem('ouzo');
  if (ctx.flag('ouzoAt') !== 'coaster') ctx.setFlag('ouzoAt', 'coaster');
  await ctx.repaint();
}

export async function playSong(ctx: ScriptContext, id: SongId): Promise<void> {
  const gen = ++generation;
  if (ctx.flag('refrain')) await endRefrain(ctx);
  ctx.setFlag('song', id);
  ctx.playMusic(SONGS[id].track);
  await ctx.repaint();
  if (id === 'gemuetlichkeit') void songLoop(ctx, gen);
}

async function songLoop(ctx: ScriptContext, gen: number): Promise<void> {
  const alive = () => gen === generation && ctx.state.currentRoom === 'picasso';
  try {
    while (alive()) {
      await sleep(VERSE_MS);
      if (!alive()) return;
      await refrain(ctx, alive);
    }
  } catch {
    // staging only: a room change mid-refrain is not an error
  }
}

async function refrain(ctx: ScriptContext, alive: () => boolean): Promise<void> {
  ctx.setFlag('refrain', true);
  ctx.playMusic('song-gemuetlichkeit-refrain');
  await ctx.repaint();
  ctx.face('ali', 'left');
  void ctx.animate('ali', 'sing');
  const awake = () => !ctx.flag('copAsleep');
  if (awake()) void ctx.animate('cop', 'reach');
  let t = 0;
  let groped = false;
  for (const [i, beat] of BEATS.entries()) {
    await sleep(beat - t);
    t = beat;
    if (!alive()) return;
    void ctx.say('ali', i === 1 ? '♫ Bis der ganze Tresen singt! ♫' : '♫ Trink, trink, trink! ♫');
    if (!awake()) continue;
    if (ctx.flag('ouzoAt') === 'cop' && !ctx.flag('ouzoEmpty')) {
      await copDrinks(ctx);
      if (!awake() || !alive()) return; // the third one ends the evening
    } else if (!groped) {
      groped = true;
      void ctx.say('cop', 'Die Musik fordert hier etwas, das der Service nicht hergibt.');
    }
  }
  await sleep(REFRAIN_MS - t);
  if (!alive()) return;
  await endRefrain(ctx);
}

/** Back to the verse: Ali turns round, takes back a stray ouzo, and refills
 *  an empty one — out of habit. */
async function endRefrain(ctx: ScriptContext): Promise<void> {
  ctx.setFlag('refrain', false);
  if (ctx.flag('song') === 'gemuetlichkeit') ctx.playMusic('song-gemuetlichkeit');
  void ctx.animate('ali', null);
  ctx.face('ali', 'down');
  if (!ctx.flag('copAsleep')) void ctx.animate('cop', null);
  const at = ctx.flag<string>('ouzoAt') ?? 'coaster';
  if (at === 'player' || at === 'cop') {
    if (ctx.hasItem('ouzo')) ctx.removeItem('ouzo');
    ctx.setFlag('ouzoAt', 'coaster');
    await ctx.repaint();
    await ctx.say('ali', 'Der bleibt hier.');
    return;
  }
  await ctx.repaint();
  if (ctx.flag('ouzoEmpty')) await refill(ctx);
}

async function refill(ctx: ScriptContext): Promise<void> {
  ctx.setFlag('ouzoEmpty', false);
  ctx.sfx('pickup');
  await ctx.repaint();
  await ctx.say('ali', 'Ein leerer Feierabend ist kein Feierabend.');
}

/** "Trink!" — he grabs the glass in front of him, downs it, and pushes it
 *  back onto Ali's coaster while the refrain is still going. */
async function copDrinks(ctx: ScriptContext): Promise<void> {
  ctx.setFlag('ouzoAt', 'held');
  await ctx.repaint();
  await ctx.animate('cop', 'drink', 1400);
  const count = (ctx.flag<number>('ouzoCount') ?? 0) + 1;
  ctx.setFlag('ouzoCount', count);
  ctx.setFlag('ouzoAt', 'coaster');
  ctx.setFlag('ouzoEmpty', true);
  ctx.sfx('step');
  await ctx.repaint();
  if (count === 1) {
    // A determined slap on the counter.
    ctx.shake(220, 0.006);
    await ctx.say('cop', 'Trink!');
  } else if (count === 2) {
    // Raised index finger, ever softer consonants.
    ctx.face('cop', 'down');
    await ctx.say('cop', 'Trinkytrinky.');
    ctx.face('cop', 'up');
  } else {
    await ctx.cutscene(danceToSleep);
    return;
  }
  void ctx.animate('cop', 'reach');
}

/** Third ouzo: "Und jetzt tanzt!" — off the stool, a dance, and out like a
 *  light. The jukebox falls silent; Ali refills and has the last word. */
async function danceToSleep(ctx: ScriptContext): Promise<void> {
  generation++; // the song loop stops here
  ctx.setFlag('refrain', false);
  ctx.setFlag('song', null);
  void ctx.animate('ali', null);
  ctx.face('ali', 'down');
  await ctx.repaint();
  ctx.face('cop', 'down');
  await ctx.say('cop', 'Und jetzt tanzt!');
  ctx.playMusic('disco-theme');
  // He jumps off his stool (in front of it, so it doesn't hide him).
  ctx.place('cop', 640, 432, 'down');
  await ctx.animate('cop', 'stand', 500);
  const traffic = ctx.animate('cop', 'traffic', 3200);
  await ctx.wait(500);
  await ctx.playerSay('Sieht aus, als würde er eine Kreuzung regeln.');
  await traffic;
  const disco = ctx.animate('cop', 'disco', 3600);
  await ctx.wait(400);
  await ctx.playerSay('Oh. Jetzt kommt die Hüfte dazu.');
  await ctx.playerSay('Und ein überraschend ehrgeiziger Discofinger.');
  await disco;
  // Back onto the stool with a swing, arms crossed — asleep.
  ctx.place('cop', 640, 413, 'up');
  await ctx.animate('cop', null);
  ctx.sfx('step');
  ctx.shake(150, 0.004);
  ctx.setFlag('copAsleep');
  await ctx.repaint();
  ctx.playMusic('pub-theme');
  await ctx.wait(700);
  await refill(ctx);
  await ctx.say('ali', 'Früher hat er wenigstens noch gewartet, bis die Party vorbei war.');
}
