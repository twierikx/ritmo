// Theorie: the research behind the plan, as short articles to look things up.
// The texts describe one person's health, so they ship encrypted (content/theory.sealed.js).
// The code is asked once; the key then lives in the user's own profile and in this browser.
import { state, emit } from '../store.js';
import { sealed } from '../content/theory.sealed.js';
import { md } from '../md.js';
import { icon } from '../icons.js';
import { esc, on, toast } from '../ui.js';

const LOCAL_KEY = 'ritmo-theory-key';
let articles = null; // decrypted texts, only in memory
let trying = false;
let failed = false;

const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const normCode = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

async function open(key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.data));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function keyFromCode(code) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normCode(code)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromB64(sealed.salt), iterations: sealed.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
const keyFromRaw = (b64) => crypto.subtle.importKey('raw', fromB64(b64), { name: 'AES-GCM' }, true, ['decrypt']);

function storedKey() {
  let local = null;
  try { local = localStorage.getItem(LOCAL_KEY); } catch { /* storage blocked */ }
  return (state.profile && state.profile.theoryKey) || local;
}

/** Opens the texts with a key saved earlier, in the background. */
async function tryStored() {
  const raw = storedKey();
  if (!raw || trying || articles) return;
  trying = true;
  try { articles = await open(await keyFromRaw(raw)); } catch { /* an old key: ask for the code */ }
  trying = false;
  emit('ui');
}

export function renderTheory() {
  if (!articles) {
    if (storedKey() && !failed) { tryStored(); return '<p class="muted center pad">Theorie openen...</p>'; }
    return lockScreen();
  }
  const id = state.ui.theory;
  const art = id && articles.find((a) => a.id === id);
  if (art) {
    const i = articles.indexOf(art);
    const next = articles[i + 1];
    return `<article class="article">
      <button class="backlink" data-action="theory-back">${icon('chevL', 'icon-s')} Theorie</button>
      <h1>${esc(art.title)}</h1>
      <div class="prose">${md(art.md)}</div>
      ${next ? `<button class="nextcard" data-action="theory-open" data-id="${next.id}"><span class="next-label">Volgende</span><span class="next-title">${esc(next.title)}</span>${icon('chevR')}</button>` : ''}
    </article>`;
  }
  const groups = [...new Set(articles.map((a) => a.group))];
  return `<header class="pagehead"><h1>Theorie</h1><p class="lead">Waarom je doet wat je doet. Alles komt uit je onderzoeksplan.</p></header>
    ${groups.map((g) => `<section class="tgroup">
      <h2>${esc(g)}</h2>
      <div class="tlist">${articles.filter((a) => a.group === g).map((a) => `<button class="trow" data-action="theory-open" data-id="${a.id}">
        <span class="trow-txt"><span class="trow-title">${esc(a.title)}</span><span class="trow-lead">${esc(a.lead || '')}</span></span>
        ${icon('chevR', 'icon-s')}
      </button>`).join('')}</div>
    </section>`).join('')}`;
}

function lockScreen() {
  return `<header class="pagehead"><h1>Theorie</h1><p class="lead">Je theorie gaat over je eigen rug, dus die is afgeschermd. Vul één keer je code in; daarna opent hij vanzelf, ook op je andere apparaten.</p></header>
    <form class="card lockcard" data-submit="theory-unlock" novalidate>
      <label class="label" for="theorycode">Code</label>
      <input id="theorycode" class="input lockinput" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" inputmode="text">
      ${failed ? '<p class="hint err">Die code klopt niet. Kijk hem nog eens na.</p>' : ''}
      <button class="btn btn-primary btn-block" type="submit">${icon('book', 'icon-s')} Theorie openen</button>
    </form>`;
}

async function unlock() {
  const input = document.getElementById('theorycode');
  const code = input ? input.value : '';
  // A focused field holds back re-rendering, so let go of it first.
  if (input) input.blur();
  if (normCode(code).length < 8) { failed = true; emit('ui'); return; }
  const btn = document.querySelector('.lockcard .btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Openen...'; }
  try {
    const key = await keyFromCode(code);
    articles = await open(key);
    failed = false;
    const raw = toB64(await crypto.subtle.exportKey('raw', key));
    try { localStorage.setItem(LOCAL_KEY, raw); } catch { /* storage blocked */ }
    if (state.user && state.backend && state.backend.saveProfile) {
      Promise.resolve(state.backend.saveProfile(state.user.uid, { theoryKey: raw })).catch(() => {});
    }
    toast('Theorie geopend');
  } catch {
    failed = true;
  }
  emit('ui');
}

on('theory-unlock', (el, ev) => { if (ev) ev.preventDefault(); unlock(); });
on('theory-open', (el) => { state.ui.theory = el.dataset.id; emit('nav'); window.scrollTo(0, 0); });
on('theory-back', () => { state.ui.theory = null; emit('nav'); window.scrollTo(0, 0); });
