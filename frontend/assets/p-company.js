// Company page: the three pieces switch the product window; the hero orbit runs only while on screen and never with reduced motion.
// The diagram dots come from p-lenders.js, loaded by the page.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const orbit = document.querySelector('.c-orbit');
  if (orbit && !reduce) {
    let started = false;
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) {
        if (!started) { started = true; orbit.querySelectorAll('animateMotion').forEach(a => a.beginElementAt(-(+a.dataset.lag || 0))); }
        orbit.unpauseAnimations(); orbit.classList.add('go');
      } else if (started) orbit.pauseAnimations();
    }));
    io.observe(orbit);
  }
  const tabs = [...document.querySelectorAll('.c-tab')], wins = [...document.querySelectorAll('.c-win')], stage = document.querySelector('.c-stage');
  if (!tabs.length) return;
  const set = v => { tabs.forEach(t => { const on = t.dataset.view === v; t.classList.toggle('on', on); t.querySelector('button').setAttribute('aria-pressed', on); }); wins.forEach(w => w.classList.toggle('on', w.dataset.view === v)); };
  tabs.forEach(t => t.querySelector('button').addEventListener('click', () => set(t.dataset.view)));
  // at desktop, hold the stage at the tallest window so switching never moves the page; on one column let it follow the window
  const wide = matchMedia('(min-width: 1061px)');
  const fit = () => { stage.style.minHeight = ''; if (!wide.matches) return; let h = 0;
    wins.forEach(w => { w.style.display = 'block'; w.style.animation = 'none'; }); wins.forEach(w => { h = Math.max(h, w.offsetHeight); });
    wins.forEach(w => { w.style.display = ''; w.style.animation = ''; }); const pad = parseFloat(getComputedStyle(stage).paddingTop) * 2; stage.style.minHeight = (h + pad) + 'px'; };
  fit(); let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
})();
