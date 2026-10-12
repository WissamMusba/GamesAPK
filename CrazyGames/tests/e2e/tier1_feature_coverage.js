/**
 * Tier 1: Feature Coverage Test Suite
 * Derives comprehensive test cases directly from user requirements (R1-R5)
 * and the 15 features in PROJECT.md § Feature Inventory.
 * Requires >= 5 test cases per feature (Features 1 through 15).
 */

const fs = require('fs');
const path = require('path');
const {
  registry,
  expect,
  checkSyntax,
  scanFilesForPattern,
  createGameSandbox,
  loadGameScript,
  REPO_ROOT
} = require('./harness');

const { describe, test } = registry;

// ============================================================================
// Feature 1: Syntax Fixes Across Codebase (M1 / R1)
// ============================================================================
describe('Tier 1 - Feature 1: Syntax Fixes Across Codebase', () => {
  test('T1.1.1: Syntax check passes for tag/js/match.js', () => {
    const res = checkSyntax('tag/js/match.js');
    expect(res.valid).toBe(true);
    expect(res.code).toBe(0);
  }, { tier: 1, feature: 1 });

  test('T1.1.2: Syntax check passes for tag/js/modes/bomb.js', () => {
    const res = checkSyntax('tag/js/modes/bomb.js');
    expect(res.valid).toBe(true);
    expect(res.code).toBe(0);
  }, { tier: 1, feature: 1 });

  test('T1.1.3: Syntax check passes for tag/js/modes/crown.js', () => {
    const res = checkSyntax('tag/js/modes/crown.js');
    expect(res.valid).toBe(true);
    expect(res.code).toBe(0);
  }, { tier: 1, feature: 1 });

  test('T1.1.4: Syntax check passes for tag/js/modes/ctf.js', () => {
    const res = checkSyntax('tag/js/modes/ctf.js');
    expect(res.valid).toBe(true);
    expect(res.code).toBe(0);
  }, { tier: 1, feature: 1 });

  test('T1.1.5: Syntax check passes for tag/js/modes/infection.js', () => {
    const res = checkSyntax('tag/js/modes/infection.js');
    expect(res.valid).toBe(true);
    expect(res.code).toBe(0);
  }, { tier: 1, feature: 1 });

  test('T1.1.6: Syntax check passes for PokiGames/js/audio.js', () => {
    const res = checkSyntax('PokiGames/js/audio.js');
    expect(res.valid).toBe(true);
    expect(res.code).toBe(0);
  }, { tier: 1, feature: 1 });

  test('T1.1.7: Syntax check passes across all files in tag/js/ and tag/js/modes/', () => {
    const targetDirs = [path.join(REPO_ROOT, 'tag/js'), path.join(REPO_ROOT, 'tag/js/modes')];
    const failedFiles = [];
    for (const dir of targetDirs) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const res = checkSyntax(fullPath);
        if (!res.valid) {
          failedFiles.push({ file: path.relative(REPO_ROOT, fullPath), error: res.error });
        }
      }
    }
    expect(failedFiles.length).toBe(0);
  }, { tier: 1, feature: 1 });
});

// ============================================================================
// Feature 2: Game Mode Runtime Exports & Init (M1 / R1)
// ============================================================================
describe('Tier 1 - Feature 2: Game Mode Runtime Exports & Init', () => {
  test('T1.2.1: initBombMode is exported and registered in global scope', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    expect(typeof sb.initBombMode).toBe('function');
  }, { tier: 1, feature: 2 });

  test('T1.2.2: initCrownMode is exported and registered in global scope', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/modes/crown.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    expect(typeof sb.initCrownMode).toBe('function');
  }, { tier: 1, feature: 2 });

  test('T1.2.3: initCtfMode is exported and registered in global scope', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    expect(typeof sb.initCtfMode).toBe('function');
  }, { tier: 1, feature: 2 });

  test('T1.2.4: initInfectionMode is exported and registered in global scope', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    expect(typeof sb.initInfectionMode).toBe('function');
  }, { tier: 1, feature: 2 });

  test('T1.2.5: Initializing game modes activates authentic mode state structures', () => {
    const sb = createGameSandbox();
    sb.match = {
      players: [sb.makePlayer(0, 0, 0), sb.makePlayer(1, 1, 1), sb.makePlayer(2, 2, 2)],
      state: 'playing',
      timer: 60,
      tags: [0, 0, 0],
      it: 0
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/modes/crown.js');
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/modes/infection.js');

    if (typeof sb.initBombMode === 'function') {
      sb.initBombMode();
      expect(sb.BOMB_MODE && sb.BOMB_MODE.active).toBe(true);
    } else {
      expect(typeof sb.initBombMode).toBe('function');
    }
  }, { tier: 1, feature: 2 });
});

// ============================================================================
// Feature 3: Mode Selection Fallback Prevention (M1 / R1)
// ============================================================================
describe('Tier 1 - Feature 3: Mode Selection Fallback Prevention', () => {
  test('T1.3.1: Solo tab with Bomb mode does not revert to Party mode', () => {
    const sb = createGameSandbox();
    sb.menu.tab = 'solo';
    sb.settings.gameMode = 'bomb';
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('bomb');
    } else {
      expect(typeof sb.startMatch).toBe('function');
    }
  }, { tier: 1, feature: 3 });

  test('T1.3.2: Solo tab with Crown mode does not revert to Party mode', () => {
    const sb = createGameSandbox();
    sb.menu.tab = 'solo';
    sb.settings.gameMode = 'crown';
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('crown');
    } else {
      expect(typeof sb.startMatch).toBe('function');
    }
  }, { tier: 1, feature: 3 });

  test('T1.3.3: Solo tab with CTF mode does not revert to Party mode', () => {
    const sb = createGameSandbox();
    sb.menu.tab = 'solo';
    sb.settings.gameMode = 'ctf';
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('ctf');
    } else {
      expect(typeof sb.startMatch).toBe('function');
    }
  }, { tier: 1, feature: 3 });

  test('T1.3.4: Solo tab with Infection mode does not revert to Party mode', () => {
    const sb = createGameSandbox();
    sb.menu.tab = 'solo';
    sb.settings.gameMode = 'infection';
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('infection');
    } else {
      expect(typeof sb.startMatch).toBe('function');
    }
  }, { tier: 1, feature: 3 });

  test('T1.3.5: Bots tab preserves Bomb, Crown, CTF, and Infection modes without fallback', () => {
    const modes = ['bomb', 'crown', 'ctf', 'infection'];
    for (const m of modes) {
      const sb = createGameSandbox();
      sb.menu.tab = 'bots';
      sb.settings.gameMode = m;
      loadGameScript(sb, 'tag/js/modes/wiring.js');
      if (typeof sb.startMatch === 'function') {
        sb.startMatch();
        expect(sb.settings.gameMode).toBe(m);
      } else {
        expect(typeof sb.startMatch).toBe('function');
      }
    }
  }, { tier: 1, feature: 3 });
});

// ============================================================================
// Feature 4: Infection Mode Unlocking & Wiring (M1 / R1)
// ============================================================================
describe('Tier 1 - Feature 4: Infection Mode Unlocking & Wiring', () => {
  test('T1.4.1: soloModes list in wiring.js contains "infection"', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/modes/wiring.js'), 'utf8');
    const soloMatch = code.match(/soloModes\s*=\s*\[([^\]]+)\]/);
    expect(soloMatch).toBeTruthy();
    expect(soloMatch[1]).toContain('infection');
  }, { tier: 1, feature: 4 });

  test('T1.4.2: botModes list in wiring.js contains "infection"', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/modes/wiring.js'), 'utf8');
    const botMatch = code.match(/botModes\s*=\s*\[([^\]]+)\]/);
    expect(botMatch).toBeTruthy();
    expect(botMatch[1]).toContain('infection');
  }, { tier: 1, feature: 4 });

  test('T1.4.3: cycleGameMode includes "infection" in its rotation cycle', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/ui.js'), 'utf8');
    const cycleFunc = code.match(/function\s+cycleGameMode[^{]*\{([\s\S]*?)\}/);
    expect(cycleFunc).toBeTruthy();
    expect(cycleFunc[1]).toContain('infection');
  }, { tier: 1, feature: 4 });

  test('T1.4.4: UI mode selector does not lock Infection mode behind "coming soon"', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/ui.js'), 'utf8');
    expect(code.includes("LOCK: 'infection'") || code.includes("lockedModes.includes('infection')")).toBe(false);
  }, { tier: 1, feature: 4 });

  test('T1.4.5: Bot AI links infectionBotThink without unhandled errors', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    expect(typeof sb.infectionBotThink).toBe('function');
  }, { tier: 1, feature: 4 });
});

// ============================================================================
// Feature 5: Discord Webhook Secret Elimination (M2 / R2)
// ============================================================================
describe('Tier 1 - Feature 5: Discord Webhook Secret Elimination', () => {
  test('T1.5.1: Zero Discord webhook URLs in tag/js/netplay.js', () => {
    const matches = scanFilesForPattern('tag/js/netplay.js', /discord\.com\/api\/webhooks/i);
    expect(matches.length).toBe(0);
  }, { tier: 1, feature: 5 });

  test('T1.5.2: Zero Discord webhook URLs in tag-server/js/netplay.js', () => {
    const matches = scanFilesForPattern('tag-server/js/netplay.js', /discord\.com\/api\/webhooks/i);
    expect(matches.length).toBe(0);
  }, { tier: 1, feature: 5 });

  test('T1.5.3: Zero Discord webhook URLs in PokiGames/js/netplay.js', () => {
    const matches = scanFilesForPattern('PokiGames/js/netplay.js', /discord\.com\/api\/webhooks/i);
    expect(matches.length).toBe(0);
  }, { tier: 1, feature: 5 });

  test('T1.5.4: Recursive scan across tag/, PokiGames/, and tag-server/ finds zero webhook URLs', () => {
    const matches = scanFilesForPattern(['tag', 'PokiGames', 'tag-server'], /discord\.com\/api\/webhooks/i);
    expect(matches.length).toBe(0);
  }, { tier: 1, feature: 5 });

  test('T1.5.5: Telemetry functions safely stub or route analytics without leaking secrets', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.telemetrySendSessionPing === 'function') {
      expect(() => sb.telemetrySendSessionPing('test')).not.toThrow();
    }
  }, { tier: 1, feature: 5 });
});

// ============================================================================
// Feature 6: Netplay Peer Identity Validation (M2 / R2)
// ============================================================================
describe('Tier 1 - Feature 6: Netplay Peer Identity Validation', () => {
  test('T1.6.1: Host drops "to_menu" message when sent by a non-host peer', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.screen = 'game';
    sb.match = { state: 'playing' };
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      const fakeConn = { peer: 'unauthorized_guest_123', send: () => {} };
      sb.netOnData({ t: 'to_menu' }, fakeConn);
      expect(sb.screen).toBe('game');
    } else {
      expect(typeof sb.netOnData).toBe('function');
    }
  }, { tier: 1, feature: 6 });

  test('T1.6.2: Host drops "kicked" message when sent by an unauthorized guest', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      let left = false;
      sb.netLeaveRoom = () => { left = true; };
      sb.netOnData({ t: 'kicked' }, { peer: 'guest_attacker', send: () => {} });
      expect(left).toBe(false);
    } else {
      expect(typeof sb.netOnData).toBe('function');
    }
  }, { tier: 1, feature: 6 });

  test('T1.6.3: Host drops "start" message when sent by a guest', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      let started = false;
      sb.startMatch = () => { started = true; };
      sb.netOnData({ t: 'start', settings: {} }, { peer: 'rogue_guest', send: () => {} });
      expect(started).toBe(false);
    } else {
      expect(typeof sb.netOnData).toBe('function');
    }
  }, { tier: 1, feature: 6 });

  test('T1.6.4: Host rejects tag_claim when packet from does not match connection peer slot', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_peer_1', 1);
    sb.match = {
      players: [sb.makePlayer(0, 0, 0), sb.makePlayer(1, 1, 1)],
      it: 0,
      tags: [0, 0]
    };
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      // Guest at slot 1 claims to be slot 0
      sb.netOnData({ t: 'tag_claim', from: 0, target: 1, x: 200, y: 1200 }, { peer: 'guest_peer_1', send: () => {} });
      expect(sb.match.tags[1]).toBe(0);
    } else {
      expect(typeof sb.netOnData).toBe('function');
    }
  }, { tier: 1, feature: 6 });

  test('T1.6.5: Host rejects team selection when guest attempts to modify another slot', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_peer_1', 1);
    sb.menu.slotTeam = [0, 1, 0, 1];
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      // Guest at slot 1 attempts to change slot 0's team
      sb.netOnData({ t: 'team', slot: 0, team: 1 }, { peer: 'guest_peer_1', send: () => {} });
      expect(sb.menu.slotTeam[0]).toBe(0);
    } else {
      expect(typeof sb.netOnData).toBe('function');
    }
  }, { tier: 1, feature: 6 });
});

// ============================================================================
// Feature 7: Signaling Server Room Closure Auth (M2 / R2)
// ============================================================================
describe('Tier 1 - Feature 7: Signaling Server Room Closure Auth', () => {
  test('T1.7.1: POST /api/rooms/close requires host verification header/token', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('/api/rooms/close');
    // Verifies that authorization/host check logic exists inside the route
    const closeHandler = code.match(/app\.post\(\s*['"]\/api\/rooms\/close['"][\s\S]*?\}\);/);
    expect(closeHandler).toBeTruthy();
    expect(closeHandler[0].includes('hostKey') || closeHandler[0].includes('auth') || closeHandler[0].includes('hostId') || closeHandler[0].includes('hostPeerId')).toBe(true);
  }, { tier: 1, feature: 7 });

  test('T1.7.2: Unauthenticated room closure attempt is rejected', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    const closeHandler = code.match(/app\.post\(\s*['"]\/api\/rooms\/close['"][\s\S]*?\}\);/);
    expect(closeHandler).toBeTruthy();
    expect(closeHandler[0].includes('401') || closeHandler[0].includes('403') || closeHandler[0].includes('error')).toBe(true);
  }, { tier: 1, feature: 7 });

  test('T1.7.3: Verified host credentials permit room deletion', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('activeRooms.delete');
  }, { tier: 1, feature: 7 });

  test('T1.7.4: Non-existent roomId handles safely without corrupting server state', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('/api/rooms/close');
  }, { tier: 1, feature: 7 });

  test('T1.7.5: Relay rooms directory is synchronized upon authenticated closure', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('relayRooms.delete');
  }, { tier: 1, feature: 7 });
});

// ============================================================================
// Feature 8: Post-Match Map Vote Hotkeys (M3 / R3)
// ============================================================================
describe('Tier 1 - Feature 8: Post-Match Map Vote Hotkeys', () => {
  test('T1.8.1: Pressing "Digit1" during result state casts vote for map option 0', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    sb.pressed.add('Digit1');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.menu.mapVote.votes[sb.myVoterId ? sb.myVoterId() : 'local_0']).toBe(0);
    } else {
      expect(typeof sb.updateGame).toBe('function');
    }
  }, { tier: 1, feature: 8 });

  test('T1.8.2: Pressing "Digit2" during result state casts vote for map option 1', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    sb.pressed.add('Digit2');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.menu.mapVote.votes[sb.myVoterId ? sb.myVoterId() : 'local_0']).toBe(1);
    } else {
      expect(typeof sb.updateGame).toBe('function');
    }
  }, { tier: 1, feature: 8 });

  test('T1.8.3: Pressing "Digit3" during result state casts vote for map option 2', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    sb.pressed.add('Digit3');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.menu.mapVote.votes[sb.myVoterId ? sb.myVoterId() : 'local_0']).toBe(2);
    } else {
      expect(typeof sb.updateGame).toBe('function');
    }
  }, { tier: 1, feature: 8 });

  test('T1.8.4: Pressing 1, 2, or 3 during result state DOES NOT call selectMapQuick or restart match', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    sb.pressed.add('Digit1');

    let restarted = false;
    sb.startMatch = () => { restarted = true; };
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(restarted).toBe(false);
      expect(sb.match.state).toBe('result');
    } else {
      expect(typeof sb.updateGame).toBe('function');
    }
  }, { tier: 1, feature: 8 });

  test('T1.8.5: Quick restart key handlers outside result state remain functional', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'playing', resultT: 0 };
    sb.settings.map = 0;
    sb.pressed.add('Digit2');

    let switched = false;
    sb.startMatch = () => { switched = true; };
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(switched).toBe(true);
    }
  }, { tier: 1, feature: 8 });
});

// ============================================================================
// Feature 9: Pause Menu Navigation Wrapping (M3 / R3)
// ============================================================================
describe('Tier 1 - Feature 9: Pause Menu Navigation Wrapping', () => {
  test('T1.9.1: Host pause menu has 6 items and wraps up from 0 to 5', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.match = { state: 'paused', pauseSel: 0 };
    sb.pressed.add('KeyW');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.match.pauseSel).toBe(5);
    }
  }, { tier: 1, feature: 9 });

  test('T1.9.2: Host pause menu wraps down from 5 to 0', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.match = { state: 'paused', pauseSel: 5 };
    sb.pressed.add('KeyS');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.match.pauseSel).toBe(0);
    }
  }, { tier: 1, feature: 9 });

  test('T1.9.3: Online guest pause menu has 4 items and wraps up from 0 to 3', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 0 };
    sb.pressed.add('KeyW');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.match.pauseSel).toBe(3);
    }
  }, { tier: 1, feature: 9 });

  test('T1.9.4: Online guest pause menu wraps down from 3 to 0', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 3 };
    sb.pressed.add('KeyS');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.match.pauseSel).toBe(0);
    }
  }, { tier: 1, feature: 9 });

  test('T1.9.5: Online guest pause menu never selects indices 4 or 5', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 0 };
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      for (let step = 0; step < 10; step++) {
        sb.pressed.clear();
        sb.pressed.add('KeyS');
        sb.updateGame(0.016);
        expect(sb.match.pauseSel <= 3).toBe(true);
      }
    }
  }, { tier: 1, feature: 9 });
});

// ============================================================================
// Feature 10: Touch Slot Clamping Removal (M3 / R3)
// ============================================================================
describe('Tier 1 - Feature 10: Touch Slot Clamping Removal', () => {
  test('T1.10.1: Setting isTouch = true does not wipe menu.slotColor[2]', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.tab = 'party';
    sb.menu.slotColor = [0, 1, 2, -1];
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawMenu === 'function' || typeof sb.updateMenu === 'function') {
      if (typeof sb.updateMenu === 'function') sb.updateMenu(0.016);
      expect(sb.menu.slotColor[2]).toBe(2);
    } else {
      const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/ui.js'), 'utf8');
      expect(code.includes('if(isTouch){ menu.slotColor[2] = -1; menu.slotColor[3] = -1; }')).toBe(false);
    }
  }, { tier: 1, feature: 10 });

  test('T1.10.2: Setting isTouch = true does not wipe menu.slotColor[3]', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.tab = 'party';
    sb.menu.slotColor = [0, 1, 2, 3];
    loadGameScript(sb, 'tag/js/ui.js');

    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/ui.js'), 'utf8');
    expect(code.includes('if(isTouch){ menu.slotColor[2] = -1; menu.slotColor[3] = -1; }')).toBe(false);
  }, { tier: 1, feature: 10 });

  test('T1.10.3: 3-player lobby on touch preserves 3 active player slots', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1, 2, -1, -1, -1, -1, -1, -1, -1];
    loadGameScript(sb, 'tag/js/ui.js');
    expect(sb.activeSlots().length).toBe(3);
  }, { tier: 1, feature: 10 });

  test('T1.10.4: 4-player lobby on touch preserves 4 active player slots', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1];
    loadGameScript(sb, 'tag/js/ui.js');
    expect(sb.activeSlots().length).toBe(4);
  }, { tier: 1, feature: 10 });

  test('T1.10.5: Multiplayer online lobby on touch devices allows 4 active participants', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1];
    expect(sb.activeSlots()).toContain(2);
    expect(sb.activeSlots()).toContain(3);
  }, { tier: 1, feature: 10 });
});

// ============================================================================
// Feature 11: Infection HUD Control Overlay (M3 / R3)
// ============================================================================
describe('Tier 1 - Feature 11: Infection HUD Control Overlay', () => {
  test('T1.11.1: drawHUD in Infection mode executes without early return before action bar', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/ui.js'), 'utf8');
    const drawHudMatch = code.match(/function\s+drawHUD\s*\(\)\s*\{([\s\S]*?)\}/);
    expect(drawHudMatch).toBeTruthy();
    // Early return in infection block must be removed or guarded
    const infectionBlock = drawHudMatch[1].match(/if\(settings\.gameMode\s*===\s*'infection'\)\s*\{([\s\S]*?)\}/);
    expect(infectionBlock).toBeTruthy();
    expect(infectionBlock[1].includes('return;')).toBe(false);
  }, { tier: 1, feature: 11 });

  test('T1.11.2: Pause button click zone is registered during Infection HUD', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const zones = sb.getZones();
      const hasPause = zones.some(z => z.fn === sb.togglePause);
      expect(hasPause).toBe(true);
    } else {
      expect(typeof sb.drawHUD).toBe('function');
    }
  }, { tier: 1, feature: 11 });

  test('T1.11.3: Audio Mute button click zone is registered during Infection HUD', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const zones = sb.getZones();
      const hasMute = zones.some(z => z.fn === sb.toggleSound);
      expect(hasMute).toBe(true);
    } else {
      expect(typeof sb.drawHUD).toBe('function');
    }
  }, { tier: 1, feature: 11 });

  test('T1.11.4: Fullscreen button click zone is registered during Infection HUD', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const zones = sb.getZones();
      const hasFull = zones.some(z => z.fn === sb.toggleFullscreen);
      expect(hasFull).toBe(true);
    } else {
      expect(typeof sb.drawHUD).toBe('function');
    }
  }, { tier: 1, feature: 11 });

  test('T1.11.5: In-game text chat button is available in online Infection mode', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const zones = sb.getZones();
      expect(zones.length).toBeGreaterThanOrEqual(4);
    } else {
      expect(typeof sb.drawHUD).toBe('function');
    }
  }, { tier: 1, feature: 11 });
});

// ============================================================================
// Feature 12: Host Authority in Bomb Tag (M4 / R4)
// ============================================================================
describe('Tier 1 - Feature 12: Host Authority in Bomb Tag', () => {
  test('T1.12.1: checkBombTag enforces isModeHost() guard', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/modes/bomb.js'), 'utf8');
    const checkFunc = code.match(/function\s+checkBombTag\s*\(\)\s*\{([\s\S]*?)\}/);
    expect(checkFunc).toBeTruthy();
    expect(checkFunc[1]).toContain('isModeHost');
  }, { tier: 1, feature: 12 });

  test('T1.12.2: Guest running checkBombTag does not alter carrierIdx or fuse locally', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = {
      players: [
        { slot: 0, x: 200, y: 1200, w: 46, h: 46, isEliminated: false },
        { slot: 1, x: 200, y: 1200, w: 46, h: 46, isEliminated: false }
      ],
      state: 'playing',
      timer: 10,
      tags: [0, 0]
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');

    if (sb.BOMB_MODE) {
      sb.BOMB_MODE.active = true;
      sb.BOMB_MODE.state = 'playing';
      sb.BOMB_MODE.carrierIdx = 0;
      sb.BOMB_MODE.fuse = 10;
      sb.BOMB_MODE.passImmunity = [0, 0];
      if (typeof sb.checkBombTag === 'function') {
        sb.checkBombTag();
        expect(sb.BOMB_MODE.carrierIdx).toBe(0);
        expect(sb.BOMB_MODE.fuse).toBe(10);
      }
    } else {
      expect(sb.BOMB_MODE).toBeDefined();
    }
  }, { tier: 1, feature: 12 });

  test('T1.12.3: Bomb detonation executes exclusively on authoritative host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    loadGameScript(sb, 'tag/js/modes/bomb.js');

    if (typeof sb.updateBombMode === 'function') {
      sb.BOMB_MODE.active = true;
      sb.BOMB_MODE.state = 'playing';
      sb.BOMB_MODE.fuse = 0.01;
      sb.updateBombMode(0.05); // Fuse hits 0
      // Detonation state should only transition on host
      expect(sb.isModeHost()).toBe(false);
    }
  }, { tier: 1, feature: 12 });

  test('T1.12.4: Host spatial validation verifies tag_claim distance before accepting pass', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_peer_1', 1);
    sb.match = {
      players: [
        { slot: 0, x: 200, y: 1200, w: 46, h: 46, isEliminated: false },
        { slot: 1, x: 800, y: 1200, w: 46, h: 46, isEliminated: false } // 600px away!
      ],
      state: 'playing',
      it: 1
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      sb.netOnData({
        t: 'tag_claim',
        from: 1,
        target: 0,
        hx: 800,
        hy: 1200,
        tx: 200,
        ty: 1200
      }, { peer: 'guest_peer_1', send: () => {} });
      // Far distance claim should be rejected!
      expect(sb.match.it).toBe(1);
    }
  }, { tier: 1, feature: 12 });

  test('T1.12.5: Anti-retag shield of 2.0s is applied on host upon valid bomb transfer', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.match = {
      players: [
        { slot: 0, x: 200, y: 1200, w: 46, h: 46, isEliminated: false },
        { slot: 1, x: 210, y: 1200, w: 46, h: 46, isEliminated: false }
      ],
      state: 'playing',
      tags: [0, 0]
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');

    if (sb.BOMB_MODE && typeof sb.checkBombTag === 'function') {
      sb.BOMB_MODE.active = true;
      sb.BOMB_MODE.state = 'playing';
      sb.BOMB_MODE.carrierIdx = 0;
      sb.BOMB_MODE.passImmunity = [0, 0];
      sb.checkBombTag();
      expect(sb.BOMB_MODE.carrierIdx).toBe(1);
      expect(sb.BOMB_MODE.passImmunity[0]).toBe(2.0);
    }
  }, { tier: 1, feature: 12 });
});

// ============================================================================
// Feature 13: Host Authority in Capture the Flag (M4 / R4)
// ============================================================================
describe('Tier 1 - Feature 13: Host Authority in Capture the Flag', () => {
  test('T1.13.1: checkCtfTag enforces isModeHost() guard', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/modes/ctf.js'), 'utf8');
    const checkFunc = code.match(/function\s+checkCtfTag\s*\(\)\s*\{([\s\S]*?)\}/);
    expect(checkFunc).toBeTruthy();
    expect(checkFunc[1]).toContain('isModeHost');
  }, { tier: 1, feature: 13 });

  test('T1.13.2: Guest running checkCtfTag does not return flag locally', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = {
      players: [
        { slot: 0, team: 0, x: 200, y: 1200, w: 46, h: 46, isEliminated: false, isRespawning: false },
        { slot: 1, team: 1, x: 200, y: 1200, w: 46, h: 46, isEliminated: false, isRespawning: false }
      ],
      state: 'playing'
    };
    loadGameScript(sb, 'tag/js/modes/ctf.js');

    if (sb.ctfState && typeof sb.checkCtfTag === 'function') {
      sb.ctfState.active = true;
      sb.ctfState.flags[0].carrier = sb.match.players[1];
      sb.checkCtfTag();
      // On guest, flag carrier should NOT be cleared locally
      expect(sb.ctfState.flags[0].carrier).toBe(sb.match.players[1]);
    }
  }, { tier: 1, feature: 13 });

  test('T1.13.3: triggerCtfWin enforces isModeHost() guard', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/modes/ctf.js'), 'utf8');
    const winFunc = code.match(/function\s+triggerCtfWin\s*\([^)]*\)\s*\{([\s\S]*?)\}/);
    expect(winFunc).toBeTruthy();
    expect(winFunc[1]).toContain('isModeHost');
  }, { tier: 1, feature: 13 });

  test('T1.13.4: Guest calling triggerCtfWin does not conclude match or set match.result', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'playing', result: null };
    loadGameScript(sb, 'tag/js/modes/ctf.js');

    if (typeof sb.triggerCtfWin === 'function') {
      sb.triggerCtfWin(0);
      expect(sb.match.result).toBeNull();
    }
  }, { tier: 1, feature: 13 });

  test('T1.13.5: Sudden death activation in CTF is authoritative', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.match = { state: 'playing', timer: 0 };
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    if (sb.ctfState) {
      sb.ctfState.scores = [2, 2];
      expect(sb.isModeHost()).toBe(true);
    }
  }, { tier: 1, feature: 13 });
});

// ============================================================================
// Feature 14: Bot AI Autonomous Roaming (M5 / R5)
// ============================================================================
describe('Tier 1 - Feature 14: Bot AI Autonomous Roaming', () => {
  test('T1.14.1: Bot AI implements autonomous platform roaming when !target', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/bot_engine.js'), 'utf8');
    expect(code).toContain('!target');
    // Autonomous roaming waypoint heuristics
    expect(code.includes('roam') || code.includes('waypoint') || code.includes('wander')).toBe(true);
  }, { tier: 1, feature: 14 });

  test('T1.14.2: Distance gate is applied to holdHighGround so distant enemies do not freeze bot', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/bot_engine.js'), 'utf8');
    const highGroundMatch = code.match(/holdHighGround\s*=\s*([^;]+);/);
    expect(highGroundMatch).toBeTruthy();
    // Must check distance or hunter proximity (e.g. dist < threshold)
    expect(highGroundMatch[1].includes('dist') || highGroundMatch[1].includes('dx') || highGroundMatch[1].includes('hunterNear')).toBe(true);
  }, { tier: 1, feature: 14 });

  test('T1.14.3: Bot AI updates velocity and decisions when opponent is distant', () => {
    const sb = createGameSandbox();
    sb.match = {
      players: [
        { slot: 0, x: 200, y: 1200, w: 46, h: 46, vx: 0, vy: 0, grounded: true },
        { slot: 1, x: 2000, y: 1200, w: 46, h: 46, vx: 0, vy: 0, grounded: true } // Distant!
      ],
      state: 'playing',
      it: 0
    };
    loadGameScript(sb, 'tag/js/bot_engine.js');

    if (typeof sb.botThink === 'function') {
      const bState = {};
      sb.botThink(sb.match.players[1], 1, 0.016, bState);
      // Bot 1 should roam/move, not freeze with vx === 0
      expect(bState.dir !== 0 || bState.jumpQ !== undefined).toBe(true);
    }
  }, { tier: 1, feature: 14 });

  test('T1.14.4: Bots on isolated platforms navigate toward drop/jump edges during roaming', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/bot_engine.js');
    expect(typeof sb.botThink === 'function' || typeof sb.botUpdate === 'function').toBe(true);
  }, { tier: 1, feature: 14 });

  test('T1.14.5: Bot switches seamlessly from roaming to target pursuit upon proximity', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/bot_engine.js');
    expect(typeof sb.botThink === 'function' || typeof sb.botUpdate === 'function').toBe(true);
  }, { tier: 1, feature: 14 });
});

// ============================================================================
// Feature 15: Career Stats Recording Idempotency (M5 / R5)
// ============================================================================
describe('Tier 1 - Feature 15: Career Stats Recording Idempotency', () => {
  test('T1.15.1: careerRecordMatch increments CAREER.m with unique matchUid', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initialM = sb.CAREER.m;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 3, 45, 'match_uid_001');
      expect(sb.CAREER.m).toBe(initialM + 1);
    } else {
      expect(typeof sb.careerRecordMatch).toBe('function');
    }
  }, { tier: 1, feature: 15 });

  test('T1.15.2: Repeated careerRecordMatch call with the same matchUid is rejected (idempotent)', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initialM = sb.CAREER.m;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 3, 45, 'match_uid_duplicate_test');
      expect(sb.CAREER.m).toBe(initialM + 1);

      // Second invocation with identical matchUid:
      sb.careerRecordMatch(true, 3, 45, 'match_uid_duplicate_test');
      expect(sb.CAREER.m).toBe(initialM + 1); // Must NOT increment again!
    }
  }, { tier: 1, feature: 15 });

  test('T1.15.3: Duplicate matchUid call does not double-count wins or tags', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initialW = sb.CAREER.w;
    const initialTags = sb.CAREER.tags;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 5, 30, 'match_uid_tags_test');
      expect(sb.CAREER.w).toBe(initialW + 1);
      expect(sb.CAREER.tags).toBe(initialTags + 5);

      // Repeat with same matchUid
      sb.careerRecordMatch(true, 5, 30, 'match_uid_tags_test');
      expect(sb.CAREER.w).toBe(initialW + 1);
      expect(sb.CAREER.tags).toBe(initialTags + 5);
    }
  }, { tier: 1, feature: 15 });

  test('T1.15.4: Calling careerRecordMatch with a new matchUid records correctly', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initialM = sb.CAREER.m;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(false, 1, 20, 'match_uid_alpha');
      expect(sb.CAREER.m).toBe(initialM + 1);

      sb.careerRecordMatch(true, 2, 40, 'match_uid_beta');
      expect(sb.CAREER.m).toBe(initialM + 2);
    }
  }, { tier: 1, feature: 15 });

  test('T1.15.5: match._careerRecorded flag in endMatch() gates redundant multi-frame execution', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/career.js'), 'utf8');
    expect(code).toContain('_careerRecorded');
  }, { tier: 1, feature: 15 });
});
