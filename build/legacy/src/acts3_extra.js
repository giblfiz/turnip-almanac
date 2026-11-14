// ---- build mode: Tab / Shift+Tab fly step to step; a live thread joins the step to its rule and to the sheet
function setBuild(pcId, key) {
  if (!pcById[pcId] || !ORDER.includes(key)) return;
  const was = state.build?.pc;
  state.build = { pc: pcId, key };
  if (was && was !== pcId && sheetEls[was]) sheetEls[was].querySelector('.builder')?.classList.remove('active');
  sheetEls[pcId].querySelector('.builder')?.classList.add('active');
  dirty = true;
}
function endBuild(finish) {
  const b = state.build; if (!b) return;
  if (finish) { state.done[b.pc] = true; persist(); }
  state.build = null; const pc = pcById[b.pc];
  renderSheet(pc); dirty = true;
  if (finish) flyTo(pc.id);
}
function stepOfEl(e) { const st = e?.closest?.('.bstep[data-id]'); if (!st) return null; const id = st.dataset.id; const key = id.split('-').pop(); return { pc: id.slice(2, id.length - key.length - 1), key }; }
document.addEventListener('keydown', ev => {
  if (!state.build || ev.target.closest?.('#qbar')) return;
  if (ev.target.closest?.('.loose')) return;
  if (ev.key === 'Tab') {
    ev.preventDefault(); ev.stopPropagation();
    const i = ORDER.indexOf(state.build.key), j = Math.max(0, Math.min(ORDER.length - 1, i + (ev.shiftKey ? -1 : 1)));
    if (j !== i) { document.activeElement?.blur?.(); flyTo(`b-${state.build.pc}-${ORDER[j]}`); }
  } else if (ev.key === 'Escape') { ev.preventDefault(); endBuild(false); }
}, true);
document.addEventListener('focusin', ev => { const st = stepOfEl(ev.target); if (st) setBuild(st.pc, st.key); });

// ---- threads: drawn on the canvas in world units, so they scale with everything else
const wsvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); wsvg.setAttribute('class', 'wthreads'); world.appendChild(wsvg);
function worldRect(e) {
  let x = e; while (x && !x.getClientRects().length) x = x.parentElement; if (!x) return null;
  const r = x.getBoundingClientRect(); return { x: cam.x + r.left / cam.s, y: cam.y + r.top / cam.s, w: r.width / cam.s, h: r.height / cam.s };
}
function nearPt(r, to) { return [Math.max(r.x, Math.min(r.x + r.w, to[0])), Math.max(r.y, Math.min(r.y + r.h, to[1]))]; }
function drawThreads() {
  let d = '';
  const link = (eA, eB, goB, cls = '') => {
    const A = eA && worldRect(eA), B = eB && worldRect(eB); if (!A || !B) return;
    const ca = [A.x + A.w / 2, A.y + A.h / 2], cb = [B.x + B.w / 2, B.y + B.h / 2];
    const [x0, y0] = nearPt(A, cb), [x1, y1] = nearPt(B, ca);
    const len = Math.hypot(x1 - x0, y1 - y0), lift = Math.min(900, 60 + len * 0.12), mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift;
    const w = Math.max(3, Math.min(14, len / 300));
    d += `<path class="${cls}" style="stroke-width:${w}px" d="M${x0},${y0} Q${mx},${my} ${x1},${y1}"/><circle class="${cls}" cx="${x0}" cy="${y0}" r="${w * 2.2}"/><circle class="${cls} far" ${goB ? `data-go="${goB}"` : ''} cx="${x1}" cy="${y1}" r="${w * 2.6}"><title>Fly there</title></circle>`;
  };
  if (threadSrc) {
    const box = sheetEls[threadSrc.pcId], vEl = box?.querySelector(`.main [data-prov="${threadSrc.key}"]`);
    if (vEl) (box._prov[threadSrc.key] || []).forEach(id => { const n = nodes[id]; if (n?.el) link(vEl, n.el, id); });
  }
  if (state.build) {
    const { pc, key } = state.build, box = sheetEls[pc];
    const stepEl = box?.querySelector(`[data-id="b-${pc}-${key}"]`), rule = STEP_RULE[key];
    link(stepEl, nodes[rule]?.el, rule, 'build');
    link(stepEl, box?.querySelector('.main ' + STEP_SHEET[key]), pc, 'build');
  }
  if (d !== wsvg._d) { wsvg.innerHTML = d; wsvg._d = d; }
  threadsSvg.innerHTML = ''; tends.innerHTML = '';
}

// ---- portraits and art: drop an image, upload one, or take a Turnip Works token
function shrinkImage(file) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('not an image'));
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, 720 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      res({ src: c.toDataURL('image/jpeg', 0.84), w: c.width, h: c.height }); }; im.onerror = rej; im.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
function setPortrait(id, src) {
  state.portraits[id] = src; persist();
  if (pcById[id]) renderSheet(pcById[id]);
  else document.querySelectorAll(`[data-portrait="${id}"] img`).forEach(i => i.src = src);
}
function makeArt(a) {
  const e = add(world, 'artcard', a.x, a.y, a.w, null, `<div class="grip"><button aria-label="Remove image">✕</button></div><img src="${a.src}" alt="" draggable="false"><div class="rsz" title="Drag to resize"></div>`);
  e.querySelector('.grip button').addEventListener('click', () => { e.remove(); state.art = state.art.filter(x => x !== a); delete nodes[a.id]; persist(); });
  e.querySelector('.grip').addEventListener('pointerdown', ev => { if (ev.target.closest('button')) return; ev.stopPropagation(); dragNote = { nt: a, e, sx: ev.clientX, sy: ev.clientY, ox: a.x, oy: a.y }; });
  reg(a.id, { el: e, title: 'Image', kind: 'art', box: { x: a.x, y: a.y, w: a.w, h: a.w * (a.ih || 1) } });
}
state.art.forEach(makeArt);
document.addEventListener('dragstart', ev => { if (ev.target.closest?.('#world')) ev.preventDefault(); });   // Firefox: never drag the map image
document.addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.types || [])].includes('Files')) { ev.preventDefault(); ev.target.closest?.('[data-portrait]')?.classList.add('dropping'); } });
document.addEventListener('dragleave', ev => ev.target.closest?.('[data-portrait]')?.classList.remove('dropping'));
document.addEventListener('drop', async ev => {
  const file = ev.dataTransfer?.files?.[0]; if (!file) return; ev.preventDefault();
  document.querySelectorAll('.dropping').forEach(x => x.classList.remove('dropping'));
  let img; try { img = await shrinkImage(file); } catch { return; }
  const pk = ev.target.closest?.('[data-pocket]'); if (pk) { addScrap(pk.dataset.pocket, { kind: 'img', src: img.src }); return; }
  const slot = ev.target.closest?.('[data-portrait]');
  if (slot) { setPortrait(slot.dataset.portrait, img.src); return; }
  const wx = cam.x + ev.clientX / cam.s, wy = cam.y + ev.clientY / cam.s, w = Math.max(300, 420 / cam.s * 0.6);
  const a = { id: 'art-' + Date.now().toString(36), x: wx - w / 2, y: wy - w * img.h / img.w / 2, w, ih: img.h / img.w, src: img.src };
  state.art.push(a); makeArt(a); persist();
});
document.addEventListener('change', async ev => {
  const inp = ev.target.closest?.('input[data-upload]'); if (!inp) return;
  try { const img = await shrinkImage(inp.files[0]); setPortrait(inp.dataset.upload, img.src); } catch {}
});
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tok]'); if (t) { setPortrait(t.dataset.pc, t.dataset.tok); return; }
  if (ev.target.closest('[data-act="finish"]')) return;
  const st = stepOfEl(ev.target); if (st) setBuild(st.pc, st.key);
});

// web fonts arrive after first paint and run a little larger: fit everything again once they are in
document.fonts?.ready.then(() => { PCS.forEach(pc => fitSections(sheetEls[pc.id])); sessionEls.forEach(x => fitCard(x.card)); renderTable(); });
