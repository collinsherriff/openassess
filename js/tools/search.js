// ===== Smart Search =====
// A real relevance engine (TF-IDF vectors + cosine similarity) with light
// stemming and a synonym map, so it matches on *meaning overlap* rather than
// exact substrings — e.g. "cell energy" surfaces a mitochondria item. It also
// does "more like this" against any item. Honest scope: this is classic IR,
// not neural embeddings, but it works fully offline and needs no model download.
import { h, toolHead, questionCard } from '../lib/ui.js';
import { Store } from '../lib/store.js';

const STOP = new Set('a an the of to in on at is are was were be been being and or but for with as by from into that this these those it its which who what when where how why do does did can could will would should has have had not no you your we our they their he she his her them'.split(' '));

// tiny synonym clusters to bridge vocabulary gaps
const SYN = {
  energy: ['power', 'atp'], cell: ['cellular'], water: ['h2o', 'aqua'],
  plant: ['flora', 'vegetation'], animal: ['fauna', 'creature'],
  add: ['sum', 'plus', 'addition'], subtract: ['minus', 'difference'],
  multiply: ['product', 'times'], divide: ['quotient', 'division'],
  war: ['battle', 'conflict'], country: ['nation', 'state'],
  photosynthesis: ['photosynthetic'], mitochondria: ['mitochondrion'],
};

function stem(w) {
  return w.replace(/(ing|edly|ed|ies|ously|iously|ly|ies|es|s)$/,'').replace(/i$/, 'y');
}
function tokens(text) {
  const raw = String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  const out = [];
  for (const w of raw) {
    if (STOP.has(w) || w.length < 2) continue;
    out.push(stem(w));
  }
  return out;
}
function expand(toks) {
  const out = [...toks];
  for (const t of toks) if (SYN[t]) out.push(...SYN[t].map(stem));
  return out;
}
function itemText(q) {
  return [q.stem, ...q.choices.map((c) => c.text), q.subject, q.standard, ...(q.tags || [])].join(' ');
}

function buildIndex(items) {
  const docs = items.map((q) => ({ q, tf: termFreq(tokens(itemText(q))) }));
  const df = {};
  for (const d of docs) for (const t of Object.keys(d.tf)) df[t] = (df[t] || 0) + 1;
  const N = docs.length || 1;
  const idf = {};
  for (const t in df) idf[t] = Math.log(1 + N / df[t]);
  for (const d of docs) d.vec = tfidf(d.tf, idf);
  return { docs, idf };
}
function termFreq(toks) { const m = {}; for (const t of toks) m[t] = (m[t] || 0) + 1; return m; }
function tfidf(tf, idf) {
  const v = {}; let norm = 0;
  for (const t in tf) { const w = (1 + Math.log(tf[t])) * (idf[t] || 0); v[t] = w; norm += w * w; }
  norm = Math.sqrt(norm) || 1;
  for (const t in v) v[t] /= norm;
  return v;
}
function cosine(a, b) { let s = 0; for (const t in a) if (b[t]) s += a[t] * b[t]; return s; }

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Smart Search', 'Search your item bank by meaning, not just exact keywords. Find items on a topic — or the ones most similar to a question you already have.'));

  const items = Store.all();
  if (!items.length) {
    root.append(h('div.empty', { html: '<div class="big">🔎</div><h3>Nothing to search yet</h3><p>Add items via <a href="#/tool/pdf-to-qti">PDF → QTI</a> or the <a href="#/bank">Item Bank</a> first.</p>' }));
    mount.append(root); return;
  }
  const index = buildIndex(items);

  const box = h('div.panel');
  const input = h('input', { type: 'search', placeholder: 'e.g. “cell energy”, “fractions for beginners”, “world war causes”…', autofocus: true });
  box.append(h('label', {}, `Search ${items.length} items by meaning`), input);
  box.append(h('div.row.tight', { style: 'margin-top:.6rem' },
    ['cell energy', 'photosynthesis', 'multiplication', 'chemical formula'].map((ex) =>
      h('button.btn.sm.ghost', { onclick: () => { input.value = ex; run(); } }, ex))));
  root.append(box);
  const results = h('div', { style: 'margin-top:1rem' });
  root.append(results);
  mount.append(root);

  function run() {
    const query = input.value.trim();
    results.innerHTML = '';
    if (!query) return;
    const qvec = tfidf(termFreq(expand(tokens(query))), index.idf);
    const scored = index.docs.map((d) => ({ q: d.q, score: cosine(qvec, d.vec) }))
      .filter((r) => r.score > 0.001).sort((a, b) => b.score - a.score).slice(0, 25);
    if (!scored.length) { results.append(h('div.empty', {}, 'No semantic matches. Try broader wording.')); return; }
    results.append(h('h3', {}, `${scored.length} match${scored.length === 1 ? '' : 'es'}`));
    for (const r of scored) results.append(resultRow(r));
  }

  function resultRow(r) {
    const wrap = h('div');
    const card = questionCard(r.q);
    const pct = Math.round(Math.min(1, r.score * 1.4) * 100);
    card.prepend(h('div.spread', { style: 'margin-bottom:.4rem' }, [
      h('span.pill', {}, `${pct}% relevant`),
      h('button.btn.sm.ghost', { onclick: () => similar(r.q) }, '↔ More like this'),
    ]));
    wrap.append(card);
    return wrap;
  }

  function similar(item) {
    input.value = '';
    results.innerHTML = '';
    const base = index.docs.find((d) => d.q.id === item.id);
    const scored = index.docs.filter((d) => d.q.id !== item.id)
      .map((d) => ({ q: d.q, score: cosine(base.vec, d.vec) }))
      .filter((r) => r.score > 0.001).sort((a, b) => b.score - a.score).slice(0, 12);
    results.append(h('div.callout', { html: `Items most similar to: <b>${escapeShort(item.stem)}</b>` }));
    if (!scored.length) { results.append(h('div.empty', {}, 'No similar items found.')); return; }
    for (const r of scored) results.append(resultRow(r));
  }

  input.addEventListener('input', debounce(run, 180));
  function escapeShort(s) { const t = document.createElement('div'); t.textContent = s.slice(0, 80); return t.innerHTML; }
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
