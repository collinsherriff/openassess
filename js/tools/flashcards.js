// ===== Flashcard Maker =====
// Turns item-bank questions (or pasted "term = definition" pairs) into a
// flip-card study deck, with an Anki-compatible CSV export.
import { h, toolHead, toast, download } from '../lib/ui.js';
import { Store } from '../lib/store.js';
import { escapeHtml } from '../lib/model.js';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Flashcard Maker', 'Build a study deck from your item bank or a plain term/definition list, then flip through it or export to Anki & Quizlet.'));

  let cards = [];
  const source = h('div.panel');
  root.append(source);
  const study = h('div', { style: 'margin-top:1rem' });
  root.append(study);
  mount.append(root);

  source.append(h('h3', {}, 'Build a deck'));
  source.append(h('div.row.tight', {}, [
    h('button.btn.sm.primary', { onclick: fromBank }, `From Item Bank (${Store.count()})`),
    h('button.btn.sm', { onclick: () => pasteMode() }, 'From term = definition list'),
  ]));
  const area = h('div', { style: 'margin-top:.8rem' });
  source.append(area);

  function fromBank() {
    const items = Store.all();
    if (!items.length) { toast('Your bank is empty'); return; }
    cards = items.map((q) => ({
      front: q.stem,
      back: q.choices?.length ? (q.choices.filter((c) => c.correct).map((c) => c.text).join(', ') || '(no key)')
        : (q.answers || []).join(' / ') || '(open response)',
    })).filter((c) => c.front);
    area.innerHTML = '';
    renderStudy();
  }

  function pasteMode() {
    area.innerHTML = '';
    const ta = h('textarea', { class: 'code', placeholder: 'One per line:\nphotosynthesis = how plants make food from light\nmitochondria = the powerhouse of the cell', style: 'min-height:160px' });
    area.append(ta);
    area.append(h('button.btn.sm.primary', { style: 'margin-top:.6rem', onclick: () => {
      cards = ta.value.split('\n').map((l) => l.split(/\s[=|\t]\s|=|\t/)).filter((p) => p[0]?.trim())
        .map((p) => ({ front: (p[0] || '').trim(), back: (p.slice(1).join('=') || '').trim() }));
      if (!cards.length) { toast('Add some term = definition lines'); return; }
      renderStudy();
    } }, 'Make deck'));
  }

  function renderStudy() {
    study.innerHTML = '';
    if (!cards.length) return;
    let i = 0, flipped = false;
    study.append(h('div.spread', {}, [
      h('h3', {}, `${cards.length}-card deck`),
      h('div.row.tight', {}, [
        h('button.btn.sm', { onclick: () => download('flashcards-anki.csv', ankiCSV(cards), 'text/csv') }, 'Anki / Quizlet CSV'),
      ]),
    ]));

    const card = h('div.panel', { style: 'min-height:220px;display:grid;place-items:center;text-align:center;cursor:pointer;font-size:1.25rem;user-select:none' });
    const counter = h('div.muted.center', { style: 'margin-top:.6rem' });
    const draw = () => {
      card.innerHTML = '';
      card.append(h('div', {}, [
        h('div.muted', { style: 'font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem' }, flipped ? 'Answer' : 'Term'),
        h('div', { html: escapeHtml(flipped ? cards[i].back : cards[i].front) }),
        h('div.muted', { style: 'font-size:.8rem;margin-top:1rem' }, flipped ? '' : '(click to flip)'),
      ]));
      counter.textContent = `${i + 1} / ${cards.length}`;
    };
    card.onclick = () => { flipped = !flipped; draw(); };
    const nav = h('div.row', { style: 'justify-content:center;margin-top:.8rem' }, [
      h('button.btn', { onclick: () => { i = (i - 1 + cards.length) % cards.length; flipped = false; draw(); } }, '← Prev'),
      h('button.btn', { onclick: () => { flipped = !flipped; draw(); } }, 'Flip'),
      h('button.btn', { onclick: () => { i = (i + 1) % cards.length; flipped = false; draw(); } }, 'Next →'),
      h('button.btn.ghost', { onclick: () => { cards = shuffle(cards); i = 0; flipped = false; draw(); } }, 'Shuffle'),
    ]);
    study.append(card, counter, nav);
    draw();
  }
}

function ankiCSV(cards) {
  return cards.map((c) => [c.front, c.back].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
}
function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
