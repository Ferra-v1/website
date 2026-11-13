// Vision page: the first film is an ordinary first screen and scrolls away like any page. The parade rises from under it and pins: one scene, measured in screens of scroll. The stage holds still and everything on it is a pure function of how far the page has scrolled, except the delivery robot's Resolve, which runs once on arrival. When the line of eight has had its time the stage scrolls away like any page.
// Native scrolling throughout: the stage pins with position sticky and this file only reads scroll position. Lower films are ordinary (site.js starts them on arrival). With reduced motion everything sits finished and in order, with stills.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const root = document.querySelector('[data-page="vision.html"]'); if (!root) return;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const run = $('.v-run');

  if (reduce) { $$('video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); }); return; }
  root.classList.add('v-live');

  // ------------------------------------------------------------ the timeline, in hundredths of a screen, from the moment the stage pins. Phone: a move takes 70% of the distance, a hold stays what it is
  let T = null, VH = 1;
  const plan = () => { const m = innerWidth <= 720 ? .7 : 1, t = { m };
    // six stops, each a caption held 35 and a move of 30, then the pull back, then the point holds
    t.move = 30 * m; t.stop = 35 + t.move; t.r0 = 0; t.r1 = t.r0 + 6 * t.stop; t.z1 = t.r1 + 100 * m; t.end = t.z1 + 35;   // captions hold 35 and the end 35 (were 65 and 60), so the road moves at about the pace of plain scrolling (Praj, 2026-11-12, SPEED-END-CONDITION.md 2b)
    return t; };
  // the first robot's Resolve starts once the whole of it has risen into view
  const ARRIVE = -25;

  // ------------------------------------------------------------ the road, ported from the previous site: each robot stops so its caption can be read; then the camera pulls back until eight stand together, on one line, or on a phone in two rows of four
  const work = $('.v-work'), stage = $('.v-stage'), nextFilm = $('.v-site');
  const slots = $$('[data-slot]'), caps = slots.map(s => s.querySelector('figcaption')), world = $('.v-world'), crowd = $('.v-crowd'), track = $('.v-track'), roadEl = $('.v-road'), line = $('.v-line'), line2 = $('.v-line2');
  const N = slots.length, asp = slots.map(s => +s.dataset.a), tall = slots.map(s => +s.dataset.h), extra = slots.map(s => s.hasAttribute('data-extra'));
  const first = slots[1].querySelector('.rs-bot'); let resolved = false, L = null, inStep = false;

  // a phone is too narrow for eight on one line. Each row fills the page's width, and the rows, the point and the space share the screen
  const rowsLayout = (vw, H) => { const left = world.querySelector('h2').getBoundingClientRect().left, cw = vw - left * 2, gap = 12, rows = [slots.slice(0, 4).map((_, i) => i), slots.slice(4).map((_, i) => i + 4)], head = world.offsetHeight;
    const fit = rows.map(r => (cw - gap * 3) / r.reduce((a, i) => a + asp[i] * tall[i], 0)), rh = rows.map((r, k) => Math.max(...r.map(i => tall[i])) * fit[k]);
    const k = Math.min(1, (H - head - 96) / (rh[0] + rh[1])), free = H - head - (rh[0] + rh[1]) * k, top = free * .25, g = free * .2;
    const ground = [top + head + g + rh[0] * k, top + head + g * 2 + (rh[0] + rh[1]) * k], cx = [], cy = [], hh = [];
    rows.forEach((r, n) => { let x = left; r.forEach(i => { const h = tall[i] * fit[n] * k, w = asp[i] * h; hh[i] = h; cx[i] = x + w / 2; cy[i] = ground[n]; x += w + gap; }); });
    world.style.top = top.toFixed(1) + 'px';
    return { cx, cy, hh, ground, bottom: ground[1] }; };
  const lineLayout = vw => { const cw = Math.min(1680, vw - 48), gap = 24, sumW = tall.reduce((a, h, i) => a + h * asp[i], 0), s = Math.min((cw - gap * (N - 1)) / sumW, innerHeight * .42 / Math.max(...tall));
    const left = (vw - (sumW * s + gap * (N - 1))) / 2; let x = left;
    const hh = tall.map(h => h * s), cx = asp.map((a, i) => { const w = a * hh[i], c = x + w / 2; x += w + gap; return c; });
    world.style.top = '';
    return { cx, hh, left, gap, bottom: world.offsetTop + world.offsetHeight }; };
  const roadLayout = () => { const vw = document.documentElement.clientWidth, H = stage.clientHeight, wide = vw > 820, sw = slots[0].offsetWidth, R = slots[0].querySelector('.rs-bot').offsetHeight;
    const P = wide ? lineLayout(vw) : rowsLayout(vw, H);
    // a slot's robot is as tall as the box, or as wide as the slot if that comes first; each scales to its height in the end picture
    const S = asp.map((a, i) => P.hh[i] / Math.min(R, sw / a));
    const gy = parseFloat(getComputedStyle(root).getPropertyValue('--gy')) / 100 * innerHeight, gy2 = parseFloat(getComputedStyle(root).getPropertyValue('--gy2')) / 100 * innerHeight;
    L = { vw, wide, sw, R, cx: P.cx, cy: P.cy, S, gy, rise: gy - gy2, ground: P.ground };
    crowd.style.left = wide ? P.left + 'px' : '0'; crowd.style.gap = wide ? P.gap + 'px' : '';
    [...crowd.children].forEach((c, i) => { const w = asp[i] * P.hh[i] + 'px'; c.style.width = w; c.style.left = wide ? '' : P.cx[i] - asp[i] * P.hh[i] / 2 + 'px'; c.style.top = wide ? '' : P.cy[i] - P.hh[i] + 'px'; c.querySelector('.rs-bot').style.height = P.hh[i] + 'px'; });
    if (work.classList.contains('v-crowded') && window.FerraDots) crowd.querySelectorAll('canvas').forEach(c => FerraDots.draw(c));
    if (line2 && !wide) line2.style.top = P.ground[0] + 'px';
    // the stage has to be a whole screen to pin, but what it shows at the end stops short of that. The next film comes up over the empty ink under it, so the page carries straight on
    nextFilm.style.marginTop = -Math.max(0, H - P.bottom - (wide ? 110 : 88)).toFixed(0) + 'px'; };
  // a scaled down canvas beats against the screen's pixels and shows a checker. So as the camera pulls back each robot is redrawn in steps at about its size on screen, and the transform only makes up the small difference
  const STEPS = [1, .7, .5, .35, .25];
  const sharpen = (s, Sc) => { const k = STEPS.find(v => v <= Sc / .72) || .25; if (s._k === k || (s._k === undefined && k === 1)) return; s._k = k; const b = s.querySelector('.rs-bot'), c = b.querySelector('canvas');
    if (k === 1) b.style.cssText = ''; else b.style.cssText = `height:calc(var(--rh) * ${k});width:${k * 100}%;margin-bottom:calc(var(--rh) * ${1 - k});transform:scale(${1 / k});transform-origin:50% 0;flex:none`;
    if (c._rz && window.FerraDots) { c._f0 = c._rz.f; FerraDots.draw(c, true); } };
  const unsharpen = () => slots.forEach(s => { if (s._k && s._k !== 1) { s.querySelector('.rs-bot').style.cssText = ''; } s._k = undefined; });
  const road = t => {
    if (!L) roadLayout();
    const u = (t - T.r0) / T.stop, i0 = clamp(Math.floor(u), 0, 5), f = u - i0, pos = u <= 0 ? 1 : 1 + i0 + (i0 < 5 ? smooth(f, 1 - T.move / T.stop, 1) : 0);   // a stop at each robot. The move takes the end of each stop
    const zoom = smooth(t, T.r1, T.z1);
    roadEl.style.transform = L.wide ? `translate3d(0,${(-zoom * L.rise).toFixed(1)}px,0)` : '';
    if (!L.wide) { line.style.transform = `translate3d(0,${(zoom * (L.ground[1] - L.gy)).toFixed(1)}px,0)`; line2.style.opacity = smooth(zoom, .6, 1).toFixed(3); }
    slots.forEach((s, i) => {
      const d = clamp(Math.abs(i - pos)); let op = 1 - .68 * d;
      if (extra[i]) op = 0;
      const X = lerp(L.vw / 2 + (i - pos) * L.sw, L.cx[i], zoom), Sc = lerp(1, L.S[i], zoom), Y = L.wide ? 0 : zoom * (L.cy[i] - L.gy);
      s.style.transform = `translate3d(${(X - L.sw / 2).toFixed(1)}px,${Y.toFixed(1)}px,0) scale(${Sc.toFixed(4)})`;
      s.style.opacity = lerp(op, 1, zoom).toFixed(3);
      // the caption stands still in the middle of the screen while its robot moves
      sharpen(s, Sc);
      const c = caps[i]; if (c) { const j = i - 1, a0 = T.r0 + j * T.stop, on = j === 0 ? 1 : smooth(t, a0 - 5, a0 + 5), off = j === 5 ? 0 : smooth(t, a0 + T.stop - 15, a0 + T.stop - 5);
        c.style.opacity = (on * (1 - off) * (1 - clamp(zoom * 5))).toFixed(3); c.style.transform = `translate3d(${((L.vw / 2 - X) / Sc).toFixed(1)}px,0,0)`; } });
    world.style.opacity = smooth(t, T.z1 - 20 * T.m, T.z1).toFixed(3);
    // the camera has stopped before the sharp end picture fades in, exactly over the scaled robots, on their own frames. Then the scaled ones go. Nothing shows twice in two places
    const k = smooth(t, T.z1, T.z1 + 8 * T.m), k2 = smooth(t, T.z1 + 8 * T.m, T.z1 + 16 * T.m), near = t > T.z1 - 30 * T.m;
    if (near && !work.classList.contains('v-crowded')) { work.classList.add('v-crowded'); crowd.querySelectorAll('canvas').forEach(c => { c._seen = 1; if (window.FerraDots) FerraDots.draw(c); }); } else if (!near) { work.classList.remove('v-crowded'); inStep = false; }
    if (k > 0 && !inStep && window.FerraDots) { inStep = true; [...crowd.querySelectorAll('canvas')].forEach((c, i) => { const q = slots[i].querySelector('canvas'); if (q._rz) c._f0 = q._rz.f; FerraDots.draw(c); }); } else if (k === 0) inStep = false;
    work.classList.toggle('v-settled', k2 > .995); crowd.style.opacity = k.toFixed(3); track.style.opacity = (1 - k2).toFixed(3);
    // the Resolve runs once on this page, as the first robot arrives at its stop
    if (!resolved && t >= ARRIVE && t < T.r0 + T.stop && window.FerraResolve) { const r = FerraResolve.get(first); if (r.ready()) { resolved = true; r.run(); } }
  };

  // ------------------------------------------------------------ one frame
  let eased = null, lastT = null, lastF = 0;
  // the robots follow the scroll within about a sixth of a second, measured in time: a phone that drops frames does not leave them trailing further behind the finger
  const frame = now => { requestAnimationFrame(frame); const dt = Math.min(100, lastF ? now - lastF : 16.7); lastF = now;
    const r = run.getBoundingClientRect(); if (r.bottom < -40 || r.top > innerHeight + 40) return;
    const want = clamp(-r.top / VH * 100, -110, T.end);
    eased = eased === null ? want : eased + (want - eased) * (1 - Math.pow(.75, dt / 16.7)); if (Math.abs(want - eased) < .02) eased = want; const t = eased;
    const waiting = !resolved && t >= ARRIVE && t < T.r0 + T.stop;   // the Resolve may still be waiting for its photo
    if (t === lastT && !waiting) return; lastT = t;   // nothing has moved: the robots carry on by themselves
    road(t);
  };
  // a robot whose dots have not arrived yet already takes the size it will draw at (its shape is known from data-a), so nothing jumps when it lands on a slow connection
  const reserve = () => slots.forEach((sl, i) => { const b = sl.querySelector('.rs-bot'), c = b && b.querySelector('canvas'); if (!c || c._rz || !asp[i]) return; const bh = b.clientHeight, bw = b.clientWidth; if (!bh || !bw) return; const h = Math.min(bh, bw / asp[i]); c.style.height = h + 'px'; c.style.width = h * asp[i] + 'px'; });
  const setup = () => { reserve(); unsharpen(); lastT = null; VH = stage.offsetHeight; T = plan(); run.style.height = (T.end + 100) / 100 * VH + 'px'; L = null; };
  let sw = innerWidth; addEventListener('resize', () => { if (innerWidth !== sw || Math.abs(stage.offsetHeight - VH) > 1) { sw = innerWidth; setup(); } });   // a phone toolbar sliding away resizes nothing here
  setup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { L = null; lastT = null; });
  requestAnimationFrame(frame);
})();
