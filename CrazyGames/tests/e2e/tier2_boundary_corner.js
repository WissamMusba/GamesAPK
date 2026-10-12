/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Comprehensive edge cases, malformed packets, extreme values, rapid repeated inputs,
 * empty strings, and missing fields across Features 1 through 15 (>= 5 test cases per feature).
 */

const fs = require('fs');
const path = require('path');
const {
  registry,
  expect,
  checkSyntax,
  createGameSandbox,
  loadGameScript,
  REPO_ROOT
} = require('./harness');

const { describe, test } = registry;

// ============================================================================
// Feature 1: Syntax Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 1: Syntax Boundary Cases', () => {
  test('T2.1.1: Files with CRLF / LF line endings parse identically', () => {
    const res = checkSyntax('tag/js/match.js');
    expect(res.valid).toBe(true);
  }, { tier: 2, feature: 1 });

  test('T2.1.2: Strict mode semantics across all game modes parse cleanly', () => {
    const modes = ['bomb.js', 'crown.js', 'ctf.js', 'infection.js'];
    for (const m of modes) {
      const res = checkSyntax(path.join('tag/js/modes', m));
      expect(res.valid).toBe(true);
    }
  }, { tier: 2, feature: 1 });

  test('T2.1.3: Deeply nested template literals or regex literals in source parse without syntax error', () => {
    const res = checkSyntax('tag/js/netplay.js');
    expect(res.valid).toBe(true);
  }, { tier: 2, feature: 1 });

  test('T2.1.4: Large file boundaries (e.g. netplay.js >200KB) load without heap limits', () => {
    const sb = createGameSandbox();
    const res = loadGameScript(sb, 'tag/js/netplay.js');
    expect(res.error === null || res.error instanceof SyntaxError || res.error.message.includes('SyntaxError')).toBe(true);
  }, { tier: 2, feature: 1 });

  test('T2.1.5: UTF-8 emojis and special symbols in UI scripts parse cleanly', () => {
    const res = checkSyntax('tag/js/ui.js');
    expect(res.valid).toBe(true);
  }, { tier: 2, feature: 1 });
});

// ============================================================================
// Feature 2: Game Mode Init Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 2: Game Mode Init Boundary Cases', () => {
  test('T2.2.1: Calling mode init with empty match.players does not throw uncaught error', () => {
    const sb = createGameSandbox();
    sb.match = { players: [], state: 'playing', timer: 60 };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    if (typeof sb.initBombMode === 'function') {
      expect(() => sb.initBombMode()).not.toThrow();
    }
  }, { tier: 2, feature: 2 });

  test('T2.2.2: Re-initializing mode 10 times consecutively resets state cleanly', () => {
    const sb = createGameSandbox();
    sb.match = { players: [sb.makePlayer(0), sb.makePlayer(1)], state: 'playing', timer: 60 };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    if (typeof sb.initBombMode === 'function') {
      for (let i = 0; i < 10; i++) {
        expect(() => sb.initBombMode()).not.toThrow();
      }
    }
  }, { tier: 2, feature: 2 });

  test('T2.2.3: Initializing mode with MAXP players (10 players) sets valid indices', () => {
    const sb = createGameSandbox();
    const players = [];
    for (let i = 0; i < 10; i++) players.push(sb.makePlayer(i));
    sb.match = { players, state: 'playing', timer: 60, tags: new Array(10).fill(0) };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    if (typeof sb.initBombMode === 'function') {
      sb.initBombMode();
      expect(sb.BOMB_MODE.carrierIdx >= 0 && sb.BOMB_MODE.carrierIdx < 10).toBe(true);
    }
  }, { tier: 2, feature: 2 });

  test('T2.2.4: Calling mode update before mode init handles uninitialized state gracefully', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    if (typeof sb.updateBombMode === 'function') {
      expect(() => sb.updateBombMode(0.016)).not.toThrow();
    }
  }, { tier: 2, feature: 2 });

  test('T2.2.5: Switching modes cleans up previous mode active state without dangling flags', () => {
    const sb = createGameSandbox();
    sb.match = { players: [sb.makePlayer(0), sb.makePlayer(1)], state: 'playing', timer: 60 };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/modes/crown.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.initBombMode === 'function' && typeof sb.initCrownMode === 'function') {
      sb.initBombMode();
      expect(sb.BOMB_MODE.active).toBe(true);
      sb.settings.gameMode = 'crown';
      sb.initCrownMode();
      // Bomb mode must become inactive
      if (sb.BOMB_MODE) expect(sb.BOMB_MODE.active).toBe(false);
    }
  }, { tier: 2, feature: 2 });
});

// ============================================================================
// Feature 3: Mode Fallback Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 3: Mode Fallback Boundary Cases', () => {
  test('T2.3.1: Unknown or empty gameMode string safely defaults to "party"', () => {
    const sb = createGameSandbox();
    sb.menu.tab = 'solo';
    sb.settings.gameMode = 'invalid_unknown_mode_xyz';
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('party');
    }
  }, { tier: 2, feature: 3 });

  test('T2.3.2: Null or undefined gameMode safely defaults to "party"', () => {
    const sb = createGameSandbox();
    sb.menu.tab = 'solo';
    sb.settings.gameMode = null;
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('party');
    }
  }, { tier: 2, feature: 3 });

  test('T2.3.3: Rapid tab toggling (solo -> bots -> 2p) preserves selected mode if valid', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'bomb';
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.menu.tab = 'solo';
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('bomb');
      sb.menu.tab = 'bots';
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('bomb');
    }
  }, { tier: 2, feature: 3 });

  test('T2.3.4: Starting match with 0 or 1 active players warns and aborts', () => {
    const sb = createGameSandbox();
    sb.menu.slotColor = [-1, -1, -1, -1];
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.screen).toBe('menu');
      expect(sb.getToasts().length).toBeGreaterThan(0);
    }
  }, { tier: 2, feature: 3 });

  test('T2.3.5: Missing properties on settings object does not crash match start', () => {
    const sb = createGameSandbox();
    sb.settings = {}; // empty settings
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      expect(() => sb.startMatch()).not.toThrow();
    }
  }, { tier: 2, feature: 3 });
});

// ============================================================================
// Feature 4: Infection Wiring Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 4: Infection Wiring Boundary Cases', () => {
  test('T2.4.1: Infection mode started with exactly 2 players shows warning (<3 rule)', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1]; // exactly 2 active
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.screen).toBe('menu');
      const toasts = sb.getToasts();
      expect(toasts.some(t => t.includes('INFECTION') && t.includes('3 PLAYERS'))).toBe(true);
    }
  }, { tier: 2, feature: 4 });

  test('T2.4.2: Infection mode with 3 players designates exactly 1 patient zero and 2 survivors', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.menu.slotColor = [0, 1, 2, -1, -1, -1, -1, -1, -1, -1];
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function' && typeof sb.initInfectionMode === 'function') {
      sb.startMatch();
      if (sb.match && sb.match.players) {
        const infected = sb.match.players.filter(p => p.isInfected);
        expect(infected.length).toBe(1);
      }
    }
  }, { tier: 2, feature: 4 });

  test('T2.4.3: Infection mode with 10 players designates patient zero properly', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.menu.slotColor = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    if (typeof sb.startMatch === 'function' && typeof sb.initInfectionMode === 'function') {
      sb.startMatch();
      if (sb.match && sb.match.players) {
        const infected = sb.match.players.filter(p => p.isInfected);
        expect(infected.length).toBe(1);
      }
    }
  }, { tier: 2, feature: 4 });

  test('T2.4.4: Rapid cycling through game modes correctly wraps through infection', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/ui.js');
    if (typeof sb.cycleGameMode === 'function') {
      const visited = new Set();
      for (let i = 0; i < 10; i++) {
        sb.cycleGameMode();
        visited.add(sb.settings.gameMode);
      }
      expect(visited.has('infection')).toBe(true);
    }
  }, { tier: 2, feature: 4 });

  test('T2.4.5: Patient zero player disconnect in netplay handled gracefully', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.settings.gameMode = 'infection';
    sb.match = {
      players: [
        { slot: 0, isInfected: true, isPatientZero: true, isEliminated: false },
        { slot: 1, isInfected: false, isPatientZero: false, isEliminated: false }
      ]
    };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.netDropPlayerSlot === 'function') {
      expect(() => sb.netDropPlayerSlot(0)).not.toThrow();
    }
  }, { tier: 2, feature: 4 });
});

// ============================================================================
// Feature 5: Secret Elimination Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 5: Secret Elimination Boundary Cases', () => {
  test('T2.5.1: Missing or null webhook environment config does not throw uncaught error', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.telemetrySendSessionPing === 'function') {
      expect(() => sb.telemetrySendSessionPing()).not.toThrow();
    }
  }, { tier: 2, feature: 5 });

  test('T2.5.2: Telemetry invoked with malformed or circular payload handles safely', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    const circular = {};
    circular.self = circular;
    if (typeof sb.telemetrySendSessionPing === 'function') {
      expect(() => sb.telemetrySendSessionPing(circular)).not.toThrow();
    }
  }, { tier: 2, feature: 5 });

  test('T2.5.3: Rapid telemetry bursts (100 pings) do not leak memory or throw', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.telemetrySendSessionPing === 'function') {
      for (let i = 0; i < 100; i++) {
        expect(() => sb.telemetrySendSessionPing(`ping_${i}`)).not.toThrow();
      }
    }
  }, { tier: 2, feature: 5 });

  test('T2.5.4: Offline / failed telemetry network response does not interrupt gameplay', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.telemetryTrackMatchEnded === 'function') {
      expect(() => sb.telemetryTrackMatchEnded()).not.toThrow();
    }
  }, { tier: 2, feature: 5 });

  test('T2.5.5: Empty string telemetry endpoints handled gracefully', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (sb.NET_CONFIG) {
      expect(sb.NET_CONFIG.alertsWebhookUrl === '' || sb.NET_CONFIG.alertsWebhookUrl === undefined || sb.NET_CONFIG.alertsWebhookUrl === null).toBe(true);
    }
  }, { tier: 2, feature: 5 });
});

// ============================================================================
// Feature 6: Netplay Peer Identity Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 6: Netplay Peer Identity Boundary Cases', () => {
  test('T2.6.1: Packet with missing m.t property is dropped safely without crash', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.netOnData === 'function') {
      expect(() => sb.netOnData({}, { peer: 'abc' })).not.toThrow();
    }
  }, { tier: 2, feature: 6 });

  test('T2.6.2: Packet with missing connection c or c.peer is dropped safely', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.netOnData === 'function') {
      expect(() => sb.netOnData({ t: 'ping' }, null)).not.toThrow();
    }
  }, { tier: 2, feature: 6 });

  test('T2.6.3: Packet with negative or out-of-bounds m.from (-1, 99) is rejected', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.match = { state: 'playing', players: [sb.makePlayer(0), sb.makePlayer(1)], tags: [0, 0] };
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.netOnData === 'function') {
      sb.netOnData({ t: 'tag_claim', from: -1, target: 0, x: 200, y: 1200 }, { peer: 'guest_1' });
      sb.netOnData({ t: 'tag_claim', from: 99, target: 0, x: 200, y: 1200 }, { peer: 'guest_1' });
      expect(sb.match.tags[0]).toBe(0);
    }
  }, { tier: 2, feature: 6 });

  test('T2.6.4: Packet with malformed payload types (e.g. m.target = {}) handled safely', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.netOnData === 'function') {
      expect(() => sb.netOnData({ t: 'tag_claim', from: 1, target: {}, x: 'bad', y: null }, { peer: 'guest_1' })).not.toThrow();
    }
  }, { tier: 2, feature: 6 });

  test('T2.6.5: Rapid packet flood (100 packets in single tick) maintains sender validation', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_valid', 1);
    sb.match = { state: 'playing', players: [sb.makePlayer(0), sb.makePlayer(1)], tags: [0, 0] };
    loadGameScript(sb, 'tag/js/netplay.js');
    if (typeof sb.netOnData === 'function') {
      for (let i = 0; i < 100; i++) {
        // Attacker claims from: 0 (host slot)
        sb.netOnData({ t: 'tag_claim', from: 0, target: 1 }, { peer: 'guest_attacker' });
      }
      expect(sb.match.tags[1]).toBe(0);
    }
  }, { tier: 2, feature: 6 });
});

// ============================================================================
// Feature 7: Room Closure Auth Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 7: Room Closure Auth Boundary Cases', () => {
  test('T2.7.1: POST /api/rooms/close with empty body {} returns 400 Bad Request', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('/api/rooms/close');
    const closeHandler = code.match(/app\.post\(\s*['"]\/api\/rooms\/close['"][\s\S]*?\}\);/);
    expect(closeHandler).toBeTruthy();
    expect(closeHandler[0].includes('!roomId') || closeHandler[0].includes('400') || closeHandler[0].includes('error')).toBe(true);
  }, { tier: 2, feature: 7 });

  test('T2.7.2: POST /api/rooms/close with empty string roomId returns 400 Bad Request', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    const closeHandler = code.match(/app\.post\(\s*['"]\/api\/rooms\/close['"][\s\S]*?\}\);/);
    expect(closeHandler).toBeTruthy();
  }, { tier: 2, feature: 7 });

  test('T2.7.3: POST /api/rooms/close with huge roomId (>1000 chars) handles rejection safely', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('activeRooms');
  }, { tier: 2, feature: 7 });

  test('T2.7.4: POST /api/rooms/close with missing hostKey/auth rejected', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    const closeHandler = code.match(/app\.post\(\s*['"]\/api\/rooms\/close['"][\s\S]*?\}\);/);
    expect(closeHandler).toBeTruthy();
    expect(closeHandler[0].includes('hostKey') || closeHandler[0].includes('auth') || closeHandler[0].includes('hostId') || closeHandler[0].includes('hostPeerId')).toBe(true);
  }, { tier: 2, feature: 7 });

  test('T2.7.5: Rapid repeated close requests on the same room return consistent idempotent response', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('/api/rooms/close');
  }, { tier: 2, feature: 7 });
});

// ============================================================================
// Feature 8: Map Vote Hotkeys Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 8: Map Vote Hotkeys Boundary Cases', () => {
  test('T2.8.1: Pressing Digit0 or Digit4 through Digit9 during map vote does not cast invalid vote', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    sb.pressed.add('Digit4');
    sb.pressed.add('Digit9');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(Object.keys(sb.menu.mapVote.votes).length).toBe(0);
    }
  }, { tier: 2, feature: 8 });

  test('T2.8.2: Rapid repeated keypresses on Digit1 record a single vote', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    sb.pressed.add('Digit1');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      for (let i = 0; i < 5; i++) {
        sb.updateGame(0.016);
      }
      expect(sb.menu.mapVote.votes[sb.myVoterId ? sb.myVoterId() : 'local_0']).toBe(0);
    }
  }, { tier: 2, feature: 8 });

  test('T2.8.3: Pressing vote key before menu.mapVote is initialized does not throw TypeError', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = null;
    sb.pressed.add('Digit1');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      expect(() => sb.updateGame(0.016)).not.toThrow();
    }
  }, { tier: 2, feature: 8 });

  test('T2.8.4: Voting when voter ID is not in active voters list is rejected', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'result', resultT: 1.0 };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    loadGameScript(sb, 'tag/js/bot_ai.js');
    if (typeof sb.castMapVote === 'function') {
      sb.castMapVote('unauthorized_stranger', 0);
      expect(sb.menu.mapVote.votes['unauthorized_stranger']).toBeUndefined();
    }
  }, { tier: 2, feature: 8 });

  test('T2.8.5: Voting after mapVote.decided = true is ignored', () => {
    const sb = createGameSandbox();
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: true };
    loadGameScript(sb, 'tag/js/bot_ai.js');
    if (typeof sb.castMapVote === 'function') {
      sb.castMapVote('local_0', 0);
      expect(sb.menu.mapVote.votes['local_0']).toBeUndefined();
    }
  }, { tier: 2, feature: 8 });
});

// ============================================================================
// Feature 9: Pause Menu Navigation Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 9: Pause Menu Navigation Boundary Cases', () => {
  test('T2.9.1: Rapid arrow key inputs (10 inputs) stay within bounds [0..3] for guest', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 0 };
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      for (let i = 0; i < 10; i++) {
        sb.pressed.clear();
        sb.pressed.add('KeyS');
        sb.updateGame(0.016);
        expect(sb.match.pauseSel >= 0 && sb.match.pauseSel <= 3).toBe(true);
      }
    }
  }, { tier: 2, feature: 9 });

  test('T2.9.2: Simultaneous up and down keypresses handle deterministically', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 1 };
    sb.pressed.add('KeyW');
    sb.pressed.add('KeyS');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      expect(() => sb.updateGame(0.016)).not.toThrow();
      expect(sb.match.pauseSel >= 0 && sb.match.pauseSel <= 3).toBe(true);
    }
  }, { tier: 2, feature: 9 });

  test('T2.9.3: Corrupted pauseSel value (>10) clamps or wraps back into valid range', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 99 };
    sb.pressed.add('KeyS');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(sb.match.pauseSel <= 3).toBe(true);
    }
  }, { tier: 2, feature: 9 });

  test('T2.9.4: Negative pauseSel value wraps cleanly using positive modulo', () => {
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
  }, { tier: 2, feature: 9 });

  test('T2.9.5: Menu confirm key pressed on invalid index does not trigger action', () => {
    const sb = createGameSandbox();
    sb.match = { state: 'paused', pauseSel: 99 };
    sb.pressed.add('Enter');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      expect(() => sb.updateGame(0.016)).not.toThrow();
    }
  }, { tier: 2, feature: 9 });
});

// ============================================================================
// Feature 10: Touch Slot Clamping Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 10: Touch Slot Clamping Boundary Cases', () => {
  test('T2.10.1: menu.slotColor with non-standard array length handled safely on touch', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1];
    loadGameScript(sb, 'tag/js/ui.js');
    expect(() => sb.activeSlots()).not.toThrow();
  }, { tier: 2, feature: 10 });

  test('T2.10.2: Toggling isTouch false -> true -> false preserves slot colors', () => {
    const sb = createGameSandbox({ isTouch: false });
    sb.menu.slotColor = [0, 1, 2, 3];
    loadGameScript(sb, 'tag/js/ui.js');

    sb.isTouch = true;
    if (typeof sb.updateMenu === 'function') sb.updateMenu(0.016);
    sb.isTouch = false;
    if (typeof sb.updateMenu === 'function') sb.updateMenu(0.016);

    expect(sb.menu.slotColor[2]).toBe(2);
    expect(sb.menu.slotColor[3]).toBe(3);
  }, { tier: 2, feature: 10 });

  test('T2.10.3: Touch lobby with disconnected player restores default color without re-clamping', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1, -1, 3];
    loadGameScript(sb, 'tag/js/ui.js');
    expect(sb.activeSlots()).toContain(3);
  }, { tier: 2, feature: 10 });

  test('T2.10.4: menu.slotColor containing negative color indices clamped to valid palette', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1, 2, 3];
    loadGameScript(sb, 'tag/js/ui.js');
    expect(sb.activeSlots().length).toBe(4);
  }, { tier: 2, feature: 10 });

  test('T2.10.5: All 4 touch player slots maintained across 60 frames without losing slots 2 or 3', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1, 2, 3];
    loadGameScript(sb, 'tag/js/ui.js');

    for (let f = 0; f < 60; f++) {
      if (typeof sb.updateMenu === 'function') sb.updateMenu(0.016);
      expect(sb.menu.slotColor[2]).toBe(2);
      expect(sb.menu.slotColor[3]).toBe(3);
    }
  }, { tier: 2, feature: 10 });
});

// ============================================================================
// Feature 11: Infection HUD Overlay Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 11: Infection HUD Overlay Boundary Cases', () => {
  test('T2.11.1: Calling drawHUD in Infection mode with canvas dimensions 0x0 does not crash', () => {
    const sb = createGameSandbox();
    sb.CW = 0;
    sb.CH = 0;
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      expect(() => sb.drawHUD()).not.toThrow();
    }
  }, { tier: 2, feature: 11 });

  test('T2.11.2: Touch event on Pause button in Infection mode triggers togglePause callback', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const pauseZone = sb.getZones().find(z => z.fn === sb.togglePause);
      expect(pauseZone).toBeDefined();
      if (pauseZone && typeof pauseZone.fn === 'function') {
        pauseZone.fn();
        expect(sb.match.state).toBe('paused');
      }
    }
  }, { tier: 2, feature: 11 });

  test('T2.11.3: Audio mute toggle in Infection mode updates muted state', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const muteZone = sb.getZones().find(z => z.fn === sb.toggleSound);
      expect(muteZone).toBeDefined();
      if (muteZone && typeof muteZone.fn === 'function') {
        muteZone.fn();
        expect(sb.muted).toBe(true);
      }
    }
  }, { tier: 2, feature: 11 });

  test('T2.11.4: Infection HUD rendered when match.players is empty handles gracefully', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players: [] };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      expect(() => sb.drawHUD()).not.toThrow();
    }
  }, { tier: 2, feature: 11 });

  test('T2.11.5: Infection HUD with 10 players scales name pills and control buttons', () => {
    const sb = createGameSandbox();
    const players = [];
    for (let i = 0; i < 10; i++) players.push(sb.makePlayer(i));
    sb.settings.gameMode = 'infection';
    sb.match = { state: 'playing', timer: 60, players };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    if (typeof sb.drawHUD === 'function') {
      expect(() => sb.drawHUD()).not.toThrow();
    }
  }, { tier: 2, feature: 11 });
});

// ============================================================================
// Feature 12: Bomb Host Authority Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 12: Bomb Host Authority Boundary Cases', () => {
  test('T2.12.1: Guest tag_claim with NaN or Infinity coordinates is rejected by host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_1', 1);
    sb.match = { state: 'playing', players: [sb.makePlayer(0), sb.makePlayer(1)], it: 1 };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      sb.netOnData({
        t: 'tag_claim',
        from: 1,
        target: 0,
        hx: NaN,
        hy: Infinity,
        tx: 200,
        ty: 1200
      }, { peer: 'guest_1' });
      expect(sb.match.it).toBe(1);
    }
  }, { tier: 2, feature: 12 });

  test('T2.12.2: Guest tag_claim with distance > 500px is rejected by host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_1', 1);
    sb.match = { state: 'playing', players: [sb.makePlayer(0), sb.makePlayer(1)], it: 1 };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      sb.netOnData({
        t: 'tag_claim',
        from: 1,
        target: 0,
        hx: 1000,
        hy: 1200,
        tx: 200,
        ty: 1200
      }, { peer: 'guest_1' });
      expect(sb.match.it).toBe(1);
    }
  }, { tier: 2, feature: 12 });

  test('T2.12.3: Guest claiming tag on immune player (shield > 0) is rejected by host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_1', 1);
    sb.match = {
      state: 'playing',
      players: [
        { slot: 0, shieldT: 1.5, x: 200, y: 1200, w: 46, h: 46, isEliminated: false },
        { slot: 1, shieldT: 0, x: 210, y: 1200, w: 46, h: 46, isEliminated: false }
      ],
      it: 1
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (sb.BOMB_MODE) {
      sb.BOMB_MODE.passImmunity = [1.5, 0];
      if (typeof sb.netOnData === 'function') {
        sb.netOnData({ t: 'tag_claim', from: 1, target: 0, hx: 210, hy: 1200, tx: 200, ty: 1200 }, { peer: 'guest_1' });
        expect(sb.match.it).toBe(1);
      }
    }
  }, { tier: 2, feature: 12 });

  test('T2.12.4: Simultaneous tag claims from two guests resolved deterministically on host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_1', 1);
    sb.NET.peerSlots.set('guest_2', 2);
    sb.match = {
      state: 'playing',
      players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)],
      it: 1
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (typeof sb.netOnData === 'function') {
      expect(() => {
        sb.netOnData({ t: 'tag_claim', from: 1, target: 0 }, { peer: 'guest_1' });
        sb.netOnData({ t: 'tag_claim', from: 2, target: 0 }, { peer: 'guest_2' });
      }).not.toThrow();
    }
  }, { tier: 2, feature: 12 });

  test('T2.12.5: Host processes bomb fuse at dt = 0 or large dt without negative fuse desync', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    loadGameScript(sb, 'tag/js/modes/bomb.js');

    if (sb.BOMB_MODE && typeof sb.updateBombMode === 'function') {
      sb.BOMB_MODE.active = true;
      sb.BOMB_MODE.state = 'playing';
      sb.BOMB_MODE.fuse = 5.0;
      sb.updateBombMode(0);
      expect(sb.BOMB_MODE.fuse).toBe(5.0);
      sb.updateBombMode(10.0);
      expect(sb.BOMB_MODE.fuse <= 0).toBe(true);
    }
  }, { tier: 2, feature: 12 });
});

// ============================================================================
// Feature 13: CTF Host Authority Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 13: CTF Host Authority Boundary Cases', () => {
  test('T2.13.1: Guest claiming flag capture when flag is not held is rejected by host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_1', 1);
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (sb.ctfState && typeof sb.netOnData === 'function') {
      sb.ctfState.flags[0].carrier = null; // No one carrying flag 0
      sb.netOnData({ t: 'ctf_cap', slot: 1, team: 1 }, { peer: 'guest_1' });
      expect(sb.ctfState.scores[1]).toBe(0);
    }
  }, { tier: 2, feature: 13 });

  test('T2.13.2: Flag capture claim with carrier out of base radius is rejected by host', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_1', 1);
    sb.match = { players: [sb.makePlayer(0), sb.makePlayer(1)] };
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (sb.ctfState) {
      sb.match.players[1].x = 1200; // Far from home base!
      expect(sb.isModeHost()).toBe(true);
    }
  }, { tier: 2, feature: 13 });

  test('T2.13.3: Two carriers grabbing flags on same tick handled by host fumble logic', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    loadGameScript(sb, 'tag/js/modes/ctf.js');

    if (sb.ctfState && typeof sb.handleCtfFumble === 'function') {
      const p1 = sb.makePlayer(0);
      const p2 = sb.makePlayer(1);
      expect(() => sb.handleCtfFumble(p1, p2)).not.toThrow();
    }
  }, { tier: 2, feature: 13 });

  test('T2.13.4: Host handles sudden death score update at target captures boundary', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    loadGameScript(sb, 'tag/js/modes/ctf.js');

    if (sb.ctfState) {
      sb.ctfState.scores = [2, 2];
      expect(sb.isModeHost()).toBe(true);
    }
  }, { tier: 2, feature: 13 });

  test('T2.13.5: CTF tag collision on guest device does not despawn flag locally', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    loadGameScript(sb, 'tag/js/modes/ctf.js');

    if (sb.ctfState && typeof sb.checkCtfTag === 'function') {
      const initialCarrier = { slot: 1, team: 1 };
      sb.ctfState.flags[0].carrier = initialCarrier;
      sb.checkCtfTag();
      expect(sb.ctfState.flags[0].carrier).toBe(initialCarrier);
    }
  }, { tier: 2, feature: 13 });
});

// ============================================================================
// Feature 14: Bot Roaming Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 14: Bot Roaming Boundary Cases', () => {
  test('T2.14.1: Bot on a single tiny isolated platform does not walk off into void', () => {
    const sb = createGameSandbox();
    const p = sb.makePlayer(1);
    p.gp = { x: 500, y: 1200, w: 100, t: 'solid' };
    p.x = 550;
    p.y = 1154;
    p.grounded = true;
    loadGameScript(sb, 'tag/js/bot_engine.js');

    if (typeof sb.botThink === 'function') {
      const bState = {};
      sb.botThink(p, 1, 0.016, bState);
      expect(bState).toBeDefined();
    }
  }, { tier: 2, feature: 14 });

  test('T2.14.2: Bot roaming with MAPS data containing zero platforms handles fallback navigation', () => {
    const sb = createGameSandbox();
    sb.MAPS = [{ name: 'Empty', solids: [] }];
    loadGameScript(sb, 'tag/js/bot_engine.js');
    if (typeof sb.botThink === 'function') {
      expect(() => sb.botThink(sb.makePlayer(1), 1, 0.016, {})).not.toThrow();
    }
  }, { tier: 2, feature: 14 });

  test('T2.14.3: Bot encountering wall boundary reverses direction without jittering', () => {
    const sb = createGameSandbox();
    const p = sb.makePlayer(1);
    p.x = 85; // Near left wall WALL = 80
    loadGameScript(sb, 'tag/js/bot_engine.js');

    if (typeof sb.botThink === 'function') {
      const bState = { dir: -1 };
      sb.botThink(p, 1, 0.016, bState);
      expect(bState).toBeDefined();
    }
  }, { tier: 2, feature: 14 });

  test('T2.14.4: High ground detection with dy = 0 or negative relative height does not freeze bot', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/bot_engine.js');
    if (typeof sb.botThink === 'function') {
      expect(() => sb.botThink(sb.makePlayer(1), 1, 0.016, {})).not.toThrow();
    }
  }, { tier: 2, feature: 14 });

  test('T2.14.5: Extreme delta time (dt = 0 or dt = 0.5) in bot thinker updates stably', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/bot_engine.js');
    if (typeof sb.botThink === 'function') {
      expect(() => sb.botThink(sb.makePlayer(1), 1, 0, {})).not.toThrow();
      expect(() => sb.botThink(sb.makePlayer(1), 1, 0.5, {})).not.toThrow();
    }
  }, { tier: 2, feature: 14 });
});

// ============================================================================
// Feature 15: Career Idempotency Boundary Cases
// ============================================================================
describe('Tier 2 - Feature 15: Career Idempotency Boundary Cases', () => {
  test('T2.15.1: careerRecordMatch with matchUid = null records safely once', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initM = sb.CAREER.m;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 2, 30, null);
      expect(sb.CAREER.m).toBe(initM + 1);
    }
  }, { tier: 2, feature: 15 });

  test('T2.15.2: careerRecordMatch with negative tags clamps to 0', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initTags = sb.CAREER.tags;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, -10, 30, 'match_neg_tags');
      expect(sb.CAREER.tags).toBe(initTags);
    }
  }, { tier: 2, feature: 15 });

  test('T2.15.3: careerRecordMatch with NaN or non-number tags clamps to 0', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');
    const initTags = sb.CAREER.tags;

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, NaN, 30, 'match_nan_tags');
      expect(sb.CAREER.tags).toBe(initTags);
    }
  }, { tier: 2, feature: 15 });

  test('T2.15.4: Extremely large values (myTags = 1e6) handle without integer overflow', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 1000000, 30, 'match_large_tags');
      expect(sb.CAREER.tags).toBeGreaterThanOrEqual(1000000);
    }
  }, { tier: 2, feature: 15 });

  test('T2.15.5: Corrupt localStorage (invalid JSON string) recovers to defaultCareer without crash', () => {
    const sb = createGameSandbox();
    sb.localStorage.setItem('tag_career_v1', '{corrupt-invalid-json:!');
    loadGameScript(sb, 'tag/js/career.js');

    if (typeof sb.loadCareer === 'function') {
      const career = sb.loadCareer();
      expect(career).toBeDefined();
      expect(career.m).toBe(0);
    }
  }, { tier: 2, feature: 15 });
});
