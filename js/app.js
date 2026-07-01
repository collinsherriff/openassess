// ===== App shell: hash router, theme, home & static pages =====
import { h } from './lib/ui.js';
import { Store } from './lib/store.js';

// pdf.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ---- Tool registry -------------------------------------------------------
export const TOOLS = [
  { id: 'pdf-to-qti', icon: '📄→🧩', name: 'PDF → QTI', status: 'live',
    tag: 'Import', blurb: 'Turn an existing test or worksheet into a QTI question bank you can import into any LMS.' },
  { id: 'converter', icon: '🔄', name: 'Format Converter', status: 'live',
    tag: 'Import', blurb: 'Convert between QTI, Moodle XML, GIFT, Aiken and CSV. Round-trip your question banks.' },
  { id: 'item-bank', icon: '🗄️', name: 'Item Bank', status: 'live',
    tag: 'Organize', blurb: 'Store, tag and reuse every question. Filter by subject, standard, difficulty & Bloom level.' },
  { id: 'search', icon: '🔎', name: 'Smart Search', status: 'live',
    tag: 'Organize', blurb: 'Search your bank by meaning, not just keywords. Find similar items and fill gaps fast.' },
  { id: 'generator', icon: '🧪', name: 'Quiz & Worksheet Maker', status: 'live',
    tag: 'Create', blurb: 'Assemble a quiz or printable worksheet from the bank, with answer keys and randomization.' },
  { id: 'quiz', icon: '▶️', name: 'Test Player', status: 'live',
    tag: 'Deliver', blurb: 'Deliver an assessment in the browser: timer, shuffle, instant auto-grading & feedback.' },
  { id: 'reports', icon: '📊', name: 'Report Maker', status: 'live',
    tag: 'Analyze', blurb: 'Class, student and item-level performance reports with item-analysis flags.' },
  { id: 'rubric', icon: '📐', name: 'Rubric Builder', status: 'live',
    tag: 'Create', blurb: 'Build clean, printable rubrics with weighted criteria and performance levels.' },
  { id: 'flashcards', icon: '🃏', name: 'Flashcard Maker', status: 'live',
    tag: 'Create', blurb: 'Turn any item set into study flashcards with a self-test flip mode and Anki export.' },
  { id: 'readability', icon: '📖', name: 'Reading-Level Analyzer', status: 'live',
    tag: 'Analyze', blurb: 'Check the reading level of any passage or item stem (Flesch–Kincaid, SMOG, and more).' },
];

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
    mount.innerHTML = `<div class="empty"><div class="big">😕</div><p>Couldn't load this tool.</p><pre class="muted">${err.message}</pre></div>`;
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

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

// ---- Views ---------------------------------------------------------------
function home() {
  const wrap = h('div');
  const count = Store.count();
  wrap.innerHTML = `
    <section class="hero">
      <div class="eyebrow">Free · education-only · private</div>
      <h1>The whole assessment lifecycle,<br>in one free place.</h1>
      <p class="lead">Stop stitching together paid converters, clunky LMS exports and manual busywork.
        OpenAssess turns your existing tests into reusable question banks — and everything runs
        right in your browser, so student data never leaves your machine.</p>
      <div class="cta">
        <a class="btn primary" href="#/tool/pdf-to-qti">Try PDF → QTI</a>
        <a class="btn" href="#/tools">Browse all tools</a>
      </div>
      <div class="hero-badges">
        <span class="pill">🔓 No paywalls</span>
        <span class="pill ghost">🔒 Runs offline in your browser</span>
        <span class="pill ghost">🧩 Works with Canvas · Moodle · Blackboard</span>
        <span class="pill ghost">🗄️ ${count} item${count === 1 ? '' : 's'} in your bank</span>
      </div>
    </section>`;

  wrap.append(sectionTitle('A tool for every step', 'Import → Organize → Create → Deliver → Analyze'));
  wrap.append(toolGrid(TOOLS.slice(0, 10)));

  const why = h('section', { style: 'margin-top:3rem' });
  why.innerHTML = `
    <h2>Why OpenAssess?</h2>
    <div class="tool-grid">
      ${featureCard('🔓', 'Genuinely free', 'No trials, no credit card, no locked exports. Open-source and static — it costs almost nothing to run.')}
      ${featureCard('🔒', 'Privacy-first', 'Everything happens client-side. Your PDFs and student data are never uploaded to a server.')}
      ${featureCard('🧩', 'Interoperable', 'Speaks QTI 2.1, Moodle XML, GIFT, Aiken and CSV so you are never locked in.')}
      ${featureCard('⚡', 'Low-friction', 'No install, no account needed to try. The item bank lives in your browser and follows you between tools.')}
    </div>`;
  wrap.append(why);
  return wrap;
}

function toolsIndex() {
  const wrap = h('div');
  wrap.innerHTML = `<h1>Tools</h1><p class="lead muted">Ten free tools covering the full assessment workflow. Pick one to start.</p>`;
  const groups = ['Import', 'Organize', 'Create', 'Deliver', 'Analyze'];
  for (const g of groups) {
    const items = TOOLS.filter((t) => t.tag === g);
    if (!items.length) continue;
    wrap.append(h('h2', {}, g));
    wrap.append(toolGrid(items));
  }
  return wrap;
}

function toolGrid(items) {
  const grid = h('div.tool-grid');
  for (const t of items) {
    grid.append(h('a.card', { href: `#/tool/${t.id}` }, [
      h('div.ico', {}, t.icon),
      h('h3', {}, t.name),
      h('p', {}, t.blurb),
      h('div', { class: `status ${t.status}`, text: t.status === 'live' ? '● Ready to use' : '○ Coming soon' }),
    ]));
  }
  return grid;
}

function featureCard(icon, title, body) {
  return `<div class="card"><div class="ico">${icon}</div><h3>${title}</h3><p>${body}</p></div>`;
}
function sectionTitle(title, sub) {
  return h('div', { style: 'margin-top:2.5rem' , html: `<h2>${title}</h2><p class="muted">${sub}</p>` });
}

function about() {
  const wrap = h('div');
  wrap.innerHTML = `
    <h1>About OpenAssess</h1>
    <p class="lead">A “TinyWow for teachers” — but education-only, assessment-focused, and free for good.</p>
    <div class="callout">Teachers shouldn't have to pay three vendors and copy-paste between them just to reuse a test they already wrote.</div>
    <h2>The idea</h2>
    <p>Most assessment tools are either expensive, locked to one LMS, or generic file converters that don't understand questions.
       OpenAssess is built around the way teachers actually work: take an existing test, turn it into structured items,
       organize them once, then reuse them everywhere — as a quiz, a printable worksheet, flashcards, or a QTI export for your LMS.</p>
    <h2>How it stays free</h2>
    <p>The entire app is static and runs in your browser. There's no server crunching your files, no per-seat licence, and no compute bill
       that scales with usage — which is exactly what makes “free forever” realistic. Sustainability ideas we're exploring: optional
       donations, grant funding, and an open-source community edition schools can self-host.</p>
    <h2>Privacy & compliance</h2>
    <p>Because processing is client-side, student data and exam papers never leave your device. That's a deliberate design choice to make
       FERPA/GDPR conversations short: there's nothing for us to store because we never receive it.</p>
    <h2>Roadmap</h2>
    <ul class="muted">
      <li>Standards-alignment mapper (Common Core / state standards)</li>
      <li>OCR bulk-grading of scanned student work</li>
      <li>AI distractor generation & auto-tagging (privacy-preserving / on-device)</li>
      <li>Accessibility checker for materials</li>
      <li>Optional school tier for shared, synced item banks</li>
    </ul>
    <p><a class="btn primary" href="#/tools">Start with the tools →</a></p>`;
  return wrap;
}

function privacy() {
  const wrap = h('div');
  wrap.innerHTML = `
    <h1>Privacy</h1>
    <p class="lead">Short version: we can't leak what we never receive.</p>
    <ul>
      <li><b>No uploads.</b> PDF parsing, conversion, grading and reports all run locally in JavaScript in your browser.</li>
      <li><b>No accounts.</b> Your item bank and results are saved in your browser's local storage on this device only.</li>
      <li><b>No tracking.</b> No analytics, no cookies, no third-party pixels.</li>
      <li><b>CDN libraries.</b> We load pdf.js and JSZip from a public CDN to parse files; they receive no document content.</li>
    </ul>
    <div class="callout warn">Because data lives in this browser, clearing site data or switching devices means starting fresh.
      Use the Item Bank's <b>Export</b> button to back up your questions.</div>`;
  return wrap;
}

function notFound() {
  const wrap = h('div.empty');
  wrap.innerHTML = `<div class="big">🧭</div><h2>Page not found</h2><p><a href="#/">Back home</a></p>`;
  return wrap;
}
