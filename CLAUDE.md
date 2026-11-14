# Turnip Almanac — start here
Read `SPEC.md` (the accepted system and its experience contracts E1–E17), then `PHOENIX.md` (the change ledger:
what was asked, reversed and learned), `docs/GENERALIZING.md` (engine / book / rig / campaign seams), `LAB_NOTES.md`.
Open design: `docs/VISIBILITY.md`, the notes language.
Build: `python3 build/patch_v4.py && python3 build/patch_v6.py && python3 build/patch_v7.py && python3 build/patch_v8.py && python3 build/assemble3.py`
(the scripts carry a scratchpad path `S=` at the top; point it at `build/` before running). Serve: `python3 -m http.server 8471`.
Verify: `tests/walk4.py <outdir>` and `tests/scan_layout.py` must pass (Chromium + Firefox). Vision reads are for "reads as", not layout truth.
Separate app from Turnip Works (giblfiz/3d-vtt). Sample book is Harry's own Simplified Shadowrun 2e v2.1.
