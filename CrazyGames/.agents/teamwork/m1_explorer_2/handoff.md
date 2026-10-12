# Handoff Report: Features 2 & 3 Implementation Plan (Runtime Exports, Wiring, and Fallback Prevention)

**Agent**: `m1_explorer_2`  
**Milestone**: M1 - Features 2 & 3 Deep Dive & Implementation Plan  
**Date**: 2026-10-11  
**Target Files**:
- `tag/js/modes/bomb.js`, `tag-server/js/modes/bomb.js`, `PokiGames/js/modes/bomb.js`
- `tag/js/modes/crown.js`, `tag-server/js/modes/crown.js`, `PokiGames/js/modes/crown.js`
- `tag/js/modes/ctf.js`, `tag-server/js/modes/ctf.js`, `PokiGames/js/modes/ctf.js`
- `tag/js/modes/infection.js`, `tag-server/js/modes/infection.js`, `PokiGames/js/modes/infection.js`
- `tag/js/modes/wiring.js`, `tag-server/js/modes/wiring.js`, `PokiGames/js/modes/wiring.js`
- `tag/js/bot_ai.js`, `tag-server/js/bot_ai.js`, `PokiGames/js/bot_ai.js`

---

## 1. Observation

### 1.1 Mode Function Export Mechanisms Across Mode Files

1. **`tag/js/modes/bomb.js` (lines 1152–1176)**:
   ```javascript
   1152:   // Attach to global window scope in browser
   1153:   const bScope = (typeof window !== "undefined") ? window : (typeof globalThis !== "undefined" ? globalThis : root);
   1154:   if (bScope) {
   1155:     bScope.initBombMode = initBombMode;
   1156:     bScope.updateBombMode = updateBombMode;
   1157:     bScope.checkBombTag = checkBombTag;
   1158:     bScope.drawBombUI = drawBombUI;
   1159:     bScope.drawBombPlayer = drawBombPlayer;
   1160:     bScope.bombBotThink = bombBotThink;
   1161:     bScope.BOMB_MODE = BOMB_MODE;
   1162:     bScope.BOMB_CONFIG = BOMB_CONFIG;
   1163:     bScope.ModeBomb = ModeBomb;
   1164:   }
   1165:   if (typeof root !== 'undefined') {
   1166:     root.initBombMode = initBombMode;
   1167:     root.updateBombMode = updateBombMode;
   1168:     root.checkBombTag = checkBombTag;
   1169:     root.drawBombUI = drawBombUI;
   1170:     root.drawBombPlayer = drawBombPlayer;
   1171:     root.bombBotThink = bombBotThink;
   1172:     root.BOMB_MODE = BOMB_MODE;
   1173:     root.BOMB_CONFIG = BOMB_CONFIG;
   1174:     root.ModeBomb = ModeBomb;
   1175:   }
   ```
   *Deficiency*: When `window` is defined, `bScope` selects `window`, and `root` is `window`, so symbols are never explicitly attached to `globalThis`. If tests or Node run in an environment where `globalThis` is distinct from a mock `window`, `globalThis` remains unpopulated.

2. **`tag/js/modes/crown.js` (lines 1345–1398)**:
   ```javascript
   1345:   function attachCrownModeHooks() {
   1346:     const cScope = (typeof window !== "undefined") ? window : (typeof globalThis !== "undefined" ? globalThis : null);
   1347:     if(cScope){
   1348:       cScope.initCrownMode = initCrownMode;
   ...
   1361:     if (typeof window === 'undefined') return;
   1362: 
   1363:     // Expose main interface onto global window
   1364:     window.initCrownMode = initCrownMode;
   ...
   1378:     if (typeof window.CrownMode === 'undefined') {
   1379:       window.CrownMode = { ... };
   1380:     }
   1381:   }
   1382: 
   1383:   // Run auto-attacher in browser environment
   1384:   if (typeof window !== 'undefined') {
   1385:     attachCrownModeHooks();
   1386:   }
   ```
   *Deficiency*: Line 1396 guards the attachment with `if (typeof window !== 'undefined')`, and line 1361 exits early if `window` is undefined. In headless Node.js or test runners without a DOM window, `attachCrownModeHooks()` is NEVER called. Furthermore, `CrownMode` is attached ONLY to `window.CrownMode`, never `globalThis.CrownMode`.

3. **`tag/js/modes/ctf.js` (lines 1415–1428)**:
   ```javascript
   1415:   if (gScope) {
   1416:     gScope.initCtfMode = initCtfMode;
   1417:     gScope.updateCtf = updateCtf;
   1418:     gScope.checkCtfTag = checkCtfTag;
   1419:     gScope.drawCtfUI = drawCtfUI;
   1420:     gScope.drawCtfPlayer = drawCtfPlayer;
   1421:     gScope.drawCtfEntities = drawCtfEntities;
   1422:     gScope.drawCtfWorldFX = drawCtfWorldFX;
   1423:     gScope.ctfBotThink = ctfBotThink;
   1424:     gScope.triggerCtfWin = triggerCtfWin;
   1425:     gScope.ctfState = ctfState;
   1426:     gScope.CTF_CONFIG = CTF_CONFIG;
   1427:     gScope.CtfMode = ctfModuleExports;
   1428:   }
   ```
   *Deficiency*: `gScope` is `(typeof window !== 'undefined') ? window : ...`. If `window` is present, it does not guarantee attachment to `globalThis`.

4. **`tag/js/modes/infection.js` (lines 1047–1095)**:
   ```javascript
   1047:   function hookInfectionMode() {
   1048:     // Expose functions globally for direct use by index.html
   1049:     gScope.initInfectionMode = initInfectionMode;
   1050:     if(typeof globalThis !== "undefined"){
   1051:       globalThis.initInfectionMode = initInfectionMode;
   ...
   1078:     if (typeof gScope.InfectionMode === 'undefined') {
   1079:       gScope.InfectionMode = { ... };
   1080:     }
   ```
   *Deficiency*: `InfectionMode` object is attached to `gScope` (which defaults to `window`), but omitted from `globalThis.InfectionMode` when `window !== globalThis`.

---

### 1.2 Mode Wiring & Registration in `tag/js/modes/wiring.js`

1. **Top-Level Static Variable Binding (lines 1–53)**:
   ```javascript
   1: /* Export live mode references to top-level lexical scope */
   2: var initInfectionMode = (typeof window !== "undefined" && window.initInfectionMode) || (typeof globalThis !== "undefined" ? globalThis.initInfectionMode : null);
   ...
   17: var initBombMode = (typeof window !== "undefined" && window.initBombMode) || (typeof globalThis !== "undefined" ? globalThis.initBombMode : null);
   ...
   27: var initCrownMode = (typeof window !== "undefined" && window.initCrownMode) || (typeof globalThis !== "undefined" ? globalThis.initCrownMode : null);
   ...
   41: var initCtfMode = (typeof window !== "undefined" && window.initCtfMode) || (typeof globalThis !== "undefined" ? globalThis.initCtfMode : null);
   ```
   *Deficiency*: These top-level lexical variables capture `window.*` at the exact moment `wiring.js` is evaluated. If any script is loaded asynchronously, deferred, or re-initialized in a testing harness, these lexical variables remain statically bound to `null`.

2. **Match Start Mode Invocation (lines 202–218)**:
   ```javascript
   202:   if(settings.gameMode === 'infection'){
   203:     if(typeof initInfectionMode === 'function') initInfectionMode();
   204:   } else if(settings.gameMode === 'bomb'){
   205:     if(typeof initBombMode === 'function') initBombMode();
   206:   } else if(settings.gameMode === 'crown'){
   207:     match.it = -1;
   208:     if(typeof initCrownMode === 'function') initCrownMode();
   209:   } else if(settings.gameMode === 'ctf'){
   210:     match.it = -1;
   211:     if(typeof initCtfMode === 'function') initCtfMode();
   212:   }
   213:   // Clear stale mode flags when leaving bomb/crown/ctf (init only sets active=true).
   214:   try{
   215:     if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE && settings.gameMode !== 'bomb') BOMB_MODE.active = false;
   216:     if(typeof crownState !== 'undefined' && crownState && settings.gameMode !== 'crown') crownState.active = false;
   217:     if(typeof ctfState !== 'undefined' && ctfState && settings.gameMode !== 'ctf') ctfState.active = false;
   218:   }catch(e){}
   ```
   *Deficiencies*:
   - If `initBombMode` / `initCrownMode` / `initCtfMode` / `initInfectionMode` evaluated to `null` initially, `startMatch()` skips mode setup without attempting to resolve them from `window` or `globalThis`, silently launching default Party mode.
   - For Crown and CTF, `match.it = -1` executes before the function check. If `initCrownMode` or `initCtfMode` fails to execute, the match starts with `match.it = -1` and no active mode entities, soft-locking the gameplay.
   - Line 215–217 clears stale active flags for `BOMB_MODE`, `crownState`, and `ctfState`, but neglects `infectionState`.

3. **Solo & Bots Tab Mode Fallbacks in `startMatch()` (lines 67–80)**:
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
   ```
   *Deficiency*: `'infection'` is missing from `soloModes` and `botModes`. Starting a solo or bot match with Infection selected immediately resets `settings.gameMode = 'party'`.

4. **Missing Exports in `wiring.js` (lines 240–262)**:
   `startMatch()`, `quitToMenu()`, and `returnToLobby()` are declared as plain function declarations without explicit attachment to `window`, `globalThis`, or `module.exports`.

---

### 1.3 Tab Click Mode Wiping in `tag/js/bot_ai.js` (`setMenuTab`)

1. **`tag/js/bot_ai.js` (lines 662–678)**:
   ```javascript
   662: function setMenuTab(tab){
   663:   if(tab !== 'solo' && tab !== '2p' && tab !== 'online' && tab !== 'bots') tab = '2p';
   664:   menu.tab = tab;
   665:   if(tab === 'solo'){
   666:     menu.botOn = true;
   667:     settings.teams = false;
   668:     settings.gameMode = 'party';
   669:     menu.gameMode = 'party';
   670:     menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
   671:   } else if(tab === 'bots'){
   672:     menu.botOn = true;
   673:     settings.teams = false;
   674:     settings.gameMode = 'party';
   675:     menu.gameMode = 'party';
   676:     menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
   677:     if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
   678:   } else if(tab === '2p'){
   ```
   *Deficiency*: When a user navigates the lobby menu and clicks the "SOLO" or "BOTS" tab (handled via `ui.js:1513: fn: () => setMenuTab(tab.id)`), lines 668 and 674 unconditionally overwrite `settings.gameMode = 'party'` and `menu.gameMode = 'party'`, wiping out any prior selection of Bomb, Crown, CTF, or Infection.

2. **`setGameMode` Filter in `tag/js/bot_ai.js` (lines 1211–1226)**:
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
   *Deficiency*: Rejects setting Infection in Solo or Bots mode.

---

## 2. Logic Chain

1. **Failure of Global Availability**:
   Because `crown.js` guards hook attachment with `typeof window !== 'undefined'`, running tests in Node.js or environments where `window` is polyfilled after script load fails to register `initCrownMode`, `updateCrownMode`, etc. on `globalThis`. Similarly, `bomb.js`, `ctf.js`, and `infection.js` conditionally pick either `window` OR `globalThis`, risking desynchronization if an environment checks `globalThis` while scripts attached to `window`.
2. **Null Reference Cascades in `wiring.js`**:
   `wiring.js` samples global mode hooks once at parse time. If `initBombMode` was not yet available, `var initBombMode` permanently stores `null`. When `startMatch()` is called, `typeof initBombMode === 'function'` evaluates to `false`. For Crown and CTF, `match.it = -1` executes, but the initialization function never runs, resulting in uninitialized matches with broken tag logic.
3. **Menu Tab Clicks Erasing Mode Configuration**:
   When users switch tabs in the menu to Solo or Bots, `setMenuTab` immediately sets `settings.gameMode = 'party'`. Even if the player deliberately chose Bomb Tag or CTF, clicking the tab erases the choice. Furthermore, `settings.teams = false` breaks CTF (which requires `settings.teams = true`).
4. **Hardcoded Fallbacks in `startMatch()`**:
   When `startMatch()` runs for `solo` or `bots`, `soloModes` and `botModes` lack `'infection'`. Even if Infection was configured, lines 70 and 77 force `settings.gameMode = 'party'`.
5. **Downstream Game Engine Reversion**:
   When mode initialization fails or is wiped:
   - `hunter.js:checkTag()` tests `typeof checkBombTag === 'function'`; failing this, it falls through to classic Party tag.
   - `ui.js:drawHUD()` tests `typeof drawBombUI === 'function'`; failing this, it invokes `drawFallbackTimerHUD()`.
   - `renderer.js` tests `typeof drawBombPlayer === 'function'`; failing this, player rendering falls back to normal Party sprites.
   - `bot_engine.js` checks `BOMB_MODE.active`; failing this, bots fall back to FFA chase heuristics.

---

## 3. Caveats

1. **Syntax Fix Dependency (Feature 1)**:
   The mode files currently fail `node --check` due to unclosed/missing comment delimiters. The implementation of Feature 2 & 3 assumes Feature 1 syntax corrections are applied so that scripts execute.
2. **Infection UI Unlock Scope (Feature 4)**:
   Infection mode is additionally gated in `bot_ai.js:1067` and `ui.js:3440` with `"THAT MODE IS COMING SOON!"` and excluded from `cycleGameMode:1283`. While Feature 3 ensures `setMenuTab` and `wiring.js` preserve Infection without reverting to Party, the full UI unlock and cycle rotation belong to Feature 4.
3. **Repository Multi-Target Discipline**:
   All modifications must be applied identically across `tag/`, `tag-server/`, and `PokiGames/` to keep online signaling clients and Poki export distributions in sync.

---

## 4. Conclusion & Implementation Specifications

To guarantee runtime exports, robust wiring, and complete fallback prevention, apply the following line-by-line changes across the codebase.

---

### 4.1 Specification: `tag/js/modes/bomb.js` (and mirror files `tag-server/js/modes/bomb.js`, `PokiGames/js/modes/bomb.js`)

#### Change B1: Multi-target Global Exports for Bomb Mode
- **Target File**: `tag/js/modes/bomb.js` (and mirrors)
- **StartLine**: 1152
- **EndLine**: 1176
- **TargetContent**:
```javascript
  // Attach to global window scope in browser
  const bScope = (typeof window !== "undefined") ? window : (typeof globalThis !== "undefined" ? globalThis : root);
  if (bScope) {
    bScope.initBombMode = initBombMode;
    bScope.updateBombMode = updateBombMode;
    bScope.checkBombTag = checkBombTag;
    bScope.drawBombUI = drawBombUI;
    bScope.drawBombPlayer = drawBombPlayer;
    bScope.bombBotThink = bombBotThink;
    bScope.BOMB_MODE = BOMB_MODE;
    bScope.BOMB_CONFIG = BOMB_CONFIG;
    bScope.ModeBomb = ModeBomb;
  }
  if (typeof root !== 'undefined') {
    root.initBombMode = initBombMode;
    root.updateBombMode = updateBombMode;
    root.checkBombTag = checkBombTag;
    root.drawBombUI = drawBombUI;
    root.drawBombPlayer = drawBombPlayer;
    root.bombBotThink = bombBotThink;
    root.BOMB_MODE = BOMB_MODE;
    root.BOMB_CONFIG = BOMB_CONFIG;
    root.ModeBomb = ModeBomb;
  }
```
- **ReplacementContent**:
```javascript
  // Attach to global window and globalThis scopes across all runtime environments
  const exportTargets = [];
  if (typeof window !== 'undefined' && exportTargets.indexOf(window) < 0) exportTargets.push(window);
  if (typeof globalThis !== 'undefined' && exportTargets.indexOf(globalThis) < 0) exportTargets.push(globalThis);
  if (typeof root !== 'undefined' && root && exportTargets.indexOf(root) < 0) exportTargets.push(root);

  for (let i = 0; i < exportTargets.length; i++) {
    const target = exportTargets[i];
    target.initBombMode = initBombMode;
    target.updateBombMode = updateBombMode;
    target.checkBombTag = checkBombTag;
    target.drawBombUI = drawBombUI;
    target.drawBombPlayer = drawBombPlayer;
    target.bombBotThink = bombBotThink;
    target.BOMB_MODE = BOMB_MODE;
    target.BOMB_CONFIG = BOMB_CONFIG;
    target.ModeBomb = ModeBomb;
  }
```
- **Description**: Ensures all Bomb Tag functions and state constants are simultaneously published to `window`, `globalThis`, and `root`.

---

### 4.2 Specification: `tag/js/modes/crown.js` (and mirror files `tag-server/js/modes/crown.js`, `PokiGames/js/modes/crown.js`)

#### Change C1: Multi-target Global Exports & Unconditional Attachment for Crown Mode
- **Target File**: `tag/js/modes/crown.js` (and mirrors)
- **StartLine**: 1345
- **EndLine**: 1399
- **TargetContent**:
```javascript
  function attachCrownModeHooks() {
    const cScope = (typeof window !== "undefined") ? window : (typeof globalThis !== "undefined" ? globalThis : null);
    if(cScope){
      cScope.initCrownMode = initCrownMode;
      cScope.updateCrownMode = updateCrownMode;
      cScope.checkCrownTag = checkCrownTag;
      cScope.drawCrownUI = drawCrownUI;
      cScope.drawCrownPlayer = drawCrownPlayer;
      cScope.crownBotThink = crownBotThink;
      cScope.getCrownPlayerSpeed = getCrownPlayerSpeed;
      cScope.drawCrownEntity = drawCrownEntity;
      cScope.drawCrownWorldFX = drawCrownWorldFX;
      cScope.spawnCrownShockwave = spawnCrownShockwave;
      cScope.CROWN_CONFIG = CROWN_CONFIG;
      cScope.crownState = crownState;
    }
    if (typeof window === 'undefined') return;

    // Expose main interface onto global window
    window.initCrownMode = initCrownMode;
    window.updateCrownMode = updateCrownMode;
    window.checkCrownTag = checkCrownTag;
    window.drawCrownUI = drawCrownUI;
    window.drawCrownPlayer = drawCrownPlayer;
    window.crownBotThink = crownBotThink;
    window.getCrownPlayerSpeed = getCrownPlayerSpeed;
    window.drawCrownEntity = drawCrownEntity;
    window.drawCrownWorldFX = drawCrownWorldFX;
    window.spawnCrownShockwave = spawnCrownShockwave;
    window.CROWN_CONFIG = CROWN_CONFIG;
    window.crownState = crownState;

    // Helper: auto-trigger on match start if gameMode === 'crown'
    if (typeof window.CrownMode === 'undefined') {
      window.CrownMode = {
        init: initCrownMode,
        update: updateCrownMode,
        checkTag: checkCrownTag,
        drawUI: drawCrownUI,
        drawPlayer: drawCrownPlayer,
        botThink: crownBotThink,
        getSpeed: getCrownPlayerSpeed,
        drawCrown: drawCrownEntity,
        drawWorldFX: drawCrownWorldFX,
        state: crownState,
        config: CROWN_CONFIG
      };
    }
  }

  // Run auto-attacher in browser environment
  if (typeof window !== 'undefined') {
    attachCrownModeHooks();
  }
```
- **ReplacementContent**:
```javascript
  function attachCrownModeHooks() {
    const targets = [];
    if (typeof window !== 'undefined' && targets.indexOf(window) < 0) targets.push(window);
    if (typeof globalThis !== 'undefined' && targets.indexOf(globalThis) < 0) targets.push(globalThis);
    if (typeof root !== 'undefined' && root && targets.indexOf(root) < 0) targets.push(root);

    const crownModeObj = {
      init: initCrownMode,
      update: updateCrownMode,
      checkTag: checkCrownTag,
      drawUI: drawCrownUI,
      drawPlayer: drawCrownPlayer,
      botThink: crownBotThink,
      getSpeed: getCrownPlayerSpeed,
      drawCrown: drawCrownEntity,
      drawWorldFX: drawCrownWorldFX,
      state: crownState,
      config: CROWN_CONFIG
    };

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      t.initCrownMode = initCrownMode;
      t.updateCrownMode = updateCrownMode;
      t.checkCrownTag = checkCrownTag;
      t.drawCrownUI = drawCrownUI;
      t.drawCrownPlayer = drawCrownPlayer;
      t.crownBotThink = crownBotThink;
      t.getCrownPlayerSpeed = getCrownPlayerSpeed;
      t.drawCrownEntity = drawCrownEntity;
      t.drawCrownWorldFX = drawCrownWorldFX;
      t.spawnCrownShockwave = spawnCrownShockwave;
      t.CROWN_CONFIG = CROWN_CONFIG;
      t.crownState = crownState;
      t.CrownMode = crownModeObj;
    }
  }

  // Run auto-attacher across browser and Node.js environments
  attachCrownModeHooks();
```
- **Description**: Eliminates the `typeof window === 'undefined'` blocker, attaching Crown mode functions and `CrownMode` object to both `window` and `globalThis`.

---

### 4.3 Specification: `tag/js/modes/ctf.js` (and mirror files `tag-server/js/modes/ctf.js`, `PokiGames/js/modes/ctf.js`)

#### Change T1: Multi-target Global Exports for CTF Mode
- **Target File**: `tag/js/modes/ctf.js` (and mirrors)
- **StartLine**: 1415
- **EndLine**: 1429
- **TargetContent**:
```javascript
  if (gScope) {
    gScope.initCtfMode = initCtfMode;
    gScope.updateCtf = updateCtf;
    gScope.checkCtfTag = checkCtfTag;
    gScope.drawCtfUI = drawCtfUI;
    gScope.drawCtfPlayer = drawCtfPlayer;
    gScope.drawCtfEntities = drawCtfEntities;
    gScope.drawCtfWorldFX = drawCtfWorldFX;
    gScope.ctfBotThink = ctfBotThink;
    gScope.triggerCtfWin = triggerCtfWin;
    gScope.ctfState = ctfState;
    gScope.CTF_CONFIG = CTF_CONFIG;
    gScope.CtfMode = ctfModuleExports;
  }
```
- **ReplacementContent**:
```javascript
  const targets = [];
  if (typeof window !== 'undefined' && targets.indexOf(window) < 0) targets.push(window);
  if (typeof globalThis !== 'undefined' && targets.indexOf(globalThis) < 0) targets.push(globalThis);
  if (typeof root !== 'undefined' && root && targets.indexOf(root) < 0) targets.push(root);

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    t.initCtfMode = initCtfMode;
    t.updateCtf = updateCtf;
    t.checkCtfTag = checkCtfTag;
    t.drawCtfUI = drawCtfUI;
    t.drawCtfPlayer = drawCtfPlayer;
    t.drawCtfEntities = drawCtfEntities;
    t.drawCtfWorldFX = drawCtfWorldFX;
    t.ctfBotThink = ctfBotThink;
    t.triggerCtfWin = triggerCtfWin;
    t.ctfState = ctfState;
    t.CTF_CONFIG = CTF_CONFIG;
    t.CtfMode = ctfModuleExports;
  }
```
- **Description**: Ensures CTF module functions and state objects are published to both `window` and `globalThis`.

---

### 4.4 Specification: `tag/js/modes/infection.js` (and mirror files `tag-server/js/modes/infection.js`, `PokiGames/js/modes/infection.js`)

#### Change I1: Multi-target Global Exports for Infection Mode
- **Target File**: `tag/js/modes/infection.js` (and mirrors)
- **StartLine**: 1047
- **EndLine**: 1095
- **TargetContent**:
```javascript
  function hookInfectionMode() {
    // Expose functions globally for direct use by index.html
    gScope.initInfectionMode = initInfectionMode;
    if(typeof globalThis !== "undefined"){
      globalThis.initInfectionMode = initInfectionMode;
      globalThis.updateInfection = updateInfection;
      globalThis.checkInfectionTag = checkInfectionTag;
      globalThis.drawInfectionUI = drawInfectionUI;
      globalThis.drawInfectionPlayer = drawInfectionPlayer;
      globalThis.infectionBotThink = infectionBotThink;
      globalThis.getInfectionPlayerSpeed = getInfectionPlayerSpeed;
      globalThis.getInfectionHoldLift = getInfectionHoldLift;
      globalThis.drawInfectionShockwaves = drawInfectionShockwaves;
      globalThis.drawInfectionSlime = drawInfectionSlime;
      globalThis.triggerRepulsorPulse = triggerRepulsorPulse;
      globalThis.infectionState = infectionState;
      globalThis.INFECTION_CONFIG = INFECTION_CONFIG;
    }
    gScope.updateInfection = updateInfection;
    gScope.checkInfectionTag = checkInfectionTag;
    gScope.drawInfectionUI = drawInfectionUI;
    gScope.drawInfectionPlayer = drawInfectionPlayer;
    gScope.infectionBotThink = infectionBotThink;
    gScope.getInfectionPlayerSpeed = getInfectionPlayerSpeed;
    gScope.getInfectionHoldLift = getInfectionHoldLift;
    gScope.drawInfectionShockwaves = drawInfectionShockwaves;
    gScope.drawInfectionSlime = drawInfectionSlime;
    gScope.triggerRepulsorPulse = triggerRepulsorPulse;
    gScope.infectionState = infectionState;
    gScope.INFECTION_CONFIG = INFECTION_CONFIG;

    if (typeof gScope.InfectionMode === 'undefined') {
      gScope.InfectionMode = {
        init: initInfectionMode,
        update: updateInfection,
        checkTag: checkInfectionTag,
        drawUI: drawInfectionUI,
        drawPlayer: drawInfectionPlayer,
        drawShockwaves: drawInfectionShockwaves,
        drawSlime: drawInfectionSlime,
        botThink: infectionBotThink,
        getSpeed: getInfectionPlayerSpeed,
        getHoldLift: getInfectionHoldLift,
        repulsorPulse: triggerRepulsorPulse,
        state: infectionState,
        config: INFECTION_CONFIG
      };
    }
  }
```
- **ReplacementContent**:
```javascript
  function hookInfectionMode() {
    const targets = [];
    if (typeof window !== 'undefined' && targets.indexOf(window) < 0) targets.push(window);
    if (typeof globalThis !== 'undefined' && targets.indexOf(globalThis) < 0) targets.push(globalThis);
    if (typeof root !== 'undefined' && root && targets.indexOf(root) < 0) targets.push(root);

    const modeObj = {
      init: initInfectionMode,
      update: updateInfection,
      checkTag: checkInfectionTag,
      drawUI: drawInfectionUI,
      drawPlayer: drawInfectionPlayer,
      drawShockwaves: drawInfectionShockwaves,
      drawSlime: drawInfectionSlime,
      botThink: infectionBotThink,
      getSpeed: getInfectionPlayerSpeed,
      getHoldLift: getInfectionHoldLift,
      repulsorPulse: triggerRepulsorPulse,
      state: infectionState,
      config: INFECTION_CONFIG
    };

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      t.initInfectionMode = initInfectionMode;
      t.updateInfection = updateInfection;
      t.checkInfectionTag = checkInfectionTag;
      t.drawInfectionUI = drawInfectionUI;
      t.drawInfectionPlayer = drawInfectionPlayer;
      t.infectionBotThink = infectionBotThink;
      t.getInfectionPlayerSpeed = getInfectionPlayerSpeed;
      t.getInfectionHoldLift = getInfectionHoldLift;
      t.drawInfectionShockwaves = drawInfectionShockwaves;
      t.drawInfectionSlime = drawInfectionSlime;
      t.triggerRepulsorPulse = triggerRepulsorPulse;
      t.infectionState = infectionState;
      t.INFECTION_CONFIG = INFECTION_CONFIG;
      t.InfectionMode = modeObj;
    }
  }
```
- **Description**: Uniformly registers Infection mode symbols and `InfectionMode` object across `window`, `globalThis`, and `root`.

---

### 4.5 Specification: `tag/js/modes/wiring.js` (and mirror files `tag-server/js/modes/wiring.js`, `PokiGames/js/modes/wiring.js`)

#### Change W1: Dynamic Mode Resolution & Refresh Helper in `wiring.js`
- **Target File**: `tag/js/modes/wiring.js` (and mirrors)
- **StartLine**: 1
- **EndLine**: 54
- **TargetContent**:
```javascript
/* Export live mode references to top-level lexical scope */
var initInfectionMode = (typeof window !== "undefined" && window.initInfectionMode) || (typeof globalThis !== "undefined" ? globalThis.initInfectionMode : null);
var updateInfection = (typeof window !== "undefined" && window.updateInfection) || (typeof globalThis !== "undefined" ? globalThis.updateInfection : null);
var checkInfectionTag = (typeof window !== "undefined" && window.checkInfectionTag) || (typeof globalThis !== "undefined" ? globalThis.checkInfectionTag : null);
var drawInfectionUI = (typeof window !== "undefined" && window.drawInfectionUI) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionUI : null);
var drawInfectionPlayer = (typeof window !== "undefined" && window.drawInfectionPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionPlayer : null);
var infectionBotThink = (typeof window !== "undefined" && window.infectionBotThink) || (typeof globalThis !== "undefined" ? globalThis.infectionBotThink : null);
var getInfectionPlayerSpeed = (typeof window !== "undefined" && window.getInfectionPlayerSpeed) || (typeof globalThis !== "undefined" ? globalThis.getInfectionPlayerSpeed : null);
var getInfectionHoldLift = (typeof window !== "undefined" && window.getInfectionHoldLift) || (typeof globalThis !== "undefined" ? globalThis.getInfectionHoldLift : null);
var drawInfectionShockwaves = (typeof window !== "undefined" && window.drawInfectionShockwaves) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionShockwaves : null);
var drawInfectionSlime = (typeof window !== "undefined" && window.drawInfectionSlime) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionSlime : null);
var triggerRepulsorPulse = (typeof window !== "undefined" && window.triggerRepulsorPulse) || (typeof globalThis !== "undefined" ? globalThis.triggerRepulsorPulse : null);
var infectionState = (typeof window !== "undefined" && window.infectionState) || (typeof globalThis !== "undefined" ? globalThis.infectionState : null);
var INFECTION_CONFIG = (typeof window !== "undefined" && window.INFECTION_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.INFECTION_CONFIG : null);
var InfectionMode = (typeof window !== "undefined" && window.InfectionMode) || (typeof globalThis !== "undefined" ? globalThis.InfectionMode : null);

var initBombMode = (typeof window !== "undefined" && window.initBombMode) || (typeof globalThis !== "undefined" ? globalThis.initBombMode : null);
var updateBombMode = (typeof window !== "undefined" && window.updateBombMode) || (typeof globalThis !== "undefined" ? globalThis.updateBombMode : null);
var checkBombTag = (typeof window !== "undefined" && window.checkBombTag) || (typeof globalThis !== "undefined" ? globalThis.checkBombTag : null);
var drawBombUI = (typeof window !== "undefined" && window.drawBombUI) || (typeof globalThis !== "undefined" ? globalThis.drawBombUI : null);
var drawBombPlayer = (typeof window !== "undefined" && window.drawBombPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawBombPlayer : null);
var bombBotThink = (typeof window !== "undefined" && window.bombBotThink) || (typeof globalThis !== "undefined" ? globalThis.bombBotThink : null);
var BOMB_MODE = (typeof window !== "undefined" && window.BOMB_MODE) || (typeof globalThis !== "undefined" ? globalThis.BOMB_MODE : null);
var BOMB_CONFIG = (typeof window !== "undefined" && window.BOMB_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.BOMB_CONFIG : null);
var ModeBomb = (typeof window !== "undefined" && window.ModeBomb) || (typeof globalThis !== "undefined" ? globalThis.ModeBomb : null);

var initCrownMode = (typeof window !== "undefined" && window.initCrownMode) || (typeof globalThis !== "undefined" ? globalThis.initCrownMode : null);
var updateCrownMode = (typeof window !== "undefined" && window.updateCrownMode) || (typeof globalThis !== "undefined" ? globalThis.updateCrownMode : null);
var checkCrownTag = (typeof window !== "undefined" && window.checkCrownTag) || (typeof globalThis !== "undefined" ? globalThis.checkCrownTag : null);
var drawCrownUI = (typeof window !== "undefined" && window.drawCrownUI) || (typeof globalThis !== "undefined" ? globalThis.drawCrownUI : null);
var drawCrownPlayer = (typeof window !== "undefined" && window.drawCrownPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawCrownPlayer : null);
var crownBotThink = (typeof window !== "undefined" && window.crownBotThink) || (typeof globalThis !== "undefined" ? globalThis.crownBotThink : null);
var getCrownPlayerSpeed = (typeof window !== "undefined" && window.getCrownPlayerSpeed) || (typeof globalThis !== "undefined" ? globalThis.getCrownPlayerSpeed : null);
var drawCrownEntity = (typeof window !== "undefined" && window.drawCrownEntity) || (typeof globalThis !== "undefined" ? globalThis.drawCrownEntity : null);
var drawCrownWorldFX = (typeof window !== "undefined" && window.drawCrownWorldFX) || (typeof globalThis !== "undefined" ? globalThis.drawCrownWorldFX : null);
var spawnCrownShockwave = (typeof window !== "undefined" && window.spawnCrownShockwave) || (typeof globalThis !== "undefined" ? globalThis.spawnCrownShockwave : null);
var CROWN_CONFIG = (typeof window !== "undefined" && window.CROWN_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.CROWN_CONFIG : null);
var crownState = (typeof window !== "undefined" && window.crownState) || (typeof globalThis !== "undefined" ? globalThis.crownState : null);
var CrownMode = (typeof window !== "undefined" && window.CrownMode) || (typeof globalThis !== "undefined" ? globalThis.CrownMode : null);

var initCtfMode = (typeof window !== "undefined" && window.initCtfMode) || (typeof globalThis !== "undefined" ? globalThis.initCtfMode : null);
var updateCtf = (typeof window !== "undefined" && window.updateCtf) || (typeof globalThis !== "undefined" ? globalThis.updateCtf : null);
var checkCtfTag = (typeof window !== "undefined" && window.checkCtfTag) || (typeof globalThis !== "undefined" ? globalThis.checkCtfTag : null);
var drawCtfUI = (typeof window !== "undefined" && window.drawCtfUI) || (typeof globalThis !== "undefined" ? globalThis.drawCtfUI : null);
var drawCtfPlayer = (typeof window !== "undefined" && window.drawCtfPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawCtfPlayer : null);
var drawCtfEntities = (typeof window !== "undefined" && window.drawCtfEntities) || (typeof globalThis !== "undefined" ? globalThis.drawCtfEntities : null);
var drawCtfWorldFX = (typeof window !== "undefined" && window.drawCtfWorldFX) || (typeof globalThis !== "undefined" ? globalThis.drawCtfWorldFX : null);
var ctfBotThink = (typeof window !== "undefined" && window.ctfBotThink) || (typeof globalThis !== "undefined" ? globalThis.ctfBotThink : null);
var triggerCtfWin = (typeof window !== "undefined" && window.triggerCtfWin) || (typeof globalThis !== "undefined" ? globalThis.triggerCtfWin : null);
var ctfState = (typeof window !== "undefined" && window.ctfState) || (typeof globalThis !== "undefined" ? globalThis.ctfState : null);
var CTF_CONFIG = (typeof window !== "undefined" && window.CTF_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.CTF_CONFIG : null);
var CtfMode = (typeof window !== "undefined" && window.CtfMode) || (typeof globalThis !== "undefined" ? globalThis.CtfMode : null);
```
- **ReplacementContent**:
```javascript
/* Dynamic mode hook resolver avoiding stale null references */
function getModeHook(name) {
  if (typeof window !== "undefined" && window[name] !== undefined) return window[name];
  if (typeof globalThis !== "undefined" && globalThis[name] !== undefined) return globalThis[name];
  return null;
}

/* Export live mode references to top-level lexical scope */
var initInfectionMode = getModeHook('initInfectionMode');
var updateInfection = getModeHook('updateInfection');
var checkInfectionTag = getModeHook('checkInfectionTag');
var drawInfectionUI = getModeHook('drawInfectionUI');
var drawInfectionPlayer = getModeHook('drawInfectionPlayer');
var infectionBotThink = getModeHook('infectionBotThink');
var getInfectionPlayerSpeed = getModeHook('getInfectionPlayerSpeed');
var getInfectionHoldLift = getModeHook('getInfectionHoldLift');
var drawInfectionShockwaves = getModeHook('drawInfectionShockwaves');
var drawInfectionSlime = getModeHook('drawInfectionSlime');
var triggerRepulsorPulse = getModeHook('triggerRepulsorPulse');
var infectionState = getModeHook('infectionState');
var INFECTION_CONFIG = getModeHook('INFECTION_CONFIG');
var InfectionMode = getModeHook('InfectionMode');

var initBombMode = getModeHook('initBombMode');
var updateBombMode = getModeHook('updateBombMode');
var checkBombTag = getModeHook('checkBombTag');
var drawBombUI = getModeHook('drawBombUI');
var drawBombPlayer = getModeHook('drawBombPlayer');
var bombBotThink = getModeHook('bombBotThink');
var BOMB_MODE = getModeHook('BOMB_MODE');
var BOMB_CONFIG = getModeHook('BOMB_CONFIG');
var ModeBomb = getModeHook('ModeBomb');

var initCrownMode = getModeHook('initCrownMode');
var updateCrownMode = getModeHook('updateCrownMode');
var checkCrownTag = getModeHook('checkCrownTag');
var drawCrownUI = getModeHook('drawCrownUI');
var drawCrownPlayer = getModeHook('drawCrownPlayer');
var crownBotThink = getModeHook('crownBotThink');
var getCrownPlayerSpeed = getCrownPlayerSpeed;
var drawCrownEntity = getModeHook('drawCrownEntity');
var drawCrownWorldFX = getModeHook('drawCrownWorldFX');
var spawnCrownShockwave = getModeHook('spawnCrownShockwave');
var CROWN_CONFIG = getModeHook('CROWN_CONFIG');
var crownState = getModeHook('crownState');
var CrownMode = getModeHook('CrownMode');

var initCtfMode = getModeHook('initCtfMode');
var updateCtf = getModeHook('updateCtf');
var checkCtfTag = getModeHook('checkCtfTag');
var drawCtfUI = getModeHook('drawCtfUI');
var drawCtfPlayer = getModeHook('drawCtfPlayer');
var drawCtfEntities = getModeHook('drawCtfEntities');
var drawCtfWorldFX = getModeHook('drawCtfWorldFX');
var ctfBotThink = getModeHook('ctfBotThink');
var triggerCtfWin = getModeHook('triggerCtfWin');
var ctfState = getModeHook('ctfState');
var CTF_CONFIG = getModeHook('CTF_CONFIG');
var CtfMode = getModeHook('CtfMode');

function refreshModeBindings() {
  initInfectionMode = getModeHook('initInfectionMode') || initInfectionMode;
  updateInfection = getModeHook('updateInfection') || updateInfection;
  checkInfectionTag = getModeHook('checkInfectionTag') || checkInfectionTag;
  drawInfectionUI = getModeHook('drawInfectionUI') || drawInfectionUI;
  drawInfectionPlayer = getModeHook('drawInfectionPlayer') || drawInfectionPlayer;
  infectionBotThink = getModeHook('infectionBotThink') || infectionBotThink;
  getInfectionPlayerSpeed = getModeHook('getInfectionPlayerSpeed') || getInfectionPlayerSpeed;
  getInfectionHoldLift = getModeHook('getInfectionHoldLift') || getInfectionHoldLift;
  drawInfectionShockwaves = getModeHook('drawInfectionShockwaves') || drawInfectionShockwaves;
  drawInfectionSlime = getModeHook('drawInfectionSlime') || drawInfectionSlime;
  triggerRepulsorPulse = getModeHook('triggerRepulsorPulse') || triggerRepulsorPulse;
  infectionState = getModeHook('infectionState') || infectionState;
  INFECTION_CONFIG = getModeHook('INFECTION_CONFIG') || INFECTION_CONFIG;
  InfectionMode = getModeHook('InfectionMode') || InfectionMode;

  initBombMode = getModeHook('initBombMode') || initBombMode;
  updateBombMode = getModeHook('updateBombMode') || updateBombMode;
  checkBombTag = getModeHook('checkBombTag') || checkBombTag;
  drawBombUI = getModeHook('drawBombUI') || drawBombUI;
  drawBombPlayer = getModeHook('drawBombPlayer') || drawBombPlayer;
  bombBotThink = getModeHook('bombBotThink') || bombBotThink;
  BOMB_MODE = getModeHook('BOMB_MODE') || BOMB_MODE;
  BOMB_CONFIG = getModeHook('BOMB_CONFIG') || BOMB_CONFIG;
  ModeBomb = getModeHook('ModeBomb') || ModeBomb;

  initCrownMode = getModeHook('initCrownMode') || initCrownMode;
  updateCrownMode = getModeHook('updateCrownMode') || updateCrownMode;
  checkCrownTag = getModeHook('checkCrownTag') || checkCrownTag;
  drawCrownUI = getModeHook('drawCrownUI') || drawCrownUI;
  drawCrownPlayer = getModeHook('drawCrownPlayer') || drawCrownPlayer;
  crownBotThink = getModeHook('crownBotThink') || crownBotThink;
  getCrownPlayerSpeed = getModeHook('getCrownPlayerSpeed') || getCrownPlayerSpeed;
  drawCrownEntity = getModeHook('drawCrownEntity') || drawCrownEntity;
  drawCrownWorldFX = getModeHook('drawCrownWorldFX') || drawCrownWorldFX;
  spawnCrownShockwave = getModeHook('spawnCrownShockwave') || spawnCrownShockwave;
  CROWN_CONFIG = getModeHook('CROWN_CONFIG') || CROWN_CONFIG;
  crownState = getModeHook('crownState') || crownState;
  CrownMode = getModeHook('CrownMode') || CrownMode;

  initCtfMode = getModeHook('initCtfMode') || initCtfMode;
  updateCtf = getModeHook('updateCtf') || updateCtf;
  checkCtfTag = getModeHook('checkCtfTag') || checkCtfTag;
  drawCtfUI = getModeHook('drawCtfUI') || drawCtfUI;
  drawCtfPlayer = getModeHook('drawCtfPlayer') || drawCtfPlayer;
  drawCtfEntities = getModeHook('drawCtfEntities') || drawCtfEntities;
  drawCtfWorldFX = getModeHook('drawCtfWorldFX') || drawCtfWorldFX;
  ctfBotThink = getModeHook('ctfBotThink') || ctfBotThink;
  triggerCtfWin = getModeHook('triggerCtfWin') || triggerCtfWin;
  ctfState = getModeHook('ctfState') || ctfState;
  CTF_CONFIG = getModeHook('CTF_CONFIG') || CTF_CONFIG;
  CtfMode = getModeHook('CtfMode') || CtfMode;
}
```
- **Description**: Introduces `getModeHook()` and `refreshModeBindings()` to dynamically read mode symbols from `window` and `globalThis`.

#### Change W2: Fallback Prevention in `wiring.js:startMatch()` Tab Filtering
- **Target File**: `tag/js/modes/wiring.js` (and mirrors)
- **StartLine**: 67
- **EndLine**: 81
- **TargetContent**:
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
  } else if(menu.tab === 'teams') settings.teams = true;
```
- **ReplacementContent**:
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
  } else if(menu.tab === 'teams') settings.teams = true;
```
- **Description**: Adds `'infection'` to `soloModes` and `botModes` in `startMatch()`, preventing Infection matches from reverting to Party.

#### Change W3: Match Startup Clean Registration & Stale State Cleanup
- **Target File**: `tag/js/modes/wiring.js` (and mirrors)
- **StartLine**: 200
- **EndLine**: 218
- **TargetContent**:
```javascript
  menu.mapVote = null;
  menu.modePopup = false;
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
  // Clear stale mode flags when leaving bomb/crown/ctf (init only sets active=true).
  try{
    if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE && settings.gameMode !== 'bomb') BOMB_MODE.active = false;
    if(typeof crownState !== 'undefined' && crownState && settings.gameMode !== 'crown') crownState.active = false;
    if(typeof ctfState !== 'undefined' && ctfState && settings.gameMode !== 'ctf') ctfState.active = false;
  }catch(e){}
```
- **ReplacementContent**:
```javascript
  refreshModeBindings();
  menu.mapVote = null;
  menu.modePopup = false;
  if(settings.gameMode === 'infection'){
    const fn = (typeof initInfectionMode === 'function') ? initInfectionMode : getModeHook('initInfectionMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initInfectionMode not found');
  } else if(settings.gameMode === 'bomb'){
    const fn = (typeof initBombMode === 'function') ? initBombMode : getModeHook('initBombMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initBombMode not found');
  } else if(settings.gameMode === 'crown'){
    match.it = -1;
    const fn = (typeof initCrownMode === 'function') ? initCrownMode : getModeHook('initCrownMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initCrownMode not found');
  } else if(settings.gameMode === 'ctf'){
    match.it = -1;
    const fn = (typeof initCtfMode === 'function') ? initCtfMode : getModeHook('initCtfMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initCtfMode not found');
  }
  // Clear stale mode flags when leaving bomb/crown/ctf/infection (init only sets active=true).
  try{
    const bState = (typeof BOMB_MODE !== 'undefined' && BOMB_MODE) || getModeHook('BOMB_MODE');
    if(bState && settings.gameMode !== 'bomb') bState.active = false;
    const crState = (typeof crownState !== 'undefined' && crownState) || getModeHook('crownState');
    if(crState && settings.gameMode !== 'crown') crState.active = false;
    const ctState = (typeof ctfState !== 'undefined' && ctfState) || getModeHook('ctfState');
    if(ctState && settings.gameMode !== 'ctf') ctState.active = false;
    const infState = (typeof infectionState !== 'undefined' && infectionState) || getModeHook('infectionState');
    if(infState && settings.gameMode !== 'infection') infState.active = false;
  }catch(e){}
```
- **Description**: Automatically refreshes mode bindings right before match initialization, resolves function hooks dynamically, prevents soft-locks from null references, and cleans up stale `infectionState.active` flags when leaving Infection mode.

#### Change W4: Export Functions on `wiring.js`
- **Target File**: `tag/js/modes/wiring.js` (and mirrors)
- **StartLine**: 260
- **EndLine**: 262
- **TargetContent**:
```javascript
  } else {
    quitToMenu();
  }
}
```
- **ReplacementContent**:
```javascript
  } else {
    quitToMenu();
  }
}

// Attach wiring functions globally and export for test harnesses
const wTargets = [];
if (typeof window !== 'undefined' && wTargets.indexOf(window) < 0) wTargets.push(window);
if (typeof globalThis !== 'undefined' && wTargets.indexOf(globalThis) < 0) wTargets.push(globalThis);
for (let i = 0; i < wTargets.length; i++) {
  const wt = wTargets[i];
  wt.startMatch = startMatch;
  wt.quitToMenu = quitToMenu;
  wt.returnToLobby = returnToLobby;
  wt.refreshModeBindings = refreshModeBindings;
  wt.getModeHook = getModeHook;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startMatch,
    quitToMenu,
    returnToLobby,
    refreshModeBindings,
    getModeHook
  };
}
```
- **Description**: Exposes `startMatch`, `quitToMenu`, `returnToLobby`, `refreshModeBindings`, and `getModeHook` on `window`, `globalThis`, and CommonJS `module.exports`.

---

### 4.6 Specification: `tag/js/bot_ai.js` (and mirror files `tag-server/js/bot_ai.js`, `PokiGames/js/bot_ai.js`)

#### Change A1: Prevent Tab Clicks from Overwriting Mode in `setMenuTab`
- **Target File**: `tag/js/bot_ai.js` (and mirrors)
- **StartLine**: 662
- **EndLine**: 678
- **TargetContent**:
```javascript
function setMenuTab(tab){
  if(tab !== 'solo' && tab !== '2p' && tab !== 'online' && tab !== 'bots') tab = '2p';
  menu.tab = tab;
  if(tab === 'solo'){
    menu.botOn = true;
    settings.teams = false;
    settings.gameMode = 'party';
    menu.gameMode = 'party';
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  } else if(tab === 'bots'){
    menu.botOn = true;
    settings.teams = false;
    settings.gameMode = 'party';
    menu.gameMode = 'party';
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  } else if(tab === '2p'){
```
- **ReplacementContent**:
```javascript
function setMenuTab(tab){
  if(tab !== 'solo' && tab !== '2p' && tab !== 'online' && tab !== 'bots') tab = '2p';
  menu.tab = tab;
  const validModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
  const curMode = (settings.gameMode && validModes.indexOf(settings.gameMode) >= 0) ? settings.gameMode : 'party';
  if(tab === 'solo'){
    menu.botOn = true;
    settings.gameMode = curMode;
    menu.gameMode = curMode;
    settings.teams = (curMode === 'ctf');
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  } else if(tab === 'bots'){
    menu.botOn = true;
    settings.gameMode = curMode;
    menu.gameMode = curMode;
    settings.teams = (curMode === 'ctf');
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  } else if(tab === '2p'){
```
- **Description**: Preserves currently selected mode when switching between Solo, Bots, and 2P lobby tabs. Properly maintains `settings.teams = true` when the preserved mode is `'ctf'`.

#### Change A2: Include Infection in `bot_ai.js:setGameMode` Filter
- **Target File**: `tag/js/bot_ai.js` (and mirrors)
- **StartLine**: 1211
- **EndLine**: 1227
- **TargetContent**:
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
- **ReplacementContent**:
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
- **Description**: Enables players to select Infection mode in Solo and Watch/Bots tabs without rejection.

---

## 5. Verification Method

To independently verify the implementation:

### 5.1 Automated Script: Mode Global Availability Test
Run the following node script to verify all functions and state variables exist on both `window` and `globalThis`:
```powershell
node -e '
const vm = require("vm");
const fs = require("fs");

const ctx = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Date: Date,
  match: null,
  menu: { tab: "2p", slotColor: [0, 1, -1, -1], slotTeam: [0, 1, 0, 1], botOn: false },
  settings: { gameMode: "party", teams: false, time: 60, map: 0 },
  MAPS: [{ name: "Test" }],
  SLOTS: [{ k: "a" }, { k: "b" }],
  PALETTE: ["#fff", "#000"],
  THEMES: [{}],
  CG: { gameplayStart: () => {}, gameplayStop: () => {} },
  toast: () => {},
  sfx: () => {},
  buildLevel: () => {},
  makePlayer: (i, slot, col) => ({ slot, col, x: 100, y: 100, w: 46, h: 46 }),
  activeSlots: () => [0, 1]
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

// Run modes in order
["infection.js", "bomb.js", "crown.js", "ctf.js", "wiring.js"].forEach(file => {
  const code = fs.readFileSync("tag/js/modes/" + file, "utf8");
  vm.runInContext(code, ctx);
});

// Assert presence on window and globalThis
const expected = [
  "initBombMode", "updateBombMode", "checkBombTag", "drawBombUI", "drawBombPlayer", "bombBotThink", "BOMB_MODE", "BOMB_CONFIG", "ModeBomb",
  "initCrownMode", "updateCrownMode", "checkCrownTag", "drawCrownUI", "drawCrownPlayer", "crownBotThink", "CROWN_CONFIG", "crownState", "CrownMode",
  "initCtfMode", "updateCtf", "checkCtfTag", "drawCtfUI", "drawCtfPlayer", "ctfBotThink", "triggerCtfWin", "ctfState", "CTF_CONFIG", "CtfMode",
  "initInfectionMode", "updateInfection", "checkInfectionTag", "drawInfectionUI", "drawInfectionPlayer", "infectionBotThink", "infectionState", "INFECTION_CONFIG", "InfectionMode",
  "startMatch", "refreshModeBindings", "getModeHook"
];

let failed = 0;
expected.forEach(sym => {
  if (!ctx.window[sym] || !ctx.globalThis[sym]) {
    console.error("FAIL: missing symbol", sym);
    failed++;
  }
});

if (failed === 0) console.log("PASS: All mode exports available on window and globalThis!");
else process.exit(1);
'
```

### 5.2 Automated Script: Tab Switching Fallback Prevention Test
Run the following test to verify tab clicks in `bot_ai.js` preserve mode:
```powershell
node -e '
const vm = require("vm");
const fs = require("fs");

const ctx = {
  menu: { tab: "2p", slotColor: [0, 1, -1, -1], slotIsBot: [], botOn: false },
  settings: { gameMode: "bomb", teams: false },
  toast: () => {},
  sfx: () => {},
  PALETTE: ["#fff", "#000", "#111", "#222"],
  MAXP: 4,
  ensureUniqueLocalColors: () => {}
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

// Load bot_ai.js
const code = fs.readFileSync("tag/js/bot_ai.js", "utf8");
vm.runInContext(code, ctx);

// Test 1: Set mode to bomb, switch to solo
ctx.settings.gameMode = "bomb";
ctx.setMenuTab("solo");
if (ctx.settings.gameMode !== "bomb" || ctx.menu.gameMode !== "bomb") {
  console.error("FAIL: Solo tab wiped bomb mode to", ctx.settings.gameMode);
  process.exit(1);
}

// Test 2: Set mode to ctf, switch to bots
ctx.settings.gameMode = "ctf";
ctx.setMenuTab("bots");
if (ctx.settings.gameMode !== "ctf" || ctx.menu.gameMode !== "ctf" || !ctx.settings.teams) {
  console.error("FAIL: Bots tab failed to preserve ctf mode or teams flag");
  process.exit(1);
}

// Test 3: Set mode to infection, switch to solo
ctx.settings.gameMode = "infection";
ctx.setMenuTab("solo");
if (ctx.settings.gameMode !== "infection" || ctx.menu.gameMode !== "infection") {
  console.error("FAIL: Solo tab failed to preserve infection mode");
  process.exit(1);
}

console.log("PASS: All tab switching mode preservation tests passed!");
'
```

### 5.3 Invalidation Conditions
The conclusion is invalidated if:
1. `ctx.window[sym]` or `ctx.globalThis[sym]` is undefined for any of the 4 modes.
2. Clicking `'solo'` or `'bots'` tab alters `settings.gameMode` away from a valid chosen mode (`'bomb'`, `'crown'`, `'ctf'`, `'infection'`).
3. Calling `startMatch()` with `settings.gameMode = 'bomb'` leaves `BOMB_MODE.active === false`.
