import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { T as createRenderInstruction, z as maybeRenderHead, a3 as addAttribute, Q as renderTemplate, C as renderSlot, bh as renderHead } from './params-and-props_C-Av644s.mjs';
import { r as renderComponent } from './entrypoint_-WXj-usK.mjs';
/* empty css                 */
import 'clsx';

async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}</script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"></script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}

const $$TabStrip = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$TabStrip;
  const { current } = Astro2.props;
  const tabs = [
    { id: "surprise", label: "Surprise", href: "/portal" },
    { id: "library", label: "Library", href: "/portal/library" },
    { id: "projects", label: "Projects", href: "/portal/projects" },
    { id: "workbench", label: "Workbench", href: "/portal/workbench" }
  ];
  return renderTemplate`${maybeRenderHead()}<nav class="tabs" aria-label="Portal sections" data-astro-cid-6c2qp3ct> <ul role="list" data-astro-cid-6c2qp3ct> ${tabs.map((t) => renderTemplate`<li data-astro-cid-6c2qp3ct> <a${addAttribute(t.href, "href")}${addAttribute(["tab", { active: t.id === current }], "class:list")}${addAttribute(t.id === current ? "page" : void 0, "aria-current")} data-astro-cid-6c2qp3ct>${t.label}</a> </li>`)} </ul> </nav>`;
}, "/Users/tolo/sites/jt-portfolio/src/components/portal/TabStrip.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$PortalLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$PortalLayout;
  const { title, current, bare = false } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="en" data-astro-cid-lul3bfgs> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>', ' · Portal</title><script>\n      (() => {\n        const valid = new Set(["dark", "powder", "field", "honey"]);\n        const apply = () => {\n          try {\n            const stored = localStorage.getItem("theme");\n            document.documentElement.dataset.theme =\n              stored && valid.has(stored) ? stored : "dark";\n          } catch {\n            document.documentElement.dataset.theme = "dark";\n          }\n        };\n        apply();\n        window.addEventListener("pageshow", apply);\n      })();\n    <\/script>', "</head> <body data-astro-cid-lul3bfgs> ", ' <main class="portal-main" data-astro-cid-lul3bfgs> ', " </main>  ", "  ", " </body> </html>"])), title, renderHead(), !bare && renderTemplate`<header class="portal-header" data-astro-cid-lul3bfgs> <div class="inner" data-astro-cid-lul3bfgs> <a class="brand" href="/portal" aria-label="The Console — Portal home" data-astro-cid-lul3bfgs> <span class="dot" aria-hidden="true" data-astro-cid-lul3bfgs></span> <span data-astro-cid-lul3bfgs>The Console</span> </a> ${renderComponent($$result, "TabStrip", $$TabStrip, { "current": current, "data-astro-cid-lul3bfgs": true })} <form method="POST" action="/api/console/logout" class="logout" data-astro-cid-lul3bfgs> <button type="submit" aria-label="Log out" data-astro-cid-lul3bfgs>Log out</button> </form> </div> </header>`, renderSlot($$result, $$slots["default"]), renderScript($$result, "/Users/tolo/sites/jt-portfolio/src/layouts/PortalLayout.astro?astro&type=script&index=0&lang.ts"), renderScript($$result, "/Users/tolo/sites/jt-portfolio/src/layouts/PortalLayout.astro?astro&type=script&index=1&lang.ts"));
}, "/Users/tolo/sites/jt-portfolio/src/layouts/PortalLayout.astro", void 0);

export { $$PortalLayout as $, renderScript as r };
