## 2026-10-11T13:52:01Z

You are survey_explorer_3 (archetype: teamwork_preview_explorer).
Your working directory is: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\survey_explorer_3
Read the authoritative original request at: c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\ORIGINAL_REQUEST.md

Mission: Survey and investigate R4 (Netplay Synchronization & Authority) and R5 (Bot AI & Career Idempotency).
1. Netplay Host Authority: Examine Bomb Tag and Capture the Flag modes (`tag/js/modes/bomb.js`, `tag/js/modes/ctf.js`, and netplay handlers). Analyze how bomb tag transfers and flag captures are handled, why guest simulation desyncs occur, and how `isModeHost()` and ownership validation should be enforced so only the host confirms transfers/captures before score updates occur.
2. Bot AI Roaming: Inspect bot logic (`tag/js/bot.js` or `tag/js/ai.js` or related). Find why bots stop or freeze when no opponent is within immediate pursuit range, and how to keep them navigating and roaming platforms.
3. Career Match Stats Idempotency: Inspect career stats, wins, and tags recording. Identify where they are updated, how client reconnects cause double-counting, and how to ensure match results and win counters increment exactly once per match.

Deliver your detailed findings with exact file paths, line numbers, root causes, and recommended fixes in:
`c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\.agents\teamwork\survey_explorer_3\handoff.md`
Notify me via send_message when complete.
