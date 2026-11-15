// Renders the adventure's music files: warm analog bass and drums under
// chiptune leads ("old meets new"), written as code and synthesized offline
// by tools/music/synth.mjs, then encoded to MP3 (needs ffmpeg on the PATH).
//
//   node tools/gen-music.mjs        → public/audio/<key>.mp3
//
// Each file's name is a music key: a loaded file overrides the procedural
// track of the same name (src/goa/music.ts), which stays as the fallback.
// The pieces end on a held chord and a short fade, so the loop's seam is quiet.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { Song, line } from './music/synth.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'music-'));
const pending = [];
/** Where a song's WAV goes; it is encoded once all songs are rendered. */
const out = (key) => { pending.push(key); return path.join(TMP, key + '.wav'); };
const _ = null, H = '-';
const CH = { D: [38, 62, 66, 69], Bm: [35, 59, 62, 66], G: [43, 59, 62, 67], A: [33, 57, 61, 64], 'F#m': [42, 57, 61, 66],
  F: [41, 60, 65, 69], C7: [36, 58, 64, 67], Bb: [34, 58, 62, 65],
  Em: [40, 59, 64, 67], G2: [43, 59, 62, 67], D2: [38, 57, 62, 66], C: [36, 60, 64, 67], Am: [33, 57, 60, 64], B7: [35, 57, 63, 66],
  am: [45, 57, 60, 64], f: [41, 57, 60, 65], c: [48, 55, 60, 64], e: [40, 56, 59, 64], dm: [38, 57, 62, 65], g: [43, 55, 59, 62] };

// ---------------- 1. Neckarbrücke — Abendrot (calm; warm sub bass, brushes, a chip tune on top)
{
  const bpm = 92, e = 60 / bpm / 2, bar = e * 8, s = new Song(bar * 19 + 2.5);
  const A = [['D', [66, _, 69, _, 74, H, H, 69]], ['Bm', [71, H, 69, 66, 62, H, H, _]], ['G', [67, _, 71, _, 74, H, 71, 67]], ['A', [64, H, 69, H, 73, H, H, _]]];
  const A2 = [A[0], A[1], A[2], ['A', [73, H, 71, 69, 64, H, H, _]]];
  const B = [['G', [79, H, 78, 74, 71, H, 74, _]], ['A', [76, H, 73, 69, 76, H, H, _]], ['F#m', [78, H, 76, 73, 69, H, 73, _]], ['Bm', [74, H, 71, 66, 71, H, H, _]],
    ['G', [67, 71, 74, 79, H, H, 78, 74]], ['A', [73, 76, 81, H, 79, 76, 73, _]], ['D', [74, H, H, 69, 66, H, 62, _]], ['D', [_, _, _, _, _, _, _, _]]];
  let t = 0;
  for (const [name, bars] of [['intro', A.slice(0, 2)], ['A', A], ['A2', A2], ['B', B], ['A2+', A2]]) for (const [ch, mel] of bars) {
    const c = CH[ch];
    s.wbass(c[0], t, e * 3.7, 0.3, { env: 420, envDec: 7 }); s.wbass(c[0] + 7, t + e * 4, e * 2.7, 0.22, { env: 320 }); s.wbass(c[0] + 12, t + e * 7, e * 0.9, 0.16, { env: 300 });
    [c[1], c[2], c[3], c[2], c[1] + 12, c[3], c[2], c[3]].forEach((m, i) => s.note(m, t + i * e, e * 0.8, 'p25', name === 'B' ? 0.04 : 0.032, { dec: 9, echo: true }));
    if (name !== 'intro') line(s, mel, t, e, 'p50', 0.08, { vib: true, echo: true, dec: 1.2 });
    if (name === 'A2+') line(s, mel, t, e, 'tri', 0.065, { transpose: 12, dec: 2 });
    if (name !== 'intro' && name !== 'A') { s.kick8(t, 0.3, 0.28); s.brush(t + e * 2, 0.04); s.brush(t + e * 4, 0.025); s.brush(t + e * 6, 0.045); if (name !== 'A2') s.brush(t + e * 7, 0.025); }
    t += bar;
  }
  s.wbass(38, t, 2.2, 0.3, { env: 400, envDec: 4 }); s.note(66, t, 2, 'p25', 0.045, { dec: 2, echo: true }); s.note(74, t, 2, 'p50', 0.065, { dec: 2, echo: true });
  s.save(out('neckar-theme'));
}

// ---------------- 2. Epplehaus — Plenum Offbeat (scrappy; walking warm bass, one-drop beat, chip skank and lead)
{
  const bpm = 126, e = 60 / bpm / 2, bar = e * 8, s = new Song(bar * 18 + 2.5);
  const A = [['Em', [71, _, 71, 74, 76, H, 74, 71]], ['G2', [74, _, 71, 67, 71, H, H, _]], ['D2', [69, _, 69, 71, 74, H, 71, 69]], ['C', [67, H, 64, 67, 72, H, 71, _]]];
  const A2 = [['Em', [71, _, 71, 74, 76, H, 79, H]], ['G2', [78, H, 74, 71, 74, H, H, _]], ['D2', [69, _, 74, H, 78, H, 76, 74]], ['C', [76, H, 72, H, 71, 69, 67, _]]];
  const B = [['Am', [72, H, 69, _, 72, 76, H, _]], ['C', [79, H, 76, _, 72, 76, H, _]], ['B7', [78, H, 75, _, 71, 75, 78, H]], ['B7', [83, H, 81, 78, 75, H, 71, _]]];
  let t = 0;
  for (const [name, bars] of [['intro', A.slice(0, 2)], ['A', A], ['A2', A2], ['B', B], ['A2+', A2]]) bars.forEach(([ch, mel], b) => {
    const c = CH[ch], r = c[0] + 12;
    [r, r, r + 7, r, r + 12, r + 7, r + 4 - (ch === 'Em' || ch === 'Am' ? 1 : 0), r + 7].forEach((m, i) => s.wbass(m - 12, t + i * e, e * 0.85, 0.27, { env: 900, envDec: 16, res: 0.45 }));
    [1, 3, 5, 7].forEach((i) => c.slice(1).forEach((m) => s.note(m + 12, t + i * e, e * 0.4, 'p25', 0.036)));     // the skank
    if (name !== 'intro') line(s, mel, t, e, 'p12', 0.1, { vib: true, echo: true });
    if (name === 'A2+') line(s, mel, t, e, 'p50', 0.045, { transpose: 12 });
    s.kick8(t + e * 4, 0.42, 0.22); if (name !== 'intro') s.kick8(t, 0.3, 0.2); s.snare8(t + e * 4, 0.14); if (name === 'B' || name === 'A2+') s.snare8(t + e * 2, 0.07);
    for (let i = 0; i < 8; i++) s.brush(t + i * e, i % 2 ? 0.05 : 0.022);
    if (b === bars.length - 1) { s.snare8(t + e * 6, 0.12); s.snare8(t + e * 7, 0.16); }
    t += bar;
  });
  s.wbass(40, t, 1.8, 0.3, { envDec: 5 }); [64, 67, 71].forEach((m) => s.note(m + 12, t, 1.6, 'p25', 0.04, { dec: 2 })); s.note(76, t, 1.6, 'p12', 0.09, { vib: true, echo: true, dec: 1.5 }); s.kick8(t, 0.4);
  s.save(out('epple-theme'), { echoTime: 0.18, echo: 0.2 });
}

// ---------------- 3. Picasso — Alis Schlager (pushy on purpose; analog oom-pah, claps, chip lead, the key change)
{
  const bpm = 118, e = 60 / bpm / 2, bar = e * 8, s = new Song(bar * 18 + 2.5);
  const V = [['F', [69, H, 72, 69, 77, H, 72, H]], ['C7', [76, H, 74, 72, 70, H, 67, H]], ['C7', [67, H, 70, 67, 76, H, 74, H]], ['F', [72, H, 69, 65, 69, H, H, _]],
    ['F', [69, H, 72, 69, 77, H, 81, H]], ['Bb', [82, H, 81, 79, 77, H, 74, H]], ['C7', [72, 74, 76, 79, 82, H, 79, 76]], ['F', [77, H, H, _, 77, 77, 77, _]]];
  let t = 0;
  for (let i = 0; i < 8; i++) s.snare8(t + i * e, 0.05 + i * 0.016); t += bar;
  for (const [pass, tr] of [[0, 0], [1, 2]]) V.forEach(([ch, mel], b) => {
    const c = CH[ch].map((m) => m + tr);
    [0, 2, 4, 6].forEach((i, k) => s.wbass(c[0] + (k % 2 ? 7 : 0), t + i * e, e * 1.1, 0.34, { env: 650, envDec: 13 }));
    [1, 3, 5, 7].forEach((i) => c.slice(1).forEach((m) => s.note(m + 12, t + i * e, e * 0.45, 'p25', 0.036)));
    line(s, mel, t, e, 'p12', 0.105, { transpose: tr, vib: true, echo: true });
    if (pass) line(s, mel, t, e, 'p50', 0.045, { transpose: tr + 12 });
    s.kick8(t, 0.5, 0.2); s.kick8(t + e * 4, 0.5, 0.2); s.clap(t + e * 2); s.clap(t + e * 6);
    for (let i = 0; i < 8; i++) s.brush(t + i * e, i % 2 ? 0.06 : 0.03);
    if (b === 7) for (let i = 4; i < 8; i++) s.snare8(t + i * e, 0.13);
    t += bar;
  });
  const c = CH.F.map((m) => m + 2);
  s.kick8(t, 0.5); s.clap(t, 0.2); s.wbass(c[0], t, 1.8, 0.34, { envDec: 5 }); c.slice(1).forEach((m) => s.note(m + 12, t, 1.6, 'p25', 0.045, { dec: 2 })); s.note(79, t, 1.6, 'p12', 0.1, { vib: true, echo: true, dec: 1.5 });
  s.save(out('pub-theme'), { echoTime: 0.19, echo: 0.2 });
}

// ---------------- 4. Hölderlinturm — Turmstube (a waltz: a chip music box over a soft warm bass)
{
  const q = 60 / 132, e = q / 2, bar = q * 3, s = new Song(bar * 23 + 3);
  const A = [['am', [76, H, H, 72, 69, H]], ['f', [77, H, H, 72, 69, H]], ['c', [79, H, 76, H, 72, H]], ['e', [71, H, H, 68, 71, H]],
    ['am', [76, H, H, 72, 69, H]], ['f', [81, H, H, 77, 72, H]], ['dm', [74, H, 77, H, 74, H]], ['e', [76, H, 71, H, 68, H]]];
  const B = [['c', [72, 76, 79, H, 76, H]], ['g', [71, 74, 79, H, 74, H]], ['am', [72, 76, 81, H, 76, H]], ['e', [80, H, 76, H, 71, H]]];
  let t = 0;
  for (const [name, bars] of [['intro', A.slice(0, 2)], ['A', A], ['B', B], ['A+', A]]) for (const [ch, mel] of bars) {
    const c = CH[ch];
    s.wbass(c[0], t, bar * 0.95, 0.28, { env: 260, envDec: 6, cut: 150 });
    for (const beat of [1, 2]) c.slice(1).forEach((m, k) => s.note(m + 12, t + beat * q + k * 0.012, q * 0.9, 'tri', 0.04, { dec: 7, echo: true }));   // the music box's chords
    if (name !== 'intro') line(s, mel, t, e, 'p25', 0.075, { echo: true, dec: 1.6, vib: true });
    if (name === 'A+') { line(s, mel, t, e, 'tri', 0.06, { transpose: 12, dec: 3 }); s.brush(t + q, 0.03); s.brush(t + 2 * q, 0.03); }
    if (name === 'B') s.note(c[1] + 24, t, bar, 'p12', 0.018, { vib: true });
    t += bar;
  }
  s.wbass(45, t, 2.6, 0.28, { env: 240, envDec: 3 }); [57, 60, 64, 69].forEach((m, k) => s.note(m + 12, t + k * 0.09, 2.2, 'tri', 0.045, { dec: 2, echo: true }));
  s.save(out('turm-toon'), { echoTime: 0.34, echo: 0.36 });
}

// ---------------- 5. Goa — Folge dem Bass (140 bpm: an analog rolling bass and a round kick, chip arpeggios, an acid line)
{
  const bpm = 140, x = 60 / bpm / 4, bar = x * 16, s = new Song(bar * 24 + 2.5);
  const ROOT = 33; // A1
  const arpA = [0, 12, 7, 12, 3, 12, 7, 10, 0, 12, 8, 12, 7, 10, 12, 15], arpB = [0, 12, 7, 12, 1, 13, 8, 13, 0, 12, 7, 15, 13, 12, 10, 8];
  const lead = [76, H, H, H, H, H, 77, H, 76, H, H, H, 74, H, 72, H, 76, H, H, H, H, H, 79, H, 77, H, 76, H, 74, H, H, H];
  const acid = [0, _, 0, 12, _, 0, 3, _, 0, _, 12, 0, _, 10, _, 7];
  // k kick · b bass · h hats · a/A arpeggio · L lead · c acid · r riser
  const plan = ['kb', 'kb', 'kbh', 'kbh', 'kbhc', 'kbhc', 'kbha', 'kbhA', 'kbhaL', 'kbhaL', 'kbhAL', 'kbhAcL', 'aL', 'aL', 'ac', 'rc', 'kbhAL', 'kbhAL', 'kbhacL', 'kbhAcL', 'kbhAL', 'kbhAcL', 'kbhc', 'kb'];
  plan.forEach((p, b) => {
    const t = b * bar, tr = b % 8 >= 6 && p.includes('k') ? 1 : 0, open = 400 + 1400 * (0.5 - 0.5 * Math.cos((b / 24) * Math.PI * 4));
    if (p.includes('k')) for (let i = 0; i < 4; i++) s.kick8(t + i * 4 * x, 0.6, 0.2);
    if (p.includes('b')) for (let i = 0; i < 16; i++) if (i % 4) s.wbass(ROOT + tr, t + i * x, x * 0.9, 0.3, { cut: 120, env: 900, envDec: 30, res: 0.5, dec: 6 });
    if (p.includes('h')) for (let i = 0; i < 4; i++) { s.brush(t + (i * 4 + 2) * x, 0.07); if (b % 2) s.brush(t + (i * 4 + 3) * x, 0.025); if (b >= 8) s.clap(t + 4 * x * (i % 2 ? i : 99), 0.07); }
    const arp = p.includes('A') ? arpB : p.includes('a') ? arpA : null;
    if (arp) arp.forEach((d, i) => s.note(57 + d + tr, t + i * x, x * 0.7, 'p12', 0.048 + (i % 4 === 0 ? 0.018 : 0), { dec: 10, echo: true }));
    if (p.includes('c')) acid.forEach((d, i) => d != null && s.note(45 + d + tr, t + i * x, x * 0.85, 'saw', 0.1, { lp: [open * 0.4, open * 1.6, 22, 0.85], dec: 4, slide: i % 5 === 3 ? -2 : 0, echo: b >= 12 }));
    if (p.includes('L')) line(s, lead.slice((b % 2) * 16, (b % 2) * 16 + 16), t, x, 'p50', 0.07, { vib: true, echo: true, dec: 0.8, transpose: tr });
    if (p.includes('r')) for (let i = 0; i < 16; i++) s.snare8(t + i * x, 0.03 + i * 0.01);
    if (b % 4 === 3 && p.includes('k')) { s.snare8(t + 12 * x, 0.1); s.snare8(t + 14 * x, 0.14); }
  });
  s.save(out('goa-theme'), { echoTime: (60 / 140) * 0.75, echo: 0.4 });
}

fs.mkdirSync(OUT, { recursive: true });
for (const key of pending) {
  // Mono, 80 kbit/s, 5 dB down: background music, not a concert.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(TMP, key + '.wav'), '-af', 'volume=-5dB', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '80k', path.join(OUT, key + '.mp3')]);
  console.log('wrote', path.join('public', 'audio', key + '.mp3'));
}
fs.rmSync(TMP, { recursive: true, force: true });
