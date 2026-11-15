#!/usr/bin/env bash
# Assemble almanac.implausible.enterprises into deploy/dist, then (with --install) copy it to /var/www/almanac.
#   deploy/site.sh            build and assemble only (check deploy/dist)
#   deploy/site.sh --install  also install it (sudo) and reload nothing: nginx serves the directory as it is
# Each table is one page at /<slug>/ with <base href="/">, so all tables share /assets, /rigs, /books/fingerprints.js.
# Script and style references get ?v=<content hash> (Cloudflare keeps static files about 4 hours).
# No rulebook PDF is ever copied here, except our own books listed in OWN_BOOKS (the reader downloads the rest from
# their makers and opens their own copy; see SPEC E2c, the stencil).
set -euo pipefail
cd "$(dirname "$0")/.."
TABLES=("ssr2:shadowrun" "brp:brp")
[ -f src/scripts-lb.html ] && TABLES+=("lb:lady-blackbird")
OWN_BOOKS=(books/ssr2-v2.2.pdf)            # Harry's own rules: fine to host (H, 13 Nov)
D=deploy/dist; rm -rf "$D"; mkdir -p "$D/downloads" "$D/books"
for t in "${TABLES[@]}"; do sys=${t%%:*}; slug=${t##*:}; ./build.sh "$sys" >/dev/null; done
cp -r assets "$D/"; mkdir -p "$D/rigs"; cp rigs/*.js "$D/rigs/"; rm -f "$D"/rigs/*-ui.js   # the UI halves are built into the pages
cp campaign*.js "$D/"; cp books/fingerprints.js "$D/books/"
for f in "${OWN_BOOKS[@]}"; do cp "$f" "$D/downloads/"; done
python3 - "$D" "${TABLES[@]}" <<'PY'
import hashlib, os, re, sys
D, tables = sys.argv[1], sys.argv[2:]
def ver(path):
    p = os.path.join(D, path.split('?')[0])
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:10] if os.path.exists(p) else None
for t in tables:
    sys_, slug = t.split(':')
    src = 'index.html' if sys_ == 'ssr2' else f'{sys_}.html'
    html = open(src).read()
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">', 1)
    assert '<base href="/">' in html, 'no place for <base>'
    names = {'ssr2': 'Simplified Shadowrun', 'brp': 'Basic Roleplaying', 'lb': 'Lady Blackbird'}
    html = html.replace('<title>Turnip Almanac</title>', f'<title>Turnip Almanac · {names.get(sys_, slug)}</title>', 1)
    def bust(m):
        v = ver(m.group(2)); return f'{m.group(1)}{m.group(2)}?v={v}"' if v else m.group(0)
    html = re.sub(r'(src=")((?:rigs|books|assets|campaign)[^"?]*)"', bust, html)
    os.makedirs(os.path.join(D, slug), exist_ok=True)
    open(os.path.join(D, slug, 'index.html'), 'w').write(html)
landing = open('deploy/landing.html').read()
if any(t.startswith('lb:') for t in tables):
    landing = landing.replace('<!--@MORE-TABLES@-->', '''<a class="table" href="/lady-blackbird/">
      <h2>Lady Blackbird</h2>
      <p>Five pregenerated characters on the run in the wild blue yonder; its map and art come from your copy.</p>
      <div class="book">Rules: Lady Blackbird by John Harper (free from itch.io).</div>
      <span class="go">Open the table →</span>
    </a>''').replace('<!--@MORE-NOTES@-->', '<p><b>Lady Blackbird</b> by John Harper, © One Seven Design, under <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/us/">CC BY-NC-SA 3.0 US</a>; get it free at <a href="https://johnharper.itch.io/lady-blackbird">johnharper.itch.io/lady-blackbird</a>. Not affiliated.</p>')
open(os.path.join(D, 'index.html'), 'w').write(landing)
print('tables:', ', '.join(t.split(':')[1] for t in tables))
PY
find "$D" -name '*.pdf' | grep -v '/downloads/' && { echo "a rulebook PDF slipped into the site: refusing"; exit 1; } || true
echo "assembled $(du -sh "$D" | cut -f1) in $D"
if [ "${1:-}" = --install ]; then
  sudo rm -rf /var/www/almanac.new && sudo cp -r "$D" /var/www/almanac.new
  sudo find /var/www/almanac.new -type d -exec chmod 755 {} + && sudo find /var/www/almanac.new -type f -exec chmod 644 {} +
  sudo rm -rf /var/www/almanac.old; [ -d /var/www/almanac ] && sudo mv /var/www/almanac /var/www/almanac.old; sudo mv /var/www/almanac.new /var/www/almanac
  echo "installed to /var/www/almanac"
fi
