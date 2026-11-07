(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
  // reduced motion gets a finished still: no video plays on its own
  if (reduce) document.querySelectorAll('video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
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
  // the bar comes back as soon as the reader scrolls up, and goes again near the top where the page's own bar sits
  const fbar = document.querySelector('.fbar');
  if (fbar) { let last = scrollY, on = false; addEventListener('scroll', () => { const y = scrollY, d = y - last; if (Math.abs(d) < 6) return; last = y; const v = d < 0 && y > 240; if (v !== on) { on = v; fbar.classList.toggle('on', v); if (!v && fbar.classList.contains('np-on')) closePanel(); } }, { passive: true }); }
  // the nav's panels: open on hover and on keyboard focus, close on Escape, on leaving, and after a 300ms grace. There is one layer, under whichever bar opened it.
  const np = document.getElementById('np'); let npCur = null, npBar = null, npItem = null, npTimer = 0, npIn = 0, npBack = false;
  const closePanel = () => { clearTimeout(npTimer); if (!np || !npCur) return; npCur = null; np.classList.remove('on'); if (npBar) npBar.classList.remove('np-on'); if (npItem) { npItem.classList.remove('open'); npItem.querySelector('a').setAttribute('aria-expanded', 'false'); } npBar = npItem = null;
    cancelAnimationFrame(npIn); const close = () => { if (npCur) return; np.hidden = true; np.querySelectorAll('.np-p').forEach(p => { p.hidden = true; }); }; if (reduce) close(); else setTimeout(close, 260); };
  const openPanel = item => { if (!np) return; clearTimeout(npTimer); const id = item.dataset.np, bar = item.closest('.nav,.fbar'); if (npItem === item) return;
    if (npItem) { npItem.classList.remove('open'); npItem.querySelector('a').setAttribute('aria-expanded', 'false'); } if (npBar && npBar !== bar) npBar.classList.remove('np-on');
    npCur = id; npBar = bar; npItem = item; item.classList.add('open'); item.querySelector('a').setAttribute('aria-expanded', 'true'); bar.classList.add('np-on');
    np.querySelectorAll('.np-p').forEach(p => { p.hidden = p.dataset.np !== id; });
    np.style.setProperty('--np-top', Math.max(0, bar.getBoundingClientRect().bottom) + 'px');
    if (np.hidden) { np.hidden = false; npIn = requestAnimationFrame(() => { npIn = requestAnimationFrame(() => np.classList.add('on')); }); } else np.classList.add('on'); };
  const panelLater = () => { clearTimeout(npTimer); npTimer = setTimeout(closePanel, 300); };
  if (np) {
    document.querySelectorAll('.lk[data-np]').forEach(item => { const a = item.querySelector('a');
      // with a panel already open, the next item waits a moment, and keeps waiting while the pointer heads down: a pointer crossing an item on its way into the panel leaves the panel alone
      let later = 0; const soon = () => { clearTimeout(later); later = setTimeout(() => openPanel(item), 180); };
      item.addEventListener('pointerenter', ev => { if (ev.pointerType === 'touch') return; clearTimeout(npTimer); if (npCur && npItem !== item) soon(); else openPanel(item); });
      item.addEventListener('pointermove', ev => { if (later && npCur && npItem !== item && ev.movementY > 0) soon(); });
      item.addEventListener('pointerleave', ev => { clearTimeout(later); later = 0; if (ev.pointerType !== 'touch') panelLater(); });
      a.addEventListener('focus', () => { if (a.matches(':focus-visible') && !npBack) openPanel(item); npBack = false; });
      a.addEventListener('blur', ev => { if (!np.contains(ev.relatedTarget)) panelLater(); });
      // the keyboard's way into the panel, which sits elsewhere in the page: Tab or the down arrow from the item goes to its first link
      a.addEventListener('keydown', ev => { if (npItem === item && ((ev.key === 'Tab' && !ev.shiftKey) || ev.key === 'ArrowDown')) { const first = np.querySelector('.np-p:not([hidden]) a'); if (first) { ev.preventDefault(); first.focus(); } } }); });
    np.addEventListener('pointerenter', () => clearTimeout(npTimer));
    np.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'touch') panelLater(); });
    np.addEventListener('focusin', () => clearTimeout(npTimer));
    np.addEventListener('focusout', ev => { if (!np.contains(ev.relatedTarget) && !(npItem && npItem.contains(ev.relatedTarget))) panelLater(); });
    np.addEventListener('keydown', ev => { if (ev.key !== 'Tab' || !npItem) return; const links = [...np.querySelectorAll('.np-p:not([hidden]) a')], at = links.indexOf(document.activeElement);
      if (ev.shiftKey && at === 0) { ev.preventDefault(); npItem.querySelector('a').focus(); }
      else if (!ev.shiftKey && at === links.length - 1) { const all = [...npItem.closest('.in').querySelectorAll('a,button')].filter(x => x.offsetParent), next = all[all.indexOf(npItem.querySelector('a')) + 1]; if (next) { ev.preventDefault(); closePanel(); next.focus(); } } });
    // the other nav links and the buttons close it after the same grace
    document.querySelectorAll('.links > a,.nav-b,.brand').forEach(x => x.addEventListener('pointerenter', () => { if (npCur) panelLater(); }));
    addEventListener('keydown', ev => { if (ev.key === 'Escape' && npCur) { const a = npItem && npItem.querySelector('a'); closePanel(); if (a && np.contains(document.activeElement)) { npBack = true; a.focus({ preventScroll: true }); } } });
    addEventListener('scroll', () => { if (!npCur || !npBar) return; const b = npBar.getBoundingClientRect().bottom; if (b <= 0) closePanel(); else np.style.setProperty('--np-top', b + 'px'); }, { passive: true });
    addEventListener('resize', closePanel);
  }
  // the footer: robots assemble, 300ms apart, once the page has lifted 40% of the way off it. A sticky footer always counts as on screen, so they start and pause from here, and stop while the page covers them
  const foot = document.querySelector('.foot'), lift = document.querySelector('.lift');
  if (foot && lift) { const bots = [...foot.querySelectorAll('.ff-bot canvas')], dots = () => window.FerraDots; let H = 0, flow = false, near = false, started = false, live = false;
    const shown = () => flow ? innerHeight - foot.getBoundingClientRect().top : innerHeight - lift.getBoundingClientRect().bottom;
    const measure = () => { foot.classList.remove('flow'); H = foot.offsetHeight; flow = reduce || H > innerHeight; foot.classList.toggle('flow', flow); };
    const check = () => { const s = shown(), d = dots(); if (!d) return;
      if (!near && s > -1400) { near = true; bots.forEach(c => d.fetch(c)); }
      if (!started && (s >= H * .4)) { started = true; live = true; bots.forEach((c, i) => setTimeout(() => { c.classList.add('dotbot'); c._seen = 1; c._vis = true; d.draw(c); if (!live) d.pause(c); }, reduce ? 0 : i * 300)); }
      else if (started) { const on = s > 0; if (on !== live) { live = on; bots.forEach(c => { if (c._seen && c.classList.contains('dotbot')) on ? d.resume(c) : d.pause(c); }); } } };
    measure(); check(); addEventListener('scroll', check, { passive: true }); addEventListener('resize', () => { measure(); check(); }); addEventListener('load', () => { measure(); check(); }); }
  // phone menu: full screen, the page behind it inert, Escape or any link closes it, focus goes back where it was
  const mn = document.getElementById('mn');
  if (mn) { let back = null; const btns = document.querySelectorAll('.menu'), pg = document.querySelector('.page');
    const set = o => { mn.hidden = !o; document.documentElement.classList.toggle('mn-open', o); if (pg) pg.inert = o; if (fbar) fbar.inert = o; btns.forEach(b => b.setAttribute('aria-expanded', o));
      if (o) { back = document.activeElement; mn.querySelector('.mn-x').focus({ preventScroll: true }); } else if (back && back.focus) back.focus({ preventScroll: true }); };
    btns.forEach(b => b.addEventListener('click', () => set(true))); mn.querySelector('.mn-x').addEventListener('click', () => set(false)); mn.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', ev => { if (ev.key === 'Escape' && !mn.hidden) set(false); }); matchMedia('(min-width: 1081px)').addEventListener('change', ev => { if (ev.matches && !mn.hidden) set(false); }); }
  // the scene chain, for the pages built as a run of pinned screens (Fleets, Company). Each .sc holds .sc-s > section and hands to the next by data-out: gf is a Ground Fade over 60vh, ov an Overlap over 100vh (70vh on a phone).
  // A Ground Fade between white and ink is the longest change of ground there is: it takes 100vh (70vh on a phone) on linear easing, since a smooth curve lands most of that change in the middle of the scroll and reads as a flip.
  // data-hold adds that many vh of scroll-tied hold, and data-flow leaves a section in the page's own flow. A page calls it once it has added .sc-on: runs[id](p, top) gets each hold's progress, arrive[id]() runs once when that scene arrives, after() runs on every relayout. It returns the relayout.
  window.FerraChain = ({ runs = {}, arrive = {}, after } = {}) => {
    const SC = [...document.querySelectorAll('.sc')], clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;top:0;left:-9px;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none'; document.body.appendChild(probe);
    let VH = 0, heroNow = false, queued = false;
    // white, or the page's pale, to ink: the ground a scene's section paints
    const ground = s => { const sec = s && s.querySelector('section'); if (!sec) return ''; const cs = getComputedStyle(sec); if (cs.backgroundImage !== 'none') return ''; const c = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number); return c.length < 3 || c[3] === 0 ? '' : Math.min(c[0], c[1], c[2]) > 225 ? 'white' : Math.max(c[0], c[1], c[2]) < 50 ? 'ink' : ''; };
    const layout = () => { VH = probe.offsetHeight; const u = VH / 100, m = innerWidth <= 720 ? .7 : 1; let prev = null, z = 100;
      SC.forEach((s, i) => { const flow = s.hasAttribute('data-flow'), out = s.dataset.out, a = out === 'gf' ? ground(s) : '', b = out === 'gf' ? ground(SC[i + 1]) : '', far = !!a && !!b && a !== b, inH = prev && prev.out === 'gf' ? prev.outH : 0, outH = out === 'gf' ? (far ? 100 * m : 60) * u : out === 'ov' ? 100 * m * u : 0;
        s.style.marginTop = !prev ? '' : prev.out === 'gf' ? -(VH + prev.outH) + 'px' : prev.out === 'ov' ? -prev.outH + 'px' : '';
        z = prev && prev.out === 'gf' ? z - 1 : z + 1; s.style.zIndex = z;
        if (flow) { s._l = { flow, inH, out, outH, far }; prev = s._l; return; }
        const sec = s.firstElementChild.firstElementChild, over = Math.max(0, sec.offsetHeight - VH), hold = (+s.dataset.hold || 0) * m * u;
        s.style.height = VH + inH + over + hold + outH + 'px';
        s._l = { inH, over, hold, out, outH, far, st: s.firstElementChild, sec, kids: [...sec.children], shown: -1 }; prev = s._l; }); };
    const tick = () => { for (const s of SC) { const l = s._l, top = s.getBoundingClientRect().top, y = -top;
        const isOn = l.flow ? top < VH * .7 : l.inH ? y >= l.inH * .6 : s.id === 'sc-hero' ? heroNow : top <= VH * .12;
        if (isOn && !s.classList.contains('on')) { s.classList.add('on'); if (arrive[s.id]) arrive[s.id](); }
        if (l.flow || top > VH * 1.1 || y > s.offsetHeight) continue;
        if (l.over) l.sec.style.transform = `translate3d(0,${-Math.min(l.over, Math.max(0, y - l.inH)).toFixed(1)}px,0)`;
        const p = l.hold ? clamp((y - l.inH - l.over) / l.hold) : y >= l.inH ? 1 : 0;
        if (runs[s.id]) runs[s.id](p, top);
        // a Ground Fade: nothing moves. The words leave in the first 40%, the ground crosses over the whole distance, and the next screen's words arrive in the last 40%, so two sets of words never share the screen
        const k = l.out === 'gf' ? clamp((y - l.inH - l.over - l.hold) / l.outH) : 0, come = l.inH ? clamp((y / l.inH - .6) / .4) : 1, words = Math.min(come, 1 - clamp(k / .4));
        if (words !== l.shown) { l.shown = words; l.kids.forEach(c => { c.style.opacity = words.toFixed(3); }); }
        if (l.out === 'gf') { const g = l.far ? k : k * k * (3 - 2 * k); l.st.style.opacity = (1 - g).toFixed(3); l.st.style.visibility = k >= 1 ? 'hidden' : ''; l.st.style.pointerEvents = k > .5 ? 'none' : ''; } } };
    // the first screen's words Rise once it has painted
    setTimeout(() => { heroNow = true; tick(); }, 80);
    const ask = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; tick(); }); };
    const relay = () => { layout(); tick(); if (after) after(); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', relay);
    relay();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relay);
    return relay; };
})();
