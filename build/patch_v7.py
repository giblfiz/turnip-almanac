import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
s = open(S + '/app_world3.js').read()
def rep(a, b):
    global s
    assert a in s, 'MISSING: ' + a[:110]
    s = s.replace(a, b, 1)
# a roll button for each tool: the skill it is used with, labelled with the tool
rep("function rollHtml(r) {", """function toolRolls(pc, S, key, toolLabel) {
  return (R.TOOL_SKILL[key] || []).map(sk => `<button class="die sm" data-act="roll" data-pc="${pc.id}" data-skill="${sk}" data-tool="${esc(toolLabel)}" title="Roll ${R.SK_NAME[sk]} with ${esc(toolLabel)}: ${S.skill[sk]}d6">⚄ ${R.SK_NAME[sk]} ${S.skill[sk]}</button>`).join('');
}
function rollHtml(r) {""")
rep("""<div class="list">${listOr(S.cyber, c => `<div><b>${esc(c.name)}${c.n > 1 ? ' ×' + c.n : ''}</b> <span class="e">${esc(c.eff)}${c.id === 'skillwires' && ch.wire ? ` (${R.SK_NAME[ch.wire]})` : ''}</span></div>`)}</div>""",
    """<div class="list">${listOr(S.cyber, c => `<div><b>${esc(c.name)}${c.n > 1 ? ' ×' + c.n : ''}</b> <span class="e">${esc(c.eff)}${c.id === 'skillwires' && ch.wire ? ` (${R.SK_NAME[ch.wire]})` : ''}</span> ${toolRolls(pc, S, c.id, c.name)}</div>`)}</div>""")
rep("""<div class="list">${listOr(S.gear, g => `<div><b>${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}</b> <span class="e">${esc(g.eff)}</span></div>`)}""",
    """<div class="list">${listOr(S.gear, g => `<div><b>${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}</b> <span class="e">${esc(g.eff)}</span> ${toolRolls(pc, S, g.id, g.name + (g.eff.match(/\\[[^\\]]+\\]/) ? ' ' + g.eff.match(/\\[[^\\]]+\\]/)[0] : ''))}</div>`)}""")
rep("""S.spells.map(sp => `<div><b>${esc(sp.name)}</b> <span class="e">[${esc(sp.eff)}]${sp.free ? ' · free' : ''}${sp.karma ? ` · ${chip(sp.karma, 'karma')}` : ''}</span></div>`).join('')""",
    """S.spells.map(sp => `<div><b>${esc(sp.name)}</b> <span class="e">[${esc(sp.eff)}]${sp.free ? ' · free' : ''}${sp.karma ? ` · ${chip(sp.karma, 'karma')}` : ''}</span> ${toolRolls(pc, S, 'spell', sp.name)}</div>`).join('')""")
rep("""...S.veh.map(v => `<div><b>${esc(v.name)}${v.n > 1 ? ' ×' + v.n : ''}</b> <span class="e">HP ${v.hp}, armor ${v.armor}</span></div>`), ...(S.deck ? [`<div><b>${esc(S.deck.name)}</b> <span class="e">Actions ${S.deck.actions}</span></div>`] : [])""",
    """...S.veh.map(v => `<div><b>${esc(v.name)}${v.n > 1 ? ' ×' + v.n : ''}</b> <span class="e">HP ${v.hp}, armor ${v.armor}</span> ${toolRolls(pc, S, 'veh', v.name)}</div>`), ...(S.deck ? [`<div><b>${esc(S.deck.name)}</b> <span class="e">Actions ${S.deck.actions}</span> ${toolRolls(pc, S, 'deck', S.deck.name)}</div>`] : [])""")
rep("""const circleRows = S.circles.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${esc(Object.values(R.CIRCLE_LV).find(l => l.tool === c.tool).name.toLowerCase())} ${c.tool}${c.free ? ' · free' : ''}</span></div>`);""",
    """const circleRows = S.circles.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${esc(c.level.toLowerCase())} ${c.tool}${c.free ? ' · free' : ''}</span> ${toolRolls(pc, S, 'circle', `${c.name} ${c.level.toLowerCase()} ${c.tool}`)}</div>`);""")
rep("""<div class="list">${S.life ? `<div><b>${esc(S.life.name)}</b> <span class="e">${S.life.tool} · ¥${S.life.cash.toLocaleString()}</span></div>` : '<div class="none">None</div>'}</div>""",
    """<div class="list">${S.life ? `<div><b>${esc(S.life.name)}</b> <span class="e">${S.life.tool} · ¥${S.life.cash.toLocaleString()}</span> ${toolRolls(pc, S, 'life', `${S.life.name} lifestyle ${S.life.tool}`)}</div>` : '<div class="none">None</div>'}</div>""")
# the summon's little sheet: a card of its own
rep("""<div class="mrow"><span class="info">Body 2 · Coordination 2 · Mental 2 · Social 2</span><span class="info">Actions ${t.actions}</span></div>""",
    """<div class="mrow"><span class="info">Body 2 · Coordination 2 · Mental 2 · Social 2 · Actions ${t.actions}</span></div>""")
open(S + '/app_world3.js', 'w').write(s)

a = open(S + '/acts2.js').read()
old = "  r.label = `${choicesOf(pc).name || 'Runner'} · ${soak ? 'Soak' : R.SK_NAME[skill]}`;"
if old in a: a = a.replace(old, "  r.label = `${choicesOf(pc).name || 'Runner'} · ${srcEl?.dataset?.tool ? srcEl.dataset.tool + ' · ' : ''}${soak ? 'Soak' : R.SK_NAME[skill]}`;", 1)
open(S + '/acts2.js', 'w').write(a)

# threads: drawn ON the canvas, in world units; translucent; no labels; end dots fly to the far end
x = open(S + '/acts3_extra.js').read()
if 'wthreads' not in x:
  i = x.index('// ---- threads: provenance'); j = x.index('// ---- portraits and art')
  x = x[:i] + """// ---- threads: drawn on the canvas in world units, so they scale with everything else
const wsvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); wsvg.setAttribute('class', 'wthreads'); world.appendChild(wsvg);
function worldRect(e) {
  let x = e; while (x && !x.getClientRects().length) x = x.parentElement; if (!x) return null;
  const r = x.getBoundingClientRect(); return { x: cam.x + r.left / cam.s, y: cam.y + r.top / cam.s, w: r.width / cam.s, h: r.height / cam.s };
}
function nearPt(r, to) { return [Math.max(r.x, Math.min(r.x + r.w, to[0])), Math.max(r.y, Math.min(r.y + r.h, to[1]))]; }
function drawThreads() {
  let d = '';
  const link = (eA, eB, goB, cls = '') => {
    const A = eA && worldRect(eA), B = eB && worldRect(eB); if (!A || !B) return;
    const ca = [A.x + A.w / 2, A.y + A.h / 2], cb = [B.x + B.w / 2, B.y + B.h / 2];
    const [x0, y0] = nearPt(A, cb), [x1, y1] = nearPt(B, ca);
    const len = Math.hypot(x1 - x0, y1 - y0), lift = Math.min(900, 60 + len * 0.12), mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift;
    const w = Math.max(3, Math.min(14, len / 300));
    d += `<path class="${cls}" style="stroke-width:${w}px" d="M${x0},${y0} Q${mx},${my} ${x1},${y1}"/><circle class="${cls}" cx="${x0}" cy="${y0}" r="${w * 2.2}"/><circle class="${cls} far" ${goB ? `data-go="${goB}"` : ''} cx="${x1}" cy="${y1}" r="${w * 2.6}"><title>Fly there</title></circle>`;
  };
  if (threadSrc) {
    const box = sheetEls[threadSrc.pcId], vEl = box?.querySelector(`.main [data-prov="${threadSrc.key}"]`);
    if (vEl) (box._prov[threadSrc.key] || []).forEach(id => { const n = nodes[id]; if (n?.el) link(vEl, n.el, id); });
  }
  if (state.build) {
    const { pc, key } = state.build, box = sheetEls[pc];
    const stepEl = box?.querySelector(`[data-id="b-${pc}-${key}"]`), rule = STEP_RULE[key];
    link(stepEl, nodes[rule]?.el, rule, 'build');
    link(stepEl, box?.querySelector('.main ' + STEP_SHEET[key]), pc, 'build');
  }
  if (d !== wsvg._d) { wsvg.innerHTML = d; wsvg._d = d; }
  threadsSvg.innerHTML = ''; tends.innerHTML = '';
}

""" + x[j:]
open(S + '/acts3_extra.js', 'w').write(x)
print('ok')
