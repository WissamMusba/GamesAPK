# Solo Bot AI — Detailed Read-Only Audit + Incremental Roadmap
**File:** `tag/index.html` | **Range:** lines 2300–3200 (`botInputFor` + probes + `inputFor` dispatch)
**Related systems read for context:** physics constants L1049–1058, `HARNESS` policy L1280–1393, `activeSlots` L1928, `makePlayer` L2124–2132, `inputFor` L3173–3249
**Date:** 2026-09-26 | **Mode:** read-only, no game code changed
**Recheck note:** this replaces the prior `forantigravity.md`. Every threshold below was re-read against the file a second time. Numbers quoted are literal values from the source, not estimates.

---

## 0. What this bot is (and is not)

- **1v1 offline only.** `isBotSlot` (L2322–2333) returns true only when `HARNESS` playback is not active, `NET.role === null`, `menu.botOn` is true, `match.players.length === 2`, `activeSlots().length === 2`, and `p.slot === 1`. There is no online bot, no 3–8P bot, no bot-vs-bot. Solo tab forces `settings.teams = false` (L2135).
- **Same body as you.** Bot output flows through `inputFor` (L3177: `if(isBotSlot(p)) return botInputFor(p,dt)`) into the shared `physUpdate`. It returns only `dir, jumpEdge, jumpHeld, downHeld` (L3162). It obeys gravity `G=2100` (L1049), jump velocity `JUMP_V=990` (L1050), hold-lift `HOLD_LIFT_T=0.10` (L1051), `MAXFALL=1600` (L1053), run `RUN_SPEED=504` vs IT `IT_SPEED=582` (L1054), ground/air accel and decel (L1055–1056), coyote, jump-buffer, one air-jump when `settings.doubleJump` is on, max 2 wall-jumps via `sideT`. Any "smarter jump" must be a smarter button press, not a physics cheat.
- **Sparse learned help, not a map brain.** `HARNESS.transitions` (L1297, persisted as `tag_jump_policy_v1`, L1307–1320) stores recorded `from->to` jump samples per map (`launchX`, `doubleJumpDelay`). Candidate pairs are pre-filtered hard: max rise 510 px (690 off boost), max center distance 850 px, no downward drops over 40 px, no flat step-overs under 180 px gap, no small hops under 140 px gap, no long gaps over 560 px without speed/boost (L1361–1376), plus mirror-dedup (L1378–1384). The bot consults this only when both bot and target stand on known nodes and the sample exists (L2835–2855). It is a lookup of human-demonstrated jumps, not a planner.
- **Decision cadence.** `BOT.think = 0.09` (L2320) → ~11 Hz on hard, 0.16 s (~6 Hz) on easy (L2519–2520). Per-decision state lives in `BOT.st[slot]` (L2518) with ~35 fields covering direction, jump queue, holds, locks, blacklists, juke phases, brake timers. Between thinks the bot holds direction; jumps are one-frame edges (`jumpQ` set true at decide time, consumed and cleared at L3158).

---

## 1. Architectural Guardrails — What WILL NOT Work and Why

### 1.1 Heavy global graph search / full A* / NavMesh is a bad fit here

**Frame budget reality.** The main loop is a single thread doing input, per-player sub-stepped collision over all of `SOLIDS`, tag resolution, particles, camera, canvas draw, and (online) ~66 Hz state broadcast. The bot budget today is a handful of bounded segment/box tests every 90 ms. That is intentional for mobile at DPR ~1.25.

What a full A* adds per think:

- Nodes = every walkable slab plus slope samples. Edges = every plausible jump/run/drop link, each needing clearance checks against `SOLIDS` (solids, slopes with `dy`, pink drops, speed/boost pads, arena walls). Even a modest 25-node map becomes hundreds of edge tests per think, each edge test itself a multi-sample segment walk.
- Open/closed lists, heuristic arrays, parent pointers, and a returned path array. The hot loop today allocates essentially nothing per think; A* allocates per think. On low-end Android that converts to GC pauses every second, which reads as rubber-banding and missed jump edges.
- Rebuild cost on map change. `buildLevel()` swaps `SOLIDS` on map switch, random-map rolls, and custom editor maps. Slopes (`dy`) need rasterization into walkable samples. A pre-baked mesh goes stale on every switch; a rebuild-on-switch adds a load hitch exactly when the player expects an instant rematch.

**Why the current design is the right shape.** The engine already prunes the problem: `harnessBuildCases` (L1322–1393) keeps only non-trivial climbs (drops, step-overs, and baby hops are explicitly pruned at L1366–1374), and the bot only queries the table when both endpoints are known nodes (L2839–2842). Drops are left to greedy gravity on purpose (comment at L1366). Extending that sparse table (more recorded pairs, better launch windows) buys skill at near-zero runtime cost. Replacing it with a dense planner buys cost at near-zero skill gain for 1v1 tag, where the target moves every 90 ms and any 500 ms plan is stale before it executes.

> Guardrail: keep bot reasoning at bounded local probes with zero per-think allocation. Any proposal needing a queue, heap, path array, or per-frame graph walk does not belong in this file.

### 1.2 Jump-timer and ledge-distance mistuning — three exact failure modes

The timers and distances form one tuned system. Changing one in isolation breaks the others.

**A. Infinite ceiling bonking (jump too eager).**
Climb jumps are gated by `headBlocked` (segment straight up 140 px, L2796), `ceilAbove` (48 px head box, L2804), apex window (`vy` between −130 and +110, L3039), air-time gate (`airT2 > 0.10–0.12`, L3041/L3050), and the policy double-jump delay (`_policyDjDelay` / `_policyAirT`, L3031–3035). The bonk detector (L3136–3155) fires only on a hard signature: was rising faster than −350, now stopped, head box intersecting solid, twice within 1.0 s — then it blacklists the tried side for 1.5 s and forces the opposite flank with a 0.5 s unstuck push.
If jump intent is forced every think while climbing and the head gates are removed or the apex window is widened aggressively, the bot jumps into the same slab, bonks, falls a few pixels, and jumps again before the blacklist can engage. Visually: vibration under a ceiling, dust puffs with no progress, then a sudden Guilty-Gear-style reversal when the blacklist finally fires. The fix is never "jump more"; it is "jump only when the 140 px column is clear."

**B. Ledge oscillation (lookahead too long, locks too short).**
Ground lookahead is speed-scaled: 80 px walking, 125 px sprinting or on speed (L2352, L2802, L2946), with high-ground edge checks at 40–45 px (L2908–2909) and edge-jump margins 42–72 px (L2823–2829). Commitment locks bridge the 90 ms gaps: ceiling-exit lock ~0.85 s (L2772), walk-off descent lock 0.25–0.35 s (L2971/L2994), plus an explicit stale-lock kill when the target goes above (L2790) and descent-direction hold (L2792).
Push lookahead to 150+ px everywhere and the bot sees danger on safe slabs, camps with `dir = 0` (L2917/L2926/L2940), the target drifts, the lock expires, it darts out, re-sees danger, and paddles at the edge. Shrink lookahead to ~40 px at sprint speed and it detects gaps one think late, jumps past the takeoff, and falls short. Shorten the locks and every think re-votes direction at brown/pink seams; lengthen them and the bot runs obediently off after a target that already reversed.

**C. Blind cliff suicides (gap commit without landing confirm).**
Gap jumps ("no ground ahead and target far → jump," L2872/L2946–2948) assume the lookahead matches speed. The falling-steer scan (L3059–3114) confirms a landing slab below before committing the air. Committing to a walk-off without that confirm (or holding a descent lock after the target reversed) converts a good chase into a free fall while the player watches from above. The `holdHighGround` suppressor (L2898–2903, enforced at L2998–3002 with `down = false`) exists to stop exactly this donation.

> Guardrail: change one distance or timer at a time, then test three behaviors separately — ceiling climbs, seam walk-offs, full-sprint gap jumps. They fail independently and the failure looks like a different bug each time.

### 1.3 Why core-physics edits and 4–8 bots cause regressions

**Physics edits break humans, replays, and feel.** `JUMP_V`, `G`, `HOLD_LIFT_T`, `MAXFALL`, `RUN_SPEED`/`IT_SPEED`, `ACC`/`DECEL`/`AIR_ACC`/`AIR_DEC`, `SPEED_MULT=1.55`, `BOOST_MULT=1.31` jointly produce tap height ~233 px and full-hold height ~270 px (comment L1050–1051), boost height ~346 px (L1058), and the IT 582 vs runner 504 speed gap that makes tag fair. Raising bot jump height or speed to "fix" a route changes human jumps identically, invalidates every recorded `HARNESS` sample (`launchX` timing, `doubleJumpDelay`), and shifts host/guest position expectations. Skill must come from button timing, not constants.

**4–8 bots break the 1v1 assumptions structurally.** Target selection is "nearest if IT, the IT if not" over exactly one opponent (L2526–2530). Corner-juke, touchdown ambush, landing avoidance, pad meta, and high-ground zoning all assume one hunter vector. With N bots: target selection becomes N×N nearest searches per think; each bot repeats `botSolidBetween` segment scans (each scan walks up to distance/22 samples × all `SOLIDS` with `hitRect`); per-slot state (`BOT.st`) multiplies; `activeSlots()`/menu gating (must equal 2) needs redesign; and without target arbitration every bot chases the same nearest runner (gang-up) or every runner flees the same hunter (clump). Online, each extra simulated body adds 66 Hz packed state; the broadcast already carries full player arrays and would need culling. None of this is a tweak — it is a new mode.

> Guardrail for the roadmap below: bot-only, offline 1v1, no physics constants, no new simulated bodies, no protocol fields.

---

## 2. Current Bot — Strengths and Flaws As-Is (Re-Audited)

### 2.1 Decision loop, step by step

1. **Gate and target.** `isBotSlot` gates (above). Target = nearest opponent if bot is IT, else the IT player (L2526–2531). No target = stand still (L2532). Deltas `dx, dy`, `isIt` flag (L2533–2535).
2. **Safety timers tick.** `dropNoJumpT`, `pinkJukeCooldown`, `airBrakeCooldown` decay by `stepDt` (capped 0.05 s, L2521/L2537–2539). `decideT`, `bonkT` decay (L2541–2542); bonk counter resets on expiry. Side blacklist expires on timer or on 45 px elevation gain (L2544–2547).
3. **Stuck watch.** Displacement since last anchor vs 14 px in 0.45 s, armed when target far (> 90 px), walled within 30 px, or near perimeter (L2548–2555). On trip: 0.7 s reversed jump-spam unstuck that wipes exit/descent/climb/juke locks (L2556–2576). While unstuck, jumps fire whenever grounded, air-jump available, or wall-touch with jumps left, every 0.28 s with 0.12 s hold (L2567–2572).
4. **Chase branch (bot is IT).** Touchdown ambush for descending targets (trajectory sim at 0.025 s steps up to 1.0 s against slabs, slopes, and floor, L2589–2623; commit when touchdown within 0.10 s or target within 35 px of surface, L2624; run to touchdown X within 12 px deadband, L2625). Velocity-lead pursuit when airborne or |dx| > 100 (lead time = distance/IT_SPEED clamped 0.15–0.40 s, clamped ±260 px, L2627–2630). Close-quarters direct chase with deadbands and anti-overshoot (hold current run direction when fast rather than flipping on sign, L2632–2641).
5. **Flee branch (bot is runner).** Predicted separation with 0.32 s hunter lead clamped ±220 px and 20 px deadband (L2645–2648). Then layered tactics in priority order: pink juke (below), corner juke near walls (L2685–2710: run into wall grounded, kick outward airborne), pad opportunism within 320 px (L2700–2708 → `botFindSpeedPadMeta`), perimeter clamps (L2709–2710).
6. **Routing overlay (chase only).** Direct beeline when the center-to-center segment is clear of solids (pink ignored, L2732–2738). Else ceiling-detour router when target is 50+ px above (L2739–2782): hold existing exit lock on same slab (with target-side-flip escape, L2743–2751), else compute blocked slab overhead, pick nearer exit ±45 px with wall-side overrides and banned-side respect, verify open air above the exit up to 280 px (else take the other side), lock 0.85 s with exit X, climb platform, and outward dir (L2753–2772). Airborne preserves the lock (L2774–2778); landing on a new slab clears it (L2779–2782). Below-target walk-off hysteresis preserves direction briefly (L2791–2792).
7. **Grounded jump vote.** Head/wall/ceiling probes (L2796–2806), high-ground zoning predicate (hunter 70+ px below, on solid non-pink non-wall, suppressed when hunter same-tier ±65 px or within 110 px or juking, L2809–2815). Drop-escape (unjumpable wall on pink → drop, no jump, L2806/L2817–2819 + `dropNoJumpT = 0.85`, L2955). Chase jump table (L2820–2872): touchdown-frame ambush hop, edge launch at platform edge or locked exit or on boost or direct-path-above, recorded-policy jump within 40 px of `launchX` (else steer toward it within 300 px, L2833–2855), climb hop when target 70+ px above within 260 px, wall-jump when jumpable, reverse (no jump) at unjumpable barriers, nudge-hop when stalled and far, gap jump when no ground ahead and far. Flee jump table (L2873–2951): never jump mid-pink-drop, pop through pink on phase 2, corner-juke jump, boost launch within 340 px, wall-jump (with hold when fast), reverse at unjumpable walls with optional leap-over-hunter when the hunter is ahead within 140 px and ceiling clear, high-ground camp routine (below), else gap/stall hops.
8. **Down vote.** Drop wins only on pink: direct-path-below on pink (L2960–2962), committed-lane hold (L2963–2968), fresh pink drop with 0.25 s lane lock (L2969–2973), else scored walk-off (3 fall-lanes center/±150 px, hits×200 + |lane offset|, L2975–2996, walk off cleanly with jump suppressed, L2995). High-ground force-clears down (L2998–3002). Jump hold floored at 0.12 s on any jump (L3006); walk-off lane without pink suppresses jumps unless walled (L3007).
9. **Air vote.** Outward-hold past overhangs until feet clear the slab top (L3016–3022). Wall-jumps when `sideT > 0` and jumps remain, gated to outer walls or climbs (flee always allowed, L3023–3029). Policy-delayed then apex-chained double jumps for chase (apex window + head-clear + 0.10 s air gate, steer into target side, L3030–3048). Flee double jumps only when falling and ground-missing or walled (L3049–3054). Falling landing-steer onto the nearest slab below within 180 px: chase runs toward clamped target X with 36/14 px deadbands (L3071–3077); flee runs to the far side from predicted hunter X (time-to-land + 0.35 s window, ±260 px clamp) and burns the air-jump to escape if the hunter intercepts within 70 px and heights match within 90 px (L3078–3103). Straight-fall drift, rising curl-in, and flee air-brake (0.18 s reversal on 2.6 s cooldown when hunter within 180×120 px and faster than 180 px/s, L3120–3132).
10. **Bonk, package, return.** Ceiling double-bonk → blacklist + forced flank (L3135–3155). Latch `wasVy`, honor `dropNoJumpT`, consume `jumpQ`, floor hold, return the 4-field input (L3156–3162).

### 2.2 Probe table (rechecked values)

| Probe | Function | Geometry | Ignores | Used for |
|---|---|---|---|---|
| Segment block | `botSolidBetween` L2335–2349 | samples every ≤ 22 px, 6 px box | pink, own platform arg | beeline vs detour, exit air verify, apex head-clear, boost entry |
| Ground ahead | `botGroundAhead` L2350–2364 | lookahead X at 80 px (125 px fast/on-speed), window feet −42 to +24 px, slope-top aware | nothing (all slabs count) | gap jumps, high-ground edge holds |
| Wall ahead | `botWallAhead` L2365–2375 | forward box 44 px (75 px fast), height body minus 12 px | pink | jumpable vs unjumpable wall, edge holds |
| Ceiling above | `botCeilAbove` L2376–2384 | 48 px head box inset 4 px each side | pink, own platform | jumpable-wall predicate, leap-over-hunter, stall hops |
| Full pink support | `botFullyOnDrop` L2299–2306 + inline twins | full body minus 6 px over pink span | — | drop trigger, drop-escape, pink-juke arm |
| Fall-lane score | inline L2975–2986 | 3 vertical lanes, 24 px samples, pink ignored | pink | walk-off direction when target below |

Speed/pad scouting (`botGetActivePads` L2385–2392, `botFindSpeedPadMeta` L2393–2515) scores only same-tier pads (55/85 px vertical for speed, 50/80 px for boost), within 350 px (speed) or 260 px (boost), with segment-clear entry checks and a hunter-between veto (hunter must not sit between bot and pad unless the hunter is 120+ px farther from the pad and 130+ px away overall). On-pad = sprint across away from hunter (score 2000 − hunter distance); approach = prefer away-from-hunter (800 − dist) over toward-hunter (200 − dist).

### 2.3 Where it looks dumb or robotic (with tells)

- **Tail-chase on laps.** Outside descending-touchdown, chase aims at body or short lead. On loop maps the bot runs your arc ~0.3 s late. Tell: constant gap that never closes on straights, then a desperate lunge at corners.
- **Fixed apex rhythm.** Chase double-jump fires in the same velocity window with the same hold every climb. Tell: you can stand under the second-hop peak and tag on the way down by round two.
- **Seam stutter.** Exit-lock vs descent-lock vs high-ground `dir = 0` re-vote every 90 ms at brown/pink boundaries. Tell: 2–3 frames of paddle-stepping or a full stop facing you before committing.
- **AFK-looking camps.** High-ground narrow-isolated case drives to center and sets `dir = 0` (L2911–2918); wall corners do the same (L2928–2944). Correct but motionless. Tell: bot stands still while you reposition for free.
- **Snappy air-brake.** Instant reversal for 0.18 s with no wind-up (L3124–3131). Tell: reads as a glitch-pop rather than a juke, and good players ignore it after one viewing.
- **Shy pads.** 320 px radius plus hunter-between veto means cross-map sprints go untaken. Tell: bot jogs past a free speed lane it should have crossed the arena to claim.
- **One-note pink juke.** Same 0.28 s drop, same pop-and-reverse, same 3.0 s cooldown, only when the hunter cooperates by running in. Tell: stop at the pink edge and the trick never fires; chase through twice and you know the exact pop timing.

### 2.4 Pink juke and stuck routines as built

- **Pink juke (L2650–2683 armed, L2875–2880 + L2954 executed).** Arm: fully on pink, hunter 60–230 px behind within 60 px height and closing, cooldown ready. Phase 1: hold original direction, set `down` (executed via `S.wantDown` → `downHeld` at L3162), 0.28 s, no jump. Transition when the hunter passes (sign flip with 15+ px separation, or within 45 px) or timer expires → queue jump with 0.15 s hold, reverse want. Phase 2: rise through pink 0.35 s or until re-grounded at platform height, then disarm with 3.0 s cooldown. During phase 1 the grounded jump table is bypassed; during phase 2 the pop is forced. Failure modes: hunter stops (no pass signal until timeout, wasted drop), narrow pink (pop lands back on the hunter), hunter jumps over (bot drops under nothing).
- **Stuck (L2548–2576).** 14 px / 0.45 s with far/wall/perimeter context → 0.7 s opposite-direction jump spam at 0.28 s intervals, all routing locks wiped, pink juke canceled. Recovers from pillars, corners, and post-bonk wedges. Cost: highly visible — a full reversal plus rhythmic hopping advertises the failure.
- **Bonk blacklist (L3136–3155).** Two hard ceiling hits within 1.0 s → blacklist tried side 1.5 s (cleared early by 45 px climb), force opposite flank with a 0.5 s unstuck push. Prevents infinite bonk loops at the price of occasionally abandoning the correct side after two unlucky hits.

---

## 3. Incremental Upgrade Roadmap — Easiest to Most Advanced

> All five are bot-decision-only, 1v1-safe, physics-constant-safe, allocation-free. Ordered by review risk, not by excitement.

### Idea 1 — Humanize timing (easiest, do first)
- **Flaw:** metronomic 90 ms thinks and identical 0.12–0.16 s holds make correct routes look scripted. Landings chain instantly into re-jumps.
- **Adjustment (plain English):** add tight random spread to think interval and jump-hold length around the same means, plus a short no-rejump settle after hard landings. Leave unstuck, bonk, blacklist, and policy-delay timers exact.
- **See and feel:** climbs breathe, landings stick, pursuits feel like reaction variance instead of a servo. Same difficulty, far less annoyance. The AFK camp complaint drops without touching tactics.
- **Risk:** over-spread reintroduces late gaps and edge flicker. Cap spread small (about a fifth of the base), never jitter safety timers, and verify sprint gap jumps still take off on time.

### Idea 2 — Cutoff running (biggest visible chase upgrade)
- **Flaw:** body-aim + short lead arrives late on laps, arcs, and platform loops; only descending targets get true interception.
- **Adjustment (plain English):** when chasing a fast grounded runner with clear air, blend body-aim toward a chord-cut point projected along runner velocity, capped at roughly a third of a second ahead. Keep touchdown ambush for descents; use this for flats and loops. Revert to body-aim the instant a solid enters the shortcut segment or the target goes airborne unpredictably.
- **See and feel:** the bot meets you at corner exits instead of trailing in. Leads change with your speed — jog and it stalks, sprint and it cuts. Tags feel intercepted, not outlasted.
- **Risk:** leading into walls = free escapes. Gate every cutoff by the existing segment-clear test, clamp the lead, and bias to under-lead on maps with dense pillars.

### Idea 3 — Commit-once edges (fixes the stutter players actually notice)
- **Flaw:** exit vs descent vs camp re-votes every think at seams; gap takeoff timing depends on catching the right think at speed.
- **Adjustment (plain English):** lock the gap decision on first sight at speed (takeoff side + jump intent held until landing or short timeout) instead of re-polling. Give high-ground holds a visible ready behavior using direction only (small patrol or pulse, no physics change) so patience reads as intent. Keep speed-scaled lookaheads; stop the vote from flickering.
- **See and feel:** edges go quiet and decisive — either a clean committed takeoff or an obvious hold that explodes when you commit. Ledge fights become mind games instead of bug reports.
- **Risk:** a committed bad read becomes a suicide. Commit only with a confirmed landing slab from the falling scan, expire fast on target reversal, and never commit off pink without full-support confirmation.

### Idea 4 — One-feint-per-engagement mixup layer
- **Flaw:** every trick is same-timing, same-direction, same-trigger. Pink pop always reverses, air-brake always fires on the same proximity/speed signature, double-jump always peaks in the same window.
- **Adjustment (plain English):** add a small cooldown-gated chooser above existing tricks: sometimes delay the pink pop, sometimes pop the same way, sometimes skip the air-brake, sometimes delay the second jump. At most one feint per engagement, only when the hunter is fast and committed, then back to optimal lines. Weight toward punishing over-commitment.
- **See and feel:** rounds two and three stop feeling solved. You hesitate at pink edges because the pop might not come; you stop pre-aiming the second-hop peak because it might come late. The bot feels tricky without feeling faster.
- **Risk:** random fakes when the hunter is not committed donate distance. Gate on hunter speed plus closing distance, keep current cooldowns, and tune by feel: if you can name the trick mid-match, it fires too often.

### Idea 5 — Two-counter adaptation (most advanced, still tiny)
- **Flaw:** no memory. Same escape (early air-jump, same ceiling exit, same low camp) works every round.
- **Adjustment (plain English):** keep two per-match counters only (for example: early-jump escape rate, left-vs-right ceiling-exit split). Use them solely as tiebreakers when options score nearly equal, and nudge chase aim or double-jump timing slightly against the habit. Decay counts so mid-match adaptation by the player resets the read. No cross-match storage, no model, no allocation beyond two numbers.
- **See and feel:** mid-round the bot starts showing up at your favorite exit and contesting your favorite hop. You must vary your game — the hallmark feeling of a human opponent.
- **Risk:** fitting noise looks dumb (camping the wrong exit off two samples). Require a minimum sample before influence, cap influence to tiebreaks, and keep safety systems (locks, blacklists, unstuck) strictly above adaptation in priority.

---

## 4. Suggested Review and Test Order

1. **Idea 1 alone.** Zero routing risk. Pass criteria: same win rate, lower "robotic" complaints, no new gap failures at sprint speed.
2. **Ideas 2 + 3 as a pair.** Both touch chase geometry and edge commitment and share the segment-clear gate. Pass criteria: tighter corner tags on loops, zero increase in fall deaths, no new seam paddle-steps.
3. **Idea 4.** Pass criteria: second-round tags feel less free for the player, trick frequency unnoticeable (you feel pressure, not pattern).
4. **Idea 5 last.** Needs the longest playtest. Pass criteria: players report varying their escapes mid-match; no "bot camps wrong exit" reports in the first 60 seconds.

**Per-idea watch list during playtests:** ceiling climbs (no new vibration), brown/pink seams (no new stutter), sprint gaps (no late takeoffs), pink jukes (no pop-into-hunter regressions), corner escapes (no new wall face-plants).

---

## Appendix — Line Index (rechecked)

- Gating: `isBotSlot` L2322–2333; dispatch `inputFor` L3177; return shape L3162
- Think: `BOT.think` L2320; easy rate L2519–2520; `stepDt` cap L2521; state init L2518
- Target: L2524–2535; empty-target still L2532
- Stuck: watch L2548–2555; trip L2556–2563; spam L2564–2576
- Chase: touchdown sim L2586–2625; lead L2626–2630; close quarters L2631–2641
- Flee: predict L2644–2648; pink arm L2650–2660; phases L2661–2683; corner L2685–2711; pads L2700–2710
- Routing: beeline L2732–2738; detour L2739–2782; stale-lock kill L2790; descent hold L2791–2792
- Grounded vote: probes L2796–2806; high-ground predicate L2808–2815; drop-escape L2806/L2817–2819; chase table L2820–2872; policy lookup L2833–2855; flee table L2873–2951; camp routine L2900–2945
- Down vote: pink lanes L2952–2997; high-ground veto L2998–3002; hold floor L3006; walk-off suppress L3007
- Air vote: overhang hold L3016–3022; wall L3023–3029; policy delay + apex chain L3030–3048; flee double L3049–3054; landing steer L3058–3115; rising curl L3116–3119; air-brake L3120–3132
- Bonk + return: L3135–3162
- Physics constants: L1049–1058 | HARNESS build + filters: L1322–1393 | Policy store: L1305–1320

*End of detailed audit. No game code was modified. Approve ideas individually and request isolated patches one at a time.*
