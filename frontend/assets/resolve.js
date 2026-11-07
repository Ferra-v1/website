// The Resolve: a pixel robot swells into its real photo, holds, then breaks back into dots. Dots swell 1400ms, hold 1000ms, 1400ms back.
// It runs in four places only: the Home row, the start of the Home film, the Vision parade once, and the nav card on hover. tools/system.cjs fails it anywhere else.
//
// Markup. Put data-resolve="<loop name>" on the robot's box, with the robot's canvas inside it:
//   <figure data-resolve="hero-cobot-loop"><canvas class="dotbot" data-bot="hero-cobot-loop" data-tone="ink"></canvas></figure>
//   Hover or tap then runs that robot. data-resolve-hover="off" turns that off.
// A row that sweeps: put data-resolve-sweep on the box around them. From 60% visible it runs left to right, one robot at a time, 600ms apart, with 8s rest between rounds, and stops off screen.
//   <div class="h-six" data-resolve-sweep> ...robots... </div>
// From a script:
//   const r = FerraResolve.get(el);   r.run() plays the whole thing and returns a promise (Vision: call it once at stop one).   r.set(k) draws it at k, 0 dots to 1 photo, for scroll-tied use.
//   FerraResolve.sweep(box) starts a sweep by hand.
// The film draws its own arm: FerraResolve.photo('media/robots/arm-film.webp') returns a promise of the image, then, inside the film's paint:
//   FerraResolve.draw(ctx, { photo, x, y, w, h, dots: [cx, cy, r, cx, cy, r, ...], p, k, color });   x y w h are the photo's box and dots its dots, in that context's pixels; p is the distance between dots; k is 0 dots to 1 photo.
//
// The robot's canvas comes in two kinds. A canvas.dotbot needs nothing more: dotbot.js publishes what this script reads. A page with its own painter (the old .h-bc row) sets cv._rz to an object with:
//   frames  one per frame: a Float32Array of x, y, size with its second colour's dots after index .n, or a list of {x, y, s, acc}
//   n, f    frame count and the frame on screen now, kept up to date by the painter
//   p, dx, dy  pixels per dot, and the grid's offset in dots
//   colors  [base, second], and rad, the dot radius as a share of p at size 1 (default .5)
// All nine loops have their own files in media/dots/loops: <name>.js for white dots, <name>-ink.js for cobalt dots. hero-arm-loop-ink is already shaded for light grounds, so a port of the old row reads it like the others, with no special case for the arm and no FERRA_ARM.
// While it runs the canvas is hidden and its loop keeps playing underneath. The dots morph to frame 0, which is the frame the photo was cut from, and morph back to wherever the loop has reached, so nothing jumps.
// The photo for a loop is media/dots/real/<loop name>.webp, aligned to the loop's whole grid. Reduced motion: the pixel robot stays still and nothing here runs.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IN = 1400, HOLD = 1000, OUT = 1400, MORPH = 500, GAP = 600, REST = 8000, FROM = .6;
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v, smooth = t => t * t * (3 - 2 * t);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const hash = (x, y) => ((x * 73 + y * 151) % 97) / 97;
  const MAXR = .78;   // a dot's radius at the end of its swell, as a share of the distance between dots: neighbours have merged well before this

  const images = {};
  const photo = src => images[src] || (images[src] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  const photoFor = name => 'media/dots/real/' + name + '.webp';

  // how far one dot has swollen at k: a slight random stagger, the top a little later than the bottom
  const swell = (k, x, y, rows) => smooth(clamp((k - (hash(x, y) * .3 + (1 - y / rows) * .1)) / .6));

  // one frame's sizes on the dot grid, so two frames can be mixed cell by cell
  const gridOf = (src, f, W, H, into) => {
    const size = into.size.fill(0), acc = into.acc.fill(0), fr = src.frames[f]; if (!fr) return into;
    if (fr.length !== undefined && typeof fr[0] === 'number') { for (let i = 0; i < fr.length; i += 3) { const c = (fr[i + 1] | 0) * W + (fr[i] | 0); if (c >= 0 && c < size.length) { size[c] = fr[i + 2]; acc[c] = i >= fr.n ? 1 : 0; } } }
    else for (const p of fr) { const c = p.y * W + p.x; if (c < size.length) { size[c] = p.s; acc[c] = p.acc ? 1 : 0; } }
    return into;
  };

  class Resolve {
    constructor(el) { this.el = el; this.cv = el.matches('canvas') ? el : el.querySelector('canvas'); this.name = el.dataset.resolve; this.src = this.name ? photoFor(this.name) : ''; this.running = null; this.shown = false; }
    ready() { const s = this.cv && this.cv._rz; return !!(s && s.frames && s.frames.length && s.p); }
    overlay() {
      if (this.o) return this.o;
      const box = this.cv.parentElement; if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
      const o = this.o = document.createElement('canvas'); o.className = 'rz'; o.setAttribute('aria-hidden', 'true'); box.appendChild(o);
      return o;
    }
    place() {
      // the overlay covers the robot's box and a margin, so dots swelling at the edge are never cut
      const o = this.overlay(), s = this.cv._rz, dpr = Math.min(2, devicePixelRatio || 1), box = this.cv.parentElement, a = this.cv.getBoundingClientRect(), b = box.getBoundingClientRect(), pad = Math.ceil(s.p * 3);
      const W = Math.round((a.width + pad * 2) * dpr), H = Math.round((a.height + pad * 2) * dpr);
      if (o.width !== W || o.height !== H) { o.width = W; o.height = H; }
      Object.assign(o.style, { left: a.left - b.left - box.clientLeft - pad + 'px', top: a.top - b.top - box.clientTop - pad + 'px', width: a.width + pad * 2 + 'px', height: a.height + pad * 2 + 'px' });
      this.pad = pad; this.dpr = dpr;
    }
    show(on) {
      if (on === this.shown) return; this.shown = on;
      if (on) { this.place(); this.o.style.display = 'block'; this.cv.style.visibility = 'hidden'; }
      else { if (this.o) this.o.style.display = 'none'; this.cv.style.visibility = ''; }
    }
    paint(k, m, f) {
      const s = this.cv._rz, c = this.o.getContext('2d'), p = s.p, im = this.im, W = s.w || 112;
      const rows = s.h || (im ? Math.round(W * im.naturalHeight / im.naturalWidth) : 256), H = Math.max(rows, 256), dx = s.dx || 0, dy = s.dy || 0, rad = s.rad || .5;
      if (!this.gF || this.gF.w !== W) { const mk = () => ({ size: new Float32Array(W * H), acc: new Uint8Array(W * H), w: W }); this.gF = mk(); this.g0 = mk(); gridOf(s, 0, W, H, this.g0); this.lastF = -1; }
      if (f !== this.lastF) { gridOf(s, f, W, H, this.gF); this.lastF = f; }
      const pw = W * p, ph = rows * p, left = dx * p, top = dy * p;
      c.setTransform(this.dpr, 0, 0, this.dpr, this.pad * this.dpr, this.pad * this.dpr);
      c.clearRect(-this.pad, -this.pad, pw + this.pad * 2 + left, ph + this.pad * 2 + top);
      if (k < 1) {
        const sizeF = this.gF.size, size0 = this.g0.size, accF = this.gF.acc, acc0 = this.g0.acc, paths = new Map(), mask = new Path2D(), pm = p * MAXR; let any = false;
        const style = (sz, a) => { if (s.style) return s.style(sz, a); return s.colors ? s.colors[a] : '#2847ce'; };
        for (let y = 0; y < H; y++) for (let x = 0, i = y * W; x < W; x++, i++) {
          const a = sizeF[i], b = size0[i]; if (!a && !b) continue;
          const sz = a + (b - a) * m; if (sz <= 0) continue;
          const g = swell(k, x, y, rows), r0 = p * rad * sz, r = r0 + (pm - r0) * g, cx = (x + .5 + dx) * p, cy = (y + .5 + dy) * p, ac = m > .5 ? acc0[i] : accF[i];
          const key = ac * 10 + Math.round(sz * 9); let path = paths.get(key);
          if (!path) { path = new Path2D(); path.color = style(sz, ac); paths.set(key, path); }
          path.moveTo(cx + r, cy); path.arc(cx, cy, Math.max(.35, r), 0, 6.2832);
          if (g > 0) { const w = r * Math.min(1, g * 3); mask.moveTo(cx + w, cy); mask.arc(cx, cy, w, 0, 6.2832); any = true; }
        }
        c.globalAlpha = 1 - smooth(clamp((k - .55) / .35));
        if (c.globalAlpha > 0) paths.forEach(path => { c.fillStyle = path.color; c.fill(path); });
        c.globalAlpha = 1;
        if (any && im) { c.save(); c.clip(mask); c.drawImage(im, left, top, pw, ph); c.restore(); }
      }
      // what the dots never covered, such as thin cables, comes in last
      if (im) { const a = k >= 1 ? 1 : smooth(clamp((k - .82) / .18)); if (a > 0) { c.globalAlpha = a; c.drawImage(im, left, top, pw, ph); c.globalAlpha = 1; } }
    }
    // scroll-tied: k 0 is dots and 1 is the photo. The dots morph to frame 0 in the first third
    set(k) {
      if (reduce || !this.ready()) return; k = clamp(k);
      if (!this.im) { photo(this.src).then(im => { this.im = im; }); if (k <= 0) return; }
      if (k <= 0) { this.show(false); return; }
      this.show(true); this.paint(k, clamp(k * 3), this.cv._rz.f || 0);
    }
    run() {
      if (reduce || !this.ready()) return Promise.resolve();
      if (this.running) return this.running;
      this.running = photo(this.src).then(im => new Promise(done => {
        if (!im) return done();
        this.im = im; this.show(true);
        const s = this.cv._rz, start = s.f || 0; let t0 = 0;
        const frame = t => { if (!t0) t0 = t; const e = t - t0; let k, m, f;
          if (e < IN) { k = e / IN; m = clamp(e / MORPH); f = start; }
          else if (e < IN + HOLD) { k = 1; m = 1; f = 0; }
          else { const b = e - IN - HOLD; k = 1 - b / OUT; f = s.f || 0; m = 1 - clamp((b - (OUT - MORPH)) / MORPH); if (k <= 0) return done(); }
          this.place(); this.paint(k, m, f); requestAnimationFrame(frame); };
        requestAnimationFrame(frame);
      })).then(() => { this.show(false); this.running = null; active.delete(this); });
      active.add(this);
      return this.running;
    }
  }

  const active = new Set();
  const idle = () => Promise.all([...active].map(r => r.running));
  const get = el => el._resolve || (el._resolve = new Resolve(el));

  function sweep(box) {
    const items = [...box.querySelectorAll('[data-resolve]')].map(get); let seen = false, going = false;
    const round = async () => { if (going) return; going = true;
      while (seen) {
        for (const r of items) { if (!seen) break; await idle(); if (!seen) break; if (r.ready()) { await r.run(); await wait(GAP); } }
        if (seen) await wait(REST);
      }
      going = false; };
    if (reduce) return;
    const io = new IntersectionObserver(es => es.forEach(en => { const need = Math.min(FROM, FROM * innerHeight / Math.max(1, en.boundingClientRect.height));
      if (en.intersectionRatio >= need) { if (!seen) { seen = true; round(); } } else if (en.intersectionRatio < need * .4) seen = false; }), { threshold: [0, .05, .1, .15, .2, .25, .3, .35, .4, .45, .5, .55, .6, .65, .7, .8, .9, 1] });
    io.observe(box);
  }

  // the film: a photo broken into dots the film paints itself
  function draw(c, o) {
    const k = clamp(o.k), d = o.dots, p = o.p, pm = p * MAXR, mask = new Path2D(), dots = new Path2D(); let any = false;
    if (k < 1 && d) {
      for (let i = 0; i < d.length; i += 3) { const cx = d[i], cy = d[i + 1], gx = cx / p, gy = (cy - (o.y || 0)) / p, rows = o.h / p;
        const g = smooth(clamp((k - (hash(gx | 0, gy | 0) * .3 + (1 - gy / rows) * .1)) / .6)), r0 = d[i + 2], r = r0 + (pm - r0) * g;
        dots.moveTo(cx + r, cy); dots.arc(cx, cy, r, 0, 6.2832);
        if (g > 0) { const w = r * Math.min(1, g * 3); mask.moveTo(cx + w, cy); mask.arc(cx, cy, w, 0, 6.2832); any = true; } }
      const a0 = c.globalAlpha; c.globalAlpha = a0 * (1 - smooth(clamp((k - .55) / .35)));
      if (c.globalAlpha > 0) { c.fillStyle = o.color || '#fff'; c.fill(dots); }
      c.globalAlpha = a0;
      if (any && o.photo) { c.save(); c.clip(mask); c.drawImage(o.photo, o.x, o.y, o.w, o.h); c.restore(); }
    }
    if (o.photo) { const a = k >= 1 ? 1 : smooth(clamp((k - .82) / .18)); if (a > 0) { const a0 = c.globalAlpha; c.globalAlpha = a0 * a; c.drawImage(o.photo, o.x, o.y, o.w, o.h); c.globalAlpha = a0; } }
  }

  const wire = () => {
    // the photo loads when its robot comes near. A hidden panel's card waits until the panel opens.
    const near = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; near.unobserve(en.target); const r = get(en.target); if (r.src) photo(r.src); }), { rootMargin: '1200px' });
    document.querySelectorAll('[data-resolve]').forEach(el => { near.observe(el); if (reduce || el.dataset.resolveHover === 'off') return;
      el.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') get(el).run(); });
      if (!el.closest('a')) el.addEventListener('click', () => get(el).run()); });
    document.querySelectorAll('[data-resolve-sweep]').forEach(sweep);
  };
  window.FerraResolve = { get, sweep, draw, photo, IN, HOLD, OUT };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', wire) : wire();
})();
