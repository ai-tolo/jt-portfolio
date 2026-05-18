# uxjon.com

Source for [uxjon.com](https://uxjon.com). A site built to demonstrate the
system that built it.

## Stack

- **Astro v6**, TypeScript strict
- **Notion** as the content layer (Case Studies + Resumes databases)
- **Vercel** for deploy and SSL
- **Geist Variable**, self-hosted via Fontsource
- **CSS custom properties** for four chromatic themes (Carbon, Powder,
  Field, Honey). Press `T` to cycle.

## How it works

Case studies and resumes live as Notion database rows. The build queries
them at compile time, downloads any Notion-hosted images locally so URLs
don't expire, and renders Notion's block tree as editorial prose. A new
tailored resume variant is one new database row; the route auto-generates
on next deploy.

More architecture detail on the [colophon](https://uxjon.com/colophon).

## Local dev

```sh
npm install
cp .env.example .env   # fill in NOTION_TOKEN
npm run dev            # → http://localhost:4321
```

The dev server auto-runs `scripts/sync-notion-images.mjs`, which mirrors
Notion-hosted images into `/public/case-studies/[slug]/` so URLs don't
expire between builds.

```sh
npm run build          # → /dist
npm run preview        # serve /dist locally
```

## Environment

`NOTION_TOKEN` — internal integration token from Notion. Required.

`CONSOLE_API_KEY` and `CONSOLE_API_BASE` — auth for the M1 brain that
powers the Portal. Without them the Portal pages render but engine calls
401 or 502. If you rotate either, **restart `npm run dev`**: Astro reads
`.env` at process start and a long-running dev server keeps sending the
stale value silently.

Source-database IDs are constants in `src/lib/notion.ts` and
`src/lib/resumes.ts`; swap them when forking against your own Notion
workspace.

## Portal · Buckets tab (M3 scaffold)

New triage surface at `/portal/buckets/[bucket]` (Inbox / Voice Memos /
Loops / Songs / Trash). `/portal/buckets` redirects to
`/portal/buckets/inbox`. Keyboard-first: arrow keys move focus between
cards; **V / L / S / X** assign the focused card to a bucket; **0–3**
sets quality stars; **Space** auditions; **Enter** confirms; **Esc**
blurs. The full keymap is documented in the page's collapsible legend.

The surface ships against mocked data while the M1 engine builds out the
matching `bucket`, `quality_star`, `waveform_path`, and `parent_id`
columns (Task A) plus the HTTP endpoints (Task E). When the engine is
ready, swap two places:

- **`src/lib/buckets-mock-data.ts`** — the fixture; delete the file
  after wiring.
- **`src/lib/console-api.ts`** — the five `// MOCK:` blocks
  (`getBucketsList`, `setBucket`, `setQualityStar`, `getLineage`,
  `revealInFinder`). Each comment names the engine endpoint it will
  call. The API route stubs in `src/pages/api/console/buckets-*.ts`
  already forward through these functions, so they need no change.

Existing Portal tabs (Library, Workbench, Diary, Surprise) are
untouched; the only shared edits are additive entries in `TabStrip` and
the `current` union in `PortalLayout`.
