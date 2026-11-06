// Lenders page: the three documents as tabs, the loss dots you can touch, and the film.
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

  // what if a loan goes bad: touch a number and the dots show only that many
  const nums = [...document.querySelectorAll('.l-nb')], field = document.querySelector('.l-field');
  nums.forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') === 'true';
    nums.forEach(n => n.setAttribute('aria-pressed', n === b && !on ? 'true' : 'false'));
    b.parentElement.classList.toggle('l-pick', !on);
    field.classList.toggle('l-only3', !on && b.dataset.lit === '3');
  }));

  // the film: a reader who asked for less motion gets the still
  const film = document.querySelector('.l-film');
  if (film && matchMedia('(prefers-reduced-motion: reduce)').matches) { film.removeAttribute('autoplay'); film.pause(); }
})();
