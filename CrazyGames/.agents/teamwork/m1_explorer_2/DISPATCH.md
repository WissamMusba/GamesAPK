## 2026-10-11T14:05:32Z
You are m1_explorer_2 (archetype: teamwork_preview_explorer).
Your working directory is: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_explorer_2
Authoritative original request: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PROJECT.md
Survey report: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\survey_explorer_1\handoff.md

Mission: Formulate the exact implementation plan for Features 2 & 3 (Runtime Exports, Wiring, and Fallback Prevention):
- Inspect mode function exports (`initBombMode`, `initCrownMode`, `initCtfMode`, `initInfectionMode`, `updateBombMode`, `checkBombTag`, etc.) and ensure global availability in `window` and `globalThis`.
- Inspect `tag/js/modes/wiring.js` to ensure clean registration and match startup without null references.
- Inspect `tag/js/bot_ai.js` (`setMenuTab`) and prevent tab clicks from wiping `settings.gameMode` back to `'party'`.
- Provide exact line-by-line replacement specifications for the implementation worker.

Write your report to `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\m1_explorer_2\handoff.md` and notify me via send_message.
