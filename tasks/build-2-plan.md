# Build 2 — The Portal — Plan

Status: drafted 2026-05-15. **Awaiting Jon's "execute" before any code changes.**

---

## 0. Orientation findings

- **M1 API reachable.** `curl http://macbook-pro-tolo:8765/health` → `{"ok":true,"assets":212}`.
- **Catalog today**: 212 voice memos, 210 transcribed, 0 audio-analyzed, 0 visual-analyzed, 0 .als projects. Both inboxes empty. `/surprise` currently returns `items: []` (no audio/visual analysis yet means no signals to surface).
- **/search shape**: `{query, results: [{path, category, filename, modified, summary, tags, bpm, key, content_type}]}`. Supports `?q=` and `?limit=`. (Need to confirm `?offset=` / category filter — see § 9.)
- **Repo is fully static today.** Astro v6, no adapter, no SSR. Public site = prerendered HTML. Vercel deploys from `git push main` via the `publish` zsh function.
- **No `tasks/` or `docs/` dirs yet.** Will create as needed.

Implications:
1. Adding auth + cookies + middleware + API proxy requires switching Astro to `output: 'server'` and installing `@astrojs/vercel`. Public pages stay prerendered via `export const prerender = true` so the public site UX is unchanged.
2. The M1 API currently has no file-stream endpoint. The Portal's listening room and image display need one. Scoped proposal in § 7.
3. Many tabs will render mostly-empty until Build 5 (Backfill) and audio/visual analysis fill the catalog. Empty states are first-class, not afterthoughts.

---

## 1. Private route path

**Confirmed (2026-05-15): `/portal`** (login at `/portal/login`, sub-routes `/portal/listen`, etc.)

Why not `/_console`: Astro excludes any page file or directory whose name starts with `_` from the route tree. `src/pages/_console/index.astro` wouldn't be reachable, and underscore-prefixed API routes (`src/pages/api/_console/...`) likewise wouldn't route. Path obscurity is cosmetic when auth is the real gate. `/portal` matches the build name in the Notion spec ("Build 2 — The Portal") and reads cleanly.

Indexing: add `<meta name="robots" content="noindex,nofollow">` to the Portal layout. Also add `Disallow: /portal` to `public/robots.txt` (creating that file).

API namespace: `/api/console/*` (asset proxy, surprise, search, projects, inbox, etc.) — underscore-prefix restriction applies to dir names, so `api/console/` is the cleanest fit.

---

## 2. Auth wiring

### Environment variables (Vercel + local `.env`)

- `CONSOLE_PASSWORD` — shared password (Jon sets in Vercel; `.env` for local dev). Compared in constant time.
- `CONSOLE_SESSION_SECRET` — 32+ random bytes for HMAC. Jon generates with `openssl rand -hex 32`. Never commit.
- `CONSOLE_API_BASE` — `http://macbook-pro-tolo:8765` for now. (Tailscale-only; never exposed to the browser.)

All three added to `.env.example` (with empty values + comments) and Vercel project env vars.

### Cookie

- Name: `portal_session`
- httpOnly, secure (in production), sameSite=Lax, path=`/`
- Value: base64url(`{exp: <unix-ms>, iat: <unix-ms>}`) + `.` + base64url(HMAC-SHA256 over the payload with `CONSOLE_SESSION_SECRET`)
- 30-day sliding window: every gated request that lands inside an unexpired cookie reissues a fresh cookie with `exp = now + 30d`. Cookie that's past `exp` is rejected and the user redirected to `/portal/login`.

### Login flow

- `GET /portal/login` — simple form (password field, submit). If already authenticated, redirect to `/portal`.
- `POST /api/console/login` — Astro API route. Constant-time compare against `CONSOLE_PASSWORD`. On match, set cookie + redirect to `?next=` (defaulting to `/portal`). On miss, redirect back to login with `?error=1`. Includes a small `Retry-After` header on repeat fails to slow brute force; in-memory IP throttle (fine for a single Vercel function instance; if a second instance spins up, worst case is doubled attempts/sec which is still fine for a single-user gate).
- `POST /api/console/logout` — clear cookie, redirect home.

### Middleware

`src/middleware.ts` (new):
- If path starts with `/portal/login` or `/api/console/login` → pass through.
- If path starts with `/portal` or `/api/console/` → require valid cookie. Reissue if valid. On miss/invalid: pages redirect to `/portal/login?next=<path>`, API routes return `401 {error:"unauthorized"}`.
- Everything else → pass through (and these are prerendered anyway).

### Switching Astro to server mode

- Install: `npm i @astrojs/vercel`
- `astro.config.mjs`: add `output: 'server'`, `adapter: vercel()`, keep `site: 'https://uxjon.com'`.
- Add `export const prerender = true` to existing public pages: `index.astro`, `colophon.astro`, `case-studies/[slug].astro`, `resume/index.astro`, `resume/[slug].astro`. They render at build like today.
- The Portal pages and API routes default to server-rendered (no `prerender` export).

Verification gate: after switching, run `npm run build` and confirm public routes still emit static HTML in `dist/`, then `npm run dev` and visit `/` to confirm zero visual change.

### Hidden trigger on the public site

Two options, ranked:

**Confirmed (2026-05-15)**: keyboard sequence on the home page. Word: **`console`**.

Reason `console` rather than `portal`: the existing `T` shortcut cycles themes on any bare keydown, and `portal` contains a `t` that would fire a theme cycle mid-typing. `console` has no `t` and reads cleanly with the build's project name ("The Console"). A small badge appears in the home page corner once the sequence matches, with a single link "→ portal/login". The trigger does *not* gate access — it's just a UX hint so Jon doesn't have to type the URL. The real gate is the password.

---

## 3. API client shape

`src/lib/console-api.ts` (new) — server-side helper module used only inside `/api/console/*` routes and Portal pages' frontmatter (never imported into client bundles).

```ts
const BASE = import.meta.env.CONSOLE_API_BASE ?? 'http://macbook-pro-tolo:8765';

export async function health() { /* GET /health */ }
export async function stats() { /* GET /stats */ }
export async function search(q: string, opts?: { limit?: number; offset?: number }) { /* GET /search?q=... */ }
export async function surprise() { /* GET /surprise */ }
export async function projects() { /* GET /projects */ }
export async function inboxAuto() { /* GET /inbox/auto */ }
export async function inboxCurated() { /* GET /inbox/curated */ }
export async function assetByPath(path: string) { /* GET /assets/by-path?path=... */ }
export function streamAsset(path: string): Promise<Response> { /* GET /file?path=... — see § 7 */ }
```

- All functions take an `AbortSignal` second arg for request cancellation.
- 5-second default timeout; failures surface as typed errors `{kind: 'unreachable' | 'http' | 'parse', status?: number}`.
- TypeScript interfaces for response shapes live alongside in `src/lib/console-types.ts`.

Why server-side only: the browser must never see the Tailscale hostname or M1 paths. All browser fetches go to `/api/console/*`, which call this module.

---

## 4. Each tab's component tree

### Shell

- `src/layouts/PortalLayout.astro` — minimal HTML shell. Reuses Geist + tokens but **no Cursor**, **no public Header/Footer**. Custom slim header with tab strip + logout button. `noindex,nofollow` meta.
- `src/components/portal/TabStrip.astro` — four tabs (Surprise · Library · Projects · Workbench) + a fifth "Listening room" link styled distinctly. Active tab highlighted by current path.
- `src/components/portal/Card.astro` — generic card wrapper used by every tab. Variants for audio / photo / als / voice-memo.
- `src/components/portal/EmptyState.astro` — used when an endpoint returns `items: []`. Shows the catalog stats so Jon can see why ("0 audio-analyzed of 212 total; surprise picker activates once analysis runs").

### `/portal` (Surprise)

- `src/pages/portal/index.astro` — fetches `/surprise` server-side on each request.
- Card stream: each card shows summary, tags, modified date, and a **Why this surfaced** row pulling from the surprise reason field. (If reason field is not yet in the response, displays "—" and we add it as a tiny request to Build 1 — flagged below.)
- Refresh button calls `/api/console/surprise` client-side and replaces the card list.
- Each card has a "+ Queue" button → adds to Workbench localStorage queue.

### `/portal/library` (Library)

- Search input bound to `?q=<query>` query param (URL-driven so state survives reloads).
- Filter chips: `all · audio · photo · als` — client-side filter by `category`.
- Result list rendered as `Card` instances.
- Pagination: **Load more** button. Each click bumps `limit` by 25 and re-fetches. Simpler than infinite scroll, no scroll-position bugs, easy to test.
- Empty query state: shows `/stats` so Jon sees the catalog size + analysis coverage.

### `/portal/projects` (Projects)

- Lists `/projects` server-side.
- Each project card: name, path, tempo / scenes / tracks / samples metadata (whatever Build 1 returns).
- "+ Queue" adds the project's brief to Workbench.
- Empty state until Build 5 runs: explanatory text "0 .als projects indexed."

### `/portal/workbench` (Workbench, view-only)

- Reads queue from localStorage (`portal:queue`, JSON array of `{path, addedAt, source}`).
- Renders queue as cards with a `Remove` button per item.
- Five stub buttons per card (matching the v1 actions from the Notion spec):
  - Drop into new project
  - Add to existing project
  - Separate stems
  - Open with brief
  - Send private preview
- All five `disabled` with `title="Coming in Build 3"` tooltip. The buttons exist so the layout is real and Build 3 lights them up without rework.
- "Send selection to Listening room" CTA at the top of the list.

### `/portal/listen` (Listening room)

- Pulls a queue either from Workbench localStorage (`?from=workbench`) or a fresh curated `/surprise` sequence (`?from=surprise`, default).
- Single focused viewer:
  - **Audio**: `<audio>` element streamed from `/api/console/asset?path=<encoded>`. Shows waveform-shaped progress bar (CSS), title, summary, key/BPM.
  - **Photo**: `<img>` from same proxy. Captioned with filename + summary.
  - **.als**: metadata card only (tempo, scenes, tracks, samples list). No playback in Build 2.
- Keyboard: `Space` = play/pause (audio only), `←` = prev, `→` = next, `Esc` = back to source tab.
- Visible controls below: prev / play-pause / next / queue indicator (`3 / 7`).
- Mobile: not optimized. Doesn't break, but no thumb-zone tuning. (Per spec: "don't break mobile, don't optimize.")

---

## 5. Listening room interaction model

- Queue is in-memory while on `/portal/listen`. The page accepts `?from=workbench` or `?from=surprise` and snapshots the source list on mount.
- A small "Now playing" footer fixed to bottom shows title + position; rest of viewport is the visual surface.
- `<audio>` autoplay attempted only after the first user interaction (most browsers block autoplay otherwise). If blocked, the play button waits.
- Pre-fetch the next item's metadata (not file bytes — too aggressive over Tailscale) on each item change to make `→` snappy.
- No "save to inbox-curated" yet; that's a write to M1 and Build 2 is read-only.

---

## 6. Asset proxy approach

**Astro API route**: `src/pages/api/console/asset.ts`

- Method: GET.
- Query: `?path=<absolute-path>` (URL-encoded). The Portal never constructs this client-side from scratch — it uses the `path` returned by `/search`, `/surprise`, etc.
- Middleware enforces session cookie.
- Handler:
  1. Validate cookie (middleware already did, but defense-in-depth).
  2. Look up the path in the M1 catalog by hitting `/assets/by-path?path=<...>` first. If 404, return 404 to the client. This ensures only catalog-known files are streamable — the browser can't ask for arbitrary filesystem paths.
  3. Forward `Range` header (if any) to the M1 file endpoint (§ 7).
  4. Stream response back. Copy `Content-Type`, `Content-Length`, `Content-Range`, `Accept-Ranges`.
- Cache: `Cache-Control: private, max-age=0, must-revalidate` (private catalog; don't let Vercel edge cache user audio).

The Tailscale URL and absolute filesystem path are never sent to the browser past the initial `path` string (which is opaque — just an identifier). The browser hits Vercel; Vercel hits the M1.

---

## 7. Proposed new M1 endpoint (needs Jon's approval before adding)

Build 1 has no file-stream endpoint. To make audio playback and image display work, the M1 needs ONE new read-only endpoint:

```
GET /file?path=<absolute-path>
```

- Read-only. No write. No upload. No delete.
- Validates: the requested path must exist in the catalog DB (look it up; if not present, return 404). Prevents the endpoint from being used as a general filesystem browser.
- Streams the file with proper `Content-Type` (mime-sniff by extension: `.m4a` → `audio/mp4`, `.wav` → `audio/wav`, `.jpg` → `image/jpeg`, etc.).
- Supports HTTP `Range` requests so the `<audio>` element can seek without re-downloading.
- Returns `404` for any path not in the catalog; `400` for missing/empty `path`; `416` for invalid range.

Scope discipline:
- One handler, ~80–120 lines of Python. No new dependencies.
- Same FastAPI app, same port, same tagging as existing read-only endpoints.
- No new state, no DB writes, no logs of file contents.

**Confirmed (2026-05-15)**: paste-ready snippet at [tasks/m1-file-endpoint.py](tasks/m1-file-endpoint.py). Jon applies it on the M1 separately (one TODO line for him to point at Build 1's existing catalog lookup helper); verification curl commands are in the file's header comment.

---

## 8. Testing approach

Per the spec: "each tab works end-to-end against the live M1 API before moving on."

- Manual smoke per tab via `npm run dev` against the live M1:
  - `/portal/login` — wrong password → error; right password → redirect to `/portal`; cookie present in devtools.
  - `/portal` — Surprise tab renders (cards or empty state).
  - `/portal/library` — search "voice" returns the two known results we probed; filter chips work; Load more bumps results.
  - `/portal/projects` — empty state (until projects exist).
  - `/portal/workbench` — queue add/remove via localStorage; stub buttons disabled.
  - `/portal/listen` — audio plays, keyboard nav works, photo renders, .als shows metadata.
- Auth persistence: reload, close tab and reopen, wait, confirm cookie still works within 30 days.
- Negative: clear cookie in devtools → next nav redirects to login.
- Public site regression: `/`, `/colophon`, `/resume`, `/case-studies/<a-slug>` all still render statically and look unchanged.

No automated test framework introduced. The portfolio has none today and Build 2 is a one-person consumption surface; adding Vitest/Playwright for this scope is the wrong cost/value.

---

## 9. Open questions (carrying as assumptions; revisit if any block work)

1. **Surprise "reason" field**: does `/surprise` return a `reasons` array on each item once populated? Couldn't tell from an empty response. **Assumption**: items will have `reasons: string[]` once analysis runs. If the field is named differently, swap one line in the Surprise card component.
2. **/search pagination**: probably `?limit=` only. **Assumption**: Load more refetches with a larger limit. Cheap given small catalog. If `?offset=` exists later, easy to switch.
3. **Photo / .als support**: voice memos are 100% of the catalog today. **Assumption**: build the UI for all three asset kinds and let image/.als surfaces stay dormant until backfill + analysis lands.

---

## 10. Execution sequence

When Jon says "execute", I'll work through these in order, updating `tasks/build-2-progress.md` after each:

1. Switch Astro to `output: 'server'` + `@astrojs/vercel`, add `prerender = true` to public pages. Verify public site unchanged.
2. Add env vars to `.env` (local) and `.env.example`. Document Vercel-side env setup in `docs/lessons.md` for Jon to apply manually.
3. Build `src/lib/console-api.ts` + types.
4. Build auth: middleware, login page, login/logout API routes, session cookie helpers.
5. Build PortalLayout + TabStrip + Card + EmptyState shells.
6. Build Surprise tab end-to-end.
7. Build Library tab end-to-end.
8. Build Projects tab end-to-end.
9. Build Workbench tab end-to-end (view-only, localStorage queue).
10. Add `/file` endpoint to M1 (only after Jon's approval in § 7). Verify with `curl`.
11. Build asset proxy at `/api/console/asset`.
12. Build Listening room.
13. Hidden trigger on public site.
14. Final regression sweep of public site + full Portal walkthrough.
15. Propose a KB update for Portfolio Build (kb-maintenance skill) so the Notion page documents the new Portal architecture.

No public deploy until Jon explicitly says so — `publish` stays in Jon's hands.

---

## 11. Out of scope (confirmed)

- Writes to M1 catalog
- Notion writes (Jon handles all of those)
- Ableton or filesystem actions (Build 3)
- Public Soundbending portfolio route
- Mobile polish
- Automated tests
- Touching existing public routes' content
