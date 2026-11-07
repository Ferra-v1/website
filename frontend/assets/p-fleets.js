// Robot companies page. Every section is one pinned screen, and FerraChain in site.js hands each to the next the way STORYBOARD.md plans it.
// The sentence's fields stay in range, and every change goes straight to the answer. Further down, the same sentence sets the robot that fills with rent and the one month of rent split between the loan and the company.
// Every "Ask what you could borrow" link on the page returns to the sentence. With reduced motion every section stands finished, in order.
(() => {
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p'), wh = document.getElementById('sz-when');
  if (!ty) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, $ = id => document.getElementById(id), usd = v => '$' + Math.round(v).toLocaleString('en-US');
  // the big figure stays on one line in its column whatever is typed: it steps down the same sizes the rest of the site uses
  const big = $('f-big'), cost = $('f-cost'), mine = $('f-own'), the = $('f-the'), sr = $('f-sr'), SIZES = ['fig-96', 'fig-64', 'fig-44'];
  const fitBig = () => { if (!big) return; for (const c of SIZES) { big.classList.remove(...SIZES); big.classList.add(c); if (big.scrollWidth <= big.parentElement.clientWidth + 1) return; } };
  let tick0, shownV = 6250000;
  const showMoney = V => { const lend = Math.round(V * .7), own = V - lend, one = val(n) === 1; big.textContent = usd(lend); fitBig(); cost.textContent = usd(V); mine.textContent = usd(own); the.textContent = one ? 'The robot costs' : 'The robots cost'; sr.textContent = 'You could borrow ' + usd(lend) + '. ' + the.textContent + ' ' + usd(V) + '. You pay ' + usd(own) + ' yourself.'; cancelAnimationFrame(tick0); if (still) { shownV = V; return; }
    const a = shownV, t0 = performance.now(), tick = t => { const k = Math.min(1, (t - t0) / 300), e = 1 - Math.pow(1 - k, 3); shownV = a + (V - a) * e; big.textContent = usd(k === 1 ? V * .7 : shownV * .7); if (k < 1) tick0 = requestAnimationFrame(tick); }; tick0 = requestAnimationFrame(tick); };
  const digits = el => el.value.replace(/[^0-9]/g, ''), lim = el => [+el.dataset.min, +el.dataset.max], clamp = (el, v) => { const [lo, hi] = lim(el); return Math.min(hi, Math.max(lo, v)); };
  const last = new Map([[n, 50], [p, 125000]]), val = el => last.get(el);   // the last good value of each field: an empty field keeps the answer where it was
  const comma = el => { el.value = (el === p ? '$' : '') + val(el).toLocaleString('en-US'); };
  // the range message: one line under the sentence for 4 seconds
  const msg = $('f-msg'); let mt;
  const say = el => { msg.textContent = el === n ? 'Between 1 and 1,000 robots' : 'Between $1,000 and $1,000,000'; msg.classList.add('on'); el.setAttribute('aria-invalid', 'true'); clearTimeout(mt); mt = setTimeout(() => { msg.classList.remove('on'); [n, p].forEach(x => x.removeAttribute('aria-invalid')); }, 4000); };
  // each pill in the sentence is as wide as its words, so the sentence reads as a sentence
  const widthOf = (el, text, extra) => { const m = document.createElement('span'), cs = getComputedStyle(el); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing + ';font-variant-numeric:lining-nums tabular-nums'; m.textContent = text; document.body.appendChild(m); el.style.width = Math.ceil(m.getBoundingClientRect().width + extra(cs)) + 'px'; m.remove(); };
  const pad = cs => parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 3;
  const fitSel = s => widthOf(s, s.selectedOptions[0] ? s.selectedOptions[0].textContent : '', pad), fitNum = el => widthOf(el, el.value || '0', pad);
  const fitAll = () => { [ty, wh].forEach(fitSel); [n, p].forEach(fitNum); };
  // one robot reads as one robot in the sentence
  const say1 = c => { [...ty.options].forEach(o => { o.textContent = c === 1 ? o.dataset.one : o.dataset.many; }); fitSel(ty); };
  // what happens further down when the sentence changes: filled in below
  const followers = [], state = () => ({ rid: ty.value, n: val(n), price: val(p) });
  let lastKey = '50|125000|arm';
  const upd = () => { const s = state(), key = [s.n, s.price, s.rid].join('|'); if (key === lastKey) return; lastKey = key; showMoney(s.n * s.price); say1(s.n); followers.forEach(f => f(s)); };
  [n, p].forEach(el => {
    el.addEventListener('input', () => { const d = digits(el); if (d !== el.value) el.value = d; fitNum(el); if (!d) return; const v = +d, [lo, hi] = lim(el);
      if (v > hi) { el.value = String(hi); last.set(el, hi); say(el); fitNum(el); }
      else if (v >= lo) { last.set(el, v); clearTimeout(mt); msg.classList.remove('on'); el.removeAttribute('aria-invalid'); }
      else return;   // below the floor while typing: the answer keeps its last good value until the field is left
      upd(); });
    el.addEventListener('focus', () => { el.value = digits(el); fitNum(el); el.select(); });
    el.addEventListener('blur', () => { const d = digits(el); if (!d || +d < lim(el)[0]) say(el); comma(el); fitNum(el); upd(); });
  });
  // a new type of robot brings its own typical price
  ty.addEventListener('change', () => { last.set(p, clamp(p, +ty.selectedOptions[0].dataset.price)); comma(p); fitSel(ty); fitNum(p); upd(); });
  wh.addEventListener('change', () => fitSel(wh));
  // site.js reads the fleet fields as plain numbers when the form is sent, so hand it digits for that moment
  const form = $('quote');
  document.addEventListener('submit', ev => { if (ev.target !== form) return; clearTimeout(mt); msg.classList.remove('on'); msg.textContent = ''; [n, p].forEach(x => { x.removeAttribute('aria-invalid'); x.value = String(val(x)); }); setTimeout(() => [n, p].forEach(comma), 0); }, true);
  comma(n); comma(p); fitAll(); fitBig();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitAll(); fitBig(); });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fitAll(); fitBig(); }, 150); });
  // once the request is in, the fields are gone, so their small lines go too
  const done = form.querySelector('.ldone'), used = form.querySelector('.f-used');
  new MutationObserver(() => { if (!done.hidden) { msg.hidden = true; used.hidden = true; } }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
  const toForm = smooth => { scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }); let tries = 0; const wait = () => { if (scrollY < 40 || ++tries > 240) n.focus({ preventScroll: true }); else requestAnimationFrame(wait); }; wait(); };   // the sentence is the first screen of the page. A faded screen cannot take focus, so the cursor goes there on arrival
  document.querySelectorAll('a[href="#quote"]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#quote'); toForm(!still); }));
  if (location.hash === '#quote') addEventListener('load', () => setTimeout(() => toForm(false), 60));
  // "Ask what you could borrow" opens email and company and turns into Send
  const open = $('f-open'), send = $('f-send'), who = $('f-who');
  open.addEventListener('click', () => { who.hidden = false; open.hidden = true; send.hidden = false; const em = who.querySelector('input[type=email]'); if (em) em.focus({ preventScroll: true }); });
  const mSec = document.querySelector('.f-month'), SHARE = +mSec.dataset.share, ADV = +mSec.dataset.adv, TERM = +mSec.dataset.term, rentOf = price => Math.max(1, Math.round(price * SHARE));
  // one robot earning its price back: as the page scrolls, one month of rent at a time, the dots fill from the base up. Each dot is an equal share of the robot's price
  const pb = document.querySelector('.f-pay-bot'), spriteOf = rid => (window.FERRA_DOTS || {})[rid + '-l'] || (window.FERRA_DOTS || {})['arm-l'];
  let setRent = () => {};
  if (pb && spriteOf('arm')) {
    let price = +pb.dataset.price, rent = +pb.dataset.rent, months = +pb.dataset.months, data = null, list = [], rows = 1, y0 = 0, rid0 = 'arm', lastP = 1;
    const load = rid => { data = spriteOf(rid); list = data.d.split(';').filter(Boolean).map(t => { const [cx, cy, L, A, , ed] = t.split(',').map(Number); return { cx, cy, s: (A / 100) * Math.min(1, .3 + .7 * Math.pow(L / 100, .9) + (ed / 100) * .35) }; });
      const ys = list.map(q => q.cy); y0 = Math.min(...ys); rows = Math.max(...ys) - y0 + 1; list.sort((a, b) => b.cy - a.cy || a.cx - b.cx); list.forEach((q, i) => { q.rank = i / list.length; }); };
    load('arm');
    const nEl = $('f-read-n'), sEl = $('f-read-s'), ctx = pb.getContext('2d');
    let W = 0, H = 0, pitch = 0, ox = 0, oy = 0, shown = -1;
    const size = () => { W = pb.clientWidth; H = pb.clientHeight || W * rows / data.w; const d = Math.min(2, devicePixelRatio || 1); pitch = Math.min(W / data.w, H / rows); ox = (W - pitch * data.w) / 2; oy = H - pitch * rows; pb.width = Math.round(W * d); pb.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); shown = -1; };
    const paint = m => { const share = Math.min(1, m * rent / price), on = new Path2D(), off = new Path2D();
      for (const q of list) { const r = Math.max(.5, pitch * .5 * Math.max(.34, q.s)), X = ox + (q.cx + .5) * pitch, Y = oy + (q.cy - y0 + .5) * pitch, path = q.rank < share ? on : off; path.moveTo(X + r, Y); path.arc(X, Y, r, 0, 6.2832); }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(40,71,206,.15)'; ctx.fill(off); ctx.fillStyle = '#2847ce'; ctx.fill(on); };
    const read = m => { nEl.textContent = usd(m * rent); sEl.textContent = m === 0 ? 'of rent on day one. You have paid ' + usd(price) + ' for the robot.' : m < months ? 'of rent after ' + m + (m === 1 ? ' month.' : ' months.') : 'of rent after ' + m + ' months. The robot has earned back its price.'; };
    const show = m => { if (m === shown) return; shown = m; paint(m); read(m); };
    const fix = () => { if (still) pb.style.height = pb.clientWidth * rows / data.w + 'px'; size(); show(Math.round(Math.min(1, lastP / .86) * months)); };
    setRent = p => { lastP = p; show(Math.round(Math.min(1, p / .86) * months)); };   // the fill takes 86% of the distance; the rest is the finished robot, held
    pb._fix = fix; addEventListener('resize', fix);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fix);
    followers.push(st => { price = st.price; rent = rentOf(price); months = Math.ceil(price / rent); if (st.rid !== rid0) { rid0 = st.rid; load(rid0); } $('f-w-p').textContent = usd(price); $('f-w-r').textContent = usd(rent); fix(); });
    requestAnimationFrame(fix);
  }
  // one month: the bar fills from the left as the page scrolls. With reduced motion it stands finished
  const bar = $('f-bar');
  const setBar = k => { bar.style.clipPath = `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`; };
  followers.push(st => { const N = st.n, one = N === 1, rent = rentOf(st.price), comes = N * rent, V = N * st.price, goes = V * ADV / TERM, left = comes - goes;
    mSec.style.setProperty('--pay', (goes / comes).toFixed(4));
    $('f-m-lead').innerHTML = 'In one month of our example, <b class="num">' + usd(comes) + '</b> of rent comes in' + (one ? ' from your robot.' : ', ' + usd(rent) + ' from each robot.');
    $('f-m-go').textContent = usd(goes); $('f-m-left').textContent = usd(left);
    bar.setAttribute('aria-label', 'Of ' + usd(comes) + ' of rent, ' + usd(goes) + ' pays back the loan and ' + usd(left) + ' stays with you.'); });
  // the cobalt band: six moving robots assemble, 300ms apart, as the band arrives. They pause off screen and carry on where they were
  const bots = [...document.querySelectorAll('.f-bot canvas')];
  let botsOn = false;
  const startBots = () => { if (botsOn || !window.FerraDots) return; botsOn = true; bots.forEach((c, i) => setTimeout(() => { c.classList.add('dotbot'); c._seen = 1; c._vis = true; FerraDots.draw(c); }, still ? 0 : i * 300)); };
  addEventListener('load', () => { if (window.FerraDots) bots.forEach(c => FerraDots.fetch(c)); });
  const botIo = new IntersectionObserver(es => es.forEach(en => { const c = en.target; if (!c._seen || !window.FerraDots) return; en.isIntersecting ? FerraDots.resume(c) : FerraDots.pause(c); }), { rootMargin: '80px' }); bots.forEach(c => botIo.observe(c));

  // ------------------------------------------------------------ the chain
  const page = document.querySelector('[data-page="fleets.html"]');
  if (still) { setRent(1); startBots(); return; }
  page.classList.add('sc-on'); setBar(0);
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  // a phone shortens every distance to 70%. These two scenes are only holds, and a hold stays what it is. Registered before the chain, so a resize sets them before it lays out
  const holds = [$('sc-hero'), $('sc-keep')], baseHold = holds.map(s => +s.dataset.hold), setHolds = () => holds.forEach((s, i) => { s.dataset.hold = Math.ceil(baseHold[i] / (innerWidth <= 720 ? .7 : 1)); });
  setHolds(); addEventListener('resize', setHolds);
  // white to ink gets a full 100vh (70vh on a phone) at an even rate: the chain in site.js does that for any fade between those two grounds
  const why = $('sc-why'), mon = $('sc-month');
  // the old words leave in the first 40% of a fade and the new ones arrive from 35% to 75%, so the two are never readable together and no frame stands empty. Runs just after the chain has drawn the frame
  const words = (s, then) => (p, top) => { if (then) then(p, top); queueMicrotask(() => { const l = s._l, y = -top, k = l.out === 'gf' ? clamp01((y - l.inH - l.over - l.hold) / l.outH) : 0, w = Math.min(clamp01((y / l.inH - .35) / .4), 1 - clamp01(k / .4));
    l.kids.forEach(c => { c.style.opacity = w.toFixed(3); }); }); };
  const relay = FerraChain({ runs: { 'sc-why': words(why, p => setRent(p)), 'sc-month': words(mon, p => setBar(clamp01(p * 130 / 100))), 'sc-fleet': words($('sc-fleet')) }, arrive: { 'sc-fleet': startBots }, after: () => { if (pb && pb._fix) pb._fix(); } });
  // the form opening changes the first screen's height
  new ResizeObserver(relay).observe(document.querySelector('.f-hero'));
})();
