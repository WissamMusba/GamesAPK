# Crimson Ronin — Audit of `index.html` + `editor.html`

**Date:** 2026-09-12 · **Files:** `index.html` (234 KB, 4,709 lines) · `editor.html` (480 KB, 18,914 lines)
**Method:** full source read + scripted level analysis + headless-Chrome render of the real runtime.
**Supersedes:** `ANALYSIS-2026-09-04.md` (kept for history).

---

## TL;DR

**The game is currently unfinishable. 12 of the 30 rooms cannot be completed.**

This is a **regression** — the 2026-09-04 audit verified all 30 rooms were beatable. The campaign was extended since then and the level-width field was not kept in sync. A player gets stuck permanently at **SPIKE CHASM (room 6)** and, if they got past it, would hit a wall again in 11 more rooms — including the entire final act (rooms 23, 28, 29, 30). **"YOU ESCAPED" is unreachable.** This is ship-blocking.

The good news: it is a **data bug, not an engine bug**, and it's a ~15-minute fix.

---

## #1 — CATASTROPHIC: 12/30 rooms cannot be completed

### The mechanism

Three lines in `index.html` combine to make everything past `L.w` unreachable:

| Line | Code | Effect |
|---|---|---|
| 2532 | `this.x=clamp(this.x,0,L.w-this.w);` | Player is **hard-clamped** to `x ≤ L.w - 38` |
| 2827 | `camClampX(v){return L.w<=W?(L.w-W)/2:clamp(v,0,L.w-W);}` | Camera can never scroll past `L.w - W` |
| 3575 | `if(player.x+player.w>drc.x+12 && …)` | Exit door only opens on physical overlap |

So a door at `doorX` is touchable **only if `doorX < L.w - 12`**. Anything past that is not merely hard to reach — it is **outside the world**. Because the camera is clamped too, **the player never even sees the exit**.

### The damage

| Room | Name | `w` | doorX | Problem |
|---|---|---|---|---|
| 6 | SPIKE CHASM | 3500 | 3500 | Door **12 px** past reach — the cruellest failure mode |
| 19 | FORTRESS INFILTRATION | 3500 | 3880 | Door 392 px past reach, never drawn |
| 21 | RAZOR EDGE | 3500 | 3650 | Door 162 px past reach, never drawn |
| 22 | GHOST CORRIDOR | 3500 | 3860 | Door 372 px past reach, never drawn |
| 24 | THE GRAND HALL | 3500 | 3780 | Door 292 px past reach, never drawn |
| 25 | MIDNIGHT ESCAPE | 3500 | 4280 | Door 792 px past reach, never drawn |
| 27 | DRAGON'S BREATH | 3500 | 3680 | Door 192 px past reach, never drawn |
| 20 | MASTER'S TRIAL | 3500 | 3000 | Key at **x=4450** unreachable → door can never unlock (needs 3) |
| 23 | OBSIDIAN SPIRE | 3500 | 2720 | Key at **x=3540** unreachable → door can never unlock (needs 2) |
| 28 | SHADOW REALM | 3500 | 2960 | Key at **x=3680** unreachable → door can never unlock (needs 3) |
| 29 | THE FINAL GATE | 3500 | 3140 | Key at **x=4580** unreachable → door can never unlock (needs 3) |
| 30 | CRIMSON FREEDOM | 3500 | 3080 | Key at **x=4880** unreachable → door can never unlock (needs 3) |

### Root cause

`const LEVELS` (line 687) hardcodes `"w":3500` on **28 of 30** levels, but the level *content* was later extended well past that:

| Room | declared `w` | furthest platform | furthest guard |
|---|---|---|---|
| 15 IRON SENTINEL | **4400** ✅ | 4030 | 3800 |
| 18 WATCHFUL EYE | 3500 ❌ | 3970 | 3700 |
| 20 MASTER'S TRIAL | 3500 ❌ | 4650 | 4300 |
| 23 OBSIDIAN SPIRE | 3500 ❌ | 3960 | 3850 |
| 26 BLOOD MOON | 3500 ❌ | 3960 | 3850 |
| 28 SHADOW REALM | 3500 ❌ | 4240 | 3600 |
| 29 THE FINAL GATE | 3500 ❌ | 4680 | 4580 |
| 30 CRIMSON FREEDOM | 3500 ❌ | 4960 | 4880 |

Room 15 is the **only** level whose `w` was raised. This is the fingerprint of an **incomplete batch edit**: rooms 15/18/20/23/26/28/29/30 were widened to ~4,000–5,000 px, and `w` was updated on room 15 but forgotten on the rest. **11 levels** still hold dead content past the walkable edge.

### Fix

**Minimum viable patch** — raise `w` on the 12 affected rooms so the door and all keys are inside. E.g. room 25: `"w":3500` → `"w":4400`; room 30: `"w":3500` → `"w":5100`.

**Better patch (recommended)** — stop hand-maintaining `w`. `loadLevel()` already has everything it needs, and the editor's own serializer already does this correctly. Add the derivation to `loadLevel` around line 2773:

```js
L=d;curName=d.name;parTime=d.par;
// derive the world width from content instead of trusting the hand-written field
const contentMax=Math.max(
  d.doorX+96+300,
  ...d.plats.map(p=>Array.isArray(p)?p[0]+p[2]:(p.x+p.w)),
  ...(d.keys||[]).map(k=>k.x+250),
  ...(d.guards||[]).map(g=>g.maxX||g.x)
);
L.w=Math.max(d.w||0,contentMax);
```

This makes the whole class of bug impossible — you can never again place content outside the world, because the world grows to fit it. It also matches `serializeLevel()` in `editor.html` (line 18650) and `convertEditorLevel()` in `index.html` (line 749), which both already compute `calcW` this way. **The engine and the editor already agree on the right approach; only the hardcoded array disagrees.**

### Why you never saw this — and why it still matters

The editor path is **fine**, and it's why a playthrough on a machine that has used the editor never hits the wall. `convertEditorLevel()` (line 749) *derives* width from the level's own content:

```js
const calcW = Math.max(2400, maxPlatX+150, maxKeyX+250, maxGuardX+150, exitX);
const levelW = el.w ? Math.max(el.w, calcW) : calcW;
```

`syncCustomLevelsFromStorage()` (line 723) replaces all 30 built-in rooms with that data whenever `localStorage['crimson_ronin_editor_levels_v1']` exists. Verified: **31/31 editor rooms are completable; 18/30 in the hardcoded array.**

The two datasets are the **same 31 rooms** — I normalised the formats and diffed them field by field; platforms, spikes, guards, keys, towers, bushes, plates, KI and exit all match. The *only* difference is one number per room: `w`. So this is not "the rooms are broken", it's "the hardcoded array is a stale copy that lost the derived width".

Reproduce the fresh-player experience in 30 seconds: open `index.html` in a **private/incognito window** (empty localStorage) and play to room 6. That is exactly what a CrazyGames reviewer with a clean profile gets.

### Evidence

```
$ node .audit/progression.js
12 of 30 rooms cannot be completed: 6 SPIKE CHASM | 19 FORTRESS INFILTRATION |
20 MASTER'S TRIAL | 21 RAZOR EDGE | 22 GHOST CORRIDOR | 23 OBSIDIAN SPIRE |
24 THE GRAND HALL | 25 MIDNIGHT ESCAPE | 27 DRAGON'S BREATH | 28 SHADOW REALM |
29 THE FINAL GATE | 30 CRIMSON FREEDOM
```

Confirmed **inside the running game** via headless Chrome (`.audit/shoot3.js`), player parked at the far right of the walkable world:

```
25 MIDNIGHT ESCAPE   world w=3500  walkableMaxX=3462  cameraMaxX=2238
  doorX=4280  playerRightEdge=3500  gap=792px  doorTouchable=false  doorDrawnOnScreen=false
29 THE FINAL GATE    doorX=3140  doorTouchable=true   UNREACHABLE KEYS: 4580
30 CRIMSON FREEDOM   doorX=3080  doorTouchable=true   UNREACHABLE KEYS: 4880
```

Screenshot: `.audit/shots2/lv25.png` — the ronin standing at the world's right edge, no exit anywhere on screen.

---

## #2 — HIGH: the editor's playtest runs on different physics than the shipped game

`editor.html`'s in-editor playtest is the tool you'd use to validate that a jump is possible. It uses its own constants:

| Constant | `index.html` (shipped) | `editor.html` (playtest) | Drift |
|---|---|---|---|
| Gravity | 1900 | 1200 | −37% |
| First jump impulse | −730 | −620 | −15% |
| Double jump impulse | −680 | −540 | −21% |
| Terminal fall speed | 1500 | 1400 | |
| Wall-jump `vy` / `vx` | −720 / 340 | −620 / 320 | |
| Run speed | 300 | 300 | ✅ |

Consequence, computed from the actual constants:

| | Max rise (double jump) | Airtime | **Horizontal reach** |
|---|---|---|---|
| Shipped game | 261.9 px | 0.77 s | **231 px** |
| Editor playtest | 281.7 px | 1.03 s | **310 px** |

**The editor's playtest gives you 34% more horizontal jump range and 8% more height than the real game.** A gap that clears comfortably in the editor can be impossible on CrazyGames. This is very likely *how* the geometry in #1 was shipped — the levels were edited and playtested against forgiving physics.

**Fix:** one source of truth. Either have the editor load its constants from a shared block, or at minimum print a warning in the playtest UI that physics are approximate. The drift is silent today.

---

## #3 — HIGH: opening the editor silently overwrites the player's campaign

`editor.html` and `index.html` share one localStorage key:

- `editor.html:13863` — `const STORAGE_KEY = 'crimson_ronin_editor_levels_v1';`
- `index.html:723` — reads that exact key in `syncCustomLevelsFromStorage()`

And `index.html` treats that key as authoritative: at line 913 it does `LEVELS.length = 0;` then **replaces all 30 built-in rooms** with the editor's 31 entries. That sync runs on `loadLevel()` (line 2768), on window `focus` (927), and on any `storage` event (924).

Now the write side — `editor.html` calls `saveToLocalStorage()` from **48 sites**, including ones you'd never expect to be destructive:

- `13940` — inside `loadLevels()`, the *auto-heal* branch. **Merely opening the editor can write.**
- `17522` — `startPlaytest()`. **Clicking Playtest writes.**
- `18513` / `18852` — `openExportModal()` / `openCodeModal()`. **Opening a dialog writes.**

So: open the editor → click Playtest → the shipped campaign is gone for that browser profile, replaced by 31 editor levels with different names (`Tutorial: The Path of Shadows`, `Level 1: …`). No confirmation, no warning, and no in-game way back — only `localStorage.clear()` or the editor's own *Reset to Game Defaults*.

**Fix:** give the editor its own key (`crimson_ronin_editor_scratch_v1`) and require an explicit, confirmed "Publish to game" action to write the live key. Never write the live key from a read path.

**Secondary:** because `loadLevel()` calls `syncCustomLevelsFromStorage()` on every room transition, each level load re-parses a ~450 KB JSON blob and can mutate `NLV` mid-run (if the array length changes, `LEVELS[levelIndex]` can become `undefined` → crash). Call it once at boot, and on the `storage`/`focus` events only.

---

## #4 — MEDIUM: state that leaks across rooms

| State | Line | Problem |
|---|---|---|
| `heatT` | declared 952, reset **only** in `goMenu()` 3079 | Never reset in `loadLevel()` (the reset block at 2815–2816 omits it). The decay condition at 3530 requires **every** fire to be simultaneously idle — with 2+ fires at offset phases that is almost never true. So one brush past a warning fire saturates `heatT` to 1 and the orange screen tint + band at 65% height persists through all later rooms. |
| `tutTriggered` | 2833, cleared only by `resetTutorialState()` 2835 | Called **only** from `startTutorial()` (3062). Keys are `'plate_'+x` (1573) and `'plat_'+x` (2623) — **x only, no room id**. A crumble-platform tutorial on a platform at x=900 in room 3 permanently suppresses the one at x=900 in room 12. |
| `slowMoTimer` | 3450 | Not in `loadLevel()`'s reset block → "ZEN FOCUS" slow-mo carries into the next room. |
| `scorchT` | 952 | Declared, decremented at 3461, **never assigned anywhere**. Dead state. |
| `visitedLevels` | 957 | Never cleared → replaying a completed room skips its intro fly-in. |

---

## #5 — MEDIUM: the keyboard first-interaction bug is still live

This is the defect that plausibly caused the CrazyGames rejection ("doesn't let me move my character").

```js
// line 395
function audioGesture(){Snd.unlock();}

// lines 71–86 — no try/catch around the constructor
unlock(){
  if(!this.ctx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    this.ctx=new AC();          // ← can throw in a locked-down iframe / pre-gesture mobile
    ...
```

```js
// lines 3275–3298 — audio runs BEFORE the movement keys are set
window.addEventListener('keydown',e=>{
  ...
  audioGesture();               // ← throws here…
  ...
  if(c==='KeyA'||c==='ArrowLeft'){keys.left=true;}   // ← …so this never executes
```

If `new AudioContext()` throws, the whole `keydown` handler aborts and **A/D are dead while the game looks perfectly fine** — masked by the "CLICK TO TAKE CONTROL" overlay.

**Fix (2 lines):**
```js
function audioGesture(){ try{Snd.unlock();}catch(e){} }
// and inside unlock(): try{ this.ctx=new AC(); }catch(e){ return; }
```
Better still: move `audioGesture()` to the *end* of the handler so audio can never block input.

**Related, also still open:** bindings are hardcoded to `KeyA`/`KeyD`/`KeyW`/`KeyS`. On AZERTY keyboards that is ZQSD — the CrazyGames guidelines explicitly ask games to adapt to the keyboard layout. Map via `e.key` (or offer a remap screen) instead of `e.code`.

---

## #6 — MEDIUM: content-integrity sweep (39 issues)

```
$ node .audit/audit2.js
=== 39 content issues ===
```

**Guards ignore every hazard.** `Guard.update()` (2059–2279) collides with platforms only — there is no spike, blade, fire or spotlight check. Around 20 guards in the harder half of the campaign are placed on or patrol across ground-spike fields, walking calmly through traps that kill the player on contact. This breaks the core stealth fantasy. Fix: mirror the player's hazard checks at the end of `Guard.update()`.

**Hazards floating in mid-air** (they sit past the ground platform, so they can never trigger):

- Room 20 — plate at `x=4150, y=610` floats, **will never arm**
- Room 23 — spike field `3600…3710`
- Room 25 — spike fields `3480…3590`, `3800…3920`
- Room 28 — spike field `3880…3990`
- Room 29 — spike fields `3900…4030`, `4360…4470`
- Room 30 — spike fields `3800…3920`, `4480…4600`

**Guards placed illegally:** outside the level bounds (rooms 18, 20, 22, 23, 25, 26, 28, 29, 30) or spawned *inside* a ground-spike field (rooms 6, 7, 29) — the last group means a guard is standing on spikes on frame 1.

**HUD / UI**

- `drawHUD` clips the room name to a 192 px window (`ctx.rect(30,18,hudW-108,22)`, lines 4120–4124). Long names truncate mid-word (`THE GRAND HAL`), and on screens under ~700 px wide the clip is much narrower than the panel, wasting space while still cutting text.
- `'/30'` is hardcoded in three places (4119, 4198, 4242). With editor levels loaded, a 12-room campaign still claims "LV 3/30" and "30 ROOMS".
- `levelCleared()` writes `progress.stars[levelIndex]` (3176). For the tutorial `levelIndex === -1`, so `Math.max(undefined, n)` → **`NaN`**, and `saveProgress()` serialises `"-1": null` into the save blob. Harmless today, but it's corrupt data accumulating in the player's save.

**Progression**

- `firstIncomplete()` (3206) returns `0` once everything is cleared, so "PLAY" on a finished save restarts at room 1 instead of the last room.
- `die()` (3084) does `score=levelStartScore` — so dying silently rolls the HUD score back to the start of the room, discarding every orb collected in it. If intended, it deserves a "score lost" cue; if not, remove the line.

**Dead code**

- `PulseFire.update(dt)` (1626–1633) is still an empty `if` body — the fire-jet telegraph sound was clearly intended and never written. Players get a visual warning but no audio cue for a lethal hazard.
- `scorchT` — see #4.
- Background decor torii (`drawTorii`, 3634) have a very similar silhouette to the real exit gate. Combined with #1 (exits off-screen), this actively misleads.

**Fixed since the last audit — worth crediting.** The old "41 vanish plates do nothing" bug is gone. `platSolid()` (547–553) now honours `vState==='gone'` for *any* platform type, and `updateVanishPlats()` (3442–3447) respawns non-vanish platforms on a timer. A vanish plate that targets an ordinary platform now really does drop the floor and restore it. Also fixed: `startLevelRun`/`advanceLevel` no longer zero the run totals every room, so score, KI, deaths and time accumulate correctly across a run.

---

## #7 — LOW: `editor.html` structure

**It is 67% data.** Lines 1229–13856 (12,627 lines) are a `<script type="application/json" id="default-levels-data">` block — a full copy of all 31 rooms. The remaining ~5,000 lines are the actual editor.

That embedded copy **currently matches** `index.html`'s content exactly (I diffed doors, platforms and guards: 0/30 differ). But there is no single source of truth, and this is precisely the drift that produced #1: the data lives in three places (`editor.html` JSON, `index.html` `LEVELS`, `localStorage`), and only one of them gets updated when a level is edited.

Other notes:

- 106 top-level functions in one 5,000-line script, no modules, no build step. Section banner comments make it navigable, which helps a lot.
- Only **5** `console.*` calls in the whole file — runtime errors are effectively silent.
- Save history stores up to 20 full deep copies of the entire campaign in localStorage. There *is* a quota fallback that trims to 5 (14089–14095) — good defensive work.
- `init()` runs at parse time and again on `window.onload` behind a `window.getCurrentLevel` guard (18910–18911) — correct, if slightly unusual.

---

## What's good

### `index.html` — the engine is genuinely nice work

- **Procedural audio is the standout.** A Hirajōshi-scale motif system (`motifs`, 63–69) drives koto/shamisen plucks over a breathing sine pad with a filtered wind bed. Nodes are correctly disconnected on `onended`, the noise buffer is generated once and cached, mute is a gain ramp not a hard cut, and the SDK mute listener is wired. No leaks, no clicks. This is better than most commercial HTML5 games.
- **Visual craft.** Parallax ridge silhouettes, torii/pagoda/lantern decor, drifting embers, radial vignette, additive-blend flame and beam gradients, squash-and-stretch on the player, screen shake, death particle bursts. It looks like a game, not a prototype.
- **CrazyGames SDK v3 integration is correct**: `loadingStart/Stop`, `gameplayStart/Stop` driven off state transitions (4687–4690), midgame + rewarded ads with proper pause/mute handling and error callbacks, cloud save with a genuinely thoughtful **local-wins merge** (459–467), `happytime` on a perfect clear, `setGameContext`.
- **It never hard-crashes.** The entire frame loop is wrapped in `try/catch` (4686–4703), so a bad frame can't kill the game.
- **Focus handling is deliberate**: the `awaitingFocus` overlay, auto-focus on boot, and a `blur` handler that clears stuck keys (3322) so you don't run off a ledge when you alt-tab.
- **Adaptive quality**: `lowQuality` disables shadows and particles on weak hardware (30–31).
- Rich, readable level model with a real feature set — vanish platforms, pressure plates with spawn/vanish/teleport/ambush/launch/slow-mo actions, watchtowers with exposure meters, pulse fire jets, blades, spotlights, wall-climbing, dash, takedowns, hide spots with time limits.

### `editor.html` — an impressive tool

- 17 placement tools, 40-deep undo/redo, camera pan/zoom, resize handles, hit-testing, grid snap, snap-entity-to-platform, inspector panel.
- **Save-history versioning** with per-campaign and per-room restore, plus auto-generated stats (platforms/ash/crumble/guards/spikes/keys/KI/cards) so you can see what changed.
- **Live playtest** inside the editor — no round-trip to the game.
- **Code export** that emits paste-ready `const LEVELS = [...]` / `TUTORIAL_LEVEL = {...}`, plus a Git commit-command helper. Nice touch.
- Defensive throughout: `JSON.parse` in `try/catch`, storage-quota trimming, auto-heal for a corrupted room, import validation.
- `serializeLevel()` (18650) **correctly derives level width from content** — the tool knows the right answer. Only the hand-maintained array in `index.html` doesn't.

---

## Recommended order of work

| # | Task | Why | Effort |
|---|---|---|---|
| 1 | Fix `w` on the 12 broken rooms — or better, derive `L.w` in `loadLevel` | Makes the game finishable. Everything else is secondary. | ~15 min |
| 2 | Make `.audit/progression.js` part of your loop — run it after any level edit | Catches #1's whole class of bug before it ships | 0 (already written) |
| 3 | Separate localStorage key for the editor + explicit confirmed "Publish" | Stops the editor destroying player campaigns | ~30 min |
| 4 | Unify physics constants between editor and game | The playtest currently lies to you | ~1 h |
| 5 | Reset `heatT` / `tutTriggered` / `slowMoTimer` in `loadLevel` | Removes visible cross-room bleed | ~20 min |
| 6 | `try/catch` around `audioGesture()` + AZERTY key mapping | Fixes the reported "can't move" bug | ~20 min |
| 7 | Hazard collision for guards | Restores the stealth fantasy | ~1 h |

---

## Audit artefacts (all rerunnable)

| File | Purpose |
|---|---|
| `.audit/progression.js` | **New.** Door + key reachability vs the walkable clamp. The headline check. |
| `.audit/verify.js` | **New.** Per-room `w` / `doorX` / content-past-edge table. |
| `.audit/shoot3.js` | **New.** Headless-Chrome harness that poses the player at the world edge and reports from inside the running game. |
| `.audit/harness3.html` | Generated harness (index.html + injected probe). |
| `.audit/shots2/lv06.png … lv30.png` | Renders of the 9 affected rooms. |
| `.audit/audit.js` | Reachability BFS over real jump physics. |
| `.audit/audit2.js` | Content integrity (floating hazards, guards in spikes, par sanity). |
| `.audit/shoot.js`, `.audit/shoot2.js` | Menu / win / cleared / settings renderers. |

Run with:
```bash
NODE=C:/Users/wissa/.workbuddy-ai/binaries/node/versions/22.22.2-1/node.exe
$NODE .audit/progression.js && $NODE .audit/verify.js && $NODE .audit/audit.js && $NODE .audit/audit2.js
$NODE .audit/shoot3.js
```
