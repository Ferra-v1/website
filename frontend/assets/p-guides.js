/* Guides and model pages (pages/guides.py): the contents rail marks the section being read. Reads positions only on scroll, changes one class, moves nothing. */
(() => {
  const rail = document.querySelector('.gd-toc'); if (!rail) return;
  const links = [...rail.querySelectorAll('a[href^="#"]')], heads = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  let on = null, tick = 0;
  const pick = () => { tick = 0; let cur = heads[0]; for (const h of heads) if (h.getBoundingClientRect().top < innerHeight * .3) cur = h; const a = links[heads.indexOf(cur)]; if (a !== on) { if (on) on.classList.remove('on'); a.classList.add('on'); on = a; } };
  addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(pick); }, { passive: true }); pick();
})();
