// Shared UI plumbing: action registry, sheets, toasts, sounds.
import { icon } from './icons.js';
import { esc } from './md.js';

export { esc };

// ---------- actions (event delegation) ----------
// Elements carry data-action="name"; inputs carry data-change="name" (fires on change).
export const actions = {};
export const changes = {};
export const on = (name, fn) => { actions[name] = fn; };
export const onChange = (name, fn) => { changes[name] = fn; };

// ---------- sheets ----------
const stack = [];

function renderTop() {
  const root = document.getElementById('sheet-root');
  const top = stack[stack.length - 1];
  if (!top) {
    root.innerHTML = '';
    root.hidden = true;
    document.body.classList.remove('has-sheet');
    return;
  }
  const scroll = root.querySelector('.sheet-body')?.scrollTop || 0;
  const sameSheet = root.dataset.sheetId === top.id;
  root.hidden = false;
  document.body.classList.add('has-sheet');
  root.dataset.sheetId = top.id;
  root.innerHTML = `
    <div class="sheet-backdrop" data-action="sheet-close"></div>
    <section class="sheet ${top.cls || ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title-${top.id}" tabindex="-1">
      <div class="sheet-grip" aria-hidden="true"></div>
      <header class="sheet-head">
        <h2 id="sheet-title-${top.id}">${esc(top.title)}</h2>
        <button class="iconbtn" data-action="sheet-close" aria-label="Sluiten">${icon('x')}</button>
      </header>
      <div class="sheet-body">${top.render()}</div>
      ${top.footer ? `<footer class="sheet-foot">${top.footer()}</footer>` : ''}
    </section>`;
  const body = root.querySelector('.sheet-body');
  if (sameSheet) body.scrollTop = scroll;
  else root.querySelector('.sheet').focus({ preventScroll: true });
  if (top.mount) top.mount(root.querySelector('.sheet'));
}

let sheetSeq = 0;
/** Open a bottom sheet. render() returns the body HTML and is called again by refreshSheet(). */
export function openSheet({ title, render, footer, cls, onClose, mount }) {
  const s = { id: `s${++sheetSeq}`, title, render, footer, cls, onClose, mount };
  stack.push(s);
  renderTop();
  return s;
}
export function closeSheet() {
  const s = stack.pop();
  if (s && s.onClose) s.onClose();
  renderTop();
}
export function closeAllSheets() {
  while (stack.length) {
    const s = stack.pop();
    if (s.onClose) s.onClose();
  }
  renderTop();
}
export function refreshSheet() {
  if (!stack.length) return;
  const active = document.activeElement;
  if (active && active.closest && active.closest('#sheet-root') && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
  renderTop();
}
export const sheetOpen = () => stack.length > 0;
on('sheet-close', () => closeSheet());

/** A yes/no question in a sheet. Resolves true or false. */
export function confirmSheet({ title, text, ok = 'Ja', cancel = 'Annuleren', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    on('confirm-ok', () => { closeSheet(); finish(true); });
    on('confirm-cancel', () => { closeSheet(); finish(false); });
    openSheet({
      title,
      render: () => `<p class="lead">${esc(text)}</p>`,
      footer: () => `<button class="btn btn-quiet" data-action="confirm-cancel">${esc(cancel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm-ok">${esc(ok)}</button>`,
      onClose: () => finish(false),
    });
  });
}

// ---------- toast ----------
let toastTimer = null;
export function toast(msg, { action, actionLabel } = {}) {
  const root = document.getElementById('toast-root');
  root.innerHTML = `<div class="toast" role="status">${esc(msg)}${action ? ` <button class="toast-btn" data-action="${action}">${esc(actionLabel)}</button>` : ''}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, action ? 5000 : 2600);
}

// ---------- sound and touch ----------
let audio = null;
export const prefs = { sound: true, vibrate: true };
// Browsers only allow sound and vibration after the first tap on the page.
const touched = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
function ctx() {
  if (!touched()) return null;
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
/** Short tones. kind: tick | go | done | cheer */
export function beep(kind = 'tick') {
  if (!prefs.sound) return;
  const a = ctx();
  if (!a) return;
  const seqs = {
    tick: [[880, 0.08]],
    go: [[660, 0.1], [990, 0.16]],
    done: [[784, 0.12], [988, 0.12], [1319, 0.28]],
    cheer: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.32]],
  };
  let t = a.currentTime + 0.02;
  for (const [f, d] of seqs[kind] || seqs.tick) {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + d + 0.02);
    t += d + 0.04;
  }
}
export function buzz(pattern = 30) {
  if (prefs.vibrate && navigator.vibrate && touched()) navigator.vibrate(pattern);
}
/** Unlock audio on the first touch (mobile browsers need a user gesture). */
export function primeAudio() { ctx(); }

export const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
