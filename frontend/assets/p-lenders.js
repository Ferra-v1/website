// Lenders page: the slider against the loan, and the film at the top.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('l-js');   // bars and dots wait to draw only when this script can bring them back

  // the film: the phone has its own still, and the next section slides up over the film while it darkens to ink
  const hero = document.querySelector('.l-hero'), film = hero && hero.querySelector('.l-film'), dim = hero && hero.querySelector('.l-dim');
  if (film) {
    if (matchMedia('(max-width:720px)').matches) film.poster = 'assets/p-lenders.dock-phone.webp';
    if (reduce) { film.removeAttribute('autoplay'); film.pause(); }
    else {
      let tick = 0, off = false;
      const on = () => { tick = 0; const k = Math.min(1, scrollY / (innerHeight || 1)); dim.style.opacity = k * .92;
        const past = k >= 1; if (past !== off) { off = past; if (past) film.pause(); else if (!film.ended) film.play().catch(() => {}); } };
      addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(on); }, { passive: true });
    }
  }

  // Overlap: a section holds with its foot on the bottom of the screen while the next slides up over it. Ground Fade: the empty stretch between two sections, and both sections with it, turn from one colour to the other, tied to the scroll
  if (!reduce) {
    const pins = [...document.querySelectorAll('.l-bad,.l-recv')];
    const pin = () => pins.forEach(el => { el.classList.add('l-pin'); el.style.setProperty('--l-h', el.offsetHeight + 'px'); });
    pin(); addEventListener('load', pin); addEventListener('resize', pin);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pin);
    const q = s => document.querySelector(s), gaps = [...document.querySelectorAll('.l-gap')];
    const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    // white to ink: the chart fades out with the first half of the ground, so it never sits in full colour on a grey page. White to pale: nothing needs to fade
    const fades = [[q('.l-loan'), gaps[0], q('.l-bad'), hex('#ffffff'), hex('#0e1626'), q('.l-loan > .in')], [q('.l-resale'), gaps[1], q('.l-recv'), hex('#ffffff'), hex('#ebf5fd'), null]];
    const ground = () => { const vh = innerHeight; for (const [a, gap, b, A, B, content] of fades) { const r = gap.getBoundingClientRect(), t = Math.max(0, Math.min(1, (vh * .7 - r.top) / r.height));
        if (t <= 0) { a.style.backgroundColor = b.style.backgroundColor = gap.style.backgroundColor = ''; if (content) content.style.opacity = ''; continue; }
        const c = `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
        a.style.backgroundColor = gap.style.backgroundColor = c; b.style.backgroundColor = t >= 1 ? '' : c;
        if (content) content.style.opacity = Math.max(0, 1 - t * 2); } };
    let gt = 0; addEventListener('scroll', () => { if (!gt) gt = requestAnimationFrame(() => { gt = 0; ground(); }); }, { passive: true }); ground();
  }

  // the slider. One number, the share lent, redraws the figures, the loan's shape and the words. Every sum comes from the rows the page was built with.
  const dc = document.querySelector('[data-dc]');
  if (!dc) return;
  const D = JSON.parse(dc.dataset.dc), R = D.rows, T = D.term;
  const $ = s => dc.querySelector(s), inp = $('.l-adv'), plot = $('.l-plot'), svg = $('.l-svg'), now = $('.l-now'), tag = $('.l-mtag'), read = $('.l-read');
  const P = { l: $('.l-a-l'), e: $('.l-a-e'), a: $('.l-a-a'), top: $('.l-ln-l') };
  const figL = $('[data-lend]'), figM = $('[data-lent]'), covA = $('[data-cov="a"]'), covS = $('[data-cov="s"]'), stops = [...dc.querySelectorAll('.l-stop')];
  const labs = { v: $('.l-lab-v'), l: $('.l-lab-l'), e: $('.l-lab-e'), a: $('.l-lab-a') };
  const rings = { a: [$('[data-ring="a"]'), $('[data-rtag="a"]'), 2], s: [$('[data-ring="s"]'), $('[data-rtag="s"]'), 3] };
  const whole = v => '$' + Math.round(v).toLocaleString('en-US');
  const money = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const rough = v => '$' + (Math.round(v / 10000) * 10000).toLocaleString('en-US');
  const fifty = v => '$' + (Math.round(v / 50000) * 50000).toLocaleString('en-US');   // a value from our assumed curve, to the nearest $50,000
  let adv = D.adv, reading = -1, touched = false, tween = 0;
  const loan = () => D.v * adv / 100, owed = m => loan() * (1 - m / T);
  const lerp = (m, k) => { const i = Math.min(T - 1, Math.floor(m)), f = m - i; return R[i][k] + (R[i + 1][k] - R[i][k]) * f; };
  const Y = v => 1000 * (1 - v / D.top);
  const area = f => { let d = 'M0 1000'; for (let m = 0; m <= T; m += .25) d += `L${(m * 10).toFixed(1)} ${Y(f(m)).toFixed(1)}`; return d + `L${T * 10} 1000Z`; };
  // the first month a sale at this column covers what is left
  const covered = k => { for (let m = 0; m <= T; m++) if (R[m][k] >= owed(m) - .5) return m; return T; };
  const when = m => m === 0 ? 'Day one' : 'Month ' + m;
  // the words under the chart only speak while a month is being read, by hover or by tap. The day one sums live on Methodology
  function words() {
    if (reading < 0) return '';
    const m = reading, [v, , a, s] = R[m], l = owed(m);
    if (m === T) return `At month ${T}, the last payment is made and nothing is owed. The robots are worth about <b>${fifty(v)}</b> in our model.`;
    const start = m === 0 ? `On day one, <b>${money(l)}</b> is owed.` : `At month ${m}, <b>${money(l)}</b> is still owed.`;
    return `${start} A forced sale would bring ${m ? 'about ' : ''}<b>${m ? fifty(a) : whole(a)}</b>, or about <b>${rough(s)}</b> for the arms alone.`;
  }
  // a label sits inside its shape at a month where the shape is thick enough, and steps aside when it is not
  function label(el, m, lo, hi) {
    const H = plot.clientHeight, thick = (hi - lo) / D.top * H, show = H > 0 && innerWidth > 820 && thick >= (el === labs.a ? 17 : 34);
    el.hidden = !show; if (!show) return;
    el.style.left = (m / T * 100) + '%'; el.style.top = (Y((lo + hi) / 2) / 10) + '%';
  }
  function place() {
    const L = loan(), l3 = owed(3), e3 = Math.min(lerp(3, 2), l3), a3 = Math.min(lerp(3, 3), l3);
    label(labs.a, .7, 0, Math.min(R[1][3], owed(1)));
    label(labs.e, .7, Math.min(lerp(.7, 3), owed(.7)), Math.min(lerp(.7, 2), owed(.7)));
    label(labs.l, 1.2, e3, Math.max(l3, e3));
    const vm = 21; label(labs.v, vm, Math.max(owed(vm), lerp(vm, 2)), lerp(vm, 0));
    const seen = {};
    for (const k of ['a', 's']) { const [ring, rt, col] = rings[k], m = covered(col), show = m > 0 && m < T;
      ring.hidden = !show; rt.hidden = !show || innerWidth <= 820; if (!show) continue;
      const x = m / T * 100, y = Y(R[m][col]) / 10; ring.style.left = x + '%'; ring.style.top = y + '%';
      rt.textContent = 'Month ' + m; rt.style.top = y + '%'; rt.classList.toggle('l-end', x > 92); rt.style.left = x > 92 ? 'auto' : x + '%'; seen[k] = m; }
    if (seen.a && seen.s && seen.s - seen.a < 4) rings.s[1].hidden = true;   // two tags that close would collide: the figures above still give both
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
  function glide(to, ms = 700) {
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
    tag.hidden = false; tag.textContent = 'Month ' + reading; tag.style.left = Math.max(6, Math.min(94, reading / T * 100)) + '%'; };
  const hideMonth = () => { reading = -1; now.innerHTML = words(); read.setAttribute('visibility', 'hidden'); tag.hidden = true; };
  plot.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') showMonth(ev); });
  plot.addEventListener('pointerdown', showMonth);
  plot.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hideMonth(); });
  set(adv);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(place, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  addEventListener('load', place);
  // on arrival the shapes draw in from the left over 1800ms, then the slider moves once on its own, so the reader sees that it is a control
  if (!reduce && 'IntersectionObserver' in window) {
    plot.classList.add('l-wait');
    new IntersectionObserver((es, o) => es.forEach(en => { if (!en.isIntersecting) return; o.disconnect();
      plot.classList.remove('l-wait');
      setTimeout(() => { if (touched) return; glide(50, 900); setTimeout(() => { if (!touched) glide(D.adv, 900); }, 1200); }, 2000); }), { threshold: .4 }).observe(plot);
  }
})();
