// The header panels' live pictures. site.js loads this and media/nav/np-data.js the first time a panel opens, and calls FerraNP.pick(link, numbers) for the link under the pointer.
// One canvas per panel, one frame at a time, and nothing runs once the panel has shut. Every number comes from the page's data-n, which core.py reads from the price data and the example loan. Each scene paints as a pure function of time.
// Reduced motion: each scene paints once at its finished state.
(() => {
  const D = window.FERRA_NP_DATA, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, clamp = v => v < 0 ? 0 : v > 1 ? 1 : v, smooth = t => t * t * (3 - 2 * t), out3 = t => 1 - Math.pow(1 - t, 3), lerp = (a, b, k) => a + (b - a) * k;
  const R = n => { const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
  const usd = n => '$' + Math.round(n).toLocaleString('en-US'), count = n => Math.round(n).toLocaleString('en-US');
  const W = a => `rgba(255,255,255,${a})`, C = a => `rgba(150,232,255,${a})`, INK = '#0e1626';
  const F16 = "400 16px Geist,'Geist Fallback',system-ui,sans-serif";
  const disc = (c, x, y, r) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };
  // a label on a solid plate of the ground colour, so whatever sits under it gives way
  const label = (c, text, x, y, a, align, col) => { c.font = F16; const tw = c.measureText(text).width, lx = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x; c.globalAlpha = a; c.fillStyle = INK; c.fillRect(lx - 6, y - 16, tw + 12, 23); c.fillStyle = col || W(.86); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(text, lx, y); c.globalAlpha = 1; };
  // the film's arm, one dot per listing, measured on its visible dots: its left edge at x, its top at y, H tall
  const BOX = (() => { const b = { a: 1e9, r: -1e9, t: 1e9, u: -1e9 }; for (const s of D.seats) { if (s[0] < b.a) b.a = s[0]; if (s[0] > b.r) b.r = s[0]; if (s[1] < b.t) b.t = s[1]; if (s[1] > b.u) b.u = s[1]; } return b; })();
  const armAt = (x, y, H) => { const k = H / (BOX.u - BOX.t); return D.seats.map(s => ({ x: x + (s[0] - BOX.a) * k, y: y + (s[1] - BOX.t) * k, r: s[2] * k * .86 })); };
  const armW = H => (BOX.r - BOX.a) * H / (BOX.u - BOX.t);
  // the shared chart: age across, asking price up on a log scale. Its base is the picture's rule. Its words sit inside it, each on a plate
  const chart = (S, W) => { const x0 = 0, x1 = W || S.w, y0 = 9, y1 = S.h - 1, lo = Math.log(200), hi = Math.log(130000); return { x0, x1, y0, y1, X: a => x0 + 6 + (x1 - x0 - 6) * a / 33, Y: u => y1 - 4 - (y1 - y0 - 4) * clamp((Math.log(u) - lo) / (hi - lo)) }; };
  const axes = (c, f, a) => { c.globalAlpha = a; c.lineWidth = 1; c.strokeStyle = W(.1); c.beginPath(); for (const u of [100000, 10000, 1000]) { const y = Math.round(f.Y(u)) + .5; c.moveTo(f.x0, y); c.lineTo(f.x1, y); } c.stroke(); c.globalAlpha = 1; };
  const axisWords = (c, f, a) => { for (const [u, t] of [[100000, '$100,000'], [10000, '$10,000'], [1000, '$1,000']]) label(c, t, f.x0, Math.round(f.Y(u)) - 7, a, 'left', W(.62)); label(c, 'New', f.x0, f.y1 - 9, a, 'left', W(.62)); for (const n of [10, 20, 30]) label(c, n + ' years old', f.X(n), f.y1 - 9, a, 'center', W(.62)); };

  const SCENES = {
    // dots gather into 50 arms, 35 of them light up, and the figure ticks up to the example loan. The rows fill three of the picture's seven columns, from its top line to its rule, and the figure stands on the rule beside them
    borrow: { setup(S) { const cols = 10, rows = 5, gw = S.line(3) - S.g, cw = gw / cols, aw = cw * .94, k = aw / (BOX.r - BOX.a), ch = (BOX.u - BOX.t) * k + 2, py = (S.h - 3 - ch) / (rows - 1);
        const dpr = S.dpr, sp = document.createElement('canvas'); sp.width = Math.ceil(cw * dpr); sp.height = Math.ceil(ch * dpr); const x = sp.getContext('2d'); x.scale(dpr, dpr); x.fillStyle = '#fff'; x.beginPath(); D.seats.forEach(s => disc(x, 1 + (s[0] - BOX.a) * k, 1 + (s[1] - BOX.t) * k, Math.max(.45, s[2] * k * .8))); x.fill();
        const cells = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ x: i * cw, y: 1 + j * py, n: j * cols + i });
        const bits = []; cells.forEach(cl => { for (let b = 0; b < 8; b++) { const q = cl.n * 8 + b; bits.push({ sx: R(q) * gw, sy: R(q + .5) * S.h, x: cl.x + cw * (.2 + R(q + .2) * .6), y: cl.y + ch * (.1 + R(q + .7) * .8), d: R(q + .9) * .7 }); } });
        S.state = { cells, bits, sp, cw, ch, lit: S.N.borrowLit || 35 }; S.f = S.fig({ left: S.line(3), bottom: 12 }, usd(0), 'The example loan'); },
      paint(c, t, S) { const st = S.state; c.fillStyle = W(.7); c.beginPath(); for (const b of st.bits) { const p = clamp((t - b.d) / .8); if (p >= 1) continue; const k = smooth(p); disc(c, lerp(b.sx, b.x, k), lerp(b.sy, b.y, k), 1.5); } c.fill();
        const on = clamp((t - 1.1) / 1.5) * st.lit; for (const cl of st.cells) { const a = smooth(clamp((t - .55 - cl.n * .006) / .6)); const i = cl.n, litNow = clamp(on - i); const shine = i < st.lit && t > 3 ? .1 * Math.max(0, Math.sin(t * 1.1 - i * .37)) : 0; c.globalAlpha = a * (.24 + .66 * litNow + shine); c.drawImage(st.sp, cl.x, cl.y, st.cw, st.ch); } c.globalAlpha = 1; S.f.b(usd(S.N.loan * on / st.lit)); } },
    // the money travels the path between the four squares: words on the picture's top line, the squares under them, rent running back along the bottom
    flow: { setup(S) { const route = S.h - 38, top = 26, sq = Math.round(Math.min(150, S.w * .19, route - top - 24)), cy = top + sq / 2, x3 = S.w - sq - 1, gap = x3 / 3, xs = [0, 1, 2, 3].map(i => Math.round(gap * i)), bot = top + sq;
        const lanes = { loan: [[xs[0] + sq, cy - 14], [xs[1], cy - 14]], buy: [[xs[1] + sq, cy - 14], [xs[2], cy - 14]], rent: [[xs[3] + sq / 2, bot], [xs[3] + sq / 2, route], [xs[1] + sq / 2, route], [xs[1] + sq / 2, bot]], pay: [[xs[1], cy + 14], [xs[0] + sq, cy + 14]], use: [[xs[2] + sq, cy], [xs[3], cy]] };
        for (const k in lanes) { const L = lanes[k]; let sum = 0; L.len = [0]; for (let i = 1; i < L.length; i++) { sum += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); L.len.push(sum); } L.total = sum; }
        S.state = { sq, cy, xs, top, bot, route, lanes, gap }; },
      paint(c, t, S) { const st = S.state, at = (L, k) => { const d = k * L.total; let i = 1; while (i < L.length - 1 && L.len[i] < d) i++; const u = (d - L.len[i - 1]) / (L.len[i] - L.len[i - 1] || 1); return [lerp(L[i - 1][0], L[i][0], u), lerp(L[i - 1][1], L[i][1], u)]; };
        const trace = (L, k, a) => { c.strokeStyle = W(a); c.lineWidth = 1; c.beginPath(); c.moveTo(L[0][0], L[0][1]); const d = k * L.total; for (let i = 1; i < L.length; i++) { if (L.len[i] <= d) c.lineTo(L[i][0], L[i][1]); else { const u = (d - L.len[i - 1]) / (L.len[i] - L.len[i - 1]); c.lineTo(lerp(L[i - 1][0], L[i][0], u), lerp(L[i - 1][1], L[i][1], u)); break; } } c.stroke(); };
        const stream = (L, from, col, n, sp) => { const on = clamp((t - from) / .4); if (!on) return; c.fillStyle = col; c.globalAlpha = on; c.beginPath(); for (let i = 0; i < n; i++) { const k = ((t - from) * sp / L.total + i / n) % 1, p = at(L, k), r = 3.2 * Math.min(1, Math.min(k, 1 - k) * 12); if (r > .2) disc(c, p[0], p[1], r); } c.fill(); c.globalAlpha = 1; };
        const { loan, buy, rent, pay, use } = st.lanes, seg = (a, b) => smooth(clamp((t - a) / (b - a)));
        trace(loan, seg(.5, 1), .4); trace(buy, seg(1, 1.4), .4); trace(use, seg(1.4, 1.7), .18); trace(rent, seg(1.8, 2.5), .4); trace(pay, seg(2.6, 3), .4);
        st.xs.forEach((x, i) => { const a = smooth(clamp((t - i * .1) / .5)); c.globalAlpha = a; c.strokeStyle = W(.72); c.lineWidth = 1; c.strokeRect(x + .5, st.top + .5, st.sq, st.sq); c.font = F16; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(['The lender', 'The company', 'The robots', 'Customers'][i], x + st.sq / 2, st.cy); c.globalAlpha = 1; });
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        stream(loan, 1, C(1), 4, 90); stream(buy, 1.4, C(1), 3, 70); stream(rent, 2.5, '#fff', 8, 80); stream(pay, 3, '#fff', 4, 70);
        const tx = (s, x, y, from) => label(c, s, x, y, smooth(clamp((t - from) / .5)), 'center');
        tx(S.N.loanT + ' example loan', (st.xs[0] + st.sq + st.xs[1]) / 2, 12, .9); tx('Buys the robots', (st.xs[1] + st.sq + st.xs[2]) / 2, 12, 1.3);
        tx(S.N.rentT + ' example rent a month', (st.xs[1] + st.sq / 2 + st.xs[3] + st.sq / 2) / 2, st.route + 22, 2.2); tx(S.N.payT + ' a month, plus interest', (st.xs[0] + st.xs[1] + st.sq) / 2, st.route + 22, 2.8); } },
    // the arm drains to the auction line. Three columns on the grid: the arm on the rule, the words at the ends of the two lines, the figure on the rule
    drain: { setup(S) { const top = 6, H = S.h - top - 3, lx = S.snap(armW(H) + S.g); S.state = { H, top, pts: armAt(2, top, H), lx }; S.f = S.fig({ left: S.snap(lx + 130), bottom: 12 }, '100%', 'of what sellers usually ask'); },
      paint(c, t, S) { const st = S.state, p = smooth(clamp((t - .7) / 2.6)), share = lerp(1, S.N.pct / 100, p), wave = t > 3.3 ? Math.sin(t * 1.4) * 1.2 : 0, line = st.top + st.H * (1 - share) + wave; const a = smooth(clamp(t / .5));
        c.globalAlpha = a; c.fillStyle = W(.16); c.beginPath(); for (const d of st.pts) if (d.y < line) disc(c, d.x, d.y, d.r); c.fill(); c.fillStyle = '#fff'; c.beginPath(); for (const d of st.pts) if (d.y >= line) disc(c, d.x, d.y, d.r); c.fill(); c.globalAlpha = 1;
        const end = st.lx - 12; c.lineWidth = 1; c.strokeStyle = W(.28); c.beginPath(); c.moveTo(0, st.top + .5); c.lineTo(end, st.top + .5); c.stroke(); c.strokeStyle = C(.9); c.beginPath(); c.moveTo(0, Math.round(line) + .5); c.lineTo(end, Math.round(line) + .5); c.stroke();
        label(c, 'What sellers usually ask', st.lx, st.top + 6, a, 'left', W(.72)); if (line > st.top + 26) label(c, 'Sold at auction', st.lx, line + 6, smooth(clamp((line - st.top - 26) / 30)), 'left', C(1));
        S.f.b(Math.round(share * 100) + '%'); } },
    // dots fall onto the price line
    fall: { setup(S) { const f = chart(S); S.state = { f, pts: D.pts.map((p, i) => ({ x: f.X(p[0]), y: f.Y(p[1]), d: R(i) * 1.5 })), line: D.curve.map((u, a) => [f.X(a), f.Y(u)]) }; },
      paint(c, t, S) { const st = S.state, f = st.f; axes(c, f, smooth(clamp(t / .5))); c.fillStyle = W(.78); c.beginPath(); for (const d of st.pts) { const p = clamp((t - d.d) / .7); if (!p) continue; disc(c, d.x, lerp(Math.max(6, d.y - 64), d.y, p * p), 2.1 * smooth(clamp(p * 2))); } c.fill();
        const k = smooth(clamp((t - 2) / 1.1)) * (st.line.length - 1); if (k > 0) { c.strokeStyle = C(1); c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(st.line[0][0], st.line[0][1]); const n = Math.floor(k); for (let i = 1; i <= n; i++) c.lineTo(st.line[i][0], st.line[i][1]); if (n < st.line.length - 1) c.lineTo(lerp(st.line[n][0], st.line[n + 1][0], k - n), lerp(st.line[n][1], st.line[n + 1][1], k - n)); c.stroke();
          if (t > 3.1) { const u = ((t - 3.1) * .09) % 1, q = u * (st.line.length - 1), i = Math.floor(q); c.fillStyle = C(1); c.beginPath(); disc(c, lerp(st.line[i][0], st.line[Math.min(i + 1, st.line.length - 1)][0], q - i), lerp(st.line[i][1], st.line[Math.min(i + 1, st.line.length - 1)][1], q - i), 4.5); c.fill(); }
          const a = smooth(clamp((t - 2.9) / .5)), lx = f.X(27), ly = f.Y(D.curve[27]), wy = Math.round(f.Y(100000)) + 24; c.globalAlpha = a; c.strokeStyle = C(.8); c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(lx) + .5, ly - 6); c.lineTo(Math.round(lx) + .5, wy + 8); c.stroke(); c.globalAlpha = 1; label(c, 'What sellers usually ask', lx, wy, a, 'center', C(1)); }
        axisWords(c, f, smooth(clamp((t - .3) / .5))); } },
    // the 433 dots leave the arm and settle into the chart, and their count stands on the rule beside it
    settle: { setup(S) { const W6 = S.line(4) - S.g, f = chart(S, W6), H = S.h - 5, arm = armAt((W6 - armW(H)) / 2, 2, H); S.state = { f, pts: D.pts.map((p, i) => ({ ax: arm[i].x, ay: arm[i].y, ar: arm[i].r, x: f.X(p[0]), y: f.Y(p[1]), d: .7 + R(i + 9) * .7 })) }; S.f = S.fig({ left: S.line(4), bottom: 12 }, count(S.N.points), 'robot arms for sale'); S.f.a(0); },
      paint(c, t, S) { const st = S.state, f = st.f, a = smooth(clamp((t - 1.5) / .6)); axes(c, f, a); c.globalAlpha = smooth(clamp(t / .4)); for (let g = 0; g < 4; g++) { const tw = t > 3 ? .72 + .16 * Math.sin(t * .9 + g * 1.57) : .8; c.fillStyle = W(tw); c.beginPath(); for (let i = g; i < st.pts.length; i += 4) { const d = st.pts[i], p = smooth(clamp((t - d.d) / 1.15)); disc(c, lerp(d.ax, d.x, p), lerp(d.ay, d.y, p), lerp(d.ar, 2.1, p)); } c.fill(); } c.globalAlpha = 1; axisWords(c, f, a); S.f.a(smooth(clamp((t - 2) / .5))); } },
    // a pixel arm on the rule, and its price counting in, standing on the same rule
    count: { setup(S) { const H = S.h - 5, aw = armW(H); const pts = armAt(2, 2, H).map((d, i) => ({ ...d, sx: R(i + 3) * aw, sy: R(i + 5) * S.h, dl: R(i + 7) * .6 })); S.state = { pts, H, top: 2 }; S.f = S.fig({ left: S.snap(aw + S.g), bottom: 12 }, usd(0), S.N.askOf); },
      paint(c, t, S) { const st = S.state, sweep = t < 2.8 ? clamp((t - 1) / 1.6) : ((t - 2.8) % 6) / 1.8, ly = st.top + st.H * sweep; c.fillStyle = W(.82); c.beginPath(); const hi = []; for (const d of st.pts) { const p = smooth(clamp((t - d.dl) / .9)), x = lerp(d.sx, d.x, p), y = lerp(d.sy, d.y, p); if (p >= 1 && sweep <= 1 && Math.abs(y - ly) < 16) hi.push(x, y, d.r); else disc(c, x, y, lerp(1.5, d.r, p)); } c.fill(); if (hi.length) { c.fillStyle = C(1); c.beginPath(); for (let i = 0; i < hi.length; i += 3) disc(c, hi[i], hi[i + 1], hi[i + 2] * 1.15); c.fill(); }
        S.f.b(usd(S.N.ask * out3(clamp((t - 1) / 1.6)))); } },
    // robots walk into a line that fits the picture, the arms we price at full strength, the rest quieter. The count stands above them
    walk: { setup(S) { const row = S.row(), list = [['hero-arm-loop', 195, 115, 1], ['hero-cobot-loop', 196, 80, 1], ['hero-amr-loop', 101, 99, .42], ['hero-pallet-loop', 196, 97, .42], ['hero-delivery-loop', 117, 96, .42], ['hero-cleaning-loop', 148, 83, .42]], sum = list.reduce((t, b) => t + b[1], 0), unit = Math.min((S.w - 5 * S.g) / sum, (S.h - 112) / 200), l = list[0][1] * unit * .042, r = list[5][1] * unit * .01, gap = (S.w + l + r - sum * unit) / 5;
        let x = -l; const bots = list.map(([n, w, rows, a], i) => { const px = w * unit, b = { el: S.bot(row, n, px, `112/${rows}`, 'static', a), x, a, d: i * .12 }; x += px + gap; return b; }); S.state = { bots }; S.f = S.fig({ left: 0, top: 0 }, count(S.N.families), `families of robot arm, across ${count(S.N.models)} models`); },
      paint(c, t, S) { for (const b of S.state.bots) { const p = out3(clamp((t - b.d) / .8)); b.el.style.transform = `translate3d(${(b.x - 44 * (1 - p)).toFixed(1)}px,0,0)`; b.el.style.opacity = b.a * p; } } },
    // four of the line, built one at a time, as tall as the picture
    parade: { setup(S) { const row = S.row(), list = [['hero-humanoid-loop', 125, 206], ['hero-legged-loop', 149, 90], ['hero-drone-loop', 124, 63], ['hero-arm-loop', 195, 115]], sum = list.reduce((t, b) => t + b[1], 0), unit = Math.min((S.w - 3 * S.g) / sum, (S.h - 2) / 230), l = list[0][1] * unit * .029, r = list[3][1] * unit * .036, gap = (S.w + l + r - sum * unit) / 3;
        let x = -l; list.forEach(([n, w, rows], i) => { const px = w * unit, b = S.bot(row, n, px, `112/${rows}`, reduce ? 'static' : 'assemble', 1, i * 200); b.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; x += px + gap; }); },
      paint() {} },
    // About Ferra: the Ferra mark drawn in dots. The three bars come from core.py (final.py's mark, in its 100 by 100 box); the dots gather from across the picture into the bars,
    // then a soft light runs down the bars and across them, again and again. The mark stands on the picture's rule, from its left edge
    mark: { setup(S) { const bars = S.N.mark || [[8, 10, 84, 22, 5], [8, 39, 58, 22, 5], [8, 68, 32, 22, 5]], b = { l: 1e9, t: 1e9, r: -1e9, u: -1e9 };
        for (const [x, y, w, h] of bars) { b.l = Math.min(b.l, x); b.t = Math.min(b.t, y); b.r = Math.max(b.r, x + w); b.u = Math.max(b.u, y + h); }
        const H = S.h - 4, k = H / (b.u - b.t), pitch = Math.max(5, H / 34), rd = pitch * .34, dots = [];
        const inside = (px, py, [x, y, w, h, rx]) => { if (px < x || px > x + w || py < y || py > y + h) return false; const cx = Math.min(Math.max(px, x + rx), x + w - rx), cy = Math.min(Math.max(py, y + rx), y + h - rx); return Math.hypot(px - cx, py - cy) <= rx; };
        const gw = (b.r - b.l) * k, gh = (b.u - b.t) * k, nx = Math.floor(gw / pitch), ny = Math.floor(gh / pitch), ox = (gw - nx * pitch) / 2 + pitch / 2, oy = (gh - ny * pitch) / 2 + pitch / 2;
        let n = 0; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = ox + i * pitch, y = oy + j * pitch; if (!bars.some(r => inside(b.l + x / k, b.t + y / k, r))) continue; n++; dots.push({ x, y: 2 + y, sx: R(n) * S.w, sy: R(n + .4) * S.h, d: R(n + .7) * .8 + (x / gw) * .3 }); }
        S.state = { dots, rd, gw, gh }; },
      paint(c, t, S) { const st = S.state, run = t > 2.2 ? ((t - 2.2) % 5.5) / 2.4 : -1, edge = run * (st.gw + st.gh) - st.gh * .3;
        c.fillStyle = W(.9); c.beginPath(); const hi = [];
        for (const d of st.dots) { const p = smooth(clamp((t - d.d) / 1.1)), x = lerp(d.sx, d.x, p), y = lerp(d.sy, d.y, p), r = lerp(st.rd * .6, st.rd, p); const f = run >= 0 && run <= 1 ? Math.max(0, 1 - Math.abs(d.x + d.y * .6 - edge) / 70) : 0; if (f > .05) hi.push(x, y, r * (1 + .25 * f), f); else disc(c, x, y, r); }
        c.fill(); for (let i = 0; i < hi.length; i += 4) { c.fillStyle = `rgba(${Math.round(255 - 105 * hi[i + 3])},${Math.round(255 - 23 * hi[i + 3])},255,1)`; c.beginPath(); disc(c, hi[i], hi[i + 1], hi[i + 2]); c.fill(); } } },
  };

  let run = null, swap = 0;
  const end = () => { if (!run) return; cancelAnimationFrame(run.raf); (run.bots || []).forEach(b => { const d = window.FerraDots; if (d && b.cv._seen) d.pause(b.cv); clearTimeout(b.timer); b.el.remove(); }); run.nodes.forEach(n => n.remove()); run = null; };
  const begin = (stage, name, N) => { end(); const def = SCENES[name]; if (!def) return; let cv = stage.querySelector('canvas.np-cv'); if (!cv) { cv = document.createElement('canvas'); cv.className = 'np-cv'; stage.prepend(cv); }
    const box = stage.getBoundingClientRect(), w = Math.round(box.width), h = Math.round(box.height), dpr = Math.min(2, devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext('2d');
    const g = 24, step = (w + g) / 7;   // the picture spans seven of the page's twelve columns (6 to 12, after one empty column): line(i) is the left edge of its column i, and the picture ends on the right margin
    const S = { w, h, dpr, N, g, line: i => i * step, snap: x => Math.ceil(x / step - .001) * step, nodes: [], bots: [], state: null, f: null,
      // a big figure, in the page's own type, and a small line under it. Its left edge sits on a column line. It runs no further than the right margin, and the small line wraps if it must. A figure at the top lifts so its capitals meet the picture's top line.
      fig(pos, big, small) { const p = document.createElement('p'); p.className = 'np-fig'; if (pos.top === 0) p.classList.add('up'); for (const k in pos) p.style[k] = pos[k] + 'px'; if (pos.right === undefined) p.style.right = '0'; const b = document.createElement('b'), s = document.createElement('span'); b.textContent = big; s.textContent = small; p.append(b, s); stage.append(p); S.nodes.push(p); return { b: v => { if (b.textContent !== v) b.textContent = v; }, a: v => { p.style.opacity = v; } }; },
      // a layer for the moving robots, which dotbot.js paints, standing on the picture's rule
      row() { const r = document.createElement('div'); r.className = 'np-row'; stage.append(r); S.nodes.push(r); return r; },
      bot(row, name, width, ar, anim, alpha, delay) { const el = document.createElement('span'); el.className = 'ff-bot np-rb'; el.style.width = width + 'px'; el.style.setProperty('--ar', ar); if (alpha < 1) el.style.opacity = alpha; const cvs = document.createElement('canvas'); cvs.dataset.bot = name; cvs.dataset.tone = 'light'; cvs.dataset.anim = anim; el.append(cvs); row.append(el); const d = window.FerraDots, o = { el, cv: cvs }; if (d) { d.fetch(cvs); const go = () => { if (!run || !run.bots.includes(o)) return; cvs.classList.add('dotbot'); cvs._seen = 1; cvs._vis = true; d.draw(cvs); }; o.timer = setTimeout(go, delay || 0); } S.bots.push(o); return el; } };
    run = { name, stage, raf: 0, nodes: S.nodes, bots: S.bots };
    def.setup(S);
    const paint = t => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); c.fillStyle = W(.2); c.fillRect(0, h - 1, w, 1); def.paint(c, t, S); };
    if (reduce) { paint(60); return; }
    const t0 = performance.now(), mine = run, frame = n => { if (run !== mine) return; paint((n - t0) / 1000); mine.raf = requestAnimationFrame(frame); }; paint(0); mine.raf = requestAnimationFrame(frame); };

  window.FerraNP = {
    pick(a, N) { const name = a.dataset.sc, stage = a.closest('.np-in').querySelector('.np-card');
      if (run && run.stage === stage && run.name === name) return; clearTimeout(swap);
      if (run && run.stage === stage && !reduce) { stage.classList.add('off'); swap = setTimeout(() => { begin(stage, name, N); stage.classList.remove('off'); }, 140); } else { stage.classList.remove('off'); begin(stage, name, N); } },
    stop() { clearTimeout(swap); end(); document.querySelectorAll('.np-card.off').forEach(s => s.classList.remove('off')); },
  };
})();
