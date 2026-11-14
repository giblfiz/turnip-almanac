// ---- builder and sheet actions: every control writes the choices object, then the sheet is recomputed
function getPath(o, path) { return path.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, path, v) { const ks = path.split('.'), last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] ?? {}), o); if (v === null || v === '' || (v === 0 && ks.length)) delete t[last]; else t[last] = v; }
function doAct(a) {
  if (a.dataset.act === 'newpc') { const id = newRunner(a.dataset.slot); if (id) setTimeout(() => flyTo(`b-${id}-name`), 60); return; }
  const pc = pcById[a.dataset.pc]; if (!pc) return;
  const ch = choicesOf(pc), act = a.dataset.act, path = a.dataset.path;
  if (act !== 'roll' && act !== 'sum-open' && act !== 'sum-cancel') pushUndo();
  if (act === 'inc') { const v = (getPath(ch, path) ?? (path.startsWith('skills.') ? 1 : 0)) + +a.dataset.d; setPath(ch, path, Math.max(+a.dataset.min, Math.min(+a.dataset.max, v))); }
  else if (act === 'set') { const v = a.dataset.v; setPath(ch, path, getPath(ch, path) === v ? null : v); }
  else if (act === 'flag') { setPath(ch, path, getPath(ch, path) ? null : 1); }
  else if (act === 'toggle') { const arr = getPath(ch, path) || []; const v = a.dataset.v; const max = +a.dataset.max || 99;
    setPath(ch, path, arr.includes(v) ? arr.filter(x => x !== v) : (arr.length >= max ? [...arr.slice(1), v] : [...arr, v])); }
  else if (act === 'sum-open') { state.summonPick[pc.id] = true; renderSheet(pc); return; }
  else if (act === 'sum-cancel') { state.summonPick[pc.id] = false; renderSheet(pc); return; }
  else if (act === 'sum-pick') {
    const S = sheetOf(pc), w = woundOf(pc, S), res = R.summon(a.dataset.type, S, w.tn), t = R.SUMMONS.find(x => x.id === a.dataset.type);
    const rec = { label: `${choicesOf(pc).name || 'Runner'} · summon ${t.name}`, pool: res.roll.pool, tn: res.roll.tn, dice: res.roll.dice, succ: res.roll.succ, verdict: res.rating ? `${t.name} at rating ${res.rating}` : 'Nothing answers' };
    (state.rolls[pc.id] = state.rolls[pc.id] || []).unshift(rec); state.rolls[pc.id] = state.rolls[pc.id].slice(0, 8);
    logPush({ kind: 'roll', who: pc.id, rec });
    (state.lastSummon = state.lastSummon || {})[pc.id] = res.rating ? null : `Nothing answered the ${t.name}: ${res.roll.succ} successes at TN ${res.roll.tn}.`;
    state.summonPick[pc.id] = false; if (res.rating) state.summons[pc.id] = { type: t.id, rating: res.rating, max: res.rating };
    persist(); toast(rec, a); renderSheet(pc); return;
  }
  else if (act === 'sum-dmg' || act === 'sum-drain') { const sm = summonOf(pc); if (!sm) return; sm.rating -= 1;
    if (act === 'sum-drain') { const d = liveOf(pc).dmg, i = d.lastIndexOf('B'); if (i >= 0) d[i] = null; }
    if (sm.rating <= 0) state.summons[pc.id] = null; persist(); renderSheet(pc); return; }
  else if (act === 'sum-heal') { const sm = summonOf(pc); if (sm && sm.rating < sm.max) sm.rating += 1; persist(); renderSheet(pc); return; }
  else if (act === 'sum-release') { state.summons[pc.id] = null; persist(); renderSheet(pc); return; }
  else if (act === 'asof') { state.asof[pc.id] = +a.dataset.v; renderSheet(pc); return; }
  else if (act === 'dmg') { const live = liveOf(pc); const i = +a.dataset.i; const cur = live.dmg[i]; live.dmg[i] = cur === 'B' ? 'L' : cur === 'L' ? null : 'B'; persist(); renderSheet(pc); return; }
  else if (act === 'roll') { rollFor(pc, a.dataset.skill, !!a.dataset.soak, a); return; }
  persist(); renderSheet(pc);
}
function rollFor(pc, skill, soak, srcEl) {
  const S = sheetOf(pc), w = woundOf(pc, S);
  const r = R.roll(S.skill[skill], S.tn(skill) + w.tn);
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
document.addEventListener('input', ev => {
  const i = ev.target.closest('input[data-act="name"], input[data-act="player"]'); if (!i) return; const pc = pcById[i.dataset.pc]; const ch = choicesOf(pc);
  if (i.dataset.act === 'player') { pc.player = i.value; const x = state.extra.find(e => e.id === pc.id); if (x) x.player = i.value; persist(); box_who(pc); return; }
  ch.name = i.value; persist();
  const box = sheetEls[pc.id], nm = ch.name || 'New runner'; box.querySelector('.nm').textContent = nm; box.querySelector('.nm').classList.toggle('empty', !ch.name); nodes[pc.id].title = nm; renderQuick();
});
function box_who(pc) { const S = sheetOf(pc); sheetEls[pc.id].querySelector('.who').textContent = `${[S.meta?.name, pc.archetype].filter(Boolean).join(' · ') || 'Not built yet'} · played by ${pc.player || '—'}`; }
document.addEventListener('change', ev => { const s = ev.target.closest('select[data-act="wire"]'); if (!s) return; const pc = pcById[s.dataset.pc]; choicesOf(pc).wire = s.value || null; persist(); renderSheet(pc); });

// ---- the book's pages: every page is always drawn; pdf.js sharpens a page once you are close
let pdfDoc = null, pdfFailed = false;
(async () => {
  try {
    if (!window.pdfjsLib) throw new Error('pdf.js did not load');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfDoc = await pdfjsLib.getDocument(C.book.file).promise; dirty = true;
  } catch (e) { pdfFailed = true; console.warn('Book pages unavailable:', e.message);
    pageFrames.forEach(o => { o.el.querySelector('.ph').innerHTML = `${o.n}<small style="display:block;font-size:30px">The page could not be drawn here.</small>`; }); }
})();
function pagesPass() {
  if (!pdfDoc) return;
  const vw = W(), vh = H(), dpr = Math.min(2, window.devicePixelRatio || 1);
  pageFrames.forEach(o => {
    if (o._busy) return;
    const b = o.box, x0 = (b.x - cam.x) * cam.s, y0 = (b.y - cam.y) * cam.s, sw = b.w * cam.s;
    const onScreen = !(x0 > vw || y0 > vh || x0 + sw < 0 || y0 + b.h * cam.s < 0);
    const want = onScreen && sw * dpr > 1300 ? 2600 : 1300;
    if ((o._res || 0) >= want) return;
    o._busy = true;
    pdfDoc.getPage(o.n).then(page => { const v1 = page.getViewport({ scale: 1 }), v = page.getViewport({ scale: want / v1.width });
      const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
      return page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise.then(() => { o.el.querySelector('.cv').replaceChildren(c); o._res = want; });
    }).catch(e => console.warn('page', o.n, e.message)).finally(() => { o._busy = false; dirty = true; });
  });
}
renderQuick();
