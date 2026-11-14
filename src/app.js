
(() => {
'use strict';
// Turnip Almanac. One tight cluster: book | party | the map (the anchor) | sessions.
// Nothing changes what it shows when you zoom. Big headline labels sit over regions and fade only once
// they are bigger than the detail under them.
const C = window.CAMPAIGN, R = window.RIG;
const $ = (s, r = document) => r.querySelector(s);
const vp = $('#vp'), world = $('#world');
const store = {
  get() { try { return JSON.parse(localStorage.getItem('turnip-almanac-2') || '{}'); } catch { return {}; } },
  set(v) { try { localStorage.setItem('turnip-almanac-2', JSON.stringify(v)); } catch {} },
};
const saved = store.get();
const state = { notes: saved.notes || null, pins: saved.pins || ['pc-tusk', 'map', 'now'], live: saved.live || {}, choices: saved.choices || {}, rolls: saved.rolls || {}, extra: saved.extra || [], portraits: saved.portraits || {}, art: saved.art || [], done: saved.done || {}, summons: saved.summons || {}, summonPick: {}, asof: {}, build: null };
let dirty = true;
let openPop = null;
const qdice = { pool: 4, tn: 4 };
const persist = () => store.set({ notes: state.notes, pins: state.pins, live: state.live, choices: state.choices, rolls: state.rolls, extra: state.extra, portraits: state.portraits, art: state.art, done: state.done, summons: state.summons });

const nodes = {};
const lodNodes = new Set();                       // kept for the engine; nothing registers LOD any more
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function place(e, x, y, w, h) { e.style.left = x + 'px'; e.style.top = y + 'px'; if (w != null) e.style.width = w + 'px'; if (h != null) e.style.height = h + 'px'; }
function reg(id, o) { o.id = id; nodes[id] = o; if (o.el) o.el.dataset.id = id; return o; }
function add(parent, cls, x, y, w, h, html) { const e = el('div', 'n ' + cls, html); place(e, x, y, w, h); parent.appendChild(e); return e; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// headline label: big readable text laid over a region; fades as it grows past readable
const labels = [];
function label(parent, text, x, y, size, opts = {}) {
  const e = add(parent, 'lbl' + (opts.cls ? ' ' + opts.cls : ''), x, y, opts.w ?? null, null, esc(text));
  e.style.fontSize = size + 'px'; if (opts.align) e.style.textAlign = opts.align;
  labels.push({ e, size, over: !!opts.over }); return e;
}

const printIndex = Object.fromEntries(C.print.map(p => [p.id, p]));
const placeIndex = Object.fromEntries(C.places.map(p => [p.id, p]));
const npcIndex = Object.fromEntries(C.npcs.map(p => [p.id, p]));
function titleOf(id) { return printIndex[id]?.title || placeIndex[id]?.name || npcIndex[id]?.name || nodes[id]?.title || id; }
const backlinks = {};
function linkify(text, fromId) {
  return esc(text).replace(/\{\{([\w-]+)\}\}/g, (_, id) => {
    (backlinks[id] = backlinks[id] || []).push(fromId);
    const g = placeIndex[id]?.icon; const pg = printIndex[id] ? ` <small>p.${printIndex[id].page}</small>` : '';
    return `<span class="chip" data-go="${id}">${g ? `<img src="${g}" alt="">` : ''}${esc(titleOf(id))}${pg}</span>`;
  });
}

// ------------------------------------------------------------------ geometry (world units)
// Tight clusters at every scale, about the golden ratio: the whole canvas, each sheet (2100 × 1300), the builder block.
const MAP = window.MAPMETA || { width: 9000, height: 8000 };
const SW = 2100, SH = 1300, RH = SH + 60, SLOTS = 6;       // party: six seats down the map's right edge
const rowsTop = 40;
const pcRowY = i => rowsTop + i * RH;
const MH = rowsTop + SLOTS * RH;
const MW = Math.round(MH * (MAP.width / MAP.height));
const PX = MW + 160;                                        // party column x, on the map's right edge

// ------------------------------------------------------------------ the map: the anchor
const mapEl = add(world, 'map', 0, 0, MW, MH, `<img class="mapimg" src="${MAP.src || ''}" alt="Street map of central Seattle" draggable="false" ${MAP.src ? '' : 'hidden'}>`);
reg('map', { el: mapEl, title: 'Campaign map · Seattle', kind: 'map', icon: 'assets/type-OFC.png', box: { x: 0, y: 0, w: MW, h: MH } });
label(mapEl, 'Seattle · the sprawl', 300, 160, 520, { cls: 'onmap', over: true });
add(mapEl, 'attrib', MW - 1500, MH - 110, 1440, 80, esc(MAP.attribution || 'Map data © OpenStreetMap contributors, ODbL'));
C.places.forEach(p => {
  const pt = (MAP.points || {})[p.key] || { fx: p.x / 1400, fy: p.y / 1000 };
  const x = pt.fx * MW, y = pt.fy * MH;
  const e = add(mapEl, 'place', x - 220, y - 220, 440, null, `<img class="pi" src="${p.icon}" alt=""><div class="pn">${esc(p.name)}</div><div class="pnote">${esc(p.note)}</div><a class="tw" href="https://turnipworks.net/" target="_blank" rel="noopener">Open table in Turnip Works ↗</a><div class="backs"></div>`);
  reg(p.id, { el: e, title: p.name, kind: 'place', icon: p.icon, box: { x: x - 220, y: y - 220, w: 440, h: 640 } });
});

// ------------------------------------------------------------------ the shelf: Harry's book, its index beside its real pages
const BK = C.book, PW = 1000, PH = Math.round(PW * BK.ph / BK.pw), PG = 60;
const IDXW = 1300, bookW = 40 + IDXW + 60 + 2 * PW + PG + 40, BX = 0;
const pagesX = 40 + IDXW + 60, pagesY = 260;
const bookH = pagesY + 2 * PH + PG + 60, BY = -bookH - 260;
const bk = add(world, 'bk', BX, BY, bookW, bookH, `<div class="bhead"><img src="assets/genre-modern.png" alt=""><div><h2>${esc(BK.title)} 2e</h2><div class="t">${esc(BK.sub)} · the rules this campaign runs on</div></div></div>`);
reg(BK.id, { el: bk, title: BK.title + ' 2e', kind: 'book', icon: 'assets/genre-modern.png', box: { x: BX, y: BY, w: bookW, h: bookH } });
label(world, 'The rulebook', BX, BY - 420, 300);
let iy = 260;
BK.chapters.forEach(ch => {
  add(bk, 'chap', 40, iy, IDXW, 40, esc(ch.title)); iy += 50;
  const es = C.print.filter(p => p.page === ch.page);
  es.forEach((p, i) => {
    const x = 40 + (i % 4) * 326, y = iy + Math.floor(i / 4) * 150;
    const ce = add(bk, 'entry card', x, y, 316, 140, `<h3>${esc(p.title)}</h3><div class="t">${esc(p.text)}</div><div class="pg"><span class="chip" data-go="${p.id}">page ${p.page}</span> <span class="backs"></span></div>`);
    reg('idx-' + p.id, { el: ce, title: p.title, kind: 'index', box: { x: BX + x, y: BY + y, w: 316, h: 140 } });
  });
  iy += Math.ceil(es.length / 4) * 150 + 24;
});
const pageFrames = [];
for (let n = 1; n <= BK.pages; n++) {
  const px = pagesX + ((n - 1) % 2) * (PW + PG), py = pagesY + Math.floor((n - 1) / 2) * (PH + PG);
  const pf = add(bk, 'pagef', px, py, PW, PH, `<div class="ph">${n}</div><div class="cv"></div>`);
  label(pf, String(n), PW - 170, 20, 200, { cls: 'pnumlbl', over: true });
  pageFrames.push(reg('page-' + n, { el: pf, title: `${BK.title} · page ${n}`, kind: 'page', box: { x: BX + px, y: BY + py, w: PW, h: PH }, n }));
}
C.print.forEach(p => {
  const k = PW / BK.pw, [x, y, w, h] = p.rect, pf = nodes['page-' + p.page];
  const re = add(pf.el, 'region', x * k - 6, y * k - 6, w * k + 12, h * k + 12, `<span class="rt">${esc(p.title)}</span>`);
  reg(p.id, { el: re, title: p.title, kind: 'rule', sub: `p.${p.page}`, text: p.text, box: { x: pf.box.x + x * k - 6, y: pf.box.y + y * k - 6, w: w * k + 12, h: h * k + 12 } });
});
add(world, 'card interpcard', BX + bookW + 120, BY + bookH - 520, 1700, 520, `<h3>Where this book is open, the Almanac decides</h3><div class="t">${R.interpretations.map(esc).join('<br>')}</div>`);

// ------------------------------------------------------------------ party: sheets as rows down the map's left edge
const clone = o => JSON.parse(JSON.stringify(o));
const PCS = [...C.pcs, ...state.extra];
const pcById = Object.fromEntries(PCS.map(p => [p.id, p]));
function choicesOf(pc) { return state.choices[pc.id] || (state.choices[pc.id] = clone(pc.choices || R.blank(''))); }
const sheetEls = {};
const STEP_NAME = { done: 'all done', meta: 'metatype', attr: 'attributes', skills: 'skills', magic: 'magic', cyber: 'cyberware', gear: 'gear', veh: 'vehicles', deck: 'deck & chips', circles: 'social circles', life: 'lifestyle', name: 'name' };
const resolveSrc = (pc, id) => id.startsWith('B:') ? `b-${pc.id}-${id.slice(2)}` : id;
// builder: fixed columns, so nothing ever moves when a choice opens a step
const BCOLS = [['name', 'meta', 'attr', 'life', 'deck'], ['skills', 'magic'], ['cyber', 'veh'], ['gear', 'circles', 'done']];
const ORDER = ['name', 'meta', 'attr', 'skills', 'magic', 'cyber', 'gear', 'veh', 'deck', 'circles', 'life', 'done'];
const STEP_RULE = { name: 'p-sheet', meta: 'p-meta', attr: 'p-attr', skills: 'p-skillcost', magic: 'p-trad', cyber: 'p-cyber', gear: 'p-gear', veh: 'p-veh', deck: 'p-decks', circles: 'p-circles', life: 'p-life', done: 'p-start' };
const STEP_SHEET = { name: '.nm', meta: '.who', attr: '.grid4', skills: '.grid4', magic: '.l-magic', cyber: '.l-cyber', gear: '.l-gear', veh: '.l-veh', deck: '.l-veh', circles: '.l-circles', life: '.l-life', done: '.budget' };
const BIW = 880, BGAP = 40, BINNER = { w: 30 + 4 * BIW + 3 * BGAP + 30, h: 2860 }, BREG = { x: 30, y: 950, w: 440, h: 320 };
const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);

function stepper(pc, path, v, min, max, lab) {
  return `<div class="stepper"><button data-act="inc" data-pc="${pc.id}" data-path="${path}" data-d="-1" data-min="${min}" data-max="${max}" ${v <= min ? 'disabled' : ''} aria-label="Lower ${lab}">−</button><output>${v}</output><button data-act="inc" data-pc="${pc.id}" data-path="${path}" data-d="1" data-min="${min}" data-max="${max}" ${v >= max ? 'disabled' : ''} aria-label="Raise ${lab}">+</button></div>`;
}
function stepHead(S, key, no, title, rule) {
  const used = S.spend.filter(x => x.src[0] === 'B:' + key).reduce((s, x) => s + x.pts, 0);
  return `<div class="q"><span class="no">${no}</span><h3>${title}</h3>${rule ? `<span class="chip" data-go="${rule}">p.${printIndex[rule].page}</span>` : ''}<span class="sub">${used ? used + ' pts · ' : ''}${S.left} left</span></div>`;
}
function stepHtml(pc, S, key) {
  const ch = choicesOf(pc), P = R.P;
  const opt = (path, v, cur, title, eff, cost) => `<button class="opt${cur === v ? ' sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="${path}" data-v="${v}" aria-pressed="${cur === v}"><b>${title}${cost != null ? `<em>${cost}</em>` : ''}</b><span>${eff}</span></button>`;
  const row = (on, title, eff, cost, ctl) => `<div class="row${on ? ' on' : ''}"><div><b>${title}</b><span>${eff}</span><span class="cost">${cost}</span></div>${ctl}</div>`;
  const flag = (path, on, lab) => `<button class="opt${on ? ' sel' : ''}" style="padding:8px 14px" data-act="flag" data-pc="${pc.id}" data-path="${path}">${on ? 'Bought' : lab || 'Buy'}</button>`;
  let h = `<div class="bstep" data-id="b-${pc.id}-${key}">`;
  if (key === 'name') h += `${stepHead(S, 'name', '0', 'Name', P.sheet)}<div class="hint">What the street calls you.</div><input data-act="name" data-pc="${pc.id}" value="${esc(ch.name || '')}" placeholder="Runner name" aria-label="Runner name"><input data-act="player" data-pc="${pc.id}" value="${esc(pc.player || '')}" placeholder="Player" aria-label="Player name" style="margin-top:12px;font-size:24px">`;
  if (key === 'meta') {
    h += `${stepHead(S, 'meta', '1', 'Metatype', P.meta)}<div class="hint">Start with 100 points and 60 Essence. Every attribute and skill starts at 1.</div><div class="opts">`;
    Object.entries(R.META).forEach(([k, m]) => h += opt('meta', k, ch.meta, m.name, m.text, m.pts + ' pts'));
    h += `</div><div style="height:330px;margin-top:16px">`;
    if (ch.meta === 'human') {
      h += `<div class="grouph"><span>Racial bonuses</span><span>${(ch.human || []).length} of 3 · 3 pts each</span></div><div class="opts four">`;
      R.ALL_SKILLS.forEach(s => { const on = (ch.human || []).includes(s); h += `<button class="opt${on ? ' sel' : ''}" style="padding:8px 10px" data-act="toggle" data-pc="${pc.id}" data-path="human" data-v="${s}" data-max="3" aria-pressed="${on}"><b style="font-size:20px">+1 ${R.SK_NAME[s]}</b></button>`; });
      h += `</div>`;
    } else h += `<div class="crease" style="height:330px">Human racial bonuses · open when you choose Human</div>`;
    h += `</div>`;
  }
  if (key === 'attr') {
    h += `${stepHead(S, 'attr', '2', 'Attributes', P.attr)}<div class="hint">+1 costs 7; +2 costs 25. Target number is 6 − attribute.</div><div class="rows">`;
    R.ATTRS.forEach(a => { const v = ch.attr[a] || 0; h += row(v > 0, `${R.ATTR_NAME[a]} → ${S.attr[a]}`, `TN ${Math.max(0, 6 - S.attr[a])}`, `+${v} · ${R.ATTR_COST[v]} pts`, stepper(pc, 'attr.' + a, v, 0, 2, R.ATTR_NAME[a])); });
    h += `</div>`;
  }
  if (key === 'skills') {
    h += `${stepHead(S, 'skills', '3', 'Skills', P.skillcost)}<div class="hint">Ratings 2–3 cost 1 each, 4–6 cost 2, 7–9 cost 3. Up to 9 at creation; Magic ≤ Essence ÷ 10 (now ${S.magicCap}).</div>`;
    R.ATTRS.forEach(a => {
      h += `<div class="grouph"><span>${R.ATTR_NAME[a]} ${S.attr[a]}</span><span>TN ${Math.max(0, 6 - S.attr[a])}</span></div><div class="rows">`;
      R.SKILLS[a].forEach(s => { const v = Math.max(1, ch.skills[s] || 1); const max = s === 'magic' ? Math.min(9, Math.max(1, S.magicCap)) : 9;
        h += row(v > 1, `${R.SK_NAME[s]}${S.skill[s] !== v ? ` → ${S.skill[s]}` : ''}`, v > 1 ? `${R.skillCost(1, v)} pts for ${v}` : 'free at 1', v < max ? `next ${R.stepCost(v + 1)} pts` : 'at cap', stepper(pc, 'skills.' + s, v, 1, max, R.SK_NAME[s])); });
      h += `</div>`;
    });
  }
  if (key === 'magic') {
    h += `${stepHead(S, 'magic', '4', 'Magic', P.magic)}<div class="hint">A tradition costs 30 points. Skip this step for a mundane runner.</div><div class="opts three">`;
    Object.entries(R.TRAD).forEach(([k, t]) => h += opt('trad', k, ch.trad, t.name, t.text, t.pts + ' pts'));
    h += `</div><div style="height:860px;margin-top:16px">`;
    if (ch.trad) {
      const T = R.TRAD[ch.trad];
      h += `<div class="rows" style="margin-bottom:12px">`;
      h += T.projection ? row(true, 'Astral projection', 'Included with Hermetic.', '0 pts', '') : row(!!ch.extras?.projection, 'Astral projection', 'Travel without your body through unwarded places.', '10 pts', flag('extras.projection', ch.extras?.projection));
      h += T.summoning ? row(true, 'Summoning', 'Included with Shaman.', '0 pts', '') : row(!!ch.extras?.summoning, 'Summoning', 'Call spirits and elementals in downtime.', '10 pts', flag('extras.summoning', ch.extras?.summoning));
      h += `</div><div class="grouph"><span>Spells · 3 pts${T.freeSpells ? ` · first ${T.freeSpells} free` : ''}${T.selfOnly ? ' · self only' : ''}</span><span>${(ch.spells || []).length} chosen <span class="chip" data-go="${P.spells}">p.2</span></span></div><div class="opts three">`;
      R.SPELLS.forEach(sp => { const on = (ch.spells || []).includes(sp.id); h += `<button class="opt${on ? ' sel' : ''}" style="padding:10px 12px" data-act="toggle" data-pc="${pc.id}" data-path="spells" data-v="${sp.id}" aria-pressed="${on}"><b style="font-size:21px">${sp.name}</b><span style="font-size:16px">${sp.eff}</span></button>`; });
      h += `</div>`;
    } else h += `<div class="crease" style="height:860px">Spells, astral projection and summoning · open when you choose a tradition</div>`;
    h += `</div>`;
  }
  if (key === 'cyber') {
    h += `${stepHead(S, 'cyber', '5', 'Cyberware', P.cyber)}<div class="hint">Essence ${S.essence} of 60. Every 10 spent lowers the Magic cap by 1.</div><div class="rows">`;
    R.CYBER.forEach(c => { const v = ch.cyber[c.id] || 0; h += row(v > 0, c.name, c.eff, `${c.ess} Ess · ${c.pts} pts`, stepper(pc, 'cyber.' + c.id, v, 0, c.max, c.name)); });
    h += `</div><div class="grouph" style="margin-top:14px"><span>Skillwires: this skill is 5 (racial bonus dropped, cyber adds)</span></div><select data-act="wire" data-pc="${pc.id}" ${ch.cyber.skillwires ? '' : 'disabled'} aria-label="Skillwire skill"><option value="">${ch.cyber.skillwires ? 'Choose a skill' : 'Needs skillwires'}</option>${R.ALL_SKILLS.map(s => `<option value="${s}" ${ch.wire === s ? 'selected' : ''}>${R.SK_NAME[s]}</option>`).join('')}</select>`;
  }
  if (key === 'gear') {
    h += `${stepHead(S, 'gear', '6', 'Weapons & gear', P.gear)}<div class="hint">Wear one armor outfit; the best counts. Knife, phone and clothes are free.</div><div class="rows">`;
    R.GEAR.forEach(g => { const v = ch.gear[g.id] || 0; h += row(v > 0, g.name, g.eff, g.pts ? `${g.pts} pts` : 'free', stepper(pc, 'gear.' + g.id, v, 0, g.max, g.name)); });
    h += `</div>`;
  }
  if (key === 'veh') {
    h += `${stepHead(S, 'veh', '7', 'Vehicles & drones', P.veh)}<div class="hint">Mounted weapons are bought as gear. Vehicles cannot Soak.</div><div class="rows">`;
    R.VEH.forEach(v => { const n = ch.veh[v.id] || 0; h += row(n > 0, v.name, `${v.form} · HP ${v.hp} · armor ${v.armor} · ${v.speed} mph · ${v.mounts} mounts`, `${v.pts} pts`, stepper(pc, 'veh.' + v.id, n, 0, v.max, v.name)); });
    h += `</div>`;
  }
  if (key === 'deck') {
    h += `${stepHead(S, 'deck', '8', 'Deck & chips', P.decks)}<div class="hint">A deck sets hacking Actions and armor. Each operation needs its chip.</div><div class="opts three">`;
    R.DECKS.forEach(d => h += opt('deck', d.id, ch.deck, d.name, `Actions ${d.actions}${d.armor ? ' · armor ' + d.armor : ''}`, d.pts + ' pts'));
    h += `</div><div class="chipgrid" style="margin-top:16px"><span class="h"></span>${R.CHIP_KINDS.map(k => `<span class="h">${k}</span>`).join('')}`;
    R.CHIPS.forEach((rowc, t) => { h += `<span class="h">${R.CHIP_TIERS[t][0]} ${R.CHIP_TIERS[t][1]}</span>`; rowc.forEach(c => { if (!c) { h += '<span class="h" style="text-align:center">—</span>'; return; } const on = !!ch.chips[c[0]];
      h += `<button class="${on ? 'sel' : ''}" data-act="flag" data-pc="${pc.id}" data-path="chips.${c[0]}" aria-pressed="${on}">${c[1]}<span>${c[2]} pts</span></button>`; }); });
    h += `</div>`;
  }
  if (key === 'circles') {
    h += `${stepHead(S, 'circles', '9', 'Social circles', P.circles)}<div class="hint">Contact 1 pt [6L], friend 3 [9M], patron 5 [12S]. First two contacts free.</div><div class="rows one">`;
    R.CIRCLES.forEach(c => { const cur = ch.circles[c] || ''; h += `<div class="row${cur ? ' on' : ''}"><div><b>${c}</b></div><div class="seg">${['', 'contact', 'friend', 'patron'].map(l => `<button class="${cur === l ? 'sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="circles.${c}" data-v="${l}">${l ? R.CIRCLE_LV[l].name : 'None'}</button>`).join('')}</div></div>`; });
    h += `</div>`;
  }
  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3><span class="sub">${S.left} of 100 left</span></div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? (S.left > 0 ? `Legal, with ${S.left} point${S.left === 1 ? '' : 's'} unspent` : 'Legal and fully spent') : 'Not legal yet'}</b>
      <div>${S.pts} points spent · Essence ${S.essence} of 60 · Magic cap ${S.magicCap}</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves.</span></button>`;
  }
  if (key === 'life') {
    h += `${stepHead(S, 'life', '10', 'Lifestyle', P.life)}<div class="hint">You start with ¥100 plus your lifestyle’s cash.</div><div class="opts three">`;
    Object.entries(R.LIFE).forEach(([k, l]) => h += opt('life', k, ch.life, l.name, `+¥${l.cash.toLocaleString()} · ${l.tool}`, l.pts + ' pts'));
    h += `</div>`;
  }
  return h + '</div>';
}
function builderInner(pc, S) {
  return BCOLS.map((col, i) => `<div class="bcol" style="left:${30 + i * (BIW + BGAP)}px;width:${BIW}px">${col.map(k => stepHtml(pc, S, k)).join('')}</div>`).join('');
}
function toolRolls(pc, S, key, toolLabel) {
  return (R.TOOL_SKILL[key] || []).map(sk => `<button class="die sm" data-act="roll" data-pc="${pc.id}" data-skill="${sk}" data-tool="${esc(toolLabel)}" title="Roll ${R.SK_NAME[sk]} with ${esc(toolLabel)}: ${S.skill[sk]}d6">⚄ ${R.SK_NAME[sk]} ${S.skill[sk]}</button>`).join('');
}
function rollHtml(r) {
  const dice = r.dice.map(d => `<i class="${d.ok ? 'ok' : ''}">${d.chain.join('+')}</i>`).join('');
  return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">${r.pool}d6 · TN ${r.tn}</span><span class="dd">${dice}</span><span class="verdict${r.succ ? '' : ' fail'}">${r.succ} · ${esc(r.verdict)}</span></div>`;
}
// portraits: an uploaded image, else the Turnip Works runner token that best fits the build
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
  const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
  const src = close(state.portraits[pc.id] || options[0] || '');
  return { src, options: options.map(close) };
}
// summons: one at a time; a tiny sheet inside the summoner's sheet (rules p.2)
function summonOf(pc) { if (!(pc.id in state.summons) && pc.summon) state.summons[pc.id] = { ...pc.summon }; return state.summons[pc.id] || null; }
function summonsHtml(pc, ch, S, W8) {
  const head = `<div class="sec">Summons <span class="chip" data-go="p-summons">p.2</span> <span class="chip" data-go="p-spirits">types</span></div>`;
  if (!R.canSummon(ch)) return head + `<div class="none">Summoning needs a Shaman, or a tradition that bought Summoning.</div>`;
  const kind = R.summonKind(ch), sm = summonOf(pc);
  if (sm) {
    const t = R.SUMMONS.find(x => x.id === sm.type), skills = [...new Set([...R.SUMMON_SHARED, ...t.extra])];
    const boxes = Array.from({ length: sm.max }, (_, i) => `<i class="${i < sm.rating ? 'on' : ''}"></i>`).join('');
    const die = (sk, tool) => `<button class="die sm" data-act="sroll" data-pc="${pc.id}" data-skill="${sk}" data-tool="${esc(tool)}" title="${esc(tool)}: ${sm.rating}d6 at TN 4">⚄</button>`;
    const specials = R.summonSpecials(t).map(sp => `<div class="sp">${esc(sp.text)}${sp.skill ? ' ' + die(sp.skill, sp.text) : ''}</div>`).join('');
    const recent = (state.rolls[pc.id] || []).filter(r => r.label.includes(t.name)).slice(0, 2).map(rollHtml).join('');
    return head + `<div class="sumrow">
      <div class="scard2"><div class="sc-in">
        <div class="sch"><b>${esc(t.name)}</b><span class="kind">${t.kind}</span></div>
        <div class="scr">Rating <b>${sm.rating}</b>/${sm.max} <span class="boxes">${boxes}</span> · Actions ${t.actions} · TN 4</div>
        <div class="scs">${skills.map(k => `<div class="sskill"><span>${R.SK_NAME[k]}</span><b>${sm.rating}</b>${die(k, R.SK_NAME[k])}</div>`).join('')}</div>
        ${specials ? `<div class="scsp">${specials}</div>` : ''}
        <div class="sca">Body 2 · Coordination 2 · Mental 2 · Social 2</div>
      </div></div>
      <div class="sumside"><div class="ss-in">
        <div class="mbtns"><button class="btn" data-act="sum-dmg" data-pc="${pc.id}">Damage −1</button><button class="btn" data-act="sum-heal" data-pc="${pc.id}" ${sm.rating >= sm.max ? 'disabled' : ''}>Heal +1</button><button class="btn" data-act="sum-drain" data-pc="${pc.id}" title="Spends an action to take 1 of the summoner's Drain, losing 1 rating">Take 1 Drain</button><button class="btn quiet" data-act="sum-release" data-pc="${pc.id}">Release</button></div>
        <div class="rolls">${recent || '<div class="none">Its rolls land here and in the log.</div>'}</div>
      </div></div></div>`;
  }
  if (state.summonPick[pc.id]) {
    return head + `<div class="pickgrid">${R.SUMMONS.filter(t => t.kind === kind).map(t => `<button class="btn" data-act="sum-pick" data-pc="${pc.id}" data-type="${t.id}"><b>${esc(t.name.replace(/ (Elemental|Spirit)$/, ''))}</b><small>${t.kind}</small></button>`).join('')}<button class="btn quiet" data-act="sum-cancel" data-pc="${pc.id}">Cancel</button></div>
      <div class="hint2">Rolls Magic ${S.skill.magic} at TN ${Math.max(0, 6 - S.attr.mental) + W8.tn}. A ${kind}’s rating is the successes${kind === 'elemental' ? ' + 2' : ''}. Summoning takes downtime.</div>`;
  }
  return head + `<button class="btn big" data-act="sum-open" data-pc="${pc.id}">Summon ${kind === 'spirit' ? 'a spirit' : 'an elemental'} ⚄</button>${state.lastSummon?.[pc.id] ? `<div class="sumfail">${esc(state.lastSummon[pc.id])}</div>` : ''}<div class="hint2">One summon at a time. It gets a card of its own, here.</div>`;
}
function fitInto(box, inner, max = 3) {
  if (!box || !inner || !box.clientWidth) return; const W = box.clientWidth, H = box.clientHeight; let lo = 0.15, hi = max;
  for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; inner.style.zoom = m; inner.style.width = (W / m) + 'px';
    const r = inner.getBoundingClientRect(), b = box.getBoundingClientRect(); if (r.height <= b.height * 0.98 && inner.scrollWidth <= inner.clientWidth + 3) lo = m; else hi = m; }
  inner.style.zoom = lo; inner.style.width = (W / lo) + 'px';
}
function fitSummon(box) { box.querySelectorAll('.sumrow').forEach(r => { fitInto(r.querySelector('.scard2'), r.querySelector('.sc-in')); fitInto(r.querySelector('.sumside'), r.querySelector('.ss-in')); }); }
const isToken = src => /assets\/tokens\//.test(src || '');
// fill every section: scale its contents (CSS zoom) until they exactly fill the box, so no sheet carries dead space
function fitSections(box) {
  box.querySelectorAll('.main > section:not(.sP):not(.sS)').forEach(sec => {
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
function liveOf(pc) { return state.live[pc.id] || (state.live[pc.id] = { dmg: pc.id === 'pc-tusk' ? ['L', 'L', 'B'] : [] }); }
function woundOf(pc, S) { const f = liveOf(pc).dmg.filter(Boolean).length; return { filled: f, tn: S.adept ? 0 : f >= 4 ? 3 : f >= 1 ? 1 : 0 }; }
function sheetOf(pc) { return R.compute(choicesOf(pc), pc.karma || [], state.asof[pc.id] ?? 99); }

function renderSheet(pc) {
  const box = sheetEls[pc.id], ch = choicesOf(pc), S = sheetOf(pc), asOf = state.asof[pc.id] ?? 99;
  const live = liveOf(pc), W8 = woundOf(pc, S);
  const nm = ch.name || 'New runner', who = [S.meta?.name, pc.archetype].filter(Boolean).join(' · ') || 'Not built yet';
  const prev = box._prev || {};
  const pv = (key, v, cls = '') => `<span class="pv ${cls}${prev[key] != null && prev[key] !== v ? ' changed' : ''}" data-prov="${key}" tabindex="0">${v}</span>`;
  const has = new Set((pc.karma || []).map(k => k.s));
  const asofBtns = ['Start', ...C.sessions.map(s => 'S' + s.n), 'Now'].map((lab, i) => { const val = lab === 'Now' ? 99 : i; const on = asOf === val;
    return `<button data-act="asof" data-pc="${pc.id}" data-v="${val}" class="${on ? 'on' : ''}${has.has(i) ? ' has' : ''}" aria-pressed="${on}">${lab}</button>`; }).join('');
  const P = R.P, chip = (id, lab) => `<span class="chip" data-go="${id}">${lab || 'p.' + printIndex[id].page}</span>`;
  const cols = R.ATTRS.map(a => `<div class="acol"><div class="ahead"><span class="an">${R.ATTR_NAME[a]}</span><span>${pv('a:' + a, S.attr[a], 'mid')} <span class="tn">TN ${Math.max(0, 6 - S.attr[a])}</span></span></div>
      ${R.SKILLS[a].map(s => `<div class="sk${S.skill[s] ? '' : ' zero'}"><span class="k">${R.SK_NAME[s]}</span>${pv('s:' + s, S.skill[s], 'mid')}<button class="die" data-act="roll" data-pc="${pc.id}" data-skill="${s}" title="Roll ${R.SK_NAME[s]}: ${S.skill[s]}d6 at TN ${S.tn(s) + W8.tn}" aria-label="Roll ${R.SK_NAME[s]}">⚄</button></div>`).join('')}</div>`).join('');
  const track = Array.from({ length: S.health }, (_, i) => `<button class="${live.dmg[i] || ''}" data-act="dmg" data-pc="${pc.id}" data-i="${i}" aria-label="Damage box ${i + 1}">${live.dmg[i] || ''}</button>`).join('');
  const listOr = (arr, f) => arr.length ? arr.map(f).join('') : '<div class="none">None</div>';
  const kLeft = S.karma.earned - S.karma.spent;
  const circleRows = S.circles.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${esc(c.level.toLowerCase())} ${c.tool}${c.free ? ' · free' : ''}</span> ${toolRolls(pc, S, 'circle', `${c.name} ${c.level.toLowerCase()} ${c.tool}`)}</div>`);
  const tok = portraitOf(pc, S);
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
      <div class="portrait${isToken(tok.src) ? ' closeup' : ''}" data-portrait="${pc.id}" title="Drop an image here, or pick a token below">
        <img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span>
      </div>
      <div class="tokens">${tok.options.map(o => `<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this token"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
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
    <section class="sC${R.canSummon(ch) ? '' : ' tall'}">
      <h4>Gear, ware & magic</h4>
      <div class="cols2">
        <div class="l-cyber"><div class="sec">Cyberware ${chip(P.cyber)}</div><div class="list">${listOr(S.cyber, c => `<div><b>${esc(c.name)}${c.n > 1 ? ' ×' + c.n : ''}</b> <span class="e">${esc(c.eff)}${c.id === 'skillwires' && ch.wire ? ` (${R.SK_NAME[ch.wire]})` : ''}</span> ${toolRolls(pc, S, c.id, c.name)}</div>`)}</div></div>
        <div class="l-gear"><div class="sec">Weapons & gear ${chip(P.gear)}</div><div class="list">${listOr(S.gear, g => `<div><b>${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}</b> <span class="e">${esc(g.eff)}</span> ${toolRolls(pc, S, g.id, g.name + (g.eff.match(/\[[^\]]+\]/) ? ' ' + g.eff.match(/\[[^\]]+\]/)[0] : ''))}</div>`)}${S.trollDmg ? '<div class="e">Troll: +1 damage, melee and unarmed.</div>' : ''}</div></div>
        <div class="l-magic"><div class="sec">Magic ${chip(P.magic)}</div><div class="list">${S.trad ? `<div><b>${esc(S.trad.name)}</b></div>` + S.spells.map(sp => `<div><b>${esc(sp.name)}</b> <span class="e">[${esc(sp.eff)}]${sp.free ? ' · free' : ''}${sp.karma ? ` · ${chip(sp.karma, 'karma')}` : ''}</span> ${toolRolls(pc, S, 'spell', sp.name)}</div>`).join('') : '<div class="none">No tradition</div>'}</div></div>
        <div class="l-veh"><div class="sec">Vehicles, deck & chips ${chip(P.veh)}</div><div class="list">${listOr([...S.veh.map(v => `<div><b>${esc(v.name)}${v.n > 1 ? ' ×' + v.n : ''}</b> <span class="e">HP ${v.hp}, armor ${v.armor}</span> ${toolRolls(pc, S, 'veh', v.name)}</div>`), ...(S.deck ? [`<div><b>${esc(S.deck.name)}</b> <span class="e">Actions ${S.deck.actions}</span> ${toolRolls(pc, S, 'deck', S.deck.name)}</div>`] : []), ...S.chips.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${c.kind} ${c.tier[1]}</span></div>`)], x => x)}</div></div>
        <div class="l-circles"><div class="sec">Social circles ${chip(P.circles)}</div><div class="list">${circleRows.join('') || '<div class="none">None</div>'}</div></div>
        <div class="l-life"><div class="sec">Lifestyle</div><div class="list">${S.life ? `<div><b>${esc(S.life.name)}</b> <span class="e">${S.life.tool} · ¥${S.life.cash.toLocaleString()}</span> ${toolRolls(pc, S, 'life', `${S.life.name} lifestyle ${S.life.tool}`)}</div>` : '<div class="none">None</div>'}</div></div>
      </div>
    </section>
    ${R.canSummon(ch) ? `<section class="sS">${summonsHtml(pc, ch, S, W8)}</section>` : ''}
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl blbl'); bl.innerHTML = 'CHARACTER<br>BUILDER'; bl.style.fontSize = '64px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 64, over: true });
  if (state.done[pc.id] === false || (!ch.meta && !state.done[pc.id])) box.querySelector('.builder').classList.add('todo');
  box._prev = Object.fromEntries([...R.ATTRS.map(a => ['a:' + a, S.attr[a]]), ...R.ALL_SKILLS.map(s => ['s:' + s, S.skill[s]]), ['actions', S.actions], ['armor', S.armor], ['health', S.health], ['essence', S.essence], ['pts', S.pts]]);
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  fitSections(box); fitSummon(box);
  renderQuick(); dirty = true;
}
function placeSheet(pc, slot) {
  if (sheetEls[pc.id]) { sheetEls[pc.id].remove(); }
  const e = add(world, 'sheet', PX, pcRowY(slot), SW, SH); sheetEls[pc.id] = e; pc.slot = slot;
  reg(pc.id, { el: e, title: '', kind: 'character', icon: 'assets/tool-pawns.png', box: { x: PX, y: pcRowY(slot), w: SW, h: SH } });
  renderSheet(pc);
}

// the launcher: above the party, straddling the map's top-right corner
const launch = add(world, 'launch', PX - 1900, -900, SW + 1900, 760, `<button class="launchbtn" data-act="newpc"><span class="plus">+</span><span><b>Build a new runner</b><small>Opens a blank sheet in the next empty seat and takes you to its builder.</small></span></button>`);
reg('launch', { el: launch, title: 'Build a new runner', kind: 'action', icon: 'assets/tool-pawns.png', box: { x: PX - 1900, y: -900, w: SW + 1900, h: 760 } });
label(world, 'The party', PX, -1240, 300);

PCS.forEach((pc, i) => placeSheet(pc, pc.slot ?? i));
function emptySeats() { const used = new Set(PCS.map(p => p.slot)); return [...Array(SLOTS).keys()].filter(i => !used.has(i)); }
const seatEls = {};
function renderSeats() {
  Object.values(seatEls).forEach(e => e.remove());
  emptySeats().forEach(i => { const e = add(world, 'seat', PX, pcRowY(i), SW, SH, `<button class="seatbtn" data-act="newpc" data-slot="${i}"><span class="plus">+</span> Empty seat · build a new runner here</button>`); seatEls[i] = e; });
}
renderSeats();
function newRunner(slot) {
  const free = emptySeats(); if (!free.length) return null;
  slot = slot != null && free.includes(+slot) ? +slot : free[0];
  const id = 'pc-x' + Date.now().toString(36);
  const pc = { id, player: '', archetype: 'New runner', choices: null, karma: [], slot };
  state.extra.push({ id, player: '', archetype: 'New runner', choices: null, karma: [], slot });
  PCS.push(pc); pcById[id] = pc; placeSheet(pc, slot); renderSeats(); persist();
  return id;
}

// (sessions3)
let persistExtra = () => {};

// ------------------------------------------------------------------ pockets: a free-paste spot on every major thing
// Paste (⌘V) with the pointer over a pocket, drop an image on it, or click it to type. Scraps are text or pictures.
state.pockets = saved.pockets || {};
const persistPockets = () => { persistExtra(); try { const o = JSON.parse(localStorage.getItem('turnip-almanac-2') || '{}'); o.pockets = state.pockets; o.sessx = state.sessx; o.prepN = state.prepN; o.threadx = state.threadx; localStorage.setItem('turnip-almanac-2', JSON.stringify(o)); } catch {} };
function pocketHtml(owner, label = 'Pocket') {
  const items = state.pockets[owner] || [];
  return `<div class="pocket" data-pocket="${owner}"><div class="ph2">${esc(label)} <span class="pk">paste, drop, or click to type</span></div><div class="scraps">${items.map(it => it.kind === 'img'
    ? `<span class="scrap img" data-scrap="${it.id}"><img src="${it.src}" alt="" draggable="false"><button class="x" data-unscrap="${owner}|${it.id}" aria-label="Remove">✕</button></span>`
    : `<span class="scrap txt ed" data-scrap="${it.id}" data-owner="${owner}" tabindex="0">${renderNote(it.text, it.id, new Set())}</span>`).join('')}</div></div>`;
}
function addScrap(owner, it) { (state.pockets[owner] = state.pockets[owner] || []).push({ id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), ...it }); persistPockets(); refreshPocket(owner); }
function refreshPocket(owner) {
  if (pcById[owner]) { renderPocketTab(pcById[owner]); return; }
  if (/^s\d+$/.test(owner)) { const x = sessionEls.find(q => 's' + q.s.n === owner); if (x) { renderSessionCard(x); return; } }
  if (pEls[owner]) { pEls[owner].querySelector('.pocket')?.replaceWith(el('div', '', pocketHtml(owner)).firstElementChild); layoutPeople(); }
}
const pocketTabs = {};
function renderPocketTab(pc) {
  const y = pcRowY(pc.slot);
  let t = pocketTabs[pc.id]; if (!t) { t = add(world, 'pockettab', PX + SW + 30, y, 180, SH, ''); pocketTabs[pc.id] = t; }
  place(t, PX + SW + 30, y, 180, SH); t.innerHTML = pocketHtml(pc.id, 'Pocket');
}
PCS.forEach(renderPocketTab);
const _newRunner = newRunner; newRunner = function (slot) { const id = _newRunner(slot); if (id) renderPocketTab(pcById[id]); return id; };

// ------------------------------------------------------------------ sessions: compact, editable cards; the next one waits as a ghost
const SCW = 1000, SGAP = 60, SCOLS = 3;
const SX = PX + SW + 240, SY = 40;
state.sessx = saved.sessx || []; state.prepN = saved.prepN || C.prep.n; state.threadx = saved.threadx || [];
state.snotes = saved.snotes || null; state.smeta = saved.smeta || {}; state.npcx = saved.npcx || [];
const allSessions = () => [...C.sessions, ...state.sessx, { ...C.prep, n: state.prepN, title: state.prepN === C.prep.n ? C.prep.title : 'Next session', date: 'planned', prep: true }];
if (!state.snotes) { state.snotes = {}; allSessions().forEach(s => { state.snotes[s.n] = []; Object.entries(C.cells).forEach(([who, row]) => (row[s.n] || []).forEach((t, j) => state.snotes[s.n].push({ id: `c-${who}-${s.n}-${j}`, who, text: t }))); }); }
persistExtra = () => { persist(); try { const o = JSON.parse(localStorage.getItem('turnip-almanac-2') || '{}'); Object.assign(o, { snotes: state.snotes, smeta: state.smeta, npcx: state.npcx, pockets: state.pockets, sessx: state.sessx, prepN: state.prepN, threadx: state.threadx }); localStorage.setItem('turnip-almanac-2', JSON.stringify(o)); } catch {} };
state.npcx.forEach(n => { if (!npcIndex[n.id]) { C.npcs.push(n); npcIndex[n.id] = n; } });
state.threadx.forEach(t => { if (!C.threads.find(x => x.id === t.id)) C.threads.push(t); });
// ------------------------------------------------------------------ sessions: compact, editable cards; notes grouped by who
// Notes are plain text with two marks: @name links a runner, person or place (and makes a new person if nobody matches),
// [[Title]] links anything by its title (a rule, a place). The seed text's {{id}} marks still render.
function knownNames() {
  return [...PCS.map(pc => ({ id: pc.id, name: choicesOf(pc).name })), ...C.npcs.map(n => ({ id: n.id, name: n.name })), ...C.places.map(p => ({ id: p.id, name: p.name }))].filter(x => x.name);
}
function matchMention(words) {
  // the longest run of words after @ that starts a known name; else nothing
  const names = knownNames().map(x => ({ ...x, l: x.name.toLowerCase() }));
  for (let n = Math.min(4, words.length); n >= 1; n--) {
    const ph = words.slice(0, n).join(' ').toLowerCase().replace(/_/g, ' ');
    const hit = names.filter(x => x.l === ph || x.l.startsWith(ph + ' ') || (n === 1 && x.l.startsWith(ph) && ph.length >= 3)).sort((a, b) => a.l.length - b.l.length)[0];
    if (hit) return { ...hit, used: n };
  }
  return null;
}
function titleMatch(t) { t = t.toLowerCase(); const n = Object.values(nodes).find(n => n.title && n.title.toLowerCase() === t && ['rule', 'place', 'person', 'character', 'thread', 'session'].includes(n.kind)); return n?.id || C.print.find(p => p.title.toLowerCase() === t)?.id || null; }
function chipFor(id, label) { const g = placeIndex[id]?.icon; const pg = printIndex[id] ? ` <small>p.${printIndex[id].page}</small>` : ''; return `<span class="chip" data-go="${id}" data-mark="${esc(label)}">${g ? `<img src="${g}" alt="">` : ''}${esc(label)}${pg}</span>`; }
function renderNote(text, fromId, mentions) {
  let h = esc(text);
  h = h.replace(/\{\{([\w-]+)\}\}/g, (_, id) => { mentions.add(id); return chipFor(id, titleOf(id)); });
  h = h.replace(/\[\[([^\]]+)\]\]/g, (m, t) => { const id = titleMatch(t.replace(/&amp;/g, '&')); if (!id) return `<span class="unlinked">${t}</span>`; mentions.add(id); return chipFor(id, titleOf(id)); });
  h = h.replace(/@([A-Za-z][\w'’-]*(?:[ _][A-Za-z][\w'’-]*){0,3})/g, (m, run) => {
    const words = run.split(/[ _]/), hit = matchMention(words);
    if (!hit) return `<span class="unlinked">@${words[0]}</span>${words.length > 1 ? ' ' + words.slice(1).join(' ') : ''}`;
    mentions.add(hit.id); const rest = words.slice(hit.used).join(' ');
    return chipFor(hit.id, hit.name) + (rest ? ' ' + rest : '');
  });
  return h;
}
// leaving an edit: chips back to marks, unknown @names become new people
function textOf(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('.chip[data-go]').forEach(ch => { const id = ch.dataset.go, n = nodes[id]; const isName = pcById[id] || npcIndex[id] || placeIndex[id];
    ch.replaceWith(isName ? '@' + (titleOf(id)) : `[[${titleOf(id)}]]`); });
  return c.innerText.replace(/ /g, ' ').trim();
}
function adoptMentions(text) {
  let made = false;
  (text.match(/@([A-Za-z][\w'’-]*(?:[ _][A-Za-z][\w'’-]*){0,3})/g) || []).forEach(m => {
    const words = m.slice(1).split(/[ _]/); if (matchMention(words)) return;
    const name = words[0][0].toUpperCase() + words[0].slice(1);
    const n = { id: 'npc-x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, text: 'Met in play. Click to add who they are.', icon: null };
    C.npcs.push(n); npcIndex[n.id] = n; state.npcx.push(n); made = true;
  });
  return made;
}
const subjOf = id => pcById[id] ? { name: choicesOf(pcById[id]).name || 'New runner', icon: portraitOf(pcById[id], sheetOf(pcById[id])).src, go: id } : npcIndex[id] ? { name: npcIndex[id].name, icon: state.portraits[id] || npcIndex[id].icon, go: id } : C.threads.find(t => t.id === id) ? { name: C.threads.find(t => t.id === id).name, icon: null, go: id, thread: true } : { name: 'Table notes', icon: null, go: null, general: true };
const mentionsBy = {};                                   // subject id -> Set of note ids that mention it
function renderSessionCard(x, measuring) {
  const s = x.s, card = x.card, meta = state.smeta[s.n] || {};
  const groups = [];
  (state.snotes[s.n] || []).forEach(n => { let g = groups.find(q => q.who === n.who); if (!g) groups.push(g = { who: n.who, notes: [] }); g.notes.push(n); });
  C.pcs.forEach(pc => { const ks = (pc.karma || []).filter(k => k.s === s.n); if (!ks.length) return; let g = groups.find(q => q.who === pc.id); if (!g) groups.push(g = { who: pc.id, notes: [] }); g.karma = ks; });
  const order = id => pcById[id] ? 0 : npcIndex[id] ? 1 : C.threads.find(t => t.id === id) ? 2 : 3;
  groups.sort((a, b) => order(a.who) - order(b.who));
  const title = meta.title ?? s.title, recap = meta.recap ?? (s.recap || 'Ideas sit here, unsettled, until the table makes them true.');
  card.innerHTML = `<div class="fit">
    <div class="shead"><div class="snum">S${s.n}${s.prep ? '?' : ''}</div><div><h2 class="ed" data-sedit="title" data-s="${s.n}" tabindex="0">${esc(title)}</h2><div class="date">${esc(s.date)}</div></div>${s.prep ? '<span class="nowtag">Now</span>' : ''}</div>
    <div class="recap ed" data-sedit="recap" data-s="${s.n}" tabindex="0">${esc(recap)}</div>
    <div class="sgroups"></div>
    <button class="btn addnote" data-addnote="${s.n}" data-who="">+ Note</button>${pocketHtml('s' + s.n)}</div>`;
  const gEl = card.querySelector('.sgroups');
  groups.forEach(g => {
    const sj = subjOf(g.who);
    const ge = el('div', 'sgroup' + (sj.thread ? ' thread' : ''), `<div class="sgh" ${sj.go ? `data-go="${sj.go}"` : ''}>${sj.icon ? `<span class="sgimg"><img src="${sj.icon}" alt="" draggable="false"></span>` : `<span class="tdot">${sj.general ? '✎' : '?'}</span>`}<b>${esc(sj.name)}</b></div>`);
    (g.karma || []).forEach(k => {
      const buys = (k.buy || []).map(b => b.skill ? `${R.SK_NAME[b.skill]} → ${b.to}` : `Spell: ${R.SPELL_BY_ID[b.spell].name}`).join(', ');
      const e = el('div', 'snote karma', `<span class="kk">Karma +${k.award || 0}</span>${buys ? ` <b>${esc(buys)}</b>` : ''}${k.note ? ` <span class="e">${esc(k.note)}</span>` : ''}`);
      ge.appendChild(e); reg(k.id, { el: e, title: `${sj.name} · karma S${s.n}${buys ? ': ' + buys : ''}`, kind: 'karma', sub: `S${s.n}` });
    });
    g.notes.forEach(n => { const ms = new Set(); const e = el('div', 'snote ed' + (s.prep ? ' idea' : ''), renderNote(n.text, n.id, ms)); e.dataset.note = n.id; e.dataset.s = s.n; e.tabIndex = 0; ge.appendChild(e);
      ms.add(g.who); ms.forEach(id => (mentionsBy[id] = mentionsBy[id] || new Set()).add(n.id));
      reg(n.id, { el: e, title: e.textContent.slice(0, 70), kind: s.prep ? 'idea' : 'note', sub: `S${s.n} · ${sj.name}` }); });
    if (g.who) { const add = el('button', 'btn addnote sm', '+'); add.dataset.addnote = s.n; add.dataset.who = g.who; add.title = `Add a note about ${sj.name}`; ge.appendChild(add); }
    gEl.appendChild(ge);
  });
  if (measuring) { const f = card.querySelector('.fit'); f.style.zoom = 1; f.style.width = (SCW - 68) + 'px'; } else fitCard(card);
}
function fitCard(card) {
  const f = card.querySelector(':scope > .fit'); if (!f || !card.offsetHeight) return;
  const W = card.clientWidth - 68, Hh = card.clientHeight - 60; let lo = 0.5, hi = 2.2;
  const cr = card.getBoundingClientRect(), k = cr.height / card.offsetHeight || 1;
  for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; f.style.zoom = mid; f.style.width = (W / mid) + 'px'; if (f.getBoundingClientRect().height / k <= Hh) lo = mid; else hi = mid; }
  f.style.zoom = lo; f.style.width = (W / lo) + 'px';
}
let sessionEls = [], ghostS = null, sy = SY;
function layoutSessions() {
  sessionEls.forEach(x => x.card.remove()); ghostS?.remove(); sessionEls = [];
  const list = allSessions();
  list.forEach(s => { if (!state.snotes[s.n]) state.snotes[s.n] = []; const card = add(world, 'card scard' + (s.prep ? ' prep' : ''), 0, 0, SCW, null, ''); sessionEls.push({ s, card }); });
  sessionEls.forEach(x => { renderSessionCard(x, true); });
  sy = SY;
  const slots = [...sessionEls, { ghost: true }];
  for (let r = 0; r * SCOLS < slots.length; r++) {
    const row = slots.slice(r * SCOLS, r * SCOLS + SCOLS);
    const h = Math.max(700, ...row.filter(x => !x.ghost).map(x => x.card.offsetHeight)) + 160;
    row.forEach((x, c) => { const bx = SX + c * (SCW + SGAP);
      if (x.ghost) { ghostS = add(world, 'ghost', bx, sy, SCW, Math.min(h, 900), `<button class="ghostbtn" data-newsession="1"><span class="plus">+</span><span>S${state.prepN + 1}<small>Play S${state.prepN}: its prep card becomes the record, and a fresh prep card opens here.</small></span></button>`); return; }
      place(x.card, bx, sy, SCW, h); x.box = { x: bx, y: sy, w: SCW, h };
      reg('s' + x.s.n, { el: x.card, title: `S${x.s.n} · ${x.s.title}`, kind: 'session', box: x.box }); renderSessionCard(x); });
    sy += h + SGAP;
  }
  const last = sessionEls[sessionEls.length - 1];
  nodes.now = { id: 'now', el: last.card, title: 'Now · next session', kind: 'now', icon: 'assets/tool-build.png', box: last.box };
  updateBounds();
}
label(world, 'Sessions', SX, SY - 330, 260);

// editing in place: click a note, a title or a recap. Enter saves, Shift+Enter breaks a line, Esc cancels.
let editing = null;
function startEdit(e) {
  if (editing?.el === e) return; if (editing) endEdit(true);
  const raw = e.dataset.note ? (state.snotes[e.dataset.s].find(n => n.id === e.dataset.note)?.text ?? '') : e.dataset.scrap ? ((state.pockets[e.dataset.owner] || []).find(q => q.id === e.dataset.scrap)?.text ?? '') : null;
  editing = { el: e, before: e.innerHTML };
  if (raw != null) { const tmp = el('div', '', renderNote(raw, '', new Set())); e.textContent = textOf(tmp); }
  e.contentEditable = 'true'; e.classList.add('editing'); e.focus();
  const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
function endEdit(save) {
  const ed = editing; if (!ed) return; editing = null; const e = ed.el; e.contentEditable = 'false'; e.classList.remove('editing');
  const s = +e.dataset.s, x = sessionEls.find(q => q.s.n === s);
  if (e.dataset.scrap) { const list = state.pockets[e.dataset.owner] || [], it = list.find(q => q.id === e.dataset.scrap); const t2 = e.innerText.replace(/\u00a0/g, ' ').trim(); if (it) { if (t2) it.text = t2; else list.splice(list.indexOf(it), 1); } adoptMentions(t2); persistPockets(); refreshPocket(e.dataset.owner); return; }
  if (!save) { e.innerHTML = ed.before; return; }
  const text = e.innerText.replace(/ /g, ' ').trim();
  if (e.dataset.pedit) { const id = e.dataset.pid, o = npcIndex[id] || C.threads.find(t => t.id === id); if (o) { o[e.dataset.pedit] = text || o[e.dataset.pedit]; const x2 = state.npcx.find(q => q.id === id) || state.threadx.find(q => q.id === id); if (x2) x2[e.dataset.pedit] = o[e.dataset.pedit]; }
    persistExtra(); layoutPeople(); sessionEls.forEach(q => renderSessionCard(q)); return; }
  if (e.dataset.sedit) { state.smeta[s] = { ...(state.smeta[s] || {}), [e.dataset.sedit]: text }; }
  else { const list = state.snotes[s], n = list.find(q => q.id === e.dataset.note); if (n) { if (text) n.text = text; else list.splice(list.indexOf(n), 1); } }
  const made = adoptMentions(text);
  persistExtra(); renderSessionCard(x); if (made) layoutPeople(); }
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-newsession]')) { const n = state.prepN, meta = state.smeta[n] || {};
    state.sessx.push({ n, title: meta.title || (n === C.prep.n ? C.prep.title : `Session ${n}`), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), recap: meta.recap || '' });
    state.prepN = n + 1; state.snotes[n + 1] = state.snotes[n + 1] || []; persistExtra(); layoutSessions(); layoutPeople(); flyTo('s' + (n + 1)); return; }
  const un = ev.target.closest('[data-unscrap]'); if (un) { const [o, id] = un.dataset.unscrap.split('|'); state.pockets[o] = (state.pockets[o] || []).filter(q => q.id !== id); persistPockets(); refreshPocket(o); return; }
  const gp = ev.target.closest('[data-newperson], [data-newthread]');
  if (gp) { const isP = !!gp.dataset.newperson, o = { id: (isP ? 'npc-x' : 'th-x') + Date.now().toString(36), name: isP ? 'New person' : 'New thread', text: isP ? 'Click to say who they are.' : 'What does the table keep asking?', icon: null };
    if (isP) { C.npcs.push(o); npcIndex[o.id] = o; state.npcx.push(o); } else { C.threads.push(o); state.threadx.push(o); }
    persistExtra(); layoutPeople(); const h = pEls[o.id]?.querySelector('h2.ed'); if (h) { flyTo(o.id); setTimeout(() => startEdit(h), 700); } return; }
  const pk = ev.target.closest('.pocket'); if (pk && !ev.target.closest('.scrap, .chip, button')) { const o = pk.dataset.pocket; addScrap(o, { kind: 'text', text: '' }); const e = [...document.querySelectorAll(`[data-pocket="${o}"] .scrap.txt`)].pop(); if (e) startEdit(e); return; }
  const add = ev.target.closest('[data-addnote]');
  if (add) { const s = +add.dataset.addnote, n = { id: `c-x${Date.now().toString(36)}`, who: add.dataset.who || '', text: '' }; state.snotes[s].push(n);
    const x = sessionEls.find(q => q.s.n === s); renderSessionCard(x); const e = x.card.querySelector(`[data-note="${n.id}"]`); if (e) startEdit(e); return; }
  const ed = ev.target.closest('.ed'); if (ed && !ev.target.closest('.chip') && !ed.isContentEditable) { startEdit(ed); return; }
  if (editing && !ev.target.closest('.editing')) endEdit(true);
});
document.addEventListener('keydown', ev => { if (!editing || ev.target !== editing.el) return;
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); endEdit(true); } else if (ev.key === 'Escape') { ev.preventDefault(); endEdit(false); }
  ev.stopPropagation(); }, true);

// people, threads and the inbox: a column of their own beside the sessions, so neither pushes the other
const SBW = SCOLS * SCW + (SCOLS - 1) * SGAP;
const PCX = SX + SBW + 140, PCW = 1100;
const IBX = PCX;
const ib = add(world, 'inbox', PCX, SY, PCW, 700, `<div class="ih"><h2>Inbox</h2>Loose notes land here. Drag them where they belong, or leave them. Paste text anywhere (⌘V) to make one.</div>`);
reg('inbox', { el: ib, title: 'Inbox · loose notes', kind: 'inbox', box: { x: PCX, y: SY, w: PCW, h: 700 } });
label(world, 'People and threads', PCX, SY + 760, 160);
const pEls = {}; let ghostP = null, ghostT = null, py = SY + 990;
function personCard(p) {
  return `<div class="pch">${p.kind === 'npc' ? `<div class="pport" data-portrait="${p.o.id}">${(state.portraits[p.o.id] || p.o.icon) ? `<img src="${state.portraits[p.o.id] || p.o.icon}" alt="" draggable="false">` : '<span class="pdrop">Drop a picture</span>'}</div>` : '<span class="tdot big">?</span>'}<div><div class="num">${p.kind === 'npc' ? 'Person' : 'Thread'}</div><h2 class="ed" data-pedit="name" data-pid="${p.o.id}" tabindex="0">${esc(p.o.name)}</h2><div class="t ed" data-pedit="text" data-pid="${p.o.id}" tabindex="0">${esc(p.o.text || '')}</div></div></div><div class="backs"></div>${pocketHtml(p.o.id)}`;
}
function layoutPeople() {
  const pts = [...C.npcs.map(n => ({ o: n, kind: 'npc' })), ...C.threads.map(t => ({ o: t, kind: 'thread' }))];
  let y = SY + 990;
  pts.forEach(p => { let e = pEls[p.o.id];
    if (!e) { e = add(world, 'card pcard', PCX, 0, PCW, null, ''); reg(p.o.id, { el: e, title: p.o.name, kind: p.kind === 'npc' ? 'person' : 'thread', icon: p.o.icon, box: null }); pEls[p.o.id] = e; }
    e.style.height = ''; e.innerHTML = personCard(p); nodes[p.o.id].title = p.o.name;
    const h = e.offsetHeight; place(e, PCX, y, PCW, h); nodes[p.o.id].box = { x: PCX, y, w: PCW, h }; y += h + SGAP; });
  ghostP?.remove(); ghostT?.remove();
  ghostP = add(world, 'ghost', PCX, y, (PCW - SGAP) / 2, 300, `<button class="ghostbtn" data-newperson="1"><span class="plus">+</span><span>Person</span></button>`);
  ghostT = add(world, 'ghost', PCX + (PCW + SGAP) / 2, y, (PCW - SGAP) / 2, 300, `<button class="ghostbtn" data-newthread="1"><span class="plus">+</span><span>Thread</span></button>`);
  py = y + 360; refreshBacks(); updateBounds();
}
function updateBounds() { const top = Math.min(BY - 700, -3700); Object.assign(BOUNDS, { x: -120, y: top, w: PCX + PCW + 200, h: Math.max(MH, py, sy) - top + 120 }); }
const BOUNDS = {};
// editing a person's or thread's name and words
document.addEventListener('focusout', () => {}, true);
const colX = i => SX + (i % SCOLS) * (SCW + SGAP), colW = SCW, colGap = SGAP, nS = C.sessions.length;
layoutSessions(); layoutPeople();

PCS.forEach(pc => { nodes[pc.id].title = choicesOf(pc).name || 'New runner'; });
function refreshBacks() {
  Object.entries(mentionsBy).forEach(([id, set]) => { const ss = [...new Set([...set].map(nid => { for (const s of allSessions()) if ((state.snotes[s.n] || []).some(n => n.id === nid)) return s.n; return null; }).filter(Boolean))].sort((a, b) => a - b);
    [nodes['idx-' + id], nodes[id]].forEach(t => { const b = t?.el?.querySelector('.backs'); if (b) b.innerHTML = ss.length ? 'In sessions ' + ss.map(n => `<span class="chip" data-go="s${n}">S${n}</span>`).join(' ') : ''; }); });
}
refreshBacks();
// loose notes
let dragNote = null;
function makeNote(nt) {
  const e = add(world, 'loose', nt.x, nt.y, null, null, `<div class="grip"><span class="dots"></span><button aria-label="Delete note">✕</button></div><div class="body" contenteditable="true" spellcheck="false"></div><div class="rsz" title="Drag to resize"></div>`);
  e.querySelector('.body').textContent = nt.text || '';
  e.querySelector('.body').addEventListener('input', ev => { nt.text = ev.target.textContent; nodes[nt.id].title = nt.text.slice(0, 60) || 'Note'; persist(); });
  e.querySelector('.grip button').addEventListener('click', () => { e.remove(); state.notes = state.notes.filter(n => n !== nt); delete nodes[nt.id]; persist(); });
  e.querySelector('.grip').addEventListener('pointerdown', ev => { if (ev.target.closest('button')) return; ev.stopPropagation(); dragNote = { nt, e, sx: ev.clientX, sy: ev.clientY, ox: nt.x, oy: nt.y }; });
  if (!nt.w) { const k = nt.k || 1; nt.w = 330 * k; nt.h = 180 * k; }   // a free rectangle: made at the zoom you were at, then any size and shape
  reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: nt.w, h: nt.h } });
  requestAnimationFrame(() => sizeNote(nt, e));
  return e;
}
if (!state.notes) state.notes = [
  { id: 'n-1', x: IBX + 60, y: SY + 300, text: 'Ask Clutch’s player whether Clutch keeps the BigBeatle or trades up to a GunBug.' },
  { id: 'n-2', x: IBX + 440, y: SY + 420, text: 'Grey paid ¥4,000 each. Where did that money come from?' },
];
state.notes.forEach(makeNote);
// ------------------------------------------------------------------ at the table: round order and a dice tray, ON the canvas
const TBX = SX, TBY = -1340, TBW = (SBW - 2 * SGAP) / 3, TBH = 900;
label(world, 'At the table', TBX, TBY - 760, 640);
const roundCard = add(world, 'card tablecard', TBX, TBY, TBW, TBH, '');
reg('round', { el: roundCard, title: 'Round order', kind: 'table', icon: 'assets/tool-build.png', box: { x: TBX, y: TBY, w: TBW, h: TBH } });
const diceCard = add(world, 'card tablecard', SX + TBW + SGAP, TBY, TBW, TBH, '');
const logCard = add(world, 'card tablecard logcard', SX + 2 * (TBW + SGAP), TBY, TBW, TBH, '');
reg('dice', { el: diceCard, title: 'Dice tray', kind: 'table', box: { x: SX + TBW + SGAP, y: TBY, w: TBW, h: TBH } });
reg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: SX + 2 * (TBW + SGAP), y: TBY, w: TBW, h: TBH } });
const helpCard = add(world, 'card helpcard', PX - 1900, -2240, 1800, 1180, `<h3>Getting around</h3><div class="t">
  <b>Scroll</b> to pan · <b>pinch</b> or <b>ctrl-scroll</b> to zoom · <b>0</b> shows everything · <b>Alt ←</b> goes back<br>
  <b>/</b> or <b>⌘K</b> opens the quickbar at the top: type a name, a place, a rule, or a command such as <i>tusk guns</i>, <i>roll 6 tn 4</i>, <i>damage tusk 2</i>, <i>heal tusk</i>, <i>new runner</i>, <i>round order</i><br>
  <b>Double-click</b> a thing to fly to it, empty space for a note · <b>drop an image</b> on a portrait, or anywhere for art<br>
  In a builder, <b>Tab</b> and <b>Shift+Tab</b> fly between steps · hover a <b>number</b> to see where it comes from</div>`);
label(world, 'HELP', PX - 1900, -2240 - 1260, 1150);
reg('help', { el: helpCard, title: 'Getting around', kind: 'help', box: { x: PX - 1900, y: -2240, w: 1800, h: 1180 } });
let turn = { round: 1, at: 0 };
function initiative() {
  return PCS.filter(pc => choicesOf(pc).meta || choicesOf(pc).name).map(pc => ({ pc, S: sheetOf(pc) }))
    .sort((a, b) => b.S.actions - a.S.actions || b.S.attr.coord - a.S.attr.coord || b.S.skill.palming - a.S.skill.palming);
}
const qdice2 = { pool: 6, tn: 4 };
function renderTable() {
  const o = initiative(); if (turn.at >= o.length) turn.at = 0;
  roundCard.innerHTML = `<div class="fit"><h3>Round order <span class="chip" data-go="p-turns">p.3</span></h3><div class="t">Total Actions, then Coordination, then Palming. Each round, everyone with actions left acts once.</div>
    <div class="rmeta">Turn ${turn.round} · round order <button class="tb" data-turn="next">Next ›</button><button class="tb" data-turn="reset">New turn</button></div>
    <ol class="init">${o.map(({ pc, S }, i) => { const live = liveOf(pc), w = woundOf(pc, S); const tok = portraitOf(pc, S).src;
      return `<li class="${i === turn.at ? 'on' : ''}"><span class="${isToken(tok) ? 'closeup' : ''} rimg"><img src="${tok}" alt="" draggable="false"></span><span class="who2" data-go="${pc.id}">${esc(choicesOf(pc).name || 'New runner')}</span><span class="nums">${S.actions} Actions · Coord ${S.attr.coord} · Palming ${S.skill.palming}</span><span class="dots">${Array.from({ length: S.health }, (_, k) => `<i class="${live.dmg[k] || ''}"></i>`).join('')}</span>${w.tn ? `<span class="wtn">TN +${w.tn}</span>` : ''}</li>`; }).join('')}</ol></div>`; fitCard(roundCard);
  diceCard.innerHTML = `<div class="fit"><h3>Dice tray <span class="chip" data-go="p-rolls">p.3</span></h3><div class="t">Any pool against any target number. Sixes add a die, or carry on past TN 6.</div>
    <div class="qdice"><label>Dice ${tstep('pool', 1, 30)}</label><label>TN ${tstep('tn', 0, 18)}</label><button class="tb go" data-troll="1">Roll ${qdice2.pool}d6</button></div>
    <div class="rolls">${[...(state.rolls._free || [])].slice(0, 5).map(rollHtml).join('') || '<div class="none">No rolls yet. Rolls from the quickbar land here too.</div>'}</div></div>`; fitCard(diceCard);
}
function tstep(k, min, max) { return `<span class="stepper"><button data-ts="${k}" data-d="-1" ${qdice2[k] <= min ? 'disabled' : ''}>−</button><output>${qdice2[k]}</output><button data-ts="${k}" data-d="1" ${qdice2[k] >= max ? 'disabled' : ''}>+</button></span>`; }
function freeRoll(pool, tn, label = 'Free roll', at) {
  const r = R.roll(pool, tn); const rec = { label, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict };
  (state.rolls._free = state.rolls._free || []).unshift(rec); state.rolls._free = state.rolls._free.slice(0, 8); persist(); renderTable(); toast(rec, at); logPush({ kind: 'roll', who: 'gm', rec }); return rec;
}
function toast(rec, at) {
  const t = $('#toast'); t.innerHTML = rollHtml(rec);
  const r = at?.getBoundingClientRect?.(); t.style.left = (r ? Math.max(180, Math.min(W() - 180, r.left + r.width / 2)) : W() / 2) + 'px'; t.style.top = (r ? Math.max(130, r.top) : 150) + 'px';
  t.hidden = false; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.hidden = true, 300); }, 2800);
}
var tableReady = false;
// the log: every roll and every line of chat, in order (Harry, 13 Nov)
state.log = saved.log || [];
function logPush(e) { state.log.push({ t: Date.now(), ...e }); if (state.log.length > 400) state.log.splice(0, state.log.length - 400); try { const o = JSON.parse(localStorage.getItem('turnip-almanac-2') || '{}'); o.log = state.log; localStorage.setItem('turnip-almanac-2', JSON.stringify(o)); } catch {} renderLog(true); }
let logSpeaker = 'gm';
function speakerOf(id) { if (id === 'gm' || !id) return { name: 'GM', icon: null }; const pc = pcById[id]; return pc ? { name: choicesOf(pc).name || 'Runner', icon: portraitOf(pc, sheetOf(pc)).src } : { name: id, icon: null }; }
function renderLog(stick) {
  const list = logCard.querySelector('.loglist'), atEnd = !list || list.scrollTop + list.clientHeight >= list.scrollHeight - 8;
  const fmt = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rows = state.log.map(e => { const sp = speakerOf(e.who);
    const face = sp.icon ? `<span class="lface"><img src="${sp.icon}" alt="" draggable="false"></span>` : `<span class="lface gm">${esc(sp.name.slice(0, 2))}</span>`;
    return e.kind === 'roll' ? `<div class="lrow roll-e">${face}<div class="lbody"><span class="lt">${fmt(e.t)}</span>${rollHtml(e.rec)}</div></div>`
      : `<div class="lrow chat-e">${face}<div class="lbody"><span class="lt">${fmt(e.t)}</span><b>${esc(sp.name)}</b> ${renderNote(e.text, '', new Set())}</div></div>`; }).join('');
  const opts = [['gm', 'GM'], ...PCS.map(pc => [pc.id, choicesOf(pc).name || 'Runner'])].map(([v, n]) => `<option value="${v}" ${v === logSpeaker ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const had = logCard.querySelector('.loginput'), draft = had ? had.value : '';
  logCard.innerHTML = `<h3>Log <span class="sub3">rolls and chat</span></h3><div class="loglist scrolly">${rows || '<div class="none">Nothing yet. Rolls land here; so does anything said below or with <i>say</i> in the quickbar.</div>'}</div>
    <div class="logsay"><select class="logwho" aria-label="Who is speaking">${opts}</select><input class="loginput" placeholder="Say something… (@names link)" aria-label="Say something" value="${esc(draft)}"><button class="btn" data-logsend="1">Say</button></div>`;
  const l2 = logCard.querySelector('.loglist'); if (stick || atEnd) l2.scrollTop = l2.scrollHeight;
}
function say(text, who) { text = (text || '').trim(); if (!text) return; adoptMentions(text); logPush({ kind: 'chat', who: who || logSpeaker, text }); }
document.addEventListener('click', ev => { if (ev.target.closest('[data-logsend]')) { const i = logCard.querySelector('.loginput'); say(i.value); logCard.querySelector('.loginput').focus({ preventScroll: true }); } });
document.addEventListener('change', ev => { if (ev.target.closest?.('.logwho')) logSpeaker = ev.target.value; });
document.addEventListener('keydown', ev => { if (ev.target.closest?.('.loginput') && ev.key === 'Enter') { ev.preventDefault(); say(ev.target.value); logCard.querySelector('.loginput')?.focus({ preventScroll: true }); } });
function renderQuick() { if (tableReady) renderTable(); }
document.addEventListener('click', ev => {
  const ts = ev.target.closest('[data-ts]'); if (ts) { const k = ts.dataset.ts; qdice2[k] = Math.max(k === 'tn' ? 0 : 1, Math.min(k === 'tn' ? 18 : 30, qdice2[k] + +ts.dataset.d)); renderTable(); return; }
  const tr = ev.target.closest('[data-troll]'); if (tr) { freeRoll(qdice2.pool, qdice2.tn, 'Free roll', tr); return; }
  const tn = ev.target.closest('[data-turn]'); if (tn) { const n = initiative().length; if (tn.dataset.turn === 'next') { turn.at++; if (turn.at >= n) { turn.at = 0; turn.round++; } } else turn = { round: turn.round + 1, at: 0 }; renderTable(); }
});
tableReady = true; renderTable(); renderLog(true);

// ------------------------------------------------------------------ the quickbar: one line of text at the top, like Turnip Works
const qb = $('#qbar'), qin = $('#qbar textarea'), qres = $('#qres');
let qrows = [], qhi = 0; const qhist = [];
function skillWord(w) { w = w.toLowerCase(); return R.ALL_SKILLS.find(s => s === w || R.SK_NAME[s].toLowerCase().startsWith(w)); }
function runnerWord(w) { w = w.toLowerCase(); return PCS.find(pc => (choicesOf(pc).name || '').toLowerCase().startsWith(w) && w.length >= 2); }
function commandsFor(q) {
  const out = [], ws = q.trim().toLowerCase().split(/\s+/).filter(Boolean); if (!ws.length) return out;
  const nums = ws.map(Number).filter(n => !isNaN(n));
  const pcw = ws.map(runnerWord).find(Boolean), sk = ws.map(skillWord).find(Boolean);
  if (ws[0] === 'roll' || ws[0] === 'r') {
    if (pcw && sk) out.push({ k: 'cmd', t: `Roll ${choicesOf(pcw).name}’s ${R.SK_NAME[sk]}`, run: () => rollFor(pcw, sk, sk === 'soak') });
    else if (nums.length) { const pool = nums[0], tn = ws.includes('tn') ? nums[1] ?? 4 : nums[1] ?? 4; out.push({ k: 'cmd', t: `Roll ${pool}d6 at TN ${tn}`, run: () => freeRoll(pool, tn, `Roll ${pool}d6`, qb) }); }
  } else if (pcw && sk) out.push({ k: 'cmd', t: `Roll ${choicesOf(pcw).name}’s ${R.SK_NAME[sk]}`, run: () => rollFor(pcw, sk, sk === 'soak') });
  if ((ws[0] === 'damage' || ws[0] === 'hurt') && pcw) { const n = nums[0] || 1, lethal = ws.some(w => w.startsWith('l')) && ws.some(w => w === 'lethal'); out.push({ k: 'cmd', t: `${choicesOf(pcw).name} takes ${n} ${lethal ? 'lethal' : 'bashing'}`, run: () => { const S = sheetOf(pcw), d = liveOf(pcw).dmg; let left = n; for (let i = 0; i < S.health && left; i++) if (!d[i]) { d[i] = lethal ? 'L' : 'B'; left--; } persist(); renderSheet(pcw); } }); }
  if (ws[0] === 'heal' && pcw) out.push({ k: 'cmd', t: `Clear ${choicesOf(pcw).name}’s damage`, run: () => { liveOf(pcw).dmg = []; persist(); renderSheet(pcw); } });
  if ('new runner'.startsWith(q.trim().toLowerCase()) && q.trim().length >= 3) out.push({ k: 'cmd', t: 'Build a new runner', run: () => { const id = newRunner(); if (id) setTimeout(() => flyTo(`b-${id}-name`), 60); } });
  if (ws[0] === 'build' && pcw) out.push({ k: 'cmd', t: `Open ${choicesOf(pcw).name}’s builder`, run: () => flyTo(`b-${pcw.id}-name`) });
  if (['round', 'initiative', 'order', 'init'].some(w => w.startsWith(ws[0]) && ws[0].length >= 3)) out.push({ k: 'cmd', t: 'Round order', run: () => flyTo('round') });
  if (ws[0] === 'say' && ws.length > 1) { const rest = q.trim().slice(3).trim(), first = rest.split(/\s+/)[0], who = first.endsWith(':') ? runnerWord(first.slice(0, -1)) : null, txt = who ? rest.slice(first.length).trim() : rest;
    out.push({ k: 'cmd', t: `Say “${txt.slice(0, 60)}”${who ? ' as ' + choicesOf(who).name : ''}`, run: () => say(txt, who ? who.id : 'gm') }); }
  if (['log', 'chat', 'history'].some(w => w.startsWith(ws[0]) && ws[0].length >= 3)) out.push({ k: 'cmd', t: 'Log · rolls and chat', run: () => flyTo('log') });
  if (['dice', 'tray'].some(w => w.startsWith(ws[0]) && ws[0].length >= 3)) out.push({ k: 'cmd', t: 'Dice tray', run: () => flyTo('dice') });
  if (['everything', 'overview', 'all'].some(w => w.startsWith(ws[0]) && ws[0].length >= 3)) out.push({ k: 'cmd', t: 'Show everything', run: overview });
  if (ws[0] === 'back') out.push({ k: 'cmd', t: 'Back', run: goBack });
  return out;
}
const KIND_SEC = { character: 'People', person: 'People', thread: 'Threads', place: 'Places', rule: 'Rules', session: 'Sessions', step: 'Builder', note: 'Notes', idea: 'Notes', karma: 'Notes', 'loose note': 'Notes', map: 'Places', book: 'Rules', table: 'At the table', action: 'At the table', help: 'At the table' };
function searchFor(q) {
  q = q.trim().toLowerCase(); const out = [];
  const all = Object.values(nodes).filter(n => n.title && KIND_SEC[n.kind] && n.el);
  const score = n => { const t = (n.title + ' ' + (n.sub || '') + ' ' + (n.text || '')).toLowerCase(); if (!q) return ['character', 'map', 'book', 'session', 'thread', 'person', 'table'].includes(n.kind) ? 1 : 0;
    const i = n.title.toLowerCase().indexOf(q); if (i === 0) return 3; if (i > 0) return 2; return q.split(/\s+/).every(w => t.includes(w)) ? 1 : 0; };
  all.map(n => [score(n), n]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 10).forEach(([, n]) => out.push({ k: KIND_SEC[n.kind], t: n.title, sub: n.sub, icon: n.icon, run: () => flyTo(n.id) }));
  return out;
}
function qrender() {
  const tt = $('#toast'); tt.hidden = true;
  const q = qin.value; qrows = [...commandsFor(q), ...searchFor(q)]; qhi = Math.min(qhi, Math.max(0, qrows.length - 1));
  let last = null;
  qres.innerHTML = qrows.map((r, i) => { const sec = r.k === 'cmd' ? 'Commands' : r.k; const h = sec !== last ? `<div class="qsec">${esc(sec)}</div>` : ''; last = sec;
    return `${h}<div class="qrow${i === qhi ? ' on' : ''}" data-qi="${i}">${r.icon ? `<img src="${r.icon}" alt="">` : `<span class="qdot"></span>`}<span>${esc(r.t)}${r.sub ? ` <small>${esc(r.sub)}</small>` : ''}</span></div>`; }).join('') || '<div class="qsec">Nothing by that name</div>';
  qres.hidden = false; qb.classList.add('open');
}
function qclose() { qres.hidden = true; qb.classList.remove('open'); qin.value = ''; qin.blur(); fitBar(); }
function qrun(i) { const r = qrows[i]; if (!r) return; if (qin.value.trim()) qhist.unshift(qin.value.trim()); qclose(); r.run(); }
function fitBar() { qin.style.height = '20px'; qin.style.height = Math.min(120, qin.scrollHeight) + 'px'; }
function openPal() { qin.focus(); qrender(); }
qin.addEventListener('focus', qrender);
qin.addEventListener('input', () => { qin.value = qin.value.replace(/\n/g, ' '); qhi = 0; fitBar(); qrender(); });
qin.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { ev.preventDefault(); qclose(); }
  else if (ev.key === 'Enter') { ev.preventDefault(); qrun(qhi); }
  else if (ev.key === 'ArrowDown') { ev.preventDefault(); qhi = Math.min(qrows.length - 1, qhi + 1); qrender(); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (!qin.value && qhist.length) { qin.value = qhist[0]; qrender(); } else { qhi = Math.max(0, qhi - 1); qrender(); } }
  ev.stopPropagation();
});
qres.addEventListener('click', ev => { const r = ev.target.closest('[data-qi]'); if (r) qrun(+r.dataset.qi); });
document.addEventListener('pointerdown', ev => { if (!ev.target.closest('#qbar, #qres') && !qres.hidden) qclose(); });

const lanes = [];
// ---- build mode: Tab / Shift+Tab fly step to step; a live thread joins the step to its rule and to the sheet
function setBuild(pcId, key) {
  if (!pcById[pcId] || !ORDER.includes(key)) return;
  const was = state.build?.pc;
  state.build = { pc: pcId, key };
  if (was && was !== pcId && sheetEls[was]) sheetEls[was].querySelector('.builder')?.classList.remove('active');
  sheetEls[pcId].querySelector('.builder')?.classList.add('active');
  dirty = true;
}
function endBuild(finish) {
  const b = state.build; if (!b) return;
  if (finish) { state.done[b.pc] = true; persist(); }
  state.build = null; const pc = pcById[b.pc];
  renderSheet(pc); dirty = true;
  if (finish) flyTo(pc.id);
}
function stepOfEl(e) { const st = e?.closest?.('.bstep[data-id]'); if (!st) return null; const id = st.dataset.id; const key = id.split('-').pop(); return { pc: id.slice(2, id.length - key.length - 1), key }; }
document.addEventListener('keydown', ev => {
  if (!state.build || ev.target.closest?.('#qbar')) return;
  if (ev.target.closest?.('.loose')) return;
  if (ev.key === 'Tab') {
    ev.preventDefault(); ev.stopPropagation();
    const i = ORDER.indexOf(state.build.key), j = Math.max(0, Math.min(ORDER.length - 1, i + (ev.shiftKey ? -1 : 1)));
    if (j !== i) { document.activeElement?.blur?.(); flyTo(`b-${state.build.pc}-${ORDER[j]}`); }
  } else if (ev.key === 'Escape') { ev.preventDefault(); endBuild(false); }
}, true);
document.addEventListener('focusin', ev => { const st = stepOfEl(ev.target); if (st) setBuild(st.pc, st.key); });

// ---- threads: drawn on the canvas in world units, so they scale with everything else
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

// ---- portraits and art: drop an image, upload one, or take a Turnip Works token
function shrinkImage(file) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('not an image'));
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, 720 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      res({ src: c.toDataURL('image/jpeg', 0.84), w: c.width, h: c.height }); }; im.onerror = rej; im.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
function setPortrait(id, src) {
  state.portraits[id] = src; persist();
  if (pcById[id]) renderSheet(pcById[id]);
  else document.querySelectorAll(`[data-portrait="${id}"] img`).forEach(i => i.src = src);
}
function makeArt(a) {
  const e = add(world, 'artcard', a.x, a.y, a.w, null, `<div class="grip"><button aria-label="Remove image">✕</button></div><img src="${a.src}" alt="" draggable="false"><div class="rsz" title="Drag to resize"></div>`);
  e.querySelector('.grip button').addEventListener('click', () => { e.remove(); state.art = state.art.filter(x => x !== a); delete nodes[a.id]; persist(); });
  e.querySelector('.grip').addEventListener('pointerdown', ev => { if (ev.target.closest('button')) return; ev.stopPropagation(); dragNote = { nt: a, e, sx: ev.clientX, sy: ev.clientY, ox: a.x, oy: a.y }; });
  reg(a.id, { el: e, title: 'Image', kind: 'art', box: { x: a.x, y: a.y, w: a.w, h: a.w * (a.ih || 1) } });
}
state.art.forEach(makeArt);
document.addEventListener('dragstart', ev => { if (ev.target.closest?.('#world')) ev.preventDefault(); });   // Firefox: never drag the map image
document.addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.types || [])].includes('Files')) { ev.preventDefault(); ev.target.closest?.('[data-portrait]')?.classList.add('dropping'); } });
document.addEventListener('dragleave', ev => ev.target.closest?.('[data-portrait]')?.classList.remove('dropping'));
document.addEventListener('drop', async ev => {
  const file = ev.dataTransfer?.files?.[0]; if (!file) return; ev.preventDefault();
  document.querySelectorAll('.dropping').forEach(x => x.classList.remove('dropping'));
  let img; try { img = await shrinkImage(file); } catch { return; }
  const pk = ev.target.closest?.('[data-pocket]'); if (pk) { addScrap(pk.dataset.pocket, { kind: 'img', src: img.src }); return; }
  const slot = ev.target.closest?.('[data-portrait]');
  if (slot) { setPortrait(slot.dataset.portrait, img.src); return; }
  const wx = cam.x + ev.clientX / cam.s, wy = cam.y + ev.clientY / cam.s, w = Math.max(300, 420 / cam.s * 0.6);
  const a = { id: 'art-' + Date.now().toString(36), x: wx - w / 2, y: wy - w * img.h / img.w / 2, w, ih: img.h / img.w, src: img.src };
  state.art.push(a); makeArt(a); persist();
});
document.addEventListener('change', async ev => {
  const inp = ev.target.closest?.('input[data-upload]'); if (!inp) return;
  try { const img = await shrinkImage(inp.files[0]); setPortrait(inp.dataset.upload, img.src); } catch {}
});
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tok]'); if (t) { setPortrait(t.dataset.pc, t.dataset.tok); return; }
  if (ev.target.closest('[data-act="finish"]')) return;
  const st = stepOfEl(ev.target); if (st) setBuild(st.pc, st.key);
});

// web fonts arrive after first paint and run a little larger: fit everything again once they are in
document.fonts?.ready.then(() => { PCS.forEach(pc => fitSections(sheetEls[pc.id])); sessionEls.forEach(x => fitCard(x.card)); renderTable(); });

// ---- keys mapped to what people already know (Harry, 13 Nov)
//   ⌘[ / ⌘]  back / forward      ⌘Z / ⇧⌘Z  undo / redo a change to a sheet
//   ⌘C  copy the thing under the pointer (or the last roll)      ⌘V  paste an image (portrait or art) or text (a note)
//   Tab / ⇧Tab  next / previous builder step      Esc  close the quickbar, leave the builder
let lastPt = { x: 0, y: 0 }, lastRollAt = 0;
window.addEventListener('pointermove', ev => { lastPt = { x: ev.clientX, y: ev.clientY }; }, { passive: true });
const undo = [], redo = [];
function snap() { return JSON.stringify({ choices: state.choices, live: state.live, summons: state.summons, done: state.done, asof: state.asof }); }
function pushUndo() { undo.push(snap()); if (undo.length > 60) undo.shift(); redo.length = 0; }
function restore(json) { const o = JSON.parse(json); Object.assign(state, { choices: o.choices, live: o.live, summons: o.summons, done: o.done, asof: o.asof }); persist(); PCS.forEach(renderSheet); }
function doUndo() { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); }
function doRedo() { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); }
const editable = t => t?.closest?.('input, textarea, select, [contenteditable]');
document.addEventListener('keydown', ev => {
  const mod = ev.metaKey || ev.ctrlKey;
  if (mod && (ev.key === '[' || ev.key === ']')) { ev.preventDefault(); ev.stopPropagation(); ev.key === '[' ? goBack() : goFwd(); return; }
  if (editable(ev.target)) return;
  if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? doRedo() : doUndo(); return; }
  if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); doRedo(); return; }
  if (mod && ev.key.toLowerCase() === 'c' && !String(window.getSelection?.() || '')) {
    ev.preventDefault();
    let text = '';
    const rolls = Object.values(state.rolls).map(a => a?.[0]).filter(Boolean);
    if (Date.now() - lastRollAt < 8000 && rolls.length) { const r = $('#toast').textContent || ''; text = r; }
    if (!text) { const hit = document.elementFromPoint(lastPt.x, lastPt.y)?.closest('[data-id]'); const n = hit && nodes[hit.dataset.id];
      text = n ? [n.title, n.sub, n.text].filter(Boolean).join(' · ') : hit?.textContent?.trim().slice(0, 400) || ''; }
    if (text) navigator.clipboard?.writeText(text).catch(() => {});
  }
}, true);
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="roll"], [data-troll], [data-act="sum-pick"]')) lastRollAt = Date.now(); }, true);
document.addEventListener('paste', async ev => {
  if (editable(ev.target)) return;
  const items = [...(ev.clipboardData?.items || [])], img = items.find(i => i.type.startsWith('image/'));
  ev.preventDefault();
  const pocket = document.elementFromPoint(lastPt.x, lastPt.y)?.closest('[data-pocket]');
  if (pocket) { if (img) { try { const pic = await shrinkImage(img.getAsFile()); addScrap(pocket.dataset.pocket, { kind: 'img', src: pic.src }); } catch {} }
    else { const t = ev.clipboardData?.getData('text/plain'); if (t) addScrap(pocket.dataset.pocket, { kind: 'text', text: t.slice(0, 2000) }); } return; }
  if (img) {
    let pic; try { pic = await shrinkImage(img.getAsFile()); } catch { return; }
    const slot = document.elementFromPoint(lastPt.x, lastPt.y)?.closest('[data-portrait]');
    if (slot) { setPortrait(slot.dataset.portrait, pic.src); return; }
    const wx = cam.x + lastPt.x / cam.s, wy = cam.y + lastPt.y / cam.s, w = Math.max(300, 250 / cam.s);
    const a = { id: 'art-' + Date.now().toString(36), x: wx - w / 2, y: wy - w * pic.h / pic.w / 2, w, ih: pic.h / pic.w, src: pic.src };
    state.art.push(a); makeArt(a); persist(); return;
  }
  const text = ev.clipboardData?.getData('text/plain'); if (!text) return;
  const k = Math.max(0.05, Math.min(60, 0.85 / cam.s)); const nt = { id: 'n-' + Date.now().toString(36), x: cam.x + lastPt.x / cam.s - 165 * k, y: cam.y + lastPt.y / cam.s - 40 * k, k, text: text.slice(0, 2000) };
  state.notes.push(nt); makeNote(nt); persist();
});
document.getElementById('qback')?.addEventListener('click', () => goBack());

// ---- resize: drag the corner of a sticky note or a picture to scale it (Harry, 13 Nov)
document.addEventListener('pointerdown', ev => {
  const h = ev.target.closest?.('.rsz'); if (!h) return;
  ev.preventDefault(); ev.stopPropagation();
  const card = h.parentElement, id = card.dataset.id, isNote = card.classList.contains('loose');
  const rec = isNote ? state.notes.find(n => n.id === id) : state.art.find(a => a.id === id); if (!rec) return;
  const r0 = card.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY;
  const k0 = isNote ? (rec.k || 1) : rec.w, w0 = rec.w || 330, h0 = rec.h || 180;
  const move = e => {
    const grow = Math.max((r0.width + (e.clientX - x0)) / r0.width, (r0.height + (e.clientY - y0)) / r0.height);
    const f = Math.max(0.15, grow);
    if (isNote) { rec.w = Math.max(8 / cam.s, w0 + (e.clientX - x0) / cam.s); rec.h = Math.max(8 / cam.s, h0 + (e.clientY - y0) / cam.s); sizeNote(rec, card); nodes[id].box = { ...nodes[id].box, w: rec.w, h: rec.h }; }
    else { rec.w = Math.max(40, k0 * f); card.style.width = rec.w + 'px'; nodes[id].box = { ...nodes[id].box, w: rec.w, h: rec.w * (rec.ih || 1) }; }
  };
  const up = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); persist(); };
  window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true);
}, true);

// ---- sticky notes are free rectangles; their text always fills them (Harry, 13 Nov)
function sizeNote(nt, e) {
  e.style.transform = ''; e.style.width = nt.w + 'px'; e.style.height = nt.h + 'px';
  const gh = Math.max(3, Math.min(nt.h * 0.14, nt.w * 0.14, 90)), grip = e.querySelector('.grip'), body = e.querySelector('.body'), rz = e.querySelector('.rsz');
  grip.style.height = gh + 'px'; grip.querySelector('button').style.fontSize = (gh * 0.55) + 'px'; grip.querySelector('.dots').style.transform = `scale(${gh / 26})`;
  body.style.top = gh + 'px'; body.style.height = (nt.h - gh) + 'px'; body.style.padding = (gh * 0.35) + 'px ' + (gh * 0.45) + 'px';
  if (rz) { rz.style.width = rz.style.height = Math.max(4, gh * 0.85) + 'px'; }
  fitNoteText(e);
}
function fitNoteText(e) {
  const body = e.querySelector('.body'); if (!body) return;
  const empty = !body.textContent.trim();
  if (empty) { body.style.fontSize = Math.max(2, Math.min(body.clientHeight * 0.2, body.clientWidth * 0.08)) + 'px'; return; }
  let lo = 1, hi = Math.max(4, body.clientHeight);
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; body.style.fontSize = mid + 'px';
    if (body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1) lo = mid; else hi = mid; }
  body.style.fontSize = lo + 'px';
}
document.addEventListener('input', ev => { const n = ev.target.closest?.('.loose'); if (n) fitNoteText(n); });

// ------------------------------------------------------------------ camera
const cam = { x: 0, y: 0, s: 0.2 };
const MIN_S = 0.02, MAX_S = 14;
function W() { return vp.clientWidth; } function H() { return vp.clientHeight; }
function apply() {
  world.style.transform = `translate(${-cam.x * cam.s}px, ${-cam.y * cam.s}px) scale(${cam.s})`;
  let step = 40; while (step * cam.s < 18) step *= 5; while (step * cam.s > 90) step /= 5;
  const g = step * cam.s; vp.style.backgroundSize = `${g}px ${g}px`; vp.style.backgroundPosition = `${-cam.x * cam.s % g}px ${-cam.y * cam.s % g}px`;
  dirty = true;
}
function zoomAt(sx, sy, f) {
  const ns = Math.min(MAX_S, Math.max(MIN_S, cam.s * f));
  const wx = cam.x + sx / cam.s, wy = cam.y + sy / cam.s;
  cam.s = ns; cam.x = wx - sx / ns; cam.y = wy - sy / ns; apply();
}
const view = () => [cam.x + W() / 2 / cam.s, cam.y + H() / 2 / cam.s, W() / cam.s];   // center + world width
function setView([cx, cy, w]) { cam.s = W() / w; cam.x = cx - w / 2; cam.y = cy - H() / 2 / cam.s; apply(); }
// van Wijk & Nuij smooth zoom-pan (as in d3.interpolateZoom, rho = sqrt 2)
function interpZoom(p0, p1) {
  const rho = 2, rho2 = 4, rho4 = 16;   // wider than van Wijk's √2: a link pulls well back so you see where you are going (Harry, 13 Nov)
  const [ux0, uy0, w0] = p0, [ux1, uy1, w1] = p1, dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
  let i, S;
  if (d2 < 1e-12) { S = Math.log(w1 / w0) / rho; i = t => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)]; }
  else { const d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
    r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1); S = (r1 - r0) / rho;
    i = t => { const s = t * S, c0 = Math.cosh(r0), u = w0 / (rho2 * d1) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0)); return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / Math.cosh(rho * s + r0)]; }; }
  i.duration = Math.abs(S) * 1000; return i;
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let anim = null;
const hist = { back: [], fwd: [] };
function flyToView(target, record = true) {
  if (record) { hist.back.push(view()); hist.fwd = []; syncHist(); }
  const from = view(); if (anim) cancelAnimationFrame(anim.raf);
  if (reduced) { setView(target); return; }
  const it = interpZoom(from, target), dur = Math.min(2600, Math.max(800, it.duration * 1.1)), t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);   // fast out, slow in: the pull-back takes ~20% of the flight, the dive the rest, easing to a stop (Harry, 13 Nov)
  const step = now => { const t = Math.min(1, (now - t0) / dur); setView(it(ease(t))); if (t < 1) anim = { raf: requestAnimationFrame(step) }; else anim = null; };
  anim = { raf: requestAnimationFrame(step) };
}
function boxOf(id) {
  const n = nodes[id]; if (!n) return null;
  if (n.box) return n.box;
  // nested things (cell notes, builder steps): measure on screen, convert to world
  let e = n.el; while (e && !e.getClientRects().length) e = e.parentElement;
  if (!e) return null; const r = e.getBoundingClientRect();
  return { x: cam.x + r.left / cam.s, y: cam.y + r.top / cam.s, w: r.width / cam.s, h: r.height / cam.s };
}
function viewFor(b, pad = 1.18) { const eh = Math.max(240, H() - 70); const w = Math.max(b.w * pad, b.h * pad * W() / eh, W() / MAX_S); return [b.x + b.w / 2, b.y + b.h / 2 - 35 * w / W(), w]; }
function flyTo(id) {
  if (id.startsWith('b-') || id.startsWith('builder-')) { flyToBuilder(id); return; }
  let b = boxOf(id);
  if (!b) return;
  if (nodes[id]?.kind === 'character') b = { ...b, w: b.w + 210 };   // the sheet and its pocket tab
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
function flash(id) { const e = nodes[id]?.el; if (!e) return; e.classList.add('hl'); setTimeout(() => e.classList.remove('hl'), 1800); }
function overview() { flyToView(viewFor(BOUNDS, 1.02)); }
function syncHist() { const b = document.getElementById('qback'); if (b) b.hidden = !hist.back.length; }
function goBack() { if (!hist.back.length) return; hist.fwd.push(view()); flyToView(hist.back.pop(), false); syncHist(); }
function goFwd() { if (!hist.fwd.length) return; hist.back.push(view()); flyToView(hist.fwd.pop(), false); syncHist(); }

// ------------------------------------------------------------------ semantic zoom pass
function bumpLod() { dirty = true; }
function lodPass() {
  for (const n of lodNodes) {
    if (!n.el.isConnected) { lodNodes.delete(n); continue; }
    const sw = n.box.w * cam.s, z = sw < n.lod[0] ? 'far' : sw < n.lod[1] ? 'mid' : 'near';
    if (n._z === z) continue;
    n._z = z; n.el.dataset.z = z;
    if (!n.lodEls) n.lodEls = ownLodEls(n.el);
    for (const e of n.lodEls) {
      const c = e.classList, show = c.contains('f') ? z === 'far' : c.contains('m') ? z !== 'far' : c.contains('nr') ? z === 'near' : z !== 'near';
      c.toggle('lodoff', !show);
    }
  }
}

// ------------------------------------------------------------------ rulers, edge arrows, threads
const rulerT = $('#rulerT'), rulerL = $('#rulerL'), arrowsEl = $('#arrows');
function rulers() {}
const anchors = [
  { id: 'a-book', label: 'Rulebook', icon: 'assets/genre-modern.png', target: 'book-ssr2' },
  { id: 'a-map', label: 'Map', icon: 'assets/type-OFC.png', target: 'map' },
  { id: 'a-party', label: 'Party', icon: 'assets/tool-pawns.png', target: 'party', box: { x: PX, y: -900, w: SW, h: SLOTS * RH + 900 } },
  { id: 'a-sessions', label: 'Sessions', icon: 'assets/tool-build.png', target: 's1', box: { x: SX, y: SY, w: SBW, h: py - SY } },
  { id: 'a-table', label: 'At the table', icon: 'assets/tool-build.png', target: 'round', box: { x: SX, y: TBY, w: SBW, h: TBH } },
];
arrowsEl.innerHTML = anchors.map(a => `<div class="arrow" data-anchor="${a.id}" tabindex="0" role="button" style="opacity:0;pointer-events:none"><img src="${a.icon}" alt=""><span>${a.label}</span><span class="dir">➜</span></div>`).join('');
function contentCoverage() {
  // how much of the screen is covered by real things (not bands/zones)
  let area = 0; const vw = W(), vh = H();
  for (const id in nodes) { const n = nodes[id]; if (!n.box || n.kind === 'zone' || n.kind === 'now') continue;
    const x0 = Math.max(0, (n.box.x - cam.x) * cam.s), y0 = Math.max(0, (n.box.y - cam.y) * cam.s);
    const x1 = Math.min(vw, (n.box.x + n.box.w - cam.x) * cam.s), y1 = Math.min(vh, (n.box.y + n.box.h - cam.y) * cam.s);
    if (x1 > x0 && y1 > y0) area += (x1 - x0) * (y1 - y0); }
  return area / (vw * vh);
}
function edgeArrows() {
  const lost = contentCoverage() < 0.1, vw = W(), vh = H(), cx = vw / 2, cy = vh / 2, inset = 54;
  const pts = [];
  anchors.forEach(a => {
    const e = arrowsEl.querySelector(`[data-anchor="${a.id}"]`), b = a.box || nodes[a.target].box;
    const sx = (b.x + b.w / 2 - cam.x) * cam.s, sy = (b.y + b.h / 2 - cam.y) * cam.s;
    const onScreen = (b.x + b.w - cam.x) * cam.s > 0 && (b.x - cam.x) * cam.s < vw && (b.y + b.h - cam.y) * cam.s > 0 && (b.y - cam.y) * cam.s < vh;
    if (!lost || onScreen) { e.style.opacity = 0; e.style.pointerEvents = 'none'; return; }
    const dx = sx - cx, dy = sy - cy, k = Math.min((vw / 2 - inset - 60) / Math.abs(dx || 1e-6), (vh / 2 - inset) / Math.abs(dy || 1e-6));
    let px = cx + dx * k, py = cy + dy * k;
    pts.forEach(p => { if (Math.abs(p[0] - px) < 150 && Math.abs(p[1] - py) < 44) py += py < cy ? 46 : -46; }); pts.push([px, py]);
    e.style.left = px + 'px'; e.style.top = py + 'px'; e.style.opacity = 1; e.style.pointerEvents = 'auto';
    e.querySelector('.dir').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}
arrowsEl.addEventListener('click', ev => { const a = ev.target.closest('[data-anchor]'); if (!a) return; const an = anchors.find(x => x.id === a.dataset.anchor);
  if (an.box) flyToView(viewFor(an.box, 1.05)); else flyTo(an.target); });
arrowsEl.addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.target.click(); });

const threadsSvg = $('#threads'), tends = $('#tends');
let threadSrc = null;       // { pcId, key, pinned }
// ------------------------------------------------------------------ frame loop
function labelPass() {
  for (const l of labels) { const f = l.size * cam.s; const lo = l.over ? 40 : 70, hi = l.over ? 110 : 260; const end = l.over ? 0 : 0.05;
    const o = f <= lo ? 0.9 : f >= hi ? end : 0.9 - (f - lo) / (hi - lo) * (0.9 - end); if (l._o !== o) { l.e.style.opacity = o.toFixed(2); l.e.style.visibility = o < 0.01 ? 'hidden' : ''; l._o = o; } }
}
function frame() {
  if (dirty) { dirty = false; labelPass(); edgeArrows(); drawThreads(); pagesPass(); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ input
let pan = null, pinch = null; const ptrs = new Map();
const interactive = t => t.closest('button, input, select, textarea, label, a, [contenteditable], .chip, .tend, .arrow, [data-go], .opt, [data-act], [data-tok], .portrait');
vp.addEventListener('pointerdown', ev => {
  ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; pan = null; return; }
  if (dragNote || interactive(ev.target)) return;
  pan = { sx: ev.clientX, sy: ev.clientY, cx: cam.x, cy: cam.y, moved: false };
});
window.addEventListener('pointermove', ev => {
  if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    cam.x -= (cx - pinch.cx) / cam.s; cam.y -= (cy - pinch.cy) / cam.s; zoomAt(cx, cy, d / pinch.d); pinch = { d, cx, cy }; return; }
  if (dragNote) { const n = dragNote; n.nt.x = n.ox + (ev.clientX - n.sx) / cam.s; n.nt.y = n.oy + (ev.clientY - n.sy) / cam.s; place(n.e, n.nt.x, n.nt.y); nodes[n.nt.id].box = { ...nodes[n.nt.id].box, x: n.nt.x, y: n.nt.y }; return; }
  if (!pan) return;
  const dx = ev.clientX - pan.sx, dy = ev.clientY - pan.sy;
  if (!pan.moved && Math.hypot(dx, dy) < 4) return;
  if (!pan.moved) { pan.moved = true; vp.classList.add('panning'); if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
  cam.x = pan.cx - dx / cam.s; cam.y = pan.cy - dy / cam.s; apply();
});
const up = ev => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (dragNote) { dragNote = null; persist(); } pan = null; vp.classList.remove('panning'); };
window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
vp.addEventListener('wheel', ev => {
  { const sc = ev.target.closest?.('.scrolly'); if (sc && !ev.ctrlKey && !ev.metaKey && sc.scrollHeight > sc.clientHeight + 2) { ev.preventDefault(); sc.scrollTop += ev.deltaY / cam.s; return; } }
  ev.preventDefault(); if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
  const mouseWheel = ev.deltaMode === 1 || (ev.deltaX === 0 && Math.abs(ev.deltaY) >= 50 && Number.isInteger(ev.deltaY));
  if (ev.ctrlKey || ev.metaKey) zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * 0.01));
  else if (mouseWheel && !ev.shiftKey) zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0018)));
  else { cam.x += (ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX) / cam.s; cam.y += (ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY) / cam.s; apply(); }
}, { passive: false });
vp.addEventListener('dblclick', ev => {
  if (interactive(ev.target)) return;
  const hit = ev.target.closest('[data-id]');
  const id = hit?.dataset.id;
  if (id && nodes[id] && !['zone'].includes(nodes[id].kind) && !hit.dataset.band) {
    // the deepest meaningful thing: a builder region on a sheet, else the node
    const b = ev.target.closest('.builder'); flyTo(b ? b.dataset.id : id); return;
  }
  const wx = cam.x + ev.clientX / cam.s, wy = cam.y + ev.clientY / cam.s;
  const k = Math.max(0.05, Math.min(60, 0.85 / cam.s)); const nt = { id: 'n-' + Date.now().toString(36), x: wx - 110 * k, y: wy - 20 * k, k, text: '' };
  state.notes.push(nt); const e = makeNote(nt); persist();
  e.querySelector('.body').focus({ preventScroll: true });
});
document.addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]');
  if (go && !ev.target.closest('.opt:not(.sel)')) { ev.preventDefault(); ev.stopPropagation(); flyTo(go.dataset.go); return; }
  const act = ev.target.closest('[data-act]'); if (act && act.tagName === 'BUTTON' && !act.disabled) { doAct(act); return; }
  const v = ev.target.closest('.main .pv[data-prov]');
  if (v) { const pcId = v.closest('[data-id]').dataset.id; const same = threadSrc && threadSrc.pinned && threadSrc.pcId === pcId && threadSrc.key === v.dataset.prov;
    document.querySelectorAll('.pv.pinned').forEach(x => x.classList.remove('pinned'));
    threadSrc = same ? null : { pcId, key: v.dataset.prov, pinned: true }; if (threadSrc) v.classList.add('pinned'); dirty = true; return; }
  if (threadSrc?.pinned && !pan) { threadSrc = null; document.querySelectorAll('.pv.pinned').forEach(x => x.classList.remove('pinned')); dirty = true; }
}, true);
document.addEventListener('pointerover', ev => { const v = ev.target.closest?.('.main .pv[data-prov]'); if (v && !threadSrc?.pinned) { threadSrc = { pcId: v.closest('[data-id]').dataset.id, key: v.dataset.prov }; dirty = true; } });
document.addEventListener('pointerout', ev => { const v = ev.target.closest?.('.main .pv[data-prov]'); if (v && threadSrc && !threadSrc.pinned) { threadSrc = null; dirty = true; } });
document.addEventListener('focusin', ev => { const v = ev.target.closest?.('.main .pv[data-prov]'); if (v) { threadSrc = { pcId: v.closest('[data-id]').dataset.id, key: v.dataset.prov }; dirty = true; } });
// ---- builder and sheet actions: every control writes the choices object, then the sheet is recomputed
function getPath(o, path) { return path.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, path, v) { const ks = path.split('.'), last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] ?? {}), o); if (v === null || v === '' || (v === 0 && ks.length)) delete t[last]; else t[last] = v; }
function doAct(a) {
  if (a.dataset.act === 'finish') { endBuild(true); return; }
  if (a.dataset.act === 'newpc') { const id = newRunner(a.dataset.slot); if (id) setTimeout(() => flyTo(`b-${id}-name`), 60); return; }
  const pc = pcById[a.dataset.pc]; if (!pc) return;
  const ch = choicesOf(pc), act = a.dataset.act, path = a.dataset.path;
  if (act !== 'roll' && act !== 'sroll' && act !== 'sum-open' && act !== 'sum-cancel') pushUndo();
  if (act === 'inc') { const v = (getPath(ch, path) ?? (path.startsWith('skills.') ? 1 : 0)) + +a.dataset.d; setPath(ch, path, Math.max(+a.dataset.min, Math.min(+a.dataset.max, v))); }
  else if (act === 'set') { const v = a.dataset.v; setPath(ch, path, getPath(ch, path) === v ? null : v); }
  else if (act === 'flag') { setPath(ch, path, getPath(ch, path) ? null : 1); }
  else if (act === 'toggle') { const arr = getPath(ch, path) || []; const v = a.dataset.v; const max = +a.dataset.max || 99;
    setPath(ch, path, arr.includes(v) ? arr.filter(x => x !== v) : (arr.length >= max ? [...arr.slice(1), v] : [...arr, v])); }
  else if (act === 'sroll') { const sm = summonOf(pc); if (!sm) return; const t = R.SUMMONS.find(x => x.id === sm.type), r = R.roll(sm.rating, 4);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · ${t.name} · ${a.dataset.tool}`, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist(); logPush({ kind: 'roll', who: pc.id, rec }); toast(rec, a); renderSheet(pc); return; }
  else if (act === 'sum-open') { state.summonPick[pc.id] = true; renderSheet(pc); return; }
  else if (act === 'sum-cancel') { state.summonPick[pc.id] = false; renderSheet(pc); return; }
  else if (act === 'sum-pick') {
    const S = sheetOf(pc), w = woundOf(pc, S), res = R.summon(a.dataset.type, S, w.tn), t = R.SUMMONS.find(x => x.id === a.dataset.type);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · summon ${t.name}`, pool: res.roll.pool, tn: res.roll.tn, dice: res.roll.dice, succ: res.roll.succ, verdict: res.rating ? `${t.name} at rating ${res.rating}` : 'Nothing answers' };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8);
    logPush({ kind: 'roll', who: pc.id, rec });
    (state.lastSummon = state.lastSummon || {})[pc.id] = res.rating ? null : `Nothing answered the ${t.name}: ${res.roll.succ} successes at TN ${res.roll.tn}.`;
    state.summonPick[pc.id] = false; if (res.rating) state.summons[pc.id] = { type: t.id, rating: res.rating, max: res.rating };
    persist(); toast(rec, a); renderSheet(pc); return;
  }
  else if (act === 'sum-dmg' || act === 'sum-drain') { const sm = summonOf(pc); if (!sm) return; sm.rating -= 1;
    if (act === 'sum-drain') { const d = liveOf(pc).dmg, i = d.lastIndexOf('B'); if (i >= 0) d[i] = null; }
    if (sm.rating <= 0) state.summons[pc.id] = null; persist(); renderSheet(pc); return; }
  else if (act === 'sum-heal') { const sm = summonOf(pc); if (sm && sm.rating < sm.max) sm.rating += 1; persist(); renderSheet(pc); return; }
  else if (act === 'sum-release') { state.summons[pc.id] = null; persist(); renderSheet(pc); return; }
  else if (act === 'asof') { state.asof[pc.id] = +a.dataset.v; renderSheet(pc); return; }
  else if (act === 'dmg') { const live = liveOf(pc); const i = +a.dataset.i; const cur = live.dmg[i]; live.dmg[i] = cur === 'B' ? 'L' : cur === 'L' ? null : 'B'; persist(); renderSheet(pc); return; }
  else if (act === 'roll') { rollFor(pc, a.dataset.skill, !!a.dataset.soak, a); return; }
  persist(); renderSheet(pc);
}
function rollFor(pc, skill, soak, srcEl) {
  const S = sheetOf(pc), w = woundOf(pc, S);
  const r = R.roll(S.skill[skill], S.tn(skill) + w.tn);
  r.label = `${choicesOf(pc).name || 'Runner'} · ${srcEl?.dataset?.tool ? srcEl.dataset.tool + ' · ' : ''}${soak ? 'Soak' : R.SK_NAME[skill]}`;
  if (soak && r.succ) r.verdict = `Soak ${1 + r.bonuses} damage`;
  const rec = { label: r.label, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict };
  (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist(); logPush({ kind: 'roll', who: pc.id, rec });
  const t = $('#toast'), rr = srcEl?.getBoundingClientRect();
  t.innerHTML = rollHtml(rec); t.style.left = Math.max(180, Math.min(W() - 180, rr ? rr.left + rr.width / 2 : W() / 2)) + 'px'; t.style.top = Math.max(90, rr ? rr.top : H() / 2) + 'px';
  const pop = srcEl?.closest('#qpop'); if (pop) { const pr = pop.getBoundingClientRect(); t.style.left = (pr.left + pr.width / 2) + 'px'; t.style.top = pr.top + 'px'; }
  t.hidden = false; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.hidden = true, 300); }, 2600);
  renderSheet(pc);
}
document.addEventListener('input', ev => {
  const i = ev.target.closest('input[data-act="name"], input[data-act="player"]'); if (!i) return; const pc = pcById[i.dataset.pc]; const ch = choicesOf(pc);
  if (i.dataset.act === 'player') { pc.player = i.value; const x = state.extra.find(e => e.id === pc.id); if (x) x.player = i.value; persist(); box_who(pc); return; }
  ch.name = i.value; persist();
  const box = sheetEls[pc.id], nm = ch.name || 'New runner'; box.querySelector('.nm').textContent = nm; box.querySelector('.nm').classList.toggle('empty', !ch.name); nodes[pc.id].title = nm; });
function box_who(pc) { const S = sheetOf(pc); sheetEls[pc.id].querySelector('.who').textContent = `${[S.meta?.name, pc.archetype].filter(Boolean).join(' · ') || 'Not built yet'} · played by ${pc.player || '—'}`; }
document.addEventListener('change', ev => { const s = ev.target.closest('select[data-act="wire"]'); if (!s) return; const pc = pcById[s.dataset.pc]; choicesOf(pc).wire = s.value || null; persist(); renderSheet(pc); });

// ---- the book's pages: every page is always drawn; pdf.js sharpens a page once you are close
let pdfDoc = null, pdfFailed = false;
(async () => {
  try {
    if (!window.pdfjsLib) throw new Error('pdf.js did not load');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfDoc = await pdfjsLib.getDocument(C.book.file).promise; dirty = true;
  } catch (e) { pdfFailed = true; console.warn('Book pages unavailable:', e.message);
    pageFrames.forEach(o => { o.el.querySelector('.ph').innerHTML = `${o.n}<small style="display:block;font-size:30px">The page could not be drawn here.</small>`; }); }
})();
function pagesPass() {
  if (!pdfDoc) return;
  const vw = W(), vh = H(), dpr = Math.min(2, window.devicePixelRatio || 1);
  pageFrames.forEach(o => {
    if (o._busy) return;
    const b = o.box, x0 = (b.x - cam.x) * cam.s, y0 = (b.y - cam.y) * cam.s, sw = b.w * cam.s;
    const onScreen = !(x0 > vw || y0 > vh || x0 + sw < 0 || y0 + b.h * cam.s < 0);
    const want = onScreen && sw * dpr > 1300 ? 2600 : 1300;
    if ((o._res || 0) >= want) return;
    o._busy = true;
    pdfDoc.getPage(o.n).then(page => { const v1 = page.getViewport({ scale: 1 }), v = page.getViewport({ scale: want / v1.width });
      const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
      return page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise.then(() => { o.el.querySelector('.cv').replaceChildren(c); o._res = want; });
    }).catch(e => console.warn('page', o.n, e.message)).finally(() => { o._busy = false; dirty = true; });
  });
}
document.addEventListener('keydown', ev => {
  const typing = ev.target.closest('input, [contenteditable]');
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); openPal(); return; }
  if (typing) { if (ev.key === 'Escape') ev.target.blur(); return; }
  if (ev.key === '/') { ev.preventDefault(); openPal(); }
  else if (ev.altKey && ev.key === 'ArrowLeft') goBack();
  else if (ev.altKey && ev.key === 'ArrowRight') goFwd();
  else if (ev.key === '0') overview();
  else if (ev.key === '+' || ev.key === '=') zoomAt(W() / 2, H() / 2, 1.4);
  else if (ev.key === '-') zoomAt(W() / 2, H() / 2, 1 / 1.4);
  else if (ev.key.startsWith('Arrow')) { const d = 120 / cam.s; if (ev.key === 'ArrowLeft') cam.x -= d; if (ev.key === 'ArrowRight') cam.x += d; if (ev.key === 'ArrowUp') cam.y -= d; if (ev.key === 'ArrowDown') cam.y += d; apply(); }
});
window.addEventListener('resize', apply);

// ------------------------------------------------------------------ start: the whole cluster
setView(viewFor(BOUNDS, 1.02));
window.almanac = { cam, flyTo, nodes, setView, viewFor, overview, state, R, renderSheet, pcById, sheetEls, newRunner, BK_K, BREG, BINNER, setBuild, BOUNDS, pdfState: () => ({ ok: !!pdfDoc, failed: pdfFailed }) };   // for tests
requestAnimationFrame(frame);
})();
