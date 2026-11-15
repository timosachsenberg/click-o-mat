// A tiny offline chiptune renderer: pulse (duty), triangle, noise drums, echo.
import fs from 'fs';
const SR = 32000;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

export class Song {
  constructor(seconds) { this.buf = new Float32Array(Math.ceil(seconds * SR)); this.echoBuf = new Float32Array(this.buf.length); }
  // wave: 'tri' | 'p50' | 'p25' | 'p12' | 'saw'
  note(m, t, dur, wave, vol, o = {}) {
    const f0 = midi(m), n0 = Math.floor(t * SR), n1 = Math.min(this.buf.length, Math.floor((t + dur) * SR));
    const att = o.att ?? 0.006, rel = o.rel ?? 0.04, dec = o.dec ?? 0;       // dec: exponential decay rate (1/s)
    const duty = wave === 'p12' ? 0.125 : wave === 'p25' ? 0.25 : 0.5;
    let ph = 0, ph2 = 0.37, phs = 0, low = 0, band = 0;
    const lp = o.lp; // [cutoffHz, envHz, envDecay(1/s), resonance 0..1]
    const target = o.echo ? this.echoBuf : this.buf;
    for (let n = n0; n < n1; n++) {
      const tt = (n - n0) / SR;
      const vib = o.vib ? 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * tt) * Math.min(1, tt / 0.15) : 1;
      const slide = o.slide ? 2 ** ((o.slide * Math.max(0, 1 - tt / 0.05)) / 12) : 1;
      ph += (f0 * vib * slide) / SR; ph -= Math.floor(ph);
      let s;
      if (wave === 'tri') s = 4 * Math.abs(ph - 0.5) - 1;
      else if (wave === 'saw') s = 2 * ph - 1;
      else s = ph < duty ? 1 : -1;
      if (o.fat) { ph2 += (f0 * 1.007 * vib) / SR; ph2 -= Math.floor(ph2); s = 0.6 * s + 0.6 * (wave === 'saw' ? 2 * ph2 - 1 : ph2 < duty ? 1 : -1); }
      if (o.sub) { phs += (f0 * 0.5) / SR; s += o.sub * Math.sin(2 * Math.PI * phs); }
      if (lp) {
        const fc = Math.min(5000, lp[0] + lp[1] * Math.exp(-lp[2] * tt));
        const f = 2 * Math.sin((Math.PI * fc) / SR), q = 1.6 - 1.45 * (lp[3] ?? 0.3);
        low += f * band; const high = s - low - q * band; band += f * high; s = low;
      }
      let env = Math.min(1, tt / att) * Math.min(1, (dur - tt) / rel);
      if (dec) env *= Math.exp(-dec * tt);
      target[n] += s * vol * env;
    }
  }
  kick(t, vol = 0.5) {
    const n0 = Math.floor(t * SR); let ph = 0;
    for (let i = 0; i < SR * 0.16 && n0 + i < this.buf.length; i++) {
      const tt = i / SR; ph += (48 + 110 * Math.exp(-tt * 38)) / SR;
      this.buf[n0 + i] += Math.sin(2 * Math.PI * ph) * vol * Math.exp(-tt * 20);
    }
  }
  noise(t, dur, vol, hp = 0.6) {
    const n0 = Math.floor(t * SR); let last = 0, seed = (n0 * 7919 + 13) | 0;
    for (let i = 0; i < SR * dur && n0 + i < this.buf.length; i++) {
      seed = (seed * 1103515245 + 12345) | 0; const w = ((seed >>> 16) & 0x7fff) / 16384 - 1;
      const s = w - last * hp; last = w;
      this.buf[n0 + i] += s * vol * Math.exp(-(i / SR) * (5 / dur));
    }
  }
  /** A warm, round analog kick (long sine thump, soft-clipped). */
  kick8(t, vol = 0.6, len = 0.32) {
    const n0 = Math.floor(t * SR); let ph = 0;
    for (let i = 0; i < SR * len && n0 + i < this.buf.length; i++) {
      const tt = i / SR; ph += (46 + 150 * Math.exp(-tt * 55)) / SR;
      this.buf[n0 + i] += Math.tanh(Math.sin(2 * Math.PI * ph) * 1.8) * vol * Math.exp(-tt * (4.2 / len)) * Math.min(1, tt / 0.002);
    }
  }
  /** Filtered noise: a soft analog snare / clap / brush (band-passed). */
  fnoise(t, dur, vol, fc, res = 0.4) {
    const n0 = Math.floor(t * SR); let low = 0, band = 0, seed = (n0 * 2654435761) | 0;
    const f = 2 * Math.sin((Math.PI * fc) / SR), q = 1.6 - 1.45 * res;
    for (let i = 0; i < SR * dur && n0 + i < this.buf.length; i++) {
      seed = (seed * 1103515245 + 12345) | 0; const w = ((seed >>> 16) & 0x7fff) / 16384 - 1;
      low += f * band; const high = w - low - q * band; band += f * high;
      this.buf[n0 + i] += band * vol * Math.exp(-(i / SR) * (5 / dur));
    }
  }
  snare8(t, vol = 0.2) { this.fnoise(t, 0.16, vol, 1900, 0.3); this.note(50, t, 0.09, 'tri', vol * 0.9, { slide: 6, dec: 26 }); }
  clap(t, vol = 0.16) { for (const d of [0, 0.011, 0.023]) this.fnoise(t + d, 0.09, vol * 0.7, 1300, 0.5); }
  brush(t, vol = 0.05) { this.fnoise(t, 0.07, vol, 4200, 0.2); }
  /** Warm analog bass: detuned saws + sub through a resonant low-pass with a pluck envelope. */
  wbass(m, t, dur, vol = 0.3, o = {}) {
    this.note(m, t, dur, 'saw', vol, { fat: true, sub: 0.7, lp: [o.cut ?? 170, o.env ?? 750, o.envDec ?? 11, o.res ?? 0.35], att: 0.004, rel: 0.05, dec: o.dec ?? 1.2 });
  }
  snare(t, vol = 0.22) { this.noise(t, 0.13, vol, 0.2); this.note(52, t, 0.06, 'tri', vol * 0.8, { slide: 8, dec: 30 }); }
  hat(t, vol = 0.07) { this.noise(t, 0.035, vol, 0.95); }
  save(path, { echo = 0.3, echoTime = 0.28, fadeOut = 2.5 } = {}) {
    const N = this.buf.length, d = Math.floor(echoTime * SR);
    // echo channel: dry + two feedback taps
    for (let n = 0; n < N; n++) {
      let e = this.echoBuf[n];
      if (n >= d) { this.echoBuf[n] += this.echoBuf[n - d] * echo * 0.6; e = this.echoBuf[n]; }
      this.buf[n] += e;
    }
    // gentle low-pass + fade + soft clip
    let lp = 0; const out = Buffer.alloc(44 + N * 2);
    for (let n = 0; n < N; n++) {
      lp += (this.buf[n] - lp) * 0.72;
      const fade = Math.min(1, (N - n) / (fadeOut * SR), n / (0.02 * SR));
      const s = Math.tanh(lp * 1.25) * 0.92 * fade;   // a touch of tape saturation
      out.writeInt16LE(Math.round(s * 30000), 44 + n * 2);
    }
    out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
    out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 2, 40);
    fs.writeFileSync(path, out);
  }
}

/** Play a line of 8th (or 16th) steps: number = note, '-' = hold, null = rest. */
export function line(song, steps, t0, stepDur, wave, vol, o = {}) {
  for (let i = 0; i < steps.length; i++) {
    const m = steps[i];
    if (m == null || m === '-') continue;
    let len = 1; while (steps[i + len] === '-') len++;
    song.note(m + (o.transpose ?? 0), t0 + i * stepDur, len * stepDur * (o.gate ?? 0.92), wave, vol, o);
  }
}
