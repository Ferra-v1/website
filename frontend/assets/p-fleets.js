// Robot companies page: the quote form's four robot fields stay in range and every change turns into the outcome beside them:
// what you could borrow, what the robots cost, what you pay yourself, the robot you picked, and one dot for each robot you typed, white for what the loan buys and pale for what you buy. All drawn here.
// The sections further down follow the same sentence: one robot earning its price back, and one month of rent split between the loan and the company.
// The closing band's button brings the visitor back to the form with the robot type field focused.
(() => {
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p'), wh = document.getElementById('sz-when');
  if (!ty) return;
  // the pile: one real dot for each robot typed, stacked up from the line the big robot stands on. Same dot pitch until it would not fit, then smaller, so 1 is one dot and 1,000 is 1,000 dots.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pile = document.getElementById('f-pile'), bot = document.getElementById('f-bot'), dotsay = document.getElementById('f-dotsay');
  const drawPile = (() => { if (!pile) return () => {}; const x = pile.getContext('2d'); let tok = 0, had = 0;
    return (count, animate) => { const W = pile.clientWidth, H = pile.clientHeight; if (!W || !H) return;
      const d = Math.min(2, devicePixelRatio || 1); pile.width = Math.round(W * d); pile.height = Math.round(H * d); x.setTransform(d, 0, 0, d, 0, 0); x.fillStyle = '#fff';
      let P = Math.min(24, Math.floor(Math.sqrt(W * H / count))), cols, rows; for (;;) { cols = Math.max(1, Math.floor(W / P)); rows = Math.ceil(count / cols); if (rows * P <= H || P <= 3) break; P--; }
      // the loan's share sits at the bottom of the pile. The dot where the share ends is white only as far up as the share reaches, so 1 robot reads as 70% of one dot.
      const share = count * .7, whole = Math.floor(share + 1e-9), part = share - whole;
      const put = i => { const cx = W - (i % cols + .5) * P, cy = H - (Math.floor(i / cols) + .5) * P, r = P * .34; x.fillStyle = i < whole ? '#fff' : 'rgba(255,255,255,.34)'; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill();
        if (i === whole && part > .001) { x.save(); x.beginPath(); x.rect(cx - r, cy + r - 2 * r * part, 2 * r, 2 * r * part); x.clip(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill(); x.restore(); } };
      const me = ++tok, from = animate && !still ? Math.min(had, count) : count, t0 = performance.now(), D = had ? 260 : 700; had = count;
      for (let i = 0; i < from; i++) put(i);
      let done = from; if (from < count) { const tick = t => { if (me !== tok) return; const end = Math.min(count, from + Math.ceil((count - from) * Math.min(1, (t - t0) / D))); while (done < end) put(done++); if (done < count) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
    }; })();
  // the big figure stays on one line in its column whatever is typed: its size comes from the width of the answer it is about to show
  const big = document.getElementById('f-big'), cost = document.getElementById('f-cost'), mine = document.getElementById('f-own'), the = document.getElementById('f-the'), COL = big && big.parentElement;
  const fitBig = text => { if (!big) return; big.style.fontSize = ''; const cs = getComputedStyle(big), max = parseFloat(cs.fontSize), m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing + ';font-size:' + max + 'px;font-variant-numeric:lining-nums tabular-nums'; m.textContent = text; document.body.appendChild(m); const w = m.getBoundingClientRect().width; m.remove(); const room = COL.clientWidth; if (w > room) big.style.fontSize = Math.floor(max * room / w) + 'px'; };
  let tick0, shownV = 6250000;
  const fmtBig = v => '$' + Math.round(v).toLocaleString('en-US');
  const sr = document.getElementById('f-sr');
  const showMoney = V => { const lend = Math.round(V * .7), own = V - lend, one = val(n) === 1; fitBig(fmtBig(lend)); cost.textContent = fmtBig(V); mine.textContent = fmtBig(own); if (the) the.textContent = one ? 'The robot costs' : 'The robots cost'; if (sr) sr.textContent = 'You could borrow ' + fmtBig(lend) + '. ' + (one ? 'The robot costs ' : 'The robots cost ') + fmtBig(V) + '. You pay ' + fmtBig(own) + ' yourself.'; cancelAnimationFrame(tick0); if (still) { shownV = V; big.textContent = fmtBig(V * .7); return; }
    const a = shownV, t0 = performance.now(), tick = t => { const k = Math.min(1, (t - t0) / 300), e = 1 - Math.pow(1 - k, 3); shownV = a + (V - a) * e; big.textContent = fmtBig(k === 1 ? V * .7 : shownV * .7); if (k < 1) tick0 = requestAnimationFrame(tick); }; tick0 = requestAnimationFrame(tick); };
  const digits = el => el.value.replace(/[^0-9]/g, '');
  const lim = el => [+el.dataset.min, +el.dataset.max];
  const clamp = (el, v) => { const [lo, hi] = lim(el); return Math.min(hi, Math.max(lo, v)); };
  const last = new Map([[n, 50], [p, 125000]]);   // the last good value of each field: an empty field keeps the preview where it was
  const val = el => last.get(el);
  const comma = el => { el.value = val(el).toLocaleString('en-US'); };
  // the range message: one line under the fields for 4 seconds
  const msg = document.getElementById('f-msg'); let mt;
  const say = el => { if (!msg) return; msg.textContent = el === n ? 'Between 1 and 1,000 robots' : 'Between $1,000 and $1,000,000'; const b = msg.parentElement.getBoundingClientRect(), r = el.closest('.f-pill').getBoundingClientRect(), room = b.width - 250; msg.style.paddingLeft = Math.max(0, Math.min(r.left - b.left, room)) + 'px'; msg.classList.add('on'); el.setAttribute('aria-invalid', 'true');
    clearTimeout(mt); mt = setTimeout(() => { msg.classList.remove('on'); [n, p].forEach(x => x.removeAttribute('aria-invalid')); }, 4000); };
  // one robot reads as one robot, in the sentence and under the dots
  const say1 = c => { [...ty.options].forEach(o => { o.textContent = c === 1 ? o.dataset.one : o.dataset.many; }); if (dotsay) dotsay.textContent = c === 1 ? 'This dot is your one robot. The loan buys the white part. You buy the pale part.' : 'Each dot is one of your ' + c.toLocaleString('en-US') + ' robots. The loan buys the white ones. You buy the pale ones.'; if (pile) pile.setAttribute('aria-label', c === 1 ? 'One dot for one robot, 70% white' : c.toLocaleString('en-US') + ' dots, one for each robot. 70% are white, the rest are pale.'); if (fitReady) fitSel(ty); };
  let fitReady = false;
  // what the sections further down do when the sentence changes: filled in by them below
  const followers = []; const follow = s => followers.forEach(f => f(s));
  // every valid change goes straight to the answer; it counts and redraws in 300ms
  const state = () => ({ rid: ty.value, n: val(n), price: val(p), when: wh ? wh.value : 'Within 3 months' });
  let lastKey = '';
  const upd = () => {
    const s = state(), key = [s.rid, s.n, s.price, s.when].join('|');
    if (key === lastKey) return; lastKey = key;
    drawPile(s.n, true); showMoney(s.n * s.price); say1(s.n); follow(s);
  };
  lastKey = [ty.value, 50, 125000, wh ? wh.value : ''].join('|');   // the page is built on these defaults
  [n, p].forEach(el => {
    el.addEventListener('input', () => {
      const d = digits(el); if (d !== el.value) el.value = d;
      if (!d) return;   // empty: keep the last preview, no message until the field is left
      const v = +d, [lo, hi] = lim(el);
      if (v > hi) { el.value = String(hi); last.set(el, hi); say(el); }   // above the top: clamp now and write it back
      else if (v >= lo) { last.set(el, v); clearTimeout(mt); msg.classList.remove('on'); el.removeAttribute('aria-invalid'); }
      else return;   // below the floor while typing (a price is typed from its first digit): the answer keeps its last good value until the field is left
      upd();
    });
    el.addEventListener('focus', () => { el.value = digits(el); el.select(); });
    el.addEventListener('blur', () => {
      const d = digits(el);
      if (!d || +d < lim(el)[0]) say(el);   // empty or too small: the field goes back to its last good value and says why
      comma(el); upd();
    });
  });
  // a new robot type brings its own typical price
  ty.addEventListener('change', () => { last.set(p, clamp(p, +ty.selectedOptions[0].dataset.price)); comma(p); swapBot(); upd(); });
  if (wh) wh.addEventListener('change', upd);
  // site.js reads the fleet fields as plain numbers when the form submits, so hand it digits for that moment
  const form = document.getElementById('quote');
  document.addEventListener('submit', ev => {
    if (ev.target !== form) return;
    // the range message belongs to the typing: clear it the moment the form is sent, so it never sits above the thank-you card
    if (msg) { clearTimeout(mt); msg.classList.remove('on'); msg.textContent = ''; [n, p].forEach(x => x.removeAttribute('aria-invalid')); }
    [n, p].forEach(el => { el.value = String(val(el)); });
    setTimeout(() => [n, p].forEach(comma), 0);
  }, true);
  // the big robot is the one picked in the sentence
  const swapBot = () => { if (!bot) return; const o = ty.selectedOptions[0]; bot.dataset.bot = o.dataset.bot; bot.setAttribute('aria-label', o.dataset.one + ' at work, drawn in dots'); if (window.FerraDots) FerraDots.draw(bot); };
  comma(n); comma(p);
  drawPile(val(n), true); fitBig(big ? big.textContent : '');
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { drawPile(val(n), false); fitBig(fmtBig(val(n) * val(p) * .7)); }, 150); });
  // once the request is in, the fields are gone, so their message line goes too
  const done = form && form.querySelector('.ldone');
  if (done && msg) new MutationObserver(() => { if (!done.hidden) msg.hidden = true; }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
  // every "Ask what you could borrow" link on this page returns to the form and puts the cursor in the robot type field
  // wide screens: the whole hero (fields and preview) fits, so return to its top; phones: to the first field
  const toForm = smooth => { const wide = matchMedia('(min-width: 901px)').matches, el = wide ? document.querySelector('.f-hero') : (form || ty), nav = document.querySelector('.nav'), nh = nav ? nav.getBoundingClientRect().height : 0, top = Math.max(0, el.getBoundingClientRect().top + scrollY - (wide ? nh - 24 : nh + 24)); scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }); ty.focus({ preventScroll: true }); };
  document.querySelectorAll('a[href="#quote"]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#quote'); toForm(!matchMedia('(prefers-reduced-motion: reduce)').matches); }));
  if (location.hash === '#quote') addEventListener('load', () => setTimeout(() => toForm(false), 60));
  // each dropdown in the sentence is as wide as the words it shows, so the sentence reads as a sentence
  const fitSel = sel => { const m = document.createElement('span'), cs = getComputedStyle(sel); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;text-transform:lowercase;font:' + cs.font + ';letter-spacing:' + cs.letterSpacing; m.textContent = sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : ''; document.body.appendChild(m); sel.style.width = Math.ceil(m.getBoundingClientRect().width + 2) + 'px'; m.remove(); };
  // the two typed answers follow what is in them too
  // (read the font piece by piece: the computed font shorthand comes back empty once tabular figures are set on the field, and the box then measures in the wrong size)
  const fitNum = el => { const m = document.createElement('span'), cs = getComputedStyle(el); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing + ';font-variant-numeric:lining-nums tabular-nums'; m.textContent = el.value || '0'; document.body.appendChild(m); el.style.width = Math.ceil(m.getBoundingClientRect().width + 6) + 'px'; m.remove(); };
  [n, p].forEach(el => { el.addEventListener('input', () => fitNum(el)); el.addEventListener('blur', () => fitNum(el)); el.addEventListener('focus', () => fitNum(el)); });
  const fitAll = () => { fitReady = true; [ty, wh].forEach(s => s && fitSel(s)); [n, p].forEach(fitNum); };
  [ty, wh].forEach(s => s && s.addEventListener('change', () => { fitSel(s); fitNum(p); }));
  fitAll(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll); addEventListener('resize', fitAll);
  // the second half of the form: "Ask what you could borrow" opens email and company and turns into Send
  const open = document.getElementById('f-open'), send = document.getElementById('f-send'), who = document.getElementById('f-who');
  const reveal = () => { if (!who || !who.hidden) return; who.hidden = false; open.hidden = true; send.hidden = false; const em = who.querySelector('input[type=email]'); if (em) em.focus({ preventScroll: true }); };
  if (open) open.addEventListener('click', reveal);
  // each robot in the row picks itself in the form on the way back up
  document.querySelectorAll('[data-pick]').forEach(a => a.addEventListener('click', () => { if ([...ty.options].some(o => o.value === a.dataset.pick)) { ty.value = a.dataset.pick; ty.dispatchEvent(new Event('change')); } }));
  // the rent everywhere below: the reader's price at the price tool's example share. 125,000 rents for 4,500, exactly as the tool opens.
  const pb = document.querySelector('.f-pay-bot'), SHARE = pb ? +pb.dataset.share : .036, usd = v => '$' + Math.round(v).toLocaleString('en-US');
  const rentOf = price => Math.max(1, Math.round(price * SHARE));
  const spriteOf = (rid, k) => (window.FERRA_DOTS || {})[rid + '-' + k] || (window.FERRA_DOTS || {})['arm-' + k];
  // the link keeps the reader's numbers where the price tool knows the robot; for the rest it opens the tool as it is
  const TOOL = { arm: 'any-arm', cobot: 'any-arm', amr: 'warehouse-mobile-robot', cleaning: 'cleaning-robot' };
  const toolLinks = ['f-try', 'f-bring'].map(id => document.getElementById(id)).filter(Boolean);
  followers.push(st => { const id = TOOL[st.rid], h = id ? 'price.html#r=' + id + '&y=2026&p=' + st.price + '&m=' + rentOf(st.price) + '&n=36&f=' + st.n : 'price.html'; toolLinks.forEach(a => { a.href = h; a.hidden = !id; }); });
  // one robot earning its price back: as the page scrolls, one month of rent at a time, the dots fill from the base up. Each dot is an equal share of the robot's price.
  const pbSec = pb && pb.closest('.f-why');
  if (pb && spriteOf('arm', 'l')) {
    let price = +pb.dataset.price, rent = +pb.dataset.rent, months = +pb.dataset.months, data = null, list = [], rows = 1, y0 = 0;
    const load = rid => { data = spriteOf(rid, 'l'); list = data.d.split(';').filter(Boolean).map(t => { const [cx, cy, L, A, , ed] = t.split(',').map(Number); return { cx, cy, s: (A / 100) * Math.min(1, .3 + .7 * Math.pow(L / 100, .9) + (ed / 100) * .35) }; });
      const ys = list.map(q => q.cy); y0 = Math.min(...ys); rows = Math.max(...ys) - y0 + 1; list.sort((a, b) => b.cy - a.cy || a.cx - b.cx); list.forEach((q, i) => { q.rank = i / list.length; }); };
    load('arm');
    const nEl = document.getElementById('f-read-n'), sEl = document.getElementById('f-read-s'), run = pb.closest('.f-run'), ctx = pb.getContext('2d');
    let W = 0, H = 0, pitch = 0, ox = 0, oy = 0, shown = -1;
    const size = () => { W = pb.clientWidth; H = pb.clientHeight || W * rows / data.w; const d = Math.min(2, devicePixelRatio || 1); pitch = Math.min(W / data.w, H / rows); ox = (W - pitch * data.w) / 2; oy = H - pitch * rows; pb.width = Math.round(W * d); pb.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); shown = -1; };
    const paint = m => { const share = Math.min(1, m * rent / price), on = new Path2D(), off = new Path2D();
      for (const q of list) { const r = Math.max(.5, pitch * .5 * Math.max(.34, q.s)), X = ox + (q.cx + .5) * pitch, Y = oy + (q.cy - y0 + .5) * pitch, path = q.rank < share ? on : off; path.moveTo(X + r, Y); path.arc(X, Y, r, 0, 6.2832); }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(40,71,206,.15)'; ctx.fill(off); ctx.fillStyle = '#2847ce'; ctx.fill(on); };
    const read = m => { nEl.textContent = usd(m * rent); sEl.textContent = m === 0 ? 'of rent on day one. You have paid ' + usd(price) + ' for the robot.' : m < months ? 'of rent after ' + m + (m === 1 ? ' month.' : ' months.') : 'of rent after ' + m + ' months. The robot has earned back its price.'; };
    const show = m => { if (m === shown) return; shown = m; paint(m); read(m); };
    let onScroll = () => {};
    const fix = () => { if (still) pb.style.height = pb.clientWidth * rows / data.w + 'px'; size(); if (still) show(months); else onScroll(); };
    if (still) { fix(); addEventListener('resize', fix); }
    else {
      pbSec.classList.add('f-why-live');
      onScroll = () => { const r = run.getBoundingClientRect(), span = r.height - innerHeight, p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0; show(Math.round(Math.min(1, p / .86) * months)); };
      addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', fix); fix();
    }
    const wP = document.getElementById('f-w-p'), wR = document.getElementById('f-w-r'), wM = document.getElementById('f-w-m');
    let rid0 = 'arm';
    followers.push(st => { price = st.price; rent = rentOf(price); months = Math.ceil(price / rent); if (st.rid !== rid0) { rid0 = st.rid; load(rid0); }
      wP.textContent = usd(price); wR.textContent = usd(rent); wM.textContent = months; fix();
    });
  }
  // one month: one small robot for each of the reader's robots, in two groups: the ones whose rent pays the loan, the ones whose rent stays. The picture and every figure come from the sentence on the first screen.
  // When the section first arrives each robot's rent comes in, left to right, then the two groups part. With reduced motion they stand finished.
  const mSec = document.querySelector('.f-month'), mg = mSec && mSec.querySelector('.f-mg'), mc = mg ? [...mg.querySelectorAll('.f-mbots')] : [];
  if (mc.length && spriteOf('arm', 's')) {
    const ADV = +mSec.dataset.adv, TERM = +mSec.dataset.term, $ = id => document.getElementById(id);
    const cellsOf = rid => { const b = spriteOf(rid, 's'); if (b._cells) return b; b._cells = b.d.split(';').filter(Boolean).map(t => { const [cx, cy, L, A] = t.split(',').map(Number); return { cx, cy, s: (A / 100) * Math.min(1, .35 + .65 * L / 100) }; }); const ys = b._cells.map(q => q.cy); b._y0 = Math.min(...ys); b._rows = Math.max(...ys) - b._y0 + 1; return b; };
    let N = 50, PAY = 27, rid = 'arm', spr = null, cw = 0, played = false;
    // every second row and column below, so at this size the dots stay dots. Very small robots are one dot each: still one mark for each robot
    const sprite = size => { const b = cellsOf(rid), d = Math.min(2, devicePixelRatio || 1), P = size * .92 / b.w, h = P * b._rows, S = document.createElement('canvas'); S.width = Math.ceil(size * d); S.height = Math.ceil(size * d * Math.max(1, b._rows / b.w)); const g = S.getContext('2d'); g.scale(d, d); g.fillStyle = '#fff'; g.beginPath();
      if (size < 16) { g.arc(size / 2, size / 2, size * .34, 0, 6.2832); g.fill(); return { S, cw: size, h: size, img: size }; }
      const every = size < 90 ? 2 : 1; for (const q of b._cells) { if (q.cx % every || q.cy % every) continue; const r = Math.max(.6, P * .46 * every * Math.max(.5, q.s)), X = (q.cx + .5) * P + size * .04, Y = (q.cy - b._y0 + .5) * P; g.moveTo(X + r, Y); g.arc(X, Y, r, 0, 6.2832); } g.fill(); return { S, cw: size, h: h + size * .1, img: S.height / d }; };
    // one robot size for both groups: the largest that fits both within the height a screen can spare
    const layout = () => { const stacked = matchMedia('(max-width:820px)').matches, maxH = stacked ? Math.min(320, innerHeight * .34) : Math.min(420, innerHeight * .4), keep = N - PAY, ratio = (cellsOf(rid)._rows / cellsOf(rid).w) + .1; let size = Math.min(150, mc[0].clientWidth);
      const fits = (m, w) => { if (!m) return true; const c = Math.max(1, Math.floor(w / size)); return Math.ceil(m / c) * size * ratio <= maxH; };
      while (size > 8 && !(fits(PAY, mc[0].clientWidth) && fits(keep, mc[1].clientWidth))) size -= 1;
      cw = size; spr = sprite(size); const d = Math.min(2, devicePixelRatio || 1);
      mc.forEach((c, gi) => { const m = N === 1 ? (gi ? 0 : 1) : gi ? keep : PAY, cols = Math.max(1, Math.floor(c.clientWidth / size)), R = Math.ceil(m / cols), Hh = Math.ceil(R * spr.h); c._m = m; c._C = cols; c._from = gi ? PAY : 0; c.style.height = Hh + 'px'; c.width = Math.round(c.clientWidth * d); c.height = Math.round(Hh * d); }); };
    // k runs 0 to 1: how far the rent has come in; part runs 0 to 1: how far the two groups have turned into bright and pale
    const draw = (k, part) => { const d = Math.min(2, devicePixelRatio || 1); mc.forEach((c, gi) => { const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, c.clientWidth, c.clientHeight);
      for (let i = 0; i < c._m; i++) { const a = Math.min(1, Math.max(0, (k * (N + 6) - (c._from + i)) / 6)), target = gi ? 1 - .62 * part : 1, px = (i % c._C) * cw, py = Math.floor(i / c._C) * spr.h;
        if (N === 1) {   // one robot: the share of its own rent that pays the loan, bright from the base up
          const cut = py + spr.h * (1 - SHARE_PAY); x.globalAlpha = .38; x.drawImage(spr.S, px, py, cw, spr.img); x.save(); x.beginPath(); x.rect(px, cut, cw, spr.h); x.clip(); x.globalAlpha = 1; x.drawImage(spr.S, px, py, cw, spr.img); x.restore(); continue; }
        x.globalAlpha = (.14 + .86 * a) * target; x.drawImage(spr.S, px, py, cw, spr.img); } x.globalAlpha = 1; }); };
    const SHARE_PAY = ADV / TERM / SHARE;   // the loan's monthly part as a share of the rent. It does not depend on how many robots or what they cost
    layout();
    if (still) { draw(1, 1); addEventListener('resize', () => { layout(); draw(1, 1); }); }
    else { draw(0, 0); new IntersectionObserver((es, io) => es.forEach(en => { if (en.isIntersecting) { io.disconnect(); const t0 = performance.now(), tick = t => { const e = t - t0, k = Math.min(1, e / 1000), p = Math.min(1, Math.max(0, (e - 1050) / 500)); draw(k, p * p * (3 - 2 * p)); if (p < 1) requestAnimationFrame(tick); else played = true; }; requestAnimationFrame(tick); } }), { threshold: .3 }).observe(mg);
      addEventListener('resize', () => { layout(); if (played) draw(1, 1); else draw(0, 0); }); }
    // the groups share the width as they share the robots, until the words under them would have no room
    const widths = () => { const a = N === 1 ? .5 : Math.max(.36, Math.min(.64, PAY / N)); mg.style.gridTemplateColumns = `minmax(0,${a}fr) minmax(0,${1 - a}fr)`; };
    followers.push(st => { N = st.n; rid = st.rid; PAY = Math.round(N * SHARE_PAY); if (N > 1 && PAY < 1) PAY = 1; const rent = rentOf(st.price), comes = N * rent, V = N * st.price, goes = V * ADV / TERM, left = comes - goes, one = N === 1;
      $('f-m-h').textContent = one ? "Before interest, about half of your robot's rent pays the loan." : 'Before interest, the rent from ' + PAY.toLocaleString('en-US') + ' of your ' + N.toLocaleString('en-US') + ' robots pays the loan.';
      $('f-m-lead').innerHTML = one ? 'In our example, <b class="num">' + usd(comes) + '</b> of rent comes in from your robot.' : 'In our example, <b class="num">' + usd(comes) + '</b> of rent comes in, ' + usd(rent) + ' from each robot.';
      $('f-m-go').textContent = usd(goes); $('f-m-left').textContent = usd(left); $('f-m-v').textContent = usd(V);
      $('f-m-gos').textContent = 'pays back the loan. ' + (one ? "That is about half of your robot's rent." : PAY === 1 ? 'That is about the rent from this 1 robot.' : 'That is about the rent from these ' + PAY.toLocaleString('en-US') + ' robots.');
      $('f-m-sr').textContent = one ? 'One robot. The part of its rent that pays the loan is drawn bright.' : N + ' robots. The rent from ' + PAY + ' of them, drawn bright, pays the loan. The rent from the other ' + (N - PAY) + ', drawn pale, stays with the company.';
      widths(); layout(); if (played || still) draw(1, 1); else draw(0, 0); });
  }
})();
