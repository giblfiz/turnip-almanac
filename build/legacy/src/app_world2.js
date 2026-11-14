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
const state = { notes: saved.notes || null, pins: saved.pins || ['pc-tusk', 'map', 'now'], live: saved.live || {}, choices: saved.choices || {}, rolls: saved.rolls || {}, extra: saved.extra || [], asof: {} };
let dirty = true;
let openPop = null;
const qdice = { pool: 4, tn: 4 };
const persist = () => store.set({ notes: state.notes, pins: state.pins, live: state.live, choices: state.choices, rolls: state.rolls, extra: state.extra });

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
const MAP = window.MAPMETA || { width: 9000, height: 8000 };
const MW = 9000, MH = Math.round(MW * (MAP.height / MAP.width));
const SW = 3860, SH = 940, RH = 1000, SLOTS = 6;           // party: six seats down the map's left edge
const PX = -SW - 140;                                      // party column x
const rowsTop = 30;
const pcRowY = i => rowsTop + i * RH;
const sideY0 = rowsTop + SLOTS * RH;                       // people and threads rows start here
const SIDE_H = Math.floor((MH - sideY0 - 20) / (C.npcs.length + C.threads.length));
const SX = MW + 320, colW = 640, colGap = 40, nS = C.sessions.length;
const colX = i => SX + i * (colW + colGap);
const nowX = colX(nS) - colGap / 2;
const L = { col0: SX, colW, nowX, headX: PX };

// ------------------------------------------------------------------ the map: the anchor
const mapEl = add(world, 'map', 0, 0, MW, MH, `<img class="mapimg" src="${MAP.src || ''}" alt="Street map of central Seattle" ${MAP.src ? '' : 'hidden'}>`);
reg('map', { el: mapEl, title: 'Campaign map · Seattle', kind: 'map', icon: 'assets/type-OFC.png', box: { x: 0, y: 0, w: MW, h: MH } });
label(mapEl, 'Seattle · the sprawl', 260, 120, 420, { cls: 'onmap', over: true });
add(mapEl, 'attrib', MW - 1500, MH - 110, 1440, 80, esc(MAP.attribution || 'Map data © OpenStreetMap contributors, ODbL'));
C.places.forEach(p => {
  const pt = (MAP.points || {})[p.key] || { fx: p.x / 1400, fy: p.y / 1000 };
  const x = pt.fx * MW, y = pt.fy * MH;
  const e = add(mapEl, 'place', x - 170, y - 170, 340, null, `<img class="pi" src="${p.icon}" alt=""><div class="pn">${esc(p.name)}</div><div class="pnote">${esc(p.note)}</div><a class="tw" href="https://turnipworks.net/" target="_blank" rel="noopener">Open table in Turnip Works ↗</a><div class="backs"></div>`);
  reg(p.id, { el: e, title: p.name, kind: 'place', icon: p.icon, box: { x: x - 170, y: y - 170, w: 340, h: 520 } });
});

// ------------------------------------------------------------------ the shelf: Harry's book, its index beside its real pages
const BK = C.book, PW = 1000, PH = Math.round(PW * BK.ph / BK.pw), PG = 60;
const IDXW = 1300, bookW = 40 + IDXW + 60 + 2 * PW + PG + 40, BX = PX - 320 - bookW, BY = 0;
const pagesX = 40 + IDXW + 60, pagesY = 260;
const bookH = pagesY + 2 * PH + PG + 60;
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
add(world, 'card interpcard', BX, BY + bookH + 60, bookW, 300, `<h3>Where this book is open, the Almanac decides</h3><div class="t">${R.interpretations.map(esc).join('<br>')}</div>`);

// ------------------------------------------------------------------ party: sheets as rows down the map's left edge
const clone = o => JSON.parse(JSON.stringify(o));
const PCS = [...C.pcs, ...state.extra];
const pcById = Object.fromEntries(PCS.map(p => [p.id, p]));
function choicesOf(pc) { return state.choices[pc.id] || (state.choices[pc.id] = clone(pc.choices || R.blank(''))); }
const sheetEls = {};
const STEP_NAME = { meta: 'metatype', attr: 'attributes', skills: 'skills', magic: 'magic', cyber: 'cyberware', gear: 'gear', veh: 'vehicles', deck: 'deck & chips', circles: 'social circles', life: 'lifestyle', name: 'name' };
const resolveSrc = (pc, id) => id.startsWith('B:') ? `b-${pc.id}-${id.slice(2)}` : id;
// builder: fixed columns, so nothing ever moves when a choice opens a step
const BCOLS = [['name', 'meta', 'attr', 'life'], ['skills', 'deck'], ['magic', 'circles'], ['cyber', 'veh'], ['gear']];
const BIW = 880, BGAP = 40, BREG = { x: 2440, y: 30, w: SW - 2440 - 30, h: SH - 60 };
const BK_K = BREG.w / (BCOLS.length * BIW + (BCOLS.length - 1) * BGAP + 60);

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
function rollHtml(r) {
  const dice = r.dice.map(d => `<i class="${d.ok ? 'ok' : ''}">${d.chain.join('+')}</i>`).join('');
  return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">${r.pool}d6 · TN ${r.tn}</span><span class="dd">${dice}</span><span class="verdict${r.succ ? '' : ' fail'}">${r.succ} · ${esc(r.verdict)}</span></div>`;
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
  const circleRows = S.circles.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${esc(Object.values(R.CIRCLE_LV).find(l => l.tool === c.tool).name.toLowerCase())} ${c.tool}${c.free ? ' · free' : ''}</span></div>`);
  box.innerHTML = `
    <div class="main">
    <section class="sA">
      <button class="pinbtn${state.pins.includes(pc.id) ? ' on' : ''}" data-pin="${pc.id}" aria-label="Pin to bar">★</button>
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget">
        <div class="${S.left < 0 ? 'over' : ''}"><div class="k">Points ${chip(P.start)}</div><div class="bv">${pv('pts', S.pts)} <span class="tn">/ 100 · ${S.left} left</span></div><div class="bar"><i style="width:${Math.min(100, S.pts)}%"></i></div></div>
        <div><div class="k">Essence</div><div class="bv">${pv('essence', S.essence)} <span class="tn">/ 60 · Magic cap ${S.magicCap}</span></div><div class="bar"><i style="width:${Math.max(0, S.essence) / 60 * 100}%"></i></div></div>
        <div><div class="k">Karma ${chip(P.karma)}</div><div class="bv">${kLeft} <span class="tn">free · ${S.karma.earned} earned</span></div><div class="bar"><i style="width:${S.karma.earned ? S.karma.spent / S.karma.earned * 100 : 0}%"></i></div></div>
      </div>
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
      <div class="sec">Where the points went</div><div class="ledger">${S.spend.map(x => `<div><span>${esc(x.label)}</span><span>${x.pts}</span></div>`).join('') || '<div><span>Nothing bought yet</span><span>0</span></div>'}</div>
    </section>
    <section class="sB">
      <h4>Attributes & skills ${chip(P.rolls, 'rolls p.3')}</h4>
      <div class="grid4">${cols}</div>
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
    <section class="sC">
      <h4>Gear, ware & magic</h4>
      <div class="cols2">
        <div><div class="sec">Cyberware ${chip(P.cyber)}</div><div class="list">${listOr(S.cyber, c => `<div><b>${esc(c.name)}${c.n > 1 ? ' ×' + c.n : ''}</b> <span class="e">${esc(c.eff)}${c.id === 'skillwires' && ch.wire ? ` (${R.SK_NAME[ch.wire]})` : ''}</span></div>`)}</div></div>
        <div><div class="sec">Weapons & gear ${chip(P.gear)}</div><div class="list">${listOr(S.gear, g => `<div><b>${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}</b> <span class="e">${esc(g.eff)}</span></div>`)}${S.trollDmg ? '<div class="e">Troll: +1 damage, melee and unarmed.</div>' : ''}</div></div>
        <div><div class="sec">Magic ${chip(P.magic)}</div><div class="list">${S.trad ? `<div><b>${esc(S.trad.name)}</b></div>` + S.spells.map(sp => `<div><b>${esc(sp.name)}</b> <span class="e">[${esc(sp.eff)}]${sp.free ? ' · free' : ''}${sp.karma ? ` · ${chip(sp.karma, 'karma')}` : ''}</span></div>`).join('') : '<div class="none">No tradition</div>'}</div></div>
        <div><div class="sec">Vehicles, deck & chips ${chip(P.veh)}</div><div class="list">${listOr([...S.veh.map(v => `<div><b>${esc(v.name)}${v.n > 1 ? ' ×' + v.n : ''}</b> <span class="e">HP ${v.hp}, armor ${v.armor}</span></div>`), ...(S.deck ? [`<div><b>${esc(S.deck.name)}</b> <span class="e">Actions ${S.deck.actions}</span></div>`] : []), ...S.chips.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${c.kind} ${c.tier[1]}</span></div>`)], x => x)}</div></div>
        <div><div class="sec">Social circles ${chip(P.circles)}</div><div class="list">${circleRows.join('') || '<div class="none">None</div>'}</div></div>
        <div><div class="sec">Lifestyle</div><div class="list">${S.life ? `<div><b>${esc(S.life.name)}</b> <span class="e">${S.life.tool} · ¥${S.life.cash.toLocaleString()}</span></div>` : '<div class="none">None</div>'}</div></div>
      </div>
    </section>
    </div>
    <div class="builder" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl blbl', 'CHARACTER BUILDER'); bl.style.fontSize = '150px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 150, over: true });
  box._prev = Object.fromEntries([...R.ATTRS.map(a => ['a:' + a, S.attr[a]]), ...R.ALL_SKILLS.map(s => ['s:' + s, S.skill[s]]), ['actions', S.actions], ['armor', S.armor], ['health', S.health], ['essence', S.essence], ['pts', S.pts]]);
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  renderQuick(); dirty = true;
}
function placeSheet(pc, slot) {
  const e = add(world, 'sheet', PX, pcRowY(slot), SW, SH); sheetEls[pc.id] = e; pc.slot = slot;
  reg(pc.id, { el: e, title: '', kind: 'character', icon: 'assets/tool-pawns.png', box: { x: PX, y: pcRowY(slot), w: SW, h: SH } });
  renderSheet(pc);
}

// rows behind everything: one per seat, then people and threads; they run under the map and on through the sessions
const rows = [];
for (let i = 0; i < SLOTS; i++) rows.push({ y: pcRowY(i), h: SH, kind: 'seat', i });
[...C.npcs.map(n => ({ id: n.id, kind: 'npc' })), ...C.threads.map(t => ({ id: t.id, kind: 'thread' }))].forEach((r, j) => rows.push({ ...r, y: sideY0 + j * SIDE_H, h: SIDE_H - 40 }));
const bandEls = [];
rows.forEach((r, i) => { const b = el('div', 'n lane' + (i % 2 ? ' alt' : '')); place(b, PX - 30, r.y - 15, colX(nS + 1) - PX + 30, r.h + 30); b.dataset.band = 1; bandEls.push(b); });
// session columns
C.sessions.forEach((s, i) => {
  const c = el('div', 'n col'); place(c, colX(i) - colGap / 2, -760, 1, MH + 760); c.dataset.band = 1; bandEls.push(c);
  const h = add(world, 'colhead card', colX(i), -760, colW, 700, `<div class="snum">S${s.n}</div><h2>${esc(s.title)}</h2><div class="date">${esc(s.date)}</div><div class="recap">${esc(s.recap)}</div>`);
  reg('s' + s.n, { el: h, title: `S${s.n} · ${s.title}`, kind: 'session', box: { x: colX(i), y: -760, w: colW, h: 700 } });
});
{
  const pw = el('div', 'n prepwash'); place(pw, colX(nS), -780, colW, MH + 780); pw.dataset.band = 1; bandEls.push(pw);
  const h = add(world, 'colhead prep', colX(nS), -760, colW, 700, `<div class="snum">S${C.prep.n}?</div><h2>${esc(C.prep.title)}</h2><div class="date">${esc(C.prep.date)}</div><div class="recap">Ideas sit up here, unsettled, until the table makes them true.</div>`);
  reg('s' + C.prep.n, { el: h, title: `S${C.prep.n} · ${C.prep.title}`, kind: 'session', box: { x: colX(nS), y: -760, w: colW, h: 700 } });
  const nl = el('div', 'n nowline'); place(nl, nowX - 3, -880, 6, MH + 900); nl.dataset.band = 1; bandEls.push(nl);
  const nt = add(world, '', nowX - 90, -960, 180, 70, '<div class="nowtag">Now</div>');
  reg('now', { el: nt, title: 'Now · next session', kind: 'now', icon: 'assets/tool-build.png', box: { x: nowX - 60, y: -780, w: colW + 120, h: 2200 } });
  const ib = add(world, 'inbox', colX(nS + 1) + 40, -760, 900, 1400, `<div class="ih"><h2>Inbox</h2>Loose notes land here. Drag them where they belong, or leave them.</div>`);
  reg('inbox', { el: ib, title: 'Inbox · loose notes', kind: 'inbox', box: { x: colX(nS + 1) + 40, y: -760, w: 900, h: 1400 } });
}
label(world, 'Sessions →', SX, -1240, 300);
bandEls.reverse().forEach(e => world.prepend(e));

// the launcher: above the party, straddling onto the map
const launch = add(world, 'launch', PX, -900, SW + 1700, 760, `<button class="launchbtn" data-act="newpc"><span class="plus">+</span><span><b>Build a new runner</b><small>Opens a blank sheet in the next empty seat and takes you to its builder.</small></span></button>`);
reg('launch', { el: launch, title: 'Build a new runner', kind: 'action', icon: 'assets/tool-pawns.png', box: { x: PX, y: -900, w: SW + 1700, h: 760 } });
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

// people and threads: row heads at the party column, under the seats
rows.filter(r => r.id).forEach(r => {
  const o = r.kind === 'npc' ? npcIndex[r.id] : C.threads.find(t => t.id === r.id);
  const e = add(world, 'lanehead card', PX, r.y, 1500, r.h, `${o.icon ? `<img src="${o.icon}" alt="">` : ''}<div class="num">${r.kind === 'npc' ? 'Person' : 'Thread'}</div><h2>${esc(o.name)}</h2><div class="t">${esc(o.text || 'An open question the table keeps pulling on.')}</div><div class="t backs"></div>`);
  reg(r.id, { el: e, title: o.name, kind: r.kind === 'npc' ? 'person' : 'thread', icon: o.icon, box: { x: PX, y: r.y, w: 1500, h: r.h } });
});
// cells: row × session
const rowOf = id => { const pc = pcById[id]; if (pc) return { y: pcRowY(pc.slot), pc }; const r = rows.find(x => x.id === id); return r ? { y: r.y } : null; };
Object.keys({ ...C.cells, ...Object.fromEntries(C.pcs.map(p => [p.id, 1])) }).forEach(id => {
  const ro = rowOf(id); if (!ro) return;
  const row = C.cells[id] || {}, pc = ro.pc;
  [...C.sessions.map(s => s.n), C.prep.n].forEach((n, i) => {
    const notes = (row[n] || []).map((t, j) => ({ id: `c-${id}-${n}-${j}`, text: t, idea: n === C.prep.n }));
    const ks = pc ? (pc.karma || []).filter(k => k.s === n) : [];
    if (!notes.length && !ks.length) return;
    const cell = add(world, 'cellnotes', colX(i), ro.y + 20, colW, null);
    ks.forEach(k => {
      const buys = (k.buy || []).map(b => b.skill ? `${R.SK_NAME[b.skill]} → ${b.to}` : `Spell: ${R.SPELL_BY_ID[b.spell].name}`).join(', ');
      const e = el('div', 'cnote adv', `<div class="lvl">Karma +${k.award || 0}</div>${buys ? `<div class="what">${esc(buys)}</div>` : ''}<div class="why">${esc(k.note || 'Banked.')}</div>`);
      cell.appendChild(e); reg(k.id, { el: e, title: `${titleOf(pc.id)} · karma S${n}${buys ? ': ' + buys : ''}`, kind: 'karma', sub: `S${n}` });
    });
    notes.forEach(nt => { const e = el('div', 'cnote' + (nt.idea ? ' idea' : ''), linkify(nt.text, nt.id)); cell.appendChild(e);
      reg(nt.id, { el: e, title: e.textContent.slice(0, 70), kind: nt.idea ? 'idea' : 'note', sub: `S${n} · ${titleOf(id)}` }); });
  });
});
PCS.forEach(pc => { nodes[pc.id].title = choicesOf(pc).name || 'New runner'; });
function backHtml(id) { const b = [...new Set(backlinks[id] || [])]; if (!b.length) return '';
  return 'Mentioned in ' + b.map(f => { const m = f.match(/^c-(.+)-(\d+)-\d+$/); return `<span class="chip" data-go="${f}">S${m[2]}</span>`; }).join(' '); }
Object.keys(backlinks).forEach(id => { [nodes['idx-' + id], nodes[id]].forEach(t => { const b = t?.el?.querySelector('.backs'); if (b) b.innerHTML = backHtml(id); }); });

// loose notes
let dragNote = null;
function makeNote(nt) {
  const e = add(world, 'loose', nt.x, nt.y, null, null, `<div class="grip"><button aria-label="Delete note">✕</button></div><div class="body" contenteditable="true" spellcheck="false"></div>`);
  e.querySelector('.body').textContent = nt.text || '';
  e.querySelector('.body').addEventListener('input', ev => { nt.text = ev.target.textContent; nodes[nt.id].title = nt.text.slice(0, 60) || 'Note'; persist(); });
  e.querySelector('.grip button').addEventListener('click', () => { e.remove(); state.notes = state.notes.filter(n => n !== nt); delete nodes[nt.id]; persist(); });
  e.querySelector('.grip').addEventListener('pointerdown', ev => { if (ev.target.closest('button')) return; ev.stopPropagation(); dragNote = { nt, e, sx: ev.clientX, sy: ev.clientY, ox: nt.x, oy: nt.y }; });
  reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: 330, h: 180 } });
  return e;
}
if (!state.notes) state.notes = [
  { id: 'n-1', x: colX(nS + 1) + 90, y: -560, text: 'Ask Clutch’s player whether Clutch keeps the BigBeatle or trades up to a GunBug.' },
  { id: 'n-2', x: colX(nS + 1) + 470, y: -440, text: 'Grey paid ¥4,000 each. Where did that money come from?' },
];
state.notes.forEach(makeNote);

// ------------------------------------------------------------------ the quickbar: the table at a glance
function initiative() {
  return PCS.filter(pc => choicesOf(pc).meta || choicesOf(pc).name).map(pc => ({ pc, S: sheetOf(pc) }))
    .sort((a, b) => b.S.actions - a.S.actions || b.S.attr.coord - a.S.attr.coord || b.S.skill.palming - a.S.skill.palming);
}
function renderQuick() {
  const q = $('#quick'); if (!q) return;
  q.innerHTML = PCS.map(pc => { const S = sheetOf(pc), live = liveOf(pc), w = woundOf(pc, S); const nm = choicesOf(pc).name || 'New';
    return `<button class="qpc${openPop === pc.id ? ' on' : ''}" data-q="${pc.id}" title="${esc(nm)}"><b>${esc(nm)}</b><span class="dots">${Array.from({ length: S.health }, (_, i) => `<i class="${live.dmg[i] || ''}"></i>`).join('')}</span><span class="qa">A${S.actions}${w.tn ? ` · +${w.tn}` : ''}</span></button>`; }).join('');
  if (openPop) renderPop();
}
function renderPop() {
  const pop = $('#qpop'); pop.hidden = !openPop; if (!openPop) return;
  if (openPop === 'init') {
    const o = initiative();
    pop.innerHTML = `<h3>Round order ${`<span class="chip" data-go="p-turns">p.3</span>`}</h3><div class="hint">Total Actions, then Coordination, then Palming. Everyone with actions left acts once per round.</div><ol class="init">${o.map(({ pc, S }) => `<li><b>${esc(choicesOf(pc).name || 'New runner')}</b> <span>${S.actions} Actions · Coord ${S.attr.coord} · Palming ${S.skill.palming}</span></li>`).join('')}</ol>`;
  } else if (openPop === 'dice') {
    pop.innerHTML = `<h3>Roll any pool</h3><div class="hint">Modified rule of six: sixes add another die, or carry on past TN 6.</div><div class="qdice"><label>Dice ${qstep('pool', 1, 30)}</label><label>TN ${qstep('tn', 0, 18)}</label><button class="go" data-qroll="1">Roll ${qdice.pool}d6</button></div><div class="rolls">${(state.rolls._free || []).slice(0, 3).map(rollHtml).join('')}</div>`;
  } else {
    const pc = pcById[openPop], S = sheetOf(pc), live = liveOf(pc), w = woundOf(pc, S);
    const top = R.ALL_SKILLS.filter(s => s !== 'soak').sort((a, b) => S.skill[b] - S.skill[a]).slice(0, 6);
    pop.innerHTML = `<h3>${esc(choicesOf(pc).name || 'New runner')} <button class="go" data-go="${pc.id}">Open sheet</button></h3>
      <div class="track">${Array.from({ length: S.health }, (_, i) => `<button class="${live.dmg[i] || ''}" data-act="dmg" data-pc="${pc.id}" data-i="${i}" aria-label="Damage box ${i + 1}">${live.dmg[i] || ''}</button>`).join('')}<span class="wound">${w.filled ? (S.adept ? 'no wound penalty' : `TN +${w.tn}`) : ''}</span></div>
      <div class="qskills">${top.map(s => `<button data-act="roll" data-pc="${pc.id}" data-skill="${s}">${R.SK_NAME[s]} <b>${S.skill[s]}</b><small>TN ${S.tn(s) + w.tn}</small></button>`).join('')}<button data-act="roll" data-pc="${pc.id}" data-skill="soak" data-soak="1">Soak <b>${S.skill.soak}</b><small>TN ${S.tn('soak') + w.tn}</small></button></div>
      <div class="rolls">${(state.rolls[pc.id] || []).slice(0, 2).map(rollHtml).join('')}</div>`;
  }
}
function qstep(k, min, max) { return `<span class="stepper"><button data-qs="${k}" data-d="-1" ${qdice[k] <= min ? 'disabled' : ''}>−</button><output>${qdice[k]}</output><button data-qs="${k}" data-d="1" ${qdice[k] >= max ? 'disabled' : ''}>+</button></span>`; }
document.addEventListener('click', ev => {
  const qb = ev.target.closest('[data-q]'); if (qb) { openPop = openPop === qb.dataset.q ? null : qb.dataset.q; renderQuick(); renderPop(); return; }
  const qs = ev.target.closest('[data-qs]'); if (qs) { const k = qs.dataset.qs; qdice[k] = Math.max(k === 'tn' ? 0 : 1, Math.min(k === 'tn' ? 18 : 30, qdice[k] + +qs.dataset.d)); renderPop(); return; }
  const qr = ev.target.closest('[data-qroll]'); if (qr) { const r = R.roll(qdice.pool, qdice.tn); r.label = 'Free roll'; (state.rolls._free = state.rolls._free || []).unshift({ label: r.label, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict }); state.rolls._free = state.rolls._free.slice(0, 6); persist(); renderPop(); return; }
  if (openPop && ev.target.isConnected && !ev.target.closest('#qpop, #bar')) { openPop = null; renderQuick(); renderPop(); }
});
