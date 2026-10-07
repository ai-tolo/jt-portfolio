// The three job case studies, surfaced on /resume below the sheet
// (2026-08-31 IA: homepage = Builds only; CHS / Crediverso / Raylu live
// with the résumé now).
//
// The ledes say what each study holds, plainly (rewritten 2026-10-06 at
// Jon's word "go for it": the old canon carried em dashes, a setup-then-
// reveal and, for Raylu, a line that read as if the file closed the round).
// DRAFT: Jon may swap them here without touching the page.
export interface CaseLink {
  slug: string;
  name: string;
  lede: string;
}

export const CASE_LINKS: CaseLink[] = [
  {
    slug: "chs",
    name: "CHS",
    lede: "The onboarding chat to try, the design system under it, and the questions a 250-person beta asked before launch.",
  },
  {
    slug: "crediverso",
    name: "Crediverso",
    lede: "Two navigation designs for sending family money, side by side in English and Spanish, and why we shipped the five-tap one.",
  },
  {
    slug: "raylu",
    name: "Raylu",
    lede: "The Figma file the founders took into their seed meetings, page by page: brand, market, strategy, wireframes and the clickable prototype.",
  },
];
