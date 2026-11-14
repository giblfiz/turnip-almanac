import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
q = open(S + '/qbar_table.js').read()
if 'logCard' not in q:
    q = q.replace("const diceCard = add(world, 'card tablecard', colX(5), TBY, TBW, TBH, '');", "const diceCard = add(world, 'card tablecard', colX(5), TBY, TBW, TBH, '');\nconst logCard = add(world, 'card tablecard logcard', colX(5), TBY, TBW, TBH, '');", 1)
    q = q.replace("reg('dice', { el: diceCard, title: 'Dice tray', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });",
                  "reg('dice', { el: diceCard, title: 'Dice tray', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });\nreg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });", 1)
    q = q.replace("var tableReady = false;", """var tableReady = false;
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
document.addEventListener('keydown', ev => { if (ev.target.closest?.('.loginput') && ev.key === 'Enter') { ev.preventDefault(); say(ev.target.value); logCard.querySelector('.loginput')?.focus({ preventScroll: true }); } });""", 1)
    q = q.replace("(state.rolls._free = state.rolls._free || []).unshift(rec); state.rolls._free = state.rolls._free.slice(0, 8); persist(); renderTable(); toast(rec, at); return rec;",
                  "(state.rolls._free = state.rolls._free || []).unshift(rec); state.rolls._free = state.rolls._free.slice(0, 8); persist(); renderTable(); toast(rec, at); logPush({ kind: 'roll', who: 'gm', rec }); return rec;", 1)
    q = q.replace("tableReady = true; renderTable();", "tableReady = true; renderTable(); renderLog(true);", 1)
    q = q.replace("  if (['dice', 'tray'].some(", """  if (ws[0] === 'say' && ws.length > 1) { const rest = q.trim().slice(3).trim(); const who = runnerWord(rest.split(/\\s+/)[0]); const txt = who && rest.split(/\\s+/)[0].endsWith(':') ? rest.split(/\\s+/).slice(1).join(' ') : rest; out.push({ k: 'cmd', t: `Say “${txt.slice(0, 60)}”${who && rest.split(/\\s+/)[0].endsWith(':') ? ' as ' + choicesOf(who).name : ''}`, run: () => say(txt, who && rest.split(/\\s+/)[0].endsWith(':') ? who.id : 'gm') }); }
  if (['log', 'chat', 'history'].some(w => w.startsWith(ws[0]) && ws[0].length >= 3)) out.push({ k: 'cmd', t: 'Log · rolls and chat', run: () => flyTo('log') });
  if (['dice', 'tray'].some(""", 1)
    open(S + '/qbar_table.js', 'w').write(q)

a = open(S + '/acts2.js').read()
if 'logPush' not in a:
    old = "  (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist();\n  const t = $('#toast')"
    assert old in a, 'rollFor rec'
    a = a.replace(old, "  (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist(); logPush({ kind: 'roll', who: pc.id, rec });\n  const t = $('#toast')", 1)
    old2 = "    state.summonPick[pc.id] = false; if (res.rating) state.summons[pc.id]"
    assert old2 in a, 'summon'
    a = a.replace(old2, "    logPush({ kind: 'roll', who: pc.id, rec });\n" + old2, 1)
    open(S + '/acts2.js', 'w').write(a)

p = S + '/assemble3.py'; s = open(p).read()
if 'scrolly' not in s:
    s = s.replace('    ("const ease = t => t < .5', '''    ("vp.addEventListener('wheel', ev => {", "vp.addEventListener('wheel', ev => {\\n  { const sc = ev.target.closest?.('.scrolly'); if (sc && !ev.ctrlKey && !ev.metaKey && sc.scrollHeight > sc.clientHeight + 2) { ev.preventDefault(); sc.scrollTop += ev.deltaY / cam.s; return; } }"),
    ("const TBX = SX, TBY = -1340, TBW = (SBW - SGAP) / 2, TBH = 900;", "const TBX = SX, TBY = -1340, TBW = (SBW - 2 * SGAP) / 3, TBH = 900;"),
    ("const diceCard = add(world, 'card tablecard', SX + TBW + SGAP, TBY, TBW, TBH, '');\\nconst logCard = add(world, 'card tablecard logcard', colX(5), TBY, TBW, TBH, '');", "const diceCard = add(world, 'card tablecard', SX + TBW + SGAP, TBY, TBW, TBH, '');\\nconst logCard = add(world, 'card tablecard logcard', SX + 2 * (TBW + SGAP), TBY, TBW, TBH, '');"),
    ("reg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });", "reg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: SX + 2 * (TBW + SGAP), y: TBY, w: TBW, h: TBH } });"),
    ("const ease = t => t < .5''', 1)
    open(p, 'w').write(s)
print('ok')
