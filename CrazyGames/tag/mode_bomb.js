/**
 * TAG! - BOMB TAG / HOT POTATO MODE ('bomb')
 * Production-Ready Game Mode Module
 *
 * Game Rules & Mechanics:
 * 1. A ticking bomb with an animated spark fuse attaches to a random player.
 * 2. Tagging another player transfers the bomb to them.
 * 3. Scaled Starting Fuse based on living survivors:
 *    - 4+ players: 14.0s fuse
 *    - 3 players:  11.0s fuse
 *    - 2 players:  8.0s fuse (Sudden Death 1v1!)
 * 4. Dynamic Balancing:
 *    - Carrier Sprint: Bomb carrier gets +12% speed (565 px/s) to catch evasive runners.
 *    - Runners run at standard speed (504 px/s).
 *    - Final 3s: Visual white/red flashing fuse, 2x ticking tempo.
 *      (Per user design update: NO extra speed spike in final 3s; carrier speed remains 565 px/s).
 *    - Anti-Re-Tag Shield: EXACTLY 2.0 seconds tag immunity after passing the bomb!
 *    - Fuse Extension on Pass: Each successful pass grants +1.5s to fuse (capped at 12.0s).
 * 5. Detonation:
 *    - At 0.0s, the bomb holder explodes into confetti and colorful particle blast.
 *    - Holder is eliminated.
 *    - Round restarts with remaining survivors after a brief elimination delay until 1 winner remains.
 * 6. Audio/Visual Polish:
 *    - Animated ticking bomb on player's head with smoking spark fuse.
 *    - Screen shake, screen flash, and confetti/fire blast on detonation.
 *    - HUD countdown timer with color warnings (amber -> red -> critical flashing).
 * 7. Bot AI:
 *    - Bomb Bot: High-aggression pursuit, uses boost pads and apex double jumps.
 *    - Runner Bots: Scatter away from carrier, take opposing platform tiers, juke on drop platforms.
 */

(function(root) {
  "use strict";

  /* ================= CONFIGURATION & BALANCING CONSTANTS ================= */
  const BOMB_CONFIG = {
    SPEED_RUNNER: 504,          // Base runner speed (px/s)
    SPEED_CARRIER: 565,         // Carrier sprint: +12% speed (504 * 1.12 ≈ 565 px/s)
    CARRIER_SPEED: 565,         // Carrier speed alias for engine compatibility
    // NOTE: Per user design update, NO desperation speed burst in final 3s. Carrier stays 565 px/s.
    ANTI_RETAG_DURATION: 2.0,   // EXACTLY 2.0s tag immunity after passing bomb
    PASS_FUSE_BONUS: 1.5,       // +1.5s added to fuse on each pass
    PASS_FUSE_CAP: 12.0,        // Capped at 12.0s when receiving pass bonus
    FUSE_4P: 14.0,              // 4+ players: 14.0s starting fuse
    FUSE_3P: 11.0,              // 3 players: 11.0s starting fuse
    FUSE_2P: 20.0,              // 2 players: 20.0s starting fuse in the beginning
    DESPERATION_THRESHOLD: 3.0, // Last 3.0s: rapid 2x ticking tempo and flashing visuals
    INTERMISSION_DELAY: 1.8     // 1.8s dramatic elimination pause before next round
  };

  /* ================= RUNTIME STATE ================= */
  const BOMB_MODE = {
    active: false,
    fuse: 14.0,
    maxFuse: 14.0,
    carrierIdx: -1,             // Index of carrier in match.players
    carrierPlayer: null,
    passImmunity: {},           // Map: player slot or index -> remaining immunity seconds (initial 2.0s)
    lastPasser: -1,
    tickAccumulator: 0,
    lastTickStep: -1,
    state: 'playing',           // 'playing' | 'detonated' | 'game_over'
    detonationT: 0,             // Intermission countdown timer
    detonatedIdx: -1,
    roundNumber: 1,
    winnerIdx: -1,
    bannerText: '',
    bannerSubtext: '',
    bannerT: 0,
    sparks: [],                 // Active fuse spark particles
    shockwaves: [],             // Detonation rings
    flashT: 0,
    tickAlt: false
  };

  /* ================= SAFE FALLBACK HELPERS ================= */
  const _clamp = (v, min, max) => (typeof clamp === 'function' ? clamp(v, min, max) : Math.max(min, Math.min(max, v)));
  const _rand = (a, b) => (typeof rand === 'function' ? rand(a, b) : (b === undefined ? Math.random() * a : a + Math.random() * (b - a)));
  const _hitRect = (a, b) => (typeof hitRect === 'function' ? hitRect(a, b) : (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y));
  const _hitRectInclusive = (a, b) => (typeof hitRectInclusive === 'function' ? hitRectInclusive(a, b) : (a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y));
  const _tagBox = (p) => (typeof tagBox === 'function' ? tagBox(p) : { x: p.x - 5, y: p.y - 5, w: p.w + 10, h: p.h + 10 });
  const _getTime = () => (typeof tGlobal !== 'undefined' ? tGlobal : Date.now() * 0.001);

  function getGlobalCtx() {
    if (typeof g !== 'undefined' && g && g.canvas) return g;
    if (typeof cv !== 'undefined' && cv && cv.getContext) return cv.getContext('2d');
    return null;
  }

  function getGlobalFont(size, weight) {
    if (typeof FN === 'function') return FN(size, weight || 800);
    if (typeof FT === 'function') return FT(size);
    return (weight || 800) + ' ' + size + 'px system-ui, sans-serif';
  }

  function getPlayerCol(p) {
    if (!p) return '#e8433f';
    if (typeof getPlayerColor === 'function') return getPlayerColor(p);
    if (typeof PALETTE !== 'undefined' && PALETTE[p.colIdx]) return PALETTE[p.colIdx].c;
    return p.color || '#e8433f';
  }

  /* Safe sound triggers */
  function playBombTick(isRapid) {
    BOMB_MODE.tickAlt = !BOMB_MODE.tickAlt;
    const f0 = isRapid ? (BOMB_MODE.tickAlt ? 1040 : 1320) : 880;
    const f1 = isRapid ? (BOMB_MODE.tickAlt ? 1200 : 1540) : 960;
    const dur = isRapid ? 0.035 : 0.045;
    const vol = isRapid ? 0.16 : 0.11;

    if (typeof beep === 'function') {
      try {
        beep(f0, f1, dur, 'square', vol);
        return;
      } catch (e) {}
    }
    if (typeof sfx === 'function') {
      try { sfx('tick'); } catch (e) {}
    }
  }

  function playBombPassSfx() {
    if (typeof beep === 'function') {
      try {
        beep(440, 880, 0.12, 'triangle', 0.22);
        beep(880, 1320, 0.10, 'sine', 0.15, 0.03);
      } catch (e) {}
    }
    if (typeof sfx === 'function') {
      try { sfx('tag'); } catch (e) {}
    }
  }

  function playBombExplosionSfx() {
    if (typeof noiseBurst === 'function') {
      try { noiseBurst(0.55, 0.38); } catch (e) {}
    }
    if (typeof beep === 'function') {
      try {
        beep(280, 35, 0.65, 'sawtooth', 0.40);
        beep(140, 30, 0.75, 'sine', 0.35, 0.05);
      } catch (e) {}
    }
    if (typeof sfx === 'function') {
      try { sfx('drop'); } catch (e) {}
    }
  }

  /* ================= CORE GAMEPLAY FUNCTIONS ================= */

  /**
   * Determine starting fuse duration based on active survivor count.
   */
  function calculateStartingFuse(activeCount) {
    if (activeCount >= 4) return BOMB_CONFIG.FUSE_4P; // 14.0s
    if (activeCount === 3) return BOMB_CONFIG.FUSE_3P; // 11.0s
    return BOMB_CONFIG.FUSE_2P;                        // 8.0s (Sudden Death 1v1)
  }

  /**
   * Counts non-eliminated players in the current match.
   */
  function getActiveSurvivors() {
    if (typeof match === 'undefined' || !match || !match.players) return [];
    return match.players.filter(p => !p.isEliminated);
  }

  /**
   * Initializes or resets Bomb Tag Mode.
   * Can be called when the game mode starts or when resetting the round.
   */
  function initBombMode() {
    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    const activeSurvivors = P.filter(p => !p.isEliminated);
    const count = activeSurvivors.length > 0 ? activeSurvivors.length : Math.max(2, P.length);

    BOMB_MODE.active = true;
    BOMB_MODE.maxFuse = calculateStartingFuse(count);
    BOMB_MODE.fuse = BOMB_MODE.maxFuse;
    BOMB_MODE.passImmunity = {};
    BOMB_MODE.lastPasser = -1;
    BOMB_MODE.tickAccumulator = 0;
    BOMB_MODE.lastTickStep = -1;
    BOMB_MODE.state = 'playing';
    BOMB_MODE.detonationT = 0;
    BOMB_MODE.detonatedIdx = -1;
    BOMB_MODE.winnerIdx = -1;
    BOMB_MODE.bannerText = '';
    BOMB_MODE.bannerSubtext = '';
    BOMB_MODE.bannerT = 0;
    BOMB_MODE.sparks.length = 0;
    BOMB_MODE.shockwaves.length = 0;

    // Select initial bomb carrier from living survivors
    if (activeSurvivors.length > 0) {
      const luckySurvivor = activeSurvivors[Math.floor(_rand(activeSurvivors.length))];
      BOMB_MODE.carrierIdx = P.indexOf(luckySurvivor);
      BOMB_MODE.carrierPlayer = luckySurvivor;
    } else if (P.length > 0) {
      BOMB_MODE.carrierIdx = Math.floor(_rand(P.length));
      BOMB_MODE.carrierPlayer = P[BOMB_MODE.carrierIdx];
    } else {
      BOMB_MODE.carrierIdx = 0;
      BOMB_MODE.carrierPlayer = null;
    }

    // Keep match.it synchronized so the general game engine tracks the bomb carrier
    if (typeof match !== 'undefined' && match) {
      match.it = BOMB_MODE.carrierIdx;
      match.cooldown = 0; // Cooldown handled exclusively via passImmunity
      match.timer = BOMB_MODE.fuse;
    }

    if (typeof toast === 'function') {
      const modeLabel = count === 2 ? '⚡ SUDDEN DEATH 1v1 (8s FUSE)!' : `💣 BOMB TAG STARTED! (${BOMB_MODE.fuse.toFixed(0)}s FUSE)`;
      try { toast(modeLabel); } catch (e) {}
    }

    return BOMB_MODE;
  }

  /**
   * Spawns fuse sparks and smoke particles attached to the bomb tip.
   */
  function emitFuseSparks(bx, by, isDesperation) {
    const sparkCount = isDesperation ? 4 : 2;
    for (let i = 0; i < sparkCount; i++) {
      const ang = _rand(Math.PI * 1.1, Math.PI * 1.9); // Upward spray
      const spd = _rand(40, isDesperation ? 180 : 110);
      const spark = {
        x: bx + _rand(-2, 2),
        y: by + _rand(-2, 2),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        grav: 220,
        life: _rand(0.18, 0.40),
        maxLife: 0.40,
        size: _rand(2, isDesperation ? 4.5 : 3.5),
        col: (i % 3 === 0) ? '#ffffff' : ((i % 2 === 0) ? '#ffe066' : '#ff4757')
      };
      BOMB_MODE.sparks.push(spark);

      // Also forward into global engine particle system if available
      if (typeof addP === 'function') {
        try {
          addP({
            x: spark.x,
            y: spark.y,
            vx: spark.vx,
            vy: spark.vy,
            life: spark.life,
            max: spark.maxLife,
            size: spark.size,
            col: spark.col,
            grav: 240,
            shape: 0
          });
        } catch (e) {}
      }
    }

    // Gentle smoke puffs
    if (Math.random() < (isDesperation ? 0.65 : 0.35)) {
      const smoke = {
        x: bx + _rand(-3, 3),
        y: by,
        vx: _rand(-25, 25),
        vy: _rand(-65, -30),
        grav: -30, // Float up
        life: 0.45,
        maxLife: 0.45,
        size: _rand(3, 6),
        col: isDesperation ? 'rgba(255, 100, 100, 0.5)' : 'rgba(200, 200, 210, 0.45)'
      };
      BOMB_MODE.sparks.push(smoke);
    }
  }

  /**
   * Main per-frame update for Bomb Tag mode.
   * Handles fuse countdown, carrier sprint speed, anti-retag timers,
   * ticking tempo audio, spark VFX, and detonation elimination.
   */
  function updateBombMode(dt) {
    if (!BOMB_MODE.active) return;
    const timerDt = (typeof dt === 'number' && dt > 0) ? dt : 1 / 60;
    const stepDt = Math.min(0.1, timerDt);
    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];

    // Update banner fade
    if (BOMB_MODE.bannerT > 0) {
      BOMB_MODE.bannerT -= timerDt;
    }

    // Update fuse sparks
    for (let i = BOMB_MODE.sparks.length - 1; i >= 0; i--) {
      const s = BOMB_MODE.sparks[i];
      s.life -= stepDt;
      if (s.life <= 0) {
        BOMB_MODE.sparks[i] = BOMB_MODE.sparks[BOMB_MODE.sparks.length - 1];
        BOMB_MODE.sparks.pop();
        continue;
      }
      s.x += s.vx * stepDt;
      s.y += s.vy * stepDt;
      s.vy += (s.grav || 0) * stepDt;
    }

    // Update shockwaves
    for (let i = BOMB_MODE.shockwaves.length - 1; i >= 0; i--) {
      const sw = BOMB_MODE.shockwaves[i];
      sw.life -= stepDt;
      if (sw.life <= 0) {
        BOMB_MODE.shockwaves[i] = BOMB_MODE.shockwaves[BOMB_MODE.shockwaves.length - 1];
        BOMB_MODE.shockwaves.pop();
        continue;
      }
      sw.r += sw.growth * stepDt;
    }

    // Update anti-retag immunity timers for all players
    for (const key in BOMB_MODE.passImmunity) {
      BOMB_MODE.passImmunity[key] -= timerDt;
      if (BOMB_MODE.passImmunity[key] <= 0) {
        delete BOMB_MODE.passImmunity[key];
      }
    }

    // If game match is paused or in result state, halt fuse progression
    if (typeof match !== 'undefined' && match) {
      if (match.state === 'paused' || match.state === 'result' || match.state === 'countdown') {
        return;
      }
    }

    // -------------------------------------------------------------
    // STATE: DETONATED INTERMISSION (After player exploded)
    // -------------------------------------------------------------
    if (BOMB_MODE.state === 'detonated') {
      BOMB_MODE.detonationT -= timerDt;
      if (BOMB_MODE.detonationT <= 0) {
        // Intermission complete: evaluate survivors
        const aliveSurvivors = getActiveSurvivors();
        if (aliveSurvivors.length <= 1) {
          // Exactly 1 winner! Declare victory!
          BOMB_MODE.state = 'game_over';
          BOMB_MODE.winnerIdx = aliveSurvivors.length === 1 ? P.indexOf(aliveSurvivors[0]) : 0;
          if (typeof match !== 'undefined' && match) {
            match.state = 'result';
            match.result = {
              winner: BOMB_MODE.winnerIdx,
              loser: BOMB_MODE.detonatedIdx,
              mode: 'bomb',
              reason: 'last_survivor'
            };
            match.resultT = 0;
          }
          if (typeof confetti === 'function') {
            try { confetti(); } catch (e) {}
          }
          if (typeof sfx === 'function') {
            try { sfx('win'); } catch (e) {}
          }
          if (typeof toast === 'function') {
            try { toast(`🏆 PLAYER ${BOMB_MODE.winnerIdx + 1} WINS BOMB TAG! 🏆`); } catch (e) {}
          }
          return;
        }

        // 2+ survivors remain: start next round!
        BOMB_MODE.roundNumber++;
        const nextFuse = calculateStartingFuse(aliveSurvivors.length);
        BOMB_MODE.maxFuse = nextFuse;
        BOMB_MODE.fuse = nextFuse;
        BOMB_MODE.passImmunity = {};
        BOMB_MODE.lastPasser = -1;
        BOMB_MODE.state = 'playing';

        // Select a new random carrier from living survivors
        const nextCarrier = aliveSurvivors[Math.floor(_rand(aliveSurvivors.length))];
        BOMB_MODE.carrierIdx = P.indexOf(nextCarrier);
        BOMB_MODE.carrierPlayer = nextCarrier;

        if (typeof match !== 'undefined' && match) {
          match.it = BOMB_MODE.carrierIdx;
          match.timer = BOMB_MODE.fuse;
        }

        if (typeof sfx === 'function') {
          try { sfx('go'); } catch (e) {}
        }
        if (typeof toast === 'function') {
          const sdNotice = aliveSurvivors.length === 2 ? ' [⚡ SUDDEN DEATH!]' : '';
          try { toast(`ROUND ${BOMB_MODE.roundNumber}! ${aliveSurvivors.length} PLAYERS REMAIN${sdNotice}`); } catch (e) {}
        }
      }
      return;
    }

    if (BOMB_MODE.state !== 'playing') return;

    // -------------------------------------------------------------
    // STATE: ACTIVE PLAYING
    // -------------------------------------------------------------

    // Ensure valid bomb carrier
    if (BOMB_MODE.carrierIdx < 0 || BOMB_MODE.carrierIdx >= P.length || (P[BOMB_MODE.carrierIdx] && P[BOMB_MODE.carrierIdx].isEliminated)) {
      const alive = getActiveSurvivors();
      if (alive.length > 0) {
        const nextCarrier = alive[Math.floor(_rand(alive.length))];
        BOMB_MODE.carrierIdx = P.indexOf(nextCarrier);
        BOMB_MODE.carrierPlayer = nextCarrier;
      } else {
        return;
      }
    }

    const carrier = P[BOMB_MODE.carrierIdx];
    BOMB_MODE.carrierPlayer = carrier;

    // Sync match.it and match.timer for UI consistency
    if (typeof match !== 'undefined' && match) {
      match.it = BOMB_MODE.carrierIdx;
      match.timer = BOMB_MODE.fuse;
    }

    // 1. CARRIER SPRINT SPEED BALANCING:
    // Carrier gets +12% speed ($565 px/s).
    // Per user design update: NO extra desperation speed burst in final 3s. Carrier stays 565 px/s.
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (p.isEliminated) continue;
      const isCarrier = (i === BOMB_MODE.carrierIdx);
      const targetMax = isCarrier ? BOMB_CONFIG.SPEED_CARRIER : BOMB_CONFIG.SPEED_RUNNER;

      // Allow carrier to sprint up to 565 px/s without artificial dampening
      if (isCarrier && Math.abs(p.vx) > BOMB_CONFIG.SPEED_RUNNER && Math.abs(p.vx) <= targetMax) {
        // Speed legitimately in carrier sprint range
      } else if (!isCarrier && Math.abs(p.vx) > targetMax && (!p.padOn)) {
        // Softly clamp non-carrier runners back to 504 px/s
        p.vx = Math.sign(p.vx) * (targetMax + (Math.abs(p.vx) - targetMax) * Math.max(0, 1 - stepDt * 10));
      }
    }

    // 2. FUSE COUNTDOWN:
    BOMB_MODE.fuse = Math.max(0, BOMB_MODE.fuse - timerDt);
    const isDesperation = (BOMB_MODE.fuse < BOMB_CONFIG.DESPERATION_THRESHOLD);

    // 3. FUSE SPARK EMISSION:
    if (carrier) {
      const bombHeadX = carrier.x + carrier.w / 2;
      const bombHeadY = carrier.y - 20;
      emitFuseSparks(bombHeadX + 6, bombHeadY - 10, isDesperation);
    }

    // 4. TICKING SOUND TEMPO:
    // Normal rate (fuse >= 3s): ticks once every 1.0 second.
    // Desperation rate (fuse < 3s): ticks at 2x rate (every 0.5s) with rising urgency!
    const tickStep = isDesperation ? Math.floor(BOMB_MODE.fuse * 2.0) : Math.floor(BOMB_MODE.fuse);
    if (tickStep !== BOMB_MODE.lastTickStep && BOMB_MODE.fuse > 0.05) {
      BOMB_MODE.lastTickStep = tickStep;
      playBombTick(isDesperation);
    }

    // 5. DETONATION AT 0.0s: BOOM!
    if (BOMB_MODE.fuse <= 0) {
      detonateBombHolder();
    }
  }

  /**
   * Detonates the bomb carrier at 0.0s fuse:
   * Carrier explodes into confetti, eliminated, heavy screenshake, sound FX.
   */
  function detonateBombHolder() {
    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    const victimIdx = BOMB_MODE.carrierIdx;
    const victim = P[victimIdx];

    if (!victim || victim.isEliminated) return;

    // Eliminate victim
    victim.isEliminated = true;
    victim.vx = 0;
    victim.vy = 0;

    BOMB_MODE.detonatedIdx = victimIdx;
    BOMB_MODE.state = 'detonated';
    BOMB_MODE.detonationT = BOMB_CONFIG.INTERMISSION_DELAY;

    const popX = victim.x + victim.w / 2;
    const popY = victim.y + victim.h / 2;

    // Visual Explosion: Confetti and Colorful Particle Blast
    spawnExplosionEffects(popX, popY);

    // Heavy Screen Shake and Flash
    if (typeof match !== 'undefined' && match) {
      match.shake = 34; // Strong visceral screen shake
      match.flash = 0.38;
      match.freeze = 0.12; // 120ms dramatic hit-stop impact
      match.tagPop = {
        x: popX,
        y: popY,
        t: 0.9,
        who: victimIdx,
        label: '💥 BOOM! 💥'
      };
    }

    // Explosion Audio
    playBombExplosionSfx();

    // Check living survivors count
    const remainingSurvivors = getActiveSurvivors();
    BOMB_MODE.bannerText = `💥 PLAYER ${victimIdx + 1} DETONATED! 💥`;
    BOMB_MODE.bannerSubtext = remainingSurvivors.length <= 1
      ? 'CHAMPION DECIDED!'
      : `${remainingSurvivors.length} PLAYERS REMAIN!`;
    BOMB_MODE.bannerT = BOMB_CONFIG.INTERMISSION_DELAY;

    if (typeof toast === 'function') {
      try { toast(BOMB_MODE.bannerText); } catch (e) {}
    }
  }

  /**
   * Spawns rich explosion particles, shockwaves, fireballs, and confetti.
   */
  function spawnExplosionEffects(x, y) {
    // 1. Expanding Shockwave Ring
    BOMB_MODE.shockwaves.push({
      x: x,
      y: y,
      r: 12,
      growth: 320,
      life: 0.45,
      maxLife: 0.45,
      col: '#ffcf3f'
    });
    BOMB_MODE.shockwaves.push({
      x: x,
      y: y,
      r: 6,
      growth: 220,
      life: 0.35,
      maxLife: 0.35,
      col: '#ef4444'
    });

    // 2. Confetti Blast (70+ rotating confetti particles)
    const confettiColors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#9b59b6', '#ffffff', '#ffd32a'];
    for (let i = 0; i < 75; i++) {
      const ang = _rand(0, Math.PI * 2);
      const spd = _rand(140, 520);
      const conf = {
        x: x + _rand(-10, 10),
        y: y + _rand(-10, 10),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - _rand(40, 180),
        grav: 620,
        life: _rand(1.2, 2.4),
        maxLife: 2.4,
        size: _rand(5, 9),
        shape: 1, // Rectangular confetti flake
        rot: _rand(0, Math.PI * 2),
        vr: _rand(-8, 8),
        col: confettiColors[i % confettiColors.length]
      };
      if (typeof addP === 'function') {
        try { addP(conf); } catch (e) {}
      }
    }

    // 3. Fiery Explosion Sparks & Smoke
    for (let i = 0; i < 40; i++) {
      const ang = _rand(0, Math.PI * 2);
      const spd = _rand(90, 420);
      const spark = {
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        grav: 480,
        life: _rand(0.3, 0.7),
        maxLife: 0.7,
        size: _rand(4, 8),
        col: (i % 2 === 0) ? '#ff4757' : '#ffd32a'
      };
      if (typeof addP === 'function') {
        try { addP(spark); } catch (e) {}
      }
    }

    // 4. Ring burst if engine has ringP
    if (typeof ringP === 'function') {
      try {
        ringP(x, y, '#ff4757');
        ringP(x, y, '#ffd32a');
      } catch (e) {}
    }
  }

  /**
   * Collision check and bomb pass handler.
   * Transfers bomb to receiver, applies 2.0s anti-retag shield to passer,
   * adds +1.5s fuse bonus (capped at 12s), and triggers audio/visual feedback.
   */
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

      // Anti-Re-Tag Shield check: Player with active shield CANNOT receive the bomb!
      const runnerImmunity = BOMB_MODE.passImmunity[runner.slot != null ? runner.slot : j] || 0;
      if (runnerImmunity > 0) continue;

      const runnerBox = _tagBox(runner);

      // Check collision
      if (_hitRectInclusive(carrierBox, runnerBox)) {
        // Tag Collision confirmed! Perform the Pass:
        const oldCarrierIdx = BOMB_MODE.carrierIdx;
        const newCarrierIdx = j;

        // 1. Anti-Re-Tag Shield: Passer gets EXACTLY 2.0s immunity!
        const passerKey = carrier.slot != null ? carrier.slot : oldCarrierIdx;
        BOMB_MODE.passImmunity[passerKey] = BOMB_CONFIG.ANTI_RETAG_DURATION; // 2.0 seconds
        BOMB_MODE.lastPasser = oldCarrierIdx;

        // 2. Transfer bomb to runner
        BOMB_MODE.carrierIdx = newCarrierIdx;
        BOMB_MODE.carrierPlayer = runner;
        if (typeof match !== 'undefined' && match) {
          match.it = newCarrierIdx;
          if (match.tags) {
            match.tags[newCarrierIdx] = (match.tags[newCarrierIdx] || 0) + 1;
          }
        }

        // 3. Fuse Extension on Pass: +1.5s (capped at 12.0s)
        // If fuse is already > 12s (e.g. 13s right at start), do not penalize down to 12s
        BOMB_MODE.fuse = Math.max(BOMB_MODE.fuse, Math.min(BOMB_CONFIG.PASS_FUSE_CAP, BOMB_MODE.fuse + BOMB_CONFIG.PASS_FUSE_BONUS));
        if (typeof match !== 'undefined' && match) {
          match.timer = BOMB_MODE.fuse;
        }

        // 4. Audio/Visual feedback
        const popX = (carrier.x + runner.x) / 2 + 23;
        const popY = (carrier.y + runner.y) / 2 + 10;

        playBombPassSfx();

        if (typeof match !== 'undefined' && match) {
          match.freeze = 0.06; // Snappy 60ms hit-stop
          match.shake = 9;
          match.flash = 0.14;
          match.tagPop = {
            x: popX,
            y: popY,
            t: 0.55,
            label: 'PASSED! +1.5s'
          };
        }

        if (typeof tagBurst === 'function') {
          try { tagBurst(popX, popY, '#ffd32a', '#ff4757'); } catch (e) {}
        }

        if (typeof toast === 'function') {
          try { toast(`💣 PASSED TO P${newCarrierIdx + 1}! (+1.5s FUSE)`); } catch (e) {}
        }

        return; // Only one tag pass per frame
      }
    }
  }

  /* ================= RENDERING & UI FUNCTIONS ================= */

  /**
   * Draws the prominent Bomb HUD countdown timer, danger colors,
   * active survivor roster, and Sudden Death indicators.
   */
  function drawBombUI() {
    if (!BOMB_MODE.active) return;
    const ctx = getGlobalCtx();
    if (!ctx) return;

    const screenW = (typeof CW !== 'undefined') ? CW : (ctx.canvas ? ctx.canvas.width : 1280);
    const screenH = (typeof CH !== 'undefined') ? CH : (ctx.canvas ? ctx.canvas.height : 720);
    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    const t = _getTime();

    ctx.save();

    // -------------------------------------------------------------
    // 1. TOP-CENTER BOMB TIMER WIDGET
    // -------------------------------------------------------------
    const isDesperation = (BOMB_MODE.fuse < BOMB_CONFIG.DESPERATION_THRESHOLD && BOMB_MODE.state === 'playing');
    const isWarning = (BOMB_MODE.fuse < 6.0 && !isDesperation);
    const hudW = Math.min(240, screenW * 0.34);
    const hudH = 50;
    const hudX = screenW / 2 - hudW / 2;
    const hudY = 10;

    // Glowing border & background based on danger level
    let borderColor = '#f59e0b';
    let bgColor = 'rgba(20, 26, 38, 0.94)';
    let textColor = '#ffffff';

    if (isDesperation) {
      // Rapid flashing white and bright red (24 Hz strobe)
      const flashStrobe = Math.sin(t * 24) > 0;
      borderColor = flashStrobe ? '#ffffff' : '#ff0033';
      bgColor = flashStrobe ? 'rgba(220, 20, 40, 0.96)' : 'rgba(30, 10, 16, 0.96)';
      textColor = flashStrobe ? '#ffffff' : '#ffdddd';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 18;
    } else if (isWarning) {
      borderColor = '#ef4444';
      bgColor = 'rgba(40, 18, 24, 0.94)';
      textColor = '#ffe5e5';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    }

    // Outer rounded container
    if (typeof rr === 'function') {
      rr(ctx, hudX, hudY, hudW, hudH, 12);
    } else {
      ctx.beginPath();
      ctx.rect(hudX, hudY, hudW, hudH);
    }
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = isDesperation ? 3.5 : 2.5;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // Progress Bar along bottom of HUD pill
    const fuseFraction = _clamp(BOMB_MODE.fuse / Math.max(0.1, BOMB_MODE.maxFuse), 0, 1);
    const barPad = 6;
    const barW = (hudW - barPad * 2) * fuseFraction;
    const barH = 4;
    const barY = hudY + hudH - barH - 4;

    ctx.fillStyle = isDesperation ? '#ffffff' : (isWarning ? '#ef4444' : '#f59e0b');
    ctx.fillRect(hudX + barPad, barY, barW, barH);

    // Animated Bomb Icon inside HUD
    const iconX = hudX + 28;
    const iconY = hudY + hudH / 2 - 2;
    drawMiniBombIcon(ctx, iconX, iconY, isDesperation, t);

    // Large Digits Fuse Readout: e.g. "7.4s"
    const fuseString = BOMB_MODE.fuse <= 0 ? 'BOOM!' : (BOMB_MODE.fuse.toFixed(1) + 's');
    ctx.font = getGlobalFont(26, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dark text outline for maximum legibility
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#10141e';
    ctx.strokeText(fuseString, hudX + hudW / 2 + 16, hudY + hudH / 2 - 1);
    ctx.fillStyle = textColor;
    ctx.fillText(fuseString, hudX + hudW / 2 + 16, hudY + hudH / 2 - 1);

    // -------------------------------------------------------------
    // 2. SUDDEN DEATH / MODE BADGE
    // -------------------------------------------------------------
    const livingCount = getActiveSurvivors().length;
    if (livingCount === 2 && BOMB_MODE.state === 'playing') {
      const badgeText = '⚡ SUDDEN DEATH 1v1 ⚡';
      const badgeW = 160;
      const badgeH = 18;
      const badgeX = screenW / 2 - badgeW / 2;
      const badgeY = hudY + hudH + 4;

      if (typeof rr === 'function') rr(ctx, badgeX, badgeY, badgeW, badgeH, 6);
      else ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.92)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.font = getGlobalFont(10, 900);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, screenW / 2, badgeY + badgeH / 2 + 1);
    }

    // -------------------------------------------------------------
    // 3. ACTIVE SURVIVOR ROSTER PILLS (Left side)
    // -------------------------------------------------------------
    const pillH = P.length > 4 ? 22 : 26;
    const pillGap = P.length > 4 ? 25 : 30;

    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const y = 10 + i * pillGap;
      const isCarrier = (i === BOMB_MODE.carrierIdx && !p.isEliminated);
      const isDead = p.isEliminated;

      ctx.save();
      ctx.globalAlpha = isDead ? 0.35 : (isCarrier ? 1.0 : 0.85);

      const pillBg = isCarrier ? 'rgba(239, 68, 68, 0.92)' : (isDead ? 'rgba(20, 24, 32, 0.65)' : 'rgba(20, 28, 42, 0.85)');
      const pillBorder = isCarrier ? '#ffffff' : (isDead ? '#334155' : '#475569');
      const pillW = isCarrier ? 134 : 108;

      if (typeof rr === 'function') rr(ctx, 10, y, pillW, pillH, 8);
      else ctx.rect(10, y, pillW, pillH);
      ctx.fillStyle = pillBg;
      ctx.fill();
      ctx.lineWidth = isCarrier ? 2.5 : 1.5;
      ctx.strokeStyle = pillBorder;
      ctx.stroke();

      // Color swatch
      ctx.fillStyle = getPlayerCol(p);
      if (typeof rr === 'function') rr(ctx, 14, y + (pillH - 14) / 2, 14, 14, 3);
      else ctx.fillRect(14, y + (pillH - 14) / 2, 14, 14);

      // Label
      let pLabel = `P${p.slot != null ? p.slot + 1 : i + 1}`;
      if (isDead) pLabel += ' 💀';
      else if (isCarrier) pLabel += ' 💣 BOMB';

      ctx.font = getGlobalFont(P.length > 4 ? 10 : 11, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = isCarrier ? '#ffffff' : (isDead ? '#94a3b8' : '#ffffff');
      ctx.fillText(pLabel, 34, y + pillH / 2 + 1);

      ctx.restore();
    }

    // -------------------------------------------------------------
    // 4. DETONATION INTERMISSION BANNER
    // -------------------------------------------------------------
    if (BOMB_MODE.bannerT > 0 && BOMB_MODE.bannerText) {
      const bannerW = Math.min(480, screenW - 40);
      const bannerH = 74;
      const bx = screenW / 2 - bannerW / 2;
      const by = screenH * 0.28;

      ctx.save();
      const alpha = _clamp(BOMB_MODE.bannerT / 0.3, 0, 1);
      ctx.globalAlpha = alpha;

      if (typeof rr === 'function') rr(ctx, bx, by, bannerW, bannerH, 16);
      else ctx.rect(bx, by, bannerW, bannerH);
      ctx.fillStyle = 'rgba(15, 20, 30, 0.95)';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();

      ctx.font = getGlobalFont(24, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff4757';
      ctx.fillText(BOMB_MODE.bannerText, screenW / 2, by + 26);

      ctx.font = getGlobalFont(14, 800);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(BOMB_MODE.bannerSubtext, screenW / 2, by + 52);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Helper to draw a stylized mini bomb icon with a live spark inside the HUD.
   */
  function drawMiniBombIcon(ctx, x, y, isDesp, t) {
    ctx.save();
    ctx.translate(x, y);

    // Bomb body
    ctx.beginPath();
    ctx.arc(0, 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = isDesp ? (Math.sin(t * 24) > 0 ? '#ffffff' : '#22222b') : '#1e232e';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = isDesp ? '#ff0033' : '#ffffff';
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(-3, -1, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // Fuse cap & line
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -8, 4, 3);

    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(4, -13, 8, -12);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Spark star
    const sparkColor = (Math.sin(t * 30) > 0) ? '#ffffff' : '#ffd32a';
    ctx.beginPath();
    ctx.arc(8, -12, isDesp ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = sparkColor;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws Bomb Tag player visuals:
   * - Animated round cartoon bomb on the carrier's head with smoking spark fuse
   * - Floating countdown timer badge right above the bomb
   * - Glowing Anti-Re-Tag Shield dome on players with immunity (2.0s duration)
   */
  function drawBombPlayer(p) {
    if (!BOMB_MODE.active || !p || p.isEliminated) return;
    const ctx = getGlobalCtx();
    if (!ctx) return;

    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    const pIdx = P.indexOf(p);
    const isCarrier = (pIdx === BOMB_MODE.carrierIdx);
    const immunityKey = p.slot != null ? p.slot : pIdx;
    const immunityTime = BOMB_MODE.passImmunity[immunityKey] || 0;
    const t = _getTime();

    // -------------------------------------------------------------
    // A. ANTI-RE-TAG SHIELD DOME (2.0s immunity)
    // -------------------------------------------------------------
    if (immunityTime > 0) {
      ctx.save();
      const shieldPulse = 0.85 + 0.15 * Math.sin(t * 12 + pIdx);
      const shieldR = p.w * 0.85 * shieldPulse;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;

      // Outer forcefield glow
      ctx.beginPath();
      ctx.arc(cx, cy, shieldR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.stroke();

      // Hexagonal accent lines
      ctx.beginPath();
      ctx.arc(cx, cy, shieldR - 4, -0.6, 0.6);
      ctx.arc(cx, cy, shieldR - 4, Math.PI - 0.6, Math.PI + 0.6);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Shield remaining text
      const shieldLabel = `🛡️ SHIELD (${immunityTime.toFixed(1)}s)`;
      ctx.font = getGlobalFont(9.5, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0a101d';
      ctx.strokeText(shieldLabel, cx, p.y + p.h + 14);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(shieldLabel, cx, p.y + p.h + 14);

      ctx.restore();
    }

    // -------------------------------------------------------------
    // B. ANIMATED BOMB ON CARRIER'S HEAD
    // -------------------------------------------------------------
    if (isCarrier) {
      ctx.save();
      const cx = p.x + p.w / 2;
      const cy = p.y - 12; // Resting on player head
      const isDesp = (BOMB_MODE.fuse < BOMB_CONFIG.DESPERATION_THRESHOLD && BOMB_MODE.state === 'playing');
      const tilt = _clamp((p.vx || 0) * 0.0003, -0.22, 0.22);
      const bob = Math.sin(t * 10) * 2;

      ctx.translate(cx, cy + bob);
      ctx.rotate(tilt);

      // Desperation Aura when fuse < 3.0s
      if (isDesp) {
        const auraPulse = 0.4 + 0.3 * Math.sin(t * 24);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${auraPulse.toFixed(2)})`;
        ctx.fill();
      }

      // Bomb Sphere Body
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);

      // Desperation white/red flashing body
      if (isDesp) {
        const strobe = Math.sin(t * 24) > 0;
        ctx.fillStyle = strobe ? '#ffffff' : '#d90429';
      } else {
        const bombGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
        bombGrad.addColorStop(0, '#3a3d4d');
        bombGrad.addColorStop(0.7, '#1b1d24');
        bombGrad.addColorStop(1, '#0c0d12');
        ctx.fillStyle = bombGrad;
      }
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isDesp ? '#ffffff' : '#141414';
      ctx.stroke();

      // Specular highlight gleam
      if (!isDesp) {
        ctx.beginPath();
        ctx.arc(-4, -4, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();
      }

      // Metallic Neck Cap
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-3, -16, 6, 4);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(-3, -16, 6, 4);

      // Burning Fuse Rope (Length shortens as fuse burns)
      const fuseBurnRatio = _clamp(BOMB_MODE.fuse / Math.max(0.1, BOMB_MODE.maxFuse), 0.15, 1.0);
      const fuseTipX = 6 + fuseBurnRatio * 8;
      const fuseTipY = -18 - fuseBurnRatio * 6;

      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(3, -24, fuseTipX, fuseTipY);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#d97706';
      ctx.stroke();

      // Sizzling Fuse Spark Star at the burning tip
      const sparkColor = (Math.sin(t * 28) > 0) ? '#ffffff' : ((Math.sin(t * 14) > 0) ? '#ffd32a' : '#ff4757');
      const sparkRadius = isDesp ? 6 : 4;

      ctx.beginPath();
      ctx.arc(fuseTipX, fuseTipY, sparkRadius, 0, Math.PI * 2);
      ctx.fillStyle = sparkColor;
      ctx.fill();

      // Spark cross starburst rays
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = sparkColor;
      ctx.beginPath();
      ctx.moveTo(fuseTipX - sparkRadius * 1.5, fuseTipY);
      ctx.lineTo(fuseTipX + sparkRadius * 1.5, fuseTipY);
      ctx.moveTo(fuseTipX, fuseTipY - sparkRadius * 1.5);
      ctx.lineTo(fuseTipX, fuseTipY + sparkRadius * 1.5);
      ctx.stroke();

      ctx.restore(); // Restore bomb coordinate transform

      // -------------------------------------------------------------
      // C. FLOATING COUNTDOWN TIMER OVER CARRIER
      // -------------------------------------------------------------
      ctx.save();
      const timerY = p.y - 48 + bob;
      const timerText = BOMB_MODE.fuse <= 0 ? '💥 BOOM!' : (BOMB_MODE.fuse.toFixed(1) + 's');
      const isCritical = (BOMB_MODE.fuse < BOMB_CONFIG.DESPERATION_THRESHOLD);

      // Pill container
      const tw = isCritical ? 64 : 54;
      const th = 22;
      const tx = cx - tw / 2;

      if (typeof rr === 'function') rr(ctx, tx, timerY - th / 2, tw, th, 8);
      else ctx.rect(tx, timerY - th / 2, tw, th);

      ctx.fillStyle = isCritical ? (Math.sin(t * 24) > 0 ? '#ff0033' : '#1e1014') : 'rgba(20, 26, 38, 0.92)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isCritical ? '#ffffff' : '#f59e0b';
      ctx.stroke();

      ctx.font = getGlobalFont(12, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(timerText, cx, timerY + 1);

      ctx.restore();
    }
  }

  /* ================= BOT AI INTEGRATION ================= */

  /**
   * Intelligent Bomb Tag AI:
   * - If Carrier: High-aggression sprint toward nearest eligible runner,
   *   intercepts via lead-aiming, uses speed/boost pads and apex double jumps.
   * - If Runner: Survival scatter AI away from bomb carrier, zones opposing platform
   *   tiers, avoids perimeter wall pins, and jukes on drop platforms.
   *
   * @param {Object} p - The bot player object
   * @param {number} dt - Step delta time
   * @returns {Object} Input state { dir, jumpEdge, jumpHeld, downHeld }
   */
  function bombBotThink(p, dt) {
    if (!p || p.isEliminated || p.isFrozen) {
      return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
    }

    const P = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    const pIdx = P.indexOf(p);
    const isCarrier = (pIdx === BOMB_MODE.carrierIdx);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const solids = (typeof SOLIDS !== 'undefined' && Array.isArray(SOLIDS)) ? SOLIDS : [];

    let wantDir = 0;
    let wantJumpEdge = false;
    let wantJumpHeld = false;
    let wantDown = false;

    // -------------------------------------------------------------
    // CASE 1: BOT IS THE BOMB CARRIER (High-Aggression Pursuit)
    // -------------------------------------------------------------
    if (isCarrier) {
      // 1. Target Selection: Find the closest non-eliminated runner WITHOUT anti-retag shield
      let bestTarget = null;
      let minScore = 1e12;

      for (let j = 0; j < P.length; j++) {
        if (j === pIdx) continue;
        const o = P[j];
        if (!o || o.isEliminated) continue;

        // Skip runners with active anti-retag shield
        const immKey = o.slot != null ? o.slot : j;
        if ((BOMB_MODE.passImmunity[immKey] || 0) > 0) continue;

        const ox = o.x + o.w / 2;
        const oy = o.y + o.h / 2;
        const distSq = (ox - cx) ** 2 + (oy - cy) ** 2;

        // Give preference to runners on the same horizontal platform tier
        const tierPenalty = Math.abs(oy - cy) * 1.5;
        const totalScore = Math.sqrt(distSq) + tierPenalty;

        if (totalScore < minScore) {
          minScore = totalScore;
          bestTarget = o;
        }
      }

      // If all living runners have shields, hold center lane instead of
      // wasting the chase into immunity (shields expire in <=2s).
      if (!bestTarget) {
        const arenaW = (typeof W !== 'undefined') ? W : 2400;
        wantDir = (cx < arenaW / 2) ? 1 : -1;
        return {
          dir: wantDir,
          jumpEdge: false,
          jumpHeld: wantJumpHeld || false,
          downHeld: false
        };
      }

      if (bestTarget) {
        const tx = bestTarget.x + bestTarget.w / 2;
        const ty = bestTarget.y + bestTarget.h / 2;
        const dx = tx - cx;
        const dy = ty - cy;

        // Predictive Lead-Aiming: Carrier sprints at 565 px/s
        const dist = Math.hypot(dx, dy);
        const leadT = _clamp(dist / BOMB_CONFIG.SPEED_CARRIER, 0.08, 0.32);
        const predictedTx = tx + _clamp((bestTarget.vx || 0) * leadT, -240, 240);
        wantDir = Math.abs(predictedTx - cx) > 10 ? Math.sign(predictedTx - cx) : Math.sign(dx);

        // Platform Navigation:
        // A. Runner is on a HIGHER platform (dy < -40)
        if (dy < -40) {
          if (p.grounded) {
            wantJumpEdge = true;
            wantJumpHeld = true;
          } else if (p.airJumps > 0) {
            // Apex Double Jump Chaining: Trigger near vertical velocity turnaround (-120 < vy < 100)
            const isApexWindow = (p.vy > -120 && p.vy < 100);
            if (isApexWindow) {
              wantJumpEdge = true;
              wantJumpHeld = true;
            }
          } else if (p.sideT > 0 && p.wallJumps < 2) {
            // Wall-jump off vertical walls to climb higher
            wantJumpEdge = true;
            wantJumpHeld = true;
          }
        }

        // B. Runner is on a LOWER platform (dy > 50)
        if (dy > 50) {
          // Check if standing on drop-through pink platform
          let onDrop = false;
          if (typeof botFullyOnDrop === 'function') {
            onDrop = !!botFullyOnDrop(p);
          } else if (p.grounded && p.gp && p.gp.t === 'drop') {
            onDrop = true;
          }

          if (onDrop) {
            wantDown = true;
            wantJumpEdge = false;
          }
        }

        // C. Blue Boost Pad Jump: If standing on or crossing boost pad, jump for 1.31x launch
        const onBoost = p.grounded && (typeof zoneAtFeet === 'function' && zoneAtFeet(p, 'boost'));
        if (onBoost && dy < -20) {
          wantJumpEdge = true;
          wantJumpHeld = true;
        }

        // D. Close Quarters Finishing Leap:
        if (dist < 75 && dy < -15 && (p.grounded || p.airJumps > 0)) {
          wantJumpEdge = true;
        }
      } else {
        wantDir = p.face || 1;
      }
    }

    // -------------------------------------------------------------
    // CASE 2: BOT IS A RUNNER (Survival & Opposing Tier Scatter)
    // -------------------------------------------------------------
    else {
      const carrier = P[BOMB_MODE.carrierIdx];
      if (carrier && !carrier.isEliminated) {
        const kx = carrier.x + carrier.w / 2;
        const ky = carrier.y + carrier.h / 2;
        const dx = kx - cx;
        const dy = ky - cy;
        const dist = Math.hypot(dx, dy);

        // Flee in opposite direction from carrier
        wantDir = dx > 0 ? -1 : 1;

        // Anti-Cornering: If trapped against arena perimeter wall while carrier approaches
        const worldW = (typeof W !== 'undefined') ? W : 2400;
        const wallW = (typeof WALL !== 'undefined') ? WALL : 60;
        const nearLeftWall = (p.x <= wallW + 110 && dx < 0);
        const nearRightWall = (p.x + p.w >= worldW - wallW - 110 && dx > 0);

        if ((nearLeftWall || nearRightWall) && dist < 320) {
          // Overhead Flank: Jump and double-jump over approaching carrier
          if (p.grounded) {
            wantJumpEdge = true;
            wantJumpHeld = true;
          } else if (p.airJumps > 0 && p.vy > -50) {
            wantJumpEdge = true;
            wantJumpHeld = true;
            wantDir = -wantDir; // Flip direction to clear over carrier
          } else if (p.sideT > 0) {
            // Wall-jump off outer wall
            wantJumpEdge = true;
            wantJumpHeld = true;
            wantDir = nearLeftWall ? 1 : -1;
          }
        }

        // Tier Scattering:
        // If carrier is on the SAME or LOWER tier (dy >= -20), climb up to higher tiers!
        if (dy >= -20 && dist < 420) {
          if (p.grounded) {
            wantJumpEdge = true;
            wantJumpHeld = true;
          } else if (p.airJumps > 0 && p.vy > -100 && p.vy < 120) {
            wantJumpEdge = true;
            wantJumpHeld = true;
          }
        }

        // Drop Platform Juke: If running over pink drop platform and carrier is right behind
        if (dist < 180 && Math.abs(dy) < 60) {
          let onDrop = false;
          if (typeof botFullyOnDrop === 'function') onDrop = !!botFullyOnDrop(p);
          else if (p.grounded && p.gp && p.gp.t === 'drop') onDrop = true;

          if (onDrop) {
            wantDown = true; // Drop through to evade
          }
        }
      } else {
        // Safe wandering
        wantDir = 0;
      }
    }

    return {
      dir: wantDir,
      jumpEdge: wantJumpEdge,
      jumpHeld: wantJumpHeld || wantJumpEdge,
      downHeld: wantDown
    };
  }

  /* ================= EXPORT MODULE API ================= */
  const ModeBomb = {
    CONFIG: BOMB_CONFIG,
    STATE: BOMB_MODE,
    initBombMode: initBombMode,
    updateBombMode: updateBombMode,
    checkBombTag: checkBombTag,
    drawBombUI: drawBombUI,
    drawBombPlayer: drawBombPlayer,
    bombBotThink: bombBotThink,
    getActiveSurvivors: getActiveSurvivors,
    calculateStartingFuse: calculateStartingFuse
  };

  // Attach to global window scope in browser
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

  // CommonJS export for Node testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModeBomb;
  }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
