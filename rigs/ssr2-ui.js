// Simplified Shadowrun 2e: the rule-specific half of the app (builder steps, sheet, rolls, summons, round order,
// dice tray, quickbar vocabulary). Inserted by build.sh at /*@RIG-UI@*/ inside the app's scope.
const WORDS = { xp: 'Karma', xpVerb: 'Karma', quickHint: 'Jump or do: tusk guns, roll 6 tn 4, new runner, round order…', char: 'runner', Char: 'Runner', party: 'The party', helpCommands: '<i>tusk guns</i>, <i>roll 6 tn 4</i>, <i>damage tusk 2</i>, <i>heal tusk</i>, <i>new runner</i>' };
// an advancement entry (karma spent) as text for the session cards
function advanceText(k) { return (k.buy || []).map(b => b.skill ? `${R.SK_NAME[b.skill]} → ${b.to}` : `Spell: ${R.SPELL_BY_ID[b.spell].name}`).join(', '); }
const RIG_NO_UNDO = new Set(['roll', 'sroll', 'sum-open', 'sum-cancel']);
const STEP_NAME = { adv: 'advancement', done: 'all done', meta: 'metatype', attr: 'attributes', skills: 'skills', magic: 'magic', cyber: 'cyberware', gear: 'gear', veh: 'vehicles', deck: 'deck & chips', circles: 'social circles', life: 'lifestyle', name: 'name' };
const BCOLS = [['name', 'meta', 'attr', 'life', 'deck'], ['skills', 'magic'], ['cyber', 'veh'], ['gear', 'circles', 'done']];
const ORDER = ['name', 'meta', 'attr', 'skills', 'magic', 'cyber', 'gear', 'veh', 'deck', 'circles', 'life', 'done', 'adv'];
const STEP_RULE = { name: 'p-sheet', meta: 'p-meta', attr: 'p-attr', skills: 'p-skillcost', magic: 'p-trad', cyber: 'p-cyber', gear: 'p-gear', veh: 'p-veh', deck: 'p-decks', circles: 'p-circles', life: 'p-life', done: 'p-start', adv: 'p-karma' };
const STEP_SHEET = { name: '.nm', meta: '.who', attr: '.grid4', skills: '.grid4', magic: '.l-magic', cyber: '.l-cyber', gear: '.l-gear', veh: '.l-veh', deck: '.l-veh', circles: '.l-circles', life: '.l-life', done: '.budget', adv: '.budget' };
const BIW = 880, BGAP = 40, BREG = { x: 30, y: 950, w: 440, h: 320 }, BINNER = { w: 5500, h: 5500 * 320 / 440 };
// how much each step holds (measured at one column's width); the engine splits the builder into golden cells by these
const BAREA = { name: 0.45, meta: 0.9, attr: 0.5, skills: 1.15, magic: 1.0, cyber: 1.2, gear: 1.4, veh: 1.05, deck: 0.75, circles: 0.9, life: 0.45, done: 0.5, adv: 1.1 };
const BK_K = Math.min(BREG.w / BINNER.w, BREG.h / BINNER.h);

function stepHead(S, key, no, title, rule) {
  const used = S.spend.filter(x => x.src[0] === 'B:' + key).reduce((s, x) => s + x.pts, 0);
  return `<div class="q"><span class="no">${no}</span><h3>${title}</h3>${rule ? `<span class="chip" data-go="${rule}">p.${printIndex[rule].page}</span>` : ''}<span class="sub">${used ? used + ' pts · ' : ''}${S.left} left</span></div>`;
}
function stepHtml(pc, S, key) {
  const ch = choicesOf(pc), P = R.P;
  const opt = (path, v, cur, title, eff, cost) => `<button class="opt${cur === v ? ' sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="${path}" data-v="${v}" aria-pressed="${cur === v}"><b>${title}${cost != null ? `<em>${cost}</em>` : ''}</b><span>${eff}</span></button>`;
  const row = (on, title, eff, cost, ctl) => `<div class="row${on ? ' on' : ''}"><div><b>${title}</b><span>${eff}</span><span class="cost">${cost}</span></div>${ctl}</div>`;
  const flag = (path, on, lab) => `<button class="opt${on ? ' sel' : ''}" style="padding:8px 14px" data-act="flag" data-pc="${pc.id}" data-path="${path}">${on ? 'Bought' : lab || 'Buy'}</button>`;
  let h = `<div class="bstep" data-id="b-${pc.id}-${key}">`;
  if (key === 'name') h += `${stepHead(S, 'name', '0', 'Name', P.sheet)}<div class="hint">What the street calls you.</div><input data-act="name" data-pc="${pc.id}" value="${esc(ch.name || '')}" placeholder="Runner name" aria-label="Runner name"><input data-act="player" data-pc="${pc.id}" value="${esc(pc.player || '')}" placeholder="Player" aria-label="Player name" style="margin-top:12px;font-size:24px">`;
  if (key === 'meta') {
    h += `${stepHead(S, 'meta', '1', 'Metatype', P.meta)}<div class="hint">Start with 100 points and 60 Essence. Every attribute and skill starts at 1.</div><div class="opts">`;
    Object.entries(R.META).forEach(([k, m]) => h += opt('meta', k, ch.meta, m.name, m.text, m.pts + ' pts'));
    h += `</div><div style="height:330px;margin-top:16px">`;
    if (ch.meta === 'human') {
      h += `<div class="grouph"><span>Racial bonuses</span><span>${(ch.human || []).length} of 3 · 3 pts each</span></div><div class="opts four">`;
      R.ALL_SKILLS.forEach(s => { const on = (ch.human || []).includes(s); h += `<button class="opt${on ? ' sel' : ''}" style="padding:8px 10px" data-act="toggle" data-pc="${pc.id}" data-path="human" data-v="${s}" data-max="3" aria-pressed="${on}"><b style="font-size:20px">+1 ${R.SK_NAME[s]}</b></button>`; });
      h += `</div>`;
    } else h += `<div class="crease" style="height:330px">Human racial bonuses · open when you choose Human</div>`;
    h += `</div>`;
  }
  if (key === 'attr') {
    h += `${stepHead(S, 'attr', '2', 'Attributes', P.attr)}<div class="hint">+1 costs 7; +2 costs 25. Target number is 6 − attribute.</div><div class="rows">`;
    R.ATTRS.forEach(a => { const v = ch.attr[a] || 0; h += row(v > 0, `${R.ATTR_NAME[a]} → ${S.attr[a]}`, `TN ${Math.max(0, 6 - S.attr[a])}`, `+${v} · ${R.ATTR_COST[v]} pts`, stepper(pc, 'attr.' + a, v, 0, 2, R.ATTR_NAME[a])); });
    h += `</div>`;
  }
  if (key === 'skills') {
    h += `${stepHead(S, 'skills', '3', 'Skills', P.skillcost)}<div class="hint">Ratings 2–3 cost 1 each, 4–6 cost 2, 7–9 cost 3. Up to 9 at creation; Magic ≤ Essence ÷ 10 (now ${S.magicCap}).</div>`;
    R.ATTRS.forEach(a => {
      h += `<div class="grouph"><span>${R.ATTR_NAME[a]} ${S.attr[a]}</span><span>TN ${Math.max(0, 6 - S.attr[a])}</span></div><div class="rows">`;
      R.SKILLS[a].forEach(s => { const v = Math.max(1, ch.skills[s] || 1); const max = s === 'magic' ? Math.min(9, Math.max(1, S.magicCap)) : 9;
        h += row(v > 1, `${R.SK_NAME[s]}${S.skill[s] !== v ? ` → ${S.skill[s]}` : ''}`, v > 1 ? `${R.skillCost(1, v)} pts for ${v}` : 'free at 1', v < max ? `next ${R.stepCost(v + 1)} pts` : 'at cap', stepper(pc, 'skills.' + s, v, 1, max, R.SK_NAME[s])); });
      h += `</div>`;
    });
  }
  if (key === 'magic') {
    h += `${stepHead(S, 'magic', '4', 'Magic', P.magic)}<div class="hint">A tradition costs 30 points. Skip this step for a mundane runner.</div><div class="opts three">`;
    Object.entries(R.TRAD).forEach(([k, t]) => h += opt('trad', k, ch.trad, t.name, t.text, t.pts + ' pts'));
    h += `</div><div style="height:860px;margin-top:16px">`;
    if (ch.trad) {
      const T = R.TRAD[ch.trad];
      h += `<div class="rows" style="margin-bottom:12px">`;
      h += T.projection ? row(true, 'Astral projection', 'Included with Hermetic.', '0 pts', '') : row(!!ch.extras?.projection, 'Astral projection', 'Travel without your body through unwarded places.', '10 pts', flag('extras.projection', ch.extras?.projection));
      h += T.summoning ? row(true, 'Summoning', 'Included with Shaman.', '0 pts', '') : row(!!ch.extras?.summoning, 'Summoning', 'Call spirits and elementals in downtime.', '10 pts', flag('extras.summoning', ch.extras?.summoning));
      h += `</div><div class="grouph"><span>Spells · 3 pts${T.freeSpells ? ` · first ${T.freeSpells} free` : ''}${T.selfOnly ? ' · self only' : ''}</span><span>${(ch.spells || []).length} chosen <span class="chip" data-go="${P.spells}">p.2</span></span></div><div class="opts three">`;
      R.SPELLS.forEach(sp => { const on = (ch.spells || []).includes(sp.id); h += `<button class="opt${on ? ' sel' : ''}" style="padding:10px 12px" data-act="toggle" data-pc="${pc.id}" data-path="spells" data-v="${sp.id}" aria-pressed="${on}"><b style="font-size:21px">${sp.name}</b><span style="font-size:16px">${sp.eff}</span></button>`; });
      h += `</div>`;
      if ((ch.spells || []).length) { h += `<div class="grouph" style="margin-top:14px"><span>Spell Focus · ${R.FOCUS_PTS} pts · +1 Magic past the cap · max 1 per spell</span><span class="chip" data-go="${P.gear}">p.1</span></div><div class="opts three">`;
        (ch.spells || []).forEach(id => { const sp = R.SPELL_BY_ID[id], on = (ch.foci || []).includes(id); h += `<button class="opt${on ? ' sel' : ''}" style="padding:8px 12px" data-act="toggle" data-pc="${pc.id}" data-path="foci" data-v="${id}" aria-pressed="${on}"><b style="font-size:19px">${sp.name} focus</b></button>`; });
        h += `</div>`; }
    } else h += `<div class="crease" style="height:860px">Spells, astral projection and summoning · open when you choose a tradition</div>`;
    h += `</div>`;
  }
  if (key === 'cyber') {
    h += `${stepHead(S, 'cyber', '5', 'Cyberware', P.cyber)}<div class="hint">Essence ${S.essence} of 60. Every 10 spent lowers the Magic cap by 1.</div><div class="rows">`;
    R.CYBER.forEach(c => { const v = ch.cyber[c.id] || 0; h += row(v > 0, c.name, c.eff, `${c.ess} Ess · ${c.pts} pts`, stepper(pc, 'cyber.' + c.id, v, 0, c.max, c.name)); });
    h += `</div><div class="grouph" style="margin-top:14px"><span>Skillwires: this skill is 5 (racial bonus dropped, cyber adds)</span></div><select data-act="wire" data-pc="${pc.id}" ${ch.cyber.skillwires ? '' : 'disabled'} aria-label="Skillwire skill"><option value="">${ch.cyber.skillwires ? 'Choose a skill' : 'Needs skillwires'}</option>${R.ALL_SKILLS.map(s => `<option value="${s}" ${ch.wire === s ? 'selected' : ''}>${R.SK_NAME[s]}</option>`).join('')}</select>`;
  }
  if (key === 'gear') {
    h += `${stepHead(S, 'gear', '6', 'Weapons & gear', P.gear)}<div class="hint">Wear one armor outfit; the best counts. Knife, phone and clothes are free.</div><div class="rows">`;
    R.GEAR.forEach(g => { const v = ch.gear[g.id] || 0; h += row(v > 0, g.name, g.eff, g.pts ? `${g.pts} pts` : 'free', stepper(pc, 'gear.' + g.id, v, 0, g.max, g.name)); });
    h += `</div>`;
  }
  if (key === 'veh') {
    h += `${stepHead(S, 'veh', '7', 'Vehicles & drones', P.veh)}<div class="hint">Mounted weapons are bought as gear. Vehicles cannot Soak.</div><div class="rows">`;
    R.VEH.forEach(v => { const n = ch.veh[v.id] || 0; h += row(n > 0, v.name, `${v.form} · HP ${v.hp} · armor ${v.armor} · ${v.speed} mph · ${v.mounts} mounts`, `${v.pts} pts`, stepper(pc, 'veh.' + v.id, n, 0, v.max, v.name)); });
    h += `</div>`;
  }
  if (key === 'deck') {
    h += `${stepHead(S, 'deck', '8', 'Deck & chips', P.decks)}<div class="hint">A deck sets hacking Actions and armor. Each operation needs its chip.</div><div class="opts three">`;
    R.DECKS.forEach(d => h += opt('deck', d.id, ch.deck, d.name, `Actions ${d.actions}${d.armor ? ' · armor ' + d.armor : ''}`, d.pts + ' pts'));
    h += `</div><div class="chipgrid" style="margin-top:16px"><span class="h"></span>${R.CHIP_KINDS.map(k => `<span class="h">${k}</span>`).join('')}`;
    R.CHIPS.forEach((rowc, t) => { h += `<span class="h">${R.CHIP_TIERS[t][0]} ${R.CHIP_TIERS[t][1]}</span>`; rowc.forEach(c => { if (!c) { h += '<span class="h" style="text-align:center">—</span>'; return; } const on = !!ch.chips[c[0]];
      h += `<button class="${on ? 'sel' : ''}" data-act="flag" data-pc="${pc.id}" data-path="chips.${c[0]}" aria-pressed="${on}">${c[1]}<span>${c[2]} pts</span></button>`; }); });
    h += `</div>`;
  }
  if (key === 'circles') {
    h += `${stepHead(S, 'circles', '9', 'Social circles', P.circles)}<div class="hint">Contact 1 pt [6L], friend 3 [9M], patron 5 [12S]. First two contacts free.</div><div class="rows one">`;
    R.CIRCLES.forEach(c => { const cur = ch.circles[c] || ''; h += `<div class="row${cur ? ' on' : ''}"><div><b>${c}</b></div><div class="seg">${['', 'contact', 'friend', 'patron'].map(l => `<button class="${cur === l ? 'sel' : ''}" data-act="set" data-pc="${pc.id}" data-path="circles.${c}" data-v="${l}">${l ? R.CIRCLE_LV[l].name : 'None'}</button>`).join('')}</div></div>`; });
    h += `</div>`;
  }
  if (key === 'adv') {
    // after creation: karma for the latest session, then spend it (rules p.4: the next point costs what it costs at
    // creation; a spell costs 3; skills stop at the karma cap)
    const n = advSession(), mine = (state.adv[pc.id] || []).find(x => x.s === n) || {}, left = S.karma.earned - S.karma.spent;
    const rated = sk => { let r = Math.max(1, ch.skills[sk] || 1); karmaOf(pc).forEach(k => (k.buy || []).forEach(b => { if (b.skill === sk) r = b.to; })); return r; };
    h += `${stepHead(S, 'adv', '★', 'Advancement', STEP_RULE.adv)}<div class="hint">Karma for S${n} (the latest session), then spend it. Everything costs what it would at creation, except race, circles, lifestyle, gear and cyberware, which karma cannot buy; Essence is 1 per point; skills stop at ${R.KARMA_CAP}.</div>
      <div class="karmabar"><span>Karma for S${n}</span><div class="stepper"><button data-act="kaward" data-pc="${pc.id}" data-d="-1" ${(mine.award || 0) <= 0 ? 'disabled' : ''} aria-label="Less karma">−</button><output>${mine.award || 0}</output><button data-act="kaward" data-pc="${pc.id}" data-d="1" aria-label="More karma">+</button></div>
      <b>${left} to spend</b> <span class="e">${S.karma.earned} earned in all</span>${(mine.buy || []).length ? ` <button class="opt kundo" data-act="kundo" data-pc="${pc.id}"><b>Take back the last spend</b></button>` : ''}</div><div class="opts">`;
    R.ALL_SKILLS.forEach(sk => { const r = rated(sk), c = r >= R.KARMA_CAP ? null : R.skillCost(r, r + 1), ok = c != null && c <= left;
      h += `<button class="opt" data-act="kbuy" data-pc="${pc.id}" data-skill="${sk}" ${ok ? '' : 'disabled'}><b>${esc(R.SK_NAME[sk])} ${r} → ${r + 1}${c != null ? `<em>${c}</em>` : ''}</b><span>${c == null ? 'at the cap' : ok ? 'karma' : 'not enough karma'}</span></button>`; });
    h += `</div><div class="grouph"><span>Attributes · creation prices (+1 = ${R.ATTR_COST[1]}, the second +1 = ${R.ATTR_COST[2] - R.ATTR_COST[1]})</span></div><div class="opts">`;
    R.ATTRS.forEach(at => { const bb = S.attrBuy[at], c = bb >= 2 ? null : R.ATTR_COST[bb + 1] - R.ATTR_COST[bb], ok = c != null && c <= left;
      h += `<button class="opt" data-act="kattr" data-pc="${pc.id}" data-attr="${at}" ${ok ? '' : 'disabled'}><b>${esc(R.ATTR_NAME[at])} ${S.attr[at]} → ${S.attr[at] + 1}${c != null ? `<em>${c}</em>` : ''}</b><span>${c == null ? 'bought +2 already' : ok ? 'karma' : 'not enough karma'}</span></button>`; });
    h += `</div>`;
    h += `<div class="grouph"><span>Essence · 1 karma per point · no cap · now ${S.essence}</span></div><div class="opts"><button class="opt" data-act="kess" data-pc="${pc.id}" ${left >= 1 ? '' : 'disabled'}><b>Essence ${S.essence} → ${S.essence + 1}<em>1</em></b><span>room for more cyberware; Magic cap +1 per 10</span></button></div>`;
    if (!S.trad) h += `<div class="grouph"><span>Awaken · a tradition at creation price</span></div><div class="opts">` + Object.entries(R.TRAD).map(([k, t]) => `<button class="opt" data-act="ktrad" data-pc="${pc.id}" data-trad="${k}" ${left >= t.pts ? '' : 'disabled'}><b>${esc(t.name)}<em>${t.pts}</em></b><span>${esc(t.text)}</span></button>`).join('') + `</div>`;
    if (S.trad) { const tr = S.trad, ex = Object.entries(R.EXTRAS).filter(([k]) => !(k === 'projection' && tr.projection) && !(k === 'summoning' && tr.summoning) && !ch.extras?.[k] && !S.kExtras[k]);
      if (ex.length) h += `<div class="grouph"><span>Magic extras</span></div><div class="opts">` + ex.map(([k, x]) => `<button class="opt" data-act="kextra" data-pc="${pc.id}" data-extra="${k}" ${left >= x.pts ? '' : 'disabled'}><b>${esc(x.name)}<em>${x.pts}</em></b><span>karma</span></button>`).join('') + `</div>`; }
    if (S.trad) { const known = new Set([...(ch.spells || []), ...karmaOf(pc).flatMap(k => (k.buy || []).filter(b => b.spell).map(b => b.spell))]);
      h += `<div class="grouph"><span>Learn a spell · 3 karma</span></div><div class="opts">` + R.SPELLS.filter(sp => !known.has(sp.id)).map(sp => `<button class="opt" data-act="kspell" data-pc="${pc.id}" data-spell="${sp.id}" ${left >= 3 ? '' : 'disabled'}><b>${esc(sp.name)}<em>3</em></b><span>${esc(sp.eff || '')}</span></button>`).join('') + `</div>`; }
  }
  if (key === 'done') {
    const legal = !S.warn.length;
    h += `<div class="q"><span class="no">✓</span><h3>All done?</h3><span class="sub">${S.left} of 100 left</span></div>
      <div class="donebox ${legal ? 'ok' : 'bad'}"><b>${legal ? (S.left > 0 ? `Legal, with ${S.left} point${S.left === 1 ? '' : 's'} unspent` : 'Legal and fully spent') : 'Not legal yet'}</b>
      <div>${S.pts} points spent · Essence ${S.essence} of 60 · Magic cap ${S.magicCap}</div>${S.warn.map(w => `<div class="w">${esc(w)}</div>`).join('')}</div>
      <button class="opt sel donebtn" data-act="finish" data-pc="${pc.id}"><b>All done · back to the sheet</b><span>Tab and Shift+Tab move between steps; Esc also leaves.</span></button>`;
  }
  if (key === 'life') {
    h += `${stepHead(S, 'life', '10', 'Lifestyle', P.life)}<div class="hint">You start with ¥100 plus your lifestyle’s cash.</div><div class="opts three">`;
    Object.entries(R.LIFE).forEach(([k, l]) => h += opt('life', k, ch.life, l.name, `+¥${l.cash.toLocaleString()} · ${l.tool}`, l.pts + ' pts'));
    h += `</div>`;
  }
  return h + '</div>';
}
function toolRolls(pc, S, key, toolLabel, bonus = 0) {
  return (R.TOOL_SKILL[key] || []).map(sk => `<button class="die sm" data-act="roll" data-pc="${pc.id}" data-skill="${sk}"${bonus ? ` data-bonus="${bonus}"` : ''} data-tool="${esc(toolLabel)}" title="Roll ${R.SK_NAME[sk]} with ${esc(toolLabel)}: ${S.skill[sk] + bonus}d6">⚄ ${R.SK_NAME[sk]} ${S.skill[sk] + bonus}</button>`).join('');
}
function rollHtml(r) {
  const dice = r.dice.map(d => `<i class="${d.ok ? 'ok' : ''}">${d.chain.join('+')}</i>`).join('');
  return `<div class="roll"><b>${esc(r.label)}</b><span class="tn">${r.pool}d6 · TN ${r.tn}</span><span class="dd">${dice}</span><span class="verdict${r.succ ? '' : ' fail'}">${r.succ} · ${esc(r.verdict)}</span></div>`;
}
const TOKENS = ['adept-elf-f', 'adept-human-m', 'adept-troll-f', 'decker-dwarf-m', 'decker-elf-f', 'decker-human-f', 'face-elf-m', 'face-human-f', 'face-ork-m', 'mage-dwarf-m', 'mage-elf-m', 'mage-human-f', 'merc-dwarf-m', 'merc-ork-m', 'merc-troll-f', 'rigger-dwarf-f', 'rigger-human-m', 'rigger-ork-m', 'shaman-human-f', 'shaman-ork-f', 'shaman-troll-m', 'street-samurai-elf-f', 'street-samurai-human-m', 'street-samurai-ork-f', 'street-samurai-troll-m', 'technomancer-dwarf-f', 'technomancer-human-m'];
const TOKEN_FILES = window.TOKEN_FILES || {};
function archetypeOf(ch, S) {
  if (ch.trad === 'adept') return 'adept'; if (ch.trad === 'shaman') return 'shaman'; if (ch.trad === 'hermetic') return 'mage';
  if (ch.cyber?.vcr || Object.keys(ch.veh || {}).length) return 'rigger'; if (ch.deck) return 'decker';
  if (ch.cyber?.wired || ch.cyber?.dermal) return 'street-samurai'; if ((ch.skills?.persuade || 1) + (ch.skills?.etiquette || 1) > 6) return 'face';
  return ch.meta ? 'merc' : null;
}
function portraitOf(pc, S) {
  const ch = choicesOf(pc), arch = archetypeOf(ch, S), meta = ch.meta;
  const score = t => (arch && t.startsWith(arch + '-') ? 4 : 0) + (meta && t.includes('-' + meta + '-') ? 2 : 0);
  const ranked = TOKENS.map(t => [score(t), t]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).map(x => TOKEN_FILES[x[1]]).filter(Boolean);
  const options = ranked.slice(0, 4);
  const close = u => (u && /assets\/tokens\/(?!close\/)/.test(u)) ? u.replace('assets/tokens/', 'assets/tokens/close/') : u;
  const src = close(state.portraits[pc.id] || options[0] || '');
  return { src, options: options.map(close) };
}
function summonOf(pc) { if (!(pc.id in state.summons) && pc.summon) state.summons[pc.id] = { ...pc.summon }; return state.summons[pc.id] || null; }
function summonsHtml(pc, ch, S, W8) {
  const head = `<div class="sec">Summons <span class="chip" data-go="p-summons">p.2</span> <span class="chip" data-go="p-spirits">types</span></div>`;
  if (!R.canSummon(ch, S)) return head + `<div class="none">Summoning needs a Shaman, or a tradition that bought Summoning.</div>`;
  const kind = R.summonKind(ch), sm = summonOf(pc);
  if (sm) {
    const t = R.SUMMONS.find(x => x.id === sm.type), skills = [...new Set([...R.SUMMON_SHARED, ...t.extra])];
    const boxes = Array.from({ length: sm.max }, (_, i) => `<i class="${i < sm.rating ? 'on' : ''}"></i>`).join('');
    const die = (sk, tool) => `<button class="die sm" data-act="sroll" data-pc="${pc.id}" data-skill="${sk}" data-tool="${esc(tool)}" title="${esc(tool)}: ${sm.rating}d6 at TN 4">⚄</button>`;
    const specials = R.summonSpecials(t).map(sp => `<div class="sp">${esc(sp.text)}${sp.skill ? ' ' + die(sp.skill, sp.text) : ''}</div>`).join('');
    const recent = (state.rolls[pc.id] || []).filter(r => r.label.includes(t.name)).slice(0, 2).map(rollHtml).join('');
    return head + `<div class="sumrow">
      <div class="scard2"><div class="sc-in">
        <div class="sch"><b>${esc(t.name)}</b><span class="kind">${t.kind}</span></div>
        <div class="scr">Rating <b>${sm.rating}</b>/${sm.max} <span class="boxes">${boxes}</span> · Actions ${t.actions} · TN 4</div>
        <div class="scs">${skills.map(k => `<div class="sskill"><span>${R.SK_NAME[k]}</span><b>${sm.rating}</b>${die(k, R.SK_NAME[k])}</div>`).join('')}</div>
        ${specials ? `<div class="scsp">${specials}</div>` : ''}
        <div class="sca">Body 2 · Coordination 2 · Mental 2 · Social 2</div>
      </div></div>
      <div class="sumside"><div class="ss-in">
        <div class="mbtns"><button class="btn" data-act="sum-dmg" data-pc="${pc.id}">Damage −1</button><button class="btn" data-act="sum-heal" data-pc="${pc.id}" ${sm.rating >= sm.max ? 'disabled' : ''}>Heal +1</button><button class="btn" data-act="sum-drain" data-pc="${pc.id}" title="Spends an action to take 1 of the summoner's Drain, losing 1 rating">Take 1 Drain</button><button class="btn quiet" data-act="sum-release" data-pc="${pc.id}">Release</button></div>
        <div class="rolls">${recent || '<div class="none">Its rolls land here and in the log.</div>'}</div>
      </div></div></div>`;
  }
  if (state.summonPick[pc.id]) {
    return head + `<div class="pickgrid">${R.SUMMONS.filter(t => t.kind === kind).map(t => `<button class="btn" data-act="sum-pick" data-pc="${pc.id}" data-type="${t.id}"><b>${esc(t.name.replace(/ (Elemental|Spirit)$/, ''))}</b><small>${t.kind}</small></button>`).join('')}<button class="btn quiet" data-act="sum-cancel" data-pc="${pc.id}">Cancel</button></div>
      <div class="hint2">Rolls Magic ${S.skill.magic} at TN ${Math.max(0, 6 - S.attr.mental) + W8.tn}. A ${kind}’s rating is the successes${kind === 'elemental' ? ' + 2' : ''}. Summoning takes downtime.</div>`;
  }
  return head + `<button class="btn big" data-act="sum-open" data-pc="${pc.id}">Summon ${kind === 'spirit' ? 'a spirit' : 'an elemental'} ⚄</button>${state.lastSummon?.[pc.id] ? `<div class="sumfail">${esc(state.lastSummon[pc.id])}</div>` : ''}<div class="hint2">One summon at a time. It gets a card of its own, here.</div>`;
}
function fitSummon(box) { box.querySelectorAll('.sumrow').forEach(r => { fitInto(r.querySelector('.scard2'), r.querySelector('.sc-in')); fitInto(r.querySelector('.sumside'), r.querySelector('.ss-in')); }); }
function liveOf(pc) { return state.live[pc.id] || (state.live[pc.id] = { dmg: pc.id === 'pc-tusk' ? ['L', 'L', 'B'] : [] }); }
function woundOf(pc, S) { const f = liveOf(pc).dmg.filter(Boolean).length; return { filled: f, tn: S.adept ? 0 : f >= 4 ? 3 : f >= 1 ? 1 : 0 }; }
function renderSheet(pc) {
  const box = sheetEls[pc.id], ch = choicesOf(pc), S = sheetOf(pc), asOf = state.asof[pc.id] ?? 99;
  const live = liveOf(pc), W8 = woundOf(pc, S);
  const nm = ch.name || 'New runner', who = [S.meta?.name, pc.archetype].filter(Boolean).join(' · ') || 'Not built yet';
  const prev = box._prev || {};
  const pv = (key, v, cls = '') => `<span class="pv ${cls}${prev[key] != null && prev[key] !== v ? ' changed' : ''}" data-prov="${key}" tabindex="0">${v}</span>`;
  const has = new Set((pc.karma || []).map(k => k.s));
  const asofBtns = ['Start', ...C.sessions.map(s => 'S' + s.n), 'Now'].map((lab, i) => { const val = lab === 'Now' ? 99 : i; const on = asOf === val;
    return `<button data-act="asof" data-pc="${pc.id}" data-v="${val}" class="${on ? 'on' : ''}${has.has(i) ? ' has' : ''}" aria-pressed="${on}">${lab}</button>`; }).join('');
  const P = R.P, chip = (id, lab) => `<span class="chip" data-go="${id}">${lab || 'p.' + printIndex[id].page}</span>`;
  const cols = R.ATTRS.map(a => `<div class="acol"><div class="ahead"><span class="an">${R.ATTR_NAME[a]}</span><span>${pv('a:' + a, S.attr[a], 'mid')} <span class="tn">TN ${Math.max(0, 6 - S.attr[a])}</span></span></div>
      ${R.SKILLS[a].map(s => `<div class="sk${S.skill[s] ? '' : ' zero'}"><span class="k" data-rule-of="s:${s}" role="link" tabindex="0">${R.SK_NAME[s]}</span>${pv('s:' + s, S.skill[s], 'mid')}<button class="die" data-act="roll" data-pc="${pc.id}" data-skill="${s}" title="Roll ${R.SK_NAME[s]}: ${S.skill[s]}d6 at TN ${S.tn(s) + W8.tn}" aria-label="Roll ${R.SK_NAME[s]}">⚄</button></div>`).join('')}</div>`).join('');
  const track = Array.from({ length: S.health }, (_, i) => `<button class="${live.dmg[i] || ''}" data-act="dmg" data-pc="${pc.id}" data-i="${i}" aria-label="Damage box ${i + 1}">${live.dmg[i] || ''}</button>`).join('');
  const listOr = (arr, f) => arr.length ? arr.map(f).join('') : '<div class="none">None</div>';
  const kLeft = S.karma.earned - S.karma.spent;
  const circleRows = S.circles.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${esc(c.level.toLowerCase())} ${c.tool}${c.free ? ' · free' : ''}</span> ${toolRolls(pc, S, 'circle', `${c.name} ${c.level.toLowerCase()} ${c.tool}`)}</div>`);
  const tok = portraitOf(pc, S);
  box.innerHTML = `
    <div class="main">
    <section class="sA">
      <div class="nm disp${ch.name ? '' : ' empty'}">${esc(nm)}</div>
      <div class="who">${esc(who)} · played by ${esc(pc.player || '—')}</div>
      <div class="budget">
        <div class="${S.left < 0 ? 'over' : ''}"><div class="k">Points ${chip(P.start)}</div><div class="bv">${pv('pts', S.pts)} <span class="tn">/ 100 · ${S.left} left</span></div><div class="bar"><i style="width:${Math.min(100, S.pts)}%"></i></div></div>
        <div><div class="k">Essence</div><div class="bv">${pv('essence', S.essence)} <span class="tn">/ 60 · cap ${S.magicCap}</span></div><div class="bar"><i style="width:${Math.max(0, S.essence) / 60 * 100}%"></i></div></div>
        <div><div class="k">Karma ${chip(P.karma)}</div><div class="bv">${kLeft} <span class="tn">free · ${S.karma.earned} in</span></div><div class="bar"><i style="width:${S.karma.earned ? S.karma.spent / S.karma.earned * 100 : 0}%"></i></div></div>
      </div>
      <div class="asof">As of ${asofBtns}</div>
      ${S.warn.length ? `<div class="warn">${S.warn.map(esc).join('<br>')}</div>` : ''}
    </section>
    <section class="sB">
      <h4>Attributes & skills ${chip(P.rolls, 'rolls p.3')}</h4>
      <div class="grid4">${cols}</div>
    </section>
    <section class="sP">
      <div class="portrait${isToken(tok.src) ? ' closeup' : ''}" data-portrait="${pc.id}" title="Drop an image here, or pick a token below">
        <img src="${tok.src}" alt="${esc(nm)} portrait" draggable="false"><span class="drophint">Drop an image</span>
      </div>
      <div class="tokens">${tok.options.map(o => `<button class="closeup ${o === tok.src ? 'sel' : ''}" data-tok="${o}" data-pc="${pc.id}" aria-label="Use this token"><img src="${o}" alt="" draggable="false"></button>`).join('')}<label class="upl" title="Upload an image">⇪<input type="file" accept="image/*" data-upload="${pc.id}" hidden></label></div>
    </section>
    <section class="sD">
      <div class="der">
        <div><div class="k">Actions</div>${pv('actions', S.actions, 'mid')}${S.rig ? `<small>rigging ${S.actions + S.rig}</small>` : ''}${S.deck ? `<small>deck ${S.deck.actions}</small>` : ''}</div>
        <div><div class="k">Armor</div>${pv('armor', S.armor, 'mid')}<small>${S.outfit ? esc(S.outfit.name) : 'no outfit'}</small></div>
        <div><div class="k">Health</div>${pv('health', S.health, 'mid')}<small>3 + Body</small></div>
        <div><div class="k">Essence</div>${pv('essence', S.essence, 'mid')}<small>of 60</small></div>
        <div><div class="k">Cash</div><span class="pv mid" data-prov="cash" tabindex="0">¥${S.cash.toLocaleString()}</span><small>${S.life ? esc(S.life.name) : 'no lifestyle'}</small></div>
      </div>
      <div class="track"><span class="k">Damage ${chip(P.combat)}</span>${track}<span class="wound">${W8.filled ? (S.adept ? 'Adept: no wound penalty' : `Wounded: TN +${W8.tn}`) : ''}</span><button class="die wide" data-act="roll" data-pc="${pc.id}" data-skill="soak" data-soak="1">Soak ⚄</button></div>
      <div class="rolls">${(state.rolls[pc.id] || []).slice(0, 2).map(rollHtml).join('') || '<div class="none">Tap ⚄ beside a skill to roll it.</div>'}</div>
    </section>
    <section class="sL">
      <div class="sec">Where the points went</div><div class="ledger">${S.spend.map(x => `<div><span>${esc(x.label)}</span><span>${x.pts}</span></div>`).join('') || '<div><span>Nothing bought yet</span><span>0</span></div>'}</div>
    </section>
    <section class="sC${R.canSummon(ch, S) ? '' : ' tall'}">
      <h4>Gear, ware & magic</h4>
      <div class="cols2">
        <div class="l-cyber"><div class="sec">Cyberware ${chip(P.cyber)}</div><div class="list">${listOr(S.cyber, c => `<div><b>${esc(c.name)}${c.n > 1 ? ' ×' + c.n : ''}</b> <span class="e">${esc(c.eff)}${c.id === 'skillwires' && ch.wire ? ` (${R.SK_NAME[ch.wire]})` : ''}</span> ${toolRolls(pc, S, c.id, c.name)}</div>`)}</div></div>
        <div class="l-gear"><div class="sec">Weapons & gear ${chip(P.gear)}</div><div class="list">${listOr(S.gear, g => `<div><b>${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}</b> <span class="e">${esc(g.eff)}</span> ${toolRolls(pc, S, g.id, g.name + (g.eff.match(/\[[^\]]+\]/) ? ' ' + g.eff.match(/\[[^\]]+\]/)[0] : ''))}</div>`)}${S.trollDmg ? '<div class="e">Troll: +1 damage, melee and unarmed.</div>' : ''}</div></div>
        <div class="l-magic"><div class="sec">Magic ${chip(P.magic)}</div><div class="list">${S.trad ? `<div><b>${esc(S.trad.name)}</b></div>` + S.spells.map(sp => `<div><b>${esc(sp.name)}</b> <span class="e">[${esc(sp.eff)}]${sp.free ? ' · free' : ''}${sp.focus ? ' · focus +1' : ''}${sp.karma ? ` · ${chip(sp.karma, 'karma')}` : ''}</span> ${toolRolls(pc, S, 'spell', sp.name, sp.focus ? 1 : 0)}</div>`).join('') : '<div class="none">No tradition</div>'}</div></div>
        <div class="l-veh"><div class="sec">Vehicles, deck & chips ${chip(P.veh)}</div><div class="list">${listOr([...S.veh.map(v => `<div><b>${esc(v.name)}${v.n > 1 ? ' ×' + v.n : ''}</b> <span class="e">HP ${v.hp}, armor ${v.armor}</span> ${toolRolls(pc, S, 'veh', v.name)}</div>`), ...(S.deck ? [`<div><b>${esc(S.deck.name)}</b> <span class="e">Actions ${S.deck.actions}</span> ${toolRolls(pc, S, 'deck', S.deck.name)}</div>`] : []), ...S.chips.map(c => `<div><b>${esc(c.name)}</b> <span class="e">${c.kind} ${c.tier[1]}</span></div>`)], x => x)}</div></div>
        <div class="l-circles"><div class="sec">Social circles ${chip(P.circles)}</div><div class="list">${circleRows.join('') || '<div class="none">None</div>'}</div></div>
        <div class="l-life"><div class="sec">Lifestyle</div><div class="list">${S.life ? `<div><b>${esc(S.life.name)}</b> <span class="e">${S.life.tool} · ¥${S.life.cash.toLocaleString()}</span> ${toolRolls(pc, S, 'life', `${S.life.name} lifestyle ${S.life.tool}`)}</div>` : '<div class="none">None</div>'}</div></div>
      </div>
    </section>
    ${R.canSummon(ch, S) ? `<section class="sS">${summonsHtml(pc, ch, S, W8)}</section>` : ''}
    </div>
    <div class="builder${state.build?.pc === pc.id ? ' active' : ''}" data-id="builder-${pc.id}" style="left:${BREG.x}px;top:${BREG.y}px;width:${BREG.w}px;height:${BREG.h}px">
      <div class="binner" style="width:${BINNER.w}px;height:${BINNER.h}px;transform:scale(${BK_K})">${builderInner(pc, S)}</div>
    </div>`;
  const bl = el('div', 'lbl over blbl'); bl.innerHTML = 'CHARACTER<br>BUILDER'; bl.style.fontSize = '64px'; box.querySelector('.builder').appendChild(bl); labels.push({ e: bl, size: 64, over: true });
  if (state.done[pc.id] === false || (!ch.meta && !state.done[pc.id])) box.querySelector('.builder').classList.add('todo');
  box._prev = Object.fromEntries([...R.ATTRS.map(a => ['a:' + a, S.attr[a]]), ...R.ALL_SKILLS.map(s => ['s:' + s, S.skill[s]]), ['actions', S.actions], ['armor', S.armor], ['health', S.health], ['essence', S.essence], ['pts', S.pts]]);
  const prov = {}; Object.entries(S.prov).forEach(([k, ids]) => prov[k] = [...new Set(ids.flatMap(id => S.prov[id] && id !== k ? S.prov[id] : [id]).map(id => resolveSrc(pc, id)))]);
  box._prov = prov;
  if (nodes[pc.id]) { nodes[pc.id].title = nm; nodes[pc.id].sub = who; }
  box.querySelectorAll('.bstep[data-id]').forEach(e => { const id = e.dataset.id; nodes[id] = Object.assign(nodes[id] || {}, { id, title: `${nm} · builder: ${STEP_NAME[id.split('-').pop()] || ''}`, kind: 'step', el: e }); });
  for (let i = labels.length - 1; i >= 0; i--) if (!labels[i].e.isConnected) labels.splice(i, 1);
  fitSections(box); fitSummon(box);
  renderQuick(); dirty = true;
}
function initiative() {
  return PCS.filter(pc => choicesOf(pc).meta || choicesOf(pc).name).map(pc => ({ pc, S: sheetOf(pc) }))
    .sort((a, b) => b.S.actions - a.S.actions || b.S.attr.coord - a.S.attr.coord || b.S.skill.palming - a.S.skill.palming);
}
const qdice2 = { pool: 6, tn: 4 };
function trayStep(k, d) { qdice2[k] = Math.max(k === 'tn' ? 0 : 1, Math.min(k === 'tn' ? 18 : 30, qdice2[k] + d)); }
function trayRoll(el) { freeRoll(qdice2.pool, qdice2.tn, 'Free roll', el); }
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
function skillWord(w) { w = w.toLowerCase(); return R.ALL_SKILLS.find(s => s === w || R.SK_NAME[s].toLowerCase().startsWith(w)); }
function rollFor(pc, skill, soak, srcEl) {
  const S = sheetOf(pc), w = woundOf(pc, S);
  const r = R.roll(S.skill[skill] + (+srcEl?.dataset?.bonus || 0), S.tn(skill) + w.tn);
  r.label = `${choicesOf(pc).name || 'Runner'} · ${srcEl?.dataset?.tool ? srcEl.dataset.tool + ' · ' : ''}${soak ? 'Soak' : R.SK_NAME[skill]}`;
  if (soak && r.succ) r.verdict = `Soak ${1 + r.bonuses} damage`;
  const rec = { label: r.label, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict };
  (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist(); logPush({ kind: 'roll', who: pc.id, rec });
  const t = $('#toast'), rr = srcEl?.getBoundingClientRect();
  t.innerHTML = rollHtml(rec); t.style.left = Math.max(180, Math.min(W() - 180, rr ? rr.left + rr.width / 2 : W() / 2)) + 'px'; t.style.top = Math.max(90, rr ? rr.top : H() / 2) + 'px';
  const pop = srcEl?.closest('#qpop'); if (pop) { const pr = pop.getBoundingClientRect(); t.style.left = (pr.left + pr.width / 2) + 'px'; t.style.top = pr.top + 'px'; }
  t.hidden = false; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.hidden = true, 300); }, 2600);
  renderSheet(pc);
}
function box_who(pc) { const S = sheetOf(pc); sheetEls[pc.id].querySelector('.who').textContent = `${[S.meta?.name, pc.archetype].filter(Boolean).join(' · ') || 'Not built yet'} · played by ${pc.player || '—'}`; }
function rigCommands(q, ws, nums, pcw) {
  const out = [];
  const sk = ws.map(skillWord).find(Boolean);
  if (ws[0] === 'roll' || ws[0] === 'r') {
    if (pcw && sk) out.push({ k: 'cmd', t: `Roll ${choicesOf(pcw).name}’s ${R.SK_NAME[sk]}`, run: () => rollFor(pcw, sk, sk === 'soak') });
    else if (nums.length) { const pool = nums[0], tn = ws.includes('tn') ? nums[1] ?? 4 : nums[1] ?? 4; out.push({ k: 'cmd', t: `Roll ${pool}d6 at TN ${tn}`, run: () => freeRoll(pool, tn, `Roll ${pool}d6`, qb) }); }
  } else if (pcw && sk) out.push({ k: 'cmd', t: `Roll ${choicesOf(pcw).name}’s ${R.SK_NAME[sk]}`, run: () => rollFor(pcw, sk, sk === 'soak') });
  if ((ws[0] === 'damage' || ws[0] === 'hurt') && pcw) { const n = nums[0] || 1, lethal = ws.some(w => w.startsWith('l')) && ws.some(w => w === 'lethal'); out.push({ k: 'cmd', t: `${choicesOf(pcw).name} takes ${n} ${lethal ? 'lethal' : 'bashing'}`, run: () => { const S = sheetOf(pcw), d = liveOf(pcw).dmg; let left = n; for (let i = 0; i < S.health && left; i++) if (!d[i]) { d[i] = lethal ? 'L' : 'B'; left--; } persist(); renderSheet(pcw); } }); }
  if (ws[0] === 'heal' && pcw) out.push({ k: 'cmd', t: `Clear ${choicesOf(pcw).name}’s damage`, run: () => { liveOf(pcw).dmg = []; persist(); renderSheet(pcw); } });
  return out;
}
function rigAct(act, a, pc, ch) {
  if (['kaward', 'kbuy', 'kspell', 'kundo', 'kattr', 'kess', 'ktrad', 'kextra'].includes(act)) {
    const n = advSession(), e = advEntry(pc, n), nm = ch.name || 'A runner';
    if (act === 'kaward') { e.award = Math.max(0, (e.award || 0) + +a.dataset.d); historyNote(`${nm}: karma for S${n} now ${e.award}`); }
    if (act === 'kbuy') { const sk = a.dataset.skill; let r = Math.max(1, ch.skills[sk] || 1); karmaOf(pc).forEach(k => (k.buy || []).forEach(b => { if (b.skill === sk) r = b.to; }));
      (e.buy = e.buy || []).push({ skill: sk, to: r + 1 }); historyNote(`${nm}: ${R.SK_NAME[sk]} ${r} → ${r + 1} with karma`); }
    if (act === 'kspell') { (e.buy = e.buy || []).push({ spell: a.dataset.spell }); historyNote(`${nm} learned ${R.SPELL_BY_ID[a.dataset.spell].name} with karma`); }
    if (act === 'kattr') { (e.buy = e.buy || []).push({ attr: a.dataset.attr }); historyNote(`${nm}: ${R.ATTR_NAME[a.dataset.attr]} +1 with karma`); }
    if (act === 'kess') { (e.buy = e.buy || []).push({ essence: 1 }); historyNote(`${nm}: bought back 1 Essence with karma`); }
    if (act === 'ktrad') { (e.buy = e.buy || []).push({ trad: a.dataset.trad }); historyNote(`${nm} awakened as ${R.TRAD[a.dataset.trad].name} with karma`); }
    if (act === 'kextra') { (e.buy = e.buy || []).push({ extra: a.dataset.extra }); historyNote(`${nm}: ${R.EXTRAS[a.dataset.extra].name} with karma`); }
    if (act === 'kundo') { const b = (e.buy || []).pop(); if (b) historyNote(`${nm}: took back ${b.skill ? R.SK_NAME[b.skill] + ' → ' + b.to : b.spell ? R.SPELL_BY_ID[b.spell].name : b.attr ? R.ATTR_NAME[b.attr] + ' +1' : b.essence ? '1 Essence' : b.trad ? R.TRAD[b.trad].name : R.EXTRAS[b.extra].name}`); }
    refreshAdv(pc, n); return true; }
  if (act === 'sroll') { const sm = summonOf(pc); if (!sm) return true; const t = R.SUMMONS.find(x => x.id === sm.type), r = R.roll(sm.rating, 4);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · ${t.name} · ${a.dataset.tool}`, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist(); logPush({ kind: 'roll', who: pc.id, rec }); toast(rec, a); renderSheet(pc); return true; }
  else if (act === 'sum-open') { state.summonPick[pc.id] = true; renderSheet(pc); return true; }
  else if (act === 'sum-cancel') { state.summonPick[pc.id] = false; renderSheet(pc); return true; }
  else if (act === 'sum-pick') {
    const S = sheetOf(pc), w = woundOf(pc, S), res = R.summon(a.dataset.type, S, w.tn), t = R.SUMMONS.find(x => x.id === a.dataset.type);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · summon ${t.name}`, pool: res.roll.pool, tn: res.roll.tn, dice: res.roll.dice, succ: res.roll.succ, verdict: res.rating ? `${t.name} at rating ${res.rating}` : 'Nothing answers' };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8);
    logPush({ kind: 'roll', who: pc.id, rec });
    (state.lastSummon = state.lastSummon || {})[pc.id] = res.rating ? null : `Nothing answered the ${t.name}: ${res.roll.succ} successes at TN ${res.roll.tn}.`;
    state.summonPick[pc.id] = false; if (res.rating) state.summons[pc.id] = { type: t.id, rating: res.rating, max: res.rating };
    persist(); toast(rec, a); renderSheet(pc); return true;
  }
  else if (act === 'sum-dmg' || act === 'sum-drain') { const sm = summonOf(pc); if (!sm) return true; sm.rating -= 1;
    if (act === 'sum-drain') { const d = liveOf(pc).dmg, i = d.lastIndexOf('B'); if (i >= 0) d[i] = null; }
    if (sm.rating <= 0) state.summons[pc.id] = null; persist(); renderSheet(pc); return true; }
  else if (act === 'sum-heal') { const sm = summonOf(pc); if (sm && sm.rating < sm.max) sm.rating += 1; persist(); renderSheet(pc); return true; }
  else if (act === 'sum-release') { state.summons[pc.id] = null; persist(); renderSheet(pc); return true; }
  else if (act === 'dmg') { const live = liveOf(pc); const i = +a.dataset.i; const cur = live.dmg[i]; live.dmg[i] = cur === 'B' ? 'L' : cur === 'L' ? null : 'B'; persist(); renderSheet(pc); return true; }
  else if (act === 'roll') { rollFor(pc, a.dataset.skill, !!a.dataset.soak, a); return true; }
  return false;
}
