// Timers: holds (count up), countdowns, intervals for running, rest between sets.
// One timer at a time. Time is measured from timestamps, so it stays right in the background.
import { icon } from './icons.js';
import { esc, on, beep, buzz } from './ui.js';

let active = null;
let tickHandle = null;
let wakeLock = null;

const fmt = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

function elapsed() {
  if (!active) return 0;
  const now = active.pausedAt || Date.now();
  return now - active.startedAt - active.pausedTotal;
}

function segAt(ms) {
  let acc = 0;
  for (let i = 0; i < active.segments.length; i++) {
    const len = active.segments[i].sec * 1000;
    if (ms < acc + len) return { i, seg: active.segments[i], left: acc + len - ms, len, from: acc };
    acc += len;
  }
  return null;
}
const totalMs = () => active.segments.reduce((a, s) => a + s.sec * 1000, 0);

/**
 * The segments of a routine item's timer: its own list (holds, sides), rounds that switch
 * sides, or one countdown. Short holds are marked quiet: no tick in their last seconds.
 */
export function itemSegments(tm) {
  if (tm.segments) return tm.segments.map((x) => ({ ...x }));
  const segments = [];
  if (tm.rounds) {
    for (let i = 0; i < tm.rounds; i++) {
      segments.push({ label: tm.roundLabel(i), sec: tm.sec, kind: 'run' });
      if (i < tm.rounds - 1) segments.push({ label: 'Wissel en even rust', sec: tm.rest || 20, kind: 'walk' });
    }
  } else segments.push({ label: tm.label, sec: tm.sec, kind: 'run' });
  return segments;
}

/**
 * Start a timer.
 * kind: 'hold' (counts up to target [lo, hi]) | 'countdown' | 'intervals' | 'rest'
 * segments: [{ label, sec, kind }] for countdown / intervals / rest
 * done: label of the main button. alt: { label, fn } for a second button (e.g. stopped early).
 * note: one short line under the clock.
 * onDone(result) runs when finished or when the main button is pressed.
 */
export function startTimer(opts) {
  stopTimer(false);
  active = {
    kind: opts.kind, title: opts.title || 'Timer', segments: opts.segments || [], target: opts.target || null,
    doneLabel: opts.done || (opts.kind === 'hold' ? 'Stop' : 'Klaar'), alt: opts.alt || null, onDone: opts.onDone || null, note: opts.note || '',
    startedAt: Date.now(), pausedAt: null, pausedTotal: 0, lastSeg: -1, marks: {}, minimized: opts.kind === 'rest' || !!opts.minimized,
    finished: false,
  };
  draw();
  tickHandle = setInterval(tick, 250);
  tick();
  if (active.kind !== 'rest') requestWake();
  beep('go');
}

export function stopTimer(callDone = false, extra = {}) {
  if (!active) return;
  const result = { elapsed: Math.round(elapsed() / 1000), completed: active.finished, ...extra };
  const fn = active.onDone;
  clearInterval(tickHandle);
  tickHandle = null;
  active = null;
  releaseWake();
  const root = document.getElementById('timer-root');
  root.innerHTML = '';
  root.hidden = true;
  document.body.classList.remove('has-timer', 'has-minitimer');
  if (callDone && fn) fn(result);
}

export const timerActive = () => !!active;

function tick() {
  if (!active) return;
  const ms = elapsed();
  const root = document.getElementById('timer-root');
  if (active.kind === 'hold') {
    const [lo, hi] = active.target || [0, 0];
    if (lo && ms >= lo * 1000 && !active.marks.lo) { active.marks.lo = true; beep('tick'); buzz(60); }
    if (hi && ms >= hi * 1000 && !active.marks.hi) { active.marks.hi = true; beep('done'); buzz([80, 60, 80]); }
    setText(root, '.timer-big', fmt(ms));
    setText(root, '.mini-time', fmt(ms));
    const pct = hi ? Math.min(1, ms / (hi * 1000)) : 0;
    setRing(root, pct);
    setText(root, '.timer-seg', hi ? (ms >= hi * 1000 ? 'Doel gehaald' : ms >= lo * 1000 ? `Doel: ${lo} tot ${hi} s, je zit erin` : `Doel: ${lo} tot ${hi} s`) : 'Houd vast');
    return;
  }
  const cur = segAt(ms);
  if (!cur) {
    if (!active.finished) {
      active.finished = true;
      beep('done');
      buzz([120, 80, 120, 80, 240]);
      if (active.kind === 'rest') { stopTimer(false); return; }
      setText(root, '.timer-big', '0:00');
      setText(root, '.timer-seg', 'Klaar');
      setText(root, '.timer-next', '');
      setRing(root, 1);
      const main = root.querySelector('[data-action="timer-done"]');
      if (main) main.textContent = active.doneLabel;
    }
    return;
  }
  if (cur.i !== active.lastSeg) {
    if (active.lastSeg !== -1) { beep(cur.seg.kind === 'run' ? 'go' : 'tick'); buzz(cur.seg.kind === 'run' ? [60, 60, 60] : 120); }
    active.lastSeg = cur.i;
    const next = active.segments[cur.i + 1];
    // A single segment named like the timer itself needs no second label.
    setText(root, '.timer-seg', active.segments.length === 1 && cur.seg.label === active.title ? '' : cur.seg.label);
    setText(root, '.timer-next', next ? `Daarna: ${next.label.toLowerCase()}` : '');
    const box = root.querySelector('.timer');
    if (box) box.dataset.seg = cur.seg.kind || '';
  }
  if (cur.left <= 3000 && cur.left > 0 && !cur.seg.quiet) {
    const sec = Math.ceil(cur.left / 1000);
    if (active.marks.cd !== `${cur.i}-${sec}`) { active.marks.cd = `${cur.i}-${sec}`; if (active.kind !== 'rest') beep('tick'); }
  }
  setText(root, '.timer-big', fmt(cur.left));
  setText(root, '.mini-time', fmt(cur.left));
  setText(root, '.mini-label', cur.seg.label);
  setRing(root, (ms - cur.from) / cur.len);
  setText(root, '.timer-total', active.segments.length > 1 ? `Nog ${fmt(totalMs() - ms)} in totaal` : '');
}

function setText(root, sel, text) {
  const el = root.querySelector(sel);
  if (el && el.textContent !== text) el.textContent = text;
}
const RING = 2 * Math.PI * 88;
function setRing(root, pct) {
  const el = root.querySelector('.ring-fg');
  if (el) el.style.strokeDashoffset = String(RING * (1 - Math.max(0, Math.min(1, pct))));
}

function draw() {
  const root = document.getElementById('timer-root');
  if (!active) { root.innerHTML = ''; root.hidden = true; return; }
  root.hidden = false;
  document.body.classList.toggle('has-timer', !active.minimized);
  document.body.classList.toggle('has-minitimer', !!active.minimized);
  if (active.minimized) {
    root.innerHTML = `<div class="minitimer" role="timer">
      <button class="mini-open" data-action="timer-max" aria-label="Timer openen">
        <span class="mini-label">${esc(active.kind === 'rest' ? 'Rust' : active.title)}</span>
        <span class="mini-time">0:00</span>
      </button>
      ${active.kind === 'rest' ? '<button class="btn btn-s btn-quiet" data-action="timer-plus">+15 s</button>' : ''}
      <button class="iconbtn" data-action="timer-close" aria-label="Timer stoppen">${icon('x')}</button>
    </div>`;
    return;
  }
  const paused = !!active.pausedAt;
  root.innerHTML = `<div class="timer" role="dialog" aria-modal="true" aria-label="${esc(active.title)}">
    <div class="timer-top">
      <button class="iconbtn" data-action="timer-min" aria-label="Timer verkleinen">${icon('chevD')}</button>
      <p class="timer-title">${esc(active.title)}</p>
      <button class="iconbtn" data-action="timer-close" aria-label="Timer stoppen zonder op te slaan">${icon('x')}</button>
    </div>
    <div class="timer-face">
      <svg class="ring" viewBox="0 0 200 200" aria-hidden="true">
        <circle class="ring-bg" cx="100" cy="100" r="88"/>
        <circle class="ring-fg" cx="100" cy="100" r="88" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/>
      </svg>
      <div class="timer-center">
        <p class="timer-seg"></p>
        <p class="timer-big" role="timer" aria-live="off">0:00</p>
        <p class="timer-next"></p>
      </div>
    </div>
    <p class="timer-total"></p>
    ${active.note ? `<p class="timer-note">${esc(active.note)}</p>` : ''}
    <div class="timer-ctrls">
      <button class="btn btn-quiet round" data-action="${paused ? 'timer-resume' : 'timer-pause'}" aria-label="${paused ? 'Verder' : 'Pauze'}">${icon(paused ? 'play' : 'pause')}</button>
      <button class="btn btn-primary" data-action="timer-done">${esc(active.doneLabel)}</button>
      ${active.alt ? `<button class="btn btn-quiet" data-action="timer-alt">${esc(active.alt.label)}</button>` : ''}
    </div>
  </div>`;
  active.lastSeg = -1;
  tick();
}

on('timer-pause', () => { if (active && !active.pausedAt) { active.pausedAt = Date.now(); draw(); } });
on('timer-resume', () => {
  if (active && active.pausedAt) { active.pausedTotal += Date.now() - active.pausedAt; active.pausedAt = null; draw(); }
});
on('timer-min', () => { if (active) { active.minimized = true; draw(); } });
on('timer-max', () => { if (active) { active.minimized = false; draw(); } });
on('timer-plus', () => { if (active && active.segments[0]) { active.segments[0].sec += 15; tick(); } });
on('timer-close', () => stopTimer(false));
on('timer-done', () => stopTimer(true));
on('timer-alt', () => {
  if (!active || !active.alt) return;
  const fn = active.alt.fn;
  const res = { elapsed: Math.round(elapsed() / 1000) };
  active.onDone = null;
  stopTimer(false);
  fn(res);
});

async function requestWake() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch { wakeLock = null; }
}
function releaseWake() {
  try { if (wakeLock) wakeLock.release(); } catch { /* ignore */ }
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && active && active.kind !== 'rest') requestWake();
  if (document.visibilityState === 'visible') tick();
});
