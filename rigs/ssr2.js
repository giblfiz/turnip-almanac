// Turnip Almanac rig: Simplified Shadowrun 2e, version 2.1 (Harry Pottash, 6 Nov 2026).
// Tables are transcribed from books/ssr2-v2.1.pdf; every row points at the section of the book it came from
// (the "print" ids below, which the shelf draws as regions on the real page).
// Interpretations the PDF leaves open are marked INTERP and listed in RIG.interpretations.
window.RIG = (() => {
  const ATTRS = ['body', 'coord', 'mental', 'social'];
  const ATTR_NAME = { body: 'Body', coord: 'Coordination', mental: 'Mental', social: 'Social' };
  const SKILLS = {
    body: ['soak', 'melee', 'unarmed', 'artillery'], coord: ['guns', 'sneak', 'athletics', 'palming'],
    mental: ['computer', 'magic', 'drive', 'tools'], social: ['persuade', 'etiquette', 'network', 'interrogate'] };
  const SK_NAME = { soak: 'Soak', melee: 'Melee', unarmed: 'Unarmed', artillery: 'Artillery', guns: 'Guns', sneak: 'Sneak', athletics: 'Athletics', palming: 'Palming',
    computer: 'Computer', magic: 'Magic', drive: 'Drive', tools: 'Tools', persuade: 'Persuade', etiquette: 'Etiquette', network: 'Network', interrogate: 'Interrogate' };
  const SKILL_ATTR = {}; ATTRS.forEach(a => SKILLS[a].forEach(s => SKILL_ATTR[s] = a));
  const ALL_SKILLS = ATTRS.flatMap(a => SKILLS[a]);

  // ---- price rules (p.1 "Skill increases", p.4 "Karma & purchases")
  const stepCost = k => k <= 3 ? 1 : k <= 6 ? 2 : k <= 9 ? 3 : 4;           // cost of raising TO rating k; 10–12 = 4 (INTERP: Harry's notes say inferred)
  const skillCost = (from, to) => { let c = 0; for (let k = from + 1; k <= to; k++) c += stepCost(k); return c; };
  const ATTR_COST = [0, 7, 25];                                            // +1 = 7, +2 = 25 total
  const BUDGET = 100, ESSENCE = 60, START_CAP = 9, KARMA_CAP = 12;

  const META = {
    human: { name: 'Human', pts: 0, attr: {}, skill: {}, armor: 0, text: 'May buy +1 racial bonus to up to 3 different skills, 3 pts each.' },
    elf:   { name: 'Elf', pts: 15, attr: { coord: 1, social: 1 }, skill: { persuade: 1 }, armor: 0, text: '+1 Coordination, +1 Social, +1 Persuade; low-light; do not age.' },
    dwarf: { name: 'Dwarf', pts: 15, attr: { mental: 1, body: 1 }, skill: { tools: 1, magic: -1 }, armor: 0, text: '+1 Mental, +1 Body, +1 Tools, −1 Magic; infrared.' },
    ork:   { name: 'Ork', pts: 15, attr: { body: 1, coord: 1 }, skill: { soak: 1 }, armor: 0, text: '+1 Body, +1 Coordination, +1 Soak; low-light.' },
    troll: { name: 'Troll', pts: 15, attr: { body: 2, social: -1, coord: -1 }, skill: {}, armor: 4, text: '+2 Body, +4 armor, −1 Social, −1 Coordination; infrared; +1 damage melee/unarmed.' },
  };
  const HUMAN_BONUS_PTS = 3, HUMAN_BONUS_MAX = 3;

  const CYBER = [
    { id: 'wired', name: 'Wired Reflexes', eff: '+1 Action; buy up to 3 times.', ess: 15, pts: 9, max: 3, fx: { actions: 1 } },
    { id: 'vcr', name: 'Vehicle Control Rig', eff: 'Remote pilot/fire: +1 Action; up to 3 times.', ess: 15, pts: 5, max: 3, fx: { rig: 1 } },
    { id: 'dermal', name: 'Dermal & Bone Plates', eff: '+5 armor; unarmed [7M] bashing.', ess: 9, pts: 10, max: 1, fx: { armor: 5 } },
    { id: 'spurs', name: 'Retractable Spurs', eff: 'Melee [9M] lethal; retractable.', ess: 5, pts: 3, max: 1 },
    { id: 'implgun', name: 'Implanted Gun', eff: 'Pistol or SMG in arm; retractable.', ess: 7, pts: 5, max: 1 },
    { id: 'cyberarm', name: 'Cyber Arm', eff: 'Unarmed [8M] bashing; melee +2 penetration.', ess: 10, pts: 10, max: 1 },
    { id: 'muscle', name: 'Synthetic Muscle', eff: '+1 Body.', ess: 10, pts: 10, max: 1, fx: { attr: { body: 1 } } },
    { id: 'smartlink', name: 'Smartlink', eff: '+1 Guns, +1 Artillery.', ess: 5, pts: 2, max: 1, fx: { skill: { guns: 1, artillery: 1 } } },
    { id: 'skillwires', name: 'Skillwires', eff: 'Set any one skill to 5 during downtime.', ess: 7, pts: 5, max: 1 },
    { id: 'datajack', name: 'Datajack', eff: 'Cyberdeck interface; laptops need no implant.', ess: 2, pts: 1, max: 1 },
    { id: 'radio', name: 'Radio Comms', eff: 'Radio and phone calls mentally.', ess: 2, pts: 1, max: 1 },
    { id: 'eyes', name: 'Cyber Eyes', eff: 'Infrared, low-light, 10× mag, recording, flare damping.', ess: 5, pts: 4, max: 1 },
    { id: 'ears', name: 'Cyber Ears', eff: 'Better hearing, ultrasonic, recording, damping.', ess: 3, pts: 4, max: 1 },
    { id: 'voice', name: 'Voice Modulator', eff: 'Fake any sampled voice; be very loud.', ess: 2, pts: 5, max: 1 },
    { id: 'toxin', name: 'Toxin Filtration', eff: 'Poison armor 10.', ess: 5, pts: 5, max: 1 },
  ];
  const GEAR = [
    { id: 'knife', name: 'Knife', eff: '[6L] Melee, concealable.', pts: 0, max: 1 },
    { id: 'sword', name: 'Sword', eff: '[9M] Melee.', pts: 1, max: 1 },
    { id: 'walther', name: 'Walther (palm pistol)', eff: '[4L] Single Shot, very concealable, ceramic.', pts: 2, max: 2 },
    { id: 'fichetti', name: 'Fichetti (light pistol)', eff: '[6L] Concealable.', pts: 1, max: 3 },
    { id: 'predator', name: 'Ares Predator (heavy pistol)', eff: '[9M]', pts: 1, max: 3 },
    { id: 'hk227', name: 'HK227 (SMG)', eff: '[8S]', pts: 2, max: 3 },
    { id: 'ak97', name: 'AK97 (scoped combat rifle)', eff: '[14S] Aim to ignore range penalties.', pts: 2, max: 2 },
    { id: 'eliminator', name: 'JohnDeer Eliminator (shotgun)', eff: '[2S] buckshot or [12M] slug; legal.', pts: 1, max: 2 },
    { id: 'utilimax', name: 'UtiliMax (machine gun)', eff: '[18S] Artillery.', pts: 6, max: 2 },
    { id: 'vigorous', name: 'Vigorous (assault cannon)', eff: '[40D] Single Shot, Artillery.', pts: 10, max: 1 },
    { id: 'armclothing', name: 'Armored Clothing', eff: 'Armor +3; looks ordinary.', pts: 3, max: 1, outfit: 3 },
    { id: 'respirator', name: 'Respirator', eff: 'Poison armor 10 vs inhaled toxins; obvious.', pts: 1, max: 1 },
    { id: 'vest', name: 'Bulletproof Vest', eff: 'Armor +5; obvious when worn.', pts: 2, max: 1, outfit: 5 },
    { id: 'pca', name: 'Powered Combat Armor', eff: 'Armor +8; intimidating.', pts: 8, max: 1, outfit: 8 },
    { id: 'drainfocus', name: 'Drain Focus [Magic]', eff: 'Absorb 1 Drain; refresh in downtime.', pts: 3, max: 2 },
    { id: 'spellfocus', name: 'Spell Focus [Magic]', eff: '+1 Magic for the spell named on purchase.', pts: 2, max: 3 },
    { id: 'grenades', name: 'Grenades ×3', eff: 'Regular [7M], flashbang, or gas [9S] bashing.', pts: 1, max: 4 },
    { id: 'apammo', name: 'AP Ammunition', eff: '+3 penetration; one weapon / run; illegal.', pts: 3, max: 2 },
    { id: 'medkit', name: 'Medkit', eff: 'Allows medical treatment (Tools).', pts: 2, max: 1 },
    { id: 'docwagon', name: 'DocWagon Contract', eff: 'Care & extraction at lifestyle rating; 1 year.', pts: 5, max: 1 },
  ];
  const VEH = [
    ['virago', 'Yamaha Virago', 'Motorcycle', 2, 4, 140, '0', 2], ['civic', 'Honda Civic', 'Car', 4, 5, 120, '0', 5], ['saferide', 'BMW Saferide', 'SUV', 8, 10, 120, '0', 10],
    ['milspec', 'Aries MilSpec', 'Car', 8, 12, 100, '1', 15], ['battlewagon', 'Aries Battlewagon', 'Van / APC', 9, 17, 80, '2', 20], ['dragonfly', 'Bowing Dragonfly', 'Helicopter', 4, 5, 200, '1', 25],
    ['gunboat', 'Gunboat', 'Helicopter', 10, 17, 200, '2', 45], ['zippbug', 'ZippBug', 'Quadcopter', 1, 0, 20, '0', 1], ['gunbug', 'GunBug', 'Quadcopter', 1, 0, 20, '1 light pistol', 3],
    ['bigbeatle', 'BigBeatle', 'Quadcopter', 3, 5, 30, '1 SMG/pistol', 5], ['rover', 'Rover', 'RC car (40 cm)', 1, 0, 25, 'Arm', 1], ['sentinel', 'Sentinel', 'RC car (50 cm)', 3, 5, 15, '1 SMG/pistol', 3],
    ['gunplatform', 'GunPlatform', 'Hexapod (2 m)', 8, 12, 7, '2', 10], ['creeper', 'Creeper', 'RC insect (10 cm)', 1, 0, 2, '0', 2],
  ].map(([id, name, form, hp, armor, speed, mounts, pts]) => ({ id, name, form, hp, armor, speed, mounts, pts, max: 3 }));
  const DECKS = [
    { id: 'laptop', name: 'Laptop', actions: 1, armor: 0, pts: 1 }, { id: 'sony', name: 'Sony CTY', actions: 2, armor: 0, pts: 3 },
    { id: 'fujitzu', name: 'Fujitzu Novatech', actions: 3, armor: 4, pts: 11 }, { id: 'kraftwerk', name: 'H&K Kraftwerk', actions: 4, armor: 8, pts: 20 },
    { id: 'slimcase', name: 'Aztech Slimcase', actions: 5, armor: 10, pts: 30 } ];
  const CHIP_TIERS = [['Off the Shelf', '[3L]'], ['Premium', '[6M]'], ['MilSpec', '[9S]'], ['Cutting Edge', '[12D]']];
  const CHIP_KINDS = ['Destroy', 'Read', 'Edit', 'Control'];
  const CHIPS = [
    [null, ['ezopen', 'EZopen', 1], ['rewriter', 'ReWriter', 1], ['joystick', 'Joystick', 1]],
    [['defroster', 'Defroster', 5], ['kanopener', 'KanOpener', 3], ['prowrite', 'ProWrite', 2], ['mnger', 'MNGER', 4]],
    [['icebreaker', 'IceBreaker', 11], ['safekraker', 'SafeKraker', 7], ['sharpie', 'Sharpie', 5], ['governor', 'Governor', 9]],
    [['p1a2ma', 'P1a2ma', 23], ['th3rm1t', '7h3rm1t', 15], ['r3g3x', 'R3g3x', 11], ['p0wn3r', 'P0wn3r', 12]] ];
  const CHIP_BY_ID = {}; CHIPS.forEach((row, t) => row.forEach((c, k) => { if (c) CHIP_BY_ID[c[0]] = { id: c[0], name: c[1], pts: c[2], tier: CHIP_TIERS[t], kind: CHIP_KINDS[k] }; }));
  const TRAD = {
    shaman: { name: 'Shaman', pts: 30, text: 'Buy spells; summoning free; pays for astral projection.', freeSpells: 0, projection: false, summoning: true },
    hermetic: { name: 'Hermetic', pts: 30, text: 'Buy spells; astral projection free; pays for summoning; 3 spells free.', freeSpells: 3, projection: true, summoning: false },
    adept: { name: 'Physical Adept', pts: 30, text: 'Ignores wound penalties. Spells target self only. Downtime casting lasts and ignores wards.', freeSpells: 0, projection: false, summoning: false, selfOnly: true },
  };
  const EXTRAS = { projection: { name: 'Astral Projection', pts: 10 }, summoning: { name: 'Summoning', pts: 10 } };
  const SPELLS = [
    ['forceblast', 'Force Blast', '12S, LoS, inanimate targets only'], ['mindspike', 'Mind Spike', '9M, LoS, ignores armor, bashing'], ['fireball', 'Fireball', '7M, LoS, 15 ft radius'],
    ['forcebolt', 'Force Bolt', '9M, LoS'], ['deathtouch', 'Death Touch', '12S, Touch'], ['invisibility', 'Invisibility', 'Self, 10 min'],
    ['disguise', 'Disguise', 'Self, 10 min'], ['telepathy', 'Telepathy', 'LoS, 10 min'], ['telekinesis', 'Telekinesis', 'LoS, 10 min'],
    ['forgetting', 'Forgetting', 'Touch, previous 10 min'], ['readmind', 'Read Mind', 'Touch, one question'], ['mindcontrol', 'Mind Control', 'Touch, one round'],
    ['speed', 'Speed*', 'Touch, Actions 3, 10 min'], ['fly', 'Fly', 'Self, 10 min, 25 mph'], ['buff', 'Buff*', 'Touch, +1 to one skill, 10 min'],
    ['heal', 'Heal†', 'Touch, recovery roll, once/day per target'], ['tough', 'Tough*', 'Touch, armor +3, 10 min'], ['wardworking', 'Ward Working', '15 ft radius; make/break/clear'],
  ].map(([id, name, eff]) => ({ id, name, eff, pts: 3 }));
  const SPELL_BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s]));
  // summons (p.2): all have the four attributes at 2 and their skills at their rating; shared skills below
  const SUMMON_SHARED = ['athletics', 'sneak', 'unarmed', 'magic'];
  const SUMMONS = [
    { id: 'fire', name: 'Fire Elemental', kind: 'elemental', extra: ['interrogate'], special: '[6S] lethal; Fireball', actions: 1 },
    { id: 'air', name: 'Air Elemental', kind: 'elemental', extra: ['palming'], special: 'Flying 30 mph', actions: 1 },
    { id: 'water', name: 'Water Elemental', kind: 'elemental', extra: ['soak'], special: 'Heal, Mind Control', actions: 1 },
    { id: 'earth', name: 'Earth Elemental', kind: 'elemental', extra: [], special: 'Armor 8; [8M] bashing', actions: 1 },
    { id: 'city', name: 'City Spirit', kind: 'spirit', extra: ['etiquette', 'network'], special: '—', actions: 2 },
    { id: 'commerce', name: 'Commerce Spirit', kind: 'spirit', extra: ['persuade', 'tools'], special: '—', actions: 2 },
    { id: 'machine', name: 'Machine Spirit', kind: 'spirit', extra: ['tools', 'computer', 'drive'], special: 'Innate basic tools, deck & chips [6M]', actions: 2 },
    { id: 'sea', name: 'Sea Spirit', kind: 'spirit', extra: [], special: 'Heal, Forgetting', actions: 2 },
    { id: 'wind', name: 'Wind Spirit', kind: 'spirit', extra: [], special: 'Speed; flying', actions: 2 },
    { id: 'land', name: 'Land Spirit', kind: 'spirit', extra: ['soak'], special: 'Buff', actions: 2 },
  ];
  // shamans call spirits; hermetics call elementals (Harry, 13 Nov)
  const summonKind = ch => ch.trad === 'shaman' ? 'spirit' : 'elemental';
  const SPELL_NAMES = ['Fireball', 'Heal', 'Mind Control', 'Forgetting', 'Speed', 'Buff'];
  // a summon's specials, each with the skill it is rolled with (spells: Magic; attacks: Unarmed; the machine spirit's deck: Computer)
  const summonSpecials = t => t.special === '—' ? [] : t.special.split(/;\s*|,\s*/).filter(Boolean).map(text => ({ text,
    skill: SPELL_NAMES.some(n => text.startsWith(n)) ? 'magic' : /deck/.test(text) ? 'computer' : /\[\d+[LMSD]\]/.test(text) ? 'unarmed' : null }));
  const canSummon = ch => !!ch.trad && (TRAD[ch.trad]?.summoning || !!ch.extras?.summoning);
  // a summoning roll: Magic vs TN 6 − Mental; spirit rating = successes, elemental = successes + 2 (0 successes: nothing comes)
  function summon(type, S, woundTN = 0, rnd) {
    const t = SUMMONS.find(x => x.id === type), r = roll(S.skill.magic, Math.max(0, 6 - S.attr.mental) + woundTN, rnd);
    const rating = r.succ ? r.succ + (t.kind === 'elemental' ? 2 : 0) : 0;
    return { roll: r, rating };
  }
  const CIRCLES = ['Political', 'Corporate', 'Police', 'Gang / Street', 'Media / Entertainment', 'Academic / Medical', 'Tribal', 'Fence / Fixer', 'Hacker', 'Magical', 'Rigger / Engineer'];
  const CIRCLE_LV = { contact: { name: 'Contact', tool: '[6L]', pts: 1 }, friend: { name: 'Friend', tool: '[9M]', pts: 3 }, patron: { name: 'Patron', tool: '[12S]', pts: 5 } };
  const FREE_CONTACTS = 2;
  const LIFE = { poor: { name: 'Poor', cash: 500, tool: '[3L]', pts: 1 }, normal: { name: 'Normal', cash: 2500, tool: '[6M]', pts: 3 }, rich: { name: 'Rich', cash: 15000, tool: '[9S]', pts: 7 } };
  const BYID = l => Object.fromEntries(l.map(x => [x.id, x]));
  // the skill each tool is used with: a weapon, a kit, a ride, a deck, a spell, a circle (Harry, 13 Nov)
  const TOOL_SKILL = { knife: ['melee'], sword: ['melee'], walther: ['guns'], fichetti: ['guns'], predator: ['guns'], hk227: ['guns'], ak97: ['guns'], eliminator: ['guns'],
    utilimax: ['artillery'], vigorous: ['artillery'], grenades: ['athletics'], medkit: ['tools'], apammo: [],
    spurs: ['melee'], implgun: ['guns'], cyberarm: ['unarmed', 'melee'], dermal: ['unarmed'],
    deck: ['computer'], veh: ['drive'], spell: ['magic'], circle: ['network', 'etiquette'], life: ['etiquette'] };
  const CY = BYID(CYBER), GE = BYID(GEAR), VE = BYID(VEH), DE = BYID(DECKS);

  // ---- the "print": where each rule lives in the book (filled in by campaign.js from the layout audit)
  const P = { sheet: 'p-sheet', start: 'p-start', skillcost: 'p-skillcost', meta: 'p-meta', attr: 'p-attr', life: 'p-life', circles: 'p-circles',
    cyber: 'p-cyber', gear: 'p-gear', veh: 'p-veh', chips: 'p-chips', decks: 'p-decks', magic: 'p-trad', spells: 'p-spells', rolls: 'p-rolls',
    combat: 'p-combat', soak: 'p-soak', karma: 'p-karma', turns: 'p-turns' };

  const interpretations = [
    'A Hermetic’s 3 free spells are the first 3 spells picked.',
    'Shamans summon spirits; Hermetics summon elementals (Harry, 13 Nov).',
    'A summon rolls its rating in dice at TN 4 (6 − its Mental 2); its spells use Magic, its attacks Unarmed (INTERP).',
    'Grenades are thrown with Athletics (the book names no skill for them).',
    'Skillwires: the wired skill is 5 (or its bought rating, if higher); racial bonuses are dropped and cyber bonuses still add (Harry, 13 Nov).',
  ];

  function blank(name = '') {
    return { name, meta: null, human: [], attr: { body: 0, coord: 0, mental: 0, social: 0 }, skills: {}, cyber: {}, wire: null, gear: { knife: 1 }, veh: {}, deck: null, chips: {},
      trad: null, extras: {}, spells: [], circles: {}, life: null };
  }

  // ---- the sheet is computed: chargen choices, then karma spends from sessions up to `asOf`
  function compute(ch, karmaLog = [], asOf = 99) {
    const M = ch.meta ? META[ch.meta] : null;
    const spend = [];                                      // [{label, pts, src:[...]}]
    const prov = {}; const pv = (k, ...ids) => (prov[k] = prov[k] || []).push(...ids);
    const B = s => 'B:' + s;                                // builder step placeholder, engine swaps in pc id
    const add = (label, pts, ...src) => { if (pts) spend.push({ label, pts, src }); };
    if (M) add(M.name, M.pts, B('meta'), P.meta);
    if (ch.meta === 'human') (ch.human || []).forEach(s => add(`Racial +1 ${SK_NAME[s]}`, HUMAN_BONUS_PTS, B('meta'), P.meta));
    const attr = {}; ATTRS.forEach(a => { const buy = ch.attr[a] || 0; attr[a] = 1 + buy; pv('a:' + a, P.start); if (buy) { add(`${ATTR_NAME[a]} +${buy}`, ATTR_COST[buy], B('attr'), P.attr); pv('a:' + a, B('attr'), P.attr); } });
    // karma spends (after chargen, in session order)
    const kl = karmaLog.filter(k => k.s <= asOf);
    const karma = { earned: 0, spent: 0 };
    kl.forEach(k => { karma.earned += k.award || 0; });
    const skillBuy = {}; ALL_SKILLS.forEach(s => skillBuy[s] = Math.max(1, ch.skills[s] || 1));
    ALL_SKILLS.forEach(s => { pv('s:' + s, P.start); if (skillBuy[s] > 1) { add(`${SK_NAME[s]} ${skillBuy[s]}`, skillCost(1, skillBuy[s]), B('skills'), P.skillcost); pv('s:' + s, B('skills'), P.skillcost); } });
    kl.forEach(k => (k.buy || []).forEach(b => {
      if (b.skill) { const from = skillBuy[b.skill]; skillBuy[b.skill] = b.to; const c = skillCost(from, b.to); karma.spent += c; pv('s:' + b.skill, k.id, P.karma); }
      if (b.spell) { karma.spent += 3; }
    }));
    // essence first (Magic cap depends on it)
    let essSpent = 0; const cyberList = [];
    CYBER.forEach(c => { const n = ch.cyber[c.id] || 0; if (!n) return; essSpent += c.ess * n; add(`${c.name}${n > 1 ? ' ×' + n : ''}`, c.pts * n, B('cyber'), P.cyber); cyberList.push({ ...c, n }); pv('essence', B('cyber'), P.cyber); });
    const essence = ESSENCE - essSpent; pv('essence', P.start);
    const magicCap = Math.max(0, Math.floor(essence / 10)); pv('magiccap', 'essence', P.skillcost);
    // effective attributes
    if (M) Object.entries(M.attr).forEach(([a, v]) => { attr[a] += v; pv('a:' + a, B('meta'), P.meta); });
    cyberList.forEach(c => c.fx?.attr && Object.entries(c.fx.attr).forEach(([a, v]) => { attr[a] += v * c.n; pv('a:' + a, B('cyber'), P.cyber); }));
    // effective skills
    const skill = {}, capped = {};
    ALL_SKILLS.forEach(s => {
      let r = skillBuy[s];
      if (s === 'magic' && r > magicCap) { capped[s] = r; r = magicCap; pv('s:magic', P.skillcost); }
      const wired = ch.cyber.skillwires && ch.wire === s;
      if (wired) { r = Math.max(r, 5); pv('s:' + s, B('cyber'), P.cyber); }
      else {
        if (M && M.skill[s]) { r += M.skill[s]; pv('s:' + s, B('meta'), P.meta); }
        if (ch.meta === 'human' && (ch.human || []).includes(s)) { r += 1; pv('s:' + s, B('meta'), P.meta); }
      }
      cyberList.forEach(c => { if (c.fx?.skill?.[s]) { r += c.fx.skill[s]; pv('s:' + s, B('cyber'), P.cyber); } });
      skill[s] = Math.max(0, r);
    });
    // magic
    const T = ch.trad ? TRAD[ch.trad] : null; let freeLeft = T ? T.freeSpells : 0; const spells = [];
    if (T) add(T.name, T.pts, B('magic'), P.magic);
    Object.keys(ch.extras || {}).forEach(e => { if (ch.extras[e] && T && EXTRAS[e] && !(e === 'projection' && T.projection) && !(e === 'summoning' && T.summoning)) add(EXTRAS[e].name, EXTRAS[e].pts, B('magic'), P.magic); });
    if (T) (ch.spells || []).forEach(id => { const sp = SPELL_BY_ID[id]; const free = freeLeft > 0; if (free) freeLeft--; else add(`Spell: ${sp.name}`, sp.pts, B('magic'), P.spells); spells.push({ ...sp, free }); });
    kl.forEach(k => (k.buy || []).forEach(b => { if (b.spell) spells.push({ ...SPELL_BY_ID[b.spell], karma: k.id }); }));
    // gear, vehicles, decks, chips
    const gearList = [], vehList = [], chipList = [];
    let outfit = 0, outfitSrc = null;
    GEAR.forEach(g => { const n = ch.gear[g.id] || 0; if (!n) return; add(`${g.name}${n > 1 ? ' ×' + n : ''}`, g.pts * n, B('gear'), P.gear); gearList.push({ ...g, n }); if (g.outfit && g.outfit > outfit) { outfit = g.outfit; outfitSrc = g; } });
    VEH.forEach(v => { const n = ch.veh[v.id] || 0; if (!n) return; add(`${v.name}${n > 1 ? ' ×' + n : ''}`, v.pts * n, B('veh'), P.veh); vehList.push({ ...v, n }); });
    const deck = ch.deck ? DE[ch.deck] : null; if (deck) add(deck.name, deck.pts, B('deck'), P.decks);
    Object.keys(ch.chips || {}).forEach(id => { if (!ch.chips[id]) return; const c = CHIP_BY_ID[id]; add(`Chip: ${c.name}`, c.pts, B('deck'), P.chips); chipList.push(c); });
    // circles: the first two contacts are free
    let freeC = FREE_CONTACTS; const circleList = [];
    CIRCLES.forEach(name => { const lv = ch.circles[name]; if (!lv) return; const L = CIRCLE_LV[lv]; let pts = L.pts; let free = false;
      if (lv === 'contact' && freeC > 0) { freeC--; pts = 0; free = true; } add(`${name} ${L.name.toLowerCase()}`, pts, B('circles'), P.circles); circleList.push({ ...L, level: L.name, name, free }); });
    const life = ch.life ? LIFE[ch.life] : null; if (life) add(`${life.name} lifestyle`, life.pts, B('life'), P.life);
    // derived numbers
    let actions = 2; pv('actions', P.start, P.turns);
    cyberList.forEach(c => { if (c.fx?.actions) { actions += c.fx.actions * c.n; pv('actions', B('cyber'), P.cyber); } });
    const rig = cyberList.filter(c => c.fx?.rig).reduce((s, c) => s + c.n, 0);
    let armor = outfit; pv('armor', P.combat); if (outfit) pv('armor', B('gear'), P.gear);
    if (M?.armor) { armor += M.armor; pv('armor', B('meta'), P.meta); }
    cyberList.forEach(c => { if (c.fx?.armor) { armor += c.fx.armor * c.n; pv('armor', B('cyber'), P.cyber); } });
    const health = 3 + attr.body; pv('health', P.combat, ...(prov['a:body'] || []));
    const cash = 100 + (life ? life.cash : 0); pv('cash', P.start); if (life) pv('cash', B('life'), P.life);
    const pts = spend.reduce((s, x) => s + x.pts, 0); pv('pts', P.start);
    // checks
    const warn = [];
    if (pts > BUDGET) warn.push(`${pts - BUDGET} points over the 100-point budget.`);
    if (essence < 0) warn.push('Essence below zero.');
    ALL_SKILLS.forEach(s => { if ((ch.skills[s] || 1) > START_CAP) warn.push(`${SK_NAME[s]} bought past 9 at creation.`); });
    if (capped.magic && (ch.skills.magic || 1) > 1) warn.push(`Magic ${capped.magic} is capped at ${magicCap} by Essence ${essence}.`);
    if ((ch.skills.magic || 1) > 1 && !T) warn.push('Magic bought without a tradition.');
    if (ch.cyber.skillwires && !ch.wire) warn.push('Skillwires: choose a skill.');
    if (ch.meta === 'human' && (ch.human || []).length > HUMAN_BONUS_MAX) warn.push('More than 3 racial bonuses.');
    if (karma.spent > karma.earned) warn.push(`Karma overspent by ${karma.spent - karma.earned}.`);
    ALL_SKILLS.forEach(s => { if (skillBuy[s] > KARMA_CAP) warn.push(`${SK_NAME[s]} above the karma cap of 12.`); });
    const tn = s => Math.max(0, 6 - attr[SKILL_ATTR[s]]);
    return { attr, skill, tn, essence, magicCap, actions, rig, armor, outfit: outfitSrc, health, cash, pts, left: BUDGET - pts, spend, karma,
      meta: M, trad: T, spells, cyber: cyberList, gear: gearList, veh: vehList, deck, chips: chipList, circles: circleList, life, warn, prov, adept: ch.trad === 'adept',
      trollDmg: ch.meta === 'troll' };
  }

  // ---- dice: (skill)d6 vs TN; modified rule of six
  function roll(pool, tn, rnd = Math.random) {
    const d = () => 1 + Math.floor(rnd() * 6);
    const dice = []; let succ = 0; let n = pool;
    for (let i = 0; i < n; i++) {
      let v = d(), tot = v, chain = [v];
      if (tn > 6) { while (v === 6 && tot < tn) { v = d(); tot += v; chain.push(v); } }
      else if (v === 6) n++;                                  // a six generates another die
      const ok = tot >= tn; if (ok) succ++; dice.push({ chain, tot, ok });
      if (n > pool + 30) break;
    }
    const bonuses = succ >= 1 ? Math.floor((succ - 1) / 2) : 0;
    return { pool, tn, dice, succ, bonuses, verdict: succ === 0 ? 'Failure' : bonuses ? `Success + ${bonuses} bonus${bonuses > 1 ? 'es' : ''}` : 'Success' };
  }

  return { ATTRS, ATTR_NAME, SKILLS, SK_NAME, SKILL_ATTR, ALL_SKILLS, stepCost, skillCost, ATTR_COST, BUDGET, ESSENCE, START_CAP, KARMA_CAP, META, HUMAN_BONUS_PTS, HUMAN_BONUS_MAX,
    CYBER, GEAR, VEH, DECKS, CHIPS, CHIP_TIERS, CHIP_KINDS, CHIP_BY_ID, TRAD, EXTRAS, SPELLS, SPELL_BY_ID, CIRCLES, CIRCLE_LV, FREE_CONTACTS, LIFE, TOOL_SKILL, SUMMONS, SUMMON_SHARED, canSummon, summon, summonKind, summonSpecials, CY, GE, VE, DE, P,
    interpretations, blank, compute, roll, name: 'Simplified Shadowrun 2e · v2.1' };
})();
