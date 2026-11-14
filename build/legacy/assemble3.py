import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '')

# ---------- world script: app_world3 (patch_v4 output) + sessions block + table/quickbar
w = open(S + '/app_world3.js').read()
def wrep(a, b):
    global w
    assert a in w, 'WORLD MISSING: ' + a[:100]
    w = w.replace(a, b, 1)
def wcut(a, b, new):
    global w
    i = w.index(a); j = w.index(b, i)
    w = w[:i] + new + w[j:]
wcut("const sideY0 = rowsTop + SLOTS * RH;", "// ------------------------------------------------------------------ the map: the anchor",
     "const MH = rowsTop + SLOTS * RH;\nconst MW = Math.round(MH * (MAP.width / MAP.height));\nconst PX = MW + 160;                                        // party column x, on the map's right edge\n\n")
wcut("// rows behind everything", "// loose notes", open(S + '/sessions_block.js').read())
w = w[:w.index("// ------------------------------------------------------------------ the quickbar: the table at a glance")]
w = w.rstrip()
w += "\n" + open(S + '/qbar_table.js').read()
wrep("const TBX = colX(3), TBY = -1900, TBW = 2 * colW + colGap, TBH = 900;", "const TBX = SX, TBY = -1340, TBW = (SBW - SGAP) / 2, TBH = 900;")
wrep("const diceCard = add(world, 'card tablecard', colX(5), TBY, TBW, TBH, '');", "const diceCard = add(world, 'card tablecard', SX + TBW + SGAP, TBY, TBW, TBH, '');")
wrep("reg('dice', { el: diceCard, title: 'Dice tray', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });", "reg('dice', { el: diceCard, title: 'Dice tray', kind: 'table', box: { x: SX + TBW + SGAP, y: TBY, w: TBW, h: TBH } });")
wrep("{ id: 'n-1', x: colX(nS + 1) + 90, y: -560,", "{ id: 'n-1', x: IBX + 60, y: SY + 300,")
wrep("{ id: 'n-2', x: colX(nS + 1) + 470, y: -440,", "{ id: 'n-2', x: IBX + 440, y: SY + 420,")
w += "\nconst lanes = [];\n"
w += open(S + '/acts3_extra.js').read() + open(S + '/keys.js').read()
open(S + '/app_world4.js', 'w').write(w)

# ---------- engine: from the v1.5 page, with the v2/v3 changes, minus rulers, nav bar, palette and help
src = open(S + '/index.v15.html').read()
start = src.index('// ------------------------------------------------------------------ camera')
eng = src[start:src.index('</script>', start)]
def rep(a, b):
    global eng
    if a not in eng:
        print('ENGINE SKIP (not present): ' + a[:90]); return
    eng = eng.replace(a, b, 1)
def cut(a, b, new):
    global eng
    i = eng.index(a); j = eng.index(b, i)
    eng = eng[:i] + new + eng[j:]
rep("const MIN_S = 0.03, MAX_S = 9;", "const MIN_S = 0.02, MAX_S = 14;")
cut("function flyTo(id) {", "function flash(id)", """function flyTo(id) {
  if (id.startsWith('b-') || id.startsWith('builder-')) { flyToBuilder(id); return; }
  const b = boxOf(id);
  if (!b) return;
  flash(id);
  flyToView(viewFor(b, 1.06));
}
const BSCALE = BK_K;
function flyToBuilder(id) {
  const pcId = id.replace(/^b-|^builder-/, '').replace(/-(name|meta|attr|skills|magic|cyber|gear|veh|deck|circles|life|done)$/, '');
  const sb = nodes[pcId].box, bx = sb.x + BREG.x, by = sb.y + BREG.y;
  if (id.startsWith('builder-')) { flash(id); flyToView(viewFor({ x: bx, y: by, w: BREG.w, h: BREG.h }, 1.06)); return; }
  const e = sheetEls[pcId].querySelector(`[data-id="${id}"]`); if (!e) return;
  const col = e.parentElement, x = bx + col.offsetLeft * BK_K, y = by + (col.offsetTop + e.offsetTop) * BK_K, w = BIW * BK_K;
  const h = Math.min(e.offsetHeight * BK_K, w * H() / W() * 1.3);
  setBuild(pcId, id.split('-').pop());
  flash(id); flyToView(viewFor({ x, y, w, h }, 1.08));
}
""")
cut("function overview() {", "function goBack()", "function overview() { flyToView(viewFor(BOUNDS, 1.02)); }\nfunction syncHist() {}\n")
cut("function rulers() {", "const anchors = [", "function rulers() {}\n")
cut("const anchors = [", "arrowsEl.innerHTML", """const anchors = [
  { id: 'a-book', label: 'Rulebook', icon: 'assets/genre-modern.png', target: 'book-ssr2' },
  { id: 'a-map', label: 'Map', icon: 'assets/type-OFC.png', target: 'map' },
  { id: 'a-party', label: 'Party', icon: 'assets/tool-pawns.png', target: 'party', box: { x: PX, y: -900, w: SW, h: SLOTS * RH + 900 } },
  { id: 'a-sessions', label: 'Sessions', icon: 'assets/tool-build.png', target: 's1', box: { x: SX, y: SY, w: SBW, h: py - SY } },
  { id: 'a-table', label: 'At the table', icon: 'assets/tool-build.png', target: 'round', box: { x: SX, y: TBY, w: SBW, h: TBH } },
];
""")
cut("function drawThreads() {", "// ------------------------------------------------------------------ frame loop", "")
rep("if (dirty) { dirty = false; lodPass(); rulers(); edgeArrows(); drawThreads(); pagesPass(); }",
    "if (dirty) { dirty = false; labelPass(); edgeArrows(); drawThreads(); pagesPass(); }")
rep("function frame() {", """function labelPass() {
  for (const l of labels) { const f = l.size * cam.s; const lo = l.over ? 40 : 70, hi = l.over ? 110 : 260; const end = l.over ? 0 : 0.05;
    const o = f <= lo ? 0.9 : f >= hi ? end : 0.9 - (f - lo) / (hi - lo) * (0.9 - end); if (l._o !== o) { l.e.style.opacity = o.toFixed(2); l.e.style.visibility = o < 0.01 ? 'hidden' : ''; l._o = o; } }
}
function frame() {""")
rep("let pan = null, pinch = null, dragNote = null; const ptrs = new Map();", "let pan = null, pinch = null; const ptrs = new Map();")
rep("const interactive = t => t.closest('button, input, select, a, [contenteditable], .chip, .tend, .arrow, [data-go], .opt, [data-act]');",
    "const interactive = t => t.closest('button, input, select, textarea, label, a, [contenteditable], .chip, .tend, .arrow, [data-go], .opt, [data-act], [data-tok], .portrait');")
if "  const opt = ev.target.closest('.opt');" in eng:
    a = eng.index("  const opt = ev.target.closest('.opt');"); b = eng.index("  const pn = ev.target.closest('[data-pin]');")
    eng = eng[:a] + "  const act = ev.target.closest('[data-act]'); if (act && act.tagName === 'BUTTON' && !act.disabled) { doAct(act); return; }\n" + eng[b:]
rep("  const pn = ev.target.closest('[data-pin]'); if (pn) { const id = pn.dataset.pin; state.pins = state.pins.includes(id) ? state.pins.filter(x => x !== id) : [...state.pins, id]; persist(); renderPins(); pn.classList.toggle('on'); return; }\n", "")
eng = eng.replace("const v = ev.target.closest('.v[data-prov]');", "const v = ev.target.closest('.main .pv[data-prov]');")
eng = eng.replace("document.querySelectorAll('.v.pinned')", "document.querySelectorAll('.pv.pinned')")
eng = eng.replace("ev.target.closest?.('.v[data-prov]')", "ev.target.closest?.('.main .pv[data-prov]')")
cut("document.addEventListener('input', ev => {", "document.addEventListener('keydown'", open(S + '/acts2.js').read().replace("renderQuick();\n", "") )
rep("""  if (act === 'newpc') {""" if False else "if (a.dataset.act === 'newpc') {", "if (a.dataset.act === 'finish') { endBuild(true); return; }\n  if (a.dataset.act === 'newpc') {")
cut("$('#bBack').onclick = goBack;", "window.addEventListener('resize', apply);", "")
cut("// ------------------------------------------------------------------ pins + jump palette", "// ------------------------------------------------------------------ start", "")
rep("function viewFor(b, pad = 1.18) { const w = Math.max(b.w * pad, b.h * pad * W() / H()); return [b.x + b.w / 2, b.y + b.h / 2, Math.max(w, W() / MAX_S)]; }",
    "function viewFor(b, pad = 1.18) { const eh = Math.max(240, H() - 70); const w = Math.max(b.w * pad, b.h * pad * W() / eh, W() / MAX_S); return [b.x + b.w / 2, b.y + b.h / 2 - 35 * w / W(), w]; }")
i = eng.index('// ------------------------------------------------------------------ start'); j = eng.index('window.almanac', i)
eng = eng[:i] + "// ------------------------------------------------------------------ start: the whole cluster\nsetView(viewFor(BOUNDS, 1.02));\n" + eng[j:]
rep("window.almanac = { cam, flyTo, nodes, setView, viewFor, overview };",
    "window.almanac = { cam, flyTo, nodes, setView, viewFor, overview, state, R, renderSheet, pcById, sheetEls, newRunner, BK_K, BREG, BINNER, setBuild, pdfState: () => ({ ok: !!pdfDoc, failed: pdfFailed }) };")
# acts2 renderQuick at its end -> renderTable is called from renderSheet already

# ---------- page
head = src[:src.index('<style>')]
css = open(S + '/css_keep_a.css').read() + open(S + '/css_book.css').read() + open(S + '/css_builder_old.css').read() + open(S + '/css_v2.css').read() + open(S + '/css_keep_b.css').read() + open(S + '/css_v3.css').read() + open(S + '/css_v4.css').read()
body = """
<div id="vp" aria-label="Campaign canvas"><div id="world"></div></div>
<svg id="threads"></svg>
<div id="tends"></div>
<div id="arrows"></div>
<div id="toast" hidden></div>
<div id="qbar" role="search"><button id="qback" hidden title="Back (⌘[)" aria-label="Back">‹</button><svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><textarea id="qin" rows="1" spellcheck="false" placeholder="Jump or do: tusk guns, roll 6 tn 4, new runner, round order…" aria-label="Quickbar"></textarea><kbd>/</kbd></div>
<div id="qres" hidden></div>
"""
scripts = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>\n'
           '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"></script>\n'
           '<script src="rigs/ssr2.js"></script>\n<script src="campaign.js"></script>\n<script src="assets/map/map.js"></script>\n<script src="assets/tokens/tokens.js"></script>\n<script>\n')
out = head + '<style>' + css + '</style>' + body + scripts + open(S + '/app_world4.js').read() + '\n' + eng + '</script>\n'
open(P + 'index.html', 'w').write(out)
print('written', len(out))
import re as _re
_s = open(P + 'index.html').read()
_s = _re.sub(r"window\.almanac = \{[^\n]*\};", "window.almanac = { cam, flyTo, nodes, setView, viewFor, overview, state, R, renderSheet, pcById, sheetEls, newRunner, BK_K, BREG, BINNER, setBuild, BOUNDS, pdfState: () => ({ ok: !!pdfDoc, failed: pdfFailed }) };", _s, count=1)
open(P + 'index.html', 'w').write(_s)
_s = open(P + 'index.html').read()
for _a, _b in [
    ("function syncHist() {}", "function syncHist() { const b = document.getElementById('qback'); if (b) b.hidden = !hist.back.length; }"),
    ("const rho = Math.SQRT2, rho2 = 2, rho4 = 4;", "const rho = 2, rho2 = 4, rho4 = 16;   // wider than van Wijk's √2: a link pulls well back so you see where you are going (Harry, 13 Nov)"),
    ("dur = Math.min(1800, Math.max(450, it.duration * 0.9))", "dur = Math.min(2600, Math.max(800, it.duration * 1.1))"),
    ("reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: 330, h: 180 } });",
     "const k = nt.k || 1; e.style.transform = `scale(${k})`; e.style.transformOrigin = '0 0';   // note scale: made at the zoom you were at\n  reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: 330 * k, h: 180 * k } });"),
    ("nodes[n.nt.id].box = { x: n.nt.x, y: n.nt.y, w: 220, h: 120 }", "nodes[n.nt.id].box = { ...nodes[n.nt.id].box, x: n.nt.x, y: n.nt.y }"),
    ("const nt = { id: 'n-' + Date.now().toString(36), x: wx - 110, y: wy - 20, text: '' };", "const k = Math.max(0.05, Math.min(60, 0.85 / cam.s)); const nt = { id: 'n-' + Date.now().toString(36), x: wx - 110 * k, y: wy - 20 * k, k, text: '' };"),
    ("  if (cam.s < 0.6) { setTimeout(() => e.querySelector('.body').focus(), 900); flyToView(viewFor({ x: nt.x - 200, y: nt.y - 150, w: 620, h: 420 })); }\n  else e.querySelector('.body').focus();", "  e.querySelector('.body').focus({ preventScroll: true });"),
    ("const nt = { id: 'n-' + Date.now().toString(36), x: cam.x + lastPt.x / cam.s - 165, y: cam.y + lastPt.y / cam.s - 40, text: text.slice(0, 2000) };", "const k = Math.max(0.05, Math.min(60, 0.85 / cam.s)); const nt = { id: 'n-' + Date.now().toString(36), x: cam.x + lastPt.x / cam.s - 165 * k, y: cam.y + lastPt.y / cam.s - 40 * k, k, text: text.slice(0, 2000) };"),
    ("vp.addEventListener('wheel', ev => {", "vp.addEventListener('wheel', ev => {\n  { const sc = ev.target.closest?.('.scrolly'); if (sc && !ev.ctrlKey && !ev.metaKey && sc.scrollHeight > sc.clientHeight + 2) { ev.preventDefault(); sc.scrollTop += ev.deltaY / cam.s; return; } }"),
    ("const TBX = SX, TBY = -1340, TBW = (SBW - SGAP) / 2, TBH = 900;", "const TBX = SX, TBY = -1340, TBW = (SBW - 2 * SGAP) / 3, TBH = 900;"),
    ("const diceCard = add(world, 'card tablecard', SX + TBW + SGAP, TBY, TBW, TBH, '');\nconst logCard = add(world, 'card tablecard logcard', colX(5), TBY, TBW, TBH, '');", "const diceCard = add(world, 'card tablecard', SX + TBW + SGAP, TBY, TBW, TBH, '');\nconst logCard = add(world, 'card tablecard logcard', SX + 2 * (TBW + SGAP), TBY, TBW, TBH, '');"),
    ("reg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });", "reg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: SX + 2 * (TBW + SGAP), y: TBY, w: TBW, h: TBH } });"),
    ("<div class=\"grip\"><button aria-label=\"Delete note\">✕</button></div><div class=\"body\" contenteditable=\"true\" spellcheck=\"false\"></div>`);", "<div class=\"grip\"><span class=\"dots\"></span><button aria-label=\"Delete note\">✕</button></div><div class=\"body\" contenteditable=\"true\" spellcheck=\"false\"></div><div class=\"rsz\" title=\"Drag to resize\"></div>`);"),
    ("const k = nt.k || 1; e.style.transform = `scale(${k})`; e.style.transformOrigin = '0 0';   // note scale: made at the zoom you were at\n  reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: 330 * k, h: 180 * k } });",
     "if (!nt.w) { const k = nt.k || 1; nt.w = 330 * k; nt.h = 180 * k; }   // a free rectangle: made at the zoom you were at, then any size and shape\n  reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: nt.w, h: nt.h } });\n  requestAnimationFrame(() => sizeNote(nt, e));"),
    ("const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;", "const ease = t => 1 - Math.pow(1 - t, 3);   // fast out, slow in: the pull-back takes ~20% of the flight, the dive the rest, easing to a stop (Harry, 13 Nov)"),
    ("  const b = boxOf(id);\n  if (!b) return;\n  flash(id);", "  let b = boxOf(id);\n  if (!b) return;\n  if (nodes[id]?.kind === 'character') b = { ...b, w: b.w + 210 };   // the sheet and its pocket tab\n  flash(id);"),
]:
    assert _a in _s, 'POST MISSING: ' + _a[:60]
    _s = _s.replace(_a, _b, 1)
open(P + 'index.html', 'w').write(_s)
print('post-processed')
_s = open(P + 'index.html').read()
if not _s.startswith('<!doctype html>'): open(P + 'index.html', 'w').write('<!doctype html>\n' + _s)   # standards mode everywhere: locally, in clones, and (harmlessly) inside the artifact wrapper
