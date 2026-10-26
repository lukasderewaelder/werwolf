// Neumond-Oberfläche: Kartenverwaltung beim Einrichten, Karteneditor, Varianten-Hinweise, Ereignisse im Spiel (Büttel, Stapel).
import { S, ui, on, dispatch, toast } from './core.js';
import { esc, I } from './art.js';
import { SAMPLE_CARDS, SPIRIT_CARDS, KINDS, KIND_HINT, MAX_BEADLE, VARIANT_INFO } from '../engine/events.js';
import { uid } from '../store.js';
import { nm, alive, eventHint } from '../engine/game.js';

export const allCards = () => [...SAMPLE_CARDS, ...(S.customCards ?? [])];
export const activeCards = () => allCards().filter((c) => !S.settings.eventOff?.[c.id]);

const kindBadge = (k) => `<span class="camp ${k === 'dauer' ? 'wolf' : k === 'zeit' ? 'solo' : 'village'}">${esc(KINDS[k] ?? k)}</span>`;
const sheet = (inner, wide = false) => `<div class="backdrop" data-action="close-modal"><div class="modal ${wide ? 'wide' : ''}" data-stop role="dialog" aria-modal="true">${inner}</div></div>`;
const closeBtn = (label = 'Schließen') => `<div class="mfoot"><button class="btn" data-action="close-modal">${label}</button></div>`;

/* ---------- Einrichten: Karten auswählen, Büttel-Karten, eigene Karten ---------- */

on('cards-open', () => { ui.modal = { type: 'cards' }; });
on('variants-open', () => { ui.modal = { type: 'variants' }; });
on('card-toggle', (el) => {
  const id = el.dataset.id, off = S.settings.eventOff ??= {};
  if (off[id]) delete off[id]; else { off[id] = true; S.settings.beadleIds = (S.settings.beadleIds ?? []).filter((x) => x !== id); }
  return;
});
on('card-beadle', (el) => {
  const id = el.dataset.id, list = S.settings.beadleIds ??= [];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else if (S.settings.eventOff?.[id]) toast('Diese Karte ist abgewählt.');
  else if (list.length >= MAX_BEADLE) toast(`Höchstens ${MAX_BEADLE} Karten für den Büttel.`);
  else list.push(id);
});
on('card-all', () => { S.settings.eventOff = {}; });
const blankCard = () => ({ title: '', text: '', kind: 'sofort' });
on('card-new', () => { ui.modal = { type: 'card-edit', id: null, draft: blankCard() }; });
on('card-edit', (el) => { const c = (S.customCards ?? []).find((x) => x.id === el.dataset.id); if (c) ui.modal = { type: 'card-edit', id: c.id, draft: { ...blankCard(), ...c } }; });
on('submit:card-form', (f) => {
  const d = Object.fromEntries(new FormData(f).entries());
  const title = (d.title || '').trim().slice(0, 40), text = (d.text || '').trim().slice(0, 400);
  if (!title || !text) { toast('Titel und Text eingeben.'); return; }
  const card = { id: ui.modal.id ?? uid('ev'), title, text, kind: ['sofort', 'zeit', 'dauer'].includes(d.kind) ? d.kind : 'sofort' };
  const list = S.customCards ??= [];
  const i = list.findIndex((x) => x.id === card.id);
  if (i >= 0) list[i] = card; else list.push(card);
  ui.modal = { type: 'cards' };
});
on('card-delete', () => {
  const id = ui.modal.id;
  S.customCards = (S.customCards ?? []).filter((x) => x.id !== id);
  S.settings.beadleIds = (S.settings.beadleIds ?? []).filter((x) => x !== id);
  delete S.settings.eventOff?.[id];
  ui.modal = { type: 'cards' };
});

export function cardsModal() {
  const off = S.settings.eventOff ?? {}, bd = S.settings.beadleIds ?? [];
  const rows = allCards().map((c) => {
    const on = !off[c.id], star = bd.includes(c.id);
    return `<div class="evrow ${on ? '' : 'off'}">
      <button class="toggle ${on ? 'on' : ''}" data-action="card-toggle" data-id="${c.id}" aria-label="${esc(c.title)} im Stapel" aria-pressed="${on}"><i></i></button>
      <div class="evtxt"><b>${esc(c.title)}</b> ${kindBadge(c.kind)}${c.sample ? ' <small class="muted">Beispiel</small>' : ''}<small>${esc(c.text)}</small></div>
      <button class="mini ${star ? 'on' : ''}" data-action="card-beadle" data-id="${c.id}" aria-label="Karte für den Büttel" aria-pressed="${star}" title="Für den Büttel">${I.crown}</button>
      ${c.sample ? '' : `<button class="mini" data-action="card-edit" data-id="${c.id}" aria-label="Bearbeiten">${I.menu}</button>`}</div>`;
  }).join('');
  return sheet(`<h2>Ereigniskarten</h2>
    <p class="muted" style="font-size:14px">${activeCards().length} Karten im Stapel, ${bd.filter((id) => activeCards().some((c) => c.id === id)).length} beim Büttel (höchstens ${MAX_BEADLE}). Die Karten des Büttels liegen nicht im Stapel. Die Beispielkarten sind eigene Texte; die Originalkarten kannst du als eigene Karten eintragen.</p>
    <div class="row wrap"><button class="btn sm" data-action="card-new">${I.plus}Neue Karte</button><button class="btn sm ghost" data-action="card-all">Alle in den Stapel</button></div>
    <div class="evlist">${rows}</div>${closeBtn('Fertig')}`, true);
}

export function cardEditModal(m) {
  const d = m.draft;
  return sheet(`<h2>${m.id ? 'Karte bearbeiten' : 'Neue Karte'}</h2>
    <form id="card-form" class="col">
      <label class="col" style="gap:4px"><span class="eyebrow">Titel</span><input class="inp" name="title" value="${esc(d.title)}" maxlength="40" placeholder="z. B. Nebel über Düsterwald" required></label>
      <label class="col" style="gap:4px"><span class="eyebrow">Text zum Vorlesen</span><textarea class="inp" name="text" maxlength="400" placeholder="Was geschieht? Wie wird es verlesen?" required>${esc(d.text)}</textarea></label>
      <label class="col" style="gap:4px"><span class="eyebrow">Wirkdauer</span><select class="inp" name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${d.kind === k ? 'selected' : ''}>${v} (${KIND_HINT[k]})</option>`).join('')}</select></label>
      <button class="btn primary" type="submit">Speichern</button></form>
    ${m.id ? `<button class="btn danger" data-action="card-delete">${I.close}Karte löschen</button>` : ''}
    <div class="mfoot"><button class="btn" data-action="cards-open">Zurück</button></div>`);
}

export function variantsModal() {
  return sheet(`<h2>Weitere Varianten</h2><p class="muted" style="font-size:14px">Diese Varianten spielt ihr am Tisch. Die App rechnet hier nichts, du führst sie nach dem Regelheft.</p>
    <div class="col">${VARIANT_INFO.map(([t, x]) => `<div class="card flat col"><b>${esc(t)}</b><span class="muted" style="font-size:14px">${esc(x)}</span></div>`).join('')}</div>${closeBtn()}`);
}

/* ---------- Im Spiel ---------- */

const cardHtml = (g, c) => {
  const hint = eventHint(g, c);
  return `<div class="card col evcard"><div class="eyebrow">Ereigniskarte ${kindBadge(c.kind)}</div><b class="evt">${esc(c.title)}</b><p>${esc(c.text)}</p>${hint ? `<div class="hint">${I.eye}<span>${esc(hint)}</span></div>` : ''}${c.by ? `<small class="muted">${esc(c.by)}</small>` : ''}</div>`;
};

/** Heute gezeigte Karten, aktive Karten und der Knopf zum Ereignisse-Dialog (Tagesansicht). */
export function eventBlock(g) {
  const ev = g.ev;
  if (!ev || !g.cfg.rules.events) return '';
  const shownIds = new Set(ev.shown.map((c) => c.id));
  const standing = ev.active.filter((c) => !shownIds.has(c.id));
  const act = standing.length ? `<div class="hint">${I.hourglass}<span>Noch aktiv: ${standing.map((c) => esc(c.title)).join(', ')}</span></div>` : '';
  const btn = `<button class="btn sm" data-action="ev-open" style="align-self:flex-start">${I.list}<span>Ereigniskarten · Büttel${ev.beadle ? `: ${esc(nm(g, ev.beadle))}` : ''}</span></button>`;
  return `${ev.shown.map((c) => cardHtml(g, c)).join('')}${act}${btn}`;
}

on('ev-open', () => { ui.modal = { type: 'ev' }; });
on('ev-draw', () => { dispatch({ t: 'ev-draw' }); return false; });
on('ev-end', (el) => { dispatch({ t: 'ev-end', id: el.dataset.id }); return false; });
on('beadle-set', (el) => { dispatch({ t: 'beadle-set', pid: el.dataset.pid }); return false; });
on('beadle-clear', () => { dispatch({ t: 'beadle-clear' }); return false; });
on('beadle-announce', (el) => { dispatch({ t: 'beadle-announce', id: el.dataset.id }); return false; });

export function evModal(g) {
  const ev = g.ev;
  if (!ev) return sheet(`<h2>Ereigniskarten</h2><p>Keine Ereigniskarten in diesem Spiel.</p>${closeBtn()}`);
  const day = g.phase === 'day';
  const active = ev.active.length ? ev.active.map((c) => `<div class="evrow"><div class="evtxt"><b>${esc(c.title)}</b> ${kindBadge(c.kind)}<small>${esc(c.text)}</small></div><button class="btn sm" data-action="ev-end" data-id="${c.id}">Beenden</button></div>`).join('') : '<p class="muted">Keine Karte wirkt gerade.</p>';
  const cands = g.cfg.players.filter((p) => alive(g, p.id) && p.id !== g.captain && p.id !== ev.beadle);
  const beadle = ev.beadle
    ? `<div class="evrow"><div class="evtxt"><b>Büttel: ${esc(nm(g, ev.beadle))}</b><small>${ev.hand.length ? `${ev.hand.length} Karte${ev.hand.length === 1 ? '' : 'n'} auf der Hand` : 'Keine Karten mehr auf der Hand'}</small></div><button class="btn sm" data-action="beadle-clear">Absetzen</button></div>
       ${ev.hand.map((c) => `<button class="opt" data-action="beadle-announce" data-id="${c.id}" ${day ? '' : 'disabled'}><span class="t"><b>${esc(c.title)}</b><span>${esc(c.text)}</span></span>${kindBadge(c.kind)}</button>`).join('')}
       ${day ? '' : '<p class="muted" style="font-size:13px">Der Büttel verkündet nur am Tag.</p>'}`
    : `<p class="muted" style="font-size:14px">Der Hauptmann ernennt einen Büttel (nicht sich selbst). Er bekommt ${ev.hand.length} vorbereitete Karte${ev.hand.length === 1 ? '' : 'n'} und darf jeden Morgen eine verkünden.</p>
       <div class="chips" style="flex-wrap:wrap;overflow:visible">${cands.map((p) => `<button class="chip" data-action="beadle-set" data-pid="${p.id}" ${g.captain ? '' : ''}>${esc(p.name)}</button>`).join('')}</div>`;
  return sheet(`<h2>Ereigniskarten</h2>
    <div class="eyebrow">Stapel</div>
    <div class="row wrap"><span class="muted">${ev.deck.length} Karten im Stapel, ${ev.drawn} gezogen</span><span class="spacer"></span><button class="btn sm" data-action="ev-draw" ${day && ev.deck.length ? '' : 'disabled'}>Jetzt eine Karte ziehen</button></div>
    <div class="eyebrow">Was gerade wirkt</div><div class="evlist">${active}</div>
    <div class="eyebrow">Büttel</div><div class="evlist">${beadle}</div>
    ${g.cfg.counts.medium ? `<div class="eyebrow">Spiritismus</div><p class="muted" style="font-size:14px">${ev.spirit.length} von ${SPIRIT_CARDS.length} Spiritismus-Karten sind noch nicht benutzt.</p>` : ''}
    ${closeBtn()}`);
}
