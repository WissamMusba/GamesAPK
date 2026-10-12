# Survey Handoff Report: R3 (Gameplay & UI Bug Resolution)

## 1. Observation

### Item 1: Post-Match Map Vote Key Handlers
- **File**: `tag/js/gameplay.js`
- **Lines 105-120**: `selectMapQuick(idx)` changes `settings.map` and invokes `startMatch()`:
  ```javascript
  function selectMapQuick(idx){
    settings.map=(idx+MAPS.length)%MAPS.length;
    buildLevel();
    // Online guests have no map powers at all (no preview): the room runs the host map.
    if(typeof NET!=='undefined'&&NET&&NET.role!==null&&!NET.isHost){
      toast('HOST CONTROLS THE MAP');
      sfx('back');
      return;
    }
    if(match){
      match.mapToast='MAP: '+(settings.map+1)+'. '+MAPS[settings.map].name;
      match.mapToastT=2.4;
      startMatch();
    }
    sfx('ok');
  }
  ```
- **Lines 128, 133-134**: In `updateGame(dt)`:
  ```javascript
  if(anyPressed(['KeyN']))selectMapQuick(settings.map+1);
  if(anyPressed(['KeyB']))cycleTheme();
  if(anyPressed(['KeyV']))voiceToggleMic();
  
  /* Number keys 1-9, 0 to switch to any map instantly */
  for(let k=1;k<=9;k++)if(pressed.has('Digit'+k))selectMapQuick(k-1);
  if(pressed.has('Digit0'))selectMapQuick(9);
  ```
- **Lines 153, 210-212**: Downstream in `updateGame(dt)`:
  ```javascript
  if(match.state==='result'){
  ...
      if(pressed.has('Digit1')) castMapVote(myVoterId(), 0);
      if(pressed.has('Digit2')) castMapVote(myVoterId(), 1);
      if(pressed.has('Digit3')) castMapVote(myVoterId(), 2);
  ```
- Tool verification: Search across `tag/js/` confirms `selectMapQuick` is called on `Digit1`-`Digit9` unconditionally at the top of `updateGame(dt)` before `match.state === 'result'` is handled.

---

### Item 2: Menu Row Navigation Wrapping in Pause Menu
- **File**: `tag/js/ui.js`
- **Lines 3258-3261**:
  ```javascript
  // Online guests get a trimmed menu: no RESTART, no NEXT MAP (host-only powers).
  const isGuestPause=(typeof NET!=='undefined'&&NET&&NET.role!==null&&!NET.isHost);
  const opts=isGuestPause?['RESUME','SOUND: '+(muted?'OFF':'ON'),'FULLSCREEN','QUIT TO MENU']:['RESUME','RESTART','NEXT MAP','SOUND: '+(muted?'OFF':'ON'),'FULLSCREEN','QUIT TO MENU'];
  const nP=opts.length;
  ```
  - For online host and local players: `nP = 6` (`opts`: RESUME [0], RESTART [1], NEXT MAP [2], SOUND [3], FULLSCREEN [4], QUIT TO MENU [5]).
  - For online guest / client: `nP = 4` (`opts`: RESUME [0], SOUND [1], FULLSCREEN [2], QUIT TO MENU [3]).
- **File**: `tag/js/gameplay.js`
- **Lines 137-149**:
  ```javascript
  if(match.state==='paused'||match.hostMenu){
    let up=anyPressed(['ArrowUp','KeyW']),dn=anyPressed(['ArrowDown','KeyS']),cf=anyPressed(['Enter','NumpadEnter','Space']);
    for(let i=0;i<4;i++){const pd=PAD[i];if(!pd)continue;up=up||pd.upE;dn=dn||pd.downE;cf=cf||pd.confirmE;}
    if(up){match.pauseSel=(match.pauseSel+5)%6;sfx('ui');}
    if(dn){match.pauseSel=(match.pauseSel+1)%6;sfx('ui');}
    if(cf){
      if(match.pauseSel===0)togglePause();
      else if(match.pauseSel===1){sfx('go');startMatch();}
      else if(match.pauseSel===2){selectMapQuick(settings.map+1);}
      else if(match.pauseSel===3){toggleSound();}
      else if(match.pauseSel===4){toggleFullscreen();}
      else quitToMenu();
    }
    if(!match.hostMenu) return;
    // host menu open: fall through — the match continues live underneath for everyone
  }
  ```
- **File**: `tag/js/main.js`
- **Lines 54, 125-127**:
  ```javascript
  if(NET.role !== null && !NET.isHost && match){
    // Guest tick block: physUpdate, remote target interp, tag checks
    ...
  } else {
    update(dt);
  }
  ```
  - In `main.js`, online guests do not call `update(dt)` (which calls `updateGame(dt)`). Guest loop in `main.js` has no `KeyP` toggle pause handler and no pause navigation handler when `match.state === 'paused'`.

---

### Item 3: Touch-Device Slot Clamping in `ui.js`
- **File**: `tag/js/ui.js`
- **Lines 1557-1565**:
  ```javascript
  } else {
    if(menu.slotColor[0] < 0) menu.slotColor[0] = 0;
    if(menu.slotColor[1] < 0) menu.slotColor[1] = 1;
    actSlots = [0, 1];
    // Touch devices have no P3/P4 controls: local party is capped at 2 players.
    if(isTouch){ menu.slotColor[2] = -1; menu.slotColor[3] = -1; }
    if(menu.slotColor[2] >= 0) actSlots.push(2);
    if(menu.slotColor[3] >= 0) actSlots.push(3);
  }
  ```
- **Lines 1600-1602**:
  ```javascript
  // Touch: P3/P4 have no on-screen controls, so only 2-player is offered.
  const countOpts = (typeof isTouch !== 'undefined' && isTouch)
    ? (isHunterMode ? [4] : [2])
    : (isHunterMode ? [4, 6, 8] : [2, 3, 4]);
  ```
- **Line 1774**:
  ```javascript
  const showAddCard = (!isSolo && !isBots && actSlots.length < 4 && CW >= 580 && !use2x2 && !isTouch);
  ```
- Tool verification: `menu.slotColor` is a shared global array used by `activeSlots()` (`tag/js/bot_ai.js:711`), player roster display, and lobby configuration. Line 1562 in `ui.js` is the sole line in the codebase resetting `menu.slotColor[2] = -1` and `menu.slotColor[3] = -1` on every frame of `drawMenu()`.

---

### Item 4: Infection Mode HUD & Control Overlay Buttons
- **File**: `tag/js/ui.js`
- **Lines 3041-3064**:
  ```javascript
  function drawHUD(){
    var _modeChromeDone = false;
    if(settings.gameMode === 'infection'){
      try{ if(typeof drawInfectionUI === 'function') drawInfectionUI(); else drawFallbackTimerHUD(); }
      catch(e){ logModeErr('drawInfectionUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
      return;
    }
    if(settings.gameMode === 'bomb'){
      try{ if(typeof drawBombUI === 'function') drawBombUI(); else drawFallbackTimerHUD(); }
      catch(e){ logModeErr('drawBombUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
      _modeChromeDone = true;
    } else if(settings.gameMode === 'crown'){
      try{ if(typeof drawCrownUI === 'function') drawCrownUI(); else drawFallbackTimerHUD(); }
      catch(e){ logModeErr('drawCrownUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
      _modeChromeDone = true;
    } else if(settings.gameMode === 'ctf'){
      try{ if(typeof drawCtfUI === 'function') drawCtfUI(); else drawFallbackTimerHUD(); }
      catch(e){ logModeErr('drawCtfUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
      _modeChromeDone = true;
    } else if(match && match.hunterMode){
      drawHunterHUD();
      return;
    }
  ```
- **Lines 3094-3232**:
  Shared HUD control bar and overlays defined directly below:
  - Line 3094: Touch timer scoreboard zone (`if(_modeChromeDone && isTouch) zone(...)`)
  - Line 3110: Pause button (`drawJuicyIconBtn(xPause, ...)`)
  - Line 3122: Audio Mute button (`drawJuicyIconBtn(xMute, ...)`)
  - Line 3148: Fullscreen button (`drawJuicyIconBtn(xFull, ...)`)
  - Line 3169: Voice Chat button (`drawJuicyIconBtn(xVoice, ...)`)
  - Line 3184: Text Chat toggle button (`drawJuicyIconBtn(xChat, ...)`)
  - Line 3231: Scoreboard modal overlay (`if(scoreboardOpen) drawScoreboard();`)
- **File**: `tag/js/modes/infection.js`
- **Lines 850-958**: `drawInfectionUI()` renders only the background danger vignette, the top center scoreboard pill (infected count, survivor count, phase banner, match timer), and lone survivor repulsor status. It does not render control buttons.

---

## 2. Logic Chain

### Logic Chain for Item 1 (Map Vote Key Handlers)
1. In `tag/js/gameplay.js`, `updateGame(dt)` runs during match execution.
2. At lines 133-134, before checking if `match.state === 'result'` (line 153), `for(let k=1;k<=9;k++) if(pressed.has('Digit'+k)) selectMapQuick(k-1);` checks number keys.
3. In `selectMapQuick` (lines 105-120), if `match` is active, line 117 executes `startMatch()`.
4. When `match.state === 'result'`, the post-match voting cards are displayed, inviting players to vote on map options 1, 2, or 3 using `Digit1`, `Digit2`, and `Digit3` (handled at lines 210-212: `castMapVote(myVoterId(), 0/1/2)`).
5. However, pressing `Digit1`, `Digit2`, or `Digit3` triggers `selectMapQuick` on lines 133-134 first, which sets `settings.map` and immediately calls `startMatch()`.
6. Therefore, pressing 1, 2, or 3 triggers an immediate match restart on the selected map instead of casting a vote.

### Logic Chain for Item 2 (Pause Menu Row Navigation Wrapping)
1. In `tag/js/ui.js` lines 3259-3260, the pause menu options `opts` are defined dynamically based on `isGuestPause`:
   - Host and local players receive 6 options (`nP = 6`).
   - Online guests receive 4 options (`nP = 4`: RESUME, SOUND, FULLSCREEN, QUIT TO MENU).
2. In `tag/js/gameplay.js` lines 140-141, menu navigation wrapping is hardcoded to modulo 6:
   `match.pauseSel = (match.pauseSel + 5) % 6;` and `match.pauseSel = (match.pauseSel + 1) % 6;`.
3. When an online guest navigates, `match.pauseSel` can reach 4 or 5. Because `drawPause` only renders 4 buttons, `match.pauseSel === 4` or `5` selects an invisible out-of-bounds row where no button is highlighted.
4. Furthermore, `gameplay.js` lines 143-148 dispatch confirmation actions using hardcoded indices:
   - Index 1 triggers `startMatch()` (RESTART), but for a guest, button 1 on screen is "SOUND".
   - Index 2 triggers `selectMapQuick()` (NEXT MAP), but for a guest, button 2 on screen is "FULLSCREEN".
   - Index 3 triggers `toggleSound()`, but for a guest, button 3 on screen is "QUIT TO MENU".
5. In addition, `tag/js/main.js` lines 54-124 executes a dedicated guest loop that bypasses `updateGame(dt)` and lacks input listeners for `KeyP` and pause menu navigation keys when `match.state === 'paused'`.

### Logic Chain for Item 3 (Touch-Device Slot Clamping)
1. `menu.slotColor` is a shared 10-element array where indices `>= 0` indicate active player slots.
2. In `tag/js/ui.js` line 1562, inside `drawMenu()`, the check `if(isTouch){ menu.slotColor[2] = -1; menu.slotColor[3] = -1; }` runs on every animation frame in the Party lobby (`menu.tab !== 'online'`).
3. Whenever a 3-player or 4-player configuration is created (e.g. adding bots, pairing Bluetooth gamepads, or in multiplayer lobbies), line 1562 executes on the next frame and strips slots 2 and 3 back to -1.
4. Additionally, line 1601 restricts `countOpts` on touch to `[2]`, preventing touch users from selecting 3 or 4 players, and line 1774 hides the "+ ADD PLAYER" card when `isTouch` is true.

### Logic Chain for Item 4 (Infection Mode HUD Buttons)
1. In `tag/js/ui.js`, `drawHUD()` handles HUD rendering for all game modes.
2. For Bomb, Crown, and CTF modes (lines 3048-3059), after rendering mode-specific HUDs, each block sets `_modeChromeDone = true;` without returning.
3. Execution then flows to lines 3094-3232, where the shared action control bar (Pause, Mute, Fullscreen, Voice, Chat), the touch Scoreboard tap zone, and the Scoreboard modal overlay (`if(scoreboardOpen) drawScoreboard()`) are rendered.
4. For Infection mode (line 3046), `drawHUD()` executes `return;` immediately after `drawInfectionUI()`.
5. Because `drawInfectionUI()` in `tag/js/modes/infection.js` does not render any control buttons, the early `return;` at line 3046 completely cuts off lines 3094-3232, removing all control buttons and scoreboard functionality from Infection mode.

---

## 3. Caveats

1. **Party vs Online Tab Switching**: `menu.slotColor[2] = -1; menu.slotColor[3] = -1;` was added to `ui.js:1562` because local 2-player touch mode only provides on-screen controls for 2 players. However, local play with bots or Bluetooth gamepads, as well as multiplayer lobbies, requires preserving slots 2 and 3. Removing the unconditional per-frame reset preserves slots without breaking 2-player touch controls (which check `match.players.length === 2 && !menu.botOn`).
2. **Online Guest Pause in Main Loop**: Because `main.js` splits host and guest ticks, fixing pause menu wrapping in `gameplay.js` requires either calling pause handling from `main.js` when `match.state === 'paused'` or ensuring `updateGame` handles guest pause state.

---

## 4. Conclusion

The root causes for all four R3 bugs have been pinpointed to exact lines:

1. **Post-match map vote key handlers**:
   - Location: `tag/js/gameplay.js:128, 133-134`
   - Cause: `updateGame(dt)` runs quick map switch handlers (`selectMapQuick`) before `match.state === 'result'` can handle `Digit1-3`.
   - Fix: Gate lines 128, 133-134 behind `if(!match || (match.state !== 'result' && match.state !== 'hunter_round_result'))`.
2. **Menu row navigation wrapping in pause menu**:
   - Locations: `tag/js/gameplay.js:140-149`, `tag/js/ui.js:3258-3261`, `tag/js/main.js:54-124`
   - Cause: Navigation wrapping uses hardcoded `% 6`, while guests have 4 options; action confirmation dispatches by fixed index rather than option ID; guests lack pause input handlers in `main.js`.
   - Fix: Compute options dynamically (`opts = isGuestPause ? [...] : [...]`, `nP = opts.length`), wrap with `(match.pauseSel - 1 + nP) % nP` and `(match.pauseSel + 1) % nP`, dispatch confirm using `opts[match.pauseSel]`, and hook guest pause inputs into `main.js`.
3. **Touch-device slot clamping**:
   - Locations: `tag/js/ui.js:1562`, `tag/js/ui.js:1600-1602`, `tag/js/ui.js:1774`
   - Cause: Per-frame forced reset `menu.slotColor[2] = -1; menu.slotColor[3] = -1;` in `drawMenu()` when `isTouch` is true, plus clamping `countOpts` to `[2]`.
   - Fix: Remove line 1562, permit `countOpts = [2, 3, 4]` on touch devices in line 1601, and enable `showAddCard` where layout permits.
4. **Infection mode HUD**:
   - Location: `tag/js/ui.js:3043-3047`
   - Cause: Early `return;` on line 3046 terminates `drawHUD()` before reaching the control bar (lines 3094-3232).
   - Fix: Replace `return;` on line 3046 with `_modeChromeDone = true;`, matching Bomb, Crown, and CTF modes.

---

## 5. Verification Method

### 1. Code Syntax and Lint Inspection
Execute the Node syntax verification command:
```bash
node --check tag/js/gameplay.js tag/js/ui.js tag/js/main.js tag/js/modes/infection.js
```
Expected result: Exit code 0, zero syntax errors.

### 2. Manual/Automated Test Scenarios
- **Map Vote Hotkeys**:
  - In a match, allow the timer to expire or force `match.state = 'result'`.
  - Press `1`, `2`, or `3`.
  - Verify that `castMapVote` is triggered and `menu.mapVote.votes` registers the pick, without invoking `startMatch()` or resetting to a new round immediately.
- **Pause Menu Wrapping**:
  - In a guest session (`NET.role === 'guest'`), open the pause menu (`match.state === 'paused'`).
  - Press Up Arrow from index 0 ("RESUME") -> selection must wrap to index 3 ("QUIT TO MENU").
  - Press Down Arrow from index 3 ("QUIT TO MENU") -> selection must wrap to index 0 ("RESUME").
  - Press Enter on index 1 ("SOUND") -> toggles sound mute without triggering `startMatch()`.
- **Touch Slot Clamping**:
  - In mobile touch simulation (`isTouch = true`), set `menu.slotColor[2] = 2; menu.slotColor[3] = 3;`.
  - Execute multiple render frames (`drawMenu()`).
  - Verify `menu.slotColor[2]` and `menu.slotColor[3]` remain `>= 0` and are not reset to `-1`.
- **Infection Mode HUD**:
  - Set `settings.gameMode = 'infection'` and start match.
  - Inspect HUD in canvas: Pause button, Audio Mute button, Fullscreen button, Chat button, and Voice button must be rendered on the top right.
  - Tapping/clicking the Pause button must call `togglePause()`.
  - Pressing Tab or tapping the timer pill must toggle `scoreboardOpen` and display the scoreboard modal.
