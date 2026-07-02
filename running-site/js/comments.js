// ============================================================
//  COMMENTS — buildCommentsSection(articleId)
// ============================================================

async function buildCommentsSection(articleId) {
  const el = document.getElementById('comments-section');
  if (!el) return;

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function loadData(sb, user) {
    if (!sb) return { comments: [], voteMap: {} };
    const { data: comments, error } = await sb
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });
    if (error || !comments?.length) return { comments: comments || [], voteMap: {} };

    const ids = comments.map(c => c.id);
    const { data: votes } = await sb.from('comment_votes').select('*').in('comment_id', ids);

    const voteMap = {};
    for (const c of comments) voteMap[c.id] = { score: 0, userVote: 0 };
    for (const v of (votes || [])) {
      voteMap[v.comment_id].score += v.vote;
      if (user && v.user_id === user.id) voteMap[v.comment_id].userVote = v.vote;
    }
    return { comments, voteMap };
  }

  async function render() {
    const sb   = typeof getSupabase    === 'function' ? getSupabase()    : null;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const { comments, voteMap } = await loadData(sb, user);

    const upSvg   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 14H4z"/></svg>`;
    const downSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-14h16z"/></svg>`;

    const commentItems = comments.length
      ? comments.map(c => {
          const isOwn   = user && c.user_id === user.id;
          const name    = c.username || 'Anonymous';
          const vm      = voteMap[c.id] || { score: 0, userVote: 0 };
          const scoreLabel = vm.score > 0 ? `+${vm.score}` : String(vm.score);
          const nextUp   = vm.userVote === 1  ? 0 : 1;
          const nextDown = vm.userVote === -1 ? 0 : -1;
          return `
            <div class="cmt-item" data-id="${escHtml(c.id)}">
              <div class="cmt-avatar">${name[0].toUpperCase()}</div>
              <div class="cmt-content">
                <div class="cmt-header">
                  <span class="cmt-name">${escHtml(name)}</span>
                  <span class="cmt-time">${timeAgo(c.created_at)}</span>
                  ${isOwn ? `<button class="cmt-delete" onclick="window._deleteComment('${escHtml(c.id)}')" title="Delete" aria-label="Delete comment">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>` : ''}
                </div>
                <p class="cmt-body">${escHtml(c.body)}</p>
                <div class="cmt-votes">
                  <button class="cmt-vote-btn cmt-vote-up${vm.userVote === 1 ? ' active' : ''}"
                    onclick="window._voteComment('${escHtml(c.id)}',${nextUp})" title="Upvote" aria-label="Upvote">
                    ${upSvg}
                  </button>
                  <span class="cmt-score${vm.score > 0 ? ' positive' : vm.score < 0 ? ' negative' : ''}">${scoreLabel}</span>
                  <button class="cmt-vote-btn cmt-vote-down${vm.userVote === -1 ? ' active' : ''}"
                    onclick="window._voteComment('${escHtml(c.id)}',${nextDown})" title="Downvote" aria-label="Downvote">
                    ${downSvg}
                  </button>
                </div>
              </div>
            </div>`;
        }).join('')
      : '<p class="cmt-empty">No comments yet — be the first to share your thoughts.</p>';

    const formHtml = user
      ? `<form class="cmt-form" onsubmit="window._submitComment(event,'${escHtml(articleId)}')">
           <textarea class="cmt-input" placeholder="Share your thoughts…" maxlength="1000" rows="3" required></textarea>
           <div class="cmt-form-footer">
             <span class="cmt-char-hint">Max 1000 characters</span>
             <button type="submit" class="cmt-submit">Post Comment</button>
           </div>
           <p id="cmt-error" class="cmt-error"></p>
         </form>`
      : `<div class="cmt-signin-prompt">
           <button onclick="openAuthModal()" class="cmt-signin-btn">Sign in to comment</button>
         </div>`;

    el.innerHTML = `
      <div class="cmt-section">
        <h2 class="cmt-title">
          Comments
          ${comments.length ? `<span class="cmt-count">${comments.length}</span>` : ''}
        </h2>
        <div id="cmt-list">${commentItems}</div>
        ${formHtml}
      </div>`;
  }

  window._submitComment = async function(e, artId) {
    e.preventDefault();
    const sb   = typeof getSupabase    === 'function' ? getSupabase()    : null;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user || !sb) return;
    const form     = e.target;
    const textarea = form.querySelector('.cmt-input');
    const errEl    = document.getElementById('cmt-error');
    const body     = textarea?.value.trim();
    if (!body) return;
    const username = (typeof getUsername === 'function' ? getUsername() : '') || user.email.split('@')[0];
    const btn = form.querySelector('.cmt-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }
    const { error } = await sb.from('comments').insert({ article_id: artId, user_id: user.id, username, body });
    if (error) {
      if (errEl) errEl.textContent = error.message;
      if (btn) { btn.disabled = false; btn.textContent = 'Post Comment'; }
    } else {
      if (textarea) textarea.value = '';
      await render();
    }
  };

  window._deleteComment = async function(commentId) {
    const sb = typeof getSupabase === 'function' ? getSupabase() : null;
    if (!sb) return;
    await sb.from('comments').delete().eq('id', commentId);
    await render();
  };

  window._voteComment = async function(commentId, voteValue) {
    const sb   = typeof getSupabase    === 'function' ? getSupabase()    : null;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
    if (!sb) return;
    if (voteValue === 0) {
      await sb.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await sb.from('comment_votes')
        .upsert({ comment_id: commentId, user_id: user.id, vote: voteValue }, { onConflict: 'comment_id,user_id' });
    }
    await render();
  };

  el.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:8px 0">Loading comments…</p>';
  const check = setInterval(() => {
    if (typeof getCurrentUser !== 'undefined') { clearInterval(check); render(); }
  }, 50);
  setTimeout(() => { clearInterval(check); render(); }, 2000);
}
