// Price report page: chips (hero and chart) stay in step, the hero robot follows the chosen type,
// and the summary row, hero tag and year table show that type. site.js already swaps the charts.
(() => {
  const chips = [...document.querySelectorAll('.chip')]; if (!chips.length) return;
  const curve = [1, .81, .69, .6, .53, .47, .43], fmt = v => '$' + Math.round(v).toLocaleString('en-US'), r = v => fmt(Math.round(v / 100) * 100);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const cv = document.querySelector('.pr-bot canvas.dotbot'), box = cv && cv.parentElement;
  const show = c => {
    const t = c.dataset.type, P = +c.dataset.price;
    chips.forEach(x => { const on = x.dataset.type === t; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    set('pr-tn', c.dataset.name); set('pr-t0', fmt(P)); set('pr-t2', r(P * curve[2])); set('pr-t6', r(P * curve[6]));
    set('pr-s0', fmt(P)); set('pr-s2', r(P * curve[2])); set('pr-s6', r(P * curve[6]));
    const tb = document.getElementById('pr-table');
    if (tb) tb.innerHTML = '<thead><tr><th>Year</th><th>Example resale value</th><th>Kept</th></tr></thead><tbody>' + curve.map((k, y) => `<tr${y === 2 ? ' class="y2"' : ''}><td>Year ${y}</td><td>${r(P * k)}</td><td>${Math.round(k * 100)}%</td></tr>`).join('') + '</tbody>';
    document.querySelectorAll('.pr-dm').forEach(m => m.classList.remove('drawn')); const pm = document.querySelector(`.pchart[data-type="${t}"] .pr-dm`); if (pm) requestAnimationFrame(() => requestAnimationFrame(() => pm.classList.add('drawn')));
    if (cv && cv.dataset.bot !== t) { box.style.setProperty('--ar', c.dataset.ar); box.style.setProperty('--bx', c.dataset.bx); box.style.setProperty('--hh', c.dataset.hh); cv.dataset.bot = t; cv.dataset.anim = 'assemble'; requestAnimationFrame(() => window.FerraDots && window.FerraDots.draw(cv)); }
  };
  chips.forEach(c => c.addEventListener('click', () => show(c)));
  show(chips.find(c => c.classList.contains('on')) || chips[0]);
  // compare cards open their type in the chart
  document.querySelectorAll('.pr-cmp').forEach(a => a.addEventListener('click', ev => {
    const c = chips.find(x => x.dataset.type === a.dataset.type); if (!c) return; ev.preventDefault(); c.click();
    document.getElementById('chart').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
})();
