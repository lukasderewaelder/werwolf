// Nebenseiten: Rollen nachschlagen, Anleitung, Optionen mit Sicherung.
import { S, ui, views, on, go, persist, toast } from './core.js';
import { esc, art, I } from './art.js';
import { topBar } from './home.js';
import { rulesHtml } from './setup.js';
import { ROLES, RM, SETS, CAMP_LABEL, findRoles } from '../engine/roles.js';
import { exportBackup, importBackup, defaultSettings } from '../store.js';
import { installButton, isStandalone } from './install.js';
import { setVolume } from '../audio.js';

on('lib-set', (el) => { ui.libSet = el.dataset.set; ui.query = ''; });
on('input:lib-q', (el) => { ui.query = el.value; });
on('role-info', (el) => { ui.modal = { type: 'role', id: el.dataset.role, from: ui.modal }; });

views.library = () => {
  const sets = Object.keys(SETS);
  const q = ui.query.trim();
  const cur = sets.includes(ui.libSet) ? ui.libSet : 'basis';
  const list = q ? findRoles(q) : ROLES.filter((r) => r.set === cur);
  const cards = list.map((r) => `<button class="ov" data-action="role-info" data-role="${r.id}">${art(r.id)}<b>${esc(r.name)}</b><small>${esc(r.sub)}</small></button>`).join('');
  return `<div class="view">${topBar('Rollen', 'Nachschlagen')}
    <div class="page wide">
      <input class="inp" id="lib-q" type="search" placeholder="Rolle suchen (auch alte Namen)" value="${esc(ui.query)}" autocomplete="off">
      ${q ? '' : `<div class="chips">${sets.map((s) => `<button class="chip ${s === cur ? 'on' : ''}" data-action="lib-set" data-set="${s}">${SETS[s]}</button>`).join('')}</div>`}
      <div class="ov-grid scroll" data-keep="lib" style="flex:1;min-height:0;align-content:start">${cards || '<p class="muted">Keine Rolle gefunden.</p>'}</div>
    </div></div>`;
};

export function roleDetailHtml(id) {
  const r = RM[id];
  const when = r.night ? ({ first: 'Nur in der ersten Nacht', every: 'Jede Nacht', even: 'Jede zweite Nacht' }[r.night.when] + (r.night.act ? '' : ' (erwacht nur kurz)')) : 'Kein Aufruf nachts';
  return `<div class="rd">${art(id)}<div><span class="camp ${r.camp}">${CAMP_LABEL[r.camp]}</span><h2>${esc(r.name)}</h2><div class="eyebrow">${esc(r.sub)}</div><p>${esc(when)}${r.alt ? ` · früher: ${esc(r.alt.join(', '))}` : ''}</p></div></div>
    <p>${esc(r.desc)}</p>${r.say ? `<div class="say">${esc(r.say)}</div>` : ''}`;
}

views.guide = () => {
  const steps = [
    ['moon', 'Nacht', 'Lies die kursiven Ansagen vor. Die App weckt die Rollen in der Reihenfolge des Regelhefts. Mit „Weiter“ geht es zum nächsten Schritt.'],
    ['people', 'Antippen', 'Tippe die Spieler im Kreis an: Opfer der Wölfe, Verliebte, geprüfte Person. Im Kartenmodus fragt die App in Nacht 1 zuerst „Wer ist es?“.'],
    ['sun', 'Tag', 'Die App nennt die Toten und die Nachrichten des Morgens. Starte den Timer, wähle den Hauptmann und tippe an, wen das Dorf hinrichtet.'],
    ['undo', 'Vertippt?', 'Der Pfeil oben macht jede Aktion rückgängig. Im Menü findest du Protokoll, Rollenübersicht und Korrekturen.'],
    ['eye', 'Geheim halten', 'Nur du siehst das Gerät. Mit dem Auge-Knopf blendest du Rollen auf den Spielersteinen aus, falls jemand mitschaut.'],
  ];
  return `<div class="view">${topBar('Anleitung', 'So leitest du ein Spiel')}
    <div class="page"><div class="col scroll" style="flex:1;min-height:0">${steps.map(([ic, t, d], i) => `<div class="card flat row" style="align-items:flex-start"><span class="no member" style="min-height:0;padding:0;border:0;background:none"><span class="no" style="background:var(--accent);color:var(--accent-ink)">${i + 1}</span></span><div><b style="font-family:var(--serif);font-size:19px">${t}</b><p class="muted">${d}</p></div></div>`).join('')}</div>
      <div class="foot"><button class="btn primary" data-action="new-game">${I.moon}<span>Neues Spiel</span></button></div></div></div>`;
};

/* ---------- Optionen ---------- */

const optRow = (k, t, s) => `<button class="opt" data-action="opt" data-key="${k}"><span class="t"><b>${t}</b>${s ? `<span>${s}</span>` : ''}</span><span class="toggle ${S.settings[k] ? 'on' : ''}"><i></i></span></button>`;
on('opt', (el) => { const k = el.dataset.key; S.settings[k] = !S.settings[k]; });
on('input:vol-range', (el) => {
  S.settings.volume = Math.max(0, Math.min(1, +el.value / 100));
  setVolume();
  const out = document.getElementById('vol-out'); if (out) out.textContent = Math.round(S.settings.volume * 100) + ' %';
  persist();
  return false;
});

/** Lautstärkeregler mit Schaltern für Töne und Musik (Optionen und Spielmenü). */
export const soundCard = () => `<div class="card flat col"><div class="row between"><b>Lautstärke</b><span id="vol-out" class="muted" style="font-weight:700">${Math.round((S.settings.volume ?? 0.7) * 100)} %</span></div>
  <input id="vol-range" type="range" min="0" max="100" value="${Math.round((S.settings.volume ?? 0.7) * 100)}" aria-label="Lautstärke" style="width:100%;height:36px;accent-color:var(--accent)">
  <div class="row wrap"><button class="btn sm ${S.settings.sound ? 'on' : ''}" data-action="opt" data-key="sound">${I.note}Töne</button><button class="btn sm ${S.settings.music ? 'on' : ''}" data-action="opt" data-key="music">${I.moon}Musik</button></div></div>`;
on('set-theme', (el) => { S.settings.theme = el.dataset.v; });
on('set-timer', (el) => { S.settings.timer = +el.dataset.v; ui.timer.left = +el.dataset.v; });

views.settings = () => {
  const s = S.settings;
  const timers = [60, 120, 180, 300, 600];
  return `<div class="view">${topBar('Optionen', 'Einstellungen')}
    <div class="page"><div class="col scroll" style="flex:1;min-height:0;padding-bottom:12px" data-keep="settings">
      <div class="card flat col"><b>Aussehen</b>
        <div class="seg"><button class="${s.theme === 'auto' ? 'on' : ''}" data-action="set-theme" data-v="auto">${I.moon}${I.sun}Automatisch</button><button class="${s.theme === 'night' ? 'on' : ''}" data-action="set-theme" data-v="night">${I.moon}Immer Nacht</button><button class="${s.theme === 'day' ? 'on' : ''}" data-action="set-theme" data-v="day">${I.sun}Immer Tag</button></div>
        <span class="muted" style="font-size:13px">Automatisch: dunkel in der Nacht, hell am Tag.</span></div>
      ${soundCard()}
      ${optRow('haptics', 'Vibration', 'Kurzes Feedback bei Aktionen')}
      ${optRow('wakeLock', 'Bildschirm anlassen', 'Das Display geht im Spiel nicht aus')}
      ${optRow('showRoles', 'Rollen auf den Spielersteinen zeigen', 'Ausschalten, wenn Mitspieler aufs Display schauen könnten')}
      <div class="card flat col"><b>Diskussionszeit</b><div class="seg">${timers.map((t) => `<button class="${s.timer === t ? 'on' : ''}" data-action="set-timer" data-v="${t}">${t / 60} min</button>`).join('')}</div></div>
      <div class="eyebrow" style="margin-top:6px">Hausregeln für neue Spiele</div>
      ${rulesHtml(s.rules)}
      ${installButton() ? `<div class="eyebrow" style="margin-top:6px">App</div><div class="card flat col"><span class="muted" style="font-size:14px">Installiert läuft die App im Vollbild und ohne Netz.</span>${installButton()}</div>` : (isStandalone() ? '<div class="hint">' + I.check + '<span>Du nutzt die installierte App.</span></div>' : '')}
      <div class="eyebrow" style="margin-top:6px">Sicherung</div>
      <div class="card flat col"><span class="muted" style="font-size:14px">Gruppen und Einstellungen liegen nur auf diesem Gerät. Die installierte App auf dem iPad hat einen eigenen Speicher, getrennt von Safari. Mit einer Sicherungsdatei ziehst du um.</span>
        <div class="row wrap"><button class="btn" data-action="backup-export">${I.download}Sicherung speichern</button><label class="btn" for="backup-file" style="cursor:pointer">Sicherung laden</label><input type="file" id="backup-file" accept="application/json,.json" hidden></div>
        <button class="btn danger" data-action="reset-all">${I.reset}Alles zurücksetzen</button></div>
      <div class="eyebrow" style="margin-top:6px">Hilfe</div>
      <button class="opt" data-action="open-diagnose"><span class="t"><b>Diagnose</b><span>Prüft Offlinebetrieb, Speicher und Ton auf diesem Gerät</span></span>${I.right}</button>
      <div class="eyebrow" style="margin-top:6px">Quellen</div>
      <div class="card flat col"><span class="muted" style="font-size:13px">Musik: congusbongus, SubspaceAudio (Juhani Junkala), RandomMind. Töne: NaturesTemper, BenjaminNelan, BOSS MUSIC, Audeption, Aeonemi, cynicmusic. Alles CC0 von OpenGameArt und Freesound, Details in docs/QUELLEN.md. Rollenbilder aus der bisherigen App.</span></div>
    </div></div></div>`;
};

on('backup-export', async () => {
  const text = exportBackup(S);
  const name = `Werwolf-Sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([text], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return false; }
  } catch (e) { if (e?.name === 'AbortError') return false; }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Sicherung gespeichert.');
  return false;
});
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'backup-file' || !e.target.files?.[0]) return;
  try {
    const next = importBackup(S, await e.target.files[0].text());
    Object.assign(S, next);
    persist(); ui.modal = null; toast('Sicherung geladen.');
    const { render } = await import('./core.js'); render();
  } catch (err) { toast(err.message || 'Datei konnte nicht gelesen werden.'); }
  e.target.value = '';
});
on('reset-all', () => { ui.modal = { type: 'confirm', what: 'reset-all', title: 'Alles zurücksetzen?', text: 'Gruppen, Einstellungen und das laufende Spiel werden gelöscht.' }; });
export { defaultSettings };
