// ===== Grade Calculator =====
// Two calculators teachers reach for constantly: a quick points→percent→letter
// converter with an EZ-grader table, and a weighted-category final-grade tool.
import { h, toolHead } from '../lib/ui.js';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Grade Calculator', 'Convert scores to percentages and letters, print an EZ-grader table for a paper stack, or compute a weighted final grade.'));

  const cols = h('div.split');
  root.append(cols);
  mount.append(root);

  cols.append(quickPanel());
  cols.append(weightedPanel());
  root.append(ezPanel());
}

function letter(pct) {
  const s = [[97, 'A+'], [93, 'A'], [90, 'A-'], [87, 'B+'], [83, 'B'], [80, 'B-'], [77, 'C+'], [73, 'C'], [70, 'C-'], [67, 'D+'], [63, 'D'], [60, 'D-']];
  for (const [t, l] of s) if (pct >= t) return l;
  return 'F';
}

function quickPanel() {
  const p = h('div.panel');
  p.append(h('h3', {}, 'Score → grade'));
  const earned = h('input', { type: 'number', min: 0, value: 18 });
  const total = h('input', { type: 'number', min: 1, value: 20 });
  const outNum = h('div.num', { style: 'font-size:2.4rem' }, '90%');
  const outLtr = h('span.pill', {}, 'A-');
  const meter = h('div.meter', { style: 'margin:.6rem 0' }, [h('span', { style: 'width:90%' })]);
  const calc = () => {
    const pct = total.value > 0 ? (earned.value / total.value) * 100 : 0;
    const r = Math.round(pct * 10) / 10;
    outNum.textContent = `${r}%`;
    outLtr.textContent = letter(pct);
    meter.firstChild.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  };
  earned.addEventListener('input', calc); total.addEventListener('input', calc);
  p.append(h('div.inline-fields', {}, [
    h('div', {}, [h('label', {}, 'Points earned'), earned]),
    h('div', {}, [h('label', {}, 'Points possible'), total]),
  ]));
  p.append(h('div.center', { style: 'margin-top:1rem' }, [outNum, h('div', { style: 'margin-top:.3rem' }, [outLtr]), meter]));
  calc();
  return p;
}

function weightedPanel() {
  const p = h('div.panel');
  p.append(h('h3', {}, 'Weighted final grade'));
  const rows = [
    { name: 'Tests', weight: 40, score: 88 },
    { name: 'Quizzes', weight: 25, score: 92 },
    { name: 'Homework', weight: 20, score: 95 },
    { name: 'Participation', weight: 15, score: 100 },
  ];
  const body = h('div.stack');
  const result = h('div.center', { style: 'margin-top:1rem' });
  const render = () => {
    body.innerHTML = '';
    rows.forEach((r, i) => {
      body.append(h('div.inline-fields', { style: 'align-items:end' }, [
        h('div', {}, [i === 0 ? h('label', {}, 'Category') : null, h('input', { type: 'text', value: r.name, oninput: (e) => { r.name = e.target.value; } })]),
        h('div', {}, [i === 0 ? h('label', {}, 'Weight %') : null, h('input', { type: 'number', value: r.weight, oninput: (e) => { r.weight = +e.target.value; calc(); } })]),
        h('div', {}, [i === 0 ? h('label', {}, 'Score %') : null, h('input', { type: 'number', value: r.score, oninput: (e) => { r.score = +e.target.value; calc(); } })]),
        h('div', {}, [h('button.btn.sm.ghost', { onclick: () => { rows.splice(i, 1); render(); calc(); } }, '✕')]),
      ]));
    });
  };
  const calc = () => {
    const tw = rows.reduce((s, r) => s + (r.weight || 0), 0);
    const final = tw ? rows.reduce((s, r) => s + (r.weight * r.score), 0) / tw : 0;
    const r = Math.round(final * 10) / 10;
    result.innerHTML = `<div class="num" style="font-size:2.2rem">${r}% <span class="pill">${letter(final)}</span></div>
      <div class="lbl">${tw !== 100 ? `⚠ weights sum to ${tw}% (normalized)` : 'weights sum to 100%'}</div>`;
  };
  p.append(body);
  p.append(h('button.btn.sm.ghost', { style: 'margin-top:.5rem', onclick: () => { rows.push({ name: '', weight: 0, score: 0 }); render(); } }, '＋ Add category'));
  p.append(result);
  render(); calc();
  return p;
}

function ezPanel() {
  const p = h('div.panel', { style: 'margin-top:1rem' });
  p.append(h('div.spread', {}, [h('h3', {}, 'EZ-grader table'), h('span.muted', {}, 'How many points off = what score')]));
  const total = h('input', { type: 'number', min: 1, value: 20, style: 'width:6rem' });
  const table = h('div.tablewrap');
  const build = () => {
    const T = Math.max(1, +total.value);
    let cells = '';
    for (let wrong = 0; wrong <= T; wrong++) {
      const pct = Math.round(((T - wrong) / T) * 1000) / 10;
      cells += `<tr><td>${wrong}</td><td>${T - wrong}/${T}</td><td><b>${pct}%</b></td><td>${letter(pct)}</td></tr>`;
    }
    table.innerHTML = `<table><thead><tr><th># Wrong</th><th>Correct</th><th>Score</th><th>Grade</th></tr></thead><tbody>${cells}</tbody></table>`;
  };
  total.addEventListener('input', build);
  p.append(h('div.row.tight', { style: 'align-items:center;margin:.5rem 0' }, [h('span', {}, 'Total questions:'), total]));
  p.append(table);
  build();
  return p;
}
