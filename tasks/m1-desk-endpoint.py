"""The Desk endpoints — streamed `claude -p` runs for the content-planning
Tune/Draft loops on jt-portfolio's /portal/desk surface.

This is an ADDITIVE Console engine router. It mirrors the proven
launchd -> `claude -p` -> Max-keychain pattern already used by
transcription/transcribe.py::classify_via_claude_code and the /classify
endpoint: because the engine runs under launchd (com.jont.console-api), the
claude subprocess it spawns CAN read the login keychain. (An SSH-spawned claude
cannot — Apple security-session limit.) The Vercel site reaches these routes
over the Tailscale Funnel with the same CONSOLE_API_KEY bearer the rest of the
Console uses, so no new transport or auth is introduced.

Latency design (the whole point of moving Tune/Draft off "your Mac only"):
  - POST /desk/run starts a background thread that streams claude's output
    (stream-json + partial messages) into an in-memory job and returns a
    job_id immediately.
  - GET /desk/run/{id} returns the growing text so the browser can watch the
    draft / rewrite appear, and so every Vercel function call stays short
    (nothing depends on serverless max-duration).
No DB, no schema changes, no touching any existing endpoint. Jobs are ephemeral
and TTL-reaped. If this module ever fails to import, only /desk/* is affected;
the rest of the Console keeps serving.

Canonical source is version-controlled in the jt-portfolio repo at
tasks/m1-desk-endpoint.py and deployed to ~/automation/api/desk_endpoints.py.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

desk_router = APIRouter()

# ── In-memory job registry ──────────────────────────────────────────────────
_JOBS: dict[str, dict] = {}
_LOCK = threading.Lock()
_JOB_TTL_SEC = 900            # reap finished/abandoned jobs after 15 min
_MAX_WALL_SEC = 180          # hard ceiling on a single claude run
_ALLOWED_MODELS = {"haiku", "sonnet", "opus"}
_MAX_PROMPT = 32_000

CLAUDE_BIN = os.environ.get("CLAUDE_BIN", str(Path.home() / ".local/bin/claude"))

_NOT_LOGGED_IN = re.compile(r"not logged in|please run /login", re.I)
_AUTH_ERR = re.compile(r"not logged in|please run /login|invalid api key|oauth|authentication", re.I)


class RunReq(BaseModel):
    prompt: str
    model: str = "sonnet"
    # opaque tag the caller uses to finalize: "tune-question" | "tune-rewrite" | "draft"
    kind: str = "draft"
    debug: bool = False


def _reap() -> None:
    now = time.time()
    with _LOCK:
        for jid in [j for j, v in _JOBS.items() if now - v["created"] > _JOB_TTL_SEC]:
            _JOBS.pop(jid, None)


def _append(jid: str, text: str) -> None:
    if not text:
        return
    with _LOCK:
        j = _JOBS.get(jid)
        if j is not None:
            j["text"] += text


def _set(jid: str, **kw) -> None:
    with _LOCK:
        j = _JOBS.get(jid)
        if j is not None:
            j.update(kw)


def _classify_error(raw: str, returncode: int) -> str:
    if _AUTH_ERR.search(raw):
        return "claude-not-logged-in"
    tail = ""
    for ln in reversed(raw.strip().splitlines()):
        if ln.strip():
            tail = ln.strip()
            break
    return f"claude-failed (rc={returncode}): {tail[:200]}" if tail else f"claude-failed (rc={returncode})"


def _claude_cmd(prompt: str, model: str, stream: bool) -> list[str]:
    """The lean `claude -p` invocation shared by streamed runs and the warmer.
    Tools off + no MCP + no skills + no session write = minimal startup, pure
    text generation. stream-json (with --verbose) gives token-level deltas."""
    cmd = [
        CLAUDE_BIN, "-p", prompt,
        "--model", model,
        "--strict-mcp-config",       # don't load MCP servers (faster startup)
        "--disable-slash-commands",  # don't scan skills (faster startup)
        "--tools", "",               # pure text generation, no tool schemas to load
        "--no-session-persistence",  # one-shot calls, skip the on-disk session write
    ]
    if stream:
        cmd += ["--output-format", "stream-json", "--include-partial-messages", "--verbose"]
    return cmd


def _run_stream(jid: str, prompt: str, model: str) -> None:
    cmd = _claude_cmd(prompt, model, stream=True)
    env = os.environ.copy()
    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, cwd="/tmp", env=env,
        )
    except Exception as e:  # noqa: BLE001
        _set(jid, status="error", error=f"spawn failed: {e}", done=True)
        return

    # Watchdog: a hung claude must not pin a thread forever.
    watchdog = threading.Timer(_MAX_WALL_SEC, proc.kill)
    watchdog.daemon = True
    watchdog.start()

    raw_lines: list[str] = []
    final_result: Optional[str] = None
    assistant_text: list[str] = []
    saw_delta = False

    try:
        for line in proc.stdout:  # type: ignore[union-attr]
            line = line.rstrip("\n")
            if not line.strip():
                continue
            raw_lines.append(line)
            with _LOCK:
                j = _JOBS.get(jid)
                if j is not None and j.get("debug"):
                    j["raw"].append(line[:2000])
            try:
                evt = json.loads(line)
            except json.JSONDecodeError:
                continue  # non-JSON diagnostic line (stderr merged in) — keep for error classify
            etype = evt.get("type")
            if etype == "stream_event":
                ev = evt.get("event", {})
                if ev.get("type") == "content_block_delta":
                    delta = ev.get("delta", {})
                    if delta.get("type") == "text_delta":
                        saw_delta = True
                        _append(jid, delta.get("text", ""))
            elif etype == "assistant":
                for blk in evt.get("message", {}).get("content", []):
                    if blk.get("type") == "text":
                        assistant_text.append(blk.get("text", ""))
            elif etype == "result":
                if evt.get("subtype") == "success":
                    final_result = evt.get("result")
                elif evt.get("result"):
                    final_result = evt.get("result")
    finally:
        watchdog.cancel()
        try:
            proc.wait(timeout=5)
        except Exception:  # noqa: BLE001
            proc.kill()

    rc = proc.returncode
    killed = rc is not None and rc < 0
    raw = "\n".join(raw_lines)

    # Resolve the authoritative final text. Prefer the explicit result event;
    # else the accumulated deltas (exactly what the user watched stream in, no
    # double-count risk); else a full assistant message as a last resort.
    final = final_result
    if not final and saw_delta:
        with _LOCK:
            final = _JOBS.get(jid, {}).get("text", "")
    if not final and assistant_text:
        final = "".join(assistant_text)

    if final and final.strip() and not _NOT_LOGGED_IN.search(final):
        # Settle live text to the authoritative final (deltas can lag the result).
        _set(jid, text=final, status="done", done=True)
        return

    if killed:
        error = "claude-timeout"
    elif _AUTH_ERR.search(raw) or (final and _NOT_LOGGED_IN.search(final)):
        error = "claude-not-logged-in"
    else:
        error = _classify_error(raw, rc if rc is not None else -1)
    _set(jid, status="error", error=error, done=True)


@desk_router.post("/desk/run")
def desk_run(req: RunReq):
    """Start a streamed claude run; returns a job_id to poll."""
    _reap()
    model = req.model if req.model in _ALLOWED_MODELS else "sonnet"
    prompt = (req.prompt or "")
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="empty prompt")
    if len(prompt) > _MAX_PROMPT:
        prompt = prompt[:_MAX_PROMPT]
    if not Path(CLAUDE_BIN).exists():
        raise HTTPException(status_code=503, detail="claude binary not found on engine")

    jid = uuid.uuid4().hex
    with _LOCK:
        _JOBS[jid] = {
            "id": jid, "kind": req.kind, "model": model,
            "status": "running", "text": "", "error": None,
            "done": False, "created": time.time(),
            "debug": bool(req.debug), "raw": [],
        }
    threading.Thread(target=_run_stream, args=(jid, prompt, model), daemon=True).start()
    return {"job_id": jid, "kind": req.kind, "model": model}


@desk_router.get("/desk/run/{job_id}")
def desk_poll(job_id: str, debug: bool = False):
    """Poll a streamed run. While running, `text` grows; on done it is final."""
    with _LOCK:
        j = _JOBS.get(job_id)
        if j is None:
            raise HTTPException(status_code=404, detail="job not found (expired or never existed)")
        out = {
            "job_id": j["id"], "kind": j["kind"], "status": j["status"],
            "text": j["text"], "error": j["error"], "done": j["done"],
            "elapsed": round(time.time() - j["created"], 1),
        }
        if debug:
            out["raw"] = j["raw"][-60:]
        return out


@desk_router.api_route("/desk/warm", methods=["GET", "POST"])
def desk_warm():
    """Keep the claude runtime warm. Runs a minimal synchronous haiku call so
    the OS page cache + Max OAuth stay hot and the next real Tune/Draft is the
    fast warm path (~3-7s), not the cold path (30-75s). Hit periodically by the
    com.jont.desk-warm launchd agent, and once on Desk page load (pre-warm).
    Cheap and idempotent; safe to call as often as desired."""
    if not Path(CLAUDE_BIN).exists():
        raise HTTPException(status_code=503, detail="claude binary not found on engine")
    t0 = time.time()
    try:
        proc = subprocess.run(
            _claude_cmd("Reply with the single word: ok", "haiku", stream=False),
            capture_output=True, text=True, timeout=90, cwd="/tmp", env=os.environ.copy(),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "timeout", "elapsed": round(time.time() - t0, 1)}
    elapsed = round(time.time() - t0, 1)
    out = (proc.stdout or "").strip()
    if proc.returncode != 0 or _NOT_LOGGED_IN.search(out):
        return {"ok": False, "error": _classify_error((proc.stdout or "") + (proc.stderr or ""), proc.returncode), "elapsed": elapsed}
    return {"ok": True, "elapsed": elapsed, "cold": elapsed > 15}


@desk_router.get("/desk/health")
def desk_health():
    with _LOCK:
        running = sum(1 for v in _JOBS.values() if v["status"] == "running")
    return {
        "ok": True,
        "claude_bin": CLAUDE_BIN,
        "claude_bin_exists": Path(CLAUDE_BIN).exists(),
        "jobs": len(_JOBS),
        "running": running,
    }
