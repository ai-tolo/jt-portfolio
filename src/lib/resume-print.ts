// Curated content for the one-page PDF resume (the "Download PDF" path).
//
// This is deliberately DECOUPLED from the Notion-driven screen resume
// (src/lib/resumes.ts → ResumeRenderer.astro). The screen experience carries
// the full interactive content; the PDF is a curated, recruiter-facing
// one-pager. Edit THIS file to change the PDF; edit Notion to change the
// screen. PrintResume.astro renders it under @media print only.
//
// Editorial guardrails (load-bearing, do not regress):
// - Positioning is "Design Engineer".
// - The judge story is a KNOWN failure mode (reward-model overoptimization),
//   never a novel discovery. Validation is single-rater; the multi-rater
//   blind run is the stated gate.
// - ITU-R BS.1770 + true-peak only. No BS.1534/MUSHRA. No "learns your
//   taste" as a live feature. Real numbers only (700→2,100 / 3×, 50+,
//   15%, ~20,000 files).
// - Plain, understated voice. No em dashes.
// - One page: this content is sized to fit US Letter at 10pt. If you add a
//   bullet, cut one. Verify with a headless-Chrome print after any edit.

export interface PrintLink {
  /** lead-in label, e.g. "Interactive case study:" */
  label: string;
  /** visible URL text (kept short and readable) */
  text: string;
  href: string;
}

export interface PrintEntry {
  org: string;
  /** role / descriptor shown after the org name */
  pos?: string;
  dates: string;
  bullets: string[];
  link?: PrintLink;
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
  /** joined with " · " in one line; URLs auto-linked by the component */
  contact: string[];
  summary: string;
  builds: PrintEntry[];
  experience: PrintEntry[];
  education: PrintSchool[];
  /** each row of the skills block is a list of labeled groups */
  skillRows: PrintSkillGroup[][];
  /** trailing one-liner; supports <em> via the component */
  outside: string;
}

export const printContent: PrintResumeContent = {
  name: "Jonathan Tollefson",
  title: "Design Engineer",
  contact: [
    "jtollefson123@gmail.com",
    "(614) 403-4845",
    "uxjon.com",
    "linkedin.com/in/jtollefson123",
    "Minneapolis, MN",
  ],
  summary:
    "Design engineer working the seam between interface design, front-end, and applied AI. " +
    "Sole designer, builder, and shipper of an agentic audio-mastering system, and of the blind evaluation harness that gates it, " +
    "built after hitting the known failure mode of these systems: the evaluator, not the model, sets the ceiling on quality. " +
    "Before that, enterprise AI at a Fortune 500 cooperative, a B2B SaaS AI platform, and a bilingual banking launch that cut onboarding bounce from 40% to 25%, designing with engineers rather than handing off.",
  builds: [
    {
      org: "Finishable — the Engineer",
      pos: "AI mastering agent",
      dates: "2026 – Present",
      bullets: [
        "Built an AI mastering system that works as an agent, not a button: it takes actions and carries state across a multi-step run, rendering several masters, running a blind, loudness-matched A/B (ITU-R BS.1770, true-peak controlled), and composing a final master from the strongest takes.",
        "Built an active-learning model of my own taste, then shelved it: blind A/B results showed it overfitting a biased evaluator, the known reward-model overoptimization failure.",
        "Moved the work into the judge instead: a blind, loudness-matched harness that gates every change against a baseline of doing nothing. Single-rater so far; a multi-rater blind run is the next gate.",
        "Designed and shipped end to end, no handoffs: Astro, React, TypeScript, Python, FastAPI.",
      ],
      link: {
        label: "Interactive case study:",
        text: "uxjon.com/case-studies/the-console",
        href: "https://uxjon.com/case-studies/the-console",
      },
    },
    {
      org: "Finishable — the Catalog",
      pos: "audio catalog and search",
      dates: "2026 – Present",
      bullets: [
        "Built a searchable catalog of roughly 20,000 audio files, read by sound, fingerprinted, deduplicated, and auto-classified through a Whisper, Claude, and librosa pipeline. Sole engineer across ingestion, classification, and interface.",
      ],
    },
    {
      org: "SIGNAL",
      pos: "browser instrument",
      dates: "2026 – Present",
      bullets: [
        "Built a playable instrument that runs in a browser tab: Web Audio synthesis, sequencing, and a performance layer, with the sound engine and the interface designed as one system. It lives on my homepage; press power.",
      ],
      link: {
        label: "Play it:",
        text: "uxjon.com/#play",
        href: "https://uxjon.com/#play",
      },
    },
  ],
  experience: [
    {
      org: "CHS Inc.",
      pos: "Business Analyst, AI & BI Engineering",
      dates: "Aug 2023 – Present",
      bullets: [
        "Designed and prototyped interfaces for enterprise AI and BI products at a Fortune 500 agricultural cooperative, embedded with engineering on consumer agri-tech tools and internal AI tooling.",
        "Designed a FigJam-based documentation and alignment system adopted as the cross-team default across product, engineering, and business.",
        "Built and shipped a Python tool that parses the dbt manifest and fans model lineage into Excel, Power BI, and stakeholder briefs in one pass; owned it end to end for business users, engineers, and the AI team.",
      ],
    },
    {
      org: "Raylu, Inc.",
      pos: "Product Designer (Freelance)",
      dates: "Apr – Oct 2023",
      bullets: [
        "Designed the interface, component set, and interaction model for a B2B SaaS AI chat platform, specified so the patterns mapped 1:1 to the React implementation.",
        "Ran the roadmap for a distributed team shipping prototype releases on a tight cycle.",
      ],
    },
    {
      org: "Crediverso",
      pos: "UX Design Lead",
      dates: "Feb 2021 – Jan 2023",
      bullets: [
        "Designed the primitives, patterns, and onboarding flows for a bilingual mobile banking V1, shipped on iOS.",
        "Ran usability testing with 50+ participants; the iterated primary flow cut bounce from 40% to 25%.",
        "Grew the pre-launch channel from 700 to 2,100 followers on A/B-tested messaging.",
      ],
    },
  ],
  education: [
    {
      name: "Harvard University",
      dates: "2022",
      degree: "A.B., Sociology",
      honors: "Dean's List (6×) · Rosenkrantz Discovery Grant",
    },
    {
      name: "University of Minnesota",
      dates: "2016 – 2018",
      degree: "Product Design, Business Marketing Education",
    },
  ],
  skillRows: [
    [
      { label: "Build", items: "TypeScript, React, Astro, Python, FastAPI" },
      { label: "Design", items: "Figma, Framer, Adobe Creative Suite" },
    ],
    [
      { label: "Models & Audio", items: "Web Audio API, Claude, Whisper, librosa, demucs" },
      { label: "Data", items: "SQL, dbt, Power BI" },
    ],
  ],
  outside:
    "<em>Diary of a Soundbender</em>, a Substack on sound and product design. Track and field record holder, University of Minnesota.",
};
