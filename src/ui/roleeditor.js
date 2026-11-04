// Rollen-Werkstatt: eigene Rollen als Satzbaukasten. Jede Fähigkeit ist ein Satz mit antippbaren Lücken;
// eine Lücke öffnet ein Auswahlblatt mit Kacheln, Chips und Schaltern (keine Auswahllisten).
import { S, ui, views, on, go, toast } from './core.js';
import { esc, art, I } from './art.js';
import { topBar } from './home.js';
import { ROLES, RM, CAMP_LABEL, CUSTOM_WIN, PASSIVES, BLOCKS, BLOCK_WHEN, BLOCK_WHEN_DAY, BLOCK_CHANCE, registerRoles, customBlocks, blankBlock, fillVillagers, TRIG_TARGETS, isTrigOnly, registerItems, itemRid, registerParties, PM, PARTY_WIN, WIN_N } from '../engine/roles.js';
import { asText, ITEM_TEMPLATES, itemName, partyName } from '../engine/rules.js';
import { CONDS, COND_GROUPS, MAX_DEPTH, THENS, EFFECT_GROUPS, EFFECT_HINT, PHRASE, CUSTOM_TEMPLATES, describeRule, condText, condCount, targetText, whenText, sanitizeCond, TRIGGERS, TGT_TXT, POWER_TXT, PROTECT_TXT, powerText } from '../engine/rules.js';

const WHO = { any: 'Alle', ownCamp: 'Eigene Partei', otherCamp: 'Andere Partei', withAbility: 'Mit Nachtfähigkeit', noAbility: 'Ohne Nachtfähigkeit' };
const TRAP_WHO = { first: 'Erster Besucher', all: 'Alle Besucher', wolves: 'Nur Werwölfe', nonWolves: 'Alle außer Werwölfen' };
import { uid, presentPlayers } from '../store.js';

export const CUSTOM_ICONS = ['🔮', '🗡️', '🛡️', '👁️', '🔥', '🌙', '⭐', '🍀', '🕯️', '🗝️', '🎭', '🧪', '📜', '🐺', '🦉', '🐍', '⚖️', '🏹', '🪓', '🎲', '🧿', '🌹', '💀', '🔔'];
const TABS = [['basis', 'Grundlagen'], ['rules', 'Fähigkeiten'], ['traits', 'Eigenschaften'], ['win', 'Sieg']];
const ITEM_TABS = [['basis', 'Grundlagen'], ['rules', 'Fähigkeiten']];
const isItem = () => ui.re?.kind === 'item';
const isParty = () => ui.re?.kind === 'party';
const PARTY_COLORS = ['#b07cff', '#ff7aa8', '#4fc3f7', '#ffb74d', '#81c784', '#e57373'];
const WIN_GROUPS = [['Mit dem Lager', ['camp']], ['Gewinnt mit dem Sieger', ['survive', 'bound', 'hunt']], ['Gewinnt allein', ['solo', 'executed', 'dies', 'killed', 'cult']], ['Gewinnt allein nach Zähler oder Ziel', ['kills', 'turned', 'nights', 'successes', 'killBound', 'allItem']]];
const WAKE = [['none', 'Nie'], ['first', 'Nacht 1'], ['every', 'Jede Nacht'], ['even', 'Jede 2.']];
const clone = (o) => JSON.parse(JSON.stringify(o));

const blankDraft = () => ({ name: '', camp: 'village', sub: '', desc: '', say: '', wake: 'none', after: false, icon: '', rules: [], passives: [], heir: '', needUse: false, win: 'camp' });

/** Werkstatt öffnen: neue Rolle oder vorhandene (alte Rollen mit „blocks“ werden in Regeln umgerechnet). */
export function openRoleEditor(id = null) {
  const r = id ? S.customRoles.find((x) => x.id === id) : null;
  const draft = r ? { ...blankDraft(), ...clone(r), rules: customBlocks(r) } : blankDraft();
  draft.winN ??= 3; draft.winItem ??= ''; draft.party ??= '';
  delete draft.blocks;
  ui.re = { id: r?.id ?? null, draft, tab: 'basis', sheet: null, lastDel: null, from: ui.view };
  go('roleeditor');
}

/** Gegenstand bearbeiten: gleiche Werkstatt, nur Grundlagen und Fähigkeiten. */
export function openItemEditor(id = null) {
  const it = id ? (S.customItems ?? []).find((x) => x.id === id) : null;
  const draft = { name: '', icon: '🎒', hidden: false, bad: false, charges: 1, ...(it ? clone(it) : {}), rules: it ? customBlocks({ rules: it.rules ?? [] }) : [] };
  ui.re = { kind: 'item', id: it?.id ?? null, draft, tab: 'basis', sheet: null, lastDel: null, from: ui.view };
  go('roleeditor');
}
/** Partei bearbeiten: Name, Farbe, Siegbedingung. */
export function openPartyEditor(id = null) {
  const p = id ? (S.customParties ?? []).find((x) => x.id === id) : null;
  const draft = { name: '', color: PARTY_COLORS[(S.customParties ?? []).length % PARTY_COLORS.length], block: true, ...(p ? clone(p) : {}), win: { k: 'all', n: 3, item: '', ...(p?.win ?? {}) }, rules: [] };
  ui.re = { kind: 'party', id: p?.id ?? null, draft, tab: 'basis', sheet: null, lastDel: null, from: ui.view };
  go('roleeditor');
}
/** Vorlagen-Gegenstand anlegen, falls er noch fehlt (für Rollen-Vorlagen wie den Schmied). Liefert die Kennung. */
function ensureItem(key) {
  const t = ITEM_TEMPLATES.find((x) => x.key === key);
  S.customItems ??= [];
  let it = S.customItems.find((x) => x.tpl === key);
  if (!it && t) { it = { id: uid('t'), tpl: key, name: t.name, icon: t.icon, charges: t.charges ?? 0, hidden: !!t.hidden, bad: !!t.bad, rules: customBlocks({ rules: clone(t.rules) }) }; S.customItems.push(it); registerItems([it]); }
  return it?.id ?? '';
}

/* ---------- Vorschau ---------- */
function previewHtml(d) {
  if (isParty()) {
    const win = d.win.k === 'members' ? `Sieg: mindestens ${d.win.n} Mitglieder leben.` : d.win.k === 'item' ? `Sieg: alle Lebenden tragen „${itemName(d.win.item)}“.` : 'Sieg: alle Lebenden gehören zur Partei.';
    return `<div class="re-prev card flat"><div class="re-prev-head"><span class="re-ic" style="background:${esc(d.color)}"></span><div class="t"><b>${esc(d.name.trim() || 'Neue Partei')}</b><span class="camp">Partei</span></div></div><ul class="re-lines"><li>${esc(win)}</li><li>${d.block ? 'Solange ein Mitglied lebt, kann das Dorf nicht gewinnen.' : 'Das Dorf kann trotzdem gewinnen.'}</li></ul></div>`;
  }
  if (isItem()) {
    const lines = [...d.rules.map((b) => describeRule(b)), d.charges ? `Hält ${d.charges} ${d.charges === 1 ? 'Einsatz' : 'Einsätze'}, dann ist er weg.` : 'Hält unbegrenzt.', d.hidden ? 'Verdeckt: Der Träger weiß nichts davon.' : '', d.bad ? 'Schlechter Gegenstand (Reinigen entfernt ihn).' : ''].filter(Boolean);
    return `<div class="re-prev card flat"><div class="re-prev-head"><span class="re-ic">${esc(d.icon || '🎒')}</span><div class="t"><b>${esc(d.name.trim() || 'Neuer Gegenstand')}</b><span class="camp">Gegenstand</span></div></div><ul class="re-lines" data-keep="re-prev">${lines.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  }
  const lines = [
    ...d.rules.map((b) => describeRule(b)),
    ...(d.rules.length ? [] : d.wake !== 'none' ? [`${{ first: 'In der ersten Nacht', every: 'Jede Nacht', even: 'Jede zweite Nacht' }[d.wake]}: wird nur aufgerufen.`] : ['Keine Fähigkeit in der Nacht.']),
    ...d.passives.map((p) => `${PASSIVES[p]}.`),
    ...(d.heir ? [`Übernimmt ${RM[d.heir]?.name ?? '?'}, wenn diese Rolle stirbt.`] : []),
    `Sieg: ${CUSTOM_WIN[d.win] ?? CUSTOM_WIN.camp}${d.needUse ? ', nur nach eigenem Einsatz' : ''}.`,
  ];
  const ic = d.icon || (d.name.trim()[0] ?? '?').toUpperCase();
  return `<div class="re-prev card flat"><div class="re-prev-head"><span class="re-ic ${d.camp}">${esc(ic)}</span><div class="t"><b>${esc(d.name.trim() || 'Neue Rolle')}</b><span class="camp ${d.camp}">${CAMP_LABEL[d.camp]}</span></div></div>
    <ul class="re-lines" data-keep="re-prev">${lines.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
}
const refreshPreview = () => { const el = document.getElementById('re-preview'); if (el && ui.re) el.innerHTML = previewHtml(ui.re.draft); };

/* ---------- Bausteine der Oberfläche ---------- */
const gap = (ri, f, label, extra = '') => `<button type="button" class="gap ${extra}" data-action="re-gap" data-ri="${ri}" data-f="${f}">${esc(label)}</button>`;
const chip = (action, label, on, attrs = '') => `<button type="button" class="chip ${on ? 'on' : ''}" data-action="${action}" ${attrs}>${label}</button>`;
const toggleRow = (action, title, sub, on, attrs = '', disabled = false) => `<button type="button" class="opt ${disabled ? 'off' : ''}" data-action="${action}" ${attrs} ${disabled ? 'disabled' : ''} aria-pressed="${on}"><span class="t"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</span><span class="toggle ${on ? 'on' : ''}"><i></i></span></button>`;
const pickRow = (action, title, sub, on, attrs = '') => `<button type="button" class="opt pick ${on ? 'on' : ''}" data-action="${action}" ${attrs} aria-pressed="${on}"><span class="radio"></span><span class="t"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</span></button>`;
const stepper = (action, val, label, attrs = '') => `<div class="stepper re-step"><button type="button" data-action="${action}" data-d="-1" ${attrs} aria-label="weniger">${I.minus}</button><span class="val">${esc(label ?? val)}</span><button type="button" data-action="${action}" data-d="1" ${attrs} aria-label="mehr">${I.plus}</button></div>`;

/** Ein Satz mit Lücken: Zeit · Wirkung · Ziel · Bedingung · Häufigkeit · Danach. */
function ruleCard(b, ri, n) {
  const B = BLOCKS[b.k], tt = targetText(b);
  const cond = condCount(b.if) ? condText(b.if) : 'immer';
  const freq = [b.limit ? `höchstens ${b.limit}×` : 'unbegrenzt', b.chance < 100 ? `gelingt zu ${b.chance} %` : 'gelingt immer'].join(' · ');
  const then = (b.then ?? []).length ? b.then.map((t) => THENS[t.k].name).join(', ') : 'nichts';
  // Satzbaustein in Text und Lücken zerlegen: der erste Text ist die Wirkung, {t} Ziel, {r} Rolle, {a} Erscheinen als, {x} Hinweistext
  let first = true;
  const sent = PHRASE[b.k].split(/(\{[traxip]\})/).filter((p) => p.trim()).map((p) => {
    if (p === '{t}') return tt ? gap(ri, 'target', tt) : b.k === 'strike' ? gap(ri, 'target', 'niemanden', 'empty') : esc('sich');
    if (p === '{r}') return gap(ri, 'role', RM[b.role]?.name ?? '?');
    if (p === '{a}') return gap(ri, 'as', asText(b));
    if (p === '{p}') return gap(ri, 'party', b.party ? `die Partei „${partyName(b.party)}“` : 'die Sekte');
    if (p === '{i}') return gap(ri, 'item', b.item ? `„${itemName(b.item)}“` : 'Gegenstand wählen', b.item ? '' : 'empty');
    if (p === '{x}') return gap(ri, 'text', b.text ? `„${b.text}“` : 'Text eingeben', b.text ? '' : 'empty');
    const t = p.replace(/[„“]/g, '').trim();
    if (first) { first = false; return gap(ri, 'effect', t.replace(/:$/, ''), 'eff'); }
    return esc(t);
  }).join(' ');
  const extra = [b.k === 'note' && !b.n && !b.on ? gap(ri, 'target', 'ohne Ziel', 'empty') : '', b.power != null ? gap(ri, 'power', powerText(b)) : '', b.keep != null ? gap(ri, 'keep', b.keep ? 'behält die alte Fähigkeit' : 'verliert die alte Fähigkeit') : '', b.mult != null ? gap(ri, 'mult', b.mult === 0 ? 'gestrichen' : b.mult === 0.5 ? '×½' : `×${b.mult}${b.even ? ', jeden 2. Tag' : ''}`) : '', b.plus ? gap(ri, 'mult', `+${b.plus} Stimmen`) : '', b.k === 'trap' ? gap(ri, 'trap', `${TRAP_WHO[b.trapWho]} · ${b.trapArm === 'now' ? 'sofort' : 'ab nächster Nacht'}`) : '', b.k === 'frame' ? gap(ri, 'as', `${b.nights} ${b.nights === 1 ? 'Nacht' : 'Nächte'}`) : '', b.k === 'appear' && b.scope !== 'checks' ? gap(ri, 'as', b.scope === 'death' ? 'nur beim Tod' : 'auch beim Tod') : '', !b.on && b.who && b.who !== 'any' ? gap(ri, 'target', WHO[b.who]) : ''].filter(Boolean).join(' ');
  return `<div class="rcard" data-ri="${ri}">
    <div class="rc-top"><span class="no">${ri + 1}</span><b class="rc-name">${esc(B.short)}</b>${B.day ? '<span class="pill">Tag</span>' : ''}<span class="spacer"></span>
      <button type="button" class="mini" data-action="re-move" data-ri="${ri}" data-d="-1" aria-label="Nach oben" ${ri === 0 ? 'disabled' : ''}>${I.up}</button>
      <button type="button" class="mini" data-action="re-move" data-ri="${ri}" data-d="1" aria-label="Nach unten" ${ri === n - 1 ? 'disabled' : ''}>${I.down}</button>
      <button type="button" class="mini" data-action="re-dup" data-ri="${ri}" aria-label="Verdoppeln" ${n >= 8 ? 'disabled' : ''}>${I.plus}</button>
      <button type="button" class="mini bad" data-action="re-del" data-ri="${ri}" aria-label="Entfernen">${I.close}</button></div>
    <p class="rc-sent">${gap(ri, 'timing', whenText(b))} ${sent}${extra ? ` ${extra}` : ''}</p>
    <p class="rc-sent"><span class="lbl">wenn</span> ${gap(ri, 'cond', cond, condCount(b.if) ? '' : 'empty')}</p>
    <p class="rc-sent"><span class="lbl">Häufigkeit</span> ${gap(ri, 'freq', freq)}</p>
    <p class="rc-sent"><span class="lbl">danach</span> ${gap(ri, 'then', then, (b.then ?? []).length ? '' : 'empty')}</p></div>`;
}

function tabHtml(re) {
  const d = re.draft;
  if (isParty()) return `
      <label class="re-sec"><span class="eyebrow">Name</span><input class="inp" id="re-name" value="${esc(d.name)}" maxlength="28" placeholder="z. B. Bruderschaft" autocomplete="off"></label>
      <div class="re-sec"><span class="eyebrow">Farbe</span><div class="chips wrap">${PARTY_COLORS.map((c) => `<button type="button" class="chip ${d.color === c ? 'on' : ''}" data-action="re-pcolor" data-v="${c}" aria-label="Farbe ${c}"><span class="re-dot" style="background:${c}"></span></button>`).join('')}</div></div>
      <div class="re-sec"><span class="eyebrow">Sieg der Partei</span>${Object.entries(PARTY_WIN).map(([k, t]) => pickRow('re-pwin', esc(t), '', d.win.k === k, `data-k="${k}"`)).join('')}
        ${d.win.k === 'members' ? stepper('re-pn', d.win.n, `${d.win.n} Mitglieder`) : ''}
        ${d.win.k === 'item' ? `<div class="chips wrap">${(S.customItems ?? []).map((it) => chip('re-pitem', `${esc(it.icon || '🎒')} ${esc(it.name)}`, d.win.item === it.id, `data-v="${it.id}"`)).join('') || '<span class="muted small">Erst einen Gegenstand anlegen.</span>'}</div>` : ''}</div>
      ${toggleRow('re-pblock', 'Eigenständige Partei', 'Solange ein Mitglied lebt, kann das Dorf nicht gewinnen.', !!d.block)}
      ${re.id ? `<button type="button" class="btn danger" data-action="re-delete">${I.close}<span>Partei löschen</span></button>` : ''}`;
  if (isItem() && re.tab === 'basis') return `
      <div class="re-sec"><div class="eyebrow">Mit Vorlage beginnen</div><div class="chips">${ITEM_TEMPLATES.map((t) => chip('re-itpl', `${t.icon} ${esc(t.name)}`, false, `data-k="${t.key}"`)).join('')}</div></div>
      <label class="re-sec"><span class="eyebrow">Name</span><input class="inp" id="re-name" value="${esc(d.name)}" maxlength="28" placeholder="z. B. Rüstung" autocomplete="off"></label>
      <div class="re-sec"><span class="eyebrow">Symbol</span><div class="chips wrap">${['🎒', ...CUSTOM_ICONS].map((ic) => chip('re-icon', ic, d.icon === ic, `data-v="${ic}"`)).join('')}</div></div>
      <div class="re-sec"><span class="eyebrow">Ladungen</span>${stepper('re-icharge', d.charges, d.charges ? `${d.charges}× nutzbar` : 'unbegrenzt')}</div>
      ${toggleRow('re-iflag', 'Verdeckt', 'Der Träger weiß nicht, was er hat. Nur du siehst es.', !!d.hidden, 'data-k="hidden"')}
      ${toggleRow('re-iflag', 'Schlechter Gegenstand', 'Zum Beispiel ein Fluch. „Reinigen“ entfernt ihn.', !!d.bad, 'data-k="bad"')}
      ${re.id ? `<button type="button" class="btn danger" data-action="re-delete">${I.close}<span>Gegenstand löschen</span></button>` : ''}`;
  switch (re.tab) {
    case 'basis': return `
      <div class="re-sec"><div class="eyebrow">Mit Vorlage beginnen</div><div class="chips">${CUSTOM_TEMPLATES.map((t) => chip('re-tpl', `${t.icon} ${esc(t.name)}`, false, `data-k="${t.key}"`)).join('')}</div></div>
      <label class="re-sec"><span class="eyebrow">Name</span><input class="inp" id="re-name" value="${esc(d.name)}" maxlength="28" placeholder="z. B. Nachtwächter" autocomplete="off"></label>
      <div class="re-sec"><span class="eyebrow">Lager</span><div class="re-two">${pickRow('re-camp', 'Dorf', 'Gewinnt mit den Dorfbewohnern', d.camp !== 'wolf', 'data-v="village"')}${pickRow('re-camp', 'Werwölfe', 'Zählt als Wolf', d.camp === 'wolf', 'data-v="wolf"')}</div></div>
      <div class="re-sec"><span class="eyebrow">Symbol</span><div class="chips wrap">${['', ...CUSTOM_ICONS].map((ic) => chip('re-icon', ic || 'Aa', (d.icon || '') === ic, `data-v="${ic}" aria-label="${ic ? `Symbol ${ic}` : 'Anfangsbuchstabe'}"`)).join('')}</div></div>
      <label class="re-sec"><span class="eyebrow">Kurzbeschreibung</span><input class="inp" id="re-sub" value="${esc(d.sub)}" maxlength="60" placeholder="z. B. Sieht, wer nachts wach ist" autocomplete="off"></label>
      <label class="re-sec"><span class="eyebrow">Ansage zum Vorlesen</span><input class="inp" id="re-say" value="${esc(d.say)}" maxlength="300" placeholder="Der Nachtwächter erwacht." autocomplete="off"></label>
      <label class="re-sec"><span class="eyebrow">Beschreibung</span><textarea class="inp" id="re-desc" maxlength="600" placeholder="Was kann die Rolle?">${esc(d.desc)}</textarea></label>
      <div class="re-sec"><span class="eyebrow">Aufruf in der Nacht</span><div class="seg">${[[false, 'Vor den Wölfen'], [true, 'Nach den Wölfen']].map(([v, t]) => `<button type="button" class="${!!d.after === v ? 'on' : ''}" data-action="re-after" data-v="${v ? 1 : 0}">${t}</button>`).join('')}</div></div>
      ${re.id ? `<button type="button" class="btn danger" data-action="re-delete">${I.close}<span>Rolle löschen</span></button>` : ''}`;
    case 'rules': return `
      ${d.rules.map((b, i) => ruleCard(b, i, d.rules.length)).join('')}
      ${re.lastDel ? `<div class="hint">${I.undo}<span>${esc(BLOCKS[re.lastDel.rule.k].short)} entfernt.</span><button type="button" class="btn sm ghost" data-action="re-undo">Rückgängig</button></div>` : ''}
      ${d.rules.length < 8 ? `<button type="button" class="btn re-add" data-action="re-gap" data-ri="-1" data-f="effect">${I.plus}<span>Fähigkeit hinzufügen</span></button>` : '<p class="muted small">Höchstens 8 Fähigkeiten.</p>'}
      ${d.rules.length ? '' : `<div class="re-sec"><span class="eyebrow">Ohne Fähigkeit nachts aufrufen</span><div class="seg">${WAKE.map(([v, t]) => `<button type="button" class="${d.wake === v ? 'on' : ''}" data-action="re-wake" data-v="${v}">${t}</button>`).join('')}</div></div>`}
      <p class="muted small">Die App wertet die Nacht in festen Stufen aus: erst Sperren, dann Schutz, dann Angriffe, dann Folgen und Informationen.</p>`;
    case 'traits': return `
      <div class="re-sec"><span class="eyebrow">Dauerhafte Eigenschaften</span>${Object.entries(PASSIVES).map(([k, t]) => toggleRow('re-passive', esc(t), '', d.passives.includes(k), `data-k="${k}"`)).join('')}</div>
      <div class="re-sec"><span class="eyebrow">Gehört zur Partei</span><div class="chips wrap">${chip('re-party', 'Keine', !d.party, 'data-v=""')}${(S.customParties ?? []).map((p) => chip('re-party', `<span class="re-dot" style="background:${esc(p.color)}"></span>${esc(p.name)}`, d.party === p.id, `data-v="${p.id}"`)).join('')}</div>${(S.customParties ?? []).length ? '' : '<span class="muted small">Parteien legst du unter „Eigene“ → „Parteien“ an.</span>'}</div>
      <div class="re-sec"><span class="eyebrow">Erbt eine Rolle</span><button type="button" class="opt" data-action="re-gap" data-ri="-1" data-f="heir">${d.heir ? art(d.heir) : ''}<span class="t"><b>${d.heir ? `Übernimmt ${esc(RM[d.heir]?.name ?? '?')}` : 'Keine'}</b><span>Stirbt diese Rolle, wird die eigene Rolle zu ihr.</span></span>${I.right}</button></div>`;
    case 'win': {
      const needsBind = (d.win === 'bound' || d.win === 'hunt') && !d.rules.some((b) => b.k === 'bind');
      return `${WIN_GROUPS.map(([t, ks]) => `<div class="re-sec"><span class="eyebrow">${t}</span>${ks.map((k) => pickRow('re-win', esc(CUSTOM_WIN[k]), '', (d.win || 'camp') === k, `data-k="${k}"`)).join('')}</div>`).join('')}
        ${needsBind ? `<div class="hint ok">${I.check}<span>Beim Speichern ergänzt die App die Fähigkeit „Ziel festlegen“ in der ersten Nacht.</span></div>` : ''}
        ${WIN_N.includes(d.win) ? `<div class="re-sec"><span class="eyebrow">Wie viele?</span>${stepper('re-winn', d.winN ?? 3, String(d.winN ?? 3))}</div>` : ''}
        ${d.win === 'allItem' ? `<div class="re-sec"><span class="eyebrow">Welcher Gegenstand?</span><div class="chips wrap">${(S.customItems ?? []).map((it) => chip('re-winitem', `${esc(it.icon || '🎒')} ${esc(it.name)}`, d.winItem === it.id, `data-v="${it.id}"`)).join('') || '<span class="muted small">Erst einen Gegenstand anlegen.</span>'}</div></div>` : ''}
        ${toggleRow('re-needuse', 'Nur nach eigenem Einsatz', 'Der Sieg zählt nur, wenn die Rolle ihre Fähigkeit mindestens einmal benutzt hat.', d.needUse)}`;
    }
    default: return '';
  }
}

/* ---------- Auswahlblätter ---------- */
const condAt = (root, path) => (path === '' ? root : path.split('.').reduce((n, i) => (n.all ?? n.any)[+i], root));
const depthOf = (path) => (path === '' ? 1 : path.split('.').length + 1);

function condGroupHtml(grp, path) {
  const list = grp.all ?? grp.any, depth = depthOf(path);
  const items = list.map((c, i) => {
    const p = path === '' ? `${i}` : `${path}.${i}`;
    if (c.all || c.any) return condGroupHtml(c, p);
    const C = CONDS[c.k];
    const arg = C.arg === 'item' ? `<button type="button" class="chip" data-action="re-citem" data-p="${p}">${esc(c.item ? itemName(c.item) : 'Gegenstand wählen')}</button>` : C.arg === 'n' ? stepper('re-cnum', c.n, String(c.n), `data-p="${p}"`) : C.arg === 'role' ? `<button type="button" class="chip" data-action="re-crole" data-p="${p}">${art(c.role)}${esc(RM[c.role]?.name ?? '?')}</button>` : '';
    return `<div class="crow"><span class="ctext">${esc(C.name)}</span>${arg}<button type="button" class="mini bad" data-action="re-cdel" data-p="${p}" aria-label="Bedingung entfernen">${I.close}</button></div>`;
  }).join('');
  return `<div class="cgrp d${depth}"><div class="cg-head"><div class="seg">${[['all', 'Alle müssen gelten'], ['any', 'Eine reicht']].map(([k, t]) => `<button type="button" class="${grp[k] ? 'on' : ''}" data-action="re-cmode" data-p="${path}" data-k="${k}">${t}</button>`).join('')}</div>${path !== '' ? `<button type="button" class="mini bad" data-action="re-cdel" data-p="${path}" aria-label="Gruppe entfernen">${I.close}</button>` : ''}</div>
    ${items || `<p class="muted small">${path === '' ? 'Noch keine Bedingung: Die Fähigkeit gilt immer.' : 'Leere Gruppe: zählt als erfüllt.'}</p>`}
    <div class="cg-add"><button type="button" class="btn sm" data-action="re-cpick" data-p="${path}">${I.plus}<span>Bedingung</span></button>${depth < MAX_DEPTH ? `<button type="button" class="btn sm" data-action="re-cgrp" data-p="${path}">${I.plus}<span>Gruppe</span></button>` : ''}</div></div>`;
}

function rolePicker(action, cur, { none = false } = {}) {
  return `<div class="re-roles">${none ? `<button type="button" class="re-role ${!cur ? 'on' : ''}" data-action="${action}" data-v=""><span class="re-ic">–</span><b>Keine</b></button>` : ''}${ROLES.filter((r) => !r.custom && r.id !== 'villager').map((r) => `<button type="button" class="re-role ${cur === r.id ? 'on' : ''}" data-action="${action}" data-v="${r.id}">${art(r.id)}<b>${esc(r.name)}</b></button>`).join('')}</div>`;
}

function sheetHtml(re) {
  const sh = re.sheet, d = re.draft, b = d.rules[sh.ri];
  let title = '', body = '';
  switch (sh.f) {
    case 'effect':
      title = sh.ri < 0 ? 'Fähigkeit hinzufügen' : 'Fähigkeit ändern';
      body = EFFECT_GROUPS.map(([t, ks]) => `<div class="eyebrow">${t}</div><div class="re-tiles">${ks.map((k) => `<button type="button" class="re-tile ${b?.k === k ? 'on' : ''}" data-action="re-effect" data-k="${k}"><b>${esc(BLOCKS[k].short)}${BLOCKS[k].day ? ' <span class="pill">Tag</span>' : ''}</b><span>${esc(EFFECT_HINT[k])}</span></button>`).join('')}</div>`).join('');
      break;
    case 'timing': {
      const B = BLOCKS[b.k], W = B.day ? BLOCK_WHEN_DAY : BLOCK_WHEN, trigOnly = isTrigOnly(b.k);
      title = 'Wann?';
      const mode = B.trig && !trigOnly ? `<div class="seg">${[['', 'Zu einer Zeit'], [B.trig[0], 'Bei einem Ereignis']].map(([v, t]) => `<button type="button" class="${!!b.on === !!v ? 'on' : ''}" data-action="re-set" data-key="on" data-v="${v}">${t}</button>`).join('')}</div>` : '';
      const list = b.on ? B.trig.map((k) => pickRow('re-set', esc(TRIGGERS[k]), '', b.on === k, `data-key="on" data-v="${k}"`)) : Object.entries(W).map(([k, t]) => pickRow('re-set', esc(t), '', b.when === k, `data-key="when" data-v="${k}"`));
      const ghost = !b.on && !B.day && !trigOnly ? `${toggleRow('re-flag', 'Als Geist (nach dem Tod)', 'Die tote Person wird nachts weiter geweckt und nutzt nur diese Fähigkeit.', !!b.ghost, 'data-key="ghost"')}${b.ghost ? `<div class="re-sec"><span class="eyebrow">Wie lange nach dem Tod?</span>${stepper('re-num', b.ghostNights, b.ghostNights ? `${b.ghostNights} ${b.ghostNights === 1 ? 'Nacht' : 'Nächte'}` : 'immer', 'data-key="ghostNights" data-min="0" data-max="5"')}</div>` : ''}` : '';
      body = `${mode}${b.on ? '<p class="muted small">Die Regel wirkt automatisch, ohne Nachtschritt.</p>' : ''}<div class="re-tiles one">${list.join('')}</div>${ghost}`;
      break;
    }
    case 'as': {
      title = b.k === 'appear' ? 'Erscheint als …' : 'Lässt erscheinen als …';
      body = `<div class="re-tiles one">${[['village', 'Dorfbewohner', 'Prüfungen zeigen „kein Werwolf“.'], ['wolf', 'Werwolf', 'Prüfungen zeigen „Werwolf“.'], ['role', 'Eine feste Rolle', `Zurzeit: ${esc(RM[b.role]?.name ?? '?')}`], ['random', 'Eine zufällige Rolle', 'Jede Nacht eine andere Rolle aus dem Spiel.']].map(([k, t, h]) => pickRow('re-set', t, h, b.as === k, `data-key="as" data-v="${k}"`)).join('')}</div>
        ${b.as === 'role' ? `<button type="button" class="btn sm" data-action="re-gap" data-ri="${sh.ri}" data-f="role">${I.right}<span>Rolle wählen</span></button>` : ''}
        ${b.k === 'frame' ? `<div class="re-sec"><span class="eyebrow">Wie lange?</span>${stepper('re-num', b.nights, `${b.nights} ${b.nights === 1 ? 'Nacht' : 'Nächte'}`, 'data-key="nights" data-min="1" data-max="3"')}</div>` : ''}
        ${b.k === 'appear' ? `<div class="re-sec"><span class="eyebrow">Wann?</span><div class="seg">${[['checks', 'Bei Prüfungen'], ['death', 'Beim Tod'], ['both', 'Beides']].map(([k, t]) => `<button type="button" class="${b.scope === k ? 'on' : ''}" data-action="re-set" data-key="scope" data-v="${k}">${t}</button>`).join('')}</div><p class="muted small">Beim Tod: Die App zeigt dir die Rolle, die du ansagst, und klein die echte.</p></div>` : ''}`;
      break;
    }
    case 'mult': {
      title = b.k === 'votePenalty' ? 'Wie viele Strafstimmen?' : 'Wie stark zählt die Stimme?';
      if (b.k === 'votePenalty') { body = stepper('re-num', b.plus, `+${b.plus} Stimmen`, 'data-key="plus" data-min="1" data-max="3"'); break; }
      const opts = b.k === 'voteBoost' ? [[2, 'Doppelt', ''], [0.5, 'Halb', ''], [0, 'Gestrichen', 'Die Stimme zählt heute nicht.']] : [[2, 'Doppelt', ''], [3, 'Dreifach', '']];
      body = `<div class="re-tiles one">${opts.map(([v, t, h]) => pickRow('re-set', t, h, b.mult === v, `data-key="mult" data-v="${v}"`)).join('')}</div>${b.k === 'selfVote' ? toggleRow('re-flag', 'Nur jeden zweiten Tag', '', !!b.even, 'data-key="even"') : ''}`;
      break;
    }
    case 'keep':
      title = 'Alte Fähigkeit?';
      body = `<div class="re-tiles one">${[[true, 'Behält die alte Fähigkeit', 'Zählt heimlich als Werwolf, wird aber weiter als eigene Rolle aufgerufen.'], [false, 'Wird einfacher Werwolf', 'Die eigene Rolle ist weg.']].map(([v, t, h]) => pickRow('re-set', t, h, !!b.keep === v, `data-key="keep" data-v="${v ? 1 : 0}"`)).join('')}</div>`;
      break;
    case 'power': {
      title = b.k === 'protect' ? 'Wie stark ist der Schutz?' : 'Wie stark ist der Angriff?';
      const opts = b.k === 'protect' ? [[1, 'Normal', 'Hält normale Angriffe ab, auch den der Werwölfe.'], [2, 'Stark', 'Hält auch durchdringende Angriffe ab.']]
        : [[1, 'Normal', 'Jeder Schutz hält ihn ab.'], [2, 'Durchdringend', 'Nur starker Schutz hält ihn ab.'], [3, 'Unaufhaltbar', 'Nichts hält ihn ab, auch kein Schild.']];
      body = `<div class="re-tiles one">${opts.map(([v, t, h]) => pickRow('re-set', t, h, b.power === v, `data-key="power" data-v="${v}"`)).join('')}</div>`;
      break;
    }
    case 'trap':
      title = 'Falle';
      body = `<div class="re-sec"><span class="eyebrow">Wen trifft sie?</span><div class="re-tiles one">${Object.entries(TRAP_WHO).map(([k, t]) => pickRow('re-set', t, '', b.trapWho === k, `data-key="trapWho" data-v="${k}"`)).join('')}</div></div>
        <div class="re-sec"><span class="eyebrow">Wann ist sie scharf?</span><div class="seg">${[['now', 'Sofort'], ['next', 'Ab der nächsten Nacht']].map(([k, t]) => `<button type="button" class="${b.trapArm === k ? 'on' : ''}" data-action="re-set" data-key="trapArm" data-v="${k}">${t}</button>`).join('')}</div><p class="muted small">Eine Falle wirkt einmal und ist dann verbraucht.</p></div>`;
      break;
    case 'target': {
      if (b.on) {
        title = 'Wen trifft es?';
        body = `<div class="re-tiles one">${TRIG_TARGETS[b.on].map((k) => pickRow('re-set', k === 'none' ? 'Niemanden (nur Hinweis)' : esc(TGT_TXT[k][0].toUpperCase() + TGT_TXT[k].slice(1)), k === 'pick' ? 'Die App fragt dich, wen es trifft.' : '', (b.tgt ?? 'none') === k, `data-key="tgt" data-v="${k}"`)).join('')}</div>`;
        break;
      }
      const B = BLOCKS[b.k], fixed = !!B.fixed || !!B.selfOnly, min = b.k === 'note' ? 0 : 1;
      title = 'Wen?';
      body = `<div class="re-sec"><span class="eyebrow">Anzahl</span>${fixed ? `<p class="muted">Fest: ${B.selfOnly ? 'nur die eigene Person' : `${B.fixed} Personen`}</p>` : stepper('re-num', b.n, b.n === 0 ? 'kein Ziel' : b.n === 1 ? '1 Person' : `bis zu ${b.n}`, `data-key="n" data-min="${min}" data-max="3"`)}</div>
        ${toggleRow('re-flag', 'Darf sich selbst wählen', B.dead || B.selfOnly ? 'Hier nicht möglich.' : '', !!b.self, 'data-key="self"', !!(B.dead || B.selfOnly))}
        ${toggleRow('re-flag', 'Nie zweimal hintereinander dieselbe Person', '', !!b.rep, 'data-key="rep"', !!B.selfOnly)}
        ${toggleRow('re-flag', 'Jede Person nur einmal im Spiel', '', !!b.once, 'data-key="once"', !!B.selfOnly)}
        ${toggleRow('re-flag', 'Zählt als Besuch', 'Wichtig für Beobachten, Fallen und Wachsam. Ohne diesen Schalter besuchen nur die Werwölfe.', !!b.visit, 'data-key="visit"', !!B.selfOnly || b.k === 'bind' || b.k === 'visit')}
        <div class="re-sec"><span class="eyebrow">Wen darf sie wählen?</span><div class="chips wrap">${Object.entries(WHO).map(([k, t]) => chip('re-set', t, (b.who ?? 'any') === k, `data-key="who" data-v="${k}" ${B.selfOnly ? 'disabled' : ''}`)).join('')}</div></div>`;
      break;
    }
    case 'freq':
      title = 'Wie oft und wie sicher?';
      body = `<div class="re-sec"><span class="eyebrow">Wie oft im Spiel</span><div class="chips wrap">${[0, 1, 2, 3, 5].map((v) => chip('re-set', v ? `${v}×` : 'Unbegrenzt', b.limit === v, `data-key="limit" data-v="${v}" ${BLOCKS[b.k].limit1 ? 'disabled' : ''}`)).join('')}</div></div>
        <div class="re-sec"><span class="eyebrow">Gelingt</span><div class="chips wrap">${BLOCK_CHANCE.map((v) => chip('re-set', v === 100 ? 'Immer' : `${v} %`, b.chance === v, `data-key="chance" data-v="${v}" ${BLOCKS[b.k].limit1 ? 'disabled' : ''}`)).join('')}</div><p class="muted small">Unter 100 % würfelt die App. Das Ergebnis siehst nur du.</p></div>`;
      break;
    case 'cond':
      title = 'Wenn …';
      body = `<p class="muted small">${b.on ? 'Die Regel wirkt nur, wenn die Bedingungen in diesem Moment erfüllt sind.' : 'Die Fähigkeit wird nur angeboten, wenn die Bedingungen erfüllt sind.'}</p>${condGroupHtml(b.if ?? { all: [] }, '')}`;
      break;
    case 'condPick':
      title = 'Bedingung wählen';
      body = COND_GROUPS.filter(([, ks]) => b.on || !CONDS[ks[0]].ctx).map(([t, ks]) => `<div class="eyebrow">${t}</div><div class="re-tiles">${ks.map((k) => `<button type="button" class="re-tile" data-action="re-cadd" data-k="${k}"><b>${esc(CONDS[k].name)}</b></button>`).join('')}</div>`).join('');
      break;
    case 'party':
      title = 'In welche Gruppe?';
      body = `<div class="re-tiles one">${pickRow('re-set', 'Die Sekte der Rolle', 'Wie beim Sektenführer: Sieg „alle Lebenden gehören zur Sekte“.', !b.party, 'data-key="party" data-v=""')}${(S.customParties ?? []).map((p) => pickRow('re-set', esc(p.name), 'Eigene Partei', b.party === p.id, `data-key="party" data-v="${p.id}"`)).join('')}</div>`;
      break;
    case 'item': case 'condItem': {
      title = 'Welcher Gegenstand?';
      const cur = sh.f === 'item' ? b.item : condAt(b.if, sh.path).item, list = S.customItems ?? [];
      body = list.length ? `<div class="re-tiles">${list.map((it) => `<button type="button" class="re-tile ${cur === it.id ? 'on' : ''}" data-action="re-item" data-v="${it.id}"><b>${esc(it.icon || '🎒')} ${esc(it.name)}</b><span>${it.charges ? `${it.charges} Ladung${it.charges === 1 ? '' : 'en'}` : 'unbegrenzt'}${it.hidden ? ' · verdeckt' : ''}</span></button>`).join('')}</div>` : '<p class="muted">Noch keine Gegenstände. Lege sie bei der Rollenwahl unter „Eigene“ → „Gegenstände“ an.</p>';
      body += `<div class="eyebrow">Aus Vorlage anlegen</div><div class="chips wrap">${ITEM_TEMPLATES.map((t) => chip('re-item-tpl', `${t.icon} ${esc(t.name)}`, false, `data-k="${t.key}"`)).join('')}</div>`;
      break;
    }
    case 'condRole': title = 'Welche Rolle?'; body = rolePicker('re-crole-set', condAt(b.if, sh.path).role); break;
    case 'role': title = 'In welche Rolle?'; body = rolePicker('re-role', b.role); break;
    case 'heir': title = 'Erbt welche Rolle?'; body = rolePicker('re-heir', d.heir, { none: true }); break;
    case 'text':
      title = 'Hinweis für dich';
      body = `<textarea class="inp" id="re-note" maxlength="200" placeholder="z. B. Die Person darf dem Spielleiter eine Ja-Nein-Frage stellen.">${esc(b.text ?? '')}</textarea><p class="muted small">Die App rechnet hier nichts. Sie zeigt den Text im Nachtschritt und am Morgen.</p>`;
      break;
    case 'then':
      title = 'Danach';
      body = `${(b.then ?? []).map((t, i) => `<div class="crow"><span class="ctext">${esc(THENS[t.k].name)}</span>${t.k === 'note' ? `<input class="inp" id="re-then-${i}" value="${esc(t.text)}" maxlength="200" placeholder="Text">` : ''}<button type="button" class="mini bad" data-action="re-tdel" data-i="${i}" aria-label="Entfernen">${I.close}</button></div>`).join('') || '<p class="muted small">Keine Nebenwirkung.</p>'}
        <div class="re-tiles">${Object.entries(THENS).filter(([k]) => !(b.then ?? []).some((t) => t.k === k)).map(([k, T]) => `<button type="button" class="re-tile" data-action="re-tadd" data-k="${k}"><b>${esc(T.name)}</b><span>${esc(T.hint)}</span></button>`).join('')}</div>`;
      break;
    default: break;
  }
  const back = sh.f === 'condPick' || sh.f === 'condRole' || sh.f === 'condItem' ? `<button type="button" class="ibtn" data-action="re-sheet-back" aria-label="Zurück">${I.left}</button>` : '';
  return `<div class="backdrop sheet" data-action="re-sheet-close"><div class="modal sheet re-sheet" data-stop role="dialog" aria-modal="true" data-keep="re-sheet-${sh.f}">
    <div class="re-sheet-head">${back}<h2>${title}</h2><span class="spacer"></span><button type="button" class="btn sm" data-action="re-sheet-close" data-done="1">Fertig</button></div>${body}</div></div>`;
}

views.roleeditor = () => {
  const re = ui.re;
  if (!re) return views.home();
  return `<div class="view re">${topBar(isParty() ? (re.id ? 'Partei bearbeiten' : 'Neue Partei') : isItem() ? (re.id ? 'Gegenstand bearbeiten' : 'Neuer Gegenstand') : re.id ? 'Rolle bearbeiten' : 'Neue Rolle', 'Rollen-Werkstatt', { back: 're-back', right: '<button class="btn primary sm" data-action="re-save">Speichern</button>' })}
    <div class="page re-page"><div id="re-preview">${previewHtml(re.draft)}</div>
      ${isParty() ? '' : `<div class="seg re-tabs" role="tablist">${(isParty() ? [['basis', 'Partei']] : isItem() ? ITEM_TABS : TABS).map(([k, t]) => `<button type="button" role="tab" class="${re.tab === k ? 'on' : ''}" data-action="re-tab" data-k="${k}" aria-selected="${re.tab === k}">${t}${k === 'rules' && re.draft.rules.length ? ` <em>${re.draft.rules.length}</em>` : ''}</button>`).join('')}</div>`}
      <div class="re-scroll scroll" data-keep="re-${re.tab}">${tabHtml(re)}</div></div>${re.sheet ? sheetHtml(re) : ''}</div>`;
};

/* ---------- Handler ---------- */
const D = () => ui.re.draft;
const R = () => ui.re.draft.rules[ui.re.sheet?.ri];
const fix = (b) => customBlocks({ rules: [b] })[0] ?? b;

on('re-tab', (el) => { ui.re.tab = el.dataset.k; ui.re.sheet = null; });
on('re-back', () => { const from = ui.re?.from ?? 'setup'; ui.re = null; go(from); return false; });
for (const [id, key, max] of [['re-name', 'name', 28], ['re-sub', 'sub', 60], ['re-say', 'say', 300], ['re-desc', 'desc', 600]]) on(`input:${id}`, (el) => { D()[key] = el.value.slice(0, max); refreshPreview(); return false; });
on('input:re-note', (el) => { const b = R(); if (b) { b.text = el.value.slice(0, 200); refreshPreview(); } return false; });
for (let i = 0; i < 3; i++) on(`input:re-then-${i}`, (el) => { const t = R()?.then?.[i]; if (t) { t.text = el.value.slice(0, 200); refreshPreview(); } return false; });

on('re-tpl', (el) => {
  const t = CUSTOM_TEMPLATES.find((x) => x.key === el.dataset.k); if (!t) return false;
  const d = D();
  const ids = Object.fromEntries((t.needItems ?? []).map((k) => [`@${k}`, ensureItem(k)]));
  const rules = clone(t.rules).map((b) => (b.item && ids[b.item] != null ? { ...b, item: ids[b.item] } : b));
  Object.assign(d, { camp: t.camp ?? d.camp, name: d.name.trim() ? d.name : t.name, sub: d.sub.trim() ? d.sub : t.sub, icon: t.icon, rules: customBlocks({ rules }), passives: [...(t.passives ?? [])], win: t.win ?? 'camp', needUse: false });
  toast(`Vorlage „${t.name}“ übernommen. Alles lässt sich ändern.`);
});
on('re-itpl', (el) => {
  const t = ITEM_TEMPLATES.find((x) => x.key === el.dataset.k); if (!t) return false;
  Object.assign(D(), { name: D().name.trim() ? D().name : t.name, icon: t.icon, charges: t.charges ?? 0, hidden: !!t.hidden, bad: !!t.bad, rules: customBlocks({ rules: clone(t.rules) }), tpl: t.key });
  toast(`Vorlage „${t.name}“ übernommen.`);
});
on('re-pcolor', (el) => { D().color = el.dataset.v; });
on('re-pwin', (el) => { D().win.k = el.dataset.k; });
on('re-pn', (el) => { D().win.n = Math.max(1, Math.min(20, D().win.n + +el.dataset.d)); });
on('re-pitem', (el) => { D().win.item = el.dataset.v; });
on('re-pblock', () => { D().block = !D().block; });
on('re-party', (el) => { D().party = el.dataset.v; });
on('re-winn', (el) => { D().winN = Math.max(1, Math.min(20, (D().winN ?? 3) + +el.dataset.d)); });
on('re-winitem', (el) => { D().winItem = el.dataset.v; });
on('re-icharge', (el) => { D().charges = Math.max(0, Math.min(9, (D().charges ?? 0) + +el.dataset.d)); });
on('re-iflag', (el) => { D()[el.dataset.k] = !D()[el.dataset.k]; });
on('re-item', (el) => { const sh = ui.re.sheet, b = R(); if (sh.f === 'item') { b.item = el.dataset.v; ui.re.sheet = null; } else { condAt(condRoot(), sh.path).item = el.dataset.v; ui.re.sheet = { ...sh, f: 'cond', path: '' }; } });
on('re-item-tpl', (el) => { const id = ensureItem(el.dataset.k), sh = ui.re.sheet, b = R(); if (sh.f === 'item') { b.item = id; ui.re.sheet = null; } else { condAt(condRoot(), sh.path).item = id; ui.re.sheet = { ...sh, f: 'cond', path: '' }; } toast('Gegenstand angelegt.'); });
on('re-citem', (el) => { ui.re.sheet = { ...ui.re.sheet, f: 'condItem', path: el.dataset.p }; });
on('re-camp', (el) => { D().camp = el.dataset.v === 'wolf' ? 'wolf' : 'village'; });
on('re-icon', (el) => { D().icon = el.dataset.v; });
on('re-after', (el) => { D().after = el.dataset.v === '1'; });
on('re-wake', (el) => { D().wake = el.dataset.v; });
on('re-passive', (el) => { const p = D().passives, k = el.dataset.k, i = p.indexOf(k); if (i >= 0) p.splice(i, 1); else p.push(k); });
on('re-win', (el) => { D().win = el.dataset.k; });
on('re-needuse', () => { D().needUse = !D().needUse; });

on('re-gap', (el) => { ui.re.sheet = { ri: +el.dataset.ri, f: el.dataset.f, path: '' }; });
on('re-sheet-close', (el, e) => { if (e.target.closest('[data-stop]') && !el.dataset.done) return false; ui.re.sheet = null; });
on('re-sheet-back', () => { ui.re.sheet.f = 'cond'; });
on('re-effect', (el) => {
  const k = el.dataset.k, d = D(), sh = ui.re.sheet;
  if (sh.ri < 0) { d.rules.push(fix({ ...blankBlock(k), self: !!BLOCKS[k].selfOnly })); ui.re.tab = 'rules'; ui.re.sheet = BLOCKS[k].role ? { ri: d.rules.length - 1, f: 'role', path: '' } : BLOCKS[k].as ? { ri: d.rules.length - 1, f: 'as', path: '' } : k === 'note' ? { ri: d.rules.length - 1, f: 'text', path: '' } : null; return; }
  d.rules[sh.ri] = fix({ ...d.rules[sh.ri], k });
  ui.re.sheet = null;
});
on('re-set', (el) => { const b = R(); if (!b) return false; const k = el.dataset.key, v = el.dataset.v; b[k] = ['limit', 'chance', 'power', 'n', 'mult', 'ghostNights'].includes(k) ? +v : k === 'keep' ? v === '1' : v; D().rules[ui.re.sheet.ri] = fix(b); });
on('re-num', (el) => { const b = R(); if (!b) return false; const k = el.dataset.key || 'n'; b[k] = Math.max(+el.dataset.min, Math.min(+el.dataset.max, (b[k] ?? 0) + +el.dataset.d)); D().rules[ui.re.sheet.ri] = fix(b); });
on('re-flag', (el) => { const b = R(); if (!b) return false; b[el.dataset.key] = !b[el.dataset.key]; D().rules[ui.re.sheet.ri] = fix(b); });
on('re-role', (el) => { const b = R(); if (b) b.role = el.dataset.v; ui.re.sheet = BLOCKS[b?.k]?.as ? { ...ui.re.sheet, f: 'as' } : null; });
on('re-heir', (el) => { D().heir = el.dataset.v; ui.re.sheet = null; });

on('re-move', (el) => { const r = D().rules, i = +el.dataset.ri, j = i + +el.dataset.d; if (j < 0 || j >= r.length) return false; [r[i], r[j]] = [r[j], r[i]]; });
on('re-dup', (el) => { const r = D().rules, i = +el.dataset.ri; if (r.length < 8) r.splice(i + 1, 0, clone(r[i])); });
on('re-del', (el) => { const i = +el.dataset.ri; ui.re.lastDel = { rule: D().rules[i], i }; D().rules.splice(i, 1); });
on('re-undo', () => { const x = ui.re.lastDel; if (x) D().rules.splice(Math.min(x.i, D().rules.length), 0, x.rule); ui.re.lastDel = null; });

// Bedingungen: Baum unter rule.if, Pfad „0.2“ = zweites Element der ersten Untergruppe
const condRoot = () => { const b = R(); b.if ??= { all: [] }; return b.if; };
const condSave = () => { const b = R(); b.if = sanitizeCond(b.if) ?? { all: [] }; };
on('re-cmode', (el) => { const g = condAt(condRoot(), el.dataset.p), list = g.all ?? g.any; delete g.all; delete g.any; g[el.dataset.k] = list; });
on('re-cpick', (el) => { ui.re.sheet = { ...ui.re.sheet, f: 'condPick', path: el.dataset.p }; });
on('re-cadd', (el) => {
  const C = CONDS[el.dataset.k], g = condAt(condRoot(), ui.re.sheet.path), list = g.all ?? g.any;
  list.push({ k: el.dataset.k, ...(C.arg === 'n' ? { n: C.def } : C.arg === 'role' ? { role: 'seer' } : C.arg === 'item' ? { item: (S.customItems ?? [])[0]?.id ?? '' } : {}) });
  condSave(); ui.re.sheet = { ...ui.re.sheet, f: 'cond' };
});
on('re-cgrp', (el) => { const g = condAt(condRoot(), el.dataset.p); (g.all ?? g.any).push({ any: [] }); });
on('re-cdel', (el) => { const p = el.dataset.p.split('.'), last = +p.pop(), g = condAt(condRoot(), p.join('.')); (g.all ?? g.any).splice(last, 1); });
on('re-cnum', (el) => { const c = condAt(condRoot(), el.dataset.p), C = CONDS[c.k]; c.n = Math.max(C.min, Math.min(C.max, c.n + +el.dataset.d)); });
on('re-crole', (el) => { ui.re.sheet = { ...ui.re.sheet, f: 'condRole', path: el.dataset.p }; });
on('re-crole-set', (el) => { condAt(condRoot(), ui.re.sheet.path).role = el.dataset.v; ui.re.sheet = { ...ui.re.sheet, f: 'cond', path: '' }; });

on('re-tadd', (el) => { const b = R(); b.then = [...(b.then ?? []), el.dataset.k === 'note' ? { k: 'note', text: '' } : { k: el.dataset.k }].slice(0, 3); });
on('re-tdel', (el) => { R().then.splice(+el.dataset.i, 1); });

on('re-save', () => {
  const re = ui.re, d = re.draft;
  if (!d.name.trim()) { re.tab = 'basis'; toast('Bitte einen Namen eingeben.'); return; }
  if (isParty()) {
    const p = { ...clone(d), name: d.name.trim(), id: re.id ?? uid('p') };
    delete p.rules;
    S.customParties ??= [];
    const j = S.customParties.findIndex((x) => x.id === p.id);
    if (j >= 0) S.customParties[j] = p; else S.customParties.push(p);
    registerParties([p]); ui.ownTab = 'parties';
    const from = re.from ?? 'setup'; ui.re = null; toast(`„${p.name}“ gespeichert.`); go(from); return false;
  }
  if (isItem()) {
    const it = { ...clone(d), name: d.name.trim(), id: re.id ?? uid('t'), rules: customBlocks({ rules: d.rules }) };
    S.customItems ??= [];
    const j = S.customItems.findIndex((x) => x.id === it.id);
    if (j >= 0) S.customItems[j] = it; else S.customItems.push(it);
    registerItems([it]); ui.ownTab = 'items';
    const from = re.from ?? 'setup'; ui.re = null; toast(`„${it.name}“ gespeichert.`); go(from); return false;
  }
  const role = { ...clone(d), name: d.name.trim(), id: re.id ?? uid('c') };
  role.rules = customBlocks(role);
  delete role.blocks;
  const i = S.customRoles.findIndex((x) => x.id === role.id);
  if (i >= 0) S.customRoles[i] = role; else S.customRoles.push(role);
  registerRoles([role]);
  ui.libSet = 'eigene';
  const from = re.from ?? 'setup'; ui.re = null;
  toast(`„${role.name}“ gespeichert.`);
  go(from); return false;
});
on('re-delete', () => {
  const id = ui.re.id;
  if (isParty()) { S.customParties = (S.customParties ?? []).filter((x) => x.id !== id); delete PM[id]; const from = ui.re.from ?? 'setup'; ui.re = null; go(from); return false; }
  if (isItem()) { S.customItems = (S.customItems ?? []).filter((x) => x.id !== id); const k = ROLES.findIndex((x) => x.id === itemRid(id)); if (k >= 0) ROLES.splice(k, 1); delete RM[itemRid(id)]; const from = ui.re.from ?? 'setup'; ui.re = null; go(from); return false; }
  S.customRoles = S.customRoles.filter((x) => x.id !== id);
  const i = ROLES.findIndex((x) => x.id === id); if (i >= 0) ROLES.splice(i, 1);
  delete RM[id];
  if (S.setup.counts) { delete S.setup.counts[id]; S.setup.counts = fillVillagers(S.setup.counts, presentPlayers(S).length); }
  const from = ui.re.from ?? 'setup'; ui.re = null;
  go(from); return false;
});
