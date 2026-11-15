// Robot Index page (pages/robot_index.py). One function per section, so a section's pick can be swapped alone:
//   opening()  every price as a dot, sorted by the scroll, poured into the robot picked and carried down into the lookup (design/ANIMATED-JOURNEY.md scenes 1 and 2);
//   lookup()  the picker, the wear-down robot and the statement, a pick's burst (scene 4) and the age drag (scene 5);
//   note()  the valuation note and its print;  board()  the monthly board's dot figures and the quote;  thin rows draw with board().
// Numbers: est() is the price tool's asking formula, median asking = exp(level + model effect - slope x age) with its 8 in 10 band, times the one auction share from index-data.json.
// The likely auction range is likely x exp(-/+ 1.2816 x the share's spread). pages/robot_index.py est() mirrors this for the first paint, so the page reads right before this script runs.
// Drawing follows the site's speed rules: one path and one fill per shade, a repaint only when the picture changes, resize only on a real width change. The opening and the robot's
// way down follow the scroll both ways and the wear-down follows the slider; the only two clocks answer a click: a pick's burst (about half a second) and the slider settling on a whole year.
// With reduced motion nothing pins and nothing runs on a clock: the opening stands sorted in plain flow and every pick lands at once.
(() => {
  const data = document.getElementById('ri-data'); if (!data) return;
  const { L, bots, P } = JSON.parse(data.textContent);
  const $ = id => document.getElementById(id), Z = 1.2816, MIN_USED = 8;
  const usd = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const pct = v => Math.round(v * 100) + '%';
  const plural = (n, one, many) => n.toLocaleString('en-US') + ' ' + (n === 1 ? one : (many || one + 's'));
  const ageTxt = a => a === 0 ? 'New' : `${a} year${a === 1 ? '' : 's'} old`;
  const byId = Object.fromEntries(L.models.map(m => [m.id, m]));
  const CLASS = { arm: 'Factory arm', cobot: 'Cobot', palletizer: 'Palletizer', amr: 'Warehouse mobile robot' };
  const set = (k, t) => document.querySelectorAll(`[data-v="${k}"]`).forEach(el => { if (el.textContent !== t) el.textContent = t; });
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v, ease = t => t * t * (3 - 2 * t), mix = (a, b, t) => a + (b - a) * t;
  // a fixed seed gives the same picture on every visit
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const css = getComputedStyle(document.documentElement), SERIF = css.getPropertyValue('--serif').trim() || 'Inter, sans-serif', SANS = css.getPropertyValue('--sans').trim() || 'Geist, sans-serif';
  const COB = '#2847ce', INK = '#0e1626', PALE = '#b8c3ea';

  // ------------------------------------------------------------ the numbers
  function est(id, age) {
    const m = byId[id], f = L.fams[m.fam], se = m.se != null ? m.se : f.se;
    const at = a => { const ask = Math.exp(f.level + m.fe - f.b * a), s = Math.sqrt(f.sd * f.sd + se * se + Math.pow((a - f.am) * f.bse, 2)), likely = ask * L.share, w = Math.exp(Z * L.sd);
      return { age: a, ask, alo: ask * Math.exp(-Z * s), ahi: ask * Math.exp(Z * s), likely, llo: likely / w, lhi: likely * w }; };
    return Object.assign(at(age), { m, f, at, kept: Math.exp(-f.b * age) });
  }
  const askWhy = (e, year) => { const { m, f } = e;
    if (m.any) return `Any ${f.label} built ${year}, from ${plural(f.n, 'listing')}`;
    if (m.own && m.fit >= MIN_USED) return `A ${m.label} built ${year}, from ${plural(m.fit, 'listing')}`;
    if (m.own) return `Thin data: ${plural(m.fit, 'listing')} of this model, leaning on ${f.n.toLocaleString('en-US')} ${f.label} listings`;
    return `Thin data: ${plural(m.fit, 'listing')} of this model, so it takes the ${f.label} level from ${plural(f.n, 'listing')}`; };
  const shareWhy = f => L.saleCls.includes(f.cls) ? `Share of asking, from ${L.nSales} auction sales` : `Learned from ${L.nSales} factory arm auction sales`;
  const shareNote = f => `Median of ${L.nSales} auction sales of factory arms matched to listings` + (L.saleCls.includes(f.cls) ? '' : '; cobots take the same share');

  // the reader's robot, from the address when it names one (#r=kuka-kr-210&y=2020), else the site's default
  const st = { id: L.default.id, age: L.now - L.default.year, hours: '', cond: L.default.cond };
  { const h = new URLSearchParams(location.hash.slice(1)), r = h.get('r'), y = +h.get('y'); if (r && byId[r]) st.id = r; if (y && y <= L.now && y >= L.now - 30) st.age = L.now - y; }

  // ------------------------------------------------------------ the dot robots, unpacked from 3 bytes a dot
  const BOTS = {};
  function bot(n) {
    if (BOTS[n]) return BOTS[n]; const b = bots[n]; if (!b) return null; const s = atob(b.p), pts = [];
    for (let i = 0; i < s.length; i += 3) { const v = s.charCodeAt(i + 2); pts.push({ x: s.charCodeAt(i), y: s.charCodeAt(i + 1), s: (v & 127) / 100, acc: v >> 7 }); }
    return (BOTS[n] = { w: b.w, h: b.h, pts });
  }
  // dots grouped by fill: one path and one fill() per group
  function batch() { const g = new Map(); return { add(k, x, y, r) { let p = g.get(k); if (!p) g.set(k, p = new Path2D()); p.moveTo(x + r, y); p.arc(x, y, r, 0, 6.2832); }, draw(c) { g.forEach((p, k) => { c.fillStyle = k; c.fill(p); }); } }; }
  function fit(cv, w, h) { const d = dpr(), W = Math.round(w * d), H = Math.round(h * d); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } return d; }

  // ============================================================ 1. lookup: the wear-down robot
  const mk = $('ri-mk'), md = $('ri-md'), hr = $('ri-hr'), cd = $('ri-cd'), sl = $('ri-age'), cv = $('ri-cv');
  let E, plan = null, lastKey = '', pourFor = '';
  const fillModels = () => { const m = mk.value; md.innerHTML = L.models.filter(x => L.fams[x.fam].maker === m).map(x => `<option value="${x.id}">${x.short.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join(''); };
  function makePlan() {
    const name = L.fams[E.m.fam].cls === 'cobot' ? 'cobot' : 'arm';
    if (plan && plan.id === E.m.id) return;
    const B = bot(name), N = B.pts.length, f = E.f;
    let cx = 0, cy = 0, far = 0, mx = 0; B.pts.forEach(p => { cx += p.x; cy += p.y; if (p.x > mx) mx = p.x; }); cx /= N; cy /= N;
    B.pts.forEach(p => { p.d = Math.hypot(p.x - cx, (p.y - cy) * .8); if (p.d > far) far = p.d; });
    // the top and outer dots fall first; a fixed seed so every visit draws the same
    const rnd = rng(7);
    const ord = B.pts.map((p, i) => ({ i, k: .55 * p.d / far + .55 * (1 - p.y / B.h) + .3 * rnd() })).sort((a, b) => b.k - a.k).map(o => o.i);
    const rank = new Int32Array(N); ord.forEach((pi, k) => { rank[pi] = k; });
    const keep = []; for (let a = 0; a <= 31; a++) keep.push(Math.exp(-f.b * a));
    // the pile: a mound big enough for the dots lost at 30 years
    const need = Math.ceil(N * (1 - keep[30])) + 1, P = Math.max(40, Math.ceil((Math.sqrt(8 * need + 1) - 1) / 2) + 1), GAP = 4, X0 = mx + 1 + GAP, slots = [];
    for (let row = 0; row < P; row++) for (let j = 0; j < P - row; j++) { const x = X0 + row * .5 + j, dx = x - (X0 + (P - 1) / 2), y = row * .87; slots.push({ x, y, k: y + Math.abs(dx) * 1.6 }); }
    slots.sort((a, b) => a.k - b.k);
    plan = { id: E.m.id, B, N, rank, keep, slots, X0, P, cols: X0 + P };
    lastKey = ''; pourFor = '';
  }
  // how far a dot has fallen at a (fractional) age: each year's dots fall while the slider crosses that year and land by its end, so the drop follows the slider both ways
  function prog(k, a) {
    const { keep, N } = plan;
    for (let n = 0; n < 30; n++) { const s = Math.floor(N * (1 - keep[n])), e = Math.floor(N * (1 - keep[n + 1]));
      if (k < s) return 1; if (k < e) { const sg = (k - s) / Math.max(1, e - s); return Math.max(0, Math.min(1, (a - n - .5 * sg) / .5)); } }
    return 0;
  }
  const keepAt = a => { const n = Math.min(29, Math.floor(a)), f = a - n, k = plan.keep; return Math.exp(Math.log(k[n]) * (1 - f) + Math.log(k[n + 1]) * f); };
  // the wear-down picture in the canvas's own CSS pixels. wearDot says where dot i sits at an age, how big and which shade: on the robot (k 0), mid fall (1) or in the pile (2).
  // The opening's flight and a pick's burst read the same function, so every dot they carry lands exactly where the canvas draws it.
  const SH = Array.from({ length: 21 }, (_, i) => `rgba(30,51,155,${i / 20})`);
  const shadeOf = (s, dim) => SH[Math.round(Math.round((.45 + .55 * s) * 10) / 10 * dim * 20)];
  const dimAt = a => 1 - .4 * Math.min(1, a / 30);   // the dots a robot keeps dim as it ages
  // the stage keeps one shape for every robot (the canvas's own 136 by 86), so a pick never moves the page under it; the robot and its pile are fitted inside
  function wearG() { const cw = cv.clientWidth; if (!cw || !plan) return null; const { B, cols } = plan, ch = cw * 86 / 136, pitch = Math.min(cw / cols, ch / (B.h + 10)), base = ch - 2; return { cw, ch, pitch, base, top: base - B.h * pitch, rad: pitch * .44 }; }
  const yearBox = G => { const w = plan.B.w * G.pitch, fs = Math.min(w * .3, G.ch * .3), lh = fs * 1.06, cy = G.top + plan.B.h * G.pitch * .52; return { w, fs, lh, cy, top: cy - lh * .6 }; };
  function wearDot(i, a, G, dim, o) {
    const p = plan.B.pts[i], k = plan.rank[i], t = prog(k, a), x0 = (p.x + .5) * G.pitch, y0 = G.top + (p.y + .5) * G.pitch;
    o.bx = x0; o.by = y0; o.br = Math.max(.35, G.rad * Math.max(p.s, .46));
    if (t <= 0) { o.x = x0; o.y = y0; o.r = o.br; o.c = shadeOf(p.s, dim); o.k = 0; return o; }
    const slot = plan.slots[k], x1 = (slot.x + .5) * G.pitch, y1 = G.base - (slot.y + .5) * G.pitch;
    if (t >= 1) { o.x = x1; o.y = y1; o.r = G.rad * .82; o.c = PALE; o.k = 2; return o; }
    const ez = t * t * (3 - 2 * t); o.x = x0 + (x1 - x0) * ez; o.y = y0 + (y1 - y0) * t * t - Math.sin(Math.PI * t) * 6 * G.pitch; o.r = G.rad; o.c = COB; o.k = 1; return o;
  }
  // the year the robot was built, large and faint behind it, rolling past like a counter as the age moves
  function yearBehind(c, G) {
    const n = Math.min(29, Math.floor(st.age)), f = st.age - n, { w, fs, lh, cy } = yearBox(G), cx = w / 2;
    c.save(); c.beginPath(); c.rect(0, cy - lh * .6, w, lh * 1.2); c.clip();
    c.font = `700 ${fs}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(40,71,206,.11)';
    c.fillText(String(L.now - n), cx, cy + f * lh); if (f > 0) c.fillText(String(L.now - n - 1), cx, cy + (f - 1) * lh);
    c.restore();
  }
  let ghost = false;   // true while the robot's dots are in the air (on their way down from the opening, or mid burst): the canvas keeps its floor and waits
  function drawWear() {
    const G = wearG(); if (!G) return;
    const key = G.cw + ':' + st.age.toFixed(2) + ':' + plan.id + ':' + (ghost ? 1 : 0); if (key === lastKey) return; lastKey = key;
    const { B } = plan, d = fit(cv, G.cw, G.ch), c = cv.getContext('2d'), bt = batch(), o = {}, dim = dimAt(st.age);
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, G.cw, G.ch);
    if (!ghost) yearBehind(c, G);
    if (!ghost) for (let i = 0; i < plan.N; i++) { wearDot(i, st.age, G, dim, o); bt.add(o.c, o.x, o.y, o.r); }
    bt.draw(c); c.fillStyle = INK; c.fillRect(0, G.base, G.cw, 1);
    // the two labels, in their own band under the floor line (no falling dot ever crosses a word): under the robot what it keeps, under the pile what it lost
    const kept = keepAt(st.age), cp = G.pitch, tk = $('ri-kept'), tl = $('ri-lost'), fallen = Math.floor(plan.N * (1 - kept));
    tk.textContent = `Kept ${pct(kept)}`; tk.style.left = (B.w / 2 * cp) + 'px'; tk.style.top = (G.ch + 6) + 'px';
    tl.textContent = `Lost ${pct(1 - kept)}`; tl.style.left = ((plan.X0 + plan.P / 2) * cp) + 'px'; tl.style.top = (G.ch + 6) + 'px';
    tl.hidden = fallen < 1; cv.parentNode.classList.toggle('ri-ghost', ghost);
  }
  let raf = 0; const paint = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawWear(); }); };

  // the words: one pass for the lookup and the note, run when the robot or its whole-year age changes
  function words() {
    const a = Math.round(st.age), y = L.now - a; E = est(st.id, a);
    const { m, f } = E, lr = `${usd(E.llo)} to ${usd(E.lhi)}`;
    set('likely', usd(E.likely)); set('lrange', `8 in 10 sell for ${lr}`); set('lrange2', lr);
    set('ask', usd(E.ask)); set('arange', `${usd(E.alo)} to ${usd(E.ahi)}`);
    set('askwhy', askWhy(E, y)); set('sharewhy', shareWhy(f)); set('sharewhy2', shareNote(f));
    set('agetxt', `${ageTxt(a)}, built ${y}`); sl.setAttribute('aria-valuetext', `${ageTxt(a)}, built ${y}`);
    note(y); openKey = '';
  }
  // the three lines of the sum follow the slider between whole years too; letting go settles them on the year
  const figures = e => { const lr = `${usd(e.llo)} to ${usd(e.lhi)}`; set('likely', usd(e.likely)); set('lrange', `8 in 10 sell for ${lr}`); set('lrange2', lr); set('ask', usd(e.ask)); };
  const live = () => figures(est(st.id, st.age));

  // ---- a pick (scene 4): the old robot bursts into its dots, they swirl and land as the new robot while the pile rebuilds, and the figures roll in step. One clock, about half a second, once per pick.
  let anim = 0;
  function snapshot() { const G = wearG(); if (!G) return null; const o = {}, dim = dimAt(st.age), out = []; for (let i = 0; i < plan.N; i++) { wearDot(i, st.age, G, dim, o); out.push([o.x, o.y, o.r, o.k]); } return out; }
  function burst(from, was) {
    const G = wearG(), o = {}, N = plan.N, M = from.length, dim = dimAt(st.age), rnd = rng(11), dots = [], cx = plan.B.w / 2 * G.pitch, cy = G.top + plan.B.h * G.pitch * .55, now = E;
    for (let i = 0; i < N; i++) { wearDot(i, st.age, G, dim, o); const a = from[N === M ? i : Math.floor(i * M / N)], dx = a[0] - cx, dy = a[1] - cy, len = Math.hypot(dx, dy) || 1;
      dots.push({ ax: a[0], ay: a[1], ar: a[2], bx: o.x, by: o.y, br: o.r, c: o.c, nx: dx / len, ny: dy / len, amp: (a[3] === 2 ? 2 + 3 * rnd() : 5 + 9 * rnd()) * G.pitch, dl: .2 * rnd() }); }
    cancelAnimationFrame(anim); ghost = true; drawWear(); figures(was);
    const t0 = performance.now(), step = t1 => { const t = clamp01((t1 - t0) / 560), r = cv.getBoundingClientRect(), c = flyBegin(), bt = batch();
      for (const q of dots) { const tt = clamp01((t - q.dl) / (1 - q.dl)), e = ease(tt), sw = Math.sin(Math.PI * tt) * q.amp, an = 2.4 * tt, cs = Math.cos(an), sn = Math.sin(an);
        bt.add(tt > .6 ? q.c : COB, r.left + mix(q.ax, q.bx, e) + (q.nx * cs - q.ny * sn) * sw, r.top + mix(q.ay, q.by, e) + (q.nx * sn + q.ny * cs) * sw, mix(q.ar, q.br, e)); }
      bt.draw(c); const e = ease(t), at = k => mix(was[k], now[k], e); figures({ likely: at('likely'), llo: at('llo'), lhi: at('lhi'), ask: at('ask') });
      if (t < 1) anim = requestAnimationFrame(step); else { anim = 0; words(); sync(); } };
    anim = requestAnimationFrame(step);
  }
  function lookup() {
    let snap = 0;
    mk.value = L.fams[byId[st.id].fam].maker; fillModels(); md.value = st.id; sl.value = st.age; cd.value = st.cond;
    const remember = () => { try { history.replaceState(null, '', `#r=${st.id}&y=${L.now - Math.round(st.age)}`); } catch (x) {} };
    const robot = () => { const r = cv.getBoundingClientRect(), seen = r.bottom > 0 && r.top < innerHeight, from = !reduce && !ghost && !anim && seen ? snapshot() : null, was = E;
      cancelAnimationFrame(snap); snap = 0; st.age = Math.round(st.age); sl.value = st.age; E = est(st.id, st.age); makePlan(); words(); remember();
      if (from) return burst(from, was); if (anim) { cancelAnimationFrame(anim); anim = 0; } sync(); };
    mk.addEventListener('change', () => { fillModels(); st.id = md.value; robot(); });
    md.addEventListener('change', () => { st.id = md.value; robot(); });
    cd.addEventListener('change', () => { st.cond = cd.value; note(L.now - Math.round(st.age)); });
    hr.addEventListener('input', () => { const v = hr.value.replace(/[^0-9]/g, ''); st.hours = v ? (+v).toLocaleString('en-US') : ''; note(L.now - Math.round(st.age)); });
    // dragging: the picture and the figures follow the thumb; the words change on each whole year
    sl.addEventListener('input', () => { cancelAnimationFrame(snap); snap = 0; const was = Math.round(st.age); st.age = +sl.value; if (Math.round(st.age) !== was) words(); live(); paint(); });
    // letting go: the thumb settles on the whole year (a short glide; at once with reduced motion)
    const land = to => { st.age = to; sl.value = to; words(); paint(); remember(); };
    sl.addEventListener('change', () => { const from = +sl.value, to = Math.round(from); cancelAnimationFrame(snap); snap = 0; if (reduce || Math.abs(to - from) < .02) return land(to);
      const t0 = performance.now(), step = t1 => { const t = clamp01((t1 - t0) / 160); if (t >= 1) { snap = 0; return land(to); } st.age = mix(from, to, 1 - Math.pow(1 - t, 3)); sl.value = st.age; live(); drawWear(); snap = requestAnimationFrame(step); };
      snap = requestAnimationFrame(step); });
    // arrow keys move a whole year at a time
    sl.addEventListener('keydown', ev => { const d = /Right|Up|PageUp/.test(ev.key) ? 1 : /Left|Down|PageDown/.test(ev.key) ? -1 : 0; if (!d && !/Home|End/.test(ev.key)) return; ev.preventDefault(); cancelAnimationFrame(snap); snap = 0;
      land(ev.key === 'Home' ? 0 : ev.key === 'End' ? 30 : Math.max(0, Math.min(30, Math.round(st.age) + d))); });
    E = est(st.id, Math.round(st.age)); makePlan(); words(); paint();
  }

  // ============================================================ 2. the valuation note (credit memo)
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = () => { try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, x.value])); return `${+p.day} ${MON[+p.month - 1]} ${p.year}`; } catch (x) { return ''; } };
  function curveSVG(rows) {
    const W = 520, H = 230, l = 56, r = 100, t = 14, b = 34, top = Math.max(...rows.map(p => p.hi)) * 1.04;
    const step = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000].find(s => top / s <= 4) || 100000;
    const X = k => l + (W - l - r) * k / 6, Y = v => t + (H - t - b) * (1 - v / top), ln = f => rows.map((p, i) => `${i ? 'L' : 'M'}${X(p.k).toFixed(1)} ${Y(f(p)).toFixed(1)}`).join('');
    let g = ''; for (let v = 0; v <= top; v += step) g += `<line x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#e5e9f1"/><text x="${l - 8}" y="${(Y(v) + 5).toFixed(1)}" text-anchor="end" class="ax">${v ? '$' + (v / 1000) + 'k' : '$0'}</text>`;
    rows.forEach(p => { if (p.k % 2 === 0) g += `<text x="${X(p.k).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="ax">${p.k === 0 ? 'Now' : p.year}</text>`; });
    const band = `<path d="${ln(p => p.hi)}${rows.slice().reverse().map(p => `L${X(p.k).toFixed(1)} ${Y(p.lo).toFixed(1)}`).join('')}Z" fill="rgba(40,71,206,.1)"/>`;
    const e = rows[6], s = rows[0];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Likely auction price falls from ${usd(s.likely)} now to ${usd(e.likely)} in ${e.year}">${g}${band}<path d="${ln(p => p.likely)}" fill="none" stroke="#2847ce" stroke-width="2.5"/>`
      + `<circle cx="${X(0)}" cy="${Y(s.likely).toFixed(1)}" r="4.5" fill="#2847ce"/><circle cx="${X(6)}" cy="${Y(e.likely).toFixed(1)}" r="4.5" fill="#fff" stroke="#2847ce" stroke-width="2"/>`
      + `<text x="${X(6) + 12}" y="${(Y(e.likely) - 2).toFixed(1)}" class="lb">${usd(e.likely)}</text><text x="${X(6) + 12}" y="${(Y(e.likely) + 16).toFixed(1)}" class="ax">likely</text></svg>`;
  }
  function note(y) {
    if (!E) return; const { m, f } = E, a = L.now - y, thin = m.fit < MIN_USED && !m.any;
    set('today', today()); set('title', `${m.label}, built ${y}.`); set('sub', `Likely auction price ${usd(E.likely)}, from public listings and auction results.`);
    set('cls', CLASS[f.cls] || 'Robot'); set('age', ageTxt(a)); set('hours', st.hours ? `${st.hours}, as entered` : 'Not given');
    set('cond', st.cond === 'Not given' ? 'Not given' : `${st.cond}, as entered`);
    const rows = []; for (let k = 0; k <= 6; k++) { const q = Math.exp(-f.b * k); rows.push({ k, year: L.now + k, likely: E.likely * q, lo: E.llo * q, hi: E.lhi * q });
      set('y' + k, k ? String(L.now + k) : 'Now'); set('a' + k, String(a + k)); set('l' + k, usd(E.likely * q)); set('r' + k, `${usd(E.llo * q)} to ${usd(E.lhi * q)}`); }
    const cvh = $('vn-curve'); if (cvh) cvh.innerHTML = curveSVG(rows);
    set('cfound', `${m.any ? f.label : m.short} listings found`); set('nfound', m.n.toLocaleString('en-US')); set('npriced', m.priced.toLocaleString('en-US'));
    set('cfit', thin ? 'in the estimate, thin data' : 'in the estimate'); set('nfit', m.fit.toLocaleString('en-US'));
    const tr = document.querySelector('[data-v="thinrow"]'); if (tr) tr.classList.toggle('thin', thin);
    set('cfam', `${f.label} listings setting the level`); set('nfam', f.n.toLocaleString('en-US')); set('nsell', f.sellers.toLocaleString('en-US'));
    set('srcs', f.src.map(([k, v]) => `${k} ${v}`).join(', '));
  }
  function printing() { const b = $('ri-print'); if (b) b.addEventListener('click', () => window.print()); }

  // ============================================================ 3. the monthly board: round-dot figures, the robots, the quote
  const F57 = { '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], '.': ['0', '0', '0', '0', '0', '0', '1'], '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'], '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'] };
  // columns of a text in the 5 by 7 face, right-aligned in n columns; unlit cells stay faint so the board shows where a number will be
  function cellsOf(t, n) { const cols = []; for (const ch of t) { const g = F57[ch]; if (!g) continue; if (cols.length) cols.push(Array(7).fill(0)); for (let x = 0; x < g[0].length; x++) cols.push(g.map(r => +r[x])); }
    while (cols.length < n) cols.unshift(Array(7).fill(0)); return cols.slice(-n); }
  function sparkCols(v, n) { return Array.from({ length: n }, (_, i) => { const c = Array(7).fill(0); if (i < v.length) c[Math.max(0, Math.min(6, Math.round(3 - (v[i] - 100))))] = 1; return c; }); }
  function drawMx(cv) {
    const n = +cv.dataset.cells, p = +cv.dataset.p, sp = cv.classList.contains('sp'), W = sp ? cv.parentNode.clientWidth : n * p, pw = W / n, H = 7 * p;
    if (!W) return; if (cv._w === W) return; cv._w = W;
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; const d = fit(cv, W, H), c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const cols = sp ? sparkCols(cv.dataset.sp.split(',').map(Number), n) : cellsOf(cv.dataset.t || '', n), bt = batch();
    cols.forEach((col, x) => col.forEach((v, y) => { const cx = (x + .5) * pw, cy = (y + .5) * p; if (v) bt.add('#2847ce', cx, cy, p * .42); else bt.add('rgba(40,71,206,.14)', cx, cy, p * .2); }));
    bt.draw(c);
  }
  // a small dot robot standing on the bottom of its box: ink for a class with a level, pale for one without
  function drawBot(cv) {
    const b = bot(cv.dataset.b), box = cv.parentNode; if (!b) return; const bw = box.clientWidth, bh = box.clientHeight; if (!bw) return;
    const key = bw + 'x' + bh; if (cv._k === key) return; cv._k = key;
    const pitch = Math.min(bh / b.h, bw / b.w), W = pitch * b.w, H = pitch * b.h, pale = cv.dataset.tone === 'pale';
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; const d = fit(cv, W, H), c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const bt = batch();
    b.pts.forEach(q => { const s = Math.round(q.s * 10) / 10, x = (q.x + .5) * pitch, y = (q.y + .5) * pitch;
      if (pale) bt.add(`rgba(40,71,206,${(.12 + .18 * s).toFixed(2)})`, x, y, Math.max(.35, pitch * .38 * s));
      else bt.add(`rgba(30,51,155,${(.45 + .55 * s).toFixed(2)})`, x, y, Math.max(.4, pitch * .44 * Math.max(s, .46))); });
    bt.draw(c);
  }
  function board() {
    document.querySelectorAll('canvas.mx').forEach(drawMx); document.querySelectorAll('canvas.ri-bot').forEach(drawBot);
    const q = document.querySelector('.ri-q'); if (!q) return; const Q = JSON.parse(q.dataset.q), sel = $('ri-qc'), out = $('ri-qs'), cp = $('ri-cp');
    sel.addEventListener('change', () => { out.textContent = Q[sel.value]; });
    let t = 0; cp.addEventListener('click', () => { const done = () => { cp.textContent = 'Copied'; clearTimeout(t); t = setTimeout(() => { cp.textContent = 'Copy the quote'; }, 1600); };
      try { navigator.clipboard.writeText(out.textContent).then(done, () => {}); } catch (x) {} });
  }

  // ============================================================ 0. the opening: every price as a dot (scenes 1 and 2)
  // One dot per price the index holds. They stand scattered under the heading, sort themselves by price as the page scrolls (asking prices over auction sales, on one price line),
  // then pour into the robot picked, standing at its likely auction price. When the scene lets go, the robot's dots ride a screen-fixed canvas down into the lookup and take their
  // places at its age, the lost ones dropping to the pile. All of it is a plain function of the scroll position, so it runs backwards on the way up and never sits half done on a clock.
  const run = $('prices'), pin = run && run.querySelector('.ri-opin'), ocv = $('ri-ocv'), ohead = run && run.querySelector('.ri-ohead'), fly = $('ri-fly'), navEl = document.querySelector('.nav');
  const moving = !reduce && !!pin && getComputedStyle(pin).position === 'sticky';
  const PR = (P ? P.a.map(v => ({ v, sale: 0 })).concat(P.s.map(v => ({ v, sale: 1 }))) : []).filter(q => q.v > 0);
  const nice = (v, up) => { const k = Math.pow(10, Math.floor(Math.log10(v))), m = v / k; return (up ? (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) : (m >= 5 ? 5 : m >= 2 ? 2 : 1)) * k; };
  // the price line runs between the round figures just outside the lowest and the highest price, so every dot stands at its own price
  PR.sort((a, b) => a.v - b.v || a.sale - b.sale);
  const LO = PR.length ? nice(PR[0].v, false) : 1, HI = PR.length ? Math.max(nice(PR[PR.length - 1].v, true), LO * 10) : 10, uOf = v => clamp01(Math.log(v / LO) / Math.log(HI / LO));
  PR.forEach(q => { q.u = uOf(q.v); });
  const LAB = 26, GAP = 18;
  let OL = null, openKey = '', flyOn = false, fontsIn = 0;
  function flyBegin() { if (!flyOn) { fly.style.display = 'block'; flyOn = true; } const w = fly.clientWidth, h = fly.clientHeight, d = fit(fly, w, h), c = fly.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h); return c; }
  function flyEnd() { if (flyOn) { flyOn = false; fly.style.display = 'none'; } }
  // where everything in the opening stands, in the pinned box's own pixels. Run again only when the width changes.
  function openLayout() {
    OL = null; if (!pin || !PR.length) return; const W = pin.clientWidth, H = pin.clientHeight; if (!W || !H) return;
    const pr = pin.getBoundingClientRect(), hr = ohead.getBoundingClientRect(), x0 = Math.round(hr.left - pr.left), x1 = W - x0, hb = hr.bottom - pr.top, M = PR.length;
    const seen = moving ? Math.min(H, innerHeight) : H, ay = seen - 16 - LAB, yTop = hb + 22;
    // the dot pitch: the largest at which both rows fit between the heading and the price line
    let d = W < 700 ? 9 : 15, C = 1, pkA = 0, pkS = 0;
    for (; d >= 3; d -= .5) { C = Math.max(1, Math.floor((x1 - x0) / d)); const nA = new Int16Array(C), nS = new Int16Array(C); pkA = pkS = 0;
      for (const q of PR) { const k = Math.min(C - 1, Math.floor(q.u * C)); if (q.sale) { if (++nS[k] > pkS) pkS = nS[k]; } else if (++nA[k] > pkA) pkA = nA[k]; }
      if ((pkA + pkS) * d + 2 * LAB + GAP <= Math.min(ay - yTop, Math.max(.8 * (x1 - x0), .62 * (ay - yTop))) || d <= 3) break; }
    const cw = (x1 - x0) / C, ayA = ay - pkS * d - LAB - GAP, nA = new Int16Array(C), nS = new Int16Array(C);
    for (const q of PR) { const k = Math.min(C - 1, Math.floor(q.u * C)); q.sx = x0 + (k + .5) * cw; q.sy = q.sale ? ay - 2 - (nS[k]++ + .5) * d : ayA - 2 - (nA[k]++ + .5) * d; }
    // the first frame: the same dots scattered over the part of the scene on screen before any scrolling, each in its own cell of a loose grid so none sit on top of each other
    const sb = (moving ? Math.min(H, innerHeight - (navEl ? navEl.offsetHeight : 0)) : H) - 18, sh = Math.max(40, sb - yTop), sw = x1 - x0, gc = Math.max(1, Math.round(Math.sqrt(M * sw / sh))), gr = Math.ceil(M / gc), rnd = rng(3), cells = Array.from({ length: gc * gr }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    PR.forEach((q, j) => { const cell = cells[j], gx = cell % gc, gy = (cell / gc) | 0; q.x0 = x0 + (gx + .5 + (rnd() - .5) * .8) * sw / gc; q.y0 = yTop + (gy + .5 + (rnd() - .5) * .8) * sh / gr; });
    OL = { W, H, x0, x1, hb, ay, ayA, d, r: d * .4, topA: ayA - pkA * d - LAB, topS: ay - pkS * d - LAB }; pourFor = ''; openKey = '';
  }
  // the robot the dots pour into: the lookup's own robot, at the lookup's own dot pitch where there is room, standing on the price line at its likely auction price
  function openRobot() {
    const G = wearG(); if (!OL || !G) return false; const { B } = plan, rp = Math.max(1, Math.min(G.pitch, (OL.ay - OL.hb - 60) / B.h)), w = B.w * rp, px = OL.x0 + uOf(E.likely) * (OL.x1 - OL.x0);
    OL.rp = rp; OL.px = px; OL.rx = Math.max(OL.x0, Math.min(OL.x1 - w, px - w / 2)); OL.ry = OL.ay - 1 - B.h * rp;
    if (pourFor === plan.id) return true; pourFor = plan.id;
    // which price dot pours into which robot dot: both read left to right, so the low prices fill the robot's left side. More robot dots than prices: a price dot splits. Fewer: several merge.
    const N = plan.N, M = PR.length, K = Math.max(N, M), ro = Array.from({ length: N }, (_, i) => i).sort((a, b) => B.pts[a].x - B.pts[b].x || B.pts[a].y - B.pts[b].y), src = new Int32Array(K), dst = new Int32Array(K);
    for (let k = 0; k < K; k++) { if (N >= M) { dst[k] = ro[k]; src[k] = Math.floor(k * M / N); } else { src[k] = k; dst[k] = ro[Math.floor(k * N / M)]; } }
    OL.K = K; OL.src = src; OL.dst = dst; return true;
  }
  const text = (c, t, x, y, col, a, weight, align) => { c.font = `${weight} 16px ${SANS}`; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic'; const w = c.measureText(t).width, l = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const pl = Math.max(OL.x0, l - 4), pr = Math.min(OL.x1, l + w + 4);   // a plate of the ground colour under each label, kept inside the page's grid edges
    c.globalAlpha = Math.min(1, a * 3.4); c.fillStyle = '#fff'; c.fillRect(pl, y - 17, pr - pl, 23); c.globalAlpha = a; c.fillStyle = col; c.fillText(t, x, y); c.globalAlpha = 1; };   // the plate is solid once the label is a third in, so a dot still moving under a label that is fading in never shows through its letters
  const tickText = v => '$' + v.toLocaleString('en-US');
  // p is the scene's progress, 0 to 1: sorted by .35 with its labels in by .4, held to .5 for a read, poured into the robot by .93 with its name and price in by 1. robotHere is false once the robot's dots have left for the lookup, and gone says how far they are.
  function drawOpen(p, robotHere, gone) {
    if (!OL) return; const away = clamp01((gone || 0) * 3), key = [OL.W, OL.H, p.toFixed(4), robotHere ? 1 : 0, away.toFixed(2), plan.id, Math.round(E.likely), fontsIn].join(':'); if (key === openKey) return; openKey = key;
    const { W, H, x0, x1, ay, ayA, r } = OL, d = fit(ocv, W, H), c = ocv.getContext('2d'), bt = batch(), M = PR.length;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const v = moving ? clamp01(p / .4) : 1, u = moving ? clamp01((p - .5) / .5) : 0, vs = clamp01(v / .88), up = clamp01(u / .86), la = clamp01((v - .88) / .12), rows = la * (1 - clamp01(u * 6)), ua = clamp01((u - .86) / .14);   // the dots finish sorting (vs), and later pouring (up), before the labels over them fade in (la, ua), and the two row labels are gone before the pouring dots rise past them (rows), so no dot moves under a word
    if (u > 0 && !openRobot()) return;
    if (u <= 0) for (let j = 0; j < M; j++) { const q = PR[j], t = ease(clamp01(vs * 1.5 - .5 * j / Math.max(1, M - 1))); bt.add(q.sale ? INK : COB, mix(q.x0, q.sx, t), mix(q.y0, q.sy, t), r); }
    else if (robotHere || u < 1) { const { B } = plan, { rp, rx, ry, src, dst, K } = OL;
      // the robot fills from the floor up: the lowest rows of dots land first
      for (let k = 0; k < K; k++) { const q = PR[src[k]], pt = B.pts[dst[k]], t = ease(clamp01(up * 1.8 - .8 * (B.h - 1 - pt.y) / Math.max(1, B.h - 1))), tx = rx + (pt.x + .5) * rp, ty = ry + (pt.y + .5) * rp;
        if (t <= 0) { bt.add(q.sale ? INK : COB, q.sx, q.sy, r); continue; }
        bt.add(t < .5 ? (q.sale ? INK : COB) : shadeOf(pt.s, 1), mix(q.sx, tx, t), mix(q.sy, ty, t) - Math.sin(Math.PI * t) * Math.min(48, Math.abs(tx - q.sx) * .12), mix(r, Math.max(.35, rp * .44 * Math.max(pt.s, .46)), t)); } }
    bt.draw(c);
    if (la > 0) {
      // the price line with a tick at each power of ten, and the asking row's own floor while its dots stand on it
      c.globalAlpha = la; c.fillStyle = INK; c.fillRect(x0, ay, x1 - x0, 1); c.globalAlpha = rows; c.fillStyle = '#c9d0de'; c.fillRect(x0, ayA, x1 - x0, 1); c.globalAlpha = 1;
      for (let t = Math.pow(10, Math.ceil(Math.log10(LO) - 1e-9)); t <= HI * 1.0001; t *= 10) { const x = x0 + uOf(t) * (x1 - x0), near = Math.abs(x - OL.px) < 76 ? 1 - clamp01((u - .55) / .2) : 1; c.globalAlpha = la; c.fillStyle = INK; c.fillRect(Math.round(x) - (x > x1 - 1 ? 1 : 0), ay, 1, 6);
        if (near > 0) text(c, tickText(t), x < x0 + 30 ? x0 : x > x1 - 30 ? x1 : x, ay + 23, '#5b6474', la * near, 400, x < x0 + 30 ? 'left' : x > x1 - 30 ? 'right' : 'center'); }
      if (rows > 0) { text(c, plural(P.a.length, 'asking price'), x0, OL.topA + 17, COB, rows, 600); text(c, plural(P.s.length, 'auction sale'), x0, OL.topS + 17, INK, rows, 600); }
    }
    if (ua > 0) {
      // the robot's name over it, and its likely auction price marked on the line it stands on
      const w = plan.B.w * OL.rp, cx = OL.rx + w / 2, name = `${E.m.label}, built ${L.now - Math.round(st.age)}`; c.font = `600 16px ${SANS}`; const nw = c.measureText(name).width / 2 + 4;
      if (away < 1) text(c, name, Math.max(x0 + nw, Math.min(x1 - nw, cx)), OL.ry - 12, INK, ua * (1 - away), 600, 'center');
      c.globalAlpha = ua; c.fillStyle = COB; c.fillRect(Math.round(OL.px) - 1, ay, 2, 8); c.globalAlpha = 1; const pt = usd(E.likely); c.font = `600 16px ${SANS}`; const pw = c.measureText(pt).width / 2 + 4;
      text(c, pt, Math.max(x0 + pw, Math.min(x1 - pw, OL.px)), ay + 23, COB, ua, 600, 'center');
    }
  }
  // the robot on its way from the price line down into the lookup, q from 0 (still standing on the line) to 1 (in its place in the lookup). It rides up the screen on its line for the
  // first third, then sinks through the line and steps down the page into its place, quicker than the page moves, so it is behind the lookup's own words (its heading, its picker and,
  // on a phone, its price) only briefly: a dot between the price line and the stage is not drawn, with a soft edge, so no dot ever sits on a word. The dots it has lost at its age hop
  // off to the pile at the end.
  function drawFlight(q) {
    const G = wearG(); if (!G || !OL || !openRobot()) return; const a = pin.getBoundingClientRect(), b = cv.getBoundingClientRect(), c = flyBegin(), bt = batch(), o = {}, { B } = plan, dim = dimAt(st.age), rp = OL.rp;
    const tb = ease(clamp01((q - .3) / .55)), tl = ease(clamp01((q - .72) / .28)), hop = Math.sin(Math.PI * tl) * 6 * G.pitch, top = a.top + OL.ay + 1, F = 22;
    for (let i = 0; i < plan.N; i++) { const pt = B.pts[i]; wearDot(i, st.age, G, dim, o);
      let x = mix(a.left + OL.rx + (pt.x + .5) * rp, b.left + o.bx, tb), y = mix(a.top + OL.ry + (pt.y + .5) * rp, b.top + o.by, tb), r = mix(Math.max(.35, rp * .44 * Math.max(pt.s, .46)), o.br, tb), col = shadeOf(pt.s, tb > .5 ? dim : 1);
      if (o.k && tl > 0) { x += (o.x - o.bx) * tl; y += (o.y - o.by) * tl - hop; r = mix(r, o.r, tl); col = tl > .7 ? o.c : COB; }
      if (y > top && y < b.top) { const f = Math.max(1 - (y - top) / 5, 1 - (b.top - y) / F); if (f <= 0) continue; r *= f; }   // 5px under the line: the figures under it start 11px down
      bt.add(col, x, y, r); }
    bt.draw(c);
  }
  // the scene's place: how far the pinned part has run (y over S), and the scroll at which the lookup's robot stands mid screen (ys)
  function place() { const r = run.getBoundingClientRect(), VH = pin.offsetHeight, S = run.offsetHeight - VH, G = wearG(), b = cv.getBoundingClientRect(); return { y: -r.top, S, VH, ys: Math.max(S + .45 * VH, (b.top - r.top) + (G ? G.ch / 2 : 0) - VH / 2) }; }
  let queued = false;
  function tick() {
    queued = false; if (anim || !moving) return; if (!OL) openLayout(); if (!OL) return;
    const { y, S, VH, ys } = place(), p = clamp01(y / Math.max(1, S)), q = clamp01((y - S) / Math.max(1, ys - S)), g = q < 1;
    if (g !== ghost) { ghost = g; lastKey = ''; }
    if (y <= S) { flyEnd(); drawOpen(p, true); } else if (g) { drawOpen(1, false, q); drawFlight(q); } else { flyEnd(); if (y < S + VH) drawOpen(1, false, 1); }
    drawWear();
  }
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  // bring every picture in line with where the page stands now: after a pick, a burst, a width change
  function sync() { if (moving) { openKey = ''; tick(); } else { ghost = false; flyEnd(); drawOpen(0, false); drawWear(); } }
  function opening() {
    if (!run || !pin || !ocv || !fly) return;
    openLayout(); sync();
    if (moving) { addEventListener('scroll', ask, { passive: true });
      // an address that names a robot opens on the lookup, with the robot already in place
      if (/(^|[#&])r=/.test(location.hash) && scrollY < 2) { const { ys } = place(); scrollTo({ top: Math.ceil(run.getBoundingClientRect().top + scrollY + ys) + 1, behavior: 'instant' }); tick(); } }
    // the labels are drawn in the page's own type: draw again once it has arrived
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsIn = 1; lastKey = ''; openLayout(); sync(); });
  }

  lookup(); opening(); printing(); board();
  // a real width change lays everything out again; a height-only change (a phone's address bar) does nothing
  let w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; lastKey = ''; openLayout(); sync(); document.querySelectorAll('canvas.mx').forEach(c => { c._w = 0; drawMx(c); }); document.querySelectorAll('canvas.ri-bot').forEach(drawBot); });
})();
