// Instellingen: start date, hike day, pause weeks, sound, data export, a new schedule, sign out.
import { state, patchRun } from '../store.js';
import { mondayOf, longDate, addDays, sequenceOf, diffDays, todayStr } from '../engine.js';
import { programs } from '../programs/index.js';
import { icon } from '../icons.js';
import { esc, on, onChange, openSheet, closeSheet, refreshSheet, toast, confirmSheet, prefs } from '../ui.js';

export function loadPrefs() {
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('ritmo-prefs') || '{}')); } catch { /* ignore */ }
}
const savePrefs = () => { try { localStorage.setItem('ritmo-prefs', JSON.stringify(prefs)); } catch { /* ignore */ } };

function pausesList() {
  const seq = sequenceOf(state.run, state.program);
  return seq.map((e, i) => ({ e, i })).filter((x) => x.e === 'P').map(({ i }) => ({ i, monday: addDays(state.run.start, i * 7) }));
}

export function openSettings() {
  openSheet({
    title: 'Instellingen',
    cls: 'sheet-tall',
    render: () => {
      const run = state.run;
      const pauses = pausesList();
      const toggle = (key, label) => `<button class="switch ${prefs[key] ? 'is-on' : ''}" data-action="pref-toggle" data-key="${key}" role="switch" aria-checked="${!!prefs[key]}"><span>${label}</span><span class="knob" aria-hidden="true"></span></button>`;
      return `<div class="settings">
        <section>
          <h3>Je schema</h3>
          <p class="hint">${esc(state.program.title)}</p>
          <div class="field">
            <label class="label" for="set-start">Week 1 begint op</label>
            <input id="set-start" class="input" type="date" value="${run.start}" data-change="set-start">
            <p class="hint">${esc(longDate(run.start))}. Kies je een andere dag, dan wordt het de maandag van die week.</p>
          </div>
          <div class="field">
            <p class="label">Lange wandeling op</p>
            <div class="seg" role="group" aria-label="Dag van de lange wandeling">
              <button class="${run.hikeDay === 'sat' ? 'is-on' : ''}" data-action="set-hike" data-day="sat">Zaterdag</button>
              <button class="${run.hikeDay !== 'sat' ? 'is-on' : ''}" data-action="set-hike" data-day="sun">Zondag</button>
            </div>
          </div>
        </section>

        <section>
          <h3>Pauzeweken</h3>
          <p class="hint">Vakantie of ziek? Een pauzeweek schuift de rest van je schema een week op.</p>
          ${pauses.length ? `<ul class="plist">${pauses.map((p) => `<li><span>Week van ${esc(longDate(p.monday).toLowerCase())}</span><button class="iconbtn" data-action="pause-remove" data-i="${p.i}" aria-label="Pauzeweek weghalen">${icon('trash')}</button></li>`).join('')}</ul>` : ''}
          <div class="field-row">
            <input id="pause-date" class="input" type="date" value="${addDays(mondayOf(todayStr()), 7)}" aria-label="Een dag in de pauzeweek">
            <button class="btn btn-s" data-action="pause-add">${icon('plus', 'icon-xs')} Pauzeweek</button>
          </div>
        </section>

        ${run.standDelay ? `<section>
          <h3>Staanschema</h3>
          <p class="hint">Je loopt ${run.standDelay} weken achter op het staanschema.</p>
          <button class="btn btn-s btn-quiet" data-action="stand-reset">Weer gelijk lopen</button>
        </section>` : ''}

        <section>
          <h3>Timer</h3>
          ${toggle('sound', 'Geluid')}
          ${toggle('vibrate', 'Trillen')}
        </section>

        <section>
          <h3>Je gegevens</h3>
          <p class="hint">${state.backend.demo ? 'Dit is de proefversie: alles staat alleen in deze browser.' : `Ingelogd als ${esc(state.user.email || state.user.name)}. Alleen jij kunt je gegevens zien.`}</p>
          ${window.RITMO_DEMO ? '' : `<div class="btn-row">
            <button class="btn btn-s btn-quiet" data-action="export-json">${icon('download', 'icon-xs')} Alles (JSON)</button>
            <button class="btn btn-s btn-quiet" data-action="export-csv">${icon('download', 'icon-xs')} Sportschool (CSV)</button>
          </div>`}
        </section>

        <section>
          <h3>Nieuw schema</h3>
          <p class="hint">Na deze 12 weken kun je een nieuw schema starten. Je oude gegevens blijven bewaard.</p>
          <button class="btn btn-s btn-quiet" data-action="new-run">Nieuw schema starten</button>
        </section>

        <section>
          <h3>Over Ritmo</h3>
          <p class="hint">Ritmo zet het rugplan uit je onderzoeksdocument om in een dagplanning. Het vervangt je fysio niet: laat het plan ook door je fysio in Madrid bekijken.</p>
        </section>

        <button class="btn btn-quiet btn-block" data-action="sign-out">${icon('logout', 'icon-s')} ${state.backend.demo ? 'Proefversie wissen' : 'Uitloggen'}</button>
      </div>`;
    },
  });
}

on('settings', () => openSettings());

onChange('set-start', (el) => {
  if (!el.value) return;
  const start = mondayOf(el.value);
  patchRun({ start });
  toast(`Week 1 begint op ${longDate(start).toLowerCase()}`);
  refreshSheet();
});
on('set-hike', (el) => { patchRun({ hikeDay: el.dataset.day }); refreshSheet(); });

on('pause-add', () => {
  const v = document.getElementById('pause-date').value;
  if (!v) return;
  const idx = Math.floor(diffDays(state.run.start, mondayOf(v)) / 7);
  const seq = [...sequenceOf(state.run, state.program)];
  if (idx < 0) { toast('Die week valt voor de start.'); return; }
  if (idx > seq.length) { toast('Die week valt na je schema.'); return; }
  if (seq[idx] === 'P') { toast('Dat is al een pauzeweek.'); return; }
  seq.splice(idx, 0, 'P');
  patchRun({ sequence: seq });
  toast('Pauzeweek toegevoegd. Je schema schuift een week op.');
  refreshSheet();
});
on('pause-remove', (el) => {
  const i = Number(el.dataset.i);
  const seq = [...sequenceOf(state.run, state.program)];
  if (seq[i] !== 'P') return;
  seq.splice(i, 1);
  patchRun({ sequence: seq });
  refreshSheet();
});
on('stand-reset', () => { patchRun({ standDelay: 0 }); refreshSheet(); });

on('pref-toggle', (el) => {
  prefs[el.dataset.key] = !prefs[el.dataset.key];
  savePrefs();
  refreshSheet();
});

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
on('export-json', () => {
  download(`ritmo-${todayStr()}.json`, JSON.stringify({ run: state.run, days: state.days }, null, 2), 'application/json');
});
on('export-csv', () => {
  const rows = [['datum', 'training', 'oefening', 'set', 'kg', 'herhalingen/seconden', 'gedaan', 'pijn', 'notitie']];
  for (const date of Object.keys(state.days).sort()) {
    const g = state.days[date].gym;
    if (!g || !g.ex) continue;
    for (const [id, e] of Object.entries(g.ex)) {
      const name = (state.program.exercises[id] || {}).name || id;
      const pain = { g: 'groen', o: 'oranje', r: 'rood' }[e.pain] || '';
      const num = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
      (e.sets || []).forEach((s, i) => rows.push([date, g.s, name, i + 1, num(s && s.kg), num(s && s.r), s && s.ok ? 'ja' : 'nee', pain, (e.note || '').replace(/\n/g, ' ')]));
    }
  }
  // A byte order mark so Excel opens the accents correctly.
  const csv = `\ufeff${rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
  download(`ritmo-sportschool-${todayStr()}.csv`, csv, 'text/csv');
});

on('new-run', () => {
  const list = Object.values(programs);
  openSheet({
    title: 'Nieuw schema',
    render: () => `<p class="lead">Kies een schema en een startdatum. Je huidige schema en je logboek blijven bewaard.</p>
      <div class="field"><label class="label" for="nr-prog">Schema</label>
        <select id="nr-prog" class="select">${list.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="nr-start">Week 1 begint op</label>
        <input id="nr-start" class="input" type="date" value="${addDays(mondayOf(todayStr()), 7)}"></div>
      <p class="hint">Een eigen schema voor na deze 12 weken? Vraag Claude om het toe te voegen: dan staat het hier in de lijst.</p>`,
    footer: () => '<button class="btn btn-primary btn-block" data-action="new-run-save">Starten</button>',
  });
});
on('new-run-save', async () => {
  const programId = document.getElementById('nr-prog').value;
  const start = mondayOf(document.getElementById('nr-start').value || todayStr());
  const ok = await confirmSheet({ title: 'Nieuw schema starten?', text: `Ritmo gaat verder met een nieuw schema vanaf ${longDate(start).toLowerCase()}.`, ok: 'Starten' });
  if (!ok) return;
  const { backend, user } = state;
  const runId = await backend.createRun(user.uid, { programId, start, hikeDay: state.run.hikeDay || 'sun', createdAt: Date.now(), stickersSeen: [] });
  await backend.saveProfile(user.uid, { activeRunId: runId });
  closeSheet();
  toast('Nieuw schema gestart');
});

on('sign-out', async () => {
  const ok = await confirmSheet({
    title: state.backend.demo ? 'Proefversie wissen?' : 'Uitloggen?',
    text: state.backend.demo ? 'De voorbeeldgegevens in deze browser worden gewist.' : 'Je gegevens blijven bewaard in je account.',
    ok: state.backend.demo ? 'Wissen' : 'Uitloggen',
  });
  if (!ok) return;
  closeSheet();
  await state.backend.signOut();
});

export function openWelcome() {
  openSheet({
    title: `Welkom bij Ritmo${state.user && state.user.name ? `, ${state.user.name}` : ''}`,
    render: () => `<div class="welcome">
      <p class="lead">Ritmo zet je rugplan om in een dagplanning. Elke dag zie je wat je doet, je vinkt het af, en een complete week levert een sticker op.</p>
      <div class="field">
        <label class="label" for="wel-start">Week 1 begint op</label>
        <input id="wel-start" class="input" type="date" value="${state.run.start}" data-change="set-start">
      </div>
      <div class="field">
        <p class="label">Je lange wandeling doe je op</p>
        <div class="seg" role="group" aria-label="Dag van de lange wandeling">
          <button class="${state.run.hikeDay === 'sat' ? 'is-on' : ''}" data-action="set-hike" data-day="sat">Zaterdag</button>
          <button class="${state.run.hikeDay !== 'sat' ? 'is-on' : ''}" data-action="set-hike" data-day="sun">Zondag</button>
        </div>
      </div>
      <p class="hint">Achter elk ${icon('info', 'icon-xs')} zit uitleg: hoe, waarom en wanneer je iets aanpast.</p>
    </div>`,
    footer: () => '<button class="btn btn-primary btn-block" data-action="sheet-close">Beginnen</button>',
  });
}
