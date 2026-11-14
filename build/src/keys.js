
// ---- keys mapped to what people already know (Harry, 13 Nov)
//   ⌘[ / ⌘]  back / forward      ⌘Z / ⇧⌘Z  undo / redo a change to a sheet
//   ⌘C  copy the thing under the pointer (or the last roll)      ⌘V  paste an image (portrait or art) or text (a note)
//   Tab / ⇧Tab  next / previous builder step      Esc  close the quickbar, leave the builder
let lastPt = { x: 0, y: 0 }, lastRollAt = 0;
window.addEventListener('pointermove', ev => { lastPt = { x: ev.clientX, y: ev.clientY }; }, { passive: true });
const undo = [], redo = [];
function snap() { return JSON.stringify({ choices: state.choices, live: state.live, summons: state.summons, done: state.done, asof: state.asof }); }
function pushUndo() { undo.push(snap()); if (undo.length > 60) undo.shift(); redo.length = 0; }
function restore(json) { const o = JSON.parse(json); Object.assign(state, { choices: o.choices, live: o.live, summons: o.summons, done: o.done, asof: o.asof }); persist(); PCS.forEach(renderSheet); }
function doUndo() { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); }
function doRedo() { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); }
const editable = t => t?.closest?.('input, textarea, select, [contenteditable]');
document.addEventListener('keydown', ev => {
  const mod = ev.metaKey || ev.ctrlKey;
  if (mod && (ev.key === '[' || ev.key === ']')) { ev.preventDefault(); ev.stopPropagation(); ev.key === '[' ? goBack() : goFwd(); return; }
  if (editable(ev.target)) return;
  if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? doRedo() : doUndo(); return; }
  if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); doRedo(); return; }
  if (mod && ev.key.toLowerCase() === 'c' && !String(window.getSelection?.() || '')) {
    ev.preventDefault();
    let text = '';
    const rolls = Object.values(state.rolls).map(a => a?.[0]).filter(Boolean);
    if (Date.now() - lastRollAt < 8000 && rolls.length) { const r = $('#toast').textContent || ''; text = r; }
    if (!text) { const hit = document.elementFromPoint(lastPt.x, lastPt.y)?.closest('[data-id]'); const n = hit && nodes[hit.dataset.id];
      text = n ? [n.title, n.sub, n.text].filter(Boolean).join(' · ') : hit?.textContent?.trim().slice(0, 400) || ''; }
    if (text) navigator.clipboard?.writeText(text).catch(() => {});
  }
}, true);
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="roll"], [data-troll], [data-act="sum-pick"]')) lastRollAt = Date.now(); }, true);
document.addEventListener('paste', async ev => {
  if (editable(ev.target)) return;
  const items = [...(ev.clipboardData?.items || [])], img = items.find(i => i.type.startsWith('image/'));
  ev.preventDefault();
  const pocket = document.elementFromPoint(lastPt.x, lastPt.y)?.closest('[data-pocket]');
  if (pocket) { if (img) { try { const pic = await shrinkImage(img.getAsFile()); addScrap(pocket.dataset.pocket, { kind: 'img', src: pic.src }); } catch {} }
    else { const t = ev.clipboardData?.getData('text/plain'); if (t) addScrap(pocket.dataset.pocket, { kind: 'text', text: t.slice(0, 2000) }); } return; }
  if (img) {
    let pic; try { pic = await shrinkImage(img.getAsFile()); } catch { return; }
    const slot = document.elementFromPoint(lastPt.x, lastPt.y)?.closest('[data-portrait]');
    if (slot) { setPortrait(slot.dataset.portrait, pic.src); return; }
    const wx = cam.x + lastPt.x / cam.s, wy = cam.y + lastPt.y / cam.s, w = Math.max(300, 250 / cam.s);
    const a = { id: 'art-' + Date.now().toString(36), x: wx - w / 2, y: wy - w * pic.h / pic.w / 2, w, ih: pic.h / pic.w, src: pic.src };
    state.art.push(a); makeArt(a); persist(); return;
  }
  const text = ev.clipboardData?.getData('text/plain'); if (!text) return;
  const nt = { id: 'n-' + Date.now().toString(36), x: cam.x + lastPt.x / cam.s - 165, y: cam.y + lastPt.y / cam.s - 40, text: text.slice(0, 2000) };
  state.notes.push(nt); makeNote(nt); persist();
});
document.getElementById('qback')?.addEventListener('click', () => goBack());

// ---- resize: drag the corner of a sticky note or a picture to scale it (Harry, 13 Nov)
document.addEventListener('pointerdown', ev => {
  const h = ev.target.closest?.('.rsz'); if (!h) return;
  ev.preventDefault(); ev.stopPropagation();
  const card = h.parentElement, id = card.dataset.id, isNote = card.classList.contains('loose');
  const rec = isNote ? state.notes.find(n => n.id === id) : state.art.find(a => a.id === id); if (!rec) return;
  const r0 = card.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY;
  const k0 = isNote ? (rec.k || 1) : rec.w, w0 = rec.w || 330, h0 = rec.h || 180;
  const move = e => {
    const grow = Math.max((r0.width + (e.clientX - x0)) / r0.width, (r0.height + (e.clientY - y0)) / r0.height);
    const f = Math.max(0.15, grow);
    if (isNote) { rec.w = Math.max(8 / cam.s, w0 + (e.clientX - x0) / cam.s); rec.h = Math.max(8 / cam.s, h0 + (e.clientY - y0) / cam.s); sizeNote(rec, card); nodes[id].box = { ...nodes[id].box, w: rec.w, h: rec.h }; }
    else { rec.w = Math.max(40, k0 * f); card.style.width = rec.w + 'px'; nodes[id].box = { ...nodes[id].box, w: rec.w, h: rec.w * (rec.ih || 1) }; }
  };
  const up = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); persist(); };
  window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true);
}, true);

// ---- sticky notes are free rectangles; their text always fills them (Harry, 13 Nov)
function sizeNote(nt, e) {
  e.style.transform = ''; e.style.width = nt.w + 'px'; e.style.height = nt.h + 'px';
  const gh = Math.max(3, Math.min(nt.h * 0.14, nt.w * 0.14, 90)), grip = e.querySelector('.grip'), body = e.querySelector('.body'), rz = e.querySelector('.rsz');
  grip.style.height = gh + 'px'; grip.querySelector('button').style.fontSize = (gh * 0.55) + 'px'; grip.querySelector('.dots').style.transform = `scale(${gh / 26})`;
  body.style.top = gh + 'px'; body.style.height = (nt.h - gh) + 'px'; body.style.padding = (gh * 0.35) + 'px ' + (gh * 0.45) + 'px';
  if (rz) { rz.style.width = rz.style.height = Math.max(4, gh * 0.85) + 'px'; }
  fitNoteText(e);
}
function fitNoteText(e) {
  const body = e.querySelector('.body'); if (!body) return;
  const empty = !body.textContent.trim();
  if (empty) { body.style.fontSize = Math.max(2, Math.min(body.clientHeight * 0.2, body.clientWidth * 0.08)) + 'px'; return; }
  let lo = 1, hi = Math.max(4, body.clientHeight);
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; body.style.fontSize = mid + 'px';
    if (body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1) lo = mid; else hi = mid; }
  body.style.fontSize = lo + 'px';
}
document.addEventListener('input', ev => { const n = ev.target.closest?.('.loose'); if (n) fitNoteText(n); });
