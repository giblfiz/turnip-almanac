// ------------------------------------------------------------------ sessions: compact, editable cards; notes grouped by who
// Notes are plain text with two marks: @name links a runner, person or place (and makes a new person if nobody matches),
// [[Title]] links anything by its title (a rule, a place). The seed text's {{id}} marks still render.
const SCW = 1000, SGAP = 60, SCOLS = 3;
const SX = PX + SW + 240, SY = 40;
const allSessions = [...C.sessions, { ...C.prep, prep: true }];
state.snotes = saved.snotes || null; state.smeta = saved.smeta || {}; state.npcx = saved.npcx || [];
if (!state.snotes) { state.snotes = {}; allSessions.forEach(s => { state.snotes[s.n] = []; Object.entries(C.cells).forEach(([who, row]) => (row[s.n] || []).forEach((t, j) => state.snotes[s.n].push({ id: `c-${who}-${s.n}-${j}`, who, text: t }))); }); }
const persist2 = persist; persistExtra = () => { persist2(); try { const o = JSON.parse(localStorage.getItem('turnip-almanac-2') || '{}'); Object.assign(o, { snotes: state.snotes, smeta: state.smeta, npcx: state.npcx }); localStorage.setItem('turnip-almanac-2', JSON.stringify(o)); } catch {} };
state.npcx.forEach(n => { if (!npcIndex[n.id]) { C.npcs.push(n); npcIndex[n.id] = n; } });
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
const sessionEls = [];
const subjOf = id => pcById[id] ? { name: choicesOf(pcById[id]).name || 'New runner', icon: portraitOf(pcById[id], sheetOf(pcById[id])).src, go: id } : npcIndex[id] ? { name: npcIndex[id].name, icon: state.portraits[id] || npcIndex[id].icon, go: id } : C.threads.find(t => t.id === id) ? { name: C.threads.find(t => t.id === id).name, icon: null, go: id, thread: true } : { name: 'Table notes', icon: null, go: null, general: true };
const mentionsBy = {};                                   // subject id -> Set of note ids that mention it
function renderSessionCard(x) {
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
    <button class="btn addnote" data-addnote="${s.n}" data-who="">+ Note</button></div>`;
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
  fitCard(card);
}
function fitCard(card) {
  const f = card.querySelector(':scope > .fit'); if (!f || !card.offsetHeight) return;
  const W = card.clientWidth - 68, Hh = card.clientHeight - 60; let lo = 0.5, hi = 2.2;
  const cr = card.getBoundingClientRect(), k = cr.height / card.offsetHeight || 1;
  for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; f.style.zoom = mid; f.style.width = (W / mid) + 'px'; if (f.getBoundingClientRect().height / k <= Hh) lo = mid; else hi = mid; }
  f.style.zoom = lo; f.style.width = (W / lo) + 'px';
}
allSessions.forEach(s => { const card = add(world, 'card scard' + (s.prep ? ' prep' : ''), 0, 0, SCW, null, ''); sessionEls.push({ s, card }); });
sessionEls.forEach(x => { renderSessionCard(x); x.card.querySelector('.fit').style.zoom = 1; x.card.querySelector('.fit').style.width = (SCW - 68) + 'px'; });
let sy = SY; const sRows = [];
for (let r = 0; r * SCOLS < sessionEls.length; r++) {
  const rowEls = sessionEls.slice(r * SCOLS, r * SCOLS + SCOLS);
  const h = Math.max(...rowEls.map(x => x.card.offsetHeight)) + 200;      // a little room to grow; the fit fills it
  rowEls.forEach((x, c) => { place(x.card, SX + c * (SCW + SGAP), sy, SCW, h); x.box = { x: SX + c * (SCW + SGAP), y: sy, w: SCW, h };
    reg('s' + x.s.n, { el: x.card, title: `S${x.s.n} · ${x.s.title}`, kind: 'session', box: x.box }); renderSessionCard(x); });
  sRows.push(sy); sy += h + SGAP;
}
nodes.now = { id: 'now', el: sessionEls[sessionEls.length - 1].card, title: 'Now · next session', kind: 'now', icon: 'assets/tool-build.png', box: sessionEls[sessionEls.length - 1].box };
label(world, 'Sessions', SX, SY - 330, 260);
const SBW = SCOLS * SCW + (SCOLS - 1) * SGAP;

// editing in place: click a note, a title or a recap. Enter saves, Shift+Enter breaks a line, Esc cancels.
let editing = null;
function startEdit(e) {
  if (editing?.el === e) return; if (editing) endEdit(true);
  const raw = e.dataset.note ? (state.snotes[e.dataset.s].find(n => n.id === e.dataset.note)?.text ?? '') : null;
  editing = { el: e, before: e.innerHTML };
  if (raw != null) { const tmp = el('div', '', renderNote(raw, '', new Set())); e.textContent = textOf(tmp); }
  e.contentEditable = 'true'; e.classList.add('editing'); e.focus();
  const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
function endEdit(save) {
  const ed = editing; if (!ed) return; editing = null; const e = ed.el; e.contentEditable = 'false'; e.classList.remove('editing');
  const s = +e.dataset.s, x = sessionEls.find(q => q.s.n === s);
  if (!save) { e.innerHTML = ed.before; return; }
  const text = e.innerText.replace(/ /g, ' ').trim();
  if (e.dataset.sedit) { state.smeta[s] = { ...(state.smeta[s] || {}), [e.dataset.sedit]: text }; }
  else { const list = state.snotes[s], n = list.find(q => q.id === e.dataset.note); if (n) { if (text) n.text = text; else list.splice(list.indexOf(n), 1); } }
  const made = adoptMentions(text);
  persistExtra(); renderSessionCard(x); if (made) layoutPeople(); refreshBacks();
}
document.addEventListener('click', ev => {
  const add = ev.target.closest('[data-addnote]');
  if (add) { const s = +add.dataset.addnote, n = { id: `c-x${Date.now().toString(36)}`, who: add.dataset.who || '', text: '' }; state.snotes[s].push(n);
    const x = sessionEls.find(q => q.s.n === s); renderSessionCard(x); const e = x.card.querySelector(`[data-note="${n.id}"]`); if (e) startEdit(e); return; }
  const ed = ev.target.closest('.ed'); if (ed && !ev.target.closest('.chip') && !ed.isContentEditable) { startEdit(ed); return; }
  if (editing && !ev.target.closest('.editing')) endEdit(true);
});
document.addEventListener('keydown', ev => { if (!editing || ev.target !== editing.el) return;
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); endEdit(true); } else if (ev.key === 'Escape') { ev.preventDefault(); endEdit(false); }
  ev.stopPropagation(); }, true);

// people and threads: compact cards under the sessions; each lists where it comes up
let pTop = sy + 120; label(world, 'People and threads', SX, pTop, 160);
const PCW = (SBW - SGAP) / 2; let py = pTop + 230;
const pEls = {};
function layoutPeople() {
  const pts = [...C.npcs.map(n => ({ o: n, kind: 'npc' })), ...C.threads.map(t => ({ o: t, kind: 'thread' }))];
  let y = pTop + 230; const made = [];
  pts.forEach(p => { if (!pEls[p.o.id]) {
    const e = add(world, 'card pcard', SX, 0, PCW, null, `<div class="pch">${p.kind === 'npc' ? `<div class="pport" data-portrait="${p.o.id}">${(state.portraits[p.o.id] || p.o.icon) ? `<img src="${state.portraits[p.o.id] || p.o.icon}" alt="" draggable="false">` : '<span class="pdrop">Drop a picture</span>'}</div>` : '<span class="tdot big">?</span>'}<div><div class="num">${p.kind === 'npc' ? 'Person' : 'Thread'}</div><h2>${esc(p.o.name)}</h2><div class="t">${esc(p.o.text || 'An open question the table keeps pulling on.')}</div></div></div><div class="backs"></div>`);
    reg(p.o.id, { el: e, title: p.o.name, kind: p.kind === 'npc' ? 'person' : 'thread', icon: p.o.icon, box: null }); pEls[p.o.id] = e; }
    made.push(pEls[p.o.id]); });
  for (let r = 0; r * 2 < made.length; r++) {
    const two = made.slice(r * 2, r * 2 + 2), h = Math.max(...two.map(e => e.offsetHeight));
    two.forEach((e, c) => { place(e, SX + c * (PCW + SGAP), y, PCW, h); nodes[e.dataset.id].box = { x: SX + c * (PCW + SGAP), y, w: PCW, h }; });
    y += h + SGAP;
  }
  py = y;
}
layoutPeople();
// inbox beside the sessions
const IBX = SX + SBW + 120;
const ib = add(world, 'inbox', IBX, SY, 900, 1300, `<div class="ih"><h2>Inbox</h2>Loose notes land here. Drag them where they belong, or leave them. Paste text anywhere (⌘V) to make one.</div>`);
reg('inbox', { el: ib, title: 'Inbox · loose notes', kind: 'inbox', box: { x: IBX, y: SY, w: 900, h: 1300 } });
const colX = i => SX + (i % SCOLS) * (SCW + SGAP), colW = SCW, colGap = SGAP, nS = C.sessions.length;

PCS.forEach(pc => { nodes[pc.id].title = choicesOf(pc).name || 'New runner'; });
function refreshBacks() {
  Object.entries(mentionsBy).forEach(([id, set]) => { const ss = [...new Set([...set].map(nid => { for (const s of allSessions) if ((state.snotes[s.n] || []).some(n => n.id === nid)) return s.n; return null; }).filter(Boolean))].sort((a, b) => a - b);
    [nodes['idx-' + id], nodes[id]].forEach(t => { const b = t?.el?.querySelector('.backs'); if (b) b.innerHTML = ss.length ? 'In sessions ' + ss.map(n => `<span class="chip" data-go="s${n}">S${n}</span>`).join(' ') : ''; }); });
}
refreshBacks();
