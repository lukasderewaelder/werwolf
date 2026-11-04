// Nebenseiten: Rollen nachschlagen, Anleitung, Optionen mit Sicherung.
import { S, ui, views, on, go, persist, toast } from './core.js';
import { esc, art, I } from './art.js';
import { topBar } from './home.js';
import { rulesHtml } from './setup.js';
import { ROLES, RM, SETS, CAMP_LABEL, CUSTOM_WIN, findRoles } from '../engine/roles.js';
import { exportBackup, importBackup, defaultSettings } from '../store.js';
import { installButton, isStandalone, isIOS, isAndroid, INSTALL } from './install.js';
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

/** Kapitel der Anleitung. Abschnitte: h (Zwischentitel), steps (nummeriert), dots (Aufzählung), tip (Hinweiskasten). Feste Texte, <b> erlaubt. */
const GUIDE = [
  { t: 'App installieren', install: true },
  { t: 'Spiel vorbereiten', parts: [
    { steps: [
      'Tippe auf der Startseite auf <b>Neues Spiel</b>.',
      'Trage die Spieler ein oder übernimm eine gespeicherte Gruppe, etwa „Klasse 7a“.',
      'Wähle die Rollen. Die App schlägt eine Verteilung vor, mit Plus und Minus passt du sie an.',
      'Stelle Regeln und Hausregeln ein und starte das Spiel.',
    ] },
    { tip: 'Mit Karten teilst du die Rollen selbst aus und trägst sie in Nacht 1 ein. Ohne Karten zeigt die App jedem Spieler seine Rolle verdeckt an.' },
  ] },
  { t: 'Die Nacht', parts: [
    { steps: [
      'Das Schrittband oben zeigt, welche Rolle dran ist. Die Reihenfolge folgt dem Regelheft.',
      'Lies die kursive Ansage vor.',
      'Tippe im Kreis die Person an, die die Rolle wählt: Opfer, Verliebte, geprüfte Person.',
      'Mit <b>Weiter</b> kommt der nächste Schritt.',
    ] },
    { tip: 'Fehlt eine Pflichtentscheidung, etwa das Opfer der Werwölfe, fragt die App vor dem Weitergehen nach. Freiwillige Aktionen wie die der Hexe darfst du überspringen.' },
    { dots: ['Ein Tipp auf einen Schritt im Schrittband springt dorthin.'] },
  ] },
  { t: 'Der Tag', parts: [
    { steps: [
      'Der Morgen zeigt, wer gestorben ist und was die Nacht gebracht hat.',
      'Folgen wie der Schuss des Jägers oder Liebeskummer fragt die App einzeln ab.',
      'Starte den Timer für die Diskussion. Ist die Regel an, wählt das Dorf zuerst den Hauptmann.',
      'Zähle die Stimmen im Kreis oder tippe die Person direkt an. Dann <b>Hinrichten</b>.',
    ] },
    { tip: 'Nach jeder Phase prüft die App, ob eine Seite gewonnen hat.' },
  ] },
  { t: 'Eigene Rollen und Sonderkarten', parts: [
    { h: 'Eigene Rollen', steps: [
      'Öffne bei der Rollenwahl den Reiter <b>Eigene</b> und tippe auf <b>Eigene Rolle anlegen</b>.',
      'Die Rollen-Werkstatt öffnet sich. Beginne mit einer Vorlage oder leer.',
      'Unter <b>Fähigkeiten</b> ist jede Fähigkeit ein Satz. Tippe die markierten Lücken an: wann, was, wen, wenn, wie oft, danach.',
      'Bedingungen ordnest du in Gruppen: <b>Alle müssen gelten</b> oder <b>Eine reicht</b>. Dann Eigenschaften und Sieg wählen und speichern.',
    ] },
    { dots: [
      'Nachts: töten, schützen, prüfen, Rolle erfahren, stumm schalten, sperren, tauschen, verlieben, verwandeln, wiederbeleben.',
      'Neu: Leibwächter, Sekte anwerben, Besucher beobachten, wachsam sein.',
      'Am Tag: Schuss, Einsperren, Hinrichten. Du findest sie in der Karte <b>Fähigkeiten am Tag</b>.',
    ] },
    { h: 'Sonderkarten', dots: [
      'Dieb und Gaukler: Karten in der Mitte stehen im Menü.',
      'Gemeinde, Ereigniskarten und die Gruppen des Greises erscheinen im Menü, wenn sie im Spiel sind.',
    ] },
  ] },
  { t: 'Fehler korrigieren', parts: [
    { dots: [
      'Der Pfeil oben macht die letzte Aktion rückgängig, beliebig oft.',
      'Im Menü unter <b>Wer ist wer</b> siehst und korrigierst du alle Rollen.',
      'Das <b>Protokoll</b> im Menü zeigt den Verlauf. Du kannst es teilen oder speichern.',
    ] },
  ] },
  { t: 'Geheim halten', parts: [
    { dots: [
      'Das Auge oben blendet die Rollen auf den Spielersteinen aus.',
      '<b>Bildschirm sperren</b> im Menü schützt die App mit einer PIN. Die PIN legst du in den Optionen fest.',
    ] },
  ] },
  { t: 'Pause, Sichern und Umziehen', parts: [
    { dots: [
      '<b>Pausieren</b> speichert das Spiel. Du setzt es auf der Startseite fort.',
      'In den Optionen sicherst du Gruppen, Einstellungen und eigene Rollen als Datei.',
      'Auf einem neuen Gerät lädst du diese Datei wieder ein.',
    ] },
  ] },
];

function guidePart(p) {
  return `${p.h ? `<h3>${p.h}</h3>` : ''}${p.steps ? `<ol class="gsteps">${p.steps.map((x) => `<li>${x}</li>`).join('')}</ol>` : ''}${p.dots ? `<ul class="gsteps dots">${p.dots.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}${p.tip ? `<div class="hint">${I.book}<span>${p.tip}</span></div>` : ''}`;
}
/** Installationskapitel: das erkannte Gerät zuerst, installiert mit Haken. */
function installParts() {
  const order = isAndroid() && !isIOS() ? ['android', 'ios'] : ['ios', 'android'];
  return [
    ...(isStandalone() ? [{ ok: true }] : []),
    ...order.map((k) => ({ h: INSTALL[k].title, steps: INSTALL[k].steps, tip: INSTALL[k].tip })),
    { h: 'Danach', dots: INSTALL.after },
  ];
}

on('guide-open', (el) => { const i = +el.dataset.i; ui.guideOpen = ui.guideOpen === i ? -1 : i; });
views.guide = () => {
  const open = ui.guideOpen ?? (isStandalone() ? 1 : 0);
  const chapter = (c, i) => {
    const parts = c.install ? installParts() : c.parts;
    return `<section class="gch"><button class="gch-head" data-action="guide-open" data-i="${i}" aria-expanded="${open === i}"><span class="no">${i + 1}</span><span class="tt">${c.t}</span>${I.right}</button>${open === i ? `<div class="gch-body">${parts.map((p) => (p.ok ? `<span class="gok">${I.check}Auf diesem Gerät bereits installiert</span>` : guidePart(p))).join('')}</div>` : ''}</section>`;
  };
  return `<div class="view">${topBar('Anleitung', 'So funktioniert die App')}
    <div class="page"><div class="guide scroll" style="flex:1;min-height:0" data-keep="guide">${GUIDE.map(chapter).join('')}</div></div></div>`;
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
        <span class="muted small">Automatisch: dunkel in der Nacht, hell am Tag.</span></div>
      ${soundCard()}
      ${optRow('haptics', 'Vibration', 'Kurzes Feedback bei Aktionen')}
      ${optRow('wakeLock', 'Bildschirm anlassen', 'Das Display geht im Spiel nicht aus')}
      ${optRow('showRoles', 'Rollen auf den Spielersteinen zeigen', 'Ausschalten, wenn Mitspieler aufs Display schauen könnten')}
      <div class="card flat col"><b>Diskussionszeit</b><div class="seg">${timers.map((t) => `<button class="${s.timer === t ? 'on' : ''}" data-action="set-timer" data-v="${t}">${t / 60} min</button>`).join('')}</div></div>
      <div class="eyebrow" style="margin-top:6px">Hausregeln für neue Spiele</div>
      ${rulesHtml(s.rules)}
      ${installButton() ? `<div class="eyebrow" style="margin-top:6px">App</div><div class="card flat col"><span class="muted small">Installiert läuft die App im Vollbild und ohne Netz.</span>${installButton()}</div>` : (isStandalone() ? '<div class="hint">' + I.check + '<span>Du nutzt die installierte App.</span></div>' : '')}
      <div class="eyebrow" style="margin-top:6px">Sicherung</div>
      <div class="card flat col"><span class="muted small">Gruppen und Einstellungen liegen nur auf diesem Gerät. Die installierte App auf dem iPad hat einen eigenen Speicher, getrennt von Safari. Mit einer Sicherungsdatei ziehst du um.</span>
        <div class="row wrap"><button class="btn" data-action="backup-export">${I.download}Sicherung speichern</button><label class="btn" for="backup-file" style="cursor:pointer">Sicherung laden</label><input type="file" id="backup-file" accept="application/json,.json" hidden></div>
        <button class="btn danger" data-action="reset-all">${I.reset}Alles zurücksetzen</button></div>
      <div class="eyebrow" style="margin-top:6px">Schutz</div>
      ${lockCard()}
      <div class="eyebrow" style="margin-top:6px">Hilfe</div>
      <button class="opt" data-action="open-diagnose"><span class="t"><b>Diagnose</b><span>Prüft Offlinebetrieb, Speicher und Ton auf diesem Gerät</span></span>${I.right}</button>
      <div class="eyebrow" style="margin-top:6px">Quellen</div>
      <div class="card flat col"><span class="muted small">Musik: congusbongus, SubspaceAudio (Juhani Junkala), RandomMind. Töne: NaturesTemper, BenjaminNelan, BOSS MUSIC, Audeption, Aeonemi, cynicmusic. Alles CC0 von OpenGameArt und Freesound, Details in docs/QUELLEN.md. Rollenbilder aus der bisherigen App.</span></div>
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
