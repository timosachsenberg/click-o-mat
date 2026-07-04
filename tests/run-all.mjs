/**
 * End-to-end test runner: starts a Vite dev server (the suites need the
 * dev-only `window.__engine` / `window.__audio` debug hooks), then runs
 * every suite sequentially against it and prints a summary.
 *
 * Usage:  npm test          (all suites)
 *         node tests/run-all.mjs verify-ink playthrough   (a subset)
 *
 * Requires: `npm i` (playwright is a devDependency) and a one-time
 * `npx playwright install chromium`.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const PORT = process.env.TEST_PORT ?? '5199';
const BASE = `http://localhost:${PORT}`;

// Ordered roughly fast → slow.
const ALL_SUITES = [
  'verify-title.mjs',
  'smoke.mjs',
  'verify-continue.mjs',
  'verify-slotmgmt.mjs',
  'verify-options.mjs',
  'verify-slots.mjs',
  'verify-layers.mjs',
  'verify-png.mjs',
  'verify-audio.mjs',
  'verify-ink.mjs',
  'verify-npc.mjs',
  'verify-triggers.mjs',
  'verify-qol.mjs',
  'verify-speech.mjs',
  'verify-scroll.mjs',
  'playthrough.mjs',
  'verify-outdoor.mjs',
];

const filter = process.argv.slice(2);
const suites = filter.length
  ? ALL_SUITES.filter((s) => filter.some((f) => s.includes(f)))
  : ALL_SUITES;
if (suites.length === 0) {
  console.error(`no suites match: ${filter.join(', ')}`);
  process.exit(1);
}

const shots = path.join(here, 'screenshots');
mkdirSync(shots, { recursive: true });

console.log(`Starting dev server on :${PORT} …`);
const server = spawn('npx', ['vite', '--port', PORT, '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});

const up = await (async () => {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
})();
if (!up) {
  server.kill();
  console.error('Dev server failed to start.');
  process.exit(1);
}

const results = [];
for (const suite of suites) {
  console.log(`\n━━━ ${suite} ━━━`);
  const started = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, suite)], {
      stdio: 'inherit',
      env: { ...process.env, BASE_URL: BASE, SHOT_DIR: shots },
    });
    child.on('close', resolve);
  });
  results.push({ suite, ok: code === 0, secs: Math.round((Date.now() - started) / 1000) });
}

server.kill();

console.log('\n════════ summary ════════');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.suite}  (${r.secs}s)`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? `\nAll ${results.length} suites passed.` : `\n${failed} suite(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
