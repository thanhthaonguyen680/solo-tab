// Tổng hợp tiếng guitar nylon từ tab (Karplus–Strong mở rộng) → WAV stereo 44.1 kHz.
// Dùng: npm run audio:render -- <slug>   (đọc scripts/tab-audio/scores/<slug>.mjs, ghi public/audio/<slug>.mp3)
//   hoặc: node scripts/tab-audio/render.mjs <score.mjs> <out.wav>
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [, , scorePath, outPath] = process.argv;
const score = (await import(pathToFileURL(resolve(scorePath)).href)).default;

const FS = 44100;
const OPEN = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }; // E4 B3 G3 D3 A2 E2
const beatSec = 60 / score.bpm;
const lead = 0.4;
const totalBeats = score.measures.length * score.beatsPerMeasure;
const total = Math.ceil((lead + totalBeats * beatSec + 4) * FS);

// Bộ sinh số ngẫu nhiên cố định để lần render nào cũng giống nhau
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

// ---- Chuyển tab thành sự kiện theo thời gian ----
const events = [];
score.measures.forEach((m, i) => {
  for (const [beat, string, fret, kind] of m) {
    const human = (rand() - 0.5) * 0.012; // lệch nhịp nhẹ cho tự nhiên
    const spread = string >= 5 ? 0 : 0.008; // trong hợp âm, bass bật trước một chút
    const t = lead + ((i * score.beatsPerMeasure + beat - 1) * beatSec) + human + (kind ? 0 : spread);
    const midi = OPEN[string] + fret + score.capo;
    events.push({ t, string, midi, kind: kind ?? "pluck" });
  }
});
events.sort((a, b) => a.t - b.t);

// ---- Mỗi dây là một vòng trễ Karplus–Strong ----
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
class Str {
  constructor(n) {
    this.n = n;
    this.buf = new Float32Array(4096);
    this.w = 0;
    this.len = 100;
    this.target = 100;
    this.prev = 0;
    this.gain = 0.996;
    this.exc = null;
    this.ei = 0;
  }
  setPitch(midi, glideSec) {
    const L = FS / hz(midi) - 0.5;
    this.target = L;
    this.glide = glideSec ? (L - this.len) / (glideSec * FS) : 0;
    if (!glideSec) this.len = L;
    const f = hz(midi);
    const t60 = 5.5 - Math.min(3.5, (f - 80) / 160); // nốt cao tắt nhanh hơn
    this.gain = 10 ** (-3 / (t60 * f));
  }
  pluck(midi, vel) {
    // Tay chạm dây làm tắt tiếng cũ: giữ 15% trong dây, 85% còn lại tắt dần trong 12 ms
    // (một bản sao "bóng" của dây) để không có tiếng tách khi cắt đột ngột.
    const ghost = new Str(this.n);
    Object.assign(ghost, { buf: this.buf.slice(), w: this.w, len: this.len, target: this.len, glide: 0, prev: this.prev, gain: this.gain });
    this.ghost = { str: ghost, env: 0.85, step: 0.85 / (0.012 * FS) };
    for (let i = 0; i < this.buf.length; i++) this.buf[i] *= 0.15;
    this.prev *= 0.15;
    this.setPitch(midi, 0);
    const N = Math.round(this.len);
    const exc = new Float32Array(N);
    let lp = 0;
    const soft = this.n >= 4 ? 0.16 : 0.24; // dây trầm gảy bằng ngón cái, mềm hơn
    for (let i = 0; i < N; i++) {
      lp += soft * ((rand() * 2 - 1) - lp);
      exc[i] = lp;
    }
    const p = Math.max(1, Math.round(N * 0.17)); // vị trí gảy gần ngựa đàn
    for (let i = N - 1; i >= p; i--) exc[i] -= exc[i - p];
    let peak = 0;
    for (const v of exc) peak = Math.max(peak, Math.abs(v));
    for (let i = 0; i < N; i++) exc[i] *= vel / (peak || 1);
    // Đầu ngón tay mềm: tiếng gảy vào dần trong ~1,5 ms thay vì bật tức thì
    const att = Math.min(N, Math.round(0.0015 * FS));
    for (let i = 0; i < att; i++) exc[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / att);
    this.exc = exc;
    this.ei = 0;
  }
  slide(midi) {
    this.setPitch(midi, 0.06); // luyến: trượt cao độ, không gảy lại
  }
  tick() {
    if (this.glide) {
      this.len += this.glide;
      if ((this.glide > 0 && this.len >= this.target) || (this.glide < 0 && this.len <= this.target)) {
        this.len = this.target;
        this.glide = 0;
      }
    }
    const size = this.buf.length;
    const rp = this.w - this.len;
    const i0 = Math.floor(rp);
    const fr = rp - i0;
    const a = this.buf[((i0 % size) + size) % size];
    const b = this.buf[(((i0 + 1) % size) + size) % size];
    const delayed = a * (1 - fr) + b * fr;
    let y = this.gain * 0.5 * (delayed + this.prev);
    this.prev = delayed;
    if (this.exc && this.ei < this.exc.length) y += this.exc[this.ei++];
    this.buf[this.w % size] = y;
    this.w++;
    if (this.ghost) {
      const g = this.ghost;
      const out = g.str.tick() * g.env;
      g.env -= g.step;
      if (g.env <= 0) this.ghost = null;
      return y + out;
    }
    return y;
  }
}

const strings = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [n, new Str(n)]));
const pan = { 1: 0.18, 2: 0.12, 3: 0.04, 4: -0.04, 5: -0.12, 6: -0.18 };
const vel = { 1: 0.8, 2: 0.78, 3: 0.6, 4: 0.55, 5: 0.62, 6: 0.66 };

const L = new Float32Array(total);
const R = new Float32Array(total);
let ev = 0;
for (let n = 0; n < total; n++) {
  const t = n / FS;
  while (ev < events.length && events[ev].t <= t) {
    const e = events[ev++];
    const s = strings[e.string];
    if (e.kind === "slide") s.slide(e.midi);
    else s.pluck(e.midi, vel[e.string] * (0.92 + rand() * 0.16));
  }
  let l = 0;
  let r = 0;
  for (let k = 1; k <= 6; k++) {
    const y = strings[k].tick();
    l += y * (0.5 - pan[k]);
    r += y * (0.5 + pan[k]);
  }
  L[n] = l;
  R[n] = r;
}

// ---- Thân đàn: vài cộng hưởng + lọc bớt chói ----
function biquadPeak(x, f0, q, gainDb) {
  const A = 10 ** (gainDb / 40), w = (2 * Math.PI * f0) / FS, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = 1 + al * A, b1 = -2 * c, b2 = 1 - al * A, a0 = 1 + al / A, a1 = -2 * c, a2 = 1 - al / A;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
}
function lowpass(x, f0) {
  const w = (2 * Math.PI * f0) / FS, q = 0.707, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = (1 - c) / 2, b1 = 1 - c, b2 = (1 - c) / 2, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
}
for (const ch of [L, R]) {
  biquadPeak(ch, 105, 2, 4);
  biquadPeak(ch, 210, 2.5, 3);
  biquadPeak(ch, 420, 2, 1.5);
  biquadPeak(ch, 2600, 1, -3);
  lowpass(ch, 5000);
}

// ---- Reverb phòng nhỏ (Schroeder) ----
function reverb(x, offset) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: d + offset, buf: new Float32Array(d + offset), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.6 + c.lp * 0.4;
      c.buf[c.i] = x[n] * 0.5 + c.lp * 0.8;
      c.i = (c.i + 1) % c.d;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      const y = -s + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.d;
      s = y;
    }
    out[n] = s;
  }
  return out;
}
const wetL = reverb(L, 0);
const wetR = reverb(R, 23);
for (let n = 0; n < total; n++) {
  L[n] = L[n] + wetL[n] * 0.12;
  R[n] = R[n] + wetR[n] * 0.12;
}

// ---- Chuẩn hoá về -1 dBFS, fade cuối ----
let peak = 0;
for (let n = 0; n < total; n++) peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
const norm = 10 ** (-1 / 20) / peak;
const fade = Math.round(1.5 * FS);
const pcm = Buffer.alloc(total * 4);
for (let n = 0; n < total; n++) {
  const f = n > total - fade ? (total - n) / fade : 1;
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n] * norm * f)) * 32767), n * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n] * norm * f)) * 32767), n * 4 + 2);
}
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
h.writeUInt32LE(FS, 24); h.writeUInt32LE(FS * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
writeFileSync(outPath, Buffer.concat([h, pcm]));
console.log(`${events.length} nốt, ${(total / FS).toFixed(1)} giây → ${outPath}`);
