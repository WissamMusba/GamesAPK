# Level 8 — applied to your real `index.html`

**Date:** 2026-09-12 · **File changed:** `index.html` line 695 only (`const LEVELS[7]`)
**Backup:** `index.backup-before-lv8.html`
**Preview:** http://127.0.0.1:8788/level8.html

---

## What changed

| | before | after |
|---|---|---|
| Blades | `y:430, h:180` — **all three jumpable** | `y:200, h:410` — **block the jump apex** |
| Blade off-window | 1.20 / 1.10 / 1.05 s | **0.22 s** (period 2.0, on 1.78) |
| Blade phases | 0 / 1.2 / 0.4 | 0 / 0.6 / 1.2 (staggered, can't chain them) |
| Hidden bridge | 1 platform, 1 plate | **3 platforms, 3 plates** |
| High route | ended at the key | continues on 3 fixed platforms to the far side |
| Ceiling tower | swept the ground (1600–1900) | **sweeps the bridge** (1200–2400 at the bridge's height) |
| Hide spots | 3 of 4 dead (`y:565`, off by 45px) | **5 of 5 usable** (`y:610` / on-platform) |
| Hide spot in spikes | 2 buried in spike fields | moved to clear ground |
| Orbs | 2 inside spike fields (unreachable) | all 11 reachable |
| Guards | 4, one on a platform | 4, one on the bridge platform |
| Width | 3500 (door 3300 — only 188px margin) | 3600 |
| Signs | 2 | 4 |

### Playtest tuning (2nd pass, after you played it)

| your note | fix | result |
|---|---|---|
| *"the lazer turns off so quickly you can never get through"* | blade open window **0.22s → 0.50s** (period 2.2, on 1.7) | walking the 50px band takes 0.167s → **3× margin**. Starting the run too late still kills you, so the timing still matters |
| *"a ki orb under the ash you can't access"* | orb `(1900,555)` sat in the sealed pocket between blade 2 and the spike field, under the ash platform → moved to **`(1650,555)`**, open sky | all 11 orbs on open ground |
| *"reduce the grace, reduce the viewing a lot, it's way too fast, put it on one platform, make the catching competitive even at 0.7"* | grace **1.2s → 0.7s**; sweep **1200px → 260px** (one platform); speed **0.6 → 0.25**; beamSpread **50 → 34** | see below |

**Why the tower couldn't catch you before:** it swept 1200px in a 3.33s cycle at 1.2s grace, so the beam crossed your platform faster than the grace could ever accumulate. It now sweeps a **260px range over 8s**, and it is **mounted off-centre (x=1300)** — that matters, because a ceiling tower directly above its target produces a narrow vertical fan that barely crosses the player. Offset, the beam sweeps diagonally **across** the platform.

Measured in-game:

```
WALK THROUGH (start of window, 0.50s open)  crossed in 0.67s  -> SURVIVED  passable
WALK THROUGH (only 0.06s left)                                -> DIED  timing matters
STAND IN BLADE                                                -> DIED  still lethal

TOWER on platform x=1540  -> CAUGHT after 0.68s      (grace is 0.7s)
TOWER on platform x=1590  -> CAUGHT after 0.68s
TOWER on platform x=1635  -> CAUGHT after 0.68s
TOWER on platform x=1445  -> CAUGHT after 3.37s      (left end is a softer spot)
TOWER off-target (ground x=900/2100/3100, bridge x=1000)  -> no alarm  confined to one platform
CROSS PLATFORM at run speed -> made it across cleanly  competitive but fair
```

So the platform is now **fully covered** with no safe sliver: stand on it and you're caught in 0.68s, but a clean run across (0.67s) just makes it. Crossing is possible; loitering is not.



The level's sign says *"See the blade rhythm? Wait for the swing back, then dash through."* You never had to. `y:430, h:180` spans 430→610, and your jump apex body is **286→348** — completely above the blade. All three could be jumped. The 1.2s open window made walking through trivial too.

Now they span **200→610**, so there is no air gap. The off-window is **0.22s**:
- walking through the blade's 50px threat zone takes **0.167s** — possible but tight
- dashing takes **0.089s** — comfortable

So the dash (Shift/F) is now the tool the sign describes, exactly as intended.

### The bridge is now a real route

Three plates in sequence raise three platforms: `[680,400]` → plate → `1040,280` → plate → `1440,240` → plate → `1840,260`. The key sits on the first one, so **the secret bridge is mandatory** for the key. Then it continues on fixed platforms to the far side.

It isn't a free pass either: the ceiling tower now sweeps the bridge at its own height (`ty:280`, x 1200–2400), a guard patrols the bridge platform, and **blade 3 cuts across the jump between the last two high platforms** — so you have to time or air-dash it up there as well.

---

## Verification (in the real game, editor key suppressed so the built-in array loads)

```
NLV=30   level 8 = SILENT BLADE  w=3600
RUNTIME ERRORS: none

  width / door             3600 / doorX=3300   door reachable: YES
  platforms                11  (hidden bridge: 3)
  blades                   3   blocking the jump apex: 3/3   OK (timing mandatory)
  spike fields / towers    5 / 1
  guards / hide spots      4 / 5   usable: 5/5   OK
  keys / orbs              1 / 11  (all reachable)
  plate 1 -> hidden plat   solid   OK (bridge raises)
  key grabbed at bridge    yes (reachable)
```

Also clean in the static audit: `audit2.js` reports **no level-8 issues** (it previously flagged floating hazards and guards in spikes), and `progression.js` confirms **beatable**. The other 29 levels were verified byte-identical before and after the edit.

### Tooling bug I fixed along the way

`audit2.js` assumed hide spots were plain numbers (the tutorial format), so it silently skipped every `{x,y}` bush in the shipped campaign. With that fixed, it reports **71 hide-spot problems campaign-wide** — i.e. the bush `y:565` bug I described earlier is present in 71 places, and the audit is now 123 issues instead of 39. Level 8 is one of the only rooms that is clean.

---

## Seeing it in your game — important

`index.html`'s built-in `LEVELS` is **only used when localStorage has no editor key**. `syncCustomLevelsFromStorage()` replaces all 30 rooms with your editor levels if `crimson_ronin_editor_levels_v1` exists — which it does in your normal browser. So opening `index.html` normally will still show your *old* level 8.

Three ways to see the new one:

1. **http://127.0.0.1:8788/level8.html** — the real built-in campaign with the editor key hidden, jumping straight into level 8. Nothing is written to storage. *(easiest)*
2. **`index.html?playLevel=7` in a private/incognito window** — empty localStorage, so the built-in array loads.
3. **Permanently:** back up then remove the editor key. In the console:
   ```js
   copy(localStorage.getItem('crimson_ronin_editor_levels_v1'))   // save it first
   localStorage.removeItem('crimson_ronin_editor_levels_v1')
   ```
   Only do this if you don't mind the game using the built-in campaign — it's how a fresh player (or a CrazyGames reviewer) sees your game.

The new level 8 is also in `LEVEL8-SHIPPED.json` if you'd rather import it into the editor — but note **the editor strips blades** (`convertEditorLevel` hardcodes `blades: []`), so the editor copy would lose the blades. The permanent fix is the one-liner in `SET2-AND-LEVEL8.md`.
