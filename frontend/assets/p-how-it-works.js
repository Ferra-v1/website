// How it works: one example loan in five steps. Both columns hold still while the reader scrolls; scrolling opens each step and drives the stage. The stage always shows everyone and all four payments, and the step's payment lights up and moves.
// All 5,000 dots are the loan, so the share of solid dots is the share paid back. Reduced motion, or a window too short to hold the scene: every step stands open and the stage shows the finished loan.
(() => {
  const run = document.querySelector('[data-hw]'); if (!run) return;
  const D = JSON.parse(run.dataset.hw), root = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const phone = () => innerWidth <= 1100;
  const held = () => !reduce && innerHeight >= 600;
  const $ = (s, r = run) => r.querySelector(s), $$ = (s, r = run) => [...r.querySelectorAll(s)];

  // the arm: every dot has its place, its size from the shade in the picture, and a rank, the order it fills from the floor up. A share of the ranks is exactly that share of the dots.
  const rows = D.grid.length, cols = Math.max(...D.grid.map(r => r.length));
  const at = (x, y) => (D.grid[y] || '')[x] > ' ';
  const pts = []; let sr = 0;
  D.grid.forEach((line, y) => { for (let x = 0; x < line.length; x++) { const c = line[x]; if (c === ' ') continue; sr = (sr * 9301 + 49297) % 233280;
    pts.push({ x, y, t: +c / 9, k: rows - y + (sr / 233280) * 5, edge: !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1) }); } });
  pts.slice().sort((a, b) => a.k - b.k).forEach((d, i, all) => { d.rank = i / all.length; });
  const SOLID = '#ffffff', PALE = '#5f7fe6', FAINT = 'rgba(255,255,255,.26)', TAU = 6.2832;
  const cv = $('.hw-grid'), ctx = cv.getContext('2d'), stage = $('.hw-stage'), dia = $('.hw-dia'), low = $('.hw-low');
  let F = null;
  function size() {
    const ph = phone(), s = getComputedStyle(stage), avail = held() ? (ph ? Math.min(290, Math.max(120, innerHeight * .3)) : Math.max(180, innerHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom) - dia.offsetHeight - 36)) : (ph ? 220 : 420);
    // the arm never reaches the figures beside it: the widest figure, $4,375,000, is about 5.5 times its type size
    const room = low.clientWidth - parseFloat(getComputedStyle(figO).fontSize) * 5.5 - 16;
    const h = Math.min(avail, 440, room * rows / cols), w = h * cols / rows, p = w / cols, H = p * rows, dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
    F = { w, h: H, dpr, p };
  }
  const buckets = { faint: [], pale: [], solid: [] };
  function paint() {
    if (!F) return;
    const { p, dpr, w, h } = F;
    for (const k in buckets) buckets[k].length = 0;
    for (const d of pts) (d.rank < S.paid ? buckets.solid : d.rank < S.fill ? buckets.pale : d.edge ? buckets.faint : []).push(d);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    for (const [k, c] of [['faint', FAINT], ['pale', PALE], ['solid', SOLID]]) {
      const L = buckets[k]; if (!L.length) continue; ctx.fillStyle = c; ctx.beginPath();
      const big = k === 'solid';   // a paid dot is a full dot, so the part that has been paid back reads solid beside the part still owed
      for (const d of L) { const cx = (d.x + .5) * p, cy = (d.y + .5) * p, r = Math.max(.7, p * (big ? .42 + .12 * (1 - d.t) : .28 + .18 * (1 - d.t))); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
      ctx.fill();
    }
  }

  // the diagram: lines, arrowheads and labels are placed from where the squares really are, so one script serves the wide row and the phone row
  const N = {}; $$('.hw-nd').forEach(n => { N[n.dataset.n] = n; });
  const Pth = {}, Hd = {}; $$('.hw-p').forEach(p => { Pth[p.dataset.p] = p; }); $$('.hw-h').forEach(p => { Hd[p.dataset.h] = p; });
  const Lab = {}; $$('.hw-lab').forEach(l => { Lab[l.dataset.k] = l; });
  const mv = $('.hw-mv');
  let R = {};
  const line = q => 'M' + q.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  const head = (a, b, s = 6) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux; return `M${b[0].toFixed(1)} ${b[1].toFixed(1)}L${(b[0] - ux * s + px * s * .55).toFixed(1)} ${(b[1] - uy * s + py * s * .55).toFixed(1)}L${(b[0] - ux * s - px * s * .55).toFixed(1)} ${(b[1] - uy * s - py * s * .55).toFixed(1)}Z`; };
  function layout() {
    const d = dia.getBoundingClientRect(), box = {};
    for (const k in N) { const r = N[k].getBoundingClientRect(); box[k] = { l: r.left - d.left, r: r.right - d.left, t: r.top - d.top, b: r.bottom - d.top, x: r.left - d.left + r.width / 2, y: r.top - d.top + r.height / 2 }; }
    const { l, c, r, u, f } = box, ph = phone(), off = 8;
    if (ph) {   // one rail under the row, since the gaps between the squares are too small to show anything moving. Each route drops from its squares to the rail
      const y = l.b + 9;
      R = { loan: [[l.x, l.b], [l.x, y], [c.x - 7, y], [c.x - 7, c.b]], repay: [[c.x + 7, c.b], [c.x + 7, y], [l.x + 12, y], [l.x + 12, l.b]], rent: [[u.x, u.b], [u.x, y], [c.x + 7, y], [c.x + 7, c.b]],
        fee: [[c.x, c.t], [c.x, f.b]], numbers: [[f.l, f.y], [l.x, f.y], [l.x, l.t]], cr: [[c.r, c.y], [r.l, r.y]], ru: [[r.r, r.y], [u.l, u.y]] };
    } else {
      const ry = c.b + 18;
      R = { loan: [[l.r, l.y - off], [c.l, c.y - off]], repay: [[c.l, c.y + off], [l.r, l.y + off]], rent: [[u.x, u.b], [u.x, ry], [c.x, ry], [c.x, c.b]],
        fee: [[c.x, c.t], [c.x, f.b]], numbers: [[f.l, f.y], [l.x, f.y], [l.x, l.t]], cr: [[c.r, c.y], [r.l, r.y]], ru: [[r.r, r.y], [u.l, u.y]] };
    }
    for (const k in R) { Pth[k].setAttribute('d', line(R[k])); const q = R[k], money = k === 'loan' || k === 'repay' || k === 'rent' || k === 'fee' || k === 'numbers'; Hd[k].setAttribute('d', money ? head(q[q.length - 2], q[q.length - 1]) : ''); }
    const put = (k, x, y) => { Lab[k].style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`; };
    dia.style.paddingBottom = '';
    if (ph) { const y = l.b + 16;
      if (held()) { for (const k in Lab) put(k, 0, y); return; }
      // nothing holds still here, so the one line under the row becomes a short list of all four payments
      for (const k in Lab) put(k, 0, y); ['loan', 'fee', 'rent', 'repay'].forEach((k, i) => put(k, 0, y + i * 22)); dia.style.paddingBottom = '110px'; return; }
    const hL = k => Lab[k].offsetHeight, wL = k => Lab[k].offsetWidth, g = c.l - l.r;
    Lab.repay.style.maxWidth = Math.max(110, g - 16) + 'px';
    put('loan', l.r + (g - wL('loan')) / 2, l.y - off - 6 - hL('loan'));
    put('repay', l.r + (g - wL('repay')) / 2, l.y + off + 6);
    put('rent', u.r - wL('rent'), c.b + 18 + 7);
    put('fee', c.x - 12 - wL('fee'), (f.b + c.t - hL('fee')) / 2);
    put('ask', c.x + 12, (f.b + c.t - hL('ask')) / 2);
    put('price', f.r + 14, f.y - hL('price') / 2);
    put('numbers', Math.max(l.x + 10, (l.x + f.l - wL('numbers')) / 2), f.y - hL('numbers') - 6);
  }

  // the story's moments. pay: who pays or asks. to: who receives. way: the route the small square travels. info: a question or numbers, a hollow square. show: the lines lit. say: the labels lit.
  const PH = {
    1: { pay: 'c', to: 'f', way: ['fee'], info: 1, show: ['fee'], say: ['ask', 'price'] },
    2: { pay: 'f', to: 'l', way: ['numbers'], info: 1, show: ['numbers'], say: ['numbers'] },
    3: { pay: 'l', to: 'c', way: ['loan'], show: ['loan'], say: ['loan'] },
    35: { pay: 'c', to: 'f', way: ['fee'], show: ['loan', 'fee'], say: ['fee'] },
    4: { pay: 'u', to: 'c', way: ['rent'], show: ['rent'], say: ['rent'] },
    5: { pay: 'c', to: 'l', way: ['rent', 'repay'], show: ['rent', 'repay'], say: ['repay'] },
    6: { pay: 'c', off: 'l', way: ['rent'], show: ['rent'], ghost: ['loan', 'repay'], say: ['rent'] },   // nothing is owed: the lender steps back, and the rent keeps coming
    all: { show: ['loan', 'repay', 'rent', 'fee'], say: ['loan', 'repay', 'rent', 'fee'] }
  };
  const steps = $$('.hw-ch'), figO = $('[data-owed]'), figP = $('[data-paid]'), figM = $('[data-month]');
  const S = { fill: 0, fillT: 0, paid: 0, paidT: 0 };
  const T = { o: -1, p: -1 }; let tick = null, shownO = 0, shownP = 0;   // the page prints the finished loan for readers with no script, so the first reading always rewrites the figures
  let phase = null, month = 0, way = null, t0 = 0, raf = 0, inView = true, runTop = 0, runLen = 1, spanSum = D.spans.reduce((a, b) => a + b, 0);
  function setPhase(ph) {
    if (ph === phase) return; phase = ph; const c = PH[ph];
    for (const k in N) { N[k].classList.toggle('on', k === c.pay); N[k].classList.toggle('to', k === c.to); N[k].classList.toggle('off', k === c.off); }
    for (const k in Pth) { const on = !!(c.show && c.show.includes(k)), gh = !!(c.ghost && c.ghost.includes(k)); Pth[k].classList.toggle('on', on); Hd[k].classList.toggle('on', on); Pth[k].classList.toggle('ghost', gh); Hd[k].classList.toggle('ghost', gh); }
    for (const k in Lab) Lab[k].classList.toggle('on', !!(c.say && c.say.includes(k)));
    way = c.way && held() ? c.way.reduce((all, k) => { const q = R[k]; return all.concat(all.length ? q : q); }, []) : null; t0 = performance.now(); mv.classList.toggle('info', !!c.info);
    if (!way) mv.style.visibility = 'hidden';
  }
  function targets() {
    if (phase === 1 || phase === 2) return [0, 0, 0, 0];
    if (phase === 3 || phase === 35 || phase === 4) return [1, 0, D.l, 0];
    const m = phase === 6 || phase === 'all' ? D.term : month, paid = D.l * m / D.term;
    return [1, m / D.term, D.l - paid, paid];
  }
  function show(o, p) {
    shownO = o; shownP = p; figO.textContent = money(o);
    // Paid back stays $0 until the first payment. Once payments run, the two figures always add up to the loan. Any other tick (the reader jumped across steps) shows Paid back as it stands.
    figP.textContent = p > 0 && Math.abs(o + p - D.l) < 1 ? money(D.l - Math.floor(o / 100 + .5) * 100) : money(p);
  }
  function readTargets() {
    const [fill, paid, o, p] = targets(); S.fillT = fill; S.paidT = paid;
    figM.textContent = phase === 5 ? 'Month ' + month + ' of ' + D.term : phase === 6 || phase === 'all' ? 'Month ' + D.term + ' of ' + D.term + '. Nothing is owed.' : '';
    if (o === T.o && p === T.p) return;
    const jump = Math.max(Math.abs(o - shownO), Math.abs(p - shownP)) > D.l / D.term * 2.5;
    T.o = o; T.p = p;
    if (!jump) { tick = null; show(o, p); }
    else tick = { o0: shownO, p0: shownP, t: performance.now() };
  }
  function measure() { const r = run.getBoundingClientRect(); runTop = r.top + scrollY; runLen = Math.max(1, r.height - innerHeight); }
  const startOf = i => { let a = 0; for (let k = 0; k < i; k++) a += D.spans[k]; return a / spanSum; };
  function onScroll() {
    if (!held()) return;
    const u = clamp((scrollY - runTop) / runLen);
    let i = D.spans.length - 1; while (i > 0 && u < startOf(i)) i--;
    const t = clamp((u - startOf(i)) / (D.spans[i] / spanSum));
    let ph = i + 1;
    if (ph === 3 && t >= .5) ph = 35;
    if (ph === 5) { month = Math.min(D.term, 1 + Math.floor(t / .86 * D.term)); if (month >= D.term) ph = 6; }
    setPhase(ph); readTargets();
    steps.forEach((el, k) => { const on = k === i; if (el.classList.contains('hw-live') !== on) { el.classList.toggle('hw-live', on); $('.hw-b', el).setAttribute('aria-expanded', on); } });
    wake();
  }
  const pointOn = (q, u) => { let tot = 0; const seg = []; for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); seg.push(d); tot += d; }
    let s = u * tot; for (let i = 0; i < seg.length; i++) { if (s <= seg[i]) { const k = seg[i] ? s / seg[i] : 0; return [q[i][0] + (q[i + 1][0] - q[i][0]) * k, q[i][1] + (q[i + 1][1] - q[i][1]) * k]; } s -= seg[i]; } return q[q.length - 1]; };
  let last = 0;
  function frame(now) {
    raf = 0; const dt = Math.min(64, now - (last || now)); last = now;
    let dirty = false;
    // the arm fills from the floor up over 1400ms when the loan is made. Paid dots follow the month a little behind the scroll, so they stay calm.
    if (S.fill !== S.fillT) { const d = dt / 1400; S.fill = S.fill < S.fillT ? Math.min(S.fillT, S.fill + d) : Math.max(S.fillT, S.fill - d); dirty = true; }
    if (S.paid !== S.paidT) { const d = S.paidT - S.paid; S.paid = Math.abs(d) < .0004 ? S.paidT : S.paid + d * .14; dirty = true; }
    if (dirty) paint();
    if (tick) { const u = clamp((now - tick.t) / 1200), e = ease(u); show(tick.o0 + (T.o - tick.o0) * e, tick.p0 + (T.p - tick.p0) * e); if (u >= 1) tick = null; }
    // one small square on its route: 1600ms of travel in every 2400ms. It starts and ends under a square, so it never pops in.
    if (way && inView) { const u = ((now - t0) % 2400) / 1600; if (u <= 1) { const [x, y] = pointOn(way, ease(u)); mv.style.transform = `translate(${x}px,${y}px)`; mv.style.visibility = 'visible'; } else mv.style.visibility = 'hidden'; }
    if (inView && (way || dirty || tick)) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  // the titles are real controls: pressing one goes to that step
  const go = i => { if (held()) scrollTo({ top: runTop + (startOf(i) + D.spans[i] / spanSum * .08) * runLen }); };
  steps.forEach((el, i) => { const b = $('.hw-b', el); b.addEventListener('click', () => go(i)); b.addEventListener('focus', () => { if (b.matches(':focus-visible')) go(i); }); });   // tabbing to a step opens it, so the keyboard reads what the wheel reads

  function still() {   // the finished loan, nothing travelling, every step open
    root.classList.remove('hw-on'); steps.forEach(el => { el.classList.remove('hw-live'); $('.hw-b', el).setAttribute('aria-expanded', true); });
    phase = null; setPhase('all'); month = D.term; S.fill = S.fillT = 1; S.paid = S.paidT = 1; T.o = 0; T.p = D.l; show(0, D.l); figM.textContent = 'Month ' + D.term + ' of ' + D.term + '. Nothing is owed.'; paint();
  }
  function refresh() {
    const h = held(); root.classList.toggle('hw-on', h); size(); layout(); measure();
    if (!h) { still(); return; }
    phase = phase === 'all' ? null : phase; const p = phase; phase = null; if (p != null) setPhase(p); onScroll(); paint();
  }
  function start() {
    refresh();
    S.fill = S.fillT; S.paid = S.paidT; if (tick) { show(T.o, T.p); tick = null; } paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }
  let rt, lw = innerWidth, lh = innerHeight;
  addEventListener('resize', () => { if (innerWidth === lw && Math.abs(innerHeight - lh) < 140) return; lw = innerWidth; lh = innerHeight; clearTimeout(rt); rt = setTimeout(refresh, 120); });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('load', refresh);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; if (inView && held()) wake(); }).observe(stage);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
