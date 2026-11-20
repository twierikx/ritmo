// Line icons, 24×24, drawn with the current text colour.
const P = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevD: '<path d="M5 9l7 7 7-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.4"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  dumbbell: '<path d="M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11"/>',
  star: '<path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.4l-5.1 2.9 1.1-5.8-4.3-4 5.8-.7z"/>',
  book: '<path d="M5 5.5A2.5 2.5 0 017.5 3H19v14H7.5A2.5 2.5 0 005 19.5z"/><path d="M5 19.5A2.5 2.5 0 017.5 17H19v4H7.5A2.5 2.5 0 015 19.5"/>',
  flame: '<path d="M12 3c1 3 4.8 4.8 4.8 9.3a4.8 4.8 0 01-9.6 0c0-2.1 1-3.5 2.1-4.5.2 1.7 1 2.7 2.1 2.9C11.1 8.4 11 5.6 12 3z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.3 2.3M9.5 2.5h5"/>',
  play: '<path d="M8 5.5l10.5 6.5L8 18.5z" fill="currentColor"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  walk: '<circle cx="13" cy="4.3" r="1.7"/><path d="M10.5 21l1.8-5.6-2.6-2.6 1.2-5 3 2.2 2.6 1.1M12.3 15.4l2.4 5.6M10.9 7.8l-3 2.4-1 3.2"/>',
  run: '<circle cx="15.5" cy="4.3" r="1.7"/><path d="M7.5 20.5l3.2-4.6 3 1.2v4M10.7 15.9l1.8-5.2-3.3.6-2 3M12.5 10.7l3 2.4 3.3-1.1"/>',
  mountain: '<path d="M2.5 19.5l6.5-11 4 6.3 2.4-3.4 6.1 8.1z"/><path d="M7.4 11.3l1.6 1.2 1.5-1.3"/>',
  stand: '<circle cx="8.5" cy="4.5" r="1.8"/><path d="M8.5 8v6.2M8.5 14.2L7 20.5M8.5 14.2l1.5 6.3M8.5 9.6l3.5 2.1h8M17.5 11.7v8.8"/>',
  music: '<path d="M9 17.5V6l10.5-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17" cy="15.5" r="2.5"/>',
  home: '<path d="M4 11l8-6.5 8 6.5v9H4z"/><path d="M10 20v-5h4v5"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11.5l-2.2 4 2.2 4H5.5"/>',
  wind: '<path d="M3 9h10.5a2.8 2.8 0 10-2.8-2.8M3 15h14.5a2.8 2.8 0 11-2.8 2.8M3 12h7"/>',
  note: '<path d="M4.5 19.5h4l10.2-10.2-4-4L4.5 15.5z"/><path d="M13.2 6.8l4 4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  logout: '<path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  wave: '<path d="M3.5 13c2.2-3.4 4.3-3.4 6.4 0s4.3 3.4 6.4 0c1.2-1.9 2.4-2.6 4.2-1.5"/>',
  dash: '<path d="M7 12h10"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0112 7.3a4.2 4.2 0 017.5 2.6C19.5 15.4 12 20 12 20z"/>',
  sticker: '<path d="M5 3.5h10.5l4 4V20a.5.5 0 01-.5.5H5a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"/><path d="M15.5 3.5V8h4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8"/>',
  pause2: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
  skip: '<path d="M6 6l8 6-8 6zM17.5 6v12"/>',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

export const googleG = '<svg class="icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
