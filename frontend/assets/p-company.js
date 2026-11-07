// Company page: the wall. One dot for every listing in the data, sorted by how far it got, the ones that set our prices first and darkest. Any dot opens its own listing, by hover or tap. The listing rows load only when the wall comes near the screen.
// The dots arrive once, over 900ms, when the wall comes into view. With reduced motion they stand finished.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const usd = v => '$' + v.toLocaleString('en-US');
  const cv = document.querySelector('[data-page="company.html"] .c-dots'); if (!cv) return;
  const wall = cv.parentElement, tipEl = wall.querySelector('.c-tip'), lev = cv.dataset.levels, n = lev.length;
  // the rows: asked for once, by a script tag, because a page opened from a file cannot fetch
  let LIST = null, asked = false; const waiting = [];
  const need = fn => { if (LIST) return fn(); waiting.push(fn); if (asked) return; asked = true; const s = document.createElement('script'); s.src = 'assets/p-company.list.js'; s.onload = () => { LIST = window.FERRA_LIST; waiting.splice(0).forEach(f => f()); }; document.head.appendChild(s); };
  new IntersectionObserver((es, io) => es.forEach(en => { if (en.isIntersecting) { io.disconnect(); need(() => {}); } }), { rootMargin: '1200px' }).observe(wall);
  // one small card, kept inside the wall and off the dot it describes. Nothing changes while the pointer is on the card, so the link can be reached
  let over = false; tipEl.addEventListener('pointerenter', () => { over = true; }); tipEl.addEventListener('pointerleave', () => { over = false; });
  const hideTip = () => { tipEl.hidden = true; tipEl.innerHTML = ''; over = false; };
  const showTip = (html, x, y) => { tipEl.innerHTML = html; tipEl.hidden = false; const W = wall.clientWidth, w = tipEl.offsetWidth, h = tipEl.offsetHeight, gap = 14, box = wall.getBoundingClientRect(), top = 8 - box.top, bottom = innerHeight - box.top - h - 8; let l = x + gap, t = y - h / 2;
    if (l + w > W) l = x - gap - w;
    if (l < 0) { l = clamp(x - w / 2, 0, Math.max(0, W - w)); t = y - h - gap >= top ? y - h - gap : y + gap; }   // no room beside the dot: above it, or under it
    t = clamp(t, top, Math.max(top, bottom)); tipEl.style.transform = `translate(${Math.round(l)}px,${Math.round(t)}px)`; };
  // sorted once: darkest first, in the data's own order within a level
  const SHADE = [.16, .3, .52, 1], order = Array.from({ length: n }, (_, i) => i).sort((a, b) => lev[b] - lev[a] || a - b);
  const seat = new Uint16Array(n); order.forEach((id, i) => { seat[id] = i; });
  let x = null, W = 0, H = 0, P = 12, wide = true, across = 1, picked = -1, come = reduce ? 1 : 0, started = reduce;
  const pos = id => { const i = seat[id], a = i % across, b = Math.floor(i / across); return wide ? [(b + .5) * P, (a + .5) * P] : [(a + .5) * P, (b + .5) * P]; };
  const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = wall.clientWidth; if (!W) return; wide = W > 700; const target = wide ? Math.min(340, W * .28) : W * .96;
    P = Math.sqrt(W * target / n); for (let g = 0; g < 80; g++) { const fit = wide ? Math.floor(W / P) * Math.floor(target / P) : Math.floor(W / P) * Math.floor(target / P); if (fit >= n) break; P *= .99; }
    if (wide) { const cols = Math.floor(W / P); across = Math.ceil(n / cols); P = W / cols; H = across * P; } else { across = Math.floor(W / P); P = W / across; H = Math.ceil(n / across) * P; }
    cv.style.height = H + 'px'; cv.width = Math.round(W * d); cv.height = Math.round(H * d); x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); };
  const paint = () => { if (!x) return; const paths = SHADE.map(() => new Path2D()), rad = P * .36;
    for (let id = 0; id < n; id++) { const [a, b] = pos(id), k = reduce ? 1 : clamp((come * 1.5 - seat[id] / n * .5)), r = rad * k; if (r < .1) continue; const p = paths[+lev[id]]; p.moveTo(a + r, b); p.arc(a, b, r, 0, 6.2832); }
    x.clearRect(0, 0, W, H); x.fillStyle = '#2847ce'; paths.forEach((p, l) => { x.globalAlpha = SHADE[l]; x.fill(p); }); x.globalAlpha = 1;
    if (picked >= 0) { const [a, b] = pos(picked); x.fillStyle = '#0e1626'; x.beginPath(); x.arc(a, b, Math.max(rad * 1.5, 5), 0, 6.2832); x.fill(); } };
  // what one listing says, in the data's words
  const card = i => { const r = LIST.rows[i], ask = r[3] ? `Asking about ${usd(r[3])}` : 'No price shown', yr = r[4] ? `, built ${r[4]}` : '', title = r[0].replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<b>${title}</b><span>${ask}${yr}, on ${LIST.src[r[1]]}</span><span>${LIST.why[r[5]]}</span><a href="${r[2].replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer nofollow">See the listing &rarr;</a>`; };
  const open = i => need(() => { picked = i; const [a, b] = pos(i); showTip(card(i), a, b); paint(); });
  const close = () => { picked = -1; hideTip(); paint(); };
  const at = ev => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  const hit = (mx, my) => { const c = Math.floor(mx / P), r = Math.floor(my / P), i = wide ? c * across + r : r * across + c; if (c < 0 || r < 0 || i < 0 || i >= n || (wide ? r >= across : c >= across)) return -1; return order[i]; };
  let hov = 0;
  if (fine) { cv.addEventListener('pointermove', ev => { if (over) return; clearTimeout(hov); const [mx, my] = at(ev); hov = setTimeout(() => { const i = hit(mx, my); if (i >= 0 && i !== picked) open(i); }, 60); });
    wall.addEventListener('pointerleave', () => { clearTimeout(hov); setTimeout(() => { if (!over && !wall.matches(':hover')) close(); }, 220); }); }
  cv.addEventListener('click', ev => { const [mx, my] = at(ev), i = hit(mx, my); if (i >= 0) open(i); else close(); });
  const redraw = () => { size(); if (picked >= 0) close(); paint(); };
  addEventListener('resize', redraw); redraw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  if (!reduce) new IntersectionObserver((es, io) => es.forEach(en => { if (!en.isIntersecting || started) return; started = true; io.disconnect(); const t0 = performance.now(), go = t => { const k = Math.min(1, (t - t0) / 900); come = 1 - Math.pow(1 - k, 3); paint(); if (k < 1) requestAnimationFrame(go); }; requestAnimationFrame(go); }), { threshold: .25 }).observe(wall);
})();
