// Vision page: one timeline, measured in screens of scroll (STORYBOARD.md, Vision). The stage holds still and everything on it is a pure function of how far the page has scrolled, except the delivery robot's Resolve, which runs once on arrival.
// A dot on the arm is always a piece of this one robot: dim, lit once it has a price, the share a loan pays for, then lifted off. Nothing twinkles and no dot is lit at random.
// Native scrolling throughout: the stage pins with position sticky and this file only reads scroll position. With reduced motion everything sits finished and in order.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const win = (t, a, b, c, d) => smooth(t, a, b) * (1 - smooth(t, c, d));
  const root = document.querySelector('[data-page="vision.html"]'); if (!root) return;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const run = $('.v-run'), cv = $('.v-bot'), SEATS = cv ? JSON.parse(cv.dataset.seats) : [];

  // the fine dots of the film's own arm, shared with Home. A script tag, so it also works from a file
  let armAsked = false, armWait = [];
  const needArm = then => { if (window.FERRA_ARM) return then(); armWait.push(then); if (armAsked) return; armAsked = true; const s = document.createElement('script'); s.src = 'assets/h-arm.js'; s.onload = () => armWait.splice(0).forEach(f => f()); document.head.appendChild(s); };

  if (reduce) { needArm(drawFinal); return; }
  root.classList.add('v-live');

  // ------------------------------------------------------------ the timeline, in hundredths of a screen. Phone: a move takes 70% of the distance, a hold stays what it is
  let T = null, VH = 1;
  const plan = () => { const phone = innerWidth <= 720, m = phone ? .7 : 1, t = { m, phone };
    // street: the words hold, leave, then the film goes down to ink as the delivery robot rolls on from the film robot's side
    t.wOut0 = 70; t.wOut1 = t.wOut0 + 30 * m; t.d0 = t.wOut1; t.d1 = t.d0 + 80 * m;
    // parade: six stops, each a caption held 65 and a move of 30, then the pull back, then the point holds. The robot only leaves once its caption has been read for 60
    t.move = 30 * m; t.stop = 65 + t.move; t.r0 = t.d1; t.r1 = t.r0 + 6 * t.stop; t.z1 = t.r1 + 100 * m; t.pe = t.z1 + 60;
    // the building site: the film rises behind the line of eight, the words swap, the next film crosses in
    t.u0 = t.pe; t.u1 = t.u0 + 100 * m; t.w1a = t.u1 - 40 * m; t.w1b = t.u1 - 20 * m; t.sw0 = t.u1 + 55; t.sw1 = t.sw0 + 20 * m; t.w2z = t.sw1 + 60; t.c0 = t.sw1 + 20 * m; t.c1 = t.c0 + 100 * m;
    // the hall: words hold, then the film goes down as the dim arm appears in its spot
    t.h0 = t.c1; t.hw = t.h0 + 20 * m; t.hz = t.hw + 70; t.hd0 = t.hz + 10 * m; t.hd1 = t.hd0 + 80 * m;
    // four chapters: words swap over 20, then one change over 100 while they hold
    // the first of them changes nothing, so it only holds long enough to read
    t.o0 = t.hd1; t.sw = 20 * m; t.ch = t.sw + 100 * m; t.b0 = m < 1 ? 70 : 80; t.B = [0, 1, 2, 3].map(i => i ? t.o0 + t.b0 + (i - 1) * t.ch : t.o0);
    // daylight: the ground fades white over 60 while the dots come home over 100, then the ask holds
    t.e0 = t.o0 + t.b0 + 3 * t.ch; t.e1 = t.e0 + 60; t.e2 = t.e0 + 100 * m; t.ea = t.e2 - t.sw; t.end = t.e2 + 60;
    return t; };

  // ------------------------------------------------------------ things that fade
  const shown = new Map();
  const fade = (el, v) => { if (!el) return; const o = shown.get(el); if (o !== undefined && Math.abs(o - v) < .002) return; shown.set(el, v); el.style.opacity = v.toFixed(3); el.style.visibility = v < .004 ? 'hidden' : 'visible'; };
  const street = $('.v-street'), site = $('.v-site'), hall = $('.v-hall'), wStreet = $('.v-w-street'), wS1 = $('.v-w-site1'), wS2 = $('.v-w-site2'), wHall = $('.v-w-hall'), work = $('.v-work'), own = $('.v-own'), grad = $('.v-sky-grad'), white = $('.v-sky-white'), beats = $$('.v-beat'), endB = $('.v-end');

  // ------------------------------------------------------------ films load as they come near, and play only while they show. Street and site play once and hold their last frame; the hall loops
  const films = [{ l: street, v: street.querySelector('video'), a: () => -1, on: true, asked: true }, { l: site, v: site.querySelector('video'), a: () => T.r1, on: false, asked: false }, { l: hall, v: hall.querySelector('video'), a: () => T.u1, on: false, asked: false }];
  const playIf = f => { const q = f.v.play(); if (q) q.catch(() => {}); };
  const filmTick = t => films.forEach(f => { const on = +(shown.get(f.l) ?? (f.on ? 1 : 0)) > .01;
    if (!f.asked && t > f.a()) { f.asked = true; f.v.preload = 'auto'; f.v.load(); }
    if (on !== f.on) { f.on = on; if (on) { if (f.v.ended) f.v.currentTime = 0; playIf(f); } else f.v.pause(); } });

  // ------------------------------------------------------------ the road, ported from the previous site: each robot stops so its caption can be read; then the camera pulls back until eight stand together on one line
  const slots = $$('[data-slot]'), caps = slots.map(s => s.querySelector('figcaption')), world = $('.v-world'), crowd = $('.v-crowd'), track = $('.v-track'), roadEl = $('.v-road'), line = $('.v-line');
  const N = slots.length, asp = slots.map(s => +s.dataset.a), tall = slots.map(s => +s.dataset.h), extra = slots.map(s => s.hasAttribute('data-extra'));
  const first = slots[1].querySelector('.rs-bot'); let resolved = false, L = null;
  const roadLayout = () => { const vw = document.documentElement.clientWidth, wide = vw > 820, sw = slots[0].offsetWidth, R = slots[0].querySelector('.rs-bot').offsetHeight;
    const cw = Math.min(1680, vw - 48), gap = 24, sumW = tall.reduce((a, h, i) => a + h * asp[i], 0), s = Math.min((cw - gap * (N - 1)) / sumW, innerHeight * .42 / Math.max(...tall));
    const used = sumW * s + gap * (N - 1), left = (vw - used) / 2; let x = left;
    const cx = asp.map((a, i) => { const w = a * tall[i] * s, c = x + w / 2; x += w + gap; return c; });
    // a slot's robot is as tall as the box, or as wide as the slot if that comes first; each scales to its height in the line
    const S = asp.map((a, i) => tall[i] * s / Math.min(R, sw / a));
    const gy = parseFloat(getComputedStyle(root).getPropertyValue('--gy')) / 100 * innerHeight, gy2 = parseFloat(getComputedStyle(root).getPropertyValue('--gy2')) / 100 * innerHeight;
    L = { vw, wide, sw, R, cx, S, rise: gy - gy2 };
    if (wide) { crowd.style.left = left + 'px'; crowd.style.gap = gap + 'px'; [...crowd.children].forEach((c, i) => { c.style.width = asp[i] * tall[i] * s + 'px'; c.querySelector('.rs-bot').style.height = tall[i] * s + 'px'; }); if (work.classList.contains('v-crowded') && window.FerraDots) crowd.querySelectorAll('canvas').forEach(c => FerraDots.draw(c)); } };
  const road = t => { const a = smooth(t, T.d0, T.d0 + (T.d1 - T.d0) * .6) * (1 - smooth(t, T.u0 + 30 * T.m, T.u0 + 70 * T.m)); fade(work, a); if (a < .004) return;
    if (!L) roadLayout();
    const u = (t - T.r0) / T.stop, i0 = clamp(Math.floor(u), 0, 5), f = u - i0, pos = u <= 0 ? 1 : 1 + i0 + (i0 < 5 ? smooth(f, 1 - T.move / T.stop, 1) : 0);   // a stop at each robot. The move takes the end of each stop
    const zoom = L.wide ? smooth(t, T.r1, T.z1) : 0, last = L.wide ? 0 : smooth(t, T.r1, T.r1 + 20 * T.m), enter = smooth(t, T.d0, T.d1);
    roadEl.style.transform = L.wide ? `translate3d(0,${(-zoom * L.rise).toFixed(1)}px,0)` : '';
    line.style.opacity = smooth(t, T.d0 + (T.d1 - T.d0) * .3, T.d1).toFixed(3);
    slots.forEach((s, i) => {
      const d = clamp(Math.abs(i - pos)); let op = (1 - .68 * d) * (i === 1 ? 1 : smooth(t, T.d1 - 10, T.d1 + 20));
      if (extra[i]) op = 0;
      let X = lerp(L.vw / 2 + (i - pos) * L.sw, L.wide ? L.cx[i] : L.vw / 2, zoom), Sc = lerp(1, L.S[i], zoom);
      // the first robot rolls on from where the film's robot stands, and grows to its place
      if (i === 1 && t < T.d1) { X = lerp(L.vw * (L.wide ? .69 : .6), X, enter); Sc *= lerp(.62, 1, enter); op *= smooth(t, T.d0, T.d0 + (T.d1 - T.d0) * .5); }
      s.style.transform = `translate3d(${(X - L.sw / 2).toFixed(1)}px,0,0) scale(${Sc.toFixed(4)})`;
      s.style.opacity = lerp(op, 1, zoom).toFixed(3);
      // the caption stands still in the middle of the screen while its robot moves
      const c = caps[i]; if (c) { const j = i - 1, a0 = T.r0 + j * T.stop, on = j === 0 ? smooth(t, T.d1 - 20, T.d1) : smooth(t, a0 - 5, a0 + 5), off = j === 5 ? last : smooth(t, a0 + T.stop - 15, a0 + T.stop - 5);
        c.style.opacity = (on * (1 - off) * (1 - clamp(zoom * 5))).toFixed(3); c.style.transform = `translate3d(${((L.vw / 2 - X) / Sc).toFixed(1)}px,0,0)`; } });
    world.style.opacity = (L.wide ? smooth(t, T.z1 - 20 * T.m, T.z1) : smooth(t, T.r1 + 10 * T.m, T.r1 + 30 * T.m)).toFixed(3);
    if (L.wide) { const k = smooth(t, T.z1 - 16 * T.m, T.z1 - 6 * T.m), near = t > T.z1 - 30 * T.m;
      if (near && !work.classList.contains('v-crowded')) { work.classList.add('v-crowded'); crowd.querySelectorAll('canvas').forEach(c => { if (window.FerraDots) FerraDots.draw(c); }); } else if (!near) work.classList.remove('v-crowded');
      work.classList.toggle('v-settled', k > .995); crowd.style.opacity = k.toFixed(3); track.style.opacity = (1 - k).toFixed(3); }
    // the Resolve runs once on this page, as the first robot arrives at its stop
    if (!resolved && t >= T.d1 - 1 && t < T.r0 + T.stop && window.FerraResolve) { const r = FerraResolve.get(first); if (r.ready()) { resolved = true; r.run(); } }
  };

  // ------------------------------------------------------------ the arm. Every choice comes from a fixed seed, so the same dots mean the same thing on every visit
  const box = $('.v-botbox'), stage = $('.v-stage'), b3 = $('.v-b3');
  const rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261106);
  let pts = null, W = 0, H = 0, pitch = 0, x = null, dpr = 1, lastT = -1, sized = false, clear = null;
  const shuffled = n => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const parse = () => { if (pts || !window.FERRA_ARM) return;
    const fine = window.FERRA_ARM.map(q => ({ cx: q[0] + .5, cy: q[1] + .5, s: q[2], seat: 0, lr: 0, r: rng(), hx: 0, hy: 0, tx: 0, ty: 0, ax: 0, ay: 0 }));
    const seats = SEATS.map(q => ({ cx: q[0], cy: q[1], s: 1, seat: 1, lr: 0, r: rng(), hx: 0, hy: 0, tx: 0, ty: 0, ax: 0, ay: 0 }));
    pts = fine.concat(seats);
    // rank every dot from the base up, so "70%" lights exactly 70% of the dots
    [...pts].sort((a, b) => b.cy - a.cy || a.cx - b.cx).forEach((p, i, l) => { p.lr = i / l.length; }); };
  const size = () => { parse(); if (!pts) return;
    const pr = stage.getBoundingClientRect(), br = box.getBoundingClientRect(), xs = pts.map(p => p.cx), ys = pts.map(p => p.cy), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    W = pr.width; H = pr.height; pitch = Math.min(br.width / (x1 - x0), br.height / (y1 - y0)); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ox = br.left - pr.left, oy = br.top - pr.top + br.height - pitch * (y1 - y0);   // the robot's base on the box's bottom edge, its back on the left edge
    pts.forEach(p => { p.hx = ox + (p.cx - x0) * pitch; p.hy = oy + (p.cy - y0) * pitch; });
    // where the pieces go: one even lattice over the whole sky, every cell filled. Even, so it reads as one thing shared out and never as weather. While the words are up, a dot whose cell lies under them waits on the nearest free cell outside, and when they leave it goes to its own. So the lattice ends unbroken
    const hole = [...(b3 ? b3.children : [])].map(c => c.getBoundingClientRect()).reduce((a, c) => c.width ? { l: Math.min(a.l, c.left), r: Math.max(a.r, c.right), t: Math.min(a.t, c.top), b: Math.max(a.b, c.bottom) } : a, { l: 1e9, r: -1e9, t: 1e9, b: -1e9 });
    const m = W > 820 ? 30 : 12, hcx = (hole.l + hole.r) / 2 - pr.left, hcy = (hole.t + hole.b) / 2 - pr.top, ha = Math.max(1, (hole.r - hole.l) / 2 * 1.1 + m), hb = Math.max(1, (hole.b - hole.t) / 2 * 1.1 + m);
    clear = { x: hcx, y: hcy, a: ha, b: hb };
    const gauge = (xx, yy) => { const u = (xx - hcx) / ha, v = (yy - hcy) / hb, uu = u * u, vv = v * v; return Math.sqrt(Math.sqrt(uu * uu + vv * vv)); };   // 1 on the clearing's edge
    const g = Math.sqrt(W * H / pts.length), cols = Math.floor(W / g), rows = Math.floor(H / g), cw = W / cols, ch = H / rows, cells = [];   // never more cells than dots, so no cell stands empty; the few left over share one
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const xx = (c + .5) * cw, yy = (r + .5) * ch, d = gauge(xx, yy); cells.push([xx, yy, d < 1 || (d < 1.25 && rng() > (d - 1) / .25)]); }   // the clearing's edge thins out over a quarter of its size, so it has no hard line
    // the nearest free cell, straight out from the words, or straight up or down when the words reach both sides of the screen. Then one a few cells off, so the dots do not all fly to a single point
    const sides = hcx - ha <= 0 || hcx + ha >= W, cell = (c, r) => cells[r * cols + c];
    const waitAt = q => { if (!q[2]) return q; const d = Math.max(.02, gauge(q[0], q[1])), u = (q[0] - hcx) / d, v = sides ? (q[1] < hcy ? -hb : hb) : (q[1] - hcy) / d; let c = 0, r = 0, n = q;
      for (let k = 1; k < 5 && n[2]; k += .03) { c = clamp(Math.floor((sides ? q[0] : hcx + u * k) / cw), 0, cols - 1); r = clamp(Math.floor((hcy + v * k) / ch), 0, rows - 1); n = cell(c, r); }
      for (let i = 0; i < 6; i++) { const o = cell(clamp(c + Math.round((rng() - .5) * 8), 0, cols - 1), clamp(r + Math.round((rng() - .5) * 8), 0, rows - 1)); if (!o[2]) return o; } return n; };
    const order = shuffled(cells.length); pts.forEach((p, i) => { const c = cells[order[i % cells.length]], w = waitAt(c); p.tx = c[0]; p.ty = c[1]; p.ax = w[0]; p.ay = w[1]; });
    x = cv.getContext('2d'); lastT = -1; sized = true; };
  const STEPS = 7, BASE = .3, FINE = .62;
  const paint = t => { if (!x) return; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const lightUp = smooth(t, T.B[1] + T.sw, T.B[1] + T.ch) * 1.2, cut = lerp(1.02, .7, smooth(t, T.B[2] + T.sw, T.B[2] + T.ch));
    const all = smooth(t, T.B[3] + T.sw, T.B[3] + T.sw + T.ch * .2), out = smooth(t, T.B[3] + T.sw, T.B[3] + T.ch), back = smooth(t, T.e0, T.e2);
    const buckets = Array.from({ length: STEPS }, () => new Path2D()), R0 = pitch * .5;
    const clearing = 1 - smooth(t, T.e0, T.e0 + 30 * T.m);   // open while the words are up, closing as they leave, so it never stands empty
    for (const p of pts) {
      const lit = clamp((lightUp - p.lr) * 7) * clamp((cut - p.lr) * 60), on = Math.max(lit, all);
      let a = p.seat ? on : BASE + (lerp(FINE, 1, all) - BASE) * on; const rad = p.seat ? Math.max(1.1, pitch * .62) : Math.max(.5, R0 * Math.max(.34, p.s) * .9);
      if (a <= .004) continue;
      const k0 = clamp(out * 1.35 - p.r * .35), k1 = clamp(back * 1.9 - (1 - p.lr) * .9), k = k0 * (1 - k1), f = k * k * (3 - 2 * k);
      const set = clamp((1 - clearing) * 1.4 - p.r * .4), gx = lerp(p.ax, p.tx, set), gy = lerp(p.ay, p.ty, set), px = lerp(p.hx, gx, f), py = lerp(p.hy, gy, f), rr = lerp(rad, W > 820 ? 2.6 : 1.7, f);
      // no dot shows on the words: one crossing them on its way out passes unseen, and comes back into view at the clearing's soft edge
      if (f > 0 && clearing > 0) { const u = (px - clear.x) / clear.a, v = (py - clear.y) / clear.b, uu = u * u, vv = v * v, d = Math.sqrt(Math.sqrt(uu * uu + vv * vv)); a *= lerp(1, clamp((d - .85) / .2), clearing * clamp(f / .15)); if (a <= .004) continue; }
      const q = Math.min(STEPS - 1, Math.round(a * (STEPS - 1))), path = buckets[q];
      path.moveTo(px + rr, py); path.arc(px, py, rr, 0, 6.2832);
    }
    const ink = smooth(t, T.e0 + 18, T.e0 + 42), g = smooth(t, T.hd0, T.hd1);   // white on the sky, cobalt on the paper, crossing quickly around the moment the ground is at its middle, where a dot in between would not show. The arm comes up as the hall's film goes down
    x.fillStyle = `rgb(${Math.round(lerp(255, 40, ink))},${Math.round(lerp(255, 71, ink))},${Math.round(lerp(255, 206, ink))})`;
    buckets.forEach((path, i) => { x.globalAlpha = g * Math.max(.04, i / (STEPS - 1)); x.fill(path); }); x.globalAlpha = 1; };

  // ------------------------------------------------------------ one frame
  const beatAt = i => { const a = T.B[i], s = T.sw, nxt = i < 3 ? T.B[i + 1] : T.e0; return win(eased, i ? a + s / 2 : a - s, i ? a + s : a, nxt, nxt + (i === 3 ? s : s / 2)); };
  let eased = null;
  const frame = () => { requestAnimationFrame(frame);
    const r = run.getBoundingClientRect(); if (r.bottom < -40 || r.top > innerHeight + 40) return;
    const want = clamp(-r.top / VH * 100, 0, T.end);
    eased = eased === null ? want : eased + (want - eased) * .14; if (Math.abs(want - eased) < .02) eased = want; const t = eased;
    fade(street, 1 - smooth(t, T.d0, T.d1)); fade(wStreet, 1 - smooth(t, T.wOut0, T.wOut1));
    fade(site, smooth(t, T.u0, T.u1) * (1 - smooth(t, T.c1, T.c1 + 1)));
    fade(wS1, win(t, T.w1a, T.w1b, T.sw0, T.sw0 + 10 * T.m)); fade(wS2, win(t, T.sw1 - 10 * T.m, T.sw1, T.w2z, T.w2z + 15 * T.m));
    fade(hall, win(t, T.c0, T.c1, T.hd0, T.hd1)); fade(wHall, win(t, T.h0, T.hw, T.hz, T.hz + 20 * T.m));
    filmTick(t); road(t);
    // the arm's layer, once it starts to matter
    const armOn = t > T.hd0 - 2;
    fade(own, armOn ? 1 : 0); if (armOn) { if (!sized) { needArm(() => { size(); lastT = -1; }); } fade(grad, smooth(t, T.B[3] + T.sw, T.B[3] + T.ch)); fade(white, smooth(t, T.e0, T.e1));
      [0, 1, 2, 3].forEach(i => fade(beats[i], beatAt(i))); endB.style.opacity = smooth(t, T.ea, T.e2).toFixed(3); endB.classList.toggle('on', t > T.ea + T.sw / 2);
      if (sized && Math.abs(t - lastT) > .02) { paint(t); lastT = t; }
      run.style.background = t > T.e1 ? '#fff' : ''; }
    else run.style.background = '';
  };
  const setup = () => { VH = stage.offsetHeight; T = plan(); run.style.height = (T.end + 100) / 100 * VH + 'px'; L = null; };
  addEventListener('resize', () => { setup(); if (sized) size(); });
  setup();
  // the arm's dots load a screen or so before they are needed
  const early = () => { if (T && -run.getBoundingClientRect().top / VH * 100 > T.u0) { removeEventListener('scroll', early); needArm(() => {}); } };
  addEventListener('scroll', early, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { L = null; if (sized) size(); });
  requestAnimationFrame(frame);

  // a keyboard reader who tabs to the button is taken to the ask
  $('.v-end .btn').addEventListener('focus', () => scrollTo({ top: run.getBoundingClientRect().top + scrollY + T.end / 100 * VH, behavior: 'instant' }));
})();

// reduced motion: the arm finished, every dot lit, drawn once
function drawFinal() {
  const cv = document.querySelector('.v-bot'), list = window.FERRA_ARM; if (!cv || !list) return;
  const xs = list.map(p => p[0]), ys = list.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), cols = Math.max(...xs) - x0 + 1, rows = Math.max(...ys) - y0 + 1;
  const pitch = Math.min((cv.parentElement.clientWidth || 340) * .9, 520) / cols, d = Math.min(2, devicePixelRatio || 1);
  cv.width = pitch * cols * d; cv.height = pitch * rows * d; cv.style.width = pitch * cols + 'px'; cv.style.height = pitch * rows + 'px'; cv.style.padding = '0'; cv.style.marginTop = '48px';
  const g = cv.getContext('2d'); g.scale(d, d); g.fillStyle = '#fff';
  for (const [cx, cy, s] of list) { g.beginPath(); g.arc((cx - x0 + .5) * pitch, (cy - y0 + .5) * pitch, Math.max(.5, pitch * .46 * Math.max(.34, s)), 0, 6.2832); g.fill(); }
}
