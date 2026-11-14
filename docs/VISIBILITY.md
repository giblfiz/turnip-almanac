# Visibility: who sees what (opened 2026-11-13; design, not built)

Harry: "a huge set of functionality that we are missing… visibility… the rules are just basically unix permissions
with players as users, and some smart logic that forms groups naturally."

## The model (Harry's, as stated)
- **Users** are seats: each player, plus the GM. The GM is root (sees everything and can change any mode).
- **Every object has an owner and a mode**: owner / group / table (Unix's user / group / other), each read and write.
  Objects: sheets and their sections, session notes, pocket scraps, people and threads, places, loose notes,
  art, rolls in the log, rules regions (a GM-only house rule, say).
- **Default**: the creator owns it. Whether "table can read" is the default should follow the Figma field report:
  open by default, with secrecy as a layer you add (a trusting table needed none of it).

## Natural groups (the "smart logic"): derived, named after where they come from, pinnable by the GM
- **The party**: every runner.
- **Who was there**: runners who appear in a session (notes about them, karma, rolls) → "present at S4".
- **Who knows them**: runners linked to a person through notes or @mentions → "knows Mama Ruiz".
- **Who shares a circle**: runners with a contact in the same social circle → "Fence / Fixer circle".
- **Who holds it**: a pocket scrap or item's owner, plus anyone it was handed to.
A derived group updates by itself as play adds evidence; the GM can freeze one ("the S4 crew") so it stops moving.

## UI candidates (must obey E1 and E8: no hiding on zoom; no screen chrome)
- **A mode badge on every card**, drawn on the canvas: an eye for table-visible, a lock with faces for
  owner/group. Click it to change the mode; the faces show who can see it.
- **"View as"** (a quickbar command: `view as tusk`): the GM's canvas renders exactly what Tusk's seat sees.
  This is the cockpit for checking secrets.
- **What a player sees where something is hidden** (decision needed): nothing at all (it leaks nothing, but the
  space reads as empty), or a blank "something is here" silhouette (keeps the map stable, but leaks existence).
  E1 argues for the silhouette by default and "nothing" as the GM's per-object choice.
- **Reveal** is one move: drag the card onto a person, a group, or the table; the log records "revealed to …".

## Questions for Harry
1. Default open or default owner-only for new things a player makes?
2. Silhouettes or nothing for hidden things?
3. Can a player grant visibility to another player (share a secret), or only the GM?
4. Does visibility apply to rolls (GM rolls in secret; a player's private roll the GM still sees)?
