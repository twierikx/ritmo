// Vandaag: the week as a row of beats, and the tasks of the chosen day.
import { state, plan, patchDay, patchRun, goDate, emit } from '../store.js';
import {
  taskStatus, dayScore, weekResult, longDate, addDays, mondayOf, weekDates, DAYS_SHORT, todayStr,
  parseDate, dayName, parseNum, fmtMin, pathPatch, DONE_STATES,
} from '../engine.js';
import { icon } from '../icons.js';
import { esc, on, onChange, openSheet, closeSheet, refreshSheet, toast, buzz, beep } from '../ui.js';
import { startTimer, itemSegments } from '../timer.js';
import { openTestSheet } from './tests.js';
import { stickerSVG } from '../stickers.js';

const STATUS_ICON = { done: 'check', adapted: 'wave', na: 'dash', missed: 'x' };
const STATUS_LABEL = { done: 'gedaan', adapted: 'aangepast', na: 'vervalt', missed: 'niet gelukt', partial: 'bezig', open: 'nog te doen' };
const PAIN = { g: 'Groen', o: 'Oranje', r: 'Rood' };
const dayNum = (d) => new Date(parseDate(d)).getUTCDate();

const taskData = (date, id) => (state.days[date] && state.days[date].tasks && state.days[date].tasks[id]) || {};
const findTask = (date, id) => plan(date).tasks.find((t) => t.id === id);
const openKey = (id) => `${state.date}:${id}`;

// ---------- render ----------

export function renderToday() {
  const date = state.date;
  const p = plan(date);
  return `
    ${weekBar(date)}
    ${dayHead(p)}
    ${p.banners.map(banner).join('')}
    <section class="tasks" aria-label="Taken">
      ${p.tasks.length ? p.tasks.map((t) => taskCard(t, date)).join('') : emptyDay(p)}
    </section>
    ${p.info.week && !(p.flare && p.flare.day) ? walkGoal(date, p) : ''}
    ${p.info.week || p.info.pre ? dayFoot(date, p) : ''}`;
}

function weekBar(date) {
  const { program, run, days } = state;
  const mon = mondayOf(date);
  const today = todayStr();
  const info = plan(mon).info;
  const title = info.pre ? 'Voor de start' : info.finished ? 'Na je schema' : info.pause ? 'Pauzeweek' : `Week ${info.week} van ${program.weeks}`;
  const beats = weekDates(mon).map((d, i) => {
    const sc = dayScore(program, run, days, d);
    const full = sc.total > 0 && sc.done >= sc.total;
    const frac = sc.total ? sc.done / sc.total : 0;
    const cls = [
      d === today && 'is-today', d === date && 'is-sel', full && 'is-full', sc.missedDay && 'is-missed',
      sc.flare && 'is-flare', (sc.pause || !sc.total) && 'is-rest', d > today && 'is-future',
    ].filter(Boolean).join(' ');
    return `<button class="beat ${cls}" data-action="pick-day" data-date="${d}" style="--f:${frac.toFixed(3)}"
      aria-label="${esc(longDate(d))}: ${sc.done} van ${sc.total} gedaan" aria-current="${d === date ? 'date' : 'false'}">
      <span class="beat-col"><span class="beat-fill"></span>${full ? icon('check', 'beat-check') : ''}</span>
      <span class="beat-day">${DAYS_SHORT[i]}</span>
      <span class="beat-num">${dayNum(d)}</span>
    </button>`;
  }).join('');
  const wr = weekResult(program, run, days, mon);
  let foot = '';
  if (wr.eligible) {
    const left = wr.total - wr.done;
    foot = left <= 0
      ? `<p class="weekbar-foot is-earned">${stickerSVG(wr.idx, { size: 30 })}<span>Weeksticker verdiend</span></p>`
      : `<p class="weekbar-foot">${stickerSVG(wr.idx, { size: 30, ghost: true })}<span>Nog ${left} ${left === 1 ? 'taak' : 'taken'} tot je weeksticker</span></p>`;
  }
  return `<section class="weekbar ${info.week ? state.program.phaseOf(info.week).cls : ''}">
    <div class="weekbar-head">
      <button class="iconbtn" data-action="week-prev" aria-label="Vorige week">${icon('chevL')}</button>
      <p class="weekbar-title">${esc(title)}</p>
      <button class="iconbtn" data-action="week-next" aria-label="Volgende week">${icon('chevR')}</button>
    </div>
    <div class="beats">${beats}</div>
    ${foot}
  </section>`;
}

function dayHead(p) {
  const date = state.date;
  const today = todayStr();
  const rel = date === today ? 'Vandaag' : date === addDays(today, 1) ? 'Morgen' : date === addDays(today, -1) ? 'Gisteren' : '';
  let meta = '';
  if (p.info.week) {
    const ph = state.program.phaseOf(p.info.week);
    meta = `<span class="phase-pill ${ph.cls}">Fase ${ph.id}: ${esc(ph.name.toLowerCase())}</span>`;
    if (p.light) meta += '<span class="pill">Lichte week</span>';
    if (p.flare && p.flare.day) meta += `<span class="pill pill-flare">${icon('flame', 'icon-xs')} Opvlamming</span>`;
  }
  return `<header class="dayhead">
    ${rel || date !== today ? `<div class="dayhead-top">
      <p class="rel">${rel}</p>
      ${date !== today ? '<button class="btn btn-s btn-quiet" data-action="go-today">Naar vandaag</button>' : ''}
    </div>` : ''}
    <h1>${esc(longDate(date))}</h1>
    ${meta ? `<p class="daymeta">${meta}</p>` : ''}
  </header>`;
}

function banner(b) {
  let action = '';
  if (b.action === 'stand-delay') action = '<button class="btn btn-s btn-quiet" data-action="stand-delay">Nog 2 weken op de vorige stap</button>';
  if (b.kind === 'flare') action = '<button class="btn btn-s btn-quiet" data-action="flare-undo">Toch geen opvlamming</button>';
  return `<aside class="banner b-${b.kind}">
    <p class="banner-title">${esc(b.title)}</p>
    <p>${esc(b.text)}</p>
    ${action}
  </aside>`;
}

function emptyDay(p) {
  if (p.info.finished) return '<p class="empty">Je 12 weken zitten erop. Bij Voortgang zie je hoe het ging.</p>';
  return '<p class="empty">Niets gepland vandaag. Rust is ook training.</p>';
}

/** Halfway through a task: a line like "2 van 4 oefeningen gedaan" in place of the subtitle. */
function progressOf(task, date) {
  const t = taskData(date, task.id);
  const line = (got, of, unit) => (got > 0 && got < of ? `${got} van ${of}${unit ? ` ${unit}` : ''} gedaan` : '');
  if (task.kind === 'list') {
    const need = task.items.filter((i) => !i.optional);
    return line(need.filter((i) => t.items && t.items[i.id]).length, need.length, task.unit || '');
  }
  if (task.kind === 'blocks') return line((t.blocks || []).filter((b) => b === 'd' || b === 's').length, task.blocks, 'blokken');
  if (task.kind === 'counter') return line(t.n || 0, task.min, 'keer');
  if (task.kind === 'gym') {
    const doc = state.days[date];
    const g = doc && doc.gym;
    if (!g || g.s !== task.session) return '';
    const n = Object.values(g.ex || {}).filter((e) => (e.sets || []).some((x) => x && x.ok)).length;
    return n ? `${n} ${n === 1 ? 'oefening' : 'oefeningen'} gelogd` : '';
  }
  return '';
}

function taskCard(task, date) {
  const st = taskStatus(task, date, state.days, state.run);
  const s = st.s;
  const isOpen = !!state.ui.open[openKey(task.id)];
  const done = DONE_STATES.has(s);
  const prog = done ? '' : progressOf(task, date);
  const sub = st.on ? `Gedaan op ${dayName(st.on)}` : prog || task.sub;
  const tickIcon = STATUS_ICON[s] || 'check';
  const hit = task.kind === 'gym'
    ? `data-action="open-gym" data-session="${task.session}"`
    : task.open === 'home'
      ? 'data-action="open-home"'
      : `data-action="task-toggle" data-task="${task.id}" aria-expanded="${isOpen}"`;
  return `<article class="task st-${s} ${isOpen ? 'is-open' : ''} ${task.required ? '' : 'is-optional'}" data-task="${task.id}">
    <div class="task-row">
      <button class="task-hit" ${hit}>
        <span class="task-ico">${icon(task.icon)}</span>
        <span class="task-txt">
          <span class="task-title">${esc(task.title)}${task.required ? '' : ' <span class="opt">optioneel</span>'}</span>
          <span class="task-sub">${esc(sub)}</span>
        </span>
        ${task.open === 'home' ? `<span class="task-go">${icon('chevR')}</span>` : ''}
      </button>
      <button class="iconbtn info-btn" data-action="info" data-key="${task.info}" aria-label="Uitleg bij ${esc(task.title)}">${icon('info')}</button>
      <button class="tick" data-action="task-check" data-task="${task.id}" aria-pressed="${done}" aria-label="${esc(task.title)}: ${STATUS_LABEL[s]}">${icon(tickIcon)}</button>
    </div>
    ${isOpen && task.kind !== 'gym' && !task.open ? `<div class="task-body">${taskBody(task, date, s)}</div>` : ''}
  </article>`;
}

function statusRow(task, s) {
  const b = (val, label) => `<button class="chip ${s === val ? 'is-on' : ''}" data-action="task-status" data-task="${task.id}" data-s="${val}" aria-pressed="${s === val}">${label}</button>`;
  return `<div class="status-row">
    ${b('missed', 'Niet gelukt')}${b('adapted', 'Aangepast')}${task.allowNA ? b('na', 'Vervalt') : ''}
    <button class="chip" data-action="task-note" data-task="${task.id}">${icon('note', 'icon-xs')} Notitie</button>
  </div>`;
}

function painChips(action, task, value, label = 'Je rug tijdens het lopen') {
  return `<div class="during-row">
    <div class="row-head">
      <p class="after-label">${esc(label)}</p>
      <button class="iconbtn" data-action="info" data-key="pain" aria-label="Uitleg over het stoplicht">${icon('info')}</button>
    </div>
    <div class="pain-chips" role="group" aria-label="${esc(label)}">
      ${['g', 'o', 'r'].map((p) => `<button class="pchip p-${p} ${value === p ? 'is-on' : ''}" data-action="${action}" data-task="${task.id}" data-p="${p}" aria-pressed="${value === p}">${PAIN[p]}</button>`).join('')}
    </div>
  </div>`;
}

function taskBody(task, date, s) {
  const t = taskData(date, task.id);
  let body = '';
  switch (task.kind) {
    case 'list':
      body = `<div class="items">${task.items.map((it) => {
        const on = !!(t.items && t.items[it.id]);
        return `<div class="item ${on ? 'is-done' : ''}">
          <button class="item-check" data-action="item-toggle" data-task="${task.id}" data-item="${it.id}" aria-pressed="${on}" aria-label="${esc(it.name)}">${icon('check')}</button>
          <div class="item-txt"><p class="item-name">${esc(it.name)}${it.optional ? ' <span class="opt">als het nodig is</span>' : ''}</p><p class="item-target">${esc(it.target)}</p></div>
          ${it.timer ? `<button class="iconbtn" data-action="item-timer" data-task="${task.id}" data-item="${it.id}" aria-label="Timer voor ${esc(it.name)}">${icon('timer')}</button>` : ''}
          ${it.info ? `<button class="iconbtn" data-action="info" data-key="${it.info}" aria-label="Uitleg bij ${esc(it.name)}">${icon('info')}</button>` : ''}
        </div>`;
      }).join('')}</div>`;
      break;
    case 'blocks': {
      const blocks = t.blocks || [];
      const stops = t.stops || {};
      const next = Array.from({ length: task.blocks }, (_, i) => i).find((i) => !blocks[i]);
      body = `<div class="blocks" role="group" aria-label="Staanblokken">${Array.from({ length: task.blocks }, (_, i) => {
        const b = blocks[i];
        return `<button class="block ${b === 'd' ? 'is-done' : b === 's' ? 'is-stopped' : ''}" data-action="block-tap" data-task="${task.id}" data-i="${i}"
          aria-label="Blok ${i + 1}: ${b === 'd' ? 'gedaan' : b === 's' ? `gestopt na ${stops[i] ?? '?'} min` : 'nog te doen'}">
          <span class="block-n">${b === 's' ? `${stops[i] ?? '?'}′` : i + 1}</span>
          ${b === 'd' ? icon('check', 'icon-xs') : ''}
        </button>`;
      }).join('')}</div>
      <p class="hint">${task.min} minuten per blok. Loop daarna 2 tot 5 minuten en zit ${task.sit} minuten.</p>
      ${next != null ? `<div class="btn-row">
        <button class="btn btn-primary" data-action="block-timer" data-task="${task.id}" data-i="${next}">${icon('timer')} Start blok ${next + 1}</button>
        <button class="btn btn-quiet" data-action="block-stop" data-task="${task.id}" data-i="${next}">Eerder gestopt</button>
      </div>` : ''}`;
      break;
    }
    case 'walk': {
      const mode = t.mode || 'walk';
      const runOn = task.run && mode === 'run';
      body = `${task.run ? `<div class="seg" role="group" aria-label="Wandelen of hardlopen">
          <button class="${mode === 'walk' ? 'is-on' : ''}" data-action="walk-mode" data-task="${task.id}" data-mode="walk">${icon('walk', 'icon-s')} Wandelen</button>
          <button class="${runOn ? 'is-on' : ''}" data-action="walk-mode" data-task="${task.id}" data-mode="run">${icon('run', 'icon-s')} Hardlopen</button>
        </div>` : ''}
        ${runOn ? `<div class="runcard">
          <p class="runcard-step">Stap ${task.run.step} van 7</p>
          <p class="runcard-text">${esc(task.run.text)}</p>
          <p class="hint">Plus 5 minuten inwandelen en 5 uitwandelen. Praattempo, kleine lichte passen.</p>
          <div class="btn-row"><button class="btn btn-primary" data-action="run-timer" data-task="${task.id}">${icon('play')} Start de intervaltimer</button>
          <button class="iconbtn" data-action="info" data-key="run" aria-label="Uitleg over hardlopen">${icon('info')}</button></div>
        </div>` : ''}
        <div class="field-row">
          <label for="min-${task.id}">${runOn ? 'Totaal' : 'Gelopen'}</label>
          <input id="min-${task.id}" class="input num" type="number" inputmode="numeric" min="0" value="${t.min ?? ''}" placeholder="${runOn ? task.run.total + 10 + Math.round(task.run.walk * (task.run.reps - 1)) : task.target}" data-change="task-min" data-task="${task.id}">
          <span class="unit">min</span>
        </div>
        ${painChips('task-pain', task, t.pain)}
        ${runOn ? afterRow(date) : ''}`;
      break;
    }
    case 'long':
      body = `<p class="bigtarget">${esc(fmtMin(task.target))}</p>
        ${task.repeated ? '<p class="hint">Een herhaling: je vorige lange wandeling kleurde oranje of rood.</p>' : ''}
        ${task.pack ? `<p class="hint">${esc(task.pack)}</p>` : ''}
        <p class="hint">${esc(task.where)}</p>
        <div class="field-row">
          <label for="min-${task.id}">Gelopen</label>
          <input id="min-${task.id}" class="input num" type="number" inputmode="numeric" min="0" value="${t.min ?? ''}" placeholder="${task.target}" data-change="task-min" data-task="${task.id}">
          <span class="unit">min</span>
        </div>
        ${painChips('task-pain', task, t.pain)}
        ${afterRow(date)}`;
      break;
    case 'counter':
      body = `<div class="counter" role="group" aria-label="${esc(task.title)}">${Array.from({ length: task.count }, (_, i) => `<button class="cnt ${i < (t.n || 0) ? 'is-on' : ''}" data-action="counter-tap" data-task="${task.id}" data-i="${i}" aria-pressed="${i < (t.n || 0)}">${i + 1}</button>`).join('')}</div>
        ${task.timer ? `<div class="btn-row"><button class="btn btn-quiet" data-action="counter-timer" data-task="${task.id}">${icon('timer')} Timer van ${Math.round(task.timer.sec / 60)} min</button></div>` : ''}`;
      break;
    case 'test': {
      const res = (state.run.tests && state.run.tests[task.moment]) || {};
      const fields = state.program.tests.fields.filter((f) => f.part === task.part);
      const filled = fields.filter((f) => res[f.id] != null).length;
      body = `<p class="hint">${filled ? `${filled} van ${fields.length} ingevuld.` : 'Neem de stopwatch erbij: Ritmo vult de seconden voor je in.'}</p>
        <div class="btn-row"><button class="btn btn-primary" data-action="test-open" data-moment="${task.moment}" data-part="${task.part}">${icon('flag')} Test invullen</button></div>`;
      return body;
    }
    case 'check':
      body = '<p class="hint">Liggen met je benen op een stoel, op je zij met een kussen tussen je knieën, warmte of een tennisbal onder je bil.</p>';
      break;
    default:
      break;
  }
  const note = t.note ? `<p class="note">${icon('note', 'icon-xs')} ${esc(t.note)}</p>` : '';
  return `${body}${note}${statusRow(task, s)}`;
}

/** How the back felt the morning after this day. Shown once that morning has come. */
export function afterRow(date) {
  if (date >= todayStr()) return '';
  const v = (state.days[date] || {}).after;
  const opt = (p, label) => `<button class="pchip p-${p} ${v === p ? 'is-on' : ''}" data-action="after-set" data-date="${date}" data-p="${p}" aria-pressed="${v === p}">${label}</button>`;
  return `<div class="after-row">
    <div class="row-head">
      <p class="after-label">De ochtend erna</p>
      <button class="iconbtn" data-action="info" data-key="after" aria-label="Uitleg over de ochtend erna">${icon('info')}</button>
    </div>
    <div class="pain-chips" role="group" aria-label="Je rug de ochtend erna">
      ${opt('g', 'Normaal')}${opt('o', 'Iets meer')}${opt('r', 'Erger')}
    </div>
  </div>`;
}

function walkGoal(date, p) {
  const mon = mondayOf(date);
  let n = 0;
  for (const d of weekDates(mon)) {
    const doc = state.days[d];
    if (!doc) continue;
    for (const id of ['walk', 'walk2']) if (doc.tasks && doc.tasks[id] && doc.tasks[id].min > 0 && doc.tasks[id].s !== 'missed') n++;
    n += (doc.walks || []).length;
  }
  const goal = p.phase && p.phase.id === 3 ? 3 : 4;
  const goalText = p.phase && p.phase.id === 3 ? '3' : '3 tot 4';
  return `<section class="goal">
    <div class="goal-txt">
      <p class="goal-title">Wandelingen deze week</p>
      <p class="goal-sub">${n} van ${goalText} stevige, naast je lange wandeling</p>
    </div>
    <div class="goal-dots" aria-hidden="true">${Array.from({ length: goal }, (_, i) => `<span class="${i < n ? 'is-on' : ''}"></span>`).join('')}</div>
    <button class="btn btn-s btn-quiet" data-action="walk-add">${icon('plus', 'icon-xs')} Wandeling erbij</button>
  </section>`;
}

function dayFoot(date, p) {
  const doc = state.days[date] || {};
  const pain = doc.pain;
  const zone = (i) => (i <= 2 ? 'g' : i <= 5 ? 'o' : 'r');
  const inFlare = p.flare && p.flare.day;
  const inSchedule = !!p.info.week;
  return `<section class="dayfoot">
    <div class="painday">
      <p class="painday-title">Hoe voelt je rug vandaag?</p>
      <div class="scale" role="group" aria-label="Pijn vandaag van 0 tot 10">
        ${Array.from({ length: 11 }, (_, i) => `<button class="scale-btn z-${zone(i)} ${pain === i ? 'is-on' : ''}" data-action="day-pain" data-v="${i}" aria-pressed="${pain === i}">${i}</button>`).join('')}
      </div>
    </div>
    ${doc.note ? `<p class="note">${icon('note', 'icon-xs')} ${esc(doc.note)}</p>` : ''}
    ${doc.missed ? `<p class="note is-missed">Gemist: ${esc(doc.missed.reason || '')}</p>` : ''}
    <div class="dayactions">
      ${inFlare || !inSchedule ? '' : `<button class="btn btn-s btn-quiet" data-action="flare-start">${icon('flame', 'icon-s')} Opvlamming</button>`}
      ${inSchedule || doc.missed ? `<button class="btn btn-s btn-quiet" data-action="day-missed">${icon('x', 'icon-s')} ${doc.missed ? 'Toch niet gemist' : 'Dag gemist'}</button>` : ''}
      <button class="btn btn-s btn-quiet" data-action="day-note">${icon('note', 'icon-s')} Notitie</button>
    </div>
  </section>`;
}

// ---------- actions ----------

const setTask = (id, patch, date = state.date) => patchDay(date, { tasks: { [id]: patch } });

on('pick-day', (el) => goDate(el.dataset.date));
on('open-home', () => {
  state.ui.gymHome = true;
  location.hash = '#/sport';
});
on('after-set', (el) => {
  const { date, p } = el.dataset;
  const cur = (state.days[date] || {}).after;
  patchDay(date, { after: cur === p ? null : p });
});
on('week-prev', () => goDate(addDays(state.date, -7)));
on('week-next', () => goDate(addDays(state.date, 7)));
on('go-today', () => goDate(todayStr()));

on('task-toggle', (el) => {
  const k = openKey(el.dataset.task);
  state.ui.open[k] = !state.ui.open[k];
  emit('ui');
});

on('open-gym', (el) => {
  state.gymSession = el.dataset.session;
  state.ui.gymHome = false;
  location.hash = '#/sport';
});

on('task-check', (el) => {
  const id = el.dataset.task;
  const task = findTask(state.date, id);
  if (!task) return;
  const t = taskData(state.date, id);
  const { s } = taskStatus(task, state.date, state.days, state.run);
  if (task.kind === 'test' && !DONE_STATES.has(s)) { openTestSheet(task.moment, task.part); return; }
  if (DONE_STATES.has(s)) {
    if (t.s) { setTask(id, { s: null }); return; }
    state.ui.open[openKey(id)] = true;
    toast('Pas het aan in de lijst hieronder.');
    emit('ui');
    return;
  }
  const patch = { s: 'done' };
  if ((task.kind === 'walk' || task.kind === 'long') && !(t.min > 0)) patch.min = task.target;
  if (task.kind === 'walk' && t.mode === 'run' && task.run) patch.step = task.run.step;
  setTask(id, patch);
  beep('tick');
  buzz(25);
});

on('task-status', (el) => {
  const id = el.dataset.task; const val = el.dataset.s;
  const cur = taskData(state.date, id).s;
  setTask(id, { s: cur === val ? null : val });
});

on('item-toggle', (el) => {
  const { task, item } = el.dataset;
  const t = taskData(state.date, task);
  const on = !(t.items && t.items[item]);
  patchDay(state.date, pathPatch(`tasks.${task}.items.${item}`, on));
  if (on) buzz(15);
});

on('item-timer', (el) => {
  const task = findTask(state.date, el.dataset.task);
  const it = task && task.items.find((x) => x.id === el.dataset.item);
  if (!it || !it.timer) return;
  const date = state.date;
  const segments = itemSegments(it.timer);
  startTimer({
    kind: segments.length > 1 ? 'intervals' : 'countdown', title: it.name, segments, done: 'Klaar', note: it.target,
    onDone: () => patchDay(date, pathPatch(`tasks.${task.id}.items.${it.id}`, true)),
  });
});

function setBlock(id, i, val, minutes, date = state.date) {
  const t = taskData(date, id);
  const blocks = [...(t.blocks || [])];
  blocks[i] = val;
  for (let k = 0; k < blocks.length; k++) if (blocks[k] === undefined) blocks[k] = null;
  const patch = { blocks };
  if (minutes != null) patch.stops = { [i]: minutes };
  setTask(id, patch, date);
}
on('block-tap', (el) => {
  const id = el.dataset.task; const i = Number(el.dataset.i);
  const cur = (taskData(state.date, id).blocks || [])[i];
  setBlock(id, i, cur ? null : 'd');
  if (!cur) buzz(20);
});
on('block-timer', (el) => {
  const id = el.dataset.task; const i = Number(el.dataset.i);
  const task = findTask(state.date, id);
  const date = state.date;
  startTimer({
    kind: 'countdown', title: `Staan, blok ${i + 1}`, minimized: false,
    segments: [{ label: 'Staan', sec: task.min * 60, kind: 'stand' }],
    done: 'Blok klaar', note: 'Zet af en toe een voet op een krukje en wissel. Knieën zacht, lang uitademen.',
    alt: { label: 'Gestopt bij 3 van 10', fn: (res) => { setBlock(id, i, 's', Math.max(1, Math.round(res.elapsed / 60)), date); toast('Goed gedaan: gestopt op tijd telt ook.'); } },
    onDone: () => { setBlock(id, i, 'd', null, date); toast('Blok klaar. Loop even 2 tot 5 minuten.'); },
  });
});
on('block-stop', (el) => {
  const id = el.dataset.task; const i = Number(el.dataset.i);
  openSheet({
    title: `Blok ${i + 1} eerder gestopt`,
    render: () => `<p class="lead">Na hoeveel minuten kwam je pijn op 3 van 10? Zo stoppen is precies goed, en het blok telt mee.</p>
      <div class="field-row"><label for="stopmin">Gestaan</label><input id="stopmin" class="input num" type="number" inputmode="numeric" min="1" placeholder="10"><span class="unit">min</span></div>`,
    footer: () => `<button class="btn btn-primary btn-block" data-action="block-stop-save" data-task="${id}" data-i="${i}">Opslaan</button>`,
  });
});
on('block-stop-save', (el) => {
  const v = parseNum(document.getElementById('stopmin').value);
  setBlock(el.dataset.task, Number(el.dataset.i), 's', v || 1);
  closeSheet();
});

on('walk-mode', (el) => setTask(el.dataset.task, { mode: el.dataset.mode }));
onChange('task-min', (el) => {
  const id = el.dataset.task;
  const v = parseNum(el.value);
  const task = findTask(state.date, id);
  const patch = { min: v };
  const t = taskData(state.date, id);
  if (task && task.kind === 'walk' && t.mode === 'run' && task.run) patch.step = task.run.step;
  setTask(id, patch);
});
on('task-pain', (el) => {
  const id = el.dataset.task;
  const t = taskData(state.date, id);
  const task = findTask(state.date, id);
  const patch = { pain: t.pain === el.dataset.p ? null : el.dataset.p };
  if (task && task.kind === 'walk' && t.mode === 'run' && task.run) patch.step = task.run.step;
  setTask(id, patch);
});
on('run-timer', (el) => {
  const id = el.dataset.task;
  const task = findTask(state.date, id);
  const date = state.date;
  startTimer({
    kind: 'intervals', title: `Hardlopen, stap ${task.run.step}`, segments: task.run.segments.map((s) => ({ ...s })), done: 'Klaar',
    note: 'Praattempo: je kunt nog hele zinnen zeggen. Kleine, lichte passen.',
    onDone: (res) => {
      setTask(id, { mode: 'run', step: task.run.step, min: Math.max(1, Math.round(res.elapsed / 60)) }, date);
      toast('Gelopen. Kies nog een kleur voor je rug, dan weet Ritmo je volgende stap.');
      state.ui.open[`${date}:${id}`] = true;
      emit('ui');
    },
  });
});

on('counter-tap', (el) => {
  const id = el.dataset.task; const i = Number(el.dataset.i);
  const n = taskData(state.date, id).n || 0;
  setTask(id, { n: n === i + 1 ? i : i + 1 });
});
on('counter-timer', (el) => {
  const task = findTask(state.date, el.dataset.task);
  const date = state.date;
  startTimer({
    kind: 'countdown', title: task.title, segments: [{ label: task.timer.label, sec: task.timer.sec, kind: 'run' }],
    onDone: () => { const n = taskData(date, task.id).n || 0; setTask(task.id, { n: Math.min(task.count, n + 1) }, date); },
  });
});

on('task-note', (el) => {
  const id = el.dataset.task;
  const t = taskData(state.date, id);
  openSheet({
    title: 'Notitie',
    render: () => `<textarea id="notefield" class="textarea" rows="4" placeholder="Hoe ging het?">${esc(t.note || '')}</textarea>`,
    footer: () => `<button class="btn btn-primary btn-block" data-action="task-note-save" data-task="${id}">Opslaan</button>`,
  });
});
on('task-note-save', (el) => {
  setTask(el.dataset.task, { note: document.getElementById('notefield').value.trim() || null });
  closeSheet();
});

on('walk-add', () => {
  openSheet({
    title: 'Wandeling erbij',
    render: () => `<p class="lead">Naar de sportschool, je dansles of de stad: stevig gelopen telt mee.</p>
      <div class="field-row"><label for="addmin">Gelopen</label><input id="addmin" class="input num" type="number" inputmode="numeric" min="1" value="30"><span class="unit">min</span></div>`,
    footer: () => '<button class="btn btn-primary btn-block" data-action="walk-add-save">Toevoegen</button>',
  });
});
on('walk-add-save', () => {
  const v = parseNum(document.getElementById('addmin').value) || 30;
  const doc = state.days[state.date] || {};
  patchDay(state.date, { walks: [...(doc.walks || []), v] });
  closeSheet();
  toast('Wandeling toegevoegd');
});

on('day-pain', (el) => {
  const v = Number(el.dataset.v);
  const cur = (state.days[state.date] || {}).pain;
  patchDay(state.date, { pain: cur === v ? null : v });
});

on('day-note', () => {
  const doc = state.days[state.date] || {};
  openSheet({
    title: 'Notitie bij deze dag',
    render: () => `<textarea id="daynote" class="textarea" rows="5" placeholder="Hoe voelde je rug, wat deed je anders?">${esc(doc.note || '')}</textarea>`,
    footer: () => '<button class="btn btn-primary btn-block" data-action="day-note-save">Opslaan</button>',
  });
});
on('day-note-save', () => {
  patchDay(state.date, { note: document.getElementById('daynote').value.trim() || null });
  closeSheet();
});

const REASONS = ['Ziek', 'Vakantie', 'Te druk', 'Te veel pijn', 'Anders'];
on('day-missed', () => {
  const doc = state.days[state.date] || {};
  if (doc.missed) { patchDay(state.date, { missed: null }); toast('Dag weer open'); return; }
  openSheet({
    title: 'Dag gemist',
    render: () => `<p class="lead">Geeft niks. Wat was er? Je taken van vandaag komen dan op niet gelukt.</p>
      <div class="chips">${REASONS.map((r) => `<button class="chip" data-action="day-missed-save" data-r="${r}">${r}</button>`).join('')}</div>
      <p class="hint">Een hele week weg? Zet hem bij Instellingen als pauzeweek, dan schuift je schema op.</p>`,
  });
});
on('day-missed-save', (el) => {
  patchDay(state.date, { missed: { reason: el.dataset.r, at: Date.now() } });
  closeSheet();
});

on('flare-start', () => {
  openSheet({
    title: 'Opvlamming',
    render: () => `<p class="lead">Dat hoort bij herstel met golven, en het betekent geen nieuwe schade. Ritmo zet de komende 3 dagen op het flareplan, en daarna 4 dagen op het niveau van de week ervoor.</p>
      <label class="label" for="flarenote">Wat deed je, denk je?</label>
      <textarea id="flarenote" class="textarea" rows="3" placeholder="Bijvoorbeeld: 2 uur padel, of veel stilgestaan"></textarea>`,
    footer: () => '<button class="btn btn-primary btn-block" data-action="flare-save">Start het flareplan</button>',
  });
});
on('flare-save', () => {
  const note = document.getElementById('flarenote').value.trim();
  const flares = [...(state.run.flares || []).filter((f) => f.start !== state.date), { start: state.date, note }];
  patchRun({ flares });
  closeSheet();
  toast('Flareplan staat aan. Rustig aan, je komt er wel.');
});
on('flare-undo', () => {
  const p = plan(state.date);
  if (!p.flare) return;
  const start = p.flare.flare.start;
  patchRun({ flares: (state.run.flares || []).filter((f) => f.start !== start) });
  toast('Opvlamming weggehaald');
});

on('stand-delay', () => {
  patchRun({ standDelay: (state.run.standDelay || 0) + 2 });
  toast('Je blijft 2 weken langer op de vorige staanstap.');
});

on('copy', async (el) => {
  try { await navigator.clipboard.writeText(el.dataset.text); toast('Gekopieerd'); } catch { toast('Kopiëren lukte niet'); }
});

export function refreshTodaySheet() { refreshSheet(); }
