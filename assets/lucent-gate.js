/* =========================================
   Lucent Scroll Gate (Hero -> Next Page)
   + Parallax content inside gate
   + Progressive resistance (light -> heavy)
   ========================================= */
(function () {
  if (window.__lucentGateInitialized) return;
  window.__lucentGateInitialized = true;

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hero = document.querySelector(".lucent-hero");
  if (!hero || reduce) return;

  const gate = document.querySelector("[data-lucent-gate]");
  if (!gate) return;

  const DEST_URL = gate.getAttribute("data-dest") || "/collections/all";
  const DIR = gate.getAttribute("data-dir") || "bottom"; // "bottom" | "right"
  const THRESHOLD = Number(gate.getAttribute("data-threshold") || 1800);

  // あなたの設定
  const FRICTION = 0.96;

  // ✅ Progressive resistance params
  // 軽い→重い の強さ（大きいほど後半きつい）
  const RESIST_K = 2; // 1.2〜2.0 推奨
  // 後半寄せ（大きいほど終盤で一気に重くなる）
  const RESIST_POW = 2.2; // 1.6〜2.4 推奨

  const NAV_ONCE = { fired: false };
  gate.dataset.dir = DIR;

  let targetP = 0;
  let visualP = 0;
  let raf = 0;

  let touchActive = false;
  let touchStartX = 0;
  let touchStartY = 0;

  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  // === Parallax amounts (px) ===
  const HEAD_UP = 280;
  const BOX_DOWN = 200;
  const ARROW_DOWN = 1250;

  const setCssFromProgress = (p) => {
    // gate slide (110% -> 0%)
    const t = (1 - p) * 110;
    gate.style.setProperty("--lucent-gate-t", `${t}%`);

    // content parallax
    gate.style.setProperty("--gate-head-y", `${-HEAD_UP * p}px`);
    gate.style.setProperty("--gate-box-y", `${-BOX_DOWN * p}px`);
    gate.style.setProperty("--gate-arrow-y", `${ARROW_DOWN * p}px`);
  };

  const setProgress = (p) => {
    targetP = clamp01(p);
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(animate);
  };

  const animate = () => {
    raf = 0;

    visualP = visualP * FRICTION + targetP * (1 - FRICTION);
    if (Math.abs(visualP - targetP) < 0.001) visualP = targetP;

    setCssFromProgress(visualP);

    if (!NAV_ONCE.fired && visualP >= 0.999) {
      NAV_ONCE.fired = true;
      setTimeout(() => window.location.assign(DEST_URL), 80);
      return;
    }

    if (visualP !== targetP) kick();
  };

  // ✅ “だんだん重くなる”をここで反映
  const addDelta = (delta) => {
    // pが進むほど分母が増えて、同じdeltaでも進まなくなる
    const p = targetP;
    const resist = 1 + RESIST_K * Math.pow(p, RESIST_POW);
    const dp = delta / THRESHOLD / resist;

    setProgress(targetP + dp);
    kick();
  };

  const forwardFromWheel = (e) => {
    const dy = e.deltaY || 0;
    const dx = e.deltaX || 0;

    if (DIR === "right") {
      return Math.abs(dx) > Math.abs(dy) ? dx : dy;
    }
    return dy;
  };

  const onWheel = (e) => {
    if (NAV_ONCE.fired) return;

    e.preventDefault();
    e.stopPropagation();

    addDelta(forwardFromWheel(e));
  };

  const onKeyDown = (e) => {
    if (NAV_ONCE.fired) return;

    const key = e.key;
    const forwardKeys =
      DIR === "right"
        ? ["ArrowRight", "PageDown", " ", "Enter"]
        : ["ArrowDown", "PageDown", " ", "Enter"];

    const backKeys =
      DIR === "right" ? ["ArrowLeft", "PageUp"] : ["ArrowUp", "PageUp"];

    if (forwardKeys.includes(key)) {
      e.preventDefault();
      addDelta(240);
    } else if (backKeys.includes(key)) {
      e.preventDefault();
      addDelta(-240);
    }
  };

  const onTouchStart = (e) => {
    if (NAV_ONCE.fired) return;
    if (!e.touches || e.touches.length !== 1) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (!touchActive || NAV_ONCE.fired) return;
    if (!e.touches || e.touches.length !== 1) return;

    e.preventDefault();
    e.stopPropagation();

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = touchStartX - x;
    const dy = touchStartY - y;

    touchStartX = x;
    touchStartY = y;

    const forward = DIR === "right" ? dx : dy;
    addDelta(forward * 2.2);
  };

  const onTouchEnd = () => {
    touchActive = false;
  };

  // init
  setCssFromProgress(0);

  // capture=true で他の処理に食われないようにする
  const wheelOpts = { passive: false, capture: true };
  hero.addEventListener("wheel", onWheel, wheelOpts);
  document.addEventListener("wheel", onWheel, wheelOpts);

  window.addEventListener("keydown", onKeyDown, { passive: false });

  hero.addEventListener("touchstart", onTouchStart, wheelOpts);
  hero.addEventListener("touchmove", onTouchMove, wheelOpts);
  hero.addEventListener("touchend", onTouchEnd, { passive: true });
})();
