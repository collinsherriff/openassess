// ===== Reading-Level Analyzer =====
// Flesch Reading Ease, Flesch–Kincaid Grade, SMOG, Gunning Fog and ARI —
// all computed locally. Handy for checking that item stems and passages sit at
// the right level for the grade band.
import { h, toolHead, toast } from '../lib/ui.js';
import { Store } from '../lib/store.js';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Reading-Level Analyzer', 'Paste a passage or pull your item stems, and check the reading level against five standard formulas.'));

  const panel = h('div.panel');
  const ta = h('textarea', { placeholder: 'Paste text to analyze…', style: 'min-height:180px' });
  panel.append(h('label', {}, 'Text'), ta);
  panel.append(h('div.row.tight', { style: 'margin-top:.6rem' }, [
    h('button.btn.primary.sm', { onclick: run }, 'Analyze'),
    h('button.btn.sm', { onclick: () => { ta.value = Store.all().map((q) => q.stem).join(' '); run(); } }, `Use item-bank stems (${Store.count()})`),
    h('button.btn.sm.ghost', { onclick: () => { ta.value = SAMPLE; run(); } }, 'Sample text'),
  ]));
  root.append(panel);
  const out = h('div', { style: 'margin-top:1rem' });
  root.append(out);
  mount.append(root);

  ta.addEventListener('input', debounce(run, 300));

  function run() {
    const text = ta.value.trim();
    out.innerHTML = '';
    if (!text) return;
    const m = metrics(text);
    if (m.words < 10) { out.append(h('div.callout.warn', {}, 'Add at least a couple of sentences for a reliable estimate.')); return; }

    const fk = 0.39 * (m.words / m.sentences) + 11.8 * (m.syllables / m.words) - 15.59;
    const fre = 206.835 - 1.015 * (m.words / m.sentences) - 84.6 * (m.syllables / m.words);
    const fog = 0.4 * ((m.words / m.sentences) + 100 * (m.polysyll / m.words));
    const smog = 1.0430 * Math.sqrt(m.polysyll * (30 / m.sentences)) + 3.1291;
    const ari = 4.71 * (m.chars / m.words) + 0.5 * (m.words / m.sentences) - 21.43;

    const grade = clamp(Math.round((fk + fog + smog + ari) / 4), 1, 16);
    out.append(h('div.panel', { style: 'margin-bottom:1rem' }, [
      h('div.spread', {}, [
        h('h2', { style: 'margin:0' }, `≈ Grade ${grade}`),
        h('span.pill', {}, band(grade)),
      ]),
      h('p.muted', { style: 'margin:.4rem 0 0' }, `${m.words} words · ${m.sentences} sentences · ${(m.words / m.sentences).toFixed(1)} words/sentence · ${(m.syllables / m.words).toFixed(2)} syllables/word`),
    ]));

    const grid = h('div.statgrid');
    grid.append(metricCard('Flesch–Kincaid', gradeStr(fk), 'US grade level'));
    grid.append(metricCard('Reading Ease', Math.round(fre), fre >= 60 ? 'Easy' : fre >= 30 ? 'Moderate' : 'Hard'));
    grid.append(metricCard('Gunning Fog', gradeStr(fog), 'Years of education'));
    grid.append(metricCard('SMOG', gradeStr(smog), 'Grade level'));
    grid.append(metricCard('ARI', gradeStr(ari), 'Grade level'));
    out.append(grid);
    out.append(h('div.callout', { style: 'margin-top:1rem', html: `💡 <b>Rule of thumb:</b> aim a passage at or slightly below your students' grade. Flesch Reading Ease of 60–70 suits roughly grades 8–9.` }));
  }

  function metricCard(name, val, sub) {
    return h('div.panel.stat', {}, [h('div.lbl', {}, name), h('div.num', { style: 'font-size:1.6rem' }, String(val)), h('div.lbl', {}, sub)]);
  }
}

function metrics(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = Math.max(1, (clean.match(/[.!?]+(\s|$)/g) || []).length);
  const wordsArr = clean.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const words = Math.max(1, wordsArr.length);
  let syllables = 0, polysyll = 0;
  for (const w of wordsArr) { const s = countSyllables(w); syllables += s; if (s >= 3) polysyll++; }
  const chars = wordsArr.join('').length;
  return { sentences, words, syllables, polysyll, chars };
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = word.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function gradeStr(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function band(g) { return g <= 5 ? 'Elementary' : g <= 8 ? 'Middle school' : g <= 12 ? 'High school' : 'College'; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

const SAMPLE = `Photosynthesis is the process by which green plants convert sunlight into chemical energy. Using carbon dioxide from the air and water from the soil, plants produce glucose and release oxygen. This remarkable transformation sustains nearly all life on Earth, forming the foundation of most food chains.`;
