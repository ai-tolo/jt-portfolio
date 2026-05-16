import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { Q as renderTemplate, z as maybeRenderHead, a3 as addAttribute } from './params-and-props_C-Av644s.mjs';
import { r as renderComponent } from './entrypoint_-WXj-usK.mjs';
import { $ as $$PortalLayout } from './PortalLayout_CTQtsFPU.mjs';
import { $ as $$EmptyState } from './EmptyState_CrhBKp1J.mjs';
import { p as projects, d as stats } from './console-api_CNnaN5n_.mjs';

const $$Projects = createComponent(async ($$result, $$props, $$slots) => {
  const [projResult, statsResult] = await Promise.all([projects(), stats()]);
  const projList = projResult.ok ? projResult.data.projects : [];
  const statsData = statsResult.ok ? statsResult.data : null;
  const projError = !projResult.ok ? projResult.error : null;
  const formatDate = (s) => {
    try {
      return new Date(s).toLocaleDateString(void 0, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return s;
    }
  };
  return renderTemplate`${renderComponent($$result, "PortalLayout", $$PortalLayout, { "title": "Projects", "current": "projects", "data-astro-cid-ggfqsx5q": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="surface" data-astro-cid-ggfqsx5q> <header class="surface-head" data-astro-cid-ggfqsx5q> <div data-astro-cid-ggfqsx5q> <p class="eyebrow" data-astro-cid-ggfqsx5q>Projects</p> <h1 class="title" data-astro-cid-ggfqsx5q>Ableton projects</h1> </div> </header> ${projError && renderTemplate`<p class="error" role="alert" data-astro-cid-ggfqsx5q>
Couldn't reach the M1 brain (${projError.kind}).
</p>`} ${projList.length === 0 ? renderTemplate`${renderComponent($$result2, "EmptyState", $$EmptyState, { "title": "No .als projects indexed yet", "body": "The Engine catalogs Ableton projects in Build 5 (backfill) or whenever Jon hits Save in a session. Tempo, scene count, track count, and sample lists land here once that runs.", "stats": statsData, "data-astro-cid-ggfqsx5q": true })}` : renderTemplate`<ul class="project-list" data-astro-cid-ggfqsx5q> ${projList.map((p) => renderTemplate`<li class="project" data-astro-cid-ggfqsx5q> <header class="meta" data-astro-cid-ggfqsx5q> <span class="eyebrow-row" data-astro-cid-ggfqsx5q>als project</span> <span class="date" data-astro-cid-ggfqsx5q>${formatDate(p.modified)}</span> </header> <h3 class="name" data-astro-cid-ggfqsx5q>${p.name}</h3> <dl class="metrics" data-astro-cid-ggfqsx5q> ${p.tempo != null && renderTemplate`<div data-astro-cid-ggfqsx5q><dt data-astro-cid-ggfqsx5q>Tempo</dt><dd data-astro-cid-ggfqsx5q>${p.tempo}</dd></div>`} ${p.scenes != null && renderTemplate`<div data-astro-cid-ggfqsx5q><dt data-astro-cid-ggfqsx5q>Scenes</dt><dd data-astro-cid-ggfqsx5q>${p.scenes}</dd></div>`} ${p.tracks != null && renderTemplate`<div data-astro-cid-ggfqsx5q><dt data-astro-cid-ggfqsx5q>Tracks</dt><dd data-astro-cid-ggfqsx5q>${p.tracks}</dd></div>`} ${p.samples != null && renderTemplate`<div data-astro-cid-ggfqsx5q><dt data-astro-cid-ggfqsx5q>Samples</dt><dd data-astro-cid-ggfqsx5q>${p.samples.length}</dd></div>`} </dl> <footer class="actions" data-astro-cid-ggfqsx5q> <button type="button" class="action" data-action="queue"${addAttribute(p.path, "data-path")} data-astro-cid-ggfqsx5q>+ Queue</button> </footer> </li>`)} </ul>`} </section> ` })}`;
}, "/Users/tolo/sites/jt-portfolio/src/pages/portal/projects.astro", void 0);

const $$file = "/Users/tolo/sites/jt-portfolio/src/pages/portal/projects.astro";
const $$url = "/portal/projects";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Projects,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
