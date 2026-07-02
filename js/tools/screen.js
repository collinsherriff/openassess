// ===== Classroom Screen =====
// A projector view: a big countdown (or clock), today's agenda with
// tap-to-cross-off items, and a working-instructions line. Runs full-window;
// a gentle chime sounds when the timer ends.
import { h, toolHead, toast } from '../lib/ui.js';
import { escapeHtml } from '../lib/model.js';

const KEY = 'openassess.screen.v1';

export async function render(mount) {
  const root = h('div');
  root.append(toolHead('Classroom Screen', 'Put a big timer, your agenda and working instructions up on the projector. Tap agenda items to cross them off as the lesson moves.'));

  const state = load();

  const panel = h('div.panel');
  root.append(panel);
  mount.append(root);

  const msg = h('input', { type: 'text', value: state.msg, placeholder: 'e.g. Silent reading — voices off, questions on sticky notes' });
  const agenda = h('textarea', { placeholder: 'One agenda item per line', style: 'min-height:120px' }, state.agenda);
  const minutes = h('input', { type: 'number', min: 0, max: 180, value: state.minutes, style: 'width:6rem' });
  const chime = h('input', { type: 'checkbox', checked: state.chime });

  panel.append(h('div.field', {}, [h('label', {}, 'Instructions (shown large)'), msg]));
  panel.append(h('div.field', {}, [h('label', {}, 'Agenda'), agenda]));
  panel.append(h('div.row.tight', { style: 'align-items:center' }, [
    h('span', {}, 'Timer:'), minutes, h('span.muted', {}, 'minutes (0 = show the clock instead)'),
    h('label.checkline', { style: 'margin-left:1rem' }, [chime, 'Chime when time is up']),
  ]));
  panel.append(h('div.row.tight', { style: 'margin-top:1rem' }, [
    h('button.btn.primary', { onclick: present }, 'Present'),
    h('span.muted', { style: 'font-size:.83rem;align-self:center' }, 'Esc exits · Space pauses the timer'),
  ]));

  function present() {
    save({ msg: msg.value, agenda: agenda.value, minutes: +minutes.value, chime: chime.checked });
    const items = agenda.value.split('\n').map((s) => s.trim()).filter(Boolean);
    const total = Math.max(0, +minutes.value) * 60;
    let remaining = total, paused = false, chimed = false;

    const clock = h('div.s-clock');
    const agendaEl = h('div.s-agenda');
    items.forEach((it) => {
      const line = h('div', { onclick: () => line.classList.toggle('done') }, it);
      agendaEl.append(line);
    });
    const overlay = h('div.screen-present', {}, [
      h('button.btn.sm.ghost.s-exit', { onclick: exit }, 'Exit (Esc)'),
      msg.value.trim() ? h('div.s-msg', {}, msg.value.trim()) : null,
      clock,
      agendaEl,
    ]);
    document.body.append(overlay);
    document.documentElement.requestFullscreen?.().catch(() => {});

    const draw = () => {
      if (total === 0) {
        clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return;
      }
      const r = Math.max(0, remaining);
      const m = Math.floor(r / 60), s = r % 60;
      clock.textContent = `${m}:${String(s).padStart(2, '0')}`;
      clock.classList.toggle('warn', r > 0 && r <= 60);
      clock.classList.toggle('over', r === 0);
      if (r === 0 && !chimed) { chimed = true; if (chime.checked) playChime(); clock.textContent = '0:00'; }
    };
    draw();
    const tick = setInterval(() => { if (!paused && remaining > 0) { remaining -= 1; } draw(); }, 1000);

    function onKey(e) {
      if (e.key === 'Escape') exit();
      else if (e.key === ' ') { paused = !paused; e.preventDefault(); toast(paused ? 'Timer paused' : 'Timer running'); }
    }
    window.addEventListener('keydown', onKey);

    function exit() {
      clearInterval(tick);
      window.removeEventListener('keydown', onKey);
      overlay.remove();
      document.exitFullscreen?.().catch(() => {});
    }
  }
}

// three soft sine tones, no audio file needed
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.start(t); o.stop(t + 1.2);
    });
  } catch {}
}

function load() {
  try {
    return { msg: '', agenda: 'Warm-up problem\nGo over homework\nNew material\nExit ticket', minutes: 10, chime: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch { return { msg: '', agenda: '', minutes: 10, chime: true }; }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
