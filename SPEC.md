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
- E2a **Big books are chapter blocks** (H, 14 Nov): the book is a cluster of chapters (an ordered golden treemap), each
  block an index column beside its pages, scaled as a whole to fill its cell. The whole book is at most ~40% of the map's
  area, so the map stays the anchor. Each chapter carries a big headline that fades as you go in (E1).
- E2b **Builder steps are golden cells** (H, 14 Nov: "verticals that squirt down"): the builder is split into cells near
  the golden ratio, sized by how much each step holds; inside its cell a step picks its column count and scale to fill it.
  Cells never move when a choice is made. Long lists show one slice at a time (weapons by era; powers by system).
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
- E13a **Phones** (H, 14 Nov): a finger pans from anywhere, including from buttons (a drag that moved never presses);
  two fingers pinch, and lifting one hands the pan to the other; a flick coasts; double-tap zooms into the thing (or in,
  on empty canvas); a long press on empty canvas makes a note; the page itself never zooms; the quickbar hint shortens.
- E13b **Pointer software** (H, 20 Nov): a mouse or a touch is required. No screen-reader or keyboard-only path is planned
  (an intentional choice); the existing shortcuts stay.
- E13c **Controls live one zoom level deeper** (H, 20 Nov): a card's visibility menu sits on the card, drawn small under an
  icon that fades as you zoom in on it (like headline labels); clicking the icon flies you in. Saved now, enforced once more
  than one seat joins.
- E13 **Keys follow convention**: ⌘[ ⌘] back/forward, ⌘Z ⇧⌘Z undo/redo, ⌘C copy what is under the pointer,
  ⌘V paste (image → portrait/art/pocket, text → note/pocket), Tab/⇧Tab between builder steps, Esc closes.

**Rules made visible**
- E14 **Every number traces to its rule.** Hover a number: threads drawn *on the canvas* (translucent, no labels)
  run to the rule's region on the real page, the builder step, and the karma entry; the far dot flies there.
- E14a **Words go to rules; numbers show where they came from** (H, 14 Nov: "that seems backwards"). A stat's name is a
  link to its rule (it flies there and draws the thread); its number pins the threads to everything that made it.
- E14b **Every thread end has a quick-follow button**: a small keycap beside the far end when it is on screen, on the
  screen's edge where the line leaves when it is not; never on top of what the thread starts from. Lines and dots are
  sized on screen, so a close view is not covered by them.
- E14c **Nothing is lost** (H, 14 Nov): a History card holds every change, newest first, each with what happened; any
  version can be gone back to (a new version itself). It sits just west of the map, packed tight: the past is to the left. Every dice button carries a tiny count of its presses.
- E4a **Party order** (H, 14 Nov): a new character goes on top, just under the launcher, and the rest slide down; removing
  one closes the gap (undo or history brings them back).
- E15a **Advancement is a builder step** (after All done): what was earned and spent, filed under the latest session,
  shown on that session's card and counted by the sheet's As of. The rig decides the economy (SSR karma buys; BRP
  experience checks and improvement rolls); the engine keeps the log (`karmaOf`, `state.adv`, `state.checks`).
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
A print entry may also carry `kind` (`monster`, `item`), `tag` (a short line shown on its slip), `cont` ([[page, rect], …]:
the rest of an entry that runs on into the next column or page, drawn as regions `<id>~2`, `~3`) and `home` (the chapter
it lives in when its page is in another). A book part may say `cards: true` (each entry gets a card slot about a page in
size, which the rig fills: the SRD bestiary's stat cards) or `slipH` (taller slips). `books/srd-print.json` pp. 204–364
is generated by `build/srd/bestiary.py` from the reader's PDF.

**State** (localStorage `turnip-almanac-2`, or `turnip-almanac-2:<campaign id>` when the campaign has an id): choices, live damage, rolls, extra runners, portraits, art, done,
summons, notes, snotes (session notes), smeta, npcx/threadx, pockets, sessx/prepN, log, foes (the GM's monsters, each filed under a session).

## 3. Evals (named checks; a change is verified only when these pass)
- `tests/walk4.py` — the end-to-end walk (flights, quickbar commands, new runner, Tab build, All done, portrait,
  threads, Firefox pan). Zero page errors.
- `tests/scan_layout.py [url]` — E6/E7 (run on `index.html` and `brp.html`): no section overflow, no cut or abbreviated label, no roll button outside its
  column, in Chromium and Firefox.
- `tests/builds.js` — the four 11-06 sample builds cost 99/100/100/100 under 2.1.
- `tests/phone.py [url]` — E13a on an emulated iPhone with raw touch events (pan from a button, tap, pinch + handoff,
  flick, double-tap, long-press note, page never zooms).
- Perceptual: Gemini blind reads (agy-run, isolated folder). Useful for "does this read as X"; ~half its defect
  claims were false on measurement, so layout claims are settled by the DOM scan, not the vision read.

## 4. Build
Phase A of the rebuild (2026-11-13): the page is assembled from plain sources by `./build.sh`:
`src/head.html` + `src/style.css` + `src/body.html` + `src/scripts.html` (the rig, campaign, map and token scripts) +
`src/app.js`. `./build.sh brp` builds `brp.html` from `src/scripts-brp.html` and `rigs/brp-ui.js`. The old patch stack is archived in `build/legacy/` (it produced the same page; kept as history).
