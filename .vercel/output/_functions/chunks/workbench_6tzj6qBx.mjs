import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { T as createRenderInstruction, Q as renderTemplate, z as maybeRenderHead, a3 as addAttribute } from './params-and-props_C-Av644s.mjs';
import { r as renderComponent } from './entrypoint_-WXj-usK.mjs';
import { $ as $$PortalLayout, r as renderScript } from './PortalLayout_CTQtsFPU.mjs';

function templateEnter(_result) {
  return createRenderInstruction({ type: "template-enter" });
}
function templateExit(_result) {
  return createRenderInstruction({ type: "template-exit" });
}

const $$Workbench = createComponent(async ($$result, $$props, $$slots) => {
  const BUILD_3_ACTIONS = [
    { id: "new-project", label: "Drop into new project" },
    { id: "add-existing", label: "Add to existing project" },
    { id: "stem-split", label: "Separate stems" },
    { id: "open-brief", label: "Open with brief" },
    { id: "send-preview", label: "Send private preview" }
  ];
  return renderTemplate`${renderComponent($$result, "PortalLayout", $$PortalLayout, { "title": "Workbench", "current": "workbench", "data-astro-cid-gslhcj3c": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="surface" data-astro-cid-gslhcj3c> <header class="surface-head" data-astro-cid-gslhcj3c> <div data-astro-cid-gslhcj3c> <p class="eyebrow" data-astro-cid-gslhcj3c>Workbench</p> <h1 class="title" data-astro-cid-gslhcj3c>Items you're working with</h1> <p class="subtitle" id="queue-summary" data-astro-cid-gslhcj3c>Loading…</p> </div> <div class="head-actions" data-astro-cid-gslhcj3c> <a class="listen-cta" id="listen-cta" href="/portal/listen?from=workbench" data-astro-cid-gslhcj3c>
Send to listening room →
</a> </div> </header> <p class="hint" data-astro-cid-gslhcj3c>
Queue state lives in your browser (localStorage). Action buttons below are stubbed for Build 2; the wiring lands in Build 3 with the Max for Live device.
</p> <div id="empty" class="empty" hidden data-astro-cid-gslhcj3c> <h2 data-astro-cid-gslhcj3c>Queue is empty</h2> <p data-astro-cid-gslhcj3c>Add items to your queue from Surprise, Library, or Projects with the <strong data-astro-cid-gslhcj3c>+ Queue</strong> button. They land here and persist across reloads.</p> </div> <ul id="queue-list" class="queue-list" aria-live="polite" data-astro-cid-gslhcj3c></ul>  <template id="card-tpl" data-astro-cid-gslhcj3c>${templateEnter()} <li class="wb-card" data-path="" data-astro-cid-gslhcj3c> <header class="meta" data-astro-cid-gslhcj3c> <span class="eyebrow-row" data-astro-cid-gslhcj3c>Queued</span> <button type="button" class="remove" data-action="unqueue" data-path="" aria-label="Remove from queue" data-astro-cid-gslhcj3c>✕</button> </header> <h3 class="name" data-astro-cid-gslhcj3c></h3> <p class="summary" data-astro-cid-gslhcj3c></p> <ul class="tags" data-astro-cid-gslhcj3c></ul> <p class="added" data-astro-cid-gslhcj3c></p> <footer class="actions" data-astro-cid-gslhcj3c> ${BUILD_3_ACTIONS.map((a) => renderTemplate`<button type="button" class="action"${addAttribute(a.id, "data-action-id")} disabled title="Coming in Build 3" data-astro-cid-gslhcj3c> ${a.label} </button>`)} <a class="action listen" data-listen-href="" data-astro-cid-gslhcj3c>Listen →</a> </footer> </li> ${templateExit()}</template> </section> ` })} ${renderScript($$result, "/Users/tolo/sites/jt-portfolio/src/pages/portal/workbench.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/tolo/sites/jt-portfolio/src/pages/portal/workbench.astro", void 0);

const $$file = "/Users/tolo/sites/jt-portfolio/src/pages/portal/workbench.astro";
const $$url = "/portal/workbench";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Workbench,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
