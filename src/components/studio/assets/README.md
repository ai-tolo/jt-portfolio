# Studio assets — swap contract (v2, 2026-07-26 consultant pass)

Binding build spec: `NOTES-STUDIO-SPEC.md` at the repo root.
Jon's remaining work: **`~/career-strategy/studio-bench.html`** (the worksheet — open it,
it supersedes the old spec-sheet flow). Historical sheet: `~/career-strategy/studio-asset-spec.md`.

## State: the desk is DRESSED

All 7 slots below are **filled** with built assets in the approved "morning" direction
(pale ash, window-pool sun, carbon gear). They were exported from the scene generator at
`~/studio-mocks/scene.mjs` (`node scene.mjs --export`), which is the single source of
truth for the desk's art. The site no longer depends on Jon's assets to look intentional.

Jon's hand replaces only the **identity carriers**, via the bench:

1. `etch.webp` — currently a marker-FONT interim autograph. Replace with his real hand.
2. `obj-illustrations.webp` — currently a built creature drawing. Replace the drawing
   with his own (the ingest pipeline keeps the taped-sheet framing).
3. `public/studio/illustrations/` + `rooms/illustrations-manifest.json` — gallery content.

Drop-photo → finished-asset pipeline: `~/studio-mocks/ingest.mjs` (see the bench cards).

## The filled slots (canvas = current truth; ratios locked in StudioDesk OBJECTS)

```
public/studio/desk.webp                 desk surface   3072×2048   WebP no-alpha  132 KB
public/studio/etch.webp                 the autograph  1760×440    WebP-alpha      24 KB  ← Jon's hand
public/studio/obj-work.webp             WORK           940×710     WebP-alpha      31 KB
public/studio/obj-signal.webp           SIGNAL         1120×660    WebP-alpha      20 KB
public/studio/obj-soundlab.webp         SOUND LAB      750×565     WebP-alpha      32 KB
public/studio/obj-writing.webp          WRITING        585×930     WebP-alpha      15 KB
public/studio/obj-illustrations.webp    ILLUSTRATIONS  910×610     WebP-alpha      20 KB  ← Jon's drawing
Total 276 KB (budget ≤ 730 KB; LCP @4× measured 0.64 s against the < 2.0 s gate)
```

Object canvases are the generator's local boxes × 2.5 (retina-safe at the largest
rendered size). Same basename + same ratio ⇒ zero code changes, unchanged.

## Rules (unchanged from v1, still binding for any replacement)

- ONE light source: sun from the UPPER-RIGHT, top-down camera.
- NO baked cast shadows (build-side CSS owns them); contact occlusion ≤ 16 canvas px OK.
- 6% transparent bleed; author objects UPRIGHT (rotation is CSS-side).
- Sound objects authored dark/unpowered; glow is build-side (D3).

## Regenerating / re-skinning

`~/studio-mocks/scene.mjs` holds both direction palettes (morning + golden). To re-skin
the whole desk: flip the direction in the `--export` block, `node scene.mjs --export`,
convert per the script comments, copy `out/export/*.webp` here. Composition lives in
StudioDesk's OBJECTS array + the generator's VIEWS (keep them in sync — VIEWS is the
design source, OBJECTS is the shipped truth).
