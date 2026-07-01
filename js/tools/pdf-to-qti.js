// ===== PDF → QTI generator (flagship) =====
import { h, toolHead, toast, download, dropzone, readFileText, setActiveStep } from '../lib/ui.js';
import { parseQuestions } from '../lib/textparse.js';
import { questionEditor } from '../lib/editor.js';
import { buildPackage } from '../lib/qti.js';
import { toMoodleXML, toGIFT } from '../lib/formats.js';
import { Store } from '../lib/store.js';

export async function render(mount) {
  let questions = [];
  const root = h('div');
  const head = toolHead('PDF → QTI', 'Turn an existing test or worksheet into a QTI 2.1 question bank you can import straight into Canvas, Moodle, Blackboard and more.', ['Upload', 'Review', 'Export']);
  root.append(head);

  const step1 = h('div.panel');
  const step2 = h('div', { style: 'display:none' });
  const step3 = h('div', { style: 'display:none' });
  root.append(step1, step2, step3);
  mount.append(root);

  // ---- Step 1: input ----
  step1.append(h('h3', {}, '1 · Add your test'));
  const zone = dropzone('Drop a PDF or text file', '.pdf,.txt', (files) => handleFiles(files));
  step1.append(zone);
  step1.append(h('div.row', { style: 'margin:1rem 0;align-items:center' }, [
    h('div.divider', { style: 'flex:1' }), h('span.muted', {}, 'or paste text'), h('div.divider', { style: 'flex:1' }),
  ]));
  const ta = h('textarea', { class: 'code', placeholder: SAMPLE, style: 'min-height:180px' });
  step1.append(ta);
  step1.append(h('div.row', { style: 'margin-top:.8rem' }, [
    h('button.btn.primary', { onclick: () => parseText(ta.value) }, 'Parse questions →'),
    h('button.btn.ghost', { onclick: () => { ta.value = SAMPLE.trim(); } }, 'Load a sample'),
  ]));
  const status = h('div.muted', { style: 'margin-top:.8rem' });
  step1.append(status);

  async function handleFiles(files) {
    const file = files[0];
    status.innerHTML = '<span class="spin"></span> Reading ' + file.name + '…';
    try {
      let text;
      if (/\.pdf$/i.test(file.name)) text = await extractPdf(file, (p) => status.innerHTML = `<span class="spin"></span> Extracting text… ${p}`);
      else text = await readFileText(file);
      ta.value = text;
      status.textContent = `Loaded ${text.length.toLocaleString()} characters. Review below or edit before parsing.`;
      parseText(text);
    } catch (err) {
      status.innerHTML = `<span style="color:var(--bad)">Couldn't read file: ${err.message}</span>`;
    }
  }

  function parseText(text) {
    if (!text.trim()) { toast('Add a PDF or paste some text first'); return; }
    const { questions: parsed, warnings } = parseQuestions(text);
    if (!parsed.length) {
      status.innerHTML = '<span style="color:var(--bad)">No questions detected. Make sure items are numbered (1. 2. 3.) with lettered options (A. B. C.).</span>';
      return;
    }
    questions = parsed;
    renderReview(warnings);
  }

  // ---- Step 2: review ----
  function renderReview(warnings) {
    setActiveStep(head, 1);
    step2.style.display = '';
    step3.style.display = 'none';
    step2.innerHTML = '';
    const bar = h('div.spread');
    bar.append(h('h3', {}, `2 · Review — ${questions.length} question${questions.length === 1 ? '' : 's'} detected`));
    bar.append(h('button.btn.sm.ghost', { onclick: () => { step2.style.display = 'none'; setActiveStep(head, 0); } }, '← Back'));
    step2.append(bar);
    if (warnings.length) step2.append(h('div.callout.warn', { style: 'margin:.6rem 0', html: warnings.join('<br>') }));
    step2.append(h('p.muted', {}, 'Detection is a starting point — fix any stems, options or answers, then continue. Green = correct answer.'));

    const list = h('div.stack');
    questions.forEach((q, i) => {
      list.append(questionEditor(q, (updated) => { questions[i] = updated; }, () => {
        questions.splice(i, 1); renderReview([]);
      }));
    });
    step2.append(list);
    step2.append(h('div.row', { style: 'margin-top:1rem' }, [
      h('button.btn.primary', { onclick: () => renderExport() }, 'Continue to export →'),
      h('button.btn.ghost', { onclick: () => {
        const n = Store.addMany(questions); toast(`Saved ${n} items to your bank`);
      } }, '🗄️ Save all to Item Bank'),
    ]));
    step2.scrollIntoView({ behavior: 'smooth' });
  }

  // ---- Step 3: export ----
  function renderExport() {
    setActiveStep(head, 2);
    step3.style.display = '';
    step3.innerHTML = '';
    step3.append(h('h3', {}, '3 · Export'));
    step3.append(h('p.muted', {}, 'Download a QTI 2.1 content package (a .zip) and import it into your LMS, or grab another format.'));
    const grid = h('div.tool-grid');
    grid.append(exportCard('🧩', 'QTI 2.1 package', 'IMS Content Package · Canvas, Moodle, Blackboard, Brightspace', async () => {
      const blob = await buildPackage(questions, { title: 'OpenAssess export' });
      download('qti-package.zip', blob);
      toast('QTI package downloaded');
    }));
    grid.append(exportCard('📦', 'Moodle XML', 'Import via Question bank → Import', () => {
      download('questions-moodle.xml', toMoodleXML(questions), 'application/xml');
    }));
    grid.append(exportCard('📝', 'GIFT', 'Moodle plain-text format', () => {
      download('questions.gift.txt', toGIFT(questions), 'text/plain');
    }));
    grid.append(exportCard('🗄️', 'Save to Item Bank', 'Reuse these across every tool', () => {
      const n = Store.addMany(questions); toast(`Saved ${n} items to your bank`);
    }));
    step3.append(grid);
    step3.append(h('div.callout', { style: 'margin-top:1rem',
      html: '💡 <b>Tip:</b> in Canvas, import the .zip under <i>Settings → Import Course Content → QTI .zip file</i>. In Moodle use <i>Question bank → Import → Moodle XML</i>.' }));
    step3.scrollIntoView({ behavior: 'smooth' });
  }

  function exportCard(icon, title, sub, onClick) {
    return h('div.card', {}, [
      h('div.ico', {}, icon), h('h3', {}, title), h('p', {}, sub),
      h('button.btn.primary.sm', { style: 'margin-top:.7rem', onclick: onClick }, 'Download'),
    ]);
  }
}

// Extract all text from a PDF using pdf.js.
async function extractPdf(file, onProgress) {
  if (!window.pdfjsLib) throw new Error('PDF library not loaded');
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress && onProgress(`page ${p}/${pdf.numPages}`);
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Reconstruct lines by y-position so numbering survives.
    const rows = {};
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      (rows[y] = rows[y] || []).push(item);
    }
    Object.keys(rows).map(Number).sort((a, b) => b - a).forEach((y) => {
      const line = rows[y].sort((a, b) => a.transform[4] - b.transform[4]).map((i) => i.str).join(' ').replace(/\s+/g, ' ');
      if (line.trim()) text += line + '\n';
    });
    text += '\n';
  }
  return text;
}

const SAMPLE = `
1. What is the powerhouse of the cell?
A. Nucleus
B. Mitochondria
C. Ribosome
D. Golgi apparatus
Answer: B

2. Water is composed of hydrogen and oxygen.
A. True
B. False
Answer: A

3. The process by which plants make food using sunlight is called ______.
Answer: photosynthesis

4. Which of the following are noble gases? (Select all that apply)
A. Helium
B. Oxygen
C. Neon
D. Nitrogen

Answer Key
4. A, C
`;
