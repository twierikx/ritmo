// App state and saving. Local changes show at once; the backend saves them in the background.
import { deepMerge, todayStr, mondayOf, addDays, earnedStickers, planFor } from './engine.js';
import { getProgram } from './programs/index.js';
import { toast } from './ui.js';

export const state = {
  backend: null,
  user: null,
  profile: null,
  run: null,
  program: getProgram(),
  days: {},
  date: todayStr(),
  view: 'today',
  gymSession: null,
  ui: { open: {}, month: null, theory: null, liftChart: 'backext', warmOpen: false },
  loaded: false,
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emit = (why) => listeners.forEach((fn) => fn(why));

const saveError = (err) => {
  console.error('[ritmo] opslaan', err);
  toast('Opslaan lukte niet. Controleer je verbinding en probeer het opnieuw.');
};

export function patchDay(date, patch) {
  const cur = state.days[date] ? structuredClone(state.days[date]) : {};
  deepMerge(cur, patch);
  state.days = { ...state.days, [date]: cur };
  Promise.resolve(state.backend.saveDay(state.user.uid, state.run.id, date, patch)).catch(saveError);
  emit('day');
}

export function patchRun(patch) {
  const next = structuredClone(state.run);
  deepMerge(next, patch);
  for (const [k, v] of Object.entries(patch)) if (Array.isArray(v)) next[k] = v;
  state.run = next;
  Promise.resolve(state.backend.saveRun(state.user.uid, state.run.id, patch)).catch(saveError);
  emit('run');
}

/** Merge day changes that came from the backend. */
export function applyDayChanges(changes) {
  const next = { ...state.days };
  for (const c of changes) {
    if (c.type === 'removed') delete next[c.id];
    else next[c.id] = c.data;
  }
  state.days = next;
  emit('remote');
}

export function setRun(run) {
  state.run = run;
  state.program = getProgram(run && run.programId);
  emit('run');
}

export const today = () => todayStr();
export const selectedMonday = () => mondayOf(state.date);

export function goDate(date) {
  state.date = date;
  emit('nav');
}

export function plan(date = state.date) {
  return planFor(state.program, state.run, state.days, date);
}

/** Stickers earned but not shown yet. */
export function newStickers() {
  if (!state.run) return [];
  const until = addDays(todayStr() > state.date ? todayStr() : state.date, 7);
  const seen = new Set(state.run.stickersSeen || []);
  return earnedStickers(state.program, state.run, state.days, until).filter((s) => !seen.has(s.idx));
}
