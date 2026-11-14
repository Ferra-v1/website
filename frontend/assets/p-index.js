// Robot Index page (pages/robot_index.py). One function per section, so a section's pick can be swapped alone:
//   lookup()  the picker, the wear-down robot and the statement;  note()  the valuation note and its print;  board()  the monthly board's dot figures and the quote;  thin rows draw with board().
// Numbers: est() is the price tool's asking formula, median asking = exp(level + model effect - slope x age) with its 8 in 10 band, times the one auction share from index-data.json.
// The likely auction range is likely x exp(-/+ 1.2816 x the share's spread). pages/robot_index.py est() mirrors this for the first paint, so the page reads right before this script runs.
// Drawing follows the site's speed rules: one path and one fill per shade, a repaint only when the picture changes, the wear-down moves only with the slider, resize only on a real width change.
(() => {
  const data = document.getElementById('ri-data'); if (!data) return;
  const { L, bots } = JSON.parse(data.textContent);
  const $ = id => document.getElementById(id), Z = 1.2816, MIN_USED = 8;
  const usd = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const pct = v => Math.round(v * 100) + '%';
  const plural = (n, one, many) => n.toLocaleString('en-US') + ' ' + (n === 1 ? one : (many || one + 's'));
  const ageTxt = a => a === 0 ? 'New' : `${a} year${a === 1 ? '' : 's'} old`;
  const byId = Object.fromEntries(L.models.map(m => [m.id, m]));
  const CLASS = { arm: 'Factory arm', cobot: 'Cobot', palletizer: 'Palletizer', amr: 'Warehouse mobile robot' };
  const set = (k, t) => document.querySelectorAll(`[data-v="${k}"]`).forEach(el => { if (el.textContent !== t) el.textContent = t; });
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

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
  let E, plan = null, lastKey = '';
  const fillModels = () => { const m = mk.value; md.innerHTML = L.models.filter(x => L.fams[x.fam].maker === m).map(x => `<option value="${x.id}">${x.short.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join(''); };
  function makePlan() {
    const name = L.fams[E.m.fam].cls === 'cobot' ? 'cobot' : 'arm';
    if (plan && plan.id === E.m.id) return;
    const B = bot(name), N = B.pts.length, f = E.f;
    let cx = 0, cy = 0, far = 0, mx = 0; B.pts.forEach(p => { cx += p.x; cy += p.y; if (p.x > mx) mx = p.x; }); cx /= N; cy /= N;
    B.pts.forEach(p => { p.d = Math.hypot(p.x - cx, (p.y - cy) * .8); if (p.d > far) far = p.d; });
    // the top and outer dots fall first; a fixed seed so every visit draws the same
    let seed = 7; const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const ord = B.pts.map((p, i) => ({ i, k: .55 * p.d / far + .55 * (1 - p.y / B.h) + .3 * rnd() })).sort((a, b) => b.k - a.k).map(o => o.i);
    const rank = new Int32Array(N); ord.forEach((pi, k) => { rank[pi] = k; });
    const keep = []; for (let a = 0; a <= 31; a++) keep.push(Math.exp(-f.b * a));
    // the pile: a mound big enough for the dots lost at 30 years
    const need = Math.ceil(N * (1 - keep[30])) + 1, P = Math.max(40, Math.ceil((Math.sqrt(8 * need + 1) - 1) / 2) + 1), GAP = 4, X0 = mx + 1 + GAP, slots = [];
    for (let row = 0; row < P; row++) for (let j = 0; j < P - row; j++) { const x = X0 + row * .5 + j, dx = x - (X0 + (P - 1) / 2), y = row * .87; slots.push({ x, y, k: y + Math.abs(dx) * 1.6 }); }
    slots.sort((a, b) => a.k - b.k);
    plan = { id: E.m.id, B, N, rank, keep, slots, X0, P, cols: X0 + P };
    cv.style.aspectRatio = plan.cols + '/' + (B.h + 10);
    lastKey = '';
  }
  // how far a dot has fallen at a (fractional) age: each year's dots fall while the slider crosses that year and land by its end, so the drop follows the slider both ways
  function prog(k, a) {
    const { keep, N } = plan;
    for (let n = 0; n < 30; n++) { const s = Math.floor(N * (1 - keep[n])), e = Math.floor(N * (1 - keep[n + 1]));
      if (k < s) return 1; if (k < e) { const sg = (k - s) / Math.max(1, e - s); return Math.max(0, Math.min(1, (a - n - .5 * sg) / .5)); } }
    return 0;
  }
  const keepAt = a => { const n = Math.min(29, Math.floor(a)), f = a - n, k = plan.keep; return Math.exp(Math.log(k[n]) * (1 - f) + Math.log(k[n + 1]) * f); };
  function drawWear() {
    const cw = cv.clientWidth; if (!cw || !plan) return;
    const key = cw + ':' + st.age.toFixed(2) + ':' + plan.id; if (key === lastKey) return; lastKey = key;
    const { B, cols } = plan, ch = cw * (B.h + 10) / cols, d = fit(cv, cw, ch), c = cv.getContext('2d'), W = cv.width, H = cv.height;
    const pitch = W / cols, base = H - 2 * d, rad = pitch * .44, top = base - B.h * pitch, bt = batch(); let minY = B.h;
    c.clearRect(0, 0, W, H);
    B.pts.forEach((p, i) => {
      const t = prog(plan.rank[i], st.age), x0 = (p.x + .5) * pitch, y0 = top + (p.y + .5) * pitch;
      if (t <= 0) { if (p.y < minY) minY = p.y; bt.add(`rgba(30,51,155,${Math.round((.45 + .55 * p.s) * 10) / 10})`, x0, y0, Math.max(.35 * d, rad * Math.max(p.s, .46))); return; }
      const slot = plan.slots[plan.rank[i]], x1 = (slot.x + .5) * pitch, y1 = base - (slot.y + .5) * pitch;
      if (t >= 1) { bt.add('#b8c3ea', x1, y1, rad * .82); return; }
      const ez = t * t * (3 - 2 * t); bt.add('#2847ce', x0 + (x1 - x0) * ez, y0 + (y1 - y0) * t * t - Math.sin(Math.PI * t) * 6 * pitch, rad);
    });
    bt.draw(c); c.fillStyle = '#0e1626'; c.fillRect(0, base, W, Math.max(1, d));
    // the two labels: over the robot what it keeps, over the pile what it lost
    const kept = keepAt(st.age), cp = cw / cols, tk = $('ri-kept'), tl = $('ri-lost');
    tk.textContent = `Kept ${pct(kept)}`; tk.style.left = (B.w / 2 * cp) + 'px'; tk.style.top = Math.max(22, ch - 2 - (B.h - minY) * cp - 12) + 'px';
    const fallen = Math.floor(plan.N * (1 - kept)); let ph = 0; for (let i = 0; i < fallen; i++) ph = Math.max(ph, plan.slots[i].y);
    tl.textContent = `Lost ${pct(1 - kept)}`; tl.style.left = ((plan.X0 + plan.P / 2) * cp) + 'px'; tl.style.top = (ch - 2 - (ph + 1.6) * cp - 10) + 'px';
    tl.hidden = fallen < 1;
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
    note(y);
  }
  function lookup() {
    mk.value = L.fams[byId[st.id].fam].maker; fillModels(); md.value = st.id; sl.value = st.age; cd.value = st.cond;
    const remember = () => { try { history.replaceState(null, '', `#r=${st.id}&y=${L.now - Math.round(st.age)}`); } catch (x) {} };
    const robot = () => { E = est(st.id, Math.round(st.age)); makePlan(); words(); paint(); remember(); };
    mk.addEventListener('change', () => { fillModels(); st.id = md.value; robot(); });
    md.addEventListener('change', () => { st.id = md.value; robot(); });
    cd.addEventListener('change', () => { st.cond = cd.value; note(L.now - Math.round(st.age)); });
    hr.addEventListener('input', () => { const v = hr.value.replace(/[^0-9]/g, ''); st.hours = v ? (+v).toLocaleString('en-US') : ''; note(L.now - Math.round(st.age)); });
    sl.addEventListener('input', () => { const was = Math.round(st.age); st.age = +sl.value; if (Math.round(st.age) !== was) words(); paint(); });
    sl.addEventListener('change', () => { st.age = Math.round(+sl.value); sl.value = st.age; words(); paint(); remember(); });
    // arrow keys move a whole year at a time
    sl.addEventListener('keydown', ev => { const d = /Right|Up|PageUp/.test(ev.key) ? 1 : /Left|Down|PageDown/.test(ev.key) ? -1 : 0; if (!d && !/Home|End/.test(ev.key)) return; ev.preventDefault();
      st.age = ev.key === 'Home' ? 0 : ev.key === 'End' ? 30 : Math.max(0, Math.min(30, Math.round(st.age) + d)); sl.value = st.age; words(); paint(); remember(); });
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

  lookup(); printing(); board();
  // fonts change nothing drawn; a real width change redraws, a height-only change (a phone's address bar) does nothing
  let w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; lastKey = ''; paint(); document.querySelectorAll('canvas.mx').forEach(c => { c._w = 0; drawMx(c); }); document.querySelectorAll('canvas.ri-bot').forEach(drawBot); });
})();
