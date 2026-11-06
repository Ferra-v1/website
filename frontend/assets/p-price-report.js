// Price report page. The dot board: hover or tap a dot to read the listing or sale it stands for, with its link.
(() => {
  const fig = document.querySelector('[data-board]'), holder = document.getElementById('pr-rows');
  if (!fig || !holder) return;
  const ROWS = JSON.parse(holder.textContent), plot = fig.querySelector('.pr-plot'), tip = fig.querySelector('.pr-tip');
  const [tb, ts, ta] = [tip.querySelector('b'), tip.querySelector('span'), tip.querySelector('a')];
  let cur = null, wait = 0;
  const show = c => {
    if (c === cur) return;
    if (cur) cur.classList.remove('on');
    cur = c; c.classList.add('on');
    const [sold, title, when, price, where, url] = ROWS[+c.dataset.k];
    tb.textContent = title;
    ts.textContent = sold ? `Sold at auction for ${price} a robot on ${when} at ${where}.` : `Built ${when}. Asking ${price} on ${where}.`;
    ta.textContent = (sold ? 'See the result' : 'See the listing') + ' →'; ta.href = url;
    tip.hidden = false;
    const box = plot.getBoundingClientRect(), d = c.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, x = d.left - box.left + d.width / 2, y = d.top - box.top;
    tip.style.left = Math.max(0, Math.min(box.width - w, x - w / 2)) + 'px';
    tip.style.top = (y - h - 12 >= -40 ? y - h - 12 : y + d.height + 12) + 'px';
  };
  const nearest = (svg, ev, reach) => { let best = null, bd = reach * reach;
    for (const c of svg.querySelectorAll('circle[data-k]')) { const r = c.getBoundingClientRect(), dx = r.left + r.width / 2 - ev.clientX, dy = r.top + r.height / 2 - ev.clientY, v = dx * dx + dy * dy; if (v < bd) { bd = v; best = c; } }
    return best; };
  fig.querySelectorAll('svg').forEach(svg => {
    // the reading changes only once the pointer rests, so the pointer can travel to the link without passing over other dots changing it
    svg.addEventListener('pointermove', ev => { if (ev.pointerType === 'touch') return; clearTimeout(wait); wait = setTimeout(() => { const c = nearest(svg, ev, 26); if (c) show(c); }, 70); });
    svg.addEventListener('pointerdown', ev => { const c = nearest(svg, ev, 30); if (c) show(c); });
  });
  document.addEventListener('pointerdown', ev => { if (!fig.contains(ev.target)) { tip.hidden = true; if (cur) { cur.classList.remove('on'); cur = null; } } });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { tip.hidden = true; if (cur) { cur.classList.remove('on'); cur = null; } } });
})();
