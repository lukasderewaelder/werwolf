// Hintergrundszene: Nacht mit Mond, Sternen und Tannen; Tag mit Sonne und Wolken. Die Themenklasse am body blendet um.
export function buildScene() {
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const stars = Array.from({ length: 46 }, () => `<circle class="star" style="animation-delay:-${(rnd() * 4).toFixed(2)}s" cx="${(rnd() * 400).toFixed(1)}" cy="${(rnd() * 420).toFixed(1)}" r="${(0.6 + rnd() * 1.3).toFixed(1)}" fill="#fff"/>`).join('');
  let pines = 'M0 850 L0 640 ', x = 0;
  while (x < 420) { const w = 20 + rnd() * 26, h = 50 + rnd() * 110, base = 650 + rnd() * 24; pines += `L${x.toFixed(0)} ${base.toFixed(0)} L${(x + w / 2).toFixed(0)} ${(base - h).toFixed(0)} L${(x + w).toFixed(0)} ${base.toFixed(0)} `; x += w * 0.7; }
  pines += 'L420 850 Z';
  const night = `<svg class="s-night" viewBox="0 0 400 850" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080d1c"/><stop offset=".55" stop-color="#14203f"/><stop offset=".85" stop-color="#2a2f55"/><stop offset="1" stop-color="#1a1d38"/></linearGradient>
    <radialGradient id="mg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2cf" stop-opacity=".5"/><stop offset="1" stop-color="#fff2cf" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="850" fill="url(#sky)"/>${stars}
    <circle cx="310" cy="140" r="100" fill="url(#mg)"/><circle cx="310" cy="140" r="38" fill="#f3e6c4"/><circle cx="298" cy="130" r="7" fill="#dccb9e"/><circle cx="322" cy="154" r="5" fill="#dccb9e"/>
    <path d="${pines}" fill="#060914"/>
    <ellipse cx="200" cy="720" rx="260" ry="26" fill="#7fb1ff" opacity=".05"/></svg>`;
  const day = `<svg class="s-day" viewBox="0 0 400 850" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e7c1"/><stop offset=".5" stop-color="#f7ecd2"/><stop offset="1" stop-color="#ecd9ae"/></linearGradient></defs>
    <rect width="400" height="850" fill="url(#dsky)"/>
    <circle cx="320" cy="120" r="70" fill="#f7d98c" opacity=".35"/><circle cx="320" cy="120" r="34" fill="#f2c45a"/>
    <g class="cloud"><ellipse cx="60" cy="210" rx="60" ry="14" fill="#fff" opacity=".7"/><ellipse cx="95" cy="200" rx="34" ry="12" fill="#fff" opacity=".7"/></g>
    <path d="${pines}" fill="#a98a52" opacity=".28" transform="translate(0 20)"/></svg>`;
  document.getElementById('scene').innerHTML = night + day;
}
