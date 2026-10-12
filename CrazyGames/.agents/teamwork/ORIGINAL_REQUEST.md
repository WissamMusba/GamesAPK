# Original User Request

## 2026-10-11T13:49:36Z

Perform a comprehensive multi-part overhaul of the TAG! game codebase to fix verified syntax parsing errors, eliminate exposed security secrets, resolve critical gameplay/UI bugs, enforce host netcode authority, and stabilize bot AI.

Working directory: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames
Integrity mode: development

## Requirements

### R1. Syntax Parsing & Game Mode Execution
Eliminate all syntax parsing errors across the modular JavaScript codebase (`tag/js/match.js`, `tag/js/modes/infection.js`, `tag/js/modes/bomb.js`, `tag/js/modes/crown.js`, `tag/js/modes/ctf.js`) so that `node --check` succeeds across all files. Ensure mode initialization and runtime exports execute properly so selecting Bomb, Crown, CTF, or Infection runs the authentic game mode rather than falling back to default Party mode.

### R2. Security Hardening & Secret Removal
Purge all hardcoded Discord webhook URLs and sensitive endpoints from all client-facing scripts (`tag/js/`, `tag-server/`, and `PokiGames/`). Stub out or safely route telemetry so no raw secrets or credentials are visible in browser developer tools or source code. Enforce sender validation on peer messages to prevent unauthorized room closure or player impersonation.

### R3. Gameplay & UI Bug Resolution
- Gate quick-restart key handlers during the end-of-match state so number keys 1, 2, and 3 record votes for the respective maps instead of immediately restarting the match.
- Fix menu row navigation wrapping in the pause menu for all player roles.
- Remove or correct the touch-device slot clamp in `ui.js` that removes players 3 and 4 in multiplayer lobbies.
- Restore the full control overlay (Pause, Mute, Chat, Scoreboard) to Infection mode.

### R4. Netplay Synchronization & Authority
Enforce host-authoritative tag and scoring claims across Bomb Tag and Capture the Flag modes using host guards (`isModeHost()`) and ownership validation, preventing guest simulation desyncs and split-brain host conflicts.

### R5. Bot AI & Career Idempotency
Ensure bot AI remains active and roams gracefully when no opponent is within immediate pursuit range. Ensure career match stats, wins, and tags are recorded once per match without double-counting on client reconnects.

## Acceptance Criteria

### Syntax & Parse Verification
- [ ] Automated verification script running `node --check` passes with exit code 0 across every file in `tag/js/` and `tag/js/modes/`.
- [ ] Initializing matches in `bomb`, `crown`, `ctf`, and `infection` modes sets up the respective mode state and functions without reverting to Party mode.

### Security Sanitization
- [ ] Zero Discord webhook URLs (`discord.com/api/webhooks`) remain anywhere in `tag/`, `PokiGames/`, or `tag-server/`.
- [ ] Network handlers verify peer identity before accepting room termination or state-altering commands.

### Gameplay & Controls
- [ ] Pressing 1, 2, or 3 during the post-match map vote casts a vote without restarting the match.
- [ ] 3-player and 4-player lobbies on touch/mobile preserve all player slots across frames.
- [ ] Infection mode HUD displays the full set of action buttons (Pause, Mute, Chat).

### Multiplayer & Bot Stability
- [ ] Bomb tag transfers and CTF flag captures are confirmed by the host before score updates occur.
- [ ] Bots continuously navigate and explore platforms rather than freezing when enemies are distant.
- [ ] Career match results and win counters increment exactly once per match.
