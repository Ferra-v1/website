// Home page behaviour: the step-synced ticket, six moving robots on one line, the two films, the vision statement, and the first screen
// with its film. Runs after dotbot.js and site.js, before DOMContentLoaded.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- H5 how it works
  // The sentences tell themselves in turn, from the first, while the section is on screen; touching one stops that. The ticket follows the sentence being told.
  // Reduced motion shows the finished ticket with every sentence open.
  const live = document.querySelector('.h-live'), steps = [...document.querySelectorAll('.h-st')];
  if (live && steps.length) {
    const rows = [...live.querySelectorAll('.dr')];
    let at = 0, timer = 0, touched = false;
    const set = k => { at = k; live.dataset.step = k; steps.forEach((s, j) => { s.classList.toggle('on', j === k); j === k ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current'); });
      const on = (steps[k].dataset.rows || '').split(','); rows.forEach(r => r.classList.toggle('hl', on.includes(r.dataset.row))); };
    if (reduce) { live.dataset.step = 3; steps.forEach(s => s.classList.add('on')); }
    else {
      set(0);
      const stop = () => { clearInterval(timer); timer = 0; };
      steps.forEach((s, k) => s.addEventListener('click', () => { touched = true; stop(); set(k); }));
      new IntersectionObserver(es => { if (es[0].isIntersecting && !touched) { if (!timer) timer = setInterval(() => set((at + 1) % steps.length), 4000); } else stop(); }, { threshold: .4 }).observe(live);
    }
  }

})();

// Six moving robots on one line. Each plays from its own sprite, repainted only when its frame changes (twelve a second), as one path per colour, and only while it is on screen.
// A robot assembles when it arrives, its price following. Reduced motion draws each robot's first frame, still. If a sprite fails to load, the nearest still takes its place.
(() => {
  const figs = [...document.querySelectorAll('.h-bot')]; if (!figs.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, COB = '#2847ce', DEEP = '#1e339b';
  const ARM = { x0: 5, x1: 106, y0: 9, y1: 118 };   // the first screen's arm carries empty rows round it; the rest stand on their lowest row
  const bots = figs.map(fig => ({ fig, cv: fig.querySelector('canvas'), ctx: fig.querySelector('canvas').getContext('2d'), name: fig.querySelector('canvas').dataset.loop, frames: null, on: 0, f: 0, vis: false, cols: 112, rows: +getComputedStyle(fig).getPropertyValue('--r') }));
  const size = b => { const w = b.cv.clientWidth, dpr = Math.min(2, devicePixelRatio || 1); if (!w) return; b.p = w / 112; b.dpr = dpr; const W = Math.round(w * dpr), H = Math.round(b.p * b.rows * dpr); if (b.cv.width !== W || b.cv.height !== H) { b.cv.width = W; b.cv.height = H; } b.stale = true; };
  // one sprite to one Float32Array a frame: x, y, size, with the trim's dots after index frame.n
  const decode = (b, m, ok) => { const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const per = m.per || Math.floor(im.width / m.w), arm = b.name === 'hero-arm-loop', frames = []; let lo = 1e9, hi = 0, low = 0;
      for (let f = 0; f < m.frames; f++) { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h, base = [], trim = [];
        for (let y = 0; y < m.h; y++) { if (arm && (y < ARM.y0 || y > ARM.y1)) continue;
          for (let X = 0; X < m.w; X++) { const i = ((oy + y) * c.width + ox + X) * 4, v = sz[i]; if (!v) continue; if (X < lo) lo = X; if (X > hi) hi = X; if (y > low) low = y;
            // the arm is shaded for the blue screen, so bright plastic is big there: on white the shading turns over, the same way the other five were cut
            const q = v / 252, s = arm ? Math.min(1, .62 + (1 - q) * 1.05) : Math.pow(q, .72); (ac[i] > 127 || s > .86 ? trim : base).push(X, y, s); } }
        const a = new Float32Array(base.length + trim.length); a.set(base); a.set(trim, base.length); a.n = base.length; frames.push(a); }
      b.dx = (112 - (hi + lo + 1)) / 2; b.dy = b.rows - 1 - low; b.n = m.frames; b.fps = m.fps || 12; ok(frames); };
    im.onload = ia.onload = done; im.onerror = ia.onerror = () => ok(null); im.src = m.src; ia.src = m.acc; };
  const paint = (b, k, now) => { const { ctx, p, dpr } = b, a = b.frames[b.f], n = a.length, dx = b.dx + .5, dy = b.dy + .5; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, b.cv.width, b.cv.height);
    for (let part = 0; part < 2; part++) { ctx.fillStyle = part ? DEEP : COB; ctx.beginPath();
      for (let i = part ? a.n : 0, e = part ? n : a.n; i < e; i += 3) { let x = (a[i] + dx) * p, y = (a[i + 1] + dy) * p, r = Math.max(.4, p * .5 * a[i + 2]);
        if (k < 1) { const h = ((a[i] * 73 + a[i + 1] * 151) % 97) / 97, de = a[i + 1] / b.rows * .45 + h * .25, q = Math.min(1, Math.max(0, (k - de) / .3)), o = 1 - Math.pow(1 - q, 3); if (o <= 0) continue; x += (1 - o) * (h - .5) * p * 26; y += (1 - o) * (h * 1.7 - 1.1) * p * 18; r *= .35 + .65 * o; }
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); }
      ctx.fill(); } };
  let run = false;
  const tick = now => { let any = false;
    for (const b of bots) { if (!b.frames || !b.on || !b.vis) continue; if (!b.t0) b.t0 = now; any = true;
      const el = (now - b.t0) / 1000, k = reduce ? 1 : Math.min(1, el / 1.25), f = reduce ? 0 : k < 1 ? 0 : Math.floor((el - 1.25) * b.fps) % b.n;
      if (k < 1 || f !== b.f || b.stale) { b.f = f; b.stale = false; paint(b, k, now); } }
    if (any && !reduce) requestAnimationFrame(tick); else { run = false; if (any) bots.forEach(b => { if (b.frames && b.on && b.stale) { b.stale = false; paint(b, 1, now); } }); } };
  const go = () => { if (!run) { run = true; requestAnimationFrame(tick); } };
  const still = b => { const c = b.cv; c.classList.add('dotbot'); c.dataset.bot = c.dataset.still; c.dataset.tone = 'ink'; c.dataset.anim = 'static'; window.FerraDots && window.FerraDots.draw(c); };
  const sprite = b => b.name === 'hero-arm-loop' ? window.FERRA_ARM : (window.FERRA_SEQ || {})[b.name + '-ink'];
  const start = b => { const m = sprite(b); if (!m) return b.tries > 40 ? still(b) : (b.tries = (b.tries || 0) + 1, setTimeout(() => start(b), 250)); decode(b, m, fr => { if (!fr) return still(b); b.frames = fr; b.f = 0; size(b); b.stale = true; go(); }); };
  const fetchAll = () => { bots.forEach((b, i) => { if (b.name === 'hero-arm-loop') return (window.requestIdleCallback || setTimeout)(() => start(b), { timeout: 400 }); const s = document.createElement('script'); s.src = 'media/dots/loops/' + b.name + '-ink.js'; s.onload = () => (window.requestIdleCallback || setTimeout)(() => start(b), { timeout: 400 }); s.onerror = () => still(b); document.head.appendChild(s); }); };
  bots.forEach(size);
  const near = new IntersectionObserver(es => { if (!es.some(en => en.isIntersecting)) return; near.disconnect(); fetchAll(); }, { rootMargin: '1200px' }); near.observe(figs[0]);
  if (reduce) figs.forEach(f => f.classList.add('h-on')); else figs.forEach(f => f.classList.add('h-wait'));
  const see = new IntersectionObserver(es => es.forEach(en => { const b = bots[figs.indexOf(en.target)]; b.vis = en.isIntersecting;
    if (en.isIntersecting && !b.on) { const cols = innerWidth <= 680 ? 2 : innerWidth <= 1060 ? 3 : 6, k = figs.indexOf(en.target) % cols; setTimeout(() => { b.on = 1; b.t0 = 0; en.target.classList.remove('h-wait'); en.target.classList.add('h-on'); go(); }, reduce ? 0 : k * 130); }
    if (en.isIntersecting) go(); }), { threshold: .25 });
  figs.forEach(f => see.observe(f));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { bots.forEach(size); go(); }, 140); });
})();

// The world's work film: fetched when the section is near and played only while it is on screen. Reduced motion keeps the poster.
// The section arrives under the film's darkened stage. Once it has reached the top of the screen its picture and question come up out of black, in place, and the one line follows.
(() => {
  const w = document.querySelector('.h-world'), v = w && w.querySelector('.h-wf'); if (!v || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = w.querySelector('.h-wv'), line = w.querySelector('.h-ws'); let last = -1, lastL = -1;
  w.classList.add('h-wj');
  const fade = () => { const t = -w.getBoundingClientRect().top / innerHeight, k = Math.min(1, Math.max(0, t / .13)), l = Math.min(1, Math.max(0, (t - .06) / .13));
    if (k !== last) { last = k; stage.style.opacity = k.toFixed(3); }
    if (l !== lastL) { lastL = l; line.style.opacity = l.toFixed(3); line.style.transform = l < 1 ? `translateY(${((1 - l) * 16).toFixed(1)}px)` : ''; } };
  fade(); addEventListener('scroll', fade, { passive: true }); addEventListener('resize', fade);
  v.muted = true;
  const near = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; near.disconnect(); v.preload = 'auto'; }, { rootMargin: '900px' });
  near.observe(v);
  new IntersectionObserver(es => { if (es[0].isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); }, { threshold: .01 }).observe(v);
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
// of age against asking price, the line of typical prices draws, the field collapses into one dot on the chosen robot's likely sale price, the dot grows into that price,
// grows again to what one new arm costs, then breaks into 50 dots that open into the 50 robots of the example loan. The running total counts up by one robot's cost as each opens,
// and down by one robot's cost as each of the 15 the company pays for dims, so the reader leaves on the real size of the loan. The picker on the first screen sets the used price.
(() => {
  const film = document.querySelector('.h-film'), stick = film && film.querySelector('.h-stick'); if (!film) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = film.querySelector('.h-cv'), ctx = cv.getContext('2d'), probe = film.querySelector('.h-probe');
  const $ = s => film.querySelector(s), b1 = $('.h-b1'), b2 = $('.h-b2'), b3 = $('.h-b3'), b4 = $('.h-b4'), b5 = $('.h-b5'), b6 = $('.h-b6'), axis = $('.h-axis'), n0 = $('.h-n0'), totEl = $('.h-tot'), totV = totEl.querySelector('b'), tagEl = $('.h-tag'), gl0 = $('.h-gl0'), gl1 = $('.h-gl1'), tipEl = $('.h-tip');
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, seg = (s, a, b) => clamp((s - a) / (b - a)), lerp = (a, b, t) => a + (b - a) * t;
  const io3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out3 = t => 1 - Math.pow(1 - t, 3), in2 = t => t * t;
  // the timeline, in screens scrolled. The film's height in p-home.css is the end of this plus the 125 the next section overlaps it by.
  const T = { slow: [0, .12], gather: [.12, .42], cam: [.07, .44], b1: [.45, .546, .787, .865], fly: [.807, 1.115], axis: [.922, 1.038], b2: [.961, 1.057, 1.25, 1.327], curve: [1.038, 1.173],
    fall: [1.27, 1.462], axisOut: [1.289, 1.443], grow: [1.405, 1.559], b3: [1.443, 1.539, 1.694, 1.752], cost: [1.713, 1.867], b4: [1.752, 1.848, 1.964, 2.022], burst: [1.944, 2.176], open: [2.06, 2.311], b5: [2.022, 2.118, 2.311, 2.369],
    loan: [2.33, 2.523], b6: [2.349, 2.446, 2.716, 2.793], end: [2.716, 2.87], dim: [2.716, 2.87] };
  const RESTS = [[.498, 0], [.98, .73], [1.366, 1.173], [1.732, 1.617], [1.983, 1.906], [2.349, 2.272], [99, 2.6]];
  const BX0 = 5, BX1 = 106, BY0 = 9, BY1 = 118, HI = 125000, LO = 220;
  let autoOK = true, W = 0, H = 0, FH = 0, dpr = 1, phone = false, frames = null, nF = 96, fps = 12, t0 = 0, D = null, R = null, dirty = true, vis = true, pose = 84;
  let hero = { p: 6, r: 1000, a: 1 }, beat = { p: 6, r: 1000 }, floorY = 800, C = { l: 0, r: 1000, t: 0, b: 800 }, disc = {}, age = 12, ask = 13500, sale = 5600, loan = 3900, grid = null;
  const X = a => C.l + a / 30 * (C.r - C.l), Y = u => C.t + (Math.log(HI) - Math.log(u)) / (Math.log(HI) - Math.log(LO)) * (C.b - C.t);

  // ---------------------------------------------------------------- the price box: the only numbers baked into the page
  const tab = JSON.parse(document.getElementById('h-prices').textContent), rSel = document.getElementById('h-r'), ySel = document.getElementById('h-y'), tool = document.getElementById('h-tool');
  const saleEl = document.getElementById('h-pv'), loanEl = document.getElementById('h-lv'), whyEl = document.getElementById('h-why');
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US'), r100 = v => Math.round(v / 100) * 100;
  let shown = null, tw = 0;
  const putAll = (sel, v) => film.querySelectorAll(sel).forEach(s => s.textContent = v);
  const setBox = () => {
    const f = tab.fam[rSel.value], y = +ySel.value; age = clamp(tab.now - y, 0, 30);
    const a = f.c[age], k = tab.sk[age < 10 ? 0 : 1];   // the price tool's Expected sale rule
    ask = r100(a); sale = r100(a * k); loan = r100(a * k * tab.share);
    tool.href = `price.html#r=${f.t}&y=${y}&p=${ask}&m=${Math.round(ask * .036 / 10) * 10}`;   // every link into the tool carries a rent, 3.6% of the price a month, or the tool warns about one the reader never typed
    const say = f.s.charAt(0).toUpperCase() + f.s.slice(1);
    putAll('[data-say]', say); putAll('[data-yr]', y); putAll('[data-a]', fmt(ask)); putAll('[data-p]', fmt(sale));
    loanEl.textContent = fmt(loan);
    // the one line under the price: what it is, and either of the two honest warnings when it applies
    whyEl.textContent = tab.sale + (age < f.g[0] || age > f.g[1] ? ' We have no listings of this robot at this age, so it only follows the trend.' : '') + (age === 9 || age === 10 ? ' ' + tab.step : '');
    if (shown === null || reduce) { shown = sale; saleEl.textContent = fmt(sale); } else {
      const from = shown, st = performance.now(); cancelAnimationFrame(tw);
      const step = t => { const q = out3(clamp((t - st) / 320)); shown = lerp(from, sale, q); saleEl.textContent = fmt(q < 1 ? r100(shown) : sale); if (q < 1) tw = requestAnimationFrame(step); };
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
  const prep = () => { const n = D.rows.length; R = { n, x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), x0: new Float32Array(n), y0: new Float32Array(n), r0: new Float32Array(n), x1: new Float32Array(n), y1: new Float32Array(n), r1: new Float32Array(n), d: new Float32Array(n), o: new Float32Array(n), f: new Float32Array(n) };
    let far = 0; for (let j = 0; j < n; j++) { const q = D.rows[j], dx = q[6] - 22, dy = q[7] - 112, m = Math.hypot(dx, dy); R.d[j] = m; if (m > far) far = m; R.o[j] = ((j * 2654435761 >>> 0) % 1000) / 500 - 1; }
    for (let j = 0; j < n; j++) R.d[j] = 1 - R.d[j] / far; };   // the gripper leaves first, the base last

  // ---------------------------------------------------------------- layout
  const docTop = el => el.getBoundingClientRect().top + scrollY, docBot = el => el.getBoundingClientRect().bottom + scrollY;
  const place = (el, x, y, z = 1) => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${z.toFixed(3)})`; };
  // the small robot, the very one the 50 robots further down the page are drawn with: drawn once by dotbot.js at the size of a cell, its dots lifted to full white as that section's filter does
  let spr = null, sprCell = 0, sprOK = false;
  const robotImage = cw => { if (sprCell === cw && sprOK) return spr; const c = stick.querySelector('.h-sprite'); if (!c || !window.FerraDots) return null;
    if (sprCell !== cw) { sprCell = cw; sprOK = false; c.style.width = cw * .94 + 'px'; window.FerraDots.draw(c); }
    if (!c.width || !c.height) return null;
    const x = c.getContext('2d').getImageData(0, Math.floor(c.height / 2), c.width, 1).data; let any = false; for (let i = 3; i < x.length; i += 4) if (x[i]) { any = true; break; } if (!any) return null;
    spr = document.createElement('canvas'); spr.width = c.width; spr.height = c.height; const o = spr.getContext('2d'); o.drawImage(c, 0, 0); o.globalCompositeOperation = 'lighter'; o.drawImage(c, 0, 0); sprOK = true; return spr; };
  function layout() {
    W = stick.clientWidth; FH = stick.clientHeight; H = probe.clientHeight || FH; dpr = Math.min(2, devicePixelRatio || 1); phone = W <= 760;
    cv.width = Math.round(W * dpr); cv.height = Math.round(FH * dpr);
    const narrow = W <= 1060, cols = BX1 - BX0, rows = BY1 - BY0 + 1, stageTop = docTop(film);
    floorY = phone ? H - (H < 720 ? 54 : 62) : narrow ? H - 84 : Math.round(H * .885);
    const wrap = Math.min(W, 1200), mar = (W - wrap) / 2 + (phone ? 16 : 24);
    // the robot on the first screen stands on the floor line, beside the copy on desktop and under it on a phone
    if (W <= 900) {
      const copy = document.querySelector('.h-copy'), room = floorY - (docBot(copy) - stageTop) - 6, p = Math.min((W - 24) / cols, Math.max(150, room) / rows);
      hero = { p, r: W - 12, a: room < 120 ? .22 : 1 };
    } else {
      const p = Math.min((floorY - 84) / rows, W * .47 / cols), r = Math.min(W - 28, Math.max(W / 2 + 672, mar + Math.min(600, W * .43) + 40 + cols * p));
      hero = { p, r, a: 1 };
    }
    if (narrow) {
      const tb = b1.querySelector('.h-bt').getBoundingClientRect(), bottom = tb.height + 28 + 12, q = Math.min((W - 20) / cols, (floorY - bottom) / rows);
      beat = { p: q, r: W - (W - cols * q) / 2 };
    } else beat = { p: hero.p, r: hero.r };
    const copyEnd = (docBot(document.querySelector('.h-copy')) - stageTop) / H, b1Top = b1.querySelector('.h-bt').offsetTop / H; T.b1[0] = Math.max(.45, copyEnd - b1Top - .02); T.b1[1] = T.b1[0] + .1; RESTS[0][0] = Math.max(.6, copyEnd - b1Top - .04);
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
    // the robot's own price, under the line it stands on
    tagEl.style.transform = `translate(${(W <= 900 ? mar : Math.max(mar, hero.r - cols * hero.p)).toFixed(1)}px,${(floorY + (phone ? 7 : 11)).toFixed(1)}px)`;
    // the disc: its area follows the price, up to one new arm's cost; the smallest stays wide enough to hold its number
    const left = phone || narrow, unit = +totEl.dataset.unit, count = +totEl.dataset.robots;
    const bb = (e, top) => e.querySelector('.h-bt').getBoundingClientRect().height + top;
    const leftW = left ? W - 2 * mar : Math.min(460, W * .3);
    let top3, rightX, area;
    if (left) { rightX = W - 12; area = W - 24; top3 = Math.max(bb(b3, 28), bb(b4, 28)) + 14; const Rm = Math.min(area / 2, (H - 18 - top3) / 2); disc = { x: W / 2, y: top3 + Math.min(Rm, area / 2), R: Rm, rmin: 58 }; }
    else { rightX = Math.min(W - 28, W / 2 + 840); area = rightX - (mar + leftW + 24); const Rm = Math.min(H * .4, area / 2); disc = { x: rightX - area / 2, y: H * .5, R: Rm, rmin: 74 }; }
    disc.r0 = Math.max(disc.rmin, disc.R * Math.sqrt(sale / unit));
    n0.querySelector('b').style.fontSize = (disc.R * .36).toFixed(1) + 'px';
    // the running total: as wide as its column allows
    totV.style.fontSize = '100px'; totV.textContent = '$6,250,000'; const tf = Math.min(left ? 76 : 96, leftW / (totV.offsetWidth / 100) * .99); totV.style.fontSize = tf.toFixed(1) + 'px';
    // the 50 robots: seven columns are the loan, three are what the company pays, in the same order as the section further down
    const ASPECT = 1.13, textBot = left ? 22 + tf * 1.12 + Math.max(bb(b5, 8), bb(b6, 8)) : 0, labH = phone ? 46 : 34;
    const partK = .36, cw = Math.min(area / (10 + partK), (left ? H - 18 - labH - textBot : H - 150) / (5 * ASPECT)), ch = cw * ASPECT, gw = cw * (10 + partK), gh = ch * 5;
    const gx = left ? (W - gw) / 2 : rightX - gw, gy = left ? H - 14 - labH - gh : (H - gh) / 2 - labH / 2;
    const tt = left ? 22 : Math.max(28, gy - 6);
    stick.style.setProperty('--tt', tt.toFixed(1) + 'px'); stick.style.setProperty('--th', (tf * 1.08).toFixed(1) + 'px');
    const pack = []; for (let i = 0; i < count; i++) { const rr = Math.sqrt((i + .5) / count), th = i * 2.39996; pack.push([rr * Math.cos(th) * .9, rr * Math.sin(th) * .9]); }
    pack.sort((a, b) => a[0] - b[0]);
    const cells = [];   // the dots keep their left to right, top to bottom order on the way to the robots, so none cross
    for (let c = 0; c < 10; c++) { const col = pack.slice(c * 5, c * 5 + 5).sort((a, b) => a[1] - b[1]); for (let r = 0; r < 5; r++) cells.push({ c, r, px: col[r][0], py: col[r][1], x: gx + cw * (c + .5), y: gy + ch * (r + .5), o: ((c * 5 + r) * 2654435761 >>> 0) % 1000 / 1000 }); }
    grid = { cw, ch, part: cw * partK, cells, rd: Math.max(1.8, cw * .05), rp: disc.R * Math.sqrt(.46 / count), gx, gy, gw, gh };
    gl0.style.transform = `translate(${gx.toFixed(1)}px,${(gy + gh + 8).toFixed(1)}px)`; gl0.style.width = (cw * 7).toFixed(1) + 'px';
    gl1.style.transform = `translate(${(gx + cw * (7 + partK)).toFixed(1)}px,${(gy + gh + 8).toFixed(1)}px)`; gl1.style.width = (cw * 3).toFixed(1) + 'px';
    if (R) { const base = beat.p;
      for (let j = 0; j < R.n; j++) { const q = D.rows[j], f = rad(q[2]); R.x0[j] = beat.r - (q[6] - BX0) * beat.p; R.y0[j] = floorY - (BY1 - q[7]) * beat.p;
        R.r0[j] = base * .94 * f; R.x1[j] = X(q[5]); R.y1[j] = Y(q[2]); R.r1[j] = (phone ? 2.8 : 4.8) * Math.pow(f, .8); }
      // the chart drains into the chosen price nearest dots first, at an even rate, so the screen is never empty before the price arrives
      const by = Array.from({ length: R.n }, (_, j) => j).map(j => [Math.hypot(R.x1[j] - X(age), R.y1[j] - Y(sale)), j]).sort((a, b) => a[0] - b[0]);
      by.forEach((q, i) => { R.f[q[1]] = i / R.n; }); }
    dirty = true;
  }

  // ---------------------------------------------------------------- painting
  const scroll = () => { let s = (scrollY - docTop(film)) / (H || 1); if (s < 0) s = 0; if (reduce) { for (const r of RESTS) if (s < r[0]) { s = r[1]; break; } } return s; };
  const show = (el, a, dy) => { const v = a > .002; if (el._v !== v) { el._v = v; el.style.visibility = v ? 'visible' : 'hidden'; } el.style.opacity = a.toFixed(3); if (dy !== undefined) el.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : ''; };
  const beatA = (s, t) => { const i = seg(s, t[0], t[1]), o = seg(s, t[2], t[3]); return { a: i * (1 - o), dy: (1 - out3(i)) * 18 - in2(o) * 18 }; };
  let nNow = '', ptr = null; const n0Val = n0.querySelector('b'), axLate = [axis.querySelector('.h-l0'), axis.querySelector('.h-l1'), axis.querySelector('.h-al')];
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
    const fly = seg(s, ...T.fly), fall = seg(s, ...T.fall), grow = seg(s, ...T.grow);
    // the one line: the robot stands on it, then it is the chart's axis. It goes when the chart goes.
    const lineA = 1 - seg(s, ...T.axisOut);
    if (lineA > 0) { ctx.fillStyle = `rgba(255,255,255,${(.55 * lineA).toFixed(3)})`; ctx.fillRect(0, floorY, W, 1); }
    // listing dots
    let hitOK = false;
    const mx = X(age), my = Y(sale);
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
        if (fall > 0) { const de = R.f[j] * .66, t = in2(seg(fall, de, de + .34)); if (t >= 1) { arrived++; R.x[j] = -99; R.r[j] = 0; continue; } x = lerp(x, mx, t); y = lerp(y, my, t); r = lerp(r, 1.4, t); }
        R.x[j] = x; R.y[j] = y; R.r[j] = r;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
      hitOK = k > .9 && fall === 0;
      // the auction results, square so they are never mistaken for a listing
      const au = seg(s, T.curve[0], T.curve[1]) * (1 - seg(s, ...T.axisOut));
      if (au > 0) { ctx.fillStyle = `rgba(14,22,38,${au.toFixed(3)})`; const z = phone ? 7 : 10; D.aucs.forEach(q => ctx.fillRect(X(q[5]) - z / 2, Y(q[1]) - z / 2, z, z)); }
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
    // one dot, one price, one new arm's cost, then 50 robots. The number is glued to its disc and scales with it, so the disc is never blank.
    const cost = io3(seg(s, ...T.cost)), burst = seg(s, ...T.burst), open = seg(s, ...T.open), loanK = seg(s, ...T.loan);
    const m0 = (phone ? 16 : 26) + 3, ge = io3(grow), dcx = lerp(mx, disc.x, ge), dcy = lerp(my, disc.y, ge), dr = lerp(m0, lerp(disc.r0, disc.R, cost), ge), gone = seg(burst, 0, .12);
    if (grow > 0 && gone < 1) { ctx.fillStyle = `rgba(255,255,255,${(1 - gone).toFixed(3)})`; ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, 6.2832); ctx.fill(); }
    let opened = 0, dimmed = 0;
    if (burst > 0 && grid) { const { cells, part, rd, rp, cw } = grid, im = robotImage(cw), iw = im ? im.width / dpr : 0, ih = im ? im.height / dpr : 0; let late = 0;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 50; i++) { const q = cells[i], de = .04 + q.o * .3, t = io3(seg(burst, de, de + .62)), hx = disc.x + q.px * disc.R, hy = disc.y + q.py * disc.R;
        // the last three columns are the 15 robots the company pays for: they dim one at a time, each taking one robot's cost off the total, and move aside together
        let al = 1, off = 0; if (q.c >= 7) { const d = seg(loanK, late / 15 * .72, late / 15 * .72 + .22); late++; if (d > .5) dimmed++; al = lerp(1, .3, d); off = part * io3(seg(loanK, .6, 1)); }
        const tx = q.x + off, ty = q.y, u = 1 - t, bx = (hx + tx) / 2 + (hy - ty) * .16, by = (hy + ty) / 2 + (tx - hx) * .1, x = u * u * hx + 2 * u * t * bx + t * t * tx, y = u * u * hy + 2 * u * t * by + t * t * ty;
        const sd = (q.c + q.r) / 13 * .5, o = im ? out3(seg(open, sd, sd + .5)) : 0; if (seg(open, sd, sd + .5) > .3) opened++;
        if (o < 1) { const rr = lerp(rp, rd * 2.2, t) * (1 - o); ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill(); }
        if (o > 0) { const z = .5 + .5 * o; ctx.globalAlpha = al * o; ctx.drawImage(im, x - iw * z / 2, y - ih * z / 2, iw * z, ih * z); } }
      ctx.globalAlpha = 1; }
    // the running total, one robot's cost at a time
    const totA = seg(s, T.b5[0], T.b5[1]) * (1 - seg(s, T.b6[2], T.b6[3]));
    if (totA > 0) { const v = fmt(+totEl.dataset.unit * (Math.max(1, opened) - dimmed)); if (totV.textContent !== v) totV.textContent = v; }
    show(totEl, totA);
    const glA = seg(loanK, .5, .9) * (1 - seg(s, T.b6[2], T.b6[3])); show(gl0, glA); show(gl1, glA);
    // the film closes on black, so the next section's picture comes up out of it with no edge
    const dark = seg(s, ...T.dim); if (dark > 0) { ctx.fillStyle = `rgba(4,6,12,${dark.toFixed(3)})`; ctx.fillRect(0, 0, W, FH); }
    show(tagEl, reduce ? (s < .3 ? 1 : 0) : 1 - seg(s, 0, .14));
    // page text
    const a1 = beatA(s, T.b1), a2 = beatA(s, T.b2), a3 = beatA(s, T.b3), a4 = beatA(s, T.b4), a5 = beatA(s, T.b5), a6 = beatA(s, T.b6);
    show(b1, a1.a, a1.dy); show(b2, a2.a, a2.dy); show(b3, a3.a, a3.dy); show(b4, a4.a, a4.dy); show(b5, a5.a, a5.dy); show(b6, a6.a, a6.dy);
    show(axis, seg(s, ...T.axis) * (1 - seg(s, ...T.axisOut)));
    const cu2 = seg(s, T.curve[1] - .15, T.curve[1]); axLate.forEach(e => e.style.opacity = cu2);
    const nv = seg(grow, .04, .3) * (1 - gone);
    if (nv > 0) { const k2 = lerp(1.32, 1, cost), ds = dr / disc.R * k2; place(n0, dcx, dcy, ds); const v = cost > 0 ? fmt(cost >= 1 ? +totEl.dataset.unit : r100(Math.exp(lerp(Math.log(sale), Math.log(+totEl.dataset.unit), cost)))) : fmt(sale); if (nNow !== v) { nNow = v; n0Val.textContent = v; } }
    show(n0, nv);
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

// What if a loan goes bad: one button shows the same 50 robots at the middle auction sale, and back. The sentence beside it says the same thing without it.
(() => {
  const b = document.getElementById('h-lowb'), sp = document.getElementById('h-split'); if (!b || !sp) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, left = sp.querySelector('.h-sa .h-sl'), base = left.innerHTML, low = left.dataset.low;
  b.hidden = false;
  b.addEventListener('click', () => { const on = !sp.classList.contains('h-lo'); sp.classList.add('h-tch', 'in-view'); sp.classList.toggle('h-lo', on); left.innerHTML = on ? low : base; b.textContent = on ? 'Back to our example' : 'Show that on the robots';
    const top = sp.getBoundingClientRect().top; if (top < 72) scrollBy({ top: top - 84, behavior: reduce ? 'auto' : 'smooth' }); });
})();
