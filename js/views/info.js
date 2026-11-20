// The i-buttons: a sheet with the how, the why and when to change something.
import { state } from '../store.js';
import { esc, on, openSheet } from '../ui.js';
import { md } from '../md.js';
import { shortDate, fmtNum } from '../engine.js';
import { lineChart } from '../charts.js';

/** Logged sets of one exercise, newest first. */
export function exerciseHistory(exId, beforeDate = '9999-12-31') {
  const out = [];
  for (const date of Object.keys(state.days).sort().reverse()) {
    if (date >= beforeDate) continue;
    const g = state.days[date].gym;
    const e = g && g.ex && g.ex[exId];
    if (!e || !e.sets) continue;
    const sets = e.sets.filter((s) => s && s.ok);
    if (!sets.length) continue;
    out.push({ date, sets, pain: e.pain || null, after: state.days[date].after || null, note: e.note || '', light: !!g.light });
  }
  return out;
}

export function setsSummary(sets, measure) {
  const unit = { sec: ' s', m: ' m', min: ' min' }[measure] || '';
  const kgs = [...new Set(sets.map((s) => s.kg).filter((k) => k != null && k !== '' && Number(k) > 0))];
  const reps = sets.map((s) => (s.r != null ? s.r : '?')).join(', ');
  if (kgs.length === 1) return `${fmtNum(kgs[0])} kg × ${reps}${unit}`;
  if (kgs.length > 1) return sets.map((s) => `${s.kg != null ? `${fmtNum(s.kg)} kg × ` : ''}${s.r ?? '?'}${unit}`).join(', ');
  return `${reps}${unit}`;
}

export function openInfo(key) {
  const program = state.program;
  if (key && key.startsWith('ex:')) return openExercise(key.slice(3));
  const item = program.info[key];
  if (!item) return;
  openSheet({ title: item.title, render: () => `<div class="prose">${md(item.md)}</div>` });
}

function openExercise(id) {
  const ex = state.program.exercises[id];
  if (!ex) return;
  openSheet({
    title: ex.name,
    render: () => {
      const hist = exerciseHistory(id);
      const chart = ex.load && hist.length > 1
        ? lineChart({
          points: hist.slice(0, 12).reverse().map((h) => ({ label: shortDate(h.date), y: Math.max(...h.sets.map((s) => Number(s.kg) || 0)) || null })),
          unit: ' kg', yMin: 0, cls: 'c-accent', height: 150,
        })
        : '';
      return `<div class="prose">
        ${ex.es ? `<p class="es">In het Spaans: <em>${esc(ex.es)}</em></p>` : ''}
        <h3>Hoe</h3><p>${esc(ex.how)}</p>
        <h3>Waarom</h3><p>${esc(ex.why)}</p>
        ${ex.adjust ? `<h3>Aanpassen</h3><p>${esc(ex.adjust)}</p>` : ''}
        ${hist.length ? `<h3>Jouw logboek</h3>${chart}<ul class="hist">${hist.slice(0, 6).map((h) => `<li><span>${esc(shortDate(h.date))}</span> ${esc(setsSummary(h.sets, ex.measure))}${h.pain ? ` <span class="pain-dot p-${h.pain}" title="Tijdens: ${{ g: 'groen', o: 'oranje', r: 'rood' }[h.pain]}" aria-label="Tijdens: ${{ g: 'groen', o: 'oranje', r: 'rood' }[h.pain]}"></span>` : ''}${h.after ? ` <span class="after-tag p-${h.after}">ochtend erna ${{ g: 'normaal', o: 'iets meer', r: 'erger' }[h.after]}</span>` : ''}${h.note ? `<em>${esc(h.note)}</em>` : ''}</li>`).join('')}</ul>` : ''}
      </div>`;
    },
  });
}

on('info', (el) => openInfo(el.dataset.key));
