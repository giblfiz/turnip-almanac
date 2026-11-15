// Lady Blackbird: the rule-specific half of the app. Inserted by build.sh at /*@RIG-UI@*/ inside the app's scope.
// Contract (what the engine calls): WORDS, RIG_NO_UNDO, advanceText, STEP_NAME, ORDER, STEP_RULE, STEP_SHEET, BAREA,
// BREG, BINNER, BK_K, stepHtml, renderSheet, rollHtml, portraitOf, initiative, renderTable, freeRoll, qdice2,
// trayStep, trayRoll, rigCommands, rigAct, box_who.
const WORDS = { xp: 'XP', xpVerb: 'Keys and advances', char: 'character', Char: 'Character', party: 'The crew of The Owl',
  quickHint: 'Jump or do: naomi pit-fighter, roll 5, roll 6 vs 4, refresh kale, new character…',
  helpCommands: '<i>naomi pit-fighter</i>, <i>roll 5</i>, <i>roll 6 vs 4</i>, <i>refresh kale</i>, <i>kale tired</i>, <i>new character</i>' };
const RIG_NO_UNDO = new Set(['croll']);
const P = R.P;
function advanceText(k) {
  const xp = (k.xp || []).reduce((t, h) => t + h.n, 0);
  return [xp ? `${xp} XP (${(k.xp || []).map(h => `${(R.KY[h.key]?.name || h.key).replace(/^Key of (the )?/, '')} ${h.n}`).join(', ')})` : '',
    ...(k.buy || []).map(b => b.kind === 'tag' ? `bought ${b.name} (${b.trait})` : `bought ${b.kind === 'trait' ? 'the trait ' + b.name : (b.kind === 'key' ? R.KY : R.SC)[b.name]?.name || b.name}`),
    ...(k.off || []).map(o => `bought off ${R.KY[o]?.name || o}`)].filter(Boolean).join('; ');
}
const STEP_NAME = { name: 'character', traits: 'traits and tags', keys: 'keys', secrets: 'secrets', cond: 'conditions', done: 'all done', adv: 'advancement' };
const ORDER = ['name', 'traits', 'keys', 'secrets', 'cond', 'done', 'adv'];
const STEP_RULE = { name: 'lb-pc-lady', traits: 'lb-dice', keys: 'lb-keys', secrets: 'lb-new-keys', cond: 'lb-conditions', done: 'lb-sheet-blank', adv: 'lb-advances' };
const STEP_SHEET = { name: '.nm', traits: '.l-traits', keys: '.l-keys', secrets: '.l-secrets', cond: '.l-cond', done: '.budget', adv: '.budget' };
const BIW = 880, BGAP = 40, BREG = { x: 30, y: 950, w: 440, h: 320 }, BINNER = { w: 5500, h: 5500 * 320 / 440 };
// how much each step holds (its share of the builder); the engine splits the builder into golden cells by these
const BAREA = { name: 1.0, traits: 3.4, keys: 1.7, secrets: 1.5, cond: 0.6, done: 0.45, adv: 2.6 };
const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);
const TOKEN_FILES = window.TOKEN_FILES || {};

// what is chosen for the next roll (not saved: it is the hand you are about to throw)
const lbSel = {}; const selOf = pc => lbSel[pc.id] || (lbSel[pc.id] = { trait: null, tags: [], pool: 0, diff: 3 });
const lbTab = {};   // the advancement step's open list: tag | trait | key | secret
const scene = {};   // who is in the scene (the round card): pc id → false when out
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function stepHead(S, key, no, title, rule) {
  const sub = key === 'adv' || key === 'done' ? `${plural(S.unspent, 'advance')} unspent · ${S.xp} XP` : `pool ${S.pool}`;
  return `<div class="q"><span class="no">${no}</span><h3>${title}</h3>${rule && printIndex[rule] ? `<span class="chip" data-go="${rule}">p.${printIndex[rule].page}</span>` : ''}<span class="sub">${sub}</span></div>`;
}
function stepHtml(pc, S, key) {
  const ch = choicesOf(pc);
  const optB = (attrs, on, title, eff, cost, dis) => `<button class="opt${on ? ' sel' : ''}" ${attrs} data-pc="${pc.id}" aria-pressed="${!!on}"${dis ? ' disabled' : ''}><b>${esc(title)}${cost != null ? `<em>${esc(cost)}</em>` : ''}</b><span>${esc(eff || '')}</span></button>`;
  let h = `<div class="bstep" data-id="b-${pc.id}-${key}">`;
  if (key === 'name') {
    h += `${stepHead(S, 'name', '1', 'Pick a character', STEP_RULE.name)}<div class="hint">Take one of the book’s five as printed, or start blank and build to their shape.</div>
      <input data-act="name" data-pc="${pc.id}" value="${esc(ch.name || '')}" placeholder="Name" aria-label="Name"><input data-act="player" data-pc="${pc.id}" value="${esc(pc.player || '')}" placeholder="Player" aria-label="Player name" style="margin:12px 0;font-size:24px"><div class="opts">`;
    R.PRE.forEach(p => h += optB(`data-act="lbpick" data-v="${p.id}"`, ch.pre === p.id, p.name, p.role, 'p.' + p.page));
    h += optB('data-act="lbpick" data-v=""', !ch.pre, 'Start blank', 'No traits, keys or secrets yet; pool of 7.') + `</div>`;
  }
  if (key === 'traits') {
    h += `${stepHead(S, 'traits', '2', 'Traits and tags', STEP_RULE.traits)}<div class="hint">A trait adds a die when it helps; each tag that applies adds one more. Greyed tags are the book’s bracketed ones: an advance each.</div><div class="rows one">`;
    const own = Object.keys(ch.traits || {});
    own.forEach(n => { const t = R.TR[n], have = ch.traits[n], all = t ? [...t.tags, ...t.locked] : have;
      h += `<div class="row on lbtrow"><div><b>${esc(n)}${t?.note ? ` <small>(${esc(t.note)})</small>` : ''}</b><div class="lbtags">${[...new Set([...all, ...have])].map(tag => { const on = have.includes(tag);
        return `<button class="lbt${on ? ' sel' : ''}${!on && t?.locked.includes(tag) ? ' lk' : ''}" data-act="toggle" data-pc="${pc.id}" data-path="traits.${esc(n)}" data-v="${esc(tag)}" aria-pressed="${on}">${esc(tag)}</button>`; }).join('')}</div></div>
        <button class="opt" data-act="lbtrait" data-pc="${pc.id}" data-v="${esc(n)}" aria-label="Remove ${esc(n)}"><b>Remove</b></button></div>`; });
    if (!own.length) h += `<div class="crease">No traits yet: add one below</div>`;
    h += `</div><div class="grouph"><span>Add a trait</span><span>from the five, or the book’s new ones</span></div><div class="opts">`;
    R.TRAITS.filter(t => !own.includes(t.name)).forEach(t => h += optB(`data-act="lbtrait" data-v="${esc(t.name)}"`, false, t.name, t.who ? `${R.PRE_BY[t.who].name}’s` : 'new trait', null));
    h += `</div>`;
  }
  if (key === 'keys') {
    h += `${stepHead(S, 'keys', '3', 'Keys', STEP_RULE.keys)}<div class="hint">Keys are how a character earns XP or pool dice. Never the same key twice.</div><div class="opts">`;
    const mine = ch.keys || [], names = mine.map(k => R.KY[k]?.name);
    [...mine.map(k => R.KY[k]).filter(Boolean), ...R.KEYS.filter(k => !mine.includes(k.id))].forEach(k => { const on = mine.includes(k.id), dupe = !on && names.includes(k.name);
      h += optB(`data-act="toggle" data-path="keys" data-v="${k.id}"`, on, k.name, k.hit, k.who ? R.PRE_BY[k.who].name : 'new', dupe); });
    h += `</div>`;
  }
  if (key === 'secrets') {
    h += `${stepHead(S, 'secrets', '4', 'Secrets', STEP_RULE.secrets)}<div class="hint">Special abilities. Some work once a session until a refresh. New ones need the means to learn them.</div><div class="opts">`;
    const mine = ch.secrets || [];
    [...mine.map(s => R.SC[s]).filter(Boolean), ...R.SECRETS.filter(s => !mine.includes(s.id))].forEach(s => h += optB(`data-act="toggle" data-path="secrets" data-v="${s.id}"`, mine.includes(s.id), s.name, s.does + (s.needs ? ` Needs: ${s.needs}` : ''), s.once ? 'once a session' : null));
    h += `</div>`;
  }
  if (key === 'cond') {
    h += `${stepHead(S, 'cond', '5', 'Conditions', STEP_RULE.cond)}<div class="hint">The book’s five start with none. Mark one when it happens, and say how.</div><div class="opts">`;
    R.CONDITIONS.forEach(c => h += optB(`data-act="toggle" data-path="cond" data-v="${c.id}"`, (ch.cond || []).includes(c.id), c.name, c.note || ''));
    h += `</div>`;
  }
  if (key === 'adv') {
    // keys earn XP (rules: 1 per hit, 2 when the key leads you into danger); 5 XP = an advance; a buyoff = two
    const n = advSession(), tab = lbTab[pc.id] || 'tag', can = S.unspent > 0;
    h += `${stepHead(S, 'adv', '★', 'Advancement', STEP_RULE.adv)}<div class="hint">Hit a key: take 1 XP or 1 pool die (press twice when the key led you into danger). Every 5 XP is an advance; a buyoff drops the key for two. Filed under S${n}.</div>
      <div class="karmabar"><span>${S.xp} XP · ${S.xpIn} of 5 toward the next</span><span class="e">${plural(S.earned, 'advance')} earned, ${S.spent} spent, ${S.unspent} to spend</span></div><div class="rows one">`;
    S.keys.forEach(k => { const K = R.KY[k]; if (!K) return;
      h += `<div class="row on"><div><b>${esc(K.name)}</b><span>${esc(K.hit)}</span></div><div class="lbhits"><button class="opt" data-act="lbhit" data-pc="${pc.id}" data-key="${k}" data-as="xp" aria-label="${esc(K.name)}: take 1 XP"><b>+1 XP<em>${S.hits[k] || 0}</em></b></button><button class="opt" data-act="lbhit" data-pc="${pc.id}" data-key="${k}" data-as="die" aria-label="${esc(K.name)}: take a pool die" ${S.pool >= R.POOL_MAX ? 'disabled' : ''}><b>+1 die</b></button><button class="opt" data-act="lbbuyoff" data-pc="${pc.id}" data-key="${k}" aria-label="Buy off ${esc(K.name)}"><b>Buy off<em>+2</em></b><span>${esc(K.off)}</span></button></div></div>`; });
    h += `</div><div class="grouph"><span>Spend an advance</span><span>${can ? plural(S.unspent, 'advance') + ' to spend' : 'none to spend yet'}</span></div><div class="seg era">${[['tag', 'A tag'], ['trait', 'A trait'], ['key', 'A key'], ['secret', 'A secret']].map(([k, l]) => `<button class="${tab === k ? 'sel' : ''}" data-lb="tab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div><div class="opts">`;
    const buy = (kind, v, title, eff, extra = '') => optB(`data-act="lbbuy" data-kind="${kind}" data-v="${esc(v)}" ${extra}`, false, title, eff, '1 advance', !can);
    if (tab === 'tag') Object.values(S.traits).forEach(t => { const T = R.TR[t.name]; (T ? [...T.tags, ...T.locked] : []).filter(x => !t.tags.includes(x)).forEach(x => h += buy('tag', x, x, `tag for ${t.name}`, `data-trait="${esc(t.name)}"`)); });
    if (tab === 'trait') R.TRAITS.filter(t => !S.traits[t.name]).forEach(t => h += buy('trait', t.name, t.name, 'comes with no tags'));
    if (tab === 'key') { const names = S.keys.map(k => R.KY[k]?.name); R.KEYS.filter(k => !names.includes(k.name)).forEach(k => h += buy('key', k.id, k.name, k.hit)); }
    if (tab === 'secret') R.SECRETS.filter(s => !S.secrets.includes(s.id)).forEach(s => h += buy('secret', s.id, s.name, s.needs ? `Needs: ${s.needs}` : s.does));
    h += `</div>`;
    const past = karmaOf(pc).filter(k => advanceText(k));
    if (past.length) h += `<div class="grouph"><span>So far</span></div><div class="rows one">` + past.map(k => `<div class="row on"><div><b>S${k.s}</b><span>${esc(advanceText(k))}</span></div></div>`).join('') + `</div>`;
  }
  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3></div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? 'Ready to play' : 'Not ready yet'}</b><div>${plural(Object.keys(S.traits).length, 'trait')} · ${plural(S.keys.length, 'key')} · ${plural(S.secrets.length, 'secret')} · pool ${S.pool}</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves.</span></button>`;
  }
  return h + '</div>';
}

// rolls: d6s, 4+ is a hit; pass when the hits reach the difficulty
function rollHtml(r) {
  const dice = r.dice || [];
  return `<div class="roll"><b>${esc(r.label || 'Roll')}</b><span class="tn">${plural(dice.length, 'die').replace('dies', 'dice')} vs ${r.diff} (${esc(R.levelName(r.diff))})</span><span class="dd">${dice.map(d => `<i class="${d.ok ? 'ok' : ''}">${d.v}</i>`).join('')}</span><span class="verdict${r.ok ? '' : ' fail'}">${r.ok ? 'Pass' : 'Fail'} · ${plural(r.hits ?? 0, 'hit')}</span>${r.note ? `<span class="tn">${esc(r.note)}</span>` : ''}</div>`;
}
function pushRoll(pc, rec, at) { const k = pc ? pc.id : '_free'; (state.rolls[k] = state.rolls[k] || []).unshift(rec); state.rolls[k] = state.rolls[k].slice(0, 8); persist(); toast(rec, at); logPush({ kind: 'roll', who: pc ? pc.id : 'gm', rec }); }
function dicePlan(pc, S) {
  const sel = selOf(pc), t = sel.trait && S.traits[sel.trait] ? 1 : 0, tags = sel.tags.filter(x => S.traits[x.split('|')[0]]?.tags.includes(x.split('|')[1]));
  const pool = Math.min(sel.pool, S.pool), traitsUsed = new Set(tags.map(x => x.split('|')[0]));
  return { n: 1 + t + tags.length + pool, t, tags, pool, diff: sel.diff, multi: traitsUsed.size > 1 };
}
function rollSheet(pc, at) {
  const ch = choicesOf(pc), S = sheetOf(pc), d = dicePlan(pc, S), r = R.roll(d.n, d.diff);
  const what = [d.t ? selOf(pc).trait : null, ...d.tags.map(x => x.split('|')[1])].filter(Boolean).join(' + ') || 'no trait';
  const before = S.pool; ch.pool = R.poolAfter(S.pool, d.pool, r.ok);
  const note = r.ok ? (d.pool ? `${plural(d.pool, 'pool die').replace('dies', 'dice')} spent; pool ${before} → ${ch.pool}` : `pool stays ${ch.pool}`) : `pool dice kept, +1: pool ${before} → ${ch.pool}. The GM escalates.`;
  const rec = { label: `${ch.name || WORDS.Char} · ${what}`, dice: r.dice, hits: r.hits, diff: r.diff, ok: r.ok, note: d.multi ? note + ' (tags from two traits: Secret of Experience)' : note };
  historyNote(`${ch.name || WORDS.Char} rolled ${what}: ${r.ok ? 'pass' : 'fail'}, pool ${before} → ${ch.pool}`);
  selOf(pc).pool = 0; pushRoll(pc, rec, at); renderSheet(pc);
}
function freeRoll(n, label = 'Free roll', at, diff = 3) { const r = R.roll(n, diff); pushRoll(null, { label, dice: r.dice, hits: r.hits, diff, ok: r.ok }, at); renderTable(); }

// portraits: no fantasy figures in the Turnip Works set yet; the nearest close-ups by role, or drop your own
const PRE_TOKEN = { lady: ['mage-human-f', 'shaman-human-f', 'face-human-f'], naomi: ['street-samurai-ork-f', 'street-samurai-elf-f', 'merc-troll-f'], cyrus: ['street-samurai-human-m', 'merc-dwarf-m', 'face-ork-m'],
  kale: ['adept-human-m', 'decker-dwarf-m', 'technomancer-human-m'], snargle: ['rigger-ork-m', 'rigger-dwarf-f', 'rigger-human-m'] };
function portraitOf(pc, S) {
  const ch = choicesOf(pc), pick = PRE_TOKEN[ch.pre] || ['face-human-f', 'adept-elf-f', 'merc-ork-m'];
  const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
  const options = [...pick, ...Object.keys(TOKEN_FILES).filter(k => !k.startsWith('modern-') && !pick.includes(k))].slice(0, 4).map(k => close(TOKEN_FILES[k])).filter(Boolean);
  return { src: close(state.portraits[pc.id] || options[0] || ''), options };
}

function renderSheet(pc) {
  const box = sheetEls[pc.id], ch = choicesOf(pc), S = sheetOf(pc), asOf = state.asof[pc.id] ?? 99, sel = selOf(pc), plan = dicePlan(pc, S);
  const nm = ch.name || `New ${WORDS.char}`, who = S.pre ? S.pre.role : (Object.keys(S.traits).join(' · ') || 'Not built yet');
  const prev = box._prev || {};
  const pv = (key, v, cls = '', suffix = '') => `<span class="pv ${cls}${prev[key] != null && prev[key] !== v ? ' changed' : ''}" data-prov="${esc(key)}" tabindex="0">${v}${suffix}</span>`;
  const chip = (id, lab) => printIndex[id] ? `<span class="chip" data-go="${id}">${lab || 'p.' + printIndex[id].page}</span>` : '';
  const has = new Set(karmaOf(pc).map(k => k.s));
  const asofBtns = ['Start', ...C.sessions.map(s => 'S' + s.n), 'Now'].map((lab, i) => { const val = lab === 'Now' ? 99 : i; const on = asOf === val; return `<button data-act="asof" data-pc="${pc.id}" data-v="${val}" class="${on ? 'on' : ''}${has.has(i) ? ' has' : ''}" aria-pressed="${on}">${lab}</button>`; }).join('');
  const traitBlocks = Object.values(S.traits).map(t => { const T = R.TR[t.name], on = sel.trait === t.name, locked = (T?.locked || []).filter(x => !t.tags.includes(x));
    return `<div class="lbtrait${on ? ' on' : ''}"><div class="lbth"><button class="lbt big${on ? ' sel' : ''}" data-lb="trait" data-pc="${pc.id}" data-v="${esc(t.name)}" aria-pressed="${on}">${esc(t.name)}</button><span class="k" data-rule-of="t:${esc(t.name)}" role="link" tabindex="0">${T ? 'p.' + (printIndex[T.src]?.page ?? '') : 'rule'}</span>${pv('t:' + t.name, t.tags.length, 'mid')}</div>
      <div class="lbtags">${t.tags.map(x => { const k = t.name + '|' + x, s2 = sel.tags.includes(k); return `<button class="lbt${s2 ? ' sel' : ''}${t.bought.includes(x) ? ' new' : ''}" data-lb="tag" data-pc="${pc.id}" data-v="${esc(k)}" aria-pressed="${s2}">${esc(x)}</button>`; }).join('')}${locked.map(x => `<span class="lbt lk" title="Not owned yet: an advance">[${esc(x)}]</span>`).join('')}</div></div>`; }).join('');
  const keyRows = S.keys.map(k => { const K = R.KY[k]; if (!K) return ''; return `<div class="lbkey"><div class="lbkh"><span class="k" data-rule-of="k:${k}" role="link" tabindex="0">${esc(K.name)}</span>${pv('k:' + k, S.hits[k] || 0, 'mid', ' XP')}</div><div class="e">${esc(K.hit)}</div><div class="e off">Buyoff: ${esc(K.off)}</div>
      <div class="lbhits"><button class="btn" data-act="lbhit" data-pc="${pc.id}" data-key="${k}" data-as="xp" aria-label="${esc(K.name)}: take 1 XP">Hit: +1 XP <b class="cnt">${S.hits[k] || 0}</b></button><button class="btn" data-act="lbhit" data-pc="${pc.id}" data-key="${k}" data-as="die" aria-label="${esc(K.name)}: take a pool die" ${S.pool >= R.POOL_MAX ? 'disabled' : ''}>Hit: +1 pool die</button></div></div>`; }).join('');
  const secretRows = S.secrets.map(s => { const X = R.SC[s]; if (!X) return ''; const used = S.used.includes(s);
    return `<div class="lbsec"><span class="k" data-rule-of="s:${s}" role="link" tabindex="0">${esc(X.name)}</span>${X.once ? `<button class="lbt${used ? ' sel' : ''}" data-act="toggle" data-pc="${pc.id}" data-path="used" data-v="${s}" aria-pressed="${used}">${used ? 'used this session' : 'once a session: mark used'}</button>` : ''}<div class="e">${esc(X.does)}</div></div>`; }).join('');
  const condBtns = R.CONDITIONS.map(c => { const on = S.cond.includes(c.id); return `<button class="lbt${on ? ' sel' : ''}" data-act="toggle" data-pc="${pc.id}" data-path="cond" data-v="${c.id}" aria-pressed="${on}">${c.name}</button>`; }).join('');
  const tok = portraitOf(pc, S);
  const diffSeg = R.LEVELS.map(l => `<button class="${sel.diff === l.n ? 'sel' : ''}" data-lb="diff" data-pc="${pc.id}" data-v="${l.n}" aria-pressed="${sel.diff === l.n}">${l.name} ${l.n}</button>`).join('');
  box.innerHTML = `
    <div class="main">
    <section class="sA">
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget">
        <div><div class="k">Pool ${chip(P.refresh)}</div><div class="bv">${pv('pool', S.pool)} <span class="tn">/ ${R.POOL_MAX}</span></div><div class="bar"><i style="width:${S.pool / R.POOL_MAX * 100}%"></i></div></div>
        <div><div class="k">Experience ${chip(P.keys)}</div><div class="bv">${pv('xp', S.xp)} <span class="tn">${S.xpIn} of 5</span></div><div class="bar"><i style="width:${S.xpIn / 5 * 100}%"></i></div></div>
        <div class="${S.unspent < 0 ? 'over' : ''}"><div class="k">Advances ${chip(P.adv)}</div><div class="bv">${pv('adv', S.unspent)} <span class="tn">${S.spent} spent</span></div><div class="bar"><i style="width:${Math.min(100, S.unspent * 25)}%"></i></div></div>
      </div>
      <div class="lbact"><button class="btn" data-act="lbrefresh" data-pc="${pc.id}" aria-label="Refreshment scene">Refreshment scene: pool to 7</button></div>
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
    </section>
    <section class="sB">
      <h4>Traits ${chip(P.dice)} ${chip(P.brackets, 'brackets')}</h4>
      <div class="l-traits lbtraits${Object.keys(S.traits).length <= 2 ? ' few' : ''}">${traitBlocks || '<div class="none">No traits yet: open the builder.</div>'}</div>
    </section>
    <section class="sP">
      <div class="portrait closeup" data-portrait="${pc.id}" title="Drop an image here, or pick a figure below"><img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span></div>
      <div class="tokens">${tok.options.map(o => `<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this figure"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
    </section>
    <section class="sD">
      <h4>Roll ${chip(P.dice)} ${chip(P.levels, 'levels')}</h4>
      <div class="lbplan"><span>1 die</span><span>+ ${plan.t} trait</span><span>+ ${plural(plan.tags.length, 'tag')}</span><span>+ pool</span><span class="stepper"><button data-lb="pool" data-pc="${pc.id}" data-d="-1" ${sel.pool <= 0 ? 'disabled' : ''} aria-label="Fewer pool dice">−</button><output>${Math.min(sel.pool, S.pool)}</output><button data-lb="pool" data-pc="${pc.id}" data-d="1" ${sel.pool >= S.pool ? 'disabled' : ''} aria-label="More pool dice">+</button></span><b>= ${plan.n} dice</b></div>
      <div class="lbrow"><div class="seg">${diffSeg}</div><button class="die wide" data-act="roll" data-pc="${pc.id}" data-label="sheet roll" aria-label="Roll ${plan.n} dice">⚄ Roll ${plan.n} dice</button><button class="btn quiet" data-lb="clear" data-pc="${pc.id}">Clear</button></div>
      <div class="lbrow l-cond"><span class="k">Conditions ${chip(P.cond)}</span>${condBtns}</div>
      <div class="rolls">${(state.rolls[pc.id] || []).slice(0, 2).map(rollHtml).join('') || '<div class="none">Pick a trait and its tags on the right, set the pool dice, then roll.</div>'}</div>
    </section>
    <section class="sL">
      <h4>Secrets</h4><div class="l-secrets lbsecs">${secretRows || '<div class="none">No secrets yet</div>'}</div>
    </section>
    <section class="sC tall">
      <h4>Keys ${chip(P.keys)} ${chip(P.buyoff, 'buyoff')}</h4>
      <div class="l-keys lbkeys">${keyRows || '<div class="none">No keys yet</div>'}</div>
    </section>
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl blbl'); bl.innerHTML = 'CHARACTER<br>BUILDER'; bl.style.fontSize = '64px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 64, over: true });
  if (!Object.keys(S.traits).length && !state.done[pc.id]) box.querySelector('.builder').classList.add('todo');
  box._prev = { pool: S.pool, xp: S.xp, adv: S.unspent, ...Object.fromEntries(Object.values(S.traits).map(t => ['t:' + t.name, t.tags.length])), ...Object.fromEntries(S.keys.map(k => ['k:' + k, S.hits[k] || 0])) };
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  fitSections(box);
  renderQuick(); dirty = true;
}
function box_who(pc) { const S = sheetOf(pc); sheetEls[pc.id].querySelector('.who').textContent = `${S.pre ? S.pre.role : (Object.keys(S.traits).join(' · ') || 'Not built yet')} · played by ${pc.player || '—'}`; }

// no initiative in Lady Blackbird: the round card is who is in the scene; the GM moves the spotlight (INTERP)
function initiative() { return PCS.filter(pc => choicesOf(pc).name && scene[pc.id] !== false).map(pc => ({ pc, S: sheetOf(pc) })); }
const qdice2 = { n: 4, diff: 3 };
function trayStep(k, d) { if (k === 'n') qdice2.n = Math.max(1, Math.min(20, qdice2.n + d)); else qdice2.diff = Math.max(1, Math.min(8, qdice2.diff + d)); }
function trayRoll(el) { freeRoll(qdice2.n, `${qdice2.n} dice vs ${qdice2.diff}`, el, qdice2.diff); }
function tstep2(k) { return `<span class="stepper"><button data-ts="${k}" data-d="-1" aria-label="Lower">−</button><output>${qdice2[k]}</output><button data-ts="${k}" data-d="1" aria-label="Raise">+</button></span>`; }
function renderTable() {
  const all = PCS.filter(pc => choicesOf(pc).name), o = initiative(); if (turn.at >= o.length) turn.at = 0;
  roundCard.innerHTML = `<div class="fit"><h3>In the scene ${printIndex[P.sayYes] ? `<span class="chip" data-go="${P.sayYes}">p.${printIndex[P.sayYes].page}</span>` : ''}</h3><div class="t">No initiative in this game: whoever the fiction points at acts. Tap a name to step them in or out of the scene.</div>
    <div class="rmeta">${plural(o.length, 'character')} in the scene <button class="tb" data-turn="next">Spotlight ›</button></div>
    <ol class="init">${all.map(pc => { const S = sheetOf(pc), tok = portraitOf(pc, S).src, inn = scene[pc.id] !== false, i = o.findIndex(x => x.pc === pc);
      return `<li class="${inn && i === turn.at ? 'on' : ''}${inn ? '' : ' out'}"><span class="closeup rimg"><img src="${tok}" alt="" draggable="false"></span><span class="who2" data-go="${pc.id}">${esc(choicesOf(pc).name)}</span><span class="nums">pool ${S.pool} · ${S.cond.map(c => R.COND[c]?.name).filter(Boolean).join(', ') || 'no conditions'}</span><button class="tb" data-lb="scene" data-pc="${pc.id}">${inn ? 'In' : 'Out'}</button></li>`; }).join('')}</ol></div>`; fitCard(roundCard);
  diceCard.innerHTML = `<div class="fit"><h3>Dice tray ${printIndex[P.dice] ? `<span class="chip" data-go="${P.dice}">p.${printIndex[P.dice].page}</span>` : ''}</h3><div class="t">d6s; each 4, 5 or 6 is a hit. Pass when the hits reach the difficulty: 2 easy, 3 difficult, 4 challenging, 5 extreme.</div>
    <div class="qdice"><label>Dice ${tstep2('n')}</label><label>Difficulty ${tstep2('diff')}</label><button class="tb go" data-troll="1">Roll ${qdice2.n}d6</button></div>
    <div class="rolls">${[...(state.rolls._free || [])].slice(0, 5).map(rollHtml).join('') || '<div class="none">No rolls yet.</div>'}</div></div>`; fitCard(diceCard);
}
function rigCommands(q, ws, nums, pcw) {
  const out = [];
  const traitWord = w => w.length >= 3 && (pcw ? Object.keys(sheetOf(pcw).traits) : []).find(n => n.toLowerCase().replace(/[^a-z]/g, '').startsWith(w.replace(/[^a-z]/g, '')));
  const tw = pcw && ws.map(traitWord).find(Boolean);
  if (pcw && tw) out.push({ k: 'cmd', t: `Ready ${choicesOf(pcw).name}’s ${tw} for a roll`, run: () => { const s = selOf(pcw); s.trait = tw; s.tags = []; renderSheet(pcw); flyTo(pcw.id); } });
  if ((ws[0] === 'roll' || ws[0] === 'r') && nums.length) { const d = nums[1] || 3; out.push({ k: 'cmd', t: `Roll ${nums[0]} dice vs ${d}`, run: () => freeRoll(nums[0], `${nums[0]} dice vs ${d}`, qb, d) }); }
  if (ws[0] === 'refresh' && pcw) out.push({ k: 'cmd', t: `Refreshment scene for ${choicesOf(pcw).name}: pool to 7`, run: () => { pushUndo(); doRefresh(pcw); } });
  const cw = pcw && ws.map(w => R.CONDITIONS.find(c => c.id === w)).find(Boolean);
  if (cw) out.push({ k: 'cmd', t: `${(sheetOf(pcw).cond.includes(cw.id) ? 'Clear' : 'Mark')} ${cw.name} on ${choicesOf(pcw).name}`, run: () => { pushUndo(); const ch = choicesOf(pcw); ch.cond = ch.cond || []; ch.cond = ch.cond.includes(cw.id) ? ch.cond.filter(x => x !== cw.id) : [...ch.cond, cw.id]; historyNote(`${ch.name}: ${cw.name}`); persist(); renderSheet(pcw); } });
  return out;
}
function doRefresh(pc) { const ch = choicesOf(pc), S = sheetOf(pc), before = S.pool; ch.pool = Math.max(S.pool, R.POOL_START); ch.used = [];
  historyNote(`${ch.name || WORDS.Char}: refreshment scene, pool ${before} → ${ch.pool}`); toast({ msg: `${ch.name || WORDS.Char} refreshed`, note: `pool ${before} → ${ch.pool}; once-a-session secrets back` }); persist(); renderSheet(pc); }
// choosing what to roll: these taps are not changes to the character, so they skip the history and undo (they are
// handled here, after the engine's capture listeners, so a drag that moved still never presses them)
document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-lb]'); if (!b || b.disabled) return; const pc = pcById[b.dataset.pc]; if (!pc) return;
  const s = selOf(pc), v = b.dataset.v, k = b.dataset.lb, S = sheetOf(pc);
  if (k === 'trait') { s.trait = s.trait === v ? null : v; if (!S.secrets.includes('experience')) s.tags = s.tags.filter(x => x.startsWith(s.trait + '|')); }
  else if (k === 'tag') { const tr = v.split('|')[0], tag = v.split('|')[1];
    if (s.tags.includes(v)) s.tags = s.tags.filter(x => x !== v);
    else { if (s.trait !== tr && !S.secrets.includes('experience')) s.tags = []; if (!s.trait || !S.secrets.includes('experience')) s.trait = tr;
      if (R.TR[tr]?.note && / spell$/i.test(tag)) s.tags = s.tags.filter(x => !(x.startsWith(tr + '|') && / spell$/i.test(x)));   // Petty Magic: one spell at a time
      s.tags.push(v); } }
  else if (k === 'pool') s.pool = Math.max(0, Math.min(S.pool, s.pool + +b.dataset.d));
  else if (k === 'diff') s.diff = +v;
  else if (k === 'clear') lbSel[pc.id] = { trait: null, tags: [], pool: 0, diff: s.diff };
  else if (k === 'tab') lbTab[pc.id] = v;
  else if (k === 'scene') { scene[pc.id] = scene[pc.id] === false; renderTable(); return; }
  renderSheet(pc);
});
function rigAct(act, a, pc, ch) {
  if (act === 'roll') { rollSheet(pc, a); return true; }
  if (act === 'lbpick') { const id = a.dataset.v, keep = ch.name && !R.PRE.some(p => p.name === ch.name) ? ch.name : null; Object.keys(ch).forEach(k => delete ch[k]); Object.assign(ch, id ? R.pregen(id) : R.blank(keep || '')); if (keep && id) ch.name = keep;
    delete lbSel[pc.id]; persist(); renderSheet(pc); box_who(pc); return true; }
  if (act === 'lbtrait') { const n = a.dataset.v; ch.traits = ch.traits || {}; if (ch.traits[n]) delete ch.traits[n]; else ch.traits[n] = []; persist(); renderSheet(pc); return true; }
  if (act === 'lbrefresh') { doRefresh(pc); return true; }
  if (act === 'lbhit') {
    const k = a.dataset.key, K = R.KY[k], n = advSession();
    if (a.dataset.as === 'die') { const S = sheetOf(pc); ch.pool = Math.min(R.POOL_MAX, S.pool + 1); toast({ msg: `${ch.name}: ${K.name}`, note: `pool ${S.pool} → ${ch.pool}` }, a); persist(); renderSheet(pc); return true; }
    const e = advEntry(pc, n), x = (e.xp = e.xp || []).find(h => h.key === k); if (x) x.n++; else e.xp.push({ key: k, n: 1 });
    const S = sheetOf(pc); toast({ msg: `${ch.name}: ${K.name}`, note: `+1 XP (${S.xp} in all${S.xpIn === 0 ? ': a new advance' : ''}), filed under S${n}` }, a);
    logPush({ kind: 'note', who: pc.id, text: `hit ${K.name}: +1 XP` }); refreshAdv(pc, n); return true; }
  if (act === 'lbbuy') {
    const S = sheetOf(pc); if (S.unspent < 1) return true; const n = advSession(), e = advEntry(pc, n), kind = a.dataset.kind, v = a.dataset.v;
    (e.buy = e.buy || []).push(kind === 'tag' ? { kind, trait: a.dataset.trait, name: v } : { kind, name: v });
    const what = kind === 'tag' ? `${v} (${a.dataset.trait})` : kind === 'trait' ? `the trait ${v}` : (kind === 'key' ? R.KY : R.SC)[v]?.name;
    historyNote(`${ch.name}: advance spent on ${what}`); logPush({ kind: 'note', who: pc.id, text: `advance: ${what}` }); refreshAdv(pc, n); return true; }
  if (act === 'lbbuyoff') { const n = advSession(), e = advEntry(pc, n), k = a.dataset.key; (e.off = e.off || []).push(k);
    historyNote(`${ch.name}: bought off ${R.KY[k]?.name}, two advances`); logPush({ kind: 'note', who: pc.id, text: `bought off ${R.KY[k]?.name}: +2 advances` }); refreshAdv(pc, n); return true; }
  return false;
}
