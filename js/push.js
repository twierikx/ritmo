// Daily notifications. Ritmo asks for permission, registers the phone with Firebase Cloud
// Messaging and keeps a short day plan in the profile (push.plan, push.state). A scheduled
// task in the private repository ritmo-meldingen reads that plan around 8:00 and 20:00 in
// Madrid and sends the messages: in the morning what is on today, in the evening what is
// still open, or that Ritmo was not opened yet that day.
import { state, subscribe, plan } from './store.js';
import { taskStatus, todayStr, addDays, DONE_STATES } from './engine.js';

const DAYS_AHEAD = 21;
const DEVICE_KEY = 'ritmo-push-device';

export const pushSupported = () => !state.backend.demo && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushDenied = () => 'Notification' in window && Notification.permission === 'denied';

const devices = () => ((state.profile && state.profile.push && state.profile.push.devices) || {});
const thisDevice = () => { try { return localStorage.getItem(DEVICE_KEY); } catch { return null; } };

/** Notifications are on for this phone or computer. */
export function pushOnHere() {
  const id = thisDevice();
  const d = id && devices()[id];
  return !!(d && d.token && Notification.permission === 'granted');
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone';
  return 'Computer';
}

async function deviceId(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return `d${Array.from(new Uint8Array(buf)).slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Ask for permission and register this device. Returns 'on', 'denied', 'dismissed' or 'unsupported'. */
export async function enablePush() {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm === 'denied') return 'denied';
  if (perm !== 'granted') return 'dismissed';
  const reg = await navigator.serviceWorker.ready;
  const token = await state.backend.pushToken(reg);
  if (!token) return 'unsupported';
  const id = await deviceId(token);
  try { localStorage.setItem(DEVICE_KEY, id); } catch { /* private mode */ }
  await state.backend.saveProfile(state.user.uid, { push: { on: true, devices: { [id]: { token, at: Date.now(), label: deviceLabel() } } } });
  lastSent = '';
  syncNow();
  return 'on';
}

/** Stop notifications on this device; the others keep theirs. */
export async function disablePush() {
  const id = thisDevice();
  const others = Object.entries(devices()).some(([k, d]) => k !== id && d && d.token);
  await state.backend.removePushDevice(state.user.uid, id, others);
  try { await state.backend.dropPushToken(); } catch { /* already gone */ }
  try { localStorage.removeItem(DEVICE_KEY); } catch { /* private mode */ }
}

// ---------- the day plan for the scheduled task ----------

const short = (task) => {
  const t = task.title || '';
  return t.startsWith('Sportschool') ? `sportschool${t.slice('Sportschool'.length)}` : t.charAt(0).toLowerCase() + t.slice(1);
};

function summary() {
  const today = todayStr();
  const days = {};
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = addDays(today, i);
    const titles = plan(d).tasks.filter((t) => t.required).map(short);
    if (titles.length) days[d] = titles;
  }
  const open = plan(today).tasks.filter((t) => {
    if (!t.required) return false;
    const { s } = taskStatus(t, today, state.days, state.run);
    return !DONE_STATES.has(s) && s !== 'missed';
  }).map(short);
  return { plan: days, state: { date: today, open } };
}

let lastSent = '';
let timer = null;

function syncNow() {
  if (!state.loaded || !state.run || !state.user || state.backend.demo) return;
  const push = state.profile && state.profile.push;
  if (!push || !push.on) return;
  const s = summary();
  const json = JSON.stringify(s);
  if (json === lastSent) return;
  lastSent = json;
  Promise.resolve(state.backend.savePushPlan(state.user.uid, s)).catch((err) => {
    lastSent = '';
    console.warn('[ritmo] meldingen', err);
  });
}

const soon = () => { clearTimeout(timer); timer = setTimeout(syncNow, 1500); };
let started = false;

/** Keep the day plan current while Ritmo is open; opening the app also tells the evening message. */
export function startPushSync() {
  if (started) return;
  started = true;
  subscribe((why) => { if (why === 'day' || why === 'run' || why === 'remote') soon(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(); });
  soon();
}

// For checks in the browser console.
export { summary as daySummary };
