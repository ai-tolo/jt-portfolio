// SIGNAL · EXPORT YOUR SONG (2026-09-30, the export round). The head's export corner (Signal.astro's
// [data-corner="export"], at the keys column's right edge): a cap with the word `export` and, beside it, the song's
// clock — how much has been played since the first sound. The instrument keeps everything (take.ts), so there is nothing
// to arm: the cap is DORMANT until a sound has been made, then wakes; a press prints the take as a WAV and hands it to
// the browser as a download named for the day, the key and the tempo. The words on the cap say what happens:
// export → printing → saved, then export again. A new power-on starts a new song (the state on #sgm, watched here).
import type { SignalInstrumentX } from '../instrument.ts';
import { createTake, type Take } from '../take.ts';
import { cap, etch } from './common.ts';

const el = (tag: string, cls: string): HTMLElement => { const e = document.createElement(tag); e.className = cls; return e; };

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.6 6.8 8 10.2l3.4-3.4M3 13h10"/></svg>';

export const fmtClock = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** The file's name: the day, the key, the tempo. */
export function songName(key: number, scale: string, bpm: number, when = new Date()): string {
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const k = (KEY_NAMES[((key % 12) + 12) % 12] || 'C').replace('#', 's');
  const mode = scale === 'minor' ? 'minor' : 'major';
  return `signal-${day}-${k}-${mode}-${Math.round(bpm)}bpm.wav`;
}

export function mountExportView(host: HTMLElement, inst: SignalInstrumentX): { dispose(): void } {
  const wrap = el('div', 'sgx');
  const button = cap('', { led: true, icon: ICON, cls: 'sgx-cap', name: 'Export your song' });
  button.dataset.ctl = 'export';
  const word = el('span', 'sgx-word'); word.textContent = 'export';
  button.appendChild(word);
  const clock = etch('0:00', 'sgx-clock');
  wrap.append(button, clock);
  button.classList.add('dormant');
  button.setAttribute('aria-disabled', 'true');

  let take: Take | null = null;
  let alive = true;
  let tick: ReturnType<typeof setInterval> | null = null;
  let wordT: ReturnType<typeof setTimeout> | null = null;
  const led = button.querySelector<HTMLElement>('.sg-led');

  const paint = (): void => {
    if (!take) return;
    const has = take.hasSound();
    clock.textContent = fmtClock(take.seconds());
    wrap.classList.toggle('has-sound', has);
    button.classList.toggle('dormant', !has);
    if (has) button.removeAttribute('aria-disabled'); else button.setAttribute('aria-disabled', 'true');
    if (led) led.classList.toggle('on', has);
  };
  const say = (w: string, back?: number): void => {
    word.textContent = w;
    if (wordT) { clearTimeout(wordT); wordT = null; }
    if (back) wordT = setTimeout(() => { word.textContent = 'export'; button.classList.remove('busy', 'saved'); wordT = null; }, back);
  };

  const print = (): void => {
    if (!take || !take.hasSound() || button.classList.contains('busy')) return;
    button.classList.add('busy');
    say('printing');
    setTimeout(() => {
      if (!alive || !take) return;
      const w = take.wav();
      if (!w) { say('export'); button.classList.remove('busy'); return; }
      const m = inst.harmony.state().music;
      const name = songName(m.key, m.scale, inst.time.bpm());
      const url = URL.createObjectURL(w.blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      button.classList.add('saved');
      say(`saved · ${fmtClock(w.seconds)}`, 2400);
    }, 360);
  };
  button.addEventListener('click', print);

  // a new power-on = a new song: the state lives on #sgm (power.ts writes it)
  const sgm = host.closest<HTMLElement>('.sgm');
  let mo: MutationObserver | null = null;
  if (sgm) {
    mo = new MutationObserver(() => { if (sgm.dataset.state === 'boot' && take) { take.reset(); paint(); } });
    mo.observe(sgm, { attributes: true, attributeFilter: ['data-state'] });
  }

  void createTake(inst.ctx, inst.out.post).then((t) => {
    if (!alive) { t?.dispose(); return; }
    take = t;
    if (!take) return;                     // no AudioWorklet: the corner stays empty
    host.appendChild(wrap);
    paint();
    tick = setInterval(paint, 250);
  });

  return {
    dispose() {
      alive = false;
      if (tick) clearInterval(tick);
      if (wordT) clearTimeout(wordT);
      mo?.disconnect();
      take?.dispose();
      wrap.remove();
    },
  };
}
