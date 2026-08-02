/* ============================================================
   SITE GATE — passcode lock for a private, pre-launch site.
   Only someone with the passcode below can view the site.
   NOTE: this is a soft (client-side) gate — it hides the UI but
   the page source is still technically downloadable. For real
   privacy, use Netlify password protection / access control.
   Change PASS to your own secret. Remove this <script> to open
   the site to everyone.
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'statc_gate_ok';
  var PASS = 'trackfan';   // ← change this to your own passcode

  function ok() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }

  // Hide all content until authorized (applied before <body> paints).
  var st = document.createElement('style');
  st.textContent =
    'body{visibility:hidden}body.gate-ok{visibility:visible}' +
    '#site-gate{visibility:visible!important;position:fixed;inset:0;z-index:2147483000;' +
    'display:flex;align-items:center;justify-content:center;background:#111;' +
    'font-family:"Lota Grotesque",system-ui,-apple-system,sans-serif}';
  (document.head || document.documentElement).appendChild(st);

  function unlock() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    document.body.classList.add('gate-ok');
    var g = document.getElementById('site-gate'); if (g) g.parentNode.removeChild(g);
  }

  function showGate() {
    var g = document.createElement('div');
    g.id = 'site-gate';
    g.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:36px 32px;max-width:360px;width:90%;' +
      'text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.55)">' +
        '<div style="font-weight:800;font-size:26px;letter-spacing:-.02em;color:#111;margin-bottom:6px">StatTC</div>' +
        '<div style="font-size:13px;color:#8A8F98;margin-bottom:22px">Private preview — enter the passcode to continue.</div>' +
        '<input id="site-gate-pw" type="password" placeholder="Passcode" autocomplete="off" ' +
        'style="width:100%;height:44px;padding:0 14px;border:1px solid #ddd;border-radius:10px;font-size:15px;box-sizing:border-box;margin-bottom:10px;outline:none">' +
        '<button id="site-gate-go" style="width:100%;height:44px;border:none;border-radius:10px;background:#FF5200;color:#fff;font-size:15px;font-weight:700;cursor:pointer">Enter</button>' +
        '<div id="site-gate-err" style="color:#DC2626;font-size:12px;margin-top:8px;min-height:14px"></div>' +
      '</div>';
    document.body.appendChild(g);
    var inp = g.querySelector('#site-gate-pw'), btn = g.querySelector('#site-gate-go'), err = g.querySelector('#site-gate-err');
    function tryPw() {
      if (inp.value === PASS) unlock();
      else { err.textContent = 'Incorrect passcode'; inp.value = ''; inp.focus(); }
    }
    btn.addEventListener('click', tryPw);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryPw(); });
    setTimeout(function () { inp.focus(); }, 60);
  }

  function init() {
    if (ok()) { document.body.classList.add('gate-ok'); return; }
    showGate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
