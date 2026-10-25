// Töne und Nachtmusik. Liegt eine Datei in assets/audio/, wird sie abgespielt, sonst entsteht der Klang per Web Audio.
import { S } from './store-ref.js';
import { AUDIO } from './audio-files.js';

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
export async function startMusic() {
  if (music || !S().settings.music || !S().settings.sound) return;
  const url = await findFile('night');
  if (url) {
    const a = new Audio(url); a.loop = true; a.volume = 0.35 * (S().settings.volume ?? 0.7);
    try { await a.play(); music = { stop: () => { a.pause(); a.currentTime = 0; } }; } catch { /* noch keine Berührung */ }
    return;
  }
  const c = audioCtx(); if (!c) return;
  const out = c.createGain(); out.gain.value = 0.0001; out.connect(master);
  out.gain.exponentialRampToValueAtTime(0.1, c.currentTime + 3);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.connect(out);
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const oscs = [55, 82.4, 110.2, 164.9].map((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = i * 4; o.connect(lp); o.start(); return o; });
  music = { stop: () => { out.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2); setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); }, 1400); } };
}
export function stopMusic() { if (music) { music.stop(); music = null; } }
