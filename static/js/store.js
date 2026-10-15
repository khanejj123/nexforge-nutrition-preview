(() => {
  "use strict";
  const menu = document.querySelector(".menu-toggle");
  const nav = document.getElementById("mobile-nav");
  menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", String(!open));
    menu.setAttribute("aria-label", open ? "Ouvrir le menu" : "Fermer le menu");
    nav.hidden = open;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav && !nav.hidden) {
      nav.hidden = true;
      menu.setAttribute("aria-expanded", "false");
      menu.focus();
    }
  });
  document.querySelectorAll("[data-quantity-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".quantity-control").querySelector("input");
      const max = Math.min(Number(input.max) || 99, 99);
      input.value = Math.max(1, Math.min(max, (Number(input.value) || 1) + Number(button.dataset.quantityStep)));
    });
  });
  // Optional preferences never enable trackers: none are installed.
  const consentKey = "nexforge-consent-v1";
  const banner = document.getElementById("cookie-banner");
  const dialog = document.getElementById("cookie-dialog");
  const analytics = document.getElementById("cookie-analytics");
  const marketing = document.getElementById("cookie-marketing");
  let preferences = null;
  try {
    const saved = JSON.parse(localStorage.getItem(consentKey));
    if (saved && saved.version === 1 && typeof saved.analytics === "boolean" && typeof saved.marketing === "boolean") preferences = saved;
  } catch { /* Storage can be blocked by the browser. */ }
  if (banner) banner.hidden = Boolean(preferences);
  const saveConsent = (allowAnalytics, allowMarketing) => {
    preferences = { version: 1, necessary: true, analytics: allowAnalytics, marketing: allowMarketing, updated: new Date().toISOString() };
    try { localStorage.setItem(consentKey, JSON.stringify(preferences)); } catch { /* Applies for this visit. */ }
    banner.hidden = true;
    if (dialog.open) dialog.close();
  };
  const openPreferences = () => {
    analytics.checked = preferences?.analytics || false;
    marketing.checked = preferences?.marketing || false;
    dialog.showModal();
  };
  document.querySelectorAll("[data-cookie-open], [data-cookie-customize]").forEach((b) => b.addEventListener("click", openPreferences));
  document.querySelector("[data-cookie-accept]")?.addEventListener("click", () => saveConsent(true, true));
  document.querySelector("[data-cookie-reject]")?.addEventListener("click", () => saveConsent(false, false));
  document.querySelector("[data-cookie-save]")?.addEventListener("click", () => saveConsent(analytics.checked, marketing.checked));
  document.querySelector("[data-cookie-close]")?.addEventListener("click", () => dialog.close());
  // Load the real supplied video only on wide screens and normal connections.
  const video = document.querySelector(".hero-video");
  const threeStage = document.querySelector("[data-scene-3d]");
  const videoButton = document.querySelector("[data-video-toggle]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const wideScreen = matchMedia("(min-width: 901px)");
  const connection = navigator.connection;
  let videoInView = true;
  let videoFailed = false;
  let playbackEpoch = 0;
  const canPlay = () => videoInView && !videoFailed && (!threeStage || threeStage.dataset.sceneState === "fallback") && !video?.closest(".hero")?.classList.contains("has-live-3d") && wideScreen.matches && !reducedMotion.matches && document.documentElement.dataset.motion !== "off" && !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType);
  let userPaused = false;
  const syncVideo = () => {
    if (!video) return;
    const epoch = ++playbackEpoch;
    if (!canPlay()) { video.pause(); video.hidden = true; videoButton.hidden = true; return; }
    videoButton.hidden = false;
    if (userPaused) {
      video.pause();
      video.hidden = true;
      videoButton.textContent = "Animation : lecture";
      videoButton.setAttribute("aria-label", "Lire l’animation");
    } else {
      if (!video.getAttribute("src")) { video.src = video.dataset.src; video.autoplay = true; }
      video.hidden = false;
      video.play().then(() => {
        if (epoch !== playbackEpoch) return;
        videoButton.hidden = false;
        videoButton.textContent = "Animation : pause";
        videoButton.setAttribute("aria-label", "Mettre l’animation en pause");
      }).catch(() => {
        if (epoch !== playbackEpoch) return;
        video.hidden = true;
        videoButton.hidden = true;
      });
    }
  };
  video?.addEventListener("error", () => { videoFailed = true; video.hidden = true; videoButton.hidden = true; });
  videoButton?.addEventListener("click", () => {
    userPaused = !userPaused;
    syncVideo();
  });
  wideScreen.addEventListener("change", syncVideo);
  reducedMotion.addEventListener("change", syncVideo);
  window.addEventListener("nexforge:motionchange", syncVideo);
  window.addEventListener("nexforge:3dready", syncVideo);
  window.addEventListener("nexforge:3dfallback", syncVideo);
  if (video && "IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      videoInView = entries[0].isIntersecting;
      syncVideo();
    });
    videoObserver.observe(video.closest(".hero"));
  }
  syncVideo();
  document.addEventListener("visibilitychange", () => { if (document.hidden) video?.pause(); else syncVideo(); });
  // Failing remote product images fall back to the locally generated poster.
  document.querySelectorAll(".product-image img, .detail-image img, .cart-line-image img").forEach((image) => {
    image.addEventListener("error", () => {
      if (!image.dataset.fallback) { image.dataset.fallback = "true"; image.src = document.body.dataset.imageFallback || "/static/images/hero-poster.png"; }
    });
  });
  const city = document.getElementById("id_city");
  const summary = document.querySelector("[data-shipping-url]");
  const shippingText = document.querySelector("[data-shipping-value]");
  const totalText = document.querySelector("[data-total-value]");
  let quoteController = null;
  const money = (value) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(Number(value)) + " MAD";
  const updateQuote = async () => {
    if (!city || !summary) return;
    quoteController?.abort();
    if (!city.value) { shippingText.textContent = "Choisissez une ville"; totalText.textContent = "— MAD"; return; }
    quoteController = new AbortController();
    shippingText.textContent = "Calcul…";
    totalText.textContent = "Calcul…";
    try {
      const response = await fetch(summary.dataset.shippingUrl + "?city=" + encodeURIComponent(city.value), { signal: quoteController.signal, headers: { "Accept": "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("quote");
      const quote = await response.json();
      shippingText.textContent = Number(quote.shipping) === 0 ? "Offerte" : money(quote.shipping);
      totalText.textContent = money(quote.total);
    } catch (error) {
      if (error.name !== "AbortError") { shippingText.textContent = "Voir les frais par ville"; totalText.textContent = "Calculé à la confirmation"; }
    }
  };
  city?.addEventListener("change", updateQuote);
  if (city) updateQuote();
  const checkout = document.querySelector("[data-checkout-form]");
  checkout?.addEventListener("submit", () => { const button = checkout.querySelector("[data-order-submit]"); button.disabled = true; button.textContent = "Confirmation en cours…"; });
  window.addEventListener("pageshow", () => { const button = document.querySelector("[data-order-submit]"); if (button) { button.disabled = false; button.textContent = "Confirmer ma commande ↗"; } });
})();
