// Vision page: one timeline for the film. Every [data-o] inside it fades on four points of the page's scroll through the film. Scenes with a video load and play only while they show, and pause when they do not.
// The field and the pieces are drawn from the page's own cut-outs. With reduced motion everything stands finished, on one still screen each, and nothing plays.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }, lerp = (a, b, t) => a + (b - a) * t;
  const run = document.querySelector('.v-run'), wish = document.querySelector('.v-wish'), sun = document.querySelector('.v-sun');
  if (!reduce) root.classList.add('v-live');
  const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  // a smaller copy for each size the picture is drawn at, so small robots stay sharp
  const mips = img => { const out = [img]; let c = img; while (c.height > 90) { const n = document.createElement('canvas'); n.width = Math.ceil(c.width / 2); n.height = Math.ceil(c.height / 2); const g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); out.push(n); c = n; } return out; };
  const mip = (set, px) => { for (let i = set.length - 1; i >= 0; i--) if (set[i].height >= px) return set[i]; return set[0]; };
  const fit = cv => { const d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); } const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H); return [x, W, H, d]; };

  // ---- the field: one robot alone, then rows and rows as the camera pulls back and rises. Drones cross above once there is a crowd to fly over
  const field = document.querySelector('.v-field'), people = [], drones = [];
  let seed = 20261106; const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let r = 0; r < 22; r++) { const Z = -1.5 + r * .62, off = r % 2 ? .38 : 0; for (let c = -30; c <= 30; c++) { const X = (c + off) * .76 + (rnd() - .5) * .3; if (Math.abs(X) < .62 && Z < 1.3) continue; people.push({ X, Z: Z + (rnd() - .5) * .16, flip: rnd() > .5, delay: rnd() }); } }
  people.push({ X: 0, Z: 1, flip: false, delay: 0, one: true }); people.sort((a, b) => b.Z - a.Z);
  // where each drone ends up is the right of the sky, clear of the words
  [[1.16, .15, .17, 1], [1.44, .05, .085, 1], [1.2, .32, .095, .86], [1.0, .06, .05, .7], [1.58, .27, .06, 1.1]].forEach((d, i) => drones.push({ x: d[0], y: d[1], h: d[2], v: d[3], ph: i * 1.7 }));
  let hum = null, dro = null;
  const paintField = (t, now) => { if (!hum) return; const [x, W, H] = fit(field), phone = W < 720, f = H * (phone ? .62 : .72), up = smooth(t, 0, .5), cam = lerp(0, 3.1, t), hy = H * lerp(.02, phone ? .54 : .44, up), camH = (H * (phone ? .9 : .93) - H * .02) / f;
    const asp = hum[0].width / hum[0].height, crowd = smooth(t, .4, .92), shade = [];
    // the floor: lighter toward the viewer, gone at the horizon, so the far rows sink into the dark
    if (t > .02) { const g = x.createLinearGradient(0, hy, 0, H); g.addColorStop(0, 'rgba(38,54,92,0)'); g.addColorStop(.5, 'rgba(38,54,92,.36)'); g.addColorStop(1, 'rgba(38,54,92,.62)'); x.globalAlpha = smooth(t, .05, .5); x.fillStyle = g; x.fillRect(0, hy, W, H - hy); }
    for (const q of people) { const d = q.Z + cam; if (d < .45) continue; const s = f / d, footY = hy + camH * s, h = s, w = h * asp, cx = W / 2 + q.X * s * (phone ? .72 : 1); if (cx + w < 0 || cx - w > W || footY - h > H) continue;
      const fog = Math.pow(clamp(1.06 - d / 11.5), 1.4), a = q.one || q.Z < 1.3 ? fog * smooth(d, .45, .6) : fog * smooth(crowd, q.delay * .86, q.delay * .86 + .1);   // the rows behind come on one robot at a time; the rows in front walk in from the edges
      if (a < .012) continue;
      x.globalAlpha = a * .55; x.fillStyle = '#080d18'; x.beginPath(); x.ellipse(cx, footY - h * .004, w * .62, h * .022, 0, 0, 6.2832); x.fill();
      x.globalAlpha = a; const im = mip(hum, h * 2); if (q.flip) { x.save(); x.translate(cx, 0); x.scale(-1, 1); x.drawImage(im, -w / 2, footY - h, w, h); x.restore(); } else x.drawImage(im, cx - w / 2, footY - h, w, h); }
    if (dro) { const k = smooth(t, .45, .85), asp2 = dro[0].width / dro[0].height; for (const q of drones) { const h = H * q.h * (phone ? .55 : 1), w = h * asp2, X = W * (q.x - lerp(0, .52 * q.v, t)), bob = reduce ? 0 : Math.sin(now / 1100 + q.ph) * H * .004, sky = phone ? lerp(.3, .46, q.y / .32) : q.y + .03; x.globalAlpha = k * clamp(.4 + q.h * 3.6); const im = mip(dro, h * 2); x.drawImage(im, X - w / 2, H * sky + bob, w, h); } }
    x.globalAlpha = 1; };

  // ---- the pieces: the robot cut into squares, which drift apart until they stand in even rows
  const pieces = document.querySelector('.v-pieces'); let body = null, cells = [];
  if (pieces) { const C = +pieces.dataset.cols, R = +pieces.dataset.rows, m = pieces.dataset.mask; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (m[r * C + c] === '1') cells.push({ c, r, wait: rnd() }); }
  const paintPieces = p => { if (!body) return; const [x, W, H] = fit(pieces), phone = W < 900, C = +pieces.dataset.cols, R = +pieces.dataset.rows, n = cells.length, s = smooth(p, .14, .8);
    const box = phone ? { x: W * .05, y: H * .1, w: W * .9, h: H * .36 } : { x: W * .46, y: H * .1, w: W * .5, h: H * .8 }, bh = phone ? H * .42 : H * .84, T = bh / R, cx = phone ? W * .5 : W * .71, top = phone ? H * .08 : H * .08, sw = body.width / C, sh = body.height / R;
    let tc = Math.max(1, Math.round(Math.sqrt(n * box.w / box.h))), tr = Math.ceil(n / tc); while (tc * tr < n) tc++; const pitch = Math.min(box.w / tc, box.h / tr), tt = Math.min(T, pitch * .86), gx = box.x + (box.w - tc * pitch) / 2, gy = box.y + (box.h - tr * pitch) / 2;
    cells.forEach((q, i) => { const k = smooth(s, q.wait * .4, q.wait * .4 + .6), hx = cx + (q.c - C / 2) * T, hy = top + q.r * T, rowN = Math.floor(q.goal / tc) === tr - 1 ? n - tc * (tr - 1) : tc, tx = gx + (tc - rowN) * pitch / 2 + (q.goal % tc) * pitch + (pitch - tt) / 2, ty = gy + Math.floor(q.goal / tc) * pitch + (pitch - tt) / 2, S = lerp(T, tt, k), X = lerp(hx, tx, k), Y = lerp(hy, ty, k);
      if (k > .001) { x.globalAlpha = k * .14; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(X, Y, S, S, S * .1); x.fill(); x.globalAlpha = 1; }
      x.drawImage(body, q.c * sw, q.r * sh, sw, sh, X, Y, S + .4, S + .4); }); };

  const wanted = el => { if (!el) return false; const b = el.getBoundingClientRect(); return b.bottom > -innerHeight * 1.5 && b.top < innerHeight * 2.5; };
  let asked = false; const ask = () => { if (asked) return; asked = true; load('media/robots/humanoid.webp').then(i => { if (i) { hum = mips(i); body = i; if (pieces) { const n = cells.length, g = cells.map((_, k) => k); for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [g[k], g[j]] = [g[j], g[k]]; } cells.forEach((q, k) => { q.goal = g[k]; }); } dirty = true; finish(); } }); load('media/robots/drone.webp').then(i => { if (i) { dro = mips(i); dirty = true; finish(); } }); };
  let dirty = true;
  const finish = () => { if (reduce) { paintField(1, 0); paintPieces(1); } };
  if (reduce) { ask(); addEventListener('resize', finish); return; }

  // ---- the timeline
  const items = [...run.querySelectorAll('[data-o]')].map(el => ({ el, o: el.dataset.o.split(' ').map(Number), v: -1, inner: !el.classList.contains('v-layer') }));
  const films = [...run.querySelectorAll('.v-layer')].map(l => ({ l, v: l.querySelector('video'), on: l.classList.contains('v-street'), asked: l.classList.contains('v-street') })).filter(f => f.v);
  const many = run.querySelector('.v-many');
  const tick = now => { requestAnimationFrame(tick); const r = run.getBoundingClientRect(), span = r.height - innerHeight, seen = r.bottom > 0 && r.top < innerHeight;
    if (seen) { const p = clamp(-r.top / span);
      for (const it of items) { const [a, b, c, d] = it.o, v = smooth(p, a, b) * (1 - smooth(p, c, d)); if (Math.abs(v - it.v) > .002) { it.v = v; it.el.style.opacity = v.toFixed(3); it.el.style.visibility = v < .004 ? 'hidden' : 'visible'; } }
      for (const f of films) { const o = +f.l.style.opacity, on = f.l.classList.contains('v-street') ? p < .17 : o > .01, soon = o > 0 || (p > (+f.l.dataset.o.split(' ')[0]) - .06 && p < (+f.l.dataset.o.split(' ')[3]));
        if (soon && !f.asked) { f.asked = true; f.v.preload = 'auto'; f.v.load(); }
        if (on !== f.on) { f.on = on; if (on) { if (f.v.ended) f.v.currentTime = 0; const q = f.v.play(); if (q) q.catch(() => {}); } else f.v.pause(); } }
      if (+many.style.opacity > .004) paintField(clamp((p - .375) / .25), now); }
    if (wish) { const w = wish.getBoundingClientRect(), h = innerHeight; if (w.bottom > 0 && w.top < h) { const k = clamp(1 - w.top / h); sun.style.transform = `translateY(${(-k * k * 66.67).toFixed(2)}%)`; paintPieces(clamp(-w.top / (w.height - h))); } }
  };
  new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) ask(); }), { rootMargin: '2000px' }).observe(run);
  ask(); requestAnimationFrame(tick);
})();
