// Spielansicht: Tisch mit Spielersteinen, Nachtschritte, Tag, Abfragen, Rollenvergabe, Ende.
import { S, ui, views, on, go, dispatch, undo, canUndo, toast, buzz, afterRender, persist, clearUndo } from './core.js';
import { esc, art, I, initials, circlePos, tokenSize, roleShort } from './art.js';
import { RM, CAMP_LABEL, roleName } from '../engine/roles.js';
import {
  alive, nm, isWolf, roleLabel, holders, livingHolders, seatNeighbors, stepContext, nightSteps, unknownPool, livingIds, CAUSE, groupNames, powerOn,
} from '../engine/game.js';
import { sfx } from '../audio.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const showRoles = () => S.settings.showRoles;

/* ---------- Markierungen auf den Spielersteinen ---------- */

function marks(g, c) {
  const m = { pick: new Set(), target: new Set(), safe: new Set(), role: new Set(), dim: new Set() };
  const d = g.draft;
  if (g.phase === 'night' && c) {
    const { step, r, mode } = c;
    if (mode === 'assign' && r) holders(g, r.id).forEach((p) => m.role.add(p.id));
    else if (mode === 'action') {
      switch (step.act) {
        case 'kill': if (d.kill) m.target.add(d.kill); break;
        case 'check': if (d.check) m.pick.add(d.check); break;
        case 'witch': [d.kill, d.bigkill].filter(Boolean).forEach((x) => m.target.add(x)); if (d.heal) { m.target.delete(d.heal); m.safe.add(d.heal); } if (d.poison) m.target.add(d.poison); break;
        case 'lovers': d.lovers.forEach((x) => m.pick.add(x)); break;
        case 'protect': if (d.protect) m.safe.add(d.protect); if (g.lastProtect) m.dim.add(g.lastProtect); break;
        case 'bigkill': if (d.kill) m.target.add(d.kill); if (d.bigkill) m.target.add(d.bigkill); break;
        case 'whitekill': if (d.whitekill) m.target.add(d.whitekill); break;
        case 'model': if (d.model) m.pick.add(d.model); break;
        case 'fox': if (d.fox) [d.fox, ...seatNeighbors(g, d.fox)].forEach((x) => m.pick.add(x)); break;
        case 'mark': if (d.mark) m.pick.add(d.mark); break;
        case 'enchant': d.enchant.forEach((x) => m.pick.add(x)); Object.keys(g.enchanted).forEach((x) => m.dim.add(x)); break;
        default: break;
      }
    }
  } else if (g.phase === 'day' || g.phase === 'interrupt') {
    if (d.vote) m.target.add(d.vote);
    if (g.captain) m.role.add(g.captain);
    const it = g.interrupts[0];
    if (it?.type === 'scapegoat') it.picks.forEach((x) => m.pick.add(x));
    if (it && ['hunter', 'captain', 'scapegoat'].includes(it.type)) m.dim.add(it.id);
  }
  return m;
}

function tokHtml(g, p, i, n, mk, mode) {
  const dead = !alive(g, p.id);
  const rid = g.roles[p.id];
  const known = showRoles() && rid;
  const cls = ['tok', dead && 'dead', mk.role.has(p.id) && 'is-role', mk.pick.has(p.id) && 'is-pick', mk.target.has(p.id) && 'is-target', mk.safe.has(p.id) && 'is-safe', mk.dim.has(p.id) && 'is-dim'].filter(Boolean).join(' ');
  const b = [];
  if (g.captain === p.id) b.push(`<span class="bdg gold" title="Hauptmann">${I.crown}</span>`);
  if (g.lovers.includes(p.id)) b.push(`<span class="bdg red" title="Verliebt">${I.heart}</span>`);
  if (g.enchanted[p.id]) b.push(`<span class="bdg blue" title="Verzaubert">${I.flute}</span>`);
  if (known && !dead && isWolf(g, p.id) && n <= 20) b.push(`<span class="bdg red" title="Werwolf">${I.wolf}</span>`);
  if (g.idiotRevealed && rid === 'idiot') b.push(`<span class="bdg gold" title="Ohne Stimmrecht">${I.minus}</span>`);
  if (g.groups[p.id] && showRoles() && n <= 24) b.push(`<span class="bdg">${g.groups[p.id] === 'A' ? '1' : '2'}</span>`);
  const ava = known ? art(rid) : `<span>${esc(initials(p.name))}</span>`;
  const label = known && n <= 16 ? `<span class="rl">${esc(roleShort(rid))}</span>` : '';
  const style = mode === 'circle' ? (() => { const { x, y } = circlePos(i, n); const { tw, nf } = tokenSize(n); return ` style="left:${x}%;top:${y}%;--tw:${tw};--nf:${nf}px"`; })() : '';
  return `<button class="${cls}" data-action="tap" data-pid="${p.id}"${style} aria-label="${esc(p.name)}"><span class="ava">${ava}<span class="skull">${I.skull}</span></span>${b.length ? `<span class="badges">${b.join('')}</span>` : ''}<span class="nm">${esc(p.name)}</span>${label}</button>`;
}

function tableHtml(g, c) {
  const ps = g.cfg.players, n = ps.length, mk = marks(g, c);
  const day = g.clock === 'day';
  const mid = `<div class="table-mid">${day ? I.sun : I.moon}<div class="big">${day ? `Tag ${g.day}` : `Nacht ${g.night}`}</div><div class="sub">${livingIds(g).length} von ${n} am Leben</div></div>`;
  return `<div class="table-box"><div class="table"><div class="ring"></div>${mid}${ps.map((p, i) => tokHtml(g, p, i, n, mk, 'circle')).join('')}</div></div>
    <div class="pgrid" data-keep="pgrid">${ps.map((p, i) => tokHtml(g, p, i, n, mk, 'grid')).join('')}</div>`;
}

on('tap', (el) => { buzz(10); dispatch({ t: 'tap', pid: el.dataset.pid }); return false; });

/* ---------- Kopfleiste ---------- */

function header(g, title, sub) {
  return `<header class="bar"><button class="ibtn" data-action="back-home" aria-label="Startseite">${I.home}</button>
    <div class="grow"><h1>${esc(title)}</h1><small>${esc(sub)}</small></div>
    <button class="ibtn" data-action="undo" aria-label="Rückgängig" ${canUndo() ? '' : 'disabled'}>${I.undo}</button>
    <button class="ibtn ${S.settings.music && S.settings.sound ? 'on' : ''}" data-action="toggle-music" aria-label="Musik an oder aus">${I.note}</button>
    <button class="ibtn ${showRoles() ? 'on' : ''}" data-action="toggle-roles" aria-label="Rollen zeigen">${I.eye}</button>
    <button class="ibtn" data-action="open-menu" aria-label="Menü">${I.menu}</button></header>`;
}
on('undo', () => { undo(); return false; });
on('toggle-roles', () => { S.settings.showRoles = !S.settings.showRoles; });
on('toggle-music', () => { const on = S.settings.music && S.settings.sound; S.settings.sound = true; S.settings.music = !on; toast(on ? 'Musik aus' : 'Musik an'); });
on('open-menu', () => { ui.modal = { type: 'menu' }; });

/* ---------- Nacht ---------- */

const seenText = (g, id) => {
  const rid = g.roles[id];
  if (!rid) return null;
  if (g.cfg.rules.seerSees === 'camp') return isWolf(g, id) ? 'Werwolf (Wolfsseite)' : RM[rid].camp === 'solo' ? 'Einzelgänger' : 'Dorfseite';
  return `${roleLabel(g, id)}${isWolf(g, id) ? ' – gehört zu den Wölfen!' : ''}`;
};

function taskBox(g, c) {
  const d = g.draft, { step, r, mode } = c;
  let prompt = '', cls = '', extra = '';
  const acts = (html) => `<div class="acts">${html}</div>`;
  const abtn = (action, label, { on: o = false, cls: k = '', attrs = '', icon = '' } = {}) => `<button class="btn ${o ? 'on' : ''} ${k}" data-action="${action}" ${attrs}>${icon}<span>${label}</span></button>`;
  if (step.info) prompt = step.key === 'lovers' && d.lovers.length === 2 ? `Verliebte: ${nm(g, d.lovers[0])} & ${nm(g, d.lovers[1])}` : 'Nur ansagen – keine Eingabe nötig.';
  else if (step.gone) { prompt = `${r.name} ist nicht mehr im Spiel – zum Schein kurz aufrufen, dann weiter.`; cls = 'warn'; }
  else if (mode === 'assign') {
    const rem = Math.max(0, c.need - c.have);
    prompt = rem > 0 ? `Wer ist ${r.name}? Tippe ${rem === 1 ? 'die Person' : `${rem} Personen`} im Kreis an (${c.have}/${c.need}).` : `${r.name} zugeordnet (${c.have}/${c.need}). Antippen ändert die Zuordnung.`;
    if (rem > 0 && g.cfg.counts.thief) prompt += ' Niemand wach? Dann liegt die Karte in der Mitte: Weiter.';
    cls = rem > 0 ? '' : 'ok';
  } else if (mode === 'info') {
    prompt = r && r.group ? `Erwachen gemeinsam: ${holders(g, r.id).map((x) => x.name).join(', ') || '–'}` : r?.night ? 'Nur aufrufen, keine Eingabe nötig.' : 'Keine Nachtaktion.';
  } else {
    switch (step.act) {
      case 'kill': {
        const quiet = g.cfg.rules.noVictimsNight1 && g.night === 1;
        prompt = quiet ? 'Hausregel: In der ersten Nacht stirbt niemand. Die Wölfe wachen nur auf.' : d.kill ? `Opfer der Werwölfe: ${nm(g, d.kill)}${d.girlCaught ? ' (Kleines Mädchen erwischt)' : ''}` : 'Wen fressen die Werwölfe? Opfer im Kreis antippen.';
        cls = d.kill || quiet ? 'ok' : '';
        const girl = livingHolders(g, 'girl')[0];
        if (girl && powerOn(g, 'girl') && !quiet) extra = acts(abtn('girl-caught', 'Kleines Mädchen erwischt!', { on: d.girlCaught, icon: I.peek }));
        break;
      }
      case 'actor':
        prompt = d.actorRole ? `Der Gaukler spielt bis zur nächsten Nacht: ${roleName(d.actorRole)}` : `Welche Rolle wählt der Gaukler? (noch ${g.actorPool.length} in der Mitte)`;
        cls = d.actorRole ? 'ok' : '';
        extra = acts(g.actorPool.map((x) => abtn('actor-role', esc(roleName(x)), { on: d.actorRole === x, attrs: `data-role="${x}"` })).join(''));
        break;
      case 'seance':
        prompt = d.seance === true ? 'Morgen findet eine Geisterbeschwörung statt.' : d.seance === false ? 'Keine Beschwörung morgen.' : 'Soll morgen eine Geisterbeschwörung stattfinden?';
        cls = d.seance == null ? '' : 'ok';
        extra = acts(abtn('seance', 'Ja', { on: d.seance === true, attrs: 'data-v="1"' }) + abtn('seance', 'Nein', { on: d.seance === false, attrs: 'data-v="0"' }));
        break;
      case 'check': {
        if (!d.check) prompt = 'Wen prüft die Seherin? Person antippen.';
        else prompt = seenText(g, d.check) ? `${nm(g, d.check)}: ${seenText(g, d.check)}` : `${nm(g, d.check)}: Rolle noch nicht erfasst. Zeig der Seherin die Karte.`;
        cls = d.check ? 'ok' : '';
        break;
      }
      case 'witch': {
        const w = livingHolders(g, 'witch')[0];
        const victims = [d.kill, d.bigkill].filter(Boolean).map((x) => nm(g, x));
        const quiet = g.cfg.rules.noVictimsNight1 && g.night === 1;
        if (g.poisonMode) { prompt = 'Gifttrank: Tippe die Person an, die vergiftet wird.'; cls = 'warn'; }
        else prompt = quiet ? 'Hausregel: In der ersten Nacht stirbt niemand. Die Hexe wacht nur auf.' : `Opfer der Nacht: ${victims.length ? victims.join(' & ') : 'niemand'}${d.heal ? ` · ${nm(g, d.heal)} wird geheilt` : ''}${d.poison ? ` · Gift: ${nm(g, d.poison)}` : ''}`;
        extra = acts(
          abtn('witch-heal', g.potions.heal ? 'Heiltrank leer' : d.heal ? `${esc(nm(g, d.heal))} geheilt` : d.kill ? `${esc(nm(g, d.kill))} heilen` : 'Kein Opfer zum Heilen', { cls: d.heal ? 'good' : '', icon: I.heal, attrs: `${g.potions.heal || !d.kill || !w || quiet ? 'disabled' : ''}` })
          + abtn('witch-poison', g.potions.poison ? 'Gifttrank leer' : d.poison ? `Gift: ${esc(nm(g, d.poison))}` : g.poisonMode ? 'Ziel antippen …' : 'Gifttrank einsetzen', { cls: g.poisonMode || d.poison ? 'bad' : '', icon: I.poison, attrs: `${g.potions.poison || !w || quiet ? 'disabled' : ''}` }));
        break;
      }
      case 'lovers': prompt = d.lovers.length === 2 ? `Liebespaar: ${nm(g, d.lovers[0])} & ${nm(g, d.lovers[1])}` : `Tippe 2 Verliebte an (${d.lovers.length}/2).`; cls = d.lovers.length === 2 ? 'ok' : ''; break;
      case 'swap': {
        const opts = g.cfg.mode === 'digital' ? [...new Set(g.middle)] : Object.keys(g.cfg.counts).filter((x) => x !== 'thief' && RM[x]);
        const mustWolf = g.cfg.mode === 'digital' && g.middle.length === 2 && g.middle.every((x) => RM[x]?.camp === 'wolf');
        prompt = d.thiefRole ? `Der Dieb ist jetzt: ${roleName(d.thiefRole)}` : g.cfg.mode === 'digital' ? `In der Mitte: ${g.middle.map(roleName).join(' & ')}. ${mustWolf ? 'Er MUSS einen Werwolf nehmen.' : 'Nimmt er eine Karte? Sonst weiter.'}` : 'Welche Karte nimmt der Dieb? Keine? Dann weiter.';
        cls = d.thiefRole ? 'ok' : '';
        extra = acts(opts.map((x) => abtn('thief-role', esc(roleName(x)), { on: d.thiefRole === x, attrs: `data-role="${x}"` })).join(''));
        break;
      }
      case 'protect': prompt = d.protect ? `Beschützt: ${nm(g, d.protect)}` : `Wen beschützt der Heiler?${g.lastProtect ? ` (nicht erneut ${nm(g, g.lastProtect)})` : ''}`; cls = d.protect ? 'ok' : ''; break;
      case 'infect':
        prompt = !d.kill ? 'Erst muss ein Wolfsopfer gewählt sein (Schritt Werwölfe).' : d.infect ? `${nm(g, d.kill)} wird infiziert und zum Werwolf.` : `Opfer ${nm(g, d.kill)} infizieren? (einmal pro Spiel)`;
        extra = acts(abtn('infect', d.infect ? 'Infektion aktiv' : 'Opfer infizieren', { on: d.infect, icon: I.wolf, attrs: !d.kill ? 'disabled' : '' }));
        break;
      case 'bigkill': prompt = d.bigkill ? `Zweites Opfer: ${nm(g, d.bigkill)}` : 'Zweites Opfer des Großen bösen Wolfs antippen (optional).'; break;
      case 'whitekill': prompt = d.whitekill ? `Weißer Werwolf tötet: ${nm(g, d.whitekill)}` : 'Welchen Werwolf tötet er? (optional, nur Wölfe antippbar)'; break;
      case 'model': prompt = d.model ? `Vorbild: ${nm(g, d.model)}` : 'Wen wählt das Wilde Kind als Vorbild?'; cls = d.model ? 'ok' : ''; break;
      case 'side':
        prompt = d.side ? `Wolfshund gehört zu: ${d.side === 'wolf' ? 'den Werwölfen' : 'dem Dorf'}` : 'Auf welche Seite schlägt sich der Wolfshund?';
        extra = acts(abtn('wolfdog', 'Dorf', { on: d.side === 'village', icon: I.house, attrs: 'data-side="village"' }) + abtn('wolfdog', 'Werwölfe', { on: d.side === 'wolf', icon: I.wolf, attrs: 'data-side="wolf"' }));
        break;
      case 'fox':
        if (d.fox) {
          const grp = [d.fox, ...seatNeighbors(g, d.fox)], hit = grp.some((id) => isWolf(g, id));
          prompt = hit ? `JA: Unter ${grp.map((x) => nm(g, x)).join(', ')} ist ein Werwolf (nicken).` : 'NEIN: Kein Werwolf dabei. Der Fuchs verliert seine Gabe (Kopf schütteln).';
          cls = 'ok';
        } else prompt = 'Der Fuchs zeigt auf die Mitte einer Dreiergruppe. Person antippen.';
        break;
      case 'mark': prompt = d.mark ? `Belastet: ${nm(g, d.mark)} (zwei Stimmen mehr)` : 'Wen belastet der Rabe? (optional)'; break;
      case 'enchant': prompt = `Tippe 2 Personen zum Verzaubern an (${d.enchant.length}/2).`; cls = d.enchant.length === 2 ? 'ok' : ''; break;
      default: break;
    }
  }
  const seg = (g.cfg.mode === 'cards' && g.night === 1 && step.act && r) ? `<div class="seg"><button class="${mode === 'assign' ? 'on' : ''}" data-action="assign-mode" data-mode="assign">1 · Wer? (${c.have}/${c.need})</button><button class="${mode === 'action' ? 'on' : ''}" data-action="assign-mode" data-mode="action" ${c.have === 0 ? 'disabled' : ''}>2 · Aktion</button></div>` : '';
  return `<div class="task ${cls}">${seg}<div class="prompt">${cls === 'ok' ? I.check : I.right}<span>${esc(prompt)}</span></div>${extra}</div>`;
}

on('assign-mode', (el) => dispatch({ t: 'assign-mode', mode: el.dataset.mode }, { undoable: false }) || false);
on('girl-caught', () => { dispatch({ t: 'girl-caught' }); return false; });
on('actor-role', (el) => { dispatch({ t: 'actor-role', role: el.dataset.role }); return false; });
on('thief-role', (el) => { dispatch({ t: 'thief-role', role: el.dataset.role }); return false; });
on('seance', (el) => { dispatch({ t: 'seance', v: el.dataset.v === '1' }); return false; });
on('witch-heal', () => { dispatch({ t: 'witch-heal' }); return false; });
on('witch-poison', () => { dispatch({ t: 'witch-poison' }); return false; });
on('infect', () => { dispatch({ t: 'infect' }); return false; });
on('wolfdog', (el) => { dispatch({ t: 'wolfdog', side: el.dataset.side }); return false; });
on('step-next', () => {
  const g = S.game, c = stepContext(g);
  const wasLast = c && c.idx >= c.steps.length - 1;
  if (c && c.step.key === 'wolf') sfx('howl');
  buzz(12); dispatch({ t: 'next' });
  if (wasLast) sfx('rooster');
  return false;
});
on('step-prev', () => { dispatch({ t: 'prev' }, { undoable: false }); return false; });
on('step-goto', (el) => { dispatch({ t: 'goto', idx: +el.dataset.idx }, { undoable: false }); return false; });

function nightPanel(g, c) {
  if (!c) return `<div class="card"><p>Keine Rollen in dieser Nacht. Weiter zum Morgen.</p></div>`;
  const { step, r, steps, idx } = c;
  const strip = steps.map((s, i) => `<button class="sdot ${i === idx ? 'cur' : i < idx ? 'done' : ''} ${s.gone ? 'gone' : ''}" data-action="step-goto" data-idx="${i}">${s.role ? art(s.role) : ''}${esc(s.label)}</button>`).join('');
  const rolebox = r ? `<div class="rolebox">${art(r.id)}<div class="t"><span class="camp ${r.camp}">${CAMP_LABEL[r.camp]}</span><h2>${esc(step.label)}</h2><div class="muted" style="font-size:13px">${esc(r.sub)}</div></div></div>`
    : `<div class="rolebox"><div class="t"><h2>${esc(step.label)}</h2></div></div>`;
  const say = step.say ? `<div class="say">${esc(step.say)}</div>` : '';
  const last = idx >= steps.length - 1;
  const body = `<div class="stepstrip" data-keep="strip">${strip}</div><div class="card col">${rolebox}${say}</div>${taskBox(g, c)}`;
  const foot = `<div class="side-foot"><button class="btn" data-action="step-prev" ${idx === 0 ? 'disabled' : ''} aria-label="Zurück">${I.left}</button><button class="btn primary" data-action="step-next"><span>${last ? 'Morgen anbrechen lassen' : 'Weiter'}</span>${last ? I.sun : I.right}</button></div>`;
  return `<div class="side"><div class="side-scroll" data-keep="side">${body}</div>${foot}</div>`;
}

/* ---------- Tag ---------- */

const causeText = (g, id) => {
  const c = g.dead[id]?.cause;
  if (g.cfg.rules.hideWolfdogSide && ['wolfdog'].includes(g.roles[id])) return CAUSE[c] ?? c;
  return CAUSE[c] ?? c;
};

function roleOnDeath(g, id) {
  const rid = g.roles[id];
  if (!rid) return 'Rolle noch unbekannt';
  if (g.cfg.rules.hideWolfdogSide && (rid === 'wolfdog' || (rid === 'wildchild' && g.turned[id]))) return roleName(rid);
  return roleLabel(g, id);
}

function morningCard(g) {
  const dead = g.lastDeaths;
  const list = dead.length ? `<div class="deaths">${dead.map((id) => `<div class="death">${art(g.roles[id])}<div><b>${esc(nm(g, id))}</b><small>${esc(roleOnDeath(g, id))} · ${esc(causeText(g, id))}</small></div></div>`).join('')}</div>`
    : `<p>Niemand ist in dieser Nacht gestorben.</p>`;
  const notes = g.morning.length ? `<ul class="notes">${g.morning.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '';
  return `<div class="card col"><div class="eyebrow">Das Dorf erwacht</div>${list}${notes}</div>`;
}

function timerCard() {
  const t = ui.timer;
  return `<div class="card timer"><span class="t ${t.left === 0 ? 'alarm' : ''}" id="timer-val">${fmt(t.left)}</span><span class="spacer"></span>
    <button class="ibtn ${t.running ? 'on' : ''}" data-action="timer-toggle" aria-label="Start oder Pause">${t.running ? I.pause : I.play}</button>
    <button class="ibtn" data-action="timer-reset" aria-label="Zurücksetzen">${I.reset}</button>
    <button class="btn sm" data-action="timer-preset">${S.settings.timer / 60} min</button></div>`;
}

function dayPanel(g) {
  const d = g.draft;
  const judge = livingHolders(g, 'judge')[0];
  const sg = livingHolders(g, 'scapegoat')[0];
  let body = '';
  if (g.day === 0) body += `<div class="card col"><div class="eyebrow">Tag 0</div><p>Der Engel ist im Spiel: Die Partie beginnt mit einer Abstimmung, noch vor der ersten Nacht. Erinnere die Runde ruhig an die mögliche Anwesenheit des Engels.</p></div>`;
  else if (!ui.hideMorning) body += morningCard(g);
  if (g.dayMode === 'captain') {
    body += `<div class="task"><div class="prompt">${I.crown}<span>Hauptmann wählen: Tippe die gewählte Person im Kreis an. Seine Stimme zählt doppelt.</span></div><div class="acts"><button class="btn" data-action="skip-captain">Ohne Hauptmann weiter</button></div></div>`;
  } else {
    if (g.secondVote) body += `<div class="task warn"><div class="prompt">${I.scale}<span>Zweite Abstimmung des Stotternden Richters: direkt, ohne weitere Diskussion.</span></div></div>`;
    else body += timerCard();
    if (g.voters && g.votersDay === g.day) body += `<div class="task warn"><div class="prompt">${I.horns}<span>Nur diese Personen dürfen abstimmen: ${esc(g.voters.map((x) => nm(g, x)).join(', ') || 'niemand')}</span></div></div>`;
    if (g.idiotRevealed) body += `<div class="hint">${I.jester}<span>Der Dorfdepp ist aufgedeckt und darf nicht mehr abstimmen.</span></div>`;
    const v = d.vote;
    body += `<div class="card vote-card"><div class="eyebrow">Abstimmung</div>
      <div class="pickname">${v ? esc(nm(g, v)) : '<span class="muted">Person im Kreis antippen</span>'}</div>
      <div class="acts"><button class="btn primary" data-action="day-execute" ${v ? '' : 'disabled'}>${I.gavel}<span>Hinrichten</span></button></div>
      <div class="acts"><button class="btn" data-action="day-tie" ${sg ? '' : ''}>${I.scale}<span>Gleichstand${sg ? ' (Sündenbock)' : ''}</span></button><button class="btn" data-action="day-none">${I.close}<span>Niemand</span></button></div>
      ${judge && !g.judgeUsed ? `<button class="btn ${g.judgeArmed ? 'on' : ''}" data-action="judge-sign">${I.scale}<span>${g.judgeArmed ? 'Richter-Zeichen gegeben: zweite Abstimmung folgt' : 'Richter-Zeichen erhalten'}</span></button>` : ''}</div>`;
    if (g.captain) body += `<div class="hint">${I.crown}<span>Hauptmann: <b>${esc(nm(g, g.captain))}</b>. Seine Stimme zählt doppelt.</span></div>`;
  }
  return `<div class="side"><div class="side-scroll" data-keep="side">${body}</div></div>`;
}

on('day-execute', () => { buzz(30); dispatch({ t: 'day-execute' }); sfx('gong'); return false; });
on('day-tie', () => { dispatch({ t: 'day-tie' }); return false; });
on('day-none', () => { dispatch({ t: 'day-none' }); return false; });
on('judge-sign', () => { dispatch({ t: 'judge-sign' }); return false; });
on('skip-captain', () => { dispatch({ t: 'skip-captain' }); return false; });

on('timer-toggle', () => {
  const t = ui.timer;
  if (t.running) stopTimer();
  else { if (t.left === 0) t.left = S.settings.timer; t.running = true; t.endAt = Date.now() + t.left * 1000; clearInterval(t.h); t.h = setInterval(tick, 250); }
});
on('timer-reset', () => { stopTimer(); ui.timer.left = S.settings.timer; });
on('timer-preset', () => { const P = [60, 120, 180, 300, 600]; S.settings.timer = P[(P.indexOf(S.settings.timer) + 1) % P.length]; stopTimer(); ui.timer.left = S.settings.timer; });
export function stopTimer() { ui.timer.running = false; clearInterval(ui.timer.h); }
function tick() {
  const t = ui.timer;
  t.left = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
  const el = document.getElementById('timer-val');
  if (el) { el.textContent = fmt(t.left); el.classList.toggle('alarm', t.left === 0); }
  if (t.left === 0) { stopTimer(); buzz([200, 100, 200, 100, 400]); sfx('bell'); import('./core.js').then((m) => m.render()); }
}

/* ---------- Abfragen (Jäger, Hauptmann, Sündenbock, Magd, Kartenaufdeckung) ---------- */

function interruptPanel(g) {
  const it = g.interrupts[0];
  if (!it) return '';
  let body = '';
  if (it.type === 'reveal') {
    const pool = unknownPool(g);
    body = `<div class="task"><div class="prompt">${I.eye}<span>Welche Karte hatte ${esc(nm(g, it.id))}? Tippe die aufgedeckte Rolle an.</span></div></div>
      <div class="ov-grid">${pool.map((id) => `<button class="ov" data-action="reveal" data-role="${id}">${art(id)}<b>${esc(RM[id].name)}</b></button>`).join('')}</div>`;
  } else if (it.type === 'hunter') {
    body = `<div class="task warn"><div class="prompt">${I.target}<span>Jäger ${esc(nm(g, it.id))} ist tot und schießt noch einmal. Tippe sein Ziel im Kreis an.</span></div><div class="acts"><button class="btn" data-action="interrupt-skip">Er schießt niemanden</button></div></div>`;
  } else if (it.type === 'captain') {
    body = `<div class="task warn"><div class="prompt">${I.crown}<span>Hauptmann ${esc(nm(g, it.id))} ist tot und ernennt seinen Nachfolger. Tippe die Person an.</span></div><div class="acts"><button class="btn" data-action="interrupt-skip">Kein Nachfolger</button></div></div>`;
  } else if (it.type === 'scapegoat') {
    body = `<div class="task warn"><div class="prompt">${I.horns}<span>Sündenbock ${esc(nm(g, it.id))} bestimmt, wer am ${it.forDay === g.day ? 'heutigen' : 'nächsten'} Tag abstimmen darf. Tippe diese Personen an (${it.picks.length} gewählt).</span></div>
      <div class="acts"><button class="btn primary" data-action="scapegoat-done">${I.check}<span>Bestätigen</span></button><button class="btn" data-action="interrupt-skip">Alle dürfen abstimmen</button></div></div>`;
  } else if (it.type === 'maid') {
    body = `<div class="task warn"><div class="prompt">${I.broom}<span>${esc(nm(g, it.victim))} wird hingerichtet. Möchte die Ergebene Magd (${esc(nm(g, it.id))}) die Karte übernehmen, bevor sie aufgedeckt wird?</span></div>
      <div class="acts"><button class="btn primary" data-action="maid-take">Ja, Rolle übernehmen</button><button class="btn" data-action="interrupt-skip">Nein</button></div></div>`;
  }
  return `<div class="side"><div class="side-scroll" data-keep="side">${body}</div></div>`;
}
on('reveal', (el) => { dispatch({ t: 'reveal', role: el.dataset.role }); return false; });
on('interrupt-skip', () => { dispatch({ t: 'interrupt-skip' }); return false; });
on('scapegoat-done', () => { dispatch({ t: 'scapegoat-done' }); return false; });
on('maid-take', () => { dispatch({ t: 'maid-take' }); return false; });

/* ---------- Rollen zeigen (ohne Karten) ---------- */

function dealView(g) {
  const ps = g.cfg.players, i = g.dealIdx, p = ps[i], rid = g.roles[p.id], r = RM[rid];
  const total = ps.length;
  const card = g.dealShown
    ? `<div class="dealcard face" style="--rc:${r.color}"><div class="who">${esc(p.name)}</div>${art(rid)}<h2>${esc(r.name)}</h2><span class="camp ${r.camp}">${CAMP_LABEL[r.camp]}</span><p>${esc(r.sub)}</p></div>`
    : `<div class="dealcard back"><div class="who">Karte für</div><h2>${esc(p.name)}</h2><p>Gib das Gerät an ${esc(p.name)}. Alle anderen schauen weg.</p></div>`;
  const btn = g.dealShown
    ? `<button class="btn primary" data-action="deal-next"><span>${i + 1 >= total ? 'Alle haben ihre Rolle – Spiel beginnt' : 'Verdecken und weiter'}</span>${I.right}</button>`
    : `<button class="btn primary" data-action="deal-show">${I.eye}<span>Karte ansehen</span></button>`;
  return `<div class="view"><header class="bar"><button class="ibtn" data-action="back-home" aria-label="Startseite">${I.home}</button><div class="grow"><h1>Rollen verteilen</h1><small>${i + 1} von ${total}</small></div></header>
    <div class="deal">${card}${btn}</div></div>`;
}
on('deal-show', () => { dispatch({ t: 'deal-show' }, { undoable: false }); return false; });
on('deal-next', () => { dispatch({ t: 'deal-next' }, { undoable: false }); return false; });

/* ---------- Ende ---------- */

function endView(g) {
  const rows = g.cfg.players.map((p) => `<div class="death">${art(g.roles[p.id])}<div><b>${esc(p.name)}</b><small>${esc(roleLabel(g, p.id))} · ${alive(g, p.id) ? 'überlebt' : esc(CAUSE[g.dead[p.id].cause] ?? g.dead[p.id].cause)}</small></div></div>`).join('');
  return `<div class="view">${header(g, 'Spielende', `Nach ${g.night} Nächten`)}
    <div class="page"><div class="card col" style="text-align:center;padding:22px"><div class="eyebrow">Sieg</div><h1 style="font-family:var(--serif);font-size:clamp(30px,6vw,52px);line-height:1.05">${esc(g.winner)}</h1></div>
    <div class="deaths scroll" style="flex:1;min-height:0" data-keep="end">${rows}</div>
    <div class="foot"><button class="btn" data-action="show-log">${I.list}<span>Protokoll</span></button><button class="btn" data-action="again">${I.dice}<span>Neue Rollen, gleiche Runde</span></button><button class="btn primary" data-action="new-game">${I.moon}<span>Neues Spiel</span></button></div></div></div>`;
}
on('show-log', () => { ui.modal = { type: 'log' }; });
on('again', () => { S.setup.counts = null; S.setup.step = 2; ui.modal = null; go('setup'); return false; });

/* ---------- Gesamtansicht ---------- */

views.game = () => {
  const g = S.game;
  if (!g) return views.home();
  if (g.cfg.mode === 'digital' && g.dealIdx < g.cfg.players.length) return dealView(g);
  if (g.phase === 'ended') {
    if (!S.lastResult || S.lastResult.at !== g.log.length) S.lastResult = { winner: g.winner, at: g.log.length };
    return endView(g);
  }
  const day = g.clock === 'day';
  const c = g.phase === 'night' ? stepContext(g) : null;
  const title = g.day === 0 && day ? 'Tag 0' : day ? `Tag ${g.day}` : `Nacht ${g.night}`;
  const sub = g.phase === 'night' && c ? `Schritt ${c.idx + 1} von ${c.steps.length}` : g.phase === 'interrupt' ? 'Entscheidung nötig' : `${livingIds(g).length} am Leben`;
  const panel = g.phase === 'night' ? nightPanel(g, c) : g.phase === 'interrupt' ? interruptPanel(g) : dayPanel(g);
  const tonight = g.phase === 'day' && g.dayMode !== 'captain' && !g.secondVote ? '' : '';
  return `<div class="view">${header(g, title, sub)}<div class="game"><div class="table-wrap">${tableHtml(g, c)}</div>${panel}${tonight}</div></div>`;
};

on('start-night-ack', () => { ui.hideMorning = false; });

/* Bildschirm wach halten, solange ein Spiel angezeigt wird */
let wl = null;
async function applyWakeLock() {
  const want = S.settings.wakeLock && ui.view === 'game' && document.visibilityState === 'visible';
  try {
    if (want && !wl && 'wakeLock' in navigator) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    else if (!want && wl) { await wl.release(); wl = null; }
  } catch { wl = null; }
}
afterRender.push(applyWakeLock);
document.addEventListener('visibilitychange', () => { applyWakeLock(); if (document.visibilityState === 'visible' && ui.timer.running) tick(); });
