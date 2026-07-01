// ===== Editable question widget =====
// Renders an inline editor for one question and calls onChange(updatedQuestion)
// on every edit. Used by the PDF importer, converter and item bank.
import { h } from './ui.js';
import { TYPES, BLOOM, DIFFICULTY, isChoiceType, makeQuestion } from './model.js';

export function questionEditor(q, onChange, onRemove) {
  const state = { ...makeQuestion(q) };
  const wrap = h('div.q-card');
  const emit = () => onChange && onChange({ ...state });

  function typeRow() {
    const sel = h('select', { onchange: (e) => { state.type = e.target.value; ensureShape(); render(); emit(); } });
    for (const [val, def] of Object.entries(TYPES)) {
      const opt = h('option', { value: val }, `${def.icon} ${def.label}`);
      if (val === state.type) opt.selected = true;
      sel.append(opt);
    }
    const pts = h('input', { type: 'number', min: '0', step: '0.5', value: state.points,
      style: 'width:5rem', oninput: (e) => { state.points = Number(e.target.value); emit(); } });
    const row = h('div.inline-fields');
    row.append(
      h('div', {}, [h('label', {}, 'Type'), sel]),
      h('div', {}, [h('label', {}, 'Points'), pts]),
    );
    if (onRemove) row.append(h('div', { style: 'align-self:end' },
      [h('button.btn.sm.danger', { onclick: onRemove }, '🗑 Remove')]));
    return row;
  }

  function ensureShape() {
    if (state.type === 'tf') {
      const wasTrue = state.choices?.find((c) => /true/i.test(c.text))?.correct;
      state.choices = [{ text: 'True', correct: !!wasTrue }, { text: 'False', correct: !wasTrue }];
    } else if (isChoiceType(state.type)) {
      if (!state.choices || state.choices.length < 2) state.choices = [{ text: '', correct: true }, { text: '', correct: false }];
    }
  }

  function choicesBlock() {
    const box = h('div.stack');
    state.choices.forEach((c, i) => {
      const isTF = state.type === 'tf';
      const input = h('input', { type: state.type === 'multi' ? 'checkbox' : 'radio', name: `c_${state.id}`,
        checked: c.correct, onchange: (e) => {
          if (state.type === 'multi') c.correct = e.target.checked;
          else state.choices.forEach((x, xi) => (x.correct = xi === i));
          emit();
        } });
      const text = h('input', { type: 'text', value: c.text, disabled: isTF, placeholder: `Option ${i + 1}`,
        oninput: (e) => { c.text = e.target.value; emit(); } });
      const row = h('div.checkline', {}, [input, text]);
      if (!isTF && state.choices.length > 2) {
        row.append(h('button.btn.sm.ghost', { title: 'Delete option',
          onclick: () => { state.choices.splice(i, 1); render(); emit(); } }, '✕'));
      }
      box.append(row);
    });
    if (state.type !== 'tf') {
      box.append(h('button.btn.sm.ghost', { onclick: () => { state.choices.push({ text: '', correct: false }); render(); emit(); } }, '+ Add option'));
    }
    return box;
  }

  function answersBlock() {
    const val = (state.answers || []).join(' | ');
    return h('div.field', {}, [
      h('label', {}, 'Accepted answer(s)'),
      h('div.hint', {}, 'Separate multiple acceptable answers with a vertical bar |'),
      h('input', { type: 'text', value: val, placeholder: 'e.g. photosynthesis | photo-synthesis',
        oninput: (e) => { state.answers = e.target.value.split('|').map((s) => s.trim()).filter(Boolean); emit(); } }),
    ]);
  }

  function metaBlock() {
    const mk = (label, field, opts) => {
      let ctrl;
      if (opts) {
        ctrl = h('select', { onchange: (e) => { state[field] = e.target.value; emit(); } });
        ctrl.append(h('option', { value: '' }, '—'));
        for (const o of opts) { const op = h('option', { value: o }, o); if (state[field] === o) op.selected = true; ctrl.append(op); }
      } else {
        ctrl = h('input', { type: 'text', value: state[field] || '', oninput: (e) => { state[field] = e.target.value; emit(); } });
      }
      return h('div', {}, [h('label', {}, label), ctrl]);
    };
    return h('div.inline-fields', {}, [
      mk('Subject', 'subject'),
      mk('Difficulty', 'difficulty', DIFFICULTY),
      mk("Bloom's level", 'bloom', BLOOM),
      mk('Standard', 'standard'),
    ]);
  }

  function render() {
    wrap.innerHTML = '';
    ensureShape();
    wrap.append(typeRow());
    wrap.append(h('div.field', { style: 'margin-top:.8rem' }, [
      h('label', {}, 'Question'),
      h('textarea', { oninput: (e) => { state.stem = e.target.value; emit(); }, style: 'min-height:70px' }, state.stem),
    ]));
    if (isChoiceType(state.type)) wrap.append(choicesBlock());
    else if (state.type === 'short' || state.type === 'fib') wrap.append(answersBlock());
    else wrap.append(h('p.muted', {}, 'Essay — graded manually.'));
    const details = h('details', { style: 'margin-top:.7rem' });
    details.append(h('summary', { style: 'cursor:pointer;font-weight:600;font-size:.85rem' }, 'Tags & metadata'));
    details.append(metaBlock());
    details.append(h('div.field', { style: 'margin-top:.6rem' }, [
      h('label', {}, 'Tags'),
      h('input', { type: 'text', value: (state.tags || []).join(', '), placeholder: 'comma, separated',
        oninput: (e) => { state.tags = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); emit(); } }),
    ]));
    wrap.append(details);
  }

  render();
  return wrap;
}
