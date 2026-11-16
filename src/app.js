
(() => {
'use strict';
// Turnip Almanac. One tight cluster: book | party | the map (the anchor) | sessions.
// Nothing changes what it shows when you zoom. Big headline labels sit over regions and fade only once
// they are bigger than the detail under them.
const C = window.CAMPAIGN, R = window.RIG;
const $ = (s, r = document) => r.querySelector(s);
const vp = $('#vp'), world = $('#world');
const STORE_KEY = C.id ? `turnip-almanac-2:${C.id}` : 'turnip-almanac-2';   // one saved table per campaign
let FROZEN = false;   // set while going back in history, so nothing on the way out overwrites the restored record
const lsSet = (k, v) => { if (!FROZEN) localStorage.setItem(k, v); };
const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } },
  set(v) { try { lsSet(STORE_KEY, JSON.stringify(v)); } catch {} },
};
const saved = store.get();
const state = { notes: saved.notes || null, pins: saved.pins || ['map', 'now'], live: saved.live || {}, choices: saved.choices || {}, rolls: saved.rolls || {}, extra: saved.extra || [], portraits: saved.portraits || {}, art: saved.art || [], done: saved.done || {}, summons: saved.summons || {}, mapImg: saved.mapImg || '', order: saved.order || null, removed: saved.removed || [], rollCount: saved.rollCount || {}, adv: saved.adv || {}, checks: saved.checks || {}, summonPick: {}, asof: {}, build: null };
let dirty = true;
let openPop = null;
const qdice = { pool: 4, tn: 4 };
const persist = () => store.set({ notes: state.notes, pins: state.pins, live: state.live, choices: state.choices, rolls: state.rolls, extra: state.extra, portraits: state.portraits, art: state.art, done: state.done, summons: state.summons, order: state.order, removed: state.removed, rollCount: state.rollCount, adv: state.adv, checks: state.checks, mapImg: state.mapImg });

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
  const e = add(parent, 'lbl' + (opts.over ? ' over' : '') + (opts.cls ? ' ' + opts.cls : ''), x, y, opts.w ?? null, null, esc(text));
  e.style.fontSize = size + 'px'; if (opts.align) e.style.textAlign = opts.align;
  labels.push({ e, size: size * (opts.k || 1), over: !!opts.over, ww: opts.w != null ? opts.w * (opts.k || 1) : null }); return e;
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
const MAP_ART = C.mapArt ? (C.print || []).find(p => p.id === C.mapArt) : null;
// the campaign map: the book's own map art (cut from the reader's copy once it is open), else the street map
const MAP = C.mapBlank ? { width: 9000, height: 8000, src: state.mapImg || '', attribution: 'Your own map, kept in this browser', alt: 'Your world map' } : MAP_ART ? { width: MAP_ART.rect[2], height: MAP_ART.rect[3], src: '', attribution: `Map: ${C.book.fullTitle || C.book.title}, cut from your copy`, alt: 'The map from the book' } : (window.MAPMETA || { width: 9000, height: 8000 });
const HISTW = 1300;   // the history card's width (it lives far left of the map)
const SW = 2100, SH = 1300, RH = SH + 60, SLOTS = 6;       // party: six seats down the map's right edge
const rowsTop = 40;
const pcRowY = i => rowsTop + i * RH;
const MH = rowsTop + SLOTS * RH;
const MW = Math.round(MH * (MAP.width / MAP.height));
const PX = MW + 160;                                        // party column x, on the map's right edge

// ------------------------------------------------------------------ the map: the anchor
const mapEl = add(world, 'map' + (C.mapBlank ? ' blankmap' : ''), 0, 0, MW, MH, `<img class="mapimg" src="${MAP.src || ''}" alt="${esc(MAP.alt || 'Street map of central Seattle')}" draggable="false" ${MAP.src ? '' : 'hidden'}>${MAP_ART ? `<div class="mapwait">The map comes from your copy of the book.<br>Open it on the book above.</div>` : C.mapBlank && !state.mapImg ? `<div class="mapwait">Your world map goes here.<br>Drop a picture of it on this spot.</div>` : ''}`);
reg('map', { el: mapEl, title: `Campaign map · ${C.mapTitle || 'Seattle'}`, kind: 'map', icon: 'assets/type-OFC.png', box: { x: 0, y: 0, w: MW, h: MH } });
label(mapEl, C.mapTitle || 'Seattle · the sprawl', 300, 160, 520, { cls: 'onmap', over: true });
add(mapEl, 'attrib', MW - 1500, MH - 110, 1440, 80, esc(MAP.attribution || 'Map data © OpenStreetMap contributors, ODbL'));
C.places.forEach(p => {
  const pt = p.fx != null ? { fx: p.fx, fy: p.fy } : (MAP.points || {})[p.key] || { fx: p.x / 1400, fy: p.y / 1000 };
  const x = pt.fx * MW, y = pt.fy * MH;
  const e = add(mapEl, 'place', x - 220, y - 220, 440, null, `<img class="pi" src="${p.icon}" alt=""><div class="pn">${esc(p.name)}</div><div class="pnote">${esc(p.note)}</div><a class="tw" href="https://turnipworks.net/" target="_blank" rel="noopener">Open table in Turnip Works ↗</a><div class="backs"></div>`);
  reg(p.id, { el: e, title: p.name, kind: 'place', icon: p.icon, box: { x: x - 220, y: y - 220, w: 440, h: 640 } });
});

// ------------------------------------------------------------------ the shelf: the book, its index beside its real pages
const BK = C.book, PW = 1000, PH = Math.round(PW * BK.ph / BK.pw), PG = 60;
// The book is a cluster of chapter blocks (a squarified treemap in a golden box), each block an index column beside its
// pages, scaled as a whole to fill its cell (E2, E6). The whole book is sized against the map so the map stays the
// anchor (H, 14 Nov: "why is this thing 5 times bigger than the map?"): pages shrink, chapters get fading headlines (E1).
const allParts = (BK.parts || [{ title: BK.fullTitle || BK.title, from: 1, to: BK.pages }]).map(pt => ({ ...pt,
  n: pt.to - pt.from + 1, entries: C.print.filter(p => p.page >= pt.from && p.page <= pt.to && p.kind !== 'art') }));
// reference parts cluster with the book (golden); adventure parts run in play order as a strip below the map (H, 14–15 Nov)
const parts = allParts.filter(pt => pt.kind !== 'adventure'), advParts = allParts.filter(pt => pt.kind === 'adventure');
const ICW = 316, IRH = 150, IGAP = 10, HEADH = 120, PPAD = 30;
function partNatural(n, m, c, ic) {   // natural size (u = 1) of a chapter block with c page columns and ic index columns
  const rows = Math.ceil(n / c), ih = ic ? Math.ceil(m / ic) * IRH : 0;
  return { w: PPAD * 2 + (ic ? ic * (ICW + IGAP) + 40 : 0) + c * (PW + PG) - PG, h: HEADH + Math.max(rows * (PH + PG) - PG, ih - IGAP) + PPAD, rows };
}
const natArea = pt => { let best = 1e18; for (let c = 1; c <= pt.n; c++) { const ic = pt.entries.length ? Math.max(1, Math.ceil(pt.entries.length * IRH / ((Math.ceil(pt.n / c)) * (PH + PG)))) : 0; const d = partNatural(pt.n, pt.entries.length, c, ic); best = Math.min(best, d.w * d.h); } return best; };
parts.forEach(pt => pt.area = natArea(pt));
const INTERP = { title: 'Where this book is open', interp: true, area: 0 };
// size: at most ~40% of the map's area (the map is MW × MH, laid out above), never larger than the natural size
const BOOK_TOP = 300;   // the strip with the book's own title
const natTotal = parts.reduce((t, pt) => t + pt.area, 0);
INTERP.area = 1700 * 800;   // its natural size: readable when the pages are
const bookArea = Math.min((natTotal + INTERP.area) * 1.08, 0.40 * MW * MH);
// ordered golden treemap: split the chapter list (in reading order) in two and the box along its longer side, choosing
// the split whose cells come out nearest the golden ratio; recurse. Reading order runs left→right, top→bottom.
const PHI = 1.618, dev = (w, h) => { const a = Math.max(w, h) / Math.min(w, h); return a >= PHI ? a / PHI : PHI / a; };
function goldenSplit(items, x, y, w, h) {
  // the score depends only on the aspect ratio, so memoise on (range, aspect): a few thousand calls, not millions
  const pre = [0]; items.forEach(i => pre.push(pre.at(-1) + i.area)); const memo = new Map();
  function best(i, j, asp) {   // asp = w / h of the box holding items[i..j)
    const key = i + ',' + j + ',' + Math.round(Math.log(asp) * 40); const hit = memo.get(key); if (hit) return hit;
    let r;
    if (j - i === 1) r = { score: dev(asp, 1), plan: null };
    else { r = null; const tot = pre[j] - pre[i];
      for (let k = i + 1; k < j; k++) { const f = (pre[k] - pre[i]) / tot;
        for (const horiz of [true, false]) {
          const aA = horiz ? asp * f : asp / f, aB = horiz ? asp * (1 - f) : asp / (1 - f);
          const l = best(i, k, aA), rr = best(k, j, aB), score = Math.max(l.score, rr.score) + 0.15 * (l.score + rr.score);
          if (!r || score < r.score) r = { score, plan: { k, f, horiz } };
        } } }
    memo.set(key, r); return r;
  }
  const cells = [];
  (function place(i, j, x, y, w, h) {
    const r = best(i, j, w / h); if (!r.plan) { cells.push({ i: items[i], x, y, w, h }); return; }
    const { k } = r.plan, f = (pre[k] - pre[i]) / (pre[j] - pre[i]);
    if (r.plan.horiz) { place(i, k, x, y, w * f, h); place(k, j, x + w * f, y, w * (1 - f), h); }
    else { place(i, k, x, y, w, h * f); place(k, j, x, y + h * f, w, h * (1 - f)); }
  })(0, items.length, x, y, w, h);
  return { cells, score: best(0, items.length, w / h).score };
}
// try a few orders (reading order, largest first, and swaps of neighbours) and keep the best-shaped
function goldenLayout(items, x, y, w, h) {
  let order = [...items].sort((a, b) => b.area - a.area), cur = goldenSplit(order, x, y, w, h);
  const read = goldenSplit(items, x, y, w, h); if (read.score <= cur.score * 1.05) { order = [...items]; cur = read; }
  for (let pass = 0; pass < 1; pass++) for (let t = 0; t + 1 < order.length; t++) {
    const o = [...order]; [o[t], o[t + 1]] = [o[t + 1], o[t]]; const r = goldenSplit(o, x, y, w, h);
    if (r.score < cur.score - 1e-6) { order = o; cur = r; } }
  return { ...cur, order };
}
// the book's own outline may flex (1.0–2.2) if that lets every chapter come out nearer golden; it must leave room for the
// help card and the launcher above the map's right end (PX − 1900)
let bookW, bookH, cells;
{ let bestL = null;
  const w0 = Math.min(Math.sqrt(bookArea * PHI), PX - 2000), order = goldenLayout([...parts, INTERP], 40, BOOK_TOP, w0 - 80, bookArea / w0 - 40).order;
  for (let asp = 1.0; asp <= 2.21; asp += 0.1) {
    const w = Math.min(Math.sqrt(bookArea * asp), PX - 2000), h = bookArea / w;
    const L = goldenSplit(order, 40, BOOK_TOP, w - 80, h - 40);
    const sc = L.score + 0.3 * dev(w, h + BOOK_TOP);   // the book itself should be near golden too
    if (!bestL || sc < bestL.sc) bestL = { sc, L, w, h };
  }
  bookW = Math.round(bestL.w); bookH = Math.round(bestL.h + BOOK_TOP); cells = bestL.L.cells; }
const U0 = Math.min(1, Math.sqrt(bookArea / ((natTotal + INTERP.area) * 1.08)));   // the shelf's overall scale
const BX = 0, BY = -bookH - 260, CGAP = 40;
const bk = add(world, 'bk', BX, BY, bookW, bookH, `<div class="bhead"><img src="${BK.icon || 'assets/genre-modern.png'}" alt=""><div><h2>${esc(BK.fullTitle || BK.title)}</h2><div class="t">${esc(BK.sub)} · the rules this campaign runs on</div></div></div>`);
reg(BK.id, { el: bk, title: BK.fullTitle || BK.title, kind: 'book', icon: BK.icon || 'assets/genre-modern.png', box: { x: BX, y: BY, w: bookW, h: bookH } });
label(world, 'The rulebook', BX, BY - 420, 300);
const pageFrames = [];
cells.forEach(cell => {
  const cx = cell.x + CGAP / 2, cy = cell.y + CGAP / 2, cw = cell.w - CGAP, chh = cell.h - CGAP, pt = cell.i;
  if (pt.interp) { const e = add(bk, 'card interpcard', cx, cy, cw / U0, chh / U0, `<div class="fit"><h3>Where this book is open, the Almanac decides</h3><div class="t">${R.interpretations.map(esc).join('<br>')}</div></div>`); e.style.transformOrigin = '0 0'; e.style.transform = `scale(${U0})`; requestAnimationFrame(() => fitCard(e)); document.fonts?.ready.then(() => fitCard(e)); return; }
  // the block's own layout: the page-column count and index-column count that let it fill its cell at the largest scale
  let best = null; const m = pt.entries.length;
  // the index wraps into as many columns as it needs to stay no taller than the pages beside it (H, 16 Nov: a long
  // index next to one page left a tall strip of nothing); among those, the layout that fills the cell at the largest scale
  for (const strict of [true, false]) {
    for (let c = 1; c <= pt.n; c++) for (let ic = m ? 1 : 0; ic <= (m ? Math.min(m, 12) : 0); ic++) {
      const d = partNatural(pt.n, m, c, ic), pagesH = d.rows * (PH + PG) - PG, idxH = ic ? Math.ceil(m / ic) * IRH - IGAP : 0;
      if (strict && idxH > pagesH * 1.2) continue;
      const u = Math.min(cw / d.w, chh / d.h, 1);
      if (!best || u > best.u + 1e-9) best = { c, ic, u, d };
    }
    if (best) break;
  }
  const { c, ic, u, d } = best;
  // justify: spread what is left of the cell into the gaps, so the block fills its cell (no dead margin, E6)
  const ex = cw / u - d.w, ey = chh / u - d.h, gx = c > 1 || ic ? ex / ((c - 1) + (ic ? 1 : 0) + 2) : ex / 2, gy = d.rows > 1 ? ey / (d.rows + 1) : ey / 2;
  const blk = add(bk, 'chapblk', cx, cy, cw / u, chh / u, `<div class="chaphead"><b>${esc(pt.title)}</b> <span>pages ${pt.from}–${pt.to}</span></div>`);
  blk.style.transformOrigin = '0 0'; blk.style.transform = `scale(${u})`;
  pt.box = { x: BX + cx, y: BY + cy, w: cw, h: chh };
  reg('part-' + pt.from, { el: blk, title: pt.title, kind: 'chapter', box: pt.box });
  const W = (x, y, w, h) => ({ x: BX + cx + x * u, y: BY + cy + y * u, w: w * u, h: h * u });
  const x0 = PPAD + gx, y0 = HEADH;
  pt.entries.forEach((p, i) => {
    const col = Math.floor(i / Math.ceil(m / ic)), row = i % Math.ceil(m / ic);
    const x = x0 + col * (ICW + IGAP), y = y0 + row * IRH;
    const ce = add(blk, 'entry card', x, y, ICW, IRH - IGAP, `<h3>${esc(p.title)}</h3><div class="t">${esc(p.text)}</div><div class="pg"><span class="chip" data-go="${p.id}">page ${p.page}</span> <span class="backs"></span></div>`);
    reg('idx-' + p.id, { el: ce, title: p.title, kind: 'index', box: W(x, y, ICW, IRH - IGAP) });
  });
  const px0 = x0 + (ic ? ic * (ICW + IGAP) + 40 + gx : 0);
  for (let n = pt.from; n <= pt.to; n++) {
    const k = n - pt.from, px = px0 + (k % c) * (PW + PG + gx), py = y0 + gy + Math.floor(k / c) * (PH + PG + gy);
    const pf = add(blk, 'pagef', px, py, PW, PH, `<div class="ph">${n}</div><div class="cv"></div>`);
    label(pf, String(n), PW - 170, 20, 200, { cls: 'pnumlbl', over: true, k: u });
    pageFrames.push(reg('page-' + n, { el: pf, title: `${BK.title} · page ${n}`, kind: 'page', box: W(px, py, PW, PH), n }));
  }
  // the chapter's headline: big over the block, fading as its pages become readable (E1)
  if (parts.length > 1) { const size = Math.min(chh * 0.32, cw * 1.7 / Math.max(6, pt.title.length)); label(world, pt.title, BX + cx, BY + cy + chh / 2 - size * 0.55, size, { over: true, w: cw, align: 'center', cls: 'chaplbl' }); }
});
// the adventure strip: below the map and the party, left to right in the book's order, at the book's own page scale
let ADV_BOTTOM = 0;
if (advParts.length) {
  const SWID = PX + SW, ay0 = MH + 700, u = U0, gap = 120; let x = 0, y = ay0, rowH = 0;
  label(world, 'The adventure', 0, ay0 - 640, 420);
  advParts.forEach(pt => {
    // the same rule as the chapter blocks: one index column if it fits within ~20% of the pages' height, else as many as needed
    const m = pt.entries.length; let ic = m ? 1 : 0; while (ic && ic < m && Math.ceil(m / ic) * IRH - IGAP > PH * 1.2) ic++;
    const d = partNatural(pt.n, m, pt.n, ic), w = d.w * u, h = d.h * u;
    if (x > 0 && x + w > SWID) { x = 0; y += rowH + gap; rowH = 0; }
    const blk = add(world, 'chapblk advblk', x, y, d.w, d.h, `<div class="chaphead"><b>${esc(pt.title)}</b> <span>pages ${pt.from}–${pt.to}</span></div>`);
    blk.style.transformOrigin = '0 0'; blk.style.transform = `scale(${u})`;
    reg('part-' + pt.from, { el: blk, title: pt.title, kind: 'chapter', box: { x, y, w, h } });
    const W = (px, py, pw, ph) => ({ x: x + px * u, y: y + py * u, w: pw * u, h: ph * u }), x0 = PPAD;
    pt.entries.forEach((p, i) => { const per = Math.ceil(m / ic), cx = x0 + Math.floor(i / per) * (ICW + IGAP), cy = HEADH + (i % per) * IRH;
      const ce = add(blk, 'entry card', cx, cy, ICW, IRH - IGAP, `<h3>${esc(p.title)}</h3><div class="t">${esc(p.text)}</div><div class="pg"><span class="chip" data-go="${p.id}">page ${p.page}</span> <span class="backs"></span></div>`);
      reg('idx-' + p.id, { el: ce, title: p.title, kind: 'index', box: W(cx, cy, ICW, IRH - IGAP) }); });
    const px0 = x0 + (ic ? ic * (ICW + IGAP) + 40 : 0);
    for (let n = pt.from; n <= pt.to; n++) { const px = px0 + (n - pt.from) * (PW + PG), py = HEADH;
      const pf = add(blk, 'pagef', px, py, PW, PH, `<div class="ph">${n}</div><div class="cv"></div>`);
      label(pf, String(n), PW - 170, 20, 200, { cls: 'pnumlbl', over: true, k: u });
      pageFrames.push(reg('page-' + n, { el: pf, title: `${BK.title} · page ${n}`, kind: 'page', box: W(px, py, PW, PH), n })); }
    const size = Math.min(h * 0.3, w * 1.7 / Math.max(6, pt.title.length)); label(world, pt.title, x, y + h / 2 - size * 0.55, size, { over: true, w, align: 'center', cls: 'chaplbl' });
    x += w + gap; rowH = Math.max(rowH, h);
  });
  ADV_BOTTOM = y + rowH;
}
C.print.forEach(p => {
  const k = PW / BK.pw, [x, y, w, h] = p.rect, pf = nodes['page-' + p.page]; if (!pf) return;
  const u = pf.box.w / PW;
  const re = add(pf.el, 'region', x * k - 6, y * k - 6, w * k + 12, h * k + 12, `<span class="rt">${esc(p.title)}</span>`);
  reg(p.id, { el: re, title: p.title, kind: 'rule', sub: `p.${p.page}`, text: p.text, box: { x: pf.box.x + (x * k - 6) * u, y: pf.box.y + (y * k - 6) * u, w: (w * k + 12) * u, h: (h * k + 12) * u } });
});

// ------------------------------------------------------------------ party: sheets as rows down the map's left edge
const clone = o => JSON.parse(JSON.stringify(o));
const PCS = [...C.pcs, ...state.extra].filter(p => !state.removed.includes(p.id));
// the party's order, top to bottom (H, 14 Nov: a new one goes on top and pushes the rest down; a removed one closes the gap)
if (!state.order) state.order = [...PCS].sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99)).map(p => p.id);
state.order = state.order.filter(id => PCS.some(p => p.id === id)); PCS.forEach(p => { if (!state.order.includes(p.id)) state.order.push(p.id); });
PCS.forEach(p => p.slot = state.order.indexOf(p.id));
const pcById = Object.fromEntries(PCS.map(p => [p.id, p]));
function choicesOf(pc) { return state.choices[pc.id] || (state.choices[pc.id] = clone(pc.choices || R.blank(''))); }
const sheetEls = {};
/*@RIG-UI@*/
const resolveSrc = (pc, id) => id.startsWith('B:') ? `b-${pc.id}-${id.slice(2)}` : id;
// builder: fixed columns, so nothing ever moves when a choice opens a step
function stepper(pc, path, v, min, max, lab) {
  return `<div class="stepper"><button data-act="inc" data-pc="${pc.id}" data-path="${path}" data-d="-1" data-min="${min}" data-max="${max}" ${v <= min ? 'disabled' : ''} aria-label="Lower ${lab}">−</button><output>${v}</output><button data-act="inc" data-pc="${pc.id}" data-path="${path}" data-d="1" data-min="${min}" data-max="${max}" ${v >= max ? 'disabled' : ''} aria-label="Raise ${lab}">+</button></div>`;
}
function builderInner(pc, S) {
  if (typeof BAREA === 'undefined')
    return BCOLS.map((col, i) => `<div class="bcol" style="left:${30 + i * (BIW + BGAP)}px;width:${BIW}px">${col.map(k => stepHtml(pc, S, k)).join('')}</div>`).join('');
  // golden cells (E2 at the builder's scale): the steps, in Tab order, split into cells near the golden ratio, each cell
  // sized by how much its step holds. The cells never move; a step's contents are scaled and reflowed to fill its own cell.
  return builderCells().map(c => stepHtml(pc, S, c.i.k).replace(/^<div class="bstep"([^>]*)>/, `<div class="bstep cell"$1 style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"><div class="bfit">`) + '</div>').join('');
}
let _bcells = null;
function builderCells() {
  if (_bcells) return _bcells; const G = 34;
  _bcells = goldenSplit(ORDER.map(k => ({ k, area: BAREA[k] || 1 })), G / 2, G / 2, BINNER.w - G, BINNER.h - G).cells.map(c => ({ ...c, x: c.x + G / 2, y: c.y + G / 2, w: c.w - G, h: c.h - G }));
  return _bcells;
}
// fill one builder cell: try 1–6 columns for its lists and keep the count that lets the contents be largest (E6, E7)
// step + item count → { N, z }: shared by every sheet, so a click re-checks instead of re-searching. A fit is in world units
// (independent of the screen), so it is kept across visits too.
const STYLE = () => document.documentElement.dataset.style || 'classic';
const CELLFIT_KEY = 'turnip-almanac-cellfit:' + (C.id || 'ssr') + ':' + STYLE() + ':' + (typeof BAREA === 'undefined' ? '' : Object.values(BAREA).join(','));
const cellFit = new Map((() => { try { return JSON.parse(localStorage.getItem(CELLFIT_KEY) || '[]'); } catch { return []; } })());
let cellFitSave = 0; const saveCellFit = () => { clearTimeout(cellFitSave); cellFitSave = setTimeout(() => { try { localStorage.setItem(CELLFIT_KEY, JSON.stringify([...cellFit])); } catch {} }, 800); };
function fitCell(cell) {
  const f = cell.querySelector(':scope > .bfit'); if (!f) return; const box = cell.getBoundingClientRect(); if (!box.height) return;
  const W = cell.clientWidth, lists = [...f.querySelectorAll('.opts, .rows')], n = lists.reduce((t, l) => t + l.children.length, 0);
  const key = STYLE() + ':' + cell.dataset.id.split('-').pop() + ':' + n;   // fits depend on the look's fonts
  const wide = () => [...f.querySelectorAll('.opt, .row, .q, .stepper')].some(e => e.scrollWidth > e.clientWidth + 1);
  const set = (N, z) => { lists.forEach(l => l.style.setProperty('--cols', N)); f.style.zoom = z; f.style.width = (W / z) + 'px'; f.style.minHeight = ''; };
  const fits = () => f.getBoundingClientRect().height <= box.height * 0.985 && !wide();
  const zoomFor = (N, lo = 0.2, hi = 2.4, it = 8) => { for (let i = 0; i < it; i++) { const m = (lo + hi) / 2; set(N, m); if (fits()) lo = m; else hi = m; } return lo; };
  const finish = (N, z) => { set(N, z); f.style.minHeight = (box.height / box.width * W / z) + 'px'; f.dataset.z = z.toFixed(2); f.dataset.cols = N; cellFit.set(key, { N, z }); saveCellFit(); };
  const c = cellFit.get(key);
  if (c) { set(c.N, c.z); if (fits() && f.getBoundingClientRect().height >= box.height * 0.93 || c.z >= 2.39 && fits()) return finish(c.N, c.z);
    return finish(c.N, zoomFor(c.N, c.z * 0.7, Math.min(2.4, c.z * 1.3), 6)); }
  let best = 0, N = 1, drops = 0; const maxN = lists.length ? Math.min(6, Math.max(...lists.map(l => l.children.length))) : 1;
  for (let k = 1; k <= maxN; k++) { const z = zoomFor(k); if (z > best * 1.03) { best = z; N = k; drops = 0; } else if (++drops >= 2) break; }
  finish(N, best);
}
// portraits: an uploaded image, else the Turnip Works runner token that best fits the build
// summons: one at a time; a tiny sheet inside the summoner's sheet (rules p.2)
function fitInto(box, inner, max = 3) {
  if (!box || !inner || !box.clientWidth) return; const W = box.clientWidth, H = box.clientHeight; let lo = 0.15, hi = max;
  for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; inner.style.zoom = m; inner.style.width = (W / m) + 'px';
    const r = inner.getBoundingClientRect(), b = box.getBoundingClientRect(); if (r.height <= b.height * 0.98 && inner.scrollWidth <= inner.clientWidth + 3) lo = m; else hi = m; }
  inner.style.zoom = lo; inner.style.width = (W / lo) + 'px';
}
const isToken = src => /assets\/tokens\//.test(src || '');
// fill every section: scale its contents (CSS zoom) until they exactly fill the box, so no sheet carries dead space
function fitSections(box) {
  box.querySelectorAll('.bstep.cell').forEach(fitCell);
  box.querySelectorAll('.main > section:not(.sP):not(.sS)').forEach(sec => {
    let f = sec.querySelector(':scope > .fit');
    if (!f) { f = document.createElement('div'); f.className = 'fit'; while (sec.firstChild) f.appendChild(sec.firstChild); sec.appendChild(f); }
    const sr = sec.getBoundingClientRect(); if (!sr.height) return;
    const W = sec.clientWidth;
    // a 'dense' section (a long spell list, say) may shrink much further: it is read by zooming in, like any detail (H, 16 Nov)
    let lo = sec.classList.contains('dense') ? 0.04 : 0.45, hi = 2.6;
    const wide = () => [...f.querySelectorAll('.acol, .sk, .ahead, .budget > div, .der > div, .list > div, .track, .asof, .roll, .grid4, .der, .budget')].some(e => e.scrollWidth > e.clientWidth + 1) || [...f.querySelectorAll('.sk .k, .ahead .an')].some(k => { const r = k.getBoundingClientRect(), p2 = k.closest('.sk, .ahead').getBoundingClientRect(); return r.right > p2.right + 0.5; });
    for (let i = 0; i < 11; i++) { const mid = (lo + hi) / 2; f.style.zoom = mid; f.style.width = (W / mid) + 'px';
      if (f.getBoundingClientRect().height <= sr.height * 0.98 && !wide()) lo = mid; else hi = mid; }
    f.style.zoom = lo; f.style.width = (W / lo) + 'px'; f.dataset.z = lo.toFixed(2);
  });
}
// advancement (H, 14 Nov: "how experience gets spent … comes up in every system"): the campaign's own log for a character,
// then what was added at this table, each entry filed under a session. The rig says what an entry can hold.
function karmaOf(pc) { return [...(pc.karma || []), ...(state.adv[pc.id] || [])].sort((a, b) => a.s - b.s); }
// the session advancement is filed under: the latest one played
function advSession() { let L; try { L = allSessions(); } catch { L = C.sessions; } return Math.max(0, ...L.filter(x => !x.prep).map(x => x.n)); }
function advEntry(pc, n = advSession()) { const L = state.adv[pc.id] = state.adv[pc.id] || []; let e = L.find(x => x.s === n);
  if (!e) { e = { s: n, id: `adv-${pc.id}-${n}` }; L.push(e); } return e; }
// after an advancement change: the sheet, and the session card it is filed under
function refreshAdv(pc, n) { persist(); renderSheet(pc); const x = (typeof sessionEls !== 'undefined' ? sessionEls : []).find(q => q.s.n === n); if (x) { renderSessionCard(x); fitCard(x.card); } }
function sheetOf(pc) { return R.compute(choicesOf(pc), karmaOf(pc), state.asof[pc.id] ?? 99); }

function placeSheet(pc, slot) {
  if (sheetEls[pc.id]) { sheetEls[pc.id].remove(); }
  const e = add(world, 'sheet', PX, pcRowY(slot), SW, SH); sheetEls[pc.id] = e; pc.slot = slot;
  reg(pc.id, { el: e, title: '', kind: 'character', icon: 'assets/tool-pawns.png', box: { x: PX, y: pcRowY(slot), w: SW, h: SH } });
  renderSheet(pc);
}

// the launcher: above the party, straddling the map's top-right corner
const launch = add(world, 'launch', PX - 1900, -900, SW + 1900, 760, `<button class="launchbtn" data-act="newpc"><span class="plus">+</span><span><b>Build a new ${WORDS.char}</b><small>Opens a blank sheet in the next empty seat and takes you to its builder.</small></span></button>`);
reg('launch', { el: launch, title: `Build a new ${WORDS.char}`, kind: 'action', icon: 'assets/tool-pawns.png', box: { x: PX - 1900, y: -900, w: SW + 1900, h: 760 } });
label(world, 'The party', PX, -1240, 300);

PCS.forEach((pc, i) => placeSheet(pc, pc.slot ?? i));
function emptySeats() { const n = state.order.length; return [...Array(Math.max(0, SLOTS - n)).keys()].map(i => n + i); }
const seatEls = {};
function renderSeats() {
  Object.values(seatEls).forEach(e => e.remove());
  for (const k in seatEls) delete seatEls[k];
  emptySeats().forEach(i => { const e = add(world, 'seat', PX, pcRowY(i), SW, SH, `<button class="seatbtn" data-act="newpc" data-slot="end"><span class="plus">+</span> Empty seat · build a new ${WORDS.char} here</button>`); seatEls[i] = e; });
}
renderSeats();
function newRunner(where) {
  // the launcher puts a new one on top (just under the button) and pushes the rest down; an empty seat adds it there
  const id = 'pc-x' + Date.now().toString(36), top = where !== 'end';
  const pc = { id, player: '', archetype: `New ${WORDS.char}`, choices: null, karma: [] };
  state.extra.push({ id, player: '', archetype: `New ${WORDS.char}`, choices: null, karma: [] });
  if (top) state.order.unshift(id); else state.order.push(id);
  PCS.push(pc); pcById[id] = pc; placeSheet(pc, state.order.indexOf(id)); historyNote(`Added a new ${WORDS.char}`); layoutParty(); persist();
  return id;
}
// put every sheet in its seat (sheets slide: see .sheet in the CSS), then the empty seats after them
function layoutParty() {
  state.order.forEach((id, i) => { const pc = pcById[id], e = sheetEls[id]; if (!pc || !e) return; pc.slot = i;
    e.style.top = pcRowY(i) + 'px'; if (nodes[id]) nodes[id].box = { x: PX, y: pcRowY(i), w: SW, h: SH }; if (typeof renderPocketTab === 'function' && pocketTabs[id]) renderPocketTab(pc); });
  renderSeats(); dirty = true;
}
function removePc(id) {
  const pc = pcById[id]; if (!pc) return; pushUndo();
  const nm = choicesOf(pc).name || `the new ${WORDS.char}`;
  state.order = state.order.filter(x => x !== id); state.removed.push(id); PCS.splice(PCS.indexOf(pc), 1); delete pcById[id];
  sheetEls[id]?.remove(); delete sheetEls[id]; pocketTabs[id]?.remove(); delete pocketTabs[id]; delete nodes[id];
  if (state.build?.pc === id) state.build = null;
  historyNote(`Removed ${nm} from the party`); layoutParty(); persist(); renderTable?.();
  toast({ msg: `Removed ${nm}`, note: '⌘Z or the History card brings them back.' });
}
// (sessions3)
let persistExtra = () => {};

// ------------------------------------------------------------------ pockets: a free-paste spot on every major thing
// Paste (⌘V) with the pointer over a pocket, drop an image on it, or click it to type. Scraps are text or pictures.
state.pockets = saved.pockets || {};
const persistPockets = () => { persistExtra(); try { const o = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); o.pockets = state.pockets; o.sessx = state.sessx; o.prepN = state.prepN; o.threadx = state.threadx; lsSet(STORE_KEY, JSON.stringify(o)); } catch {} };
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
  place(t, PX + SW + 30, y, 180, SH); t.innerHTML = pocketHtml(pc.id, 'Pocket') + `<button class="rmpc" data-rmpc="${pc.id}" title="Remove from the party (undo brings them back)">Remove</button>`;
}
PCS.forEach(renderPocketTab);
const _newRunner = newRunner; newRunner = function (slot) { const id = _newRunner(slot); if (id) { renderPocketTab(pcById[id]); layoutParty(); } return id; };

// ------------------------------------------------------------------ sessions: compact, editable cards; the next one waits as a ghost
const SCW = 1000, SGAP = 60, SCOLS = 3;
const SX = PX + SW + 240, SY = 40;
state.sessx = saved.sessx || []; state.prepN = saved.prepN || C.prep.n; state.threadx = saved.threadx || [];
state.snotes = saved.snotes || null; state.smeta = saved.smeta || {}; state.npcx = saved.npcx || [];
const allSessions = () => [...C.sessions, ...state.sessx, { ...C.prep, n: state.prepN, title: state.prepN === C.prep.n ? C.prep.title : 'Next session', date: 'planned', prep: true }];
if (!state.snotes) { state.snotes = {}; allSessions().forEach(s => { state.snotes[s.n] = []; Object.entries(C.cells).forEach(([who, row]) => (row[s.n] || []).forEach((t, j) => state.snotes[s.n].push({ id: `c-${who}-${s.n}-${j}`, who, text: t }))); }); }
persistExtra = () => { persist(); try { const o = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); Object.assign(o, { snotes: state.snotes, smeta: state.smeta, npcx: state.npcx, pockets: state.pockets, sessx: state.sessx, prepN: state.prepN, threadx: state.threadx }); lsSet(STORE_KEY, JSON.stringify(o)); } catch {} };
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
const subjOf = id => pcById[id] ? { name: choicesOf(pcById[id]).name || `New ${WORDS.char}`, icon: portraitOf(pcById[id], sheetOf(pcById[id])).src, go: id } : npcIndex[id] ? { name: npcIndex[id].name, icon: state.portraits[id] || npcIndex[id].icon, go: id } : C.threads.find(t => t.id === id) ? { name: C.threads.find(t => t.id === id).name, icon: null, go: id, thread: true } : { name: 'Table notes', icon: null, go: null, general: true };
const mentionsBy = {};                                   // subject id -> Set of note ids that mention it
function renderSessionCard(x, measuring) {
  const s = x.s, card = x.card, meta = state.smeta[s.n] || {};
  const groups = [];
  (state.snotes[s.n] || []).forEach(n => { let g = groups.find(q => q.who === n.who); if (!g) groups.push(g = { who: n.who, notes: [] }); g.notes.push(n); });
  PCS.forEach(pc => { const ks = karmaOf(pc).filter(k => k.s === s.n && (k.award || advanceText(k))); if (!ks.length) return; let g = groups.find(q => q.who === pc.id); if (!g) groups.push(g = { who: pc.id, notes: [] }); g.karma = ks; });
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
      const buys = advanceText(k);
      const e = el('div', 'snote karma', `${k.award ? `<span class="kk">${WORDS.xp || 'Karma'} +${k.award}</span> ` : `<span class="kk">${WORDS.xpVerb || 'Advanced'}</span> `}${buys ? `<b>${esc(buys)}</b>` : ''}${k.note ? ` <span class="e">${esc(k.note)}</span>` : ''}`);
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
function updateBounds() { const top = Math.min(BY - 700, -3700), left = -HISTW - 360; Object.assign(BOUNDS, { x: left, y: top, w: PCX + PCW + 200 - left, h: Math.max(MH, py, sy, ADV_BOTTOM) - top + 120 }); if (typeof layoutDesk === 'function') try { layoutDesk(); } catch {} }
const BOUNDS = {};
// editing a person's or thread's name and words
document.addEventListener('focusout', () => {}, true);
const colX = i => SX + (i % SCOLS) * (SCW + SGAP), colW = SCW, colGap = SGAP, nS = C.sessions.length;
layoutSessions(); layoutPeople();

PCS.forEach(pc => { nodes[pc.id].title = choicesOf(pc).name || `New ${WORDS.char}`; });
function refreshBacks() {
  Object.entries(mentionsBy).forEach(([id, set]) => { const ss = [...new Set([...set].map(nid => { for (const s of allSessions()) if ((state.snotes[s.n] || []).some(n => n.id === nid)) return s.n; return null; }).filter(Boolean))].sort((a, b) => a - b);
    [nodes['idx-' + id], nodes[id]].forEach(t => { const b = t?.el?.querySelector('.backs'); if (b) b.innerHTML = ss.length ? 'In sessions ' + ss.map(n => `<span class="chip" data-go="s${n}">S${n}</span>`).join(' ') : ''; }); });
}
refreshBacks();
// loose notes
let dragNote = null;
function makeNote(nt) {
  const e = add(world, 'loose', nt.x, nt.y, null, null, `<div class="grip"><button class="nmenu" aria-label="Note menu: picture, who can see it" title="Picture · who can see it">⋯</button><span class="dots"></span><span class="nvis"></span><button class="ndel" aria-label="Delete note">✕</button></div><div class="nimg" hidden><img alt=""></div><div class="body" contenteditable="true" spellcheck="false"></div><div class="rsz" title="Drag to resize"></div>`);
  e.querySelector('.body').textContent = nt.text || '';
  e.querySelector('.body').addEventListener('input', ev => { nt.text = ev.target.textContent; nodes[nt.id].title = nt.text.slice(0, 60) || 'Note'; persist(); });
  e.querySelector('.grip .ndel').addEventListener('click', () => { e.remove(); state.notes = state.notes.filter(n => n !== nt); delete nodes[nt.id]; historyNote('Deleted a note'); persist(); });
  e.querySelector('.grip .nmenu').addEventListener('click', ev => { ev.stopPropagation(); openNoteMenu(nt, e); });
  // drop a picture on a note to put it in the note
  e.addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.items || [])].some(i => i.type.startsWith('image/'))) { ev.preventDefault(); ev.stopPropagation(); } });
  e.addEventListener('drop', ev => { const f = [...(ev.dataTransfer?.files || [])].find(f => f.type.startsWith('image/')); if (!f) return; ev.preventDefault(); ev.stopPropagation(); noteImage(nt, e, f); });
  showNoteExtras(nt, e);
  e.querySelector('.grip').addEventListener('pointerdown', ev => { if (ev.target.closest('button')) return; ev.stopPropagation(); dragNote = { nt, e, sx: ev.clientX, sy: ev.clientY, ox: nt.x, oy: nt.y }; });
  if (!nt.w) { const k = nt.k || 1; nt.w = 330 * k; nt.h = 180 * k; }   // a free rectangle: made at the zoom you were at, then any size and shape
  reg(nt.id, { el: e, title: (nt.text || 'Note').slice(0, 60), kind: 'loose note', box: { x: nt.x, y: nt.y, w: nt.w, h: nt.h } });
  requestAnimationFrame(() => sizeNote(nt, e));
  return e;
}
// a note's menu (H, 14 Nov): a picture, and who can see it. Visibility is recorded with the note now; it is enforced once
// the table has more than one seat (see docs/VISIBILITY.md for the open design: owner / group / table, groups from play).
function showNoteExtras(nt, e) {
  const img = e.querySelector('.nimg img'); if (nt.img) img.src = nt.img;
  const v = nt.vis?.mode || 'all', who = (nt.vis?.who || []).map(id => choicesOf(pcById[id] || {}).name).filter(Boolean);
  e.querySelector('.nvis').textContent = v === 'gm' ? 'GM only' : v === 'me' ? 'Only me' : v === 'some' ? (who.join(', ') || 'Nobody yet') : '';
  e.classList.toggle('private', v !== 'all');
}
async function noteImage(nt, e, file) {
  try { const r = await shrinkImage(file); nt.img = r.src; if (!nt.w || nt.h < nt.w * 0.6) nt.h = Math.max(nt.h, nt.w * r.h / r.w + nt.w * 0.25); showNoteExtras(nt, e); sizeNote(nt, e); historyNote('Put a picture in a note'); persist(); }
  catch { toast({ msg: 'That file is not a picture' }); }
}
let noteMenu = null;
function openNoteMenu(nt, e) {
  noteMenu?.remove(); const m = noteMenu = document.createElement('div'); m.className = 'notemenu'; m.setAttribute('role', 'menu');
  const v = nt.vis?.mode || 'all', who = new Set(nt.vis?.who || []);
  m.innerHTML = `<label class="nmrow keyb">${nt.img ? 'Change the picture' : 'Add a picture'}<input type="file" accept="image/*" hidden></label>${nt.img ? '<button class="nmrow keyb" data-nm="rmimg">Take the picture out</button>' : ''}
    <div class="nmh">Who can see it</div>
    <div class="nmseg">${[['all', 'Everyone'], ['gm', 'GM only'], ['me', 'Only me'], ['some', 'Some players']].map(([k, n]) => `<button data-nm="vis" data-v="${k}" class="${v === k ? 'sel' : ''}" aria-pressed="${v === k}">${n}</button>`).join('')}</div>
    ${v === 'some' ? `<div class="nmseg">${PCS.map(pc => `<button data-nm="who" data-v="${pc.id}" class="${who.has(pc.id) ? 'sel' : ''}">${esc(choicesOf(pc).name || WORDS.Char)}${pc.player ? ` <small>${esc(pc.player)}</small>` : ''}</button>`).join('')}</div>` : ''}
    <div class="nmfoot">Kept with the note now; enforced once more than one seat joins the table.</div>`;
  document.body.appendChild(m);
  const r = e.querySelector('.grip').getBoundingClientRect();
  m.style.left = Math.max(12, Math.min(innerWidth - m.offsetWidth - 12, r.left)) + 'px'; m.style.top = Math.min(innerHeight - m.offsetHeight - 12, r.bottom + 6) + 'px';
  m.querySelector('input[type=file]').addEventListener('change', ev => { const f = ev.target.files?.[0]; if (f) noteImage(nt, e, f); m.remove(); });
  m.addEventListener('click', ev => { const b = ev.target.closest('[data-nm]'); if (!b) return; ev.stopPropagation();
    if (b.dataset.nm === 'rmimg') { delete nt.img; historyNote('Took a picture out of a note'); m.remove(); }
    if (b.dataset.nm === 'vis') { nt.vis = { mode: b.dataset.v, who: nt.vis?.who || [] }; historyNote(`Note visible to: ${b.textContent}`); }
    if (b.dataset.nm === 'who') { const w = new Set(nt.vis?.who || []); w.has(b.dataset.v) ? w.delete(b.dataset.v) : w.add(b.dataset.v); nt.vis = { mode: 'some', who: [...w] }; historyNote('Changed who can see a note'); }
    showNoteExtras(nt, e); sizeNote(nt, e); persist(); if (m.isConnected) openNoteMenu(nt, e); });
}
document.addEventListener('pointerdown', ev => { if (noteMenu && !ev.target.closest('.notemenu, .nmenu')) { noteMenu.remove(); noteMenu = null; } }, true);
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
  <b>/</b> or <b>⌘K</b> opens the quickbar at the top: type a name, a place, a rule, or a command such as ${WORDS.helpCommands}, <i>round order</i><br>
  <b>Double-click</b> a thing to fly to it, empty space for a note · <b>drop an image</b> on a portrait, or anywhere for art<br>
  In a builder, <b>Tab</b> and <b>Shift+Tab</b> fly between steps · hover a <b>number</b> to see where it comes from</div>`);
label(world, 'HELP', PX - 1900, -2240 - 1260, 1150);
reg('help', { el: helpCard, title: 'Getting around', kind: 'help', box: { x: PX - 1900, y: -2240, w: 1800, h: 1180 } });
let turn = { round: 1, at: 0 };
function toast(rec, at) {
  const t = $('#toast'); t.innerHTML = rec.msg ? `<div class="roll"><b>${esc(rec.msg)}</b>${rec.note ? `<span class="tn">${esc(rec.note)}</span>` : ''}</div>` : rollHtml(rec);
  const r = at?.getBoundingClientRect?.(); t.style.left = (r ? Math.max(180, Math.min(W() - 180, r.left + r.width / 2)) : W() / 2) + 'px'; t.style.top = (r ? Math.max(130, r.top) : 150) + 'px';
  t.hidden = false; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.hidden = true, 300); }, 2800);
}
var tableReady = false;
// the log: every roll and every line of chat, in order (Harry, 13 Nov)
state.log = saved.log || [];
function logPush(e) { state.log.push({ t: Date.now(), ...e }); if (state.log.length > 400) state.log.splice(0, state.log.length - 400); try { const o = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); o.log = state.log; lsSet(STORE_KEY, JSON.stringify(o)); } catch {} renderLog(true); }
let logSpeaker = 'gm';
function speakerOf(id) { if (id === 'gm' || !id) return { name: 'GM', icon: null }; const pc = pcById[id]; return pc ? { name: choicesOf(pc).name || WORDS.Char, icon: portraitOf(pc, sheetOf(pc)).src } : { name: id, icon: null }; }
function renderLog(stick) {
  const list = logCard.querySelector('.loglist'), atEnd = !list || list.scrollTop + list.clientHeight >= list.scrollHeight - 8;
  const fmt = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rows = state.log.map(e => { const sp = speakerOf(e.who);
    const face = sp.icon ? `<span class="lface"><img src="${sp.icon}" alt="" draggable="false"></span>` : `<span class="lface gm">${esc(sp.name.slice(0, 2))}</span>`;
    return e.kind === 'roll' ? `<div class="lrow roll-e">${face}<div class="lbody"><span class="lt">${fmt(e.t)}</span>${rollHtml(e.rec)}</div></div>`
      : `<div class="lrow chat-e">${face}<div class="lbody"><span class="lt">${fmt(e.t)}</span><b>${esc(sp.name)}</b> ${renderNote(e.text, '', new Set())}</div></div>`; }).join('');
  const opts = [['gm', 'GM'], ...PCS.map(pc => [pc.id, choicesOf(pc).name || WORDS.Char])].map(([v, n]) => `<option value="${v}" ${v === logSpeaker ? 'selected' : ''}>${esc(n)}</option>`).join('');
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
  const ts = ev.target.closest('[data-ts]'); if (ts) { trayStep(ts.dataset.ts, +ts.dataset.d); renderTable(); return; }
  const tr = ev.target.closest('[data-troll]'); if (tr) { trayRoll(tr); return; }
  const tn = ev.target.closest('[data-turn]'); if (tn) { const n = initiative().length; if (tn.dataset.turn === 'next') { turn.at++; if (turn.at >= n) { turn.at = 0; turn.round++; } } else turn = { round: turn.round + 1, at: 0 }; renderTable(); }
});
tableReady = true; renderTable(); renderLog(true);

// ------------------------------------------------------------------ the quickbar: one line of text at the top, like Turnip Works
const qb = $('#qbar'), qin = $('#qbar textarea'), qres = $('#qres');
let qrows = [], qhi = 0; const qhist = [];
function runnerWord(w) { w = w.toLowerCase(); return PCS.find(pc => (choicesOf(pc).name || '').toLowerCase().startsWith(w) && w.length >= 2); }
function commandsFor(q) {
  const out = [], ws = q.trim().toLowerCase().split(/\s+/).filter(Boolean); if (!ws.length) return out;
  const nums = ws.map(Number).filter(n => !isNaN(n));
  const pcw = ws.map(runnerWord).find(Boolean);
  out.push(...rigCommands(q, ws, nums, pcw));
  if (('new ' + WORDS.char).startsWith(q.trim().toLowerCase()) && q.trim().length >= 3) out.push({ k: 'cmd', t: `Build a new ${WORDS.char}`, run: () => { const id = newRunner(); if (id) setTimeout(() => flyTo(`b-${id}-name`), 60); } });
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
// voice: the browser's own speech recognition (Web Speech API), shown only where the browser has it, as in Turnip Works.
// What is heard is the query, as if typed, updating as it is heard. The browser asks for the microphone itself, once;
// its speech service may send the audio to its maker.
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (typeof SR !== 'function') return;
  const mic = document.createElement('button'); mic.type = 'button'; mic.id = 'qmic'; mic.setAttribute('aria-label', 'Speak'); mic.setAttribute('aria-pressed', 'false'); mic.title = 'Speak';
  mic.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>';
  let rec = null; const done = () => { rec = null; mic.classList.remove('on'); mic.setAttribute('aria-pressed', 'false'); };
  mic.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); });
  mic.addEventListener('click', ev => {
    ev.stopPropagation(); if (rec) { try { rec.stop(); } catch {} return; }
    qin.blur(); qrender();
    const r = rec = new SR(); r.lang = navigator.language || 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = e => { if (rec !== r) return; qin.value = [...e.results].map(x => x[0]?.transcript || '').join(' ').replace(/[.?!,]+$/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); qhi = 0; fitBar(); qrender(); };
    r.onerror = e => { if (rec !== r) return; if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') toast({ msg: 'The microphone is off for this site', note: "Turn it on in the browser's site settings." }); done(); };
    r.onend = () => { if (rec === r) done(); };
    mic.classList.add('on'); mic.setAttribute('aria-pressed', 'true'); try { r.start(); } catch { done(); }
  });
  qb.insertBefore(mic, qb.querySelector('kbd'));
})();
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
    const w = Math.max(2, Math.min(6, len * cam.s / 300)) / cam.s;   // stroke and dots sized on screen, so a close view is not covered by them
    d += `<path class="${cls}" style="stroke-width:${w}px" d="M${x0},${y0} Q${mx},${my} ${x1},${y1}"/><circle class="${cls}" cx="${x0}" cy="${y0}" r="${w * 2.2}"/><circle class="${cls} far" ${goB ? `data-go="${goB}"` : ''} cx="${x1}" cy="${y1}" r="${w * 2.6}"><title>Fly there</title></circle>`;
    if (goB) ends.push({ id: goB, x0, y0, x1, y1, B, cls });
  };
  const ends = [];
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
  threadsSvg.innerHTML = '';
  // quick-follow: one small button per thread end, never on top of what the thread starts from (H, 14 Nov). An end on
  // screen gets its button just outside the far thing, on the side the thread arrives from; an end off screen gets it
  // on the screen's edge, where the straight line towards it leaves the screen.
  const vw = W(), vh = H(), top = 64, m = 14, used = [], tag = e => { const n = nodes[e.id]; if (!n) return '';
    if (n.kind === 'rule') return `p.${printIndex[e.id]?.page ?? ''} · ${n.title}`; if (n.kind === 'step') return n.title.replace(/^.*· builder: /, 'Builder · ');
    if (n.kind === 'character') return 'The sheet'; return n.title || ''; };
  let html = '';
  ends.forEach(e => {
    const sx0 = (e.x0 - cam.x) * cam.s, sy0 = (e.y0 - cam.y) * cam.s, sx1 = (e.x1 - cam.x) * cam.s, sy1 = (e.y1 - cam.y) * cam.s;
    let x, y, cls = '';
    if (sx1 > m && sx1 < vw - m && sy1 > top && sy1 < vh - m) {
      const bx0 = (e.B.x - cam.x) * cam.s, by0 = (e.B.y - cam.y) * cam.s, bx1 = bx0 + e.B.w * cam.s, by1 = by0 + e.B.h * cam.s;
      // above the far thing when there is room, else below it; centred on the thread's end
      x = sx1; y = by0 - 18 > top ? by0 - 18 : by1 + 18; if (by1 - by0 > vh * 0.7) { y = sy1; x = sx1 < (bx0 + bx1) / 2 ? bx0 - 12 : bx1 + 12; cls = sx1 < (bx0 + bx1) / 2 ? ' left' : ' right'; }
    } else {
      const dx = sx1 - sx0, dy = sy1 - sy0; let t = 1;
      if (dx) t = Math.min(t, dx > 0 ? (vw - m - sx0) / dx : (m - sx0) / dx); if (dy) t = Math.min(t, dy > 0 ? (vh - m - sy0) / dy : (top - sy0) / dy);
      x = sx0 + dx * Math.max(0, t); y = sy0 + dy * Math.max(0, t); cls = ' edge';
    }
    x = Math.max(m + 60, Math.min(vw - m - 60, x)); y = Math.max(top + 12, Math.min(vh - m - 12, y));
    while (used.some(u => Math.abs(u.x - x) < 150 && Math.abs(u.y - y) < 30)) y += 32;
    used.push({ x, y });
    const ang = Math.atan2(sy1 - y, sx1 - x) * 180 / Math.PI;
    html += `<button class="tend${e.cls ? ' ' + e.cls : ''}${cls}" data-go="${e.id}" style="left:${x}px;top:${y}px" title="Fly there"><span>${esc(tag(e))}</span><i style="transform:rotate(${ang.toFixed(0)}deg)">➜</i></button>`;
  });
  if (tends._h !== html) { tends.innerHTML = html; tends._h = html;
    // keep each button wholly on screen (its width is known only once drawn)
    tends.querySelectorAll('.tend').forEach(b => { const r = b.getBoundingClientRect(), dx = r.left < m ? m - r.left : r.right > vw - m ? vw - m - r.right : 0; if (dx) b.style.left = (parseFloat(b.style.left) + dx) + 'px'; }); }
}

// ---- portraits and art: drop an image, upload one, or take a Turnip Works token
function shrinkImage(file, max = 720) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('not an image'));
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
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
  // a table with no street map (C.mapBlank): a picture dropped on the map becomes the map, kept in this browser
  if (C.mapBlank && ev.target.closest?.('.map') && !ev.target.closest?.('[data-pocket], .place')) {
    let big; try { big = await shrinkImage(file, 2600); } catch { return; }
    state.mapImg = big.src; const im = mapEl.querySelector('.mapimg'); im.src = big.src; im.hidden = false; mapEl.querySelector('.mapwait')?.remove();
    historyNote('Put in a world map'); persist(); return; }
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
function snap() { return JSON.stringify({ choices: state.choices, live: state.live, summons: state.summons, done: state.done, asof: state.asof, order: state.order, removed: state.removed, adv: state.adv, checks: state.checks }); }
function pushUndo() { undo.push(snap()); if (undo.length > 60) undo.shift(); redo.length = 0; }
function restore(json) { const o = JSON.parse(json); const party = JSON.stringify([o.order, o.removed]) !== JSON.stringify([state.order, state.removed]);
  Object.assign(state, { choices: o.choices, live: o.live, summons: o.summons, done: o.done, asof: o.asof, order: o.order || state.order, removed: o.removed || state.removed, adv: o.adv || state.adv, checks: o.checks || state.checks }); persist();
  if (party) { location.reload(); return; } PCS.forEach(renderSheet); }
function doUndo() { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); }
function doRedo() { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); }
const editable = t => t?.closest?.('textarea, select, [contenteditable="true"], [contenteditable=""], input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=button]):not([type=file])');
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
  grip.style.height = gh + 'px'; grip.querySelector('.ndel').style.fontSize = (gh * 0.55) + 'px'; grip.querySelector('.dots').style.transform = `scale(${gh / 26})`;
  const pic = e.querySelector('.nimg'), has = !!nt.img, txt = (nt.text || '').trim(), ih = has ? (nt.h - gh) * (txt ? 0.62 : 0.84) : 0;
  if (pic) { pic.hidden = !has; if (has) { pic.style.top = gh + 'px'; pic.style.height = ih + 'px'; } }
  e.querySelectorAll('.grip .nmenu, .grip .nvis').forEach(b => b.style.fontSize = (gh * 0.55) + 'px');
  body.style.top = (gh + ih) + 'px'; body.style.height = (nt.h - gh - ih) + 'px'; body.style.padding = (gh * 0.35) + 'px ' + (gh * 0.45) + 'px';
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
// while the canvas moves, the worn-paper filters rest (they are costly to redraw at every zoom step) and come back after
let movingT = 0;
function apply() {
  // close in, the filters would be computed over pictures tens of thousands of pixels wide and the browser runs out of
  // graphics memory (H, 16 Nov: "zoomed in a bunch and it crashed"); past this scale only texture and shading remain
  vp.classList.toggle('close', cam.s * Math.min(3, devicePixelRatio || 1) > 1.3);   // in device pixels: a phone's 3× screen gets there sooner
  if (!vp.classList.contains('moving')) vp.classList.add('moving'); clearTimeout(movingT); movingT = setTimeout(() => vp.classList.remove('moving'), 220);
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
  const pcId = id.replace(/^b-|^builder-/, '').replace(new RegExp('-(' + ORDER.join('|') + ')$'), '');
  const sb = nodes[pcId].box, bx = sb.x + BREG.x, by = sb.y + BREG.y;
  if (id.startsWith('builder-')) { flash(id); flyToView(viewFor({ x: bx, y: by, w: BREG.w, h: BREG.h }, 1.06)); return; }
  const e = sheetEls[pcId].querySelector(`[data-id="${id}"]`); if (!e) return;
  let x, y, w, h;
  if (e.classList.contains('cell')) { x = bx + e.offsetLeft * BK_K; y = by + e.offsetTop * BK_K; w = e.offsetWidth * BK_K; h = e.offsetHeight * BK_K; }
  else { const col = e.parentElement; x = bx + col.offsetLeft * BK_K; y = by + (col.offsetTop + e.offsetTop) * BK_K; w = BIW * BK_K; h = Math.min(e.offsetHeight * BK_K, w * H() / W() * 1.3); }
  setBuild(pcId, id.split('-').pop());
  flash(id); flyToView(viewFor({ x, y, w, h }, 1.08));
}
function flash(id) { const e = nodes[id]?.el; if (!e) return; e.classList.add('hl'); setTimeout(() => e.classList.remove('hl'), 1800); }
function overview() { flyToView(viewFor(STYLE() === 'pulp' && DESK?.w ? DESK : BOUNDS, 1.02)); }
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
  { id: 'a-book', label: 'Rulebook', icon: 'assets/genre-modern.png', target: BK.id },
  { id: 'a-map', label: 'Map', icon: 'assets/type-OFC.png', target: 'map' },
  { id: 'a-party', label: 'Party', icon: 'assets/tool-pawns.png', target: 'party', box: { x: PX, y: -900, w: SW, h: SLOTS * RH + 900 } },
  { id: 'a-sessions', label: 'Sessions', icon: 'assets/tool-build.png', target: 's1', box: { x: SX, y: SY, w: SBW, h: py - SY } },
  { id: 'a-table', label: 'At the table', icon: 'assets/tool-build.png', target: 'round', box: { x: SX, y: TBY, w: SBW, h: TBH } },
  { id: 'a-history', label: 'History', icon: 'assets/tool-build.png', target: 'history' },
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
  const vw = W();
  for (const l of labels) { const f = l.size * cam.s; const lo = l.over ? 40 : 70, hi = l.over ? 110 : 260; const end = l.over ? 0 : 0.05;
    let o = f <= lo ? 0.9 : f >= hi ? end : 0.9 - (f - lo) / (hi - lo) * (0.9 - end);
    // a headline over content also fades once the thing it names fills most of the screen: by then you are inside it
    if (l.over && o > 0) { if (l.ww == null && l.e.isConnected) l.ww = l.e.getBoundingClientRect().width / cam.s || 0; const sw = (l.ww || 0) * cam.s;
      if (sw > 0.5 * vw) o *= Math.max(0, 1 - (sw - 0.5 * vw) / (0.3 * vw)); }
    if (l._o !== o) { l.e.style.opacity = o.toFixed(2); l.e.style.visibility = o < 0.01 ? 'hidden' : ''; l._o = o; } }
}
function frame() {
  if (dirty) { dirty = false; labelPass(); edgeArrows(); drawThreads(); pagesPass(); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ input
let pan = null, pinch = null; const ptrs = new Map();
const interactive = t => t.closest('button, input, select, textarea, label, a, [contenteditable], .chip, .tend, .arrow, [data-go], .opt, [data-act], [data-tok], .portrait, [data-rule-of]');
const typing = t => t.closest('input, select, textarea, [contenteditable]');
// Touch (H, 14 Nov, on a phone): the canvas is covered in buttons, so a finger pans from anywhere; a drag that moved is a
// pan, never a press. Two fingers pinch; lifting one hands the pan to the other. A flick coasts. Double-tap zooms into
// the thing (or in, on empty canvas); a long press on empty canvas makes a note. The page itself never zooms.
let suppressClickUntil = 0, fling = null, lastTap = null, press = null;
const stopFling = () => { if (fling) { cancelAnimationFrame(fling.raf); fling = null; } };
function startPan(ev) { pan = { sx: ev.clientX, sy: ev.clientY, cx: cam.x, cy: cam.y, moved: false, touch: ev.pointerType !== 'mouse', hist: [{ t: performance.now(), x: ev.clientX, y: ev.clientY }],
  scrolly: ev.pointerType !== 'mouse' ? ev.target.closest?.('.scrolly') : null, st: 0 }; if (pan.scrolly) pan.st = pan.scrolly.scrollTop; }
vp.addEventListener('pointerdown', ev => {
  stopFling();
  // a new first finger means no other finger is down: drop any pointer whose 'up' never arrived (a page canvas swapped
  // out under a finger can lose it), or a stale entry would make every later pinch look like three fingers
  if (ev.isPrimary) { ptrs.clear(); pinch = null; }
  ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; pan = null; clearTimeout(press?.t); press = null;
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; } return; }
  if (ptrs.size > 2) return;
  if (dragNote) return;
  const touch = ev.pointerType !== 'mouse';
  if (touch ? typing(ev.target) : interactive(ev.target)) return;
  startPan(ev);
  if (touch && !interactive(ev.target) && !ev.target.closest('[data-id]:not([data-id="map"])')) {
    press = { x: ev.clientX, y: ev.clientY, t: setTimeout(() => { if (pan && !pan.moved) { pan = null; suppressClickUntil = performance.now() + 500; newNoteAt(press.x, press.y); } press = null; }, 550) };
  }
});
window.addEventListener('pointermove', ev => {
  if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    cam.x -= (cx - pinch.cx) / cam.s; cam.y -= (cy - pinch.cy) / cam.s; zoomAt(cx, cy, d / pinch.d); pinch = { d, cx, cy }; suppressClickUntil = performance.now() + 400; return; }
  if (dragNote) { const n = dragNote; n.nt.x = n.ox + (ev.clientX - n.sx) / cam.s; n.nt.y = n.oy + (ev.clientY - n.sy) / cam.s; place(n.e, n.nt.x, n.nt.y); nodes[n.nt.id].box = { ...nodes[n.nt.id].box, x: n.nt.x, y: n.nt.y }; return; }
  if (!pan) return;
  const dx = ev.clientX - pan.sx, dy = ev.clientY - pan.sy;
  if (!pan.moved && Math.hypot(dx, dy) < (pan.touch ? 9 : 4)) return;
  if (!pan.moved) { pan.moved = true; clearTimeout(press?.t); press = null; vp.classList.add('panning'); if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
  // a list that can scroll takes vertical drags first
  if (pan.scrolly && pan.scrolly.scrollHeight > pan.scrolly.clientHeight + 2) { const k = pan.scrolly.getBoundingClientRect().height / pan.scrolly.offsetHeight || 1;
    const want = pan.st - dy / k, clamped = Math.max(0, Math.min(pan.scrolly.scrollHeight - pan.scrolly.clientHeight, want)); pan.scrolly.scrollTop = clamped;
    if (clamped === want || Math.abs(dx) < Math.abs(dy)) return; }
  cam.x = pan.cx - dx / cam.s; cam.y = pan.cy - dy / cam.s; apply();
  pan.hist.push({ t: performance.now(), x: ev.clientX, y: ev.clientY }); if (pan.hist.length > 6) pan.hist.shift();
});
const up = ev => {
  const wasPinch = !!pinch; ptrs.delete(ev.pointerId); clearTimeout(press?.t); press = null;
  if (ptrs.size < 2) pinch = null;
  if (dragNote) { dragNote = null; persist(); }
  if (wasPinch && ptrs.size === 1) { const [id, p] = [...ptrs.entries()][0]; startPan({ clientX: p.x, clientY: p.y, pointerType: 'touch', target: document.body }); pan.moved = true; return; }
  if (pan?.moved) {
    suppressClickUntil = performance.now() + 350;
    if (pan.touch) { const h = pan.hist, a = h[0], z = h.at(-1), dt = z.t - a.t;
      if (dt > 0 && performance.now() - z.t < 80) { let vx = (z.x - a.x) / dt, vy = (z.y - a.y) / dt;   // px per ms
        if (Math.hypot(vx, vy) > 0.25) { let last = performance.now();
          const step = now => { const t = now - last; last = now; cam.x -= vx * t / cam.s; cam.y -= vy * t / cam.s; apply(); const f = Math.pow(0.94, t / 16); vx *= f; vy *= f;
            fling = Math.hypot(vx, vy) > 0.02 ? { raf: requestAnimationFrame(step) } : null; };
          fling = { raf: requestAnimationFrame(step) }; } } }
  } else if (pan?.touch && ptrs.size === 0) {
    // a tap: two within 320 ms and 30 px make a double-tap
    const now = performance.now(), x = ev.clientX, y = ev.clientY;
    if (lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) { lastTap = null; suppressClickUntil = now + 350; doubleTapAt(ev.target, x, y); }
    else lastTap = { t: now, x, y };
  }
  pan = null; vp.classList.remove('panning');
};
window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
// a drag or pinch that moved must not also press whatever it started on
document.addEventListener('click', ev => { if (performance.now() < suppressClickUntil) { ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
// the page never zooms (iOS Safari gesture events); only the canvas does
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
// only multi-finger moves (iOS would zoom the page); cancelling a one-finger move makes Android drop the tap's click
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
function doubleTapAt(target, x, y) {
  const hit = target.closest?.('[data-id]'), id = hit?.dataset.id;
  if (id && nodes[id] && nodes[id].kind !== 'zone' && id !== 'map' && !hit.dataset.band) { const b = target.closest('.builder'); flyTo(b ? b.dataset.id : id); return; }
  const f = 2.2, s0 = cam.s, x0 = cam.x, y0 = cam.y, t0 = performance.now(), wx = x0 + x / s0, wy = y0 + y / s0;
  const step = now => { const t = Math.min(1, (now - t0) / 260), e = 1 - Math.pow(1 - t, 3), s = s0 * Math.pow(f, e); cam.s = Math.min(MAX_S, s); cam.x = wx - x / cam.s; cam.y = wy - y / cam.s; apply(); if (t < 1) anim = { raf: requestAnimationFrame(step) }; else anim = null; };
  anim = { raf: requestAnimationFrame(step) };
}
vp.addEventListener('wheel', ev => {
  { const sc = ev.target.closest?.('.scrolly'); if (sc && !ev.ctrlKey && !ev.metaKey && sc.scrollHeight > sc.clientHeight + 2) { ev.preventDefault(); sc.scrollTop += ev.deltaY / cam.s; return; } }
  ev.preventDefault(); if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
  const mouseWheel = ev.deltaMode === 1 || (ev.deltaX === 0 && Math.abs(ev.deltaY) >= 50 && Number.isInteger(ev.deltaY));
  if (ev.ctrlKey || ev.metaKey) zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * 0.01));
  else if (mouseWheel && !ev.shiftKey) zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0018)));
  else { cam.x += (ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX) / cam.s; cam.y += (ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY) / cam.s; apply(); }
}, { passive: false });
vp.addEventListener('dblclick', ev => {
  if (interactive(ev.target) || performance.now() < suppressClickUntil) return;
  const hit = ev.target.closest('[data-id]');
  const id = hit?.dataset.id;
  if (id && nodes[id] && !['zone'].includes(nodes[id].kind) && !hit.dataset.band) {
    // the deepest meaningful thing: a builder region on a sheet, else the node
    const b = ev.target.closest('.builder'); flyTo(b ? b.dataset.id : id); return;
  }
  newNoteAt(ev.clientX, ev.clientY);
});
function newNoteAt(sx, sy) {
  const wx = cam.x + sx / cam.s, wy = cam.y + sy / cam.s;
  const k = Math.max(0.05, Math.min(60, 0.85 / cam.s)); const nt = { id: 'n-' + Date.now().toString(36), x: wx - 110 * k, y: wy - 20 * k, k, text: '' };
  state.notes.push(nt); const e = makeNote(nt); persist();
  e.querySelector('.body').focus({ preventScroll: true });
}
document.addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]');
  if (go && !ev.target.closest('.opt:not(.sel)')) { ev.preventDefault(); ev.stopPropagation(); flyTo(go.dataset.go); return; }
  const act = ev.target.closest('[data-act]'); if (act && act.tagName === 'BUTTON' && !act.disabled) { doAct(act); return; }
  // a skill's (or any stat's) name goes to its rule, with the thread drawn; its number shows where the number came from
  const nm = ev.target.closest('.main [data-rule-of]');
  if (nm && !pan?.moved) { const pcId = nm.closest('.sheet[data-id]')?.dataset.id || nm.closest('[data-id]').dataset.id, key = nm.dataset.ruleOf, box = sheetEls[pcId];
    const rule = (box?._prov?.[key] || []).find(id => printIndex[id]); document.querySelectorAll('.pv.pinned').forEach(x => x.classList.remove('pinned'));
    const pv = box?.querySelector(`.main .pv[data-prov="${key}"]`); threadSrc = { pcId, key, pinned: true }; pv?.classList.add('pinned'); dirty = true;
    if (rule) flyTo(rule); return; }
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
  if (a.dataset.act === 'newpc') { const id = newRunner(a.dataset.slot); if (id) { setTimeout(() => flyTo(`b-${id}-name`), 60); setTimeout(() => sheetEls[id]?.querySelector('input[data-act="name"]')?.focus({ preventScroll: true }), 2700); } return; }
  const pc = pcById[a.dataset.pc]; if (!pc) return;
  if (!['roll', 'rollchars', 'croll'].includes(a.dataset.act)) historyNote(`${choicesOf(pc).name || `A new ${WORDS.char}`}: ${(a.getAttribute('aria-label') || a.dataset.label || a.querySelector('b')?.textContent || a.textContent || a.dataset.act).trim().replace(/\s+/g, ' ').slice(0, 60)}`);
  const ch = choicesOf(pc), act = a.dataset.act, path = a.dataset.path;
  if (!RIG_NO_UNDO.has(act)) pushUndo();
  if (rigAct(act, a, pc, ch)) return;
  if (act === 'inc') { const v = (getPath(ch, path) ?? (path.startsWith('skills.') ? 1 : 0)) + +a.dataset.d; setPath(ch, path, Math.max(+a.dataset.min, Math.min(+a.dataset.max, v))); }
  else if (act === 'set') { const v = a.dataset.v; setPath(ch, path, getPath(ch, path) === v ? null : v); }
  else if (act === 'flag') { setPath(ch, path, getPath(ch, path) ? null : 1); }
  else if (act === 'toggle') { const arr = getPath(ch, path) || []; const v = a.dataset.v; const max = +a.dataset.max || 99;
    setPath(ch, path, arr.includes(v) ? arr.filter(x => x !== v) : (arr.length >= max ? [...arr.slice(1), v] : [...arr, v])); }
  else if (act === 'asof') { state.asof[pc.id] = +a.dataset.v; renderSheet(pc); return; }
  persist(); renderSheet(pc);
}
document.addEventListener('input', ev => {
  const i = ev.target.closest('input[data-act="name"], input[data-act="player"]'); if (!i) return; const pc = pcById[i.dataset.pc]; const ch = choicesOf(pc);
  if (i.dataset.act === 'player') { pc.player = i.value; const x = state.extra.find(e => e.id === pc.id); if (x) x.player = i.value; persist(); box_who(pc); return; }
  ch.name = i.value; persist();
  const box = sheetEls[pc.id], nm = ch.name || `New ${WORDS.char}`; box.querySelector('.nm').textContent = nm; box.querySelector('.nm').classList.toggle('empty', !ch.name); nodes[pc.id].title = nm; });
document.addEventListener('change', ev => { const s = ev.target.closest('select[data-act="wire"]'); if (!s) return; const pc = pcById[s.dataset.pc]; choicesOf(pc).wire = s.value || null; persist(); renderSheet(pc); });

// ---- the book's pages: every page is always drawn; pdf.js sharpens a page once you are close
let pdfDoc = null, pdfFailed = false;
// ---- the stencil (H, 15 Nov): the book is the reader's own copy. They download it from its maker, open it here, and it
// stays in this browser (IndexedDB); nothing about the book reaches a server. A stencil is made for one exact file: the
// copy is recognised by its SHA-256 (books/fingerprints.js, written by build.sh), and any other file is refused.
const BOOKFILE = (C.book.file || '').split('/').pop(), PRINT = (window.BOOK_PRINTS || {})[BOOKFILE] || null;
const bookStore = (() => { let db = null; const open = () => db || (db = new Promise(res => { try { const r = indexedDB.open('turnip-almanac-books', 1); r.onupgradeneeded = () => r.result.createObjectStore('files');
  r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }));
  const tx = async (mode, fn) => { const d = await open(); if (!d) return null; return new Promise(res => { const q = fn(d.transaction('files', mode).objectStore('files')); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); };
  return { get: k => tx('readonly', st => st.get(k)), put: (k, v) => tx('readwrite', st => st.put(v, k)), del: k => tx('readwrite', st => st.delete(k)) }; })();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
let copyState = PRINT ? 'none' : 'local';   // none · checking · open · wrong · local (no stencil: the developer's file)
let copyNote = '';
function renderCopyPanel() {
  const el = bk.querySelector('.copy') || bk.appendChild(Object.assign(document.createElement('div'), { className: 'copy' }));
  const getUrl = C.book.get?.url === '@self' ? `downloads/${BOOKFILE}` : C.book.get?.url;   // '@self': we host it (our own book), named as the stencil's exact file
  const get = C.book.get ? `<a class="keyb" href="${esc(getUrl)}" target="_blank" rel="noopener">1 · ${esc(C.book.get.label || 'Get the book')} ↗</a>` : '';
  const pick = `<label class="keyb primary">${get ? '2 · ' : ''}Open your copy<input type="file" accept="application/pdf,.pdf" hidden data-opencopy></label>`;
  el.innerHTML = copyState === 'open' ? `<span class="ok">✓ Your copy is open in this browser.</span><button class="keyb" data-forgetcopy>Forget it here</button>`
    : copyState === 'checking' ? `<span>Checking your copy…</span>`
    : copyState === 'local' ? '' : `<span>${copyState === 'wrong' ? `<b class="bad">${esc(copyNote)}</b>` : 'This table runs on <b>your own copy</b> of the book. It stays in your browser.'}</span>${get}${pick}`;
  bk.classList.toggle('needcopy', copyState !== 'open' && copyState !== 'local');
  if (copyState !== 'open' && copyState !== 'local') pageFrames.forEach(o => { if (!o._thumb) o.el.querySelector('.ph').innerHTML = `${o.n}<small>Open your copy<br>to see this page</small>`; });
}
async function openCopy(file) {
  if (!file) return; copyState = 'checking'; renderCopyPanel();
  const buf = await file.arrayBuffer(), h = hex(await crypto.subtle.digest('SHA-256', buf));
  if (PRINT && h !== PRINT.sha256) {
    copyState = 'wrong'; copyNote = `That file isn't the copy this table was made for (${file.name}, ${buf.byteLength.toLocaleString()} bytes; it needs ${C.book.get?.file || BOOKFILE}, ${PRINT.size.toLocaleString()} bytes). A different printing needs its own stencil.`;
    renderCopyPanel(); return false; }
  await bookStore.put(PRINT ? PRINT.sha256 : h, new Blob([buf], { type: 'application/pdf' }));
  await loadPdf(buf); historyNote(`Opened your copy of ${C.book.title}`); return true;
}
async function loadPdf(buf) {
  if (!window.pdfjsLib) { pdfFailed = true; return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; copyState = 'open';
  pageFrames.forEach(o => { o._thumb = null; o._res = 0; o.el.querySelector('.ph').textContent = o.n; });
  renderCopyPanel(); dirty = true; cutArt();
}
// the art: the stencil marks each illustration (page + rect); it is cut from the reader's own copy, here, at runtime
const bookArt = {};
async function cutArt() {
  for (const a of (C.print || []).filter(p => p.kind === 'art')) {
    try { const page = await pdfDoc.getPage(a.page), [x, y, w, h] = a.rect, k = a.use === 'map' ? Math.min(8, 4200 / w) : Math.min(4, 2400 / w), v = page.getViewport({ scale: k });   // the map is zoomed into: cut it finer
      const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height); await page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
      const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k); o.getContext('2d').drawImage(c, -x * k, -y * k);
      bookArt[a.id] = o.toDataURL('image/jpeg', 0.9); placeArt(a); } catch (e) { console.warn('art', a.id, e.message); }
  }
}
const artCards = {}; let artY = null;
function placeArt(a) {
  const src = bookArt[a.id];
  if (a.use === 'map' && a.id === C.mapArt) { const im = mapEl.querySelector('.mapimg'); im.src = src; im.hidden = false; mapEl.querySelector('.mapwait')?.remove(); return; }
  // scenes and pictures: in a strip west of the book (the quiet side), packed tight, each its own size
  if (artCards[a.id]) { artCards[a.id].querySelector('img').src = src; return; }
  const w = 1300, h = Math.round(w * a.rect[3] / a.rect[2]); if (artY == null) artY = BY;
  const e = add(world, 'card artcard bookart', -w - 160, artY, w, h + 70, `<img src="${src}" alt="${esc(a.title || 'Art from the book')}" draggable="false"><div class="cap">${esc(a.title || '')} <span>· p.${a.page}, from your copy</span></div>`);
  artCards[a.id] = e; reg(a.id + '-card', { el: e, title: `${a.title || 'Art'} · from the book`, kind: 'art', box: { x: -w - 160, y: artY, w, h: h + 70 } }); artY += h + 70 + 60;
}
(async () => {
  try {
    if (!window.pdfjsLib) throw new Error('pdf.js did not load');
    if (!PRINT) { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfDoc = await pdfjsLib.getDocument(C.book.file).promise; dirty = true; cutArt(); return; }   // no stencil: the developer's own file
    const blob = await bookStore.get(PRINT.sha256);
    if (blob) { copyState = 'checking'; renderCopyPanel(); await loadPdf(await blob.arrayBuffer()); } else renderCopyPanel();
  } catch (e) { pdfFailed = true; console.warn('Book pages unavailable:', e.message); renderCopyPanel(); }
})();
document.addEventListener('change', ev => { const i = ev.target.closest?.('[data-opencopy]'); if (i) openCopy(i.files?.[0]); });
document.addEventListener('click', ev => { if (ev.target.closest?.('[data-forgetcopy]')) { bookStore.del(PRINT.sha256).then(() => location.reload()); return; }
  // a blank page asks for the copy: click it to open one
  const pf = ev.target.closest?.('.pagef'); if (pf && copyState !== 'open' && copyState !== 'local' && !pan?.moved) bk.querySelector('[data-opencopy]')?.click(); });
// drop a PDF anywhere: it is checked against this table's stencil
addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.items || [])].some(i => i.type === 'application/pdf')) ev.preventDefault(); });
addEventListener('drop', ev => { const f = [...(ev.dataTransfer?.files || [])].find(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)); if (!f) return; ev.preventDefault(); openCopy(f); flyTo(BK.id); });
// every page is always there (E1): a thumbnail first, sharpened only when it is big on screen; a few sharp pages at a time
let pagesBusy = 0;
const SHARP_MAX = matchMedia('(pointer: coarse)').matches ? 6 : 14;
function renderPage(o, width) {
  pagesBusy++; o._busy = true;
  return pdfDoc.getPage(o.n).then(page => { const v1 = page.getViewport({ scale: 1 }), v = page.getViewport({ scale: width / v1.width });
    const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
    return page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise.then(() => { if (width <= 240) o._thumb = c; o.el.querySelector('.cv').replaceChildren(c); o._res = width; o._used = performance.now(); });
  }).catch(e => console.warn('page', o.n, e.message)).finally(() => { pagesBusy--; o._busy = false; dirty = true; });
}
let thumbIdle = 0;
const COARSE = matchMedia('(pointer: coarse)').matches;   // a phone or tablet: smaller sharpenings, fewer kept
function pagesPass() {
  if (!pdfDoc) return;
  if (ptrs.size || fling) { dirty = true; return; }   // never render (on the main thread) under a finger or a coasting flick
  const vw = W(), vh = H(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const scored = pageFrames.map(o => { const b = o.box, x0 = (b.x - cam.x) * cam.s, y0 = (b.y - cam.y) * cam.s, sw = b.w * cam.s;
    return { o, sw, on: !(x0 > vw || y0 > vh || x0 + sw < 0 || y0 + b.h * cam.s < 0) }; });
  for (const { o, sw, on } of scored.sort((a, b) => (b.on - a.on) || (b.sw - a.sw))) {
    if (pagesBusy >= 1) break;   // one at a time: drawing a page is main-thread work (parsing is in pdf.js's worker)
    if (o._busy) continue;
    // sharpen to the size it is actually shown at (in 25% steps), not a fixed jump to 2600 px
    const need = sw * dpr, step = r => Math.min(COARSE ? 1600 : 2400, Math.ceil(r / 400) * 400);
    const want = !o._thumb ? (on ? 200 : 0) : on && need > 260 ? step(need) : 0;
    if (want && (o._res || 0) < want * 0.8) renderPage(o, want);
  }
  // fill the remaining thumbnails only in idle moments, one per idle slot, never while the canvas moves
  if (pagesBusy < 1 && !thumbIdle && pageFrames.some(o => !o._thumb && !o._busy)) {
    thumbIdle = (window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 120)))(dl => { thumbIdle = 0;
      if (vp.classList.contains('moving') || ptrs.size || pagesBusy || dl.timeRemaining() < 6) { dirty = true; return; }
      const o = pageFrames.find(o => !o._thumb && !o._busy); if (o) renderPage(o, 200); }, { timeout: 1500 }); }
  const sharp = scored.filter(x => (x.o._res || 0) >= 1300 && !x.on).sort((a, b) => a.o._used - b.o._used);
  const nSharp = pageFrames.filter(o => (o._res || 0) >= 1300).length;
  for (let k = 0; k < nSharp - SHARP_MAX && k < sharp.length; k++) { const o = sharp[k].o; if (o._thumb) { o.el.querySelector('.cv').replaceChildren(o._thumb); o._res = 200; } }
}
document.addEventListener('keydown', ev => {
  // only real text entry keeps the keys to itself; a slider, checkbox, colour well or button does not (H, 16 Nov:
  // "/" must always jump to the search bar, as in Turnip Works)
  const typing = ev.target.closest('textarea, select, [contenteditable="true"], [contenteditable=""], input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=button]):not([type=file])');
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
const qinEl = document.getElementById('qin');
function qHint() { if (!qinEl) return; const long = WORDS.quickHint || 'Jump or do: a name, a skill, roll, round order…'; qinEl.placeholder = innerWidth < 640 ? 'Jump or do…' : long; }
qHint(); addEventListener('resize', qHint);
// ------------------------------------------------------------------ deep history (H, 14 Nov: "version controlled", like a
// document's edit history). Everything the table saves lives in one record; when it changes and settles, a version is
// committed to IndexedDB holding only the parts that changed, with a line saying what happened. Any version can be gone
// back to (which is itself a new version, so nothing is ever lost).
let histNotes = [];
function historyNote(t) { histNotes.push(t); }
const HIST = { vs: [], db: null, last: null, lastRaw: null, settle: null, settleT: 0 };
const HKEYS = { choices: 'characters', live: 'damage', rolls: 'rolls', notes: 'notes', log: 'the log', pockets: 'pockets', snotes: 'session notes', smeta: 'sessions', sessx: 'sessions', prepN: 'sessions',
  portraits: 'portraits', art: 'pictures', order: 'the party', removed: 'the party', rollCount: 'roll counts', extra: 'the party', done: 'builds', summons: 'summons', npcx: 'people', threadx: 'threads', pins: 'pins' };
function histRebuild(upto = Infinity) { const o = {}; for (const v of HIST.vs) { if (v.id > upto) break; Object.assign(o, v.set); (v.del || []).forEach(k => delete o[k]); } return o; }
function histTx(mode) { return HIST.db.transaction('versions', mode).objectStore('versions'); }
(async () => {
  HIST.db = await new Promise(res => { try { const r = indexedDB.open('turnip-almanac-history', 1); r.onupgradeneeded = () => r.result.createObjectStore('versions', { keyPath: 'id', autoIncrement: true }).createIndex('k', 'k'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } });
  if (!HIST.db) return;
  HIST.vs = await new Promise(res => { const q = histTx('readonly').index('k').getAll(STORE_KEY); q.onsuccess = () => res(q.result.sort((a, b) => a.id - b.id)); q.onerror = () => res([]); });
  HIST.last = histRebuild(); HIST.lastRaw = JSON.stringify(HIST.last);
  try { const n = sessionStorage.getItem('turnip-almanac-histnote'); if (n) { histNotes.push(n); sessionStorage.removeItem('turnip-almanac-histnote'); } } catch {}
  renderHistory();
  if (!HIST.vs.length) { const v = { k: STORE_KEY, t: Date.now(), notes: ['Opened the campaign'], set: {}, del: [] };   // the first version: the campaign as it came
    await new Promise(res => { const q = histTx('readwrite').add(v); q.onsuccess = () => { v.id = q.result; HIST.vs.push(v); res(); }; q.onerror = res; }); HIST.lastRaw = null; renderHistory(); }
  setInterval(histTick, 1500); histTick();
})();
function histTick() {
  const raw = localStorage.getItem(STORE_KEY) || '{}', now = performance.now();
  if (raw === HIST.lastRaw) return;
  if (raw !== HIST.settle) { HIST.settle = raw; HIST.settleT = now; if (HIST.vs.length) return; }
  if (HIST.vs.length && now - HIST.settleT < 1800) return;
  let o; try { o = JSON.parse(raw); } catch { return; }
  const set = {}, del = [];
  for (const k in o) if (JSON.stringify(o[k]) !== JSON.stringify(HIST.last[k])) set[k] = o[k];
  for (const k in HIST.last) if (!(k in o)) del.push(k);
  HIST.lastRaw = raw; if (!Object.keys(set).length && !del.length) return;
  const counts = {}; histNotes.splice(0).forEach(n => counts[n] = (counts[n] || 0) + 1);
  const notes = Object.entries(counts).map(([n, c]) => c > 1 ? `${n} ×${c}` : n);
  if (!notes.length) notes.push('Changed ' + [...new Set(Object.keys(set).concat(del).map(k => HKEYS[k] || k))].join(', '));
  const v = { k: STORE_KEY, t: Date.now(), notes, set, del };
  const q = histTx('readwrite').add(v); q.onsuccess = () => { v.id = q.result; HIST.vs.push(v); HIST.last = o; renderHistory(); };
}
function histGoBack(id) {
  const v = HIST.vs.find(x => x.id === id); if (!v) return;
  localStorage.setItem(STORE_KEY, JSON.stringify(histRebuild(id))); FROZEN = true;
  try { sessionStorage.setItem('turnip-almanac-histnote', `Went back to ${new Date(v.t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`); } catch {}
  location.reload();
}
// in the left suburbs: just west of the map, where people seldom go; the past lies to the left (H, 14–15 Nov: packed tight)
const HBW = HISTW, HBH = Math.round(HBW * 1.618), HBX = -HBW - 160, HBY = Math.round(MH / 2 - HBH / 2);   // packed tight against the map, like the party on the east
label(world, 'History', HBX, HBY - 700, 560);
const histCard = add(world, 'card tablecard histcard', HBX, HBY, HBW, HBH, '');
reg('history', { el: histCard, title: 'History · every change, newest first', kind: 'table', box: { x: HBX, y: HBY, w: HBW, h: HBH } });
updateBounds();
function renderHistory() {
  const vs = HIST.vs.slice(-200).reverse(), day = t => new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  let lastDay = '', rows = '';
  vs.forEach((v, i) => { const d = day(v.t); if (d !== lastDay) { rows += `<div class="hday">${esc(d)}</div>`; lastDay = d; }
    rows += `<div class="hrow"><span class="ht">${new Date(v.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><span class="hn">${v.notes.map(esc).join('<br>')}</span>${i ? `<button class="tb" data-hist="${v.id}">Go back to this</button>` : '<span class="now">now</span>'}</div>`; });
  histCard.innerHTML = `<h3>History <span class="sub3">every change, newest first</span></h3><div class="hlist scrolly">${rows || '<div class="none">Changes appear here as you make them.</div>'}</div>`;
}

// ------------------------------------------------------------------ roll counts (H, 14 Nov): every dice button keeps a tiny
// count of how often it was pressed; a build's characteristic rolls also go into the history.
const ROLLSEL = '[data-act="roll"], [data-act="rollchars"], [data-act="croll"], button.die, [data-troll]';
const rollKey = b => `${b.dataset.pc || b.closest('[data-id^="pc-"]')?.dataset.id || 'gm'}|${b.dataset.act || 'die'}|${b.dataset.label || b.dataset.skill || b.dataset.troll || b.dataset.target || ''}`;
function decorateCounts(root = document) {
  root?.querySelectorAll(ROLLSEL).forEach(b => { const n = state.rollCount[rollKey(b)] || 0; let c = b.querySelector(':scope > .rc');
    if (!n) { c?.remove(); return; } if (!c) { c = document.createElement('span'); c.className = 'rc'; b.appendChild(c); } c.textContent = n; c.title = `Pressed ${n} time${n === 1 ? '' : 's'}`; });
}
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
document.addEventListener('click', ev => {
  const b = ev.target.closest?.(ROLLSEL); if (!b || b.disabled) return;
  const k = rollKey(b), n = state.rollCount[k] = (state.rollCount[k] || 0) + 1, pc = pcById[b.dataset.pc];
  if (b.dataset.act === 'rollchars') { historyNote(`${choicesOf(pc).name || `A new ${WORDS.char}`} rolled characteristics (${ordinal(n)} time)`); logPush({ kind: 'note', who: pc.id, text: `rolled characteristics (${ordinal(n)} time)` }); }
  setTimeout(() => { persist(); decorateCounts(b.closest('.sheet, .card') || document); }, 0);
}, true);
{ const rs = renderSheet; renderSheet = function (pc) { rs(pc); decorateCounts(sheetEls[pc.id]); }; }
{ const rt = renderTable; renderTable = function () { rt(); decorateCounts(diceCard); }; }
decorateCounts();
document.addEventListener('click', ev => {
  const rm = ev.target.closest?.('[data-rmpc]'); if (rm) { removePc(rm.dataset.rmpc); return; }
  const h = ev.target.closest?.('[data-hist]'); if (h) histGoBack(+h.dataset.hist);
});
// ---- Options (H, 16 Nov: "we are ultimately going to need an options menu"). A small key in the quickbar; the first
// option is the look. Kept per browser.
const LOOKS = [['pulp', 'Pulp catalogue'], ['classic', 'Classic']];
function setLook(k) { document.documentElement.dataset.style = k; try { localStorage.setItem('turnip-almanac-style', k); } catch {} tuneApply(); layoutDesk();
  document.fonts?.ready.then(() => { PCS.forEach(renderSheet); sessionEls.forEach(x => fitCard(x.card)); renderTable(); dirty = true; }); }
(() => {
  const b = document.createElement('button'); b.type = 'button'; b.id = 'qopts'; b.title = 'Options'; b.setAttribute('aria-label', 'Options');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
  qb.insertBefore(b, qb.querySelector('kbd'));
  let m = null; const close = () => { m?.remove(); m = null; };
  b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); });
  b.addEventListener('click', ev => { ev.stopPropagation(); if (m) return close();
    m = document.createElement('div'); m.id = 'optsmenu'; m.setAttribute('role', 'menu');
    const cur = STYLE();
    m.innerHTML = `<div class="nmh">Look</div><div class="nmseg">${LOOKS.map(([k, n]) => `<button data-look="${k}" class="${k === cur ? 'sel' : ''}" aria-pressed="${k === cur}">${n}</button>`).join('')}</div><button class="tunebtn" data-tune="1">Tune the look…</button><div class="nmfoot">Kept in this browser. More options will live here.</div>`;
    document.body.appendChild(m); const r = qb.getBoundingClientRect(); m.style.top = (r.bottom + 8) + 'px'; m.style.left = Math.max(12, Math.min(innerWidth - m.offsetWidth - 12, r.right - m.offsetWidth)) + 'px';
    m.addEventListener('click', e2 => { if (e2.target.closest('[data-tune]')) { close(); openTuner(); return; } const l = e2.target.closest('[data-look]'); if (!l) return; setLook(l.dataset.look); close(); }); });
  document.addEventListener('pointerdown', ev => { if (m && !ev.target.closest('#optsmenu, #qopts')) close(); }, true);
})();
// the chewed paper edge, made once as a mask tile (a rounded square whose rim wanders), then stretched around every card
// with a border mask: as cheap as a rounded corner. Live SVG filters cost ~0.4 s at every zoom (H, 16 Nov: froze).
// Three tiles with different wear, so neighbours differ. The tile is 240 px with 80 px corners; --corner sets the size.
const CHEW = [];
function makeChew(seed, amp) {
  const N = 240, R = 80, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  let s0 = seed; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
  const K = 64, wob = Array.from({ length: K }, () => rnd() * 2 - 1);   // smooth noise around the rim
  const noise = t => { const x = t * K, i = Math.floor(x) % K, f = x - Math.floor(x), a = wob[i], b2 = wob[(i + 1) % K]; return a + (b2 - a) * (f * f * (3 - 2 * f)); };
  const fine = () => (rnd() - 0.5) * amp * 0.35;
  g.fillStyle = '#000'; g.beginPath();
  const P = 360, inset = amp + 2, w = N - 2 * inset, r = R - inset;
  for (let k = 0; k <= P; k++) {   // walk a rounded square; push each point in or out along its normal
    const t = k / P, per = 2 * (w - 2 * r) * 2 + 2 * Math.PI * r; let d = t * per, x, y, nx, ny; const L = w - 2 * r, q = Math.PI * r / 2;
    const seg = [[L, (u) => [inset + r + u, inset, 0, -1]], [q, (u) => { const a = -Math.PI / 2 + u / r; return [inset + w - r + Math.cos(a) * r, inset + r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; }],
      [L, (u) => [inset + w, inset + r + u, 1, 0]], [q, (u) => { const a = u / r; return [inset + w - r + Math.cos(a) * r, inset + w - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; }],
      [L, (u) => [inset + w - r - u, inset + w, 0, 1]], [q, (u) => { const a = Math.PI / 2 + u / r; return [inset + r + Math.cos(a) * r, inset + w - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; }],
      [L, (u) => [inset, inset + w - r - u, -1, 0]], [q, (u) => { const a = Math.PI + u / r; return [inset + r + Math.cos(a) * r, inset + r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; }]];
    for (const [len, f] of seg) { if (d <= len) { [x, y, nx, ny] = f(d); break; } d -= len; }
    const off = noise(t) * amp * 0.6 + fine(); g.lineTo(x + nx * off, y + ny * off);
  }
  g.closePath(); g.fill(); return c.toDataURL();
}
[[7, 9], [131, 11], [977, 8]].forEach(([sd, amp]) => CHEW.push(makeChew(sd, amp)));
CHEW.forEach((u, i) => document.documentElement.style.setProperty(`--chew${i + 1}`, `url(${u})`));

// ---- the look tuner (H, 16 Nov: "we are going to need a hand tuner"): sliders over the live canvas for the dials of the
// worn-paper look. Saved per browser; "Copy settings" puts them on the clipboard to send back.
const TUNE_KEY = 'turnip-almanac-tune', hexA = (h, a) => h + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
const DIALS = [   // [key, label, min, max, step, default] — wide ranges on purpose: find the edges, then come back
  ['dmargin', 'Sheet: margin around the table', 0, 8000, 50, 1800], ['dcorner', 'Sheet: corner roundness', 0, 8000, 50, 1600], ['dchew', 'Sheet: edge chew', 0, 2000, 10, 260], ['dburnw', 'Sheet: burn width', 0, 5000, 25, 900], ['dburn', 'Sheet: burn darkness', 0, 1, 0.01, 0.6],
  ['corner', 'Cards: corner roundness', 0, 160, 1, 26], ['chew', 'Cards: edge chew (px)', 0, 24, 0.5, 1.5], ['edgew', 'Ink rim width', 0, 16, 0.5, 7], ['edge', 'Ink rim darkness', 0, 1, 0.01, 0.45],
  ['tex', 'Paper texture strength', 0, 1, 0.01, 1], ['texsize', 'Texture scale', 100, 4000, 20, 900], ['burn', 'Cards: burned edge darkness', 0, 1, 0.01, 0.12], ['burnw', 'Cards: burned edge width', 0, 200, 2, 40],
  ['shy', 'Shadow distance (shows on the map and paper)', 0, 60, 0.5, 5], ['shblur', 'Shadow blur', 0, 80, 0.5, 12], ['shd', 'Shadow darkness', 0, 1, 0.01, 0.44],
  ['paperh', 'Paper hue', 0, 360, 1, 40], ['papers', 'Paper colour strength', 0, 100, 1, 45], ['paperl', 'Paper lightness', 20, 100, 0.5, 85],
  ['redh', 'Accent red: hue', 0, 360, 1, 8], ['reds', 'Accent red: strength', 0, 100, 1, 38], ['redl', 'Accent red: lightness', 0, 90, 1, 48],
  ['btnh', 'Button hue', 0, 360, 1, 39], ['btns', 'Button colour strength', 0, 100, 1, 68], ['btnl', 'Button lightness', 10, 95, 1, 64], ['btnr', 'Button rounding', 0, 60, 1, 16]];
const hslHex = (h, s, l) => { s /= 100; l /= 100; const f = n => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
const hexHsl = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = Math.round((h * 60 + 360) % 360);
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; return [h, Math.round(s * 100), Math.round(l * 100)]; };
function tuneGet() { try { return JSON.parse(localStorage.getItem(TUNE_KEY) || '{}'); } catch { return {}; } }
function tuneApply(t = tuneGet()) {
  const r = document.documentElement.style, props = ['--corner', '--edge-c', '--edge-w', '--veil', '--tex-size', '--burn', '--burn-w', '--sh-x', '--sh-y', '--sh-blur', '--sh-c', '--ochre', '--ochre-soft', '--btn-c', '--btn-hi', '--btn-lo', '--btn-ledge', '--btn-corner', '--paper'];
  if (STYLE() !== 'pulp') { props.forEach(k => r.removeProperty(k)); return; }   // the dials belong to the worn-paper look
  const v = k => t[k] ?? DIALS.find(d => d[0] === k)[5];
  const paper = `hsl(${v('paperh')} ${v('papers')}% ${v('paperl')}%)`;
  r.setProperty('--corner', v('corner') + 'px'); r.setProperty('--edge-c', hexA('#3b2a1f', v('edge'))); r.setProperty('--edge-w', v('edgew') + 'px');
  r.setProperty('--paper', paper); r.setProperty('--veil', `hsl(${v('paperh')} ${v('papers')}% ${v('paperl')}% / ${1 - v('tex')})`);
  r.setProperty('--tex-size', v('texsize') + 'px'); r.setProperty('--burn', hexA('#8a5a20', v('burn'))); r.setProperty('--burn-w', v('burnw') + 'px');
  r.setProperty('--sh-x', (v('shy') * 0.6) + 'px'); r.setProperty('--sh-y', v('shy') + 'px'); r.setProperty('--sh-blur', v('shblur') + 'px'); r.setProperty('--sh-c', hexA('#0b0806', v('shd')));
  r.setProperty('--ochre', `hsl(${v('redh')} ${v('reds')}% ${v('redl')}%)`); r.setProperty('--ochre-soft', `hsl(${v('redh')} ${v('reds')}% ${v('redl')}% / .13)`);
  r.setProperty('--btn-c', `hsl(${v('btnh')} ${v('btns')}% ${v('btnl')}%)`); r.setProperty('--btn-hi', `hsl(${v('btnh')} ${v('btns')}% ${Math.min(97, v('btnl') + 16)}%)`); r.setProperty('--btn-lo', `hsl(${v('btnh')} ${v('btns')}% ${Math.max(5, v('btnl') - 12)}%)`);
  r.setProperty('--btn-ledge', `hsl(${v('btnh')} ${Math.min(100, v('btns') + 10)}% ${Math.max(4, v('btnl') - 34)}%)`); r.setProperty('--btn-corner', v('btnr') + 'px');
  if (['dmargin', 'dcorner', 'dchew', 'dburnw', 'dburn'].some(k => tuneApply['_' + k] !== v(k))) { ['dmargin', 'dcorner', 'dchew', 'dburnw', 'dburn'].forEach(k => tuneApply['_' + k] = v(k)); layoutDesk(); }
  const chewKey = v('chew') + ':' + v('corner');
  if (tuneApply._chew !== chewKey) { tuneApply._chew = chewKey; const k = 80 / Math.max(6, v('corner'));   // world px → tile px
    [[7, 1], [131, 1.25], [977, .85]].forEach(([sd, f], i) => r.setProperty(`--chew${i + 1}`, `url(${makeChew(sd, Math.min(36, v('chew') * f * k))})`)); }
}
function openTuner() {
  document.querySelector('#tuner')?.remove(); const t = tuneGet(), p = document.createElement('div'); p.id = 'tuner';
  p.innerHTML = `<div class="th"><b>Tune the look</b><span>${esc(LOOKS.find(l => l[0] === STYLE())?.[1] || '')}</span><button data-tx="close" aria-label="Close">✕</button></div>
    <div class="tbody"><label class="pick"><span>Accent red (pick it)</span><input type="color" data-pick="red" value="${hslHex(t.redh ?? 8, t.reds ?? 38, t.redl ?? 48)}"></label>${DIALS.map(([k, n, lo, hi, st, def]) => `<label><span>${n}</span><input type="range" min="${lo}" max="${hi}" step="${st}" value="${t[k] ?? def}" data-dial="${k}"><output>${t[k] ?? def}</output></label>`).join('')}</div>
    <div class="tf"><button data-tx="copy">Copy settings</button><button data-tx="reset">Reset</button></div>`;
  document.body.appendChild(p);
  p.addEventListener('input', ev => {
    const pk = ev.target.closest('[data-pick]'); if (pk) { const [h, s2, l] = hexHsl(pk.value), t2 = tuneGet(); Object.assign(t2, { redh: h, reds: s2, redl: l });
      ['redh', 'reds', 'redl'].forEach((k, j) => { const i = p.querySelector(`[data-dial="${k}"]`); i.value = [h, s2, l][j]; i.nextElementSibling.textContent = i.value; });
      try { localStorage.setItem(TUNE_KEY, JSON.stringify(t2)); } catch {} tuneApply(t2); return; }
    const i = ev.target.closest('[data-dial]'); if (!i) return; const t2 = tuneGet(); t2[i.dataset.dial] = +i.value; i.nextElementSibling.textContent = i.value;
    try { localStorage.setItem(TUNE_KEY, JSON.stringify(t2)); } catch {} tuneApply(t2); });
  p.addEventListener('click', ev => { const b = ev.target.closest('[data-tx]'); if (!b) return;
    if (b.dataset.tx === 'close') p.remove();
    if (b.dataset.tx === 'reset') { try { localStorage.removeItem(TUNE_KEY); } catch {} tuneApply({}); openTuner(); }
    if (b.dataset.tx === 'copy') { const txt = JSON.stringify({ look: STYLE(), ...tuneGet() }); navigator.clipboard?.writeText(txt).then(() => { b.textContent = 'Copied'; }, () => { b.textContent = 'Select and copy below'; p.querySelector('.tf').insertAdjacentHTML('beforeend', `<textarea readonly>${esc(txt)}</textarea>`); }); } });
}
tuneApply();
// ---- the desk sheet (H, 16 Nov): the chewed and burnt edge belongs "between the paper and the brown desktop", huge,
// "at the scale of all the way zoomed out", with margin. One sheet of paper under the whole table; its outline and
// burn are drawn once as two images sized to the layout (mask + burn), so zooming costs nothing extra.
var DESK = { x: 0, y: 0, w: 0, h: 0 }, deskEl = document.createElement('div'); deskEl.className = 'deskpaper'; world.prepend(deskEl);   // var: the tuner may ask before this runs
function deskOutline(w, h, R, A, seed, inset = 0) {   // points around a rounded rectangle, each pushed in or out by layered noise
  let s0 = seed; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
  const oct = [[9, 0.55], [37, 0.3], [140, 0.15]].map(([K, a]) => [K, a, Array.from({ length: K }, () => rnd() * 2 - 1)]);
  const noise = t => oct.reduce((sum, [K, a, wob]) => { const x = t * K, i = Math.floor(x) % K, f = x - Math.floor(x), p = wob[i], q = wob[(i + 1) % K]; return sum + a * (p + (q - p) * f * f * (3 - 2 * f)); }, 0);
  const r = Math.min(R, w / 2 - A, h / 2 - A), m = A, L1 = w - 2 * m - 2 * r, L2 = h - 2 * m - 2 * r, q = Math.PI * r / 2, per = 2 * L1 + 2 * L2 + 4 * q, N = 1600, pts = [];
  const arc = (cx, cy, a0) => u => { const a = a0 + u / r; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; };
  const seg = [[L1, u => [m + r + u, m, 0, -1]], [q, arc(w - m - r, m + r, -Math.PI / 2)], [L2, u => [w - m, m + r + u, 1, 0]], [q, arc(w - m - r, h - m - r, 0)],
    [L1, u => [w - m - r - u, h - m, 0, 1]], [q, arc(m + r, h - m - r, Math.PI / 2)], [L2, u => [m, h - m - r - u, -1, 0]], [q, arc(m + r, m + r, Math.PI)]];
  for (let k = 0; k < N; k++) { let d = k / N * per, P; for (const [len, f] of seg) { if (d <= len) { P = f(d); break; } d -= len; } P = P || seg[0][1](0);
    const off = noise(k / N) * A * 0.75 + (rnd() - 0.5) * A * 0.25 - inset; pts.push([P[0] + P[2] * off, P[1] + P[3] * off]); }
  return pts;
}
let deskT = 0;
function layoutDesk() {
  if (!deskEl || !BOUNDS.w) return; const t = tuneGet(), dv = k => t[k] ?? DIALS.find(d => d[0] === k)[5], M = dv('dmargin');
  Object.assign(DESK, { x: BOUNDS.x - M, y: BOUNDS.y - M, w: BOUNDS.w + 2 * M, h: BOUNDS.h + 2 * M });
  Object.assign(deskEl.style, { left: DESK.x + 'px', top: DESK.y + 'px', width: DESK.w + 'px', height: DESK.h + 'px' });
  clearTimeout(deskT); deskT = setTimeout(() => {
    const k = 2048 / Math.max(DESK.w, DESK.h), W = Math.round(DESK.w * k), H = Math.round(DESK.h * k), A = dv('dchew') * k, R = dv('dcorner') * k, B = dv('dburnw') * k;
    const path = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    const outer = deskOutline(W, H, R, Math.max(1, A), 4242), mk = document.createElement('canvas'); mk.width = W; mk.height = H;
    const g = mk.getContext('2d'); g.fillStyle = '#000'; path(g, outer); g.fill();
    const bk = document.createElement('canvas'); bk.width = W; bk.height = H; const b = bk.getContext('2d');
    b.fillStyle = `rgba(74, 40, 12, ${dv('dburn')})`; path(b, outer); b.fill();
    b.globalCompositeOperation = 'destination-out'; b.filter = `blur(${Math.max(1, B * 0.45)}px)`; b.fillStyle = '#000'; path(b, deskOutline(W, H, R, Math.max(1, A), 4242, B)); b.fill();
    deskEl.style.setProperty('--desk-mask', `url(${mk.toDataURL()})`); deskEl.style.setProperty('--desk-burn', `url(${bk.toDataURL()})`);
  }, 120);
}
layoutDesk();
window.almanac = { cam, flyTo, nodes, hist: () => HIST, fitCell, fitSections, setView, viewFor, overview, state, R, renderSheet, pcById, sheetEls, newRunner, BK_K, BREG, BINNER, setBuild, BOUNDS, pdfState: () => ({ ok: !!pdfDoc, failed: pdfFailed, copy: copyState }), openCopy, bookArt };   // for tests
requestAnimationFrame(frame);
})();
