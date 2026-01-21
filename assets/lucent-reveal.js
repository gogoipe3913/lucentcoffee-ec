/* =========================================
   Lucent Reveal Controller
   - Hero tiles reveal first
   - Header reveals after hero completes
   ========================================= */
(function () {
  if (window.__lucentRevealControllerInitialized) return;
  window.__lucentRevealControllerInitialized = true;

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.querySelector(
    ".section-header .lucent-header-reveal",
  );
  const heroTiles = Array.from(
    document.querySelectorAll(".lucent-hero .lucent-reveal"),
  );

  // Reduce motion: reveal everything immediately
  if (reduce) {
    heroTiles.forEach((el) => el.classList.add("is-revealed"));
    if (header) header.classList.add("is-revealed");
    return;
  }

  // ---- helper: parse "--lucent-delay" from style / computed style
  const getDelayMs = (el) => {
    const inline = el.style.getPropertyValue("--lucent-delay");
    if (inline && inline.trim().endsWith("ms")) return parseFloat(inline);
    if (inline && inline.trim().endsWith("s")) return parseFloat(inline) * 1000;

    const computed = getComputedStyle(el).getPropertyValue("--lucent-delay");
    if (computed && computed.trim().endsWith("ms")) return parseFloat(computed);
    if (computed && computed.trim().endsWith("s"))
      return parseFloat(computed) * 1000;

    return 0;
  };

  // ---- Reveal by IntersectionObserver (for everything else)
  const revealIO = (root) => {
    const els = Array.from(
      (root || document).querySelectorAll(".lucent-reveal"),
    );
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    els.forEach((el) => io.observe(el));

    document.addEventListener("shopify:section:load", (e) => {
      const container = e && e.target ? e.target : document;
      const newEls = Array.from(container.querySelectorAll(".lucent-reveal"));
      newEls.forEach((el) => {
        if (!el.classList.contains("is-revealed")) io.observe(el);
      });
    });
  };

  // start IO
  revealIO(document);

  // ---- Header reveal timing
  // If no hero tiles (non-index pages), reveal header immediately
  if (!heroTiles.length) {
    if (header) header.classList.add("is-revealed");
    return;
  }

  // Compute: maxDelay + heroDuration + small buffer
  const maxDelay = heroTiles.reduce((m, el) => Math.max(m, getDelayMs(el)), 0);

  // NOTE: CSSの .lucent-reveal の transform/filter が 1000ms なのでそれに合わせる
  const HERO_DURATION_MS = 1000;

  const headerDelay = maxDelay + HERO_DURATION_MS;

  // load を待つと遅く感じやすいので、まず 1フレーム後にタイマーを走らせる
  const start = () => {
    if (!header) return;
    setTimeout(() => {
      header.classList.add("is-revealed");
    }, headerDelay);
  };

  if (document.readyState === "complete") {
    requestAnimationFrame(start);
  } else {
    window.addEventListener("load", () => requestAnimationFrame(start), {
      once: true,
    });
  }
})();
