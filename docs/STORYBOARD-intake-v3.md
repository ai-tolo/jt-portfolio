# Intake, the top object: WHAT INTAKE REPLACED (storyboard, 2026-10-20, branch intake-v3)

The argument in one line: Jon's words, "all of my notifications are turned off. I don't even need the calendar app
interface on my phone." The phone as it was is noise. Intake is one sorted feed.

The lived moment: you pick up your phone. A dozen notifications are piled on the lock screen, four of them things you
sent yourself today (a photo of a save-the-date, a Marketplace link with a thought, a screenshot of a concert email,
"boots lena" texted to himself at 1:41 AM), eight of them everyone's junk. Beside it, Intake: the real app, empty. The press
sorts: the pile lifts off and the four things arrive in Intake as cards, two of them already done.

Two phones (the AudioDex shape). Intake is on screen from the first paint: its dark ground, its name, Stream · Rows ·
Log, its own empty line. The before is one shape you do not read (a pile); the after is the product's own surface.
Nothing presses itself; nothing moves the page; the phones hold one height from the first paint. On a phone-sized
sheet the two share one spot: the lock screen at rest, Intake crossfading over it once the pile is gone.

## The beats (what is on screen · what moves · how long)

1. REST, left phone: the LOCK SCREEN as it was. The clock, the date, and under them a dozen notifications piled to the bottom edge and past it. Four are his (Messages · You: the save-the-date photo; Messages · You: "Saw this on Marketplace…"; Messages · You: a screenshot of the concert email; Messages · You: "boots lena", 1:41 AM); eight are everyone's (Maybe: Spam Risk, a package, 20% off ends tonight, rain in 12 minutes, a liked photo, 14 new in #general, a streak about to end, a weekly screen-time report). Nothing is meant to be read. The touch rim breathes on this phone. The foot: `tap to sort`. Still.
2. REST, right phone: INTAKE, the real app: the dark ground, the brand, Stream · Rows · Log, an empty feed with its own line, "Stream clear. Talk to your wrist." Still. (Narrow sheet: not shown yet.)
3. PRESS (0 ms): the rim stops; the runline starts filling in the foot, linear over the run (3,460 ms).
4. 0 to 1,300 ms: the pile lifts. From the top down, 90 ms apart, each notification slides toward Intake and fades; the feed's empty line goes with them. The junk is simply gone: notifications off.
5. 500 ms: the first card lands at the top of the feed. A RECEIPT: the green ✓, "Theo & June's wedding", "Calendar · Aug 28 2027". The photo became a date. No words.
6. 1,100 ms: the second card: OPEN, the idea chip, "Creative hardware controls for music", the listing's thumbnail beside "Saw this on Marketplace.", the three tiles Claude ✦ · Zzzz · Add to….
7. 1,700 ms: the third: a RECEIPT, "Thundercat at the Fillmore", "Idea · Oct 27" (a real receipt in his db).
8. 2,300 ms: the fourth: OPEN, the idea chip, "Red boots for Lena", "Christmas", its tiles. (Cards land 600 ms apart: 500 · 1,100 · 1,700 · 2,300.)
9. 1,300 to 3,460 ms: the left phone is only the clock and the date on its wallpaper. Calm. (Narrow sheet: Intake crossfades over the cleared lock screen from 1,300.)
10. 3,460 ms: done (the last card settled at 2,760, then a 700 ms hold). The state holds: a quiet lock screen beside four sorted cards. The Replay pill fades in at the foot (the house's 0.8 s delay).
11. REPLAY: the pile is back, the feed is empty, the rim breathes again. A press runs it again.
12. REDUCED MOTION: no runline, no sweep, no drops; the press swaps rest for sorted in one step.

Where is Intake on screen: the right phone, from the first paint (its name, its tabs, its empty feed), and the whole
second half of the run. The left phone is the familiar thing it replaced, and it ends empty.

## The haters

- "Twelve notifications and four cards. It's still a list." → The pile is one shape nobody reads, and the feed is the product's own surface, four cards deep. The stranger watches noise become Intake; nothing on the sheet asks to be read through.
- "Notifications off is a Settings toggle. Where's the system?" → The toggle removes the noise. Intake is what lets him keep it off: the four things that mattered still arrive, two of them already done. Siri cannot do that.
- "A drawn lock screen on a portfolio. Cheesy." → It is drawn in iOS's own grammar, not screenshotted, and carries no words a stranger must read. It exists to be recognized in one glance and swept.

## The DRAFT words (every word on screen, Jon's to rewrite)

Band (objects-copy.ts, WATCH_COPY.dek): `Texts and memos in. Tickets out. Notifications off.` (was "Texts and memos in. Tickets out.")

The lock screen (src/data/intake-stream.json; the clock, the date and the app names are iOS's):
- `Tuesday, October 20` · `9:41`
- Messages · You · now: `Photo` (the save-the-date's thumbnail)
- Messages · You · 2h ago: `Saw this on Marketplace. Made me think about creative hardware controls for music.`
- Phone · 3h ago: `Maybe: Spam Risk` · `Missed Call`
- Messages · You · 3h ago: `Screenshot` (the concert email's thumbnail)
- Deliveries · 5h ago: `Delivered` · `Your package was left at the front door.`
- Mail · 6h ago: `Ends tonight: 20% off everything` · `Don't miss out. Your code is inside.`
- Weather · 7h ago: `Rain starting in 12 minutes` · `Stopping around 4 PM.`
- Messages · You · 1:41 AM: `boots lena`
- Social · Yesterday: `lena` · `liked your photo.`
- Work Chat · Yesterday: `#general` · `14 new messages`
- Streak · Yesterday: `Your streak ends in 3 hours!` · `Keep it alive with one quick lesson.`
- Screen Time · Sunday: `Weekly Report Available` · `Your screen time was up 14% last week.`

Intake's feed (src/data/intake-stream.json; the chrome words `Intake` · `Stream` · `Rows` · `Log` and the empty line are the app's own):
- empty: `Stream clear. Talk to your wrist.`
- (every card's age reads `today`, the app's own word for the same day)
- receipt: `Theo & June's wedding` · `Calendar · Aug 28 2027`
- open · idea: `Creative hardware controls for music` · `Saw this on Marketplace.` · tiles `Claude ✦` · `Zzzz` · `Add to…`
- receipt: `Thundercat at the Fillmore` · `Idea · Oct 27`
- open · idea: `Red boots for Lena` · `Christmas` · the tiles

The foot: the hint `tap to sort` · the pill `Replay`

The live region (screen readers only): `Notifications cleared. Intake is sorting.` → `Four things in Intake: two done, two waiting for you.`
