// Home page behaviour: the hero robots (one painter for still and moving dot robots, so the scan line and the pointer reach the
// moving frames too), the vision row, the real-listing chart tooltips, the step-synced term sheet, the two type-only tabs with the
// two fields that drive the small live preview, the price board scan and hairlines, and dot robots standing on hairlines. Runs after dotbot.js and site.js, before DOMContentLoaded.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
  const D = window.FERRA_DOTS || {}, SEQ = window.FERRA_SEQ || {};
  // dot names fall back the way dotbot.js does: drop -l, then the names below, then the coarse grid's own fallback
  const FALL = { cell: 'arm2', cartons: 'pallet', 'cell-loop': 'cell', 'cobot-loop': 'cobot', 'arm2-loop': 'arm2', 'pallet-loop': 'pallet', 'arm-loop': 'arm' };
  const pick = n => { const seen = new Set(); while (n && !seen.has(n)) { seen.add(n); if (D[n]) return { name: n, b: D[n] };
    if (n.endsWith('-l')) n = n.slice(0, -2); else n = FALL[n] || (n.endsWith('-s') && FALL[n.slice(0, -2)] ? FALL[n.slice(0, -2)] + '-s' : null); } return null; };

  // moving robots: decode a sprite into one point list per frame (the same format dotbot.js reads)
  const seqCache = {};
  const loadSeq = name => seqCache[name] || (seqCache[name] = new Promise((ok, no) => {
    const m = SEQ[name]; if (!m) return no();
    const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const per = m.per || Math.floor(im.width / m.w), frames = [];
      for (let f = 0; f < m.frames; f++) { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h, pts = [];
        for (let y = 0; y < m.h; y++) for (let X = 0; X < m.w; X++) { const i = ((oy + y) * c.width + ox + X) * 4, v = sz[i]; if (v) pts.push({ x: X, y, s: v / 252, acc: ac[i] > 127 ? 1 : 0, r: ((X * 73 + y * 151) % 97) / 97 }); }
        frames.push(pts); }
      ok({ w: m.w, h: m.h, fps: m.fps || 12, frames }); };
    im.onload = ia.onload = done; im.onerror = ia.onerror = () => no(); im.src = m.src; ia.src = m.acc;
  }));

  // ---------------------------------------------------------------- H1 hero
  // Each hero canvas names a chain of robots (data-chain): a moving dot sequence first, then stills. All three robots are drawn here
  // so one scan line passes over them and brightens the dots of whatever frame is showing, and the pointer can appraise them.
  const stage = document.querySelector('.h-stage');
  if (stage) {
    const scanEl = stage.querySelector('.h-scan');
    const toPts = b => b.d.split(';').map(s => { const [x, y, L, A, acc, ed] = s.split(',').map(Number); return { x, y, L: L / 100, A: A / 100, acc, ed: ed / 100, r: Math.random() }; });
    const bots = [];
    stage.querySelectorAll('.h-bot').forEach(w => {
      const cv = w.querySelector('canvas'); cv.classList.remove('dotbot');
      const o = { w, cv, delay: +w.dataset.delay || 0, mover: w.classList.contains('h-mover'), ctx: cv.getContext('2d'), live: true, ready: false };
      const chain = (cv.dataset.chain || cv.dataset.bot).split(/\s+/);
      const setStill = () => { for (const n of chain) { if (n.endsWith('-loop')) continue; const r = pick(n); if (r) { o.b = r.b; o.pts = toPts(r.b); o.ready = true; o.name = r.name; return true; } } return false; };
      const setSeq = s => { o.b = { w: s.w, h: s.h }; o.seq = s; o.pts = s.frames[0]; o.ready = true; };
      const shape = () => { cv.style.aspectRatio = o.b.w + '/' + o.b.h; w.style.setProperty('--ar', o.b.w + '/' + o.b.h); o.heat = new Float32Array(o.b.w * o.b.h); fit1(o); };
      const loops = reduce ? [] : chain.filter(n => n.endsWith('-loop') && SEQ[n]);
      // try each moving robot in turn; while they load (and if every one fails) the first still stands in
      setStill(); if (o.ready) shape();
      const next = k => { if (k >= loops.length) return; loadSeq(loops[k]).then(s => { setSeq(s); o.name = loops[k]; cv.dataset.bot = loops[k]; shape(); o.live = true; }, () => next(k + 1)); };
      next(0);
      bots.push(o);
    });
    const ease = t => 1 - Math.pow(1 - t, 3), smooth = t => t * t * (3 - 2 * t);
    const W = [255, 255, 255], C = [150, 232, 255];
    const size = p => p.s !== undefined ? p.s : p.A * Math.min(1, .28 + .72 * Math.pow(p.L, .9) + p.ed * .35);
    function fit1(o) { const cw = o.cv.clientWidth; if (!cw || !o.b) return; const dpr = Math.min(2, devicePixelRatio || 1); o.pitch = cw / o.b.w; o.cw = cw; o.ch = o.pitch * o.b.h;
      o.cv.width = Math.round(cw * dpr); o.cv.height = Math.round(o.ch * dpr); o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o.live = true; }
    const fit = () => bots.forEach(fit1);
    // pointer appraisal: dots within 36px of the pointer grow 1.35x and turn cyan, easing back over about 400ms
    let px = -1e4, py = -1e4, lastT = 0;
    if (hover && !reduce) { stage.addEventListener('pointermove', ev => { const r = stage.getBoundingClientRect(); px = ev.clientX - r.left; py = ev.clientY - r.top; });
      stage.addEventListener('pointerleave', () => { px = py = -1e4; }); }
    // sy: scan line position in dot rows of this robot (null when no scan). dt: seconds since the last frame.
    const paint = (o, el, sy, dt, ox0, oy0) => {
      if (!o.ready || !o.pitch) return false;
      const { ctx, pitch, cw, ch } = o; ctx.clearRect(0, 0, cw, ch);
      const t = el - o.delay, assembling = !reduce && t < 2.2; let warm = false;
      // a moving robot assembles from its first frame, then plays at its own rate from where the loop stands
      let list = o.pts;
      if (o.seq) { const f = assembling || reduce ? 0 : Math.floor((t - 2.2) * o.seq.fps) % o.seq.frames.length; list = o.seq.frames[f]; }
      const k8 = Math.min(1, dt / .13), heat = o.heat, bw = o.b.w;
      for (const p of list) {
        const dl = assembling ? p.y / o.b.h * .7 + p.r * .5 : 0, k = assembling ? ease(Math.min(1, Math.max(0, (t - dl) / .9))) : 1;
        if (k <= 0) continue;
        const cx = (p.x + .5) * pitch, cy = (p.y + .5) * pitch, hi = p.y * bw + p.x;
        const near = Math.hypot(cx + ox0 - px, cy + oy0 - py) < 36 ? 1 : 0;
        let hv = heat[hi] += (near - heat[hi]) * k8; if (hv > .01) warm = true; else hv = heat[hi] = 0;
        let I = 0;
        if (sy !== null) { const d = p.y + .5 - sy; I = Math.max(0, 1 - Math.abs(d) / 3, d < 0 ? Math.max(0, 1 + d / 18) * .28 : 0); }
        const s = size(p), rad = pitch * .44 * s * (1 + I * .7) * (1 + hv * .35) * (.35 + .65 * k);
        const ox = (1 - k) * (p.r - .5) * pitch * 26, oy = (1 - k) * (p.r * 1.7 - 1.1) * pitch * 18;
        const base = p.acc ? C : W, m = Math.min(1, Math.max(I * 1.3, hv)) * (p.acc ? 0 : .85);
        const c0 = base[0] + (C[0] - base[0]) * m, c1 = base[1] + (C[1] - base[1]) * m, c2 = base[2] + (C[2] - base[2]) * m;
        ctx.fillStyle = `rgba(${c0 | 0},${c1 | 0},${c2 | 0},${Math.min(1, (.55 + .45 * s) * k + I * .45 + hv * .3)})`;
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, Math.max(.35, rad), 0, 6.283); ctx.fill();
      }
      return assembling || warm || (!!o.seq && !reduce);
    };
    fit();
    const SCAN_AT = 3.0, PERIOD = 6, SWEEP = 3.2;
    let t0 = null, raf = 0, running = false, tPause = 0;
    const frame = t => {
      if (t0 === null) t0 = t; const el = (t - t0) / 1000, dt = lastT ? Math.min(.1, (t - lastT) / 1000) : .016; lastT = t;
      const sr = stage.getBoundingClientRect(), H = sr.height, Wd = sr.width;
      // mover: drives up and back along the floor grid (30 degrees), holding at each end
      for (const o of bots) if (o.mover) {
        let s = 0; if (!reduce && el > 3.2) { const c = (el - 3.2) % 11; s = c < 1 ? 0 : c < 4.5 ? smooth((c - 1) / 3.5) : c < 6.5 ? 1 : c < 10 ? 1 - smooth((c - 6.5) / 3.5) : 0; }
        const d = s * Wd * .07; o.w.style.transform = `translate(${(d * .866).toFixed(1)}px,${(d * .5).toFixed(1)}px)`;
      }
      // scan line: sweeps down the whole stage, once every PERIOD seconds
      let ly = null; if (!reduce && el > SCAN_AT) { const ph = (el - SCAN_AT) % PERIOD; if (ph < SWEEP) ly = (-.04 + 1.08 * ph / SWEEP) * H; }
      scanEl.style.opacity = ly === null ? 0 : 1; if (ly !== null) scanEl.style.transform = `translateY(${ly.toFixed(1)}px)`;
      let busy = false;
      for (const o of bots) {
        if (!o.ready) { busy = true; continue; }
        const cr = o.cv.getBoundingClientRect(), top = cr.top - sr.top, sy = ly === null ? null : (ly - top) / o.pitch;
        const near = sy !== null && sy > -4 && sy < o.b.h + 20, pin = px > cr.left - sr.left - 40 && px < cr.right - sr.left + 40 && py > top - 40 && py < cr.bottom - sr.top + 40;
        if (el - o.delay < 2.4 || near || o.live || pin || o.seq) { const a = paint(o, el, near ? sy : null, dt, cr.left - sr.left, top); o.live = near || a; busy = busy || a; }
      }
      if (!reduce || busy) raf = requestAnimationFrame(frame); else running = false;
    };
    const play = () => { if (running) return; running = true; lastT = 0; if (t0 !== null) t0 += performance.now() - tPause; raf = requestAnimationFrame(frame); };
    const pause = () => { if (!running) return; running = false; tPause = performance.now(); cancelAnimationFrame(raf); };
    // the moving robots pause with the whole stage when it leaves the screen or the tab hides, and resume on the same frame
    new IntersectionObserver(es => es.forEach(en => en.isIntersecting && !document.hidden ? play() : pause())).observe(stage);
    document.addEventListener('visibilitychange', () => document.hidden ? pause() : stage.getBoundingClientRect().bottom > 0 && play());
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); if (!running) bots.forEach(o => paint(o, 99, null, 1, 0, 0)); }, 150); });
  }

  // ---------------------------------------------------------------- H4 every dot is a real listing: tooltips
  // One tooltip for the visible chart. Desktop: the nearest listing within 14px of the pointer. Phone: tap a dot. The tooltip stays
  // open while the pointer is on it so its link can be followed.
  const plot = document.querySelector('.h-plot'), ptsEl = document.getElementById('h-pts');
  if (plot && ptsEl) {
    const L = JSON.parse(ptsEl.textContent), tip = plot.querySelector('.h-tip'), tb = tip.querySelector('b'), ts = tip.querySelector('span'), ta = tip.querySelector('a');
    const card = plot.closest('.h-lcard');
    let cur = null, hideT = 0;
    const svg = () => [...plot.querySelectorAll('svg.h-sc')].find(s => s.getBoundingClientRect().width > 0);
    const show = c => {
      clearTimeout(hideT); if (cur === c) return; if (cur) cur.classList.remove('on'); cur = c; c.classList.add('on');
      const [title, year, usd, src, url] = L[+c.dataset.i];
      tb.textContent = title; ts.textContent = `Built ${year}. Asking ${fmt(usd)}. ${src}`; ta.href = url;
      tip.hidden = false;
      const pr = plot.getBoundingClientRect(), cr = c.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = cr.left - pr.left + cr.width / 2 - tw / 2, y = cr.top - pr.top - th - 12;
      if (y < -20) y = cr.bottom - pr.top + 12;
      x = Math.max(-8, Math.min(pr.width - tw + 8, x));
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    const hide = () => { if (cur) cur.classList.remove('on'); cur = null; tip.hidden = true; };
    const later = () => { clearTimeout(hideT); hideT = setTimeout(hide, 260); };
    const nearest = (ev, max) => {
      const s = svg(); if (!s) return null; const m = s.getScreenCTM(); if (!m) return null;
      let best = null, bd = max * max;
      for (const c of s.querySelectorAll('.h-pts circle')) {
        const x = m.a * c.cx.baseVal.value + m.e, y = m.d * c.cy.baseVal.value + m.f, d = (x - ev.clientX) ** 2 + (y - ev.clientY) ** 2;
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    };
    plot.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse' || tip.contains(ev.target)) return; const c = nearest(ev, 14); plot.classList.toggle('h-hov', !!c); c ? show(c) : later(); });
    plot.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') later(); });
    tip.addEventListener('pointerenter', () => clearTimeout(hideT));
    plot.addEventListener('click', ev => { if (tip.contains(ev.target)) return; const c = nearest(ev, 22); c ? show(c) : hide(); });
    document.addEventListener('click', ev => { if (!plot.contains(ev.target)) hide(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hide(); });
    // after the fall-in finishes, hover changes are instant
    if (card) new IntersectionObserver((es, ob) => es.forEach(en => { if (en.isIntersecting) { ob.disconnect(); setTimeout(() => card.classList.add('h-done'), reduce ? 0 : 2400); } }), { threshold: .2 }).observe(card);
  }

  // ---------------------------------------------------------------- H5 how a fleet loan works
  // site.js moves the active step; the sheet follows it so the lender row appears from step 2 and the prices line on step 4
  const live = document.querySelector('.h-live'), steps = [...document.querySelectorAll('.h-steps .step')];
  if (live && steps.length) {
    const sync = () => { const k = steps.findIndex(s => s.classList.contains('on')); live.dataset.step = Math.max(0, k); };
    const mo = new MutationObserver(sync); steps.forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] })); sync();
    steps.forEach(s => s.addEventListener('click', () => s.parentElement.classList.add('h-man')));
  }

  // ---------------------------------------------------------------- H6 both sides: type-only tabs
  // Without this script both panels show one after the other. With it, the two names become tabs (click, arrow keys, Home, End);
  // the inactive panel is inert so its link cannot take focus while hidden.
  const tabs = document.querySelector('.h-tabs');
  if (tabs) {
    const tbs = [...tabs.querySelectorAll('[role="tab"]')], pans = [...tabs.querySelectorAll('[role="tabpanel"]')];
    const sel = (k, focus) => {
      tbs.forEach((t, j) => { const on = j === k; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
      pans.forEach((p, j) => { const on = j === k; p.classList.toggle('on', on); p.inert = !on; });
      if (focus) tbs[k].focus();
    };
    tbs.forEach((t, k) => {
      t.addEventListener('click', () => sel(k));
      t.addEventListener('keydown', ev => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
        if (step) { ev.preventDefault(); sel((k + step + tbs.length) % tbs.length, true); }
        else if (ev.key === 'Home') { ev.preventDefault(); sel(0, true); }
        else if (ev.key === 'End') { ev.preventDefault(); sel(tbs.length - 1, true); }
      });
    });
    tabs.classList.add('h-js'); sel(0);
  }

  // ---------------------------------------------------------------- H7 robot companies: two fields drive the small live preview
  // Clamps as on the fleets page: robots 1 to 1,000, price $1,000 to $1,000,000. Above the top the value clamps at once and is written
  // back; below the floor it settles when the field is left; a field with no digits keeps its last good value. Each valid change
  // calls FerraApp.preview (shared); until the shared group lands it, the local stand-in panel's three figures are rewritten here.
  const n = document.getElementById('h-n'), p = document.getElementById('h-p'), fp = document.getElementById('fp-home'), msg = document.getElementById('h-msg');
  if (n && p && fp) {
    const digits = el => el.value.replace(/[^0-9]/g, '');
    const lim = el => [+el.dataset.min, +el.dataset.max];
    const clamp = (el, v) => { const [lo, hi] = lim(el); return Math.min(hi, Math.max(lo, v)); };
    const last = new Map([[n, 50], [p, 125000]]), val = el => last.get(el);
    const comma = el => { el.value = val(el).toLocaleString('en-US'); };
    let mt;
    const say = el => { if (!msg) return; msg.textContent = el === n ? 'Up to 1,000 robots' : 'Between $1,000 and $1,000,000'; msg.classList.add('on'); el.setAttribute('aria-invalid', 'true');
      clearTimeout(mt); mt = setTimeout(() => { msg.classList.remove('on'); [n, p].forEach(x => x.removeAttribute('aria-invalid')); }, 4000); };
    const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
    let sent = '50|125000';
    const upd = () => {
      const N = val(n), P = val(p), key = N + '|' + P; if (key === sent) return; sent = key;
      const A = window.FerraApp;
      if (A && A.preview && !fp.classList.contains('h-fpl')) { A.preview(fp, { rid: 'arm', n: N, price: P }); return; }
      const V = N * P; fp.querySelectorAll('.fp-k dd').forEach((d, i) => { d.textContent = money([V, V * .7, V * .3][i]); });
    };
    [n, p].forEach(el => {
      el.addEventListener('input', () => {
        const d = digits(el); if (d !== el.value) el.value = d;
        if (!d) return;   // no digits: keep the last good value until the field is left
        const v = +d, [lo, hi] = lim(el);
        if (v > hi) { el.value = String(hi); last.set(el, hi); say(el); }
        else last.set(el, Math.max(lo, v));
        upd();
      });
      el.addEventListener('focus', () => { el.value = digits(el); el.select(); });
      el.addEventListener('blur', () => {
        const d = digits(el);
        if (d) { const v = +d, c = clamp(el, v); if (c !== v) say(el); last.set(el, c); }
        comma(el); upd();
      });
    });
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

  // ---------------------------------------------------------------- H7 price board: hovering a row runs a scan over its robot
  document.querySelectorAll('.h-br').forEach(row => {
    const cv = row.querySelector('canvas.dotbot'); if (!cv || reduce) return;
    const on = () => { cv.dataset.scan = '1'; cv.dataset.anim = 'static'; window.FerraDots && FerraDots.draw(cv); };
    const off = () => { delete cv.dataset.scan; cv.dataset.anim = 'static'; window.FerraDots && FerraDots.draw(cv); };
    row.addEventListener('pointerenter', on); row.addEventListener('pointerleave', off);
    row.addEventListener('focus', on); row.addEventListener('blur', off);
  });


  // ---------------------------------------------------------------- dot robots standing on a hairline
  // Robots on a baseline are sized by height: each canvas gets the width that makes its dot grid exactly as tall as its slot, then
  // is pulled down by its empty bottom rows so its lowest dots touch the line.
  const grid = {};
  const info = name => { if (name in grid) return grid[name]; const r = pick(name); if (!r) return grid[name] = null;
    let my = 0, ny = 1e9, nx = 1e9, mx = 0; for (const s of r.b.d.split(';')) { const [x, y] = s.split(',').map(Number); if (y > my) my = y; if (y < ny) ny = y; if (x < nx) nx = x; if (x > mx) mx = x; }
    return grid[name] = { w: r.b.w, h: r.b.h, rows: r.b.h - 1 - my, my, ny, nx, mx }; };

  // vision row and price board: each robot's visible dots stand exactly data-th px tall (data-thm on phones). dotbot.js sizes a robot
  // by its box height with the empty rows under the feet already cut, so the box is made taller by the empty rows above the head and
  // pulled up by the same amount: the price and its tick then sit right on the robot's top dot.
  const fitH = () => document.querySelectorAll('.h-vs .rs-bot[data-th], .h-bst .rs-bot[data-th]').forEach(box => {
    const cv = box.querySelector('canvas'), g = cv && info(cv.dataset.bot); if (!g) return;
    const phone = innerWidth <= (box.closest('.h-vs') ? 680 : 720), T = +(phone ? box.dataset.thm : box.dataset.th), rows = g.my + 1, Hb = T * rows / (rows - g.ny);
    box.style.height = Hb.toFixed(2) + 'px'; box.style.marginTop = -(Hb - T).toFixed(2) + 'px';
  });
  fitH();
  // price board: each hairline is the robot's visible width plus 24px
  if (window.ResizeObserver) { const ro = new ResizeObserver(es => es.forEach(en => { const cv = en.target, w = cv.getBoundingClientRect().width, g = info(cv.dataset.bot); if (!w) return;
      const vw = g ? w * (g.mx - g.nx + 1) / g.w : w; cv.closest('.h-bst').style.setProperty('--rw', vw.toFixed(1) + 'px'); }));
    document.querySelectorAll('.h-bst canvas').forEach(cv => ro.observe(cv)); }
  // the closing trio: robots on a hairline sized by height (its canvases sit in plain spans, so dotbot.js does not size them)
  const settle = () => document.querySelectorAll('.h-tb canvas').forEach(cv => {
    const g = info(cv.dataset.bot); if (!g) return;
    const slot = cv.closest('.h-tb') || cv.closest('.rs-bot'); const H = slot.clientHeight; if (!H) return;
    const avail = (cv.closest('.rstage') || slot).clientWidth || 1e4, wd = Math.min(avail, H * g.w / g.h), pitch = wd / g.w;
    cv.style.width = wd + 'px'; cv.style.height = g.h * pitch + 'px'; cv.style.marginBottom = -(g.rows * pitch) + 'px';
  });
  settle(); let st; addEventListener('resize', () => { clearTimeout(st); st = setTimeout(() => { fitH(); settle(); }, 120); });
})();
