# What generalizes: one rules system (Simplified Shadowrun 2e) → many (Titterpig corpora, open rule sets, big books)

Written 2026-11-13 after one day of building against a single 4-page book. Purpose: separate what the
exercise taught about *the Almanac* from what it taught about *this one system*, so that the next system is
a new rig and book and not a new app. Read with SPEC.md (contracts) and PHOENIX.md (how we learned them).

## 1. Inventory: where each piece of today's build belongs

| Piece | Belongs to | Evidence it generalizes (or doesn't) |
|---|---|---|
| Camera, flights (ρ 2, fast out / slow in), back, ⌘[ ] | ENGINE | No rule knowledge anywhere in it |
| Headline labels that fade over detail (E1) | ENGINE | Same code labels the map, pages, builder, sessions |
| Fit-to-box with no abbreviation (E6, E7) | ENGINE | Works on any section of DOM; the scan test is generic |
| Golden clusters, ghost slots, pockets, notes, art, log | ENGINE | Content-free containers |
| Threads (provenance, build) | ENGINE (needs a `prov` map from the rig) | Draws between any two element ids |
| Quickbar search | ENGINE | Indexes node titles |
| Quickbar *commands* (`tusk guns`, `roll 6 tn 4`) | ENGINE grammar + RIG vocabulary | Skill words and dice notation are per-system |
| Book shelf, pdf.js pages, regions | BOOK | The print (`id, page, rect`) is all it needs |
| Print ids `p-cyber`… | BOOK, as a stand-in | Should be Titterpig hash IDs (stable across copies) |
| Tables (metatypes, cyberware, gear, spells, summons…) | RIG data | Hand-transcribed today; each is a set of typed entities in a corpus |
| `compute` (prices, caps, derived numbers, karma replay, warnings) | RIG procedure | Partly formal (Health = 3 + Body), partly procedure (best outfit only, two free contacts, skillwire override) |
| `roll` (pool vs TN, modified rule of six, bonuses) | RIG procedure | Every system differs; the *log, toast, tray* around it don't |
| Round-order comparator (Actions → Coordination → Palming) | RIG procedure | Leaked into the app; must move into the rig |
| Wound rule (+1 / +3 TN; adepts exempt) | RIG procedure | Leaked into the app |
| Builder steps (HTML per step) | RIG *description*, ENGINE *widgets* | See §3: seven widget patterns cover all eleven steps |
| Sheet sections (HTML) | RIG *description*, ENGINE *fit/threads* | See §4 |
| Summons mini-sheet | RIG data + an ENGINE "child sheet" | A child sheet is general (familiars, drones, vehicles, companions) |
| Tool → skill rolls | RIG data (`TOOL_SKILL`) | Every system has "this item is used with that ability" |
| Interpretations list | RIG data, overridable by the GM | Harry overturned 4 of my 5 readings in one sitting (P-05, P-06) |
| Portrait defaults from TW tokens | ENGINE + a per-genre token set | Cyber runners today; TW has 519 fantasy figures for others |
| Sessions, people, threads, @mentions, places on a map | CAMPAIGN | System-free |

**Leaks to close before a second rig:** the builder step HTML, sheet section HTML, initiative comparator,
wound rule and quickbar skill words all live in app code today. Everything else already sits on the right side.

## 2. How a Titterpig corpus feeds the Almanac

Titterpig (sortilege-inc's open DSL, spec v0.5) is a *knowledge base, not an engine*: typed entities with hash IDs, EXTENDS,
REFERENCES from prose to entities, and HOOKS whose FORMALITY runs PROSE → TAGGED → CONDITIONAL → FORMAL. A
stencil plus the user's own book builds the corpus locally; the relay sees only a mechanics projection.

Mapping, part by part:
- **The print *is* the stencil's geometry.** Today's 32 regions came from the PDF build's layout audit; for
  any other book they come from the stencil's anchors (page + rect per entity). Region ids become hash IDs, so
  every owner's copy agrees on ids and threads point at the same rule on everyone's page.
- **RIG tables come from corpus entities**, not hand transcription: "all entities of type cyberware with
  properties ess, pts, effect". The 11-10 smoke test already turned this book's vehicle table into 14/14 rows.
- **RIG procedures split by FORMALITY.** FORMAL hooks (sums, lookups, `Health = 3 + Body`) can be compiled; the
  rest is a small hand-written procedure module per system. For SSR 2.1 my estimate is that about 60–75% of
  `compute` is table lookup and sums (most sensitive to how Titterpig formalises cost curves); the remainder is
  genuine procedure (caps, the best-of-outfits rule, free contacts, the skillwire override, karma bands).
- **Interpretations attach to entity ids.** When a hook is only PROSE and the rig had to decide, the decision is
  a record `{entity, reading, by, date}` shown beside the rule and overridable as a house rule, not code.
- **Prose stays with its owner** (legal frame, 11-08): book pages render only from the local PDF; shares and the
  relay carry ids and mechanics. The Almanac already behaves this way (it reads the PDF in the browser).

## 3. The chargen grammar (from eleven SSR steps to seven widgets)

| Widget | SSR steps that used it | General form |
|---|---|---|
| text | name, player | free text |
| pick one | metatype, tradition, deck, lifestyle | choose one entity of type T (cost from the entity) |
| pick up to N | human racial bonuses (3), spells | choose ≤ N of type T, some free |
| stepper with a cost curve | attributes, skills, cyberware, gear, vehicles | quantity 0..max, cost(from→to) |
| toggle grid | chips (tier × kind) | entities of type T arranged by two properties |
| one level per row | social circles | for each entity of type T choose a level |
| dependent select | skillwire skill | a choice that exists only if another choice is made |

Plus three structural ideas that held up: **budget pools** (points, Essence, karma; a system may have zero or
several), **reserved slots** (a step that opens only on a choice keeps its space so nothing moves), and an
**All done** step that reports legality from the rig's warnings. A rig should *describe* its steps as data
(`{widget, type, cost, pool, max, opensWhen}`); the engine draws, lays out (golden block), Tabs and threads them.

## 4. Sheets
A sheet is a cluster of sections, each fitted to its box (E6). The rig names the sections and what goes in each
(attribute grid, derived numbers, lists by entity type, a damage track, the ledger). The engine supplies the fit,
the no-abbreviation rule, provenance threads, roll buttons and pockets. **Child sheets** (today: summons)
generalize to companions, drones, vehicles and familiars: a small sheet attached to its owner's sheet.

## 5. Larger texts (4 pages → 300–600 pages, many books)
What breaks at scale, and how to keep the contracts:
- **E1 vs. rendering cost.** Today all 4 pages are always drawn. For a big book, every page must still be
  *present*, as a low-resolution thumbnail, and sharpen on approach; that changes resolution, not content. The
  11-11 pdf.js bench: text for 5 books (2,376 pp) in ~10 s; thumbnails ~84 s with 4 workers. So: text and
  structure first, thumbnails progressively in the background, cached.
- **Index scale.** 32 index cards fit one block; thousands do not. The book becomes a fractal cluster:
  book → chapters → sections → entities, each level a golden block with its own headline label (E2 at every
  scale). Fit-to-box keeps each level free of whitespace.
- **DOM scale.** Thousands of regions and cards need off-screen virtualisation (nothing visible changes; only
  what is off the screen is not built).
- **Navigation.** Search becomes primary: the quickbar over titles, hash ids and REFERENCES.
- **Many books.** A shelf per system: core + supplements, with corpus EXTENDS between them.
- **Heavy sheets.** A 5e caster's spells and features will hit the fit floor (zoom 0.45). Do not hide; grow:
  the sheet keeps its golden shape and gets larger, or long lists become child sheets (a spellbook card hung
  off the sheet like the pocket tab).

## 6. The rebuild (Phoenix: the code is replaceable, the contracts are not)
The current page is a patch stack (`build/assemble3.py` over `build/index.v15.html`). Proposed rebuild from
SPEC.md as plain ES modules, no patch stack:
`engine/` (canvas, flights, labels, fit, clusters, threads, quickbar, keys, undo, log, pockets, notes) ·
`book/` (pdf, print loader, shelf layout, virtualisation) · `rig/` (the interface + `ssr2/`) ·
`campaign/` (party, sessions, people, threads, notes language) · `ui/` (the button/paper kit).
The evals in SPEC §3 carry over unchanged and must pass on the rebuilt page.

**Prove the seam with a second system before scaling.** Pre-registered predictions:
1. **Lasers & Feelings** (one number, tiny, open licence, already a Titterpig corpus from 11-10): a complete
   rig in under ~150 lines with zero engine changes once the §1 leaks are closed (70%).
2. **SRD 5.2** (CC BY 4.0, a real big book): spellcaster sheets hit the fit floor (90%), the book needs
   virtualisation (95%), and the chargen grammar needs one new widget (a level-by-level progression) (60%).
If prediction 1 fails, the seam is wrong; fix the seam before touching the big book.

**Result (2026-11-13): the seam was tested with Basic Roleplaying instead** (ORC, 303 pages, d100 roll-under; chosen
over the two above as big *and* not D&D-shaped). Scoring the predictions that transfer:
- *Zero engine changes* — **failed, mildly.** Five leaks had to be closed in the engine (per-campaign storage key, dice
  tray, book anchor id, shelf layout, the builder's step list). None changed the seam's shape; all were SSR names
  hard-coded where the rig should have been asked. After them, the engine runs both systems unchanged.
- *A complete rig in a modest size* — rig 102 lines + rig UI 222 lines + extracted data (JSON). Larger than the
  150-line L&F guess, as expected for a full system.
- *The chargen grammar needs one new widget* — **held**: "roll characteristics". Everything else (steppers,
  pick-one grids, pick-many lists, the All done step) reused the seven.
- *Big sheets hit the fit floor* — **nearly held**: 58 skills fit at zoom 0.47 against a 0.45 floor. A bigger
  sheet needs a second page or a taller sheet; that is the next E2/E6 decision.
- *The book needs virtualisation* — **held in part**: 303 pages needed progressive thumbnails and a cap of 14
  sharp pages to stay smooth.

## 7. Open, not decided
- The notes language (H: "a whole language… needs real consideration"): @mentions create people today; what about
  places, items, times, rolls, secrets?
- House rules: overriding interpretations and numbers per table, visibly.
- **Visibility** (H, 13 Nov: "a huge set of functionality that we are missing"): Unix-style owner/group/table modes with
  groups derived from play. See docs/VISIBILITY.md. Also multi-seat: the relay.
- Where health and conditions live (Almanac today) versus Turnip Works, and how the two link.
- **Targeted rolls** (H, 13 Nov: "a real open UI question"): a roll at a thing whose numbers set the TN. See docs/TARGETING.md;
  the rig needs `against(roller, action, target)`.
