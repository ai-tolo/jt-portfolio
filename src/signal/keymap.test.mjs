// keymap.ts (SIGNAL R1, lane H): window keys → KeyAction by e.code, against a fake window + document. Down/up by code,
// repeats ignored, keyup released by the code recorded at keydown (the ⌥ defect, D §4), blur/hidden release everything,
// the owns() guards, preventDefault only where the page would scroll, Escape always owned.
// Source: signal-studio-v6lib/src/views/instrument/index.ts:346-493 (2a9e4a7).
// Run: source ~/.nvm/nvm.sh && node src/signal/keymap.test.mjs
import { createKeymap, defaultOwns, PREVENT_CODES } from './keymap.ts';
import { KEYMAP } from './types.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const js = (a) => JSON.stringify(a);

function fakeWindow({ withDoc = true } = {}) {
  const ls = [];   // { type, fn, capture }
  const dls = [];
  const doc = withDoc ? {
    activeElement: null, visibilityState: 'visible',
    addEventListener: (type, fn) => dls.push({ type, fn }),
    removeEventListener: (type, fn) => { const i = dls.findIndex((l) => l.type === type && l.fn === fn); if (i >= 0) dls.splice(i, 1); },
  } : undefined;
  return {
    document: doc,
    addEventListener: (type, fn, capture) => ls.push({ type, fn, capture: !!capture }),
    removeEventListener: (type, fn, capture) => { const i = ls.findIndex((l) => l.type === type && l.fn === fn && l.capture === !!capture); if (i >= 0) ls.splice(i, 1); },
    fire: (type, ev = {}) => { for (const l of ls.slice()) if (l.type === type) l.fn(ev); },
    fireDoc: (type) => { for (const l of dls.slice()) if (l.type === type) l.fn({ type }); },
    ls, dls,
  };
}
function key(code, o = {}) {
  const ev = { code, repeat: false, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, target: null, prevented: false, ...o };
  ev.preventDefault = () => { ev.prevented = true; };
  return ev;
}
function rig(o = {}) {
  const win = fakeWindow(o);
  const acts = [];
  const km = createKeymap({ target: win, onAction: (a, on, shift, code) => acts.push([code, a.kind, on, shift]), ...(o.owns ? { owns: o.owns } : {}) });
  km.attach();
  const down = (code, e = {}) => { const ev = key(code, e); win.fire('keydown', ev); return ev; };
  const up = (code, e = {}) => { const ev = key(code, e); win.fire('keyup', ev); return ev; };
  return { win, acts, km, down, up };
}

console.log('\n[keymap] attach: capture-phase keydown/keyup on the window, blur, visibilitychange (index.ts:491-493)');
{
  const r = rig();
  ok('keydown + keyup are CAPTURE listeners on the window', r.win.ls.filter((l) => (l.type === 'keydown' || l.type === 'keyup') && l.capture).length === 2);
  ok('blur on the window, visibilitychange on the document', r.win.ls.some((l) => l.type === 'blur') && r.win.dls.some((l) => l.type === 'visibilitychange'));
  r.km.attach();
  ok('attach is idempotent', r.win.ls.length === 3);
}

console.log('\n[keymap] down / up by CODE');
{
  const r = rig();
  r.down('KeyA');
  ok('KeyA down → the note action, on, the code', js(r.acts) === js([['KeyA', 'note', true, false]]) && js(r.km.down()) === js(['KeyA']));
  r.down('KeyA', { repeat: true });
  ok('an auto-repeat is ignored (one action per physical press)', r.acts.length === 1);
  r.down('KeyA');
  ok('a second keydown of a code already down is ignored too', r.acts.length === 1);
  r.up('KeyA');
  ok('KeyA up → the same action, off', js(r.acts[1]) === js(['KeyA', 'note', false, false]) && r.km.down().length === 0);
  r.up('KeyA');
  ok('a keyup with nothing recorded does nothing', r.acts.length === 2);
  const q = r.down('KeyQ');
  ok('an unmapped key (Q) is the page\'s: no action, no preventDefault', r.acts.length === 2 && !q.prevented);
  r.down('constructor'); r.down('toString'); r.down(undefined);
  ok('an Object.prototype name or a code-less event is never an action', r.acts.length === 2);
}
{
  const r = rig();
  const a = r.down('KeyA');
  ok('letters are not preventDefault-ed (nothing to stop)', !a.prevented);
  const sp = r.down('Space');
  ok('Space: beat + preventDefault (the page must not scroll)', sp.prevented && js(r.acts.at(-1)) === js(['Space', 'beat', true, false]));
  const rep = r.down('Space', { repeat: true });
  ok('a repeating Space is still prevented, but acts once', rep.prevented && r.acts.filter((x) => x[0] === 'Space').length === 1);
  const al = r.down('ArrowLeft');
  ok('ArrowLeft: oct −1 + preventDefault', al.prevented && r.acts.at(-1)[1] === 'oct' && KEYMAP.ArrowLeft.d === -1);
  const bs = r.down('KeyB', { shiftKey: true });
  ok('⇧B: the bass with shift = true, not prevented (a letter)', !bs.prevented && js(r.acts.at(-1)) === js(['KeyB', 'bass', true, true]));
  ok('the prevented set is exactly Space and the four arrows, every one mapped', PREVENT_CODES.size === 5
    && ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].every((c) => PREVENT_CODES.has(c) && KEYMAP[c]));
}

console.log('\n[keymap] keyup releases by the code recorded at keydown (the ⌥ defect NOT ported, D §4)');
{
  const r = rig();
  r.down('KeyS');
  r.up('KeyS', { altKey: true, key: 'ß' });
  ok('⌥ pressed under a held S: its keyup still releases S', js(r.acts.at(-1)) === js(['KeyS', 'note', false, false]) && r.km.down().length === 0);
  r.down('KeyZ');
  r.win.document.activeElement = { tagName: 'INPUT' };
  r.up('KeyZ');
  ok('focus moved to a text field mid-hold: the keyup still releases what we pressed', js(r.acts.at(-1)) === js(['KeyZ', 'gate', false, false]));
  r.down('KeyG');
  ok('…while the field has focus the page does not own new keys', r.acts.at(-1)[0] === 'KeyZ');
  r.win.document.activeElement = null;
  r.up('KeyG');
  ok('a key pressed while we did not own it is not ours to release', r.acts.at(-1)[0] === 'KeyZ');
}

console.log('\n[keymap] owns(): text fields, ⌘/ctrl/alt; Escape always (index.ts:375-386, 412-413)');
{
  const r = rig();
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    r.win.document.activeElement = { tagName: tag };
    r.down('KeyA'); r.up('KeyA');
  }
  r.win.document.activeElement = { tagName: 'DIV', isContentEditable: true };
  r.down('KeyA');
  ok('an input / textarea / select / contenteditable owns the keys', r.acts.length === 0);
  r.down('Escape');
  ok('…but Escape is ALWAYS the master stop', js(r.acts) === js([['Escape', 'stop', true, false]]));
  r.win.document.activeElement = { tagName: 'BUTTON' };
  r.down('KeyD');
  ok('a focused button does not (the page owns its letters)', r.acts.at(-1)[0] === 'KeyD');
  r.up('KeyD'); r.up('Escape');
  for (const m of ['metaKey', 'ctrlKey', 'altKey']) r.down('KeyF', { [m]: true });
  ok('⌘ / ctrl / alt combinations are never the instrument\'s', !r.acts.some((x) => x[0] === 'KeyF'));
  r.down('Escape', { metaKey: true });
  ok('Escape even with a modifier', r.acts.at(-1)[0] === 'Escape' && r.acts.at(-1)[2] === true);
}
{
  ok('defaultOwns: the event\'s own target through a shadow root (composedPath) counts',
    !defaultOwns({ composedPath: () => [{ tagName: 'input' }], target: null }, null)
    && defaultOwns({ composedPath: () => [{ tagName: 'SECTION' }], target: null }, { activeElement: null }));
  const r = rig({ withDoc: false });
  r.down('KeyG');
  ok('no document at all: the default guard still works', js(r.acts) === js([['KeyG', 'note', true, false]]));
  const c = rig({ owns: (e) => e.code !== 'KeyH' });
  c.down('KeyH'); c.down('KeyJ');
  ok('a custom owns() decides (and Escape still bypasses it)', js(c.acts) === js([['KeyJ', 'note', true, false]]) && (c.down('Escape'), c.acts.at(-1)[0] === 'Escape'));
  const t = rig({ owns: () => { throw new Error('boom'); } });
  t.down('KeyA');
  ok('a throwing owns() means not owned (never a stuck key)', t.acts.length === 0);
}

console.log('\n[keymap] blur and a hidden tab release every code down (index.ts:490)');
{
  const r = rig();
  r.down('KeyA'); r.down('KeyZ'); r.down('Space');
  r.win.fire('blur');
  ok('blur: on = false for every code down, shift false', js(r.acts.slice(3)) === js([['KeyA', 'note', false, false], ['KeyZ', 'gate', false, false], ['Space', 'beat', false, false]]) && r.km.down().length === 0);
  r.up('KeyA');
  ok('…and the late keyups find nothing to release twice', r.acts.length === 6);
  r.down('KeyM');
  r.win.document.visibilityState = 'hidden'; r.win.fireDoc('visibilitychange');
  ok('a hidden tab releases too', js(r.acts.at(-1)) === js(['KeyM', 'dive', false, false]));
  r.win.document.visibilityState = 'visible';
  r.down('KeyM'); r.win.fireDoc('visibilitychange');
  ok('a visible visibilitychange releases nothing', r.acts.at(-1)[2] === true);
}

console.log('\n[keymap] detach; a throwing listener; the whole table');
{
  const r = rig();
  r.down('KeyK');
  r.km.detach();
  ok('detach releases what is down and removes every listener', js(r.acts.at(-1)) === js(['KeyK', 'note', false, false]) && r.win.ls.length === 0 && r.win.dls.length === 0);
  r.down('KeyL');
  ok('detached: keys do nothing', r.acts.length === 2);
}
{
  const win = fakeWindow();
  let n = 0;
  const km = createKeymap({ target: win, onAction: () => { n++; throw new Error('listener'); } });
  km.attach();
  const warn = console.warn; console.warn = () => {};
  win.fire('keydown', key('KeyA')); win.fire('keydown', key('KeyS'));
  console.warn = warn;
  ok('an onAction that throws never breaks the next key', n === 2 && js(km.down()) === js(['KeyA', 'KeyS']));
}
{
  const r = rig();
  let good = true;
  for (const code of Object.keys(KEYMAP)) {
    r.down(code);
    const last = r.acts.at(-1);
    if (!last || last[0] !== code || last[1] !== KEYMAP[code].kind || last[2] !== true) good = false;
    r.up(code);
    if (r.acts.at(-1)[2] !== false) good = false;
  }
  ok(`every contract code (${Object.keys(KEYMAP).length}) fires its own action down and up`, good && r.km.down().length === 0);
  ok('the bottom row: Z gate · B bass · M dive; = tap', ['KeyZ', 'KeyB', 'KeyM', 'Equal'].map((c) => KEYMAP[c].kind).join() === 'gate,bass,dive,tap');
}

console.log('\n[keymap] R3 · THE TAUGHT SET: exactly these codes; X C V N and Digit1–8 left the keyboard');
{
  const TAUGHT = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyO',
    'Space', 'KeyB', 'KeyZ', 'KeyM', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Equal', 'Escape'];
  ok(`KEYMAP is exactly the taught set (${TAUGHT.length} codes)`, js(Object.keys(KEYMAP).sort()) === js(TAUGHT.slice().sort()), js(Object.keys(KEYMAP)));
  ok('no action kind hold / chord / arp / lock / pad remains', !Object.values(KEYMAP).some((a) => ['hold', 'chord', 'arp', 'lock', 'pad'].includes(a.kind)));
  const GONE = ['KeyX', 'KeyC', 'KeyV', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
  ok('X C V N and Digit1–8 are not mapped', GONE.every((c) => !Object.prototype.hasOwnProperty.call(KEYMAP, c)));
  const r = rig();
  let prevented = false;
  for (const c of GONE) { const e = r.down(c); prevented ||= e.prevented; r.down(c, { shiftKey: true }); r.up(c); }
  ok('…pressed (with or without ⇧) they fire nothing, record nothing, and are never preventDefault-ed', r.acts.length === 0 && r.km.down().length === 0 && !prevented, js(r.acts));
  r.win.document.activeElement = { tagName: 'INPUT' };
  r.down('Escape');
  ok('Escape is still ALWAYS owned (a text field focused)', js(r.acts) === js([['Escape', 'stop', true, false]]));
}

console.log(`\n[keymap] ${pass} passed, ${fail} failed`);
console.log(`keymap: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
