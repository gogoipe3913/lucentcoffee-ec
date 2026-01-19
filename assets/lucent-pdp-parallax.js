(() => {
  const root = document.querySelector(".lucent-pdp");
  if (!root) return;

  const scroller = root.querySelector(".lucent-pdp__main");
  const mediaWrapper = root.querySelector(".product__media-wrapper");
  if (!scroller || !mediaWrapper) return;

  // 0.2〜0.6くらいが使いやすい（小さいほど遅い）
  const speedAttr = root.getAttribute("data-parallax-speed");
  const speed =
    speedAttr != null && !Number.isNaN(Number(speedAttr))
      ? Number(speedAttr)
      : 0.35;

  let raf = 0;

  const update = () => {
    raf = 0;
    const y = scroller.scrollTop;

    // ✅ 通常スクロール(-y)を、+y*(1-speed)で相殺 → 結果 -y*speed
    const ty = y * (1 - speed);

    mediaWrapper.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  scroller.addEventListener("scroll", onScroll, { passive: true });
  update();

  window.addEventListener("resize", () => update(), { passive: true });
})();
