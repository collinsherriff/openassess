// ===== Tiny DOM + UI helpers (no framework) =====
import { TYPES, escapeHtml } from './model.js';
import { icon } from './icons.js';

// h('div.card#id', {onclick}, [children]) — hyperscript-lite
export function h(sel, props = {}, children = []) {
  const [tag, ...rest] = sel.split(/(?=[.#])/);
  const el = document.createElement(tag || 'div');
  for (const token of rest) {
    if (token[0] === '.') el.classList.add(token.slice(1));
    else if (token[0] === '#') el.id = token.slice(1);
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className += ' ' + v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function download(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function copy(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Copied to clipboard')).catch(() => toast('Copy failed'));
}

// Render a read-only preview card for a question.
export function questionCard(q, { showAnswer = true, index } = {}) {
  const t = TYPES[q.type] || { label: q.type };
  let inner = '';
  if (q.choices && q.choices.length) {
    inner = `<ul class="choices">${q.choices.map((c) =>
      `<li class="${showAnswer && c.correct ? 'correct' : ''}">${escapeHtml(c.text)}</li>`).join('')}</ul>`;
  } else if (q.answers && q.answers.length && showAnswer) {
    inner = `<p class="muted">Answer: <b>${q.answers.map(escapeHtml).join(' / ')}</b></p>`;
  } else if (q.type === 'essay') {
    inner = `<p class="muted"><i>Open response</i></p>`;
  }
  const meta = [q.subject, q.difficulty, q.bloom, q.standard].filter(Boolean)
    .map((m) => `<span class="tag">${escapeHtml(m)}</span>`).join('');
  return h('div.q-card', {
    html: `<div class="q-type">${t.label}${index != null ? ` · #${index + 1}` : ''} · ${q.points ?? 1} pt</div>
      <div class="q-stem">${escapeHtml(q.stem) || '<span class="muted">(no text)</span>'}</div>
      ${inner}
      ${meta ? `<div style="margin-top:.5rem">${meta}${(q.tags || []).map((tg) => `<span class="tag">#${escapeHtml(tg)}</span>`).join('')}</div>` : ''}`,
  });
}

export function toolHead(title, subtitle, steps) {
  const el = h('div.tool-head');
  el.innerHTML = `<div class="crumb"><a href="#/tools">← All tools</a></div>
    <h1>${escapeHtml(title)}</h1>
    <p class="lead muted">${subtitle}</p>`;
  if (steps) {
    const s = h('div.steps');
    steps.forEach((label, i) => s.append(h('span', { class: i === 0 ? 'on' : '' }, `${i + 1}. ${label}`)));
    el.append(s);
  }
  return el;
}

export function setActiveStep(container, idx) {
  const spans = container.querySelectorAll('.steps span');
  spans.forEach((s, i) => s.classList.toggle('on', i <= idx));
}

// simple file picker with drag & drop; calls onFiles(FileList)
export function dropzone(label, accept, onFiles) {
  const input = h('input', { type: 'file', accept, multiple: true, style: 'display:none' });
  const zone = h('div.dropzone', {}, [
    h('div.big', {}, [icon('import')]),
    h('div', { html: `<b>${label}</b>` }),
    h('div.muted', { style: 'font-size:.85rem;margin-top:.3rem' }, 'Click to browse or drag files here'),
    input,
  ]);
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => input.files.length && onFiles(input.files));
  ['dragenter', 'dragover'].forEach((e) => zone.addEventListener(e, (ev) => { ev.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((e) => zone.addEventListener(e, (ev) => { ev.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', (ev) => ev.dataTransfer.files.length && onFiles(ev.dataTransfer.files));
  return zone;
}

export function readFileText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}
