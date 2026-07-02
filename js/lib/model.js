// ===== Canonical question model shared by every tool =====
// A Question is the single interchange format. Every importer produces these,
// every exporter consumes them, and the item bank stores them.
//
// {
//   id, type: 'mc'|'multi'|'tf'|'short'|'essay'|'fib',
//   stem:    string,                       // the question text
//   choices: [{ text, correct }],          // for mc / multi / tf
//   answers: [ string ],                   // accepted answers for short / fib
//   points:  number,
//   feedback:string,                       // general feedback / rationale
//   subject, difficulty, bloom, standard,  // metadata (strings)
//   tags:   [ string ],
//   source: string                         // where it came from
// }

export const TYPES = {
  mc:    { label: 'Multiple choice',   icon: '' },
  multi: { label: 'Multiple answer',   icon: '' },
  tf:    { label: 'True / false',      icon: '' },
  short: { label: 'Short answer',      icon: '' },
  fib:   { label: 'Fill in the blank', icon: '' },
  essay: { label: 'Essay',             icon: '' },
};

export const BLOOM = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
export const DIFFICULTY = ['Easy', 'Medium', 'Hard'];

let counter = 0;
export function uid(prefix = 'q') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeQuestion(partial = {}) {
  return {
    id: partial.id || uid(),
    type: partial.type || 'mc',
    stem: partial.stem || '',
    choices: partial.choices || [],
    answers: partial.answers || [],
    points: partial.points ?? 1,
    feedback: partial.feedback || '',
    subject: partial.subject || '',
    difficulty: partial.difficulty || '',
    bloom: partial.bloom || '',
    standard: partial.standard || '',
    tags: partial.tags || [],
    source: partial.source || '',
    created: partial.created || Date.now(),
  };
}

// A choice-based type has selectable options; short/fib/essay do not.
export const isChoiceType = (t) => t === 'mc' || t === 'multi' || t === 'tf';

// Normalise loosely-shaped objects (e.g. from parsers) into valid questions.
export function normalize(q) {
  const out = makeQuestion(q);
  out.choices = (out.choices || []).map((c) =>
    typeof c === 'string' ? { text: c, correct: false } : { text: c.text || '', correct: !!c.correct }
  );
  if (out.type === 'tf' && out.choices.length === 0) {
    out.choices = [{ text: 'True', correct: false }, { text: 'False', correct: false }];
  }
  return out;
}

// Grade a single learner response against a question. Returns {correct, earned}.
export function grade(q, response) {
  const pts = q.points ?? 1;
  if (isChoiceType(q.type)) {
    const correctIdx = q.choices.map((c, i) => (c.correct ? i : -1)).filter((i) => i >= 0);
    const picked = Array.isArray(response) ? response : response == null ? [] : [response];
    const same =
      picked.length === correctIdx.length &&
      picked.every((i) => correctIdx.includes(Number(i)));
    return { correct: same, earned: same ? pts : 0 };
  }
  if (q.type === 'short' || q.type === 'fib') {
    const given = String(response || '').trim().toLowerCase();
    const ok = (q.answers || []).some((a) => String(a).trim().toLowerCase() === given && given !== '');
    return { correct: ok, earned: ok ? pts : 0 };
  }
  // essay: not auto-graded
  return { correct: null, earned: 0 };
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
