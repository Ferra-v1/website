// Price report. The first screen: the arm assembles, each line draws and its figure ticks, and the paint drains down the arm to the lowest price.
// The first screen then holds for 60vh of scroll. Over the next 60vh its white lifts off the ink chart pinned behind it: prices, arm and bar leave in the first half, and the chart's words arrive in the second.
// Then one chart in five chapters, all tied to the scroll: each chapter's words swap over 20vh, then one thing on the chart changes over 100vh while they hold. The next section slides over it on the way out.
// Native scrolling, position sticky. Hover or tap a dot to read the listing or sale it stands for. Readers who ask for less motion get the finished arm and the finished chart with all the words beside it.
(() => {
  const root = document.querySelector('[data-pr-stage]'), F = window.FerraPlot;
  if (!root || !F) return;
  const { clamp, money, usd, ease, fit, TICKS, placeTip, reduce, clearLabel, lowest } = F;
  const D = JSON.parse(root.querySelector('.pr-data').textContent);
  const pin = root.querySelector('.pr-pin'), chart = root.querySelector('.pr-chart'), cv = root.querySelector('.pr-cv'), ax = root.querySelector('.pr-ax'), tip = root.querySelector('.pr-tip');
  const [tb, ts, ta] = [tip.querySelector('b'), tip.querySelector('span'), tip.querySelector('a')];
  const steps = [...root.querySelectorAll('.pr-step')], N = steps.length;
  root.classList.add(reduce ? 'still' : 'live');
  const CY = [92, 196, 255];
  const hero = document.querySelector('.pr-hero'), bar = document.querySelector('.page .nav'), page = document.querySelector('.page'), walk = root.querySelector('.pr-pg'); let dusk = -1;
  // the first screen stays put under the bar. The chart docks behind it after the 60vh hold, so nothing slides during the fade. On a screen too short for it, the bar leaves and the bottom of the first screen stops at the bottom of the screen instead.
  function place() {
    if (reduce) return;
    const v = pin.offsetHeight, n = bar.offsetHeight, H = hero.offsetHeight, over = Math.max(0, n + H - v);
    hero.classList.add('held'); bar.classList.toggle('held', !over);
    hero.style.top = (over ? v - H : n) + 'px';
    root.style.marginTop = (over + .6 * v - n - H) + 'px';
  }
  const P = D.pts.map((p, i) => ({ age: p[0], usd: p[1], t: p[2], year: p[3], src: p[4], url: p[5], whole: p[6], fam: p[7], a: 0, k: 0, gr: 0, d: i * 7919 % 433 / 433 }));
  const A = D.auc.map(a => ({ age: a[0], usd: a[1], t: a[2], when: a[3], src: a[4], url: a[5], sold: true, a: 0 })).sort((a, b) => a.age - b.age);
  // the axis starts just under the lowest ordinary price; a rare listing far below it sits on the floor with its real price printed beside it
  const lo = Math.min(...P.map(q => q.usd).filter(v => v >= 1000), ...A.map(q => q.usd)) * .82, hi = Math.max(...P.map(q => q.usd)) * 1.12;
  let g = {}, hover = null, raf = 0, ch = reduce ? N - 1 : 0;
  // w[i]: chapter i's 20vh swap, 0 to 1. s[i]: its 100vh change, 0 to 1.
  const w = new Array(N).fill(reduce ? 1 : 0), s = new Array(N).fill(reduce ? 1 : 0); w[0] = 1;
  const mix = (a, b, k) => a + (b - a) * k;
  // how much of chapter c is on screen: in with its swap, out with the next one's
  const win = c => (c === 0 ? 1 : clamp(w[c] * 2 - 1)) * (c + 1 < N ? clamp(1 - w[c + 1] * 2) : 1);

  function layout() {
    const W = chart.clientWidth, H = chart.clientHeight, phone = W < 560;
    const L = 60, R = W - 4, base = H - (phone ? 30 : 40), top = phone ? 10 : 8;
    const X = a => L + a / 32 * (R - L), Y = v => base - 8 - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (base - 8 - top);
    g = { W, H, phone, L, R, base, top, X, Y, r: phone ? 2 : 2.6 };
    P.forEach(q => { q.x = X(q.age); q.y = Y(q.usd); });
    A.forEach(q => { q.x = X(q.age); q.y = Y(q.usd); q.y0 = Y(D.curve[clamp(Math.round(q.age), 0, 30)][1]); });
    labels(); kick();
  }
  function labels() {
    const { X, Y, L, R, base, phone } = g, W = g.W, H = g.H;
    let s_ = `<line class="ax" x1="0" x2="${R}" y1="${base + .5}" y2="${base + .5}"/>`;
    TICKS.filter(t => t > lo * 1.2 && t < hi).forEach(t => { s_ += `<text x="0" y="${Y(t) + 5}">${usd(t)}</text>`; });
    [5, 10, 15, 20, 25, 30].forEach(a => { s_ += `<text x="${X(a)}" y="${base + (phone ? 22 : 26)}" text-anchor="middle">${a === 30 && !phone ? '30 years old' : a}</text>`; });
    if (phone) s_ += `<text x="0" y="${base + 22}">Age</text>`;
    const c = D.curve, dots = P.map(q => ({ x: q.x, y: q.y })), box = { l: L + 12, r: R, t: g.top, b: base - 6 }, ages = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 8, 6, 4, 2];
    // each label goes in the clearest place near what it names, with a short line to it
    const near = (cu, gaps) => { const o = []; ages.forEach(a => { const ty = Y(cu[a]); gaps.forEach(d => o.push({ x: X(a), y: ty + d, tx: X(a), ty })); }); return o; };
    const u1 = [], u2 = [];
    s_ += `<g class="lg" data-s="1 2">${clearLabel('Typical asking price', near(c.map(v => v[1]), [-26, 26, -48, 48, -80, 80]), dots, box, u1)}</g>`;
    s_ += `<g class="lg" data-s="2">${clearLabel('8 in 10 ask inside this band', near(c.map(v => v[0]), [20, 44]), dots, box, u1, 'pl')}</g>`;
    const dx = X(D.cheap[0]), dy = Y(D.cheap[1]), hx = X(D.dear[0]), hy = Y(D.dear[1]);
    s_ += `<g class="lg" data-s="2"><text class="lb" x="${dx + 12}" y="${dy + 5}">${usd(D.cheap[1])}</text><text class="lb" x="${hx + 12}" y="${hy + 5}">${usd(D.dear[1])}</text></g>`;
    const inFam = P.filter(q => q.fam === D.hi.id || q.fam === D.lo.id).map(q => ({ x: q.x, y: q.y }));
    s_ += `<g class="lg" data-s="3">${clearLabel(D.hi.label, near(D.hi.curve, [-24, -44, -70]), inFam, box, u2)}${clearLabel(D.lo.label, near(D.lo.curve, [24, 44, 70]), inFam, box, u2, 'lb cy')}</g>`;
    // what the sales imply, counted from the data: a sale is under the band when it brought less than the band's floor for its age
    const under = A.filter(q => q.usd < c[Math.round(q.age)][0]).length, say = under === A.length ? 'Every sale here landed under the band' : `${under} of these ${A.length} sales landed under the band`;
    const low = A.reduce((m, q) => q.usd < m.usd ? q : m, A[0]), tw = say.length * 8, rt = low.x + 12 + tw < R, lf = low.x - 12 - tw > L;
    if (rt || lf) s_ += `<g class="lg" data-s="4"><text class="lb" x="${low.x + (rt ? 12 : -12)}" y="${low.y + 5}" text-anchor="${rt ? 'start' : 'end'}">${say}</text></g>`;
    else { const i = say.indexOf(' landed'), x = Math.min(low.x - tw * .31, R - tw * .62), y = low.y + 40 < base - 6 ? low.y + 22 : low.y - 30; s_ += `<g class="lg" data-s="4"><text class="lb" x="${x}" y="${y}">${say.slice(0, i)}<tspan x="${x}" dy="18">${say.slice(i + 1)}</tspan></text></g>`; }
    // on a phone the chart is too short for this note beside the last chapter's label, and the last chapter is about something else
    s_ += `<g class="lg" data-s="${phone ? '0 1 2 3' : '0 1 2 3 4'}">${lowest(P, lo)}</g>`;
    ax.setAttribute('viewBox', `0 0 ${W} ${H}`); ax.innerHTML = s_;
    marks();
  }
  function marks() { ax.querySelectorAll('.lg').forEach(n => { const list = n.dataset.s.split(' ').map(Number); if (reduce) { n.classList.toggle('on', list.includes(4) || n.dataset.s === '1 2'); return; } n.style.opacity = Math.max(...list.map(win)) * (list[0] === 0 ? clamp((s[0] - .55) / .2) : 1); }); }

  function draw() {
    const { c } = fit(cv), { X, Y, base, L, R } = g;
    const clipTo = (a0, a1, fn) => { c.save(); c.beginPath(); c.rect(X(a0), 0, X(a1) - X(a0), g.H); c.clip(); fn(); c.restore(); };
    // the band: opens outward from the age of 10 in chapter 2, leaves with chapter 3's swap, and comes back with chapter 4's
    const band = reduce ? 1 : Math.max(clamp(s[2] * 3) * (1 - w[3]), w[4]), opened = reduce || w[4] ? 1 : ease(s[2]);
    if (band > .004) clipTo(10 - 22 * opened, 10 + 22 * opened, () => { c.fillStyle = `rgba(255,255,255,${.1 * band})`; c.beginPath(); for (let a = 0; a <= 30; a++) c.lineTo(X(a), Y(D.curve[a][2])); for (let a = 30; a >= 0; a--) c.lineTo(X(a), Y(D.curve[a][0])); c.closePath(); c.fill(); });
    // the two kinds of robot: their lines draw left to right in chapter 3
    const fam = reduce ? 0 : 1 - w[4];
    if (s[3] > .004 && fam > .004) clipTo(0, 32 * ease(s[3]), () => { const pl = (cu, col) => { c.strokeStyle = `rgba(${col},${fam})`; c.lineWidth = 2; c.beginPath(); cu.forEach((v, a) => c.lineTo(X(a), Y(v))); c.stroke(); }; pl(D.hi.curve, '255,255,255'); pl(D.lo.curve, CY.join(',')); });
    for (const q of P) {
      const edge = (q.x - L) / (R - L);
      // chapter 0: the dots arrive left to right with the scroll
      const app = reduce ? 1 : clamp((s[0] * 1.5 - edge - q.d * .3) / .2);
      let a = .92, kk = 0, gr = 0;
      const ten = Math.abs(q.whole - 10) <= 1, isH = q.fam === D.hi.id, isL = q.fam === D.lo.id;
      a = mix(a, .55, s[1]);                                   // chapter 1: they step back for the line
      a = mix(a, ten ? 1 : .22, s[2]); gr = ten ? s[2] : 0;    // chapter 2: only the arms about 10 years old stay bright
      a = mix(a, isH || isL ? 1 : .14, s[3]); gr = mix(gr, isH || isL ? 1 : 0, s[3]); kk = isL ? s[3] : 0;   // chapter 3: two kinds of robot
      a = mix(a, .4, w[4]); gr = mix(gr, 0, w[4]); kk = mix(kk, 0, w[4]);   // chapter 4's swap clears the way for the sales
      if (reduce) { a = .5; gr = 0; kk = 0; }
      q.a = a * app; if (q.a <= .004) continue;
      const m = q === hover ? 1 : kk;
      c.fillStyle = `rgba(${255 + (CY[0] - 255) * m | 0},${255 + (CY[1] - 255) * m | 0},${255 + (CY[2] - 255) * m | 0},${q === hover ? 1 : q.a})`;
      c.beginPath(); c.arc(q.x, q.y, (g.r + gr * .7 + (q === hover ? 1.4 : 0)) * (.4 + .6 * app), 0, 6.2832); c.fill();
    }
    // chapter 1: the typical price draws left to right. Chapter 3's swap quiets it; chapter 4's brings it back.
    const lineA = reduce ? 1 : mix(mix(1, .35, w[3]), 1, w[4]);
    if (s[1] > .004) clipTo(0, 32 * ease(s[1]), () => { c.strokeStyle = `rgba(255,255,255,${lineA})`; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); for (let a = 0; a <= 30; a++) c.lineTo(X(a), Y(D.curve[a][1])); c.stroke(); });
    // chapter 4: each sale starts on the typical asking price for its age and falls to what it really brought. The line it leaves is the gap.
    A.forEach((q, i) => {
      const k = reduce ? 1 : clamp((s[4] - i / A.length * .6) / .4); q.a = k > 0 ? 1 : 0; if (k <= 0) return;
      const y = q.y0 + (q.y - q.y0) * ease(k), ring = q === hover;
      if (q.y > q.y0) { c.strokeStyle = `rgba(${CY.join(',')},.34)`; c.lineWidth = 1; c.beginPath(); c.moveTo(q.x, q.y0); c.lineTo(q.x, y); c.stroke(); }
      c.fillStyle = `rgb(${CY.join(',')})`; c.beginPath(); c.arc(q.x, y, g.r + 1.6 + (ring ? 1.2 : 0), 0, 6.2832); c.fill(); if (ring) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
    });
    marks();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

  const words = () => { steps.forEach((el, i) => { const o = win(i), inn = i === 0 ? 1 : clamp(w[i] * 2 - 1); el.style.opacity = o; el.style.visibility = o > .004 ? 'visible' : 'hidden'; el.style.marginTop = (1 - inn) * 12 + 'px'; }); };
  function onScroll() {
    if (reduce) return;
    const r = root.getBoundingClientRect(), v = pin.offsetHeight, change = (innerWidth <= 720 ? .7 : 1) * v, swap = .2 * v, fade = .6 * v;
    // the chapters start when the ground has finished. The first is the change alone, because its words came with the ground.
    const t = -r.top - fade, was = ch;
    for (let i = 0; i < N; i++) {
      if (i === 0) { w[0] = 1; s[0] = clamp(t / change); ch = 0; continue; }
      const u = t - change - (i - 1) * (swap + change);
      w[i] = clamp(u / swap); s[i] = clamp((u - swap) / change);
      if (u >= 0) ch = i;
    }
    if (ch !== was) hideTip();
    words(); kick();
    // the Ground Fade, 60vh with the chart docked: the prices, the arm and the bar go by the time the white is half gone, and the chart's words and axes come in from there
    const k = clamp(-r.top / fade);
    if (k !== dusk) { dusk = k; page.style.setProperty('--d', k.toFixed(3)); page.classList.toggle('pr-dusk', k > 0); page.classList.toggle('pr-half', k >= .5); page.classList.toggle('pr-gone', k >= 1); walk.style.opacity = clamp(k * 2 - 1); }
  }
  // dots you can read
  const live = () => (s[4] > .02 ? A.filter(q => q.a).concat(P) : P).filter(q => q.sold || q.a > .1);
  const nearest = (x, y, reach) => { let best = null, bd = reach * reach; for (const q of live()) { const v = (q.x - x) ** 2 + (q.y - y) ** 2; if (v < bd) { bd = v; best = q; } } return best; };
  function showTip(q) {
    hover = q;
    tb.textContent = q.t;
    ts.textContent = q.sold ? `Sold at auction for ${usd(q.usd)} a robot on ${q.when} at ${q.src}.` : `Built ${q.year}. Asking ${usd(q.usd)} on ${q.src}.`;
    ta.textContent = (q.sold ? 'See the result' : 'See the listing') + ' →'; ta.href = q.url;
    placeTip(tip, chart, q.x, q.y); kick();
  }
  function hideTip() { if (hover || !tip.hidden) { hover = null; tip.hidden = true; kick(); } }
  const rel = ev => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  let wait = 0, down = null;
  cv.addEventListener('pointermove', ev => { if (ev.pointerType === 'touch') return; const [x, y] = rel(ev); clearTimeout(wait); wait = setTimeout(() => { const q = nearest(x, y, 18); if (q) showTip(q); else if (hover) hideTip(); }, 70); });
  cv.addEventListener('pointerdown', ev => { down = [ev.clientX, ev.clientY]; if (ev.pointerType !== 'touch') { const [x, y] = rel(ev), q = nearest(x, y, 24); if (q) showTip(q); } });
  cv.addEventListener('pointerup', ev => { if (ev.pointerType !== 'touch' || !down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 8) return; const [x, y] = rel(ev), q = nearest(x, y, 26); if (q) showTip(q); else hideTip(); });
  document.addEventListener('pointerdown', ev => { if (!tip.contains(ev.target) && ev.target !== cv) hideTip(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hideTip(); });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { place(); onScroll(); }, { passive: true });
  new ResizeObserver(layout).observe(chart);
  new ResizeObserver(() => { place(); onScroll(); }).observe(hero);
  place(); layout(); onScroll();
  if (!reduce) words();

  // the table: each dot is one listing behind that robot's price. Its place in the row says which listing it is. Rest on it or tap it to read it.
  const tw = document.querySelector('.pr-tw'), dt = tw && tw.querySelector('.pr-dtip');
  if (dt) {
    const [db, ds, da] = ['b', 'span', 'a'].map(sel => dt.querySelector(sel)), COLS = 58, PITCH = 6;
    const byIndex = D.pts;
    let ring = null, away = 0;
    const off = () => { if (ring) { ring.remove(); ring = null; } dt.hidden = true; };
    const read = (svg, ev) => {
      const b = svg.getBoundingClientRect(), ix = svg.dataset.i.split(','), i = clamp(Math.floor((ev.clientY - b.top) / PITCH) * COLS + Math.floor((ev.clientX - b.left) / PITCH), 0, ix.length - 1), q = byIndex[+ix[i]];
      const x = i % COLS * PITCH + PITCH / 2, y = Math.floor(i / COLS) * PITCH + PITCH / 2, wb = tw.getBoundingClientRect();
      if (ring) ring.remove();
      ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 3.4); svg.append(ring);
      db.textContent = q[2]; ds.textContent = `Built ${q[3]}. Asking ${usd(q[1])} on ${q[4]}.`; da.textContent = 'See the listing →'; da.href = q[5];
      placeTip(dt, tw, b.left - wb.left + x, b.top - wb.top + y);
    };
    tw.querySelectorAll('.pr-dots').forEach(svg => {
      svg.addEventListener('pointermove', ev => { if (ev.pointerType === 'touch') return; clearTimeout(away); read(svg, ev); });
      svg.addEventListener('pointerleave', () => { clearTimeout(away); away = setTimeout(() => { if (!dt.matches(':hover')) off(); }, 240); });
      svg.addEventListener('click', ev => { clearTimeout(away); read(svg, ev); });
    });
    dt.addEventListener('pointerleave', off);
    document.addEventListener('pointerdown', ev => { if (!dt.contains(ev.target) && !(ev.target.closest && ev.target.closest('.pr-dots'))) off(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') off(); });
  }

  // the Ground Fade to the last screen: white to pale over 60vh of scroll, the table and the last screen together
  const close = document.querySelector('.pr-close'), pg = document.querySelector('.page');
  if (close && !reduce) {
    pg.classList.add('pr-gf'); let last = -1;
    const gf = () => { const k = clamp((innerHeight * .9 - close.getBoundingClientRect().top) / (innerHeight * .6)); if (k !== last) { last = k; pg.style.setProperty('--gf', k.toFixed(3)); } };
    addEventListener('scroll', gf, { passive: true }); addEventListener('resize', gf, { passive: true }); gf();
  }

  // the first screen: the arm is the ruler, its height is the ask. The dots fly to their seats over 2200ms, the paint drains down to the lowest price, and each line draws over 1000ms, 300ms apart, with its figure ticking for 1200ms.
  const hb = document.querySelector('.pr-hbot'), lad = document.querySelector('.pr-lad');
  const G = hb && F.ghost && F.ghost('arm');
  if (G) {
    const rows = G.y1 - G.y0 + 1, cols = G.x1 - G.x0 + 1, [mid, low] = lad.dataset.h.split(' ').map(Number);
    lad.style.setProperty('--ar', `${cols}/${rows}`);
    const pts = G.pts.map(([x, y, sz], i) => { const rnd = (i * 7919 % 997) / 997; return { x: x - G.x0 + .5, y: y - G.y0 + .5, s: sz, h: (rows - (y - G.y0 + .5)) / rows, r: rnd, dl: (y - G.y0) / rows * .7 + rnd * .5 }; });
    const ASM = 2.2, soft = t => 1 - Math.pow(1 - t, 3);
    const paint = (L, el) => {
      const { c, w: cw, h } = fit(hb), cell = Math.min(cw / cols, h / rows), ox = cw - cols * cell, oy = h - rows * cell;
      // solid up to the lowest price, half under the estimate, faint above it
      const tiers = [[], [], []];
      for (const p of pts) tiers[p.h <= L ? 0 : p.h <= mid ? 1 : 2].push(p);
      [1, .62, .3].forEach((al, i) => { c.fillStyle = `rgba(40,71,206,${al})`; c.beginPath(); for (const p of tiers[i]) { const k = el >= ASM ? 1 : soft(clamp((el - p.dl) / .9)); if (k <= 0) continue; const x = ox + p.x * cell + (1 - k) * (p.r - .5) * cell * 26, y = oy + p.y * cell + (1 - k) * (p.r * 1.7 - 1.1) * cell * 18, r = Math.max(.35, cell * (i ? .4 : .46) * (.55 + .45 * p.s)) * (.35 + .65 * k); c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832); } c.fill(); });
    };
    let level = low, elapsed = 9;
    const now = () => paint(level, elapsed);
    new ResizeObserver(now).observe(hb);
    if (reduce) now();
    else {
      const figs = [...lad.querySelectorAll('.pr-r')], t0 = performance.now() + 120;
      lad.classList.add('wait'); level = 1; elapsed = 0; now();
      const tick = (b, to) => { const a = performance.now(), f = t => { const k = clamp((t - a) / 1200); b.textContent = '$' + (Math.round(to * soft(k) / 100) * 100).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(f); }; b.textContent = '$0'; requestAnimationFrame(f); };
      figs.forEach((r, i) => setTimeout(() => { r.classList.add('on'); const b = r.querySelector('b'); tick(b, +b.dataset.to); }, 500 + i * 300));
      const run = t => { elapsed = Math.max(0, (t - t0) / 1000); level = 1 + (low - 1) * ease(clamp((elapsed - 1.1) / 1.1)); now(); if (elapsed < ASM) requestAnimationFrame(run); else { elapsed = 9; level = low; now(); } };
      requestAnimationFrame(run);
    }
  }
})();
