// Lenders page: the three documents as tabs, and the auction sales you can touch.
(() => {
  // documents: without this script all three pages read in sequence
  const list = document.querySelector('.l-tabs');
  if (list) {
    const tabs = [...list.querySelectorAll('[role="tab"]')], wrap = document.querySelector('.l-pages');
    const pages = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    pages.forEach((p, i) => { p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', tabs[i].id); p.tabIndex = 0; });
    const show = (i, focus) => { tabs.forEach((t, j) => { const on = j === i; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; pages[j].classList.toggle('l-off', !on); }); if (focus) tabs[i].focus(); };
    list.hidden = false; wrap.classList.add('l-tabbed'); show(0);
    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    list.addEventListener('keydown', ev => { const i = tabs.indexOf(document.activeElement), n = tabs.length; if (i < 0) return;
      const to = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
      if (to === undefined) return; ev.preventDefault(); show(to, true); });
  }

  // the sales: hover, focus or tap a dot and the line under the plot reads that sale
  const fig = document.querySelector('[data-sales]');
  if (!fig) return;
  const dots = [...fig.querySelectorAll('.l-s')], $ = s => fig.querySelector(s);
  const read = b => { dots.forEach(d => d.classList.toggle('on', d === b)); const t = b.dataset;
    $('[data-rl]').textContent = t.l; $('[data-rp]').textContent = t.p; $('[data-rd]').textContent = t.d; $('[data-rv]').textContent = t.v; $('[data-rr]').textContent = t.r; $('[data-ru]').href = t.u; };
  dots.forEach(b => ['pointerenter', 'focus', 'click'].forEach(ev => b.addEventListener(ev, () => read(b))));
  const first = dots.find(b => b.getAttribute('aria-label').startsWith($('[data-rl]').textContent)); if (first) first.classList.add('on');
})();
