// Observes .reveal elements and fades them in as they enter the viewport.
// One-shot: once revealed, stays revealed. IntersectionObserver rather than
// CSS scroll-timeline for universal browser support.

const observer = new IntersectionObserver(
  (entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    }
  },
  { rootMargin: "0px 0px -15% 0px", threshold: 0 }
);

function observeAll() {
  document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
}

export function initReveal() {
  // Initial pass for any .reveal elements rendered statically
  observeAll();
  // Re-run after render.js finishes building the timeline
  document.addEventListener("timeline:rendered", observeAll);
}
