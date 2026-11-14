
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
