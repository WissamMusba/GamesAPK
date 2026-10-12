# Bot Plan — 02 Teams (party team variant)

> Same chase as party, but IT-ness is a team jersey. Bots must learn "us vs them".

## Mode recap
- `settings.teams` + `match.itTeam`: the whole IT team hunts together; `teamItTime[itTeam] += dt` (`gameplay.js:391`); lowest time wins (`career.js:198`). Tag path `hunter.js:963` (all IT-team members can tag). Speeds: single `match.players[match.it]` gets 582 (`bot_engine.js:1277`) — **mismatch**: the AI treats every IT-team mate as a hunter but only one gets hunter speed.

## Bots today
- Hunter-team bot: nearest enemy runner (`bot_engine.js:414–429`, skips teammates ✓).
- Runner-team bot: flees nearest IT-team member (`:430–459`).
- Gaps: the speed mismatch (slow hunter teammates can't catch what the brain promises), no focus (all hunters chase one runner), no concept of "spread the IT time".

## Roster
| | Count | Notes |
|---|---|---|
| Min | 2 (1v1 across teams) | degenerate but legal. |
| Ideal | 4–6, even | 2v2 or 3v3. Bots auto-fill the short team first (balance > count). |
| Max | 8 (4v4) | 5v5 exceeds readability; cap lobby at 8 for teams. |
| Odd humans | bots take the short side | e.g. 2 humans + 1 bot → bot joins the solo human (2v2). Never 3v1. |

## Behavior spec
- **Fix the speed rule first:** hunter speed goes to *every* IT-team member (change `bot_engine.js:1277` predicate to team-aware). Without this, no brain tuning matters — slow hunters literally cannot execute.
- **Hunter-team bots:** claim table per enemy runner (one Hound each, overflow becomes Anvils on the closest race). If our team is *winning* (lowest time), hunters play contain (stay between runners and pads) rather than all-out chase — running up the score is unsporting and unfun.
- **Runner-team bots:** flee nearest hunter; if two hunters converge, break toward the farther one's blind side (use Anvil-in-reverse: run *through* the gap between them). Stay loosely grouped (within ~400px of a teammate) so one hunter can't isolate — but never stack (min 80px separation, else one tag chains).
- **Endgame:** if timer <15s and our team is IT, hunters go all-in (no contain); if we're runners and ahead, runners go full evasion (pads allowed even off-route).

## Difficulty in this mode
- easy: no contain/grouping logic, greedy only; team plays like 3 individuals.
- normal: claims on, grouping on, contain off.
- hard: full spec. Team play should be visibly coordinated (pincer + contain reads as "smart" on stream).

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Group radius | 400px | runner-team cohesion |
| Min separation | 80px | anti-chain |
| Contain trigger | winning + >60s left | else all-out |
| All-in trigger | <15s left | both sides |

## Acceptance tests
- 3v3 all-bot: no team leads by >40% IT-time at halfway (balance check); zero idle->3s.
- 2 humans + 2 bots: bots land on opposite teams (fill-short-side rule).
- Hunter-team bot top speed == 582 (predicate fix verified).

## Decisions needed
- [ ] Hunter speed for ALL IT-team members (required — yes recommended)?
- [ ] Cap teams lobbies at 8?
- [ ] Contain-when-winning behavior (smart but can feel like bots "stop trying" — keep with clear visual, e.g. hunters slow near runners)?
