/* =========================================
   Lucent Magnetic Hover (Hero Panels)
   ========================================= */
(function () {
  if (window.__lucentMagneticInitialized) return;
  window.__lucentMagneticInitialized = true;

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // hoverできない環境は無効
  const canHover =
    window.matchMedia &&
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches;

  if (reduce || !canHover) return;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // 強さ（px）: 好みで 10〜22 くらい
  const DEFAULT_STRENGTH = 16;

  // 反応の範囲（0.0〜1.0）：端に近いほど強くしたいなら調整
  const DEFAULT_EASE = 1.0;

  const items = Array.from(document.querySelectorAll(".lucent-magnetic"));
  if (!items.length) return;

  items.forEach((el) => {
    const strengthAttr = el.getAttribute("data-magnetic");
    const strength = strengthAttr ? Number(strengthAttr) : DEFAULT_STRENGTH;
    const easeAttr = el.getAttribute("data-magnetic-ease");
    const ease = easeAttr ? Number(easeAttr) : DEFAULT_EASE;

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

      // 中心からの相対位置（-1〜1）
      const rx = (e.clientX - cx) / (rect.width / 2);
      const ry = (e.clientY - cy) / (rect.height / 2);

      // 適度に丸める（端で暴れにくい）
      const nx = clamp(rx, -1, 1);
      const ny = clamp(ry, -1, 1);

      // 吸着量
      targetX = nx * strength * ease;
      targetY = ny * strength * ease;

      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) rafId = requestAnimationFrame(apply);
      el.classList.remove("is-magnetic-active");
    };

    el.addEventListener("mouseenter", () => {
      el.classList.add("is-magnetic-active");
    });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    el.addEventListener("blur", reset);
  });

  // Theme editor の section 再読み込みにも対応
  document.addEventListener("shopify:section:load", (e) => {
    const root = e && e.target ? e.target : document;
    const newItems = Array.from(root.querySelectorAll(".lucent-magnetic"));
    newItems.forEach((el) => {
      // 既にイベントが付いてる可能性があるのでクラスでガード
      if (el.classList.contains("is-magnetic-wired")) return;
      el.classList.add("is-magnetic-wired");
    });
  });
})();
