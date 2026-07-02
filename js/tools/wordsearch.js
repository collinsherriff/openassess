// ===== Word Search Generator =====
// Places a vocabulary list into a grid (8 directions), fills the rest with
// random letters, and prints the puzzle plus an answer key. Great for
// vocabulary review and sub-day worksheets.
import { h, toolHead, toast } from '../lib/ui.js';
import { escapeHtml } from '../lib/model.js';

const DIRS = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Word Search Maker', 'Turn a vocabulary list into a printable word-search puzzle with an answer key. Words can run in all eight directions.'));

  const opts = { title: 'Vocabulary Word Search', size: 14, diagonals: true, backwards: true };
  let grid = null, placed = [];

  const panel = h('div.panel');
  root.append(panel);
  const out = h('div', { style: 'margin-top:1rem' });
  root.append(out);
  mount.append(root);

  panel.append(labeled('Title', h('input', { type: 'text', value: opts.title, oninput: (e) => opts.title = e.target.value })));
  const words = h('textarea', { placeholder: 'One word per line:\nphotosynthesis\nchlorophyll\nglucose\noxygen\nsunlight', style: 'min-height:150px' });
  panel.append(h('div.field', {}, [h('label', {}, 'Words'), words]));
  panel.append(h('div.row.tight', {}, [
    labeled('Grid size', h('input', { type: 'number', min: 8, max: 25, value: opts.size, style: 'width:6rem', oninput: (e) => opts.size = clamp(+e.target.value, 8, 25) })),
    check('Diagonals', 'diagonals'), check('Backwards', 'backwards'),
  ]));
  panel.append(h('div.row.tight', { style: 'margin-top:.8rem' }, [
    h('button.btn.primary.sm', { onclick: generate }, 'Generate'),
    h('button.btn.sm', { onclick: () => printPuzzle(false) }, 'Print puzzle'),
    h('button.btn.sm', { onclick: () => printPuzzle(true) }, 'Print key'),
  ]));

  function labeled(label, ctrl) { return h('div', {}, [h('label', {}, label), ctrl]); }
  function check(label, field) {
    const cb = h('input', { type: 'checkbox', checked: opts[field], onchange: (e) => opts[field] = e.target.checked });
    return h('label.checkline', {}, [cb, label]);
  }

  function generate() {
    const list = words.value.split('\n').map((w) => w.replace(/[^a-z]/gi, '').toUpperCase()).filter((w) => w.length >= 2 && w.length <= opts.size);
    if (!list.length) { toast('Add a few words first'); return; }
    const res = build(list, opts);
    if (!res) { toast('Grid too small for these words — increase the size'); return; }
    grid = res.grid; placed = res.placed;
    draw();
  }

  function draw() {
    out.innerHTML = '';
    if (!grid) return;
    out.append(h('div.spread', {}, [h('h3', {}, 'Preview'), h('span.pill', {}, `${placed.length} words placed`)]));
    const frame = h('div.panel', { style: 'background:#fff;color:#111;overflow:auto' });
    frame.innerHTML = gridHTML(false) + wordListHTML();
    out.append(frame);
  }

  function gridHTML(showKey) {
    const solSet = new Set();
    if (showKey) for (const p of placed) markCells(p).forEach((c) => solSet.add(c));
    let html = '<table class="ws">';
    for (let y = 0; y < grid.length; y++) {
      html += '<tr>';
      for (let x = 0; x < grid[y].length; x++) {
        const on = solSet.has(`${x},${y}`);
        html += `<td class="${on ? 'sol' : ''}">${grid[y][x]}</td>`;
      }
      html += '</tr>';
    }
    return html + '</table>';
  }
  function wordListHTML() {
    return `<div class="wl"><b>Find these words:</b><div class="wlist">${placed.map((p) => `<span>${escapeHtml(p.word)}</span>`).join('')}</div></div>`;
  }
  function styleBlock() {
    return `<style>body{font-family:Arial,sans-serif;color:#111;margin:1.4rem}
      h1{font-size:1.3rem}
      table.ws{border-collapse:collapse;margin:1rem 0}
      table.ws td{width:1.6rem;height:1.6rem;text-align:center;font-family:monospace;font-size:1rem;border:1px solid #eee}
      table.ws td.sol{background:#ffe08a;border-radius:50%;font-weight:700}
      .wl{margin-top:1rem}.wlist{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;margin-top:.4rem}
      .wlist span{font-size:.95rem}@media print{body{margin:.5in}}</style>`;
  }

  function printPuzzle(showKey) {
    if (!grid) { generate(); if (!grid) return; }
    const win = window.open('', '_blank');
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(opts.title)}</title>${styleBlock()}</head>
      <body><h1>${escapeHtml(opts.title)}${showKey ? ' — KEY' : ''}</h1>${gridHTML(showKey)}${wordListHTML()}
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }

  function markCells(p) {
    const cells = [];
    for (let i = 0; i < p.word.length; i++) cells.push(`${p.x + p.dx * i},${p.y + p.dy * i}`);
    return cells;
  }
}

function build(words, opts) {
  const N = opts.size;
  const dirs = DIRS.filter(([dx, dy]) => (opts.diagonals || dx === 0 || dy === 0) && (opts.backwards || (dx >= 0 && dy >= 0 && !(dx === 0 && dy === 0))));
  const grid = Array.from({ length: N }, () => Array(N).fill(''));
  const placed = [];
  const sorted = words.slice().sort((a, b) => b.length - a.length);
  for (const word of sorted) {
    let done = false;
    for (let tries = 0; tries < 200 && !done; tries++) {
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const x = Math.floor(Math.random() * N);
      const y = Math.floor(Math.random() * N);
      if (fits(grid, word, x, y, dx, dy, N)) {
        for (let i = 0; i < word.length; i++) grid[y + dy * i][x + dx * i] = word[i];
        placed.push({ word, x, y, dx, dy });
        done = true;
      }
    }
  }
  if (!placed.length) return null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = ALPHA[Math.floor(Math.random() * 26)];
  return { grid, placed };
}
function fits(grid, word, x, y, dx, dy, N) {
  for (let i = 0; i < word.length; i++) {
    const nx = x + dx * i, ny = y + dy * i;
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) return false;
    if (grid[ny][nx] && grid[ny][nx] !== word[i]) return false;
  }
  return true;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n || lo)); }
