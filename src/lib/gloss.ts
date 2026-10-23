// THE GLOSS (2026-10-23, Jon: "for any specific product like Ableton, or any niche word, acronym, etc. on the site
// (there can't be that many) … hovering on the word makes a definition/explanation appear"). The word carries the mark
// (a dotted underline in the dim ink, no glyph, never the accent); a hover previews it on a desk, a tap opens it on
// every device, the line floats under the word and never moves the page (Gloss.astro, gloss-client.ts).
//
// ONE LIST, at most TEN entries, every line one sentence in Jon's register (plain, like explaining it at a bar).
// ⚠️ DRAFT, round three (2026-10-23; Jon of round two: "tacky and weird, and imprecise when it could be more specific …
// they're bad"): PRECISE and plain, a fact a stranger can check, no metaphors, no jokes, at most two short sentences;
// 'many' or a number instead of any universal claim. His to rewrite.
// The résumé page and the case studies carry their own jargon (mastering · Web Audio · React · TypeScript) for a
// reader who knows it: not marked, his call pending.
export const GLOSS = [
  { word: "Ableton", line: "Ableton Live: music production software, widely used for recording, arranging and performing. Built for finishing songs." },
  { word: "stems", line: "A song exported as separate audio files, one per instrument or group (drums, bass, keys, vocals), so each can be mixed on its own." },
  { word: "chip", line: "In Signal Studio, a short loop (usually four bars) that has been grabbed, named and committed. From then on it is played, not edited." },
  { word: "MIDI", line: "The standard that lets keyboards, controllers and music software exchange notes and control signals. It carries the instructions, not the sound." },
  { word: "Whisper", line: "OpenAI's open-source speech-recognition model. It runs on a local machine and turns recordings into text." },
  { word: "take", line: "One continuous recording of a performance. Several takes of the same part are kept and compared." },
  { word: "WAV", line: "An uncompressed audio file: full quality, large. MP3 is the compressed kind." },
  { word: "BPM", line: "Beats per minute, the tempo of a song. A typical resting heartbeat is 60 to 100 BPM; most pop songs sit between 90 and 130." },
  { word: "Claude", line: "Anthropic's AI model. Intake sends it the transcript or the text, and it returns the tickets: events, tasks and reminders." },
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
