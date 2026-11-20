// Demo backend: everything stays in this browser (localStorage), with example data.
// Same interface as backend-firebase.js. Open the app with ?demo to use it.
import { addDays, mondayOf, todayStr, planFor, deepMerge } from './engine.js';
import { getProgram, defaultProgramId } from './programs/index.js';

const KEY = 'ritmo-demo-v2';
// ?demo=leeg starts without example data, like a brand-new account.
const EMPTY = new URLSearchParams(location.search).get('demo') === 'leeg' || window.RITMO_DEMO === 'leeg';
const USER = { uid: 'demo', name: '', email: '', photo: '' };

let db = load();
const subs = { profile: new Set(), run: new Set(), days: new Set() };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ }
}

function seed() {
  const program = getProgram(defaultProgramId);
  const start = addDays(mondayOf(todayStr()), -7);
  const runId = 'demo-run';
  const run = { id: runId, programId: program.id, start, hikeDay: 'sun', createdAt: Date.now(), stickersSeen: [],
    tests: { start: { soren: 62, flex: 105, sideL: 48, sideR: 41, gymAt: Date.now(), stand: 25, walk: 45, rHike: 4, rDance: 6, rStand: 3, pain: 3, homeAt: Date.now() } } };
  const days = {};
  const kg = { hipthrust: 50, revhyper: 3, stepup: 8, abdCable: 5, latpull: 30, pushup: 0, chop: 10, suitcase: 16, treadmill: 0,
    rdl: 35, backext: 10, bss: 8, copen1: 0, row: 30, pallof: 10, soren: 5 };
  const gymLog = (letter, week) => {
    const s = program.session(letter, week);
    const ex = {};
    for (const e of s.exercises) {
      const top = e.reps ? e.reps[1] : 8;
      ex[e.id] = { sets: Array.from({ length: e.sets }, (_, i) => ({ kg: e.load ? kg[e.id] ?? null : null, r: e.measure === 'sec' ? top - 5 : Math.max(1, top - (i === e.sets - 1 ? 1 : 0)), ok: true })), pain: 'g' };
    }
    return { s: letter, week, ex, done: true, at: Date.now() };
  };
  const pains = [2, 3, 2, 2, 1, 2, 1, 2, 3, 2];
  const today = todayStr();
  for (let i = 0; i < 14; i++) {
    const date = addDays(start, i);
    if (date >= today) break;
    const plan = planFor(program, run, days, date);
    const doc = { tasks: {}, pain: pains[i % pains.length] };
    for (const t of plan.tasks) {
      if (!t.required) continue;
      if (t.kind === 'gym') doc.gym = gymLog(t.session, 1);
      else if (t.kind === 'list') doc.tasks[t.id] = { items: Object.fromEntries(t.items.map((it) => [it.id, true])) };
      else if (t.kind === 'blocks') doc.tasks[t.id] = { blocks: Array.from({ length: t.blocks }, (_, k) => (i === 1 && k === 2 ? 's' : 'd')) };
      else if (t.kind === 'walk') doc.tasks[t.id] = { min: t.target + 2, pain: 'g', mode: 'walk' };
      else if (t.kind === 'long') doc.tasks[t.id] = { min: t.target, pain: 'g' };
    }
    // The morning after a training; yesterday is left open so the morning check appears.
    if ((doc.gym || doc.tasks.long) && date !== addDays(today, -1)) doc.after = date === mondayOf(today) ? 'o' : 'g';
    days[date] = doc;
  }
  // Today: a start, so there is something left to do.
  const tp = planFor(program, run, days, today);
  const doc = { tasks: {} };
  const stand = tp.tasks.find((t) => t.kind === 'blocks');
  if (stand) doc.tasks.stand = { blocks: ['d', 'd'] };
  days[today] = doc;
  return { profile: { activeRunId: runId, name: USER.name }, runs: { [runId]: run }, days: { [runId]: days } };
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const notify = (kind) => {
  persist();
  for (const fn of subs[kind]) fn();
};

export const backend = {
  demo: true,

  onAuth(cb) {
    setTimeout(() => cb(USER), 0);
    return () => {};
  },
  async signIn() {},
  signOut() {
    try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
    db = null;
    location.reload();
  },

  watchProfile(uid, cb) {
    if (!db) { db = EMPTY ? { profile: {}, runs: {}, days: {} } : seed(); persist(); }
    const fn = () => cb(clone(db.profile));
    subs.profile.add(fn); fn();
    return () => subs.profile.delete(fn);
  },
  async saveProfile(uid, patch) {
    deepMerge(db.profile, patch);
    notify('profile');
  },
  // No notifications in the demo: there is no account for a scheduled task to read.
  async pushToken() { return null; },
  async dropPushToken() {},
  async savePushPlan() {},
  async removePushDevice() {},

  async createRun(uid, data) {
    const id = `run-${Date.now().toString(36)}`;
    db.runs[id] = { ...clone(data), id };
    db.days[id] = {};
    persist();
    return id;
  },
  async listRuns() {
    return Object.values(db.runs).map(clone);
  },
  watchRun(uid, runId, cb) {
    const fn = () => cb(db.runs[runId] ? clone(db.runs[runId]) : null);
    subs.run.add(fn); fn();
    return () => subs.run.delete(fn);
  },
  async saveRun(uid, runId, patch) {
    const cur = db.runs[runId] || {};
    deepMerge(cur, clone(patch));
    db.runs[runId] = cur;
    notify('run');
  },

  watchDays(uid, runId, cb) {
    let first = true;
    const fn = () => {
      const days = db.days[runId] || {};
      if (first) { first = false; cb(Object.entries(days).map(([id, data]) => ({ type: 'added', id, data: clone(data) }))); }
    };
    subs.days.add(fn); fn();
    return () => subs.days.delete(fn);
  },
  async saveDay(uid, runId, date, patch) {
    db.days[runId] = db.days[runId] || {};
    const cur = db.days[runId][date] || {};
    deepMerge(cur, clone(patch));
    db.days[runId][date] = cur;
    persist();
  },
};
