// Vision page: the films play only while on screen; the robots drive past as the page scrolls and end standing in one line; one robot's dots change meaning with the story.
// A dot is a real thing here: first one used robot arm for sale, then a share of what a loan pays for, then a piece of the robot. Nothing twinkles and no dot is lit at random.
// Native scrolling throughout: sections pin with position sticky and this file only reads scroll position. With reduced motion everything sits finished and in order.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const root = document.querySelector('[data-page="vision.html"]'); if (!root) return;

  // films
  document.querySelectorAll('video[data-film]').forEach(v => {
    if (reduce) { v.preload = 'none'; v.removeAttribute('autoplay'); return; }
    new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause(); })).observe(v);
  });
  // the loading bay plays once and holds on the finished stack; it starts again only after it has left the screen
  document.querySelectorAll('video[data-once]').forEach(v => {
    if (reduce) return;
    new IntersectionObserver(es => es.forEach(en => {
      if (en.intersectionRatio >= .45) { const p = v.play(); if (p) p.catch(() => {}); }
      else if (!en.isIntersecting) { v.pause(); if (v.ended) v.currentTime = 0; }
    }), { threshold: [0, .45] }).observe(v);
  });
  if (reduce) { drawFinal(); return; }
  root.classList.add('v-live');

  const progress = el => { const r = el.getBoundingClientRect(), h = r.height - innerHeight; return h > 0 ? clamp(-r.top / h) : 0; };

  // the road: each robot stops so its caption can be read; then the camera pulls back until all five stand together across the page, each at one height
  const work = root.querySelector('.v-work'), slots = [...root.querySelectorAll('[data-slot]')], caps = slots.map(s => s.querySelector('figcaption')), world = root.querySelector('[data-world]'), crowd = root.querySelector('.v-crowd'), track = root.querySelector('.v-track'), roadEl = root.querySelector('.v-road');
  const N = slots.length, asp = slots.map(s => +s.dataset.a), sumA = asp.reduce((a, b) => a + b, 0);
  let roadP = null, L = null;
  const roadLayout = () => {
    const vw = document.documentElement.clientWidth, wide = vw > 820, sw = slots[0].offsetWidth, R = slots[0].querySelector('.rs-bot').offsetHeight;
    const cw = Math.min(1680, vw - 48), gap = 18, h = (cw - gap * (N - 1)) / sumA, left = (vw - cw) / 2;
    let x = left; const cx = asp.map(a => { const w = a * h, c = x + w / 2; x += w + gap; return c; });
    L = { vw, wide, sw, R, h, cx, s: h / R };
    if (crowd && wide) { crowd.style.left = left + 'px'; crowd.style.gap = gap + 'px'; [...crowd.children].forEach((c, i) => { c.style.width = asp[i] * h + 'px'; c.querySelector('.rs-bot').style.height = h + 'px'; }); if (work.classList.contains('v-crowded') && window.FerraDots) crowd.querySelectorAll('canvas').forEach(c => FerraDots.draw(c)); }
  };
  const road = () => {
    if (!work || !N) return;
    const r = work.getBoundingClientRect(); if (r.bottom < -80 || r.top > innerHeight + 80) return;
    if (!L) roadLayout();
    const want = progress(work); roadP = roadP === null ? want : roadP + (want - roadP) * .16;
    const p = roadP, u = clamp(p / .62) * (N - 1), i0 = Math.min(N - 2, Math.floor(u)), pos = i0 + smooth(u - i0, .3, .9);   // a stop at each robot
    const zoom = L.wide ? smooth(p, .66, .86) : 0, last = L.wide ? 0 : smooth(p, .72, .8);
    if (roadEl) roadEl.style.transform = L.wide ? `translate3d(0,${(-zoom * innerHeight * .19).toFixed(1)}px,0)` : '';   // the line rises from 72% of the screen to 53% (--gy and --gy2)
    slots.forEach((s, i) => {
      const d = clamp(Math.abs(i - pos)), base = 1 - .68 * d, X = lerp(L.vw / 2 + (i - pos) * L.sw, L.wide ? L.cx[i] : 0, zoom), S = lerp(1, L.s, zoom);
      s.style.transform = `translate3d(${(X - L.sw / 2).toFixed(1)}px,0,0) scale(${S.toFixed(4)})`;
      s.style.opacity = lerp(base, 1, zoom).toFixed(3);
      if (caps[i]) caps[i].style.opacity = (clamp(1 - d * 2.6) * (1 - clamp(zoom * 5)) * (i === N - 1 ? 1 - last : 1)).toFixed(3);
    });
    if (world) world.style.opacity = smooth(p, L.wide ? .76 : .7, L.wide ? .88 : .84).toFixed(3);
    if (crowd) {
      const fade = L.wide ? smooth(p, .84, .87) : 0;
      if (L.wide && p > .78 && !work.classList.contains('v-crowded')) { work.classList.add('v-crowded'); if (window.FerraDots) crowd.querySelectorAll('canvas').forEach(c => FerraDots.draw(c)); }
      else if (!(L.wide && p > .78)) work.classList.remove('v-crowded');
      work.classList.toggle('v-settled', L.wide && fade > .995);
      crowd.style.opacity = fade.toFixed(3); if (track) track.style.opacity = (1 - fade).toFixed(3);
    }
  };

  // the big robot. Every choice below comes from a fixed seed, so the same dots mean the same thing on every visit
  const own = root.querySelector('.v-own'), pin = root.querySelector('.v-own-pin'), cv = root.querySelector('.v-bot'), box = root.querySelector('.v-botbox'), b3 = root.querySelector('.v-b3');
  const beats = [...root.querySelectorAll('[data-beat]')];
  const mid = root.querySelector('.v-sky-mid'), day = root.querySelector('.v-sky-day');
  const bot = (window.FERRA_DOTS || {})['arm-l'], LIT = cv ? +cv.dataset.lit || 0 : 0;
  const rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261106);
  let pts = null, W = 0, H = 0, pitch = 0, x = null, y0 = 0, y1 = 0, dpr = 1, tNow = null, lastT = -1;
  const shuffled = n => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const parse = () => {
    if (!bot || pts) return;
    pts = bot.d.split(';').filter(Boolean).map(s => { const [cx, cy, L, A, acc, ed] = s.split(',').map(Number); const l = L / 100, a = A / 100;
      return { cx, cy, s: a * Math.min(1, .3 + .7 * Math.pow(l, .9) + (ed / 100) * .35), li: 2, lr: 0, r: rng(), q: rng(), hx: 0, hy: 0, tx: 0, ty: 0 }; });
    y0 = Math.min(...pts.map(p => p.cy)); y1 = Math.max(...pts.map(p => p.cy));
    // the listings: exactly as many dots as there are listings, spread over the robot
    shuffled(pts.length).slice(0, LIT).forEach((k, i) => { pts[k].li = i / LIT; });
    // the loan: rank every dot from the base up, so "70%" lights exactly 70% of the dots
    [...pts].sort((a, b) => b.cy - a.cy || a.cx - b.cx).forEach((p, i, l) => { p.lr = i / l.length; });
  };
  const size = () => {
    if (!cv || !box || !bot || !pin) return; parse();
    const pr = pin.getBoundingClientRect(), br = box.getBoundingClientRect(), rows = y1 - y0 + 1;
    W = pr.width; H = pr.height; pitch = Math.min(br.width / bot.w, br.height / rows); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ox = br.left - pr.left + (br.width - pitch * bot.w) / 2, oy = br.top - pr.top + (br.height - pitch * rows) / 2;
    pts.forEach(p => { p.hx = ox + (p.cx + .5) * pitch; p.hy = oy + (p.cy - y0 + .5) * pitch; });
    // where the pieces go: an even field over the whole sky, leaving the words clear
    const hole = [...(b3 ? b3.children : [])].map(c => c.getBoundingClientRect()).reduce((a, c) => c.width ? { l: Math.min(a.l, c.left), r: Math.max(a.r, c.right), t: Math.min(a.t, c.top), b: Math.max(a.b, c.bottom) } : a, { l: 1e9, r: -1e9, t: 1e9, b: -1e9 });
    // a soft-cornered clearing around the words: wide enough that the text's corners stay clear, with no straight edge to read as a box
    const m = W > 820 ? 30 : 12, hcx = (hole.l + hole.r) / 2 - pr.left, hcy = (hole.t + hole.b) / 2 - pr.top, ha = Math.max(1, (hole.r - hole.l) / 2 * 1.2 + m), hb = Math.max(1, (hole.b - hole.t) / 2 * 1.2 + m);
    const inHole = (xx, yy, roll) => { const u = (xx - hcx) / ha, v = (yy - hcy) / hb, d = Math.pow(u * u * u * u + v * v * v * v, .25); return d < 1 || (d < 1.5 && roll > (d - 1) / .5); };   // the field thins out toward the words, so it has no edge to read as a shape
    const free = Math.max(W * H * .2, W * H - 5 * ha * hb);
    let g = Math.sqrt(free / pts.length) * 1.02, cells = [];
    for (let tries = 0; tries < 16; tries++) { cells = []; for (let yy = g / 2; yy < H; yy += g) for (let xx = g / 2; xx < W; xx += g) { if (inHole(xx, yy, rng())) continue; cells.push([xx, yy]); } if (cells.length >= pts.length) break; g *= .97; }
    const order = shuffled(cells.length); pts.forEach((p, i) => { const c = cells[order[i % cells.length]]; const jx = rng() - .5, jy = rng() - .5; p.tx = c[0] + jx * g * .85; p.ty = c[1] + jy * g * .85; });
    x = cv.getContext('2d'); lastT = -1;
  };
  // t runs 0 to 5 through the pinned section: the robot at night, one bright dot per listing, the loan's share rising from the base, every dot lifting off into the sky, and the robot whole again beside the ask
  const STEPS = 7, paths = () => Array.from({ length: STEPS }, () => new Path2D());
  const paint = t => {
    if (!x) return; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const listOn = smooth(t, .95, 1.6), listOff = 1 - smooth(t, 1.9, 2.15), fill = smooth(t, 2.15, 2.75), loanOff = smooth(t, 3, 3.2), all = smooth(t, 3, 3.3), out = smooth(t, 3.05, 3.65), back = smooth(t, 4.2, 4.7);
    const buckets = paths(), R0 = pitch * .5;
    for (const p of pts) {
      const lit = p.li < 2 ? clamp((listOn - p.li) * 14) * listOff : 0, loan = clamp((fill * .7 - p.lr) * 60), whole = all * clamp((all * 1.3 - p.q * .3) * 3);
      const on = Math.max(lit, loan * (1 - loanOff), whole);
      const a = .36 + .64 * on, rad = Math.max(.5, R0 * Math.max(.34, p.s) * (1 + .3 * lit));
      const k0 = clamp(out * 1.35 - p.r * .35), k1 = clamp(back * 1.35 - p.q * .35), k = k0 * (1 - k1), f = k * k * (3 - 2 * k);
      const px = lerp(p.hx, p.tx, f), py = lerp(p.hy, p.ty, f), rr = lerp(rad, W > 820 ? 1.5 + 1.5 * p.q : 1.1 + 1 * p.q, f);
      const q = Math.min(STEPS - 1, Math.round(a * (STEPS - 1))), path = buckets[q];
      path.moveTo(px + rr, py); path.arc(px, py, rr, 0, 6.2832);
    }
    x.fillStyle = '#fff';
    buckets.forEach((path, i) => { x.globalAlpha = i / (STEPS - 1); x.fill(path); }); x.globalAlpha = 1;
  };
  // the steps in order. Nothing is written between the loan and the wish, while the dots lift off from behind where the big line will stand
  const MARKS = [[0, 0], [.9, 1], [1.9, 2], [3, -1], [3.45, 3], [4.25, 4]], LEN = 5.6;
  const story = () => {
    if (!own || !cv || !pts) return;
    const r = own.getBoundingClientRect(); if (r.bottom < -40 || r.top > innerHeight + 40) return;
    const want = progress(own) * LEN;
    tNow = tNow === null ? want : tNow + (want - tNow) * .12;
    const t = tNow; let b = 0; MARKS.forEach(m => { if (t >= m[0]) b = m[1]; });
    beats.forEach((el, i) => el.classList.toggle('on', i === b));
    if (mid) mid.style.opacity = smooth(t, .4, 1.7).toFixed(3);
    if (day) day.style.opacity = smooth(t, 2.5, 3.2).toFixed(3);
    if (Math.abs(t - lastT) > .0006) { paint(t); lastT = t; }
  };
  // a keyboard reader who tabs to a link in a step that is not showing is taken to that step
  beats.forEach((el, i) => el.addEventListener('focusin', () => { if (el.classList.contains('on') || !own) return; const r = own.getBoundingClientRect(), h = r.height - innerHeight; scrollTo(0, scrollY + r.top + h * (MARKS.find(m => m[1] === i)[0] + .2) / LEN); }));
  const frame = () => { road(); story(); requestAnimationFrame(frame); };
  addEventListener('resize', () => { L = null; size(); });
  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { L = null; size(); });
  requestAnimationFrame(frame);

  // reduced motion: the robot finished, every dot lit, drawn once
  function drawFinal() {
    const cv = root.querySelector('.v-bot'), b = (window.FERRA_DOTS || {})['arm-l']; if (!cv || !b) return;
    const box = cv.parentElement, list = b.d.split(';').filter(Boolean).map(s => s.split(',').map(Number)), ys = list.map(p => p[1]), y0 = Math.min(...ys), rows = Math.max(...ys) - y0 + 1;
    const pitch = Math.min(box.clientWidth || 340, 560) / b.w, d = Math.min(2, devicePixelRatio || 1); cv.width = pitch * b.w * d; cv.height = pitch * rows * d; cv.style.width = pitch * b.w + 'px'; cv.style.height = pitch * rows + 'px';
    const g = cv.getContext('2d'); g.scale(d, d); g.fillStyle = '#fff';
    for (const [cx, cy, L, A] of list) { g.beginPath(); g.arc((cx + .5) * pitch, (cy - y0 + .5) * pitch, Math.max(.5, pitch * .5 * (A / 100) * Math.min(1, .35 + .65 * L / 100)), 0, 6.2832); g.fill(); }
  }
})();
