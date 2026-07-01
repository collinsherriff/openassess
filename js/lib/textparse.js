// ===== Heuristic parser: raw text → questions =====
// Detects numbered stems, lettered options, true/false items and answer keys.
// Deliberately forgiving — teachers' documents are messy — and everything it
// produces is meant to be reviewed & corrected in the UI before export.
import { makeQuestion, normalize } from './model.js';

const NUM = /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})[.)\]:]\s+/i;
const OPT = /^\s*\(?([A-Ha-h])[.)\]]\s+(.*)$/;
const ANSWER_INLINE = /(?:correct\s+answer|answer|ans|key)\s*[:\-]?\s*\(?([A-Ha-h])\)?/i;
const ANSWER_TEXT = /(?:correct\s+answer|answer)\s*[:\-]\s*(.+)$/i;

// Split a big blob into logical lines, repairing PDF soft-wraps a little.
function toLines(text) {
  return text.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/,''));
}

// Parse a standalone answer key like "1. B  2. C  3. A" or "1) B".
export function parseAnswerKey(text) {
  const map = {};
  const re = /(\d{1,3})\s*[.):\-]?\s*([A-Ha-h])\b/g;
  let m; let hits = 0;
  while ((m = re.exec(text))) { map[Number(m[1])] = m[2].toUpperCase(); hits++; }
  return hits >= 2 ? map : null; // require a couple to avoid false positives
}

export function parseQuestions(rawText) {
  const lines = toLines(rawText);
  const warnings = [];

  // Detect a trailing answer-key section.
  let keyMap = null;
  const keyIdx = lines.findIndex((l) => /answer\s*key/i.test(l));
  if (keyIdx >= 0) {
    keyMap = parseAnswerKey(lines.slice(keyIdx).join('\n'));
  }

  const questions = [];
  let cur = null;
  const letters = 'ABCDEFGH';

  const push = () => {
    if (!cur) return;
    cur.stem = cur.stem.replace(/\s+/g, ' ').trim();
    if (!cur.stem) { cur = null; return; }
    // classify
    if (cur.choices.length >= 2) {
      const isTF = cur.choices.length === 2 && cur.choices.every((c) => /^(true|false)$/i.test(c.text.trim()));
      cur.type = isTF ? 'tf' : (cur.choices.filter((c) => c.correct).length > 1 ? 'multi' : 'mc');
    } else if (/_{3,}|\bblank\b/i.test(cur.stem) && cur.choices.length === 0) {
      cur.type = 'fib';
    } else if (cur.choices.length === 0) {
      cur.type = cur.answerText ? 'short' : 'short';
    }
    // apply inline answer letter
    if (cur.answerLetter != null && cur.choices.length) {
      const idx = letters.indexOf(cur.answerLetter.toUpperCase());
      if (idx >= 0 && cur.choices[idx]) cur.choices.forEach((c, i) => (c.correct = i === idx));
    }
    if (cur.answerText && (cur.type === 'short' || cur.type === 'fib')) {
      cur.answers = [cur.answerText.trim()];
    }
    questions.push(normalize(makeQuestion({
      type: cur.type, stem: cur.stem, choices: cur.choices,
      answers: cur.answers, source: 'Parsed text', num: cur.num,
    })));
    // stash num for key mapping
    questions[questions.length - 1]._num = cur.num;
    cur = null;
  };

  for (let raw of lines) {
    const line = raw.trim();
    if (keyIdx >= 0 && lines.indexOf(raw) >= keyIdx) break; // stop at answer key
    if (!line) continue;

    const numMatch = raw.match(NUM);
    const optMatch = raw.match(OPT);

    if (numMatch) {
      push();
      cur = { num: Number(numMatch[1]), stem: raw.replace(NUM, ''), choices: [], answers: [], type: 'mc',
              answerLetter: null, answerText: null };
      // stem might contain an inline answer marker
      continue;
    }

    if (!cur) continue; // preamble / instructions before Q1

    // inline answer line inside a question
    const ansTextM = line.match(ANSWER_TEXT);
    const ansInlineM = line.match(ANSWER_INLINE);
    if (/^\s*(correct\s+answer|answer|ans|key)\b/i.test(line)) {
      if (ansInlineM && !/[A-Ha-h][a-z]/.test(ansInlineM[0].replace(/answer/i,''))) cur.answerLetter = ansInlineM[1];
      if (ansTextM) cur.answerText = ansTextM[1];
      continue;
    }

    if (optMatch) {
      const marked = /\*/.test(optMatch[2]); // teachers sometimes star the key
      cur.choices.push({ text: optMatch[2].replace(/\*/g, '').trim(), correct: marked });
      continue;
    }

    // continuation of stem (or of last choice)
    if (cur.choices.length) cur.choices[cur.choices.length - 1].text += ' ' + line;
    else cur.stem += ' ' + line;
  }
  push();

  // Apply a detected answer key by question number.
  if (keyMap) {
    for (const q of questions) {
      const letter = keyMap[q._num];
      if (letter && q.choices.length) {
        const idx = 'ABCDEFGH'.indexOf(letter);
        if (idx >= 0) q.choices.forEach((c, i) => (c.correct = i === idx));
      }
    }
  }

  // Warn if nothing had a correct answer marked.
  const withAnswer = questions.filter((q) =>
    (q.choices && q.choices.some((c) => c.correct)) || (q.answers && q.answers.length)).length;
  if (questions.length && withAnswer === 0) {
    warnings.push('No answer key was detected — mark the correct answers in the review step below.');
  }
  questions.forEach((q) => delete q._num);
  return { questions, warnings };
}
