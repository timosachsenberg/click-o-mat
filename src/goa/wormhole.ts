import type { ScriptContext } from '../engine/ScriptContext';

/** What the Goa's password still costs: the coin for Ali's drink, or whatever
 *  it has turned into on the way (can, empty can, deposit coin) — each with
 *  the name the player gives it. The wormhole's toll leaves these alone while
 *  the password is still to be had, so jumping without it is never a dead end.
 *  Keep this in step with Ali's riddle (dialogs.ts, items.ts, rooms/picasso.ts):
 *  every item the way to the password passes through belongs here. */
export const PASSWORD_FARE: Record<string, string> = {
  euro: 'die Zwei-Euro-Münze',
  magicwoman: 'die Magic Woman',
  dose: 'die leere Dose',
  cent25: 'das 25-Cent-Stück',
};

/** The wormhole's toll: everything in the pockets that isn't needed any more.
 *  While the password is still to be had, what it costs stays — so somebody
 *  who jumps without it and is thrown out can still go and get it. */
export function wormholeToll(ctx: ScriptContext): void {
  const spared = ctx.flag('password') ? {} : PASSWORD_FARE;
  const lost = ctx.state.inventory.filter((id) => !(id in spared));
  for (const id of lost) ctx.removeItem(id);
  if (lost.length) ctx.setFlag('pocketsLost');
}

/** What the toll left in the pockets, as the player names it. */
export function sparedByToll(ctx: ScriptContext): string[] {
  return ctx.state.inventory.filter((id) => id in PASSWORD_FARE).map((id) => PASSWORD_FARE[id]);
}
