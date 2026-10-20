# STATE: the AudioDex sheet, one scene (branch `skim`, 2026-10-15)

## Plan
1. archive-run.json: the word `thanksgiving` (one slip), three dinners by year (2021 · 2019 · 2017), each row = title, year, length, mood, "the kids", the room; the moment = 9:31–9:43 inside 14:02, a kid's grace lit on "thanksgiving".
2. ArchiveHero: results rows print what AudioDex wrote; the moment drops the counts, tags, tool list and tool chips; keeps scope, waveform, lit line, Kept, play.
3. The play key is a media slot: `public/archive/thanksgiving.m4a` checked with fs.existsSync at build; absent = drawn, dimmed, inert; present = plays the file.
4. Under the moment: `this dinner became a tape ↓` (a real link to #soundlab, `data-tape-jump` = the tape's manifest title).
5. Host script: land #soundlab, wait for the scroll to settle, then `car:show` the Thanksgiving tape (sleeve index + 1).
6. The fold: hook → `.wk-said` (Jon's line, DRAFT) → the one explaining line → under the hood → `.wk-rule` → the whole story.
7. Under the hood = ONE RECORDING, BEFORE AND AFTER: the stock row beside AudioDex's row, labelled heard · read · measured · drawn · found in the accent; a small song row shows bpm + key.
8. Delete SPEC.archive, SKIM.archive, READOUT.archive and the Schematic glyphs only archive drew; keep everything watch/studio/signal still use.
9. Gate: the build exit code; then dist/client on a scratch port, 1440×900 day + night, 375×812 touch, fold open and closed.
10. One commit on `skim`.

## Resume here (round one shipped as one commit on `skim`, 2026-10-15)
- Done: steps 1–10. The scene lives in src/data/archive-run.json (phone) and ARCHIVE_COPY in objects-copy.ts (fold words, all DRAFT); the hood markup + `.ad-*` CSS sit in StudioOne's #build-archive block; the tape jump is in StudioOne's wallet script ("THE TAPE JUMP").
- THE SLOT: drop `public/archive/thanksgiving.m4a` (the twelve seconds themselves, not the 14-minute memo), rebuild. The play key goes live and plays the file start to end; no code change.
- Open for Jon: every DRAFT line in ARCHIVE_COPY (said · why · rule · hood notes · caption); the music room's tape note says "a Thanksgiving dinner I couldn't attend", while the fold's line says he is back at the dinner.
- QA: 1440×900 day + night and 375×812 touch, fold open + closed, captures in ~/Documents/studio-build/audiodex/ (probe: scratchpad qa/probe.mjs, serves dist/client on :4691).

## Round two (2026-10-15, Jon: "a side by side, more like Crediverso … as few texts as possible")
- The object is `src/components/AudioDexDoor.astro` + `src/data/audiodex-scene.json`: Voice Memos beside AudioDex, one press types `thanksgiving` into both; No Results on the left; on the right the memo and the song it became; the memo opens and PLAYS.
- The memo is real: the first 18 s of `public/listen/thanksgiving-a-capella.mp3`, cut to `public/archive/thanksgiving.m4a` (ffmpeg, AAC 96k, 0.3 s fade). Whisper large-v3-turbo segments drive the lit lines; the sung note measures 215 Hz (A3, a little flat) against the family's "C-flat". "Uncle Johnny" is in the audio and printed nowhere.
- The fold: the hook → one strip (heard · measured · named · drawn · linked) → the floor line → the whole story. No caption, no rail, no line in Jon's voice yet (the round-one line read creepy; his words come from the next interview).
- Retired to junkyard/: ArchiveHero.astro, archive-run.json. IntakeHero's comments still name ArchiveHero as the twin (the Intake sheet was out of scope); the twins now live in AudioDexDoor.
- Resume: Jon's line for `.wk-said` (if he wants one), then a real-phone check of the stacked layout (Voice Memos 62cqw above AudioDex 76cqw).

## Round three (2026-10-15, Jon: the full transcript, a longer hold, bigger dates, a link that excites)
- The memo shows every line Whisper heard (8, "♪" for the sung note, "Hi Uncle Jonny." in Jon's spelling) as a lyric view that follows the playback.
- The answers hold 3 s (was 1.5); each result carries its date on its own line, a step bigger, with bigger titles and icons.
- THE TAPE: the music room's own mini cassette (StudioOne passes it into AudioDexDoor's `tape` slot) slides out from behind the AudioDex phone once the memo is open (under it when stacked, into a reserved slot); it breathes with the touch signal; a press pauses the memo, lands the music room, loads Thanksgiving A Capella and presses its play switch. The in-phone row now just says "song · 1:06".
- Assumption to confirm: the memo's date prints as Nov 24, 2022 (Thanksgiving of the manifest's year).

## Round four (2026-10-15, Jon: the tape smaller and on the white, one way to the song, start it late)
- The cassette is 44cqw of the phone (52 stacked) and stays inside the sheet at 1440, 1024 and 375; its words sit in two short lines beside the phone, one line when stacked.
- The in-phone song row is gone: the cassette is the only way to the song.
- A press starts the tape at 0:15 (`moment.tapeAt` in audiodex-scene.json): the memo's tail, the door, then the song.

## Round five + where it stands (2026-10-15, end of session)
- The Thanksgiving A Capella note (soundlab-manifest.json) now says what the song is made of: "…After the door slam, every sound is cut from that memo. The lead is my sister's one nasal note." DRAFT, Jon's to change.
- NOT PUSHED. Jon: another chat handles the push. Heads-up for it: `skim` also carries pass one (beats + Schematic + readout) on the SIGNAL and Studio sheets, which Jon called filler; those two sheets were never redone. Decide before shipping whether to restore them to main's version.
- AudioDex is done for this round: Jon's verdict "so much better and eloquent". Open, only if Jon asks: a line in his voice for the fold (`.wk-said`), the memo's printed date (Nov 24, 2022 is the manifest year's Thanksgiving, an assumption).
