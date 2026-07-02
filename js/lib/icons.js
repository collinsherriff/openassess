// ===== Icon set =====
// Small, consistent stroke icons drawn on a 24px grid. Inline SVG, inherits
// currentColor — no emoji, no icon-font, no external requests.

const S = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;

export const icons = {
  // tools
  import:    S('<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5L14 3z"/><path d="M14 3v4.5h4.5"/><path d="M12 10.5v6"/><path d="m9.5 14 2.5 2.5L14.5 14"/>'),
  swap:      S('<path d="M16 4l4 4-4 4"/><path d="M20 8H7a3 3 0 0 0-3 3"/><path d="M8 20l-4-4 4-4"/><path d="M4 16h13a3 3 0 0 0 3-3"/>'),
  archive:   S('<rect x="3.5" y="4" width="17" height="5" rx="1"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>'),
  search:    S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
  compose:   S('<path d="M4 20h16"/><path d="M6.5 16.5 17 6a2.1 2.1 0 0 0-3-3L3.5 13.5 3 17l3.5-.5z"/>'),
  play:      S('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
  chart:     S('<path d="M4 4v15.5A.5.5 0 0 0 4.5 20H20"/><path d="M8 16v-5"/><path d="M12.5 16V8"/><path d="M17 16v-3"/>'),
  ruler:     S('<rect x="3" y="9" width="18" height="6" rx="1" transform="rotate(-45 12 12)"/><path d="m8.5 12.5 1.5 1.5"/><path d="m11 10l1.5 1.5"/><path d="m13.5 7.5 1.5 1.5"/>'),
  cards:     S('<rect x="7" y="6.5" width="13" height="9" rx="1.5" transform="rotate(3 13.5 11)"/><rect x="4" y="9" width="13" height="9" rx="1.5" transform="rotate(-3 10.5 13.5)"/>'),
  book:      S('<path d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5c-1 0-1.5.1-2 .25V18.2c.5-.15 1-.2 2-.2 3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2 1 0 1.5.05 2 .2V4.75c-.5-.15-1-.25-2-.25-3 0-5 .5-6.5 2z"/><path d="M12 6.5V20"/>'),
  calc:      S('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7"/><path d="M8.5 12h.01"/><path d="M12 12h.01"/><path d="M15.5 12h.01"/><path d="M8.5 16h.01"/><path d="M12 16h.01"/><path d="M15.5 16h.01"/>'),
  bubbles:   S('<circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="7" r="2.6"/><circle cx="7" cy="17" r="2.6"/><circle cx="17" cy="17" r="2.6" fill="currentColor" stroke="none"/>'),
  grid:      S('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M9.3 4v16"/><path d="M14.6 4v16"/><path d="M4 9.3h16"/><path d="M4 14.6h16"/>'),
  dice:      S('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M12 12h.01"/><path d="M9 15h.01"/><path d="M15 15h.01"/>'),
  monitor:   S('<rect x="3" y="4.5" width="18" height="12.5" rx="1.5"/><path d="M9 21h6"/><path d="M12 17v4"/>'),
  // ui
  check:     S('<path d="m5 13 4.5 4.5L19 8"/>'),
  arrow:     S('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  doc:       S('<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5L14 3z"/><path d="M14 3v4.5h4.5"/>'),
  spark:     S('<path d="M12 3v3.5"/><path d="M12 17.5V21"/><path d="M3 12h3.5"/><path d="M17.5 12H21"/><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>'),
  lock:      S('<rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  link:      S('<path d="M10 14a4 4 0 0 0 6 .4l2.5-2.5a4 4 0 0 0-5.7-5.7L11.6 7.4"/><path d="M14 10a4 4 0 0 0-6-.4L5.5 12.1a4 4 0 0 0 5.7 5.7l1.2-1.2"/>'),
};

// Return an element (span.icon) containing the SVG.
export function icon(name, cls = 'icon') {
  const span = document.createElement('span');
  span.className = cls;
  span.innerHTML = icons[name] || icons.doc;
  return span;
}
