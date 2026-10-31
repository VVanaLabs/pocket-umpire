// Audio onset picker: RMS per 50ms window, peaks > +10dB over 3s rolling median,
// min separation 4s. Tape-ball bat cracks are the loudest transients.
import { readFileSync } from "node:fs";
const raw = readFileSync("/tmp/tape-audio.pcm");
const n = raw.length / 2;
const sr = 16000;
const win = Math.floor(sr * 0.05); // 50ms
const nw = Math.floor(n / win);
const rms = new Float64Array(nw);
for (let w = 0; w < nw; w++) {
  let s = 0;
  for (let i = 0; i < win; i++) {
    const v = raw.readInt16LE((w * win + i) * 2) / 32768;
    s += v * v;
  }
  rms[w] = Math.sqrt(s / win) + 1e-9;
}
const db = Array.from(rms, (v) => 20 * Math.log10(v));
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const cands = [];
const medWin = Math.floor(3 / 0.05); // 3s
for (let w = medWin; w < nw; w++) {
  const floor = med(db.slice(w - medWin, w));
  if (db[w] - floor > 10) cands.push({ t: (w * win) / sr, snr: db[w] - floor });
}
cands.sort((a, b) => b.snr - a.snr);
const picks = [];
for (const c of cands) {
  if (picks.every((p) => Math.abs(p.t - c.t) > 4)) picks.push(c);
  if (picks.length >= 12) break;
}
picks.sort((a, b) => a.t - b.t);
for (const p of picks)
  console.log(`hit t=${p.t.toFixed(1)}s snr=+${p.snr.toFixed(1)}dB clip=${Math.max(0, p.t - 4).toFixed(1)}..${(p.t + 3).toFixed(1)}`);
