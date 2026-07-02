// ===== Format converter =====
import { h, toolHead, toast, download, copy, dropzone, readFileText, questionCard } from '../lib/ui.js';
import { FORMATS } from '../lib/formats.js';
import { parseQTI, itemToQTI, buildPackage } from '../lib/qti.js';
import { Store } from '../lib/store.js';

// input parsers keyed by format id (QTI added on top of FORMATS)
const INPUTS = {
  ...Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, { label: v.label, parse: v.parse }])),
  qti: { label: 'QTI 1.2 / 2.x XML', parse: parseQTI },
  bank: { label: 'My Item Bank', parse: () => Store.all() },
};
const OUTPUTS = {
  qtizip: { label: 'QTI 2.1 package (.zip)', ext: 'zip', kind: 'zip' },
  qti: { label: 'QTI 2.1 XML (single item)', ext: 'xml', serialize: (qs) => qs.map((q, i) => itemToQTI(q, `item_${i + 1}`)).join('\n\n') },
  ...Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, { label: v.label, ext: v.ext, serialize: v.serialize }])),
};

export async function render(mount) {
  let questions = [];
  const root = h('div');
  root.append(toolHead('Format Converter', 'Convert question banks between QTI, Moodle XML, GIFT, Aiken and CSV. Round-trip your items without losing structure.'));

  const controls = h('div.panel');
  controls.append(h('div.inline-fields', {}, [
    field('From', selectFrom()), field('To', selectTo()),
  ]));
  root.append(controls);

  const io = h('div.split', { style: 'margin-top:1rem' });
  const inPanel = h('div.panel');
  const outPanel = h('div.panel');
  io.append(inPanel, outPanel);
  root.append(io);
  mount.append(root);

  let fromFmt = 'gift';
  let toFmt = 'qtizip';

  function selectFrom() {
    const s = h('select', { onchange: (e) => { fromFmt = e.target.value; renderInput(); } });
    for (const [k, v] of Object.entries(INPUTS)) s.append(h('option', { value: k }, v.label));
    return s;
  }
  function selectTo() {
    const s = h('select', { onchange: (e) => { toFmt = e.target.value; convert(); } });
    for (const [k, v] of Object.entries(OUTPUTS)) { const o = h('option', { value: k }, v.label); if (k === toFmt) o.selected = true; s.append(o); }
    return s;
  }
  function field(label, ctrl) { return h('div', {}, [h('label', {}, label), ctrl]); }

  const inputTA = h('textarea', { class: 'code', placeholder: 'Paste content, drop a file, or pick “My Item Bank”.' });

  function renderInput() {
    inPanel.innerHTML = '';
    inPanel.append(h('div.spread', {}, [h('h3', {}, 'Input'), h('span.pill.ghost', {}, INPUTS[fromFmt].label)]));
    if (fromFmt === 'bank') {
      questions = Store.all();
      inPanel.append(h('p.muted', {}, `${questions.length} items loaded from your bank.`));
      convert();
      return;
    }
    inPanel.append(dropzone('Drop a file', '.txt,.xml,.csv,.zip', async (files) => {
      const f = files[0];
      inputTA.value = await readFileText(f);
      convert();
    }));
    inPanel.append(h('div', { style: 'height:.6rem' }));
    inPanel.append(inputTA);
    inputTA.oninput = convert;
    inPanel.append(h('button.btn.sm.ghost', { style: 'margin-top:.6rem', onclick: () => { fromFmt = 'gift'; inputTA.value = SAMPLE_GIFT; convert(); } }, 'Load sample'));
  }

  async function convert() {
    outPanel.innerHTML = '';
    if (fromFmt !== 'bank') {
      try { questions = INPUTS[fromFmt].parse(inputTA.value || ''); }
      catch (err) { outPanel.append(h('div.callout.warn', {}, 'Parse error: ' + err.message)); return; }
    }
    outPanel.append(h('div.spread', {}, [
      h('h3', {}, 'Output'),
      h('span.pill', {}, `${questions.length} item${questions.length === 1 ? '' : 's'}`),
    ]));
    if (!questions.length) { outPanel.append(h('p.muted', {}, 'Nothing parsed yet.')); return; }

    const out = OUTPUTS[toFmt];
    const actions = h('div.row.tight', { style: 'margin-bottom:.7rem' });
    if (out.kind === 'zip') {
      actions.append(h('button.btn.primary.sm', { onclick: async () => {
        download('qti-package.zip', await buildPackage(questions)); toast('QTI package downloaded');
      } }, 'Download .zip'));
      outPanel.append(actions);
      outPanel.append(h('div.callout', { html: `A QTI 2.1 IMS Content Package with ${questions.length} items will be generated. Preview below.` }));
    } else {
      const text = out.serialize(questions);
      actions.append(
        h('button.btn.primary.sm', { onclick: () => download(`converted.${out.ext}`, text) }, 'Download'),
        h('button.btn.sm', { onclick: () => copy(text) }, 'Copy'),
      );
      outPanel.append(actions);
      outPanel.append(h('textarea', { class: 'code', readonly: true, style: 'min-height:200px' }, text));
    }
    // shared: add to bank
    outPanel.append(h('button.btn.sm.ghost', { style: 'margin-top:.6rem', onclick: () => {
      toast(`Saved ${Store.addMany(questions)} items to your bank`);
    } }, 'Save parsed items to Item Bank'));

    // preview
    const prev = h('details', { style: 'margin-top:1rem' });
    prev.append(h('summary', { style: 'cursor:pointer;font-weight:600' }, `Preview ${questions.length} parsed items`));
    questions.slice(0, 30).forEach((q, i) => prev.append(questionCard(q, { index: i })));
    outPanel.append(prev);
  }

  renderInput();
}

const SAMPLE_GIFT = `::Q1:: The capital of France is {=Paris ~London ~Rome ~Berlin}

::Q2:: The Earth is flat. {FALSE}

::Q3:: Water's chemical formula is {=H2O =H₂O}
`;
