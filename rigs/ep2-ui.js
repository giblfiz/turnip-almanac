// Eclipse Phase 2e: the rule-specific half of the app. Inserted by build.sh at /*@RIG-UI@*/ inside the app's scope.
// Contract (what the engine calls): WORDS, RIG_NO_UNDO, advanceText, STEP_NAME, ORDER, STEP_RULE, STEP_SHEET, BAREA,
// BREG, BINNER, BK_K, stepHtml, renderSheet, rollHtml, portraitOf, initiative, renderTable, freeRoll, qdice2,
// trayStep, trayRoll, rigCommands, rigAct, box_who.
// The ego/morph split is the heart: the sheet shows the ego (aptitudes, skills, rep, traits, muse, Flex) apart from the
// morph worn now (pools, Durability, wounds, traits, ware). Owned morphs sit beside it with a Resleeve control; a
// resleeve is filed under the latest session, so the sheet and the face (the book's picture of that morph, cut from the
// reader's copy) follow it, and As of shows the body worn at each session.
const WORDS = { xp: 'Rez', xpVerb: 'Rez and resleeving', char: 'agent', Char: 'Agent', party: 'The Firewall team',
  quickHint: 'Jump or do: vesna infosec, roll 55, rez vesna 2, resleeve vesna, initiative, new agent…',
  helpCommands: '<i>vesna infosec</i>, <i>vesna cog check</i>, <i>roll 55</i>, <i>roll 2d10</i>, <i>rez vesna 2</i>, <i>resleeve vesna</i>, <i>hit vesna 8</i>, <i>stress vesna 4</i>, <i>initiative</i>, <i>new agent</i>' };
const RIG_NO_UNDO = new Set(['roll', 'ep2flip']);
const P = R.P;
const TOKEN_FILES = window.TOKEN_FILES || {};
const AP = R.APT, APN = R.APT_NAME, PN = R.POOL_NAME;
const sgn = n => (n >= 0 ? '+' : '−') + Math.abs(n);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function advanceText(k) {
  const buy = (k.buy || []).map(b => b.k === 'skill' ? `${R.skillName(b.key)} +${b.n}` : b.k === 'apt' ? `${APN[b.key]} +${b.n}` : b.k === 'rep' ? `${R.REP[b.key]?.tag || b.key} +${b.n}` : b.k === 'flex' ? `Flex +${b.n}`
    : b.k === 'sleight' ? `sleight: ${R.SLEIGHT[b.key]?.name || b.key}` : b.k === 'trait' ? `trait: ${R.TRAIT[b.key]?.name || b.key}` : b.k === 'lang' ? `language: ${b.name}` : b.k === 'spec' ? `specialisation: ${R.skillName(b.key)} (${b.name})` : b.k);
  return [k.rez ? `${k.rez} Rez` : '', ...buy, ...[].concat(k.gain || []).map(g => `new morph: ${R.MORPH[g.id]?.name || g.id}`), k.sleeve ? `resleeved into ${k.sleeveName || k.sleeve}` : ''].filter(Boolean).join('; ');
}
const STEP_NAME = { name: 'name and muse', bg: 'background', career: 'career', interest: 'interest', faction: 'faction', apt: 'aptitudes', skills: 'total skills', lang: 'languages', rep: 'reputation',
  traits: 'traits and psi', cp: 'customization', morph: 'morph and gear', motive: 'motivations', done: 'all done', adv: 'Rez and resleeving' };
const ORDER = ['name', 'bg', 'career', 'interest', 'faction', 'apt', 'skills', 'lang', 'rep', 'traits', 'cp', 'morph', 'motive', 'done', 'adv'];
const STEP_RULE = { name: P.overview, bg: P.bg, career: P.career, interest: P.interest, faction: P.faction, apt: P.tpl, skills: P.total, lang: P.lang, rep: P.repStep, traits: P.traits,
  cp: P.cp, morph: P.morphStep, motive: P.motive, done: P.derivedStep, adv: P.rez };
const STEP_SHEET = { name: '.nm', bg: '.who', career: '.who', interest: '.who', faction: '.who', apt: '.ep2aptg', skills: '.ep2skl', lang: '.ep2ex', rep: '.ep2rep', traits: '.ep2ex',
  cp: '.ep2budget', morph: '.ep2mo', motive: '.ep2ex', done: '.ep2budget', adv: '.ep2own' };
const BREG = { x: 30, y: 950, w: 534, h: 320 }, BINNER = { w: 5600, h: 5600 * 320 / 534 };
const BAREA = { name: 0.5, bg: 1.0, career: 1.4, interest: 1.2, faction: 0.8, apt: 1.0, skills: 2.6, lang: 0.6, rep: 0.7, traits: 2.6, cp: 0.9, morph: 3.2, motive: 1.0, done: 0.6, adv: 2.2 };
const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);

// what is not part of the character: the next test's modifier and pool boost, the open morph list, amounts being entered
const nextMod = {}, poolBoost = {}, tab = {}, amt = {}, initRoll = {}; let fightN = 0;
function liveOf(pc) { const L = state.live[pc.id] || (state.live[pc.id] = {}); L.m = L.m || {}; L.pool = L.pool || {}; L.stress = L.stress || 0; L.trauma = L.trauma || 0; L.ign = L.ign || { w: 0, t: 0 }; return L; }
const bodyOf = (L, S) => { const k = S.cur?.key || '_'; return L.m[k] || (L.m[k] = { dmg: 0, wounds: 0 }); };
// the penalty every test carries now: −10 a wound and −10 a trauma, less those a pool point is ignoring
function penalty(pc, S) { const L = liveOf(pc), B = bodyOf(L, S); const free = S.ware.some(w => /pain filter/i.test(w.name)) || S.egoTraits.some(x => x.id === 'pain-tolerance') ? 1 : 0, w = Math.max(0, B.wounds - L.ign.w - free), t = Math.max(0, L.trauma - L.ign.t); return { w, t, mod: -10 * (w + t) }; }
const poolFor = a => a === 'cog' || a === 'int' ? 'ins' : a === 'sav' || a === 'wil' ? 'mox' : 'vig';
const poolLeft = (pc, S, k) => Math.max(0, (S.pools[k] || 0) - (liveOf(pc).pool[k] || 0));

function stepHead(S, key, no, title, rule) {
  const sub = key === 'cp' || key === 'traits' || key === 'skills' || key === 'apt' || key === 'lang' ? `${S.cp.left} of ${S.cp.budget} CP left` : key === 'morph' ? `${S.mp.left} of ${S.mp.budget} MP left` : key === 'rep' ? `${S.repUsed} of ${S.repPool} rep placed`
    : key === 'adv' ? `${S.rez.left} of ${S.rez.earned} Rez left` : '';
  return `<div class="q"><span class="no">${no}</span><h3>${title}</h3>${rule && printIndex[rule] ? `<span class="chip" data-go="${rule}">p.${printIndex[rule].page}</span>` : ''}<span class="sub">${sub}</span></div>`;
}
const pkgLine = p => p.skills.map(e => `${e.choose ? e.choose.map(x => R.SK[x]?.name || x).join(' or ') : R.SK[e.skill]?.name || e.skill}${e.fields || e.field ? ': ' + (e.field || 'field') : ''} ${e.v}`).join(' · ');
function stepHtml(pc, S, key) {
  const ch = choicesOf(pc);
  const opt = (attrs, on, title, eff, cost, dis) => `<button class="opt${on ? ' sel' : ''}" ${attrs} data-pc="${pc.id}" aria-pressed="${!!on}"${dis ? ' disabled' : ''}><b>${esc(title)}${cost != null && cost !== '' ? `<em>${esc(cost)}</em>` : ''}</b><span>${esc(eff || '')}</span></button>`;
  const set = (path, v, cur, title, eff, cost) => opt(`data-act="set" data-path="${path}" data-v="${esc(v)}"`, cur === v, title, eff, cost);
  const tog = (path, v, on, title, eff, cost, max) => opt(`data-act="toggle" data-path="${path}" data-v="${esc(v)}"${max ? ` data-max="${max}"` : ''}`, on, title, eff, cost);
  const stp = (act, k, v, lab, dis = [false, false], d = 1) => `<div class="stepper"><button data-act="${act}" data-pc="${pc.id}" data-k="${esc(k)}" data-d="${-d}" ${dis[0] ? 'disabled' : ''} aria-label="Lower ${esc(lab)}">−</button><output>${v}</output><button data-act="${act}" data-pc="${pc.id}" data-k="${esc(k)}" data-d="${d}" ${dis[1] ? 'disabled' : ''} aria-label="Raise ${esc(lab)}">+</button></div>`;
  let h = `<div class="bstep" data-id="b-${pc.id}-${key}">`;
  if (key === 'name') h += `${stepHead(S, 'name', '0', 'Name and muse', STEP_RULE.name)}<div class="hint">The ego’s name, the player, and the muse: the agent’s own AI companion.</div><input data-act="name" data-pc="${pc.id}" value="${esc(ch.name || '')}" placeholder="Name" aria-label="Name"><input data-act="player" data-pc="${pc.id}" value="${esc(pc.player || '')}" placeholder="Player" aria-label="Player name" style="margin-top:12px;font-size:24px"><input data-ep2="muse" data-pc="${pc.id}" value="${esc(ch.muse || '')}" placeholder="Muse’s name" aria-label="Muse’s name" style="margin-top:12px;font-size:24px">`;
  if (key === 'bg' || key === 'career' || key === 'interest') {
    const no = { bg: '1', career: '2', interest: '3' }[key], title = { bg: 'Background', career: 'Career', interest: 'Interest' }[key], L = { bg: R.D.backgrounds, career: R.D.careers, interest: R.D.interests }[key];
    h += `${stepHead(S, key, no, title, STEP_RULE[key])}<div class="hint">${key === 'bg' ? 'Where the ego comes from: a package of skills.' : key === 'career' ? 'What the ego does: a package of skills, and the gear pack.' : 'A second focus: a smaller package.'} Fields and either/or picks are made below.</div><div class="opts">`;
    L.forEach(p => h += opt(`data-act="ep2pkg" data-k="${key}" data-v="${p.id}"`, ch[key] === p.id, p.name, pkgLine(p), p.psi ? 'needs Psi' : `p.${p.page}`));
    h += `</div>`;
    const chosen = R.pkgSkills(key, ch[key], ch).filter(x => x.entry.choose || x.needsField);
    chosen.forEach(x => { const e = x.entry, cur = R.fieldOf(x.key) || R.base(x.key);
      h += `<div class="grouph"><span>${esc(e.choose ? 'Either / or' : (R.SK[R.base(x.key)]?.name || 'Know') + ': field')} · ${e.v}</span></div><div class="seg era ep2wrap">`;
      if (e.choose) h += e.choose.map(c => `<button class="${R.base(x.key) === c ? 'sel' : ''}" data-act="ep2pick" data-pc="${pc.id}" data-k="${x.slot}" data-v="${c}" aria-pressed="${R.base(x.key) === c}">${esc(R.SK[c]?.name || c)}</button>`).join('');
      else h += [...new Set([...(e.fields || []), ...(e.field ? [e.field] : [])])].map(f => `<button class="${cur === f ? 'sel' : ''}" data-act="ep2field" data-pc="${pc.id}" data-k="${x.slot}" data-v="${esc(f)}" aria-pressed="${cur === f}">${esc(f)}</button>`).join('');
      h += `</div>`; });
  }
  if (key === 'faction') {
    h += `${stepHead(S, 'faction', '4', 'Faction', STEP_RULE.faction)}<div class="hint">Gives Know: [faction] 30 and the first motivation, +[Faction] Interests.</div><div class="opts three">`;
    R.D.factions.forEach(f => h += set('faction', f.id, ch.faction, f.name, `Know: ${f.name} 30`));
    h += set('faction', 'none', ch.faction, 'No faction', 'a third personal motivation instead') + `</div>`;
  }
  if (key === 'apt') {
    h += `${stepHead(S, 'apt', '5', 'Aptitude template', STEP_RULE.apt)}<div class="hint">Pick a template, then move points between aptitudes (what one gains another loses, 5–30), or buy points at 1 CP each.</div><div class="opts">`;
    R.D.templates.forEach(t => h += set('template', t.id, ch.template, t.name, AP.map(k => `${k.toUpperCase()} ${t.apt[k]}`).join(' · ')));
    h += `</div><div class="rows one" style="margin-top:10px">`;
    AP.forEach(k => { const sh = +(ch.shift?.[k] || 0), cp = +(ch.aptCP?.[k] || 0);
      h += `<div class="row${sh || cp ? ' on' : ''}" style="grid-template-columns:1fr auto auto"><div><b>${APN[k]} ${S.aptEgo[k]}</b><span>check ${S.aptEgo[k] * 3}${sh ? ` · moved ${sgn(sh)}` : ''}${cp ? ` · ${cp} CP` : ''}</span></div>${stp('ep2shift', k, sgn(sh), APN[k] + ' shift', [false, false], 5)}${stp('ep2aptcp', k, cp + ' CP', APN[k] + ' CP', [cp <= 0, false])}</div>`; });
    h += `</div>`;
  }
  if (key === 'skills') {
    h += `${stepHead(S, 'skills', '6', 'Total skills', STEP_RULE.skills)}<div class="hint">Package points plus the linked aptitude (Fray and Perceive count it twice). Buy more 5 points a CP; no skill above 80 at creation. Know skills: tap COG/INT to link one to Intuition.${S.overflow.all ? ` Package points over 80: ${S.overflow.all}, ${S.overflow.left} still to place (placed points use them before CP).` : ''}</div><div class="rows">`;
    const L = Object.values(S.skills).sort((a, b) => (b.pts > 0) - (a.pts > 0) || a.name.localeCompare(b.name));
    L.forEach(s => { const buy = +(ch.buy?.[s.key] || 0);
      h += `<div class="row${s.pts ? ' on' : ''}" style="grid-template-columns:1fr auto${s.know ? ' auto' : ''}"><div><b>${esc(s.name)} ${s.v}</b><span>${s.apt.toUpperCase()}${s.pts ? ` · ${s.pts} points` : ' · untrained: defaults to the aptitude'}${buy ? ` · ${buy} bought` : ''}</span></div>${s.know ? `<button class="btn" data-act="ep2knowint" data-pc="${pc.id}" data-k="${esc(s.key)}" aria-label="Link ${esc(s.name)} to ${s.apt === 'int' ? 'Cognition' : 'Intuition'}">${s.apt === 'int' ? 'INT' : 'COG'}</button>` : ''}${stp('ep2buy', s.key, buy, s.name, [buy <= 0, false], 5)}</div>`; });
    h += `</div><div class="grouph"><span>Add a field skill</span></div><div class="seg era ep2wrap">`;
    const fields = {}; [...R.D.backgrounds, ...R.D.careers, ...R.D.interests].forEach(p => p.skills.forEach(e => { if (e.fields && e.skill) (fields[e.skill] = fields[e.skill] || new Set()); (e.fields || []).forEach(f => e.skill && fields[e.skill].add(f)); }));
    Object.entries(fields).forEach(([sk, F]) => [...F].slice(0, 8).forEach(f => { const k = `${sk}:${f}`; if (!S.skills[k]) h += `<button data-act="ep2buy" data-pc="${pc.id}" data-k="${esc(k)}" data-d="5">${esc(R.skillName(k))}</button>`; }));
    h += `</div>`;
  }
  if (key === 'lang') {
    const n = (ch.langs || []).length;
    h += `${stepHead(S, 'lang', '7', 'Languages', STEP_RULE.lang)}<div class="hint">${S.freeLang} free (two, more with COG + INT of 35 and 45); each beyond is 1 CP. ${n} chosen.</div><div class="opts three">`;
    (R.D.languages || []).forEach(l => h += tog('langs', l, (ch.langs || []).includes(l), l, '', null));
    h += `</div>`;
  }
  if (key === 'rep') {
    h += `${stepHead(S, 'rep', '9', 'Reputation', STEP_RULE.rep)}<div class="hint">${S.repPool} points over the networks (60/40 or 50/25/25 suggested), none above 80. 5 more for each CP.</div><div class="rows one">`;
    R.D.rep.forEach(r => { const v = +(ch.rep?.[r.id] || 0); h += `<div class="row${v ? ' on' : ''}" style="grid-template-columns:1fr auto"><div><b>${esc(r.tag)} ${S.rep[r.id]}</b><span>${esc(r.name)}</span></div>${stp('ep2rep', r.id, v, r.tag, [v <= 0, v >= 80], 5)}</div>`; });
    h += `<div class="row" style="grid-template-columns:1fr auto"><div><b>Extra rep</b><span>${(+ch.repCP || 0) * 5} points for ${+ch.repCP || 0} CP</span></div>${stp('ep2repcp', 'repCP', +ch.repCP || 0, 'rep CP', [!(+ch.repCP), false])}</div></div>`;
  }
  if (key === 'traits') {
    const t2 = tab[pc.id + ':tr'] || 'pos';
    h += `${stepHead(S, 'traits', '10', 'Ego traits and psi', P.traits)}<div class="hint">Positive traits cost CP; negative ones give CP back (at most 6). Tap again for the next level. Morph traits are bought with the morph.</div><div class="seg era">`;
    h += [['pos', 'Positive ego traits'], ['neg', 'Negative ego traits'], ['psi', 'Psi']].map(([k, n]) => `<button class="${t2 === k ? 'sel' : ''}" data-ep2="trtab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${t2 === k}">${n}</button>`).join('') + `</div><div class="opts three">`;
    if (t2 !== 'psi') R.D.traits.filter(t => t.kind !== 'morph' && (t2 === 'pos' ? t.sign > 0 : t.sign < 0)).forEach(t => { const have = (ch.traits || []).find(x => x.id === t.id);
      h += opt(`data-act="ep2trait" data-v="${t.id}"`, !!have, t.name + (have && t.cost.length > 1 ? ` (level ${have.level})` : ''), t.text, `${t.cost.join('/')} CP`); });
    else { h += `</div><div class="hint">Psi trait level ${S.psiLv || 'none'} (take it under positive traits). One sleight free; each other 1 CP; psi-gamma needs level 2.</div><div class="seg era ep2wrap">`;
      (R.G.substrains || []).forEach(s => h += `<button class="${ch.substrain === s.id ? 'sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="substrain" data-v="${s.id}" aria-pressed="${ch.substrain === s.id}">${esc(s.name)}</button>`);
      h += `</div><div class="opts three">`;
      R.G.sleights.forEach(s => h += tog('sleights', s.id, (ch.sleights || []).includes(s.id), s.name, s.text, `psi-${s.level}`, 10)); }
    h += `</div>`;
  }
  if (key === 'cp') {
    h += `${stepHead(S, 'cp', '8 · 10', 'Flex and customization', STEP_RULE.cp)}<div class="hint">Every ego starts with 1 Flex; more cost 2 CP each (ego Flex at most 3). Specialisations: +10 when they apply, 1 CP each.</div><div class="rows one">`;
    h += `<div class="row on" style="grid-template-columns:1fr auto"><div><b>Ego Flex ${S.flexEgo}</b><span>1 free · ${+ch.flexCP || 0} bought</span></div>${stp('ep2flex', 'flexCP', +ch.flexCP || 0, 'Flex', [!(+ch.flexCP), S.flexEgo >= 3])}</div>`;
    S.spend.filter(x => x.unit !== 'MP').forEach(x => h += `<div class="row${x.pts ? ' on' : ''}"><div><b>${esc(x.label)} ${x.pts} CP</b><span>${esc(x.note || '')}</span></div></div>`);
    h += `<div class="row on"><div><b>Left ${S.cp.left} of ${S.cp.budget}</b><span>20${S.cp.neg ? ` + ${S.cp.neg} from negative traits` : ''}</span></div></div></div><div class="grouph"><span>Specialisations</span></div><div class="opts three">`;
    Object.values(S.skills).filter(s => s.pts > 0).forEach(s => h += opt(`data-act="ep2spec" data-k="${esc(s.key)}"`, (ch.specs || []).some(x => x.skill === s.key), `${s.name} specialist`, '+10 when the specialty applies', '1 CP'));
    h += `</div>`;
  }
  if (key === 'morph') {
    const types = ['biomorph', 'pod', 'uplift', 'synthmorph', 'infomorph'], t2 = tab[pc.id + ':mo'] || (S.morph?.type) || 'biomorph';
    const bought = ch.morphs || [];
    h += `${stepHead(S, 'morph', '12', 'Starting morph and gear', STEP_RULE.morph)}<div class="hint">Morphs cost Morph Points (${S.mp.budget}${S.mp.budget > 6 ? ', with Resources' : ''}). Buy a spare too if you like (after the first, a 0 MP morph costs 1). Unspent MP become Flex, 2 for 1, until the first resleeve.</div><div class="seg era ep2wrap">`;
    const part = tab[pc.id + ':mp'] || 'morphs';
    h += [['morphs', 'Morphs'], ['traits', 'Morph traits'], ['gear', 'Gear, weapons, armour']].map(([k, nm]) => `<button class="${part === k ? 'sel' : ''}" data-ep2="mptab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${part === k}">${nm}</button>`).join('') + `</div>`;
    if (part === 'morphs') { h += `<div class="seg era ep2wrap">` + types.map(k => `<button class="${t2 === k ? 'sel' : ''}" data-ep2="motab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${t2 === k}">${k[0].toUpperCase() + k.slice(1)}s</button>`).join('') + `</div><div class="opts three">`;
    R.D.morphs.filter(m => m.type === t2).forEach(m => { const i = bought.findIndex(x => x.id === m.id);
      h += opt(`data-act="ep2morph" data-v="${m.id}"`, i >= 0, m.name + (i === 0 ? ' · starting' : i > 0 ? ' · spare' : ''), `DUR ${m.dur} · WT ${m.wt} · ${R.POOLS.map(k => `${PN[k][0]}${m.pools[k]}`).join(' ')} · ${m.text || ''}`, `${m.mp} MP`); });
    h += `</div>`; }
    if (bought.length > 1 && part === 'morphs') { h += `<div class="grouph"><span>Start the game in</span></div><div class="seg era ep2wrap">` + bought.map(m => `<button class="${(ch.current || bought[0].key) === m.key ? 'sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="current" data-v="${m.key}">${esc(R.MORPH[m.id]?.name || m.id)}</button>`).join('') + `</div>`; }
    const first = bought.find(m => m.key === (ch.current || bought[0]?.key));
    if (part === 'traits' && !first) h += `<div class="crease">Buy a morph first</div>`;
    if (first && part === 'traits') { h += `<div class="grouph"><span>Morph traits for the ${esc(R.MORPH[first.id]?.name || '')} (MP)</span></div><div class="opts three">`;
      R.D.traits.filter(t => t.kind !== 'ego').forEach(t => { const have = (first.traits || []).find(x => x.id === t.id); h += opt(`data-act="ep2mtrait" data-k="${first.key}" data-v="${t.id}"`, !!have, t.name + (have && t.cost.length > 1 ? ` (level ${have.level})` : ''), t.text, `${t.sign > 0 ? '' : '+'}${t.cost.join('/')} MP`); });
      h += `</div>`; }
    if (part === 'gear') {
    const camp = (R.G.packs || []).find(p => p.kind === 'campaign' && /firewall/.test(p.key)), pack = (R.G.packs || []).find(p => p.kind !== 'campaign' && (p.key === ch.career || p.career === ch.career));
    const synthM = S.morph?.type === 'synthmorph';
    h += `<div class="grouph"><span>Gear packs: ${esc(camp?.name || 'Firewall')}${pack ? ' + ' + esc(pack.name) : ''}</span><span class="chip" data-go="${P.packs}">p.${printIndex[P.packs]?.page || ''}</span></div><div class="hint">${esc([...(camp?.items || []), ...(pack?.items || [])].join(', '))}${synthM && camp?.synthAlt ? ' · in a synthmorph, swap in ' + esc(camp.synthAlt.join(', ')) : ''}${pack ? '' : ' · choose a career for its pack'} · and a muse, free</div>`;
    const wk = tab[pc.id + ':w'] || 'kinetic', cats = [...new Set(R.G.weapons.map(w => w.cat))];
    h += `<div class="grouph"><span>Weapons and armour carried</span><span>${esc((ch.weapons || []).map(id => R.WPN[id]?.name).filter(Boolean).join(', ') || 'none')}</span></div><div class="seg era ep2wrap">` + cats.map(c => `<button class="${wk === c ? 'sel' : ''}" data-ep2="wtab" data-pc="${pc.id}" data-v="${c}" aria-pressed="${wk === c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('') + `</div><div class="opts three">`;
    R.G.weapons.filter(w => w.cat === wk).forEach(w => h += tog('weapons', w.id, (ch.weapons || []).includes(w.id), w.name, `DV ${w.dv}${w.ap ? ' · AP ' + w.ap : ''}${w.fire ? ' · ' + w.fire : ''}`, w.comp));
    h += `</div><div class="opts three">` + opt(`data-act="set" data-path="armor" data-v=""`, !ch.armor, 'No worn armour', 'only the morph’s own') + R.G.armor.filter(a => !a.bonus).map(a => set('armor', a.id, ch.armor, a.name, `${a.e}/${a.k} energy/kinetic`, a.comp)).join('') + `</div>`; }
  }
  if (key === 'motive') {
    h += `${stepHead(S, 'motive', '13', 'Motivations', STEP_RULE.motive)}<div class="hint">Three: the faction’s, then two of your own. Tap once for +, again for −, again to drop.</div>`;
    if (S.fac) h += `<div class="rows one"><div class="row on"><div><b>+${esc(S.fac.name)} Interests</b><span>from the faction</span></div></div></div>`;
    h += `<div class="opts three">`;
    (R.D.motivationExamples || []).forEach(m => { const x = (ch.motives || []).find(y => y.m === m); h += opt(`data-act="ep2motive" data-v="${esc(m)}"`, !!x, `${x ? x.sign : ''}${m}`, '', null); });
    h += `</div>`;
  }
  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3>${printIndex[P.derivedStep] ? `<span class="chip" data-go="${P.derivedStep}">p.${printIndex[P.derivedStep].page}</span>` : ''}</div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? 'Ready for the first op' : 'Not ready yet'}</b><div>${esc([S.bg?.name, S.career?.name, S.interest?.name, S.morph?.name].filter(Boolean).join(' · ') || 'Nothing chosen yet')} · Initiative ${S.init} · Lucidity ${S.luc} · CP ${S.cp.left} left · MP ${S.mp.left} left</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves. Rez and resleeving come next.</span></button>`;
  }
  if (key === 'adv') h += advStep(pc, S, ch);
  return h + '</div>';
}

// ---------------------------------------------------------------- Rez, new morphs and resleeving (filed under the latest session)
function advStep(pc, S, ch) {
  const n = advSession(), a = amt[pc.id + ':rez'] || 1, t2 = tab[pc.id + ':adv'] || 'skill';
  let h = `${stepHead(S, 'adv', '★', 'Rez and resleeving', STEP_RULE.adv)}<div class="hint">Rez Points are awarded after sessions (1–2 each is the book’s pace) and spent at the customization costs. Everything here is filed under S${n}.</div>
    <div class="karmabar"><span><b>${S.rez.earned} Rez</b> earned · ${S.rez.spent} spent · ${S.rez.left} left</span><div class="stepper"><button data-ep2="rezamt" data-pc="${pc.id}" data-d="-1" aria-label="Less Rez">−</button><output>${a}</output><button data-ep2="rezamt" data-pc="${pc.id}" data-d="1" aria-label="More Rez">+</button></div>
    <button class="opt" data-act="ep2rez" data-pc="${pc.id}" data-v="${a}"><b>Award ${a} Rez</b><span>filed under S${n}</span></button></div><div class="seg era ep2wrap">`;
  h += [['skill', 'Skills +5'], ['apt', 'Aptitudes +1'], ['rep', 'Rep +5'], ['flex', 'Flex'], ['more', 'Traits, sleights'], ['sleeve', 'Morphs']].map(([k, nm]) => `<button class="${t2 === k ? 'sel' : ''}" data-ep2="advtab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${t2 === k}">${nm}</button>`).join('') + `</div><div class="opts three">`;
  const can = c => S.rez.left >= c;
  const buy = (k, key, n2, title, eff, cost, extra = '') => `<button class="opt" data-act="ep2buyrez" data-pc="${pc.id}" data-k="${k}" data-key="${esc(key)}" data-n="${n2}"${extra} ${can(cost) ? '' : 'disabled'}><b>${esc(title)}<em>${cost} Rez</em></b><span>${esc(eff)}</span></button>`;
  if (t2 === 'skill') Object.values(S.skills).sort((x, y) => (y.pts > 0) - (x.pts > 0) || y.v - x.v).forEach(s => { if (s.v < 100) h += buy('skill', s.key, 5, `${s.name} ${s.v} → ${Math.min(100, s.v + 5)}`, s.v >= 60 ? 'at 60+ the book allows 1 point a downtime week' : 'five skill points', 1); });
  if (t2 === 'apt') AP.forEach(k => { if (S.aptEgo[k] < 30) h += buy('apt', k, 1, `${APN[k]} ${S.aptEgo[k]} → ${S.aptEgo[k] + 1}`, 'raises every linked skill too', 1); });
  if (t2 === 'rep') R.D.rep.forEach(r => h += buy('rep', r.id, 5, `${r.tag} ${S.rep[r.id]} → ${S.rep[r.id] + 5}`, r.name, 1));
  if (t2 === 'flex') { if (S.flexEgo < 3) h += buy('flex', 'flex', 1, `Ego Flex ${S.flexEgo} → ${S.flexEgo + 1}`, 'at most 3', 2); else h += `<div class="crease">Ego Flex is at its most (3)</div>`; }
  if (t2 === 'more') { R.D.traits.filter(t => t.kind !== 'morph' && t.sign > 0 && !S.egoTraits.some(x => x.id === t.id)).forEach(t => h += buy('trait', t.id, 1, t.name, t.text, t.cost[0]));
    if (S.psiLv) R.G.sleights.filter(s => !S.sleights.some(x => x.id === s.id) && (s.level === 'chi' || S.psiLv >= 2)).forEach(s => h += buy('sleight', s.id, 1, s.name, s.text, 1)); }
  if (t2 === 'sleeve') {
    h += `</div><div class="grouph"><span>Resleeve into a morph you own</span><span class="chip" data-go="${P.sleeve}">p.${printIndex[P.sleeve]?.page || ''}</span></div><div class="opts three">`;
    S.owned.forEach(m => { const X = R.MORPH[m.id]; h += `<button class="opt${m.key === S.cur?.key ? ' sel' : ''}" data-act="ep2sleeve" data-pc="${pc.id}" data-v="${m.key}" ${m.key === S.cur?.key ? 'disabled' : ''}><b>${esc(X?.name || m.id)}<em>${m.key === S.cur?.key ? 'worn now' : 'resleeve'}</em></b><span>${esc(X?.type || '')} · DUR ${X?.dur} · from ${esc(m.from)}</span></button>`; });
    const t3 = tab[pc.id + ':gain'] || 'synthmorph';
    h += `</div><div class="grouph"><span>Acquire a new morph (the GM says how)</span><span class="chip" data-go="${P.acquire}">p.${printIndex[P.acquire]?.page || ''}</span></div><div class="seg era ep2wrap">` + ['biomorph', 'pod', 'uplift', 'synthmorph', 'infomorph'].map(k => `<button class="${t3 === k ? 'sel' : ''}" data-ep2="gaintab" data-pc="${pc.id}" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}s</button>`).join('') + `</div><div class="opts three">`;
    R.D.morphs.filter(m => m.type === t3).forEach(m => h += `<button class="opt" data-act="ep2gain" data-pc="${pc.id}" data-v="${m.id}"><b>${esc(m.name)}<em>${m.mp} MP · avail ${m.avail ?? '—'}</em></b><span>DUR ${m.dur} · ${R.POOLS.map(k => `${PN[k][0]}${m.pools[k]}`).join(' ')}</span></button>`);
  }
  h += `</div>`;
  const mine = (state.adv[pc.id] || []).filter(e => e.s === n && ((e.buy || []).length || e.rez || e.gain || e.sleeve));
  if (mine.length) h += `<div class="grouph"><span>Filed under S${n}</span></div><div class="rows one">${mine.map(e => `<div class="row on"><div><b>S${e.s}</b><span>${esc(advanceText(e))}</span></div></div>`).join('')}</div><button class="opt" data-act="ep2back" data-pc="${pc.id}"><b>Take back the last entry</b><span>the most recent spend, award, new morph or resleeve at this table</span></button>`;
  return h;
}

// ---------------------------------------------------------------- rolls
function rollHtml(r) {
  if (r.kind === 'dice') return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">${esc(r.spec)}</span><span class="dd">${r.dice.map(x => `<i>${x.v}</i>`).join('')}${r.mod ? `<i>${sgn(r.mod)}</i>` : ''}</span><span class="verdict">${r.total}</span></div>`;
  const cls = r.crit && r.ok ? 'ok big' : r.ok ? 'ok' : r.crit ? 'bad' : '';
  return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">d100 vs ${r.target}${r.flipped ? ' · flip-flopped' : ''}${r.pool ? ' · ' + r.pool : ''}</span><span class="dd"><i class="${cls}">${String(r.roll).padStart(2, '0')}</i></span><span class="verdict${r.ok ? '' : ' fail'}">${esc(r.level[0].toUpperCase() + r.level.slice(1))}</span></div>`;
}
function pushRoll(pc, rec, at) { const k = pc ? pc.id : '_free'; (state.rolls[k] = state.rolls[k] || []).unshift(rec); state.rolls[k] = state.rolls[k].slice(0, 8); persist(); toast(rec, at); logPush({ kind: 'roll', who: pc ? pc.id : 'gm', rec }); }
// a test: the number on the sheet, the next-test modifier, +20 if a pool point was set aside, the wound and trauma penalty
function testFor(pc, base, label, apt, at) {
  const S = sheetOf(pc), L = liveOf(pc), pen = penalty(pc, S), m = nextMod[pc.id] || 0; let boost = 0, pool = '';
  if (poolBoost[pc.id]) { const k = apt && poolLeft(pc, S, poolFor(apt)) ? poolFor(apt) : poolLeft(pc, S, 'flex') ? 'flex' : null;
    if (k) { L.pool[k] = (L.pool[k] || 0) + 1; boost = 20; pool = `+20 from ${PN[k]}`; } poolBoost[pc.id] = false; }
  const target = Math.max(0, base + m + boost + pen.mod), r = R.roll(target);
  const rec = { ...r, label: `${choicesOf(pc).name || WORDS.Char} · ${label}`, apt, pool, mod: m, pen: pen.mod };
  pushRoll(pc, rec, at); nextMod[pc.id] = 0; return rec;
}
function freeRoll(spec, label, at) {
  if (/^\d+$/.test(String(spec))) { const r = R.roll(+spec); pushRoll(null, { ...r, label: label || `d100 vs ${spec}` }, at); renderTable(); return; }
  const r = R.rollDice(spec); pushRoll(null, { kind: 'dice', label: label || `Roll ${spec}`, spec: String(spec), dice: r.dice, mod: r.mod, total: r.total }, at); renderTable(); }

// portraits: the book's own picture of the morph worn now (cut from the reader's copy), else a Turnip Works figure
const TYPE_TOKEN = { synthmorph: ['rigger-human-m', 'technomancer-dwarf-f', 'rigger-ork-m', 'street-samurai-troll-m'], pod: ['street-samurai-elf-f', 'street-samurai-human-m', 'adept-elf-f'],
  uplift: ['shaman-troll-m', 'adept-troll-f', 'merc-troll-f'], infomorph: ['technomancer-human-m', 'decker-elf-f', 'decker-human-f'], biomorph: ['face-human-f', 'modern-exec-f', 'face-elf-m', 'modern-civilian-m'] };
const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
function morphArt(id) { const a = R.ART[id]; return a && window.__bookArt?.[a] || null; }
function portraitOf(pc, S) {
  S = S || sheetOf(pc); const t = S.morph?.type || 'biomorph', pick = TYPE_TOKEN[t] || TYPE_TOKEN.biomorph;
  const options = [...pick, ...Object.keys(TOKEN_FILES).filter(k => !pick.includes(k))].slice(0, 4).map(k => close(TOKEN_FILES[k])).filter(Boolean);
  const art = S.morph ? morphArt(S.morph.id) : null;
  return { src: state.portraits[pc.id] ? close(state.portraits[pc.id]) : art || options[0] || '', options, art, book: !state.portraits[pc.id] && !!art };
}

// ---------------------------------------------------------------- the sheet
function renderSheet(pc) {
  const box = sheetEls[pc.id], ch = choicesOf(pc), S = sheetOf(pc), asOf = state.asof[pc.id] ?? 99, L = liveOf(pc), B = bodyOf(L, S), pen = penalty(pc, S);
  const nm = ch.name || `New ${WORDS.char}`, prev = box._prev || {};
  const who = [S.bg?.name, S.career?.name, S.interest?.name, S.fac ? S.fac.name : ch.faction === 'none' ? 'no faction' : null].filter(Boolean).join(' · ') || 'Not built yet';
  const pv = (key, v, cls = '') => `<span class="pv ${cls}${prev[key] != null && prev[key] !== v ? ' changed' : ''}" data-prov="${esc(key)}" tabindex="0">${v}</span>`;
  const chip = (id, lab) => printIndex[id] ? `<span class="chip" data-go="${id}">${lab || 'p.' + printIndex[id].page}</span>` : '';
  const has = new Set(karmaOf(pc).map(k => k.s));
  const asofBtns = ['Start', ...C.sessions.map(s => 'S' + s.n), 'Now'].map((lab, i) => { const val = lab === 'Now' ? 99 : i; const on = asOf === val; return `<button data-act="asof" data-pc="${pc.id}" data-v="${val}" class="${on ? 'on' : ''}${has.has(i) ? ' has' : ''}" aria-pressed="${on}">${lab}</button>`; }).join('');
  const die = (v, label, apt, extra = '') => `<button class="die" data-act="roll" data-pc="${pc.id}" data-t="${v}" data-apt="${apt || ''}" data-label="${esc(label)}"${extra} title="Test ${esc(label)}: d100 vs ${v}" aria-label="Test ${esc(label)}">⚄</button>`;
  // ego: aptitudes and their checks, derived mental stats, stress and trauma, rep
  const apt = AP.map(k => `<div class="ep2ax"><div class="k" data-rule-of="a:${k}" role="link" tabindex="0">${APN[k]}</div>${pv('a:' + k, S.apt[k], 'mid')}<div class="ep2chk"><span>check</span>${pv('chk:' + k, S.check[k])}${die(S.check[k], APN[k] + ' check', k)}</div></div>`).join('');
  const stressBar = `<div class="track ep2trk"><span class="k">Stress ${chip(P.stress)}</span><b>${L.stress}</b><span class="e">of Lucidity ${S.luc} · insane at ${S.ir}</span><span class="k">Trauma</span><b>${L.trauma}</b>
    <div class="stepper"><button data-ep2="amt" data-pc="${pc.id}" data-k="stress" data-d="-1" aria-label="Less stress">−</button><output>${amt[pc.id + ':stress'] || 1}</output><button data-ep2="amt" data-pc="${pc.id}" data-k="stress" data-d="1" aria-label="More stress">+</button></div>
    <button class="btn" data-act="ep2stress" data-pc="${pc.id}" data-v="${amt[pc.id + ':stress'] || 1}" aria-label="Take stress">Take ${amt[pc.id + ':stress'] || 1} stress</button><button class="btn" data-act="ep2calm" data-pc="${pc.id}" aria-label="Clear stress and trauma">Clear</button></div>`;
  const rep = R.D.rep.map(r => `<div class="sk${S.rep[r.id] ? '' : ' zero'}"><span class="k" data-rule-of="rep:${r.id}" role="link" tabindex="0">${esc(r.tag)}</span>${pv('rep:' + r.id, S.rep[r.id], 'mid')}${die(S.rep[r.id], r.tag + ' test', 'sav')}</div>`).join('');
  // skills: every skill the ego has, then the untrained ones it defaults on
  const sk = Object.values(S.skills).sort((a, b) => (b.trained - a.trained) || a.name.localeCompare(b.name)).map(s => `<div class="sk${s.trained ? '' : ' zero'}"><span class="ep2dot">${s.trained ? '●' : '○'}</span><span class="k" data-rule-of="s:${esc(s.key)}" role="link" tabindex="0">${esc(s.name)}${s.spec.length ? ' <i class="ep2spec">+10 specialist</i>' : ''}</span><span class="ep2ab3">${s.apt.toUpperCase()}</span>${pv('s:' + s.key, s.v, 'mid')}${die(s.v, s.name, s.apt, ` data-skill="${esc(s.key)}"`)}</div>`).join('');
  // the morph worn now: pools (pips you tick as they are spent), durability, wounds, armour, traits, ware
  const pools = R.POOLS.map(k => { const n = S.pools[k] || 0, used = Math.min(n, L.pool[k] || 0);
    return `<div class="ep2pool"><span class="k" data-rule-of="pool:${k}" role="link" tabindex="0">${PN[k]}</span>${pv('pool:' + k, n, 'mid')}<span class="ep2pips">${Array.from({ length: n }, (_, i) => `<button class="${i < used ? 'L' : ''}" data-ep2="pool" data-pc="${pc.id}" data-v="${k}" data-i="${i}" aria-label="${PN[k]} point ${i + 1}">${i < used ? '×' : ''}</button>`).join('')}</span><span class="e">${esc(S.poolNote[k].join(', '))}</span></div>`; }).join('');
  const hit = amt[pc.id + ':hit'] || 5;
  const status = !S.morph ? '' : B.dmg >= S.dr ? `<span class="wound">destroyed (Death Rating) ${chip(P.health)}</span>` : B.dmg >= S.dur ? `<span class="wound">out of action (Durability) ${chip(P.health)}</span>` : '';
  const wareRows = S.ware.map(w => `<div class="ep2ware"><span class="k"${printIndex['ep2-ware-' + w.id] ? ` data-go="ep2-ware-${w.id}"` : ''}>${esc(w.name)}</span><span class="e">${esc(w.text || '')}</span></div>`).join('');
  const mtr = S.morphTraits.map(t => `<span class="ep2tag"${printIndex[R.traitRule(t.id)] ? ` data-go="${R.traitRule(t.id)}" role="link" tabindex="0"` : ''}>${esc(t.name)}${t.level > 1 || (t.level && R.TRAIT[t.id]?.cost?.length > 1) ? ' ' + t.level : ''}</span>`).join('');
  const morphSec = S.morph ? `
      <div class="ep2mh"><div><div class="ep2mn" data-go="${R.morphRule(S.morph.id)}" role="link" tabindex="0">${esc(S.morph.name)}</div><div class="who">${esc(S.morph.type)} · ${esc(S.move || '')}${S.resleeved ? ' · resleeved' : ''}</div></div>${chip(R.morphRule(S.morph.id), 'stat block p.' + (printIndex[R.morphRule(S.morph.id)]?.page || S.morph.page))}</div>
      <div class="ep2pools">${pools}</div>
      <div class="ep2rch"><button class="btn" data-act="ep2short" data-pc="${pc.id}" aria-label="Short recharge">Short recharge (1d6)</button><button class="btn" data-act="ep2long" data-pc="${pc.id}" aria-label="Long recharge">Long recharge</button>${chip(P.recharge, 'recharging')}</div>
      <div class="der">
        <div><div class="k" data-rule-of="dur" role="link" tabindex="0">Durability</div>${pv('dur', S.dur, 'mid')}<small>${B.dmg} damage</small></div>
        <div><div class="k" data-rule-of="wt" role="link" tabindex="0">Wound Threshold</div>${pv('wt', S.wt, 'mid')}<small>${B.wounds} wound${B.wounds === 1 ? '' : 's'}</small></div>
        <div><div class="k" data-rule-of="dr" role="link" tabindex="0">Death Rating</div>${pv('dr', S.dr, 'mid')}<small>${S.synth ? 'DUR × 2' : 'DUR × 1.5'}</small></div>
        <div><div class="k" data-rule-of="armor" role="link" tabindex="0">Armour</div>${pv('armor', S.armor.join('/'), 'mid')}<small>energy/kinetic${S.worn ? ' · ' + esc(S.worn.name) : ''}</small></div>
      </div>
      <div class="track ep2trk"><span class="k">Hit ${chip(P.wounds, 'wounds')}</span><div class="stepper"><button data-ep2="amt" data-pc="${pc.id}" data-k="hit" data-d="-1" aria-label="Less damage">−</button><output>${hit}</output><button data-ep2="amt" data-pc="${pc.id}" data-k="hit" data-d="1" aria-label="More damage">+</button></div>
        <button class="btn" data-act="ep2hit" data-pc="${pc.id}" data-v="${hit}" aria-label="Take ${hit} damage">Take ${hit} damage</button><button class="btn" data-act="ep2wound" data-pc="${pc.id}" data-d="1" aria-label="Add a wound">+1 wound</button><button class="btn" data-act="ep2heal" data-pc="${pc.id}" aria-label="Heal or repair fully">Heal fully</button>${status}</div>
      <div class="ep2tags"><span class="k">Morph traits ${chip(P.traits)}</span>${mtr || '<span class="e">none</span>'}</div>
      <div class="ep2wl"><div class="k">Ware ${chip(P.ware)}</div>${wareRows || '<span class="e">none</span>'}</div>` : `<div class="none">No morph yet: buy one in the builder (step 12).</div>`;
  // owned morphs: each with its book picture (once your copy is open) and a Resleeve button
  const own = S.owned.map(m => { const X = R.MORPH[m.id], a = morphArt(m.id), on = m.key === S.cur?.key, dmg = L.m[m.key]?.dmg || 0;
    return `<div class="ep2om${on ? ' on' : ''}"><span class="ep2thumb closeup">${a ? `<img src="${a}" alt="" draggable="false">` : `<b>${esc((X?.name || '?')[0])}</b>`}</span><div><b>${esc(X?.name || m.id)}</b><span class="e">${esc(X?.type || '')} · DUR ${X?.dur ?? '—'}${dmg ? ` · ${dmg} damage` : ''} · ${esc(m.from === 'build' ? 'from creation' : 'since ' + m.from)}</span></div>${on ? '<span class="ep2worn">worn now</span>' : asOf === 99 ? `<button class="btn" data-act="ep2sleeve" data-pc="${pc.id}" data-v="${m.key}" aria-label="Resleeve into ${esc(X?.name || m.id)}">Resleeve</button>` : ''}</div>`; }).join('');
  // the rest of the ego: muse, motivations, ego traits, sleights, languages, weapons
  const traits = S.egoTraits.map(t => `<span class="ep2tag${t.T.sign < 0 ? ' neg' : ''}" data-go="${R.traitRule(t.id)}" role="link" tabindex="0" title="${esc(t.T.text || '')}">${esc(t.T.name)}${t.T.cost.length > 1 ? ' ' + (t.level || 1) : ''}</span>`).join('');
  const slt = S.sleights.map(s => `<div class="ep2ware"><span class="k" data-go="${R.sleightRule(s.id)}" role="link" tabindex="0">${esc(s.name)}</span><span class="e">psi-${s.level} · ${esc(s.text || '')}</span>${S.skills.psi ? die(S.skills.psi.v, s.name, 'wil') : ''}</div>`).join('');
  const wpn = S.weapons.map(w => { const sk2 = S.skills[w.skill] || S.skills.guns; return `<div class="ep2atk"><b>${esc(w.name)}</b><span class="e">DV ${esc(w.dv)}${w.ap ? ' · AP ' + w.ap : ''}${w.fire ? ' · ' + esc(w.fire) : ''}</span>
    <button class="die wide" data-act="roll" data-pc="${pc.id}" data-t="${sk2?.v || 0}" data-apt="${sk2?.apt || 'ref'}" data-label="${esc(w.name)} attack" aria-label="Attack with ${esc(w.name)}">⚄ ${esc(sk2?.name || 'Guns')} ${sk2?.v || 0}</button><button class="die wide" data-act="roll" data-pc="${pc.id}" data-dmg="${esc(w.dv)}" data-label="${esc(w.name)} damage" aria-label="Roll ${esc(w.name)} damage">⚄ ${esc(w.dv)}</button></div>`; }).join('');
  const tok = portraitOf(pc, S), rolls = state.rolls[pc.id] || [], last = rolls[0];
  const mod = nextMod[pc.id] || 0;
  box.innerHTML = `
    <div class="main">
    <section class="sA ep2A">
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget ep2budget">
        <div><div class="k" data-rule-of="rez" role="link" tabindex="0">Rez Points</div><div class="bv">${pv('rez', S.rez.left)} <span class="tn">of ${S.rez.earned}</span></div></div>
        <div><div class="k">Customization</div><div class="bv">${S.cp.left} <span class="tn">of ${S.cp.budget} CP</span></div></div>
        <div><div class="k">Morph Points</div><div class="bv">${S.mp.left} <span class="tn">of ${S.mp.budget} MP</span></div></div>
      </div>
      <div class="ep2muse"><span class="k" data-go="${P.muse}" role="link" tabindex="0">Muse</span> <b>${esc(ch.muse || 'unnamed')}</b> <span class="e">· the agent’s AI aide</span></div>
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
    </section>
    <section class="ep2Apt">
      <h4>Ego ${chip(P.egoMorph, 'ego and morph')} ${chip(P.apt, 'aptitudes')}</h4>
      <div class="ep2aptg">${apt}</div>
      <div class="der">
        <div><div class="k" data-rule-of="init" role="link" tabindex="0">Initiative</div>${pv('init', S.init, 'mid')}<small>(REF + INT) ÷ 5</small></div>
        <div><div class="k" data-rule-of="luc" role="link" tabindex="0">Lucidity</div>${pv('luc', S.luc, 'mid')}<small>WIL × 2</small></div>
        <div><div class="k" data-rule-of="tt" role="link" tabindex="0">Trauma Threshold</div>${pv('tt', S.tt, 'mid')}<small>LUC ÷ 5</small></div>
        <div><div class="k" data-rule-of="ir" role="link" tabindex="0">Insanity Rating</div>${pv('ir', S.ir, 'mid')}<small>LUC × 2</small></div>
      </div>
      ${stressBar}
      <div class="ep2rep"><span class="k">Rep ${chip(P.repTest, 'rep tests')}</span>${rep}</div>
    </section>
    <section class="ep2Sk dense">
      <h4>Skills ${chip(P.skills)} ${chip(P.def, 'defaulting')}</h4>
      <div class="ep2skl">${sk}</div>
    </section>
    <section class="ep2Mo ep2mo dense">
      <h4>Morph worn now ${chip(P.egoMorph, 'ego and morph')}</h4>${morphSec}
    </section>
    <section class="ep2Ts">
      <h4>Tests ${chip(P.test, 'd100')} ${chip(P.sup, 'superior')} ${chip(P.crit, 'criticals')} ${chip(P.pools, 'pools')}</h4>
      <div class="ep2mods"><span class="k">Next test</span><div class="seg">${[-30, -20, -10, 0, 10, 20, 30].map(v => `<button class="${mod === v ? 'sel' : ''}" data-ep2="mod" data-pc="${pc.id}" data-v="${v}" aria-pressed="${mod === v}">${v ? sgn(v) : '±0'}</button>`).join('')}</div>
        <button class="btn${poolBoost[pc.id] ? ' on' : ''}" data-ep2="boost" data-pc="${pc.id}" aria-pressed="${!!poolBoost[pc.id]}">+20 from a pool</button></div>
      <div class="ep2pen">${pen.mod ? `Wounds and trauma: ${pen.mod} on every test and ${pen.w + pen.t} off Initiative` : 'No wound or trauma penalty'}${L.ign.w || L.ign.t ? ` (ignoring ${L.ign.w + L.ign.t} with pool)` : ''} <button class="btn" data-act="ep2ignore" data-pc="${pc.id}" ${pen.w || pen.t ? '' : 'disabled'} aria-label="Spend a pool point to ignore a wound or trauma">Ignore one (1 pool)</button></div>
      ${last && !last.kind && !last.flipped && !last.crit ? `<button class="btn ep2flip" data-act="ep2flip" data-pc="${pc.id}" ${(last.apt && poolLeft(pc, S, poolFor(last.apt))) || poolLeft(pc, S, 'flex') ? '' : 'disabled'}>Flip-flop ${String(last.roll).padStart(2, '0')} → ${String(R.flip(last.roll)).padStart(2, '0')} (1 pool)</button>` : ''}
      <div class="list l-weapons">${wpn}</div>
      <div class="rolls">${rolls.slice(0, 2).map(rollHtml).join('') || '<div class="none">Tap ⚄ to test: d100, equal or under the number wins.</div>'}</div>
    </section>
    <section class="sP ep2P">
      <div class="portrait closeup${tok.book ? ' ep2book' : ''}" data-portrait="${pc.id}" title="The morph’s picture from your copy of the book; or drop an image here"><img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">${tok.book ? 'From your copy' : 'Drop an image'}</span></div>
      <div class="tokens">${tok.art ? `<button class="closeup ${tok.book ? 'sel' : ''}" data-ep2="face" data-pc="${pc.id}" aria-label="Use the morph’s picture from the book"><img src="${tok.art}" alt="" draggable="false"></button>` : ''}${tok.options.slice(0, tok.art ? 3 : 4).map(o => `<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this figure"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
    </section>
    <section class="ep2Own ep2own">
      <h4>Morphs owned ${chip(P.sleeve, 'resleeving')}</h4>
      ${own || '<div class="none">None yet.</div>'}
    </section>
    <section class="ep2Ex ep2ex dense">
      <h4>Traits, psi, motivations ${chip(P.traits)}</h4>
      <div class="ep2tags"><span class="k" data-go="${P.muse}" role="link" tabindex="0">Muse ${esc(ch.muse || '')}</span>${R.MUSE.map(([nm, v]) => `<span class="ep2tag">${esc(nm)} ${v}</span>`).join('')}${die(60, (ch.muse || 'Muse') + ': Interface', '')}${die(30, (ch.muse || 'Muse') + ': Research', '')}</div>
      <div class="ep2tags"><span class="k">Ego traits</span>${traits || '<span class="e">none</span>'}</div>
      <div class="ep2tags"><span class="k">Motivations ${chip(P.motive)}</span>${S.motives.map(m => `<span class="ep2tag">${esc(m.sign + m.m)}</span>`).join('') || '<span class="e">none yet</span>'}</div>
      <div class="ep2tags"><span class="k">Languages</span>${S.langs.map(l => `<span class="ep2tag">${esc(l)}</span>`).join('') || '<span class="e">none chosen</span>'}</div>
      ${S.psiLv ? `<div class="ep2tags"><span class="k">Psi ${S.psiLv} ${chip(P.usePsi, 'using psi')}</span><span class="ep2tag">${esc(S.substrain?.name || 'no sub-strain')}</span><span class="ep2tag">Infection Rating ${pv('inf', S.infection)}</span></div><div class="ep2wl">${slt}</div>` : ''}
    </section>
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl over blbl'); bl.innerHTML = 'BUILDER<br>AND REZ'; bl.style.fontSize = '60px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 60, over: true });
  if (!ch.career && !state.done[pc.id]) box.querySelector('.builder').classList.add('todo');
  box._prev = { rez: S.rez.left, init: S.init, luc: S.luc, tt: S.tt, ir: S.ir, dur: S.dur, wt: S.wt, dr: S.dr, armor: S.armor.join('/'), ...Object.fromEntries(AP.map(k => ['a:' + k, S.apt[k]])), ...Object.fromEntries(AP.map(k => ['chk:' + k, S.check[k]])),
    ...Object.fromEntries(R.POOLS.map(k => ['pool:' + k, S.pools[k]])), ...Object.fromEntries(Object.values(S.skills).map(s => ['s:' + s.key, s.v])), ...Object.fromEntries(R.D.rep.map(r => ['rep:' + r.id, S.rep[r.id]])) };
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  fitSections(box);
  if (!tableReady || tableSig() !== lastTableSig) renderQuick(); dirty = true;
}
let lastTableSig = '';
function tableSig() { return PCS.map(pc => { const L = liveOf(pc), ch = choicesOf(pc), S = sheetOf(pc); return [pc.id, ch.name, S.init, S.cur?.id, state.portraits[pc.id], S.art && window.__bookArt?.[S.art] ? 1 : 0, JSON.stringify(L.m), L.stress, L.trauma, JSON.stringify(state.adv[pc.id] || []), state.asof[pc.id], initRoll[pc.id]?.total].join('|'); }).join(';') + fightN + ':' + turn.round + ':' + turn.at + ':' + (state.rolls._free || []).length + JSON.stringify(qdice2); }
function box_who(pc) { renderSheet(pc); }

// ---------------------------------------------------------------- round order and dice tray
// each agent rolls 1d6 + Initiative once when a fight starts; the order stands for the fight; ties to the higher Reflexes
function initiative() { return PCS.filter(pc => choicesOf(pc).name).map(pc => ({ pc, S: sheetOf(pc), r: initRoll[pc.id] })).sort((a, b) => ((b.r?.total ?? -99) - (a.r?.total ?? -99)) || (b.S.init - a.S.init) || (b.S.apt.ref - a.S.apt.ref)); }
const qdice2 = { target: 50, n: 2, f: 10, mod: 0 };
const FACES = [6, 10];
function trayStep(k, d) { if (k === 'target') qdice2.target = Math.max(0, Math.min(120, qdice2.target + 5 * d)); else if (k === 'n') qdice2.n = Math.max(1, Math.min(10, qdice2.n + d)); else if (k === 'f') qdice2.f = FACES[Math.max(0, Math.min(FACES.length - 1, FACES.indexOf(qdice2.f) + d))]; else qdice2.mod = Math.max(-10, Math.min(20, qdice2.mod + d)); }
function trayRoll(el) { if (el.dataset.troll === 'test') { freeRoll(qdice2.target, `d100 vs ${qdice2.target}`, el); return; } freeRoll(`${qdice2.n}d${qdice2.f}${qdice2.mod ? (qdice2.mod > 0 ? '+' : '') + qdice2.mod : ''}`, null, el); }
function tstep2(k) { return `<span class="stepper"><button data-ts="${k}" data-d="-1" aria-label="Lower">−</button><output>${k === 'mod' ? sgn(qdice2.mod) : qdice2[k]}</output><button data-ts="${k}" data-d="1" aria-label="Raise">+</button></span>`; }
function rollInitiative(at) { fightN++; turn.at = 0; turn.round = 1;
  PCS.filter(pc => choicesOf(pc).name).forEach(pc => { const S = sheetOf(pc), d = R.rollDice('1d6').total, pen = penalty(pc, S), w = pen.w + pen.t; initRoll[pc.id] = { d, w, total: d + S.init - w }; });
  logPush({ kind: 'note', who: 'gm', text: `initiative for fight ${fightN}: ` + initiative().map(x => `${choicesOf(x.pc).name} ${x.r.total}`).join(', ') }); historyNote(`Rolled initiative (fight ${fightN})`); renderTable(); }
function renderTable() {
  lastTableSig = tableSig();
  const o = initiative(); if (turn.at >= o.length) turn.at = 0; const rolled = o.some(x => x.r);
  roundCard.innerHTML = `<div class="fit"><h3>Round order ${printIndex[P.init] ? `<span class="chip" data-go="${P.init}">p.${printIndex[P.init].page}</span>` : ''}</h3><div class="t">Each agent rolls 1d6 + Initiative when a fight starts; highest acts first, and the order holds every action turn (about 3 seconds) until the fight ends. Spending Vigor jumps the queue for a turn.</div>
    <div class="rmeta">${rolled ? `Fight ${fightN} · turn ${turn.round}` : 'No fight yet'} <button class="tb" data-ep2="init">${rolled ? 'New fight: roll again' : 'Roll initiative'}</button><button class="tb" data-turn="next">Next ›</button><button class="tb" data-turn="reset">New turn</button></div>
    <ol class="init">${o.map(({ pc, S, r }, i) => { const L = liveOf(pc), B = bodyOf(L, S), tok = portraitOf(pc, S).src;
      return `<li class="${i === turn.at && rolled ? 'on' : ''}"><span class="closeup rimg"><img src="${tok}" alt="" draggable="false"></span><span class="who2" data-go="${pc.id}">${esc(choicesOf(pc).name)}</span><span class="nums">${r ? `<b>${r.total}</b> (d6 ${r.d} + ${S.init}${r.w ? ` − ${r.w} for wounds and trauma` : ''})` : `Initiative ${S.init}`} · ${esc(S.morph?.name || 'no morph')} · DUR ${Math.max(0, S.dur - B.dmg)}/${S.dur}${B.wounds ? ` · ${plural(B.wounds, 'wound')}` : ''}${L.trauma ? ` · ${plural(L.trauma, 'trauma')}` : ''}</span></li>`; }).join('')}</ol></div>`; fitCard(roundCard);
  diceCard.innerHTML = `<div class="fit"><h3>Dice tray ${printIndex[P.test] ? `<span class="chip" data-go="${P.test}">p.${printIndex[P.test].page}</span>` : ''}</h3><div class="t">A test is d100 (00–99) against a target: equal or under succeeds, doubles are criticals, 33+ and 66+ superior. Damage and stress are d6 and d10 sums.</div>
    <div class="qdice"><label>Target ${tstep2('target')}</label><button class="tb go" data-troll="test">d100 vs ${qdice2.target}</button></div>
    <div class="qdice"><label>Dice ${tstep2('n')}</label><label>d ${tstep2('f')}</label><label>Mod ${tstep2('mod')}</label><button class="tb go" data-troll="1">Roll ${qdice2.n}d${qdice2.f}${qdice2.mod ? (qdice2.mod > 0 ? '+' : '') + qdice2.mod : ''}</button></div>
    <div class="rolls">${[...(state.rolls._free || [])].slice(0, 5).map(rollHtml).join('') || '<div class="none">No rolls yet.</div>'}</div></div>`; fitCard(diceCard);
}

// ---------------------------------------------------------------- quickbar
function rigCommands(q, ws, nums, pcw) {
  const out = [], name = pcw ? choicesOf(pcw).name : '';
  const m = q.match(/^\s*(?:roll|r)\s+(.+)$/i);
  if (m) { const spec = m[1].replace(/\s+/g, '');
    if (/^\d+$/.test(spec)) out.push({ k: 'cmd', t: `Test d100 against ${spec}`, run: () => freeRoll(+spec, null, qb) });
    else if (/^\d*d\d+([+-]\d+)?$/i.test(spec)) out.push({ k: 'cmd', t: `Roll ${spec}`, run: () => freeRoll(spec, null, qb) }); }
  if (pcw) { const S = sheetOf(pcw), rest = ws.filter(w => !(choicesOf(pcw).name || '').toLowerCase().startsWith(w));
    const s = Object.values(S.skills).find(x => rest.some(w => w.length >= 3 && x.name.toLowerCase().replace(/[^a-z]/g, '').startsWith(w.replace(/[^a-z]/g, ''))));
    const a = AP.find(k => rest.some(w => w === k || (w.length >= 3 && APN[k].toLowerCase().startsWith(w))));
    const rp = R.D.rep.find(r => rest.some(w => w.replace(/[^a-z@]/g, '') === r.tag.replace(/-rep$/, '').replace(/[^a-z@]/g, '') + 'rep' || w === r.tag));
    if (s && !['rez', 'hit', 'stress', 'resleeve'].includes(ws[0])) out.push({ k: 'cmd', t: `Test ${name}’s ${s.name} (${s.v})`, run: () => { testFor(pcw, s.v, s.name, s.apt, qb); renderSheet(pcw); } });
    if (a && !s) out.push({ k: 'cmd', t: `Test ${name}’s ${APN[a]} check (${S.check[a]})`, run: () => { testFor(pcw, S.check[a], APN[a] + ' check', a, qb); renderSheet(pcw); } });
    if (rp) out.push({ k: 'cmd', t: `Test ${name}’s ${rp.tag} (${S.rep[rp.id]})`, run: () => { testFor(pcw, S.rep[rp.id], rp.tag + ' test', 'sav', qb); renderSheet(pcw); } });
    if (ws[0] === 'rez') { const n = nums.find(x => x > 0) || 1; out.push({ k: 'cmd', t: `Award ${name} ${n} Rez (filed under S${advSession()})`, run: () => { pushUndo(); awardRez(pcw, n); } }); }
    if (ws[0] === 'resleeve' || ws[0] === 'sleeve') out.push({ k: 'cmd', t: `${name}: resleeve (${S.owned.length} morph${S.owned.length === 1 ? '' : 's'} owned)`, run: () => { tab[pcw.id + ':adv'] = 'sleeve'; renderSheet(pcw); flyTo(`b-${pcw.id}-adv`); } });
    if (ws[0] === 'hit' || ws[0] === 'damage') { const n = nums[0] || 1; out.push({ k: 'cmd', t: `${name} takes ${n} damage (wound at ${S.wt})`, run: () => { pushUndo(); takeHit(pcw, n); } }); }
    if (ws[0] === 'stress') { const n = nums[0] || 1; out.push({ k: 'cmd', t: `${name} takes ${n} stress (trauma at ${S.tt})`, run: () => { pushUndo(); takeStress(pcw, n); } }); }
    if (ws[0] === 'heal' || ws[0] === 'repair') out.push({ k: 'cmd', t: `Heal ${name}’s ${S.morph?.name || 'morph'} fully`, run: () => { pushUndo(); const B = bodyOf(liveOf(pcw), S); B.dmg = 0; B.wounds = 0; persist(); renderSheet(pcw); renderTable(); } });
  }
  if (['initiative', 'init', 'fight'].some(w => ws[0] === w) && ws.length === 1) out.push({ k: 'cmd', t: 'Roll initiative for a new fight', run: () => { rollInitiative(qb); flyTo('round'); } });
  return out;
}
function takeHit(pc, n) { const S = sheetOf(pc), L = liveOf(pc), B = bodyOf(L, S), w = S.wt ? Math.floor(n / S.wt) : 0; B.dmg += n; B.wounds += w;
  historyNote(`${choicesOf(pc).name}: ${n} damage to the ${S.morph?.name || 'morph'}${w ? `, ${plural(w, 'wound')}` : ''}`); toast({ msg: `${choicesOf(pc).name}: ${n} damage`, note: `${B.dmg} of DUR ${S.dur}${w ? ` · ${plural(w, 'wound')} (−${10 * w})` : ''}` }); persist(); renderSheet(pc); renderTable(); }
function takeStress(pc, n) { const S = sheetOf(pc), L = liveOf(pc), t = S.tt ? Math.floor(n / S.tt) : 0; L.stress += n; L.trauma += t;
  historyNote(`${choicesOf(pc).name}: ${n} stress${t ? `, ${plural(t, 'trauma')}` : ''}`); toast({ msg: `${choicesOf(pc).name}: ${n} stress`, note: `${L.stress} of Lucidity ${S.luc}${t ? ` · ${plural(t, 'trauma')}` : ''}` }); persist(); renderSheet(pc); renderTable(); }
function awardRez(pc, n) { const s = advSession(), e = advEntry(pc, s); e.rez = (e.rez || 0) + n; const S = sheetOf(pc);
  historyNote(`${choicesOf(pc).name || WORDS.Char}: +${n} Rez after S${s} (${S.rez.left} to spend)`); logPush({ kind: 'note', who: pc.id, text: `+${n} Rez` }); toast({ msg: `${choicesOf(pc).name || WORDS.Char}: +${n} Rez`, note: `${S.rez.left} to spend` }); refreshAdv(pc, s); }

// choices that are not changes to the character (the next test's modifier, open lists, amounts, ticking pools) skip
// history and undo; they are handled here, after the engine's capture listeners, so a drag that moved never presses them
document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-ep2]'); if (!b || b.disabled || b.tagName === 'INPUT') return;
  if (b.dataset.ep2 === 'init') { rollInitiative(b); return; }
  const pc = pcById[b.dataset.pc]; if (!pc) return; const k = b.dataset.ep2, v = b.dataset.v;
  if (k === 'mod') nextMod[pc.id] = +v;
  else if (k === 'boost') poolBoost[pc.id] = !poolBoost[pc.id];
  else if (k === 'trtab') tab[pc.id + ':tr'] = v; else if (k === 'mptab') tab[pc.id + ':mp'] = v; else if (k === 'motab') tab[pc.id + ':mo'] = v; else if (k === 'wtab') tab[pc.id + ':w'] = v;
  else if (k === 'advtab') tab[pc.id + ':adv'] = v; else if (k === 'gaintab') tab[pc.id + ':gain'] = v;
  else if (k === 'rezamt') amt[pc.id + ':rez'] = Math.max(1, Math.min(10, (amt[pc.id + ':rez'] || 1) + +b.dataset.d));
  else if (k === 'amt') { const kk = pc.id + ':' + b.dataset.k; amt[kk] = Math.max(1, Math.min(60, (amt[kk] || (b.dataset.k === 'hit' ? 5 : 1)) + +b.dataset.d)); }
  else if (k === 'pool') { const L = liveOf(pc), i = +b.dataset.i; L.pool[v] = (L.pool[v] || 0) > i ? i : i + 1; persist(); }
  else if (k === 'face') { delete state.portraits[pc.id]; persist(); renderTable(); }
  renderSheet(pc);
});
document.addEventListener('input', ev => { const i = ev.target.closest?.('input[data-ep2="muse"]'); if (!i) return; const pc = pcById[i.dataset.pc]; if (!pc) return; choicesOf(pc).muse = i.value; persist(); const m = sheetEls[pc.id]?.querySelector('.ep2muse b'); if (m) m.textContent = i.value || 'unnamed'; });
document.addEventListener('change', ev => { const i = ev.target.closest?.('input[data-ep2="muse"]'); if (!i) return; const pc = pcById[i.dataset.pc]; if (pc) { historyNote(`${choicesOf(pc).name || WORDS.Char}: muse named ${i.value}`); renderSheet(pc); } });

const newKey = ch => { let i = 1; const used = new Set([...(ch.morphs || []).map(m => m.key)]); while (used.has('m' + i)) i++; return 'm' + i; };
function rigAct(act, a, pc, ch) {
  const k = a.dataset.k, v = a.dataset.v, d = +a.dataset.d || 0;
  const done = () => { persist(); renderSheet(pc); return true; };
  if (act === 'roll') {
    if (a.dataset.dmg) { const r = R.rollDice(a.dataset.dmg); pushRoll(pc, { kind: 'dice', label: `${choicesOf(pc).name || WORDS.Char} · ${a.dataset.label}`, spec: a.dataset.dmg, dice: r.dice, mod: r.mod, total: r.total }, a); renderSheet(pc); return true; }
    testFor(pc, +a.dataset.t, a.dataset.label, a.dataset.apt, a); renderSheet(pc); return true; }
  if (act === 'ep2flip') { const S = sheetOf(pc), L = liveOf(pc), r = (state.rolls[pc.id] || [])[0]; if (!r || r.kind || r.flipped) return true;
    const kk = r.apt && poolLeft(pc, S, poolFor(r.apt)) ? poolFor(r.apt) : poolLeft(pc, S, 'flex') ? 'flex' : null; if (!kk) return true; L.pool[kk] = (L.pool[kk] || 0) + 1;
    Object.assign(r, R.judge(R.flip(r.roll), r.target), { flipped: true, pool: [r.pool, `flip-flop from ${PN[kk]}`].filter(Boolean).join(' · ') }); persist(); toast(r, a); historyNote(`${ch.name}: flip-flopped a test to ${String(r.roll).padStart(2, '0')} (${r.level})`); renderSheet(pc); return true; }
  if (act === 'ep2pkg') { if (ch[k] !== v) { ch[k] = v; Object.keys(ch.field || {}).filter(x => x.startsWith(k + ':')).forEach(x => delete ch.field[x]); Object.keys(ch.pick || {}).filter(x => x.startsWith(k + ':')).forEach(x => delete ch.pick[x]); } else ch[k] = null; return done(); }
  if (act === 'ep2field') { ch.field = ch.field || {}; ch.field[k] = v; return done(); }
  if (act === 'ep2pick') { ch.pick = ch.pick || {}; ch.pick[k] = v; return done(); }
  if (act === 'ep2shift') { ch.shift = ch.shift || {}; const S = sheetOf(pc); const nv = (+(ch.shift[k] || 0)) + d; if (S.aptEgo[k] + d < 5 || S.aptEgo[k] + d > 30) return true; if (nv) ch.shift[k] = nv; else delete ch.shift[k]; return done(); }
  if (act === 'ep2aptcp') { ch.aptCP = ch.aptCP || {}; const nv = Math.max(0, (+(ch.aptCP[k] || 0)) + d); if (sheetOf(pc).aptEgo[k] + (nv - (+(ch.aptCP[k] || 0))) > 30) return true; if (nv) ch.aptCP[k] = nv; else delete ch.aptCP[k]; return done(); }
  if (act === 'ep2buy') { ch.buy = ch.buy || {}; const nv = Math.max(0, (+(ch.buy[k] || 0)) + d); if (nv) ch.buy[k] = nv; else delete ch.buy[k]; return done(); }
  if (act === 'ep2knowint') { const L = ch.knowInt = ch.knowInt || []; ch.knowInt = L.includes(k) ? L.filter(x => x !== k) : [...L, k]; return done(); }
  if (act === 'ep2rep') { ch.rep = ch.rep || {}; const nv = Math.max(0, Math.min(80, (+(ch.rep[k] || 0)) + d)); if (nv) ch.rep[k] = nv; else delete ch.rep[k]; return done(); }
  if (act === 'ep2repcp') { ch.repCP = Math.max(0, (+ch.repCP || 0) + d); return done(); }
  if (act === 'ep2flex') { ch.flexCP = Math.max(0, Math.min(2, (+ch.flexCP || 0) + d)); return done(); }
  if (act === 'ep2trait') { const T = R.TRAIT[v], L = ch.traits = ch.traits || [], x = L.find(t => t.id === v);
    if (!x) L.push({ id: v, level: 1 }); else if (x.level < (T?.cost?.length || 1)) x.level++; else ch.traits = L.filter(t => t.id !== v); return done(); }
  if (act === 'ep2mtrait') { const m = (ch.morphs || []).find(x => x.key === k); if (!m) return true; const T = R.TRAIT[v], L = m.traits = m.traits || [], x = L.find(t => t.id === v);
    if (!x) L.push({ id: v, level: 1 }); else if (x.level < (T?.cost?.length || 1)) x.level++; else m.traits = L.filter(t => t.id !== v); return done(); }
  if (act === 'ep2spec') { const L = ch.specs = ch.specs || []; ch.specs = L.some(x => x.skill === k) ? L.filter(x => x.skill !== k) : [...L, { skill: k, name: 'specialist' }]; return done(); }
  if (act === 'ep2morph') { const L = ch.morphs = ch.morphs || [], i = L.findIndex(x => x.id === v);
    if (i >= 0) { const key = L[i].key; L.splice(i, 1); if (ch.current === key) ch.current = L[0]?.key || null; } else { const key = newKey(ch); L.push({ key, id: v, traits: [] }); if (!ch.current) ch.current = key; }
    return done(); }
  if (act === 'ep2motive') { const L = ch.motives = ch.motives || [], x = L.find(y => y.m === v); const max = ch.faction && ch.faction !== 'none' ? 2 : 3;
    if (!x) { if (L.length >= max) L.shift(); L.push({ m: v, sign: '+' }); } else if (x.sign === '+') x.sign = '−'; else ch.motives = L.filter(y => y.m !== v); return done(); }
  if (act === 'ep2hit') { takeHit(pc, +v); return true; }
  if (act === 'ep2wound') { const S = sheetOf(pc), B = bodyOf(liveOf(pc), S); B.wounds = Math.max(0, B.wounds + d); return done(); }
  if (act === 'ep2heal') { const S = sheetOf(pc), B = bodyOf(liveOf(pc), S); B.dmg = 0; B.wounds = 0; liveOf(pc).ign.w = 0; persist(); renderSheet(pc); renderTable(); return true; }
  if (act === 'ep2stress') { takeStress(pc, +v); return true; }
  if (act === 'ep2calm') { const L = liveOf(pc); L.stress = 0; L.trauma = 0; L.ign.t = 0; persist(); renderSheet(pc); renderTable(); return true; }
  if (act === 'ep2ignore') { const S = sheetOf(pc), L = liveOf(pc), pen = penalty(pc, S);
    const kk = pen.w && poolLeft(pc, S, 'vig') ? 'vig' : pen.t && poolLeft(pc, S, 'mox') ? 'mox' : poolLeft(pc, S, 'flex') ? 'flex' : null; if (!kk) return true;
    if (L.ign.w + L.ign.t >= 3) { toast({ msg: 'At most three wounds or traumas can be ignored' }, a); return true; } L.pool[kk] = (L.pool[kk] || 0) + 1; if (pen.w && kk !== 'mox') L.ign.w++; else L.ign.t++; return done(); }
  if (act === 'ep2short') { const S = sheetOf(pc), L = liveOf(pc), r = R.rollDice('1d6').total; let left = r;
    for (const kk of ['flex', 'vig', 'ins', 'mox']) { const back = Math.min(left, L.pool[kk] || 0); L.pool[kk] -= back; left -= back; }
    pushRoll(pc, { kind: 'dice', label: `${ch.name} · short recharge`, spec: '1d6', dice: [{ f: 6, v: r }], mod: 0, total: r }, a); return done(); }
  if (act === 'ep2long') { const L = liveOf(pc); L.pool = {}; L.ign = { w: 0, t: 0 }; historyNote(`${ch.name}: long recharge`); return done(); }
  if (act === 'ep2rez') { awardRez(pc, +v); return true; }
  if (act === 'ep2buyrez') { const S = sheetOf(pc), n = advSession(), e = advEntry(pc, n), b = { k, key: a.dataset.key, n: +a.dataset.n };
    (e.buy = e.buy || []).push(b); historyNote(`${ch.name || WORDS.Char}: spent Rez after S${n}: ${advanceText({ buy: [b] })}`); logPush({ kind: 'note', who: pc.id, text: advanceText({ buy: [b] }) }); refreshAdv(pc, n); return true; }
  if (act === 'ep2gain') { const n = advSession(), e = advEntry(pc, n), owned = sheetOf(pc).owned; let i = 1; while (owned.some(m => m.key === 'g' + i) || (state.adv[pc.id] || []).some(x => [].concat(x.gain || []).some(g => g.key === 'g' + i))) i++;
    e.gain = [...[].concat(e.gain || []), { key: 'g' + i, id: v }]; historyNote(`${ch.name}: acquired a ${R.MORPH[v]?.name} morph after S${n}`); refreshAdv(pc, n); return true; }
  if (act === 'ep2sleeve') { const S = sheetOf(pc), n = advSession(), e = advEntry(pc, n), to = S.owned.find(m => m.key === v); if (!to) return true;
    e.sleeve = v; e.sleeveName = R.MORPH[to.id]?.name; const S2 = sheetOf(pc);
    historyNote(`${ch.name || WORDS.Char} resleeved from the ${S.morph?.name || 'old morph'} into the ${S2.morph?.name} after S${n}`);
    logPush({ kind: 'note', who: pc.id, text: `resleeved into the ${S2.morph?.name}: Integration and resleeving stress tests due` });
    toast({ msg: `${ch.name || WORDS.Char}: now in the ${S2.morph?.name}`, note: `pools ${R.POOLS.map(kk => `${PN[kk]} ${S2.pools[kk]}`).join(', ')} · DUR ${S2.dur} · now: Integration test (SOM check) and resleeving stress test (WIL check); only ego Flex helps` }, a);
    liveOf(pc).pool = {}; refreshAdv(pc, n); renderTable(); return true; }
  if (act === 'ep2back') { const n = advSession(), L = state.adv[pc.id] || [], e = L.find(x => x.s === n); if (!e) return true;
    if (e.sleeve) { delete e.sleeve; delete e.sleeveName; } else if ((e.buy || []).length) e.buy.pop(); else if (e.gain) { const g = [].concat(e.gain); g.pop(); e.gain = g.length ? g : undefined; if (!g.length) delete e.gain; } else if (e.rez) delete e.rez;
    historyNote(`${ch.name}: took back the last Rez or morph entry`); refreshAdv(pc, n); renderTable(); return true; }
  return false;
}
