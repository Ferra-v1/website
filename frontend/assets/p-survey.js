// The report surveys (pages/survey.py). On send: one row into Supabase public.leads (kind survey_robots or survey_lenders, the answers as compact JSON in message),
// then a copy by email through FormSubmit, then the thanks. The email never blocks the form, and a failed database save still sends the email and still thanks the person.
(() => {
  const f = document.querySelector('form.sv-form'); if (!f) return;
  const SB = 'https://ybgspxfnjkehjskhrpne.supabase.co/rest/v1/leads', KEY = 'sb_publishable_256LqgO7hWqqhz2ZBvDLhQ_VsXwNgq3';
  const MAIL = 'https://formsubmit.co/ajax/1d426f2e99676be2e089b72bff1dffdf';
  const OK_MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const qs = [...f.querySelectorAll('fieldset.sv-q')], err = f.querySelector('.sv-err'), btn = f.querySelector('button[type=submit]');
  const byName = n => [...f.querySelectorAll(`input[name="${n}"]`)];
  const picked = g => [...g.querySelectorAll('input[type=radio],input[type=checkbox]')].filter(i => i.checked && i.closest('[data-g]') === g).map(i => i.value);
  const answered = q => [...q.querySelectorAll('[data-g]')].some(g => picked(g).length);
  // keeps the page honest after every change: an option that rules out the rest, the limit of three, the Other boxes, and a cleared warning once a question is answered
  const refresh = changed => {
    if (changed && changed.type === 'checkbox' && changed.checked) { const all = byName(changed.name);
      if (changed.hasAttribute('data-alone')) all.forEach(o => { if (o !== changed) o.checked = false; }); else all.forEach(o => { if (o.hasAttribute('data-alone')) o.checked = false; }); }
    f.querySelectorAll('[data-limit]').forEach(g => { const n = +g.dataset.limit, boxes = [...g.querySelectorAll('input[type=checkbox]')], k = boxes.filter(b => b.checked).length;
      boxes.forEach(b => { const off = !b.checked && k >= n; b.disabled = off; b.closest('label').classList.toggle('off', off); }); const note = g.querySelector('.sv-lim'); if (note) note.hidden = k < n; });
    f.querySelectorAll('[data-other-for]').forEach(box => { const o = byName(box.dataset.otherFor).find(i => i.hasAttribute('data-other')); box.hidden = !(o && o.checked); });
    qs.forEach(q => { if (q.classList.contains('sv-bad') && answered(q)) q.classList.remove('sv-bad'); });
  };
  f.addEventListener('change', ev => refresh(ev.target));
  // what one group answered: a list for "tick all", one value otherwise, with Other's own words when it gave them
  const read = g => { const v = picked(g), o = f.elements[g.dataset.g + '_other'], words = o && v.includes('Other') ? o.value.trim() : '';
    return { v: g.dataset.type === 'many' ? v : (v[0] || null), words, text: v.map(x => x === 'Other' && words ? 'Other: ' + words : x).join(', ') }; };
  const collect = () => { const json = {}, mail = {};
    qs.forEach(q => { const n = q.dataset.q, gs = [...q.querySelectorAll('[data-g]')], label = `${n}. ${q.dataset.short}`;
      if (gs.length === 1 && !gs[0].dataset.part) { const r = read(gs[0]); if (r.text) { json['q' + n] = r.v; if (r.words) json[`q${n}_other`] = r.words; } mail[label] = r.text || 'No answer'; return; }
      const obj = {}, lines = []; gs.forEach(g => { const r = read(g); if (!r.text) return; obj[g.dataset.part] = r.v; if (r.words) obj[g.dataset.part + '_other'] = r.words; lines.push((g.dataset.label ? g.dataset.label + ': ' : '') + r.text); });
      if (lines.length) json['q' + n] = obj; mail[label] = lines.join('; ') || 'No answer'; });
    return { json, mail }; };
  const done = () => { f.querySelector('.sv-body').hidden = true; const d = f.querySelector('.sv-done'); d.hidden = false; d.scrollIntoView({ block: 'center', behavior: 'auto' }); if (d.focus) d.focus({ preventScroll: true }); };
  const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
  f.addEventListener('submit', async ev => {
    ev.preventDefault(); err.hidden = true;
    const missing = qs.filter(q => q.hasAttribute('data-req') && !answered(q)), email = f.elements.email.value.trim(), badMail = email && !OK_MAIL.test(email);
    missing.forEach(q => q.classList.add('sv-bad')); f.elements.email.setAttribute('aria-invalid', badMail ? 'true' : 'false');
    if (missing.length || badMail) {
      const nums = missing.map(q => q.dataset.q);
      err.textContent = (nums.length ? `Please answer question${nums.length > 1 ? 's' : ''} ${list(nums)}.` : '') + (badMail ? (nums.length ? ' ' : '') + 'Enter a full email, like name@company.com, or leave it empty.' : '');
      err.hidden = false; const first = missing.length ? missing[0].querySelector('input') : f.elements.email; first.focus({ preventScroll: true }); (missing[0] || f.elements.email).scrollIntoView({ block: 'center', behavior: 'auto' }); return; }
    if (f.website.value) return done();   // the decoy field is filled: a bot
    const { json, mail } = collect(), page = location.pathname + '#survey';
    const row = { kind: f.dataset.kind, page, message: JSON.stringify(json) }; if (email) row.email = email;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Sending';
    let saved = false;
    try { const ac = new AbortController(), t = setTimeout(() => ac.abort(), 10000);
      const r = await fetch(SB, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row), signal: ac.signal }); clearTimeout(t); saved = r.ok; } catch (x) {}
    try { const b = { _subject: f.dataset.subject, _template: 'table', _captcha: 'false', ...mail, Email: email || 'Not given', Page: page, 'Saved to database': saved ? 'Yes' : 'No' };
      fetch(MAIL, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b) }).catch(() => {}); } catch (x) {}
    btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Send';
    done();
  });
  refresh();
})();
