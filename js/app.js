// ===== App shell: hash router, theme, command palette, home & static pages =====
import { h } from './lib/ui.js';
import { Store } from './lib/store.js';
import { icons, icon } from './lib/icons.js';

// pdf.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ---- Tool registry -------------------------------------------------------
export const TOOLS = [
  { id: 'pdf-to-qti', icon: 'import', name: 'PDF to QTI', tag: 'Import',
    blurb: 'Turn an existing test or worksheet into a question bank your LMS can import.' },
  { id: 'converter', icon: 'swap', name: 'Format Converter', tag: 'Import',
    blurb: 'Move question banks between QTI, Moodle XML, GIFT, Aiken and CSV.' },
  { id: 'item-bank', icon: 'archive', name: 'Item Bank', tag: 'Organize',
    blurb: 'Store, tag and reuse every question. The home base the other tools draw from.' },
  { id: 'search', icon: 'search', name: 'Smart Search', tag: 'Organize',
    blurb: 'Search your bank by meaning, not keywords — and find items similar to one you have.' },
  { id: 'generator', icon: 'compose', name: 'Quiz & Worksheet Maker', tag: 'Create',
    blurb: 'Assemble a quiz or printable worksheet, with answer keys and a shareable link.' },
  { id: 'rubric', icon: 'ruler', name: 'Rubric Builder', tag: 'Create',
    blurb: 'Weighted criteria and performance levels, laid out cleanly for print.' },
  { id: 'flashcards', icon: 'cards', name: 'Flashcard Maker', tag: 'Create',
    blurb: 'Turn any item set into a study deck, with flip mode and Anki export.' },
  { id: 'bubble-sheet', icon: 'bubbles', name: 'Bubble Sheet Maker', tag: 'Create',
    blurb: 'Printable answer sheets for paper tests, with an optional printed key.' },
  { id: 'wordsearch', icon: 'grid', name: 'Word Search Maker', tag: 'Create',
    blurb: 'A vocabulary list becomes a printable puzzle and its answer key.' },
  { id: 'quiz', icon: 'play', name: 'Test Player', tag: 'Deliver',
    blurb: 'Run an assessment in the browser: timer, shuffling, instant grading.' },
  { id: 'reports', icon: 'chart', name: 'Report Maker', tag: 'Analyze',
    blurb: 'Class and item-level results, with flags for questions that miss.' },
  { id: 'readability', icon: 'book', name: 'Reading-Level Analyzer', tag: 'Analyze',
    blurb: 'Five standard formulas tell you what grade a passage really sits at.' },
  { id: 'grades', icon: 'calc', name: 'Grade Calculator', tag: 'Analyze',
    blurb: 'Score to letter, weighted finals, and a printable EZ-grader table.' },
  { id: 'picker', icon: 'dice', name: 'Random Picker & Groups', tag: 'Classroom',
    blurb: 'Cold-call fairly with a no-repeat spinner, or split the class into groups.' },
  { id: 'screen', icon: 'monitor', name: 'Classroom Screen', tag: 'Classroom',
    blurb: 'A projector view with a big timer, your agenda, and working instructions.' },
];

const CATEGORIES = {
  Import:    'Bring existing tests in',
  Organize:  'One bank, reused everywhere',
  Create:    'Make classroom materials',
  Deliver:   'Put a test in front of students',
  Analyze:   'See what the results say',
  Classroom: 'For the room, not the paperwork',
};

// ---- Router --------------------------------------------------------------
const routes = {
  '/': home,
  '/tools': toolsIndex,
  '/about': about,
  '/privacy': privacy,
  '/bank': () => loadTool('item-bank'),
};

async function router() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, ...rest] = hash.split('/').filter(Boolean);
  const mount = document.getElementById('main');
  mount.innerHTML = '';
  window.scrollTo(0, 0);

  const full = '/' + (path || '');
  if (path === 'tool') return loadTool(rest[0], rest.slice(1), mount);
  if (path === 'take') return takeShared(rest.join('/'), mount);
  const view = routes[full] || routes[hash] || notFound;
  const node = await view(mount, rest);
  if (node) { mount.append(node); mount.firstElementChild?.classList.add('fade-in'); }
}

async function loadTool(id, params = [], mount = document.getElementById('main')) {
  mount.innerHTML = '<div class="center" style="padding:4rem"><span class="spin"></span></div>';
  try {
    const mod = await import(`./tools/${id}.js`);
    mount.innerHTML = '';
    await mod.render(mount, params);
    mount.firstElementChild?.classList.add('fade-in');
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<div class="empty"><h2>Couldn't load this tool</h2><pre class="muted">${err.message}</pre></div>`;
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ---- Shared test taker ---------------------------------------------------
async function takeShared(data, mount) {
  mount.innerHTML = '<div class="center" style="padding:4rem"><span class="spin"></span></div>';
  const { decodeQuiz, unslim } = await import('./lib/share.js');
  const { Runner } = await import('./tools/quiz.js');
  const decoded = decodeQuiz(data);
  if (!decoded || !decoded.q?.length) {
    mount.innerHTML = '<div class="empty"><h2>This link looks broken</h2><p>Ask whoever shared it to send a fresh link.</p><p><a href="#/">Go to OpenAssess</a></p></div>';
    return;
  }
  const quiz = unslim(decoded);
  mount.innerHTML = '';
  mount.append(h('div.callout', { style: 'margin-bottom:1rem',
    html: `You've been given a shared assessment: <b>${quiz.title}</b>. Answer the questions, then submit to see your score.` }));
  const holder = h('div');
  mount.append(holder);
  new Runner(holder, quiz, { shared: true }).mount();
}

// ---- Theme ---------------------------------------------------------------
const THEME_KEY = 'openassess.theme';
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}
applyTheme(localStorage.getItem(THEME_KEY) ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ---- Command palette (⌘K) -------------------------------------------------
const PALETTE_ITEMS = [
  ...TOOLS.map((t) => ({ label: t.name, hint: t.tag, icon: t.icon, go: `#/tool/${t.id}` })),
  { label: 'Home', hint: 'page', icon: 'doc', go: '#/' },
  { label: 'All tools', hint: 'page', icon: 'doc', go: '#/tools' },
  { label: 'About', hint: 'page', icon: 'doc', go: '#/about' },
  { label: 'Privacy', hint: 'page', icon: 'lock', go: '#/privacy' },
];

let paletteEl = null;
export function openPalette() {
  if (paletteEl) return;
  let sel = 0, matches = PALETTE_ITEMS;
  const input = h('input', { type: 'text', placeholder: 'Jump to a tool…', autofocus: true });
  const list = h('div.plist');
  const box = h('div.palette', {}, [input, list]);
  paletteEl = h('div.palette-overlay', { onclick: (e) => { if (e.target === paletteEl) closePalette(); } }, [box]);
  document.body.append(paletteEl);
  input.focus();

  const draw = () => {
    list.innerHTML = '';
    if (!matches.length) { list.append(h('div.pempty', {}, 'Nothing matches.')); return; }
    matches.forEach((m, i) => {
      const row = h('div.pitem', { class: i === sel ? 'on' : '', onclick: () => go(m) }, [
        icon(m.icon), h('span', {}, m.label), h('small', {}, m.hint),
      ]);
      row.addEventListener('mousemove', () => { if (sel !== i) { sel = i; draw(); } });
      list.append(row);
    });
  };
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    matches = q ? PALETTE_ITEMS.filter((m) => (m.label + ' ' + m.hint).toLowerCase().includes(q)) : PALETTE_ITEMS;
    sel = 0; draw();
  };
  const go = (m) => { closePalette(); location.hash = m.go; };
  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, matches.length - 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && matches[sel]) go(matches[sel]);
    else if (e.key === 'Escape') closePalette();
  });
  draw();
}
function closePalette() { paletteEl?.remove(); paletteEl = null; }

window.addEventListener('keydown', (e) => {
  const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); paletteEl ? closePalette() : openPalette(); }
  else if (e.key === '/' && !typing && !paletteEl) { e.preventDefault(); openPalette(); }
});
document.getElementById('palette-hint')?.addEventListener('click', () => openPalette());

// ---- Views ---------------------------------------------------------------
function home() {
  const wrap = h('div');

  const hero = h('section.hero');
  hero.append(h('div.overline', {}, 'Free tools for teachers'));
  hero.append(h('h1', {}, 'The test you already wrote is more useful than you think.'));
  hero.append(h('p.lead', {}, 'Import it once, and OpenAssess turns it into an LMS-ready question bank, a printable worksheet, flashcards, or a link students can open anywhere. Every tool runs in your browser — nothing is uploaded, nothing is paid.'));
  hero.append(h('div.cta', {}, [
    h('a.btn.primary', { href: '#/tool/pdf-to-qti' }, 'Convert a test'),
    h('a.btn', { href: '#/tools' }, 'Browse all tools'),
    h('button.btn.ghost', { onclick: seedDemo }, 'Try with sample questions'),
  ]));
  hero.append(h('div.hero-note', { html: 'No account · No uploads · Works with <b>Canvas</b>, <b>Moodle</b> & <b>Blackboard</b>' }));
  wrap.append(hero);

  const how = h('div.how');
  [['1', 'Import', 'Drop in a PDF or paste a test. The parser finds the questions, options and answer key.'],
   ['2', 'Organize', 'Everything lands in your item bank — tagged, searchable, and stored only on this device.'],
   ['3', 'Reuse', 'Export to your LMS, print a worksheet, share a self-grading link, or drill it as flashcards.'],
  ].forEach(([n, t, d]) => how.append(h('div', {}, [h('div.num', {}, n), h('h3', {}, t), h('p', {}, d)])));
  wrap.append(how);

  wrap.append(directory());

  const why = h('section.prose', { style: 'margin-top:3rem' });
  why.innerHTML = `
    <h2>Why is it free?</h2>
    <p>Because it can afford to be. OpenAssess is a static, open-source site — there's no server reading
    your files and no per-seat licence to recoup. Your PDFs are parsed by your own browser, your item
    bank lives in your own browser storage, and shared tests travel inside the link itself.</p>
    <p>That design is also why the privacy story is short: student data never reaches us,
    so there is nothing for us to store, sell, or leak. <a href="#/about">More about the project →</a></p>`;
  wrap.append(why);

  return wrap;
}

function directory() {
  const section = h('div', { style: 'margin-top:2.6rem' });
  const bankCount = Store.count();
  section.append(h('div.spread', {}, [
    h('h2', { style: 'margin:0' }, 'The tools'),
    h('span.muted', { style: 'font-size:.85rem' },
      bankCount ? `${bankCount} item${bankCount === 1 ? '' : 's'} in your bank` : 'Press ⌘K to jump anywhere'),
  ]));
  for (const [cat, sub] of Object.entries(CATEGORIES)) {
    const items = TOOLS.filter((t) => t.tag === cat);
    if (!items.length) continue;
    const block = h('div.cat');
    block.append(h('div.cat-head', {}, [
      h('span.overline', {}, cat),
      h('span.muted', { style: 'font-size:.8rem' }, sub),
    ]));
    block.append(toolGrid(items));
    section.append(block);
  }
  return section;
}

function toolsIndex() {
  const wrap = h('div');
  wrap.append(h('h1', {}, 'Tools'));
  wrap.append(h('p.lead.muted', {}, `${TOOLS.length} free tools covering the whole assessment workflow. Press ⌘K anywhere to jump.`));
  for (const [cat, sub] of Object.entries(CATEGORIES)) {
    const items = TOOLS.filter((t) => t.tag === cat);
    if (!items.length) continue;
    const block = h('div.cat');
    block.append(h('div.cat-head', {}, [
      h('span.overline', {}, cat),
      h('span.muted', { style: 'font-size:.8rem' }, sub),
    ]));
    block.append(toolGrid(items));
    wrap.append(block);
  }
  return wrap;
}

function toolGrid(items) {
  const grid = h('div.tool-grid');
  for (const t of items) {
    grid.append(h('a.card', { href: `#/tool/${t.id}` }, [
      h('div.ico', {}, [icon(t.icon)]),
      h('div', {}, [h('h3', {}, t.name), h('p', {}, t.blurb)]),
    ]));
  }
  return grid;
}

async function seedDemo() {
  const { seed } = await import('./lib/demo.js');
  const n = seed();
  const { toast } = await import('./lib/ui.js');
  toast(n ? `Added ${n} sample questions to your bank` : 'Sample questions are already in your bank');
  location.hash = '#/bank';
}

function about() {
  const wrap = h('div.prose');
  wrap.innerHTML = `
    <h1>About OpenAssess</h1>
    <p class="lead">One place for the whole assessment lifecycle — education-only, browser-only, and free for good.</p>
    <h2>The idea</h2>
    <p>Most assessment tools are expensive, locked to one LMS, or generic file converters that don't understand
       questions. OpenAssess is built around the way teachers actually work: take an existing test, turn it into
       structured items, organize them once, then reuse them everywhere — as a quiz, a printable worksheet,
       flashcards, or a QTI export for your LMS.</p>
    <h2>How it stays free</h2>
    <p>The entire app is static and runs in your browser. There's no server crunching your files, no per-seat
       licence, and no compute bill that scales with usage — which is exactly what makes "free forever" realistic.
       Sustainability ideas being explored: donations, grant funding, and an open-source community edition schools
       can self-host.</p>
    <h2>Privacy &amp; compliance</h2>
    <p>Because processing is client-side, student data and exam papers never leave your device. That's a deliberate
       design choice to make FERPA/GDPR conversations short: there's nothing to store because nothing is received.</p>
    <h2>Roadmap</h2>
    <ul>
      <li>Standards-alignment mapper (Common Core / state standards)</li>
      <li>OCR bulk-grading of scanned student work</li>
      <li>AI distractor generation &amp; auto-tagging (privacy-preserving)</li>
      <li>Accessibility checker for materials</li>
      <li>Optional school tier for shared, synced item banks</li>
    </ul>
    <p><a class="btn primary" href="#/tools">Start with the tools</a></p>`;
  return wrap;
}

function privacy() {
  const wrap = h('div.prose');
  wrap.innerHTML = `
    <h1>Privacy</h1>
    <p class="lead">Short version: we can't leak what we never receive.</p>
    <ul>
      <li><b>No uploads.</b> PDF parsing, conversion, grading and reports all run locally in your browser.</li>
      <li><b>No accounts.</b> Your item bank and results are saved in this browser's local storage, on this device only.</li>
      <li><b>No tracking.</b> No analytics, no cookies, no third-party pixels.</li>
      <li><b>CDN libraries.</b> pdf.js, JSZip and LZString load from a public CDN; they receive no document content.</li>
    </ul>
    <div class="callout warn">Because data lives in this browser, clearing site data or switching devices means
      starting fresh. Use the Item Bank's <b>Export</b> button to back up your questions.</div>`;
  return wrap;
}

function notFound() {
  const wrap = h('div.empty');
  wrap.innerHTML = `<h2>Page not found</h2><p><a href="#/">Back home</a></p>`;
  return wrap;
}
