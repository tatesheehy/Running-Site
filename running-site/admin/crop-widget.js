// ── INLINE IMAGE CROP WIDGET FOR DECAP CMS ──────────────────

(function () {
  var h = window.h;
  var createClass = window.createClass;

  var CropControl = createClass({
    getInitialState: function () {
      return { iframeKey: 0, manualUrl: '' };
    },

    componentDidMount: function () {
      window.addEventListener('message', this.handleMessage);
    },

    componentWillUnmount: function () {
      window.removeEventListener('message', this.handleMessage);
    },

    componentDidUpdate: function (prevProps) {
      var prev = this.resolveImageUrl(prevProps);
      var next = this.resolveImageUrl(this.props);
      if (prev !== next) {
        this.setState({ iframeKey: this.state.iframeKey + 1 });
      }
    },

    handleMessage: function (e) {
      if (e.data && e.data.type === 'cropPosition') {
        this.props.onChange(e.data.value);
      }
    },

    // Try multiple strategies to find the sibling image field value
    resolveImageUrl: function (props) {
      props = props || this.props;
      var entry = props.entry;
      if (!entry || !entry.getIn) return this.state && this.state.manualUrl || '';

      // Strategy 1: direct path (non-list articles)
      var direct = entry.getIn(['data', 'image']);
      if (direct) return direct;

      // Strategy 2: parse list index from forID (e.g. "items.2.imagePosition")
      var forID = props.forID || '';
      var match = forID.match(/items[.\[]+(\d+)/);
      if (match) {
        var idx = parseInt(match[1], 10);
        var listImg = entry.getIn(['data', 'items', idx, 'image']);
        if (listImg) return listImg;
      }

      return this.state && this.state.manualUrl || '';
    },

    makeAbsolute: function (url) {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return window.location.origin + (url.startsWith('/') ? '' : '/') + url;
    },

    handleManualUrl: function (e) {
      this.setState({ manualUrl: e.target.value, iframeKey: this.state.iframeKey + 1 });
    },

    render: function () {
      var resolvedUrl = this.resolveImageUrl(this.props);
      var imageUrl = this.makeAbsolute(resolvedUrl || this.state.manualUrl);
      var currentVal = this.props.value || '50% 50%';
      var iframeSrc = '/crop-tool.html?embed=1' + (imageUrl ? '&url=' + encodeURIComponent(imageUrl) : '');

      return h('div', { style: { fontFamily: 'Inter, sans-serif' } },

        // Manual URL input (shown when no image auto-detected)
        !resolvedUrl && h('div', { style: { marginBottom: '10px' } },
          h('input', {
            type: 'text',
            placeholder: 'Paste image path here (e.g. /images/photo.jpg)',
            value: this.state.manualUrl,
            onChange: this.handleManualUrl,
            style: {
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #444',
              borderRadius: '4px',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              boxSizing: 'border-box'
            }
          })
        ),

        imageUrl
          ? h('div', { style: { border: '1px solid #333', borderRadius: '6px', overflow: 'hidden' } },
              h('iframe', {
                key: this.state.iframeKey,
                src: iframeSrc,
                style: { width: '100%', height: '420px', border: 'none', display: 'block' },
                title: 'Image Crop Tool'
              })
            )
          : h('div', {
              style: {
                background: '#1a1a1a',
                border: '1px dashed #444',
                borderRadius: '6px',
                padding: '24px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }
            }, '↑ Upload a Cover Image above — or paste its path in the box above.')
        ,
        h('p', { style: { fontSize: '11px', color: '#888', marginTop: '6px' } },
          'Saved value: ', h('code', { style: { color: '#E8500A' } }, currentVal)
        )
      );
    }
  });

  var CropPreview = createClass({
    render: function () {
      return h('span', {}, this.props.value || '50% 50%');
    }
  });

  CMS.registerWidget('image-crop', CropControl, CropPreview);
})();
