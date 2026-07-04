import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT_DIR = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });

const errors = [];
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
});

await page.goto(BASE);
await page.waitForTimeout(3000);
const box = await page.locator('canvas').boundingBox();
await page.waitForTimeout(300);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title screen
await page.waitForTimeout(1000);
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = async (x, y, opts = {}) => page.mouse.click(gx(x), gy(y), opts);

// Wait for the current interaction/cutscene to finish. While a speech line
// is showing (busy, not interruptible) a click skips it; while auto-walking
// (interruptible) we must NOT click or we'd cancel the interaction.
const settle = async () => {
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => ({
      busy: window.__engine.busy,
      inter: window.__engine.interruptible,
      dialog: window.__engine.dialogMode,
    }));
    if (!st.busy && !st.dialog) return;
    if (st.busy && !st.inter) await click(480, 240);
    await page.waitForTimeout(250);
  }
  const st = await page.evaluate(() => ({
    busy: window.__engine.busy, inter: window.__engine.interruptible,
    dialog: window.__engine.dialogMode, room: window.__engine.state.currentRoom,
  }));
  await page.screenshot({ path: `${SHOT_DIR}/timeout.png` });
  throw new Error('settle() timed out: ' + JSON.stringify(st));
};
const flags = () => page.evaluate(() => ({ ...window.__engine.state.flags }));
const inv = () => page.evaluate(() => [...window.__engine.state.inventory]);

const VERB = {
  give: [46, 486], pickup: [180, 486], use: [300, 486],
  open: [46, 524], lookat: [180, 524], push: [300, 524],
  close: [46, 562], talkto: [180, 562], pull: [300, 562],
};
const SLOT = (i) => [522 + (i % 4) * 112, 505 + Math.floor(i / 4) * 66];
const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) process.exitCode = 1; };

await settle(); // intro lines

// 1. Pick up battery
await click(...VERB.pickup);
await click(466, 232);
await settle();
check('battery picked up', (await inv()).includes('battery'));

// 2. Talk to Ned briefly (dialog tree)
await click(745, 370, { button: 'right' });
for (let i = 0; i < 100; i++) {
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({
    busy: window.__engine.busy,
    inter: window.__engine.interruptible,
    dialog: window.__engine.dialogMode,
    choices: window.__engine.choicesShowing,
  }));
  if (!st.dialog && !st.busy) break;
  if (st.choices) {
    // Read the actual choice text positions from Phaser, then click by content.
    const choices = await page.evaluate(() =>
      window.__engine.uiScene.choiceContainer.list
        .filter((t) => t.type === 'Text' && t.visible && t.text.startsWith('●'))
        .map((t) => { const b = t.getBounds(); return { text: t.text, x: b.centerX, y: b.centerY }; })
    );
    const f = await flags();
    const wanted = f.knowsWant ? 'I have to go now.' : 'Is there anything you want?';
    const target = choices.find((c) => c.text.includes(wanted));
    if (target) { await click(target.x, target.y); await page.waitForTimeout(300); }
  } else if (st.busy && !st.inter) {
    await click(480, 240); // skip lines, never cancel walks
  }
}
check('learned what Ned wants', (await flags()).knowsWant === true);

// 3. Open door -> hallway
await click(880, 220, { button: 'right' });
await settle();
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOT_DIR}/pt-01-hallway.png` });

// 4. Push plant
await click(...VERB.push);
await click(700, 380);
await settle();
check('plant moved', (await flags()).plantMoved === true);
await page.screenshot({ path: `${SHOT_DIR}/pt-02-plant-pushed.png` });

// 5. Pick up key
await click(688, 410, { button: 'right' });
await settle();
check('key picked up', (await inv()).includes('key'));

// 6. Back to lab
await click(85, 220, { button: 'right' });
await settle();
await page.waitForTimeout(600);

// 7. Use key with cabinet
await click(...VERB.use);
await click(...SLOT(1)); // key
await click(670, 230);
await settle();
check('cabinet opened', (await flags()).cabinetOpen === true);
await page.screenshot({ path: `${SHOT_DIR}/pt-03-cabinet-open.png` });

// 8. Pick up hamster
await click(670, 232, { button: 'right' });
await settle();
check('hamster picked up', (await inv()).includes('hamster'));

// 9. Use battery with machine
await click(...VERB.use);
await click(...SLOT(0)); // battery
await click(130, 240);
await settle();
check('machine powered', (await flags()).machinePowered === true);

// 10. Use hamster with machine (inventory now [key, hamster])
await click(...VERB.use);
await click(...SLOT(1));
await click(130, 240);
await settle();
check('hamster irradiated', (await inv()).includes('glowhamster'));
await page.screenshot({ path: `${SHOT_DIR}/pt-04-glowhamster.png` });

// 11. Save before winning
await page.keyboard.press('F5');
await page.waitForTimeout(500);

// 12. Give glowing hamster to Ned
await click(...VERB.give);
await click(...SLOT(1)); // glowing hamster
await click(745, 370);
await settle();
check('game won', (await flags()).gameWon === true);
await page.screenshot({ path: `${SHOT_DIR}/pt-05-the-end.png` });

// 13. Load the pre-win save
await page.keyboard.press('F9');
await page.waitForTimeout(1500);
const loaded = await page.evaluate(() => ({
  inv: [...window.__engine.state.inventory],
  won: window.__engine.state.flags.gameWon,
}));
check('save/load restored pre-win state', loaded.inv.includes('glowhamster') && !loaded.won);
await page.screenshot({ path: `${SHOT_DIR}/pt-06-loaded.png` });

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 20).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
