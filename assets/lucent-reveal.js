/* =========================================
   Lucent Reveal Controller
   - Reveal .lucent-reveal via IntersectionObserver
   - If hero exists: reveal header AFTER hero reveal completes
   - After initial reveal completes: clear --lucent-delay (so magnetic reacts instantly)
   ========================================= */
(function () {
  if (window.__lucentRevealControllerInitialized) return;
  window.__lucentRevealControllerInitialized = true;

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.querySelector(".lucent-header-reveal");

  const allRevealEls = () =>
    Array.from(document.querySelectorAll(".lucent-reveal"));

  const heroTiles = () =>
    Array.from(document.querySelectorAll(".lucent-hero .lucent-reveal"));

  const hasHero = () => Boolean(document.querySelector(".lucent-hero"));

  const parseMs = (v) => {
    if (!v) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    if (s.endsWith("ms")) return Number.parseFloat(s);
    if (s.endsWith("s")) return Number.parseFloat(s) * 1000;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const getLucentDelayMs = (el) => {
    const inline = el.style.getPropertyValue("--lucent-delay");
    if (inline) return parseMs(inline);
    const computed = getComputedStyle(el).getPropertyValue("--lucent-delay");
    return parseMs(computed);
  };

  // Reduce motion: show everything immediately
  if (reduce) {
    allRevealEls().forEach((el) => el.classList.add("is-revealed"));
    if (header) header.classList.add("is-revealed");
    return;
  }

  // =========================================================
  // 1) IntersectionObserver: reveal elements when they enter
  // =========================================================
  const startIO = () => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          requestAnimationFrame(() => {
            entry.target.classList.add("is-revealed");
          });
          io.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    allRevealEls().forEach((el) => io.observe(el));

    document.addEventListener("shopify:section:load", (e) => {
      const container = e && e.target ? e.target : document;
      const newEls = Array.from(container.querySelectorAll(".lucent-reveal"));
      requestAnimationFrame(() => {
        newEls.forEach((el) => {
          if (!el.classList.contains("is-revealed")) io.observe(el);
        });
      });
    });
  };

  // =========================================================
  // 2) Header reveal AFTER hero reveal completes (if hero exists)
  // =========================================================
  const scheduleHeaderReveal = () => {
    if (!header) return;

    // ✅ heroが無いページは即表示
    if (!hasHero()) {
      requestAnimationFrame(() => header.classList.add("is-revealed"));
      return;
    }

    const tiles = heroTiles();

    // ✅ heroはあるのに tiles が取れない場合でも、少し待って出す（同時出し回避）
    if (!tiles.length) {
      setTimeout(() => header.classList.add("is-revealed"), 900);
      return;
    }

    const maxDelay = tiles.reduce(
      (m, el) => Math.max(m, getLucentDelayMs(el)),
      0,
    );

    const REVEAL_DURATION_MS = 900;
    const BUFFER_MS = 80;

    const headerDelay = maxDelay + REVEAL_DURATION_MS + BUFFER_MS;

    setTimeout(() => {
      header.classList.add("is-revealed");
    }, headerDelay);
  };

  // =========================================================
  // 3) Clear --lucent-delay AFTER initial reveal completes
  // =========================================================
  const scheduleClearDelays = () => {
    const els = allRevealEls();
    if (!els.length) return;

    const maxDelay = els.reduce(
      (m, el) => Math.max(m, getLucentDelayMs(el)),
      0,
    );

    const REVEAL_DURATION_MS = 900;
    const BUFFER_MS = 60;

    const clearAt = maxDelay + REVEAL_DURATION_MS + BUFFER_MS;

    setTimeout(() => {
      allRevealEls().forEach((el) => {
        el.style.setProperty("--lucent-delay", "0ms");
      });
    }, clearAt);
  };

  // =========================================================
  // Boot: ensure first paint happens before reveal starts
  // =========================================================
  const boot = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startIO();
        scheduleHeaderReveal();
        scheduleClearDelays();
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
