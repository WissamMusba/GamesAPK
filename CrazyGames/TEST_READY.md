# TAG! E2E Test Suite Readiness Report

## Status: READY FOR MILESTONE VERIFICATION

The automated E2E test harness and test suite under `tests/e2e/` is fully designed, implemented, and verified.
All tests execute under a single command:

```bash
node tests/e2e/runner.js
```

## Test Inventory Summary

| Tier | Category | Tests | Current Passed | Current Failed | Purpose |
|---|---|---|---|---|---|
| **Tier 1** | Feature Coverage (F1-F15) | 77 | 31 | 46 | Primary requirements verification (R1-R5) |
| **Tier 2** | Boundary & Corner Cases (F1-F15) | 75 | 58 | 17 | Edge cases, malformed packets, extreme inputs |
| **Tier 3** | Cross-Feature Combinations | 15 | 8 | 7 | Pairwise interactions between features |
| **Tier 4** | Real-World Match Scenarios | 5 | 3 | 2 | End-to-end match lifecycles from start to finish |
| **TOTAL** | **Full E2E Suite** | **172** | **100** | **72** | **Full Regression & Acceptance Testing** |

## Baseline Verification Results
- **Runner Stability**: 100% clean execution without unhandled exceptions or runner crashes.
- **Duration**: ~25 seconds for full 172-test suite execution; sub-second for single-feature verification (`--feature=N`).
- **Pass / Fail Baseline**:
  - **100 tests PASS**: Confirming engine baselines, mathematical collisions, storage recovery, boundary guards, and syntax of already-valid files.
  - **72 tests FAIL**: Accurately detecting and isolating the exact defects specified in `ORIGINAL_REQUEST.md` (R1-R5) and `PROJECT.md` (Features 1-15). As implementing agents complete Milestones M1 through M5, failing tests will turn green.

---

## Milestone Verification Mapping

Implementing agents must verify their changes against the targeted test commands below:

### Milestone M1: Syntax Parsing & Game Mode Execution (Features 1, 2, 3, 4)
- **Target Command**: `node tests/e2e/runner.js --feature=1`, `--feature=2`, `--feature=3`, `--feature=4`
- **Criteria**:
  - `checkSyntax` passes (exit code 0) for `match.js`, `bomb.js`, `crown.js`, `ctf.js`, `infection.js`, and `PokiGames/js/audio.js`.
  - Mode exports (`initBombMode`, `initCrownMode`, `initCtfMode`, `initInfectionMode`) are registered in `wiring.js`.
  - Selecting Bomb, Crown, CTF, or Infection does not fall back to Party mode in solo or bot tabs.
  - Infection mode is unlocked in `soloModes`, `botModes`, `cycleGameMode`, and bot thinker.

### Milestone M2: Security Hardening & Secret Removal (Features 5, 6, 7)
- **Target Command**: `node tests/e2e/runner.js --feature=5`, `--feature=6`, `--feature=7`
- **Criteria**:
  - Zero Discord webhook URLs (`discord.com/api/webhooks`) in `tag/js/netplay.js`, `tag-server/js/netplay.js`, and `PokiGames/js/netplay.js`.
  - `netOnData` rejects non-host commands (`to_menu`, `kicked`, `start`) and validates guest slot ownership on `tag_claim`, `team`, and `color`.
  - `POST /api/rooms/close` in `tag-server/server.js` requires host identity authentication.

### Milestone M3: Gameplay & UI Bug Resolution (Features 8, 9, 10, 11)
- **Target Command**: `node tests/e2e/runner.js --feature=8`, `--feature=9`, `--feature=10`, `--feature=11`
- **Criteria**:
  - Pressing 1, 2, or 3 during match result state casts map votes without calling `selectMapQuick` or restarting the match.
  - Pause menu navigation wraps modulo 4 for online guests and modulo 6 for hosts.
  - Touch devices preserve player slots 2 and 3 in multiplayer lobbies (removal of `menu.slotColor[2] = -1; menu.slotColor[3] = -1`).
  - Infection HUD control bar draws Pause, Mute, Fullscreen, Voice, and Chat buttons without premature early return in `ui.js:drawHUD()`.

### Milestone M4: Netplay Synchronization & Authority (Features 12, 13)
- **Target Command**: `node tests/e2e/runner.js --feature=12`, `--feature=13`
- **Criteria**:
  - `checkBombTag` and `checkCtfTag` enforce `isModeHost()` checks.
  - Bomb detonation and CTF flag scores are calculated and awarded exclusively by the authoritative host.
  - Guest `tag_claim` messages are spatially validated by the host within RTT tolerance.

### Milestone M5: Bot AI & Career Idempotency (Features 14, 15)
- **Target Command**: `node tests/e2e/runner.js --feature=14`, `--feature=15`
- **Criteria**:
  - Bots autonomously roam platforms using waypoints when `!target` and do not freeze when opponents are distant (`holdHighGround` distance-gated).
  - `careerRecordMatch` accepts `matchUid` and enforces deduplication (`CAREER.lastRecordedMatchUid === matchUid`), ensuring career stats, wins, and tags increment exactly once per match.
  - `match._careerRecorded` prevents duplicate multi-frame invocations in `endMatch()`.

### Milestone M6: Final Verification & Acceptance
- **Target Command**: `node tests/e2e/runner.js`
- **Criteria**: 100% of all 172 tests across Tiers 1-4 pass with zero failures and exit code 0.

---

## Defect Escalation Index (Observed Bugs)

The test suite has isolated and documented the following specific defects for implementing agents:

| # | Feature | Defect Description | Target File & Location | Escalated To |
|---|---|---|---|---|
| 1 | F1 | Unclosed comment `/* =================...` at line 144 causing syntax error | `tag/js/match.js:144` | M1 Implementer |
| 2 | F1 | Missing comment opening `/*` on line 1, unclosed comment at line 1185 | `tag/js/modes/bomb.js:1,1185` | M1 Implementer |
| 3 | F1 | Missing comment opening `/*` on line 1 | `tag/js/modes/crown.js:1` | M1 Implementer |
| 4 | F1 | Missing comment opening `/*` on line 1 | `tag/js/modes/ctf.js:1` | M1 Implementer |
| 5 | F1 | Missing comment opening `/*` on line 1 | `tag/js/modes/infection.js:1` | M1 Implementer |
| 6 | F1 | Identifier `_cgBoot` re-declared with `let` at line 54 | `PokiGames/js/audio.js:54` | M1 Implementer |
| 7 | F3 | `soloModes` and `botModes` lack `'infection'`, causing fallback to `'party'` | `tag/js/modes/wiring.js:68,75` | M1 Implementer |
| 8 | F5 | 9 active Discord webhook URLs exposed in client scripts | `tag/js/netplay.js:232-239`, `PokiGames/js/netplay.js:232-239`, `tag-server/js/netplay.js:232-239` | M2 Implementer |
| 9 | F6 | `netOnData` accepts `to_menu`, `kicked`, `start` from guests without host check | `tag/js/netplay.js:2824` | M2 Implementer |
| 10 | F7 | `POST /api/rooms/close` allows unauthenticated room deletion by any caller | `tag-server/server.js:148` | M2 Implementer |
| 11 | F8 | `selectMapQuick(k-1)` runs on digit keys during `match.state === 'result'` | `tag/js/gameplay.js:133` | M3 Implementer |
| 12 | F9 | Pause menu up/down navigation uses `% 6` unconditionally for guests (4 items) | `tag/js/gameplay.js:140-141` | M3 Implementer |
| 13 | F10 | `isTouch` unconditionally clamps `menu.slotColor[2] = -1; menu.slotColor[3] = -1;` | `tag/js/ui.js:1562` | M3 Implementer |
| 14 | F11 | `drawHUD` early returns when `settings.gameMode === 'infection'`, skipping control bar | `tag/js/ui.js:3046` | M3 Implementer |
| 15 | F12 | `checkBombTag` lacks `isModeHost()` check, allowing guest simulation desync | `tag/js/modes/bomb.js:611` | M4 Implementer |
| 16 | F13 | `checkCtfTag` lacks `isModeHost()` check, allowing guest flag return desync | `tag/js/modes/ctf.js:567` | M4 Implementer |
| 17 | F14 | `holdHighGround` lacks distance check against hunter, causing bots to freeze on platforms | `tag/js/bot_engine.js:803` | M5 Implementer |
| 18 | F15 | `careerRecordMatch` lacks `matchUid` tracking and deduplication guard | `tag/js/career.js:76` | M5 Implementer |
| 19 | F15 | `endMatch` lacks `match._careerRecorded` check, causing double counting | `tag/js/career.js:215` | M5 Implementer |
