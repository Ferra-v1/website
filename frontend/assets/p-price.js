// Price a robot (ferra.world/price). Draws every figure from window.FERRA_PRICE (the listings data, inlined at build)
// and FerraEngine (assets/engine.js, run in a Web Worker). Charts are hand-built SVG in the house dot style.
(() => {
const start = () => {
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r100 = v => Math.round(v / 100) * 100;
const usd = v => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const m100 = v => usd(Math.abs(v) >= 1000 ? r100(v) : Math.round(v / 10) * 10);
const kfmt = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v);
const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const SRCN = { machineseeker: 'Machineseeker', exapro: 'Exapro', machineryline: 'Machineryline', bcindustrial: 'BC Industrial', robotstrader: 'Robots Trader', robotmp: 'Robot Marketplace', robotstrading: 'Robots Trading' };
const srcName = s => SRCN[s] || s;
const dateTxt = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${+m[3]} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m[2] - 1]} ${m[1]}` : esc(d); };

const D = window.FERRA_PRICE;
const E = window.FerraEngine;
const META = window.FERRA_PRICE_META;
if (!D || !META) { const o = document.querySelector('.pp-ans'); if (o) o.innerHTML = '<p class="pp-ac">The price data did not load. Reload the page to try again.</p>'; return; }
const NOW = +(String(D.built || '2026').slice(0, 4));
const ARM_CLASS = { arm: 1, cobot: 1, palletizer: 1 };

// ------------------------------------------------------------------ robots: the data's model index (families, generations, variants) plus two model-curve-only types
const ENT = [];
const famOf = Object.fromEntries(D.families.map(f => [f.id, f]));
const fmod = {}; D.families.forEach(f => (f.models || []).forEach(m => { fmod[m.id] = m; (m.variants || []).forEach(v => { fmod[v.id] = { ...v, label: v.label }; }); }));
(D.models || []).forEach(m => {
  const f = famOf[m.family]; if (!f) return;
  const mm = m.kind === 'family' ? null : fmod[m.id] || fmod[m.parent] || null;
  ENT.push({ id: m.id, label: m.label.replace(/ \(any model\)$/, ''), sub: m.kind === 'family' ? 'any model' : '', kind: m.kind, fam: f, model: mm,
    n: m.n, nfit: m.kind === 'family' ? f.n_fit : (mm && mm.fe != null ? mm.n_fit : f.n_fit), use: (f.use || ['PALLET'])[0] });
});
ENT.push({ id: 'any-arm', label: 'Industrial arm, make not listed', sub: '', kind: 'all', fam: D.all, model: null, n: D.all.n, nfit: D.all.n_fit, use: 'PALLET', pooledAll: true });
const GEN = [{ id: 'warehouse-mobile-robot', label: 'Warehouse mobile robot', gen: 'AMR', use: 'AMR', n: 0 }, { id: 'cleaning-robot', label: 'Cleaning robot', gen: 'CLEAN', use: 'CLEAN', n: 0 }];
ENT.push(...GEN);
const byId = Object.fromEntries(ENT.map(x => [x.id, x]));
const DEF = byId['kuka-kr-210'] || ENT.find(x => x.fam) || ENT[0];
const countTxt = x => x.gen ? 'model curve only' : x.n + (x.n === 1 ? ' listing' : ' listings');

// ------------------------------------------------------------------ state
const S = { r: DEF.id, y: 2026, p: 125000, m: 4500, u: 'PALLET', t: 'MID', n: 36, f: 50, view: 'fam', log: false, risk: 0 };
const PRESETS = {
  pallet: { r: DEF.id, y: 2026, p: 125000, m: 4500, u: 'PALLET', t: 'MID', n: 36 },
  used: { r: DEF.id, y: 2020, p: 17000, m: 600, u: 'PICK', t: 'MID', n: 36 },
  amr: { r: 'warehouse-mobile-robot', y: 2026, p: META.types.AMR.cost, m: META.types.AMR.fee, u: 'AMR', t: 'MID', n: 36 },
};
const ent = () => byId[S.r] || DEF;

// ------------------------------------------------------------------ the data estimate: asking range, expected sale, auction floor
const slope = f => f.dep.b != null ? f.dep.b : -Math.log(1 - f.dep.annual);
function estimate() {
  const x = ent(), rawAge = NOW - S.y, age = clamp(rawAge, 0, 30), capped = rawAge > 30;
  if (x.gen) {
    const t = META.types[x.gen], keep = Math.exp(-Math.pow(age * 12 / t.tau, t.beta));
    const sale = S.p * keep, keep1 = Math.exp(-Math.pow((age * 12 + 12) / t.tau, t.beta));
    return { gen: true, age, capped, sale, ask: null, floor: null, annual: 1 - keep1 / keep, keep };
  }
  // the data file's method: median asking = exp(level + fe - b x age); band from residual, model and slope uncertainty
  const f = x.fam, m = x.model, fe = m && m.fe != null ? m.fe : 0, b = slope(f);
  const se = m && m.se != null ? m.se : (f.se_any || 0);
  const n = x.nfit, thin = n < 8, z = 1.2816;
  const sdp = Math.sqrt(f.sd * f.sd + se * se + Math.pow((age - (f.age_mean || age)) * (f.dep.b_se || 0), 2));
  const ask = Math.exp(f.level + fe - b * age);
  const AR = D.auction_ratio.by_age, ar = age < 10 ? AR.under_10 : AR['10_plus'], floor = ask * ar.median;
  const sale = Math.sqrt(ask * floor);
  // robots 2 years old or newer: the installed cell's value runs down the engine's own curve from the price paid
  const tt = META.types[S.u], isNew = age <= 2, cell = S.p * Math.exp(-Math.pow(age * 12 / tt.tau, tt.beta));
  const armAt = a => { const q = Math.exp(f.level + fe - b * a), r2 = (a < 10 ? AR.under_10 : AR['10_plus']).median; return q * Math.sqrt(r2); };
  return { isNew, cell, armAt, famFit: f.n_fit, age, capped, ask, lo: ask * Math.exp(-z * sdp), hi: ask * Math.exp(z * sdp), floor, sale, thin, n, fe, ownFe: !!(m && m.fe != null && m.basis !== 'family'), b, ar, young: age < 10,
    pooled: f.dep.basis === 'pooled', own: f.dep.own, annual: f.dep.annual, alo: f.dep.lo, ahi: f.dep.hi };
}

// ------------------------------------------------------------------ the engine, in a worker built from its own source (works from file://)
let worker = null; const pend = new Map(); let rid = 0;
try {
  if (E && E.workerSource) {
    worker = new Worker(URL.createObjectURL(new Blob([E.workerSource()], { type: 'text/javascript' })));
    worker.onmessage = ev => { const o = ev.data || {}, p = pend.get(o.id); if (p) { pend.delete(o.id); o.error ? p.fb() : p.res(o); } };
    worker.onerror = ev => { ev.preventDefault && ev.preventDefault(); worker = null; const all = [...pend.values()]; pend.clear(); all.forEach(p => p.fb()); };
  }
} catch (err) { worker = null; }
const onMain = inp => new Promise((res, rej) => setTimeout(() => { try { Promise.resolve(E.run(inp)).then(res, rej); } catch (err) { rej(err); } }, 0));
const runEngine = inp => new Promise((res, rej) => {
  if (!worker) return onMain(inp).then(res, rej);
  pend.set(inp.id, { res, fb: () => onMain(inp).then(res, rej) }); worker.postMessage(inp);
});
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000003; };

// ------------------------------------------------------------------ inputs
const q = $('pp-q'), lb = $('pp-lb'), ySel = $('pp-y'), pIn = $('pp-p'), mIn = $('pp-m'), fIn = $('pp-fl');
const num = el => { const v = parseFloat(String(el.value).replace(/[^0-9.]/g, '')); return isFinite(v) ? v : 0; };
const fmtIn = (el, v) => { el.value = Math.round(v).toLocaleString('en-US'); };
const setSeg = (name, v) => document.querySelectorAll(`.pp-seg[data-name="${name}"] [role=radio]`).forEach(b => { const on = b.dataset.v === String(v); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
function syncInputs() {
  const x = ent();
  q.value = x.label; $('pp-cbn').textContent = countTxt(x);
  ySel.value = String(clamp(S.y, 1995, 2026)); fmtIn(pIn, S.p); fmtIn(mIn, S.m); fmtIn(fIn, S.f);
  setSeg('u', S.u); setSeg('t', S.t); setSeg('n', S.n); setSeg('view', S.view);
  $('pp-log').checked = S.log;
  const tl = { IG: 'Large and rated customer', MID: 'Mid-size customer', STARTUP: 'Startup customer' }[S.t];
  $('pp-moresum').textContent = `${tl}, ${S.n} months, ${S.f} robots`;
  check();
}
const typical = x => {
  if (x.gen) return META.types[x.gen].cost;
  if (x.model && x.model.new_price) return x.model.new_price;
  return META.types[x.use].cost;
};
function pickRobot(x, keepPrice) {
  S.r = x.id; S.u = x.use;
  if (!keepPrice) S.p = typical(x);
  S.m = META.types[S.u].fee;
  if (x.gen && S.view === 'all') S.view = 'fam';
}

// combobox: type to filter models and families, arrows to move, Enter to pick, Escape to close
let opts = [], act = -1;
function listFor(text) {
  const t = text.trim().toLowerCase().split(/\s+/).filter(Boolean).map(norm);
  const hit = x => { const L = norm(x.label + ' ' + (x.fam ? (x.fam.maker || '') + ' ' + x.fam.label : '') + (x.gen ? ' mobile amr cleaning ' : '')); return t.every(w => L.includes(w)); };
  let r = t.length ? ENT.filter(hit) : ENT.filter(x => x.gen || !x.model || x.n >= 5);
  r.sort((a, b) => (t.length ? (norm(b.label).startsWith(t[0]) - norm(a.label).startsWith(t[0])) : 0) || (!!a.gen - !!b.gen) || (b.n - a.n));
  return r.slice(0, 60);
}
function renderList(text) {
  opts = listFor(text); act = opts.length && text.trim() ? 0 : -1;
  lb.innerHTML = opts.length ? opts.map((x, i) => `<li role="option" id="pp-o${i}" aria-selected="${i === act}" data-i="${i}"><span>${esc(x.label)}${x.sub ? ` <small>${x.sub}</small>` : ''}</span><em>${countTxt(x)}</em></li>`).join('')
    : '<li class="pp-none">No robot matches. Try a maker, like FANUC or KUKA.</li>';
  if (act >= 0) q.setAttribute('aria-activedescendant', 'pp-o0'); else q.removeAttribute('aria-activedescendant');
}
function openList(text) { renderList(text); lb.hidden = false; q.setAttribute('aria-expanded', 'true'); }
function closeList(restore) { lb.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); if (restore) q.value = ent().label; }
function moveAct(d) {
  if (!opts.length) return; act = act < 0 ? (d > 0 ? 0 : opts.length - 1) : (act + d + opts.length) % opts.length;
  lb.querySelectorAll('[role=option]').forEach((li, i) => li.setAttribute('aria-selected', i === act));
  const li = $('pp-o' + act); q.setAttribute('aria-activedescendant', 'pp-o' + act); li && li.scrollIntoView({ block: 'nearest' });
}
function choose(i) { const x = opts[i]; if (!x) return; S.unknown = null; release(); pickRobot(x); closeList(); syncInputs(); update(); }
q.addEventListener('focus', () => { q.select(); openList(''); });
q.addEventListener('click', () => { if (lb.hidden) openList(''); });
q.addEventListener('input', () => openList(q.value));
q.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown') { ev.preventDefault(); lb.hidden ? openList('') : moveAct(1); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveAct(-1); }
  else if (ev.key === 'Enter') { ev.preventDefault(); if (!lb.hidden && act >= 0) choose(act); }
  else if (ev.key === 'Escape') { closeList(true); }
  else if (ev.key === 'Tab') { if (!lb.hidden && act >= 0 && q.value !== ent().label) choose(act); else closeList(true); }
});
lb.addEventListener('mousedown', ev => ev.preventDefault());
lb.addEventListener('click', ev => { const li = ev.target.closest('[data-i]'); if (li) choose(+li.dataset.i); });
q.addEventListener('blur', () => setTimeout(() => { if (!lb.hidden) closeList(true); }, 120));

ySel.addEventListener('change', () => { release(); S.y = +ySel.value; update(); });
document.querySelectorAll('.pp-st').forEach(b => b.addEventListener('click', () => { release(); S.y = clamp(S.y + +b.dataset.d, 1995, 2026); ySel.value = S.y; update(); }));
const release = () => document.querySelectorAll('.pp-pre').forEach(o => o.setAttribute('aria-pressed', 'false'));
// checks the two money fields as typed; while either is invalid the results are greyed out and nothing reruns
function check() {
  const p = num(pIn), m = num(mIn), ph = $('pp-ph'), mh = $('pp-mh'), pBad = p < 1000, mBad = m <= 0;
  ph.hidden = !pBad; if (pBad) ph.textContent = 'Enter what the robot cost, at least $1,000.';
  if (mBad) { mh.textContent = 'Rent has to be above $0 a month for a loan to be repaid from it.'; mh.hidden = false; }
  else if (!pBad && m > p * .15) { mh.textContent = `That rent is ${pct(m / p, 0)} of the price paid each month. The engine's robot types rent for about 3% to 4% of their price a month.`; mh.hidden = false; }
  else mh.hidden = true;
  document.querySelector('.page').classList.toggle('pp-stale', pBad || mBad);
  return { bad: pBad || mBad, p, m };
}
[pIn, mIn].forEach(el => el.addEventListener('input', () => { release(); const c = check(); if (c.bad) return; S.p = c.p; S.m = c.m; update(); }));
[pIn, mIn, fIn].forEach(el => el.addEventListener('blur', () => syncInputs()));
fIn.addEventListener('input', () => { release(); const v = Math.round(num(fIn)); if (v >= 1) { S.f = Math.min(v, 100000); update(true); } });
// radio groups (used for, customer, term, scatter view): click or arrow keys
document.querySelectorAll('.pp-seg').forEach(g => {
  const set = b => {
    const name = g.dataset.name, v = b.dataset.v;
    if (name === 'u') S.u = v; else if (name === 't') S.t = v; else if (name === 'n') S.n = +v; else if (name === 'view') { if (ent().gen && v === 'all') S.view = 'all'; else S.view = v; }
    if (name !== 'view') release();
    if (name === 'u') { S.m = META.types[v].fee; if (ent().gen) S.p = META.types[v].cost; }
    syncInputs(); name === 'view' ? drawResale() : update();
  };
  g.addEventListener('click', ev => { const b = ev.target.closest('[role=radio]'); if (b) set(b); });
  g.addEventListener('keydown', ev => {
    const bs = [...g.querySelectorAll('[role=radio]')], i = bs.indexOf(document.activeElement);
    if (i < 0 || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(ev.key)) return;
    ev.preventDefault(); const nb = bs[(i + (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]; nb.focus(); set(nb);
  });
});
$('pp-log').addEventListener('change', ev => { S.log = ev.target.checked; drawResale(); });
document.querySelectorAll('.pp-pre').forEach(b => b.addEventListener('click', () => {
  const P = PRESETS[b.dataset.p], x = byId[P.r]; S.r = x.id; S.u = P.u; S.y = P.y; S.t = P.t; S.n = P.n; S.m = P.m;
  S.p = P.p || typical(x);
  if (x.gen) S.view = 'fam';
  document.querySelectorAll('.pp-pre').forEach(o => o.setAttribute('aria-pressed', o === b));
  syncInputs(); update();
}));

// ------------------------------------------------------------------ share link: bare tokens in the hash
const toHash = () => `#r=${S.r}&y=${S.y}&p=${Math.round(S.p)}&m=${Math.round(S.m)}&u=${S.u}&t=${S.t}&n=${S.n}&f=${S.f}`;
function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1)); if (!h.get('r') && !h.get('y')) return false;
  const x = byId[h.get('r')] || (h.get('r') ? byId['any-arm'] : null); if (x) { S.r = x.id; S.u = x.use; S.p = typical(x); S.m = META.types[S.u].fee; S.unknown = !byId[h.get('r')] ? h.get('r') : null; }
  const n = k => { const v = parseFloat(h.get(k)); return isFinite(v) ? v : null; };
  if (n('y') != null) S.y = clamp(Math.round(n('y')), 1995, 2026);
  if (n('p') > 0) S.p = n('p'); if (n('m') > 0) S.m = n('m');
  if (META.types[h.get('u')]) S.u = h.get('u'); if (META.tiers[h.get('t')]) S.t = h.get('t');
  if ([24, 36, 48, 60].includes(n('n'))) S.n = n('n'); if (n('f') >= 1) S.f = Math.round(n('f'));
  return true;
}
async function copyLink(btn) {
  history.replaceState(null, '', toHash());
  const url = location.href; let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (err) {
    const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (e2) {} t.remove(); }
  const lab = btn.dataset.lab || (btn.dataset.lab = btn.textContent);
  btn.textContent = ok ? 'Link copied' : 'Copy the address bar'; btn.classList.add('done');
  setTimeout(() => { btn.textContent = lab; btn.classList.remove('done'); }, 2200);
}
[$('pp-copy'), $('pp-copy2')].forEach(b => b.addEventListener('click', () => copyLink(b)));

// ------------------------------------------------------------------ counting figures
const tw = new WeakMap();
function tween(el, to, fmt, dur = 650) {
  const from = tw.has(el) ? tw.get(el) : null; tw.set(el, to);
  if (reduce || from == null || !isFinite(from) || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1 && tw.get(el) === to) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const svg = (w, h, cls, label) => `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">`;

// ------------------------------------------------------------------ data figures (instant)
let EST = null;
function drawData() {
  const x = ent(), es = EST = estimate();
  const vl = document.querySelector('.pp-a[data-k="v"] .pp-al');
  if (es.isNew && !es.gen) {
    vl.innerHTML = 'Cell value today<a class="pp-mk" href="#method">Model</a>'; tween($('a-v'), es.cell, m100);
    $('ac-v').innerHTML = `The arm alone, used: <b>${m100(es.sale)}</b>, from ${es.famFit} listings`;
  } else {
    vl.textContent = 'Resale value today'; tween($('a-v'), es.sale, m100);
    $('ac-v').textContent = es.gen ? 'No listings yet, model curve only' : `Auction floor ${m100(es.floor)} to typical asking ${m100(es.ask)}`;
  }
  if (es.gen) { tween($('a-d'), es.annual * 100, v => v.toFixed(1) + '%'); $('ac-d').textContent = 'From the model curve at this age; no listings yet'; }
  else { tween($('a-d'), es.annual * 100, v => v.toFixed(1) + '%'); $('ac-d').textContent = `95% range ${pct(es.alo)} to ${pct(es.ahi)}, all arms`; }
  const f = x.fam, srcs = f ? new Set(f.points.map(p => p.src)).size : 0;
  $('pp-dl').innerHTML = x.fam === D.all ? `Priced against <b>${f.n_fit} arm, collaborative arm and palletizer listings in the fit</b>, from ${f.n.toLocaleString('en-US')} in the search index. <a href="#resale">See every listing</a>` : x.gen ? `<b>No listings yet for this robot type.</b> Resale follows the risk engine's model curve only, so treat it as a rough guide. <a class="pp-mk" href="#method">Model</a>`
    : `Priced against <b>${f.n_fit} ${esc(f.label)} listings in the fit</b> (${f.n} in the search index, ${f.n_priced} with a price) from ${srcs} marketplace${srcs === 1 ? '' : 's'}${es.thin ? `. <b class="pp-flag">Thin data</b> the estimate rests on ${es.n} listing${es.n === 1 ? '' : 's'} in the fit, so the range is wider` : ''}. <a href="#resale">See every listing</a>`;
  drawStrip(); drawResale(); drawCompare(); drawMini();
}
// phones: a compact copy of the answers right under the robot and year fields
function drawMini() {
  const es = EST, m = $('pp-mini'); if (!m) return;
  const v = es.isNew && !es.gen ? ['Cell value', m100(es.cell)] : ['Resale value', m100(es.sale)];
  const l = R0 ? `${elf(R0.el)} <i>&rarr;</i> <em>${elf(R0.el_backup)}</em>` : '<span class="pp-sk"></span>', o = OFF ? (OFF[0].none ? 'No loan' : m100(OFF[0].L)) : '<span class="pp-sk"></span>';
  m.innerHTML = `<div><span>${v[0]}</span><b class="num">${v[1]}</b></div><div><span>Expected loss, then with backup</span><b class="num">${l}</b></div><div><span>Fair offer</span><b class="num">${o}</b></div>`;
}
// where your robot sits among real listings of a similar age, on a ratio scale
function drawStrip() {
  const x = ent(), es = EST, host = $('pp-strip');
  if (x.gen) { host.innerHTML = `<div class="pp-sth"><b>Where it sits among real listings</b></div><p class="pp-stn">No listings for this robot type yet. The value comes from the model curve only.</p>`; return; }
  let span = 3, pts = [];
  for (; span <= 9; span += 3) { pts = x.fam.points.filter(p => p.fit !== 0 && Math.abs(p.age - es.age) <= span); if (pts.length >= 8) break; }
  span = Math.min(span, 9);
  let src = x.fam.label; if (pts.length < 5) { pts = D.all.points.filter(p => p.fit !== 0 && Math.abs(p.age - es.age) <= 3); src = 'arm'; span = 3; }
  const W = Math.max(260, host.clientWidth), H = 82, pad = 10, cy = 39, vals = pts.map(p => p.usd).concat([es.floor, es.lo, es.hi]);
  // leave 90px left of the auction floor so its label always fits beside its marker
  const hi = Math.log(Math.max(...vals) * 1.15), rr = 90 / (W - 2 * pad), lo = Math.min(Math.log(Math.min(...vals) * .85), (Math.log(es.floor) - rr * hi) / (1 - rr));
  const X = v => pad + (Math.log(v) - lo) / (hi - lo) * (W - 2 * pad);
  const o = [svg(W, H, 'pp-sts', 'Your robot against listings of a similar age')];
  o.push(`<rect class="rg" x="${X(es.lo).toFixed(1)}" y="${cy - 11}" width="${(X(es.hi) - X(es.lo)).toFixed(1)}" height="22" rx="11"/>`);
  const rows = {}; pts.slice().sort((a, b) => a.usd - b.usd).forEach(p => { const px = X(p.usd), k = Math.round(px / 7); rows[k] = (rows[k] || 0) + 1; const yy = cy + ((rows[k] - 1) % 3 - 1) * 7; o.push(`<circle class="pt" cx="${px.toFixed(1)}" cy="${yy}" r="3.2"/>`); });
  // floor and asking labelled below, the expected sale above, so close values never collide
  [[es.floor, 'Auction floor', 'fl'], [es.sale, '', 'sa'], [es.ask, 'Typical asking', 'as']].forEach(([v, l, c], i) => {
    const px = X(v); o.push(`<line class="mk ${c}" x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${i === 1 ? 18 : cy - 18}" y2="${cy + 18}"/>`);
    const anc = i === 0 ? (px < 84 ? 'start' : 'end') : i === 2 ? (px > W - 100 ? 'end' : 'start') : (px < 60 ? 'start' : px > W - 60 ? 'end' : 'middle'), dx = anc === 'start' ? 4 : anc === 'end' ? -4 : 0;
    o.push(`<text class="ml ${c}" x="${(px + dx).toFixed(1)}" y="${i === 1 ? 12 : cy + 33}" text-anchor="${anc}">${i === 1 ? 'Expected sale ' + m100(v) : l}</text>`);
  });
  o.push(`<circle class="you" cx="${X(es.sale).toFixed(1)}" cy="${cy}" r="7"/></svg>`);
  host.innerHTML = `<div class="pp-sth"><b>${es.isNew ? 'Where the arm alone sits among real used listings' : 'Where it sits among real listings'}</b><span>${pts.length} ${esc(src)} listings built within ${span} years of ${S.y}, by asking price</span></div>` + o.join('');
}

// ------------------------------------------------------------------ resale scatter: every priced listing, the fitted band, auctions, your robot
let PTS = [], scale = null, pinned = null;
function curveFor(view) {
  const x = ent(), es = EST;
  if (view === 'all' || x.gen) return { c: D.all.curve, k: 1 };
  return { c: x.fam.curve, k: Math.exp(es.fe || 0) };
}
function drawResale() {
  const x = ent(), es = EST, host = $('pp-sc'), W = Math.max(280, host.clientWidth), phone = W < 560;
  const H = phone ? 340 : 440, ml = phone ? 46 : 64, mr = phone ? 12 : 24, mt = 20, mb = phone ? 40 : 46;
  const allV = S.view === 'all' || x.fam === D.all;
  $('pp-vfam').textContent = x.gen ? 'This robot' : 'This family';
  const pts = x.gen && !allV ? [] : (allV ? D.all.points : x.fam.points);
  const aucs = D.auctions.filter(a => a.age != null && !a.excluded && a.unit_usd > 0 && (allV || (!x.gen && a.family === x.fam.id)));
  const { c, k } = curveFor(allV ? 'all' : 'fam');
  const xMax = clamp(Math.max(10, es.age + 2, ...pts.map(p => p.age + 1)), 10, 31);
  const vals = pts.map(p => p.usd).sort((a, b) => a - b), q98 = vals.length ? vals[Math.floor(vals.length * .98)] : 0;
  const cmax = Math.max(...c.filter(r => r.age <= xMax).map(r => r.p90 * k));
  let yMax = x.gen && !allV ? S.p * 1.1 : Math.max(q98 * 1.08, es.hi || es.sale * 1.6, x.gen ? S.p : 0, x.gen ? 0 : cmax * .7);
  const yMin = S.log ? Math.max(500, Math.min(...vals.slice(0, Math.max(1, Math.floor(vals.length * .01))), es.floor || es.sale) * .7) : 0;
  const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(m => m * p).find(m => m >= v); };
  yMax = nice(yMax);
  const X = a => ml + a / xMax * (W - ml - mr);
  const Y = S.log ? v => mt + (1 - (Math.log(clamp(v, yMin, yMax)) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin))) * (H - mt - mb)
    : v => mt + (1 - clamp(v, 0, yMax) / yMax) * (H - mt - mb);
  const o = [svg(W, H, 'pp-scs', 'Asking price by age for every priced listing, with the fitted range and your robot')];
  const step = (() => { const raw = yMax / 4, p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= raw); })();
  if (!S.log) yMax = Math.ceil(yMax / step) * step;
  const ticks = S.log ? [1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5].filter(v => v >= yMin && v <= yMax) : Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const nCut = pts.filter(p => p.usd > yMax).length;
  ticks.forEach(v => o.push(`<line class="gl" x1="${ml}" x2="${W - mr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="ax" x="${ml - 10}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${kfmt(v)}</text>`));
  const xs = phone ? 5 : xMax > 20 ? 5 : 2;
  for (let a = 0; a <= xMax; a += xs) o.push(`<text class="ax" x="${X(a).toFixed(1)}" y="${H - mb + 20}" text-anchor="middle">${a}</text>`);
  o.push(`<text class="ax at" x="${W - mr}" y="${H - 6}" text-anchor="end">Age in years</text>`);
  // fitted band and the median as a dotted line
  const cs = c.filter(r => r.age <= xMax);
  if (!x.gen || allV) {
    const top = cs.map(r => `${X(r.age).toFixed(1)},${Y(r.p90 * k).toFixed(1)}`), bot = cs.slice().reverse().map(r => `${X(r.age).toFixed(1)},${Y(r.p10 * k).toFixed(1)}`);
    o.push(`<polygon class="band" points="${top.concat(bot).join(' ')}"/><polyline class="med" points="${cs.map(r => `${X(r.age).toFixed(1)},${Y(r.p50 * k).toFixed(1)}`).join(' ')}"/>`);
  } else {
    const t = META.types[x.gen], pts2 = []; for (let a = 0; a <= xMax; a += .5) pts2.push(`${X(a).toFixed(1)},${Y(S.p * Math.exp(-Math.pow(a * 12 / t.tau, t.beta))).toFixed(1)}`);
    o.push(`<polyline class="med mc" points="${pts2.join(' ')}"/>`);
  }
  // listings
  PTS = [];
  const mid = x.model ? norm(x.model.label) : null;
  pts.forEach((p, i) => {
    const px = X(p.age + ((i * 37) % 11 - 5) * .035), py = Y(p.usd), mine = !allV && mid && norm(p.model).includes(mid);
    PTS.push({ x: px, y: py, p, kind: 'l' });
    o.push(`<circle class="pt${mine ? ' me' : ''}${p.fit === 0 ? ' nf' : ''}${p.usd > yMax ? ' cut' : ''}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${phone ? 3.4 : 4}"/>`);
  });
  aucs.forEach(a => { const px = X(a.age), py = Y(a.unit_usd), s = phone ? 7 : 8; PTS.push({ x: px, y: py, p: a, kind: 'a' }); o.push(`<rect class="au${a.age_imputed ? ' im' : ''}" x="${(px - s / 2).toFixed(1)}" y="${(py - s / 2).toFixed(1)}" width="${s}" height="${s}"/>`); });
  // your robot: the asking range as a bracket, the expected sale as a ring
  const ux = X(es.age), uy = Y(es.sale);
  if (!es.gen) o.push(`<line class="ub" x1="${ux}" x2="${ux}" y1="${Y(es.hi).toFixed(1)}" y2="${Y(es.lo).toFixed(1)}"/>` + [es.hi, es.ask, es.lo].map(v => `<line class="ub" x1="${ux - 6}" x2="${ux + 6}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`).join(''));
  o.push(`<circle class="uo" cx="${ux}" cy="${uy}" r="11"/><circle class="ui" cx="${ux}" cy="${uy}" r="4.5"/>`);
  const lw = phone ? 132 : 158, lx = ux + 18 + lw > W - mr ? ux - 18 - lw : ux + 18, ly = clamp(uy - 30, mt, H - mb - 48);
  o.push(`<g class="ul"><rect x="${lx}" y="${ly}" width="${lw}" height="44" rx="9"/><text x="${lx + 12}" y="${ly + 18}">Your robot</text><text class="uv" x="${lx + 12}" y="${ly + 36}">${m100(es.sale)} expected</text></g>`);
  o.push(`<rect class="hit" x="${ml}" y="0" width="${W - ml - mr}" height="${H}"/></svg>`);
  host.innerHTML = o.join('');
  scale = { W, H };
  hideTip(true);
  if (!pts.length) host.insertAdjacentHTML('beforeend', `<p class="pp-empty"><b>No listings yet for this robot type.</b> The line is the risk engine's model curve, starting at the price paid. <button type="button" class="pp-lk" id="pp-goall">Compare with all arms</button></p>`);
  host.closest('figure').classList.toggle('nolist', !pts.length);
  const ga = $('pp-goall'); if (ga) ga.addEventListener('click', () => { S.view = 'all'; setSeg('view', 'all'); drawResale(); });
  $('pp-cut').textContent = nCut ? `${nCut} listing${nCut === 1 ? '' : 's'} above ${kfmt(yMax)} ${nCut === 1 ? 'sits' : 'sit'} on the top line; switch on log scale to see ${nCut === 1 ? 'it' : 'them'}.` : '';
  $('pp-lga').textContent = aucs.length ? 'Sold at auction' : allV ? 'No auction results with a known age' : 'No auction results for this family yet';
  $('pp-scsum').textContent = es.gen ? 'No listings for this robot type.' : `${pts.length} listings shown. Your robot, ${es.age} years old, has an expected sale value of ${m100(es.sale)}.`;
  // ladder, tables, notes
  drawLadder(); drawTables(pts, aucs, allV);
  const srcs = new Set(pts.map(p => p.src)).size;
  $('pp-rnote').innerHTML = x.gen ? 'No listings for this robot type yet, so the value comes from the model curve only. Switch to all arms to compare with industrial arm listings.'
    : `The chart shows ${pts.length} ${allV ? 'arm, collaborative arm and palletizer' : esc(x.fam.label)} listings with a price and a build year, ${pts.filter(p => p.fit !== 0).length} of them used in the fit, from ${srcs} marketplace${srcs === 1 ? '' : 's'}. Asking prices run above sale prices; auction results set the floor.`;
}
// tooltip: hover on desktop, tap on phones, with a link to the listing
const tip = $('pp-tip');
function tipHtml(t) {
  if (t.kind === 'a') { const a = t.p; return `<b>${esc(a.lot)}</b><span>Sold at auction for <strong>${usd(a.unit_usd)}</strong> a robot</span><span>${esc(a.venue)}, ${esc(a.date)}${a.age != null ? ` · ${a.age} years old${a.age_imputed ? ', age estimated' : ''}` : ''}</span>${a.basis ? `<em>${esc(a.basis)}</em>` : ''}${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">Open the auction lot &rarr;</a>` : ''}`; }
  const p = t.p, yr = p.year || NOW - p.age;
  return `<b>${esc(p.title || p.model)}</b><span>Listed for <strong>${usd(p.usd)}</strong>, asking</span><span>Built ${yr} · ${srcName(p.src)}${p.loc ? ' · ' + esc(p.loc) : ''}${p.refurb ? ' · refurbished' : ''}</span>${p.why ? `<em>Not in the fit: ${esc(p.why)}</em>` : ''}${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">Open the listing &rarr;</a>` : ''}`;
}
function showTip(t, pin) {
  const host = $('pp-sc'), r = host.getBoundingClientRect(), fr = host.parentNode.getBoundingClientRect();
  tip.innerHTML = tipHtml(t) + (pin ? '<button type="button" class="pp-tx" aria-label="Close">&times;</button>' : ''); tip.hidden = false;
  const tw2 = tip.offsetWidth, th = tip.offsetHeight, ox = r.left - fr.left, oy = r.top - fr.top;
  let lx = ox + t.x + 14; if (lx + tw2 > fr.width - 8) lx = ox + t.x - 14 - tw2; lx = clamp(lx, 8, fr.width - tw2 - 8);
  tip.style.left = lx + 'px'; tip.style.top = clamp(oy + t.y - th / 2, 4, fr.height - th - 4) + 'px';
  $('pp-sc').querySelectorAll('.hl').forEach(n => n.remove());
  const s = $('pp-sc').querySelector('svg'); if (s) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('class', 'hl'); c.setAttribute('cx', t.x); c.setAttribute('cy', t.y); c.setAttribute('r', 9); s.insertBefore(c, s.lastChild); }
  const xb = tip.querySelector('.pp-tx'); if (xb) xb.addEventListener('click', () => hideTip(true));
}
function hideTip(force) { if (pinned && !force) return; pinned = null; tip.hidden = true; const h = $('pp-sc').querySelector('.hl'); h && h.remove(); }
const nearest = (mx, my, rad) => { let b = null, bd = rad * rad; PTS.forEach(t => { const d = (t.x - mx) ** 2 + (t.y - my) ** 2; if (d < bd) { bd = d; b = t; } }); return b; };
const sc = $('pp-sc');
sc.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse' || pinned) return; const r = sc.getBoundingClientRect(), t = nearest(ev.clientX - r.left, ev.clientY - r.top, 22); t ? showTip(t) : hideTip(); });
sc.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse' && !tip.matches(':hover')) hideTip(); });
sc.addEventListener('click', ev => { const r = sc.getBoundingClientRect(), t = nearest(ev.clientX - r.left, ev.clientY - r.top, 26); if (t) { pinned = t; showTip(t, true); } else hideTip(true); });
tip.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) hideTip(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !tip.hidden) hideTip(true); });

function dotRow(v, max, n, cls) { const k = clamp(Math.round(v / max * n), 1, n); return `<span class="pp-dr" aria-hidden="true">${('<i class="' + cls + '"></i>').repeat(k)}${'<i class="g"></i>'.repeat(n - k)}</span>`; }
function drawLadder() {
  const x = ent(), es = EST, el = $('pp-lad');
  const acc = D.accuracy;
  const yr = `${esc(x.label)}, built ${S.y}`;
  if (es.gen) {
    el.innerHTML = `<b class="pp-ladh">${yr}</b><div class="pp-rung"><span>Model value today</span><b class="num">${m100(es.sale)}</b>${dotRow(es.sale, S.p, 24, 'c')}<p>Price paid of ${m100(S.p)} run down the risk engine's resale curve for ${META.types[x.gen].label.toLowerCase()} robots: ${pct(es.keep, 0)} kept after ${es.age} year${es.age === 1 ? '' : 's'}.</p></div>
<p class="pp-thin"><b>No listings yet, model curve only.</b> There are no public listings of this robot type in the data, so there is no asking range or auction floor to show.</p>`;
    return;
  }
  const mx = es.ask * 1.02;
  el.innerHTML = `<b class="pp-ladh">${yr}</b>
<div class="pp-rung"><span>Typical asking</span><b class="num">${m100(es.ask)}</b>${dotRow(es.ask, mx, 24, 'l')}<p>The middle of what sellers list it for. Most asking prices fall between ${m100(es.lo)} and ${m100(es.hi)}.</p></div>
<div class="pp-rung hi"><span>Expected sale</span><b class="num">${m100(es.sale)}</b>${dotRow(es.sale, mx, 24, 'c')}<p>Halfway between typical asking and the auction floor, measured on a ratio scale. Ferra's working estimate of a negotiated sale.</p></div>
<div class="pp-rung"><span>Auction floor</span><b class="num">${m100(es.floor)}</b>${dotRow(es.floor, mx, 24, 'a')}<p>Robots ${es.young ? 'under 10 years old' : '10 years and older'} sold at auction for ${pct(es.ar.median, 0)} of the asking price predicted for the same robot, across ${es.ar.n} matched lots. Auctions ran 2018 to 2026, so older lots read low.</p></div>
${x.model && !es.ownFe ? `<p class="pp-thin"><b>Priced at the family level.</b> ${x.model.n_fit || 0} listing${(x.model.n_fit || 0) === 1 ? '' : 's'} of this exact model ${(x.model.n_fit || 0) === 1 ? 'is' : 'are'} in the fit, too few for an adjustment of its own, so it takes the ${esc(x.fam.label)} level and a wider range.</p>`
  : es.thin ? `<p class="pp-thin"><b>Thin data.</b> This estimate rests on ${es.n} listing${es.n === 1 ? '' : 's'} in the fit, so the range is wider.</p>` : ''}

${x.pooledAll ? `<p class="pp-thin"><b>Priced across all arms.</b> ${S.unknown ? `The robot in the link (${esc(S.unknown)}) is not in the data, so it` : 'With no make or model, it'} is priced at the level of every arm, collaborative arm and palletizer listing, with the widest range.</p>` : ''}
${es.capped ? `<p class="pp-thin"><b>Over 30 years old.</b> Values are capped at age 30, the oldest the data covers.</p>` : ''}
<p class="pp-acc">How good is it? On ${acc.n_test} listings the model never saw, grouped by seller, the estimate lands within 25% of the listed price for about ${pct(acc.within_25pct, 0)} of them, with a median error of ${pct(acc.median_abs_pct, 0)}. The asking range is set to contain ${pct(acc.band_coverage_after, 0)} of held-out prices.</p>`;
}
function drawTables(pts, aucs, allV) {
  const x = ent(), es = EST, mid = x.model ? norm(x.model.label) : null;
  let pool = pts.length >= 6 ? pts : (x.gen ? [] : D.all.points);
  const near = pool.map(p => ({ p, s: Math.abs(p.age - es.age) + (mid && !norm(p.model).includes(mid) ? 100 : 0) })).sort((a, b) => a.s - b.s).slice(0, 6).map(o => o.p);
  const row = p => `<tr><td>${esc(p.model)}</td><td class="r num">${p.year || NOW - p.age}</td><td class="r num">${usd(p.usd)}</td><td>${srcName(p.src)}</td><td class="lc">${esc(p.loc || '')}</td><td>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">View</a>` : ''}</td></tr>`;
  const head = '<thead><tr><th>Robot</th><th class="r">Built</th><th class="r">Listed for</th><th>Marketplace</th><th class="lc">Location</th><th><span class="sr">Link</span></th></tr></thead>';
  $('pp-near').innerHTML = near.length ? head + '<tbody>' + near.map(row).join('') + '</tbody>' : '<tbody><tr><td class="pp-tnone">No listings of this robot type yet.</td></tr></tbody>';
  $('pp-nn').textContent = near.length ? `The ${near.length} listings closest to your robot by model and age. Asking prices.` : 'No listings yet, model curve only.';
  const fk = a => x.gen ? 2 : a.family === x.fam.id ? 0 : a.family && famOf[a.family] && famOf[a.family].maker === x.fam.maker ? 1 : 2;
  const byClose = (a, b) => fk(a) - fk(b) || (a.age == null) - (b.age == null) || Math.abs((a.age || 0) - es.age) - Math.abs((b.age || 0) - es.age) || String(b.date).localeCompare(String(a.date));
  let A = D.auctions.filter(a => !x.gen && a.family === x.fam.id), note = 'Auction lots of this family, closest in age first. Sold prices, per robot.';
  if (!A.length) { A = D.auctions.filter(a => !a.excluded).sort(byClose).slice(0, 5); note = 'No auction lots of this family yet, so these are the 5 closest by age. Sold prices, per robot.'; }
  else A = A.slice().sort(byClose);
  $('pp-an').textContent = note;
  $('pp-auc').innerHTML = '<thead><tr><th>Sold</th><th>Lot</th><th class="r">Per robot</th><th class="lc">Venue</th><th><span class="sr">Link</span></th></tr></thead><tbody>' +
    A.map(a => `<tr><td class="num">${esc(a.date)}</td><td class="wr">${esc(a.lot)}</td><td class="r num">${usd(a.unit_usd)}</td><td class="lc">${esc(a.venue)}</td><td>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">View</a>` : ''}</td></tr>`).join('') + '</tbody>';
  const all = pts.slice().sort((a, b) => a.age - b.age || a.usd - b.usd);
  $('pp-allt').innerHTML = all.length ? head + '<tbody>' + all.map(row).join('') + '</tbody>' : '<tbody><tr><td class="pp-tnone">No listings of this robot type yet.</td></tr></tbody>';
  document.querySelector('.pp-all summary').textContent = all.length ? `All ${all.length} listings behind the chart, as a table` : 'No listings behind the chart yet';
}

// ------------------------------------------------------------------ family comparison: annual value loss with its 95% range
function drawCompare() {
  const x = ent(), es = EST, rows = [], A = D.all.dep, rob = (D.model && D.model.robustness) || [];
  const young = rob.find(r => /15 years old or younger/.test(r.label)), old = rob.find(r => /older than 15/.test(r.label));
  rows.push({ lab: 'All arms, the rate used', n: A.n, v: A.annual, lo: A.lo, hi: A.hi, me: true });
  if (young) rows.push({ lab: 'Robots 15 years old or younger', n: young.n, v: young.annual, lo: young.lo, hi: young.hi });
  if (old) rows.push({ lab: 'Robots older than 15 years', n: old.n, v: old.annual, lo: old.lo, hi: old.hi });
  const own = D.families.filter(f => f.dep.own).sort((a, b) => b.dep.own.n - a.dep.own.n);
  const mine = x.fam && x.fam.dep.own ? [x.fam] : [];
  mine.concat(own.filter(f => !mine.includes(f))).slice(0, 3).forEach(f => rows.push({ lab: f.label + ', own fit', n: f.dep.own.n, v: f.dep.own.annual, lo: f.dep.own.lo, hi: f.dep.own.hi, mine: f === x.fam }));
  const lo = Math.min(-.02, ...rows.map(r => r.lo)), hi = Math.max(.12, ...rows.map(r => r.hi)), mn = Math.max(lo, -.05), mx = Math.min(hi, .16);
  const P = v => ((clamp(v, mn, mx) - mn) / (mx - mn) * 100).toFixed(1) + '%';
  $('pp-cmp').innerHTML = rows.map(r => `<div class="pp-cr${r.me ? ' me' : ''}${r.mine ? ' mine' : ''}"><span class="pp-cl">${esc(r.lab)}<small>${r.n} listings${r.lo < mn || r.hi > mx ? ', range runs off the scale' : ''}</small></span>
<span class="pp-cb2"><i class="pp-ci" style="left:${P(r.lo)};width:calc(${P(r.hi)} - ${P(r.lo)})"></i><i class="pp-cd" style="left:${P(r.v)}"></i></span><b class="num">${pct(r.v)}</b></div>`).join('') +
    `<div class="pp-cax"><span></span><span class="pp-caxs">${[0, .05, .1, .15].filter(v => v >= mn && v <= mx).map(v => `<em style="left:${P(v)}">${Math.round(v * 100)}%</em>`).join('')}</span><span></span></div>`;
  $('pp-vnote').textContent = x.gen ? `There are no listings for this robot type, so its value follows the risk engine's model curve: about ${pct(es.annual)} a year at this age.`
    : `Across ${A.n} listings, arms lose about ${pct(A.annual)} of their asking price a year${young ? `, and about ${pct(young.annual)} while they are 15 years old or younger` : ''}. Family rates could not be told apart, so one rate is used. Below, the risk engine runs your robot's value forward and lays the loan balance over it.`;
}

// ------------------------------------------------------------------ engine results
let gen = 0, R0 = null, R1 = null, OFF = null;
const engKeys = ['l', 'o'];
const ADV = .70;            // reference advance: 70% of today's resale value
function startEngine() {
  const my = ++gen, es = EST, t0 = performance.now();
  if (!E || !E.run) return engineFailed();
  engKeys.forEach(k => document.querySelector(`.pp-a[data-k="${k}"]`).classList.add('busy'));
  document.querySelectorAll('.pp-eng').forEach(n => n.classList.add('busy'));
  // the loan is sized on today's resale value (loanBasis market); price paid sets the robot's running costs
  // a lender lends against today's value once a robot is more than 2 years old (loanBasis market); newer robots are
  // sized on price paid and run down the engine's own resale curve from there
  const mkt = es.age > 2;
  const base = { type: S.u, tier: S.t, cost: S.p, fee: S.m, ageMonths: es.age * 12, term: S.n, paths: 2000 };
  if (mkt) { base.marketValue = es.sale; base.loanBasis = 'market'; }
  // one fixed seed for every run (common random numbers), so a change in an input shows only its own effect
  const seed = 42;
  const go = (advance, backup) => runEngine({ ...base, id: ++rid, advance, seed, backup });
  // each offer starts at 70% and steps down until debt service coverage holds at 1.25x, with and without a backup partner
  const size = async (first, backup) => {
    let A = ADV, r = first;
    for (let i = 0; i < 5; i++) {
      const cap = backup ? r.max_advance_125_backup : r.max_advance_125, d = backup ? r.dscr_backup : r.dscr;
      if (cap < .05 || (d != null && d <= 0)) return { r, A, none: true };
      if (cap >= A - 1e-4 && (d == null || d >= 1.2495)) return { r, A };
      A = Math.max(.05, Math.min(Math.floor(cap * 100) / 100, Math.round((A - .01) * 100) / 100));
      if (my !== gen) return { r, A };
      r = await go(A, false);
    }
    return { r, A };
  };
  Promise.all([go(ADV, false), go(ADV, true)]).then(([a, b]) => {
    if (my !== gen) return;
    return Promise.all([size(a, false), size(a, true)]).then(([s0, s1]) => {
      if (my !== gen) return;
      const wait = Math.max(0, 600 - (performance.now() - t0));
      setTimeout(() => { if (my === gen) showEngine(a, b, s0, s1); }, reduce ? 0 : wait);
    });
  }).catch(err => { if (my !== gen) return; console.error(err); engineFailed(); });
}
function engineFailed() {
  engKeys.forEach(k => document.querySelector(`.pp-a[data-k="${k}"]`).classList.remove('busy'));
  $('a-l').textContent = 'Unavailable'; $('ac-l').textContent = 'The risk engine did not run. Reload to try again.';
  $('a-o').textContent = 'Unavailable'; $('ac-o').textContent = '';
}
const pmt = (L, c, n) => { const r = c / 12; return r > 0 ? L * r / (1 - Math.pow(1 + r, -n)) : L / n; };
const elf = v => v < .0005 ? '<0.1%' : (v * 100).toFixed(1) + '%';
const elw = v => v < .0005 ? 'under 0.1%' : (v * 100).toFixed(1) + '%';
const elTween = (el, v) => { if (v < .0005) { tw.set(el, null); el.textContent = '<0.1%'; } else tween(el, v * 100, x => x.toFixed(1) + '%'); };
function showEngine(a, b, s0, s1) {
  R0 = a; R1 = b; const es = EST;
  engKeys.forEach(k => document.querySelector(`.pp-a[data-k="${k}"]`).classList.remove('busy'));
  document.querySelectorAll('.pp-eng').forEach(n => n.classList.remove('busy'));
  // offer without a backup partner: 70%, or less if coverage caps it (run c). With one: 70% from run a's backup scenario.
  const basisV = a.meta && a.meta.loan_basis === 'market' ? es.sale : S.p;
  const mk = (run, A, coupon, dscr, cap, el, backup) => {
    const ok = coupon != null && isFinite(coupon), L = basisV * A;
    return { run, backup, ok, c: coupon, A, L, cap, dscr, el, pay: ok ? pmt(L, coupon, S.n) : null };
  };
  const off = (sz, backup) => {
    const r = sz.r, k = backup ? '_backup' : '';
    if (sz.none) return { run: r, backup, ok: false, none: true, c: null, A: 0, L: 0, cap: 0, dscr: r['dscr' + k], el: r['el' + k], pay: null };
    return mk(r, sz.A, r['coupon_needed' + k], r['dscr' + k], r['max_advance_125' + k], r['el' + k], backup);
  };
  const o0 = off(s0, false), o1 = off(s1, true);
  OFF = [o0, o1]; OFF.basis = basisV === S.p ? 'cost' : 'market'; OFF.coll = basisV === S.p ? a.resale.p50[0] : es.sale;
  // answer strip
  const l = $('a-l');
  if (!l.querySelector('.v0')) l.innerHTML = `<span class="v0"></span><i aria-hidden="true">&rarr;</i><span class="v1"></span>`;
  elTween(l.querySelector('.v0'), a.el); elTween(l.querySelector('.v1'), a.el_backup);
  $('ac-l').textContent = 'Without, then with a backup partner. Simulated live';
  if (o0.none) { tw.set($('a-o'), null); $('a-o').textContent = 'No loan'; $('ac-o').textContent = 'The rent does not cover running costs, so no advance holds 1.25x debt service coverage'; }
  else tween($('a-o'), o0.L, m100);
  if (!o0.none) $('ac-o').textContent = o0.ok ? `${pct(o0.A, 0)} of ${OFF.basis === 'market' ? 'resale value' : 'price paid'}, ${m100(o0.pay)} a month for ${S.n} months` : 'No rate works at this advance; a backup partner or a lower advance helps';
  // insight bars in the window
  const mx = Math.max(.06, a.el, a.el_backup);
  [[a.el, 'pp-ld0', 'pp-lv0'], [a.el_backup, 'pp-ld1', 'pp-lv1']].forEach(([v, d, t]) => {
    const n = clamp(Math.floor(($(d).clientWidth + 3) / (innerWidth < 600 ? 9 : 10)), 12, 40), k = clamp(Math.round(v / mx * n), v > 0 ? 1 : 0, n);
    $(d).innerHTML = '<i class="f"></i>'.repeat(k) + '<i></i>'.repeat(n - k); elTween($(t), v);
  });
  $('pp-insx').textContent = `A named backup partner cuts expected loss on this loan from ${elw(a.el)} to ${elw(a.el_backup)}.`;
  drawCover(); drawRisk(); drawSheets(); drawMini();
}

// ------------------------------------------------------------------ collateral cover: resale by year as dot columns, the loan balance laid over it
function drawCover() {
  const o = OFF[0], r = o.run, es = EST, host = $('pp-cov'), W = Math.max(280, host.clientWidth), phone = W < 560;
  const yrs = Math.ceil(S.n / 12) + 3, M = yrs * 12;
  let p50 = (r.resale && r.resale.p50) || [], p10 = (r.resale && r.resale.p10) || [], p90 = (r.resale && r.resale.p90) || [];
  const t = META.types[S.u], S0 = m => Math.exp(-Math.pow((es.age * 12 + m) / t.tau, t.beta));
  const ext = (arr, base) => { const out = []; for (let m = 0; m <= M; m++) out.push(m < arr.length ? arr[m] : (arr.length ? arr[arr.length - 1] * S0(m) / S0(arr.length - 1) : base * S0(m) / S0(0))); return out; };
  p50 = ext(p50, es.sale); p10 = ext(p10, es.sale * .7); p90 = ext(p90, es.sale * 1.3);
  const bal0 = r.balance || []; const bk = bal0[0] ? bal0[0] / o.L : 1;
  const bal = []; for (let m = 0; m <= M; m++) bal.push(!o.none && m <= S.n ? (m < bal0.length ? bal0[m] / bk : 0) : 0);
  const H = phone ? 300 : 380, ml = phone ? 46 : 64, mr = phone ? 10 : 20, mt = 16, mb = 40;
  const vraw = Math.max(p90[0], bal[0], ...p90) * 1.02, stp = (() => { const raw = vraw / 4, q = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(k => k * q).find(k => k >= raw); })();
  const vmax = Math.ceil(vraw / stp) * stp, R = phone ? 12 : 16;
  const arm = es.isNew && !es.gen ? Array.from({ length: M + 1 }, (_, m) => es.armAt(es.age + m / 12)) : null;
  const X = m => ml + m / M * (W - ml - mr), Y = v => mt + (1 - v / vmax) * (H - mt - mb);
  const out = [svg(W, H, 'pp-covs', 'Expected resale value by year against the loan balance')];
  Array.from({ length: Math.round(vmax / stp) + 1 }, (_, i) => i * stp).forEach(v => { out.push(`<line class="gl" x1="${ml}" x2="${W - mr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="ax" x="${ml - 10}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${kfmt(v)}</text>`); });
  // cushion: where resale sits above the balance, shaded; where the balance is above resale, flagged
  const seg = [], bad = [];
  for (let m = 0; m <= S.n; m++) if (bal[m] > p50[m] && m > 0) bad.push(m);
  const top = [], bot = []; for (let m = 0; m <= S.n; m++) { top.push(`${X(m).toFixed(1)},${Y(Math.max(p50[m], bal[m])).toFixed(1)}`); bot.unshift(`${X(m).toFixed(1)},${Y(bal[m]).toFixed(1)}`); }
  out.push(`<polygon class="cush" points="${top.concat(bot).join(' ')}"/>`);
  out.push(`<rect class="after" x="${X(S.n).toFixed(1)}" y="${mt}" width="${(X(M) - X(S.n)).toFixed(1)}" height="${H - mt - mb}"/><text class="ax aft" x="${(X(S.n) + 8).toFixed(1)}" y="${mt + 14}">After the loan</text>`);
  // dot columns, one per year
  const cw = (W - ml - mr) / yrs, py = (H - mt - mb) / R, rad = Math.min(py * .34, cw * .16);
  for (let yv = 0; yv <= yrs; yv++) {
    const m = yv * 12, cx = X(m), n50 = Math.round(p50[m] / vmax * R), n10 = Math.round(p10[m] / vmax * R), n90 = Math.round(p90[m] / vmax * R);
    for (let j = 0; j < R; j++) { const y = H - mb - j * py - py / 2; const cls = j < n10 ? 'c' : j < n50 ? 'c2' : j < n90 ? 'gr' : null;
      if (cls) out.push(`<circle class="${cls}${bad.length && m <= S.n && bal[m] > p50[m] ? ' bad' : ''}" cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" style="--d:${(yv * .06 + j * .015).toFixed(2)}s"/>`); }
    if (!phone || yv % 2 === 0 || yv === yrs) out.push(`<text class="ax" x="${cx.toFixed(1)}" y="${H - mb + 20}" text-anchor="middle">${phone ? 'Y' + yv : 'Year ' + yv}</text>`);
  }
  out.push(`<polyline class="p50" points="${p50.map((v, m) => `${X(m).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`);
  out.push(`<polyline class="bal" points="${bal.slice(0, S.n + 1).map((v, m) => `${X(m).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`);
  if (arm) { out.push(`<polyline class="arm" points="${arm.map((v, m) => `${X(m).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`); const am = Math.round(M * .72); out.push(`<text class="bl al" x="${X(am).toFixed(1)}" y="${(Y(arm[am]) - 10).toFixed(1)}" text-anchor="middle">The arm alone, used</text>`); }
  const lm = Math.round(S.n * .25), lx = X(lm), lyv = Y(bal[lm]);
  out.push(`<text class="bl" x="${(lx + 8).toFixed(1)}" y="${(lyv - 10).toFixed(1)}">Loan balance</text>`);
  out.push('</svg>');
  host.innerHTML = out.join('');
  host.classList.remove('on'); requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add('on')));
  const cush0 = p50[0] - bal[0], mEnd = S.n, minC = Math.min(...p50.slice(0, S.n + 1).map((v, m) => v - bal[m]));
  const costNote = arm ? ` The cell's value comes from the risk engine's curve, starting at the price paid. ` + `If the cell went dark and had to be sold, the arm alone would fetch about ${m100(es.sale)} used; the rest of the cell's value (integration, tooling, software) holds only while it keeps running. That is the risk a backup partner removes.` : '';
  $('pp-covn').innerHTML = o.none ? `<b>No loan to lay over it.</b> At this rent the robot cannot carry debt payments; its value runs down from ${m100(p50[0])} to about ${m100(p50[S.n])} over ${S.n} months.` : (bad.length ? `<b>The balance sits above expected resale in ${bad.length} of ${S.n} months</b>, from month ${bad[0]} to month ${bad[bad.length - 1]}. A lender would want a lower advance or a shorter term for this robot.`
    : `<b>The loan stays below expected resale in every month.</b> The cushion against the ${arm ? "cell's" : "robot's"} value starts at ${m100(cush0)} a robot and never falls below ${m100(minC)}; by month ${mEnd} the loan is repaid and the ${arm ? 'cell is still valued at' : 'robot is still worth'} about ${m100(p50[mEnd])}.`) + costNote;
  host.closest('figure').classList.toggle('isnew', !!arm);
  $('pp-covt').textContent = arm ? 'Cell value against the loan balance' : 'Resale value against the loan balance';
}

// ------------------------------------------------------------------ risk: two figures, the switch, the loss histogram and the drivers
function drawRisk() {
  elTween($('pp-r0'), R0.el); elTween($('pp-r1'), R0.el_backup);
  document.querySelectorAll('.pp-rb').forEach(b => { const on = +b.dataset.v === S.risk; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  const r = S.risk ? R1 : R0, h = r.loss_hist || [], tot = h.reduce((s, v) => s + v, 0) || 1, sh = h.map(v => v / tot);
  const host = $('pp-hist'), W = Math.max(260, host.clientWidth), phone = W < 520, H = phone ? 230 : 260, ml = 4, mr = 4, mt = 26, mb = 34;
  const bins = sh.length, cw = (W - ml - mr) / bins, Rn = phone ? 12 : 16, py = (H - mt - mb) / Rn, rad = Math.min(py * .36, cw * .3);
  const rest = sh.slice(1), mr2 = Math.max(0, ...rest);
  const unit = [.001, .0025, .005, .01, .02, .05, .1].find(u => mr2 / u <= Rn - 4) || .1;
  const o = [svg(W, H, 'pp-hs', 'Distribution of loss across simulated fleets')];
  sh.forEach((v, i) => {
    const cx = ml + i * cw + cw / 2, need = Math.round(v / unit), n = Math.min(Rn, need);
    for (let j = 0; j < Rn; j++) { const y = H - mb - j * py - py / 2; o.push(`<circle class="${j < n ? (i === 0 && need > Rn ? 'z' : 'f') : 'g'}" cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}"/>`); }
    if (need > Rn) o.push(`<text class="ov" x="${(cx - rad).toFixed(1)}" y="${(mt - 8).toFixed(1)}">${pct(v, 0)} of fleets lose under 5%, off the scale</text>`);
  });
  const lab = i => pct(i / bins, 0);
  [0, Math.round(bins / 4), Math.round(bins / 2), Math.round(3 * bins / 4), bins].forEach(i => o.push(`<text class="ax" x="${(ml + i * cw).toFixed(1)}" y="${H - mb + 20}" text-anchor="${i === 0 ? 'start' : i === bins ? 'end' : 'middle'}">${lab(i)}</text>`));
  o.push('</svg>'); host.innerHTML = o.join('');
  $('pp-histn').innerHTML = `Loss as a share of the loan, in bands of 5 points. One dot is ${String(+(unit * 100).toFixed(2))}% of the simulated fleets. ${(r.p_any_loss || 0) < .0005 ? '<b>Every simulated fleet repays in full.</b>' : `<b>${pct(1 - (r.p_any_loss || 0), 0)} of fleets lose nothing at all</b>; the rest spread out to the right.`}`;
  // drivers: 100 dots split by the engine's shares
  const dv = r.drivers || {}, tot2 = (dv.operator || 0) + (dv.customer || 0) + (dv.residual || 0) || 1;
  const parts = [['op', 'Operator failure', (dv.operator || 0) / tot2], ['cu', 'Customer default', (dv.customer || 0) / tot2], ['re', 'Resale shortfall', (dv.residual || 0) / tot2]];
  let left = 100; const cnt = parts.map(([k, l, s], i) => { const n = i === 2 ? left : Math.round(s * 100); left -= n; return n; });
  const off = S.risk === 1;   // with a backup partner the operator share is switched off: show those dots emptied
  $('pp-drv').innerHTML = `<div class="pp-drd${off ? ' off' : ''}" aria-hidden="true">${parts.map(([k], i) => `<i class="${k}"></i>`.repeat(Math.max(0, cnt[i]))).join('')}</div>
<ul class="pp-drl${off ? ' off' : ''}">${parts.map(([k, l, s], i) => `<li><i class="${k}"></i><span>${l}${off && i === 0 ? ', switched off' : ''}</span><b class="num">${pct(s, 0)}</b></li>`).join('')}</ul>`;
  $('pp-drvn').textContent = S.risk ? `Shares of the loss with all risks on. A backup partner takes out the operator share, the emptied dots; what is left, ${elw(R0.el_backup)} of the loan, comes from customers defaulting and robots reselling below the balance.`
    : 'Share of the expected loss each cause accounts for, from the engine. Operator failure is the largest because when the robot company goes, every customer of that fleet stops paying at once.';
  $('pp-sim').textContent = `Simulated over 2,000 fleets of ${META.cohort} robots, ${({ IG: 'large and rated', MID: 'mid-size', STARTUP: 'startup' })[S.t]} customers, ${S.n}-month loan`;
  $('pp-rp').innerHTML = `When a robot company fails, its customers stop paying because the service stops. A backup partner committed in advance keeps the robots running. With the engine's operator failure switched off, which is the upper limit of what a backup partner can do, expected loss falls from ${elw(R0.el)} to ${elw(R0.el_backup)}. No customer has signed a lease like this yet, so the structure is unproven.`;
}
document.querySelector('.pp-rsw').addEventListener('click', ev => { const b = ev.target.closest('.pp-rb'); if (b && R0) { S.risk = +b.dataset.v; drawRisk(); } });
document.querySelector('.pp-rsw').addEventListener('keydown', ev => { if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(ev.key) || !R0) return; ev.preventDefault(); S.risk = 1 - S.risk; drawRisk(); document.querySelector(`.pp-rb[data-v="${S.risk}"]`).focus(); });

// ------------------------------------------------------------------ the two term sheets
function drawSheets() {
  const x = ent(), es = EST, N = S.f, lock = document.querySelector('.pp-win .ap-top .ilock').outerHTML;
  const mk = '<a class="pp-mk" href="#method">Model</a>', mkt = OFF.basis === 'market';
  OFF.forEach((o, i) => {
    const dscr = o.dscr == null ? 'n/a' : o.dscr <= 0 ? '<span class="pp-warn">Rent does not cover running costs</span>' : o.dscr > 20 ? `Above 20x ${mk}` : `${o.dscr.toFixed(2)}x ${mk}`;
    const rows = [
      ['Collateral', `${N.toLocaleString('en-US')} × ${esc(x.label)}, built ${S.y}`],
      [mkt ? 'Collateral value' : 'Price paid', m100((mkt ? es.sale : S.p) * N), mkt ? (es.gen ? 'Value today on the risk engine\'s model curve' : 'Expected sale value today, from listings and auctions') : (es.gen ? 'Installed price; the value runs down the engine\'s model curve' : `Installed price of the cell. The arm alone, used: about ${m100(es.sale * N)}`)],
      ['Loan basis', mkt ? "Today's resale value" : 'Price paid', mkt ? 'The robot is more than 2 years old, so a lender lends against what it is worth today' : 'Robots 2 years old or newer are sized on price paid'],
      ['Advance rate', o.none ? 'None' : pct(o.A, 0), o.none ? 'No advance holds 1.25x debt service coverage at this rent' : o.A < ADV - .001 ? 'Stepped down from 70% until debt service coverage holds at 1.25x' : `Coverage at 1.25x would support up to ${pct(Math.min(o.cap, 1), 0)}${o.cap >= 1 ? ', the cap' : ''}`],
      ['Loan amount', o.none ? 'None' : m100(o.L * N), '', 'big'],
      ['Interest rate needed', o.ok ? `${pct(o.c)} a year ${mk}` : `No rate works at this advance ${mk}`, o.ok ? `${pct(META.tiers[S.t].hurdle, 0)} return to the lender after expected losses, including the 1.5% fee at close` : 'Nothing up to 31% earns the lender\'s return. Try a lower advance or a backup partner', 'd'],
      ['Monthly payment', o.ok ? m100(o.pay * N) : 'None at this advance', '', 'd'],
      ['Debt service coverage', dscr, 'Rent after running costs, against the payment'],
      ['Expected loss', `${elf(o.el)} ${mk}`, 'At a 12% reference rate', 'd'],
      ['Fee at close', `About 1.5%: ${m100(o.L * N * .015)}`],
      ['Term', `${S.n} months`],
      ['Backup partner', o.backup ? 'Named in advance' : 'None', o.backup ? "The engine's upper limit: operator failure switched off. Unproven" : '']];
    $('pp-s' + i).innerHTML = `<div class="sh-h">${lock}<span>Indicative terms</span></div><p class="sh-t">${o.backup ? 'With a named backup partner' : 'Without a backup partner'}</p>` +
      rows.map(([k, v, s2, c]) => `<div class="dr ${c || ''}"><span>${k}</span><b class="num">${v}</b>${s2 ? `<small>${s2}</small>` : ''}</div>`).join('') +
      `<p class="sh-f">Ferra &middot; Indicative, from the pricing model. Nothing here is an offer to lend &middot; Data of ${dateTxt(D.built)}</p>`;
  });
  const [a, b] = OFF, base = mkt ? "today's resale value" : 'price paid';
  let msg;
  if (a.ok && b.ok) {
    const dr = (a.c - b.c) * 100, dl = (b.L - a.L) * N;
    msg = b.A > a.A + .001
      ? `With a backup partner the lender can advance ${pct(b.A, 0)} of ${base} instead of ${pct(a.A, 0)}, ${m100(dl)} more for the fleet, at a rate ${dr.toFixed(1)} points lower.`
      : b.A < a.A - .001 ? `Coverage holds the backup sheet to ${pct(b.A, 0)} of ${base}, against ${pct(a.A, 0)} without, at a rate ${dr.toFixed(1)} points lower.`
      : `Both sheets lend ${pct(a.A, 0)} of ${base}. With a backup partner the lender needs a rate ${dr.toFixed(1)} points lower, which cuts the fleet's payment by ${m100(a.pay * N - b.pay * N)} a month.`;
  } else if (b.ok) msg = a.none ? `Without a backup partner the rent cannot carry a loan at 1.25x coverage. With one, ${pct(b.A, 0)} of ${base} works at ${pct(b.c)} a year.` : `Without a backup partner no rate up to 31% earns the lender's return at ${pct(a.A, 0)}. With one, ${pct(b.A, 0)} works at ${pct(b.c)} a year.`;
  else if (a.ok) msg = b.none ? `With a backup partner the rent cannot carry a loan at 1.25x coverage; without one, ${pct(a.A, 0)} of ${base} works at ${pct(a.c)} a year.` : `With a backup partner no rate up to 31% works at ${pct(b.A, 0)}; without one, ${pct(a.A, 0)} of ${base} works at ${pct(a.c)} a year.`;
  else if (a.none && b.none) msg = 'At this rent the robot cannot carry a loan at 1.25x debt service coverage, with or without a backup partner. A higher rent or lower running costs would change that.';
  else msg = 'No rate up to 31% earns the lender\'s return on these terms, with or without a backup partner. A newer robot, a higher rent or a lower advance would help.';
  if (es.isNew && !es.gen) msg += ' ' + `If the cell went dark and had to be sold, the arm alone would fetch about ${m100(es.sale)} used; the rest of the cell's value (integration, tooling, software) holds only while it keeps running. That is the risk a backup partner removes.`;
  $('pp-onote').textContent = msg;
  // shade the rows where the backup partner changes the terms
  const r0 = [...$('pp-s0').querySelectorAll('.dr')], r1 = [...$('pp-s1').querySelectorAll('.dr')];
  r1.forEach((r, i) => { const k = r.querySelector('span').textContent; if (k !== 'Backup partner' && r0[i] && r0[i].querySelector('b').textContent !== r.querySelector('b').textContent) r.classList.add('hl'); });
}

// ------------------------------------------------------------------ method: the data, the model, the engine, what is unproven
function drawMethod() {
  const c = D.counts, t = META.types[S.u], tier = META.tiers[S.t], TG = E && E.inputTags ? E.inputTags(S.u, S.t) : null;
  const mxs = Math.max(...D.sources.map(s => s.n));
  const keep5 = Math.exp(-Math.pow(60 / t.tau, t.beta));
  $('pp-howb').innerHTML = `<div class="pp-hg">
<div class="pp-hc"><h3>The data</h3><p><b class="num">${c.listings.toLocaleString('en-US')}</b> public used-robot listings from ${c.sources} marketplaces, after removing duplicates. ${c.priced.toLocaleString('en-US')} show a price and ${c.dated.toLocaleString('en-US')} show the year built. Plus <b class="num">${c.auctions}</b> auction results, the only real sale prices in the set.</p>
<ul class="pp-srcs">${D.sources.map(s => `<li><span>${srcName(s.name)}</span>${dotRow(s.n, mxs, 20, 'c')}<b class="num">${s.n}</b></li>`).join('')}</ul>
<p><b>Sample rules.</b> Keep arms, collaborative arms and palletizers with a price, a model and a year. Drop sold listings, multi-unit lots, new or ex-display units, defective or as-is units, and prices outside $500 to $400,000. Identical stock from one seller (same model, year and price) counts once. That leaves <b class="num">${c.sample.toLocaleString('en-US')}</b> listings in the fit.</p>
<p><b>The model.</b> The log of the asking price is an effect for the model, plus an effect for the marketplace, minus a fixed yearly rate times the robot's age. Uncertainty is grouped by seller, so a dealer with many units does not count as many independent prices. Models with few listings lean toward their family's level. On listings the model never saw, the estimate lands within 25% of the listed price for about ${pct(D.accuracy.within_25pct, 0)} of them, with a median error of ${pct(D.accuracy.median_abs_pct, 0)}; the asking range is set to contain ${pct(D.accuracy.band_coverage_after, 0)} of held-out prices.</p>
<p><b>From asking to sale.</b> Auction results set the floor: robots under 10 years old sold for ${pct(D.auction_ratio.by_age.under_10.median, 0)} of the predicted asking price (${D.auction_ratio.by_age.under_10.n} lots), older ones for ${pct(D.auction_ratio.by_age['10_plus'].median, 0)} (${D.auction_ratio.by_age['10_plus'].n} lots). The expected sale value sits halfway between typical asking and that floor, on a ratio scale.</p>
<p><b>Limits.</b> Every listing is an asking price; only the auction results are real sales. Most prices were quoted in euros and converted at one exchange rate. The auction results span 2018 to 2026 with no inflation adjustment, so older lots read low. Depreciation is one rate for all arms, because family rates could not be told apart and predicted worse.</p></div>
<div class="pp-hc"><h3>The risk engine</h3><p>Ferra's risk engine simulates a fleet of ${META.cohort} robots month by month: the robot company can fail, customers can default or cancel, rents and resale values move with one shared economic factor, and anything unpaid at the end is met by selling the robots. The loan runs off that cash, with a 3-month reserve and a cash sweep.</p>
<p><b>Main assumptions</b> for ${t.label.toLowerCase()} with a ${tier.label === 'IG' ? 'large and rated' : tier.label === 'Mid-market' ? 'mid-size' : 'startup'} customer:</p>
<ul class="pp-as"><li><span>Operator failure (the robot company fails)</span><b class="num">${pct(t.oem_haz, 0)} a year</b></li><li><span>Customer default</span><b class="num">${pct(tier.pd)} a year</b></li><li><span>Chance a successor keeps the fleet running</span><b class="num">${pct(t.p_cont, 0)}</b></li><li><span>Resale value after 5 years</span><b class="num">${pct(keep5, 0)} of cost</b></li><li><span>Lender's required return</span><b class="num">${pct(tier.hurdle, 0)}</b></li></ul>
${TG ? `<p><b>How much is data.</b> The engine tags each of its ${TG.total} key inputs by source. For ${t.label.toLowerCase()}:</p>
<div class="pp-tagb" aria-hidden="true">${['data', 'claim', 'estimate', 'assumption'].map(k => `<i class="${k}"></i>`.repeat(TG.counts[k])).join('')}</div>
<ul class="pp-tagl"><li><i class="data"></i>${TG.counts.data} from public data or arithmetic on it</li><li><i class="claim"></i>${TG.counts.claim} from company claims</li><li><i class="estimate"></i>${TG.counts.estimate} rough estimate${TG.counts.estimate === 1 ? '' : 's'}</li><li><i class="assumption"></i>${TG.counts.assumption} are Ferra's assumptions</li></ul>` : ''}
<p><b>How to read the outputs.</b> Expected loss is the average loss over the loan as a share of it, at a 12% reference rate. The study's headline of 5.2% for a new palletizing cell came from a 10,000-path run; this page simulates live with 2,000 paths and the same random draws (seed 42) for every run, so a shared link shows the same numbers and changing an input shows only that input's effect. Resale value alone almost never causes a loss, because a loan is repaid from rent unless something stops the rent; resale decides how much is lost after the robot company or the customer fails. The largest supported advance is capped at 100%. The backup partner figure is the engine run with operator failure switched off: the upper limit of what a backup partner could do.</p></div>
<div class="pp-hc"><h3>What is unproven</h3><p>No customer has signed a lease that keeps paying through a backup partner if the robot company fails, and nobody has yet asked plants whether they would.</p><p>The operator failure rate (7% to 15% a year in the engine) has never been measured, and every credit figure on this page rests on it.</p>
<p class="pp-built">Data built ${dateTxt(D.built)}. Listings are public asking prices.</p></div></div>`;
}

// ------------------------------------------------------------------ update loop
let timer = null;
function update(onlyTotals) {
  history.replaceState(null, '', toHash());
  if (onlyTotals) { if (OFF) drawSheets(); return; }
  drawData(); drawMethod();
  clearTimeout(timer);
  engKeys.forEach(k => document.querySelector(`.pp-a[data-k="${k}"]`).classList.add('busy'));
  timer = setTimeout(startEngine, 250);
}
let rw = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - rw) < 2) return; rw = innerWidth; clearTimeout(window.__ppR); window.__ppR = setTimeout(() => { drawStrip(); drawResale(); if (R0) { drawCover(); drawRisk(); } }, 120); });
document.addEventListener('click', ev => { const a = ev.target.closest('a[href="#method"]'); if (!a) return; ev.preventDefault(); const d = $('pp-how'); d.open = true; d.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
fromHash();
syncInputs();
drawData(); drawMethod(); startEngine();
document.querySelectorAll('.pp-a').forEach(a => a.classList.add('ready'));
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
