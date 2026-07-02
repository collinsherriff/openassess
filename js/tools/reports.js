// ===== Report Maker =====
// Aggregates saved test attempts into class-, attempt- and item-level views,
// with basic item analysis (difficulty p-value + flags).
import { h, toolHead, download, toast } from '../lib/ui.js';
import { Store } from '../lib/store.js';
import { escapeHtml } from '../lib/model.js';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Report Maker', 'Turn test results into class, attempt and item-level reports — including item analysis that flags questions that were too easy or too hard.'));

  const results = Store.results();
  if (!results.length) {
    root.append(h('div.empty', { html: '<h3>No results yet</h3><p>Deliver a test with the <a href="#/tool/quiz">Test Player</a> — each attempt is saved here automatically.</p>' }));
    mount.append(root); return;
  }

  // ---- class summary ----
  const avg = mean(results.map((r) => r.pct));
  const best = Math.max(...results.map((r) => r.pct));
  const worst = Math.min(...results.map((r) => r.pct));
  const avgTime = mean(results.map((r) => r.durationSec));

  root.append(h('div.statgrid', { style: 'margin-bottom:1.4rem' }, [
    stat(results.length, 'Attempts'),
    stat(`${Math.round(avg)}%`, 'Average score'),
    stat(`${best}%`, 'Highest'),
    stat(`${worst}%`, 'Lowest'),
    stat(fmtTime(avgTime), 'Avg. time'),
  ]));

  // ---- distribution ----
  const dist = h('div.panel');
  dist.append(h('h3', {}, 'Score distribution'));
  const buckets = [0, 0, 0, 0, 0]; // <60,60,70,80,90+
  for (const r of results) {
    const b = r.pct >= 90 ? 4 : r.pct >= 80 ? 3 : r.pct >= 70 ? 2 : r.pct >= 60 ? 1 : 0;
    buckets[b]++;
  }
  const labels = ['F (<60)', 'D (60s)', 'C (70s)', 'B (80s)', 'A (90+)'];
  const maxB = Math.max(...buckets, 1);
  buckets.forEach((n, i) => {
    dist.append(h('div', { style: 'display:grid;grid-template-columns:70px 1fr 30px;gap:.6rem;align-items:center;margin:.3rem 0' }, [
      h('span.muted', { style: 'font-size:.8rem' }, labels[i]),
      h('div.meter', {}, [h('span', { style: `width:${(n / maxB) * 100}%` })]),
      h('span.muted', { style: 'font-size:.85rem;text-align:right' }, String(n)),
    ]));
  });
  root.append(dist);

  // ---- item analysis ----
  const itemStats = {};
  for (const r of results) {
    for (const it of r.perItem || []) {
      if (it.correct === null) continue;
      const s = itemStats[it.id] = itemStats[it.id] || { seen: 0, correct: 0 };
      s.seen++; if (it.correct) s.correct++;
    }
  }
  const rows = Object.entries(itemStats).map(([id, s]) => {
    const q = Store.get(id);
    const p = s.correct / s.seen;
    let flag = '';
    if (p >= 0.95) flag = '<span class="tag" style="color:var(--warn)">Too easy</span>';
    else if (p <= 0.3) flag = '<span class="tag" style="color:var(--bad)">Too hard</span>';
    else flag = '<span class="tag" style="color:var(--good)">Good spread</span>';
    return { q, p, seen: s.seen, correct: s.correct, flag };
  }).sort((a, b) => a.p - b.p);

  if (rows.length) {
    const wrap = h('div.panel', { style: 'margin-top:1.4rem' });
    wrap.append(h('div.spread', {}, [h('h3', {}, 'Item analysis'), h('span.muted', {}, 'Sorted hardest → easiest')]));
    const table = h('div.tablewrap');
    table.innerHTML = `<table><thead><tr><th>Question</th><th>p-value</th><th>Correct</th><th>Flag</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${r.q ? escapeHtml(r.q.stem.slice(0, 90)) : '<i>(deleted item)</i>'}</td>
        <td><b>${r.p.toFixed(2)}</b></td>
        <td>${r.correct}/${r.seen}</td>
        <td>${r.flag}</td></tr>`).join('')}</tbody></table>`;
    wrap.append(table);
    wrap.append(h('p.muted', { style: 'font-size:.82rem;margin-top:.6rem' },
      'p-value = share of attempts that got the item right. Very high (>0.95) items add little discrimination; very low (<0.3) items may be miskeyed or too difficult.'));
    root.append(wrap);
  }

  // ---- recent attempts ----
  const recent = h('div.panel', { style: 'margin-top:1.4rem' });
  recent.append(h('div.spread', {}, [
    h('h3', {}, 'Recent attempts'),
    h('div.row.tight', {}, [
      h('button.btn.sm', { onclick: () => download('results.csv', resultsCSV(results), 'text/csv') }, 'Export CSV'),
      h('button.btn.sm.danger', { onclick: () => { if (confirm('Clear all saved results?')) { Store.clearResults(); toast('Cleared'); location.reload(); } } }, 'Clear'),
    ]),
  ]));
  const t2 = h('div.tablewrap');
  t2.innerHTML = `<table><thead><tr><th>Assessment</th><th>Score</th><th>%</th><th>Time</th><th>When</th></tr></thead>
    <tbody>${results.slice().reverse().map((r) => `<tr>
      <td>${escapeHtml(r.quizTitle)}</td><td>${r.earned}/${r.possible}</td>
      <td><b>${r.pct}%</b></td><td>${fmtTime(r.durationSec)}</td>
      <td class="muted">${new Date(r.savedAt).toLocaleString()}</td></tr>`).join('')}</tbody></table>`;
  recent.append(t2);
  root.append(recent);

  mount.append(root);
}

function stat(num, lbl) { return h('div.panel.stat', {}, [h('div.num', {}, String(num)), h('div.lbl', {}, lbl)]); }
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function fmtTime(s) { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function resultsCSV(results) {
  const rows = [['assessment', 'earned', 'possible', 'percent', 'seconds', 'when']];
  for (const r of results) rows.push([r.quizTitle, r.earned, r.possible, r.pct, r.durationSec, new Date(r.savedAt).toISOString()]);
  return rows.map((r) => r.map((c) => /[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\n');
}
