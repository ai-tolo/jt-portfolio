import { c as createComponent } from './astro-component_fXe-XK7e.mjs';
import 'piccolore';
import { z as maybeRenderHead, Q as renderTemplate } from './params-and-props_C-Av644s.mjs';
import 'clsx';

const $$EmptyState = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$EmptyState;
  const { title, body, stats } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<section class="empty" data-astro-cid-rnm3wo2t> <h2 class="title" data-astro-cid-rnm3wo2t>${title}</h2> ${body && renderTemplate`<p class="body" data-astro-cid-rnm3wo2t>${body}</p>`} ${stats && renderTemplate`<dl class="stats" aria-label="Catalog status" data-astro-cid-rnm3wo2t> <div data-astro-cid-rnm3wo2t> <dt data-astro-cid-rnm3wo2t>Total</dt> <dd data-astro-cid-rnm3wo2t>${stats.by_category.reduce((n, c) => n + c.files, 0)} files</dd> </div> <div data-astro-cid-rnm3wo2t> <dt data-astro-cid-rnm3wo2t>Transcribed</dt> <dd data-astro-cid-rnm3wo2t>${stats.analysis.transcribed}</dd> </div> <div data-astro-cid-rnm3wo2t> <dt data-astro-cid-rnm3wo2t>Audio analyzed</dt> <dd data-astro-cid-rnm3wo2t>${stats.analysis.audio}</dd> </div> <div data-astro-cid-rnm3wo2t> <dt data-astro-cid-rnm3wo2t>Visual analyzed</dt> <dd data-astro-cid-rnm3wo2t>${stats.analysis.visual}</dd> </div> <div data-astro-cid-rnm3wo2t> <dt data-astro-cid-rnm3wo2t>.als projects</dt> <dd data-astro-cid-rnm3wo2t>${stats.als_projects}</dd> </div> </dl>`} </section>`;
}, "/Users/tolo/sites/jt-portfolio/src/components/portal/EmptyState.astro", void 0);

export { $$EmptyState as $ };
