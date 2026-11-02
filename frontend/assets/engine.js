/*
 * Ferra pricing engine, JavaScript port of robot_pricing_engine.py (v2, compiled 2026-10-30).
 * Source: price/data/robot_pricing_engine.py (copied read-only from the ferra repo, see price/data/SOURCES.md).
 *
 * Works three ways from one file:
 *   1. Browser page:   <script src="assets/engine.js"> then window.FerraEngine.run(input)
 *   2. Worker script:  new Worker('assets/engine.js'); worker.postMessage(input) -> {id, ...output}
 *   3. Blob worker:    new Worker(URL.createObjectURL(new Blob([FerraEngine.workerSource()])))
 *                      (needed from file://, where workers cannot load script files)
 *   4. Node:           const FerraEngine = require('./engine.js')
 *
 * What is ported verbatim: GLOBAL, TIERS, TYPES, HOH, EL_CAP, COUPON_GRID, make_params, the Vasicek
 * conditional hazard, simulate (same per-path seeding seed + i*7919, same draw order), loan_terms,
 * run_loan, irr_annual, pct, evaluate, wal_years, base_noi, base_dscr, dscr_sized_advance,
 * required_coupon and stable_seed (crc32). The random generator differs (sfc32 instead of Python's
 * Mersenne Twister), so results match in distribution, not bit for bit. price/parity.mjs checks it.
 *
 * Choices this port adds on top of the Python engine (the Python engine has no such inputs):
 *   - cost and fee from the page. When cost differs from the type's default cost, the money
 *     amounts that scale with the robot (opex, rd_cost, liq_cost, repo, idle) are scaled by
 *     cost / type cost, keeping the type's ratios. enforce_fixed is a per-cohort legal cost and stays
 *     fixed, as in the Python engine. fee is taken as given.
 *   - Used robots. cost is the price paid (it sizes the loan: principal = advance x cost x 50, and the
 *     scaled costs above). The residual curve starts at marketValue. The stretched exponential
 *     v(t) = exp(-(t/tau)^beta) is shifted along its own age axis: we solve for the effective age a0
 *     with exp(-(a0/tau)^beta) = marketValue / cost, then use v(t) = exp(-((a0 + t)/tau)^beta). The
 *     curve keeps its shape and value at month 0 equals marketValue exactly. If marketValue is at or
 *     above cost, a0 = 0 and the curve is scaled up by marketValue / cost. If marketValue is missing,
 *     a0 = ageMonths (cost read as the price when new).
 *   - loanBasis (optional, default 'cost' as spec 5.2 says): 'market' sizes the loan as advance x marketValue
 *     instead of advance x price paid, for a used robot financed against today's value. The residual curve
 *     and the cost-scaled amounts still use the price paid. meta.ltv_market reports loan / marketValue.
 *   - backup: true means operator failure off (oem_haz = 0), the Python engine's "Operator failure off"
 *     attribution row, which is the upper limit of what a committed backup partner can do.
 *   - drivers: Shapley split over three switches, the same switches as the Python engine's own
 *     attribution rows: operator failure (oem_haz = 0), customer default and cancellation (pd = 0,
 *     cancel = 0) and resale value uncertainty (rv_sd = 0, the wrong-way risk). 8 runs on common random
 *     numbers (same seed). Each switch gets its average marginal effect over every order of switching,
 *     so interactions are split fairly. "residual" = the resale uncertainty share plus any loss left with
 *     all three switched off (rent decline, non-renewal, uptime). Negative shares (Monte Carlo noise)
 *     clamp to 0, then the three are normalised to sum to 1 (all risks on, reference coupon).
 *     Engine behaviour worth explaining on the page: resale value alone almost never causes a loss,
 *     because a loan is fully repaid from rent unless something stops the rent; resale decides how much
 *     is lost once the operator or a customer fails.
 *
 * Clamps (so the page never sees NaN, Infinity or a negative probability), all documented in clampInput:
 *   cost 1,000..5,000,000; fee 1..cost; marketValue 0.5%..400% of cost; advance 0.05..1.0;
 *   term 12..84 months (whole); paths 200..50,000; coupon 0.01..0.40. A non-finite IRR is reported as null.
 *   coupon_needed is null when no coupon on the 7%..31% grid earns the hurdle (as Python returns None).
 *
 * Units: USD, months, rates as fractions (0.052 = 5.2%).
 */
(function (root) {
  'use strict';

  function factory() {
    // ------------------------------------------------------------------------------------------
    // 1. INPUTS (verbatim from robot_pricing_engine.py)
    // ------------------------------------------------------------------------------------------
    var ROBOTS_PER_COHORT = 50;
    var GLOBAL = {
      n: ROBOTS_PER_COHORT,
      sofr: 0.036,
      rho_oem: 0.20, rho_cancel: 0.10, rho_wrong_way: 0.60, rho_price: 0.50, util_sd: 0.06,
      lockout_eff: 0.10, recovery: 0.85, arrears_m: 2, term_fee_m: 3,
      advance: 0.70, coupon: 0.12, srv: 0.005, balloon: 0.0, dsra_m: 3, sweep: 1.25,
      enforce_fixed: 50000, enforce_pct: 0.01, fc_delay: 4, skim: 0.0,
      rvi: false, rvi_bp: 0.015, rvi_cover: 0.80, rvi_orphan: false, rvi_suspend_z: 1.5, rvi_basis: 'fs'
    };
    var TIERS = {
      IG:      { label: 'IG',         pd: 0.004, rho: 0.05, n_cust: 5,  cancel_x: 0.9, churn_x: 0.8, hurdle: 0.09 },
      MID:     { label: 'Mid-market', pd: 0.035, rho: 0.10, n_cust: 10, cancel_x: 1.0, churn_x: 1.0, hurdle: 0.12 },
      STARTUP: { label: 'Startup',    pd: 0.120, rho: 0.15, n_cust: 12, cancel_x: 1.3, churn_x: 1.3, hurdle: 0.15 }
    };
    var TYPES = {
      PALLET: { name: 'Palletizer/cobot cell', cost: 125000, fee: 4500, opex: 900,
        util: 0.85, usage_share: 0.0, opex_var: 0.0,
        uptime: 0.97, sla: 0.95, sla_mult: 2.0, uptime_sd: 0.015,
        contract: 36, renew: 12, cancel: 0.06, churn: 0.10,
        oem_haz: 0.09, p_cont: 0.55, retain: 0.70, cont_opex: 1.25, cont_rv: 0.70, cont_leave: 0.25, dark_rv: 0.45,
        tau: 42, beta: 1.2, rv_sd: 0.35, g: 0.05, price_sd: 0.15,
        redeploy: 0.40, rd_delay: 4, rd_cost: 15000, rd_disc: 0.90, idle: 150,
        hair: 0.45, liq_cost: 4000, recov_m: 5, repo: 6000, tenor: 36,
        src: 'fee [self] Formic; cost [weak] robot_types.md; rest [assumption]' },
      AMR: { name: 'AMR (warehouse)', cost: 35000, fee: 1200,
        opex: 350, util: 0.80, usage_share: 0.25, opex_var: 0.0,
        uptime: 0.97, sla: 0.95, sla_mult: 2.0, uptime_sd: 0.015,
        contract: 36, renew: 12, cancel: 0.10, churn: 0.20,
        oem_haz: 0.08, p_cont: 0.30, retain: 0.60, cont_opex: 1.30, cont_rv: 0.55, cont_leave: 0.35, dark_rv: 0.25,
        tau: 38, beta: 1.3, rv_sd: 0.35, g: 0.08, price_sd: 0.15,
        redeploy: 0.50, rd_delay: 3, rd_cost: 1500, rd_disc: 0.90, idle: 40,
        hair: 0.45, liq_cost: 500, recov_m: 3, repo: 800, tenor: 36,
        src: 'fee [unverified] Sacra/Locus; rest [assumption]' },
      PICK: { name: 'Packing/picking arm', cost: 80000, fee: 3000,
        opex: 800, util: 0.80, usage_share: 0.20, opex_var: 0.0,
        uptime: 0.94, sla: 0.93, sla_mult: 2.0, uptime_sd: 0.025,
        contract: 36, renew: 12, cancel: 0.10, churn: 0.20,
        oem_haz: 0.12, p_cont: 0.20, retain: 0.55, cont_opex: 1.40, cont_rv: 0.45, cont_leave: 0.40, dark_rv: 0.20,
        tau: 28, beta: 1.5, rv_sd: 0.40, g: 0.10, price_sd: 0.20,
        redeploy: 0.35, rd_delay: 4, rd_cost: 8000, rd_disc: 0.85, idle: 120,
        hair: 0.40, liq_cost: 2500, recov_m: 5, repo: 4000, tenor: 36,
        src: 'fee [assumption] near Kimball; contract [data] Richtech' },
      HUMANOID: { name: 'Humanoid (Digit-style)', cost: 150000, fee: 8500, opex: 1250,
        util: 0.70, usage_share: 0.0, opex_var: 0.0,
        uptime: 0.85, sla: 0.85, sla_mult: 2.0, uptime_sd: 0.05,
        contract: 24, renew: 12, cancel: 0.20, churn: 0.40,
        oem_haz: 0.15, p_cont: 0.05, retain: 0.40, cont_opex: 1.50, cont_rv: 0.30, cont_leave: 0.60, dark_rv: 0.10,
        tau: 18, beta: 1.5, rv_sd: 0.50, g: 0.30, price_sd: 0.30,
        redeploy: 0.20, rd_delay: 4, rd_cost: 8000, rd_disc: 0.85, idle: 200,
        hair: 0.35, liq_cost: 3000, recov_m: 5, repo: 5000, tenor: 24,
        src: 'fee/cost/opex [data] Agility S-4/A projections; rents China [independent]' },
      SIDEWALK: { name: 'Sidewalk delivery (Serve actuals)', cost: 27500, fee: 380, opex: 1300,
        util: 0.40, usage_share: 0.90, opex_var: 0.50,
        uptime: 0.90, sla: 0.80, sla_mult: 1.0, uptime_sd: 0.03,
        contract: 12, renew: 12, cancel: 0.15, churn: 0.20,
        oem_haz: 0.12, p_cont: 0.10, retain: 0.50, cont_opex: 1.30, cont_rv: 0.40, cont_leave: 0.50, dark_rv: 0.10,
        tau: 34, beta: 1.3, rv_sd: 0.40, g: 0.08, price_sd: 0.20,
        redeploy: 0.50, rd_delay: 2, rd_cost: 500, rd_disc: 0.90, idle: 60,
        hair: 0.40, liq_cost: 300, recov_m: 3, repo: 400, tenor: 24,
        src: 'fee/cost/opex [calc] Serve Q2-26 10-Q' },
      SIDEWALK_M: { name: 'Sidewalk delivery (mature case)', cost: 27500, fee: 970, opex: 450,
        util: 0.85, usage_share: 0.90, opex_var: 0.50,
        uptime: 0.90, sla: 0.80, sla_mult: 1.0, uptime_sd: 0.03,
        contract: 12, renew: 12, cancel: 0.15, churn: 0.20,
        oem_haz: 0.12, p_cont: 0.10, retain: 0.50, cont_opex: 1.30, cont_rv: 0.40, cont_leave: 0.50, dark_rv: 0.10,
        tau: 34, beta: 1.3, rv_sd: 0.40, g: 0.08, price_sd: 0.20,
        redeploy: 0.50, rd_delay: 2, rd_cost: 500, rd_disc: 0.90, idle: 60,
        hair: 0.40, liq_cost: 300, recov_m: 3, repo: 400, tenor: 24,
        src: 'fee [calc]; opex [assumption], an aspiration, not data' },
      CLEAN: { name: 'Commercial cleaning', cost: 31250, fee: 869, opex: 220,
        util: 0.85, usage_share: 0.0, opex_var: 0.0,
        uptime: 0.95, sla: 0.92, sla_mult: 2.0, uptime_sd: 0.02,
        contract: 36, renew: 12, cancel: 0.08, churn: 0.15,
        oem_haz: 0.07, p_cont: 0.50, retain: 0.70, cont_opex: 1.20, cont_rv: 0.70, cont_leave: 0.25, dark_rv: 0.35,
        tau: 40, beta: 1.2, rv_sd: 0.30, g: 0.08, price_sd: 0.15,
        redeploy: 0.70, rd_delay: 2, rd_cost: 1000, rd_disc: 0.90, idle: 40,
        hair: 0.45, liq_cost: 400, recov_m: 2, repo: 500, tenor: 36,
        src: 'cost/fee [data] RobotLAB; rest [assumption]' },
      TRUCK: { name: 'AV truck (carrier-owned, DaaS)', cost: 200000, fee: 33333, opex: 28000,
        util: 0.90, usage_share: 0.90, opex_var: 0.90,
        uptime: 0.93, sla: 0.85, sla_mult: 1.0, uptime_sd: 0.03,
        contract: 12, renew: 12, cancel: 0.08, churn: 0.15,
        oem_haz: 0.08, p_cont: 0.75, retain: 0.80, cont_opex: 1.00, cont_rv: 0.85, cont_leave: 0.20, dark_rv: 0.75,
        tau: 55, beta: 1.1, rv_sd: 0.25, g: 0.01, price_sd: 0.18,
        redeploy: 0.80, rd_delay: 2, rd_cost: 2000, rd_disc: 0.95, idle: 800,
        hair: 0.75, liq_cost: 3000, recov_m: 2, repo: 3000, tenor: 48,
        src: 'rev/DaaS [data] Aurora; truck cost and non-DaaS opex [assumption]' }
    };
    var EL_CAP = 0.06;
    var HOH = { p_cont: 1.0, retain: 0.70, cont_opex: 0.10, cont_leave: 0.05 };
    var COUPON_GRID = [];
    for (var gi = 0; gi < 17; gi++) COUPON_GRID.push(0.07 + 0.015 * gi);   // 7%..31%

    // Money amounts that scale with the robot's cost when the page's cost differs from the type default.
    var COST_SCALED = ['opex', 'rd_cost', 'liq_cost', 'repo', 'idle'];

    function assign(dst) {
      for (var a = 1; a < arguments.length; a++) {
        var s = arguments[a];
        if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) dst[k] = s[k];
      }
      return dst;
    }

    function make_params(rtype, tier, over) {
      var P = assign({}, GLOBAL, TYPES[rtype]);
      var T = TIERS[tier];
      P.pd = T.pd; P.rho = T.rho; P.n_cust = T.n_cust; P.hurdle = T.hurdle; P.el_cap = EL_CAP;
      P.cancel = P.cancel * T.cancel_x;
      P.churn = P.churn * T.churn_x;
      if (over) assign(P, over);
      return P;
    }

    // ------------------------------------------------------------------------------------------
    // Numerical helpers: Python's NormalDist.inv_cdf (Wichura AS241, same coefficients as CPython),
    // the normal CDF (Hart / West double precision), crc32, and a seeded sfc32 generator with
    // Python-style gauss (cached Box-Muller pair) and betavariate (two gamma draws).
    // ------------------------------------------------------------------------------------------
    function invCdf(p) {
      var q = p - 0.5, r, num, den, x;
      if (Math.abs(q) <= 0.425) {
        r = 0.180625 - q * q;
        num = (((((((2.5090809287301226727e+3 * r + 3.3430575583588128105e+4) * r +
          6.7265770927008700853e+4) * r + 4.5921953931549871457e+4) * r +
          1.3731693765509461125e+4) * r + 1.9715909503065514427e+3) * r +
          1.3314166789178437745e+2) * r + 3.3871328727963666080e+0) * q;
        den = (((((((5.2264952788528545610e+3 * r + 2.8729085735721942674e+4) * r +
          3.9307895800092710610e+4) * r + 2.1213794301586595867e+4) * r +
          5.3941960214247511077e+3) * r + 6.8718700749205790830e+2) * r +
          4.2313330701600911252e+1) * r + 1.0);
        return num / den;
      }
      r = q <= 0.0 ? p : 1.0 - p;
      r = Math.sqrt(-Math.log(r));
      if (r <= 5.0) {
        r = r - 1.6;
        num = (((((((7.74545014278341407640e-4 * r + 2.27238449892691845833e-2) * r +
          2.41780725177450611770e-1) * r + 1.27045825245236838258e+0) * r +
          3.64784832476320460504e+0) * r + 5.76949722146069140550e+0) * r +
          4.63033784615654529590e+0) * r + 1.42343711074968357734e+0);
        den = (((((((1.05075007164441684324e-9 * r + 5.47593808499534494600e-4) * r +
          1.51986665636164571966e-2) * r + 1.48103976427480074590e-1) * r +
          6.89767334985100004550e-1) * r + 1.67638483018380384940e+0) * r +
          2.05319162663775882187e+0) * r + 1.0);
      } else {
        r = r - 5.0;
        num = (((((((2.01033439929228813265e-7 * r + 2.71155556874348757815e-5) * r +
          1.24266094738807843860e-3) * r + 2.65321895265761230930e-2) * r +
          2.96560571828504891230e-1) * r + 1.78482653991729133580e+0) * r +
          5.46378491116411436990e+0) * r + 6.65790464350110377720e+0);
        den = (((((((2.04426310338993978564e-15 * r + 1.42151175831644588870e-7) * r +
          1.84631831751005468180e-5) * r + 7.86869131145613259100e-4) * r +
          1.48753612908506148525e-2) * r + 1.36929880922735805310e-1) * r +
          5.99832206555887937690e-1) * r + 1.0);
      }
      x = num / den;
      return q < 0.0 ? -x : x;
    }

    // Standard normal CDF, absolute error about 1e-15 (Hart 1968 as given by West 2005).
    function normCdf(x) {
      var z = Math.abs(x), c;
      if (z > 37) {
        c = 0;
      } else {
        var e = Math.exp(-z * z / 2);
        if (z < 7.07106781186547) {
          var n = 3.52624965998911e-02 * z + 0.700383064443688;
          n = n * z + 6.37396220353165; n = n * z + 33.912866078383; n = n * z + 112.079291497871;
          n = n * z + 221.213596169931; n = n * z + 220.206867912376;
          var d = 8.83883476483184e-02 * z + 1.75566716318264;
          d = d * z + 16.064177579207; d = d * z + 86.7807322029461; d = d * z + 296.564248779674;
          d = d * z + 637.333633378831; d = d * z + 793.826512519948; d = d * z + 440.413735824752;
          c = e * n / d;
        } else {
          var b = z + 0.65;
          b = z + 4 / b; b = z + 3 / b; b = z + 2 / b; b = z + 1 / b;
          c = e / b / 2.506628274631;
        }
      }
      return x > 0 ? 1 - c : c;
    }

    var CRC_TABLE = (function () {
      var t = new Int32Array(256);
      for (var i = 0; i < 256; i++) {
        var c = i;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
      }
      return t;
    })();
    function crc32(str) {
      var c = -1;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        // engine keys are ASCII; encode anything else as UTF-8 bytes
        if (ch < 0x80) c = CRC_TABLE[(c ^ ch) & 0xFF] ^ (c >>> 8);
        else {
          var bytes = unescape(encodeURIComponent(str.charAt(i)));
          for (var j = 0; j < bytes.length; j++) c = CRC_TABLE[(c ^ bytes.charCodeAt(j)) & 0xFF] ^ (c >>> 8);
        }
      }
      return (c ^ -1) >>> 0;
    }
    // Same as Python's stable_seed: crc32('|'.join(parts)) % 1_000_000_007
    function stable_seed() {
      return crc32(Array.prototype.join.call(arguments, '|')) % 1000000007;
    }

    // sfc32 state, reseeded per path. One shared generator object to avoid allocation in the hot loop.
    var R = { a: 0, b: 0, c: 0, d: 0, gnext: 0, ghas: false };
    var TWO32 = 4294967296;
    function mix32(h) {           // murmur3 finaliser
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
      return (h ^ (h >>> 16)) >>> 0;
    }
    function rseed(s) {
      // s can exceed 2^32 at high path counts; fold the high part in
      var lo = s >>> 0, hi = Math.floor(s / TWO32) >>> 0;
      R.a = mix32(lo ^ 0x9e3779b9);
      R.b = mix32(lo + 0x6a09e667 + Math.imul(hi, 0x27d4eb2f));
      R.c = mix32(R.b ^ 0xbb67ae85);
      R.d = 1;
      R.ghas = false;
      for (var i = 0; i < 12; i++) rnd();
    }
    function rnd() {             // uniform [0, 1)
      var a = R.a, b = R.b, c = R.c, d = R.d;
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ (b >>> 9);
      b = c + (c << 3) | 0;
      c = (c << 21) | (c >>> 11);
      c = c + t | 0;
      R.a = a; R.b = b; R.c = c; R.d = d;
      return (t >>> 0) / TWO32;
    }
    var TWOPI = 2 * Math.PI;
    function gauss() {            // Python random.gauss structure: one Box-Muller pair, second value cached
      if (R.ghas) { R.ghas = false; return R.gnext; }
      var x2pi = rnd() * TWOPI;
      var g2rad = Math.sqrt(-2.0 * Math.log(1.0 - rnd()));
      R.gnext = Math.sin(x2pi) * g2rad;
      R.ghas = true;
      return Math.cos(x2pi) * g2rad;
    }
    function gamma(alpha) {       // Marsaglia and Tsang (2000); boosted for alpha < 1
      if (alpha < 1) {
        var u0 = rnd();
        return gamma(alpha + 1) * Math.pow(u0 > 0 ? u0 : 1e-300, 1 / alpha);
      }
      var d = alpha - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        var x = gauss(), v = 1 + c * x;
        if (v <= 0) continue;
        v = v * v * v;
        var u = rnd();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u > 0 ? u : 1e-300) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    }
    function betavariate(a, b) {
      var y = gamma(a);
      if (y) return y / (y + gamma(b));
      return 0.0;
    }

    // ------------------------------------------------------------------------------------------
    // 2. MONTE CARLO OF THE ASSET POOL
    // ------------------------------------------------------------------------------------------
    function _inv(p) { return invCdf(Math.min(Math.max(p, 1e-9), 1 - 1e-9)); }

    function _cond_hazard(p_inv, rho, z, zero) {
      if (zero) return 0.0;
      var x = rho <= 0 ? p_inv : (p_inv + Math.sqrt(rho) * z) / Math.sqrt(1 - rho);
      var p = normCdf(x);
      if (p > 0.999999) p = 0.999999;
      return -Math.log(1 - p) / 12.0;
    }

    // Residual base curve rv_base[t] for t = 0..len-1, with the used-robot shift (see header).
    function residualBase(P, len) {
      var tau = P.tau, beta = P.beta, a0 = P._a0 || 0, sc = P._rv_scale || 1;
      var out = new Float64Array(len);
      for (var t = 0; t < len; t++) out[t] = sc * Math.exp(-Math.pow((a0 + t) / tau, beta));
      return out;
    }

    /*
     * simulate(P, n_paths, seed[, horizon]) -> sim object with flat typed arrays:
     *   noi[i*H1 + m], liq[i*H1 + m], fv[i*H1 + m]   (H1 = H + 2)
     *   dark[i] (dark_end month or 0), z[i], oem[i] (operator failure month or 0)
     */
    function simulate(P, n_paths, seed, horizon) {
      var N = P.tenor;
      var H = horizon || (N + P.fc_delay + 8);
      var H1 = H + 2;
      var n = P.n, cost = P.cost, F0 = P.fee, opex = P.opex;
      var nc = P.n_cust;
      var r_each = n / nc;
      var pd_zero = P.pd <= 0, can_zero = P.cancel <= 0, oem_zero = P.oem_haz <= 0;
      var pd_inv = !pd_zero ? _inv(P.pd) : 0.0;
      var can_inv = !can_zero ? _inv(P.cancel) : 0.0;
      var oem_inv = !oem_zero ? _inv(P.oem_haz) : 0.0;
      var lock_mult = 1 - P.lockout_eff;
      var rho_c = P.rho, rho_can = P.rho_cancel, rho_o = P.rho_oem;
      var rw = P.rho_wrong_way, rw2 = Math.sqrt(Math.max(0.0, 1 - rw * rw));
      var rp = P.rho_price, rp2 = Math.sqrt(Math.max(0.0, 1 - rp * rp));
      var rv_base = residualBase(P, H + 2);
      var rv_s = new Float64Array(H + 2), g_base = new Float64Array(H + 2), p_s = new Float64Array(H + 2);
      for (var t0 = 0; t0 < H + 2; t0++) {
        rv_s[t0] = P.rv_sd * Math.sqrt(Math.min(t0, 36) / 36.0);
        g_base[t0] = Math.exp(-P.g * t0 / 12.0);
        p_s[t0] = P.price_sd * Math.sqrt(t0 / 12.0);
      }
      var hair = P.hair, liq_cost = P.liq_cost;
      var sla = P.sla, sla_mult = P.sla_mult, up_mean = P.uptime, up_sd = P.uptime_sd;
      var util = P.util, usage = P.usage_share, opex_var = P.opex_var, util_sd = P.util_sd;
      var L = P.contract, renew = P.renew, churn = P.churn;
      var p_cont = P.p_cont, retain = P.retain, cont_opex = P.cont_opex, cont_rv = P.cont_rv,
        cont_leave = P.cont_leave, dark_rv = P.dark_rv;
      var conc = 6.0;
      var rd_frac = P.redeploy, rd_delay = P.rd_delay, rd_cost = P.rd_cost, rd_disc = P.rd_disc, idle_c = P.idle;
      var recov_m = P.recov_m, repo = P.repo, recovery = P.recovery;
      var arrears_m = P.arrears_m, term_fee_m = P.term_fee_m;
      var rvi = P.rvi, rvi_orphan = P.rvi_orphan, rvi_z = P.rvi_suspend_z;
      var rvi_floor = P.rvi_cover * (P.rvi_basis === 'fmv' ? 1.0 : hair);
      var inf = Infinity;
      var wind = 2;
      var ba = Math.max(retain, 1e-3) * conc, bb = Math.max(1 - retain, 1e-3) * conc;

      var noiA = new Float64Array(n_paths * H1), liqA = new Float64Array(n_paths * H1), fvA = new Float64Array(n_paths * H1);
      var darkA = new Int32Array(n_paths), zA = new Float64Array(n_paths), oemA = new Int32Array(n_paths);
      var rp_d = new Float64Array(H + 3), on_d = new Float64Array(H + 3), own_d = new Float64Array(H + 3);
      var other = new Float64Array(H + 2), rvp = new Float64Array(H + 2);
      var log = Math.log, exp = Math.exp;

      for (var i = 0; i < n_paths; i++) {
        rseed(seed + i * 7919);
        var z = gauss();
        var hd = _cond_hazard(pd_inv, rho_c, z, pd_zero) * lock_mult;
        var hc = _cond_hazard(can_inv, rho_can, z, can_zero);
        var ho = _cond_hazard(oem_inv, rho_o, z, oem_zero);
        var rwz = rw * z + rw2 * gauss();
        var pz = rp * z + rp2 * gauss();
        var To = inf;
        var draw_oem = rnd();
        if (ho > 0) To = -log(1 - draw_oem) / ho;
        var draw_cont = rnd();
        var ret_draw = betavariate(ba, bb);
        var To_i = To < H ? Math.floor(To) + 1 : 0;
        var cont = To_i > 0 && draw_cont < p_cont;
        var dark = To_i > 0 && !cont;
        var dark_end = dark ? Math.min(To_i + wind, H) : H;
        var rvMult = cont ? cont_rv : dark_rv;
        // rv(t) without the operator outcome; the outcome multiplier is applied where rv is used
        for (var tt = 0; tt < H + 2; tt++) {
          var s0 = rv_s[tt];
          rvp[tt] = rv_base[tt] * exp(-s0 * rwz - 0.5 * s0 * s0);
        }
        rp_d.fill(0); on_d.fill(0); own_d.fill(0); other.fill(0);
        var o = i * H1;
        own_d[1] += n;
        for (var c = 0; c < nc; c++) {
          var r = r_each;
          var t = 0, price = F0, cend = L;
          var left_checked = false;
          for (var seg = 0; seg < 12; seg++) {
            var Td = hd > 0 ? t + (-log(1 - rnd()) / hd) : inf;
            var Tc = hc > 0 ? t + (-log(1 - rnd()) / hc) : inf;
            if (cont && t < To_i && !left_checked) {
              left_checked = true;
              if (rnd() < cont_leave) Tc = Math.min(Tc, To_i);
            }
            var end = Td < Tc ? Td : Tc;
            if (cend < end) end = cend;
            if (dark_end < end) end = dark_end;
            var e = Math.floor(end); if (e > H) e = H;
            if (e > t) {
              var rr = r * price;
              rp_d[t + 1] += rr; rp_d[e + 1] -= rr;
              on_d[t + 1] += r; on_d[e + 1] -= r;
            }
            if (end >= dark_end) break;
            if (end === cend) {
              if (rnd() >= churn) {     // renews at market, never above the old price
                var sm = p_s[e];
                var mk = F0 * g_base[e] * exp(-sm * pz - 0.5 * sm * sm);
                if (mk < price) price = mk;
                cend = e + renew;
                t = e;
                continue;
              }
            } else if (Td < Tc) {       // customer default
              other[e] -= arrears_m * r * price;
              if (rnd() > recovery) {
                own_d[e + 1] -= r;
                break;
              }
              other[e] -= r * repo;
            } else {                    // contract cancelled
              other[e] += term_fee_m * r * price;
            }
            // robot is off contract: redeploy or sell
            var frac = rd_frac * ((cont && e >= To_i) ? 0.5 : 1.0);
            if (rnd() < frac) {
              other[e] -= r * rd_cost;
              t = e + rd_delay;
              if (t >= dark_end) break;
              var sm2 = p_s[t];
              var mk2 = F0 * g_base[t] * exp(-sm2 * pz - 0.5 * sm2 * sm2) * rd_disc;
              if (mk2 < price) price = mk2;
              cend = t + L;
              continue;
            }
            var s = e + recov_m;
            if (s <= H) {
              var v = cost * rvp[s] * ((To_i && s >= To_i) ? rvMult : 1) * hair;
              if (rvi && (rvi_orphan || !(To_i && s >= To_i && dark)) && z < rvi_z) {
                var fl = rvi_floor * cost * rv_base[s];
                if (fl > v) v = fl;
              }
              var net = v - liq_cost;
              if (net > 0) liqA[o + s] += r * net;
              own_d[s + 1] -= r;
            }
            break;
          }
        }
        // roll up
        var u0 = up_mean + up_sd * gauss();
        var util_path = Math.max(0.05, util - util_sd * z);
        var uratio = util > 0 ? Math.min(1.3, util_path / util) : 1.0;
        var rev_util = 1 - usage * (1 - uratio);
        var opx_util = 1 - opex_var * (1 - uratio);
        var rate = 0.0, on = 0.0, own = 0.0;
        var u = u0;
        for (var m = 1; m < H + 2; m++) {
          if (m % 6 === 1) u = Math.min(0.999, u0 + 0.5 * up_sd * gauss());
          rate += rp_d[m];
          on += on_d[m];
          own += own_d[m];
          var gap = sla - u;
          if (gap < 0) gap = 0.0;
          var uf = (1 - sla_mult * gap) * rev_util;
          var of = (1 + 2 * gap) * opx_util;
          if (To_i && m >= To_i) {
            if (cont) { uf *= ret_draw; of *= cont_opex; } else uf *= ret_draw * 0.5;
          }
          noiA[o + m] = rate * uf - on * opex * of - (own - on) * idle_c + other[m];
          if (own > 1e-9) {
            var v2 = cost * rvp[m] * ((To_i && m >= To_i) ? rvMult : 1) * hair;
            if (rvi && (rvi_orphan || !(To_i && m >= To_i && dark)) && z < rvi_z) {
              var fl2 = rvi_floor * cost * rv_base[m];
              if (fl2 > v2) v2 = fl2;
            }
            var nv = v2 - liq_cost;
            fvA[o + m] = own * (nv > 0 ? nv : 0.0);
          }
        }
        darkA[i] = dark ? dark_end : 0;
        zA[i] = z;
        oemA[i] = To_i;
      }
      return { n: n_paths, H: H, H1: H1, noi: noiA, liq: liqA, fv: fvA, dark: darkA, z: zA, oem: oemA };
    }

    // ------------------------------------------------------------------------------------------
    // 3. THE LOAN: waterfall on one path (no refinancing at maturity)
    // ------------------------------------------------------------------------------------------
    function loan_terms(P, advance, coupon) {
      var N = P.tenor;
      var principal = advance * P.cost * P.n;
      var r = coupon / 12.0;
      var v = Math.pow(1 + r, -N);
      var pmt = principal * (1 - P.balloon * v) * r / (1 - v);
      return { N: N, principal: principal, r: r, pmt: pmt };
    }

    function loanCtx(P, advance, coupon) {
      var lt = loan_terms(P, advance, coupon);
      lt.net = lt.r - P.skim / 12.0 - (P.rvi ? P.rvi_bp / 12.0 : 0.0);
      lt.keep = lt.net / lt.r;
      lt.srv = P.srv / 12.0;
      lt.sweep = P.sweep;
      lt.delay = P.fc_delay;
      lt.size = lt.N + lt.delay + 2;
      lt.enforce = P.enforce_fixed + P.enforce_pct * lt.principal;
      lt.dsra_m = P.dsra_m;
      return lt;
    }

    // Writes the lender's cash flow into cf (length lt.size). Returns ploss, sets RES.econ/RES.fc.
    var RES = { ploss: 0, econ: 0, fc: false };
    function run_loan(sim, i, lt, cf) {
      var o = i * sim.H1, noi = sim.noi, liq = sim.liq, fv = sim.fv, dark = sim.dark[i];
      var N = lt.N, principal = lt.principal, r = lt.r, pmt = lt.pmt, keep = lt.keep, srv = lt.srv;
      var sweep = lt.sweep, delay = lt.delay, size = lt.size;
      for (var k = 0; k < size; k++) cf[k] = 0.0;
      var bal = principal;
      var dsra = lt.dsra_m * pmt;
      var arrears = 0;
      var c1 = 0, c2 = 0, h1 = false, h2 = false;
      var foreclose_at = -1;
      for (var m = 1; m <= N; m++) {
        var cash = noi[o + m] - bal * srv;
        if (cash < 0) cash = 0.0;
        var intr = bal * r;
        var sched = pmt - intr;
        if (sched < 0) sched = 0.0;
        if (sched > bal) sched = bal;
        var need = intr + sched;
        var pay = cash < need ? cash : need;
        var shortv = need - pay;
        if (shortv > 0 && dsra > 0) {
          var d = dsra < shortv ? dsra : shortv;
          dsra -= d; pay += d; shortv -= d;
        }
        var int_paid = pay < intr ? pay : intr;
        var princ = pay - int_paid;
        var tr = cash, cnt = 1;
        if (h1) { tr += c1; cnt += 1; }
        if (h2) { tr += c2; cnt += 1; }
        c2 = c1; h2 = h1; c1 = cash; h1 = true;
        var excess = cash - (cash < need ? cash : need);
        if (excess > 0 && need > 0 && tr / (cnt * need) < sweep) princ += excess;
        princ += liq[o + m];
        var bal_new = bal + (intr - int_paid);
        if (princ > bal_new) princ = bal_new;
        bal = bal_new - princ;
        cf[m] += int_paid * keep + princ;
        if (bal < 1.0) { bal = 0.0; break; }
        arrears = shortv > 1.0 ? arrears + 1 : 0;
        if ((dark && m >= dark) || (arrears >= 3 && cash < 0.25 * need)) { foreclose_at = m; break; }
      }
      var foreclosed = false;
      if (bal > 0) {
        var at = foreclose_at >= 0 ? foreclose_at : N;
        foreclosed = true;
        var idx = Math.min(at + delay, sim.H1 - 1);
        var proceeds = fv[o + idx] + dsra - lt.enforce;
        if (proceeds > 0) {
          var p2 = proceeds < bal ? proceeds : bal;
          cf[Math.min(at + delay, N + delay + 1)] += p2;
          bal -= p2;
        }
      }
      var ploss = bal / principal;
      var econ = 0.0;
      if (ploss > 0) {
        var dd = 1 + lt.net, pv = 0.0, f = 1.0;
        for (var x = 0; x < size; x++) { f /= dd; pv += cf[x] * f; }
        pv *= dd;
        econ = Math.max(0.0, 1 - pv / principal);
      }
      RES.ploss = ploss; RES.econ = econ; RES.fc = foreclosed;
      return ploss;
    }

    // Effective annual IRR of a monthly series with cf[0] < 0. Safeguarded Newton then bisection.
    function irr_annual(cf, len, guess) {
      if (len === undefined) len = cf.length;
      function npv(r) {
        var v = 0.0, f = 1.0, q = 1 / (1 + r);
        for (var k = 0; k < len; k++) { v += cf[k] * f; f *= q; }
        return v;
      }
      var r = guess === undefined ? 0.01 : guess;
      for (var it = 0; it < 25; it++) {
        var v = 0.0, d = 0.0, f = 1.0, q = 1 / (1 + r);
        for (var k = 0; k < len; k++) { v += cf[k] * f; d -= k * cf[k] * f * q; f *= q; }
        if (Math.abs(v) < 1e-7 * Math.abs(cf[0])) return Math.pow(1 + r, 12) - 1;
        if (d === 0) break;
        var nr = r - v / d;
        if (nr <= -0.5 || nr > 2) break;
        r = nr;
      }
      var a = -0.5, b = 2.0;
      var fa = npv(a), fb = npv(b);
      if (fa * fb > 0) {
        var sum = 0; for (var s = 0; s < len; s++) sum += cf[s];
        return sum < 0 ? -1.0 : NaN;
      }
      for (var j = 0; j < 80; j++) {
        var mid = (a + b) / 2, fm = npv(mid);
        if (fa * fm <= 0) { b = mid; fb = fm; } else { a = mid; fa = fm; }
      }
      return Math.pow(1 + (a + b) / 2, 12) - 1;
    }

    function pct(sorted, q) {
      if (!sorted.length) return NaN;
      return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    }

    function wal_years(P, advance, coupon) {
      var lt = loan_terms(P, advance, coupon);
      var bal = lt.principal, tot = 0.0;
      for (var m = 1; m <= lt.N; m++) {
        var pr = Math.min(bal, lt.pmt - bal * lt.r);
        tot += m * pr;
        bal -= pr;
      }
      return tot / lt.principal / 12.0;
    }

    // Distribution of lender outcomes. opts.full: per-path IRRs and tail stats. opts.econs: keep losses.
    function evaluate(sim, P, advance, coupon, full, keepEcons) {
      var lt = loanCtx(P, advance, coupon);
      var size = lt.size;
      var mean_cf = new Float64Array(size);
      var cf = new Float64Array(size);
      var n = sim.n;
      var econs = new Float64Array(n);
      var plosses = full ? new Float64Array(n) : null;
      var irrs = full ? [] : null;
      var sumE = 0, sumP = 0, nLoss = 0, nFc = 0;
      var clean_irr = Math.pow(1 + lt.r - P.skim / 12 - (P.rvi ? P.rvi_bp / 12 : 0), 12) - 1;
      var series = full ? new Float64Array(size) : null;
      for (var i = 0; i < n; i++) {
        var pl = run_loan(sim, i, lt, cf);
        for (var k = 0; k < size; k++) mean_cf[k] += cf[k];
        econs[i] = RES.econ;
        sumE += RES.econ; sumP += pl;
        if (pl > 0) nLoss++;
        if (RES.fc) nFc++;
        if (full) {
          plosses[i] = pl;
          if (pl > 0) {
            series.set(cf); series[0] = -lt.principal;
            irrs.push(irr_annual(series, size));
          } else irrs.push(clean_irr);
        }
      }
      for (var k2 = 0; k2 < size; k2++) mean_cf[k2] /= n;
      mean_cf[0] = -lt.principal;
      var out = {
        eirr: irr_annual(mean_cf, size), el: sumE / n, ploss: sumP / n, p_loss: nLoss / n, p_fc: nFc / n,
        wal: wal_years(P, advance, coupon)
      };
      if (full) {
        var sp = Array.prototype.slice.call(plosses).sort(numSort);
        var se = Array.prototype.slice.call(econs).sort(numSort);
        var si = irrs.filter(isFinite).sort(numSort);
        out.pl95 = pct(sp, 0.95); out.pl99 = pct(sp, 0.99); out.el95 = pct(se, 0.95); out.el99 = pct(se, 0.99);
        var si_sum = 0; for (var q = 0; q < si.length; q++) si_sum += si[q];
        out.irr_mean = si.length ? si_sum / si.length : NaN;
        out.irr_p50 = pct(si, 0.5); out.irr_p10 = pct(si, 0.10); out.irr_p5 = pct(si, 0.05); out.irr_p1 = pct(si, 0.01);
        var mu = out.el, ss = 0; for (var w = 0; w < n; w++) ss += (econs[w] - mu) * (econs[w] - mu);
        out.el_se = Math.sqrt(ss / n) / Math.sqrt(n);
      }
      if (keepEcons) out.econs = econs;
      return out;
    }
    function numSort(a, b) { return a - b; }

    function base_noi(P) {
      var gap = Math.max(0.0, P.sla - P.uptime);
      return P.fee * (1 - P.sla_mult * gap) - P.opex * (1 + 2 * gap);
    }
    function base_dscr(P, advance, coupon) {
      var lt = loan_terms(P, advance, coupon);
      return (base_noi(P) * P.n - lt.principal * P.srv / 12) / lt.pmt;
    }
    function dscr_sized_advance(P, coupon, dscr) {
      if (dscr === undefined) dscr = 1.25;
      var N = P.tenor, r = coupon / 12.0;
      var annuity = (1 - Math.pow(1 + r, -N)) / r;
      return Math.max(0.0, base_noi(P) / dscr * annuity / P.cost);
    }

    // Lowest coupon whose expected IRR hits target. Evaluated lazily along the grid (same answer as
    // Python, which scans the full grid and returns at the first coupon that clears).
    function required_coupon(sim, P, advance, target, grid_results) {
      var prev = null;
      for (var g = 0; g < COUPON_GRID.length; g++) {
        var c = COUPON_GRID[g];
        var e = grid_results ? grid_results[g][1] : evaluate(sim, P, advance, c, false).eirr;
        if (e >= target) {
          if (prev === null) return c;
          var c0 = prev[0], e0 = prev[1];
          return e > e0 ? c0 + (target - e0) / (e - e0) * (c - c0) : c;
        }
        prev = [c, e];
      }
      return null;
    }

    // ------------------------------------------------------------------------------------------
    // 4. PAGE API
    // ------------------------------------------------------------------------------------------
    var PAGE_TYPES = ['PALLET', 'AMR', 'PICK', 'CLEAN'];

    function num(x, d) { x = +x; return isFinite(x) ? x : d; }
    function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

    // Input clamps. Returns a clean input object and a list of notes for anything that was changed.
    function clampInput(inp) {
      inp = inp || {};
      var notes = [];
      var type = TYPES[inp.type] ? String(inp.type) : 'PALLET';
      if (type !== inp.type && inp.type !== undefined) notes.push('unknown type, used PALLET');
      var tier = TIERS[inp.tier] ? String(inp.tier) : 'MID';
      if (tier !== inp.tier && inp.tier !== undefined) notes.push('unknown tier, used MID');
      var T = TYPES[type];
      function c(name, v, lo, hi) {
        var y = clamp(v, lo, hi);
        if (y !== v) notes.push(name + ' clamped to ' + Math.round(y * 1e4) / 1e4);
        return y;
      }
      ['cost', 'fee', 'ageMonths', 'advance', 'term', 'paths', 'coupon'].forEach(function (k) {
        if (inp[k] !== undefined && inp[k] !== null && inp[k] !== '' && !isFinite(+inp[k])) notes.push(k + ' not a number, used default');
      });
      var cost = c('cost', num(inp.cost, T.cost), 1000, 5e6);
      var fee = c('fee', num(inp.fee, T.fee), 1, cost);
      var mvIn = inp.marketValue;
      var hasMv = mvIn !== undefined && mvIn !== null && mvIn !== '' && isFinite(+mvIn);
      var marketValue = hasMv ? c('marketValue', +mvIn, 0.005 * cost, 4 * cost) : null;
      var ageMonths = c('ageMonths', num(inp.ageMonths, 0), 0, 600);
      var advance = c('advance', num(inp.advance, 0.70), 0.05, 1.0);
      var term = Math.round(c('term', num(inp.term, T.tenor), 12, 84));
      var paths = Math.round(c('paths', num(inp.paths, 2000), 200, 50000));
      var coupon = c('coupon', num(inp.coupon, 0.12), 0.01, 0.40);
      // loanBasis 'cost' (default, spec 5.2): loan = advance x price paid. 'market': loan = advance x
      // marketValue, for a used robot financed against what it is worth today. The engine itself always
      // works in fractions of cost, so the market basis is converted with basisRatio = marketValue / cost.
      var basis = inp.loanBasis === 'market' && marketValue !== null ? 'market' : 'cost';
      if (inp.loanBasis === 'market' && basis !== 'market') notes.push('loanBasis market needs marketValue, used cost');
      var basisRatio = basis === 'market' ? marketValue / cost : 1;
      var seed = inp.seed === undefined || inp.seed === null || !isFinite(+inp.seed) ?
        stable_seed(type, tier) : (Math.abs(Math.floor(+inp.seed)) % 1000000007);
      return {
        id: inp.id, type: type, tier: tier, cost: cost, fee: fee, marketValue: marketValue, ageMonths: ageMonths,
        advance: advance, term: term, paths: paths, coupon: coupon, seed: seed, backup: !!inp.backup,
        loanBasis: basis, basisRatio: basisRatio, advCost: advance * basisRatio,
        notes: notes
      };
    }

    // Parameters for a page input: type and tier tables, then cost scaling, fee, tenor, used-robot shift.
    function pageParams(I, over) {
      var P = make_params(I.type, I.tier);
      var k = I.cost / TYPES[I.type].cost;
      for (var j = 0; j < COST_SCALED.length; j++) P[COST_SCALED[j]] = P[COST_SCALED[j]] * k;
      P.cost = I.cost;
      P.fee = I.fee;
      P.tenor = I.term;
      // used-robot shift of the residual curve (see header)
      var a0 = 0, scale = 1;
      if (I.marketValue !== null) {
        var ratio = I.marketValue / I.cost;
        if (ratio >= 1) scale = ratio;
        else a0 = P.tau * Math.pow(-Math.log(ratio), 1 / P.beta);
      } else {
        a0 = I.ageMonths;
      }
      P._a0 = Math.min(a0, 1200);
      P._rv_scale = scale;
      if (over) assign(P, over);
      return P;
    }

    function finiteOrNull(x) { return (typeof x === 'number' && isFinite(x)) ? x : null; }

    function lossHist(econs) {
      var bins = new Array(20);
      for (var b = 0; b < 20; b++) bins[b] = 0;
      var n = econs.length;
      for (var i = 0; i < n; i++) {
        var x = econs[i];
        var k = Math.floor(clamp(x, 0, 1) * 20);
        if (k > 19) k = 19;
        bins[k] += 1;
      }
      for (var j = 0; j < 20; j++) bins[j] /= n;
      return bins;
    }

    function scenario(sim, P, I, hurdle) {
      var ref = evaluate(sim, P, I.advCost, I.coupon, true, true);
      var req = required_coupon(sim, P, I.advCost, hurdle);
      var offerCoupon = req === null ? I.coupon : req;
      var lt = loan_terms(P, I.advCost, offerCoupon);
      // largest advance at 1.25x coverage, in the loan basis, capped at 100% (raw value kept for reference)
      var maxAdvRaw = dscr_sized_advance(P, offerCoupon) / I.basisRatio;
      return {
        el: ref.el, el95: ref.el95, el99: ref.el99, el_se: ref.el_se,
        p_any_loss: ref.p_loss, p_foreclose: ref.p_fc,
        eirr: finiteOrNull(ref.eirr), irr_p10: finiteOrNull(ref.irr_p10), irr_p50: finiteOrNull(ref.irr_p50),
        loss_hist: lossHist(ref.econs),
        coupon_needed: req,
        offer_coupon: offerCoupon,
        dscr: finiteOrNull(base_dscr(P, I.advCost, offerCoupon + P.srv)),
        max_advance_125: Math.min(1, maxAdvRaw),
        max_advance_125_raw: maxAdvRaw,
        payment_per_robot: lt.pmt / P.n,
        wal: ref.wal
      };
    }

    /*
     * run(input) -> output (spec 5.2). All rates are fractions. Money is per robot unless named.
     *   el, el_backup                    cumulative expected economic loss over the loan, at input.coupon (default 12%)
     *   coupon_needed(_backup)           lowest coupon earning the tier hurdle (IG 9%, MID 12%, STARTUP 15%); null if none <= 31%
     *   dscr(_backup)                    underwriting debt service coverage at the offer coupon plus servicing
     *   max_advance_125(_backup)         largest advance at 1.25x coverage and the offer coupon, as a fraction of the
 *                                    loan basis (price paid, or marketValue with loanBasis 'market'), capped at 1
     *   irr_p10, irr_p50, loss_hist      for the scenario chosen by input.backup (false: all risks, true: operator failure off)
     *   drivers                          shares of all-risks expected loss: operator, customer, residual (sum 1)
     *   balance                          scheduled loan balance per robot, months 0..term, at the offer coupon
     *   resale                           fair market value per robot, months 0..term+36: p10, p50, p90, forced_p50
     */
    function run(input) {
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      var I = clampInput(input);
      var hurdle = TIERS[I.tier].hurdle;
      var P = pageParams(I);
      var Pb = pageParams(I, { oem_haz: 0.0 });

      var simA = simulate(P, I.paths, I.seed);
      var simB = simulate(Pb, I.paths, I.seed);
      var A = scenario(simA, P, I, hurdle);
      var B = scenario(simB, Pb, I, hurdle);
      // driver attribution: 3-way Shapley over operator failure (O), customer default and cancellation
      // (C) and resale value uncertainty (V, rv_sd), on common random numbers. Bit set = risk on.
      var elByMask = new Array(8);
      elByMask[7] = A.el; elByMask[6] = B.el;
      for (var mask = 0; mask < 6; mask++) {
        var ov = {};
        if (!(mask & 1)) ov.oem_haz = 0.0;
        if (!(mask & 2)) { ov.pd = 0.0; ov.cancel = 0.0; }
        if (!(mask & 4)) ov.rv_sd = 0.0;
        var Pm = pageParams(I, ov);
        elByMask[mask] = evaluate(simulate(Pm, I.paths, I.seed), Pm, I.advCost, I.coupon, false).el;
      }
      function shap(bit) {
        var w = [1 / 3, 1 / 6, 1 / 3], acc = 0;
        for (var S = 0; S < 8; S++) {
          if (S & bit) continue;
          var k = ((S & 1) ? 1 : 0) + ((S & 2) ? 1 : 0) + ((S & 4) ? 1 : 0);
          acc += w[k] * (elByMask[S | bit] - elByMask[S]);
        }
        return acc;
      }
      var elA = A.el, elB = B.el;
      var opC = Math.max(0, shap(1));
      var cuC = Math.max(0, shap(2));
      var resid = Math.max(0, shap(4) + elByMask[0]);   // resale uncertainty plus what is left with all three off
      var tot = opC + cuC + resid;
      var drivers = tot > 1e-9 ? { operator: opC / tot, customer: cuC / tot, residual: resid / tot } :
        { operator: 0, customer: 0, residual: 0 };

      // scheduled balance per robot at the all-risks offer coupon
      var lt = loan_terms(P, I.advCost, A.offer_coupon);
      var balance = [], bal = lt.principal / P.n, pmt = lt.pmt / P.n;
      balance.push(bal);
      for (var m = 1; m <= lt.N; m++) {
        var pr = Math.min(bal, pmt - bal * lt.r);
        bal = Math.max(0, bal - pr);
        balance.push(bal < 0.005 ? 0 : bal);
      }
      // resale band: analytic quantiles of the lognormal residual shock (rwz is standard normal)
      var M = I.term + 36, base = residualBase(P, M + 1), z90 = 1.2815515655446004;
      var r10 = [], r50 = [], r90 = [], f50 = [];
      for (var t = 0; t <= M; t++) {
        var s = P.rv_sd * Math.sqrt(Math.min(t, 36) / 36.0), v = P.cost * base[t], adj = Math.exp(-0.5 * s * s);
        r10.push(v * Math.exp(-s * z90) * adj);
        r50.push(v * adj);
        r90.push(v * Math.exp(s * z90) * adj);
        f50.push(Math.max(0, v * adj * P.hair - P.liq_cost));
      }
      var view = I.backup ? B : A;
      var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      return {
        id: I.id,
        el: elA, el_backup: elB,
        coupon_needed: A.coupon_needed, coupon_needed_backup: B.coupon_needed,
        dscr: A.dscr, dscr_backup: B.dscr,
        max_advance_125: A.max_advance_125, max_advance_125_backup: B.max_advance_125,
        irr_p10: view.irr_p10, irr_p50: view.irr_p50, loss_hist: view.loss_hist, p_any_loss: view.p_any_loss,
        drivers: drivers,
        drivers_el: { all: elA, operator_off: elB, customer_off: elByMask[5], resale_uncertainty_off: elByMask[3], all_three_off: elByMask[0] },
        balance: balance,
        resale: { p10: r10, p50: r50, p90: r90, forced_p50: f50 },
        scenarios: { all: A, backup: B },
        meta: {
          type: I.type, tier: I.tier, hurdle: hurdle, coupon_ref: I.coupon, advance: I.advance, term: I.term,
          paths: I.paths, seed: I.seed, cohort: P.n, customers_per_cohort: P.n_cust,
          cost: P.cost, fee: P.fee, opex: P.opex, base_noi: base_noi(P),
          principal_per_robot: lt.principal / P.n, payment_per_robot: lt.pmt / P.n,
          market_value: I.marketValue, effective_age_months: P._a0, rv_scale: P._rv_scale,
          loan_basis: I.loanBasis, advance_of_cost: I.advCost,
          ltv_market: I.marketValue ? I.advCost * I.cost / I.marketValue : null,
          forced_sale_share: P.hair, oem_haz: TYPES[I.type].oem_haz, pd: TIERS[I.tier].pd,
          notes: I.notes, ms: Math.round(t1 - t0)
        }
      };
    }

    // ------------------------------------------------------------------------------------------
    // Input tags, from the engine's own source comments. Classes: data ([data], [calc]),
    // claim ([self] company claim), estimate ([weak], [est], [unverified]), assumption.
    // ------------------------------------------------------------------------------------------
    var TAG_CLASS = { data: 'data', calc: 'data', self: 'claim', weak: 'estimate', est: 'estimate', unverified: 'estimate', assumption: 'assumption' };
    var TYPE_TAGS = {
      PALLET: { cost: 'weak', fee: 'self', uptime: 'self', sla: 'self', churn: 'self' },
      AMR: { cost: 'est', fee: 'unverified', contract: 'self' },
      PICK: { cost: 'self', fee: 'est', contract: 'data' },
      CLEAN: { cost: 'data', fee: 'data' }
    };
    var KEY_INPUTS = [
      ['cost', 'Price of the robot installed'], ['fee', 'Monthly rent per robot'], ['opex', 'Running cost per robot-month'],
      ['uptime', 'Uptime'], ['sla', 'Uptime promised to the customer'], ['contract', 'Contract length'],
      ['cancel', 'Cancellations per year'], ['churn', 'Customers who do not renew'],
      ['oem_haz', 'Operator failure per year'], ['p_cont', 'Chance a successor keeps the fleet running'],
      ['tau', 'Resale curve timescale'], ['beta', 'Resale curve shape'], ['rv_sd', 'Resale value uncertainty'],
      ['hair', 'Forced sale share of market value'], ['g', 'Rent decline per year'], ['redeploy', 'Share of returned robots redeployed'],
      ['pd', 'Customer default per year'], ['rho', 'Customer link to the economy']
    ];
    function inputTags(type, tier, userSet) {
      type = TYPES[type] ? type : 'PALLET';
      tier = TIERS[tier] ? tier : 'MID';
      var P = make_params(type, tier), tt = TYPE_TAGS[type] || {}, rows = [], counts = { data: 0, claim: 0, estimate: 0, assumption: 0, user: 0 };
      for (var i = 0; i < KEY_INPUTS.length; i++) {
        var key = KEY_INPUTS[i][0];
        var tag = (userSet && userSet[key]) ? 'user' : (tt[key] || 'assumption');
        var cls = tag === 'user' ? 'user' : TAG_CLASS[tag];
        counts[cls] += 1;
        rows.push({ key: key, label: KEY_INPUTS[i][1], value: P[key], tag: tag, cls: cls });
      }
      return { rows: rows, counts: counts, total: rows.length, src: TYPES[type].src };
    }

    return {
      version: 'ferra-engine-js 1.0 (port of robot_pricing_engine.py v2, 2026-10-30)',
      run: run,
      inputTags: inputTags,
      clampInput: clampInput,
      // internals, exported for the parity test and for anyone who wants the raw engine
      GLOBAL: GLOBAL, TIERS: TIERS, TYPES: TYPES, HOH: HOH, EL_CAP: EL_CAP, COUPON_GRID: COUPON_GRID,
      PAGE_TYPES: PAGE_TYPES,
      make_params: make_params, simulate: simulate, loan_terms: loan_terms, run_loan: run_loan,
      evaluate: evaluate, required_coupon: required_coupon, irr_annual: irr_annual, wal_years: wal_years,
      base_noi: base_noi, base_dscr: base_dscr, dscr_sized_advance: dscr_sized_advance,
      stable_seed: stable_seed, crc32: crc32, invCdf: invCdf, normCdf: normCdf, pageParams: pageParams
    };
  }

  var api = factory();

  function onMessageSrc() {
    return 'self.onmessage=function(e){var d=e.data||{};var out;' +
      'try{out=FerraEngine.run(d);}catch(err){out={error:String(err&&err.message||err)};}' +
      'out.id=d.id;self.postMessage(out);};';
  }
  // Self-contained worker source: works from a Blob URL, so the page also runs from file://.
  api.workerSource = function () {
    return '"use strict";var FerraEngine=(' + factory.toString() + ')();\n' + onMessageSrc();
  };

  var isWorker = typeof importScripts === 'function' && typeof window === 'undefined' &&
    typeof self !== 'undefined' && typeof self.postMessage === 'function';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.FerraEngine = api;
    if (isWorker) {
      self.onmessage = function (e) {
        var d = e.data || {}, out;
        try { out = api.run(d); } catch (err) { out = { error: String(err && err.message || err) }; }
        out.id = d.id;
        self.postMessage(out);
      };
    }
  }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this));
