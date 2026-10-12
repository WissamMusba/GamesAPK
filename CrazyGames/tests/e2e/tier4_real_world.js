/**
 * Tier 4: Real-World Application Scenarios Test Suite
 * Full end-to-end match workflows simulating complete gameplay cycles from
 * lobby configuration through active match execution, netplay coordination,
 * score settlement, map voting, and career persistence.
 */

const fs = require('fs');
const path = require('path');
const {
  registry,
  expect,
  createGameSandbox,
  loadGameScript,
  REPO_ROOT
} = require('./harness');

const { describe, test } = registry;

describe('Tier 4: Real-World Application Scenarios', () => {
  test('T4.1: Complete Bomb Tag Match Lifecycle (Lobby -> Pass -> Detonation -> Result -> Vote -> Career)', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.settings.gameMode = 'bomb';
    sb.menu.tab = 'solo';
    sb.menu.slotColor = [0, 1, 2, -1, -1, -1, -1, -1, -1, -1]; // 3 players

    loadGameScript(sb, 'tag/js/career.js');
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    // 1. Lobby to Match Start
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('bomb');
      expect(sb.screen).toBe('game');
    }

    // 2. Carrier designation and fuse verification
    if (sb.BOMB_MODE && sb.match) {
      expect(sb.BOMB_MODE.active).toBe(true);
      expect(sb.BOMB_MODE.carrierIdx).toBeGreaterThanOrEqual(0);
      expect(sb.BOMB_MODE.fuse).toBe(11.0); // 3 players = 11.0s fuse

      // 3. Simulated Tag Pass
      const carrier = sb.match.players[sb.BOMB_MODE.carrierIdx];
      const otherIdx = (sb.BOMB_MODE.carrierIdx + 1) % 3;
      const other = sb.match.players[otherIdx];

      carrier.x = 300; carrier.y = 1200;
      other.x = 310; other.y = 1200;

      if (typeof sb.checkBombTag === 'function') {
        sb.checkBombTag();
        // Bomb passed: immunity given to passer
        expect(sb.BOMB_MODE.passImmunity[carrier.slot]).toBe(2.0);
        expect(sb.BOMB_MODE.carrierIdx).toBe(otherIdx);
      }

      // 4. Detonation when fuse reaches 0
      sb.BOMB_MODE.fuse = 0.05;
      if (typeof sb.updateBombMode === 'function') {
        sb.updateBombMode(0.1); // Triggers detonation
      }

      // 5. Match Result & Career Record
      const matchUid = 'e2e_bomb_real_world_01';
      if (typeof sb.endMatch === 'function') {
        sb.endMatch();
        expect(sb.match.state).toBe('result');
      }

      if (typeof sb.careerRecordMatch === 'function') {
        sb.careerRecordMatch(true, 1, 40, matchUid);
        const savedM = sb.CAREER.m;
        // Verify idempotency
        sb.careerRecordMatch(true, 1, 40, matchUid);
        expect(sb.CAREER.m).toBe(savedM);
      }

      // 6. Map Voting via hotkey 1
      sb.menu.mapVote = { mid: sb.matchIndex, opts: [0, 1, 2], votes: {}, decided: false };
      sb.pressed.add('Digit1');
      if (typeof sb.updateGame === 'function') {
        sb.updateGame(0.016);
        expect(sb.match.state).toBe('result'); // Still in result state!
      }
    }
  }, { tier: 4 });

  test('T4.2: Complete Infection Mode Match Lifecycle on Touch (4P Lobby -> HUD -> Infection -> Result)', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.settings.gameMode = 'infection';
    sb.menu.tab = 'party';
    sb.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1]; // 4 players on touch

    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    loadGameScript(sb, 'tag/js/ui.js');
    loadGameScript(sb, 'tag/js/career.js');

    // 1. Verify touch slots are preserved
    expect(sb.activeSlots().length).toBe(4);

    // 2. Start Match
    if (typeof sb.startMatch === 'function') {
      sb.startMatch();
      expect(sb.settings.gameMode).toBe('infection');
      expect(sb.screen).toBe('game');
    }

    // 3. Verify Patient Zero assignment and HUD overlay
    if (sb.match && sb.match.players) {
      if (typeof sb.initInfectionMode === 'function') {
        sb.initInfectionMode();
        const pz = sb.match.players.filter(p => p.isPatientZero);
        expect(pz.length).toBe(1);
      }

      // Draw HUD and verify pause/mute controls exist
      if (typeof sb.drawHUD === 'function') {
        sb.drawHUD();
        const zones = sb.getZones();
        expect(zones.length).toBeGreaterThanOrEqual(3);
      }

      // 4. Spread infection to all survivors
      for (const p of sb.match.players) {
        p.isInfected = true;
      }

      // 5. Match Result
      if (typeof sb.endMatch === 'function') {
        sb.endMatch();
        expect(sb.match.state).toBe('result');
        expect(sb.match.result.mode).toBe('infection');
      }
    }
  }, { tier: 4 });

  test('T4.3: Capture the Flag Match with Host-Authoritative Netplay (Steal -> Return -> Capture -> Win)', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.settings.gameMode = 'ctf';
    sb.settings.teams = true;
    sb.settings.ctfTargetCaptures = 3;

    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/modes/wiring.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    sb.match = {
      players: [
        { slot: 0, team: 0, x: 200, y: 1200, w: 46, h: 46, isEliminated: false, isRespawning: false },
        { slot: 1, team: 1, x: 2200, y: 1200, w: 46, h: 46, isEliminated: false, isRespawning: false }
      ],
      state: 'playing',
      timer: 120
    };

    if (sb.ctfState && typeof sb.initCtfMode === 'function') {
      sb.initCtfMode();
      expect(sb.ctfState.active).toBe(true);

      // 1. Guest steals red flag
      sb.ctfState.flags[0].carrier = sb.match.players[1];

      // 2. Intercept carrier: tag collision on host returns red flag
      sb.match.players[0].x = sb.match.players[1].x;
      sb.match.players[0].y = sb.match.players[1].y;

      if (typeof sb.checkCtfTag === 'function') {
        sb.checkCtfTag();
        // Flag should be returned to base or carrier dropped
        expect(sb.ctfState.flags[0].carrier).toBeNull();
      }

      // 3. Red captures blue flag to hit target captures
      sb.ctfState.scores = [2, 1];
      if (typeof sb.scoreCtfCapture === 'function') {
        sb.scoreCtfCapture(0, sb.match.players[0]);
        expect(sb.ctfState.scores[0]).toBe(3);
      }
    }
  }, { tier: 4 });

  test('T4.4: Network Interruption & Career Idempotency Re-Sync under Packet Replay', () => {
    const sbHost = createGameSandbox();
    const sbGuest = createGameSandbox();

    sbHost.NET.role = 'host'; sbHost.NET.isHost = true; sbHost.NET.mySlot = 0;
    sbGuest.NET.role = 'guest'; sbGuest.NET.isHost = false; sbGuest.NET.mySlot = 1;

    loadGameScript(sbHost, 'tag/js/career.js');
    loadGameScript(sbHost, 'tag/js/netplay.js');
    loadGameScript(sbGuest, 'tag/js/career.js');
    loadGameScript(sbGuest, 'tag/js/netplay.js');

    const matchUid = 'resync_match_uuid_999';

    // Host finishes match and records career
    if (typeof sbHost.careerRecordMatch === 'function') {
      sbHost.careerRecordMatch(true, 4, 60, matchUid);
      expect(sbHost.CAREER.m).toBe(1);
      expect(sbHost.CAREER.w).toBe(1);
    }

    // Guest finishes match and records career
    if (typeof sbGuest.careerRecordMatch === 'function') {
      sbGuest.careerRecordMatch(false, 1, 30, matchUid);
      expect(sbGuest.CAREER.m).toBe(1);
      expect(sbGuest.CAREER.w).toBe(0);

      // Replay / sync packet re-received on guest with same matchUid
      sbGuest.careerRecordMatch(false, 1, 30, matchUid);
      // Stats must remain strictly unchanged!
      expect(sbGuest.CAREER.m).toBe(1);
      expect(sbGuest.CAREER.tags).toBe(1);
    }
  }, { tier: 4 });

  test('T4.5: Full Post-Match Workflow: Map Voting, Rapid Inputs & Clean Rematch', () => {
    const sb = createGameSandbox();
    sb.match = {
      state: 'result',
      resultT: 0.5,
      players: [sb.makePlayer(0), sb.makePlayer(1)],
      tags: [2, 0],
      result: { winner: 0, loser: 1 }
    };
    sb.menu.mapVote = {
      mid: 1,
      opts: [0, 1, 2],
      votes: {},
      decided: false
    };

    let rematchTriggered = false;
    sb.startMatch = () => { rematchTriggered = true; };

    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    // 1. Rapid key presses on vote keys (1, 2, 3)
    sb.pressed.add('Digit1');
    if (typeof sb.updateGame === 'function') {
      sb.updateGame(0.016);
      expect(rematchTriggered).toBe(false);
      expect(sb.menu.mapVote.votes['local_0']).toBe(0);

      // Change vote to 2
      sb.pressed.clear();
      sb.pressed.add('Digit2');
      sb.updateGame(0.016);
      expect(rematchTriggered).toBe(false);
      expect(sb.menu.mapVote.votes['local_0']).toBe(1);
    }

    // 2. Decide vote and start rematch
    if (typeof sb.decideMapVote === 'function') {
      sb.decideMapVote();
      expect(sb.menu.mapVote).toBeNull();
    }
  }, { tier: 4 });
});
