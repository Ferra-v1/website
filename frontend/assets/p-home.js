// Home, the S2 sand board. Runs after site.js (which fades the .rv groups in once). Three jobs: the robot row on the first screen (built by the scroll, below), and two on the reader's input only:
// the price box (robot and year pickers give the worth today, the asking price and the auction price, and move the ring on the listings chart),
// and the four-prices tabs. The numbers in the page at load are the build's own; this only repeats the build's arithmetic for another pick.
(() => {
  const $ = id => document.getElementById(id);
  const src = $('h-px'); if (!src) return;
  const B = JSON.parse(src.textContent), rSel = $('h-r'), ySel = $('h-y');
  const [W, H, L, R, T, Bo, AMAX, PMAX] = B.geo, pw = W - L - R, ph = H - T - Bo;
  const cx = a => L + a / AMAX * pw, cy = u => T + ph - Math.min(u, PMAX) / PMAX * ph;
  const r100 = v => Math.abs(v) >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10;
  const usd = v => '$' + r100(v).toLocaleString('en-US');
  // the Prices page's estimate() for a robot opened by link: price paid is the robot's typical new price, its use is its first use
  const est = (id, y) => {
    const [level, fe, b, use, p] = B.x[id], age = Math.max(0, Math.min(30, B.now - y));
    const ask = Math.exp(level + fe - b * age), floor = ask * (age < 10 ? B.ar[0] : B.ar[1]);
    const [tau, beta] = B.ty[use], keep = Math.exp(-Math.pow(age * 12 / tau, beta));
    const arm = ask * Math.sqrt(age <= 9 ? B.ar[0] : B.ar[1]);
    return { age, ask, floor, likely: Math.sqrt(ask * floor), worth: Math.max(p * keep, Math.min(p, arm)) };
  };
  const NS = 'http://www.w3.org/2000/svg', svg = document.querySelector('.h-ch'), dots = svg.querySelector('.h-dots'), you = svg.querySelector('.h-you');
  let maker = null;
  const draw = mk => {
    if (mk === maker) return; maker = mk;
    const f = document.createDocumentFragment();
    (B.pts[mk] || []).forEach(([a, u]) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', cx(a).toFixed(1)); c.setAttribute('cy', cy(u).toFixed(1)); c.setAttribute('r', 3); f.appendChild(c); });
    dots.replaceChildren(f);
    $('h-ct').textContent = mk === 'all' ? 'Robot arms for sale, by age' : mk + ' arms for sale, by age';
    svg.setAttribute('aria-label', (mk === 'all' ? 'Robot' : mk) + ' arms for sale: asking price against age, with your robot ringed');
  };
  maker = B.x[rSel.value][5];
  const update = () => {
    const id = rSel.value, y = +ySel.value, e = est(id, y);
    $('h-w').textContent = usd(e.worth); $('h-a').textContent = usd(e.ask); $('h-u').textContent = usd(e.floor); $('h-l').textContent = usd(e.likely);
    $('h-lm').style.left = (e.ask > e.floor ? (e.likely - e.floor) / (e.ask - e.floor) * 100 : 50).toFixed(1) + '%';
    const href = `/price#r=${id}&y=${y}`;
    $('h-go').href = href;
    draw(B.x[id][5]);
    you.setAttribute('transform', `translate(${cx(Math.min(e.age, AMAX)).toFixed(1)} ${cy(e.worth).toFixed(1)})`);
  };
  rSel.addEventListener('change', update); ySel.addEventListener('change', update);
  // a reload or the back button can restore the pickers' last values: show the numbers for what they actually say
  if (rSel.value !== 'kuka-kr-210' || ySel.value !== '2020') update();

  // the four-prices tabs: click, or the arrow keys between them
  const tabs = [...document.querySelectorAll('.h-tabs [role=tab]')];
  const pick = t => tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $(b.getAttribute('aria-controls')).hidden = !on; });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', ev => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[ev.key]; if (!d) return;
      ev.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); pick(n);
    });
  });
})();

// The robot row (the earlier Home's opening, 2026-11-25). Six moving robots in cobalt dots. Their dots gather left to right as the reader scrolls the first stretch of the page and scatter again on the way up:
// progress is a pure function of scrollY (SPEED-RULES 4b), over 30% of a screen. A whole robot plays its own loop at 12 frames a second, repainted only when its frame changes, as one path per colour (rule 7),
// and rests while off screen (rule 10). Loop files load after the page has loaded, one every 60ms (rules 8 and 11). Reduced motion: each robot stands whole on its first frame.
(() => {
  const row = document.querySelector('.h-row'); if (!row) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, COB = getComputedStyle(document.documentElement).getPropertyValue('--c').trim() || '#2847ce', DEEP = getComputedStyle(document.documentElement).getPropertyValue('--deep').trim() || '#1e339b';
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const bots = [...row.querySelectorAll('canvas')].map(cv => ({ cv, ctx: cv.getContext('2d'), name: cv.dataset.loop, rows: +cv.dataset.rows, frames: null, f: 0, k: -1, t0: 0, n: 1, fps: 12, stale: true }));
  let on = true, span = 1, lastW = innerWidth;
  const size = b => { const w = b.cv.clientWidth, h = b.cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1); if (!w || !h) return; b.dpr = dpr; b.p = h / b.rows; const W2 = Math.round(w * dpr), H2 = Math.round(h * dpr); if (b.cv.width !== W2 || b.cv.height !== H2) { b.cv.width = W2; b.cv.height = H2; } b.stale = true; };
  const decode = (b, m) => { const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const per = m.per || Math.floor(im.width / m.w), W = c.width, N = W * c.height; let lo = 1e9, hi = 0, low = 0;
      const val = new Uint8Array(N), acc = new Uint8Array(N); for (let i = 0, j = 0; j < N; i += 4, j++) { val[j] = sz[i]; acc[j] = ac[i] > 127 ? 1 : 0; }
      for (let f = 0; f < m.frames; f++) { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h;
        for (let y = 0; y < m.h; y++) for (let X = 0, i = (oy + y) * W + ox; X < m.w; X++, i++) if (val[i]) { if (X < lo) lo = X; if (X > hi) hi = X; if (y > low) low = y; } }
      const decodeF = f => { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h, base = [], trim = [];
        for (let y = 0; y < m.h; y++) for (let X = 0; X < m.w; X++) { const i = (oy + y) * W + ox + X, v = val[i]; if (!v) continue; const s = Math.pow(v / 252, .72); (acc[i] || s > .86 ? trim : base).push(X, y, s); }
        const a = new Float32Array(base.length + trim.length); a.set(base); a.set(trim, base.length); a.n = base.length; return a; };
      b.frames = new Proxy(new Array(m.frames), { get: (t, k) => { if (typeof k === 'string' && k !== 'length') { const f = +k; if (Number.isInteger(f) && f >= 0 && f < m.frames) return t[f] || (t[f] = decodeF(f)); } return Reflect.get(t, k); } });
      b.lo = lo; b.hi = hi; b.dy = b.rows - 1 - low; b.n = m.frames; b.fps = m.fps || 12; size(b); b.cv._rz = { f: 0, n: b.n }; tick(performance.now()); };
    im.onload = ia.onload = done; im.src = m.src; ia.src = m.acc; };
  // the robot is centred in its canvas from its reach over every frame; its lowest dots stand on the canvas floor
  const paint = (b, k) => { const { ctx: c, p, dpr } = b, a = b.frames[b.f], n = a.length, wu = b.cv.clientWidth / p, dx = (wu - (b.hi + b.lo + 1)) / 2 + .5, dy = b.dy + .5;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, b.cv.width, b.cv.height);
    for (let part = 0; part < 2; part++) { c.fillStyle = part ? DEEP : COB; c.beginPath();
      for (let i = part ? a.n : 0, e = part ? n : a.n; i < e; i += 3) { let x = (a[i] + dx) * p, y = (a[i + 1] + dy) * p, r = Math.max(Math.min(.4, p * .3), p * .5 * a[i + 2]);
        if (k < 1) { const h = ((a[i] * 73 + a[i + 1] * 151) % 97) / 97, de = a[i + 1] / b.rows * .45 + h * .25, q = clamp((k - de) / .3), o = 1 - Math.pow(1 - q, 3); x += (1 - o) * (h - .5) * p * 26; y += (1 - o) * (h * 1.7 - 1.1) * p * 18; r *= .6 + .4 * o; }
        c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832); }
      c.fill(); } };
  const kOf = i => { if (reduce) return 1; const K = clamp(scrollY / span), st = i / bots.length * .45; return clamp((K - st) / .55); };
  let raf = 0;
  function tick(now) { raf = 0; let loop = false;
    bots.forEach((b, i) => { if (!b.frames) return; const k = kOf(i); if (k >= 1) { if (!b.t0) b.t0 = now; loop = !reduce; } else b.t0 = 0;
      const f = reduce || k < 1 ? 0 : Math.floor(Math.max(0, now - b.t0) / 1000 * b.fps) % b.n;   // a frame's time can read a hair before t0 (rAF stamps against performance.now), never a negative frame
      if (f !== b.f || k !== b.k || b.stale) { b.f = f; b.k = k; b.stale = false; b.cv._rz.f = f; if (on) paint(b, k); }
      b.fig = b.fig || b.cv.closest('.h-bot'); b.fig.classList.toggle('h-on', k >= 1); });
    if (loop && on && !document.hidden) raf = requestAnimationFrame(tick); }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const measure = () => { span = innerHeight * .3; bots.forEach(size); kick(); };
  measure();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; measure(); });   // rule 9: width changes only
  document.addEventListener('visibilitychange', kick);
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) { bots.forEach(b => { b.stale = true; }); kick(); } }).observe(row);
  // the loop files: after the page's own load, one every 60ms. Each canvas names its file in full, so the release fingerprints it
  const fetchAll = () => bots.forEach((b, i) => setTimeout(() => { const s = document.createElement('script'); s.src = b.cv.dataset.src;
    s.onload = () => { const m = (window.FERRA_SEQ || {})[b.name + '-ink']; if (m) decode(b, m); }; document.head.appendChild(s); }, i * 60));
  if (document.readyState === 'complete') fetchAll(); else addEventListener('load', fetchAll, { once: true });
})();
