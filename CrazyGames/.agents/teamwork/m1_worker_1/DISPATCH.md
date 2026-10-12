## 2026-10-11T14:17:49Z
You are m1_worker_1 (archetype: teamwork_preview_worker).
Your working directory is: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_worker_1
Read the authoritative original request at: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PROJECT.md

Read the three Explorer handoff reports:
1. c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_explorer_1\handoff.md (exact syntax fixes for all 16 files + sync-platforms.js)
2. c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_explorer_2\handoff.md (runtime exports, dynamic wiring, fallback prevention in wiring.js and bot_ai.js)
3. c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_explorer_3\handoff.md (unlocking infection in wiring.js, bot_ai.js, ui.js, netplay.js)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission: Implement Milestone 1 (Features 1, 2, 3, 4):
1. Apply the syntax fixes to match.js, bomb.js, crown.js, ctf.js, infection.js (across tag/js/, tag-server/js/, PokiGames/js/), PokiGames/js/audio.js, and sync-platforms.js.
2. Apply the multi-target global exports in bomb.js, crown.js, ctf.js, infection.js (across tag/js/, tag-server/js/, PokiGames/js/).
3. Apply the dynamic wiring bindings (getModeHook, refreshModeBindings) and mode setup in wiring.js (across tag/js/, tag-server/js/, PokiGames/js/).
4. Apply the fallback prevention fixes in bot_ai.js (setMenuTab preserving selected mode) and wiring.js.
5. Apply Infection mode unlocking across wiring.js, bot_ai.js, ui.js, and netplay.js (across tag/js/, tag-server/js/, PokiGames/js/).
6. Run `node --check` across every .js file in tag/js/, tag-server/js/, PokiGames/js/. Verify 100% pass with exit code 0.
7. Verify that initializing matches in bomb, crown, ctf, and infection modes sets up the respective mode state and functions without reverting to Party mode.
8. Deliver handoff report with verification commands, outputs, and diff summary in:
`c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_worker_1\handoff.md`
Notify me via send_message when complete.
