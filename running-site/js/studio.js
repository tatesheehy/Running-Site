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
  var _statusEl = null;
  function setStatus(s) { if (_statusEl) _statusEl.textContent = s || ''; }
  function sbClient() { return (window.getSupabase && window.getSupabase()) || null; }
  function sbUser() { return (window.getCurrentUser && window.getCurrentUser()) || null; }

  var _remoteTimer = null;
  function saveRemote() {
    var sb = sbClient(), user = sbUser();
    if (!sb || !user) { setStatus('Saved on this device'); return; }
    setStatus('Saving…');
    clearTimeout(_remoteTimer);
    _remoteTimer = setTimeout(function () {
      Promise.resolve(
        sb.from('site_config').upsert({ key: 'studio', config: window.STUDIO, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      ).then(function (res) { setStatus(res && res.error ? 'Save failed — check the site_config table' : 'Saved to account ✓'); })
       .catch(function () { setStatus('Save failed'); });
    }, 700);
  }
  function loadRemote() {
    var sb = sbClient(); if (!sb) return;
    Promise.resolve(sb.from('site_config').select('config').eq('key', 'studio').maybeSingle())
      .then(function (res) {
        if (res && res.data && res.data.config) {
          window.STUDIO = res.data.config;
          if (!window.STUDIO.theme) window.STUDIO.theme = {};
          if (!window.STUDIO.content) window.STUDIO.content = {};
          localStorage.setItem(KEY, JSON.stringify(window.STUDIO));
          applyTheme();
          if (window.rebuildHome && document.body.dataset.page === 'home' && !window.STUDIO_EDIT) window.rebuildHome();
          var atab = document.querySelector('.studio-tab.active'); if (atab) atab.click();
          setStatus(sbUser() ? 'Synced with account' : '');
        }
      }).catch(function () { /* table may not exist yet */ });
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(window.STUDIO)); saveRemote(); }

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

  // Pull the shared config from Supabase (public read) once the client is up,
  // and re-pull whenever auth changes.
  (function initRemote() {
    var tries = 0;
    (function poll() {
      var sb = sbClient();
      if (sb) { loadRemote(); try { sb.auth.onAuthStateChange(function () { loadRemote(); }); } catch (e) {} return; }
      if (tries++ < 60) setTimeout(poll, 150);
    })();
  })();

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
      '<div class="studio-hd"><span>Studio</span>' +
        '<label class="studio-edit-tgl"><input type="checkbox" id="studio-edit-chk"> Edit page</label>' +
        '<button class="studio-x" aria-label="Close">✕</button></div>' +
      '<div class="studio-status" id="studio-status"></div>' +
      '<div class="studio-tabs">' +
        '<button class="studio-tab active" data-tab="theme">Theme</button>' +
        '<button class="studio-tab" data-tab="layout">Layout</button>' +
        '<button class="studio-tab" data-tab="content">Content</button>' +
        '<button class="studio-tab" data-tab="boxes">Boxes</button>' +
        '<button class="studio-tab" data-tab="data">Save</button>' +
      '</div>' +
      '<div class="studio-body" id="studio-body"></div>';
    document.body.appendChild(panel);
    _statusEl = panel.querySelector('#studio-status');

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
      if (e.shiftKey && (e.key === 'S' || e.key === 's') && !/input|textarea/i.test((e.target.tagName || '')) && !e.target.isContentEditable) toggle();
    });

    // ---- On-canvas edit mode ----
    var chk = panel.querySelector('#studio-edit-chk');
    function setEdit(on) {
      window.STUDIO_EDIT = on;
      document.body.classList.toggle('studio-editing', on);
      chk.checked = on;
      if (document.body.dataset.page === 'home' && window.rebuildHome) window.rebuildHome();
    }
    chk.addEventListener('change', function () { setEdit(chk.checked); });

    // Slot handles (delegated so they survive re-renders)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.sf-slot-bar button');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var slot = btn.closest('.sf-slot'); if (!slot) return;
      var id = slot.dataset.id, a = btn.dataset.a;
      var L = ensureLayout();
      var col = L.left.indexOf(id) >= 0 ? 'left' : (L.right.indexOf(id) >= 0 ? 'right' : null);
      if (a === 'up' || a === 'down') {
        if (!col) return; var arr = L[col], i = arr.indexOf(id);
        if (a === 'up' && i > 0) { arr.splice(i, 1); arr.splice(i - 1, 0, id); }
        if (a === 'down' && i < arr.length - 1) { arr.splice(i, 1); arr.splice(i + 1, 0, id); }
      } else if (a === 'move') {
        if (!col) return; var other = col === 'left' ? 'right' : 'left';
        L[col].splice(L[col].indexOf(id), 1); L[other].push(id);
      } else if (a === 'hide') {
        var h = L.hidden.indexOf(id); if (h >= 0) L.hidden.splice(h, 1); else L.hidden.push(id);
      } else if (a === 'del') {
        (window.STUDIO.blocks || []).some(function (b, j) { if (b.id === id) { window.STUDIO.blocks.splice(j, 1); return true; } });
        ['left', 'right', 'hidden'].forEach(function (k) { var j = L[k].indexOf(id); if (j >= 0) L[k].splice(j, 1); });
      }
      save(); if (window.rebuildHome) window.rebuildHome();
    }, true);

    // Inline text editing → write back to the block config on blur
    document.addEventListener('blur', function (e) {
      var t = e.target;
      if (!t || !t.dataset || t.dataset.edit == null) return;
      var slot = t.closest('.sf-slot'); if (!slot) return;
      var id = slot.dataset.id;
      var blk = (window.STUDIO.blocks || []).filter(function (b) { return b.id === id; })[0];
      if (!blk) return;
      blk[t.dataset.edit] = t.innerText;
      save(); // persist without re-render (keeps cursor)
    }, true);

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
      if (tab === 'boxes') return renderBoxes(body);
      return renderData(body);
    }

    function textareaField(label, val, onSet, placeholder) {
      var row = el('label', 'studio-field');
      row.appendChild(el('span', 'studio-field-lbl', label));
      var t = el('textarea', 'studio-field-ta');
      t.value = val || ''; if (placeholder) t.placeholder = placeholder;
      t.addEventListener('change', function () { onSet(t.value); });
      row.appendChild(t);
      return row;
    }
    function defLayout() { return { left: ['nextMeet', 'meets', 'barrier', 'promos'], right: ['hero', 'leaders', 'tools'], hidden: [] }; }
    function ensureLayout() { window.STUDIO.layout = window.STUDIO.layout || defLayout(); if (!window.STUDIO.layout.hidden) window.STUDIO.layout.hidden = []; return window.STUDIO.layout; }
    function blockCol(id) { var L = ensureLayout(); return L.left.indexOf(id) >= 0 ? 'left' : 'right'; }
    function moveBlockToCol(id, col) {
      var L = ensureLayout();
      ['left', 'right'].forEach(function (k) { var i = L[k].indexOf(id); if (i >= 0) L[k].splice(i, 1); });
      L[col].push(id);
    }
    function saveRebuild() { save(); if (window.rebuildHome) window.rebuildHome(); }

    // ---- Boxes tab (create custom boxes) ----
    function renderBoxes(host) {
      if (document.body.dataset.page !== 'home') {
        host.innerHTML = '<p class="studio-note">Open the <a href="index.html">home page</a> to create boxes.</p>';
        return;
      }
      window.STUDIO.blocks = window.STUDIO.blocks || [];
      ensureLayout();
      var blocks = window.STUDIO.blocks;
      host.innerHTML = '<p class="studio-note">Build your own boxes and drop them into the page. Reorder or hide them in the Layout tab.</p>';

      blocks.forEach(function (b) {
        var card = el('div', 'studio-promo');
        var top = el('div', 'studio-promo-top');
        top.appendChild(el('span', null, 'Box · ' + (b.title || b.type)));
        var del = el('button', 'studio-mini', '✕ delete');
        del.addEventListener('click', function () {
          var i = blocks.indexOf(b); if (i >= 0) blocks.splice(i, 1);
          var L = ensureLayout();
          ['left', 'right', 'hidden'].forEach(function (k) { var j = L[k].indexOf(b.id); if (j >= 0) L[k].splice(j, 1); });
          saveRebuild(); renderBoxes(host);
        });
        top.appendChild(del); card.appendChild(top);

        var typeRow = el('label', 'studio-field');
        typeRow.appendChild(el('span', 'studio-field-lbl', 'Type'));
        var sel = el('select', 'studio-field-in');
        [['text', 'Text'], ['image', 'Image banner'], ['video', 'Video'], ['quote', 'Quote'], ['html', 'Embed / HTML']].forEach(function (t) {
          var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1]; if (b.type === t[0]) o.selected = true; sel.appendChild(o);
        });
        sel.addEventListener('change', function () { b.type = sel.value; saveRebuild(); renderBoxes(host); });
        typeRow.appendChild(sel); card.appendChild(typeRow);

        if (b.type === 'image') {
          card.appendChild(textField('Title', b.title, function (v) { b.title = v; saveRebuild(); }));
          card.appendChild(textField('Caption', b.caption, function (v) { b.caption = v; saveRebuild(); }));
          card.appendChild(textField('Link', b.href, function (v) { b.href = v; saveRebuild(); }));
          card.appendChild(el('div', 'studio-field-lbl studio-mt', 'Image'));
          card.appendChild(imageField(b.image, function (v) { b.image = v; saveRebuild(); }));
        } else if (b.type === 'video') {
          card.appendChild(textField('Video URL', b.url, function (v) { b.url = v; saveRebuild(); }, 'YouTube, Vimeo, or .mp4 link'));
          card.appendChild(textField('Caption', b.caption, function (v) { b.caption = v; saveRebuild(); }));
          card.appendChild(el('div', 'studio-note', 'Autoplays muted. YouTube/Vimeo show the preview; direct .mp4 loops silently.'));
          card.appendChild(el('div', 'studio-field-lbl studio-mt', 'Poster (for .mp4, optional)'));
          card.appendChild(imageField(b.poster, function (v) { b.poster = v; saveRebuild(); }));
        } else if (b.type === 'quote') {
          card.appendChild(textareaField('Quote', b.body, function (v) { b.body = v; saveRebuild(); }));
          card.appendChild(textField('Attribution', b.title, function (v) { b.title = v; saveRebuild(); }));
        } else if (b.type === 'html') {
          card.appendChild(textareaField('HTML / embed code', b.html, function (v) { b.html = v; saveRebuild(); }, '<iframe …></iframe>'));
        } else {
          card.appendChild(textField('Heading', b.title, function (v) { b.title = v; saveRebuild(); }));
          card.appendChild(textareaField('Body', b.body, function (v) { b.body = v; saveRebuild(); }, 'Two line breaks = new paragraph'));
        }

        var colRow = el('label', 'studio-field');
        colRow.appendChild(el('span', 'studio-field-lbl', 'Column'));
        var cs = el('select', 'studio-field-in');
        [['left', 'Left column'], ['right', 'Right column']].forEach(function (c) {
          var o = document.createElement('option'); o.value = c[0]; o.textContent = c[1]; if (blockCol(b.id) === c[0]) o.selected = true; cs.appendChild(o);
        });
        cs.addEventListener('change', function () { moveBlockToCol(b.id, cs.value); saveRebuild(); });
        colRow.appendChild(cs); card.appendChild(colRow);

        host.appendChild(card);
      });

      var add = el('button', 'studio-btn', '+ New box');
      add.addEventListener('click', function () {
        var id = 'blk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        window.STUDIO.blocks.push({ id: id, type: 'text', title: 'New box', body: 'Write anything here.' });
        ensureLayout().right.push(id);
        saveRebuild(); renderBoxes(host);
      });
      host.appendChild(add);
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
      var user = sbUser();
      host.innerHTML = '';
      var acct = el('div', 'studio-acct');
      if (user) {
        acct.innerHTML = '<div class="studio-acct-on">● Signed in as ' + (user.email || 'you') + '</div>' +
          '<p class="studio-note">Every change auto-saves to your account and goes live for all visitors. No commit needed.</p>';
      } else {
        acct.innerHTML = '<div class="studio-acct-off">○ Not signed in</div>' +
          '<p class="studio-note">Sign in (top-right) to auto-save changes to your account and publish them live. Until then, changes are kept in this browser — use Export to back them up.</p>';
      }
      host.appendChild(acct);
      if (user) {
        var now = el('button', 'studio-btn', 'Save to account now');
        now.addEventListener('click', function () { saveRemote(); });
        host.appendChild(now);
      }
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
