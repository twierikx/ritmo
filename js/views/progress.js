// Voortgang: sticker book, month calendar, the month in numbers, charts and tests.
import { state, emit, goDate, plan } from '../store.js';
import {
  dayScore, weekResult, sequenceOf, addDays, todayStr, fmtDate, mondayOf, weekDates,
  DAYS_SHORT, monthName, shortDate, taskStatus, DONE_STATES,
} from '../engine.js';
import { icon } from '../icons.js';
import { esc, on } from '../ui.js';
import { stickerSVG } from '../stickers.js';
import { lineChart, barChart } from '../charts.js';
import { testsTable } from './tests.js';
import { exerciseHistory } from './info.js';

export function renderProgress() {
  return `
    <header class="pagehead"><h1>Voortgang</h1></header>
    ${album()}
    ${month()}
    ${charts()}
    <section class="card">
      <h2>Testen</h2>
      <p class="hint">Je wilt je rugstrekkers zien inlopen op je buikspieren, en langer kunnen staan.</p>
      ${testsTable()}
    </section>`;
}

function album() {
  const { program, run, days } = state;
  const seq = sequenceOf(run, program);
  const today = todayStr();
  const slots = seq.map((entry, i) => {
    const monday = addDays(run.start, i * 7);
    if (entry === 'P') return `<div class="slot is-pause"><span>pauze</span></div>`;
    const r = weekResult(program, run, days, monday);
    const label = `week ${entry}`;
    if (r.complete) return `<button class="slot is-earned" data-action="pick-week" data-date="${monday}" aria-label="Sticker van ${label}">${stickerSVG(i, { size: 84, week: entry })}</button>`;
    const isNow = monday <= today && today <= addDays(monday, 6);
    const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
    return `<button class="slot ${isNow ? 'is-now' : ''} ${monday > today ? 'is-future' : ''}" data-action="pick-week" data-date="${monday}" aria-label="${label}${isNow ? `, ${pct}% gedaan` : ''}">
      ${isNow ? `<span class="slot-ring" style="--p:${pct}"></span>` : ''}
      <span class="slot-n">${entry}</span>
    </button>`;
  }).join('');
  const earned = seq.filter((e, i) => e !== 'P' && weekResult(program, run, days, addDays(run.start, i * 7)).complete).length;
  const total = seq.filter((e) => e !== 'P').length;
  return `<section class="card album">
    <div class="card-head"><h2>Stickerboek</h2><p class="count">${earned} van ${total}</p></div>
    <div class="slots">${slots}</div>
    <p class="hint">Een week compleet, met alles afgevinkt of volgens het flareplan, levert een sticker op.</p>
  </section>`;
}

function month() {
  const { program, run, days } = state;
  const ym = state.ui.month || state.date.slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const start = mondayOf(first);
  const today = todayStr();
  const cells = [];
  let totals = { req: 0, done: 0, gym: 0, gymPlan: 0, walk: 0, stand: 0, pains: [] };
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    if (i >= 35 && d.slice(0, 7) !== ym) break;
    const inMonth = d.slice(0, 7) === ym;
    const sc = dayScore(program, run, days, d);
    const doc = days[d] || {};
    const frac = sc.total ? sc.done / sc.total : 0;
    const past = d <= today;
    if (inMonth && past) {
      // Today still counts as in progress: only what is already done counts.
      totals.req += d === today ? sc.done : sc.total; totals.done += sc.done;
      for (const t of sc.plan.tasks) {
        if (t.kind === 'gym') { totals.gymPlan++; if (DONE_STATES.has(taskStatus(t, d, days, run).s)) totals.gym++; }
      }
      for (const id of ['walk', 'walk2', 'long']) if (doc.tasks && doc.tasks[id] && doc.tasks[id].min > 0) totals.walk += doc.tasks[id].min;
      totals.walk += (doc.walks || []).reduce((a, b) => a + b, 0);
      const st = doc.tasks && doc.tasks.stand;
      const standTask = sc.plan.tasks.find((t) => t.kind === 'blocks');
      if (st && standTask) {
        (st.blocks || []).forEach((b, k) => { if (b === 'd') totals.stand += standTask.min; if (b === 's') totals.stand += (st.stops && st.stops[k]) || 0; });
      }
      if (doc.pain != null) totals.pains.push(doc.pain);
    }
    const marks = [
      sc.flare ? `<span class="mk mk-flare">${icon('flame', 'icon-xxs')}</span>` : '',
      sc.plan.tasks.some((t) => t.kind === 'test' && t.required) ? `<span class="mk mk-test">${icon('flag', 'icon-xxs')}</span>` : '',
    ].join('');
    cells.push(`<button class="cal-day ${inMonth ? '' : 'is-out'} ${d === today ? 'is-today' : ''} ${sc.total && sc.done >= sc.total ? 'is-full' : ''} ${sc.missedDay ? 'is-missed' : ''} ${!sc.total ? 'is-rest' : ''} ${d > today ? 'is-future' : ''}"
      data-action="pick-date" data-date="${d}" style="--f:${frac.toFixed(3)}" aria-label="${esc(shortDate(d))}: ${sc.done} van ${sc.total}">
      <span class="cal-ring"></span><span class="cal-n">${Number(d.slice(8))}</span>${marks}
    </button>`);
  }
  const pct = totals.req ? Math.round((totals.done / totals.req) * 100) : null;
  const avgPain = totals.pains.length ? totals.pains.reduce((a, b) => a + b, 0) / totals.pains.length : null;
  const prev = fmtDate(Date.UTC(y, m - 2, 1)).slice(0, 7);
  const next = fmtDate(Date.UTC(y, m, 1)).slice(0, 7);
  return `<section class="card month">
    <div class="card-head">
      <button class="iconbtn" data-action="month-go" data-ym="${prev}" aria-label="Vorige maand">${icon('chevL')}</button>
      <h2>${esc(monthName(y, m - 1))}</h2>
      <button class="iconbtn" data-action="month-go" data-ym="${next}" aria-label="Volgende maand">${icon('chevR')}</button>
    </div>
    <div class="cal">
      ${DAYS_SHORT.map((d) => `<span class="cal-h">${d}</span>`).join('')}
      ${cells.join('')}
    </div>
    <div class="stats">
      <div class="stat"><p class="stat-v">${pct == null ? '–' : `${pct}%`}</p><p class="stat-l">van je taken gedaan</p></div>
      <div class="stat"><p class="stat-v">${totals.gym}<span class="stat-of"> / ${totals.gymPlan}</span></p><p class="stat-l">keer sportschool</p></div>
      <div class="stat"><p class="stat-v">${totals.walk ? dur(totals.walk) : '–'}</p><p class="stat-l">gewandeld</p></div>
      <div class="stat"><p class="stat-v">${totals.stand ? dur(totals.stand) : '–'}</p><p class="stat-l">gestaan in blokken</p></div>
      <div class="stat"><p class="stat-v">${avgPain == null ? '–' : avgPain.toFixed(1).replace('.', ',')}</p><p class="stat-l">gemiddelde pijn (0–10)</p></div>
    </div>
  </section>`;
}

/** Compact duration for the stat tiles: 45 min, 2 uur, 1:17 uur. */
function dur(min) {
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h}:${String(m).padStart(2, '0')} uur` : `${h} uur`;
}

const LIFTS = [
  { id: 'backext', label: 'Back extension' },
  { id: 'deadlift', label: 'Deadlift', ids: ['rdl', 'trapbar'] },
  { id: 'hipthrust', label: 'Hip thrust' },
  { id: 'soren', label: 'Sørensen', sec: true },
];

function charts() {
  const { program, run, days } = state;
  const seq = sequenceOf(run, program);
  const weeks = [];
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] === 'P') continue;
    const monday = addDays(run.start, i * 7);
    if (monday > todayStr()) break;
    weeks.push({ i, week: seq[i], monday, dates: weekDates(monday) });
  }
  // pain per week
  const painPts = weeks.map((w) => {
    const v = w.dates.map((d) => days[d] && days[d].pain).filter((x) => x != null);
    return { label: `Week ${w.week}`, short: `w${w.week}`, y: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null };
  });
  // long walk per week
  const longBars = weeks.map((w) => {
    let done = 0; let target = 0;
    for (const d of w.dates) {
      const t = (days[d] && days[d].tasks && days[d].tasks.long) || {};
      if (t.min > done) done = t.min;
      const lt = plan(d).tasks.find((x) => x.kind === 'long');
      if (lt) target = lt.target;
    }
    return { label: `Week ${w.week}`, short: `w${w.week}`, value: done, target };
  });
  // lifts
  const sel = LIFTS.find((l) => l.id === state.ui.liftChart) || LIFTS[0];
  const ids = sel.ids || [sel.id];
  const liftPts = [];
  for (const id of ids) {
    for (const h of exerciseHistory(id)) {
      const val = sel.sec ? Math.max(...h.sets.map((s) => Number(s.r) || 0)) : Math.max(...h.sets.map((s) => Number(s.kg) || 0));
      liftPts.push({ date: h.date, y: val || null });
    }
  }
  liftPts.sort((a, b) => (a.date < b.date ? -1 : 1));
  const liftChart = lineChart({
    points: liftPts.slice(-16).map((p) => ({ label: shortDate(p.date), short: shortDate(p.date), y: p.y })),
    unit: sel.sec ? ' s' : ' kg', yMin: 0, cls: 'c-accent', empty: 'Log je eerste training, dan verschijnt hier je lijn.',
  });
  return `<section class="card">
      <h2>Je rug per week</h2>
      <p class="hint">Gemiddelde van wat je per dag invulde, van 0 tot 10. Golven horen erbij, de lijn mag zakken.</p>
      ${lineChart({ points: painPts, yMin: 0, yMax: 10, ticks: [0, 5, 10], cls: 'c-plum', empty: 'Vul onderaan Vandaag in hoe je rug voelt.' })}
    </section>
    <section class="card">
      <div class="card-head"><h2>Kracht</h2></div>
      <div class="chips chips-tight" role="group" aria-label="Kies oefening">${LIFTS.map((l) => `<button class="chip ${l.id === sel.id ? 'is-on' : ''}" data-action="lift-chart" data-id="${l.id}" aria-pressed="${l.id === sel.id}">${l.label}</button>`).join('')}</div>
      ${liftChart}
    </section>
    <section class="card">
      <h2>Lange wandeling</h2>
      ${barChart({ bars: longBars, unit: ' min', cls: 'c-accent', valueName: 'Gelopen', targetName: 'Doel', empty: 'Je eerste lange wandeling komt zondag.' })}
    </section>`;
}

on('pick-week', (el) => { goDate(el.dataset.date); location.hash = '#/vandaag'; });
on('pick-date', (el) => { goDate(el.dataset.date); location.hash = '#/vandaag'; });
on('month-go', (el) => { state.ui.month = el.dataset.ym; emit('ui'); });
on('lift-chart', (el) => { state.ui.liftChart = el.dataset.id; emit('ui'); });
