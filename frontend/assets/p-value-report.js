// "What robots are worth" (pages/value_report.py). Every chart is drawn at build time; this script adds what a reader does with one:
// a tooltip for each record (hover with a mouse, tap with a finger, the link inside the tip), a table view of the same records, and "Save as image",
// which draws the figure again on white with the Ferra mark, its title and its source line, and saves it as a picture. Tooltip placement comes from FerraPlot (p-robots.js).
(() => {
  const P = window.FerraPlot || {};
  const usd = v => '$' + Math.round(v).toLocaleString('en-US');
  const pct = v => Math.round(v * 100) + '%';
  const hund = v => '$' + (Math.round(v / 100) * 100).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const place = (tip, par, x, y, box) => { if (P.placeTip) P.placeTip(tip, par, x, y, box); else { tip.hidden = false; tip.style.left = Math.max(8, Math.min(x - tip.offsetWidth / 2, par.clientWidth - tip.offsetWidth - 8)) + 'px'; tip.style.top = (y + 14) + 'px'; } };
  const words = (tip, a, kind, w, url) => { if (P.tipLink) P.tipLink(tip, a, kind, w, url); else { a.textContent = w + ' →'; a.href = url; } };

  // ------------------------------------------------------------------ what each record says
  const say = {
    scatter: r => [r[2], `Built ${r[3]}. Asking ${usd(r[1])} on ${r[4]}.`, 'See the listing', r[5]],
    lots: r => [r[0], `Built ${r[7]}, sold on ${r[3]} at ${r[4]} for ${usd(r[1])}. Sellers ask about ${hund(r[2])} for this model at this age.`, 'See the result', r[5]],
    months: r => [r[0] + ', ' + r[1], `${usd(r[3])} a month, ${r[6]}, ${r[8]}. Price ${usd(r[4])}, ${r[7]}, ${r[9]}.`, 'See the source', r[10]],
  };
  const table = {
    scatter: D => ({ head: ['Robot', 'Built', 'Asking price', 'Marketplace'], r: [false, true, true, false], rows: D.rows.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(r => [`<a href="${esc(r[5])}" target="_blank" rel="noopener">${esc(r[2])}</a>`, r[3], usd(r[1]), esc(r[4])]) }),
    lots: D => ({ head: ['Lot', 'Age at sale', 'Sold for', 'Asking estimate', 'Share', 'Date', 'Auction house'], r: [false, true, true, true, true, false, false], rows: D.rows.map(r => [`<a href="${esc(r[5])}" target="_blank" rel="noopener">${esc(r[0])}</a>`, Math.round(r[6]), usd(r[1]), hund(r[2]), pct(r[1] / r[2]), esc(r[3]), esc(r[4])]) }),
    months: D => ({ head: ['Robot', 'Rent a month', 'Price', 'Months', 'Rent is', 'Price is'], r: [false, true, true, true, false, false], rows: D.rows.map(r => [`<a href="${esc(r[10])}" target="_blank" rel="noopener">${esc(r[0])}, ${esc(r[1])}</a>`, usd(r[3]), usd(r[4]), r[5], esc(r[6]), esc(r[7])]) }),
  };

  document.querySelectorAll('.vr-fig[data-fig]').forEach(fig => {
    const D = JSON.parse(fig.querySelector('.vr-json').textContent);
    if (D.kind === 'units') { const sv = fig.querySelector('.vr-save'); if (sv) sv.addEventListener('click', () => { sv.disabled = true; picture(D).catch(() => {}).finally(() => { sv.disabled = false; }); }); return; }   // a count figure: nothing to hover, its words already say every number
    const plot = fig.querySelector('.vr-plot'), tip = plot.querySelector('.vr-tip'), tv = fig.querySelector('.vr-tv');
    const [tb, ts, ta] = ['b', 'span', 'a'].map(s => tip.querySelector(s));
    let on = null, url = null;
    const fill = (i, kind) => { const [b, s, w, u] = say[D.kind](D.rows[i]); tb.textContent = b; ts.textContent = s; url = u; words(tip, ta, kind, w, u); if (kind === 'mouse' && D.kind !== 'scatter') ta.textContent = 'Click the row to ' + w.toLowerCase(); };
    const hide = () => { tip.hidden = true; if (on && on.classList) on.classList.remove('on'); on = null; hl(null); };
    let hl = () => {};

    if (D.kind === 'scatter') {
      // the dots are one path, so the nearest record is found from its age and price, in the svg's own units
      const geo = svg => { const d = svg.dataset, vb = svg.viewBox.baseVal, rc = svg.getBoundingClientRect(), k = rc.width / vb.width;
        return { svg, k, rc, X: a => +d.l + a / +d.x * (+d.r - +d.l), Y: v => +d.t + (+d.y1 - Math.log(v)) / (+d.y1 - +d.y0) * (+d.b - +d.t) }; };
      const near = (g, ev, reach) => { const x = (ev.clientX - g.rc.left) / g.k, y = (ev.clientY - g.rc.top) / g.k; let best = -1, bd = reach / g.k;
        D.rows.forEach((r, i) => { const dd = Math.hypot(g.X(r[0]) - x, g.Y(r[1]) - y); if (dd < bd) { bd = dd; best = i; } }); return best; };
      const showAt = (g, i, kind) => { fill(i, kind); const r = D.rows[i], pr = plot.getBoundingClientRect(), cx = g.X(r[0]), cy = g.Y(r[1]);
        const c = g.svg.querySelector('.vr-hl'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', c.dataset.r); on = i;
        const d = g.svg.dataset, ox = g.rc.left - pr.left, oy = g.rc.top - pr.top;   // the tip stays inside the plot, clear of the price labels
        place(tip, plot, ox + cx * g.k, oy + cy * g.k, { l: ox + +d.l * g.k, r: ox + +d.r * g.k, t: oy + +d.t * g.k, b: oy + +d.b * g.k }); };
      hl = () => plot.querySelectorAll('.vr-hl').forEach(c => c.setAttribute('r', 0));
      plot.querySelectorAll('svg.vr-sc').forEach(svg => {
        let wait, down;
        svg.addEventListener('pointermove', ev => { if (ev.pointerType === 'touch') return; clearTimeout(wait); wait = setTimeout(() => { const g = geo(svg), i = near(g, ev, 14); svg.style.cursor = i >= 0 ? 'pointer' : ''; if (i >= 0) { if (i !== on) showAt(g, i, 'mouse'); } else if (on !== null) hide(); }, 40); });
        svg.addEventListener('pointerleave', () => { clearTimeout(wait); setTimeout(() => { if (!tip.matches(':hover')) hide(); }, 60); });
        svg.addEventListener('pointerdown', ev => { down = [ev.clientX, ev.clientY, ev.pointerType]; });
        svg.addEventListener('click', ev => { const g = geo(svg); if (down && down[2] === 'touch') { if (Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 8) return; const i = near(g, ev, 22); if (i >= 0) showAt(g, i, 'touch'); else hide(); return; }
          const i = near(g, ev, 14); if (i >= 0) window.open(D.rows[i][5], '_blank', 'noopener'); });
      });
    } else {
      // one row per record: the row is the target
      const rows = plot.querySelectorAll('li[data-i]');
      const showRow = (li, kind) => { const i = +li.dataset.i, pr = plot.getBoundingClientRect(), at = li.querySelector(D.kind === 'lots' ? '.vr-dt' : '.vr-ms') || li, r = at.getBoundingClientRect();
        if (on && on.classList) on.classList.remove('on'); fill(i, kind); li.classList.add('on'); on = li;
        place(tip, plot, r.left - pr.left + r.width / 2, r.top - pr.top + r.height / 2); };
      let down = null;
      rows.forEach(li => {
        li.addEventListener('pointerenter', ev => { if (ev.pointerType !== 'touch') showRow(li, 'mouse'); });
        li.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'touch') setTimeout(() => { if (on === li && !tip.matches(':hover')) hide(); }, 60); });
        li.addEventListener('pointerdown', ev => { down = ev.pointerType; });
        li.addEventListener('click', () => { if (down === 'touch') { if (on === li) hide(); else showRow(li, 'touch'); } else if (url) window.open(url, '_blank', 'noopener'); });
      });
    }
    tip.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'touch') hide(); });
    document.addEventListener('pointerdown', ev => { if (on !== null && !tip.contains(ev.target) && !plot.contains(ev.target)) hide(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && on !== null) hide(); });

    // the toolbar: chart or table, and save as image
    const seg = fig.querySelectorAll('.tb-seg button');
    seg.forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.v === 'table'; seg.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (t && !tv.firstChild) { const T = table[D.kind](D); tv.innerHTML = `<table class="vr-tbl"><caption class="sr">${esc(D.title)}</caption><thead><tr>${T.head.map((h, k) => `<th scope="col"${T.r[k] ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${T.rows.map(r => `<tr>${r.map((c, k) => k ? `<td${T.r[k] ? ' class="r num"' : ''}>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table>`; tv.tabIndex = 0; tv.setAttribute('role', 'region'); tv.setAttribute('aria-label', D.title + ', as a table'); }
      hide(); plot.hidden = t; fig.querySelectorAll('.vr-keys').forEach(k => { k.hidden = t; }); tv.hidden = !t;
    }));
    const sv = fig.querySelector('.vr-save');
    if (sv) sv.addEventListener('click', () => { sv.disabled = true; picture(D).catch(() => {}).finally(() => { sv.disabled = false; }); });
  });

  // ------------------------------------------------------------------ save as image: the figure on white, with the mark, its title and its source line
  const INK = '#0e1626', CO = '#2847ce', SOFT = '#3e4656', CAP = '#5b6474', LINE = '#e2e6ee';
  const wrap = (c, text, w) => { const out = []; let l = ''; for (const wd of String(text).split(' ')) { const t = l ? l + ' ' + wd : wd; if (l && c.measureText(t).width > w) { out.push(l); l = wd; } else l = t; } if (l) out.push(l); return out; };
  const mark = (c, x, y, s) => { const r = (a, b, w, h) => { c.beginPath(); if (c.roundRect) c.roundRect(x + a * s / 100, y + b * s / 100, w * s / 100, h * s / 100, 5 * s / 100); else c.rect(x + a * s / 100, y + b * s / 100, w * s / 100, h * s / 100); c.fill(); }; c.fillStyle = CO; r(8, 10, 84, 22); r(8, 39, 58, 22); r(8, 68, 32, 22); };
  const draw = {
    // returns the chart's height for a width, and draws when asked
    scatter(c, D, x0, y0, w, go) {
      const h = Math.round(w * .56); if (!go) return h + 34;
      const L = x0 + 64, R = x0 + w - 8, T = y0 + 6, B = y0 + h, xmax = Math.ceil(Math.max(...D.rows.map(r => r[0])) / 5) * 5, lo = Math.log(1000), hi = Math.log(Math.max(150000, Math.max(...D.rows.map(r => r[1])) * 1.1));
      const X = a => L + a / xmax * (R - L), Y = v => T + (hi - Math.log(v)) / (hi - lo) * (B - T);
      c.font = '400 14px Geist'; c.textBaseline = 'middle';
      for (const t of [1000, 3000, 10000, 30000, 100000]) { c.strokeStyle = LINE; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Y(t)); c.lineTo(R, Y(t)); c.stroke(); c.fillStyle = CAP; c.textAlign = 'right'; c.fillText(usd(t), L - 8, Y(t)); }
      const cv = D.curve.filter(p => p[0] <= xmax); c.fillStyle = 'rgba(40,71,206,.1)'; c.beginPath(); cv.forEach((p, k) => c[k ? 'lineTo' : 'moveTo'](X(p[0]), Y(p[3]))); cv.slice().reverse().forEach(p => c.lineTo(X(p[0]), Y(p[1]))); c.closePath(); c.fill();
      c.fillStyle = 'rgba(40,71,206,.55)'; c.beginPath(); for (const r of D.rows) { c.moveTo(X(r[0]) + 2.6, Y(r[1])); c.arc(X(r[0]), Y(r[1]), 2.6, 0, 7); } c.fill();
      c.strokeStyle = INK; c.lineWidth = 2.5; c.lineJoin = 'round'; c.beginPath(); cv.forEach((p, k) => c[k ? 'lineTo' : 'moveTo'](X(p[0]), Y(p[2]))); c.stroke();
      c.strokeStyle = '#9aa3b5'; c.lineWidth = 1; c.beginPath(); c.moveTo(L, B); c.lineTo(R, B); c.stroke();
      c.fillStyle = CAP; c.textBaseline = 'top'; for (let a = 0; a <= xmax; a += 5) { c.textAlign = a ? (a === xmax ? 'right' : 'center') : 'left'; c.fillText(a ? (a === xmax ? a + ' years' : String(a)) : 'New', X(a), B + 10); }
      c.textAlign = 'left'; c.fillStyle = SOFT; c.fillText('Line: typical asking price. Band: 8 in 10 asking prices. Dot: one listing.', x0, B + 34 - 4);
    },
    lots(c, D, x0, y0, w, go) {
      const rh = 22, bands = [[0, 10, 'Under 10 years old at sale'], [10, 20, '10 to 19 years old'], [20, 99, '20 years old and over']];
      const groups = bands.map(([a, b, t]) => [t, D.rows.filter(r => r[6] >= a && r[6] < b)]).filter(g => g[1].length);
      const h = 26 + groups.length * 34 + D.rows.length * rh + 30; if (!go) return h;
      const lw = 340, vw = 120, L = x0 + lw, R = x0 + w - vw - 16, X = v => L + v / D.xmax * (R - L); let y = y0;
      c.font = '400 14px Geist'; c.textBaseline = 'middle'; c.fillStyle = CAP; c.textAlign = 'left'; c.fillText('0%', L, y + 8); c.textAlign = 'right'; c.fillText('Asking', X(1), y + 8); y += 26;
      const top = y;
      for (const [t, rs] of groups) {
        c.font = '600 15px Inter'; c.fillStyle = INK; c.textAlign = 'left'; c.fillText(t, x0, y + 16); c.strokeStyle = LINE; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y + 30); c.lineTo(x0 + w, y + 30); c.stroke(); y += 34;
        for (const r of rs) { const m = y + rh / 2, s = r[1] / r[2];
          c.font = '400 13px Geist'; c.fillStyle = INK; c.textAlign = 'left'; let n = r[0]; while (c.measureText(n).width > lw - 14 && n.length > 8) n = n.slice(0, -2); c.fillText(n === r[0] ? n : n.trim() + '...', x0, m);
          c.strokeStyle = LINE; c.beginPath(); c.moveTo(L, m); c.lineTo(R, m); c.stroke();
          c.fillStyle = 'rgba(40,71,206,.32)'; c.fillRect(X(s), m - 1, X(1) - X(s), 2);
          c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(X(1), m, 5.5, 0, 7); c.fill(); c.stroke(); c.lineWidth = 1;
          c.fillStyle = CO; c.beginPath(); c.arc(X(s), m, 5.5, 0, 7); c.fill();
          c.textAlign = 'right'; c.font = '600 13px Geist'; c.fillStyle = INK; const v = usd(r[1]); c.fillText(pct(s), x0 + w - c.measureText(' ' + v).width - 2, m); c.font = '400 13px Geist'; c.fillStyle = SOFT; c.fillText(v, x0 + w, m);
          y += rh; } }
      c.strokeStyle = 'rgba(14,22,38,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(D.share), top); c.lineTo(X(D.share), y); c.stroke(); c.lineWidth = 1;
      c.font = '400 14px Geist'; c.fillStyle = SOFT; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(`Ring: what sellers ask for that model at that age. Dot: what it sold for. Line: the middle sale, ${pct(D.share)}.`, x0, y + 18);
    },
    units(c, D, x0, y0, w, go) {
      const pitch = 34, r = 12, rows = Math.ceil(D.total / D.cols), h = rows * pitch + 16 + D.keys.length * 24; if (!go) return h;
      for (let i = 0; i < D.total; i++) { const cx = x0 + (i % D.cols) * pitch + pitch / 2, cy = y0 + Math.floor(i / D.cols) * pitch + pitch / 2; c.beginPath(); c.arc(cx, cy, r, 0, 7);
        if (i < D.on) { c.fillStyle = CO; c.fill(); } else { c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#9aa3b5'; c.lineWidth = 1.5; c.stroke(); } }
      let y = y0 + rows * pitch + 16; c.font = '400 14px Geist'; c.textBaseline = 'middle'; c.textAlign = 'left';
      for (const [k, t] of D.keys) { c.beginPath(); c.arc(x0 + 8, y + 10, 6, 0, 7); if (k === 'vr-uon') { c.fillStyle = CO; c.fill(); } else { c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#9aa3b5'; c.lineWidth = 1.5; c.stroke(); } c.fillStyle = SOFT; c.fillText(t, x0 + 24, y + 10); y += 24; }
    },
    months(c, D, x0, y0, w, go) {
      // one line per robot, the track scaled to the longest row (D.end months), ticks every year and a darker one at 3 years
      const lw = 290, vw = 96, end = D.end, pitch = (w - lw - vw - 24) / end, r0 = Math.min(3.2, pitch * .36);
      const byType = D.order.map(t => [t, D.rows.filter(r => r[2] === t).sort((a, b) => a[5] - b[5])]);
      const H = 46, h = 26 + byType.length * 34 + D.rows.length * H + 6; if (!go) return h;
      const S = x0 + lw + 12; let y = y0; c.textBaseline = 'middle';
      c.font = '400 14px Geist'; c.fillStyle = CAP; [[12, '1 year'], [36, '3 years'], [end, end / 12 + ' years']].forEach(([m, t]) => { c.textAlign = m === end ? 'right' : 'center'; c.fillText(t, S + m * pitch, y + 8); }); y += 26;
      for (const [t, rs] of byType) {
        c.font = '600 15px Inter'; c.fillStyle = INK; c.textAlign = 'left'; c.fillText(t, x0, y + 16); c.strokeStyle = LINE; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y + 30); c.lineTo(x0 + w, y + 30); c.stroke(); y += 34;
        for (const r of rs) { const m = y + H / 2;
          c.font = '400 13px Geist'; c.fillStyle = INK; c.textAlign = 'left'; c.fillText(r[0], x0, m - 8); c.fillStyle = CAP; c.fillText(r[1], x0, m + 9);
          for (let k = 12; k <= end; k += 12) { c.strokeStyle = k === 36 ? '#9aa3b5' : LINE; c.beginPath(); c.moveTo(S + k * pitch, m - 8); c.lineTo(S + k * pitch, m + 8); c.stroke(); }
          c.fillStyle = CO; c.beginPath(); for (let k = 0; k < r[5]; k++) { const cx = S + k * pitch + pitch / 2; c.moveTo(cx + r0, m); c.arc(cx, m, r0, 0, 7); } c.fill();
          c.textAlign = 'right'; c.font = '600 13px Geist'; c.fillStyle = INK; c.fillText(r[5] + ' months', x0 + w, m);
          y += H; } }
    },
  };
  async function picture(D) {
    if (document.fonts && document.fonts.load) await Promise.all(['700 26px Inter', '600 15px Inter', '600 22px Geist', '400 14px Geist', '600 13px Geist'].map(f => document.fonts.load(f).catch(() => {})));
    const W = 1000, pad = 48, w = W - 2 * pad, m = document.createElement('canvas').getContext('2d');
    m.font = '700 26px Inter'; const title = wrap(m, D.title, w); m.font = '400 15px Geist'; const src = wrap(m, D.src + ' www.ferra.company/price-report', w);
    const top = pad + 34 + 24, ch = draw[D.kind](m, D, pad, 0, w, false), H = top + title.length * 32 + 20 + ch + 24 + src.length * 22 + pad;
    const cv = document.createElement('canvas'), k = 2; cv.width = W * k; cv.height = H * k; const c = cv.getContext('2d'); c.scale(k, k);
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    // the lockup: mark a little taller than the capitals, its middle on theirs
    c.font = '600 22px Geist'; c.textBaseline = 'alphabetic'; const s = 22 * .828, base = pad + 22; mark(c, pad, base - 22 * .36 - s / 2, s); c.fillStyle = CO; c.textAlign = 'left'; c.fillText('Ferra', pad + s + 22 * .513 - s * .08, base);
    c.font = '400 15px Geist'; c.fillStyle = CAP; c.textAlign = 'right'; c.fillText('What robots are worth. Winter 2027.', W - pad, base);
    let y = top; c.font = '700 26px Inter'; c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; title.forEach(l => { c.fillText(l, pad, y + 24); y += 32; }); y += 20;
    draw[D.kind](c, D, pad, y, w, true); y += ch + 24;
    c.font = '400 15px Geist'; c.fillStyle = CAP; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; src.forEach(l => { c.fillText(l, pad, y + 15); y += 22; });
    const blob = await new Promise(r => cv.toBlob(r, 'image/png')); if (!blob) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ferra-robot-value-report-figure-${D.fig}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
})();

// Board A's robots: the site's dot arm (the Robot Index packs it the same way, 3 bytes a dot), drawn on canvases the page sized before this ran.
//   data-keep  the share of dots it keeps at that age (scattered over the whole arm so its shape stays readable, a little more from the top and the outer edge, a fixed seed so every visit draws the same); data-age dims the kept dots a little with age
// Every shade is an opaque colour, never a see-through one: faint see-through dots laid over a fine grid read as a checkerboard on some screens. The arm fills its canvas edge to edge, so the row's two ends sit on the page grid.
// One path and one fill per shade. A canvas draws again only when its own width changes (a phone's address bar sliding away changes only the height).
(() => {
  const tag = document.getElementById('vr-bots'); if (!tag) return;
  const RAW = JSON.parse(tag.textContent), BOTS = {};
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function bot(n) {
    if (BOTS[n]) return BOTS[n]; const b = RAW[n]; if (!b) return null; const s = atob(b.p), pts = [];
    for (let i = 0; i < s.length; i += 3) pts.push({ x: s.charCodeAt(i), y: s.charCodeAt(i + 1), s: (s.charCodeAt(i + 2) & 127) / 100 });
    const N = pts.length; let cx = 0, cy = 0, far = 0; pts.forEach(p => { cx += p.x; cy += p.y; }); cx /= N; cy /= N;
    pts.forEach(p => { p.d = Math.hypot(p.x - cx, (p.y - cy) * .8); if (p.d > far) far = p.d; });
    const rnd = rng(7), ord = pts.map((p, i) => ({ i, k: .2 * p.d / far + .25 * (1 - p.y / b.h) + rnd() })).sort((a, c) => c.k - a.k);
    ord.forEach((o, k) => { pts[o.i].rank = k; });
    return (BOTS[n] = { w: b.w, h: b.h, N, pts });
  }
  // cobalt #1e339b laid on white at a strength, as one opaque colour
  const mix = a => { const f = v => Math.round(255 + (v - 255) * a); return `rgb(${f(30)},${f(51)},${f(155)})`; };
  const GHOST = '#cad2ec';
  function draw(cv) {
    const B = bot(cv.dataset.bot), cw = cv.clientWidth; if (!B || !cw) return;
    const d = Math.min(3, window.devicePixelRatio || 1), ch = cw * B.h / B.w;
    const pitch = cw / B.w, ox = 0, oy = ch - pitch * B.h;
    const W = Math.round(cw * d), H = Math.round(ch * d); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, cw, ch);
    const keep = cv.dataset.keep !== undefined ? +cv.dataset.keep : null, fill = cv.dataset.fill !== undefined ? +cv.dataset.fill : null;
    const cut = keep !== null ? B.N * (1 - keep) : 0, row = fill !== null ? B.h * (1 - fill) - 1e-6 : -1, dim = 1 - .35 * Math.min(1, (+cv.dataset.age || 0) / 30);
    const g = new Map(), add = (k, x, y, r) => { let p = g.get(k); if (!p) g.set(k, p = new Path2D()); p.moveTo(x + r, y); p.arc(x, y, r, 0, 6.2832); };
    for (const p of B.pts) {
      const x = ox + (p.x + .5) * pitch, y = oy + (p.y + .5) * pitch, sz = Math.max(p.s, .46);
      const on = fill !== null ? p.y >= row : p.rank >= cut;
      if (on) { const q = Math.round(sz * 10) / 10; add(mix(Math.min(1, (.45 + .55 * q) * dim)), x, y, Math.max(.7, pitch * .46 * Math.max(q, .6))); }
      else add(GHOST, x, y, Math.max(.5, pitch * .34 * sz));
    }
    g.forEach((p, k) => { c.fillStyle = k; c.fill(p); });
  }
  const cvs = [...document.querySelectorAll('canvas.vr-bot')], last = new WeakMap();
  const run = cv => { const w = cv.clientWidth; if (w === last.get(cv)) return; last.set(cv, w); draw(cv); };
  cvs.forEach(run);
  if (window.ResizeObserver) { const ro = new ResizeObserver(es => es.forEach(e => run(e.target))); cvs.forEach(cv => ro.observe(cv)); }
  else { let lw = innerWidth; addEventListener('resize', () => { if (innerWidth === lw) return; lw = innerWidth; cvs.forEach(run); }); }
})();
