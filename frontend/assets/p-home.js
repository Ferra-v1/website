// Home page behaviour, row by row from STORYBOARD.md. Runs after site.js. Three parts: the first film; the stage (the robot row, the moat, the price chapter and the loan, one pinned scene painted from the scroll position); and the navy band.
const hClamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, hSeg = (s, a, b) => hClamp((s - a) / (b - a)), hLerp = (a, b, t) => a + (b - a) * t, hIo3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, hOut3 = t => 1 - Math.pow(1 - t, 3), hSoft = t => .5 * t + .5 * t * t * (3 - 2 * t);
const hMix = (a, b, t) => `rgb(${Math.round(hLerp(a[0], b[0], t))},${Math.round(hLerp(a[1], b[1], t))},${Math.round(hLerp(a[2], b[2], t))})`;
const H_PALE = [235, 245, 253], H_MID = [88, 122, 214], H_INK = [14, 22, 38], H_WHITE = [255, 255, 255], H_COB = [40, 71, 206], H_DEEP = [30, 51, 155];

// The first film stays pinned while the next section slides over it, and rests once it is covered. Reduced motion: site.js stops the video and the poster stays.
(() => {
  const top = document.querySelector('.h-top'), v = top && top.querySelector('video'); if (!v) return;
  if (innerWidth <= 720) v.poster = 'media/film/hero-phone-poster.webp';   // the page's poster is the wide cut
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let playing = true, held = false; const pb = top.querySelector('[data-film-pause]');
  if (pb) pb.addEventListener('click', () => { held = v.paused; });   // site.js has already acted on the press, so the film's state is the reader's choice
  const check = () => { const on = scrollY < top.clientHeight * 1.02; if (on !== playing) { playing = on; if (on) { if (held) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); } };
  addEventListener('scroll', check, { passive: true }); check();
})();

// The stage. One sticky box from the row of robots to the loan. Every moment below is a function of s, how many screens the page has scrolled since the stage pinned, so scrolling back plays it backwards. Distances are the storyboard's.
(() => {
  const story = document.querySelector('.h-story'); if (!story) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = s => story.querySelector(s), stage = $('.h-stage'), clip = $('.h-clip'), gr = $('.h-gr'), gs = $('.h-gs'), cv = $('.h-cv'), ctx = cv.getContext('2d'), probe = $('.h-probe');
  const vis = $('.h-vis'), moat = $('.h-moat'), film = $('.h-film'), loans = $('.h-loans'), lsp = document.querySelector('.h-lsp');
  const b0 = $('.h-b0'), b1 = $('.h-b1'), b2 = $('.h-b2'), b3 = $('.h-b3'), axis = $('.h-axis'), tipEl = $('.h-tip'), lblA = $('.h-pa'), lblS = $('.h-ps'), lblC = $('.h-cl'), lblU = $('.h-al');
  const clamp = hClamp, seg = hSeg, lerp = hLerp, io3 = hIo3, out3 = hOut3, in2 = t => t * t, soft = hSoft, wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------------------------------------------------------------- the timeline, in screens since the stage pinned. A change takes 85vh, or 70vh on a phone; words hold at least 60vh; a swap of words takes 20% of a change.
  let T = {}, U = 1;
  const buildT = () => { const u = U; let t = 0; const next = d => { const a = t; t += d; return [a, t]; };
    T = {}; T.row = next(u + .2);         // the row holds while it assembles and sweeps
    T.dark = next(.85); T.mIn = next(.2 * u); T.mHold = next(.45);    // the moat: the others leave as the ground turns to ink and the arm grows into the big dot arm, then its words hold
    T.turn = next(u); T.photo = next(.3); T.res = next(u);          // the dots turn into the arm photo as the ground moves to the film's colour, the photo holds, then breaks back into the fine dots
    T.sw1 = next(.2 * u); T.gather = next(u + .1);                  // into the 433 listing dots: the change fills its stretch, so nothing sits still before the words swap
    T.sw2 = next(.2 * u); T.fly = next(u + .2);                     // onto the chart, then the chart holds with its two labels
    T.sw3 = next(.2 * u); T.fall = next(u + .1);                    // into one price
    T.box = next(.45); T.wash = next(.65); T.lo = next(.7); T.end = t; };   // the box, the fade to white, then the loan, long enough to read after its 49 dots land. The stage then scrolls away with a plain edge
  // reduced motion: the stage steps between finished stills
  const snap = s => s < T.dark[0] + .4 ? 0 : s < T.turn[0] ? T.mHold[1] - .1 : s < T.res[1] ? T.photo[0] + .2 : s < T.fly[0] ? T.gather[1] : s < T.fall[0] ? T.fly[1] : s < T.wash[0] ? T.box[0] + .2 : T.lo[0] + .2;

  // ---------------------------------------------------------------- the row: nine moving robots on one line. Each plays from its own sprite, repainted only when its frame changes (twelve a second), as one path per colour.
  // A robot assembles when it arrives, 300ms after the one before it, and its caption rises after it. Reduced motion draws each robot's first frame, still.
  const figs = [...vis.querySelectorAll('.h-bot')], COB = '#2847ce', DEEP = '#1e339b', ASM = 2.2, POSE = +story.dataset.pose;   // the loop's frame that the fine dots and the photo were made from: measured, same grid, no offset
  const bots = figs.map(fig => { const c = fig.querySelector('canvas'); return { fig, cv: c, ctx: c.getContext('2d'), name: c.dataset.loop, frames: null, on: 0, f: 0, cols: 112, rows: +getComputedStyle(fig).getPropertyValue('--r'), dx: 0, dy: 0, n: 1, fps: 12, stale: false, t0: 0 }; });
  const armB = bots[bots.length - 1], armFig = armB.fig, rowWords = [...vis.querySelectorAll('.h-rh,.h-vcap,figcaption')];
  const size = b => { const w = b.cv.clientWidth, dpr = Math.min(2, devicePixelRatio || 1); if (!w) return; b.p = w / 112; b.dpr = dpr; const W2 = Math.round(w * dpr), H2 = Math.round(b.p * b.rows * dpr); if (b.cv.width !== W2 || b.cv.height !== H2) { b.cv.width = W2; b.cv.height = H2; } b.stale = true;
    if (b.frames) b.cv._rz = { frames: b.frames, n: b.n, f: b.f, p: b.p, dx: b.dx, dy: b.dy, w: 112, h: b.gridH, colors: [COB, DEEP], rad: .5 }; };
  // one sprite to one Float32Array a frame: x, y, size, with the trim's dots after index frame.n
  const decode = (b, m, ok) => { const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const per = m.per || Math.floor(im.width / m.w), frames = []; let lo = 1e9, hi = 0, low = 0;
      for (let f = 0; f < m.frames; f++) { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h, base = [], trim = [];
        for (let y = 0; y < m.h; y++) for (let X = 0; X < m.w; X++) { const i = ((oy + y) * c.width + ox + X) * 4, v = sz[i]; if (!v) continue; if (X < lo) lo = X; if (X > hi) hi = X; if (y > low) low = y;
          const s = Math.pow(v / 252, .72); (ac[i] > 127 || s > .86 ? trim : base).push(X, y, s); }
        const a = new Float32Array(base.length + trim.length); a.set(base); a.set(trim, base.length); a.n = base.length; frames.push(a); }
      b.dx = (112 - (hi + lo + 1)) / 2; b.dy = b.rows - 1 - low; b.n = m.frames; b.fps = m.fps || 12; b.gridH = m.h; b.low = low; ok(frames); };
    im.onload = ia.onload = done; im.onerror = ia.onerror = () => ok(null); im.src = m.src; ia.src = m.acc; };
  const paintBot = (b, k) => { const { ctx: c, p, dpr } = b, a = b.frames[b.f], n = a.length, dx = b.dx + .5, dy = b.dy + .5; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, b.cv.width, b.cv.height);
    for (let part = 0; part < 2; part++) { c.fillStyle = part ? DEEP : COB; c.beginPath();
      for (let i = part ? a.n : 0, e = part ? n : a.n; i < e; i += 3) { let x = (a[i] + dx) * p, y = (a[i + 1] + dy) * p, r = Math.max(Math.min(.4, p * .3), p * .5 * a[i + 2]);
        if (k < 1) { const h = ((a[i] * 73 + a[i + 1] * 151) % 97) / 97, de = a[i + 1] / b.rows * .45 + h * .25, q = clamp((k - de) / .3), o = 1 - Math.pow(1 - q, 3); if (o <= 0) continue; x += (1 - o) * (h - .5) * p * 26; y += (1 - o) * (h * 1.7 - 1.1) * p * 18; r *= .35 + .65 * o; }
        c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832); }
      c.fill(); } };
  let rowA = 1, free = false;
  const rowTick = now => { let changed = false;
    for (const b of bots) { if (!b.frames || !b.on) continue; if (!b.t0) b.t0 = now;
      if (b === armB && free) continue;   // its pose belongs to the scroll now: see paint
      const el = (now - b.t0) / 1000, k = reduce ? 1 : Math.min(1, el / ASM), f = reduce ? 0 : k < 1 ? 0 : Math.floor((el - ASM) * b.fps) % b.n;
      const fresh = k < 1 || f !== b.f || b.stale;
      if (b === armB && f !== b.f) changed = true;
      b.f = f; if (b.cv._rz) b.cv._rz.f = f;
      if (fresh && rowA > 0 && !(b === armB && free)) { b.stale = false; paintBot(b, k); } }
    return changed; };
  const fetchRow = () => bots.forEach(b => { const s = document.createElement('script'); s.src = 'media/dots/loops/' + b.name + '-ink.js';
    s.onload = () => (window.requestIdleCallback || setTimeout)(() => { const m = (window.FERRA_SEQ || {})[b.name + '-ink']; if (!m) return; decode(b, m, fr => { if (!fr) return; b.frames = fr; b.f = 0; size(b); if (reduce) b.on = 1; }); }, { timeout: 400 });
    document.head.appendChild(s); });
  // from 60% visible: one robot at a time, left to right, 600ms apart, with 8s rest between rounds. Hover or tap runs one robot (assets/resolve.js).
  let lastS = -9, arrived = false;
  const rowOn = () => lastS > -.4 && lastS < T.row[1] - .02 && !document.hidden;
  const sweep = async () => { await wait(ASM * 1000 + 300 * bots.length); const R = window.FerraResolve; if (!R) return; const items = figs.map(R.get);
    for (;;) { for (const r of items) { while (!rowOn()) await wait(300); if (r.ready()) { await r.run(); await wait(600); } } await wait(8000); } };
  const arrive = () => { if (arrived) return; arrived = true; bots.forEach((b, i) => { if (reduce) { b.on = 1; b.fig.classList.add('h-on'); return; } setTimeout(() => { b.on = 1; b.t0 = 0; b.fig.classList.remove('h-wait'); b.fig.classList.add('h-on'); }, i * 300); }); if (!reduce) sweep(); };
  figs.forEach(f => f.classList.add(reduce ? 'h-on' : 'h-wait'));

  // ---------------------------------------------------------------- the price box: the only numbers baked into the page
  const BX0 = 5, BX1 = 106, BY0 = 9, BY1 = 118, HI = 125000, LO = 220;
  let W = 0, H = 0, FH = 0, dpr = 1, phone = false, fineD = null, fineFlat = null, D = null, R = null, dirty = true, on = true, photo = null, photoOK = false;
  let cam = { p: 6, l: 300 }, floorY = 800, axisY = 800, lineL = 0, C = { l: 0, r: 1000, t: 0, b: 800 }, age = 10, ask = 14700, sale = 6100, pt = null, slot = null, tgt = null, d1 = { x: 0, y: 0 };
  const X = a => C.l + a / 30 * (C.r - C.l), Y = u => C.t + (Math.log(HI) - Math.log(u)) / (Math.log(HI) - Math.log(LO)) * (C.b - C.t);
  const tab = JSON.parse(document.getElementById('h-prices').textContent), rSel = document.getElementById('h-r'), ySel = document.getElementById('h-y'), tool = document.getElementById('h-tool'), saleEl = document.getElementById('h-pv'), whyEl = document.getElementById('h-why');
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US'), r100 = v => Math.round(v / 100) * 100;
  let shown = null, tw = 0, ticked = false, ends = null, endDirty = true;
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
    // the selects stay quick
    if (shown === null || reduce || !ticked) { shown = sale; saleEl.textContent = fmt(sale); } else {
      const from = shown, st = performance.now(); cancelAnimationFrame(tw);
      const step = t => { const q = out3(clamp((t - st) / 320)); shown = lerp(from, sale, q); saleEl.textContent = fmt(q < 1 ? r100(shown) : sale); if (q < 1) tw = requestAnimationFrame(step); };
      tw = requestAnimationFrame(step);
    }
    { const ta = 'Sellers ask ' + fmt(ask), ts = 'Likely sale ' + fmt(sale); if (lblA.textContent !== ta) lblA.textContent = ta; if (lblS.textContent !== ts) lblS.textContent = ts; endDirty = true; }
    if (R) drain();
    if (W && phone) layout();
    dirty = true;
  };
  rSel.addEventListener('change', setBox); ySel.addEventListener('change', setBox); rSel.value = 'all'; setBox();
  if (reduce) b3.classList.add('h-told');

  // ---------------------------------------------------------------- heavy pieces, fetched when the section is near
  const load = (src, cb) => { const s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = () => {}; document.head.appendChild(s); };
  const seatFine = () => { if (!fineD || !D) return; const rows = D.rows;
    for (const p of fineD) { let bd = 1e9, bi = 0; for (let j = 0; j < rows.length; j++) { const dx = rows[j][6] - p.x, dy = rows[j][7] - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = j; } } p.to = bi; p.dd = Math.min(1, Math.sqrt(bd) / 4); } };
  const fetchFilm = () => {
    const pic = new Image(); pic.onload = () => { const c = document.createElement('canvas'); c.width = pic.naturalWidth; c.height = pic.naturalHeight; const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(pic, 0, 0); photo = c; photoOK = true; dirty = true; }; pic.src = 'media/robots/arm-film.webp';   // the file is mirrored for an arm that faced left; every arm on this stage now faces right, as the footage's does
    load('assets/h-arm.js', () => { fineD = window.FERRA_ARM.map(q => ({ x: q[0] + .5, y: q[1] + .5, s: q[2], acc: q[3], g: q[3] * 100 + Math.round(q[2] * 4), h: ((q[0] * 73 + q[1] * 151) % 97) / 97 })).sort((a, b) => a.g - b.g); seatFine(); flatFine(); dirty = true; });
    load('assets/h-film.js', () => { D = window.FERRA_FILM; prep(); seatFine(); layout(); });
  };
  // the row comes as soon as the page has settled, because it is one scroll away. The price chapter's pieces wait until the row is arriving.
  if (document.readyState === 'complete') fetchRow(); else addEventListener('load', fetchRow, { once: true });
  let fetched = false;
  const fetchLate = () => { if (fetched) return; fetched = true; fetchFilm();  };

  // ---------------------------------------------------------------- listings
  const rad = u => Math.pow(u / 11000, .35);
  const prep = () => { const n = D.rows.length; R = { n, x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), x0: new Float32Array(n), y0: new Float32Array(n), r0: new Float32Array(n), x1: new Float32Array(n), y1: new Float32Array(n), r1: new Float32Array(n), d: new Float32Array(n), o: new Float32Array(n), f: new Float32Array(n), w: new Float32Array(n) };
    let far = 0; for (let j = 0; j < n; j++) { const q = D.rows[j], dx = q[6] - 22, dy = q[7] - 112, m = Math.hypot(dx, dy); R.d[j] = m; if (m > far) far = m; R.o[j] = ((j * 2654435761 >>> 0) % 1000) / 500 - 1; }
    const by = Array.from({ length: n }, (_, j) => [R.d[j] + R.o[j] * far * .12, j]).sort((a, b) => a[0] - b[0]); by.forEach((q, i) => { R.w[q[1]] = i / n; });   // the order the listings swell in: from the base up the arm, even along its length
    for (let j = 0; j < n; j++) R.d[j] = 1 - R.d[j] / far; };   // the gripper leaves first, the base last
  // the chart pours into the chosen price nearest dots first, at an even rate
  const drain = () => { const mx = X(age), my = Y(sale), by = Array.from({ length: R.n }, (_, j) => [Math.hypot(R.x1[j] - mx, R.y1[j] - my), j]).sort((a, b) => a[0] - b[0]); by.forEach((q, i) => { R.f[q[1]] = i / R.n; }); };
  // the fine arm in canvas pixels, for the Resolve
  const flatFine = () => { if (!fineD) return; const p = cam.p, out = []; for (const q of fineD) { if (q.y > BY1) continue; out.push(cam.l + q.x * p, floorY - (BY1 - q.y) * p, Math.max(.4, p * .44 * q.s)); } fineFlat = out; };

  // ---------------------------------------------------------------- layout
  // One arm, facing one way, in one place: the row's arm grows onto this spot, and the fine dots and arm-film.webp stand on it too. All three share one grid, so their one size and place is cam.
  const docTop = el => el.getBoundingClientRect().top + scrollY;
  let storyTop = 0;
  function layout() {
    W = stage.clientWidth; FH = stage.clientHeight; H = probe.clientHeight || FH; dpr = Math.min(2, devicePixelRatio || 1); phone = W <= 720; U = phone ? .7 : .85; buildT();
    story.style.height = (T.end * H + FH).toFixed(0) + 'px'; storyTop = docTop(story);
    cv.width = Math.round(W * dpr); cv.height = Math.round(FH * dpr);
    const cols = BX1 - BX0 + 1, rows = BY1 - BY0 + 1, wrap = Math.min(W, 1200), mar = (W - wrap) / 2 + (phone ? 16 : 24);
    if (phone) {
      // the arm stands over the words: as big as the width and the words allow, centred in what is left
      const wh = Math.max(...[...story.querySelectorAll('.h-mct,.h-b0 .h-bt,.h-b1 .h-bt,.h-b2 .h-bt')].map(el => el.getBoundingClientRect().height)), room = H - wh - 28 - 52, p = Math.min((W - 12) / cols, room / rows);
      floorY = Math.round(52 + rows * p + Math.max(0, room - rows * p) / 2); cam = { p, l: (W - cols * p) / 2 - BX0 * p };
      const bh = b3.querySelector('.h-bt').getBoundingClientRect().height, bottom = H - bh - 54;
      C = { l: mar + 60, r: W - mar - 4, t: 64, b: bottom }; axisY = bottom + 8; lineL = 0;
    } else {
      const colR = mar + Math.min(440, W * (W <= 1060 ? .4 : .34)), fy = Math.round(H * .9), p = Math.min((fy - 56) / rows, (W - colR - 24) / cols), edge = Math.max(40, (W - 1200) / 2 - 24);
      floorY = fy; cam = { p, l: clamp((colR + W) / 2 - (BX0 + cols / 2) * p, colR + 8 - BX0 * p, W - 8 - (BX1 + 1) * p) };
      C = { l: colR + 84, r: W - edge - 14, t: Math.max(56, H * .09), b: fy - 8 }; axisY = fy; lineL = colR + 44;
    }
    // the row's arm, and the spot it grows into
    bots.forEach(size);
    const sr = stage.getBoundingClientRect(), ar = armB.cv.getBoundingClientRect();
    tgt = { p: cam.p, x: cam.l, y: floorY - BY1 * cam.p };
    slot = { p: armB.p || 1, x: ar.left - sr.left + (armB.dx || 0) * (armB.p || 1), y: ar.top - sr.top + (armB.dy || 0) * (armB.p || 1) };
    const fd = loans.querySelector('.h-dots i').getBoundingClientRect(); d1 = { x: fd.left - sr.left + fd.width / 2, y: fd.top - sr.top + fd.height / 2, r: fd.width / 2 };
    lsp.style.setProperty('--lo', Math.max(0, loans.offsetHeight - FH) + 'px');
    axis.querySelectorAll('.h-xl').forEach(s => { const a = +s.dataset.age, x = X(a); s.style.transform = `translate(${(a === 0 ? x - 4 : a === 30 ? x - s.offsetWidth + 4 : x - s.offsetWidth / 2).toFixed(1)}px,${(axisY + 10).toFixed(1)}px)`; });
    axis.querySelectorAll('.h-yl').forEach(s => { s.style.transform = `translate(${(C.l - s.offsetWidth - (phone ? 6 : 14)).toFixed(1)}px,${(Y(+s.dataset.usd) - s.offsetHeight / 2).toFixed(1)}px)`; });
    labs = null; endDirty = true;   // the chart's labels find their clean spots again
    if (R) { const pb = cam.p;
      for (let j = 0; j < R.n; j++) { const q = D.rows[j], g = rad(q[2]); R.x0[j] = cam.l + q[6] * cam.p; R.y0[j] = floorY - (BY1 - q[7]) * cam.p;
        R.r0[j] = pb * .94 * g; R.x1[j] = X(q[5]); R.y1[j] = Y(q[2]); R.r1[j] = (phone ? 2.8 : 4.8) * Math.pow(g, .8); }
      drain(); }
    flatFine();
    pt = null; dirty = true;
  }

  // ---------------------------------------------------------------- painting
  const rawScroll = () => (scrollY - storyTop) / (H || 1);
  const scroll = () => { let s = rawScroll(); if (reduce) return s < 0 ? 0 : snap(s); return s; };
  const put = (el, a) => { const s = a.toFixed(3); if (el._a !== s) { el._a = s; el.style.opacity = s; } };
  const show = (el, a, dy) => { const v = a > .002; if (el._v !== v) { el._v = v; el.style.visibility = v ? 'visible' : 'hidden'; } put(el, a); if (dy !== undefined) el.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : ''; };
  // words in over one stretch of scroll, out over another; 18px on the way in, as a Rise is
  const beat = (s, i0, i1, o0, o1) => { const i = seg(s, i0, i1), o = seg(s, o0, o1); return { a: i * (1 - o), dy: (1 - out3(i)) * 18 - in2(o) * 18 }; };
  function paintFine(alpha, k) {
    const p = cam.p, left = cam.l; let cur = -1;
    for (const q of fineD) {
      if (q.g !== cur) { if (cur >= 0) ctx.fill(); cur = q.g; const al = alpha * (.55 + .45 * q.s); ctx.fillStyle = q.acc ? `rgba(150,232,255,${al.toFixed(3)})` : `rgba(255,255,255,${al.toFixed(3)})`; ctx.beginPath(); }
      if (q.y > BY1) continue;
      let x = left + q.x * p, y = floorY - (BY1 - q.y) * p, r = Math.max(.4, p * .44 * q.s);
      if (k > 0 && R && q.to !== undefined) { const st = R.w[q.to] * .68, ki = io3(seg(k, st, st + .32)); if (ki >= 1) continue; x = lerp(x, R.x0[q.to], ki); y = lerp(y, R.y0[q.to], ki); r *= 1 - ki * .55; }
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
    }
    if (cur >= 0) ctx.fill();
  }
  // the factory arm, on its way from the row to its one place: cobalt turning white, size and place eased together. It shares its grid with the fine dots, so in the last stretch the same dots change to the fine dots' sizes and shades, and nothing jumps.
  function paintBig(m, white, mix) {
    const a = armB.frames && armB.frames[armB.f]; if (!a || !slot || !tgt) return;
    const p = lerp(slot.p, tgt.p, m), x0 = lerp(slot.x, tgt.x, m), y0 = lerp(slot.y, tgt.y, m), n = a.length;
    if (mix > 0 && fineD) {
      if (!fineD.c0) { const c = new Map(), f = armB.frames[POSE]; for (let i = 0; i < f.length; i += 3) c.set(f[i] * 1000 + f[i + 1], f[i + 2]); fineD.forEach(q => { q.c0 = c.get(Math.floor(q.x) * 1000 + Math.floor(q.y)) || q.s; }); fineD.c0 = true; }
      let cur = -1;
      for (const q of fineD) {
        if (q.g !== cur) { if (cur >= 0) ctx.fill(); cur = q.g; const al = lerp(1, .55 + .45 * q.s, mix); ctx.fillStyle = q.acc ? `rgba(${Math.round(lerp(255, 150, mix))},${Math.round(lerp(255, 232, mix))},255,${al.toFixed(3)})` : `rgba(255,255,255,${al.toFixed(3)})`; ctx.beginPath(); }
        const x = q.x * p + x0, y = q.y * p + y0, r = Math.max(.4, lerp(p * .5 * q.c0, p * .44 * q.s, mix)); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      if (cur >= 0) ctx.fill();
      return;
    }
    for (let part = 0; part < 2; part++) { ctx.fillStyle = hMix(part ? H_DEEP : H_COB, H_WHITE, white); ctx.beginPath();
      for (let i = part ? a.n : 0, e = part ? n : a.n; i < e; i += 3) { const x = (a[i] + .5) * p + x0, y = (a[i + 1] + .5) * p + y0, r = Math.max(.4, p * .5 * a[i + 2]); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); }
      ctx.fill(); }
  }
  const RES_K = [1, .612, .51, .47, .43, .38, .335, .295, .235, .13, 0];
  // the picture eases toward the scroll position, so a mouse wheel's steps read as one motion; the page itself scrolls natively
  let sv = null, lastNow = 0, bgNow = '', fFrom = 0, pausedAt = 0;
  const setBg = c => { if (c !== bgNow) { bgNow = c; clip.style.backgroundColor = c; } };
  function paint(now) {
    const target = scroll(), dt = Math.min(64, now - lastNow || 16); lastNow = now;
    if (sv === null || reduce) sv = target; else { sv += (target - sv) * (1 - Math.exp(-dt / 85)); if (Math.abs(target - sv) < .0005) sv = target; else dirty = true; }
    const s = sv; lastS = s; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, FH);
    const dk = seg(s, ...T.dark), turn = seg(s, ...T.turn), res = seg(s, ...T.res), k = seg(s, ...T.gather), fly = seg(s, ...T.fly), fall = seg(s, ...T.fall), wash = seg(s, ...T.wash);

    // the row: the ground darkens, the eight others leave to the left, and the factory arm comes loose
    rowA = 1 - seg(dk, 0, .38);
    show(vis, rowA); vis.style.pointerEvents = rowA < 1 ? 'none' : '';
    { const ta = 1 - seg(dk, 0, .14); if (ta !== vis._ta) { vis._ta = ta; vis.classList.toggle('h-going', dk > 0); rowWords.forEach(el => { put(el, ta); }); } }   // the row's words go first, before the ground has moved
    { const lv = dk > 0 ? out3(seg(dk, 0, .38)) : 0; if (lv !== vis._lv) { vis._lv = lv; figs.forEach((f, i) => { if (f !== armFig) f.style.transform = lv ? `translateX(${(-lv * (64 + (8 - i) * 10)).toFixed(1)}px)` : ''; }); } }
    const isFree = dk > 0; if (isFree !== free) { free = isFree; armFig.classList.toggle('h-free', free); if (free) { fFrom = armB.f; pausedAt = now; } else { if (armB.t0) armB.t0 += now - pausedAt; armB.stale = true; } }
    // the arm turns to the pose the footage is waiting on, the short way round the loop, tied to the scroll
    if (free && armB.frames) { const n = armB.n, d = ((POSE - fFrom + n + n / 2) % n) - n / 2; armB.f = (fFrom + Math.round(d * soft(seg(dk, .05, .55))) + n) % n; if (armB.cv._rz) armB.cv._rz.f = armB.f; }

    // the ground: pale to ink as the arm grows, ink to the film's colour as the arm becomes its photo, then to white for the loan
    const inFilm = s >= T.turn[1];
    { const g0 = seg(dk, .08, 1), g = .7 * g0 + .3 * g0 * g0 * (3 - 2 * g0); setBg(inFilm ? '#fff' : g < .5 ? hMix(H_PALE, H_MID, g * 2) : hMix(H_MID, H_INK, g * 2 - 1)); }   // by way of blue, never through grey
    { const gw = seg(wash, .12, 1); put(gr, inFilm ? 1 - gw : soft(turn)); put(gs, .6 * seg(fly, .4, .72)); }   // the ground deepens under the chart, so its small labels stay readable at its brightest corner

    // the moat's words, in the same column as the film's words: they leave a third of the way through the Resolve, before the next words arrive
    { const t0 = T.turn[0] + .3 * (T.turn[1] - T.turn[0]), mw = beat(s, T.mIn[0], T.mIn[1], t0 - .1 * U, t0); show(moat, mw.a, mw.dy); }

    // the arm, from the row to its place. It is painted here until the Resolve starts.
    if (dk > 0 && turn <= 0) paintBig(soft(seg(dk, .25, 1)), seg(dk, .3, .46), seg(dk, .55, 1));

    // The Resolve, tied to the scroll: the fine dots become the photo, the photo holds, then it breaks back into the same dots.
    // It changes unevenly across its k, so this table, measured from the rendered frames, spreads what the eye sees evenly over its stretch
    const rq = (turn < 1 ? 1 - turn : res) * 10, ri = Math.min(9, Math.floor(rq)), rk = lerp(RES_K[ri], RES_K[ri + 1], rq - ri);
    if (turn > 0) { const left = cam.l, top = floorY - BY1 * cam.p, pw = 112 * cam.p, ph = 125 * cam.p;
      // the fine dots stay at full strength underneath while the Resolve's own dots, on the same spots, come up over them, so the arm never dims
      if (fineD && (rk < .1 || !photoOK) && k < 1) paintFine(1, k);
      if (rk > 0 && photoOK) { if (rk >= 1 || !window.FerraResolve || !fineFlat) { if (rk >= 1 || !fineFlat) ctx.drawImage(photo, left, top, pw, ph); }
        else { ctx.globalAlpha = seg(rk, 0, .1); window.FerraResolve.draw(ctx, { photo, x: left, y: top, w: pw, h: ph, dots: fineFlat, p: cam.p, k: rk, color: '#fff' }); ctx.globalAlpha = 1; } } }

    // the chart, the dots on it and the price: all of it goes as the gradient goes
    const axisA = seg(fly, .66, .74), chartA = 1 - seg(wash, 0, .16);
    if (axisA > 0 && chartA > 0) { ctx.fillStyle = `rgba(255,255,255,${(.42 * axisA * chartA).toFixed(3)})`; ctx.fillRect(lineL, axisY, W - lineL, 1); }
    let hitOK = false; const mx = X(age), my = Y(sale);
    if (!pt) pt = { x: mx, y: my, a: Y(ask) };
    pt.x += (mx - pt.x) * .22; pt.y += (my - pt.y) * .22; pt.a += (Y(ask) - pt.a) * .22; if (Math.abs(mx - pt.x) + Math.abs(my - pt.y) + Math.abs(Y(ask) - pt.a) > .3) dirty = true; else { pt.x = mx; pt.y = my; pt.a = Y(ask); }
    if (R && !labs) placeLabels();
    if (R && k > 0 && chartA > 0) {
      ctx.globalAlpha = chartA;
      const n = R.n;
      let arrivedN = 0;
      ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath();
      for (let j = 0; j < n; j++) {
        const x0 = R.x0[j], y0 = R.y0[j], gw = R.w[j] * .7; let x = x0, y = y0, r = R.r0[j] * soft(seg(k, gw, gw + .3));   // each listing swells in its turn, in a wave up the arm
        if (fly > 0) { const de = (1 - R.w[j]) * .46, t = io3(seg(fly, de, de + .24)), x1 = R.x1[j], y1 = R.y1[j];
          const cx = (x0 + x1) / 2 + R.o[j] * Math.abs(y1 - y0) * .35, cy = (y0 + y1) / 2 - Math.abs(x1 - x0) * .12 * (1 + R.o[j]);
          const u = 1 - t; x = u * u * x0 + 2 * u * t * cx + t * t * x1; y = u * u * y0 + 2 * u * t * cy + t * t * y1; r = lerp(R.r0[j], R.r1[j], t); }
        if (fall > 0) { const de = R.f[j] * .6, t = io3(seg(fall, de, de + .26)); if (t >= 1) { arrivedN++; R.x[j] = -99; R.r[j] = 0; continue; } x = lerp(x, pt.x, t); y = lerp(y, pt.y, t); r = lerp(r, 1, t); }
        R.x[j] = x; R.y[j] = y; R.r[j] = r;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
      hitOK = k > .9 && fall === 0;
      // the auction results, square so they are never mistaken for a listing
      const cu = seg(fly, .4, .72), mute = 1 - seg(fall, 0, .45);
      if (cu > 0 && mute > 0) { ctx.fillStyle = `rgba(14,22,38,${(cu * mute).toFixed(3)})`; const z = phone ? 5 : 7; D.aucs.forEach(q => ctx.fillRect(X(q[5]) - z / 2, Y(q[1]) - z / 2, z, z)); }
      // the line of typical prices
      if (cu > 0) { const end = cu * 30; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath();
        for (let a = 0; a <= end; a += .5) { const c0 = D.curve[Math.floor(a)], c1 = D.curve[Math.min(30, Math.ceil(a))], v = Math.exp(lerp(Math.log(c0), Math.log(c1), a - Math.floor(a))); a === 0 ? ctx.moveTo(X(a), Y(v)) : ctx.lineTo(X(a), Y(v)); }
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      // the thin lines from a label to what it names. The labels wait until the dots have landed, and go before the dots pour, so nothing ever crosses them
      const la = seg(fly, .7, .78) * (1 - seg(fall, 0, .1)); if (la > 0 && labs && labs.length) { ctx.strokeStyle = `rgba(255,255,255,${(.7 * la).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); labs.forEach(q => { ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); }); ctx.stroke(); }
      // whichever dot is open
      const hl = tip && tip.kind === 'l' ? tip.j : -1;
      if (hl >= 0 && R.r[hl] > 0) { ctx.fillStyle = 'rgb(150,232,255)'; ctx.beginPath(); ctx.arc(R.x[hl], R.y[hl], Math.max(R.r[hl] * 1.3, phone ? 4 : 4.5), 0, 6.2832); ctx.fill(); }
      // What is left at the end: the line, what sellers ask on it, a thin line down to what it would likely sell for, and two labels of one size in clean space
      const lk = seg(fall, .7, 1);
      if (lk > 0) { const rr = (phone ? 4 : 5) * lk; ctx.strokeStyle = `rgba(255,255,255,${(.85 * lk).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pt.x, pt.a); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(pt.x, pt.a, rr, 0, 6.2832); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,255,255,${lk.toFixed(3)})`; ctx.beginPath(); ctx.arc(pt.x, pt.a, rr, 0, 6.2832); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const lk2 = seg(fall, .86, 1), lm = fly >= .74 && fall < .06; if (lm !== lblC._on) { lblC._on = lm; lblC.classList.toggle('h-lon', lm); lblU.classList.toggle('h-lon', lm); } put(lblA, lk2 * chartA); put(lblS, lk2 * chartA);
      if (endDirty) placeEnds();
      if (ends) { const ee = q => { q.x += (q.tx - q.x) * .22; q.y += (q.ty - q.y) * .22; if (Math.abs(q.tx - q.x) + Math.abs(q.ty - q.y) > .3) dirty = true; else { q.x = q.tx; q.y = q.ty; } q.el.style.transform = `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px)`; }; ee(ends[0]); ee(ends[1]); }
      arrivedDot = Math.sqrt(arrivedN / n);
    }
    // the price dot: it grows as the dots arrive, then falls as the gradient fades white and lands as the first of the loan's dots
    if (R && fall > 0 && wash < .98) { const g = arrivedDot, r0 = 1.5 + g * (phone ? 4 : 5), f = seg(wash, .1, .98), yf = in2(f), xf = io3(f);
      ctx.fillStyle = hMix(H_WHITE, H_COB, seg(wash, .25, .7)); ctx.beginPath(); ctx.arc(lerp(pt.x, d1.x, xf), lerp(pt.y, d1.y, yf), lerp(r0, d1.r || 5, f), 0, 6.2832); ctx.fill(); }

    // The price comes down from what sellers ask as the dots pour into it, tied to the scroll, so the sentence always ends in a number. The controls wait until the dots have landed
    const ready = fall >= .86 || reduce;
    if (ready !== ticked) { ticked = ready; if (!reduce) { cancelAnimationFrame(tw); if (ready) { shown = sale; saleEl.textContent = fmt(sale); b3.classList.add('h-told'); } else b3.classList.remove('h-told'); } }
    if (!ready && s >= T.sw3[0]) { const tx = fmt(r100(lerp(ask, sale, soft(seg(fall, 0, .86))))); if (saleEl.textContent !== tx) saleEl.textContent = tx; }

    // the words. A swap takes 20vh: 10 out, 10 in.
    const sw = t => (t[0] + t[1]) / 2;
    const tm = T.turn[0] + .3 * (T.turn[1] - T.turn[0]), a0 = beat(s, tm, tm + .1 * U, T.sw1[0], sw(T.sw1)), a1 = beat(s, sw(T.sw1), T.sw1[1], T.sw2[0], sw(T.sw2)), a2 = beat(s, sw(T.sw2), T.sw2[1], T.sw3[0], sw(T.sw3)), a3 = beat(s, sw(T.sw3), T.sw3[1], T.wash[0], T.wash[0] + .16 * (T.wash[1] - T.wash[0]));
    show(b0, a0.a, a0.dy); show(b1, a1.a, a1.dy); show(b2, a2.a, a2.dy); put(b3, a3.a); b3.style.transform = a3.dy ? `translateY(${a3.dy.toFixed(1)}px)` : ''; b3.classList.toggle('h-on', a3.a > .4);
    show(axis, axisA * chartA);

    // the loan
    const lv = wash > 0 ? 'visible' : 'hidden'; if (loans.style.visibility !== lv) loans.style.visibility = lv;
    const land = s >= T.lo[0] + .12; if (land !== loans._land) { loans._land = land; loans.classList.toggle('h-land', land); }   // the words and the other 49 dots come once the ground has finished, so the two changes do not stack
    const land0 = wash >= .98; if (land0 !== loans._l0) { loans._l0 = land0; loans.classList.toggle('h-land0', land0); }   // the price dot has landed: the page's first dot takes over from the canvas
    hit = hitOK; if (tip && !hitOK) closeTip(); placeTip();
  }
  let arrivedDot = 0;

  // ---------------------------------------------------------------- the chart's labels sit in clean space, never on a dot or a line: each takes the free spot nearest the thing it names, joined to it by a thin line when it had to move away
  let labs = null;
  const placeLabels = () => { labs = []; const taken = [], pad = 7;
    const dots = []; for (let j = 0; j < R.n; j++) dots.push([R.x1[j], R.y1[j], R.r1[j]]);
    D.aucs.forEach(q => dots.push([X(q[5]), Y(q[1]), 5]));
    for (let a = 0; a <= 30; a += .25) { const c0 = D.curve[Math.floor(a)], c1 = D.curve[Math.min(30, Math.ceil(a))]; dots.push([X(a), Y(Math.exp(lerp(Math.log(c0), Math.log(c1), a - Math.floor(a)))), 2]); }
    const free = (x, y, w, h) => { for (const [dx, dy, r] of dots) if (dx > x - pad - r && dx < x + w + pad + r && dy > y - pad - r && dy < y + h + pad + r) return false; return !taken.some(t => x < t[0] + t[2] + 12 && x + w + 12 > t[0] && y < t[1] + t[3] + 12 && y + h + 12 > t[1]); };
    const put1 = (el, ax, ay, above) => { const w = el.offsetWidth, h = el.offsetHeight; if (!w) return; let best = null, bd = 1e12;
      const crosses = (x, y, w) => { const ex = clamp(ax, x, x + w), ey = ay < y ? y : y + h; return taken.some(t => { for (let q = 0; q <= 1; q += .04) { const px = lerp(ex, ax, q), py = lerp(ey, ay, q); if (px > t[0] - 6 && px < t[0] + t[2] + 6 && py > t[1] - 6 && py < t[1] + t[3] + 6) return true; } return false; }); };
      const right = Math.max(C.r, W - 10) - w;
      for (let y = C.t; y <= (above ? ay - h - 4 : C.b - h); y += 6) for (let x = right; x >= C.l; x -= 6) { const d = (x + w / 2 - ax) ** 2 + (y + h / 2 - ay) ** 2; if (d < bd && free(x, y, w, h) && !crosses(x, y, w)) { bd = d; best = [x, y]; } }
      if (!best) { if (above) return put1(el, ax, ay, false); el.style.visibility = 'hidden'; return; } el.style.visibility = ''; taken.push([best[0], best[1], w, h]); el.style.transform = `translate(${best[0].toFixed(1)}px,${best[1].toFixed(1)}px)`;
      const ex = clamp(ax, best[0], best[0] + w), ey = ay < best[1] ? best[1] - 3 : ay > best[1] + h ? best[1] + h + 3 : best[1] + h / 2;
      if (Math.hypot(ex - ax, ey - ay) > 10) labs.push([ex, ey, ax, ay]); };
    const last = D.aucs.reduce((m, q) => q[5] > m[5] ? q : m);
    put1(lblC, X(26), Y(D.curve[26]) - 2, true); put1(lblU, X(last[5]), Y(last[1])); };

  // the last two labels: what sellers ask and the likely sale. Each takes the free spot nearest its own marker, clear of the line, both markers and the other label, so any robot and any year keeps them clean. Same side and same left edge when there is room.
  const placeEnds = () => { endDirty = false; const tx = X(age), ay = Y(ask), sy = Y(sale), marks = [], pad = 7, hit = (x, y, w, h, list) => { for (const [dx, dy, r] of list) if (dx > x - pad - r && dx < x + w + pad + r && dy > y - pad - r && dy < y + h + pad + r) return true; return false; };
    for (let a = 0; a <= 30; a += .2) { const c0 = D.curve[Math.floor(a)], c1 = D.curve[Math.min(30, Math.ceil(a))]; marks.push([X(a), Y(Math.exp(lerp(Math.log(c0), Math.log(c1), a - Math.floor(a)))), 1]); }
    for (let y = ay; y <= sy; y += 5) marks.push([tx, y, 1]); marks.push([tx, ay, 6], [tx, sy, 7]);
    const lo = C.l + 2, hi = W - (phone ? 10 : 16), top = Math.max(phone ? 56 : 48, C.t - 8), bot = axisY - 8, taken = [];
    const one = (el, px, py) => { const w = el.offsetWidth, h = el.offsetHeight; let best = null, bd = 1e12;
      for (let y = top; y <= bot - h; y += 3) for (let x = lo; x <= hi - w; x += 3) { const d = (x - px) ** 2 + (y - py) ** 2 * 1.4; if (d >= bd) continue; if (hit(x, y, w, h, marks) || hit(x, y, w, h, taken)) continue; bd = d; best = [x, y]; }
      if (!best) best = [clamp(px, lo, hi - w), clamp(py, top, bot - h)];
      taken.push([best[0] + w / 2, best[1] + h / 2, Math.hypot(w, h) / 2 + 4]); return { el, tx: best[0], ty: best[1], x: best[0], y: best[1] }; };
    const hA = lblA.offsetHeight, hS = lblS.offsetHeight, a = one(lblA, tx + 14, ay - hA - 6), b = one(lblS, tx + 14, sy - hS / 2);
    if (ends) { a.x = ends[0].x; a.y = ends[0].y; b.x = ends[1].x; b.y = ends[1].y; } ends = [a, b]; };

  // ---------------------------------------------------------------- the listing label: hover or tap a dot
  let tip = null, hit = false, tipT = 0, overTip = false;
  const when = d => d ? (d.length > 4 ? d.replace(/^\d+ /, '') : d) : '';
  const openTip = (kind, j) => { if (tip && tip.kind === kind && tip.j === j) return; tip = { kind, j };
    const [bb, sp, aa] = tipEl.children;
    if (kind === 'l') { const q = D.rows[j]; bb.textContent = q[0]; sp.textContent = `For sale at ${fmt(q[2])}. Built in ${q[1]}. Listed on ${q[3]}.`; aa.href = q[4]; aa.innerHTML = 'See the listing &rarr;'; }
    else { const q = D.aucs[j]; bb.textContent = q[0]; sp.textContent = `Sold at auction for ${fmt(q[1])}${q[2] ? ` in ${when(q[2])}` : ''}. ${q[3]}.`; aa.href = q[4]; aa.innerHTML = 'See the sale &rarr;'; }
    tipEl.hidden = false; dirty = true; };
  const closeTip = () => { if (!tip) return; tip = null; tipEl.hidden = true; stage.style.cursor = ''; dirty = true; };
  const placeTip = () => { if (!tip) return; const xy = tip.kind === 'l' ? [R.x[tip.j], R.y[tip.j], R.r[tip.j]] : [X(D.aucs[tip.j][5]), Y(D.aucs[tip.j][1]), 5];
    if (!(xy[2] > 0)) return; const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = clamp(xy[0] + 10 - w, 12, W - w - 12), y = xy[1] - xy[2] - h - 12; if (y < 12 || xy[1] < H * .42) y = xy[1] + xy[2] + 12; tipEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; };
  const nearest = (x, y, reach) => { let best = -1, bd = 1e9, kind = 'l'; for (let j = 0; j < R.n; j++) { const dx = R.x[j] - x, dy = R.y[j] - y, d = Math.hypot(dx, dy) - R.r[j]; if (d < bd) { bd = d; best = j; } }
    if (lastS > T.fly[0] + (T.fly[1] - T.fly[0]) * .5 && lastS < T.fall[0]) D.aucs.forEach((q, j) => { const d = Math.hypot(X(q[5]) - x, Y(q[1]) - y) - 5; if (d < bd) { bd = d; best = j; kind = 'a'; } });
    return bd <= reach ? { kind, j: best } : null; };
  const stPos = ev => { const r = stage.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  if (fine) {
    stage.addEventListener('pointermove', ev => { if (!hit || !R || overTip) return; const p = stPos(ev), n = nearest(p.x, p.y, 8); stage.style.cursor = n ? 'pointer' : '';
      if (n) { clearTimeout(tipT); openTip(n.kind, n.j); } else if (tip) { clearTimeout(tipT); tipT = setTimeout(() => { if (!overTip) closeTip(); }, 260); } }, { passive: true });
    tipEl.addEventListener('pointerenter', () => { overTip = true; clearTimeout(tipT); }); tipEl.addEventListener('pointerleave', () => { overTip = false; });
  }
  stage.addEventListener('click', ev => { if (fine || !R || !hit || ev.target.closest('a,.h-tip,select')) return; const p = stPos(ev), n = nearest(p.x, p.y, 20); if (n) openTip(n.kind, n.j); else closeTip(); });
  // keyboard: tabbing into the box brings the box on screen
  b3.addEventListener('focusin', () => { if (scroll() < T.sw3[1]) scrollTo({ top: storyTop + T.box[0] * H, behavior: reduce ? 'auto' : 'smooth' }); });

  // ---------------------------------------------------------------- run
  layout();
  const arriveCheck = () => { const r = rawScroll(); if (!arrived && r > -.55) arrive(); if (r > -.8) fetchLate(); };
  arriveCheck();
  addEventListener('scroll', () => { dirty = true; arriveCheck(); }, { passive: true });
  let lw = 0, lh = 0, rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (stage.clientWidth === lw && Math.abs(stage.clientHeight - lh) < 120) return; lw = stage.clientWidth; lh = stage.clientHeight; layout(); }, 120); };
  lw = stage.clientWidth; lh = stage.clientHeight; addEventListener('resize', onResize); addEventListener('load', layout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) dirty = true; }, { rootMargin: '300px' }).observe(stage);
  const loop = now => { requestAnimationFrame(loop); if (!on) return; const moved = rowTick(now); if (moved && lastS > T.dark[0] && lastS < T.dark[1]) dirty = true; if (!dirty) return; dirty = false; paint(now); };
  requestAnimationFrame(loop);
})();

// The pinned band ends a screen after the next section reaches it, and the footer waits underneath, so the band is cut off at the top of the section passing over it.
(() => {
  const ink = document.querySelector('.h-ink'), day = document.querySelector('.h-day'); if (!ink || !day) return;
  const qh = ink.querySelector('.h-qh'); let was = -1; const paint = () => { const hh = innerHeight, dt = day.getBoundingClientRect().top, y = Math.max(0, hh - dt); if (y === was) return; was = y; ink.style.clipPath = y > 0 ? `inset(0 0 ${y.toFixed(0)}px 0)` : ''; const qb = qh.getBoundingClientRect().bottom; qh.style.opacity = dt < qb + 200 ? hSeg(dt, qb + 24, qb + 200).toFixed(3) : ''; };
  paint(); addEventListener('scroll', paint, { passive: true }); addEventListener('resize', () => { was = -1; paint(); });
})();

// What if a loan goes bad. The band is pinned and tied to the scroll: the arms light, the 35 and the 15 part, and they drain to what the middle auction sale would bring. Then the next section slides over. Reduced motion shows the finished picture.
(() => {
  const w = document.querySelector('.h-inkw'), sp = w && w.querySelector('#h-split'); if (!sp) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return sp.classList.add('h-dr');
  const f7 = [...sp.querySelectorAll('.h-f7 .h-fb canvas')], f3 = [...sp.querySelectorAll('.h-f3 .h-fb canvas:not(.h-cy)')], cy = [...sp.querySelectorAll('.h-f3 .h-cy')], sb = sp.querySelector('.h-sb'), s35 = sp.querySelector('.h-s35'), sd = sp.querySelector('.h-sd'), sx = sp.querySelector('.h-sx');
  const put = (el, a) => { const s = a.toFixed(3); if (el._a !== s) { el._a = s; el.style.opacity = s; } };
  let top = 0, H = 1, U = 1, was = null;
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { sp.classList.add('in-view'); io.disconnect(); } }, { threshold: .15 }).observe(sp);
  const layout = () => { H = innerHeight; U = innerWidth <= 720 ? .7 : .75; top = w.getBoundingClientRect().top + scrollY; was = null; paint(); };
  function paint() { const s = (scrollY - top) / H; if (s === was) return; was = s;
    const light = hSeg(s, 0, U), part = hSeg(s, U, 2 * U), dr = hSeg(s, 2 * U, 3 * U);
    const lit = k => { const d = k / 50 * .6; return hSeg(light, d, d + .4); };
    f7.forEach((c, k) => { const l = .13 + .87 * lit(k), dl = (34 - k) / 34 * .5, q = hSeg(dr, dl, dl + .5); put(c, k < 2 ? l : hLerp(l, k < 12 ? .46 : .13, q)); });
    f3.forEach((c, i) => { const l = .13 + .87 * lit(35 + i); put(c, l * (1 - part)); put(cy[i], l * part * (1 - .7 * dr)); });
    sb.style.setProperty('--sp', (1 - hIo3(part)).toFixed(3));
    put(s35, hSeg(part, .5, 1) * (1 - hSeg(dr, 0, .3))); put(sd, hSeg(dr, .7, 1)); put(sx, hSeg(part, .5, 1)); }
  layout(); addEventListener('scroll', paint, { passive: true }); addEventListener('resize', layout); addEventListener('load', layout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
