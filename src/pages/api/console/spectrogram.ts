// Auth-gated proxy: stream a pre-generated mel-spectrogram PNG by sha1(path).
// Forwards to the M1 engine's GET /spectrogram/<sha1>.png endpoint, which
// serves files from ~/automation/data/spectrograms/ (3,431 rendered the
// 2026-05-20 night batch via scripts/generate_spectrograms.py + plist
// com.jont.tonight-spectrograms).
//
// 404 from the engine is forwarded as-is so BucketCard's <img onerror>
// can hide the surrounding <details> element. Auth enforced upstream by
// src/middleware.ts.

import type { APIRoute } from "astro";
import { streamSpectrogram } from "../../../lib/console-api";

const SHA1_RE = /^[a-f0-9]{40}$/;

export const GET: APIRoute = async ({ url }) => {
  const sha1 = (url.searchParams.get("sha1") ?? "").toLowerCase();
  if (!SHA1_RE.test(sha1)) {
    return new Response(
      JSON.stringify({ error: "sha1 query param required (40 hex chars)" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const res = await streamSpectrogram(sha1);

  if (res.status === 404) {
    return new Response(JSON.stringify({ error: "spectrogram not yet generated" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `engine ${res.status}` }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
};
