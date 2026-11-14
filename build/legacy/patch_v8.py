import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
s = open(S + '/app_world3.js').read()
def rep(a, b):
    global s
    assert a in s, 'MISSING: ' + a[:110]
    s = s.replace(a, b, 1)
# close-up portraits: a token is shown cropped to head and shoulders, as in Turnip Works
rep("""      <div class="portrait" data-portrait="${pc.id}" title="Drop an image here, or pick a token below">
        <img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span>""",
    """      <div class="portrait${isToken(tok.src) ? ' closeup' : ''}" data-portrait="${pc.id}" title="Drop an image here, or pick a token below">
        <img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span>""")
rep("""<button class="${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this token"><img src="${o}" alt="" draggable="false"></button>""",
    """<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this token"><img src="${o}" alt="" draggable="false"></button>""")
rep("function liveOf(pc) {", """const isToken = src => /assets\\/tokens\\//.test(src || '');
// fill every section: scale its contents (CSS zoom) until they exactly fill the box, so no sheet carries dead space
function fitSections(box) {
  box.querySelectorAll('.main > section:not(.sP)').forEach(sec => {
    let f = sec.querySelector(':scope > .fit');
    if (!f) { f = document.createElement('div'); f.className = 'fit'; while (sec.firstChild) f.appendChild(sec.firstChild); sec.appendChild(f); }
    const sr = sec.getBoundingClientRect(); if (!sr.height) return;
    const W = sec.clientWidth;
    let lo = 0.45, hi = 2.6;
    const wide = () => [...f.querySelectorAll('.acol, .sk, .ahead, .budget > div, .der > div, .list > div, .track, .asof, .roll, .grid4, .der, .budget')].some(e => e.scrollWidth > e.clientWidth + 1) || [...f.querySelectorAll('.sk .k, .ahead .an')].some(k => { const r = k.getBoundingClientRect(), p2 = k.closest('.sk, .ahead').getBoundingClientRect(); return r.right > p2.right + 0.5; });
    for (let i = 0; i < 11; i++) { const mid = (lo + hi) / 2; f.style.zoom = mid; f.style.width = (W / mid) + 'px';
      if (f.getBoundingClientRect().height <= sr.height * 0.98 && !wide()) lo = mid; else hi = mid; }
    f.style.zoom = lo; f.style.width = (W / lo) + 'px'; f.dataset.z = lo.toFixed(2);
  });
}
function liveOf(pc) {""")
# summons strip only for summoners; otherwise the gear section takes its space
rep("    <section class=\"sS\">${summonsHtml(pc, ch, S, W8)}</section>", "    ${R.canSummon(ch) ? `<section class=\"sS\">${summonsHtml(pc, ch, S, W8)}</section>` : ''}")
rep("    <section class=\"sC\">", "    <section class=\"sC${R.canSummon(ch) ? '' : ' tall'}\">")
rep("  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);\n  renderQuick(); dirty = true;",
    "  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);\n  fitSections(box);\n  renderQuick(); dirty = true;")
rep("""  const src = state.portraits[pc.id] || options[0] || '';
  return { src, options };""", """  const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
  const src = close(state.portraits[pc.id] || options[0] || '');
  return { src, options: options.map(close) };""")
open(S + '/app_world3.js', 'w').write(s)

q = open(S + '/qbar_table.js').read()
q = q.replace('<li class="${i === turn.at ? \'on\' : \'\'}"><img src="${tok}" alt="" draggable="false">', '<li class="${i === turn.at ? \'on\' : \'\'}"><span class="${isToken(tok) ? \'closeup\' : \'\'} rimg"><img src="${tok}" alt="" draggable="false"></span>')
open(S + '/qbar_table.js', 'w').write(q)
b = open(S + '/sessions_block.js').read()
b = b.replace("""<div class="sgh" data-go="${sj.go}">${sj.icon ? `<img src="${sj.icon}" alt="" draggable="false">` : '<span class="tdot">?</span>'}""",
              """<div class="sgh" data-go="${sj.go}">${sj.icon ? `<span class="sgimg ${isToken(sj.icon) ? 'closeup' : ''}"><img src="${sj.icon}" alt="" draggable="false"></span>` : '<span class="tdot">?</span>'}""")
open(S + '/sessions_block.js', 'w').write(b)
print('ok')
