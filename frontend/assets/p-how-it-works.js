// How it works: one loan drawn as one big robot made of dots. Each dot is a share of the robots' price, so the share of dark dots is the share paid for.
// Scrolling through the steps drives the picture; the words and figures are also real page text.
(() => {
  const story = document.querySelector('[data-hw]'); if (!story) return;
  const D = JSON.parse(story.dataset.hw), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const exact = v => '$' + Math.round(v).toLocaleString('en-US');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);

  // the robot's dots, ranked from the feet up with a little scatter, so a share of the rank is that share of the dots
  const BOT = 'arm2-l';
  let bot = null;
  function load() {
    if (bot) return bot;
    const b = (window.FERRA_DOTS || {})[BOT]; if (!b) return null;
    let my = 0, sr = 0;
    const pts = b.d.split(';').filter(Boolean).map(s => { const [x, y, L, A, , ed] = s.split(',').map(Number); if (y > my) my = y; sr = (sr * 9301 + 49297) % 233280; return { x, y, r: sr / 233280, s: (A / 100) * Math.min(1, .46 + .54 * Math.pow(1 - L / 100, .8) + (ed / 100) * .35) }; });
    pts.forEach(p => { p.k = (my - p.y) / my + p.r * .1; });
    const order = pts.slice().sort((a, b) => a.k - b.k); order.forEach((p, i) => { p.rank = i / order.length; });
    return (bot = { w: b.w, rows: my + 1, pts, n: pts.length });
  }
  // size a canvas so the robot fits the height allowed, sharp at the screen's density
  function fit(cv, maxW, maxH) {
    const b = load(); if (!b) return null;
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.min(maxW, maxH * b.w / b.rows), pitch = w / b.w, h = pitch * b.rows;
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    return { w, h, dpr, pitch };
  }
  const TAU = 6.2832;
  function dots(c, f, list, fill) { if (!list.length) return; c.fillStyle = fill; c.beginPath(); for (const d of list) { c.moveTo(d[0] + d[2], d[1]); c.arc(d[0], d[1], d[2], 0, TAU); } c.fill(); }

  // ---------------------------------------------------------------- the story
  const cv = story.querySelector('.hw-grid'), paper = story.querySelector('.hw-paper'), pay = story.querySelector('.hw-pay'), pays = [...pay.children];
  const ra = story.querySelector('.hw-ra'), rb = story.querySelector('.hw-rb'), steps = [...story.querySelectorAll('.hw-ch,.hw-note')], stage = story.querySelector('.hw-stage');
  const ctx = cv.getContext('2d');
  let F = null, grad = null, blocks = [], line = 0, target = 0, cur = 0, raf = 0, shown = '', intro = reduce ? 1 : 0, t0 = 0;
  const phone = () => innerWidth <= 900;
  function size() {
    const col = stage.querySelector('.hw-si').clientWidth, ph = phone();
    F = fit(cv, col, ph ? Math.min(innerHeight * .3, 300) : Math.max(300, innerHeight - 400));
    if (!F) return;
    grad = ctx.createLinearGradient(F.w, 0, 0, F.h); grad.addColorStop(0, '#0394e0'); grad.addColorStop(.55, '#2847ce'); grad.addColorStop(1, '#1e339b');
  }
  // what the picture shows: scan (0 to 1, the price passing from head to foot), level (the share of dots paid for), front (how far the edge of the level glows), wave (a pass of brightness)
  function paint(s) {
    if (!F) return;
    const b = bot, p = F.pitch, ghost = [], priced = [], owned = [];
    ctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0); ctx.clearRect(0, 0, F.w, F.h);
    for (const d of b.pts) {
      const k = intro >= 1 ? 1 : ease(clamp(intro * 1.7 - d.r * .7));
      if (k <= 0) continue;
      const cx = (d.x + .5) * p, cy = (d.y + .5) * p;
      if (d.rank < s.level) { const edge = clamp(1 - (s.level - d.rank) / .035); owned.push([cx, cy, Math.max(.3, p * .46 * d.s * (1 + edge * .32) * (.4 + .6 * k))]); continue; }
      const py = d.y / b.rows, on = py + d.r * .05 < s.scan;
      const near = s.scan > 0 && s.scan < 1.06 ? clamp(1 - Math.abs(py - s.scan) / .06) : 0;
      const wave = s.wave !== undefined ? clamp(1 - Math.abs((d.x / b.w + py) / 2 - s.wave) / .12) : 0;
      const r = p * .46 * d.s * (on ? .84 : .66) * (.4 + .6 * k) * (1 + near * .5 + wave * .3);
      (on ? priced : ghost).push([cx, cy, Math.max(.3, r)]);
      if (near > .3 || wave > .3) owned.push([cx, cy, Math.max(.3, r)]);
    }
    dots(ctx, F, ghost, 'rgba(40,71,206,.34)');
    dots(ctx, F, priced, 'rgba(40,71,206,.62)');
    dots(ctx, F, owned, grad);
  }
  function read(a, b, an, bn, key) {
    if (a !== shown) { shown = a; ra.firstChild.textContent = a; rb.firstChild.textContent = b; }
    ra.lastChild.textContent = an; rb.lastChild.textContent = bn;
  }
  const OWN = (100 - D.adv) / 100;
  function render(G) {
    const i = Math.floor(G), t = G - i;
    let st = { scan: 0, level: 0 }, showPay = false, m = 0, py = 108;
    if (i === 0) { st.level = 1.05 * (1 - ease(clamp(t * 1.5))); read('Robot arms', 'Each, in our example', String(D.n), money(D.arm), 'a'); }
    else if (i === 1) read('Robot arms', 'Each, in our example', String(D.n), money(D.arm), 'a');
    else if (i === 2) { const u = clamp(t * 1.25), n = Math.floor(u * D.n + 1e-6); st.scan = u * 1.08; read('Robots priced', 'Worth in all', n + ' of ' + D.n, money(n * D.arm), 'b'); }
    else if (i === 3) { st = { scan: 2, level: OWN * ease(clamp(t * 2.2)) }; read('The loan, ' + D.adv + '%', 'The company pays, ' + D.rest + '%', money(D.l), money(D.v - D.l), 'c'); }
    else if (i === 4) { py = 108 - 108 * ease(clamp(t * 2.4)); st = { scan: 2, level: OWN }; read('The loan, ' + D.adv + '%', 'The company pays, ' + D.rest + '%', money(D.l), money(D.v - D.l), 'c'); }
    else if (i === 5) { py = 108 * ease(clamp(t * 3)); st = { scan: 2, level: OWN, wave: -0.2 + t * 1.5 }; read('The lender pays', "Ferra's fee, once", money(D.l), exact(D.fee), 'd'); }
    else if (i === 6) { m = t * D.term; showPay = true; st = { scan: 2, level: OWN + (1 - OWN) * m / D.term }; const k = Math.round(m), s = D.months[k]; read('Still owed, month ' + k, 'The robots are worth', money(s[1]), money(s[0]), 'e'); }
    else { m = D.term; showPay = true; st = { scan: 2, level: 1.05 }; read('Still owed, month ' + D.term, 'The robots are worth', '$0', money(D.months[D.term][0]), 'e'); }
    paper.style.opacity = py < 107 ? 1 : 0; paper.style.transform = `translate(-50%,${py}%)`;
    pay.classList.toggle('on', showPay);
    const k = Math.round(m); pays.forEach((d, j) => d.classList.toggle('p', j < k));
    paint(st);
  }
  function measure() {
    const ph = phone(), sh = ph ? stage.offsetHeight : 0, y0 = scrollY;
    line = ph ? sh + (innerHeight - sh) * .34 : innerHeight * .55;
    // the notes under step 6 stretch that step: its progress runs across all of its blocks
    const by = {};
    steps.forEach(el => { const r = el.getBoundingClientRect(), n = +el.dataset.ch, b = by[n] || (by[n] = { n, top: r.top + y0, bot: r.bottom + y0 }); b.bot = Math.max(b.bot, r.bottom + y0); });
    blocks = Object.values(by).sort((a, b) => a.n - b.n);
  }
  function onScroll() {
    const y = scrollY + line; let G = blocks.length ? clamp(scrollY / Math.max(1, blocks[0].top - line), 0, .9999) : 0;
    for (const b of blocks) if (y >= b.top) G = b.n + clamp((y - b.top) / (b.bot - b.top), 0, .9999);
    target = G;
    let best = null, bd = 1e9; steps.forEach(el => { const r = el.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - line); if (d < bd) { bd = d; best = el; } });
    steps.forEach(el => el.classList.toggle('hw-live', el === best));
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (intro < 1) { if (!t0) t0 = now; intro = clamp((now - t0) / 1300); }
    const d = target - cur; cur = Math.abs(d) < .001 ? target : cur + d * .17;
    render(cur);
    if (cur !== target || intro < 1) raf = requestAnimationFrame(tick);
  }
  function refresh() { size(); if (reduce) { render(7); return; } measure(); onScroll(); render(cur); }
  function start() {
    if (!load()) return;
    if (!reduce) document.documentElement.classList.add('hw-on');
    size();
    if (reduce) { render(7); } else { measure(); onScroll(); cur = target; if (!raf) raf = requestAnimationFrame(tick); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!reduce) { measure(); onScroll(); } });
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { refresh(); fsize(); fpaint(); }, 120); });
  if (!reduce) addEventListener('scroll', onScroll, { passive: true });
  addEventListener('load', () => { if (!reduce && bot) { measure(); onScroll(); } });

  // ---------------------------------------------------------------- what if the company fails: one slider, the sale's numbers, the share of the robot it takes
  const box = document.querySelector('[data-fail]');
  let FF = null, fc = null, flevel = 0, ftarget = 0, fraf = 0, inp = null;
  const FD = box ? JSON.parse(box.dataset.fail) : null, fg = box && box.querySelector('.hw-fgrid');
  const out = n => box.querySelector(`[data-fo="${n}"]`);
  function fsize() { if (!box || !load()) return; FF = fit(fg, box.clientWidth, phone() ? 260 : Math.min(440, innerHeight * .46)); }
  function fpaint() {
    if (!FF) return;
    const b = bot, p = FF.pitch, sold = [], rest = [];
    fc.setTransform(FF.dpr, 0, 0, FF.dpr, 0, 0); fc.clearRect(0, 0, FF.w, FF.h);
    for (const d of b.pts) { (d.rank < flevel ? sold : rest).push([(d.x + .5) * p, (d.y + .5) * p, Math.max(.3, p * .46 * d.s * (d.rank < flevel ? 1 : .8))]); }
    dots(fc, FF, rest, 'rgba(255,255,255,.34)');
    dots(fc, FF, sold, 'rgb(150,232,255)');
  }
  function sale(pc) {
    const each = FD.val / FD.n * pc, total = each * FD.n;
    if (total >= FD.debt) return { sold: Math.ceil(FD.debt / each - 1e-9), back: FD.debt, left: total - FD.debt, short: 0, share: FD.debt / total };
    return { sold: FD.n, back: total, left: 0, short: FD.debt - total, share: 1 };
  }
  function ftick() { fraf = 0; const d = ftarget - flevel; flevel = Math.abs(d) < .002 || reduce ? ftarget : flevel + d * .22; fpaint(); if (flevel !== ftarget) fraf = requestAnimationFrame(ftick); }
  function apply() {
    const pc = +inp.value / 100, s = sale(pc);
    out('pct').textContent = inp.value + '%';
    out('back').textContent = money(s.back);
    out('bl').textContent = s.short > 0 ? 'The lender loses' : 'Left for the company';
    out('b').textContent = money(s.short > 0 ? s.short : s.left);
    out('say').textContent = s.short > 0 ? `All ${FD.n} robots are sold and it comes up ${money(s.short)} short. The lender takes that loss.` : `It takes ${s.sold} of the ${FD.n} robots to pay back the lender. The rest of the money goes to the company.`;
    inp.style.setProperty('--f', ((+inp.value - +inp.min) / (+inp.max - +inp.min) * 100) + '%');
    inp.setAttribute('aria-valuetext', inp.value + ' percent');
    ftarget = s.share; if (!fraf) fraf = requestAnimationFrame(ftick);
  }
  function fstart() {
    if (!box || !load()) return;
    const sl = box.querySelector('.hw-sl'); inp = sl.querySelector('input'); fc = fg.getContext('2d');
    sl.hidden = false; inp.addEventListener('input', apply);
    fsize(); flevel = sale(+inp.value / 100).share; apply(); fpaint();
  }
  const boot = () => { start(); fstart(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
