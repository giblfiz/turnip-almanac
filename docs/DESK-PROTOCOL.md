# Desk protocol: Turnip Almanac ↔ Turnip Works (v1, 2026-11-20)

Harry (20 Nov): a dev branch of Turnip Works with real integration adapters to the Almanac — rolls and chat going
back and forth, stat and attack buttons that link back and forth, and a GET-only API so an AI seat works well.

## Shape
The Almanac (a static page, state in the browser) is a **desk client of the Turnip Works relay**. It joins a TW
campaign with a TW seat token (the GM pastes their TW seat link into the Almanac's Options → Turnip Works). It talks to
the relay only through TW's existing GET API (CORS is open), so no new transport is needed:
- **out:** `GET {relay}/c/{cid}/a/{area}/do?cmd=…&nonce=…&seat={token}` (dice.roll, chat.say, token.*, desk.*)
- **in:** long-poll `GET {relay}/c/{cid}/changes?kinds=chat,roll,ask&after={seq}&wait=25&seat={token}`
The Almanac de-duplicates its own echoes by the `id` it chose (every out message carries an `id` = `alm_<random>` (a TW id)).

**What never crosses:** book text and book art. Only mechanics, names, numbers and our own words (the stencil rules).

## TW changes (branch `almanac-desk` in 3d-vtt)
1. **Rolls from the desk.** `beyond20.js` `info.src` gains `"almanac"`. New allowed `info` keys (all short strings or
   numbers): `sys` (rules system id, e.g. `ssr2`, `brp`, `srd`, `lb`, `ep2`), `verdict` (the system's own result line,
   ≤ 80 chars, e.g. "3 successes vs TN 4", "Special success (07 vs 45%)"), `level` (`critical|special|success|failure|
   fumble|hit|miss|…`), `pc` (the Almanac character id), `button` (the button id that asked, if any).
   The chat log shows `info.verdict` beside the dice when present. **`changes` includes `info` on roll events.**
2. **Speaking as a character.** `chat.say` accepts optional `as` (≤ 60 chars, a character name) for human seats; the
   log shows "as" in place of the seat name, with the seat as a small subtitle. `changes` includes `as`.
3. **Desk buttons on pawns.** A pawn may carry `desk: { url, pc, sys, buttons: [{ id, label, group }] }`
   (≤ 60 buttons; label ≤ 40; group ≤ 24, e.g. "Skills", "Attacks", "Spells"; url = the Almanac page with
   `#pc=<id>`). The pawn's ring shows a **Sheet** entry that opens a menu of these buttons by group, plus "Open the sheet"
   (opens `url` in a new tab). Pressing a button dispatches **`desk.ask { id, pawn, pc, button, label }`** — stored as a
   chat line of kind `ask` ("Tusk asks the desk: Firearms") — which the Almanac answers with a `dice.roll` carrying
   `info.button = <ask id>`. If no desk answers within ~20 s the ask line says "no desk open". `changes` includes `ask`
   events (`kinds=ask`). Existing `attacks` stay as they are (d20 systems may fill both).
4. **The desk snapshot for the AI seat.** `desk.put { json }` (GM seats; ≤ 200 kB) stores the Almanac's mechanics-only
   projection per campaign (party: name, player, sys, key stats, skills, attacks/buttons, damage/conditions; sessions:
   number, title, date; round order). New GET reads (any seat with `chat` permission):
   `/c/{cid}/desk` (the whole snapshot, with `updated`), `/c/{cid}/desk/pc/{pc}` (one character).
   An AI seat acts on the desk through the existing `do`: `cmd=desk.ask&pawn=…|pc=…&button=…` (the desk rolls it) and
   `chat.say`. The LLM card gains a short "The desk (Turnip Almanac)" section listing these, shown only when a snapshot
   exists.
5. Everything new is behind `?desk=1` / a campaign flag `desk: true` set by the first `desk.put`, so tables without a
   desk see nothing new.

## Almanac changes (turnip-almanac main)
- Options → **Turnip Works**: paste a TW seat link; the Almanac parses relay base, cid, area, token; a status line
  (linked · last seen); Unlink.
- Every roll and chat in the Almanac log is sent out (rolls structured, with the rig's verdict); everything in the TW
  chat (rolls, says, asks) comes in to the Almanac log, marked "from the table".
- Per character: **Put on the table** (creates or updates the TW pawn: name, size, `desk` buttons from the rig — skills,
  attacks/weapons, spells — `attacks` for d20 systems, damage/conditions) and keeps it updated when the sheet changes.
  Damage and conditions set in TW come back to the Almanac sheet.
- Answers `desk.ask` by rolling the button with the rig and sending the structured roll.
- Pushes the desk snapshot (`desk.put`) on link, on sheet change (debounced 3 s), and on session change.
- Deep link in: `#pc=<id>` flies to that character's sheet.

## v2 additions (Harry, 20 Nov, afternoon): pairing by link, both ends on our servers, one window each

**Pairing is a click, never a paste.** We host both ends, so pairing is a link:
- **TW → Almanac.** The TW GM's menu has **Open the desk** (which rules: the five Almanac tables; remembered on the
  campaign as `desk.page` once chosen). It opens `{almanac}/{slug}/#tw=<pairing>` where `<pairing>` is base64url of
  `{"r": relayBase, "c": cid, "a": area, "s": seatToken, "p": twPageUrl}` (a GM seat token, the same one this TW
  client holds). The Almanac reads `#tw=` on load, links, saves the link per table, and strips the fragment from the
  address bar at once (`history.replaceState`) so the token is not left in history or shared by copy-paste.
- **Almanac → TW.** Unlinked, the Almanac's Turnip Works panel offers **Open a Turnip Works table for this
  campaign**: `{tw}/?desk=<almanac page url>` makes a new TW campaign (the existing create flow) and, once made, TW
  opens the pairing link above back into the same Almanac tab (by its window name, below).

**One window each, both ways.** Each side opens the other with a fixed window name, so a second click focuses and
re-points the window that is already open instead of opening another:
- TW opens the Almanac as `window.open(url, 'turnip-almanac:' + cid)`; the Almanac opens TW as
  `window.open(url, 'turnip-works:' + cid)`. Each page also sets its own `window.name` to that name on load.
- Same-origin duplicates (two Almanac tabs for one table) find each other over `BroadcastChannel('turnip-almanac')`:
  the newer tab hands its deep link to the older one and says "This table is already open in another tab".

**Deep links both ways.**
- Into the Almanac: `#pc=<id>` (a character's sheet), `#rule=<rule id>`, `#session=<n>`; combinable with `#tw=`.
- Into TW: the Almanac opens `{twPage}#s=<token>&focus=<pawn id>` (TW flies the camera to that pawn, in its area) and
  `&area=<area id>`. TW's pawn ring has **Open the sheet** (`desk.url` + `#pc=`), through the named window.

**Item 11: the Almanac keeps everything on the server except the book.** Linked, the Almanac's whole state
(characters, choices, advancement, notes and their pictures, sessions, history, log, roll counts, layout) lives with
the TW campaign on the relay; the browser keeps a cache. The book file (and anything cut from it) never leaves the
browser: that is the mechanical firewall, the same line as the bridge.
- `POST {relay}/c/{cid}/desk/store?seat=…` body `{rev, state}` (GM seats; ≤ 8 MB; JSON only): saves if `rev` is the
  stored rev (returns `{ok, rev}`), else `409 {rev, state}` so the desk can merge. `GET {relay}/c/{cid}/desk/store`
  returns `{rev, state, updated}` (GM seats). Stored as a file beside the campaign's own, backed up with it.
- Player seats will later get a filtered read (visibility, item 13); for now GM only.
- The store is never shown to AI seats raw; they read the mechanics snapshot (`/c/{cid}/desk`) as before.
- Notes' pictures are things people dropped on the table (theirs), so they may be stored; book art is cut at load
  from the reader's own copy and is never in the state.

## v3 (Harry, 21 Nov): the blank desk and orientation
- **The blank desk** is `desk.html` locally, and the front page of the hosted desk branch. It is the Almanac before a game is picked: a canvas holding the orientation (`src/orient.js`), which covers picking a game and edition, bringing your rulebook, your seat (GM or player), the Turnip Works link, and how the desk works.
- **Pairing.** It takes `#tw=` like a table does.
- **Picking a game** dispatches `desk.page {page: slug}` to TW, then opens that table with the pairing carried along.
- **A rulebook dropped on it** is identified by SHA-256 against `BOOK_PRINTS`. It is stored in IndexedDB under that hash, where the table finds it.
- **TW's "Open the desk"** with no `deskPage` opens the blank desk (`deskBlankPage()`); with one, it opens that table. The Settings picker defaults to "Pick in the desk".
- **Every table carries the same orientation** as its **Start here** paper, which replaces "Getting around". Its game list is where you change games.
