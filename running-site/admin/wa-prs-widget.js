// Custom Decap CMS widget: "wa-prs"
// Uses window.h and window.createClass — same pattern as crop-widget.js
// Stores data as [{event, time}] — same format as the old list widget.

(function () {
  var h           = window.h;
  var createClass = window.createClass;

  if (!h || !createClass || !window.CMS) return;

  var API = '/.netlify/functions/wa-athlete';

  var S = {
    wrap:        { fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#333' },
    fetchBox:    { background: '#f4f6f8', border: '1px solid #d0d8e0', borderRadius: 6, padding: '10px 12px', marginBottom: 12 },
    fetchLabel:  { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#555', marginBottom: 6 },
    row:         { display: 'flex', gap: 8 },
    input:       { flex: 1, padding: '7px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, outline: 'none', minWidth: 0 },
    btn:         { padding: '7px 14px', background: '#E8500A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
    btnSm:       { padding: '5px 12px', background: '#666', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 8 },
    err:         { color: '#c00', fontSize: 12, marginTop: 5 },
    hint:        { color: '#999', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
    head:        { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#888', margin: '10px 0 4px' },
    subHead:     { fontSize: 11, color: '#aaa', marginBottom: 3 },
    prRow:       { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', borderBottom: '1px solid #eee', cursor: 'pointer' },
    indoorTag:   { fontSize: 10, background: '#dbeafe', color: '#1d4ed8', borderRadius: 3, padding: '1px 5px', fontWeight: 700 },
    chip:        { padding: '5px 12px', background: '#e8f0fe', border: '1px solid #93c5fd', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginRight: 6, marginBottom: 6, display: 'inline-block' },
    savedRow:    { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: '#f9f9f9', border: '1px solid #e8e8e8', borderRadius: 4, marginBottom: 4 },
    mono:        { fontFamily: "'Courier New', monospace", fontWeight: 700 },
    removeBtn:   { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 'auto', padding: '0 4px' },
  };

  var WAPrsControl = createClass({
    getInitialState: function () {
      return {
        waInput:  '',
        loading:  false,
        error:    '',
        athletes: [],   // name-search results
        outdoor:  [],   // fetched from WA
        indoor:   [],
        checked:  [],   // indices into outdoor.concat(indoor)
      };
    },

    doFetch: function () {
      var q = this.state.waInput.trim();
      if (!q) return;
      this.setState({ loading: true, error: '', athletes: [], outdoor: [], indoor: [], checked: [] });
      var self   = this;
      var isUrl  = q.indexOf('http') === 0;
      var url    = isUrl
        ? API + '?url=' + encodeURIComponent(q)
        : API + '?action=search&name=' + encodeURIComponent(q);
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) throw new Error(data.error);
          if (data.athletes) {
            self.setState({ athletes: data.athletes, loading: false });
          } else {
            self.applyPRData(data);
          }
        })
        .catch(function (err) {
          self.setState({
            error:   err.message.indexOf('fetch') !== -1
              ? 'Cannot connect — this only works on the live Netlify site.'
              : err.message,
            loading: false,
          });
        });
    },

    fetchAthlete: function (url) {
      this.setState({ loading: true, error: '', athletes: [] });
      var self = this;
      fetch(API + '?url=' + encodeURIComponent(url))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) throw new Error(data.error);
          self.applyPRData(data);
        })
        .catch(function (err) {
          self.setState({ error: err.message, loading: false });
        });
    },

    applyPRData: function (data) {
      var outdoor = data.outdoor || [];
      var indoor  = data.indoor  || [];
      var checked = outdoor.map(function (_, i) { return i; });
      this.setState({ outdoor: outdoor, indoor: indoor, checked: checked, loading: false });
      var prs = outdoor.map(function (p) { return { event: p.event, time: p.time }; });
      this.props.onChange(prs);
    },

    toggleCheck: function (idx) {
      var checked = this.state.checked.slice();
      var pos     = checked.indexOf(idx);
      if (pos !== -1) {
        checked.splice(pos, 1);
      } else {
        checked.push(idx);
        checked.sort(function (a, b) { return a - b; });
      }
      this.setState({ checked: checked });
      var all = this.state.outdoor.concat(this.state.indoor);
      var prs = checked.map(function (i) { return { event: all[i].event, time: all[i].time }; });
      this.props.onChange(prs);
    },

    removeCurrent: function (idx) {
      var next = (this.props.value || []).filter(function (_, i) { return i !== idx; });
      this.props.onChange(next);
    },

    updateCurrent: function (idx, field, val) {
      var next = (this.props.value || []).map(function (p, i) {
        if (i !== idx) return p;
        var copy = { event: p.event, time: p.time };
        copy[field] = val;
        return copy;
      });
      this.props.onChange(next);
    },

    addManual: function () {
      var current = this.props.value || [];
      if (current.length >= 4) return;
      this.props.onChange(current.concat([{ event: '', time: '' }]));
    },

    render: function () {
      var self       = this;
      var st         = this.state;
      var current    = Array.isArray(this.props.value) ? this.props.value : [];
      var allFetched = st.outdoor.concat(st.indoor);
      var hasFetched = allFetched.length > 0;

      return h('div', { style: S.wrap },

        // ── WA fetch box ────────────────────────────────────────────
        h('div', { style: S.fetchBox },
          h('label', { style: S.fetchLabel }, '⚡ Auto-fill from World Athletics'),
          h('div', { style: S.row },
            h('input', {
              type:        'text',
              value:       st.waInput,
              onChange:    function (ev) { self.setState({ waInput: ev.target.value }); },
              onKeyDown:   function (ev) { if (ev.key === 'Enter') self.doFetch(); },
              placeholder: 'Athlete name  –or–  paste worldathletics.org/athletes/… URL',
              style:       S.input,
            }),
            h('button', {
              type:     'button',
              onClick:  function () { self.doFetch(); },
              disabled: st.loading || !st.waInput.trim(),
              style:    Object.assign({}, S.btn, (st.loading || !st.waInput.trim()) ? { opacity: .45 } : {}),
            }, st.loading ? '…' : 'Fetch'),
          ),
          st.error && h('div', { style: S.err }, '⚠ ' + st.error),
          h('div', { style: S.hint }, 'Live Netlify site only — not available in local preview.'),
        ),

        // ── Athlete chips (name-search results) ─────────────────────
        st.athletes.length > 0 && h('div', null,
          h('div', { style: S.head }, 'Select athlete:'),
          h('div', { style: { marginTop: 4 } },
            st.athletes.map(function (a, i) {
              return h('button', {
                key: i, type: 'button', style: S.chip,
                onClick: function () { self.fetchAthlete(a.url); },
              }, a.name + (a.country ? ' · ' + a.country : ''));
            })
          )
        ),

        // ── PR checkboxes ───────────────────────────────────────────
        hasFetched && h('div', null,
          h('div', { style: S.head }, 'Select up to 4 (' + st.checked.length + ' selected):'),

          st.outdoor.length > 0 && h('div', null,
            h('div', { style: S.subHead }, 'OUTDOOR'),
            st.outdoor.map(function (pr, i) {
              return h('label', { key: 'o' + i, style: S.prRow },
                h('input', {
                  type:     'checkbox',
                  checked:  st.checked.indexOf(i) !== -1,
                  onChange: function () { self.toggleCheck(i); },
                  disabled: st.checked.indexOf(i) === -1 && st.checked.length >= 4,
                }),
                h('span', { style: { fontWeight: 700, minWidth: 54 } }, pr.event),
                h('span', { style: S.mono }, pr.time),
                h('span', { style: { color: '#bbb', marginLeft: 'auto', fontSize: 11 } }, pr.venue),
              );
            })
          ),

          st.indoor.length > 0 && h('div', { style: { marginTop: 8 } },
            h('div', { style: S.subHead }, 'INDOOR'),
            st.indoor.map(function (pr, i) {
              var idx = st.outdoor.length + i;
              return h('label', { key: 'in' + i, style: S.prRow },
                h('input', {
                  type:     'checkbox',
                  checked:  st.checked.indexOf(idx) !== -1,
                  onChange: function () { self.toggleCheck(idx); },
                  disabled: st.checked.indexOf(idx) === -1 && st.checked.length >= 4,
                }),
                h('span', { style: { fontWeight: 700, minWidth: 54 } }, pr.event),
                h('span', { style: S.mono }, pr.time),
                h('span', { style: S.indoorTag }, 'Indoor'),
                h('span', { style: { color: '#bbb', marginLeft: 'auto', fontSize: 11 } }, pr.venue),
              );
            })
          ),
        ),

        // ── Current saved PRs ───────────────────────────────────────
        h('div', { style: { marginTop: hasFetched ? 14 : 0 } },
          h('div', { style: S.head }, 'Saved PRs (' + current.length + '/4):'),

          current.length === 0
            ? h('div', { style: S.hint },
                hasFetched ? 'Check boxes above to add PRs.' : 'No PRs yet. Search above or add manually.')
            : current.map(function (pr, i) {
                return hasFetched
                  // Read-only when WA data is loaded — use checkboxes to manage
                  ? h('div', { key: i, style: S.savedRow },
                      h('span', { style: { fontWeight: 700, minWidth: 54 } }, pr.event),
                      h('span', { style: S.mono }, pr.time),
                      h('button', { type: 'button', style: S.removeBtn, onClick: function () { self.removeCurrent(i); } }, '×'),
                    )
                  // Editable text inputs when no WA data loaded
                  : h('div', { key: i, style: Object.assign({}, S.row, { marginBottom: 6 }) },
                      h('input', {
                        value:       pr.event,
                        placeholder: 'Event (1500m)',
                        onChange:    function (ev) { self.updateCurrent(i, 'event', ev.target.value); },
                        style:       Object.assign({}, S.input, { flex: '0 0 110px' }),
                      }),
                      h('input', {
                        value:       pr.time,
                        placeholder: 'Time (3:26.73)',
                        onChange:    function (ev) { self.updateCurrent(i, 'time', ev.target.value); },
                        style:       S.input,
                      }),
                      h('button', { type: 'button', style: S.removeBtn, onClick: function () { self.removeCurrent(i); } }, '×'),
                    );
              }),

          !hasFetched && current.length < 4 &&
            h('button', { type: 'button', style: S.btnSm, onClick: function () { self.addManual(); } },
              '+ Add PR manually'),
        ),
      );
    },
  });

  var WAPrsPreview = createClass({
    render: function () {
      var prs = Array.isArray(this.props.value) ? this.props.value : [];
      if (!prs.length) return h('em', null, 'No PRs');
      return h('ul', { style: { margin: 0, paddingLeft: 18 } },
        prs.map(function (p, i) { return h('li', { key: i }, p.event + ': ' + p.time); })
      );
    },
  });

  CMS.registerWidget('wa-prs', WAPrsControl, WAPrsPreview);

})();
