// Ferra dot robots: every robot on the site is drawn in code as a halftone field of dots.
// Markup: <canvas class="dotbot" data-bot="arm" data-tone="light|ink" data-anim="assemble|static" data-scan="1"></canvas>
// light = white dots with cyan trim, for blue backgrounds; ink = cobalt dots only, for light backgrounds (no cyan on white: its trim
// dots stay cobalt and the pointer and scan highlight is the brighter cobalt #2847ce). Cyan stays for dark backgrounds.
// Names: arm, arm2, cobot, amr, pallet, delivery, cleaning, cell, cartons; "-s" coarse (46 columns), plain (72), "-l" fine (112, assets/dots-l.js).
// A name ending in "-loop" is a moving robot (media/dots/seq.js, played at 12 frames a second); a missing name falls back to the nearest still.
// hero-cobot-loop, hero-amr-loop, hero-pallet-loop, hero-delivery-loop and hero-cleaning-loop each travel in their own file, one per tone: media/dots/loops/<name>.js is
// shaded for data-tone="light" and <name>-ink.js for data-tone="ink". The file loads when a canvas naming it comes near the screen, so a page without one pays nothing.
// Inside .rstage (core.robot_stage) the canvas is sized from its box height and the empty rows under the robot are cut, so the lowest dots touch the hairline;
// the footer fleet (.ff-bot) cuts them too, so all six robots stand on one line. On the home hero (.h-stage) the stage's scan line (.h-scan)
// brightens a moving robot's live frame as it passes.
// Inside an element with data-dot-hover, dots near the pointer grow and take the accent colour (pointer devices only).
(() => {
  const D = window.FERRA_DOTS || {}, Q = window.FERRA_SEQ = window.FERRA_SEQ || {}, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const TONES = { light: { base: [255, 255, 255], acc: [150, 232, 255], hi: [150, 232, 255], floor: .28 }, ink: { base: [30, 51, 155], acc: [30, 51, 155], hi: [40, 71, 206], floor: .46 } };
  const FALL = { cell: 'arm2', cartons: 'pallet', 'cell-loop': 'cell', 'cobot-loop': 'cobot-l', 'arm2-loop': 'arm2', 'pallet-loop': 'pallet', 'arm-loop': 'arm', 'hero-cobot-loop': 'cobot-l', 'hero-amr-loop': 'amr-l', 'hero-pallet-loop': 'pallet-l', 'hero-delivery-loop': 'delivery-l', 'hero-cleaning-loop': 'cleaning-l' };
  const pick = n => { const seen = new Set(); while (n && !seen.has(n)) { seen.add(n); if (D[n]) return D[n]; if (n.endsWith('-l')) n = n.slice(0, -2); else n = FALL[n] || (n.endsWith('-s') && FALL[n.slice(0, -2)] ? FALL[n.slice(0, -2)] + '-s' : null); } return null; };
  const parse = b => b.pts || (b.pts = b.d.split(';').map(s => { const [x, y, L, A, acc, ed] = s.split(',').map(Number); return { x, y, L: L / 100, A: A / 100, acc, ed: ed / 100, r: Math.random() }; }));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const ASM = 2.2;   // seconds the assemble takes, delays included

  // moving robots: decode the sprite once into one point list per frame
  const seqs = {};
  function loadSeq(name) {
    if (seqs[name]) return seqs[name];
    const m = Q[name]; if (!m) return null;
    const s = seqs[name] = { w: m.w, h: m.h, n: m.frames, fps: m.fps || 12, frames: null, wait: [] };
    const im = new Image(), ia = new Image(); let got = 0;
    const done = () => { if (++got < 2) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
      const per = m.per || Math.floor(im.width / m.w), rnd = new Float32Array(m.w * m.h).map(Math.random);
      s.frames = [];
      for (let f = 0; f < m.frames; f++) { const ox = (f % per) * m.w, oy = Math.floor(f / per) * m.h, pts = [];
        for (let y = 0; y < m.h; y++) for (let X = 0; X < m.w; X++) { const i = ((oy + y) * c.width + ox + X) * 4, v = sz[i]; if (v) pts.push({ x: X, y, s: v / 252, acc: ac[i] > 127 ? 1 : 0, r: rnd[y * m.w + X] }); }
        s.frames.push(pts); }
      s.wait.forEach(f => f()); s.wait = []; };
    im.onload = ia.onload = done; im.onerror = ia.onerror = () => { delete Q[name]; s.wait.forEach(f => f()); };
    im.src = m.src; ia.src = m.acc;
    return s;
  }

  // moving robots in their own file: a plain script tag, which also works from file:// and under the site's same-origin policy
  const OWN = /^hero-(cobot|amr|pallet|delivery|cleaning)-loop$/, own = {};
  const ownKey = cv => { const n = cv.dataset.bot || ''; return OWN.test(n) ? n + (cv.dataset.tone === 'light' ? '' : '-ink') : n; };
  function fetchOwn(key, then) {
    const o = own[key] || (own[key] = { wait: [], done: false });
    if (then) o.wait.push(then);
    if (o.tag || o.done) return;
    const s = o.tag = document.createElement('script'); s.src = 'media/dots/loops/' + key + '.js';
    s.onload = s.onerror = () => { o.done = true; o.wait.splice(0).forEach(f => f()); };
    document.head.appendChild(s);
  }

  // a name this page's dot file does not hold (a script swapped it in): load the full sets once, then draw again, so no canvas stays blank
  let fulls = null; const waiting = new Set();
  function full(cv) { waiting.add(cv); if (fulls) return; fulls = 0;
    ['assets/dots.js', 'assets/dots-l.js'].forEach(src => { const s = document.createElement('script'); s.src = src;
      s.onload = s.onerror = () => { if (++fulls < 2) return; Object.assign(D, window.FERRA_DOTS || {}); window.FERRA_DOTS = D; const w = [...waiting]; waiting.clear(); w.forEach(c => draw(c)); };
      document.head.appendChild(s); }); }

  // many robots on one page: static ones paint once per name and size, then copy the bitmap
  const MANY = () => document.querySelectorAll('canvas.dotbot').length > 30, cache = {};

  // resume: redraw where it was (back on screen, or woken by the pointer) without assembling again
  function draw(cv, resume) {
    const name = cv.dataset.bot || '', tone = TONES[cv.dataset.tone || 'ink'], light = cv.dataset.tone === 'light';
    const key = ownKey(cv);
    if (OWN.test(name) && !Q[key] && !(own[key] && own[key].done)) { fetchOwn(key, () => { if (ownKey(cv) === key) draw(cv, resume); }); return; }
    let sq = name.endsWith('-loop') && Q[key] ? loadSeq(key) : null;
    if (sq && !sq.frames) { if (!sq.wait.includes(cv._redo || (cv._redo = () => draw(cv, resume)))) sq.wait.push(cv._redo); if (Q[key]) return; sq = null; }
    const bot = sq ? { w: sq.w, h: sq.h } : pick(name); if (!bot) { full(cv); return; }
    const pts = sq ? null : parse(bot);
    // standing robots: cut the empty rows under the lowest dot, so the robot's feet sit on the box's bottom edge
    const box = cv.parentElement, stand = box && (box.classList.contains('rs-bot') || box.classList.contains('ff-bot'));
    if (stand && pts && bot.my === undefined) { let m = 0; for (const p of pts) if (p.y > m) m = p.y; bot.my = m; }
    const rows = stand && pts ? bot.my + 1 : bot.h;
    const dpr = Math.min(2, devicePixelRatio || 1);
    let cw;
    if (box && box.classList.contains('rs-bot')) {
      // robot_stage: the box sets the height; the width follows the robot's own grid, never wider than the box
      const bh = box.clientHeight, bw = box.clientWidth; if (!bh || !bw) return;
      cw = Math.min(bw, bh * bot.w / rows); cv.style.width = cw + 'px'; cv.style.marginBottom = '0px';   // the rows are already cut here: no page script may pull the robot below its line
    } else cw = cv.clientWidth;
    if (!cw) return; const pitch = cw / bot.w, ch = pitch * rows;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } cv.style.height = ch + 'px';
    // the home hero's scan line, read from the stage each frame: its position in this robot's dot rows, or null while it rests
    const stg = cv.closest('.h-stage'), sl = stg && stg.querySelector('.h-scan');
    const extScan = () => { if (!sl || reduce || sl.style.opacity !== '1') return null; return (sl.getBoundingClientRect().top - cv.getBoundingClientRect().top) / pitch; };
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const assemble = cv.dataset.anim === 'assemble' && !reduce && !resume, scan = cv.dataset.scan && !reduce, play = sq && !reduce;
    const hov = fine && cv.closest('[data-dot-hover]');
    cv._st = { pitch, cw, ch, bot, tone, light };
    // dot size: silhouette floor, then shading (bright plastic grows dots on blue, darker parts grow dots on paper), then outline boost
    const size = p => { if (p.s !== undefined) return p.s; const shade = light ? Math.pow(p.L, .9) : Math.pow(1 - p.L, .8); return p.A * Math.min(1, tone.floor + (1 - tone.floor) * shade + p.ed * .35); };
    const heat = hov ? (cv._heat && cv._heat.length === bot.w * bot.h ? cv._heat : (cv._heat = new Float32Array(bot.w * bot.h))) : null;
    const paint = (c, el, list, dt) => {
      c.clearRect(0, 0, cw, ch);
      const sy = scan ? ((el * .22) % 1.6 - .3) * bot.h : -99, ptr = hov && cv._ptr, ey = extScan();
      let warm = false;
      for (const p of list) {
        if (p.y >= rows) continue;
        const delay = assemble ? p.y / bot.h * .7 + p.r * .5 : 0, k = assemble ? ease(Math.min(1, Math.max(0, (el - delay) / .9))) : 1;
        if (k <= 0) continue;
        const sz = size(p), dy = ey === null ? 99 : p.y + .5 - ey;
        const near = Math.max(0, 1 - Math.abs(p.y - sy) / 3.5, 1 - Math.abs(dy) / 3, dy < 0 ? Math.max(0, 1 + dy / 18) * .28 : 0);
        let h = 0;
        if (heat) { const i = p.y * bot.w + p.x, px = (p.x + .5) * pitch, py = (p.y + .5) * pitch;
          const hit = ptr && Math.hypot(px - ptr.x, py - ptr.y) < 36;
          h = heat[i] = hit ? Math.min(1, heat[i] + dt / 120) : Math.max(0, heat[i] - dt / 400); if (h > 0) warm = true; }
        const rad = pitch * .44 * sz * (1 + near * .45) * (1 + h * .35) * (.35 + .65 * k);
        const ox = (1 - k) * (p.r - .5) * pitch * 26, oy = (1 - k) * (p.r * 1.7 - 1.1) * pitch * 18;
        const b = p.acc ? tone.acc : tone.base, mix = Math.max(h, ey === null || p.acc ? 0 : Math.min(1, near * 1.3) * .85), cc = mix ? b.map((v, j) => v + (tone.hi[j] - v) * mix) : b;
        const al = (light ? .55 + .45 * sz : .45 + .55 * sz) * k;
        c.fillStyle = `rgba(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0},${Math.min(1, al + near * .4 + h * .3)})`;
        c.beginPath(); c.arc((p.x + .5) * pitch + ox, (p.y + .5) * pitch + oy, Math.max(.35, rad), 0, 6.283); c.fill();
      }
      return warm;
    };
    // a static robot on a crowded page: one cached bitmap per name, tone and size
    if (!assemble && !scan && !play && !hov && MANY()) {
      const key = name + '|' + cv.dataset.tone + '|' + cw + '|' + dpr;
      let img = cache[key];
      if (!img) { img = cache[key] = document.createElement('canvas'); img.width = cv.width; img.height = cv.height; const x = img.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); paint(x, 99, sq ? sq.frames[0] : pts, 0); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cv._live = false; return;
    }
    let t0 = null, last = null;
    const frame = t => {
      if (t0 === null) t0 = t; const el = Math.max(0, (t - t0) / 1000), dt = last === null ? 16 : Math.min(64, t - last); last = t;
      const asmOn = assemble && el < ASM;
      const list = sq ? sq.frames[play && !asmOn ? Math.floor(((cv._f0 || 0) + (el - (assemble ? ASM : 0)) * sq.fps) % sq.n) : 0] : pts;
      const warm = paint(ctx, el, list, dt);
      cv._live = asmOn || scan || play || warm || !!(hov && cv._ptr);
      if (cv._live && cv._vis !== false) cv._raf = requestAnimationFrame(frame);
    };
    // paint the first frame now, so a redraw never flashes an empty canvas
    cancelAnimationFrame(cv._raf); frame(performance.now());
  }

  const all = () => document.querySelectorAll('canvas.dotbot');
  // draw on arrival; robots that keep moving (scan, sequences, hover) pause off screen and resume where they were
  const io = new IntersectionObserver(es => es.forEach(en => { const cv = en.target;
    if (en.isIntersecting) { cv._vis = true; if (!cv._seen) { cv._seen = 1; draw(cv); } else if (cv._live === undefined || cv._live) { draw(cv, true); } }
    else { cv._vis = false; cancelAnimationFrame(cv._raf); } }), { rootMargin: '80px' });
  // pointer appraisal: dots within 36px of the pointer grow and shift to the accent colour, then ease back
  const hover = () => { if (!fine) return; document.querySelectorAll('[data-dot-hover]').forEach(w => {
    const cvs = () => w.querySelectorAll('canvas.dotbot');
    w.addEventListener('pointermove', ev => cvs().forEach(cv => { const r = cv.getBoundingClientRect(); cv._ptr = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      if (!cv._live && cv._vis !== false) { cv._live = true; draw(cv, true); } }), { passive: true });
    w.addEventListener('pointerleave', () => cvs().forEach(cv => { cv._ptr = null; }), { passive: true }); }); };
  // start the download of an own-file robot a screen or so early, so it is ready when it arrives
  const early = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; early.unobserve(en.target); fetchOwn(ownKey(en.target)); }), { rootMargin: '1200px' });
  const start = () => { all().forEach(cv => { io.observe(cv); if (OWN.test(cv.dataset.bot || '')) early.observe(cv); }); hover(); };
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => all().forEach(cv => { if (cv._seen) { cv.dataset.anim = 'static'; draw(cv); } }), 150); });
  window.FerraDots = { draw, start, pick };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
