// ===== Format importers & exporters =====
// Converts the canonical question model to/from the exchange formats teachers
// actually meet in the wild: GIFT, Aiken, Moodle XML and CSV. QTI lives in qti.js.
import { makeQuestion, normalize, isChoiceType, escapeHtml } from './model.js';

/* ---------------------------------------------------------------- GIFT ----
   Moodle's plain-text format. Example:
   ::Title:: The capital of France is {=Paris ~London ~Rome}
--------------------------------------------------------------------------- */
export function parseGIFT(text) {
  const out = [];
  // split into blocks separated by blank lines, ignoring // comments
  const clean = text.replace(/^\s*\/\/.*$/gm, '');
  const blocks = clean.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const m = block.match(/\{([\s\S]*?)\}/);
    let title = '';
    let body = block;
    const tm = body.match(/^::(.*?)::/);
    if (tm) { title = tm[1].trim(); body = body.slice(tm[0].length); }
    if (!m) { // no answer braces => description, skip
      continue;
    }
    const stem = body.slice(0, body.indexOf('{')).trim().replace(/\s+/g, ' ');
    const inner = m[1].trim();
    const q = makeQuestion({ stem: stem || title, source: 'GIFT' });

    if (inner === 'T' || inner === 'TRUE' || inner === 'F' || inner === 'FALSE') {
      q.type = 'tf';
      const isTrue = inner === 'T' || inner === 'TRUE';
      q.choices = [{ text: 'True', correct: isTrue }, { text: 'False', correct: !isTrue }];
    } else if (/^=[^~]*$/.test(inner) || (!inner.includes('~') && inner.startsWith('='))) {
      q.type = 'short';
      q.answers = inner.split('=').map((s) => s.trim()).filter(Boolean);
    } else {
      const parts = inner.match(/[=~][^=~]*/g) || [];
      const choices = parts.map((p) => ({
        text: p.slice(1).replace(/#.*/, '').replace(/%-?\d+%/, '').trim(),
        correct: p[0] === '=',
      }));
      const correctCount = choices.filter((c) => c.correct).length;
      q.type = correctCount > 1 ? 'multi' : 'mc';
      q.choices = choices;
    }
    out.push(normalize(q));
  }
  return out;
}

export function toGIFT(questions) {
  return questions.map((q, i) => {
    const title = `::Q${i + 1}::`;
    const stem = q.stem.replace(/([{}=~#])/g, '\\$1');
    if (q.type === 'tf') {
      const t = q.choices.find((c) => /true/i.test(c.text));
      return `${title} ${stem} {${t && t.correct ? 'T' : 'F'}}`;
    }
    if (q.type === 'short' || q.type === 'fib') {
      return `${title} ${stem} {${(q.answers || []).map((a) => '=' + a).join(' ')}}`;
    }
    if (q.type === 'essay') return `${title} ${stem} {}`;
    const body = q.choices.map((c) => `${c.correct ? '=' : '~'}${c.text}`).join(' ');
    return `${title} ${stem} {${body}}`;
  }).join('\n\n') + '\n';
}

/* --------------------------------------------------------------- Aiken ----
   Simple MC format used by Moodle & Blackboard imports.
   Question text
   A. option
   B. option
   ANSWER: B
--------------------------------------------------------------------------- */
export function parseAiken(text) {
  const out = [];
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const ansLine = lines.find((l) => /^answer\s*[:.]/i.test(l));
    if (!ansLine) continue;
    const letter = (ansLine.match(/[:.]\s*([A-Z])/i) || [])[1];
    const choiceLines = lines.filter((l) => /^[A-Z][.)]\s+/.test(l));
    const stemLines = lines.filter((l) => !/^[A-Z][.)]\s+/.test(l) && !/^answer/i.test(l));
    const choices = choiceLines.map((l) => {
      const lm = l.match(/^([A-Z])[.)]\s+(.*)/);
      return { letter: lm[1], text: lm[2], correct: lm[1] === letter };
    });
    out.push(normalize(makeQuestion({
      type: 'mc', stem: stemLines.join(' '), choices: choices.map(({ text, correct }) => ({ text, correct })), source: 'Aiken',
    })));
  }
  return out;
}

export function toAiken(questions) {
  return questions.filter((q) => q.type === 'mc' || q.type === 'multi' || q.type === 'tf').map((q) => {
    const letters = 'ABCDEFGH';
    const lines = [q.stem];
    q.choices.forEach((c, i) => lines.push(`${letters[i]}. ${c.text}`));
    const correct = q.choices.findIndex((c) => c.correct);
    lines.push(`ANSWER: ${letters[correct] || 'A'}`);
    return lines.join('\n');
  }).join('\n\n') + '\n';
}

/* ---------------------------------------------------------- Moodle XML ----- */
export function parseMoodleXML(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const out = [];
  doc.querySelectorAll('question').forEach((node) => {
    const type = node.getAttribute('type');
    if (!type || type === 'category') return;
    const stem = txt(node.querySelector('questiontext > text'));
    const q = makeQuestion({ stem, source: 'Moodle XML' });
    const answers = [...node.querySelectorAll(':scope > answer')];
    if (type === 'truefalse') {
      q.type = 'tf';
      const trueAns = answers.find((a) => /^true$/i.test(txt(a.querySelector('text'))));
      const isTrue = trueAns && Number(trueAns.getAttribute('fraction')) > 0;
      q.choices = [{ text: 'True', correct: !!isTrue }, { text: 'False', correct: !isTrue }];
    } else if (type === 'shortanswer') {
      q.type = 'short';
      q.answers = answers.filter((a) => Number(a.getAttribute('fraction')) > 0).map((a) => txt(a.querySelector('text')));
    } else if (type === 'essay') {
      q.type = 'essay';
    } else { // multichoice
      const single = txt(node.querySelector('single')) !== 'false';
      q.type = single ? 'mc' : 'multi';
      q.choices = answers.map((a) => ({ text: txt(a.querySelector('text')), correct: Number(a.getAttribute('fraction')) > 0 }));
    }
    out.push(normalize(q));
  });
  return out;
}

export function toMoodleXML(questions) {
  const esc = escapeHtml;
  const body = questions.map((q, i) => {
    const head = `  <question type="${moodleType(q)}">
    <name><text>Q${i + 1}</text></name>
    <questiontext format="html"><text><![CDATA[${q.stem}]]></text></questiontext>
    <defaultgrade>${q.points ?? 1}</defaultgrade>`;
    let ans = '';
    if (q.type === 'tf') {
      const t = q.choices.find((c) => /true/i.test(c.text));
      const tf = t && t.correct;
      ans = `
    <answer fraction="${tf ? 100 : 0}"><text>true</text></answer>
    <answer fraction="${tf ? 0 : 100}"><text>false</text></answer>`;
    } else if (q.type === 'short' || q.type === 'fib') {
      ans = (q.answers || []).map((a) => `\n    <answer fraction="100"><text>${esc(a)}</text></answer>`).join('');
    } else if (q.type === 'essay') {
      ans = '';
    } else {
      const nCorrect = q.choices.filter((c) => c.correct).length || 1;
      ans = `\n    <single>${q.type === 'mc' ? 'true' : 'false'}</single>` +
        q.choices.map((c) => `\n    <answer fraction="${c.correct ? Math.round(100 / nCorrect) : 0}"><text><![CDATA[${c.text}]]></text></answer>`).join('');
    }
    return `${head}${ans}\n  </question>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n${body}\n</quiz>\n`;
}

/* ------------------------------------------------------------------ CSV ---- */
export function toCSV(questions) {
  const rows = [['type', 'stem', 'choices', 'correct', 'answers', 'points', 'subject', 'difficulty', 'bloom', 'standard', 'tags']];
  for (const q of questions) {
    rows.push([
      q.type, q.stem,
      q.choices.map((c) => c.text).join(' | '),
      q.choices.map((c, i) => (c.correct ? i + 1 : null)).filter((x) => x).join(','),
      (q.answers || []).join(' | '),
      q.points ?? 1, q.subject, q.difficulty, q.bloom, q.standard, (q.tags || []).join(';'),
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function parseCSV(text) {
  const rows = csvRows(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (n) => header.indexOf(n);
  return rows.slice(1).filter((r) => r.length && r.join('').trim()).map((r) => {
    const choicesRaw = (r[idx('choices')] || '').split('|').map((s) => s.trim()).filter(Boolean);
    const correctSet = new Set((r[idx('correct')] || '').split(',').map((s) => Number(s.trim())));
    return normalize(makeQuestion({
      type: r[idx('type')] || 'mc',
      stem: r[idx('stem')] || '',
      choices: choicesRaw.map((t, i) => ({ text: t, correct: correctSet.has(i + 1) })),
      answers: (r[idx('answers')] || '').split('|').map((s) => s.trim()).filter(Boolean),
      points: Number(r[idx('points')]) || 1,
      subject: r[idx('subject')] || '', difficulty: r[idx('difficulty')] || '',
      bloom: r[idx('bloom')] || '', standard: r[idx('standard')] || '',
      tags: (r[idx('tags')] || '').split(';').map((s) => s.trim()).filter(Boolean),
      source: 'CSV',
    }));
  });
}

/* ------------------------------------------------------------- helpers ----- */
function txt(node) { return node ? (node.textContent || '').trim() : ''; }
function moodleType(q) {
  if (q.type === 'tf') return 'truefalse';
  if (q.type === 'short' || q.type === 'fib') return 'shortanswer';
  if (q.type === 'essay') return 'essay';
  return 'multichoice';
}
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvRows(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export const FORMATS = {
  gift:   { label: 'GIFT (Moodle)',   parse: parseGIFT,      serialize: toGIFT,      ext: 'txt' },
  aiken:  { label: 'Aiken',           parse: parseAiken,     serialize: toAiken,     ext: 'txt' },
  moodle: { label: 'Moodle XML',      parse: parseMoodleXML, serialize: toMoodleXML, ext: 'xml' },
  csv:    { label: 'CSV',             parse: parseCSV,       serialize: toCSV,       ext: 'csv' },
};
