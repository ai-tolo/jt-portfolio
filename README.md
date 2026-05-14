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

Source-database IDs are constants in `src/lib/notion.ts` and
`src/lib/resumes.ts`; swap them when forking against your own Notion
workspace.
