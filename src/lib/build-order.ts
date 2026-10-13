// THE BUILDS' ORDER (2026-10-13): the one list that numbers the three builds. The sheets' readout ("build 01 / 03",
// StudioOne's two .wk sheets and SignalCard) reads it, and so should the rail's numerals, so the two can never
// disagree. The order is the page's: AudioDex, then Intake (the work room), then SIGNAL (the play room). Adding,
// removing or reordering a build is an edit here and nowhere else; never type "03" in markup.
export const BUILD_ORDER = ["audiodex", "intake", "signal"] as const;
export type BuildId = (typeof BUILD_ORDER)[number];

const two = (n: number): string => String(n).padStart(2, "0");

/** A build's place and the count, two digits each: { n: "01", of: "03" }. */
export const buildNo = (id: BuildId): { n: string; of: string } => {
  const i = BUILD_ORDER.indexOf(id);
  if (i < 0) throw new Error(`build-order: unknown build "${id}"`);
  return { n: two(i + 1), of: two(BUILD_ORDER.length) };
};
