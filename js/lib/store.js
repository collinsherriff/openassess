// ===== Item bank persistence =====
// Stored in localStorage so the whole app stays serverless & private:
// nothing ever leaves the browser. The bank is the backbone the other tools
// read from and write to.
import { normalize } from './model.js';

const KEY = 'openassess.bank.v1';
const RESULTS_KEY = 'openassess.results.v1';
const listeners = new Set();

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export const Store = {
  all() { return read(KEY, []).map(normalize); },

  get(id) { return this.all().find((q) => q.id === id) || null; },

  addMany(questions) {
    const bank = read(KEY, []);
    const incoming = questions.map(normalize);
    write(KEY, bank.concat(incoming));
    emit();
    return incoming.length;
  },

  add(q) { return this.addMany([q]); },

  update(q) {
    const bank = read(KEY, []);
    const i = bank.findIndex((x) => x.id === q.id);
    if (i >= 0) bank[i] = normalize(q); else bank.push(normalize(q));
    write(KEY, bank);
    emit();
  },

  remove(id) {
    write(KEY, read(KEY, []).filter((q) => q.id !== id));
    emit();
  },

  clear() { write(KEY, []); emit(); },

  count() { return read(KEY, []).length; },

  // distinct metadata values, for filter dropdowns
  facet(field) {
    const set = new Set();
    for (const q of this.all()) {
      if (field === 'tags') (q.tags || []).forEach((t) => set.add(t));
      else if (q[field]) set.add(q[field]);
    }
    return [...set].sort();
  },

  // ---- test results (for the report maker) ----
  results() { return read(RESULTS_KEY, []); },
  saveResult(result) {
    const r = read(RESULTS_KEY, []);
    r.push({ ...result, savedAt: Date.now() });
    write(RESULTS_KEY, r);
    emit();
  },
  clearResults() { write(RESULTS_KEY, []); emit(); },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

function emit() { listeners.forEach((fn) => { try { fn(); } catch {} }); }
