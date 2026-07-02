// ===== Bubble / Answer Sheet Generator =====
// Printable OMR-style answer sheet for paper tests — pick question count and
// options per question, print, hand out. Also prints a matching answer key
// if you paste one in.
import { h, toolHead } from '../lib/ui.js';
import { escapeHtml } from '../lib/model.js';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Bubble Sheet Maker', 'Generate a clean, printable answer sheet for paper tests — choose the number of questions and options, then print.'));

  const opts = { title: 'Answer Sheet', count: 25, options: 4, twoCol: true, nameField: true, key: '' };
  const panel = h('div.panel');
  root.append(panel);
  const out = h('div', { style: 'margin-top:1rem' });
  root.append(out);
  mount.append(root);

  panel.append(h('div.inline-fields', {}, [
    labeled('Title', h('input', { type: 'text', value: opts.title, oninput: (e) => { opts.title = e.target.value; draw(); } })),
    labeled('# Questions', h('input', { type: 'number', min: 1, max: 200, value: opts.count, oninput: (e) => { opts.count = clamp(+e.target.value, 1, 200); draw(); } })),
    labeled('Options each', h('input', { type: 'number', min: 2, max: 8, value: opts.options, oninput: (e) => { opts.options = clamp(+e.target.value, 2, 8); draw(); } })),
  ]));
  panel.append(h('div.row.tight', { style: 'margin-top:.6rem' }, [
    check('Two columns', 'twoCol'), check('Name / date field', 'nameField'),
  ]));
  panel.append(h('div.field', { style: 'margin-top:.7rem' }, [
    h('label', {}, 'Answer key (optional)'),
    h('div.hint', {}, 'e.g. 1B 2C 3A … or "B, C, A". Used only to print a separate key.'),
    h('input', { type: 'text', placeholder: '1B 2C 3A 4D …', oninput: (e) => { opts.key = e.target.value; } }),
  ]));
  panel.append(h('div.row.tight', { style: 'margin-top:.8rem' }, [
    h('button.btn.primary.sm', { onclick: () => printSheet(false) }, 'Print sheet'),
    h('button.btn.sm', { onclick: () => printSheet(true) }, 'Print with key'),
  ]));

  function labeled(label, ctrl) { return h('div', {}, [h('label', {}, label), ctrl]); }
  function check(label, field) {
    const cb = h('input', { type: 'checkbox', checked: opts[field], onchange: (e) => { opts[field] = e.target.checked; draw(); } });
    return h('label.checkline', {}, [cb, label]);
  }

  function sheetHTML(withKey) {
    const letters = 'ABCDEFGH'.slice(0, opts.options).split('');
    const keyMap = parseKey(opts.key);
    const bubble = (n) => {
      const marked = withKey ? keyMap[n] : null;
      return `<div class="qrow"><span class="qn">${n}.</span>${letters.map((L) =>
        `<span class="bub ${marked === L ? 'on' : ''}">${L}</span>`).join('')}</div>`;
    };
    const nums = Array.from({ length: opts.count }, (_, i) => i + 1);
    let cols;
    if (opts.twoCol) {
      const half = Math.ceil(nums.length / 2);
      cols = `<div class="col">${nums.slice(0, half).map(bubble).join('')}</div>
              <div class="col">${nums.slice(half).map(bubble).join('')}</div>`;
    } else {
      cols = `<div class="col">${nums.map(bubble).join('')}</div>`;
    }
    const head = `<h1>${escapeHtml(opts.title)}${withKey ? ' — KEY' : ''}</h1>` +
      (opts.nameField ? `<div class="meta">Name: _____________________________  Date: ____________  Class: ____________</div>` : '');
    return `<style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:1.4rem}
      h1{font-size:1.3rem;margin:0 0 .3rem}
      .meta{color:#333;font-size:.9rem;margin-bottom:1rem;border-bottom:1px solid #999;padding-bottom:.6rem}
      .cols{display:flex;gap:2.5rem}.col{flex:1}
      .qrow{display:flex;align-items:center;gap:.45rem;margin:.28rem 0}
      .qn{width:2rem;text-align:right;font-size:.85rem;color:#333}
      .bub{width:1.35rem;height:1.35rem;border:1.5px solid #333;border-radius:50%;display:inline-flex;
        align-items:center;justify-content:center;font-size:.72rem;color:#333}
      .bub.on{background:#111;color:#fff;border-color:#111}
      @media print{body{margin:0.5in}}
    </style>${head}<div class="cols">${cols}</div>`;
  }

  function draw() {
    out.innerHTML = '';
    out.append(h('h3', {}, 'Preview'));
    const frame = h('div.panel', { style: 'background:#fff;color:#111' });
    frame.innerHTML = sheetHTML(false);
    out.append(frame);
  }

  function printSheet(withKey) {
    const win = window.open('', '_blank');
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(opts.title)}</title></head><body>${sheetHTML(withKey)}<script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }

  draw();
}

function parseKey(str) {
  const map = {};
  const re = /(\d{1,3})\s*[).:\-]?\s*([A-Ha-h])/g;
  let m; let matched = false;
  while ((m = re.exec(str))) { map[+m[1]] = m[2].toUpperCase(); matched = true; }
  if (!matched) { // fall back to a bare "B, C, A" sequence
    const letters = (str.match(/[A-Ha-h]/g) || []);
    letters.forEach((L, i) => (map[i + 1] = L.toUpperCase()));
  }
  return map;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n || lo)); }
