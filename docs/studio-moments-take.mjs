import { launch } from "/Users/tolo/studio-mocks/cdp.mjs";
import sharp from "/Users/tolo/sites/jt-portfolio-sheets/node_modules/sharp/lib/index.js";
const OUT = "/Users/tolo/sites/jt-portfolio-sheets/public/builds/studio/";
const { cdp, ev, close } = await launch(9332, 1440, 900);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp("Page.navigate", { url: "http://localhost:4460/?mute=1" });
  await wait(6000);
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: 136, y: 620, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: 136, y: 620, button: "left", clickCount: 1 });
  await wait(2000);
  await ev(`document.querySelector('#tabs button[data-view="song"]').click()`);
  await wait(3000);
  await ev(`(() => {
    const wave = document.querySelector('#crs-wave'); wave.style.position = 'relative';
    const W = wave.clientWidth, H = wave.clientHeight;
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none';
    const g = cv.getContext('2d'); g.scale(2, 2);
    g.fillStyle = 'rgba(159,183,255,0.62)';
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let x = 0; x < W; x += 2.5) { const bar = x / (W / 16); const env = 0.35 + 0.65 * Math.abs(Math.sin(bar * 1.9 + 0.4)); const beat = 1 - 0.5 * ((bar * 4) % 1); const h = Math.max(2, H * 0.86 * env * beat * (0.55 + 0.45 * rnd())); g.fillRect(x, H / 2 - h / 2, 1.5, h); }
    wave.append(cv);
    const sel = document.createElement('div'); sel.style.cssText = 'position:absolute;top:0;bottom:0;left:31.25%;width:25%;background:rgba(42,91,215,0.18);box-shadow:inset 0 0 0 1px rgba(42,91,215,0.5);pointer-events:none;z-index:3'; wave.append(sel);
    for (const p of [31.25, 56.25]) { const h = document.createElement('div'); h.className = 'ss-crop-handle'; h.style.left = p + '%'; wave.append(h); }
    const lbl = document.querySelector('.cv-srcwell'); if (lbl) { const b = lbl.querySelector('b'); if (b) b.textContent = 'TAKE · 4 BARS'; }
  })()`);
  await wait(500);
  const col = JSON.parse(await ev(`JSON.stringify(document.querySelector('.rightcol').getBoundingClientRect())`));
  const r = await cdp("Page.captureScreenshot", { format: "png", clip: { x: col.x, y: col.y, width: col.width, height: col.height, scale: 1 } });
  const png = Buffer.from(r.result.data, "base64");
  const b = JSON.parse(await ev(`(() => { const c = document.querySelector('.rightcol').getBoundingClientRect(); const r = document.querySelector('#song-carve').getBoundingClientRect(); return JSON.stringify({x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height}); })()`));
  const crop = { x: 31, y: 0, w: 1106, h: 622 };
  const S = 2, left = crop.x * S, top = crop.y * S, width = crop.w * S, height = crop.h * S;
  const hole = `x="${(b.x - crop.x) * S}" y="${(b.y - crop.y) * S}" width="${b.w * S}" height="${b.h * S}" rx="10"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><mask id="m"><rect width="100%" height="100%" fill="white"/><rect ${hole} fill="black"/></mask></defs><rect width="100%" height="100%" fill="#06070a" fill-opacity="0.66" mask="url(#m)"/><rect ${hole} fill="none" stroke="#2a5bd7" stroke-width="3" stroke-opacity="0.95"/></svg>`;
  const info = await sharp(png).extract({ left, top, width, height }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).webp({ quality: 86, effort: 6 }).toFile(OUT + "moment-take.webp");
  console.log("take", info.width, info.height, info.size);
  await sharp(OUT + "moment-take.webp").resize(1000).png().toFile("look-take.png");
} finally { close(); }
