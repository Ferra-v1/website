// Lenders page: the three documents as tabs, the loan chart with its handle, the falling dots, and the film.
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

  // the loan as a field of dots. Each dot is $100,000 at that moment of the loan. Darkest: what a sale at the middle auction share of the arms alone would pay. Dark: the rest that share of everything installed would pay. Bright: what that sale would leave unpaid. Pale: the rest of the value in our model.
  // The handle sets the advance rate: it sits at the height of the loan on the first day, and everything redraws from it. Hovering or tapping the field reads any month in the sentence above.
  const dc = document.querySelector('[data-dc]');
  if (dc) {
    const D = JSON.parse(dc.dataset.dc), R = D.rows, cv = dc.querySelector('.l-cv'), plot = dc.querySelector('.l-plot'), now = dc.querySelector('.l-now'), rail = dc.querySelector('.l-rail'), inp = dc.querySelector('.l-adv'), hnd = dc.querySelector('.l-hnd'), ctx = cv.getContext('2d');
    const tag = dc.querySelector('.l-mtag'), gut = dc.querySelector('.l-gut'), htag = dc.querySelector('.l-htag'), covA = dc.querySelector('[data-cov="a"]'), covS = dc.querySelector('[data-cov="s"]');
    const presets = [...document.querySelectorAll('[data-adv]')], back = document.querySelector('.l-back');
    const live = !matchMedia('(prefers-reduced-motion: reduce)').matches, TAU = 6.2832, DEEP = '#1e339b', GAP = '#0394e0', PALE = '#c8d4f5', LATER = '#eaeff9', INK = '#0e1626';
    const whole = v => '$' + Math.round(v).toLocaleString('en-US');
    const rough = v => '$' + (Math.round(v / 10000) * 10000).toLocaleString('en-US');
    const fifty = v => '$' + (Math.round(v / 50000) * 50000).toLocaleString('en-US');   // a value from our assumed curve, to the nearest $50,000
    // the section's heading follows the handle once the reader moves it, and returns to its own line at the example's share
    const head = document.querySelector('.l-loan .h2'), headRest = head ? head.textContent : '';
    function heading() {
      if (!head || !touched) return;
      const a = covered(2), s = covered(3), when2 = a === 0 ? 'from day one' : 'at month ' + a;
      const line = adv === D.adv ? headRest : s === 0 ? `A ${D.pct}% sale covers this loan from day one, even for the arms alone.` : `A ${D.pct}% sale covers this loan ${when2}. The arms alone take until month ${s}.`;
      if (head.textContent === line) return;
      const y0 = plot.getBoundingClientRect().top;
      head.textContent = line; head.classList.toggle('l-moved', adv !== D.adv);
      // a longer heading must not pull the handle out from under the finger
      const dy = plot.getBoundingClientRect().top - y0; if (dy && !gliding) scrollBy(0, dy);
    }
    let adv = D.adv, reading = -1, shown = live ? 0 : 1, S = null, raf = 0, tween = 0, nudged = false, touched = false, gliding = false;
    const loan = () => D.v * adv / 100, owed = m => loan() * (1 - m / D.term);
    const yOf = v => S.H - (v / D.dot) * S.p;
    // the first month a sale at this column covers what is left
    const covered = k => { for (let m = 0; m <= D.term; m++) if (R[m][k] >= owed(m) - .5) return m; return D.term; };
    const when = m => m === 0 ? 'Day one' : 'Month ' + m;
    const at = t => { const i = Math.min(D.term - 1, Math.floor(t)), f = t - i; return [0, 2, 3].map(k => R[i][k] + (R[i + 1][k] - R[i][k]) * f); };
    function words() {
      const m = reading < 0 ? 0 : reading, [v, , a, s] = R[m], l = owed(m);
      if (m === D.term) return `At month ${D.term}, the last payment is made and nothing is owed. The robots are worth about <b>${fifty(v)}</b> in our model.`;
      const start = m === 0 ? `Lend <b>${adv}%</b> and <b>${whole(l)}</b> is owed on the first day.` : `At month ${m}, <b>${whole(l)}</b> is still owed and the robots are worth about <b>${fifty(v)}</b> in our model.`;
      return `${start} A ${D.pct}% sale would bring ${m ? 'about ' : ''}<b>${fifty(a)}</b> counting everything installed, or about <b>${rough(s)}</b> for the arms alone.`;
    }
    function size() {
      const W = plot.clientWidth, dpr = Math.min(2, devicePixelRatio || 1);
      const room = Math.max(240, innerHeight - (innerWidth < 821 ? 240 : 300));
      const p = Math.min(W < 640 ? W / 64 : W < 1000 ? W / 100 : W / 132, room / D.top);
      const cols = Math.round(W / p), H = D.top * p;
      cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      rail.style.height = H + 'px'; gut.style.height = H + 'px';
      const col = [];
      for (let j = 0; j < cols; j++) { const [v, a, s] = at(j / (cols - 1) * D.term); col.push({ x: (j + .5) * p, t: j / (cols - 1) * D.term, v, a, s, n: Math.round(v / D.dot) }); }
      S = { W, H, dpr, p, col, gutter: gut.offsetParent && gut.clientHeight > 0 && getComputedStyle(gut).display !== 'none' };
    }
    function place() {
      // the handle, its tag, and each band's label at the height of what it names. A band too thin to hold its words, or too close to the tag, drops its label.
      const L = loan(), y = yOf(L), [v0, a0, s0] = [R[0][0], R[0][2], R[0][3]];
      hnd.style.top = y + 'px';
      if (!S.gutter) return;
      htag.style.top = y + 'px'; htag.firstElementChild.textContent = 'Lend ' + adv + '%'; htag.lastElementChild.textContent = whole(L);
      const band = [['a', L, v0], ['b', a0, L], ['c', s0, Math.min(a0, L)], ['d', 0, Math.min(s0, L)]];
      for (const [k, lo, hi] of band) {
        const el = gut.querySelector('.l-dl-' + k), h = (hi - lo) / D.dot * S.p;
        if (hi <= lo) { el.classList.add('off'); continue; }
        // the bottom band is thin: its label stands on the floor of the field
        const mid = k === 'd' ? Math.max(yOf((lo + hi) / 2), 0) : yOf((lo + hi) / 2), yl = k === 'd' ? Math.min(mid, S.H - 22) : mid;
        el.style.top = yl + 'px';
        el.classList.toggle('off', (k !== 'd' && h < 44) || Math.abs(yl - y) < 54);
      }
      // the label on the floor gives way to the one above it, never the other way round
      const c = gut.querySelector('.l-dl-c'), d = gut.querySelector('.l-dl-d');
      if (!c.classList.contains('off') && Math.abs(parseFloat(c.style.top) - parseFloat(d.style.top)) < 50) c.style.top = (parseFloat(d.style.top) - 52) + 'px';
    }
    function draw() {
      raf = 0; if (!S) return; const { W, H, dpr, p, col } = S, r = p * .39, big = W >= 500, L = loan();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const lists = { later: [], p: [], g: [], d: [], s: [] }, edge = shown * W;
      for (const c of col) {
        const l = L * (1 - c.t / D.term), yet = c.x <= edge + p * .5;
        for (let i = 0; i < c.n; i++) {
          const y = H - (i + .5) * p, $ = (i + .5) * D.dot;
          (yet ? ($ < Math.min(c.s, l) ? lists.s : $ < Math.min(c.a, l) ? lists.d : $ < l ? lists.g : lists.p) : lists.later).push(c.x, y);
        }
      }
      for (const [k, fill] of [['later', LATER], ['p', PALE], ['g', GAP], ['d', DEEP], ['s', INK]]) { const P = lists[k]; ctx.fillStyle = fill; ctx.beginPath(); for (let i = 0; i < P.length; i += 2) { ctx.moveTo(P[i] + r, P[i + 1]); ctx.arc(P[i], P[i + 1], r, 0, TAU); } ctx.fill(); }
      // the loan itself, the line the handle moves
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, yOf(L)); ctx.lineTo(W, H); ctx.stroke();
      // what a sale of everything brings, carried past the loan so the crossing can be read
      ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath();
      for (let m = 0; m <= D.term; m++) { const x = (m / D.term) * W, y = yOf(R[m][2]); m ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      // where a sale first covers the loan: a ring on the spot, for each sum
      if (shown >= 1) for (const k of [2, 3]) { const m = covered(k); if (m === 0 || m === D.term) continue; const cx = (m / D.term) * W, cy = yOf(R[m][k]); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, big ? 6 : 4.5, 0, TAU); ctx.fill(); ctx.stroke(); }
      // the month being read
      if (reading >= 0) { const x = Math.min(W - 1, Math.max(1, (reading / D.term) * W)), yTop = yOf(R[reading][0]); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yTop - 2); ctx.lineTo(x, H); ctx.stroke(); if (big) { tag.hidden = false; tag.textContent = 'Month ' + reading; tag.style.left = Math.max(40, Math.min(W - 40, x)) + 'px'; tag.style.top = (yTop - 2) + 'px'; } }
      else tag.hidden = true;
    }
    const paint = () => { if (!raf) raf = requestAnimationFrame(draw); };
    function set(v) {
      v = Math.max(+inp.min, Math.min(+inp.max, Math.round(v)));
      adv = v; inp.value = v; inp.setAttribute('aria-valuetext', v + ' percent of what the robots cost, ' + whole(loan()));
      covA.textContent = when(covered(2)); covS.textContent = when(covered(3));
      now.innerHTML = words(); heading(); place(); paint();
      if (back) back.hidden = v === D.adv;
      presets.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.adv === v)));
    }
    function glide(to, ms = 480) {
      cancelAnimationFrame(tween);
      if (!live) { set(to); return; }
      const from = adv, t0 = performance.now(), step = now => { const u = Math.min(1, (now - t0) / ms), e = u * u * (3 - 2 * u); gliding = true; set(from + (to - from) * e); gliding = false; if (u < 1) tween = requestAnimationFrame(step); };
      tween = requestAnimationFrame(step);
    }
    // dragging the handle: the whole rail is the target, and snaps to the two figures printed below
    const fromY = ev => { const b = rail.getBoundingClientRect(), v = (b.bottom - ev.clientY) / S.p * D.dot / D.v * 100; let n = Math.round(v); for (const s of [24, 4]) if (Math.abs(v - s) < 1.2) n = s; touched = true; cancelAnimationFrame(tween); set(n); };
    rail.hidden = false; rail.addEventListener('pointerdown', ev => { ev.preventDefault(); rail.setPointerCapture(ev.pointerId); rail.classList.add('drag'); inp.focus({ preventScroll: true }); fromY(ev); });
    rail.addEventListener('pointermove', ev => { if (rail.classList.contains('drag')) fromY(ev); });
    const stop = () => rail.classList.remove('drag'); rail.addEventListener('pointerup', stop); rail.addEventListener('pointercancel', stop);
    inp.addEventListener('input', () => { touched = true; cancelAnimationFrame(tween); set(+inp.value); });
    const hint = dc.querySelector('.l-drag'); if (hint) hint.hidden = false;
    presets.forEach(b => { b.hidden = b === back; b.addEventListener('click', () => { touched = true; glide(+b.dataset.adv); if (plot.getBoundingClientRect().top < 0) dc.scrollIntoView({ block: 'start', behavior: live ? 'smooth' : 'auto' }); }); });
    // reading a month: hover on a desktop, a tap on a phone
    const fromEvent = ev => { const b = plot.getBoundingClientRect(); reading = Math.max(0, Math.min(D.term, Math.round((ev.clientX - b.left) / b.width * D.term))); now.innerHTML = words(); paint(); };
    plot.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') fromEvent(ev); });
    plot.addEventListener('pointerdown', fromEvent);
    plot.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') { reading = -1; now.innerHTML = words(); paint(); } });
    const all = () => { size(); place(); paint(); };
    all(); set(adv);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
    addEventListener('load', all);
    let rt, lw = innerWidth, lh = innerHeight; addEventListener('resize', () => { if (innerWidth === lw && Math.abs(innerHeight - lh) < 140) return; lw = innerWidth; lh = innerHeight; clearTimeout(rt); rt = setTimeout(all, 120); });
    // on arrival the months fill in from the left, then the handle moves once on its own, so the reader sees that it is a control
    if (live && 'IntersectionObserver' in window) {
      new IntersectionObserver((es, o) => es.forEach(en => { if (!en.isIntersecting) return; o.disconnect();
        const t0 = performance.now(), run = n => { shown = Math.min(1, (n - t0) / 1300); paint(); if (shown < 1) requestAnimationFrame(run); else if (!touched && !nudged) { nudged = true; const start = D.adv; glide(52, 620); setTimeout(() => { if (!touched) glide(start, 620); }, 760); } };
        requestAnimationFrame(run); }), { threshold: .35 }).observe(plot);
    } else { shown = 1; paint(); }
  }

  // what if a loan goes bad: the dots that fall wait on the robot and fall when the reader arrives. Without this script, or with less motion asked for, they are already on the floor.
  const fig = document.querySelector('.l-ff');
  if (fig && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    fig.classList.add('l-wait');
    new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting) { o.disconnect(); fig.getBoundingClientRect(); fig.classList.remove('l-wait'); } }), { threshold: .45 }).observe(fig);
  }

  // the film: a reader who asked for less motion gets the still
  const film = document.querySelector('.l-film');
  if (film && matchMedia('(prefers-reduced-motion: reduce)').matches) { film.removeAttribute('autoplay'); film.pause(); }
})();
