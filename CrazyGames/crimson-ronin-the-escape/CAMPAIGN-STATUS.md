# Crimson Ronin — Campaign Analysis & Current Status

**Date:** 2026-09-13
**Your original campaign is intact** in `index-original.html` (and in git at `db792a9`).

---

## 1. Your levels, analysed

The campaign committed on 2026-09-09 is genuinely inventive for a solo single-file game. The things that stand out, with numbers:

**The mechanic vocabulary is bigger than the game shows off.** You built and wired up:

| feature | rooms that use it |
|---|---|
| Climbable walls (grab, shimmy, auto-mantle, wall-jump) | **0 of 30** — a complete movement verb with its own art, badge and input, never placed |
| Hidden platforms revealed by pressure plates | 3 (rooms 3, 6, 8) |
| Plate-triggered collapse | 4 (rooms 11, 14, 17, 20) |
| Ceiling-mounted watchtowers | 8 (rooms 3, 6, 7, 8, 11, 18, 20, 28) |
| Pulse fire jets | 5 (rooms 15, 18, 21, 27, 30) |
| Swinging blades | 5 (rooms 8, 10, 23, 26, 29) |
| Teleport / launch / slow-mo / guard-spawn plates | **0 of 30** — all four implemented, none used |

**The escalation curve is deliberate and it works.** Platforms 4 → 21, towers 0 → 7, spikes 1 → 12, KI 6 → 14, world width 2,626 → 5,330px from room 1 to room 30. Room 15 IRON SENTINEL is the clear act break — the first room to break the 3,500px envelope.

**The best single idea in the campaign is the hidden platform as an optional route, used exactly three times.** Room 6 turns it into a puzzle — a 2,450px spike chasm where each plate materialises the next foothold, so you read the plates as a sequence rather than react. Room 8 turns it into a *shortcut*, and the sign openly tells you: *"Take the high secret bridge if you want to skip the blades entirely."* That's risk/reward, not a gate — the most player-respecting design in the game.

**Room 23 OBSIDIAN SPIRE is built on a concept.** Keys at `(1180,230)` and `(3540,230)` — identical height, opposite ends — five elevated spike strips at y=280, and the sign reads *"THE MIRROR — ABOVE AND BELOW, ONE KEY EACH."* The whole room is symmetry.

**Your hint-text voice matures across the campaign**: instructor (*"A / D — MOVE"*) → guide (*"ASCEND HERE. RETURN ABOVE."*) → atmosphere (*"NOT ALL FLAMES WARM"*, *"ONE LAST BREATH BEFORE DARKNESS"*). Dropping the hand-holding in the final act is a real tonal choice.

**Structural one-offs worth keeping:** rooms 20 and 30 open with a drop-in (*"DROP FROM ABOVE TO ENTER"*); room 12 is runners-only (pure chase); room 2 is walkers-only (pure stealth); room 30 is a seven-tower gauntlet at the fastest sweep speeds in the game.

---

## 2. What was broken

The campaign had **12 of 30 rooms unbeatable** — not hard, impossible:

- **7 rooms** had the exit door outside the walkable world (`w` left at 3500 while content ran to 4960). The player is hard-clamped to `x ≤ w − 38`, so a door past that is not merely hard to reach, it is never even drawn on screen.
- **5 rooms** had a required key outside it.
- **71 hide spots** across the campaign were dead — bushes placed at `y:565` when the runtime needs `y:610`, so the hide prompt never appeared. Hiding has never worked outside the tutorial.
- Blades in room 8 were all jumpable (`y:430, h:180` sits below the jump apex body `286..348`), so its "blade rhythm" sign was meaningless.
- Watchtowers swept 1,200–1,500px in 3.3s, which dwells on any spot for ~0.1s — **they could never catch anyone.**

---

## 3. Where the campaign stands now

| | |
|---|---|
| Kept exactly as you wrote them | **22 of 30 rooms** |
| Rebuilt by me | **8** — rooms 8, 9, 20, 21, 22, 23, 24, 25 |
| Unbeatable rooms | **12 → 6** |
| Total crumble platforms in the campaign | 81 |

**Still unbeatable — rooms 6, 19, 27, 28, 29, 30.** These are untouched, so their doors/keys are still outside the world. Room 6 is the worst: the door is **12px** past your reach, so you get stuck at the end of a spike chasm you just crossed perfectly.

**The eight rebuilt rooms, each with a distinct idea:**

| room | idea | crumble |
|---|---|---|
| 8 SILENT BLADE | blades finally block the jump apex; a three-plate secret bridge that skips them, and the tower now sweeps the bridge | 0 (blade room) |
| 9 DUAL TOWERS | two towers that each watch exactly one platform; the key plate sits **on lit stone** | 6 |
| 20 MASTER'S TRIAL | three escalating crumble bridges, 4,440px of spike floor, the biggest room in the game | 3 → **15** |
| 21 RAZOR EDGE | a narrow ridge over a chasm, punctuated by a fire-washed anvil you may only touch while the flame is out | 2 → **6** |
| 22 GHOST CORRIDOR | the floor breathes — a short-short-long collapse rhythm you learn rather than react to | 0 → **9** |
| 23 OBSIDIAN SPIRE | the spire is climbed, not crossed; rises of 280–330px force the crumble route | 1 → **4** |
| 24 THE GRAND HALL | a 5,000px hall whose floor is taken away behind you, with 400px ash stretches dragging you to 45% speed | 0 → **8** |
| 25 MIDNIGHT ESCAPE | three crumble spans over a 2,920px void, with a slow-mo plate for the last one | 5 → **8** |

---

## 4. Level 31

**There is no level 31 in the committed files.** The editor's embedded data has exactly 31 entries, and the 31st is the **Tutorial** ("Tutorial: The Path of Shadows") — 8 platforms, 2 crumble, one spike plate, 2 guards, 3 coaching cards. So if your level 31 exists, it is in your browser's `localStorage` (`crimson_ronin_editor_levels_v1`), which I cannot read from the files.

Tell me the concept in a sentence and I'll build it properly, or export it from the editor (Saves → export) and I'll take it from there.

---

## 5. Files

| file | what it is |
|---|---|
| `editor.html` | **your editor** — untouched, byte-for-byte |
| `index-original.html` | **your campaign** — all 30 rooms as you wrote them |
| `index.html` | **my campaign** — your 22 rooms + my 8 |
| `editor-mine.html` | your editor with my levels loaded as its default data (your Tutorial kept as entry 0) |

⚠️ One caveat on `editor-mine.html`: the editor's own serializer does not write `blades`, so if you open it and save, **room 8's blades would be lost**. `index.html` holds the authoritative blade data.
