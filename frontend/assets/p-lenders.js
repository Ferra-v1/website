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
  const dc = document.querySelector('[data-dc]');
  if (dc) {
    const D = JSON.parse(dc.dataset.dc), R = D.rows, cv = dc.querySelector('.l-cv'), plot = dc.querySelector('.l-plot'), now = dc.querySelector('.l-now'), inp = dc.querySelector('.l-mo'), ctx = cv.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, TAU = 6.2832, DEEP = '#1e339b', GAP = '#0394e0', PALE = '#c8d4f5', INK = '#0e1626';
    const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
    const words = m => { const [v, l, a] = R[m]; if (m === D.term) return `At month ${D.term}, the last payment is made and nothing is owed. The robots are worth about <b>${money(v)}</b> in our model.`;
      return `${m === 0 ? 'On the first day, ' : `At month ${m}, `}<b>${money(l)}</b> is ${m === 0 ? '' : 'still '}owed. The robots are worth about <b>${money(v)}</b> in our model. ` + (a < l ? `A sale at ${D.pct}% would bring <b>${money(a)}</b> and leave the lender <b>${money(l - a)}</b> short.` : `A sale at ${D.pct}% would bring <b>${money(a)}</b>, enough to pay what is left.`); };
    const at = t => { const i = Math.min(D.term - 1, Math.floor(t)), f = t - i; return [0, 1, 2].map(k => R[i][k] + (R[i + 1][k] - R[i][k]) * f); };
    let S = null, month = D.open, show = still ? 1 : 0, raf = 0, t0 = 0;
    function size() {
      const W = plot.clientWidth, dpr = Math.min(2, devicePixelRatio || 1), p = W < 640 ? W / 64 : W < 1000 ? W / 100 : W / 150, cols = Math.round(W / p), H = D.top * p;
      cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      // a label sits in a clean hole in the field: whole dots near it are left out
      const box = plot.getBoundingClientRect(), holes = [...dc.querySelectorAll('.l-dls span')].filter(s => s.offsetWidth).map(s => { const g = document.createRange(); g.selectNodeContents(s); const r = g.getBoundingClientRect(); return [r.left - box.left - p * .8, r.top - box.top - p * .8, r.right - box.left + p * .8, r.bottom - box.top + p * .8]; });
      const lists = { d: [], g: [], p: [] };
      for (let j = 0; j < cols; j++) {
        const x = (j + .5) * p, [v, l, a] = at(j / (cols - 1) * D.term), n = Math.round(v / D.dot);
        for (let i = 0; i < n; i++) {
          const y = H - (i + .5) * p; if (holes.some(h => x > h[0] && x < h[2] && y > h[1] && y < h[3])) continue;
          const money_ = (i + .5) * D.dot; (money_ < Math.min(a, l) ? lists.d : money_ < l ? lists.g : lists.p).push(x, y);
        }
      }
      S = { W, H, dpr, p, lists };
    }
    function draw() {
      raf = 0; if (!S) return; const { W, H, dpr, p, lists } = S, r = p * .39;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.save();
      if (show < 1) { ctx.beginPath(); ctx.rect(0, 0, W * show, H); ctx.clip(); }
      for (const [k, fill] of [['p', PALE], ['g', GAP], ['d', DEEP]]) { const L = lists[k]; ctx.fillStyle = fill; ctx.beginPath(); for (let i = 0; i < L.length; i += 2) { ctx.moveTo(L[i] + r, L[i + 1]); ctx.arc(L[i], L[i + 1], r, 0, TAU); } ctx.fill(); }
      // the line a lender would draw himself: what a sale at the middle auction share brings, month by month
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath();
      for (let m = 0; m <= D.term; m++) { const x = (m / D.term) * W, y = H - (R[m][2] / D.dot) * p; m ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      if (show >= 1) { const x = Math.min(W - 1, Math.max(1, (month / D.term) * W)); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    }
    const paint = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const go = m => { m = Math.max(0, Math.min(D.term, m)); if (m === month) return; month = m; inp.value = m; now.innerHTML = words(m); paint(); };
    const fromEvent = ev => { const b = plot.getBoundingClientRect(); go(Math.round((ev.clientX - b.left) / b.width * D.term)); };
    plot.addEventListener('pointermove', fromEvent); plot.addEventListener('pointerdown', fromEvent);
    inp.hidden = false; inp.addEventListener('input', () => go(+inp.value));
    size(); draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { size(); paint(); });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); paint(); }, 120); });
    if (!still && 'IntersectionObserver' in window) {
      const run = n => { if (!t0) t0 = n; const u = Math.min(1, (n - t0) / 1100); show = u * u * (3 - 2 * u); draw(); if (u < 1) requestAnimationFrame(run); };
      new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); requestAnimationFrame(run); } }), { threshold: .3 }).observe(plot);
    } else { show = 1; draw(); }
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
