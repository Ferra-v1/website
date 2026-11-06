// Robot companies page: the quote form's four robot fields stay in range and every change turns into the outcome beside them:
// what you could borrow (core.fleet_preview, driven by FerraApp.preview in site.js) and your robots, one for each you typed, drawn here.
// The closing band's button brings the visitor back to the form with the robot type field focused.
(() => {
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p'), wh = document.getElementById('sz-when');
  if (!ty) return;
  const pv = document.getElementById('fp-fleets');
  // your robots: as many as the typed count (up to CAP), packed so they fill the space, so one robot is huge and five hundred are a crowd
  const drawBots = (() => {
    const box = pv && pv.querySelector('.fp-fleet'); if (!box) return () => {};
    box.insertAdjacentHTML('afterbegin', '<canvas class="f-bots" role="img"></canvas><span class="f-more" hidden></span>');
    const cv = box.querySelector('.f-bots'), more = box.querySelector('.f-more'), x = cv.getContext('2d'), CAP = 200, GAP = 6, cache = {};
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tok = 0, had = 0;
    // one robot in white from its coarse dot grid, standing on the bottom edge of its cell
    const glyph = (rid, cell, dpr) => {
      const key = [rid, cell, dpr].join('|'); if (cache[key]) return cache[key];
      const c = document.createElement('canvas'); c.width = c.height = Math.ceil(cell * dpr);
      const g = c.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = '#fff';
      const b = (window.FERRA_DOTS || {})[rid + '-s'], p = b && b.d ? b.d.split(';').map(s => s.split(',').map(Number)) : [];
      if (p.length) { const xs = p.map(q => q[0]), ys = p.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const pit = cell / Math.max(x1 - x0 + 1, y1 - y0 + 1), ox = (cell - (x1 - x0 + 1) * pit) / 2, oy = cell - (y1 - y0 + 1) * pit;
        for (const q of p) { const s = Math.min(1, (q[3] / 100) * 1.15 * Math.min(1, .5 + .5 * q[2] / 100 + (q[5] || 0) / 300)); g.beginPath(); g.arc(ox + (q[0] - x0 + .5) * pit, oy + (q[1] - y0 + .5) * pit, Math.max(.42, pit * .62 * s), 0, 6.283); g.fill(); } }
      return (cache[key] = c); };
    // the column count that gives the biggest robots, preferring a full last row
    const pack = (n, W, H) => { let best = { cols: 1, cell: 1, score: 0 };
      for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols), cell = Math.floor(Math.min((W - (cols - 1) * GAP) / cols, (H - (rows - 1) * GAP) / rows)), score = cell * (1 - .06 * (cols * rows - n) / cols);
        if (cell > 0 && score > best.score) best = { cols, cell, score }; }
      return best; };
    return (rid, count, animate) => {
      const n = Math.min(count, CAP), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
      const dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { cols, cell } = pack(n, W, H), g = glyph(rid, cell, dpr);
      const put = i => x.drawImage(g, (i % cols) * (cell + GAP), Math.floor(i / cols) * (cell + GAP), cell, cell);
      cv.setAttribute('aria-label', count === 1 ? '1 robot' : count.toLocaleString('en-US') + ' robots');
      more.hidden = count <= CAP; more.textContent = '+' + (count - CAP).toLocaleString('en-US') + ' more';
      const me = ++tok, from = animate && !still ? Math.min(had, n) : n, t0 = performance.now(), D = had ? 260 : 700;
      for (let i = 0; i < from; i++) put(i);
      had = n; let done = from;
      if (from < n) { const tick = t => { if (me !== tok) return; const end = Math.min(n, from + Math.ceil((n - from) * Math.min(1, (t - t0) / D))); while (done < end) put(done++); if (done < n) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
    }; })();
  const fmt = v => '$' + Math.round(v).toLocaleString('en-US');
  const digits = el => el.value.replace(/[^0-9]/g, '');
  const lim = el => [+el.dataset.min, +el.dataset.max];
  const clamp = (el, v) => { const [lo, hi] = lim(el); return Math.min(hi, Math.max(lo, v)); };
  const last = new Map([[n, 50], [p, 125000]]);   // the last good value of each field: an empty field keeps the preview where it was
  const val = el => last.get(el);
  const comma = el => { el.value = val(el).toLocaleString('en-US'); };
  // the range message: one line under the fields for 4 seconds
  const msg = document.getElementById('f-msg'); let mt;
  const say = el => { if (!msg) return; msg.textContent = el === n ? 'Up to 1,000 robots' : 'Between $1,000 and $1,000,000'; msg.classList.add('on'); el.setAttribute('aria-invalid', 'true');
    clearTimeout(mt); mt = setTimeout(() => { msg.classList.remove('on'); [n, p].forEach(x => x.removeAttribute('aria-invalid')); }, 4000); };
  // every valid change goes straight to the preview; it counts and redraws in 300ms
  const state = () => ({ rid: ty.value, n: val(n), price: val(p), when: wh ? wh.value : 'Within 3 months' });
  let lastKey = '';
  const upd = () => {
    const s = state(), key = [s.rid, s.n, s.price, s.when].join('|');
    if (key === lastKey) return; lastKey = key;
    drawBots(s.rid, s.n, true);
    if (pv && window.FerraApp && window.FerraApp.preview) return window.FerraApp.preview(pv, s);
    // shared preview script not loaded yet: keep the four figures and the funding window honest
    if (!pv) return;
    const V = s.n * s.price, f = pv.querySelectorAll('.fp-k dd');
    [fmt(V), fmt(V * .7), fmt(V * .3), Math.abs(V * .7 * .015 - 65625) < .5 ? '$65,625' : '$' + (Math.floor(V * .7 * .015 / 100 + .5) * 100).toLocaleString('en-US')].forEach((t, i) => { if (f[i]) f[i].textContent = t; });
  };
  lastKey = [ty.value, 50, 125000, wh ? wh.value : ''].join('|');   // the page is built on these defaults
  [n, p].forEach(el => {
    el.addEventListener('input', () => {
      const d = digits(el); if (d !== el.value) el.value = d;
      if (!d) return;   // empty: keep the last preview, no message until the field is left
      const v = +d, [lo, hi] = lim(el);
      if (v > hi) { el.value = String(hi); last.set(el, hi); say(el); }   // above the top: clamp now and write it back
      else last.set(el, Math.max(lo, v));   // below the floor while typing (a price is typed from its first digit): settle on blur
      upd();
    });
    el.addEventListener('focus', () => { el.value = digits(el); el.select(); });
    el.addEventListener('blur', () => {
      const d = digits(el);
      if (d) { const v = +d, c = clamp(el, v); if (c !== v) say(el); last.set(el, c); }
      comma(el); upd();
    });
  });
  // a new robot type brings its own typical price
  ty.addEventListener('change', () => { last.set(p, clamp(p, +ty.selectedOptions[0].dataset.price)); comma(p); upd(); });
  if (wh) wh.addEventListener('change', upd);
  // site.js reads the fleet fields as plain numbers when the form submits, so hand it digits for that moment
  const form = document.getElementById('quote');
  document.addEventListener('submit', ev => {
    if (ev.target !== form) return;
    // the range message belongs to the typing: clear it the moment the form is sent, so it never sits above the thank-you card
    if (msg) { clearTimeout(mt); msg.classList.remove('on'); msg.textContent = ''; [n, p].forEach(x => x.removeAttribute('aria-invalid')); }
    [n, p].forEach(el => { el.value = String(val(el)); });
    setTimeout(() => [n, p].forEach(comma), 0);
  }, true);
  comma(n); comma(p);
  drawBots(ty.value, val(n), true);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => drawBots(ty.value, val(n), false), 150); });
  // once the request is in, the fields are gone, so their message line goes too
  const done = form && form.querySelector('.ldone');
  if (done && msg) new MutationObserver(() => { if (!done.hidden) msg.hidden = true; }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
  // every "Get a quote" link on this page returns to the form and puts the cursor in the robot type field
  // wide screens: the whole hero (fields and preview) fits, so return to its top; phones: to the first field
  const toForm = smooth => { const wide = matchMedia('(min-width: 901px)').matches, el = wide ? document.querySelector('.f-hero') : (form || ty), nav = document.querySelector('.nav'), nh = nav ? nav.getBoundingClientRect().height : 0, top = Math.max(0, el.getBoundingClientRect().top + scrollY - (wide ? nh - 24 : nh + 24)); scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }); ty.focus({ preventScroll: true }); };
  document.querySelectorAll('a[href="#quote"]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#quote'); toForm(!matchMedia('(prefers-reduced-motion: reduce)').matches); }));
  if (location.hash === '#quote') addEventListener('load', () => setTimeout(() => toForm(false), 60));
  // the timeline drive plays once; afterwards hold the final frame as plain styles
  const tw = document.querySelector('.f-tlw'), run = tw && tw.querySelector('.f-runner');
  if (run) run.addEventListener('animationend', () => tw.classList.add('done'));
})();
