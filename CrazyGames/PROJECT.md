# Project: TAG! Game Codebase Overhaul

## Architecture
The TAG! project consists of a client-side vanilla JavaScript modular engine (`tag/js/`), server signaling and room management (`tag-server/`), and Poki platform integration build (`PokiGames/`).
- `tag/js/`: Client core engine, state machines, physics, rendering, menus, and modes:
  - `match.js`: Match data structures, player state factories, and round lifecycle.
  - `modes/`: Game mode implementations (`infection.js`, `bomb.js`, `crown.js`, `ctf.js`, `hunter.js`, `wiring.js`).
  - `netplay.js`: WebRTC/PeerJS peer-to-peer networking, packet codecs, room synchronization, and telemetry.
  - `gameplay.js`: Main match input loop, weapon/powerup updates, pause controls, and map vote listeners.
  - `ui.js`: HUD rendering, action overlays, menus, lobby management, scoreboard, and touch layouts.
  - `bot_engine.js` & `bot_ai.js`: Bot AI navigation, decision graphs, roaming heuristics, and menu state.
  - `career.js`: Persistent stats, match records, trophies, and save/load management.
- `tag-server/`: Node.js signaling, room matchmaking directory (`server.js`), and mirror client scripts.
- `PokiGames/`: Poki SDK distribution build and platform-specific audio/netplay adapters.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Syntax Fixes Across Codebase | Fix unclosed/missing comment syntax errors in `match.js`, `bomb.js`, `crown.js`, `ctf.js`, `infection.js`, and `PokiGames/js/audio.js` so `node --check` succeeds with exit code 0 | M1 | Survey R1 |
| 2 | Game Mode Runtime Exports & Init | Ensure mode functions (`initBombMode`, `initCrownMode`, `initCtfMode`, `initInfectionMode`) are exported and registered properly in `wiring.js` | M1 | Survey R1 |
| 3 | Mode Selection Fallback Prevention | Ensure selecting Bomb, Crown, CTF, or Infection executes the genuine game mode and does not revert to Party mode across solo, bots, and party menus | M1 | Survey R1 |
| 4 | Infection Mode Unlocking & Wiring | Add Infection to `soloModes`, `botModes`, and `cycleGameMode`; remove "coming soon" locks in `bot_ai.js` and `ui.js` | M1 | Survey R1 |
| 5 | Discord Webhook Secret Elimination | Purge all 9 hardcoded Discord webhook URLs from `tag/js/netplay.js`, `tag-server/js/netplay.js`, and `PokiGames/js/netplay.js`; stub telemetry safely | M2 | Survey R2 |
| 6 | Netplay Peer Identity Validation | Enforce sender validation in `netOnData` (`tag/js/netplay.js`) for host-only commands (`to_menu`, `kicked`, `full`, `start`) and guest actions (`p_state`, `tag_claim`, `team`, `ready`, `color`, `votes`) | M2 | Survey R2 |
| 7 | Signaling Server Room Closure Auth | Secure `POST /api/rooms/close` in `tag-server/server.js` against unauthorized closure via host verification | M2 | Survey R2 |
| 8 | Post-Match Map Vote Hotkeys | Gate `selectMapQuick` key handlers (1-3) in `gameplay.js` during match result state so pressing 1, 2, or 3 casts votes without restarting the match | M3 | Survey R3 |
| 9 | Pause Menu Navigation Wrapping | Fix menu row wrapping in pause menu for online guests (4 items) and host/local (6 items) in `gameplay.js`, `ui.js`, and `main.js` | M3 | Survey R3 |
| 10 | Touch Slot Clamping Removal | Remove per-frame `menu.slotColor[2] = -1; menu.slotColor[3] = -1;` clamp and allow 3-4 players in touch lobbies in `ui.js` | M3 | Survey R3 |
| 11 | Infection HUD Control Overlay | Restore action control overlay (Pause, Mute, Fullscreen, Voice, Chat, Scoreboard) to Infection mode by replacing early return in `ui.js:drawHUD()` | M3 | Survey R3 |
| 12 | Host Authority in Bomb Tag | Enforce `isModeHost()` checks in `checkBombTag` (`bomb.js`), detonate carrier only on host, and handle guest `tag_claim` with spatial validation | M4 | Survey R4 |
| 13 | Host Authority in Capture the Flag | Enforce `isModeHost()` checks in `checkCtfTag` (`ctf.js`) and `triggerCtfWin()`, preventing guest split-brain desyncs | M4 | Survey R4 |
| 14 | Bot AI Autonomous Roaming | Provide autonomous platform waypoint roaming in `bot_engine.js` when `!target` and distance-gate `holdHighGround` to prevent bot freezing | M5 | Survey R5 |
| 15 | Career Stats Recording Idempotency | Enforce `matchUid` tracking and `_careerRecorded` gating across `career.js` and `netplay.js` to ensure stats/wins increment exactly once per match | M5 | Survey R5 |
| 16 | E2E Test Infrastructure & Test Suite | Design opaque-box automated test harness covering Tiers 1-4 across all 15 features, emitting `TEST_READY.md` | E2E | Dual Track |
| 17 | Final Acceptance & Adversarial Hardening | Execute full test suite, pass 100% of E2E tests, and harden coverage with adversarial challenger verification | M6 | Final Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Syntax Parsing & Game Mode Execution | Features 1, 2, 3, 4 | none | PLANNED |
| M2 | Security Hardening & Secret Removal | Features 5, 6, 7 | none | PLANNED |
| M3 | Gameplay & UI Bug Resolution | Features 8, 9, 10, 11 | M1 | PLANNED |
| M4 | Netplay Synchronization & Authority | Features 12, 13 | M1 | PLANNED |
| M5 | Bot AI & Career Idempotency | Features 14, 15 | M1 | PLANNED |
| E2E | E2E Testing Track | Feature 16 | none | IN_PROGRESS |
| M6 | Final Verification & Hardening | Feature 17 | M1, M2, M3, M4, M5, E2E | PLANNED |

## Code Layout
- `tag/js/match.js`: Player initialization, match state definitions.
- `tag/js/modes/`: Game mode logic (`bomb.js`, `crown.js`, `ctf.js`, `infection.js`, `hunter.js`, `wiring.js`).
- `tag/js/netplay.js`: Networking, WebRTC signaling, telemetry config, peer message routing.
- `tag/js/gameplay.js`: Match input routing, pause menu navigation, quick map selection.
- `tag/js/ui.js`: Canvas drawing, HUD action controls, pause menu render, lobby slot setup.
- `tag/js/bot_engine.js` & `tag/js/bot_ai.js`: Bot navigation, high-ground logic, platform jumping, menu tab hooks.
- `tag/js/career.js`: Career persistence, match recording idempotency.
- `tag-server/`: Node.js server (`server.js`), API routes, mirrored client files.
- `PokiGames/`: Poki export files (`audio.js`, `netplay.js`, etc.).
- `tests/e2e/`: Automated E2E test harness and suite.

## Interface Contracts
### `isModeHost()`
```javascript
function isModeHost() {
  if (typeof NET === 'undefined' || !NET || NET.role === null) return true;
  return !!NET.isHost;
}
```
Available across all modes, client modules, and tests to determine whether the local instance has authoritative simulation rights.

### `careerRecordMatch(won, myTags, mySurv, matchUid)`
```javascript
function careerRecordMatch(won, myTags, mySurv, matchUid)
```
Guarded by `CAREER.lastRecordedMatchUid === matchUid` ensuring exactly-once execution per match UID across host/guest sync and reconnects.

### `tag_claim` Netplay Protocol
Guest -> Host: `{ t: 'tag_claim', from: number, target: number, x: number, y: number, hx: number, hy: number, tx: number, ty: number }`
Host validates sender identity (`NET.peerSlots.get(c.peer) === from`), carrier status, immunity, and spatial proximity before applying tag and broadcasting authoritative state.
