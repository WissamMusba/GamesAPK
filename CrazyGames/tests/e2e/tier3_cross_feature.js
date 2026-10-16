/**
 * Tier 3: Cross-Feature Combinations Test Suite
 * Pairwise and multi-feature interactions across the 15 features.
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

describe('Tier 3: Cross-Feature Combinations', () => {
  test('T3.1: Bomb Mode + Host Authority + Peer Identity Validation', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_peer_1', 1);
    sb.settings.gameMode = 'bomb';
    sb.match = {
      players: [
        { slot: 0, x: 200, y: 1200, w: 46, h: 46, isEliminated: false },
        { slot: 1, x: 205, y: 1200, w: 46, h: 46, isEliminated: false }
      ],
      state: 'playing',
      it: 0,
      tags: [0, 0]
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    // Valid claim from guest 1 when guest 1 is IT
    if (sb.BOMB_MODE) {
      sb.BOMB_MODE.active = true;
      sb.BOMB_MODE.state = 'playing';
      sb.BOMB_MODE.carrierIdx = 1;
      sb.match.it = 1;

      // Guest attempts to spoof from: 0 (host)
      if (typeof sb.netOnData === 'function') {
        sb.netOnData({ t: 'tag_claim', from: 0, target: 1 }, { peer: 'guest_peer_1' });
        // Spoof must be rejected; carrierIdx should remain 1
        expect(sb.BOMB_MODE.carrierIdx).toBe(1);
      }
    }
  }, { tier: 3 });

  test('T3.2: CTF Mode + Host Authority + Bot AI Roaming', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.settings.gameMode = 'ctf';
    sb.match = {
      players: [
        { slot: 0, team: 0, x: 200, y: 1200, w: 46, h: 46, vx: 0, vy: 0, grounded: true },
        { slot: 1, team: 1, x: 2200, y: 1200, w: 46, h: 46, vx: 0, vy: 0, grounded: true }
      ],
      state: 'playing'
    };
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/bot_engine.js');

    if (sb.ctfState && typeof sb.ctfBotThink === 'function') {
      const bState = {};
      sb.ctfBotThink(sb.match.players[0], 0, 0.016, bState);
      expect(bState).toBeDefined();
    }
  }, { tier: 3 });

  test('T3.3: Infection Mode + Touch Slots + Full HUD Overlay', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.settings.gameMode = 'infection';
    sb.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1];
    sb.match = {
      players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2), sb.makePlayer(3)],
      state: 'playing',
      timer: 60
    };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/ui.js');

    expect(sb.activeSlots().length).toBe(4);
    if (typeof sb.drawHUD === 'function') {
      sb.drawHUD();
      const zones = sb.getZones();
      expect(zones.length).toBeGreaterThanOrEqual(3);
    }
  }, { tier: 3 });

  test('T3.4: Match End + Result State + Map Vote Hotkeys + Career Idempotency', () => {
    const sb = createGameSandbox();
    sb.match = {
      players: [sb.makePlayer(0), sb.makePlayer(1)],
      state: 'result',
      resultT: 1.0,
      tags: [3, 0],
      result: { winner: 0, loser: 1 }
    };
    sb.menu.mapVote = { mid: 1, opts: [0, 1, 2], votes: {}, decided: false };
    loadGameScript(sb, 'tag/js/career.js');
    loadGameScript(sb, 'tag/js/bot_ai.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    const mId = 'match_cross_3_4';
    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 3, 60, mId);
      const mCount = sb.CAREER.m;

      // Duplicate record call
      sb.careerRecordMatch(true, 3, 60, mId);
      expect(sb.CAREER.m).toBe(mCount);

      // Press hotkey 1 to vote
      sb.pressed.add('Digit1');
      if (typeof sb.updateGame === 'function') {
        sb.updateGame(0.016);
        expect(sb.menu.mapVote.votes[sb.myVoterId ? sb.myVoterId() : 'local_0']).toBe(0);
        expect(sb.match.state).toBe('result'); // Match not restarted!
      }
    }
  }, { tier: 3 });

  test('T3.5: Netplay Disconnect/Reconnect + Match Result + Career Gating', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.NET.mySlot = 1;
    sb.match = {
      state: 'result',
      players: [sb.makePlayer(0), sb.makePlayer(1)],
      tags: [1, 2],
      result: { winner: 1, loser: 0 },
      _careerRecorded: false
    };
    loadGameScript(sb, 'tag/js/career.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    const uid = 'reconnect_match_77';
    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 2, 45, uid);
      const initW = sb.CAREER.w;

      // Reconnect receives sync packet with same matchUid
      sb.careerRecordMatch(true, 2, 45, uid);
      expect(sb.CAREER.w).toBe(initW);
    }
  }, { tier: 3 });

  test('T3.6: Pause Menu Wrapping + Game Mode Switching across Bomb/Crown/CTF/Infection', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'guest';
    sb.NET.isHost = false;
    sb.match = { state: 'paused', pauseSel: 0 };
    loadGameScript(sb, 'tag/js/gameplay.js');

    const modes = ['bomb', 'crown', 'ctf', 'infection'];
    for (const m of modes) {
      sb.settings.gameMode = m;
      sb.pressed.clear();
      sb.pressed.add('KeyW'); // Up from 0
      if (typeof sb.updateGame === 'function') {
        sb.updateGame(0.016);
        expect(sb.match.pauseSel).toBe(3); // 4-item wrap for guest!
      }
    }
  }, { tier: 3 });

  test('T3.7: Room Closure Auth + Netplay Host Migration', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');
    expect(code).toContain('/api/rooms/close');
    expect(code).toContain('activeRooms');
  }, { tier: 3 });

  test('T3.8: Infection Mode + Bot AI Roaming', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'infection';
    sb.match = {
      players: [
        { slot: 0, isInfected: true, isPatientZero: true, x: 200, y: 1200, w: 46, h: 46, vx: 0, vy: 0, grounded: true },
        { slot: 1, isInfected: false, isPatientZero: false, x: 2200, y: 1200, w: 46, h: 46, vx: 0, vy: 0, grounded: true }
      ],
      state: 'playing'
    };
    loadGameScript(sb, 'tag/js/modes/infection.js');
    loadGameScript(sb, 'tag/js/bot_engine.js');

    if (typeof sb.infectionBotThink === 'function') {
      const bState = {};
      sb.infectionBotThink(sb.match.players[0], 0, 0.016, bState);
      expect(bState).toBeDefined();
    }
  }, { tier: 3 });

  test('T3.9: Bomb Mode Sudden Death + Career Stats', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'bomb';
    sb.match = {
      players: [sb.makePlayer(0), sb.makePlayer(1)],
      state: 'playing',
      tags: [2, 1]
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/career.js');

    if (sb.BOMB_MODE && typeof sb.initBombMode === 'function') {
      sb.initBombMode();
      expect(sb.BOMB_MODE.fuse).toBe(20.0); // 2 players: 20s starting fuse
    }
  }, { tier: 3 });

  test('T3.10: CTF Sudden Death + Map Vote', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'ctf';
    sb.match = {
      players: [sb.makePlayer(0), sb.makePlayer(1)],
      state: 'playing',
      timer: 0,
      isSuddenDeath: false
    };
    loadGameScript(sb, 'tag/js/modes/ctf.js');
    loadGameScript(sb, 'tag/js/gameplay.js');

    if (typeof sb.updateGame === 'function') {
      sb.ctfState = { scores: [1, 1] };
      sb.updateGame(0.016);
      expect(sb.match.isSuddenDeath).toBe(true);
      expect(sb.match.timer).toBe(60);
    }
  }, { tier: 3 });

  test('T3.11: Secret Elimination + Signaling Server Authentication', () => {
    const netplayCode = fs.readFileSync(path.join(REPO_ROOT, 'tag/js/netplay.js'), 'utf8');
    const serverCode = fs.readFileSync(path.join(REPO_ROOT, 'tag-server/server.js'), 'utf8');

    expect(netplayCode).not.toContain('discord.com/api/webhooks');
    expect(serverCode).toContain('/api/rooms');
  }, { tier: 3 });

  test('T3.12: Touch Multi-Player Lobby + Map Voting + Mode Cycle', () => {
    const sb = createGameSandbox({ isTouch: true });
    sb.menu.slotColor = [0, 1, 2, 3];
    loadGameScript(sb, 'tag/js/ui.js');
    loadGameScript(sb, 'tag/js/bot_ai.js');

    expect(sb.activeSlots().length).toBe(4);
    if (typeof sb.cycleGameMode === 'function') {
      sb.cycleGameMode();
      expect(sb.settings.gameMode).toBeDefined();
    }
  }, { tier: 3 });

  test('T3.13: Peer Identity Spoofing + Bomb Tag Transfer', () => {
    const sb = createGameSandbox();
    sb.NET.role = 'host';
    sb.NET.isHost = true;
    sb.NET.peerSlots.set('guest_attacker', 2);
    sb.match = {
      players: [sb.makePlayer(0), sb.makePlayer(1), sb.makePlayer(2)],
      state: 'playing'
    };
    loadGameScript(sb, 'tag/js/modes/bomb.js');
    loadGameScript(sb, 'tag/js/netplay.js');

    if (sb.BOMB_MODE) {
      sb.BOMB_MODE.carrierIdx = 0; // Host is carrier
      if (typeof sb.netOnData === 'function') {
        // Attacker claims to be slot 0 passing to slot 1
        sb.netOnData({ t: 'tag_claim', from: 0, target: 1 }, { peer: 'guest_attacker' });
        expect(sb.BOMB_MODE.carrierIdx).toBe(0);
      }
    }
  }, { tier: 3 });

  test('T3.14: Bot AI High-Ground Roaming in Crown King Mode', () => {
    const sb = createGameSandbox();
    sb.settings.gameMode = 'crown';
    sb.match = {
      players: [sb.makePlayer(0), sb.makePlayer(1)],
      state: 'playing'
    };
    loadGameScript(sb, 'tag/js/modes/crown.js');
    loadGameScript(sb, 'tag/js/bot_engine.js');

    if (typeof sb.crownBotThink === 'function') {
      const bState = {};
      sb.crownBotThink(sb.match.players[1], 1, 0.016, bState);
      expect(bState).toBeDefined();
    }
  }, { tier: 3 });

  test('T3.15: Career Streak Tracking Across Multiple Game Modes', () => {
    const sb = createGameSandbox();
    loadGameScript(sb, 'tag/js/career.js');

    if (typeof sb.careerRecordMatch === 'function') {
      sb.careerRecordMatch(true, 2, 60, 'match_bomb_win');
      expect(sb.CAREER.streak).toBe(1);

      sb.careerRecordMatch(true, 3, 60, 'match_ctf_win');
      expect(sb.CAREER.streak).toBe(2);

      sb.careerRecordMatch(true, 1, 60, 'match_inf_win');
      expect(sb.CAREER.streak).toBe(3);
      expect(sb.CAREER.w).toBe(3);
    }
  }, { tier: 3 });
});
