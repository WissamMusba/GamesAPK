# Crimson Ronin — Level Design Review

**Date:** 2026-09-12 · Companion to `ANALYSIS.md`
**Data sources:** `editor.html` → `<script id="default-levels-data">` (31 rooms, authoring format) and `index.html` → `const LEVELS` (30 rooms, exported format). Scripts: `.audit/analyze-levels.js`, `.audit/design-score.js`.

---

## First: you're right, and here's exactly why

**I re-ran the check through the editor's own conversion path, and all 31 rooms are completable — 0 broken.**

| Data source | How width is decided | Rooms completable |
|---|---|---|
| `editor.html` data → game's `convertEditorLevel()` | **derived from content** | **31 / 31** ✅ |
| `index.html` `const LEVELS` (hardcoded) | fixed `"w":3500` | 18 / 30 ❌ |

`convertEditorLevel()` (index.html line 749) computes the world width from the level's own contents:

```js
const calcW = Math.max(2400, maxPlatX+150, maxKeyX+250, maxGuardX+150, exitX);
const levelW = el.w ? Math.max(el.w, calcW) : calcW;
```

And `syncCustomLevelsFromStorage()` (line 723) **replaces all 30 built-in rooms** with that data whenever `localStorage['crimson_ronin_editor_levels_v1']` exists — which it will, on any machine where you've used the editor. So the campaign *you* played had correctly-sized rooms and every door was reachable. **Your playthrough is real. Nothing was wrong with it.**

Here's the part that matters, though: the two datasets are **the same 31 rooms**. I normalised the formats and diffed them field by field — platforms, spikes, guards, keys, towers, bushes, plates, KI and exit all match. The only representational differences are cosmetic:

| | editor format | game format |
|---|---|---|
| Guards | `{speed:2.2, visionLen:280}` | `{type:'runner', range:280}` |
| Plates | `{targetPlatIndex:4, targetType:'alarm'}` | `{targetPlatX:1260, fx:'alarm'}` |
| Bushes | `{x,y,w,h,hideType}` | `{x,y}` |

**Same rooms. Same platforms. Same door positions. Same key positions.** The *only* thing that differs is one number per room — `w`. That single number flips 12 rooms from beatable to unbeatable:

- Room 6 SPIKE CHASM — door at 3500, walkable limit 3462. **12 px short.**
- Rooms 19, 21, 22, 24, 25, 27 — door 162–792 px past the edge.
- Rooms 20, 23, 28, 29, 30 — a required key past the edge.

So it's not that the rooms are broken. It's that the **hardcoded array is a stale copy** that lost the derived width. Your live build (editor data) is correct; the shipped array isn't.

**30-second proof:** open `index.html` in a private/incognito window (empty localStorage) and play to room 6. That's exactly what a CrazyGames reviewer with a clean profile gets. On your normal profile it'll play fine — which is the whole story.

**The fix is now even smaller than I said:** the derivation already exists in your own codebase (`convertEditorLevel`, and `serializeLevel` in the editor). Either call it at load time for the built-in array too, or just bump `w` on those 12 rooms. Nothing else needs to change.

---

## The two lists

The files don't record edit history (both datasets are identical, so there's no "changed" signal to read). What I *can* measure objectively is **which rooms carry one-off mechanics and which are built from your standard vocabulary.** So:

### List A — Signature rooms (9)
These use a mechanic that appears in only a handful of rooms — the things that make the campaign feel authored rather than generated.

| Room | Name | The one-off |
|---|---|---|
| 0 | The Path of Shadows | **3 tutorial cards** — the only room with them. The teaching room. |
| 3 | Rooftop Run | Spawn-gated **hidden platform** + **ceiling** spotlight + alarm plate |
| 6 | Spike Chasm | **Two** spawn-gated hidden platforms over a 2,450 px spike chasm + ceiling spotlight |
| 7 | Crumbling Path | 5 crumble platforms + **ceiling** spotlight + alarm |
| 8 | Silent Blade | Spawn-gated hidden platform (the "secret high bridge") + ceiling spotlight |
| 11 | Leap of Faith | **Custom spike placement** (the only room) + **two ceiling towers at different heights** with different alert times |
| 18 | Watchful Eye | 9 plates (most of any room) + ceiling spotlight |
| 20 | Master's Trial | 19 platforms / 15 spikes / 7 towers — everything at once + ceiling spotlight |
| 28 | Shadow Realm | Ceiling spotlight over a 17-platform gauntlet |

### List B — Standard-vocabulary rooms (22)
Built from the same core kit — solid / ash / crumble platforms, ground + elevated spikes, pressure plates, ground-mounted towers, three guard types. Not worse, just not one-off. **Rooms 15, 23, 29 and 30 are this vocabulary pushed to maximum scale**, and they're the real showcases (see below).

`1, 2, 4, 5, 9, 10, 12, 13, 14, 15, 16, 17, 19, 21, 22, 23, 24, 25, 26, 27, 29, 30`

If you want the true "what did I change and when" answer, it's in your own tool: **the editor's Saves modal** keeps up to 20 dated snapshots in `localStorage['crimson_ronin_save_history_v1']`. Diff two snapshots and you get the exact edit history. Export them and I'll do it for you.

---

## How you made the maps unique — the actual craft

### 1. The escalation curve is real and deliberate

| | Room 1 | Room 15 | Room 30 |
|---|---|---|---|
| Platforms | 4 | 17 | 21 |
| Spike strips | 1 | 12 | 12 |
| Pressure plates | 0 | 9 | 10 |
| Towers | 0 | 4 | **7** |
| Guards | 1 | 5 | 9 |
| KI | 6 | 13 | 14 |
| Derived width | 2,626 px | 4,350 px | **5,330 px** |

Room 15 IRON SENTINEL is the inflection point — the first room to break the ~3,500 px envelope, and the first with double-digit platforms and spikes. That's a clean "act break": rooms 1–14 teach one mechanic at a time, 15–30 combine them. And the curve is monotonic enough that room 30 genuinely feels like a finale.

### 2. Hidden platforms as *optional routes*, not just gimmicks

This is your best idea and you only used it 3 times (rooms 3, 6, 8). A pressure plate reveals a platform that didn't exist, which means:

- **Room 6** is a genuine puzzle — a 2,450 px spike floor with two plates that each materialise the *next* foothold. You can't cross it by reflex; you have to read the plates as a sequence. Sign: *"Don't look down! Jump plate-to-plate without stopping."*
- **Room 8** uses it as a **shortcut**: the hidden platform sits at y=280 above the blade corridor, and the sign openly tells you — *"Take the high secret bridge if you want to skip the blades entirely!"* That's a risk/reward choice, not a gate. This is the most player-respecting design in the game.

### 3. Elevated spikes as a second hazard layer

The early rooms only threaten you from the floor. From room 6 onward you start adding **spikes on top of platforms** (y=260–490), so a platform stops being safe ground and becomes a precision landing. The count tells the story: 0–2 strips in rooms 1–8, then 3–4, then **7–9 in rooms 18–30**. By MASTER'S TRIAL there are 7 elevated strips among 15 total — nearly half the hazard is *on* the geometry rather than under it. That's a real difficulty mechanic, not just more spikes.

### 4. Structural one-offs that deserve more credit

- **Room 23 OBSIDIAN SPIRE is a mirror.** Keys at `(1180, 230)` and `(3540, 230)` — identical height, opposite ends — and the sign reads *"THE MIRROR — ABOVE AND BELOW, ONE KEY EACH."* Five elevated spike strips sit at y=280 and one at y=260. The whole room is built around a symmetry idea. This is the most conceptually interesting room in the set.
- **Rooms 20 and 30 open with a drop-in.** Both carry the sign *"DROP FROM ABOVE TO ENTER"* — you arrive from height and the room reads top-down before it reads left-to-right. It's a nice way to make a 4,900 / 5,330 px room feel like a space instead of a corridor.
- **Room 30 CRIMSON FREEDOM is a tower gauntlet** — 7 ground towers at speed 0.90–0.95, the fastest and densest in the game, threaded between 9 guards. *"ONE LAST BREATH BEFORE DARKNESS."* It's the correct finale shape: the mechanic you've seen for 29 rooms, finally at full pressure.
- **Room 12 TRIPLE THREAT is runners-only** (4 runners, zero watchers, zero walkers) — a pure chase room. **Room 2 SHADOW WALK is walkers-only** (2 of them) — a pure stealth room. Varying the guard *composition*, not just the count, is a subtle touch that most solo devs don't bother with.
- **Room 11 LEAP OF FAITH is the verticality showcase** — y-range 200→500, the tallest in the game, with two ceiling towers mounted at *different* ceiling heights (y=−100 and y=+70) and different alert times (0.8 s vs 0.4 s), so they punish you at different rhythms.

### 5. Your hint-text voice matures across the campaign

24 of 31 rooms carry in-world text, and the register shifts cleanly:

- **Rooms 1–8 — instructor:** *"A / D — MOVE"*, *"See the blade rhythm? Wait for the swing back, then dash through."*
- **Rooms 15–27 — guide:** *"THE PATH UP IS AT THE FAR END…"*, *"ASCEND HERE. RETURN ABOVE."*
- **Rooms 20, 23, 28, 30 — atmosphere:** *"THE THRONE LANE OPENS ONLY HERE"*, *"THE MIRROR — ABOVE AND BELOW, ONE KEY EACH"*, *"NOT ALL FLAMES WARM"*, *"ONE LAST BREATH BEFORE DARKNESS."*

Dropping the hand-holding and switching to mood text in the final act is a deliberate tonal choice, and it lands — the last four rooms read like a different, more confident game than the first four.

---

## The one design gap worth closing

Rooms **1 and 2 have zero signature mechanics and zero towers** (4 and 7 platforms, 1–2 spikes, 1–2 guards). Room 1 is a teaching room, so that's justified. But rooms 3, 6 and 8 — your three best ideas — are all inside the first eight rooms, and a CrazyGames reviewer's first impression is a game where the interesting stuff is the hidden platform trick.

If you want to front-load the hook, moving a ceiling spotlight or a spawn-plate reveal into room 1–2 would show off the good stuff immediately. That's a bigger, optional change than the `w` fix — flagging it as a design idea, not a bug.

---

## Artefacts

| File | Purpose |
|---|---|
| `.audit/analyze-levels.js` | Replicates the editor→game conversion, checks both datasets for completable rooms, normalises and diffs them, prints the feature matrix |
| `.audit/design-score.js` | Design-signature scoring: bespoke-mechanic tags, variety, scale, guard composition |
| `.audit/progression.js` | The door/key vs walkable-clamp check (the 12-room finding) |
