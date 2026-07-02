// ===== Test Player — deliver & auto-grade in the browser =====
import { h, toolHead, toast } from '../lib/ui.js';
import { Store } from '../lib/store.js';
import { grade, isChoiceType, escapeHtml, TYPES } from '../lib/model.js';
import { QUIZ_KEY } from './generator.js';

export async function render(mount) {
  const root = h('div');
  mount.append(root);

  let quiz = null;
  try { quiz = JSON.parse(sessionStorage.getItem(QUIZ_KEY)); } catch {}

  if (!quiz || !quiz.questions?.length) {
    // build a quick quiz from the whole bank
    const all = Store.all();
    root.append(toolHead('Test Player', 'Deliver an assessment in the browser with a timer, shuffle and instant auto-grading.'));
    if (!all.length) {
      root.append(h('div.empty', { html: '<h3>No quiz loaded</h3><p>Build one in the <a href="#/tool/generator">Quiz Maker</a>, or add items to your <a href="#/bank">bank</a>.</p>' }));
      return;
    }
    root.append(h('div.panel', {}, [
      h('h3', {}, 'Quick test'),
      h('p.muted', {}, `Deliver all ${all.length} items in your bank as a practice test, or head to the Quiz Maker for a filtered set.`),
      h('div.row.tight', {}, [
        h('button.btn.primary', { onclick: () => start({ title: 'Practice Test', questions: all }) }, `Start (${all.length} questions)`),
        h('a.btn', { href: '#/tool/generator' }, 'Quiz Maker →'),
      ]),
    ]));
    return;
  }
  start(quiz);

  function start(q) {
    root.innerHTML = '';
    new Runner(root, q).mount();
  }
}

export class Runner {
  constructor(root, quiz, opts = {}) {
    this.root = root;
    this.quiz = quiz;
    this.opts = opts;         // { shared: bool }
    this.responses = {}; // id -> value(s)
    this.startTime = Date.now();
  }

  mount() {
    const q = this.quiz;
    const head = h('div.spread', {}, [
      h('div', { html: `<h1 style="margin:0">${escapeHtml(q.title || 'Assessment')}</h1><p class="muted" style="margin:.2rem 0 0">${q.questions.length} questions</p>` }),
      h('div.panel', { style: 'padding:.6rem 1rem;text-align:center' }, [
        h('div.lbl', { style: 'font-size:.7rem;color:var(--text-soft)' }, 'ELAPSED'),
        h('div.quiz-timer', { id: 'qtimer' }, '0:00'),
      ]),
    ]);
    this.root.append(head);
    this.timer = setInterval(() => {
      const s = Math.floor((Date.now() - this.startTime) / 1000);
      const el = document.getElementById('qtimer');
      if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 500);

    const form = h('div', { style: 'margin-top:1.2rem' });
    q.questions.forEach((question, i) => form.append(this.questionBlock(question, i)));
    this.root.append(form);
    this.root.append(h('button.btn.primary', { style: 'margin-top:1rem', onclick: () => this.submit() }, 'Submit & grade'));
  }

  questionBlock(q, i) {
    const block = h('div.quiz-q', { id: `q_${q.id}` });
    block.append(h('div.q-type', { style: 'font-size:.72rem;font-weight:700;color:var(--accent);text-transform:uppercase' },
      `${TYPES[q.type]?.label || q.type} · ${q.points ?? 1} pt`));
    block.append(h('div', { style: 'font-weight:600;margin:.3rem 0 .6rem', text: `${i + 1}. ${q.stem}` }));

    if (isChoiceType(q.type)) {
      q.choices.forEach((c, ci) => {
        const opt = h('label.opt', {}, [
          h('input', { type: q.type === 'multi' ? 'checkbox' : 'radio', name: q.id,
            onchange: (e) => {
              if (q.type === 'multi') {
                const set = new Set(this.responses[q.id] || []);
                e.target.checked ? set.add(ci) : set.delete(ci);
                this.responses[q.id] = [...set];
              } else this.responses[q.id] = [ci];
              [...block.querySelectorAll('.opt')].forEach((o, oi) => o.classList.toggle('picked',
                (this.responses[q.id] || []).includes(oi)));
            } }),
          h('span', {}, c.text),
        ]);
        block.append(opt);
      });
    } else if (q.type === 'short' || q.type === 'fib') {
      block.append(h('input', { type: 'text', placeholder: 'Your answer', oninput: (e) => this.responses[q.id] = e.target.value }));
    } else {
      block.append(h('textarea', { placeholder: 'Your response (graded manually)', oninput: (e) => this.responses[q.id] = e.target.value }));
    }
    return block;
  }

  submit() {
    clearInterval(this.timer);
    const q = this.quiz;
    let earned = 0, possible = 0, autoCount = 0, correctCount = 0, needsManual = 0;
    const perItem = [];
    for (const question of q.questions) {
      const pts = question.points ?? 1;
      possible += pts;
      const res = grade(question, this.responses[question.id]);
      if (res.correct === null) { needsManual++; }
      else { autoCount++; if (res.correct) correctCount++; }
      earned += res.earned;
      perItem.push({ id: question.id, correct: res.correct });
      // colour the options
      const block = document.getElementById(`q_${question.id}`);
      if (block && isChoiceType(question.type)) {
        const picked = this.responses[question.id] || [];
        [...block.querySelectorAll('.opt')].forEach((o, oi) => {
          o.style.pointerEvents = 'none';
          if (question.choices[oi].correct) o.classList.add('right');
          else if (picked.includes(oi)) o.classList.add('wrong');
        });
      }
    }
    const durationSec = Math.round((Date.now() - this.startTime) / 1000);
    const pct = possible ? Math.round((earned / possible) * 100) : 0;

    // persist for the report maker
    Store.saveResult({
      quizTitle: q.title || 'Assessment', total: q.questions.length,
      earned, possible, pct, durationSec, perItem,
    });

    const summary = h('div.panel', { style: 'margin-bottom:1.2rem' }, [
      h('h2', { style: 'margin-top:0' }, `Score: ${earned}/${possible} · ${pct}%`),
      h('div.meter', {}, [h('span', { style: `width:${pct}%` })]),
      h('div.statgrid', { style: 'margin-top:1rem' }, [
        stat(correctCount, 'Auto-correct'),
        stat(autoCount - correctCount, 'Incorrect'),
        stat(needsManual, 'To grade'),
        stat(`${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`, 'Time'),
      ]),
      h('div.row.tight', { style: 'margin-top:1rem' },
        this.opts.shared ? [
          h('button.btn.sm.primary', { onclick: () => location.reload() }, 'Retake'),
          h('a.btn.sm', { href: '#/' }, 'About OpenAssess'),
        ] : [
          h('a.btn.sm.primary', { href: '#/tool/reports' }, 'View in Reports'),
          h('button.btn.sm', { onclick: () => location.reload() }, 'Retake'),
        ]),
    ]);
    this.root.prepend(summary);
    summary.scrollIntoView({ behavior: 'smooth' });
    toast(`Scored ${pct}%`);
  }
}

function stat(num, lbl) { return h('div.stat', {}, [h('div.num', {}, String(num)), h('div.lbl', {}, lbl)]); }
