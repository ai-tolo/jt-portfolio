// THE GLOSS (2026-10-23, Jon: "for any specific product like Ableton, or any niche word, acronym, etc. on the site
// (there can't be that many) … hovering on the word makes a definition/explanation appear"). The word carries the mark
// (a dotted underline in the dim ink, no glyph, never the accent); a hover previews it on a desk, a tap opens it on
// every device, the line floats under the word and never moves the page (Gloss.astro, gloss-client.ts).
//
// ONE LIST, at most TEN entries, every line one sentence in Jon's register (plain, like explaining it at a bar).
// ⚠️ DRAFT: Jon approved these nine on 2026-10-23; his to rewrite. The résumé page and the case studies carry their
// own jargon (mastering · Web Audio · React · TypeScript) for a reader who knows it: not marked, his call pending.
export const GLOSS = [
  { word: "Ableton", line: "the software most producers make music in; great at finishing songs." },
  { word: "stems", line: "one audio file per instrument, so a song can be remixed later." },
  { word: "chip", line: "a loop you've committed to." },
  { word: "MIDI", line: "the plug that lets any keyboard talk to any instrument." },
  { word: "Whisper", line: "the free program that turns speech into text." },
  { word: "take", line: "a recording kept the moment you stop playing." },
  { word: "WAV", line: "the plain audio file a song is saved as; it opens anywhere." },
  { word: "BPM", line: "beats per minute: the tempo." },
  { word: "Claude", line: "the AI that reads the memo and writes the tickets." },
] as const;
export type GlossWord = (typeof GLOSS)[number]["word"];

const byWord = new Map<string, string>(GLOSS.map((g) => [g.word, g.line]));
export const glossLine = (w: string): string => {
  const line = byWord.get(w);
  if (!line) throw new Error(`gloss: "${w}" is not in the list (src/lib/gloss.ts)`);
  return line;
};
// the id of the word's hidden line, the button's aria-describedby (gloss-client.ts writes the lines once per page)
export const glossId = (w: string): string => `gl-d-${w.toLowerCase()}`;

// a copy string with words marked: the FIRST whole-word occurrence of each listed word, in order. A listed word that
// is not in the text throws at build time (a silent no-match would leave a word unmarked after a rewrite).
export type GlossPart = { t: string; w?: GlossWord };
export function glossParts(text: string, mark: readonly GlossWord[]): GlossPart[] {
  const hits = mark.map((w) => {
    const m = new RegExp(`\\b${w}\\b`).exec(text);
    if (!m) throw new Error(`gloss: "${w}" not found in "${text}"`);
    return { w, at: m.index };
  }).sort((a, b) => a.at - b.at);
  const parts: GlossPart[] = [];
  let i = 0;
  for (const h of hits) {
    if (h.at > i) parts.push({ t: text.slice(i, h.at) });
    parts.push({ t: h.w, w: h.w });
    i = h.at + h.w.length;
  }
  if (i < text.length) parts.push({ t: text.slice(i) });
  return parts;
}

// the same button as Gloss.astro, as an HTML string, for a script that writes its own markup (the watch's live lines)
export const glossButton = (w: GlossWord, text: string = w): string =>
  `<button type="button" class="gl" data-gl="${w}" aria-expanded="false" aria-describedby="${glossId(w)}">${text}</button>`;
