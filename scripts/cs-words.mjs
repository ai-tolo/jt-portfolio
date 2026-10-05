#!/usr/bin/env node
// cs-words · visible words on a served page (Stream C's before/after counts, 2026-10-05).
//   node scripts/cs-words.mjs http://localhost:4637/case-studies/chs/ [more urls…]
// Fetches the HTML, drops <script>/<style>/<template>/<svg>/<noscript> and tags, collapses whitespace, counts words
// (a word = a run of letters/digits with inner punctuation). Alt text and aria labels are not counted (not read as prose).
const urls = process.argv.slice(2);
if (!urls.length) { console.log('usage: node scripts/cs-words.mjs <url> [url…]'); process.exit(1); }
for (const u of urls) {
  const html = await (await fetch(u)).text();
  const text = html
    .replace(/<(script|style|template|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.\-]*/gu) ?? [];
  console.log(`${String(words.length).padStart(6)}  ${u}`);
}
