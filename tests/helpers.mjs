/**
 * Helpers shared by the e2e suites (each suite is a plain Node + Playwright
 * script; this file is not one and is not listed in run-all.mjs).
 *
 * They drive the game through the dev-only `window.__engine` hook.
 */

/**
 * Dismiss the speech line that is showing — what a click on the room does
 * while a line is up, but without the click. A real click that lands just
 * after the line ended is a click on the room: it walks the player off or
 * triggers whatever hotspot is there, and the suite then waits for something
 * that never comes. Deciding and skipping happen in one step inside the page,
 * so there is no such gap.
 *
 * Does nothing unless a line can be skipped; an auto-walk is never cancelled.
 * (That a real click skips a line is checked once, in verify-qol.mjs.)
 */
export const skipLine = (page) => page.evaluate(() => {
  const e = window.__engine;
  if (e.busy && !e.interruptible) e.events.emit('skipLine');
});

/**
 * Build a suite's `settle()`: wait until the running interaction, cutscene or
 * dialog has finished, skipping speech lines on the way (see `skipLine`).
 * Throws when nothing settles in time.
 *
 *   const settle = makeSettle(page);
 *   await click(880, 220); await settle();
 *
 * Options:
 *   stopAtChoices  also return when a dialog waits for a choice (default: a
 *                  dialog has to end; pick its choices yourself, see below)
 *   interval       ms between polls (250)
 *   timeout        ms before giving up (60000)
 *
 * `settle(watch)` calls `await watch()` before every poll — to sample
 * something while a scene plays.
 */
export function makeSettle(page, { stopAtChoices = false, interval = 250, timeout = 60000 } = {}) {
  return async (watch) => {
    let st = null;
    for (let waited = 0; waited < timeout; waited += interval) {
      if (watch) await watch();
      st = await page.evaluate((stopAtChoices) => {
        const e = window.__engine;
        const st = { busy: e.busy, interruptible: e.interruptible, dialog: e.dialogMode, choices: e.choicesShowing, room: e.state.currentRoom };
        const settled = (!st.busy && !st.dialog) || (stopAtChoices && st.choices);
        if (!settled && st.busy && !st.interruptible) e.events.emit('skipLine');
        return { ...st, settled };
      }, stopAtChoices);
      if (st.settled) return;
      await page.waitForTimeout(interval);
    }
    // A picture of where it hung, next to the suites' own screenshots.
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/settle-timeout.png` }).catch(() => {});
    throw new Error('settle() timed out: ' + JSON.stringify(st));
  };
}
