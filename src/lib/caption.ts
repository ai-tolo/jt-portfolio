// Caption directive parser for Notion image blocks.
//
// Authors opt an image into a backdrop by including a {bg} or {bg:value}
// directive anywhere in the image's caption. The directive is stripped from
// the rendered caption.
//
//   {bg}           → cream (default)
//   {bg:cream}     → cream
//   {bg:anchor}    → var(--ink)
//   {bg:field}     → var(--bg)
//   {bg:pop}       → var(--accent)
//   {bg:#RRGGBB}   → arbitrary hex
//   {bg:#RRGGBBAA} → arbitrary hex with alpha
//
// Invalid values warn at build time and fall back to cream.
//
// Cream is a fixed hex (not a CSS var) because no single theme token holds
// the cream tone across all four themes — Carbon's chunks use --ink for
// cream while the other themes' chunks use --ink-fg. The directive's
// "cream" therefore resolves to a constant matching the existing
// hardcoded backdrop tone.

import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

const DIRECTIVE_RE = /\{bg(?::([^}]+))?\}/;
const HEX_RE = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;

const CREAM_HEX = "#F5F1E8";

const TOKEN_MAP: Record<string, { color: string; source: "token" | "hex" }> = {
  cream: { color: CREAM_HEX, source: "hex" },
  anchor: { color: "var(--ink)", source: "token" },
  field: { color: "var(--bg)", source: "token" },
  pop: { color: "var(--accent)", source: "token" },
};

export interface CaptionBg {
  color: string;
  source: "token" | "hex";
}

export interface ParsedCaption {
  bg: CaptionBg | null;
  rich: RichTextItemResponse[];
  plain: string;
}

export function parseCaption(
  rich: RichTextItemResponse[] | undefined | null,
  blockId?: string,
): ParsedCaption {
  if (!rich || rich.length === 0) {
    return { bg: null, rich: [], plain: "" };
  }

  // Walk segments, strip the first directive we find. Directives typed in
  // Notion almost always live inside a single rich_text segment because
  // they're contiguous plain text. A directive split across annotation
  // boundaries won't match and will render literally — acceptable.
  let raw: string | null = null;
  const stripped: RichTextItemResponse[] = rich.map((seg) => {
    if (raw !== null) return seg;
    const text = seg.plain_text ?? "";
    const m = DIRECTIVE_RE.exec(text);
    if (!m) return seg;
    raw = (m[1] ?? "").trim();
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    // If the directive was surrounded by whitespace on both sides, collapse
    // it to a single space so we don't leave a double-space behind. Don't
    // synthesize a space where the user didn't put one.
    const flankedByWS = /\s$/.test(before) && /^\s/.test(after);
    const joined = flankedByWS
      ? before.replace(/\s+$/, "") + " " + after.replace(/^\s+/, "")
      : before + after;
    return setText(seg, joined);
  });

  let normalized = stripped;
  if (raw !== null) {
    // Drop segments emptied by the strip, then trim the surviving ends.
    normalized = stripped.filter((s) => (s.plain_text ?? "") !== "");
    if (normalized.length > 0) {
      normalized = normalized.map((seg, i) => {
        let t = seg.plain_text ?? "";
        if (i === 0) t = t.replace(/^\s+/, "");
        if (i === normalized.length - 1) t = t.replace(/\s+$/, "");
        return setText(seg, t);
      });
      // Drop again if trimming emptied a segment.
      normalized = normalized.filter((s) => (s.plain_text ?? "") !== "");
    }
  }

  const bg = raw === null ? null : resolveBg(raw, blockId);
  const plain = normalized.map((s) => s.plain_text ?? "").join("");
  return { bg, rich: normalized, plain };
}

function setText(seg: RichTextItemResponse, text: string): RichTextItemResponse {
  const next: any = { ...seg, plain_text: text };
  const inner = (seg as any).text;
  if (inner) next.text = { ...inner, content: text };
  return next;
}

function resolveBg(raw: string, blockId?: string): CaptionBg {
  const value = raw.toLowerCase();
  if (value === "" || value === "cream") return TOKEN_MAP.cream;
  if (value in TOKEN_MAP) return TOKEN_MAP[value];
  if (HEX_RE.test(value)) return { color: value.toUpperCase(), source: "hex" };
  console.warn(
    `[caption] unrecognized {bg:${raw}} on block ${blockId ?? "unknown"}; falling back to cream.`,
  );
  return TOKEN_MAP.cream;
}
