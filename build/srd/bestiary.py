#!/usr/bin/env python3
"""SRD 5.2.1 bestiary and magic items, from the reader's PDF (books/srd-5.2.1.pdf) with PyMuPDF.

    python3 build/srd/bestiary.py            parse, then write the generated files below
    python3 build/srd/bestiary.py --check    parse and report only

Writes (all generated; edit this script, not them):
  rigs/srd-bestiary.js     window.SRD_BESTIARY = { monsters, items } (names, numbers, parsed mechanics; no prose)
  books/srd-print.json     the print entries for pp. 204-364 replaced: rules regions, srd-item-<slug>, srd-mon-<slug>
  campaign-srd.js          its inlined `print: [...]` line refreshed from books/srd-print.json
One-line summaries in our own words come from build/srd/summaries.json (id -> text; written by hand / by us, never
copied from the book); entries without one get a summary composed from their numbers.
"""
import json, os, re, sys
import fitz
sys.path.insert(0, os.path.dirname(__file__))
from pdfrows import rows, join_text, segments

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF = os.path.join(ROOT, 'books', 'srd-5.2.1.pdf')

def slug(s):
    # the same slug the campaign's spell ids use: lower case, apostrophes dropped, every other run of non-letters a hyphen
    s = s.lower().replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def bold_italic(sp): return 'BoldItalic' in sp['font'] or 'Bold-Italic' in sp['font']
def is_font(r, name, size=None, tol=0.3): return r['font'].startswith(name) and (size is None or abs(r['size'] - size) <= tol)

ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha']
ABIL_NAME = {'strength': 'str', 'dexterity': 'dex', 'constitution': 'con', 'intelligence': 'int', 'wisdom': 'wis', 'charisma': 'cha'}
SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']
SECTIONS = {'Traits': 'traits', 'Actions': 'actions', 'Bonus Actions': 'bonus', 'Reactions': 'reactions', 'Legendary Actions': 'legendary'}
FIELDS = ['AC', 'HP', 'Speed', 'Skills', 'Resistances', 'Vulnerabilities', 'Immunities', 'Gear', 'Senses', 'Languages', 'CR']

# ------------------------------------------------------------------ mechanics inside an action or trait
DICE = r'(\d+)\s*\((\d+d\d+(?:\s*[+\-–]\s*\d+)?)\)'
def dice_norm(s): return re.sub(r'\s+', '', s).replace('–', '-')

def mechanics(name_raw, text):
    """What a table needs from one stat-block entry: attack, damage, save, recharge, uses. Text is never kept."""
    m = {}
    nm = name_raw
    rc = re.search(r'\(Recharge ([^)]+)\)', nm)
    if rc:
        v = rc.group(1).replace('–', '-').strip()
        m['recharge'] = v
    us = re.search(r'\((\d+)/Day(?: Each)?(?:,? or (\d+)/Day in Lair)?\)', nm)
    if us:
        m['uses'] = {'n': int(us.group(1)), 'per': 'day'}
        if us.group(2): m['uses']['lair'] = int(us.group(2))
    cost = re.search(r'\(Costs (\d+) Actions\)', nm)
    if cost: m['cost'] = int(cost.group(1))
    name = re.sub(r'\s*\((?:Recharge [^)]+|\d+/Day[^)]*|Costs \d+ Actions)\)', '', nm).strip()
    # alternate forms: "(Bear or Hybrid Form Only)"
    form = re.search(r'\(([^)]*Form[^)]*)\)', name)
    if form: m['form'] = form.group(1); name = name.replace('(' + form.group(1) + ')', '').strip()
    a = re.match(r'(Melee or Ranged|Melee|Ranged) Attack Roll: ([+-]\d+)(?: \(with Advantage[^)]*\))?, (.*?)\. Hit: (.*)', text)
    if a:
        m['atk'] = {'kind': a.group(1).lower(), 'bonus': int(a.group(2))}
        rr = a.group(3)
        reach = re.search(r'reach (\d+) ft', rr); rng = re.search(r'range (\d+)(?:/(\d+))? ft', rr)
        if reach: m['atk']['reach'] = int(reach.group(1))
        if rng: m['atk']['range'] = [int(rng.group(1))] + ([int(rng.group(2))] if rng.group(2) else [])
        hit = a.group(4)
        dmg = []
        d = re.match(DICE + r' (\w+) damage', hit)
        if d:
            dmg.append({'avg': int(d.group(1)), 'dice': dice_norm(d.group(2)), 'type': d.group(3).lower()})
            rest = hit[d.end():]
            while True:
                d2 = re.match(r',? plus ' + DICE + r' (\w+) damage', rest)
                if not d2: break
                dmg.append({'avg': int(d2.group(1)), 'dice': dice_norm(d2.group(2)), 'type': d2.group(3).lower()}); rest = rest[d2.end():]
        if not dmg:
            flat = re.match(r'(\d+) (\w+) damage', hit)
            if flat: dmg.append({'avg': int(flat.group(1)), 'dice': None, 'type': flat.group(2).lower()})
        if dmg: m['atk']['dmg'] = dmg
        alt = re.search(DICE + r' (\w+) damage (?:if|when) used with two hands', hit)
        if alt: m['atk']['twoHands'] = dice_norm(alt.group(2))
    s = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: or (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))? Saving Throw: DC (\d+)', text)
    if s:
        m['save'] = {'ab': ABIL_NAME[s.group(1).lower()], 'dc': int(s.group(3))}
        if s.group(2): m['save']['or'] = ABIL_NAME[s.group(2).lower()]
        f = re.search(r'Failure: ' + DICE + r' (\w+) damage', text)
        dm = []
        if f: dm.append({'avg': int(f.group(1)), 'dice': dice_norm(f.group(2)), 'type': f.group(3).lower()})
        if f:
            for d in re.finditer(r'plus ' + DICE + r' (\w+) damage', text[f.end():f.end() + 80]):
                dm.append({'avg': int(d.group(1)), 'dice': dice_norm(d.group(2)), 'type': d.group(3).lower()})
        if dm: m['save']['dmg'] = dm
        if re.search(r'Success: Half damage', text): m['save']['half'] = True
    if 'atk' not in m and 'save' not in m:
        # healing, or damage outside an attack (a trait that hurts)
        h = re.search(r'regains ' + DICE + r' Hit Points', text)
        if h: m['heal'] = dice_norm(h.group(2))
        dd = re.search(DICE + r' (\w+) damage', text)
        if dd and 'heal' not in m: m['dmg'] = [{'avg': int(dd.group(1)), 'dice': dice_norm(dd.group(2)), 'type': dd.group(3).lower()}]
    if name == 'Spellcasting' or name.startswith('Spellcasting'):
        sc = {}
        ab = re.search(r'using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability', text)
        if ab: sc['ab'] = ABIL_NAME[ab.group(1).lower()]
        dc = re.search(r'spell save DC (\d+)', text)
        if dc: sc['dc'] = int(dc.group(1))
        hit = re.search(r'([+-]\d+) to hit with spell attacks', text)
        if hit: sc['hit'] = int(hit.group(1))
        lists = []
        for g in re.finditer(r'(At Will|\d+/Day(?: Each)?):\s*(.*?)(?=(?:At Will|\d+/Day(?: Each)?):|$)', text):
            names = [re.sub(r'\s*\(.*?\)$', '', x.strip(' .')).strip() for x in re.split(r',(?![^()]*\))', g.group(2)) if x.strip(' .')]
            lists.append({'uses': g.group(1).replace(' Each', ' each'), 'spells': names})
        if lists: sc['lists'] = lists
        m['cast'] = sc
    return name, m

# ------------------------------------------------------------------ one stat block
def parse_speed(s):
    out = {}
    for part in s.split(','):
        part = part.strip()
        mm = re.match(r'(?:(Walk|Burrow|Climb|Fly|Swim)\s+)?(\d+) ft\.?(?: \((hover)\))?', part, re.I)
        if mm:
            out[(mm.group(1) or 'walk').lower()] = int(mm.group(2))
            if mm.group(3): out['hover'] = True
    return out

def parse_block(name, rs):
    """rs: the rows from the line after the name to the end of the block."""
    mon = {'name': name}
    probs = []
    i = 0
    tl = rs[0]['text'] if rs else ''
    if rs and rs[0]['font'].startswith('Optima-Italic'):
        i = 1
        t = tl.split(',')
        mon['alignment'] = t[-1].strip() if len(t) > 1 else ''
        head = ','.join(t[:-1]).strip() if len(t) > 1 else tl
        sz = re.match(r'((?:%s)(?: or (?:%s))?)\s+(.*)' % ('|'.join(SIZES), '|'.join(SIZES)), head)
        if sz:
            mon['size'] = sz.group(1); mon['type'] = sz.group(2)
        else: probs.append('size/type: ' + head)
    else: probs.append('no type line')
    # the header fields: labelled rows, each possibly continued on the next unlabelled row
    fields = {}; last = None; abil_txt = ''
    while i < len(rs):
        r = rs[i]
        if is_font(r, 'GillSans', 12.0) and r['text'] in SECTIONS: break
        if r['font'].startswith('GillSans') and r['size'] < 7: i += 1; continue           # MOD SAVE header
        if 'SC' in r['font'] or re.match(r'^(Str|Dex|Con|Int|Wis|Cha)\b', r['text']): abil_txt += ' ' + r['text']; i += 1; last = None; continue
        lab = next((f for f in FIELDS if r['text'] == f or r['text'].startswith(f + ' ')), None) if r['font'].startswith('Optima-Bold') else None
        if lab:
            fields[lab] = r['text'][len(lab):].strip(); last = lab
        elif last:
            fields[last] = join_text([fields[last], r['text']])
        else:
            probs.append('stray header row: ' + r['text'][:40])
        i += 1
    for k in ['AC', 'HP', 'Speed', 'CR']:
        if k not in fields: probs.append('missing ' + k)
    ac = fields.get('AC', '')
    m = re.match(r'(\d+)(.*?)(?:Initiative ([+-]\d+) \((\d+)\))?$', ac)
    if m:
        mon['ac'] = int(m.group(1))
        extra = m.group(2).strip()
        if extra: mon['acNote'] = extra
        if m.group(3): mon['init'] = int(m.group(3)); mon['initScore'] = int(m.group(4))
    else: probs.append('AC: ' + ac)
    hp = fields.get('HP', '')
    m = re.match(r'(\d+)(?: \(([^)]+)\))?', hp)
    if m:
        mon['hp'] = int(m.group(1))
        if m.group(2): mon['hd'] = dice_norm(m.group(2))
    else: probs.append('HP: ' + hp)
    mon['speed'] = parse_speed(fields.get('Speed', ''))
    if not mon['speed']: probs.append('speed: ' + fields.get('Speed', ''))
    ab = {}
    for mm in re.finditer(r'(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)\s+([+-]?\d+)\s+([+-]?\d+)', abil_txt):
        ab[mm.group(1).lower()] = {'score': int(mm.group(2)), 'mod': int(mm.group(3)), 'save': int(mm.group(4))}
    if len(ab) != 6: probs.append('abilities: %d' % len(ab))
    mon['abil'] = ab
    if 'Skills' in fields:
        mon['skills'] = {slug(s.group(1)): int(s.group(2)) for s in re.finditer(r'([A-Z][A-Za-z ]+?) ([+-]\d+)', fields['Skills'])}
    for k, key in [('Resistances', 'resist'), ('Vulnerabilities', 'vuln')]:
        if k in fields: mon[key] = [x.strip().lower() for x in re.split(r'[,;]', fields[k]) if x.strip()]
    if 'Immunities' in fields:
        dmg, _, cond = fields['Immunities'].partition(';')
        names_cond = {'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'}
        if not cond and all(x.strip().lower() in names_cond for x in dmg.split(',')): dmg, cond = '', dmg
        if dmg.strip(): mon['immune'] = [x.strip().lower() for x in dmg.split(',') if x.strip()]
        if cond.strip(): mon['condImmune'] = [x.strip().lower() for x in cond.split(',') if x.strip()]
    if 'Gear' in fields: mon['gear'] = [x.strip() for x in fields['Gear'].split(',') if x.strip()]
    sn = fields.get('Senses', '')
    pp = re.search(r'Passive Perception (\d+)', sn)
    if pp: mon['passive'] = int(pp.group(1))
    mon['senses'] = {s.group(1).lower(): int(s.group(2)) for s in re.finditer(r'(Blindsight|Darkvision|Tremorsense|Truesight) (\d+) ft', sn)}
    if 'Languages' in fields: mon['languages'] = fields['Languages']
    cr = fields.get('CR', '')
    m = re.match(r'([\d/]+) \((?:XP )?([\d,]+)(?: XP)?(?:, or ([\d,]+) in lair)?; PB \+(\d+)\)', cr)
    if m:
        mon['cr'] = m.group(1); mon['xp'] = int(m.group(2).replace(',', '')); mon['pb'] = int(m.group(4))
        if m.group(3): mon['xpLair'] = int(m.group(3).replace(',', ''))
    else: probs.append('CR: ' + cr)
    # sections: entries start with a bold-italic name
    sec = None; cur = None
    def close():
        if cur is None: return
        text = join_text(cur['rows'])
        raw = cur['raw']
        body = text[len(raw):].lstrip('. ').strip() if text.startswith(raw) else text
        nm, mech = mechanics(raw.rstrip('.').strip(), body)
        e = {'name': nm}
        e.update(mech)
        if nm == 'Multiattack': e['_text'] = body
        mon.setdefault(sec, []).append(e)
    while i < len(rs):
        r = rs[i]; i += 1
        if is_font(r, 'GillSans', 12.0) and r['text'] in SECTIONS:
            close(); cur = None; sec = SECTIONS[r['text']]; continue
        if sec is None: probs.append('row before sections: ' + r['text'][:40]); continue
        if sec == 'legendary' and r['text'].startswith('Legendary Action Uses:'):
            u = re.match(r'Legendary Action Uses: (\d+)(?: \((\d+) in Lair\))?', r['text'])
            if u: mon['legendaryUses'] = int(u.group(1)); mon['legendaryLair'] = int(u.group(2)) if u.group(2) else None
            cur = None; continue
        if sec == 'legendary' and cur is None and r['font'].startswith('Optima-Italic'): continue   # the uses paragraph, continued
        if bold_italic(r['spans'][0]):
            close()
            raw = ''
            for sp in r['spans']:
                if bold_italic(sp): raw += sp['text']
                else: break
            cur = {'raw': re.sub(r'\s+', ' ', raw).strip(), 'rows': [r]}
        elif cur is not None:
            cur['rows'].append(r)
        else:
            probs.append('stray row in %s: %s' % (sec, r['text'][:40]))
    close()
    # Multiattack: which of the block's own actions it makes, and how many of each (names and numbers only)
    WORD = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8}
    own = sorted({e['name'] for k in ('actions', 'bonus') for e in mon.get(k, []) if e['name'] != 'Multiattack'}, key=len, reverse=True)
    for e in mon.get('actions', []):
        t = e.pop('_text', None)
        if t is None: continue
        parts = []
        anyc = re.search(r'makes (\w+) attacks, using (.*?) in any combination', t)
        if anyc and anyc.group(1) in WORD:
            parts.append({'n': WORD[anyc.group(1)], 'of': sorted([nm for nm in own if nm in anyc.group(2)], key=anyc.group(2).find)})
        for mm in re.finditer(r'\b(one|two|three|four|five|six|seven|eight)\b ([^.,;]*?) attacks?\b', t):
            hit = [nm for nm in own if nm in mm.group(2)]
            for nm in hit[:2]: parts.append({'n': WORD[mm.group(1)], 'of': [nm]})
        heads = re.search(r'makes as many (.+?) attacks as it has heads', t)
        if heads: parts.append({'n': None, 'per': 'head', 'of': [nm for nm in own if nm in heads.group(1)]})
        for nm in own:
            if any(nm in p['of'] for p in parts): continue
            if re.search(r'\b(?:uses?|use of|replace one attack with)\b[^.]*' + re.escape(nm), t): parts.append({'n': 1, 'of': [nm], 'alt': True})
        if parts: e['multi'] = parts
    return mon, probs

def monsters(doc):
    rs = rows(doc, 222, 222) + rows(doc, 254, 364)
    out, probs, chapter = [], {}, 'Monsters'
    starts = [k for k, r in enumerate(rs) if is_font(r, 'GillSans-SemiBold', 14.8)]
    for n, k in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(rs)
        # a block ends early at a group or chapter heading (18 pt, 26 pt) or, in the item chapter, at the next item
        j = k + 1
        while j < end and not (rs[j]['font'].startswith('GillSans-SemiBold') and rs[j]['size'] >= 11.9 and not 'SC' in rs[j]['font']) and not rs[j]['font'].startswith('Cambria'):
            j += 1
        body = rs[k + 1:j]
        name = rs[k]['text']
        mon, p = parse_block(name, body)
        seg = segments(rs[k:j])
        mon['id'] = 'srd-mon-' + slug(name)
        mon['page'], mon['rect'] = seg[0]
        if len(seg) > 1: mon['cont'] = seg[1:]
        # the group heading (18 pt) just before, when it names a family ("Dragons, Chromatic"?) rather than the block
        g = rs[k - 1] if k else None
        if g and g['font'].startswith('GillSans-SemiBold') and abs(g['size'] - 18) < 0.3 and g['text'] != name: mon['group'] = g['text']
        mon['chapter'] = 'Magic Items' if rs[k]['page'] < 254 else 'Animals' if (rs[k]['page'], rs[k]['y0']) >= (344, 404) else 'Monsters A–Z'
        if p: probs[name] = p
        out.append(mon)
    return out, probs

# ------------------------------------------------------------------ magic items (pp. 209-253)
RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact']
def spell_names():
    src = open(os.path.join(ROOT, 'rigs', 'srd.js')).read()
    m = re.search(r'const D = (\{.*?\});\n', src, re.S)
    D = json.loads(m.group(1))
    return {sp['name'].lower(): sp['id'] for sp in D['spells']}

def item_mechanics(typeline, name, body, italics, spells):
    it = {}
    t = typeline
    cat = re.match(r'(Armor|Weapon|Wondrous Item|Potion|Ring|Rod|Scroll|Staff|Wand)(?: \(([^)]*)\))?,?\s*(.*)', t)
    if not cat: return None
    it['category'] = cat.group(1)
    if cat.group(2): it['sub'] = cat.group(2)
    rest = cat.group(3)
    at = re.search(r'\(Requires Attunement(?: by ([^)]*))?\)', rest)
    if at: it['attune'] = at.group(1) or True
    rest = re.sub(r'\s*\(Requires Attunement[^)]*\)', '', rest)
    if 'Rarity Varies' in rest: it['rarity'] = 'varies'
    else:
        vs = re.findall(r'(Common|Uncommon|Very Rare|Rare|Legendary|Artifact)(?: \(\+(\d)\))?', rest)
        if len(vs) == 1 and not vs[0][1]: it['rarity'] = vs[0][0].lower()
        elif vs: it['rarity'] = [{'rarity': r.lower(), 'bonus': int(b)} if b else {'rarity': r.lower()} for r, b in vs]
    if 'rarity' not in it: return None
    b = body
    mm = re.search(r'has (\d+) charges', b)
    if mm: it['charges'] = int(mm.group(1))
    mm = re.search(r'regains (all|\d+d\d+(?: \+ \d+)?|\d+) expended charges', b)
    if mm: it['regain'] = mm.group(1).replace(' ', '')
    mm = re.search(r'\+(\d) bonus to (?:its )?(?:Armor Class|AC)', b)
    if mm: it['ac'] = int(mm.group(1))
    mm = re.search(r'\+(\d) bonus to attack (?:rolls )?and damage rolls', b)
    if mm: it['hit'] = int(mm.group(1))
    if re.search(r'bonus to attack (?:rolls )?and damage rolls made with this (?:magic )?(?:weapon|ammunition)[^.]*determined by', b) or ('+1, +2, or +3' in name and it['category'] == 'Weapon'): it['hit'] = 'by rarity'
    if '+1, +2, or +3' in name and it['category'] == 'Armor': it['ac'] = 'by rarity'
    mm = re.search(r'\+(\d) bonus to (?:all )?saving throws', b)
    if mm: it['saves'] = int(mm.group(1))
    sets = re.findall(r'your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) (?:score )?(?:is|becomes|changes to) (\d+)', b)
    if sets: it['sets'] = {ABIL_NAME[a.lower()]: int(v) for a, v in sets}
    dcs = sorted({int(x) for x in re.findall(r'\bDC (\d+)', b)})
    if dcs: it['dc'] = dcs
    dm = []
    for d in re.finditer(r'(\d+d\d+(?: ?[+–-] ?\d+)?) (Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder) damage', b):
        x = {'dice': d.group(1).replace(' ', '').replace('–', '-'), 'type': d.group(2).lower()}
        if x not in dm: dm.append(x)
    if dm: it['dmg'] = dm[:4]
    heal = re.search(r'regains? (\d+d\d+(?: \+ \d+)?) Hit Points', b)
    if heal: it['heal'] = heal.group(1).replace(' ', '')
    sp = []
    for x in italics:
        k = x.strip(' .,;:').lower()
        if k in spells and spells[k] not in sp: sp.append(spells[k])
    if sp: it['spells'] = sp
    if it['category'] in ('Potion', 'Scroll') or re.search(r'\b(?:is used up|is consumed|consumable)\b', b): it['consumable'] = True
    return it

def items(doc, spells):
    rs = rows(doc, 209, 253)
    start = next(k for k, r in enumerate(rs) if r['text'] == 'Magic Items A–Z') + 1
    rs = rs[start:]
    heads = [k for k, r in enumerate(rs) if r['font'].startswith('GillSans-SemiBold') and abs(r['size'] - 12) < 0.3]
    # a heading that wraps: the next row is a heading too and the type line follows it
    names = []; k = 0
    while k < len(heads):
        a = heads[k]; nm = rs[a]['text']; b = a
        while k + 1 < len(heads) and heads[k + 1] == b + 1: k += 1; b += 1; nm = nm + ' ' + rs[b]['text']
        names.append((a, b, re.sub(r'\s+', ' ', nm).strip())); k += 1
    out, probs = [], {}
    for n, (a, b, nm) in enumerate(names):
        end = names[n + 1][0] if n + 1 < len(names) else len(rs)
        j = b + 1; tl = []
        while j < end and rs[j]['font'].startswith('Cambria-Italic') and len(tl) < 3: tl.append(rs[j]); j += 1
        typeline = join_text(tl)
        # stat blocks printed inside an item (the figurine's giant fly) are monsters of their own: leave their rows out
        body_rows = []; inblock = False
        for r in rs[j:end]:
            if r['font'].startswith('GillSans-SemiBold') and abs(r['size'] - 14.8) < 0.3: inblock = True
            if not inblock: body_rows.append(r)
        body = join_text(body_rows)
        italics = [sp['text'] for r in body_rows for sp in r['spans'] if 'Italic' in sp['font']]
        # italic spell names can wrap across two rows: join neighbouring italic spans too
        italics += [italics[i] + ' ' + italics[i + 1] for i in range(len(italics) - 1)]
        mech = item_mechanics(typeline, nm, body, italics, spells)
        if mech is None: probs[nm] = ['type line: ' + typeline]; mech = {}
        seg = segments(rs[a:end])
        it = {'id': 'srd-item-' + slug(nm), 'name': nm, 'typeline': typeline}
        it.update(mech)
        it['page'], it['rect'] = seg[0]
        if len(seg) > 1: it['cont'] = seg[1:]
        it['_text'] = body
        out.append(it)
    return out, probs

# ------------------------------------------------------------------ the rules around them (pp. 204-208, 254-257)
def rule_sections(doc, first, last, stop, prefix, chapter):
    rs = rows(doc, first, last)
    if stop:
        cut = next(k for k, r in enumerate(rs) if r['text'] == stop); rs = rs[:cut]
    def heading(r):
        if r['font'].startswith('GillSans-SemiBold') and not 'SC' in r['font'] and any(abs(r['size'] - z) < 0.3 for z in (18, 14, 12, 10.5)): return True
        return r['font'].startswith('GillSans-Bold-SC') and r['size'] >= 10.9   # a sidebar's title
    hs = [k for k, r in enumerate(rs) if heading(r)]
    out = []
    for n, k in enumerate(hs):
        end = hs[n + 1] if n + 1 < len(hs) else len(rs)
        r = rs[k]; title = r['text']
        body = rs[k + 1:end]
        if abs(r['size'] - 10.5) < 0.3:   # a table: its title, header and rows (the table's own fonts); body text after it is not the table
            tb = []
            for x in body:
                if x['font'].startswith('Cambria') or x['font'].startswith('ScalaSans'): break
                tb.append(x)
            body = tb; kind = 'table'
        else: kind = 'section'
        # a sidebar keeps to its own box
        if 'SC' in r['font']: body = [x for x in body if x['col'] == r['col'] and abs(x['x0'] - r['x0']) < 12]
        seg = segments([r] + body)
        e = {'id': prefix + slug(title), 'title': title, 'chapter': chapter, 'page': seg[0][0], 'rect': seg[0][1], 'kind': kind, '_text': join_text(body)}
        if len(seg) > 1: e['cont'] = seg[1:]
        out.append(e)
    return out

# ------------------------------------------------------------------ the one-line summaries
def mon_summary(m):
    acts = [e['name'] for k in ('actions', 'bonus') for e in m.get(k, []) if e['name'] != 'Multiattack' and ('atk' in e or 'save' in e or 'cast' in e)]
    head = f"{m.get('size', '')} {m.get('type', '')}".strip()
    t = f"{head} · CR {m.get('cr', '?')} · AC {m.get('ac', '?')} · HP {m.get('hp', '?')}"
    for a in acts[:4]:
        if len(t) + len(a) + 3 > 118: break
        t += (' · ' if a == acts[0] else ', ') + a
    return t

def item_summary(it):
    bits = []
    if it.get('charges'): bits.append(f"{it['charges']} charges")
    if it.get('spells'): bits.append('casts ' + ', '.join(x.replace('srd-spell-', '').replace('-', ' ') for x in it['spells'][:3]))
    return '; '.join(bits) or it['typeline']

def item_tag(it):
    r = it.get('rarity')
    if r == 'varies': rt = 'rarity varies'
    elif isinstance(r, list): rt = ', '.join(f"{x['rarity']} (+{x['bonus']})" if 'bonus' in x else x['rarity'] for x in r)
    else: rt = r or ''
    at = it.get('attune')
    return ' · '.join(x for x in [it.get('category', ''), rt[:1].upper() + rt[1:], ('requires attunement' + (' by ' + at if isinstance(at, str) else '')) if at else ''] if x)

def build(doc):
    spells = spell_names()
    M, PM = monsters(doc)
    I, PI = items(doc, spells)
    R1 = rule_sections(doc, 204, 209, 'Magic Items A–Z', 'srd-magic-items-', 'Magic Items')
    R2 = rule_sections(doc, 254, 258, 'Monsters A–Z', 'srd-monsters-', 'Monsters')
    for e in R1 + R2:
        if e['kind'] == 'table': e['id'] += '-table'
    sums = {}
    sp = os.path.join(os.path.dirname(__file__), 'summaries.json')
    if os.path.exists(sp): sums = json.load(open(sp))
    # spell names inside monster spellcasting, linked to the rig's spell ids where the SRD has them
    for m in M:
        for e in m.get('actions', []) + m.get('bonus', []):
            for L in (e.get('cast') or {}).get('lists', []):
                L['ids'] = [spells.get(n.lower()) for n in L['spells']]
    print_new = []
    for e in R1 + R2:
        x = {'id': e['id'], 'title': e['title'], 'chapter': e['chapter'], 'page': e['page'], 'rect': e['rect'], 'text': sums.get(e['id']) or ('Table: ' + e['title'] if e['kind'] == 'table' else e['title'])}
        if e.get('cont'): x['cont'] = e['cont']
        print_new.append(x)
    for it in I:
        x = {'id': it['id'], 'title': it['name'], 'chapter': 'Magic Items', 'page': it['page'], 'rect': it['rect'], 'text': sums.get(it['id']) or item_summary(it), 'kind': 'item', 'tag': item_tag(it)}
        if it.get('cont'): x['cont'] = it['cont']
        print_new.append(x)
    for m in M:
        x = {'id': m['id'], 'title': m['name'], 'chapter': m['chapter'], 'page': m['page'], 'rect': m['rect'], 'text': mon_summary(m), 'kind': 'monster'}
        if m['chapter'] == 'Magic Items': x['home'] = 'Monsters A–Z'   # the figurine's giant fly lives with the other creatures
        if m.get('cont'): x['cont'] = m['cont']
        print_new.append(x)
    print_new.sort(key=lambda x: (x['page'], x['rect'][0] > 297, x['rect'][1]))
    data = {
        'monsters': [{k: v for k, v in m.items() if k not in ('page', 'rect', 'cont', 'chapter', 'id')} | {'id': m['id'][len('srd-mon-'):], 'src': m['id']} for m in M],
        'items': [{k: v for k, v in it.items() if k not in ('page', 'rect', 'cont', '_text', 'id')} | {'id': it['id'][len('srd-item-'):], 'src': it['id']} for it in I],
    }
    return data, print_new, {'monsters': PM, 'items': PI}, sums

def write(data, print_new):
    pp = os.path.join(ROOT, 'books', 'srd-print.json')
    old = json.load(open(pp))
    keep = [e for e in old if e['page'] < 204]
    ids = {e['id'] for e in keep}
    clash = [e['id'] for e in print_new if e['id'] in ids]
    assert not clash, clash
    seen = set()
    for e in print_new: assert e['id'] not in seen, e['id']; seen.add(e['id'])
    P = keep + print_new
    open(pp, 'w').write(json.dumps(P, indent=0, ensure_ascii=False))
    cp = os.path.join(ROOT, 'campaign-srd.js')
    src = open(cp).read().split('\n')
    k = next(i for i, l in enumerate(src) if l.startswith('    print: ['))
    src[k] = '    print: ' + json.dumps(P, ensure_ascii=False) + ','
    open(cp, 'w').write('\n'.join(src))
    bp = os.path.join(ROOT, 'rigs', 'srd-bestiary.js')
    open(bp, 'w').write('// GENERATED by build/srd/bestiary.py from the SRD 5.2.1 PDF (Wizards of the Coast LLC, CC BY 4.0; see NOTICE-SRD.md).\n'
        '// Monsters (every stat block) and magic items: names, numbers and parsed mechanics only; the words are on the page.\n'
        '// Edit the generator, not this file. The rig (rigs/srd.js) folds these into its data as D.monsters and D.items.\n'
        'window.SRD_BESTIARY = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    return len(P)

if __name__ == '__main__':
    doc = fitz.open(PDF)
    data, P, probs, sums = build(doc)
    nm, ni = len(data['monsters']), len(data['items'])
    print(f"{nm} stat blocks, {ni} magic items, {len(P)} print entries for pp. 204-364 ({len(sums)} hand summaries)")
    for kind, pr in probs.items():
        for k, v in pr.items(): print('  unparsed', kind, k, v)
    missing = [e['id'] for e in P if e.get('kind') != 'monster' and e['id'] not in sums]
    if missing: print('  no summary yet:', len(missing), missing[:6])
    if '--check' not in sys.argv:
        n = write(data, P); print('wrote rigs/srd-bestiary.js, books/srd-print.json and campaign-srd.js (%d print entries in all)' % n)
