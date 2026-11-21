#!/usr/bin/env bash
# Assemble almanac.implausible.enterprises into deploy/dist, then (with --install) copy it to /var/www/almanac.
#   deploy/site.sh            build and assemble only (check deploy/dist)
#   deploy/site.sh --install  also install it (sudo) and reload nothing: nginx serves the directory as it is
# Each table is one page at /<slug>/ with <base href="/">, so all tables share /assets, /rigs, /books/fingerprints.js.
# Script and style references get ?v=<content hash> (Cloudflare keeps static files about 4 hours).
# No rulebook PDF is ever copied here, except our own books listed in OWN_BOOKS (the reader downloads the rest from
# their makers and opens their own copy; see SPEC E2c, the stencil).
#   deploy/site.sh --install-desk   the desk BRANCH: install to /var/www/almanac-desk, paired with desk.turnipworks.net
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=/var/www/almanac; TW_HOME=""
if [ "${1:-}" = --install-desk ]; then DEST=/var/www/almanac-desk; TW_HOME=https://desk.turnipworks.net/; set -- --install; fi
TABLES=("ssr2:shadowrun" "brp:brp")
[ -f src/scripts-lb.html ] && TABLES+=("lb:lady-blackbird")
[ -f src/scripts-srd.html ] && TABLES+=("srd:fifth-edition")
[ -f src/scripts-ep2.html ] && TABLES+=("ep2:eclipse-phase")
OWN_BOOKS=(books/ssr2-v2.2*.pdf)           # Harry's own rules (and our illustrated edition of them): fine to host (H, 13 Nov)
D=deploy/dist; rm -rf "$D"; mkdir -p "$D/downloads" "$D/books"
for t in "${TABLES[@]}"; do sys=${t%%:*}; slug=${t##*:}; ./build.sh "$sys" >/dev/null; done
./build.sh desk >/dev/null   # the blank desk (no game yet): the desk branch's front page
cp -r assets "$D/"; mkdir -p "$D/rigs"; cp rigs/*.js "$D/rigs/"; rm -f "$D"/rigs/*-ui.js   # the UI halves are built into the pages
cp campaign*.js "$D/"; cp books/fingerprints.js "$D/books/"; cp books/*-art.js "$D/books/" 2>/dev/null || true
for f in "${OWN_BOOKS[@]}"; do cp "$f" "$D/downloads/"; done
TW_HOME="$TW_HOME" python3 - "$D" "${TABLES[@]}" <<'PY'
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
    if os.environ.get('TW_HOME'): html = html.replace('<base href="/">', '<base href="/">\n<meta name="robots" content="noindex">\n<script>window.TW_HOME = ' + repr(os.environ['TW_HOME']) + ';</script>', 1)
    assert '<base href="/">' in html, 'no place for <base>'
    names = {'ssr2': 'Simplified Shadowrun', 'brp': 'Basic Roleplaying', 'lb': 'Lady Blackbird', 'srd': 'Fifth-edition SRD', 'ep2': 'Eclipse Phase'}
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
if any(t.startswith('srd:') for t in tables):
    landing = landing.replace('<!--@MORE-TABLES@-->', '''<a class="table" href="/fifth-edition/">
      <h2>Fifth-edition SRD</h2>
      <p>Four adventurers at levels 1, 3, 5 and 11; levelling up session by session, and a wizard's whole spellbook on one sheet.</p>
      <div class="book">Rules: System Reference Document 5.2.1 (free from Wizards of the Coast).</div>
      <span class="go">Open the table →</span>
    </a>
    <!--@MORE-TABLES@-->''', 1).replace('<!--@MORE-NOTES@-->', '<p><b>Fifth-edition SRD</b>: This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd">https://www.dndbeyond.com/srd</a>. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at <a href="https://creativecommons.org/licenses/by/4.0/legalcode">https://creativecommons.org/licenses/by/4.0/legalcode</a>. Not affiliated with or endorsed by Wizards of the Coast.</p>\n    <!--@MORE-NOTES@-->', 1)
if any(t.startswith('ep2:') for t in tables):
    landing = landing.replace('<!--@MORE-TABLES@-->', '''<a class="table" href="/eclipse-phase/">
      <h2>Eclipse Phase</h2>
      <p>Firewall agents who change bodies: minds and morphs kept apart, resleeving, reputation, muses; faces come from your copy's art.</p>
      <div class="book">Rules: Eclipse Phase Second Edition (free from its co-author's share).</div>
      <span class="go">Open the table →</span>
    </a>
    <!--@MORE-TABLES@-->''', 1).replace('<!--@MORE-NOTES@-->', '<p><b>Eclipse Phase</b> Second Edition © Posthuman Studios, licensed <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>; free from the co-author at <a href="https://robboyle.info/">robboyle.info</a>. The table holds page locations, names, mechanics and our own one-line rule summaries; setting text, fiction and art come only from your own copy. Not affiliated with Posthuman Studios.</p>\n    <!--@MORE-NOTES@-->', 1)
if os.environ.get('TW_HOME'):   # the desk branch: its front page is the blank desk (the orientation, where a game is picked)
    desk = open('desk.html').read().replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">\n<meta name="robots" content="noindex">\n<script>window.TW_HOME = ' + repr(os.environ['TW_HOME']) + ';</script>', 1)
    desk = re.sub(r'(src=")((?:books|assets)[^"?]*)"', bust, desk)
    open(os.path.join(D, 'index.html'), 'w').write(desk); print('front page: the blank desk')
if os.environ.get('TW_HOME'): landing = landing.replace('<span class="wip">Working in public · early</span>', '<span class="wip">Desk branch · paired with <a href="' + os.environ['TW_HOME'] + '">' + os.environ['TW_HOME'].split('//')[1].rstrip('/') + '</a></span>', 1)
if not os.environ.get('TW_HOME'): open(os.path.join(D, 'index.html'), 'w').write(landing)
print('tables:', ', '.join(t.split(':')[1] for t in tables))
PY
find "$D" -name '*.pdf' | grep -v '/downloads/' && { echo "a rulebook PDF slipped into the site: refusing"; exit 1; } || true
echo "assembled $(du -sh "$D" | cut -f1) in $D"
if [ "${1:-}" = --install ]; then
  sudo rm -rf "$DEST.new" && sudo cp -r "$D" "$DEST.new"
  sudo find "$DEST.new" -type d -exec chmod 755 {} + && sudo find "$DEST.new" -type f -exec chmod 644 {} +
  sudo rm -rf "$DEST.old"; [ -d "$DEST" ] && sudo mv "$DEST" "$DEST.old"; sudo mv "$DEST.new" "$DEST"
  echo "installed to $DEST"
fi
