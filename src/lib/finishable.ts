// Shared Finishable data — the flagship story page and the standalone doors
// (/judge, /catalog) read the SAME round + taste-card facts so they can never
// drift apart. (Naming: Finishable — the Catalog / the Studio / the Engineer.)

const JDG = "/case-studies/the-console/judge";

// the palette round — three REAL renders of the same 22s of "head to toe"
// through the engine's three hand-built arms, loudness-matched to a 0.1 LU
// spread (verified). Labels must EQUAL the TasteLoop palette ids.
export const round3 = {
  id: "r3-palettes", source: "head to toe", tag: "three chains, one source — blind",
  loudnessNote: "all three matched to −18.7 LUFS",
  takes: [
    { label: "bright · forward", file: `${JDG}/round-a.mp3`, ref: "air shelf up, tilted to flat, glued — the forward arm" },
    { label: "clean · do-less", file: `${JDG}/round-b.mp3`, ref: "the restraint arm — a ceiling and little else, most dynamic" },
    { label: "warm · vocal-safe", file: `${JDG}/round-c.mp3`, ref: "air rolled off, de-harshed, warm tube — the vocal-first arm" },
  ],
};

// the REAL taste card (verbatim from ~/automation/data/taste/jon.json)
export const CARD_LINES = [
  "n_votes: 8",
  "warmth: −0.02",
  "air: 0.00",
  "density: −0.008",
  "restraint: +0.205",
  "note: job 219 — picked raw over treatments → +restraint",
  "note: job 222 — chose 'clean'",
];

export const PALETTES = [
  { id: "warm · vocal-safe", name: "warm · vocal-safe", born: "hand-built · eng_vocal_aware.py", rounds: 1, axis: "warmth" },
  { id: "clean · do-less", name: "clean · do-less", born: "hand-built · eng_clean.py", rounds: 2, axis: "restraint" },
  { id: "bright · forward", name: "bright · forward", born: "hand-built · eng_extended_chain.py", rounds: 0, axis: "air" },
];
