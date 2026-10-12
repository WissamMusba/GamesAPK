# Bot Plan — 04 Infection

> Asymmetric speed tag: the horde is faster and grows. Bots must play *both* sides of a snowball.

## Mode recap
- Patient Zero (615 px/s, 1.22×) + infected wave (545 → 520) vs survivors (504); lone survivor gets 605 + repulsor pulse (200px knockback, every 8s). All infected → zombies win; timer out → survivors win (`infection.js:591–728`). Tag path `checkInfectionTag` (guest-guarded ✓). Min 3 (`wiring.js:210`).
- Key state: `infectionState.patientZeroSlot`, `loneSurvivorSlot`, `p.isInfected/isPatientZero`, `repulsorTimer` — the brain currently reads **none** of this (`bot_engine.js:363–380` only checks `p.isInfected`).

## Bots today
- Infected bot: nearest survivor. Survivor bot: flees nearest infected. Serviceable 1v1 logic, zero mode awareness: PZ doesn't know it's 22% faster (plays scared), survivors don't group, nobody respects the repulsor, lone survivor doesn't know it's buffed.

## Roster
| | Count | Notes |
|---|---|---|
| Min | 3 | PZ + 2 survivors (min legal). Snowball in miniature. |
| Ideal | 5–7 | PZ + 4–6 survivors. The outbreak curve needs victims. |
| Max | 9 | 10-player infection is a green flood; cap at 9 so at least one human slot breathes. |
| Solo | 1 human survivor + PZ bot + 3 survivor bots | human experiences the hunted side first (scarier, better teacher). |

## Behavior spec
- **Patient Zero bot:** knows it's fastest — beelines nearest survivor, cuts corners through pads, never flees (PZ flees nothing). Targets isolated survivors first (lowest neighbor count within 300px) to start the snowball efficiently. Easy PZ: greedy only, no isolation-picking.
- **Infected bots (non-PZ):** spread, don't stack — claim distinct survivors; if 2+ infected already chase one survivor, third peels to second-nearest. Converge only when ≤2 survivors remain (closing the net).
- **Survivor bots:** loose pack behavior — drift toward nearest survivor (within 350px), keep 100px+ separation (one tag must not chain the pack). When infected within 200px, pack scatters (everyone picks the escape vector away from threat, pads allowed). Regroup when clear >2s.
- **Lone survivor bot:** knows the buff — plays aggressive keep-away using verticality (repulsor punishes ground chase), times movement so repulsor fires when an infected is inside 200px (don't waste the pulse: if no infected in radius, hold position 0.5s and let them come). This is the mode's hero moment; hard bots should occasionally *win* as lone survivor.
- **Repulsor respect (all infected bots):** if survivor's `repulsorTimer < 1s` and we're within 220px, back off to 240px+ for the pulse, then re-engage. Easy bots never learn this (free pulses for the player).
- **Outbreak countdown (3s):** survivors scatter to spread positions during countdown; PZ picks the most isolated spawn side. (The countdown state exists but is currently dead code — wire it or delete it; plan assumes wired.)

## Difficulty in this mode
- easy: no pack, no isolation-picking, no repulsor respect, PZ chases greedily at full speed but with wide aim error.
- normal: packs + spread-converge, no repulsor timing.
- hard: full spec including lone-survivor hero play.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Pack radius | 350px | survivor cohesion |
| Pack separation | 100px min | anti-chain |
| Scatter trigger | infected <200px | |
| Isolation pick radius | 300px neighbor count | PZ target select |
| Repulsor back-off | 240px when timer <1s | infected only |
| Converge trigger | ≤2 survivors left | horde closes net |

## Acceptance tests
- PZ bot vs 3 idle survivors: first tag in <12s (speed advantage exercised).
- 6-bot outbreak, 60s: infection spreads (≥3 infected by 40s) OR survivors survive by grouping (either outcome = systems working, not stat-checking).
- Lone-survivor bot with repulsor: survives ≥15s against 2 hard infected at least 1 in 3 runs.

## Decisions needed
- [ ] Wire the dead 3s outbreak countdown (recommended) or delete it?
- [ ] Hard lone-survivor allowed to win sometimes (yes recommended — best story in the mode)?
- [ ] Cap infection at 9 players?
