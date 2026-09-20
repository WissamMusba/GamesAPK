# TAG! — Trial P2 Bot: Full Code Report

File: `CrazyGames/tag/index.html` (single-file game, bot lives inside the main `<script>`)
Scope: offline 2-player only, slot 1 (P2). Online netplay untouched.
Status: committed, playtested, "very good" — route-choice smarts are the remaining work.
Syntax: `node --check` passes on the extracted script.

How to play it: menu defaults to 2P with P2 shown as `🤖 BOT`. Press `B` in the menu to
toggle bot on/off (`B` = 2-human mode). You are P1 (WASD), bot is P2. Bot chases when IT,
flees when you are IT.

---

## 1. Architecture: the bot fakes a gamepad

The engine never knew bots existed. Every player, human or not, is stepped by
`physUpdate(p, dt, allow)` (`tag/index.html:1374` area), which reads an input struct
`{dir, jumpEdge, jumpHeld, downHeld}` from `inputFor(p)`. The bot plugs in at exactly
one joint:

- `tag/index.html:1692-1693` — `function inputFor(p){ if(isBotSlot(p))return botInputFor(p); ...`
  Why here: every physics feature (variable jump height via `HOLD_LIFT_T`, coyote time,
  wall-jumps capped at 2, double jump flag, pink drop-through, boost/speed pads) keeps
  working for free because the bot speaks the same input language as a keyboard.
  Nothing in `physUpdate` was modified (deliberate: human parkour must never regress).

Supporting wiring:

- `tag/index.html:997` — `menu.botOn:true` added to the menu state object. Why a flag:
  local 2-human mode must survive; the flag decides whether slot 1 is a robot.
- `tag/index.html:1134` — `if(anyPressed(['KeyB'])){menu.botOn=!menu.botOn;...}` in
  `updateMenu`. Why `B`: it was free in the menu (in-game `B` cycled theme; the menu
  footer previously advertised `B THEME` only for the game screen).
- `tag/index.html:1224` — `try{botReset();}catch(e){}` inside `startMatch`. Why: per-slot
  bot memory (locks, bans, stuck history) must not leak between matches.
- `tag/index.html:3280` — slot-1 card label becomes `🤖 BOT` when
  `menu.botOn && i===1 && offline`. Why: the player must see what P2 is.
- `tag/index.html:3399-3400` — footer hints rewritten to document `B` as the bot toggle.

Gate:

- `tag/index.html:1346-1354` — `isBotSlot(p)` returns true only if: offline
  (`NET.role===null`), `menu.botOn`, exactly 2 players in `match`, exactly 2 active
  slots, and `p.slot===1`. Why so strict: 3-4P human games and all netplay must never
  get a hijacked slot. Consequence (accepted limitation): no bot in 3-4P or online.

---

## 2. State and cadence

- `tag/index.html:1344` — `const BOT={st:{},think:0.09}`. `think` = 0.09s decision cadence.
  Why not every frame: humans react at ~0.1s; deciding every frame jitters (this exact
  0.09s tick caused several zigzag bugs below). Between thinks the cached `S.dir`
  persists; jump edges are one-frame pulses.
- `tag/index.html:1394` — blackboard init per slot: `dir, jumpQ, jumpHoldT, decideT,
  px/py (stuck tracking), stuckT, unstuckT/unstuckDir, bonks/bonkT, airT, dropHold,
  descLockT/descDir (descent commitment), airT2 (airborne time), exitX/hasExit/exitLockT/
  exitDir/exitGp (climb commitment), climbPlat/climbOut/climbT (corner anti-clip),
  bannedSide/banT/banTierY (side blacklist)`. Why one object: all anti-oscillation
  machinery is "remember what I committed to."
- `tag/index.html:1345` — `botReset(){BOT.st={};}` wipes it per match.

---

## 3. Sensors (the bot's eyes)

- `tag/index.html:1355-1366` — `botSolidBetween(ax,ay,bx,by,ignorePlat)`: samples 7
  points along a segment, returns the first non-pink solid hit (pink `drop` is
  jump-through, so it never counts as a wall). `ignorePlat` skips one platform.
  Why it exists: every "is something between me and X?" question funnels through here
  (ceiling check, exit-lane check, headroom check).
- `tag/index.html:1368+` — `botGroundAhead(p,dir)`: probes 80px ahead for floor within
  `[feet-42, feet+24]`. Why: gap detection (jump across instead of falling in).
- `tag/index.html:1382+` — `botWallAhead(p,dir)`: probes a box ahead, ignoring pink.
  Why: jump before contact, and (in air) refuse inward turns that would clip a lip.

---

## 4. Target selection (`tag/index.html:1397-1409`)

Nearest-runner chase when the bot is IT, else flee the IT player (`match.players[match.it]`).
`dx,dy` are center deltas; `aboveBy = cy-ty` (>0 = target above) and `belowGap`
drive every vertical decision. Why nearest-runner: correct for future 3-4P; today it's 1v1.

---

## 5. Blacklist timer (`tag/index.html:1413-1417`)

Decrements `banT` every frame; clears `bannedSide` on expiry **or** on real elevation
gain (`p.y < banTierY-45`, y grows downward). Why both exits: timer alone would hold a
grudge after success; elevation-gain alone would stick forever if the bot never climbs.

---

## 6. Stuck detection + unstuck (`tag/index.html:1418-1433`)

Moved <14px in 0.45s while `far` (>90px from target) → `unstuckT=0.7` driving the
opposite direction with jump spam every 0.28s (with `jumpHoldT` so theSpam jumps get
full height). Why it exists: the last-resort net under every other system; seam
straddles, V-wedges, dead-end shafts. Why 0.45s: shorter fires on normal landings;
longer leaves the bot visibly frozen.

---

## 7. Chase steering (`tag/index.html:1438-1460`)

- `tag/index.html:1446-1447` — inside 28px/36px box: track `dx` directly (tag-finisher,
  no momentum lag). Why: tag boxes are 56px inclusive (`tagBox` +5px margin), so inside
  ~28px the tag can connect any frame; holding stale momentum here runs through tags.
- `tag/index.html:1450-1451` — 28-45px band with `|vx|>60`: hold `sign(p.vx)`
  (sprint momentum). Why: kills the start-of-match zigzag where `dx` hovering near
  zero flipped `want` every 0.09s think and acceleration never built (turning uses
  `acc+dec*0.9`, so flipping = permanent slowdown). Verified in the 1:58 Symmetric
  Stadium and 0:31 Vipers Nest clips (both spawn grounded, detour inactive).
- `tag/index.html:1453` — else `|dx|>12 ? sign(dx) : hold last dir`.
- `tag/index.html:1456-1460` — flee unchanged (`>24px` flip + wall nudges). Known
  leftover: flee has the same twitch when IT is close; scoped to next round.
- Deleted: the old `Math.random()<0.02` jitter hop. Why removed: it fired only while
  running free (walls/gaps/stalls are caught by the three branches above it, wedges by
  stuckT), so all it did was interrupt sprint acceleration (~0.06s to top speed).

---

## 8. Exit lock + wall bail (`tag/index.html:1461-1475`)

`exitLockT` decrements per think. Perimeter pin while locked (`x<=WALL+10` etc.)
flips the lock to the opposite side for 0.3s. Why: a locked exit can point into the
arena wall; without bail the bot rubs the wall until stuckT fires (0.45s of visible
stupidity).

---

## 9. Ceiling router (`tag/index.html:1476-1528`)

Active when `aboveBy>50 && |dx|<380`. Why these numbers: 50px ≈ one body (46px) —
below that it's the same tier, chase normally. 380px cap so cross-map sprints don't
detour around incidental slabs (just run).

- `tag/index.html:1475` — `blocked=botSolidBetween(cx,p.y-10,tx,ty,p.gp)`. Starts at
  head height, ignores the standing slab. Why: slope AABBs self-hit otherwise (Vipers
  Nest froze because the ray read its own slope as a ceiling).
- Floor allowed (`p.grounded && gp`, wall or not). Why: `SOLIDS[1]` floor has
  `wall:1`; the old `gp && !gp.wall` gate skipped detours exactly where floor spawns
  need them.
- `tag/index.html:1483-1486` — juke invalidation: locked but
  `sign(dx) != sign(exitX-cx) && |dx|>120` → drop the lock. Why: permanent locks die
  to jukes (player crosses the map, bot runs away locked). 120px so small strafes
  don't cancel.
- `tag/index.html:1488-1501` — pick: clearings past the **ceiling** (`blocked.x±45`,
  bot-relative = stable under strafing), wall override if the ceiling touches a
  perimeter, verify open air above the pick else take the other side, blacklist
  override (`bannedSide -1 → right, +1 → left`). Why ceiling, not floor edges: the
  floor edge may sit deep under the slab; routing around the actual obstruction is
  shorter and can't pick an exit still under the ceiling.
- `tag/index.html:1503-1514` — lane ceiling: nearest non-drop, non-standing slab above
  `exitX`. Why not `blocked` (the diagonal hit): it can be an unrelated strip at the
  wrong height, which mistimed the outward hold (Bug 3, previous round).
- Lock set 0.8s bound to `exitGp`. Why 0.8s (up from 0.4s): 0.4s ≈ 200px at run speed,
  expiring mid-crossing on wide slabs and re-flipping; 0.8s ≈ 400px. Re-pick only on
  expiry/platform-change/juke/ban.
- `tag/index.html:1517-1520` + `1529-1530` — clearers when airborne/level/below.
  Why: stale climb locks overwrote descent steering (the 0.35s "grounded freeze" bug).

---

## 10. Grounded jumps (`tag/index.html:1530-1546`)

Resets `airT2/climbT`. Priority: positional edge launch → open-air hop → wall →
stall → gap. `jumpHoldT=0.12-0.14` on grounded jumps (full 270px hold height, not
233px taps — the engine's `HOLD_LIFT_T` gravity cut only fires while held).

- Edge launch (`1537-1541`): `aboveBy>50`, within 42px of any standing-slab edge
  (floor included), **or** within 48px of locked `exitX`. Purely positional, no
  velocity gate. Why the gate died: `|vx|>100` suppressed jumps after turns/decel at
  the exact frame the leap was due → walk-off freefalls.
- Open hop (`1550`): `aboveBy>70, |dx|<260, !headBlocked`. The normal "jump to the
  guy above" when air is clear.

---

## 11. Descent routing (`tag/index.html:1547-1598`)

`belowGap>60` + not same-tier (`<60 && |dx|<200` = side-by-side, stay).

- Committed lane held (`1554-1559`): while `descLockT` runs, direction is frozen and
  only pink state updates. Why: the pink/brown seam zigzag (screenshot 1) — standing
  on the joint flipped `down` vs walk-off every think. Locking fixed it; pink drops
  now also take a 0.25s lock (`1560-1564`) so seams can't flip at all.
- Lane scoring (`1566-1590`): three vertical rays (center, ±150px), cost =
  `hits*200 + distance`, walk off toward the cheapest. Why: open flank beats
  stair-stepping through tiers.
- `1596-1598`: `wantDown` out; `jumpQ` killed while committed to walking off
  (hop would spoil a clean step-off).

---

## 12. Airborne (`tag/index.html:1591-1665`)

Order is load-bearing: outward hold → wall gate → double → suppression → steering.

- `tag/index.html:1605-1612` — outward hold: rising (`vy<0`) with feet still below
  the lane-ceiling top → hold `climbOut`. Why: turning inward early cuts the arc into
  the slab corner (the clip bug). Releases on feet-clear or timer.
- `tag/index.html:1614-1621` — wall gate: kick only off outer walls, or interior when
  climbing AND `belowGapAir<=60`. Why: brushing a slab flank while falling past used
  to auto-bounce the bot backward off its line.
- `tag/index.html:1622-1634` — double: `aboveBy>50`, `vy in (-220,180)`,
  46px vertical headroom (ignores standing slab), `airT2>0.10` (no same-frame
  double-tap). Inward turn kept behind a `botWallAhead` probe. Why these numbers:
  `-220` catches late rise (not `-350`, which burns height early); `+180` covers
  early fall; 46px checks only immediate headroom so a tier two shelves up can't veto.
- `tag/index.html:1635` — panic suppression: still above target → no jump, let
  gravity work (falling fast + jumping = stalled descent).
- `tag/index.html:1640-1660` — falling steer: nearest slab below within
  `[feet+15, ty+60]` and ±40px laterally, steer to player clamped 26px inside it
  (46px body stays on), 36 engage / 14 release hysteresis; open shaft (`|dx|<60`) =
  fall straight. Why `+15`: the slab just walked off must not win "nearest" and suck
  the bot back (hover loop). Why clamp: player-x may be over a gap; slab-center may
  be far from the player — clamped point is the closest safe footing.
- `tag/index.html:1661-1664` — rising steer: no `climbPlat`, `|dx|>20` → `sign(dx)`.
  The curl-in after the hold releases.

---

## 13. Bonk → blacklist (`tag/index.html:1667-1684`)

Rise killed (`wasVy<-350 → vy>=0`) + head box overlapping solid, twice in 1s → ban
the tried side (`exitDir` first, floor-edge fallback) for 1.5s and force the flank
with a 0.5s unstuck. Why bonks, not stuck: stuck fires on wall pins and jukes too;
a bonk proves the lane was wrong. Why the elevation/timer dual clear: success must
forgive immediately.

---

## 14. Output (`tag/index.html:1685-1690`)

Edge consumed once; `jumpHoldT` sustains `jumpHeld` ~0.12s across frames (and across
think ticks) so every bot jump — ground, double, wall, unstuck — gets full hold
height. Unstuck path (`1427-1433`) has its own hold for the same reason.

---

## 15. Failure history (what broke, round by round)

1. **v1 greedy** (`dir=sign(dx)`, jump-if-above): jumped straight into solid ceilings;
   never dropped through pink; stuck on every tier change. Lesson: vertical needs
   structure, not just steering.
2. **Hidden online buttons** (unrelated, found during search): `HIDE_ONLINE_BUTTONS`
   — first build looked offline-only; netplay build had it `false`.
3. **Floor zigzag**: `|dx|>10` chase flipped every think near zero → sprint never
   built. Fixed by 28/45 deadband + momentum hold; jitter hop deleted.
4. **Seam pacing** (screenshot 1, pink/brown joint): `down` vs walk-off flipped per
   think. Fixed by descent locks incl. pink.
5. **UP tie-flip** (screenshot 2, centered under target): bot-relative edge re-picked
   every think, `|vx|` never reached the old 100 gate → vibrated mid-platform.
   Fixed by 0.8s platform-bound lock; velocity gate deleted.
6. **Grounded hesitation**: `!headBlocked` gating meant it never left the ground under
   a ceiling. Fixed by positional edge launch.
7. **Strict double**: `-220..80` window + diagonal LOS missed the 0.09s tick and got
   vetoed by corners. Fixed by wider band, vertical-only headroom, airTime guard.
8. **Corner clipping**: instant inward turn cut arcs into slab lips. Fixed by outward
   hold + wall-gated turn.
9. **Stale `descLock` freeze** (~0.35s no-jump when target crossed planes): fixed by
   clearing climb-opposing locks on `aboveBy`.
10. **Narrow shaft** (`|dx|<50`): dropped past offset shelves. Widened, then replaced
    by slab-targeted steering (this round).
11. **Diagonal-hit ceiling**: `climbPlat=blocked` mistimed holds. Fixed by lane-ceiling
    scan (kept in the router rewrite).
12. **Slope self-hit**: AABB ray read own slope as ceiling (Vipers Nest). Fixed by
    `ignorePlat`.
13. **Full-function rewrite hazards caught in review this round**: dropped
    `exitLockT` decrement (→ permanent lock), dropped wall bail, dropped
    `descLockT` clear (→ Bug-1 regression), landing scan counting the just-left slab
    (→ hover loop), ban attribution to floor edge instead of tried exit. All fixed
    before commit.

## 16. What works now / what is next

Working: floor sprints without zigzag; seam crossings; centered-under-target exits;
edge leaps; apex doubles; corner clears; drops that commit; bonk-triggered flank
switches; slope maps not self-blocking.

Known next steps (scoped, not started): flee-side deadband mirror (24px flip remains);
28-vs-56 carve-out widening if run-through misses appear; steering onto pink shelves
(currently skipped in landing scan); difficulty tiers (reaction time/mistake rate were
designed but never wired); full BFS waypoint routing if iterative single-ceiling ever
deadlocks on stacked labyrinths; custom-map edge cases.
