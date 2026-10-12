# Handoff Report: Survey and Investigation of R4 (Netplay Authority) & R5 (Bot AI & Career Idempotency)

## 1. Observation

### 1.1 Bomb Tag Netplay Authority (`tag/js/modes/bomb.js` & `tag/js/netplay.js`)
- **Direct Code Inspection: `tag/js/modes/bomb.js:611-660` (`checkBombTag`)**:
  ```javascript
  function checkBombTag() {
    if (!BOMB_MODE.active || BOMB_MODE.state !== 'playing') return;
    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    if (BOMB_MODE.carrierIdx < 0 || BOMB_MODE.carrierIdx >= P.length) return;

    const carrier = P[BOMB_MODE.carrierIdx];
    if (!carrier || carrier.isEliminated) return;

    const carrierBox = _tagBox(carrier);

    for (let j = 0; j < P.length; j++) {
      if (j === BOMB_MODE.carrierIdx) continue;
      const runner = P[j];
      if (!runner || runner.isEliminated) continue;

      const runnerImmunity = BOMB_MODE.passImmunity[runner.slot != null ? runner.slot : j] || 0;
      if (runnerImmunity > 0) continue;

      const runnerBox = _tagBox(runner);

      if (_hitRectInclusive(carrierBox, runnerBox)) {
        const oldCarrierIdx = BOMB_MODE.carrierIdx;
        const newCarrierIdx = j;

        const passerKey = carrier.slot != null ? carrier.slot : oldCarrierIdx;
        BOMB_MODE.passImmunity[passerKey] = BOMB_CONFIG.ANTI_RETAG_DURATION;
        BOMB_MODE.lastPasser = oldCarrierIdx;

        BOMB_MODE.carrierIdx = newCarrierIdx;
        BOMB_MODE.carrierPlayer = runner;
        if (typeof match !== 'undefined' && match) {
          match.it = newCarrierIdx;
          if (match.tags) {
            match.tags[newCarrierIdx] = (match.tags[newCarrierIdx] || 0) + 1;
          }
        }

        BOMB_MODE.fuse = Math.max(BOMB_MODE.fuse, Math.min(BOMB_CONFIG.PASS_FUSE_CAP, BOMB_MODE.fuse + BOMB_CONFIG.PASS_FUSE_BONUS));
        if (typeof match !== 'undefined' && match) {
          match.timer = BOMB_MODE.fuse;
        }
  ```
  *Finding*: There is zero network role check (`!NET || NET.isHost`) in `checkBombTag()`. Both guest and host mutate `BOMB_MODE.carrierIdx`, `BOMB_MODE.passImmunity`, `match.tags`, and `BOMB_MODE.fuse` immediately upon local bounding-box overlap. Guests do not transmit any tag claims to the host.
- **Direct Code Inspection: `tag/js/modes/bomb.js:341-399` & `468-471` (`updateBombMode`)**:
  ```javascript
  if (BOMB_MODE.state === 'detonated') {
    BOMB_MODE.detonationT -= timerDt;
    if (BOMB_MODE.detonationT <= 0) {
      const aliveSurvivors = getActiveSurvivors();
      if (aliveSurvivors.length <= 1) {
        BOMB_MODE.state = 'game_over';
        // ... match.state = 'result' ...
      }
      BOMB_MODE.roundNumber++;
      // Select a new random carrier from living survivors
      const nextCarrier = aliveSurvivors[Math.floor(_rand(aliveSurvivors.length))];
      BOMB_MODE.carrierIdx = P.indexOf(nextCarrier);
      // ...
    }
  }
  // ...
  if (BOMB_MODE.fuse <= 0) {
    detonateBombHolder();
  }
  ```
  *Finding*: Detonation and round progression run on guests locally. When detonation occurs, next carrier selection uses unseeded local `_rand(aliveSurvivors.length)`, picking divergent carriers across host and guest clients.
- **Direct Code Inspection: `tag/js/netplay.js:3356-3446` (`tag_claim` message handler)**:
  ```javascript
  } else if(m.t === 'tag_claim' && NET.isHost){
    // ...
    if(hunterIdx !== -1){
      const hunterP = P[hunterIdx];
      if(match.hunterMode){
        // Hunter elimination logic ...
      } else {
        const isHunter = settings.teams ? (hunterP.team === match.itTeam) : (hunterIdx === match.it);
        if(isHunter){
          // ...
          if(okClaim){
            applyTag(targetIdx, m.x, m.y);
          }
        }
      }
    }
  ```
  *Finding*: Host handles `tag_claim` solely for Hunter and Party modes (`applyTag()`). `applyTag()` sets `match.cooldown = 3.0` and party IT index, with zero integration for `BOMB_MODE.passImmunity`, `BOMB_MODE.carrierIdx`, or `BOMB_CONFIG.PASS_FUSE_BONUS`.

---

### 1.2 Capture the Flag Netplay Authority (`tag/js/modes/ctf.js` & `tag/js/netplay.js`)
- **Direct Code Inspection: `tag/js/modes/ctf.js:341-343` & `443` (`updateCtf`)**:
  ```javascript
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isHostOrLocal = !isOnline || (NET && NET.isHost);
  // ...
  if (!inPlay || !isHostOrLocal) return;
  // 4b. Dropped Flag Touch ...
  // 4. Flag Pickup Check ...
  // 5. Flag Capture Check ...
  ```
  *Finding*: In `updateCtf`, flag pickups and flag captures are gated behind `isHostOrLocal`. Guests skip pickup and capture evaluations.
- **Direct Code Inspection: `tag/js/modes/ctf.js:567-615` & `658-677` (`checkCtfTag` & `handleCtfTagCarrier`)**:
  ```javascript
  function checkCtfTag() {
    if (!ctfState.active) return;
    const m = Imatch();
    if (!m || m.state !== 'playing' || !m.players || m.players.length < 2) return;
    const P = m.players;
    for (let i = 0; i < P.length; i++) {
      // ...
      if (p1HasEnemyFlag && !p1HasShield) {
        handleCtfTagCarrier(p2, p1, 1 - p1.team);
        continue;
      }
      // ...
  function handleCtfTagCarrier(defender, carrier, flagTeam) {
    const flag = ctfState.flags[flagTeam];
    flag.state = 'home';
    flag.carrier = null;
    flag.x = flag.homeX;
    flag.y = flag.homeY;
    carrier.isRespawning = true;
    carrier.respawnT = CTF_CONFIG.RESPAWN_DELAY;
    // ...
  ```
  *Finding*: Unlike `updateCtf`, `checkCtfTag()` has **no** `isHostOrLocal` guard. Guests detect defender-carrier collisions locally and immediately reset `flag.state = 'home'` and `carrier.isRespawning = true`. When the host's next `modeEnv` state snapshot arrives via `netplay.js:1383-1422` (`applyModeState`), the guest is overridden, resulting in visual teleportation, flag snapping, and ghost respawns.
- **Direct Code Inspection: `tag/js/modes/ctf.js:541-549` & `693-703` (`triggerCtfWin`)**:
  ```javascript
  if (ctfState.scores[team] >= ctfState.targetCaptures) {
    triggerCtfWin(team);
    return;
  }
  // ...
  function triggerCtfWin(winningTeam) {
    const m = Imatch();
    if (!m) return;
    m.result = { winningTeam: winningTeam, mode: 'ctf', scores: [ctfState.scores[0], ctfState.scores[1]], reason: 'target_reached' };
    if (typeof endMatch === 'function') endMatch();
  }
  ```
  *Finding*: `triggerCtfWin()` unconditionally calls `endMatch()`. If called without host authority verification, match state prematurely shifts to `'result'` on non-host peers.

---

### 1.3 Bot AI Roaming & Freezing (`tag/js/bot_engine.js`)
- **Direct Code Inspection: `tag/js/bot_engine.js:462` (`botInputFor`)**:
  ```javascript
  if(!target) return {dir:0,jumpEdge:false,jumpHeld:false,downHeld:false};
  ```
  *Finding*: If `target` is null/undefined, the bot immediately bails out and outputs zero directional movement and zero jump inputs.
- **Direct Code Inspection: Target Resolution Failures in `tag/js/bot_engine.js:310-460`**:
  - Infection Mode (`lines 363-380`): During match countdown or before Patient Zero is selected, `P.some(p => p.isInfected)` is false. Survivor bots iterate through `match.players` filtering for `p.isInfected`, find none, leave `target = null`, and hit line 462, freezing in place.
  - Bomb Tag Mode (`lines 334-362`): When the carrier is detonated or in intermission (`detonationT > 0`), or when non-carrier bots look for `BOMB_MODE.carrierIdx`, if `cIdx` is invalid or eliminated, `target = null`, freezing runner bots.
  - Hunter Mode (`lines 381-405`): While the enemy hunter is caged or eliminated, runner bots evaluate `target = null` and freeze.
- **Direct Code Inspection: High-Ground Zoning Lockout (`tag/js/bot_engine.js:803, 894-945`)**:
  ```javascript
  const hunterBelow = ty > (p.y + p.h + 70);
  const onSolidPlatform = p.grounded && p.gp && !p.gp.wall && p.gp.t !== 'drop';
  const hunterSameTier = Math.abs(ty - (p.y + p.h)) < 65;
  const hunterDangerClose = Math.abs(dx) < 110;
  const allowHighGroundDrop = hunterSameTier || hunterDangerClose || isPinkJuke;
  const holdHighGround = !rescuingTeammate && !isIt && hunterBelow && onSolidPlatform && !allowHighGroundDrop;
  // ...
  } else if(holdHighGround){
    // ...
    if(p.gp.w<150&&!hasWallL&&!hasWallR&&!hasGroundL&&!hasGroundR){
      if(Math.abs(dCenter)>20){ want=Math.sign(platCenter-cx); S.dir=want; }
      else { want=0; S.dir=0; } // FREEZE
    } else if(want>0){
      if(!hasWallR&&!hasGroundR&&dEdgeR<40){
        if(dEdgeR<=10){ want=-1; S.dir=-1; }
        else { want=0; S.dir=0; } // FREEZE
      } else if(hasWallR&&dEdgeR<18){ want=0; S.dir=0; } // FREEZE
    } else if(want<0){
      if(!hasWallL&&!hasGroundL&&dEdgeL<40){
        if(dEdgeL<=10){ want=1; S.dir=1; }
        else { want=0; S.dir=0; } // FREEZE
      } else if(hasWallL&&dEdgeL<18){ want=0; S.dir=0; } // FREEZE
    }
  ```
  *Finding*: Whenever the chaser is on a lower tier (`hunterBelow = ty > p.y + p.h + 70`), runner bots enter `holdHighGround`. Upon reaching 40px from a platform edge or 18px from a wall, `want = 0; S.dir = 0;` is assigned, halting the bot.
- **Direct Code Inspection: Gap Jumping Branch Shadowing (`tag/js/bot_engine.js:954-957`)**:
  ```javascript
  }else if(!botGroundAhead(p,want,fastGround?125:80)&&far){
    S.jumpQ=true;
    if(fastGround)S.jumpHoldT=0.16;
  }
  ```
  *Finding*: The gap-crossing jump evaluation is inside an `else if` block placed *after* `holdHighGround`. Consequently, whenever `holdHighGround` triggers, the bot stops at the edge and never jumps to adjacent platforms.

---

### 1.4 Career Match Stats Idempotency (`tag/js/career.js` & `tag/js/netplay.js`)
- **Direct Code Inspection: `tag/js/career.js:127-234` (`endMatch`)**:
  ```javascript
  function endMatch(){
    try{CG.happytime();}catch(e){}try{CG.gameplayStop();}catch(e){}
    match.state='result';
    match.hostMenu=false;
    // ...
    try{
      const mi = myMatchIndex();
      if(mi >= 0){
        const myTags = (match.tags[mi] != null) ? match.tags[mi] : 0;
        let won = false;
        // ...
        careerRecordMatch(won, myTags, null);
      }
    }catch(e){}
    match.resultT=0;
    // ...
  ```
  *Finding*: `endMatch()` calls `careerRecordMatch()` unconditionally. It does **not** check whether stats for this match were already recorded, nor does it set `match._careerRecorded = true`.
- **Direct Code Inspection: `tag/js/netplay.js:3691-3705` (`m.t === 'state'` on guest)**:
  ```javascript
  // Career (guest device, one-shot): party/teams result
  try{
    if(match.state === 'result' && !match._careerRecorded && match.result && NET.mySlot >= 0 && match.tags){
      const mi2 = match.players.findIndex(p => p.slot === NET.mySlot);
      if(mi2 >= 0){
        match._careerRecorded = true;
        const tg = match.tags[mi2] || 0;
        let won2 = false;
        if(match.result.winningTeam != null){ won2 = match.players[mi2].team === match.result.winningTeam; }
        else { won2 = (mi2 !== match.result.loser); }
        careerRecordMatch(won2, tg, null);
      }
    }
  }catch(e){}
  ```
  *Finding*: If a guest triggers `endMatch()` locally (e.g. from timer expiry in `gameplay.js:394` or CTF win in `ctf.js:702`), `careerRecordMatch()` runs inside `endMatch()`. Since `endMatch()` never set `match._careerRecorded = true`, the arrival of the host's `'state'` packet with `match.state === 'result'` satisfies `!match._careerRecorded`, triggering `careerRecordMatch()` a **second time**.
- **Direct Code Inspection: Reconnect Instantiation in `tag/js/netplay.js:5177-5204` (`startMatchNetGuest`)**:
  ```javascript
  match = {
    startTime: Date.now(),
    state: initState,
    // ...
    result: null,
    // ...
  };
  ```
  *Finding*: When a client reconnects or joins midgame during the post-match result screen, `startMatchNetGuest` instantiates a brand new `match` object where `_careerRecorded` is `undefined`. When subsequent `'state'` packets arrive, lines 3693-3705 fire `careerRecordMatch()` again, double-incrementing wins, tags, and matches played for every reconnection.
- **Direct Code Inspection: Hunter Mode Duplicate Recording in `tag/js/modes/hunter.js:144-153` vs `tag/js/netplay.js:3549-3559`**:
  - In `hunter.js:149-152` (`endHunterRound`):
    `CAREER.m++; if(wonT){ CAREER.w++; CAREER.titles++; CAREER.streak++; } saveCareer();` (does not set `match._careerRecorded`).
  - In `netplay.js:3554-3558` (`hunter_score` packet):
    `match._careerRecorded = true; CAREER.m++; if(wonG){ CAREER.w++; CAREER.titles++; CAREER.streak++; } saveCareer();`
  *Finding*: Both host and guest logic have paths where both `endHunterRound` and `hunter_score` fire, double-incrementing `CAREER.m` and `CAREER.w`.

---

## 2. Logic Chain

```
[Observation 1.1: checkBombTag and updateBombMode run without isModeHost() check]
                                  │
                                  ▼
[Step 1: Guest simulates collision -> changes BOMB_MODE.carrierIdx, adds fuse bonus locally]
                                  │
                                  ▼
[Step 2: Host simulation at t_host does not register tag due to network jitter / remote interpolation]
                                  │
                                  ▼
[Step 3: Host broadcasts packModeState() snapshot -> applyModeState() overwrites guest]
                                  │
                                  ▼
[DEDUCTION 1: Guest snaps back to previous carrier (rubberbanding) and fuse desyncs occur]
                                  │
[Step 4: At fuse=0, guest runs detonateBombHolder() with unseeded local _rand() for next carrier]
                                  │
                                  ▼
[DEDUCTION 2: Host and guest pick different survivors as bomb carrier, creating split-brain state]
```

```
[Observation 1.2: checkCtfTag has no host authority guard]
                                  │
                                  ▼
[Step 5: Defender hits carrier on guest -> handleCtfTagCarrier resets flag to home and kills carrier locally]
                                  │
                                  ▼
[Step 6: Host did not confirm tag -> Host broadcasts enemy carrier still holding flag]
                                  │
                                  ▼
[DEDUCTION 3: Carrier resurrects on guest and flag teleports back to runner's hands]
```

```
[Observation 1.3: botInputFor returns dir:0 if !target + holdHighGround sets want=0 at platform boundaries]
                                  │
                                  ▼
[Step 7: When target is null (intermission, pre-infection, caged hunter), line 462 returns 0]
                                  │
                                  ▼
[DEDUCTION 4: Bots immediately freeze motionless whenever no opponent is in play]
                                  │
                                  ▼
[Step 8: In active play, when hunter is below, holdHighGround camps near edges/center, suppressing gap jumps]
                                  │
                                  ▼
[DEDUCTION 5: Runner bots stall permanently on upper ledges instead of exploring platforms]
```

```
[Observation 1.4: endMatch() calls careerRecordMatch() without setting match._careerRecorded = true]
                                  │
                                  ▼
[Step 9: Local match completion runs careerRecordMatch() -> CAREER.m & CAREER.w increment]
                                  │
                                  ▼
[Step 10: Host 'state' packet arrives with match.state='result' -> !match._careerRecorded passes]
                                  │
                                  ▼
[DEDUCTION 6: careerRecordMatch() executes twice for a single match, inflating career counters]
                                  │
                                  ▼
[Step 11: Reconnect midgame/result recreates match object with _careerRecorded=undefined]
                                  │
                                  ▼
[DEDUCTION 7: Every client reconnection during result screen increments career stats repeatedly]
```

---

## 3. Caveats

1. **Host-Authoritative Lag Compensation**: In P2P netplay over WebRTC/PeerJS, relying 100% on host simulation without client-side tag claims would cause guest carriers with higher latency (>100ms) to feel their tags are delayed or unresponsive. The system must support guest `tag_claim` messages with spatial validation (RTT-scaled slack) rather than purely ignoring guest touches.
2. **Offline Local Play vs Online**: Functions like `checkBombTag()`, `checkCtfTag()`, and `endMatch()` are shared between offline local multiplayer (touch/keyboard) and online netplay. Any host guard must verify `!NET || NET.role === null` as authoritative so offline and solo modes function without network dependencies.
3. **Bot Mimicry Harness Dependency**: `bot_engine.js` integrates with `HARNESS.transitions` for trained jump policies (`lines 828-849`). Roaming behavior must not disrupt or break `HARNESS` playback tests when `HARNESS.active` is true.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 R4 Fix Specification: Netplay Authority & Synchronization

#### 1. Canonical Host Authority Helper: `isModeHost()`
Define in global scope (`tag/js/core.js` or `tag/js/netplay.js`):
```javascript
function isModeHost() {
  if (typeof NET === 'undefined' || !NET || NET.role === null) return true; // Offline / local play is authoritative
  return !!NET.isHost;
}
```

#### 2. Bomb Tag Host Authority (`tag/js/modes/bomb.js`)
- **`checkBombTag()` (`lines 611-689`)**:
  Guard with `isModeHost()`. If `!isModeHost()`:
  - Do NOT mutate `BOMB_MODE.carrierIdx`, `BOMB_MODE.passImmunity`, `match.tags`, or `BOMB_MODE.fuse`.
  - Validate ownership: Check if `carrier.slot === NET.mySlot`.
  - If local guest is the carrier: Dispatch `netSendClaimTriple({ t: 'tag_claim', from: carrier.slot, target: runner.slot, x: popX, y: popY, hx: Math.round(carrier.x), hy: Math.round(carrier.y), tx: Math.round(runner.x), ty: Math.round(runner.y) })` and set local `match.cooldown = 0.5` debounce.
- **`updateBombMode()` (`lines 341-399` & `468-471`)**:
  Guard detonation and round rollover:
  ```javascript
  if (BOMB_MODE.fuse <= 0 && isModeHost()) {
    detonateBombHolder();
  }
  // Inside detonation timer expiry:
  if (BOMB_MODE.state === 'detonated' && !isModeHost()) return;
  ```
  Guests rely strictly on `applyModeState(env)` from the host.
- **`netplay.js:3356-3447` (`tag_claim` message handler)**:
  Add explicit `settings.gameMode === 'bomb'` branch on host:
  1. Ownership validation: Verify `hunterP.slot === (BOMB_MODE.carrierPlayer ? BOMB_MODE.carrierPlayer.slot : -1)`.
  2. Target eligibility: Verify `tgtP && !tgtP.isEliminated && (BOMB_MODE.passImmunity[tgtP.slot] || 0) <= 0`.
  3. Spatial validation: Validate claimer coordinates `m.hx, m.hy` against target coordinates `m.tx, m.ty` with RTT slack.
  4. Authoritative execution: Host executes `transferBomb(hunterP, tgtP)`, adds +1.5s fuse bonus, sets 2.0s immunity for passer, and broadcasts immediately via `packModeState()`.

#### 3. Capture the Flag Host Authority (`tag/js/modes/ctf.js`)
- **`checkCtfTag()` (`lines 567-615`)**:
  Guard carrier tagging with `isModeHost()`.
  If `!isModeHost()`:
  - Do NOT reset flag state to `'home'`.
  - Do NOT set carrier `isRespawning = true`.
  - If defender is local player (`defender.slot === NET.mySlot`), dispatch tag claim to host.
  - Carrier elimination and flag return execute solely upon host confirmation.
- **`triggerCtfWin()` (`lines 693-703`)**:
  ```javascript
  function triggerCtfWin(winningTeam) {
    if (!isModeHost()) return; // Only host confirms victory
    const m = Imatch();
    if (!m) return;
    m.result = { winningTeam: winningTeam, mode: 'ctf', scores: [ctfState.scores[0], ctfState.scores[1]], reason: 'target_reached' };
    if (typeof endMatch === 'function') endMatch();
  }
  ```

---

### 4.2 R5 Fix Specification: Bot AI Roaming & Navigation

#### 1. Target Null Roaming Fallback (`tag/js/bot_engine.js:462`)
Replace `if(!target) return {dir:0,...};` with autonomous platform roaming:
```javascript
if (!target) {
  // Autonomous Arena Roaming: keep bots moving, jumping, and patrolling platforms
  if (!S.roamTarget || Math.hypot(S.roamTarget.x - cx, S.roamTarget.y - cy) < 60 || (S.roamT = (S.roamT || 0) - stepDt) <= 0) {
    const validSolids = SOLIDS.filter(s => !s.wall && s.w >= 60 && s.t !== 'speed');
    const pickPlat = validSolids[Math.floor(Math.random() * validSolids.length)];
    S.roamTarget = pickPlat ? { x: pickPlat.x + pickPlat.w / 2, y: pickPlat.y - 23, w: 46, h: 46 } : { x: W / 2, y: H / 2, w: 46, h: 46 };
    S.roamT = 2.5 + Math.random() * 2.0;
  }
  target = S.roamTarget;
  isIt = true; // Use forward navigation router towards roam waypoint
}
```

#### 2. Distance-Gated High-Ground Zoning (`tag/js/bot_engine.js:803`)
Modify `holdHighGround` to check chaser proximity:
```javascript
const distHunter = Math.hypot(dx, dy);
// Only camp / hold high ground if hunter is actively nearby (< 360px). When distant, ROAM!
const holdHighGround = !rescuingTeammate && !isIt && hunterBelow && onSolidPlatform && !allowHighGroundDrop && (distHunter < 360);
```

#### 3. Enable Platform Hopping & Gap Leaping (`tag/js/bot_engine.js:900-940`)
In `holdHighGround`: when `distHunter >= 250px`, instead of clamping `want = 0; S.dir = 0;` at platform edges, allow jumping across gaps:
```javascript
if (distHunter >= 250 && !botGroundAhead(p, want, fastGround ? 125 : 80)) {
  S.jumpQ = true;
  S.jumpHoldT = 0.16;
}
```

---

### 4.3 R5 Fix Specification: Career Match Stats Idempotency

#### 1. Unique Match Identifier (`matchUid`)
In `wiring.js:189` and `netplay.js:5177`:
Assign a unique identifier to every match:
```javascript
match.matchUid = 'match_' + matchIndex + '_' + (match.startTime || Date.now());
```

#### 2. Idempotency Key Gate in `careerRecordMatch()` (`tag/js/career.js:76`)
```javascript
function careerRecordMatch(won, myTags, mySurv, matchUid) {
  if (matchUid && CAREER.lastRecordedMatchUid === matchUid) {
    return; // Already recorded this exact match! Idempotent no-op.
  }
  if (matchUid) {
    CAREER.lastRecordedMatchUid = matchUid;
  }
  // Proceed with CAREER.m++, CAREER.w++, CAREER.tags += myTags...
```

#### 3. Flagging in `endMatch()` (`tag/js/career.js:127`)
```javascript
function endMatch() {
  if (match._careerRecorded) return;
  match._careerRecorded = true;
  // ...
  const mUid = match.matchUid || ('match_' + matchIndex);
  careerRecordMatch(won, myTags, null, mUid);
}
```

#### 4. Guarding Client Reconnects in `netplay.js:5177` & `lines 3691-3705`
- In `startMatchNetGuest(p)`:
  If `p.state === 'result'` or `initState === 'result'`, initialize `match._careerRecorded = true` so newly reconnected clients do not record stats for an already-completed match.
- In `netplay.js:3693`:
  Pass `match.matchUid` to `careerRecordMatch(won2, tg, null, match.matchUid || ('net_' + matchIndex))`.
- In `modes/hunter.js:144-153`:
  Wrap career updates with `if (!match._careerRecorded) { match._careerRecorded = true; ... }`.

---

## 5. Verification Method

### 5.1 Independent Code Verification Script
Create and run a Node.js verification test script (e.g., `node test_authority_career.js`):

```javascript
// Test 1: isModeHost logic
const { isModeHost } = require('./tag/js/core.js'); // or mock
assert.strictEqual(isModeHost(undefined), true, 'Offline must be authoritative');
assert.strictEqual(isModeHost({ role: 'guest', isHost: false }), false, 'Guest is not host');
assert.strictEqual(isModeHost({ role: 'host', isHost: true }), true, 'Host is host');

// Test 2: Career Idempotency
CAREER.m = 0; CAREER.w = 0;
const uid = 'test_match_101';
careerRecordMatch(true, 5, null, uid);
assert.strictEqual(CAREER.m, 1);
assert.strictEqual(CAREER.w, 1);
// Duplicate call (simulating guest packet arrival or reconnect)
careerRecordMatch(true, 5, null, uid);
assert.strictEqual(CAREER.m, 1, 'Career match count must remain 1');
assert.strictEqual(CAREER.w, 1, 'Career win count must remain 1');

// Test 3: Bot AI Roaming without Target
const bot = { slot: 1, x: 500, y: 700, w: 46, h: 46, vx: 0, vy: 0, grounded: true };
match = { players: [bot], hunterMode: false };
const input = botInputFor(bot, 0.016);
assert.notStrictEqual(input.dir, 0, 'Bot must roam with non-zero direction when target is absent');
```

### 5.2 Syntax and Parsing Checks
Run automated syntax check across all affected modules:
```powershell
node --check tag/js/modes/bomb.js
node --check tag/js/modes/ctf.js
node --check tag/js/bot_engine.js
node --check tag/js/career.js
node --check tag/js/netplay.js
```

### 5.3 Invalidation Conditions
- If Bomb Tag carrier changes on guest before host confirmation packet arrives -> **FAIL (Authority violation)**.
- If CTF flag is returned to home base on guest while carrier is still holding flag on host -> **FAIL (Split-brain)**.
- If bot horizontal input (`dir`) is 0 for >60 consecutive frames when no target is alive -> **FAIL (Bot freeze)**.
- If `CAREER.m` increments more than once after simulating client disconnect/reconnect on match result -> **FAIL (Double-counting)**.
