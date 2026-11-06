// Price report. One chart tells the report as you scroll: the dots, then the line, the spread at one age, two kinds of robot, the real sales, two arms, and the three prices the page opened on.
// The ground darkens as it arrives, and the next section rises over it as it leaves. Native scrolling, position sticky. Hover or tap a dot to read the listing or sale it stands for, with its link.
// Readers who ask for less motion get the finished chart with all the words beside it.
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
  const veil = root.querySelector('.pr-veil'), hero = document.querySelector('.pr-hero'); let dusk = -1;
  const P = D.pts.map((p, i) => ({ age: p[0], usd: p[1], t: p[2], year: p[3], src: p[4], url: p[5], whole: p[6], fam: p[7], a: 0, k: 0, gr: 0, d: i * 7919 % 433 / 433 }));
  const A = D.auc.map(a => ({ age: a[0], usd: a[1], t: a[2], when: a[3], src: a[4], url: a[5], sold: true, a: 0 }));
  // the axis starts just under the lowest ordinary price; a rare listing far below it sits on the floor with its real price printed beside it
  const lo = Math.min(...P.map(q => q.usd).filter(v => v >= 1000), ...A.map(q => q.usd)) * .82, hi = Math.max(...P.map(q => q.usd)) * 1.12;
  // the listing and the sale the line joins
  const LI = P[D.link.li], SA = A[D.link.au];
  let step = reduce ? N - 1 : 0, g = {}, hover = null, band = 0, three = 0, line = 0, fams = 0, link = 0, seen = reduce, born = 0, raf = 0;

  function layout() {
    const W = chart.clientWidth, H = chart.clientHeight, phone = W < 560;
    const L = 60, R = W - 4, base = H - (phone ? 30 : 40), top = phone ? 10 : 8;
    const X = a => L + a / 32 * (R - L), Y = v => base - 8 - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (base - 8 - top);
    g = { W, H, phone, L, R, base, top, X, Y, r: phone ? 2 : 2.6 };
    P.forEach(q => { q.x = X(q.age); q.y = Y(q.usd); });
    A.forEach(q => { q.x = X(q.age); q.y = Y(q.usd); });
    labels(); kick();
  }
  function labels() {
    const { X, Y, L, R, base, phone, W, H } = g;
    let s = `<line class="ax" x1="0" x2="${R}" y1="${base + .5}" y2="${base + .5}"/>`;
    TICKS.filter(t => t > lo * 1.2 && t < hi).forEach(t => { s += `<text x="0" y="${Y(t) + 5}">${usd(t)}</text>`; });
    [5, 10, 15, 20, 25, 30].forEach(a => { s += `<text x="${X(a)}" y="${base + (phone ? 22 : 26)}" text-anchor="middle">${a === 30 && !phone ? '30 years old' : a}</text>`; });
    if (phone) s += `<text x="0" y="${base + 22}">Age</text>`;
    const c = D.curve, dots = P.map(q => ({ x: q.x, y: q.y })), box = { l: L + 12, r: R, t: g.top, b: base - 6 }, ages = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 8, 6, 4, 2];
    // each label goes in the clearest place near what it names, with a short line to it
    const near = (cu, gaps) => { const o = []; ages.forEach(a => { const ty = Y(cu[a]); gaps.forEach(d => o.push({ x: X(a), y: ty + d, tx: X(a), ty })); }); return o; };
    const u1 = [], u2 = [], u3 = [];
    s += `<g class="lg" data-s="1 2">${clearLabel('Typical asking price', near(c.map(v => v[1]), [-26, 26, -48, 48, -80, 80]), dots, box, u1)}</g>`;
    s += `<g class="lg" data-s="2">${clearLabel('8 in 10 ask inside this band', near(c.map(v => v[0]), [20, 44]), dots, box, u1, 'pl')}</g>`;
    const dx = X(D.cheap[0]), dy = Y(D.cheap[1]), hx = X(D.dear[0]), hy = Y(D.dear[1]);
    s += `<g class="lg" data-s="2"><text class="lb" x="${dx + 12}" y="${dy + 5}">${usd(D.cheap[1])}</text><text class="lb" x="${hx + 12}" y="${hy + 5}">${usd(D.dear[1])}</text></g>`;
    const inFam = P.filter(q => q.fam === D.hi.id || q.fam === D.lo.id).map(q => ({ x: q.x, y: q.y }));
    s += `<g class="lg" data-s="3">${clearLabel(D.hi.label, near(D.hi.curve, [-24, -44, -70]), inFam, box, u2)}${clearLabel(D.lo.label, near(D.lo.curve, [24, 44, 70]), inFam, box, u2, 'lb cy')}</g>`;
    // what the dark dots imply, counted from the data: a sale is under the band when it brought less than the band's floor for its age
    const under = A.filter(q => q.usd < c[Math.round(q.age)][0]).length, say = under === A.length ? 'Every sale here landed under the band' : `${under} of these ${A.length} sales landed under the band`;
    const low = A.reduce((m, q) => q.usd < m.usd ? q : m, A[0]), w = say.length * 8, rt = low.x + 12 + w < R, lf = low.x - 12 - w > L;
    if (rt || lf) s += `<g class="lg" data-s="4"><text class="lb" x="${low.x + (rt ? 12 : -12)}" y="${low.y + 5}" text-anchor="${rt ? 'start' : 'end'}">${say}</text></g>`;
    else { const i = say.indexOf(' landed'), x = Math.min(low.x - w * .31, R - w * .62), y = low.y + 40 < base - 6 ? low.y + 22 : low.y - 30; s += `<g class="lg" data-s="4"><text class="lb" x="${x}" y="${y}">${say.slice(0, i)}<tspan x="${x}" dy="18">${say.slice(i + 1)}</tspan></text></g>`; }
    // on a phone the chart is too short for this note beside the last step's label, and the last step is about something else
    s += `<g class="lg" data-s="${phone ? '0 1 2 3' : '0 1 2 3 4'}">${lowest(P, lo)}</g>`;
    // the two prices the line joins, on the side of each dot away from the line. A dot with no room on that side takes its words under it.
    const up = LI.y <= SA.y, tall = phone ? 22 : 24, gapx = phone ? 13 : 18;
    const say2 = (q, big, small, top) => { const bw = big.length * tall * .6, room = q.x + gapx + bw < R, side = q.x > (L + R) / 2 ? (q.x - gapx - bw > L ? -1 : 1) : (room ? 1 : -1), x = q.x + side * gapx, a = side > 0 ? 'start' : 'end', y = top ? q.y - 2 : q.y + tall * .72 + 2, hw = Math.max(bw, small.length * 8); return `<a href="${q.url}" target="_blank" rel="noopener" tabindex="-1"><rect class="hit" x="${side > 0 ? x - 6 : x - hw - 6}" y="${y - tall}" width="${hw + 12}" height="${tall + 30}"/><text class="bn" x="${x}" y="${y}" text-anchor="${a}">${big}</text><text class="bs" x="${x}" y="${y + 21}" text-anchor="${a}">${small} \u2192</text></a>`; };
    s += `<g class="lg" data-s="5">${say2(LI, usd(LI.usd), 'asking today', up)}${say2(SA, usd(SA.usd), 'sold at auction', !up)}</g>`;
    // the same three prices the page opened on, standing on the age of 10
    const tx = X(10), lbl = ['Sellers ask', 'Likely sale', 'Auctions paid'];
    s += `<g class="lg" data-s="6"><line class="ax" x1="${tx + .5}" x2="${tx + .5}" y1="${g.top}" y2="${base}"/>` + D.three.map((v, i) => `<text class="bn" x="${tx + 20}" y="${Y(v) + (phone ? 4 : 8)}">${money(v)}</text><text class="bs" x="${tx + 20}" y="${Y(v) + (phone ? 24 : 32)}">${lbl[i]}</text>`).join('') + '</g>';
    ax.setAttribute('viewBox', `0 0 ${W} ${H}`); ax.innerHTML = s;
    marks();
  }
  function marks() { ax.querySelectorAll('.lg').forEach(n => { n.classList.toggle('on', seen && (reduce ? n.dataset.s.includes('4') || n.dataset.s === '1 2' || n.dataset.s === '5' : n.dataset.s.split(' ').includes(String(step)))); }); }

  function target(q) {
    // [alpha, colour mix toward cyan, extra size]
    if (reduce) return q === LI ? [1, 0, 2.4] : [.5, 0, 0];
    switch (step) {
      case 0: return [.92, 0, 0];
      case 1: return [.55, 0, 0];
      case 2: return Math.abs(q.whole - 10) <= 1 ? [1, 0, 1] : [.22, 0, 0];
      case 3: return q.fam === D.hi.id ? [1, 0, 1] : q.fam === D.lo.id ? [1, 1, 1] : [.14, 0, 0];
      case 5: return q === LI ? [1, 0, 2.4] : [.13, 0, 0];
      case 6: return Math.abs(q.whole - 10) <= 1 ? [.8, 0, 0] : [.1, 0, 0];
      default: return [.5, 0, 0];
    }
  }
  function draw(now) {
    const { c, w, h } = fit(cv), { X, Y, base } = g;
    let moving = false;
    const to = (v, t, k = .12) => { const n = v + (t - v) * k; if (Math.abs(t - n) > .004) moving = true; return Math.abs(t - n) > .004 ? n : t; };
    const on = seen ? 1 : 0;
    band = to(band, on * (reduce || step === 2 || step === 4 ? 1 : 0));
    three = to(three, on * (!reduce && step === 6 ? 1 : 0));
    line = to(line, on * (reduce || step === 1 || step === 2 || step === 4 ? 1 : step === 3 ? .35 : step === 5 ? .2 : 0), .1);
    link = to(link, on * (reduce || step === 5 ? 1 : 0), .07);
    fams = to(fams, on * (!reduce && step === 3 ? 1 : 0));
    if (band > .01) { c.fillStyle = `rgba(255,255,255,${.1 * band})`; c.beginPath(); for (let a = 0; a <= 30; a++) c.lineTo(X(a), Y(D.curve[a][2])); for (let a = 30; a >= 0; a--) c.lineTo(X(a), Y(D.curve[a][0])); c.closePath(); c.fill(); }
    if (fams > .01) { const pl = (cu, col) => { c.strokeStyle = `rgba(${col},${fams})`; c.lineWidth = 2; c.beginPath(); cu.forEach((v, a) => c.lineTo(X(a), Y(v))); c.stroke(); }; pl(D.hi.curve, '255,255,255'); pl(D.lo.curve, CY.join(',')); }
    const tElapsed = now - born;
    for (const q of P) {
      const [ta_, tk, tg] = seen ? target(q) : [0, 0, 0];
      const app = reduce ? 1 : clamp((tElapsed - q.x / g.W * 700 - q.d * 300) / 240);
      if (app < 1 && seen) moving = true;
      q.a = to(q.a, ta_); q.k = to(q.k, tk); q.gr = to(q.gr, tg);
      const al = q.a * app; if (al <= .004) continue;
      const m = q === hover ? 1 : q.k;
      c.fillStyle = `rgba(${255 + (CY[0] - 255) * m | 0},${255 + (CY[1] - 255) * m | 0},${255 + (CY[2] - 255) * m | 0},${q === hover ? 1 : al})`;
      c.beginPath(); c.arc(q.x, q.y, (g.r + q.gr * .7 + (q === hover ? 1.4 : 0)) * (.4 + .6 * app), 0, 6.2832); c.fill();
    }
    if (line > .01) { c.setLineDash([]); c.strokeStyle = `rgba(255,255,255,${line})`; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); for (let a = 0; a <= 30; a++) c.lineTo(X(a), Y(D.curve[a][1])); c.stroke(); }
    A.forEach(q => { const au = !seen ? 0 : reduce || step === 4 ? 1 : step === 5 ? (q === SA ? 1 : .16) : 0, big = q === SA ? link * 3 : 0, ring = q === hover || big > .5; q.a = to(q.a, au, .1); if (q.a < .01) return; c.fillStyle = `rgba(${CY.join(',')},${q.a})`; c.beginPath(); c.arc(q.x, q.y, (g.r + 1.2 + big + (q === hover ? 1.2 : 0)) * (.5 + .5 * q.a), 0, 6.2832); c.fill(); if (ring) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); } });
    // the line that joins them draws from the asking price down to the sale, and stops at the rim of each dot
    if (link > .01) { const k = ease(link), x = LI.x + (SA.x - LI.x) * k, y = LI.y + (SA.y - LI.y) * k; c.strokeStyle = '#fff'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(LI.x, LI.y); c.lineTo(x, y); c.stroke(); c.lineCap = 'butt'; c.fillStyle = '#fff'; c.beginPath(); c.arc(LI.x, LI.y, g.r + 2.4, 0, 6.2832); c.fill(); if (k > .97) { c.fillStyle = `rgb(${CY.join(',')})`; c.beginPath(); c.arc(SA.x, SA.y, g.r + 3, 0, 6.2832); c.fill(); } }
    // the three prices land on the age of 10
    if (three > .01) D.three.forEach(v => { c.fillStyle = `rgba(255,255,255,${three})`; c.beginPath(); c.arc(X(10), Y(v), 5.5 * three, 0, 6.2832); c.fill(); });
    return moving;
  }
  function frame(now) { raf = 0; if (draw(now)) kick(); }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function setStep(i) {
    if (i === step) return; step = i; hideTip();
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    marks(); kick();
  }
  function onScroll() {
    if (reduce) return;
    const r = root.getBoundingClientRect(), span = root.offsetHeight - pin.offsetHeight;
    const s = clamp(-r.top / span);
    // the last screen of the pin is kept for the next section, which rises over the chart. The steps share what is left.
    const end = (root.offsetHeight - 2 * pin.offsetHeight) / span;
    setStep(clamp(Math.floor(s / end * N), 0, N - 1));
    // night falls over the three numbers as the chart arrives: the first screen and this one darken together, so no edge shows between them
    const a = Math.min(innerHeight * .62, root.offsetTop - 160), k = clamp((a - r.top) / (a * .6));
    if (k !== dusk) { dusk = k; hero.classList.toggle('dusk', k > 0); hero.style.setProperty('--d', k.toFixed(3)); veil.style.opacity = 1 - k; }
    if (!seen && k > .5) { seen = true; born = performance.now(); marks(); kick(); }
  }
  // dots you can read
  const live = () => (reduce || step === 4 || step === 5 ? A.concat(P) : P).filter(q => q.sold || q.a > .1);
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
  steps[step].classList.add('on');
  new ResizeObserver(layout).observe(chart);
  layout(); onScroll();
  if (reduce) { P.forEach(q => { q.a = .5; }); A.forEach(q => { q.a = 1; }); band = 1; line = 1; marks(); kick(); }

  // the table: each dot is one listing behind that robot's price. Its place in the row says which listing it is. Rest on it or tap it to read it.
  const tw = document.querySelector('.pr-tw'), dt = tw && tw.querySelector('.pr-dtip');
  if (dt) {
    const [db, ds, da] = ['b', 'span', 'a'].map(s => dt.querySelector(s)), COLS = 58, PITCH = 6;
    let ring = null, away = 0;
    const off = () => { if (ring) { ring.remove(); ring = null; } dt.hidden = true; };
    const read = (svg, ev) => {
      const b = svg.getBoundingClientRect(), ix = svg.dataset.i.split(','), i = clamp(Math.floor((ev.clientY - b.top) / PITCH) * COLS + Math.floor((ev.clientX - b.left) / PITCH), 0, ix.length - 1), q = P[+ix[i]];
      const x = i % COLS * PITCH + PITCH / 2, y = Math.floor(i / COLS) * PITCH + PITCH / 2, w = tw.getBoundingClientRect();
      if (ring) ring.remove();
      ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 3.4); svg.append(ring);
      db.textContent = q.t; ds.textContent = `Built ${q.year}. Asking ${usd(q.usd)} on ${q.src}.`; da.textContent = 'See the listing \u2192'; da.href = q.url;
      placeTip(dt, tw, b.left - w.left + x, b.top - w.top + y);
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

})();
