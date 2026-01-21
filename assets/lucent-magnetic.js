/* =========================================
   Lucent Magnetic Hover
   - updates --mx / --my on .lucent-magnetic elements
   ========================================= */
(function () {
  if (window.__lucentMagneticInitialized) return;
  window.__lucentMagneticInitialized = true;

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canHover =
    window.matchMedia &&
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches;

  if (reduce || !canHover) return;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const DEFAULT_STRENGTH = 16;

  const wire = (el) => {
    const strengthAttr = el.getAttribute("data-magnetic");
    const strength = strengthAttr ? Number(strengthAttr) : DEFAULT_STRENGTH;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;

    const apply = () => {
      rafId = 0;
      el.style.setProperty("--mx", `${targetX}px`);
      el.style.setProperty("--my", `${targetY}px`);
    };

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const rx = (e.clientX - cx) / (rect.width / 2);
      const ry = (e.clientY - cy) / (rect.height / 2);

      const nx = clamp(rx, -1, 1);
      const ny = clamp(ry, -1, 1);

      targetX = nx * strength;
      targetY = ny * strength;

      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) rafId = requestAnimationFrame(apply);
      el.classList.remove("is-magnetic-active");
    };

    el.addEventListener("mouseenter", () =>
      el.classList.add("is-magnetic-active"),
    );
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    el.addEventListener("blur", reset);

    // 初期化済みマーク
    el.dataset.magneticWired = "1";
  };

  const init = (root) => {
    const items = Array.from(
      (root || document).querySelectorAll(".lucent-magnetic"),
    );
    items.forEach((el) => {
      if (el.dataset.magneticWired === "1") return;
      wire(el);
    });
  };

  init(document);

  document.addEventListener("shopify:section:load", (e) => {
    init(e.target);
  });
})();
