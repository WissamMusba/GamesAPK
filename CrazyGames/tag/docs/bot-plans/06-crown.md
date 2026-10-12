# Bot Plan — 06 Crown (king of the hill, wearable)

> A chase where the prize is a hat. Bots must want the crown, fear the crown, and count points.

## Mode recap
- Unowned crown bobs on a pedestal; touch claims it (1.2s immunity). Steal by touch; holder scores +1pt/0.4s (+2 if strict-last when stealing). 100pts or timer-highest wins. King is slowed (480, 460 when fatigued >15s); chasers 504 (540 if >30pts behind); king keeps only 1.15× on pads (`crown.js:336–360, 663–680`). Tag path `checkCrownTag` (guest-guarded ✓). Min 2.
- Key state: `crownState.holder` (OBJ), `holderIndex`, `scores{slot}`, `immunityTimer`, `holdTimer`, `underdogSlot`. Brain reads holder-only (`bot_engine.js:311–333`).

## Bots today
- Unowned: all sprint to pedestal ✓. King bot: flees nearest chaser ✓. Chaser: hunts holder ✓. Shape correct; blind to immunity (bots bounce off shielded kings forever), scores (no urgency, no underdog play), fatigue (king never yields a lost crown).

## Roster
| | Count | Notes |
|---|---|---|
| Min | 2 | duel for the hat (min legal). Surprisingly good 1v1. |
| Ideal | 3–4 | one king + 2–3 chasers = real contention without pile-ups. |
| Max | 6 | 5 chasers on one king is a mugging; cap it. |
| Solo | 1 human + 2 bots | triangle dynamics; human can win by timing steals. |

## Behavior spec
- **Chaser bots:** hunt holder, BUT check `immunityTimer` — if shielded, peel off to intercept positions (between holder and nearest pad/high ground) instead of body-slamming the shield. Re-engage the frame immunity drops (track the timer — hard only; normal re-engages on visual pop). Claim table: closest = direct, others = cut-off (standard Hound/Anvil).
- **Underdog surge:** if a bot is >30pts behind it already gets 540 speed (game rule) — brain should *know* and play aggressive: take pad lines, force the steal, ignore positioning. If a bot is *leading* by >30, it plays second-chaser (lets others engage first, steals the steal — "vulture" play, hard only; can look passive, so cap vulture time at 5s).
- **King bot:** flee + hold high ground (keep current evasion); NEW — fatigue awareness: if `holdTimer > 12s` and ≥2 chasers within 300px, consider *yielding*: move toward the weakest chaser and allow the steal (reset fatigue, regain 1.2s immunity as chaser, come back fresh). Yielding looks like losing unless telegraphed — only hard, only when leading on points. If trailing, king never yields.
- **Unowned crown:** all-bot sprint is correct but stupid in multiples — closest goes direct, others take pad routes to arrive second (second arrival often steals first blood). Easy: everyone sprints direct.
- **Steal chains:** after a steal, the *previous* holder gets 2s "re-steal window" aggression (they know the new king's line); then reset to normal claims. Creates the mode's signature hat-swapping scrambles.

## Difficulty in this mode
- easy: no immunity respect (bounces off shields), no score awareness, no yield, direct sprints.
- normal: immunity respect on, score urgency on (underdog aggression), no yield/vulture.
- hard: full spec. A hard king should feel *slippery*; hard chasers should feel *inevitable*.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Immunity re-engage | timer 0 (hard) / visual pop (normal) | |
| Vulture cap | 5s | then engage regardless |
| Yield trigger | hold >12s + 2 chasers <300px + leading | hard only |
| Re-steal window | 2s post-steal aggression | |
| Second-arrival pads | unowned + >2 bots | |

## Acceptance tests
- Chaser bot vs shielded king: zero contact attempts during immunity (10s window, hard).
- King bot with 90pts vs 2 chasers: scores to 100 within 30s at least 1 in 2 runs (slippery check).
- 4-bot match: crown changes hands ≥3 times (contention check), winner decided by score or timer (no stalls).

## Decisions needed
- [ ] King yielding when fatigued+leading (clever but can read as throwing — gate behind hard + leading only)?
- [ ] Vulture play for leading chasers (same concern, 5s cap)?
- [ ] Second-arrival pad routing for unowned crown?
