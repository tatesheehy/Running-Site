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
  if (!window.STUDIO.content) window.STUDIO.content = {};

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
        '<button class="studio-tab" data-tab="content">Content</button>' +
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
      if (tab === 'content') return renderContent(body);
      return renderData(body);
    }

    // Reusable image slot: upload a file OR paste a URL. Stored as a data-URL.
    function imageField(cur, onSet) {
      var wrap = el('div', 'studio-img');
      var thumb = el('div', 'studio-img-thumb');
      if (cur) thumb.style.backgroundImage = 'url("' + cur + '")';
      else thumb.classList.add('empty');
      var controls = el('div', 'studio-img-ctrl');
      var up = el('label', 'studio-img-up', 'Upload');
      var file = el('input');
      file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none';
      file.addEventListener('change', function () {
        var f = file.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function () { thumb.style.backgroundImage = 'url("' + r.result + '")'; thumb.classList.remove('empty'); onSet(r.result); };
        r.readAsDataURL(f);
      });
      up.appendChild(file);
      var url = el('input', 'studio-img-url');
      url.type = 'text'; url.placeholder = 'or paste image URL';
      url.value = (cur && cur.indexOf('data:') !== 0) ? cur : '';
      url.addEventListener('change', function () {
        var v = url.value.trim();
        thumb.style.backgroundImage = v ? 'url("' + v + '")' : '';
        thumb.classList.toggle('empty', !v); onSet(v);
      });
      var clr = el('button', 'studio-img-clr', 'Clear');
      clr.addEventListener('click', function () { thumb.style.backgroundImage = ''; thumb.classList.add('empty'); url.value = ''; onSet(''); });
      controls.appendChild(up); controls.appendChild(clr);
      wrap.appendChild(thumb); wrap.appendChild(controls); wrap.appendChild(url);
      return wrap;
    }

    function textField(label, val, onSet, placeholder) {
      var row = el('label', 'studio-field');
      row.appendChild(el('span', 'studio-field-lbl', label));
      var i = el('input', 'studio-field-in');
      i.type = 'text'; i.value = val || ''; if (placeholder) i.placeholder = placeholder;
      i.addEventListener('change', function () { onSet(i.value); });
      row.appendChild(i);
      return row;
    }

    // Athlete picker (name → id) using a datalist.
    var _athList = null;
    function athleteOptions() {
      if (_athList) return _athList;
      _athList = [];
      if (typeof ATHLETES === 'object') {
        for (var id in ATHLETES) { if (ATHLETES[id] && ATHLETES[id].name) _athList.push([id, ATHLETES[id].name]); }
      }
      return _athList;
    }
    function athleteField(label, curId, onPick) {
      var opts = athleteOptions();
      var listId = 'studio-ath-' + Math.random().toString(36).slice(2, 7);
      var row = el('label', 'studio-field');
      row.appendChild(el('span', 'studio-field-lbl', label));
      var i = el('input', 'studio-field-in');
      i.type = 'text'; i.setAttribute('list', listId);
      var curName = ''; opts.forEach(function (o) { if (o[0] === curId) curName = o[1]; });
      i.value = curName || curId || '';
      var dl = document.createElement('datalist'); dl.id = listId;
      opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[1]; dl.appendChild(op); });
      i.addEventListener('change', function () {
        var hit = opts.filter(function (o) { return o[1].toLowerCase() === i.value.trim().toLowerCase(); })[0];
        onPick(hit ? hit[0] : i.value.trim());
      });
      row.appendChild(i); row.appendChild(dl);
      return row;
    }

    // ---- Content tab ----
    function renderContent(host) {
      if (document.body.dataset.page !== 'home') {
        host.innerHTML = '<p class="studio-note">Open the <a href="index.html">home page</a> to edit its content & photos.</p>';
        return;
      }
      var C = window.STUDIO.content;
      host.innerHTML = '';

      // Featured H2H matchup
      var siteFm = (typeof SITE !== 'undefined' && SITE.featuredMatchup) || {};
      C.featuredMatchup = C.featuredMatchup || {};
      var fm = C.featuredMatchup;
      var eff = function (k) { return fm[k] != null ? fm[k] : siteFm[k]; };
      var setFm = function (k, v) { fm[k] = v; save(); if (window.rebuildHome) window.rebuildHome(); };

      host.appendChild(el('div', 'studio-sec-hd', 'Featured H2H'));
      host.appendChild(athleteField('Athlete A', eff('a'), function (v) { setFm('a', v); }));
      host.appendChild(athleteField('Athlete B', eff('b'), function (v) { setFm('b', v); }));
      host.appendChild(textField('Event', eff('event'), function (v) { setFm('event', v); }, 'e.g. Mile'));
      host.appendChild(textField('Meet', eff('meet'), function (v) { setFm('meet', v); }, 'e.g. London Diamond League'));
      host.appendChild(el('div', 'studio-field-lbl studio-mt', 'Photo · Athlete A'));
      host.appendChild(imageField(eff('photoA'), function (v) { setFm('photoA', v); }));
      host.appendChild(el('div', 'studio-field-lbl studio-mt', 'Photo · Athlete B'));
      host.appendChild(imageField(eff('photoB'), function (v) { setFm('photoB', v); }));

      // Promo banners
      host.appendChild(el('div', 'studio-sec-hd', 'Promo banners'));
      if (!Array.isArray(C.promos)) {
        C.promos = window._sfCurrentPromos ? JSON.parse(JSON.stringify(window._sfCurrentPromos())) : [];
      }
      var setPromos = function () { save(); if (window.rebuildHome) window.rebuildHome(); };
      C.promos.forEach(function (p, idx) {
        var card = el('div', 'studio-promo');
        var top = el('div', 'studio-promo-top');
        top.appendChild(el('span', null, 'Banner ' + (idx + 1)));
        var del = el('button', 'studio-mini', '✕ remove');
        del.addEventListener('click', function () { C.promos.splice(idx, 1); setPromos(); renderContent(host); });
        top.appendChild(del);
        card.appendChild(top);
        card.appendChild(textField('Title', p.title, function (v) { p.title = v; setPromos(); }));
        card.appendChild(textField('Subtitle', p.subtitle, function (v) { p.subtitle = v; setPromos(); }));
        card.appendChild(textField('Button', p.cta, function (v) { p.cta = v; setPromos(); }));
        card.appendChild(textField('Link', p.href, function (v) { p.href = v; setPromos(); }, 'time-machine.html'));
        card.appendChild(textField('Background', p.bg, function (v) { p.bg = v; setPromos(); }, 'CSS color / gradient'));
        card.appendChild(el('div', 'studio-field-lbl studio-mt', 'Graphic'));
        card.appendChild(imageField(p.image, function (v) { p.image = v; setPromos(); }));
        host.appendChild(card);
      });
      var add = el('button', 'studio-btn studio-btn--ghost', '+ Add banner');
      add.addEventListener('click', function () {
        C.promos.push({ title: 'New banner', subtitle: '', cta: 'Explore', href: '#', bg: 'linear-gradient(120deg,#14110f,#3a2a12,#14110f)', image: '' });
        setPromos(); renderContent(host);
      });
      host.appendChild(add);
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
