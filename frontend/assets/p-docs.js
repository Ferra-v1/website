// Methodology and privacy: the contents list follows the section being read, and one robot stands as the ruler for six prices.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the robot's height is what it cost. It starts whole and its solid part drains down to what it is worth today, once, when the reader reaches it.
  const lad = document.querySelector('.d-lad'), cv = lad && lad.querySelector('.d-lbot'), g = (window.FERRA_DOTS || {})['arm-l'];
  if (cv && g) {
    const raw = g.d.split(';').filter(Boolean).map(t => t.split(',').map(Number));
    const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), cols = Math.max(...xs) - x0 + 1, rows = Math.max(...ys) - y0 + 1;
    lad.style.setProperty('--ar', `${cols}/${rows}`);
    const pts = raw.map(([x, y, L, A, , ed]) => ({ x: x - x0 + .5, y: y - y0 + .5, h: (rows - (y - y0 + .5)) / rows, s: (A / 100) * Math.min(1, .28 + .72 * Math.pow(L / 100, .9) + (ed / 100) * .35) }));
    const end = +lad.dataset.v;
    let level = reduce ? end : 1;
    const paint = () => {
      const r = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      cv.width = w * r; cv.height = h * r; const c = cv.getContext('2d'); c.scale(r, r);
      const cell = Math.min(w / cols, h / rows), ox = 0, oy = h - rows * cell;
      [[true, 1, .46], [false, .26, .4]].forEach(([solid, al, k]) => {
        c.fillStyle = `rgba(40,71,206,${al})`; c.beginPath();
        for (const p of pts) { if ((p.h <= level) !== solid) continue; const X = ox + p.x * cell, Y = oy + p.y * cell, R = Math.max(.35, cell * k * (.55 + .45 * p.s)); c.moveTo(X + R, Y); c.arc(X, Y, R, 0, 6.2832); }
        c.fill();
      });
    };
    new ResizeObserver(paint).observe(cv); paint();
    if (!reduce) {
      const io = new IntersectionObserver(es => {
        if (!es.some(x => x.isIntersecting)) return; io.disconnect();
        const t0 = performance.now(), tick = t => { const k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3); level = 1 + (end - 1) * e; paint(); if (k < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }, { threshold: .45 });
      io.observe(cv);
    }
  }
  const links = [...document.querySelectorAll('.d-toc a')], secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!secs.length) return;
  // four reference sections start closed on a phone and stay plain sections on a wide screen. A link to one, or to anything inside one, opens it first.
  const folds = [...document.querySelectorAll('.d-cold')], phone = matchMedia('(max-width:720px)');
  const reveal = h => { const t = h && h.length > 1 && document.getElementById(h.slice(1)); if (!t) return; const d = t.querySelector(':scope > .d-cold') || t.closest('.d-cold'); if (d) d.open = true; return t; };
  const lay = () => { folds.forEach(d => { d.open = !phone.matches; }); const t = reveal(location.hash); if (t) t.scrollIntoView(); };
  folds.forEach(d => d.querySelector('summary').addEventListener('click', ev => { if (!phone.matches) ev.preventDefault(); }));
  document.addEventListener('click', ev => { const a = ev.target.closest && ev.target.closest('a[href^="#"]'); if (a) reveal(a.hash); });
  addEventListener('hashchange', () => reveal(location.hash));
  if (phone.matches) { lay(); if (location.hash) addEventListener('load', () => { const t = reveal(location.hash); if (t) t.scrollIntoView(); }); }
  phone.addEventListener('change', lay);
  const all = [...document.querySelectorAll('.d-toc a, .d-tocx a')], now = document.querySelector('.d-tocnow'), tocx = document.querySelector('.d-tocx');
  // the phone's sticky contents control also names the section being read
  const set = id => { all.forEach(a => a.classList.toggle('on', a.hash === '#' + id)); if (now) { const l = links.find(a => a.hash === '#' + id); now.textContent = l ? l.textContent : ''; } };
  const pick = () => { const y = 140; let cur = secs[0]; for (const s of secs) if (s.getBoundingClientRect().top - y <= 0) cur = s; set(cur.id); };
  let raf; addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pick); }, { passive: true });
  addEventListener('resize', pick); pick();
  // following a contents link on a phone closes the list again
  document.querySelectorAll('.d-tocx a').forEach(a => a.addEventListener('click', () => a.closest('details').removeAttribute('open')));
  // and so does a tap anywhere else, since the list sits over the text
  if (tocx) document.addEventListener('click', ev => { if (tocx.open && !tocx.contains(ev.target)) tocx.removeAttribute('open'); });
})();
