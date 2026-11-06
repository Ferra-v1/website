// How it works: one example loan as one arm that fills. All 5,000 dots are the 50 robots, so the share of dark dots is the share paid for.
// Scrolling through the steps drives the picture; the words and figures are also real page text.
(() => {
  const story = document.querySelector('[data-hw]'); if (!story) return;
  const D = JSON.parse(story.dataset.hw), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const exact = v => '$' + Math.round(v).toLocaleString('en-US');
  // a figure from our assumed curve reads as rough as it is: to the nearest $50,000, in plain words above a million
  const mil = v => { const r = Math.round(v / 50000) * 50000; return r >= 1e6 ? '$' + (+(r / 1e6).toFixed(2)) + ' million' : '$' + r.toLocaleString('en-US'); };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const phone = () => innerWidth <= 900;

  // the arm: every dot has its place, its size from the shade in the picture, and a rank, the order it fills from the floor up. A share of the ranks is exactly that share of the dots.
  const rows = D.grid.length, cols = Math.max(...D.grid.map(r => r.length));
  const pts = []; let sr = 0;
  D.grid.forEach((line, y) => { for (let x = 0; x < line.length; x++) { const c = line[x]; if (c === ' ') continue; sr = (sr * 9301 + 49297) % 233280; pts.push({ x, y, t: +c / 9, r: sr / 233280, k: rows - y + (sr / 233280) * 5 }); } });
  pts.slice().sort((a, b) => a.k - b.k).forEach((d, i, all) => { d.rank = i / all.length; });
  const PAID = '#2847ce', LENT = '#7cc4f2', PRICED = '#b4c3ea', WAIT = '#dae1f0', TAU = 6.2832;
  const fills = { wait: [], priced: [], lent: [], paid: [] };

  const cv = story.querySelector('.hw-grid'), ctx = cv.getContext('2d'), stage = story.querySelector('.hw-stage'), steps = [...story.querySelectorAll('.hw-ch')];
  const ra = story.querySelector('.hw-ra'), rb = story.querySelector('.hw-rb');
  let F = null, blocks = [], line = 0, focus = 0, target = 0, cur = 0, raf = 0, shown = '';
  function size() {
    const si = stage.querySelector('.hw-si'), ph = phone(), maxH = ph ? Math.min(innerHeight * .3, 280) : Math.max(320, innerHeight - 310), maxW = ph ? si.clientWidth * .44 : si.clientWidth;
    const w = Math.min(maxW, maxH * cols / rows), p = w / cols, h = p * rows, dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    F = { w, h, dpr, p };
  }
  // scan: the price passing from head to foot. level: the share of dots paid for. lent: how far the lender's money has risen through the rest.
  function paint(s) {
    if (!F) return;
    const { p, dpr, w, h } = F;
    for (const k in fills) fills[k].length = 0;
    const lentTo = s.level + (1 - s.level) * s.lent;
    for (const d of pts) {
      const list = d.rank < s.level ? fills.paid : d.rank < lentTo ? fills.lent : (d.y / rows + d.r * .04) < s.scan ? fills.priced : fills.wait;
      list.push(d);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    for (const [k, c] of [['wait', WAIT], ['priced', PRICED], ['lent', LENT], ['paid', PAID]]) {
      const L = fills[k]; if (!L.length) continue; ctx.fillStyle = c; ctx.beginPath();
      for (const d of L) { const cx = (d.x + .5) * p, cy = (d.y + .5) * p, r = Math.max(.6, p * (.2 + .26 * (1 - d.t))); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
      ctx.fill();
    }
  }
  function read(a, b, an, bn) {
    if (a !== shown) { shown = a; ra.firstChild.textContent = a; rb.firstChild.textContent = b; }
    ra.querySelector('dd').textContent = an; rb.querySelector('dd').textContent = bn;
  }
  const worthLabel = () => phone() ? 'Worth about' : 'The robots are worth about';
  const OWN = (100 - D.adv) / 100, level = m => OWN + (1 - OWN) * m / D.term;
  const LOAN = ['The loan, ' + D.adv + '%', 'The company pays, ' + D.rest + '%', money(D.l), money(D.v - D.l)];
  function render(G) {
    const i = Math.floor(G), t = G - i;
    const s = { scan: 2, level: 0, lent: 0 }; let m = 0;
    if (i === 0) { s.scan = 0; s.level = 1.02 * (1 - ease(clamp(t * 1.4))); read('Robot arms', 'Each, new and installed', String(D.n), money(D.arm)); }
    else if (i === 1) { s.scan = 0; read('Robot arms', 'Each, new and installed', String(D.n), money(D.arm)); }
    else if (i === 2) { const u = clamp(t * 1.25), n = Math.floor(u * D.n + 1e-6); s.scan = u * 1.06; read('Robots priced', 'Worth in all', n + ' of ' + D.n, money(n * D.arm)); }
    else if (i === 3) { s.level = OWN * ease(clamp(t * 2.2)); read(...LOAN); }
    else if (i === 4) { s.level = OWN; read(...LOAN); }
    else if (i === 5) { s.level = OWN; s.lent = ease(clamp(t * 1.6)); read('The lender pays', "Ferra's fee, once", money(D.l), exact(D.fee)); }
    else if (i === 6) { m = t * (D.term - 1); s.level = level(m); s.lent = 1; const k = Math.round(m), v = D.months[k]; read('Still owed, month ' + k, worthLabel(), money(v[1]), mil(v[0])); }
    else { s.level = level(D.term - 1) + (1.02 - level(D.term - 1)) * ease(clamp(t * 3)); s.lent = 1; read('Still owed, month ' + D.term, worthLabel(), '$0', mil(D.months[D.term][0])); }
    rb.classList.toggle('hw-model', i >= 6);   // a value from our model sits a size below the real sum beside it
    paint(s);
  }
  function measure() {
    const ph = phone(), sh = ph ? stage.offsetHeight : 0, y0 = scrollY;
    if (ph) story.style.setProperty('--hw-sh', sh + 'px');
    // on a phone a step's numbers change only once its heading has docked under them; elsewhere, when the step reaches the middle of the screen
    line = ph ? sh + 2 : innerHeight * .55;
    focus = ph ? sh + (innerHeight - sh) * .4 : line;
    blocks = steps.map(el => { const r = el.getBoundingClientRect(); return { n: +el.dataset.ch, top: r.top + y0, bot: r.bottom + y0 }; }).sort((a, b) => a.n - b.n);
  }
  function onScroll() {
    const y = scrollY + line; let G = blocks.length ? clamp(scrollY / Math.max(1, blocks[0].top - line), 0, .9999) : 0;
    for (const b of blocks) if (y >= b.top) G = b.n + clamp((y - b.top) / (b.bot - b.top), 0, .9999);
    target = G;
    let best = null, bd = 1e9;
    steps.forEach(el => { const r = el.getBoundingClientRect(), d = focus >= r.top && focus <= r.bottom ? 0 : Math.min(Math.abs(r.top - focus), Math.abs(r.bottom - focus)); if (d < bd) { bd = d; best = el; } });
    steps.forEach(el => el.classList.toggle('hw-live', el === best));
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    raf = 0;
    const d = target - cur; cur = Math.abs(d) < .001 ? target : cur + d * .14;   // the picture follows the scroll a little behind it, so it stays calm
    render(cur);
    if (cur !== target) raf = requestAnimationFrame(tick);
  }
  // reduced motion: the finished still of the loan on the day it starts, dark for what the company paid and light for the lender's money
  const still = () => render(5.99);
  function refresh() { size(); if (reduce) { still(); return; } measure(); onScroll(); render(cur); }
  function start() {
    if (!reduce) document.documentElement.classList.add('hw-on');
    size();
    if (reduce) still(); else { measure(); onScroll(); cur = target; render(cur); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!reduce) { measure(); onScroll(); } });
  }
  let rt, lw = innerWidth, lh = innerHeight; addEventListener('resize', () => { if (innerWidth === lw && Math.abs(innerHeight - lh) < 140) return; lw = innerWidth; lh = innerHeight; clearTimeout(rt); rt = setTimeout(refresh, 120); });
  if (!reduce) { addEventListener('scroll', onScroll, { passive: true }); addEventListener('load', () => { measure(); onScroll(); }); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
