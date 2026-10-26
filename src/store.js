// Speicher: Gruppen, Einstellungen, Einrichtung und laufendes Spiel in localStorage (mit Rückfall auf den Arbeitsspeicher).
import { DEFAULT_RULES } from './engine/game.js';
import { recommendCounts } from './engine/roles.js';

const KEY = 'werwolf-spielleiter-v1';
export const FORMAT = 'werwolf-sicherung';

export const defaultSettings = () => ({
  theme: 'auto',          // auto = Nacht dunkel, Tag hell je Spielphase; night/day = fest
  sound: true, music: true, volume: 0.7,
  haptics: true, wakeLock: true, timer: 180, showRoles: true, lockPin: null,
  eventOff: {}, beadleIds: [],   // Neumond: abgewählte Ereigniskarten, Karten für den Büttel
  mode: 'cards', rules: { ...DEFAULT_RULES },
});

export const defaultSetup = () => ({ step: 0, groupId: null, off: {}, order: [], counts: null, extra: false });

const fresh = () => ({ v: 1, groups: [], setup: defaultSetup(), settings: defaultSettings(), game: null, saves: [], locked: false, lastResult: null, customRoles: [], customCards: [] });

let mem = null;
export const uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* privater Modus */ }
  if (!raw && mem) raw = mem;
  const base = fresh();
  if (!raw) return base;
  try { return normalize({ ...base, ...JSON.parse(raw) }, base); } catch { return base; }
}

function normalize(s, base) {
  s.settings = { ...base.settings, ...(s.settings || {}), rules: { ...base.settings.rules, ...(s.settings?.rules || {}) } };
  delete s.settings.bottomPad;   // alter Regler „Unterer Abstand“, gibt es nicht mehr
  s.setup = { ...base.setup, ...(s.setup || {}) };
  if (!Array.isArray(s.groups)) s.groups = [];
  if (!Array.isArray(s.saves)) s.saves = [];
  if (!Array.isArray(s.customCards)) s.customCards = [];
  if (!Array.isArray(s.settings.beadleIds)) s.settings.beadleIds = [];
  if (!s.settings.eventOff || typeof s.settings.eventOff !== 'object') s.settings.eventOff = {};
  s.locked = !!s.locked && !!s.settings.lockPin;
  return s;
}

export function save(state) {
  const raw = JSON.stringify(state);
  mem = raw;
  try { localStorage.setItem(KEY, raw); } catch { /* voll oder gesperrt: Arbeitsspeicher bleibt */ }
}

/** Sicherung als Datei: Gruppen, Einstellungen und eigene Rollen (nicht das laufende Spiel). */
export function exportBackup(state) {
  const { lockPin, ...settings } = state.settings;   // die PIN gehört nicht in eine Datei
  return JSON.stringify({ format: FORMAT, version: 1, savedAt: new Date().toISOString(), groups: state.groups, settings, customRoles: state.customRoles, customCards: state.customCards, game: state.game, saves: state.saves }, null, 1);
}

export function importBackup(state, text) {
  const d = JSON.parse(text);
  if (d?.format !== FORMAT) throw new Error('Das ist keine Sicherung dieser App.');
  const base = fresh();
  const next = normalize({ ...state, groups: Array.isArray(d.groups) ? d.groups : state.groups, settings: { ...(d.settings ?? state.settings), lockPin: state.settings.lockPin }, customRoles: d.customRoles ?? [], customCards: Array.isArray(d.customCards) ? d.customCards : [], game: d.game ?? null, saves: Array.isArray(d.saves) ? d.saves : state.saves }, base);
  return next;
}

/* ---------- Gruppen ---------- */

export const groupById = (s, id) => s.groups.find((g) => g.id === id) ?? null;

export function ensureGroup(s) {
  if (!s.groups.length) s.groups.push({ id: uid('g'), name: 'Meine Runde', members: [] });
  if (!groupById(s, s.setup.groupId)) selectGroup(s, s.groups[0].id);
  return groupById(s, s.setup.groupId);
}

export function selectGroup(s, id) {
  const g = groupById(s, id);
  if (!g) return;
  s.setup.groupId = id;
  s.setup.off = {};
  s.setup.order = g.members.map((m) => m.id);
  s.setup.counts = null;
}

/** Anwesende in Sitzreihenfolge. */
export function presentPlayers(s) {
  const g = groupById(s, s.setup.groupId);
  if (!g) return [];
  const byId = Object.fromEntries(g.members.map((m) => [m.id, m]));
  const order = [...s.setup.order.filter((id) => byId[id]), ...g.members.map((m) => m.id).filter((id) => !s.setup.order.includes(id))];
  s.setup.order = order;
  return order.filter((id) => !s.setup.off[id]).map((id) => ({ id, name: byId[id].name }));
}

export function addMembers(s, names) {
  const g = ensureGroup(s);
  const added = [];
  for (const raw of names) {
    const name = raw.trim().slice(0, 24);
    if (!name || g.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) continue;
    const m = { id: uid('m'), name };
    g.members.push(m); s.setup.order.push(m.id); added.push(m);
  }
  s.setup.counts = null;
  return added;
}

export function removeMember(s, id) {
  const g = groupById(s, s.setup.groupId);
  if (!g) return;
  g.members = g.members.filter((m) => m.id !== id);
  s.setup.order = s.setup.order.filter((x) => x !== id);
  delete s.setup.off[id];
  s.setup.counts = null;
}

export function currentCounts(s) {
  const n = presentPlayers(s).length;
  if (!s.setup.counts) s.setup.counts = recommendCounts(Math.max(n, 3));
  return s.setup.counts;
}
