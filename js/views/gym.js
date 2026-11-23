// Sportschool: the exercises of training A or B for this week, with a log per set.
import { state, plan, patchDay, emit } from '../store.js';
import { longDate, todayStr, addDays, mondayOf, weekDates, parseNum, fmtNum, worstPain, pathPatch, taskStatus, DONE_STATES, dayName } from '../engine.js';
import { icon } from '../icons.js';
import { esc, on, onChange, openSheet, closeSheet, toast, confirmSheet, buzz, beep } from '../ui.js';
import { startTimer, itemSegments } from '../timer.js';
import { exerciseHistory, setsSummary, BANDS, bandLabel, legacyVariant } from './info.js';
import { afterRow } from './today.js';

const UNIT = { reps: 'herh.', sec: 's', m: 'm', min: 'min' };
const UNIT_LABEL = { reps: 'Herhalingen', sec: 'Seconden', m: 'Meter', min: 'Minuten' };
const round05 = (x) => Math.round(x * 2) / 2;

function context() {
  const date = state.date;
  const p = plan(date);
  const doc = state.days[date] || {};
  const gymTask = p.tasks.find((t) => t.kind === 'gym');
  const g = doc.gym || null;
  const hasData = !!(g && g.s && Object.values(g.ex || {}).some((e) => (e.sets || []).some((x) => x && (x.ok || x.kg != null || x.r != null || x.h != null || x.b))));
  let letter = (hasData && g.s) || state.gymSession || (gymTask && gymTask.session) || nextLetter(date);
  const flare = gymTask && gymTask.session === letter ? !!gymTask.flare : !!(g && g.flare && g.s === letter);
  let week = p.effWeek || p.info.week;
  if (!week) week = p.info.pre ? 1 : lastWeekBefore(date);
  const light = !!p.light;
  const session = state.program.session(letter, week, { light, flare });
  return { date, p, doc, g: g && g.s === letter ? g : null, otherLogged: hasData && g.s !== letter ? g.s : null, letter, flare, week, light, session, gymTask };
}

function nextLetter(date) {
  for (let i = 0; i < 7; i++) {
    const t = plan(addDays(date, i)).tasks.find((x) => x.kind === 'gym');
    if (t) return t.session;
  }
  return 'A';
}
function lastWeekBefore(date) {
  for (let i = 1; i < 120; i++) {
    const w = plan(addDays(date, -i * 7)).info.week;
    if (w) return w;
  }
  return 1;
}

const cleanSet = (x) => ({ kg: x.kg ?? null, r: x.r ?? null, ok: !!x.ok, ...(x.h != null ? { h: x.h } : {}), ...(x.b ? { b: x.b } : {}) });
const nums = (sets, k) => sets.filter((s) => s[k] != null && s[k] !== '').map((s) => Number(s[k])).filter((n) => Number.isFinite(n));

/** Which variant of an exercise is chosen: the one saved in the log, else the one the schedule names. */
function variantOf(e, log) {
  return e.variants ? ((log && log.v) || e.variant || e.variants[0].id) : null;
}
/** What a set asks for next to the repetitions: kilos, the height of your hands, or a band. */
function fieldOf(e, v) {
  if (e.variants) return (e.variants.find((x) => x.id === v) || e.variants[0]).field;
  return e.field || (e.load ? 'kg' : null);
}

/** What to try this time, from the last log of this exercise (of the same variant). */
function suggestion(e, hist, light, field) {
  const last = hist[0];
  if (!last) return { kg: null, text: e.kgHint ? `Start met ${e.kgHint}` : '' };
  const base = light ? last : (hist.find((h) => !h.light) || last);
  const top = e.reps ? e.reps[1] : null;
  const allTop = top != null && base.sets.length >= Math.max(1, e.sets - (base.light ? 1 : 0)) && base.sets.every((s) => Number(s.r) >= top);
  const calm = worstPain(base.pain, base.after) !== 'r' && base.after !== 'o';
  const red = base.pain === 'r' ? 'Vorige keer rood' : 'Ochtend erna erger';
  const worse = base.pain === 'r' || base.after === 'r';
  if (field === 'height') {
    const hs = nums(base.sets, 'h');
    if (!hs.length) return { text: '' };
    const lastH = Math.min(...hs);
    if (light) return { h: lastH, dir: 'same', text: `Lichte week: ${lastH} cm` };
    if (worse) { const h = lastH + 10; return { h, dir: 'down', text: `${red}: ${h} cm` }; }
    if (base.after === 'o') return { h: lastH, dir: 'same', text: `Zelfde hoogte, ochtend erna oranje: ${lastH} cm` };
    if (allTop && calm) {
      if (lastH <= 0) return { h: 0, dir: 'up', text: 'Bovenkant gehaald op de vloer: voeten hoger' };
      const h = Math.max(0, lastH - 10);
      return { h, dir: 'up', text: `Probeer ${h} cm` };
    }
    return { h: lastH, dir: 'same', text: `Zelfde hoogte: ${lastH} cm` };
  }
  if (field === 'band') {
    const bs = base.sets.map((s) => s.b).filter(Boolean);
    if (!bs.length) return { text: '' };
    const lastB = bs[bs.length - 1];
    if (light || base.after === 'o') return { band: lastB, dir: 'same', text: `Zelfde band: ${bandLabel(lastB).toLowerCase()}` };
    if (worse) return { band: lastB, dir: 'down', text: `${red}: neem een dikkere band` };
    if (allTop && calm) return { band: lastB, dir: 'up', text: lastB === 'geen' ? 'Bovenkant gehaald zonder band: maak het zwaarder' : 'Bovenkant gehaald: een dunnere band of geen band' };
    return { band: lastB, dir: 'same', text: `Zelfde band: ${bandLabel(lastB).toLowerCase()}` };
  }
  const kgs = base.sets.map((s) => Number(s.kg)).filter((n) => n > 0);
  const lastKg = kgs.length ? Math.max(...kgs) : null;
  if (!e.load || lastKg == null) {
    if (allTop && calm) return { kg: null, dir: 'up', text: e.measure === 'sec' ? 'Bovenkant gehaald: een zwaardere variant mag' : 'Bovenkant gehaald: maak het iets zwaarder' };
    return { kg: null, text: '' };
  }
  if (light) { const kg = round05(lastKg * 0.9); return { kg, dir: 'down', text: `Lichte week: ${fmtNum(kg)} kg` }; }
  if (base.pain === 'r') { const kg = round05(lastKg * 0.9); return { kg, dir: 'down', text: `Vorige keer rood: ${fmtNum(kg)} kg` }; }
  if (base.after === 'r') { const kg = round05(lastKg * 0.9); return { kg, dir: 'down', text: `Ochtend erna erger: ${fmtNum(kg)} kg` }; }
  if (base.after === 'o') return { kg: lastKg, dir: 'same', text: `Zelfde gewicht, ochtend erna oranje: ${fmtNum(lastKg)} kg` };
  if (allTop) {
    const inc = lastKg < 10 ? Math.min(e.step, 1) : e.step;
    const kg = round05(lastKg + inc);
    return { kg, dir: 'up', text: `Probeer ${fmtNum(kg)} kg` };
  }
  return { kg: lastKg, dir: 'same', text: `Zelfde gewicht: ${fmtNum(lastKg)} kg` };
}

export function renderGym() {
  if (state.ui.gymHome) return renderHome();
  const c = context();
  const { session, letter, light, flare, date } = c;
  const ph = state.program.phaseOf(c.week);
  const today = todayStr();
  const rel = date === today ? 'vandaag' : longDate(date).toLowerCase();
  const warm = (c.g && c.g.warm) || {};
  const warmDone = session.warmup.filter((w) => warm[w.id]).length;
  const exList = session.exercises.map((e, i) => exCard(e, i, c)).join('');
  const done = c.g && c.g.done;
  return `
    <section class="gymhead ${ph.cls}">
      ${tabs(letter)}
      <h1>${esc(session.title)}</h1>
      <p class="gym-sub">${esc(session.sub)}</p>
      <p class="effort"><span class="phase-pill ${ph.cls}">Week ${c.week}, fase ${ph.id}</span> ${esc(flare ? 'Rustig aan tijdens je opvlamming. Sla de zware deadlift over.' : ph.effort)}</p>
      ${light ? '<p class="banner b-light"><span class="banner-title">Lichte week</span> 1 set minder en ongeveer 10% minder gewicht.</p>' : ''}
      ${c.otherLogged ? `<p class="hint">Je hebt ${rel} al training ${c.otherLogged} gelogd. Die zie je onder Training ${c.otherLogged}.</p>` : ''}
      <p class="logdate">Logboek voor ${esc(rel)}${date !== today ? ' <button class="linkbtn" data-action="go-today-gym">naar vandaag</button>' : ''}</p>
      ${c.g && date < today ? afterRow(date) : ''}
    </section>

    <section class="warm ${state.ui.warmOpen ? 'is-open' : ''}">
      <button class="warm-head" data-action="warm-toggle" aria-expanded="${!!state.ui.warmOpen}">
        <span><span class="warm-title">Warming-up, 8 minuten</span><span class="warm-sub">${warmDone} van ${session.warmup.length}</span></span>
        ${icon('chevD', 'chev')}
      </button>
      ${state.ui.warmOpen ? `<div class="warm-items">${session.warmup.map((w) => `<button class="witem ${warm[w.id] ? 'is-done' : ''}" data-action="warm-item" data-id="${w.id}" aria-pressed="${!!warm[w.id]}">
        <span class="item-check">${icon('check')}</span><span class="item-txt"><span class="item-name">${esc(w.name)}</span><span class="item-target">${esc(w.target)}</span></span></button>`).join('')}</div>` : ''}
    </section>

    <section class="exlist">${exList}</section>

    <div class="gym-finish">
      ${done ? `<p class="done-note">${icon('check', 'icon-s')} Training ${letter} afgerond${date === today ? '. Morgen vraagt Ritmo hoe je rug zich voelt.' : ''}</p>` : ''}
      <button class="btn ${done ? 'btn-quiet' : 'btn-primary'} btn-block" data-action="gym-finish">${done ? 'Afronden ongedaan maken' : 'Training afronden'}</button>
    </div>`;
}

/** The first input of a set row: kilos, the height of your hands or the band you used. */
function valueField(field, e, i, s, sug) {
  const at = `data-change="set-val" data-ex="${e.id}" data-i="${i}"`;
  if (field === 'kg') {
    return `<label class="setfield"><input class="input num" type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg ?? ''}" placeholder="${sug.kg != null ? fmtNum(sug.kg).replace(',', '.') : ''}" ${at} data-k="kg" aria-label="Gewicht, set ${i + 1}"><span class="unit">kg</span></label><span class="times" aria-hidden="true">×</span>`;
  }
  if (field === 'height') {
    return `<label class="setfield"><input class="input num" type="number" inputmode="numeric" step="1" min="0" value="${s.h ?? ''}" placeholder="${sug.h != null ? sug.h : ''}" ${at} data-k="h" aria-label="Hoogte van je handen in cm, set ${i + 1}"><span class="unit">cm</span></label><span class="times" aria-hidden="true">×</span>`;
  }
  if (field === 'band') {
    const cur = s.b || '';
    return `<label class="setfield"><select class="select band" ${at} data-k="b" data-sug="${sug.band || ''}" aria-label="Band, set ${i + 1}"><option value=""${cur ? '' : ' selected'}>${sug.band ? esc(bandLabel(sug.band)) : 'Band'}</option>${BANDS.map(([id, label]) => `<option value="${id}"${cur === id ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label><span class="times" aria-hidden="true">×</span>`;
  }
  return '';
}

function exCard(e, idx, c) {
  const log = (c.g && c.g.ex && c.g.ex[e.id]) || {};
  const sets = log.sets || [];
  const rows = Math.max(e.sets, sets.length);
  const v = variantOf(e, log);
  const field = fieldOf(e, v);
  const hist0 = exerciseHistory(e.id, c.date);
  const hist = e.variants ? hist0.filter((h) => (h.v || legacyVariant(e)) === v) : hist0;
  const sug = suggestion(e, hist, c.light, field);
  const last = hist[0];
  const top = e.reps ? e.reps[1] : '';
  const okCount = sets.filter((s) => s && s.ok).length;
  const complete = okCount >= e.sets;
  const setRows = Array.from({ length: rows }, (_, i) => {
    const s = sets[i] || {};
    const ok = !!s.ok;
    return `<div class="set ${ok ? 'is-ok' : ''}">
      <span class="set-n" aria-hidden="true">${i + 1}</span>
      ${valueField(field, e, i, s, sug)}
      <label class="setfield"><input class="input num" type="number" inputmode="numeric" min="0" value="${s.r ?? ''}" placeholder="${top}" data-change="set-val" data-ex="${e.id}" data-i="${i}" data-k="r" aria-label="${UNIT_LABEL[e.measure]}, set ${i + 1}">${field && e.measure === 'reps' ? '' : `<span class="unit">${UNIT[e.measure]}</span>`}</label>
      ${e.measure === 'sec' ? `<button class="iconbtn" data-action="set-hold" data-ex="${e.id}" data-i="${i}" aria-label="Stopwatch voor set ${i + 1}">${icon('timer')}</button>` : ''}
      <button class="tick tick-s" data-action="set-ok" data-ex="${e.id}" data-i="${i}" aria-pressed="${ok}" aria-label="Set ${i + 1} ${ok ? 'gedaan' : 'afvinken'}">${icon('check')}</button>
    </div>`;
  }).join('');
  return `<article class="ex ${complete ? 'is-complete' : ''}" id="ex-${e.id}">
    <header class="ex-head">
      <span class="ex-n">${idx + 1}</span>
      <div class="ex-title">
        <h3>${esc(e.name)}</h3>
        ${e.opt ? '<p class="opt-line">Als je tijd hebt</p>' : ''}
        <p class="ex-target">${esc(e.target)}</p>
        ${e.note ? `<p class="ex-note">${esc(e.note)}</p>` : ''}
      </div>
      <button class="iconbtn" data-action="info" data-key="ex:${e.id}" aria-label="Uitleg bij ${esc(e.name)}">${icon('info')}</button>
    </header>
    ${e.variants ? `<div class="ex-variant"><div class="seg seg-s" role="group" aria-label="Kies wat je doet">${e.variants.map((x) => `<button class="${x.id === v ? 'is-on' : ''}" data-action="ex-variant" data-ex="${e.id}" data-v="${x.id}" aria-pressed="${x.id === v}">${esc(x.label)}</button>`).join('')}</div></div>` : ''}
    ${last || sug.text ? `<p class="ex-last">${last ? `Vorige keer: ${esc(setsSummary(last.sets, e.measure))}` : ''}${sug.text ? ` <span class="sugg ${sug.dir ? `d-${sug.dir}` : ''}">${esc(sug.text)}</span>` : ''}</p>` : ''}
    <div class="sets">${setRows}</div>
    <div class="ex-foot">
      <button class="chip" data-action="set-add" data-ex="${e.id}">${icon('plus', 'icon-xs')} Set</button>
      ${sets.length > e.sets ? `<button class="chip" data-action="set-remove" data-ex="${e.id}">${icon('minus', 'icon-xs')} Set</button>` : ''}
      <span class="grow"></span>
      <span class="pdot-label" aria-hidden="true">Tijdens</span>
      ${['g', 'o', 'r'].map((p) => `<button class="pdot p-${p} ${log.pain === p ? 'is-on' : ''}" data-action="ex-pain" data-ex="${e.id}" data-p="${p}" aria-pressed="${log.pain === p}" aria-label="Rug tijdens deze oefening: ${{ g: 'groen', o: 'oranje', r: 'rood' }[p]}"></button>`).join('')}
      <button class="iconbtn" data-action="ex-note" data-ex="${e.id}" aria-label="Notitie bij ${esc(e.name)}">${icon('note')}</button>
    </div>
    ${log.note ? `<p class="note">${icon('note', 'icon-xs')} ${esc(log.note)}</p>` : ''}
  </article>`;
}

function tabs(active) {
  const b = (key, label, action, extra) => `<button class="${key === active ? 'is-on' : ''}" data-action="${action}" ${extra} aria-pressed="${key === active}">${label}</button>`;
  return `<div class="seg seg-lg" role="group" aria-label="Kies training">
    ${b('A', 'Training A', 'gym-session', 'data-s="A"')}${b('B', 'Training B', 'gym-session', 'data-s="B"')}${b('home', 'Thuis', 'gym-home', '')}
  </div>`;
}

// ---------- the home routine ----------

/** The home routine of the selected day's week, logged on that day. */
function homeContext() {
  const date = state.date;
  const p = plan(date);
  const task = p.tasks.find((t) => t.id === 'home');
  let week = p.effWeek || p.info.week;
  if (!week) week = p.info.pre ? 1 : lastWeekBefore(date);
  const phase = state.program.phaseOf(week);
  const items = task ? task.items : state.program.homeItems(phase.id, week);
  const data = ((state.days[date] || {}).tasks || {}).home || {};
  const status = task ? taskStatus(task, date, state.days, state.run) : null;
  return { date, p, task, week, phase, items, data, status };
}

function renderHome() {
  const h = homeContext();
  const today = todayStr();
  const rel = h.date === today ? 'vandaag' : longDate(h.date).toLowerCase();
  const need = h.items.filter((i) => !i.optional);
  const got = need.filter((i) => h.data.items && h.data.items[i.id]).length;
  const doneElsewhere = h.status && h.status.on;
  const planned = h.task ? [] : weekDates(mondayOf(h.date)).filter((d) => plan(d).tasks.some((t) => t.id === 'home')).map(dayName);
  const allDone = got >= need.length || (h.status && DONE_STATES.has(h.status.s) && !doneElsewhere);
  const cards = h.items.map((it, i) => {
    const on = !!(h.data.items && h.data.items[it.id]);
    return `<article class="ex hx ${on ? 'is-complete' : ''}">
      <header class="ex-head">
        <span class="ex-n">${i + 1}</span>
        <div class="ex-title">
          <h3>${esc(it.name)}</h3>
          ${it.optional ? '<p class="opt-line">Als het nodig is</p>' : ''}
          <p class="ex-target">${esc(it.target)}</p>
          ${it.cue ? `<p class="ex-cue">${esc(it.cue)}</p>` : ''}
        </div>
        <button class="iconbtn" data-action="info" data-key="${it.info}" aria-label="Uitleg bij ${esc(it.name)}">${icon('info')}</button>
      </header>
      <div class="hx-foot">
        ${it.timer ? `<button class="btn btn-s btn-quiet" data-action="home-timer" data-item="${it.id}">${icon('timer', 'icon-s')} Timer</button>` : ''}
        <span class="grow"></span>
        <button class="tick" data-action="home-item" data-item="${it.id}" aria-pressed="${on}" aria-label="${esc(it.name)} ${on ? 'gedaan' : 'afvinken'}">${icon('check')}</button>
      </div>
    </article>`;
  }).join('');
  return `
    <section class="gymhead ${h.phase.cls}">
      ${tabs('home')}
      <h1>Thuisroutine</h1>
      <p class="gym-sub">${need.length} oefeningen, ongeveer 20 minuten</p>
      <p class="effort"><span class="phase-pill ${h.phase.cls}">Week ${h.week}, fase ${h.phase.id}</span> Vink elke oefening af als je hem gedaan hebt.</p>
      ${!h.task && planned.length ? `<p class="hint">Staat deze week op ${esc(planned.join(' en '))}. Doe je hem ${h.date === today ? 'vandaag' : 'op deze dag'}, dan telt hij ook mee.</p>` : ''}
      ${doneElsewhere ? `<p class="hint">Al gedaan op ${esc(dayName(h.status.on))}: die telt voor deze dag.</p>` : ''}
      <p class="logdate">Logboek voor ${esc(rel)}${h.date !== today ? ' <button class="linkbtn" data-action="go-today-gym">naar vandaag</button>' : ''}</p>
    </section>
    <section class="exlist">${cards}</section>
    <div class="gym-finish">
      <p class="home-count">${allDone ? `${icon('check', 'icon-s')} Thuisroutine gedaan` : `${got} van ${need.length} oefeningen gedaan`}</p>
      ${allDone ? '' : '<button class="btn btn-primary btn-block" data-action="home-all">Alles afvinken</button>'}
    </div>`;
}

on('gym-home', () => {
  state.ui.gymHome = true;
  emit('ui');
});

on('home-item', (el) => {
  const h = homeContext();
  const id = el.dataset.item;
  const on = !(h.data.items && h.data.items[id]);
  patchDay(h.date, pathPatch(`tasks.home.items.${id}`, on));
  if (on) {
    buzz(15);
    const need = h.items.filter((i) => !i.optional);
    const after = need.filter((i) => (i.id === id ? true : h.data.items && h.data.items[i.id])).length;
    if (after >= need.length && need.some((i) => i.id === id)) { beep('done'); toast('Thuisroutine gedaan. Mooi!'); }
  }
});

on('home-all', () => {
  const h = homeContext();
  const items = Object.fromEntries(h.items.filter((i) => !i.optional).map((i) => [i.id, true]));
  patchDay(h.date, { tasks: { home: { items } } });
  beep('done');
  toast('Thuisroutine gedaan. Mooi!');
});

on('home-timer', (el) => {
  const h = homeContext();
  const it = h.items.find((x) => x.id === el.dataset.item);
  if (!it || !it.timer) return;
  const date = h.date;
  const segments = itemSegments(it.timer);
  startTimer({
    kind: segments.length > 1 ? 'intervals' : 'countdown', title: it.name, segments, done: 'Klaar', note: it.target,
    onDone: () => patchDay(date, pathPatch(`tasks.home.items.${it.id}`, true)),
  });
});

// ---------- saving ----------

function base(c) {
  return { s: c.letter, flare: c.flare, light: c.light, week: c.week };
}
function saveSets(c, exId, sets) {
  patchDay(c.date, { gym: { ...base(c), ex: { [exId]: { sets } } } });
}
const exOf = (c, id) => c.session.exercises.find((e) => e.id === id);
const setsOf = (c, id) => [...(((c.g && c.g.ex && c.g.ex[id]) || {}).sets || [])].map((s) => (s ? { ...s } : {}));

onChange('set-val', (el) => {
  const c = context();
  const { ex, k } = el.dataset; const i = Number(el.dataset.i);
  const sets = setsOf(c, ex);
  while (sets.length <= i) sets.push({});
  sets[i][k] = k === 'b' ? (el.value || null) : parseNum(el.value);
  saveSets(c, ex, sets.map(cleanSet));
});

on('set-ok', (el) => {
  const c = context();
  const { ex } = el.dataset; const i = Number(el.dataset.i);
  const e = exOf(c, ex);
  const sets = setsOf(c, ex);
  while (sets.length <= i) sets.push({});
  const row = el.closest('.set');
  const s = sets[i];
  if (!s.ok) {
    row.querySelectorAll('[data-k]').forEach((inp) => {
      const k = inp.dataset.k;
      if (k === 'b') { if (!s.b) s.b = inp.value || inp.dataset.sug || null; return; }
      const v = parseNum(inp.value) ?? parseNum(inp.placeholder);
      if (s[k] == null && v != null) s[k] = v;
    });
    s.ok = true;
  } else s.ok = false;
  saveSets(c, ex, sets.map(cleanSet));
  if (s.ok) {
    buzz(20);
    const allDone = sets.filter((x) => x.ok).length >= e.sets;
    if (!allDone && e.rest) startTimer({ kind: 'rest', title: 'Rust', segments: [{ label: 'Rust', sec: e.rest, kind: 'walk' }] });
    if (allDone) beep('tick');
  }
});

on('set-hold', (el) => {
  const c = context();
  const { ex } = el.dataset; const i = Number(el.dataset.i);
  const e = exOf(c, ex);
  const date = c.date;
  startTimer({
    kind: 'hold', title: e.name, target: e.reps, done: 'Stop',
    onDone: (res) => {
      if (state.date !== date) return;
      const c2 = context();
      const sets = setsOf(c2, ex);
      while (sets.length <= i) sets.push({});
      sets[i].r = res.elapsed;
      sets[i].ok = true;
      saveSets(c2, ex, sets.map(cleanSet));
    },
  });
});

on('set-add', (el) => {
  const c = context();
  const { ex } = el.dataset;
  const e = exOf(c, ex);
  const sets = setsOf(c, ex);
  while (sets.length < e.sets) sets.push({});
  const prev = sets[sets.length - 1] || {};
  sets.push({ kg: prev.kg ?? null, h: prev.h ?? null, b: prev.b ?? null, r: null, ok: false });
  saveSets(c, ex, sets.map(cleanSet));
});
on('set-remove', (el) => {
  const c = context();
  const sets = setsOf(c, el.dataset.ex);
  sets.pop();
  saveSets(c, el.dataset.ex, sets.map(cleanSet));
});

on('ex-variant', (el) => {
  const c = context();
  patchDay(c.date, { gym: { ...base(c), ex: { [el.dataset.ex]: { v: el.dataset.v } } } });
});

on('ex-pain', (el) => {
  const c = context();
  const cur = ((c.g && c.g.ex && c.g.ex[el.dataset.ex]) || {}).pain;
  patchDay(c.date, { gym: { ...base(c), ex: { [el.dataset.ex]: { pain: cur === el.dataset.p ? null : el.dataset.p } } } });
});

on('ex-note', (el) => {
  const c = context();
  const id = el.dataset.ex;
  const cur = ((c.g && c.g.ex && c.g.ex[id]) || {}).note || '';
  openSheet({
    title: `Notitie: ${exOf(c, id).name}`,
    render: () => `<textarea id="exnote" class="textarea" rows="4" placeholder="Bijvoorbeeld: rechts voelde zwaarder">${esc(cur)}</textarea>`,
    footer: () => `<button class="btn btn-primary btn-block" data-action="ex-note-save" data-ex="${id}">Opslaan</button>`,
  });
});
on('ex-note-save', (el) => {
  const c = context();
  patchDay(c.date, { gym: { ...base(c), ex: { [el.dataset.ex]: { note: document.getElementById('exnote').value.trim() || null } } } });
  closeSheet();
});

on('warm-toggle', () => { state.ui.warmOpen = !state.ui.warmOpen; emit('ui'); });
on('warm-item', (el) => {
  const c = context();
  const cur = !!(c.g && c.g.warm && c.g.warm[el.dataset.id]);
  patchDay(c.date, { gym: { ...base(c), warm: { [el.dataset.id]: !cur } } });
});

on('gym-session', async (el) => {
  const c = context();
  const L = el.dataset.s;
  if (state.ui.gymHome) {
    state.ui.gymHome = false;
    if (L === c.letter) { emit('ui'); return; }
  }
  if (L === c.letter) return;
  if (c.g || c.otherLogged) {
    const ok = await confirmSheet({ title: `Training ${L} kiezen?`, text: `Je logboek van training ${c.letter} voor deze dag wordt dan gewist.`, ok: 'Wissen en wisselen', danger: true });
    if (!ok) return;
    patchDay(c.date, { gym: null });
  }
  state.gymSession = L;
  emit('ui');
});

on('gym-finish', () => {
  const c = context();
  if (c.g && c.g.done) { patchDay(c.date, { gym: { ...base(c), done: false } }); return; }
  patchDay(c.date, { gym: { ...base(c), done: true, at: Date.now() } });
  beep('done');
  buzz([30, 40, 30]);
  toast(`Training ${c.letter} afgerond. Lekker gewerkt!`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

on('go-today-gym', () => { state.date = todayStr(); emit('nav'); });
