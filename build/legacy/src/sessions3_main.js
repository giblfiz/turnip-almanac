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
