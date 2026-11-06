// How it works: one loan drawn as one big robot made of dots. Each dot is a share of the robots' price, so the share of dark dots is the share paid for.
// Scrolling through the steps drives the picture; the words and figures are also real page text.
(() => {
  const story = document.querySelector('[data-hw]'); if (!story) return;
  const D = JSON.parse(story.dataset.hw), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const exact = v => '$' + Math.round(v).toLocaleString('en-US');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const phone = () => innerWidth <= 900;

  // the robot: 1,000 dots listed in the order they fill, feet first, so a share of the list is exactly that share of the dots
  const bot = (() => { let sr = 0; const pts = D.bot.d.split(';').map((t, i, all) => { const [x, y] = t.split(',').map(Number); sr = (sr * 9301 + 49297) % 233280; return { x, y, r: sr / 233280, rank: i / all.length }; }); return { w: D.bot.w, rows: D.bot.h, pts }; })();
  const load = () => bot;
  // size a canvas so the robot fits the height allowed, sharp at the screen's density
  function fit(cv, maxW, maxH) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.min(maxW, maxH * bot.w / bot.rows), pitch = w / bot.w, h = pitch * bot.rows;
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    return { w, h, dpr, pitch };
  }
  const TAU = 6.2832, COBALT = '#2847ce', WAITING = '#e2e9f9', PRICED = '#bccaf3', FLASH = '#0fa9e8';
  function dots(c, list, fill) { if (!list.length) return; c.fillStyle = fill; c.beginPath(); for (const d of list) { c.moveTo(d[0] + d[2], d[1]); c.arc(d[0], d[1], d[2], 0, TAU); } c.fill(); }

  // what the picture shows: scan (0 to 1, the price passing from head to foot), level (the share of dots paid for), wave (a pass of brightness, the money arriving)
  function paint(c, F, s, intro) {
    if (!F) return;
    const p = F.pitch, wait = [], priced = [], paid = [], hot = [];
    c.setTransform(F.dpr, 0, 0, F.dpr, 0, 0); c.clearRect(0, 0, F.w, F.h);
    for (const d of bot.pts) {
      const k = intro >= 1 ? 1 : ease(clamp(intro * 1.7 - d.r * .7));
      if (k <= 0) continue;
      const cx = (d.x + .5) * p, cy = (d.y + .5) * p, base = p * .41 * (.4 + .6 * k);
      const py = d.y / bot.rows, near = s.scan > 0 && s.scan < 1.06 ? clamp(1 - Math.abs(py - s.scan) / .05) : 0;
      const wave = s.wave !== undefined ? clamp(1 - Math.abs((d.x / bot.w + py) / 2 - s.wave) / .1) : 0;
      if (d.rank < s.level) { (wave > .4 ? hot : paid).push([cx, cy, base * (1 + clamp(1 - (s.level - d.rank) / .02) * .14)]); continue; }
      if (near > .3) { hot.push([cx, cy, base * (1 + near * .12)]); continue; }
      (py + d.r * .02 < s.scan ? priced : wait).push([cx, cy, base * .94]);
    }
    dots(c, wait, WAITING); dots(c, priced, PRICED); dots(c, paid, COBALT); dots(c, hot, FLASH);
  }

  // ---------------------------------------------------------------- the story
  const cv = story.querySelector('.hw-grid'), paper = story.querySelector('.hw-paper'), pay = story.querySelector('.hw-pay'), pays = [...pay.children];
  const ra = story.querySelector('.hw-ra'), rb = story.querySelector('.hw-rb'), steps = [...story.querySelectorAll('.hw-ch')], stage = story.querySelector('.hw-stage');
  const ctx = cv.getContext('2d');
  let F = null, blocks = [], line = 0, focus = 0, target = 0, cur = 0, raf = 0, shown = '', intro = reduce ? 1 : 0, t0 = 0, aside = { s: 1, x: 0 };
  function size() {
    const si = stage.querySelector('.hw-si'), col = si.clientWidth, ph = phone();
    F = fit(cv, col, ph ? Math.min(innerHeight * .31, 300) : Math.max(320, innerHeight - 270));
    // beside the paper the robot stands smaller at the left of the same floor
    if (!ph) { const room = Math.min(336, col * .6), s = clamp((col - room - 32) / F.w, .36, .72); aside = { s, x: (col - F.w * s) / 2 }; paper.style.width = room + 'px'; }
    else { aside = { s: 1, x: 0 }; cv.style.transform = ''; }
  }
  function read(a, b, an, bn) {
    if (a !== shown) { shown = a; ra.firstChild.textContent = a; rb.firstChild.textContent = b; }
    ra.lastChild.textContent = an; rb.lastChild.textContent = bn;
  }
  const OWN = (100 - D.adv) / 100, level = m => OWN + (1 - OWN) * m / D.term;
  function render(G) {
    const i = Math.floor(G), t = G - i;
    let st = { scan: 0, level: 0 }, showPay = false, m = 0, py = 108;
    if (i === 0) { st.level = 1.05 * (1 - ease(clamp(t * 1.5))); read('Robot arms', 'Each, new and installed', String(D.n), money(D.arm)); }
    else if (i === 1) read('Robot arms', 'Each, new and installed', String(D.n), money(D.arm));
    else if (i === 2) { const u = clamp(t * 1.25), n = Math.floor(u * D.n + 1e-6); st.scan = u * 1.08; read('Robots priced', 'Worth in all', n + ' of ' + D.n, money(n * D.arm)); }
    else if (i === 3) { st = { scan: 2, level: OWN * ease(clamp(t * 2.2)) }; read('The loan, ' + D.adv + '%', 'The company pays, ' + D.rest + '%', money(D.l), money(D.v - D.l)); }
    else if (i === 4) { py = 108 - 108 * ease(clamp(t * 2.4)); st = { scan: 2, level: OWN }; read('The loan, ' + D.adv + '%', 'The company pays, ' + D.rest + '%', money(D.l), money(D.v - D.l)); }
    else if (i === 5) { py = 108 * ease(clamp(t * 3)); st = { scan: 2, level: OWN, wave: -0.2 + t * 1.5 }; read('The lender pays', "Ferra's fee, once", money(D.l), exact(D.fee)); }
    else if (i === 6) { m = t * (D.term - 1); showPay = true; st = { scan: 2, level: level(m) }; const k = Math.round(m), s = D.months[k]; read('Still owed, month ' + k, 'The robots are worth', money(s[1]), money(s[0])); }
    else { m = D.term - 1; showPay = true; st = { scan: 2, level: level(m) }; read('Still owed, month ' + m, 'The robots are worth', money(D.months[m][1]), money(D.months[m][0])); }
    if (!phone()) {
      const a = 1 - py / 108;
      paper.style.opacity = a > .01 ? 1 : 0; paper.style.transform = `translateY(${py}%)`;
      cv.style.transform = a > .001 ? `translateX(${-aside.x * a}px) scale(${1 - (1 - aside.s) * a})` : '';
    }
    pay.classList.toggle('on', showPay);
    const k = Math.round(m); pays.forEach((d, j) => d.classList.toggle('p', j < k));
    paint(ctx, F, st, intro);
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
    const fy = focus; let best = null, bd = 1e9;
    steps.forEach(el => { const r = el.getBoundingClientRect(), d = fy >= r.top && fy <= r.bottom ? 0 : Math.min(Math.abs(r.top - fy), Math.abs(r.bottom - fy)); if (d < bd) { bd = d; best = el; } });
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
  function refresh() { size(); if (reduce) { render(3.99); return; } measure(); onScroll(); render(cur); }
  function start() {
    if (!load()) return;
    if (!reduce) document.documentElement.classList.add('hw-on');
    size();
    if (reduce) { render(3.99); } else { measure(); onScroll(); cur = target; if (!raf) raf = requestAnimationFrame(tick); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!reduce) { measure(); onScroll(); } });
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { refresh(); fsize(); fpaint(); lsize(); lpaint(); }, 120); });
  if (!reduce) addEventListener('scroll', onScroll, { passive: true });
  addEventListener('load', () => { if (!reduce && bot) { measure(); onScroll(); } });

  // ---------------------------------------------------------------- what if the company fails: one slider. The robot stands for what is still owed; the bright part is what the sale pays back.
  const box = document.querySelector('[data-fail]');
  let FF = null, fc = null, flevel = 0, ftarget = 0, fraf = 0, inp = null;
  const FD = box ? JSON.parse(box.dataset.fail) : null, fg = box && box.querySelector('.hw-fgrid');
  const out = n => box.querySelector(`[data-fo="${n}"]`);
  function fsize() { if (!box || !load()) return; FF = fit(fg, box.clientWidth, phone() ? 240 : Math.min(360, innerHeight * .4)); }
  function fpaint() {
    if (!FF) return;
    const b = bot, p = FF.pitch, paid = [], rest = [];
    fc.setTransform(FF.dpr, 0, 0, FF.dpr, 0, 0); fc.clearRect(0, 0, FF.w, FF.h);
    for (const d of b.pts) { (d.rank < flevel ? paid : rest).push([(d.x + .5) * p, (d.y + .5) * p, p * .41]); }
    dots(fc, rest, 'rgba(255,255,255,.2)');
    dots(fc, paid, 'rgb(150,232,255)');
  }
  function sale(pc) {
    const each = FD.val / FD.n * pc, total = each * FD.n;
    if (total >= FD.debt) return { sold: Math.ceil(FD.debt / each - 1e-9), back: FD.debt, left: total - FD.debt, short: 0, share: 1.02 };
    return { sold: FD.n, back: total, left: 0, short: FD.debt - total, share: total / FD.debt };
  }
  function ftick() { fraf = 0; const d = ftarget - flevel; flevel = Math.abs(d) < .002 || reduce ? ftarget : flevel + d * .22; fpaint(); if (flevel !== ftarget) fraf = requestAnimationFrame(ftick); }
  function apply() {
    const pc = +inp.value / 100, s = sale(pc);
    out('pct').textContent = inp.value + '%';
    out('back').textContent = money(s.back);
    out('bl').textContent = s.short > 0 ? 'The lender loses' : 'Left for the company';
    out('b').textContent = money(s.short > 0 ? s.short : s.left);
    out('say').textContent = s.short > 0 ? `All ${FD.n} robots are sold and it comes up ${money(s.short)} short. The lender takes that loss.` : `It takes ${s.sold === FD.n ? 'all ' + FD.n + ' robots' : s.sold + ' of the ' + FD.n + ' robots'} to pay back the lender. The rest of the money goes to the company.`;
    inp.style.setProperty('--f', ((+inp.value - +inp.min) / (+inp.max - +inp.min) * 100) + '%');
    inp.setAttribute('aria-valuetext', inp.value + ' percent');
    ftarget = s.share; if (!fraf) fraf = requestAnimationFrame(ftick);
  }
  function fstart() {
    if (!box || !load()) return;
    const sl = box.querySelector('.hw-sl'); inp = sl.querySelector('input'); fc = fg.getContext('2d');
    sl.hidden = false; inp.addEventListener('input', apply);
    sl.querySelector('.hw-tick').addEventListener('click', () => { inp.value = box.dataset.mid; apply(); });
    fsize(); flevel = sale(+inp.value / 100).share; apply(); fpaint();
  }

  // ---------------------------------------------------------------- nothing is owed: the last dots go in when the reader arrives
  const fin = document.querySelector('[data-fin]');
  let LF = null, lc = null, lu = 0, lraf = 0, lt0 = 0;
  const FN = fin ? JSON.parse(fin.dataset.fin) : null, lcv = fin && fin.querySelector('.hw-fing-c');
  const lpays = fin ? [...fin.querySelector('.hw-pay').children] : [], lwhen = fin && fin.querySelector('[data-fi="when"]'), lowed = fin && fin.querySelector('[data-fi="owed"]');
  function lsize() { if (!fin || !load()) return; LF = fit(lcv, fin.querySelector('.hw-fins').clientWidth, phone() ? 300 : Math.min(560, innerHeight * .62)); }
  function lpaint() {
    if (!LF) return;
    const done = lu >= .5, wave = lu > .5 ? -0.2 + (lu - .5) * 2.8 : undefined;
    paint(lc, LF, { scan: 2, level: done ? 1.05 : level(FN.term - 1) + (1.05 - level(FN.term - 1)) * ease(lu * 2), wave }, 1);
    lpays.forEach((d, j) => d.classList.toggle('p', j < FN.term - 1 || lu >= .25));
    lwhen.textContent = 'Still owed, month ' + (lu >= .25 ? FN.term : FN.term - 1);
    lowed.textContent = lu >= .25 ? '$0' : money(FN.from);
  }
  function lrun(now) { if (!lt0) lt0 = now; lu = clamp((now - lt0) / 2200); lpaint(); lraf = lu < 1 ? requestAnimationFrame(lrun) : 0; }
  function lstart() {
    if (!fin || !load()) return;
    lc = lcv.getContext('2d'); lsize();
    if (reduce) { lu = 1; lpaint(); return; }
    lu = 0; lpaint();
    new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); lraf = requestAnimationFrame(lrun); } }), { threshold: .45 }).observe(lcv);
  }

  const boot = () => { start(); fstart(); lstart(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
