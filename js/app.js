// Ritmo: start-up, sign-in, routing and the app shell.
import { state, subscribe, emit, setRun, applyDayChanges, newStickers, patchRun } from './store.js';
import { actions, changes, on, closeSheet, refreshSheet, sheetOpen, primeAudio, toast, esc } from './ui.js';
import { icon, googleG } from './icons.js';
import { getProgram, defaultProgramId } from './programs/index.js';
import { todayStr, mondayOf, addDays, dow } from './engine.js';
import { celebrate, closeCelebration } from './stickers.js';
import { renderToday } from './views/today.js';
import { renderGym } from './views/gym.js';
import { renderProgress } from './views/progress.js';
import { renderTheory } from './views/theory.js';
import { openWelcome, loadPrefs } from './views/settings.js';
import { maybeAfterCheck } from './views/aftercheck.js';
import './views/info.js';
import './charts.js';
import './timer.js';

const params = new URLSearchParams(location.search);
// ?demo opens a version with example data that only lives in this browser.
const isDemo = params.has('demo') || !!window.RITMO_DEMO;
const app = document.getElementById('app');

const ROUTES = { vandaag: 'today', sport: 'gym', voortgang: 'progress', theorie: 'theory' };
const VIEWS = { today: renderToday, gym: renderGym, progress: renderProgress, theory: renderTheory };

const mark = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true">
  <rect x="3" y="14" width="5" height="15" rx="2.5" fill="var(--c1)"/>
  <rect x="10" y="6" width="5" height="23" rx="2.5" fill="var(--c2)"/>
  <rect x="17" y="11" width="5" height="18" rx="2.5" fill="var(--c3)"/>
  <rect x="24" y="3" width="5" height="26" rx="2.5" fill="var(--c4)"/>
</svg>`;

function routeFromHash() {
  const key = (location.hash.replace(/^#\/?/, '') || 'vandaag').split('/')[0];
  return ROUTES[key] || 'today';
}

// ---------- rendering ----------

let pending = false;
function inputFocused() {
  const a = document.activeElement;
  return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#view');
}

function render() {
  if (!state.user) { renderLogin(); return; }
  if (!state.loaded) { renderLoading(); return; }
  if (inputFocused()) { pending = true; return; }
  pending = false;
  const view = state.view;
  let shell = document.querySelector('.shell');
  if (!shell) {
    app.innerHTML = `<div class="shell">
      <header class="topbar">
        <a class="brand" href="#/vandaag" aria-label="Ritmo, naar vandaag">${mark}<span class="wordmark">ritmo</span>${state.backend.demo ? '<span class="demo-tag">proef</span>' : ''}</a>
        <button class="iconbtn" data-action="settings" aria-label="Instellingen">${icon('settings')}</button>
      </header>
      <main id="view" class="view" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Hoofdmenu">
        <a href="#/vandaag" data-tab="today">${icon('sun')}<span>Vandaag</span></a>
        <a href="#/sport" data-tab="gym">${icon('dumbbell')}<span>Sportschool</span></a>
        <a href="#/voortgang" data-tab="progress">${icon('star')}<span>Voortgang</span></a>
        <a href="#/theorie" data-tab="theory">${icon('book')}<span>Theorie</span></a>
      </nav>
    </div>`;
    shell = document.querySelector('.shell');
  }
  shell.querySelectorAll('.tabbar a').forEach((a) => {
    const on = a.dataset.tab === view;
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const el = document.getElementById('view');
  el.className = `view view-${view}`;
  try {
    el.innerHTML = VIEWS[view]();
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="errorbox"><h1>Er ging iets mis</h1><p>Deze pagina kon niet getekend worden. Ga terug naar Vandaag of herlaad de app.</p><pre>${esc(err && err.message)}</pre></div>`;
  }
}

function renderLogin() {
  app.innerHTML = `<main class="login">
    <div class="login-hero">
      <div class="login-mark">${mark}</div>
      <h1 class="wordmark big">ritmo</h1>
      <p class="tagline">Je rugplan, dag voor dag. Afvinken, opbouwen, stickers verdienen.</p>
    </div>
    <div class="login-actions">
      <button class="btn btn-google btn-block" data-action="sign-in">${googleG} Inloggen met Google</button>
      <a class="linkbtn" href="?demo">Eerst rondkijken met voorbeelddata</a>
    </div>
    <p class="fine">Je gegevens staan in je eigen account. Alleen jij kunt ze zien.</p>
  </main>`;
}

function renderLoading() {
  app.innerHTML = `<main class="loading"><div class="login-mark pulse">${mark}</div><p>Je schema laden</p></main>`;
}

function renderError(title, text, detail) {
  app.innerHTML = `<main class="login"><div class="errorbox"><h1>${esc(title)}</h1><p>${esc(text)}</p>${detail ? `<pre>${esc(detail)}</pre>` : ''}
    <button class="btn btn-primary" onclick="location.reload()">Opnieuw proberen</button></div></main>`;
}

// ---------- stickers ----------

let celebrating = false;
/** New week stickers first; with thenAfter, the morning-after check once those are done. */
function checkStickers(thenAfter = false) {
  if (celebrating || !state.loaded || !state.run) return;
  const fresh = newStickers();
  if (!fresh.length) {
    if (thenAfter === true) setTimeout(() => { if (!celebrating) maybeAfterCheck(); }, 300);
    return;
  }
  const s = fresh[0];
  celebrating = true;
  celebrate({
    idx: s.idx, week: s.week,
    onClose: () => {
      celebrating = false;
      patchRun({ stickersSeen: [...(state.run.stickersSeen || []), s.idx] });
      setTimeout(() => checkStickers(true), 400);
    },
  });
}
on('cele-close', () => closeCelebration());

// ---------- data ----------

let unsubs = [];
let runUnsubs = [];
let daysReady = false;
let welcomePending = false;

function clearSubs(list) { list.forEach((f) => { try { f(); } catch { /* ignore */ } }); list.length = 0; }

function firstStart(program) {
  const today = todayStr();
  if (program.defaultStart && program.defaultStart >= today) return program.defaultStart;
  return dow(today) === 1 ? today : addDays(mondayOf(today), 7);
}

let creatingRun = false;
async function createFirstRun(user) {
  const program = getProgram(defaultProgramId);
  const runId = await state.backend.createRun(user.uid, {
    programId: program.id, start: firstStart(program), hikeDay: 'sun', createdAt: Date.now(), stickersSeen: [],
  });
  welcomePending = true;
  await state.backend.saveProfile(user.uid, { activeRunId: runId, name: user.name, createdAt: Date.now() });
}

function dataError(err) {
  const denied = err && /permission/i.test(String(err.code || err.message));
  renderError(
    denied ? 'Geen toegang tot je gegevens' : 'Je gegevens laden lukte niet',
    denied ? 'De database staat Ritmo nog niet toe om te lezen. De toegangsregels moeten nog worden ingesteld.' : 'Controleer je internetverbinding en probeer het opnieuw.',
    err && (err.code || err.message),
  );
}

function watchRun(runId) {
  clearSubs(runUnsubs);
  daysReady = false;
  state.loaded = false;
  state.days = {};
  const { backend, user } = state;
  runUnsubs.push(backend.watchRun(user.uid, runId, (run) => {
    if (!run) return;
    setRun(run);
    ready();
  }, dataError));
  runUnsubs.push(backend.watchDays(user.uid, runId, (ch) => {
    applyDayChanges(ch);
    daysReady = true;
    ready();
  }, dataError));
}

function ready() {
  if (state.loaded || !state.run || !daysReady) return;
  state.loaded = true;
  state.view = routeFromHash();
  render();
  if (welcomePending) { welcomePending = false; openWelcome(); }
  setTimeout(() => checkStickers(true), 600);
}

function onUser(user) {
  clearSubs(unsubs);
  clearSubs(runUnsubs);
  state.user = user;
  state.run = null;
  state.days = {};
  state.loaded = false;
  if (!user) { render(); return; }
  renderLoading();
  unsubs.push(state.backend.watchProfile(user.uid, async (profile) => {
    state.profile = profile;
    if (!profile || !profile.activeRunId) {
      if (creatingRun) return;
      creatingRun = true;
      try { await createFirstRun(user); } catch (err) { creatingRun = false; dataError(err); }
      return;
    }
    if (state.run && state.run.id === profile.activeRunId) return;
    watchRun(profile.activeRunId);
  }, dataError));
}

// ---------- events ----------

document.addEventListener('click', (e) => {
  primeAudio();
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === 'A' && el.getAttribute('href') && !el.dataset.action) return;
  e.preventDefault();
  try { fn(el, e); } catch (err) { console.error(err); toast('Dat lukte niet. Probeer het nog eens.'); }
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-submit]');
  if (!form) return;
  e.preventDefault();
  const fn = actions[form.dataset.submit];
  if (fn) fn(form, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = changes[el.dataset.change];
  if (fn) fn(el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (celebrating) { closeCelebration(); return; }
    if (sheetOpen()) { closeSheet(); return; }
  }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('input[data-change]')) { e.target.blur(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-action]:not(button):not(a):not(input)')) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
});
document.addEventListener('focusout', () => { if (pending) setTimeout(() => { if (!inputFocused()) render(); }, 0); });

window.addEventListener('hashchange', () => {
  const v = routeFromHash();
  if (v !== state.view) {
    state.view = v;
    if (v !== 'theory') state.ui.theory = null;
    render();
    window.scrollTo(0, 0);
  } else render();
});

on('sign-in', async () => {
  try {
    await state.backend.signIn();
  } catch (err) {
    console.error(err);
    if (err && err.code === 'auth/popup-closed-by-user') return;
    toast('Inloggen lukte niet. Probeer het nog eens.');
  }
});

subscribe((why) => {
  render();
  if (why !== 'nav' && why !== 'ui') refreshSheet();
  if (why === 'day' || why === 'remote' || why === 'run') setTimeout(() => checkStickers(), 350);
});

// The date rolls over at midnight when the app stays open.
let lastToday = todayStr();
setInterval(() => {
  const t = todayStr();
  if (t !== lastToday) {
    if (state.date === lastToday) state.date = t;
    lastToday = t;
    emit('nav');
    checkStickers(true);
  }
}, 60000);

// Back to the app (for example the next morning): stickers and the morning-after check.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = todayStr();
  if (t !== lastToday) {
    if (state.date === lastToday) state.date = t;
    lastToday = t;
    emit('nav');
  }
  setTimeout(() => checkStickers(true), 500);
});

// ---------- boot ----------

async function boot() {
  loadPrefs();
  let backend;
  try {
    backend = isDemo ? (await import('./backend-demo.js')).backend : (await import('./backend-firebase.js')).backend;
  } catch (err) {
    console.error(err);
    renderError('Ritmo kan niet starten', 'De verbinding met de database lukte niet. Ben je online?', err && err.message);
    return;
  }
  state.backend = backend;
  backend.onAuth(onUser);
  if (!window.RITMO_DEMO && 'serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js').catch(() => { /* not available here */ }); } catch { /* not available here */ }
  }
}

boot();
