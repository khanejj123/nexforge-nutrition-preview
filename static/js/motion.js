(() => {
  "use strict";
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const wideScreen = matchMedia("(min-width: 901px)");
  const control = document.querySelector("[data-motion-toggle]");
  const motionKey = "nexforge-motion-paused-v1";
  let userPaused = false;
  try { userPaused = localStorage.getItem(motionKey) === "true"; } catch { /* Session-only fallback. */ }
  const enabled = () => !reducedMotion.matches && !userPaused;
  const transientAnimations = new Set();
  const hero = document.querySelector(".hero");
  let pointerFrame = 0;
  let revealObserver = null;
  const revealElements = [...document.querySelectorAll(
    ".section-heading, .product-card, .statement-art, .statement-copy, .process-grid>article, .page-heading, .detail-image, .detail-copy, .cart-line, .order-summary, .brand-page>h1, .brand-page-grid>div, .brand-words, .legal-page>h1, .legal-content, .contact-details, .confirmation>h1, .confirmation-reference, .confirmation-grid, .empty-state, .footer-grid>div"
  )];
  revealElements.forEach((element) => {
    element.classList.add("reveal-item");
    if (element.matches(".product-card, .process-grid>article, .footer-grid>div")) {
      const index = [...element.parentElement.children].indexOf(element);
      element.style.setProperty("--reveal-delay", `${Math.min(index * .08, .24)}s`);
    }
  });
  const reveal = (element) => {
    element.classList.add("is-revealed");
    revealObserver?.unobserve(element);
  };
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: .06, rootMargin: "0px 0px -24px 0px" });
    const scenes = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("motion-in-view", entry.isIntersecting));
    }, { threshold: 0 });
    document.querySelectorAll(".hero, .statement-art, .brand-page-art, .energy-banner").forEach((element) => scenes.observe(element));
  } else {
    revealElements.forEach(reveal);
    document.querySelectorAll(".hero, .statement-art, .brand-page-art, .energy-banner").forEach((element) => element.classList.add("motion-in-view"));
  }
  const clearPointerEffects = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    hero?.style.removeProperty("--hero-x");
    hero?.style.removeProperty("--hero-y");
    document.querySelectorAll(".has-pointer").forEach((element) => element.classList.remove("has-pointer"));
    document.querySelectorAll("[data-magnetic]").forEach((element) => {
      element.style.removeProperty("--magnetic-x");
      element.style.removeProperty("--magnetic-y");
    });
  };
  const syncMotion = () => {
    const active = enabled();
    root.dataset.motion = active ? "on" : "off";
    root.dataset.pageActive = String(!document.hidden);
    if (control) {
      control.hidden = false;
      control.disabled = reducedMotion.matches;
      control.setAttribute("aria-pressed", String(!active));
      const label = reducedMotion.matches ? "Animations réduites selon vos préférences" : active ? "Mettre les animations en pause" : "Activer les animations";
      control.setAttribute("aria-label", label);
      control.title = label;
    }
    if (!active) {
      revealElements.forEach(reveal);
      clearPointerEffects();
      transientAnimations.forEach((animation) => animation.cancel());
      transientAnimations.clear();
    } else if (revealObserver) {
      revealElements.filter((element) => !element.classList.contains("is-revealed")).forEach((element) => {
        const box = element.getBoundingClientRect();
        if (box.top < innerHeight && box.bottom > 0) reveal(element);
        else revealObserver.observe(element);
      });
    }
    root.classList.add("reveal-ready");
    window.dispatchEvent(new CustomEvent("nexforge:motionchange", { detail: { enabled: active } }));
  };
  control?.addEventListener("click", () => {
    userPaused = !userPaused;
    try { localStorage.setItem(motionKey, String(userPaused)); } catch { /* Session-only fallback. */ }
    syncMotion();
  });
  reducedMotion.addEventListener("change", syncMotion);
  const pointerAllowed = () => enabled() && finePointer.matches && wideScreen.matches;
  finePointer.addEventListener("change", clearPointerEffects);
  wideScreen.addEventListener("change", clearPointerEffects);
  window.addEventListener("storage", (event) => {
    if (event.key === motionKey) { userPaused = event.newValue === "true"; syncMotion(); }
  });
  document.addEventListener("visibilitychange", () => {
    root.dataset.pageActive = String(!document.hidden);
    if (document.hidden) clearPointerEffects();
  });
  document.addEventListener("focusin", (event) => {
    const parent = event.target.closest?.(".reveal-item");
    if (parent) reveal(parent);
  });
  // Native cross-page transitions are skipped when the visitor pauses motion.
  ["pageswap", "pagereveal"].forEach((name) => window.addEventListener(name, (event) => {
    if (!enabled()) event.viewTransition?.skipTransition();
  }));
  // Only one scroll write per animation frame; no scroll-jacking.
  const header = document.querySelector(".site-header");
  const progress = document.querySelector("[data-scroll-progress]");
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    const distance = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
    header?.classList.toggle("is-scrolled", scrollY > 18);
  };
  window.addEventListener("scroll", () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
  window.addEventListener("resize", () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); });
  updateScroll();
  hero?.addEventListener("pointermove", (event) => {
    if (!pointerAllowed() || hero.classList.contains("has-live-3d")) return;
    const box = hero.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width - .5) * 16;
    const y = ((event.clientY - box.top) / box.height - .5) * 10;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      if (pointerAllowed()) { hero.style.setProperty("--hero-x", `${x.toFixed(2)}px`); hero.style.setProperty("--hero-y", `${y.toFixed(2)}px`); }
      pointerFrame = 0;
    });
  }, { passive: true });
  hero?.addEventListener("pointerleave", () => { hero.style.removeProperty("--hero-x"); hero.style.removeProperty("--hero-y"); });
  document.querySelectorAll(".product-image").forEach((image) => {
    image.addEventListener("pointermove", (event) => {
      if (!pointerAllowed()) return;
      const box = image.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
      image.style.setProperty("--tilt-x", `${((.5 - y) * 6).toFixed(2)}deg`);
      image.style.setProperty("--tilt-y", `${((x - .5) * 6).toFixed(2)}deg`);
      image.style.setProperty("--shine-x", `${x * 100}%`);
      image.style.setProperty("--shine-y", `${y * 100}%`);
      image.classList.add("has-pointer");
    }, { passive: true });
    image.addEventListener("pointerleave", () => image.classList.remove("has-pointer"));
  });
  document.querySelectorAll(".hero-cta>.button, .process-section>.button").forEach((button) => {
    button.dataset.magnetic = "";
    button.addEventListener("pointermove", (event) => {
      if (!pointerAllowed()) return;
      const box = button.getBoundingClientRect();
      button.style.setProperty("--magnetic-x", `${((event.clientX - box.left - box.width / 2) * .04).toFixed(2)}px`);
      button.style.setProperty("--magnetic-y", `${((event.clientY - box.top - box.height / 2) * .06).toFixed(2)}px`);
    }, { passive: true });
    button.addEventListener("pointerleave", () => { button.style.removeProperty("--magnetic-x"); button.style.removeProperty("--magnetic-y"); });
  });
  document.querySelectorAll("[data-quantity-step]").forEach((button) => button.addEventListener("click", () => {
    if (!enabled()) return;
    const input = button.closest(".quantity-control")?.querySelector("input");
    if (!input?.animate) return;
    const animation = input.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 200, easing: "ease-out" });
    transientAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => transientAnimations.delete(animation));
  }));
  syncMotion();
})();
