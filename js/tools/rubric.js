// ===== Rubric Builder =====
import { h, toolHead, toast, download } from '../lib/ui.js';
import { escapeHtml } from '../lib/model.js';

const KEY = 'openassess.rubric.v1';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Rubric Builder', 'Build a clean, printable rubric with weighted criteria and performance levels. Saved in your browser so you can refine it later.'));

  let model = load() || sample();

  const panel = h('div.panel');
  root.append(panel);
  const out = h('div', { style: 'margin-top:1rem' });
  root.append(out);
  mount.append(root);

  function renderEditor() {
    panel.innerHTML = '';
    panel.append(h('div.inline-fields', {}, [
      h('div', {}, [h('label', {}, 'Rubric title'), h('input', { type: 'text', value: model.title, oninput: (e) => { model.title = e.target.value; save(); renderPreview(); } })]),
      h('div', {}, [h('label', {}, 'Levels (columns)'), levelCountSelect()]),
    ]));

    // level headers
    const lvlRow = h('div.field', {});
    lvlRow.append(h('label', {}, 'Performance levels'));
    const lvlWrap = h('div.inline-fields');
    model.levels.forEach((lv, i) => {
      lvlWrap.append(h('div', {}, [
        h('input', { type: 'text', value: lv.label, oninput: (e) => { lv.label = e.target.value; save(); renderPreview(); } }),
        h('input', { type: 'number', value: lv.points, title: 'Points', style: 'margin-top:.3rem', oninput: (e) => { lv.points = Number(e.target.value); save(); renderPreview(); } }),
      ]));
    });
    lvlRow.append(lvlWrap);
    panel.append(lvlRow);

    // criteria
    panel.append(h('h3', {}, 'Criteria'));
    model.criteria.forEach((cr, ci) => {
      const box = h('div.panel', { style: 'margin-bottom:.7rem;background:var(--bg-soft)' });
      box.append(h('div.spread', {}, [
        h('input', { type: 'text', value: cr.name, placeholder: 'Criterion name', style: 'font-weight:600',
          oninput: (e) => { cr.name = e.target.value; save(); renderPreview(); } }),
        h('div.row.tight', {}, [
          h('span', {}, [h('label', { style: 'display:inline;margin-right:.3rem' }, 'Weight'),
            h('input', { type: 'number', value: cr.weight, style: 'width:5rem;display:inline', oninput: (e) => { cr.weight = Number(e.target.value); save(); renderPreview(); } })]),
          h('button.btn.sm.danger', { onclick: () => { model.criteria.splice(ci, 1); save(); renderEditor(); renderPreview(); } }, 'Delete'),
        ]),
      ]));
      const descWrap = h('div.inline-fields', { style: 'margin-top:.5rem' });
      model.levels.forEach((lv, li) => {
        cr.cells = cr.cells || [];
        descWrap.append(h('div', {}, [
          h('label', { style: 'font-size:.75rem' }, lv.label),
          h('textarea', { style: 'min-height:60px;font-size:.85rem', placeholder: 'Descriptor…',
            oninput: (e) => { cr.cells[li] = e.target.value; save(); renderPreview(); } }, cr.cells[li] || ''),
        ]));
      });
      box.append(descWrap);
      panel.append(box);
    });
    panel.append(h('div.row.tight', {}, [
      h('button.btn.sm', { onclick: () => { model.criteria.push({ name: '', weight: 1, cells: [] }); save(); renderEditor(); } }, '+ Add criterion'),
      h('button.btn.sm.primary', { onclick: () => printRubric(model) }, 'Print / PDF'),
      h('button.btn.sm', { onclick: () => download('rubric.json', JSON.stringify(model, null, 2), 'application/json') }, 'Save file'),
      h('button.btn.sm.ghost', { onclick: () => { model = sample(); save(); renderEditor(); renderPreview(); } }, 'Reset'),
    ]));
  }

  function levelCountSelect() {
    const s = h('select', { onchange: (e) => {
      const n = Number(e.target.value);
      const cur = model.levels.length;
      if (n > cur) for (let i = cur; i < n; i++) model.levels.push({ label: `Level ${i + 1}`, points: n - i });
      else model.levels = model.levels.slice(0, n);
      model.criteria.forEach((c) => (c.cells = (c.cells || []).slice(0, n)));
      save(); renderEditor(); renderPreview();
    } });
    for (const n of [2, 3, 4, 5]) { const o = h('option', { value: n }, `${n} levels`); if (model.levels.length === n) o.selected = true; s.append(o); }
    return s;
  }

  function renderPreview() {
    out.innerHTML = '';
    out.append(h('h3', {}, 'Preview'));
    out.append(h('div.tablewrap', { html: rubricTable(model) }));
  }

  function save() { localStorage.setItem(KEY, JSON.stringify(model)); }
  renderEditor(); renderPreview();
}

function rubricTable(m) {
  const totalW = m.criteria.reduce((s, c) => s + (c.weight || 0), 0) || 1;
  return `<table><thead><tr><th>Criterion</th>${m.levels.map((l) => `<th>${escapeHtml(l.label)}<br><span class="muted">${l.points} pt</span></th>`).join('')}</tr></thead>
    <tbody>${m.criteria.map((c) => `<tr>
      <td><b>${escapeHtml(c.name || '—')}</b><br><span class="muted">${Math.round((c.weight / totalW) * 100)}%</span></td>
      ${m.levels.map((l, li) => `<td>${escapeHtml((c.cells || [])[li] || '')}</td>`).join('')}
    </tr>`).join('')}</tbody></table>`;
}

function printRubric(m) {
  const win = window.open('', '_blank');
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(m.title)}</title>
    <style>body{font-family:Georgia,serif;margin:1.5rem;color:#111}h1{font-size:1.4rem}
    table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{border:1px solid #999;padding:.5rem;vertical-align:top;text-align:left}
    th{background:#f0f0f0}.muted{color:#666;font-weight:400}</style></head>
    <body><h1>${escapeHtml(m.title)}</h1>${rubricTable(m).replace(/class="muted"/g, 'class="muted" style="color:#666"')}
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function sample() {
  return {
    title: 'Essay Rubric',
    levels: [
      { label: 'Exemplary', points: 4 }, { label: 'Proficient', points: 3 },
      { label: 'Developing', points: 2 }, { label: 'Beginning', points: 1 },
    ],
    criteria: [
      { name: 'Thesis & Focus', weight: 2, cells: ['Clear, insightful, arguable thesis sustained throughout', 'Clear thesis, mostly sustained', 'Thesis present but unfocused', 'Thesis unclear or missing'] },
      { name: 'Evidence & Support', weight: 3, cells: ['Rich, well-chosen evidence, fully explained', 'Relevant evidence, adequately explained', 'Some evidence, thinly explained', 'Little or no evidence'] },
      { name: 'Organization', weight: 2, cells: ['Logical, seamless structure', 'Clear structure, minor lapses', 'Loose structure', 'Disorganized'] },
      { name: 'Conventions', weight: 1, cells: ['Virtually error-free', 'Few minor errors', 'Errors distract at times', 'Frequent errors impede meaning'] },
    ],
  };
}
