// SIX MOMENTS of the real Studio (localhost:4460), headless + muted, 1440×900 at 2×. Each moment: a state set in the
// DOM where the point needs one, the column captured, a 16:9 crop cut, everything but the subject dimmed.
import { launch } from "/Users/tolo/studio-mocks/cdp.mjs";
import fs from "node:fs";
import sharp from "/Users/tolo/sites/jt-portfolio-sheets/node_modules/sharp/lib/index.js";
const OUT = "/Users/tolo/sites/jt-portfolio-sheets/public/builds/studio/";
const ACC = "#2a5bd7";
const { cdp, ev, close } = await launch(9331, 1440, 900);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const rect = async (sel) => JSON.parse(await ev(`(() => { const col = document.querySelector('.rightcol').getBoundingClientRect(); const r = document.querySelector('${sel}').getBoundingClientRect(); return JSON.stringify({x: r.left - col.left, y: r.top - col.top, w: r.width, h: r.height}); })()`));
const shotCol = async () => {
  const col = JSON.parse(await ev(`JSON.stringify(document.querySelector('.rightcol').getBoundingClientRect())`));
  const r = await cdp("Page.captureScreenshot", { format: "png", clip: { x: col.x, y: col.y, width: col.width, height: col.height, scale: 1 } });
  return Buffer.from(r.result.data, "base64"); // 2336×1800
};
// crop (CSS px in the column) + spotlight holes (CSS px) → webp at 2×
const cut = async (png, name, crop, holes, dim = 0.66) => {
  const S = 2;
  const left = Math.round(crop.x * S), top = Math.round(crop.y * S), width = Math.round(crop.w * S), height = Math.round(crop.h * S);
  const hs = holes.map(h => `<rect x="${(h.x - crop.x) * S}" y="${(h.y - crop.y) * S}" width="${h.w * S}" height="${h.h * S}" rx="10"`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><mask id="m"><rect width="100%" height="100%" fill="white"/>${hs.map(h => h + ' fill="black"/>').join("")}</mask></defs>
    <rect width="100%" height="100%" fill="#06070a" fill-opacity="${dim}" mask="url(#m)"/>
    ${hs.map(h => h + ` fill="none" stroke="${ACC}" stroke-width="3" stroke-opacity="0.95"/>`).join("")}
  </svg>`;
  const info = await sharp(png).extract({ left, top, width, height }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).webp({ quality: 86, effort: 6 }).toFile(OUT + `moment-${name}.webp`);
  console.log(name, info.width, info.height, info.size);
};
// a 16:9 crop of width w (CSS px) centred on (cx, cy), kept inside the 1168×900 column
const box = (w, cx, cy) => { const h = Math.round(w * 9 / 16); let x = Math.round(cx - w / 2), y = Math.round(cy - h / 2); x = Math.max(0, Math.min(x, 1168 - w)); y = Math.max(0, Math.min(y, 900 - h)); return { x, y, w, h }; };
const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2];
try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp("Page.navigate", { url: "http://localhost:4460/?mute=1" });
  await wait(6000);
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: 136, y: 620, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: 136, y: 620, button: "left", clickCount: 1 });
  await wait(2500);
  // the bass tower's name plate reads "—" in a fresh profile: name it (SIGNAL's own bass)
  await ev(`(() => { const s = document.querySelector('.sb-head .sg-screen'); const t = [...s.querySelectorAll('*')].find(e => e.childElementCount === 0 && e.textContent.trim() === '—') || s; t.textContent = '303'; })()`);
  await wait(300);
  let png = await shotCol();
  // 1 · ENGINES: the three towers, whole
  const towers = await rect(".sig-towers");
  await cut(png, "engines", box(1106, ...mid(towers)), [towers], 0.5);
  // 2 · EFFECTS: the three towers' effects blocks at once
  const fx = [await rect("#si-drums .sd-cols"), await rect(".kv-fx"), await rect(".sb-fx")];
  const fxUnion = { x: Math.min(...fx.map(r => r.x)), y: Math.min(...fx.map(r => r.y)), w: 0, h: 0 };
  fxUnion.w = Math.max(...fx.map(r => r.x + r.w)) - fxUnion.x; fxUnion.h = Math.max(...fx.map(r => r.y + r.h)) - fxUnion.y;
  await cut(png, "effects", box(1106, ...mid(fxUnion)), fx);
  // 6 · HANDS: the keybed with its letters
  const bed = await rect("#si-stage");
  await cut(png, "hands", box(1106, bed.x + bed.w / 2, bed.y + bed.h / 2 - 120), [bed]);
  // 4 · CHIPS: three chips in the well, drawn with the well's own chip markup
  await ev(`(() => {
    const slots = document.querySelector('.fs-slots'); slots.innerHTML = '';
    const mk = (t, c) => { const e = document.createElement(t); e.className = c; return e; };
    const chips = [['RHODES', 4], ['VOICE', 2], ['RADIO', 8]];
    for (const [w, n] of chips) {
      const el = mk('button', 'fs-chip'); el.type = 'button';
      const cv = mk('canvas', 'fs-wave'); cv.width = 160; cv.height = 40;
      const g = cv.getContext('2d'); g.fillStyle = '#9fb7ff';
      for (let i = 0; i < 40; i++) { const h = 6 + 30 * Math.abs(Math.sin(i * 0.7 + w.length) * Math.cos(i * 0.23)); g.fillRect(i * 4, 20 - h / 2, 2.4, h); }
      const word = mk('span', 'fs-word'); word.textContent = w;
      const count = mk('span', 'fs-count'); count.textContent = n + ' bars';
      el.append(cv, mk('i', 'fs-span'), word, count, mk('i', 'fs-lamp'), mk('i', 'fs-hair'), mk('i', 'fs-head'));
      slots.append(el);
    }
  })()`);
  await wait(400);
  png = await shotCol();
  const well = await rect(".fs-well");
  await cut(png, "chips", box(760, well.x + well.w / 2, well.y - 60), [well]);
  // 5 · RADAR: the room's key, chord and tempo on the glass, in the radar's ink (the app's own data-who / data-src)
  await ev(`(() => {
    const k = document.querySelector('#tb-key'); k.dataset.who = 'radar'; k.querySelector('.tb-key-n').textContent = 'Cm'; k.querySelector('.tb-key-mode').textContent = 'RADAR';
    const t = document.querySelector('.tb-tempo'); t.dataset.src = 'radar'; document.querySelector('.tb-bpm-n').innerHTML = '<i>9</i><i>4</i>'; document.querySelector('.tb-bpm-src').textContent = 'RADAR';
  })()`);
  await wait(400);
  png = await shotCol();
  const seat = await rect(".tb-tempo");
  await cut(png, "radar", box(760, seat.x + seat.w / 2, seat.y + seat.h / 2 + 150), [seat]);
  // 3 · THE TAKE: the jam page's bench, a take cut out of the record with the bench's own handles
  await ev(`document.querySelector('#tabs button[data-view="song"]').click()`);
  await wait(3000);
  await ev(`(() => {
    const cv = document.querySelector('#crs-canvas'); const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * 2; cv.height = H * 2;
    const g = cv.getContext('2d'); g.scale(2, 2); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(159,183,255,0.55)';
    for (let x = 0; x < W; x += 3) { const e = 0.25 + 0.75 * Math.abs(Math.sin(x * 0.013) * Math.sin(x * 0.071 + 1) ); const bar = Math.floor(x / (W / 16)); const beat = (bar % 4 === 0) ? 1 : 0.7; const h = H * 0.9 * e * beat * (0.6 + 0.4 * Math.abs(Math.sin(x * 0.4))); g.fillRect(x, H / 2 - h / 2, 1.6, h); }
    const wave = document.querySelector('#crs-wave'); wave.style.position = 'relative';
    for (const p of [0.31, 0.56]) { const h = document.createElement('div'); h.className = 'ss-crop-handle'; h.style.left = (p * 100) + '%'; wave.append(h); }
    const sel = document.createElement('div'); sel.style.cssText = 'position:absolute;top:0;bottom:0;left:31%;width:25%;background:rgba(42,91,215,0.16);pointer-events:none;z-index:3'; wave.append(sel);
  })()`);
  await wait(500);
  png = await shotCol();
  const bench = await rect("#song-carve");
  await cut(png, "take", box(760, bench.x + bench.w / 2, bench.y + bench.h / 2 + 90), [bench]);
} finally { close(); }
