// Home, the S2 sand board. Runs after site.js (which fades the .rv groups in once). Two jobs, both on the reader's input only, nothing on scroll:
// the price box (robot and year pickers give the worth today, the asking price and the auction price, and move the ring on the listings chart),
// and the four-prices tabs. The numbers in the page at load are the build's own; this only repeats the build's arithmetic for another pick.
(() => {
  const $ = id => document.getElementById(id);
  const src = $('h-px'); if (!src) return;
  const B = JSON.parse(src.textContent), rSel = $('h-r'), ySel = $('h-y');
  const [W, H, L, R, T, Bo, AMAX, PMAX] = B.geo, pw = W - L - R, ph = H - T - Bo;
  const cx = a => L + a / AMAX * pw, cy = u => T + ph - Math.min(u, PMAX) / PMAX * ph;
  const r100 = v => Math.abs(v) >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10;
  const usd = v => '$' + r100(v).toLocaleString('en-US');
  // the Prices page's estimate() for a robot opened by link: price paid is the robot's typical new price, its use is its first use
  const est = (id, y) => {
    const [level, fe, b, use, p] = B.x[id], age = Math.max(0, Math.min(30, B.now - y));
    const ask = Math.exp(level + fe - b * age), floor = ask * (age < 10 ? B.ar[0] : B.ar[1]);
    const [tau, beta] = B.ty[use], keep = Math.exp(-Math.pow(age * 12 / tau, beta));
    const arm = ask * Math.sqrt(age <= 9 ? B.ar[0] : B.ar[1]);
    return { age, ask, floor, worth: Math.max(p * keep, Math.min(p, arm)) };
  };
  const NS = 'http://www.w3.org/2000/svg', svg = document.querySelector('.h-ch'), dots = svg.querySelector('.h-dots'), you = svg.querySelector('.h-you');
  let maker = null;
  const draw = mk => {
    if (mk === maker) return; maker = mk;
    const f = document.createDocumentFragment();
    (B.pts[mk] || []).forEach(([a, u]) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', cx(a).toFixed(1)); c.setAttribute('cy', cy(u).toFixed(1)); c.setAttribute('r', 3); f.appendChild(c); });
    dots.replaceChildren(f);
    $('h-ct').textContent = mk === 'all' ? 'Robot arms for sale, by age' : mk + ' arms for sale, by age';
    svg.setAttribute('aria-label', (mk === 'all' ? 'Robot' : mk) + ' arms for sale: asking price against age, with your robot ringed');
  };
  maker = B.x[rSel.value][5];
  const update = () => {
    const id = rSel.value, y = +ySel.value, e = est(id, y);
    $('h-w').textContent = usd(e.worth); $('h-a').textContent = usd(e.ask); $('h-u').textContent = usd(e.floor);
    const href = `/price#r=${id}&y=${y}`;
    $('h-go').href = href; document.querySelectorAll('.h-ctas .h-btn').forEach(a => { a.href = href; });
    draw(B.x[id][5]);
    you.setAttribute('transform', `translate(${cx(Math.min(e.age, AMAX)).toFixed(1)} ${cy(e.worth).toFixed(1)})`);
  };
  rSel.addEventListener('change', update); ySel.addEventListener('change', update);
  // a reload or the back button can restore the pickers' last values: show the numbers for what they actually say
  if (rSel.value !== 'kuka-kr-210' || ySel.value !== '2020') update();

  // the four-prices tabs: click, or the arrow keys between them
  const tabs = [...document.querySelectorAll('.h-tabs [role=tab]')];
  const pick = t => tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $(b.getAttribute('aria-controls')).hidden = !on; });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', ev => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[ev.key]; if (!d) return;
      ev.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); pick(n);
    });
  });
})();
