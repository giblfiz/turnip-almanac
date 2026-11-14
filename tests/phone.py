"""Phone checks (E18): touch pan from anywhere, tap presses, pinch + handoff, fling, double-tap, long-press note.
Usage: tests/phone.py [url] [pc]   (iPhone 13 emulation; raw CDP touch events)"""
import sys, json
from playwright.sync_api import sync_playwright
url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8471/brp.html'
PC = sys.argv[2] if len(sys.argv) > 2 else ('pc-tusk' if 'brp' not in url else 'pc-sol')
STEP, PATH = ('meta', 'meta') if 'brp' not in url else ('prof', 'prof')
fails = []
def check(name, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + name, info); ok or fails.append(name)
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(**pw.devices['iPhone 13'])
    p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(url); p.wait_for_timeout(3000)
    cdp = ctx.new_cdp_session(p)
    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
    def drag(x0, y0, x1, y1, steps=8, ms=16):
        touch('touchStart', [(x0, y0)])
        for k in range(1, steps + 1): touch('touchMove', [(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps)]); p.wait_for_timeout(ms)
        touch('touchEnd', [])
    cam = lambda: p.evaluate('[almanac.cam.x, almanac.cam.y, almanac.cam.s]')
    p.evaluate(f'almanac.flyTo("builder-{PC}")'); p.wait_for_timeout(2800)
    # 1. a drag that starts on a builder button pans and does not press it
    btn = p.evaluate(f'''(()=>{{const e=[...document.querySelectorAll('[data-id="b-{PC}-{STEP}"] .opt')].find(o=>{{const r=o.getBoundingClientRect();return r.top>120&&r.bottom<700&&r.left>20&&r.right<370}});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,e.dataset.v]}})()''')
    before = p.evaluate(f'almanac.state.choices["{PC}"]?.{PATH} || null'); c0 = cam()
    if btn:
        drag(btn[0], btn[1], btn[0] - 120, btn[1] + 90, steps=10, ms=30); p.wait_for_timeout(600)
        c1 = cam(); after = p.evaluate(f'almanac.state.choices["{PC}"]?.{PATH} || null')
        check('drag from a button pans', abs(c1[0] - c0[0]) * c0[2] > 60, f'dx_screen={(c1[0]-c0[0])*c0[2]:.0f}')
        check('drag from a button does not press it', after == before, f'{before} -> {after}')
        # 2. a tap presses
        p.wait_for_timeout(900); p.evaluate(f'almanac.flyTo("builder-{PC}")'); p.wait_for_timeout(2800)   # coast to rest, come back, tap a button on screen
        btn = p.evaluate(f'''(()=>{{const e=[...document.querySelectorAll('[data-id="b-{PC}-{STEP}"] .opt')].find(o=>{{const r=o.getBoundingClientRect();return r.top>120&&r.bottom<700&&r.left>20&&r.right<370}});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}})()''')
        touch('touchStart', [tuple(btn)]); p.wait_for_timeout(60); touch('touchEnd', []); p.wait_for_timeout(500)
        check('tap presses a button', p.evaluate(f'almanac.state.choices["{PC}"]?.{PATH} || null') != after)
        p.evaluate(f'almanac.state.choices["{PC}"].{PATH} = {json.dumps(before)}')
    else: check('found a builder button on screen', False)
    # 3. pinch out zooms in; lifting one finger keeps panning with the other
    p.wait_for_timeout(700); s0 = cam()[2]
    touch('touchStart', [(150, 400), (240, 400)])
    for k in range(1, 9): touch('touchMove', [(150 - 10 * k, 400), (240 + 10 * k, 400)]); p.wait_for_timeout(16)
    s1 = cam()[2]; check('pinch zooms', s1 > s0 * 1.4, f'{s0:.3f} -> {s1:.3f}')
    touch('touchEnd', [(240 + 80, 400)]) if False else cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': 320, 'y': 400, 'id': 1}]})
    cx = cam()[0]
    for k in range(1, 7): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 70 + 15 * k, 'y': 400, 'id': 0}]}); p.wait_for_timeout(16)
    touch('touchEnd', []); p.wait_for_timeout(300)
    check('lifting one finger hands the pan to the other', abs(cam()[0] - cx) * cam()[2] > 40, f'{(cam()[0]-cx)*cam()[2]:.0f}px')
    # 4. a flick coasts
    p.wait_for_timeout(500); drag(300, 600, 100, 600, steps=4, ms=12); c_rel = cam(); p.wait_for_timeout(500); c_after = cam()
    check('a flick coasts after release', (c_after[0] - c_rel[0]) * c_after[2] > 30, f'{(c_after[0]-c_rel[0])*c_after[2]:.0f}px more')
    # 5. double-tap on empty canvas zooms in; long-press on the map makes a note
    p.evaluate('almanac.overview()'); p.wait_for_timeout(2600)
    pt = p.evaluate('''(()=>{const b=almanac.nodes.map.box,c=almanac.cam;return [(b.x+b.w*0.3-c.x)*c.s,(b.y+b.h*0.6-c.y)*c.s]})()''')
    s0 = cam()[2]
    for _ in range(2): touch('touchStart', [tuple(pt)]); p.wait_for_timeout(40); touch('touchEnd', []); p.wait_for_timeout(90)
    p.wait_for_timeout(500); check('double-tap zooms in', cam()[2] > s0 * 1.6, f'{s0:.4f} -> {cam()[2]:.4f}')
    n0 = p.evaluate('almanac.state.notes.length'); touch('touchStart', [tuple(pt)]); p.wait_for_timeout(800); touch('touchEnd', []); p.wait_for_timeout(300)
    check('long press on the map makes a note', p.evaluate('almanac.state.notes.length') == n0 + 1)
    # 6. the page itself never zooms
    check('page not zoomed', p.evaluate('visualViewport.scale') == 1)
    check('no page errors', not errs, '; '.join(errs[:3]))
    b.close()
print('ALL PASS' if not fails else 'FAILED: ' + ', '.join(fails)); sys.exit(1 if fails else 0)
