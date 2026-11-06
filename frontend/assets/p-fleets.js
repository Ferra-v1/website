// Robot companies page: the quote form's four robot fields stay in range and every change turns into the outcome beside them:
// what you could borrow, what you would pay, the robot you picked, and one dot for each robot you typed. All drawn here.
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
      const put = i => { x.beginPath(); x.arc(W - (i % cols + .5) * P, H - (Math.floor(i / cols) + .5) * P, P * .34, 0, 6.2832); x.fill(); };
      const me = ++tok, from = animate && !still ? Math.min(had, count) : count, t0 = performance.now(), D = had ? 260 : 700; had = count;
      for (let i = 0; i < from; i++) put(i);
      let done = from; if (from < count) { const tick = t => { if (me !== tok) return; const end = Math.min(count, from + Math.ceil((count - from) * Math.min(1, (t - t0) / D))); while (done < end) put(done++); if (done < count) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
    }; })();
  // the big figure stays on one line in its column whatever is typed: its size comes from the width of the answer it is about to show
  const big = document.getElementById('f-big'), pay = document.getElementById('f-pay'), COL = big && big.parentElement;
  const fitBig = text => { if (!big) return; big.style.fontSize = ''; const cs = getComputedStyle(big), max = parseFloat(cs.fontSize), m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing + ';font-size:' + max + 'px;font-variant-numeric:lining-nums tabular-nums'; m.textContent = text; document.body.appendChild(m); const w = m.getBoundingClientRect().width; m.remove(); const room = COL.clientWidth; if (w > room) big.style.fontSize = Math.floor(max * room / w) + 'px'; };
  let tick0, shownV = 6250000;
  const fmtBig = v => '$' + Math.round(v).toLocaleString('en-US');
  const sr = document.getElementById('f-sr');
  const showMoney = V => { fitBig(fmtBig(V * .7)); pay.textContent = fmtBig(V); if (sr) sr.textContent = 'You could borrow ' + fmtBig(V * .7) + '. You would pay ' + fmtBig(V) + '.'; cancelAnimationFrame(tick0); if (still) { shownV = V; big.textContent = fmtBig(V * .7); return; }
    const a = shownV, t0 = performance.now(), tick = t => { const k = Math.min(1, (t - t0) / 300), e = 1 - Math.pow(1 - k, 3); shownV = a + (V - a) * e; big.textContent = fmtBig(k === 1 ? V * .7 : shownV * .7); if (k < 1) tick0 = requestAnimationFrame(tick); }; tick0 = requestAnimationFrame(tick); };
  const digits = el => el.value.replace(/[^0-9]/g, '');
  const lim = el => [+el.dataset.min, +el.dataset.max];
  const clamp = (el, v) => { const [lo, hi] = lim(el); return Math.min(hi, Math.max(lo, v)); };
  const last = new Map([[n, 50], [p, 125000]]);   // the last good value of each field: an empty field keeps the preview where it was
  const val = el => last.get(el);
  const comma = el => { el.value = val(el).toLocaleString('en-US'); };
  // the range message: one line under the fields for 4 seconds
  const msg = document.getElementById('f-msg'); let mt;
  const say = el => { if (!msg) return; msg.textContent = el === n ? 'Up to 1,000 robots' : 'Between $1,000 and $1,000,000'; msg.classList.add('on'); el.setAttribute('aria-invalid', 'true');
    clearTimeout(mt); mt = setTimeout(() => { msg.classList.remove('on'); [n, p].forEach(x => x.removeAttribute('aria-invalid')); }, 4000); };
  // one robot reads as one robot, in the sentence and under the dots
  const say1 = c => { [...ty.options].forEach(o => { o.textContent = c === 1 ? o.dataset.one : o.dataset.many; }); if (dotsay) dotsay.textContent = c === 1 ? 'This dot is your one robot.' : 'Each dot is one of your ' + c.toLocaleString('en-US') + ' robots.'; if (pile) pile.setAttribute('aria-label', c === 1 ? 'One dot for one robot' : c.toLocaleString('en-US') + ' dots, one for each robot'); if (fitReady) fitSel(ty); };
  let fitReady = false;
  // every valid change goes straight to the answer; it counts and redraws in 300ms
  const state = () => ({ rid: ty.value, n: val(n), price: val(p), when: wh ? wh.value : 'Within 3 months' });
  let lastKey = '';
  const upd = () => {
    const s = state(), key = [s.rid, s.n, s.price, s.when].join('|');
    if (key === lastKey) return; lastKey = key;
    drawPile(s.n, true); showMoney(s.n * s.price); say1(s.n);
  };
  lastKey = [ty.value, 50, 125000, wh ? wh.value : ''].join('|');   // the page is built on these defaults
  [n, p].forEach(el => {
    el.addEventListener('input', () => {
      const d = digits(el); if (d !== el.value) el.value = d;
      if (!d) return;   // empty: keep the last preview, no message until the field is left
      const v = +d, [lo, hi] = lim(el);
      if (v > hi) { el.value = String(hi); last.set(el, hi); say(el); }   // above the top: clamp now and write it back
      else last.set(el, Math.max(lo, v));   // below the floor while typing (a price is typed from its first digit): settle on blur
      upd();
    });
    el.addEventListener('focus', () => { el.value = digits(el); el.select(); });
    el.addEventListener('blur', () => {
      const d = digits(el);
      if (d) { const v = +d, c = clamp(el, v); if (c !== v) say(el); last.set(el, c); }
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
  // every "Get a quote" link on this page returns to the form and puts the cursor in the robot type field
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
  // the second half of the form: "Get a quote" opens email and company and turns into Send
  const open = document.getElementById('f-open'), send = document.getElementById('f-send'), who = document.getElementById('f-who');
  const reveal = () => { if (!who || !who.hidden) return; who.hidden = false; open.hidden = true; send.hidden = false; const em = who.querySelector('input[type=email]'); if (em) em.focus({ preventScroll: true }); };
  if (open) open.addEventListener('click', reveal);
  // each robot in the row picks itself in the form on the way back up
  document.querySelectorAll('[data-pick]').forEach(a => a.addEventListener('click', () => { if ([...ty.options].some(o => o.value === a.dataset.pick)) { ty.value = a.dataset.pick; ty.dispatchEvent(new Event('change')); } }));
  // from hello to money: the robot on the line follows the page, stopping over each step
  const tw = document.querySelector('.f-tlw'), run = tw && tw.querySelector('.f-runner');
  if (run) {
    const stops = 4, ease = t => t * t * (3 - 2 * t);
    const place = () => { const r = tw.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -100 || r.top > vh + 100) return;
      const p = Math.min(1, Math.max(0, (vh * .86 - r.top) / (vh * .62))), wide = matchMedia('(min-width: 821px)').matches;
      const span = wide ? tw.clientWidth * (stops - 1) / stops + 6 : tw.clientWidth - run.offsetWidth;
      // on wide screens it rests over each of the four steps in turn; on a phone it just crosses the line
      const seg = p * (stops - 1), i = Math.min(stops - 2, Math.floor(seg)), f = seg - i, at = wide ? (i + ease(Math.min(1, f * 1.25))) / (stops - 1) : p;
      run.style.transform = `translate3d(${(at * span).toFixed(1)}px,0,0)`; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) run.style.transform = 'translate3d(' + (tw.clientWidth - run.offsetWidth) + 'px,0,0)';
    else { addEventListener('scroll', place, { passive: true }); addEventListener('resize', place); place(); }
  }
})();
