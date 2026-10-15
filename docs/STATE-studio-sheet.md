# STATE: the Signal Studio sheet, the surface (branch `skim`, 2026-10-15)

## Plan
1. Capture the real Studio (localhost:4460, the signal view, woken by one neutral click, nothing playing) headless and muted at 1440×900 @2×, cropped to the column right of the sidebar, as public/builds/studio/surface.webp; measure six DOM rects in the same run into src/components/studio/studio-surface.json as percentages of the crop.
2. New component src/components/studio/StudioSurface.astro: the still, six hairline rings (the sheet's accent) at the stored percentages, one line printed in a slot reserved to the tallest line; the first target lit on load; a press moves the light; nothing hovers, nothing moves the page.
3. Phones (sheet under 600px): the still's words fall far under 8px, so the surface becomes a cropped still per target: the same image, scaled to 0.8 of its capture size at least, centred on the lit target; a press swaps the crop and the line.
4. objects-copy.ts STUDIO_COPY: the dek, six target lines, the surface caption, the fold's said line and its second line, three captures as problem → answer with their files (plane · pianist · window, .mp4 or .webm).
5. StudioOne #build-studio: band → the surface → the three frames (the existing dissolve Carousel; a drawn play key on each frame, dimmed and inert while the file is missing; with sound, on a press only; one at a time; stops off-screen) → the fold: the hook, `.wk-said`, the one line under it, the whole story behind its label.
6. Retire on this sheet: the beats, the Schematic, SPEC.studio, SKIM.studio, READOUT.studio; the Schematic glyphs only SPEC.studio drew; keep all SIGNAL's card and the watch still use.
7. Gate: `npm run build` exit code only.
8. Serve dist/client on a scratch port; look at 1440×900 day and night and 375×812 touch (the phone's scroller is `main`), fold open and closed, every target pressed; scrollWidth == viewport; 0 console errors; the comet lands on studio.
9. One commit on `skim`.
10. This file: how to resume, every DRAFT line.

## Resume here (round two shipped as one commit on `skim`, 2026-10-15)
- Done: steps 1–10. The still is public/builds/studio/surface.webp (2336×1800, 129 KB); the six rects are src/components/studio/studio-surface.json (percentages of the 1168×900 crop); the component is src/components/studio/StudioSurface.astro; the sheet's markup, `.st-*` CSS and the frames' sound script are StudioOne's #build-studio block; every word is STUDIO_COPY in objects-copy.ts.
- RE-CAPTURE the still: scratchpad cap/capture.mjs pattern (cdp.mjs launch, 1440×900, deviceScaleFactor 2, navigate localhost:4460/?mute=1, one click at 136,620 on the sidebar's ground to wake the sound, measure `.sig-towers` · `.kv-fx` · `.si-input--top` · `.fs-well` · `.tb-tempo` · `#si-stage` against `.rightcol`, clip to `.rightcol`, sharp → webp q86). The radar's cap lives on the jam tab, so its ring is the BPM · LOCK · KEY glass, where its reading lands.
- THE SLOTS: drop `public/builds/studio/plane.mp4` · `pianist.mp4` · `window.mp4` (or .webm), rebuild. Each frame's key goes live and plays with sound on a press; no code change. 16:9, 1280×720 or 1920×1080, 20–40 s each, the room's sound on (never muted), under ~12 MB apiece.
- Phones: the still crops to the lit target (stage under 700px); the three engines show whole (`fit`), the rest at ≥0.7 of the capture scale; every tap on the picture steps to the next target.
- QA on the built site (dist/client on a scratch :4693): 1440×900 day + night and 375×812 touch, six presses (the sheet's top never moved, the line slot held 81px / 153px), fold open + closed, scrollWidth == viewport, 0 errors, the rail lit on studio. Captures in ~/Documents/studio-build/studio-sheet/.
- Out of this sheet, unchanged: sheet.css still carries `.sheet-beats` (no sheet uses it now); READOUT.watch + SOURCE + the ledger import in StudioOne are unused since the Intake sheet's round (the watch's hood is IntakeClock).

## Round three (2026-10-15, Jon: the rings alone said nothing about what was pressable, the line hid below the fold, the caption had to go; the dek after "SIGNAL on steroids" read as a weird sentence; SIGNAL's title looked like another font)
- THE MODULE: the still at the left, THE PARTS LIST at the right (272px from 820px of sheet; stacked beneath on phones): six rows in the label face with a small ring mark; a press lights the row, its ring on the still, and prints its line under the row (an accordion; the list stays shorter than the still on a desk, so the page never moves). Only the lit ring shows. No caption. Phones: a row press glides the crop; a tap on the picture steps.
- The dek: "SIGNAL on steroids: a whole studio that opens like a notebook and goes where I go." (DRAFT)
- SIGNAL's `.sc-title` (SignalCard.astro) now wears the band-name face to the letter: Outfit 500 3.25rem/1.05 at −0.02em (2.5rem under 900); it was 2.125rem at 0.06em.

## Round four (2026-10-15, Jon: the side-by-side "too small", still no idea what's clickable, "effects" has to show the three instruments at once; "a thesis-driven project … let's go")
- THE OBJECT IS SIX MOMENTS (src/components/studio/StudioMoments.astro): a row of six tabs in the rail's idiom (the lit one an ink pill) → the lit moment's line (the hook's face a step smaller, a slot reserved to the tallest) → a 16:9 frame on the look room's chassis (keys on desks, swipe on phones) showing a crop of the real Studio already in the state that makes the point, everything else dimmed, the subject edged in the accent. The whole module stands in one screen at 1440×900 (the frame's foot at 858).
- THE FRAMES: public/builds/studio/moment-{engines,effects,take,chips,radar,hands}.webp. Made by docs/studio-moments-capture.mjs + docs/studio-moments-take.mjs (copies of the scratch scripts; run from anywhere with node, :4460 up, headless + muted). States set in the app's own DOM before each shot: the bass named 303; three chips (RHODES · VOICE · RADIO) in the well with the well's own chip markup; the glass set to 94 BPM / Cm in the radar's ink (data-src / data-who = radar); on the jam tab a drawn record with a four-bar take between the bench's own handles. The engines, effects and hands frames are the untouched surface, cropped and dimmed.
- The surface still, its rects and StudioSurface.astro are gone (git history has them). StudioOne's chassis rules (.st-obj · .st-slot · .st-frame) are :global now so the child component can stand on them.
- Known: the take frame is two-thirds dark floor (the jam page is empty at rest); a tighter composition needs a real record on the bench.

## DRAFT lines (Jon's to rewrite; all in objects-copy.ts STUDIO_COPY)
- dek: "SIGNAL on steroids: a whole studio that opens like a notebook and goes where I go." (round two's "…: the whole studio, in the laptop, for making the idea exist." was cut)
- engines: "Three engines that resample anything. The shorthand is drums, keys and bass, because that's a keyboard player's whole band."
- effects: "Every engine's effects are on the surface at once. I can see which one has the delay and which has the sidechain without opening anything. Ableton makes you expand a rack and pop a window for that."
- take: "It was already listening. There's no record button to forget. A take is cut out afterwards."
- chips: "Any sound on the laptop, cropped in two moves, becomes a key: re-pitched, re-timed, remixed."
- radar: "Built in New York, jamming with a friend who won't stay in one key. One click and the room's chord, scale and tempo are on the screen. Join without interrupting him."
- hands: "A laptop, a MIDI keyboard, a travel keyboard, a PlayStation controller: writing utensils. The same moves on every one, every time."
- tab words: the engines · the effects · the take · the chips · the radar · the hands
- the frames' alt texts (mine)
- said: "Ableton is for producing ideas that already happened. This is for making the idea exist."
- keep: "Make ten thousand songs. Keep ten."
- frame 1: "$3,000 of instruments in the bedroom. A laptop on the plane." → "Every synth I own, sampled into keys once. The room travels."
- frame 2: "Your friend won't stay in one key." → "The radar names the chord, the scale and the tempo. Play along, no math."
- frame 3: "The laptop's in the other room and you're looking out the window." → "The controller sits on the keyboard: voices, drums in, drums out."
- the still's alt text and the rings' labels (`label` fields), mine.
