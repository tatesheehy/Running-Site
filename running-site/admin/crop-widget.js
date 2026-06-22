// ── INLINE IMAGE CROP WIDGET FOR DECAP CMS ──────────────────

(function () {
  var h = window.h;
  var createClass = window.createClass;

  var CropControl = createClass({
    getInitialState: function () {
      return { imageUrl: '', loaded: false };
    },

    componentDidMount: function () {
      window.addEventListener('message', this.handleMessage);
    },

    componentWillUnmount: function () {
      window.removeEventListener('message', this.handleMessage);
    },

    handleMessage: function (e) {
      if (e.data && e.data.type === 'cropPosition') {
        this.props.onChange(e.data.value);
      }
    },

    // Scan the CMS DOM for the uploaded cover image
    loadFromCoverImage: function () {
      var found = '';

      // Strategy 1: look for img tags with /images/ in src
      var imgs = Array.from(document.querySelectorAll('img'));
      for (var i = 0; i < imgs.length; i++) {
        var src = imgs[i].src || '';
        if (src && !src.includes('data:') && !src.includes('netlify-identity') && src.length > 10) {
          found = src;
          break;
        }
      }

      // Strategy 2: try entry data
      if (!found) {
        try {
          var entry = this.props.entry;
          if (entry && entry.getIn) {
            var direct = entry.getIn(['data', 'image']);
            if (direct) {
              found = direct.startsWith('http') ? direct : window.location.origin + (direct.startsWith('/') ? '' : '/') + direct;
            }
            if (!found) {
              var forID = this.props.forID || '';
              var match = forID.match(/items[.\[]+(\d+)/);
              if (match) {
                var idx = parseInt(match[1], 10);
                var listImg = entry.getIn(['data', 'items', idx, 'image']);
                if (listImg) found = listImg.startsWith('http') ? listImg : window.location.origin + (listImg.startsWith('/') ? '' : '/') + listImg;
              }
            }
          }
        } catch (e) {}
      }

      if (found) {
        this.setState({ imageUrl: found, loaded: true });
      } else {
        alert('No image found. Please upload a Cover Image first, then click this button.');
      }
    },

    handleManualUrl: function (e) {
      var val = e.target.value;
      this.setState({ imageUrl: val });
    },

    loadManual: function () {
      this.setState({ loaded: true });
    },

    render: function () {
      var imageUrl = this.state.imageUrl;
      var loaded = this.state.loaded;
      var currentVal = this.props.value || '—';
      var savedVal = this.props.value || '';
      var iframeSrc = '/crop-tool.html?embed=1'
        + (imageUrl ? '&url=' + encodeURIComponent(imageUrl) : '')
        + (savedVal && savedVal.indexOf('x:') === 0 ? '&val=' + encodeURIComponent(savedVal) : '');

      var btnStyle = {
        display: 'inline-block',
        background: '#E8500A',
        color: '#fff',
        fontWeight: '700',
        fontSize: '13px',
        padding: '10px 18px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.02em'
      };

      var inputStyle = {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        boxSizing: 'border-box',
        marginTop: '8px'
      };

      return h('div', { style: { fontFamily: 'Inter, sans-serif' } },

        // Load button
        !loaded && h('div', { style: { marginBottom: '12px' } },
          h('button', { style: btnStyle, onClick: this.loadFromCoverImage },
            '⬆ Load from Cover Image'
          ),
          h('p', { style: { fontSize: '12px', color: '#888', marginTop: '8px' } },
            'Upload your Cover Image above first, then click this button to open the crop tool.'
          ),
          h('div', { style: { marginTop: '12px' } },
            h('p', { style: { fontSize: '12px', color: '#aaa', marginBottom: '4px' } },
              'Or paste image path manually:'
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('input', {
                type: 'text',
                placeholder: '/images/my-photo.jpg',
                value: imageUrl,
                onChange: this.handleManualUrl,
                style: inputStyle
              }),
              h('button', {
                style: Object.assign({}, btnStyle, { background: '#555', whiteSpace: 'nowrap' }),
                onClick: this.loadManual
              }, 'Load')
            )
          )
        ),

        // Crop iframe
        loaded && imageUrl && h('div', {},
          h('div', { style: { border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' } },
            h('iframe', {
              key: imageUrl,
              src: iframeSrc,
              style: { width: '100%', height: '420px', border: 'none', display: 'block' },
              title: 'Image Crop Tool'
            })
          ),
          h('button', {
            style: Object.assign({}, btnStyle, { background: '#555', fontSize: '12px', padding: '6px 12px' }),
            onClick: function () { this.setState({ loaded: false }); }.bind(this)
          }, '↩ Change image')
        ),

        loaded && !imageUrl && h('p', { style: { color: '#c00', fontSize: '13px' } },
          'No image URL provided.'
        ),

        h('p', { style: { fontSize: '11px', color: '#888', marginTop: '6px' } },
          'Saved crop: ', h('code', { style: { color: '#E8500A' } }, currentVal)
        )
      );
    }
  });

  var CropPreview = createClass({
    render: function () {
      return h('span', {}, this.props.value || '—');
    }
  });

  CMS.registerWidget('image-crop', CropControl, CropPreview);
})();
