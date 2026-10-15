// THE SKIM (2026-10-15, Jon: "the current scripting feels too long to hold
// anyone's interest … everyone has tiktok brains at this point"). When a
// sheet's fold opens it no longer prints the whole script first: it prints
// THREE BEATS — before · the turn · after — then the schematic (under the
// hood as a picture), and only then "the whole story", folded behind its own
// handle. Every beat below is a sentence QUOTED VERBATIM from Jon's locked
// script in builds-copy.ts (the `from` note says which paragraph); nothing
// is rewritten, only chosen. ⚠️ The CHOICE is a draft: Jon swaps any beat
// for another of his own sentences by editing the `html` here. The middle
// beat (the turn) prints in the sheet's accent, the way the Intake's hinge
// line always has.
export type Beat = { html: string; from: string };
// THE READOUT's unit: a value and its word (Schematic.astro prints them under the chain)
export type Count = { n: string; w: string };
export type Skim = { beats: [Beat, Beat, Beat] };

// AudioDex's beats were retired 2026-10-15 (its fold is the Thanksgiving scene, objects-copy.ts ARCHIVE_COPY)
// SIGNAL STUDIO's beats were retired 2026-10-15 (its fold is the surface's sheet: StudioOne #build-studio)
export const SKIM: Record<"watch", Skim> = {
  watch: {
    beats: [
      { html: "By the time I'd typed it, I had a note <em>about</em> an idea.", from: "watch, the hinge line" },
      { html: "They all wanted to be a companion. I just wanted a button.", from: "watch ¶9" },
      { html: "Now I click one button on my wrist and speak my mind freely.", from: "watch ¶3" },
    ],
  },
};
