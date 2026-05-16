import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { Q as renderTemplate, z as maybeRenderHead, a3 as addAttribute, F as Fragment } from './params-and-props_C-Av644s.mjs';
import { r as renderComponent } from './entrypoint_-WXj-usK.mjs';
import { $ as $$PortalLayout } from './PortalLayout_CTQtsFPU.mjs';
import { $ as $$Card } from './Card_yBg8K9-V.mjs';
import { $ as $$EmptyState } from './EmptyState_CrhBKp1J.mjs';
import { c as search, d as stats } from './console-api_CNnaN5n_.mjs';

const $$Library = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Library;
  const PAGE_SIZE = 25;
  const url = Astro2.url;
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = (() => {
    const n = parseInt(url.searchParams.get("limit") ?? "", 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : PAGE_SIZE;
  })();
  const category = url.searchParams.get("category") ?? "all";
  let results = [];
  let searchError = null;
  let truncated = false;
  if (q.length > 0) {
    const res = await search(q, { limit });
    if (res.ok) {
      results = res.data.results;
      truncated = results.length === limit;
    } else {
      searchError = res.error.kind === "http" ? `HTTP ${res.error.status}` : res.error.kind;
    }
  }
  const filtered = category === "all" ? results : results.filter((r) => r.category === category);
  const categoriesPresent = Array.from(new Set(results.map((r) => r.category))).sort();
  const statsResult = q.length === 0 ? await stats() : null;
  const statsData = statsResult?.ok ? statsResult.data : null;
  const nextLimit = limit + PAGE_SIZE;
  const buildHref = (overrides) => {
    const p = new URLSearchParams(url.searchParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    return qs ? `/portal/library?${qs}` : "/portal/library";
  };
  return renderTemplate`${renderComponent($$result, "PortalLayout", $$PortalLayout, { "title": "Library", "current": "library", "data-astro-cid-6lvxpu4b": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="surface" data-astro-cid-6lvxpu4b> <header class="surface-head" data-astro-cid-6lvxpu4b> <div data-astro-cid-6lvxpu4b> <p class="eyebrow" data-astro-cid-6lvxpu4b>Library</p> <h1 class="title" data-astro-cid-6lvxpu4b>Search the catalog</h1> </div> </header> <form method="GET" action="/portal/library" class="search-form" role="search" data-astro-cid-6lvxpu4b> <input type="search" name="q"${addAttribute(q, "value")} placeholder="Search transcripts, summaries, tags…" autocomplete="off" spellcheck="false" aria-label="Search the catalog" data-astro-cid-6lvxpu4b> <button type="submit" data-astro-cid-6lvxpu4b>Search</button> ${q && renderTemplate`<a class="reset" href="/portal/library" data-astro-cid-6lvxpu4b>Clear</a>`} </form> ${q.length === 0 ? renderTemplate`${renderComponent($$result2, "EmptyState", $$EmptyState, { "title": "Type to search", "body": "Search runs across transcripts, summaries, tags, and filenames. The M1 returns the most relevant matches.", "stats": statsData, "data-astro-cid-6lvxpu4b": true })}` : searchError ? renderTemplate`<p class="error" role="alert" data-astro-cid-6lvxpu4b>Search failed: ${searchError}</p>` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-6lvxpu4b": true }, { "default": async ($$result3) => renderTemplate` <div class="result-meta" data-astro-cid-6lvxpu4b> <p class="count" data-astro-cid-6lvxpu4b> <strong data-astro-cid-6lvxpu4b>${filtered.length}</strong> ${filtered.length === 1 ? "result" : "results"} ${category !== "all" && renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "data-astro-cid-6lvxpu4b": true }, { "default": async ($$result4) => renderTemplate` in <code data-astro-cid-6lvxpu4b>${category}</code>` })}`} <span class="muted" data-astro-cid-6lvxpu4b> for "${q}"</span> </p> ${categoriesPresent.length > 1 && renderTemplate`<ul class="chips" role="list" aria-label="Filter by category" data-astro-cid-6lvxpu4b> <li data-astro-cid-6lvxpu4b> <a${addAttribute(buildHref({ category: null }), "href")}${addAttribute(["chip", { active: category === "all" }], "class:list")} data-astro-cid-6lvxpu4b>all (${results.length})</a> </li> ${categoriesPresent.map((c) => renderTemplate`<li data-astro-cid-6lvxpu4b> <a${addAttribute(buildHref({ category: c }), "href")}${addAttribute(["chip", { active: category === c }], "class:list")} data-astro-cid-6lvxpu4b>${c.replace(/_/g, " ")} (${results.filter((r) => r.category === c).length})</a> </li>`)} </ul>`} </div> ${filtered.length === 0 ? renderTemplate`<p class="no-results" data-astro-cid-6lvxpu4b>No matches${category !== "all" && renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "data-astro-cid-6lvxpu4b": true }, { "default": async ($$result4) => renderTemplate` in this category` })}`}.</p>` : renderTemplate`<ul class="cards" data-astro-cid-6lvxpu4b> ${filtered.map((item) => renderTemplate`<li data-astro-cid-6lvxpu4b>${renderComponent($$result3, "Card", $$Card, { "item": item, "data-astro-cid-6lvxpu4b": true })}</li>`)} </ul>`}${truncated && filtered.length > 0 && renderTemplate`<p class="load-more-wrap" data-astro-cid-6lvxpu4b> <a class="load-more"${addAttribute(buildHref({ limit: String(nextLimit) }), "href")} data-astro-cid-6lvxpu4b>
Load more (${nextLimit} total)
</a> </p>`}` })}`} </section> ` })}`;
}, "/Users/tolo/sites/jt-portfolio/src/pages/portal/library.astro", void 0);

const $$file = "/Users/tolo/sites/jt-portfolio/src/pages/portal/library.astro";
const $$url = "/portal/library";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Library,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
