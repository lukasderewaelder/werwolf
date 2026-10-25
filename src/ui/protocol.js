// Protokoll als Text: Spieler mit Rollen, Ergebnis und Verlauf. Teilen (iPad, Handy) oder als Datei speichern.
import { S, ui, on, toast } from './core.js';
import { alive, roleLabel, CAUSE, clockLabel } from '../engine/game.js';

export function protocolText(g) {
  const stamp = new Date().toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'short' });
  const lines = ['Werwolf-Protokoll', stamp, '', `${g.cfg.players.length} Spieler im Uhrzeigersinn:`];
  g.cfg.players.forEach((p, i) => {
    const fate = alive(g, p.id) ? 'lebt' : `† ${CAUSE[g.dead[p.id].cause] ?? g.dead[p.id].cause} (${g.dead[p.id].at})`;
    lines.push(`${String(i + 1).padStart(2, ' ')}. ${p.name} – ${g.roles[p.id] ? roleLabel(g, p.id) : 'Rolle unbekannt'}${g.captain === p.id ? ', Hauptmann' : ''} – ${fate}`);
  });
  lines.push('', g.winner ? `Ergebnis: Sieg für ${g.winner}` : `Spiel läuft noch (${clockLabel(g)})`, '', 'Verlauf');
  let cur = null;
  for (const l of g.log) {
    if (l.p !== cur) { cur = l.p; lines.push('', cur); }
    lines.push(`  - ${l.t}`);
  }
  return lines.join('\n') + '\n';
}

export function downloadText(name, text) {
  const file = new File([text], name, { type: 'text/plain' });
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const fileName = () => `Werwolf-Protokoll-${new Date().toISOString().slice(0, 10)}.txt`;

on('log-share', async () => {
  const text = protocolText(S.game);
  if (navigator.share) {
    try { await navigator.share({ title: 'Werwolf-Protokoll', text }); return false; } catch (e) { if (e?.name === 'AbortError') return false; }
  }
  downloadText(fileName(), text);
  toast('Als Datei gespeichert (Teilen wird hier nicht unterstützt).');
  return false;
});
on('log-file', () => { downloadText(fileName(), protocolText(S.game)); toast('Protokoll gespeichert.'); return false; });
on('log-copy', async () => {
  try { await navigator.clipboard.writeText(protocolText(S.game)); toast('Protokoll in der Zwischenablage.'); } catch { toast('Kopieren nicht möglich.'); }
  return false;
});
