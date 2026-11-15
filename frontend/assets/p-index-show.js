// Robot Index, the show under the lookup (pages/robot_index.py auction() to finale(); styles in assets/p-index-show.css). Scenes 5 to 10 of design/ANIMATED-JOURNEY.md:
//   auction()  the robot rides onto the block, the asking bar stands, bids climb, the hammer falls and the bar drains to what auctions pay;
//   note()     the valuation note feeds out of a slot, a scan line reads the robot into its portrait, the curve draws, the stamp presses;
//   board()    each class's robot crosses the screen in its own lane and takes its row, the figures flipping in behind it;
//   thin()     classes with too few used prices, built only as far as their prices go;
//   drop()     every tested auction sale falls through the pegs into the slot for how far the estimate missed;
//   finale()   every block streams together into the reader's own answer.
// The look is terminal blocks: one cell grid (8 by 12, 6 by 10 on a phone), four shades of a cell (full, three quarters, half, a quarter) drawn as 2px squares, a clear
// ink margin round every figure. Canvases are drawn at one canvas pixel per CSS pixel and shown pixelated, so a phone paints a ninth of the pixels for the same picture.
// Speed rules: one path and one fill per shade, a repaint only when the picture changes, layout only on a real width change. Everything that builds is a plain function of
// the scroll position, so it runs backwards on the way up. The only clock is a robot's own film (12 frames a second, paused off screen). With reduced motion, or on a
// screen too short to pin, each scene stands finished in plain flow.
// Numbers: est() is the lookup's own formula (assets/p-index.js, pages/robot_index.py est()). The reader's robot is read from the lookup's controls, or from the address.
(() => {
  const dEl = document.getElementById('ri-data'), sEl = document.getElementById('ri-show'); if (!dEl || !sEl) return;
  const { L } = JSON.parse(dEl.textContent), S = JSON.parse(sEl.textContent);
  const $ = id => document.getElementById(id), Z = 1.2816, MIN_USED = S.min;
  const usd = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const pct = v => Math.round(v * 100) + '%';
  const plural = (n, one, many) => n.toLocaleString('en-US') + ' ' + (n === 1 ? one : (many || one + 's'));
  const ageTxt = a => a === 0 ? 'New' : `${a} year${a === 1 ? '' : 's'} old`;
  const byId = Object.fromEntries(L.models.map(m => [m.id, m]));
  const CLASS = { arm: 'Factory arm', cobot: 'Cobot', palletizer: 'Palletizer', amr: 'Warehouse mobile robot' };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v, ease = t => t * t * (3 - 2 * t), mix = (a, b, t) => a + (b - a) * t;
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = (a, b) => { let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
  const setS = (k, t) => document.querySelectorAll(`[data-s="${k}"]`).forEach(el => { if (el.textContent !== t) el.textContent = t; });
  const first = document.querySelector('.rs'); if (!first) return;

  // ------------------------------------------------------------ the numbers (the lookup's own formula) and the reader's robot
  function est(id, age) {
    const m = byId[id], f = L.fams[m.fam], se = m.se != null ? m.se : f.se;
    const ask = Math.exp(f.level + m.fe - f.b * age), s = Math.sqrt(f.sd * f.sd + se * se + Math.pow((age - f.am) * f.bse, 2)), likely = ask * L.share, w = Math.exp(Z * L.sd);
    return { age, ask, alo: ask * Math.exp(-Z * s), ahi: ask * Math.exp(Z * s), likely, llo: likely / w, lhi: likely * w, m, f };
  }
  const st = { id: L.default.id, age: L.now - L.default.year, hours: '', cond: L.default.cond };
  let E = est(st.id, st.age), ver = 0, lastHash = null;
  function readState() {
    const md = $('ri-md'), sl = $('ri-age'), h = new URLSearchParams(location.hash.slice(1)); let id = null, age = null;
    if (md && byId[md.value]) id = md.value; else if (byId[h.get('r')]) id = h.get('r');
    if (sl && sl.value !== '') age = Math.round(+sl.value); else if (+h.get('y')) age = L.now - +h.get('y');
    const hr = $('rs-hr') || $('ri-hr'), cd = $('rs-cd') || $('ri-cd');
    const hv = hr ? hr.value.replace(/[^0-9]/g, '') : '', hours = hv ? (+hv).toLocaleString('en-US') : '', cond = cd ? cd.value : st.cond;
    id = id || st.id; age = age == null || !(age >= 0 && age <= 60) ? st.age : age;
    if (id === st.id && age === st.age && hours === st.hours && cond === st.cond) return false;
    st.id = id; st.age = age; st.hours = hours; st.cond = cond; E = est(id, age); ver++; return true;
  }

  // ------------------------------------------------------------ the cell kit
  let CW = 8, LH = 12, HW = 4, HH = 6, PH = false;
  const COL = { sky: '#0fa9e8', white: '#ffffff', cob: '#2847ce', deep: '#1e339b', ink: '#0e1626', sig: getComputedStyle(first).getPropertyValue('--sig').trim() || '#0fa9e8' };
  const tiles = new Map();
  // a shade of a colour: 4 is the full cell, 3 three quarters of its 2px squares, 2 half (a checker), 1 a quarter
  function shade(ctx, key) {
    const kind = +key.slice(-1), col = COL[key.slice(0, -1)]; if (kind === 4) return col;
    const id = key + CW; let p = tiles.get(id);
    if (!p) { const c = document.createElement('canvas'); c.width = CW; c.height = LH; const x = c.getContext('2d'); x.fillStyle = col;
      for (let y = 0; y < LH; y += 2) for (let X = 0; X < CW; X += 2) { const a = (X >> 1) & 1, b = (y >> 1) & 1; if (kind === 3 ? !(a && b) : kind === 2 ? a === b : !a && !b) x.fillRect(X, y, 2, 2); }
      tiles.set(id, p = ctx.createPattern(c, 'repeat')); }
    return p;
  }
  // everything drawn goes through a pen: rects grouped by shade, one path and one fill each. The ink margins go down first. window.__rsRec keeps what was drawn, for the no-cuts check
  function pen(s) {
    const m = new Map([['ink4', new Path2D()]]), rec = window.__rsRec ? [] : null;
    return { r(key, x, y, w, h) { let p = m.get(key); if (!p) m.set(key, p = new Path2D()); p.rect(x, y, w, h); if (rec && key !== 'ink4') rec.push(x, y, w, h); },
      flush() { m.forEach((p, k) => { s.ctx.fillStyle = shade(s.ctx, k); s.ctx.fill(p); }); if (rec) s.rec = rec; } };
  }
  const sx = v => Math.round(v / CW) * CW, sy = v => Math.round(v / LH) * LH, qx = v => Math.round(v / HW) * HW, qy = v => Math.round(v / HH) * HH;

  // ---- the block figures: a 5 by 7 face, the comma and the point narrow (the comma hangs two rows under the line, so whatever stands under a figure leaves it room)
  const GL = { '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'], ',': ['00', '00', '00', '00', '00', '11', '11', '01', '10'],
    '.': ['0', '0', '0', '0', '0', '0', '1'], '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'], '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'], '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'] };
  const unitsOf = t => { let w = -1; for (const ch of t) w += GL[ch][0].length + 1; return w; };
  // the size ladder, in half cells: the largest that fits a box
  const LAD = [[2, 1], [3, 2], [4, 3], [5, 3], [6, 4], [8, 5], [9, 6], [10, 7], [12, 8], [14, 9], [16, 11], [20, 13], [24, 16], [28, 19]];
  function fitU(t, maxW, maxH) { const u = unitsOf(t); let k = 0; for (let i = 0; i < LAD.length; i++) if (u * LAD[i][0] * HW <= maxW && 7 * LAD[i][1] * HH <= maxH) k = i; const uw = LAD[k][0] * HW, uh = LAD[k][1] * HH; return { uw, uh, w: u * uw, h: 7 * uh, a: LAD[k][0], b: LAD[k][1] }; }
  // t drawn with its right edge at xr. alt(i, ch) may swap a figure for another while it is still flipping
  function figures(P, t, xr, y, U, key, alt) {
    let x = xr - unitsOf(t) * U.uw, i = 0;
    for (const ch0 of t) { const ch = alt ? alt(i, ch0) : ch0, g = GL[ch0], d = GL[ch] || g; i++;
      if (ch !== null) for (let r = 0; r < d.length; r++) { const row = d[r]; let c = 0; while (c < row.length) { if (row[c] !== '1') { c++; continue; } let e2 = c + 1; while (e2 < row.length && row[e2] === '1') e2++; P.r(key, x + c * U.uw, y + r * U.uh, (e2 - c) * U.uw, U.uh); c = e2; } }
      x += (g[0].length + 1) * U.uw; }
  }

  // ---- the robots: a film's frame in 16 shades, at half its grid for a class robot and at its full grid for the reader's own (pages/robot_index.py _film_still() packs
  // frame 0 the same way), then sampled down to cells
  const FILM = {};
  function film(k) {
    if (FILM[k]) return FILM[k]; const s = S.films[k]; if (!s) return null; const d = new Uint8Array(s.w * s.h); for (let i = 0; i < d.length; i++) d[i] = parseInt(s.d[i], 16);
    const bb = s.bb || [0, 0, s.w, s.h];
    return (FILM[k] = { src: s.src, key: s.key, st: s.st || 2, w: s.w, h: s.h, bx: bb[0], by: bb[1], bw: Math.max(1, bb[2] - bb[0]), bh: Math.max(1, bb[3] - bb[1]), f0: d, fr: [], gc: new Map(), n: 1, fps: 12, state: 0 });
  }
  const filmFor = (cls, fam) => film(S.fams[fam] || '') || film(cls) || film('arm');
  let loads = 0;
  function load(f) {
    if (!f || f.state || reduce) return; f.state = 1;
    setTimeout(() => { const tag = document.createElement('script'); tag.src = f.src;
      tag.onload = () => { const m = (window.FERRA_SEQ || {})[f.key]; if (!m) return; const im = new Image();
        im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); f.x = x; f.m = m; f.n = m.frames; f.fps = m.fps || 12; f.state = 2; };
        im.src = m.src; };
      document.head.appendChild(tag); }, 60 * loads++);   // robots start 60ms apart
  }
  function gray(f, i) {
    if (!i || f.state !== 2) return f.f0; let g = f.fr[i]; if (g) return g;
    const m = f.m, per = m.per || 8, W = m.w, q = f.st, n = q * q, px = f.x.getImageData((i % per) * W, Math.floor(i / per) * m.h, W, m.h).data; g = new Uint8Array(f.w * f.h);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { let s = 0; for (let b = 0; b < q; b++) for (let a = 0; a < q; a++) s += px[((q * y + b) * W + q * x + a) * 4]; g[y * f.w + x] = Math.min(15, Math.floor((s * 15 + 126 * n) / (252 * n))); }
    return (f.fr[i] = g);
  }
  let clock = 0;   // twelfths of a second
  const frameOf = f => f.state === 2 ? clock % f.n : 0;
  // a frame as cells: cols across, each cell the shade of the film under it (0 none, 1 to 4 a quarter to full)
  function grid(f, i, cols) {
    const key = cols + ':' + i; let G = f.gc.get(key); if (G) return G;
    const g = gray(f, i), kx = f.bw / cols, ky = kx * LH / CW, rows = Math.max(1, Math.round(f.bh / ky)), k = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const x0 = f.bx + Math.floor(x * kx), x1 = Math.min(f.w, Math.max(x0 + 1, f.bx + Math.floor((x + 1) * kx))), y0 = f.by + Math.floor(y * ky), y1 = Math.min(f.h, Math.max(y0 + 1, f.by + Math.floor((y + 1) * ky))); let n = 0, m = 0, t = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const v = g[yy * f.w + xx]; n++; if (v) { m++; t += v; } }
      const mean = m ? t / m : 0; k[y * cols + x] = !n || m / n < .34 ? 0 : mean >= 11 ? 4 : mean >= 7.5 ? 3 : mean >= 4.5 ? 2 : 1; }
    if (f.gc.size > 400) f.gc.clear();
    G = { w: cols, h: rows, k }; f.gc.set(key, G); return G;
  }
  const colsFor = (f, maxW, maxH, u, v) => Math.max(8, Math.min(Math.floor(maxW / u), Math.floor(Math.floor(maxH / v) * (LH / CW) * f.bw / f.bh), 64, f.bw));
  // a robot standing with its feet on y: cells of u by v, an ink margin round it, runs of one shade drawn as one rect. tone(kind) may remap a shade
  function drawBot(P, G, x, base, u, v, col, tone, rowFrom, rowTo) {
    const y = base - G.h * v, mx = Math.max(4, u), my = Math.max(4, v / 2), r0 = rowFrom || 0, r1 = rowTo == null ? G.h : rowTo;
    for (let r = r0; r < r1; r++) { let c = 0; while (c < G.w) { const kd = G.k[r * G.w + c]; if (!kd) { c++; continue; } let e2 = c + 1; while (e2 < G.w && G.k[r * G.w + e2] === kd) e2++;
      P.r('ink4', x + c * u - mx, y + r * v - my, (e2 - c) * u + 2 * mx, v + 2 * my); const key = tone ? tone(kd, r, c) : col + kd; if (key) P.r(key, x + c * u, y + r * v, (e2 - c) * u, v); c = e2; } }
  }

  // ---- the ground: a quiet screen of quarter and half cells, set once as a picture behind every scene
  function texture() {
    const C = 40, R = 30, c = document.createElement('canvas'); c.width = C * CW; c.height = R * LH; const x = c.getContext('2d'), rnd = rng(11), lt = new Path2D(), md = new Path2D();
    for (let y = 0; y < R; y++) for (let X = 0; X < C; X++) { const r = rnd(); if (r < .46) continue; (r < .93 ? lt : md).rect(X * CW, y * LH, CW, LH); }
    x.globalAlpha = .6; x.fillStyle = shade(x, 'deep1'); x.fill(lt); x.fillStyle = shade(x, 'deep2'); x.fill(md);
    document.documentElement.style.setProperty('--rs-tex', `url(${c.toDataURL()})`);
  }

  // ------------------------------------------------------------ the scenes
  const SC = [];
  const boxIn = (el, pin) => { const a = el.getBoundingClientRect(), b = pin.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, r: a.right - b.left, b: a.bottom - b.top }; };
  function scene(id, make) {
    const cv = $(id); if (!cv) return; const pin = cv.parentElement, run = pin.parentElement, sec = cv.closest('.rs');
    const s = { cv, pin, run, sec, ctx: cv.getContext('2d'), W: 0, H: 0, key: '', clock: false, films: [], near: false, rec: null };
    s.moving = !reduce && getComputedStyle(pin).position === 'sticky'; sec.classList.add('rs-on', s.moving ? 'rs-live' : 'rs-still');
    Object.assign(s, make(s)); SC.push(s); return s;
  }
  function lay(s) {
    s.W = s.pin.clientWidth; s.H = s.pin.clientHeight; if (!s.W || !s.H) return false;
    if (s.cv.width !== s.W || s.cv.height !== s.H) { s.cv.width = s.W; s.cv.height = s.H; }
    const hd = s.pin.querySelector('.rs-hd'); s.hd = hd ? boxIn(hd, s.pin) : { x: 20, y: 0, w: 0, h: 0, r: 20, b: 0 };
    s.x0 = sx(s.hd.x); s.x1 = sx(s.W - s.hd.x); s.span = s.run.offsetHeight - s.pin.offsetHeight; s.layout(); s.key = ''; return true;
  }
  // a caption set from its left edge, its right edge ('r') or its middle ('c')
  const cap = (el, x, y, how) => { if (!el) return; el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.transform = how === 'r' ? 'translateX(-100%)' : how === 'c' ? 'translateX(-50%)' : 'none'; el.style.textAlign = how === 'r' ? 'right' : how === 'c' ? 'center' : 'left'; };
  const on = (el, v) => { if (el && el.classList.contains('on') !== v) el.classList.toggle('on', v); };

  // ============================================================ 5. the auction
  function auction() {
    const ca = $('rs-auc-a'), cs = $('rs-auc-s'), cl = $('rs-auc-l'), ch = $('rs-auc-h'), sr = $('rs-auc-sr'); let A = null, said = -1, done = null;
    return scene('rs-auc-cv', s => ({ clock: true,
      layout() {
        // the page's own 12 columns: the bar stands in the last one and the figures end on the right edge of the one before it
        const { W, H, x0, x1, hd } = s, floor = sy(H - (PH ? 9 : 7) * LH), gut = PH ? 16 : 24, colW = (x1 - x0 - 11 * gut) / 12, barC = PH ? 8 : Math.max(8, Math.round(colW / CW)), barX = x1 - barC * CW;
        A = { floor, barC, barX, blockH: (PH ? 2 : 3) * LH };
        const askT = usd(est(st.id, 0).ahi);   // room for the longest asking figure this robot can show
        if (PH) {
          const ny = sy(hd.b + 2 * LH), ua = fitU(askT, x1 - x0, 4 * LH), ul = fitU('$00,000', x1 - x0, 8 * LH);
          A.ua = ua; A.ay = ny; A.ul = ul; A.ly = ny + ua.h + 2 * ua.uh + 4 * LH;
          A.barTop = sy(A.ly + ul.h + 2 * ul.uh + 4 * LH + 11 * LH); A.us = fitU('100%', 30 * CW, 4 * LH); A.sxr = barX + barC * CW; A.syFix = floor + LH;
          A.botW = barX - 3 * CW - x0 - 4 * CW; A.botH = floor - A.blockH - (A.ly + ul.h + 2 * ul.uh + 4 * LH);
          cap(ca, x0, A.ay + ua.h + 2 * ua.uh + 4); cap(cl, x0, A.ly + ul.h + 2 * ul.uh + 4); cap(cs, x0, A.syFix + 8);
        } else {
          A.barTop = sy(Math.max(H * .3, 21 * LH)); A.botH = floor - A.blockH - hd.b - 2 * LH; A.botW = Math.min(60 * CW, (barX - x0) * .46);
          const line = x1 - colW - gut, nx1 = qx(line), nw = nx1 - (x0 + A.botW + 10 * CW), ua = fitU(askT, nw, 5 * LH), ul = fitU('$00,000', nw, Math.min(18 * LH, H * .24)), us = fitU('100%', nw, 5 * LH);
          A.ua = ua; A.ax = nx1; A.ay = A.barTop; A.ul = ul; A.lx = nx1; A.us = us; A.sxr = nx1;
          const lvl = floor - L.share * (floor - A.barTop); A.syFix = Math.min(qy(lvl - us.h / 2), floor - us.h - 4 * LH);
          A.ly = qy((A.ay + ua.h + 3 * LH + A.syFix - 2 * LH) / 2 - ul.h / 2 - LH);
          cap(ca, line, A.ay + ua.h + 2 * ua.uh + 6, 'r'); cap(cl, line, A.ly + ul.h + 2 * ul.uh + 6, 'r'); cap(cs, line, A.syFix + us.h + 8, 'r');
        }
        // the hammer's own label sits over its head while it waits at rest, and leaves before it falls
        A.restY = sy(A.barTop - (PH ? 5 : 8) * LH - (PH ? 5 : 10) * LH); cap(ch, barX + barC * CW, A.restY - 26, 'r');
        A.barRows = Math.round((floor - A.barTop) / LH); A.shareRows = Math.max(1, Math.round(A.barRows * L.share));
      },
      draw(p) {
        const { W, H, x0, x1 } = s, { floor, barC, barX, barTop, barRows, shareRows, blockH } = A, P = pen(s);
        const pIn = ease(clamp01(p / .14)), pBid = ease(clamp01((p - .16) / .36)), pHam = clamp01((p - .5) / .09), pDr = clamp01((p - .6) / .32), struck = p >= .59;
        s.ctx.clearRect(0, 0, W, H);
        // the floor, the block and the robot riding onto it
        P.r('cob4', x0, floor, x1 - x0, 2);
        const f = filmFor(E.f.cls, E.m.fam), cols = colsFor(f, A.botW, A.botH, CW, LH), G = grid(f, frameOf(f), cols), bw = cols * CW, tx = x0 + 3 * CW, rx = sx(mix(-bw - 4 * CW, tx, pIn));
        const bx = rx - 3 * CW, bwid = bw + 6 * CW;
        P.r('ink4', bx - CW, floor - blockH - LH / 2, bwid + 2 * CW, blockH + LH / 2);
        P.r('cob3', bx, floor - blockH, bwid, blockH); P.r(struck && p < .64 ? 'white4' : 'sky4', bx, floor - blockH, bwid, LH / 2);
        drawBot(P, G, rx, floor - blockH, CW, LH, struck && p < .64 ? 'white' : 'sky');
        // the asking bar: it rises with the robot, the bids fill it from the floor, and after the hammer the part above what auctions pay breaks off row by row
        const rise = Math.round(barRows * pIn), bid = Math.round(shareRows * pBid), K = barRows - shareRows, bwd = barC * CW;
        P.r('ink4', barX - CW, floor - rise * LH - LH / 2, bwd + 2 * CW, rise * LH + LH / 2);
        const gone = pDr * 1.25 * K;   // rows from the top that have left
        for (let j = 0; j < rise; j++) { const y = floor - (j + 1) * LH, top = barRows - 1 - j;
          if (j < bid) P.r('sky4', barX, y, bwd, LH); else if (j < shareRows || !struck || top >= gone) P.r(struck && j >= shareRows && p < .64 ? 'white3' : 'cob2', barX, y, bwd, LH); else P.r('sig1', barX, y, bwd, LH); }
        if (struck && pDr < 1) for (let top = 0; top < K; top++) { const y0 = barTop + top * LH; if (top >= gone) break;
          for (let c = 0; c < barC; c++) { const t = (gone - top - hash(top, c) * 2.5) / (K * .28); if (t <= 0 || t >= 1) continue;
            const y = qy(y0 + t * t * (floor - y0 - LH)), x = barX + c * CW + sx((hash(c, top) - .5) * 5 * CW * t); if (y < floor - LH) P.r(t > .8 ? 'sig2' : 'sig4', x, y, CW, LH); } }
        // the hammer: a head as wide as the bar on a handle that runs off the edge; it waits above, falls on the bar and springs back a little
        const hh = (PH ? 5 : 8) * LH, restY = barTop - hh - (PH ? 5 : 10) * LH, hy = sy(p < .5 ? restY : p < .59 ? mix(restY, barTop - hh, pHam * pHam) : mix(barTop - hh, barTop - hh - 3 * LH, Math.sin(Math.min(1, pDr / .14) * Math.PI / 2)));
        const hx = barX - CW + sx((1 - pIn) * (W - barX + 2 * CW)), hw = bwd + 2 * CW, nk = (PH ? 1 : 2) * LH;   // the hammer slides in from the edge with the robot, so nothing waits on an empty block
        if (hx < W) { P.r('ink4', hx - CW, hy - LH / 2, W - hx + CW, hh + LH);
          P.r('white4', hx, hy, hw, hh); P.r('sky4', hx, hy + LH, hw, LH); P.r('sky4', hx, hy + hh - 2 * LH, hw, LH); if (W - hx - hw > 0) P.r('white3', hx + hw, hy + (hh - nk) / 2, W - hx - hw, nk); }
        // the figures: asking counts up as the bar rises, the bids count up to the likely auction price, and the share counts down from all of it as the bar drains
        const round = v => Math.floor(v / 100 + .5) * 100, askT = usd(round(E.ask * pIn)), likT = usd(round(E.likely * pBid)), shT = Math.round(100 - (100 - L.share * 100) * pDr) + '%';
        const plate = (xr, y, t, U) => P.r('ink4', xr - unitsOf(t) * U.uw - CW, y - LH / 2, unitsOf(t) * U.uw + 2 * CW, U.h + 2 * U.uh + LH);
        const axr = PH ? x0 + unitsOf(askT) * A.ua.uw : A.ax, lxr = PH ? x0 + unitsOf(likT) * A.ul.uw : A.lx;
        // a figure stands only once its part of the story has begun: no $0 on an empty block
        if (pIn > 0) { plate(axr, A.ay, askT, A.ua); figures(P, askT, axr, A.ay, A.ua, 'white4'); }
        if (pBid > 0) { plate(lxr, A.ly, likT, A.ul); figures(P, likT, lxr, A.ly, A.ul, 'sky4'); }
        if (struck) { plate(A.sxr, A.syFix, shT, A.us); figures(P, shT, A.sxr, A.syFix, A.us, pDr < 1 ? 'white4' : 'sky4'); }
        P.flush();
        // while the bids climb the figure is the highest bid so far; it takes the name likely auction price only once it reaches it, so every stop reads true
        const fin = pBid >= 1; if (done !== fin) { done = fin; if (cl) cl.textContent = fin ? 'Likely auction price' : 'Highest bid'; }
        on(ca, pIn >= 1); on(cl, p >= .16); on(cs, struck); on(ch, pIn >= 1 && p < .5);
        if (said !== ver) { said = ver; s.cv.setAttribute('aria-label', `An auction. The asking estimate, ${usd(E.ask)}, stands as a tall bar. Bids climb to the likely auction price, ${usd(E.likely)}, which is ${pct(L.share)} of asking, and the rest of the bar falls away.`);
          if (sr) sr.innerHTML = `<li>Asking estimate ${usd(E.ask)}</li><li>What auctions pay ${pct(L.share)}</li><li>Likely auction price ${usd(E.likely)}</li>`; }
      },
      wake() { load(filmFor(E.f.cls, E.m.fam)); } }));
  }

  // ============================================================ 6. the valuation note
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = () => { try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, x.value])); return `${+p.day} ${MON[+p.month - 1]} ${p.year}`; } catch (x) { return ''; } };
  const askWhy = (e, year) => { const { m, f } = e;
    if (m.any) return `Any ${f.label} built ${year}, from ${plural(f.n, 'listing')}`;
    if (m.own && m.fit >= MIN_USED) return `A ${m.label} built ${year}, from ${plural(m.fit, 'listing')}`;
    if (m.own) return `Thin data: ${plural(m.fit, 'listing')} of this model, leaning on ${f.n.toLocaleString('en-US')} ${f.label} listings`;
    return `Thin data: ${plural(m.fit, 'listing')} of this model, so it takes the ${f.label} level from ${plural(f.n, 'listing')}`; };
  const shareNote = f => `Median of ${L.nSales} factory arm auction sales from ${L.nLots} lots, matched to listings` + (L.saleCls.includes(f.cls) ? '' : '; cobots take the same share');
  // the six-year curve, drawn at the width it is shown at so its labels stay their real size on a phone
  function curveSVG(rows, W) {
    const H = Math.round(W * 230 / 520), l = 56, r = 96, t = 14, b = 34, top = Math.max(...rows.map(p => p.hi)) * 1.04;
    const step = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000].find(q => top / q <= 4) || 100000;
    const X = k => l + (W - l - r) * k / 6, Y = v => t + (H - t - b) * (1 - v / top), ln = f => rows.map((p, i) => `${i ? 'L' : 'M'}${X(p.k).toFixed(1)} ${Y(f(p)).toFixed(1)}`).join('');
    let g = ''; for (let v = 0; v <= top; v += step) g += `<line x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#e5e9f1"/><text x="${l - 8}" y="${(Y(v) + 5).toFixed(1)}" text-anchor="end" class="ax">${v ? '$' + (v / 1000) + 'k' : '$0'}</text>`;
    rows.forEach(p => { if (p.k % 2 === 0) g += `<text x="${X(p.k).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="ax">${p.k === 0 ? 'Now' : p.year}</text>`; });
    const band = `<path class="band" d="${ln(p => p.hi)}${rows.slice().reverse().map(p => `L${X(p.k).toFixed(1)} ${Y(p.lo).toFixed(1)}`).join('')}Z" fill="rgba(40,71,206,.1)"/>`;
    const e = rows[6], s0 = rows[0];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Likely auction price falls from ${usd(s0.likely)} now to ${usd(e.likely)} in ${e.year}">${g}${band}<path class="ln" pathLength="1" d="${ln(p => p.likely)}" fill="none" stroke="#2847ce" stroke-width="2.5"/>`
      + `<circle cx="${X(0)}" cy="${Y(s0.likely).toFixed(1)}" r="4.5" fill="#2847ce"/><g class="end"><circle cx="${X(6)}" cy="${Y(e.likely).toFixed(1)}" r="4.5" fill="#fff" stroke="#2847ce" stroke-width="2"/>`
      + `<text x="${X(6) + 12}" y="${(Y(e.likely) - 2).toFixed(1)}" class="lb">${usd(e.likely)}</text><text x="${X(6) + 12}" y="${(Y(e.likely) + 16).toFixed(1)}" class="ax">likely</text></g></svg>`;
  }
  let noteView = null, drawPortrait = null;
  function words() {
    const a = st.age, y = L.now - a, { m, f } = E, thin = m.fit < MIN_USED && !m.any;
    setS('today', today()); setS('title', `${m.label}, built ${y}.`); setS('sub', `Likely auction price ${usd(E.likely)}, from public listings and auction results.`);
    setS('cls', CLASS[f.cls] || 'Robot'); setS('age', ageTxt(a)); setS('hours', st.hours ? `${st.hours}, as entered` : 'Not given'); setS('cond', st.cond === 'Not given' ? 'Not given' : `${st.cond}, as entered`);
    setS('askwhy', askWhy(E, y)); setS('ask', usd(E.ask)); setS('sharewhy2', shareNote(f)); setS('likely', usd(E.likely)); setS('lrange2', `${usd(E.llo)} to ${usd(E.lhi)}`); setS('arange', `${usd(E.alo)} to ${usd(E.ahi)}`);
    const rows = []; for (let k = 0; k <= 6; k++) { const q = Math.exp(-f.b * k); rows.push({ k, year: L.now + k, likely: E.likely * q, lo: E.llo * q, hi: E.lhi * q });
      setS('y' + k, k ? String(L.now + k) : 'Now'); setS('a' + k, String(a + k)); setS('l' + k, usd(E.likely * q)); setS('r' + k, `${usd(E.llo * q)} to ${usd(E.lhi * q)}`); }
    setS('cfound', `${m.any ? f.label : m.short} listings found`); setS('nfound', m.n.toLocaleString('en-US')); setS('npriced', m.priced.toLocaleString('en-US'));
    setS('cfit', thin ? 'in the estimate, thin data' : 'in the estimate'); setS('nfit', m.fit.toLocaleString('en-US'));
    const tr = document.querySelector('[data-s-row="thin"]'); if (tr) tr.classList.toggle('thin', thin);
    setS('cfam', `${f.label} listings setting the level`); setS('nfam', f.n.toLocaleString('en-US')); setS('nsell', f.sellers.toLocaleString('en-US')); setS('srcs', f.src.map(([k, v]) => `${k} ${v}`).join(', '));
    const cv = $('rs-curve'); if (cv) { const W = Math.max(280, Math.min(560, Math.round(cv.clientWidth || 520))); cv.innerHTML = curveSVG(rows, W); }
    const fin = $('rs-fin-cv'); if (fin) fin.setAttribute('aria-label', `Likely auction price ${usd(E.likely)}`);
    if (drawPortrait) drawPortrait(); if (noteView) noteView.key = '';
  }
  function note() {
    const wrap = $('rs-paperw'), paper = $('rs-paper'), port = $('rs-port'), slot = $('rs-slot'), stamp = $('rs-stamp'), sec = wrap && wrap.closest('.rs'); if (!wrap || !paper) return;
    const live = !reduce; sec.classList.add('rs-on', live ? 'rs-live' : 'rs-still');
    const scanEl = $('rs-scan');
    // the portrait: the reader's robot in ink on the paper, drawn whole whenever the robot changes (so the note prints whole whatever the page was doing)
    drawPortrait = () => { if (!port) return; const h = PH ? 240 : 440, fl = filmFor(E.f.cls, E.m.fam), cols = colsFor(fl, PH ? 330 : 1000, h, HW, HH), G = grid(fl, 0, cols), w = cols * HW, hh = G.h * HH;
      if (port.width !== w || port.height !== hh) { port.width = w; port.height = hh; } const s2 = { ctx: port.getContext('2d') }, P = pen(s2); s2.ctx.clearRect(0, 0, w, hh);
      for (let r2 = 0; r2 < G.h; r2++) { let c = 0; while (c < G.w) { const kd = G.k[r2 * G.w + c]; if (!kd) { c++; continue; } let e2 = c + 1; while (e2 < G.w && G.k[r2 * G.w + e2] === kd) e2++; P.r(kd === 4 ? 'cob2' : kd === 3 ? 'cob3' : kd === 2 ? 'cob4' : 'deep4', c * HW, r2 * HH, (e2 - c) * HW, HH); c = e2; } }
      P.flush(); };
    drawPortrait();
    const cover = $('rs-cover'), curve = $('rs-curve'), rel = el => { const a = el.getBoundingClientRect(), b = paper.getBoundingClientRect(); return [a.top - b.top, a.height]; };
    const v = noteView = { key: '', H: 0, printing: false, near: false, rec: null, pt: [0, 1], cu: [0, 1],
      layout() { drawPortrait(); v.H = paper.offsetHeight; v.key = ''; if (stamp) { const q = rel(paper.querySelector('.sn-h')); v.stampAt = q[0] + q[1] + 90; } if (port) v.pt = rel(port); if (curve) { v.cu = rel(curve); if (curve.firstChild && Math.abs((curve.clientWidth || 0) - (+curve.dataset.w || 0)) > 1) { curve.dataset.w = curve.clientWidth; words(); } } },
      tick() {
        if (!v.H) v.layout(); const r = wrap.getBoundingClientRect(), vh = innerHeight; if (!v.printing && (r.bottom < -200 || r.top > vh + 200)) return;
        // the note prints from its top: the print head holds one line of the screen, four fifths of the way down, and the paper rises out from under it as the page scrolls
        const f = !live || v.printing ? 1 : clamp01((vh * .8 - r.top) / Math.max(1, v.H)), key = f.toFixed(4) + ':' + ver + ':' + CW; if (key === v.key) return; v.key = key;
        const edge = f * v.H; if (cover) { cover.style.transform = `translateY(${Math.round(edge)}px)`; cover.classList.toggle('off', f >= 1); }
        // the head reads the robot into the portrait as it passes, the curve draws behind it, and the stamp presses once the top of the note is out
        const scan = f >= 1 ? 1 : clamp01((edge - v.pt[0]) / (v.pt[1] * 2.2)), draw = f >= 1 ? 1 : clamp01((edge - v.cu[0]) / (v.cu[1] * 2)), ln = paper.querySelector('.sn-cv .ln'), band = paper.querySelector('.sn-cv .band'), end = paper.querySelector('.sn-cv .end');
        if (ln) { ln.style.strokeDasharray = '1'; ln.style.strokeDashoffset = String(1 - draw); } if (band) band.style.opacity = draw >= 1 ? '1' : '0'; if (end) on(end, draw >= 1); on(stamp, f >= 1 || edge >= v.stampAt);
        // the slot the paper comes out of, with a print head that runs along it as the paper feeds
        if (slot) { const w = slot.clientWidth, h = slot.clientHeight; if (slot.width !== w || slot.height !== h) { slot.width = w; slot.height = h; } const s2 = { ctx: slot.getContext('2d') }, P = pen(s2), cols = Math.floor(w / CW);
          s2.ctx.clearRect(0, 0, w, h); P.r('ink4', 0, 0, w, h); P.r('cob3', 0, 0, cols * CW, LH); P.r('cob2', 0, LH, cols * CW, LH); P.r('deep4', CW, 2 * LH, (cols - 2) * CW, LH / 2);
          if (f < 1) P.r('sky4', sx(mix(2 * CW, (cols - 5) * CW, (f * 9) % 1)), LH, 3 * CW, LH); P.flush(); }
        if (scanEl) { scanEl.style.transform = `translateY(${(scan * 100).toFixed(1)}%)`; scanEl.classList.toggle('off', scan >= 1); }
      } };
    const pr = $('rs-print'); if (pr) pr.addEventListener('click', () => window.print());
    const whole = yes => { v.printing = yes; v.key = ''; v.tick(); };
    addEventListener('beforeprint', () => whole(true)); addEventListener('afterprint', () => whole(false));
    try { matchMedia('print').addEventListener('change', e => whole(e.matches)); } catch (x) {}
  }

  // ============================================================ 7. the parade and the board
  function board() {
    const list = $('rs-rows'); if (!list) return; let R = [], said = -1;
    const q = document.querySelector('.rs-q'); if (q) { const Q = JSON.parse(q.dataset.q), sel = $('rs-qc'), out = $('rs-qs'), cp = $('rs-cp'); let t = 0;
      if (sel) sel.addEventListener('change', () => { out.textContent = Q[sel.value]; });
      if (cp) cp.addEventListener('click', () => { const done = () => { cp.textContent = 'Copied'; clearTimeout(t); t = setTimeout(() => { cp.textContent = 'Copy the quote'; }, 1600); }; try { navigator.clipboard.writeText(out.textContent).then(done, () => {}); } catch (x) {} }); }
    const rowFilm = cls => film(cls) || film('arm');
    return scene('rs-brd-cv', s => ({ clock: true,
      layout() {
        R = [...list.children].map((li, i) => { const dim = !!li.dataset.thin, slot = boxIn(li.querySelector('.rs-slot'), s.pin), row = boxIn(li, s.pin), cls = li.dataset.cls, f = rowFilm(cls);
          const figs = ['.rs-dg', '.rs-lv', '.rs-ch'].map((c, k) => { const el = li.querySelector(c); if (!el || !el.offsetWidth) return null; const b = boxIn(el, s.pin), t = el.dataset.t, U = fitU(t, b.w, Math.min(b.h - LH, k ? 5 * LH : 9 * LH)); return { t, U, xr: qx(b.r), y: qy(b.y + (b.h - U.h) / 2), key: dim ? (k ? 'white2' : 'sky2') : k ? 'white4' : 'sky4', dim }; }).filter(Boolean);
          const bh = slot.h - LH, cols = colsFor(f, slot.w - 3 * HW, bh, HW, HH);
          return { li, cls, f, i, cols, sx: qx(slot.x), tx: qx(slot.x + 3 * HW), base: qy(row.b - HH), top: row.y, bot: row.b, figs }; });
      },
      draw(p) {
        const { W, H, x0, x1 } = s, P = pen(s), n = R.length, travel = .5, gap = Math.min(.15, .3 / Math.max(1, n - 1)), lit = p >= travel + (n - 1) * gap + .14; s.ctx.clearRect(0, 0, W, H);
        for (const r of R) {
          // each robot runs its lane from the right edge to its place beside its name, and each figure waits until the robot has passed it. Once the robot is home its
          // figures go on flipping like a departure board and lock one by one, left to right. Last, the row of the reader's own robot lights up
          const land = travel + r.i * gap, t = ease(clamp01((p - r.i * gap) / travel)), G = grid(r.f, frameOf(r.f), r.cols), bw = r.cols * HW, x = qx(mix(W + 2 * CW, r.tx, t)), tail = x + bw + CW, home = t >= 1, mine = r.cls === E.f.cls;
          P.r('deep4', x0, qy(r.bot) - 2, x1 - x0, 2);
          drawBot(P, G, x, r.base, HW, HH, mine && lit ? 'white' : 'sky');
          if (mine && lit) P.r('sig4', r.sx, r.base - G.h * HH, 2 * HW, G.h * HH);
          for (const g of r.figs) { const U = g.U, left = g.xr - unitsOf(g.t) * U.uw; if (g.xr <= tail) continue; let cx = left; const xs = [], nd = g.t.replace(/[^0-9]/g, '').length; for (const ch of g.t) { xs.push(cx); cx += (GL[ch][0].length + 1) * U.uw; }
            P.r('ink4', Math.max(left, tail) - CW, g.y - LH / 2, g.xr - Math.max(left, tail) + 2 * CW, U.h + 2 * U.uh + LH); let k = 0;
            figures(P, g.t, g.xr, g.y, U, mine && lit ? (g.dim ? 'white2' : 'white4') : g.key, (i, ch) => { if (xs[i] < tail) return null; if (!/[0-9]/.test(ch)) return ch; const at = land + .02 + .1 * (k++ / Math.max(1, nd)); return p >= at ? ch : String((Math.floor(p * 110) * 7 + i * 3 + r.i * 5) % 10); }); }
        }
        P.flush();
        if (said !== ver) { said = ver; }
      },
      wake() { R.forEach(r => load(r.f)); } }));
  }

  // ============================================================ 8. thin data, under construction
  let thinView = null;
  function thin() {
    const cvs = [...document.querySelectorAll('canvas.rs-tc')]; if (!cvs.length) return; const sec = cvs[0].closest('.rs'), ul = cvs[0].closest('ul'); sec.classList.add('rs-on', reduce ? 'rs-still' : 'rs-live');
    thinView = { key: '', near: false,
      layout() { thinView.key = ''; },
      tick() {
        const r = ul.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -100 || r.top > vh + 100) return;
        const q = reduce ? 1 : clamp01((vh * .95 - r.top) / (vh * .6)), key = q.toFixed(3) + ':' + CW + ':' + cvs[0].clientWidth; if (key === thinView.key) return; thinView.key = key;
        cvs.forEach((cv, n) => { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
          const s2 = { ctx: cv.getContext('2d') }, P = pen(s2), f = film(cv.dataset.k) || film('arm'), cols = colsFor(f, w - 4 * HW, h - 3 * HH, HW, HH), G = grid(f, 0, cols), x = qx((w - cols * HW) / 2), base = qy(h - HH);
          // the outline goes up from the floor as the row scrolls in, one robot after another; then the part its used prices have earned is built solid
          const qq = clamp01(q * 1.3 - n * .1), up = Math.round(G.h * clamp01(qq / .7)), built = Math.round(G.h * (+cv.dataset.f) * clamp01((qq - .5) / .5));
          s2.ctx.clearRect(0, 0, w, h); P.r('cob4', 0, base, w, 2);
          const edge = (r2, c) => { const k = G.k, W2 = G.w; return !c || !r2 || c === W2 - 1 || r2 === G.h - 1 || !k[r2 * W2 + c - 1] || !k[r2 * W2 + c + 1] || !k[(r2 - 1) * W2 + c] || !k[(r2 + 1) * W2 + c]; };
          for (let r2 = G.h - up; r2 < G.h; r2++) for (let c = 0; c < G.w; c++) { if (!G.k[r2 * G.w + c]) continue; const X = x + c * HW, Y = base - (G.h - r2) * HH, solid = r2 >= G.h - built;
            P.r('ink4', X - HW, Y - HH / 2, 3 * HW, 2 * HH); P.r(solid ? 'sky' + G.k[r2 * G.w + c] : edge(r2, c) ? 'cob3' : 'deep1', X, Y, HW, HH); }
          if (up > 0 && up < G.h) P.r('white4', x, base - up * HH - 2, cols * HW, 2);
          P.flush(); });
      } };
  }

  // ============================================================ 9. the drop test
  function drop() {
    const cLo = $('rs-drop-lo'), cOk = $('rs-drop-ok'), cHi = $('rs-drop-hi'), D = S.drop, N = D.length, goal = S.goal; let B = null;
    return scene('rs-drop-cv', s => ({
      layout() {
        const { W, H, x0, x1, hd } = s, bw = .1, lo = Math.max(-1, Math.floor(Math.min(...D.map(d => d[0])) * 10 + 1e-9) / 10), nb = Math.round((1 - lo) / bw) + 1;   // tenths from the lowest miss to +100%, and one slot for more
        const top = sy(hd.b + 2 * LH), floor = sy(H - (PH ? 8 : 7) * LH), room = x1 - x0, cell = Math.max(2 * HW, Math.min((PH ? 5 : 8) * CW, Math.floor(room / nb / HW) * HW));
        const width = nb * cell, bx = x0, slotOf = e => Math.min(nb - 1, Math.max(0, Math.floor((e - lo) / bw + 1e-9))), zero = (0 - lo) / bw;
        const count = new Array(nb).fill(0), balls = D.map(([e, cls], i) => { const sl = slotOf(e); return { e, cls, sl, k: count[sl]++, in: Math.abs(e) <= goal + 1e-9, i }; }), most = Math.max(...count);
        const pegRows = PH ? 4 : 5, pegTop = top + 3 * LH, pegBot = pegTop + pegRows * 2 * LH, bh = [3 * LH, 2 * LH, 3 * HH, LH, HH].find(h => most * h <= (floor - pegBot) * .86) || HH;
        B = { lo, bw, nb, cell, bx, width, top, floor, zero, balls, pegRows, pegTop, pegBot, bh, g0: Math.round((-goal - lo) / bw), g1: Math.round((goal - lo) / bw) };
        cap(cOk, bx + (B.g0 + B.g1) / 2 * cell, floor + 10, 'c'); cap(cLo, bx, floor + 10 + 26); cap(cHi, x1, floor + 10 + 26, 'r');
      },
      draw(p) {
        const { W, H, x1 } = s, { nb, cell, bx, width, top, floor, zero, balls, pegRows, pegTop, bh, g0, g1 } = B, P = pen(s), ballW = cell - (cell > 2 * CW ? CW : HW); s.ctx.clearRect(0, 0, W, H);
        P.r('ink4', bx, top - LH, x1 - bx, floor - top + LH + HH + 4);
        // the goal zone, the floor, the slot walls and the pegs
        P.r('cob1', bx + g0 * cell, pegTop, (g1 - g0) * cell, floor - pegTop);
        P.r('cob4', bx, floor, x1 - bx, 2); P.r('sky4', bx + g0 * cell, floor, (g1 - g0) * cell, HH);
        for (let i = 0; i <= nb; i++) P.r(i === g0 || i === g1 ? 'sky4' : 'cob3', bx + i * cell - (i === nb ? HW : 0), floor - (i === g0 || i === g1 ? 3 : 1) * LH, HW, (i === g0 || i === g1 ? 3 : 1) * LH);
        for (let r = 0; r < pegRows; r++) for (let i = 0; i <= nb; i++) { const x = bx + i * cell - (r % 2 ? cell / 2 : 0); if (x < bx || x > bx + width - HW) continue; P.r('cob4', qx(x), pegTop + r * 2 * LH, HW, HH); }
        // the sales: each falls in its turn from the chute over "no miss", knocks from peg to peg and stacks in its slot. Its place at any moment is a function of the scroll
        const mineCls = E.f.cls, x00 = bx + zero * cell - ballW / 2;
        P.r('white4', qx(x00 - CW), top, ballW + 2 * CW, HH);
        for (const b of balls) { const a = .03 + .72 * b.i / Math.max(1, balls.length - 1), t = clamp01((p - a) / .17); if (t <= 0) continue;
          const tx = bx + b.sl * cell + HW, land = floor - (b.k + 1) * bh;
          if (t >= 1) { P.r(b.in ? 'sky4' : 'white3', tx, land, ballW, bh - 2); continue; }
          const g = t * t * .75 + t * .25, y = mix(top + HH, land, g), hop = Math.sin(t * Math.PI * pegRows) * (1 - t) * cell * .5 * (hash(b.i, 3) < .5 ? -1 : 1);
          P.r(b.cls === mineCls ? 'sig4' : 'white4', qx(mix(x00, tx, ease(clamp01(t * 1.25))) + hop), qy(y), ballW, bh - 2); }
        P.flush(); on(cLo, true); on(cOk, true); on(cHi, true);
      } }));
  }

  // ============================================================ 10. the finale
  function finale() {
    let F = null, forT = '';
    return scene('rs-fin-cv', s => ({
      layout() { forT = ''; },
      draw(p) {
        const { W, H, x0, x1, hd } = s, t = usd(E.likely), P = pen(s); s.ctx.clearRect(0, 0, W, H);
        if (forT !== t + W) { forT = t + W;
          // the answer in the largest figures the screen holds, with room under them for the comma's tail and the floor line; each lit block is cut into pieces,
          // and each piece starts somewhere on the screen below the words
          const top = sy(hd.b + 3 * LH), bot = sy(H - 5 * LH), U = fitU(t, x1 - x0, (bot - top) * .7); U.b = Math.max(U.b, Math.min(Math.floor((bot - top) * .62 / 7 / HH), Math.floor(U.uw * 1.7 / HH))); U.uh = U.b * HH; U.h = 7 * U.uh; const left = qx((W - U.w) / 2), y0 = qy(top + Math.max(0, bot - top - U.h - 3 * U.uh) / 2), rnd = rng(23), parts = [];
          let lit = 0; for (const ch of t) for (const row of GL[ch]) for (const c of row) if (c === '1') lit++;
          let k = 1; while (lit * Math.ceil(U.a / k) * Math.ceil(U.b / k) > (PH ? 2600 : 6000)) k++;
          const nx = Math.ceil(U.a / k), ny = Math.ceil(U.b / k), pw = U.uw / nx, ph = U.uh / ny; let cx = left;
          for (const ch of t) { const g = GL[ch]; for (let r = 0; r < g.length; r++) for (let c = 0; c < g[r].length; c++) { if (g[r][c] !== '1') continue;
            for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) { const X = cx + c * U.uw + a * pw, Y = y0 + r * U.uh + b * ph; parts.push({ X, Y, sx: sx(rnd() * (W - CW)), sy: sy(top + rnd() * (H - top - LH)), d: rnd(), sw: (rnd() - .5) * 2 }); } }
            cx += (g[0].length + 1) * U.uw; }
          F = { parts, pw: Math.ceil(pw), ph: Math.ceil(ph), top, floor: Math.min(y0 + U.h + 3 * U.uh, H - 2 * LH) };
        }
        const { parts, pw, ph, top } = F; P.r('cob4', x0, F.floor, x1 - x0, HH);
        for (const q of parts) { const tt = ease(clamp01((p / .86 - q.d * .55) / .45));
          if (tt <= 0) { P.r('cob2', q.sx, q.sy, CW, LH); continue; }
          if (tt >= 1) { P.r('sky4', Math.round(q.X), Math.round(q.Y), pw, ph); continue; }
          const dx = q.X - q.sx, dy = q.Y - q.sy, swing = Math.sin(tt * Math.PI) * q.sw * .22, x = q.sx + dx * tt - dy * swing, y = Math.max(top, q.sy + dy * tt + dx * swing);
          P.r(tt > .7 ? 'sky4' : 'sky3', qx(x), qy(y), Math.round(mix(CW, pw, tt)), Math.round(mix(LH, ph, tt))); }
        P.flush();
      } }));
  }

  // ------------------------------------------------------------ run
  function metrics() { const ph = innerWidth < 700; if (ph === PH && tiles.size) return false; PH = ph; CW = ph ? 6 : 8; LH = ph ? 10 : 12; HW = CW / 2; HH = LH / 2; tiles.clear(); Object.values(FILM).forEach(f => f.gc.clear()); texture(); return true; }
  let queued = false;
  function tick() {
    queued = false; const vh = innerHeight;
    if (location.hash !== lastHash) { lastHash = location.hash; if (readState()) words(); }
    for (const s of SC) { const r = s.run.getBoundingClientRect(), vis = r.bottom > -40 && r.top < vh + 40; s.vis = vis;
      if (!s.near && r.top < vh * 2.5 && r.bottom > -vh) { s.near = true; if (s.wake) s.wake(); }
      if (!vis) continue; if (!s.W && !lay(s)) continue;
      const p = s.moving ? clamp01(-r.top / Math.max(1, s.span)) : 1, key = p.toFixed(4) + ':' + (s.clock ? clock : 0) + ':' + ver; if (key === s.key) continue; s.key = key; s.draw(p); }
    if (noteView) noteView.tick(); if (thinView) thinView.tick();
  }
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  const relay = () => { SC.forEach(s => { s.W = 0; }); if (noteView) noteView.layout(); if (thinView) thinView.layout(); ask(); };
  metrics(); readState(); words();
  auction(); note(); board(); thin(); drop(); finale();
  // the lookup's own script sets its controls in its own handlers, so read them once those have run, and once more after a pick's short burst
  const check = () => { if (readState()) { words(); if (SC[0] && SC[0].wake) SC[0].wake(); ask(); } };
  let late = 0; const changed = () => { requestAnimationFrame(check); clearTimeout(late); late = setTimeout(check, 700); };
  document.addEventListener('change', changed, true); document.addEventListener('input', changed, true);
  addEventListener('scroll', ask, { passive: true }); addEventListener('hashchange', ask);
  // a robot's own film: the one clock, stopped while no scene that shows a robot is on screen
  if (!reduce) setInterval(() => { if (document.hidden || !SC.some(s => s.clock && s.vis)) return; clock = Math.floor(performance.now() / 83.34); ask(); }, 84);
  let w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; metrics(); relay(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relay);
  window.__rs = { scenes: () => SC.map(s => ({ id: s.cv.id, rec: s.rec, box: s.cv.getBoundingClientRect().toJSON(), vis: s.vis })), state: () => ({ id: st.id, age: st.age, likely: E.likely, ask: E.ask }) };
  tick();
})();
