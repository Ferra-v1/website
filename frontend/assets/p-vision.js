// Vision page: the films play only while on screen; the robots drive past as the page scrolls; one big robot's dots light up with the story.
// Native scrolling throughout: sections pin with position sticky and this file only reads scroll position. With reduced motion everything sits finished and in order.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const root = document.querySelector('[data-page="vision.html"]'); if (!root) return;

  // films
  document.querySelectorAll('video[data-film]').forEach(v => {
    if (reduce) { v.preload = 'none'; return; }
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

  // the road: the robots drive past one by one, then the camera pulls back until all of them stand together on the one line
  const work = root.querySelector('.v-work'), track = root.querySelector('.v-track'), slots = [...root.querySelectorAll('[data-slot]')], caps = slots.map(s => s.querySelector('figcaption')), world = root.querySelector('[data-world]'), crowd = root.querySelector('.v-crowd');
  let roadP = null, crowdKey = '';
  const road = () => {
    if (!work || !track || !slots.length) return;
    const r = work.getBoundingClientRect(); if (r.bottom < -80 || r.top > innerHeight + 80) return;
    const want = progress(work); roadP = roadP === null ? want : roadP + (want - roadP) * .16;
    const p = roadP, sw = slots[0].offsetWidth, N = slots.length, wide = innerWidth > 820;
    const pos = smooth(p, .01, .62) * (N - 1), zoom = wide ? smooth(p, .66, .86) : 0, fit = Math.min(1, innerWidth * .94 / (N * sw));
    const far = (innerWidth - sw) / 2 - pos * sw, all = (innerWidth - N * sw * fit) / 2, X = far + (all - far) * zoom, S = 1 + (fit - 1) * zoom;
    track.style.transform = `translate3d(${X.toFixed(1)}px,0,0) scale(${S.toFixed(4)})`;
    const last = wide ? 0 : smooth(p, .72, .8);   // a phone keeps the last robot and swaps its caption
    slots.forEach((s, i) => { const d = clamp(Math.abs(i - pos)), base = 1 - .62 * d; s.style.opacity = (base + (1 - base) * zoom).toFixed(3);
      if (caps[i]) caps[i].style.opacity = (clamp(1 - d * 2.6) * (1 - clamp(zoom * 5)) * (i === N - 1 ? 1 - last : 1)).toFixed(3); });
    if (world) world.style.opacity = smooth(p, wide ? .68 : .7, wide ? .82 : .84).toFixed(3);
    if (crowd) {
      const fade = wide ? smooth(p, .84, .87) : 0, cw = Math.round(sw * fit), rh = slots[0].querySelector('.rs-bot').offsetHeight, key = cw + '|' + rh;
      if (key !== crowdKey) { crowdKey = key; crowd.style.left = (innerWidth - N * sw * fit) / 2 + 'px'; [...crowd.children].forEach(c => { c.style.width = sw * fit + 'px'; const b = c.querySelector('.rs-bot'); b.style.height = rh * fit + 'px'; }); if (window.FerraDots && crowd.offsetParent) crowd.querySelectorAll('canvas').forEach(c => FerraDots.draw(c)); }
      work.classList.toggle('v-crowded', wide && p > .78);
      work.classList.toggle('v-settled', wide && fade > .995);
      crowd.style.opacity = fade.toFixed(3); track.style.opacity = (1 - fade).toFixed(3);
    }
  };

  // the big robot
  const own = root.querySelector('.v-own'), cv = root.querySelector('.v-bot'), box = root.querySelector('.v-botbox');
  const beats = [...root.querySelectorAll('[data-beat]')];
  const mid = root.querySelector('.v-sky-mid'), day = root.querySelector('.v-sky-day');
  const bot = (window.FERRA_DOTS || {})['arm-l'];
  let lastT = -1, lastP = 0, pts = null, W = 0, H = 0, pitch = 0, x = null, y0 = 0, y1 = 0, dpr = 1, tNow = null;
  const parse = () => {
    if (!bot || pts) return;
    pts = bot.d.split(';').filter(Boolean).map(s => { const [cx, cy, L, A, acc, ed] = s.split(',').map(Number); const l = L / 100, a = A / 100;
      return { x: cx, y: cy, s: a * Math.min(1, .3 + .7 * Math.pow(l, .9) + (ed / 100) * .35), acc, r: Math.random(), q: Math.random() }; });
    y0 = Math.min(...pts.map(p => p.y)); y1 = Math.max(...pts.map(p => p.y));
  };
  const size = () => {
    if (!cv || !box || !bot) return; parse();
    const bw = box.clientWidth, bh = box.clientHeight || bw * 1.1, rows = y1 - y0 + 1;
    pitch = Math.min(bw / bot.w, bh / rows); W = pitch * bot.w; H = pitch * rows; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    x = cv.getContext('2d');
  };
  // t runs 0 to 4.4 through the pinned section: a few dots lit, the price scan, the loan filling from the bottom, then every dot lit and pulled a little apart, and it holds beside the ask
  const paint = (t, now) => {
    if (!x) return; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const scan = smooth(t, .95, 1.75), fill = smooth(t, 1.95, 2.7), all = smooth(t, 2.8, 3.45), rows = y1 - y0 + 1, tw = now * .0016;
    const cx = W / 2, cy = H * .55, spread = all * .02;
    for (const p of pts) {
      const row = p.y - y0, f = row / rows;
      const shaped = clamp((scan * 1.3 - f * 1.15) * 7);               // the price scan reads the robot from the top down
      const loaned = clamp((fill * .72 - (1 - f)) * 16 + (p.q - .5));  // the loan rises from the base to about 70% of the height
      const lit = clamp((all * 1.25 - p.r) * 9);                       // one day: dot by dot, in no order
      const star = p.q < .018 ? 1 : 0;                                 // today: only a few
      let a = .46 + .28 * shaped, rad = .72 + .14 * shaped;
      let c0 = 255, c1 = 255, c2 = 255;
      if (loaned > 0) { a += (.96 - a) * loaned; rad += (.92 - rad) * loaned; c0 += (150 - c0) * loaned; c1 += (232 - c1) * loaned; }
      if (star) { const b = .78 + .22 * Math.sin(tw + p.r * 40); a = Math.max(a, b); rad = Math.max(rad, 1); c0 = 255; c1 = 255; }
      if (lit > 0) { a += (1 - a) * lit; const pop = 1 + .5 * Math.sin(Math.PI * Math.min(1, lit)); rad = rad + (1 - rad) * lit; rad *= pop > 1 && lit < 1 ? pop : 1; c0 += (255 - c0) * lit; c1 += (255 - c1) * lit; rad *= 1 + all * .05 * Math.sin(tw + p.r * 30); }
      const px = (p.x + .5) * pitch, py = (row + .5) * pitch;
      const dx = px + (px - cx) * spread, dy = py + (py - cy) * spread;
      x.fillStyle = `rgba(${c0 | 0},${c1 | 0},${c2},${a.toFixed(3)})`;
      x.beginPath(); x.arc(dx * .92 + W * .04, dy * .92 + H * .04, Math.max(.5, pitch * .54 * Math.max(.34, p.s) * rad), 0, 6.2832); x.fill();
    }
  };
  const story = now => {
    if (!own || !cv) return;
    const r = own.getBoundingClientRect(); if (r.bottom < -40 || r.top > innerHeight + 40) return;
    const want = progress(own) * 4.4;
    tNow = tNow === null ? want : tNow + (want - tNow) * .12;
    const t = tNow, b = t < .85 ? 0 : t < 1.85 ? 1 : t < 2.75 ? 2 : t < 3.6 ? 3 : 4;
    beats.forEach((el, i) => el.classList.toggle('on', i === b));
    if (mid) mid.style.opacity = smooth(t, .4, 1.9).toFixed(3);
    if (day) day.style.opacity = smooth(t, 2.3, 3.3).toFixed(3);
    // moving with the page: every frame. At rest: a slow twinkle is enough
    if (Math.abs(t - lastT) > .0008 || now - lastP > 90) { paint(t, now); lastT = t; lastP = now; }
  };
  // a keyboard reader who tabs to a link in a step that is not showing is taken to that step
  beats.forEach((el, i) => el.addEventListener('focusin', () => { if (el.classList.contains('on') || !own) return; const r = own.getBoundingClientRect(), h = r.height - innerHeight; scrollTo(0, scrollY + r.top + h * ([.85, 1.85, 2.75, 3.6][i - 1] || 0) / 4.4 + 40 * (i > 0)); }));
  const frame = now => { road(); story(now); requestAnimationFrame(frame); };
  addEventListener('resize', () => { size(); lastT = -1; });
  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
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
