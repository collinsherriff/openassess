// ===== Random Picker & Group Maker =====
// Paste a class roster, then pick a random student (with a spin animation and
// no-repeat option) or split the class into balanced random groups.
import { h, toolHead, toast } from '../lib/ui.js';
import { escapeHtml } from '../lib/model.js';

const KEY = 'openassess.roster.v1';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Random Picker & Groups', 'Cold-call fairly or build random groups in a click. Your roster is remembered on this device.'));

  let names = load();
  let alreadyPicked = [];

  const cols = h('div.split');
  const left = h('div.panel');
  const right = h('div.panel');
  cols.append(left, right);
  root.append(cols);
  mount.append(root);

  // ---- roster ----
  left.append(h('h3', {}, 'Roster'));
  const ta = h('textarea', { placeholder: 'One name per line', style: 'min-height:240px' }, names.join('\n'));
  ta.addEventListener('input', () => { names = parse(ta.value); save(names); count.textContent = `${names.length} students`; });
  left.append(ta);
  const count = h('div.muted', { style: 'margin-top:.5rem' }, `${names.length} students`);
  left.append(count);

  // ---- actions ----
  right.append(h('h3', {}, 'Pick'));
  const display = h('div.panel', { style: 'min-height:120px;display:grid;place-items:center;text-align:center;font-size:1.8rem;font-weight:800;background:var(--bg-soft)' }, '—');
  right.append(display);
  const noRepeat = h('input', { type: 'checkbox', checked: true });
  right.append(h('label.checkline', { style: 'margin:.7rem 0' }, [noRepeat, "Don't repeat until everyone's picked"]));
  right.append(h('div.row.tight', {}, [
    h('button.btn.primary', { onclick: pick }, '🎯 Pick a student'),
    h('button.btn.ghost', { onclick: () => { alreadyPicked = []; toast('Reset — everyone is back in'); } }, '↺ Reset'),
  ]));
  const pickedList = h('div', { style: 'margin-top:.8rem' });
  right.append(pickedList);

  // ---- groups ----
  right.append(h('hr.divider'));
  right.append(h('h3', {}, 'Make groups'));
  const gsize = h('input', { type: 'number', min: 2, max: 12, value: 4, style: 'width:5rem' });
  const gby = h('select', {}, [h('option', { value: 'size' }, 'per group'), h('option', { value: 'count' }, 'groups total')]);
  right.append(h('div.row.tight', { style: 'align-items:center' }, [h('span', {}, 'Split into'), gsize, gby, h('button.btn.sm.primary', { onclick: makeGroups }, 'Go')]));
  const groupsOut = h('div', { style: 'margin-top:.8rem' });
  right.append(groupsOut);

  function pick() {
    if (!names.length) { toast('Add some names first'); return; }
    let pool = noRepeat.checked ? names.filter((n) => !alreadyPicked.includes(n)) : names;
    if (!pool.length) { toast('Everyone has been picked — resetting'); alreadyPicked = []; pool = names; }
    let ticks = 0; const total = 12 + Math.floor(Math.random() * 8);
    clearInterval(pick._t);
    pick._t = setInterval(() => {
      display.textContent = pool[Math.floor(Math.random() * pool.length)];
      display.style.opacity = 0.55 + (ticks / total) * 0.45;
      if (++ticks >= total) {
        clearInterval(pick._t);
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        display.textContent = chosen; display.style.opacity = 1;
        if (!alreadyPicked.includes(chosen)) alreadyPicked.push(chosen);
        renderPicked();
      }
    }, 55);
  }

  function renderPicked() {
    pickedList.innerHTML = alreadyPicked.length ? `<div class="muted" style="font-size:.8rem;margin-bottom:.3rem">Picked (${alreadyPicked.length}/${names.length})</div>` +
      alreadyPicked.map((n) => `<span class="tag">${escapeHtml(n)}</span>`).join('') : '';
  }

  function makeGroups() {
    if (names.length < 2) { toast('Add some names first'); return; }
    const shuffled = shuffle(names);
    const n = clamp(+gsize.value, 2, 12);
    let groups;
    if (gby.value === 'size') {
      groups = chunk(shuffled, n);
    } else {
      groups = Array.from({ length: n }, () => []);
      shuffled.forEach((name, i) => groups[i % n].push(name));
    }
    groupsOut.innerHTML = '';
    const grid = h('div.tool-grid');
    groups.forEach((g, i) => grid.append(h('div.card', { html: `<h3>Group ${i + 1}</h3>${g.map((m) => `<div>${escapeHtml(m)}</div>`).join('')}` })));
    groupsOut.append(grid);
  }

  function save(n) { localStorage.setItem(KEY, JSON.stringify(n)); }
}

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || SAMPLE; } catch { return SAMPLE; } }
function parse(t) { return t.split('\n').map((s) => s.trim()).filter(Boolean); }
function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
function chunk(a, n) { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n || lo)); }
const SAMPLE = ['Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Sophia', 'Mason', 'Lucas', 'Mia', 'Ethan', 'Isabella', 'Amelia'];
