# Crimson Ronin — 14 Trials that Force the Special Mechanics

**Date:** 2026-09-12
**Deliverable:** `NEW-TRIALS.json` — 14 complete, importable rooms (23 KB), validated offline *and* driven inside the real game.
**Scripts:** `.audit/build-trials.js` (authors + validates), `.audit/verify-trials.js` (runs them in the actual runtime), `.audit/shoot-trials.js` (renders), `.audit/shots3/*.png`.

---

## First: you were right about launch and slow-mo, and here's the actual reason

**Launch felt useless because its default power is a trap.** The formula is `vy = -launchPower * 28`, so the rise is `0.2063 × power²`:

| launchPower | rise | vs. a normal jump (140px) | vs. a double jump (262px) |
|---|---|---|---|
| **18 (the default)** | **67 px** | **worse than just jumping** | far worse |
| 26 | 140 px | equal | worse |
| 36 | 267 px | — | barely beats it |
| **40 (the editor's max)** | **330 px** | 2.4× | **26% better than a double jump** |

So at the default it genuinely is useless — it lifts you *half* as high as pressing Space. It only becomes a real mechanic at power 36–40, where it beats the double jump and unlocks ledges nothing else can reach. Every launch plate in these 14 trials uses **power 40**.

**Slow-mo felt useless because it slows you too.** `update()` does `dt *= 0.38` globally, then the player gets a 1.25× `zenBoost` (≈47% speed) and guards take an extra 0.7× on top (≈27% speed). So it's not a dodge tool — it's a **relative-speed** tool. In real time you move 1.7× faster than a chasing guard, which is the difference between life and death, because **guards are faster than you** (walker chase 315, runner 325, player 300). Slow-mo is the only way to outrun anything in this game.

I built these 14 rooms so both mechanics are load-bearing, with the arithmetic written down per room.

---

## Three engine constraints I hit while authoring (worth knowing before you build more)

**1. Editor-format levels cannot contain blades or fire jets.** `convertEditorLevel()` hardcodes them empty:

```js
blades: [],      // line 769
fires: [],       // line 861
spots: [],       // line 862
```

So blades and fires only exist in levels hand-written straight into `const LEVELS`. The editor has no tool for them either. If you want them in editor levels, either add the mapping to `convertEditorLevel` or paste them into the array by hand. **This is why your trials can't use them** — I designed around it rather than pretend otherwise.

**2. Every bush in the shipped campaign is dead.** The runtime wants the spot's `y` to equal the surface the player stands on, because the hide check is:

```js
Math.abs((player.y + player.h) - c.y) < 26      // line 3505
```

On the ground `player.y+player.h` is **610**. But all 30 shipped rooms place bushes at **y=565** — a 45px mismatch, so the check can never pass. Verified in the live game:

```
lv  spot type  spotY  playerFeet  |feet-spotY|  hideAvailable
 2    0  bush    565         610           45   NO  <-- unusable
 4    0  bush    565         610           45   NO  <-- unusable
10    0  bush    565         610           45   NO  <-- unusable
13    0  bush    565         610           45   NO  <-- unusable
```

Only `TUTORIAL_LEVEL` works, because it uses the plain-number form (`bushes:[2650]`) which falls back to `y = G`. **Hiding has never worked in the campaign.** The editor's own placement code gets this right (`by = hostPlat ? hostPlat.y : 610`) — so the data is stale, exactly like the `w` field.

All 14 trials place bushes at `y=610` (or the platform's own `y`), and the probe confirms `available=OK` in every room.

**3. Crates are unreachable content.** `convertEditorLevel` maps `el.crates`, but the editor has no crate tool, so no level has ever had one. The 5-second crate hide spot is implemented and unusable.

---

## The 14 trials

Each row is a complete room. "The force" is why the mechanic is mandatory, not optional.

### 1 — The Handhold · **CLIMB**
A 410px-tall climbable wall is the only way over a 900px spike field.
**The force:** the wall top is 410px above the ground. A double jump reaches 262px. **No jump gets you up.** The key sits on the upper route and `reqKeys: 1`, so climbing is doubly mandatory.
**Verified in-game:** climb from y=548 → **138** (reached the top and auto-mantled).

### 2 — The Long Step · **TELEPORT ×2**
An 1100px spike void, then a chained warp upward to a key ledge.
**The force:** 1100px is 4.8× the maximum jump reach (231px). Two trigger zones, both spanning the full level height (`y:0, h:610`) so they cannot be jumped over — the first warps you across the void, the second lifts you 310px to the key platform.
**Verified in-game:** zone@820 → x=2140 exactly; zone@2200 → x=2330.

### 3 — The Updraft · **LAUNCH**
A 700px spike field, crossed by launching to a ledge 310px up.
**The force:** the ledge is 310px above the ground — above the 262px double-jump ceiling, below the 330px launch ceiling. **Only a power-40 launch reaches it.**
**Bug I hit and fixed:** my first version put the plate at x=640, directly under the ledge (620–920). The player launched into the ledge's underside and stopped at 226px instead of 328px. The in-game probe caught it; the plate now sits at x=520, clear of the ledge span. Apex measured **321px** in-game, landing at x=738 on the ledge.

### 4 — The Still Moment · **SLOW-MO + GUARD-SPAWN**
One plate, on the only path, that simultaneously grants Zen Focus *and* summons a runner 70px behind you.
**The force — the arithmetic:** a runner chases at 325 vs your 300, so it closes 25px/s, and kills at 26px. From a 70px gap that's **1.76 seconds to death.** You need 5.0s to reach the exit 1500px away. **Without slow-mo you die with ~970px to go.** With it you move at 47% while it moves at 27%, so it never catches you.
**Verified in-game:** `slowMoTimer=11.9 OK  guards 0->1 OK`.

### 5 — The Hollow Floor · **SPAWN-PLATFORM ×3**
A 1300px spike field with no floor. Three plates — each sitting on the platform the *previous* plate created — build a bridge across it.
**The force:** there is no other route; the chasm is 1300px. The plates chain: ground plate → platform 1 → plate on platform 1 → platform 2 → plate on platform 2 → platform 3. You build your own level as you go.
**Verified in-game:** plate@820 → target (1200,420) `vState gone -> solid OK`.

### 6 — The Call to Arms · **GUARD-SPAWN**
A 420px ceiling forms a tunnel; the plate spans 300px of its floor and cannot be jumped over.
**The force:** the tunnel is the only path, the plate covers 300px of a 210px-tall corridor (a jump covers 231px, so you can't clear it), and triggering it summons a walker into your path ahead. You must use the bush at x=1300 and let it walk past.
**Verified in-game:** `guards 1->2 OK`, `HIDE available=OK`.

### 7 — The Watcher's Roof · **CEILING-TOWER**
A five-platform bridge over a 1400px spike field, swept by a ceiling spotlight; the key sits mid-bridge.
**The force:** the bridge is the only route and the beam sweeps its full length. Standing in the beam accumulates exposure to `alertTime` 1.2s, which raises the alarm and sends the exit guard after you. You must cross in the beam's away-phase — and the key forces you to stop *inside* the sweep.

### 8 — The Ash Ascent · **CLIMB + CEILING-TOWER**
Three ash platforms (slow ground) under a sweeping beam, then a 410px wall to climb.
**The force:** ash drops you to 45% speed — 135 units/s — while the beam tracks you, and the only exit from the ash run is a 410px climb. Slow movement plus a moving light plus a climb you can't jump.
**Verified in-game:** climb y=548 → **138**.

### 9 — The Sealed Vault · **TELEPORT (into a sealed room)**
The key sits in a chamber with **no opening**. Roof from y=0–400 across x=1300–1700, plus solid walls at x=1280–1300 and x=1700–1720 down to the ground. The player physically cannot walk in.
**The force:** the geometry is sealed, so the only entry is a warp zone on the approach. A second zone inside warps you back out.
**Verified in-game:** zone@800 → x=1450 (inside the vault).

### 10 — The Two Updrafts · **LAUNCH ×2**
Two separate 500–600px chasms, each crossed by its own launch.
**The force:** each walkway sits 310px above the ground (unreachable by jump) and the gap between walkway 1's end (x=1650) and walkway 2's start (x=1950) is **300px — 69px beyond the maximum jump reach**, so you can't chain them either. You must descend and use the second plate.
**Verified in-game:** apex 321px; offline arc confirms landings at x=918 and x=2051.

### 11 — The Long Corridor · **TELEPORT + SLOW-MO + GUARD-SPAWN**
A 1000px void, then a 1100px escape run with an ambush plate and the key placed in the open.
**The force:** same arithmetic as Trial 4 — death at 1.76s, escape needs 3.67s. The key at x=2700 forces you through the middle of the chase.
**Verified in-game:** teleport → x=2000; `slowMoTimer=11.9 OK  guards 0->1 OK`.

### 12 — The High Patrol · **CLIMB + GUARD-SPAWN**
Climb a 410px wall to a 1300px rooftop corridor over a spike field, then a plate summons a walker onto the roof.
**The force:** the roof is 370px above the ground (unreachable), it's the only route over the spikes, and the plate sits mid-roof. The walker spawns ahead facing away — you must hide in the bush at x=1000 and follow it, or be chased off a 370px drop into spikes.
**Verified in-game:** `guards 1->2 OK`; climb y=548 → **138**.

### 13 — The Three Gates · **LAUNCH → TELEPORT → CLIMB**
Three gates in sequence, one per mechanic.
**The force:** gate 1 is a 310px ledge (launch only). Gate 2 is a 900px spike void from a walkway that ends before it (teleport only). Gate 3 is a 410px wall guarding the key (climb only). No gate can be skipped.
**Verified in-game:** all three pass in one room.

### 14 — The Last Breath · **ALL FIVE**
Climb → launch → warp → ambush escape, 5800px long.
**The force:** every gate from the previous 13 rooms, in order, with the key placed inside the final chase.
**Verified in-game:** all five mechanics pass in one room; door at x=5600 reachable in a 5996px world.

---

## Verification — what was actually proven in the running game

Loaded `NEW-TRIALS.json` through the same `localStorage` key the editor uses, so `syncCustomLevelsFromStorage()` converted them exactly as it would for you:

```
NLV=14
RUNTIME ERRORS: none

[ 0] Trial 1: The Handhold      doorOK=yes   CLIMB y548->138 OK        HIDE OK
[ 1] Trial 2: The Long Step     doorOK=yes   TELEPORT ->2140 OK        HIDE OK
[ 2] Trial 3: The Updraft       doorOK=yes   LAUNCH apex=321px OK      HIDE OK
[ 3] Trial 4: The Still Moment  doorOK=yes   slowMo=11.9 OK guards 0->1 OK
[ 4] Trial 5: The Hollow Floor  doorOK=yes   SPAWN gone->solid OK      HIDE OK
[ 5] Trial 6: The Call to Arms  doorOK=yes   guards 1->2 OK            HIDE OK
[ 6] Trial 7: The Watcher's Roof doorOK=yes                           HIDE OK
[ 7] Trial 8: The Ash Ascent    doorOK=yes   CLIMB y548->138 OK        HIDE OK
[ 8] Trial 9: The Sealed Vault  doorOK=yes   TELEPORT ->1450 OK        HIDE OK
[ 9] Trial 10: The Two Updrafts doorOK=yes   LAUNCH apex=321px OK      HIDE OK
[10] Trial 11: The Long Corridor doorOK=yes  TELEPORT + slowMo + guardSpawn OK
[11] Trial 12: The High Patrol  doorOK=yes   guards 1->2, CLIMB OK      HIDE OK
[12] Trial 13: The Three Gates  doorOK=yes   TELEPORT + LAUNCH + CLIMB OK
[13] Trial 14: The Last Breath  doorOK=yes   all five OK

ALL MECHANIC CHECKS PASSED
```

The offline validator (`build-trials.js`) also checks, for all 14: ground width matches the level, exit reachable (`doorX+12 < w`), every key within the 38px pickup radius of a standing-or-jumping position, every plate has a host platform, every spawn-plate target exists and is hidden, every spike has a surface under it, bushes sit on a surface, guards/towers/zones in bounds — plus the forced-mechanic assertions (climb walls taller than 262px, launches stronger than a double jump). **All 14 pass, so none of them repeat the `w`-field bug.**

---

## How to load them

1. Open `editor.html` → **Import JSON**.
2. Paste the whole array from `NEW-TRIALS.json`.
3. It replaces the campaign with the 14 trials and writes the editor key, so `index.html` picks them up immediately.

Two things you'll notice:
- The HUD reads **"LV 1/30"** even with 14 rooms — the `/30` is hardcoded at index.html lines 4119, 4198 and 4242.
- Level select will show 14 rooms (it uses `NLV` correctly) while the menu subtitle still says "30 ROOMS".

## If you only play three

**Trial 9 (The Sealed Vault)** — the cleanest idea here. A key in a room with no door, and the only way in is to walk into a shadow. The geometry proves it: roof 1300–1700 at y=0–400, walls at 1280–1300 and 1700–1720 down to the floor. There is no other route, and you can see that from the level data alone.
**Trial 5 (The Hollow Floor)** — a bridge you assemble as you cross it, each plate standing on the platform the last one made.
**Trial 4 (The Still Moment)** — the only honest way to make slow-mo matter: give the player something 8% faster than they are and 1.76 seconds from killing them.
