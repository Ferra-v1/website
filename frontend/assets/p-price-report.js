// Price report page. The chip set picks the robot type for the example curve: the matching chart shows and its line draws again.
// A link to #chart-<type> opens that type and scrolls to it.
(() => {
  const chips = [...document.querySelectorAll('.pr-chips .chip')]; if (!chips.length) return;
  const show = c => {
    const t = c.dataset.type;
    chips.forEach(x => { const on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    document.querySelectorAll('.pchart').forEach(d => { d.hidden = d.dataset.type !== t; d.querySelectorAll('.pr-c').forEach(s => s.classList.remove('drawn')); });
    const on = document.querySelector(`.pchart[data-type="${t}"]`);
    if (on) requestAnimationFrame(() => requestAnimationFrame(() => on.querySelectorAll('.pr-c').forEach(s => s.classList.add('drawn'))));
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
