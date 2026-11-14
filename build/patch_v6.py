import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
s = open(S + '/app_world3.js').read()
def rep(a, b):
    global s
    assert a in s, 'MISSING: ' + a[:100]
    s = s.replace(a, b, 1)
rep("portraits: saved.portraits || {}, art: saved.art || [], done: saved.done || {},", "portraits: saved.portraits || {}, art: saved.art || [], done: saved.done || {}, summons: saved.summons || {}, summonPick: {},")
rep("portraits: state.portraits, art: state.art, done: state.done });", "portraits: state.portraits, art: state.art, done: state.done, summons: state.summons });")
# summons strip: under the gear lists, bottom-right of the sheet
rep("""    </section>
    </div>
    <div class="builder""", """    </section>
    <section class="sS">${summonsHtml(pc, ch, S, W8)}</section>
    </div>
    <div class="builder""")
rep("function liveOf(pc) {", """// summons: one at a time; a tiny sheet inside the summoner's sheet (rules p.2)
function summonOf(pc) { if (!(pc.id in state.summons) && pc.summon) state.summons[pc.id] = { ...pc.summon }; return state.summons[pc.id] || null; }
function summonsHtml(pc, ch, S, W8) {
  const P = R.P, head = `<div class="sec">Summons <span class="chip" data-go="p-summons">p.2</span> <span class="chip" data-go="p-spirits">types</span></div>`;
  if (!R.canSummon(ch)) return head + `<div class="none">Summoning needs a Shaman, or a tradition that bought Summoning.</div>`;
  const sm = summonOf(pc);
  if (sm) {
    const t = R.SUMMONS.find(x => x.id === sm.type), skills = [...new Set([...R.SUMMON_SHARED, ...t.extra])];
    const boxes = Array.from({ length: sm.max }, (_, i) => `<i class="${i < sm.rating ? 'on' : ''}"></i>`).join('');
    return head + `<div class="minisheet"><div class="mini-in">
      <div class="mh"><b>${esc(t.name)}</b><span class="kind">${t.kind}</span><span class="rbox" data-prov-none>Rating ${sm.rating} / ${sm.max} <span class="boxes">${boxes}</span></span></div>
      <div class="mrow"><span class="info">Body 2 · Coordination 2 · Mental 2 · Social 2</span><span class="info">Actions ${t.actions}</span></div>
      <div class="mrow"><span class="info">Skills ${sm.rating}: ${skills.map(k => R.SK_NAME[k]).join(', ')}</span></div>
      <div class="mrow"><span class="info">Special: ${esc(t.special)}</span></div>
      <div class="mbtns"><button class="btn" data-act="sum-dmg" data-pc="${pc.id}">Damage −1</button><button class="btn" data-act="sum-heal" data-pc="${pc.id}" ${sm.rating >= sm.max ? 'disabled' : ''}>Heal +1</button><button class="btn" data-act="sum-drain" data-pc="${pc.id}" title="The summon spends an action to take 1 of the summoner's Drain, losing 1 rating">Take 1 Drain</button><button class="btn quiet" data-act="sum-release" data-pc="${pc.id}">Release</button></div>
    </div></div>`;
  }
  if (state.summonPick[pc.id]) {
    const prefer = ch.trad === 'shaman' ? 'spirit' : 'elemental';
    return head + `<div class="pickgrid">${R.SUMMONS.map(t => `<button class="btn ${t.kind === prefer ? '' : 'quiet'}" data-act="sum-pick" data-pc="${pc.id}" data-type="${t.id}"><b>${esc(t.name.replace(/ (Elemental|Spirit)$/, ''))}</b><small>${t.kind}</small></button>`).join('')}<button class="btn quiet" data-act="sum-cancel" data-pc="${pc.id}">Cancel</button></div>
      <div class="hint2">Rolls Magic ${S.skill.magic} at TN ${Math.max(0, 6 - S.attr.mental) + W8.tn}. A spirit’s rating is the successes; an elemental’s is successes + 2. Summoning takes downtime.</div>`;
  }
  return head + `<button class="btn big" data-act="sum-open" data-pc="${pc.id}">Summon a ${ch.trad === 'shaman' ? 'spirit' : 'spirit or elemental'} ⚄</button>${state.lastSummon?.[pc.id] ? `<div class="sumfail">${esc(state.lastSummon[pc.id])}</div>` : ''}<div class="hint2">One summon at a time. It gets a little sheet of its own, here.</div>`;
}
function liveOf(pc) {""")
open(S + '/app_world3.js', 'w').write(s)

a = open(S + '/acts2.js').read()
DONE = 'sum-open' in a
add = """  else if (act === 'sum-open') { state.summonPick[pc.id] = true; renderSheet(pc); return; }
  else if (act === 'sum-cancel') { state.summonPick[pc.id] = false; renderSheet(pc); return; }
  else if (act === 'sum-pick') {
    const S = sheetOf(pc), w = woundOf(pc, S), res = R.summon(a.dataset.type, S, w.tn), t = R.SUMMONS.find(x => x.id === a.dataset.type);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · summon ${t.name}`, pool: res.roll.pool, tn: res.roll.tn, dice: res.roll.dice, succ: res.roll.succ, verdict: res.rating ? `${t.name} at rating ${res.rating}` : 'Nothing answers' };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8);
    state.summonPick[pc.id] = false; if (res.rating) state.summons[pc.id] = { type: t.id, rating: res.rating, max: res.rating };
    persist(); toast(rec, a); renderSheet(pc); return;
  }
  else if (act === 'sum-dmg' || act === 'sum-drain') { const sm = summonOf(pc); if (!sm) return; sm.rating -= 1;
    if (act === 'sum-drain') { const d = liveOf(pc).dmg, i = d.lastIndexOf('B'); if (i >= 0) d[i] = null; }
    if (sm.rating <= 0) state.summons[pc.id] = null; persist(); renderSheet(pc); return; }
  else if (act === 'sum-heal') { const sm = summonOf(pc); if (sm && sm.rating < sm.max) sm.rating += 1; persist(); renderSheet(pc); return; }
  else if (act === 'sum-release') { state.summons[pc.id] = null; persist(); renderSheet(pc); return; }
"""
anchor = "  else if (act === 'asof')"
assert anchor in a
if not DONE: a = a.replace(anchor, add + anchor, 1)
open(S + '/acts2.js', 'w').write(a)
print('ok')
