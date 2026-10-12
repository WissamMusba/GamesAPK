# Bot Plan — 07 Hunter Tournament (+ teams-of-2 cross-tag)

> Rounds, a cage, and two hunters who must never hunt their own. The most *rules* of any brain.

## Mode recap
- 2 teams; one hunter per team (`hunterRed/hunterBlue` slots, `p.isHunter`); 3s cage at round start (hunters frozen); hunters tag *enemy* runners only; wiped team loses the round; 3 rounds, points for capture/speed/survival (`hunter.js:10–237`). Cross-team tag path `hunter.js:845` (guest-guarded per side ✓). Min 4 (`wiring.js:189`). Rounds never touch `endMatch` — brain must handle `hunter_round_result` + intermission states (today: bots freeze mid-result? verify — `botInputFor` has no round-state guard; the sim likely keeps running behind the result screen).

## Bots today
- Hunter bot: nearest enemy runner, never teammates ✓ (`bot_engine.js:386–395` — the one branch with a *why* comment).
- Runner bot: flees enemy hunter ✓ (`:396–405`).
- Gaps: cage is a full stop (fine) but no cage-break planning; no round awareness (bots play round 3 like round 1); no capture-speed scoring awareness (a tag at 5s vs 55s scores the same to the brain, differently to the tournament); eliminated bots spectate (human feature — bots just idle, correct but dead air in all-bot watch).

## Roster
| | Count | Notes |
|---|---|---|
| Min | 4 | 2v2 (min legal). |
| Ideal | 6 | 3v3. Hunter + 2 runners per side = real tactics. |
| Max | 8 | 4v4. Beyond this the cage + intermission pacing drags. |
| Must stay even + balanced | bots fill short team | odd humans → bot joins short side; a 3v2 start is refused by the balancer anyway. |

## Behavior spec
- **Cage (3s):** hunters use the freeze to *plan*: hard hunter picks its first target during the cage (nearest enemy spawn side) and pre-aims (face the exit, no movement — looks intentional, not frozen). Runners use it to scatter to spread positions (currently they stand at spawn — fix: scatter targets assigned at round init).
- **Hunter bots:** nearest enemy runner, with round-score awareness: if our team leads the tournament, hunter plays safe (chase nearest, no deep dives into enemy packs); if trailing, hunter takes risks (dive the pack, trade escape for a tag — capture points matter more than survival when behind). Never touch teammates or the enemy hunter (already ✓ — regression-guard it, this is the branch that breaks most often).
- **Runner bots:** flee enemy hunter + stay spread (same 100px separation as infection — one tag must not double). If OUR hunter just tagged someone (enemy team disrupted), push aggressive for 3s (steal map control while they're regrouping). If WE are the last runner alive, go full survival (pads, verticality, no heroics — survival points are banked).
- **Round transitions:** on `hunter_round_result`, bots reset claims + scatter targets (no carrying grudges or stale `exitX` across rounds — this is where today's stale-state bugs live). During 15s intermission, zero input (hold).
- **Eliminated bots:** idle is correct (they're out). In all-bot watch matches, auto-switch the "camera"… no camera exists — skip; note as future (spectate-target for bots is a renderer feature, not brain).
- **Match point:** if it's the final round and our team trails, both hunter and runners go all-in (no safe play). If we lead, runners play pure survival, hunter contains.

## Difficulty in this mode
- easy: no cage planning (stand), no score awareness, no spread discipline (stacks happen, tags chain — honest weakness).
- normal: scatter + spread + safe/trailing basics.
- hard: full spec including cage pre-aim and match-point gears.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Cage | 3s plan window | hunters pre-aim, runners scatter |
| Runner spread | 100px min separation | anti-chain |
| Aggro window (post-tag) | 3s map push | |
| Match-point trigger | final round + trailing/leading | all-in / contain |

## Acceptance tests
- Cage: hunter faces arena (not a wall) at break, 9/10 runs.
- Round transition: no bot idle->3s *caused by stale state* (claims cleared — assert via fresh-target time <2s).
- 3v3 all-bot tournament: completes 3 rounds, scores accumulate, winner declared, no round stalls.
- Hunter bot never tags teammate over 3 matches (regression guard on the cross-team predicate).

## Decisions needed
- [ ] Runners scatter during cage (changes spawn-camp meta — yes recommended)?
- [ ] Match-point all-in/contain gears (drama vs predictability)?
- [ ] Round-state guard in `botInputFor` (bots hold during result/intermission — needed, verify current behavior first)?
