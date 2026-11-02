// Fleets page: the sizer cleans its inputs, its dot robot follows the robot type, and the quote sheet mirrors the sizer.
(() => {
  const ty = document.getElementById('sz-type'), n = document.getElementById('sz-n'), p = document.getElementById('sz-p');
  if (!ty) return;
  const fmt = v => '$' + Math.round(v).toLocaleString('en-US'), set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const digits = el => el.value.replace(/[^0-9]/g, '');
  const val = el => el._neg ? +el.dataset.min : Math.min(+el.dataset.max, Math.max(+el.dataset.min, +digits(el) || 0));   // a negative entry counts as the minimum
  const comma = el => { el.value = val(el).toLocaleString('en-US'); };
  const cv = document.querySelector('.f-panel canvas.dotbot'), box = cv && cv.parentElement;
  const swap = () => {
    const o = ty.selectedOptions[0]; if (!cv || cv.dataset.bot === o.value) return;
    box.style.setProperty('--ar', o.dataset.ar); box.style.setProperty('--bx', o.dataset.bx); box.style.setProperty('--hh', o.dataset.hh); cv.dataset.bot = o.value; cv.dataset.anim = 'assemble';
    requestAnimationFrame(() => window.FerraDots && window.FerraDots.draw(cv));
  };
  // site.js also writes the three outputs from the raw field values; this runs after it and writes the clamped figures
  const upd = () => {
    const N = val(n), P = val(p), V = N * P, name = ty.selectedOptions[0].dataset.name;
    set('o-v', fmt(V)); set('o-l', fmt(V * .7)); set('o-f', fmt(V * .7 * .015));
    set('f-tname', name); set('f-tprice', fmt(P) + ' each'); set('f-cush', fmt(V * .3));
    set('q-t', name); set('q-n', N.toLocaleString('en-US')); set('q-p', fmt(P)); set('q-v', fmt(V)); set('q-l', fmt(V * .7));
  };
  [n, p].forEach(el => {
    el.addEventListener('input', () => { if (/-/.test(el.value)) el._neg = true; const d = digits(el); if (d !== el.value) el.value = d; upd(); });
    el.addEventListener('focus', () => { el._neg = false; el.value = digits(el); el.select(); });
    el.addEventListener('blur', () => { comma(el); el._neg = false; upd(); });
  });
  ty.addEventListener('change', () => { comma(p); swap(); upd(); });
  // the quote form reads the sizer fields as plain numbers, so hand it digits for the moment it submits
  document.addEventListener('submit', ev => {
    if (!ev.target.matches('form.lead[data-who="fleets"]')) return;
    [n, p].forEach(el => { el.value = String(val(el)); });
    setTimeout(() => [n, p].forEach(comma), 0);
  }, true);
  comma(n); comma(p); upd();
})();
