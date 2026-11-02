(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
  // hero sequence starts once the hero image has loaded
  const hero = document.querySelector('.hero');
  if (hero) { const imgs = [...hero.querySelectorAll('.bot img')]; let done = false; const go = () => { if (!done) { done = true; requestAnimationFrame(() => hero.classList.add('ready')); } };
    Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.addEventListener('load', r); i.addEventListener('error', r); }))).then(go); setTimeout(go, 2500); }
  // reveal on scroll, and charts and bars that draw when they arrive
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } }), { threshold: .18, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv,.lossbox,.dia,.chartcard').forEach(el => reduce ? el.classList.add('in-view') : io.observe(el));
  // counters run on a timer once visible and always rest on the real figure
  const cio = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; cio.unobserve(en.target); const el = en.target, end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', pre = el.dataset.prefix || '', dec = (el.dataset.count.split('.')[1] || '').length;
    const show = v => el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf; if (reduce) return show(end); const t0 = performance.now(), D = 1200;
    const tick = t => { const p = Math.min(1, (t - t0) / D), k = 1 - Math.pow(1 - p, 3); show(end * k); if (p < 1) requestAnimationFrame(tick); else show(end); }; requestAnimationFrame(tick); }), { threshold: .6 });
  document.querySelectorAll('[data-count]').forEach(el => el.closest('.hero') ? null : cio.observe(el));
  // how it works: steps highlight the matching rows of the term sheet, and advance on their own until touched
  const steps = [...document.querySelectorAll('.step')], live = document.querySelector('.sheet.live');
  if (steps.length && live) { let i = 0, auto = !reduce, timer;
    const set = k => { i = k; steps.forEach((s, j) => s.classList.toggle('on', j === k)); const rows = (steps[k].dataset.rows || '').split(',').filter(Boolean); live.querySelectorAll('.dr').forEach(r => r.classList.toggle('hl', rows.includes(r.dataset.row))); };
    steps.forEach((s, k) => s.addEventListener('click', () => { auto = false; clearInterval(timer); set(k); })); set(0);
    if (auto) timer = setInterval(() => set((i + 1) % steps.length), 3600); }
  // fleet sizer
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p');
  if (ty && document.getElementById('o-v')) { const upd = () => { const N = Math.max(0, +n.value || 0), P = Math.max(0, +p.value || 0), V = N * P; document.getElementById('o-v').textContent = fmt(V); document.getElementById('o-l').textContent = fmt(V * .7); document.getElementById('o-f').textContent = fmt(V * .7 * .015); };
    ty.addEventListener('change', () => { p.value = ty.selectedOptions[0].dataset.price; upd(); }); n.addEventListener('input', upd); p.addEventListener('input', upd); upd(); }
  // price report: robot type picker and the year table
  const chips = [...document.querySelectorAll('.chip')];
  if (chips.length && document.getElementById('pr-name')) { const curve = [0, 1, 2, 3, 4, 5, 6].map(y => Math.exp(-Math.pow(12 * y / 42, 1.2)));
    const pick = c => { chips.forEach(x => x.classList.toggle('on', x === c)); const t = c.dataset.type, price = +c.dataset.price; document.querySelectorAll('.pchart').forEach(d => { d.hidden = d.dataset.type !== t; const s = d.querySelector('.chart'); s.classList.remove('drawn'); if (!d.hidden) requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('drawn'))); });
      document.getElementById('pr-name').textContent = c.dataset.name; document.getElementById('pr-table').innerHTML = '<tr><td>Year</td><td>Example resale value</td></tr>' + curve.map((k, y) => `<tr><td>Year ${y}</td><td>${fmt(Math.round(price * k / 100) * 100)}</td></tr>`).join(''); };
    chips.forEach(c => c.addEventListener('click', () => { pick(c); history.replaceState(null, '', '#' + c.dataset.type); }));
    pick(chips.find(c => c.dataset.type === location.hash.slice(1)) || chips[0]); }
  // waitlist forms stay on the page
  // lead forms: insert-only into Supabase (row level security blocks reads with this public key)
  const SB = 'https://ybgspxfnjkehjskhrpne.supabase.co/rest/v1/leads', KEY = 'sb_publishable_256LqgO7hWqqhz2ZBvDLhQ_VsXwNgq3';
  const COUNT = { '1 to 10': 10, '11 to 50': 50, '51 to 200': 200, 'More than 200': 201 };
  const utm = (() => { const q = new URLSearchParams(location.search), o = {}; q.forEach((v, k) => { if (k.startsWith('utm_')) o[k] = v.slice(0, 120); }); return Object.keys(o).length ? o : null; })();
  document.addEventListener('input', ev => { if (ev.target.getAttribute && ev.target.getAttribute('aria-invalid') === 'true' && ev.target.value.trim()) ev.target.setAttribute('aria-invalid', 'false'); });
  document.querySelectorAll('form.lead').forEach(f => f.addEventListener('submit', async ev => {
    ev.preventDefault(); const err = f.querySelector('.lerr'), btn = f.querySelector('button[type=submit]'); err.hidden = true;
    const isBad = el => !el.value.trim() || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
    const req = [...f.querySelectorAll('[required]')]; req.forEach(el => el.setAttribute('aria-invalid', isBad(el)));
    const bads = req.filter(isBad), bad = bads[0];
    if (bad) { const name = el => el.closest('label').querySelector('span').textContent.toLowerCase();
      err.textContent = bad.type === 'email' && bad.value.trim() ? 'Enter a full work email, like name@company.com.' : 'Please fill in ' + (bads.length > 1 ? bads.slice(0, -1).map(name).join(', ') + ' and ' + name(bads[bads.length - 1]) : name(bad)) + '.'; err.hidden = false; bad.focus(); return; }
    const done = () => { f.querySelector('.lf').hidden = true; f.querySelector('.la').hidden = true; f.querySelector('.ldone').hidden = false; };
    if (f.website.value) return done();   // decoy field filled: a bot
    const v = n => (f.elements[n] ? f.elements[n].value.trim() : '') || null;
    const row = { kind: f.dataset.kind, email: v('email'), company: v('company'), role: v('role'), timeline: v('timeline'), check_size: v('check_size'), message: v('message'), page: location.pathname + '#' + f.dataset.who, utm };
    if (v('robot_count')) row.robot_count = COUNT[v('robot_count')];
    const ty = document.getElementById('sz-type');
    if (ty && f.dataset.who === 'fleets') { row.robot_type = ty.selectedOptions[0].textContent; row.robot_count = +document.getElementById('sz-n').value || null; row.price_per_robot = +document.getElementById('sz-p').value || null; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending';
    try { const r = await fetch(SB, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) }); if (!r.ok) throw r.status; done(); }
    catch (x) { err.textContent = 'That did not go through. Please try again in a moment.'; err.hidden = false; btn.disabled = false; btn.textContent = label; }
  }));
  // white pages: the sticky nav turns translucent once the page has moved 8px
  const navs = [...document.querySelectorAll('.nav:not(.on-dark)')];
  if (navs.length) { let on = null; const chk = () => { const v = scrollY > 8; if (v !== on) { on = v; navs.forEach(nv => nv.classList.toggle('scrolled', v)); } }; addEventListener('scroll', chk, { passive: true }); chk(); }
  // ------------------------------------------------------------------ product: the cover chart, the priced fleet, the live preview
  // keep(m, rid): share of the new price a robot keeps at m months, the risk engine's curve exp(-(m/tau)^beta) for the nearest engine type
  // (engine.js TYPES: arm and cobot PALLET 42/1.2, amr and pallet AMR 38/1.3, delivery SIDEWALK 34/1.3, cleaning CLEAN 40/1.2); mirrors core.KT and core.keep
  const KT = { arm: [42, 1.2], cobot: [42, 1.2], amr: [38, 1.3], pallet: [38, 1.3], delivery: [34, 1.3], cleaning: [40, 1.2] };
  const keep = (m, rid) => { const [tau, beta] = KT[rid] || KT.arm; return Math.exp(-Math.pow(Math.max(0, m) / tau, beta)); }, ADV = .7, TERM = 36;
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const feeFmt = v => Math.abs(v - 65625) < .5 ? '$65,625' : money(v);
  const nice = v => { const k = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); for (const m of [1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10]) if (m * k >= v) return m * k; return 10 * k; };
  const NS = 'http://www.w3.org/2000/svg', mctx = document.createElement('canvas').getContext('2d');
  const tw = (t, px, serif, wt) => { mctx.font = serif ? `500 ${px}px Newsreader, Georgia, serif` : `${wt || 400} ${px}px Geist, system-ui, sans-serif`; return mctx.measureText(t).width; };
  // geometry of the cover chart: the same rules as core.cover_geo, with the browser's measured text widths
  const geo = (V, W, H, size, top, L, rid) => {
    const full = size === 'full', pl = 6, pr = 8, pt = full ? 54 : 12, base = H - 28, r = full && W >= 480 ? 2.4 : 2.0, ymax = top || 1.08 * V;
    const X = m => pl + m * (W - pl - pr) / 72, Y = v => base - v / ymax * (base - pt);
    const val = [], loan = [];
    for (let m = 0; m <= 72; m++) val.push([X(m), Y(V * keep(m, rid))]);
    for (let m = 0; m <= TERM; m++) loan.push([X(m), Y(ADV * V * (1 - m / TERM))]);
    const dots = val.concat(loan).map(([x, y]) => [x, y, r]), labs = [], out = [], pad = full ? 8 : 5;
    const clear = ([x0, y0, x1, y1], pd = pad, lim = [0, W]) => { if (x0 < lim[0] || x1 > lim[1] || x0 < 0 || x1 > W || y0 < 0 || y1 > base - 4) return false;
      for (const [cx, cy, cr] of dots) { const dx = Math.max(x0 - cx, 0, cx - x1), dy = Math.max(y0 - cy, 0, cy - y1); if (Math.hypot(dx, dy) - cr < pd) return false; }
      return labs.every(b => x1 + 8 <= b[0] || b[2] + 8 <= x0 || y1 + 6 <= b[1] || b[3] + 6 <= y0); };
    const rng = (a, b, s) => { const o = []; for (let v = a; s > 0 ? v < b : v > b; v += s) o.push(v); return o; };
    const place = (w, h, ax, ay, xs, ys, pd, lim) => { let best = null; for (const dx of xs) for (const dy of ys) { const bx = [ax + dx, ay + dy, ax + dx + w, ay + dy + h]; if (clear(bx, pd === undefined ? pad : pd, lim || [0, W])) { const d = Math.abs(dx) + Math.abs(dy) * 1.4; if (!best || d < best[0]) best = [d, bx]; } } return best && best[1]; };
    const sizes = full ? [[12, 20], [11, 16]] : [[12, 20]];
    if (full) {
      const [x0, yv0] = val[0], yl0 = loan[0][1];
      for (const [key, cap, num, ay0, xs, ys] of [['v', L.v || 'Fleet value today', money(V), h => yv0 - r - h - 8, rng(0, 60, 4), rng(0, -40, -2)],
                                                   ['l', L.l || 'Loan at 70%', money(V * ADV), () => yl0 + 18, rng(0, 160, 4), rng(0, 220, 2)]])
        for (const [cs, ns] of sizes) { const h = cs + ns + 6, w = Math.max(tw(cap, cs), tw(num, ns, 1)) + 2, bx = place(w, h, x0 + 8, ay0(h), xs, ys); if (bx) { labs.push(bx); out.push(['pair', key, cap, num, bx, cs, ns]); break; } }
      const [xe, ye] = loan[TERM];
      for (const [cs] of sizes) { const cap = 'Repaid, month 36', bx = place(tw(cap, cs) + 4, cs + 4, xe + 8, ye - 12 - cs, rng(0, 120, 4), rng(0, -60, -2)); if (bx) { labs.push(bx); out.push(['one', 'e', cap, '', bx, cs, 0]); break; } }
    }
    // cushion label: inside the shaded band and 8px clear of every dot; the clearest spot, nearest month 18 once it clears 14px.
    // 12px when it fits, else 11px; a chart too short for 8px around the word (a phone's small chart) shows the band without it.
    const per = (W - pl - pr) / 72, ends = loan.map(([x, y], m) => [x, y, m === TERM ? 3.5 : r]);
    const gapTo = (bx, [cx, cy, cr]) => Math.hypot(Math.max(bx[0] - cx, 0, cx - bx[2]), Math.max(bx[1] - cy, 0, cy - bx[3])) - cr;
    let cb = null;
    for (const cs of [12, 11]) { const w = tw('Cushion', cs, 0, 600) + 2, h = Math.ceil(cs * 1.34);
      for (let x0 = X(1); x0 + w <= X(35); x0 += 1) { const mc = (x0 + w / 2 - pl) / per, m0 = Math.max(0, Math.floor((x0 - 14 - pl) / per)), m1 = Math.min(72, Math.ceil((x0 + w + 14 - pl) / per));
        for (let y0 = Math.ceil(Y(V * keep(mc, rid))); y0 + h <= Y(ADV * V * (1 - mc / TERM)); y0 += 1) { const bx = [x0, y0, x0 + w, y0 + h]; let c = 1e9;
          for (let m = m0; m <= m1 && c >= 8; m++) { c = Math.min(c, gapTo(bx, [val[m][0], val[m][1], r])); if (m <= TERM) c = Math.min(c, gapTo(bx, ends[m])); }
          if (c < 8 || !labs.every(b => bx[2] + 8 <= b[0] || b[2] + 8 <= bx[0] || bx[3] + 6 <= b[1] || b[3] + 6 <= bx[1])) continue;
          const sc = Math.min(c, 14) - .05 * Math.abs(mc - 18); if (!cb || sc > cb[0]) cb = [sc, bx, cs]; } }
      if (cb) break; }
    if (cb) { labs.push(cb[1]); out.push(['one', 'c', 'Cushion', '', cb[1], cb[2], 0]); }
    return { W, H, base, r, val, loan, labels: out, ticks: (W < 260 ? [[X(0), 'Today'], [X(72), 'Year 6']] : [[X(0), 'Today'], [X(24), 'Year 2'], [X(48), 'Year 4'], [X(72), 'Year 6']]) };
  };
  const el = (tag, at, par) => { const n = document.createElementNS(NS, tag); for (const k in at) n.setAttribute(k, at[k]); if (par) par.appendChild(n); return n; };
  // FerraApp.cover(svg, V, o): draw the cover chart into svg at its real pixel size. o.tween: move the dots to the new figure over 300ms in place
  const cover = (svg, V, o = {}) => {
    const cfg = JSON.parse(svg.dataset.cv || '{}'), size = cfg.size || 'full', L = cfg.labels || {}, top = o.top !== undefined ? o.top : cfg.top, rid = o.rid || cfg.rid || 'arm';
    const W = Math.round(svg.parentElement.clientWidth || svg.clientWidth || 640); if (!W) return;
    const H = size === 'full' ? (W < 420 ? 280 : Math.round(Math.min(320, Math.max(240, W * .47)))) : (innerWidth < 720 ? 150 : (+svg.dataset.h || 180));
    const g = geo(V, W, H, size, top, L, rid), f = v => v.toFixed(1);
    const cush = 'M' + g.val.slice(0, TERM + 1).map(([x, y]) => f(x) + ',' + f(y)).join(' L') + ' L' + g.loan.slice().reverse().map(([x, y]) => f(x) + ',' + f(y)).join(' L') + ' Z';
    cfg.V = V; cfg.top = top; cfg.rid = rid; svg.dataset.cv = JSON.stringify(cfg);
    svg.setAttribute('aria-label', `Fleet value falls from ${money(V)} as the robots age; the loan is repaid from ${money(V * ADV)} to zero by month 36 and stays below the fleet value every month.`);
    const old = svg._g;
    if (o.tween && old && old.W === W && !reduce) {
      // same size: tween every dot and the cushion from where they stand to the new figure
      const vc = svg.querySelectorAll('.cv-v circle'), lc = svg.querySelectorAll('.cv-l circle:not(.cv-end)'), cp = svg.querySelector('.cv-cush'), t0 = performance.now(), tok = svg._tok = (svg._tok || 0) + 1;
      const from = { val: old.val.map(p => p.slice()), loan: old.loan.map(p => p.slice()) };
      const tick = t => { if (svg._tok !== tok) return; const p = Math.min(1, (t - t0) / 300), k = 1 - Math.pow(1 - p, 3), mix = (a, b) => a + (b - a) * k;
        const cv = g.val.map(([x, y], i) => [x, mix(from.val[i][1], y)]), cl = g.loan.map(([x, y], i) => [x, mix(from.loan[i][1], y)]);
        vc.forEach((c, i) => c.setAttribute('cy', f(cv[i][1]))); lc.forEach((c, i) => c.setAttribute('cy', f(cl[i][1])));
        cp.setAttribute('d', 'M' + cv.slice(0, TERM + 1).map(([x, y]) => f(x) + ',' + f(y)).join(' L') + ' L' + cl.slice().reverse().map(([x, y]) => f(x) + ',' + f(y)).join(' L') + ' Z');
        if (p < 1) requestAnimationFrame(tick); else { svg._g = g; paintLabels(svg, g); } };
      requestAnimationFrame(tick); return;
    }
    svg._g = g; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px'; svg.textContent = '';
    el('path', { class: 'cv-cush', d: cush }, svg); el('line', { class: 'cv-base', x1: 0, x2: W, y1: g.base + .5, y2: g.base + .5 }, svg);
    const gv = el('g', { class: 'cv-v' }, svg), gl = el('g', { class: 'cv-l' }, svg);
    g.val.forEach(([x, y], m) => el('circle', { cx: f(x), cy: f(y), r: g.r, style: '--i:' + m }, gv));
    g.loan.slice(0, TERM).forEach(([x, y], m) => el('circle', { cx: f(x), cy: f(y), r: g.r, style: '--i:' + m }, gl));
    el('circle', { class: 'cv-end', cx: f(g.loan[TERM][0]), cy: f(g.loan[TERM][1]), r: 3.5, style: '--i:' + TERM }, gl);
    el('g', { class: 'cv-lab' }, svg); paintLabels(svg, g);
    const gx = el('g', { class: 'cv-x' }, svg);
    g.ticks.forEach(([x, t], i) => { const n = el('text', { x: f(x), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === g.ticks.length - 1 ? 'end' : 'middle' }, gx); n.textContent = t; });
  };
  const paintLabels = (svg, g) => {
    const gl = svg.querySelector('.cv-lab'); if (!gl) return; gl.textContent = ''; const f = v => v.toFixed(1);
    for (const [kind, key, cap, num, [x0, y0, x1], cs, ns] of g.labels) {
      if (kind === 'pair') { const a = el('text', { class: 'cv-k', x: f(x0), y: f(y0 + cs * .85) }, gl); a.textContent = cap; if (cs !== 12) a.style.fontSize = cs + 'px';
        const b = el('text', { class: 'cv-n', x: f(x0), y: f(y0 + cs + 6 + ns * .8) }, gl); b.textContent = num; if (ns !== 20) b.style.fontSize = ns + 'px'; }
      else { const a = el('text', { class: 'cv-k' + (key === 'c' ? ' cv-c' : ''), x: f(key === 'c' ? (x0 + x1) / 2 : x0), y: f(key === 'c' ? y0 + cs : y0 + cs * .9 + 1) }, gl); if (key === 'c') a.setAttribute('text-anchor', 'middle'); a.textContent = cap; if (cs !== 12) a.style.fontSize = cs + 'px'; }
    }
  };
  // the draw-in: dots left to right at 14ms a month, the cushion from 900ms, labels from 1100ms; once, when 35% of the chart is in view
  const drawIn = (svg, then) => {
    if (reduce) { svg.dataset.cvs = 'done'; then && then(); return; }
    svg.dataset.cvs = 'wait';
    const o = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; o.disconnect(); requestAnimationFrame(() => { svg.dataset.cvs = 'go'; then && then(); setTimeout(() => { svg.dataset.cvs = 'done'; }, 1800); }); }), { threshold: .35 });
    o.observe(svg);
  };
  // one unit of the grid: a plain rounded tile per robot (robot drawings at this size read as numerals), painted once per colour and size
  const glyphs = {};
  const glyph = (rid, cell, col, dpr) => {
    const key = [cell, col, dpr].join('|'); if (glyphs[key] !== undefined) return glyphs[key];
    const c = document.createElement('canvas'); c.width = c.height = Math.round(cell * dpr);
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.fillStyle = col;
    const s = Math.round(cell * .5), o = (cell - s) / 2; x.beginPath(); (x.roundRect ? x.roundRect(o, o, s, s, Math.round(s * .26)) : x.rect(o, o, s, s)); x.fill();
    return (glyphs[key] = c);
  };
  const MUTE = '#cfd6e3', COB = '#2847ce', INK40 = 'rgba(14,22,38,.4)';
  // FerraApp.units(canvas, {rid, n, max, cell, gap}): one canvas of up to max robots, 10 across; returns a painter with set(k) (robots priced) and state
  const units = (cv, o) => {
    const dpr = Math.min(2, devicePixelRatio || 1), cell = o.cell, gap = o.gap === undefined ? 3 : o.gap, cols = 10, rows = Math.ceil((o.rows || Math.ceil(Math.min(o.n, o.max) / cols)));
    const W = cols * cell + (cols - 1) * gap, H = rows * cell + (rows - 1) * gap;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const x = cv.getContext('2d'), st = { rid: o.rid, n: o.n, shown: Math.min(o.n, o.max), cell, gap, cols, priced: o.priced === undefined ? 0 : o.priced, focus: -1, col: o.col || [MUTE, COB], fresh: {} };
    const pos = i => [(i % cols) * (cell + gap), Math.floor(i / cols) * (cell + gap)];
    const paint = () => { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < st.shown; i++) { const [px, py] = pos(i), c = st.fresh[i] ? INK40 : i < st.priced ? st.col[1] : st.col[0]; x.drawImage(glyph(st.rid, cell, c, dpr), px, py, cell, cell); }
      if (st.focus >= 0 && st.focus < st.shown) { const [px, py] = pos(st.focus); x.strokeStyle = '#0e1626'; x.lineWidth = 2; x.beginPath(); (x.roundRect ? x.roundRect(px - 1, py - 1, cell + 2, cell + 2, 6) : x.rect(px - 1, py - 1, cell + 2, cell + 2)); x.stroke(); } };
    cv._u = st; st.paint = paint; st.pos = pos; paint(); return st;
  };
  // the sweep: robots turn from muted to cobalt left to right, row by row, 28ms apart, with the count in step
  const sweep = (st, countEl, n, then) => {
    const total = st.shown, t0 = performance.now(), tok = st.tok = (st.tok || 0) + 1;
    const tick = t => { if (st.tok !== tok) return; const k = Math.min(total, Math.floor((t - t0) / 28) + 1); st.priced = k; st.paint();
      if (countEl) countEl.textContent = (n > 50 ? Math.round(n * k / total) : k).toLocaleString('en-US');
      if (k < total) requestAnimationFrame(tick); else then && then(); };
    requestAnimationFrame(tick);
  };
  const countHTML = n => n > 50 ? `<b class="num">${n.toLocaleString('en-US')}</b> robots, each priced` : `<b class="num">${n}</b> of ${n} priced`;
  const eachLine = (app, cfg) => { let el = app.querySelector('.ap-each'); const cnt = app.querySelector('.ap-count'); if (!cnt) return;
    if (!el) { el = document.createElement('p'); el.className = 'ap-each'; cnt.after(el); }
    const p = cfg.price; el.textContent = `Each: ${money(p)} new, ${money(p * keep(24))} at year 2, ${money(p * ADV)} of the loan`; };
  // the fleet window: chart, units, strip, hover tips; FerraApp.setFleet rewrites it in place
  const initFleet = app => {
    const cfg = JSON.parse(app.dataset.appFleet), svg = app.querySelector('.ap-cover svg'), cv = app.querySelector('.ap-units'), cnt = app.querySelector('.ap-count'), tip = app.querySelector('.ap-tip');
    if (!svg || !cv) return;
    const geom = () => innerWidth < 720 ? 31 : 34;
    const V = () => cfg.n * cfg.price;
    cover(svg, V());
    const st = units(cv, { rid: cfg.rid, n: cfg.n, max: 50, cell: geom(), rows: 5, priced: reduce ? 50 : 0 });
    app._fleet = { cfg, st };
    eachLine(app, cfg);
    if (!reduce) { const b = cnt.querySelector('b'); if (b) b.textContent = '0'; }
    drawIn(svg, () => { if (!reduce) setTimeout(() => sweep(st, cnt.querySelector('b'), cfg.n), 400); });
    // unit tips: pointer, tap or arrow keys
    // every unit in the example is the same robot, so the tip names the unit only; the shared figures sit once in the line under the grid
    const show = i => { if (i < 0 || i >= st.shown) { tip.hidden = true; return; }
      tip.innerHTML = `<b>Unit ${String(i + 1).padStart(2, '0')} of ${cfg.n.toLocaleString('en-US')}</b><span>Priced and pledged to the loan</span>`;
      tip.hidden = false; const [px, py] = st.pos(i), box = cv.parentElement, bw = box.clientWidth, tw_ = tip.offsetWidth, th = tip.offsetHeight;
      let left = cv.offsetLeft + px + st.cell / 2 - tw_ / 2; left = Math.max(0, Math.min(bw - tw_, left));
      let topv = cv.offsetTop + py - th - 8; const appTop = app.getBoundingClientRect().top, boxTop = box.getBoundingClientRect().top;
      if (boxTop + topv < appTop + 50) topv = cv.offsetTop + py + st.cell + 8;
      tip.style.left = left + 'px'; tip.style.top = topv + 'px'; };
    const hit = ev => { const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, c = Math.floor(x / (st.cell + st.gap)), rr = Math.floor(y / (st.cell + st.gap));
      if (c < 0 || c >= 10 || rr < 0 || x - c * (st.cell + st.gap) > st.cell || y - rr * (st.cell + st.gap) > st.cell) return -1; return rr * 10 + c; };
    cv.addEventListener('pointermove', ev => { const i = hit(ev); if (i !== st.focus) { st.focus = i; st.paint(); } show(i); });
    cv.addEventListener('pointerdown', ev => { const i = hit(ev); st.focus = i; st.paint(); show(i); });
    cv.addEventListener('pointerleave', () => { st.focus = -1; st.paint(); tip.hidden = true; });
    cv.addEventListener('blur', () => { st.focus = -1; st.paint(); tip.hidden = true; });
    cv.addEventListener('keydown', ev => { const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 }[ev.key];
      if (ev.key === 'Escape') { tip.hidden = true; st.focus = -1; st.paint(); return; }
      if (mv === undefined) return; ev.preventDefault(); let i = st.focus < 0 ? 0 : st.focus + mv; i = Math.max(0, Math.min(st.shown - 1, i)); st.focus = i; st.paint(); show(i); });
    cv.addEventListener('focus', () => { if (st.focus < 0) { st.focus = 0; st.paint(); show(0); } });
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { cover(svg, V()); const pr = st.priced; const s2 = units(cv, { rid: cfg.rid, n: cfg.n, max: 50, cell: geom(), rows: 5, priced: pr }); Object.assign(st, s2); app._fleet.st = st; cv._u = st; }, 150); });
  };
  // FerraApp.setFleet(el, {rid, n, price}): rewrite a fleet window in place, without replaying its reveal
  const setFleet = (root, f) => {
    const app = root && (root.matches && root.matches('[data-app-fleet]') ? root : root.querySelector && root.querySelector('[data-app-fleet]')); if (!app || !app._fleet) return;
    const { cfg, st } = app._fleet, U = cfg.units || {};
    const rid = U[f.rid] ? f.rid : cfg.rid, n = Math.max(0, Math.round(+f.n || 0)), price = Math.max(0, +f.price || 0), u = U[rid] || ['Robot', 'robots'];
    if (rid === cfg.rid && n === cfg.n && price === cfg.price) return;
    Object.assign(cfg, { rid, n, price }); app.dataset.appFleet = JSON.stringify(cfg);
    const t = app.querySelector('.ap-title'); if (t) t.textContent = 'Your fleet: ' + n.toLocaleString('en-US') + ' ' + (n === 1 ? u[0].toLowerCase() : u[1]);
    const V = n * price; cover(app.querySelector('.ap-cover svg'), V, { tween: true });
    st.rid = rid; st.shown = Math.min(n, 50); st.n = n; st.priced = st.shown; st.paint();
    app.querySelector('.ap-count').innerHTML = countHTML(n);
    eachLine(app, cfg);
    const more = app.querySelector('.ap-more'); more.hidden = n <= 50; more.textContent = '+' + Math.max(0, n - 50).toLocaleString('en-US');
    const cv = app.querySelector('.ap-units'); cv.setAttribute('aria-label', n.toLocaleString('en-US') + ' robots, each priced');
    const dd = app.querySelectorAll('.ap-strip dd'), to = [money(V), '70%', money(V * ADV), money(V * (1 - ADV)), 'about ' + feeFmt(V * ADV * .015)];
    dd.forEach((d, i) => countTo(d, to[i], 400));
  };
  // count a figure from what it shows to a new value (text like "$4,375,000" or "about $65,625")
  const countTo = (d, end, D) => { const tok = d._tok = (d._tok || 0) + 1, num = s => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0, a = num(d.textContent), z = num(end), pre = end.match(/^[^\d$]*\$?/)[0];
    if (reduce || a === z || !/\$/.test(end)) { d.textContent = end; return; } const t0 = performance.now();
    const tick = t => { if (d._tok !== tok) return; const p = Math.min(1, (t - t0) / D), k = 1 - Math.pow(1 - p, 3); d.textContent = p < 1 ? pre + Math.round(a + (z - a) * k).toLocaleString('en-US') : end; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); };
  // the preview's figures share one size: as large as the stylesheet allows, shrunk together until the widest figure fits its column
  const fitFigs = (fp, want) => {
    const dds = [...fp.querySelectorAll('.fp-k dd')]; if (!dds.length || !fp.clientWidth) return;
    dds.forEach(d => { d.style.fontSize = ''; }); const base = parseFloat(getComputedStyle(dds[0]).fontSize); let k = 1;
    dds.forEach((d, i) => { const col = d.parentElement.clientWidth; for (const t of [d.textContent, want && want[i]]) { if (!t) continue;
      const s = d.cloneNode(false); s.textContent = t; s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; d.parentElement.appendChild(s);
      const w = s.getBoundingClientRect().width + 2; s.remove(); if (w > col) k = Math.min(k, col / w); } });
    if (k < 1) dds.forEach(d => { d.style.fontSize = Math.floor(base * k * 2) / 2 + 'px'; });
  };
  // the live preview (core.fleet_preview): figures, a small cover chart, the fleet growing to the typed count, the path to funded
  const WHEN = { 'Just exploring': 'When you are ready' };
  const initPreview = fp => {
    const cfg = JSON.parse(fp.dataset.fp), full = fp.classList.contains('fp-full'), svg = fp.querySelector('.fp-cover svg'), cv = fp.querySelector('.fp-units');
    const cell = () => innerWidth < 720 ? (full ? 31 : 26) : (full ? 30 : 26);
    svg.dataset.h = full ? 180 : 160;
    const V = cfg.n * cfg.price; cover(svg, V, { top: nice(1.08 * V), rid: cfg.rid });
    const st = units(cv, { rid: cfg.rid, n: cfg.n, max: 50, cell: cell(), rows: 5, priced: 50 });
    fp._p = { cfg, st }; drawIn(svg); fitFigs(fp);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fitFigs(fp); cover(svg, cfg.n * cfg.price, { top: nice(1.08 * cfg.n * cfg.price), rid: cfg.rid }); const s2 = units(cv, { rid: st.rid, n: cfg.n, max: 50, cell: cell(), rows: 5, priced: 50 }); Object.assign(st, s2, { tok: st.tok }); }, 150); });
  };
  // FerraApp.preview(el, {rid, n, price, when}): the preview answers every keystroke; numbers count over 300ms, the chart tweens, robots arrive or leave 12ms apart
  const preview = (root, f) => {
    const fp = root && (root.matches && root.matches('[data-fp]') ? root : root.querySelector && root.querySelector('[data-fp]')); if (!fp) return;
    if (!fp._p) initPreview(fp);
    const { cfg, st } = fp._p, rid = f.rid && cfg.names[f.rid] ? f.rid : cfg.rid, n = f.n === undefined ? cfg.n : Math.max(0, Math.round(+f.n || 0)), price = f.price === undefined ? cfg.price : Math.max(0, +f.price || 0);
    const when = f.when === undefined ? cfg.when : f.when;
    const V = n * price, figs = { v: money(V), l: money(V * ADV), c: money(V * (1 - ADV)), f: feeFmt(V * ADV * .015) };
    const keys = Object.keys(figs).filter(k => fp.querySelector(`.fp-${k} dd`));
    fitFigs(fp, keys.map(k => figs[k])); clearTimeout(fp._fit); fp._fit = setTimeout(() => fitFigs(fp), 340);   // fits the old and new figures while counting, then the new ones
    keys.forEach(k => countTo(fp.querySelector(`.fp-${k} dd`), figs[k], 300));
    if (n * price !== cfg.n * cfg.price || rid !== cfg.rid) cover(fp.querySelector('.fp-cover svg'), V, { tween: true, top: nice(1.08 * V), rid });   // the value curve follows the robot type
    const sm = fp.querySelector('.fp-path small'); if (sm && when) sm.textContent = WHEN[when] || when;
    const more = fp.querySelector('.fp-more'); more.hidden = n <= 50; more.textContent = '+' + Math.max(0, n - 50).toLocaleString('en-US');
    fp.querySelector('.fp-units').setAttribute('aria-label', n.toLocaleString('en-US') + ' robots');
    const target = Math.min(n, 50), tok = st.tok = (st.tok || 0) + 1;
    if (rid !== st.rid) { st.rid = rid; st.paint(); }
    Object.assign(cfg, { rid, n, price, when }); fp.dataset.fp = JSON.stringify(cfg);
    if (reduce) { st.shown = target; st.priced = target; st.fresh = {}; st.paint(); return; }
    // robots arrive (ink at 40%, then cobalt) or leave, one at a time from the end, 12ms apart
    const step = () => { if (st.tok !== tok || st.shown === target) return;
      if (st.shown < target) { const i = st.shown++; st.priced = st.shown; st.fresh[i] = 1; setTimeout(() => { delete st.fresh[i]; st.paint(); }, 160); }
      else { st.shown--; st.priced = st.shown; }
      st.paint(); setTimeout(step, 12); };
    step();
  };
  // the lender and report windows: the cover chart draws in, the report's dot bars fill once
  document.querySelectorAll('.app[data-view="lender"] .ap-cover svg').forEach(svg => { cover(svg, JSON.parse(svg.dataset.cv).V); drawIn(svg);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => cover(svg, JSON.parse(svg.dataset.cv).V), 150); }); });
  const dotsFill = w => { if (reduce) return; w.dataset.df = 'wait'; const o = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); requestAnimationFrame(() => { w.dataset.df = 'go'; }); } }), { threshold: .35 }); o.observe(w); };
  document.querySelectorAll('.app[data-view="report"] .ap-rows, .app[data-view="lender"] .ap-loss').forEach(dotsFill);
  const startProduct = () => { document.querySelectorAll('[data-app-fleet]').forEach(initFleet); document.querySelectorAll('[data-fp]').forEach(fp => { if (!fp._p) initPreview(fp); }); };
  // the robots come from the page's dot file (loaded before this script); fonts change label widths, so the charts redraw once they arrive
  startProduct();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('[data-fp]').forEach(fp => fitFigs(fp)));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('svg.cv').forEach(svg => { if (svg.dataset.cvs !== 'go') { const c = JSON.parse(svg.dataset.cv); svg._g = null; cover(svg, c.V, { top: c.top, rid: c.rid }); } }));
  // product windows arrive once: a single fade and 12px rise
  document.querySelectorAll('[data-app-live]').forEach(w => { if (reduce) return; w.dataset.al = 'wait'; const o = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); requestAnimationFrame(() => { w.dataset.al = 'go'; }); } }), { threshold: .15 }); o.observe(w); });
  window.FerraApp = Object.assign(window.FerraApp || {}, { setFleet, preview, cover, units, money, keep, fitFigs });
  // phone menu
  document.querySelectorAll('.nav').forEach(nv => { const b = nv.querySelector('.menu'), d = nv.querySelector('.drawer'); if (!b) return; b.addEventListener('click', () => { const o = d.hidden; d.hidden = !o; b.setAttribute('aria-expanded', o); }); });
})();
