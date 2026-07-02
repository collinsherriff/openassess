// ===== Quiz & Worksheet Maker =====
import { h, toolHead, toast, download, questionCard, copy } from '../lib/ui.js';
import { Store } from '../lib/store.js';
import { TYPES, escapeHtml } from '../lib/model.js';
import { buildPackage } from '../lib/qti.js';
import { toMoodleXML } from '../lib/formats.js';
import { shareUrl } from '../lib/share.js';

export const QUIZ_KEY = 'openassess.currentQuiz';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Quiz & Worksheet Maker', 'Assemble a quiz or a printable worksheet from your item bank. Filter, shuffle, set a title — then print, export to your LMS, or deliver it live.'));

  const all = Store.all();
  if (!all.length) {
    root.append(h('div.empty', { html: '<h3>No items yet</h3><p>Build your bank with <a href="#/tool/pdf-to-qti">PDF → QTI</a> first.</p>' }));
    mount.append(root); return;
  }

  const opts = { title: 'Untitled Assessment', count: Math.min(10, all.length), subject: '', difficulty: '', type: '', shuffleQ: true, shuffleO: true, showPoints: true };
  let selection = [];

  const panel = h('div.panel');
  root.append(panel);
  const preview = h('div', { style: 'margin-top:1rem' });
  root.append(preview);
  mount.append(root);

  function facet(label, field) {
    const s = h('select', { onchange: (e) => { opts[field] = e.target.value; } });
    s.append(h('option', { value: '' }, label));
    const vals = field === 'type' ? Object.keys(TYPES) : Store.facet(field);
    for (const v of vals) s.append(h('option', { value: v }, field === 'type' ? TYPES[v].label : v));
    return s;
  }

  panel.append(h('div.field', {}, [h('label', {}, 'Title'), h('input', { type: 'text', value: opts.title, oninput: (e) => opts.title = e.target.value })]));
  panel.append(h('div.inline-fields', {}, [
    h('div', {}, [h('label', {}, 'Subject'), facet('Any', 'subject')]),
    h('div', {}, [h('label', {}, 'Difficulty'), facet('Any', 'difficulty')]),
    h('div', {}, [h('label', {}, 'Type'), facet('Any', 'type')]),
    h('div', {}, [h('label', {}, '# Questions'), h('input', { type: 'number', min: 1, max: all.length, value: opts.count, oninput: (e) => opts.count = Number(e.target.value) })]),
  ]));
  panel.append(h('div.row.tight', { style: 'margin-top:.7rem' }, [
    check('Shuffle questions', 'shuffleQ'), check('Shuffle options', 'shuffleO'), check('Show points', 'showPoints'),
  ]));
  panel.append(h('button.btn.primary', { style: 'margin-top:.9rem', onclick: build }, 'Generate'));

  function check(label, field) {
    const cb = h('input', { type: 'checkbox', checked: opts[field], onchange: (e) => opts[field] = e.target.checked });
    return h('label.checkline', {}, [cb, label]);
  }

  function build() {
    let pool = all.filter((q) =>
      (!opts.subject || q.subject === opts.subject) &&
      (!opts.difficulty || q.difficulty === opts.difficulty) &&
      (!opts.type || q.type === opts.type));
    if (!pool.length) { toast('No items match those filters'); return; }
    if (opts.shuffleQ) pool = shuffle(pool);
    selection = pool.slice(0, opts.count).map((q) => {
      const copy = JSON.parse(JSON.stringify(q));
      if (opts.shuffleO && copy.choices?.length) copy.choices = shuffle(copy.choices);
      return copy;
    });
    renderPreview();
  }

  function renderPreview() {
    preview.innerHTML = '';
    const total = selection.reduce((s, q) => s + (q.points ?? 1), 0);
    preview.append(h('div.spread', {}, [
      h('h3', {}, `${selection.length} questions · ${total} points`),
      h('div.row.tight', {}, [
        h('button.btn.sm.primary', { onclick: takeLive }, 'Deliver live'),
        h('button.btn.sm', { onclick: shareLink }, 'Share link'),
        h('button.btn.sm', { onclick: () => printDoc(false) }, 'Worksheet'),
        h('button.btn.sm', { onclick: () => printDoc(true) }, 'Answer key'),
        h('button.btn.sm', { onclick: async () => download('quiz-qti.zip', await buildPackage(selection, { title: opts.title })) }, 'QTI'),
        h('button.btn.sm', { onclick: () => download('quiz-moodle.xml', toMoodleXML(selection), 'application/xml') }, 'Moodle'),
      ]),
    ]));
    selection.forEach((q, i) => preview.append(questionCard(q, { index: i, showAnswer: false })));
  }

  function takeLive() {
    sessionStorage.setItem(QUIZ_KEY, JSON.stringify({ title: opts.title, questions: selection }));
    location.hash = '#/tool/quiz';
  }

  function shareLink() {
    const url = shareUrl({ title: opts.title, questions: selection });
    preview.querySelector('#sharebox')?.remove();
    const box = h('div.panel', { id: 'sharebox', style: 'margin:.8rem 0' }, [
      h('div.spread', {}, [
        h('h3', { style: 'margin:0' }, 'Shareable link'),
        h('span.pill.ghost', {}, `${(url.length / 1024).toFixed(1)} KB`),
      ]),
      h('p.muted', { style: 'margin:.3rem 0 .6rem' }, 'The whole test is encoded in this link — no login or upload. Anyone who opens it takes the quiz in their browser and gets graded instantly.'),
      h('input', { type: 'text', readonly: true, value: url, onclick: (e) => e.target.select() }),
      h('div.row.tight', { style: 'margin-top:.6rem' }, [
        h('button.btn.sm.primary', { onclick: () => copy(url) }, 'Copy link'),
        h('a.btn.sm', { href: url.slice(url.indexOf('#')), target: '_blank' }, '↗ Open as student'),
      ]),
      url.length > 8000 ? h('div.callout.warn', { style: 'margin-top:.6rem' },
        'Heads up: this test is large, so the link is long. Some chat apps truncate very long URLs — for big tests, prefer QTI export or “Deliver live”.') : null,
    ]);
    preview.insertBefore(box, preview.children[1]);
    copy(url);
  }

  function printDoc(withKey) {
    const total = selection.reduce((s, q) => s + (q.points ?? 1), 0);
    const letters = 'ABCDEFGH';
    const body = selection.map((q, i) => {
      const pts = opts.showPoints ? ` <span style="color:#666">(${q.points ?? 1} pt)</span>` : '';
      let inner = '';
      if (q.choices?.length) {
        inner = '<div style="margin:.3rem 0 .3rem 1.2rem">' + q.choices.map((c, ci) =>
          `<div>${letters[ci]}. ${escapeHtml(c.text)}${withKey && c.correct ? ' <b style="color:#137a3e">✓</b>' : ''}</div>`).join('') + '</div>';
      } else if (q.type === 'short' || q.type === 'fib') {
        inner = withKey ? `<div style="margin-left:1.2rem;color:#137a3e"><b>Answer:</b> ${escapeHtml((q.answers || []).join(' / '))}</div>`
          : '<div style="border-bottom:1px solid #999;height:1.4rem;margin:.4rem 1.2rem"></div>';
      } else if (q.type === 'essay') {
        inner = withKey ? '' : '<div style="border:1px solid #ccc;height:5rem;margin:.4rem 1.2rem;border-radius:6px"></div>';
      }
      return `<div style="margin:0 0 1.1rem;break-inside:avoid"><b>${i + 1}.</b> ${escapeHtml(q.stem)}${pts}${inner}</div>`;
    }).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(opts.title)}${withKey ? ' — Answer Key' : ''}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:2rem auto;padding:0 1.5rem;color:#111;line-height:1.5}
      h1{font-size:1.5rem;margin:0} .head{border-bottom:2px solid #111;padding-bottom:.6rem;margin-bottom:1.2rem}
      .meta{color:#555;font-size:.9rem} @media print{body{margin:0}}</style></head>
      <body><div class="head"><h1>${escapeHtml(opts.title)}${withKey ? ' — Answer Key' : ''}</h1>
      <div class="meta">Name: ______________________  Date: __________  ·  ${selection.length} questions · ${total} points</div></div>
      ${body}<script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }
}

function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
