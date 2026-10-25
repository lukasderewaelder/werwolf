// Bereitet die Audio-Dateien der App vor (einmaliges Entwicklungswerkzeug, kein Teil der App).
//   - liest MP3/OGG aus einem Quellordner, schneidet und blendet die Töne, wandelt in MP3 um
//   - misst die Lautstärke der Musikstücke und schreibt Pegelwerte für src/audio-files.js
// Aufruf: node tools/prepare-audio.mjs <Quellordner> <Zielordner>
// Benötigt (nicht im Projekt installiert): npm i --no-save mpg123-decoder @wasm-audio-decoders/ogg-vorbis lamejs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { OggVorbisDecoder } from '@wasm-audio-decoders/ogg-vorbis';
const require = createRequire(import.meta.url);
const lamejs = new Function(readFileSync(require.resolve('lamejs/lame.all.js'), 'utf8') + '; return lamejs;')();

const [,, srcDir, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });

async function decode(file) {
  const bytes = new Uint8Array(readFileSync(file));
  if (file.endsWith('.ogg')) {
    const d = new OggVorbisDecoder(); await d.ready;
    const r = await d.decodeFile(bytes); d.free();
    return { ch: r.channelData.map((c) => c.subarray(0, r.samplesDecoded)), rate: r.sampleRate };
  }
  const d = new MPEGDecoder(); await d.ready;
  const r = d.decode(bytes); d.free();
  return { ch: r.channelData.map((c) => c.subarray(0, r.samplesDecoded)), rate: r.sampleRate };
}

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
function peakOf(ch) { let p = 0; for (const c of ch) for (let i = 0; i < c.length; i += 3) p = Math.max(p, Math.abs(c[i])); return p; }

/** Mittlere Lautstärke (RMS) nur über Abschnitte, die nicht still sind (Fenster 0,4 s, Schwelle -50 dBFS). */
function loudness(ch, rate) {
  const win = Math.round(rate * 0.4); let sum = 0, n = 0;
  for (let i = 0; i + win < ch[0].length; i += win) {
    let s = 0;
    for (const c of ch) for (let k = i; k < i + win; k += 4) s += c[k] * c[k];
    const ms = s / (ch.length * (win / 4));
    if (db(Math.sqrt(ms)) > -50) { sum += ms; n++; }
  }
  return n ? Math.sqrt(sum / n) : 0;
}

function trimSilence(ch, rate, thresholdDb = -45) {
  const th = 10 ** (thresholdDb / 20), len = ch[0].length;
  let a = 0, b = len - 1;
  const loud = (i) => ch.some((c) => Math.abs(c[i]) > th);
  while (a < len && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  const pad = Math.round(rate * 0.03);
  return ch.map((c) => c.subarray(Math.max(0, a - pad), Math.min(len, b + pad)));
}

function shape(ch, rate, { maxSec, fadeIn = 0.01, fadeOut = 0.3 }) {
  let out = ch.map((c) => Float32Array.from(maxSec ? c.subarray(0, Math.round(rate * maxSec)) : c));
  const n = out[0].length, fi = Math.round(rate * fadeIn), fo = Math.min(n, Math.round(rate * fadeOut));
  for (const c of out) {
    for (let i = 0; i < fi && i < n; i++) c[i] *= i / fi;
    for (let i = 0; i < fo; i++) { const t = i / fo; c[n - fo + i] *= (1 - t) * (1 - t); }   // sanftes Ausklingen
  }
  return out;
}

function encode(ch, rate, kbps, file) {
  const toI16 = (f) => Int16Array.from(f, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767));
  const L = toI16(ch[0]), R = ch.length > 1 ? toI16(ch[1]) : null;
  const enc = new lamejs.Mp3Encoder(R ? 2 : 1, rate, kbps);
  const parts = [];
  for (let i = 0; i < L.length; i += 1152) {
    const b = R ? enc.encodeBuffer(L.subarray(i, i + 1152), R.subarray(i, i + 1152)) : enc.encodeBuffer(L.subarray(i, i + 1152));
    if (b.length) parts.push(Buffer.from(b));
  }
  parts.push(Buffer.from(enc.flush()));
  const buf = Buffer.concat(parts);
  writeFileSync(file, buf);
  return buf.length;
}

// Einzeltöne: schneiden, ausblenden, auf -2 dBFS Spitze anheben, als MP3 mit 128 kbit/s
const EFFECTS = [
  { in: 'wolf.mp3', out: 'wolf', maxSec: 8, fadeOut: 0.6 },
  { in: 'hahn.mp3', out: 'hahn', maxSec: 4, fadeOut: 0.12 },
  { in: 'gong.mp3', out: 'gong', maxSec: 6, fadeOut: 1.2 },
  { in: 'glocke.mp3', out: 'glocke', maxSec: 9, fadeOut: 3 },
  { in: 'tod.mp3', out: 'tod', maxSec: 9, fadeOut: 3.5 },
  { in: 'sieg.mp3', out: 'sieg', maxSec: 14, fadeOut: 1.5 },
];
// Musik: unverändert in MP3 (OGG wird umgewandelt), Pegel wird gemessen und zur Laufzeit angeglichen
const MUSIC = [
  { in: 'forest_2.ogg', out: 'nacht-1', kbps: 96 },
  { in: 'horror.ogg', out: 'nacht-2', kbps: 80 },
  { in: 'bard.mp3', out: 'tag-1', copy: true },
  { in: 'kings.mp3', out: 'tag-2', copy: true },
];

const report = {};
for (const j of EFFECTS) {
  const { ch, rate } = await decode(join(srcDir, j.in));
  let x = trimSilence(ch, rate);
  x = shape(x, rate, j);
  const k = 10 ** (-2 / 20) / Math.max(peakOf(x), 1e-6);
  x = x.map((c) => c.map((v) => v * k));
  const bytes = encode(x, rate, 128, join(outDir, `${j.out}.mp3`));
  report[j.out] = { sec: +(x[0].length / rate).toFixed(2), kb: Math.round(bytes / 1024), rate };
}
const TARGET = -22;   // dBFS (RMS), Zielpegel der Musik
for (const j of MUSIC) {
  const { ch, rate } = await decode(join(srcDir, j.in));
  const rms = loudness(ch, rate), peak = peakOf(ch);
  const gain = Math.min(10 ** (TARGET / 20) / rms, 0.97 / peak, 3);
  if (j.copy) writeFileSync(join(outDir, `${j.out}.mp3`), readFileSync(join(srcDir, j.in)));
  else encode(ch, rate, j.kbps, join(outDir, `${j.out}.mp3`));
  report[j.out] = { sec: Math.round(ch[0].length / rate), rms: +db(rms).toFixed(1), peak: +db(peak).toFixed(1), gain: +gain.toFixed(2) };
}
console.log(JSON.stringify(report, null, 1));
