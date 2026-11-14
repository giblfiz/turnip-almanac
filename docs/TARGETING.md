# Targeted rolls: rolling *at* something whose own numbers set the TN (opened 2026-11-13; design, not built)

Harry: "for many games it might be more relevant. I have no idea how we make a roll targeted at a specific thing
(that has specific TNs based on the target)… that's a real open UI question."

## What "the target sets the numbers" means, by system
- SSR 2.1 (Harry's): a **challenge** has a rating and armor; a tool has penetration and effect ([9M]). Armor above
  penetration stops it; bonuses can cut armor by 2, raise effect, or keep it quiet; success lowers the challenge's
  rating by L1/M2/S3/D4. Wards add to spell TNs. Targets are not only people: doors, cameras, ICE, wards.
- 5e-style: attack roll vs the target's AC; a save vs the caster's DC (the *target* rolls); advantage from conditions.
- PbtA-style: no target numbers at all; the move's outcome bands apply.
So the rig must supply `against(roller, action, target) → { pool, tn, armor, mods[], whoRolls, apply(result) }`.

## Candidate interactions (all on the canvas; no new screen chrome)
1. **Drag the die onto the target.** Press a roll button and drag; a canvas thread follows the pointer; every valid
   target lights up with its resulting TN; drop to roll. Good for one-offs; spatial, explicit, nothing to undo.
2. **A sticky target.** Click a target's card (a person, a challenge, a summon) and it takes a reticle; while it is
   targeted, a thread runs from the active sheet to it and *every roll button shows its TN against that target*
   ("Guns 11 · TN 3 vs Bell wight, armor 4"). Good for combat: many rolls, one target. Esc or clicking it clears.
3. **Quickbar grammar.** `tusk guns at wight`, `quill force bolt at door`. The quickbar previews the TN before Enter.
4. **Challenges as first-class cards.** A GM drops a challenge card (a door, a camera, a node) with rating, armor and a
   rating track, much like the summon mini-sheet. A successful roll at it applies the effect and ticks the track
   down, and the log records it. This makes the book's challenge rule *visible*, not just a number in a dialogue.
5. **Area targets** (Fireball, 15 ft): drag out a region, or lasso several cards; each gets its own resolution line.

## Principles that already apply
- E14 (every number traces to its rule): the pre-roll preview shows *why* the TN is what it is; threads to the
  target's armor and the rule region.
- Bonus spending is a second decision after the roll (armor −2 / effect +1 / quiet): a small strip on the toast/log entry.
- Visibility: the GM may keep a target's numbers hidden; the player sees the outcome, the GM sees the arithmetic.

## Recommendation (Fauna, to test, not settled)
Build 2 + 4 first (a sticky target and challenge cards): they cover repeated combat and the SSR challenge rule with
the least new interaction. Then add 1 (drag the die) for one-offs, and 3 for keyboard play. Prototype against the
SSR rules, then check the rig interface against a 5e-style save (the target rolls) before calling it general.
