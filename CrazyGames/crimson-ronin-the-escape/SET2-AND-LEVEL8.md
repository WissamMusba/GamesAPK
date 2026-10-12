# Set 2 + Level 8 Redesign

**Date:** 2026-09-12
**Files:** `SET2.json` (3 new levels, editor import) · `LEVEL8-SHIPPED.json` (Level 8, paste into `const LEVELS[7]`) · `play2.html` (preview)
**Scripts:** `.audit/build-set2.js` (authors + validates), `.audit/verify-set2.js` (drives them in-game), `.audit/shoot-set2.js` → `.audit/shots4/*.png`

---

## Level 8: why it was easy, and what it is now

### The diagnosis

Your sign says **"See the blade rhythm? Wait for the swing back, then dash through."** But you never had to. All three blades were `y:430, h:180` — spanning 430→610. Your jump apex body is **286→348**, entirely above the blade:

```
blade x=950  spans y 430..610  player apex body 286..348  -> CAN JUMP OVER
blade x=1750 spans y 430..610  player apex body 286..348  -> CAN JUMP OVER
blade x=2550 spans y 430..610  player apex body 286..348  -> CAN JUMP OVER
```

On top of that the duty cycle was ~50% (`on 1/period 2.2` → a **1.2s** open window), so even walking through was forgiving. The "high secret bridge" was also optional — it only gated the single key, and the ground route ran the whole level.

### The redesign

| | before | after |
|---|---|---|
| Blade span | `y:430, h:180` — **jumpable** | `y:200, h:410` — **blocks the apex, timing mandatory** |
| Blade off-window | 1.20 / 1.10 / 1.05 s | **0.55 s** (period 2.0, on 1.45) |
| Bridge | 1 plate → 1 platform | **5 plates → 5 platforms** |
| Spikes | 5 small patches | **one 1400px field** under the whole bridge |
| Keys | 1 | **2** (`reqKeys: 2`) |
| Ceiling tower | sweeps 1600–1900 | sweeps **1400–2400**, the whole bridge |
| Hide spots | 4 at `y:565` (**all dead**) | 3 at `y:610` (**working**) |
| Width | 3500 (door 3300, only 188px margin) | 3600 |

**No easy paths left.** The bridge is the only route (the spike field is 1400px, 6× your jump reach). `P1` sits *before* blade 1, so you trigger the bridge and *then* have to time the blade to get onto it. Blade 2 cuts straight through bridge platform 3, so you must stand 50px from a live blade to work plate 4. Blade 3 guards the ground approach to the gate.

**Verified in the running game:** `BLADES 3/3 block the jump apex OK (timing mandatory)`.

---

## The three new levels

All three do what you asked: **a plate raises a hidden platform to cross a chasm**, **teleports that are aggressive and unpredictable**, and **maps designed to be walked backwards**.

### 2A — The Mirror Path · *the exit is behind you*

You spawn at x=80 and the exit gate is at **x=180** — eight paces behind you, and locked. The key is at the far right, x=3300. You spend the entire level running *away* from the door.

- Six plates raise a six-platform bridge across two 800px chasms.
- At the far right, a teleport throws you **back and up** onto a second tier at y=170.
- The return trip runs that tier **right-to-left**, the opposite direction, with its own elevated spikes and two guards.
- Two more teleports: one throws you back to the start of the tier, one drops you onto the bridge below.

**Why the teleport is forced:** the high tier sits **270px above the bridge** — 8px beyond your 262px double-jump ceiling. There is no jump to it. The only access is the door at x=3450, and the only way *back* across the chasms is the same door. Verified: `TIER GAP 270px OK (unjumpable)`.

### 2B — The Return Road · *every reversal must be repaid*

**Seven plates raise one bridge** across a single 2200px chasm — the longest crossing in the game. Two one-shot teleports sit in the middle of that bridge, both throwing you back to the ground at the start.

The key is on the **far side**. So the first time you cross, a door at x=1900 dumps you back at x=620 with nothing to show for it. You cross again — a second door at x=2600 does it again. Only on the third crossing do you reach the key. Verified: both doors land exactly at x=620.

### 2C — The Three Doors · *three doors, none of them labelled*

The far side of the chasm has three **identical, unlabelled** teleport zones, and they do three different things:

| door | position | destination |
|---|---|---|
| first one you meet | x=3050 | **forward** to x=3400 |
| next | x=3250 | **up** onto the high tier (reusable) |
| last | x=3520 | **all the way back** to x=300 — past the locked exit |

So the natural first play is: forward → back → *the entire level again* → and only then do you find the door that actually helps. The exit is behind you again (x=180), the key is on the high tier at x=2300, and the tier is 310px above the ground.

The "up" door is reusable (`oneShot: false`) so you can never softlock yourself by falling off the tier.

---

## Verification

**Offline** (`build-set2.js`) — all 4 pass: ground width matches, exit reachable, keys within pickup radius, every plate has a host platform, every spawn target exists and is hidden, every spike has a surface, bushes sit on a surface, guards not standing on hidden platforms, no guard patrol crossing a teleport door, teleport destinations on solid ground, and the tier-above-bridge gap exceeding the jump ceiling.

**In the running game** (`verify-set2.js`, loaded through the editor's own localStorage path):

```
NLV=4  -> Set 2A: The Mirror Path | Set 2B: The Return Road | Set 2C: The Three Doors | Silent Blade
RUNTIME ERRORS: none

[0] Mirror Path   w=3750 doorX=180  doorOK=yes  hidden=6 zones=3
      TIER GAP 270px OK (unjumpable)
      PLATE1 gone -> solid OK
      TELEPORT1 ->3180 OK   TELEPORT2 ->3180 OK   TELEPORT3 ->900 OK
      HIDE OK
[1] Return Road   w=4096 doorX=3700 doorOK=yes  hidden=7 zones=2
      TELEPORT1 ->620 OK    TELEPORT2 ->620 OK    HIDE OK
[2] Three Doors   w=3750 doorX=180  doorOK=yes  hidden=6 zones=3
      TELEPORT1 ->3400 OK   TELEPORT2 ->3180 OK   TELEPORT3 ->300 OK
      HIDE OK
[3] Silent Blade  w=3750 doorX=3300 doorOK=yes  hidden=5 blades=3
      BLADES 3/3 block the jump apex OK (timing mandatory)

ALL CHECKS PASSED
```

### The bug this caught

Set 2C's first teleport door initially **failed** — the player never moved. Calling the zone's own `update()` directly teleported them correctly to 3400, so the zone was fine. Going through the real `update()` the player was **dead on frame 1**:

> I had placed a guard patrolling **3000–3300** — directly on top of the teleport door at 3050–3140. It killed you the instant you arrived, before the zone loop ever ran.

That's a genuine level-design bug, and it's a class I hadn't been checking for, so I added two new automated checks:

- **guard patrol crosses a trigger zone** → the player dies at the door
- **teleport destination lands inside a guard patrol** → instant death on arrival

Re-running caught **one more real instance** (Set 2B's forward door landing on a walker's patrol) and **two false positives** where the destination was on a different tier — so the check is now tier-aware. Fixed all three by repositioning guards.

---

## One engine constraint you need to know

**Editor levels cannot contain blades.** `convertEditorLevel()` hardcodes them:

```js
blades: [],      // index.html line 769
fires: [],       // line 861
spots: [],       // line 862
```

So Level 8 is delivered **twice**:

- `SET2.json` — the editor-import format, so you can open and tweak the layout. Blades will be **missing** here.
- `LEVEL8-SHIPPED.json` — the shipped `LEVELS` format **with** the blades. Paste this over `LEVELS[7]` in `index.html` and the blades survive.

`play2.html` patches them back in at runtime so the preview shows the real thing. **The permanent fix** is one line in `convertEditorLevel`:

```js
blades: (el.blades || []).map(b => ({ x: b.x, y: b.y, h: b.h, period: b.period, on: b.on, phase: b.phase || 0 })),
```

---

## How to play it

Server is running: **http://127.0.0.1:8788/play2.html** — opens on the menu with the 3 new levels + the redesigned Silent Blade. `?playLevel=N` (0-based) jumps straight in.

Suggested order:
1. **`?playLevel=0`** (Mirror Path) — turn around at the start. That locked gate behind you is the whole level.
2. **`?playLevel=3`** (Silent Blade) — try to jump a blade. You can't any more. Time it.
3. **`?playLevel=1`** (Return Road) — expect to cross the bridge three times.
4. **`?playLevel=2`** (Three Doors) — don't trust the doors.

To import into your editor: **Import JSON** → paste `SET2.json`.
