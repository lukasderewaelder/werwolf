// Töne und Musik. Einzeltöne sind kurze MP3-Dateien (decodiert und gepuffert), Musik läuft als Datenstrom über zwei
// Audio-Elemente mit Überblendung. Fehlt eine Datei, entsteht der Klang per Web Audio (Rückfall).
import { S } from './store-ref.js';
import { AUDIO, MUSIC } from './audio-files.js';

let ctx = null, master = null, musicBus = null;
let music = null;           // { mode, stop }
const MUSIC_LEVEL = 0.5;
const XFADE = 4;            // Sekunden Überblendung zwischen zwei Stücken

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_LEVEL; musicBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  master.gain.value = S().settings.volume ?? 0.7;
  return ctx;
}

/** Lautstärke sofort übernehmen (Regler). */
export function setVolume() { if (master) master.gain.value = S().settings.volume ?? 0.7; }

/** Testton, auch wenn Töne ausgeschaltet sind (Diagnoseseite). */
export function playTest() { const c = audioCtx(); if (!c) return; if (AUDIO.bell) sfx('bell', true); else synth('bell'); }

const on = () => S().settings.sound;

/* ---------- Einzeltöne ---------- */
const buffers = new Map();   // Name -> Promise<AudioBuffer|null>

function bufferFor(c, name) {
  if (!AUDIO[name]) return Promise.resolve(null);
  if (!buffers.has(name)) {
    buffers.set(name, fetch(AUDIO[name]).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
      .catch((e) => { console.warn('Ton nicht ladbar:', name, e); return null; }));
  }
  return buffers.get(name);
}

export async function sfx(name, force = false) {
  if (!force && !on()) return;
  const c = audioCtx(); if (!c) return;
  const buf = await bufferFor(c, name);
  if (!buf) { synth(name); return; }
  const src = c.createBufferSource(); src.buffer = buf; src.connect(master); src.start();
}

/** Töne vorladen, damit der erste Einsatz ohne Verzögerung klingt (nach der ersten Berührung). */
export function preloadSounds() { const c = audioCtx(); if (c) Object.keys(AUDIO).forEach((n) => bufferFor(c, n)); }

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

/* ---------- Musik als Datenstrom ---------- */
const slots = [];            // zwei dauerhafte Audio-Elemente mit je einem Pegelregler
let token = 0;

function makeSlots(c) {
  if (slots.length) return;
  for (let i = 0; i < 2; i++) {
    const el = new Audio(); el.preload = 'auto'; el.loop = false;
    const g = c.createGain(); g.gain.value = 0;
    c.createMediaElementSource(el).connect(g); g.connect(musicBus);
    slots.push({ el, g, wasPlaying: false });
  }
}

/** Beim ersten Tippen: Elemente freischalten, damit iOS späteres Abspielen ohne Berührung erlaubt. */
export function unlockAudio() {
  const c = audioCtx(); if (!c) return;
  makeSlots(c);
  for (const s of slots) {
    if (s.unlocked) continue;
    s.unlocked = true;
    const first = Object.values(MUSIC).flat()[0];
    if (!first) continue;
    s.el.muted = true; s.el.src = first.src;
    s.el.play().then(() => { s.el.pause(); s.el.muted = false; }).catch(() => { s.el.muted = false; s.unlocked = false; });
  }
  preloadSounds();
}

function playlist(c, mode) {
  const list = MUSIC[mode] ?? [];
  makeSlots(c);
  const my = ++token;
  let idx = Math.floor(Math.random() * list.length), cur = 0, started = false, current = null;
  const now = () => c.currentTime;

  async function start(i, slot) {
    const t = list[i], s = slots[slot];
    s.el.muted = false; s.el.src = t.src; s.el.currentTime = 0;
    s.g.gain.cancelScheduledValues(now()); s.g.gain.setValueAtTime(0.0001, now());
    s.g.gain.linearRampToValueAtTime(t.gain, now() + XFADE);
    current = { slot, i, gain: t.gain, fading: false };
    try { await s.el.play(); s.wasPlaying = true; } catch (e) { console.warn('Musik startet nicht:', e); }
  }
  const timer = setInterval(() => {
    if (token !== my) { clearInterval(timer); return; }
    if (!current) return;
    const s = slots[current.slot], d = s.el.duration, t = s.el.currentTime;
    // Ohne bekannte Länge (Server ohne Bereichsanfragen) gibt es keine Überblendung: dann geht es nach dem Ende weiter
    const crossfadeNow = d && isFinite(d) && t >= d - XFADE - 0.3 && !s.el.paused;
    if (!current.fading && (crossfadeNow || s.el.ended)) {
      current.fading = true;
      s.g.gain.cancelScheduledValues(now()); s.g.gain.setValueAtTime(s.g.gain.value, now()); s.g.gain.linearRampToValueAtTime(0.0001, now() + (isFinite(d) ? Math.max(0.5, d - t) : 0.5));
      idx = (idx + 1) % list.length; cur = 1 - cur;
      start(idx, cur);
    }
  }, 300);
  start(idx, cur); started = true;
  return {
    mode, track: () => (current ? list[current.i].src : null),
    stop() {
      clearInterval(timer);
      const t = ++token;
      for (const s of slots) { s.g.gain.cancelScheduledValues(now()); s.g.gain.setValueAtTime(s.g.gain.value, now()); s.g.gain.linearRampToValueAtTime(0.0001, now() + 1.2); }
      // Nur anhalten, wenn inzwischen keine neue Wiedergabeliste dieselben Elemente übernommen hat
      setTimeout(() => { if (token !== t) return; for (const s of slots) { s.el.pause(); s.wasPlaying = false; } }, 1400);
    },
    pause() { for (const s of slots) { s.wasPlaying = !s.el.paused; s.el.pause(); } },
    resume() { for (const s of slots) if (s.wasPlaying) s.el.play().catch(() => {}); },
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


/** Musik für die Phase starten: 'night' oder 'day'. Läuft schon dieselbe, bleibt sie. Ohne Dateien: Klangteppich in der Nacht. */
let pending = null;
export function setMusic(mode) {
  if (!mode || !S().settings.music || !S().settings.sound) { stopMusic(); return; }
  if (music?.mode === mode || pending === mode) return;
  const c = audioCtx(); if (!c) return;
  const had = !!music;
  stopMusic();
  const begin = () => {
    if (pending !== mode) return;
    pending = null;
    if (MUSIC[mode]?.length) music = playlist(c, mode);
    else if (mode === 'night') music = { mode, ...drone(c) };
  };
  pending = mode;
  if (had) setTimeout(begin, 1300); else begin();   // beim Wechsel erst ausblenden, dann das neue Stück
}
export function stopMusic() { pending = null; if (music) { music.stop(); music = null; } }

// Im Hintergrund still: iOS und Android sollen nicht weiterspielen, wenn die App nicht sichtbar ist.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') { music?.pause?.(); ctx.suspend().catch(() => {}); }
  else { ctx.resume().catch(() => {}); music?.resume?.(); }
});

/** Zustand für Tests und Fehlersuche. */
export const musicState = () => ({
  playing: !!music, mode: music?.mode ?? null, context: ctx?.state ?? null, track: music?.track?.() ?? null,
  streams: slots.filter((s) => !s.el.paused && s.el.currentTime > 0).length, time: slots.map((s) => +s.el.currentTime.toFixed(1)),
});

/** Nur für Tests: springt kurz vor das Ende des laufenden Stücks, um den Übergang zum nächsten zu prüfen. */
export function debugSeekNearEnd(sec = 6) { const s = slots.find((x) => !x.el.paused && x.el.currentTime > 0); if (s && isFinite(s.el.duration)) s.el.currentTime = Math.max(0, s.el.duration - sec); }
