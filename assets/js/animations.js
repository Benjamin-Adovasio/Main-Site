window.AdovasioMotion = {
  refresh(root = document) {
    root.querySelectorAll("[data-animate]").forEach(element => {
      element.classList.add("visible");
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.AdovasioMotion.refresh(document);
});
