# Handoff Report: Survey and Investigation of R1 & R2

**Agent**: `survey_explorer_1`  
**Mission**: Comprehensive Survey and Investigation of Requirements R1 (Syntax Parsing & Game Mode Execution) and R2 (Security Hardening & Secret Removal) across `tag/`, `tag-server/`, and `PokiGames/`.  
**Date**: 2026-10-11  

---

## 1. Observation

### 1.1 R1: Syntax Parsing Errors (`node --check`)

Running `node --check` across all 22 JavaScript files in `tag/js/` and `tag/js/modes/` revealed 5 files with fatal syntax parsing errors:

1. **`tag/js/match.js:144`**:
   - **Command**: `node --check tag/js/match.js`
   - **Verbatim Error**:
     ```
     tag/js/match.js:144
     /* ==========================================================================
     SyntaxError: Invalid or unexpected token
     ```
   - **File Content Lines 142–145**:
     ```javascript
     142:     slot:slot,colIdx:colIdx,team:team,trail:[],cosmeticTrail:[],isHunter:roleHunter,isEliminated:false,survivalT:0,isFrozen:false};
     143: }
     144: /* ==========================================================================
     145: 
     ```
   - **Observation**: Multi-line comment `/*` is opened on line 144 but never closed before end-of-file.

2. **`tag/js/modes/bomb.js:1` & `line 1185`**:
   - **Command**: `node --check tag/js/modes/bomb.js`
   - **Verbatim Error**:
     ```
     tag/js/modes/bomb.js:1
        BUNDLED MODE: BOMB TAG / HOT POTATO
                ^^^^
     SyntaxError: Unexpected identifier 'MODE'
     ```
   - **File Content Lines 1–3**:
     ```javascript
     1:    BUNDLED MODE: BOMB TAG / HOT POTATO
     2:    ========================================================================== */
     3: /**
     ```
   - **File Content Lines 1184–1186**:
     ```javascript
     1184: 
     1185: /* ==========================================================================
     1186: 
     ```
   - **Observation**: Line 1 has an un-opened closing comment delimiter `*/` without leading `/*`. Line 1185 at end-of-file has an unclosed `/*`.

3. **`tag/js/modes/crown.js:1` & `line 1428`**:
   - **Command**: `node --check tag/js/modes/crown.js`
   - **Verbatim Error**:
     ```
     tag/js/modes/crown.js:1
        BUNDLED MODE: CROWN KING / KING OF THE HILL
                ^^^^
     SyntaxError: Unexpected identifier 'MODE'
     ```
   - **File Content Lines 1–3**:
     ```javascript
     1:    BUNDLED MODE: CROWN KING / KING OF THE HILL
     2:    ========================================================================== */
     3: /**
     ```
   - **File Content Lines 1427–1429**:
     ```javascript
     1427: 
     1428: /* ==========================================================================
     1429: 
     ```
   - **Observation**: Line 1 is missing opening `/*`. Line 1428 has an unclosed `/*` at end-of-file.

4. **`tag/js/modes/ctf.js:1`**:
   - **Command**: `node --check tag/js/modes/ctf.js`
   - **Verbatim Error**:
     ```
     tag/js/modes/ctf.js:1
        BUNDLED MODE: CAPTURE THE FLAG (CTF)
                ^^^^
     SyntaxError: Unexpected identifier 'MODE'
     ```
   - **File Content Lines 1–3**:
     ```javascript
     1:    BUNDLED MODE: CAPTURE THE FLAG (CTF)
     2:    ========================================================================== */
     3: /**
     ```
   - **Observation**: Line 1 is missing opening `/*`.

5. **`tag/js/modes/infection.js:1` & `line 1123`**:
   - **Command**: `node --check tag/js/modes/infection.js`
   - **Verbatim Error**:
     ```
     tag/js/modes/infection.js:1
        BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
                ^^^^^
     SyntaxError: Unexpected identifier 'MODES'
     ```
   - **File Content Lines 1–3**:
     ```javascript
     1:    BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
     2:    ========================================================================== */
     3: var initInfectionMode, updateInfection, checkInfectionTag, drawInfectionUI...
     ```
   - **File Content Lines 1122–1124**:
     ```javascript
     1122: 
     1123: /* ==========================================================================
     1124: 
     ```
   - **Observation**: Line 1 is missing opening `/*`. Line 1123 has an unclosed `/*` at end-of-file.

6. **Mirror copies in `tag-server/` and `PokiGames/`**:
   - Exactly identical syntax errors exist in:
     - `tag-server/js/match.js:144`
     - `tag-server/js/modes/bomb.js:1`
     - `tag-server/js/modes/crown.js:1`
     - `tag-server/js/modes/ctf.js:1`
     - `tag-server/js/modes/infection.js:1`
     - `PokiGames/js/match.js:144`
     - `PokiGames/js/modes/bomb.js:1`
     - `PokiGames/js/modes/crown.js:1`
     - `PokiGames/js/modes/ctf.js:1`
     - `PokiGames/js/modes/infection.js:1`
   - In addition, **`PokiGames/js/audio.js:54`** failed:
     ```
     PokiGames/js/audio.js:54
     let _cgBoot = null;
         ^
     SyntaxError: Identifier '_cgBoot' has already been declared
     ```
     Line 5 has `let _cgBoot=null;`, and line 54 has duplicate `let _cgBoot = null;`.

---

### 1.2 R1: Game Mode Exports, Registration & Fallback to Party Mode

1. **Script Inclusion in `tag/index.html` (lines 54–60)**:
   ```html
   <script src="js/match.js"></script>
   <script src="js/modes/infection.js"></script>
   <script src="js/modes/bomb.js"></script>
   <script src="js/modes/crown.js"></script>
   <script src="js/modes/ctf.js"></script>
   <script src="js/modes/wiring.js"></script>
   ```
   Because `match.js`, `infection.js`, `bomb.js`, `crown.js`, and `ctf.js` fail to parse, browser execution halts for each script tag. None of their global variables or functions are defined on `window`.

2. **Mode Registration in `tag/js/modes/wiring.js` (lines 1–52)**:
   ```javascript
   var initInfectionMode = (typeof window !== "undefined" && window.initInfectionMode) || (typeof globalThis !== "undefined" ? globalThis.initInfectionMode : null);
   ...
   var initBombMode = (typeof window !== "undefined" && window.initBombMode) || (typeof globalThis !== "undefined" ? globalThis.initBombMode : null);
   ...
   var initCrownMode = (typeof window !== "undefined" && window.initCrownMode) || (typeof globalThis !== "undefined" ? globalThis.initCrownMode : null);
   ...
   var initCtfMode = (typeof window !== "undefined" && window.initCtfMode) || (typeof globalThis !== "undefined" ? globalThis.initCtfMode : null);
   ```
   When the mode files fail to load, all these symbols evaluate to `null`.

3. **Match Start in `tag/js/modes/wiring.js` (lines 202–212)**:
   ```javascript
   if(settings.gameMode === 'infection'){
     if(typeof initInfectionMode === 'function') initInfectionMode();
   } else if(settings.gameMode === 'bomb'){
     if(typeof initBombMode === 'function') initBombMode();
   } else if(settings.gameMode === 'crown'){
     match.it = -1;
     if(typeof initCrownMode === 'function') initCrownMode();
   } else if(settings.gameMode === 'ctf'){
     match.it = -1;
     if(typeof initCtfMode === 'function') initCtfMode();
   }
   ```
   Because `initBombMode` / `initCrownMode` / `initCtfMode` / `initInfectionMode` are `null`, no mode state is initialized.

4. **Tag & Update Dispatch in `tag/js/modes/hunter.js` (lines 821–841)**:
   ```javascript
   if(settings.gameMode === 'infection'){
     try{ if(typeof checkInfectionTag === 'function') checkInfectionTag(); }
     catch(e){ logModeErr('checkInfectionTag', e); }
     return;
   }
   if(settings.gameMode === 'bomb'){
     try{ if(typeof checkBombTag === 'function') checkBombTag(); }
     catch(e){ logModeErr('checkBombTag', e); }
     return;
   }
   ```
   When `checkBombTag` is not a function, execution drops past the return into standard Party Tag logic (line 842+).

5. **HUD Fallback in `tag/js/ui.js` (line 3044)**:
   ```javascript
   if(settings.gameMode === 'infection'){
     try{ if(typeof drawInfectionUI === 'function') drawInfectionUI(); else drawFallbackTimerHUD(); }
   ```
   Falls back to standard Party timer HUD (`drawFallbackTimerHUD()`).

6. **Bot AI Fallback in `tag/js/bot_engine.js` (lines 1284–1295)**:
   Bots check `if(settings.gameMode === 'bomb' && typeof BOMB_MODE !== 'undefined' ...)`. Since `BOMB_MODE` is null/undefined, bots fall back to FFA Party pursuit AI.

7. **Tab Switch Overwrites in `tag/js/bot_ai.js` (lines 665–678)**:
   ```javascript
   if(tab === 'solo'){
     menu.botOn = true;
     settings.teams = false;
     settings.gameMode = 'party';
     menu.gameMode = 'party';
   } else if(tab === 'bots'){
     menu.botOn = true;
     settings.teams = false;
     settings.gameMode = 'party';
     menu.gameMode = 'party';
   }
   ```
   Clicking Solo or Bots tabs forcefully resets `settings.gameMode` to `'party'`.

8. **Solo & Bots Filtering in `tag/js/modes/wiring.js` (lines 67–80)**:
   ```javascript
   if(menu.tab === 'solo'){
     const soloModes = ['party', 'bomb', 'crown', 'ctf'];
     if(soloModes.indexOf(settings.gameMode) < 0){
       settings.gameMode = 'party';
     }
   } else if(menu.tab === 'bots'){
     const botModes = ['party', 'bomb', 'crown', 'ctf'];
     if(botModes.indexOf(settings.gameMode) < 0){
       settings.gameMode = 'party';
     }
   }
   ```
   `'infection'` is missing from both `soloModes` and `botModes`, immediately forcing `settings.gameMode = 'party'`.

9. **Menu Cycling Exclusion in `tag/js/bot_ai.js` (lines 1282–1289)**:
   ```javascript
   const modes = (menu.tab === 'bots' || menu.tab === 'solo')
     ? ['party', 'ctf', 'bomb', 'crown']
     : ['party', 'teams', 'ctf', 'bomb', 'crown', 'hunter'];
   ```
   `'infection'` is completely absent from `modes`.

10. **Mode Selection Blockers in `tag/js/bot_ai.js:1067` & `tag/js/ui.js:3440`**:
    ```javascript
    // bot_ai.js:1067
    if(modeId === 'freeze' || modeId === 'infection'){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); return; }
    // ui.js:3440
    const soon = (md.id === 'freeze' || md.id === 'infection');
    ```
    Infection is explicitly blocked with "COMING SOON" in the post-match mode request popup.

---

### 1.3 R2: Hardcoded Discord Webhook URLs & Sensitive Endpoints

A search for `discord.com/api/webhooks` across the repository identified exactly **9 hardcoded occurrences across 3 files**:

1. **`tag/js/netplay.js`**:
   - **Line 232**:
     ```javascript
     alertsWebhookUrl: 'https://discord.com/api/webhooks/1555528500516102255/oorxZysdCzQFmhLfApPuJAl_uMOvOL-WD3LGeszSLGb83nwiP1dAVUO1kDVcTzUw_jEM',
     ```
   - **Line 236**:
     ```javascript
     launchesWebhookUrl: 'https://discord.com/api/webhooks/1555908160261324826/fOcxqoxguFe1486dPY_MjhFn96xGHMDq4yfB7X9bIYsWUqzyrIBdGDf5TvnyGAoUopy9',
     ```
   - **Line 239**:
     ```javascript
     sessionsWebhookUrl: 'https://discord.com/api/webhooks/1555908433507651605/GytE_exg0eUAJfgLJYK5RopjP6D6a1faaBdvtAzaqWWVSs4PfffHQcivZBx3vo1X-C18',
     ```
   - Also lines 241–242:
     ```javascript
     ntfyTopic: 'crazygames-tag-server-alerts',
     ntfyServer: 'https://ntfy.sh'
     ```

2. **`tag-server/js/netplay.js`**:
   - Lines 232, 236, 239: Identical hardcoded Discord Webhook URLs.

3. **`PokiGames/js/netplay.js`**:
   - Lines 232, 236, 239: Identical hardcoded Discord Webhook URLs.

---

### 1.4 R2: Peer Message Routing & Network Handler Identity Validation Flaws

Inspecting `netOnData(m, c)` in `tag/js/netplay.js` (lines 2824–3755) revealed critical gaps in sender authentication:

1. **Unauthorized Room Closure & Disconnection on Guest Clients**:
   - **`to_menu` (line 3721)**:
     ```javascript
     } else if(m.t === 'to_menu' && !NET.isHost){
       match = null;
       screen = 'menu';
       menu.tab = 'online';
     ```
     *Flaw*: Does NOT verify that `c.peer` is the host (`NET._hostId` or `NET.hostPeer`). Any connected peer can send `{ t: 'to_menu' }` to abort other players' games.
   - **`kicked` (line 3725)**:
     ```javascript
     } else if(m.t === 'kicked'){
       netToast('You were removed from the room.');
       netLeaveRoom();
     ```
     *Flaw*: Drops connection without verifying sender is the host.
   - **`full` (line 3728)**:
     *Flaw*: Disconnects without verifying sender is the host.

2. **Host-Authoritative Command Injection on Guest Clients**:
   - `start` (line 3706), `midgame_start` (line 3164), `spectator_init` (line 3141), `assign` (line 3218), `settings` (line 3328), `hunter_catch` (line 3530), `hunter_score` (line 3538), `mapvote_sync` (line 3517), `hunter_votes_sync` (line 3483).
   - *Flaw*: Unlike `roster_sync` (line 3254) and `state` (line 3579) which enforce:
     `if(!NET.isHost && NET.role==='guest' && c && c.peer && NET._hostId && c.peer!==NET._hostId) return;`
     none of these other messages verify that `c.peer === NET._hostId`.

3. **Guest Impersonation & State Alteration on Host**:
   - **`p_state` (line 3342)**:
     Host accepts player physics snapshots for `slot = m.s != null ? m.s : m.slot` without validating that `c.peer` is the assigned owner of that slot (`NET.peerSlots.get(c.peer) === slot`). Any guest can spoof any other guest's position.
   - **`team` (line 3294)**:
     Accepts `m.slot` from payload; any guest can swap another player's or the host's team.
   - **`ready` (line 3304)**:
     Accepts `m.slot` from payload; any guest can toggle other players' ready status.
   - **`color` (line 3319)**:
     Accepts `m.slot` from payload; any guest can force a recolor and trigger `buildLevel()`.
   - **`ctrl` (line 3312)**:
     Accepts `m.slot` from payload; any guest can rebind control schemes of other players.
   - **`tag_claim` (line 3356)**:
     Uses `m.from` from payload without validating `NET.peerSlots.get(c.peer) === m.from`.
   - **`crown_claim` / `crown_steal` (line 3448)**:
     Uses `m.from` from payload without verifying `NET.peerSlots.get(c.peer) === m.from`.
   - **`hunter_vote` (line 3468)**, **`map_vote` (line 3491)**, **`mode_request` (line 3503)**:
     Uses `m.voter` without verifying `NET.peerSlots.get(c.peer) === m.voter`.
   - **`set_hunter` (line 3521)**:
     Accepts hunter assignment from any peer without verifying permission.

4. **Unauthenticated HTTP Room Closure in Signaling Server**:
   - **`tag-server/server.js:148–157`**:
     ```javascript
     app.post('/api/rooms/close', (req, res) => {
       const { roomId } = req.body || {};
       if (roomId) {
         const cleanId = String(roomId).trim().toUpperCase();
         activeRooms.delete(cleanId);
         relayRooms.delete(cleanId);
         console.log(`[NET] Host cleanly closed room: ${cleanId}`);
       }
       res.json({ success: true });
     });
     ```
     *Flaw*: Endpoint has zero authentication, tokens, or host identity verification. Anyone can unlist and close any room by sending `POST /api/rooms/close` with `{"roomId":"XXXXXX"}`.

---

## 2. Logic Chain

1. **Syntax Errors Halt Parsing**:
   From Observation 1.1, `node --check` fails on `match.js`, `bomb.js`, `crown.js`, `ctf.js`, and `infection.js`. Because these scripts are included via separate `<script>` tags in `index.html` (Observation 1.2.1), the JavaScript engine throws `SyntaxError` and aborts script execution before any variables or functions are defined in global scope.
2. **Missing Function Declarations Cause Null Bindings**:
   `wiring.js` runs after these scripts and attempts to bind `window.initBombMode`, `window.initCrownMode`, etc. Because the scripts aborted, `wiring.js` assigns `null` to all mode hooks (Observation 1.2.2).
3. **Execution Falls Back to Default Party Logic**:
   When `startMatch()` runs (Observation 1.2.3), `if(typeof initBombMode === 'function')` evaluates to false. During the match, `hunter.js:checkTag()` checks `if(typeof checkBombTag === 'function')` and silently falls through to default party tag logic (Observation 1.2.4). `ui.js` falls through to `drawFallbackTimerHUD()` (Observation 1.2.5). Bots fall through to default FFA AI (Observation 1.2.6). Therefore, selecting any of these modes results in default Party gameplay.
4. **Hardcoded UI Overwrites and Filter Exclusions Enforce Reversion**:
   In addition to syntax errors, `bot_ai.js` explicitly overwrites `settings.gameMode = 'party'` when switching to Solo or Bots tabs (Observation 1.2.7). `wiring.js` resets `settings.gameMode = 'party'` if the mode is not in `soloModes`/`botModes` (Observation 1.2.8). `infection` is omitted from `cycleGameMode` (Observation 1.2.9) and blocked in `requestMode`/`ui.js` with "COMING SOON" (Observation 1.2.10).
5. **Hardcoded Webhook URLs Expose Secrets to Clients**:
   From Observation 1.3, raw Discord webhook tokens are embedded in client-side code (`netplay.js`). Any user opening browser Developer Tools or viewing page source can copy these URLs and execute arbitrary POST requests to those Discord channels.
6. **Lack of Peer Identity Validation Enables Impersonation and DoS**:
   From Observation 1.4, the message routing handler `netOnData(m, c)` relies on unverified payload fields (`m.slot`, `m.from`, `m.voter`) rather than inspecting connection identity `c.peer` or verifying the sender against `NET._hostId`. Consequently:
   - Malicious peers can impersonate other players' movements, votes, and tags.
   - Malicious peers can disrupt games by sending `{ t: 'to_menu' }` or `{ t: 'kicked' }`.
   - External attackers can kill rooms via the unauthenticated HTTP `/api/rooms/close` endpoint.

---

## 3. Caveats

1. **Scope Boundaries**: This survey focused exclusively on R1 (Syntax Parsing & Mode Execution) and R2 (Security Hardening & Secret Removal). Gameplay UI bugs (R3), host netplay authority desyncs (R4), and bot AI roaming/career idempotency (R5) are covered by peer survey explorers.
2. **Read-Only Protocol**: In accordance with the teamwork explorer role, no source code changes were committed during this survey. Proposed code fixes below are verified via in-memory execution and static analysis.
3. **Server Secret Management**: While TURN credentials in `tag-server/server.js` correctly utilize `process.env.TURN_SECRET`, the room directory APIs currently have no token mechanism implemented; implementing this will require matching client-host handshake changes.

---

## 4. Conclusion & Recommended Fixes

### 4.1 R1: Exact Syntax Fixes

1. **`tag/js/match.js`**:
   - **Line 144**: Remove trailing unclosed comment:
     ```javascript
     // BEFORE (Lines 143-144):
     }
     /* ==========================================================================

     // AFTER:
     }
     ```
   - Mirror the same change to `tag-server/js/match.js` and `PokiGames/js/match.js`.

2. **`tag/js/modes/bomb.js`**:
   - **Line 1**: Add opening `/*`:
     ```javascript
     // BEFORE:
        BUNDLED MODE: BOMB TAG / HOT POTATO
        ========================================================================== */

     // AFTER:
     /* ==========================================================================
        BUNDLED MODE: BOMB TAG / HOT POTATO
        ========================================================================== */
     ```
   - **Line 1185**: Remove trailing unclosed `/* ==========================================================================`.
   - Mirror the same change to `tag-server/js/modes/bomb.js` and `PokiGames/js/modes/bomb.js`.

3. **`tag/js/modes/crown.js`**:
   - **Line 1**: Add opening `/*`:
     ```javascript
     // BEFORE:
        BUNDLED MODE: CROWN KING / KING OF THE HILL
        ========================================================================== */

     // AFTER:
     /* ==========================================================================
        BUNDLED MODE: CROWN KING / KING OF THE HILL
        ========================================================================== */
     ```
   - **Line 1428**: Remove trailing unclosed `/* ==========================================================================`.
   - Mirror the same change to `tag-server/js/modes/crown.js` and `PokiGames/js/modes/crown.js`.

4. **`tag/js/modes/ctf.js`**:
   - **Line 1**: Add opening `/*`:
     ```javascript
     // BEFORE:
        BUNDLED MODE: CAPTURE THE FLAG (CTF)
        ========================================================================== */

     // AFTER:
     /* ==========================================================================
        BUNDLED MODE: CAPTURE THE FLAG (CTF)
        ========================================================================== */
     ```
   - Mirror the same change to `tag-server/js/modes/ctf.js` and `PokiGames/js/modes/ctf.js`.

5. **`tag/js/modes/infection.js`**:
   - **Line 1**: Add opening `/*`:
     ```javascript
     // BEFORE:
        BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
        ========================================================================== */

     // AFTER:
     /* ==========================================================================
        BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
        ========================================================================== */
     ```
   - **Line 1123**: Remove trailing unclosed `/* ==========================================================================`.
   - Mirror the same change to `tag-server/js/modes/infection.js` and `PokiGames/js/modes/infection.js`.

6. **`PokiGames/js/audio.js`**:
   - **Line 54**: Remove duplicate declaration `let _cgBoot = null;` (already declared on line 5).

---

### 4.2 R1: Game Mode Execution & Fallback Prevention Fixes

1. **`tag/js/bot_ai.js:665–678` (`setMenuTab`)**:
   - Do NOT overwrite `settings.gameMode = 'party'` when switching to Solo or Bots tabs if `settings.gameMode` is already a valid mode supported by that tab (`['party', 'bomb', 'crown', 'ctf', 'infection'].includes(settings.gameMode)`).
2. **`tag/js/modes/wiring.js:67–80` (`startMatch`)**:
   - Include `'infection'` in `soloModes` and `botModes`:
     ```javascript
     const soloModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
     const botModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
     ```
3. **`tag/js/bot_ai.js:1282–1289` (`cycleGameMode`)**:
   - Add `'infection'` to `modes`:
     ```javascript
     const modes = (menu.tab === 'bots' || menu.tab === 'solo')
       ? ['party', 'ctf', 'bomb', 'crown', 'infection']
       : ['party', 'teams', 'ctf', 'bomb', 'crown', 'infection', 'hunter'];
     ```
4. **`tag/js/bot_ai.js:1067` & `tag/js/ui.js:3440`**:
   - Remove `'infection'` from the `coming soon` guard, allowing players to vote for and request Infection mode.

---

### 4.3 R2: Secret Removal & Security Hardening Fixes

1. **Discord Webhook URLs (`tag/js/netplay.js`, `tag-server/js/netplay.js`, `PokiGames/js/netplay.js`)**:
   - Replace hardcoded URLs on lines 232, 236, 239 with empty strings or stubbed configuration:
     ```javascript
     const NET_TELEMETRY_CONFIG = {
       enabled: false,
       alertsWebhookUrl: '',
       alertsMention: '',
       launchesWebhookUrl: '',
       sessionsWebhookUrl: '',
       ntfyTopic: '',
       ntfyServer: ''
     };
     ```
   - This ensures zero raw Discord credentials exist in source code or developer tools, and all telemetry guards (`if (!alertsWebhookUrl) return;`) safely short-circuit with 0 external network requests.
   - If telemetry is required, route via backend proxy (`/api/analytics/session`) with webhook credentials stored exclusively in server environment variables.

2. **Peer Identity Validation in `tag/js/netplay.js:netOnData(m, c)`**:
   - **Helper Function**:
     ```javascript
     function isSenderHost(c) {
       return !NET.isHost && NET.role === 'guest' && c && c.peer && (c.peer === NET._hostId || c.peer === NET.hostPeer);
     }
     function getSenderSlot(c) {
       return (NET.peerSlots && c && c.peer) ? NET.peerSlots.get(c.peer) : -1;
     }
     ```
   - **Enforce on Guest Messages**:
     Reject `to_menu`, `kicked`, `full`, `start`, `midgame_start`, `spectator_init`, `assign`, `settings`, `hunter_catch`, `hunter_score`, `mapvote_sync`, `hunter_votes_sync` if `!isSenderHost(c)`.
   - **Enforce on Host Messages**:
     - `p_state`: Verify `(m.s != null ? m.s : m.slot) === getSenderSlot(c)`.
     - `team`, `ready`, `color`, `ctrl`: Enforce `m.slot === getSenderSlot(c)`.
     - `tag_claim`, `crown_claim`, `crown_steal`: Enforce `m.from === getSenderSlot(c)`.
     - `hunter_vote`, `map_vote`, `mode_request`: Enforce `(m.voter | 0) === getSenderSlot(c)`.
     - `set_hunter`: Drop unless sender is authorized for that team slot.

3. **HTTP Room Closure Validation in `tag-server/server.js`**:
   - Require `hostKey` / `hostPeerId` authentication on `POST /api/rooms/close`:
     ```javascript
     app.post('/api/rooms/close', (req, res) => {
       const { roomId, hostPeerId } = req.body || {};
       if (roomId) {
         const cleanId = String(roomId).trim().toUpperCase();
         const r = activeRooms.get(cleanId);
         if (r && r.hostPeerId && hostPeerId !== r.hostPeerId) {
           return res.status(403).json({ error: 'Unauthorized: hostPeerId mismatch' });
         }
         activeRooms.delete(cleanId);
         relayRooms.delete(cleanId);
         console.log(`[NET] Host cleanly closed room: ${cleanId}`);
       }
       res.json({ success: true });
     });
     ```

---

## 5. Verification Method

### 5.1 Syntax Verification
Run PowerShell command:
```powershell
Get-ChildItem -Path "tag/js", "tag-server/js", "PokiGames/js" -Filter "*.js" -Recurse | ForEach-Object {
    $res = node --check $_.FullName 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Output "FAIL: $($_.FullName)"; Write-Output $res }
}
```
*Pass Condition*: Zero FAIL output; all files exit with code 0.

### 5.2 Secret Verification
Run ripgrep check:
```powershell
rg "discord\.com/api/webhooks" tag/ PokiGames/ tag-server/
```
*Pass Condition*: Exit code 1 (0 matches found).

### 5.3 Peer Routing Validation
- Inspect `netOnData(m, c)` in `tag/js/netplay.js`: confirm `to_menu`, `kicked`, `full` have host-identity checks.
- Confirm `p_state`, `team`, `ready`, `color`, `tag_claim`, `crown_claim`, `map_vote`, `hunter_vote` validate sender ownership against `NET.peerSlots.get(c.peer)`.
- Test `POST /api/rooms/close` with an incorrect `hostPeerId`: expect HTTP 403.
