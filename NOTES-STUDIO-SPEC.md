# THE STUDIO — homepage rebuild spec (binding). Branch: studio-desk. NEVER merge to main (Vercel prod).

## Concept (Jon's words)
The homepage is a place, not a page: a wooden desk with sharpie drawings, in a sunlit room with
the coolest audio tech in the world. Straight-down view of a real wood desk; Jon's name etched
into the desk (Jon authors that asset). Navigation is ART, not menus — cropped images, real art
assets, organic artifacts; an object's real-world affordance is the signifier (a synth obviously
plays; headphones obviously mean listen). No stock UI. It must feel easy to navigate while
breaking hierarchical rules. Voice everywhere: plain, understated (feedback_application_voice).

## The 5 desk objects = the navigation (all visible in ONE view, no scroll)
1. WORK — opens résumé + about + the 5 case studies. 2. SIGNAL — the playable instrument.
3. SOUND LAB — listening room for finished tracks. 4. WRITING — Diary of a Soundbender.
5. ILLUSTRATIONS — a gallery.

## Behavior
- Hover WAKES an object (hints at what's inside, no text). Click opens it IN PLACE on the desk
  (you stay in the room); a CASE STUDY is the one thing that opens its full dark page then returns.
- Two temperatures: design objects warm/at rest; sound objects (Signal, Sound Lab) high-tech —
  opening one DIMS the whole desk and the gear lights up. Design objects don't dim.

## LOCKED DECISIONS (Jon, 2026-07-14 — do not re-open)
D1 MOBILE = recomposed desk: same room/art, portrait recomposition to a narrower desk crop, still
   one view. Two compositions (landscape/portrait), not two designs.
D2 SIGNAL = dim-then-NAVIGATE to the existing instrument page unchanged. No homepage embed, ever,
   in this wave. Same rule for anything heavy: the desk never hosts an audio engine.
D3 WAKE = ONE asset per object + a build-side treatment (light/lift/shadow/subtle motion,
   transform+opacity only). Placeholder-driven until Jon's art lands.
D4 ROOMS v1 = simple: Work room fully real (bio rewritten plain + résumé link + 5 case-study
   links); Sound Lab = clean track list w/ inline players off a manifest Jon can fill; Writing =
   Substack links/embeds; Illustrations = simple grid off a manifest. Experiential rooms = later.

## Hard boundaries
- The SignalMachine instrument page + all case-study pages stay EXACTLY as they are.
- The comet-scroll homepage intro is RETIRED. Its load-bearing content must be dispositioned
  explicitly (AboutSignal choreography, #work selector, bio): state where each goes (Work room /
  cut / archived in git) — nothing silently vanishes.
- Title/meta/OG cards must not regress.

## Guardrails
- ACCESSIBILITY: every object = a real link/control, full keyboard path, visible focus, a plain
  text index + skip link; a recruiter reaches flagship + résumé + instrument in ONE click from
  arrival. Contact in the footer.
- PERF BUDGET (the comet died laggy — no successor): no scroll-jack, no rAF/canvas loops at rest,
  wake/dim = transform+opacity only, LCP < 2.0s on a 4x-CPU-throttled headless run, 60fps during
  hover/dim, image weight budget stated and held.
- ASSET PROTOCOL: build against dimensioned NEUTRAL placeholder silhouettes (correct footprint,
  no invented art style). Deliver an ASSET SPEC SHEET: per object + desk surface + etched name —
  canvas size @2x, format (PNG/WebP alpha), one shared lighting direction, shadow/safe-area
  rules, exact repo drop path so each real asset slots in with ZERO code changes.

## Required reading (memories at ~/.claude/projects/-Users-tolo/memory/<name>.md)
portfolio_studio_reapproach (you are EXECUTING this living plan) · portfolio_homepage_signal
(REJECTED-directions list — never re-propose; outgoing-homepage invariants) · jt_portfolio_kb ·
portfolio_deploy_model (main = prod!) · feedback_astro_gotchas (4 repo foot-guns) ·
feedback_application_voice · feedback_no_ui_text_crutch · reference_preview_stale_screenshots +
feedback_module_visual_qa (QA = real pixels via headless Chrome/puppeteer-core, both
orientations, below-fold) · figma_svg_authoring + portfolio_cover_pipeline (Jon's asset paths).
Plus: ~/career-strategy/portfolio-experience-outline.md and portfolio-build-plan.md.

## Division of labor
Jon authors: desk surface, etched name, each object's art (media per object, his call).
The build owns: structure, interactions, rooms, motion, recomposition, a11y, perf, staging,
placeholders, the asset spec sheet.
