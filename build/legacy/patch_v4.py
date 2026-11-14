import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
s = open(S + '/app_world2.js').read()
def rep(a, b):
    global s
    assert a in s, 'MISSING: ' + a[:100]
    s = s.replace(a, b, 1)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i)
    s = s[:i] + new + s[j:]

# state
rep("extra: saved.extra || [], asof: {} };", "extra: saved.extra || [], portraits: saved.portraits || {}, art: saved.art || [], done: saved.done || {}, asof: {}, build: null };")
rep("rolls: state.rolls, extra: state.extra });", "rolls: state.rolls, extra: state.extra, portraits: state.portraits, art: state.art, done: state.done });")

# geometry: map left, party on its right edge, sessions continuing right; rulebook above the map
cut("// ------------------------------------------------------------------ geometry (world units)", "// ------------------------------------------------------------------ the map: the anchor", """// ------------------------------------------------------------------ geometry (world units)
// Tight clusters at every scale, about the golden ratio: the whole canvas, each sheet (2100 × 1300), the builder block.
const MAP = window.MAPMETA || { width: 9000, height: 8000 };
const SW = 2100, SH = 1300, RH = SH + 60, SLOTS = 6;       // party: six seats down the map's right edge
const rowsTop = 40;
const pcRowY = i => rowsTop + i * RH;
const sideY0 = rowsTop + SLOTS * RH;                        // people and threads rows start here
const SIDE_H = 430;
const MH = sideY0 + (C.npcs.length + C.threads.length) * SIDE_H + 40;
const MW = Math.round(MH * (MAP.width / MAP.height));
const PX = MW + 160;                                        // party column x
const SX = PX + SW + 220, colW = 680, colGap = 40, nS = C.sessions.length;
const colX = i => SX + i * (colW + colGap);
const nowX = colX(nS) - colGap / 2;
const L = { col0: SX, colW, nowX, headX: PX };
""")
rep("""<img class="mapimg" src="${MAP.src || ''}" alt="Street map of central Seattle" ${MAP.src ? '' : 'hidden'}>""",
    """<img class="mapimg" src="${MAP.src || ''}" alt="Street map of central Seattle" draggable="false" ${MAP.src ? '' : 'hidden'}>""")
rep("label(mapEl, 'Seattle · the sprawl', 260, 120, 420, { cls: 'onmap', over: true });", "label(mapEl, 'Seattle · the sprawl', 300, 160, 520, { cls: 'onmap', over: true });")
# places scale up with the bigger map
rep("const e = add(mapEl, 'place', x - 170, y - 170, 340, null,", "const e = add(mapEl, 'place', x - 220, y - 220, 440, null,")
rep("box: { x: x - 170, y: y - 170, w: 340, h: 520 } });", "box: { x: x - 220, y: y - 220, w: 440, h: 640 } });")
# book above the map
rep("const IDXW = 1300, bookW = 40 + IDXW + 60 + 2 * PW + PG + 40, BX = PX - 320 - bookW, BY = 0;",
    "const IDXW = 1300, bookW = 40 + IDXW + 60 + 2 * PW + PG + 40, BX = 0;")
rep("const bookH = pagesY + 2 * PH + PG + 60;", "const bookH = pagesY + 2 * PH + PG + 60, BY = -bookH - 260;")
rep("add(world, 'card interpcard', BX, BY + bookH + 60, bookW, 300,", "add(world, 'card interpcard', BX + bookW + 120, BY + bookH - 520, 1700, 520,")

# builder: four packed columns plus All done; a small box in the sheet's bottom-left corner
rep("const BCOLS = [['name', 'meta', 'attr', 'life'], ['skills', 'deck'], ['magic', 'circles'], ['cyber', 'veh'], ['gear']];",
    "const BCOLS = [['name', 'meta', 'attr', 'life', 'deck'], ['skills', 'magic'], ['cyber', 'veh'], ['gear', 'circles', 'done']];\nconst ORDER = ['name', 'meta', 'attr', 'skills', 'magic', 'cyber', 'gear', 'veh', 'deck', 'circles', 'life', 'done'];\nconst STEP_RULE = { name: 'p-sheet', meta: 'p-meta', attr: 'p-attr', skills: 'p-skillcost', magic: 'p-trad', cyber: 'p-cyber', gear: 'p-gear', veh: 'p-veh', deck: 'p-decks', circles: 'p-circles', life: 'p-life', done: 'p-start' };\nconst STEP_SHEET = { name: '.nm', meta: '.who', attr: '.grid4', skills: '.grid4', magic: '.l-magic', cyber: '.l-cyber', gear: '.l-gear', veh: '.l-veh', deck: '.l-veh', circles: '.l-circles', life: '.l-life', done: '.budget' };")
rep("const BIW = 880, BGAP = 40, BREG = { x: 2440, y: 30, w: SW - 2440 - 30, h: SH - 60 };",
    "const BIW = 880, BGAP = 40, BINNER = { w: 30 + 4 * BIW + 3 * BGAP + 30, h: 2860 }, BREG = { x: 30, y: 950, w: 440, h: 320 };")
rep("const BK_K = BREG.w / (BCOLS.length * BIW + (BCOLS.length - 1) * BGAP + 60);", "const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);")
rep("STEP_NAME = { meta: 'metatype',", "STEP_NAME = { done: 'all done', meta: 'metatype',")
rep("  if (key === 'life') {", """  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3><span class="sub">${S.left} of 100 left</span></div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? (S.left > 0 ? `Legal, with ${S.left} point${S.left === 1 ? '' : 's'} unspent` : 'Legal and fully spent') : 'Not legal yet'}</b>
      <div>${S.pts} points spent · Essence ${S.essence} of 60 · Magic cap ${S.magicCap}</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves.</span></button>`;
  }
  if (key === 'life') {""")
rep("function builderInner(pc, S) {\n  return BCOLS.map((col, i) => `<div class=\"bcol\" style=\"left:${30 + i * (BIW + BGAP)}px;width:${BIW}px\">${col.map(k => stepHtml(pc, S, k)).join('')}</div>`).join('');",
    "function builderInner(pc, S) {\n  return BCOLS.map((col, i) => `<div class=\"bcol\" style=\"left:${30 + i * (BIW + BGAP)}px;width:${BIW}px\">${col.map(k => stepHtml(pc, S, k)).join('')}</div>`).join('');")

# sheet: two bands, portrait top-right, builder box bottom-left
a = s.index("  box.innerHTML = `\n    <div class=\"main\">"); b = s.index("  const bl = el('div', 'lbl blbl', 'CHARACTER BUILDER');")
s = s[:a] + """  const tok = portraitOf(pc, S);
  box.innerHTML = `
    <div class="main">
    <section class="sA">
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget">
        <div class="${S.left < 0 ? 'over' : ''}"><div class="k">Points ${chip(P.start)}</div><div class="bv">${pv('pts', S.pts)} <span class="tn">/ 100 · ${S.left} left</span></div><div class="bar"><i style="width:${Math.min(100, S.pts)}%"></i></div></div>
        <div><div class="k">Essence</div><div class="bv">${pv('essence', S.essence)} <span class="tn">/ 60 · cap ${S.magicCap}</span></div><div class="bar"><i style="width:${Math.max(0, S.essence) / 60 * 100}%"></i></div></div>
        <div><div class="k">Karma ${chip(P.karma)}</div><div class="bv">${kLeft} <span class="tn">free · ${S.karma.earned} in</span></div><div class="bar"><i style="width:${S.karma.earned ? S.karma.spent / S.karma.earned * 100 : 0}%"></i></div></div>
      </div>
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
    </section>
    <section class="sB">
      <h4>Attributes & skills ${chip(P.rolls, 'rolls p.3')}</h4>
      <div class="grid4">${cols}</div>
    </section>
    <section class="sP">
      <div class="portrait" data-portrait="${pc.id}" title="Drop an image here, or pick a token below">
        <img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span>
      </div>
      <div class="tokens">${tok.options.map(o => `<button class="${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this token"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
    </section>
    <section class="sD">
      <div class="der">
        <div><div class="k">Actions</div>${pv('actions', S.actions, 'mid')}${S.rig ? `<small>rigging ${S.actions + S.rig}</small>` : ''}${S.deck ? `<small>deck ${S.deck.actions}</small>` : ''}</div>
        <div><div class="k">Armor</div>${pv('armor', S.armor, 'mid')}<small>${S.outfit ? esc(S.outfit.name) : 'no outfit'}</small></div>
        <div><div class="k">Health</div>${pv('health', S.health, 'mid')}<small>3 + Body</small></div>
        <div><div class="k">Essence</div>${pv('essence', S.essence, 'mid')}<small>of 60</small></div>
        <div><div class="k">Cash</div><span class="pv mid" data-prov="cash" tabindex="0">¥${S.cash.toLocaleString()}</span><small>${S.life ? esc(S.life.name) : 'no lifestyle'}</small></div>
      </div>
      <div class="track"><span class="k">Damage ${chip(P.combat)}</span>${track}<span class="wound">${W8.filled ? (S.adept ? 'Adept: no wound penalty' : `Wounded: TN +${W8.tn}`) : ''}</span><button class="die wide" data-act="roll" data-pc="${pc.id}" data-skill="soak" data-soak="1">Soak ⚄</button></div>
      <div class="rolls">${(state.rolls[pc.id] || []).slice(0, 2).map(rollHtml).join('') || '<div class="none">Tap ⚄ beside a skill to roll it.</div>'}</div>
    </section>
    <section class="sL">
      <div class="sec">Where the points went</div><div class="ledger">${S.spend.map(x => `<div><span>${esc(x.label)}</span><span>${x.pts}</span></div>`).join('') || '<div><span>Nothing bought yet</span><span>0</span></div>'}</div>
    </section>
    <section class="sC">
      <h4>Gear, ware & magic</h4>
      <div class="cols2">
        <div class="l-cyber"><div class="sec">Cyberware ${chip(P.cyber)}</div><div class="list">${listOr(S.cyber, c => `<div><b>${esc(c.name)}${c.n > 1 ? ' ×' + c.n : ''}</b> <span class="e">${esc(c.eff)}${c.id === 'skillwires' && ch.wire ? ` (${R.SK_NAME[ch.wire]})` : ''}</span></div>`)}</div></div>
        <div class="l-gear"><div class="sec">Weapons & gear ${chip(P.gear)}</div><div class="list">${listOr(S.gear, g => `<div><b>${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}</b> <span class="e">${esc(g.eff)}</span></div>`)}${S.trollDmg ? '<div class="e">Troll: +1 damage, melee and unarmed.</div>' : ''}</div></div>
        <div class="l-magic"><div class="sec">Magic ${chip(P.magic)}</div><div class="list">${S.trad ? `<div><b>${esc(S.trad.name)}</b></div>` + S.spells.map(sp => `<div><b>${esc(sp.name)}</b> <span class="e">[${esc(sp.eff)}]${sp.free ? ' · free' : ''}${sp.karma ? ` · ${chip(sp.karma, 'karma')}` : ''}</span></div>`).join('') : '<div class="none">No tradition</div>'}</div></div>
        <div class="l-veh"><div class="sec">Vehicles, deck & chips ${chip(P.veh)}</div><div class="list">${listOr([...S.veh.map(v => `<div><b>${esc(v.name)}${v.n > 1 ? ' ×' + v.n : ''}</b> <span class="e">HP ${v.hp}, armor ${v.armor}</span></div>`), ...(S.deck ? [`<div><b>${esc(S.deck.name)}</b> <span class="e">Actions ${S.deck.actions}</span></div>`] : []), ...S.chips.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${c.kind} ${c.tier[1]}</span></div>`)], x => x)}</div></div>
        <div class="l-circles"><div class="sec">Social circles ${chip(P.circles)}</div><div class="list">${circleRows.join('') || '<div class="none">None</div>'}</div></div>
        <div class="l-life"><div class="sec">Lifestyle</div><div class="list">${S.life ? `<div><b>${esc(S.life.name)}</b> <span class="e">${S.life.tool} · ¥${S.life.cash.toLocaleString()}</span></div>` : '<div class="none">None</div>'}</div></div>
      </div>
    </section>
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
""" + s[b:]
rep("const bl = el('div', 'lbl blbl', 'CHARACTER BUILDER'); bl.style.fontSize = '150px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 150, over: true });",
    "const bl = el('div', 'lbl blbl', 'CHARACTER<br>BUILDER'); bl.style.fontSize = '64px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 64, over: true });\n  if (state.done[pc.id] === false || (!ch.meta && !state.done[pc.id])) box.querySelector('.builder').classList.add('todo');")
rep("const bl = el('div', 'lbl blbl', 'CHARACTER<br>BUILDER');", "const bl = el('div', 'lbl blbl'); bl.innerHTML = 'CHARACTER<br>BUILDER';")
# portraits
rep("function liveOf(pc) {", """// portraits: an uploaded image, else the Turnip Works runner token that best fits the build
const TOKENS = ['adept-elf-f', 'adept-human-m', 'adept-troll-f', 'decker-dwarf-m', 'decker-elf-f', 'decker-human-f', 'face-elf-m', 'face-human-f', 'face-ork-m', 'mage-dwarf-m', 'mage-elf-m', 'mage-human-f', 'merc-dwarf-m', 'merc-ork-m', 'merc-troll-f', 'rigger-dwarf-f', 'rigger-human-m', 'rigger-ork-m', 'shaman-human-f', 'shaman-ork-f', 'shaman-troll-m', 'street-samurai-elf-f', 'street-samurai-human-m', 'street-samurai-ork-f', 'street-samurai-troll-m', 'technomancer-dwarf-f', 'technomancer-human-m'];
const TOKEN_FILES = window.TOKEN_FILES || {};
function archetypeOf(ch, S) {
  if (ch.trad === 'adept') return 'adept'; if (ch.trad === 'shaman') return 'shaman'; if (ch.trad === 'hermetic') return 'mage';
  if (ch.cyber?.vcr || Object.keys(ch.veh || {}).length) return 'rigger'; if (ch.deck) return 'decker';
  if (ch.cyber?.wired || ch.cyber?.dermal) return 'street-samurai'; if ((ch.skills?.persuade || 1) + (ch.skills?.etiquette || 1) > 6) return 'face';
  return ch.meta ? 'merc' : null;
}
function portraitOf(pc, S) {
  const ch = choicesOf(pc), arch = archetypeOf(ch, S), meta = ch.meta;
  const score = t => (arch && t.startsWith(arch + '-') ? 4 : 0) + (meta && t.includes('-' + meta + '-') ? 2 : 0);
  const ranked = TOKENS.map(t => [score(t), t]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).map(x => TOKEN_FILES[x[1]]).filter(Boolean);
  const options = ranked.slice(0, 4);
  const src = state.portraits[pc.id] || options[0] || '';
  return { src, options };
}
function liveOf(pc) {""")
rep("function placeSheet(pc, slot) {", """function placeSheet(pc, slot) {
  if (sheetEls[pc.id]) { sheetEls[pc.id].remove(); }""")
# bands: start at the party column, run through the sessions
rep("rows.forEach((r, i) => { const b = el('div', 'n lane' + (i % 2 ? ' alt' : '')); place(b, PX - 30, r.y - 15, colX(nS + 1) - PX + 30, r.h + 30); b.dataset.band = 1; bandEls.push(b); });",
    "rows.forEach((r, i) => { const b = el('div', 'n lane' + (i % 2 ? ' alt' : '')); place(b, PX - 40, r.y - 20, colX(nS + 1) - PX + 40, r.h + 40); b.dataset.band = 1; bandEls.push(b); });")
rep("for (let i = 0; i < SLOTS; i++) rows.push({ y: pcRowY(i), h: SH, kind: 'seat', i });", "for (let i = 0; i < SLOTS; i++) rows.push({ y: pcRowY(i), h: SH, kind: 'seat', i });")
rep("forEach((r, j) => rows.push({ ...r, y: sideY0 + j * SIDE_H, h: SIDE_H - 40 }));", "forEach((r, j) => rows.push({ ...r, y: sideY0 + j * SIDE_H, h: SIDE_H - 50 }));")
# launcher straddles the map's top-right corner onto the party
rep("const launch = add(world, 'launch', PX, -900, SW + 1700, 760,", "const launch = add(world, 'launch', PX - 1900, -900, SW + 1900, 760,")
rep("reg('launch', { el: launch, title: 'Build a new runner', kind: 'action', icon: 'assets/tool-pawns.png', box: { x: PX, y: -900, w: SW + 1700, h: 760 } });",
    "reg('launch', { el: launch, title: 'Build a new runner', kind: 'action', icon: 'assets/tool-pawns.png', box: { x: PX - 1900, y: -900, w: SW + 1900, h: 760 } });")
rep("label(world, 'The party', PX, -1240, 300);", "label(world, 'The party', PX, -1240, 300);\nlabel(world, 'The map', 0, -260 - 0, 1, {});")
rep("label(world, 'The map', 0, -260 - 0, 1, {});", "")
# people/thread heads narrower
rep("const e = add(world, 'lanehead card', PX, r.y, 1500, r.h,", "const e = add(world, 'lanehead card', PX, r.y, SW, r.h,")
rep("box: { x: PX, y: r.y, w: 1500, h: r.h } });", "box: { x: PX, y: r.y, w: SW, h: r.h } });")
# inbox and notes positions follow the sessions
open(S + '/app_world3.js', 'w').write(s)
print('ok', len(s))
