#!/usr/bin/env bash
# Build a page from src/ and one rules system: the engine (src/app.js) with the rig's UI inserted at /*@RIG-UI@*/.
#   ./build.sh                       → index.html  (Simplified Shadowrun 2e sample: src/scripts.html + rigs/ssr2-ui.js)
#   ./build.sh brp                   → brp.html    (Basic Roleplaying sample: src/scripts-brp.html + rigs/brp-ui.js)
set -euo pipefail
cd "$(dirname "$0")"
sys="${1:-ssr2}"
if [ "$sys" = ssr2 ]; then out=index.html; scripts=src/scripts.html; ui=rigs/ssr2-ui.js; else out="$sys.html"; scripts="src/scripts-$sys.html"; ui="rigs/$sys-ui.js"; fi
python3 - "$scripts" "$ui" "$out" <<'PY'
import sys
scripts, ui, out = sys.argv[1:4]
r = lambda p: open(p).read()
app = r('src/app.js'); assert '/*@RIG-UI@*/' in app
app = app.replace('/*@RIG-UI@*/', r(ui), 1)
page = '<!doctype html>\n' + r('src/head.html') + '<style>' + r('src/style.css') + '</style>' + r('src/body.html') + r(scripts) + '<script>\n' + app + '</script>\n'
open(out, 'w').write(page); print(f'built {out} ({len(page)} bytes) with {ui}')
PY
