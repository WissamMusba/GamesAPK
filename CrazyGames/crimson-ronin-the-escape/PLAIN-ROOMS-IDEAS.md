# Crimson Ronin — 22 Unique Ideas for the Plain Rooms

**Date:** 2026-09-12 · Companion to `LEVELS-DESIGN-REVIEW.md`
The "plain" set = the 22 rooms built from the standard vocabulary (platforms / ash / crumble / ground+elevated spikes / spike+alarm plates / ground towers / three guard types). Room numbers are 1-based; the signature rooms (3, 6, 7, 8, 11, 18, 20, 28) are excluded.

---

## Start here: you have six finished mechanics that no room uses

I ran a usage census across all 31 authored rooms. This is the biggest source of free originality you have — these are already coded, already drawn, already wired to input:

| Implemented feature | Used by | What it does |
|---|---|---|
| **Climbable walls** (`platType:'wall'`) | **0 / 31 rooms** | Full movement verb: E to grab, ▲/▼ to shimmy, auto-mantle onto the top, wall-jump off. Has its own wood-rung art in `drawPlatforms`, its own on-screen badge (`[E + ▲] CLIMB` / `🧗 CLIMBING`), and a dedicated teal accent colour. **Never used once.** |
| **Teleport plate** (`teleportTrigger`) | **0 / 31** | Plate warps the player to `teleportX/Y` |
| **Launch plate** (`launchTrigger`, `launchPower`) | **0 / 31** | Plate catapults the player upward |
| **Slow-mo plate** (`slowMoTrigger`) | **0 / 31** | Drops the world into bullet time (`slowMoTimer` — already affects `zenBoost` and guard speed) |
| **Guard-spawn plate** (`guardSpawnTrigger`) | **0 / 31** | Plate summons a new guard of a chosen type |
| **Trigger zones** (`triggerZones`) | **0 / 31** | Invisible volumes with popup text, one-shot or rearmable |
| **Crate hide spots** (`type:'crate'`) | **0 / 31** | 5-second hide vs the bush's 3 seconds. Every room uses bushes; the crate is dead code |
| **`checkpointX`** | **0 / 30** | Mid-room respawn. The check is in `update()` (line 3496) and no level ever sets it |

Also worth knowing: only **3 of the 123 plates** in the plain rooms affect a platform (all `vanish`, in rooms 14 and 17). The other 120 are 89 spike traps and 31 alarm plates. There's a lot of untapped vocabulary in plates alone.

---

## The 22 ideas

### 1 — The Temple Gate · *the missing crate*
**The room already teaches HIDE and has nowhere to hide.** The sign at x=1700 says `S — HIDE`, but room 1 contains **zero** hide spots (it's the only room in the game without one). A player follows the instruction and nothing happens.
**Idea:** put a **crate** at x≈1300, right before the walker's patrol. This fixes a real bug and debuts the crate type — 5 seconds of cover instead of the bush's 3, so the tutorial can teach the better tool first.

### 2 — Shadow Walk · *make the betrayal real*
Signs: `ASH SLOWS YOUR STEP` and **`SOME PLATES BITE... SOME BETRAY`**. The second one is a promise the room doesn't keep — its single plate is an ordinary spike trap, and every plate looks identical.
**Idea:** add one **alarm plate** among the spike plates. Stepping on what looks like another spike trap instead wakes the walker at x=2300. Now the sign is honest, the plates are genuinely ambiguous, and reading them becomes a skill. Costs one line of level data.

### 4 — Guard Patrol · *the trap that calls for backup*
A clean stealth room: one watcher, two walkers, three bushes, no towers. Its identity is *patrol timing*.
**Idea:** make the punishment for a mistake *social* rather than lethal. Replace one spike plate with a **guard-spawn plate** that summons a second walker from the right. Getting caught doesn't kill you — it makes the room harder. That's a consequence the game never uses, and it fits "Guard Patrol" exactly.

### 5 — The Tower Watch · *live up to the name*
**The room is called The Tower Watch and contains zero towers.** It does have two crumble platforms (x=1500 and x=1760) forming the only route across.
**Idea:** add a **ceiling-mounted watchtower** over the crumble gap. You cross collapsing stone while a beam sweeps it. Crumble + spotlight is a combination no room in the game currently does — and it retroactively earns the room's name.

### 9 — Dual Towers · *clean up and make it a rhythm*
The name says dual; there are **three** towers, and two of them (x=1200 and x=1300) sit almost on top of each other — they read as one broken tower. Meanwhile 6 of the 11 platforms are crumble, so the floor is already temporary.
**Idea:** remove the duplicate, keep two towers at opposite ends, and **offset their phases so the beams alternate**. The room becomes a metronome: you cross on the off-beat, over ground that's disappearing. Sign it `TWO BEAMS, ONE RHYTHM`. It's already 80% there — this is mostly deleting a tower and tuning a phase.

### 10 — The Armory · *slow ground, fast death*
An "armory" of 8 platforms, **5 of them ash**, plus a blade and 5 guards. The room is unusually heavy — more than half the floor slows you.
**Idea:** stop treating the ash as decoration and make the *slowness* the hazard. Run one long ash stretch through the mid-section so the player is permanently slowed while a runner guard and the blade close in. "Slow floor + fast pursuer" is a combination no room exploits, and it's exactly what an armoury should feel like: heavy, encumbered, dangerous.

### 12 — Triple Threat · *the world slows, you don't*
The pure-chase room: **4 runners, no watchers, no walkers**, 7 spike plates, 4 towers, and elevated spikes on three platforms. It's a reaction test.
**Idea:** give it the **slow-mo plate** (never used anywhere). Hitting it drops the world into bullet time — and crucially it slows the player *far less* than everything else: `dt *= 0.38` globally, then the player gets a 1.25× `zenBoost` (≈47% speed) while guards take an extra 0.7× on top of that (≈27% speed). So you gain ground on every pursuer. The room becomes: trigger the plate, watch the four runners crawl, and thread them in one clean line. "TRIPLE THREAT" finally means simultaneous threats instead of four runners in sequence.

### 13 — Shadow & Flame · *the flame is missing*
**The room is named Shadow & Flame and has no fire.** (Only rooms 15, 18, 21, 27 and 30 have fire jets.) It has shadow — 3 ash platforms, 1 crumble, 8 spikes — but the flame half of the name is unfulfilled.
**Idea:** add **PulseFire jets** along the ash platforms, and offset their phases against the towers so the safe windows interleave. Now the room is literally shadow *and* flame: slow ground, a sweeping light, and a flame you must time. The name becomes a description.

### 14 — The Citadel · *a fortress that folds as you enter*
This is the only plain room that uses **plate-triggered platform actions twice** (two `vanish` plates). That's the seed of something good.
**Idea:** make it a **sequence**, not two independent traps. Plate 1 drops platform A; platform A carries plate 2, which drops platform B; the second key sits past B. The citadel collapses in order behind you and there is no way back. Right now those two plates are separate incidents — chaining them turns the room into one authored moment.

### 15 — Iron Sentinel · *the sentinel should follow you*
The inflection room: 17 platforms, 12 spikes (7 elevated), 9 plates, 4 towers, 3 keys, 4,400 px long — the first room to break the 3,500 envelope. Its sign says `THE PATH UP IS AT THE FAR END...`.
**Idea:** two things. (a) Set the unused **`checkpointX`** around x=2200 — a 4,400 px room with 3 keys and 4 towers currently punishes a death at the end with a full restart. (b) Use a **guard-spawn plate** to summon a single runner that pursues you across the whole room, so "Iron Sentinel" is one relentless guardian rather than five static guards. (a) is dead code already written; (b) is one plate.

### 16 — Gauntlet Run · *patience beats speed — but only if speed is an option*
Its platforms alternate y=480 / y=380 every ~350 px — a perfect metronome ladder — with an elevated spike on nearly every rung. Four watchers. The sign says `PATIENCE BEATS SPEED`.
**Idea:** make that a real choice by adding a **launch plate** at 740,380. It fires you straight to the upper tier, skipping a rung — but it drops you in the open in front of a watcher. Take the shortcut and get seen, or climb honestly and stay patient. Right now the sign states a rule the room never tests.

### 17 — Void Stepper · *step through the void*
**The best home in the game for the teleport mechanic.** The room has three spike voids (480–1100 is 620 px, 1480–2140, 2440–3000), 8 crumble platforms (the most of any plain room), and the sign `NEVER STOP MOVING`. It is *called* Void Stepper.
**Idea:** put a **teleport plate** at x=1330 that warps the player across the first void instead of making them cross it. The trade: instant travel, but you arrive right next to the runner at x=1300. A room named for stepping through voids should let you actually do it.

### 19 — Fortress Infiltration · *reinforcements*
Six guards, **all runners** — the densest pursuit in the plain set — plus 9 spikes, 8 plates, 4 towers. It's already a chase.
**Idea:** use **guard-spawn plates** so that each spike plate you trip also calls another runner. The fortress notices you. Escalation as a mechanic: the room gets harder the more mistakes you make, which is what "infiltration" should feel like. Pair it with the sign `THE FORTRESS IS WATCHING`.

### 21 — Razor Edge · *debut the climbing wall*
It has fire jets (one of only five rooms) and the sign `FORGE FIRES — WATCH THE FLARE BEFORE YOU LEAP`. Its route is a staircase up to the crest — 320,500 → 580,420 → 820,340 → 1080,260 — then back down.
**Idea:** replace the staircase with a single **climbable wall face**. You shimmy up a razor-thin ledge while the fires flare on a timer, then wall-jump off the top. This is the natural debut for the climbing verb: the room is named Razor Edge, the mechanic is a knife-edge ascent, and the art, physics, badge and input already exist. It would be the only vertical-scramble moment in the game.

### 22 — Ghost Corridor · *scripted haunting*
A long corridor (11 platforms, 2 towers, 6 guards, 3 bushes) with no text at all, named Ghost Corridor.
**Idea:** use **trigger zones** (never used anywhere) to place 3–4 invisible volumes that fire a text popup and a spotlight sweep as you pass — footsteps behind you, a light snapping on, a whisper. Because trigger zones can be one-shot or rearmable, you can script a haunting cheaply. This gives the room an identity that isn't a new hazard, which the campaign currently has no example of.

### 23 — Obsidian Spire · *make the mirror literal*
You already built the concept: keys at `(1180, 230)` and `(3540, 230)` — same height, opposite ends — five wide upper platforms at y=280, and the sign `THE MIRROR — ABOVE AND BELOW, ONE KEY EACH`. It's the most conceptual room in the set.
**Idea:** finish the metaphor by making the **upper tier a true mirror of the lower one** — same spike x-positions reflected about the room's midpoint (x≈2000), same gaps, same rhythm. The player learns the lower half, then has to run it inverted on the upper tier. You already have both tiers built; this is aligning the spike x-values, not new geometry. Add the blade (this room has one) as the thing that breaks the symmetry.

### 24 — The Grand Hall · *"then it burns"*
The sign reads **`TIDE DRAGS — THEN IT BURNS`** and the room has the most ash in the plain set (5 of 10 platforms) — so "tide drags" is true. But there is no fire, so "then it burns" is a lie.
**Idea:** add **fire jets timed to the ash platforms** so the slow ground and the flame are the same hazard: the ash holds you in place just long enough for the fire to catch you. Ash + fire is a combination no room uses, the sign already describes it precisely, and a "Grand Hall" deserves one long sweeping hazard along its floor rather than more spikes.

### 25 — Midnight Escape · *the bridge remembers every step*
Three enormous crumble crossings (540–1260, 1580–2260, 2680–3380 — each ~700 px) with 5 crumble platforms, and the sign **`THE BRIDGE REMEMBERS EVERY STEP`**.
**Idea:** make the *respawn delay* the mechanic. Tune `respawnDelay` so each bridge rebuilds on a fixed beat, and the player must cross in rhythm — the bridge literally remembers when it last broke. Then put a **slow-mo plate** mid-bridge so a mistimed step can be recovered by slowing the world. The sign already promises memory; give it one.

### 26 — Blood Moon · *two routes, one moon*
Four wide upper platforms (900, 1520, 2140, 2760 — each ~500 px) at y=280 form a **complete upper highway** above the 15-platform ground route. That's a second path you may not have noticed you built.
**Idea:** commit to it. Make the lower route fast and lethal (it already has the spikes) and the upper route safe but slow, then put the "lanterns" — ceiling towers — on the upper tier to tax the safe path. And the sign says `LANTERNS ABOVE, FLAMES BELOW`: add fires to the lower route and the sign becomes a literal map of the choice. This converts a ladder into a decision.

### 27 — Dragon's Breath · *the sign promises blades*
**The sign reads `BLADES SING — STEP BETWEEN THE NOTES` and the room has no blades.** (Blades exist only in rooms 8, 10, 23, 26 and 29.) It does have fire jets, and it's called Dragon's Breath.
**Idea:** give it a big, slow **blade** sweeping the mid-room, and phase the fire jets so the blade's safe windows and the fire's off-phases interleave. Two rhythms to read at once, in a room whose sign already tells you to step between the notes. This is the single easiest win in the list — the design brief is already written on the wall.

### 29 — The Final Gate · *a gate you have to earn*
The second-longest room (5,030 px), 19 platforms, 12 spikes, 6 towers, 8 guards (most in the plain set), 3 keys.
**Idea:** two changes. (a) Set the unused **`checkpointX`** mid-room — a 3-key, 5,000 px room is the one that actually needs it. (b) Concentrate the last three towers on the **final 500 px** so their beams converge on the approach to the gate. Right now the towers are spread evenly, so the ending has the same pressure as the middle. A finale should tighten, and the name promises a gate — so make the gate itself the hard part.

### 30 — Crimson Freedom · *one last breath — then silence*
21 platforms, 7 towers (all ground-mounted, the fastest in the game at 0.90–0.95), 9 guards, 3 keys, fires. The correct finale shape, and the sign says `ONE LAST BREATH BEFORE DARKNESS`.
**Idea:** give the player the breath. After the last tower, make the **final ~600 px completely empty** — no spikes, no guards, no towers. The game currently ends at full pressure and cuts straight to the win screen, so the escape never feels like relief. A stretch of pure running, with the exit visible ahead and nothing between you and it, is what "Crimson Freedom" means. This is a pacing idea, and it's the cheapest change here — you'd be *removing* things.

---

## Which room should debut which unused mechanic

| Unused mechanic | Best home | Why |
|---|---|---|
| Climbable walls | **21 Razor Edge** | Knife-edge ascent; name and mechanic match |
| Teleport plate | **17 Void Stepper** | Room is named for it and already has three voids |
| Launch plate | **16 Gauntlet Run** | Makes "patience beats speed" a real choice |
| Slow-mo plate | **12 Triple Threat** | Bullet-time against multiple pursuers; also **25 Midnight Escape** for mid-bridge saves |
| Guard-spawn plate | **19 Fortress Infiltration** | Reinforcements suit an infiltration; also **4 Guard Patrol** |
| Trigger zones | **22 Ghost Corridor** | Scripted haunting; the only atmospheric room |
| Crate hide spots | **1 The Temple Gate** | Fixes the room's broken HIDE sign |
| `checkpointX` | **15 Iron Sentinel**, **29 The Final Gate** | The two rooms long enough to need it |
| PulseFire jets | **13 Shadow & Flame**, **24 The Grand Hall**, **26 Blood Moon** | All three names/signs already promise fire |
| Blades | **27 Dragon's Breath** | Its sign already tells you to dodge them |

---

## Three small consistency bugs I noticed while reading

These are one-line fixes and they're all the same kind of problem — the room's text promises something the room doesn't contain:

1. **Room 1** sign says `S — HIDE` and the room has no hide spot. It's the only room in the game without one. (Same fix as idea 1.)
2. **Room 27** sign says `BLADES SING` — no blades. **Room 13** is called *Shadow & Flame* — no flame. **Room 24** sign says `THEN IT BURNS` — no fire. **Room 26** sign says `FLAMES BELOW` — no fire.
3. **Room 5** is called *The Tower Watch* and has no towers. **Room 9** is called *Dual Towers* and has three, two of them overlapping at x=1200/1300.

Fix the text or fix the room — but right now the levels are telling players to look for things that aren't there.

---

## If you only do five

1. **Room 27** — add the blade its sign promises. (Brief already written.)
2. **Room 21** — debut climbable walls. (Whole verb, currently unused.)
3. **Room 17** — teleport plate across the first void. (Room is named for it.)
4. **Room 13** — add the fire the name promises. (Makes the name true.)
5. **Room 30** — delete the last 600 px of hazards. (Cheapest, and it fixes the ending.)

None of these need new engine work. Every mechanic above is already implemented, drawn and wired to input — they're just not placed in any level yet.

---

## Artefacts

| File | Purpose |
|---|---|
| `.audit/plain-rooms.js` | Feature-usage census across all 31 rooms + full layout dump for the 22 plain rooms |
| `.audit/design-score.js` | Design-signature scoring used to define the signature/plain split |
| `.audit/analyze-levels.js` | Editor↔shipped data comparison and width derivation check |
