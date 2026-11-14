// ------------------------------------------------------------------ at the table: round order and a dice tray, ON the canvas
const TBX = colX(3), TBY = -1900, TBW = 2 * colW + colGap, TBH = 900;
label(world, 'At the table', TBX, TBY - 760, 640);
const roundCard = add(world, 'card tablecard', TBX, TBY, TBW, TBH, '');
reg('round', { el: roundCard, title: 'Round order', kind: 'table', icon: 'assets/tool-build.png', box: { x: TBX, y: TBY, w: TBW, h: TBH } });
const diceCard = add(world, 'card tablecard', colX(5), TBY, TBW, TBH, '');
const logCard = add(world, 'card tablecard logcard', colX(5), TBY, TBW, TBH, '');
reg('dice', { el: diceCard, title: 'Dice tray', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });
reg('log', { el: logCard, title: 'Log · rolls and chat', kind: 'table', box: { x: colX(5), y: TBY, w: TBW, h: TBH } });
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
