# TAG! Growth + QA Audit

Scope: `tag/index.html` (12,491 lines, ~505KB single-file), plus `demo.html`, `menu_preview.html`, `editor/index.html`, `BOT-REPORT.md`, `forantigravity.md`, `temp_check.js`. Read-only. Inline script parses clean (1 block, ~497K chars, OK).

## A. Growth — top findings (finding / why it matters / recommendation / impact-effort / location)

- **A1. FTUE: instant start, zero onboarding.** Load lands on the 2–4P party menu with a live arena behind it and a giant START button; Space/Enter starts immediately and even auto-fixes a missing P2 (`index.html:2447-2458`, `8319-8321`). Perfect for portal attention spans. Gap: no tutorial, no control hints except the 2P-touch card (`8793-8895`); solo desktop visitors default to a 2-human game and must discover the SOLO tab or `B` bot toggle (`2416-2420`) by accident. *Add one-tap Quick Play vs Bot + 5s control overlay on first countdown. L/S.*
- **A2. Online join friction.** Offline needs zero identity; online needs hosting or a 6-letter code/link (`6477-6596`, `12295-12303`), joiners land as spectators (`10653-10692`). Portal users bounce at code entry. *Add one-tap quick-join into public rooms next to HOST/JOIN (`6544-6571`). M/S.*
- **A3. Uneven rematch loops.** Offline results have NEXT MAP/PLAY AGAIN/MENU (`9186-9206`, but see C1); online auto-returns to lobby after 5s (`5121-5130`); hunter intermission has START ROUND + 30s AFK auto-advance (`5154-5193`, `4816-4830`). Every dead-end/30s wait is a session exit. *Cut AFK timer to ~10–15s + add hunter-final PLAY AGAIN (currently only LOBBY/QUIT, `4692-4699`). M/S.*
- **A4. No progression or return hooks.** localStorage holds only name, custom maps, harness policy, server cache (`1220,1287,9470,9337,12459`) — no wins, tags, bests, streaks, unlocks, dailies. Hunter accolades (Apex/Ghost, `4657-4690`) are session-only. *Persist career totals + bests, show on menu/result. L/M.*
- **A5. Social/invite plumbing exists but is invisible.** Invite links, invite button, clipboard copy, `?room=` auto-join all exist (`921-928,941-947,7056,10152-10195,12295-12303`). *Surface "copy invite" during countdown/result, not just lobby. M/S.*
- **A6. Load weight is the conversion risk.** 505KB HTML + PeerJS CDN + CrazyGames SDK + 20-font Google Fonts bundle (`14-19`) blocks first paint on mobile data. DPR caps (1.5 touch/2 desktop, `112-130`) and packed net state (~66Hz, `12180-12213`) already help. *Trim font bundle to pinned family + defer PeerJS until ONLINE tab opens. M/M.*
- **A7. Mobile portrait responsive but crowded.** Narrow/short breakpoints exist (`7536-7539`, `7690-7694`), touch joysticks/sliders exist (`8629-8791`), audio unlocks on first gesture (`972-987`). Gaps: HUD bar overlaps pills/timer at 360px (C9), hunter HUD can overflow 360px (C13), fullscreen never prompted (only `O`/pause, `5001-5023,5094`). *Prompt fullscreen on touch START + fix HUD crowding. M/S–M.*
- **A8. Ads/monetization hooks are dead code.** `requestMidgame`/`requestRewarded`/banner APIs defined on CG but never called from match flow (only `gameplayStart/Stop/happytime`: `2658,2713,4173-4174,4943`). *Decide explicitly; if monetizing, fire one throttled midgame ad on result → PLAY AGAIN. M/S.*

## B. Roadmap

**5 quick wins** (measure: matches/session, session length, D1 return):
1. Quick Play vs Bot one-tap start — metric: % of solo visitors in a match in <30s up.
2. Intermission AFK 30s → 12s + hunter-final PLAY AGAIN — metric: hunter matches/session up, intermission exits down.
3. First-countdown control overlay per scheme — metric: first-match early quits down.
4. Touch fullscreen prompt on START + 360px HUD overlap fix (C9) — metric: portrait session length up.
5. Persist career totals/bests, show on menu — metric: D1/D7 return up.

**5 bigger bets** (measure: D1/D7, invites/room, session length):
1. One-tap quick-join public rooms + bot backfill — metric: online join conversion up.
2. Daily hook: rotating map/mode + streaks — metric: D1/D7 up.
3. Unlockables (trails, skins, arenas) via tags/wins — metric: matches/session up.
4. Invite nudge in countdown/result + shareable result card — metric: invites/session up.
5. Reconnection/rejoin or host migration — metric: rage-quits after disconnects down.

## C. Bugs (all NEW; prior fixes verified holding)

- **C1 — Critical. Result screen throws: `btnY`/`btnH`/`sx0`/`b3` undefined.** Finish any party/teams match → `ReferenceError`. Desktop partly saved (click-anywhere zone at `9120` registers first + Enter works); on touch PLAY AGAIN/NEXT MAP/MENU never register → soft-lock. Evidence: uses at `9179,9182,9186,9195,9204`; only `btnY/btnH` defs live in another function's scope (`4648-4649`, `9090`). Fix: define `btnY/btnH/btnW` row layout (mirror `drawHunterRoundResult:4647-4649`) before `9177`.
- **C2 — Critical. Hunter intermission throws: `redHeader/redSub/blueHeader/blueSub` used before `const` (TDZ).** Any non-final hunter round end → `ReferenceError` every frame; chips + START ROUND never render/register. Host advances only via keyboard or 30s AFK auto-advance; touch hosts wait the full 30s. Evidence: use at `4717-4718,4735-4736` vs declarations at `4724-4725,4742-4743`. Fix: move the four `const`s above first use.
- **C3 — Major. `frame()` swallows every error silently** (`12388` `}catch(err){}`). Frozen screens, zero diagnostics — this is why C1/C2 stayed hidden. Fix: `console.error(err)` + dev toast; never bare-catch the main loop.
- **C4 — Major. Host kick / move-to-waitlist mid-match leaves a ghost body.** `netKickPlayer` (`11429-11473`) and `netMovePlayerToWaitlist` (`11611-11659`) clear lobby state only; unlike the disconnect path (`10552-10582`, splices + reassigns IT), neither touches `match.players`/`match.it` — kicked avatar stays frozen but collidable. Fix: reuse the disconnect-removal routine.
- **C5 — Major. Host leave kills the whole room, no rejoin.** Host closes tab mid-match → guests get `Host disconnected → netLeaveRoom()` (`10605-10608`), room gone. Top online session-killer. Fix (big bet): rejoin-by-code grace window or host migration.
- **C6 — Minor. Guest map hotkeys desync local level before host guard.** Guest presses `1–0`/`N` → `updateMenu` digits (`2424-2431`, no guard) and `selectMapQuick` (`5073-5088`, mutates + `buildLevel()` before guest check at `5077`) rebuild locally until next host packet snaps back. Fix: guard at top of both handlers.
- **C7 — Minor. Teams result ignores ties.** Equal `teamItTime` → first enumerated team silently "wins" (`4946-4958`; hunter handles ties, party-teams doesn't). Fix: explicit TIE banner like `4652-4654`.
- **C8 — Minor. Stale vote attribution after team switches.** Votes store `{team, cand}` but team changes via `cycleTeam`/`setPlayerTeam`/`netSwapPlayerTeam` never refresh it, so `getCandidateVoteCount` (`2067-2084`) can attribute taps to the wrong team until re-vote. Fix: re-stamp or drop the slot's vote on team change.
- **C9 — Minor. 360px portrait HUD overlap (arithmetic, needs visual confirm).** Control bar starts at `xChat = CW−234` (=126px at 360) while IT pills reach ~138 and timer spans ~105–255 (`8902-8935`). Fix: collapse to 3 buttons under 420px width.
- **C10 — Minor. Hunter `tournamentStats.survival` over-credits wipes.** Survivors get flat `60` (`4227`) while scoring uses actual `elapsed` (`4203`) — a 20s wipe banks 60s survival. Fix: credit `elapsed`.
- **C11 — Minor. `resolveTeamHunter` returns slot `0` for an empty team.** Whole team leaves → `teamSlots` empty → returns `0` (`2088-2089`), possibly inactive/enemy. Fix: return `-1`/null + guard `checkTag`/HUD.
- **C12 — Minor. Duplicate spectator entries on AFK auto-demote.** `netAutoDemoteAndStart` pushes without the dup-check `netMovePlayerToWaitlist` has (`11771-11778` vs `11623`). Fix: add `some(sp => sp.peerId…)` guard.
- **C13 — Minor (unverified, needs playtest). Hunter HUD/lobby overflow on small screens.** `availW` floors at 160px×2 + timer (`4387,4430`) exceed 360px; intermission chips clamp min 28px and can overflow on 800×480 (`4746-4766`). Fix: verify on-device.
- **C14 — Minor. `tag_jump_policy_v1` never validated.** Corrupt-but-valid JSON assigned blindly (`1285-1293`), unlike custom maps (`1218-1228`). Fix: shape-check, fall back to `{}`.
- **C15 — Minor. Mid-match join snapshot covers `playing` only, not `countdown`.** `isMidgame` (`10694`) excludes countdown/paused joins → guest idles as spectator with no state. Fix: include `countdown`.

## D. Health check

**Verified working:** requested-team honor with minority fallback; vote counts filtered to active slots + team; lobby hunter rows render connected slots only with null-safe color/votes; badge zone registered last so tap picks hunter; tag-claim RTT-slack anti-phantom checks; guest countdown/cooldown backups that never self-promote; host-disconnect IT reassignment on connection-close; voice `isNaN` guard; localStorage validation for maps/launch/server cache; audio gesture unlock + SDK mute; in-memory `vm.Script` parse valid.

**NOT checked (no browser run):** live playtest — C1/C2/C9/C13 need on-device confirmation despite conclusive static evidence; no second peer for P2P flows (C4/C5/C15 unexercised); no mobile hardware; voice chat, editor, `demo.html` diff, per-map spawn safety unexamined (context budget, lower risk).

Note: C1, C2, C8 are open in the file — fixes for them were reverted on request. No game code was modified for this report.
