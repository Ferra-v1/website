// Lenders page. Also loaded by the company page for the shared diagrams.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // dots travel along the diagram connectors a few times once the figure is in view
  const start = fig => fig.querySelectorAll('svg').forEach(svg => {
    if (!svg.getClientRects().length) return;
    const movers = [...svg.querySelectorAll('.mv')];
    movers.forEach((m, i) => setTimeout(() => m.querySelectorAll('animateMotion,animate').forEach(a => { try { a.beginElement(); } catch (x) {} }), 900 + i * 420));
  });
  if (!window.__ferraFlow) {
    window.__ferraFlow = 1;
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); en.target.classList.add('in-view'); if (!reduce) start(en.target); } }), { threshold: .35 });
    document.querySelectorAll('.l-anim').forEach(f => io.observe(f));
  }
  // term sheet: the notes on the left highlight the matching row; one pass on arrival, then follow the pointer or focus
  const ann = [...document.querySelectorAll('.l-ann li')], sheet = document.querySelector('.l-big .sheet');
  if (ann.length && sheet) {
    let touched = false;
    const set = r => { ann.forEach(a => a.classList.toggle('on', a.dataset.row === r)); sheet.querySelectorAll('.dr').forEach(d => d.classList.toggle('hl', d.dataset.row === r)); };
    ann.forEach(a => { const go = () => { touched = true; set(a.dataset.row); }; a.addEventListener('mouseenter', go); a.addEventListener('focus', go); a.addEventListener('click', go); });
    const io2 = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io2.disconnect();
      if (reduce) return set('3'); let k = 0; const step = () => { if (touched) return; set(String(k)); if (k < 3) { k++; setTimeout(step, 1300); } }; setTimeout(step, 600); }, { threshold: .45 });
    io2.observe(sheet);
  }
})();
