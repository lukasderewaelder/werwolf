// Nebenseiten: Rollen nachschlagen, Anleitung, Optionen mit Sicherung.
import { S, ui, views, on, go, persist, toast } from './core.js';
import { esc, art, I } from './art.js';
import { topBar } from './home.js';
import { rulesHtml } from './setup.js';
import { ROLES, RM, SETS, CAMP_LABEL, CUSTOM_WIN, findRoles } from '../engine/roles.js';
import { exportBackup, importBackup, defaultSettings } from '../store.js';
import { installButton, isStandalone } from './install.js';
import { setVolume } from '../audio.js';
import { lockCard } from './lock.js';

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
  const when = r.night ? ({ first: 'Nur in der ersten Nacht', every: 'Jede Nacht', even: 'Jede zweite Nacht' }[r.night.when] + (r.night.once ? ', Fähigkeit nur einmal im Spiel' : '') + (r.night.act ? '' : ' (erwacht nur kurz)')) : 'Kein Aufruf nachts';
  const win = r.custom ? ` · Sieg: ${CUSTOM_WIN[r.win]}` : '';
  return `<div class="rd">${art(id)}<div><span class="camp ${r.camp}">${CAMP_LABEL[r.camp]}</span><h2>${esc(r.name)}</h2><div class="eyebrow">${esc(r.sub)}</div><p>${esc(when)}${esc(win)}${r.alt ? ` · früher: ${esc(r.alt.join(', '))}` : ''}</p></div></div>
    <p>${esc(r.desc)}</p>${r.say ? `<div class="say">${esc(r.say)}</div>` : ''}`;
}

const GUIDE = [
  ['Spiel vorbereiten', [
    'Auf der Startseite „Neues Spiel“ wählen. Zuerst kommen die Spieler: Namen eintippen oder aus einer Gruppe (z. B. Klasse 7a) übernehmen. Gruppen merken sich die Namen für das nächste Mal.',
    'Danach werden die Rollen gewählt. Die App schlägt eine passende Verteilung vor; mit Plus und Minus änderst du sie. Unter „Rollen“ auf der Startseite kannst du jede Karte nachschlagen.',
    'Zum Schluss die Regeln und Hausregeln einstellen. Im Kartenmodus teilt die App die Karten verdeckt aus; sonst gibst du die Rollen selbst aus und trägst sie in Nacht 1 ein.',
  ]],
  ['Die Nacht', [
    'Oben zeigt das Schrittband, welche Rolle gerade dran ist. Lies die kursive Ansage laut vor. Die Reihenfolge entspricht dem Regelheft.',
    'Tippe die Spieler im Kreis an, um Opfer, Verliebte oder geprüfte Personen zu wählen. Mit „Weiter“ geht es zum nächsten Schritt.',
    'Fehlt eine Pflichtentscheidung (zum Beispiel das Opfer der Werwölfe), fragt die App nach, bevor sie weitergeht. Mit „Zurück“ holst du sie nach. Optionale Aktionen wie die der Hexe darfst du überspringen.',
    'Im Schrittband kannst du auf einen Schritt tippen, um dorthin zu springen. Nach vorn fragt die App bei offenen Entscheidungen nach, zurück geht immer.',
  ]],
  ['Der Tag', [
    'Am Morgen nennt die App die Toten und die Nachrichten der Nacht. Besondere Folgen wie Jäger oder Verliebte löst die App Schritt für Schritt aus.',
    'Starte den Timer für die Diskussion. Wähle den Hauptmann, wenn die Regel aktiv ist. Danach tippst du an, wen das Dorf hinrichtet.',
    'Nach jeder Phase prüft die App, ob eine Seite gewonnen hat, und zeigt dann den Endbildschirm.',
  ]],
  ['Besondere Rollen und Karten', [
    'Dieb und Gaukler haben Karten in der Mitte. Du findest sie im Menü unter „Karten in der Mitte“.',
    'Die Gemeinde, Ereigniskarten und die Gruppen des Greises erscheinen im Menü nur, wenn sie im Spiel aktiv sind.',
    'Eigene Rollen mit Aktion legst du bei der Rollenwahl im Reiter „Eigene“ an. Sie laufen in der Nacht wie die Originale.',
  ]],
  ['Fehler korrigieren', [
    'Der Pfeil oben macht die letzte Aktion rückgängig, beliebig oft.',
    'Im Menü unter „Wer ist wer“ siehst du Rollen und Status aller Spieler und kannst sie korrigieren.',
    'Das Protokoll im Menü zeigt, was bisher passiert ist. Du kannst es teilen, als Datei speichern oder kopieren.',
  ]],
  ['Geheim halten', [
    'Mit dem Auge-Knopf blendest du die Rollen auf den Spielersteinen aus, falls jemand mitschaut.',
    '„Bildschirm sperren“ im Menü sichert die App mit einer PIN, falls das Gerät offen liegt. Die PIN legst du in den Optionen fest.',
  ]],
  ['Pause, Sichern und Teilen', [
    'Mit „Pausieren und später weiterspielen“ wird das Spiel gespeichert. Du setzt es von der Startseite aus fort.',
    'In den Optionen speicherst du eine Sicherung als Datei (Gruppen, Einstellungen, eigene Karten) und lädst sie auf einem anderen Gerät wieder. So ziehst du auch auf ein neues Gerät um.',
    'Mit „Installieren“ liegt die App wie eine normale App auf dem Startbildschirm und läuft danach auch ohne Internet.',
  ]],
];

on('guide-open', (el) => { const i = +el.dataset.i; ui.guideOpen = ui.guideOpen === i ? -1 : i; });
views.guide = () => {
  const open = ui.guideOpen ?? 0;
  const chapter = ([t, ps], i) => `<div class="card flat" style="padding:0"><button class="opt" data-action="guide-open" data-i="${i}" aria-expanded="${open === i}" style="width:100%"><span class="t"><b style="font-family:var(--serif);font-size:19px">${i + 1}. ${esc(t)}</b></span>${open === i ? '–' : '+'}</button>${open === i ? `<div class="col" style="padding:0 16px 14px">${ps.map((p) => `<p class="muted" style="margin:0">${esc(p)}</p>`).join('')}</div>` : ''}</div>`;
  return `<div class="view">${topBar('Anleitung', 'So funktioniert die App')}
    <div class="page"><div class="col scroll" style="flex:1;min-height:0" data-keep="guide">${GUIDE.map(chapter).join('')}</div>
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
      <div class="eyebrow" style="margin-top:6px">Schutz</div>
      ${lockCard()}
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
