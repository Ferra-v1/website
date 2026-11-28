// Robot companies page. No pinned scene: the robot that fills with rent plays once on arrival. Everything else sits in plain flow.
// The sentence's fields stay in range, and every change goes straight to the answer. Further down, the same sentence sets the robot that fills with rent and the one month of rent split between the loan and the company.
// Every "Ask what you could borrow" link on the page returns to the sentence. With reduced motion every section stands finished, in order.
(() => {
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p'), wh = document.getElementById('sz-when');
  if (!ty) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, $ = id => document.getElementById(id), usd = v => '$' + Math.round(v).toLocaleString('en-US');
  // the big figure stays on one line in its column whatever is typed: it steps down the same sizes the rest of the site uses
  const big = $('f-big'), cost = $('f-cost'), costL = $('f-cost-l'), own = $('f-own'), sr = $('f-sr'), SIZES = ['fig-96'];
  const fitBig = () => { if (!big) return; for (const c of SIZES) { big.classList.remove(...SIZES); big.classList.add(c); if (big.scrollWidth <= big.parentElement.clientWidth + 1) return; } };
  let tick0, shownV = 6250000;
  const showMoney = V => { const lend = Math.round(V * .7), mine = V - lend, one = val(n) === 1, line = (one ? 'The robot costs ' : 'The robots cost ') + usd(V) + '. You pay ' + usd(mine) + ' yourself.'; big.textContent = usd(lend); fitBig(); costL.textContent = one ? 'The robot costs' : 'The robots cost'; cost.textContent = usd(V); own.textContent = usd(mine); sr.textContent = 'You could borrow ' + usd(lend) + '. ' + line; cancelAnimationFrame(tick0); if (still) { shownV = V; return; }
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
  const each = $('f-each'), say1 = c => { [...ty.options].forEach(o => { o.textContent = c === 1 ? o.dataset.one : o.dataset.many; }); fitSel(ty); if (each) each.hidden = c === 1; };
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
  let rz, rzw = innerWidth; addEventListener('resize', () => { if (innerWidth === rzw) return; rzw = innerWidth; clearTimeout(rz); rz = setTimeout(() => { fitAll(); fitBig(); }, 150); });
  // once the request is in, the range message has nothing left to say
  const done = form.querySelector('.ldone');
  new MutationObserver(() => { if (!done.hidden) msg.hidden = true; }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
  const toForm = smooth => { const y = Math.max(0, Math.round(form.closest('section').getBoundingClientRect().top + scrollY)); scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' }); let tries = 0; const wait = () => { if (Math.abs(scrollY - y) < 40 || ++tries > 240) n.focus({ preventScroll: true }); else requestAnimationFrame(wait); }; wait(); };   // the sentence is the first screen of the page. A faded screen cannot take focus, so the cursor goes there on arrival
  document.querySelectorAll('a[href="#quote"]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#quote'); toForm(!still); }));
  if (location.hash === '#quote') addEventListener('load', () => setTimeout(() => toForm(false), 60));
  // "Ask what you could borrow" opens email and company and turns into Send
  const open = $('f-open'), send = $('f-send'), who = $('f-who');
  open.addEventListener('click', () => { who.hidden = false; open.hidden = true; send.hidden = false; const em = who.querySelector('input[type=email]'); if (em) em.focus({ preventScroll: true }); });
  const mSec = document.querySelector('.f-month'), SHARE = +mSec.dataset.share, ADV = +mSec.dataset.adv, TERM = +mSec.dataset.term, rentOf = price => Math.max(1, Math.round(price * SHARE));
  // the rent, one bar a month: as it arrives the bars fill one month at a time, and the figure beside them counts up. Each bar is one month's rent added to the last
  const rc = document.querySelector('.f-rc');
  let setRent = () => {};
  if (rc) {
    const bars = [...rc.querySelectorAll('.f-bars g')], nEl = $('f-read-n'), sEl = $('f-read-s');
    let price = +rc.dataset.price, rent = +rc.dataset.rent, months = +rc.dataset.months, lastP = 1, shown = -1;
    const read = m => { nEl.textContent = usd(m * rent); sEl.textContent = m === 0 ? 'of rent on day one. You have paid ' + usd(price) + ' for the robot.' : m < months ? 'of rent after ' + m + (m === 1 ? ' month.' : ' months.') : 'of rent after ' + m + ' months. The robot has earned back its price.'; };
    const show = m => { if (m === shown) return; shown = m; bars.forEach((b, i) => b.classList.toggle('on', i < m)); read(m); };
    setRent = k => { lastP = k; show(Math.round(Math.min(1, k / .86) * months)); };   // the fill takes 86% of the time; the rest is the finished row, held
    followers.push(st => { price = st.price; rent = rentOf(price); months = Math.ceil(price / rent); $('f-w-t').textContent = 'Say it costs ' + usd(price) + ' and rents for ' + usd(rent) + ' a month.'; $('f-pl-v').textContent = usd(price); $('f-rx').dataset.b = 'Month ' + months; shown = -1; setRent(lastP); });
  }
  // one month: the bar fills from the left as the page scrolls. With reduced motion it stands finished
  const bar = $('f-bar');
  const setBar = k => { bar.style.clipPath = `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`; };
  followers.push(st => { const N = st.n, one = N === 1, rent = rentOf(st.price), comes = N * rent, V = N * st.price, goes = V * ADV / TERM, left = comes - goes;
    mSec.style.setProperty('--pay', (goes / comes).toFixed(4));
    $('f-m-lead').textContent = 'One month of our example: ' + usd(comes) + ' of rent' + (one ? ' from your robot.' : ', ' + usd(rent) + ' from each robot.');
    const go100 = Math.round(goes / 100) * 100, left100 = comes - go100;   // the same rounding How it works prints
    $('f-m-go').textContent = usd(go100); $('f-m-left').textContent = usd(left100);
    bar.setAttribute('aria-label', 'Of ' + usd(comes) + ' of rent, ' + usd(go100) + ' pays back the loan and ' + usd(left100) + ' stays with you.'); });
  // the six moving robots: drawn while the row is still a screen away, so all six are finished as it arrives, when they come in together in 500ms (p-fleets.css). They pause off screen and carry on where they were
  const bots = [...document.querySelectorAll('.f-bot canvas')];
  let botsOn = false;
  const startBots = () => { if (botsOn || !window.FerraDots) return; botsOn = true; bots.forEach((c, i) => setTimeout(() => { c.classList.add('dotbot'); c._seen = 1; c._vis = true; FerraDots.draw(c); }, i * 60)); };   // one robot every 60ms, so a slow phone never pays for the whole yard in one frame
  addEventListener('load', () => { if (window.FerraDots) bots.forEach(c => FerraDots.fetch(c)); });
  const botIo = new IntersectionObserver(es => es.forEach(en => { const c = en.target; if (!c._seen || !window.FerraDots) return; en.isIntersecting ? FerraDots.resume(c) : FerraDots.pause(c); }), { rootMargin: '80px' }); bots.forEach(c => botIo.observe(c));

  // ------------------------------------------------------------ the one pinned scene, and the things that start on arrival
  const page = document.querySelector('[data-page="fleets.html"]');
  const arrive = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; arrive.unobserve(en.target); if (en.target === bar.nextElementSibling) setBar(1); else { startBots(); en.target.classList.add('on'); } }), { threshold: .2 });
  if (still) { setRent(1); startBots(); return; }
  page.classList.add('f-live'); setBar(0); arrive.observe(bar.nextElementSibling); arrive.observe(document.querySelector('.f-yard'));
  const near = new IntersectionObserver(es => { if (es.some(en => en.isIntersecting)) { near.disconnect(); startBots(); } }, { rootMargin: '0px 0px 100% 0px' }); near.observe(document.querySelector('.f-yard'));
  // no pinned scene (sand build): the robot fills once, over 1.4s, when most of it is on screen, then stands full. A reader who stops scrolling never sees it caught half way for long
  const runEl = $('sc-why'); setRent(0);
  const fillIo = new IntersectionObserver(es => { if (!es.some(en => en.isIntersecting)) return; fillIo.disconnect(); const t0 = performance.now(), D = 1400 / .86;
    const step = t => { const k = Math.min(1, (t - t0) / D); setRent(k); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, { threshold: .45 });
  fillIo.observe(rc || runEl);
})();
