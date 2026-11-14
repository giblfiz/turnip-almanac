// Basic Roleplaying: the rule-specific half of the app. Inserted by build.sh at /*@RIG-UI@*/ inside the app's scope.
// Contract (what the engine calls): WORDS, RIG_NO_UNDO, advanceText, STEP_NAME, BCOLS, ORDER, STEP_RULE, STEP_SHEET,
// BIW, BINNER, BREG, BK_K, stepHtml, renderSheet, rollHtml, portraitOf, initiative, renderTable, freeRoll, qdice2,
// trayStep, trayRoll, rigCommands, rigAct, box_who.
const WORDS = { char: 'investigator', Char: 'Investigator', party: 'The investigators', helpCommands: '<i>ada dodge</i>, <i>roll 45</i>, <i>resist 12 10</i>, <i>damage ada 3</i>, <i>heal ada</i>, <i>new investigator</i>' };
const RIG_NO_UNDO = new Set(['roll', 'croll']);
const P = R.P;
function advanceText(k) { return (k.gain || []).map(g => `${R.SK[g.skill]?.name || g.skill} +${g.n}`).join(', '); }
const STEP_NAME = { name: 'name', power: 'power level', chars: 'characteristics', prof: 'profession', profskills: 'professional skills', personal: 'personal skills', powers: 'powers', weapons: 'weapons', armor: 'armour', done: 'all done' };
const ORDER = ['name', 'power', 'chars', 'prof', 'profskills', 'personal', 'powers', 'weapons', 'armor', 'done'];
const BCOLS = [['name', 'power', 'chars', 'prof'], ['profskills', 'armor', 'done'], ['personal'], ['powers', 'weapons']];
const STEP_RULE = { name: 'brp-step-1', power: 'brp-power-level', chars: 'brp-step-1', prof: 'brp-professions', profskills: 'brp-step-7', personal: 'brp-step-7', powers: 'brp-how-do-characters-get-powers', weapons: 'brp-weapons', armor: 'brp-armor', done: 'brp-step-7' };
const STEP_SHEET = { name: '.nm', power: '.who', chars: '.chgrid', prof: '.who', profskills: '.skgrid', personal: '.skgrid', powers: '.l-powers', weapons: '.l-weapons', armor: '.l-armor', done: '.budget' };
const BIW = 880, BGAP = 40, BINNER = { w: 30 + 4 * BIW + 3 * BGAP + 30, h: 5200 }, BREG = { x: 30, y: 950, w: 440, h: 320 };
const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);

function stepHead(S, key, no, title, rule) {
  const pools = key === 'profskills' ? `${S.profLeft} of ${S.profPool} professional left` : key === 'personal' ? `${S.persLeft} of ${S.persPool} personal left` : `${S.profLeft} + ${S.persLeft} points left`;
  return `<div class="q"><span class="no">${no}</span><h3>${title}</h3>${rule && printIndex[rule] ? `<span class="chip" data-go="${rule}">p.${printIndex[rule].page}</span>` : ''}<span class="sub">${pools}</span></div>`;
}
function stepHtml(pc, S, key) {
  const ch = choicesOf(pc);
  const opt = (path, v, cur, title, eff, cost) => `<button class="opt${cur === v ? ' sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="${path}" data-v="${v}" aria-pressed="${cur === v}"><b>${esc(title)}${cost != null ? `<em>${esc(cost)}</em>` : ''}</b><span>${esc(eff || '')}</span></button>`;
  const row = (on, title, eff, cost, ctl) => `<div class="row${on ? ' on' : ''}"><div><b>${title}</b><span>${eff}</span><span class="cost">${cost}</span></div>${ctl}</div>`;
  const step5 = (path, v, min, max, lab) => `<div class="stepper"><button data-act="inc" data-pc="${pc.id}" data-path="${path}" data-d="-5" data-min="${min}" data-max="${max}" ${v <= min ? 'disabled' : ''} aria-label="Lower ${lab}">−</button><output>${v}</output><button data-act="inc" data-pc="${pc.id}" data-path="${path}" data-d="5" data-min="${min}" data-max="${max}" ${v >= max ? 'disabled' : ''} aria-label="Raise ${lab}">+</button></div>`;
  let h = `<div class="bstep" data-id="b-${pc.id}-${key}">`;
  if (key === 'name') h += `${stepHead(S, 'name', '0', 'Name', STEP_RULE.name)}<div class="hint">Who are they?</div><input data-act="name" data-pc="${pc.id}" value="${esc(ch.name || '')}" placeholder="Name" aria-label="Name"><input data-act="player" data-pc="${pc.id}" value="${esc(pc.player || '')}" placeholder="Player" aria-label="Player name" style="margin-top:12px;font-size:24px">`;
  if (key === 'power') {
    h += `${stepHead(S, 'power', '1', 'Power level', STEP_RULE.power)}<div class="hint">Sets skill points, the creation cap and powers. Normal suits horror and modern games.</div><div class="opts">`;
    R.D.powerLevels.forEach(l => h += opt('power', l.id, ch.power || 'normal', l.id[0].toUpperCase() + l.id.slice(1), `${l.profPoints} professional points · skills to ${l.skillCap}%`));
    h += `</div>`;
  }
  if (key === 'chars') {
    h += `${stepHead(S, 'chars', '2', 'Characteristics', STEP_RULE.chars)}<div class="hint">Roll them all, then adjust. SIZ and INT must be at least 8.</div>
      <button class="opt sel rollall" data-act="rollchars" data-pc="${pc.id}"><b>⚄ Roll all eight</b><span>${R.D.characteristics.map(c => c.id.toUpperCase() + ' ' + c.roll).join(' · ')}</span></button><div class="rows" style="margin-top:14px">`;
    R.D.characteristics.forEach(c => { const v = ch.char[c.id] || 0; h += row(!!v, `${c.name}`, `${c.roll} · ${esc(c.notes || '')}`, v ? `${v}` : 'not rolled', `<div class="stepper"><button data-act="inc" data-pc="${pc.id}" data-path="char.${c.id}" data-d="-1" data-min="3" data-max="21" ${v <= 3 ? 'disabled' : ''}>−</button><output>${v || '—'}</output><button data-act="inc" data-pc="${pc.id}" data-path="char.${c.id}" data-d="1" data-min="3" data-max="21" ${v >= 21 ? 'disabled' : ''}>+</button></div>`); });
    h += `</div>`;
  }
  if (key === 'prof') {
    h += `${stepHead(S, 'prof', '3', 'Profession', STEP_RULE.prof)}<div class="hint">Your profession decides where your professional points may go.</div><div class="opts three">`;
    R.D.professions.list.forEach(p => h += opt('prof', p.id, ch.prof, p.name, p.skills.filter(x => x.skill).slice(0, 4).map(x => R.SK[x.skill]?.name).filter(Boolean).join(', ') + (p.skills.length > 4 ? '…' : '')));
    h += `</div>`;
  }
  if (key === 'profskills') {
    h += `${stepHead(S, 'profskills', '4', 'Professional skills', STEP_RULE.profskills)}<div class="hint">Spend ${S.profPool} points on your profession's skills, 5 at a time. No skill above ${S.cap}% at creation.</div>`;
    const prof = S.prof;
    if (!prof) h += `<div class="crease" style="height:600px">Choose a profession first</div>`;
    else { h += `<div class="rows one">`; const seen = new Set();
      prof.skills.forEach(x => { if (!x.skill || seen.has(x.skill)) return; seen.add(x.skill); const s = R.SK[x.skill]; if (!s) return; const v = ch.profAlloc[x.skill] || 0, base = R.baseOf(s, S.char, ch);
        h += row(v > 0, `${esc(x.text || s.name)} → ${S.skill[s.id]}%`, `base ${base}%`, `+${v}`, step5('profAlloc.' + s.id, v, 0, Math.max(0, S.cap - base - (ch.persAlloc[s.id] || 0)), s.name)); });
      h += `</div>${prof.skills.filter(x => !x.skill).map(x => `<div class="hint">Also: ${esc(x.text)} (spend personal points on these)</div>`).join('')}`; }
  }
  if (key === 'personal') {
    h += `${stepHead(S, 'personal', '5', 'Personal skills', STEP_RULE.personal)}<div class="hint">INT × 10 = ${S.persPool} points for any skill, 5 at a time.</div><div class="rows">`;
    R.SKILLS.forEach(s => { const v = ch.persAlloc[s.id] || 0, base = R.baseOf(s, S.char, ch); h += row(v > 0, `${esc(s.name)} ${S.skill[s.id]}%`, `${esc(s.category || '')} · base ${base}%`, v ? `+${v}` : '', step5('persAlloc.' + s.id, v, 0, Math.max(0, S.cap - base - (ch.profAlloc[s.id] || 0)), s.name)); });
    h += `</div>`;
  }
  if (key === 'powers') {
    h += `${stepHead(S, 'powers', '6', 'Powers', STEP_RULE.powers)}<div class="hint">Most Normal-level games have none. Choose a system to open its list.</div><div class="opts three">`;
    h += opt('psys', '', ch.psys || '', 'None', 'No powers'); R.POWERS.forEach(k => h += opt('psys', k, ch.psys || '', R.D.powers[k].name || k, ''));
    h += `</div><div style="height:1500px;margin-top:14px">`;
    if (ch.psys) { h += `<div class="grouph"><span>${esc(R.D.powers[ch.psys].name || ch.psys)}${S.powerNote ? ' · ' + S.powerNote : ''}</span></div><div class="opts three">`;
      R.powerList(ch.psys).forEach(pw => { const on = (ch.powers || []).includes(pw.name); h += `<button class="opt${on ? ' sel' : ''}" style="padding:8px 10px" data-act="toggle" data-pc="${pc.id}" data-path="powers" data-v="${esc(pw.name)}" aria-pressed="${on}"><b style="font-size:19px">${esc(pw.name)}</b><span style="font-size:15px">${esc(pw.cost || '')} · ${esc((pw.effect || '').slice(0, 70))}</span></button>`; });
      h += `</div>`; }
    else h += `<div class="crease" style="height:1500px">A power system's list opens here</div>`;
    h += `</div>`;
  }
  if (key === 'weapons') {
    h += `${stepHead(S, 'weapons', '7', 'Weapons', STEP_RULE.weapons)}<div class="hint">Pick what they carry. Each weapon rolls its own skill.</div>`;
    const cats = [...new Set(R.WEAPONS.map(w => w.category))];
    cats.forEach(cat => { h += `<div class="grouph"><span>${esc(cat)}</span></div><div class="opts four">`;
      R.WEAPONS.filter(w => w.category === cat).forEach(w => { const on = (ch.weapons || []).includes(w.id); h += `<button class="opt${on ? ' sel' : ''}" style="padding:6px 8px" data-act="toggle" data-pc="${pc.id}" data-path="weapons" data-v="${w.id}" aria-pressed="${on}"><b style="font-size:17px">${esc(w.name)}</b><span style="font-size:14px">${esc(w.damage || '')}</span></button>`; });
      h += `</div>`; });
  }
  if (key === 'armor') {
    h += `${stepHead(S, 'armor', '8', 'Armour', STEP_RULE.armor)}<div class="hint">One suit. Modern and future armour stops the most.</div><div class="opts three">`;
    R.ARMOR.forEach(a => h += opt('armor', a.id, ch.armor, a.name, `AP ${a.ap} · ${a.era || ''}`));
    h += `</div>`;
  }
  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3></div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? (S.profLeft + S.persLeft > 0 ? `Legal, with ${S.profLeft + S.persLeft} points unspent` : 'Legal and fully spent') : 'Not legal yet'}</b>
      <div>Professional ${S.profUsed}/${S.profPool} · Personal ${S.persUsed}/${S.persPool} · HP ${S.der.hp}</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves.</span></button>`;
  }
  return h + '</div>';
}

// rolls: d100 under the target; critical / special / success / failure / fumble
function rollHtml(r) {
  const cls = r.level === 'critical' || r.level === 'special' ? 'ok big' : r.ok ? 'ok' : r.level === 'fumble' ? 'bad' : '';
  return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">d100 vs ${r.target}%</span><span class="dd"><i class="${cls}">${String(r.roll).padStart(2, '0')}</i></span><span class="verdict${r.ok ? '' : ' fail'}">${esc(r.level[0].toUpperCase() + r.level.slice(1))}</span></div>`;
}
function recFor(label, target) { const r = R.roll(target); return { label, roll: r.roll, target: r.target, level: r.level, ok: r.ok }; }
function pushRoll(pc, rec, at) { const k = pc ? pc.id : '_free'; (state.rolls[k] = state.rolls[k] || []).unshift(rec); state.rolls[k] = state.rolls[k].slice(0, 8); persist(); toast(rec, at); logPush({ kind: 'roll', who: pc ? pc.id : 'gm', rec }); }
function rollFor(pc, target, label, at) { pushRoll(pc, recFor(`${choicesOf(pc).name || WORDS.Char} · ${label}`, target), at); renderSheet(pc); }

// portraits: TW's modern townsfolk, picked by profession
const TOKEN_FILES = window.TOKEN_FILES || {};
const PROF_TOKEN = [[/police|detective|soldier|military|security|agent|spy/i, ['modern-police-f', 'modern-police-m', 'modern-security-f', 'modern-tactical-m']], [/journal|reporter|writer|artist|entertain/i, ['modern-journalist-f', 'modern-civilian-m']],
  [/doctor|physician|nurse|medic|scien|scholar|professor|researcher|occult/i, ['modern-streetdoc-m', 'modern-civilian-f', 'modern-exec-f']], [/business|merchant|lawyer|executive|noble|politic|manager/i, ['modern-exec-m', 'modern-exec-f']],
  [/criminal|thief|beggar|gang|smuggl|hunter|thug/i, ['modern-ganger-f', 'modern-ganger-m', 'modern-fixer-m']], [/./, ['modern-civilian-f', 'modern-civilian-m', 'modern-bartender-m', 'modern-vendor-f']]];
function portraitOf(pc, S) {
  const ch = choicesOf(pc), name = (S?.prof?.name || pc.archetype || '');
  const pick = (PROF_TOKEN.find(([re]) => re.test(name)) || PROF_TOKEN.at(-1))[1];
  const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
  const options = [...pick, ...Object.keys(TOKEN_FILES).filter(k => k.startsWith('modern-') && !pick.includes(k))].slice(0, 4).map(k => close(TOKEN_FILES[k])).filter(Boolean);
  return { src: close(state.portraits[pc.id] || options[0] || ''), options };
}
function liveOf(pc) { return state.live[pc.id] || (state.live[pc.id] = { dmg: [] }); }

function renderSheet(pc) {
  const box = sheetEls[pc.id], ch = choicesOf(pc), S = sheetOf(pc), asOf = state.asof[pc.id] ?? 99, live = liveOf(pc);
  const nm = ch.name || `New ${WORDS.char}`, who = [S.prof?.name, (ch.power || 'normal') !== 'normal' ? ch.power : null].filter(Boolean).join(' · ') || 'Not built yet';
  const prev = box._prev || {};
  const pv = (key, v, cls = '', suffix = '') => `<span class="pv ${cls}${prev[key] != null && prev[key] !== v ? ' changed' : ''}" data-prov="${key}" tabindex="0">${v}${suffix}</span>`;
  const chip = (id, lab) => printIndex[id] ? `<span class="chip" data-go="${id}">${lab || 'p.' + printIndex[id].page}</span>` : '';
  const has = new Set((pc.karma || []).map(k => k.s));
  const asofBtns = ['Start', ...C.sessions.map(s => 'S' + s.n), 'Now'].map((lab, i) => { const val = lab === 'Now' ? 99 : i; const on = asOf === val; return `<button data-act="asof" data-pc="${pc.id}" data-v="${val}" class="${on ? 'on' : ''}${has.has(i) ? ' has' : ''}" aria-pressed="${on}">${lab}</button>`; }).join('');
  const die = (target, label) => `<button class="die" data-act="roll" data-pc="${pc.id}" data-target="${target}" data-label="${esc(label)}" title="Roll ${esc(label)}: d100 vs ${target}%" aria-label="Roll ${esc(label)}">⚄</button>`;
  const chars = R.D.characteristics.map(c => { const r = Object.values(S.croll).find(x => x.src === c.src); return `<div class="chbox"><div class="k">${c.id.toUpperCase()}</div>${pv('c:' + c.id, S.char[c.id] || '—', 'mid')}${r ? `<div class="crl">${esc(r.name.replace(' roll', ''))} ${r.v}% ${die(r.v, r.name)}</div>` : ''}</div>`; }).join('');
  const hpBoxes = Array.from({ length: S.der.hp }, (_, i) => `<button class="${live.dmg[i] ? 'L' : ''}" data-act="dmg" data-pc="${pc.id}" data-i="${i}" aria-label="Hit point ${i + 1}">${live.dmg[i] ? '×' : ''}</button>`).join('');
  const hurt = live.dmg.filter(Boolean).length;
  const cats = [...new Set(R.SKILLS.map(s => s.category || 'Other'))];
  const skillCols = cats.map(cat => `<div class="skcat"><div class="ahead"><span class="an">${esc(cat)}</span></div>${R.SKILLS.filter(s => (s.category || 'Other') === cat).map(s => `<div class="sk${S.skill[s.id] ? '' : ' zero'}"><span class="k">${esc(s.name)}</span>${pv('s:' + s.id, S.skill[s.id], 'mid', '%')}${die(S.skill[s.id], s.name)}</div>`).join('')}</div>`).join('');
  const weaponRows = S.weapons.map(w => { const sk = R.skillOfWeapon(w), v = sk ? S.skill[sk] : 0; return `<div><b>${esc(w.name)}</b> <span class="e">${esc(w.damage || '')}${w.range ? ' · ' + esc(w.range) : ''}</span> <button class="die sm" data-act="roll" data-pc="${pc.id}" data-target="${v}" data-label="${esc(w.name)}">⚄ ${esc(R.SK[sk]?.name || 'skill')} ${v}%</button></div>`; }).join('');
  const tok = portraitOf(pc, S);
  box.innerHTML = `
    <div class="main">
    <section class="sA">
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget">
        <div class="${S.profLeft < 0 ? 'over' : ''}"><div class="k">Professional ${chip(P.profPts)}</div><div class="bv">${S.profUsed} <span class="tn">/ ${S.profPool}</span></div><div class="bar"><i style="width:${Math.min(100, S.profUsed / Math.max(1, S.profPool) * 100)}%"></i></div></div>
        <div class="${S.persLeft < 0 ? 'over' : ''}"><div class="k">Personal</div><div class="bv">${S.persUsed} <span class="tn">/ ${S.persPool}</span></div><div class="bar"><i style="width:${Math.min(100, S.persUsed / Math.max(1, S.persPool) * 100)}%"></i></div></div>
        <div><div class="k">Experience ${chip(P.xp)}</div><div class="bv">+${S.xp.gained} <span class="tn">${S.xp.checks} checks</span></div><div class="bar"><i style="width:${Math.min(100, S.xp.checks * 10)}%"></i></div></div>
      </div>
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
    </section>
    <section class="sB">
      <h4>Characteristics ${chip('brp-characteristics')}</h4>
      <div class="chgrid">${chars}</div>
      <div class="der">
        <div><div class="k">Hit points</div>${pv('hp', S.der.hp, 'mid')}<small>major wound ${S.der.mw}</small></div>
        <div><div class="k">Power points</div>${pv('pp', S.der.pp, 'mid')}<small>= POW</small></div>
        <div><div class="k">Damage mod</div>${pv('dmg', S.der.dmg, 'mid')}<small>STR + SIZ</small></div>
        <div><div class="k">Move</div><span class="pv mid">${S.der.mov}</span><small>metres</small></div>
        <div><div class="k">XP bonus</div><span class="pv mid">${S.der.xpBonus}%</span><small>INT ÷ 2</small></div>
      </div>
    </section>
    <section class="sP">
      <div class="portrait closeup" data-portrait="${pc.id}" title="Drop an image here, or pick a figure below"><img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span></div>
      <div class="tokens">${tok.options.map(o => `<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this figure"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
    </section>
    <section class="sD">
      <h4>Combat ${chip(P.combat, 'DEX rank p.' + (printIndex[P.combat]?.page || ''))}</h4>
      <div class="track"><span class="k">Hit points ${chip(P.hp)}</span>${hpBoxes}<span class="wound">${hurt ? `${S.der.hp - hurt} left${hurt >= S.der.mw ? ' · major wound!' : ''}` : ''}</span></div>
      <div class="list l-weapons">${weaponRows || '<div class="none">No weapons</div>'}</div>
      <div class="list l-armor">${S.armor ? `<div><b>${esc(S.armor.name)}</b> <span class="e">AP ${esc(S.armor.ap)} · ${esc(S.armor.locations || '')}</span></div>` : '<div class="none">No armour</div>'}</div>
      <div class="list l-powers">${S.psys ? `<div><b>${esc(R.D.powers[S.psys].name || S.psys)}</b> <span class="e">${S.powers.map(esc).join(', ') || 'none chosen'}</span></div>` : ''}</div>
      <div class="rolls">${(state.rolls[pc.id] || []).slice(0, 2).map(rollHtml).join('') || '<div class="none">Tap ⚄ beside a skill to roll it.</div>'}</div>
    </section>
    <section class="sL">
      <div class="sec">Where the points went</div><div class="ledger">${R.SKILLS.filter(s => (ch.profAlloc[s.id] || 0) + (ch.persAlloc[s.id] || 0)).map(s => `<div><span>${esc(s.name)}</span><span>${(ch.profAlloc[s.id] || 0) ? 'prof ' + ch.profAlloc[s.id] : ''}${(ch.persAlloc[s.id] || 0) ? ' pers ' + ch.persAlloc[s.id] : ''}</span></div>`).join('') || '<div><span>Nothing spent yet</span><span>0</span></div>'}</div>
    </section>
    <section class="sC tall">
      <h4>Skills ${chip('brp-alphabetical-skill-list')} ${chip(P.rolls, 'results p.' + (printIndex[P.rolls]?.page || ''))}</h4>
      <div class="skgrid">${skillCols}</div>
    </section>
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl blbl'); bl.innerHTML = 'CHARACTER<br>BUILDER'; bl.style.fontSize = '64px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 64, over: true });
  if (!ch.prof && !state.done[pc.id]) box.querySelector('.builder').classList.add('todo');
  box._prev = Object.fromEntries([...R.CH.map(k => ['c:' + k, S.char[k]]), ...R.SKILLS.map(s => ['s:' + s.id, S.skill[s.id]]), ['hp', S.der.hp], ['pp', S.der.pp], ['dmg', S.der.dmg]]);
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  fitSections(box);
  renderQuick(); dirty = true;
}
function box_who(pc) { const S = sheetOf(pc); sheetEls[pc.id].querySelector('.who').textContent = `${S.prof?.name || 'Not built yet'} · played by ${pc.player || '—'}`; }

// round order: DEX rank, highest first; ties by the better Dodge (INTERP: the book says "the relevant skill")
function initiative() { return PCS.filter(pc => choicesOf(pc).name).map(pc => ({ pc, S: sheetOf(pc) })).sort((a, b) => (b.S.char.dex || 0) - (a.S.char.dex || 0) || (b.S.skill['skill-dodge'] || 0) - (a.S.skill['skill-dodge'] || 0)); }
const qdice2 = { pool: 50, tn: 0, active: 12, passive: 10 };
function trayStep(k, d) { if (k === 'pool') qdice2.pool = Math.max(0, Math.min(200, qdice2.pool + d * 5)); else qdice2[k] = Math.max(1, Math.min(30, qdice2[k] + d)); }
function trayRoll(el) { if (el.dataset.troll === 'resist') { const t = R.resistance(qdice2.active, qdice2.passive); return freeRoll(t, `Resistance ${qdice2.active} vs ${qdice2.passive}`, el); } freeRoll(qdice2.pool, 'Free roll', el); }
function freeRoll(target, label = 'Free roll', at) { pushRoll(null, recFor(label, target), at); renderTable(); }
function tstep2(k, lab) { return `<span class="stepper"><button data-ts="${k}" data-d="-1">−</button><output>${qdice2[k]}${k === 'pool' ? '%' : ''}</output><button data-ts="${k}" data-d="1">+</button></span>`; }
function renderTable() {
  const o = initiative(); if (turn.at >= o.length) turn.at = 0;
  roundCard.innerHTML = `<div class="fit"><h3>Round order ${printIndex[P.combat] ? `<span class="chip" data-go="${P.combat}">p.${printIndex[P.combat].page}</span>` : ''}</h3><div class="t">DEX rank, highest first; a tie goes to the better Dodge. Statements, powers, actions, then resolution.</div>
    <div class="rmeta">Round ${turn.round} <button class="tb" data-turn="next">Next ›</button><button class="tb" data-turn="reset">New round</button></div>
    <ol class="init">${o.map(({ pc, S }, i) => { const live = liveOf(pc), tok = portraitOf(pc, S).src, hurt = live.dmg.filter(Boolean).length;
      return `<li class="${i === turn.at ? 'on' : ''}"><span class="closeup rimg"><img src="${tok}" alt="" draggable="false"></span><span class="who2" data-go="${pc.id}">${esc(choicesOf(pc).name)}</span><span class="nums">DEX ${S.char.dex || '—'} · Dodge ${S.skill['skill-dodge']}%</span><span class="dots">${Array.from({ length: S.der.hp }, (_, k) => `<i class="${live.dmg[k] ? 'L' : ''}"></i>`).join('')}</span>${hurt >= S.der.mw && hurt ? '<span class="wtn">major wound</span>' : ''}</li>`; }).join('')}</ol></div>`; fitCard(roundCard);
  diceCard.innerHTML = `<div class="fit"><h3>Dice tray ${printIndex[P.rolls] ? `<span class="chip" data-go="${P.rolls}">p.${printIndex[P.rolls].page}</span>` : ''}</h3><div class="t">d100 under the chance. Critical ≤ 1/20, special ≤ 1/5, fumble at the top of the failures.</div>
    <div class="qdice"><label>Chance ${tstep2('pool')}</label><button class="tb go" data-troll="1">Roll d100</button></div>
    <div class="qdice"><label>Active ${tstep2('active')}</label><label>vs ${tstep2('passive')}</label><button class="tb go" data-troll="resist">Resist (${R.resistance(qdice2.active, qdice2.passive)}%)</button></div>
    <div class="rolls">${[...(state.rolls._free || [])].slice(0, 5).map(rollHtml).join('') || '<div class="none">No rolls yet.</div>'}</div></div>`; fitCard(diceCard);
}
function skillWord(w) { w = w.toLowerCase(); return R.SKILLS.find(s => s.name.toLowerCase() === w) || R.SKILLS.find(s => s.name.toLowerCase().startsWith(w) && w.length >= 3); }
function rigCommands(q, ws, nums, pcw) {
  const out = [], sk = ws.map(skillWord).find(Boolean);
  if (pcw && sk) { const S = sheetOf(pcw); out.push({ k: 'cmd', t: `Roll ${choicesOf(pcw).name}’s ${sk.name} (${S.skill[sk.id]}%)`, run: () => rollFor(pcw, S.skill[sk.id], sk.name) }); }
  else if ((ws[0] === 'roll' || ws[0] === 'r') && nums.length) out.push({ k: 'cmd', t: `Roll d100 vs ${nums[0]}%`, run: () => freeRoll(nums[0], `Roll vs ${nums[0]}%`, qb) });
  if (ws[0] === 'resist' && nums.length >= 2) { const t = R.resistance(nums[0], nums[1]); out.push({ k: 'cmd', t: `Resistance ${nums[0]} vs ${nums[1]}: ${t}%`, run: () => freeRoll(t, `Resistance ${nums[0]} vs ${nums[1]}`, qb) }); }
  if ((ws[0] === 'damage' || ws[0] === 'hurt') && pcw) { const n = nums[0] || 1; out.push({ k: 'cmd', t: `${choicesOf(pcw).name} takes ${n} damage`, run: () => { const S = sheetOf(pcw), d = liveOf(pcw).dmg; let left = n; for (let i = 0; i < S.der.hp && left; i++) if (!d[i]) { d[i] = 1; left--; } persist(); renderSheet(pcw); } }); }
  if (ws[0] === 'heal' && pcw) out.push({ k: 'cmd', t: `Clear ${choicesOf(pcw).name}’s damage`, run: () => { liveOf(pcw).dmg = []; persist(); renderSheet(pcw); } });
  return out;
}
function rigAct(act, a, pc, ch) {
  if (act === 'roll') { rollFor(pc, +a.dataset.target, a.dataset.label, a); return true; }
  if (act === 'rollchars') { ch.char = R.rollChars(); persist(); renderSheet(pc); return true; }
  if (act === 'dmg') { const d = liveOf(pc).dmg, i = +a.dataset.i; d[i] = d[i] ? 0 : 1; persist(); renderSheet(pc); return true; }
  return false;
}
