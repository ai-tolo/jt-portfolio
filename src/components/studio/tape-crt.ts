// THE TAPE'S SCREEN (Jon, 2026-10-07): while a tape plays, its label runs
// through a CRT — fine phosphor stripes and scanlines, subtle but there. Only
// the label: a canvas laid over the label's <img> inside `.cs-label`, so the
// shell paints over it and its cut-out frames the effect; the hubs, reels and
// window stay clean. It fades in on play and out on pause, and the GPU stops
// once it has faded. The <img> underneath IS the fallback: no WebGPU, reduced
// motion, a tape without a cover, or a GPU failure leave the label exactly as
// it is today. The library loads on the first play, never with the page.
//
// One effect at a time: the playing tape owns it; another tape taking over
// rebuilds it on that label. The library sizes the canvas from its parent
// and skips frames while it is off screen on its own.
//
// Tuned in ~/sites/shaders-lab station 4, which is the label alone, so the
// numbers carry over 1:1. Jon's pick (2026-10-07, second pass): coarse
// phosphor stripes and a little colour split; no scanlines, no vignette.
const CRT = {
  pixelSize: 16,
  scanlineFrequency: 180,
  scanlineIntensity: 0,
  colorShift: 1.4,
  vignetteIntensity: 0,
  vignetteRadius: 0,
};
const FADE_MS = 600; // matches .cs-crt's transition

type Shader = { pause(): void; resume(): void; destroy(): void; getFailureReason(): string | null };

let lib: Promise<typeof import("shaders/js") | null> | null = null;
let owner: HTMLElement | null = null; // the .ls whose label holds the canvas
let canvas: HTMLCanvasElement | null = null;
let shader: Shader | null = null;
let sleep = 0;
let dead = false;

const able = () =>
  !dead &&
  "gpu" in navigator &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const load = () =>
  (lib ??= import("shaders/js")
    .then((m) => (m.isWebGPUSupported() ? m : null))
    .catch(() => null));

const drop = () => {
  shader?.destroy();
  canvas?.remove();
  shader = canvas = owner = null;
};

async function mount(ls: HTMLElement) {
  const label = ls.querySelector<HTMLElement>(".cs-label");
  const src = label?.querySelector("img")?.currentSrc || label?.querySelector("img")?.src;
  if (!label || !src) return;
  const m = await load();
  if (!m) { dead = true; return; }
  drop();
  owner = ls;
  const c = (canvas = document.createElement("canvas"));
  c.className = "cs-crt";
  c.setAttribute("aria-hidden", "true");
  // the library pins the canvas's inline size at mount: give it the label's
  // box first, then let the stylesheet's 100% govern again
  c.width = label.clientWidth;
  c.height = label.clientHeight;
  label.append(c);
  const s = await m.createShader(c, {
    components: [
      { type: "ImageTexture", id: "img", props: { url: src, objectFit: "cover" } },
      { type: "CRTScreen", id: "crt", props: CRT },
    ],
  }, {
    disableTelemetry: true,
    onError: (reason) => {
      // a lost device rebuilds itself; anything else is final: the plain label stays
      if (reason && !/^device-lost$/.test(reason)) { dead = true; drop(); }
    },
  });
  if (canvas !== c) { s.destroy(); return; } // another tape took over while this one built
  shader = s;
  c.style.width = c.style.height = "";
}

/** The tape in `ls` started (`on`) or stopped playing. */
export function tapeCrt(ls: HTMLElement, on: boolean) {
  window.clearTimeout(sleep);
  if (on) {
    if (!able()) return;
    const ready = owner === ls && shader ? Promise.resolve() : mount(ls);
    ready.then(() => {
      if (owner !== ls || !canvas || !ls.hasAttribute("data-playing")) return;
      shader?.resume();
      // the next frame, so a fresh canvas starts at 0 and the fade runs
      requestAnimationFrame(() => canvas?.toggleAttribute("data-on", ls.hasAttribute("data-playing")));
    });
    return;
  }
  if (owner !== ls || !canvas) return;
  canvas.removeAttribute("data-on");
  sleep = window.setTimeout(() => shader?.pause(), FADE_MS + 50);
}
