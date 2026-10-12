# Bot Plan — 08 Capture the Flag

> The only mode with *objectives*. Brains get job titles: Carrier, Hunter, Guard, Runner. Biggest think in the set — do it last.

## Mode recap
- 2 teams, first to 3 captures (default). Flags home/carried/dropped; pickup r=34 (+2s shield); capture needs own flag home, r=42; carrier tagged → flag instantly returns + carrier respawns (1.5s) + shield; dropped flag: teammate touch returns it, enemy re-grabs, 20s auto-return. Sudden death on tie. Tag path `checkCtfTag` (no guest guard — host-side only concern). Carriers run 504, everyone else 582 (`bot_engine.js:1290`). Min 2 + balanced teams (`wiring.js:199`); CTF forces teams + alternates slots (`wiring.js:151`).
- Only live `*BotThink`: `ctfBotThink` returns `{isIt, target}` — carry→home/evade, chase own-flag carrier, escort, steal (`ctf.js:1349–1404`). Blind to `dropTimer`, `shieldT`, sudden death.

## Bots today
- Best-shaped brain in the game (real priorities!), but movement is generic chase underneath, and there's no *role split*: all 3 teammates do the same think, so nobody guards home and carrier escorts are accidental.

## Roster
| | Count | Notes |
|---|---|---|
| Min | 4 | 2v2 (min legal). One flag run at a time; fine. |
| Ideal | 6 | 3v3 — one of each job per team. The mode as designed. |
| Max | 10 | 5v5 full lobby chaos; the directory server lists 10-slot rooms, let them cook. |
| Solo | 1 human + 5 bots (3v3) | human plays any job; bots fill the other five. Default human = attacker (most fun). |

## Behavior spec — job system
At round start (and on every capture/wipe), each team's bots are assigned jobs by count:
- **3v3:** 1 Carrier-hunter (steal enemy flag), 1 Guard (stay within 250px of home flag, engage intruders), 1 Flex (escort own carrier if there is one, else second attacker). Human takes any job; bots fill the rest (human attacker → bots guard+flex).
- **2v2:** 1 attacker + 1 flex (flex guards only while own flag is home AND no carrier to escort).
- **4v4+:** 2 attackers, 1 guard, rest flex. **5v5:** +1 dedicated carrier-escort.
- Job reassignment triggers: our flag taken (flex→retrieve: nearest flex abandons escort, hunts OUR carrier-holder), our carrier exists (nearest flex→escort: body-block between carrier and nearest enemy, don't touch the carrier), flag dropped (nearest bot→recover: touch it if teammate's, grab if enemy's — check `dropTimer`: if <3s left, let it auto-return and hold position instead (hard only)).
- **Carrier bot:** runs home by the *safest* route (max distance from visible enemies, pads if clear), never doubles back through the enemy that just missed; if own flag is NOT home, do NOT run the capture — detour to midfield and wait (running into a blocked capture wastes the run; today's bots don't know the precondition). Juke: if chased within 150px, cut toward nearest teammate (pass the problem to the escort).
- **Guard bot:** holds home, engages intruders within 300px, never chases past midfield (the classic bot sin — guard abandoning post). If our flag is taken, guard becomes retriever (see above) and the *flex* drops back to guard.
- **Attacker bot:** steals when path is clear-ish (≤1 defender within 250px of enemy flag); if 2+ defenders, wait at 300px for flex pressure (don't feed). After grabbing: you are the carrier now (see carrier rules).
- **Sudden death:** all jobs collapse to one rule — nearest bot on each team sprints the enemy flag, everyone else escorts/guards by proximity. No cute plays in overtime.
- **Shield respect:** don't chase a target with `shieldT > 0.5s` (peel to objectives instead); re-engage on expiry. Today's bots don't see shields at all.

## Difficulty in this mode
- easy: no jobs (all flex-chase like today), no shield respect, guards chase past midfield (exploitable — correctly so).
- normal: jobs on, no dropTimer play, no precondition detour (carriers run into blocked captures sometimes).
- hard: full spec. A hard 3v3 should beat two casual humans sometimes — that's the bar.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Guard radius | 250px home | |
| Guard leash | midfield | never cross chasing |
| Attacker patience | ≤1 defender in 250px | else wait for flex |
| Drop auto-return play | <3s left, hold | hard only |
| Escort offset | between carrier + nearest enemy | body-block, no touch |
| Reassignment | on capture/take/drop | event-driven, not per-think |

## Acceptance tests
- 3v3 all-bot: a capture occurs within 90s (objectives work); guard bot crosses midfield <3 times per match (leash holds).
- Carrier bot with own flag away: does NOT enter capture radius (precondition known).
- Dropped-flag scenario: teammate within 400px recovers before 20s auto-return (9/10, hard).
- Sudden death: both teams' nearest bots converge on flags within 5s of trigger.
- Easy 3v3 vs normal 3v3 (mirror): normal wins 3/3 (difficulty honesty).

## Decisions needed
- [ ] Job system with event-driven reassignment (recommended — it's the whole file)?
- [ ] Solo default human = attacker with 5 bots (recommended)?
- [ ] Guard leash at midfield even when losing late (or all-out in last 30s — pick one)?
- [ ] Max 10 for CTF full-lobby chaos (recommended yes)?
