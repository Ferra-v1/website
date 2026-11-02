// Ferra dot robots: every robot on the site is drawn in code as a halftone field of dots.
// Markup: <canvas class="dotbot" data-bot="arm" data-tone="light|ink" data-anim="assemble|static" data-scan="1"></canvas>
// light = white dots with cyan trim, for blue backgrounds; ink = cobalt dots with cyan trim, for light backgrounds.
(() => {
  const D = window.FERRA_DOTS || {}, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TONES = { light: { base: [255, 255, 255], acc: [150, 232, 255], floor: .28 }, ink: { base: [30, 51, 155], acc: [3, 148, 224], floor: .46 } };
  const parse = b => b.pts || (b.pts = b.d.split(';').map(s => { const [x, y, L, A, acc, ed] = s.split(',').map(Number); return { x, y, L: L / 100, A: A / 100, acc, ed: ed / 100, r: Math.random() }; }));
  const ease = t => 1 - Math.pow(1 - t, 3);
  function draw(cv) {
    const bot = D[cv.dataset.bot]; if (!bot) return; const pts = parse(bot), tone = TONES[cv.dataset.tone || 'ink'];
    const dpr = Math.min(2, devicePixelRatio || 1), cw = cv.clientWidth; if (!cw) return; const pitch = cw / bot.w, ch = pitch * bot.h;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.height = ch + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const light = cv.dataset.tone === 'light';
    // dot size: silhouette floor, then shading (bright plastic grows dots on blue, darker parts grow dots on paper), then outline boost
    const size = p => { const shade = light ? Math.pow(p.L, .9) : Math.pow(1 - p.L, .8); return p.A * Math.min(1, tone.floor + (1 - tone.floor) * shade + p.ed * .35); };
    const assemble = cv.dataset.anim === 'assemble' && !reduce, scan = cv.dataset.scan && !reduce;
    let t0 = null;
    const frame = t => {
      if (t0 === null) t0 = t; const el = (t - t0) / 1000;
      ctx.clearRect(0, 0, cw, ch);
      const sy = scan ? ((el * .22) % 1.6 - .3) * bot.h : -99;
      for (const p of pts) {
        const delay = assemble ? p.y / bot.h * .7 + p.r * .5 : 0, k = assemble ? ease(Math.min(1, Math.max(0, (el - delay) / .9))) : 1;
        if (k <= 0) continue;
        const near = Math.max(0, 1 - Math.abs(p.y - sy) / 3.5);
        const rad = pitch * .44 * size(p) * (1 + near * .45) * (.35 + .65 * k);
        const ox = (1 - k) * (p.r - .5) * pitch * 26, oy = (1 - k) * (p.r * 1.7 - 1.1) * pitch * 18;
        const c = p.acc ? tone.acc : tone.base, al = (light ? .55 + .45 * size(p) : .45 + .55 * size(p)) * k;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, al + near * .4)})`;
        ctx.beginPath(); ctx.arc((p.x + .5) * pitch + ox, (p.y + .5) * pitch + oy, Math.max(.35, rad), 0, 6.283); ctx.fill();
      }
      if ((assemble && el < 2.2) || scan) cv._raf = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(cv._raf); cv._raf = requestAnimationFrame(frame);
  }
  const all = () => document.querySelectorAll('canvas.dotbot');
  const io = new IntersectionObserver(es => es.forEach(en => { const cv = en.target; if (en.isIntersecting) { if (!cv._seen || cv.dataset.scan) { cv._seen = 1; draw(cv); } } else if (cv.dataset.scan) cancelAnimationFrame(cv._raf); }), { rootMargin: '80px' });
  const start = () => all().forEach(cv => io.observe(cv));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => all().forEach(cv => { if (cv._seen) { cv.dataset.anim = 'static'; draw(cv); } }), 150); });
  window.FerraDots = { draw, start };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
