// SIGNAL · lane O · THE MASTER STOP's machinery: the silencer registry + the one capture-phase Escape listener.
// from signal-studio-page/src/page/stop.ts:1-79 (67b6b58) — VERBATIM. The integrator registers every module's stop
// (instrument.stop() sweeps: time.stop(), each module's stop(), effects.hush(), out.panic()); the header below is the
// page's own and still names the page's silencers.

// THE PAGE · THE MASTER STOP (scope G). Escape (Mac) · Options (pad): click off, audition gone,
// every chip off, every note released. NOTHING ELSE STOPS ANYTHING (the flows), so this file is the
// whole of the stop's machinery: a registry of silencers and the one key that sweeps it.
//
// ── WHY A PAGE-LOCAL REGISTRY ───────────────────────────────────────────────────────────────────
// The shell's registerSilencer/silenceAll (src/shell/index.ts:97-160) is the shape copied here, but
// importing it would drag every view into the page (Law 1: the page imports leaves only). So the
// page keeps its own Set. Insertion order IS the sweep order (a Set iterates in insertion order),
// and main.ts registers them in the contract's order — click off, grab.discard, shelf.silence,
// keys.allOff — so the loudest steady sources go first and the notes last. The shell's second
// "last" pass existed for the mic disarm; the page needs none: R2's mic mutes its returns inside
// the one sweep (main.ts registers it after the takes), and nothing re-arms behind it.
//
// ── ONE DEAF SILENCER MUST NOT DEAFEN THE REST ──────────────────────────────────────────────────
// Every call runs in its own try: a chip player whose node was already disposed throws on stop,
// and the notes behind it still have to be released. The sweep iterates a SNAPSHOT, so a silencer
// that registers or removes another mid-sweep (a chip tossed by the stop) cannot skip a neighbour.
// A sweep that re-enters itself (a silencer whose onChange somehow routes back into a stop intent)
// is dropped: the outer sweep is already walking every entry, and a nested one would run the early
// silencers twice before the late ones had run once.
//
// ── THE KEY ─────────────────────────────────────────────────────────────────────────────────────
// ONE window keydown listener in the CAPTURE phase, installed when this module is first evaluated
// (main.ts imports it at boot, before any view mounts). Capture on window runs before every target
// and bubble listener in the document, so nothing the view does can swallow the stop. Its guards are
// the shell's (shell/index.ts:660-677) minus Space, which is GRAB on this page:
//   * e.repeat — OS auto-repeat is not a second press (a held Escape is one stop);
//   * meta / ctrl / alt — a chord belongs to the browser or the OS;
//   * typing — focus in an INPUT / TEXTAREA / SELECT / contenteditable. This guard is what lets the
//     bpm number's click-to-type cancel on Escape WITHOUT master-stopping: a stopPropagation in the
//     field's own handler cannot do it, because this listener has already run by the time the event
//     reaches the field (capture on window precedes the target phase).
// It never preventDefaults and never stops propagation: the field's own Escape still arrives.
// Matched by ev.code with ev.key as the fallback, because a gate that dispatches a synthetic
// KeyboardEvent('keydown', { key: 'Escape' }) leaves code '' and the stop must still happen.
// The pad's Options is NOT here: hand.ts emits it as { kind: 'stop' } and main.ts's router calls
// silenceAll — the hand never reaches past the intent.

const silencers = new Set<() => void>();
let sweeping = false;

/** Register something that can be made quiet. Returns its own removal. */
export function registerSilencer(fn: () => void): () => void {
  silencers.add(fn);
  return (): void => { silencers.delete(fn); };
}

/** Every registered sound, out, in registration order. Never throws. */
export function silenceAll(): void {
  if (sweeping) return;
  sweeping = true;
  try {
    for (const fn of [...silencers]) {
      try { fn(); } catch { /* keep going: the next source still has to stop */ }
    }
  } finally {
    sweeping = false;
  }
}

/** Focus is in a field that takes typed text (the bpm number's click-to-type). */
function typing(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

function onStopKey(e: KeyboardEvent): void {
  if (e.code !== 'Escape' && e.key !== 'Escape') return;
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (typing()) return;
  silenceAll();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('keydown', onStopKey, true);
}
