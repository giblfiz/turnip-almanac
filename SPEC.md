# Turnip Almanac — SPEC (the accepted, verified system as of 2026-11-13)

The Almanac is the desk side of Turnip Works: rules, characters, campaign, sessions and table play on one
zoomable canvas. It is a separate app and repo from Turnip Works (Harry, 13 Nov); the ties are copied icons,
tokens and links. This file is the compiled view. `PHOENIX.md` is the history of how it got here, including
rejected designs. The implementation is replaceable; these contracts are not.

## 1. Experience contracts (Harry's rulings; each was a correction, see PHOENIX.md)

**Orientation**
- E1 **Zoom never changes *what* is shown.** Everything is always drawn at its true scale. Big headline labels sit
  over regions and fade only once they would cover the detail beneath them (over-content labels reach 0;
  labels in open space keep 5%). Resolution may sharpen (pdf pages), content may not appear or vanish.
- E2 **Tight cluster, about the golden ratio, at every scale**: the whole canvas, each sheet (2100 × 1300),
  each sub-block (the builder's step block). Neither an endless vertical string nor an endless horizontal one.
- E3 **The map is the anchor.** It is huge; the party sits on its right edge and fits that edge exactly.
- E4 **Collections grow without pushing their neighbours.** Each collection ends in a dashed ghost card in the
  slot where its next item will go ("+ S7", "+ Person", "+ Thread", empty seats). Adding = clicking that slot.
- E5 **Flights orient.** A link flies with a deep pull-back (van Wijk–Nuij, ρ = 2), out fast and in slow with an
  ease to rest (u = 1 − (1 − t)³; widest at ~20% of the flight). Back is always available (‹ in the quickbar,
  ⌘[ / ⌘], Alt ←/→).

**Space**
- E6 **No whitespace.** Each section's contents are scaled (CSS zoom, binary search) to fill its box exactly.
  Sheets therefore look different from one another; that is intended.
- E7 **Never abbreviate.** No ellipses, no clipped labels; if a word does not fit, the section shrinks.
- E8 **Screen UI is paid for in blood; the canvas is cheap.** Screen UI is only: the quickbar (one line of text,
  top centre, like Turnip Works'), the ‹ back button inside it, transient roll toasts, and edge arrows that
  appear only when you are lost in empty space. Everything else (help, round order, dice tray, log, inbox,
  pockets) is a card on the canvas.

**Affordance**
- E9 **Buttons look like buttons; information looks like paper.** Pressables are raised keycaps with an ochre
  edge and a ledge that press down; chosen states sink and fill; information is flat, tinted, borderless.
- E10 **Every thing has a pocket**: sheets, sessions, people, threads. Paste over it, drop on it, or click to type.
- E11 **Sticky notes** are made at the zoom you are at (same on-screen size), are free rectangles (width and
  height drag independently) and their text always fills them.
- E12 **Portraits are close-ups** (head and shoulders), never whole tokens.
- E13 **Keys follow convention**: ⌘[ ⌘] back/forward, ⌘Z ⇧⌘Z undo/redo, ⌘C copy what is under the pointer,
  ⌘V paste (image → portrait/art/pocket, text → note/pocket), Tab/⇧Tab between builder steps, Esc closes.

**Rules made visible**
- E14 **Every number traces to its rule.** Hover a number: threads drawn *on the canvas* (translucent, no labels)
  run to the rule's region on the real page, the builder step, and the karma entry; the far dot flies there.
- E15 **Build mode**: a live two-ended thread joins the current builder step to its rule and to the part of the
  sheet it writes; an "All done" step says legal/illegal and points left.
- E16 **Tools roll their skill**: weapons, cyberware weapons, kits, decks, rides, spells, circles and lifestyles
  carry roll buttons labelled with the tool.
- E17 **Where the book is open, say so.** The rig's interpretations are listed beside the book and in the builder.

## 2. Layers and machine contracts

```
 ENGINE (system-agnostic)   camera · flights · labels · fit · clusters/ghosts · pockets · notes/art · threads · quickbar · keys · undo · log
 BOOK   (per source text)   file (PDF) + PRINT: [{ id, title, page, rect[pt], text(summary) }]  → regions on the real page
 RIG    (per rules system)  data tables + procedures (compute, roll, initiative, summon) + chargen step list + sheet sections + interpretations
 CAMPAIGN (per table)       party [{ id, player, choices, karma[], summon }] · sessions · notes {who,text} · people · threads · places(+map) · pockets · log
```

**RIG interface** (two implementations: `rigs/ssr2.js` + `rigs/ssr2-ui.js`, and `rigs/brp.js` + `rigs/brp-ui.js`):
- `blank()` → empty choices; `compute(choices, karmaLog, asOf)` → sheet `S` with `attr, skill, tn(), derived…,
  spend[{label, pts, src[]}], prov{key: [srcIds]}, warn[]`. `src`/`prov` ids are BOOK print ids or `B:<step>`.
- `roll(pool, tn)` → `{dice[{chain, ok}], succ, bonuses, verdict}`; `summon(type, S)`; initiative comparator.
- Tables: `META, CYBER, GEAR, VEH, DECKS, CHIPS, TRAD, SPELLS, SUMMONS, CIRCLES, LIFE`, `TOOL_SKILL`.
- `interpretations[]` (shown to the user).
- The rig's UI half (`rigs/<sys>-ui.js`, spliced in at `/*@RIG-UI@*/`) supplies: `WORDS, ORDER, BCOLS, BINNER, BREG,
  STEP_RULE, STEP_SHEET, STEP_NAME, stepHtml, renderSheet, rollHtml, portraitOf, initiative, renderTable, freeRoll,
  trayStep, trayRoll, rigCommands, rigAct, advanceText, RIG_NO_UNDO`. Each table rule and system name the engine
  needs comes from here; the engine must not name a system's steps, stats or dice.
- BRP's `compute` returns `char, skill, der{hp, mw, pp, dmg, mov}, croll, spend, warn, prov, pts, left`;
  `roll(target)` → `{roll, target, level: critical|special|success|failure|fumble, ok}`.

**BOOK print**: `books/ssr2-print.json` (32 entries, from the PDF build's own layout audit); `books/brp-print.json`
(200 entries with page rects; the BRP PDF is fetched by `books/get-brp.sh`, never committed).

**State** (localStorage `turnip-almanac-2`, or `turnip-almanac-2:<campaign id>` when the campaign has an id): choices, live damage, rolls, extra runners, portraits, art, done,
summons, notes, snotes (session notes), smeta, npcx/threadx, pockets, sessx/prepN, log.

## 3. Evals (named checks; a change is verified only when these pass)
- `tests/walk4.py` — the end-to-end walk (flights, quickbar commands, new runner, Tab build, All done, portrait,
  threads, Firefox pan). Zero page errors.
- `tests/scan_layout.py [url]` — E6/E7 (run on `index.html` and `brp.html`): no section overflow, no cut or abbreviated label, no roll button outside its
  column, in Chromium and Firefox.
- `tests/builds.js` — the four 11-06 sample builds cost 99/100/100/100 under 2.1.
- Perceptual: Gemini blind reads (agy-run, isolated folder). Useful for "does this read as X"; ~half its defect
  claims were false on measurement, so layout claims are settled by the DOM scan, not the vision read.

## 4. Build
Phase A of the rebuild (2026-11-13): the page is assembled from plain sources by `./build.sh`:
`src/head.html` + `src/style.css` + `src/body.html` + `src/scripts.html` (the rig, campaign, map and token scripts) +
`src/app.js`. `./build.sh brp` builds `brp.html` from `src/scripts-brp.html` and `rigs/brp-ui.js`. The old patch stack is archived in `build/legacy/` (it produced the same page; kept as history).
