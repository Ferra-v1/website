(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
  // hero sequence starts once the hero image has loaded
  const hero = document.querySelector('.hero');
  if (hero) { const imgs = [...hero.querySelectorAll('.bot img')]; let done = false; const go = () => { if (!done) { done = true; requestAnimationFrame(() => hero.classList.add('ready')); } };
    Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.addEventListener('load', r); i.addEventListener('error', r); }))).then(go); setTimeout(go, 2500); }
  // reveal on scroll, and charts and bars that draw when they arrive
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } }), { threshold: .18, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv,.lossbox,.dia,.chartcard').forEach(el => reduce ? el.classList.add('in-view') : io.observe(el));
  // counters run on a timer once visible and always rest on the real figure
  const cio = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; cio.unobserve(en.target); const el = en.target, end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', pre = el.dataset.prefix || '', dec = (el.dataset.count.split('.')[1] || '').length;
    const show = v => el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf; if (reduce) return show(end); const t0 = performance.now(), D = 1200;
    const tick = t => { const p = Math.min(1, (t - t0) / D), k = 1 - Math.pow(1 - p, 3); show(end * k); if (p < 1) requestAnimationFrame(tick); else show(end); }; requestAnimationFrame(tick); }), { threshold: .6 });
  document.querySelectorAll('[data-count]').forEach(el => el.closest('.hero') ? null : cio.observe(el));
  // how it works: steps highlight the matching rows of the term sheet, and advance on their own until touched
  const steps = [...document.querySelectorAll('.step')], live = document.querySelector('.sheet.live,.h-tk.live');
  if (steps.length && live) { let i = 0, auto = !reduce, timer;
    const set = k => { i = k; steps.forEach((s, j) => s.classList.toggle('on', j === k)); const rows = (steps[k].dataset.rows || '').split(',').filter(Boolean); live.querySelectorAll('.dr').forEach(r => r.classList.toggle('hl', rows.includes(r.dataset.row))); };
    steps.forEach((s, k) => s.addEventListener('click', () => { auto = false; clearInterval(timer); set(k); })); set(0);
    if (auto) timer = setInterval(() => set((i + 1) % steps.length), 3600); }
  // fleet sizer
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p');
  if (ty && document.getElementById('o-v')) { const upd = () => { const N = Math.max(0, +n.value || 0), P = Math.max(0, +p.value || 0), V = N * P; document.getElementById('o-v').textContent = fmt(V); document.getElementById('o-l').textContent = fmt(V * .7); document.getElementById('o-f').textContent = fmt(V * .7 * .015); };
    ty.addEventListener('change', () => { p.value = ty.selectedOptions[0].dataset.price; upd(); }); n.addEventListener('input', upd); p.addEventListener('input', upd); upd(); }
  // price report: robot type picker and the year table
  const chips = [...document.querySelectorAll('.chip')];
  if (chips.length && document.getElementById('pr-name')) { const curve = [0, 1, 2, 3, 4, 5, 6].map(y => Math.exp(-Math.pow(12 * y / 42, 1.2)));
    const pick = c => { chips.forEach(x => x.classList.toggle('on', x === c)); const t = c.dataset.type, price = +c.dataset.price; document.querySelectorAll('.pchart').forEach(d => { d.hidden = d.dataset.type !== t; const s = d.querySelector('.chart'); s.classList.remove('drawn'); if (!d.hidden) requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('drawn'))); });
      document.getElementById('pr-name').textContent = c.dataset.name; document.getElementById('pr-table').innerHTML = '<tr><td>Year</td><td>Example resale value</td></tr>' + curve.map((k, y) => `<tr><td>Year ${y}</td><td>${fmt(Math.round(price * k / 100) * 100)}</td></tr>`).join(''); };
    chips.forEach(c => c.addEventListener('click', () => { pick(c); history.replaceState(null, '', '#' + c.dataset.type); }));
    pick(chips.find(c => c.dataset.type === location.hash.slice(1)) || chips[0]); }
  // waitlist forms stay on the page
  // lead forms: insert-only into Supabase (row level security blocks reads with this public key)
  const SB = 'https://ybgspxfnjkehjskhrpne.supabase.co/rest/v1/leads', KEY = 'sb_publishable_256LqgO7hWqqhz2ZBvDLhQ_VsXwNgq3';
  const COUNT = { '1 to 10': 10, '11 to 50': 50, '51 to 200': 200, 'More than 200': 201 };
  const utm = (() => { const q = new URLSearchParams(location.search), o = {}; q.forEach((v, k) => { if (k.startsWith('utm_')) o[k] = v.slice(0, 120); }); return Object.keys(o).length ? o : null; })();
  document.addEventListener('input', ev => { if (ev.target.getAttribute && ev.target.getAttribute('aria-invalid') === 'true' && ev.target.value.trim()) ev.target.setAttribute('aria-invalid', 'false'); });
  document.querySelectorAll('form.lead').forEach(f => f.addEventListener('submit', async ev => {
    ev.preventDefault(); const err = f.querySelector('.lerr'), btn = f.querySelector('button[type=submit]'); err.hidden = true;
    const isBad = el => !el.value.trim() || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
    const req = [...f.querySelectorAll('[required]')]; req.forEach(el => el.setAttribute('aria-invalid', isBad(el)));
    const bads = req.filter(isBad), bad = bads[0];
    if (bad) { const name = el => el.closest('label').querySelector('span').textContent.toLowerCase();
      err.textContent = bad.type === 'email' && bad.value.trim() ? 'Enter a full work email, like name@company.com.' : 'Please fill in ' + (bads.length > 1 ? bads.slice(0, -1).map(name).join(', ') + ' and ' + name(bads[bads.length - 1]) : name(bad)) + '.'; err.hidden = false; bad.focus(); return; }
    const done = () => { f.querySelector('.lf').hidden = true; f.querySelector('.la').hidden = true; f.querySelector('.ldone').hidden = false; };
    if (f.website.value) return done();   // decoy field filled: a bot
    const v = n => (f.elements[n] ? f.elements[n].value.trim() : '') || null;
    const row = { kind: f.dataset.kind, email: v('email'), company: v('company'), role: v('role'), timeline: v('timeline'), check_size: v('check_size'), message: v('message'), page: location.pathname + '#' + f.dataset.who, utm };
    if (v('robot_count')) row.robot_count = COUNT[v('robot_count')];
    const ty = document.getElementById('sz-type');
    if (ty && f.dataset.who === 'fleets') { row.robot_type = ty.selectedOptions[0].textContent; row.robot_count = +document.getElementById('sz-n').value || null; row.price_per_robot = +document.getElementById('sz-p').value || null; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending';
    try { const r = await fetch(SB, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) }); if (!r.ok) throw r.status; done(); }
    catch (x) { err.textContent = 'That did not go through. Please try again in a moment.'; err.hidden = false; btn.disabled = false; btn.textContent = label; }
  }));
  // the floating bar: out of the way while reading, back as soon as the reader scrolls up, and gone again near the top where the page's own nav sits
  const fbar = document.querySelector('.fbar');
  if (fbar) { let last = scrollY, on = false; addEventListener('scroll', () => { const y = scrollY, d = y - last; if (Math.abs(d) < 6) return; last = y; const v = d < 0 && y > 240; if (v !== on) { on = v; fbar.classList.toggle('on', v); } }, { passive: true }); }
  // one soft pill slides between the nav links under the pointer
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) document.querySelectorAll('.links').forEach(w => { const h = w.querySelector('.lhl'); if (!h) return;
    w.querySelectorAll(':scope > a, :scope > .lk > a').forEach(a => a.addEventListener('pointerenter', () => { const first = !h.classList.contains('on'); if (first) h.style.transition = 'none'; h.style.width = a.offsetWidth + 'px'; h.style.transform = `translateX(${a.getBoundingClientRect().left - w.getBoundingClientRect().left}px)`; if (first) { h.getBoundingClientRect(); h.style.transition = ''; } h.classList.add('on'); }));
    w.addEventListener('pointerleave', () => h.classList.remove('on')); });
  // phone menu: full screen, the page behind it inert, Escape or any link closes it, focus goes back where it was
  const mn = document.getElementById('mn');
  if (mn) { let back = null; const btns = document.querySelectorAll('.menu'), pg = document.querySelector('.page');
    const set = o => { mn.hidden = !o; document.documentElement.classList.toggle('mn-open', o); if (pg) pg.inert = o; if (fbar) fbar.inert = o; btns.forEach(b => b.setAttribute('aria-expanded', o));
      if (o) { back = document.activeElement; mn.querySelector('.mn-x').focus({ preventScroll: true }); } else if (back && back.focus) back.focus({ preventScroll: true }); };
    btns.forEach(b => b.addEventListener('click', () => set(true))); mn.querySelector('.mn-x').addEventListener('click', () => set(false)); mn.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', ev => { if (ev.key === 'Escape' && !mn.hidden) set(false); }); matchMedia('(min-width: 961px)').addEventListener('change', ev => { if (ev.matches && !mn.hidden) set(false); }); }
})();
