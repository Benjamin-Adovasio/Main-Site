document.addEventListener("DOMContentLoaded", () => {
  setupRevealObserver();
});

function setupRevealObserver() {
  // Animations disabled - show all elements immediately
  document.querySelectorAll("[data-animate]").forEach(element => {
    element.classList.add("visible");
  });
}
