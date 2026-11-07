// The header panels' live pictures. site.js loads this and media/nav/np-data.js the first time a panel opens, and calls FerraNP.pick(link, numbers) for the link under the pointer.
// One canvas per panel, one frame at a time, and nothing runs once the panel has shut. Every number comes from the page's data-n, which core.py reads from the price data and the example loan. Each scene paints as a pure function of time.
// Reduced motion: each scene paints once at its finished state.
(() => {
  const D = window.FERRA_NP_DATA, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, clamp = v => v < 0 ? 0 : v > 1 ? 1 : v, smooth = t => t * t * (3 - 2 * t), out3 = t => 1 - Math.pow(1 - t, 3), lerp = (a, b, k) => a + (b - a) * k;
  const R = n => { const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
  const usd = n => '$' + Math.round(n).toLocaleString('en-US'), count = n => Math.round(n).toLocaleString('en-US');
  const W = a => `rgba(255,255,255,${a})`, C = a => `rgba(150,232,255,${a})`, INK = '#0e1626';
  const F14 = "400 14px Geist,'Geist Fallback',system-ui,sans-serif", LEFT = 72;
  const disc = (c, x, y, r) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };
  // a label on a solid plate of the ground colour, so whatever sits under it gives way
  const label = (c, text, x, y, a, align, col) => { c.font = F14; const tw = c.measureText(text).width, lx = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x; c.globalAlpha = a; c.fillStyle = INK; c.fillRect(lx - 6, y - 15, tw + 12, 21); c.fillStyle = col || W(.86); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(text, lx, y); c.globalAlpha = 1; };
  // the film's arm, one dot per listing, placed in a box of height H
  const armIn = (cx, top, H) => { const k = H / D.h; return D.seats.map(s => ({ x: cx + (s[0] - D.w / 2) * k, y: top + s[1] * k, r: s[2] * k * .86 })); };
  // the shared chart: age across, asking price up on a log scale, running off the screen's right edge
  const chart = S => { const x0 = LEFT, x1 = S.w, y0 = 24, y1 = S.h - 44, lo = Math.log(700), hi = Math.log(170000); return { x0, x1, y0, y1, X: a => x0 + 6 + (x1 - x0 - 6) * a / 33, Y: u => y1 - 4 - (y1 - y0 - 4) * clamp((Math.log(u) - lo) / (hi - lo)) }; };
  const axes = (c, f, a) => { c.globalAlpha = a; c.lineWidth = 1; c.strokeStyle = W(.1); c.beginPath(); for (const u of [100000, 10000, 1000]) { const y = Math.round(f.Y(u)) + .5; c.moveTo(f.x0, y); c.lineTo(f.x1, y); } c.stroke(); c.strokeStyle = W(.32); c.beginPath(); c.moveTo(f.x0, f.y1 + .5); c.lineTo(f.x1, f.y1 + .5); c.stroke(); c.globalAlpha = 1; };
  const axisWords = (c, f, a) => { for (const [u, t] of [[100000, '$100,000'], [10000, '$10,000'], [1000, '$1,000']]) label(c, t, f.x0, Math.round(f.Y(u)) - 6, a, 'left', W(.62)); c.font = F14; c.fillStyle = W(.62); c.globalAlpha = a; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillText('New', f.x0, f.y1 + 22); for (const n of [10, 20, 30]) { c.textAlign = 'center'; c.fillText(n + ' years old', f.X(n), f.y1 + 22); } c.textAlign = 'left'; c.globalAlpha = 1; };

  const SCENES = {
    // dots gather into 50 arms, 35 of them light up, and the figure ticks up to the example loan
    borrow: { setup(S) { const cols = 10, rows = 5, gw = Math.min(S.w * .58 - LEFT, (S.h - 56) / rows * cols * D.w / D.h), cw = gw / cols, ch = cw * D.h / D.w, gh = ch * rows, gy = (S.h - gh) / 2;
        const dpr = S.dpr, sp = document.createElement('canvas'); sp.width = Math.ceil(cw * dpr); sp.height = Math.ceil(ch * dpr); const x = sp.getContext('2d'); x.scale(dpr, dpr); x.fillStyle = '#fff'; x.beginPath(); const k = cw * .92 / D.w; D.seats.forEach(s => disc(x, cw * .04 + s[0] * k, s[1] * k, Math.max(.45, s[2] * k * .8))); x.fill();
        const cells = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ x: LEFT + i * cw, y: gy + j * ch, n: j * cols + i });
        const bits = []; cells.forEach(cl => { for (let b = 0; b < 8; b++) { const q = cl.n * 8 + b; bits.push({ sx: LEFT + R(q) * (S.w - LEFT), sy: R(q + .5) * S.h, x: cl.x + cw * (.2 + R(q + .2) * .6), y: cl.y + ch * (.1 + R(q + .7) * .8), d: R(q + .9) * .7 }); } });
        S.state = { cells, bits, sp, cw, ch, lit: S.N.borrowLit || 35 }; const fx = LEFT + gw + 40; S.f = S.fig({ left: fx, top: S.h / 2 - 48 }, usd(0), 'The example loan'); },
      paint(c, t, S) { const st = S.state; c.fillStyle = W(.7); c.beginPath(); for (const b of st.bits) { const p = clamp((t - b.d) / .8); if (p >= 1) continue; const k = smooth(p); disc(c, lerp(b.sx, b.x, k), lerp(b.sy, b.y, k), 1.5); } c.fill();
        const on = clamp((t - 1.1) / 1.5) * st.lit; for (const cl of st.cells) { const a = smooth(clamp((t - .55 - cl.n * .006) / .6)); const i = cl.n, litNow = clamp(on - i); const shine = i < st.lit && t > 3 ? .1 * Math.max(0, Math.sin(t * 1.1 - i * .37)) : 0; c.globalAlpha = a * (.24 + .66 * litNow + shine); c.drawImage(st.sp, cl.x, cl.y, st.cw, st.ch); } c.globalAlpha = 1; S.f.b(usd(S.N.loan * on / st.lit)); } },
    // the money travels the path between the four squares
    flow: { setup(S) { const sq = Math.max(96, Math.min(112, S.h * .28)), cy = S.h / 2 - 8, x0 = LEFT, x3 = S.w - 40 - sq, gap = (x3 - x0) / 3, xs = [0, 1, 2, 3].map(i => x0 + gap * i), top = cy - sq / 2, bot = cy + sq / 2, route = bot + 34;
        const lanes = { loan: [[xs[0] + sq, cy - 14], [xs[1], cy - 14]], buy: [[xs[1] + sq, cy - 14], [xs[2], cy - 14]], rent: [[xs[3] + sq / 2, bot], [xs[3] + sq / 2, route], [xs[1] + sq / 2, route], [xs[1] + sq / 2, bot]], pay: [[xs[1], cy + 14], [xs[0] + sq, cy + 14]], use: [[xs[2] + sq, cy], [xs[3], cy]] };
        for (const k in lanes) { const L = lanes[k]; let sum = 0; L.len = [0]; for (let i = 1; i < L.length; i++) { sum += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); L.len.push(sum); } L.total = sum; }
        S.state = { sq, cy, xs, top, bot, route, lanes, gap }; },
      paint(c, t, S) { const st = S.state, at = (L, k) => { const d = k * L.total; let i = 1; while (i < L.length - 1 && L.len[i] < d) i++; const u = (d - L.len[i - 1]) / (L.len[i] - L.len[i - 1] || 1); return [lerp(L[i - 1][0], L[i][0], u), lerp(L[i - 1][1], L[i][1], u)]; };
        const trace = (L, k, a) => { c.strokeStyle = W(a); c.lineWidth = 1; c.beginPath(); c.moveTo(L[0][0], L[0][1]); const d = k * L.total; for (let i = 1; i < L.length; i++) { if (L.len[i] <= d) c.lineTo(L[i][0], L[i][1]); else { const u = (d - L.len[i - 1]) / (L.len[i] - L.len[i - 1]); c.lineTo(lerp(L[i - 1][0], L[i][0], u), lerp(L[i - 1][1], L[i][1], u)); break; } } c.stroke(); };
        const stream = (L, from, col, n, sp) => { const on = clamp((t - from) / .4); if (!on) return; c.fillStyle = col; c.globalAlpha = on; c.beginPath(); for (let i = 0; i < n; i++) { const k = ((t - from) * sp / L.total + i / n) % 1, p = at(L, k), r = 3.2 * Math.min(1, Math.min(k, 1 - k) * 12); if (r > .2) disc(c, p[0], p[1], r); } c.fill(); c.globalAlpha = 1; };
        const { loan, buy, rent, pay, use } = st.lanes, seg = (a, b) => smooth(clamp((t - a) / (b - a)));
        trace(loan, seg(.5, 1), .4); trace(buy, seg(1, 1.4), .4); trace(use, seg(1.4, 1.7), .18); trace(rent, seg(1.8, 2.5), .4); trace(pay, seg(2.6, 3), .4);
        st.xs.forEach((x, i) => { const a = smooth(clamp((t - i * .1) / .5)); c.globalAlpha = a; c.strokeStyle = W(.72); c.lineWidth = 1; c.strokeRect(Math.round(x) + .5, Math.round(st.top) + .5, Math.round(st.sq), Math.round(st.sq)); c.font = F14; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(['The lender', 'The company', 'The robots', 'Customers'][i], x + st.sq / 2, st.cy + (i === 1 || i === 0 ? 0 : 0)); c.globalAlpha = 1; });
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        stream(loan, 1, C(1), 4, 90); stream(buy, 1.4, C(1), 3, 70); stream(rent, 2.5, '#fff', 8, 80); stream(pay, 3, '#fff', 4, 70);
        const tx = (s, x, y, from) => label(c, s, x, y, smooth(clamp((t - from) / .5)), 'center');
        tx(S.N.loanT + ' loan', (st.xs[0] + st.sq + st.xs[1]) / 2, st.top - 14, .9); tx('Buys the robots', (st.xs[1] + st.sq + st.xs[2]) / 2, st.top - 14, 1.3);
        tx(S.N.rentT + ' rent a month', (st.xs[1] + st.sq / 2 + st.xs[3] + st.sq / 2) / 2, st.route + 22, 2.2); tx(S.N.payT + ' a month, plus interest', (st.xs[0] + st.xs[1] + st.sq) / 2 + 6, st.route + 22, 2.8); } },
    // the arm drains to the auction line
    drain: { setup(S) { const H = S.h - 64, cx = Math.max(S.w * .6, LEFT + 230 + H * .45), top = 32; S.state = { H, top, cx, pts: armIn(cx, top, H), left: cx - H * .45 - 24 }; S.f = S.fig({ left: LEFT, top: S.h / 2 - 48 }, '100%', 'of what sellers usually ask'); },
      paint(c, t, S) { const st = S.state, p = smooth(clamp((t - .7) / 2.6)), share = lerp(1, S.N.pct / 100, p), wave = t > 3.3 ? Math.sin(t * 1.4) * 1.2 : 0, line = st.top + st.H * (1 - share) + wave; const a = smooth(clamp(t / .5));
        c.globalAlpha = a; c.fillStyle = W(.16); c.beginPath(); for (const d of st.pts) if (d.y < line) disc(c, d.x, d.y, d.r); c.fill(); c.fillStyle = '#fff'; c.beginPath(); for (const d of st.pts) if (d.y >= line) disc(c, d.x, d.y, d.r); c.fill(); c.globalAlpha = 1;
        c.lineWidth = 1; c.strokeStyle = W(.28); c.beginPath(); c.moveTo(st.left, st.top + .5); c.lineTo(S.w, st.top + .5); c.stroke(); c.strokeStyle = C(.9); c.beginPath(); c.moveTo(st.left, Math.round(line) + .5); c.lineTo(S.w, Math.round(line) + .5); c.stroke();
        label(c, 'What sellers usually ask', S.w - 40, st.top + 22, a, 'right', W(.72)); if (line > st.top + 44) label(c, 'Sold at auction', S.w - 40, line - 8, smooth(clamp((line - st.top - 44) / 30)), 'right', C(1));
        S.f.b(Math.round(share * 100) + '%'); } },
    // dots fall onto the price line
    fall: { setup(S) { const f = chart(S); S.state = { f, pts: D.pts.map((p, i) => ({ x: f.X(p[0]), y: f.Y(p[1]), d: R(i) * 1.5 })), line: D.curve.map((u, a) => [f.X(a), f.Y(u)]) }; },
      paint(c, t, S) { const st = S.state, f = st.f; axes(c, f, smooth(clamp(t / .5))); c.fillStyle = W(.78); c.beginPath(); for (const d of st.pts) { const p = clamp((t - d.d) / .7); if (!p) continue; disc(c, d.x, lerp(-8, d.y, p * p), 2.1); } c.fill();
        const k = smooth(clamp((t - 2) / 1.1)) * (st.line.length - 1); if (k > 0) { c.strokeStyle = C(1); c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(st.line[0][0], st.line[0][1]); const n = Math.floor(k); for (let i = 1; i <= n; i++) c.lineTo(st.line[i][0], st.line[i][1]); if (n < st.line.length - 1) c.lineTo(lerp(st.line[n][0], st.line[n + 1][0], k - n), lerp(st.line[n][1], st.line[n + 1][1], k - n)); c.stroke();
          if (t > 3.1) { const u = ((t - 3.1) * .09) % 1, q = u * (st.line.length - 1), i = Math.floor(q); c.fillStyle = C(1); c.beginPath(); disc(c, lerp(st.line[i][0], st.line[Math.min(i + 1, st.line.length - 1)][0], q - i), lerp(st.line[i][1], st.line[Math.min(i + 1, st.line.length - 1)][1], q - i), 4.5); c.fill(); }
          const a = smooth(clamp((t - 2.9) / .5)), lx = f.X(27), ly = f.Y(D.curve[27]); c.globalAlpha = a; c.strokeStyle = C(.8); c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(lx) + .5, ly - 6); c.lineTo(Math.round(lx) + .5, f.y0 + 26); c.stroke(); c.globalAlpha = 1; label(c, 'What sellers usually ask', lx + 6, f.y0 + 18, a, 'center', C(1)); }
        axisWords(c, f, smooth(clamp((t - .3) / .5))); } },
    // the 433 dots leave the arm and settle into the chart
    settle: { setup(S) { const f = chart(S), arm = armIn(LEFT + (S.w - LEFT) * .5, 18, S.h - 36); S.state = { f, pts: D.pts.map((p, i) => ({ ax: arm[i].x, ay: arm[i].y, ar: arm[i].r, x: f.X(p[0]), y: f.Y(p[1]), d: .7 + R(i + 9) * .7 })) }; S.f = S.fig({ right: 40, top: 22 }, count(S.N.points), 'robot arms for sale', true); S.f.a(0); },
      paint(c, t, S) { const st = S.state, f = st.f, a = smooth(clamp((t - 1.5) / .6)); axes(c, f, a); c.globalAlpha = smooth(clamp(t / .4)); for (let g = 0; g < 4; g++) { const tw = t > 3 ? .72 + .16 * Math.sin(t * .9 + g * 1.57) : .8; c.fillStyle = W(tw); c.beginPath(); for (let i = g; i < st.pts.length; i += 4) { const d = st.pts[i], p = smooth(clamp((t - d.d) / 1.15)); disc(c, lerp(d.ax, d.x, p), lerp(d.ay, d.y, p), lerp(d.ar, 2.1, p)); } c.fill(); } c.globalAlpha = 1; axisWords(c, f, a); S.f.a(smooth(clamp((t - 2) / .5))); } },
    // a pixel arm, and its price counting in
    count: { setup(S) { const H = S.h - 48, cx = LEFT + 16 + H * .45; const pts = armIn(cx, 24, H).map((d, i) => ({ ...d, sx: LEFT + R(i + 3) * (S.w - LEFT), sy: R(i + 5) * S.h, dl: R(i + 7) * .6 })); S.state = { pts, H, top: 24 }; S.f = S.fig({ left: cx + H * .45 + 48, top: S.h / 2 - 56 }, usd(0), S.N.askOf); },
      paint(c, t, S) { const st = S.state, sweep = t < 2.8 ? clamp((t - 1) / 1.6) : ((t - 2.8) % 6) / 1.8, ly = st.top + st.H * sweep; c.fillStyle = W(.82); c.beginPath(); const hi = []; for (const d of st.pts) { const p = smooth(clamp((t - d.dl) / .9)), x = lerp(d.sx, d.x, p), y = lerp(d.sy, d.y, p); if (p >= 1 && sweep <= 1 && Math.abs(y - ly) < 16) hi.push(x, y, d.r); else disc(c, x, y, lerp(1.5, d.r, p)); } c.fill(); if (hi.length) { c.fillStyle = C(1); c.beginPath(); for (let i = 0; i < hi.length; i += 3) disc(c, hi[i], hi[i + 1], hi[i + 2] * 1.15); c.fill(); }
        S.f.b(usd(S.N.ask * out3(clamp((t - 1) / 1.6)))); } },
    // robots walk in a line, off the right edge and on. The arms we price today go first, at full strength; the rest come next
    walk: { setup(S) { const row = S.row(), H = S.h - 88, unit = H * .8 / 200, list = [['hero-arm-loop', 195, 115, 1], ['hero-cobot-loop', 196, 80, 1], ['hero-amr-loop', 101, 99, .42], ['hero-pallet-loop', 196, 97, .42], ['hero-delivery-loop', 117, 96, .42], ['hero-cleaning-loop', 148, 83, .42]], sum = list.reduce((t, b) => t + b[1] * unit, 0), wide = 196 * unit, gap = Math.max(36, (S.w + 2 * wide - sum) / list.length);
        let x = 0; const bots = list.map(([n, w, rows, a]) => { const px = w * unit, b = { el: S.bot(row, n, px, `112/${rows}`, 'static', a), x }; x += px + gap; return b; }); S.state = { bots, L: x, wide }; },
      paint(c, t, S) { const st = S.state, go = t * 24 - 240 * (1 - out3(clamp(t / 1.6))); for (const b of st.bots) { let x = (b.x - go) % st.L; if (x < 0) x += st.L; b.el.style.transform = `translate3d(${(x - st.wide + 56).toFixed(1)}px,0,0)`; } } },
    // the line of eight, built one at a time
    parade: { setup(S) { const row = S.row(), H = S.h - 88, list = [['hero-humanoid-loop', 125, 206, 230], ['hero-legged-loop', 149, 90, 120], ['hero-drone-loop', 124, 63, 70], ['hero-arm-loop', 195, 115, 200], ['hero-pallet-loop', 196, 97, 170], ['hero-delivery-loop', 117, 96, 100], ['hero-cleaning-loop', 148, 83, 110], ['hero-cobot-loop', 196, 80, 140]], sum = list.reduce((t, b) => t + b[1], 0), gap = 14, unit = Math.min((S.w - LEFT - gap * 7 + 48) / sum, H * .96 / 230);
        let x = LEFT; list.forEach(([n, w, rows], i) => { const px = w * unit, b = S.bot(row, n, px, `112/${rows}`, reduce ? 'static' : 'assemble', 1, i * 140); b.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; x += px + gap; }); },
      paint() {} },
    // what the price record is built from: every listing a dot, the ones with a price shown bright
    record: { setup(S) { const n = S.N.listings, top = S.h * .5, x0 = LEFT, bw = S.w - x0, bh = S.h - top - 28, cell = Math.max(5, Math.sqrt(bw * bh / n)), cols = Math.floor(bw / cell), dots = []; for (let i = 0; i < n; i++) { const q = i * 2.399963; dots.push({ x: x0 + (i % cols) * cell, y: top + Math.floor(i / cols) * cell, sx: x0 + R(i) * bw, sy: R(i + .3) * S.h, d: R(i + .6) * .9, lit: R(i + .8) < S.N.priced / n }); } S.state = { dots, s: Math.max(2, cell * .46) };
        const figs = [[S.N.listings, 'public listings'], [S.N.sources, 'marketplaces'], [S.N.auctions, 'auction results']], step = Math.min(240, (S.w - LEFT - 40) / 3); S.state.figs = figs.map(([v, l], i) => ({ v, f: S.fig({ left: LEFT + i * step, top: 28 }, '0', l) })); },
      paint(c, t, S) { const st = S.state, s = st.s; for (const lit of [false, true]) { c.fillStyle = lit ? '#fff' : W(.3); c.beginPath(); for (const d of st.dots) { if (d.lit !== lit) continue; const p = smooth(clamp((t - d.d) / .8)); c.rect(lerp(d.sx, d.x, p), lerp(d.sy, d.y, p), s, s); } c.fill(); } st.figs.forEach((o, i) => o.f.b(count(o.v * out3(clamp((t - .3 - i * .15) / 1.3))))); } },
    // the mark, gathered from dots
    mark: { setup(S) { const H = Math.min(S.h - 96, 300), u = H / 80, cell = Math.max(7, Math.round(u * 3.2)), x0 = LEFT + (S.w - LEFT) * .5 - 42 * u, y0 = (S.h - H) / 2, dots = []; [84, 58, 32].forEach((w, b) => { const by = y0 + b * 29 * u; for (let y = 0; y < 22 * u; y += cell) for (let x = 0; x < w * u; x += cell) { const i = dots.length; dots.push({ x: x0 + x, y: by + y, sx: LEFT + R(i) * (S.w - LEFT), sy: R(i + .4) * S.h, d: R(i + .7) * .8 }); } }); S.state = { dots, r: cell * .36 }; },
      paint(c, t, S) { const st = S.state; c.fillStyle = '#fff'; c.beginPath(); for (const d of st.dots) { const p = smooth(clamp((t - d.d) / .9)), sway = t > 2 ? Math.sin(t * 1.2 + d.x * .02) * .14 : 0; disc(c, lerp(d.sx, d.x, p), lerp(d.sy, d.y, p), st.r * (1 + sway)); } c.fill(); } },
  };

  let run = null, swap = 0, capT = 0;
  const end = () => { if (!run) return; cancelAnimationFrame(run.raf); (run.bots || []).forEach(b => { const d = window.FerraDots; if (d && b.cv._seen) d.pause(b.cv); clearTimeout(b.timer); b.el.remove(); }); run.nodes.forEach(n => n.remove()); run = null; };
  const begin = (stage, name, N) => { end(); const def = SCENES[name]; if (!def) return; let cv = stage.querySelector('canvas.np-cv'); if (!cv) { cv = document.createElement('canvas'); cv.className = 'np-cv'; stage.prepend(cv); }
    const box = stage.getBoundingClientRect(), w = Math.round(box.width), h = Math.round(box.height), dpr = Math.min(2, devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext('2d');
    const S = { w, h, dpr, N, nodes: [], bots: [], state: null, f: null,
      // a big figure, in the page's own type, and a small line under it
      fig(pos, big, small, right) { const p = document.createElement('p'); p.className = 'np-fig'; for (const k in pos) p.style[k] = pos[k] + 'px'; if (right) p.style.textAlign = 'right'; const b = document.createElement('b'), s = document.createElement('span'); b.textContent = big; s.textContent = small; p.append(b, s); stage.append(p); S.nodes.push(p); return { b: v => { if (b.textContent !== v) b.textContent = v; }, a: v => { p.style.opacity = v; } }; },
      // a row on a hairline, for the moving robots, which dotbot.js paints
      row() { const r = document.createElement('div'); r.className = 'np-row'; stage.append(r); S.nodes.push(r); return r; },
      bot(row, name, width, ar, anim, alpha, delay) { const el = document.createElement('span'); el.className = 'ff-bot np-rb'; el.style.width = width + 'px'; el.style.setProperty('--ar', ar); if (alpha < 1) el.style.opacity = alpha; const cvs = document.createElement('canvas'); cvs.dataset.bot = name; cvs.dataset.tone = 'light'; cvs.dataset.anim = anim; el.append(cvs); row.append(el); const d = window.FerraDots, o = { el, cv: cvs }; if (d) { d.fetch(cvs); const go = () => { if (!run || !run.bots.includes(o)) return; cvs.classList.add('dotbot'); cvs._seen = 1; cvs._vis = true; d.draw(cvs); }; o.timer = setTimeout(go, delay || 0); } S.bots.push(o); return el; } };
    run = { name, stage, raf: 0, nodes: S.nodes, bots: S.bots };
    def.setup(S);
    const paint = t => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); def.paint(c, t, S); };
    if (reduce) { paint(60); return; }
    const t0 = performance.now(), mine = run, frame = n => { if (run !== mine) return; paint((n - t0) / 1000); mine.raf = requestAnimationFrame(frame); }; paint(0); mine.raf = requestAnimationFrame(frame); };

  window.FerraNP = {
    pick(a, N) { const name = a.dataset.sc, inner = a.closest('.np-in'), stage = inner.querySelector('.np-card'), cap = inner.querySelector('.np-cap'), text = a.dataset.cap || '';
      if (cap && cap.textContent !== text) { clearTimeout(capT); if (reduce || !cap.textContent) cap.textContent = text; else { cap.classList.add('off'); capT = setTimeout(() => { cap.textContent = text; cap.classList.remove('off'); }, 130); } }
      if (run && run.stage === stage && run.name === name) return; clearTimeout(swap);
      if (run && run.stage === stage && !reduce) { stage.classList.add('off'); swap = setTimeout(() => { begin(stage, name, N); stage.classList.remove('off'); }, 140); } else { stage.classList.remove('off'); begin(stage, name, N); } },
    stop() { clearTimeout(swap); clearTimeout(capT); end(); document.querySelectorAll('.np-card.off').forEach(s => s.classList.remove('off')); },
  };
})();
