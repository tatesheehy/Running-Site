// ── INLINE IMAGE CROP WIDGET FOR DECAP CMS ──────────────────
// Reads the sibling "image" field automatically and shows the
// crop tool embedded. User drags → value saves automatically.

(function () {
  var h = window.h;
  var createClass = window.createClass;

  var CropControl = createClass({
    getInitialState: function () {
      return { iframeKey: 0 };
    },

    componentDidMount: function () {
      window.addEventListener('message', this.handleMessage);
    },

    componentWillUnmount: function () {
      window.removeEventListener('message', this.handleMessage);
    },

    componentDidUpdate: function (prevProps) {
      var prev = prevProps.entry && prevProps.entry.getIn(['data', 'image']);
      var next = this.props.entry && this.props.entry.getIn(['data', 'image']);
      if (prev !== next) {
        // Force iframe reload when image changes
        this.setState({ iframeKey: this.state.iframeKey + 1 });
      }
    },

    handleMessage: function (e) {
      if (e.data && e.data.type === 'cropPosition') {
        this.props.onChange(e.data.value);
      }
    },

    getImageUrl: function () {
      var raw = this.props.entry && this.props.entry.getIn(['data', 'image']);
      if (!raw) return '';
      // Make relative paths absolute so the iframe can load them
      if (raw.startsWith('http')) return raw;
      return window.location.origin + raw;
    },

    render: function () {
      var imageUrl = this.getImageUrl();
      var currentVal = this.props.value || '50% 50%';

      var src = '/crop-tool.html?embed=1' + (imageUrl ? '&url=' + encodeURIComponent(imageUrl) : '');

      return h('div', { style: { fontFamily: 'Inter, sans-serif' } },
        imageUrl
          ? h('div', { style: { border: '1px solid #333', borderRadius: '6px', overflow: 'hidden' } },
              h('iframe', {
                key: this.state.iframeKey,
                src: src,
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
            }, '↑ Upload a Cover Image above — the crop tool will appear here automatically.')
        ,
        h('p', { style: { fontSize: '11px', color: '#888', marginTop: '6px' } },
          'Current value: ', h('code', { style: { color: '#E8500A' } }, currentVal)
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
