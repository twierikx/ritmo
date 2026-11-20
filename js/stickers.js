// Week stickers: twelve die-cut designs and the moment you earn one.
import { esc, beep, buzz, reducedMotion } from './ui.js';

const C = {
  fuchsia: '#E23E78', tangerine: '#FF8838', sun: '#FFC83D', mint: '#22BF9A',
  plum: '#3A2152', lilac: '#8F7BF2', coral: '#FF6B5E', sky: '#3BA8F0', white: '#FFFFFF',
};

// word: Spanish cheer (no inverted marks). shape: outline. fill / ink: colours. mark: small motif.
const DESIGNS = [
  { word: 'Vamos!', shape: 'burst', fill: C.fuchsia, ink: C.white, mark: 'bolt', accent: C.sun },
  { word: 'Olé!', shape: 'scallop', fill: C.tangerine, ink: C.plum, mark: 'star', accent: C.white },
  { word: 'Fuerte!', shape: 'shield', fill: C.mint, ink: C.plum, mark: 'heart', accent: C.white },
  { word: 'Brava!', shape: 'star', fill: C.sun, ink: C.plum, mark: 'none', accent: C.fuchsia },
  { word: 'Qué ritmo!', shape: 'wave', fill: C.lilac, ink: C.white, mark: 'note', accent: C.sun },
  { word: 'Imparable!', shape: 'bolt', fill: C.coral, ink: C.white, mark: 'none', accent: C.sun },
  { word: 'Así se hace!', shape: 'flower', fill: C.sky, ink: C.white, mark: 'none', accent: C.sun },
  { word: 'Bien hecho!', shape: 'blob', fill: C.mint, ink: C.plum, mark: 'check', accent: C.white },
  { word: 'Increíble!', shape: 'sun', fill: C.sun, ink: C.plum, mark: 'none', accent: C.tangerine },
  { word: 'A tope!', shape: 'heart', fill: C.fuchsia, ink: C.white, mark: 'none', accent: C.sun },
  { word: 'Campeona!', shape: 'medal', fill: C.lilac, ink: C.white, mark: 'star', accent: C.sun },
  { word: 'Lo lograste!', shape: 'mountain', fill: C.tangerine, ink: C.white, mark: 'none', accent: C.plum },
];
export const STICKER_COUNT = DESIGNS.length;

const r2 = (n) => Math.round(n * 100) / 100;
function polar(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function starPath(n, rOut, rIn, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    pts.push(polar(100, 100, r, rot + (i * Math.PI) / n));
  }
  return `M${pts.map((p) => p.map(r2).join(' ')).join('L')}Z`;
}
function scallopPath(n, r, bump) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2; const a1 = ((i + 1) / n) * Math.PI * 2; const am = (a0 + a1) / 2;
    const [x0, y0] = polar(100, 100, r, a0); const [x1, y1] = polar(100, 100, r, a1); const [xm, ym] = polar(100, 100, r + bump, am);
    d += `${i ? '' : `M${r2(x0)} ${r2(y0)}`}Q${r2(xm)} ${r2(ym)} ${r2(x1)} ${r2(y1)}`;
  }
  return `${d}Z`;
}
function flowerPath(petals, r, pr) {
  let d = '';
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const [x, y] = polar(100, 100, r, a);
    d += `M${r2(x + pr)} ${r2(y)}a${pr} ${pr} 0 1 0 ${-2 * pr} 0a${pr} ${pr} 0 1 0 ${2 * pr} 0`;
  }
  return `${d}M150 100a50 50 0 1 0-100 0a50 50 0 1 0 100 0`;
}

const SHAPES = {
  burst: () => starPath(14, 92, 74),
  scallop: () => scallopPath(12, 80, 14),
  shield: () => 'M100 12 L170 34 Q174 112 100 188 Q26 112 30 34 Z',
  star: () => starPath(5, 96, 52, -Math.PI / 2),
  wave: () => scallopPath(18, 84, 8),
  bolt: () => 'M30 40 Q30 20 52 20 L148 20 Q170 20 170 42 L170 140 Q170 162 148 162 L100 162 L74 188 L74 162 L52 162 Q30 162 30 140 Z',
  flower: () => flowerPath(8, 52, 34),
  blob: () => 'M104 14 C150 12 186 46 184 96 C182 146 150 186 98 186 C46 186 14 150 16 100 C18 48 58 16 104 14 Z',
  sun: () => starPath(16, 94, 78),
  heart: () => 'M100 182 C40 140 12 104 16 66 C20 32 48 16 74 18 C88 19 96 28 100 38 C104 28 112 19 126 18 C152 16 180 32 184 66 C188 104 160 140 100 182 Z',
  medal: () => 'M100 22 A72 72 0 1 1 99.9 22 Z',
  mountain: () => 'M18 160 L78 52 L102 92 L124 62 L184 160 Q186 172 174 172 L26 172 Q14 172 18 160 Z',
};

const MARKS = {
  bolt: (c) => `<path d="M112 36 L92 70 L108 70 L94 100 L124 62 L108 62 L118 36 Z" fill="${c}"/>`,
  star: (c) => `<path d="${starPath(5, 15, 7)}" transform="translate(0 -58)" fill="${c}"/>`,
  heart: (c) => `<path d="M100 66 C90 58 82 52 82 44 C82 38 88 34 93 35 C96 36 99 38 100 41 C101 38 104 36 107 35 C112 34 118 38 118 44 C118 52 110 58 100 66 Z" fill="${c}"/>`,
  note: (c) => `<g fill="${c}"><ellipse cx="88" cy="58" rx="8" ry="6"/><ellipse cx="114" cy="52" rx="8" ry="6"/><path d="M94 58V32l28-6v26h-4V31l-20 4v23z"/></g>`,
  check: (c) => `<path d="M84 52 L96 64 L118 40" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  none: () => '',
};

/** One sticker as SVG. idx picks the design; week is printed small underneath the word. */
export function stickerSVG(idx, { week = null, size = 120, title = '', ghost = false } = {}) {
  const d = DESIGNS[((idx % DESIGNS.length) + DESIGNS.length) % DESIGNS.length];
  const path = SHAPES[d.shape]();
  // The outline of the sticker you are working towards.
  if (ghost) {
    return `<svg class="sticker sticker-ghost" viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">
      <path d="${path}" fill="none" stroke="currentColor" stroke-width="12" stroke-dasharray="20 16" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }
  let words = d.word.length > 9 ? d.word.split(' ') : [d.word];
  if (words.length > 2) words = [words.slice(0, -1).join(' '), words[words.length - 1]];
  const fs = words.length > 1 ? 27 : Math.min(36, Math.round(250 / Math.max(5, d.word.length)));
  const textY = d.shape === 'mountain' ? 132 : d.shape === 'heart' ? 104 : 108;
  const lines = words.map((w, i) => `<tspan x="100" dy="${i ? fs * 0.98 : 0}">${esc(w)}</tspan>`).join('');
  const y0 = words.length > 1 ? textY - fs * 0.45 : textY;
  return `<svg class="sticker" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${esc(title || `Sticker: ${d.word}`)}">
    <path d="${path}" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>
    <path d="${path}" fill="${d.fill}"/>
    <path d="${path}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linejoin="round" transform="translate(100 100) scale(.9) translate(-100 -100)"/>
    ${MARKS[d.mark](d.accent)}
    <text x="100" y="${y0}" text-anchor="middle" dominant-baseline="middle" fill="${d.ink}" font-family="'Bricolage Grotesque', 'Figtree', system-ui, sans-serif" font-weight="800" font-size="${fs}" letter-spacing="-0.5">${lines}</text>
    ${week != null ? `<text x="100" y="${d.shape === 'mountain' ? 160 : 152}" text-anchor="middle" fill="${d.ink}" opacity=".8" font-family="'Figtree', system-ui, sans-serif" font-weight="700" font-size="14">week ${esc(week)}</text>` : ''}
  </svg>`;
}

export function stickerWord(idx) { return DESIGNS[idx % DESIGNS.length].word; }

/** The big moment: overlay with the sticker and confetti. */
export function celebrate({ idx, week, onClose }) {
  const root = document.getElementById('overlay-root');
  const confetti = reducedMotion() ? '' : Array.from({ length: 46 }, (_, i) => {
    const colors = [C.fuchsia, C.tangerine, C.sun, C.mint, C.lilac, C.sky];
    const left = Math.round(Math.random() * 100);
    const delay = (Math.random() * 0.5).toFixed(2);
    const dur = (1.6 + Math.random() * 1.4).toFixed(2);
    const rot = Math.round(Math.random() * 360);
    const w = 6 + Math.round(Math.random() * 6);
    return `<i style="left:${left}%;background:${colors[i % colors.length]};width:${w}px;height:${Math.round(w * 1.6)}px;animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)"></i>`;
  }).join('');
  root.innerHTML = `
    <div class="celebrate" role="dialog" aria-modal="true" aria-labelledby="cele-title">
      <div class="confetti" aria-hidden="true">${confetti}</div>
      <div class="cele-card">
        <div class="cele-sticker">${stickerSVG(idx, { week, size: 230 })}</div>
        <h2 id="cele-title">Week ${esc(week)} compleet</h2>
        <p>Alles gedaan. Deze sticker gaat in je stickerboek.</p>
        <button class="btn btn-primary btn-block" data-action="cele-close">In mijn stickerboek</button>
      </div>
    </div>`;
  root.hidden = false;
  beep('cheer');
  buzz([40, 60, 40, 60, 120]);
  root.querySelector('[data-action="cele-close"]').focus({ preventScroll: true });
  celebrate.onClose = onClose;
}
export function closeCelebration() {
  const root = document.getElementById('overlay-root');
  root.innerHTML = '';
  root.hidden = true;
  if (celebrate.onClose) { const fn = celebrate.onClose; celebrate.onClose = null; fn(); }
}
