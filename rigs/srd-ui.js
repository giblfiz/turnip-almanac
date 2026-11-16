// SRD 5.2.1: the rule-specific half of the app. Inserted by build.sh at /*@RIG-UI@*/ inside the app's scope.
// Contract (what the engine calls): WORDS, RIG_NO_UNDO, advanceText, STEP_NAME, ORDER, STEP_RULE, STEP_SHEET, BAREA,
// BREG, BINNER, BK_K, stepHtml, renderSheet, rollHtml, portraitOf, initiative, renderTable, freeRoll, qdice2,
// trayStep, trayRoll, rigCommands, rigAct, box_who.
// Levelling (the heart of this rig): XP awards and level-ups are advancement entries filed under the latest session
// (advEntry/refreshAdv); the level step shows what the next level brings before it is committed, and takes one back.
const WORDS = { xp: 'XP', xpVerb: 'Advancement', char: 'adventurer', Char: 'Adventurer', party: 'The adventurers',
  quickHint: 'Jump or do: mira stealth, roll d20+5, roll 2d6+3, xp mira 300, level mira, new adventurer…',
  helpCommands: '<i>mira stealth</i>, <i>mira dex save</i>, <i>mira longsword</i>, <i>roll d20+5</i>, <i>roll 2d6+3</i>, <i>xp mira 300</i>, <i>level mira</i>, <i>damage mira 7</i>, <i>heal mira</i>, <i>initiative</i>, <i>new adventurer</i>' };
const RIG_NO_UNDO = new Set(['roll', 'rollchars']);
const P = R.P;
const LVTXT = l => `${R.CLS[l.cls]?.name || l.cls} ${l.cn || ''}`.trim();
function advanceText(k) {
  const lv = [...(k.level ? [k.level] : []), ...(k.levels || [])];
  return [k.xp ? `${(+k.xp).toLocaleString()} XP` : '', ...lv.map(l => `level up: ${R.CLS[l.cls]?.name || l.cls}${l.subclass ? ' (' + R.CLS[l.cls].subclass.name + ')' : ''}, ${l.hp} HP${l.hpRoll ? ' rolled' : ''}${l.asi ? ', ' + Object.entries(l.asi).map(([a, v]) => `${a.toUpperCase()} +${v}`).join(' ') : ''}${l.feat ? ', ' + (R.FT[l.feat]?.name || l.feat) : ''}${(l.spells || []).length + (l.cantrips || []).length ? `, ${(l.spells || []).length + (l.cantrips || []).length} spells` : ''}`),
    k.back ? `took back ${k.back} level${k.back > 1 ? 's' : ''}` : ''].filter(Boolean).join('; ');
}
const STEP_NAME = { name: 'name', species: 'species', cls: 'class', bg: 'background', abil: 'ability scores', skills: 'skills', equip: 'equipment', spells: 'spells', done: 'all done', level: 'level up' };
const ORDER = ['name', 'species', 'cls', 'bg', 'abil', 'skills', 'equip', 'spells', 'done', 'level'];
const STEP_RULE = { name: 'srd-create-your-character', species: P.species, cls: P.cls, bg: P.bg, abil: P.abil, skills: P.skills, equip: P.equip, spells: P.spells, done: 'srd-step-5-character-creation-details', level: P.level };
const STEP_SHEET = { name: '.nm', species: '.who', cls: '.srdlv', bg: '.who', abil: '.srdab', skills: '.srdsk', equip: '.srdcb', spells: '.srdsp', done: '.srdlv', level: '.srdlv' };
const BREG = { x: 30, y: 950, w: 534, h: 320 }, BINNER = { w: 5600, h: 5600 * 320 / 534 };
// how much each step holds (its share of the builder); the engine splits the builder into golden cells by these
const BAREA = { name: 0.45, species: 1.25, cls: 1.5, bg: 0.7, abil: 1.5, skills: 1.2, equip: 2.0, spells: 3.4, done: 0.5, level: 3.4 };
const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);
const TOKEN_FILES = window.TOKEN_FILES || {};
const sgn = R.sgn, AB = R.AB, ABN = R.AB_NAME;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ORD = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

// what is not part of the character: the next roll's advantage, the level being drafted, the open spell list, initiative
const advSel = {}, lvDraft = {}, spTab = {}, initRoll = {}; let fightN = 0;
const draftOf = (pc, S) => { const d = lvDraft[pc.id]; if (d && d.at === S.level) return d; return lvDraft[pc.id] = { at: S.level, cls: choicesOf(pc).cls, hpMode: 'avg', hpRoll: null, asiMode: 'asi', asi: {}, feat: null, featPlus: null, spells: [], cantrips: [], expertise: [], style: null, sub: true }; };
const xpAmt = {};

function stepHead(S, key, no, title, rule) {
  const sub = key === 'abil' && S.left ? `${S.left} of 27 points left` : key === 'level' ? `level ${S.level} · ${S.xp.toLocaleString()} XP` : S.level ? `level ${S.level}` : '';
  return `<div class="q"><span class="no">${no}</span><h3>${title}</h3>${rule && printIndex[rule] ? `<span class="chip" data-go="${rule}">p.${printIndex[rule].page}</span>` : ''}<span class="sub">${sub}</span></div>`;
}
const spellLine = s => `${s.lv ? 'L' + s.lv : 'cantrip'} ${s.school}${s.conc ? ' · C' : ''}${s.ritual ? ' · R' : ''}`;
function stepHtml(pc, S, key) {
  const ch = choicesOf(pc);
  const opt = (attrs, on, title, eff, cost, dis) => `<button class="opt${on ? ' sel' : ''}" ${attrs} data-pc="${pc.id}" aria-pressed="${!!on}"${dis ? ' disabled' : ''}><b>${esc(title)}${cost != null ? `<em>${esc(cost)}</em>` : ''}</b><span>${esc(eff || '')}</span></button>`;
  const set = (path, v, cur, title, eff, cost, dis) => opt(`data-act="set" data-path="${path}" data-v="${esc(v)}"`, cur === v, title, eff, cost, dis);
  const tog = (path, v, on, title, eff, cost, max, dis) => opt(`data-act="toggle" data-path="${path}" data-v="${esc(v)}"${max ? ` data-max="${max}"` : ''}`, on, title, eff, cost, dis);
  let h = `<div class="bstep" data-id="b-${pc.id}-${key}">`;
  if (key === 'name') h += `${stepHead(S, 'name', '1', 'Name', STEP_RULE.name)}<div class="hint">Who are they?</div><input data-act="name" data-pc="${pc.id}" value="${esc(ch.name || '')}" placeholder="Name" aria-label="Name"><input data-act="player" data-pc="${pc.id}" value="${esc(pc.player || '')}" placeholder="Player" aria-label="Player name" style="margin-top:12px;font-size:24px">`;
  if (key === 'species') {
    h += `${stepHead(S, 'species', '2', 'Species', STEP_RULE.species)}<div class="hint">Size, speed and the traits you are born with.</div><div class="opts three">`;
    R.D.species.forEach(s => h += opt(`data-act="srdspecies" data-v="${s.id}"`, ch.species === s.id, s.name, `${s.size} · speed ${s.speed}${s.dark ? ` · darkvision ${s.dark}` : ''} · ${s.traits.map(t => t.name).join(', ')}`, null));
    h += `</div>`;
    const sp = R.SPC[ch.species];
    if (sp?.lineage) { h += `<div class="grouph"><span>${esc(sp.lineage.name)}</span></div><div class="opts three">`; sp.lineage.opts.forEach(o => h += set('lineage', o.id, ch.lineage, o.name, '')); h += `</div>`; }
    if (sp?.skillPick || sp?.skillAny) { h += `<div class="grouph"><span>${sp.skillPick ? 'Keen Senses: one skill' : 'Skillful: any one skill'}</span></div><div class="opts three">`;
      (sp.skillPick || R.D.skills.map(s => s.id)).forEach(id => h += set('speciesSkill', id, ch.speciesSkill, R.SKL[id].name, ABN[R.SKL[id].ab])); h += `</div>`; }
    if (sp?.originFeat) { h += `<div class="grouph"><span>Versatile: an origin feat</span></div><div class="opts">`; R.D.feats.filter(f => f.cat === 'origin').forEach(f => h += set('humanFeat', f.id, ch.humanFeat, f.name, f.text)); h += `</div>`; }
  }
  if (key === 'cls') {
    h += `${stepHead(S, 'cls', '3', 'Class', STEP_RULE.cls)}<div class="hint">Your first class sets your saves and level-1 features. More levels, or a second class, come in the Level up step.</div><div class="opts three">`;
    R.D.classes.forEach(c => h += opt(`data-act="srdcls" data-v="${c.id}"`, ch.cls === c.id, c.name, `d${c.hd} · ${c.primary.map(k => ABN[k]).join(c.primaryAny ? ' or ' : ' and ')} · saves ${c.saves.map(k => k.toUpperCase()).join(', ')}${c.caster ? ' · spells' : ''}`, `p.${printIndex[c.src]?.page || ''}`));
    h += `</div>`;
    const C = R.CLS[ch.cls];
    if (C) { h += `<div class="grouph"><span>Level 1 ${esc(C.name)}</span><span class="chip" data-go="${C.table}">table p.${printIndex[C.table]?.page || ''}</span></div><div class="rows one">` + C.features.filter(f => f.lv === 1).map(f => `<div class="row on"><div><b>${esc(f.name)}</b><span>${esc(printIndex[f.id]?.text || '')}</span></div></div>`).join('') + `</div>`;
      if (C.id === 'fighter') { h += `<div class="grouph"><span>Fighting Style feat</span></div><div class="opts">`; R.D.feats.filter(f => f.cat === 'style').forEach(f => h += set('style', f.id, ch.style, f.name, f.text)); h += `</div>`; } }
  }
  if (key === 'bg') {
    h += `${stepHead(S, 'bg', '4', 'Background', STEP_RULE.bg)}<div class="hint">Three abilities to raise, an origin feat, two skills and a tool.</div><div class="opts">`;
    R.D.backgrounds.forEach(b => h += opt(`data-act="srdbg" data-v="${b.id}"`, ch.bg === b.id, b.name, `${b.abil.map(k => k.toUpperCase()).join(', ')} · ${R.FT[b.feat].name}${b.featCls ? ' (' + R.CLS[b.featCls].name + ')' : ''} · ${b.skills.map(s => R.SKL[s].name).join(', ')} · ${b.tool}`, null));
    h += `</div>`;
  }
  if (key === 'abil') {
    const m = ch.abil || {}, meth = m.method || 'standard', bg = R.BG[ch.bg];
    h += `${stepHead(S, 'abil', '5', 'Ability scores', STEP_RULE.abil)}<div class="hint">Standard array, 27-point buy, or roll 4d6 and drop the lowest. Then the background adds +2 and +1, or +1 to all three.</div><div class="seg era">`;
    h += [['standard', 'Standard array'], ['pointbuy', 'Point buy'], ['roll', 'Roll']].map(([k, n]) => `<button class="${meth === k ? 'sel' : ''}" data-act="srdmeth" data-pc="${pc.id}" data-v="${k}" aria-pressed="${meth === k}">${n}</button>`).join('') + `</div>`;
    if (meth === 'roll') h += `<button class="opt sel rollall" data-act="rollchars" data-pc="${pc.id}" style="margin-top:12px"><b>⚄ Roll six scores</b><span>${m.rolls ? 'Rolled: ' + m.rolls.map(r => `${r.v} (${r.d.join(' ')})`).join(' · ') : '4d6 each, the lowest die dropped'}</span></button>`;
    const pool = meth === 'standard' ? R.STANDARD : meth === 'roll' ? (m.rolls || []).map(r => r.v) : null;
    h += `<div class="rows one" style="margin-top:12px">`;
    AB.forEach(k => { const v = m.base?.[k] || 0, plus = ch.bgPlus?.[k] || 0;
      const ctl = pool ? `<div class="seg">${pool.map((x, i) => `<button class="${v === x ? 'sel' : ''}" data-act="srdab" data-pc="${pc.id}" data-k="${k}" data-v="${x}" data-i="${i}" aria-pressed="${v === x}">${x}</button>`).join('')}</div>`
        : `<div class="stepper"><button data-act="srdpb" data-pc="${pc.id}" data-k="${k}" data-d="-1" ${(v || 8) <= 8 ? 'disabled' : ''} aria-label="Lower ${ABN[k]}">−</button><output>${v || 8}</output><button data-act="srdpb" data-pc="${pc.id}" data-k="${k}" data-d="1" ${(v || 8) >= 15 ? 'disabled' : ''} aria-label="Raise ${ABN[k]}">+</button></div>`;
      const bgc = bg?.abil.includes(k) ? `<div class="seg">${[0, 1, 2].map(n => `<button class="${plus === n ? 'sel' : ''}" data-act="srdbgplus" data-pc="${pc.id}" data-k="${k}" data-v="${n}" aria-pressed="${plus === n}">+${n}</button>`).join('')}</div>` : '';
      h += `<div class="row${v ? ' on' : ''}" style="grid-template-columns:1fr auto auto"><div><b>${ABN[k]} ${S.a[k]} (${sgn(S.M[k])})</b><span>${meth === 'pointbuy' ? `costs ${R.POINT_COST[v || 8]}` : v ? `base ${v}` : 'not assigned'}${plus ? ` · background +${plus}` : ''}</span></div>${ctl}${bgc}</div>`; });
    h += `</div>${bg ? '' : '<div class="hint">Choose a background to see which three abilities it raises.</div>'}`;
  }
  if (key === 'skills') {
    const C = R.CLS[ch.cls], own = ch.skills || [];
    h += `${stepHead(S, 'skills', '6', 'Skills', STEP_RULE.skills)}<div class="hint">${C ? `A ${C.name} picks ${C.skillN}.` : 'Choose a class first.'} Background and species skills are already marked.</div><div class="opts three">`;
    if (C) C.skillFrom.forEach(id => { const fixed = (S.bg?.skills || []).includes(id) || ch.speciesSkill === id; h += tog('skills', id, own.includes(id), R.SKL[id].name, `${ABN[R.SKL[id].ab]}${fixed ? ' · already from background or species' : ''}`, sgn(S.skill[id].v), C.skillN, fixed && !own.includes(id)); });
    h += `</div>`;
    const fixed = [...(S.bg?.skills || []).map(s => `${R.SKL[s].name} (${S.bg.name})`), ...(ch.speciesSkill ? [`${R.SKL[ch.speciesSkill].name} (${S.sp?.name})`] : [])];
    if (fixed.length) h += `<div class="hint">Also proficient: ${esc(fixed.join(', '))}.</div>`;
    if (S.feats.some(f => f.id === 'skilled')) { h += `<div class="grouph"><span>Skilled: three more</span></div><div class="opts three">`; R.D.skills.forEach(s => h += tog('featSkills', s.id, (ch.featSkills || []).includes(s.id), s.name, ABN[s.ab], null, 3)); h += `</div>`; }
    if (C?.features.some(f => f.lv === 1 && f.name === 'Expertise')) { h += `<div class="grouph"><span>Expertise: two proficient skills, double the bonus</span></div><div class="opts three">`;
      R.D.skills.filter(s => S.skill[s.id].prof).forEach(s => h += tog('expertise', s.id, (ch.expertise || []).includes(s.id), s.name, sgn(S.skill[s.id].v), null, 2)); h += `</div>`; }
  }
  if (key === 'equip') {
    const C = R.CLS[ch.cls], bg = R.BG[ch.bg], eq = ch.equip || {};
    h += `${stepHead(S, 'equip', '7', 'Equipment', STEP_RULE.equip)}<div class="hint">Take the class and background kits, or their gold. The weapons and armour below are what the sheet attacks and armours with.</div>`;
    if (C) { h += `<div class="opts">`; Object.entries(C.equip).forEach(([k, o]) => h += opt(`data-act="srdpack" data-k="cls" data-v="${k}"`, eq.cls === k, `${C.name} ${k}`, o.items, `${o.gp} GP`)); h += `</div>`; }
    if (bg) { h += `<div class="opts" style="margin-top:10px">${opt(`data-act="srdpack" data-k="bg" data-v="A"`, eq.bg !== 'B', `${bg.name} kit`, bg.items, `${bg.gp} GP`)}${opt(`data-act="srdpack" data-k="bg" data-v="B"`, eq.bg === 'B', `${bg.name}: gold`, 'Nothing but coin', '50 GP')}</div>`; }
    h += `<div class="grouph"><span>Armour</span><span>${esc(S.acHow)} = AC ${S.ac}</span></div><div class="opts three">`;
    h += opt(`data-act="set" data-path="armor" data-v=""`, !ch.armor, 'No armour', '10 + Dex, or your class’s unarmoured formula');
    R.D.armor.forEach(a => h += set('armor', a.id, ch.armor, a.name, `${a.cat} · AC ${a.ac}${a.dexMax > 9 ? ' + Dex' : a.dexMax ? ' + Dex (max 2)' : ''}${a.str ? ` · Str ${a.str}` : ''}`));
    // weapons one kind at a time (E2b: long lists show one slice); what they carry stays named whatever kind is open
    const kinds = ['simple melee', 'simple ranged', 'martial melee', 'martial ranged'], kind = spTab[pc.id + ':w'] || 'simple melee', carried = (ch.weapons || []).map(id => R.WP[id]?.name).filter(Boolean);
    h += opt(`data-act="flag" data-path="shield"`, !!ch.shield, 'Shield', '+2 AC') + `</div><div class="grouph"><span>Weapons</span><span>${carried.length ? esc(carried.join(', ')) : 'none carried'}</span></div><div class="seg era">`;
    h += kinds.map(k => `<button class="${k === kind ? 'sel' : ''}" data-srd="wtab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${k === kind}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('') + `</div><div class="opts three">`;
    R.D.weapons.filter(w => w.cat === kind).forEach(w => h += tog('weapons', w.id, (ch.weapons || []).includes(w.id), w.name, `${w.dmg} ${w.type.toLowerCase()}${w.props.length ? ' · ' + w.props.join(', ') : ''} · ${w.mastery}`));
    h += `</div>`;
  }
  if (key === 'spells') {
    const C = R.CLS[ch.cls], cast = S.casting.find(c => c.cls === ch.cls), mi = S.feats.find(f => f.id === 'magic-initiate');
    h += `${stepHead(S, 'spells', '8', 'Spells', STEP_RULE.spells)}`;
    if (!C?.caster) h += `<div class="hint">${C ? `A level-1 ${C.name} casts no spells.` : 'Choose a class first.'}${mi ? '' : ' Nothing to choose here.'}</div>`;
    else { const lv1 = C.prog[0], tab = spTab[pc.id] || 0, book = ch.cls === 'wizard';
      h += `<div class="hint">${lv1.cantrips ? `${lv1.cantrips} cantrips` : 'No cantrips'} and ${book ? '6 level-1 spells for the spellbook (prepare ' + lv1.prepared + ' on the sheet)' : `${lv1.prepared} prepared level-1 spells`} from the ${C.name} list.</div><div class="seg era">`;
      h += [[0, `Cantrips ${(ch.cantrips || []).length}/${lv1.cantrips || 0}`], [1, `Level 1 ${(ch.spells || []).length}/${book ? 6 : lv1.prepared}`]].filter(([k]) => k || lv1.cantrips).map(([k, n]) => `<button class="${tab === k ? 'sel' : ''}" data-srd="sptab" data-pc="${pc.id}" data-v="${k}" aria-pressed="${tab === k}">${n}</button>`).join('') + `</div><div class="opts three">`;
      R.D.spells.filter(s => s.lv === (lv1.cantrips ? tab : 1) && s.cls.includes(ch.cls)).forEach(s => { const path = s.lv ? 'spells' : 'cantrips', on = (ch[path] || []).includes(s.id);
        h += tog(path, s.id, on, s.name, s.text, spellLine(s), s.lv ? (book ? 6 : lv1.prepared) : lv1.cantrips); });
      h += `</div>`; }
    if (mi) { const mc = mi.cls || ch.miCls || 'wizard', M2 = ch.miSpells || {};
      h += `<div class="grouph"><span>Magic Initiate (${R.CLS[mc].name}): two cantrips, one level-1 spell</span></div>${mi.cls ? '' : `<div class="seg era">${['cleric', 'druid', 'wizard'].map(c => `<button class="${mc === c ? 'sel' : ''}" data-act="set" data-path="miCls" data-pc="${pc.id}" data-v="${c}">${R.CLS[c].name}</button>`).join('')}</div>`}<div class="opts three">`;
      R.D.spells.filter(s => s.cls.includes(mc) && s.lv <= 1).forEach(s => h += s.lv ? set('miSpells.spell', s.id, M2.spell, s.name, s.text, 'level 1') : tog('miSpells.cantrips', s.id, (M2.cantrips || []).includes(s.id), s.name, s.text, 'cantrip', 2));
      h += `</div>`; }
  }
  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3></div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? 'Ready to play' : 'Not ready yet'}</b><div>${esc([S.sp?.name, S.cls?.name && `${S.cls.name} ${S.level}`, S.bg?.name].filter(Boolean).join(' · ') || 'Nothing chosen yet')} · HP ${S.hp} · AC ${S.ac}</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves. Levels come next.</span></button>`;
  }
  if (key === 'level') h += levelStep(pc, S, ch);
  return h + '</div>';
}

// ---------------------------------------------------------------- the level step: XP, then what the next level brings
function levelStep(pc, S, ch) {
  const n = advSession(), amt = xpAmt[pc.id] || 300, next = S.next;
  let h = `${stepHead(S, 'level', '★', 'Level up', STEP_RULE.level)}`;
  if (!S.cls) return h + `<div class="crease">Build the level-1 adventurer first</div>`;
  const pct = next ? Math.min(100, Math.round((S.xp - R.XP[S.level - 1]) / (next - R.XP[S.level - 1]) * 100)) : 100;
  h += `<div class="hint">XP and levels are filed under S${n}. ${next ? `Level ${S.level + 1} needs ${next.toLocaleString()} XP.` : 'Level 20 is the top.'}</div>
    <div class="karmabar srdxp"><span><b>${S.xp.toLocaleString()} XP</b> · level ${S.level}</span><span class="srdbar"><i style="width:${pct}%"></i></span>
    <div class="stepper"><button data-srd="xpamt" data-pc="${pc.id}" data-d="-1" aria-label="Less XP">−</button><output>${amt.toLocaleString()}</output><button data-srd="xpamt" data-pc="${pc.id}" data-d="1" aria-label="More XP">+</button></div>
    <button class="opt" data-act="srdxp" data-pc="${pc.id}" data-v="${amt}"><b>Award ${amt.toLocaleString()} XP</b><span>filed under S${n}</span></button>
    ${next && !S.canLevel ? `<button class="opt" data-act="srdxp" data-pc="${pc.id}" data-v="${next - S.xp}"><b>Milestone: award ${(next - S.xp).toLocaleString()}</b><span>exactly enough for level ${S.level + 1}</span></button>` : ''}</div>`;
  if (S.level >= 20) h += `<div class="crease">Level 20: no more levels</div>`;
  else if (!S.canLevel) h += `<div class="crease">Level ${S.level + 1} at ${next.toLocaleString()} XP · ${(next - S.xp).toLocaleString()} to go</div>`;
  else {
    const d = draftOf(pc, S), plan = R.levelPlan(S, d.cls, ch), C = plan.C;
    // which class: the ones they have, or a new one (multiclassing needs 13 in both primaries)
    h += `<div class="grouph"><span>Level ${S.level + 1}: which class?</span><span class="chip" data-go="${P.multi}">multiclassing p.${printIndex[P.multi]?.page || ''}</span></div><div class="seg era srdwrap">`;
    R.D.classes.forEach(c => { const have = S.byCls[c.id], ok = have || ((c.primaryAny ? c.primary.some(k => S.a[k] >= 13) : c.primary.every(k => S.a[k] >= 13)) && (S.cls.primaryAny ? S.cls.primary.some(k => S.a[k] >= 13) : S.cls.primary.every(k => S.a[k] >= 13)));
      h += `<button class="${d.cls === c.id ? 'sel' : ''}" data-srd="lvcls" data-pc="${pc.id}" data-v="${c.id}" aria-pressed="${d.cls === c.id}" ${ok ? '' : 'disabled title="Needs 13 in both primary abilities"'}>${c.name}${have ? ' ' + (have + 1) : ''}</button>`; });
    h += `</div><div class="grouph"><span>${esc(C.name)} ${plan.n} brings</span><span class="chip" data-go="${C.table}">table p.${printIndex[C.table]?.page || ''}</span></div><div class="rows one">`;
    [...plan.gains, ...plan.subF].forEach(g => h += `<div class="row on"><div><b>${esc(g.name)}</b><span>${esc(printIndex[g.src]?.text || '')}</span></div></div>`);
    if (plan.asi) h += `<div class="row on"><div><b>Ability Score Improvement</b><span>${esc(printIndex['srd-ability-score-improvement']?.text || '')}</span></div></div>`;
    if (plan.boon) h += `<div class="row on"><div><b>Epic Boon</b><span>An Epic Boon feat, or any feat you qualify for.</span></div></div>`;
    if (plan.changes.length) h += `<div class="row"><div><b>Numbers</b><span>${esc(plan.changes.join(' · '))}</span></div></div>`;
    if (plan.mc) h += `<div class="row"><div><b>New class</b><span>${esc(C.name)}’s multiclass proficiencies only; saves stay ${S.cls.name}’s.</span></div></div>`;
    h += `</div>`;
    // hit points: the fixed value or a roll
    const con = S.M.con, hpV = d.hpMode === 'roll' ? d.hpRoll : plan.avg;
    h += `<div class="grouph"><span>Hit points: d${plan.hd} ${sgn(con)} Con</span><span class="chip" data-go="srd-fixed-hit-points-by-class">fixed p.${printIndex['srd-fixed-hit-points-by-class']?.page || ''}</span></div><div class="opts">
      <button class="opt${d.hpMode === 'avg' ? ' sel' : ''}" data-srd="hp" data-pc="${pc.id}" data-v="avg"><b>Take ${plan.avg}<em>${Math.max(1, plan.avg + con)} HP</em></b><span>the fixed value</span></button>
      <button class="opt${d.hpMode === 'roll' ? ' sel' : ''}" data-srd="hproll" data-pc="${pc.id}"><b>⚄ ${d.hpRoll ? `Rolled ${d.hpRoll}` : `Roll d${plan.hd}`}<em>${d.hpRoll ? Math.max(1, d.hpRoll + con) + ' HP' : ''}</em></b><span>${d.hpRoll ? 'roll again, or keep it' : 'once rolled, it stands unless you roll again'}</span></button></div>`;
    if (plan.needSub) h += `<div class="grouph"><span>Subclass</span></div><div class="opts"><button class="opt sel"><b>${esc(C.subclass.name)}<em>p.${printIndex[C.subclass.src]?.page || ''}</em></b><span>${esc(printIndex[C.subclass.src]?.text || '')} The SRD prints one subclass per class.</span></button></div>`;
    if (plan.asi || plan.boon) {
      h += `<div class="grouph"><span>${plan.boon ? 'Epic Boon or a feat' : 'Ability scores or a feat'}</span></div><div class="seg era"><button class="${d.asiMode === 'asi' ? 'sel' : ''}" data-srd="asimode" data-pc="${pc.id}" data-v="asi">+2 / +1 +1</button><button class="${d.asiMode === 'feat' ? 'sel' : ''}" data-srd="asimode" data-pc="${pc.id}" data-v="feat">A feat</button></div>`;
      if (d.asiMode === 'asi') { const used = Object.values(d.asi).reduce((t, v) => t + v, 0); h += `<div class="opts three">`;
        AB.forEach(k => h += `<button class="opt${d.asi[k] ? ' sel' : ''}" data-srd="asi" data-pc="${pc.id}" data-k="${k}" ${S.a[k] >= 20 && !d.asi[k] ? 'disabled' : ''}><b>${ABN[k]}<em>${d.asi[k] ? '+' + d.asi[k] : ''}</em></b><span>${S.a[k]} → ${Math.min(20, S.a[k] + (d.asi[k] || 0))} · ${2 - used} left</span></button>`); h += `</div>`; }
      else { h += `<div class="opts">`; R.D.feats.filter(f => (f.cat === 'general' && f.id !== 'asi') || (plan.boon && f.cat === 'boon') || (f.cat === 'style' && Object.keys(S.byCls).some(c => ['fighter', 'paladin', 'ranger'].includes(c)))).forEach(f => {
          const taken = S.feats.some(x => x.id === f.id) && !f.repeat, pre = !f.prereq || Object.entries(f.prereq).some(([k, v]) => S.a[k] >= v);
          h += `<button class="opt${d.feat === f.id ? ' sel' : ''}" data-srd="feat" data-pc="${pc.id}" data-v="${f.id}" ${taken || !pre ? 'disabled' : ''}><b>${esc(f.name)}<em>${f.cat}</em></b><span>${esc(f.text)}</span></button>`; });
        h += `</div>`; const F = R.FT[d.feat];
        if (F?.plus) { const opts = F.plus === 'any30' ? AB : F.plus; h += `<div class="seg era">${opts.map(k => `<button class="${d.featPlus === k ? 'sel' : ''}" data-srd="featplus" data-pc="${pc.id}" data-v="${k}">${k.toUpperCase()} +1</button>`).join('')}</div>`; } }
    }
    if (plan.style) { h += `<div class="grouph"><span>Fighting Style feat</span></div><div class="opts">`; R.D.feats.filter(f => f.cat === 'style').forEach(f => h += `<button class="opt${d.style === f.id ? ' sel' : ''}" data-srd="style" data-pc="${pc.id}" data-v="${f.id}" ${S.feats.some(x => x.id === f.id) ? 'disabled' : ''}><b>${esc(f.name)}</b><span>${esc(f.text)}</span></button>`); h += `</div>`; }
    if (plan.expertise) { h += `<div class="grouph"><span>Expertise: two proficient skills</span><span>${d.expertise.length}/2</span></div><div class="opts three">`;
      R.D.skills.filter(s => S.skill[s.id].prof && !S.skill[s.id].ex).forEach(s => h += `<button class="opt${d.expertise.includes(s.id) ? ' sel' : ''}" data-srd="exp" data-pc="${pc.id}" data-v="${s.id}"><b>${esc(s.name)}<em>${sgn(S.skill[s.id].v)}</em></b></button>`); h += `</div>`; }
    // spells the level adds: new cantrips and spells from the class list, up to the level it can cast
    if (C.caster && (plan.newCantrips || plan.newSpells)) {
      const have = new Set(S.spells.map(s => s.id)), tab = spTab[pc.id + ':lv'] ?? (plan.newSpells ? plan.topThen : 0);
      const lvls = [...(plan.newCantrips ? [0] : []), ...(plan.newSpells ? Array.from({ length: plan.topThen }, (_, i) => i + 1) : [])];
      h += `<div class="grouph"><span>New spells: ${plan.newCantrips ? `${d.cantrips.length}/${plan.newCantrips} cantrips · ` : ''}${d.spells.length}/${plan.newSpells} ${C.id === 'wizard' ? 'for the spellbook' : 'prepared'}, up to level ${plan.topThen}</span></div><div class="seg era srdwrap">`;
      h += lvls.map(l => `<button class="${tab === l ? 'sel' : ''}" data-srd="lvtab" data-pc="${pc.id}" data-v="${l}" aria-pressed="${tab === l}">${l ? 'Level ' + l : 'Cantrips'}</button>`).join('') + `</div><div class="opts three">`;
      R.D.spells.filter(s => s.lv === tab && s.cls.includes(C.id) && !have.has(s.id)).forEach(s => { const L = s.lv ? d.spells : d.cantrips;
        h += `<button class="opt${L.includes(s.id) ? ' sel' : ''}" data-srd="${s.lv ? 'lvsp' : 'lvcan'}" data-pc="${pc.id}" data-v="${s.id}"><b>${esc(s.name)}<em>${spellLine(s)}</em></b><span>${esc(s.text)}</span></button>`; });
      h += `</div>`;
    }
    const miss = [];
    if (d.hpMode === 'roll' && !d.hpRoll) miss.push('roll the hit die');
    if ((plan.asi || plan.boon) && d.asiMode === 'asi' && Object.values(d.asi).reduce((t, v) => t + v, 0) !== 2) miss.push('place the ability increase');
    if ((plan.asi || plan.boon) && d.asiMode === 'feat' && (!d.feat || (R.FT[d.feat]?.plus && !d.featPlus))) miss.push('choose the feat');
    if (plan.style && !d.style) miss.push('choose a fighting style');
    if (plan.expertise && d.expertise.length < 2) miss.push('choose two expertise skills');
    h += `<button class="opt sel donebtn" data-act="srdlevel" data-pc="${pc.id}" ${miss.length ? 'disabled' : ''}><b>Level up to ${S.level + 1}: ${esc(C.name)} ${plan.n}</b><span>${miss.length ? 'First: ' + miss.join(', ') : `+${Math.max(1, hpV + con)} HP · filed under S${n}`}${plan.newSpells && d.spells.length < plan.newSpells ? ` · ${plan.newSpells - d.spells.length} spell picks left (may be chosen later)` : ''}</span></button>`;
  }
  // the levels so far, and taking the last one back
  const past = S.levels.slice(1);
  if (past.length) {
    h += `<div class="grouph"><span>Levels so far</span><span>${S.levels.length} in all</span></div><div class="rows one">` + past.slice().reverse().slice(0, 12).map(l => `<div class="row on"><div><b>Level ${l.n} · ${esc(R.CLS[l.cls]?.name || l.cls)}${l.s != null ? ` · S${l.s}` : ''}</b><span>${esc(advanceText({ level: l }).replace(/^level up: [^,]+, /, ''))}</span></div></div>`).join('') + `</div>`;
    h += `<button class="opt" data-act="srdback" data-pc="${pc.id}"><b>Take back level ${S.level}</b><span>undoes the most recent level (HP, features, spells); the XP stays</span></button>`;
  }
  return h;
}

// ---------------------------------------------------------------- rolls
function rollHtml(r) {
  if (r.kind === 'dmg') return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">${esc(r.spec)}${r.crit ? ' · critical' : ''}</span><span class="dd">${r.dice.map(x => `<i>${x.v}</i>`).join('')}${r.mod ? `<i>${sgn(r.mod)}</i>` : ''}</span><span class="verdict">${r.total}</span></div>`;
  const cls = r.crit ? 'ok big' : r.fumble ? 'bad' : '';
  return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">d20${r.mod ? ' ' + sgn(r.mod) : ''}${r.adv > 0 ? ' · advantage' : r.adv < 0 ? ' · disadvantage' : ''}</span><span class="dd">${r.d.map((v, i) => `<i class="${v === r.pick && (i === r.d.indexOf(r.pick)) ? 'ok' : ''}">${v}</i>`).join('')}</span><span class="verdict${r.fumble ? ' fail' : ''}">${r.total}${r.crit ? (r.kind === 'atk' ? ' · critical hit' : ' · natural 20') : r.fumble ? (r.kind === 'atk' ? ' · miss' : ' · natural 1') : ''}</span></div>`;
}
function pushRoll(pc, rec, at) { const k = pc ? pc.id : '_free'; (state.rolls[k] = state.rolls[k] || []).unshift(rec); state.rolls[k] = state.rolls[k].slice(0, 8); persist(); toast(rec, at); logPush({ kind: 'roll', who: pc ? pc.id : 'gm', rec }); }
const lastCrit = {};
function d20For(pc, m, label, kind, at) { const adv = pc ? (advSel[pc.id] || 0) : 0, r = R.roll(m, adv); const rec = { ...r, label: `${pc ? (choicesOf(pc).name || WORDS.Char) + ' · ' : ''}${label}`, kind };
  if (pc && kind === 'atk') lastCrit[pc.id] = r.crit; pushRoll(pc, rec, at); return rec; }
function dmgFor(pc, spec, label, at) { const crit = pc ? !!lastCrit[pc.id] : false, r = R.rollDice(spec, crit); if (pc) lastCrit[pc.id] = false;
  const rec = { kind: 'dmg', label: `${pc ? (choicesOf(pc).name || WORDS.Char) + ' · ' : ''}${label}`, spec, crit, dice: r.dice, mod: r.mod, total: r.total }; pushRoll(pc, rec, at); return rec; }

// portraits: no fantasy figures in the Turnip Works set yet; the nearest close-ups by class and species, or drop your own
const CLS_TOKEN = { wizard: 'mage', sorcerer: 'mage', warlock: 'shaman', cleric: 'shaman', druid: 'shaman', bard: 'face', fighter: 'merc', barbarian: 'merc', paladin: 'street-samurai', ranger: 'adept', rogue: 'decker', monk: 'adept' };
const SP_TOKEN = { elf: 'elf', dwarf: 'dwarf', orc: 'ork', goliath: 'troll', gnome: 'dwarf', halfling: 'human', human: 'human', tiefling: 'elf', dragonborn: 'troll' };
function portraitOf(pc, S) {
  const ch = choicesOf(pc), role = CLS_TOKEN[ch.cls] || 'face', kin = SP_TOKEN[ch.species] || 'human';
  const keys = Object.keys(TOKEN_FILES).filter(k => !k.startsWith('modern-'));
  const pick = [...keys.filter(k => k.startsWith(role) && k.includes(kin)), ...keys.filter(k => k.startsWith(role)), ...keys.filter(k => k.includes('-' + kin + '-'))];
  const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
  const options = [...new Set([...pick, ...keys])].slice(0, 4).map(k => close(TOKEN_FILES[k])).filter(Boolean);
  return { src: close(state.portraits[pc.id] || options[0] || ''), options };
}
function liveOf(pc) { const L = state.live[pc.id] || (state.live[pc.id] = {}); L.lost = L.lost || 0; L.temp = L.temp || 0; L.slots = L.slots || {}; L.res = L.res || {}; L.cond = L.cond || []; L.ds = L.ds || { ok: 0, bad: 0 }; return L; }

// ---------------------------------------------------------------- the sheet
function renderSheet(pc) {
  const box = sheetEls[pc.id], ch = choicesOf(pc), S = sheetOf(pc), asOf = state.asof[pc.id] ?? 99, live = liveOf(pc), adv = advSel[pc.id] || 0;
  const nm = ch.name || `New ${WORDS.char}`;
  const clsTxt = Object.entries(S.byCls).map(([c, n]) => `${R.CLS[c].name} ${n}${S.sub[c] ? ' (' + R.CLS[c].subclass.name + ')' : ''}`).join(' / ');
  const who = [S.sp ? (S.sp.lineage && ch.lineage ? S.sp.lineage.opts.find(o => o.id === ch.lineage)?.name || S.sp.name : S.sp.name) : null, clsTxt || null, S.bg?.name].filter(Boolean).join(' · ') || 'Not built yet';
  const prev = box._prev || {};
  const pv = (key, v, cls = '', suffix = '') => `<span class="pv ${cls}${prev[key] != null && prev[key] !== v ? ' changed' : ''}" data-prov="${esc(key)}" tabindex="0">${v}${suffix}</span>`;
  const chip = (id, lab) => printIndex[id] ? `<span class="chip" data-go="${id}">${lab || 'p.' + printIndex[id].page}</span>` : '';
  const has = new Set(karmaOf(pc).map(k => k.s));
  const asofBtns = ['Start', ...C.sessions.map(s => 'S' + s.n), 'Now'].map((lab, i) => { const val = lab === 'Now' ? 99 : i; const on = asOf === val; return `<button data-act="asof" data-pc="${pc.id}" data-v="${val}" class="${on ? 'on' : ''}${has.has(i) ? ' has' : ''}" aria-pressed="${on}">${lab}</button>`; }).join('');
  const die = (m, label, kind, extra = '') => `<button class="die" data-act="roll" data-pc="${pc.id}" data-mod="${m}" data-kind="${kind}" data-label="${esc(label)}"${extra} title="Roll ${esc(label)}: d20 ${sgn(m)}" aria-label="Roll ${esc(label)}">⚄</button>`;
  const hpNow = Math.max(0, S.hp - live.lost), pct = S.next ? Math.min(100, Math.round((S.xp - R.XP[S.level - 1]) / (S.next - R.XP[S.level - 1]) * 100)) : 100;
  // abilities and saves
  const abil = AB.map(k => `<div class="srdabx"><div class="k" data-rule-of="a:${k}" role="link" tabindex="0">${ABN[k]}</div>${pv('a:' + k, S.a[k], 'mid')}<div class="srdmod">${sgn(S.M[k])} ${die(S.M[k], ABN[k] + ' check', 'chk')}</div>
    <div class="srdsv${S.save[k].prof ? ' on' : ''}"><span>${S.save[k].prof ? '●' : '○'} save</span>${pv('sv:' + k, sgn(S.save[k].v))}${die(S.save[k].v, ABN[k] + ' save', 'save')}</div></div>`).join('');
  const skills = R.D.skills.map(s => { const x = S.skill[s.id]; return `<div class="sk${x.prof ? '' : ' zero'}"><span class="srddot">${x.ex ? '◆' : x.prof ? '●' : '○'}</span><span class="k" data-rule-of="s:${s.id}" role="link" tabindex="0">${esc(s.name)}</span><span class="srdab3">${s.ab.toUpperCase()}</span>${pv('s:' + s.id, sgn(x.v), 'mid')}${die(x.v, s.name, 'chk')}</div>`; }).join('');
  const atk = S.attacks.map(w => { const dm = `${w.dmg}${w.dmgMod ? (w.dmgMod > 0 ? '+' : '') + w.dmgMod : ''}`;
    return `<div class="srdatk"><b>${esc(w.name)}</b><span class="e">${esc(w.type.toLowerCase())}${w.props.length ? ' · ' + esc(w.props.join(', ')) : ''}${w.mastery && S.mast ? ' · ' + esc(w.mastery) : ''}${w.prof ? '' : ' · not proficient'}</span>
      <button class="die wide" data-act="roll" data-pc="${pc.id}" data-mod="${w.hit}" data-kind="atk" data-label="${esc(w.name)} attack" aria-label="Roll ${esc(w.name)} attack">⚄ ${sgn(w.hit)} to hit</button><button class="die wide" data-act="roll" data-pc="${pc.id}" data-dmg="${esc(dm)}" data-label="${esc(w.name)} damage" aria-label="Roll ${esc(w.name)} damage">⚄ ${esc(dm)}</button></div>`; }).join('');
  const feats = S.feats.map(f => ({ name: R.FT[f.id]?.name || f.id, cls: f.from, src: R.FT[f.id]?.src, text: R.FT[f.id]?.text }));
  const featureRows = [...S.features.map(f => ({ ...f, text: printIndex[f.src]?.text })), ...feats, ...(S.sp ? S.sp.traits.map(t => ({ name: t.name, cls: S.sp.name, src: S.sp.src, text: t.text })) : [])]
    .map(f => `<div class="srdft"><span class="k" data-go="${f.src || ''}" role="link" tabindex="0">${esc(f.name)}</span><span class="srdfrom">${esc(f.cls || '')}${f.lv ? ' ' + f.lv : ''}</span><span class="e">${esc(f.text || '')}</span></div>`).join('');
  const res = S.res.map(r => { const used = live.res[r.name] || 0;
    return `<div class="srdres"><span class="k" data-go="${r.src}" role="link" tabindex="0">${esc(r.name)}</span>${r.note ? `<span class="e">${esc(r.note)}</span>` : ''}${r.n && !r.pool ? `<span class="srdpips">${Array.from({ length: r.n }, (_, i) => `<button class="${i < used ? 'L' : ''}" data-srd="res" data-pc="${pc.id}" data-v="${esc(r.name)}" data-i="${i}" aria-label="${esc(r.name)} use ${i + 1}">${i < used ? '×' : ''}</button>`).join('')}</span>` : r.pool ? `<span class="e">${Math.max(0, r.n - used)} of ${r.n} left</span>` : ''}</div>`; }).join('');
  // spells: slot trackers, then every spell they hold as a small card, by level (a dense section: read by zooming in)
  const slotRow = (lab, n, key) => n ? `<div class="srdslot"><span class="k">${lab}</span>${Array.from({ length: n }, (_, i) => `<button class="${i < (live.slots[key] || 0) ? 'L' : ''}" data-srd="slot" data-pc="${pc.id}" data-v="${key}" data-i="${i}" aria-label="${lab} slot ${i + 1}">${i < (live.slots[key] || 0) ? '×' : ''}</button>`).join('')}</div>` : '';
  const slots = S.slots.map((n, i) => slotRow(`Level ${i + 1}`, n, 's' + (i + 1))).join('') + (S.pact ? slotRow(`Pact (level ${S.pact.lv})`, S.pact.n, 'pact') : '');
  const castHead = S.casting.map(c => `<div class="srdcast"><b>${esc(c.name)}</b><span>${ABN[c.ab]} · save DC ${pv('dc:' + c.cls, c.dc)}</span><button class="die wide" data-act="roll" data-pc="${pc.id}" data-mod="${c.atk}" data-kind="atk" data-label="${esc(c.name)} spell attack" aria-label="Roll ${esc(c.name)} spell attack">⚄ spell attack ${sgn(c.atk)}</button><span class="e">${c.nCantrips}/${c.cantrips} cantrips · ${c.book != null ? `${c.book} in the book, ${c.nPrepared}/${c.prepared} prepared` : `${c.nPrepared}/${c.prepared} prepared`}</span></div>`).join('');
  const byLv = {}; S.spells.forEach(s => (byLv[s.lv] = byLv[s.lv] || []).push(s));
  const spellCards = Object.keys(byLv).sort((x, y) => x - y).map(l => `<div class="srdsplv"><div class="srdsph">${+l ? 'Level ' + l : 'Cantrips'} <span>${byLv[l].length}</span></div><div class="srdspg">${byLv[l].sort((x, y) => x.name.localeCompare(y.name)).map(s => {
    const cast = S.casting.find(c => c.cls === s.from) || S.casting[0], dice = (s.text.match(/\b\d+d\d+\b/) || [])[0], att = /spell attack/i.test(s.text);
    const book = s.from === 'wizard' && s.lv > 0 && !s.always;
    return `<div class="srdcard${s.prepared ? '' : ' unprep'}"><div class="srdcn"><span class="k" data-rule-of="sp:${s.id}" role="link" tabindex="0">${esc(s.name)}</span><span class="srdsch">${s.lv ? 'L' + s.lv : 'C'} ${esc(s.school)}${s.conc ? ' · C' : ''}${s.ritual ? ' · R' : ''}</span></div>
      <div class="srdmeta">${esc(s.time)} · ${esc(s.range)} · ${esc(s.comp)} · ${esc(s.dur)}${s.from === 'feat' ? ' · Magic Initiate' : s.always ? ' · always prepared' : ''}</div><div class="e">${esc(s.text)}</div>
      ${att || dice || book ? `<div class="srdcb2">${att && cast ? `<button class="die wide" data-act="roll" data-pc="${pc.id}" data-mod="${cast.atk}" data-kind="atk" data-label="${esc(s.name)}" aria-label="Roll ${esc(s.name)} attack">⚄ ${sgn(cast.atk)}</button>` : ''}${dice ? `<button class="die wide" data-act="roll" data-pc="${pc.id}" data-dmg="${dice}" data-label="${esc(s.name)}" aria-label="Roll ${esc(s.name)} ${dice}">⚄ ${dice}</button>` : ''}${book ? `<button class="die wide${s.prepared ? ' on' : ''}" data-act="toggle" data-pc="${pc.id}" data-path="prepared" data-v="${s.id}" aria-pressed="${!!s.prepared}" aria-label="${s.prepared ? 'Unprepare' : 'Prepare'} ${esc(s.name)}">${s.prepared ? 'prepared' : 'in the book'}</button>` : ''}</div>` : ''}</div>`; }).join('')}</div></div>`).join('');
  const conds = R.D.conditions.map(c => `<button class="srdcond${live.cond.includes(c.id) ? ' sel' : ''}" data-srd="cond" data-pc="${pc.id}" data-v="${c.id}" aria-pressed="${live.cond.includes(c.id)}" title="${esc(c.text)}">${esc(c.name)}</button>`).join('');
  const tok = portraitOf(pc, S);
  box.innerHTML = `
    <div class="main">
    <section class="sA srdA">
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget srdlv">
        <div><div class="k" data-rule-of="lvl" role="link" tabindex="0">Level</div><div class="bv">${pv('lvl', S.level)}</div></div>
        <div><div class="k" data-rule-of="xp" role="link" tabindex="0">Experience</div><div class="bv">${pv('xp', S.xp.toLocaleString())} <span class="tn">${S.next ? 'of ' + S.next.toLocaleString() : 'top'}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
        <div><div class="k" data-rule-of="pb" role="link" tabindex="0">Proficiency</div><div class="bv">${pv('pb', sgn(S.pb))}</div></div>
      </div>
      ${S.canLevel && asOf === 99 ? `<button class="btn srdup" data-go="b-${pc.id}-level">Level ${S.level + 1} is ready: open the level step</button>` : ''}
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
    </section>
    <section class="srdAb srdab">
      <h4>Abilities ${chip(P.abil)} ${chip(P.saves, 'saves')}</h4>
      <div class="srdabg">${abil}</div>
      <div class="srdadv"><span class="k">Next roll ${chip(P.adv2, 'advantage')}</span><div class="seg">${[[0, 'Normal'], [1, 'Advantage'], [-1, 'Disadvantage']].map(([v, l]) => `<button class="${adv === v ? 'sel' : ''}" data-srd="adv" data-pc="${pc.id}" data-v="${v}" aria-pressed="${adv === v}">${l}</button>`).join('')}</div></div>
    </section>
    <section class="srdCb srdcb">
      <h4>Combat ${chip(P.attack, 'attacks')} ${chip(P.crit, 'criticals')}</h4>
      <div class="der">
        <div><div class="k" data-rule-of="ac" role="link" tabindex="0">Armour Class</div>${pv('ac', S.ac, 'mid')}<small>${esc(S.acHow)}</small></div>
        <div><div class="k" data-rule-of="hp" role="link" tabindex="0">Hit points</div><span class="pv mid">${hpNow}</span><small>of ${pv('hp', S.hp)}${live.temp ? ` · +${live.temp} temporary` : ''} · d${S.cls?.hd || '—'} × ${S.level}</small></div>
        <div><div class="k" data-rule-of="init" role="link" tabindex="0">Initiative</div>${pv('init', sgn(S.init), 'mid')}<small>${die(S.init, 'Initiative', 'chk')}</small></div>
        <div><div class="k" data-rule-of="spd" role="link" tabindex="0">Speed</div>${pv('spd', S.speed, 'mid')}<small>feet</small></div>
      </div>
      <div class="track srdhp"><span class="k">Damage ${chip(P.hp)}</span>${[[-10, '−10'], [-5, '−5'], [-1, '−1'], [1, '+1'], [5, '+5'], [10, '+10']].map(([d, l]) => `<button class="btn" data-act="srdhp" data-pc="${pc.id}" data-d="${d}" aria-label="${d < 0 ? 'Take' : 'Heal'} ${Math.abs(d)}">${l}</button>`).join('')}<button class="btn" data-act="srdrest" data-pc="${pc.id}" aria-label="Long rest">Long rest</button>${hpNow === 0 && S.hp ? `<span class="wound">down: death saves ${chip(P.death)}</span>` : ''}</div>
      <div class="list l-weapons">${atk}</div>
      <div class="srdconds">${conds}</div>
      <div class="rolls">${(state.rolls[pc.id] || []).slice(0, 2).map(rollHtml).join('') || '<div class="none">Tap ⚄ to roll: d20 + the number beside it.</div>'}</div>
    </section>
    <section class="sP srdP">
      <div class="portrait closeup" data-portrait="${pc.id}" title="Drop an image here, or pick a figure below"><img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span></div>
      <div class="tokens">${tok.options.map(o => `<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this figure"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
    </section>
    <section class="srdSk srdsk">
      <h4>Skills ${chip(P.skills)}</h4>
      <div class="srdskl">${skills}</div>
    </section>
    <section class="srdFt dense">
      <h4>Features ${S.cls ? chip(S.cls.table, 'class table') : ''} ${chip(P.feats, 'feats')}</h4>
      <div class="srdres2">${res}</div>
      <div class="srdfts">${featureRows || '<div class="none">Choose a species, class and background.</div>'}</div>
    </section>
    <section class="srdSp srdsp dense">
      <h4>Spells ${chip(P.spells)} ${chip(P.conc, 'concentration')} ${S.casting.length ? `<span class="srdcount">${S.spells.length} spells</span>` : ''}</h4>
      ${castHead}<div class="srdslots">${slots}</div>
      ${spellCards ? `<div class="srdspl">${spellCards}</div>` : '<div class="none">No spells.</div>'}
    </section>
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl over blbl'); bl.innerHTML = 'BUILDER<br>AND LEVELS'; bl.style.fontSize = '60px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 60, over: true });
  if (!ch.cls && !state.done[pc.id]) box.querySelector('.builder').classList.add('todo');
  box._prev = { lvl: S.level, xp: S.xp.toLocaleString(), pb: sgn(S.pb), ac: S.ac, hp: S.hp, init: sgn(S.init), spd: S.speed, ...Object.fromEntries(AB.map(k => ['a:' + k, S.a[k]])), ...Object.fromEntries(AB.map(k => ['sv:' + k, sgn(S.save[k].v)])), ...Object.fromEntries(R.D.skills.map(s => ['s:' + s.id, sgn(S.skill[s.id].v)])) };
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  fitSections(box);
  // the round order and dice tray only change when what they show changes (a sheet render is not reason enough)
  if (!tableReady || tableSig() !== lastTableSig) renderQuick(); dirty = true;
}
let lastTableSig = '';
function tableSig() { return PCS.map(pc => { const L = liveOf(pc), ch = choicesOf(pc); return [pc.id, ch.name, ch.cls, ch.species, ch.abil?.base?.dex, state.portraits[pc.id], L.lost, L.temp, L.cond.join(), JSON.stringify(state.adv[pc.id] || []), state.asof[pc.id], initRoll[pc.id]?.total].join('|'); }).join(';') + fightN + ':' + turn.round + ':' + turn.at + ':' + (state.rolls._free || []).length + JSON.stringify(qdice2); }
function box_who(pc) { renderSheet(pc); }

// ---------------------------------------------------------------- round order and dice tray
// initiative is rolled once when a fight starts (d20 + the sheet's Initiative) and kept until the next fight
function initiative() { return PCS.filter(pc => choicesOf(pc).name).map(pc => ({ pc, S: sheetOf(pc), r: initRoll[pc.id] })).sort((a, b) => ((b.r?.total ?? -99) - (a.r?.total ?? -99)) || (b.S.a.dex - a.S.a.dex)); }
const qdice2 = { n: 2, f: 6, mod: 0 };
const FACES = [4, 6, 8, 10, 12, 20, 100];
function trayStep(k, d) { if (k === 'n') qdice2.n = Math.max(1, Math.min(20, qdice2.n + d)); else if (k === 'f') qdice2.f = FACES[Math.max(0, Math.min(FACES.length - 1, FACES.indexOf(qdice2.f) + d))]; else qdice2.mod = Math.max(-20, Math.min(30, qdice2.mod + d)); }
function trayRoll(el) { const t = el.dataset.troll; if (t === 'adv' || t === 'dis' || t === 'd20') { const r = R.roll(qdice2.mod, t === 'adv' ? 1 : t === 'dis' ? -1 : 0); pushRoll(null, { ...r, label: `d20${qdice2.mod ? ' ' + sgn(qdice2.mod) : ''}`, kind: 'chk' }, el); renderTable(); return; }
  freeRoll(`${qdice2.n}d${qdice2.f}${qdice2.mod ? (qdice2.mod > 0 ? '+' : '') + qdice2.mod : ''}`, null, el); }
function freeRoll(spec, label, at) { const r = R.rollDice(spec); pushRoll(null, { kind: 'dmg', label: label || `Roll ${spec}`, spec: String(spec), dice: r.dice, mod: r.mod, total: r.total }, at); renderTable(); }
function tstep2(k) { return `<span class="stepper"><button data-ts="${k}" data-d="-1" aria-label="Lower">−</button><output>${k === 'mod' ? sgn(qdice2.mod) : qdice2[k]}</output><button data-ts="${k}" data-d="1" aria-label="Raise">+</button></span>`; }
function rollInitiative(at) { fightN++; turn.at = 0; turn.round = 1;
  PCS.filter(pc => choicesOf(pc).name).forEach(pc => { const S = sheetOf(pc); initRoll[pc.id] = R.roll(S.init, 0); });
  logPush({ kind: 'note', who: 'gm', text: `initiative for fight ${fightN}: ` + initiative().map(x => `${choicesOf(x.pc).name} ${x.r.total}`).join(', ') }); historyNote(`Rolled initiative (fight ${fightN})`); renderTable(); }
function renderTable() {
  lastTableSig = tableSig();
  const o = initiative(); if (turn.at >= o.length) turn.at = 0; const rolled = o.some(x => x.r);
  roundCard.innerHTML = `<div class="fit"><h3>Round order ${printIndex[P.init] ? `<span class="chip" data-go="${P.init}">p.${printIndex[P.init].page}</span>` : ''}</h3><div class="t">Initiative is rolled once when a fight starts: d20 + Dex (Alert adds the proficiency bonus); highest goes first, ties to the higher Dex. It stands until the next fight.</div>
    <div class="rmeta">${rolled ? `Fight ${fightN} · round ${turn.round}` : 'No fight yet'} <button class="tb" data-srd="init">${rolled ? 'New fight: roll again' : 'Roll initiative'}</button><button class="tb" data-turn="next">Next ›</button><button class="tb" data-turn="reset">New round</button></div>
    <ol class="init">${o.map(({ pc, S, r }, i) => { const live = liveOf(pc), tok = portraitOf(pc, S).src, now = Math.max(0, S.hp - live.lost);
      return `<li class="${i === turn.at && rolled ? 'on' : ''}"><span class="closeup rimg"><img src="${tok}" alt="" draggable="false"></span><span class="who2" data-go="${pc.id}">${esc(choicesOf(pc).name)}</span><span class="nums">${r ? `<b>${r.total}</b> (d20 ${r.pick} ${sgn(S.init)})` : `initiative ${sgn(S.init)}`} · AC ${S.ac} · HP ${now}/${S.hp}${live.cond.length ? ' · ' + live.cond.map(c => R.COND[c]?.name).join(', ') : ''}</span></li>`; }).join('')}</ol></div>`; fitCard(roundCard);
  diceCard.innerHTML = `<div class="fit"><h3>Dice tray ${printIndex[P.d20] ? `<span class="chip" data-go="${P.d20}">p.${printIndex[P.d20].page}</span>` : ''}</h3><div class="t">A pool of dice plus a modifier, or a d20 with advantage (higher of two) or disadvantage (lower of two).</div>
    <div class="qdice"><label>Dice ${tstep2('n')}</label><label>d ${tstep2('f')}</label><label>Mod ${tstep2('mod')}</label><button class="tb go" data-troll="1">Roll ${qdice2.n}d${qdice2.f}${qdice2.mod ? (qdice2.mod > 0 ? '+' : '') + qdice2.mod : ''}</button></div>
    <div class="qdice"><button class="tb go" data-troll="d20">d20 ${sgn(qdice2.mod)}</button><button class="tb go" data-troll="adv">d20 with advantage</button><button class="tb go" data-troll="dis">d20 with disadvantage</button></div>
    <div class="rolls">${[...(state.rolls._free || [])].slice(0, 5).map(rollHtml).join('') || '<div class="none">No rolls yet.</div>'}</div></div>`; fitCard(diceCard);
}

// ---------------------------------------------------------------- quickbar
function rigCommands(q, ws, nums, pcw) {
  const out = [], name = pcw ? choicesOf(pcw).name : '';
  const m = q.match(/^\s*(?:roll|r)\s+(.+)$/i);
  if (m) { const spec = m[1].replace(/\s+/g, ''); const d20 = spec.match(/^d20([+-]\d+)?(adv|dis)?$/i);
    if (d20) out.push({ k: 'cmd', t: `Roll d20${d20[1] || ''}${d20[2] ? (d20[2] === 'adv' ? ' with advantage' : ' with disadvantage') : ''}`, run: () => { const r = R.roll(+(d20[1] || 0), d20[2] === 'adv' ? 1 : d20[2] === 'dis' ? -1 : 0); pushRoll(null, { ...r, label: `d20${d20[1] || ''}`, kind: 'chk' }, qb); renderTable(); } });
    else if (/^\d*d\d+([+-]\d*d?\d+)*$/i.test(spec)) out.push({ k: 'cmd', t: `Roll ${spec}`, run: () => freeRoll(spec, null, qb) }); }
  if (pcw) { const S = sheetOf(pcw), rest = ws.filter(w => !(choicesOf(pcw).name || '').toLowerCase().startsWith(w));
    const sk = R.D.skills.find(s => rest.some(w => w.length >= 3 && s.name.toLowerCase().replace(/ /g, '').startsWith(w)));
    const ab = AB.find(k => rest.some(w => w === k || (w.length >= 3 && ABN[k].toLowerCase().startsWith(w))));
    const wpn = S.attacks.find(a => rest.some(w => w.length >= 3 && a.name.toLowerCase().replace(/ /g, '').startsWith(w)));
    const spl = S.spells.find(s => rest.join(' ').length >= 4 && s.name.toLowerCase().startsWith(rest.join(' ')));
    if (sk) out.push({ k: 'cmd', t: `Roll ${name}’s ${sk.name} (${sgn(S.skill[sk.id].v)})`, run: () => { d20For(pcw, S.skill[sk.id].v, sk.name, 'chk', qb); renderSheet(pcw); } });
    if (ab && !sk) { const save = rest.some(w => w.startsWith('sav')); out.push({ k: 'cmd', t: `Roll ${name}’s ${ABN[ab]} ${save ? 'save' : 'check'} (${sgn(save ? S.save[ab].v : S.M[ab])})`, run: () => { d20For(pcw, save ? S.save[ab].v : S.M[ab], `${ABN[ab]} ${save ? 'save' : 'check'}`, save ? 'save' : 'chk', qb); renderSheet(pcw); } }); }
    if (wpn) out.push({ k: 'cmd', t: `${name} attacks with ${wpn.name} (${sgn(wpn.hit)}, then ${wpn.dmg}${wpn.dmgMod ? sgn(wpn.dmgMod) : ''})`, run: () => { d20For(pcw, wpn.hit, `${wpn.name} attack`, 'atk', qb); renderSheet(pcw); } });
    if (spl) out.push({ k: 'cmd', t: `${name}’s ${spl.name}`, run: () => flyTo(sheetEls[pcw.id] ? pcw.id : pcw.id) });
    if (ws[0] === 'xp' || ws[0] === 'award') { const n = nums.find(x => x > 0) || 0; if (n) out.push({ k: 'cmd', t: `Award ${name} ${n.toLocaleString()} XP (filed under S${advSession()})`, run: () => { pushUndo(); awardXp(pcw, n); } }); }
    if (ws[0] === 'level' || ws[0] === 'levelup') out.push({ k: 'cmd', t: `${name}: level up (${S.canLevel ? `level ${S.level + 1} is ready` : S.next ? `${(S.next - S.xp).toLocaleString()} XP to level ${S.level + 1}` : 'at level 20'})`, run: () => flyTo(`b-${pcw.id}-level`) });
    if (ws[0] === 'damage' || ws[0] === 'hurt' || ws[0] === 'hit') { const n = nums[0] || 1; out.push({ k: 'cmd', t: `${name} takes ${n} damage`, run: () => { pushUndo(); hpChange(pcw, -n); } }); }
    if (ws[0] === 'heal') { const n = nums[0]; out.push({ k: 'cmd', t: n ? `Heal ${name} ${n}` : `Heal ${name} to full`, run: () => { pushUndo(); hpChange(pcw, n || 9999); } }); }
  }
  if (['initiative', 'init', 'fight'].some(w => ws[0] === w) && ws.length === 1) out.push({ k: 'cmd', t: 'Roll initiative for a new fight', run: () => { rollInitiative(qb); flyTo('round'); } });
  return out;
}
function hpChange(pc, d) { const L = liveOf(pc), S = sheetOf(pc); if (d < 0 && L.temp) { const t = Math.min(L.temp, -d); L.temp -= t; d += t; } L.lost = Math.max(0, Math.min(S.hp, L.lost - d)); persist(); renderSheet(pc); renderTable(); }
function awardXp(pc, n) { const s = advSession(), e = advEntry(pc, s); e.xp = (e.xp || 0) + n; const S = sheetOf(pc);
  historyNote(`${choicesOf(pc).name || WORDS.Char}: +${n.toLocaleString()} XP after S${s} (${S.xp.toLocaleString()} in all)`); logPush({ kind: 'note', who: pc.id, text: `+${n.toLocaleString()} XP` });
  toast({ msg: `${choicesOf(pc).name || WORDS.Char}: +${n.toLocaleString()} XP`, note: S.canLevel ? `level ${S.level + 1} is ready` : S.next ? `${(S.next - S.xp).toLocaleString()} to level ${S.level + 1}` : '' }); refreshAdv(pc, s); }

// the choices that are not changes to the character (next roll's advantage, the level draft, open lists) skip the
// history and undo; they are handled here, after the engine's capture listeners, so a drag that moved never presses them
document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-srd]'); if (!b || b.disabled) return;
  if (b.dataset.srd === 'init') { rollInitiative(b); return; }
  const pc = pcById[b.dataset.pc]; if (!pc) return; const k = b.dataset.srd, v = b.dataset.v, S = sheetOf(pc);
  if (k === 'adv') advSel[pc.id] = +v;
  else if (k === 'sptab') spTab[pc.id] = +v;
  else if (k === 'lvtab') spTab[pc.id + ':lv'] = +v;
  else if (k === 'wtab') spTab[pc.id + ':w'] = v;
  else if (k === 'xpamt') { const L = [50, 100, 200, 300, 450, 600, 900, 1000, 1800, 2700, 3800, 5000, 7500, 10000, 20000, 50000], i = L.indexOf(xpAmt[pc.id] || 300); xpAmt[pc.id] = L[Math.max(0, Math.min(L.length - 1, i + +b.dataset.d))]; }
  else if (k === 'res') { const L = liveOf(pc), i = +b.dataset.i; L.res[v] = (L.res[v] || 0) > i ? i : i + 1; persist(); }
  else if (k === 'slot') { const L = liveOf(pc), i = +b.dataset.i; L.slots[v] = (L.slots[v] || 0) > i ? i : i + 1; persist(); }
  else if (k === 'cond') { const L = liveOf(pc); L.cond = L.cond.includes(v) ? L.cond.filter(x => x !== v) : [...L.cond, v]; historyNote(`${choicesOf(pc).name}: ${R.COND[v]?.name} ${L.cond.includes(v) ? 'on' : 'off'}`); persist(); renderTable(); }
  else { const d = draftOf(pc, S);
    if (k === 'lvcls') { lvDraft[pc.id] = { ...draftOf(pc, S), cls: v, spells: [], cantrips: [], expertise: [], style: null }; }
    else if (k === 'hp') { d.hpMode = 'avg'; }
    else if (k === 'hproll') { const plan = R.levelPlan(S, d.cls, choicesOf(pc)); d.hpMode = 'roll'; d.hpRoll = 1 + Math.floor(Math.random() * plan.hd);
      const rec = { kind: 'dmg', label: `${choicesOf(pc).name}: hit die for level ${S.level + 1}`, spec: `1d${plan.hd}`, dice: [{ f: plan.hd, v: d.hpRoll }], mod: 0, total: d.hpRoll }; pushRoll(pc, rec, b); }
    else if (k === 'asimode') { d.asiMode = v; }
    else if (k === 'asi') { const kk = b.dataset.k, used = Object.values(d.asi).reduce((t, x) => t + x, 0); if (used >= 2) d.asi = {}; d.asi[kk] = Math.min(2, (d.asi[kk] || 0) + 1); if (S.a[kk] + d.asi[kk] > 20) d.asi[kk] = 20 - S.a[kk]; if (!d.asi[kk]) delete d.asi[kk]; }
    else if (k === 'feat') { d.feat = d.feat === v ? null : v; d.featPlus = null; }
    else if (k === 'featplus') { d.featPlus = v; }
    else if (k === 'style') { d.style = d.style === v ? null : v; }
    else if (k === 'exp') { d.expertise = d.expertise.includes(v) ? d.expertise.filter(x => x !== v) : [...d.expertise, v].slice(-2); }
    else if (k === 'lvsp' || k === 'lvcan') { const plan = R.levelPlan(S, d.cls, choicesOf(pc)), L = k === 'lvsp' ? 'spells' : 'cantrips', max = k === 'lvsp' ? plan.newSpells : plan.newCantrips;
      d[L] = d[L].includes(v) ? d[L].filter(x => x !== v) : [...d[L], v].slice(-max); }
  }
  renderSheet(pc);
});

function rigAct(act, a, pc, ch) {
  if (act === 'roll') {
    if (a.dataset.dmg) { dmgFor(pc, a.dataset.dmg, a.dataset.label, a); renderSheet(pc); return true; }
    d20For(pc, +a.dataset.mod, a.dataset.label, a.dataset.kind, a); renderSheet(pc); return true; }
  if (act === 'rollchars') { ch.abil = { ...(ch.abil || {}), method: 'roll', rolls: R.rollAbilities(), base: {} }; persist(); renderSheet(pc); return true; }
  if (act === 'srdmeth') { ch.abil = { method: a.dataset.v, base: a.dataset.v === 'pointbuy' ? Object.fromEntries(AB.map(k => [k, 8])) : {}, rolls: a.dataset.v === 'roll' ? ch.abil?.rolls || null : null }; persist(); renderSheet(pc); return true; }
  if (act === 'srdab') { const k = a.dataset.k, v = +a.dataset.v, b = ch.abil.base = ch.abil.base || {};
    if (b[k] === v) delete b[k]; else { const other = AB.find(x => x !== k && b[x] === v && (ch.abil.method !== 'roll' || ch.abil.rolls.filter(r => r.v === v).length <= AB.filter(y => y !== k && b[y] === v).length)); if (other) { if (b[k]) b[other] = b[k]; else delete b[other]; } b[k] = v; }
    persist(); renderSheet(pc); return true; }
  if (act === 'srdpb') { const k = a.dataset.k, b = ch.abil.base = ch.abil.base || {}; b[k] = Math.max(8, Math.min(15, (b[k] || 8) + +a.dataset.d)); persist(); renderSheet(pc); return true; }
  if (act === 'srdbgplus') { const k = a.dataset.k, v = +a.dataset.v, P2 = ch.bgPlus = ch.bgPlus || {}; if (v) P2[k] = v; else delete P2[k];
    if (v === 2) Object.keys(P2).forEach(x => { if (x !== k && P2[x] === 2) P2[x] = 1; }); persist(); renderSheet(pc); return true; }
  if (act === 'srdspecies') { const v = a.dataset.v; if (ch.species !== v) { ch.species = v; ch.lineage = null; ch.speciesSkill = null; ch.humanFeat = null; } persist(); renderSheet(pc); return true; }
  if (act === 'srdcls') { const v = a.dataset.v; if (ch.cls !== v) { ch.cls = v; ch.skills = []; ch.expertise = []; ch.cantrips = []; ch.spells = []; ch.prepared = []; ch.style = null; const E = R.CLS[v].equip.A; ch.equip = { ...(ch.equip || {}), cls: 'A' }; applyPack(ch); } persist(); renderSheet(pc); return true; }
  if (act === 'srdbg') { const v = a.dataset.v; if (ch.bg !== v) { ch.bg = v; ch.bgPlus = {}; } applyPack(ch); persist(); renderSheet(pc); return true; }
  if (act === 'srdpack') { ch.equip = { ...(ch.equip || {}), [a.dataset.k]: a.dataset.v }; applyPack(ch); persist(); renderSheet(pc); return true; }
  if (act === 'srdhp') { hpChange(pc, +a.dataset.d); return true; }
  if (act === 'srdrest') { const L = liveOf(pc); L.lost = 0; L.temp = 0; L.slots = {}; L.res = {}; L.ds = { ok: 0, bad: 0 }; historyNote(`${ch.name}: long rest`); persist(); renderSheet(pc); renderTable(); return true; }
  if (act === 'srdxp') { awardXp(pc, +a.dataset.v); return true; }
  if (act === 'srdlevel') {
    const S = sheetOf(pc); if (!S.canLevel) return true; const d = draftOf(pc, S), plan = R.levelPlan(S, d.cls, ch), n = advSession(), e = advEntry(pc, n);
    const lv = { cls: d.cls, hp: d.hpMode === 'roll' && d.hpRoll ? d.hpRoll : plan.avg, hpRoll: d.hpMode === 'roll' ? d.hpRoll : null };
    if (plan.needSub) lv.subclass = plan.C.subclass.id;
    if (plan.asi || plan.boon) { if (d.asiMode === 'asi') lv.asi = { ...d.asi }; else { lv.feat = d.feat; if (d.featPlus) lv.featPlus = d.featPlus; } }
    if (plan.style && d.style) lv.style = d.style;
    if (plan.expertise) lv.expertise = [...d.expertise];
    if (d.spells.length) lv.spells = [...d.spells]; if (d.cantrips.length) lv.cantrips = [...d.cantrips];
    if (plan.mc) { const sk = R.CLS[d.cls].mc.includes('skill1') ? R.CLS[d.cls].skillFrom.find(s => !S.skill[s].prof) : null; if (sk) lv.skills = [sk]; }
    (e.levels = e.levels || []).push(lv); delete lvDraft[pc.id];
    const S2 = sheetOf(pc);
    historyNote(`${ch.name || WORDS.Char} reached level ${S2.level} (${plan.C.name} ${plan.n}) after S${n}: ${advanceText({ level: lv }).replace(/^level up: /, '')}`);
    logPush({ kind: 'note', who: pc.id, text: `level ${S2.level}: ${plan.C.name} ${plan.n}, HP ${S.hp} → ${S2.hp}` });
    toast({ msg: `${ch.name || WORDS.Char}: level ${S2.level}`, note: `${plan.C.name} ${plan.n} · HP ${S.hp} → ${S2.hp}${plan.gains.length ? ' · ' + plan.gains.map(g => g.name).join(', ') : ''}` }, a);
    refreshAdv(pc, n); return true; }
  if (act === 'srdback') {
    const S = sheetOf(pc); if (S.level <= 1) return true; const last = S.levels.at(-1), own = (state.adv[pc.id] || []).find(x => x.id === last.src), n = advSession();
    if (own && (own.levels || []).length) own.levels.pop(); else { const e = advEntry(pc, n); e.back = (e.back || 0) + 1; }
    delete lvDraft[pc.id]; historyNote(`${ch.name || WORDS.Char}: took back level ${S.level} (${R.CLS[last.cls]?.name})`); logPush({ kind: 'note', who: pc.id, text: `took back level ${S.level}` });
    refreshAdv(pc, own ? own.s : n); return true; }
  return false;
}
// a kit fills the weapons and armour it carries (the gold option empties them); the background's kit adds its weapons
function applyPack(ch) {
  const C = R.CLS[ch.cls], bg = R.BG[ch.bg], eq = ch.equip || (ch.equip = { cls: 'A', bg: 'A' });
  const k = C ? C.equip[eq.cls] || C.equip.A : {}, w = new Set([...(k.weapons || []), ...(eq.bg !== 'B' ? bg?.weapons || [] : [])]);
  ch.weapons = [...w]; ch.armor = k.armor || null; ch.shield = !!k.shield;
}
