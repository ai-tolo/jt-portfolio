# Lessons

Living log of things worth remembering while building uxjon.com. Append, don't rewrite.

---

## 2026-05-15 — Deploy strategy: Tailscale Funnel + shared API key

Vercel serverless functions aren't on the Tailnet by default. Two ways to bridge:
- **Tailscale Funnel** — exposes the M1 API at a public HTTPS URL on `*.ts.net`. Free on all Tailscale plans, fast setup, but the URL is public. Mitigated with a shared API key gate (M1 rejects requests without `Authorization: Bearer <CONSOLE_API_KEY>`). The Funnel URL alone is useless without the key.
- **Vercel-Tailscale connector** (beta) — keeps M1 fully private, no public URL. Requires Vercel team enrollment.

Picked Funnel + API key for shipping speed. Setup in `tasks/m1-deploy-build2.md`. Rotate the key by editing both the M1 plist and the Vercel env var — sessions stay valid (only `CONSOLE_SESSION_SECRET` rotation forces re-login).

If the project ever serves more than one user or starts handling write operations, revisit and switch to Vercel-Tailscale.

---

## 2026-05-15 — macOS TCC blocks launchd-spawned Python from reading Voice Memos

The Engine's FastAPI runs under launchd (`com.jont.console-api`). Build 1 worked because all its endpoints read from a SQLite catalog DB (which lives outside TCC-protected paths). Build 2's new `/file` endpoint actually opens the source files to stream — and that's where it hit a wall.

Voice Memos data lives at `~/Library/Group Containers/group.com.apple.VoiceMemos.shared/`. macOS TCC protects it. Terminal.app has Full Disk Access (Jon granted it long ago), so when Python is launched from Terminal it inherits that grant. But launchd-spawned processes don't get Terminal's TCC profile — they get launchd's, which has no TCC grants by default.

**Symptom**: `/file` returned 200 with the right `Content-Length`, but zero body bytes streamed. Curl reported `transfer closed with N bytes remaining to read`. Server error log showed `PermissionError: [Errno 1] Operation not permitted` on `path.open("rb")`.

**Fix**: System Settings → Privacy & Security → Full Disk Access → add `/Users/jontollefson/automation/venv/bin/python`. Then `launchctl kickstart -k gui/$(id -u)/com.jont.console-api` to bounce the agent.

**Will hit again** when the Engine starts ingesting other TCC-protected sources:
- Photos library (`~/Pictures/Photos Library.photoslibrary`)
- Mail, Messages, Calendar attachments
- Anything synced via iCloud Drive into other apps' Group Containers

Granting FDA once to the venv Python covers all of these.

---

## 2026-05-15 — Vercel env vars for The Console (Build 2)

Three env vars need to be set in **Vercel project → Settings → Environment Variables** (Production / Preview / Development all checked) before The Console is usable in production:

1. `CONSOLE_API_BASE` — `http://macbook-pro-tolo:8765`
   - Tailscale hostname for the M1 brain. Vercel functions reach this if Vercel is on the same Tailnet (Vercel "Connectivity" beta) OR if the M1 exposes a public URL via Tailscale Funnel.
   - **Open question for Jon**: confirm Vercel can route to Tailscale, or set up Funnel. Until this is sorted, the Portal works on `npm run dev` from the M3 but not on the deployed Vercel build.

2. `CONSOLE_PASSWORD` — Jon's chosen password.
   - Local `.env` uses `dev` as a placeholder. Vercel must have the real one.

3. `CONSOLE_SESSION_SECRET` — fresh random secret. Generate with:
   ```
   openssl rand -hex 32
   ```
   - **Different value in Vercel than in local `.env`.** This isolates dev cookies from prod cookies; if local gets compromised, prod sessions stay safe.

Rotating `CONSOLE_SESSION_SECRET` invalidates every existing session and forces a re-login. Useful if anything leaks.

---
