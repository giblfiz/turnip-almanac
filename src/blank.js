// ---- THE BLANK DESK (Harry, 21 Nov): what you see before a game is picked. A canvas like a table's (same desk, same
// papers, same moves), holding only the orientation (src/orient.js): pick a game and edition here, bring the rulebook,
// your seat, the Turnip Works link, and how the desk works. Picking opens that game's table, carrying the link along.
(function () {
const O = window.ORIENT, $ = s => document.querySelector(s), vp = $('#vp'), world = $('#world');
const TWK = 'turnip-almanac-tw:__desk', ROLEK = 'turnip-almanac-role';
const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let tw = ls.get(TWK) || {}, role = (() => { try { return localStorage.getItem(ROLEK) || 'gm'; } catch { return 'gm'; } })();
const b64 = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
// a pairing link (#tw=…, from TW's "Open the desk"): keep it for the game picked next, and take the token out of the bar
{ const m = location.hash.match(/[#&]tw=([^&]+)/); if (m) { try { const o = unb64(m[1]); tw = { r: o.r, c: o.c, a: o.a, s: o.s, p: o.p, on: true }; ls.set(TWK, tw); } catch {} history.replaceState(null, '', location.pathname + location.search); } }
if (tw.on && tw.c) window.name = 'turnip-almanac:' + tw.c;
const TW_HOME = (window.TW_HOME || 'https://turnipworks.net/').replace(/\/?$/, '/');

// ---- the camera (the table's moves: scroll pans, pinch or ctrl-scroll zooms, 0 shows everything, double-click flies)
const cam = { x: 0, y: 0, s: 1 }; let anim = null;
const apply = () => { world.style.transform = `translate(${-cam.x * cam.s}px, ${-cam.y * cam.s}px) scale(${cam.s})`; labelsFade(); };
const clampS = s => Math.max(0.08, Math.min(2.5, s));
function zoomAt(px, py, f) { const s = clampS(cam.s * f), wx = cam.x + px / cam.s, wy = cam.y + py / cam.s; cam.s = s; cam.x = wx - px / s; cam.y = wy - py / s; apply(); }
function viewOf(b, pad = 1.06) { const s = clampS(Math.min(innerWidth / (b.w * pad), (innerHeight - 70) / (b.h * pad))); return { s, x: b.x + b.w / 2 - innerWidth / 2 / s, y: b.y + b.h / 2 - (innerHeight + 50) / 2 / s }; }
function flyTo(v, ms = 700) { cancelAnimationFrame(anim); const a = { ...cam }, t0 = performance.now();
  const step = t => { const u = Math.min(1, (t - t0) / ms), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, s = Math.exp(Math.log(a.s) + (Math.log(v.s) - Math.log(a.s)) * e);
    const cx = a.x + innerWidth / 2 / a.s, cy = a.y + innerHeight / 2 / a.s, tx = v.x + innerWidth / 2 / v.s, ty = v.y + innerHeight / 2 / v.s;
    cam.s = s; cam.x = cx + (tx - cx) * e - innerWidth / 2 / s; cam.y = cy + (ty - cy) * e - innerHeight / 2 / s; apply(); if (u < 1) anim = requestAnimationFrame(step); };
  anim = requestAnimationFrame(step); }
vp.addEventListener('wheel', ev => { ev.preventDefault(); cancelAnimationFrame(anim);
  if (ev.ctrlKey || ev.metaKey) zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * 0.01)); else { cam.x += ev.deltaX / cam.s; cam.y += ev.deltaY / cam.s; apply(); } }, { passive: false });
const ptrs = new Map(); let drag = null, pinch = null;
vp.addEventListener('pointerdown', ev => { if (ev.target.closest('button, a, input, label, select, textarea, .odrop')) return; cancelAnimationFrame(anim); ptrs.set(ev.pointerId, ev);
  if (ptrs.size === 1) drag = { x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y }; else if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = { d: Math.hypot(p.clientX - q.clientX, p.clientY - q.clientY), s: cam.s }; drag = null; }
  vp.setPointerCapture?.(ev.pointerId); vp.classList.add('panning'); });
vp.addEventListener('pointermove', ev => { if (!ptrs.has(ev.pointerId)) return; ptrs.set(ev.pointerId, ev);
  if (pinch && ptrs.size === 2) { const [p, q] = [...ptrs.values()], d = Math.hypot(p.clientX - q.clientX, p.clientY - q.clientY); zoomAt((p.clientX + q.clientX) / 2, (p.clientY + q.clientY) / 2, pinch.s * d / pinch.d / cam.s); }
  else if (drag) { cam.x = drag.cx - (ev.clientX - drag.x) / cam.s; cam.y = drag.cy - (ev.clientY - drag.y) / cam.s; apply(); } });
const up = ev => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { drag = null; vp.classList.remove('panning'); } };
vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
vp.addEventListener('dblclick', ev => { const p = ev.target.closest('.opaper'); if (p) flyTo(viewOf(p._box, 1.04)); });
addEventListener('keydown', ev => { if (ev.target.closest?.('input, textarea')) return; if (ev.key === '0') flyTo(viewOf(BOUNDS)); if (ev.key === 'Escape') flyTo(START()); });
addEventListener('resize', () => apply());

// ---- the papers
const papers = [];
function paper(id, x, y, w, html) { const e = document.createElement('div'); e.className = 'card opaper o-' + id; e.dataset.id = id; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = w + 'px';
  e.innerHTML = html; world.appendChild(e); e._box = { x, y, w, h: 0 }; papers.push(e); return e; }
function label(text, x, y, w, size) { const e = document.createElement('div'); e.className = 'lbl olabel'; e.textContent = text; Object.assign(e.style, { left: x + 'px', top: y + 'px', width: w + 'px', fontSize: size + 'px' }); world.appendChild(e); return e; }
function labelsFade() { document.querySelectorAll('.olabel').forEach(l => { const on = parseFloat(l.style.fontSize) * cam.s; l.style.opacity = on > 110 ? Math.max(0, 1 - (on - 110) / 90) : 1; }); }
let linked = null;
const ctx = () => ({ where: 'desk', pics: true, role, linked });
const COLS = { a: [0, 720], b: [780, 1040], c: [1920, 1000] };
function draw() {
  world.querySelectorAll('.opaper, .olabel').forEach(e => e.remove()); papers.length = 0;
  label('START HERE', 0, -260, 1820, 190); label('HOW THE DESK WORKS', COLS.c[0], -260, 2060, 190);
  const w = paper('welcome', COLS.a[0], 0, COLS.a[1], O.S.welcome(ctx()));
  const pk = paper('pick', COLS.b[0], 0, COLS.b[1], O.S.pick(ctx()));
  const st = paper('seat', COLS.a[0], 0, COLS.a[1], O.S.seat(ctx()));
  const t = paper('tw', COLS.a[0], 0, COLS.a[1], O.S.tw(ctx()));
  const bk = paper('book', COLS.b[0], 0, COLS.b[1], O.S.book(ctx()));
  // how it works: a paper per part, in two columns east of the start, the pictured ones wide
  const hw = O.HOW.map((h, i) => paper('how-' + h.id, 0, 0, 1000, `<h2>${h.t}</h2>${h.body(ctx())}`));
  const lay = () => { const G = 60, stack = (list, x) => { let y = 0; for (const e of list) { e.style.left = x + 'px'; e._box.x = x; e.style.top = y + 'px'; e._box.y = y; e._box.h = e.offsetHeight; y += e.offsetHeight + G; } return y; };
    const h = Math.max(stack([w, st, t], COLS.a[0]), stack([pk, bk], COLS.b[0]), stack([hw[0], hw[1], hw[4]], COLS.c[0]), stack([hw[2], hw[3]], COLS.c[0] + 1060));
    Object.assign(BOUNDS, { x: -80, y: -420, w: COLS.c[0] + 2060 + 160, h: h + 460 }); papers.forEach(paperize); };
  requestAnimationFrame(lay); world.querySelectorAll('img').forEach(im => im.complete || im.addEventListener('load', () => { clearTimeout(lay._t); lay._t = setTimeout(lay, 100); }));
}
const BOUNDS = { x: 0, y: 0, w: 3000, h: 2000 };
const START = () => {   // welcome and the game picker, as large as the width allows, from the top (a phone: the picker alone)
  const [x0, w] = innerWidth < 900 ? [COLS.b[0] - 30, COLS.b[1] + 60] : [-30, COLS.b[0] + COLS.b[1] + 60], s = clampS(Math.min(1.1, innerWidth / w));
  return { s, x: x0 - (innerWidth / s - w) / 2, y: innerWidth < 900 ? -40 : -290 }; };
// the chewed, burnt paper edge (the same recipe as a table's: src/app.js paperize, with the look's default dials)
function outline(w, h, R, A, seed, inset = 0) {
  let s0 = seed; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
  const oct = [[9, 0.55], [37, 0.3], [140, 0.15]].map(([K, a]) => [K, a, Array.from({ length: K }, () => rnd() * 2 - 1)]);
  const noise = t => oct.reduce((sum, [K, a, wob]) => { const x = t * K, i = Math.floor(x) % K, f = x - Math.floor(x), p = wob[i], q = wob[(i + 1) % K]; return sum + a * (p + (q - p) * f * f * (3 - 2 * f)); }, 0);
  const r = Math.min(R, w / 2 - A, h / 2 - A), m = A * 0.45, L1 = w - 2 * m - 2 * r, L2 = h - 2 * m - 2 * r, q = Math.PI * r / 2, per = 2 * L1 + 2 * L2 + 4 * q, N = 1600, pts = [];
  const arc = (cx, cy, a0) => u => { const a = a0 + u / r; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; };
  const seg = [[L1, u => [m + r + u, m, 0, -1]], [q, arc(w - m - r, m + r, -Math.PI / 2)], [L2, u => [w - m, m + r + u, 1, 0]], [q, arc(w - m - r, h - m - r, 0)],
    [L1, u => [w - m - r - u, h - m, 0, 1]], [q, arc(m + r, h - m - r, Math.PI / 2)], [L2, u => [m, h - m - r - u, -1, 0]], [q, arc(m + r, m + r, Math.PI)]];
  for (let k = 0; k < N; k++) { let d = k / N * per, P; for (const [len, f] of seg) { if (d <= len) { P = f(d); break; } d -= len; } P = P || seg[0][1](0);
    const off = Math.min(m, noise(k / N) * A * 0.75 + (rnd() - 0.5) * A * 0.25) - inset; pts.push([P[0] + P[2] * off, P[1] + P[3] * off]); }
  return pts;
}
function paperize(el) {
  if (document.documentElement.dataset.style !== 'pulp') return; const w = el.offsetWidth, h = el.offsetHeight;
  const m = Math.min(w, h), A = Math.min(0.06 * m * 0.6, 420), B = A * 2.4, R = Math.max(8, 0.03 * m), out = Math.min(30, A * 0.8);
  el.style.setProperty('--pout', out + 'px');
  const ww = w + 2 * out, hh = h + 2 * out, k = 900 / Math.max(ww, hh), W = Math.round(ww * k), H = Math.round(hh * k);
  let seed = 7; for (const ch of el.dataset.id + w + h) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const path = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  const outer = outline(W, H, R * k, Math.max(1, A * k), seed + 1);
  const mk = document.createElement('canvas'); mk.width = W; mk.height = H; const g = mk.getContext('2d'); g.fillStyle = '#000'; path(g, outer); g.fill();
  const bk = document.createElement('canvas'); bk.width = W; bk.height = H; const b = bk.getContext('2d');
  b.fillStyle = 'rgba(70, 38, 12, 0.6)'; path(b, outer); b.fill();
  b.globalCompositeOperation = 'destination-out'; b.filter = `blur(${Math.max(1, B * k * 0.45)}px)`; b.fillStyle = '#000'; path(b, outline(W, H, R * k, Math.max(1, A * k), seed + 1, B * k)); b.fill();
  el.style.setProperty('--pmask', `url(${mk.toDataURL()})`); el.style.setProperty('--pburn', `url(${bk.toDataURL()})`); el.classList.add('paper');
}

// ---- the Turnip Works link: who you are there, and the table's name
async function twState() {
  if (!tw.on) return; try {
    const r = await fetch(`${tw.r}/c/${tw.c}/state?seat=${encodeURIComponent(tw.s)}`, { cache: 'no-store' }); const st = await r.json(); if (!r.ok) throw new Error(st.why || r.status);
    linked = { tableName: st.campaign?.name || '', seatName: st.you?.name || '', role: st.you?.role === 'gm' ? 'gm' : 'player' }; draw();
  } catch (e) { linked = null; toast('Could not reach the Turnip Works table: ' + e.message); }
}
// ---- picking a game: tell the table (it remembers the desk's game), then open that game's table with the link
async function pickGame(slug) {
  const hit = O.GAMES.flatMap(g => g.editions).find(e => e.slug === slug); if (!hit) return;
  let url = O.tablePage(hit);
  if (tw.on) { try { await fetch(`${tw.r}/c/${tw.c}/a/${tw.a}/do?cmd=desk.page&page=${encodeURIComponent(slug)}&nonce=n${Date.now()}&seat=${encodeURIComponent(tw.s)}`); } catch {}
    url += '#tw=' + b64({ r: tw.r, c: tw.c, a: tw.a, s: tw.s, p: tw.p }); }
  location.assign(url);
}
// ---- a rulebook dropped here: which game is it? kept (in this browser) for that table
const bookStore = (() => { let db = null; const open = () => db || (db = new Promise(res => { try { const r = indexedDB.open('turnip-almanac-books', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }));
  return { put: async (k, v) => { const d = await open(); if (!d) return null; return new Promise(res => { const q = d.transaction('files', 'readwrite').objectStore('files').put(v, k); q.onsuccess = () => res(true); q.onerror = () => res(null); }); } }; })();
async function takeBook(file) {
  const st = () => $('[data-ost]'); if (!file) return; st().textContent = ' Reading it…';
  const buf = await file.arrayBuffer(), h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
  const name = Object.keys(window.BOOK_PRINTS || {}).find(k => window.BOOK_PRINTS[k].sha256 === h), hit = name && O.byPrint(name);
  if (!hit) { st().innerHTML = ` <b class="bad">That isn’t a file any table here was made for</b> (${O.esc(file.name)}, ${buf.byteLength.toLocaleString()} bytes). Each table matches the exact file from its maker; the links are under <i>Bring your rulebook</i>.`; return; }
  await bookStore.put(h, new Blob([buf], { type: 'application/pdf' }));
  st().innerHTML = ` <b class="good">That’s ${O.esc(hit.g.game)}, ${O.esc(hit.e.ed)}.</b> It’s kept in this browser for that table. <button class="btn obtn" data-pick="${hit.e.slug}">Open the table →</button>`;
}
// ---- clicks
document.addEventListener('click', ev => {
  const p = ev.target.closest('[data-pick]'); if (p) { pickGame(p.dataset.pick); return; }
  const r = ev.target.closest('[data-role]'); if (r) { role = r.dataset.role; try { localStorage.setItem(ROLEK, role); } catch {} draw(); return; }
  if (ev.target.closest('[data-twnew]')) { window.open(`${TW_HOME}?desk=${encodeURIComponent(location.origin + location.pathname)}`, 'turnip-works:new'); return; }
});
document.addEventListener('change', ev => { if (ev.target.matches('[data-ofile]')) takeBook(ev.target.files[0]); });
vp.addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.items || [])].some(i => i.kind === 'file')) { ev.preventDefault(); $('.odrop')?.classList.add('over'); } });
vp.addEventListener('dragleave', () => $('.odrop')?.classList.remove('over'));
vp.addEventListener('drop', ev => { const f = [...(ev.dataTransfer?.files || [])].find(f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)); if (!f) return; ev.preventDefault(); $('.odrop')?.classList.remove('over'); takeBook(f); });
function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 6000); }

draw(); requestAnimationFrame(() => requestAnimationFrame(() => { Object.assign(cam, START()); apply(); }));
twState();
window.blankDesk = { cam, flyTo, viewOf, BOUNDS, pickGame, takeBook, tw: () => tw, linked: () => linked };   // for tests
})();
