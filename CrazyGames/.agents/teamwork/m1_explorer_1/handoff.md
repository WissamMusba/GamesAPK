# Handoff Report: Implementation Plan for Feature 1 (Syntax Parsing Fixes)

**Agent**: `m1_explorer_1`  
**Mission**: Formulate the exact implementation plan for Feature 1 (Syntax Parsing Fixes) across `tag/`, `tag-server/`, and `PokiGames/`.  
**Date**: 2026-10-11  

---

## 1. Observation

### 1.1 Baseline Syntax Parsing Scan (`node --check`)
Executing `node --check` across all 66 JavaScript files in the workspace (`tag/js/`, `tag-server/js/`, and `PokiGames/js/`) identified exactly **16 files failing syntax validation**:

```powershell
Get-ChildItem -Path "tag/js", "tag-server/js", "PokiGames/js" -Filter "*.js" -Recurse | ForEach-Object {
    $res = node --check $_.FullName 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Output "FAIL: $($_.FullName)"; Write-Output $res }
}
```

The 16 failing files fall into 6 target categories:

#### Group 1: `match.js:144` (3 files)
- `tag/js/match.js:144`
- `tag-server/js/match.js:144`
- `PokiGames/js/match.js:144`
- **Verbatim Error**:
  ```
  match.js:144
  /* ==========================================================================
  SyntaxError: Invalid or unexpected token
  ```
- **Context (Lines 142–145)**:
  ```javascript
  142:     slot:slot,colIdx:colIdx,team:team,trail:[],cosmeticTrail:[],isHunter:roleHunter,isEliminated:false,survivalT:0,isFrozen:false};
  143: }
  144: /* ==========================================================================
  145: 
  ```
- **Finding**: Multi-line comment `/*` is opened on line 144 but never closed before end-of-file.

#### Group 2: `modes/bomb.js:1,1185` (3 files)
- `tag/js/modes/bomb.js`
- `tag-server/js/modes/bomb.js`
- `PokiGames/js/modes/bomb.js`
- **Verbatim Error**:
  ```
  modes/bomb.js:1
     BUNDLED MODE: BOMB TAG / HOT POTATO
             ^^^^
  SyntaxError: Unexpected identifier 'MODE'
  ```
- **Context Header (Lines 1–3)**:
  ```javascript
  1:    BUNDLED MODE: BOMB TAG / HOT POTATO
  2:    ========================================================================== */
  3: /**
  ```
- **Context EOF (Lines 1184–1186)**:
  ```javascript
  1184: 
  1185: /* ==========================================================================
  1186: 
  ```
- **Finding**: Line 1 is missing the opening `/* ==========================================================================`. Line 1185 at end-of-file has an unclosed `/*`.

#### Group 3: `modes/crown.js:1,1428` (3 files)
- `tag/js/modes/crown.js`
- `tag-server/js/modes/crown.js`
- `PokiGames/js/modes/crown.js`
- **Verbatim Error**:
  ```
  modes/crown.js:1
     BUNDLED MODE: CROWN KING / KING OF THE HILL
             ^^^^
  SyntaxError: Unexpected identifier 'MODE'
  ```
- **Context Header (Lines 1–3)**:
  ```javascript
  1:    BUNDLED MODE: CROWN KING / KING OF THE HILL
  2:    ========================================================================== */
  3: /**
  ```
- **Context EOF (Lines 1427–1429)**:
  ```javascript
  1427: 
  1428: /* ==========================================================================
  1429: 
  ```
- **Finding**: Line 1 is missing the opening `/* ==========================================================================`. Line 1428 at end-of-file has an unclosed `/*`.

#### Group 4: `modes/ctf.js:1` (3 files)
- `tag/js/modes/ctf.js`
- `tag-server/js/modes/ctf.js`
- `PokiGames/js/modes/ctf.js`
- **Verbatim Error**:
  ```
  modes/ctf.js:1
     BUNDLED MODE: CAPTURE THE FLAG (CTF)
             ^^^^
  SyntaxError: Unexpected identifier 'MODE'
  ```
- **Context Header (Lines 1–3)**:
  ```javascript
  1:    BUNDLED MODE: CAPTURE THE FLAG (CTF)
  2:    ========================================================================== */
  3: /**
  ```
- **Context EOF (Lines 1434–1437)**:
  ```javascript
  1434:   return ctfModuleExports;
  1435: })(typeof globalThis !== 'undefined' ? globalThis : this);
  1436: 
  1437: 
  ```
- **Finding**: Line 1 is missing the opening `/* ==========================================================================`. No unclosed trailing comment at EOF.

#### Group 5: `modes/infection.js:1,1123` (3 files)
- `tag/js/modes/infection.js`
- `tag-server/js/modes/infection.js`
- `PokiGames/js/modes/infection.js`
- **Verbatim Error**:
  ```
  modes/infection.js:1
     BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
             ^^^^^
  SyntaxError: Unexpected identifier 'MODES'
  ```
- **Context Header (Lines 1–3)**:
  ```javascript
  1:    BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
  2:    ========================================================================== */
  3: var initInfectionMode, updateInfection, checkInfectionTag, drawInfectionUI...
  ```
- **Context EOF (Lines 1122–1124)**:
  ```javascript
  1122: 
  1123: /* ==========================================================================
  1124: 
  ```
- **Finding**: Line 1 is missing the opening `/* ==========================================================================`. Line 1123 at end-of-file has an unclosed `/*`.

#### Group 6: `PokiGames/js/audio.js:54-255` (1 file)
- **Initial Verbatim Error**:
  ```
  PokiGames/js/audio.js:54
  let _cgBoot = null;
      ^
  SyntaxError: Identifier '_cgBoot' has already been declared
  ```
- **Secondary Error Discovery (Deep Static Analysis)**:
  When line 54 is isolated/removed, Node throws:
  ```
  PokiGames/js/audio.js:58
        if(!sdk||!sdk.init){finish();return;}
                                     ^^^^^^
  SyntaxError: Illegal return statement
  ```
  followed by `SyntaxError: Unexpected token '}'` at line 255.
- **Context Inspection (Lines 50–60 & 250–258)**:
  ```javascript
  51:   }
  52: };
  53: const CG = POKI;
  54: let _cgBoot = null;
  55: let _pokiBoot = null;
  56:       try{setTimeout(finish,5000);}catch(e){}
  57:       const sdk=window.CrazyGames&&window.CrazyGames.SDK;
  58:       if(!sdk||!sdk.init){finish();return;}
  ...
  255: };
  256: function applySdkMute(m){sdkMuted=!!m;applyEffectiveMute();}
  ```
- **Root Cause Analysis**:
  In `sync-platforms.js:100-103`:
  ```javascript
  const pokiBlock = `/* ================= POKI SDK v2 INTEGRATION ================= */
  const POKI = { ... };
  const CG = POKI;
  let _cgBoot = null;
  let _pokiBoot = null;\n`;
  audioContent = audioContent.replace(/const CG\s*=\s*\{[\s\S]*?\};\n/, pokiBlock);
  ```
  Inside `tag/js/audio.js:15`, the method `boot()` contains `finish=()=>{try{if(!_done){_done=true;res();}}catch(e){}};`.
  Because the regular expression `/const CG\s*=\s*\{[\s\S]*?\};\n/` used a non-greedy match `*?`, it matched only up to line 15's `catch(e){}};` and stopped! It replaced lines 6–15 with `pokiBlock`, leaving the remaining lines 16–255 of the CrazyGames `CG` object literal orphaned in top-level file scope.
  Line 5 already defines `let _cgBoot=null;`, so line 54 was a duplicate, and lines 56–255 are illegal top-level statements.

---

## 2. Logic Chain

1. **Syntax Errors Abort Script Evaluation**:
   `tag/index.html` loads scripts sequentially via standard `<script>` tags:
   `match.js` -> `infection.js` -> `bomb.js` -> `crown.js` -> `ctf.js` -> `wiring.js`.
   When the browser encounters a syntax error on line 1 or line 144 of these files, script evaluation terminates immediately. None of the top-level functions (`initBombMode`, `initCrownMode`, `initCtfMode`, `initInfectionMode`, etc.) are defined on `window` or `globalThis`.
2. **Wiring Symbol Fallbacks Default to Null**:
   `wiring.js` defines fallback bindings:
   ```javascript
   var initBombMode = (typeof window !== "undefined" && window.initBombMode) || (typeof globalThis !== "undefined" ? globalThis.initBombMode : null);
   ```
   Because `bomb.js` threw during parsing, `initBombMode` evaluates to `null`.
3. **Execution Drops into Default Party Tag**:
   During `startMatch()`, checks like `if(typeof initBombMode === 'function')` fail. During gameplay, `hunter.js:checkTag()` checks `if(typeof checkBombTag === 'function')` and falls through into default FFA Party Tag logic.
4. **Fixing Group 1–5 Restores Core Game Modes**:
   Adding `/* ==========================================================================` on line 1 and removing trailing `/*` at EOF on `match.js`, `bomb.js`, `crown.js`, `ctf.js`, and `infection.js` restores 100% clean parsing and allows all exported functions to attach to the global scope.
5. **Fixing Group 6 Restores Poki Build Integrity**:
   Removing lines 54–255 in `PokiGames/js/audio.js` eliminates the duplicate `_cgBoot` declaration and strips the orphaned CrazyGames SDK fragment. `POKI` remains mapped to `CG`, `applySdkMute` connects cleanly, and `node --check PokiGames/js/audio.js` passes with exit code 0.
6. **Updating `sync-platforms.js` Prevents Regression**:
   Fixing the substitution regex in `sync-platforms.js` guarantees that future platform sync runs will cleanly replace the full `const CG = { ... };` object without reintroducing corrupted fragments or duplicate variable declarations.

---

## 3. Caveats

1. **Scope Boundary**: This specification addresses Feature 1 (Syntax Parsing Fixes across the 16 files, plus `sync-platforms.js`). Subsequent Milestone 1 features (Feature 2: Runtime wiring exports, Feature 3: Mode selection fallback prevention in menus, and Feature 4: Infection mode UI/menu unblocking) build directly upon these syntax fixes.
2. **No Source Code Commits by Explorer**: Per the read-only exploration protocol, no edits have been applied to `tag/`, `tag-server/`, or `PokiGames/` by `m1_explorer_1`. All specifications below have been verified via in-memory execution and AST compilation (`vm.Script`).

---

## 4. Conclusion & Exact Implementation Specifications

### 4.1 Specification 1: `match.js` (3 files)
- **Target Files**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag\js\match.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag-server\js\match.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PokiGames\js\match.js`
- **Lines**: 143–145
- **Before**:
  ```javascript
  }
  /* ==========================================================================

  ```
- **After**:
  ```javascript
  }

  ```
- **Instruction**: Delete lines 144–145 (the unclosed `/* ==========================================================================` comment).

---

### 4.2 Specification 2: `modes/bomb.js` (3 files)
- **Target Files**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag\js\modes\bomb.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag-server\js\modes\bomb.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PokiGames\js\modes\bomb.js`
- **Chunk 1 (Lines 1–2)**:
  - **Before**:
    ```javascript
       BUNDLED MODE: BOMB TAG / HOT POTATO
       ========================================================================== */
    ```
  - **After**:
    ```javascript
    /* ==========================================================================
       BUNDLED MODE: BOMB TAG / HOT POTATO
       ========================================================================== */
    ```
- **Chunk 2 (Lines 1184–1186)**:
  - **Before**:
    ```javascript


    /* ==========================================================================

    ```
  - **After**:
    ```javascript


    ```
  - **Instruction**: Remove trailing `/* ==========================================================================` on line 1185.

---

### 4.3 Specification 3: `modes/crown.js` (3 files)
- **Target Files**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag\js\modes\crown.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag-server\js\modes\crown.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PokiGames\js\modes\crown.js`
- **Chunk 1 (Lines 1–2)**:
  - **Before**:
    ```javascript
       BUNDLED MODE: CROWN KING / KING OF THE HILL
       ========================================================================== */
    ```
  - **After**:
    ```javascript
    /* ==========================================================================
       BUNDLED MODE: CROWN KING / KING OF THE HILL
       ========================================================================== */
    ```
- **Chunk 2 (Lines 1427–1429)**:
  - **Before**:
    ```javascript


    /* ==========================================================================

    ```
  - **After**:
    ```javascript


    ```
  - **Instruction**: Remove trailing `/* ==========================================================================` on line 1428.

---

### 4.4 Specification 4: `modes/ctf.js` (3 files)
- **Target Files**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag\js\modes\ctf.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag-server\js\modes\ctf.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PokiGames\js\modes\ctf.js`
- **Chunk 1 (Lines 1–2)**:
  - **Before**:
    ```javascript
       BUNDLED MODE: CAPTURE THE FLAG (CTF)
       ========================================================================== */
    ```
  - **After**:
    ```javascript
    /* ==========================================================================
       BUNDLED MODE: CAPTURE THE FLAG (CTF)
       ========================================================================== */
    ```

---

### 4.5 Specification 5: `modes/infection.js` (3 files)
- **Target Files**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag\js\modes\infection.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\tag-server\js\modes\infection.js`
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PokiGames\js\modes\infection.js`
- **Chunk 1 (Lines 1–2)**:
  - **Before**:
    ```javascript
       BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
       ========================================================================== */
    ```
  - **After**:
    ```javascript
    /* ==========================================================================
       BUNDLED MODES: INFECTION, BOMB TAG, CROWN KING (GLOBAL WIRING)
       ========================================================================== */
    ```
- **Chunk 2 (Lines 1122–1124)**:
  - **Before**:
    ```javascript


    /* ==========================================================================

    ```
  - **After**:
    ```javascript


    ```
  - **Instruction**: Remove trailing `/* ==========================================================================` on line 1123.

---

### 4.6 Specification 6: `PokiGames/js/audio.js` (1 file)
- **Target File**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\PokiGames\js\audio.js`
- **Lines**: 53–256
- **Before**:
  ```javascript
  const CG = POKI;
  let _cgBoot = null;
  let _pokiBoot = null;
        try{setTimeout(finish,5000);}catch(e){}
        const sdk=window.CrazyGames&&window.CrazyGames.SDK;
  ... (lines 56–254 of orphaned CrazyGames SDK methods) ...
    /* (banner API removed — see note above) */
  };
  function applySdkMute(m){sdkMuted=!!m;applyEffectiveMute();}
  ```
- **After**:
  ```javascript
  const CG = POKI;

  function applySdkMute(m){sdkMuted=!!m;applyEffectiveMute();}
  ```
- **Instruction**: Delete lines 54 to 255 inclusive. Retain `const CG = POKI;` on line 53, followed immediately by `function applySdkMute(m){...}`.

---

### 4.7 Specification 7: Preventative Fix for `sync-platforms.js` (1 file)
- **Target File**:
  - `c:\Users\wissa\Downloads\MainGames\GamesAPK_tmp\CrazyGames\sync-platforms.js`
- **Lines**: 99–103
- **Before**:
  ```javascript
  const CG = POKI;
  let _cgBoot = null;
  let _pokiBoot = null;\n`;
          audioContent = audioContent.replace(/const CG\s*=\s*\{[\s\S]*?\};\n/, pokiBlock);
  ```
- **After**:
  ```javascript
  const CG = POKI;\n`;
          audioContent = audioContent.replace(/const CG\s*=\s*\{[\s\S]*?\n\};\r?\n/, pokiBlock);
  ```
- **Instruction**: Remove `let _cgBoot = null;` and `let _pokiBoot = null;` from `pokiBlock`. Update regex to match until the newline closing `\n};\n`.

---

## 5. Verification Method

### 5.1 Verification Commands

Run the following command in PowerShell from the project root:

```powershell
Get-ChildItem -Path "tag/js", "tag-server/js", "PokiGames/js" -Filter "*.js" -Recurse | ForEach-Object {
    $res = node --check $_.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Output "FAIL: $($_.FullName)"
        Write-Output $res
    }
}
```

### 5.2 Expected Output
- **Pass Condition**: Zero lines of output; exit code `0`.
- All 66 JavaScript files pass syntax parsing without any `SyntaxError`.

### 5.3 Automated Invalidation Check
If any file fails, the output will display `FAIL: <path>` along with the specific line number and SyntaxError. An exit code other than 0 indicates invalidation.
