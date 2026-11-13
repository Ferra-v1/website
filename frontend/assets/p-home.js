// Home page behaviour, row by row from STORYBOARD.md. Runs after site.js. Three parts: the first film; the stage (the robot row, the moat and the price chapter, one pinned scene painted from the scroll position); and the navy band.
const hClamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, hSeg = (s, a, b) => hClamp((s - a) / (b - a)), hLerp = (a, b, t) => a + (b - a) * t, hIo3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, hOut3 = t => 1 - Math.pow(1 - t, 3), hSoft = t => .5 * t + .5 * t * t * (3 - 2 * t);
const hMix = (a, b, t) => `rgb(${Math.round(hLerp(a[0], b[0], t))},${Math.round(hLerp(a[1], b[1], t))},${Math.round(hLerp(a[2], b[2], t))})`;
const H_WHITE = [255, 255, 255], H_COB = [40, 71, 206], H_DEEP = [30, 51, 155];

// Settle: a picture tied to the scroll never freezes halfway. When the reader stops inside a stretch that changes the picture (a word swap, the dots turning into a photo, the arms lighting), the picture finishes that stretch on its own, in the direction the reader was going, in about a third of a second. It stays finished while the reader keeps going the same way, so it never runs back to meet a slow scroller. Scrolling the other way lets go. wins() returns the stretches as [start, end] in the scene's own scroll units; onIdle repaints.
const hSettle = (wins, onIdle) => {
  let lastY = scrollY, dir = 1, idle = false, latch = null, t = 0;
  addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) { const d = y > lastY ? 1 : -1; if (d !== dir) latch = null; dir = d; } lastY = y; idle = false; clearTimeout(t); t = setTimeout(() => { idle = true; onIdle(); }, 150); }, { passive: true });
  return raw => {
    if (latch && (raw >= latch[1] || raw <= latch[0])) latch = null;
    if (latch) return dir > 0 ? latch[1] : latch[0];
    if (!idle) return raw;
    for (const w of wins()) if (raw > w[0] + 1e-4 && raw < w[1] - 1e-4) { latch = w; return dir > 0 ? w[1] : w[0]; }
    return raw; };
};

// The words' real ink: the right edge of every line of text (and every control) inside an element, and the widest line of a heading. Hidden helper text (.sr) does not count.
const hInk = el => { let r = -1e9; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim() || n.parentElement.closest('.sr')) continue; const g = document.createRange(); g.selectNodeContents(n); for (const q of g.getClientRects()) if (q.width) r = Math.max(r, q.right); }
  el.querySelectorAll('select,.btn').forEach(c => { if (!c.closest('.sr')) r = Math.max(r, c.getBoundingClientRect().right); }); return r; };
const hLines = el => { const by = new Map(), w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) { if (!n.nodeValue.trim()) continue; const g = document.createRange(); g.selectNodeContents(n); for (const q of g.getClientRects()) { if (!q.width) continue; const k = Math.round((q.top + q.bottom) / 2 / 8); const o = by.get(k) || [1e9, -1e9]; by.set(k, [Math.min(o[0], q.left), Math.max(o[1], q.right)]); } } return Math.max(0, ...[...by.values()].map(v => v[1] - v[0])); };
// A heading is always at least as long as the line under it (desktop): the line under a marked heading wraps at the heading's longest line.
const hPairs = () => document.querySelectorAll('.page[data-page="index.html"] [data-pair]').forEach(h => { const p = h.nextElementSibling; if (!p || p.tagName !== 'P') return; p.style.maxWidth = ''; if (innerWidth <= 720) return; const w = hLines(h); if (w > 40) p.style.maxWidth = Math.floor(w) + 'px'; });
hPairs(); addEventListener('resize', hPairs); addEventListener('load', hPairs); if (document.fonts && document.fonts.ready) document.fonts.ready.then(hPairs);

// The first film scrolls away like any page, and rests once it has gone. Reduced motion: site.js stops the video and the poster stays.
(() => {
  const top = document.querySelector('.h-top'), v = top && top.querySelector('video'); if (!v) return;
  if (innerWidth > 720) v.poster = 'media/film/hero-poster.webp?v=e9364287f7';   // the markup names the phone cut's poster, so a phone fetches one picture
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let ready = false, playing = false, held = false; const pb = top.querySelector('[data-film-pause]');
  if (pb) pb.addEventListener('click', () => { held = v.paused; });   // site.js has already acted on the press, so the film's state is the reader's choice
  const go = () => { if (held) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const check = () => { const on = scrollY < top.clientHeight * 1.02; if (on !== playing) { playing = on; if (!ready) return; if (on) go(); else v.pause(); } };
  const start = () => { if (ready) return; ready = true; v.preload = 'auto'; if (playing) go(); };
  // the film waits until the row of robots under it has its files (they start as the page loads), so on a slow connection the next screen is not starved by a film already on its poster. The poster is the film's first frame, so the wait does not show. Twelve seconds at most
  addEventListener('ferra:row', start, { once: true }); setTimeout(start, 12000);
  addEventListener('scroll', check, { passive: true }); check();
})();

// The stage. One sticky box from the row of robots to the price. Every moment below is a function of s, how many screens the page has scrolled since the stage pinned, so scrolling back plays it backwards. Distances are the storyboard's.
(() => {
  const story = document.querySelector('.h-story'); if (!story) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = s => story.querySelector(s), stage = $('.h-stage'), gi = $('.h-gi'), gr = $('.h-gr'), gs = $('.h-gs'), cv = $('.h-cv'), ctx = cv.getContext('2d'), probe = $('.h-probe');
  const vis = $('.h-vis'), moat = $('.h-moat'), film = $('.h-film'), loans = document.querySelector('.h-loans'), dotsEl = loans.querySelector('.h-dots');
  const b0 = $('.h-b0'), b1 = $('.h-b1'), b2 = $('.h-b2'), b3 = $('.h-b3'), axis = $('.h-axis'), tipEl = $('.h-tip'), lblA = $('.h-pa'), lblS = $('.h-ps'), lblC = $('.h-cl'), lblU = $('.h-al');
  const clamp = hClamp, seg = hSeg, lerp = hLerp, io3 = hIo3, out3 = hOut3, in2 = t => t * t, soft = hSoft, wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------------------------------------------------------------- the timeline, in screens since the stage pinned. A change takes 65vh, or 55vh on a phone, and holds are short, so the story moves at about the pace of plain scrolling and never feels stuck (Praj, 2026-11-12, SPEED-END-CONDITION.md 2b); a swap of words takes 20% of a change.
  let T = {}, U = 1;
  const buildT = () => { const u = U; let t = 0; const next = d => { const a = t; t += d; return [a, t]; };
    T = {}; T.row = next(u);         // the row holds while it assembles and sweeps
    T.dark = next(1); T.mHold = next(.25);    // the row scrolls up as any section does, one screen for one screen, with the ink ground directly under it, while the arm grows into the big dot arm. Then the moat's words hold
    T.turn = next(1); T.photo = next(.15); T.res = next(u);          // the film's ground comes up under the moat as the ink did, one screen for one screen, while the dots turn into the arm photo. The photo holds, then breaks back into the fine dots
    T.sw1 = next(.2 * u); T.gather = next(u + .1);                  // into the 433 listing dots: the change fills its stretch, so nothing sits still before the words swap
    T.sw2 = next(.2 * u); T.fly = next(u + .25);                     // onto the chart, then the chart holds with its two labels
    next(.05); T.fall = next(u + .1);                                          // into one price, with the chart's words still up. The price's own sentence only comes when the price has landed
    T.sw3 = next(.2 * u); T.box = next(.3); T.end = t; };          // the box holds. The stage then scrolls away with a plain edge, the proof directly under it
  // reduced motion: the stage steps between finished stills
  const snap = s => s < T.dark[0] + .4 ? 0 : s < T.turn[0] ? T.mHold[1] - .1 : s < T.res[1] ? (T.photo[0] + T.photo[1]) / 2 : s < T.fly[0] ? T.gather[1] : s < T.fall[0] ? T.fly[1] : T.box[0] + .2;

  // ---------------------------------------------------------------- the row: nine moving robots on one line. Each plays from its own sprite, repainted only when its frame changes (twelve a second), as one path per colour.
  // A robot assembles when it arrives, 300ms after the one before it, and its caption rises after it. Reduced motion draws each robot's first frame, still.
  const figs = [...vis.querySelectorAll('.h-bot')], COB = '#2847ce', DEEP = '#1e339b', ASM = 2.2, POSE = +story.dataset.pose;   // the loop's frame that the fine dots and the photo were made from: measured, same grid, no offset
  const bots = figs.map(fig => { const c = fig.querySelector('canvas'); return { fig, cv: c, ctx: c.getContext('2d'), name: c.dataset.loop, frames: null, on: 0, f: 0, cols: 112, rows: +getComputedStyle(fig).getPropertyValue('--r'), dx: 0, dy: 0, n: 1, fps: 12, stale: false, t0: 0 }; });
  const armB = bots[bots.length - 1], armFig = armB.fig;
  // a robot's pixels start on its caption's column line: the canvas slides left by the air its first frame leaves on that side
  const size = b => { const w = b.cv.clientWidth, dpr = Math.min(2, devicePixelRatio || 1); if (!w) return; b.p = w / 112; b.dpr = dpr; if (b.frames) b.cv.style.marginLeft = (-(b.lo0 + b.dx) * b.p).toFixed(2) + 'px'; const W2 = Math.round(w * dpr), H2 = Math.round(b.p * b.rows * dpr); if (b.cv.width !== W2 || b.cv.height !== H2) { b.cv.width = W2; b.cv.height = H2; } b.stale = true;
    if (b.frames) b.cv._rz = { frames: b.frames, n: b.n, f: b.f, p: b.p, dx: b.dx, dy: b.dy, w: 112, h: b.gridH, colors: [COB, DEEP], rad: .5 }; };
  // one sprite to one Float32Array a frame: x, y, size, with the trim's dots after index frame.n
  const decode = (b, m, ok) => { const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const per = m.per || Math.floor(im.width / m.w), W = c.width, N = W * c.height; let lo = 1e9, hi = 0, low = 0, top = 1e9;
      const val = new Uint8Array(N), acc = new Uint8Array(N); for (let i = 0, j = 0; j < N; i += 4, j++) { val[j] = sz[i]; acc[j] = ac[i] > 127 ? 1 : 0; }   // one byte a pixel is all a frame needs, and a phone keeps nine of these
      // the robot's reach over every frame, read from the pixels without building anything; each frame's dots are built the first time it is shown, so the row arrives without a long pause
      for (let f = 0; f < m.frames; f++) { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h;
        for (let y = 0; y < m.h; y++) for (let X = 0, i = (oy + y) * W + ox; X < m.w; X++, i++) if (val[i]) { if (X < lo) lo = X; if (X > hi) hi = X; if (y > low) low = y; if (y < top) top = y; } }
      const decodeF = f => { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h, base = [], trim = [];
        for (let y = 0; y < m.h; y++) for (let X = 0; X < m.w; X++) { const i = (oy + y) * W + ox + X, v = val[i]; if (!v) continue; const s = Math.pow(v / 252, .72); (acc[i] || s > .86 ? trim : base).push(X, y, s); }
        const a = new Float32Array(base.length + trim.length); a.set(base); a.set(trim, base.length); a.n = base.length; return a; };
      const frames = new Proxy(new Array(m.frames), { get: (t, k) => { if (typeof k === 'string' && k !== 'length') { const f = +k; if (Number.isInteger(f) && f >= 0 && f < m.frames) return t[f] || (t[f] = decodeF(f)); } return Reflect.get(t, k); } });
      { const f0 = frames[0]; let l0 = 1e9; for (let i = 0; i < f0.length; i += 3) if (f0[i] < l0) l0 = f0[i]; b.lo0 = l0; }
      b.dx = (112 - (hi + lo + 1)) / 2; b.dy = b.rows - 1 - low; b.top = top; b.low = low; b.n = m.frames; b.fps = m.fps || 12; b.gridH = m.h; b.low = low; ok(frames); };
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
      if (fresh && rowA > 0 && !(b === armB && free) && !b.lensed) { b.stale = false; paintBot(b, k); } }
    return changed; };
  let rowLeft = bots.length; const rowOne = () => { if (--rowLeft === 0) dispatchEvent(new Event('ferra:row')); };   // the first film waits for this on a slow connection
  const fetchRow = () => bots.forEach(b => { const s = document.createElement('script'); s.src = 'media/dots/loops/' + b.name + '-ink.js';
    s.onerror = rowOne; s.onload = () => (rowOne(), window.requestIdleCallback || setTimeout)(() => { const m = (window.FERRA_SEQ || {})[b.name + '-ink']; if (!m) return; decode(b, m, fr => { if (!fr) return; b.frames = fr; b.f = 0; size(b); if (b === armB) { armTop = b.top; armLow = b.low; placeSlot(); } if (reduce) b.on = 1; }); }, { timeout: 400 });
    document.head.appendChild(s); });
  // from 60% visible: one robot at a time, left to right, 600ms apart, with 8s rest between rounds. A tap runs one robot (assets/resolve.js); a mouse gets the lens below, and the sweep rests while it is over the row.
  let lastS = -9, arrived = false, armTop = 0, armLow = 115;
  const rowOn = () => lastS > -.4 && lastS < T.row[1] - .02 && !document.hidden;
  const sweep = async () => { await wait(ASM * 1000 + 300 * bots.length); const R = window.FerraResolve; if (!R) return; const items = figs.map(R.get);
    for (;;) { for (const r of items) { while (!rowOn() || (lens && lens.over())) await wait(300); if (r.ready()) { await r.run(); await wait(600); } } await wait(8000); } };
  const arrive = () => { if (arrived) return; arrived = true; bots.forEach((b, i) => { if (reduce) { b.on = 1; b.fig.classList.add('h-on'); return; } setTimeout(() => { b.on = 1; b.t0 = 0; b.fig.classList.remove('h-wait'); b.fig.classList.add('h-on'); }, i * 300); }); if (!reduce) sweep(); };
  figs.forEach(f => f.classList.add(reduce ? 'h-on' : 'h-wait'));

  // ---------------------------------------------------------------- the Flashlight. With a mouse, the cursor carries a soft round lens over the row: inside it each pixel robot shows its real photo, from the aligned stills the Resolve uses. Its edge is the Resolve's own: a dot swells until it joins its neighbours, with the photo cut to the swollen dots. A robot holds its first frame, the one its photo was cut from, while the lens is on it, and the dots close again behind the lens. It replaces hover and click for a mouse; touch keeps the tap Resolve, and reduced motion gets neither.
  const lens = (() => { if (reduce || !fine) return null;
    const box = vis.querySelector('.h-rw'), six = vis.querySelector('.h-six'), MAXR = .78, PAD = 130, smooth = t => t * t * (3 - 2 * t);
    let can = null, c = null, sc = null, scx = null, px = -1e4, py = -1e4, lx = 0, ly = 0, rn = 0, over = false, raf = 0, last = 0, R = 100, ld = 1, cw = 0, ch = 0, fresh = true, stale = true;
    const measure = () => { const rb = box.getBoundingClientRect(), sb = six.getBoundingClientRect(); ld = Math.min(2, devicePixelRatio || 1); cw = Math.ceil(sb.width + PAD * 2); ch = Math.ceil(sb.height + PAD * 2); R = clamp(sb.width * .085, 72, 104);
      Object.assign(can.style, { left: sb.left - rb.left - PAD + 'px', top: sb.top - rb.top - PAD + 'px', width: cw + 'px', height: ch + 'px' }); const W2 = Math.round(cw * ld), H2 = Math.round(ch * ld); if (can.width !== W2 || can.height !== H2) { can.width = W2; can.height = H2; }
      const cr = can.getBoundingClientRect(); for (const b of bots) { if (!b.p) continue; const a = b.cv.getBoundingClientRect(); b.lx = a.left - cr.left + (b.dx || 0) * b.p; b.ly = a.top - cr.top + (b.dy || 0) * b.p; } stale = false; };
    const build = () => { if (can) return; can = document.createElement('canvas'); can.className = 'h-lens'; can.setAttribute('aria-hidden', 'true'); box.appendChild(can); c = can.getContext('2d'); sc = document.createElement('canvas'); scx = sc.getContext('2d'); stale = true; };
    // one robot's two frames on its dot grid, so the frame on screen can turn into the first one cell by cell, as the Resolve's do
    const grid = (b, f, into, acc) => { into.fill(0); acc.fill(0); const a = b.frames[f]; for (let i = 0; i < a.length; i += 3) { const k = (a[i + 1] | 0) * 112 + (a[i] | 0); if (k >= 0 && k < into.length) { into[k] = a[i + 2]; acc[k] = i >= a.n ? 1 : 0; } } };
    const prep = b => { if (b.lz) return b.lz; const n = 112 * b.gridH, z = b.lz = { F: new Float32Array(n), FA: new Uint8Array(n), Z: new Float32Array(n), ZA: new Uint8Array(n), g: new Float32Array(n), f: -1, m: 0, x0: 1e9, x1: 0, y0: 1e9, y1: 0, photo: null, im: null, p: 0 };
      grid(b, 0, z.Z, z.ZA); const a = b.frames[0]; for (let i = 0; i < a.length; i += 3) { if (a[i] < z.x0) z.x0 = a[i]; if (a[i] > z.x1) z.x1 = a[i]; if (a[i + 1] < z.y0) z.y0 = a[i + 1]; if (a[i + 1] > z.y1) z.y1 = a[i + 1]; }
      if (window.FerraResolve) window.FerraResolve.photo('media/dots/real/' + b.name + '.webp').then(im => { z.im = im; wake(); }); return z; };
    const raster = (b, z) => { if (!z.im) return null; if (z.photo && z.p === b.p) return z.photo; const o = z.photo || document.createElement('canvas'); o.width = Math.round(112 * b.p * ld); o.height = Math.round(b.gridH * b.p * ld); const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(z.im, 0, 0, o.width, o.height); z.photo = o; z.p = b.p; return o; };
    const release = b => { b.lensed = false; paintBot(b, 1); b.stale = false; b.fig.classList.remove('h-lensed'); };
    // paints one robot under the lens. Returns whether anything is still moving.
    const paintOne = (b, z, r, dt, loose) => { const p = b.p, K = 112, H = b.gridH, F = z.F, Z = z.Z, g = z.g, ox = b.lx, oy = b.ly, soft = r * .4, reach = r, pm = p * MAXR, kIn = 1 - Math.exp(-dt / 45), kOut = 1 - Math.exp(-dt / 260);
      if (z.m < 1 && b.f !== z.f) { grid(b, b.f, F, z.FA); z.f = b.f; }
      const m = smooth(z.m), base = new Path2D(), trim = new Path2D(), mask = new Path2D(); let any = false, busy = false;
      for (let y = 0; y < H; y++) for (let x = 0, i = y * K; x < K; x++, i++) { const a = F[i], q = Z[i]; if (!a && !q && !g[i]) continue;
        const sz = a + (q - a) * m, cx = ox + (x + .5) * p, cy = oy + (y + .5) * p, h = ((x * 73 + y * 151) % 97) / 97, d = Math.hypot(cx - lx, cy - ly), to = reach > 1 ? smooth(clamp((reach + (h - .5) * soft * .5 - d) / soft)) : 0, was = g[i];
        let v = was; if (to !== was) { v = was + (to - was) * (to > was ? kIn : kOut); if (Math.abs(to - v) < .004) v = to; else busy = true; g[i] = v; }
        if (sz <= 0) continue;
        const r0 = Math.max(Math.min(.4, p * .3), p * .5 * sz), rr = r0 + (pm - r0) * v;
        if (v < .34 && !loose) { const path = (m > .5 ? z.ZA[i] : z.FA[i]) ? trim : base; path.moveTo(cx + rr, cy); path.arc(cx, cy, Math.max(.35, rr), 0, 6.2832); }
        if (v > 0) { const w = rr * Math.min(1, v * 3); mask.moveTo(cx + w, cy); mask.arc(cx, cy, w, 0, 6.2832); any = true; } }
      c.fillStyle = COB; c.fill(base); c.fillStyle = DEEP; c.fill(trim);
      const ph = raster(b, z);
      if (ph) { if (any) { c.save(); c.clip(mask); c.drawImage(ph, ox, oy, 112 * p, H * p); c.restore(); }
        // what the dots never covered, such as thin cables, shows only in the lens's middle, fading out well before its edge
        if (reach > 8) { const e = Math.ceil(reach * .86), S = Math.ceil(e * 2 * ld); if (sc.width !== S) sc.width = sc.height = S; scx.setTransform(ld, 0, 0, ld, 0, 0); scx.globalCompositeOperation = 'source-over'; scx.clearRect(0, 0, e * 2, e * 2); scx.drawImage(ph, ox - lx + e, oy - ly + e, 112 * p, H * p); const gr_ = scx.createRadialGradient(e, e, e * .6, e, e, e); gr_.addColorStop(0, 'rgba(0,0,0,1)'); gr_.addColorStop(1, 'rgba(0,0,0,0)'); scx.globalCompositeOperation = 'destination-in'; scx.fillStyle = gr_; scx.fillRect(0, 0, e * 2, e * 2); c.drawImage(sc, lx - e, ly - e, e * 2, e * 2); } }
      return busy; };
    const frame = now => { raf = 0; if (!can) return; const dt = Math.min(64, now - last || 16); last = now; if (stale) measure();
      const cr = can.getBoundingClientRect(), tx = px - cr.left, ty = py - cr.top, live = over && !vis._dk;
      if (fresh && live) { lx = tx; ly = ty; fresh = false; } else { const k = 1 - Math.exp(-dt / 35); lx += (tx - lx) * k; ly += (ty - ly) * k; }
      const to = live ? R : 0; rn += (to - rn) * (1 - Math.exp(-dt / (live ? 80 : 150))); if (Math.abs(to - rn) < .3) rn = to;
      let busy = Math.abs(tx - lx) + Math.abs(ty - ly) > .2 && live || rn !== to;
      c.setTransform(ld, 0, 0, ld, 0, 0); c.clearRect(0, 0, cw, ch);
      let held = 0;
      for (const b of bots) { if (!b.frames || !b.p) continue; const z = prep(b), bx0 = b.lx + z.x0 * b.p, bx1 = b.lx + (z.x1 + 1) * b.p, by0 = b.ly + z.y0 * b.p, by1 = b.ly + (z.y1 + 1) * b.p;
        const near = live && Math.hypot(Math.max(bx0 - lx, 0, lx - bx1), Math.max(by0 - ly, 0, ly - by1)) < rn + 36, loose = b === armB && free;
        if (!b.lensed) { if (!near) continue; const R0 = window.FerraResolve && window.FerraResolve.get(b.fig); if (!b.on || !b.t0 || (now - b.t0) / 1000 < ASM || (R0 && R0.running) || loose) continue; b.lensed = true; b.fig.classList.add('h-lensed'); z.m = 0; z.f = -1; }
        z.m = clamp(z.m + (near ? dt / 240 : -dt / 320)); if (z.m > 0 && z.m < 1) busy = true;
        const moving = paintOne(b, z, near ? rn : 0, dt, loose); busy = busy || moving;
        if (near || moving || z.m > 0) held++; else if (!loose) release(b); else { b.lensed = false; b.fig.classList.remove('h-lensed'); b.stale = true; } }
      if (busy) raf = requestAnimationFrame(frame);
      else if (!live && !held && rn <= 2) { c.clearRect(0, 0, cw, ch); can.style.display = 'none'; } };
    const wake = () => { if (can && !raf) { if (can.style.display === 'none') { can.style.display = ''; fresh = true; } raf = requestAnimationFrame(frame); } };
    const judge = () => { const sb = six.getBoundingClientRect(), was = over; over = !vis._dk && px >= sb.left - 40 && px <= sb.right + 40 && py >= sb.top - 40 && py <= sb.bottom + 8; if (over && !can) build(); if (over !== was) { if (over) fresh = true; } if (over || was) wake(); };
    vis.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse') return; px = ev.clientX; py = ev.clientY; judge(); wake(); }, { passive: true });
    vis.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'mouse') return; px = py = -1e4; judge(); });
    // a mouse's hover and click belong to the lens, so resolve.js never hears them. Touch still reaches it.
    let lastType = ''; six.addEventListener('pointerdown', ev => { lastType = ev.pointerType; }, true);
    six.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') ev.stopPropagation(); }, true);
    six.addEventListener('click', ev => { if (lastType === 'mouse' || ev.pointerType === 'mouse') ev.stopPropagation(); }, true);
    return { over: () => over, wake: () => { if (can) { if (px > -1e3) judge(); wake(); } }, mark: () => { stale = true; } };
  })();

  // ---------------------------------------------------------------- the price box: the only numbers baked into the page
  const BX0 = 5, BX1 = 106, BY0 = 9, BY1 = 118, HI = 125000, LO = 900;
  // the arm's drawn shape on its grid, measured from the fine dots (h-arm.js): x 5 to 106, y 9 to 118. Its width, its half height and its centre across.
  const ARM_W = 101, ARM_H = 54.5, ARM_CX = 55.5;
  let W = 0, H = 0, FH = 0, dpr = 1, phone = false, fineD = null, fineFlat = null, D = null, R = null, dirty = true, on = true, photo = null, photoOK = false;
  let cam = { p: 6, l: 300 }, floorY = 800, axisY = 800, lineL = 0, C = { l: 0, r: 1000, t: 0, b: 800 }, age = 10, ask = 14700, sale = 6100, pt = null, slot = null, tgt = null;
  const X = a => C.l + a / 30 * (C.r - C.l), Y = u => C.t + (Math.log(HI) - Math.log(u)) / (Math.log(HI) - Math.log(LO)) * (C.b - C.t);
  const tab = JSON.parse(document.getElementById('h-prices').textContent), rSel = document.getElementById('h-r'), ySel = document.getElementById('h-y'), tool = document.getElementById('h-tool'), saleEl = document.getElementById('h-pv'), whyEl = document.getElementById('h-why');
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US'), r100 = v => Math.round(v / 100) * 100;
  let shown = null, tw = 0, ticked = false, ends = null, endDirty = true;
  const putAll = (sel, v) => film.querySelectorAll(sel).forEach(s => { s.textContent = v; });
  const setBox = () => {
    const f = tab.fam[rSel.value], y = +ySel.value; age = clamp(tab.now - y, 0, 30);
    const a = f.c[age], k = tab.sk[age < 10 ? 0 : 1];   // the price tool's Expected sale rule
    ask = r100(a); sale = r100(a * k);
    tool.href = `/price#y=${y}&r=${f.t}`;   // the robot and the year only
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
    const pic = new Image(); pic.onload = () => { const c = document.createElement('canvas'); c.width = pic.naturalWidth; c.height = pic.naturalHeight; const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(pic, 0, 0); photo = c; photoOK = true; dirty = true; }; pic.src = 'media/robots/arm-film.webp?v=82da75c50b';   // the file is mirrored for an arm that faced left; every arm on this stage now faces right, as the footage's does
    load('assets/h-arm.js?v=16f94bde4b', () => { fineD = window.FERRA_ARM.map(q => ({ x: q[0] + .5, y: q[1] + .5, s: q[2], acc: q[3], g: q[3] * 100 + Math.round(q[2] * 4), h: ((q[0] * 73 + q[1] * 151) % 97) / 97 })).sort((a, b) => a.g - b.g); seatFine(); flatFine(); dirty = true; });
    load('assets/h-film.js?v=68fd2a0e00', () => { D = window.FERRA_FILM; prep(); seatFine(); layout(); });
  };
  // the row comes as soon as the page has loaded, or at the first sign of a reader if that is sooner: it is one scroll away, and on a slow connection a reader who waits for a scroll reaches empty cells. The first film waits for it (above). The price chapter's pieces wait until the row is arriving.
  { let got = false; const go = () => { if (got) return; got = true; EV.forEach(n => removeEventListener(n, go)); fetchRow(); }, EV = ['scroll', 'wheel', 'pointerdown', 'touchstart', 'keydown'];
    EV.forEach(n => addEventListener(n, go, { passive: true })); document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true }); }
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
  let storyTop = 0, gL = 0, gR = 0;
  // where the row's arm stands now, in the stage. Its sprite can arrive after the layout, and its offsets arrive with it, so this runs again then: the big arm must start exactly on the row's.
  const placeSlot = () => { if (!armB.p) return; const sr = stage.getBoundingClientRect(), ar = armB.cv.getBoundingClientRect(); slot = { p: armB.p, x: ar.left - sr.left + (armB.dx || 0) * armB.p, y: ar.top - sr.top + (armB.dy || 0) * armB.p + (vis._dk || 0) * FH }; dirty = true; };   // measured at rest: the row may be part way up when the sprite arrives
  function layout() {
    W = stage.clientWidth; FH = stage.clientHeight; H = probe.clientHeight || FH; dpr = Math.min(2, devicePixelRatio || 1); phone = W <= 720 && !(FH < 500 && W > FH); U = W <= 720 ? .55 : .65; buildT();   // a phone held sideways stands the arm beside the words, as a wide screen does
   
    story.style.height = (T.end * H + FH).toFixed(0) + 'px'; storyTop = docTop(story);
    cv.width = Math.round(W * dpr); cv.height = Math.round(FH * dpr);
    b2.querySelector('.h-bt').style.minHeight = '';   // the chart beats share one top; measured fresh each time, after the arm's own sizes
    const sr0 = stage.getBoundingClientRect(), cols = BX1 - BX0 + 1, rows = BY1 - BY0 + 1, gi = b0.querySelector('.in'), gs_ = getComputedStyle(gi), gx = gi.getBoundingClientRect(); gL = gx.left + parseFloat(gs_.paddingLeft); gR = gx.right - parseFloat(gs_.paddingRight); const gg = phone ? 16 : 24, gc = (gR - gL - 11 * gg) / 12;   // the grid: the header's own edges, 12 columns
    if (phone) {
      // the arm stands over the words: as big as the width and the words allow, centred in what is left
      const wh = Math.max(...[...story.querySelectorAll('.h-mct,.h-b0 .h-bt,.h-b1 .h-bt,.h-b2 .h-bt')].map(el => el.getBoundingClientRect().height)), room = H - wh - 28 - 52, p = Math.min((W - 12) / cols, room / rows);
      floorY = Math.round(52 + rows * p + Math.max(0, room - rows * p) / 2); cam = { p, l: (W - cols * p) / 2 - BX0 * p };
      const bh = b3.querySelector('.h-bt').getBoundingClientRect().height, bottom = H - bh - 68;
      C = { l: gL + 70, r: gR - 4, t: 168, b: bottom }; axisY = bottom + 8; lineL = 0;   // the top leaves room for the price axis's title under the header
      b2.querySelector('.h-bt').style.minHeight = bh + 'px';
    } else {
      // the words stand on the first five columns. The arm's pixels and the chart's plot stand on the last six, ending on the header's right edge. Below 1060 the words take 40% and the arm has what is left.
      const wide = W > 1060, colR = b3.querySelector('.h-bt').getBoundingClientRect().right + gg, x6 = gL + 6 * (gc + gg), fy = Math.round(H * .9), p0 = Math.min((fy - 56) / rows, ((wide ? gR - x6 : W - colR - 24)) / cols);
      // One spot for the dot arm, the photo arm and the listing dots. Side to side: the arm's drawn shape ends on the grid's right edge; its size keeps it at least two grid gaps clear of the words' real right edge (the widest of the three beats).
      // Up and down: its drawn shape is centred on the middle of the words beside it, which stand centred in the screen. It keeps its old size unless it needs to shrink to stay a grid column clear of the words or below the header.
      hPairs();
      const tr = Math.max(hInk(moat.querySelector('.h-mct')), hInk(b0.querySelector('.h-bt')), hInk(b1.querySelector('.h-bt'))) - sr0.left, hd = b0.querySelector('h2'), cy = hd.offsetTop + hd.offsetHeight / 2, top0 = 88;
      const p = Math.max(1, Math.min(p0, (gR - tr - 2 * gc) / ARM_W, (cy - top0) / ARM_H, (H - 16 - cy) / ARM_H));
      floorY = cy + ARM_H * p; cam = { p, l: gR - (ARM_CX + ARM_W / 2 - 1.3) * p };   // the arm's drawn edge ends on the grid's right edge, as the words start on its left edge (2026-11-07: centred by its box it read too far left)
      // the chart: its price labels stay at least one grid column clear of the words and the controls in both chart beats. The chart narrows for that, never the words.
      const b2t = b2.querySelector('.h-bt'), b3t = b3.querySelector('.h-bt'); b2t.style.minHeight = b3t.offsetHeight + 'px';
      const wr = Math.max(hInk(b2t), hInk(b3t)) - sr0.left, lw = Math.max(...[...axis.querySelectorAll('.h-yl')].map(s => s.offsetWidth));
      C = { l: Math.max(wide ? x6 : colR + 84, wr + gc + lw + 14), r: gR - 4, t: 0, b: 0 }; { const t0 = Math.max(112, H * .12), b0 = fy - 8, ph = Math.min(b0 - t0, Math.max(C.r - C.l, 420) * .9); C.t = Math.min(b0 - ph, Math.max(t0, Math.round(cy - 7 - ph / 2))); C.b = C.t + ph; axisY = C.b + 8; }   // the plot plus its price title and year labels stand centred on the words beside them, as the arm does (2026-11-07: sat too low)   // the price range runs from $900, just under the cheapest listing, and the plot is never taller than 0.9 of its width (2026-11-07: empty space under $1,000)   // the top leaves room for the price axis's title under the header axisY = fy; lineL = colR;
    }
    // the row's arm, and the spot it grows into
    bots.forEach(size);
    const sr = stage.getBoundingClientRect();
    tgt = { p: cam.p, x: cam.l, y: floorY - BY1 * cam.p };
    placeSlot();
        axis.classList.toggle('h-tight', !phone && C.r - C.l < 600);   // a narrow chart says "years old" once, on its last label
    axis.querySelectorAll('.h-xl').forEach(s => { const a = +s.dataset.age, x = X(a); s.style.transform = `translate(${(a === 0 ? x - 4 : a === 30 ? x - s.offsetWidth + 4 : x - s.offsetWidth / 2).toFixed(1)}px,${(axisY + 10).toFixed(1)}px)`; });
    axis.querySelectorAll('.h-yl').forEach(s => { s.style.transform = `translate(${(C.l - s.offsetWidth - (phone ? 10 : 14)).toFixed(1)}px,${(Y(+s.dataset.usd) - s.offsetHeight / 2).toFixed(1)}px)`; });
    { const yt = axis.querySelector('.h-yt'); yt.style.transform = `translate(${(C.l - yt.offsetWidth / 2).toFixed(1)}px,${(C.t - 14 - yt.offsetHeight).toFixed(1)}px)`; }
    labs = null; endDirty = true;   // the chart's labels find their clean spots again
    if (R) { const pb = cam.p;
      for (let j = 0; j < R.n; j++) { const q = D.rows[j], g = rad(q[2]); R.x0[j] = cam.l + q[6] * cam.p; R.y0[j] = floorY - (BY1 - q[7]) * cam.p;
        R.r0[j] = pb * .94 * g; R.x1[j] = X(Math.max(q[5], .4)); R.y1[j] = Y(q[2]); R.r1[j] = q[5] > 30 || q[2] < LO || q[2] > HI ? 0 : (phone ? 2.8 : 4.8) * Math.pow(g, .8); }   // a listing past the chart's own ages or prices is left off it, and a new robot sits just off the axis (2026-11-07)
      drain(); }
    flatFine();
    pt = null; dirty = true; if (lens) lens.mark();
  }

  // ---------------------------------------------------------------- painting
  const rawScroll = () => (scrollY - storyTop) / (H || 1);
  const settle = hSettle(() => T ? [T.sw1, T.sw2, T.sw3] : [], () => { dirty = true; });   // only the word swaps (a seventh of a screen each): longer changes follow the scroll exactly, so a reader never scrolls into a picture that already finished
  const scroll = () => { let s = rawScroll(); if (reduce) return s < 0 ? 0 : snap(s); return settle(s); };
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
  // the factory arm, on its way from the row to its one place: size and place eased together. It stays whole, in one colour at a time: as the ink's edge climbs past it, all of it lightens together from cobalt to a tint that reads on both grounds, and it reaches white once the edge has cleared its top. It shares its grid with the fine dots, so in the last stretch the same dots change to the fine dots' sizes and shades, and nothing jumps.
  const H_MID = .62;
  function paintBig(m, lift, edge, mix) {
    const a = armB.frames && armB.frames[armB.f]; if (!a || !slot || !tgt) return;
    const p = lerp(slot.p, tgt.p, m), x0 = lerp(slot.x, tgt.x, m), y0 = lerp(slot.y - lift, tgt.y, m), n = a.length;
    const top = y0 + armTop * p, bot = y0 + armLow * p, on = clamp((bot - edge) / Math.max(1, bot - top)), t = on < 1 ? H_MID * Math.pow(on, .75) : H_MID + (1 - H_MID) * clamp(1 - edge / Math.max(1, top));
    const plain = () => { for (let part = 0; part < 2; part++) { ctx.fillStyle = hMix(part ? H_DEEP : H_COB, H_WHITE, t); ctx.beginPath();
      for (let i = part ? a.n : 0, e = part ? n : a.n; i < e; i += 3) { const x = (a[i] + .5) * p + x0, y = (a[i + 1] + .5) * p + y0, r = Math.max(.4, p * .5 * a[i + 2]); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); }
      ctx.fill(); } };
    const fine = () => { if (!fineD.c0) { const c = new Map(), f = armB.frames[POSE]; for (let i = 0; i < f.length; i += 3) c.set(f[i] * 1000 + f[i + 1], f[i + 2]); fineD.forEach(q => { q.c0 = c.get(Math.floor(q.x) * 1000 + Math.floor(q.y)) || q.s; }); fineD.c0 = true; }
      let cur = -1; const base = [lerp(H_COB[0], 255, t), lerp(H_COB[1], 255, t), lerp(H_COB[2], 255, t)], acc = [lerp(base[0], 150, mix), lerp(base[1], 232, mix), lerp(base[2], 255, mix)];
      for (const q of fineD) {
        if (q.g !== cur) { if (cur >= 0) ctx.fill(); cur = q.g; const al = lerp(1, .55 + .45 * q.s, mix * t), rgb = q.acc ? acc : base; ctx.fillStyle = `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${al.toFixed(3)})`; ctx.beginPath(); }
        const x = q.x * p + x0, y = q.y * p + y0, r = Math.max(.4, lerp(p * .5 * q.c0, p * .44 * q.s, mix)); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      if (cur >= 0) ctx.fill(); };
    if (mix > 0 && fineD) fine(); else plain();
  }
  const RES_K = [1, .612, .51, .47, .43, .38, .335, .295, .235, .13, 0];
  // the picture eases toward the scroll position, so a mouse wheel's steps read as one motion; the page itself scrolls natively
  let sv = null, lastNow = 0, fFrom = 0, pausedAt = 0;
  function paint(now) {
    const target = scroll(), dt = Math.min(64, now - lastNow || 16); lastNow = now;
    if (sv === null || reduce) sv = target; else { sv += (target - sv) * (1 - Math.exp(-dt / 85)); if (Math.abs(target - sv) < .0005) sv = target; else dirty = true; }
    const s = sv; lastS = s; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, FH);
    const dk = seg(s, ...T.dark), turn = seg(s, ...T.turn), res = seg(s, ...T.res), k = seg(s, ...T.gather), fly = seg(s, ...T.fly), fall = seg(s, ...T.fall);

    // the row scrolls up as any section does, with the ink directly under it and a plain edge between. Only the factory arm comes loose.
    const edge = FH * (1 - dk); rowA = dk < 1 ? 1 : 0;
    if (dk !== vis._dk) { vis._dk = dk; vis.style.transform = dk ? `translateY(${(-dk * FH).toFixed(1)}px)` : ''; vis.style.visibility = dk >= 1 ? 'hidden' : ''; vis.style.pointerEvents = dk ? 'none' : ''; vis.classList.toggle('h-going', dk > 0); gi.style.transform = `translateY(${edge.toFixed(1)}px)`; gi.style.visibility = dk > 0 ? 'visible' : 'hidden'; }
    // the words and the neighbours in the growing arm's path step aside before it reaches them, so no dot ever runs through a word or another robot
    // the hand-off: the other robots, their prices and the note stay whole until the factory arm starts to move off (dk .25, where paintBig starts to grow it), then fade as it leaves
    { const hf = (1 - seg(dk, .25, .42)).toFixed(3); if (hf !== vis._hf) { vis._hf = hf; vis.style.setProperty('--hf', hf); } }
    const isFree = dk > 0; if (isFree !== free) { free = isFree; armFig.classList.toggle('h-free', free); if (free) { fFrom = armB.f; pausedAt = now; } else { if (armB.t0) armB.t0 += now - pausedAt; armB.stale = true; } }
    // the arm turns to the pose the footage is waiting on, the short way round the loop, tied to the scroll
    if (free && armB.frames) { const n = armB.n, d = ((POSE - fFrom + n + n / 2) % n) - n / 2; armB.f = (fFrom + Math.round(d * soft(seg(dk, .05, .55))) + n) % n; if (armB.cv._rz) armB.cv._rz.f = armB.f; }

    // the film's ground comes up with a plain edge, the arm staying where it stands. It deepens under the chart, so the chart's small labels stay readable at its brightest corner
    const edge2 = FH * (1 - turn); if (turn !== gr._t) { gr._t = turn; gr.style.transform = `translateY(${edge2.toFixed(1)}px)`; } put(gs, .6 * seg(fly, .4, .72));

    // the moat's words ride up on the ink and leave at the top, as any section does
    show(moat, dk > 0 && turn < 1 ? 1 : 0, edge - turn * FH);
    { const ot = phone && turn > .03; if (ot !== moat._ot) { moat._ot = ot; moat.classList.toggle('h-out', ot); } }   // on a phone the words would run up through the arm above them, so they step aside instead

    // the arm, from the row to its place. It is painted here until the Resolve starts.
    if (dk > 0 && turn <= 0) paintBig(soft(seg(dk, .25, 1)), dk * FH, edge, seg(dk, .55, 1));

    // The Resolve, tied to the scroll: the fine dots become the photo, the photo holds, then it breaks back into the same dots.
    // It changes unevenly across its k, so this table, measured from the rendered frames, spreads what the eye sees evenly over its stretch
    const rq = (turn < 1 ? 1 - turn : res) * 10, ri = Math.min(9, Math.floor(rq)), rk = lerp(RES_K[ri], RES_K[ri + 1], rq - ri);
    if (turn > 0) { const left = cam.l, top = floorY - BY1 * cam.p, pw = 112 * cam.p, ph = 125 * cam.p;
      // the fine dots stay at full strength underneath while the Resolve's own dots, on the same spots, come up over them, so the arm never dims
      if (fineD && (rk < .1 || !photoOK) && k < 1) paintFine(1, k);
      if (rk > 0 && photoOK) { if (rk >= 1 || !window.FerraResolve || !fineFlat) { if (rk >= 1 || !fineFlat) ctx.drawImage(photo, left, top, pw, ph); }
        else { ctx.globalAlpha = seg(rk, 0, .1); window.FerraResolve.draw(ctx, { photo, x: left, y: top, w: pw, h: ph, dots: fineFlat, p: cam.p, k: rk, color: '#fff' }); ctx.globalAlpha = 1; } } }

    // the chart, the dots on it and the price stay until the reader has scrolled them off
    const axisA = seg(fly, .66, .74);
    if (axisA > 0) { ctx.fillStyle = `rgba(255,255,255,${(.42 * axisA).toFixed(3)})`; ctx.fillRect(C.l, axisY, C.r - C.l, 1);
      // the price axis: one thin line in the same white, from its title down to the age axis at "New", with a tick at each price label
      ctx.fillRect(C.l, C.t - 8, 1, axisY - C.t + 9); [1000, 10000, 100000].forEach(v => ctx.fillRect(C.l - (phone ? 5 : 7), Math.round(Y(v)), phone ? 5 : 7, 1)); }
    let hitOK = false; const mx = X(age), my = Y(sale);
    if (!pt) pt = { x: mx, y: my, a: Y(ask) };
    pt.x += (mx - pt.x) * .22; pt.y += (my - pt.y) * .22; pt.a += (Y(ask) - pt.a) * .22; if (Math.abs(mx - pt.x) + Math.abs(my - pt.y) + Math.abs(Y(ask) - pt.a) > .3) dirty = true; else { pt.x = mx; pt.y = my; pt.a = Y(ask); }
    if (R && !labs) placeLabels();
    if (R && k > 0) {
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
      const la = seg(fly, .78, .86) * (1 - seg(fall, 0, .1)); if (la > 0 && labs && labs.length) { ctx.strokeStyle = `rgba(255,255,255,${(.7 * la).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); labs.forEach(q => { ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); }); ctx.stroke(); }
      // whichever dot is open
      const hl = tip && tip.kind === 'l' ? tip.j : -1;
      if (hl >= 0 && R.r[hl] > 0) { ctx.fillStyle = 'rgb(150,232,255)'; ctx.beginPath(); ctx.arc(R.x[hl], R.y[hl], Math.max(R.r[hl] * 1.3, phone ? 4 : 4.5), 0, 6.2832); ctx.fill(); }
      // What is left at the end: the line, what sellers ask on it, a thin line down to what it would likely sell for, and two labels of one size in clean space
      const lk = seg(fall, .7, 1);
      if (lk > 0) { const rr = (phone ? 4 : 5) * lk; ctx.strokeStyle = `rgba(255,255,255,${(.85 * lk).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pt.x, pt.a); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(pt.x, pt.a, rr, 0, 6.2832); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,255,255,${lk.toFixed(3)})`; ctx.beginPath(); ctx.arc(pt.x, pt.a, rr, 0, 6.2832); ctx.stroke(); }
      const lm2 = fall >= .9, lm = fly >= .8 && fall < .06; if (lm !== lblC._on) { lblC._on = lm; lblC.classList.toggle('h-lon', lm); lblU.classList.toggle('h-lon', lm); } if (lm2 !== lblA._on) { lblA._on = lm2; lblA.classList.toggle('h-lon', lm2); lblS.classList.toggle('h-lon', lm2); }
      if (endDirty) placeEnds();
      if (ends) { const ee = q => { q.x += (q.tx - q.x) * .22; q.y += (q.ty - q.y) * .22; if (Math.abs(q.tx - q.x) + Math.abs(q.ty - q.y) > .3) dirty = true; else { q.x = q.tx; q.y = q.ty; } q.el.style.transform = `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px)`; }; ee(ends[0]); ee(ends[1]); }
      arrivedDot = Math.sqrt(arrivedN / n);
    }
    // the price dot: it grows as the dots arrive, and leaves with the chart when the stage scrolls away
    if (R && fall > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.5 + arrivedDot * (phone ? 4 : 5), 0, 6.2832); ctx.fill(); }

    // the sentence and the price come together, once the dots have landed. The price never runs beside the words, because the words would be false while it ran. The controls follow.
    const sw = t => (t[0] + t[1]) / 2, ready = s >= sw(T.sw3) || reduce;
    if (ready !== ticked) { ticked = ready; if (!reduce) { cancelAnimationFrame(tw); if (ready) { shown = sale; saleEl.textContent = fmt(sale); b3.classList.add('h-told'); } else b3.classList.remove('h-told'); } }

    // the words. A swap takes 20vh: 10 out, 10 in.
    const o0 = seg(s, T.sw1[0], sw(T.sw1)), a0 = { a: (turn > 0 ? 1 : 0) * (1 - o0), dy: edge2 - in2(o0) * 18 }, a1 = beat(s, sw(T.sw1), T.sw1[1], T.sw2[0], sw(T.sw2)), a2 = beat(s, sw(T.sw2), T.sw2[1], T.sw3[0], sw(T.sw3)), a3 = beat(s, sw(T.sw3), T.sw3[1], 1e3, 1e3 + 1);
    show(b0, a0.a, a0.dy); show(b1, a1.a, a1.dy); show(b2, a2.a, a2.dy); put(b3, a3.a); b3.style.transform = a3.dy ? `translateY(${a3.dy.toFixed(1)}px)` : ''; b3.classList.toggle('h-on', a3.a > .4);
    { const ao = axisA >= .5; if (ao !== axis._on) { axis._on = ao; axis.classList.toggle('h-on', ao); } }
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
      const right = gR - w;
      for (let y = C.t; y <= (above ? ay - h - 4 : C.b - h); y += 6) for (let x = right; x >= C.l; x -= 6) { const d = (x + w / 2 - ax) ** 2 + (y + h / 2 - ay) ** 2; if (d < bd && free(x, y, w, h) && !crosses(x, y, w)) { bd = d; best = [x, y]; } }
      if (!best) { if (above) return put1(el, ax, ay, false); el.style.visibility = 'hidden'; return; } el.style.visibility = ''; taken.push([best[0], best[1], w, h]); el.style.transform = `translate(${best[0].toFixed(1)}px,${best[1].toFixed(1)}px)`;
      const ex = clamp(ax, best[0], best[0] + w), ey = ay < best[1] ? best[1] - 3 : ay > best[1] + h ? best[1] + h + 3 : best[1] + h / 2;
      if (Math.hypot(ex - ax, ey - ay) > 10) labs.push([ex, ey, ax, ay]); };
    const last = D.aucs.reduce((m, q) => q[5] > m[5] ? q : m);
    // the line's and the auction squares' names sit as a small key in the chart's empty bottom right, so no joining line runs through the dots (2026-11-07)
    { const kw = Math.max(lblC.offsetWidth, lblU.offsetWidth), kx = gR - kw, ky = phone ? C.t - 14 - axis.querySelector('.h-yt').offsetHeight - 10 - lblC.offsetHeight * 2 - 8 : C.t;   // on a phone it sits above the plot, over the price title; the key sits top right, the one corner the listings leave empty void last; [lblC, lblU].forEach(el => { el.style.visibility = ''; });
      lblC.style.transform = `translate(${kx.toFixed(1)}px,${ky.toFixed(1)}px)`; lblU.style.transform = `translate(${kx.toFixed(1)}px,${(ky + lblC.offsetHeight + 8).toFixed(1)}px)`;
      taken.push([kx, ky, kw, lblC.offsetHeight * 2 + 8]); } };

  // the last two labels: what sellers ask and the likely sale. Each takes the free spot nearest its own marker, clear of the line, both markers and the other label, so any robot and any year keeps them clean. Same side and same left edge when there is room.
  const placeEnds = () => { endDirty = false; const tx = X(age), ay = Y(ask), sy = Y(sale), marks = [], pad = 7, hit = (x, y, w, h, list) => { for (const [dx, dy, r] of list) if (dx > x - pad - r && dx < x + w + pad + r && dy > y - pad - r && dy < y + h + pad + r) return true; return false; };
    for (let a = 0; a <= 30; a += .2) { const c0 = D.curve[Math.floor(a)], c1 = D.curve[Math.min(30, Math.ceil(a))]; marks.push([X(a), Y(Math.exp(lerp(Math.log(c0), Math.log(c1), a - Math.floor(a)))), 1]); }
    for (let y = ay; y <= sy; y += 5) marks.push([tx, y, 1]); marks.push([tx, ay, 6], [tx, sy, 7]);
    const lo = C.l + 2, hi = gR, top = Math.max(phone ? 56 : 48, C.t - 8), bot = axisY - 8, taken = [];
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
  b3.addEventListener('focusin', () => { const r = rawScroll(); if (r < T.box[0] || r > T.box[1]) scrollTo({ top: storyTop + (T.box[0] + .2) * H, behavior: 'instant' }); });

  // ---------------------------------------------------------------- run
  layout();
  const arriveCheck = () => { const r = rawScroll(); if (!arrived && r > -.55) arrive(); if (r > -.8) fetchLate(); };
  arriveCheck();
  addEventListener('scroll', () => { dirty = true; arriveCheck(); if (lens) lens.wake(); }, { passive: true });
  if (reduce) loans.classList.add('h-near', 'h-land'); else { new IntersectionObserver(es => { if (es[0].isIntersecting) loans.classList.add('h-near'); }, { rootMargin: '0px 0px -12% 0px' }).observe(loans);
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { loans.classList.add('h-land'); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' }).observe(dotsEl); }   // the dots settle in their column as it arrives, so there is never a hole waiting for them
  let lw = 0, lh = 0, rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (stage.clientWidth === lw && Math.abs(stage.clientHeight - lh) < 120) return; lw = stage.clientWidth; lh = stage.clientHeight; layout(); }, 120); };
  lw = stage.clientWidth; lh = stage.clientHeight; addEventListener('resize', onResize); addEventListener('load', layout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) dirty = true; }, { rootMargin: '300px' }).observe(stage);
  const loop = now => { requestAnimationFrame(loop); if (!on) return; const moved = rowTick(now); if (moved && lastS > T.dark[0] && lastS < T.dark[1]) dirty = true; if (!dirty) return; dirty = false; paint(now); };
  requestAnimationFrame(loop);
})();

// What if a loan goes bad. The band is pinned and tied to the scroll: the arms light, the 35 and the 15 part, and they drain to what the middle auction sale would bring. Then it scrolls away, with the form directly under it. Reduced motion shows the finished picture.
(() => {
  const w = document.querySelector('.h-inkw'), sp = w && w.querySelector('#h-split'); if (!sp) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return sp.classList.add('h-dr');
  const f7 = [...sp.querySelectorAll('.h-f7 .h-fb canvas')], f3 = [...sp.querySelectorAll('.h-f3 .h-fb canvas:not(.h-cy)')], cy = [...sp.querySelectorAll('.h-f3 .h-cy')], s35 = sp.querySelector('.h-s35'), sd = sp.querySelector('.h-sd'), sx = sp.querySelector('.h-sx');
  const put = (el, a) => { const s = a.toFixed(3); if (el._a !== s) { el._a = s; el.style.opacity = s; } };
  [s35, sd, sx].forEach(e => { e.style.transition = 'opacity .5s ease'; });
  let top = 0, H = 1, U = 1, was = null;
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { sp.classList.add('in-view'); io.disconnect(); } }, { threshold: .15 }).observe(sp);
  const layout = () => { H = innerHeight; U = innerWidth <= 720 ? .7 : .75; top = w.getBoundingClientRect().top + scrollY; was = null; paint(); };
  function paint() { const s = (scrollY - top) / H; if (s === was) return; was = s;
    const light = hSeg(s, 0, U), part = hSeg(s, U, 2 * U), dr = hSeg(s, 2 * U, 3 * U);
    const lit = k => { const d = k / 50 * .6; return hSeg(light, d, d + .4); };
    f7.forEach((c, k) => { const l = .13 + .87 * lit(k), dl = (34 - k) / 34 * .5, q = hSeg(dr, dl, dl + .5); put(c, k < 2 ? l : hLerp(l, k < 12 ? .46 : .13, q)); });
    f3.forEach((c, i) => { const l = .13 + .87 * lit(35 + i); put(c, l * (1 - part)); put(cy[i], l * part * (1 - .7 * dr)); });
    sp.style.setProperty('--sp', (1 - hIo3(part)).toFixed(3));
    put(s35, part >= .75 && dr < .15 ? 1 : 0); put(sd, dr >= .85 ? 1 : 0); put(sx, part >= .75 ? 1 : 0); sd.style.visibility = dr > .7 ? '' : 'hidden'; }   // the three labels come in whole once their moment is reached (a 0.5s fade, the site's shortest), so a reader who stops mid-band never sees words half faded
  let lw2 = innerWidth; layout(); addEventListener('scroll', paint, { passive: true }); addEventListener('resize', () => { if (innerWidth !== lw2) { lw2 = innerWidth; layout(); } }); addEventListener('load', layout);   // the band keeps its scroll length while a phone toolbar slides if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
