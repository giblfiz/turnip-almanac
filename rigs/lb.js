// Turnip Almanac rig: Lady Blackbird by John Harper (One Seven Design; CC BY-NC-SA 3.0 US). See NOTICE-LB.md.
// Mechanics and short labels only: trait, tag, key, secret and condition names are the book's; what each key or
// secret does is our own one-line paraphrase. The book's text stays in the reader's own copy of the PDF.
// Where the book is open or silent, the reading is listed in RIG.interpretations.
window.RIG = (() => {
  // print ids (books/lb-print.json) for the rules the app links to
  const P = { dice: 'lb-dice', levels: 'lb-levels', pass: 'lb-pass', fail: 'lb-fail', cond: 'lb-conditions', help: 'lb-helping', keys: 'lb-keys',
    adv: 'lb-advances', buyoff: 'lb-buyoff', refresh: 'lb-refresh', condBoxes: 'lb-cond-boxes', brackets: 'lb-brackets', newTraits: 'lb-new-traits',
    newKeys: 'lb-new-keys', gmCond: 'lb-gm-conditions', obstacles: 'lb-obstacles', sayYes: 'lb-gm-say-yes' };
  const POOL_START = 7, POOL_MAX = 10, XP_PER_ADV = 5, BUYOFF_ADV = 2;
  const LEVELS = [{ n: 2, name: 'Easy' }, { n: 3, name: 'Difficult' }, { n: 4, name: 'Challenging' }, { n: 5, name: 'Extreme' }];
  const CONDITIONS = [
    { id: 'injured', name: 'Injured' }, { id: 'dead', name: 'Dead', note: 'out of the story for now; whether it is final is up to the player' }, { id: 'tired', name: 'Tired' },
    { id: 'angry', name: 'Angry' }, { id: 'lost', name: 'Lost' }, { id: 'hunted', name: 'Hunted' }, { id: 'trapped', name: 'Trapped' }];
  const COND = Object.fromEntries(CONDITIONS.map(c => [c.id, c]));

  // traits: name → every tag the book lists for it, with the ones a pregen starts without in `locked` (the book's [brackets]).
  // `who` is the pregen it comes from; `src` its region in the print index.
  const T = (name, tags, locked, who, src, note) => ({ name, tags, locked: locked || [], who, src, note });
  const TRAITS = [
    T('Imperial Noble', ['Etiquette', 'Dance', 'Educated', 'History', 'Science', 'Wealth', 'Connections', 'House Blackbird'], [], 'lady', 'lb-trait-imperial-noble'),
    T('Master Sorcerer', ['Spellcaster', 'Channeling', 'Stormblood', 'Wind', 'Lightning'], ['Fly', 'Blast', 'Sense'], 'lady', 'lb-trait-master-sorcerer'),
    T('Athletic', ['Run', 'Fencing', 'Rapier', 'Duels', 'Shooting'], ['Pistol', 'Acrobatics'], 'lady', 'lb-trait-athletic'),
    T('Charm', ['Charisma', 'Presence', 'Command', 'Nobles', 'Servants'], ['Soldiers'], 'lady', 'lb-trait-charm'),
    T('Cunning', ['Deception', 'Misdirection', 'Disguise', 'Codes'], ['Sneak', 'Hide'], 'lady', 'lb-trait-cunning'),
    T('Pit-Fighter', ['Combat Tested', 'Brutal', 'Living Weapon', 'Fast', 'Hard'], ['Strong', 'Bone-breaking', 'Scary Look'], 'naomi', 'lb-trait-pit-fighter'),
    T('Bodyguard', ['Awareness', 'Threats', 'Defend', 'Disarm', 'Restrain', 'Carry', 'Delay'], ['Security', 'First Aid'], 'naomi', 'lb-trait-bodyguard'),
    T('Ex-Slave', ['Sneak', 'Hide', 'Run', 'Tough', 'Endure', 'Scrounge', 'Nobles'], ['Hatred', 'Iron Will'], 'naomi', 'lb-trait-ex-slave'),
    T('Keen', ['Insightful', 'Aware', 'Coiled', 'Liars', 'Traps'], ['Danger', 'Sense Motives'], 'naomi', 'lb-trait-keen'),
    T('Ex-Imperial Soldier', ['Tactics', 'Command', 'Soldiers', 'Rank', 'Connections', 'Maps', 'Imperial War Ships'], [], 'cyrus', 'lb-trait-ex-imperial-soldier'),
    T('Smuggler', ['Haggle', 'Deception', 'Sneak', 'Hide', 'Camouflage', 'Forgery', 'Pilot', 'Navigation'], ['Repair', 'Gunnery'], 'cyrus', 'lb-trait-smuggler'),
    T('Survivor', ['Tough', 'Run', 'Scrounge', 'Endure', 'Creepy Stare', 'Intimidate'], ['Medic'], 'cyrus', 'lb-trait-survivor'),
    T('Warrior', ['Battle-Hardened', 'Shooting', 'Two-Gun Style', 'Pistol', 'Fencing', 'Sword'], ['Brawl', 'Hail of Lead'], 'cyrus', 'lb-trait-warrior'),
    T('Burglar', ['Quiet', 'Sneak', 'Hide', 'Dextrous', 'Locks', 'Perceptive', 'Traps', 'Darkness'], ['Alarms', 'Distractions'], 'kale', 'lb-trait-burglar'),
    T('Tricky', ['Quick', 'Dirty Fighting', 'Tumbler', 'Escape', 'Contortionist'], ['Sleight of Hand', 'Acrobatics', 'Dagger'], 'kale', 'lb-trait-tricky'),
    T('Petty Magic', ['Light Spell', 'Dark Spell', 'Jump Spell', 'Shatter Spell'], ['Channeling', 'Spellcaster'], 'kale', 'lb-trait-petty-magic', 'one spell tag at a time'),
    T('Mechanic', ['Repair', 'Engines', 'Efficiency', 'Spare Parts', 'Sabotage'], ['Enhancements', 'Ship Weapons'], 'kale', 'lb-trait-mechanic'),
    T('Pilot', ['Daring', 'Steady', 'Maneuvering', 'Evasion', 'Tricky Flying', 'Navigation', 'Maps', 'Atmospherics'], ['The Owl', 'Battle', 'Ramming'], 'snargle', 'lb-trait-pilot'),
    T('Sky Sailor', ['Gunnery', 'Aim', 'Maintenance', 'Observation', 'Signals', 'Empire', 'Pirates', 'Free Worlds', 'Haven'], ['Repair', 'Connections'], 'snargle', 'lb-trait-sky-sailor'),
    T('Goblin', ['Warp Shape', 'Glide', 'Nightvision', 'Agile', 'Quick', 'Tumbler', 'Teeth & Claws'], ['Mimic Shape', 'Reckless', 'Connections'], 'snargle', 'lb-trait-goblin'),
    T('Sly', ['Crafty', 'Sneaky', 'Distractions', 'Bluff', 'Languages', 'Trade Speak'], ['Sharp', 'Disguise'], 'snargle', 'lb-trait-sly'),
    // the book's new traits: bought with an advance, and every tag bought after that
    ...[['Reputation', ['Trustworthy', 'Reliable', 'Fearless', 'Reckless', 'Ruthless', 'Underhanded', 'Dangerous', 'Deadly', 'Cruel', 'Unpredictable', 'Heroic', 'Honorable', 'Compassionate']],
      ['Crew', ['Gunnery', 'Aim', 'Maintenance', 'Damage Control', 'Observation', 'Signals', 'The Owl', 'Cargo', 'Supplies', 'First Aid', 'Boarding Action']],
      ['Sky Pirate', ['Vicious', 'Hack & Slash', 'Cutlass', 'Knife', 'Shooting', 'Boomstick', 'Gunner', 'Boarding Action', 'Crew', 'Loot', 'Capture', 'Drink', 'Hardy', 'Treacherous', 'Intimidating', 'Contacts', 'Underworld']],
      ['Explorer', ['Curious', 'Aware', 'Nimble', 'Hardy', 'Ancient Lore', 'Languages', 'Ruins', 'Monsters', 'Myths', 'Maps']],
      ['Investigator', ['Search', 'Deduction', 'Perceptive', 'Seduce', 'Interrogate', 'Bribe', 'Coerce', 'Contacts', 'Sneak', 'Deception', 'Insight', 'Logic', 'Fisticuffs', 'Pistol']],
      ['Miner', ['Tunnels', 'Labor', 'Strong', 'Pickaxe', 'Dim Light', 'Hold Breath', 'Ores', 'Resist Cold', 'Endure']],
      ['Ghostblood', ['Fly', 'Possess', 'Insubstantial', 'Control Technology', 'Electrical', 'Dominate', 'Terrify', 'Sneak', 'Overload']],
      ['Stoneblood', ['Harden', 'Make Heavy', 'Meld Into Stone', 'Petrify', 'Immovable', 'Mauler', 'Move Through Stone', 'Shape Rock', 'Tough']],
      ['Voidblood', ['Invisibility', 'Vacuum', 'Make Weightless', 'Pass Through', 'Erase Mind', 'Counterspell', 'Disintegrate']],
      ['Dreamblood', ['Sedate', 'Manipulate Dream', 'Enter Dream', 'Hallucination', 'Blind Fighting', 'Read Mind']],
      ['Bloodhunter', ['Gather Information', 'Interrogate', 'Intimidate', 'Incognito', 'Recognize Blood', 'Reflexes', 'Authority', 'Firefights']],
      ['Bold', ['Brave', 'Daring', 'Heroic', 'Rescue', 'Falling', 'Fire', 'Reckless', 'Explosions', 'Escapes', 'Outnumbered', 'Underdog']]]
      .map(([n, tags]) => T(n, [], tags, null, 'lb-trait-' + n.toLowerCase().replace(/[^a-z]+/g, '-'))),
  ];
  const TR = Object.fromEntries(TRAITS.map(t => [t.name, t]));

  // keys: hit = when it earns XP or a pool die; off = the buyoff (worth two advances). Our words, one line each.
  const K = (id, name, hit, off, who, src) => ({ id, name, hit, off, who, src: src || 'lb-key-' + id });
  const KEYS = [
    K('paragon', 'Key of the Paragon', 'You show you stand above common folk, or a noble trait solves a problem.', 'Renounce your noble birth.', 'lady'),
    K('mission', 'Key of the Mission', 'You act to slip out of the Empire and reach the Pirate King.', 'Give the mission up.', 'lady'),
    K('impostor', 'Key of the Impostor', 'Your commoner disguise fools someone.', 'Tell someone you fooled who you really are.', 'lady'),
    K('guardian', 'Key of the Guardian', 'The Lady sways one of your choices, or you shield her from harm.', 'Break with the Lady.', 'naomi'),
    K('vengeance', 'Key of Vengeance', 'You strike at the Empire, above all by killing one of its people.', 'Forgive the Empire.', 'naomi'),
    K('warrior', 'Key of the Warrior', 'You fight foes as good as you or better.', 'Walk away from a good fight.', 'naomi'),
    K('commander', 'Key of the Commander', 'You make a plan and give the orders that carry it out.', 'Accept someone else as leader.', 'cyrus'),
    K('longing', 'Key of Hidden Longing', 'Your hidden feeling for the Lady steers a choice, or shows sideways.', 'Let the feeling go, or say it out loud.', 'cyrus'),
    K('outcast', 'Key of the Outcast', 'Your exile makes trouble, or matters in a scene.', 'Get your place in the Empire back, or find a new crowd to belong to.', 'cyrus'),
    K('greed', 'Key of Greed', 'You pocket a prize worth having, or pull off a rich haul.', 'Give up stealing for good.', 'kale'),
    K('mission-kale', 'Key of the Mission', 'You act to bring the Lady safely to the Pirate King.', 'Give the mission up.', 'kale'),
    K('fraternity', 'Key of Fraternity', 'Vance’s wishes steer you, or your loyalty to him shows.', 'Break the bond.', 'kale'),
    K('daredevil', 'Key of the Daredevil', 'You pull off something risky and cool, piloting stunts above all.', 'Play it very, very safe.', 'snargle'),
    K('conscience', 'Key of Conscience', 'You help someone in trouble, or change a life for the better.', 'Turn away someone who asks for help.', 'snargle'),
    K('banter', 'Key of Banter', 'A line of yours makes the table laugh, or you explain in pilot jargon.', 'The whole table groans at a joke.', 'snargle'),
    K('traveler', 'Key of the Traveler', 'You bring someone or somewhere to life with a telling detail, or visit somewhere unseen.', 'Skip a chance to see something new.', null),
    K('broker', 'Key of the Broker', 'You bargain, make a contact, or trade a favour.', 'Burn your whole network.', null),
    K('tinkerer', 'Key of the Tinkerer', 'You fiddle with machinery: fixing, upgrading, jury-rigging.', 'Leave a piece of tech alone.', null),
    K('pirate', 'Key of the Pirate', 'Your buccaneering wins someone’s awe or grows your legend.', 'Go straight.', null),
    K('vow', 'Key of the Vow', 'Your vow weighs on a real decision.', 'Break the vow.', null),
  ];
  const KY = Object.fromEntries(KEYS.map(k => [k.id, k]));

  // secrets: what each lets you do (our words); once = once per session, restored by a refreshment scene; needs = what learning it takes
  const SE = (id, name, does, once, who, needs) => ({ id, name, does, once: !!once, who, needs, src: 'lb-secret-' + id });
  const SECRETS = [
    SE('stormblood', 'Secret of Stormblood', 'Sorcery is yours as long as you have a voice; brings the Master Sorcerer trait and its Stormblood tag.', false, 'lady'),
    SE('inner-focus', 'Secret of Inner Focus', 'A failed sorcery roll may be thrown again.', true, 'lady'),
    SE('destruction', 'Secret of Destruction', 'Your bare hands smash things like a sledgehammer would.', false, 'naomi'),
    SE('bodyguard', 'Secret of the Bodyguard', 'A failed roll to protect someone may be thrown again.', true, 'naomi'),
    SE('leadership', 'Secret of Leadership', 'Your orders, advice or example give someone else a second throw at a failure.', true, 'cyrus'),
    SE('warpblood', 'Secret of Warpblood', 'Blink from place to place, alone or with whoever you hold.', true, 'cyrus'),
    SE('concealment', 'Secret of Concealment', 'No search finds everything on you: a few vital things stay hidden, and any ordinary small item turns up when needed.', false, 'kale'),
    SE('reflexes', 'Secret of Reflexes', 'A failed roll of agility or quick hands may be thrown again.', true, 'kale'),
    SE('shape-warping', 'Secret of Shape Warping', 'Reshape your body and colouring whenever you like.', false, 'snargle'),
    SE('lucky-break', 'Secret of the Lucky Break', 'After a pass, the pool dice you threw come back to you.', true, 'snargle'),
    SE('true-course', 'Secret of the True Course', 'You can find the way through the Remnants.', false, null, 'Taught the navigation codes by one who knows them.'),
    SE('explorer', 'Secret of the Explorer', 'A failed roll among unfamiliar places or customs may be thrown again.', true, null, 'You have crossed the Blue from side to side.'),
    SE('sky-song', 'Secret of the Sky Song', 'Summon sky squid and attempt a conversation.', false, null, 'Trained by a master of the song, or dream-linked to a squid.'),
    SE('shootist', 'Secret of the Shootist', 'A missed shot may be thrown again.', true, null, 'Many gunfights, or a teacher who has had them.'),
    SE('experience', 'Secret of Experience', 'One roll may draw tags from several traits.', true, null, 'Wide experience of dangerous situations.'),
  ];
  const SC = Object.fromEntries(SECRETS.map(s => [s.id, s]));

  // the five pregens as the book prints them: traits with the tags they start with, three keys, two secrets, no conditions
  const PRE = [
    { id: 'lady', name: 'Lady Blackbird', full: 'Natasha Syri, Lady Blackbird', role: 'Runaway noblewoman and storm sorcerer', page: 3 },
    { id: 'naomi', name: 'Naomi Bishop', role: 'Arena fighter turned the Lady’s protector', page: 4 },
    { id: 'cyrus', name: 'Cyrus Vance', role: 'The Owl’s captain: once an Imperial officer, now a smuggler', page: 5 },
    { id: 'kale', name: 'Kale Arkam', role: 'Thief with a few small spells; keeps The Owl flying', page: 6 },
    { id: 'snargle', name: 'Snargle', role: 'The goblin at The Owl’s helm', page: 7 },
  ];
  const PRE_BY = Object.fromEntries(PRE.map(p => [p.id, p]));
  function pregen(id) {
    const p = PRE_BY[id]; if (!p) return blank();
    return { name: p.name, pre: id, traits: Object.fromEntries(TRAITS.filter(t => t.who === id).map(t => [t.name, [...t.tags]])),
      keys: KEYS.filter(k => k.who === id).map(k => k.id), secrets: SECRETS.filter(s => s.who === id).map(s => s.id), cond: [], pool: POOL_START, used: [] };
  }
  function blank(name = '') { return { name, pre: null, traits: {}, keys: [], secrets: [], cond: [], pool: POOL_START, used: [] }; }

  // the sheet: the build, then what play added (filed by session, up to asOf).
  // An advancement entry holds: xp [{key, n}] (key hits taken as XP), buy [{kind: tag|trait|key|secret, trait?, name}], off [keyId] (buyoffs).
  function compute(ch, advLog = [], asOf = 99) {
    const warn = [], prov = {}; const pv = (k, ...ids) => (prov[k] = prov[k] || []).push(...ids.filter(Boolean));
    const traits = {}; Object.entries(ch.traits || {}).forEach(([n, tags]) => { traits[n] = { name: n, tags: [...tags], bought: [] }; pv('t:' + n, TR[n]?.src, 'B:traits'); });
    let keys = [...(ch.keys || [])], secrets = [...(ch.secrets || [])];
    keys.forEach(k => pv('k:' + k, KY[k]?.src, 'B:keys')); secrets.forEach(s => pv('s:' + s, SC[s]?.src, 'B:secrets'));
    let xp = 0, offs = 0, spent = 0; const hits = {}, offKeys = [];
    advLog.filter(e => e.s <= asOf).forEach(e => {
      (e.xp || []).forEach(h => { xp += h.n; hits[h.key] = (hits[h.key] || 0) + h.n; pv('xp', e.id); pv('k:' + h.key, e.id); });
      (e.off || []).forEach(k => { if (keys.includes(k)) { keys = keys.filter(x => x !== k); offs++; offKeys.push(k); pv('adv', e.id, P.buyoff); } });
      (e.buy || []).forEach(b => { spent++; pv('adv', e.id);
        if (b.kind === 'tag') { const t = traits[b.trait]; if (t && !t.tags.includes(b.name)) { t.tags.push(b.name); t.bought.push(b.name); pv('t:' + b.trait, e.id, P.adv); } }
        else if (b.kind === 'trait') { if (!traits[b.name]) { traits[b.name] = { name: b.name, tags: [], bought: [], isNew: true }; pv('t:' + b.name, TR[b.name]?.src, e.id, P.adv); } }
        else if (b.kind === 'key') { if (!keys.includes(b.name)) { keys.push(b.name); pv('k:' + b.name, KY[b.name]?.src, e.id, P.adv); } }
        else if (b.kind === 'secret') { if (!secrets.includes(b.name)) { secrets.push(b.name); pv('s:' + b.name, SC[b.name]?.src, e.id, P.adv); } }
      });
    });
    // Stormblood brings its own trait and tag (the secret says so)
    if (secrets.includes('stormblood')) { if (!traits['Master Sorcerer']) traits['Master Sorcerer'] = { name: 'Master Sorcerer', tags: [], bought: [] }; if (!traits['Master Sorcerer'].tags.includes('Stormblood')) traits['Master Sorcerer'].tags.push('Stormblood'); }
    const earned = Math.floor(xp / XP_PER_ADV) + BUYOFF_ADV * offs, unspent = earned - spent;
    pv('xp', P.keys); pv('adv', P.adv, 'xp'); pv('pool', P.refresh, P.fail, P.keys, 'B:name');
    const pool = Math.max(0, Math.min(POOL_MAX, ch.pool ?? POOL_START));
    if (unspent < 0) warn.push(`${-unspent} more advance${unspent === -1 ? '' : 's'} spent than earned.`);
    if (!Object.keys(traits).length) warn.push('No traits yet.');
    if (!keys.length) warn.push('No keys yet: keys are how a character earns experience.');
    const dupe = keys.map(k => KY[k]?.name).filter((n, i, a) => n && a.indexOf(n) !== i); if (dupe.length) warn.push(`The same key twice: ${dupe[0]}.`);
    return { name: ch.name, pre: PRE_BY[ch.pre] || null, traits, keys, secrets, cond: ch.cond || [], used: ch.used || [], pool, xp, xpIn: xp % XP_PER_ADV, hits, earned, spent, unspent, offKeys,
      spend: [{ label: 'Advances spent', pts: spent, of: earned, src: ['B:adv', P.adv] }], warn, prov,
      // the engine's generic fields
      pts: spent, left: unspent };
  }

  // the roll: d6s, each 4+ a hit; pass with hits ≥ difficulty
  function roll(n, diff = 3, rnd = Math.random) {
    const dice = Array.from({ length: Math.max(0, n) }, () => { const v = 1 + Math.floor(rnd() * 6); return { v, ok: v >= 4 }; });
    const hits = dice.filter(d => d.ok).length, ok = hits >= diff;
    return { dice, hits, diff, ok, verdict: ok ? 'Pass' : 'Fail' };
  }
  // what a roll does to the pool: pass → the pool dice used are gone; fail → they come back, plus one more (cap 10)
  const poolAfter = (pool, used, ok, keep = false) => ok ? (keep ? pool : pool - used) : Math.min(POOL_MAX, pool + 1);
  const levelName = n => (LEVELS.find(l => l.n === n) || { name: n >= 5 ? 'Extreme' : 'Easy' }).name;

  const interpretations = [
    'Starting blank: the book gives no rules for making a new character, only five ready ones and an empty sheet. A blank character here picks any traits, tags, keys and secrets; the Almanac warns only for no traits or no keys.',
    'A trait from another character, or one of the new traits, starts with no tags; at the table, tags beyond the book’s cost an advance each.',
    'Bracketed tags are shown greyed on the sheet and in the builder; buying one is an advance.',
    'Rolling: the sheet adds 1 die, 1 for the chosen trait, 1 per chosen tag and the pool dice you set. Tags from a second trait need the Secret of Experience; the sheet lets you pick them anyway and says so in the roll.',
    'Petty Magic: choosing one spell tag clears the other spell tags (the book allows one at a time).',
    'Pool: a pass discards the pool dice used; a fail returns them and adds one. The cap of 10 that the book gives for key hits is applied to every gain.',
    'Refresh raises the pool to 7, never lowers it, and restores once-per-session secrets; removing a condition is a separate tap.',
    'Key hits: each press is one hit taken as 1 XP or 1 pool die. Going into danger for a key is two presses, in any mix.',
    'Advances: 5 XP make one; a buyoff removes the key and gives two. XP and spends are filed under the latest session.',
    'Keys from other characters may be bought (never the same key twice; the two Keys of the Mission count as one name). Secrets list what the book says learning them takes; whether a character has the means is the table’s call.',
    'Round order: Lady Blackbird has no initiative. The round card is a list of who is in the scene, with pools and conditions; the GM moves the spotlight.',
  ];
  return { P, POOL_START, POOL_MAX, XP_PER_ADV, BUYOFF_ADV, LEVELS, CONDITIONS, COND, TRAITS, TR, KEYS, KY, SECRETS, SC, PRE, PRE_BY,
    pregen, blank, compute, roll, poolAfter, levelName, interpretations, name: 'Lady Blackbird' };
})();
