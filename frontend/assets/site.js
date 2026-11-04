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
  const tw = (t, px, serif, wt) => { mctx.font = `${serif ? 600 : wt || 400} ${px}px Inter, system-ui, sans-serif`; return mctx.measureText(t).width; };
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
    const old = svg._g, pth = pts => 'M' + pts.map(([x, y]) => f(x) + ',' + f(y)).join(' L');
    if (o.tween && old && old.W === W && !reduce) {
      // same size: tween both lines and the cushion from where they stand to the new figure
      const vl = svg.querySelector('.cv-vl'), ll = svg.querySelector('.cv-ll'), cp = svg.querySelector('.cv-cush'), end = svg.querySelector('.cv-end'), t0 = performance.now(), tok = svg._tok = (svg._tok || 0) + 1;
      const from = { val: old.val.map(p => p.slice()), loan: old.loan.map(p => p.slice()) };
      const tick = t => { if (svg._tok !== tok) return; const p = Math.min(1, (t - t0) / 300), k = 1 - Math.pow(1 - p, 3), mix = (a, b) => a + (b - a) * k;
        const cv = g.val.map(([x, y], i) => [x, mix(from.val[i][1], y)]), cl = g.loan.map(([x, y], i) => [x, mix(from.loan[i][1], y)]);
        vl.setAttribute('d', pth(cv)); ll.setAttribute('d', pth(cl)); end.setAttribute('cy', f(cl[TERM][1]));
        cp.setAttribute('d', pth(cv.slice(0, TERM + 1)) + ' L' + cl.slice().reverse().map(([x, y]) => f(x) + ',' + f(y)).join(' L') + ' Z');
        if (p < 1) requestAnimationFrame(tick); else { svg._g = g; paintLabels(svg, g); } };
      requestAnimationFrame(tick); return;
    }
    svg._g = g; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px'; svg.textContent = '';
    el('path', { class: 'cv-cush', d: cush }, svg); el('line', { class: 'cv-base', x1: 0, x2: W, y1: g.base + .5, y2: g.base + .5 }, svg);
    el('path', { class: 'cv-vl', pathLength: 1, d: pth(g.val) }, svg); el('path', { class: 'cv-ll', pathLength: 1, d: pth(g.loan) }, svg);
    el('circle', { class: 'cv-end', cx: f(g.loan[TERM][0]), cy: f(g.loan[TERM][1]), r: 3.5 }, svg);
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
  // the draw-in: both lines left to right, then the cushion and its label; once, when 35% of the chart is in view
  const drawIn = (svg, then) => {
    if (reduce) { svg.dataset.cvs = 'done'; then && then(); return; }
    svg.dataset.cvs = 'wait';
    const o = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; o.disconnect(); requestAnimationFrame(() => { svg.dataset.cvs = 'go'; then && then(); setTimeout(() => { svg.dataset.cvs = 'done'; }, 1800); }); }), { threshold: .35 });
    o.observe(svg);
  };
  // one robot of a fleet row, painted once per colour and size from its coarse dot grid so a row of 50 stays cheap; stands on the cell's bottom edge
  const glyphs = {}, DOTS = () => window.FERRA_DOTS || {};
  const glyph = (rid, cell, col, dpr) => {
    const key = [rid, cell, col, dpr].join('|'); if (glyphs[key] !== undefined) return glyphs[key];
    const c = document.createElement('canvas'); c.width = c.height = Math.round(cell * dpr);
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.fillStyle = col;
    const b = DOTS()[rid + '-s'];
    if (b && b.d) { const p = b.d.split(';').map(s => s.split(',').map(Number)); let x0 = 1e9, x1 = 0, y0 = 1e9, y1 = 0; for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
      const pit = cell / Math.max(x1 - x0 + 1, y1 - y0 + 1), ox = (cell - (x1 - x0 + 1) * pit) / 2, oy = cell - (y1 - y0 + 1) * pit;
      for (const q of p) { const s = Math.min(1, (q[3] / 100) * 1.15 * Math.min(1, .5 + .5 * q[2] / 100 + (q[5] || 0) / 300)); x.beginPath(); x.arc(ox + (q[0] - x0 + .5) * pit, oy + (q[1] - y0 + .5) * pit, Math.max(.42, pit * .62 * s), 0, 6.283); x.fill(); } }
    else { const s = Math.round(cell * .5), o = (cell - s) / 2; x.beginPath(); x.rect(o, o, s, s); x.fill(); }
    return (glyphs[key] = c);
  };
  const MUTE = '#cfd6e3', COB = '#2847ce', INK40 = 'rgba(14,22,38,.35)';
  // FerraApp.units(canvas, {rid, n, max, cell, gap, cols}): a fleet as dot robots standing on hairlines, cols across; a robot arrives faint, then turns cobalt
  const units = (cv, o) => {
    const dpr = Math.min(2, devicePixelRatio || 1), cell = o.cell, gap = o.gap === undefined ? 4 : o.gap, cols = o.cols || 10, rowgap = 14, rows = o.rows || Math.ceil(Math.min(o.n, o.max) / cols);
    const W = cols * cell + (cols - 1) * gap, H = rows * (cell + rowgap);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const x = cv.getContext('2d'), st = { rid: o.rid, n: o.n, max: o.max, shown: Math.min(o.n, o.max), cell, gap, cols, rows, priced: o.priced === undefined ? 0 : o.priced, col: o.col || [MUTE, COB], fresh: {} };
    const pos = i => [(i % cols) * (cell + gap), Math.floor(i / cols) * (cell + rowgap)];
    const paint = () => { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const used = Math.max(1, Math.ceil(st.shown / cols));
      x.fillStyle = '#e2e6ee'; for (let r = 0; r < used; r++) x.fillRect(0, r * (cell + rowgap) + cell + .5, W, 1);
      for (let i = 0; i < st.shown; i++) { const [px, py] = pos(i), c = st.fresh[i] ? INK40 : i < st.priced ? st.col[1] : st.col[0]; x.drawImage(glyph(st.rid, cell, c, dpr), px, py, cell, cell); } };
    cv._u = st; st.paint = paint; st.pos = pos; paint(); return st;
  };
  // walk a fleet row to a new count: robots arrive or leave one at a time from the end, 12ms apart
  const growTo = (st, target) => { const tok = st.tok = (st.tok || 0) + 1;
    if (reduce) { st.shown = target; st.priced = target; st.fresh = {}; st.paint(); return; }
    const step = () => { if (st.tok !== tok || st.shown === target) return;
      if (st.shown < target) { const i = st.shown++; st.priced = st.shown; st.fresh[i] = 1; setTimeout(() => { delete st.fresh[i]; st.paint(); }, 160); }
      else { st.shown--; st.priced = st.shown; }
      st.paint(); setTimeout(step, 12); };
    step(); };
  // FerraApp.fleetRow(canvas, {rid, n, phoneMax}): the fleet row that fits its parent: as many across as keep each robot readable
  const fleetRow = (cv, f) => { const par = cv.parentElement, w = par.clientWidth || 600, phone = innerWidth < 720;
    const cols = phone ? 6 : Math.min(f.cols || 25, Math.max(6, Math.floor(w / (f.min || 44)))), gap = phone ? 6 : 4, cell = Math.max(24, Math.min(f.cellMax || 64, Math.floor((w - (cols - 1) * gap - (f.reserve || 0)) / cols))), max = phone ? (f.phoneMax || 12) : (f.max || cols * 2);
    return units(cv, { rid: f.rid, n: f.n, max, cell, gap, cols, rows: Math.ceil(max / cols), priced: Math.min(f.n, max) }); };
  // count a figure from what it shows to a new value (text like "$4,375,000" or "about $65,625")
  const countTo = (d, end, D) => { const tok = d._tok = (d._tok || 0) + 1, num = s => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0, a = num(d.textContent), z = num(end), pre = end.match(/^[^\d$]*\$?/)[0];
    if (reduce || a === z || !/\$/.test(end)) { d.textContent = end; return; } const t0 = performance.now();
    const tick = t => { if (d._tok !== tok) return; const p = Math.min(1, (t - t0) / D), k = 1 - Math.pow(1 - p, 3); d.textContent = p < 1 ? pre + Math.round(a + (z - a) * k).toLocaleString('en-US') : end; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); };
  // the preview's figures: the giant loan fits its own line; the three smaller ones share one size, shrunk together until the widest fits its column
  const fitFigs = (fp, want) => {
    const fit = (dds, wants) => { if (!dds.length) return; dds.forEach(d => { d.style.fontSize = ''; }); const base = parseFloat(getComputedStyle(dds[0]).fontSize); let k = 1;
      dds.forEach((d, i) => { const col = d.parentElement.clientWidth; for (const t of [d.textContent, wants && wants[i]]) { if (!t) continue;
        const s = d.cloneNode(false); s.textContent = t; s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; d.parentElement.appendChild(s);
        const w = s.getBoundingClientRect().width + 2; s.remove(); if (w > col) k = Math.min(k, col / w); } });
      if (k < 1) dds.forEach(d => { d.style.fontSize = Math.floor(base * k * 2) / 2 + 'px'; }); };
    if (!fp.clientWidth) return;
    fit([...fp.querySelectorAll('.fp-l dd')], want && [want.l]); fit([...fp.querySelectorAll('.fp-k2 dd')], want && [want.v, want.c, want.f]);
  };
  // the live preview (core.fleet_preview): the giant loan, the fleet growing to the typed count, the finance terms, a small value chart
  const WHEN = { 'Just exploring': 'When you are ready' };
  const rowCfg = cfg => ({ rid: cfg.rid, n: cfg.n, cols: 10, max: 20, phoneMax: 12, cellMax: 54, reserve: 0 });
  const moreLabel = (el, n, st) => { el.hidden = n <= st.max; el.textContent = '+' + Math.max(0, n - st.max).toLocaleString('en-US') + ' more'; };
  const initPreview = fp => {
    const cfg = JSON.parse(fp.dataset.fp), svg = fp.querySelector('.fp-cover svg'), cv = fp.querySelector('.fp-units'), more = fp.querySelector('.fp-more');
    svg.dataset.h = 170;
    const V = cfg.n * cfg.price; cover(svg, V, { top: nice(1.08 * V), rid: cfg.rid });
    const st = fleetRow(cv, rowCfg(cfg)); moreLabel(more, cfg.n, st);
    fp._p = { cfg, st }; drawIn(svg); fitFigs(fp);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fitFigs(fp); cover(svg, cfg.n * cfg.price, { top: nice(1.08 * cfg.n * cfg.price), rid: cfg.rid }); const s2 = fleetRow(cv, rowCfg(cfg)); Object.assign(st, s2); moreLabel(more, cfg.n, st); }, 150); });
  };
  // FerraApp.preview(el, {rid, n, price, when}): answers every keystroke; numbers count over 300ms, the chart tweens, robots arrive or leave 12ms apart
  const preview = (root, f) => {
    const fp = root && (root.matches && root.matches('[data-fp]') ? root : root.querySelector && root.querySelector('[data-fp]')); if (!fp) return;
    if (!fp._p) initPreview(fp);
    const { cfg, st } = fp._p, rid = f.rid && cfg.names[f.rid] ? f.rid : cfg.rid, n = f.n === undefined ? cfg.n : Math.max(0, Math.round(+f.n || 0)), price = f.price === undefined ? cfg.price : Math.max(0, +f.price || 0);
    const when = f.when === undefined ? cfg.when : f.when;
    const V = n * price, figs = { v: money(V), l: money(V * ADV), c: money(V * (1 - ADV)), f: feeFmt(V * ADV * .015) };
    fitFigs(fp, figs); clearTimeout(fp._fit); fp._fit = setTimeout(() => fitFigs(fp), 340);   // fits the old and new figures while counting, then the new ones
    Object.keys(figs).forEach(k => countTo(fp.querySelector(`.fp-${k} dd`), figs[k], 300));
    if (n * price !== cfg.n * cfg.price || rid !== cfg.rid) cover(fp.querySelector('.fp-cover svg'), V, { tween: true, top: nice(1.08 * V), rid });   // the value curve follows the robot type
    moreLabel(fp.querySelector('.fp-more'), n, st);
    fp.querySelector('.fp-units').setAttribute('aria-label', n.toLocaleString('en-US') + ' robots');
    if (rid !== st.rid) { st.rid = rid; st.paint(); }
    Object.assign(cfg, { rid, n, price, when }); fp.dataset.fp = JSON.stringify(cfg);
    growTo(st, Math.min(n, st.max));
  };
  // the value chart (core.value_chart): both lines draw once, then moving across the chart rewrites the figures for that month
  document.querySelectorAll('.vc').forEach(fig => {
    const cfg = JSON.parse(fig.dataset.vc), plot = fig.querySelector('.vc-plot'), dv = fig.querySelector('.vc-f-v dd'), da = fig.querySelector('.vc-f-a dd'), dc = fig.querySelector('.vc-f-c dd'), when = fig.querySelector('.vc-when');
    const visible = () => [...plot.querySelectorAll('svg')].find(s => s.getBoundingClientRect().width > 0);
    const set = m => { const V = cfg.V, v = V * keep(m, cfg.rid), a = m >= TERM ? 0 : ADV * V * (1 - m / TERM);
      dv.textContent = money(v); da.textContent = a ? money(a) : 'Repaid'; dc.textContent = money(v - a); when.textContent = m === 0 ? 'today' : m % 12 === 0 ? 'at year ' + m / 12 : 'at month ' + m; };
    const mark = m => { const s = visible(); if (!s) return; const [W, pl, pr, pt, base, top] = s.dataset.g.split(',').map(Number), X = pl + m * (W - pl - pr) / 72, Y = v => base - v / top * (base - pt), g = s.querySelector('.vc-cursor'), a = m >= TERM ? 0 : ADV * cfg.V * (1 - m / TERM);
      g.removeAttribute('hidden'); const l = g.querySelector('.vc-cl'); l.setAttribute('x1', X); l.setAttribute('x2', X); const cv = g.querySelector('.vc-cv'), ca = g.querySelector('.vc-ca'); cv.setAttribute('cx', X); cv.setAttribute('cy', Y(cfg.V * keep(m, cfg.rid))); ca.setAttribute('cx', X); ca.setAttribute('cy', Y(a)); };
    let cur = 0;
    const go = m => { cur = Math.max(0, Math.min(72, m)); set(cur); mark(cur); };
    const off = () => { cur = 0; set(0); plot.querySelectorAll('.vc-cursor').forEach(g => g.setAttribute('hidden', '')); };
    const fromEv = ev => { const s = visible(); if (!s) return null; const [W, pl, pr] = s.dataset.g.split(',').map(Number), r = s.getBoundingClientRect(); return Math.round(((ev.clientX - r.left) / r.width * W - pl) / (W - pl - pr) * 72); };
    plot.addEventListener('pointermove', ev => { const m = fromEv(ev); if (m !== null) go(m); });
    plot.addEventListener('pointerdown', ev => { const m = fromEv(ev); if (m !== null) go(m); });
    plot.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') off(); });
    plot.addEventListener('keydown', ev => { const d = { ArrowRight: 1, ArrowLeft: -1, Home: -72, End: 72 }[ev.key]; if (d) { ev.preventDefault(); go(cur + d); } else if (ev.key === 'Escape') off(); });
    plot.addEventListener('blur', off);
    if (reduce) fig.classList.add('vc-on'); else new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); fig.classList.add('vc-go'); requestAnimationFrame(() => fig.classList.add('vc-on')); } }), { threshold: .25 }).observe(fig);
  });
  document.querySelectorAll('[data-fp]').forEach(fp => { if (!fp._p) initPreview(fp); });
  // fonts change label widths, so the charts redraw once they arrive
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { document.querySelectorAll('[data-fp]').forEach(fp => fitFigs(fp)); document.querySelectorAll('svg.cv').forEach(svg => { if (svg.dataset.cvs !== 'go') { const c = JSON.parse(svg.dataset.cv); svg._g = null; cover(svg, c.V, { top: c.top, rid: c.rid }); } }); });
  window.FerraApp = Object.assign(window.FerraApp || {}, { preview, cover, units, fleetRow, growTo, money, keep, fitFigs });
  // phone menu
  document.querySelectorAll('.nav').forEach(nv => { const b = nv.querySelector('.menu'), d = nv.querySelector('.drawer'); if (!b) return; b.addEventListener('click', () => { const o = d.hidden; d.hidden = !o; b.setAttribute('aria-expanded', o); }); });
})();
