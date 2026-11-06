// Company page: one dot for every listing in the data, plus the auction results in the dark colour. The film plays only while on screen.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video[data-film]').forEach(v => { if (reduce) return;
    new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause(); }), { rootMargin: '200px' }).observe(v); });
  const cv = document.querySelector('.c-dots'); if (!cv) return;
  const L = +cv.dataset.listings, A = +cv.dataset.auctions, N = L + A, x = cv.getContext('2d');
  // the auction dots sit in fixed scattered places (a small seeded shuffle), one to each stretch of the field, so none clumps and no pattern forms
  let sd = 17; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const isAuc = new Set(); for (let i = 0; i < A; i++) isAuc.add(Math.floor((i + .15 + rnd() * .7) * N / A));
  let raf = 0, started = false, order = null;
  const lay = () => {
    const W = cv.clientWidth, target = W > 820 ? 3.6 : 1.5;   // columns against rows: a wide band on a wide screen, a tall block on a phone
    const rows = Math.round(Math.sqrt(N / target)), cols = Math.ceil(N / rows), pitch = W / cols, d = Math.min(2, devicePixelRatio || 1);
    cv.width = W * d; cv.height = pitch * rows * d; cv.style.height = pitch * rows + 'px';
    return { W, rows, cols, pitch, d };
  };
  const draw = (g, count) => {
    x.setTransform(g.d, 0, 0, g.d, 0, 0); x.clearRect(0, 0, g.W, g.pitch * g.rows);
    for (let k = 0; k < count; k++) { const i = order[k], cx = (i % g.cols + .5) * g.pitch, cy = (Math.floor(i / g.cols) + .5) * g.pitch, auc = isAuc.has(i);
      x.fillStyle = auc ? '#0e1626' : '#2847ce'; x.beginPath(); x.arc(cx, cy, g.pitch * (auc ? .46 : .32), 0, 6.2832); x.fill(); }
  };
  const start = () => {
    cancelAnimationFrame(raf); const g = lay();
    if (!order) { order = Array.from({ length: N }, (_, i) => i); for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
    if (reduce || started === 'done') { draw(g, N); return; }
    started = true; const t0 = performance.now(), D = 1800;
    const tick = t => { const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 2.4); draw(g, Math.ceil(e * N)); if (p < 1) raf = requestAnimationFrame(tick); else started = 'done'; };
    raf = requestAnimationFrame(tick);
  };
  const g0 = lay(); order = Array.from({ length: N }, (_, i) => i); for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  if (reduce) draw(g0, N);
  else { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { threshold: .15 }); io.observe(cv); }
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { started = started ? 'done' : started; if (started) draw(lay(), N); }, 120); });
})();
