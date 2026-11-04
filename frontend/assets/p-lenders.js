// Lenders page: the three documents as tabs, and the listings gathering into one priced robot.
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

  // pricing: each listing dot sends a copy to one dot of the robot. The markup is already the final state, so reduced motion simply skips all this.
  const fig = document.querySelector('[data-gather]');
  if (!fig || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fly = fig.querySelector('.l-fly'), svg = fig.querySelector('.l-plot svg'), dots = [...svg.querySelectorAll('.l-pts circle')], bot = fig.querySelector('canvas.dotbot');
  fig.classList.add('l-wait');
  let raf = 0, running = false, ran = false;
  const end = () => { running = false; cancelAnimationFrame(raf); fly.style.display = 'none'; };

  // the robot's real dot positions, read from its painted canvas: canvas pixels to page-box coordinates
  const robotDots = box => { const st = bot._st; if (!st) return [];
    const r = bot.getBoundingClientRect(), sx = bot.width / r.width, c = bot.getContext('2d'), out = [];
    const data = c.getImageData(0, 0, bot.width, bot.height).data;
    for (let y = st.pitch / 2; y < r.height; y += st.pitch) for (let x = st.pitch / 2; x < r.width; x += st.pitch) {
      const i = (Math.round(y * sx) * bot.width + Math.round(x * sx)) * 4 + 3;
      if (data[i] > 60) out.push({ x: r.left - box.left + x, y: r.top - box.top + y }); }
    return out; };

  const run = () => { ran = true;
    if (!bot._st && window.FerraDots) window.FerraDots.draw(bot);
    const box = fig.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), targets = robotDots(box);
    if (!targets.length) { fig.classList.remove('l-wait'); return; }
    for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]]; }
    const sr = svg.getBoundingClientRect(), k = sr.width / svg.viewBox.baseVal.width, pitch = bot._st.pitch;
    const fl = dots.map((d, i) => { const x0 = sr.left - box.left + d.cx.baseVal.value * k, y0 = sr.top - box.top + d.cy.baseVal.value * k, t = targets[i % targets.length], dl = Math.random() * .6;
      d.style.transitionDelay = dl.toFixed(2) + 's';
      return { x0, y0, x1: t.x, y1: t.y, r0: d.r.baseVal.value * k, r1: pitch * .36, dl, cx: (x0 + t.x) / 2 + (Math.random() - .5) * 90, cy: Math.min(y0, t.y) - Math.random() * 70 }; });
    fly.width = Math.round(box.width * dpr); fly.height = Math.round(box.height * dpr); fly.style.display = 'block'; fly.style.opacity = 1;
    const c = fly.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    fig.classList.add('l-go'); fig.classList.remove('l-wait'); running = true;
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, DUR = 1.05, FADE = 1.75, END = 2.05;
    let t0 = null;
    const frame = now => { if (t0 === null) t0 = now; const el = (now - t0) / 1000;
      c.clearRect(0, 0, box.width, box.height); c.fillStyle = 'rgb(40,71,206)';
      for (const f of fl) { const p = (el - f.dl) / DUR; if (p <= 0) continue; const u = ease(Math.min(1, p)), v = 1 - u;
        const x = v * v * f.x0 + 2 * v * u * f.cx + u * u * f.x1, y = v * v * f.y0 + 2 * v * u * f.cy + u * u * f.y1;
        c.beginPath(); c.arc(x, y, f.r0 + (f.r1 - f.r0) * u, 0, 6.283); c.fill(); }
      fly.style.opacity = el < FADE ? 1 : Math.max(0, 1 - (el - FADE) / (END - FADE));
      if (el < END) raf = requestAnimationFrame(frame); else end(); };
    raf = requestAnimationFrame(frame); };

  const io = new IntersectionObserver(es => es.forEach(en => { if (en.intersectionRatio >= .45 && !ran) { io.disconnect(); run(); } }), { threshold: [.45] });
  io.observe(fig);
  let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; if (running) end(); } });
})();
