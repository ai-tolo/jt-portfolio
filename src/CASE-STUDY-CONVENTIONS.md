# Case-study rhythm conventions

The shared rulebook for restyling the individual case studies (the Lathe and the
others). It exists because the studies drifted: a quick audit of
`src/components/case-study` + `src/pages/case-studies` found **~65 distinct
font-sizes, 8 font-weights, and ~69 different cream text-opacities** in play, plus
a scattered set of section paddings and module margins. That is variation without
intent. These conventions replace the scatter with a **small, fixed, dynamic-but-
controlled** set — consistent by default, with named room for drama where it
counts.

> **Every per-study session (Lathe, Others) must read this file and conform to it
> before restyling its study.** New sizes/weights/shades outside these sets are a
> smell — if you reach for one, that's a signal to rethink the moment, not to add
> a value.

All tokens below already live on `.cs-body` (under `[data-theme="dark"]`) in
`src/components/case-study/CSLayout.astro`, or in `src/styles/tokens.css`. Reuse
them; don't hardcode new hex/rgba.

---

## 1. The de-numbering rule

**Remove the numeric ordinal label (`01 / 02 / 03 …`) from every section.**

- **KEEP** the section heading text and all content.
- **KEEP** the section breaks and the divider rule — just unnumbered.
- The reading **progress indicator** (the left-edge comet trail, `CSProgress.astro`,
  mounted once in `CSLayout.astro`) now carries the reader's orientation. It is
  scroll-linked, not section-linked, so it must stay decoupled from how many
  sections exist or what they're called.

**How:** stop passing the `num=` prop to `<CSSection>`. The component already
renders nothing when `num` is absent — no change to the primitive is needed.

```diff
- <CSSection num="03" title="Designing for the longer language first">
+ <CSSection title="Designing for the longer language first">
```

Scope of the change: **26 `num=` props** across four studies — chs (8), raylu (7),
crediverso (7), momence (4). **The Lathe (`the-console.astro`) already uses zero
numbered sections — it is the reference.** Each per-study session removes the
ordinals from its own page only.

---

## 2. Type set — the only roles allowed

Three families, three weights, eight roles. If a piece of text doesn't map to a
role below, it's using the wrong role.

**Families** (already loaded):
- **Geist** (`"Geist Variable"`) — running prose. The reading voice.
- **Mono** (`ui-monospace, SFMono-Regular, Menlo, monospace`) — the editorial /
  technical voice: titles, decks, eyebrows, pull-quotes, stats. The dominant
  case-study voice.
- **Space Grotesk** (`"Space Grotesk Variable"`) — **display / hero only.** Do not
  use below the hero.

**Weights:** `400` (regular) · `600` (semibold — labels, subheads) · `700` (bold —
titles, stats). Nothing else. (Old 500/800/900 → collapse to the nearest of these.)

| Role | Size | Family · weight · style | Shade |
|---|---|---|---|
| **Display** (hero title only) | `clamp(56px, 11vw, 144px)` | Space Grotesk · 700 | brand grad, or Cream |
| **Section title** (`h2`) | `clamp(28px, 4.5vw, 42px)` | Mono · 700 · italic | Cream |
| **Subhead** (`h3`, in-section) | `clamp(20px, 2.6vw, 26px)` | Mono · 600 · italic | Cream |
| **Lede / deck** | `clamp(17px, 2vw, 21px)` | Mono · 400 | Muted |
| **Pull-quote** | `22px` (hero pull `30px`) | Mono · 400 · italic | Cream |
| **Body** | `17px` / line-height `1.65` | Geist · 400 | Body |
| **Caption / meta** | `13px` | Mono · 400 | Muted |
| **Eyebrow / label** | `11px`, uppercase, `letter-spacing: 0.28em` | Mono · 600 | Dim |

Stats keep their existing treatment (`CSStatGrid`: Mono · 700 · italic,
`clamp(36px, 5vw, 56px)`), which is the Display row's numeric cousin — don't invent
a new number size.

Drama is allowed **within** these roles by going up one row (e.g. a closing pull-
quote at hero size), not by minting an in-between size. One oversized moment per
study, max — if everything shouts, nothing does.

### Text shades (replaces the ~69-stop opacity ladder)

Four cream shades + two line shades. Use the **token**, not a raw `rgba`.

| Name | Token | Value | Use |
|---|---|---|---|
| **Cream** | `var(--cs-text)` | `#f5f1e8` | headings, key words, `<strong>` |
| **Body** | — | `rgba(245, 241, 232, 0.88)` | running prose (the `.cs-main p` default) |
| **Muted** | `var(--cs-text-muted)` | `rgba(245, 241, 232, 0.62)` | decks, captions, secondary |
| **Dim** | `var(--cs-text-dim)` | `rgba(245, 241, 232, 0.38)` | eyebrows, labels, the quietest meta |
| **Line** | `var(--cs-line)` | `rgba(245, 241, 232, 0.10)` | hairline dividers, card borders |
| **Line-strong** | `var(--cs-line-strong)` | `rgba(245, 241, 232, 0.22)` | emphasis borders, hover |

### Brand pops (use sparingly — they earn attention)

`var(--brand-pink)` `#ff2761` · `var(--brand-orange)` `#ff5a3c` ·
`var(--brand-yellow)` `#ffb347` · `var(--brand-cyan)` `#0ec4fc` ·
`var(--brand-green)` `#00ff4d`.

The **one big gradient moment** is `var(--brand-grad)`
(`linear-gradient(90deg, #ff2761, #ff5a3c 50%, #ffb347)`) — reserved for the hero
title and pull-quote bars. The same gradient drives the progress comet, so the
page and its indicator read as one system. A brand colour is an accent, never body
text.

---

## 3. Spacing scale — vertical rhythm

One ladder for all vertical gaps. Pick a step; never a value in between. This is
where "consistent but with room for drama" lives — the ramp is tight at the small
end (prose rhythm) and has two deliberately large steps for act-breaks.

| Step | Value | Use |
|---|---|---|
| `xs` | `8px` | label → value; tight stacked lines |
| `sm` | `12px` | heading → its own deck; list rows |
| `md` | `18px` | paragraph → paragraph (the prose default) |
| `lg` | `24px` | prose block → small element |
| `xl` | `32px` | module → module, tight |
| `2xl` | `48px` | **module → module (default)** — figure, demo, stat grid, prose group |
| `3xl` | `64px` | module → module, loose |
| **`section`** | `clamp(72px, 10vw, 120px)` | **between top-level sections (default)** — replaces the old 80/64 mix |
| **`act`** | `clamp(120px, 16vw, 200px)` | a deliberate act-break before a turn in the story — **sparingly**, where it counts |

- **Section head → body** stays at `36px` (the `.cs-section-head` margin). Don't
  re-tune per study.
- **Between sections:** use `section` by default; reach for `act` only at a genuine
  narrative pivot (problem → turn, or before the close). Aim for **at most one or
  two `act` breaks** in a study.
- **Between modules inside a section:** `2xl` (48px) default; `xl`/`3xl` only with a
  reason.

The `--space-*` tokens in `tokens.css` are the public-site scale; this px ladder is
the case-study dialect of the same intent. Express gaps with these exact values.

---

## 4. Quick conformance checklist (per study)

- [ ] All `num=` props removed from `<CSSection>`; headings + content + breaks kept.
- [ ] Every text size maps to a **Type set** role; no new sizes introduced.
- [ ] Weights are only `400 / 600 / 700`.
- [ ] Text colours use the four shade **tokens** (or the `0.88` body value) — no
      stray `rgba(245,241,232, …)` stops.
- [ ] Vertical gaps come from the **spacing ladder**; `section` between sections,
      `act` used at most once or twice.
- [ ] Brand colour is accent-only; `--brand-grad` reserved for hero + pull bars.
- [ ] Page still reads cleanly with the left-edge progress comet (don't place
      sticky/fixed UI in the top-left that fights it).
