// Custom Decap CMS widget: "wa-results"
// Manages the "results" field (season race results) for each athlete.

(function () {
  var h           = window.h;
  var createClass = window.createClass;
  if (!h || !createClass || !window.CMS) return;

  var API = '/.netlify/functions/wa-athlete';

  var S = {
    wrap:      { fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#333' },
    greenBox:  { background: '#eef7ee', border: '2px solid #4caf50', borderRadius: 6, padding: '10px 12px', marginBottom: 12 },
    yellowBox: { background: '#fff8e1', border: '2px solid #ffc107', borderRadius: 6, padding: '10px 12px', marginBottom: 12 },
    greenLabel: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#2e7d32', marginBottom: 6 },
    yellowLabel: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#e65100', marginBottom: 4 },
    fetchBox:  { background: '#f4f6f8', border: '1px solid #d0d8e0', borderRadius: 6, padding: '10px 12px' },
    urlLabel:  { display: 'block', fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 4 },
    urlInput:  { width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, fontFamily: 'monospace', border: '1px solid #c0c8d0', borderRadius: 4, marginBottom: 8 },
    btn:       { padding: '7px 14px', background: '#E8500A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
    btnDis:    { padding: '7px 14px', background: '#E8500A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'default', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.45 },
    hint:      { color: '#999', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
    err:       { color: '#c00', fontSize: 12, marginTop: 6 },
    ok:        { color: '#2e7d32', fontSize: 12, marginLeft: 10 },
    th:        { textAlign: 'left', color: '#888', fontSize: 10, fontWeight: 700, paddingBottom: 4, paddingRight: 10 },
    td:        { padding: '5px 10px 5px 0', verticalAlign: 'middle' },
    removeBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' },
  };

  var WaResultsControl = createClass({
    getInitialState: function () {
      return { loading: false, error: '', justFetched: false, urlInput: '' };
    },

    componentDidMount: function () {
      // Always register value so Decap includes this field on every save.
      if (this.props.onChange) {
        this.props.onChange(Array.isArray(this.props.value) ? this.props.value : []);
      }
    },

    fetchResults: function () {
      var url = this.state.urlInput.trim();
      if (!url) return;
      var self = this;
      this.setState({ loading: true, error: '', justFetched: false });
      fetch(API + '?url=' + encodeURIComponent(url))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) throw new Error(data.error);
          var results = data.results || [];
          self.props.onChange(results);
          self.setState({ loading: false, justFetched: true, error: '' });
        })
        .catch(function (err) {
          self.setState({
            loading: false,
            error: err.message.indexOf('fetch') !== -1
              ? 'Cannot connect — this only works on the live Netlify site.'
              : err.message,
          });
        });
    },

    removeResult: function (idx) {
      var current = Array.isArray(this.props.value) ? this.props.value : [];
      this.props.onChange(current.filter(function (_, i) { return i !== idx; }));
    },

    render: function () {
      var self    = this;
      var current = Array.isArray(this.props.value) ? this.props.value : [];
      var url     = this.state.urlInput.trim();
      var st      = this.state;

      return h('div', { style: S.wrap },

        // ── Saved results ──────────────────────────────────────
        h('div', { style: current.length > 0 ? S.greenBox : S.yellowBox },
          current.length > 0
            ? h('span', { style: S.greenLabel }, '✓ ' + current.length + ' season result' + (current.length === 1 ? '' : 's') + ' saved')
            : h('span', { style: S.yellowLabel }, '⚠ No season results saved yet'),

          current.length > 0 && h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4, marginBottom: 4 } },
            h('thead', null,
              h('tr', null,
                h('th', { style: S.th }, 'Date'),
                h('th', { style: S.th }, 'Meet'),
                h('th', { style: S.th }, 'Event'),
                h('th', { style: S.th }, 'Time'),
                h('th', { style: S.th }, 'Pl.'),
                h('th', { style: S.th }, '')
              )
            ),
            h('tbody', null,
              current.map(function (r, i) {
                return h('tr', { key: i, style: { borderBottom: '1px solid #c8e6c9' } },
                  h('td', { style: S.td }, r.date || ''),
                  h('td', { style: S.td }, r.meet || ''),
                  h('td', { style: Object.assign({}, S.td, { color: '#888', fontWeight: 700, fontSize: 11 }) }, r.event || ''),
                  h('td', { style: Object.assign({}, S.td, { fontFamily: 'monospace', fontWeight: 700 }) }, r.time || ''),
                  h('td', { style: Object.assign({}, S.td, { color: '#888' }) }, r.place || ''),
                  h('td', { style: S.td },
                    h('button', { type: 'button', style: S.removeBtn, onClick: function () { self.removeResult(i); } }, '×')
                  )
                );
              })
            )
          )
        ),

        // ── Sync box ───────────────────────────────────────────
        h('div', { style: S.fetchBox },
          h('label', { style: S.urlLabel }, 'World Athletics Profile URL'),
          h('input', {
            type: 'text',
            value: st.urlInput,
            placeholder: 'https://worldathletics.org/athletes/norway/jakob-ingebrigtsen-14528596',
            style: S.urlInput,
            onChange: function (e) {
              self.setState({ urlInput: e.target.value, error: '', justFetched: false });
            },
          }),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('button', {
              type:     'button',
              onClick:  function () { self.fetchResults(); },
              disabled: !url || st.loading,
              style:    (!url || st.loading) ? S.btnDis : S.btn,
            }, st.loading ? 'Fetching…' : '⟳ Sync from World Athletics'),
            st.justFetched && h('span', { style: S.ok }, '✓ Done — publish to apply')
          ),
          st.error && h('div', { style: S.err }, '⚠ ' + st.error),
          h('div', { style: S.hint }, 'Paste the athlete\'s WA profile URL above, then click Sync. Live Netlify site only.')
        )
      );
    },
  });

  var WaResultsPreview = createClass({
    render: function () {
      var results = Array.isArray(this.props.value) ? this.props.value : [];
      if (!results.length) return h('em', null, 'No season results');
      return h('ul', { style: { margin: 0, paddingLeft: 18 } },
        results.map(function (r, i) {
          return h('li', { key: i }, [r.date, r.meet, r.time].filter(Boolean).join(' — '));
        })
      );
    },
  });

  CMS.registerWidget('wa-results', WaResultsControl, WaResultsPreview);
})();
