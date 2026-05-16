import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { Q as renderTemplate, a3 as addAttribute, bh as renderHead } from './params-and-props_C-Av644s.mjs';
import 'clsx';
/* empty css                 */

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Login;
  const nextParam = Astro2.url.searchParams.get("next") ?? "";
  const hasError = Astro2.url.searchParams.get("error") === "1";
  return renderTemplate(_a || (_a = __template([`<html lang="en" data-astro-cid-uaub6dnk> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Portal</title><script>
      // Reuse the public site's theme bootstrap so the login surface matches
      // whatever theme Jon last left the site in. Falls back to Carbon.
      (() => {
        const valid = new Set(["dark", "powder", "field", "honey"]);
        try {
          const stored = localStorage.getItem("theme");
          document.documentElement.dataset.theme =
            stored && valid.has(stored) ? stored : "dark";
        } catch {
          document.documentElement.dataset.theme = "dark";
        }
      })();
    <\/script>`, '</head> <body data-astro-cid-uaub6dnk> <main class="auth" data-astro-cid-uaub6dnk> <form method="POST" action="/api/console/login" class="card" data-astro-cid-uaub6dnk> <p class="eyebrow" data-astro-cid-uaub6dnk>The Console</p> <h1 class="title" data-astro-cid-uaub6dnk>Portal</h1> <label class="field" data-astro-cid-uaub6dnk> <span class="label" data-astro-cid-uaub6dnk>Password</span> <input type="password" name="password" required autocomplete="current-password" autofocus spellcheck="false" data-astro-cid-uaub6dnk> </label> <input type="hidden" name="next"', ' data-astro-cid-uaub6dnk> <button type="submit" data-astro-cid-uaub6dnk>Enter</button> ', " </form> </main> </body> </html>"])), renderHead(), addAttribute(nextParam, "value"), hasError && renderTemplate`<p class="error" role="alert" data-astro-cid-uaub6dnk>Wrong password.</p>`);
}, "/Users/tolo/sites/jt-portfolio/src/pages/portal/login.astro", void 0);

const $$file = "/Users/tolo/sites/jt-portfolio/src/pages/portal/login.astro";
const $$url = "/portal/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
