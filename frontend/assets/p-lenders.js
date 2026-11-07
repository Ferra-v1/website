// Lenders page: the slider against the loan, and the film at the top.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('l-js');   // bars and dots wait to draw only when this script can bring them back

  // the film: the phone has its own still. Once the proof has slid up over it, it rests until the reader comes back. The pause control (site.js) wins: a paused film stays paused.
  const hero = document.querySelector('.l-hero'), film = hero && hero.querySelector('.l-film'), fp = hero && hero.querySelector('[data-film-pause]');
  if (film) {
    if (matchMedia('(max-width:720px)').matches) film.poster = 'assets/p-lenders.dock-phone.webp';
    if (reduce) { film.removeAttribute('autoplay'); film.pause(); }
    else {
      let tick = 0, off = false;
      const on = () => { tick = 0; const past = scrollY >= innerHeight; if (past === off) return; off = past;
        if (past) film.pause(); else if (!film.ended && !(fp && fp.getAttribute('aria-pressed') === 'true')) film.play().catch(() => {}); };
      addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(on); }, { passive: true });
    }
  }

  // the slider. One number, the share lent, redraws the figures, the loan's shape, the labels and the words. Every sum comes from the rows the page was built with.
  const dc = document.querySelector('[data-dc]');
  if (!dc) return;
  const D = JSON.parse(dc.dataset.dc), R = D.rows, T = D.term;
  const $ = s => dc.querySelector(s), inp = $('.l-adv'), plot = $('.l-plot'), svg = $('.l-svg'), now = $('.l-now'), tag = $('.l-mtag'), read = $('.l-read'), gut = $('.l-gut');
  const P = { l: $('.l-a-l'), e: $('.l-a-e'), a: $('.l-a-a'), top: $('.l-ln-l') };
  const figL = $('[data-lend]'), figM = $('[data-lent]'), covA = $('[data-cov="a"]'), covS = $('[data-cov="s"]'), stops = [...dc.querySelectorAll('.l-stop')];
  const whole = v => '$' + Math.round(v).toLocaleString('en-US');
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const rough = v => '$' + (Math.round(v / 10000) * 10000).toLocaleString('en-US');
  const fifty = v => '$' + (Math.round(v / 50000) * 50000).toLocaleString('en-US');   // a value from our assumed curve, to the nearest $50,000
  const marks = { a: [$('[data-ring="a"]'), $('[data-drop="a"]'), $('[data-rtag="a"]'), 2], s: [$('[data-ring="s"]'), $('[data-drop="s"]'), $('[data-rtag="s"]'), 3] };
  const HINT = 'Point at any month to read it.';
  let adv = D.adv, reading = -1, touched = false, tween = 0;
  const loan = () => D.v * adv / 100, owed = m => loan() * (1 - m / T);
  const lerp = (m, k) => { const i = Math.min(T - 1, Math.floor(m)), f = m - i; return R[i][k] + (R[i + 1][k] - R[i][k]) * f; };
  const Y = v => 1000 * (1 - v / D.top);
  const area = f => { let d = 'M0 1000'; for (let m = 0; m <= T; m += .25) d += `L${(m * 10).toFixed(1)} ${Y(f(m)).toFixed(1)}`; return d + `L${T * 10} 1000Z`; };
  // the first month a sale at this column covers what is left
  const covered = k => { for (let m = 0; m <= T; m++) if (R[m][k] >= owed(m) - .5) return m; return T; };
  const when = m => m === 0 ? 'Day one' : 'Month ' + m;
  // the words under the chart speak while a month is being read, by hover or by tap. Otherwise they say how to read one
  function words() {
    if (reading < 0) return HINT;
    const m = reading, [v, , a, s] = R[m], l = owed(m);
    if (m === T) return `At month ${T}, the last payment is made and nothing is owed. The robots are worth about <b>${fifty(v)}</b> in our model.`;
    const start = m === 0 ? `On day one, <b>${money(l)}</b> is owed.` : `At month ${m}, <b>${money(l)}</b> is still owed.`;
    return `${start} A forced sale would bring ${m ? 'about ' : ''}<b>${m ? fifty(a) : whole(a)}</b>, or about <b>${rough(s)}</b> for the arms alone.`;
  }
  // the labels left of the chart. Each sits level with where its shape starts on the first day, pushed apart only as far as it takes for no two to touch, with a thin line back to its shape
  const LABS = ['v', 'l', 'e', 'a'].map(k => ({ k, el: gut.querySelector(`[data-lab="${k}"]`), wire: gut.querySelector(`[data-wire="${k}"]`), key: dc.querySelector(`[data-key="${k}"]`) }));
  const dayOne = k => k === 'v' ? R[0][0] : k === 'l' ? loan() : k === 'e' ? R[0][2] : R[0][3];
  const shown = k => k === 'a' ? rough(dayOne(k)) : money(dayOne(k));
  function labels() {
    for (const L of LABS) { const t = shown(L.k); L.el.firstChild.textContent = t; L.key.textContent = t; }
    const H = plot.clientHeight, W = gut.clientWidth; if (!W || !H) return;
    const items = LABS.map(L => ({ ...L, real: Y(dayOne(L.k)) / 1000 * H, h: L.el.offsetHeight })).sort((a, b) => a.real - b.real);
    let y = -Infinity; for (const it of items) { it.y = Math.max(it.real, y + it.h / 2 + 6); y = it.y + it.h / 2; }
    y = H + 12; for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.y + it.h / 2 > y) it.y = y - it.h / 2; y = it.y - it.h / 2 - 6; }
    for (const it of items) { it.el.style.top = it.y.toFixed(1) + 'px'; const x0 = W - 26, x1 = W - 10; it.wire.setAttribute('d', `M${x0} ${it.y.toFixed(1)}L${x1} ${it.y.toFixed(1)}L${W} ${it.real.toFixed(1)}`); }
  }
  // a ring where a sale first covers what is owed, a thin line down to the axis, and the month written under the axis
  function place() {
    labels();
    const H = plot.clientHeight, W = plot.clientWidth, seen = [];
    for (const k of ['a', 's']) { const [ring, drop, rt, col] = marks[k], m = covered(col), on = m > 0 && m < T;
      ring.hidden = drop.hidden = rt.hidden = !on; if (!on) continue;
      const x = m / T * 100, y = Y(R[m][col]) / 10; ring.style.left = x + '%'; ring.style.top = y + '%';
      drop.style.left = x + '%'; drop.style.top = y + '%';
      rt.textContent = 'Month ' + m; rt.style.left = x + '%'; rt.classList.toggle('l-end', x > 94); seen.push([rt, m / T * W]); }
    if (seen.length === 2 && Math.abs(seen[0][1] - seen[1][1]) < 76) seen[1][0].hidden = true;   // two tags that close would touch: the figures above still give both
  }
  function set(v) {
    adv = Math.max(+inp.min, Math.min(+inp.max, Math.round(v)));
    inp.value = adv; inp.style.setProperty('--p', (adv - +inp.min) / (+inp.max - +inp.min) * 100);
    inp.setAttribute('aria-valuetext', adv + ' percent of what the robots cost, ' + money(loan()));
    figL.textContent = adv + '%'; figM.textContent = money(loan());
    covA.textContent = when(covered(2)); covS.textContent = when(covered(3));
    P.l.setAttribute('d', area(owed));
    P.e.setAttribute('d', area(m => Math.min(lerp(m, 2), owed(m))));
    P.a.setAttribute('d', area(m => Math.min(lerp(m, 3), owed(m))));
    P.top.setAttribute('d', `M0 ${Y(loan()).toFixed(1)}L${T * 10} 1000`);
    now.innerHTML = words(); place();
    stops.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.adv === adv)));
  }
  function glide(to, ms = 600) {
    cancelAnimationFrame(tween);
    if (reduce) { set(to); return; }
    const from = adv, t0 = performance.now(), step = n => { const u = Math.min(1, (n - t0) / ms), e = u * u * (3 - 2 * u); set(from + (to - from) * e); if (u < 1) tween = requestAnimationFrame(step); };
    tween = requestAnimationFrame(step);
  }
  inp.hidden = false;
  inp.addEventListener('input', () => { touched = true; cancelAnimationFrame(tween); set(+inp.value); });
  stops.forEach(b => b.addEventListener('click', () => { touched = true; glide(+b.dataset.adv); }));
  // reading a month: hover on a desktop, a tap on a phone
  const showMonth = ev => { const b = plot.getBoundingClientRect(); reading = Math.max(0, Math.min(T, Math.round((ev.clientX - b.left) / b.width * T))); now.innerHTML = words();
    read.setAttribute('x1', reading * 10); read.setAttribute('x2', reading * 10); read.setAttribute('visibility', 'visible');
    tag.hidden = false; tag.textContent = 'Month ' + reading; tag.style.left = Math.max(5, Math.min(95, reading / T * 100)) + '%'; };
  const hideMonth = () => { reading = -1; now.innerHTML = words(); read.setAttribute('visibility', 'hidden'); tag.hidden = true; };
  plot.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') showMonth(ev); });
  plot.addEventListener('pointerdown', showMonth);
  plot.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hideMonth(); });
  set(adv);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(place, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  addEventListener('load', place);
  // on arrival the shapes draw in from the left, then the slider moves once on its own, so the reader sees that it is a control
  if (!reduce && 'IntersectionObserver' in window) {
    plot.classList.add('l-wait');
    new IntersectionObserver((es, o) => es.forEach(en => { if (!en.isIntersecting) return; o.disconnect();
      plot.classList.remove('l-wait');
      setTimeout(() => { if (touched) return; glide(50, 900); setTimeout(() => { if (!touched) glide(D.adv, 900); }, 1200); }, 1400); }), { threshold: .4 }).observe(plot);
  }
})();
