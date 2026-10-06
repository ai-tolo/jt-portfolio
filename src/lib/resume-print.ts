// The one-page résumé: the ONLY prose source for /resume and the PDF asset
// (public/jonathan-tollefson-resume.pdf). PrintResume.astro renders this on
// screen as the paper view and in print as the whole page. The old
// Notion-driven screen résumé is retired; nothing else reads résumé prose.
//
// The reader (Jon, 2026-09-21): a design or engineering lead at an AI, audio,
// or creative-tools company who has never seen uxjon.com and will not click.
// Every line has to stand without the site.
//
// Editorial guardrails (load-bearing, do not regress):
// - Positioning is "Design Engineer".
// - Names: each build leads with a plain descriptor ("AI mastering agent").
//   Finishable / the Engineer / the Catalog / SIGNAL never appear on the
//   sheet. The URL under the mastering agent is an address, not a name.
// - The judge story is a KNOWN failure mode (reward-model overoptimization),
//   never a novel discovery. Never claim more than one rater: the evidence
//   clause says "one rater, me" and promises nothing further.
// - ITU-R BS.1770 + true-peak only. No BS.1534/MUSHRA. No "learns your
//   taste" as a live feature.
// - Every number traces to a case study, Jon's stated facts, or
//   judge-ledger.json. The ledger figures are IMPORTED below, never typed,
//   so a snapshot refresh cannot leave the sheet stale (the flagship follows
//   the same law).
// - Voice: first person, plain, understated. No em dashes, no hype
//   adjectives. Banned: setup-then-reveal ("an agent, not a button:"),
//   "X, not Y" contrasts, aphorisms, two-beat punchlines. At most one
//   colon-led sentence on the page (the summary's). Nothing refers to the
//   page or the site. Solo / end-to-end is said once (the catalog).
// - Every bullet: what I did, to what, with what result, 30 words max. If a
//   line could sit unchanged on a stranger's résumé, make it specific or cut
//   it.
// - The writing law (Jon, 2026-10-06): only what is necessary; say what a
//   thing IS (a program, an app, a pipeline) before describing it; one idea
//   once, so a tool named in a build's stack line is not named again in its
//   bullets; never explain what a smart reader knows (mastering, dbt,
//   lineage). After any edit, count the words and run a word-frequency pass.
// - One page at TRUE print width (US Letter, 9.7pt body, ~543pt of content
//   width). Add a line, cut a line. Verify with a headless-Chrome print and
//   pypdf after any edit (CLAUDE.md, "Résumé subsystem").
import ledger from "./judge-ledger.json";

/** a bare URL pointer line under a build (no lead-in label: site voice) */
export interface PrintUrl {
  /** visible URL text, kept short */
  text: string;
  href: string;
}

export interface PrintEntry {
  /** builds: the plain descriptor; experience: the employer */
  org: string;
  /** builds: the stack; experience: the title (the bg-check-verified field) */
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
  builds: PrintEntry[];
  experience: PrintEntry[];
  education: PrintSchool[];
  /** each row of the skills block is a list of labeled groups */
  skillRows: PrintSkillGroup[][];
  /** the trailing line: a small-caps label, then one line of prose (<em> ok) */
  closer: { label: string; html: string };
}

// ── the evidence clause reads the ledger (never type these numbers) ──────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const monthOf = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
const spanOf = (first: string, last: string) => {
  const y1 = first.slice(0, 4), y2 = last.slice(0, 4);
  return y1 === y2
    ? `${monthOf(first)} to ${monthOf(last)} ${y2}`
    : `${monthOf(first)} ${y1} to ${monthOf(last)} ${y2}`;
};
const blind = ledger.blind;
if (blind.loudness_matched !== blind.votes) {
  // the sentence below calls every vote loudness-matched; a refreshed
  // snapshot that breaks that must be reworded, not printed.
  throw new Error(
    `resume-print: ${blind.loudness_matched} of ${blind.votes} blind votes are loudness-matched; reword the evidence clause before building`,
  );
}
const evidence =
  `Every candidate is now loudness-matched (ITU-R BS.1770, true-peak limited) and judged blind against the untouched original, ` +
  `which won ${blind.chose_original} of ${blind.votes} votes (one rater, me, ${spanOf(blind.first, blind.last)}).`;

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
  // Jon's words (2026-09-21), cut 2026-10-06: the title above already says
  // "Design engineer", and the banking app is the Crediverso entry's to say.
  // Its colon is the page's one colon-led sentence.
  summary:
    "Five years across marketing, UX, and enterprise data. " +
    "I now build what I design: front-end, audio tools, and applied AI. " +
    "Looking for a product team in audio, transcription, or AI.",
  builds: [
    {
      org: "AI mastering agent",
      pos: "Python, pedalboard, Claude",
      dates: "2026 – Present",
      bullets: [
        "Built an agent that masters a mix in a stateful, multi-step run, rendering candidates through FabFilter plugins.",
        "Shelved an active-learning model of my taste when blind tests showed it had learned the bias in my unblinded ratings, the known reward-model overoptimization failure.",
        evidence,
      ],
      url: {
        text: "uxjon.com/case-studies/the-console",
        href: "https://www.uxjon.com/case-studies/the-console",
      },
    },
    {
      org: "Audio catalog and search",
      pos: "Python, Whisper, librosa, Claude",
      dates: "2026 – Present",
      bullets: [
        "A pipeline I wrote alone transcribes, fingerprints, deduplicates, and classifies about 20,000 audio files by content; a phone app finds any of them by a word.",
      ],
    },
    {
      org: "Browser instrument",
      pos: "TypeScript, Web Audio API",
      dates: "2026 – Present",
      bullets: [
        "Drum and bass patterns under keys played from the computer keyboard; it records takes as WAV files.",
      ],
    },
  ],
  experience: [
    {
      org: "CHS Inc.",
      pos: "Business Analyst, AI & BI Engineering",
      dates: "Aug 2023 – Present",
      bullets: [
        "Designed the self-serve onboarding for the company's internal AI platform, from a 250-person beta toward a company-wide rollout; other teams are adopting it as a design system.",
        "Built a Python tool that writes each dbt model's lineage to Excel, Power BI, and stakeholder briefs in one pass.",
        "Used AI to find data models missing semantic context and added it in Alation with their developers.",
        "Coordinate releases for the go-to-market data engineering team at a Fortune 500 agricultural cooperative; its AI and BI products serve thousands of employees, farmers, and growers.",
      ],
    },
    {
      org: "Raylu, Inc.",
      pos: "Product Designer (Freelance)",
      dates: "Jan – Oct 2023",
      bullets: [
        "Designed the brand, components, and prototypes for an AI chat platform; the founders carried them into meetings that closed a $4M seed, and engineers built from the same file.",
      ],
    },
    {
      org: "Crediverso",
      pos: "UX Design Lead",
      dates: "Feb 2021 – Jan 2023",
      bullets: [
        "Led the design system and onboarding for a bilingual banking app serving US Hispanic households.",
        "Ran usability tests with 50+ participants; the revised main flow cut bounce from 40% to 25%.",
        "Grew the pre-launch channel from 700 to 2,100 followers with A/B-tested messaging.",
      ],
    },
  ],
  education: [
    {
      name: "Harvard University",
      dates: "2022",
      degree: "A.B. in Sociology, secondary field in History of Science",
      honors: "Dean's List (6×) · Rosenkrantz Discovery Grant",
    },
    {
      name: "University of Minnesota",
      dates: "2016 – 2018",
      degree: "Transfer years; returned to Harvard to graduate",
    },
  ],
  skillRows: [
    [
      { label: "Build", items: "TypeScript, React, Astro, HTML/CSS, Python, FastAPI, Claude Code" },
      { label: "Design", items: "Figma, Framer, Adobe Creative Suite" },
    ],
    [
      { label: "Models & Audio", items: "Web Audio API, Claude, Whisper, librosa, demucs, pedalboard" },
      { label: "Data", items: "SQL, dbt, Power BI, Alation" },
    ],
  ],
  // the Substack line is gone (Jon stopped writing there, 2026-09-23); the
  // records are "set", never "holds"
  closer: {
    label: "Athletics",
    html:
      "Six-time state hurdles champion; set Minnesota's all-time 110m record and the University of Minnesota freshman record.",
  },
};
