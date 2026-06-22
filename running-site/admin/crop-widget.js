// ── INLINE CROP WIDGET FOR DECAP CMS ──────────────────────────
// Self-contained: no iframe, no postMessage. The modal is built
// with vanilla JS appended to document.body to avoid CMS CSS
// interference. onChange is called directly when user applies.

(function () {
  var h = window.h;
  var createClass = window.createClass;

  var MIN_FRAME = 30;

  var CropControl = createClass({
    getInitialState: function () {
      return { modalOpen: false };
    },

    componentDidMount: function () {
      this._id = 'cwm-' + Math.random().toString(36).slice(2, 9);
    },

    componentWillUnmount: function () {
      this._destroyModal();
    },

    // ── FIND IMAGE URL ──────────────────────────────────────────
    // Walk UP the DOM from our own root element, at each level checking
    // sibling branches (not our own branch). The first img found this way
    // belongs to the Cover Image field for the same list item — not to
    // any other article's image.
    findImageUrl: function () {
      var el = this._rootEl;
      if (!el) return null;

      while (el && el !== document.body) {
        var parent = el.parentElement;
        if (!parent) break;

        var children = parent.children;
        for (var i = 0; i < children.length; i++) {
          var sibling = children[i];
          // Skip the branch that contains our own widget
          if (sibling === el || sibling.contains(el)) continue;

          var imgs = sibling.querySelectorAll('img');
          for (var j = 0; j < imgs.length; j++) {
            var src = imgs[j].src || '';
            if (src && !src.includes('data:') && !src.includes('netlify-identity') && src.length > 10) {
              return src;
            }
          }
        }
        el = parent;
      }
      return null;
    },

    // ── MODAL LIFECYCLE ─────────────────────────────────────────
    openModal: function () {
      var url = this.findImageUrl();
      if (!url) {
        alert('No image found. Please upload a Cover Image first, then try again.');
        return;
      }
      this._imageUrl = url;
      this._ratio = 1.6;
      this._action = null;
      this._imgW = 0; this._imgH = 0;
      this._frameX = 0; this._frameY = 0;
      this._frameW = 0; this._frameH = 0;
      this._offX = 0; this._offY = 0;
      this._natW = 0; this._natH = 0;
      this._buildModal();
    },

    _buildModal: function () {
      var self = this;
      var el = document.createElement('div');
      el.id = this._id;
      el.style.cssText = [
        'position:fixed;inset:0;z-index:99999;background:#0a0a0a;',
        'display:grid;grid-template-columns:1fr 300px;font-family:Inter,sans-serif;'
      ].join('');

      el.innerHTML = [
        // Canvas side
        '<div id="cw-canvas" style="position:relative;overflow:hidden;display:flex;',
        'align-items:center;justify-content:center;cursor:crosshair;user-select:none;">',
          '<img id="cw-img" src="' + self._imageUrl + '" style="max-width:100%;max-height:100%;',
          'object-fit:contain;pointer-events:none;display:block;">',
          '<div id="cw-frame" style="position:absolute;border:2px solid #fff;',
          'box-shadow:0 0 0 9999px rgba(0,0,0,0.55);pointer-events:none;">',
            '<div data-h="tl" style="position:absolute;top:-3px;left:-3px;width:18px;height:18px;',
            'border:3px solid #fff;border-right:none;border-bottom:none;cursor:nw-resize;pointer-events:auto;"></div>',
            '<div data-h="tr" style="position:absolute;top:-3px;right:-3px;width:18px;height:18px;',
            'border:3px solid #fff;border-left:none;border-bottom:none;cursor:ne-resize;pointer-events:auto;"></div>',
            '<div data-h="bl" style="position:absolute;bottom:-3px;left:-3px;width:18px;height:18px;',
            'border:3px solid #fff;border-right:none;border-top:none;cursor:sw-resize;pointer-events:auto;"></div>',
            '<div data-h="br" style="position:absolute;bottom:-3px;right:-3px;width:18px;height:18px;',
            'border:3px solid #fff;border-left:none;border-top:none;cursor:se-resize;pointer-events:auto;"></div>',
          '</div>',
        '</div>',
        // Sidebar
        '<div style="background:#111;border-left:1px solid #333;padding:20px;display:flex;',
        'flex-direction:column;gap:18px;overflow-y:auto;color:#fff;">',
          '<div style="font-size:18px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;',
          'font-family:\'Barlow Condensed\',sans-serif;">Image Crop</div>',
          // Ratio buttons
          '<div>',
            '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#888;text-transform:uppercase;margin-bottom:8px;">Crop Shape</div>',
            '<div id="cw-ratios" style="display:flex;gap:6px;">',
              '<button data-r="1.6" style="flex:1;padding:8px 4px;border-radius:4px;border:1px solid #E8500A;',
              'background:rgba(232,80,10,.15);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">',
              '16:10<br><span style="font-size:10px;color:#888;">Card</span></button>',
              '<button data-r="1.7778" style="flex:1;padding:8px 4px;border-radius:4px;border:1px solid #444;',
              'background:#1c1c1c;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">',
              '16:9<br><span style="font-size:10px;color:#888;">Hero</span></button>',
              '<button data-r="1" style="flex:1;padding:8px 4px;border-radius:4px;border:1px solid #444;',
              'background:#1c1c1c;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">',
              '1:1<br><span style="font-size:10px;color:#888;">Square</span></button>',
            '</div>',
          '</div>',
          // Preview
          '<div>',
            '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#888;text-transform:uppercase;margin-bottom:8px;">',
            'Preview <span id="cw-zoom" style="font-family:monospace;font-size:11px;color:#E8500A;background:rgba(232,80,10,.15);',
            'border:1px solid rgba(232,80,10,.3);padding:1px 6px;border-radius:3px;"></span></div>',
            '<div id="cw-preview-wrap" style="position:relative;overflow:hidden;border-radius:4px;background:#222;aspect-ratio:1.6;">',
              '<img id="cw-preview" src="' + self._imageUrl + '" style="position:absolute;height:auto;max-width:none;display:block;">',
            '</div>',
          '</div>',
          // Instructions
          '<div style="font-size:12px;color:#666;line-height:1.6;">',
            'Drag the frame to reposition.<br>Drag corners to zoom in/out.',
          '</div>',
          // Value display
          '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#888;text-transform:uppercase;">Crop Value</div>',
          '<code id="cw-result" style="font-size:11px;color:#E8500A;word-break:break-all;background:#1c1c1c;',
          'padding:8px;border-radius:4px;border:1px solid #333;">—</code>',
          // Buttons
          '<button id="cw-apply" style="background:#E8500A;color:#fff;font-weight:700;font-size:14px;',
          'padding:12px;border:none;border-radius:4px;cursor:pointer;text-transform:uppercase;',
          'letter-spacing:.08em;font-family:\'Barlow Condensed\',sans-serif;">✓ Apply Crop</button>',
          '<button id="cw-cancel" style="background:transparent;color:#888;border:1px solid #444;',
          'font-size:13px;padding:9px;border-radius:4px;cursor:pointer;">Cancel</button>',
        '</div>'
      ].join('');

      document.body.appendChild(el);
      this._modal = el;

      var canvas = el.querySelector('#cw-canvas');
      var img = el.querySelector('#cw-img');
      var frame = el.querySelector('#cw-frame');
      var previewWrap = el.querySelector('#cw-preview-wrap');
      var previewImg = el.querySelector('#cw-preview');
      var resultEl = el.querySelector('#cw-result');
      var zoomEl = el.querySelector('#cw-zoom');
      var applyBtn = el.querySelector('#cw-apply');
      var cancelBtn = el.querySelector('#cw-cancel');
      var ratioContainer = el.querySelector('#cw-ratios');

      self._frame = frame;
      self._previewImg = previewImg;
      self._previewWrap = previewWrap;
      self._resultEl = resultEl;
      self._zoomEl = zoomEl;

      // Image loaded → init layout
      img.addEventListener('load', function () {
        self._natW = img.naturalWidth;
        self._natH = img.naturalHeight;
        var cRect = canvas.getBoundingClientRect();
        var iRect = img.getBoundingClientRect();
        self._imgW = iRect.width;
        self._imgH = iRect.height;
        self._offX = iRect.left - cRect.left;
        self._offY = iRect.top - cRect.top;
        self._initFrame();
        self._updateFrame();
        self._updateResult();
        self._updatePreview();
      });

      if (img.complete && img.naturalWidth) img.dispatchEvent(new Event('load'));

      // Drag
      canvas.addEventListener('mousedown', function (e) {
        if (self._action) return;
        self._action = 'drag';
        self._px = e.clientX; self._py = e.clientY;
        self._fx0 = self._frameX; self._fy0 = self._frameY;
        e.preventDefault();
      });

      // Corner handle resize
      frame.querySelectorAll('[data-h]').forEach(function (hdl) {
        hdl.addEventListener('mousedown', function (e) {
          e.stopPropagation();
          self._action = 'r-' + hdl.dataset.h;
          self._px = e.clientX; self._py = e.clientY;
          self._fx0 = self._frameX; self._fy0 = self._frameY;
          self._fw0 = self._frameW; self._fh0 = self._frameH;
          e.preventDefault();
        });
      });

      self._mmHandler = function (e) { self._onMove(e, canvas); };
      self._muHandler = function () { self._action = null; };
      window.addEventListener('mousemove', self._mmHandler);
      window.addEventListener('mouseup', self._muHandler);

      // Ratio buttons
      ratioContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-r]');
        if (!btn) return;
        ratioContainer.querySelectorAll('[data-r]').forEach(function (b) {
          var active = b === btn;
          b.style.borderColor = active ? '#E8500A' : '#444';
          b.style.background = active ? 'rgba(232,80,10,.15)' : '#1c1c1c';
        });
        self._ratio = parseFloat(btn.dataset.r);
        previewWrap.style.aspectRatio = self._ratio;
        // Adjust frame height, keep center
        var cx = self._frameX + self._frameW / 2;
        var cy = self._frameY + self._frameH / 2;
        self._frameH = self._frameW / self._ratio;
        if (self._frameH > self._imgH) { self._frameH = self._imgH; self._frameW = self._frameH * self._ratio; }
        self._frameX = Math.max(self._offX, Math.min(self._offX + self._imgW - self._frameW, cx - self._frameW / 2));
        self._frameY = Math.max(self._offY, Math.min(self._offY + self._imgH - self._frameH, cy - self._frameH / 2));
        self._updateFrame();
        self._updateResult();
        self._updatePreview();
      });

      // Apply / Cancel
      applyBtn.addEventListener('click', function () {
        var val = self._computeResult();
        if (val) self.props.onChange(val);
        self._destroyModal();
        self.setState({ modalOpen: false });
      });

      cancelBtn.addEventListener('click', function () {
        self._destroyModal();
        self.setState({ modalOpen: false });
      });

      // ESC to close
      self._keyHandler = function (e) {
        if (e.key === 'Escape') {
          self._destroyModal();
          self.setState({ modalOpen: false });
        }
      };
      window.addEventListener('keydown', self._keyHandler);
    },

    _initFrame: function () {
      var saved = this.props.value || '';
      if (saved && saved.indexOf('x:') === 0) {
        var m = saved.match(/x:([\d.]+),y:([\d.]+),w:([\d.]+),h:([\d.]+)/);
        if (m) {
          this._frameW = (+m[3] / 100) * this._imgW;
          this._frameH = (+m[4] / 100) * this._imgH;
          this._frameX = this._offX + (+m[1] / 100) * this._imgW;
          this._frameY = this._offY + (+m[2] / 100) * this._imgH;
          return;
        }
      }
      // Default: ~80% width, centered
      this._frameW = this._imgW * 0.8;
      this._frameH = this._frameW / this._ratio;
      if (this._frameH > this._imgH * 0.9) {
        this._frameH = this._imgH * 0.9;
        this._frameW = this._frameH * this._ratio;
      }
      this._frameX = this._offX + (this._imgW - this._frameW) / 2;
      this._frameY = this._offY + (this._imgH - this._frameH) / 2;
    },

    _updateFrame: function () {
      if (!this._frame) return;
      this._frame.style.left = this._frameX + 'px';
      this._frame.style.top = this._frameY + 'px';
      this._frame.style.width = this._frameW + 'px';
      this._frame.style.height = this._frameH + 'px';
    },

    _computeResult: function () {
      if (!this._imgW || !this._natW) return null;
      var relX = this._frameX - this._offX;
      var relY = this._frameY - this._offY;
      var xP = Math.round((relX / this._imgW) * 100);
      var yP = Math.round((relY / this._imgH) * 100);
      var wP = Math.round((this._frameW / this._imgW) * 100);
      var hP = Math.round((this._frameH / this._imgH) * 100);
      var ar = (this._natW / this._natH).toFixed(4);
      return 'x:' + xP + ',y:' + yP + ',w:' + wP + ',h:' + hP + ',ar:' + ar;
    },

    _updateResult: function () {
      var val = this._computeResult();
      if (this._resultEl) this._resultEl.textContent = val || '—';
      if (this._zoomEl && val) {
        var m = val.match(/w:(\d+)/);
        if (m) this._zoomEl.textContent = (100 / parseInt(m[1])).toFixed(2) + '×';
      }
    },

    _updatePreview: function () {
      if (!this._previewImg || !this._imgW) return;
      var relX = this._frameX - this._offX;
      var relY = this._frameY - this._offY;
      var wP = (this._frameW / this._imgW) * 100;
      var xP = (relX / this._imgW) * 100;
      var yP = (relY / this._imgH) * 100;
      var iAR = this._natW / this._natH;
      this._previewImg.style.width = (10000 / wP).toFixed(2) + '%';
      this._previewImg.style.left = (-(xP / wP) * 100).toFixed(2) + '%';
      this._previewImg.style.top = (-(yP * this._ratio * 100) / (wP * iAR)).toFixed(2) + '%';
    },

    _onMove: function (e, canvas) {
      if (!this._action || !this._imgW) return;
      var dx = e.clientX - this._px;
      var dy = e.clientY - this._py;

      if (this._action === 'drag') {
        this._frameX = Math.max(this._offX, Math.min(this._offX + this._imgW - this._frameW, this._fx0 + dx));
        this._frameY = Math.max(this._offY, Math.min(this._offY + this._imgH - this._frameH, this._fy0 + dy));
      } else {
        var corner = this._action.slice(2);
        var newW = (corner === 'br' || corner === 'tr') ? this._fw0 + dx : this._fw0 - dx;
        newW = Math.max(MIN_FRAME, Math.min(this._imgW, newW));
        var newH = newW / this._ratio;
        if (newH > this._imgH) { newH = this._imgH; newW = newH * this._ratio; }

        var newX, newY;
        if (corner === 'br') { newX = this._fx0; newY = this._fy0; }
        else if (corner === 'bl') { newX = this._fx0 + this._fw0 - newW; newY = this._fy0; }
        else if (corner === 'tr') { newX = this._fx0; newY = this._fy0 + this._fh0 - newH; }
        else { newX = this._fx0 + this._fw0 - newW; newY = this._fy0 + this._fh0 - newH; }

        this._frameX = Math.max(this._offX, Math.min(this._offX + this._imgW - newW, newX));
        this._frameY = Math.max(this._offY, Math.min(this._offY + this._imgH - newH, newY));
        this._frameW = newW;
        this._frameH = newH;
      }
      this._updateFrame();
      this._updateResult();
      this._updatePreview();
    },

    _destroyModal: function () {
      if (this._modal) {
        this._modal.parentNode && this._modal.parentNode.removeChild(this._modal);
        this._modal = null;
      }
      if (this._mmHandler) { window.removeEventListener('mousemove', this._mmHandler); this._mmHandler = null; }
      if (this._muHandler) { window.removeEventListener('mouseup', this._muHandler); this._muHandler = null; }
      if (this._keyHandler) { window.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    },

    // ── RENDER ──────────────────────────────────────────────────
    render: function () {
      var self = this;
      var currentVal = this.props.value || '—';

      var btnStyle = {
        display: 'inline-block', background: '#E8500A', color: '#fff',
        fontWeight: '700', fontSize: '13px', padding: '10px 18px',
        borderRadius: '4px', border: 'none', cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em'
      };

      return h('div', { style: { fontFamily: 'Inter, sans-serif' }, ref: function (el) { self._rootEl = el; } },
        h('button', {
          style: btnStyle,
          onClick: function () { self.openModal(); }
        }, '🎯 Adjust Image Crop'),
        h('p', { style: { fontSize: '11px', color: '#888', marginTop: '8px' } },
          'Upload a Cover Image above first, then click the button.',
          h('br'),
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
