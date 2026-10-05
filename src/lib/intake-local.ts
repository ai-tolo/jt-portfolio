// INTAKE, live · THE LOCAL PARSE (Stream A, 2026-10-05). A rule-based classifier in the stranger's browser: it runs
// when the Claude endpoint (src/pages/api/intake.ts) is unreachable, over budget, or has no key, and its result wears
// a `local parse` chip — the same provenance pattern the real Intake uses for its Ollama fallback. Never silent,
// never pretending to be the model. Pure (no DOM), erasable TS: node runs it for scripts/intake-fixtures.mjs.
//
// Shape of a parse: the memo → clauses (sentences, then the spoken joins: "and then", "also", "oh and", "and I…")
// → each clause classified by cue (execute / idea / task / reflection / music) → a ticket per clause that asks for
// something, in note voice (subjectless, imperative or noun phrase; 1–4 atomic points) → at most four tickets, the
// real parser's law (err toward fewer). "Just pretending" / "this is a test" → no tickets.
import { INTAKE_MAX_ITEMS, INTAKE_MAX_TICKETS, verdictsOf } from './intake-schema.ts';
import type { Kind, ParseResult, Ticket } from './intake-schema.ts';

const DAY = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun|tomorrow|tonight|today|this (?:morning|afternoon|evening|weekend|week)|next (?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:on |by )?the \\d{1,2}(?:st|nd|rd|th)|(?:january|february|march|april|may|june|july|august|september|october|november|december) \\d{1,2}(?:st|nd|rd|th)?)';
const TIME = '(?:\\d{1,2}(?::\\d{2})?\\s?(?:am|pm|a\\.m\\.|p\\.m\\.)|(?:at |around |by )\\d{1,2}(?::\\d{2})?\\b|noon|midday|midnight|(?:in the )?(?:morning|afternoon|evening)|at (?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\b)';
const RE_DAY = new RegExp(`\\b${DAY}\\b`, 'i');
const RE_TIME = new RegExp(`\\b${TIME}`, 'i');
const RE_WHEN = new RegExp(`\\b(${DAY})(?:[ ,]+(?:at |around |by )?(${TIME}))?|\\b(${TIME})(?:[ ,]+(?:on )?(${DAY}))?`, 'i');

const RE_PRETEND = /\b(just pretending|i'?m pretending|pretend(?:ing)? (?:this|that|it)|this is (?:just )?a test\b|testing(?:,| the| this)? (?:one two|watch|thing|mic)|ignore this|don'?t (?:actually )?(?:do|file|save) (?:this|that|any of (?:this|that)))/i;
const RE_REMIND = /\bremind me\b|\bset a reminder\b|\breminder\b/i;
const RE_CALENDAR = /\b(?:put|add|stick|get) (?:that|this|it)? ?(?:on|in|to) (?:the |my )?calendar\b|\bcalendar\b|\bappointment\b|\bbook(?:ed)? (?:a|the|my) (?:\w+ )?(?:slot|time|table|appointment)\b|\bmeeting (?:with|at|on)\b|\b(?:moved|rescheduled|scheduled) (?:my |the |our )?\w+ to\b/i;
const RE_IDEA = /\bwhat if\b|\bmaybe (?:we|i) (?:could|should|can)\b|\bi wonder\b|\bit (?:would|could|might) be (?:cool|nice|fun|neat|great|interesting)\b|\b(?:an? )?idea\b|\bi keep thinking\b|\bi'?ve been thinking\b|\bbeen thinking about\b|\bwouldn'?t it be\b|\bcould be (?:cool|fun|nice|neat)\b|\bthought about\b/i;
const RE_TASK_CUE = /\b(?:i |we )?(?:need|needs|have|got|ought|gotta) to\b|\bi should\b|\bwe should\b|\bi(?:'ve| have) to\b|\bi(?:'m| am) (?:going|gonna) to\b|\b(?:don'?t|do not) forget\b|\bmake sure\b|\bstill need\b|\bto[- ]do\b|\bi want to\b|\bi'?d like to\b|\bneed(?:s)? (?:a|an|some|new)\b/i;
const RE_IMPERATIVE = /^(?:call|phone|ring|email|text|message|buy|get|grab|pick up|fix|finish|send|book|order|cancel|return|renew|pay|schedule|clean|write|check|look into|follow up|sign up|update|submit|print|ask|find|drop off|wash|take|bring|move|replace|install|set up|reply|answer|read|review|plan|prep|pack|sort|tidy|put|cover|pull|mow|water|change|charge|back up|backup|file|post|share|try|swap|start|stop|sell|list|measure|paint|hang|mail|ship|refill|restock|renew)\b/i;
const RE_REFLECT = /\bi feel\b|\bi felt\b|\bfeels like\b|\bfelt like\b|\bhonestly\b|\btoday was\b|\bthis morning was\b|\bit was (?:good|rough|hard|nice|great|lovely|a lot|weird|fine|unreal)\b|\bi(?:'m| am) (?:so |really |just )?(?:tired|happy|sad|anxious|proud|glad|done|drained|grateful|frustrated|exhausted|relieved)\b|\bgrateful\b|\bfrustrat\w+\b|\bjust needed to say\b|\bsay it out loud\b|\bthinking out loud\b|\bno reason\b|\bunreal\b|\bbeautiful\b/i;
const RE_MUSIC = /\b(?:la la|da da|da dum|dum dum|na na|doo doo|hum|humming|melody|chorus|verse|riff|hook|the beat|bass ?line)\b/i;
const RE_PREAMBLE = /^(?:ok(?:ay)?|alright|all right|right|so|um+|uh+|hey|hi|note to self|brain ?dump|quick (?:one|note|thought)|here'?s (?:a |my )?(?:brain ?dump|list|the list)|things? (?:i|to) (?:need|have) to do|just (?:a )?(?:few|couple) (?:of )?things)[,.!:]?\s*/i;

const CONNECTORS = /\s*(?:,\s*)?\b(?:and then|and also|and after that|also|oh and|oh,? and|plus|then|next|secondly|second|thirdly|third|lastly|last thing|another thing|one more thing|first of all|first)\b,?\s+/gi;
const AND_SUBJECT = /\s*,?\s+and\s+(?=(?:i|i'?m|i'?ve|we|remind|put|add|what if|maybe|don'?t|make sure|the \w+ (?:in|on|at|needs?|is|moved)|there'?s)\b)|\s*,\s+(?=(?:i should|i need|i have to|i'?ve got to|i want to|i'?d like to|we should|we need|remind me|what if|maybe we|maybe i|don'?t forget|make sure)\b)/gi;

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const clean = (s: string): string => s.replace(/\s+/g, ' ').replace(/^[\s,;:.!?-]+|[\s,;:.!?-]+$/g, '').trim();
const cut = (s: string, max: number): string => {
  if (s.length <= max) return s;
  const c = s.slice(0, max);
  const at = c.lastIndexOf(' ');
  return (at > max * 0.5 ? c.slice(0, at) : c).replace(/[,;:\s]+$/, '') + '…';
};

/** The memo as clauses: sentences first, then the spoken joins inside each. Preamble clauses ("okay, brain dump") fall away. */
export function clauses(text: string): string[] {
  const out: string[] = [];
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+|\n+/);
  for (const s of sentences) {
    const parts = s.split(CONNECTORS).flatMap((p) => p.split(AND_SUBJECT));
    for (const p of parts) {
      let c = clean(p.replace(RE_PREAMBLE, ''));
      c = clean(c.replace(RE_PREAMBLE, ''));
      if (c.split(' ').length >= 2) out.push(c);
    }
  }
  return out;
}

const SUBJECT = /^(?:and |so |also |then |oh |well |yeah |yes |ok(?:ay)? |alright |um+ |uh+ |i think |i guess |i mean |i |we |should |could |will |might |gotta |really |just |i'?ve got to |i'?ve gotta |i gotta |i need to |i needs? to |we need to |i have to |i'?ve to |we have to |i should |we should |i want to |i'?d like to |i'?m going to |i'?m gonna |i(?:'m| am) supposed to |make sure (?:to |i |we )|don'?t forget to |remind me (?:on |this |next )?(?:\w+ )?(?:morning |afternoon |evening |night )?(?:at \w+ )?to |remind me to |remind me |remember to |still need to |i still need to |need to |have to |got to |to |please |could you |can you |what if (?:we |i |you )?|maybe (?:we |i )(?:could |should |can )?|i wonder if (?:we |i )?|i keep thinking about |i'?ve been thinking about |been thinking about |it would be (?:cool|nice|fun|neat|great) (?:to |if (?:we |i )?)|wouldn'?t it be (?:cool|nice|fun|neat|great) (?:to |if (?:we |i )?))+/i;
const PAST = new Map<string, string>([
  ['painted', 'paint'], ['tried', 'try'], ['made', 'make'], ['built', 'build'], ['started', 'start'], ['bought', 'buy'], ['got', 'get'], ['went', 'go'], ['did', 'do'],
  ['moved', 'move'], ['called', 'call'], ['added', 'add'], ['put', 'put'], ['had', 'have'], ['turned', 'turn'], ['swapped', 'swap'], ['hung', 'hang'], ['took', 'take'], ['ran', 'run'], ['set', 'set'], ['kept', 'keep'],
]);
const baseVerb = (w: string): string => PAST.get(w.toLowerCase()) ?? (/^[a-z]+ed$/i.test(w) && w.length > 4 ? w.replace(/(?:ied)$/i, 'y').replace(/(?:[^e])ed$/i, (m) => m[0]).replace(/ed$/i, '') : w);

/** Note voice: strip the speaker, lead with the verb, cut at a comfortable width. */
export function noteTitle(clause: string, kind: Kind): string {
  let t = clean(clause.replace(RE_PREAMBLE, ''));
  t = clean(t.replace(SUBJECT, ''));
  t = t.replace(/^(?:that |about |on |of )/i, '');
  if (kind === 'idea') { const [first, ...rest] = t.split(' '); t = [baseVerb(first), ...rest].join(' '); }
  t = t.replace(/\b(?:i|me|my|i'm|i've|i'd)\b/gi, (m) => ({ i: '', me: '', my: 'the', "i'm": '', "i've": '', "i'd": '' }[m.toLowerCase()] ?? m)).replace(/\s+/g, ' ');
  t = clean(t.replace(/^(?:the )?\w+ (?:is|are|was|were) (?:a|an|the) /i, (m) => m));
  if (kind === 'event' || kind === 'reminder') t = clean(t.replace(new RegExp(`\\b(?:to |on |for |at |by )?${DAY}\\b(?:[ ,]+(?:at |around |by )?${TIME})?`, 'i'), ' ').replace(new RegExp(`\\b(?:at |around |by )?${TIME}(?:[ ,]+(?:on )?${DAY})?`, 'i'), ' ')).replace(/\s+/g, ' ');
  if (kind === 'event') t = t.replace(/^the (\w+) moved (?:the |my |our )?/i, '$1 ').replace(/^(\w+) moved (?:the |my |our )?/i, '$1 ');
  const stop = t.search(/,|;| because | since | so (?:that|i|we) | it'?s | which | but /i);
  if (stop > 12) t = t.slice(0, stop);
  t = clean(t);
  return cap(cut(t, 60));
}

/** 1–4 atomic points from the clause: its comma- and and-separated parts, the title's own words left out. */
export function notePoints(clause: string, title: string, when?: string): string[] {
  const parts = clause.split(/,|;| and (?=\w)|\bbut\b|\bso\b(?= (?:a|the|i|we|just))/i).map((p) => clean(p.replace(RE_PREAMBLE, ''))).filter(Boolean);
  const pts: string[] = [];
  const tnorm = title.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  for (const p of parts) {
    let q = clean(p.replace(SUBJECT, '')).replace(/\b(?:i|me|my|i'm|i've)\b/gi, (m) => ({ i: '', me: '', my: 'the', "i'm": '', "i've": '' }[m.toLowerCase()] ?? m)).replace(/\s+/g, ' ');
    q = clean(q);
    if (!q || q.split(' ').length < 2) continue;
    const qn = q.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (tnorm.includes(qn) || qn.includes(tnorm)) continue;
    const tw = new Set(tnorm.split(' ').filter((w) => w.length > 2));
    const qw = qn.split(' ').filter((w) => w.length > 2);
    if (qw.length && qw.filter((w) => tw.has(w) || tw.has(baseVerb(w))).length / qw.length >= 0.7) continue;
    pts.push(cap(cut(q, 80)));
    if (pts.length >= INTAKE_MAX_ITEMS - (when ? 1 : 0)) break;
  }
  if (when) pts.unshift(when);
  if (!pts.length) pts.push(title);
  return pts.slice(0, INTAKE_MAX_ITEMS);
}

const whenOf = (clause: string): string | undefined => {
  const m = RE_WHEN.exec(clause);
  if (!m) return undefined;
  const day = m[1] ?? m[4];
  const time = m[2] ?? m[3];
  const tidy = (s?: string): string => (s ? s.replace(/^(?:at|around|by|on|in the) /i, '').replace(/\s?(am|pm)\b/i, ' $1').trim() : '');
  const HOURS: Record<string, string> = { one: '1:00', two: '2:00', three: '3:00', four: '4:00', five: '5:00', six: '6:00', seven: '7:00', eight: '8:00', nine: '9:00', ten: '10:00', eleven: '11:00', twelve: '12:00' };
  const d = cap(tidy(day));
  let t = tidy(time);
  if (HOURS[t.toLowerCase()]) t = HOURS[t.toLowerCase()];
  else if (/^\d{1,2}$/.test(t)) t = `${t}:00`;
  const daypart = /^(?:morning|afternoon|evening|noon|midday|midnight)$/i.test(t);
  const out = d && t ? `${d}${daypart ? ' ' : ' · '}${t}` : d || cap(t);
  return out || undefined;
};

export function classify(clause: string): { kind: Kind | 'store' | 'drop'; when?: string; complete?: boolean } {
  const c = clause;
  if (RE_MUSIC.test(c) && !RE_TASK_CUE.test(c) && !RE_IMPERATIVE.test(c)) return { kind: 'store' };
  const remind = RE_REMIND.test(c), calendar = RE_CALENDAR.test(c);
  if (remind || calendar) {
    const when = whenOf(c);
    const complete = !!when && (remind ? RE_DAY.test(c) || RE_TIME.test(c) : RE_DAY.test(c) && RE_TIME.test(c) || /\bmoved|rescheduled\b/i.test(c) && !!when);
    return { kind: remind ? 'reminder' : 'event', when, complete };
  }
  if (RE_IDEA.test(c)) return { kind: 'idea' };
  if (RE_TASK_CUE.test(c) || RE_IMPERATIVE.test(clean(c.replace(SUBJECT, '')))) return { kind: 'task' };
  if (RE_REFLECT.test(c)) return { kind: 'store' };
  return { kind: 'drop' };
}

/** The local parse: text → ParseResult (source 'local'). Pretending or testing → no tickets. */
export function localParse(text: string): ParseResult {
  const src = text.replace(/\s+/g, ' ').trim();
  if (!src) return { verdicts: ['store'], tickets: [], stored: null, source: 'local' };
  if (RE_PRETEND.test(src)) return { verdicts: ['store'], tickets: [], stored: 'A test, by its own account. Nothing filed.', source: 'local' };
  const tickets: Ticket[] = [];
  let storedBits: string[] = [];
  for (const c of clauses(src)) {
    const k = classify(c);
    if (k.kind === 'drop') continue;
    if (k.kind === 'store') { storedBits.push(c); continue; }
    const kind = k.kind;
    const title = noteTitle(c, kind);
    if (!title) continue;
    const t: Ticket = { kind, title, items: notePoints(c, title, k.when) };
    if (k.when) t.when = k.when;
    if ((kind === 'event' || kind === 'reminder') && k.complete) t.execute = true;
    tickets.push(t);
    if (tickets.length >= INTAKE_MAX_TICKETS) break;
  }
  const stored = tickets.length ? null : (storedBits.length ? cap(cut(clean(storedBits.join(', ')), 120)) : 'Nothing asked for. Nothing filed.');
  return { verdicts: verdictsOf(tickets), tickets, stored, source: 'local' };
}
