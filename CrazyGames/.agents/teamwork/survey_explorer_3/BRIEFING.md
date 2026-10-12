# BRIEFING — 2026-10-11T13:58:00Z

## Mission
Survey and investigate R4 (Netplay Synchronization & Authority) and R5 (Bot AI & Career Idempotency) in the TAG! codebase.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Explorer, Investigator, Synthesizer
- Working directory: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\survey_explorer_3
- Original parent: 13637b41-e562-47bd-8465-98973cc81ef1
- Milestone: Investigation R4 & R5

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes in source code
- Strictly examine R4 (Netplay host authority for bomb tag transfers and CTF flag captures) and R5 (Bot AI roaming & Career match stats idempotency)
- Follow Handoff Protocol with 5 sections in handoff.md
- Output findings in .agents/teamwork/survey_explorer_3/handoff.md
- Use send_message to report back to parent

## Current Parent
- Conversation ID: 13637b41-e562-47bd-8465-98973cc81ef1
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `tag/js/modes/bomb.js` (lines 1-1186): `checkBombTag`, `updateBombMode`, `detonateBombHolder`
  - `tag/js/modes/ctf.js` (lines 1-1437): `updateCtf`, `checkCtfTag`, `triggerCtfWin`, flag state machine
  - `tag/js/modes/hunter.js` (lines 59-170, 816-896): `checkTag`, `endHunterRound`
  - `tag/js/netplay.js` (lines 1300-1422, 3350-3705, 5150-5230): `packModeState`, `applyModeState`, `tag_claim`, `hunter_score`, `state` packet, `startMatchNetGuest`
  - `tag/js/bot_engine.js` (lines 1-1610): `botInputFor`, `holdHighGround`, target selection, high-ground zoning, anti-camp
  - `tag/js/career.js` (lines 1-246): `careerRecordMatch`, `endMatch`, `CAREER` persistence
  - `tag/js/gameplay.js` (lines 300-410): game loop, timer expiration, `endMatch` invocation
  - `tag/js/modes/wiring.js` (lines 140-230): `startMatch`, `matchIndex` increment
- **Key findings**:
  - R4 Bomb: `checkBombTag` and `updateBombMode` run locally on guests with no host authority check; guests mutate `carrierIdx`, `passImmunity`, `tags`, and `fuse` locally, and trigger unsynchronized `_rand()` carrier selection during detonations, leading to desyncs and snap-backs.
  - R4 CTF: `checkCtfTag` lacks `isHostOrLocal` guard; guests reset flags to home base and trigger carrier respawns on local collisions without host verification.
  - R5 Bot AI: Line 462 `if(!target) return {dir:0,...}` halts bots completely when target is null. In addition, `holdHighGround` clamps runner bots to `want=0, S.dir=0` when chaser is below, suppressing gap jumping and platform traversal.
  - R5 Career: `endMatch()` calls `careerRecordMatch()` without setting `match._careerRecorded = true`, causing guest state packet handlers in `netplay.js` (line 3693) to double-record. Reconnects and midgame joins recreate `match` object without tracking previous recordings, causing repeated increments on client reconnect.
- **Unexplored areas**: None, all requirements thoroughly investigated.

## Key Decisions Made
- Formulate complete 5-component handoff report detailing exact lines, logic chains, caveats, conclusions, and concrete verification test scripts.

## Artifact Index
- DISPATCH.md — Parent instructions
- BRIEFING.md — Situational awareness
- progress.md — Liveness heartbeat and task tracker
- handoff.md — Authoritative investigation report
