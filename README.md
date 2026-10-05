<!-- DRAFT (2026-10-05): written for Jon to rewrite in his own words. Facts checked against the repo; the voice is a draft. -->

# uxjon.com

The source for [uxjon.com](https://www.uxjon.com): my site, and the way I make things now.

## How the site is made

I design in Figma, then I build with Claude Code as the pair, with a live preview open the whole time. The commit log is the record of that: every round is one thing I asked for, built, verified, and put under my hands before the next.

**Render before build.** When a change is a matter of taste, I don't argue about it in prose. The directions get written as real code on a dev switch, rendered headless as contact sheets, judged, and I pick at the pad. Then the pick gets built for real and the others are deleted. The homepage ledger, the cassette player, the résumé's index tabs and the instrument's head all went this way.

**Verify behind the ship, never in front.** Every round ends with something touchable; verification rides behind it: a build gate (the exit code, nothing else), headless Chrome at 375 and 1440 in day and night, `scrollWidth <= viewport`, zero console errors, and for the instrument a three-browser gate that plays it and listens. Screenshots get looked at, not just measured.

**Working rules live in the repo.** `CLAUDE.md` is the contract every session follows: the branch and deploy model, the sacred files, the copy laws, the verification norms. It gets rewritten when a law changes, so a fresh session can start cold.

## What's in here

- **Astro 6**, output `server`, the Vercel adapter. Every page prerenders to static HTML; the one on-demand route is `src/pages/api/intake.ts`.
- **The homepage** (`src/components/studio/StudioOne.astro`): four rooms, each its own viewport. WORK holds two objects I designed in Claude Design and installed as components: the watch (`IntakeHero.astro`) and the phone (`ArchiveHero.astro`). LOOK is the pictures. LISTEN is the cassette. PLAY is the instrument.
- **The instrument** (`src/components/signal/Signal.astro` + `src/signal/*`): drums, a 303-style bass and a keyboard voiced with rips of my own synths, all Web Audio in the page. A lookahead scheduler books every hit ahead of the audio clock; effects run as audio worklets; one exit node with a limiter and a soft clamp. A worklet on that exit keeps the last five minutes of what you play, and **export** prints it as a 16-bit WAV named for the day, the key and the tempo. Its contract is `src/signal/types.ts`; the code map is `docs/signal-map/`; the gate is `scripts/signal/gate.mjs`.
- **Intake, live** (`src/pages/api/intake.ts`, `src/lib/intake-*.ts`): the watch on the homepage can take your own words. Your browser's speech service does the transcription; one serverless function sends the transcript to Claude with the same three-fates prompt my real Intake runs (execute, surface, store), validates the JSON, and hands back tickets. If the function is unreachable or has no key, a rule-based parse in your browser does the triage and says so with a chip. Nothing is stored; nothing is logged.
- **The résumé** (`src/pages/resume/`, `src/lib/resume-print.ts`): one annotated sheet, one source of prose, a one-page PDF regenerated from it. Its proof numbers come from a dated ledger snapshot, never typed by hand.
- **The case studies** (`src/pages/case-studies/`): CHS, Crediverso, Raylu, and Finishable, each built on shared primitives with live objects you can put your hands on.

## What is real and what is art

The systems are real: Intake runs on a Mac that never sleeps and transcribes my voice memos with Whisper; AudioDex is a catalogue of every recording I've made; the instrument is cut from the studio I play at my desk. The **examples** on the site are art. The watch's replay, the phone's search, the case-study demos are invented, universal examples that carry the story, never my own diary. The engineering facts under each object (the tools, the stages, the numbers) are true or absent. What a visitor makes on the site (their transcript, their tickets, their song) is theirs alone and is not kept.

## Working on it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # the gate: judge the exit code only
```

Branches are worktrees; `main` is production and deploys on push. The instrument's assets under `public/s/<8hex>/` ship immutable: a re-encode is a new folder, never a change in place.

`ANTHROPIC_API_KEY` (a Vercel environment variable, and `.env` locally) powers the Intake function. Without it the demo runs on the local parse.
