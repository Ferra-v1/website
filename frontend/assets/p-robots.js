// Robots we price. FerraPlot holds what the robot pages and the price report share. A robot is built from its own listings, one bright dot at a time, on the shelf and on its own page.
// A robot's page then has one short chart: every listing by age and asking price, and one age to read.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NEAR = 2;   // a listing is near an age when it is within this many years, on the shelf and on every robot's chart
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const usd = v => '$' + Math.round(v).toLocaleString('en-US');
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const fit = cv => { const r = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); } const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h); return { c, w, h }; };
  // the robot as faint halftone, shaded the way dotbot.js shades it. Its bounds and one painted bitmap per size.
  const ghost = name => { const g = (window.FERRA_DOTS || {})[name + '-l']; if (!g) return null; if (!g.g2) { const pts = g.d.split(';').filter(Boolean).map(s => { const [x, y, L, A, , ed] = s.split(',').map(Number); return [x, y, (A / 100) * Math.min(1, .28 + .72 * Math.pow(L / 100, .9) + (ed / 100) * .35)]; }); let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } g.g2 = { pts, x0, x1, y0, y1 }; } return g.g2; };
  // the pixel robot: one dot on each grid square, sized by the machine's shading
  const ghostBitmap = (G, cell, alpha, rgb = '255,255,255') => { const r = Math.min(devicePixelRatio || 1, 2), b = document.createElement('canvas'), cols = G.x1 - G.x0 + 1, rows = G.y1 - G.y0 + 1; b.width = Math.ceil(cols * cell * r); b.height = Math.ceil(rows * cell * r); const c = b.getContext('2d'); c.scale(r, r); for (const [x, y, s] of G.pts) { c.fillStyle = `rgba(${rgb},${alpha * (.55 + .45 * s)})`; c.beginPath(); c.arc((x - G.x0 + .5) * cell, (y - G.y0 + .5) * cell, Math.max(.3, cell * .44 * s), 0, 6.2832); c.fill(); } return b; };
  // the robot's body stays quiet, so each bright dot reads as one listing at a glance
  const BODY = .3, THIN_DOTS = 20;
  // nice dollar ticks inside a range
  const TICKS = [300, 1000, 3000, 10000, 30000, 100000, 300000];
  // a tooltip that stays inside its parent
  const placeTip = (tip, par, x, y) => { tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight, W = par.clientWidth; tip.style.left = clamp(x - w / 2, 16, Math.max(16, W - w - 16)) + 'px'; const up = y - h - 14, screen = par.getBoundingClientRect().top + up; tip.style.top = (up > 8 && screen > 110 ? up : y + 16) + 'px'; };
  // a chart label in the clearest spot the chart offers, with a short line to what it names. cands: [{x, y, tx, ty}]: the label's centre and its target.
  const clearLabel = (txt, cands, pts, box, used, cls = 'lb') => {
    const w = txt.length * (cls.includes('lb') ? 8 : 7.2) + 8, h = 22; let best = null, bs = 1e9;
    for (const c of cands) {
      const x0 = clamp(c.x - w / 2, box.l, box.r - w), x1 = x0 + w, y0 = c.y - h / 2, y1 = c.y + h / 2; if (y0 < box.t || y1 > box.b) continue;
      let n = 0; for (const p of pts) if (p.x > x0 - 4 && p.x < x1 + 4 && p.y > y0 - 4 && p.y < y1 + 4) n++;
      for (const u of used) if (x0 < u.x1 && x1 > u.x0 && y0 < u.y1 && y1 > u.y0) n += 40;
      const s = n * 60 + Math.abs(c.y - c.ty) * .25; if (s < bs) { bs = s; best = { x0, x1, y0, y1, c }; }
    }
    if (!best) return '';
    used.push(best); const { x0, x1, y0, y1, c } = best, cx = (x0 + x1) / 2, lx = clamp(c.tx, x0 + 4, x1 - 4), ly = c.ty > y1 ? y1 + 1 : y0 - 1;
    const gap = Math.abs(c.ty - ly), leader = gap > 6 ? `<line class="ld" x1="${lx}" y1="${ly}" x2="${c.tx}" y2="${c.ty}"/>` : '';
    return `${leader}<text class="${cls}" x="${cx}" y="${c.y + 5}" text-anchor="middle">${txt}</text>`;
  };
  // the listing far below the rest says what it is
  const lowest = (ps, lo) => { const low = ps.filter(q => q.usd < lo); if (!low.length) return ''; const m = low.reduce((a, q) => q.usd < a.usd ? q : a); return low.map(q => { const x = (q.x ?? q.cx) - 10, y = (q.y ?? q.cy) + 5; return q === m ? `<text x="${x}" y="${y - 17}" text-anchor="end">Lowest ask: ${usd(q.usd)},<tspan x="${x}" dy="17">left on the chart so you can see it.</tspan></text>` : `<text x="${x}" y="${y}" text-anchor="end">${usd(q.usd)}</text>`; }).join(''); };
  window.FerraPlot = { clamp, money, usd, ease, fit, TICKS, placeTip, reduce, clearLabel, lowest, ghost, ghostBitmap };

  // ---------------------------------------------------------------- one robot's page: one short chart
  const page = document.querySelector('[data-robot]'), plot = document.querySelector('.r-plot');
  if (page && plot) chart(JSON.parse(page.querySelector('.r-data').textContent), plot);
  function chart(D, plot) {
    const cv = plot.querySelector('.r-cv'), ax = plot.querySelector('.r-ax'), age = plot.querySelector('.r-age'), range = age.querySelector('input'), th = plot.querySelector('.r-th'), tip = plot.querySelector('.r-tip');
    const [tb, ts, ta] = [tip.querySelector('b'), tip.querySelector('span'), tip.querySelector('a')];
    const read = document.querySelector('.r-read');
    const P = D.pts.map(p => ({ age: p[0], usd: p[1], t: p[2], year: p[3], src: p[4], url: p[5], whole: p[8], fit: p[9], hi: 0 }));
    const A = D.auc.map(a => ({ age: a[0], usd: a[1], t: a[2], when: a[3], src: a[4], url: a[5], sold: true, hi: 0 }));
    let sel = D.age, g = {}, hover = null, shown = -1, born = reduce ? -1e6 : 0, seen = reduce;
    // the axis starts just under the lowest ordinary price. A rare listing far below it sits on the floor of the chart with its real price printed beside it.
    const lo = Math.min(...P.map(q => q.usd).filter(v => v >= 1000), ...A.map(q => q.usd), D.curve[30][0]) * .82, hi = Math.max(...P.map(q => q.usd), D.curve[0][2]) * 1.16;
    const few = P.length < THIN_DOTS;
    function layout() {
      const W = plot.clientWidth, H = plot.clientHeight, phone = W < 560, top = 10, base = H - 46, gut = phone ? 52 : 58;
      const X = a => gut + a / 30 * (W - gut - (phone ? 8 : 2)), Y = v => base - 14 - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (base - 14 - top);
      g = { W, H, phone, base, top, X, Y, r: few ? (phone ? 4 : 4.6) : (phone ? 2.1 : 2.7) };
      P.forEach(q => { q.x = X(q.age); q.y = Y(q.usd); }); A.forEach(q => { q.x = X(q.age); q.y = Y(q.usd); });
      age.style.cssText = `left:${X(0) - 22}px;width:${X(30) - X(0) + 44}px;top:${base - 22}px`;
      th.style.top = base - 13 + 'px';
      let s = `<line class="ax" x1="0" x2="${W}" y1="${base + .5}" y2="${base + .5}"/>`;
      TICKS.filter(t => t > lo * 1.06 && t < hi).forEach(t => { s += `<text x="0" y="${Y(t) + 5}">${usd(t)}</text>`; });
      [5, 10, 15, 20, 25, 30].forEach(a => { s += `<text x="${X(a)}" y="${base + 36}" text-anchor="${a === 30 ? 'end' : 'middle'}">${a === 30 && !phone ? '30 years old' : a}</text>`; });
      if (phone) s += `<text x="0" y="${base + 36}">Age</text>`;
      // labels go where the chart is empty, each with a short line to what it names
      const dots = P.concat(A).map(q => ({ x: q.x, y: q.y })), box = { l: X(0) + 4, r: W, t: top, b: base - 6 }, used = [], agesR = [28, 26, 24, 22, 20, 18, 16, 14, 12, 8, 6, 4], onLine = [], onBand = [];
      agesR.forEach(a => { const y = Y(D.curve[a][1]), up = Y(D.curve[a][2]), dn = Y(D.curve[a][0]); [up - 18, up - 44, y - 26, y + 26].forEach(v => onLine.push({ x: X(a), y: v, tx: X(a), ty: y })); [dn + 20, dn + 46].forEach(v => onBand.push({ x: X(a), y: v, tx: X(a), ty: dn })); });
      s += clearLabel('Typical asking price', onLine, dots, box, used);
      s += clearLabel(D.tier === 'thin' ? 'Our rough range' : '8 in 10 ask inside this band', onBand, dots, box, used, 'pl');
      // what the dark dots imply, counted from the data: a sale is under the band when it brought less than the band's floor for its age
      if (A.length) {
        const under = A.filter(q => q.usd < D.curve[clamp(Math.round(q.age), 0, 30)][0]).length, n = A.length;
        const say = n === 1 ? `This sale landed ${under ? 'under' : 'inside'} the band` : under === n ? 'Every sale here landed under the band' : under ? `${under} of these ${n} sales landed under the band` : 'These sales landed inside the band';
        const low = A.reduce((m, q) => q.usd < m.usd ? q : m, A[0]), w = say.length * 8, right = low.x + 12 + w < W, left = low.x - 12 - w > gut;
        if (right || left) s += `<text class="lb" x="${low.x + (right ? 12 : -12)}" y="${low.y + 5}" text-anchor="${right ? 'start' : 'end'}">${say}</text>`;
        else { const i = say.indexOf(' landed'), x = clamp(low.x - w * .31, gut, W - w * .62), y = low.y + 40 < base - 16 ? low.y + 22 : low.y - 30; s += `<text class="lb" x="${x}" y="${y}">${say.slice(0, i)}<tspan x="${x}" dy="18">${say.slice(i + 1)}</tspan></text>`; }
      }
      s += lowest(P, lo);
      ax.setAttribute('viewBox', `0 0 ${W} ${H}`); ax.innerHTML = s;
      place();
    }
    function draw(now) {
      const { c } = fit(cv), { X, Y, base } = g, ink = 'rgb(14,22,38)', C = '40,71,206';
      const rev = reduce ? 1 : seen ? ease(clamp((now - born) / 1800)) : 0; let moving = seen && rev < 1;
      c.save(); c.beginPath(); c.rect(0, 0, X(0) + rev * (X(30) - X(0)) + 8, g.H); c.clip();
      // the band and the typical price: solid where this robot has listings, quieter and dotted where they are worked out from other ages
      const a0 = clamp(D.range[0] - 1, 0, 30), a1 = clamp(D.range[1] + 1, 0, 30);
      const fade = c.createLinearGradient(X(0), 0, X(30), 0), stop = (a, al) => fade.addColorStop(clamp(a / 30), `rgba(${C},${al})`);
      stop(0, a0 > 1 ? .03 : .09); stop(a0 - 2, .03); stop(a0, .09); stop(a1, .09); stop(a1 + 2, .03); stop(30, a1 < 29 ? .03 : .09);
      c.fillStyle = fade; c.beginPath(); for (let a = 0; a <= 30; a++) c.lineTo(X(a), Y(D.curve[a][2])); for (let a = 30; a >= 0; a--) c.lineTo(X(a), Y(D.curve[a][0])); c.closePath(); c.fill();
      const line = (from, to, dash) => { if (to <= from) return; c.setLineDash(dash); c.strokeStyle = `rgb(${C})`; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); for (let a = from; a <= to; a++) c.lineTo(X(a), Y(D.curve[a][1])); c.stroke(); };
      line(0, a0, [2, 6]); line(a0, a1, []); line(a1, 30, [2, 6]); c.setLineDash([]);
      c.restore();
      // the age being read
      const sx = X(sel), sy = Y(D.curve[sel][1]);
      c.strokeStyle = 'rgba(14,22,38,.34)'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + .5, sy); c.lineTo(sx + .5, base); c.stroke();
      for (const q of P) {
        const t = Math.abs(q.whole - sel) <= 1 ? 1 : 0; q.hi += (t - q.hi) * .2; if (Math.abs(t - q.hi) > .01) moving = true;
        const app = reduce ? 1 : clamp((X(0) + rev * (X(30) - X(0)) - q.x + 6) / 40); if (app <= 0) continue;
        c.fillStyle = q === hover ? ink : `rgba(${C},${(few ? .8 + .2 * q.hi : .5 + .5 * q.hi) * app})`;
        c.beginPath(); c.arc(q.x, q.y, g.r + q.hi * .5 + (q === hover ? 1.6 : 0), 0, 6.2832); c.fill();
      }
      if (rev > .6) A.forEach(q => { c.fillStyle = ink; c.globalAlpha = clamp((rev - .6) / .4); c.beginPath(); c.arc(q.x, q.y, Math.max(g.r, 3.4) + .6 + (q === hover ? 1.4 : 0), 0, 6.2832); c.fill(); c.globalAlpha = 1; });
      c.fillStyle = '#fff'; c.beginPath(); c.arc(sx, sy, 6, 0, 6.2832); c.fill(); c.strokeStyle = `rgb(${C})`; c.lineWidth = 2.5; c.stroke();
      ax.style.opacity = reduce ? 1 : clamp(rev * 2);
      return moving;
    }
    function reading() {
      if (sel === shown) return; shown = sel;
      const c = D.curve[sel], y = D.now - sel, near = P.filter(q => Math.abs(q.whole - sel) <= NEAR).length, thin = D.tier === 'thin';
      read.querySelector('.r-ra').textContent = sel === 1 ? '1 year old' : sel + ' years old';
      read.querySelector('.r-ry').textContent = y;
      read.querySelector('.r-rv').textContent = thin ? `${money(c[0])} to ${money(c[2])}` : money(c[1]);
      // the same count, by the same band, as this robot's card on the shelf. When few listings set the price, the sentence says how many first.
      const NW = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'], cap = t => t[0].toUpperCase() + t.slice(1), F = D.fit, count = near ? `${near} for sale near this age.` : 'None for sale near this age. Our guess from other ages.';
      read.querySelector('.r-rb').textContent = thin ? `${cap(NW[F])} listing${F === 1 ? ' sets' : 's set'} this. ${count}` : `Most ask ${money(c[0])} to ${money(c[2])}. ${count}`;
      read.querySelector('.r-rl').href = `price.html#r=${D.id}&y=${y}`;   // the robot and year only: the tool shows this asking price itself, and would read a price in the link as what the whole working robot cost
      range.value = sel; range.setAttribute('aria-valuetext', `${sel} years old, about ${money(c[1])}`);
      th.textContent = `\u2039 ${sel === 1 ? '1 year' : sel + ' years'} \u203a`;
      place();
    }
    function place() { if (!g.X) return; const w = th.offsetWidth; th.style.transform = `translateX(${clamp(g.X(sel) - w / 2, 0, g.W - w)}px)`; }
    let raf = 0;
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    function frame(now) { raf = 0; if (draw(now)) kick(); }
    // pointer: rest on a dot to read its listing; move along the chart to change the age
    const ALL = () => A.concat(P);
    function nearest(x, y, reach) { let best = null, bd = reach * reach; for (const q of ALL()) { const v = (q.x - x) ** 2 + (q.y - y) ** 2; if (v < bd) { bd = v; best = q; } } return best; }
    function showTip(q) {
      hover = q; tb.textContent = q.t;
      ts.textContent = q.sold ? `Sold at auction for ${usd(q.usd)} a robot on ${q.when} at ${q.src}.` : `Built ${q.year}. Asking ${usd(q.usd)} on ${q.src}.`;
      ta.textContent = (q.sold ? 'See the result' : 'See the listing') + ' \u2192'; ta.href = q.url;
      placeTip(tip, plot, q.x, q.y); kick();
    }
    function hideTip() { if (hover || !tip.hidden) { hover = null; tip.hidden = true; kick(); } }
    const rel = ev => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    const ageAt = x => clamp(Math.round((x - g.X(0)) / (g.X(30) - g.X(0)) * 30), 0, 30);
    let wait = 0, down = null;
    cv.addEventListener('pointermove', ev => {
      if (ev.pointerType === 'touch') return;
      const [x, y] = rel(ev), a = ageAt(x);
      if (x > g.X(0) && a !== sel) { sel = a; reading(); kick(); }
      clearTimeout(wait); wait = setTimeout(() => { const q = nearest(x, y, 16); if (q) showTip(q); else if (hover) hideTip(); }, 70);
    });
    cv.addEventListener('pointerdown', ev => { down = [ev.clientX, ev.clientY]; const [x, y] = rel(ev); if (ev.pointerType !== 'touch') { const q = nearest(x, y, 22); if (q) showTip(q); } });
    cv.addEventListener('pointerup', ev => {
      if (ev.pointerType !== 'touch' || !down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 8) return;
      const [x, y] = rel(ev), q = nearest(x, y, 24);
      if (q) showTip(q); else { hideTip(); sel = ageAt(x); reading(); kick(); }
    });
    document.addEventListener('pointerdown', ev => { if (!tip.contains(ev.target) && ev.target !== cv) hideTip(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hideTip(); });
    range.addEventListener('input', () => { sel = +range.value; hideTip(); reading(); kick(); });
    new ResizeObserver(() => { layout(); kick(); }).observe(plot);
    if (!reduce) { const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.disconnect(); seen = true; born = performance.now(); kick(); } }), { threshold: .25 }); io.observe(plot); ax.style.opacity = 0; }
    layout(); reading(); kick();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); kick(); });
    // the long lists start short
    document.querySelectorAll('[data-listings]').forEach(tbl => { const rows = [...tbl.tBodies[0].rows], keep = +(matchMedia('(max-width:760px)').matches ? tbl.dataset.keepM : tbl.dataset.keep); if (rows.length > keep + 2) { const step = (rows.length - 1) / (keep - 1), show = new Set(Array.from({ length: keep }, (_, i) => Math.round(i * step))); rows.forEach((r, i) => { if (!show.has(i)) r.hidden = true; }); const b = document.createElement('button'); b.type = 'button'; b.className = 'r-more'; b.textContent = `See all ${rows.length} listings \u2192`; tbl.after(b); b.addEventListener('click', () => { rows.forEach(r => { r.hidden = false; }); b.remove(); }); } });
  }

  // ---------------------------------------------------------------- find a model: type any part of its name
  const fnd = document.querySelector('[data-find]');
  if (fnd) {
    const ents = JSON.parse(fnd.querySelector('.r-find-d').textContent), norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    ents.forEach(r => { r.k = norm(r[0]).replace(/ /g, ''); });
    const box = fnd.querySelector('.r-find-in'), inp = box.querySelector('input'), list = fnd.querySelector('.r-find-list'), say = fnd.querySelector('.r-find-n');
    const row = r => { const a = document.createElement('a'), b = document.createElement('b'), s = document.createElement('span'), i = document.createElement('i'); a.href = r[1 + 1]; b.textContent = r[0]; s.className = 'num'; s.textContent = `${r[1].toLocaleString('en-US')} listing${r[1] === 1 ? '' : 's'}`; i.setAttribute('aria-hidden', 'true'); i.textContent = '\u2192'; a.append(b, s, i); return a; };
    const start = [...list.children], words = say.textContent, MAX = 8;
    box.hidden = false;
    inp.addEventListener('input', () => {
      const toks = norm(inp.value).split(' ').filter(Boolean);
      if (!toks.length) { list.replaceChildren(...start); say.textContent = words; return; }
      const whole = toks.join(''), hit = ents.filter(r => toks.every(t => r.k.includes(t))).sort((a, b) => (b.k.includes(whole) - a.k.includes(whole)) || b[1] - a[1]);
      if (!hit.length) { const a = document.createElement('a'); a.className = 'r-find-any'; a.href = 'price.html#r=any-arm'; a.textContent = 'Price it as an arm with no model named \u2192'; list.replaceChildren(a); say.textContent = 'We have no listings by that name.'; return; }
      list.replaceChildren(...hit.slice(0, MAX).map(row));
      say.textContent = hit.length > MAX ? `${hit.length} match. Here are the ${MAX} with the most listings.` : hit.length === 1 ? 'One match.' : `${hit.length} match.`;
    });
  }

  // ---------------------------------------------------------------- a robot built from its listings: every robot on the shelf, and the one on a robot's page
  const shelf = document.querySelector('[data-shelf],[data-robot]');
  if (shelf) {
    const own = shelf.querySelector('.r-data');
    let DOTS;
    if (own) { const D = JSON.parse(own.textContent); DOTS = { [D.id]: D.pts.map(p => [p[6], p[7], p[1], p[3], p[4], p[5], p[2], p[8]]) }; }
    else DOTS = JSON.parse(shelf.querySelector('.r-dots').textContent);
    const tip = shelf.querySelector(':scope > .r-tip'), [tb, ts, ta] = [tip.querySelector('b'), tip.querySelector('span'), tip.querySelector('a')];
    // the robot stands on the line at the height its listings earn, at the left of its box, or the right of it when the page asks
    const geo = cv => { const G = ghost(cv.dataset.b), w = cv.clientWidth, h = cv.clientHeight, cols = G.x1 - G.x0 + 1, rows = G.y1 - G.y0 + 1, cell = Math.min(w / cols, (h - 2) / rows); return { G, cell, ox: cv.dataset.at === 'r' ? w - cols * cell : 0, oy: h - 2 - rows * cell, cols, rows }; };
    const dotXY = (g, d) => [g.ox + (d[0] - g.G.x0 + .5) * g.cell, g.oy + (d[1] - g.G.y0 + .5) * g.cell];
    // until the reader moves the age, every dot is bright. After that, only the dots near that age are.
    let sel = null;
    const paint = (cv, t, hot) => {
      if (!ghost(cv.dataset.b)) return;
      const { c } = fit(cv), g = geo(cv), list = DOTS[cv.dataset.f] || [];
      if (cv._cell !== g.cell) { cv._cell = g.cell; cv._bm = ghostBitmap(g.G, g.cell, g.cell < 2.4 ? BODY + .04 : BODY); }
      c.globalAlpha = clamp(t * 2.5); c.drawImage(cv._bm, g.ox, g.oy, g.cols * g.cell, g.rows * g.cell); c.globalAlpha = 1;
      // bright dots, one per listing. A robot with very few listings keeps them a touch bigger, so each one can still be found and tapped. They fly to their seats as t runs from 0 to 1.
      const r = clamp(g.cell * .62, list.length < 30 ? 2.6 : 1.9, 3.3), n = list.length, far = [], W = cv.clientWidth, H = cv.clientHeight;
      c.fillStyle = '#fff'; c.beginPath();
      for (let i = 0; i < n; i++) {
        const k = list[(i * 7919) % n];
        let [x, y] = dotXY(g, k), q = r;
        if (t < 1) { const rnd = (i * 7919 % 433) / 433, u = clamp((t - rnd * .45) / .55), e_ = 1 - Math.pow(1 - u, 3); if (u <= 0) continue; x += (1 - e_) * (rnd - .5) * W * .7; y += (1 - e_) * ((i * 613 % 433) / 433 - .3) * H * .5; q = r * (.5 + .5 * e_); }
        else if (sel !== null && Math.abs(k[7] - sel) > NEAR) { far.push(k); continue; }
        c.moveTo(x + q, y); c.arc(x, y, q, 0, 6.2832);
      }
      c.fill();
      if (far.length) { const q = r * .72; c.fillStyle = 'rgba(255,255,255,.34)'; c.beginPath(); for (const k of far) { const [x, y] = dotXY(g, k); c.moveTo(x + q, y); c.arc(x, y, q, 0, 6.2832); } c.fill(); }
      if (hot) { const [x, y] = dotXY(g, hot); c.fillStyle = 'rgb(150,232,255)'; c.beginPath(); c.arc(x, y, r + 1.6, 0, 6.2832); c.fill(); }
    };
    const cvs = [...shelf.querySelectorAll('canvas[data-b]')];
    // Assemble: each robot's dots fly to their seats over 2200ms, the robots 300ms apart
    let nextAt = 0;
    const run = cv => { if (reduce) { paint(cv, 1); cv.dataset.done = 1; return; } const now0 = performance.now(), t0 = Math.max(now0, nextAt); nextAt = t0 + 300; const step = now => { const t = clamp((now - t0) / 2200); paint(cv, t); if (t < 1) requestAnimationFrame(step); else cv.dataset.done = 1; }; requestAnimationFrame(step); };
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } }), { threshold: .2 });
    cvs.forEach(cv => { paint(cv, 0); io.observe(cv); });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => cvs.forEach(cv => paint(cv, cv.dataset.done ? 1 : 0)), 120); });
    // rest on or tap a dot to read its listing
    let hotCv = null, hot = null, wait = 0;
    const find = (cv, ev, reach) => { const b = cv.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top, g = geo(cv); let best = null, bd = reach * reach; for (const d of DOTS[cv.dataset.f] || []) { const [dx, dy] = dotXY(g, d), v = (dx - x) ** 2 + (dy - y) ** 2; if (v < bd) { bd = v; best = d; } } return best; };
    const hide = () => { if (hotCv) paint(hotCv, 1); hotCv = hot = null; tip.hidden = true; };
    const show = (cv, d) => {
      if (hotCv && hotCv !== cv) paint(hotCv, 1);
      hotCv = cv; hot = d; paint(cv, 1, d);
      tb.textContent = d[6]; ts.textContent = `Built ${d[3]}. Asking ${usd(d[2])} on ${d[4]}.`; ta.textContent = 'See the listing \u2192'; ta.href = d[5];
      const g = geo(cv), [x, y] = dotXY(g, d), b = cv.getBoundingClientRect(), s = shelf.getBoundingClientRect();
      placeTip(tip, shelf, b.left - s.left + x, b.top - s.top + y);
    };
    let lastTouch = 0;
    cvs.forEach(cv => {
      cv.addEventListener('pointermove', ev => { if (ev.pointerType === 'touch') return; clearTimeout(wait); wait = setTimeout(() => { const d = find(cv, ev, 16); if (d) { if (d !== hot) show(cv, d); } else if (hot && !tip.matches(':hover')) hide(); }, 60); });
      cv.addEventListener('pointerleave', () => { clearTimeout(wait); setTimeout(() => { if (hot && !tip.matches(':hover') && hotCv === cv && !cv.matches(':hover')) hide(); }, 220); });
      cv.addEventListener('pointerdown', ev => { if (ev.pointerType === 'touch') lastTouch = performance.now(); });
      // a tap on a dot reads that listing; a tap anywhere else on the robot opens its page
      (cv.closest('a') || cv).addEventListener('click', ev => { if (performance.now() - lastTouch > 900 || ev.target !== cv) return; const d = find(cv, ev, 18); if (d) { ev.preventDefault(); show(cv, d); } });
    });
    tip.addEventListener('pointerleave', hide);
    document.addEventListener('pointerdown', ev => { if (hot && !tip.contains(ev.target) && !(ev.target.matches && ev.target.matches('canvas[data-b]'))) hide(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hide(); });
    // one age for the whole shelf: every robot reprices from its own curve, and each figure is set at the size its listings near that age earn. robots.py prints the opening state by the same rule.
    const dial = shelf.querySelector('.r-dial');
    if (dial) {
      const CUR = JSON.parse(shelf.querySelector('.r-cur').textContent), inp = dial.querySelector('input'), out = dial.querySelector('output'), cells = [...shelf.querySelectorAll('.r-cell')];
      const yrs = a => a === 1 ? '1 year' : `${a} years`, dots = n => `${n} dot${n === 1 ? '' : 's'}`;
      dial.hidden = false; shelf.classList.add('aged');
      inp.addEventListener('input', () => {
        const a = sel = +inp.value;
        out.textContent = yrs(a); inp.setAttribute('aria-valuetext', `${yrs(a)} old`);
        for (const ce of cells) {
          const list = DOTS[ce.dataset.k] || [], n = list.length, nr = list.filter(d => Math.abs(d[7] - a) <= NEAR).length, ct = ce.querySelector('.r-c-ct'), f = CUR[ce.dataset.k];
          const short = nr ? `${nr} for sale near this age` : 'None for sale near this age';
          ct.firstChild.textContent = ct.dataset.n ? short + '.' + ct.dataset.n : short;
          ct.lastChild.textContent = (nr ? `${nr} of ${n} for sale near this age.` : `None of its ${dots(n)} are near this age, so this is a rough guess.`) + ct.dataset.n;
          if (!f) continue;
          const c = f.c[a], thin = f.t === 'thin', big = f.t === 'big', pr = ce.querySelector('.r-c-pr'), at = ce.querySelector('.r-c-at');
          pr.className = `r-c-pr ${thin || !nr ? 't' : big && nr >= 5 ? 'b' : nr >= 5 || big ? 'm' : 't'} num`;
          pr.textContent = thin ? `${money(c[0])} to ${money(c[2])}` : nr ? money(c[1]) : `About ${money(c[1])}`;
          if (at) at.textContent = `at ${yrs(a)} old`;
        }
        cvs.forEach(cv => paint(cv, cv.dataset.done ? 1 : 0));
      });
    }
  }

  // ---------------------------------------------------------------- the Ground Fade: gradient to white over 60vh of scroll, with the next section's top between 75% and 15% of the screen
  // On a robot's page the first screen is sticky: it holds still for 60vh of scroll and through the fade, its words leave in the first half, and the next section rises past it. Taller than the screen on a phone, it first scrolls to its own bottom edge.
  const gd = document.querySelector('.r-ground'), nx = document.querySelector('.r-gf-next'), pg = document.querySelector('.page'), one = document.querySelector('.r-one');
  if (gd && nx && !reduce) {
    pg.classList.add('gf-on'); let last = -1;
    const place = () => { if (!one) return; const v = gd.offsetHeight, H = one.offsetHeight, over = Math.max(0, H - v); one.style.top = -over + 'px'; nx.style.marginTop = .75 * v + over + .6 * v - H + 'px'; };
    const on = () => { const v = gd.offsetHeight, k = clamp((v * .75 - nx.getBoundingClientRect().top) / (v * .6)); if (k === last) return; last = k; pg.style.setProperty('--gf', k.toFixed(3)); pg.classList.toggle('gfing', k < 1); pg.classList.toggle('gfout', k >= .5); gd.style.opacity = 1 - k; gd.style.visibility = k >= 1 ? 'hidden' : ''; };
    place();
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', () => { place(); on(); }, { passive: true }); on();
    if (one) new ResizeObserver(() => { place(); on(); }).observe(one);
  }

  // ---------------------------------------------------------------- the seven robots to come: they assemble 300ms apart when the row arrives, and rest off screen
  // A moving robot's picture decodes the first time it is drawn, and until then its canvas stays blank. So each is decoded ahead of time on a canvas outside the page, one at a time, well before the row arrives, and the row starts only when all seven are ready, with its timing intact.
  const row = document.querySelector('.r-miss-g');
  if (row) {
    const bots = [...row.querySelectorAll('canvas')], d = () => window.FerraDots; let ready = false, wanted = false, started = false, live = false;
    const go = () => { const D_ = d(); started = true; bots.forEach((c, i) => setTimeout(() => { c.classList.add('dotbot'); c._seen = 1; c._vis = true; D_.draw(c); if (!live) D_.pause(c); }, reduce ? 0 : i * 300)); };
    const decode = i => {
      if (i >= bots.length) { ready = true; if (wanted && !started) go(); return; }
      const c = document.createElement('canvas'), idle = window.requestIdleCallback || setTimeout; let done = false;
      const next = () => { if (done) return; done = true; idle(() => decode(i + 1)); };
      c.dataset.bot = bots[i].dataset.bot; c.dataset.tone = bots[i].dataset.tone;
      c._redo = next;           // dotbot.js calls this when the decode ends, and a canvas outside the page paints nothing
      d().draw(c); setTimeout(next, 2500);   // a file that never answers must not hold up the rest
    };
    const early = new IntersectionObserver(es => { if (!es.some(en => en.isIntersecting)) return; early.disconnect(); const wait = () => { if (!d()) return setTimeout(wait, 100); bots.forEach(c => d().fetch(c)); decode(0); }; wait(); }, { rootMargin: '2400px' }); early.observe(row);
    const seen = new IntersectionObserver(es => es.forEach(en => { const D_ = d(); if (!D_) return; live = en.isIntersecting;
      if (en.isIntersecting && en.intersectionRatio >= .4 && !started) { if (ready) go(); else wanted = true; }
      else if (started) bots.forEach(c => { if (c.classList.contains('dotbot')) live ? D_.resume(c) : D_.pause(c); }); }), { threshold: [0, .4] });
    seen.observe(row);
  }
})();
