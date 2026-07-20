/* ============================================================
   STUDIO — in-browser customization panel.
   Lets the owner recolor the theme and reorder/hide the homepage
   boxes. Changes persist in localStorage; Export writes a JSON
   config you can commit for permanence (no backend required).
   Open with the ✎ button (bottom-left) or press Shift+S.
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'statc_studio';

  // Theme fields → the CSS custom properties they drive.
  var THEME_FIELDS = [
    { id: 'accent', label: 'Accent (orange)', vars: ['--orange', '--brand', '--accent'], def: '#FF5200' },
    { id: 'accentHover', label: 'Accent hover', vars: ['--orange-hover'], def: '#E04600' },
    { id: 'pageBg', label: 'Page background', vars: ['--page-bg', '--bg-light'], def: '#F5F6F8' },
    { id: 'text', label: 'Text', vars: ['--text'], def: '#111111' },
    { id: 'muted', label: 'Muted text', vars: ['--muted'], def: '#6B7078' },
    { id: 'border', label: 'Card border', vars: ['--border', '--divider'], def: '#ECECEC' }
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(window.STUDIO)); }

  // Make the config available synchronously (before buildHome runs).
  window.STUDIO = load();
  if (!window.STUDIO.theme) window.STUDIO.theme = {};

  function applyTheme() {
    var root = document.documentElement;
    THEME_FIELDS.forEach(function (f) {
      var v = window.STUDIO.theme[f.id];
      f.vars.forEach(function (cssVar) {
        if (v) root.style.setProperty(cssVar, v);
        else root.style.removeProperty(cssVar);
      });
    });
  }
  applyTheme(); // apply immediately on every page

  // ---- UI (built after DOM is ready) ---------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function build() {
    if (document.getElementById('studio-fab')) return;

    var fab = el('button', 'studio-fab', '✎');
    fab.id = 'studio-fab';
    fab.title = 'Customize (Studio)';
    fab.setAttribute('aria-label', 'Open Studio');
    document.body.appendChild(fab);

    var panel = el('div', 'studio-panel');
    panel.id = 'studio-panel';
    panel.innerHTML =
      '<div class="studio-hd"><span>Studio</span><button class="studio-x" aria-label="Close">✕</button></div>' +
      '<div class="studio-tabs">' +
        '<button class="studio-tab active" data-tab="theme">Theme</button>' +
        '<button class="studio-tab" data-tab="layout">Layout</button>' +
        '<button class="studio-tab" data-tab="data">Save / Load</button>' +
      '</div>' +
      '<div class="studio-body" id="studio-body"></div>';
    document.body.appendChild(panel);

    var open = false;
    function toggle(v) {
      open = v == null ? !open : v;
      panel.classList.toggle('open', open);
      fab.classList.toggle('active', open);
      if (open) renderTab(activeTab);
    }
    fab.addEventListener('click', function () { toggle(); });
    panel.querySelector('.studio-x').addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) {
      if (e.shiftKey && (e.key === 'S' || e.key === 's') && !/input|textarea/i.test((e.target.tagName || ''))) toggle();
    });

    var activeTab = 'theme';
    panel.querySelectorAll('.studio-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        activeTab = t.dataset.tab;
        panel.querySelectorAll('.studio-tab').forEach(function (x) { x.classList.toggle('active', x === t); });
        renderTab(activeTab);
      });
    });

    var body = panel.querySelector('#studio-body');

    function renderTab(tab) {
      if (tab === 'theme') return renderTheme(body);
      if (tab === 'layout') return renderLayout(body);
      return renderData(body);
    }

    // ---- Theme tab ----
    function renderTheme(host) {
      host.innerHTML = '<p class="studio-note">Recolor the whole site. Applies to every page.</p>';
      THEME_FIELDS.forEach(function (f) {
        var row = el('label', 'studio-row');
        var val = window.STUDIO.theme[f.id] || f.def;
        row.innerHTML = '<span>' + f.label + '</span>';
        var color = el('input', 'studio-color');
        color.type = 'color'; color.value = /^#[0-9a-f]{6}$/i.test(val) ? val : f.def;
        var hex = el('input', 'studio-hex');
        hex.type = 'text'; hex.value = val;
        function set(v) {
          window.STUDIO.theme[f.id] = v; save(); applyTheme();
          if (/^#[0-9a-f]{6}$/i.test(v)) color.value = v;
        }
        color.addEventListener('input', function () { hex.value = color.value; set(color.value); });
        hex.addEventListener('change', function () { set(hex.value.trim()); });
        var wrap = el('span', 'studio-color-wrap');
        wrap.appendChild(color); wrap.appendChild(hex);
        row.appendChild(wrap);
        host.appendChild(row);
      });
      var reset = el('button', 'studio-btn studio-btn--ghost', 'Reset colors');
      reset.addEventListener('click', function () { window.STUDIO.theme = {}; save(); applyTheme(); renderTheme(host); });
      host.appendChild(reset);
    }

    // ---- Layout tab ----
    function renderLayout(host) {
      if (document.body.dataset.page !== 'home') {
        host.innerHTML = '<p class="studio-note">Open the <a href="index.html">home page</a> to rearrange its boxes.</p>';
        return;
      }
      var meta = window.SF_SECTION_META || {};
      var L = window.STUDIO.layout || { left: ['nextMeet', 'meets', 'barrier', 'promos'], right: ['hero', 'leaders', 'tools'], hidden: [] };
      window.STUDIO.layout = L; if (!L.hidden) L.hidden = [];

      host.innerHTML = '<p class="studio-note">Move boxes up/down, hide them, or send them to the other column.</p>';

      function col(name, key, other) {
        var box = el('div', 'studio-col');
        box.appendChild(el('div', 'studio-col-hd', name));
        L[key].forEach(function (id, i) {
          var hiddenNow = L.hidden.indexOf(id) >= 0;
          var item = el('div', 'studio-item' + (hiddenNow ? ' is-hidden' : ''));
          item.innerHTML = '<span class="studio-item-lbl">' + (meta[id] || id) + '</span>';
          var ctr = el('span', 'studio-item-ctrl');
          ctr.innerHTML =
            '<button title="Up" data-a="up">↑</button>' +
            '<button title="Down" data-a="down">↓</button>' +
            '<button title="Move column" data-a="move">⇄</button>' +
            '<button title="' + (hiddenNow ? 'Show' : 'Hide') + '" data-a="hide">' + (hiddenNow ? '◍' : '○') + '</button>';
          ctr.querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
              var a = b.dataset.a;
              if (a === 'up' && i > 0) { L[key].splice(i, 1); L[key].splice(i - 1, 0, id); }
              else if (a === 'down' && i < L[key].length - 1) { L[key].splice(i, 1); L[key].splice(i + 1, 0, id); }
              else if (a === 'move') { L[key].splice(i, 1); L[other].push(id); }
              else if (a === 'hide') { var h = L.hidden.indexOf(id); if (h >= 0) L.hidden.splice(h, 1); else L.hidden.push(id); }
              save(); if (window.rebuildHome) window.rebuildHome(); renderLayout(host);
            });
          });
          item.appendChild(ctr);
          box.appendChild(item);
        });
        return box;
      }
      var cols = el('div', 'studio-cols');
      cols.appendChild(col('Left column', 'left', 'right'));
      cols.appendChild(col('Right column', 'right', 'left'));
      host.appendChild(cols);

      var reset = el('button', 'studio-btn studio-btn--ghost', 'Reset layout');
      reset.addEventListener('click', function () {
        delete window.STUDIO.layout; save();
        if (window.rebuildHome) window.rebuildHome();
        renderLayout(host);
      });
      host.appendChild(reset);
    }

    // ---- Data tab (export / import / reset) ----
    function renderData(host) {
      host.innerHTML =
        '<p class="studio-note">Changes are saved in this browser. To make them permanent, Export the JSON and commit it (or paste it into another browser to import).</p>';
      var ta = el('textarea', 'studio-ta');
      ta.value = JSON.stringify(window.STUDIO, null, 2);
      host.appendChild(ta);

      var exp = el('button', 'studio-btn', 'Export (download)');
      exp.addEventListener('click', function () {
        var blob = new Blob([JSON.stringify(window.STUDIO, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'statc-studio.json'; a.click();
      });
      var imp = el('button', 'studio-btn', 'Import (from box)');
      imp.addEventListener('click', function () {
        try {
          window.STUDIO = JSON.parse(ta.value); save(); applyTheme();
          if (window.rebuildHome && document.body.dataset.page === 'home') window.rebuildHome();
          imp.textContent = 'Imported ✓'; setTimeout(function () { imp.textContent = 'Import (from box)'; }, 1500);
        } catch (e) { imp.textContent = 'Invalid JSON'; setTimeout(function () { imp.textContent = 'Import (from box)'; }, 1500); }
      });
      var reset = el('button', 'studio-btn studio-btn--danger', 'Reset everything');
      reset.addEventListener('click', function () {
        localStorage.removeItem(KEY); window.STUDIO = { theme: {} }; applyTheme();
        if (window.rebuildHome && document.body.dataset.page === 'home') window.rebuildHome();
        renderData(host);
      });
      var btns = el('div', 'studio-btns');
      btns.appendChild(exp); btns.appendChild(imp); btns.appendChild(reset);
      host.appendChild(btns);
    }

    renderTab(activeTab);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
