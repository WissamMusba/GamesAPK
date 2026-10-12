# Bot Plan — 05 Bomb Tag

> Hot potato with a timer. The brain needs a clock — today it has none.

## Mode recap
- One carrier (565 px/s, +12%) holds a fusing bomb; touch passes it; fuse 0 → carrier detonates (eliminated); last survivor wins. Fuse scales by survivors (14/11/8s), pass +1.5s capped 12s, passer gets 2s anti-retag shield (`passImmunity`, keyed by SLOT). Multi-round with intermission. Tag path `checkBombTag` (`bomb.js:621`) — **no guest guard** (guests simulate locally; engine changes must be host-safe).
- Key state: `BOMB_MODE.carrierIdx` (INDEX), `fuse/maxFuse`, `passImmunity{slot}`, `roundNumber`. Brain reads carrier + immunity only (`bot_engine.js:334–362`).

## Bots today
- Carrier bot: chases nearest non-immune survivor. Non-carrier: flees carrier. Correct shape, zero urgency: carrier holds the bomb until it explodes in its hands; nobody plays the fuse.

## Roster
| | Count | Notes |
|---|---|---|
| Min | 2 | duel potato (min legal). Tense, fast rounds. |
| Ideal | 4–5 | passing triangles exist; fuse math matters. |
| Max | 6 | more bodies = bomb never sits; rounds blur. |
| Solo | 1 human + 3 bots | human touches bomb often; learns passing fast. |

## Behavior spec
- **Carrier bot — fuse urgency tiers** (the core of this file):
  - fuse > 6s: normal chase, prefers clustered survivors (pass into crowds = options later), avoids corners.
  - fuse 3–6s: aggressive — bee-line nearest non-immune, pads allowed off-route, jumps forced (no safe play).
  - fuse < 3s: desperation — pass to *anyone*, including immune-adjacent (touch the moment shield drops: track `passImmunity` expiry and arrive as it hits 0), suicide-run through the pack. A hard carrier holding <3s should look scary, not lost.
- **Carrier passing targets:** nearest non-immune by default; tie-break toward the survivor with the *most* neighbors (spread the danger); never pass back to `lastPasser` while shielded (already enforced by immunity — brain just must not hover the shielder wasting fuse).
- **Non-carrier bots:** flee carrier normally; when fuse < 4s, STOP fleeing and start *herding* — position between carrier and other survivors to be the pass option (taking the bomb at 3s with full knowledge beats receiving it at 0.5s blind). If YOU are the obvious target, keep fleeing — herding is for the second-nearest.
- **Intermission:** bots hold position (no input spam); carrier-side bots drift to center for the fair restart.
- **Multi-round memory:** track who detonated least — no grudges (keep it clean), but DO track own detonation count for difficulty honesty (easy bots should blow up more).

## Difficulty in this mode
- easy: no urgency tiers (plays the whole fuse like >6s), no herding, no shield-expiry timing. Holds the bomb too long and pops. Funny, correct.
- normal: urgency tiers on, herding off, shield timing off.
- hard: full spec. A hard carrier with 2s left should almost always find a pass.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Urgency bands | 6s / 3s | chase / aggressive / desperation |
| Shield-expiry timing | arrive at 0 | hard only |
| Herd trigger | fuse <4s, second-nearest | |
| Corner avoidance | prefer x in [15%, 85%] | carrier with fuse <6s |

## Acceptance tests
- Carrier bot with 2s fuse + 3 survivors: passes within 2s (9/10 runs on hard).
- 4-bot match: rounds complete (winner declared), no round where carrier stands still >2s.
- Easy carrier: detonates holding the bomb at least 1 in 3 rounds (honest weakness).

## Decisions needed
- [ ] Desperation <3s suicide-runs (dramatic — yes recommended)?
- [ ] Herding behavior for non-carriers (smart but subtle — keep, it's the file's best idea)?
- [ ] Guest-side bomb sim stays as-is (out of scope — engine is host-side; note the C5 desync separately)?
