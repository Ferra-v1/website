// The header panels' pictures (2026-11-28 overhaul): each panel plays its own short Gemini loop of a different machine on the panel's fog ground (core.NP_CLIP).
// site.js loads this the first time a panel opens and calls FerraNP.pick(link) for the link under the pointer. The poster (the clip's exact first frame) shows first; the film loads only when its panel first opens, plays while the panel is open and pauses when it shuts. Reduced motion keeps the poster.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, small = innerWidth < 760;
  const film = card => { let v = card.querySelector('video'); if (v) return v; const d = card.dataset; if (!d.src) return null;
    v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.preload = 'none'; v.poster = d.poster; card.append(v);
    if (!reduce) v.src = small ? d.srcSm : d.src; return v; };
  window.FerraNP = {
    pick(a) { const card = a.closest('.np-in').querySelector('.np-card'); document.querySelectorAll('.np-card video').forEach(x => { if (!card.contains(x)) x.pause(); }); const v = film(card); if (v && !reduce) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } },
    stop() { document.querySelectorAll('.np-card video').forEach(v => v.pause()); },
  };
})();
