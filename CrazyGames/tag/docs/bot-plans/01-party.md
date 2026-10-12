# Bot Plan — 01 Party FFA (classic tag)

> Your original 1v1 lives here. This file keeps it sacred and scales it to a crowd.

## Mode recap
- One IT (582 px/s) hunts runners (504 px/s). Touch passes IT. Timer end → whoever is IT loses (`match.it` index, `career.js:211`; tag path `hunter.js:986`, guest-guarded).
- Speeds: `IT_SPEED=582`, `RUN_SPEED=504` (`config.js:10`, enforced `bot_engine.js:1277`).

## Bots today
- IT bot: nearest runner (+2.25× human magnet, `bot_engine.js:414–429`) with Hound/Anvil split for multi-hunter (n/a in FFA — single IT, so Anvil never triggers here).
- Runner bot: flees nearest chaser = the IT (`bot_engine.js:430–459`).
- Gaps: no-target freeze (`:462`), human magnet feels rigged, easy bots still intercept perfectly.

## Roster
| | Count | Notes |
|---|---|---|
| Min | 2 (1v1) | the duel. Solo tab default: P1 human + P2 bot. |
| Ideal | 3–4 | 1–2 humans + bots. One IT vs 2–3 runners is the sweet spot. |
| Max | 6 | beyond this the arena is bumper cars; tags stop meaning anything. |
| Solo +1 | 3 | optional menu toggle: 1 human + 2 bots (IT rotates). |

## Behavior spec
- **IT bot:** claim table (see overview): closest bot = Hound (direct chase), others = Anvil (cut off toward nearest platform between runner and arena center). Re-claim every think tick; drop claim if target tagged. Easy: greedy chase only, no Anvil, no intercept solver.
- **Runner bot:** flee IT; if IT within 260px and a speed pad is on-route, detour (normal/hard only). Prefer high ground when IT is below (keep current zoning, fix the dead `hunterSameTier` condition so same-tier re-entry triggers a drop).
- **1v1 duel rules (solo):** no Anvil (nothing to split), no human magnet (opponent IS the human — cap is meaningless; remove magnet entirely when humans == 1). First-to-3-tags wins option? (Decision below.)
- **Edge cases:** IT tag during countdown ignored (sim doesn't run); last-second tag stands (host authority, no change).

## Difficulty in this mode
- easy: greedy chase/flee, ±90px aim error, 0.25s reaction, think 0.22s. Beats a casual player sometimes; never feels psychic.
- normal: intercept on (sloppy), Hound only, pads off.
- hard: today's brain + claims + capped magnet. This is the "better than your friends" bot.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Human magnet cap | 1.3× | normal/hard only; off in 1v1 |
| Runner pad detour | ≤120px off-route | else ignore |
| Anvil trigger | ≥2 hunter bots | n/a in FFA; listed for shared code |
| Re-claim interval | think tick | 0.09/0.14/0.22s |

## Acceptance tests
- 60s 1v1 hard bot vs idle human: bot tags idle human in <15s (proves hunting works).
- 60s 4-bot FFA: zero idle->3s events, ≥3 tags, no NaN.
- Easy vs hard over 3 runs: hard tags ≥2× easy's count.

## Decisions needed
- [ ] Solo duel stays 1v1 default (yes recommended)?
- [ ] Add first-to-N tags duel option for solo?
- [ ] Human magnet 1.3× cap approved?
