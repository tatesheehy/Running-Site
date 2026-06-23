// Custom Decap CMS widget: "wa-prs"
// Replaces the standard PR list with an inline World Athletics fetcher.
// Stores data as [{event, time}] — same format as the old list widget.

(function () {
  'use strict';

  const { React, CMS } = window;
  if (!React || !CMS) return;

  const e = React.createElement;
  const { useState } = React;

  const API = '/.netlify/functions/wa-athlete';

  const S = {
    wrap: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, color: '#333' },
    fetchBox: { background: '#f4f6f8', border: '1px solid #d0d8e0', borderRadius: 6, padding: '10px 12px', marginBottom: 12 },
    fetchLabel: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#555', marginBottom: 6 },
    row: { display: 'flex', gap: 8 },
    input: { flex: 1, padding: '7px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, outline: 'none', minWidth: 0 },
    btn: (bg) => ({ padding: '7px 14px', background: bg || '#E8500A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }),
    btnSm: (bg) => ({ padding: '4px 10px', background: bg || '#555', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }),
    err: { color: '#c00', fontSize: 12, marginTop: 5 },
    hint: { color: '#999', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
    sectionHead: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#888', margin: '10px 0 4px' },
    prRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderBottom: '1px solid #eee', cursor: 'pointer' },
    indoorTag: { fontSize: 10, background: '#dbeafe', color: '#1d4ed8', borderRadius: 3, padding: '1px 5px', fontWeight: 700 },
    chips: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 4px' },
    chip: { padding: '4px 12px', background: '#e8f0fe', border: '1px solid #93c5fd', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1d4ed8' },
    savedRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: '#f9f9f9', border: '1px solid #e8e8e8', borderRadius: 4, marginBottom: 4 },
    mono: { fontFamily: "'Courier New', monospace", fontWeight: 700 },
    removeBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 'auto', padding: '0 2px' },
  };

  function WAPrsControl({ value, onChange }) {
    const current = Array.isArray(value) ? value : [];

    const [waInput, setWaInput]   = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [athletes, setAthletes] = useState([]);   // name-search results
    const [outdoor, setOutdoor]   = useState([]);
    const [indoor, setIndoor]     = useState([]);
    const [checked, setChecked]   = useState(new Set());

    const allFetched = [...outdoor, ...indoor];
    const hasFetched = allFetched.length > 0;

    async function doFetch() {
      const q = waInput.trim();
      if (!q) return;
      setLoading(true);
      setError('');
      setAthletes([]);
      setOutdoor([]);
      setIndoor([]);
      setChecked(new Set());

      try {
        const isUrl = q.startsWith('http');
        const url   = isUrl
          ? `${API}?url=${encodeURIComponent(q)}`
          : `${API}?action=search&name=${encodeURIComponent(q)}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.athletes) {
          // Name search → show athlete chips
          setAthletes(data.athletes);
        } else {
          // URL fetch or direct result → show PRs
          applyPRData(data);
        }
      } catch (err) {
        setError(err.message.includes('fetch')
          ? 'Could not connect. This only works on the live Netlify site.'
          : err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchAthlete(url) {
      setLoading(true);
      setError('');
      setAthletes([]);
      try {
        const res  = await fetch(`${API}?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        applyPRData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    function applyPRData(data) {
      const out = data.outdoor || [];
      const ind = data.indoor  || [];
      setOutdoor(out);
      setIndoor(ind);
      // Auto-select first 4 outdoor PRs
      const auto = new Set(out.slice(0, 4).map((_, i) => i));
      setChecked(auto);
      onChange(out.slice(0, 4).map(p => ({ event: p.event, time: p.time })));
    }

    function toggleCheck(idx) {
      const all  = [...outdoor, ...indoor];
      const next = new Set(checked);
      if (next.has(idx)) {
        next.delete(idx);
      } else if (next.size < 4) {
        next.add(idx);
      } else {
        return; // max 4
      }
      setChecked(next);
      onChange([...next].sort((a, b) => a - b).map(i => ({ event: all[i].event, time: all[i].time })));
    }

    function removeCurrent(idx) {
      const next = current.filter((_, i) => i !== idx);
      onChange(next);
      if (hasFetched) {
        const all = [...outdoor, ...indoor];
        const nextChecked = new Set();
        next.forEach(p => {
          const i = all.findIndex(f => f.event === p.event && f.time === p.time);
          if (i !== -1) nextChecked.add(i);
        });
        setChecked(nextChecked);
      }
    }

    function updateCurrent(idx, field, val) {
      const next = current.map((p, i) => i === idx ? { ...p, [field]: val } : p);
      onChange(next);
    }

    function addManual() {
      if (current.length >= 4) return;
      onChange([...current, { event: '', time: '' }]);
    }

    // ── render ──
    return e('div', { style: S.wrap },

      // WA fetch box
      e('div', { style: S.fetchBox },
        e('label', { style: S.fetchLabel }, '⚡ Auto-fill from World Athletics'),
        e('div', { style: S.row },
          e('input', {
            type: 'text',
            value: waInput,
            onChange: ev => setWaInput(ev.target.value),
            onKeyDown: ev => ev.key === 'Enter' && doFetch(),
            placeholder: 'Athlete name  –or–  paste worldathletics.org/athletes/… URL',
            style: S.input,
          }),
          e('button', {
            type: 'button',
            onClick: doFetch,
            disabled: loading || !waInput.trim(),
            style: { ...S.btn(), opacity: (loading || !waInput.trim()) ? .45 : 1 },
          }, loading ? '…' : 'Fetch'),
        ),
        error && e('div', { style: S.err }, '⚠ ' + error),
        e('div', { style: S.hint }, 'Live site only — requires Netlify Functions.'),
      ),

      // Athlete chips (name-search results)
      athletes.length > 0 && e('div', null,
        e('div', { style: S.sectionHead }, 'Select athlete:'),
        e('div', { style: S.chips },
          athletes.map((a, i) =>
            e('button', { key: i, type: 'button', style: S.chip, onClick: () => fetchAthlete(a.url) },
              a.name + (a.country ? ' · ' + a.country : ''))
          )
        )
      ),

      // PR checkboxes (after WA fetch)
      hasFetched && e('div', null,
        e('div', { style: S.sectionHead }, `Select up to 4  (${checked.size} selected):`),

        outdoor.length > 0 && e('div', null,
          e('div', { style: { fontSize: 11, color: '#aaa', marginBottom: 2 } }, 'OUTDOOR'),
          outdoor.map((pr, i) =>
            e('label', { key: 'o' + i, style: S.prRow },
              e('input', {
                type: 'checkbox',
                checked: checked.has(i),
                onChange: () => toggleCheck(i),
                disabled: !checked.has(i) && checked.size >= 4,
              }),
              e('span', { style: { fontWeight: 700, minWidth: 52 } }, pr.event),
              e('span', { style: S.mono }, pr.time),
              e('span', { style: { color: '#bbb', marginLeft: 'auto', fontSize: 11 } }, pr.venue),
            )
          )
        ),

        indoor.length > 0 && e('div', { style: { marginTop: 8 } },
          e('div', { style: { fontSize: 11, color: '#aaa', marginBottom: 2 } }, 'INDOOR'),
          indoor.map((pr, i) => {
            const idx = outdoor.length + i;
            return e('label', { key: 'in' + i, style: S.prRow },
              e('input', {
                type: 'checkbox',
                checked: checked.has(idx),
                onChange: () => toggleCheck(idx),
                disabled: !checked.has(idx) && checked.size >= 4,
              }),
              e('span', { style: { fontWeight: 700, minWidth: 52 } }, pr.event),
              e('span', { style: S.mono }, pr.time),
              e('span', { style: S.indoorTag }, 'Indoor'),
              e('span', { style: { color: '#bbb', marginLeft: 'auto', fontSize: 11 } }, pr.venue),
            );
          })
        ),
      ),

      // Current saved PRs
      e('div', { style: { marginTop: hasFetched ? 14 : 0 } },
        e('div', { style: S.sectionHead }, `Saved PRs (${current.length} / 4):`),

        current.length === 0
          ? e('div', { style: S.hint },
              hasFetched ? 'Check boxes above to add PRs.' : 'No PRs yet. Fetch from WA or add manually.')
          : current.map((pr, i) =>
              hasFetched
                // Read-only row when WA data is loaded (controlled via checkboxes)
                ? e('div', { key: i, style: S.savedRow },
                    e('span', { style: { fontWeight: 700, minWidth: 52 } }, pr.event),
                    e('span', { style: S.mono }, pr.time),
                    e('button', { type: 'button', style: S.removeBtn, onClick: () => removeCurrent(i) }, '×'),
                  )
                // Editable row when no WA data
                : e('div', { key: i, style: { ...S.row, marginBottom: 6 } },
                    e('input', {
                      value: pr.event,
                      placeholder: 'Event (e.g. 1500m)',
                      onChange: ev => updateCurrent(i, 'event', ev.target.value),
                      style: { ...S.input, flex: '0 0 120px' },
                    }),
                    e('input', {
                      value: pr.time,
                      placeholder: 'Time (e.g. 3:26.73)',
                      onChange: ev => updateCurrent(i, 'time', ev.target.value),
                      style: S.input,
                    }),
                    e('button', { type: 'button', style: S.removeBtn, onClick: () => removeCurrent(i) }, '×'),
                  )
            ),

        !hasFetched && current.length < 4 &&
          e('button', { type: 'button', style: { ...S.btnSm(), marginTop: 8 }, onClick: addManual },
            '+ Add PR manually'),
      ),
    );
  }

  function WAPrsPreview({ value }) {
    const prs = Array.isArray(value) ? value : [];
    if (!prs.length) return e('em', null, 'No PRs');
    return e('ul', { style: { margin: 0, paddingLeft: 18, fontFamily: 'monospace' } },
      prs.map((p, i) => e('li', { key: i }, p.event + ': ' + p.time))
    );
  }

  CMS.registerWidget('wa-prs', WAPrsControl, WAPrsPreview);

})();
