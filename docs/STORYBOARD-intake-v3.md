# Intake, the top object: THE PILE, sorted by hand (storyboard, 2026-10-20, branch intake-v3, round two)

Round one (WHAT INTAKE REPLACED) was Jon's pick ("I like three the most"). Round two, his words: "one-by-one instead
of all at once, having the user click on certain things … we're missing the beauty of the calendar: a horizontal
calendar beneath everything that also changes … implement how number two had the audio playback, but the text
should appear in sequence." So: the five things that are his each breathe and each is its own press; a ribbon of days
under both phones takes every dated landing; the fifth is a memo from the wrist that plays, its words typed as spoken.


The argument in one line: Jon's words, "all of my notifications are turned off. I don't even need the calendar app
interface on my phone." The phone as it was is noise. Intake is one sorted feed.

The lived moment: you pick up your phone. A dozen notifications are piled on the lock screen, five of them his (a photo of a
save-the-date, a screenshot of a concert email, a Marketplace link with a thought, "boots lena" texted to himself at
1:41 AM, and a memo saved from his wrist), seven of them everyone's junk. Beside it, Intake: the real app, empty. He
sorts by hand: each of his five is a press, each flies the one arc into the Stream and becomes its card, the dated ones
land on the ribbon of days beneath; the junk goes only after the fifth.

Two phones (the AudioDex shape). Intake is on screen from the first paint: its dark ground, its name, Stream · Rows ·
Log, its own empty line. The before is one shape you do not read (a pile); the after is the product's own surface.
Nothing presses itself; nothing moves the page; the phones, the Stream's list (reserved to six cards) and the ribbon
hold one height from the first paint. On a phone-sized sheet the two phones share one spot: the lock screen at rest,
Intake crossfading over it for a beat at each landing, and staying once the fifth is sorted.

## The beats (what is on screen · what moves · how long)

1. REST, left phone: the LOCK SCREEN as it was. The clock, the date, twelve notifications piled past the bottom edge. FIVE breathe (the touch rim, the house vocabulary) and are his: Messages · Jon · Photo (the save-the-date thumbnail) · Messages · Jon · Screenshot (the concert email) · Messages · Jon · "Saw this on Marketplace. Made me think about creative hardware controls for music." · Intake · Memo saved · 0:18 (the wrist glyph) · Messages · Jon · "boots lena" (1:41 AM). Seven are flat and inert, everyone's (Maybe: Spam Risk, a package, 20% off ends tonight, rain in 12 minutes, a liked photo, 14 new in #general, a streak about to end). The foot: `tap what's yours`. Still.
2. REST, right phone: INTAKE, the real app: the dark ground, Intake · Stream · Rows · Log, the feed empty with its own line, "Stream clear. Talk to your wrist."; its list already holds six cards' height, unseen. Still.
3. REST, the RIBBON under both phones, the object's width: nine days on a desk (seven on a phone), the weekday letter over each numeral in the label face, the month at the left edge, today (Tue Oct 20, 2026) centred and ringed, no bars. Still.
4. A PRESS on any of the five (the runline fills in the foot for the press's own length): the item lifts (scale 1.03, 160 ms), flies one arc to the Stream (500 ms) and becomes its card as it lands (the next free row, top down); its slot in the pile closes (320 ms). Nothing else on screen moves.
5. The PHOTO → a RECEIPT (✓, "Theo & June's wedding", "Intake · Aug 28, 2027"); 300 ms after the landing the ribbon slides (700 ms, the month name changing as it passes) to August 2027 and the 28th takes a red bar, "Theo & June's wedding". The press is 1,600 ms end to end.
6. The SCREENSHOT → a receipt (✓, "Thundercat, The Fillmore", "Idea · Oct 27"); the ribbon slides to October and the 27th takes a yellow bar. 1,600 ms.
7. The MARKETPLACE LINE → an OPEN card ("Creative hardware controls for music (the RailDriver idea)", the listing's thumbnail, the domain line, the tiles quiet). The ribbon does not move. 1,600 ms.
8. "boots lena" → an open card "Red boots for Lena (Christmas)". The ribbon does not move. 1,600 ms.
9. The MEMO: the notification opens into a strip on the phone (300 ms): a waveform in the sheet's accent, the clock counting 0:00 → 0:18, and the words typed IN SEQUENCE as spoken, one every 400 ms: "Remind me on Sunday afternoon to call Nico. I need to make a résumé on the homepage. Sticky, so it floats." (20 words, 8.0 s; the clock paces to the words). With the sound file in place (public/intake/memo-nico.m4a, absent today) it plays aloud and the words pace to its length.
10. When the words end, the memo's two tickets fly one at a time (300 ms apart): a receipt (✓, "Call Nico", "Reminder · Sun 3 PM"), then an open card "Make the résumé sticky on the homepage"; the ribbon slides to this Sunday (Oct 25) and the 25th takes a red bar, "Call Nico · 3 PM". The memo's strip closes. About 11.6 s end to end.
11. ANY ORDER. Between presses the hint stands again and the rims breathe on what is left. After the FIFTH is sorted the junk fades (600 ms) and the lock screen is only the clock and the date: the phone is quiet. Six cards in the Stream, three bars on the ribbon (the last landing centred). Replay fades in (the house pill).
12. REPLAY: the pile is back, the feed empty, the ribbon on today, the rims breathing. Five presses again.
13. PHONES (a narrow sheet): the lock screen stands; each landing crossfades Intake over it for a beat (400 ms over, 1,200 ms hold, 400 back); after the fifth it stays. The ribbon is seven days wide under the phone.
14. REDUCED MOTION: no runline, no arc, no slide; a press shows the card and the bar at once; the memo's words appear together.

Where is Intake on screen: the right phone, from the first paint, every landing, and the whole end state; the ribbon
is Intake's own calendar (Jon: "I don't even need the calendar app interface on my phone"). The left phone is the
familiar thing it replaced, and it ends quiet.

## The haters

- "Five presses? Nobody clicks five times." → Each press pays in under two seconds, the rims say what is left, and any one press already shows the whole idea: one thing in, one card out, the calendar beneath taking the date.
- "The memo is eight seconds of typing. Too long." → It is the one thing Siri cannot do (a sentence with three intents in it), the words land as they are said, and the two tickets arrive while you are still reading. With the sound in place it is the real voice.
- "The ribbon is a calendar app." → It is Intake's: no grid, no month view, one strip of days that only moves when Intake files something. That is the point: the calendar he no longer opens.

## The DRAFT words (every word on screen, Jon's to rewrite)

Band (objects-copy.ts, WATCH_COPY.dek): `Texts and memos in. Tickets out.` (the round-one third beat "Notifications off." is withdrawn: the brief keeps the two-beat line)

The lock screen (src/data/intake-pile.json; the clock, the date and the app names are iOS's):
- `Tuesday, October 20` · `9:41`
- Messages · Jon · now: `Photo` (the save-the-date's thumbnail)
- Messages · Jon · 2h ago: `Saw this on Marketplace. Made me think about creative hardware controls for music.`
- Phone · 3h ago: `Maybe: Spam Risk` · `Missed Call`
- Messages · Jon · 3h ago: `Screenshot` (the concert email's thumbnail)
- Intake · 4h ago: `Memo saved` · `0:18 · from your wrist`
- Deliveries · 5h ago: `Delivered` · `Your package was left at the front door.`
- Mail · 6h ago: `Ends tonight: 20% off everything` · `Don't miss out. Your code is inside.`
- Weather · 7h ago: `Rain starting in 12 minutes` · `Stopping around 4 PM.`
- Messages · Jon · 1:41 AM: `boots lena`
- Social · Yesterday: `lena` · `liked your photo.`
- Work Chat · Yesterday: `#general` · `14 new messages`
- Streak · Yesterday: `Your streak ends in 3 hours!` · `Keep it alive with one quick lesson.`

The memo (capture 32, the name swapped): `Remind me on Sunday afternoon to call Nico. I need to make a résumé on the homepage. Sticky, so it floats.`

Intake's feed (the chrome words `Intake` · `Stream` · `Rows` · `Log` and the empty line are the app's own; every card's age reads `today`):
- receipt: `Theo & June's wedding` · `Intake · Aug 28, 2027`
- receipt: `Thundercat, The Fillmore` · `Idea · Oct 27`
- open · idea: `Creative hardware controls for music (the RailDriver idea)` · the thumbnail · `facebook.com` · tiles `Claude ✦` · `Zzzz` · `Add to…`
- open · idea: `Red boots for Lena (Christmas)` · the tiles
- receipt: `Call Nico` · `Reminder · Sun 3 PM`
- open · task: `Make the résumé sticky on the homepage` · the tiles

The ribbon: the weekday letters, the numerals, the month names; the bars `Theo & June's wedding` (red) · `Thundercat` (yellow) · `Call Nico · 3 PM` (red)

The foot: the hint `tap what's yours` · the pill `Replay`

The live region (screen readers only), one sentence a sort: `Filed: Theo & June's wedding, on the calendar August 28, 2027.` · `Filed: Thundercat at the Fillmore, an idea for October 27.` · `In the Stream: creative hardware controls for music.` · `In the Stream: red boots for Lena.` · `Memo filed: call Nico, a reminder for Sunday at 3 PM, and a card to make the résumé sticky.` · after the fifth: `Everything sorted. The phone is quiet.`
