// How it works: one example loan. The steps are real page text; scrolling through them drives the stage: who pays whom on one line, the arm that stands for the loan, and two figures.
// All 5,000 dots are the loan, so the share of solid dots is the share paid back. Reduced motion: each step shows its finished stage, with nothing travelling.
(() => {
  const story = document.querySelector('[data-hw]'); if (!story) return;
  const D = JSON.parse(story.dataset.hw), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const phone = () => innerWidth <= 1040;
  const $ = (s, r = story) => r.querySelector(s), $$ = (s, r = story) => [...r.querySelectorAll(s)];

  // the arm: every dot has its place, its size from the shade in the picture, and a rank, the order it fills from the floor up. A share of the ranks is exactly that share of the dots.
  const rows = D.grid.length, cols = Math.max(...D.grid.map(r => r.length));
  const at = (x, y) => (D.grid[y] || '')[x] > ' ' ;
  const pts = []; let sr = 0;
  D.grid.forEach((line, y) => { for (let x = 0; x < line.length; x++) { const c = line[x]; if (c === ' ') continue; sr = (sr * 9301 + 49297) % 233280;
    pts.push({ x, y, t: +c / 9, k: rows - y + (sr / 233280) * 5, edge: !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1) }); } });
  pts.slice().sort((a, b) => a.k - b.k).forEach((d, i, all) => { d.rank = i / all.length; });
  const SOLID = '#2847ce', PALE = '#a9bbef', FAINT = '#cdd4e3', TAU = 6.2832;
  const cv = $('.hw-grid'), ctx = cv.getContext('2d'), stage = $('.hw-stage'), dia = $('.hw-dia'), si = $('.hw-si');
  let F = null;
  function size() {
    const ph = phone(), room = ph ? Math.max(120, innerHeight * .52 - dia.offsetHeight - 40) : Math.max(240, stage.clientHeight - dia.offsetHeight - 32);
    const h = Math.min(room, ph ? 230 : 500), maxW = ph ? Math.min(560, si.clientWidth) * .38 : si.clientWidth - 296, w = Math.min(maxW, h * cols / rows), p = w / cols, H = p * rows, dpr = Math.min(2, devicePixelRatio || 1);
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
      const big = k === 'solid';   // a paid dot is a full dot, so the part that has been paid back reads solid beside the pale part still owed
      for (const d of L) { const cx = (d.x + .5) * p, cy = (d.y + .5) * p, r = Math.max(.7, p * (big ? .42 + .12 * (1 - d.t) : .28 + .18 * (1 - d.t))); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
      ctx.fill();
    }
  }

  // the diagram: the lines and the labels are placed from where the nodes really are, so one script serves the row at 1440 and the two by two on a phone
  const N = {}; $$('.hw-nd').forEach(n => { N[n.dataset.n] = n; });
  const P = {}; ['base', 'stem', 'lc', 'cf', 'fl', 'cr', 'dash'].forEach(k => { P[k] = $('.hw-p-' + k); });
  const labs = $$('.hw-lab'), mv = $('.hw-mv'), monthLab = labs.find(l => l.dataset.at === 'lc2');
  let box = {}, R = {};
  const line = pts => 'M' + pts.map(q => q[0] + ' ' + q[1]).join('L');
  function layout() {
    const d = dia.getBoundingClientRect(); box = {};
    for (const k in N) { const r = N[k].getBoundingClientRect(); box[k] = { l: r.left - d.left, r: r.right - d.left, t: r.top - d.top, b: r.bottom - d.top, x: r.left - d.left + r.width / 2, y: r.top - d.top + r.height / 2 }; }
    const { l, c, r, u, f } = box, q = k => [box[k].x, box[k].y];
    const elbow = [f.x, f.y], corner = [l.x, f.y];
    R = { lc: [q('l'), q('c')], cl: [q('c'), q('l')], cf: [q('c'), q('f')], fl: [elbow, corner, q('l')], uc: [q('u'), q('r'), q('c')] };
    P.base.setAttribute('d', line([q('l'), q('c'), q('r'), q('u')])); P.stem.setAttribute('d', line(R.cf));
    P.lc.setAttribute('d', line(R.lc)); P.dash.setAttribute('d', line(R.lc)); P.cf.setAttribute('d', line(R.cf)); P.fl.setAttribute('d', line(R.fl)); P.cr.setAttribute('d', line(R.uc));
    const ph = phone();
    for (const el of labs) {
      if (ph) { el.style.transform = ''; continue; }
      const a = el.dataset.at, w = el.offsetWidth, h = el.offsetHeight, mid = (l.r + c.l) / 2, below = l.b + 12;
      const pay = labs.find(x => x.dataset.at === 'lc' && x.dataset.ph === el.dataset.ph);   // the month sits under the payment it counts, on the same left edge
      const [x, y] = a === 'fr' ? [f.r + 14, f.y - h / 2] : a === 'fl' ? [f.l - 14 - w, f.y - h - 8] : a === 'lcu' ? [Math.max(0, mid - w / 2), l.t - h - 8]
        : a === 'cu' ? [c.l, below] : a === 'r' ? [r.x - w / 2, below] : a === 'lc2' ? [Math.max(0, mid - pay.offsetWidth / 2), below + h + 4] : [Math.max(0, mid - w / 2), below];
      el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    }
  }

  // the story's moments. lit: who is acting. way: the line money or a question travels. info: a question or numbers, a hollow square. show: the lines that stay on
  const PH = {
    0: {},
    1: { lit: 'c', way: 'cf', info: 1, show: ['cf'] },
    2: { lit: 'f' },
    3: { lit: 'c', show: ['dash'] },
    4: { lit: 'f', way: 'fl', info: 1, show: ['fl'] },
    5: { lit: 'l', way: 'lc', show: ['lc'] },
    55: { lit: 'c', way: 'cf', show: ['cf'] },
    6: { lit: 'u', way: 'uc', show: ['cr'] },
    7: { lit: 'c', way: 'cl', show: ['lc'] },
    8: { lit: 'c', off: 'l' }
  };
  const steps = $$('.hw-ch'), figO = $('[data-owed]'), figP = $('[data-paid]');
  const S = { fill: 0, fillT: 0, paid: 0, paidT: 0 };
  const T = { o: 0, p: 0 }; let tick = null, shownO = 0, shownP = 0;
  let phase = -1, month = 0, blocks = [], lineY = 0, wayName = null, t0 = 0, raf = 0, inView = true;
  function setPhase(ph) {
    if (ph === phase) return; phase = ph; const c = PH[ph];
    for (const k in N) { N[k].classList.toggle('on', k === c.lit); N[k].classList.toggle('off', k === c.off); }
    for (const k of ['lc', 'cf', 'fl', 'cr', 'dash']) P[k].classList.toggle('on', !!(c.show && c.show.includes(k)));
    for (const el of labs) el.classList.toggle('on', +el.dataset.ph === ph);
    wayName = c.way || null; t0 = performance.now(); mv.classList.toggle('info', !!c.info);
    if (!wayName) mv.style.visibility = 'hidden';
    else if (reduce) mv.style.visibility = 'hidden';
  }
  function targets() {
    if (phase < 5) return [0, 0, 0, 0];
    if (phase === 5 || phase === 55 || phase === 6) return [1, 0, D.l, 0];
    const m = phase === 8 ? D.term : month, paid = D.l * m / D.term, owed = D.l - paid;
    return [1, m / D.term, owed, paid];
  }
  function readTargets() {
    const [fill, paid, o, p] = targets(); S.fillT = fill; S.paidT = paid;
    if (o === T.o && p === T.p) return;
    const jump = Math.max(Math.abs(o - shownO), Math.abs(p - shownP)) > D.l / D.term * 2.5;
    T.o = o; T.p = p;
    if (reduce || !jump) { tick = null; show(o, p); }
    else tick = { o0: shownO, p0: shownP, t: performance.now() };
    if (monthLab && phase === 7) monthLab.textContent = 'Month ' + month + ' of ' + D.term;
  }
  function show(o, p) {
    shownO = o; shownP = p; const a = money(o); figO.textContent = a;
    // Paid back stays $0 until the first payment. Once payments run, the two figures always add up to the loan. Any other tick (the reader jumped across steps) shows Paid back as it stands.
    figP.textContent = p > 0 && Math.abs(o + p - D.l) < 1 ? money(D.l - Math.floor(o / 100 + .5) * 100) : money(p);
  }
  function measure() {
    const ph = phone(), y0 = scrollY, sh = ph ? stage.offsetHeight : 0;
    if (ph) story.style.setProperty('--hw-sh', sh + 'px');
    // a phone holds each step's words just under the stage. The next step takes over as those words start to leave, so what slides under the stage is already dimmed
    lineY = ph ? sh + Math.min(236, (innerHeight - sh) * .6) : innerHeight * .46;
    blocks = steps.map(el => { const r = el.getBoundingClientRect(); return { n: +el.dataset.ch, top: r.top + y0, h: r.height, el }; });
  }
  function onScroll() {
    const y = scrollY + lineY; let live = null;
    for (const b of blocks) if (y >= b.top) live = b;
    let ph = 0;
    if (live) {
      ph = live.n;
      if (ph === 5 && (y - live.top) / live.h >= .5) ph = 55;
      if (ph === 7) { const t = clamp((y - live.top) / live.h); let m = Math.min(D.term, 1 + Math.floor(t * D.term)); if (reduce) m = t < 1 / 3 ? 12 : t < 2 / 3 ? 24 : D.term; month = m; }
    }
    setPhase(ph); readTargets();
    steps.forEach(el => el.classList.toggle('hw-live', live ? el === live.el : false));
    if (reduce) { S.fill = S.fillT; S.paid = S.paidT; paint(); return; }
    wake();
  }
  const pointOn = (pts, u) => { let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let s = u * tot; for (let i = 0; i < seg.length; i++) { if (s <= seg[i]) { const k = seg[i] ? s / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } s -= seg[i]; } return pts[pts.length - 1]; };
  let last = 0;
  function frame(now) {
    raf = 0; const dt = Math.min(64, now - (last || now)); last = now;
    let dirty = false;
    // the arm fills pale from the floor up over 1400ms when the loan is made. Paid dots follow the month a little behind the scroll, so they stay calm.
    if (S.fill !== S.fillT) { const d = dt / 1400; S.fill = S.fill < S.fillT ? Math.min(S.fillT, S.fill + d) : Math.max(S.fillT, S.fill - d); dirty = true; }
    if (S.paid !== S.paidT) { const d = S.paidT - S.paid; S.paid = Math.abs(d) < .0004 ? S.paidT : S.paid + d * .14; dirty = true; }
    if (dirty) paint();
    if (tick) { const u = clamp((now - tick.t) / 1200), e = ease(u); show(tick.o0 + (T.o - tick.o0) * e, tick.p0 + (T.p - tick.p0) * e); if (u >= 1) tick = null; }
    // one small square on its line: 1600ms of travel in every 2400ms. It starts and ends under a node, so it never pops in.
    if (wayName && inView) { const u = ((now - t0) % 2400) / 1600; if (u <= 1) { const [x, y] = pointOn(R[wayName], ease(u)); mv.style.transform = `translate(${x}px,${y}px)`; mv.style.visibility = 'visible'; } else mv.style.visibility = 'hidden'; }
    if (inView && (wayName || dirty || tick)) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && !reduce) { raf = requestAnimationFrame(frame); } }

  // the ground behind the last two sections fades from ink to the gradient over 60vh of scroll, as the last screen comes up
  const wrap = document.querySelector('.hw-g'), gl = wrap && wrap.querySelector('.hw-gl'), ask = wrap && wrap.querySelector('.hw-ask');
  if (wrap && !reduce) wrap.classList.add('hw-gf');
  function ground() { if (!gl || reduce) return; const k = clamp((innerHeight - ask.getBoundingClientRect().top) / (innerHeight * .6)); gl.style.opacity = k; }

  function refresh() { size(); layout(); measure(); onScroll(); paint(); ground(); }
  function start() {
    if (!reduce) document.documentElement.classList.add('hw-on');
    refresh();
    S.fill = S.fillT; S.paid = S.paidT; if (tick) { show(T.o, T.p); tick = null; } paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }
  let rt, lw = innerWidth, lh = innerHeight;
  addEventListener('resize', () => { if (innerWidth === lw && Math.abs(innerHeight - lh) < 140) return; lw = innerWidth; lh = innerHeight; clearTimeout(rt); rt = setTimeout(refresh, 120); });
  addEventListener('scroll', () => { onScroll(); ground(); }, { passive: true });
  addEventListener('load', refresh);
  if (!reduce && 'IntersectionObserver' in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; if (inView) wake(); }).observe(stage);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
