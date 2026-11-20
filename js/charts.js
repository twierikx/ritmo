// Small SVG charts: thin lines, rounded bars, recessive axes, a tap tooltip on every mark.
import { esc, on } from './ui.js';
import { fmtNum } from './engine.js';

const W = 340;

/** Round axis: 0 up to a tidy top value, in steps of 1, 2, 2.5 or 5 times a power of ten. */
export function niceScale(maxVal, count = 3) {
  if (!(maxVal > 0)) return { max: 1, ticks: [0, 1] };
  const raw = maxVal / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((k) => k >= raw);
  const max = Math.ceil(maxVal / step - 1e-9) * step;
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return { max, ticks };
}

function scale(v, a0, a1, b0, b1) { return a1 === a0 ? (b0 + b1) / 2 : b0 + ((v - a0) / (a1 - a0)) * (b1 - b0); }

function axisY(yMin, yMax, ticks, top, bottom, left) {
  return ticks.map((t) => {
    const y = scale(t, yMin, yMax, bottom, top);
    return `<line class="grid" x1="${left}" x2="${W - 8}" y1="${y}" y2="${y}"/><text class="tick" x="${left - 6}" y="${y + 4}" text-anchor="end">${fmtNum(t, 1)}</text>`;
  }).join('');
}

/** points: [{ label, y }] (y may be null). */
export function lineChart({ points, yMin = 0, yMax, ticks, height = 170, unit = '', cls = 'c-accent', empty = 'Nog geen gegevens' }) {
  const vals = points.filter((p) => p.y != null);
  if (!vals.length) return `<p class="chart-empty">${esc(empty)}</p>`;
  const nice = niceScale(Math.max(...vals.map((p) => p.y)) * 1.08);
  const max = yMax ?? nice.max;
  const left = 34; const top = 18; const bottom = height - 26;
  const tks = ticks || nice.ticks;
  const n = points.length;
  const x = (i) => scale(i, 0, Math.max(1, n - 1), left + 10, W - 18);
  let d = ''; let pen = false;
  points.forEach((p, i) => {
    if (p.y == null) { pen = false; return; }
    const y = scale(p.y, yMin, max, bottom, top);
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y.toFixed(1)}`;
    pen = true;
  });
  const lastIdx = points.map((p) => p.y != null).lastIndexOf(true);
  const marks = points.map((p, i) => {
    if (p.y == null) return '';
    const cx = x(i).toFixed(1); const cy = scale(p.y, yMin, max, bottom, top).toFixed(1);
    const tip = `${p.label}: ${fmtNum(p.y, 1)}${unit}`;
    return `<circle class="dot" cx="${cx}" cy="${cy}" r="4.5"/>
      <circle class="hit" cx="${cx}" cy="${cy}" r="16" data-action="chart-tip" data-tip="${esc(tip)}" tabindex="0"><title>${esc(tip)}</title></circle>
      ${i === lastIdx ? `<text class="val" x="${cx}" y="${Number(cy) - 11}" text-anchor="middle">${fmtNum(p.y, 1)}</text>` : ''}`;
  }).join('');
  const labelEvery = Math.ceil(n / 7);
  const xl = points.map((p, i) => (i % labelEvery === 0 || i === n - 1 ? `<text class="tick" x="${x(i)}" y="${height - 6}" text-anchor="middle">${esc(p.short || p.label)}</text>` : '')).join('');
  return `<div class="chart ${cls}"><svg viewBox="0 0 ${W} ${height}" role="img" aria-label="Grafiek">
    ${axisY(yMin, max, tks, top, bottom, left)}
    <path class="line" d="${d}"/>
    ${marks}${xl}
  </svg><div class="chart-tip" hidden></div></div>`;
}

/** bars: [{ label, value, target }]. Done as filled bars, target as a short tick. */
export function barChart({ bars, height = 170, unit = '', cls = 'c-accent', valueName = 'Gedaan', targetName = 'Doel', empty = 'Nog geen gegevens' }) {
  if (!bars.length) return `<p class="chart-empty">${esc(empty)}</p>`;
  const { max, ticks } = niceScale(Math.max(...bars.map((b) => Math.max(b.value || 0, b.target || 0))) * 1.05);
  const left = 34; const top = 14; const bottom = height - 26;
  const n = bars.length;
  const slot = (W - left - 14) / n;
  const bw = Math.min(26, slot * 0.62);
  const body = bars.map((b, i) => {
    const cx = left + 8 + slot * i + slot / 2;
    const parts = [];
    if (b.value) {
      const y = scale(b.value, 0, max, bottom, top);
      const h = bottom - y;
      const r = Math.min(4, h / 2, bw / 2);
      parts.push(`<path class="bar" d="M${cx - bw / 2} ${bottom}V${y + r}a${r} ${r} 0 0 1 ${r}-${r}h${bw - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}V${bottom}Z"/>`);
    }
    if (b.target) {
      const ty = scale(b.target, 0, max, bottom, top);
      parts.push(`<line class="target" x1="${cx - bw / 2 - 3}" x2="${cx + bw / 2 + 3}" y1="${ty}" y2="${ty}"/>`);
    }
    const tip = `${b.label}: ${b.value ? `${fmtNum(b.value, 0)}${unit}` : 'nog niets'}${b.target ? `, doel ${fmtNum(b.target, 0)}${unit}` : ''}`;
    parts.push(`<rect class="hit" x="${cx - slot / 2}" y="${top}" width="${slot}" height="${bottom - top}" data-action="chart-tip" data-tip="${esc(tip)}" tabindex="0"><title>${esc(tip)}</title></rect>`);
    parts.push(`<text class="tick" x="${cx}" y="${height - 6}" text-anchor="middle">${esc(b.short || b.label)}</text>`);
    return parts.join('');
  }).join('');
  return `<div class="chart ${cls}"><svg viewBox="0 0 ${W} ${height}" role="img" aria-label="Staafgrafiek">
    ${axisY(0, max, ticks, top, bottom, left)}${body}
  </svg>
  <p class="legend"><span class="sw sw-bar"></span>${esc(valueName)} <span class="sw sw-target"></span>${esc(targetName)}</p>
  <div class="chart-tip" hidden></div></div>`;
}

on('chart-tip', (el) => {
  const chart = el.closest('.chart');
  if (!chart) return;
  const tip = chart.querySelector('.chart-tip');
  const box = chart.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const leftPx = Math.max(8, Math.min(box.width - 150, r.left - box.left + r.width / 2 - 70));
  tip.style.left = `${leftPx}px`;
  tip.style.top = `${Math.max(0, r.top - box.top - 34)}px`;
  clearTimeout(chart._tipT);
  chart._tipT = setTimeout(() => { tip.hidden = true; }, 2600);
});
