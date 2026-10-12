# BRIEFING — 2026-10-11T14:16:00Z

## Mission
Formulate exact implementation plan for Features 2 & 3: Runtime Exports, Wiring, and Fallback Prevention (mode function exports, wiring.js, and bot_ai.js setMenuTab).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, investigator, planner
- Working directory: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_explorer_2
- Original parent: 13637b41-e562-47bd-8465-98973cc81ef1
- Milestone: M1 - Features 2 & 3 Deep Dive & Implementation Plan

## 🔒 Key Constraints
- Read-only investigation — do NOT modify game source code files
- Provide exact line-by-line replacement specifications for implementation worker
- Write handoff report following 5-component protocol

## Current Parent
- Conversation ID: 13637b41-e562-47bd-8465-98973cc81ef1
- Updated: 2026-10-11T14:16:00Z

## Investigation State
- **Explored paths**:
  - `tag/js/modes/bomb.js`, `tag/js/modes/crown.js`, `tag/js/modes/ctf.js`, `tag/js/modes/infection.js`, `tag/js/modes/wiring.js`
  - `tag-server/js/modes/*`, `PokiGames/js/modes/*`
  - `tag/js/bot_ai.js`, `tag/js/gameplay.js`, `tag/js/ui.js`, `tag/js/match.js`, `tag/js/renderer.js`
- **Key findings**:
  - `bomb.js`, `crown.js`, `ctf.js`, and `infection.js` have disparate global attachment approaches. Specifically, `crown.js` guards `attachCrownModeHooks()` with `if (typeof window !== 'undefined')`, failing in headless or Node environments.
  - `wiring.js` samples mode symbols once into top-level lexical `var`s; if scripts evaluate out of order or before globals are defined, these become permanently `null`.
  - In `wiring.js:startMatch()`, mode startup relies on static `typeof initXMode === 'function'` without dynamic fallback.
  - `wiring.js:startMatch()` clears stale flags for `BOMB_MODE`, `crownState`, and `ctfState`, but neglects `infectionState`.
  - In `bot_ai.js:setMenuTab()`, clicking Solo or Bots tab aggressively overwrites `settings.gameMode = 'party'`, destroying user selections of Bomb, Crown, CTF, and Infection.
  - In `wiring.js:startMatch()`, `soloModes` and `botModes` lack `'infection'`, reverting infection matches back to party.
- **Unexplored areas**: None for Features 2 & 3.

## Key Decisions Made
- Formulate uniform multi-target export pattern across all 4 mode modules attaching to `window`, `globalThis`, and `root`.
- Formulate dynamic lookup helper `getModeHook(name)` and `refreshModeBindings()` in `wiring.js` with module exports.
- Update `setMenuTab` in `bot_ai.js` to preserve `settings.gameMode` if it belongs to valid supported modes (`['party', 'bomb', 'crown', 'ctf', 'infection']`).
- Add `'infection'` to `soloModes` and `botModes` in `wiring.js:startMatch()` and `bot_ai.js:setGameMode()`.

## Artifact Index
- DISPATCH.md — Incoming mission dispatch
- BRIEFING.md — Persistent context & state
- progress.md — Liveness heartbeat
- handoff.md — 5-component handoff report with exact line-by-line replacement specs
