import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { Q as renderTemplate, z as maybeRenderHead } from './params-and-props_C-Av644s.mjs';
import { r as renderComponent } from './entrypoint_-WXj-usK.mjs';
import { $ as $$PortalLayout, r as renderScript } from './PortalLayout_CTQtsFPU.mjs';
import { $ as $$Card } from './Card_yBg8K9-V.mjs';
import { $ as $$EmptyState } from './EmptyState_CrhBKp1J.mjs';
import { b as surprise, d as stats } from './console-api_CNnaN5n_.mjs';

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Index;
  const [surpriseResult, statsResult] = await Promise.all([surprise(), stats()]);
  const items = surpriseResult.ok ? surpriseResult.data.items : [];
  const current = surpriseResult.ok ? surpriseResult.data.current : null;
  const statsData = statsResult.ok ? statsResult.data : null;
  const surpriseError = !surpriseResult.ok ? surpriseResult.error : null;
  return renderTemplate`${renderComponent($$result, "PortalLayout", $$PortalLayout, { "title": "Surprise", "current": "surprise", "data-astro-cid-4d3t45dq": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="surface" data-astro-cid-4d3t45dq> <header class="surface-head" data-astro-cid-4d3t45dq> <div data-astro-cid-4d3t45dq> <p class="eyebrow" data-astro-cid-4d3t45dq>Surprise</p> <h1 class="title" data-astro-cid-4d3t45dq>What the brain picked for you</h1> ${current && (current.bpm || current.key) && renderTemplate`<p class="current" data-astro-cid-4d3t45dq>
Current project context: ${current.bpm && renderTemplate`<span data-astro-cid-4d3t45dq>${current.bpm} BPM</span>`} ${current.key && renderTemplate`<span data-astro-cid-4d3t45dq> · ${current.key}</span>`} </p>`} </div> <button type="button" id="refresh" class="refresh" data-astro-cid-4d3t45dq>↻ Refresh</button> </header> ${surpriseError && renderTemplate`<p class="error" role="alert" data-astro-cid-4d3t45dq>
Couldn't reach the M1 brain (${surpriseError.kind}). Showing what we have.
</p>`} ${items.length === 0 ? renderTemplate`${renderComponent($$result2, "EmptyState", $$EmptyState, { "title": "Nothing to surface yet", "body": "The Surprise picker activates once audio + visual analysis runs. Today the catalog has voice memos with transcripts but no spectral or color signals yet, so the picker has nothing to rank. Use Library to browse the catalog directly.", "stats": statsData, "data-astro-cid-4d3t45dq": true })}` : renderTemplate`<ul class="cards" id="surprise-cards" data-astro-cid-4d3t45dq> ${items.map((item) => renderTemplate`<li data-astro-cid-4d3t45dq>${renderComponent($$result2, "Card", $$Card, { "item": item, "reasons": item.reasons, "data-astro-cid-4d3t45dq": true })}</li>`)} </ul>`} </section> ` })} ${renderScript($$result, "/Users/tolo/sites/jt-portfolio/src/pages/portal/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/tolo/sites/jt-portfolio/src/pages/portal/index.astro", void 0);

const $$file = "/Users/tolo/sites/jt-portfolio/src/pages/portal/index.astro";
const $$url = "/portal";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
