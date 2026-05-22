#!/usr/bin/env node
// One-off generator for the Audio Atlas hero cover. Produces an SVG
// that reads as a striking BucketCard at hero scale: a large waveform
// with brand-gradient bars, the filename pill in catalog green, a
// LOOPS bucket badge, tech meta in cyan, and the brand-gradient
// PROMOTE TO LIVE button. Writes to public/case-studies/the-console/.
//
// Run once: `node scripts/generate-audio-atlas-cover.mjs`. The
// resulting cover.svg is referenced by lib/notion.ts via the per-slug
// override map.

import fs from "node:fs/promises";
import path from "node:path";

const W = 1600;
const H = 1000;
const PAD = 96;

// Waveform geometry.
const WF_TOP = 360;
const WF_HEIGHT = 320;
const WF_X = PAD;
const WF_W = W - PAD * 2;
const BARS = 96;
const GAP = 4;
const BAR_W = (WF_W - GAP * (BARS - 1)) / BARS;

// Bar heights derive from a layered sin/cos curve so the silhouette
// reads as a real audio waveform rather than a uniform forest. Heights
// are normalized 0..1 then scaled into WF_HEIGHT.
const heights = Array.from({ length: BARS }, (_, i) => {
  const t = i / (BARS - 1);
  const low = 0.5 + 0.4 * Math.sin(i * 0.32);
  const mid = 0.35 * Math.cos(i * 0.18 + 1.2);
  const hi = 0.22 * Math.sin(i * 0.81 + 0.3);
  const env = Math.sin(Math.PI * (0.10 + 0.85 * t)); // soft envelope
  const v = Math.max(0.10, Math.min(0.98, env * (low + mid + hi)));
  return v;
});

// Brand-gradient color stops as RGB triples for per-bar interpolation.
// Mirrors the public-site brand grad (pink → orange → yellow).
const STOPS = [
  { p: 0.0, c: [255, 39, 97] },   // pink
  { p: 0.5, c: [255, 90, 60] },   // orange
  { p: 1.0, c: [255, 179, 71] },  // yellow
];

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function colorAt(p) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      const rgb = lerp(a.c, b.c, t);
      return `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
    }
  }
  return "rgb(255, 90, 60)";
}

const bars = heights
  .map((h, i) => {
    const barH = h * WF_HEIGHT;
    const x = WF_X + i * (BAR_W + GAP);
    const y = WF_TOP + (WF_HEIGHT - barH) / 2;
    const fill = colorAt(i / (BARS - 1));
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${BAR_W.toFixed(2)}" height="${barH.toFixed(2)}" rx="1.5" fill="${fill}" />`;
  })
  .join("\n      ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f0a14"/>
      <stop offset="0.55" stop-color="#08060e"/>
      <stop offset="1" stop-color="#040308"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.1" r="0.6">
      <stop offset="0" stop-color="#ff5a3c" stop-opacity="0.18"/>
      <stop offset="0.45" stop-color="#ff2761" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cyanGlow" cx="0.95" cy="0.78" r="0.55">
      <stop offset="0" stop-color="#0ec4fc" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff2761"/>
      <stop offset="0.5" stop-color="#ff5a3c"/>
      <stop offset="1" stop-color="#ffb347"/>
    </linearGradient>
    <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>

  <!-- Background field -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#cyanGlow)"/>

  <!-- Eyebrow: BUCKETS / LOOPS / MOST-USED -->
  <g transform="translate(${PAD}, 96)">
    <text font-size="22" letter-spacing="6" fill="rgba(245, 241, 232, 0.45)">BUCKETS · LOOPS · MOST-USED</text>
  </g>

  <!-- Filename pill (green mono italic) -->
  <g transform="translate(${PAD}, 168)">
    <rect width="1050" height="110" rx="10" fill="rgba(0, 255, 77, 0.04)" stroke="rgba(0, 255, 77, 0.32)" stroke-width="1.5"/>
    <text x="34" y="74" font-size="46" font-style="italic" font-weight="700" fill="#00ff4d">NOIZU_125_shaker_loop_tight_01<tspan fill="#f5f1e8" fill-opacity="0.45">.wav</tspan></text>
  </g>

  <!-- LOOPS bucket badge (pink) -->
  <g transform="translate(${W - PAD - 200}, 184)">
    <rect width="200" height="74" rx="5" fill="rgba(255, 39, 97, 0.10)" stroke="rgba(255, 39, 97, 0.55)" stroke-width="1.5"/>
    <text x="100" y="50" font-size="24" letter-spacing="9" font-weight="700" fill="#ff2761" text-anchor="middle">LOOPS</text>
  </g>

  <!-- Waveform glow underlay -->
  <g opacity="0.55" filter="url(#softGlow)">
      ${bars}
  </g>
  <!-- Waveform bars -->
  <g>
      ${bars}
  </g>

  <!-- Tech meta line (cyan accents) -->
  <g transform="translate(${PAD}, 752)">
    <text font-size="32" font-style="italic" font-weight="700" letter-spacing="2">
      <tspan fill="rgba(245, 241, 232, 0.45)" font-size="22" letter-spacing="8">TECH</tspan>
      <tspan dx="36" fill="#0ec4fc">99 </tspan><tspan fill="rgba(245, 241, 232, 0.62)">BPM</tspan>
      <tspan dx="20" fill="rgba(245, 241, 232, 0.32)">·</tspan>
      <tspan dx="20" fill="#0ec4fc">E </tspan><tspan fill="rgba(245, 241, 232, 0.62)">major</tspan>
      <tspan dx="20" fill="rgba(245, 241, 232, 0.32)">·</tspan>
      <tspan dx="20" fill="#0ec4fc">0:04</tspan>
    </text>
  </g>

  <!-- PROMOTE TO LIVE button -->
  <g transform="translate(${PAD}, 820)">
    <rect width="500" height="100" rx="10" fill="url(#brand)"/>
    <text x="250" y="65" font-size="32" font-style="italic" font-weight="700" letter-spacing="3" fill="#0e0c14" text-anchor="middle">→ PROMOTE TO LIVE</text>
  </g>

  <!-- LIVE indicator (top-right corner) -->
  <g transform="translate(${W - PAD - 140}, 800)">
    <circle cx="14" cy="34" r="8" fill="#00ff4d"/>
    <circle cx="14" cy="34" r="14" fill="#00ff4d" opacity="0.32" filter="url(#softGlow)"/>
    <text x="38" y="44" font-size="22" letter-spacing="6" font-weight="700" fill="#00ff4d">LIVE</text>
  </g>

  <!-- Subtle grid baseline under the waveform -->
  <line x1="${PAD}" y1="${WF_TOP + WF_HEIGHT + 18}" x2="${W - PAD}" y2="${WF_TOP + WF_HEIGHT + 18}" stroke="rgba(245, 241, 232, 0.08)" stroke-width="1"/>
</svg>
`;

const outDir = path.resolve(process.cwd(), "public/case-studies/the-console");
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "cover.svg");
await fs.writeFile(outPath, svg, "utf8");

console.log(`Wrote ${outPath} (${(svg.length / 1024).toFixed(1)} KB)`);
