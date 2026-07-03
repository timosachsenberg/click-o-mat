import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOT_DIR = process.env.SHOT_DIR ?? '.';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(`[console.${msg.type()}] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

await page.goto(BASE);
await page.waitForTimeout(3000);

// The canvas is scaled to FIT inside the viewport; compute game->screen mapping.
const box = await page.locator('canvas').boundingBox();
await page.waitForTimeout(300);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // dismiss title screen
await page.waitForTimeout(1000);
if (!box) {
  console.log('NO CANVAS FOUND');
  console.log(errors.join('\n'));
  await browser.close();
  process.exit(1);
}
const gx = (x) => box.x + (x / 960) * box.width;
const gy = (y) => box.y + (y / 600) * box.height;
const click = async (x, y, opts = {}) => {
  await page.mouse.click(gx(x), gy(y), opts);
};

await page.screenshot({ path: `${SHOT_DIR}/shot-01-boot.png` });

// Skip intro lines
await click(480, 200);
await page.waitForTimeout(400);
await click(480, 200);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOT_DIR}/shot-02-idle.png` });

// Walk left across the room (behind the lamp)
await click(150, 400);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOT_DIR}/shot-03-walked.png` });

// Select "Look at" verb (row 2 middle: ~x 26+128=154..., label at y ~450+36+38=524) and look at poster
await click(180, 524);
await page.waitForTimeout(200);
await page.screenshot({ path: `${SHOT_DIR}/shot-04-verb.png` });
await click(140, 130); // poster
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOT_DIR}/shot-05-looked.png` });
await click(480, 200); // dismiss line
await page.waitForTimeout(300);

// Pick up battery: verb "Pick up" (row 1 middle at y ~486), then battery at (466,232)
await click(180, 486);
await page.waitForTimeout(200);
await click(466, 232);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SHOT_DIR}/shot-06-battery.png` });

// Talk to tentacle: right-click him (default verb talkto)
await click(745, 370);
await page.waitForTimeout(3500);
await page.screenshot({ path: `${SHOT_DIR}/shot-07-neddefault.png` });
await click(745, 370, { button: 'right' });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SHOT_DIR}/shot-08-dialog.png` });

console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 20).join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
