// The one-page résumé: the ONLY prose source for /resume and the PDF asset
// (public/jonathan-tollefson-resume.pdf). PrintResume.astro renders this on
// screen as the paper view and in print as the whole page. The old
// Notion-driven screen résumé is retired; nothing else reads résumé prose.
//
// ════════════════════════════════════════════════════════════════════════
// DRAFT (2026-10-23, branch resume-sheet): EVERY LINE BELOW IS A DRAFT until
// Jon approves it. The shape comes from the research in
// ~/career-strategy/resume-2026-10/ (positioning.md: the gist and the haters):
// - ONE employment-grade entry on top, "Own products · Design Engineer",
//   with the five products as its bullets, so a parser reads one current
//   title and one date range (today's three builds parse as three employers
//   named after the builds, with the stack as the job title).
// - The product bullets lead with a plain descriptor and carry the
//   homepage's name in parentheses, so the reader who then types uxjon.com
//   meets the same four things. This bends the 2026-09-21 ruling that the
//   builds' names never appear on the sheet (Finishable / the Engineer / the
//   Catalog stay banned; SIGNAL, Intake, AudioDex, Signal Studio are the
//   homepage's public names now). Jon's call.
// - The summary is four sentences, all Jon's own words: the two from
//   2026-09-21 and the hero's two from 2026-10-22. The "Looking for a product
//   team…" sentence is cut (no screener scores it; it reads as a mismatch at
//   non-audio companies).
// - The blind-test VOTE COUNT is off the sheet (it read as the agent losing
//   26 of 58 in every simulated screen); the sentence keeps "judged blind,
//   loudness-matched, against the untouched original". The ledger numbers
//   stay on the page's proof panel (ProofJudge imports judge-ledger.json).
// - CUT, 0 of the 30 top postings ask: the athletics closer, Dean's List and
//   the grant, the follower-growth bullet, the Fortune 500 / farmers clause,
//   "serving US Hispanic households". Each is one word from Jon to restore.
// - DATES: Raylu printed "Jan – Oct 2023" since 09-21; Career Context says
//   April to October 2023. Printed as "Jan 2023 – Oct 2023" (parsers want a
//   year on both ends); Jon confirms the month.
// - SKILLS additions, all true of the builds: Vite, Node, Web MIDI, Claude
//   API, Snowflake. One category per line (a shared line parsed as one skill
//   "Claude Code · Design: Figma").
// ════════════════════════════════════════════════════════════════════════
//
// The reader (Jon, 2026-09-21): a design or engineering lead at an AI, audio,
// or creative-tools company who has never seen uxjon.com and will not click.
// Every line has to stand without the site.
//
// Editorial guardrails (load-bearing, do not regress):
// - Positioning is "Design Engineer".
// - Finishable / the Engineer / the Catalog never appear on the sheet. The
//   URL under the own-products entry is an address, not a name.
// - The judge story is a KNOWN failure mode (reward-model overoptimization),
//   never a novel discovery. Never claim more than one rater. The sheet now
//   carries no vote count at all; the proof panel does.
// - ITU-R BS.1770 + true-peak only. No BS.1534/MUSHRA. No "learns your
//   taste" as a live feature.
// - Every number traces to a case study, Jon's stated facts, or
//   judge-ledger.json (the panel). Never invent, inflate, or round one.
// - Voice: first person, plain, understated. No em dashes, no hype
//   adjectives. Banned: setup-then-reveal, "X, not Y" contrasts, aphorisms.
//   At most one colon-led sentence on the page (the summary's). Nothing
//   refers to the page or the site except the homepage, named once.
// - Every bullet: what I did, to what, with what result, about 30 words.
// - The writing law (Jon, 2026-10-06): only what is necessary; say what a
//   thing IS before describing it; one idea once; never explain what a
//   smart reader knows. After any edit, count the words.
// - One page at TRUE print width (US Letter, 9.7pt body, ~543pt of content
//   width). Add a line, cut a line. Verify with a headless-Chrome print and
//   pypdf after any edit (CLAUDE.md, "Résumé subsystem").
// - US spelling on every visitor-readable string.

/** a bare URL pointer line under an entry (no lead-in label: site voice) */
export interface PrintUrl {
  /** visible URL text, kept short */
  text: string;
  href: string;
}

export interface PrintEntry {
  /** the employer, or "Own products" for the top entry */
  org: string;
  /** the title (the bg-check-verified field for employers) */
  pos?: string;
  dates: string;
  bullets: string[];
  url?: PrintUrl;
}

export interface PrintSchool {
  name: string;
  dates: string;
  degree: string;
  honors?: string;
}

export interface PrintSkillGroup {
  label: string;
  items: string;
}

export interface PrintResumeContent {
  name: string;
  title: string;
  /** joined with " · " in one line; URLs and the email auto-link; the phone
   *  is print-only (the component hides it, separator included, on screen) */
  contact: string[];
  summary: string;
  /** kept for the component's section loop; empty since 2026-10-23 (the
   *  builds live in experience[0]) and an empty section does not render */
  builds: PrintEntry[];
  experience: PrintEntry[];
  education: PrintSchool[];
  /** each row of the skills block is a list of labeled groups; one group per
   *  row since 2026-10-23 so a parser reads one category per line */
  skillRows: PrintSkillGroup[][];
  /** the trailing line: a small-caps label, then one line of prose (<em> ok);
   *  absent since 2026-10-23 (DRAFT: the athletics line is cut) */
  closer?: { label: string; html: string };
}

export const printContent: PrintResumeContent = {
  name: "Jonathan Tollefson",
  title: "Design Engineer",
  // Contact policy (Jon, 2026-09-21): phone is PRINT-ONLY; no LinkedIn on
  // the sheet (the page's actions row and floor carry the icon).
  contact: [
    "jtollefson123@gmail.com",
    "(614) 403-4845",
    "uxjon.com",
    "Minneapolis, MN",
    "remote (US)",
  ],
  // DRAFT. Four sentences, all Jon's: the first two from 2026-09-21 (its
  // colon is the page's one colon-led sentence), the last two are the
  // homepage hero's line (2026-10-22).
  summary:
    "Five years across marketing, UX, and enterprise data. " +
    "I now build what I design: front-end, audio tools, and applied AI. " +
    "My job doesn't pay me to build these. But I use them every day.",
  builds: [],
  experience: [
    {
      // DRAFT. The top entry: the five products as one current role, in the
      // homepage's order, the mastering agent last so the bare URL under the
      // entry sits under its own line.
      org: "Own products",
      pos: "Design Engineer",
      dates: "2026 – Present",
      bullets: [
        "A catch-all agent (Intake) that turns a voice memo or a text to myself into calendar and reminder changes, or a ticket for me to judge. Python, SQLite, Whisper, Claude.",
        "An audio catalog (AudioDex), about 20,000 recordings transcribed, fingerprinted, deduplicated and classified by a Python pipeline (Whisper, librosa, Claude), searchable by a word from a phone app in TypeScript.",
        "A browser instrument (SIGNAL) on my homepage, drums, bass and keys under the computer keyboard; it records a visitor's take as a WAV. TypeScript, Web Audio.",
        "A browser studio (Signal Studio) in TypeScript and Web Audio. One click samples any instrument I own; it detects tempo and key and prints the loops I keep as stems.",
        "An AI mastering agent that masters a mix in a stateful, multi-step run, rendering candidates through FabFilter plugins and judging them blind, loudness-matched, against the untouched original. Python, pedalboard, Claude.",
      ],
      url: {
        text: "uxjon.com/case-studies/the-console",
        href: "https://www.uxjon.com/case-studies/the-console",
      },
    },
    {
      org: "CHS Inc.",
      pos: "Business Analyst, AI & BI Engineering",
      dates: "Aug 2023 – Present",
      // DRAFT. Three lines: the agents and the docs (10,000 employees is the
      // case study's number), the lineage tool, releases + Alation. The
      // Fortune 500 / farmers clause is cut.
      bullets: [
        "Built agents on the company's internal AI platform, then designed and wrote the docs, guides and onboarding chat for its 10,000 employees; other internal tools are adopting the design system.",
        "Built a Python tool that writes each dbt model's lineage to Excel, Power BI, and stakeholder briefs in one pass.",
        "Coordinate releases for the go-to-market data engineering team; used AI to find data models missing semantic context and added it in Alation with their developers.",
      ],
    },
    {
      org: "Raylu, Inc.",
      pos: "Product Designer (Freelance)",
      // DRAFT: Jan vs April 2023, Jon confirms
      dates: "Jan 2023 – Oct 2023",
      bullets: [
        "Designed the brand, components, and prototypes for an AI startup; the founders carried them into meetings that closed a $4M seed, and engineers built from the same file.",
      ],
    },
    {
      org: "Crediverso",
      pos: "UX Design Lead",
      dates: "Feb 2021 – Jan 2023",
      // DRAFT. One line; the follower-growth bullet is cut.
      bullets: [
        "Led the design system and onboarding for a bilingual banking app on iOS; after usability tests with 50+ participants, the revised main flow cut bounce from 40% to 25%.",
      ],
    },
  ],
  education: [
    {
      name: "Harvard University",
      dates: "2022",
      degree: "A.B. in Sociology, secondary field in History of Science",
      // DRAFT: "Dean's List (6×) · Rosenkrantz Discovery Grant" cut (0 of 30 ask)
    },
    {
      name: "University of Minnesota",
      dates: "2016 – 2018",
      degree: "Transfer years; returned to Harvard to graduate",
    },
  ],
  // DRAFT. One category per line.
  skillRows: [
    [{ label: "Build", items: "TypeScript, React, Astro, Vite, HTML, CSS, Node, Python, FastAPI, SQL" }],
    [{ label: "Audio and AI", items: "Web Audio API, Web MIDI, Claude API, Claude Code, Whisper, librosa, demucs, pedalboard" }],
    [{ label: "Design and data", items: "Figma, Framer, Adobe Creative Suite, dbt, Snowflake, Power BI, Alation" }],
  ],
  // DRAFT: the athletics closer is cut (0 of 30 postings ask). The line, for
  // one word from Jon: "Six-time state hurdles champion; set Minnesota's
  // all-time 110m record and the University of Minnesota freshman record."
};
