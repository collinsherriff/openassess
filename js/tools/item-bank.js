// ===== Item Bank — the backbone every tool plugs into =====
import { h, toolHead, toast, download, questionCard } from '../lib/ui.js';
import { questionEditor } from '../lib/editor.js';
import { Store } from '../lib/store.js';
import { makeQuestion, TYPES } from '../lib/model.js';
import { toCSV, parseCSV } from '../lib/formats.js';
import { buildPackage } from '../lib/qti.js';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Item Bank', 'Your home base. Store, tag, filter and reuse every question — then feed them into the quiz maker, test player and exports.'));

  const filters = { q: '', type: '', subject: '', difficulty: '', bloom: '' };

  const toolbar = h('div.panel');
  root.append(toolbar);
  const stats = h('div.statgrid', { style: 'margin:1rem 0' });
  root.append(stats);
  const listWrap = h('div');
  root.append(listWrap);
  mount.append(root);

  function renderToolbar() {
    toolbar.innerHTML = '';
    const search = h('input', { type: 'search', placeholder: 'Filter by keyword…', value: filters.q,
      oninput: (e) => { filters.q = e.target.value; renderList(); } });
    const facet = (label, field) => {
      const s = h('select', { onchange: (e) => { filters[field] = e.target.value; renderList(); } });
      s.append(h('option', { value: '' }, label));
      if (field === 'type') for (const [k, v] of Object.entries(TYPES)) { const o = h('option', { value: k }, v.label); if (filters[field] === k) o.selected = true; s.append(o); }
      else for (const v of Store.facet(field)) { const o = h('option', { value: v }, v); if (filters[field] === v) o.selected = true; s.append(o); }
      return s;
    };
    toolbar.append(h('div.field', {}, [search]));
    toolbar.append(h('div.inline-fields', {}, [
      facet('All types', 'type'), facet('All subjects', 'subject'),
      facet('All difficulties', 'difficulty'), facet("All Bloom levels", 'bloom'),
    ]));
    toolbar.append(h('div.row.tight', { style: 'margin-top:.8rem' }, [
      h('button.btn.primary.sm', { onclick: addBlank }, '+ New question'),
      h('button.btn.sm', { onclick: () => importDialog() }, 'Import CSV'),
      h('button.btn.sm', { onclick: exportMenu }, 'Export'),
      h('button.btn.sm.danger', { onclick: () => {
        if (confirm('Delete ALL items from your bank? This cannot be undone.')) { Store.clear(); refresh(); toast('Bank cleared'); }
      } }, 'Clear bank'),
    ]));
  }

  function renderStats() {
    const all = Store.all();
    const byType = {};
    all.forEach((q) => (byType[q.type] = (byType[q.type] || 0) + 1));
    stats.innerHTML = '';
    stats.append(stat(all.length, 'Total items'));
    stats.append(stat(Store.facet('subject').length, 'Subjects'));
    stats.append(stat(Store.facet('standard').length, 'Standards'));
    stats.append(stat(Object.keys(byType).length, 'Question types'));
  }
  function stat(num, lbl) { return h('div.panel.stat', {}, [h('div.num', {}, String(num)), h('div.lbl', {}, lbl)]); }

  function filtered() {
    const q = filters.q.toLowerCase();
    return Store.all().filter((it) => {
      if (filters.type && it.type !== filters.type) return false;
      if (filters.subject && it.subject !== filters.subject) return false;
      if (filters.difficulty && it.difficulty !== filters.difficulty) return false;
      if (filters.bloom && it.bloom !== filters.bloom) return false;
      if (q) {
        const hay = (it.stem + ' ' + it.choices.map((c) => c.text).join(' ') + ' ' + (it.tags || []).join(' ') + ' ' + it.subject).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderList() {
    const items = filtered();
    listWrap.innerHTML = '';
    listWrap.append(h('div.spread', { style: 'margin:1rem 0 .5rem' }, [
      h('h3', {}, `${items.length} item${items.length === 1 ? '' : 's'}`),
      items.length ? h('a', { href: '#/tool/generator' }, 'Build a quiz from these →') : '',
    ]));
    if (!Store.count()) {
      listWrap.append(h('div.empty', { html: '<h3>Your bank is empty</h3><p>Import a test with <a href="#/tool/pdf-to-qti">PDF → QTI</a>, or add a question by hand.</p>' }));
      return;
    }
    if (!items.length) { listWrap.append(h('div.empty', {}, 'No items match those filters.')); return; }
    for (const it of items) listWrap.append(row(it));
  }

  function row(it) {
    const card = questionCard(it, { showAnswer: true });
    const bar = h('div.row.tight', { style: 'margin-top:.6rem' }, [
      h('button.btn.sm', { onclick: () => editItem(it) }, 'Edit'),
      h('button.btn.sm', { onclick: () => { Store.add(makeQuestion({ ...it, id: undefined })); toast('Duplicated'); } }, 'Duplicate'),
      h('button.btn.sm.danger', { onclick: () => { Store.remove(it.id); toast('Deleted'); } }, 'Delete'),
    ]);
    card.append(bar);
    return card;
  }

  function editItem(it) {
    const box = h('div.panel', { style: 'margin:1rem 0' });
    let draft = { ...it };
    box.append(questionEditor(it, (u) => { draft = u; }));
    box.append(h('div.row.tight', {}, [
      h('button.btn.primary.sm', { onclick: () => { Store.update(draft); toast('Saved'); refresh(); } }, 'Save'),
      h('button.btn.sm.ghost', { onclick: refresh }, 'Cancel'),
    ]));
    listWrap.innerHTML = '';
    listWrap.append(box);
  }

  function addBlank() {
    const q = makeQuestion({ type: 'mc', choices: [{ text: '', correct: true }, { text: '', correct: false }] });
    editItem(q);
  }

  function importDialog() {
    const input = h('input', { type: 'file', accept: '.csv', style: 'display:none' });
    input.onchange = async () => {
      const text = await input.files[0].text();
      const items = parseCSV(text);
      toast(`Imported ${Store.addMany(items)} items`);
      refresh();
    };
    document.body.append(input); input.click(); input.remove();
  }

  function exportMenu() {
    const all = Store.all();
    if (!all.length) { toast('Nothing to export'); return; }
    const menu = h('div.panel', { style: 'margin:1rem 0' }, [
      h('h3', {}, 'Export your bank'),
      h('div.row.tight', {}, [
        h('button.btn.sm', { onclick: () => download('item-bank.csv', toCSV(all), 'text/csv') }, 'CSV'),
        h('button.btn.sm', { onclick: () => download('item-bank.json', JSON.stringify(all, null, 2), 'application/json') }, 'JSON (backup)'),
        h('button.btn.sm.primary', { onclick: async () => download('item-bank-qti.zip', await buildPackage(all)) }, 'QTI package'),
        h('button.btn.sm.ghost', { onclick: refresh }, 'Close'),
      ]),
    ]);
    listWrap.innerHTML = '';
    listWrap.append(menu);
  }

  function refresh() { renderToolbar(); renderStats(); renderList(); }
  Store.subscribe(() => { renderStats(); });
  refresh();
}
