/* Read-only project preview: filtering runs locally, no customer data is collected. */
(() => {
  "use strict";
  const form = document.querySelector("[data-preview-filters]");
  if (!form) return;
  const grid = document.querySelector(".product-grid");
  const cards = [...grid.querySelectorAll("[data-preview-product]")];
  const count = document.querySelector("[data-catalog-count]");
  const empty = document.querySelector("[data-preview-empty]");
  const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const apply = () => {
    const params = new URLSearchParams(location.search);
    form.elements.q.value = params.get("q") || "";
    form.elements.categorie.value = params.get("categorie") || "";
    form.elements.tri.value = params.get("tri") || "selection";
    const query = normalize(form.elements.q.value.trim());
    const category = form.elements.categorie.value;
    let visible = 0;
    const sorted = [...cards];
    if (form.elements.tri.value.startsWith("prix-")) {
      const direction = form.elements.tri.value === "prix-desc" ? -1 : 1;
      sorted.sort((a, b) => direction * (Number(a.dataset.price) - Number(b.dataset.price)));
    }
    sorted.forEach((card) => {
      grid.append(card);
      card.hidden = Boolean((category && card.dataset.category !== category) || (query && !normalize(card.dataset.search).includes(query)));
      if (!card.hidden) visible++;
    });
    count.textContent = `${visible} concept${visible === 1 ? "" : "s"}`;
    empty.hidden = visible > 0;
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(form));
    history.pushState({}, "", `${location.pathname}?${params}#search`);
    apply();
  });
  window.addEventListener("popstate", apply);
  apply();
})();
