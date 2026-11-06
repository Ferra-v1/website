// Home page behaviour: the vision row, the step-synced term sheet, dot robots standing on hairlines, the vision statement, and the first screen
// with its film (the last block in this file). Runs after dotbot.js and site.js, before DOMContentLoaded.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = window.FERRA_DOTS || {};
  // dot names fall back the way dotbot.js does: drop -l, then the names below, then the coarse grid's own fallback
  const FALL = { cell: 'arm2', cartons: 'pallet', 'cell-loop': 'cell', 'cobot-loop': 'cobot', 'arm2-loop': 'arm2', 'pallet-loop': 'pallet', 'arm-loop': 'arm' };
  const pick = n => { const seen = new Set(); while (n && !seen.has(n)) { seen.add(n); if (D[n]) return { name: n, b: D[n] };
    if (n.endsWith('-l')) n = n.slice(0, -2); else n = FALL[n] || (n.endsWith('-s') && FALL[n.slice(0, -2)] ? FALL[n.slice(0, -2)] + '-s' : null); } return null; };

  // ---------------------------------------------------------------- H5 how a fleet loan works
  // site.js moves the active step; the sheet follows it so the lender row appears from step 2 and the prices line on step 4
  const live = document.querySelector('.h-live'), steps = [...document.querySelectorAll('.h-steps .step')];
  if (live && steps.length) {
    const sync = () => { const k = steps.findIndex(s => s.classList.contains('on')); live.dataset.step = Math.max(0, k); };
    const mo = new MutationObserver(sync); steps.forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] })); sync();
    steps.forEach(s => s.addEventListener('click', () => s.parentElement.classList.add('h-man')));
  }

  // ---------------------------------------------------------------- H3 vision: twelve robots assemble in turn, each price rises after its robot
  // One motion for the section: when the row is 35% in view, robots assemble left to right 120ms apart, each price fades in and rises
  // 300ms after its robot (CSS delays), and the hairline fills cobalt left to right. Once. Reduced motion draws the final state.
  const vrow = document.querySelector('.h-vrow');
  if (vrow) {
    const vb = [...vrow.querySelectorAll('canvas.h-vbot')];
    const drawV = (cv, anim) => { cv.dataset.anim = anim; window.FerraDots && window.FerraDots.draw(cv); };
    const shown = () => vb.filter(cv => cv.offsetParent !== null);
    if (reduce) { vrow.classList.add('h-done'); shown().forEach(cv => drawV(cv, 'static')); }
    else {
      vrow.classList.add('h-wait');
      const o = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; o.disconnect();
        vrow.classList.remove('h-wait'); vrow.classList.add('h-go');
        shown().forEach((cv, k) => setTimeout(() => drawV(cv, 'assemble'), k * 120));
        setTimeout(() => vrow.classList.add('h-done'), 3200); }), { threshold: .35 });
      o.observe(vrow);
    }
    let vt; addEventListener('resize', () => { clearTimeout(vt); vt = setTimeout(() => { if (vrow.classList.contains('h-go') || reduce) shown().forEach(cv => drawV(cv, 'static')); }, 160); });
  }

  // ---------------------------------------------------------------- dot robots standing on a hairline
  // Robots on a baseline are sized by height: each canvas gets the width that makes its dot grid exactly as tall as its slot, then
  // is pulled down by its empty bottom rows so its lowest dots touch the line.
  const grid = {};
  const info = name => { if (name in grid) return grid[name]; const r = pick(name); if (!r) return grid[name] = null;
    let my = 0, ny = 1e9, nx = 1e9, mx = 0; for (const s of r.b.d.split(';')) { const [x, y] = s.split(',').map(Number); if (y > my) my = y; if (y < ny) ny = y; if (x < nx) nx = x; if (x > mx) mx = x; }
    return grid[name] = { w: r.b.w, h: r.b.h, rows: r.b.h - 1 - my, my, ny, nx, mx }; };

  // vision row: each robot's visible dots stand exactly data-th px tall (data-thm on phones). dotbot.js sizes a robot
  // by its box height with the empty rows under the feet already cut, so the box is made taller by the empty rows above the head and
  // pulled up by the same amount: the price and its tick then sit right on the robot's top dot.
  const fitH = () => document.querySelectorAll('.h-vs .rs-bot[data-th]').forEach(box => {
    const cv = box.querySelector('canvas'), g = cv && info(cv.dataset.bot); if (!g) return;
    const phone = innerWidth <= 680, T = +(phone ? box.dataset.thm : box.dataset.th), rows = g.my + 1, Hb = T * rows / (rows - g.ny);
    box.style.height = Hb.toFixed(2) + 'px'; box.style.marginTop = -(Hb - T).toFixed(2) + 'px';
  });
  fitH();
  // the closing trio: robots on a hairline sized by height (its canvases sit in plain spans, so dotbot.js does not size them)
  const settle = () => document.querySelectorAll('.h-tb canvas').forEach(cv => {
    const g = info(cv.dataset.bot); if (!g) return;
    const slot = cv.closest('.h-tb') || cv.closest('.rs-bot'); const H = slot.clientHeight; if (!H) return;
    const avail = (cv.closest('.rstage') || slot).clientWidth || 1e4, wd = Math.min(avail, H * g.w / g.h), pitch = wd / g.w;
    cv.style.width = wd + 'px'; cv.style.height = g.h * pitch + 'px'; cv.style.marginBottom = -(g.rows * pitch) + 'px';
  });
  settle(); let st; addEventListener('resize', () => { clearTimeout(st); st = setTimeout(() => { fitH(); settle(); }, 120); });
})();

// The vision statement: every word starts grey and turns ink one after another as the sentence scrolls up the screen, and reverses
// on the way back. Without JavaScript, or with reduced motion, the sentence is simply ink.
(() => {
  const el = document.querySelector('[data-scrub]');
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const spans = words.map((w, i) => { const s = document.createElement('span'); s.textContent = w; el.append(s, i < words.length - 1 ? ' ' : ''); return s; });
  const FROM = [139, 147, 164];
  const TO = (getComputedStyle(el).color.match(/\d+/g) || [14, 22, 38]).slice(0, 3).map(Number);
  const SOFT = 5; // how many words are mid-change at once
  const last = new Array(spans.length).fill(-1);
  let queued = false;
  const paint = () => {
    queued = false;
    const r = el.getBoundingClientRect(), vh = innerHeight;
    // starts when the sentence enters the lower part of the screen, done by the time it is a little above the middle
    const start = vh * .86, end = vh * .42 - r.height;
    const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
    const head = p * (spans.length + SOFT);
    spans.forEach((s, i) => {
      const t = Math.round(Math.min(1, Math.max(0, (head - i) / SOFT)) * 100) / 100;
      if (t === last[i]) return;
      last[i] = t;
      s.style.color = `rgb(${FROM.map((f, k) => Math.round(f + (TO[k] - f) * t)).join(',')})`;
    });
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  paint();
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
})();

// The first screen and film. One canvas on one pinned stage, painted as a pure function of how far the page has scrolled, so scrolling back plays it backwards.
// Order: the moving robot slows to its pose, its fine dots gather into the 433 listing dots on the same silhouette, those dots fly to their true place on a chart
// of age against asking price, the line of typical prices draws, the field collapses into one dot on the chosen robot's price, the dot grows into the price,
// and the price splits into what a company could borrow and the rest. The picker on the first screen sets which price the film ends on.
(() => {
  const film = document.querySelector('.h-film'), stick = film && film.querySelector('.h-stick'); if (!film) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = film.querySelector('.h-cv'), ctx = cv.getContext('2d'), probe = film.querySelector('.h-probe');
  const $ = s => film.querySelector(s), b1 = $('.h-b1'), b2 = $('.h-b2'), b3 = $('.h-b3'), b4 = $('.h-b4'), axis = $('.h-axis'), n0 = $('.h-n0'), n1 = $('.h-n1'), n2 = $('.h-n2'), tipEl = $('.h-tip');
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, seg = (s, a, b) => clamp((s - a) / (b - a)), lerp = (a, b, t) => a + (b - a) * t;
  const io3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out3 = t => 1 - Math.pow(1 - t, 3), in2 = t => t * t;
  // the timeline, in screens scrolled
  const T = { slow: [0, .16], gather: [.16, .6], cam: [.1, .64], b1: [.54, .72, 1.2, 1.34], fly: [1.26, 2.06], axis: [1.6, 1.9], b2: [1.72, 1.94, 2.7, 2.84], curve: [1.95, 2.4],
    fall: [2.7, 3.16], axisOut: [2.7, 2.9], grow: [3.1, 3.42], b3: [3.3, 3.44, 3.76, 3.88], split: [3.8, 4.2], b4: [4.0, 4.24, 9, 9], end: 4.8 };
  const RESTS = [[.34, 0], [1.26, .98], [2.7, 2.5], [3.8, 3.6], [99, 4.8]];
  const BX0 = 5, BX1 = 106, BY0 = 9, BY1 = 118, HI = 125000, LO = 220;
  let autoOK = true, W = 0, H = 0, FH = 0, dpr = 1, phone = false, frames = null, nF = 96, fps = 12, t0 = 0, D = null, R = null, dirty = true, vis = true, pose = 84;
  let hero = { p: 6, r: 1000, a: 1 }, beat = { p: 6, r: 1000 }, floorY = 800, C = { l: 0, r: 1000, t: 0, b: 800 }, disc = {}, age = 10, price = 14700, loan = 10300, rest = 4400;
  const X = a => C.l + a / 30 * (C.r - C.l), Y = u => C.t + (Math.log(HI) - Math.log(u)) / (Math.log(HI) - Math.log(LO)) * (C.b - C.t);

  // ---------------------------------------------------------------- the price box: the only numbers baked into the page
  const tab = JSON.parse(document.getElementById('h-prices').textContent), rSel = document.getElementById('h-r'), ySel = document.getElementById('h-y'), pv = document.getElementById('h-pv'), lv = document.getElementById('h-lv'), tool = document.getElementById('h-tool');
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US'), r100 = v => Math.round(v / 100) * 100;
  let shownP = null, shownL = null, tw = 0;
  const setBox = () => {
    const f = tab.fam[rSel.value], y = +ySel.value; age = clamp(tab.now - y, 0, 30);
    price = r100(f.c[age]); loan = r100(f.c[age] * tab.share); rest = price - loan;
    const href = `price.html#r=${f.t}&y=${y}`; tool.href = href; film.querySelectorAll('[data-tool]').forEach(a => a.href = href);
    film.querySelectorAll('[data-say]').forEach(s => s.textContent = f.s); film.querySelectorAll('[data-yr]').forEach(s => s.textContent = y);
    film.querySelectorAll('[data-p]').forEach(s => s.textContent = fmt(price)); film.querySelectorAll('[data-l]').forEach(s => s.textContent = fmt(loan)); film.querySelectorAll('[data-e]').forEach(s => s.textContent = fmt(rest));
    if (shownP === null || reduce) { shownP = price; shownL = loan; pv.textContent = fmt(price); lv.textContent = fmt(loan); } else {
      const a = shownP, b = shownL, st = performance.now(); cancelAnimationFrame(tw);
      const step = t => { const k = out3(clamp((t - st) / 320)); shownP = lerp(a, price, k); shownL = lerp(b, loan, k); pv.textContent = fmt(r100(shownP)); lv.textContent = fmt(r100(shownL)); if (k < 1) tw = requestAnimationFrame(step); };
      tw = requestAnimationFrame(step);
    }
    if (W) layout();
    dirty = true;
  };
  rSel.addEventListener('change', setBox); ySel.addEventListener('change', setBox); rSel.value = 'all'; setBox();

  // ---------------------------------------------------------------- the moving robot: decode the sprite into one sorted dot list per frame
  const decode = m => new Promise(ok => { const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const out = []; for (let f = 0; f < m.frames; f++) { const ox = (f % m.per) * m.w, oy = Math.floor(f / m.per) * m.h, pts = [];
        for (let y = 0; y < m.h; y++) for (let X_ = 0; X_ < m.w; X_++) { const i = ((oy + y) * c.width + ox + X_) * 4, v = sz[i]; if (v) pts.push({ x: X_ + .5, y: y + .5, s: v / 252, acc: ac[i] > 127 ? 1 : 0, g: (ac[i] > 127 ? 100 : 0) + Math.round(v / 28), h: ((X_ * 73 + y * 151) % 97) / 97 }); }
        pts.sort((a, b) => a.g - b.g); out.push(pts); }
      nF = m.frames; fps = m.fps || 12; ok(out); };
    im.onload = ia.onload = done; im.src = m.src; ia.src = m.acc; });
  const load = (src, cb) => { const s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = () => {}; document.head.appendChild(s); };
  const seatFine = () => { if (!frames || !D) return; const list = frames[pose], rows = D.rows;
    for (const p of list) { let bd = 1e9, bi = 0; for (let j = 0; j < rows.length; j++) { const dx = rows[j][6] - p.x, dy = rows[j][7] - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = j; } } p.to = bi; p.dd = Math.min(1, Math.sqrt(bd) / 4); } };
  const afterPaint = f => requestAnimationFrame(() => setTimeout(f, 0));
  afterPaint(() => load('assets/h-arm.js', () => decode(window.FERRA_ARM).then(fr => { frames = fr; t0 = performance.now(); seatFine(); dirty = true;
    load('assets/h-film.js', () => { D = window.FERRA_FILM; pose = D.frame; prep(); seatFine(); layout(); dirty = true; }); })));

  // ---------------------------------------------------------------- listings
  const rad = u => Math.pow(u / 11000, .35);
  const prep = () => { const n = D.rows.length; R = { n, x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), x0: new Float32Array(n), y0: new Float32Array(n), r0: new Float32Array(n), x1: new Float32Array(n), y1: new Float32Array(n), r1: new Float32Array(n), d: new Float32Array(n), o: new Float32Array(n) };
    let far = 0; for (let j = 0; j < n; j++) { const q = D.rows[j], dx = q[6] - 22, dy = q[7] - 112, m = Math.hypot(dx, dy); R.d[j] = m; if (m > far) far = m; R.o[j] = ((j * 2654435761 >>> 0) % 1000) / 500 - 1; }
    for (let j = 0; j < n; j++) R.d[j] = 1 - R.d[j] / far; };   // the gripper leaves first, the base last

  // ---------------------------------------------------------------- layout
  const docTop = el => el.getBoundingClientRect().top + scrollY, docBot = el => el.getBoundingClientRect().bottom + scrollY;
  const place = (el, x, y) => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; };
  function layout() {
    W = stick.clientWidth; FH = stick.clientHeight; H = probe.clientHeight || FH; dpr = Math.min(2, devicePixelRatio || 1); phone = W <= 760;
    cv.width = Math.round(W * dpr); cv.height = Math.round(FH * dpr);
    const narrow = W <= 1060, cols = BX1 - BX0, rows = BY1 - BY0 + 1, stageTop = docTop(film);
    floorY = phone ? H - 62 : narrow ? H - 84 : Math.round(H * .925);
    const wrap = Math.min(W, 1200), mar = (W - wrap) / 2 + (phone ? 16 : 24);
    // the robot on the first screen stands on the floor line, beside the copy on desktop and under it on a phone
    if (narrow) {
      const copy = document.querySelector('.h-copy'), room = floorY - (docBot(copy) - stageTop) - 6, p = Math.min((W - 24) / cols, Math.max(150, room) / rows);
      hero = { p, r: W - 12, a: room < 120 ? .22 : 1 };
      const tb = b1.querySelector('.h-bt').getBoundingClientRect(), bottom = tb.height + 28 + 12, q = Math.min((W - 20) / cols, (floorY - bottom) / rows);
      beat = { p: q, r: W - (W - cols * q) / 2 };
    } else {
      const p = Math.min((floorY - 84) / rows, W * .47 / cols), r = Math.min(W - 28, Math.max(W / 2 + 672, mar + Math.min(600, W * .43) + 40 + cols * p));
      hero = { p, r, a: 1 }; beat = { p, r };
    }
    const copyEnd = (docBot(document.querySelector('.h-copy')) - stageTop) / H; T.b1[0] = Math.max(.54, copyEnd - .08); T.b1[1] = T.b1[0] + .18; RESTS[0][0] = Math.max(.8, copyEnd + .05);
    autoOK = !narrow || !D || (floorY - (BY1 - D.rows[D.demo][7]) * beat.p - 130 > b1.querySelector('.h-bt').getBoundingClientRect().height + 28);
    // the chart stands on the same line: its bottom edge is the floor the robot stood on
    const bt = b2.querySelector('.h-bt').getBoundingClientRect();
    const topY = (phone ? 28 : narrow ? 28 : Math.max(28, Math.min(56, H * .054))) + bt.height + (phone ? 20 : 26);
    C = { l: mar + (phone ? 60 : 124), r: W - mar - (phone ? 0 : 128), t: topY, b: floorY - (phone ? 6 : 8) };
    axis.querySelectorAll('.h-xl').forEach(s => { const a = +s.dataset.age, x = X(a); s.style.transform = `translate(${(a === 0 ? x - 4 : a === 30 && phone ? x - s.offsetWidth : x - s.offsetWidth / 2).toFixed(1)}px,${(floorY + 10).toFixed(1)}px)`; });
    axis.querySelectorAll('.h-yl').forEach(s => { s.style.transform = `translate(${(C.l - s.offsetWidth - (phone ? 6 : 14)).toFixed(1)}px,${(Y(+s.dataset.usd) - s.offsetHeight / 2).toFixed(1)}px)`; });
    if (D) { const l0 = axis.querySelector('.h-l0'), l1 = axis.querySelector('.h-l1'), al = axis.querySelector('.h-al');
      l0.style.transform = `translate(${(C.l - l0.offsetWidth - (phone ? 6 : 14)).toFixed(1)}px,${(Y(D.curve[0]) - l0.offsetHeight / 2).toFixed(1)}px)`;
      l1.style.transform = phone ? `translate(${(X(30) - l1.offsetWidth).toFixed(1)}px,${(Y(620) - l1.offsetHeight / 2).toFixed(1)}px)` : `translate(${(X(30) + 14).toFixed(1)}px,${(Y(D.curve[30]) - l1.offsetHeight + 15).toFixed(1)}px)`;
      const a = D.aucs.reduce((m, q) => q[5] > m[5] ? q : m); al.style.transform = `translate(${clamp(X(a[5]) - al.offsetWidth / 2, 8, W - al.offsetWidth - 8).toFixed(1)}px,${(Y(a[1]) + 9).toFixed(1)}px)`; }
    // discs
    const left = phone || narrow;
    const bb = (e, top) => e.querySelector('.h-bt').getBoundingClientRect().height + top;
    if (left) { const t3 = bb(b3, 28) + 14, t4 = bb(b4, 28) + 12, Rm = Math.min((W - 28) / 2, (floorY + 60 - t3) / 2);
      let r1 = Math.min(Rm * Math.sqrt(.7), (W - 24) * .4), r2, c1x, c1y, c2x, c2y;
      for (let i = 0; i < 12; i++) { r2 = r1 * Math.sqrt(.3 / .7); c1x = 12 + r1; c1y = t4 + r1; c2x = W - 12 - r2; const dx = c2x - c1x, dist = r1 + r2 + 6; c2y = c1y + Math.sqrt(Math.max(0, dist * dist - dx * dx)); if (c2y + r2 <= H - 14) break; r1 *= .95; }
      disc = { x: W / 2, y: t3 + Rm, R: Rm, r1, r2, c1x, c1y, c2x, c2y };
    } else { const rightX = Math.min(W - 28, W / 2 + 840), area = rightX - (mar + Math.min(460, W * .3) + 24), Rm = Math.min(H * .4, area / 2), r1 = Math.min(H * .36, (area - 8) / (2 * (1 + Math.sqrt(.3 / .7)))), r2 = r1 * Math.sqrt(.3 / .7), cy = H * .5;
      const base = cy + r1, c2x = rightX - r2, c1x = c2x - r2 - r1 - 8;
      disc = { x: rightX - area / 2, y: cy, R: Rm, r1, r2, c1x, c1y: base - r1, c2x, c2y: base - r2 }; }
    n0.querySelector('b').style.fontSize = (disc.R * .4).toFixed(1) + 'px';
    n1.querySelector('b').style.fontSize = (disc.r1 * .4).toFixed(1) + 'px'; n2.querySelector('b').style.fontSize = (disc.r2 * .4).toFixed(1) + 'px';
    place(n1, disc.c1x, disc.c1y); place(n2, disc.c2x, disc.c2y); n1.style.width = (disc.r1 * 1.7) + 'px'; n2.style.width = (disc.r2 * 1.7) + 'px';
    if (R) { const base = beat.p;
      for (let j = 0; j < R.n; j++) { const q = D.rows[j], f = rad(q[2]); R.x0[j] = beat.r - (q[6] - BX0) * beat.p; R.y0[j] = floorY - (BY1 - q[7]) * beat.p;
        R.r0[j] = base * .94 * f; R.x1[j] = X(q[5]); R.y1[j] = Y(q[2]); R.r1[j] = (phone ? 2.6 : 4.1) * Math.pow(f, .8); } }
    dirty = true;
  }

  // ---------------------------------------------------------------- painting
  const scroll = () => { let s = (scrollY - docTop(film)) / (H || 1); if (s < 0) s = 0; if (reduce) { for (const r of RESTS) if (s < r[0]) { s = r[1]; break; } } return s; };
  const show = (el, a, dy) => { const v = a > .002; if (el._v !== v) { el._v = v; el.style.visibility = v ? 'visible' : 'hidden'; } el.style.opacity = a.toFixed(3); if (dy !== undefined) el.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : ''; };
  const beatA = (s, t) => { const i = seg(s, t[0], t[1]), o = seg(s, t[2], t[3]); return { a: i * (1 - o), dy: (1 - out3(i)) * 18 - in2(o) * 18 }; };
  let ptr = null; const axLate = [axis.querySelector('.h-l0'), axis.querySelector('.h-l1'), axis.querySelector('.h-al')];
  function paintFine(s, now, g, k, cam) {
    if (!frames) return;
    const el = reduce ? 0 : (now - t0) / 1000 * fps, dd = (el % nF + nF * 1.5) % nF - nF / 2, idx = reduce ? pose : ((Math.round(pose + dd * (1 - g)) % nF) + nF) % nF;
    const list = frames[k > 0 ? pose : idx], ip = reduce ? 1 : clamp((now - t0) / 1500), p = cam.p, right = cam.r;
    let cur = -1;
    for (const q of list) {
      if (q.g !== cur) { if (cur >= 0) ctx.fill(); cur = q.g; const acc = q.acc, al = cam.a * (.55 + .45 * q.s) * (1); ctx.fillStyle = acc ? `rgba(150,232,255,${al.toFixed(3)})` : `rgba(255,255,255,${al.toFixed(3)})`; ctx.beginPath(); }
      let x = right - (q.x - BX0) * p, y = floorY - (BY1 - q.y) * p, r = p * .44 * q.s;
      if (q.y > BY1) continue;
      if (ip < 1) { const de = (1 - q.y / 125) * .45 + q.h * .3, ki = out3(seg(ip, de, de + .4)); if (ki <= 0) continue; x += (1 - ki) * (q.h - .5) * p * 22; y += (1 - ki) * (q.h * 1.6 - 1) * p * 16; r *= ki; }
      if (k > 0 && R && q.to !== undefined) { const ki = io3(seg(k, q.dd * .42, q.dd * .42 + .58)); if (ki >= 1) continue; x = lerp(x, R_cam(q.to, cam, 0), ki); y = lerp(y, R_cam(q.to, cam, 1), ki); r *= 1 - ki * .55; }
      if (ptr && fine && k === 0) { const m = Math.hypot(x - ptr.x, y - ptr.y); if (m < 56) r *= 1 + .5 * (1 - m / 56); }
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
    }
    if (cur >= 0) ctx.fill();
  }
  const R_cam = (j, cam, ax) => ax === 0 ? cam.r - (D.rows[j][6] - BX0) * cam.p : floorY - (BY1 - D.rows[j][7]) * cam.p;
  // the picture eases toward the scroll position, so a mouse wheel's steps read as one motion; the page itself scrolls natively
  let sv = null, lastNow = 0;
  function paint(now) {
    const target = scroll(), dt = Math.min(64, now - lastNow || 16); lastNow = now;
    if (sv === null || reduce) sv = target; else { sv += (target - sv) * (1 - Math.exp(-dt / 85)); if (Math.abs(target - sv) < .0005) sv = target; else dirty = true; }
    const s = sv; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, FH);
    const g = seg(s, ...T.slow), k = seg(s, ...T.gather), camK = io3(seg(s, ...T.cam));
    const cam = { p: lerp(hero.p, beat.p, camK), r: lerp(hero.r, beat.r, camK), a: lerp(hero.a, 1, seg(s, 0, .3)) };
    const fly = seg(s, ...T.fly), fall = seg(s, ...T.fall), grow = seg(s, ...T.grow), split = seg(s, ...T.split);
    // the one line: the robot stands on it, then it is the chart's axis. It goes when the chart goes.
    const lineA = 1 - seg(s, ...T.axisOut);
    if (lineA > 0) { ctx.fillStyle = `rgba(255,255,255,${(.55 * lineA).toFixed(3)})`; ctx.fillRect(0, floorY, W, 1); }
    // listing dots
    let hitOK = false;
    const mx = X(age), my = Y(price);
    if (k < 1 || !R) paintFine(s, now, g, k, cam);
    if (R && k > 0 && grow < 1) {
      const n = R.n, gk = seg(k, .12, 1), grown = Math.sqrt(gk), chartA = lerp(1, .8, seg(s, T.curve[0], T.curve[1]));
      let arrived = 0;
      ctx.fillStyle = `rgba(255,255,255,${chartA.toFixed(3)})`; ctx.beginPath();
      for (let j = 0; j < n; j++) {
        const x0 = k < 1 ? R_cam(j, cam, 0) : R.x0[j], y0 = k < 1 ? R_cam(j, cam, 1) : R.y0[j];
        let x = x0, y = y0, r = R.r0[j] * grown * (cam.p / beat.p);
        if (fly > 0) { const de = R.d[j] * .46, t = io3(seg(fly, de, de + .54)), x1 = R.x1[j], y1 = R.y1[j];
          const cx = (x0 + x1) / 2 + R.o[j] * Math.abs(y1 - y0) * .35, cy = (y0 + y1) / 2 - Math.abs(x1 - x0) * .12 * (1 + R.o[j]) ;
          const u = 1 - t; x = u * u * x0 + 2 * u * t * cx + t * t * x1; y = u * u * y0 + 2 * u * t * cy + t * t * y1; r = lerp(R.r0[j], R.r1[j], t); }
        if (fall > 0) { const de = clamp(Math.hypot(R.x1[j] - mx, R.y1[j] - my) / Math.max(W, H)) * .55 + .0, t = in2(seg(fall, de, de + .45)); if (t >= 1) { arrived++; R.x[j] = -99; R.r[j] = 0; continue; } x = lerp(x, mx, t); y = lerp(y, my, t); r = lerp(r, 1.4, t); }
        R.x[j] = x; R.y[j] = y; R.r[j] = r;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
      hitOK = k > .9 && fall === 0;
      // the auction results, square so they are never mistaken for a listing
      const au = seg(s, T.curve[0], T.curve[1]) * (1 - seg(s, ...T.axisOut));
      if (au > 0) { ctx.fillStyle = `rgba(150,232,255,${au.toFixed(3)})`; const z = phone ? 6 : 8; D.aucs.forEach(q => ctx.fillRect(X(q[5]) - z / 2, Y(q[1]) - z / 2, z, z)); }
      // the line of typical prices draws through them
      const cu = seg(s, ...T.curve), out = 1 - seg(s, ...T.axisOut);
      if (cu > 0 && out > 0) { const end = cu * 30; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath();
        for (let a = 0; a <= end; a += .5) { const c0 = D.curve[Math.floor(a)], c1 = D.curve[Math.min(30, Math.ceil(a))], v = Math.exp(lerp(Math.log(c0), Math.log(c1), a - Math.floor(a))); a === 0 ? ctx.moveTo(X(a), Y(v)) : ctx.lineTo(X(a), Y(v)); }
        ctx.strokeStyle = `rgba(30,51,155,${(.55 * out).toFixed(3)})`; ctx.lineWidth = phone ? 6 : 8; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${out.toFixed(3)})`; ctx.lineWidth = phone ? 3 : 4; ctx.stroke(); }
      // the picked dot, cyan, and whichever dot is open
      const hl = tip && tip.kind === 'l' ? tip.j : k > .9 && fall === 0 ? D.demo : -1;
      if (hl >= 0 && R.r[hl] > 0) { ctx.fillStyle = 'rgb(150,232,255)'; ctx.beginPath(); ctx.arc(R.x[hl], R.y[hl], Math.max(R.r[hl] * 1.25, phone ? 5 : 6), 0, 6.2832); ctx.fill(); }
      if (fall > 0 && grow === 0) { const m = Math.sqrt(arrived / n) * (phone ? 16 : 26) + 3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, my, m, 0, 6.2832); ctx.fill(); }
    }
    // one dot, one price, then two
    if (grow > 0) { const m0 = (phone ? 16 : 26) + 3, e = io3(grow), cx = lerp(mx, disc.x, e), cy = lerp(my, disc.y, e), rr = lerp(m0, disc.R, e), sp = io3(split);
      const r1 = lerp(rr, disc.r1, sp), r2 = disc.r2 * out3(split), x1 = lerp(cx, disc.c1x, sp), y1 = lerp(cy, disc.c1y, sp), x2 = lerp(cx, disc.c2x, sp), y2 = lerp(cy, disc.c2y, sp);
      if (sp > 0) { ctx.fillStyle = '#1e339b'; ctx.beginPath(); ctx.arc(x2, y2, r2, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x1, y1, r1, 0, 6.2832); ctx.fill(); }
    // page text
    const a1 = beatA(s, T.b1), a2 = beatA(s, T.b2), a3 = beatA(s, T.b3), a4 = beatA(s, T.b4);
    show(b1, a1.a, a1.dy); show(b2, a2.a, a2.dy); show(b3, a3.a, a3.dy); show(b4, a4.a, a4.dy);
    show(axis, seg(s, ...T.axis) * (1 - seg(s, ...T.axisOut)));
    const cu2 = seg(s, T.curve[1] - .15, T.curve[1]); axLate.forEach(e => e.style.opacity = cu2);
    const e0 = io3(grow), nv = seg(grow, .55, 1) * (1 - seg(split, 0, .16)); if (nv > 0) { place(n0, lerp(mx, disc.x, e0), lerp(my, disc.y, e0)); } show(n0, nv);
    const nk = seg(split, .3, .72); show(n1, nk); show(n2, nk);
    stick.style.borderRadius = `0 0 ${(28 * seg(s, T.end - .08, T.end)).toFixed(1)}px ${(28 * seg(s, T.end - .08, T.end)).toFixed(1)}px`;
    hit = hitOK; autoTip(s); placeTip();
  }

  // ---------------------------------------------------------------- the listing label: hover or tap; between beats the film opens one by itself
  let tip = null, hit = false, tipT = 0, overTip = false, tipAuto = false;
  const when = d => d ? (d.length > 4 ? d.replace(/^\d+ /, '') : d) : '';
  const openTip = (kind, j, auto) => { if (tip && tip.kind === kind && tip.j === j) { tipAuto = auto; return; } tip = { kind, j }; tipAuto = auto;
    const [bb, sp, aa] = tipEl.children;
    if (kind === 'l') { const q = D.rows[j]; bb.textContent = q[0]; sp.textContent = `For sale at ${fmt(q[2])}. Built in ${q[1]}. Listed on ${q[3]}.`; aa.href = q[4]; aa.innerHTML = 'See the listing &rarr;'; }
    else { const q = D.aucs[j]; bb.textContent = q[0]; sp.textContent = `Sold at auction for ${fmt(q[1])}${q[2] ? ` in ${when(q[2])}` : ''}. ${q[3]}.`; aa.href = q[4]; aa.innerHTML = 'See the sale &rarr;'; }
    tipEl.hidden = false; dirty = true; };
  const closeTip = () => { if (!tip) return; tip = null; tipEl.hidden = true; dirty = true; };
  const placeTip = () => { if (!tip) return; const xy = tip.kind === 'l' ? [R.x[tip.j], R.y[tip.j], R.r[tip.j]] : [X(D.aucs[tip.j][5]), Y(D.aucs[tip.j][1]), 5];
    if (!(xy[2] > 0)) return; const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = clamp(xy[0] + 10 - w, 12, W - w - 12), y = xy[1] - xy[2] - h - 12; if (y < 12 || (tip.kind !== 'bot' && xy[1] < H * .42)) y = xy[1] + xy[2] + 12; tipEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; };
  const autoTip = s => { if (!D || !R) return; if (tip && !tipAuto) { if (s >= T.fall[0] || s < T.gather[1]) closeTip(); return; }
    if (autoOK && s > T.b1[1] && s < T.b1[2]) openTip('l', D.demo, true); else if (tipAuto) closeTip(); };
  const nearest = (x, y, reach) => { let best = -1, bd = 1e9, kind = 'l'; for (let j = 0; j < R.n; j++) { const dx = R.x[j] - x, dy = R.y[j] - y, d = Math.hypot(dx, dy) - R.r[j]; if (d < bd) { bd = d; best = j; } }
    if (scroll() > T.curve[0] && scroll() < T.fall[0]) D.aucs.forEach((q, j) => { const d = Math.hypot(X(q[5]) - x, Y(q[1]) - y) - 5; if (d < bd) { bd = d; best = j; kind = 'a'; } });
    return bd <= reach ? { kind, j: best } : null; };
  const stPos = ev => { const r = stick.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  if (fine) {
    stick.addEventListener('pointermove', ev => { const p = stPos(ev); ptr = p; if (scroll() < T.slow[1]) dirty = true; if (!hit || !R || overTip) return; const n = nearest(p.x, p.y, 8);
      if (n) { clearTimeout(tipT); openTip(n.kind, n.j, false); } else if (tip && !tipAuto) { clearTimeout(tipT); tipT = setTimeout(() => { if (!overTip) { tip = null; tipEl.hidden = true; dirty = true; } }, 260); } }, { passive: true });
    stick.addEventListener('pointerleave', () => { ptr = null; dirty = true; }, { passive: true });
    tipEl.addEventListener('pointerenter', () => { overTip = true; clearTimeout(tipT); }); tipEl.addEventListener('pointerleave', () => { overTip = false; });
  }
  stick.addEventListener('click', ev => { if (fine || !R || !hit || ev.target.closest('a,.h-tip')) return; const p = stPos(ev), n = nearest(p.x, p.y, 20); if (n) openTip(n.kind, n.j, false); else closeTip(); });

  // ---------------------------------------------------------------- run
  layout();
  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  let lw = 0, lh = 0, rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (stick.clientWidth === lw && Math.abs(stick.clientHeight - lh) < 120) return; lw = stick.clientWidth; lh = stick.clientHeight; layout(); }, 120); };
  lw = stick.clientWidth; lh = stick.clientHeight; addEventListener('resize', onResize); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { rootMargin: '60px' }).observe(stick);
  const loop = now => { requestAnimationFrame(loop); if (!vis) return; const moving = !reduce && frames && (scrollY - docTop(film)) / (H || 1) < T.slow[1]; const intro = frames && now - t0 < 1600; if (!dirty && !moving && !intro) return; dirty = false; paint(now); };
  requestAnimationFrame(loop);
})();
