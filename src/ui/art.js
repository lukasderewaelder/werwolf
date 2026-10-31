// Gemeinsame Bausteine der Oberfläche: Maskierung, Rollenbilder, Spielersteine.
import { RM, roleShort } from '../engine/roles.js';
import { I } from './icons.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SVG_PORTRAITS = new Set(['judge']);
export const portraitUrl = (id) => `assets/portraits/${id}.${SVG_PORTRAITS.has(id) ? 'svg' : 'webp'}`;
export const roleColor = (id) => RM[id]?.color ?? '#3a4466';

/** Rollenbild mit Farbhintergrund. Ohne Rolle erscheint ein Fragezeichen. */
export function art(roleId, cls = '') {
  if (RM[roleId]?.custom) return `<span class="rbg ${cls}" style="--rc:${roleColor(roleId)}"><span class="q">${esc(RM[roleId].icon || RM[roleId].name.slice(0, 1).toUpperCase())}</span></span>`;
  if (!roleId || !RM[roleId]) return `<span class="rbg ${cls}" style="--rc:#3a4466"><span class="q">?</span></span>`;
  return `<span class="rbg ${cls}" style="--rc:${roleColor(roleId)}"><i class="pimg" style="background-image:url(${portraitUrl(roleId)})"></i></span>`;
}

export const initials = (name) => {
  const p = String(name).trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[1][0] : String(name).trim().slice(0, 2)).toUpperCase();
};

/** Sitzkreis: Positionen in Prozent des quadratischen Tisches, Start oben, im Uhrzeigersinn. */
export function circlePos(i, n) {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  const R = n <= 6 ? 36 : 40;
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
}

/** Steingröße (Prozent der Tischbreite) und Schriftgröße je nach Spielerzahl. */
export function tokenSize(n) {
  if (n <= 6) return { tw: 17, nf: 15 };
  if (n <= 10) return { tw: 14, nf: 14 };
  if (n <= 14) return { tw: 12, nf: 13 };
  if (n <= 20) return { tw: 10, nf: 12 };
  if (n <= 26) return { tw: 8.6, nf: 11 };
  return { tw: 7.6, nf: 10 };
}

export { roleShort, I };
