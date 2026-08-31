// The three job case studies, surfaced on /resume below the sheet
// (2026-08-31 IA: homepage = Builds only; CHS / Crediverso / Raylu live
// with the résumé now). Model 1 — clean typographic links; model 2's
// inline overlay experiences are a later pass.
//
// The lede lines are CANON carried over from the shipped homepage shelf
// (hand-written in Jon's register, 2026-08-16/19) — not new words. The
// copy chat may swap them here without touching the page.
export interface CaseLink {
  slug: string;
  name: string;
  lede: string;
}

export const CASE_LINKS: CaseLink[] = [
  {
    slug: "chs",
    name: "CHS",
    lede: "CHS has 10,000 employees and, suddenly, AI. I taught it — from a 250-person beta to the whole company, until <strong>non-technical teams were building their own models</strong>.",
  },
  {
    slug: "crediverso",
    name: "Crediverso",
    lede: "Most banking apps treat family like a liability. We shipped one in two languages where <strong>family is the point</strong> — and the front door stopped losing people: bounce fell 40% to 25%.",
  },
  {
    slug: "raylu",
    name: "Raylu",
    lede: "Raylu had a product in their heads and pitch meetings on the calendar. I built the brand and the prototypes <strong>they carried into the rooms that closed $4M</strong>.",
  },
];
