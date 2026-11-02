// Company page: robots on a hairline (robot_stage) get the canvas width that matches their own dot grid at the stage's height,
// so each one stands whole on its baseline. The letter's arm is the page's one moving robot (cobot-loop, falling back to the still).
(() => {
  const D = window.FERRA_DOTS || {}, Q = window.FERRA_SEQ || {};
  const FALL = { 'cobot-loop': 'cobot-l', 'arm2-loop': 'arm2', 'cell-loop': 'cell', 'pallet-loop': 'pallet', 'arm-loop': 'arm', cell: 'arm2' };
  const dims = n => { const seen = new Set(); while (n && !seen.has(n)) { seen.add(n); if (Q[n]) return Q[n]; if (D[n]) return D[n]; n = n.endsWith('-l') ? n.slice(0, -2) : FALL[n]; } return null; };
  const fit = () => document.querySelectorAll('[data-page="company.html"] .rstage .rs-bot').forEach(box => {
    const cv = box.querySelector('canvas.dotbot'), b = cv && dims(cv.dataset.bot); if (!b) return;
    cv.style.width = Math.min(box.clientWidth, Math.round(box.clientHeight * b.w / b.h)) + 'px';
  });
  fit(); addEventListener('resize', fit);
})();
