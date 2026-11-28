// Home, the market film (design-loop/home-motion-2026-11-25/SPEC.md). One pinned stage, four beats, every moment a pure function of the scroll position, so scrolling up plays it backwards (SPEED-RULES 4b).
// 1 the hero's dot arm grows into the stage and breaks into one dot per real listing, which drift into a loose field. 2 the field settles on a chart of age against asking price; auction sales
// arrive in the deep shade; the axis labels come once the dots have landed. 3 a ring lands on a KUKA KR 210 built in 2020; KUKA arms built within two years of it stay bright, the rest dim.
// 4 the bright dots pour down into the four bars, which grow from the left with their figures already beside them. Then a short hold, and the stage scrolls away.
// Drawing: one canvas, one path and one fill per shade (rule 7), repainted only when the scroll moved. Words swap in short windows that finish on their own when the reader stops (rule 4).
// Every dot keeps clear of every word: dots stay inside the picture area under the headings, the axis labels sit outside the plot, and the pour runs in lanes the words never use.
// Width changes only re-measure (rule 9). Reduced motion shows the last beat's finished frame, unpinned. Without scripts the section is the last beat as plain markup.
(() => {
  const sec = document.getElementById('h-mf'); if (!sec) return;
  const $ = s => sec.querySelector(s), $$ = s => [...sec.querySelectorAll(s)];
  const stage = $('.h-mfs'), box = $('.h-mfb'), hero = $('.h-hero'), rowCv = sec.querySelector('.h-bcv[data-loop="hero-arm-loop"]'), cv = $('.h-mcv'), ctx = cv.getContext('2d'), heads = $$('.h-mft'), hstack = $('.h-mfh'), axis = $('.h-max'), panel = $('.h-mp'), tip = $('.h-tip');
  const xls = $$('.h-xl'), yls = $$('.h-yl'), yt = $('.h-yt');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const COB = '#2847ce', DEEP = '#1e339b', RING_AGE = +sec.dataset.age, RING_ASK = +sec.dataset.ask, LO = 1000, HI = 125000;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, seg = (s, a, b) => clamp((s - a) / (b - a)), lerp = (a, b, t) => a + (b - a) * t;
  const io3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out3 = t => 1 - Math.pow(1 - t, 3), in2 = t => t * t;
  const barG = q => (1 - Math.cos(Math.PI * seg(q, .1, 1))) / 2;   // the four bars grow over the whole of beat 4, easing in and out
  const hash = j => ((j * 2654435761 >>> 0) % 1000) / 1000, hash2 = j => ((j * 40503 + 7919 >>> 0) % 997) / 997;
  sec.classList.add(reduce ? 'h-still' : 'h-on');

  // ---------------------------------------------------------------- the timeline, in stage heights since the stage pinned. A change takes 65% of a screen (55% on a phone); words swap in 20% windows between; the four prices hold a third of a screen.
  // First the hero (2026-11-28): at rest the page's first screen lies over the stage. On the first scroll it scrolls away as normal and fades (the first half of w0), while the film keeps
  // the Factory arm from the row: it grows out of its place in the row into the stage (g), finishing its work cycle on the pose it breaks from, and beat 1's heading arrives (the second half of w0).
  // Beat 1 is then the arm breaking and drifting, the last 70% of the old beat 1 (its first 30% was the growth, which now happens here).
  let U = .65, T = {}, END = 3, S0 = 0;
  const buildT = () => { const SW = .2, HOLD = .33, A = .5, U1 = .7 * U, o = A + U1; T = { g: [S0, A - .05], w0: [.1, .32], b1: [A, o], w1: [o, o + SW], b2: [o + SW, o + SW + U], w2: [o + SW + U, o + 2 * SW + U], b3: [o + 2 * SW + U, o + 2 * SW + 2 * U], w3: [o + 2 * SW + 2 * U, o + 3 * SW + 2 * U], b4: [o + 3 * SW + 2 * U, o + 3 * SW + 3 * U] };
    T.ax = [T.b2[1] - .1, T.b2[1]]; END = T.b4[1] + HOLD; };

  // ---------------------------------------------------------------- data, fetched after the page has loaded (rule 11)
  let D = null, A = null, N = 0, NA = 0, ready = false;
  const load = (src, cb) => { const s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = () => {}; document.head.appendChild(s); };
  const fetchAll = () => { let got = 0; const one = () => { if (++got < 2) return; D = window.FERRA_FILM; A = window.FERRA_ARM; if (!D || !A) return; prep(); ready = true; layout(); }; load('assets/h-film-data.js?v=3e3c9f6750', one); load('assets/h-arm.js?v=19a6c7bf8f', one); };
  if (document.readyState === 'complete') setTimeout(fetchAll, 60); else addEventListener('load', () => setTimeout(fetchAll, 60), { once: true });

  // per listing (j < N) and per auction (N + i): where it sits on the arm, in the field, on the chart, its size there, and whether it matches the ringed robot
  let L = null, F = null;
  const prep = () => { N = D.rows.length; NA = D.aucs.length; const n = N + NA, km = D.makers.indexOf('KUKA');
    L = { n, bx: new Float32Array(n), by: new Float32Array(n), sx2: new Float32Array(n), sy2: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n), fx: new Float32Array(n), fy: new Float32Array(n), cx: new Float32Array(n), cy: new Float32Array(n), r0: new Float32Array(n), rc: new Float32Array(n), g: new Float32Array(n), on: new Uint8Array(n), m: new Uint8Array(n), w: new Float32Array(n), st: new Float32Array(n),
      x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), age: new Float32Array(n), usd: new Float32Array(n) };
    for (let j = 0; j < n; j++) { const q = j < N ? D.rows[j] : D.aucs[j - N]; L.age[j] = q[0]; L.usd[j] = q[1]; L.g[j] = Math.pow(q[1] / 11000, .35);
      L.on[j] = q[0] <= 30.2 && q[0] >= 0 && q[1] >= LO && q[1] <= HI ? 1 : 0;   // a listing past the chart's own ages or prices leaves during the flight
      L.m[j] = j < N && q[4] === km && Math.abs(q[5] - RING_AGE) <= 2 ? 1 : 0; }
    // the order the listings swell on the arm: from the base up its length, a little loose
    const base = [22, 112]; let far = 0; const d = new Float32Array(N);
    for (let j = 0; j < N; j++) { d[j] = Math.hypot(D.rows[j][2] - base[0], D.rows[j][3] - base[1]); far = Math.max(far, d[j]); }
    [...Array(N).keys()].map(j => [d[j] / far + (hash(j) - .5) * .25, j]).sort((a, b) => a[0] - b[0]).forEach(([, j], i) => { L.w[j] = i / N; });
    for (let i = 0; i < NA; i++) L.w[N + i] = 1;
    // the arm's own dots: x, y, size, trim, and the listing each one flows into
    F = { n: A.length, x: new Float32Array(A.length), y: new Float32Array(A.length), s: new Float32Array(A.length), acc: new Uint8Array(A.length), to: new Uint16Array(A.length) };
    A.forEach((q, i) => { F.x[i] = q[0] + .5; F.y[i] = q[1] + .5; F.s[i] = q[2]; F.acc[i] = q[3]; F.to[i] = q[4]; }); };

  // ---------------------------------------------------------------- layout
  let W = 0, H = 0, dpr = 1, phone = false, gL = 0, gR = 0, hb = 0, C = { l: 0, r: 1, t: 0, b: 1 }, CB = null, CS = null, comp = -1, flat = false, ylw = 0, arm = { p: 4, x: 0, y: 0, p0: 2, x0: 0, y0: 0 }, yg = 0, xBand = [0, 0], corr = [0, 1], track = [0, 1], xFree = [], bars = [], ring = { x: 0, y: 0, R: 10 }, ties = [], pour = [], secTop = 0, lastW = innerWidth;
  const XP = () => phone ? 7 : 11, X = a => C.l + XP() + clamp(a, 0, 30) / 30 * (C.r - C.l - 2 * XP()), Y = u => C.t + (Math.log(HI) - Math.log(clamp(u, LO, HI))) / (Math.log(HI) - Math.log(LO)) * (C.b - C.t);
  const rel = el => { const a = el.getBoundingClientRect(), b = box.getBoundingClientRect(); return { l: a.left - b.left, t: a.top - b.top, r: a.right - b.left, b: a.bottom - b.top, w: a.width, h: a.height }; };
  const curPanel = () => sec.querySelector('.h-mpp:not([hidden])');
  // the words' own extent (a range, not the box, which fills its grid cell) and each bar at its full length (offsetWidth ignores the scaleX the scroll puts on it)
  const ink = el => { const g = document.createRange(); g.selectNodeContents(el); const a = g.getBoundingClientRect(), b = box.getBoundingClientRect(); return { l: a.left - b.left, r: a.right - b.left }; };
  const layoutBars = () => { const p = curPanel(); if (!p) return; bars = [...p.querySelectorAll('.h-mr')].map(r => { const el = r.querySelector('.h-mbar'), b = rel(el); return { el, l: b.l, y: b.t + b.h / 2, w: el.offsetWidth, h: b.h, f: +el.style.getPropertyValue('--f'), dtR: ink(r.querySelector('dt')).r, ddL: ink(r.querySelector('dd')).l }; }); };
  function layout() {
    W = box.clientWidth; H = box.clientHeight; if (!W || !H) return; phone = W <= 720; U = phone ? .55 : .65; secTop = sec.getBoundingClientRect().top + scrollY; S0 = -secTop / H; buildT();
    sec.style.height = reduce ? '' : Math.round(END * H + H) + 'px';
    dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const inn = $('.h-mfw'), cs = getComputedStyle(inn); gL = parseFloat(cs.paddingLeft) || 20; gR = W - (parseFloat(cs.paddingRight) || 20);
    hb = rel(hstack).b;
    // the four prices stand at the foot of the stage; the chart fills what is between them and the headings
    const padB = phone ? 24 : 44; panel.style.top = Math.round(H - padB - panel.offsetHeight) + 'px'; const pTop = rel(panel).t;
    layoutBars();
    track = bars.length ? [bars[0].l, Math.max(...bars.map(b => b.l + b.w / Math.max(.01, b.f)))] : [gL, gR];
    // the lane for the pour: the bars' own column, which holds no words (the names sit to its left, the figures to its left on a desktop and to its right on a phone)
    corr = [Math.max(track[0], ...bars.map(b => b.dtR)) + 10, Math.min(track[1], ...bars.map(b => b.ddL > b.l ? b.ddL : 1e9)) - 10];
    const xh = xls[0].offsetHeight, gap = phone ? 36 : 38;
    // the plot's two ends stand on the page's 12 column grid (the baseline drawn under it marks them); the dots keep a little air inside
    ylw = Math.max(...yls.map(s => s.offsetWidth)); const gg = phone ? 16 : 24, cw = (gR - gL - 11 * gg) / 12, lines = []; for (let i = 0; i <= 12; i++) { lines.push(gL + i * (cw + gg)); if (i) lines.push(gL + i * (cw + gg) - gg); }
    // two boxes for the chart: tall while it is the whole picture (beats 2 and 3), short above the four prices (beat 4). It moves from one to the other in the swap before beat 4, before the prices show
    const want = phone ? gL + ylw + 10 : Math.max(track[0], gL + ylw + 16), cl = Math.min(...lines.filter(x => x >= want - 1)), ct = Math.round(hb + (phone ? 48 : 60));
    CB = { l: cl, r: gR, t: ct, b: Math.round(H - (phone ? 30 : 44) - xh - 12) }; CS = { l: cl, r: gR, t: ct, b: Math.round(pTop - gap - xh - 12) };
    // a screen too short for both (a phone held sideways) shows the last beat as plain markup instead, as without scripts
    const wasFlat = flat; flat = !reduce && CS.b - CS.t < 70; if (flat !== wasFlat || flat) { sec.classList.toggle('h-on', !flat && !reduce); if (flat) { sec.style.height = ''; heads.forEach(h => { h.style.opacity = h.style.visibility = h.style.transform = ''; h._a = h._v = h._t = undefined; }); [panel, axis].forEach(h => { h.style.opacity = h.style.visibility = h.style.transform = h.style.top = h.style.pointerEvents = ''; h._a = h._v = h._t = h._live = undefined; }); bars.forEach(b => { b.el.style.transform = ''; }); paint._g = null; return; } else return layout(); }
    C = CS; xBand = [CS.b + 8, CS.b + 12 + xh]; yg = (xBand[1] + pTop) / 2;
    xFree = []; xls.forEach(s => { const a = +s.dataset.age, x = X(a), w = s.offsetWidth, l = a === 0 ? x - 2 : a === 30 ? x - w + 2 : x - w / 2; xFree.push([l - 8, l + w + 8]); });
    comp = -1; setComp(reduce ? 1 : Math.max(0, shown[2]));
    // the arm: as tall as the picture area allows, centred under the headings. Before the stage pins it stands at about half that, then grows into place
    // the arm in the stage: as tall as the picture area allows, centred under the headings (it grows into this from its place in the row)
    { const top = hb + 36, bot = H - (phone ? 70 : 48), p = Math.min((bot - top) / 109, (gR - gL) * (phone ? .9 : .5) / 101), cx = (gL + gR) / 2, cy = (top + bot) / 2; arm = { p, x: cx - 55.5 * p, y: cy - 63 * p }; }
    ring = { R: phone ? 9 : 12, xB: 0, yB: 0, xS: 0, yS: 0 }; C = CB; ring.xB = X(RING_AGE); ring.yB = Y(RING_ASK); C = CS; ring.xS = X(RING_AGE); ring.yS = Y(RING_ASK); C = lerpC(comp);
    if (ready) place();
    dirty = true; kick();
  }
  const lerpC = k => ({ l: CB.l, r: CB.r, t: lerp(CB.t, CS.t, k), b: lerp(CB.b, CS.b, k) });
  // the chart's box for this much of the move, with its axis labels placed by transform, measured from the labels themselves
  function setComp(k) { if (!CB || k === comp) return; comp = k; C = lerpC(k);
    xls.forEach(s => { const a = +s.dataset.age, x = X(a), w = s.offsetWidth, l = a === 0 ? x - 2 : a === 30 ? x - w + 2 : x - w / 2; s.style.transform = `translate(${l.toFixed(1)}px,${(C.b + 10).toFixed(1)}px)`; });
    yls.forEach(s => { s.style.transform = `translate(${(C.l - s.offsetWidth - (phone ? 8 : 12)).toFixed(1)}px,${(Y(+s.dataset.usd) - s.offsetHeight / 2).toFixed(1)}px)`; });
    yt.style.transform = `translate(${(C.l - ylw - (phone ? 8 : 12)).toFixed(1)}px,${(C.t - (phone ? 34 : 40)).toFixed(1)}px)`; dirty = true; }
  // the fixed places of every dot for this layout
  function place() {
    let seed = 7; const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };   // the same loose field on every visit
    const rb = phone ? 2.6 : 4.6, fx0 = gL + 6, fx1 = gR - 6, fy0 = hb + 40, fy1 = H - (phone ? 80 : 60);
    for (let j = 0; j < L.n; j++) { const isA = j >= N, q = isA ? null : D.rows[j];
      if (!isA) { L.sx[j] = arm.x + q[2] * arm.p; L.sy[j] = arm.y + q[3] * arm.p; L.r0[j] = arm.p * .9 * L.g[j]; }
      // the loose field: spread over the picture area, a little denser toward the middle
      const u = rnd(), v = rnd(), a = u * 6.2832, rr = Math.pow(v, .62);
      L.fx[j] = lerp(fx0, fx1, .5 + Math.cos(a) * rr * .5); L.fy[j] = lerp(fy0, fy1, .5 + Math.sin(a) * rr * .5);
      C = CB; L.bx[j] = X(L.age[j]); L.by[j] = Y(L.usd[j]); C = CS; L.sx2[j] = X(L.age[j]); L.sy2[j] = Y(L.usd[j]); L.rc[j] = L.on[j] ? rb * Math.pow(L.g[j], .8) : 0;
      // the flight to the chart runs young to old, a little loose
      L.st[j] = L.age[j] / 30 * .26 + hash(j + 3) * .1; }
    C = lerpC(comp); chartAt(comp);
    // the ties: from the ring to its nearest bright dots, on the tall chart where they show
    ties = []; const near = []; for (let j = 0; j < N; j++) if (L.m[j] && L.on[j]) near.push([Math.hypot(L.bx[j] - ring.xB, L.by[j] - ring.yB), j]);
    near.sort((a, b) => a[0] - b[0]); ties = near.filter(q => q[0] > ring.R + L.rc[q[1]] + 22).slice(0, 5).map(q => q[1]);
    // the pour: each bright dot gets a bar, a start, a lane and a landing spot on its bar
    const br = near.map(q => q[1]).sort((a, b) => L.sx2[a] - L.sx2[b] || a - b); pour = [];
    br.forEach((j, i) => { const k = i % 4, st = .1 + .48 * i / Math.max(1, br.length), arr = st + .42, g = io3(seg(arr, .15, .95));
      let xa = L.sx2[j]; for (const [l, r] of xFree) if (xa > l - L.rc[j] && xa < r + L.rc[j]) xa = xa - l < r - xa ? l - L.rc[j] - 1 : r + L.rc[j] + 1;   // out of the way of the age labels before it reaches them
      xa = clamp(xa, CS.l + 2, CS.r - 2);
      const xc = clamp(xa, corr[0], corr[1]);
      pour.push({ j, k, st, xa, xc, u: Math.min(.12 + .76 * hash(j + 9), g * .92) }); });
  }

  // every dot's chart place for this much of the move between the two boxes
  const chartAt = k => { if (!L) return; for (let j = 0; j < L.n; j++) { L.cx[j] = lerp(L.bx[j], L.sx2[j], k); L.cy[j] = lerp(L.by[j], L.sy2[j], k); } ring.x = lerp(ring.xB, ring.xS, k); ring.y = lerp(ring.yB, ring.yS, k); };

  // ---------------------------------------------------------------- the scroll, the words and their settle
  const rawS = () => (scrollY - secTop) / (H || 1);
  let dir = 1, idle = true, lastY = scrollY, idleT = 0, sv = null, painted = NaN, dirty = true, on = true, raf = 0, lastNow = 0;
  const WINS = () => [T.w1, T.w2, T.w3, T.ax, T.w0], latch = [null, null, null, null, null], shown = [-1, -1, -1, -1, -1];
  // a window part way through when the reader stops finishes in the direction they were going, and stays finished while they carry on that way
  const target = (k, s) => { if (reduce) return 1; const [a, b] = WINS()[k], raw = seg(s, a, b); if (raw <= 0 || raw >= 1) { latch[k] = null; return raw; } if (latch[k] !== null) return latch[k]; if (idle) { latch[k] = dir > 0 ? 1 : 0; return latch[k]; } return raw; };
  const setOp = (el, a, dy) => { const s = a.toFixed(3); if (el._a !== s) { el._a = s; el.style.opacity = s; const v = a > .002 || el === panel; if (el._v !== v) { el._v = v; el.style.visibility = v ? 'visible' : 'hidden'; } } if (dy !== undefined) { const t = dy ? `translateY(${dy.toFixed(1)}px)` : 'none'; if (el._t !== t) { el._t = t; el.style.transform = t; } } };
  function words(s, dt) { let moving = false;
    for (let k = 0; k < 5; k++) { const tg = target(k, s); let v = shown[k];
      if (v < 0 || Math.abs(tg - v) < .004) v = tg; else { const fast = latch[k] === null && !idle; v += (tg - v) * (1 - Math.exp(-dt / (fast ? 40 : 90))); if (Math.abs(tg - v) < .004) v = tg; else moving = true; }
      shown[k] = v; }
    // in each swap the old heading leaves in the first half and the new one arrives in the second, so two headings never share the spot
    const [w1, w2, w3, ax, w0] = shown, ws = [w1, w2, w3];
    // the h1, its line and button leave in the first half of the first swap, and beat 1's heading arrives in the second
    { const o = reduce || flat ? 0 : io3(seg(w0, 0, .5)); setOp(hero, 1 - o); const live = o < .5; if (hero._live !== live) { hero._live = live; hero.style.pointerEvents = live ? '' : 'none'; } }
    heads.forEach((h, i) => { const inA = i ? seg(ws[i - 1], .5, 1) : reduce ? 0 : seg(w0, .5, 1), outA = i < 3 ? seg(ws[i], 0, .5) : 0; setOp(h, reduce ? (i === 3 ? 1 : 0) : inA * (1 - outA), reduce ? 0 : (1 - out3(inA)) * 14 - in2(outA) * 14); });
    const k = reduce ? 1 : io3(seg(w3, 0, .5)); if (k !== comp) { setComp(k); chartAt(k); }
    const pa = reduce ? 1 : seg(w3, .5, 1); setOp(axis, reduce ? 1 : ax); setOp(panel, pa, reduce ? 0 : (1 - out3(pa)) * 14);
    const live = reduce || w3 > .75; if (panel._live !== live) { panel._live = live; panel.style.pointerEvents = live ? '' : 'none'; }
    return moving; }
  addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) { const d = y > lastY ? 1 : -1; if (d !== dir) latch.fill(null); dir = d; } lastY = y; idle = false; clearTimeout(idleT); idleT = setTimeout(() => { idle = true; kick(); }, 150); if (tipOn) hideTip(); kick(); }, { passive: true });

  // ---------------------------------------------------------------- the hand over of the Factory arm. Off the top of the page the film draws it and the row's own canvas hides; back at the top the row
  // draws it again, picking its loop up on the frame the film showed. SEAT is the pose the film's listing seats were cut from (assets/h-arm.js)
  let took = -1; const SEAT = 84;
  const take = s => { const rb = rowCv && rowCv._row; if (!rb || !rb.frames || reduce || flat) return false;
    if (s > S0 + .004) { if (took < 0) { took = rb.f; rb.hold = true; rowCv.style.visibility = 'hidden'; rowCv.closest('.h-row').classList.add('h-took'); } return true; }
    if (took >= 0) { rb.resumeAt(took); rb.hold = false; rowCv.style.visibility = ''; rowCv.closest('.h-row').classList.remove('h-took'); took = -1; } return false; };
  const drawF = (p, ox, oy) => { for (let part = 0; part < 2; part++) { const path = new Path2D(); for (let i = 0; i < F.n; i++) { if (F.acc[i] !== part) continue; dot(path, ox + F.x[i] * p, oy + F.y[i] * p, Math.max(.45, p * .44 * F.s[i])); } ctx.fillStyle = part ? DEEP : COB; ctx.fill(path); } };
  // ---------------------------------------------------------------- painting
  const P = { a: new Path2D(), b: new Path2D() };
  const dot = (path, x, y, r) => { path.moveTo(x + r, y); path.arc(x, y, r, 0, 6.2832); };
  function paint(s) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const q1 = .3 + .7 * seg(s, ...T.b1), q2 = seg(s, ...T.b2), q3 = seg(s, ...T.b3), q4 = seg(s, ...T.b4);
    const brk = seg(q1, .3, .68), drift = seg(q1, .62, 1), dim = lerp(1, .25, io3(seg(q3, .15, .55))), gBar = reduce ? 1 : barG(q4);
    // the chart's own white ground and baseline, from the flight onto it: its two ends stand on the page grid
    { const a = seg(q2, .35, .9); if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(C.l, C.t - 14, C.r - C.l, C.b - C.t + 18, 8); ctx.fill(); ctx.fillStyle = '#C5CBD6'; ctx.fillRect(C.l, C.b + 3, C.r - C.l, 1); ctx.globalAlpha = 1; } }
    // 1. the arm, whole while it grows, then each dot runs to the listing it belongs to and is taken in
    // 0. the hero's Factory arm, taken over from the row on the first scroll: it grows from its place in the row (which scrolls up with the hero) into the stage, its loop running on with the
    // scroll to the pose it breaks from. Its dots change from the row's drawing to the film's as it grows, so neither the hand over nor the landing shows a seam
    const gw = (t => t * t * (3 - 2 * t))(seg(s, ...T.g)), rb = rowCv && rowCv._row;
    const tk = take(s);
    if (brk <= 0 && gw > 0 && tk) { const g = gw; const rc = rowCv.getBoundingClientRect(), bb = box.getBoundingClientRect(), p0 = rb.p, wu = rowCv.clientWidth / p0,
        x0 = rc.left - bb.left + ((wu - (rb.hi + rb.lo + 1)) / 2 + .5) * p0, y0 = rc.top - bb.top + (rb.dy + .5) * p0, p = lerp(p0, arm.p, g), ox = lerp(x0, arm.x + .5 * arm.p, g), oy = lerp(y0, arm.y + .5 * arm.p, g);
      const d = (SEAT - took + rb.n) % rb.n, fr = (took + Math.round(g * d)) % rb.n;
      if (fr === SEAT && g >= 1) drawF(arm.p, arm.x, arm.y); else { const a = rb.frames[fr], n = a.length, m = g;
        for (let part = 0; part < 2; part++) { const path = new Path2D();
          for (let i = 0; i < n; i += 3) { const trim = i >= a.n * 1, sv = a[i + 2], deep = trim && !(m >= .5 && sv > .86); if (deep !== !!part) continue;
            const r = lerp(Math.max(Math.min(.4, p * .3), p * .5 * sv), Math.max(.45, p * .44 * Math.pow(sv, 1 / .72)), m); dot(path, ox + a[i] * p, oy + a[i + 1] * p, r); }
          ctx.fillStyle = part ? DEEP : COB; ctx.fill(path); } } }
    // the row's loop has not arrived yet (a slow network): the film's own arm grows from the row's place instead, centred in the row's canvas and standing on its floor
    else if (brk <= 0 && !tk && gw > 0 && rowCv) { const rc = rowCv.getBoundingClientRect(), bb = box.getBoundingClientRect(), p0 = rc.height / +rowCv.dataset.rows, p = lerp(p0, arm.p, gw);
      drawF(p, lerp(rc.left - bb.left + rc.width / 2 - 55.5 * p0, arm.x, gw), lerp(rc.bottom - bb.top - 118 * p0, arm.y, gw)); }
    else if (brk > 0 && brk < 1) { const p = arm.p, ox = arm.x, oy = arm.y;
      for (let part = 0; part < 2; part++) { const path = new Path2D(); let any = false;
        for (let i = 0; i < F.n; i++) { if (F.acc[i] !== part) continue; let x = ox + F.x[i] * p, y = oy + F.y[i] * p, r = Math.max(.45, p * .44 * F.s[i]);
          if (brk > 0) { const j = F.to[i], st = L.w[j] * .55, k = io3(seg(brk, st, st + .45)); if (k >= 1) continue; x = lerp(x, L.sx[j], k); y = lerp(y, L.sy[j], k); r *= 1 - k * .6; }
          dot(path, x, y, r); any = true; }
        if (any) { ctx.fillStyle = part ? DEEP : COB; ctx.fill(path); } } }
    // 2. the listings: born on the arm as its dots reach them, out to the field, onto the chart, then the bright ones pour into the bars
    const dimP = new Path2D(), dimA = new Path2D(), brP = new Path2D(), aucP = new Path2D(); let nDim = 0, nDimA = 0, nBr = 0, nAuc = 0;
    if (brk > 0) for (let j = 0; j < L.n; j++) { const isA = j >= N; let x, y, r;
      if (isA) { // auctions arrive during the flight, dropping a short way into place
        const k = out3(seg(q2, .5 + (j - N) / NA * .2, .78 + (j - N) / NA * .1)); if (k <= 0 || !L.on[j]) { L.r[j] = 0; continue; } x = L.cx[j]; y = L.cy[j] - (1 - k) * 26; r = L.rc[j] * k; }
      else { const born = io3(seg(brk, L.w[j] * .55 + .2, L.w[j] * .55 + .45)); if (born <= 0) { L.r[j] = 0; continue; }
        const dd = io3(seg(drift, L.w[j] * .3, L.w[j] * .3 + .7)), fl = io3(seg(q2, L.st[j], L.st[j] + .55));
        x = lerp(lerp(L.sx[j], L.fx[j], dd), L.cx[j], fl); y = lerp(lerp(L.sy[j], L.fy[j], dd), L.cy[j], fl);
        r = lerp(lerp(L.r0[j] * born, lerp(L.r0[j], L.rc[j] || L.r0[j] * .6, .5), dd), L.rc[j], fl); }
      L.x[j] = x; L.y[j] = y; L.r[j] = r; if (r <= .05) continue;
      if (L.m[j] && q4 > 0) continue;   // the pour paints these below
      if (!L.m[j] && dim < 1) { if (isA) { dot(dimA, x, y, r); nDimA++; } else { dot(dimP, x, y, r); nDim++; } }
      else if (isA) { dot(aucP, x, y, r); nAuc++; } else { dot(brP, x, y, r); nBr++; } }
    // the pour: down out of the chart clear of the age labels, along the open band, then into its bar. It is taken in as it lands
    if (q4 > 0) for (const o of pour) { const j = o.j, t = seg(q4, o.st, o.st + .42); if (t >= 1) { L.r[j] = 0; continue; } const b = bars[o.k]; if (!b) continue;
      const xt = clamp(b.l + o.u * b.w, corr[0], corr[1]); let x, y;
      if (t < .45) { const kx = io3(seg(t, 0, .15)), ky = in2(seg(t, .1, .45)); x = lerp(L.cx[j], o.xa, kx); y = lerp(L.cy[j], yg, ky); }
      else if (t < .62) { x = lerp(o.xa, o.xc, io3(seg(t, .45, .62))); y = yg; }
      else { const k = io3(seg(t, .62, 1)); x = lerp(o.xc, xt, k); y = lerp(yg, b.y, k); }
      const r = L.rc[j] * (1 - seg(t, .86, 1)); L.x[j] = x; L.y[j] = y; L.r[j] = r; if (r > .05) { dot(brP, x, y, r); nBr++; } }
    if (nDim || nDimA) { ctx.globalAlpha = dim; if (nDim) { ctx.fillStyle = COB; ctx.fill(dimP); } if (nDimA) { ctx.fillStyle = DEEP; ctx.fill(dimA); } ctx.globalAlpha = 1; }
    if (nAuc) { ctx.fillStyle = DEEP; ctx.fill(aucP); }
    if (nBr) { ctx.fillStyle = COB; ctx.fill(brP); }
    // 3. the ring lands on the KR 210 from 2020, then the ties grow to the arms most like it; they draw back as the pour starts
    if (q3 > 0) { const k = io3(seg(q3, 0, .3)), R = ring.R * lerp(2.2, 1, k);
      ctx.globalAlpha = k; ctx.strokeStyle = COB; ctx.lineWidth = phone ? 2 : 2.5; ctx.beginPath(); ctx.arc(ring.x, ring.y, R, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ring.x, ring.y, Math.max(1, R - (phone ? 3.5 : 4.5)), 0, 6.2832); ctx.fill(); ctx.fillStyle = COB; ctx.beginPath(); ctx.arc(ring.x, ring.y, phone ? 2.6 : 3.4, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      const back = 1 - seg(q4, 0, .15); ctx.lineWidth = phone ? 1.25 : 1.5; ctx.beginPath(); let anyT = false;
      ties.forEach((j, i) => { const g = io3(seg(q3, .5 + i * .06, .8 + i * .04)) * back; if (g <= 0) return; const dx = L.cx[j] - ring.x, dy = L.cy[j] - ring.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, a = ring.R + 3, b = d - L.rc[j] - 3; if (b <= a) return;
        ctx.moveTo(ring.x + ux * a, ring.y + uy * a); ctx.lineTo(ring.x + ux * lerp(a, b, g), ring.y + uy * lerp(a, b, g)); anyT = true; });
      if (anyT) ctx.stroke(); }
    // 4. the bars grow from the left, with their figures already beside them
    const g = gBar.toFixed(4); if (g !== paint._g) { paint._g = g; bars.forEach(b => { b.el.style.transform = `scaleX(${g})`; }); }
  }
  function frame(now) { raf = 0; if (flat) return; const dt = Math.min(64, now - lastNow || 16); lastNow = now; const s = reduce ? END : rawS();
    let busy = words(s, dt);
    if (ready) { if (sv === null || reduce) sv = s; else { sv += (s - sv) * (1 - Math.exp(-dt / 60)); if (Math.abs(s - sv) < .0004) sv = s; else busy = true; }
      // only the stretch around the stage needs a picture; repaint only when the scroll moved it
      const vs = clamp(sv, -1.2, END + .2); if (on && (vs !== painted || dirty)) { painted = vs; dirty = false; paint(vs); } }
    else { const g = (reduce ? 1 : barG(seg(s, ...T.b4))).toFixed(4); if (g !== paint._g) { paint._g = g; bars.forEach(b => { b.el.style.transform = `scaleX(${g})`; }); } }   // the bars follow the scroll even before the dots have arrived
    if (busy && on) raf = requestAnimationFrame(frame); }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) { dirty = true; kick(); } }, { rootMargin: '200px 0px' }).observe(sec);

  // ---------------------------------------------------------------- a listing under the pointer, or under a tap on a phone: its name, build year, price and where it is listed, with a link to it
  let tipOn = false, tipJ = -1;
  const usd = v => '$' + Math.round(v).toLocaleString('en-US');
  const hideTip = () => { if (!tipOn) return; tipOn = false; tipJ = -1; tip.hidden = true; };
  const chartUp = () => { const s = reduce ? END : rawS(); return ready && s >= T.b2[1] - .02 && s <= END + .6; };
  const nearest = (x, y, reach) => { let best = -1, bd = 1e9; for (let j = 0; j < L.n; j++) { const r = L.r[j]; if (r <= .5) continue; const d = Math.hypot(L.x[j] - x, L.y[j] - y) - r; if (d < reach && d < bd) { bd = d; best = j; } } return best; };
  const showTip = j => { if (j === tipJ) return; tipJ = j; tipOn = true; const isA = j >= N, q = isA ? D.aucs[j - N] : D.rows[j];
    tip.querySelector('b').textContent = isA ? q[3] : q[6];
    tip.querySelector('span').textContent = isA ? `${q[4] ? 'Built ' + q[4] + ', s' : 'S'}old at auction for ${usd(q[1])}, ${q[5]}` : `Built ${q[7]}, asking ${usd(q[1])}, on ${q[8]}`;
    const a = tip.querySelector('a'); a.href = isA ? q[7] : q[9]; a.textContent = isA ? 'See the sale →' : 'See the listing →';
    tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight, x = L.x[j], y = L.y[j], r = L.r[j];
    let l = x + r + 14; if (l + w > W - 12) l = x - r - 14 - w; l = clamp(l, 12, W - 12 - w);
    const t = clamp(y - h / 2, hb + 10, H - 12 - h); tip.style.transform = `translate(${l.toFixed(1)}px,${t.toFixed(1)}px)`; };
  {
    stage.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse') return; if (ev.target.closest('.h-tip')) return; if (!chartUp()) { hideTip(); return; } const b = box.getBoundingClientRect(), j = nearest(ev.clientX - b.left, ev.clientY - b.top, 8); if (j >= 0) showTip(j); else hideTip(); }, { passive: true });
    stage.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hideTip(); });
    stage.addEventListener('click', ev => { if (ev.target.closest('a,button,.h-tip')) return; if (!chartUp()) return; const b = box.getBoundingClientRect(), j = nearest(ev.clientX - b.left, ev.clientY - b.top, fine ? 8 : 16); if (j >= 0) showTip(j); else hideTip(); });
  }

  // ---------------------------------------------------------------- go
  addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; hideTip(); layout(); });   // rule 9: width changes only
  addEventListener('load', () => layout(), { once: true });   // the pages above have their pictures now, so the stage's place on the page is final
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());
  layout();
})();
