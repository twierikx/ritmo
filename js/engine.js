// Engine: dates, weeks, plans, task statuses and stickers.
// Knows nothing about one particular schedule: a program module (js/programs/) supplies buildDay().

export const DAY_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const fmtDate = (t) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export const addDays = (s, n) => fmtDate(parseDate(s) + n * DAY_MS);
export const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY_MS);
/** 1 = Monday ... 7 = Sunday */
export const dow = (s) => {
  const g = new Date(parseDate(s)).getUTCDay();
  return g === 0 ? 7 : g;
};
export const mondayOf = (s) => addDays(s, 1 - dow(s));
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const weekDates = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const DAYS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const DAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus',
  'september', 'oktober', 'november', 'december'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const dayName = (s) => DAYS[dow(s) - 1];
export const longDate = (s) => {
  const t = new Date(parseDate(s));
  return `${cap(DAYS[dow(s) - 1])} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
};
export const shortDate = (s) => {
  const t = new Date(parseDate(s));
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()].slice(0, 3)}`;
};
export const monthName = (y, m) => `${cap(MONTHS[m])} ${y}`;

// ---------- weeks of a run ----------

/** The program week per calendar week since the start. 'P' marks a pause week. */
export function sequenceOf(run, program) {
  if (Array.isArray(run.sequence) && run.sequence.length) return run.sequence;
  return Array.from({ length: program.weeks }, (_, i) => i + 1);
}

export function weekInfo(program, run, date) {
  const idx = Math.floor(diffDays(run.start, date) / 7);
  const seq = sequenceOf(run, program);
  const total = seq.filter((x) => x !== 'P').length;
  if (idx < 0) return { pre: true, idx, daysToStart: diffDays(date, run.start), total };
  if (idx >= seq.length) return { finished: true, idx, total };
  const entry = seq[idx];
  if (entry === 'P') return { pause: true, idx, total };
  // How many program weeks were done before this one (a repeated week counts again).
  const n = seq.slice(0, idx + 1).filter((x) => x !== 'P').length;
  return { idx, week: entry, n, total, monday: addDays(run.start, idx * 7) };
}

/** Flare state of a date: day 1-3 of a flare-up, or the recovery days 4-7. */
export function flareState(run, date) {
  const flares = [...(run.flares || [])].sort((a, b) => (a.start < b.start ? 1 : -1));
  for (const f of flares) {
    const d = diffDays(f.start, date);
    if (d >= 0 && d <= 2) return { day: d + 1, flare: f };
    if (d >= 3 && d <= 6) return { recovery: true, rday: d + 1, flare: f };
  }
  return null;
}

export function makeApi(program, run, days) {
  return {
    addDays, diffDays, dow, mondayOf, parseDate,
    weekInfo: (d) => weekInfo(program, run, d),
    flareState: (d) => flareState(run, d),
    day: (d) => days[d] || null,
    days,
    run,
  };
}

const planCache = new WeakMap();
/** The plan of one date: { tasks, banners, week, phase, ... } */
export function planFor(program, run, days, date) {
  let byDate = planCache.get(days);
  if (!byDate || byDate.run !== run) {
    byDate = { run, map: new Map() };
    planCache.set(days, byDate);
  }
  const hit = byDate.map.get(date);
  if (hit) return hit;
  const info = weekInfo(program, run, date);
  const plan = program.buildDay({ date, dow: dow(date), info, run, days, api: makeApi(program, run, days) });
  plan.info = info;
  plan.date = date;
  byDate.map.set(date, plan);
  return plan;
}

// ---------- statuses ----------

export const DONE_STATES = new Set(['done', 'adapted', 'na']);

/** Find a day in the same calendar week whose doc matches pred. */
function inWeek(date, days, pred) {
  const mon = mondayOf(date);
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    const doc = days[d];
    if (doc && pred(doc, d)) return d;
  }
  return null;
}

/**
 * Status of a task on a date: 'done' | 'adapted' | 'na' | 'missed' | 'partial' | 'open'.
 * Also returns where it was done when that was another day of the week.
 */
export function taskStatus(task, date, days, run) {
  const doc = days[date] || {};
  const t = (doc.tasks && doc.tasks[task.id]) || {};
  if (t.s === 'done' || t.s === 'adapted' || t.s === 'na' || t.s === 'missed') return { s: t.s };

  switch (task.kind) {
    case 'gym': {
      const elsewhere = inWeek(date, days, (d) => d.gym && d.gym.s === task.session && d.gym.done);
      if (elsewhere) return { s: days[elsewhere].gym.flare ? 'adapted' : 'done', on: elsewhere !== date ? elsewhere : null };
      if (doc.gym && doc.gym.s === task.session && hasSets(doc.gym)) return { s: 'partial' };
      break;
    }
    case 'long': {
      const elsewhere = inWeek(date, days, (d) => d.tasks && d.tasks.long && (d.tasks.long.min > 0));
      if (elsewhere) return { s: 'done', on: elsewhere !== date ? elsewhere : null };
      break;
    }
    case 'list': {
      const need = task.items.filter((i) => !i.optional);
      const got = need.filter((i) => t.items && t.items[i.id]).length;
      if (need.length && got >= need.length) return { s: 'done' };
      if (task.flexDows) {
        const elsewhere = flexDone(task, date, days, need);
        if (elsewhere) return { s: 'done', on: elsewhere };
      }
      if (got > 0) return { s: 'partial' };
      break;
    }
    case 'blocks': {
      const got = (t.blocks || []).filter((b) => b === 'd' || b === 's').length;
      if (got >= task.blocks) return { s: 'done' };
      if (got > 0) return { s: 'partial' };
      break;
    }
    case 'counter': {
      const n = t.n || 0;
      if (n >= task.min) return { s: 'done' };
      if (n > 0) return { s: 'partial' };
      break;
    }
    case 'walk':
      if (t.min > 0) return { s: 'done' };
      break;
    case 'test': {
      const res = run && run.tests && run.tests[task.moment];
      if (res && res[task.part + 'At']) return { s: 'done' };
      break;
    }
    default:
      break;
  }
  if (doc.missed && task.required) return { s: 'missed' };
  return { s: 'open' };
}

/**
 * A routine that is planned on some days of the week (task.flexDows) but done on another
 * day of that week counts for the first planned day that is still open.
 */
function flexDone(task, date, days, need) {
  const complete = (d) => {
    const x = days[d] && days[d].tasks && days[d].tasks[task.id];
    if (!x) return false;
    if (x.s === 'done' || x.s === 'adapted' || x.s === 'na') return true;
    return need.every((i) => x.items && x.items[i.id]);
  };
  const week = weekDates(mondayOf(date));
  const planned = week.filter((d) => task.flexDows.includes(dow(d)));
  const extra = week.filter((d) => !task.flexDows.includes(dow(d)) && complete(d));
  const open = planned.filter((d) => !complete(d) && !(days[d] && days[d].tasks && days[d].tasks[task.id] && days[d].tasks[task.id].s === 'missed'));
  const k = open.indexOf(date);
  return k >= 0 && k < extra.length ? extra[k] : null;
}

function hasSets(gym) {
  return Object.values(gym.ex || {}).some((e) => (e.sets || []).some((x) => x && x.ok));
}

/** Score of a day: required tasks done (done/adapted/na) out of the required total. */
export function dayScore(program, run, days, date) {
  const plan = planFor(program, run, days, date);
  let total = 0; let done = 0; let missed = 0; let partial = 0;
  for (const task of plan.tasks) {
    if (!task.required) continue;
    total++;
    const { s } = taskStatus(task, date, days, run);
    if (DONE_STATES.has(s)) done++;
    else if (s === 'missed') missed++;
    else if (s === 'partial') partial++;
  }
  const doc = days[date] || {};
  return { total, done, missed, partial, flare: !!(plan.flare && plan.flare.day), pause: !!plan.info.pause, missedDay: !!doc.missed, plan };
}

/** A sticker week: every required task of the 7 days done (flare and 'vervalt' count). */
export function weekResult(program, run, days, monday) {
  const info = weekInfo(program, run, monday);
  if (info.pre || info.finished || info.pause) return { eligible: false };
  let total = 0; let done = 0;
  for (const d of weekDates(monday)) {
    const sc = dayScore(program, run, days, d);
    total += sc.total; done += sc.done;
  }
  return { eligible: true, idx: info.idx, week: info.week, total, done, complete: total > 0 && done >= total };
}

/** All stickers earned so far, in order. */
export function earnedStickers(program, run, days, untilDate) {
  const seq = sequenceOf(run, program);
  const out = [];
  for (let i = 0; i < seq.length; i++) {
    const monday = addDays(run.start, i * 7);
    if (monday > untilDate) break;
    const r = weekResult(program, run, days, monday);
    if (r.eligible && r.complete) out.push({ idx: i, week: r.week, monday });
  }
  return out;
}

// ---------- small helpers ----------

/** Traffic-light colours, mildest first. worstPain('g', 'o', null) === 'o'. */
export const PAIN_ORDER = ['g', 'o', 'r'];
export function worstPain(...vals) {
  let worst = null;
  for (const v of vals) if (PAIN_ORDER.includes(v) && (worst == null || PAIN_ORDER.indexOf(v) > PAIN_ORDER.indexOf(worst))) worst = v;
  return worst;
}

export function deepMerge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
      deepMerge(target[k], v);
    } else if (v === undefined) {
      // skip
    } else {
      target[k] = v;
    }
  }
  return target;
}

/** Build a nested patch object from a dotted path: setPath('tasks.stand.s', 'done'). */
export function pathPatch(path, value) {
  const keys = path.split('.');
  const root = {};
  let cur = root;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else { cur[k] = {}; cur = cur[k]; }
  });
  return root;
}

export const fmtNum = (n, digits = 1) => {
  if (n == null || Number.isNaN(n)) return '';
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(r).replace('.', ',');
};
export const parseNum = (s) => {
  if (s == null || s === '') return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const fmtMin = (min) => {
  if (min == null) return '';
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} uur ${m} min` : `${h} uur`;
};
