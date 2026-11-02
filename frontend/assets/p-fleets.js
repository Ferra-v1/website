// Fleets page: the quote form's four fleet fields stay in range and every change turns into the outcome beside them,
// "Your fleet loan, as you type" (core.fleet_preview, driven by FerraApp.preview in site.js). The closing band's button
// brings the visitor back to the form with the robot type field focused.
(() => {
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p'), wh = document.getElementById('sz-when');
  if (!ty) return;
  const pv = document.getElementById('fp-fleets');
  const fmt = v => '$' + Math.round(v).toLocaleString('en-US');
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
  // every valid change goes straight to the preview; it counts and redraws in 300ms
  const state = () => ({ rid: ty.value, n: val(n), price: val(p), when: wh ? wh.value : 'Within 3 months' });
  let lastKey = '';
  const upd = () => {
    const s = state(), key = [s.rid, s.n, s.price, s.when].join('|');
    if (key === lastKey) return; lastKey = key;
    // the four figures share one row; fleets worth $10,000,000 or more set them smaller so a long figure never runs into the next
    const FV = s.n * s.price, pw = pv && pv.closest('.f-pv'); if (pw) pw.dataset.big = FV >= 1e8 ? '2' : FV >= 1e7 ? '1' : '0';
    if (pv && window.FerraApp && window.FerraApp.preview) return window.FerraApp.preview(pv, s);
    // shared preview script not loaded yet: keep the four figures and the funding window honest
    if (!pv) return;
    const V = s.n * s.price, f = pv.querySelectorAll('.fp-k dd');
    [fmt(V), fmt(V * .7), fmt(V * .3), Math.abs(V * .7 * .015 - 65625) < .5 ? '$65,625' : '$' + (Math.floor(V * .7 * .015 / 100 + .5) * 100).toLocaleString('en-US')].forEach((t, i) => { if (f[i]) f[i].textContent = t; });
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
  ty.addEventListener('change', () => { last.set(p, clamp(p, +ty.selectedOptions[0].dataset.price)); comma(p); upd(); });
  if (wh) wh.addEventListener('change', upd);
  // site.js reads the fleet fields as plain numbers when the form submits, so hand it digits for that moment
  const form = document.getElementById('quote');
  document.addEventListener('submit', ev => {
    if (ev.target !== form) return;
    [n, p].forEach(el => { el.value = String(val(el)); });
    setTimeout(() => [n, p].forEach(comma), 0);
  }, true);
  comma(n); comma(p);
  // once the request is in, the preview stays and its path moves on: Request done, Priced next
  const done = form && form.querySelector('.ldone');
  if (done && pv) new MutationObserver(() => {
    if (done.hidden) return;
    const li = pv.querySelectorAll('.fp-path li');
    if (li[0]) li[0].classList.add('on');
    if (li[1] && !li[1].querySelector('.f-next')) { li[1].classList.add('on'); li[1].insertAdjacentHTML('beforeend', '<small class="f-next">Next</small>'); }
    pv.classList.add('sent');
  }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
  // every "Request a fleet quote" link on this page returns to the form and puts the cursor in the robot type field
  // wide screens: the whole hero (fields and preview) fits, so return to its top; phones: to the first field
  const toForm = smooth => { const wide = matchMedia('(min-width: 901px)').matches, el = wide ? document.querySelector('.f-hero') : (form || ty), nav = document.querySelector('.nav'), nh = nav ? nav.getBoundingClientRect().height : 0, top = Math.max(0, el.getBoundingClientRect().top + scrollY - (wide ? nh - 24 : nh + 24)); scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }); ty.focus({ preventScroll: true }); };
  document.querySelectorAll('a[href="#quote"]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#quote'); toForm(!matchMedia('(prefers-reduced-motion: reduce)').matches); }));
  if (location.hash === '#quote') addEventListener('load', () => setTimeout(() => toForm(false), 60));
  // fit the preview's dot fleet to its panel: 10 across with each robot as large as the panel allows (up to 46px), so the robots
  // read as robots and the grid never runs past the panel on a phone. Wide screens keep room for the "+N" label beside the grid.
  const fitFleet = () => {
    const A = window.FerraApp; if (!pv || !pv._p || !A || !A.units) return;
    const cv = pv.querySelector('.fp-units'), wrap = pv.querySelector('.fp-fleet'); if (!cv || !wrap) return;
    const wide = matchMedia('(min-width: 721px)').matches, gap = 3, avail = wrap.clientWidth - (wide ? 56 : 0);
    const cell = Math.max(20, Math.min(46, Math.floor((avail - 9 * gap) / 10)));
    const old = pv._p.st, cfg = pv._p.cfg; if (old && old.cell === cell && old._fit) return;
    if (old) old.tok = -1;   // stops a robot arrival still running on the old grid
    const shown = Math.min(cfg.n, 50), st = A.units(cv, { rid: cfg.rid, n: cfg.n, max: 50, cell, gap, rows: 5, priced: shown });
    st._fit = 1; pv._p.st = st;
  };
  fitFleet();
  let fz; addEventListener('resize', () => { clearTimeout(fz); fz = setTimeout(() => { if (pv && pv._p && pv._p.st) pv._p.st._fit = 0; fitFleet(); }, 220); });
  // the timeline drive plays once; afterwards hold the final frame as plain styles
  const tw = document.querySelector('.f-tlw'), run = tw && tw.querySelector('.f-runner');
  if (run) run.addEventListener('animationend', () => tw.classList.add('done'));
})();
