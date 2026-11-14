# Turnip Almanac

The desk side of [Turnip Works](https://turnipworks.net): rules, characters, campaign, sessions and table play on one
zoomable canvas. A separate app from the Turnip Works table.

- **Run it:** `python3 -m http.server 8471`, then open http://127.0.0.1:8471/
- **Rebuild:** `./build.sh` (assembles `src/` into `index.html`); `./build.sh brp` builds `brp.html`
- **Verify:** `tests/walk4.py <outdir>` and `tests/scan_layout.py` (Playwright; Chromium and Firefox)
- **Read first:** `SPEC.md` (the accepted system and its experience contracts), `PHOENIX.md` (how it got here),
  `docs/GENERALIZING.md` (engine / book / rig / campaign), open designs in `docs/VISIBILITY.md` and `docs/TARGETING.md`.

Two rule systems run on the same engine:
- `index.html`: *Simplified Shadowrun 2e v2.1*, a homebrew by Harry Pottash (`books/ssr2-v2.1.pdf`).
- `brp.html`: *Basic Roleplaying*, from Chaosium's ORC Content Document. **Powered by BRP.** Run
  `books/get-brp.sh` once to fetch the PDF (not committed). Attribution: `NOTICE-BRP.md`.

Map data © OpenStreetMap contributors, ODbL. Runner tokens and icons are Turnip Works' own assets.
