# Almanac — lab notes

## 2026-11-13 — named, first prototype

Harry: "let's name the separate project that is the desk side of turnip works and build a prototype" (then away). Design source: wiki `projects/3d-vtt/product-directions/the-other-half/` (rounds 1–2, orientation axes, Figma field report).

**Name: Almanac** (Fauna's pick; "the Desk" was the working name). A farmer's almanac is the dated, seasonal book of rules of thumb and records kept beside the field. Time-indexed fits "right = arrow of time"; it sits next to Turnip Works without punning on it. Rename = search/replace.

Built (static, no build step; `index.html` + `data.js` + `assets/`), published privately at https://claude.ai/artifact/67SWoHciTjLVJG3agAFia8 :
- Own camera on a DOM world (no tldraw: licence). Van Wijk–Nuij fly-to (d3 interpolateZoom formula, rho √2). Scroll pans, pinch / ctrl-scroll zooms (Figma convention; a notched mouse wheel zooms).
- **Semantic zoom by on-screen size**, per node: far / mid / near. Each zoomable thing owns only its own tagged descendants (`ownLodEls`); CSS descendant selectors leaked a parent's level into nested things (sheet near hid the builder label; book mid hid entry text). Found by Gemini blind read.
- Geography (generated, stable): Shelf (3 sourcebooks; every rule has one home) → campaign overmap (places = TW type icons, "Open table in Turnip Works") → sheets as lane heads (4 PCs) + NPC and thread lanes → session columns S1–S5 → **Now** line → S6 prep column (ideas dashed, "unsettled") + Inbox.
- **Builder is a region on the sheet** (scaled 0.2625): zoom in, scroll down through steps; every choice rewrites the sheet live. The Spirits step's slot is always reserved; without Shaman it's a labelled crease that keeps picks, so anchors never move.
- **Sheet = replay of a change list** (OCF-shaped): chargen choices + levels taken in sessions. "As of" chips scrub Start/S1…S5/Now.
- **Provenance threads**: hover/tap a number → curves to its sources (rules on the shelf, builder steps, level-up cards in session cells); off-screen ends become clickable pills that fly there.
- Edge arrows with pictures appear only when the view is mostly empty (coverage < 10%). Back/forward history, ⌘K / jump palette over everything, pins in the bar, double-click empty space = loose note (localStorage).
- `{{id}}` in session notes = link chip to that thing's home + automatic "Mentioned in S#" backlinks on rules, places, people.
- Shared visual language: TW's status sprites (conditions) and building-type icons, cropped/copied into `assets/`.
- Sample rules are original ("Low Fields", tiny 2d6 game), not any published system.

Checks: Playwright walk desktop 1400×900 + iPhone 13, zero console errors, no horizontal scroll at 390. Gemini blind reads ×3 (`agy-run`, isolated folder): round 1 found the mojibake (no charset locally), the LOD nesting bug, stacked thread pills, Shelf label on the books; round 3 found phone LOD thresholds too high (sheet details + builder steps hidden at 390 px). All fixed; numeric checks confirm (entry text, builder steps, conditions visible; Hareling on Pell → Speed 25→35).

Not done / open:
- Harry's open question from 11/10: do health and conditions live on the Desk (prototype assumes yes) or does TW stay authority?
- No relay/TW seat link; "Open table in Turnip Works" is a plain link. No OCF evaluation yet (Titterpig print → OCF pack compiler is the candidate).
- No book import (pdf.js text-first plan from 11/11 not wired). No multi-user, no GM secrecy (Figma field report says that's optional).
- Fiction-time lens, retcon scars, ground line: deliberately not built (Harry: trellises, not grids).

## 2026-11-13 (later) — renamed Turnip Almanac; Harry's Simplified Shadowrun 2e as the sample book

Harry: "How about turnip alminac. So it should also go ahead and include the full rule set for char gen and char sheets and everything using simplified shadowrun pdf as its sample doc." Repo moved to `projects/web/turnip-almanac/`.

- **The book is the real PDF** (`books/ssr2-v2.1.pdf`, Harry's own v2.1 from the 11/06 revision session; `build_rules_pdf.py` in `~/Documents/Codex/2026-11-06-hey-if-you-look-thru-my/` is its source). pdf.js 3.11.174 from cdnjs, main-thread worker (worker script loaded as a plain script so `pdfjsWorker` exists); pages render only at near zoom, 1300 or 2400 px wide by on-screen size.
- **The print**: `books/ssr2-print.json`, 32 sections with page + rect, generated from the build's own `layout-audit.json` (tables by first row; p.3–4 sections by heading runs). Each section's one home is a region on the real page; the index cards beside the pages are views.
- **The rig** `rigs/ssr2.js`: every p.1–2 table as data, chargen prices (attr 7/25, skill bands 1/2/3, 10–12 = 4 karma), metatypes, human racial bonuses, Essence → Magic cap, two free contacts, best-outfit armor, Actions/rigging, Health 3+Body, cash, karma log replay, warnings, and the dice (pool vs TN 6 − attribute, modified rule of six, bonuses at 3/5/7). Open points are listed in `RIG.interpretations` and shown at the foot of the builder.
- **Party = Harry's four sample builds re-costed to 2.1** (Ork 15 not 20, attr +1 7 not 10): Tusk 99, Clutch 100, Ember 100, Quill 100; karma spends in sessions (Tusk Guns → 10 at S3, etc.). As-of S2 shows Guns 10 (9 + smartlink) before the karma buy.
- Builder steps: name, metatype (+ reserved human-bonus panel), attributes, skills, magic (reserved spells/projection slot), cyberware (+ skillwire skill), gear, vehicles, deck & chips grid, circles, lifestyle. Every step shows points used and left.
- Fly-to rule: tall things are fitted by width and entered at the top. Roll results toast at the die and go to the sheet's roll log.

Checks: Playwright walk (fly, builder clicks, karma scrub, rolls, threads, palette) + iPhone 13: zero errors, no horizontal scroll. Gemini blind read: roll feedback was off-screen (→ toast), road lines through place labels (→ label backing); dock overlap at screen bottom is canvas cropping, left as is.

## 2026-11-13 (evening) — Harry's first-glance feedback: one tight cluster, nothing hides on zoom, a real quickbar

Harry's notes (abridged): the map is the anchor and should be huge, with every character on its left edge; use a real open map; stop changing *what* is shown when zooming (he couldn't find the builder for minutes); tall sheets ruin the rows; a big obvious "build a new character" place above the party; big readable text *over* small-scale detail instead of swapping; a tight cluster, not an endless vertical string; and the bottom bar was "quicklinks hidden behind Jump", so replace it with a real quickbar. Rules: Shaman summons free and pays for astral, Hermetic the reverse; skillwires drop racial bonuses and keep cyber; TNs can reach 0.

- **Layout** (world units): rulebook (index + 2×2 pages) | party column of six seats, sheets 3860×940 | **Seattle map 9000×8008** | session columns. People and thread rows sit under the seats, still on the map's left edge. The launcher sits above the party and straddles onto the map. Empty seats are dashed buttons.
- **Map**: central Seattle rendered from OSM *data* (one Overpass query, no tile server; a sub-agent did it): `assets/map/map-6000.webp` 1.3 MB plus `map.js` with the six places' fractional coordinates. Attribution is on the map.
- **No LOD swapping at all.** Every element is always drawn. Headline labels (`label()`) fade by on-screen size; labels that sit *over* content (the builder headline, page numbers, the map title) fade sooner and reach 0. Pages are always drawn at 1300 px and sharpened to 2600 px when close.
- **Sheets** are wide rows: identity/budget/ledger | attributes & skills/derived/damage/rolls | gear, ware & magic | **builder** (11 steps in 5 fixed columns at scale 0.30, under a 150-px CHARACTER BUILDER label). The fixed columns never rebalance, and reserved slots keep their size.
- **Quickbar** (replaces the nav bar): runner chips (damage dots, Actions, wound TN). A chip opens damage boxes plus its six best skills and Soak, each rollable. There is also **Round order** (Actions, then Coordination, then Palming, from p.3) and a free **Dice** pool. Jump moved to the title badge's ⌕ and ⌘K or /.
- Fly rules: a character lands on its name and skills (first 1790 px); a builder step lands on that step, from its fixed column offset. viewFor leaves room for the quickbar.

Checks: Playwright walk (overview, map, place, sheet, builder, step, book, region, launcher → new runner → builder name → Elf = 15 pts, quickbar roll + popover stays open, round order, free dice, session, NPC, threads), iPhone 13: zero errors, no horizontal scroll, phone bar 118 px. Gemini blind read: on the overview it named every region (rulebook, party with launcher and empty seats, map with all six places, sessions, quickbar). Fixed from its reads: the toast lost its CSS in the reassembly; the popover closed on roll (detached-target check); left-edge row names showed inside sheets. False reports, measured and left: "clipped place note", "missing Soak button".

## 2026-11-13 (night) — tight clusters at every scale; build mode; summons; buttons vs information

Harry's second round of feedback:
- **Golden ratio at every scale.** The sheet is 2100 × 1300 in two bands:
  - top: identity | attributes & skills | portrait;
  - bottom: combat, rolls and damage | gear, ware & magic | summons;
  - the builder is a small box in the bottom-left corner (scale 0.11; 4 packed columns plus All done; tallest 2743 of 2860).

  The whole cluster is 1.43:1.
- **Party on the map's right edge.** The map is now exactly the six seats' height.
- **Sessions are compact cards** (Harry: "every cell being almost entirely deadspace"). Each card's notes are grouped by who, with a portrait chip; karma sits under its runner. Cards are 3 to a row, in time order. People and threads are compact cards listing the sessions they appear in. The row grid, column washes, now line and rulers are gone; S6 carries a "Now" badge.
- **Build mode.** Tab and Shift+Tab fly between steps. A two-ended thread joins the step to its rule on the page and to the part of the sheet it writes. An **All done** step shows whether the build is legal and how many points are left; Esc or Done leaves.
- **Portraits.** The 27 TW runner tokens are ranked by archetype and metatype. Drag-and-drop an image onto a portrait, or onto empty canvas for art. Images are shrunk to 720 px JPEGs in localStorage.
- **Screen UI is paid for in blood; the canvas is cheap.** The bottom bar, title badge and help card are gone. The quickbar is TW's: one line of text at the top centre (`/`, ⌘K) that jumps or runs commands (`tusk guns`, `roll 6 tn 4`, `damage tusk 2`, `heal tusk`, `new runner`, `round order`, `summon`). Round order (a Next/New turn tracker), the dice tray and help are cards on the canvas.
- **Summons** (rules p.2): a summoner gets a Summon button and a picker of the 10 types. The roll is Magic vs 6 − Mental; a spirit's rating is the successes, an elemental's is successes + 2. The summon gets a little card in the sheet with buttons for damage, heal, take Drain and release. Sample shaman **Moss** sits in seat 5 with a City Spirit.
- **Buttons vs information.** Every pressable thing is a raised keycap with an ochre edge and a ledge, and it presses down. Information sits flat on tinted panels with no borders. Selected choices sink in and fill.
- **Tools roll their skill:** weapons, cyber weapons, medkit, deck, vehicles, spells, circles (Network and Etiquette) and lifestyle (Etiquette). The roll label names the tool.
- **Threads are drawn on the canvas** in world units: translucent, no labels, and the far-end dot flies you there.
- **Bugs fixed.** Firefox grabbed the map image when dragging (fixed with `draggable=false` plus a `dragstart` guard; Firefox pan is verified). Every circle showed as "Contact" because the level name overwrote the circle name.

## 2026-11-24 — SRD 5.2.1 bestiary and magic items (branch `srd-bestiary`)

The SRD print stopped at p.203. It now covers pp. 204–364. The generator is `build/srd/bestiary.py` (PyMuPDF on the reader's PDF; rows in reading order, fonts tell the parts). It writes `rigs/srd-bestiary.js`, the pp. 204–364 entries of `books/srd-print.json`, and the print line inlined in `campaign-srd.js`.
- **Counts.** All 331 stat blocks parse. The "CR n (XP" line count is 327: four wyrmlings and Young White Dragon print "CR 3 (700 XP; …)", which the new count includes. All 258 magic items parse, plus 85 rules sections and tables around them. Nothing is unparsed. Giant Fly (inside the Figurine) has no actions in the book; it lives with the other creatures (`home`). One PDF typo is read as printed: Young White Dragon's Int save "2".
- **Ids.** `srd-mon-<slug>`, `srd-item-<slug>` (the campaign's slug rule); rules are `srd-magic-items-…` and `srd-monsters-…`, with tables ending `-table`. A block that runs on into the next column or page carries `cont`, drawn as regions `<id>~2`.
- **Words.** Monster lines are composed from numbers. Item and rules lines (339) were written by two sub-agents to the house style and checked: no run of more than four book words. They live in `build/srd/summaries.json`. A 6-word overlap scan of everything new finds only type lines, language lines and game terms (as in P-65).
- **Canvas.** Monsters A–Z and Animals are `cards: true` parts. Beside its pages, each creature has a stat card in place of a slip: every number that rolls is a keycap, every name goes to its region, and spell names link to the spell. Cards are fitted by width + transform, because a CSS zoom change measured ~8 ms per read on this page. There are three arrangements, so short blocks fill their paper (≥77% full; 12 of 331 are under 80%). Fits are cached per creature. Cards are drawn after first paint: those in view first, the rest in 10 ms slices (done ~10 s after a cold first visit). Off-screen cards and chapter blocks use `content-visibility: auto`. Magic Items slips carry kind, rarity and attunement (`tag`, `slipH`).
- **Play.** Each card has "+ Add to S<n>" (and the quickbar: `monster goblin`, `add 3 goblin`, `damage goblin 4`). The monster files under the session being prepared (`state.foes`). The session card lists them with Hit Points and ± keycaps, and they join the round order with d20 + Initiative. Monster rolls go through toast → log → `logPush` as the GM's, so the Turnip Works desk link sends them. A natural 20 doubles the next damage roll's dice.
- **Engine bug fixed on the way.** `persist()` rewrote the whole saved record, dropping session notes, pockets and the log that other writers keep there (a roll after a note edit lost the note). `store.set` now merges; this is on `desk` too.
- **Load** (headless Chromium on hearth, 1400×900, first/repeat visit). `main` srd.html: 5.6/3.9 s. This branch: 6.1/4.7 s. Other tables are unchanged (index 4.4/3.0 s both).
- **Checks.** walk4, scan_layout (all five tables, Chromium + Firefox), and phone.py (srd, index, brp) all pass. A bestiary scan finds 331 cards drawn and nothing outside its card, in both engines. New slips: none overflow. Walks at 1400×900 and iPhone 13 (fly, open a card, roll, add, round order, reload keeps the monsters): zero errors, page scroll width 390 at 390 px.
- **Open.** ~950 older SRD slips already overflow by 2–27 px (pre-existing, not touched). `tests/builds.js` ember costs 91 on main too.
