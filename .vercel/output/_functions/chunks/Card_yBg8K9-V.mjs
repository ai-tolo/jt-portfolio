import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { z as maybeRenderHead, a3 as addAttribute, Q as renderTemplate } from './params-and-props_C-Av644s.mjs';
import 'clsx';

const $$Card = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Card;
  const { item, reasons, queueable = true } = Astro2.props;
  const tagList = (item.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6);
  const dateLabel = (() => {
    try {
      return new Date(item.modified).toLocaleString(void 0, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return item.modified;
    }
  })();
  return renderTemplate`${maybeRenderHead()}<article class="card"${addAttribute(item.path, "data-path")} data-astro-cid-26zz5gkz> <header class="meta" data-astro-cid-26zz5gkz> <span class="eyebrow" data-astro-cid-26zz5gkz>${item.category.replace(/_/g, " ")}</span> <span class="date" data-astro-cid-26zz5gkz>${dateLabel}</span> </header> <h3 class="title" data-astro-cid-26zz5gkz>${item.filename}</h3> ${item.summary && renderTemplate`<p class="summary" data-astro-cid-26zz5gkz>${item.summary}</p>`} ${(item.bpm || item.key) && renderTemplate`<p class="audio-meta" data-astro-cid-26zz5gkz> ${item.bpm && renderTemplate`<span data-astro-cid-26zz5gkz>${item.bpm} BPM</span>`} ${item.key && renderTemplate`<span data-astro-cid-26zz5gkz>${item.key}</span>`} ${item.content_type && renderTemplate`<span data-astro-cid-26zz5gkz>${item.content_type}</span>`} </p>`} ${tagList.length > 0 && renderTemplate`<ul class="tags" data-astro-cid-26zz5gkz> ${tagList.map((t) => renderTemplate`<li data-astro-cid-26zz5gkz>${t}</li>`)} </ul>`} ${reasons && reasons.length > 0 && renderTemplate`<p class="reasons" aria-label="Why this surfaced" data-astro-cid-26zz5gkz> <span class="reasons-label" data-astro-cid-26zz5gkz>Why:</span> ${reasons.join(" · ")} </p>`} <footer class="actions" data-astro-cid-26zz5gkz> ${queueable && renderTemplate`<button type="button" class="action queue" data-action="queue"${addAttribute(item.path, "data-path")} data-astro-cid-26zz5gkz>
+ Queue
</button>`} <a class="action listen"${addAttribute(`/portal/listen?from=single&path=${encodeURIComponent(item.path)}`, "href")} data-astro-cid-26zz5gkz>
Listen →
</a> </footer> </article>`;
}, "/Users/tolo/sites/jt-portfolio/src/components/portal/Card.astro", void 0);

export { $$Card as $ };
