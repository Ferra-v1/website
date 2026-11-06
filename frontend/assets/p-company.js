// Company page: one dot for every listing in the data, in the data's own order. As the page scrolls each check moves aside the dots that did not pass it, to the shade that says how far they got, and the number falls with them.
// The dots that pass every check stand up as a robot. Any dot opens its own listing: hover or tap, or "Show me one". The listing rows load only when the wall comes near the screen.
// With reduced motion the wall sits finished, with the four counts under it, and every dot still opens.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = t => t * t * (3 - 2 * t);
  const usd = v => '$' + v.toLocaleString('en-US');
  const cv = document.querySelector('.c-dots'), small = document.querySelector('.c-aucs');
  // the rows: asked for once, by a script tag, because a page opened from a file cannot fetch
  let LIST = null, asked = false; const waiting = [];
  const need = fn => { if (LIST) return fn(); waiting.push(fn); if (asked) return; asked = true; const s = document.createElement('script'); s.src = 'assets/p-company.list.js'; s.onload = () => { LIST = window.FERRA_LIST; waiting.splice(0).forEach(f => f()); }; document.head.appendChild(s); };
  const near = el => new IntersectionObserver((es, io) => es.forEach(en => { if (en.isIntersecting) { io.disconnect(); need(() => {}); } }), { rootMargin: '1200px' }).observe(el);
  // one small card per wall, kept inside it. Nothing changes while the pointer is on the card, so the link can be reached
  const tipper = (tip, box) => { let over = false; tip.addEventListener('pointerenter', () => { over = true; }); tip.addEventListener('pointerleave', () => { over = false; });
    return { busy: () => over, hide: () => { tip.hidden = true; tip.innerHTML = ''; over = false; },
      show: (html, x, y, under) => { tip.innerHTML = html; tip.hidden = false; const W = box.clientWidth, H = box.clientHeight, w = tip.offsetWidth, h = tip.offsetHeight, gap = 14; let l = x + gap, t = y - h / 2; if (l + w > W) l = x - gap - w; l = clamp(l, 0, Math.max(0, W - w)); t = under ? H + 4 : clamp(t, 0, Math.max(0, H - h)); if (under) l = clamp(x - w / 2, 0, Math.max(0, W - w)); tip.style.transform = `translate(${Math.round(l)}px,${Math.round(t)}px)`; } }; };
  if (cv) {
    const lev = cv.dataset.levels, n = lev.length, sec = cv.closest('.c-field'), run = sec.querySelector('.c-run'), wall = cv.parentElement, tipEl = wall.querySelector('.c-tip');
    const keys = [...sec.querySelectorAll('[data-key]')], num = sec.querySelector('.c-read b'), say = sec.querySelector('.c-read span'), C = cv.dataset.counts.split(',').map(Number), rest = [.15, .3, .5, 1];
    const tip = tipper(tipEl, wall);
    if (!reduce) sec.classList.add('c-live');
    near(wall);
    // a fixed seed, so every visit lays the wall out the same way
    let seed = 20261106; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const order = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const L = new Uint8Array(n), wait = new Float32Array(n); for (let i = 0; i < n; i++) { L[i] = +lev[i]; wait[i] = rnd(); }
    const X = [0, 1, 2, 3].map(() => new Float32Array(n)), Y = [0, 1, 2, 3].map(() => new Float32Array(n)), RR = [0, 1, 2, 3].map(() => new Float32Array(n)), cx = new Float32Array(n), cy = new Float32Array(n), cr = new Float32Array(n);
    let x = null, W = 0, H = 0, A = reduce ? 3 : 0, picked = -1;
    // lay a list of dots in a box as a block, filling from the far edge, with one pitch
    const block = (list, k, bx, by, bw, bh, fromEnd, wide) => { if (!list.length) return; let P = Math.sqrt(bw * bh / list.length); for (let g = 0; g < 60; g++) { const c = Math.max(1, Math.floor((wide ? bh : bw) / P)), r = Math.ceil(list.length / c); if (r * P <= (wide ? bw : bh)) break; P *= .985; }
      const across = Math.max(1, Math.floor((wide ? bh : bw) / P)), rad = P * .36;
      list.forEach((id, i) => { const a = i % across, b = Math.floor(i / across), o = ((wide ? bh : bw) - across * P) / 2;
        if (wide) { X[k][id] = fromEnd ? bx + bw - (b + .5) * P : bx + (b + .5) * P; Y[k][id] = by + o + (a + .5) * P; }
        else { X[k][id] = bx + o + (a + .5) * P; Y[k][id] = fromEnd ? by + bh - (b + .5) * P : by + (b + .5) * P; }
        RR[k][id] = rad; }); };
    // the robot: the listings that passed every check, placed on an even lattice over the drawing, so 369 dots read as an arm. The caller leaves it a margin, so no dot is cut by the canvas edge
    const robot = (list, k, bx, by, bw, bh) => { const b = (window.FERRA_DOTS || {})[cv.dataset.bot]; if (!b) { block(list, k, bx, by, bw, bh, false, bw > bh); return; }
      const cells = new Set(), pts = b.d.split(';').filter(Boolean).map(s => s.split(',').map(Number)); pts.forEach(p => { if (p[3] > 20) cells.add(p[0] + p[1] * 1000); });
      const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]), y0 = Math.min(...ys), y1 = Math.max(...ys), x0 = Math.min(...xs), x1 = Math.max(...xs), cw = x1 - x0 + 1, ch = y1 - y0 + 1, u = Math.min(bw / cw, bh / ch), ox = bx + (bw - cw * u) / 2, oy = by + bh - ch * u;
      let s = 9, got = []; for (; s > 1.5; s -= .04) { got = []; for (let yy = y1; yy >= y0; yy -= s) for (let xx = x0; xx <= x1; xx += s) { const q = Math.round(xx) + Math.round(yy) * 1000; if (cells.has(q)) got.push([xx, yy]); } if (got.length >= list.length) break; }
      const extra = got.length - list.length; if (extra > 0) { const keep = got.map((g, i) => [rnd(), i]).sort((a, c) => a[0] - c[0]).slice(extra).map(a => a[1]).sort((a, c) => a - c); got = keep.map(i => got[i]); }
      const rad = Math.max(1.4, s * u * .38); list.forEach((id, i) => { const g = got[i % got.length]; X[k][id] = ox + (g[0] - x0 + .5) * u; Y[k][id] = oy + (g[1] - y0 + .5) * u; RR[k][id] = rad; }); };
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return; cv.width = Math.round(W * d); cv.height = Math.round(H * d); x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
      const wide = W > H * 1.15, shuffled = order;
      block(shuffled, 0, 0, 0, W, H, false, wide);
      const G = wide ? W * .018 : H * .022;
      for (let k = 1; k <= 3; k++) {
        const up = shuffled.filter(i => L[i] >= k), down = [];   // the ones that failed stand furthest out, the ones that got furthest stand closest
        for (let l = 0; l < k; l++) shuffled.forEach(i => { if (L[i] === l) down.push(i); });
        const room = wide ? W : H, keep = k === 3 ? .4 : Math.max(.16, Math.min(.66, up.length / n * 1.02));   // the robot gets more room than a block of the same dots would
        if (wide) { const a = room * keep - G / 2, bx = room * keep + G / 2, bw = room - bx; if (k === 3) robot(up, k, 12, 12, a - 12, H - 24); else block(up, k, 0, 0, a, H, false, true); block(down, k, bx, 0, bw, H, true, true); }
        else { const a = room * keep - G / 2, by = room * keep + G / 2, bh = room - by; if (k === 3) robot(up, k, 12, 12, W - 24, a - 24); else block(up, k, 0, 0, W, a, false, false); block(down, k, 0, by, W, bh, true, false); }
      }
    };
    const N = 13;
    const paint = a => { if (!x) return; A = a; const s = Math.min(2, Math.floor(a)), f = a - s, paths = Array.from({ length: N }, () => new Path2D());
      for (let i = 0; i < n; i++) { const l = L[i], k = ease(clamp((f - wait[i] * .34) / .66)), fallAt = l;   // this dot fails at step l, and rests from then on
        const al = l === 3 ? 1 : s > fallAt ? rest[l] : s === fallAt ? 1 + (rest[l] - 1) * k : 1, q = Math.round(al * (N - 1));
        const px = X[s][i] + (X[s + 1][i] - X[s][i]) * k, py = Y[s][i] + (Y[s + 1][i] - Y[s][i]) * k, r = RR[s][i] + (RR[s + 1][i] - RR[s][i]) * k;
        cx[i] = px; cy[i] = py; cr[i] = r; paths[q].moveTo(px + r, py); paths[q].arc(px, py, r, 0, 6.2832); }
      x.clearRect(0, 0, W, H); x.fillStyle = '#2847ce'; paths.forEach((p, q) => { if (!q) return; x.globalAlpha = q / (N - 1); x.fill(p); }); x.globalAlpha = 1;
      if (picked >= 0) { x.fillStyle = '#0e1626'; x.beginPath(); x.arc(cx[picked], cy[picked], Math.max(cr[picked] * 1.5, 5), 0, 6.2832); x.fill(); } };
    // what one listing says, in the data's words
    const card = i => { const r = LIST.rows[i], ask = r[3] ? `Asking about ${usd(r[3])}` : 'No price shown', yr = r[4] ? ` &middot; built ${r[4]}` : '', title = r[0].replace(/&/g, '&amp;').replace(/</g, '&lt;');
      return `<b>${title}</b><span>${ask}${yr} &middot; ${LIST.src[r[1]]}</span><span>${LIST.why[r[5]]}</span><a href="${r[2].replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer nofollow">See the listing &rarr;</a>`; };
    const open = i => need(() => { picked = i; tip.show(card(i), cx[i], cy[i]); paint(A); });
    const close = () => { picked = -1; tip.hide(); paint(A); };
    const nearest = (mx, my, lim) => { let best = -1, bd = lim * lim; for (let i = 0; i < n; i++) { const dx = cx[i] - mx, dy = cy[i] - my, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } } return best; };
    const at = ev => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    let hov = 0;
    if (fine) { cv.addEventListener('pointermove', ev => { if (tip.busy()) return; clearTimeout(hov); const [mx, my] = at(ev); hov = setTimeout(() => { const i = nearest(mx, my, 18); if (i >= 0 && i !== picked) open(i); }, 60); });
      wall.addEventListener('pointerleave', () => { clearTimeout(hov); setTimeout(() => { if (!tip.busy() && !wall.matches(':hover')) close(); }, 220); }); }
    cv.addEventListener('click', ev => { const [mx, my] = at(ev), i = nearest(mx, my, 24); if (i >= 0) open(i); else close(); });
    const oneBtn = sec.querySelector('.c-one');
    if (oneBtn) oneBtn.addEventListener('click', () => { const s = Math.min(3, Math.round(A)), list = []; for (let i = 0; i < n; i++) if (L[i] >= s) list.push(i); open(list[Math.floor(Math.random() * list.length)]); const a = tipEl.querySelector('a'); if (a) a.focus({ preventScroll: true }); });
    const start = () => { size(); paint(A); };
    if (reduce) { start(); addEventListener('resize', start); }
    else {
      const words = keys.map(k => k.querySelector('span').textContent), count = a => { const i = Math.min(2, Math.floor(a)), f = clamp(a - i); return C[i] + (C[i + 1] - C[i]) * f; };
      let last = -1, lastI = -1, eased = null, want = 0;
      const show = a => { if (Math.abs(a - last) < .0005) return; last = a; if (picked >= 0 && Math.abs(a - Math.round(a)) > .02) { picked = -1; tip.hide(); } paint(a); if (num) num.textContent = Math.round(count(a)).toLocaleString('en-US'); const i = Math.min(3, Math.floor(a + .5)); if (say && i !== lastI) { lastI = i; say.textContent = words[i]; } };
      const onScroll = () => { const r = run.getBoundingClientRect(), span = r.height - innerHeight, p = span > 0 ? clamp(-r.top / span) : 0; want = smooth(p, .05, .27) + smooth(p, .33, .55) + smooth(p, .61, .85); };
      const frame = () => { const r = run.getBoundingClientRect(); if (r.bottom > -60 && r.top < innerHeight + 60) { onScroll(); eased = eased === null ? want : eased + (want - eased) * .14; if (Math.abs(want - eased) < .001) eased = want; show(eased); } requestAnimationFrame(frame); };
      addEventListener('resize', () => { size(); last = -1; }); start(); requestAnimationFrame(frame);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { size(); last = -1; });
    }
  }
  // the auction results: real sales, one large dot each, in the same ink as the number above them. On a wide screen they stand in one row, so 26 reads as few after 1,744. They open the same way, with the card under the row so it never covers a dot.
  if (small) { const box = small.parentElement, tipEl = box.querySelector('.c-tip'), tip = tipper(tipEl, box), n = +small.dataset.n; let P = 44, cols = 1, picked = -1;
    const pos = i => [(i % cols + .5) * P, (Math.floor(i / cols) + .5) * P];
    const draw = () => { const W = small.clientWidth; cols = W / n >= 34 ? n : Math.max(1, Math.floor(W / 44)); P = W / cols; const rows = Math.ceil(n / cols), d = Math.min(2, devicePixelRatio || 1); small.style.height = rows * P + 'px'; small.width = W * d; small.height = rows * P * d; const x = small.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, rows * P); for (let i = 0; i < n; i++) { const [a, b] = pos(i); x.fillStyle = i === picked ? '#2847ce' : '#0e1626'; x.beginPath(); x.arc(a, b, Math.min(P, 48) * (i === picked ? .44 : .38), 0, 6.2832); x.fill(); } };
    const card = i => { const r = LIST.auc[i]; return `<b>${r[0].replace(/&/g, '&amp;').replace(/</g, '&lt;')}</b><span>${usd(r[3])} paid at auction${r[2] ? ` in ${r[2]}` : ''} &middot; ${r[1]}</span><a href="${r[4].replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer nofollow">See the result &rarr;</a>`; };
    const hit = ev => { const b = small.getBoundingClientRect(), mx = ev.clientX - b.left, my = ev.clientY - b.top; const c = Math.floor(mx / P), r = Math.floor(my / P), i = r * cols + c; return c >= 0 && c < cols && i >= 0 && i < n ? i : -1; };
    const open = i => need(() => { picked = i; draw(); const [a, b] = pos(i); tip.show(card(i), a, b, true); });
    if (fine) { small.addEventListener('pointermove', ev => { if (tip.busy()) return; const i = hit(ev); if (i >= 0 && i !== picked) open(i); }); box.addEventListener('pointerleave', () => setTimeout(() => { if (!tip.busy() && !box.matches(':hover')) { picked = -1; tip.hide(); draw(); } }, 220)); }
    small.addEventListener('click', ev => { const i = hit(ev); if (i >= 0) open(i); else { picked = -1; tip.hide(); draw(); } });
    near(box); draw(); addEventListener('resize', draw); }
})();
