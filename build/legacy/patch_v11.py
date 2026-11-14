"""v11 (2026-11-13, Harry): summons. Shamans call spirits, hermetics elementals; the summon is a golden card
of its own at its own scale; its skills and spells/attacks carry dice like a runner's. Idempotent; edits the
staged sources (see build.sh), so run after patch_v6..v8 and before assemble3."""
import os
S = os.environ.get('ALMANAC_STAGE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.stage')
w = open(S + '/app_world3.js').read()
i = w.index('function summonsHtml(pc, ch, S, W8) {'); j = w.index('\nconst isToken', i) if '\nconst isToken' in w[i:] else w.index('\nfunction liveOf(pc) {', i)
new = r'''function summonsHtml(pc, ch, S, W8) {
  const head = `<div class="sec">Summons <span class="chip" data-go="p-summons">p.2</span> <span class="chip" data-go="p-spirits">types</span></div>`;
  if (!R.canSummon(ch)) return head + `<div class="none">Summoning needs a Shaman, or a tradition that bought Summoning.</div>`;
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
function fitInto(box, inner, max = 3) {
  if (!box || !inner || !box.clientWidth) return; const W = box.clientWidth, H = box.clientHeight; let lo = 0.15, hi = max;
  for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; inner.style.zoom = m; inner.style.width = (W / m) + 'px';
    const r = inner.getBoundingClientRect(), b = box.getBoundingClientRect(); if (r.height <= b.height * 0.98 && inner.scrollWidth <= inner.clientWidth + 3) lo = m; else hi = m; }
  inner.style.zoom = lo; inner.style.width = (W / lo) + 'px';
}
function fitSummon(box) { box.querySelectorAll('.sumrow').forEach(r => { fitInto(r.querySelector('.scard2'), r.querySelector('.sc-in')); fitInto(r.querySelector('.sumside'), r.querySelector('.ss-in')); }); }'''
w = w[:i] + new + w[j:]
w = w.replace("box.querySelectorAll('.main > section:not(.sP)').forEach(sec => {", "box.querySelectorAll('.main > section:not(.sP):not(.sS)').forEach(sec => {", 1)
w = w.replace("  fitSections(box);\n  renderQuick(); dirty = true;", "  fitSections(box); fitSummon(box);\n  renderQuick(); dirty = true;", 1)
open(S + '/app_world3.js', 'w').write(w)
a = open(S + '/acts2.js').read()
if "act === 'sroll'" not in a:
    a = a.replace("  else if (act === 'sum-open')", """  else if (act === 'sroll') { const sm = summonOf(pc); if (!sm) return; const t = R.SUMMONS.find(x => x.id === sm.type), r = R.roll(sm.rating, 4);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · ${t.name} · ${a.dataset.tool}`, pool: r.pool, tn: r.tn, dice: r.dice, succ: r.succ, verdict: r.verdict };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8); persist(); logPush({ kind: 'roll', who: pc.id, rec }); toast(rec, a); renderSheet(pc); return; }
  else if (act === 'sum-open')""", 1)
    a = a.replace("if (act !== 'roll' && act !== 'sum-open'", "if (act !== 'roll' && act !== 'sroll' && act !== 'sum-open'", 1)
open(S + '/acts2.js', 'w').write(a)
print('v11 ok')
