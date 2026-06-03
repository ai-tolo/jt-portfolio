# Build 2 — Production deploy setup

Two halves: (1) the M1 side (Tailscale Funnel + auth key gate), (2) the Vercel side (env vars).

The shared API key for this session is:

```
__CONSOLE_API_KEY_REDACTED__
```

The same value must end up in three places: the M1 launchd plist, Vercel env vars, and the local `.env` (already added).

---

## A. M1 side

Open Terminal on the M1 and paste this single block. It:
1. Writes a new auth-middleware file alongside `server.py`
2. Wires it into `server.py` (idempotent, inserts before `if __name__` if present, else appends)
3. Adds `CONSOLE_API_KEY` to the launchd plist
4. Restarts the agent
5. Verifies the auth gate (without key → 401; with key → 200)
6. Enables Tailscale Funnel on port 8765 and prints the public URL

```bash
set -e
cd /Users/jontollefson/automation/api

API_KEY="__CONSOLE_API_KEY_REDACTED__"

# 1. Write the auth middleware
cat > auth_middleware.py <<'PYTHON_EOF'
"""API key gate for The Console — Build 2 production deploy.
Rejects requests without `Authorization: Bearer <CONSOLE_API_KEY>`.
Exempts /docs, /redoc, /openapi.json so the schema browser still works."""

import os
import secrets
from fastapi import Request
from fastapi.responses import JSONResponse

EXEMPT_PATHS = {"/docs", "/redoc", "/openapi.json"}


async def require_api_key(request: Request, call_next):
    if request.url.path in EXEMPT_PATHS:
        return await call_next(request)

    expected = os.environ.get("CONSOLE_API_KEY", "")
    if not expected:
        return JSONResponse(
            {"error": "server misconfigured: no api key set"},
            status_code=500,
        )

    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "missing auth"}, status_code=401)

    token = auth[7:]
    if not secrets.compare_digest(token, expected):
        return JSONResponse({"error": "invalid auth"}, status_code=401)

    return await call_next(request)
PYTHON_EOF

# 2. Wire into server.py — idempotent
if grep -q "auth_middleware" server.py; then
  echo "  server.py already wired."
else
  awk '
    BEGIN { inserted = 0 }
    /^if __name__/ && !inserted {
      print "from .auth_middleware import require_api_key"
      print "app.middleware(\"http\")(require_api_key)"
      print ""
      inserted = 1
    }
    { print }
    END {
      if (!inserted) {
        print ""
        print "from .auth_middleware import require_api_key"
        print "app.middleware(\"http\")(require_api_key)"
      }
    }
  ' server.py > server.py.tmp && mv server.py.tmp server.py
  echo "  wired auth middleware into server.py"
fi

# 3. Add CONSOLE_API_KEY to the launchd plist
PLIST=~/Library/LaunchAgents/com.jont.console-api.plist
plutil -remove EnvironmentVariables.CONSOLE_API_KEY "$PLIST" 2>/dev/null || true
plutil -insert EnvironmentVariables.CONSOLE_API_KEY -string "$API_KEY" "$PLIST"
echo "  added CONSOLE_API_KEY to $PLIST"

# 4. Restart agent and let it pick up the new env var
#    launchctl unload + load is required for plist env var changes (kickstart alone doesn't reload env)
launchctl unload "$PLIST"
launchctl load "$PLIST"
sleep 4

# 5. Verify
echo ""
echo "=== Verify auth gate ==="
echo -n "without auth → "
curl -s -o /dev/null -w "HTTP %{http_code} (expect 401)\n" --max-time 5 http://localhost:8765/health
echo -n "with auth   → "
curl -s -o /dev/null -w "HTTP %{http_code} (expect 200)\n" --max-time 5 -H "Authorization: Bearer $API_KEY" http://localhost:8765/health

# 6. Enable Tailscale Funnel
echo ""
echo "=== Enable Tailscale Funnel on port 8765 ==="
echo "If this is your first time using Funnel, you may need to enable it in the Tailscale admin console:"
echo "  https://login.tailscale.com/admin/acls/file → add \"nodeAttrs\": [{\"target\": [\"*\"], \"attr\": [\"funnel\"]}]"
echo ""
tailscale funnel --bg 8765 2>&1 || true
sleep 2
echo ""
echo "=== Funnel status ==="
tailscale funnel status
echo ""
echo "Copy the https://...ts.net URL above. That's CONSOLE_API_BASE for Vercel."
```

After this runs, you should see:
- `without auth → HTTP 401`
- `with auth   → HTTP 200`
- A funnel URL like `https://macbook-pro-tolo.tailXXXXX.ts.net/`

Paste that funnel URL back to me — that's what Vercel's `CONSOLE_API_BASE` needs to be.

If you hit the "first time using Funnel" message:
1. Open https://login.tailscale.com/admin/acls/file
2. Add this to your `nodeAttrs` section (or create one):
   ```json
   "nodeAttrs": [{"target": ["*"], "attr": ["funnel"]}]
   ```
3. Save, then re-run the `tailscale funnel --bg 8765` command in Terminal.

---

## B. Vercel side (do after part A confirms)

Open your Vercel project: https://vercel.com/tolo-ai/jt-portfolio/settings/environment-variables

Add these four, checked for **Production**, **Preview**, and **Development**:

| Name | Value |
|------|-------|
| `CONSOLE_API_BASE` | the Funnel URL from part A (e.g. `https://macbook-pro-tolo.tailXXXXX.ts.net`) |
| `CONSOLE_PASSWORD` | whatever password you want for the Portal (not `dev`) |
| `CONSOLE_SESSION_SECRET` | a fresh value: run `openssl rand -hex 32` once and paste |
| `CONSOLE_API_KEY` | `__CONSOLE_API_KEY_REDACTED__` |

---

## C. Deploy

```bash
cd ~/sites/jt-portfolio
publish
```

Wait for the Vercel build to finish (~60s, watch the deploy in the Vercel dashboard if you want), then:

1. Open https://uxjon.com in a private window (so no cached session).
2. Type `console` while on the home page — `→ PORTAL` badge appears.
3. Click it, enter the Vercel-side `CONSOLE_PASSWORD`.
4. Confirm: Surprise tab, Library search, Listening Room audio playback all work from a fully cold session.

From your phone over cell (off your Tailnet) — should work identically.
