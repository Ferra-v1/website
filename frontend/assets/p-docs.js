// Methodology and privacy: the contents list follows the section being read, and the listings band plays as the reader scrolls past it.
(() => {
  const links = [...document.querySelectorAll('.d-toc a')], secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const all = [...document.querySelectorAll('.d-toc a, .d-tocx a')], now = document.querySelector('.d-tocnow'), tocx = document.querySelector('.d-tocx');
  const flow = document.querySelector('.d-flow');
  // the band stays its finished still when the reader asks for less motion
  const pin = flow && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (pin) { flow.classList.add('d-pin'); flow.dataset.s = '0'; }
  if (!secs.length && !pin) return;
  // the phone's sticky contents control also names the section being read
  const set = id => { all.forEach(a => a.classList.toggle('on', a.hash === '#' + id)); if (now) { const l = links.find(a => a.hash === '#' + id); now.textContent = l ? l.textContent : ''; } };
  const pick = () => {
    if (secs.length) { const y = 140; let cur = secs[0]; for (const s of secs) if (s.getBoundingClientRect().top - y <= 0) cur = s; set(cur.id); }
    if (pin) { const r = flow.getBoundingClientRect(), p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight))); flow.dataset.s = String(Math.min(3, Math.floor(p * 4))); }
  };
  let raf; addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pick); }, { passive: true });
  addEventListener('resize', pick); pick();
  // following a contents link on a phone closes the list again
  document.querySelectorAll('.d-tocx a').forEach(a => a.addEventListener('click', () => a.closest('details').removeAttribute('open')));
  // and so does a tap anywhere else, since the list sits over the text
  if (tocx) document.addEventListener('click', ev => { if (tocx.open && !tocx.contains(ev.target)) tocx.removeAttribute('open'); });
})();
