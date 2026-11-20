// Ochtendcheck: the day after a training, ask how the back felt that morning.
// The answer is stored on the training day (days[date].after) and steers the next step:
// weights in the gym, the long walk and the running step.
import { state, patchDay } from '../store.js';
import { addDays, todayStr } from '../engine.js';
import { icon } from '../icons.js';
import { esc, on, openSheet, closeSheet, sheetOpen, toast, buzz } from '../ui.js';

// Dates already asked about since the app was opened, so "Later" means: not again right now.
const asked = new Set();

const OPTIONS = [
  { p: 'g', title: 'Zoals normaal', sub: 'De volgende keer mag je opbouwen' },
  { p: 'o', title: 'Iets meer, maar het zakt', sub: 'De volgende keer houd je hetzelfde aan' },
  { p: 'r', title: 'Duidelijk erger', sub: 'De volgende keer zet Ritmo een stap terug' },
];
const THANKS = {
  g: 'Fijn. De volgende keer mag je opbouwen.',
  o: 'Genoteerd. De volgende keer houd je hetzelfde aan.',
  r: 'Genoteerd. De volgende keer zet Ritmo een stap terug.',
};

const joinNl = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} en ${list[list.length - 1]}` : list[0] || '');

/** Opens the check when yesterday had a training without a morning-after answer yet. */
export function maybeAfterCheck() {
  if (!state.loaded || !state.run || sheetOpen() || !state.program.trainingOn) return;
  const yesterday = addDays(todayStr(), -1);
  if (asked.has(yesterday)) return;
  const doc = state.days[yesterday];
  if (!doc || doc.after) return;
  const what = state.program.trainingOn(doc);
  if (!what.length) return;
  asked.add(yesterday);
  openAfterCheck(yesterday, what);
}

export function openAfterCheck(date, what) {
  openSheet({
    title: 'Ochtendcheck',
    render: () => `<p class="after-what">Gisteren: ${esc(joinNl(what))}.</p>
      <div class="after-q">
        <p class="after-question">Hoe voelde je rug vanochtend?</p>
        <button class="iconbtn" data-action="info" data-key="after" aria-label="Waarom Ritmo dit vraagt">${icon('info')}</button>
      </div>
      <div class="after-opts" role="group" aria-label="Je rug vanochtend">
        ${OPTIONS.map((o) => `<button class="after-opt p-${o.p}" data-action="after-pick" data-date="${date}" data-p="${o.p}">
          <span class="after-dot" aria-hidden="true"></span>
          <span class="after-txt"><span class="after-title">${esc(o.title)}</span><span class="after-sub">${esc(o.sub)}</span></span>
        </button>`).join('')}
      </div>`,
    footer: () => '<button class="btn btn-quiet btn-block" data-action="sheet-close">Later</button>',
  });
}

on('after-pick', (el) => {
  const { date, p } = el.dataset;
  patchDay(date, { after: p });
  buzz(20);
  closeSheet();
  toast(THANKS[p]);
});
