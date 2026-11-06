// Robots we price. FerraPlot holds what the robot pages and the price report share. The stage: a robot drawn with its own listings falls, as you scroll,
// into the chart of price by age. The shelf: every robot lights up one listing at a time when it comes into view.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const usd = v => '$' + Math.round(v).toLocaleString('en-US');
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const fit = cv => { const r = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); } const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h); return { c, w, h }; };
  // the robot as faint halftone, shaded the way dotbot.js shades it. Its bounds and one painted bitmap per size.
  const ghost = name => { const g = (window.FERRA_DOTS || {})[name + '-l']; if (!g) return null; if (!g.g2) { const pts = g.d.split(';').filter(Boolean).map(s => { const [x, y, L, A, , ed] = s.split(',').map(Number); return [x, y, (A / 100) * Math.min(1, .28 + .72 * Math.pow(L / 100, .9) + (ed / 100) * .35)]; }); let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } g.g2 = { pts, x0, x1, y0, y1 }; } return g.g2; };
  const ghostBitmap = (G, cell, alpha) => { const r = Math.min(devicePixelRatio || 1, 2), b = document.createElement('canvas'), cols = G.x1 - G.x0 + 1, rows = G.y1 - G.y0 + 1; b.width = Math.ceil(cols * cell * r); b.height = Math.ceil(rows * cell * r); const c = b.getContext('2d'); c.scale(r, r); for (const [x, y, s] of G.pts) { c.fillStyle = `rgba(255,255,255,${alpha * (.55 + .45 * s)})`; c.beginPath(); c.arc((x - G.x0 + .5) * cell, (y - G.y0 + .5) * cell, Math.max(.3, cell * .44 * s), 0, 6.2832); c.fill(); } return b; };
  // nice dollar ticks inside a range
  const TICKS = [300, 1000, 3000, 10000, 30000, 100000, 300000];
  // a tooltip that stays inside its parent
  const placeTip = (tip, par, x, y) => { tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight, W = par.clientWidth; tip.style.left = clamp(x - w / 2, 16, Math.max(16, W - w - 16)) + 'px'; tip.style.top = (y - h - 14 > 8 ? y - h - 14 : y + 16) + 'px'; };
  window.FerraPlot = { clamp, money, usd, ease, fit, TICKS, placeTip, reduce };

  // ---------------------------------------------------------------- one robot's page
  const root = document.querySelector('[data-stage]');
  if (root) stage(root);
  function stage(root) {
    const D = JSON.parse(root.querySelector('.r-data').textContent);
    const pin = root.querySelector('.r-pin'), plot = root.querySelector('.r-plot'), cv = root.querySelector('.r-cv'), ax = root.querySelector('.r-ax'), intro = root.querySelector('.r-intro'), read = root.querySelector('.r-read');
    const age = root.querySelector('.r-age'), range = age.querySelector('input'), th = root.querySelector('.r-th'), tip = root.querySelector('.r-tip');
    const [tb, ts, ta] = [tip.querySelector('b'), tip.querySelector('span'), tip.querySelector('a')];
    const G = ghost(D.bot);
    const live = !reduce;
    root.classList.add(live ? 'live' : 'still');
    const P = D.pts.map((p, i) => ({ age: p[0], usd: p[1], t: p[2], year: p[3], src: p[4], url: p[5], gx: p[6], gy: p[7], whole: p[8], d: (i * 7919 % 101) / 101, a: 10 + (i * 131 % 37), hi: 0 }));
    const A = D.auc.map(a => ({ age: a[0], usd: a[1], t: a[2], when: a[3], src: a[4], url: a[5], sold: true, hi: 0 }));
    let sel = D.age, p = live ? 0 : 1, g = {}, born = live ? performance.now() : -1e6, hover = null, dirty = true, shown = -1;
    // the axis starts just under the lowest ordinary price. A rare listing far below it sits on the floor of the chart with its real price printed beside it.
    const lo = Math.min(...P.map(q => q.usd).filter(v => v >= 1000), ...A.map(q => q.usd), D.curve[30][0]) * .82, hi = Math.max(...P.map(q => q.usd), D.curve[0][2]) * 1.16;

    function layout() {
      const W = plot.clientWidth, H = plot.clientHeight, phone = W < 760;
      const L = Math.max(24, (W - 1152) / 2), R = W - L;
      const base = H - (phone ? 88 : 84);
      const rb = read.getBoundingClientRect(), pb = plot.getBoundingClientRect();
      const top = (rb.bottom - pb.top) + (phone ? 30 : 14);
      const X = a => L + (phone ? 2 : 54) + a / 30 * (R - L - (phone ? 4 : 54));
      const Y = v => base - 18 - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (base - 18 - top);
      // the robot stands on the same line that becomes the axis
      let ib = 0;
      if (live) { const kids = [...intro.children].filter(k => !k.matches('.r-drawn,.r-still')); ib = Math.max(...kids.map(k => k.getBoundingClientRect().bottom)) - pin.getBoundingClientRect().top + (scrollOffset()); }
      const wide = W >= 1060, maxW = wide ? W * .47 : W - 32;
      const rows = G ? G.y1 - G.y0 + 1 : 80, cols = G ? G.x1 - G.x0 + 1 : 70;
      let rh = wide ? Math.min(base - 96, 660) : Math.max(110, Math.min(base - ib - 8, W * .96));
      let cell = rh / rows;
      if (cell * cols > maxW) cell = maxW / cols;
      const rx = (wide ? R : W - 16) - cell * cols, ry = base - cell * rows;
      g = { W, H, phone, L, R, base, top, X, Y, rx, ry, cell, rDot: phone ? 3.3 : 4.2, rBot: clamp(cell * .72, 2.4, 3.8) };
      P.forEach(q => { q.cx = X(q.age); q.cy = Y(q.usd); q.rx = rx + (q.gx - (G ? G.x0 : 0) + .5) * cell; q.ry = ry + (q.gy - (G ? G.y0 : 0) + .5) * cell; });
      A.forEach(q => { q.cx = X(q.age); q.cy = Y(q.usd); });
      age.style.cssText = `left:${X(0) - 22}px;width:${X(30) - X(0) + 44}px;top:${base - 22}px`;
      th.style.top = base - 15 + 'px';
      // axes
      const ty = TICKS.filter(t => t > lo * 1.06 && t < hi);
      let s = `<line class="ax" x1="${L}" x2="${R}" y1="${base + .5}" y2="${base + .5}"/>`;
      if (!phone) ty.forEach(t => { s += `<text x="${L}" y="${Y(t) + 5}">${usd(t)}</text>`; });
      else ty.forEach(t => { s += `<text x="${L}" y="${Y(t) - 6}">${usd(t)}</text>`; });
      [5, 10, 15, 20, 25, 30].forEach(a => { s += `<text x="${X(a)}" y="${base + (phone ? 38 : 40)}" text-anchor="${a === 30 ? 'end' : 'middle'}">${a === 30 && !phone ? '30 years old' : a}</text>`; });
      if (phone) s += `<text x="${L}" y="${base + 38}">Age</text>`;
      // direct labels, at the far end where listings are few
      s += `<text class="lb" x="${X(30)}" y="${Y(D.curve[phone ? 19 : 24][1]) - 12}" text-anchor="end">Typical asking price</text>`;
      s += `<text x="${X(30)}" y="${Y(D.curve[29][0]) + 20}" text-anchor="end">8 in 10 ask inside this band</text>`;
      if (A.length) { const low = A.reduce((m, q) => q.usd < m.usd ? q : m, A[0]), right = low.cx < R - 150; s += `<text class="lb" x="${low.cx + (right ? 12 : -12)}" y="${low.cy + 5}" text-anchor="${right ? 'start' : 'end'}">Sold at auction</text>`; }
      P.filter(q => q.usd < lo).forEach(q => { s += `<text x="${q.cx - 10}" y="${q.cy + 5}" text-anchor="end">${usd(q.usd)}</text>`; });
      ax.setAttribute('viewBox', `0 0 ${W} ${H}`); ax.innerHTML = s;
      dirty = true;
    }
    const scrollOffset = () => 0;

    function dotAt(q) {
      if (q.sold) return { x: q.cx, y: q.cy, r: g.rDot + .8 };
      const t = ease(clamp((p - q.d * .4) / .6));
      return { x: q.rx + (q.cx - q.rx) * t, y: q.ry + (q.cy - q.ry) * t - Math.sin(Math.PI * t) * q.a, r: g.rBot + (g.rDot - g.rBot) * t };
    }
    function draw(now) {
      const { c, w, h } = fit(cv);
      const rev = clamp((p - .66) / .34);
      // the robot behind its listings
      const gh = clamp(1 - p * 2.6);
      if (G && gh > 0) {
        if (!g.bm) g.bm = ghostBitmap(G, g.cell, .5);
        c.globalAlpha = gh * (live ? clamp((now - born) / 500) : 1); c.drawImage(g.bm, g.rx, g.ry, (G.x1 - G.x0 + 1) * g.cell, (G.y1 - G.y0 + 1) * g.cell); c.globalAlpha = 1;
      }
      if (rev > 0) {
        c.save(); c.beginPath(); c.rect(0, 0, g.X(0) + ease(rev) * (g.X(30) - g.X(0)), h); c.clip();
        const a0 = clamp(D.range[0] - 1, 0, 30), a1 = clamp(D.range[1] + 1, 0, 30);
        const fade = c.createLinearGradient(g.X(0), 0, g.X(30), 0), stop = (a, al) => fade.addColorStop(clamp(a / 30), `rgba(255,255,255,${al})`);
        stop(a0 - 2, .06); stop(a0, .17); stop(a1, .17); stop(a1 + 2, .06); stop(0, a0 > 1 ? .06 : .17); stop(30, a1 < 29 ? .06 : .17);
        c.fillStyle = fade; c.beginPath(); for (let a = 0; a <= 30; a++) c.lineTo(g.X(a), g.Y(D.curve[a][2])); for (let a = 30; a >= 0; a--) c.lineTo(g.X(a), g.Y(D.curve[a][0])); c.closePath(); c.fill();
        const line = (from, to, dash) => { if (to <= from) return; c.setLineDash(dash); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.lineJoin = 'round'; c.beginPath(); for (let a = from; a <= to; a++) c.lineTo(g.X(a), g.Y(D.curve[a][1])); c.stroke(); };
        line(0, a0, [2, 7]); line(a0, a1, []); line(a1, 30, [2, 7]); c.setLineDash([]);
        c.restore();
      }
      // the age being read
      const cu = clamp((p - .86) / .14);
      if (cu > 0) { const x = g.X(sel), y = g.Y(D.curve[sel][1]); c.strokeStyle = `rgba(255,255,255,${.7 * cu})`; c.lineWidth = 1; c.beginPath(); c.moveTo(x + .5, y); c.lineTo(x + .5, g.base); c.stroke(); }
      let moving = false;
      const tNow = now - born;
      const n = P.length;
      for (let i = 0; i < n; i++) {
        const q = P[i], d = dotAt(q);
        const target = cu > 0 && Math.abs(q.whole - sel) <= 1 ? 1 : 0;
        q.hi += (target - q.hi) * .2; if (Math.abs(target - q.hi) > .01) moving = true;
        const app = clamp((tNow - 200 - (i / Math.max(n, 12)) * 1000) / 160); if (app < 1) moving = true;
        if (app <= 0) continue;
        const dim = cu > 0 ? .72 + .28 * q.hi : 1;
        c.fillStyle = q === hover ? 'rgb(150,232,255)' : `rgba(255,255,255,${dim * app})`;
        c.beginPath(); c.arc(d.x, d.y, (d.r + q.hi * 1 * cu + (q === hover ? 1.4 : 0)) * (.4 + .6 * app), 0, 6.2832); c.fill();
      }
      const au = clamp((p - .8) / .2);
      if (au > 0) A.forEach(q => { const d = dotAt(q); c.fillStyle = `rgba(14,22,38,${au})`; c.beginPath(); c.arc(d.x, d.y, d.r + (q === hover ? 1.4 : 0), 0, 6.2832); c.fill(); if (q === hover) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); } });
      if (cu > 0) { const x = g.X(sel), y = g.Y(D.curve[sel][1]); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 7, 0, 6.2832); c.fill(); c.fillStyle = 'rgb(40,71,206)'; c.beginPath(); c.arc(x, y, 3, 0, 6.2832); c.fill(); }
      return moving;
    }
    function reading() {
      if (sel === shown) return; shown = sel;
      const c = D.curve[sel], y = D.now - sel, near = P.filter(q => Math.abs(q.whole - sel) <= 1).length;
      root.querySelector('.r-ra').textContent = sel === 1 ? '1 year old' : sel + ' years old';
      root.querySelectorAll('.r-ry').forEach(s => s.textContent = y);
      root.querySelector('.r-rv').textContent = money(c[1]);
      root.querySelector('.r-rb').textContent = `Most ask ${money(c[0])} to ${money(c[2])}.`;
      root.querySelector('.r-rn').textContent = near ? `${near} listing${near === 1 ? ' is' : 's are'} within a year of this age.` : 'No listings this age yet. This is our line carried forward.';
      root.querySelector('.r-rl').href = `price.html#r=${D.id}&y=${y}`;
      range.value = sel; range.setAttribute('aria-valuetext', `${sel} years old, about ${money(c[1])}`);
      th.textContent = sel === 1 ? '1 year' : sel + ' years';
      place();
    }
    function place() { const w = th.offsetWidth; th.style.transform = `translateX(${clamp(g.X(sel) - w / 2, 8, g.W - w - 8)}px)`; }
    function chrome() {
      if (!live) { ax.style.opacity = 1; return; }
      const o = clamp(1 - p * 2.4);
      intro.style.opacity = o; intro.style.transform = `translateY(${-p * 40}px)`; intro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      const f = clamp((p - .62) / .3);
      read.style.opacity = f; read.style.transform = `translateY(${(1 - f) * 12}px)`; read.style.pointerEvents = f > .9 ? '' : 'none';
      const t = clamp((p - .55) / .35);
      ax.querySelectorAll('text').forEach(n => { n.style.opacity = t; });
      age.style.opacity = 0; age.style.pointerEvents = f > .9 ? 'auto' : 'none'; th.style.opacity = f;
    }
    let raf = 0;
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    function frame(now) { raf = 0; chrome(); const mv = draw(now); if (mv) kick(); }
    function onScroll() {
      if (!live) return;
      const r = root.getBoundingClientRect(), span = root.offsetHeight - pin.offsetHeight;
      const s = clamp(-r.top / span);
      const np = clamp(s / .74);
      if (np !== p) { p = np; if (p > .02) born = -1e6; hideTip(); kick(); }
    }
    // pointer: rest on a dot to read its listing; move along the chart to change the age
    const ALL = () => A.length && p > .85 ? A.concat(P) : P;
    function nearest(x, y, reach) { let best = null, bd = reach * reach; for (const q of ALL()) { const d = dotAt(q), v = (d.x - x) ** 2 + (d.y - y) ** 2; if (v < bd) { bd = v; best = q; } } return best; }
    function showTip(q) {
      hover = q; const d = dotAt(q);
      tb.textContent = q.t;
      ts.textContent = q.sold ? `Sold at auction for ${usd(q.usd)} a robot on ${q.when} at ${q.src}.` : `Built ${q.year}. Asking ${usd(q.usd)} on ${q.src}.`;
      ta.textContent = (q.sold ? 'See the result' : 'See the listing') + ' →'; ta.href = q.url;
      placeTip(tip, plot, d.x, d.y); kick();
    }
    function hideTip() { if (hover || !tip.hidden) { hover = null; tip.hidden = true; kick(); } }
    const rel = ev => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    let wait = 0;
    cv.addEventListener('pointermove', ev => {
      if (ev.pointerType === 'touch') return;
      const [x, y] = rel(ev);
      if (p > .9 && y > g.top - 10 && y < g.base + 50 && x > g.L && x < g.R) { const a = clamp(Math.round((x - g.X(0)) / (g.X(30) - g.X(0)) * 30), 0, 30); if (a !== sel) { sel = a; reading(); kick(); } }
      clearTimeout(wait); wait = setTimeout(() => { const q = nearest(x, y, 18); if (q) showTip(q); else if (hover) hideTip(); }, 70);
    });
    let down = null;
    cv.addEventListener('pointerdown', ev => { down = [ev.clientX, ev.clientY]; const [x, y] = rel(ev); if (ev.pointerType !== 'touch') { const q = nearest(x, y, 24); if (q) showTip(q); } });
    cv.addEventListener('pointerup', ev => {
      if (ev.pointerType !== 'touch' || !down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 8) return;
      const [x, y] = rel(ev), q = nearest(x, y, 26);
      if (q) showTip(q); else { hideTip(); if (p > .9 && y < g.base + 40) { sel = clamp(Math.round((x - g.X(0)) / (g.X(30) - g.X(0)) * 30), 0, 30); reading(); kick(); } }
    });
    document.addEventListener('pointerdown', ev => { if (!tip.contains(ev.target) && ev.target !== cv) hideTip(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hideTip(); });
    range.addEventListener('input', () => { sel = +range.value; hideTip(); reading(); kick(); });
    addEventListener('scroll', onScroll, { passive: true });
    new ResizeObserver(() => { layout(); place(); onScroll(); kick(); }).observe(plot);
    layout(); reading(); onScroll(); kick();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); place(); kick(); });
    // the finished still draws the robot once, beside the words
    if (!live) { const s = root.querySelector('.r-still'); if (s && G) { s.style.aspectRatio = `${G.x1 - G.x0 + 1}/${G.y1 - G.y0 + 1}`; requestAnimationFrame(() => { const { c, w, h } = fit(s); const cell = w / (G.x1 - G.x0 + 1); c.drawImage(ghostBitmap(G, cell, .5), 0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); P.forEach(q => { const X_ = (q.gx - G.x0 + .5) * cell, Y_ = (q.gy - G.y0 + .5) * cell; c.moveTo(X_ + 3, Y_); c.arc(X_, Y_, clamp(cell * .72, 2, 3.4), 0, 6.2832); }); c.fill(); }); } }
    // the long lists start short
    const mds = document.querySelector('.r-mds');
    if (mds) { const links = [...mds.children], keep = 12; if (links.length > keep + 3) { links.slice(keep).forEach(a => { a.hidden = true; }); const b = document.createElement('button'); b.type = 'button'; b.className = 'r-more'; b.textContent = `See all ${links.length} models \u2192`; mds.after(b); b.addEventListener('click', () => { links.forEach(a => { a.hidden = false; }); b.remove(); }); } }
    const tbl = document.querySelector('[data-listings]');
    if (tbl) { const rows = [...tbl.tBodies[0].rows], keep = 8; if (rows.length > keep + 2) { const step = (rows.length - 1) / (keep - 1), show = new Set(Array.from({ length: keep }, (_, i) => Math.round(i * step))); rows.forEach((r, i) => { if (!show.has(i)) r.hidden = true; }); const b = document.createElement('button'); b.type = 'button'; b.className = 'r-more'; b.textContent = `See all ${rows.length} listings \u2192`; tbl.after(b); b.addEventListener('click', () => { rows.forEach(r => { r.hidden = false; }); b.remove(); }); } }
  }

  // ---------------------------------------------------------------- the shelf
  const shelf = document.querySelector('[data-shelf]');
  if (shelf) {
    const SEATS = JSON.parse(shelf.querySelector('.r-seats').textContent);
    const paint = (cv, t) => {
      const name = cv.dataset.b, n = +cv.dataset.n, G = ghost(name); if (!G) return;
      const { c, w, h } = fit(cv), cols = G.x1 - G.x0 + 1, rows = G.y1 - G.y0 + 1, cell = Math.min(w * .92 / cols, h * .95 / rows);
      const ox = (w - cols * cell) / 2, oy = h - rows * cell;
      if (cv._cell !== cell) { cv._cell = cell; cv._bm = ghostBitmap(G, cell, .46); }
      c.drawImage(cv._bm, ox, oy, cols * cell, rows * cell);
      const lit = Math.round(n * t), r = clamp(cell * .95, 1.5, 2.7), s = SEATS[name] || [];
      c.fillStyle = '#fff'; c.beginPath();
      for (let i = 0; i < lit && i < s.length; i++) { const X = ox + (s[i][0] - G.x0 + .5) * cell, Y = oy + (s[i][1] - G.y0 + .5) * cell; c.moveTo(X + r, Y); c.arc(X, Y, r, 0, 6.2832); }
      c.fill();
    };
    const cvs = [...shelf.querySelectorAll('canvas[data-b]')];
    const run = cv => { if (reduce) { paint(cv, 1); return; } const t0 = performance.now(), dur = 500 + Math.min(1100, +cv.dataset.n * 7); const step = now => { const t = clamp((now - t0) / dur); paint(cv, t); if (t < 1) requestAnimationFrame(step); else cv.dataset.done = 1; }; requestAnimationFrame(step); };
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } }), { threshold: .3 });
    cvs.forEach(cv => { paint(cv, 0); io.observe(cv); });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => cvs.forEach(cv => paint(cv, cv.dataset.done ? 1 : 0)), 120); });
  }
})();
