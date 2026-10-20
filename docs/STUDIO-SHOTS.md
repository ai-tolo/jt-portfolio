# Signal Studio · the shot list, v2 (2026-10-19; replaces SHOTLIST-signal-studio.md of 2026-10-15)

The study at /case-studies/signal-studio has FIVE capture slots and TWO drawing slots. Each slot is an honest empty
frame until its file exists in `public/case-studies/signal-studio/` at build time. Nothing is faked: a scene whose
build dependency has not landed stays empty, and its row below says "landing".

Recorder: the OBS "Studio Clips" profile (studio_clips_obs_recorder.md): Record = Ctrl+Opt+Cmd+Space (backup
Ctrl+Opt+R); UI clip = Ctrl+Opt+1 (the display + system audio); Room clip = Ctrl+Opt+2 (the L-8 master, what the room
hears; the page's sound only if CH7 is up); the iPhone hands cam writes `<date> hands.mp4` beside the take, ~0.13 s
late, align by the clap. Files land in ~/Desktop/Studio Clips at 2560×1080, 60 fps.

FIX BEFORE THE NEXT TAKE (every 2026-10-18 take has it): the display source sits in a 1058×456 box inside the
2560×1080 canvas (about 41 %, black around it). Fit the display source to the canvas, or the captures come out 456 px
tall. Hide the desktop (icons, the second screen's sidebar) and quit the streaming app before recording: the page never
names it and must never show it.

Delivery per capture: 1280×720, VP9 WebM, MUTED on the page (the study is silent), ≤ 30 s, a 1280×720 WebP poster of
the first clean frame beside it (`<name>.webp`). Identity rule: hands, desk, voice. No face.

## The five scenes

| slot | file | scene | what is on screen | the hands | ceiling | the line it sits beside | must exist in the build |
|---|---|---|---|---|---|---|---|
| take | `take.webm` | UI clip | signal tab: drums running, keys played; nothing armed (the ARM face idle); switch to jam; the record lane shows the last minutes; drag a take out of it, it lands as a chip in the well | laptop letters, then the mouse on the carve | 25 s | "How much would you pay for every session you thought was recording and wasn't?" | shipped (the record, the carve, chips: laws 3, 6, 29) |
| grab | `grab.webm` | UI clip | jam tab with a song playing on the laptop (the player NEVER on screen; the title field blank); Space; the four bars snap to the grid; the chip appears with its length in bars; play over it on signal | Space on the laptop, or □ on the controller in the hands cam | 25 s | "One click and it works. It regiments the bars and has a spot for it. No new track, no picking a colour." | shipped (GRAB_BARS 4, law 105; warp, law 100). A generic source only: a royalty-free track or one of your own; never a named song in the chip list |
| radar | `radar.webm` | Room clip + hands cam | jam tab; pick the mic; play a progression out loud on the SL73 (the MODX over DIN, the room hears it); tempo lands in ~10 s, the key and the chords in ~20 s; the sheet firms up | both hands on the SL73, the phone over the keys | 30 s | "Ableton doesn't even care about key. The radar hears the room and names the chord, the scale, the tempo." | shipped (RADAR, laws 27-34) |
| stacks | `stacks.webm` | UI clip | signal tab: a drum pattern running; hold PRINT: the drums freeze into a chip in the sounding stack, the grid empties; build a second pattern, print it into stack 2; SWITCH between the two on the bar line; EXPORT: the folder, one WAV per chip, opened beside Ableton | the mouse, or the controller's print trigger in the hands cam | 30 s | "Grab it, loop it, compartmentalize it. Then Ableton gets the stems and does what it's good at." | LANDING: FB24 (178-181) on side branches, then PRINT → STACKS → EXPORT per macro-chips-strategy-2026-10-19.md. Do not fake it; the frame stays empty until EXPORT ships |
| hands | `hands.webm` | UI clip + hands cam, cut together | one phrase played three ways: the laptop letters, then the SL73, then the DualSense (L1/R1 step the voice, the touchpad sweeps the EQ, the right stick adds reverb), the screen answering each time; end on the controller with the laptop out of reach | all three surfaces, the phone on the desk | 30 s | "The controller is a luxury: my main things at my fingertips, eyes out the window." | shipped (FB16-17, laws 101-121; WebHID needs Chrome) |

## The two drawings (Jon's own assets, 3:2)

| slot | file | what it draws | the line it sits beside |
|---|---|---|---|
| bench | `bench.svg` or `bench.webp` | the three engines as one bench: any sound through any of them | "My synth through the drum engine. My bass through the synth engine. Every effect on every instrument, on one page." |
| everyway | `everyway.svg` or `everyway.webp` | every way he has recorded, drawn as one room (the laptop alone, the SL73, a tiny keyboard on the road, the full desk) | "Stand-up pianos, intense synthesizers, a tiny keyboard on the road. Anything that can send MIDI immediately works." |

## Cut from the 2026-10-15 list
- chips (a hardware synth ripped into the keys): the rips are a hood row now; the scene said "same keys, same knobs" (an engineering fact, not a moment).
- looping and grab: one move, one scene (grab).
- catalog (the library popup): cut, Jon 2026-10-19: "I'm fine with the library not being in there."

## The four 2026-10-18 clips in ~/Desktop/Studio Clips
| take | what it is | usable for | why not |
|---|---|---|---|
| 17-52-28 (8 s, silent) | a test: the Claude app, the setup chat | nothing | not the studio |
| 18-26-16 (8 s + hands, silent) | a test: a chat window (an email address readable), the hands cam shows the desk with no hands | nothing; delete | exposes the address; no studio |
| 18-42-41 (10 s + hands) | a test: a chat window beside a work PDF; the hands cam shows the right hand on the computer keyboard | nothing; delete | work documents on screen |
| 19-01-56 (404 s + hands) | THE REAL SESSION: ~10-150 s jam view (a 4-bar grab at 139, chip 4 run through the effects), ~170-260 s the instrument, ~290-330 s the chip sequencer; the streaming app in front at 2 s and 402 s; two chips named after other people's songs; the desktop's icons on the second screen; the hands cam shows the right hand on the laptop keys the whole time, the SL73 untouched, the controller out of frame | a reference for the grab and take scenes (what the screen does); NOT shippable | 456 px tall (the canvas box); the streaming app and named songs on screen; the audio is probably the song; the hands cam shows no instrument. Re-shoot with the canvas fixed |
