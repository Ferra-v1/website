// Home page behaviour. Runs after site.js. Four parts: the first film leaving under the next section, the robots walking into the moat footage, the price chapter's canvas, and two small things further down.
const hClamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, hSeg = (s, a, b) => hClamp((s - a) / (b - a)), hLerp = (a, b, t) => a + (b - a) * t, hIo3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, hOut3 = t => 1 - Math.pow(1 - t, 3);

// The first film. The next section slides up over it: its words and the nav leave first, and it pauses once it is covered. Reduced motion: site.js stops the video and the poster stays.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const top = document.querySelector('.h-top'), v = top && top.querySelector('video'); if (!v) return;
  const words = top.querySelector('.h-tw'), nav = top.querySelector('.nav'); let was = -1, playing = true;
  if (innerWidth <= 720) v.removeAttribute('poster');   // the poster is the wide cut: a phone goes from the ink straight to the phone cut's first frame
  const paint = () => { const k = hClamp(scrollY / top.clientHeight); if (k === was) return; was = k;
    const w = 1 - hSeg(k, .12, .62), n = 1 - hSeg(k, .02, .2);
    words.style.opacity = w.toFixed(3); words.style.transform = k ? `translateY(${(-k * 40).toFixed(1)}px)` : ''; words.style.visibility = w > 0 ? '' : 'hidden';
    nav.style.opacity = n.toFixed(3); nav.style.visibility = n > 0 ? '' : 'hidden'; v.style.opacity = hLerp(1, .45, k).toFixed(3);
    const on = k < .995; if (on !== playing) { playing = on; if (on) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); } };
  paint(); addEventListener('scroll', paint, { passive: true }); addEventListener('resize', () => { was = -1; paint(); });
})();

// The robots and the moat. On a wide screen the line of robots pins, the ground darkens behind them, the others leave, and the factory arm walks to where the footage's own arm stands while the words rise past on the page's own scroll.
// The picture comes up around the arm, one line lands on the floor, and the picture fades back to ink for the price chapter. On a phone the robots are a plain grid above, and the arm stands alone on white when its scene starts. Everything is a function of the scroll position, so scrolling back plays it backwards.
(() => {
  const sc = document.querySelector('.h-sc'); if (!sc || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $ = s => sc.querySelector(s), rob = $('.h-robots'), moat = $('.h-moat'), st = $('.h-mst'), v = $('.h-mv'), ms = $('.h-ms'), arm = $('.h-marm'), rg = $('.h-rg'), mg = $('.h-mg'), cap = $('.h-mcap'), head = $('.h-rh'), ct = $('.h-mct');
  const figs = [...sc.querySelectorAll('.h-bot')], armFig = $('.h-b-factory-arm'), slotImg = armFig.querySelector('img'), slotBase = armFig.querySelector('.h-bs'), others = figs.filter(f => f !== armFig), armCap = armFig.querySelector('figcaption');
  // where the arm stands in each cut of the footage, as shares of the frame
  const FR = { d: { x: .396, y: .058, w: .28, h: .752, vw: 1920, vh: 1080 }, p: { x: .29, y: .202, w: .47, h: .392, vw: 720, vh: 1280 } };
  const AR = 770 / 1200;
  let W = 0, H = 0, phone = false, tgt = null, slot = null, top0 = 0, last = null, playing = false, near = false;
  const layout = () => { W = innerWidth; H = st.clientHeight; phone = W <= 720; if (phone) v.removeAttribute('poster');   // the poster is the wide cut
     const f = phone ? FR.p : FR.d, sca = Math.max(W / f.vw, H / f.vh), vw = f.vw * sca, vh = f.vh * sca, px = !phone && W / H < 1.2 ? .3 : .5, ox = (W - vw) * px, oy = (H - vh) / 2;   // a tall screen keeps the arm clear of the words
    v.style.setProperty('--mvx', px * 100 + '%');
    const h = f.h * vh, w = h * AR; tgt = { x: ox + (f.x + f.w / 2) * vw - w / 2, y: oy + f.y * vh, w, h };
    arm.style.width = w.toFixed(1) + 'px'; arm.style.height = h.toFixed(1) + 'px';
    figs.forEach(g => { g.style.transform = ''; });
    if (!phone) { const r = slotImg.getBoundingClientRect(), b = rob.getBoundingClientRect(); slot = { x: r.left - b.left, y: r.top - b.top, k: r.width / w }; }
    top0 = (phone ? moat : sc).getBoundingClientRect().top + scrollY; last = null; paint(); };
  const put = (el, a) => { const s = a.toFixed(3); if (el._a !== s) { el._a = s; el.style.opacity = s; } };
  const video = vf => { if (!near && vf > 0) { near = true; }
    if (vf > .94 && !playing) { playing = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else if (vf < .02 && playing) { playing = false; v.pause(); try { v.currentTime = 0; } catch (x) {} } };
  function paint() {
    const s = (scrollY - top0) / H; if (s === last) return; last = s;
    if (phone) {
      put(mg, hSeg(s, -.1, .35)); const vf = hSeg(s, .35, .8); put(v, vf); put(ms, vf); video(vf);
      arm.style.visibility = 'visible'; arm.style.transform = `translate(${tgt.x.toFixed(1)}px,${tgt.y.toFixed(1)}px)`; put(arm, 1 - hSeg(s, .45, .82));
      return;
    }
    // on the way in, the robots settle as the white sheet slides over the first film
    const e = hOut3(hSeg(s, -1, -.06)); figs.forEach((g, i) => { const y = (1 - e) * (24 + i * 12); g.style.transform = y > .1 ? `translateY(${y.toFixed(1)}px)` : ''; });
    const g = hSeg(s, .14, .5); put(rg, g); rg.style.visibility = g > 0 ? 'visible' : 'hidden';
    const a = 1 - hSeg(s, .08, .26); others.forEach(f => put(f, a)); put(head, a); put(armCap, a);
    const free = s >= .08; slotImg.style.visibility = free ? 'hidden' : ''; slotBase.style.borderBottomColor = free ? 'transparent' : ''; slotBase.classList.toggle('h-free', free);
    arm.style.visibility = free ? 'visible' : 'hidden';
    if (free) { const m = hIo3(hSeg(s, .14, .62)); arm.style.transform = `translate(${hLerp(slot.x, tgt.x, m).toFixed(1)}px,${hLerp(slot.y, tgt.y, m).toFixed(1)}px) scale(${hLerp(slot.k, 1, m).toFixed(4)})`; }
    const vf = hSeg(s, .95, 1.4) * (1 - hSeg(s, 1.95, 2.28)); put(v, vf); put(ms, vf); video(vf);
    put(arm, 1 - hSeg(s, 1.0, 1.32));
    put(ct, hSeg(s, .42, .6) * (1 - hSeg(s, 1.36, 1.6)));
    put(cap, hSeg(s, 1.5, 1.68) * (1 - hSeg(s, 1.95, 2.12)));
  }
  layout(); addEventListener('scroll', paint, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth === W && Math.abs(st.clientHeight - H) < 120) return; layout(); }, 120); });
  addEventListener('load', layout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  // fetch the footage when the scene is close, so it does not load with the first screen
  new IntersectionObserver((es, o) => { if (!es[0].isIntersecting) return; o.disconnect(); v.preload = 'auto'; v.load(); }, { rootMargin: '900px' }).observe(st);
  new IntersectionObserver(es => { if (!es[0].isIntersecting && playing) v.pause(); else if (es[0].isIntersecting && playing) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } }).observe(st);
})();

// The price chapter. One canvas on one pinned stage, painted as a pure function of how far the page has scrolled. A photoreal arm comes out of the ink, fine dots rise over it, they gather into the 433 real listings seated on the same silhouette,
// those fly to their true place on a chart of age against asking price, the line of typical prices draws, and the field pours into one likely sale price while its ghost stays behind. The box moves that one price along the chart.
(() => {
  const film = document.querySelector('.h-film'), stick = film && film.querySelector('.h-stick'); if (!film) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = film.querySelector('.h-cv'), ctx = cv.getContext('2d'), probe = film.querySelector('.h-probe');
  const $ = s => film.querySelector(s), b0 = $('.h-b0'), b1 = $('.h-b1'), b2 = $('.h-b2'), b3 = $('.h-b3'), axis = $('.h-axis'), tipEl = $('.h-tip'), lblA = $('.h-pa'), lblS = $('.h-ps'), lblC = $('.h-cl'), lblU = $('.h-al');
  const clamp = hClamp, seg = hSeg, lerp = hLerp, io3 = hIo3, out3 = hOut3, in2 = t => t * t;
  // the timeline, in screens scrolled since the stage pinned. The film's height in p-home.css is the end of this plus one screen.
  const T = { wash: [0, .3], b0: [.13, .25, .46, .54], fineIn: [.4, .54], photoOut: [.46, .66], gather: [.56, .84], b1: [.8, .92, 1.12, 1.2], fly: [1.14, 1.48], axis: [1.26, 1.42], b2: [1.24, 1.36, 1.64, 1.72], curve: [1.38, 1.6], fall: [1.68, 2], b3: [1.84, 1.98, 99, 99] };
  const RESTS = [[.6, .3], [1.15, .95], [1.7, 1.55], [99, 2.2]];
  const BX0 = 5, BX1 = 106, BY0 = 9, BY1 = 118, HI = 125000, LO = 220;
  let W = 0, H = 0, FH = 0, dpr = 1, phone = false, fineD = null, D = null, R = null, dirty = true, vis = true, photo = null, photoOK = false;
  let cam = { p: 6, r: 1000 }, floorY = 800, lineL = 0, C = { l: 0, r: 1000, t: 0, b: 800 }, age = 10, ask = 14700, sale = 6100, pt = null;
  const X = a => C.l + a / 30 * (C.r - C.l), Y = u => C.t + (Math.log(HI) - Math.log(u)) / (Math.log(HI) - Math.log(LO)) * (C.b - C.t);

  // ---------------------------------------------------------------- the price box: the only numbers baked into the page
  const tab = JSON.parse(document.getElementById('h-prices').textContent), rSel = document.getElementById('h-r'), ySel = document.getElementById('h-y'), tool = document.getElementById('h-tool'), saleEl = document.getElementById('h-pv'), whyEl = document.getElementById('h-why');
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US'), r100 = v => Math.round(v / 100) * 100;
  let shown = null, tw = 0;
  const putAll = (sel, v) => film.querySelectorAll(sel).forEach(s => { s.textContent = v; });
  const setBox = () => {
    const f = tab.fam[rSel.value], y = +ySel.value; age = clamp(tab.now - y, 0, 30);
    const a = f.c[age], k = tab.sk[age < 10 ? 0 : 1];   // the price tool's Expected sale rule
    ask = r100(a); sale = r100(a * k);
    tool.href = `price.html#y=${y}&r=${f.t}`;   // the robot and the year only
    const say = f.s.charAt(0).toUpperCase() + f.s.slice(1);
    putAll('[data-say]', say); putAll('[data-yr]', y); putAll('[data-a]', fmt(ask));
    // either of the two honest warnings when it applies, or the plain one
    whyEl.textContent = (age < f.g[0] || age > f.g[1] ? 'We have no listings of this robot at this age, so it only follows the trend. ' : '') + (age === 9 || age === 10 ? tab.step : tab.low);
    if (shown === null || reduce) { shown = sale; saleEl.textContent = fmt(sale); } else {
      const from = shown, st = performance.now(); cancelAnimationFrame(tw);
      const step = t => { const q = out3(clamp((t - st) / 320)); shown = lerp(from, sale, q); saleEl.textContent = fmt(q < 1 ? r100(shown) : sale); if (q < 1) tw = requestAnimationFrame(step); };
      tw = requestAnimationFrame(step);
    }
    if (R) drain();
    if (W) { const h = b3.querySelector('.h-bt').getBoundingClientRect().height; if (phone && Math.abs(h - lastB3) > 1) layout(); }
    dirty = true;
  };
  let lastB3 = 0;
  rSel.addEventListener('change', setBox); ySel.addEventListener('change', setBox); rSel.value = 'all'; setBox();

  // ---------------------------------------------------------------- heavy pieces, fetched when the section is near
  const load = (src, cb) => { const s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = () => {}; document.head.appendChild(s); };
  const seatFine = () => { if (!fineD || !D) return; const rows = D.rows;
    for (const p of fineD) { let bd = 1e9, bi = 0; for (let j = 0; j < rows.length; j++) { const dx = rows[j][6] - p.x, dy = rows[j][7] - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = j; } } p.to = bi; p.dd = Math.min(1, Math.sqrt(bd) / 4); } };
  const fetchAll = () => {
    photo = new Image(); photo.onload = () => { photoOK = true; dirty = true; }; photo.src = 'media/robots/arm-film.webp';
    load('assets/h-arm.js', () => { fineD = window.FERRA_ARM.map(q => ({ x: q[0] + .5, y: q[1] + .5, s: q[2], acc: q[3], g: q[3] * 100 + Math.round(q[2] * 4), h: ((q[0] * 73 + q[1] * 151) % 97) / 97 })).sort((a, b) => a.g - b.g); seatFine(); dirty = true; });
    load('assets/h-film.js', () => { D = window.FERRA_FILM; prep(); seatFine(); layout(); });
  };
  new IntersectionObserver((es, o) => { if (!es[0].isIntersecting) return; o.disconnect(); fetchAll(); }, { rootMargin: '1500px' }).observe(film);

  // ---------------------------------------------------------------- listings
  const rad = u => Math.pow(u / 11000, .35);
  const prep = () => { const n = D.rows.length; R = { n, x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), x0: new Float32Array(n), y0: new Float32Array(n), r0: new Float32Array(n), x1: new Float32Array(n), y1: new Float32Array(n), r1: new Float32Array(n), d: new Float32Array(n), o: new Float32Array(n), f: new Float32Array(n) };
    let far = 0; for (let j = 0; j < n; j++) { const q = D.rows[j], dx = q[6] - 22, dy = q[7] - 112, m = Math.hypot(dx, dy); R.d[j] = m; if (m > far) far = m; R.o[j] = ((j * 2654435761 >>> 0) % 1000) / 500 - 1; }
    for (let j = 0; j < n; j++) R.d[j] = 1 - R.d[j] / far; };   // the gripper leaves first, the base last
  // the chart pours into the chosen price nearest dots first, at an even rate
  const drain = () => { const mx = X(age), my = Y(sale), by = Array.from({ length: R.n }, (_, j) => [Math.hypot(R.x1[j] - mx, R.y1[j] - my), j]).sort((a, b) => a[0] - b[0]); by.forEach((q, i) => { R.f[q[1]] = i / R.n; }); };

  // ---------------------------------------------------------------- layout
  const docTop = el => el.getBoundingClientRect().top + scrollY;
  function layout() {
    W = stick.clientWidth; FH = stick.clientHeight; H = probe.clientHeight || FH; dpr = Math.min(2, devicePixelRatio || 1); phone = W <= 720;
    cv.width = Math.round(W * dpr); cv.height = Math.round(FH * dpr);
    const cols = BX1 - BX0 + 1, rows = BY1 - BY0 + 1, wrap = Math.min(W, 1200), mar = (W - wrap) / 2 + (phone ? 16 : 24), bh = b => b.querySelector('.h-bt').getBoundingClientRect().height;
    if (phone) {
      lastB3 = bh(b3); floorY = H - (H < 720 ? 44 : 56);
      const words = Math.max(bh(b0), bh(b1)) + 28 + 16; const p = Math.min((W - 20) / cols, (floorY - words) / rows);
      cam = { p, r: W - (W - cols * p) / 2 };
      const top3 = Math.min(28 + lastB3 + 34, floorY - 150);
      C = { l: mar + 60, r: W - mar - 4, t: top3, b: floorY - 6 }; lineL = 0;
    } else {
      const colR = mar + Math.min(440, W * (W <= 1060 ? .4 : .34));
      floorY = Math.round(H * .9);
      const p = Math.min((floorY - 56) / rows, (W - colR - 24) / cols), edge = Math.max(40, (W - 1200) / 2 - 24);
      cam = { p, r: W - edge };
      C = { l: colR + 84, r: W - edge - 14, t: Math.max(56, H * .09), b: floorY - 8 }; lineL = colR + 44;
    }
    axis.querySelectorAll('.h-xl').forEach(s => { const a = +s.dataset.age, x = X(a); s.style.transform = `translate(${(a === 0 ? x - 4 : a === 30 ? x - s.offsetWidth + 4 : x - s.offsetWidth / 2).toFixed(1)}px,${(floorY + 10).toFixed(1)}px)`; });
    axis.querySelectorAll('.h-yl').forEach(s => { s.style.transform = `translate(${(C.l - s.offsetWidth - (phone ? 6 : 14)).toFixed(1)}px,${(Y(+s.dataset.usd) - s.offsetHeight / 2).toFixed(1)}px)`; });
    if (D) { const a = D.aucs.reduce((m, q) => q[5] > m[5] ? q : m); lblU.style.transform = `translate(${clamp(X(a[5]) + 6 - lblU.offsetWidth, 8, W - lblU.offsetWidth - 8).toFixed(1)}px,${(Y(a[1]) + 9).toFixed(1)}px)`;
      lblC.style.transform = `translate(${(X(9) + 6).toFixed(1)}px,${(Y(D.curve[9]) - 28).toFixed(1)}px)`; }
    if (R) { const base = cam.p;
      for (let j = 0; j < R.n; j++) { const q = D.rows[j], f = rad(q[2]); R.x0[j] = cam.r - (q[6] - BX0) * cam.p; R.y0[j] = floorY - (BY1 - q[7]) * cam.p;
        R.r0[j] = base * .36 * f; R.x1[j] = X(q[5]); R.y1[j] = Y(q[2]); R.r1[j] = (phone ? 1.9 : 2.6) * Math.pow(f, .75); }
      drain(); }
    pt = null; dirty = true;
  }

  // ---------------------------------------------------------------- painting
  const rawScroll = () => (scrollY - docTop(film)) / (H || 1);
  const scroll = () => { let s = rawScroll(); if (s < 0) s = 0; if (reduce) { for (const r of RESTS) if (s < r[0]) { s = r[1]; break; } } return s; };
  const show = (el, a, dy) => { const v = a > .002; if (el._v !== v) { el._v = v; el.style.visibility = v ? 'visible' : 'hidden'; } el.style.opacity = a.toFixed(3); if (dy !== undefined) el.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : ''; };
  const beatA = (s, t) => { const i = seg(s, t[0], t[1]), o = seg(s, t[2], t[3]); return { a: i * (1 - o), dy: (1 - out3(i)) * 16 - in2(o) * 16 }; };
  function paintFine(alpha, k) {
    const p = cam.p, right = cam.r; let cur = -1;
    for (const q of fineD) {
      if (q.g !== cur) { if (cur >= 0) ctx.fill(); cur = q.g; const al = alpha * (.6 + .4 * q.s); ctx.fillStyle = q.acc ? `rgba(150,232,255,${al.toFixed(3)})` : `rgba(255,255,255,${al.toFixed(3)})`; ctx.beginPath(); }
      let x = right - (q.x - BX0) * p, y = floorY - (BY1 - q.y) * p, r = p * .27 * q.s;
      if (q.y > BY1) continue;
      if (k > 0 && R && q.to !== undefined) { const ki = io3(seg(k, q.dd * .42, q.dd * .42 + .58)); if (ki >= 1) continue; x = lerp(x, R.x0[q.to], ki); y = lerp(y, R.y0[q.to], ki); r *= 1 - ki * .55; }
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
    }
    if (cur >= 0) ctx.fill();
  }
  // the picture eases toward the scroll position, so a mouse wheel's steps read as one motion; the page itself scrolls natively
  let sv = null, lastNow = 0;
  function paint(now) {
    const target = scroll(), dt = Math.min(64, now - lastNow || 16); lastNow = now;
    if (sv === null || reduce) sv = target; else { sv += (target - sv) * (1 - Math.exp(-dt / 85)); if (Math.abs(target - sv) < .0005) sv = target; else dirty = true; }
    const s = sv; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, FH);
    const k = seg(s, ...T.gather), fly = seg(s, ...T.fly), fall = seg(s, ...T.fall), fineA = seg(s, ...T.fineIn), photoA = 1 - seg(s, ...T.photoOut);
    // the one line: the arm stands on it, then it is the chart's floor
    ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.fillRect(lineL, floorY, W - lineL, 1);
    // the photograph, the very pose the dots are seated on
    if (photoA > 0 && photoOK) { ctx.globalAlpha = photoA; ctx.drawImage(photo, cam.r + BX0 * cam.p - 112 * cam.p, floorY - BY1 * cam.p, 112 * cam.p, 125 * cam.p); ctx.globalAlpha = 1; }
    if (fineD && fineA > 0 && k < 1) paintFine(fineA, k);
    let hitOK = false; const mx = X(age), my = Y(sale);
    if (!pt) pt = { x: mx, y: my, a: Y(ask) };
    pt.x += (mx - pt.x) * .22; pt.y += (my - pt.y) * .22; pt.a += (Y(ask) - pt.a) * .22; if (Math.abs(mx - pt.x) + Math.abs(my - pt.y) + Math.abs(Y(ask) - pt.a) > .3) dirty = true; else { pt.x = mx; pt.y = my; pt.a = Y(ask); }
    if (R && k > 0) {
      const n = R.n, gk = seg(k, .12, 1), grown = Math.sqrt(gk);
      // what stays behind when the field pours away: a ghost of the chart
      if (fall > 0) { ctx.fillStyle = `rgba(255,255,255,${(.26 * fall).toFixed(3)})`; ctx.beginPath(); for (let j = 0; j < n; j++) { const r = R.r1[j] * .8; ctx.moveTo(R.x1[j] + r, R.y1[j]); ctx.arc(R.x1[j], R.y1[j], r, 0, 6.2832); } ctx.fill(); }
      let arrived = 0;
      ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath();
      for (let j = 0; j < n; j++) {
        const x0 = R.x0[j], y0 = R.y0[j]; let x = x0, y = y0, r = R.r0[j] * grown;
        if (fly > 0) { const de = R.d[j] * .46, t = io3(seg(fly, de, de + .54)), x1 = R.x1[j], y1 = R.y1[j];
          const cx = (x0 + x1) / 2 + R.o[j] * Math.abs(y1 - y0) * .35, cy = (y0 + y1) / 2 - Math.abs(x1 - x0) * .12 * (1 + R.o[j]);
          const u = 1 - t; x = u * u * x0 + 2 * u * t * cx + t * t * x1; y = u * u * y0 + 2 * u * t * cy + t * t * y1; r = lerp(R.r0[j], R.r1[j], t); }
        if (fall > 0) { const de = R.f[j] * .66, t = in2(seg(fall, de, de + .34)); if (t >= 1) { arrived++; R.x[j] = -99; R.r[j] = 0; continue; } x = lerp(x, pt.x, t); y = lerp(y, pt.y, t); r = lerp(r, 1, t); }
        R.x[j] = x; R.y[j] = y; R.r[j] = r;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
      hitOK = k > .9 && fall === 0;
      // the auction results, square so they are never mistaken for a listing
      const cu = seg(s, ...T.curve), mute = lerp(1, .55, fall);
      if (cu > 0) { ctx.fillStyle = `rgba(14,22,38,${(cu * mute).toFixed(3)})`; const z = phone ? 5 : 7; D.aucs.forEach(q => ctx.fillRect(X(q[5]) - z / 2, Y(q[1]) - z / 2, z, z)); }
      // the line of typical prices
      if (cu > 0) { const end = cu * 30; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath();
        for (let a = 0; a <= end; a += .5) { const c0 = D.curve[Math.floor(a)], c1 = D.curve[Math.min(30, Math.ceil(a))], v = Math.exp(lerp(Math.log(c0), Math.log(c1), a - Math.floor(a))); a === 0 ? ctx.moveTo(X(a), Y(v)) : ctx.lineTo(X(a), Y(v)); }
        ctx.strokeStyle = `rgba(255,255,255,${(.95 * lerp(1, .5, fall)).toFixed(3)})`; ctx.lineWidth = phone ? 1.5 : 2; ctx.stroke(); }
      // the picked dot, and whichever dot is open
      const hl = tip && tip.kind === 'l' ? tip.j : k > .9 && fall === 0 && s < T.fly[0] ? D.demo : -1;
      if (hl >= 0 && R.r[hl] > 0) { ctx.fillStyle = 'rgb(150,232,255)'; ctx.beginPath(); ctx.arc(R.x[hl], R.y[hl], Math.max(R.r[hl] * 1.3, phone ? 4 : 4.5), 0, 6.2832); ctx.fill(); }
      // the one price: what sellers ask on the line, what it would likely sell for under it, joined
      if (fall > 0) { const g = Math.sqrt(arrived / n), lk = seg(fall, .7, 1);
        if (lk > 0) { ctx.strokeStyle = `rgba(255,255,255,${(.8 * lk).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pt.x, pt.a); ctx.lineTo(pt.x, pt.y); ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,255,255,${lk.toFixed(3)})`; ctx.fillStyle = '#1760d6'; ctx.beginPath(); ctx.arc(pt.x, pt.a, 4.5 * lk, 0, 6.2832); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.5 + g * (phone ? 5 : 6.5), 0, 6.2832); ctx.fill(); }
      // the labels that belong to the chart, placed clear of the picture's edges
      const lk = seg(fall, .75, 1); lblC.style.opacity = (seg(s, T.curve[1] - .08, T.curve[1]) * (1 - seg(fall, 0, .4))).toFixed(3); lblU.style.opacity = lblC.style.opacity;
      lblA.style.opacity = lblS.style.opacity = lk.toFixed(3);
      if (lk > 0) { const av = fmt(ask), sv2 = fmt(sale); const ta = 'Sellers ask ' + av, ts = 'Likely sale ' + sv2; if (lblA.textContent !== ta) lblA.textContent = ta; if (lblS.textContent !== ts) lblS.textContent = ts;
        const place = (el, y) => { const w = el.offsetWidth, x = clamp(pt.x - w / 2, Math.min(C.l, 8), W - w - 8); el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; };
        place(lblA, pt.a - 28); place(lblS, pt.y + 14); }
    }
    // the ink the moat footage faded to lifts off the stage from the floor up. On a phone it starts while the stage is still sliding in under the words, so that screen is never empty ink.
    const lift = reduce ? 1 : phone ? seg(rawScroll(), -.7, .25) : seg(s, ...T.wash);
    if (lift < 1) { const y0 = lerp(FH, -FH * .6, lift), g = ctx.createLinearGradient(0, y0, 0, y0 + FH * .6); g.addColorStop(0, 'rgba(14,22,38,1)'); g.addColorStop(1, 'rgba(14,22,38,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, FH); }
    // page text
    const a0 = beatA(s, T.b0), a1 = beatA(s, T.b1), a2 = beatA(s, T.b2), a3 = beatA(s, T.b3);
    show(b0, a0.a, a0.dy); show(b1, a1.a, a1.dy); show(b2, a2.a, a2.dy); b3.style.opacity = a3.a.toFixed(3); b3.style.transform = a3.dy ? `translateY(${a3.dy.toFixed(1)}px)` : ''; b3.classList.toggle('h-on', a3.a > .4);
    show(axis, seg(s, ...T.axis));
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
    let x = clamp(xy[0] + 10 - w, 12, W - w - 12), y = xy[1] - xy[2] - h - 12; if (y < 12 || xy[1] < H * .42) y = xy[1] + xy[2] + 12; tipEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; };
  const autoTip = s => { if (!D || !R) return; if (tip && !tipAuto) { if (s >= T.fall[0] || s < T.gather[1]) closeTip(); return; }
    if (W > 1060 && s > T.b1[1] && s < T.b1[2]) openTip('l', D.demo, true); else if (tipAuto) closeTip(); };
  const nearest = (x, y, reach) => { let best = -1, bd = 1e9, kind = 'l'; for (let j = 0; j < R.n; j++) { const dx = R.x[j] - x, dy = R.y[j] - y, d = Math.hypot(dx, dy) - R.r[j]; if (d < bd) { bd = d; best = j; } }
    const s = scroll(); if (s > T.curve[0] && s < T.fall[0]) D.aucs.forEach((q, j) => { const d = Math.hypot(X(q[5]) - x, Y(q[1]) - y) - 5; if (d < bd) { bd = d; best = j; kind = 'a'; } });
    return bd <= reach ? { kind, j: best } : null; };
  const stPos = ev => { const r = stick.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  if (fine) {
    stick.addEventListener('pointermove', ev => { if (!hit || !R || overTip) return; const p = stPos(ev), n = nearest(p.x, p.y, 8);
      if (n) { clearTimeout(tipT); openTip(n.kind, n.j, false); } else if (tip && !tipAuto) { clearTimeout(tipT); tipT = setTimeout(() => { if (!overTip) { tip = null; tipEl.hidden = true; dirty = true; } }, 260); } }, { passive: true });
    tipEl.addEventListener('pointerenter', () => { overTip = true; clearTimeout(tipT); }); tipEl.addEventListener('pointerleave', () => { overTip = false; });
  }
  stick.addEventListener('click', ev => { if (fine || !R || !hit || ev.target.closest('a,.h-tip')) return; const p = stPos(ev), n = nearest(p.x, p.y, 20); if (n) openTip(n.kind, n.j, false); else closeTip(); });
  // keyboard: tabbing into the box brings the box on screen
  b3.addEventListener('focusin', () => { if (scroll() < T.b3[1]) scrollTo({ top: docTop(film) + T.b3[1] * H, behavior: reduce ? 'auto' : 'smooth' }); });

  // ---------------------------------------------------------------- run
  layout();
  // on a wide screen the stage lies over the moat's last screen and shows only once it has pinned, when both are the same ink
  const gate = () => { if (reduce || phone) { stick.style.visibility = ''; return; } const on = rawScroll() >= -.002; const v = on ? 'visible' : 'hidden'; if (stick.style.visibility !== v) stick.style.visibility = v; };
  gate();
  addEventListener('scroll', () => { dirty = true; gate(); }, { passive: true });
  let lw = 0, lh = 0, rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (stick.clientWidth === lw && Math.abs(stick.clientHeight - lh) < 120) return; lw = stick.clientWidth; lh = stick.clientHeight; layout(); gate(); }, 120); };
  lw = stick.clientWidth; lh = stick.clientHeight; addEventListener('resize', onResize); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); gate(); });
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) dirty = true; }, { rootMargin: '400px' }).observe(stick);
  const loop = now => { requestAnimationFrame(loop); if (!vis || !dirty) return; dirty = false; paint(now); };
  requestAnimationFrame(loop);
})();

// The four steps tell themselves in turn while the ticket is on screen; touching one stops that. The ticket follows the step being told. Reduced motion shows the finished ticket.
(() => {
  const live = document.querySelector('.h-live'), steps = [...document.querySelectorAll('.h-st')]; if (!live || !steps.length) return;
  const rows = [...live.querySelectorAll('.dr')], reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let at = 0, timer = 0, touched = false;
  const set = k => { at = k; live.dataset.step = k; steps.forEach((s, j) => { s.classList.toggle('on', j === k); j === k ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current'); });
    const on = (steps[k].dataset.rows || '').split(','); rows.forEach(r => r.classList.toggle('hl', on.includes(r.dataset.row))); };
  if (reduce) { live.dataset.step = 3; steps.forEach(s => s.classList.add('on')); return; }
  set(0);
  const stop = () => { clearInterval(timer); timer = 0; };
  steps.forEach((s, k) => s.addEventListener('click', () => { touched = true; stop(); set(k); }));
  new IntersectionObserver(es => { if (es[0].isIntersecting && !touched) { if (!timer) timer = setInterval(() => set((at + 1) % steps.length), 3200); } else stop(); }, { threshold: .4 }).observe(live);
})();

// The 50 arms light up once when they arrive: 2 full, 10 more dimmer, the rest stay faint. Reduced motion shows that from the start.
(() => {
  const g = document.getElementById('h-arms'); if (!g) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return g.classList.add('h-seen');
  new IntersectionObserver((es, o) => { if (!es[0].isIntersecting) return; o.disconnect(); g.classList.add('h-seen'); }, { threshold: .3 }).observe(g);
})();
