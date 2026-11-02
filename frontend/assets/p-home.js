// Home page behaviour: the hero robots with one appraisal scan across the stage, the step-synced term sheet,
// the mini fleet sizer and the price report tabs. Runs after dotbot.js and site.js, before DOMContentLoaded.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  // ---------------------------------------------------------------- hero
  // The hero robots come from dotbot() markup, but are drawn here so a single scan line can pass over all three
  // and brighten each robot's dots as it crosses them. They are taken out of dotbot.js before it starts.
  const stage = document.querySelector('.h-stage'), D = window.FERRA_DOTS || {};
  if (stage) {
    const scanEl = stage.querySelector('.h-scan');
    const bots = [...stage.querySelectorAll('.h-bot')].map(w => {
      const cv = w.querySelector('canvas'); cv.classList.remove('dotbot');
      const b = D[cv.dataset.bot]; if (!b) return null;
      const pts = b.d.split(';').map(s => { const [x, y, L, A, acc, ed] = s.split(',').map(Number); return { x, y, L: L / 100, A: A / 100, acc, ed: ed / 100, r: Math.random() }; });
      return { w, cv, b, pts, delay: +w.dataset.delay || 0, mover: w.classList.contains('h-mover'), ctx: cv.getContext('2d'), live: true };
    }).filter(Boolean);
    const ease = t => 1 - Math.pow(1 - t, 3), smooth = t => t * t * (3 - 2 * t);
    const W = [255, 255, 255], C = [150, 232, 255];
    const size = p => p.A * Math.min(1, .28 + .72 * Math.pow(p.L, .9) + p.ed * .35);
    const fit = () => bots.forEach(o => { const cw = o.cv.clientWidth; if (!cw) return; const dpr = Math.min(2, devicePixelRatio || 1); o.pitch = cw / o.b.w; o.cw = cw; o.ch = o.pitch * o.b.h;
      o.cv.width = Math.round(cw * dpr); o.cv.height = Math.round(o.ch * dpr); o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o.live = true; });
    // sy: scan line position in dot rows of this robot (null when no scan). k: assembly time for this robot in seconds.
    const paint = (o, el, sy) => {
      const { ctx, pts, pitch, cw, ch } = o; ctx.clearRect(0, 0, cw, ch);
      const t = el - o.delay, assembling = !reduce && t < 2.2;
      for (const p of pts) {
        const dl = assembling ? p.y / o.b.h * .7 + p.r * .5 : 0, k = assembling ? ease(Math.min(1, Math.max(0, (t - dl) / .9))) : 1;
        if (k <= 0) continue;
        let I = 0;
        if (sy !== null) { const d = p.y + .5 - sy; I = Math.max(0, 1 - Math.abs(d) / 3, d < 0 ? Math.max(0, 1 + d / 18) * .28 : 0); }
        const s = size(p), rad = pitch * .44 * s * (1 + I * .7) * (.35 + .65 * k);
        const ox = (1 - k) * (p.r - .5) * pitch * 26, oy = (1 - k) * (p.r * 1.7 - 1.1) * pitch * 18;
        const base = p.acc ? C : W, m = Math.min(1, I * 1.3) * (p.acc ? 0 : .85);
        const c0 = base[0] + (C[0] - base[0]) * m, c1 = base[1] + (C[1] - base[1]) * m, c2 = base[2] + (C[2] - base[2]) * m;
        ctx.fillStyle = `rgba(${c0 | 0},${c1 | 0},${c2 | 0},${Math.min(1, (.55 + .45 * s) * k + I * .45)})`;
        ctx.beginPath(); ctx.arc((p.x + .5) * pitch + ox, (p.y + .5) * pitch + oy, Math.max(.35, rad), 0, 6.283); ctx.fill();
      }
      return assembling;
    };
    fit();
    const SCAN_AT = 3.0, PERIOD = 6, SWEEP = 3.2;
    let t0 = null, raf = 0, running = false, tPause = 0;
    const frame = t => {
      if (t0 === null) t0 = t; const el = (t - t0) / 1000, sr = stage.getBoundingClientRect(), H = sr.height, Wd = sr.width;
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
        const top = o.cv.getBoundingClientRect().top - sr.top, sy = ly === null ? null : (ly - top) / o.pitch;
        const near = sy !== null && sy > -4 && sy < o.b.h + 20;
        if (el - o.delay < 2.4 || near || o.live) { const a = paint(o, el, near ? sy : null); o.live = near || a; busy = busy || a; }
      }
      if (!reduce || busy) raf = requestAnimationFrame(frame); else running = false;
    };
    const play = () => { if (running) return; running = true; if (t0 !== null) t0 += performance.now() - tPause; raf = requestAnimationFrame(frame); };
    const pause = () => { if (!running) return; running = false; tPause = performance.now(); cancelAnimationFrame(raf); };
    new IntersectionObserver(es => es.forEach(en => en.isIntersecting && !document.hidden ? play() : pause())).observe(stage);
    document.addEventListener('visibilitychange', () => document.hidden ? pause() : stage.getBoundingClientRect().bottom > 0 && play());
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); if (!running) { bots.forEach(o => paint(o, 99, null)); } }, 150); });
  }

  // ---------------------------------------------------------------- how a fleet loan works
  // site.js moves the active step; the sheet follows it so the lender row appears from step 2 and the pricing line on step 4
  const live = document.querySelector('.h-live'), steps = [...document.querySelectorAll('.h-steps .step')];
  if (live && steps.length) {
    const sync = () => { const k = steps.findIndex(s => s.classList.contains('on')); live.dataset.step = Math.max(0, k); };
    const mo = new MutationObserver(sync); steps.forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] })); sync();
    steps.forEach(s => s.addEventListener('click', () => s.parentElement.classList.add('h-man')));
  }

  // ---------------------------------------------------------------- mini fleet sizer
  const n = document.getElementById('h-n'), p = document.getElementById('h-p'), out = document.getElementById('h-l');
  if (n && p && out) {
    // digits only; robots capped at 10,000 and price at $1,000,000
    const clean = (el, cap, money) => { const v = Math.min(cap, +String(el.value).replace(/[^0-9]/g, '') || 0); return v; };
    const show = (el, v, money) => { el.value = v ? (money ? fmt(v) : v.toLocaleString('en-US')) : ''; };
    const upd = () => { out.textContent = fmt(clean(n, 10000) * clean(p, 1000000) * .7); };
    [[n, 10000, false], [p, 1000000, true]].forEach(([el, cap, money]) => el.addEventListener('input', () => { const v = clean(el, cap); const raw = String(el.value).replace(/[^0-9]/g, ''); if (raw !== String(el.value).replace(/[$,]/g, '') || +raw > cap) show(el, v, money); upd(); }));
    p.addEventListener('blur', () => show(p, clean(p, 1000000), true));
    upd();
  }

  // ---------------------------------------------------------------- price report tabs
  const tabs = [...document.querySelectorAll('.h-tab')], pans = [...document.querySelectorAll('.h-pan')];
  if (tabs.length) {
    let seen = false;
    const go = pan => { pan.classList.remove('h-go'); if (reduce) return pan.classList.add('h-go'); requestAnimationFrame(() => requestAnimationFrame(() => pan.classList.add('h-go'))); };
    const pick = (t, focus) => { tabs.forEach(x => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      pans.forEach(pn => { pn.hidden = pn.id !== t.getAttribute('aria-controls'); if (!pn.hidden && seen) go(pn); }); if (focus) t.focus(); };
    tabs.forEach((t, i) => { t.addEventListener('click', () => pick(t)); t.addEventListener('keydown', ev => { const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (d) { ev.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); } }); });
    pick(tabs[0]);
    const card = document.querySelector('.h-rep-card');
    new IntersectionObserver((es, ob) => es.forEach(en => { if (en.isIntersecting) { seen = true; go(pans.find(pn => !pn.hidden)); ob.disconnect(); } }), { threshold: .25 }).observe(card);
  }
})();
