# Handoff Report: Implementation Plan for Feature 4 (Infection Mode Unlocking & Integration)

**Agent**: `m1_explorer_3`  
**Mission**: Formulate the exact implementation plan and line-by-line replacement specifications for Feature 4 (Infection Mode Unlocking & Integration).  
**Target Files**: `tag/js/modes/wiring.js`, `tag/js/bot_ai.js`, `tag/js/ui.js`, `tag/js/netplay.js` (and mirror files in `tag-server/` and `PokiGames/`).  
**Date**: 2026-10-11  

---

## 1. Observation

Direct observations from source code inspections across `tag/`, `tag-server/`, and `PokiGames/`:

### 1.1 `tag/js/modes/wiring.js` Lines 67–80 (`startMatch` mode sanitization)
In `startMatch()`, `settings.gameMode` is verified against allowed mode lists for the `'solo'` and `'bots'` tabs:
```javascript
67:   if(menu.tab === 'solo'){
68:     const soloModes = ['party', 'bomb', 'crown', 'ctf'];
69:     if(soloModes.indexOf(settings.gameMode) < 0){
70:       settings.gameMode = 'party';
71:     }
72:     settings.teams = (settings.gameMode === 'ctf');
73:     menu.gameMode = settings.gameMode;
74:   } else if(menu.tab === 'bots'){
75:     const botModes = ['party', 'bomb', 'crown', 'ctf'];
76:     if(botModes.indexOf(settings.gameMode) < 0){
77:       settings.gameMode = 'party';
78:     }
79:     settings.teams = (settings.gameMode === 'ctf');
80:     menu.gameMode = settings.gameMode;
81:     menu.botOn = true;
82:     menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
```
- **Verbatim Line 68**: `const soloModes = ['party', 'bomb', 'crown', 'ctf'];`
- **Verbatim Line 75**: `const botModes = ['party', 'bomb', 'crown', 'ctf'];`
- **Finding**: `'infection'` is omitted from both arrays. If a user enters solo or watch-bots mode with `settings.gameMode === 'infection'`, lines 70 and 77 immediately force `settings.gameMode = 'party'`.
- **Identical Lines**: Mirror files `tag-server/js/modes/wiring.js:68,75` and `PokiGames/js/modes/wiring.js:68,75` contain the exact same definitions.

### 1.2 `tag/js/bot_ai.js` Lines 1282–1289 (`cycleGameMode`)
When clicking the Game Mode selector chip on the menu strip (both desktop and mobile UI), `cycleGameMode(d)` rotates through available modes:
```javascript
1276: function cycleGameMode(d){
1277:   if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){
1278:     toast('HOST SELECTS GAME MODE');
1279:     sfx('back');
1280:     return;
1281:   }
1282:   const modes = (menu.tab === 'bots' || menu.tab === 'solo')
1283:     ? ['party', 'ctf', 'bomb', 'crown']
1284:     : ['party', 'teams', 'ctf', 'bomb', 'crown', 'hunter'];
1285:   let curIdx = modes.indexOf(settings.gameMode || (settings.teams ? 'teams' : 'party'));
1286:   if(curIdx < 0) curIdx = 0;
1287:   const nextIdx = (curIdx + (d || 1) + modes.length) % modes.length;
1288:   setGameMode(modes[nextIdx]);
1289: }
```
- **Verbatim Lines 1282–1284**:
  ```javascript
  const modes = (menu.tab === 'bots' || menu.tab === 'solo')
    ? ['party', 'ctf', 'bomb', 'crown']
    : ['party', 'teams', 'ctf', 'bomb', 'crown', 'hunter'];
  ```
- **Finding**: `'infection'` is absent from both branches. Players can never cycle into Infection mode from the menu UI.
- **Identical Lines**: `tag-server/js/bot_ai.js:1282–1284` and `PokiGames/js/bot_ai.js:1282–1284`.

### 1.3 `tag/js/bot_ai.js` Lines 1211–1227 (`setGameMode`)
When `setGameMode(newMode)` is called by `cycleGameMode`, `decideMapVote`, or direct UI triggers:
```javascript
1211: function setGameMode(newMode){
1212:   if(menu.tab === 'solo'){
1213:     const soloModes = ['party', 'bomb', 'crown', 'ctf'];
1214:     if(soloModes.indexOf(newMode) < 0){
1215:       toast('🤖 SOLO SUPPORTS FFA, BOMB, CROWN & CTF');
1216:       sfx('back');
1217:       return;
1218:     }
1219:   }
1220:   if(menu.tab === 'bots'){
1221:     const botModes = ['party', 'bomb', 'crown', 'ctf'];
1222:     if(botModes.indexOf(newMode) < 0){
1223:       toast('🤖 WATCH MODE: FFA, BOMB, CROWN OR CTF');
1224:       sfx('back');
1225:       return;
1226:     }
1227:   }
```
- **Verbatim Lines 1213 & 1221**:
  - Line 1213: `const soloModes = ['party', 'bomb', 'crown', 'ctf'];`
  - Line 1221: `const botModes = ['party', 'bomb', 'crown', 'ctf'];`
- **Finding**: Even if `cycleGameMode` requests `'infection'`, `setGameMode` aborts execution with a rejection toast because `soloModes` and `botModes` omit `'infection'`.
- **Identical Lines**: `tag-server/js/bot_ai.js:1213,1221` and `PokiGames/js/bot_ai.js:1213,1221`.

### 1.4 `tag/js/bot_ai.js` Lines 1061–1075 (`requestMode`)
When a player votes for a mode in the post-match mode request popup:
```javascript
1061: function requestMode(voter, modeId){
1062:   const V = menu.mapVote;
1063:   if(!V || V.decided) return;
1064:   let ok = false;
1065:   for(const m of MAPVOTE_MODES){ if(m.id === modeId){ ok = true; break; } }
1066:   if(!ok) return;
1067:   if(modeId === 'freeze' || modeId === 'infection'){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); return; }
1068:   const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
1069:   const isGuest = isOnline && !NET.isHost;
1070:   if(menu.tab === 'solo' && ['party', 'bomb', 'crown', 'ctf'].indexOf(modeId) < 0){ toast('🤖 SOLO: FFA/BOMB/CROWN/CTF ONLY'); sfx('back'); return; }
1071:   if(menu.tab === 'bots' && ['party','freeze','infection','bomb','crown','ctf'].indexOf(modeId) < 0){ toast('🤖 WATCH: FFA/CTF ONLY'); sfx('back'); return; }
```
- **Verbatim Line 1067**:
  `if(modeId === 'freeze' || modeId === 'infection'){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); return; }`
- **Verbatim Line 1070**:
  `if(menu.tab === 'solo' && ['party', 'bomb', 'crown', 'ctf'].indexOf(modeId) < 0){ toast('🤖 SOLO: FFA/BOMB/CROWN/CTF ONLY'); sfx('back'); return; }`
- **Finding**: Line 1067 unconditionally rejects votes for `'infection'` with `"THAT MODE IS COMING SOON!"`. Line 1070 also omits `'infection'` from the solo tab allowance.
- **Identical Lines**: `tag-server/js/bot_ai.js:1067,1070` and `PokiGames/js/bot_ai.js:1067,1070`.

### 1.5 `tag/js/ui.js` Lines 3435–3455 (`drawModePopup`)
Rendering the "REQUEST NEXT MODE" voting modal after matches:
```javascript
3435:   for(let i = 0; i < MAPVOTE_MODES.length; i++){
3436:     const md = MAPVOTE_MODES[i];
3437:     const ry = py + 44 + i * (rowH + 6);
3438:     const cnt = (M.counts && M.counts[md.id]) || 0;
3439:     const mine = (myMode === md.id);
3440:     const soon = (md.id === 'freeze' || md.id === 'infection');
3441:     rr(g, px + 12, ry, pw - 24, rowH, 8);
3442:     g.fillStyle = soon ? 'rgba(255,255,255,0.03)' : (mine ? 'rgba(46,204,113,0.25)' : 'rgba(255,255,255,0.06)');
3443:     g.fill();
3444:     g.lineWidth = mine && !soon ? 2.5 : 1.2;
3445:     g.strokeStyle = mine && !soon ? '#2ecc71' : 'rgba(255,255,255,0.2)';
3446:     g.stroke();
3447:     txt(md.icon + '  ' + md.label, px + 24, ry + rowH / 2 + 1, FN(13, 900), soon ? 'rgba(255,255,255,0.35)' : '#ffffff', 'left');
3448:     txt(soon ? 'COMING SOON' : (cnt ? ('×' + cnt) : ''), px + pw - 24, ry + rowH / 2 + 1, FN(soon ? 10 : 13, 900), soon ? '#ffd166' : '#ffd166', 'right');
3449:     if(soon){
3450:       zone(px + 12, ry, pw - 24, rowH, { fn: function(){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); } });
3451:     } else {
3452:       zone(px + 12, ry, pw - 24, rowH, { fn: (function(id){ return function(){ requestMode(myVoterId(), id); }; })(md.id) });
3453:     }
```
- **Verbatim Line 3440**: `const soon = (md.id === 'freeze' || md.id === 'infection');`
- **Verbatim Line 3450**: `zone(px + 12, ry, pw - 24, rowH, { fn: function(){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); } });`
- **Finding**: Hardcodes `soon = true` for `infection`, rendering a grayed-out badge with label `"COMING SOON"`, dimming the row, and intercepting clicks with a lockout toast instead of dispatching `requestMode`.
- **Identical Lines**: `tag-server/js/ui.js:3440,3450` and `PokiGames/js/ui.js:3440,3450`.

### 1.6 `tag/js/netplay.js` Line 3512 (`mode_request` Handler on Host)
Host processing of guest mode requests received over WebRTC:
```javascript
3503:   } else if(m.t === 'mode_request' && NET.isHost){
3504:     const V = menu.mapVote;
3505:     if(!V || V.decided || !match || match.state !== 'result') return;
3506:     const v = m.voter | 0;
3507:     if(!(v >= 0 && v < 8) || menu.slotColor[v] < 0) return;
3508:     if(NET.botSlots && NET.botSlots.indexOf(v) >= 0) return;
3509:     let ok = false;
3510:     for(const md of MAPVOTE_MODES){ if(md.id === m.mode){ ok = true; break; } }
3511:     if(!ok) return;
3512:     if(m.mode === 'freeze' || m.mode === 'infection') return;
3513:     V.mseq++;
3514:     V.modeReq[v] = { mode: m.mode, seq: V.mseq };
```
- **Verbatim Line 3512**: `if(m.mode === 'freeze' || m.mode === 'infection') return;`
- **Finding**: When a connected guest sends a mode vote for `'infection'`, the host silently drops it on line 3512.
- **Identical Lines**: `tag-server/js/netplay.js:3512` and `PokiGames/js/netplay.js:3512`.

### 1.7 Player Count Threshold Checks for Infection
- **`tag/js/modes/wiring.js:143–146`**:
  ```javascript
  143: } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && act.length < 3){
  144:   toast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
  145:   sfx('back');
  146:   return;
  147: }
  ```
- **`tag/js/ui.js:2393–2396`**:
  ```javascript
  2393: } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && activeSlots().length < 3){
  2394:   toast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
  2395:   sfx('back');
  2396:   return;
  2397: }
  ```
- **`tag/js/netplay.js:4435–4438`**:
  ```javascript
  4435: } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && activeCount < 3){
  4436:   netToast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
  4437:   return;
  4438: }
  ```
- **Finding**: `menu.tab === 'solo'` has 2 slots (`act = [0, 1]`, human vs bot) and `menu.tab === 'bots'` has 2 slots (`act = [0, 1]`, bot vs bot). Because `act.length` is 2, lines 143 and 2393 block match start with `"INFECTION REQUIRES AT LEAST 3 PLAYERS!"` unless the guard is scoped or 2-player infection is permitted.
- **Infection Engine Analysis (`tag/js/modes/infection.js`)**:
  - `initInfectionMode()` picks 1 Patient Zero from active players.
  - `checkInfectionTag()` (line 515) explicitly checks `if (!P || P.length < 2) return;` — confirming the simulation engine is designed and tested for 2+ players (1 zombie vs 1 survivor).
  - When survivor is tagged, `remainingSurvivors.length === 0` -> Zombies Win.
  - When timer expires, Survivors Win.
  - 2-player Infection functions as an authentic 1v1 Infection Duel (identical to 2-player Bomb Tag duels).

### 1.8 `tag/js/modes/wiring.js` Lines 213–218 (Stale Mode Flags)
```javascript
213:   // Clear stale mode flags when leaving bomb/crown/ctf (init only sets active=true).
214:   try{
215:     if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE && settings.gameMode !== 'bomb') BOMB_MODE.active = false;
216:     if(typeof crownState !== 'undefined' && crownState && settings.gameMode !== 'crown') crownState.active = false;
217:     if(typeof ctfState !== 'undefined' && ctfState && settings.gameMode !== 'ctf') ctfState.active = false;
218:   }catch(e){}
```
- **Finding**: `infectionState.active` is NOT cleared when leaving infection mode, allowing stale infection state to persist into subsequent rounds if another mode is played next.

---

## 2. Logic Chain

1. **Cycle Inaccessibility (Observation 1.2)**:
   In `cycleGameMode`, `modes` is hardcoded as `['party', 'ctf', 'bomb', 'crown']` (solo/bots) or `['party', 'teams', 'ctf', 'bomb', 'crown', 'hunter']` (local party). Because `'infection'` is not in `modes`, clicking the mode selector button in the menu UI never selects `'infection'`.
2. **Rejection at `setGameMode` (Observation 1.3)**:
   Even if code or tests invoke `setGameMode('infection')`, lines 1213 and 1221 check `soloModes` and `botModes` without `'infection'`. When in the solo or bots tab, `setGameMode` immediately toasts an error and returns without setting `settings.gameMode = 'infection'`.
3. **Forced Reset in `startMatch` (Observation 1.1)**:
   Even if `settings.gameMode` is forced to `'infection'`, when `startMatch()` executes in `wiring.js`, lines 68–71 and 75–78 check `soloModes` and `botModes`. Because `'infection'` is missing, `settings.gameMode` is overwritten with `'party'`.
4. **Post-Match Lockout (Observations 1.4 & 1.5)**:
   In the post-match modal, `MAPVOTE_MODES` defines `{id:'infection', icon:'🧟', label:'INFECTION'}`. However, `ui.js:3440` flags it as `soon = true`, disabling the button and printing "COMING SOON". If clicked or dispatched, `bot_ai.js:1067` aborts with `"THAT MODE IS COMING SOON!"`.
5. **Netplay Dropped Packets (Observation 1.6)**:
   If a connected guest requests Infection mode over peer networking, `netplay.js:3512` drops the packet on the host.
6. **2-Player Start Block (Observation 1.7)**:
   Because the solo tab and watch-bots tab default to 2 players (`actSlots = [0, 1]`), `wiring.js:143` and `ui.js:2393` abort match start with `"INFECTION REQUIRES AT LEAST 3 PLAYERS!"` unless the guard is updated. Since `infection.js:515` explicitly supports 2 players (`length < 2`), removing `'infection'` from the `< 3` guard enables 2-player Infection duels across all tabs.
7. **Mode Isolation (Observation 1.8)**:
   Adding `infectionState.active = false` to line 218 ensures proper cleanup when switching away from Infection.

---

## 3. Caveats

1. **Feature Scope Boundary**:
   Feature 4 covers unlocking and integrating Infection Mode across menus, modes arrays, and vote handlers.
   - Restoring the full action overlay (Pause, Mute, Chat) to Infection HUD by removing `return;` on `ui.js:3046` is strictly scheduled under **Milestone 3 / Feature 11**.
   - Fixing syntax errors in `tag/js/modes/infection.js` (unclosed comments) is covered under **Milestone 1 / Feature 1**.
2. **Multi-Platform Mirroring**:
   Any changes to `tag/js/` files must also be applied identically to `tag-server/js/` and `PokiGames/js/` to avoid drift across builds.
3. **2-Player vs 3-Player Balance**:
   While `infection.js` handles 2 players cleanly (1 Infected vs 1 Survivor), Phase 3 "Last Stand" requires 1 survivor vs 3+ infected (`survivors.length === 1 && infected.length >= 3`). A 2-player game will operate in Phase 1 and Phase 2. This is the authentic designed behavior for small lobbies.

---

## 4. Conclusion & Exact Replacement Specifications

The implementation worker should apply the following line-by-line edits across `tag/`, `tag-server/`, and `PokiGames/`:

### Specification 1: `wiring.js` Lines 67–80 (`soloModes` and `botModes`)
**Files**: `tag/js/modes/wiring.js`, `tag-server/js/modes/wiring.js`, `PokiGames/js/modes/wiring.js`  
**Target lines**: 67–80

#### BEFORE:
```javascript
  if(menu.tab === 'solo'){
    const soloModes = ['party', 'bomb', 'crown', 'ctf'];
    if(soloModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
  } else if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf'];
    if(botModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
    menu.botOn = true;
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  }
```

#### AFTER:
```javascript
  if(menu.tab === 'solo'){
    const soloModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(soloModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
  } else if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(botModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
    menu.botOn = true;
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  }
```

---

### Specification 2: `wiring.js` Lines 143–146 (`act.length < 3` check)
**Files**: `tag/js/modes/wiring.js`, `tag-server/js/modes/wiring.js`, `PokiGames/js/modes/wiring.js`  
**Target lines**: 143–146

#### BEFORE:
```javascript
  } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && act.length < 3){
    toast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
    sfx('back');
    return;
  }
```

#### AFTER:
```javascript
  } else if(settings.gameMode === 'freeze' && act.length < 3){
    toast('⚠️ FREEZE REQUIRES AT LEAST 3 PLAYERS!');
    sfx('back');
    return;
  }
```

---

### Specification 3: `wiring.js` Lines 214–218 (Stale `infectionState.active` reset)
**Files**: `tag/js/modes/wiring.js`, `tag-server/js/modes/wiring.js`, `PokiGames/js/modes/wiring.js`  
**Target lines**: 214–218

#### BEFORE:
```javascript
  try{
    if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE && settings.gameMode !== 'bomb') BOMB_MODE.active = false;
    if(typeof crownState !== 'undefined' && crownState && settings.gameMode !== 'crown') crownState.active = false;
    if(typeof ctfState !== 'undefined' && ctfState && settings.gameMode !== 'ctf') ctfState.active = false;
  }catch(e){}
```

#### AFTER:
```javascript
  try{
    if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE && settings.gameMode !== 'bomb') BOMB_MODE.active = false;
    if(typeof crownState !== 'undefined' && crownState && settings.gameMode !== 'crown') crownState.active = false;
    if(typeof ctfState !== 'undefined' && ctfState && settings.gameMode !== 'ctf') ctfState.active = false;
    if(typeof infectionState !== 'undefined' && infectionState && settings.gameMode !== 'infection') infectionState.active = false;
  }catch(e){}
```

---

### Specification 4: `bot_ai.js` Lines 1282–1289 (`cycleGameMode`)
**Files**: `tag/js/bot_ai.js`, `tag-server/js/bot_ai.js`, `PokiGames/js/bot_ai.js`  
**Target lines**: 1282–1289

#### BEFORE:
```javascript
  const modes = (menu.tab === 'bots' || menu.tab === 'solo')
    ? ['party', 'ctf', 'bomb', 'crown']
    : ['party', 'teams', 'ctf', 'bomb', 'crown', 'hunter'];
  let curIdx = modes.indexOf(settings.gameMode || (settings.teams ? 'teams' : 'party'));
  if(curIdx < 0) curIdx = 0;
  const nextIdx = (curIdx + (d || 1) + modes.length) % modes.length;
  setGameMode(modes[nextIdx]);
```

#### AFTER:
```javascript
  const modes = (menu.tab === 'bots' || menu.tab === 'solo')
    ? ['party', 'ctf', 'bomb', 'crown', 'infection']
    : ['party', 'teams', 'ctf', 'bomb', 'crown', 'infection', 'hunter'];
  let curIdx = modes.indexOf(settings.gameMode || (settings.teams ? 'teams' : 'party'));
  if(curIdx < 0) curIdx = 0;
  const nextIdx = (curIdx + (d || 1) + modes.length) % modes.length;
  setGameMode(modes[nextIdx]);
```

---

### Specification 5: `bot_ai.js` Lines 1211–1227 (`setGameMode`)
**Files**: `tag/js/bot_ai.js`, `tag-server/js/bot_ai.js`, `PokiGames/js/bot_ai.js`  
**Target lines**: 1211–1227

#### BEFORE:
```javascript
function setGameMode(newMode){
  if(menu.tab === 'solo'){
    const soloModes = ['party', 'bomb', 'crown', 'ctf'];
    if(soloModes.indexOf(newMode) < 0){
      toast('🤖 SOLO SUPPORTS FFA, BOMB, CROWN & CTF');
      sfx('back');
      return;
    }
  }
  if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf'];
    if(botModes.indexOf(newMode) < 0){
      toast('🤖 WATCH MODE: FFA, BOMB, CROWN OR CTF');
      sfx('back');
      return;
    }
  }
```

#### AFTER:
```javascript
function setGameMode(newMode){
  if(menu.tab === 'solo'){
    const soloModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(soloModes.indexOf(newMode) < 0){
      toast('🤖 SOLO SUPPORTS FFA, BOMB, CROWN, CTF & INFECTION');
      sfx('back');
      return;
    }
  }
  if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(botModes.indexOf(newMode) < 0){
      toast('🤖 WATCH MODE: FFA, BOMB, CROWN, CTF OR INFECTION');
      sfx('back');
      return;
    }
  }
```

---

### Specification 6: `bot_ai.js` Lines 1067–1071 (`requestMode`)
**Files**: `tag/js/bot_ai.js`, `tag-server/js/bot_ai.js`, `PokiGames/js/bot_ai.js`  
**Target lines**: 1067–1071

#### BEFORE:
```javascript
  if(modeId === 'freeze' || modeId === 'infection'){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); return; }
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isGuest = isOnline && !NET.isHost;
  if(menu.tab === 'solo' && ['party', 'bomb', 'crown', 'ctf'].indexOf(modeId) < 0){ toast('🤖 SOLO: FFA/BOMB/CROWN/CTF ONLY'); sfx('back'); return; }
  if(menu.tab === 'bots' && ['party','freeze','infection','bomb','crown','ctf'].indexOf(modeId) < 0){ toast('🤖 WATCH: FFA/CTF ONLY'); sfx('back'); return; }
```

#### AFTER:
```javascript
  if(modeId === 'freeze'){ toast('❄️ THAT MODE IS COMING SOON!'); sfx('back'); return; }
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isGuest = isOnline && !NET.isHost;
  if(menu.tab === 'solo' && ['party', 'bomb', 'crown', 'ctf', 'infection'].indexOf(modeId) < 0){ toast('🤖 SOLO: FFA/BOMB/CROWN/CTF/INFECTION ONLY'); sfx('back'); return; }
  if(menu.tab === 'bots' && ['party','freeze','infection','bomb','crown','ctf'].indexOf(modeId) < 0){ toast('🤖 WATCH: FFA/CTF ONLY'); sfx('back'); return; }
```

---

### Specification 7: `ui.js` Lines 3440–3453 (Mode Request Popup)
**Files**: `tag/js/ui.js`, `tag-server/js/ui.js`, `PokiGames/js/ui.js`  
**Target lines**: 3440–3453

#### BEFORE:
```javascript
    const soon = (md.id === 'freeze' || md.id === 'infection');
    rr(g, px + 12, ry, pw - 24, rowH, 8);
    g.fillStyle = soon ? 'rgba(255,255,255,0.03)' : (mine ? 'rgba(46,204,113,0.25)' : 'rgba(255,255,255,0.06)');
    g.fill();
    g.lineWidth = mine && !soon ? 2.5 : 1.2;
    g.strokeStyle = mine && !soon ? '#2ecc71' : 'rgba(255,255,255,0.2)';
    g.stroke();
    txt(md.icon + '  ' + md.label, px + 24, ry + rowH / 2 + 1, FN(13, 900), soon ? 'rgba(255,255,255,0.35)' : '#ffffff', 'left');
    txt(soon ? 'COMING SOON' : (cnt ? ('×' + cnt) : ''), px + pw - 24, ry + rowH / 2 + 1, FN(soon ? 10 : 13, 900), soon ? '#ffd166' : '#ffd166', 'right');
    if(soon){
      zone(px + 12, ry, pw - 24, rowH, { fn: function(){ toast('❄️🧟 THAT MODE IS COMING SOON!'); sfx('back'); } });
    } else {
      zone(px + 12, ry, pw - 24, rowH, { fn: (function(id){ return function(){ requestMode(myVoterId(), id); }; })(md.id) });
    }
```

#### AFTER:
```javascript
    const soon = (md.id === 'freeze');
    rr(g, px + 12, ry, pw - 24, rowH, 8);
    g.fillStyle = soon ? 'rgba(255,255,255,0.03)' : (mine ? 'rgba(46,204,113,0.25)' : 'rgba(255,255,255,0.06)');
    g.fill();
    g.lineWidth = mine && !soon ? 2.5 : 1.2;
    g.strokeStyle = mine && !soon ? '#2ecc71' : 'rgba(255,255,255,0.2)';
    g.stroke();
    txt(md.icon + '  ' + md.label, px + 24, ry + rowH / 2 + 1, FN(13, 900), soon ? 'rgba(255,255,255,0.35)' : '#ffffff', 'left');
    txt(soon ? 'COMING SOON' : (cnt ? ('×' + cnt) : ''), px + pw - 24, ry + rowH / 2 + 1, FN(soon ? 10 : 13, 900), soon ? '#ffd166' : '#ffd166', 'right');
    if(soon){
      zone(px + 12, ry, pw - 24, rowH, { fn: function(){ toast('❄️ THAT MODE IS COMING SOON!'); sfx('back'); } });
    } else {
      zone(px + 12, ry, pw - 24, rowH, { fn: (function(id){ return function(){ requestMode(myVoterId(), id); }; })(md.id) });
    }
```

---

### Specification 8: `ui.js` Lines 2393–2396 (Lobby Start Button Check)
**Files**: `tag/js/ui.js`, `tag-server/js/ui.js`, `PokiGames/js/ui.js`  
**Target lines**: 2393–2396

#### BEFORE:
```javascript
        } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && activeSlots().length < 3){
          toast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
          sfx('back');
          return;
        }
```

#### AFTER:
```javascript
        } else if(settings.gameMode === 'freeze' && activeSlots().length < 3){
          toast('⚠️ FREEZE REQUIRES AT LEAST 3 PLAYERS!');
          sfx('back');
          return;
        }
```

---

### Specification 9: `netplay.js` Line 3512 (`mode_request` Handler)
**Files**: `tag/js/netplay.js`, `tag-server/js/netplay.js`, `PokiGames/js/netplay.js`  
**Target lines**: 3510–3514

#### BEFORE:
```javascript
    for(const md of MAPVOTE_MODES){ if(md.id === m.mode){ ok = true; break; } }
    if(!ok) return;
    if(m.mode === 'freeze' || m.mode === 'infection') return;
    V.mseq++;
```

#### AFTER:
```javascript
    for(const md of MAPVOTE_MODES){ if(md.id === m.mode){ ok = true; break; } }
    if(!ok) return;
    if(m.mode === 'freeze') return;
    V.mseq++;
```

---

### Specification 10: `netplay.js` Lines 4435–4438 (Netplay Match Start Validation)
**Files**: `tag/js/netplay.js`, `tag-server/js/netplay.js`, `PokiGames/js/netplay.js`  
**Target lines**: 4435–4438

#### BEFORE:
```javascript
  } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && activeCount < 3){
    netToast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
    return;
  }
```

#### AFTER:
```javascript
  } else if(settings.gameMode === 'freeze' && activeCount < 3){
    netToast('⚠️ FREEZE REQUIRES AT LEAST 3 PLAYERS!');
    return;
  }
```

---

## 5. Verification Method

### 5.1 Syntax Verification
Confirm all modified files pass JavaScript syntax parsing:
```powershell
node --check tag/js/modes/wiring.js
node --check tag/js/bot_ai.js
node --check tag/js/ui.js
node --check tag/js/netplay.js
```
*Pass criteria*: Exit code 0, no errors.

### 5.2 Automated Mode Selection & State Verification
Execute Node.js test script to simulate mode selection and verify state:
```javascript
const { createGameSandbox, loadGameScript } = require('./tests/e2e/harness');
const ctx = createGameSandbox();

// 1. Load config, wiring, bot_ai
loadGameScript(ctx, 'tag/js/config.js');
loadGameScript(ctx, 'tag/js/modes/infection.js');
loadGameScript(ctx, 'tag/js/modes/wiring.js');
loadGameScript(ctx, 'tag/js/bot_ai.js');

// 2. Test cycleGameMode in solo mode
ctx.menu.tab = 'solo';
ctx.settings.gameMode = 'crown';
ctx.cycleGameMode(1); // Should cycle crown -> infection
if (ctx.settings.gameMode !== 'infection') throw new Error(`cycleGameMode failed, expected infection, got ${ctx.settings.gameMode}`);

// 3. Test startMatch in solo mode without reverting to party
ctx.startMatch();
if (ctx.settings.gameMode !== 'infection') throw new Error(`startMatch reverted to ${ctx.settings.gameMode}`);
if (!ctx.match.infectionMode) throw new Error('match.infectionMode is false');

// 4. Test requestMode for infection
ctx.menu.mapVote = { decided: false, votes: {}, modeReq: {}, seq: 0, mseq: 0, opts: [0, 1, 2] };
ctx.requestMode(0, 'infection');
if (!ctx.menu.mapVote.modeReq[0] || ctx.menu.mapVote.modeReq[0].mode !== 'infection') {
  throw new Error('requestMode for infection failed');
}
console.log('FEATURE 4 VERIFICATION PASSED');
```
*Pass criteria*: Script outputs `FEATURE 4 VERIFICATION PASSED` with exit code 0.

### 5.3 Invalidation Conditions
- If selecting `'infection'` in solo or watch-bots mode ever reverts `settings.gameMode` to `'party'`.
- If the post-match mode request popup ever displays `"COMING SOON"` on Infection or refuses clicks.
- If guest mode requests for Infection are dropped by the host.
