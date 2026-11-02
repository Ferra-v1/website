// Methodology and privacy: the contents list follows the section being read.
(() => {
  const links = [...document.querySelectorAll('.d-toc a')], secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!secs.length) return;
  const set = id => links.forEach(a => a.classList.toggle('on', a.hash === '#' + id));
  const pick = () => { const y = 140; let cur = secs[0]; for (const s of secs) if (s.getBoundingClientRect().top - y <= 0) cur = s; if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = secs[secs.length - 1]; set(cur.id); };
  let raf; addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pick); }, { passive: true }); pick();
})();
