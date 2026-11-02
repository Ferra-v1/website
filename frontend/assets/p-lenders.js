// Lenders page.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // dots travel along the pricing flow once it is in view: the page's signature motion.
  // One dot per source runs continuously, 0.4s apart, and the animation pauses while the figure is off screen.
  const start = fig => fig.querySelectorAll('svg').forEach(svg => {
    svg.querySelectorAll('.mv').forEach(m => { const d = +m.dataset.delay || 0;
      setTimeout(() => m.querySelectorAll('animateMotion,animate').forEach(a => { try { a.beginElement(); } catch (x) {} }), 700 + d * 1000); });
  });
  const io = new IntersectionObserver(es => es.forEach(en => {
    const f = en.target;
    if (en.isIntersecting) {
      if (!f.dataset.go) { if (en.intersectionRatio >= .35) { f.dataset.go = 1; f.classList.add('in-view'); if (!reduce) start(f); } }
      else f.querySelectorAll('svg').forEach(s => s.unpauseAnimations());
    } else if (f.dataset.go) f.querySelectorAll('svg').forEach(s => s.pauseAnimations());
  }), { threshold: [0, .35] });
  document.querySelectorAll('.l-anim').forEach(f => io.observe(f));
})();
