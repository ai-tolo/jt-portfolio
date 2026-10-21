# Intake, the top object: THE CATCH-ALL (storyboard, 2026-10-21, branch intake-v4, fresh eyes)

Jon after the pile: "The view of the calendar isn't good enough to be relevant. I don't know why we need the phone to
be on the right side as well. There's too many other notifications with extra words that feel irrelevant and hard to
navigate through. And the subtext saying tap what's yours is stupid and weird." And before that, what he liked: the
lived frame (the phone as it was, sorted into Intake), one press at a time, the calendar beneath that changes, the memo
whose words arrive as spoken.

The argument in one line: "the two things I already use, voice memos and iMessage, sorted into tickets. My calendar,
so many iOS-based things, in a sorted feed. All of my notifications are turned off." A catch-all.

The lived moment: you pick up your phone. Five things you sent yourself are waiting on the lock screen, in five
shapes: a photo of a save-the-date, a screenshot of a concert email, a Marketplace link with a thought, a memo from
your wrist, two words typed at 1:41 AM. Nothing else: his notifications are off. Beside the phone, INTAKE as itself,
the web app, its Stream clear. Beneath both, his calendar, a real month, October 2026, today ringed. Each thing is one
press: it opens so you see what it is, then it goes into Intake and becomes its ticket; the dated ones also land on
the calendar, which pages to the day. After the fifth the lock screen is the clock alone.

Where is Intake: on screen from the first paint, at full size (the right column, the phone's height, no frame), at
every landing, and the whole end state. Apple appears only as the lock screen the things arrive on, and the calendar
they land in.

## The beats (what is on screen · what moves · how long)

1. REST, left: THE LOCK SCREEN as it was. The date, the thin clock, FIVE pills in iOS's grammar: Messages · Jon · Photo (the save-the-date thumb) · Messages · Jon · Screenshot (the concert email) · Messages · Jon · "Saw this on Marketplace. Made me think about creative hardware controls for music." · Intake · Memo saved · 0:18 · from your wrist · Messages · Jon · boots lena (1:41 AM). No other notification. Each breathes (the touch rim, the house vocabulary). Still.
2. REST, right: INTAKE, the real app as it is on his Mac mini: a dark panel the phone's height, Intake · Stream · Rows · Log, the feed empty with the app's own line, "Stream clear. Talk to your wrist." Its list already holds six cards' height, unseen. Still.
3. REST, beneath both: THE MONTH, October 2026, drawn as the iPhone's Calendar draws a month (the weekday letters, the bold numerals, today in its red ring), the object's full width, nothing on it. The foot is empty. Still.
4. A PRESS on the photo (the runline fills in the foot for the press's own length): the pill OPENS the way iOS opens a notification, the save-the-date full width inside it, the other pills dimmed (320 ms), and holds so you see it (600 ms).
5. It GOES: a copy of the open pill flies one arc into the Stream (500 ms) and is the card as it lands: a RECEIPT, ✓ · Theo & June's wedding · Intake · Aug 28, 2027. The pill's slot closes (320 ms); the other pills come back.
6. 300 ms after the landing THE MONTH PAGES: August 2027 slides in (520 ms), and the 28th takes the red bar "Theo & June's wedding". The press is about 2.3 s end to end.
7. The SCREENSHOT: opens (the concert email, whole) → flies → ✓ Thundercat, The Fillmore · Idea · Oct 27 → the month pages back to October 2026 and the 27th takes the yellow bar "Thundercat".
8. The MARKETPLACE line: opens (the listing's picture under his words) → flies → an OPEN card: the idea chip, "Creative hardware controls for music (the RailDriver idea)", the listing's thumb, facebook.com, the tiles Claude ✦ · Zzzz · Add to…. The month holds.
9. "boots lena": nothing to open; it lifts and flies → an open card "Red boots for Lena (Christmas)". The month holds. About 1 s.
10. THE MEMO: the pill opens into its strip: the wave in the sheet's accent, the clock 0:00 → 0:18, and the words typed IN SEQUENCE as spoken, one every 400 ms: "Remind me on Sunday afternoon to call Nico. I need to make a résumé on the homepage. Sticky, so it floats." (20 words, 8 s; with public/intake/memo-nico.m4a in place it plays aloud and the words pace to it). Then its two tickets fly one at a time, 300 ms apart: ✓ Call Nico · Reminder · Sun 3 PM, then the open task "Make the résumé sticky on the homepage"; the month shows October and the 25th takes the red bar "Call Nico · 3 PM". About 11.5 s.
11. ANY ORDER. A press during a press is ignored. After the FIFTH the lock screen is the date and the clock: the phone is quiet. Six cards in the Stream, three bars on the calendar. Replay (the house pill) fades in at the foot; it puts everything back in one step.
12. NARROW SHEET (< 620 of the module): the lock screen smaller and centred, Intake under it at the sheet's width, the month under that (the bars' times drop). REDUCED MOTION: no opening, no arc, no paging, no typing; a press shows the card and the bar at once.

The sheet's height never changes: the phone is an aspect ratio, Intake's panel is the phone's height with its list
reserved, the month is five rows at a fixed height, the foot is one slot (runline · Replay).

## The haters

- "Five presses? Nobody clicks five times." → One press already shows the whole idea in two seconds: the thing opens, goes in, comes out a ticket, and the calendar turns to the day. The rims say what is left; the memo is the one worth waiting for.
- "A month grid under two columns is a lot of object." → It is the one view everyone can read at a glance, and it is the after: the calendar he no longer opens, filling itself. A strip of numerals was not it; this is drawn the way his phone draws it.
- "Where is the noise, if his notifications are off?" → The noise is the five shapes: a photo, a screenshot, a link, a memo, two words at 1:41 AM, all in the same grey glass, nothing done. The after is the same five sorted into kinds, two of them already done. Junk with words only got in the way.

## The DRAFT words (every word on screen, Jon's to rewrite)

Band (objects-copy.ts, WATCH_COPY.dek, unchanged): `Texts and memos in. Tickets out.`

The lock screen (src/data/intake-catchall.json; the clock, the date and the app names are iOS's):
- `Tuesday, October 20` · `9:41`
- Messages · Jon · now: `Photo` (the save-the-date; open: the photo)
- Messages · Jon · 3h ago: `Screenshot` (the concert email; open: the screenshot)
- Messages · Jon · 2h ago: `Saw this on Marketplace. Made me think about creative hardware controls for music.` (open: the listing)
- Intake · 4h ago: `Memo saved` · `0:18 · from your wrist` (open: the strip)
- Messages · Jon · 1:41 AM: `boots lena`

The memo (capture 32, the name swapped): `Remind me on Sunday afternoon to call Nico. I need to make a résumé on the homepage. Sticky, so it floats.`

Intake (the chrome words `Intake` · `Stream` · `Rows` · `Log`, the empty line and the tiles are the app's own; every card's age reads `today`):
- receipt: `Theo & June's wedding` · `Intake · Aug 28, 2027`
- receipt: `Thundercat, The Fillmore` · `Idea · Oct 27`
- open · idea: `Creative hardware controls for music (the RailDriver idea)` · the thumb · `facebook.com` · `Claude ✦` · `Zzzz` · `Add to…`
- open · idea: `Red boots for Lena (Christmas)` · the tiles
- receipt: `Call Nico` · `Reminder · Sun 3 PM`
- open · task: `Make the résumé sticky on the homepage` · the tiles

The month: `October 2026` · `August 2027` · the weekday letters; the bars `Theo & June's wedding` (red, the Intake calendar) · `Thundercat` (yellow, the Idea calendar) · `Call Nico` · `3 PM` (red)

The foot: the pill `Replay`. No hint, ever.

The live region (screen readers only), one sentence a press: `Filed: Theo & June's wedding, on the calendar August 28, 2027.` · `Filed: Thundercat at the Fillmore, an idea for October 27.` · `In the Stream: creative hardware controls for music.` · `In the Stream: red boots for Lena.` · `Memo filed: call Nico, a reminder for Sunday at 3 PM, and a card to make the résumé sticky.` · after the fifth: `Everything sorted. The phone is quiet.`
