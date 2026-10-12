const fs = require('fs');
const path = require('path');

function testFile(filePath) {
  console.log(`\n========================================`);
  console.log(`Testing file: ${filePath}`);
  console.log(`========================================\n`);

  const content = fs.readFileSync(filePath, 'utf8');

  // Extract function definitions using regex
  function extractFunction(name) {
    const startRegex = new RegExp(`function\\s+${name}\\s*\\(`, 'g');
    const match = startRegex.exec(content);
    if (!match) throw new Error(`Function ${name} not found in ${filePath}`);
    const startIndex = match.index;
    let braceCount = 0;
    let foundFirstBrace = false;
    let endIndex = startIndex;
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        foundFirstBrace = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (foundFirstBrace && braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    return content.slice(startIndex, endIndex);
  }

  // Create isolated sandbox
  const TEAMS = [
    { name: 'RED', color: '#ff4757' },
    { name: 'BLUE', color: '#2ed573' }
  ];
  const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

  let toasts = [];
  let netToasts = [];
  let sfxPlayed = [];
  let rosterBroadcasts = 0;

  const mockEnv = {
    TEAMS,
    PALETTE,
    settings: {
      gameMode: 'teams',
      teams: true,
      randomMap: false,
      map: 0,
      hunterRed: 0,
      hunterBlue: 1,
      hunterRotate: 'none',
      time: 60
    },
    menu: {
      slotColor: [0, 1, 2, 3, -1, -1, -1, -1],
      slotTeam: [0, 1, 0, 1, 0, 1, 0, 1],
      hunterVotes: {},
      hunterHistory: {},
      tab: 'teams'
    },
    NET: {
      isHost: true,
      role: 'host',
      teamsLocked: false,
      lobbyLocked: false,
      readyCountdown: null,
      mySlot: 0,
      slotsName: ['P1', 'P2', 'P3', 'P4'],
      slotsReady: [true, true, true, true],
      conns: new Map(),
      hostInputs: new Map()
    },
    toast: (msg) => { toasts.push(msg); },
    netToast: (msg) => { netToasts.push(msg); },
    sfx: (s) => { sfxPlayed.push(s); },
    activeSlots: function() {
      const act = [];
      for (let i = 0; i < 8; i++) {
        if (mockEnv.menu.slotColor[i] >= 0) act.push(i);
      }
      return act;
    },
    updateElectedHuntersFromVotes: () => {},
    validateHunterRoles: () => {},
    ensureUniqueLocalColors: () => {},
    netBroadcastRoster: () => { rosterBroadcasts++; },
    netSendRel: () => {},
    firstFreeSlot: () => -1,
    rand: (n) => 0,
    buildLevel: () => {},
    makePlayer: (i, slot, col) => ({ i, slot, col, team: (mockEnv.menu.slotTeam ? mockEnv.menu.slotTeam[slot] : slot) % 2 }),
    botReset: () => {},
    MAPS: [{ name: 'Arena' }],
    matchIndex: 0,
    THEMES: ['default'],
    currentThemeIdx: 0,
    lastStartIT: 0,
    isTouch: false,
    LOCAL_TOUCH: { p1: {}, p2: {} },
    parts: [],
    CG: { gameplayStart: () => {} },
    match: null,
    screen: 'menu',
    SESSION_METRICS: { modesPlayed: {} }
  };

  const cycleTeamCode = extractFunction('cycleTeam');
  const setPlayerTeamCode = extractFunction('setPlayerTeam');
  const netSwapPlayerTeamCode = extractFunction('netSwapPlayerTeam');
  const netSetPlayerTeamCode = extractFunction('netSetPlayerTeam');
  const enforceHunterBalanceCode = extractFunction('enforceHunterBalance');
  const startMatchCode = extractFunction('startMatch');
  const netForceStartCode = extractFunction('netForceStart');

  // Bind globals to globalThis so assignment to 'match' sets globalThis.match
  for (const [k, v] of Object.entries(mockEnv)) {
    globalThis[k] = v;
  }
  const evalInContext = (code) => {
    const fn = new Function(`${code}; return {
      cycleTeam, setPlayerTeam, netSwapPlayerTeam, netSetPlayerTeam, enforceHunterBalance, startMatch, netForceStart,
      getMatch: () => (typeof match !== 'undefined' ? match : globalThis.match)
    };`);
    return fn();
  };

  const fns = evalInContext(`
    ${cycleTeamCode}
    ${setPlayerTeamCode}
    ${netSwapPlayerTeamCode}
    ${netSetPlayerTeamCode}
    ${enforceHunterBalanceCode}
    ${startMatchCode}
    ${netForceStartCode}
  `);

  console.log("1. Checking functions do not block mid-switch (2v2 -> 3v1 -> 2v2)...");

  // Setup 4 players in 2v2
  mockEnv.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1];
  mockEnv.menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1]; // P0=0 (Red), P1=1 (Blue), P2=0 (Red), P3=1 (Blue)
  console.log("Initial teams (2v2):", mockEnv.menu.slotTeam.slice(0, 4));

  // Step 1: Switch P1 from Blue (1) to Red (0) -> should result in 3v1 [0, 0, 0, 1]
  fns.setPlayerTeam(1, 0);
  console.log("After setPlayerTeam(1, 0) -> Teams:", mockEnv.menu.slotTeam.slice(0, 4));
  if (mockEnv.menu.slotTeam[1] !== 0) {
    throw new Error("FAILED: setPlayerTeam(1, 0) was blocked!");
  }
  let redCount = mockEnv.menu.slotTeam.slice(0, 4).filter(t => t === 0).length;
  let blueCount = mockEnv.menu.slotTeam.slice(0, 4).filter(t => t === 1).length;
  if (redCount !== 3 || blueCount !== 1) {
    throw new Error(`FAILED: Expected 3v1, got Red=${redCount}, Blue=${blueCount}`);
  }
  console.log("✓ Transitioned 2v2 -> 3v1 successfully (not blocked mid-switch)");

  // Step 2: Now test attempting startMatch() while at 3v1
  console.log("\n2. Testing startMatch() rejection while at 3v1 in team mode...");
  toasts = [];
  globalThis.match = null;
  fns.startMatch();
  console.log("Toasts issued:", toasts);
  console.log("Match created?", fns.getMatch() !== null);
  const hasBalanceWarning = toasts.some(t => t.includes('TEAMS MUST BE BALANCED'));
  if (!hasBalanceWarning || fns.getMatch() !== null) {
    throw new Error(`FAILED: startMatch() did not reject 3v1 with balance warning! Toast: ${toasts.join(', ')}`);
  }
  console.log("✓ startMatch() at 3v1 was blocked with balance warning toast:", toasts[0]);

  // Step 3: Test attempting netForceStart() while at 3v1
  console.log("\n3. Testing netForceStart() rejection while at 3v1 in team mode...");
  netToasts = [];
  globalThis.match = null;
  fns.netForceStart();
  console.log("Net toasts issued:", netToasts);
  console.log("Match created?", fns.getMatch() !== null);
  const hasNetBalanceWarning = netToasts.some(t => t.includes('TEAMS MUST BE BALANCED'));
  if (!hasNetBalanceWarning || fns.getMatch() !== null) {
    throw new Error(`FAILED: netForceStart() did not reject 3v1 with balance warning! NetToast: ${netToasts.join(', ')}`);
  }
  console.log("✓ netForceStart() at 3v1 was blocked with balance warning netToast:", netToasts[0]);

  // Step 4: Complete transition from 3v1 -> 2v2 (P2 from Red (0) to Blue (1))
  console.log("\n4. Testing transition 3v1 -> 2v2 using cycleTeam...");
  fns.cycleTeam(2, 1); // P2 was 0 -> (0 + 1) % 2 = 1
  console.log("After cycleTeam(2, 1) -> Teams:", mockEnv.menu.slotTeam.slice(0, 4));
  redCount = mockEnv.menu.slotTeam.slice(0, 4).filter(t => t === 0).length;
  blueCount = mockEnv.menu.slotTeam.slice(0, 4).filter(t => t === 1).length;
  if (redCount !== 2 || blueCount !== 2) {
    throw new Error(`FAILED: Expected 2v2, got Red=${redCount}, Blue=${blueCount}`);
  }
  console.log("✓ Transitioned 3v1 -> 2v2 successfully");

  // Step 5: Start match when balanced (2v2, diff = 0 <= 1)
  console.log("\n5. Testing startMatch() when balanced (2v2)...");
  toasts = [];
  globalThis.match = null;
  fns.startMatch();
  if (fns.getMatch() === null) {
    throw new Error(`FAILED: startMatch() failed to start when balanced! Toasts: ${toasts.join(', ')}`);
  }
  console.log("✓ startMatch() succeeded when balanced! Match state:", fns.getMatch().state);

  // Step 6: Test netSwapPlayerTeam and netSetPlayerTeam
  console.log("\n6. Testing netSwapPlayerTeam and netSetPlayerTeam mid-switch...");
  mockEnv.menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1];
  fns.netSwapPlayerTeam(1); // 1 -> 0
  console.log("After netSwapPlayerTeam(1) -> Teams:", mockEnv.menu.slotTeam.slice(0, 4));
  if (mockEnv.menu.slotTeam[1] !== 0) throw new Error("netSwapPlayerTeam was blocked!");

  fns.netSetPlayerTeam(2, 1); // 2 -> 1
  console.log("After netSetPlayerTeam(2, 1) -> Teams:", mockEnv.menu.slotTeam.slice(0, 4));
  if (mockEnv.menu.slotTeam[2] !== 1) throw new Error("netSetPlayerTeam was blocked!");

  // Step 7: Test 3-player lobby balance: 2v1 (diff = 1 <= 1)
  console.log("\n7. Testing 3-player lobby 2v1 (diff = 1, should start)...");
  mockEnv.menu.slotColor = [0, 1, 2, -1, -1, -1, -1, -1];
  mockEnv.menu.slotTeam = [0, 1, 0, -1, -1, -1, -1, -1]; // 2 Red, 1 Blue
  toasts = [];
  globalThis.match = null;
  fns.startMatch();
  if (fns.getMatch() === null) {
    throw new Error(`FAILED: startMatch() should allow 2v1 (diff=1)! Toasts: ${toasts.join(', ')}`);
  }
  console.log("✓ 2v1 start succeeded (diff <= 1 allowed)");

  // Step 8: Test 3-player lobby 3v0 (diff = 3 > 1, should reject)
  console.log("\n8. Testing 3-player lobby 3v0 (diff = 3, should reject)...");
  mockEnv.menu.slotTeam = [0, 0, 0, -1, -1, -1, -1, -1]; // 3 Red, 0 Blue
  toasts = [];
  globalThis.match = null;
  fns.startMatch();
  if (fns.getMatch() !== null || !toasts.some(t => t.includes('TEAMS MUST BE BALANCED'))) {
    throw new Error("FAILED: startMatch() should reject 3v0!");
  }
  // Step 9: Test Hunter mode with 3v1 (should reject with balance warning)
  console.log("\n9. Testing Hunter mode with 3v1 rejection...");
  mockEnv.settings.gameMode = 'hunter';
  mockEnv.settings.teams = false;
  mockEnv.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1];
  mockEnv.menu.slotTeam = [0, 0, 0, 1, -1, -1, -1, -1]; // 3 Red, 1 Blue
  toasts = [];
  globalThis.match = null;
  fns.startMatch();
  console.log("Hunter mode toasts:", toasts);
  console.log("Hunter mode match created?", fns.getMatch() !== null);
  if (fns.getMatch() !== null || !toasts.some(t => t.includes('TEAMS MUST BE BALANCED'))) {
    throw new Error("FAILED: Hunter mode at 3v1 should be rejected with balance warning!");
  }
  console.log("✓ Hunter mode 3v1 rejected with balance warning toast:", toasts[0]);

  // Step 10: Test Hunter mode with 2v2 (should start)
  console.log("\n10. Testing Hunter mode with 2v2 (should start)...");
  mockEnv.menu.slotTeam = [0, 1, 0, 1, -1, -1, -1, -1]; // 2 Red, 2 Blue
  toasts = [];
  globalThis.match = null;
  fns.startMatch();
  if (fns.getMatch() === null) {
    throw new Error(`FAILED: Hunter mode at 2v2 should succeed! Toasts: ${toasts.join(', ')}`);
  }
  console.log("✓ Hunter mode 2v2 started successfully! Match state:", fns.getMatch().state);

  console.log(`\n>>> ALL TESTS PASSED FOR ${filePath} <<<\n`);
}

testFile(path.join(__dirname, '../tag/index.html'));
testFile(path.join(__dirname, '../tag-server/game.html'));
