"""
The Console — Build 2 file-stream endpoint for the M1 (Engine) FastAPI app.

Drop-in. No edits to other files needed besides one import + one include_router
line in whatever file defines your FastAPI `app` instance.

Save this file at:
    ~/automation/<your-engine-dir>/file_endpoint.py

Then in the file that has `app = FastAPI(...)`, add these two lines near the
other route definitions:

    from file_endpoint import file_router
    app.include_router(file_router)

Restart the FastAPI server however you normally do (launchctl unload+load,
tmux kill+restart, manual ctrl-C+rerun). Verification commands at the bottom.

Design notes:
  - Validates each request by calling the existing /assets/by-path endpoint
    over localhost. If that returns 404, this returns 404. Means only files
    already in the catalog can stream — same gate /assets/by-path enforces.
  - Read-only. No writes, no deletes, no uploads.
  - Range-aware so <audio> elements can seek without re-downloading.
  - No new dependencies. Pure stdlib + FastAPI (already in use).
"""

import json
import mimetypes
import os
import urllib.parse
import urllib.request
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse


# Where the engine listens locally. Used only for the self-call to
# /assets/by-path. Localhost is fine because the FastAPI app is the only
# thing on this port; if you ever change the port, change this too.
_SELF_BASE = os.environ.get("ENGINE_SELF_BASE", "http://127.0.0.1:8765")

# Mime overrides for extensions Python's stdlib gets wrong or doesn't know.
_MIME_OVERRIDES = {
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".aif": "audio/aiff",
    ".aiff": "audio/aiff",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".als": "application/octet-stream",
}


def _guess_mime(p: Path) -> str:
    ext = p.suffix.lower()
    if ext in _MIME_OVERRIDES:
        return _MIME_OVERRIDES[ext]
    guess, _ = mimetypes.guess_type(p.name)
    return guess or "application/octet-stream"


def _parse_range(header: str, size: int):
    """Parse a single 'bytes=start-end' range header. Returns (start, end)
    inclusive or None if unparseable. Multi-range requests not supported
    (audio elements never send those)."""
    if not header or not header.startswith("bytes="):
        return None
    spec = header[6:].split(",")[0].strip()
    if "-" not in spec:
        return None
    start_s, end_s = spec.split("-", 1)
    try:
        if start_s == "":
            n = int(end_s)
            if n <= 0:
                return None
            start = max(0, size - n)
            end = size - 1
        else:
            start = int(start_s)
            end = int(end_s) if end_s else size - 1
    except ValueError:
        return None
    if start < 0 or end < start or start >= size:
        return None
    end = min(end, size - 1)
    return start, end


def _stream_range(path: Path, start: int, end: int, chunk: int = 64 * 1024):
    with path.open("rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            data = f.read(min(chunk, remaining))
            if not data:
                break
            remaining -= len(data)
            yield data


def _catalog_has(path: str) -> bool:
    """Returns True if /assets/by-path knows about this path. Used as the
    catalog gate so we don't expose a general filesystem browser."""
    qs = urllib.parse.urlencode({"path": path})
    req = urllib.request.Request(f"{_SELF_BASE}/assets/by-path?{qs}")
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        return e.code == 200
    except Exception:
        return False


file_router = APIRouter()


@file_router.get("/file")
def get_file(request: Request, path: str = Query(..., min_length=1)):
    """Stream a catalog file. 404 if the path isn't in the catalog or the
    file is missing on disk. Supports HTTP Range for audio seeking."""

    if not _catalog_has(path):
        raise HTTPException(status_code=404, detail="not in catalog")

    file_path = Path(path)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="file missing on disk")

    size = file_path.stat().st_size
    mime = _guess_mime(file_path)

    range_header = request.headers.get("range") or request.headers.get("Range")
    rng = _parse_range(range_header, size) if range_header else None

    if rng is None:
        if range_header:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{size}"},
            )
        return StreamingResponse(
            _stream_range(file_path, 0, size - 1),
            media_type=mime,
            headers={
                "Content-Length": str(size),
                "Accept-Ranges": "bytes",
                "Cache-Control": "private, max-age=0, must-revalidate",
            },
        )

    start, end = rng
    return StreamingResponse(
        _stream_range(file_path, start, end),
        status_code=206,
        media_type=mime,
        headers={
            "Content-Length": str(end - start + 1),
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=0, must-revalidate",
        },
    )


# ============================================================================
# Verification — run from the M3 (this directory) AFTER you restart the server:
#
#   1. Endpoint registered?
#      curl -i "http://macbook-pro-tolo:8765/file?path=missing"
#      → expect HTTP 404, {"detail":"not in catalog"}
#      (If you see {"detail":"Not Found"}, the route isn't registered —
#       check the include_router line ran.)
#
#   2. Real voice memo streams?
#      curl -I "http://macbook-pro-tolo:8765/file?path=/Users/jontollefson/Library/Group%20Containers/group.com.apple.VoiceMemos.shared/Recordings/20260428%20173307-7C658D09.m4a"
#      → expect HTTP 200, Content-Type: audio/mp4, Accept-Ranges: bytes,
#        Content-Length present.
#
#   3. Range request works?
#      curl -i -H "Range: bytes=0-1023" "http://macbook-pro-tolo:8765/file?path=<same-encoded-path>" --output /dev/null
#      → expect HTTP 206 Partial Content, Content-Range: bytes 0-1023/<total>.
# ============================================================================
