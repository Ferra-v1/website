// Vision page (sand build): no pinned scene and no scroll-driven stage. The films start as they arrive (site.js); with reduced motion they stay on their posters.
(() => {
  const root = document.querySelector('[data-page="vision.html"]'); if (!root) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.querySelectorAll('video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
})();
