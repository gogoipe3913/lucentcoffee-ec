/* =========================================
   Lucent Reveal Controller
   - Ensure first paint happens in "hidden/blur" state
   - Then start revealing (so blur transition actually runs)
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
    document.querySelectorAll(".lucent-reveal").forEach((el) => {
      el.classList.add("is-revealed");
    });
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

  // ---- core reveal (IO)
  const startIntersectionReveal = (root) => {
    const els = Array.from(
      (root || document).querySelectorAll(".lucent-reveal"),
    );
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          // ✅ 次フレームで is-revealed（初期状態の描画を保証）
          requestAnimationFrame(() => {
            entry.target.classList.add("is-revealed");
          });

          io.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    els.forEach((el) => io.observe(el));

    document.addEventListener("shopify:section:load", (e) => {
      const container = e && e.target ? e.target : document;
      const newEls = Array.from(container.querySelectorAll(".lucent-reveal"));

      // section loadも「初期状態を描画→次フレームで観測」
      requestAnimationFrame(() => {
        newEls.forEach((el) => {
          if (!el.classList.contains("is-revealed")) io.observe(el);
        });
      });
    });
  };

  // ---- Header reveal timing
  const scheduleHeaderReveal = () => {
    if (!header) return;

    // index以外（ヒーローが無いページ）は即表示（でも1フレームは待つ）
    if (!heroTiles.length) {
      requestAnimationFrame(() => header.classList.add("is-revealed"));
      return;
    }

    const maxDelay = heroTiles.reduce(
      (m, el) => Math.max(m, getDelayMs(el)),
      0,
    );

    // CSSの .lucent-reveal の transform/filter が 1000ms 想定
    const HERO_DURATION_MS = 1000;

    const headerDelay = maxDelay + HERO_DURATION_MS;

    // load 待ちにすると遅いので、DOMContentLoaded後に開始（ただし描画は保証する）
    setTimeout(() => {
      header.classList.add("is-revealed");
    }, headerDelay);
  };

  // =========================================================
  // ✅ 重要：初期状態を「必ず」描画してから始める
  //
  // 1) DOMができる
  // 2) 1フレーム描画（opacity:0 + blur）
  // 3) 次フレームで IO開始（is-revealed が transition で効く）
  // =========================================================
  const boot = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startIntersectionReveal(document);
        scheduleHeaderReveal();
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
