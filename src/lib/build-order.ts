// THE BUILDS' ORDER (2026-10-13): the one list of the builds, in the page's order. Round two (Jon, 2026-10-13: "the
// readout line is ugly") took the numbers off the sheets; each sheet now carries only its kind word. The order
// is the page's: AudioDex, then Intake (the work room), then SIGNAL (the play room), then Signal Studio (its own
// room, #studio, after the play room). The rail names the builds in words only (round two, 2026-10-13: no
// numerals there). Adding, removing or reordering a build is an edit here and nowhere else; never type "03" in markup.
export const BUILD_ORDER = ["audiodex", "intake", "signal", "studio"] as const;
export type BuildId = (typeof BUILD_ORDER)[number];

const two = (n: number): string => String(n).padStart(2, "0");

/** A build's place and the count, two digits each: { n: "01", of: "04" }. */
export const buildNo = (id: BuildId): { n: string; of: string } => {
  const i = BUILD_ORDER.indexOf(id);
  if (i < 0) throw new Error(`build-order: unknown build "${id}"`);
  return { n: two(i + 1), of: two(BUILD_ORDER.length) };
};
