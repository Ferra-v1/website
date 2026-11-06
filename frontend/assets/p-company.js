// Company page: one dot for every listing in the data, darkest first, shaded by how far it got (found, priced, dated, sets the price). As it comes on screen, the whole field lands faint, then each stage darkens in turn and its line in the key comes up.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dot = (x, px, py, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill(); };
  const cv = document.querySelector('.c-dots'), small = document.querySelector('.c-aucs');
  const SH = ['rgba(40,71,206,.13)', 'rgba(40,71,206,.32)', 'rgba(40,71,206,.62)', '#2847ce'];
  const pitch = () => innerWidth > 900 ? 13 : 8;
  if (cv) {
    const C = cv.dataset.counts.split(',').map(Number), n = C[0], keys = [...document.querySelectorAll('[data-key]')];
    const size = () => { const W = cv.clientWidth, P = pitch(), cols = Math.max(1, Math.floor(W / P)), rows = Math.ceil(n / cols), d = Math.min(2, devicePixelRatio || 1); cv.style.height = rows * P + 'px'; cv.width = W * d; cv.height = rows * P * d; const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return { x, cols, P, W, H: rows * P }; };
    // stage s of 0 to 3 is fully shaded; f is how far the next stage has reached through its dots
    const paint = (g, s, f) => { const { x, cols, P, W, H } = g, r = P * .34; x.clearRect(0, 0, W, H);
      for (let i = 0; i < n; i++) { let k = 0; for (let j = 1; j <= 3; j++) if (i < C[j] && (j <= s || (j === s + 1 && i < C[j] * f))) k = j;
        dot(x, (i % cols + .5) * P, (Math.floor(i / cols) + .5) * P, r, SH[k]); } };
    let g = size(), done = reduce;
    if (reduce) paint(g, 3, 1); else { keys.forEach((k, i) => { if (i) k.style.opacity = '.25'; }); paint(g, 0, 0);
      new IntersectionObserver((es, io) => es.forEach(en => { if (!en.isIntersecting) return; io.disconnect();
        const t0 = performance.now(), D = 620, tick = t => { const a = (t - t0) / D - .2; const s = Math.min(3, Math.max(0, Math.floor(a))), f = Math.max(0, Math.min(1, a - s));
          paint(g, a >= 3 ? 3 : s, f); keys.forEach((k, i) => { if (a >= i - .15) k.style.opacity = ''; }); if (a < 3) requestAnimationFrame(tick); else done = true; }; requestAnimationFrame(tick); }), { threshold: .25 }).observe(cv); }
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { g = size(); paint(g, done ? 3 : 0, done ? 1 : 0); }, 120); });
  }
  if (small) { const draw = () => { const W = small.clientWidth, P = pitch(), n = +small.dataset.n, cols = Math.max(1, Math.floor(W / P)), rows = Math.ceil(n / cols), d = Math.min(2, devicePixelRatio || 1); small.style.height = rows * P + 'px'; small.width = W * d; small.height = rows * P * d; const x = small.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); for (let i = 0; i < n; i++) dot(x, (i % cols + .5) * P, (Math.floor(i / cols) + .5) * P, P * .34, '#0e1626'); }; draw(); addEventListener('resize', draw); }
})();
