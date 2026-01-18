/* --- Mouse Stalker (Shopify Theme Safe) --- */
(function () {
  // hoverできる（=マウスがある）環境だけ有効化
  var canHover =
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canHover || reducedMotion) return;

  var root = document.documentElement;
  root.classList.add("has-mouse-stalker");

  var el = document.querySelector(".mouse-stalker");
  if (!el) return;

  var currentX = window.innerWidth / 2;
  var currentY = window.innerHeight / 2;
  var targetX = currentX;
  var targetY = currentY;

  var ease = 0.18; // 0.12〜0.24くらいで調整
  var rafId = null;

  function onMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
  }

  function tick() {
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    el.style.transform =
      "translate3d(" +
      currentX +
      "px," +
      currentY +
      "px,0) translate3d(-50%,-50%,0)";
    rafId = requestAnimationFrame(tick);
  }

  // hover判定（リンク/ボタンなど）
  function isHoverTarget(node) {
    if (!node || node === document) return false;
    // 必要ならセレクタ追加してOK
    return !!node.closest(
      "a, button, [role='button'], input, textarea, select, label, summary"
    );
  }

  function onOver(e) {
    if (isHoverTarget(e.target)) el.classList.add("is-hover");
  }
  function onOut(e) {
    // まだhover対象にいるなら外さない
    if (!isHoverTarget(e.relatedTarget)) el.classList.remove("is-hover");
  }

  function onDown() {
    el.classList.add("is-down");
  }
  function onUp() {
    el.classList.remove("is-down");
  }

  function onLeave() {
    el.style.opacity = "0";
  }
  function onEnter() {
    el.style.opacity = "1";
  }

  window.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("mouseover", onOver, { passive: true });
  document.addEventListener("mouseout", onOut, { passive: true });
  window.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("mouseleave", onLeave);
  window.addEventListener("mouseenter", onEnter);

  rafId = requestAnimationFrame(tick);

  // Shopifyのテーマエディタ上では無効化したい場合（任意）
  // if (window.Shopify && Shopify.designMode) { ...cleanupしてreturn; }
})();
