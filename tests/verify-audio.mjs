import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

const browser = await chromium.launch({
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
  ],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
await page.waitForTimeout(300);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title screen
await page.waitForTimeout(1000);
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);

const dbg = () => page.evaluate(() => window.__audio.debug());
const room = () => page.evaluate(() => window.__engine.state.currentRoom);
const settle = async () => {
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => ({ b: window.__engine.busy, i: window.__engine.interruptible, d: window.__engine.dialogMode }));
    if (!st.b && !st.d) return;
    if (st.b && !st.i) await click(480, 240);
    await page.waitForTimeout(250);
  }
};
// Peak output level sampled over ~500ms.
const peakLevel = async () => {
  let peak = 0;
  for (let i = 0; i < 12; i++) {
    peak = Math.max(peak, (await dbg()).level);
    await page.waitForTimeout(40);
  }
  return peak;
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) process.exitCode = 1; };

// A first click unlocks the audio context (browser gesture policy).
await click(480, 430);
await page.waitForTimeout(300);
await settle();

const d0 = await dbg();
check('audio context running', d0.state === 'running', `(state=${d0.state})`);
check('lab music selected on load', d0.currentMusic === 'lab-theme', `(current=${d0.currentMusic})`);

// Music is actually producing signal.
const lvlPlaying = await peakLevel();
check('music produces audible signal', lvlPlaying > 0.005, `(peak=${lvlPlaying.toFixed(4)})`);

const notes1 = (await dbg()).notes;
await page.waitForTimeout(700);
const notes2 = (await dbg()).notes;
check('music scheduler advancing', notes2 > notes1, `(${notes1} -> ${notes2})`);

// Mute silences output.
await page.evaluate(() => window.__audio.setMuted(true));
await page.waitForTimeout(300);
const lvlMuted = await peakLevel();
check('mute silences output', lvlMuted < 0.002, `(peak=${lvlMuted.toFixed(4)})`);

// Unmute restores it.
await page.evaluate(() => window.__audio.setMuted(false));
await page.waitForTimeout(300);
const lvlUnmuted = await peakLevel();
check('unmute restores output', lvlUnmuted > 0.005, `(peak=${lvlUnmuted.toFixed(4)})`);

// SFX plays a one-shot (measure a burst while triggering repeatedly).
let sfxPeak = 0;
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => window.__audio.playSfx('zap'));
  sfxPeak = Math.max(sfxPeak, (await dbg()).level);
  await page.waitForTimeout(30);
}
check('sfx produces signal', sfxPeak > 0.005, `(peak=${sfxPeak.toFixed(4)})`);

// Room change crossfades to a different track.
await click(880, 220, { button: 'right' }); // lab -> hallway
await settle();
await page.waitForTimeout(900);
check('reached hallway', (await room()) === 'hallway');
check('music switched to hall-theme', (await dbg()).currentMusic === 'hall-theme', `(current=${(await dbg()).currentMusic})`);

await click(872, 220, { button: 'right' }); // hallway -> gallery
await settle();
await page.waitForTimeout(900);
check('music switched to gallery-theme', (await dbg()).currentMusic === 'gallery-theme', `(current=${(await dbg()).currentMusic})`);

// Volume settings persist across reload.
await page.evaluate(() => window.__audio.setMusicVolume(0.33));
await page.waitForTimeout(200);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pnc-audio')));
check('settings persisted to localStorage', Math.abs(stored.music - 0.33) < 0.001, `(music=${stored.music})`);
await page.reload();
await page.waitForTimeout(2500);
const afterReload = await page.evaluate(() => window.__audio.settings.music);
check('settings restored after reload', Math.abs(afterReload - 0.33) < 0.001, `(music=${afterReload})`);

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
