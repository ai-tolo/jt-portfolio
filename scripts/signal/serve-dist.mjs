#!/usr/bin/env node
// serve-dist · SIGNAL gate helper (branch `signal`, R0 2026-09-23).
// A zero-dependency static server for the BUILT site (dist/client): what Vercel will serve, minus Vercel.
//   node scripts/signal/serve-dist.mjs --port 4637 --root dist/client [--host 127.0.0.1] [--log]
// Rules: GET/HEAD only · HTTP Range (single range: a-b, a-, -n) → 206 / 416 for audio seeks · MIME table
// below (m4a → audio/mp4) · a directory or trailing slash serves its index.html (/signal and /signal/ →
// /signal/index.html), an extensionless miss tries <path>.html · misses get 404.html with a 404 ·
// Cache-Control: no-store (the gate always wants the fresh build) · nothing escapes the root.
// Importable: `const server = await serveDist({ port, root })` resolves once listening; close() it.
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ROOT = fileURLToPath(new URL("../../dist/client", import.meta.url));

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
};

const statFile = (f) => {
  try { const st = statSync(f); return st.isFile() ? { file: f, size: st.size, mtime: st.mtime } : null; } catch { return null; }
};

// URL path → a file inside root, or null. normalize() on a rooted path cannot climb above "/".
export function resolveFile(root, pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { return null; }
  if (p.includes("\0")) return null;
  const abs = resolve(root, "." + normalize("/" + p));
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  const tries = p.endsWith("/") ? [join(abs, "index.html")] : [abs, join(abs, "index.html"), abs + ".html"];
  for (const f of tries) { const hit = statFile(f); if (hit) return hit; }
  return null;
}

// "bytes=a-b" | "bytes=a-" | "bytes=-n" → {start, end} · null = ignore (serve 200) · false = 416
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!m || (m[1] === "" && m[2] === "")) return null; // multi-range or junk: a full 200 is allowed
  let start, end;
  if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; if (Number(m[2]) === 0) return false; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  return start > end || start >= size ? false : { start, end };
}

export function serveDist({ port = 4637, root = DEFAULT_ROOT, host = "127.0.0.1", log = false } = {}) {
  root = resolve(root);
  const server = createServer((req, res) => {
    const t0 = Date.now();
    const done = (code) => log && console.log(`${code} ${req.method} ${req.url} ${Date.now() - t0}ms`);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return done(405);
    }
    const url = new URL(req.url || "/", "http://local");
    const hit = resolveFile(root, url.pathname);
    if (!hit) {
      const nf = statFile(join(root, "404.html"));
      res.writeHead(404, { "Content-Type": nf ? MIME[".html"] : "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      if (req.method === "HEAD" || !nf) res.end(nf ? undefined : "404 not found\n");
      else createReadStream(nf.file).on("error", () => res.destroy()).pipe(res);
      return done(404);
    }
    const headers = {
      "Content-Type": MIME[extname(hit.file).toLowerCase()] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Last-Modified": hit.mtime.toUTCString(),
    };
    let status = 200, start = 0, end = hit.size - 1;
    if (req.headers.range) {
      const r = parseRange(req.headers.range, hit.size);
      if (r === false) {
        res.writeHead(416, { ...headers, "Content-Range": `bytes */${hit.size}`, "Content-Length": 0 });
        res.end(); return done(416);
      }
      if (r) { status = 206; ({ start, end } = r); headers["Content-Range"] = `bytes ${start}-${end}/${hit.size}`; }
    }
    headers["Content-Length"] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === "HEAD" || hit.size === 0) res.end();
    else createReadStream(hit.file, { start, end }).on("error", () => res.destroy()).pipe(res);
    done(status);
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => { server.off("error", fail); ok(server); });
  });
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(`--${name}`);
    if (i > 1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
    const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.slice(name.length + 3) : dflt;
  };
  const port = Number(arg("port", 4637));
  const root = resolve(arg("root", DEFAULT_ROOT));
  const host = arg("host", "127.0.0.1");
  const server = await serveDist({ port, root, host, log: process.argv.includes("--log") }).catch((e) => {
    console.error(`serve-dist: cannot listen on ${host}:${port}: ${e.message}`); process.exit(1);
  });
  console.log(`serve-dist: http://${host}:${port}/ → ${root}`);
  const stop = () => { server.closeAllConnections?.(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 500).unref(); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
