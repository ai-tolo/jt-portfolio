// THE GLOSS, the behavior (2026-10-23): one script for every page that marks a word (imported by Gloss.astro and by
// the watch, which writes its own buttons; the bundler keeps one copy). Delegated on the document, so a button a
// script writes later works the same.
//  · a hover (a fine pointer) shows the line after 120 ms and hides it on leave
//  · a click or a tap opens it and PINS it: it stays until a tap anywhere else, Esc, or a scroll past 80px; a second
//    tap on the same word closes it. On a phone the first tap opens it, nothing else happens
//  · keyboard focus shows it, leaving hides it
//  · one open at a time; the pop is fixed to the viewport, so it never moves the page
import { GLOSS, glossId } from "./gloss";

declare global { interface Window { __gloss?: boolean } }

if (!window.__gloss) {
  window.__gloss = true;
  const lines = new Map<string, string>(GLOSS.map((g) => [g.word, g.line]));

  // the lines, once: hidden, each the aria-describedby of its word's buttons
  const box = document.createElement("div");
  box.hidden = true;
  GLOSS.forEach((g) => {
    const s = document.createElement("span");
    s.id = glossId(g.word);
    s.textContent = g.line;
    box.append(s);
  });
  // the pop: what the eye reads (the reader hears the description), so it is hidden from assistive tech
  const pop = document.createElement("p");
  pop.className = "gl-pop";
  pop.setAttribute("aria-hidden", "true");
  document.body.append(box, pop);

  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
  let cur: HTMLButtonElement | null = null;
  let pinned = false;
  let hoverT = 0;
  let scrollAt = 0;

  const scroller = (): HTMLElement => {
    const main = document.querySelector("main");
    return main && getComputedStyle(main).overflowY === "auto" ? main : (document.scrollingElement as HTMLElement);
  };
  const place = () => {
    if (!cur) return;
    const r = cur.getClientRects()[0] ?? cur.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const below = r.bottom + 8;
    const top = below + ph > window.innerHeight - 8 && r.top - 8 - ph >= 8 ? r.top - 8 - ph : below;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    pop.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  const show = (b: HTMLButtonElement, pin: boolean) => {
    if (cur && cur !== b) cur.setAttribute("aria-expanded", "false");
    cur = b;
    pinned = pin;
    pop.textContent = lines.get(b.dataset.gl ?? "") ?? "";
    b.setAttribute("aria-expanded", "true");
    scrollAt = scroller().scrollTop;
    place();
    pop.setAttribute("data-on", "");
  };
  const hide = () => {
    window.clearTimeout(hoverT);
    if (cur) cur.setAttribute("aria-expanded", "false");
    cur = null;
    pinned = false;
    pop.removeAttribute("data-on");
  };
  const word = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLButtonElement>("button.gl") : null);

  document.addEventListener("pointerover", (e) => {
    const b = word(e.target);
    if (!b || e.pointerType !== "mouse" || !hoverable.matches || pinned || b === cur) return;
    window.clearTimeout(hoverT);
    hoverT = window.setTimeout(() => show(b, false), 120);
  });
  document.addEventListener("pointerout", (e) => {
    const b = word(e.target);
    if (!b || e.pointerType !== "mouse" || (e.relatedTarget instanceof Node && b.contains(e.relatedTarget))) return;
    window.clearTimeout(hoverT);
    if (cur === b && !pinned && !b.matches(":focus-visible")) hide();
  });
  document.addEventListener("click", (e) => {
    const b = word(e.target);
    if (!b) return;
    e.preventDefault();
    window.clearTimeout(hoverT);
    if (cur === b && pinned) hide();
    else show(b, true);
  });
  // a tap or a press anywhere but a word closes a pinned line (the word's own click decides for itself)
  document.addEventListener("pointerdown", (e) => {
    if (cur && !word(e.target)) hide();
  }, true);
  document.addEventListener("focusin", (e) => {
    const b = word(e.target);
    if (b && b.matches(":focus-visible") && b !== cur) show(b, false);
  });
  document.addEventListener("focusout", (e) => {
    const b = word(e.target);
    if (b && b === cur && !pinned) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cur) hide();
  });
  // scrolling: the line rides with its word, and closes once the page has moved 80px
  let raf = 0;
  document.addEventListener("scroll", () => {
    if (!cur) return;
    if (Math.abs(scroller().scrollTop - scrollAt) > 80) { hide(); return; }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(place);
  }, { capture: true, passive: true });
  window.addEventListener("resize", () => { if (cur) place(); });
}
