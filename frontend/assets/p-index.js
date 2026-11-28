// Robot Index page, the stage (pages/robot_index.py opening() and lookup(); scenes 1 to 4 of design/ANIMATED-JOURNEY.md). The note, the board and the scenes below the tool
// are assets/p-index-show.js.
// One canvas in the opening's pinned box draws every cell on the graphics chip (point sprites), from one list of cells worked out here each time the picture changes; without
// the graphics chip the same list is drawn on a plain canvas. Every price the index holds is one cell.
//   1. The swarm: the cells stand as the robot picked and drift on a clock, parting around the pointer or a finger. Scrolling sorts them into a skyline of all prices,
//      lowest to highest (auction sales at the foot of each column), then rushes the skyline together into the robot.
//   2. The robot is alive: it runs its work film, and a sideways drag turns it on its turntable (a squeeze where a shape has no turntable yet).
//   3. A pick bursts the robot into its cells, swirls them with trails and slams them together as the new robot, while the price rolls like a counter.
//   4. Age: the cells about to go heat to signal orange, break off, tumble, bounce and settle on the pile along paths worked out ahead, so the drag runs them forwards and
//      backwards exactly. The built year rolls in its own band over the pile, the robot's own motion slows with age, and letting go stamps the price (a short swell, kept
//      small so it never reaches the words around it) and ripples the pile.
// Numbers: est() is the price tool's asking formula, median asking = exp(level + model effect - slope x age), times the one auction share. pages/robot_index.py est() mirrors it.
// Speed rules: everything that builds follows the scroll or a control, both ways. Three things run on a clock: the swarm's drift, a finished robot's own film, and a short
// answer to a click, tap or release (under 0.6 seconds). A frame is drawn only when the picture changed; a resize only counts when the width changed.
// With reduced motion nothing pins and nothing runs on a clock: the finished robot stands in the tool and every pick lands at once.
(() => {
  const data = document.getElementById('ri-data'), sdEl = document.getElementById('ri-stage-data'); if (!data || !sdEl) return;
  const { L, P } = JSON.parse(data.textContent), SD = JSON.parse(sdEl.textContent);
  const $ = id => document.getElementById(id), Z = 1.2816;
  const usd = v => '$' + (Math.floor(v / 100 + .5) * 100).toLocaleString('en-US');
  const ageTxt = a => a === 0 ? 'New' : `${a} year${a === 1 ? '' : 's'} old`;
  const byId = Object.fromEntries(L.models.map(m => [m.id, m]));
  const set = (k, t) => document.querySelectorAll(`[data-v="${k}"]`).forEach(el => { if (el.textContent !== t) el.textContent = t; });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v, ease = t => t * t * (3 - 2 * t), mix = (a, b, t) => a + (b - a) * t, smooth = (a, b, v) => ease(clamp01((v - a) / (b - a)));
  // a fixed seed gives the same picture on every visit
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash2 = (x, y) => { let h = Math.imul(x + 374761393 | 0, 668265263) ^ Math.imul(y + 1013904223 | 0, 2246822519); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };

  const root = $('prices'), pin = root && root.querySelector('.ri-opin'), cv = $('ri-ocv'), lab = $('ri-lab'), ohead = root && root.querySelector('.ri-ohead');
  const look = $('lookup'), tool = look && look.querySelector('.ri-tool'), stageEl = $('ri-stage'), pxb = $('ri-pxb'), mk = $('ri-mk'), md = $('ri-md'), sl = $('ri-age'), ticksEl = $('ri-ticks');
  if (!pin || !cv || !tool || !stageEl || !sl) return;
  const lgd = $('ri-lgd'), pcap = $('ri-pcap'), tk = $('ri-kept'), tl = $('ri-lost');
  // colours: sky and white for what is kept, cobalt for depth, ink for the outline; signal orange comes from the section's own tokens
  const hex = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const tok = getComputedStyle(root), SIG = hex(tok.getPropertyValue('--sig')), SIGT = hex(tok.getPropertyValue('--sig-deep')), SIGD = hex(tok.getPropertyValue('--sig-deep'));
  // sand build: a light ground, so the brightest value is cobalt and the backing under each cell is the ground itself
  const WHITE = hex('#2847ce'), SKY = hex('#3A63D0'), COB = hex('#A3A7AE'), INK = hex(tok.getPropertyValue('--ri-g') || '#F2F4F7');
  const mixc = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
  // a cell's shade: 0 full, 1 half, 2 light, 3 trim. [colour, pattern]: pattern 0 is a solid tile, 1 a tile with holes, 2 a tile of small squares
  const SHADE = [[SKY, 0], [SKY, 1], [COB, 1], [WHITE, 0]];

  // ------------------------------------------------------------ the numbers
  function est(id, age) {
    const m = byId[id], f = L.fams[m.fam], se = m.se != null ? m.se : f.se;
    const at = a => { const ask = Math.exp(f.level + m.fe - f.b * a), s = Math.sqrt(f.sd * f.sd + se * se + Math.pow((a - f.am) * f.bse, 2)), likely = ask * L.share, w = Math.exp(Z * L.sd);
      return { age: a, ask, alo: ask * Math.exp(-Z * s), ahi: ask * Math.exp(Z * s), likely, llo: likely / w, lhi: likely * w }; };
    return Object.assign(at(age), { m, f, at });
  }
  const limOf = id => SD.lim[id] || [0, 30];
  // the reader's robot, from the address when it names one (#r=kuka-kr-210&y=2020), else the site's default
  const st = { id: L.default.id, age: L.now - L.default.year, spin: 0 };
  { const h = new URLSearchParams(location.hash.slice(1)), r = h.get('r'), y = +h.get('y'); if (r && byId[r]) st.id = r; if (y && y <= L.now && y >= L.now - 30) st.age = L.now - y; const [lo, hi] = limOf(st.id); st.age = Math.max(lo, Math.min(hi, st.age)); }
  let E = est(st.id, st.age);

  // ------------------------------------------------------------ the renderer: one list of square cells, drawn as point sprites (or as plain rectangles without the graphics chip)
  // a cell is 9 numbers: x, y (its centre, in the pinned box's own pixels), side, turn (radians), pattern, red, green, blue, alpha
  const F = 9, MAX = 20000, buf = new Float32Array(MAX * F); let nS = 0;
  const push = (x, y, s, rot, pat, c, a) => { if (nS >= MAX || !(s > .3) || !(a > .02)) return; const o = nS++ * F; buf[o] = x; buf[o + 1] = y; buf[o + 2] = s; buf[o + 3] = rot; buf[o + 4] = pat; buf[o + 5] = c[0]; buf[o + 6] = c[1]; buf[o + 7] = c[2]; buf[o + 8] = a; };
  const texts = [];   // every figure drawn in cells this frame, as a box: the no-cuts check reads these beside the page's own words
  let gl = null, glU = null, c2 = null, CW = 0, CH = 0, DPR = 1;
  function startRenderer() {
    try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (x) { gl = null; }
    if (gl) {
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
      const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p;attribute vec3 q;attribute vec4 c;uniform vec3 u;varying vec4 vc;varying vec3 vq;void main(){gl_Position=vec4(p.x/u.x*2.-1.,1.-p.y/u.y*2.,0.,1.);float k=q.y!=0.?1.4143:1.;gl_PointSize=max(1.,q.x*u.z*k);vc=c;vq=vec3(q.y,q.z,k);}');
      const fs = sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec4 vc;varying vec3 vq;void main(){vec2 t=(gl_PointCoord-.5)*vq.z;if(vq.x!=0.){float s=sin(vq.x),o=cos(vq.x);t=vec2(t.x*o+t.y*s,-t.x*s+t.y*o);}if(abs(t.x)>.5||abs(t.y)>.5)discard;if(vq.y>.5){vec2 g=fract((t+.5)*3.);float h=step(.3,g.x)*step(g.x,.7)*step(.3,g.y)*step(g.y,.7);if(vq.y<1.5){if(h>.5)discard;}else if(h<.5)discard;}gl_FragColor=vec4(vc.rgb*vc.a,vc.a);}');
      const pr = vs && fs && gl.createProgram(); if (pr) { gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); }
      if (!pr || !gl.getProgramParameter(pr, gl.LINK_STATUS)) gl = null;
      else { gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); const B = Float32Array.BYTES_PER_ELEMENT * F;
        [['p', 2, 0], ['q', 3, 2], ['c', 4, 5]].forEach(([n, k, o]) => { const l = gl.getAttribLocation(pr, n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, B, o * 4); });
        glU = gl.getUniformLocation(pr, 'u'); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
        cv.addEventListener('webglcontextlost', e => { e.preventDefault(); }); cv.addEventListener('webglcontextrestored', () => { startRenderer(); dirty = true; kick(); }); }
    }
    if (!gl) c2 = cv.getContext('2d');
  }
  const px = v => Math.max(1, Math.floor(v * DPR)) / DPR;   // a cell pitch in whole device pixels, so the gaps between cells are even
  function sizeCanvas() { const w = Math.round(CW * DPR), h = Math.round(CH * DPR); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
  function flush() {
    cv._cells = { buf, n: nS, F }; cv._texts = texts;
    if (gl) { gl.viewport(0, 0, cv.width, cv.height); gl.clear(gl.COLOR_BUFFER_BIT); if (!nS) return; gl.uniform3f(glU, CW, CH, DPR); gl.bufferData(gl.ARRAY_BUFFER, buf.subarray(0, nS * F), gl.DYNAMIC_DRAW); gl.drawArrays(gl.POINTS, 0, nS); return; }
    if (!c2) return; c2.setTransform(DPR, 0, 0, DPR, 0, 0); c2.clearRect(0, 0, CW, CH);
    // plain canvas: one path and one fill per shade, in the order the shades first appear (the outline is first)
    const g = new Map(); for (let i = 0; i < nS; i++) { const o = i * F, a = buf[o + 8] * (buf[o + 4] > 1.5 ? .3 : buf[o + 4] > .5 ? .8 : 1), k = `rgba(${Math.round(buf[o + 5] * 255)},${Math.round(buf[o + 6] * 255)},${Math.round(buf[o + 7] * 255)},${(Math.round(a * 10) / 10)})`;
      let p = g.get(k); if (!p) g.set(k, p = new Path2D()); const s = buf[o + 2]; p.rect(buf[o] - s / 2, buf[o + 1] - s / 2, s, s); }
    g.forEach((p, k) => { c2.fillStyle = k; c2.fill(p); });
  }

  // ------------------------------------------------------------ the shapes: a first frame from the page, the films when they arrive
  // cells of one frame: columns, rows and shade, in the shape's own grid
  function cellsOf(w, h, k, gray, trim) { const x = [], y = [], s = [], min = k === 2 ? 4 : 2; for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) { const g = gray(X, Y); if (g < min) continue; x.push(X); y.push(Y); s.push(trim(X, Y) ? 3 : g >= 12 ? 0 : g >= 8 ? 1 : 2); }
    return { n: x.length, x: Uint8Array.from(x), y: Uint8Array.from(y), s: Uint8Array.from(s) }; }
  const SHAPES = {};
  function shape(name) { let s = SHAPES[name]; if (s) return s; const d = SD.shapes[name]; if (!d) return null;
    s = SHAPES[name] = { name, k: d.k, w: d.w, h: d.h, bb: d.bb, ub: d.ub, work: d.work ? Object.assign({ state: 0 }, d.work) : null, turn: d.turn ? Object.assign({ state: 0 }, d.turn) : null };
    s.f0 = cellsOf(d.w, d.h, d.k, (X, Y) => parseInt(d.d[Y * d.w + X], 16), (X, Y) => d.a[Y * d.w + X] === '1');
    let x0 = 255, x1 = 0, y0 = 255, y1 = 0; for (let i = 0; i < s.f0.n; i++) { x0 = Math.min(x0, s.f0.x[i]); x1 = Math.max(x1, s.f0.x[i] + 1); y0 = Math.min(y0, s.f0.y[i]); y1 = Math.max(y1, s.f0.y[i] + 1); } s.fb = [x0, y0, x1, y1];
    return s; }
  // a film file sets window.FERRA_SEQ[key] = {w, h, frames, fps, per, src, acc}: one sheet whose red channel is each cell's dot size, and a second marking the trim
  function loadFilm(S, kind) { const f = S && S[kind]; if (!f || f.state) return; f.state = 1; const tag = document.createElement('script'); tag.src = f.src;
    tag.onload = () => { const m = (window.FERRA_SEQ || {})[f.key]; if (!m) return; const im = new Image(), ia = new Image(); let got = 0;
      im.onload = ia.onload = () => { if (++got < 2) return; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0); const sz = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); const ac = x.getImageData(0, 0, c.width, c.height).data;
        const N = c.width * c.height, val = new Uint8Array(N), acc = new Uint8Array(N); for (let i = 0, j = 0; j < N; i += 4, j++) { val[j] = sz[i]; acc[j] = ac[i] > 127 ? 1 : 0; }
        Object.assign(f, { val, acc, W: c.width, per: m.per || 8, fw: m.w, fh: m.h, n: m.frames, fps: m.fps || 12, cache: [], state: 2 }); dirty = true; kick(); };
      im.src = m.src; ia.src = m.acc; };
    document.head.appendChild(tag); }
  // frame i of a shape's film, read the way the page's first frame was: k film cells a side to one stage cell. Decoded the first time it is shown
  function frameOf(S, kind, i) { const f = S[kind]; if (!f || f.state !== 2) return S.f0; if (f.cache[i]) return f.cache[i]; const k = S.k, ox = (i % f.per) * f.fw, oy = Math.floor(i / f.per) * f.fh, kk = k * k;
    const sum = (a, X, Y) => { let v = 0; for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) { const fx = X * k + xx, fy = Y * k + yy; if (fx < f.fw && fy < f.fh) v += a[(oy + fy) * f.W + ox + fx]; } return v; };
    return (f.cache[i] = cellsOf(S.w, S.h, k, (X, Y) => Math.min(15, Math.floor((sum(f.val, X, Y) * 15 + 126 * kk) / (252 * kk))), (X, Y) => sum(f.acc, X, Y) * 2 >= kk)); }

  // ------------------------------------------------------------ the plan for the robot picked: which cells go first, when, and along which path
  let plan = null, LAY = null;
  const shapeName = id => { const m = byId[id], f = L.fams[m.fam], n = SD.fam[m.fam]; return n && SD.shapes[n] ? n : f.cls === 'cobot' && SD.shapes.cobot ? 'cobot' : 'arm'; };
  // the order a frame's cells wear away in: its outer layer first, then the next layer in, with some chance in it and the top a little sooner. So at any age the robot
  // stands whole but thinner inside the faint outline of what it was, in every frame of its film. Worked out once a frame, the first time the frame is shown.
  function wearOrder(S, FR) { if (FR._w) return FR._w; const w = S.w, h = S.h, n = FR.n, g = new Int16Array(w * h).fill(-1), dep = new Uint8Array(n); for (let i = 0; i < n; i++) g[FR.y[i] * w + FR.x[i]] = i;
    let left = n; for (let d = 1; left > 0 && d < 40; d++) { const peel = []; for (let i = 0; i < n; i++) { if (dep[i]) continue; const x = FR.x[i], y = FR.y[i], out = j => j < 0 || (dep[j] && dep[j] < d);
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 || out(g[y * w + x - 1]) || out(g[y * w + x + 1]) || out(g[(y - 1) * w + x]) || out(g[(y + 1) * w + x])) peel.push(i); }
      if (!peel.length) { for (let i = 0; i < n; i++) if (!dep[i]) dep[i] = d; break; } peel.forEach(i => { dep[i] = d; }); left -= peel.length; }
    const key = new Float32Array(n); for (let i = 0; i < n; i++) key[i] = dep[i] + 1.5 * hash2(FR.x[i], FR.y[i]) + .6 * FR.y[i] / h;
    const ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => key[a] - key[b]), pos = new Int32Array(n); ord.forEach((i, r) => { pos[i] = r; });
    return (FR._w = { ord, pos }); }
  function makePlan() {
    const S = shape(shapeName(st.id)), f = E.f; if (!S) return; if (plan && plan.S === S && plan.b === f.b) return;
    const R = S.f0, N = R.n, ord = wearOrder(S, R).ord;
    // each year's cells leave while the age crosses that year, so the fall follows the age both ways
    const keep = []; for (let a = 0; a <= 31; a++) keep.push(Math.exp(-f.b * a)); const start = new Float32Array(N).fill(99);
    for (let n = 0; n < 30; n++) { const s = Math.floor(N * (1 - keep[n])), e = Math.floor(N * (1 - keep[n + 1])); for (let k = s; k < e; k++) start[k] = n + .5 * (k - s) / Math.max(1, e - s); }
    plan = { S, b: f.b, N, ord, start, need: Math.floor(N * (1 - keep[30])) + 1, film: 0, frame: R, kind: 'work', fi: 0 };
    fitPlan();
  }
  const FALL = .5;   // years of age a cell's fall takes

  // ------------------------------------------------------------ where everything stands, in the pinned box's own pixels. Run again only when the width changes
  const PR = P.a.map(v => ({ v, sale: 0 })).concat(P.s.map(v => ({ v, sale: 1 }))).filter(q => q.v > 0).sort((a, b) => a.v - b.v || b.sale - a.sale), M = PR.length;
  const nice = (v, up) => { const k = Math.pow(10, Math.floor(Math.log10(v))), m = v / k; return (up ? (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) : (m >= 5 ? 5 : m >= 2 ? 2 : 1)) * k; };
  const LO = M ? nice(PR[0].v, false) : 1, HI = M ? Math.max(nice(PR[M - 1].v, true), LO * 10) : 10, uOf = v => clamp01(Math.log(v / LO) / Math.log(HI / LO));
  const moving = !reduce && getComputedStyle(pin).position === 'sticky';
  let tickEls = [];
  const place = (el, x, y) => { el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; };
  function layout() {
    CW = pin.clientWidth; CH = pin.clientHeight; DPR = Math.min(2, window.devicePixelRatio || 1); if (!CW || !CH) { LAY = null; return; }
    tool.style.setProperty('--oh', ohead.offsetHeight + 'px');
    const pr = pin.getBoundingClientRect(), tr = tool.getBoundingClientRect(), hr = ohead.getBoundingClientRect(), rel = el => { const r = el.getBoundingClientRect(); return { x: r.left - tr.left, y: r.top - tr.top, w: r.width, h: r.height }; };
    const ST = rel(stageEl), PX = rel(pxb), X0 = hr.left - pr.left, X1 = CW - X0, one = CW <= 980, floor = Math.round(ST.y + ST.h);
    const head = { r: hr.right - pr.left + 28, b: hr.bottom - pr.top + 16 };
    const pileW = Math.round(ST.w * .22), gap = one ? 8 : 28, zone = { x: ST.x, w: ST.w - pileW - gap }, pileX = ST.x + ST.w - pileW;
    // the built year: its own band over the pile
    const cy = px(pileW / 23), YR = { x: pileX, y: ST.y, c: cy, h: cy * 7 };
    // the price: sized so the dearest robot at its youngest still fits its box
    let top = 1; for (const m of L.models) top = Math.max(top, est(m.id, limOf(m.id)[0]).likely);
    const dg = String(Math.round(top / 100) * 100).length, cols = 6 + dg * 6 - 1 + Math.floor((dg - 1) / 3) * 3, cp = px(Math.min(PX.w / cols, PX.h / 7));
    const PXB = { x: PX.x, y: PX.y + (PX.h - cp * 7) / 2, c: cp };
    // the skyline: one column a price step, lowest to highest, auction sales at the foot of each column; the largest cell at which the tallest column still clears the heading
    const maxH = floor - head.b - 14; let d = one ? 7 : 13, C = 1, cnt;
    for (; d >= 2.5; d -= 1 / DPR) { C = Math.max(1, Math.floor((X1 - X0) / d)); cnt = new Int16Array(C); let pk = 0; for (const q of PR) { const k = Math.min(C - 1, Math.floor(uOf(q.v) * C)); if (++cnt[k] > pk) pk = cnt[k]; } if (pk * d <= maxH) break; }
    const cw = (X1 - X0) / C, nA = new Int16Array(C), nSl = new Int16Array(C); for (const q of PR) if (q.sale) nSl[Math.min(C - 1, Math.floor(uOf(q.v) * C))]++;
    for (const q of PR) q.k = Math.min(C - 1, Math.floor(uOf(q.v) * C));
    const rowS = new Int16Array(C);
    for (const q of PR) { const row = q.sale ? rowS[q.k]++ : nSl[q.k] + nA[q.k]++; q.sx = X0 + (q.k + .5) * cw; q.sy = floor - (row + .5) * d; q.top = 0; }
    for (const q of PR) if (!q.sale && q.sy <= floor - (nSl[q.k] + nA[q.k] - .5) * d + .01) q.top = 1;
    LAY = { ST, X0, X1, one, floor, head, zone, pileW, pileX, gap, YR, PXB, d, cw, C, tight: X1 - X0 < 300 };
    // the picture's labels: the price steps under the skyline, its key, the price's caption and the two labels under the floor
    tickEls.forEach(e => e.remove()); tickEls = [];
    for (let t = Math.pow(10, Math.ceil(Math.log10(LO) - 1e-9)); t <= HI * 1.0001; t *= 10) { const x = X0 + uOf(t) * (X1 - X0), e = document.createElement('span'), edge = x < X0 + 30 ? '' : x > X1 - 30 ? ' r' : ' c';
      e.className = 'ri-tk' + edge; e.textContent = one ? (t >= 1e6 ? '$' + t / 1e6 + 'M' : t >= 1e3 ? '$' + t / 1e3 + 'k' : '$' + t) : '$' + t.toLocaleString('en-US'); place(e, edge === ' r' ? X1 : edge ? x : X0, floor + 16); e._x = x; lab.appendChild(e); tickEls.push(e); }
    place(lgd, X0, floor + 16 + 32); place(pcap, PXB.x, PXB.y + cp * 7 + 12); place(tk, zone.x, floor + 14); place(tl, X1, floor + 14);
    fitPlan(); lastKey = '';
  }
  // the robot's place and size on the stage, its pile, and every lost cell's path: after a layout or a pick
  function fitPlan() {
    if (!plan || !LAY) return; const { S, N } = plan, { ST, zone, floor, pileW, pileX, YR, one, X0, X1, head } = LAY, bb = S.bb, ub = S.ub, fb = S.fb;
    const c = px(Math.min(ST.h / (bb[3] - bb[1]), zone.w / (bb[2] - bb[0]))), ox = zone.x + (zone.w - (bb[2] - bb[0]) * c) / 2 - bb[0] * c, oy = floor - bb[3] * c;
    // room to turn: the turntable's frames reach wider than the work film's, so the robot steps back to turn (zoom k1) and comes forward again
    const k1 = Math.min(1, zone.w / ((ub[2] - ub[0]) * c), ST.h / ((ub[3] - ub[1]) * c)), ox1 = zone.x + (zone.w - (ub[2] - ub[0]) * c * k1) / 2 - ub[0] * c * k1, oy1 = floor - ub[3] * c * k1;
    // the first screen: the same robot, larger, in the room beside (or under) the heading
    const hx0 = one ? X0 : Math.max(ST.x, head.r + 16), hw = X1 - hx0, hy0 = one ? head.b + 8 : ST.y - 8, hyT = one ? head.b : 8, ch = px(Math.min((floor - hy0) / (fb[3] - fb[1]), hw / (fb[2] - fb[0]), (floor - hyT) / (bb[3] - bb[1]), hw / (bb[2] - bb[0]))), hoy = floor - fb[3] * ch,
      hox = Math.min(X1 - bb[2] * ch, Math.max(hx0 - bb[0] * ch, hx0 + (hw - (fb[2] - fb[0]) * ch) / 2 - fb[0] * ch));   // sized to the first frame, and small enough that any frame of the film still stands inside the room
    // the pile: a mound of the lost cells, never taller than the room under the year
    const room = ST.h - YR.h - 24, cq = px(Math.min(c, Math.sqrt(pileW * room * .78 / plan.need))), pc = Math.max(3, Math.floor(pileW / cq)), rows = Math.max(1, Math.floor(room / cq) - 2), slots = [];
    for (let r = 0; r < rows; r++) for (let j = 0; j < pc; j++) slots.push({ j, r, k: r + Math.abs(j - (pc - 1) / 2) * .55 + .001 * j }); slots.sort((a, b) => a.k - b.k);
    const px0 = pileX + (pileW - pc * cq) / 2, fl = new Float32Array(N * 7), rnd = rng(7), R = S.f0;
    for (let r = 0; r < N; r++) { const i = plan.ord[r], sl = slots[Math.min(r, slots.length - 1)], x0 = ox + (R.x[i] + .5) * c, y0 = oy + (R.y[i] + .5) * c, x1 = px0 + (sl.j + .5) * cq, y1 = floor - (sl.r + .5) * cq, o = r * 7, up = (floor - y1) / ST.h;
      fl[o] = x0; fl[o + 1] = y0; fl[o + 2] = x1; fl[o + 3] = y1; fl[o + 4] = (.14 + .14 * rnd()) * ST.h * (1 - .8 * up); fl[o + 5] = (rnd() - .25) * 2.4 * c; fl[o + 6] = (rnd() < .5 ? -1 : 1) * Math.PI / 2 * (2 + Math.floor(rnd() * 3)); }
    Object.assign(plan, { c, ox, oy, k1, ox1, oy1, ch, hox, hoy, cq, fl, px0, pc }); swarmFor = null;
  }
  // where lost cell r is at progress t of its fall (0 still on the robot, 1 at rest on the pile): a drop to the floor, then two bounces across to its place, turning as it goes
  function fallAt(r, t, o) { const f = plan.fl, i = r * 7, x0 = f[i], y0 = f[i + 1], x1 = f[i + 2], y1 = f[i + 3], h = f[i + 4], dr = f[i + 5], gy = LAY.floor - plan.cq * .5;
    if (t >= 1) { o.x = x1; o.y = y1; o.r = 0; return o; }
    if (t < .4) { const u = t / .4; o.x = x0 + dr * u; o.y = y0 + (gy - y0) * u * u; }
    else { const u = (t - .4) / .6, base = mix(gy, y1, u); o.x = mix(x0 + dr, x1, u); if (u < .62) { const v = u / .62; o.y = base - h * 4 * v * (1 - v); } else { const v = (u - .62) / .38; o.y = base - Math.min(.3 * h, 1.5 * plan.cq) * 4 * v * (1 - v); } }
    o.r = f[i + 6] * (1 - (1 - t) * (1 - t)); return o; }

  // ------------------------------------------------------------ figures in cells: a counter whose digits roll (the price, the built year)
  const G57 = { '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'], ',': ['00', '00', '00', '00', '00', '01', '10'] };
  const GC = {}; for (const k in G57) { const a = []; G57[k].forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '1') a.push(x, y); }); GC[k] = { w: G57[k][0].length, a }; }
  // v is the figure (for a price, in hundreds of dollars). Each digit sits still most of the way and rolls to the next over the last part, as a counter's wheels do.
  // o: {pre: '$', post: '00', commas, right (align the last column on x), col, a (alpha), k (scale about its own middle)}. pass 0 draws the outline, 1 the cells
  function figure(v, x, y, c, o, pass, name) {
    const fl = Math.floor(v + 1e-6), fr = v - fl, roll = fr > .001 ? clamp01((fr - .4) / .2) : 0, nd = String(fl + (roll > 0 ? 1 : 0)).length, post = o.post || '', T = nd + post.length, gl_ = [];
    if (o.pre) gl_.push({ ch: o.pre });
    for (let p = nd - 1, i = 0; p >= 0; p--, i++) { if (o.commas && i > 0 && (T - i) % 3 === 0) gl_.push({ ch: ',' }); const pw = Math.pow(10, p), dgt = Math.floor(fl / pw) % 10, low = fl % pw, f = low === pw - 1 ? roll : 0; gl_.push({ d: dgt, f, lead: p === nd - 1 && Math.floor(fl / pw) === 0 }); }
    for (let i = 0; i < post.length; i++) { if (o.commas && (T - nd - i) % 3 === 0) gl_.push({ ch: ',' }); gl_.push({ ch: post[i] }); }
    let w = -1; for (const g of gl_) { g.x = w + 1; g.w = g.ch ? GC[g.ch].w : 5; w = g.x + g.w; }
    const k = o.k || 1, cc = c * k, x0 = (o.right ? x - w * c : x) + w * c * (1 - k) / 2, y0 = y + 7 * c * (1 - k) / 2, col = o.col, a = o.a == null ? 1 : o.a, sz = pass ? cc * .97 : cc * 1.9;
    const i0 = nS, put = (ch, gx, off) => { const g = GC[ch]; for (let i = 0; i < g.a.length; i += 2) { const ry = g.a[i + 1] + off; if (ry < -.6 || ry > 6.6) continue; const e = clamp01(Math.min(ry + 1, 7 - ry)); push(x0 + (gx + g.a[i] + .5) * cc, y0 + (ry + .5) * cc, sz * e, 0, 0, pass ? col : INK, pass ? a : a * e); } };
    for (const g of gl_) { if (g.ch) { put(g.ch, g.x, 0); continue; } if (!(g.lead && g.d === 0)) put(String(g.d), g.x, -g.f * 8); if (g.f > 0) put(String((g.d + 1) % 10), g.x, (1 - g.f) * 8); }
    if (pass && a > .3) texts.push({ t: name, x0: x0 - cc * .5, y0: y0 - cc * .5, x1: x0 + w * cc + cc * .5, y1: y0 + 7 * cc + cc * .5, i0, i1: nS });
  }

  // ------------------------------------------------------------ the picture. Everything below is a plain function of where the page is, the robot, its age and (while they run) the clocks
  let S_ = moving ? 0 : 2;                    // how far the pinned scene has run, in screens: 0 to 2
  let onScreen = true, dirty = true, lastKey = '', raf = 0, clock = 0, lastT = 0;
  let ptr = null;                              // the pointer or finger, in the pinned box's own pixels
  let burst = null, stamp = 0, flash = 0;      // the answers to a pick and to letting go of the age: their start times on the page's clock (0 = not running)
  let spinning = false, spinTo = null;
  const T_FORM = 1.3, T_AGED = 1.9;            // by 1.3 screens the robot has formed; by 1.9 it has aged to its year and the tool is all but in place
  const robotMode = () => S_ >= T_FORM;
  const showAge = () => S_ >= T_AGED ? st.age : st.age * ease(clamp01((S_ - T_FORM) / (T_AGED - T_FORM)));
  const tmp = { x: 0, y: 0, r: 0 }, c1 = [0, 0, 0], c3 = [0, 0, 0];
  // keep a cell out of the heading's corner and above the floor (a pointer can push cells about; words stay clear)
  const guard = o => { const { head, floor, d } = LAY; if (o.y > floor - d * .5) o.y = floor - d * .5; if (o.x < head.r && o.y < head.b) { if (head.r - o.x < head.b - o.y) o.x = head.r; else o.y = head.b; } };
  function floorLine(x0, x1, a) { const y = LAY.floor + 3; for (let x = x0 + 2; x < x1; x += 6) push(x, y, 3, 0, 0, WHITE, .5 * a); }

  // ---- scene 1: the swarm. Each price is one cell; with more robot cells than prices a price splits, with fewer several share a cell
  let swarmFor = null, SW = null;
  function swarmMap() {
    const { S, c, ox, oy, ch, hox, hoy } = plan, FR = plan.frame, key = S.name + ':' + plan.kind + ':' + plan.fi + ':' + CW; if (swarmFor === key) return; swarmFor = key;
    const N = FR.n, K = Math.max(N, M), ro = Array.from({ length: N }, (_, i) => i).sort((a, b) => FR.x[a] - FR.x[b] || FR.y[b] - FR.y[a]), rnd = rng(3);
    const src = new Int32Array(K), dst = new Int32Array(K), a = new Float32Array(K * 8), dup = new Uint8Array(K), seen = new Uint8Array(M);
    for (let k = 0; k < K; k++) { if (N >= M) { dst[k] = ro[k]; src[k] = Math.floor(k * M / N); } else { src[k] = k; dst[k] = ro[Math.floor(k * N / M)]; } if (seen[src[k]]) dup[k] = 1; seen[src[k]] = 1;
      const i = dst[k], o = k * 8; a[o] = hox + (FR.x[i] + .5) * ch; a[o + 1] = hoy + (FR.y[i] + .5) * ch; a[o + 2] = ox + (FR.x[i] + .5) * c; a[o + 3] = oy + (FR.y[i] + .5) * c;
      a[o + 4] = rnd() * 6.2832; a[o + 5] = rnd(); a[o + 6] = rnd() < .07 ? 5 + rnd() * 16 : .12 + rnd() * .2; a[o + 7] = .7 * PR[src[k]].k / Math.max(1, LAY.C - 1) + .3 * (1 - FR.y[i] / S.h); }
    SW = { K, src, dst, a, dup, FR };
  }
  function drawSwarm() {
    swarmMap(); const { K, src, dst, a, dup, FR } = SW, { c, ch } = plan, { d, floor, X0, X1, one } = LAY, s = S_, t = clock;
    const u1 = clamp01((s - .06) / .46), u2 = clamp01((s - .52) / (T_FORM - .52)), second = s > .52, dr = reduce ? 0 : 1 - smooth(0, .16, s), reach = one ? 70 : 120, la = smooth(.4, .5, s) * (1 - smooth(T_FORM - .2, T_FORM - .08, s));
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < K; k++) { const o = k * 8, j = src[k], q = PR[j], i = dst[k], sh = SHADE[FR.s[i]]; let x, y, sz, tt, pat = 0, col;
      if (!second) { tt = ease(clamp01(u1 * 1.5 - .5 * j / Math.max(1, M - 1))); x = mix(a[o], q.sx, tt) + Math.sin(Math.PI * tt) * (a[o + 5] - .5) * (one ? 60 : 160); y = mix(a[o + 1], q.sy, tt) - Math.sin(Math.PI * tt) * (20 + a[o + 5] * 50); sz = mix(ch * .9, d * .86, tt) * (dup[k] ? 1 - tt : 1);
        if (dr > 0 && tt < 1) { const w = a[o + 6], lo = w > 3 ? 1 : smooth(.62, 1, Math.sin(t * .7 + a[o] * .009 - a[o + 1] * .013)) * 14 + 1, am = w * lo * ch * dr * (1 - tt); x += Math.cos(t * (.5 + a[o + 5]) + a[o + 4]) * am; y += Math.sin(t * (.4 + a[o + 5] * .9) + a[o + 4] * 1.7) * am * .8; } }
      else { tt = ease(clamp01(u2 * 1.7 - .7 * a[o + 7])); x = mix(q.sx, a[o + 2], tt); y = mix(q.sy, a[o + 3], tt) - Math.sin(Math.PI * tt) * Math.min(150, 36 + Math.abs(a[o + 2] - q.sx) * .22); sz = mix(d * .86, c * .92, tt) * (dup[k] ? tt : 1); }
      if (sz < .4) continue;
      if (ptr) { const dx = x - ptr.x, dy = y - ptr.y, dd = Math.hypot(dx, dy); if (dd < reach) { const p = (1 - dd / reach), f = p * p * reach * (second || u1 > 0 ? .5 : .9) / (dd || 1); x += dx * f; y += dy * f; } }
      tmp.x = x; tmp.y = y; guard(tmp); x = tmp.x; y = tmp.y;
      if (!pass) { push(x, y, sz * 2.1, 0, 0, INK, 1); continue; }
      const sky = second ? 1 - tt : tt, own = q.sale ? SIG : q.top ? WHITE : SKY; col = mixc(sh[0], own, smooth(.15, .7, sky), c1); if (sky < .4) pat = sh[1];
      push(x, y, sz, 0, pat, col, 1); }
    // the price line under the skyline, with a mark at each step
    if (la > 0) { floorLine(X0, X1, la); for (const e of tickEls) { push(Math.min(X1 - 2, Math.max(X0 + 2, e._x)), floor + 3, 5, 0, 0, WHITE, la); } }
    if (s > T_FORM - .3) floorLine(LAY.ST.x, LAY.ST.x + LAY.ST.w, smooth(T_FORM - .3, T_FORM, s));
  }

  // ---- scenes 2 and 4: the robot on its stage at an age. Cells still on the robot, cells in the air, cells on the pile, the floor, the year and the price
  // the share of the robot's cells that have left it by an age (those in the air count as gone)
  function startedAt(age) { const st_ = plan.start; let lo = 0, hi = plan.N; while (lo < hi) { const m = lo + hi >> 1; if (st_[m] < age) lo = m + 1; else hi = m; } return lo / plan.N; }
  function robotGeo() { const e = spinning || spinTo ? clamp01(Math.abs(st.spin - Math.round(st.spin)) / .04) : 0, z = ease(e), k = mix(1, plan.k1, z); return { k, c: plan.c * k, ox: mix(plan.ox, plan.ox1, z), oy: mix(plan.oy, plan.oy1, z) }; }
  function drawRobot(age, appear, cells) {
    const { S, N, start } = plan, FR = plan.frame, G = robotGeo(), c = G.c, { ST, YR, PXB, floor } = LAY, now = performance.now(), pos = wearOrder(S, FR).pos, gone = FR.n * startedAt(age), hot = Math.max(3, FR.n * .06);
    const turn = st.spin - Math.floor(st.spin), fake = (spinning || spinTo) && !(S.turn && S.turn.state === 2), sq = fake ? Math.cos(turn * 6.2832) : 1, mid = G.ox + (S.fb[0] + S.fb[2]) / 2 * c;
    const fl = flash ? clamp01(1 - (now - flash) / 160) : 0, hov = ptr && !burst ? c * 3.4 : 0;
    const lost = Math.floor(N * (1 - Math.exp(-plan.b * Math.max(0, age - FALL))));   // cells at rest on the pile by now (those still in the air come after)
    for (let pass = 0; pass < 2; pass++) {
      if (cells) for (let i = 0; i < FR.n; i++) { const tf = gone - pos[i]; let x = G.ox + (FR.x[i] + .5) * c, y = G.oy + (FR.y[i] + .5) * c; if (fake) x = mid + (x - mid) * sq;
        if (!pass) { push(x, y, c * 2.1, 0, 0, INK, 1); continue; }
        if (tf > 0) { push(x, y, c * .92, 0, 0, COB, .32); continue; }                      // gone: the robot's whole outline stays, faint
        const sh = SHADE[FR.s[i]], heat = clamp01(1 + tf / hot); let col = heat > .75 ? mixc(SIG, SIGT, (heat - .75) * 3, c1) : heat > 0 ? mixc(sh[0], SIG, heat / .75 * .9, c1) : sh[0], sz = c * .92;   // the next cells to go heat up
        if (hov) { const dd = Math.hypot(x - ptr.x, y - ptr.y); if (dd < hov) { const p = 1 - dd / hov; sz *= 1 + .3 * p; col = mixc(col, WHITE, p * .8, c3); } }
        if (fl) col = mixc(col, WHITE, fl * .8, c3);
        push(x, y, sz, 0, sh[1], col, 1); }
      // the lost cells: on the pile, or on their way. A ripple runs through the pile when the age is let go
      const rp = stamp ? (now - stamp) / 520 : 2, cq = plan.cq;
      if (cells) for (let r = 0; r < N; r++) { const tf = (age - start[r]) / FALL; if (tf <= 0) break; fallAt(r, tf, tmp); let y = tmp.y;
        if (tf >= 1 && rp < 1.4) { const ph = rp * 1.6 - (tmp.x - plan.px0) / (plan.pc * cq) * .6; if (ph > 0 && ph < 1) y -= Math.sin(Math.PI * ph) * cq * 1.6 * (1 - rp / 1.4); }
        if (!pass) { push(tmp.x, y, cq * (tf < 1 ? 1.9 : 2.1), 0, 0, INK, appear); continue; }
        if (tf < 1) push(tmp.x, y, cq * .98, tmp.r, 0, mixc(SIGT, SIG, clamp01(tf * 2.2), c1), appear); else push(tmp.x, y, cq * .9, 0, (r * 7 + (r >> 3)) % 5 === 0 ? 1 : 0, r < lost * .35 ? SIGD : SIG, appear); }
      // the year, over the pile, and the price
      const sk = stamp ? clamp01((now - stamp) / 420) : 1, se = 1 - (1 - sk) * (1 - sk), bv = burst ? mix(burst.v0, E.likely, 1 - Math.pow(1 - clamp01((now - burst.t0) / 430), 3)) / 100 : null;
      const ye = L.now - age, pv = bv != null ? bv : Math.floor(est(st.id, age).likely / 100 + .5);
      figure(drag || snap ? ye : Math.round(ye), LAY.X1, YR.y, YR.c, { right: 1, col: SKY, a: appear }, pass, 'year');
      figure(pv, PXB.x, PXB.y, PXB.c, { pre: '$', post: '00', commas: 1, col: se < 1 ? mixc(SIGD, WHITE, se, c3) : WHITE, a: appear, k: 1 + .1 * (1 - se) }, pass, 'price');
    }
    floorLine(ST.x, ST.x + ST.w, 1);
  }

  // ---- scene 3: a pick. The old picture's cells burst out from the robot's middle, swirl with trails, and slam into the new robot and its pile
  function snapshot() { const out = []; if (!plan || !LAY) return out; const { N, start } = plan, FR = plan.frame, G = robotGeo(), age = st.age, pos = wearOrder(plan.S, FR).pos, gone = FR.n * startedAt(age);
    for (let i = 0; i < FR.n; i++) { if (pos[i] < gone) continue; const sh = SHADE[FR.s[i]]; out.push({ x: G.ox + (FR.x[i] + .5) * G.c, y: G.oy + (FR.y[i] + .5) * G.c, s: G.c * .92, c: sh[0], p: sh[1] }); }
    for (let r = 0; r < N; r++) { const tf = (age - start[r]) / FALL; if (tf <= 0) break; fallAt(r, tf, tmp); out.push({ x: tmp.x, y: tmp.y, s: plan.cq * .9, c: SIG, p: 0 }); }
    return out.sort((a, b) => a.x - b.x || a.y - b.y); }
  function startBurst(from, v0) { const to = snapshot(), K = Math.max(from.length, to.length), rnd = rng(11), { ST } = LAY, cx = plan.ox + (plan.S.fb[0] + plan.S.fb[2]) / 2 * plan.c, cyy = LAY.floor - ST.h * .45, dots = [];
    for (let k = 0; k < K; k++) { const a = from[Math.floor(k * from.length / K)], b = to[Math.floor(k * to.length / K)]; let dx = a.x - cx + (rnd() - .5) * 40, dy = a.y - cyy + (rnd() - .5) * 40; const l = Math.hypot(dx, dy) || 1;
      dots.push({ a, b, nx: dx / l, ny: dy / l, amp: (.12 + .3 * rnd()) * ST.h, dl: .16 * rnd(), dir: rnd() < .5 ? -1 : 1 }); }
    burst = { t0: performance.now(), dots, v0, box: [ST.x + 4, Math.max(LAY.head.b, ST.y - 40), LAY.X1 - 4, LAY.floor - 4] }; stamp = 0; kick(); }
  const BURST = 480;
  function burstAt(q, t, o) { const tt = clamp01((t - q.dl) / (1 - q.dl)), e = tt * tt * tt, an = 2.8 * tt * q.dir, cs = Math.cos(an), sn = Math.sin(an), bx = mix(q.a.x, q.b.x, e), by = mix(q.a.y, q.b.y, e), B = burst.box;
    const sw = Math.min(Math.sin(Math.PI * Math.pow(tt, .6)) * q.amp * (1 - e), Math.max(0, Math.min(bx - B[0], B[2] - bx, by - B[1], B[3] - by)));
    o.x = bx + (q.nx * cs - q.ny * sn) * sw; o.y = by + (q.nx * sn + q.ny * cs) * sw; o.r = tt; return o; }
  function drawBurst(t) {
    for (const q of burst.dots) { burstAt(q, t, tmp); push(tmp.x, tmp.y, mix(q.a.s, q.b.s, tmp.r) * 1.9, 0, 0, INK, 1); }
    for (const q of burst.dots) { for (let g = 3; g >= 1; g--) { burstAt(q, t - g * .028, tmp); if (tmp.r > 0 && tmp.r < 1) push(tmp.x, tmp.y, mix(q.a.s, q.b.s, tmp.r) * (1 - g * .18), 0, 0, mixc(q.a.c, q.b.c, tmp.r, c1), .34 - g * .08); }
      burstAt(q, t, tmp); push(tmp.x, tmp.y, mix(q.a.s, q.b.s, tmp.r), 0, tmp.r > .6 ? q.b.p : q.a.p, mixc(q.a.c, q.b.c, smooth(.2, .8, tmp.r), c1), 1); }
    drawRobot(st.age, 1, false); }

  // the picture's labels follow the scroll by opacity alone; on the narrowest phones the lost label drops its last two words so the two labels never meet
  function setLabels() { const s = S_, a = (smooth(.4, .5, s) * (1 - smooth(T_FORM - .2, T_FORM - .08, s))).toFixed(2), b = smooth(T_FORM, T_FORM + .07, s).toFixed(2);
    if (lab._a !== a) { lab._a = a; lgd.style.opacity = a; tickEls.forEach(e => { e.style.opacity = a; }); }
    if (lab._b !== b) { lab._b = b; pcap.style.opacity = b; tk.style.opacity = b; tl.style.opacity = b; }
    if (+b > 0) { const age = showAge(), e = drag || snap || S_ < T_AGED ? est(st.id, age) : E, k = `Asks ${usd(e.ask)}`, l = `${usd(Math.max(0, e.at(0).ask - e.ask))} lost${LAY.tight ? '' : ' since new'}`; if (tk.textContent !== k) tk.textContent = k; if (tl.textContent !== l) tl.textContent = l; } }
  function draw() {
    if (!LAY || !plan) return; const now = performance.now(); nS = 0; texts.length = 0; setLabels();
    if (!robotMode()) drawSwarm();
    else if (burst) { const t = (now - burst.t0) / BURST; if (t >= 1) { burst = null; flash = now; drawRobot(st.age, 1, true); } else drawBurst(t); }
    else drawRobot(showAge(), smooth(T_FORM, T_FORM + .08, S_), true);
    flush();
  }

  // ---- the clocks. A frame is asked for only while something is moving, and drawn only when the picture changed
  const filmOn = () => robotMode() && !reduce && !burst && !spinning && !spinTo && plan && plan.S.work && plan.S.work.state === 2;
  const active = () => onScreen && ((!robotMode() && !reduce && S_ < .2) || filmOn() || burst || spinTo || snap || (stamp && performance.now() - stamp < 760) || (flash && performance.now() - flash < 200));
  function frame(now) { raf = 0; const dt = Math.min(.1, (now - (lastT || now)) / 1000); lastT = now; clock += dt;
    if (plan && robotMode()) {
      if (spinTo) { const k = clamp01((now - spinTo.t0) / spinTo.ms); st.spin = mix(spinTo.from, spinTo.to, 1 - Math.pow(1 - k, 3)); if (k >= 1) { st.spin = 0; spinTo = null; plan.film = 0; } dirty = true; }
      const S = plan.S; let kind = 'work', fi = 0;
      if (spinning || spinTo) { if (S.turn && S.turn.state === 2) { kind = 'turn'; const u = st.spin - Math.floor(st.spin); fi = Math.round(u * S.turn.n) % S.turn.n; } }
      else if (filmOn()) { plan.film += dt * mix(1, .3, clamp01(st.age / 30)); fi = Math.floor(plan.film * S.work.fps) % S.work.n; }   // an older robot moves more slowly
      else if (S.work && S.work.state === 2) fi = Math.floor(plan.film * S.work.fps) % S.work.n;
      if (kind !== plan.kind || fi !== plan.fi) { plan.kind = kind; plan.fi = fi; plan.frame = frameOf(S, kind, fi); dirty = true; }
    }
    if (snap) dirty = true;
    const key = [S_.toFixed(4), st.id, st.age.toFixed(3), st.spin.toFixed(4), plan ? plan.kind + plan.fi : '', ptr ? Math.round(ptr.x) + ',' + Math.round(ptr.y) : '', CW, CH].join('|');
    const run = active(), busy = (!robotMode() && !reduce && S_ < .2) || burst || (stamp && now - stamp < 760) || (flash && now - flash < 200);
    if (onScreen && (dirty || busy || key !== lastKey)) { dirty = false; lastKey = key; draw(); }
    if (stamp && now - stamp >= 760) stamp = 0; if (flash && now - flash >= 200) flash = 0;
    if (run || active()) raf = requestAnimationFrame(frame); else lastT = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // ------------------------------------------------------------ the words and the controls
  const ageTicks = (lo, hi) => [lo].concat([5, 10, 15, 20, 25].filter(a => lo + 2 <= a && a <= hi - 2), [hi]);
  function words() { const a = Math.round(st.age), y = L.now - a; E = est(st.id, a);
    set('likely', usd(E.likely)); set('lrange', `8 in 10 sell for ${usd(E.llo)} to ${usd(E.lhi)}`); set('agetxt', ageTxt(a)); sl.setAttribute('aria-valuetext', `${ageTxt(a)}, built ${y}`);
    document.dispatchEvent(new CustomEvent('ri:robot', { detail: { id: st.id, age: a, year: y } })); }
  // a family's own entry reads "Any KR" (pick_name() in pages/robot_index.py): short enough that no name is cut at 320 wide
  const pickName = x => x.any && x.short !== 'Any model' ? 'Any ' + x.short.replace(/, any model$/, '').replace(/^Other /, 'other ') : x.short;
  const fillModels = () => { const m = mk.value; md.innerHTML = L.models.filter(x => L.fams[x.fam].maker === m).map(x => `<option value="${x.id}">${pickName(x).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join(''); };
  const limits = () => { const [lo, hi] = limOf(st.id); sl.min = lo; sl.max = hi; st.age = Math.max(lo, Math.min(hi, st.age)); sl.value = st.age; if (ticksEl) ticksEl.innerHTML = ageTicks(lo, hi).map(a => `<span style="left:calc(14px + (100% - 28px) * ${((a - lo) / (hi - lo)).toFixed(4)})">${a === 0 ? 'New' : a}</span>`).join(''); };
  let drag = false, snap = 0;
  function controls() {
    mk.value = L.fams[byId[st.id].fam].maker; fillModels(); md.value = st.id; limits();
    const remember = () => { try { history.replaceState(null, '', `#r=${st.id}&y=${L.now - Math.round(st.age)}`); } catch (x) {} };
    const robot = () => { const r = stageEl.getBoundingClientRect(), seen = r.bottom > 0 && r.top < innerHeight, from = !reduce && !burst && S_ >= T_AGED && seen && LAY ? snapshot() : null, v0 = E.likely;
      snap = 0; drag = false; st.spin = 0; spinTo = null; st.age = Math.round(st.age); limits(); st.age = Math.round(st.age); sl.value = st.age; E = est(st.id, st.age); makePlan(); plan.film = 0; plan.kind = 'work'; plan.fi = 0; plan.frame = frameOf(plan.S, 'work', 0); words(); remember();
      if (from && from.length) startBurst(from, v0); setTimeout(() => loadFilm(plan.S, 'work'), from ? 700 : 0); dirty = true; kick(); };
    mk.addEventListener('change', () => { fillModels(); st.id = md.value; robot(); });
    md.addEventListener('change', () => { st.id = md.value; robot(); });
    // dragging: the picture follows the thumb; the words change on each whole year
    sl.addEventListener('input', () => { snap = 0; drag = true; const was = Math.round(st.age); st.age = +sl.value; if (Math.round(st.age) !== was) words(); dirty = true; kick(); });
    // letting go: the thumb settles on the whole year (a short glide; at once with reduced motion), then the price is stamped down and the pile ripples
    const land = to => { snap = 0; drag = false; st.age = to; sl.value = to; words(); remember(); if (!reduce) stamp = performance.now(); dirty = true; kick(); };
    sl.addEventListener('change', () => { const from = +sl.value, to = Math.round(from); if (reduce || Math.abs(to - from) < .02) return land(to);
      const t0 = performance.now(); snap = 1; const step = () => { if (!snap) return; const t = clamp01((performance.now() - t0) / 160); if (t >= 1) return land(to); st.age = mix(from, to, 1 - Math.pow(1 - t, 3)); sl.value = st.age; dirty = true; kick(); requestAnimationFrame(step); }; requestAnimationFrame(step); });
    // arrow keys move a whole year at a time
    sl.addEventListener('keydown', ev => { const d = /Right|Up|PageUp/.test(ev.key) ? 1 : /Left|Down|PageDown/.test(ev.key) ? -1 : 0; if (!d && !/Home|End/.test(ev.key)) return; ev.preventDefault(); const [lo, hi] = limOf(st.id);
      land(ev.key === 'Home' ? lo : ev.key === 'End' ? hi : Math.max(lo, Math.min(hi, Math.round(st.age) + d))); });
    // a sideways drag on the stage turns the robot all the way round; letting go carries it on to the front, where its work film takes over again
    let x0 = 0, s0 = 0, lastDx = 0;
    stageEl.addEventListener('pointerdown', e => { if (!robotMode() || burst || !plan || S_ < T_AGED || e.button > 0) return; spinning = true; spinTo = null; x0 = e.clientX; s0 = st.spin; lastDx = 0; loadFilm(plan.S, 'turn'); try { stageEl.setPointerCapture(e.pointerId); } catch (x) {} dirty = true; kick(); });
    stageEl.addEventListener('pointermove', e => { if (!spinning) return; const per = Math.min(stageEl.clientWidth, 520), dx = e.clientX - x0; lastDx = dx; st.spin = s0 + dx / per; dirty = true; kick(); });
    const drop = () => { if (!spinning) return; spinning = false; const to = Math.abs(st.spin - Math.round(st.spin)) < .03 ? Math.round(st.spin) : lastDx > 0 ? Math.ceil(st.spin) : Math.floor(st.spin), far = Math.abs(to - st.spin);
      if (reduce || far < .001) { st.spin = 0; plan.film = 0; } else spinTo = { from: st.spin, to, t0: performance.now(), ms: 240 + 320 * far }; dirty = true; kick(); };
    stageEl.addEventListener('pointerup', drop); stageEl.addEventListener('pointercancel', drop);
    words();
  }

  // ------------------------------------------------------------ the page's place and the pointer
  function where() { const r = root.getBoundingClientRect(), VH = pin.offsetHeight, run = root.offsetHeight - VH; onScreen = r.bottom > 0 && r.top < innerHeight; if (moving && run > 0) S_ = Math.max(0, Math.min(2, -r.top / (run / 2))); else S_ = 2; }
  const onScroll = () => { where(); kick(); };
  const point = (x, y) => { const r = pin.getBoundingClientRect(); if (x < r.left || x > r.right || y < r.top || y > r.bottom) { if (ptr) { ptr = null; dirty = true; kick(); } return; } ptr = { x: x - r.left, y: y - r.top }; kick(); };
  function start() {
    startRenderer(); makePlan(); layout(); sizeCanvas(); where(); controls();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pointermove', e => point(e.clientX, e.clientY), { passive: true });
    addEventListener('touchmove', e => { const t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
    addEventListener('touchend', () => { if (ptr) { ptr = null; dirty = true; kick(); } }, { passive: true });
    document.addEventListener('pointerleave', () => { if (ptr) { ptr = null; dirty = true; kick(); } });
    // an address that names a robot opens on the tool, with the robot already in place
    if (moving && /(^|[#&])r=/.test(location.hash) && scrollY < 2) { scrollTo({ top: Math.ceil(root.getBoundingClientRect().top + scrollY + root.offsetHeight - pin.offsetHeight) + 1, behavior: 'instant' }); where(); }
    kick();
    // the film arrives after the first screen has painted
    const later = () => loadFilm(plan.S, 'work'); if (document.readyState === 'complete') setTimeout(later, 200); else addEventListener('load', () => setTimeout(later, 200), { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); dirty = true; kick(); });
    // a real width change lays everything out again; a height-only change (a phone's address bar) does nothing
    let w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; layout(); sizeCanvas(); where(); dirty = true; kick(); });
  }
  start();
})();
