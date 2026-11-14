"""Layout contract scan (deterministic; no vision model). Run with the app served on :8471.
Fails if any sheet section overflows its box, any label is cut or abbreviated, or any roll button
leaves its column. Checks Chromium and Firefox.   python tests/scan_layout.py
"""
import sys
from playwright.sync_api import sync_playwright

SCAN = '''()=>{const out=[];
  document.querySelectorAll('.sheet').forEach(sh=>{const id=sh.dataset.id;
    sh.querySelectorAll('.main *').forEach(e=>{ if (getComputedStyle(e).textOverflow==='ellipsis' && e.tagName!=='INPUT') out.push(id+' ellipsis '+e.className); });
    sh.querySelectorAll('.sk .k, .ahead .an, .der .k, .budget .k').forEach(k=>{ const r=k.getBoundingClientRect(), c=k.parentElement.getBoundingClientRect(); if (r.right>c.right+0.5 || k.scrollWidth>k.clientWidth+1) out.push(id+' cut: '+k.textContent); });
    sh.querySelectorAll('.main > section').forEach(sec=>{const f=sec.querySelector('.fit')||sec, sr=sec.getBoundingClientRect(), fr=f.getBoundingClientRect(); if (fr.height>sr.height+1||fr.width>sr.width+1) out.push(id+' '+sec.className+' overflows'); });
    sh.querySelectorAll('.die').forEach(d=>{ const r=d.getBoundingClientRect(), c=d.closest('.acol, section').getBoundingClientRect(); if (r.right>c.right+1||r.bottom>c.bottom+1) out.push(id+' die out: '+d.dataset.skill); });
  }); return out}'''

bad = 0
with sync_playwright() as pw:
    for eng in ('chromium', 'firefox'):
        b = pw.firefox.launch() if eng == 'firefox' else pw.chromium.launch(args=['--no-sandbox'])
        p = b.new_page(viewport={'width': 1400, 'height': 900}); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8471/'); p.wait_for_timeout(3000)
        out = p.evaluate(SCAN) + ['pageerror: ' + e for e in errs]
        print(eng, 'OK' if not out else out); bad += len(out); b.close()
sys.exit(1 if bad else 0)
