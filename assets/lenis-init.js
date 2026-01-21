/* assets/lenis-init.js
 * Lucent Smooth Scroll: Global (window) + PDP (nested scroller)
 *
 * ✅ Global: whole page smooth scroll (Lenis)
 * ✅ PDP: smooth scroll inside .lucent-pdp__main (Lenis instance #2)
 * ✅ Global Lenis does NOT hijack wheel inside [data-lenis-prevent]
 * ✅ PDP edge handoff: near top/bottom, gradually blend scroll into Global (no “dead end”)
 * ✅ Stops while body is overflow-hidden* (drawer/modal)
 * ✅ Respects prefers-reduced-motion
 *
 * Required markup:
 * - body has .smooth-scroll-enabled (you already do this)
 * - PDP scroller: <div class="lucent-pdp__main" data-lenis-prevent>...</div>
 * - PDP content wrapper: <div class="lucent-pdp__main-inner">...</div>
 */

(() => {
  const ENABLE_CLASS = "smooth-scroll-enabled";

  const canUseLenis = () => {
    if (!document.body || !document.documentElement) return false;
    if (!document.body.classList.contains(ENABLE_CLASS)) return false;
    if (document.documentElement.classList.contains("shopify-design-mode"))
      return false;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return false;
    if (typeof window.Lenis !== "function") return false;
    return true;
  };

  const isBodyScrollLocked = () => {
    const b = document.body;
    if (!b) return false;
    return (
      b.classList.contains("overflow-hidden") ||
      b.classList.contains("overflow-hidden-mobile") ||
      b.classList.contains("overflow-hidden-tablet") ||
      b.classList.contains("overflow-hidden-desktop")
    );
  };

  /** @param {number} v */
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  /** @param {number} v @param {number} min @param {number} max */
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  const init = () => {
    if (!canUseLenis()) return;

    // -----------------------
    // 1) Global Lenis (window)
    // -----------------------
    const globalLenis = new window.Lenis({
      lerp: 0.07,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      smoothTouch: false,
      normalizeWheel: true,

      // ✅ IMPORTANT: do not hijack wheel/touch inside nested scrollers (e.g. PDP)
      prevent: (node) => !!node?.closest?.("[data-lenis-prevent]"),
    });

    // expose for debugging
    window.__lucentLenis = globalLenis;

    // -----------------------
    // 2) PDP Lenis (nested scroller)
    // -----------------------
    const pdpWrapper = document.querySelector(".lucent-pdp__main");
    const pdpContent = document.querySelector(".lucent-pdp__main-inner");

    /** @type {any|null} */
    let pdpLenis = null;

    if (pdpWrapper && pdpContent) {
      pdpLenis = new window.Lenis({
        wrapper: pdpWrapper,
        content: pdpContent,
        eventsTarget: pdpWrapper,

        // PDPは読む体験なので、少しだけ軽め/速めでもOK。好みで調整。
        lerp: 0.12,
        wheelMultiplier: 1,
        smoothWheel: true,
        smoothTouch: false,
        normalizeWheel: true,
      });

      window.__lucentLenisPdp = pdpLenis;
    }

    // -----------------------
    // rAF loop (single loop for both)
    // -----------------------
    let rafId = 0;
    const raf = (time) => {
      globalLenis.raf(time);
      if (pdpLenis) pdpLenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // -----------------------
    // Stop/Start when drawers/modals lock scroll
    // -----------------------
    const syncLockState = () => {
      const locked = isBodyScrollLocked();
      if (locked) {
        globalLenis.stop();
        if (pdpLenis) pdpLenis.stop();
      } else {
        globalLenis.start();
        if (pdpLenis) pdpLenis.start();
      }
    };

    syncLockState();
    const mo = new MutationObserver(() => syncLockState());
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // -----------------------
    // Resize hooks (Shopify editor / viewport changes)
    // -----------------------
    const safeResize = () => {
      try {
        globalLenis.resize();
      } catch (_) {}
      try {
        pdpLenis?.resize?.();
      } catch (_) {}
    };

    document.addEventListener("shopify:section:load", safeResize);
    document.addEventListener("shopify:section:unload", safeResize);
    window.addEventListener("resize", safeResize);

    // -----------------------
    // ✅ PDP edge handoff (blend into global)
    // -----------------------
    const setupPdpWheelHandoff = () => {
      if (!pdpWrapper || !pdpLenis) return;

      // ---- Tunables (feel free to adjust) ----
      const EDGE_EPS = 1; // px: what counts as "at the edge"
      const BLEND_ZONE = 100; // px: start blending within this distance from top/bottom
      const MAX_HANDOFF = 0.9; // 0..1: never instantly hand off 100% (reduces weirdness)

      // deltaMode normalize (trackpad / mouse)
      /** @param {WheelEvent} e */
      const normalizeDeltaY = (e) => {
        if (e.deltaMode === 1) return e.deltaY * 16; // lines -> px
        if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // pages -> px
        return e.deltaY; // px
      };

      /** @param {WheelEvent} e */
      const onWheel = (e) => {
        // browser zoom gesture
        if (e.ctrlKey) return;
        if (isBodyScrollLocked()) return;

        const dy = normalizeDeltaY(e);
        if (!dy) return;

        // if PDP has no scroll room, always pass to global
        const max = pdpWrapper.scrollHeight - pdpWrapper.clientHeight;
        const hasRoom = max > EDGE_EPS;

        if (!hasRoom) {
          e.preventDefault();
          const gCur =
            typeof globalLenis.targetScroll === "number"
              ? globalLenis.targetScroll
              : globalLenis.scroll;
          const gNext = clamp(gCur + dy, 0, globalLenis.limit);
          globalLenis.scrollTo(gNext, { immediate: false });
          return;
        }

        // distance to edges
        const top = pdpWrapper.scrollTop;
        const distToTop = top;
        const distToBottom = max - top;

        const scrollingDown = dy > 0;
        const nearBottom = distToBottom <= BLEND_ZONE;
        const nearTop = distToTop <= BLEND_ZONE;

        // We only take over when within blend zone.
        // Outside the zone, let PDP Lenis handle the wheel normally.
        if ((scrollingDown && nearBottom) || (!scrollingDown && nearTop)) {
          // how close to the edge? (0 far .. 1 at edge)
          const dist = scrollingDown ? distToBottom : distToTop;
          const t = 1 - clamp(dist / BLEND_ZONE, 0, 1); // 0..1
          const handoff = clamp01(t) * MAX_HANDOFF;

          // If we're not *really* near the edge yet, do nothing.
          // (This reduces early interference.)
          if (handoff <= 0.001) return;

          e.preventDefault();

          const toGlobal = dy * handoff;
          const toPdp = dy - toGlobal;

          // Move PDP target a bit (still smooth)
          const pCur =
            typeof pdpLenis.targetScroll === "number"
              ? pdpLenis.targetScroll
              : pdpLenis.scroll;
          const pNext = clamp(pCur + toPdp, 0, pdpLenis.limit);
          pdpLenis.scrollTo(pNext, { immediate: false });

          // Push remainder into global
          const gCur =
            typeof globalLenis.targetScroll === "number"
              ? globalLenis.targetScroll
              : globalLenis.scroll;
          const gNext = clamp(gCur + toGlobal, 0, globalLenis.limit);
          globalLenis.scrollTo(gNext, { immediate: false });

          return;
        }

        // If truly at the edge and still pushing, we can force a bit more handoff
        // to avoid "sticky" feeling at exact top/bottom.
        const atTop = distToTop <= EDGE_EPS;
        const atBottom = distToBottom <= EDGE_EPS;

        if ((scrollingDown && atBottom) || (!scrollingDown && atTop)) {
          e.preventDefault();

          const gCur =
            typeof globalLenis.targetScroll === "number"
              ? globalLenis.targetScroll
              : globalLenis.scroll;
          const gNext = clamp(gCur + dy, 0, globalLenis.limit);
          globalLenis.scrollTo(gNext, { immediate: false });

          return;
        }
      };

      // passive:false so we can preventDefault
      pdpWrapper.addEventListener("wheel", onWheel, { passive: false });
    };

    setupPdpWheelHandoff();

    // -----------------------
    // Smooth anchor links (global only)
    // -----------------------
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target?.closest?.('a[href^="#"]');
        if (!a) return;

        const href = a.getAttribute("href");
        if (!href || href === "#") return;

        // opt-out (skip links, etc.)
        if (a.hasAttribute("data-no-smooth-scroll")) return;

        // do not hijack anchors inside PDP scroller
        if (a.closest(".lucent-pdp__main")) return;

        const id = href.slice(1);
        const target = document.getElementById(id);
        if (!target) return;

        if (isBodyScrollLocked()) return;

        e.preventDefault();

        const headerH =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--header-height",
            ),
          ) || 0;

        globalLenis.scrollTo(target, {
          offset: -headerH,
          duration: 1.1,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });

        history.pushState(null, "", `#${id}`);
      },
      { capture: true },
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
