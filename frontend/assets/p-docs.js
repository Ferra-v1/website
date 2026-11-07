// Methodology: the contents list follows the section being read.
(() => {
  const links = [...document.querySelectorAll('.d-toc a')], secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!secs.length) return;
  // the reference sections start closed on a phone and stay plain sections on a wide screen. A link to one, or to anything inside one, opens it first.
  const folds = [...document.querySelectorAll('.d-cold')], phone = matchMedia('(max-width:720px)');
  const reveal = h => { const t = h && h.length > 1 && document.getElementById(h.slice(1)); if (!t) return; const d = t.querySelector(':scope > .d-cold') || t.closest('.d-cold'); if (d) d.open = true; return t; };
  const lay = () => { folds.forEach(d => { d.open = !phone.matches; }); const t = reveal(location.hash); if (t) t.scrollIntoView(); };
  folds.forEach(d => d.querySelector('summary').addEventListener('click', ev => { if (!phone.matches) ev.preventDefault(); }));
  document.addEventListener('click', ev => { const a = ev.target.closest && ev.target.closest('a[href^="#"]'); if (a) reveal(a.hash); });
  addEventListener('hashchange', () => reveal(location.hash));
  if (phone.matches) { lay(); if (location.hash) addEventListener('load', () => { const t = reveal(location.hash); if (t) t.scrollIntoView(); }); }
  phone.addEventListener('change', lay);
  const all = [...document.querySelectorAll('.d-toc a, .d-tocx a')], now = document.querySelector('.d-tocnow'), tocx = document.querySelector('.d-tocx');
  // the phone's sticky contents control also names the section being read
  const set = id => { all.forEach(a => a.classList.toggle('on', a.hash === '#' + id)); if (now) { const l = links.find(a => a.hash === '#' + id); now.textContent = l ? l.textContent : ''; } };
  const pick = () => { const y = 140; let cur = secs[0]; for (const s of secs) if (s.getBoundingClientRect().top - y <= 0) cur = s; set(cur.id); };
  let raf; addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pick); }, { passive: true });
  addEventListener('resize', pick); pick();
  // following a contents link on a phone closes the list again
  document.querySelectorAll('.d-tocx a').forEach(a => a.addEventListener('click', () => a.closest('details').removeAttribute('open')));
  // and so does a tap anywhere else, since the list sits over the text
  if (tocx) document.addEventListener('click', ev => { if (tocx.open && !tocx.contains(ev.target)) tocx.removeAttribute('open'); });
})();
