# SHOT LIST — the Signal Studio study (2026-10-15)

Seven captures, one per pillar on `/case-studies/signal-studio`. Each frame on the page is an honest empty outline until its file exists; drop the file in and rebuild, that is the whole upload.

## The rules for every capture
- **Where:** `public/case-studies/signal-studio/<name>.webm` (an optional still, `<name>.webp`, becomes the poster).
- **Size:** 1280 × 720, 16:9. Record the studio window at that size or crop to it. No browser chrome, no cursor trails you did not mean.
- **Length:** 30 seconds or under. The frame loops, so end on a state that reads well cut back to the start.
- **Sound:** none. Record muted or strip the audio track; the page is silent by ruling and the `<video>` is muted anyway.
- **Format:** WebM (VP9). A quick path from a screen recording: `ffmpeg -i in.mov -an -vf "scale=1280:720" -c:v libvpx-vp9 -b:v 0 -crf 32 <name>.webm`.
- **Theme:** the studio's own look, whatever it is that day. The page frames it in both day and night; the capture does not need to match.
- **What a capture is for:** one pillar's claim, shown once, slowly. A stranger should know what they saw without a caption.

## The seven

### 1. `chips.webm` — any instrument becomes the instrument
- **On screen:** the keys tower with a hardware synth's rip loaded as the voice; the voice band naming it.
- **You do:** play a few notes on the synth's voice, step to a different ripped voice with the voice walk, play the same notes. Two sounds, one set of controls.
- **Length:** ~20 s.

### 2. `recording.webm` — it's always recording
- **On screen:** the studio playing (drums + keys running), nothing armed, no red button anywhere.
- **You do:** play for a bar or two, then cut a take out of what just happened (the grab from the capture ring onto the shelf). The point is the order: play first, decide after.
- **Length:** ~25 s.

### 3. `radar.webm` — the radar
- **On screen:** the radar open with a microphone picked; the chord window, the key screen and the BPM glass visible.
- **You do:** play a chord progression out loud (a real instrument, or a song in the room); the chords, the scale and the tempo print and land on the instrument.
- **Length:** ~30 s.

### 4. `looping.webm` — looping
- **On screen:** the carve: the waveform under the chord chart, the bar grid showing.
- **You do:** drag a selection and let it snap to whole bars, slide its position, audition it, mint it onto the shelf. Or do the same from the controller: square, then cross.
- **Length:** ~25 s.

### 5. `grab.webm` — grab anything, make it yours
- **On screen:** something already playing on the machine (do NOT show the player app's window or name; keep the studio full-frame), the signal tab.
- **You do:** grab a few bars of it, crop, repitch or EQ it, let the warp pull it into the song's key and tempo, play it on a key beside the drums.
- **Length:** ~30 s.

### 6. `catalog.webm` — the catalog, absorbed
- **On screen:** the library view inside the suite: the sidebar of material and the popup bench.
- **You do:** search for a sound, open it on the bench, audition and crop it, bring it into the session.
- **Length:** ~20 s.

### 7. `hands.webm` — laptop alone, MIDI, external gear, controller
- **On screen:** the instrument with the hands map visible under the shelf (the keys and the pad glyphs that light as pressed).
- **You do:** play the same phrase four ways in a row: the laptop's keys, the MIDI keyboard, the hardware synth on the line input, then the DualSense (D-pad walking the focus, a stick turning the EQ). The map lights for each.
- **Length:** ~30 s.

## After recording
1. Drop the seven files into `public/case-studies/signal-studio/`.
2. `npm run build` (the frames pick up the files at build time).
3. Look at the page: only the frames on screen play; under reduced motion they hold still with controls.
