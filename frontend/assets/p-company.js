// Company page: one dot for every listing in the data, at random places on the screen. As the page scrolls each check fades the dots that did not pass it, to the shade that says how far they got, and the number falls with them.
// Every dot has its own place from a fixed seed. With reduced motion the field sits finished, with the four counts under it.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const dot = (x, px, py, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill(); };
  const cv = document.querySelector('.c-dots'), small = document.querySelector('.c-aucs');
  const pitch = () => innerWidth > 900 ? 13 : 8;
  if (cv) {
    const C = cv.dataset.counts.split(',').map(Number), n = C[0], sec = cv.closest('.c-field'), run = sec.querySelector('.c-run');
    const keys = [...sec.querySelectorAll('[data-key]')], num = sec.querySelector('.c-read b'), say = sec.querySelector('.c-read span'), rest = [.13, .32, .62, 1];
    if (!reduce) sec.classList.add('c-live');
    // level says how many checks a listing passed: exactly C[j] dots reach level j, picked once from a fixed seed so the scatter never changes
    let seed = 20261106; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const order = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const level = new Uint8Array(n), wait = new Float32Array(n); order.forEach((k, rank) => { let l = 0; for (let j = 1; j <= 3; j++) if (rank < C[j]) l = j; level[k] = l; wait[k] = rnd(); });
    let g = null;
    const size = () => { const W = cv.clientWidth, d = Math.min(2, devicePixelRatio || 1); let P, H;
      if (reduce) { P = pitch(); H = Math.ceil(n / Math.max(1, Math.floor(W / P))) * P; cv.style.height = H + 'px'; }
      else { H = cv.clientHeight; P = Math.sqrt(W * H / n); for (let i = 0; i < 40; i++) { const cols = Math.floor(W / P), rows = Math.ceil(n / cols); if (rows * P <= H) break; P *= .985; } }
      const cols = Math.max(1, Math.floor(W / P)), rows = Math.ceil(n / cols), ox = (W - cols * P) / 2, oy = (H - rows * P) / 2;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d); const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); g = { x, W, H, P, cols, rows, ox, oy }; };
    // a runs from 0 (every listing dark) to 3 (only the ones that passed every check). Dots that fail check j fall to their shade while a crosses j - 1 to j, not all at once
    const paint = a => { const { x, W, H, P, cols, rows, ox, oy } = g, r = P * .35, N = 13, paths = Array.from({ length: N }, () => new Path2D());
      for (let i = 0; i < n; i++) { const l = level[i], k = l === 3 ? 0 : clamp((a - l - wait[i] * .55) / .45), al = 1 + (rest[l] - 1) * k, q = Math.round(al * (N - 1)), row = Math.floor(i / cols), px = ox + (i % cols + .5) * P + (row === rows - 1 ? (cols * rows - n) * P / 2 : 0), py = oy + (row + .5) * P; paths[q].moveTo(px + r, py); paths[q].arc(px, py, r, 0, 6.2832); }
      x.clearRect(0, 0, W, H); x.fillStyle = '#2847ce'; paths.forEach((p, q) => { if (!q) return; x.globalAlpha = q / (N - 1); x.fill(p); }); x.globalAlpha = 1; };
    size();
    if (reduce) { paint(3); addEventListener('resize', () => { size(); paint(3); }); }
    else {
      const words = keys.map(k => k.querySelector('span').textContent), at = a => { const i = Math.min(2, Math.floor(a)), f = clamp(a - i); return C[i] + (C[i + 1] - C[i]) * f; };
      let last = -1, lastI = -1;
      const show = a => { if (Math.abs(a - last) < .0005) return; last = a; paint(a); if (num) num.textContent = Math.round(at(a)).toLocaleString('en-US'); const i = Math.min(3, Math.floor(a + .5)); if (say && i !== lastI) { lastI = i; say.textContent = words[i]; } };
      const onScroll = () => { const r = run.getBoundingClientRect(), span = r.height - innerHeight, p = span > 0 ? clamp(-r.top / span) : 0; show(smooth(p, .12, .3) + smooth(p, .38, .56) + smooth(p, .64, .82)); };
      addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', () => { size(); last = -1; onScroll(); }); onScroll();
    }
  }
  if (small) { const draw = () => { const W = small.clientWidth, P = pitch(), n = +small.dataset.n, cols = Math.max(1, Math.floor(W / P)), rows = Math.ceil(n / cols), d = Math.min(2, devicePixelRatio || 1); small.style.height = rows * P + 'px'; small.width = W * d; small.height = rows * P * d; const x = small.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); for (let i = 0; i < n; i++) dot(x, (i % cols + .5) * P, (Math.floor(i / cols) + .5) * P, P * .34, '#0e1626'); }; draw(); addEventListener('resize', draw); }
})();
