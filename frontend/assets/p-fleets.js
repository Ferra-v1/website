// Robot companies page: the sentence's fields stay in range, and every change goes straight to the answer: what you could borrow, what the robots cost, what you pay yourself, the robot you picked.
// Further down, the same sentence sets one month of rent: one small robot for each of the reader's robots, in two groups, the ones whose rent pays the loan and the ones whose rent stays.
// Every "Ask what you could borrow" link on the page returns to the sentence.
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
  // the robot you picked stands beside the sentence, and a new type of robot brings its own typical price
  const pic = $('f-robot'), fig = pic && pic.parentElement;
  const swapPic = () => { const o = ty.selectedOptions[0], w = +o.dataset.w, one = o.dataset.one; pic.src = 'media/robots/' + o.dataset.pic + '.webp'; pic.width = w; pic.alt = ''; fig.classList.toggle('wide', w > 1200); };
  ty.addEventListener('change', () => { last.set(p, clamp(p, +ty.selectedOptions[0].dataset.price)); comma(p); swapPic(); fitSel(ty); fitNum(p); upd(); });
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
  const toForm = smooth => { const top = Math.max(0, form.getBoundingClientRect().top + scrollY - 100); scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }); n.focus({ preventScroll: true }); };
  document.querySelectorAll('a[href="#quote"]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#quote'); toForm(!still); }));
  if (location.hash === '#quote') addEventListener('load', () => setTimeout(() => toForm(false), 60));
  // "Ask what you could borrow" opens email and company and turns into Send
  const open = $('f-open'), send = $('f-send'), who = $('f-who');
  open.addEventListener('click', () => { who.hidden = false; open.hidden = true; send.hidden = false; const em = who.querySelector('input[type=email]'); if (em) em.focus({ preventScroll: true }); });
  const mSec = document.querySelector('.f-month'), SHARE = +mSec.dataset.share, ADV = +mSec.dataset.adv, TERM = +mSec.dataset.term, rentOf = price => Math.max(1, Math.round(price * SHARE));
  // the link keeps the reader's numbers where the price tool knows the robot; for the rest it opens the tool as it is
  const TOOL = { arm: 'any-arm', cobot: 'any-arm', amr: 'warehouse-mobile-robot', cleaning: 'cleaning-robot' }, bring = $('f-bring');
  followers.push(st => { const id = TOOL[st.rid]; bring.href = id ? 'price.html#r=' + id + '&y=2026&p=' + st.price + '&m=' + rentOf(st.price) + '&n=36&f=' + st.n : 'price.html'; $('f-w-p').textContent = usd(st.price); $('f-w-r').textContent = usd(rentOf(st.price)); $('f-w-m').textContent = Math.ceil(st.price / rentOf(st.price)); });
  // one month. When the section first arrives each robot's rent comes in, left to right, then the two groups part. With reduced motion they stand finished.
  const mg = mSec.querySelector('.f-mg'), mc = [...mg.querySelectorAll('.f-mbots')], SHARE_PAY = ADV / TERM / SHARE;   // the loan's monthly part as a share of the rent: it does not depend on how many robots or what they cost
  let N = 50, PAY = 27, played = false, cw = 0, ch = 0, spr = null, src = null, srcName = '';
  const loadPic = name => { if (name === srcName) return; srcName = name; const i = new Image(); i.onload = () => { if (srcName === name) { src = i; layout(); draw(played || still ? 1 : 0, played || still ? 1 : 0); } }; i.src = 'media/robots/' + name + '.webp'; };
  // the picture at the size it is drawn, halved down from the full size so small robots stay sharp
  const sprite = (w, h) => { const d = Math.min(2, devicePixelRatio || 1), tw = Math.max(1, Math.round(w * d)), th = Math.max(1, Math.round(h * d)); let c = src, cwi = src.width, chi = src.height; while (cwi > tw * 2 && chi > th * 2) { const nx = document.createElement('canvas'); nx.width = Math.ceil(cwi / 2); nx.height = Math.ceil(chi / 2); const g = nx.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, nx.width, nx.height); c = nx; cwi = nx.width; chi = nx.height; } const out = document.createElement('canvas'); out.width = tw; out.height = th; const g = out.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, tw, th); return out; };
  // one robot size for both groups: the largest that fits both within the height a screen can spare
  const layout = () => { if (!src) return; const stacked = matchMedia('(max-width:820px)').matches, maxH = stacked ? Math.min(300, innerHeight * .34) : Math.min(380, innerHeight * .42), keep = N - PAY, asp = src.width / src.height, gapX = 1.14, gapY = 1.1;
    let h = 170; const cellW = () => Math.max(6, h * asp * gapX), fits = (m, W) => { if (!m) return true; const c = Math.max(1, Math.floor(W / cellW())); return Math.ceil(m / c) * h * gapY <= maxH; };
    while (h > 7 && !(fits(PAY, mc[0].clientWidth) && fits(keep, mc[1].clientWidth))) h -= 1;
    ch = h; cw = h * asp; spr = sprite(cw, ch); const d = Math.min(2, devicePixelRatio || 1);
    mc.forEach((c, gi) => { const m = N === 1 ? (gi ? 0 : 1) : gi ? keep : PAY, cols = Math.max(1, Math.floor(c.clientWidth / cellW())), rows = Math.ceil(m / cols), H = Math.ceil(rows * h * gapY); c._m = m; c._c = cols; c._from = gi ? PAY : 0; c._p = cellW(); c.style.height = H + 'px'; c.width = Math.round(c.clientWidth * d); c.height = Math.round(H * d); }); };
  // k runs 0 to 1: how far the rent has come in; part runs 0 to 1: how far the two groups have turned into bright and pale
  const draw = (k, part) => { if (!spr) return; const d = Math.min(2, devicePixelRatio || 1); mc.forEach((c, gi) => { const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, c.clientWidth, c.clientHeight);
    for (let i = 0; i < c._m; i++) { const a = Math.min(1, Math.max(0, (k * (N + 6) - (c._from + i)) / 6)), target = gi ? 1 - .66 * part : 1, px = (i % c._c) * c._p, py = Math.floor(i / c._c) * ch * 1.1;
      if (N === 1) { const cut = py + ch * (1 - SHARE_PAY); x.globalAlpha = .34; x.drawImage(spr, px, py, cw, ch); x.save(); x.beginPath(); x.rect(px, cut, cw, ch); x.clip(); x.globalAlpha = 1; x.drawImage(spr, px, py, cw, ch); x.restore(); continue; }
      x.globalAlpha = (.12 + .88 * a) * target; x.drawImage(spr, px, py, cw, ch); } x.globalAlpha = 1; }); };
  addEventListener('resize', () => { layout(); draw(played || still ? 1 : 0, played || still ? 1 : 0); });
  if (still) played = true;
  else new IntersectionObserver((es, io) => es.forEach(en => { if (en.isIntersecting) { io.disconnect(); const t0 = performance.now(), tick = t => { const e = t - t0, k = Math.min(1, e / 1100), q = Math.min(1, Math.max(0, (e - 1150) / 500)); draw(k, q * q * (3 - 2 * q)); if (q < 1) requestAnimationFrame(tick); else played = true; }; requestAnimationFrame(tick); } }), { threshold: .3 }).observe(mg);
  new IntersectionObserver((es, io) => es.forEach(en => { if (en.isIntersecting) { io.disconnect(); loadPic(ty.selectedOptions[0].dataset.pic); } }), { rootMargin: '1200px' }).observe(mSec);
  const widths = () => { const a = N === 1 ? .5 : Math.max(.36, Math.min(.64, PAY / N)); mg.style.gridTemplateColumns = `minmax(0,${a}fr) minmax(0,${1 - a}fr)`; };
  followers.push(st => { N = st.n; PAY = Math.round(N * SHARE_PAY); if (N > 1 && PAY < 1) PAY = 1; const rent = rentOf(st.price), comes = N * rent, V = N * st.price, goes = V * ADV / TERM, left = comes - goes, one = N === 1;
    $('f-m-h').textContent = one ? "Before interest, about half of your robot's rent pays the loan." : 'Before interest, the rent from ' + PAY.toLocaleString('en-US') + ' of your ' + N.toLocaleString('en-US') + ' robots pays the loan.';
    $('f-m-lead').innerHTML = 'In one month of our example, <b class="num">' + usd(comes) + '</b> of rent comes in' + (one ? ' from your robot.' : ', ' + usd(rent) + ' from each robot.');
    $('f-m-go').textContent = usd(goes); $('f-m-left').textContent = usd(left); $('f-m-v').textContent = usd(V);
    $('f-m-gos').textContent = 'pays back the loan. ' + (one ? "That is about half of your robot's rent." : PAY === 1 ? 'That is about the rent from this 1 robot.' : 'That is about the rent from these ' + PAY.toLocaleString('en-US') + ' robots.');
    $('f-m-sr').textContent = one ? 'One robot. The part of its rent that pays the loan is drawn bright.' : N + ' robots. The rent from ' + PAY + ' of them, drawn bright, pays the loan. The rent from the other ' + (N - PAY) + ', drawn pale, stays with the company.';
    widths(); const name = ty.selectedOptions[0].dataset.pic; if (name !== srcName) loadPic(name); else { layout(); draw(played ? 1 : 0, played ? 1 : 0); } });
})();
