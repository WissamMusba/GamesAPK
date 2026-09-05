# Crimson Ronin — Analysis

Tested on Windows + headless Chrome. Static audit + headless render of menu, levels 1/14/19/20/30, win screen, cleared screen. **All 30 rooms are beatable** (BFS over real jump physics). No JS runtime errors. But several issues — one catastrophic.

---

## #1 (my best guess for "the very very big problem") — The entire score / progression meta is broken

`startLevelRun()` at **line 2211** zeroes `score`, `deaths`, `totalOrbs`, `totalTime`, `newBest`, `deathsSinceAd` every time it runs — including when **called from `advanceLevel()` at line 2304**. So the moment you clear a room and the game advances to the next one, your score, deaths, orbs and time all reset to 0. Consequences:

- The HUD score reads `000000` at the start of every level. (Visible in every screenshot — top-left, 6 zeros, every time.)
- The end-of-run "YOU ESCAPED" screen shows the **last room's** score / KI / deaths / time, not the run total. Screenshot proof in `.audit/shots/win.png`: "SCORE 001240 / KI 14 / DEATHS 7 / TIME 6:52" — that's one level, not thirty.
- "BEST SCORE" on the main menu is just whatever the most recent last-level score was. Meaningless.
- "Deaths" you see in the HUD also resets each level, so it never reflects the run.

**Fix sketch:** split the per-run reset (only when a fresh run starts from menu / boot) from the per-level load. `advanceLevel()` should call `loadLevel()` + the brief/ready setup but **not** the run-total resets. Minimal patch:

```js
function advanceLevel(){
  if(levelIndex+1<NLV){
    deathsSinceAd=0;
    loadLevel(levelIndex+1);
    if(!visitedLevels.has(levelIndex+1)){visitedLevels.add(levelIndex+1);startBrief();}
    else startReady(0.35);
  } else {
    state='win';
    newBest=score>best;
    if(newBest){best=Math.floor(score);try{localStorage.setItem('crimsonEscapeBest',String(best));}catch(e){}}
    CG.saveCloud();CG.happytime();Snd.perfect();
  }
}
```

`levelStartScore` is already set inside `loadLevel` from the current `score`, so per-level orb accumulation (`score - levelStartScore`) continues to work. Stars / par-time bookkeeping is per-level and unaffected.

---

## #2 (also very visible) — Guards ignore every hazard

`Guard.update()` only collides with platforms; it has **no** spike/blade/fire/spotlight checks. ~20 guards across the harder half of the game are placed on or patrol across ground-spike fields, so they walk calmly through traps that instantly kill the player on contact. The wolves-and-spikes rooms, the Bone Bridge, the Last Ember all have this. Breaks the core stealth fantasy.

A handful of "runner" / "watcher" guards also spawn *inside* a spike zone, which means the very first frame of a level you see a guard perched on spikes.

Fix: add a hazard check at the bottom of `Guard.update()` mirroring the player's checks (spike groups, trap spikes, fires, blades, spotlights).

---

## #3 — `heatT` (the orange "scorch" overlay) never resets, saturates, and persists across levels

`heatT` is declared on line 1001, *never* reset in `loadLevel`, *never* reset on death/respawn, and only decays when **every** fire is simultaneously inactive (which in levels 21–30 with 4–7 fires at offset phases basically never happens — `every(!fire)&&(!warning)` is true ~3% of the time). Result: as soon as the player gets within 120px of one warning fire in level 21, `heatT` saturates to 1 and stays there permanently — tinting the screen orange-red and drawing the orange band at 65% height — through levels 22–30 and even back at the menu until the tab is reloaded.

Fix: add `heatT=0;` to the `loadLevel()` reset block, and widen the decay condition (decay whenever *no* fire is in warning or active, not just when none is).

---

## #4 — 41 of 48 "vanish" pressure plates do nothing

`Plate.fire()` for `fx:'vanish'` searches the **nearest platform to the right** within 420 px and sets `target.vState='gone'`. But `drawPlatforms` and `platSolid()` only honour that for platforms whose `t === 'vanish'`. In 21 levels, the plate fires at a *normal* platform → silent no-op (no sound, no dust, nothing). The player sees the plate arm, the player expects the floor to crumble, nothing happens, player walks on.

Specific dead plates: every `vanish` plate in levels 3, 5, 7, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 — 41 plates across 21 rooms that are advertised by their presence and animation but do absolutely nothing.

Fix: either make `Plate.fire()` filter targets to `t==='vanish'` only and spawn a trap spike when no valid target exists, or change the data to point each `vanish` plate at an actual vanish-type platform.

---

## #5 — HUD level-name overflow on long names

The top-left HUD plate is 238 px wide. `drawHUD` line 3100 writes `LEVEL N/30 — <name>` left-aligned at x=32 and `DEATHS N` right-aligned ending at x=242. For names longer than ~12 characters (`THE SUNKEN VAULT`, `THE NIGHT PROCESSION`, `THE THRONE ESCAPE`, `THE LAST EMBER`, etc.) the two collide. Visible in `.audit/shots/lv14.png`, `lv19.png`, `lv20.png`, `lv30.png` — text literally overlaps into a smear like `THE LAST EMBER. 0`.

Fix: shorten the label (`LV N · NAME`), truncate, or widen the HUD plate and push DEATHS / KI columns right.

---

## #6 — Misc content / dead-code findings

- A fire jet and a plate in **THE LANTERN MAZE** (26) are both declared at `y=480` but there's no platform there — they're floating in the air and the plate can never arm.
- The fire jet in **THE ASH FORGE** (21) at `x=980, y=340` sits in a gap between two platforms — the nozzle draws floating.
- **THE BONE BRIDGE** (25) `bush` at x=1120 is fully buried in a 720-px ground spike field. Unreachable hide spot.
- Bush / crate hide spots in levels 6, 7, 8, 16, 18, 19, 20, 21, 29, 30 partially overlap ground spikes.
- Two doors sit on top of ground spikes: **SHOGUNS GATE** door at x=3140 (tight 82 px safe window) and **LAST EMBER** door at x=3080 (tight 42 px safe window).
- `PulseFire.update(dt)` has an empty `if`-body where a warning telegraph sound was clearly intended but never implemented (lines 1271–1278).
- `scorchT` is declared and decremented once but never assigned — dead state.
- `firstIncomplete()` returns 0 after the player has cleared everything, so a second run starts at room 1 instead of where you left off.
- The title screen (PLAY / LEVELS / SETTINGS) is never shown on first load — the game boots directly into `startLevelRun(firstIncomplete())`. Fine for a portal embed but means there is no discoverable menu for a player who opens the file directly.

---

## What's good

- All 30 rooms are reachable, all keys and doors are collectable (verified by physics BFS).
- No runtime errors. No syntax issues. The keyboard-focus / iframe-prompt fix works.
- The CrazyGames SDK v3 integration (gameplayStart/Stop, midgame + rewarded ads, cloud save, happytime, mute listener) is wired correctly.
- Audio system is robust (proper disconnect on `osc.onended`, buffer caching for the noise source, no leaks).
- Save / load: localStorage + cloud, merge logic on load (local settings win, cloud stars fill gaps). Good.

---

## Files

- `.audit/audit.js` — reachability BFS (jump physics, surface segmentation, spike carving)
- `.audit/audit2.js` — content integrity (floating spikes/plates/fires, guards in spikes, hide spots on spikes, door on spikes, par sanity, key reachability)
- `.audit/shoot.js`, `.audit/shoot2.js` — headless Chrome screenshot harnesses
- `.audit/shots/` — rendered frames: `lv01.png` `lv14.png` `lv19.png` `lv20.png` `lv30.png` `menu.png` `win.png` `cleared.png` `settings.png`