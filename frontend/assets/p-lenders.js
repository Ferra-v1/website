// Lenders page: the three documents as tabs, the falling dots, and the film.
(() => {
  // documents: without this script all three pages read in sequence
  const list = document.querySelector('.l-tabs');
  if (list) {
    const tabs = [...list.querySelectorAll('[role="tab"]')], wrap = document.querySelector('.l-pages');
    const pages = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    pages.forEach((p, i) => { p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', tabs[i].id); p.tabIndex = 0; });
    const show = (i, focus) => { tabs.forEach((t, j) => { const on = j === i; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; pages[j].classList.toggle('l-off', !on); }); if (focus) tabs[i].focus(); };
    list.hidden = false; wrap.classList.add('l-tabbed'); show(0);
    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    list.addEventListener('keydown', ev => { const i = tabs.indexOf(document.activeElement), n = tabs.length; if (i < 0) return;
      const to = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
      if (to === undefined) return; ev.preventDefault(); show(to, true); });
  }

  // the loan as a field of dots. Each dot is $100,000 at that moment of the loan. Dark: what a sale at the middle auction share would pay. Bright: what that sale would leave unpaid. Pale: the rest of the value in our model.
  // The page's scroll walks the months: the field stays pinned with position sticky, and dots take their colours as the line passes them. With less motion asked for it is a finished chart that reads any month on hover.
  const dc = document.querySelector('[data-dc]');
  if (dc) {
    const D = JSON.parse(dc.dataset.dc), R = D.rows, cv = dc.querySelector('.l-cv'), plot = dc.querySelector('.l-plot'), now = dc.querySelector('.l-now'), inp = dc.querySelector('.l-mo'), ctx = cv.getContext('2d');
    const run = dc.closest('.l-run'), tag = dc.querySelector('.l-mtag'), note = dc.querySelector('.l-cross');
    const live = !matchMedia('(prefers-reduced-motion: reduce)').matches, TAU = 6.2832, DEEP = '#1e339b', GAP = '#0394e0', PALE = '#c8d4f5', LATER = '#eaeff9', INK = '#0e1626';
    const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
    const words = m => { const [v, l, a] = R[m]; if (m === D.term) return `At month ${D.term}, the last payment is made and nothing is owed. The robots are worth about <b>${money(v)}</b> in our model.`;
      return `${m === 0 ? 'On the first day, ' : `At month ${m}, `}<b>${money(l)}</b> is ${m === 0 ? '' : 'still '}owed. The robots are worth about <b>${money(v)}</b> in our model. ` + (a < l ? `A sale at ${D.pct}% would bring <b>${money(a)}</b> and leave the lender <b>${money(l - a)}</b> short.` : `A sale at ${D.pct}% would bring <b>${money(a)}</b>, enough to pay what is left.`); };
    const at = t => { const i = Math.min(D.term - 1, Math.floor(t)), f = t - i; return [0, 1, 2].map(k => R[i][k] + (R[i + 1][k] - R[i][k]) * f); };
    let S = null, month = live ? 0 : D.open, raf = 0, top0 = 0, span = 1, dct = 16;
    const yOf = v => S.H - (v / D.dot) * S.p;
    function size() {
      if (live) { run.classList.add('l-live'); cv.style.height = '0px'; }
      const W = plot.clientWidth, wide = W >= 640, dpr = Math.min(2, devicePixelRatio || 1);
      // the field takes the height the pinned stage leaves, so the sentence, the axis and the labels all stay on screen
      const room = live ? Math.max(180, innerHeight - dc.offsetHeight - 28) : 1e4;
      let p = Math.min(W < 640 ? W / 64 : W < 1000 ? W / 100 : W / 132, room / D.top);
      const cols = Math.round(W / p), H = D.top * p;
      cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const col = [];
      for (let j = 0; j < cols; j++) {
        const x = (j + .5) * p, [v, l, a] = at(j / (cols - 1) * D.term), n = Math.round(v / D.dot), c = { x, d: [], g: [], p: [] };
        for (let i = 0; i < n; i++) { const y = H - (i + .5) * p, $ = (i + .5) * D.dot; ($ < Math.min(a, l) ? c.d : $ < l ? c.g : c.p).push(y); }
        col.push(c);
      }
      S = { W, H, dpr, p, col };
      if (live) {
        const h = dc.offsetHeight; dct = Math.max(12, (innerHeight - h) / 2);
        run.style.setProperty('--dch', h + 'px'); run.style.setProperty('--dct', dct + 'px');
        top0 = run.getBoundingClientRect().top + scrollY - dct; span = Math.max(1, run.offsetHeight - h);
      }
    }
    function draw() {
      raf = 0; if (!S) return; const { W, H, dpr, p, col } = S, r = p * .39, lineX = (month / D.term) * W;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const lists = { later: [], p: [], g: [], d: [] };
      for (const c of col) { if (live && c.x > lineX + p * .5) { for (const k of ['d', 'g', 'p']) for (const y of c[k]) lists.later.push(c.x, y); } else for (const k of ['d', 'g', 'p']) for (const y of c[k]) lists[k].push(c.x, y); }
      for (const [k, fill] of [['later', LATER], ['p', PALE], ['g', GAP], ['d', DEEP]]) { const L = lists[k]; ctx.fillStyle = fill; ctx.beginPath(); for (let i = 0; i < L.length; i += 2) { ctx.moveTo(L[i] + r, L[i + 1]); ctx.arc(L[i], L[i + 1], r, 0, TAU); } ctx.fill(); }
      // the line a lender would draw himself: what a sale at the middle auction share brings, up to the month being read
      const upto = live ? month : D.term;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath();
      for (let m = 0; m <= upto; m++) { const x = (m / D.term) * W, y = yOf(R[m][2]); m ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      const big = W >= 500;
      // the month being read: the line stands only as tall as the robots' value that month
      const x = Math.min(W - 1, Math.max(1, lineX)), yTop = yOf(R[month][0]);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, yTop - 2); ctx.lineTo(x, H); ctx.stroke();
      if (big) { tag.hidden = false; tag.textContent = month === 0 ? 'Today' : 'Month ' + month; tag.style.left = Math.max(26, Math.min(W - 40, x)) + 'px'; tag.style.top = (yTop - 2) + 'px'; }
      // where the sale first covers the loan: a ring on the spot and a thin line up to its words
      const passed = !live || month >= D.cross;
      note.classList.toggle('on', passed);
      if (passed && big) {
        const cx = (D.cross / D.term) * W, cy = yOf(R[D.cross][2]), ly = parseFloat(note.style.top) / 100 * H;
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, ly); ctx.lineTo(cx, cy - 7); ctx.stroke();
        ctx.lineWidth = 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    const paint = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const go = m => { m = Math.max(0, Math.min(D.term, m)); if (m === month) return; month = m; inp.value = m; now.innerHTML = words(m); paint(); };
    inp.hidden = false;
    if (live) {
      // a short hold at each end, so day one and the last payment both get read
      const read = () => { const u = Math.max(0, Math.min(1, (scrollY - top0) / span)); go(Math.round(Math.max(0, Math.min(1, (u - .04) / .9)) * D.term)); };
      addEventListener('scroll', read, { passive: true });
      inp.addEventListener('input', () => scrollTo(0, top0 + (.04 + (+inp.value / D.term) * .9) * span));
      const all = () => { size(); read(); paint(); };
      now.removeAttribute('aria-live'); now.innerHTML = words(month); inp.value = month; all();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
      addEventListener('load', all);
      // a phone's address bar changing height is not a resize worth redrawing for
      let rt, lw = innerWidth, lh = innerHeight; addEventListener('resize', () => { if (innerWidth === lw && Math.abs(innerHeight - lh) < 140) return; lw = innerWidth; lh = innerHeight; clearTimeout(rt); rt = setTimeout(all, 120); });
    } else {
      const fromEvent = ev => { const b = plot.getBoundingClientRect(); go(Math.round((ev.clientX - b.left) / b.width * D.term)); };
      plot.style.cursor = 'ew-resize';
      plot.addEventListener('pointermove', fromEvent); plot.addEventListener('pointerdown', fromEvent);
      inp.addEventListener('input', () => go(+inp.value));
      size(); draw();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { size(); paint(); });
      let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); paint(); }, 120); });
    }
  }

  // what if a loan goes bad: the 52 dots wait on the robot and fall when the reader arrives. Without this script, or with less motion asked for, they are already on the floor.
  const fig = document.querySelector('.l-ff');
  if (fig && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    fig.classList.add('l-wait');
    new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); fig.getBoundingClientRect(); fig.classList.remove('l-wait'); } }), { threshold: .45 }).observe(fig);
  }

  // the film: a reader who asked for less motion gets the still
  const film = document.querySelector('.l-film');
  if (film && matchMedia('(prefers-reduced-motion: reduce)').matches) { film.removeAttribute('autoplay'); film.pause(); }
})();
