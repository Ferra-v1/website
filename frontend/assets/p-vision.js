// Vision page: one pinned scene, measured in screens of scroll. The stage holds still and everything on it is a pure function of how far the page has scrolled, except the delivery robot's Resolve, which runs once on arrival. When the line of eight has had its time the stage scrolls away like any page.
// Where the film's robot becomes dots, one canvas paints the ink ground with a lattice of round holes cut from it, with one path per frame. The holes close round the robot until only its own dots are left as windows, and those turn white. Two pictures never show at once.
// Native scrolling throughout: the stage pins with position sticky and this file only reads scroll position. Lower films are ordinary (site.js starts them on arrival). With reduced motion everything sits finished and in order, with stills.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const win = (t, a, b, c, d) => smooth(t, a, b) * (1 - smooth(t, c, d));
  const root = document.querySelector('[data-page="vision.html"]'); if (!root) return;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const run = $('.v-run');

  if (reduce) { $$('video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); }); return; }
  root.classList.add('v-live');

  // ------------------------------------------------------------ the timeline, in hundredths of a screen. Phone: a move takes 70% of the distance, a hold stays what it is
  let T = null, VH = 1;
  const plan = () => { const phone = innerWidth <= 720, m = phone ? .7 : 1, t = { m, phone };
    // street: the words hold, leave, and the ink closes round the film's robot until only its dots are left, which turn white, and it rolls to its stop
    t.wOut0 = 55; t.wOut1 = t.wOut0 + 25 * m; t.d0 = 65; t.d1 = t.d0 + 125;
    // parade: six stops, each a caption held 65 and a move of 30, then the pull back, then the point holds. The robot only leaves once its caption has been read for 60
    t.move = 30 * m; t.stop = 65 + t.move; t.r0 = t.d1; t.r1 = t.r0 + 6 * t.stop; t.z1 = t.r1 + 100 * m; t.pe = t.z1 + 60;
    t.end = t.pe;
    return t; };

  // ------------------------------------------------------------ things that fade
  const shown = new Map();
  const fade = (el, v) => { if (!el) return; const o = shown.get(el); if (o !== undefined && Math.abs(o - v) < .002) return; shown.set(el, v); el.style.opacity = v.toFixed(3); el.style.visibility = v < .004 ? 'hidden' : 'visible'; };
  const street = $('.v-street'), wStreet = $('.v-w-street'), work = $('.v-work'), stage = $('.v-stage'), lat = $('.v-lat');
  const layerOn = (el, on) => { if (el._on === on) return; el._on = on; el.style.visibility = on ? 'visible' : 'hidden'; };

  // ------------------------------------------------------------ the first film plays once and holds its last frame, so nothing jumps on the way back up. It rests once the ink has closed. A film its reader paused stays paused
  const film = { v: street.querySelector('video'), b: street.querySelector('.fp'), on: true, held: false };
  film.b.addEventListener('click', () => { film.held = !film.v.paused && !film.v.ended; }, { capture: true });
  const shade = street.querySelector('.v-shade');
  const filmTick = () => { const on = street._on !== false; if (on === film.on) return; film.on = on; if (on) { if (!film.held && !film.v.ended) { const q = film.v.play(); if (q) q.catch(() => {}); } } else film.v.pause(); };

  // ------------------------------------------------------------ the road, ported from the previous site: each robot stops so its caption can be read; then the camera pulls back until eight stand together on one line
  const slots = $$('[data-slot]'), caps = slots.map(s => s.querySelector('figcaption')), world = $('.v-world'), crowd = $('.v-crowd'), track = $('.v-track'), roadEl = $('.v-road'), line = $('.v-line');
  const N = slots.length, asp = slots.map(s => +s.dataset.a), tall = slots.map(s => +s.dataset.h), extra = slots.map(s => s.hasAttribute('data-extra'));
  const first = slots[1].querySelector('.rs-bot'), firstDots = first.querySelector('canvas'); let resolved = false, L = null;

  // where the street film's robot stands on its last frame (measured on the frame), as shares of the frame, in the wide cut and the phone cut. Mapped through the same cover crop the video uses
  const ROBOT = { wide: { x0: .64, x1: .93, y0: .41, y1: .81 }, phone: { x0: .375, x1: .9, y0: .39, y1: .61 } };
  const filmBox = () => { const v = street.querySelector('video'), W = stage.clientWidth, H = stage.clientHeight, cut = W <= 720 ? ROBOT.phone : ROBOT.wide, vw = v.videoWidth || (W <= 720 ? 720 : 1920), vh = v.videoHeight || (W <= 720 ? 1280 : 1080), s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    return { x0: ox + cut.x0 * vw * s, x1: ox + cut.x1 * vw * s, y0: oy + cut.y0 * vh * s, y1: oy + cut.y1 * vh * s }; };

  const roadLayout = () => { const vw = document.documentElement.clientWidth, wide = vw > 820, sw = slots[0].offsetWidth, R = slots[0].querySelector('.rs-bot').offsetHeight;
    const cw = Math.min(1680, vw - 48), gap = 24, sumW = tall.reduce((a, h, i) => a + h * asp[i], 0), s = Math.min((cw - gap * (N - 1)) / sumW, innerHeight * .42 / Math.max(...tall));
    const used = sumW * s + gap * (N - 1), left = (vw - used) / 2; let x = left;
    const cx = asp.map((a, i) => { const w = a * tall[i] * s, c = x + w / 2; x += w + gap; return c; });
    // a slot's robot is as tall as the box, or as wide as the slot if that comes first; each scales to its height in the line
    const S = asp.map((a, i) => tall[i] * s / Math.min(R, sw / a));
    const gy = parseFloat(getComputedStyle(root).getPropertyValue('--gy')) / 100 * innerHeight, gy2 = parseFloat(getComputedStyle(root).getPropertyValue('--gy2')) / 100 * innerHeight;
    // the first robot starts out standing exactly where the film's robot stands, at about its size
    const fb = filmBox(), w1 = Math.min(R * asp[1], sw);
    L = { vw, wide, sw, R, cx, S, gy, gy2, rise: gy - gy2, startX: (fb.x0 + fb.x1) / 2, startY: Math.min(fb.y1, stage.clientHeight) - gy, startS: (fb.x1 - fb.x0) * 1.08 / w1 };
    if (wide) { crowd.style.left = left + 'px'; crowd.style.gap = gap + 'px'; [...crowd.children].forEach((c, i) => { c.style.width = asp[i] * tall[i] * s + 'px'; c.querySelector('.rs-bot').style.height = tall[i] * s + 'px'; }); if (work.classList.contains('v-crowded') && window.FerraDots) crowd.querySelectorAll('canvas').forEach(c => FerraDots.draw(c)); } };
  const road = t => { const on = t >= T.d0; if (work._on !== on) { work._on = on; work.style.visibility = on ? 'visible' : 'hidden'; } if (!on) return;
    if (!L) roadLayout();
    const D = T.d1 - T.d0, white = smooth(t, T.d0 + D * .52, T.d0 + D * .74), enter = smooth(t, T.d0 + D * .72, T.d1);
    const u = (t - T.r0) / T.stop, i0 = clamp(Math.floor(u), 0, 5), f = u - i0, pos = u <= 0 ? 1 : 1 + i0 + (i0 < 5 ? smooth(f, 1 - T.move / T.stop, 1) : 0);   // a stop at each robot. The move takes the end of each stop
    const zoom = L.wide ? smooth(t, T.r1, T.z1) : 0, last = L.wide ? 0 : smooth(t, T.r1, T.r1 + 20 * T.m);
    roadEl.style.transform = L.wide ? `translate3d(0,${(-zoom * L.rise).toFixed(1)}px,0)` : '';
    line.style.opacity = smooth(t, T.d0 + D * .7, T.d1).toFixed(3);
    slots.forEach((s, i) => {
      const d = clamp(Math.abs(i - pos)); let op = (1 - .68 * d) * (i === 1 ? 1 : smooth(t, T.d1 - 10, T.d1 + 20));
      if (extra[i]) op = 0;
      let X = lerp(L.vw / 2 + (i - pos) * L.sw, L.wide ? L.cx[i] : L.vw / 2, zoom), Sc = lerp(1, L.S[i], zoom), Y = 0;
      // the first robot starts as the film's robot and rolls to its place. It is white once the windows have filled
      if (i === 1 && t < T.d1) { X = lerp(L.startX, X, enter); Y = L.startY * (1 - enter); Sc *= lerp(L.startS, 1, enter); op *= white; }
      s.style.transform = `translate3d(${(X - L.sw / 2).toFixed(1)}px,${Y.toFixed(1)}px,0) scale(${Sc.toFixed(4)})`;
      s.style.opacity = lerp(op, 1, zoom).toFixed(3);
      // the caption stands still in the middle of the screen while its robot moves
      const c = caps[i]; if (c) { const j = i - 1, a0 = T.r0 + j * T.stop, on = j === 0 ? smooth(t, T.d1 - 20, T.d1) : smooth(t, a0 - 5, a0 + 5), off = j === 5 ? last : smooth(t, a0 + T.stop - 15, a0 + T.stop - 5);
        c.style.opacity = (on * (1 - off) * (1 - clamp(zoom * 5))).toFixed(3); c.style.transform = `translate3d(${((L.vw / 2 - X) / Sc).toFixed(1)}px,0,0)`; } });
    world.style.opacity = (L.wide ? smooth(t, T.z1 - 20 * T.m, T.z1) : smooth(t, T.r1 + 10 * T.m, T.r1 + 30 * T.m)).toFixed(3);
    if (L.wide) { const k = smooth(t, T.z1 - 16 * T.m, T.z1 - 6 * T.m), near = t > T.z1 - 30 * T.m;
      if (near && !work.classList.contains('v-crowded')) { work.classList.add('v-crowded'); crowd.querySelectorAll('canvas').forEach(c => { if (window.FerraDots) FerraDots.draw(c); }); } else if (!near) work.classList.remove('v-crowded');
      work.classList.toggle('v-settled', k > .995); crowd.style.opacity = k.toFixed(3); track.style.opacity = (1 - k).toFixed(3); }
    // the Resolve runs once on this page, as the first robot arrives at its stop
    if (!resolved && t >= T.d1 - 1 && t < T.r0 + T.stop && window.FerraResolve) { const r = FerraResolve.get(first); if (r.ready()) { resolved = true; r.run(); } }
  };

  // ------------------------------------------------------------ the lattice. One canvas, one path per frame. A hole's radius depends on how near its cell is to what the change is about, so the holes open or close outward from it
  let lx = null, LW = 0, LH = 0, dpr = 1, cells = null, P = 24, RM = 18;
  const INK = '#0e1626';
  const latSize = () => { const W = stage.clientWidth, H = stage.clientHeight; dpr = Math.min(1.25, devicePixelRatio || 1); lat.width = Math.round(W * dpr); lat.height = Math.round(H * dpr); LW = W; LH = H; lx = lat.getContext('2d');
    P = W > 820 ? 26 : 20; RM = P * .74; const cols = Math.ceil(W / P) + 1, rows = Math.ceil(H / P) + 1, fb = filmBox(), fx = (fb.x0 + fb.x1) / 2, fy = (fb.y0 + fb.y1) / 2;
    // the distance of every cell to the film's robot, as a share of the farthest. A little fixed noise keeps the front from reading as a perfect ring
    const raw = []; let mA = 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = c * P, y = r * P, n = ((c * 73 + r * 151) % 97) / 97, a = Math.hypot(x - fx, (y - fy) * 1.1); mA = Math.max(mA, a); raw.push([x, y, a, n]); }
    cells = raw.map(q => ({ x: q[0], y: q[1], a: q[2] / mA * .94 + q[3] * .06 })); };
  // open 0: all ink. open 1: no ink at all. masks: dot canvases whose dots are cut out of the ink too
  const latPaint = (open, masks) => { if (!cells) latSize(); lx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lx.globalCompositeOperation = 'source-over'; lx.fillStyle = INK; lx.fillRect(0, 0, LW, LH); lx.globalCompositeOperation = 'destination-out';
    if (open > 0) { const reach = open * 1.7, path = new Path2D(), pp = P / 2 + .5;
      for (let i = 0, n = cells.length; i < n; i++) { const c = cells[i], k = (reach - c.a) / .7; if (k <= 0) continue;
        if (k >= 1) { path.rect(c.x - pp, c.y - pp, pp * 2, pp * 2); continue; }
        const r = RM * k * k * (3 - 2 * k); path.moveTo(c.x + r, c.y); path.arc(c.x, c.y, r, 0, 6.2832); }
      lx.fill(path); }
    if (masks) { const sr = stage.getBoundingClientRect(); for (const m of masks) { if (!m.width) continue; const b = m.getBoundingClientRect(); if (b.width) lx.drawImage(m, b.left - sr.left, b.top - sr.top, b.width, b.height); } }
    lx.globalCompositeOperation = 'source-over'; };
  const latTick = t => { const D = T.d1 - T.d0;
    if (t > T.d0 && t < T.d0 + D * .76) { layerOn(lat, true); latPaint(1 - clamp((t - T.d0) / (D * .7)), [firstDots]); return; }
    layerOn(lat, false); };

  // ------------------------------------------------------------ one frame
  let eased = null, lastT = -1;
  const frame = () => { requestAnimationFrame(frame);
    const r = run.getBoundingClientRect(); if (r.bottom < -40 || r.top > innerHeight + 40) return;
    const want = clamp(-r.top / VH * 100, 0, T.end);
    eased = eased === null ? want : eased + (want - eased) * .14; if (Math.abs(want - eased) < .02) eased = want; const t = eased;
    const waiting = !resolved && t >= T.d1 - 1 && t < T.r0 + T.stop;   // the Resolve may still be waiting for its photo
    if (t === lastT && !waiting) { if (lat._on) latTick(t); return; } lastT = t;   // nothing has moved: the robots carry on by themselves, and only windows onto a moving robot need redrawing
    const D = T.d1 - T.d0;
    layerOn(street, t < T.d0 + D * .76);
    // the film's scrim is only there for its words, so the film shows in its own light as it changes form
    fade(wStreet, 1 - smooth(t, T.wOut0, T.wOut1)); fade(film.b, 1 - smooth(t, T.wOut0, T.wOut1)); fade(shade, 1 - smooth(t, T.wOut0, T.wOut0 + 70));
    filmTick(); road(t); latTick(t);
  };
  const setup = () => { lastT = -1; VH = stage.offsetHeight; T = plan(); run.style.height = (T.end + 100) / 100 * VH + 'px'; L = null; cells = null; };
  addEventListener('resize', setup);
  setup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { L = null; lastT = -1; });
  // the film's real size is known once it has loaded, and sets where its robot stands
  film.v.addEventListener('loadedmetadata', () => { L = null; cells = null; lastT = -1; });
  requestAnimationFrame(frame);
})();
