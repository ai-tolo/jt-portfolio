# Studio assets — swap contract (Lane C)

Full ASSET SPEC SHEET: `~/career-strategy/studio-asset-spec.md` (copy on `~/Desktop`).
Binding build spec: `NOTES-STUDIO-SPEC.md` at the repo root.

## The contract in one breath

Jon authors 8 deliverables — the desk surface, the etched name, and one asset per desk
object — to the canvases in the spec sheet, and drops them at these paths. Same
basename + same canvas ratio ⇒ the real art replaces its neutral placeholder silhouette
with **zero code changes**.

```
public/studio/desk.webp                 desk surface   3072×2048  WebP (no alpha, q~80)
public/studio/etch.webp                 etched name    1760×440   WebP-alpha (or etch.svg)
public/studio/obj-work.webp             WORK           600×440    WebP-alpha
public/studio/obj-signal.webp           SIGNAL         680×400    WebP-alpha
public/studio/obj-soundlab.webp         SOUND LAB      440×440    WebP-alpha
public/studio/obj-writing.webp          WRITING        400×320    WebP-alpha
public/studio/obj-illustrations.webp    ILLUSTRATIONS  440×340    WebP-alpha
```

## Rules that make the swap seamless (details in the spec sheet)

- All raster @2x against a 1440×900 reference viewport; sRGB.
- ONE shared light source: sun from the UPPER-RIGHT of the frame, top-down camera —
  highlights top/right, form shading lower-left.
- NO baked cast shadows (the build owns the CSS shadow so the wake-lift can move it);
  contact occlusion ≤ 16 canvas px is fine.
- 6% transparent bleed on all sides; silhouette never touches the canvas edge.
- Author objects UPRIGHT — the placed rotation is CSS-side.
- Sound objects (Signal, Sound Lab) authored dark/unpowered; the glow is build-side (D3).
- Total image weight budget: ≤ 730 KB (LCP < 2.0 s @ 4× CPU throttle).

## To the desk builder (Lane A)

These dimensions were derived from NOTES-STUDIO-SPEC.md + the grey-box scaffold before
your placeholders landed. If your final object footprints differ, update BOTH this file
and `~/career-strategy/studio-asset-spec.md` §3/§5 so Jon authors against the truth.
