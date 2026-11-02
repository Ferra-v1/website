// Price report page. The family board's range bars draw in once (CSS, on .in-view). The one chip set picks the robot type
// for the example values section: summary row, chart and year table. A link to #chart-<type> opens that type and scrolls to it.
(() => {
  const chips = [...document.querySelectorAll('.pr-chips .chip')]; if (!chips.length) return;
  // the curve comes from the page (core.CURVE, the risk engine's), never typed here
  const card = document.querySelector('.pr-card'), curve = card ? JSON.parse(card.dataset.curve) : [], fmt = v => '$' + Math.round(v).toLocaleString('en-US'), r = v => fmt(Math.floor(v / 100 + .5) * 100);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const show = c => {
    const t = c.dataset.type, P = +c.dataset.price;
    chips.forEach(x => { const on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    set('pr-s0', fmt(P)); set('pr-s2', r(P * curve[2])); set('pr-s6', r(P * curve[6])); set('pr-s7', Math.round(curve[6] * 100) + '%');
    const tb = document.getElementById('pr-table');
    if (tb) tb.innerHTML = '<thead><tr><th>Year</th><th>Example value</th><th>Kept</th></tr></thead><tbody>' + curve.map((k, y) => `<tr${y === 2 ? ' class="y2"' : ''}><td>Year ${y}</td><td>${r(P * k)}</td><td>${Math.round(k * 100)}%</td></tr>`).join('') + '</tbody>';
    // swap the chart, then let its dots rise again
    document.querySelectorAll('.pchart').forEach(d => { d.hidden = d.dataset.type !== t; d.querySelectorAll('.chart').forEach(s => s.classList.remove('drawn')); });
    const on = document.querySelector(`.pchart[data-type="${t}"]`);
    if (on) requestAnimationFrame(() => requestAnimationFrame(() => on.querySelectorAll('.chart').forEach(s => s.classList.add('drawn'))));
  };
  const chart = document.getElementById('chart');
  const fromHash = () => { const m = location.hash.match(/^#(?:chart-)?([a-z]+)$/); return m && chips.find(c => c.dataset.type === m[1]); };
  chips.forEach(c => c.addEventListener('click', () => { show(c); history.replaceState(null, '', '#chart-' + c.dataset.type); }));
  const first = fromHash();
  show(first || chips[0]);
  // arriving from a home board row (#chart-<type>): open straight on that type's section
  if (first) setTimeout(() => chart && chart.scrollIntoView({ behavior: 'auto' }), 60);
  addEventListener('hashchange', () => { const c = fromHash(); if (c) { show(c); chart && chart.scrollIntoView({ behavior: 'auto' }); } });
})();
