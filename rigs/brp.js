// Turnip Almanac rig: Basic Roleplaying, from Chaosium's BRP ORC Content Document (ORC licence; "Powered by BRP").
// Mechanics come from rigs/brp-data.json (loaded as window.BRP_DATA by rigs/brp-data.js); every table cites its page.
// Where the book is open or inconsistent, the reading is listed in RIG.interpretations.
window.RIG = (() => {
  const D = window.BRP_DATA;
  const CH = D.characteristics.map(c => c.id);                     // str con siz int pow dex cha edu
  const CH_NAME = Object.fromEntries(D.characteristics.map(c => [c.id, c.name]));
  const SK = Object.fromEntries(D.skills.map(s => [s.id, s]));
  const SKILLS = D.skills;
  const PROF = Object.fromEntries(D.professions.list.map(p => [p.id, p]));
  const LEVELS = Object.fromEntries(D.powerLevels.map(l => [l.id, l]));
  const WEAPONS = D.weapons.map((w, i) => ({ ...w, id: 'w' + i }));
  const W_BY = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
  const ARMOR = D.armor.map((a, i) => ({ ...a, id: 'a' + i }));
  const A_BY = Object.fromEntries(ARMOR.map(a => [a.id, a]));
  const POWERS = ['magic', 'psychic', 'sorcery', 'mutations', 'superpowers'].filter(k => D.powers[k]);
  const powerList = k => (D.powers[k].list || D.powers[k].spells || D.powers[k].powers || []);
  const P = { chars: 'brp-step-1', power: 'brp-power-level', prof: 'brp-professions', profPts: 'brp-step-7', skills: 'brp-skills', powers: 'brp-how-do-characters-get-powers', gear: 'brp-weapons', armor: 'brp-armor', hp: 'brp-hit-points', dmg: 'brp-damage-modifier', rolls: 'brp-skill-results-table', combat: 'brp-combat-round-phases', xp: 'brp-increasing-skills-by-experience', resist: 'brp-resistance-rolls' };

  // --- formulas from the data: a tiny evaluator for "dex*2", "ceil((con+siz)/2)", "int+pow"
  function evalF(f, c) {
    if (typeof f === 'number') return f;
    const expr = String(f).replace(/\b(str|con|siz|int|pow|dex|cha|edu)\b/g, m => `(${c[m] || 0})`).replace(/ceil/g, 'Math.ceil').replace(/floor/g, 'Math.floor');
    if (!/^[\d\s()+\-*/.,Mathceilflor]*$/.test(expr)) return 0;
    try { return Math.round(Function(`return (${expr})`)()); } catch { return 0; }
  }
  const dmgBonus = n => (D.damageBonus.rows.find(r => n >= r.min && n <= r.max) || D.damageBonus.rows.at(-1)).value;
  function baseOf(s, c, ch) {
    if (typeof s.base === 'number') return s.base;
    if (s.baseFormula === 'per weapon' || s.baseFormula === 'per shield') { const w = (ch.weapons || []).map(id => W_BY[id]).find(w => w && skillOfWeapon(w) === s.id); return w ? parseInt(w.base) || 0 : 0; }
    if (s.baseFormula && /winged/.test(s.baseFormula)) return Math.ceil((c.dex || 0) / 2);
    return s.baseFormula ? evalF(s.baseFormula, c) : 0;
  }
  // a weapon's skill (the data names it "Melee Weapon (Axe)", "Firearm (Pistol)"…) → the skill id
  function skillOfWeapon(w) { const n = (w.skill || '').toLowerCase(); const hit = SKILLS.find(s => n.startsWith(s.name.toLowerCase())); return hit ? hit.id : null; }

  const levelOf = ch => LEVELS[ch.power || 'normal'] || LEVELS.normal;
  function profSkillIds(ch) { const p = PROF[ch.prof]; return new Set(p ? p.skills.filter(x => x.skill).map(x => x.skill) : []); }

  function blank(name = '') { return { name, power: 'normal', char: {}, prof: null, profAlloc: {}, persAlloc: {}, psys: null, powers: [], weapons: [], armor: null, age: null }; }

  // the sheet: characteristics → derived; base + professional + personal points → skills; then experience gains up to asOf
  function compute(ch, xpLog = [], asOf = 99) {
    const c = {}; CH.forEach(k => c[k] = ch.char[k] || 0);
    const rolled = CH.every(k => ch.char[k]);
    const L = levelOf(ch), cap = L.skillCap, profPool = L.profPoints, persPool = Math.max(0, (c.int || 0) * 10);
    const prov = {}; const pv = (k, ...ids) => (prov[k] = prov[k] || []).push(...ids);
    CH.forEach(k => pv('c:' + k, 'B:chars', D.characteristics.find(x => x.id === k).src));
    const pset = profSkillIds(ch);
    let profUsed = 0, persUsed = 0; const warn = [];
    const skill = {};
    SKILLS.forEach(s => {
      const base = baseOf(s, c, ch), pa = pset.has(s.id) ? (ch.profAlloc[s.id] || 0) : 0, pe = ch.persAlloc[s.id] || 0;
      profUsed += pa; persUsed += pe;
      let v = base + pa + pe; pv('s:' + s.id, s.src); if (pa) pv('s:' + s.id, 'B:profskills', P.profPts); if (pe) pv('s:' + s.id, 'B:personal', P.profPts);
      if ((pa || pe) && v > cap) warn.push(`${s.name} ${v}% is over the ${cap}% creation cap.`);
      skill[s.id] = v;
    });
    const xp = { checks: 0, gained: 0 };
    xpLog.filter(k => k.s <= asOf).forEach(k => (k.gain || []).forEach(g => { if (skill[g.skill] != null) { skill[g.skill] += g.n; xp.gained += g.n; xp.checks++; pv('s:' + g.skill, k.id, P.xp); } }));
    const hp = Math.ceil(((c.con || 0) + (c.siz || 0)) / 2);
    pv('hp', P.hp, 'c:con', 'c:siz'); pv('pp', 'c:pow'); pv('dmg', P.dmg, 'c:str', 'c:siz'); pv('mw', P.hp);
    const der = { hp, mw: Math.ceil(hp / 2), pp: c.pow || 0, dmg: dmgBonus((c.str || 0) + (c.siz || 0)), mov: 10, xpBonus: Math.ceil((c.int || 0) / 2), fatigue: (c.str || 0) + (c.con || 0) };
    const croll = {}; (D.characteristicRolls || []).forEach(r => { croll[r.id] = { name: r.name, v: evalF(r.formula, c), src: r.src }; });
    if (!rolled) warn.push('Characteristics are not rolled yet.');
    if (!ch.prof) warn.push('No profession chosen.');
    if (profUsed > profPool) warn.push(`Professional points overspent by ${profUsed - profPool}.`);
    if (persUsed > persPool) warn.push(`Personal points overspent by ${persUsed - persPool}.`);
    if ((c.siz && c.siz < 8) || (c.int && c.int < 8)) warn.push('SIZ and INT must be at least 8.');
    // powers: magic spells by power level; other systems listed without a budget (INTERP)
    let powerNote = '';
    if (ch.psys === 'magic') { const n = D.powers.magic.creation?.byPowerLevel?.[ch.power || 'normal']?.spells; if (n != null && (ch.powers || []).length > n) warn.push(`More than ${n} spells for a ${ch.power || 'normal'} character.`); powerNote = n != null ? `${(ch.powers || []).length} of ${n} spells` : ''; }
    const spend = [{ label: 'Professional points', pts: profUsed, of: profPool, src: ['B:profskills', P.profPts] }, { label: 'Personal points (INT × 10)', pts: persUsed, of: persPool, src: ['B:personal', P.profPts] }];
    return { char: c, rolled, skill, der, croll, prof: PROF[ch.prof] || null, level: L, cap, profPool, persPool, profUsed, persUsed, profLeft: profPool - profUsed, persLeft: persPool - persUsed,
      weapons: (ch.weapons || []).map(id => W_BY[id]).filter(Boolean), armor: A_BY[ch.armor] || null, psys: ch.psys, powers: ch.powers || [], powerNote, xp, spend, warn, prov,
      // the engine's generic fields
      pts: profUsed + persUsed, left: (profPool - profUsed) + (persPool - persUsed) };
  }

  // d100, roll under: critical ≤ 1/20, special ≤ 1/5, success ≤ skill, fumble at the top of the failure range
  function roll(target, rnd = Math.random) {
    const r = 1 + Math.floor(rnd() * 100), t = Math.max(0, target);
    const crit = Math.max(1, Math.ceil(t / 20)), spec = Math.max(1, Math.ceil(t / 5)), fumbleAt = 101 - Math.max(1, 5 - Math.floor((Math.max(t, 1) - 1) / 20));
    let level = r <= crit ? 'critical' : r <= spec ? 'special' : (r <= t || r <= 5) && r < 96 ? 'success' : r >= fumbleAt ? 'fumble' : 'failure';
    return { roll: r, target: t, level, ok: ['critical', 'special', 'success'].includes(level), crit, spec, fumbleAt };
  }
  const resistance = (active, passive) => Math.max(0, Math.min(100, 50 + 5 * (active - passive)));
  const rollDice = (spec, rnd = Math.random) => { const m = String(spec).match(/(\d+)D(\d+)([+-]\d+)?/i); if (!m) return 0; let t = +(m[3] || 0); for (let i = 0; i < +m[1]; i++) t += 1 + Math.floor(rnd() * +m[2]); return t; };
  function rollChars(rnd = Math.random) { const o = {}; D.characteristics.forEach(c => o[c.id] = rollDice(c.roll, rnd)); return o; }

  const interpretations = [
    'Characteristics: 3D6 for STR, CON, POW, DEX, CHA; 2D6+6 for SIZ, INT, EDU, as the book prints. Optional point-buy and redistribution are not offered yet.',
    'Fumbles use the book\'s results table (96–00 for skills to 20%, narrowing as skill rises); its prose says 1/20 of the failure chance, which differs at band edges.',
    'Hit locations: the book prints Abdomen as 8–11, overlapping Left leg; read as 9–11.',
    'Profession lists that say "any two Art skills" or "one appropriate Knowledge skill" offer only the skills they name outright; the rest go to personal points.',
    'Skill category bonuses (optional rule, p.18) are off.',
    'Powers: magic is budgeted by power level (4 spells at Normal); the other four systems are listed for choosing without a budget yet.',
    'The magic spell Ward is costed at 3 PP (its entry), not 1 (the summary table).',
    'Experience: a successful roll made in the Almanac ticks the skill\'s check; the GM takes back checks for Easy rolls. The improvement roll is d100 plus the experience bonus, needing to beat the skill; a gain is 1D6 (1D8 Epic, 1D10 Superhuman), rolled rather than the flat option.',
  ];
  return { D, CH, CH_NAME, SK, SKILLS, PROF, LEVELS, WEAPONS, W_BY, ARMOR, A_BY, POWERS, powerList, P, evalF, baseOf, skillOfWeapon, dmgBonus,
    blank, compute, roll, resistance, rollDice, rollChars, interpretations, name: 'Basic Roleplaying (ORC)' };
})();
