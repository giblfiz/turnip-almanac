# Turnip Almanac — PHOENIX ledger (append-only)

The history of possible systems: each meaningful change with its request, why, status, evidence, and the
false trails. `SPEC.md` is the compiled current view. All entries 2026-11-13, Harry (H) and Fauna (F), from the
one Claude Code session; commits in this repo.

| # | Request / defect (provenance) | Outcome wanted | Status · evidence | False trails and lessons |
|---|---|---|---|---|
| P-01 | H: "name the separate project that is the desk side of turnip works and build a prototype" | a name + a canvas built from the 11/10–11/11 design chats | verified (af7a019) | F named it "Almanac"; H refined it to **Turnip Almanac** |
| P-02 | v1 semantic zoom by swapping content per LOD | — | **rejected** (H, P-10) | CSS descendant LOD leaked a parent's level into nested nodes ("blank cards"); the deeper error was hiding at all |
| P-03 | H: use the simplified Shadowrun PDF as the sample doc, with the full rules for chargen and sheets | a full rig plus the real book | verified (c8965a5) | the print came free from the PDF build's own layout audit (32 regions, exact rects) |
| P-04 | the four 11-06 sample builds | re-costed under 2.1 | verified: 99/100/100/100 (tests/builds.js) | old prices (Ork 20, attr+1 10) were from the pre-2.1 revision |
| P-05 | H rules: Shaman gets summoning free and pays for astral; Hermetic the reverse | rig fix | verified | F had read the PDF's Shaman line as including projection: wrong |
| P-06 | H rules: skillwires drop racial bonuses and stack with cyber; TNs may reach 0; the 10–12 karma band is on p.4 | rig fix; drop the false caveat | verified | F had echoed a stale "inferred" note from the revision notes |
| P-07 | H: "Contact contact" duplicates | the circle name must survive | verified | `{name, ...L}` let the level's name overwrite the circle's |
| P-08 | H: the map is the anchor; huge; characters on its edge; a real open map | a giant real map with the party on its edge | verified | OSM *data* via one Overpass query (tile servers forbid offline use); agent-rendered |
| P-09 | H: characters to the **right** of the map ("I might have misspoke") | party on the right edge | verified | |
| P-10 | H: "I really dislike how prone we are to change *what* is shown on zooming" (could not find the builder for minutes) | E1 | verified | → headline labels over detail, fading by on-screen size (H: "love the fade out text") |
| P-11 | H: tall sheets destroy the rows; then "you switched too vertical for too horizontal… golden ratio"; then "tight cluster needs to apply at every scale" | E2 | verified | 3860×940 strip → 2100×1300 sheet; builder as a small corner box |
| P-12 | H: a row × session grid makes every cell dead space | compact session cards | verified | **rows rejected**; the per-person view comes back as grouped notes + backlinks |
| P-13 | H: "a big obvious location to launch build a new character" | launcher + empty seats | verified | |
| P-14 | H: Tab/Shift+Tab between builder sections; an "All done" with legality | build mode | verified | the Tab handler first referenced a removed palette element (crash); a click re-entered build mode after Done |
| P-15 | H: the thread to "starting a character" should follow the current section, be done-able, have two ends | E15 | verified | |
| P-16 | H: portraits and art: uploads, defaults from TW tokens | portraits + drop/paste art | verified | TW thumbs are opaque squares; CSS crop of TW's window failed for cyber framing → real crop files; **16/27 good**, 9 framed too wide: open |
| P-17 | H: the quickbar "is *just text*, just like in turnipworks, same location" | E8 | verified | F had built a bottom bar of buttons (wrong meaning of "quickbar"); then a quicklinks bar "hidden behind Jump": removed |
| P-18 | H: "UI space is paid for in blood… everything on canvas is cheap" | E8 | verified | title badge, help card, bottom bar removed; round order, dice, help moved onto the canvas |
| P-19 | H: summons with a "summon" button and a little sheet | summon picker + mini-sheet | verified | sample shaman Moss added (no build in the party could summon) |
| P-20 | H: visually distinguish info and buttons "very potently" | E9 | verified | Gemini still flagged stat tiles as ambiguous before the flat-paper pass |
| P-21 | H: roll buttons on tools ("Sword" → melee; spells, circles…) | E16 | verified | grenades: no skill in the book → Athletics (listed interpretation) |
| P-22 | H: threads should paint on canvas, scale, translucent; labels unneeded | E14 | verified | screen-space threads clamped to the screen edge looked "floating" |
| P-23 | H: no whitespace, "scaling things very differently… some sheets look different" | E6 | verified (tests/scan_layout.py) | fit by CSS zoom binary search; fonts load late → refit; horizontal overflow must count too |
| P-24 | H: everything abbreviated ("Coo…", "Me…") is no good | E7 | verified | the ellipsis F added to fix clipped dice hid the overflow from the fit |
| P-25 | H: back after a link; ⌘[ etc.; zoom out more; out fast, in slow | E5, E13 | verified (timed: widest at 0.39 s) | `syncHist()` was an empty stub for one build |
| P-26 | H: how do I add/edit session text? `@richard` should link or create an NPC; "a whole language for notes" | editable notes, @mentions, [[links]] | verified (minimal) | **open: the notes language needs real design** |
| P-27 | H: an inbox in each major section; adding sessions without pushing people down | E4, E10 | verified | people/threads/inbox moved to their own column |
| P-28 | H: log of rolls and chat on the canvas; sticky notes resizable, text fills | E11, log card | verified | `say tusk:` parsed the colon into the name |
| P-29 | **Phoenix audit (this entry):** the build is a patch stack in a scratchpad | make it regenerable | partial: sources copied into `build/`; SPEC, ledger and evals written | the clean rebuild is proposed in docs/GENERALIZING.md §6 |
| P-30 | H: put the sample campaign's people under made-up names and publish publicly; licence held back for now | public repo, no real names | verified (fresh public repo; the old history went to a private archive) | a force-push would have left old commits reachable, so the repo was recreated instead |
| P-31 | H: "pick a medium or big complicated text (NOT D&D) that is free and not copyrighted and try building a new version of this on it" | a second rules system on the same engine | verified: **Basic Roleplaying** (Chaosium ORC Content Document, 303 pp.) → `brp.html` | candidates rejected: Ironsworn rulebook (CC BY-NC-SA, only its SRD is CC BY), Starforged (paid), Fate (CC BY but no laid-out PDF), Cepheus (OGL); BRP was chosen as ORC-licensed, big and d100 roll-under, far from SSR's dice pools |
| P-32 | the seam test: what did the engine have to give up? | engine leaks closed | verified: 5 leaks fixed (`STORE_KEY` per campaign; the dice tray's step/roll moved to the rig; the book anchor is `BK.id`; the shelf reads chapters/columns/title from the book; the builder's step regex reads the rig's `ORDER`) | the last one crashed Tab on every non-SSR step: found by a Tab-walk test, not by the walk the SSR page already had |
| P-33 | BRP chargen in the builder | rolled characteristics, profession, professional and personal points, powers, weapons, armour, All done | verified (Tab walks all 10 steps; Shift+Tab back; legality and points left; layout scan clean in Chromium and Firefox) | needed one new widget, "roll characteristics"; a 58-skill sheet fits at zoom 0.47 with a floor of 0.45 — the next bigger sheet will hit the floor |

| P-34 | H (phone, 14 Nov): "think about UI and pinch to zoom … on the phone at the most basic level" | E13a | verified (tests/phone.py, both pages) | the canvas is covered in buttons, so the old "no pan from an interactive element" left a phone almost unpannable; a pinch that lost a finger froze the camera |
| P-35 | H: the builder's sections "squirt down" with dead space, not golden | E2b | verified: every BRP and SSR cell fills 96–100% (DOM scan); render cost 130 → ~160 ms with a shared fit cache | first try searched columns × zoom on every click (1.2 s a click); the cache keys fits by step and item count, kept across visits |
| P-36 | H: a 300-page book wants chapters with fading titles, much smaller pages; "why is this thing 5 times bigger than the map?" | E2a | verified: book 6268×5122 against the map's 9215×8200 (was 27884×17862, and it covered the help card and launcher) | a squarified treemap left a 0.23 sliver; the exhaustive ordered split took 6.6 s (48M calls) until memoised on (range, aspect) |
| P-37 | H: the rule threads need a quick way to follow them that does not cover the thing | E14b | verified | Gemini flagged the far dot covering rule text at close zoom: dots were sized in world units |
| P-38 | H: clicking a skill's name did nothing, clicking its number went to the rules: "backwards" | E14a | verified (Grapple → p.40) | |
| P-39 | found on the way: the BRP page's quickbar hint was Shadowrun's ("tusk guns…"), cut off by an ellipsis on a phone | hint from the rig; short on phones | verified | Gemini's blind read caught it; the DOM confirmed |

| P-40 | H (Android): zoomed in to read a page, pinch stopped working in both directions | pinch always works | **fixed blind** (not reproducible in emulation, even at 4× CPU throttle): a new first finger clears stale pointers; no page renders under a finger or a flick; phones sharpen to 1600 px, 6 pages | suspected: a page canvas swapped under a finger lost its 'up', leaving a phantom pointer, so two real fingers counted as three |
| P-41 | H (Android): tapping quickbar results did nothing | taps work | **fixed blind** (emulated taps worked): the page cancelled every one-finger touchmove, and Chrome drops the click of a tap that wiggled | now only multi-finger moves are cancelled (iOS page zoom) |
| P-42 | H: drop the chapter numbers ("why is 3 below 11?") | the cluster order is free | verified | the numbers fought the golden arrangement's order |

| P-43 | H: voice input on the quickbar, as in Turnip Works | mic in the quickbar | verified (button present; Web Speech API, as TW) | |
| P-44 | H: a new character goes on top, under the button, and pushes the rest down; and a way to delete one | party order; Remove on the pocket tab | verified (order, slide, ⌘Z restores) | seats were fixed slots; now an ordered list, empty seats after it |
| P-45 | H: "the whole thing is essentially got to be version controlled", like a document's edit history | deep history card | verified: versions commit when the saved record settles (only changed parts, IndexedDB); go back to any version, which is itself a new version | a restore was at risk of being overwritten by the page's own saves on the way out: writes freeze until the reload |
| P-46 | H: rolling all stats again and again leaves no trace; count every roll button | roll counts on every dice button; characteristic rolls named in the history and log | verified ("rolled characteristics (3rd time)") | |
| P-47 | H: pictures in notes, and visibility, from a little icon on the note's bar | note menu: picture; who can see it (everyone, GM, me, some players) | verified; **visibility recorded, not enforced** (one seat) | a drag that moved now stops all click handlers (stopImmediatePropagation): the earlier guard let the document's own handler through |

## Evaluator note (automation frontier, 2026-11-13; Claude Opus 5.5 builder; Gemini via agy-run as the blind reader)
Gemini blind reads found real bugs (mojibake, LOD leak, missing toast CSS, Contact duplication, crop framing) and
made confident false claims (a "clipped" note that measured fine, a "missing" Soak button, a "duplicate" toast).
Layout truth was settled every time by a DOM measurement. Keep vision for "does it read as X"; use DOM scans
for overflow, clipping and abbreviation. Replay probe: run tests/scan_layout.py after any layout change.
