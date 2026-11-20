// Test moments: fill in results (with a stopwatch for the holds) and see the ratios.
import { state, patchRun } from '../store.js';
import { esc, on, onChange, openSheet, closeSheet, refreshSheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { startTimer } from '../timer.js';
import { fmtNum, parseNum, mondayOf, addDays, weekDates } from '../engine.js';

const results = (moment) => (state.run.tests && state.run.tests[moment]) || {};

/** Suggestions from the logs: longest walk and average pain in the week of the test. */
function suggestions(moment) {
  const t = state.program.tests.moments.find((m) => m.id === moment);
  if (!t || !t.week) return {};
  const monday = addDays(state.run.start, (t.week - 1) * 7);
  let walk = 0; const pains = [];
  for (const d of weekDates(monday)) {
    const doc = state.days[d];
    if (!doc) continue;
    if (doc.pain != null) pains.push(doc.pain);
    for (const id of ['long', 'walk', 'walk2']) {
      const m = doc.tasks && doc.tasks[id] && doc.tasks[id].min;
      if (m > walk) walk = m;
    }
  }
  return { walk: walk || null, pain: pains.length ? Math.round((pains.reduce((a, b) => a + b, 0) / pains.length) * 10) / 10 : null };
}

export function openTestSheet(moment, part) {
  const tests = state.program.tests;
  const m = tests.moments.find((x) => x.id === moment);
  const title = `${m.label}: ${part === 'gym' ? 'in de sportschool' : 'thuis'}`;
  openSheet({
    title,
    render: () => {
      const res = results(moment);
      const sug = suggestions(moment);
      const fields = tests.fields.filter((f) => f.part === part);
      return `<div class="testform">
        ${fields.map((f) => {
          const v = res[f.id];
          if (f.scale) {
            return `<div class="tf">
              <div class="tf-head"><p class="tf-label">${esc(f.label)}</p><button class="iconbtn" data-action="info" data-key="${f.info}" aria-label="Uitleg">${icon('info')}</button></div>
              <div class="scale" role="group" aria-label="${esc(f.label)}">${Array.from({ length: 11 }, (_, i) => `<button class="scale-btn ${v === i ? 'is-on' : ''}" data-action="test-scale" data-moment="${moment}" data-field="${f.id}" data-v="${i}">${i}</button>`).join('')}</div>
              ${f.id === 'pain' && sug.pain != null && v == null ? `<button class="linkbtn" data-action="test-scale" data-moment="${moment}" data-field="pain" data-v="${Math.round(sug.pain)}">Gemiddelde uit je dagen: ${fmtNum(sug.pain)}</button>` : ''}
            </div>`;
          }
          return `<div class="tf">
            <div class="tf-head"><label class="tf-label" for="tf-${f.id}">${esc(f.label)}</label><button class="iconbtn" data-action="info" data-key="${f.info}" aria-label="Uitleg">${icon('info')}</button></div>
            <div class="tf-row">
              <input id="tf-${f.id}" class="input num" type="number" inputmode="decimal" min="0" step="1" value="${v ?? ''}" placeholder="${f.id === 'walk' && sug.walk ? sug.walk : ''}" data-change="test-field" data-moment="${moment}" data-field="${f.id}">
              <span class="unit">${esc(f.unit)}</span>
              ${f.timer ? `<button class="btn btn-s" data-action="test-timer" data-moment="${moment}" data-field="${f.id}">${icon('timer')} Stopwatch</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    },
    footer: () => `<button class="btn btn-primary btn-block" data-action="test-save" data-moment="${moment}" data-part="${part}">Test opslaan</button>`,
  });
}

onChange('test-field', (el) => {
  const v = parseNum(el.value);
  patchRun({ tests: { [el.dataset.moment]: { [el.dataset.field]: v } } });
});
on('test-scale', (el) => {
  const cur = results(el.dataset.moment)[el.dataset.field];
  const v = Number(el.dataset.v);
  patchRun({ tests: { [el.dataset.moment]: { [el.dataset.field]: cur === v ? null : v } } });
  refreshSheet();
});
on('test-timer', (el) => {
  const { moment, field } = el.dataset;
  const f = state.program.tests.fields.find((x) => x.id === field);
  startTimer({
    kind: 'hold', title: f.label, target: field === 'soren' ? [60, 240] : null, done: 'Stop',
    onDone: (res) => {
      patchRun({ tests: { [moment]: { [field]: res.elapsed } } });
      refreshSheet();
      toast(`${f.label}: ${res.elapsed} s`);
    },
  });
});
on('test-save', (el) => {
  const { moment, part } = el.dataset;
  patchRun({ tests: { [moment]: { [`${part}At`]: Date.now() } } });
  closeSheet();
  toast('Test opgeslagen');
});

/** Results table for the progress view. */
export function testsTable() {
  const tests = state.program.tests;
  const all = state.run.tests || {};
  const cols = tests.moments;
  const cell = (m, f) => {
    const v = all[m.id] && all[m.id][f.id];
    return v == null ? '<span class="muted">–</span>' : fmtNum(v);
  };
  const ratioCell = (m, r) => {
    const v = all[m.id] || {};
    if (!r.need.every((k) => v[k] != null && v[k] !== 0)) return '<span class="muted">–</span>';
    const val = r.calc(v);
    const ok = r.ok(val);
    return `<span class="ratio ${ok ? 'is-ok' : 'is-off'}">${ok ? icon('check', 'icon-xs') : ''}${r.pct ? `${fmtNum(val * 100, 0)}%` : fmtNum(val, 2)}</span>`;
  };
  const row = (f) => `<tr><th scope="row">${esc(f.short || f.label)}</th>${cols.map((m) => `<td>${cell(m, f)}</td>`).join('')}</tr>`;
  const group = (title) => `<tr class="group-row"><th colspan="${cols.length + 1}" scope="rowgroup">${esc(title)}</th></tr>`;
  return `<div class="md-table tests-table"><table>
    <thead><tr><th><span class="sr-only">Test</span></th>${cols.map((m) => `<th title="${esc(m.label)}">${esc(m.short || m.label)}</th>`).join('')}</tr></thead>
    <tbody>
      ${group('In seconden')}
      ${tests.fields.filter((f) => f.unit === 's').map(row).join('')}
      ${group('In minuten')}
      ${tests.fields.filter((f) => f.unit === 'min').map(row).join('')}
      ${group('Hoe goed lukt het, van 0 tot 10')}
      ${tests.fields.filter((f) => f.scale).map(row).join('')}
      ${group('Verhoudingen')}
      ${tests.ratios.map((r) => `<tr class="ratio-row"><th scope="row">${esc(r.label)}<span class="target">${esc(r.target)}</span></th>${cols.map((m) => `<td>${ratioCell(m, r)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <div class="test-actions">${cols.map((m) => `<div class="test-moment"><p>${esc(m.label)}</p>
      <button class="btn btn-s btn-quiet" data-action="test-open" data-moment="${m.id}" data-part="gym">Sportschool</button>
      <button class="btn btn-s btn-quiet" data-action="test-open" data-moment="${m.id}" data-part="home">Thuis</button></div>`).join('')}</div>`;
}

on('test-open', (el) => openTestSheet(el.dataset.moment, el.dataset.part));
