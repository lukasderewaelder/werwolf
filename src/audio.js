// Töne und Nachtmusik. Liegt eine Datei in assets/audio/, wird sie abgespielt, sonst entsteht der Klang per Web Audio.
import { S } from './store-ref.js';
import { AUDIO, MUSIC } from './audio-files.js';

let ctx = null, master = null, music = null;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  master.gain.value = S().settings.volume ?? 0.7;
  return ctx;
}

const findFile = async (name) => AUDIO[name] ?? false;

/** Lautstärke sofort übernehmen (Regler). */
export function setVolume() { if (master) master.gain.value = S().settings.volume ?? 0.7; }

/** Testton, auch wenn Töne ausgeschaltet sind (Diagnoseseite). */
export function playTest() { const c = audioCtx(); if (c) synth('bell'); }

// Im Hintergrund still: iOS und Android sollen nicht weiterspielen, wenn die App nicht sichtbar ist.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
});

const on = () => S().settings.sound;

export async function sfx(name) {
  if (!on()) return;
  const url = await findFile(name);
  if (url) {
    const a = new Audio(url); a.volume = Math.min(1, (S().settings.volume ?? 0.7));
    a.play().catch(() => synth(name));
    return;
  }
  synth(name);
}

/* ---------- Klänge aus Schwingungen ---------- */
function tone(c, { f, t0 = 0, dur = 1, type = 'sine', gain = 0.3, f2 = null, attack = 0.01 }) {
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

function synth(name) {
  const c = audioCtx(); if (!c) return;
  switch (name) {
    case 'gong': tone(c, { f: 110, dur: 3, gain: 0.5 }); tone(c, { f: 220.5, dur: 2.4, gain: 0.25 }); tone(c, { f: 331, dur: 1.8, gain: 0.12 }); break;
    case 'bell': [880, 1320].forEach((f, i) => { tone(c, { f, t0: i * 0.5, dur: 1.4, gain: 0.25 }); tone(c, { f: f * 2.01, t0: i * 0.5, dur: 0.8, gain: 0.08 }); }); break;
    case 'death': tone(c, { f: 220, f2: 55, dur: 1.4, type: 'triangle', gain: 0.4 }); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(c, { f, t0: i * 0.18, dur: 0.9, type: 'triangle', gain: 0.25 })); break;
    case 'howl': {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), t = c.currentTime;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(260, t); o.frequency.linearRampToValueAtTime(520, t + 0.9); o.frequency.linearRampToValueAtTime(380, t + 2.4);
      lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.4;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(bp); bp.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 2.7); lfo.stop(t + 2.7); break;
    }
    case 'rooster': {
      const notes = [[500, 760, 0, 0.18], [560, 860, 0.22, 0.18], [620, 940, 0.44, 0.2], [700, 520, 0.7, 0.55]];
      notes.forEach(([a, b, t0, d]) => tone(c, { f: a, f2: b, t0, dur: d, type: 'sawtooth', gain: 0.16 }));
      break;
    }
    default: break;
  }
}

/* ---------- Nachtmusik ---------- */
const MUSIC_LEVEL = 0.5;
let starting = false;

/** Stücke nacheinander mit Überblendung. Läuft über Web Audio, weil iOS die Lautstärke von Audio-Elementen ignoriert. */
function playlist(c) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(MUSIC_LEVEL, c.currentTime + 2.5);
  out.connect(master);
  const cache = new Map(), live = new Set();
  let stopped = false, timer = 0;

  const decode = (ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej));
  async function load(i) {
    if (!cache.has(i)) cache.set(i, decode(await (await fetch(MUSIC[i])).arrayBuffer()));
    return cache.get(i);
  }
  async function play(i, when) {
    let buf;
    try { buf = await load(i); } catch (e) { console.warn('Musik nicht ladbar:', e); return; }
    if (stopped) return;
    const t = Math.max(when, c.currentTime + 0.05);
    const xf = Math.min(4, buf.duration / 4);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + xf);
    g.gain.setValueAtTime(1, t + buf.duration - xf);
    g.gain.linearRampToValueAtTime(0.0001, t + buf.duration);
    src.connect(g); g.connect(out); src.start(t);
    const node = { src, g }; live.add(node);
    src.onended = () => live.delete(node);
    const next = (i + 1) % MUSIC.length, nextAt = t + buf.duration - xf;
    timer = setTimeout(() => play(next, nextAt), Math.max(0, (nextAt - c.currentTime - 6) * 1000));
  }
  play(Math.floor(Math.random() * MUSIC.length), c.currentTime);
  return {
    live: () => live.size,
    stop() {
      stopped = true; clearTimeout(timer);
      out.gain.cancelScheduledValues(c.currentTime); out.gain.setValueAtTime(out.gain.value, c.currentTime); out.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.2);
      setTimeout(() => { live.forEach((n) => { try { n.src.stop(); } catch { /* schon beendet */ } }); out.disconnect(); }, 1400);
    },
  };
}

/** Rückfall ohne Dateien: leiser Klangteppich aus Schwingungen. */
function drone(c) {
  const out = c.createGain(); out.gain.value = 0.0001; out.connect(master);
  out.gain.exponentialRampToValueAtTime(0.1, c.currentTime + 3);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.connect(out);
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const oscs = [55, 82.4, 110.2, 164.9].map((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = i * 4; o.connect(lp); o.start(); return o; });
  return { stop() { out.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2); setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); }, 1400); } };
}

export function startMusic() {
  if (music || starting || !S().settings.music || !S().settings.sound) return;
  const c = audioCtx(); if (!c) return;
  starting = true;
  try { music = MUSIC.length ? playlist(c) : drone(c); } finally { starting = false; }
}
export function stopMusic() { if (music) { music.stop(); music = null; } }

/** Zustand für Tests und Fehlersuche. */
export const musicState = () => ({ playing: !!music, context: ctx?.state ?? null, streams: music?.live?.() ?? 0 });
