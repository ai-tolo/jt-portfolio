# Intake, the top object: THE SEND (storyboard, 2026-10-20)

The argument in one line: the two things everyone already does, a text to yourself and a voice memo, come out sorted.
The sheet proves each with one object. The top object is the TEXT (this file). The watch under it is the MEMO (kept).

The lived moment: a paper save-the-date on the fridge. You take a picture. You text it to yourself. That is the whole
gesture, and it is the one everyone makes and never follows up on. The visitor makes the gesture: the press IS the
send. Then they watch it land ten months out on the calendar. Siri cannot read a photo, so this passes the one test.

Two phones, side by side (the AudioDex shape, the one that works). No captions, no rail, no labels: the two apps carry
their own names. Nothing presses itself; nothing moves the page; the phones hold one height from the first paint.
On a phone-sized sheet the two phones share one spot: Messages at rest, the Calendar crossfades over it as it lands.

## The beats (what is on screen · what moves · how long)

1. REST, left phone: Messages, the thread with himself (the J circle, "Jon ›"). Above the fold of the screen, the older things he sent himself: a concert email screenshot at the top edge, a Marketplace screenshot, and the line "Saw this on Marketplace. Made me think about creative hardware controls for music." with Delivered under it. Still.
2. REST, left phone, the composer: the photo of the save-the-date sits in the field, the blue send arrow lit. The touch rim breathes on this phone. The foot says `tap send`. Still.
3. REST, right phone: Calendar, October 2026, today ringed, nothing on it. Still. (Narrow sheet: this phone is not shown yet.)
4. PRESS (0 ms): the rim stops; the runline starts filling in the foot, linear over the run (3,000 ms).
5. 0 to 420 ms: the photo rises out of the composer into the thread as a sent bubble (blue frame, the tail corner); the older bubbles slide up to make room; the composer empties to "iMessage".
6. 520 ms: Delivered moves under the photo. Left phone is finished; nothing else happens on his end.
7. 520 to 1,200 ms: a hold. The system is reading the photo. (Narrow sheet: the Calendar phone crossfades over Messages from 900 ms, 400 ms.)
8. 1,200 to 2,100 ms: the calendar pages forward, October → August 2027, ten months at 90 ms each, the today ring gone after the first page.
9. 2,300 ms: Saturday the 28th takes the bar, "Theo & June's wedding · all day", in the Intake calendar's red, scaling in over 260 ms. The runline reaches full and fades (400 ms).
10. 3,000 ms: done. The state holds: the photo in the thread, the wedding on the calendar. The Replay pill fades in at the foot (the house's 0.8 s delay).
11. REPLAY: the photo returns to the composer, the calendar returns to October, the rim breathes again. A press runs it again.
12. REDUCED MOTION: no runline, no paging, no rise; the press swaps rest for landed in one step.

## The haters

- "Two phones again? That's AudioDex." → Yes, on purpose: one sheet system, and a before and after needs a before and an after. AudioDex is search; this is a send.
- "A save-the-date? Low stakes." → It is the ordinary thing everyone photographs and never files, and the date is ten months out: the exact thing that dies in your camera roll. The watch under it carries the harder case (the wedding memo).
- "I don't see 'tickets' or a feed. Where's the system?" → The calendar is the benefit; a stranger reads it with zero words. The watch under it shows the ticket cards. The fold shows the hood.

## The DRAFT words (every word on screen, Jon's to rewrite)

Band (objects-copy.ts, WATCH_COPY.dek): `Texts and memos in. Tickets out.` (was "Memos and texts in. Tickets out.": the sheet now reads text first, memo second)

On the left phone (src/data/intake-thread.json; the phone's own chrome is iOS's):
- the contact: `Jon`
- the older line, his own (capture 53): `Saw this on Marketplace. Made me think about creative hardware controls for music.`
- `Delivered` (iOS's word)
- the composer's placeholder: `iMessage` (iOS's word)

On the right phone (the Calendar's chrome is iOS's): the month names, the weekday letters, the numerals, `Today · Calendars · Inbox`; the landing: `Theo & June's wedding` · `all day`

The foot: the hint `tap send` · the pill `Replay`

The live region (screen readers only): `Sent to yourself. Reading the photo.` → `On the calendar: Theo and June's wedding, Saturday, August 28, 2027.`
