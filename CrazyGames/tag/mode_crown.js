/**
 * ============================================================================
 * TAG! - CROWN KING / KING OF THE HILL MODE ('crown')
 * Production-Ready Game Mode Module
 * ============================================================================
 * 
 * Rules & Mechanics:
 *  1. Golden crown hovers atop a central platform at round start.
 *  2. Touching the crown crowns you King!
 *  3. Wearing the crown generates +1 Crown Point every 0.4s (first to 100 pts or highest at time limit wins).
 *  4. Tagging the King knocks the crown onto the attacker's head!
 *  5. 1.2s Steal Immunity Window: When a player takes or steals the crown,
 *     they have 1.2 seconds of complete tag immunity so they can break out
 *     of the pack and prevent instant ping-ponging!
 * 
 * Dynamic Balancing & Rubberbanding:
 *  - Heavy is the Head (The Crown Burden): King moves 5% slower (480 px/s).
 *    Chasers move at normal 504 px/s, or +7% catch-up surge (540 px/s) if trailing King by >30 pts.
 *  - King Fatigue (Anti-Runaway / Streak Penalty): If King holds crown for >15s continuously:
 *    * Emits a radiant golden sky beacon piercing across the map.
 *    * Movement speed drops an additional 4% (460 px/s).
 *  - Underdog Vengeance: If the player currently in last place steals the crown,
 *    they gain "Underdog Vengeance" with double points (+2 pts / 0.4s) for 5 seconds!
 * 
 * Audio / Visual Polish:
 *  - Shimmering golden 5-point crown with ruby, sapphire, and emerald gems + star glints.
 *  - Floating pedestal crown entity on central platform with levitation bob & light rays.
 *  - Golden shockwave explosion and radial spark burst on crown steal.
 *  - Translucent golden aegis energy shield with real-time 1.2s circular countdown arc.
 *  - High-intensity golden sky beacon with rising light rings during King Fatigue.
 *  - Modern racing HUD with player progress bars, King badge, fatigue meter, and 2x vengeance badge.
 * 
 * Bot AI Integration:
 *  - Chaser Bots: 100% focused on hunting King with lead-time intercept trajectories.
 *  - King Bot: Camps high-ground tiers, drops through pink platforms to escape, sprints across speed pads.
 *  - Unowned Crown: All bots rush toward central platform to claim the crown.
 */

(function(root) {
  'use strict';

  /* ==========================================================================
     1. CONSTANTS & CONFIGURATION
     ========================================================================== */
  const CROWN_CONFIG = {
    WIN_POINTS: 100,              // Points required to win immediately
    POINT_INTERVAL: 0.4,          // Time (s) between point ticks
    NORMAL_PTS: 1,                // Standard points per tick
    UNDERDOG_PTS: 2,              // Underdog Vengeance points per tick
    UNDERDOG_DURATION: 5.0,       // Duration (s) of 2x points
    IMMUNITY_DURATION: 1.2,       // Steal immunity window (s)
    FATIGUE_THRESHOLD: 15.0,      // Continuous hold time (s) before fatigue triggers
    SPEED_CHASER_NORMAL: 504,     // Default chaser speed (px/s)
    SPEED_CHASER_BOOST: 540,      // Rubberband boost speed if >30 pts behind (px/s)
    SPEED_KING_HEAVY: 480,        // Normal King speed (5% slower than 504)
    SPEED_KING_FATIGUE: 460,      // Fatigued King speed (additional 4% slower)
    SPEED_PAD_MULT: 1.55,         // Speed multiplier on speed pads
    TAG_COOLDOWN_POST_STEAL: 0.35 // Minor post-steal tag system cooldown
  };

  /* ==========================================================================
     2. MODE STATE
     ========================================================================== */
  const crownState = {
    active: false,
    holder: null,                 // Player object currently wearing the crown (null if unowned)
    holderIndex: -1,             // Index of holder in match.players
    spawnX: 1200,                // Center platform hover anchor X
    spawnY: 540,                 // Center platform hover anchor Y
    x: 1200,                     // Current world X of crown
    y: 540,                      // Current world Y of crown
    w: 38,                       // Crown hit width
    h: 26,                       // Crown hit height
    bobTimer: 0,                 // Levitation sinusoidal counter
    immunityTimer: 0,            // Countdown for 1.2s steal immunity window
    holdTimer: 0,                // Continuous time current King has worn crown (fatigue meter)
    pointTimer: 0,               // Accumulator for 0.4s point ticks
    scores: {},                  // Map of player slot -> points earned
    underdogSlot: -1,            // Slot of player with active Underdog Vengeance
    underdogTimer: 0,            // Time remaining for Underdog Vengeance
    shockwaves: [],              // Active expanding golden shockwave rings
    particles: [],               // Active golden spark & gem glint particles
    floaters: [],                // Floating combat/score texts ("+1", "+2", "IMMUNE!")
    banners: [],                 // World-space dramatic event banners
    beaconAlpha: 0,              // Opacity of golden sky beacon
    targetScore: 100,            // Win score threshold
    pointInterval: 0.4           // Point tick interval
  };

  const CROWN_BOT_ST = {};
  // Live canvas ctx capture. The engine canvas (const g) is NOT a window
  // property, and `const g = ... window.g ...` inside a function self-shadows
  // into TDZ. Capture once here (no shadowing scope) and reuse in render fns.
  function Cctx(fallback){
    try{ if(typeof g !== 'undefined' && g && typeof g.save === 'function') return g; }catch(e){}
    try{ if(typeof window !== 'undefined' && window.renderCtx) return window.renderCtx; }catch(e){}
    try{ if(typeof cv !== 'undefined' && cv && cv.getContext) return cv.getContext('2d'); }catch(e){}
    try{ if(typeof document !== 'undefined'){ const c = document.getElementById('g'); if(c && c.getContext) return c.getContext('2d'); } }catch(e){}
    return fallback || null;
  }
       // Bot AI state storage per slot

  /* ==========================================================================
     3. UTILITY & FALLBACK HELPERS (Environment Agnostic)
     ========================================================================== */
  function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function _hitRect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function _hitRectInclusive(a, b) {
    if (typeof hitRectInclusive === 'function') return hitRectInclusive(a, b);
    return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
  }

  function _tagBox(p) {
    if (typeof tagBox === 'function') return tagBox(p);
    const pad = 5;
    return { x: p.x - pad, y: p.y - pad, w: p.w + 2 * pad, h: p.h + 2 * pad };
  }

  function _sfx(name) {
    try {
      if (typeof sfx === 'function') sfx(name);
    } catch (e) {}
  }

  function _rr(ctx, x, y, w, h, r) {
    if (typeof rr === 'function') { rr(ctx, x, y, w, h, r); return; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function _fn(sz, wt) {
    if (typeof FN === 'function') return FN(sz, wt);
    return (wt || 800) + ' ' + sz + 'px Outfit, Rubik, sans-serif';
  }

  function _ft(sz) {
    if (typeof FT === 'function') return FT(sz);
    return '900 ' + sz + 'px Outfit, Rubik, sans-serif';
  }

  function _txt(ctx, str, x, y, font, col, align, alpha) {
    if (typeof txt === 'function') { txt(str, x, y, font, col, align, alpha); return; }
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.font = font;
    ctx.fillStyle = col;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function _fmtTime(s) {
    if (typeof fmtTime === 'function') return fmtTime(s);
    const m = Math.floor(Math.max(0, s) / 60);
    const sec = Math.floor(Math.max(0, s) % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function _getPlayerColor(p) {
    if (typeof getPlayerColor === 'function') return getPlayerColor(p);
    if (typeof PALETTE !== 'undefined' && PALETTE[p.colIdx]) return PALETTE[p.colIdx].c;
    const defCols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return defCols[(p.slot || 0) % defCols.length];
  }

  function _isBotSlot(p) {
    if (typeof isBotSlot === 'function') return isBotSlot(p);
    if (typeof menu !== 'undefined' && menu.slotIsBot && menu.slotIsBot[p.slot]) return true;
    return false;
  }

  function _zoneAtFeet(p, type) {
    if (typeof zoneAtFeet === 'function') return zoneAtFeet(p, type);
    if (typeof SOLIDS === 'undefined') return null;
    const feet = p.y + p.h;
    for (const s of SOLIDS) {
      if (s.t !== type) continue;
      if (!s.dy) {
        if (feet >= s.y - 6 && feet <= s.y + 18 && p.x + p.w > s.x && p.x < s.x + s.w) return s;
      } else {
        const px = _clamp(p.x + p.w / 2, s.x, s.x + s.w);
        const sy = s.y + (px - s.x) * (s.dy / s.w);
        if (feet >= sy - 8 && feet <= sy + 20) return s;
      }
    }
    return null;
  }

  function _botFullyOnDrop(p) {
    if (typeof botFullyOnDrop === 'function') return botFullyOnDrop(p);
    if (p.grounded && p.gp && p.gp.t === 'drop') {
      if (p.x + 6 >= p.gp.x && p.x + p.w - 6 <= p.gp.x + p.gp.w) return p.gp;
    }
    const z = _zoneAtFeet(p, 'drop');
    if (z && p.x + 6 >= z.x && p.x + p.w - 6 <= z.x + z.w) return z;
    return null;
  }

  /* ==========================================================================
     4. CENTRAL PLATFORM SELECTOR
     ========================================================================== */
  function findCentralPlatform() {
    const solids = (typeof SOLIDS !== 'undefined' && SOLIDS) ? SOLIDS : [];
    const arenaW = (typeof W !== 'undefined') ? W : 2400;
    const arenaH = (typeof H !== 'undefined') ? H : 1320;
    const centerX = arenaW / 2;
    const targetY = arenaH * 0.44; // Preferred elevated perch height

    let bestPlat = null;
    let minScore = 1e9;

    for (const s of solids) {
      // Exclude perimeter walls, death floor, and steep vertical barriers
      if (s.wall || s.h > 80 || s.y >= arenaH - 90 || s.w < 100) continue;

      const px = s.x + s.w / 2;
      const py = s.y;
      const dx = px - centerX;
      const dy = (py - targetY) * 1.35; // Weight vertical centrality
      let score = Math.hypot(dx, dy);

      // Prefer solid platforms and elevated drop-through platforms over speed/boost pads
      if (s.t === 'solid' || s.t === 'drop') score -= 120;
      if (s.t === 'speed' || s.t === 'boost') score += 180;
      if (s.y > arenaH - 250) score += 200; // Penalize near-ground platforms

      if (score < minScore) {
        minScore = score;
        bestPlat = s;
      }
    }

    if (bestPlat) {
      return {
        x: bestPlat.x + bestPlat.w / 2,
        y: bestPlat.y - 36,
        plat: bestPlat
      };
    }

    return { x: centerX, y: targetY, plat: null };
  }

  /* ==========================================================================
     5. CROWN MODE LIFECYCLE: initCrownMode()
     ========================================================================== */
  function initCrownMode() {
    crownState.active = true;
    crownState.holder = null;
    crownState.holderIndex = -1;
    crownState.immunityTimer = 0;
    crownState.holdTimer = 0;
    crownState.pointTimer = 0;
    crownState.scores = {};
    crownState.underdogSlot = -1;
    crownState.underdogTimer = 0;
    crownState.shockwaves = [];
    crownState.particles = [];
    crownState.floaters = [];
    crownState.banners = [];
    crownState.beaconAlpha = 0;
    crownState.targetScore = CROWN_CONFIG.WIN_POINTS;
    crownState.pointInterval = CROWN_CONFIG.POINT_INTERVAL;

    // Reset bot AI memories
    for (const k in CROWN_BOT_ST) delete CROWN_BOT_ST[k];

    // Determine platform anchor
    const anchor = findCentralPlatform();
    crownState.spawnX = anchor.x;
    crownState.spawnY = anchor.y;
    crownState.x = anchor.x;
    crownState.y = anchor.y;
    crownState.bobTimer = 0;

    // Initialize all active player scores
    const players = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    for (const p of players) {
      crownState.scores[p.slot] = 0;
      p.crownPoints = 0;
      p.underdogTimer = 0;
    }

    // Spawn starting sparkle burst at central hover pedestal
    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20;
      const spd = 60 + Math.random() * 120;
      crownState.particles.push({
        x: crownState.x,
        y: crownState.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.8 + Math.random() * 0.6,
        maxLife: 1.4,
        size: 3 + Math.random() * 4,
        col: i % 2 === 0 ? '#ffd700' : '#ffffff',
        shape: 'spark'
      });
    }

    addCrownBanner('👑 CROWN KING: FIRST TO 100 PTS!', crownState.x, crownState.y - 60, '#ffd700', 3.0);
    _sfx('go');
  }

  /* ==========================================================================
     6. DYNAMIC BALANCING & SPEED EVALUATION
     ========================================================================== */
  function getCrownPlayerSpeed(p) {
    if (!p || !crownState || !crownState.active) return CROWN_CONFIG.SPEED_CHASER_NORMAL;

    // 1. King Evaluation
    if (crownState.holder && (crownState.holder === p || crownState.holder.slot === p.slot)) {
      // King Fatigue: held continuously for > 15s
      if (crownState.holdTimer >= CROWN_CONFIG.FATIGUE_THRESHOLD) {
        return CROWN_CONFIG.SPEED_KING_FATIGUE; // 460 px/s
      }
      // Heavy is the Head: standard crown burden
      return CROWN_CONFIG.SPEED_KING_HEAVY;     // 480 px/s
    }

    // 2. Chaser Evaluation & Comeback Surge
    if (crownState.holder) {
      const kingPts = crownState.scores[crownState.holder.slot] || 0;
      const myPts = crownState.scores[p.slot] || 0;
      if (kingPts - myPts > 30) {
        // Trailing by > 30 points: +7% rubberband boost to close the gap!
        return CROWN_CONFIG.SPEED_CHASER_BOOST; // 540 px/s
      }
    }

    return CROWN_CONFIG.SPEED_CHASER_NORMAL;    // 504 px/s
  }

  /* ==========================================================================
     7. CROWN ACQUISITION & STEAL LOGIC
     ========================================================================== */
  function claimCrown(player, isSteal, popX, popY) {
    if (!player || player.isEliminated) return;

    const previousKing = crownState.holder;
    const px = popX !== undefined ? popX : (player.x + player.w / 2);
    const py = popY !== undefined ? popY : (player.y + player.h / 2);

    crownState.holder = player;
    crownState.holderIndex = (typeof match !== 'undefined' && match && match.players)
      ? match.players.indexOf(player) : -1;
    crownState.holdTimer = 0;                // Reset fatigue streak timer
    crownState.immunityTimer = CROWN_CONFIG.IMMUNITY_DURATION; // 1.2s Steal Immunity Window!
    crownState.pointTimer = 0;

    if (typeof match !== 'undefined' && match) {
      match.cooldown = CROWN_CONFIG.TAG_COOLDOWN_POST_STEAL;
      match.it = crownState.holderIndex;     // Sync with main game loop tracking
    }

    // Check Underdog Vengeance condition (strict last-place player steals crown)
    if (isSteal) {
      const players = (typeof match !== 'undefined' && match && match.players) ? match.players : [player];
      let activeScores = players.filter(p => !p.isEliminated).map(p => crownState.scores[p.slot] || 0);
      if (!activeScores.length) activeScores = [crownState.scores[player.slot] || 0];
      const myScore = crownState.scores[player.slot] || 0;

      // Underdog Vengeance triggers only for the STRICT last-place player
      // (tied-for-last does not qualify), when another player leads.
      const isStrictLast = activeScores.every(s => myScore < s);
      if (isStrictLast) {
        crownState.underdogSlot = player.slot;
        crownState.underdogTimer = CROWN_CONFIG.UNDERDOG_DURATION;
        player.underdogTimer = CROWN_CONFIG.UNDERDOG_DURATION;
        addCrownBanner('🔥 UNDERDOG VENGEANCE! (2X PTS FOR 5s)', px, py - 40, '#ff4757', 2.8);
        addPointFloater(px, py - 60, '2X POINTS!', '#ff3838');
        _sfx('win');
      } else {
        addCrownBanner('👑 CROWN STOLEN!', px, py - 35, '#ffd700', 2.0);
        _sfx('tag');
      }

      spawnCrownShockwave(px, py);
    } else {
      // First pickup from central platform
      addCrownBanner('👑 ' + (_isBotSlot(player) ? 'BOT' : ('P' + (player.slot + 1))) + ' IS THE KING!', px, py - 40, '#ffd700', 2.4);
      spawnCrownShockwave(px, py);
      _sfx('win');
    }
  }

  /* ==========================================================================
     8. SHOCKWAVES, FLOATERS & BANNERS FX
     ========================================================================== */
  function spawnCrownShockwave(x, y) {
    crownState.shockwaves.push({
      x: x,
      y: y,
      r: 8,
      maxR: 195,
      speed: 460,
      alpha: 1.0,
      life: 0.44,
      maxLife: 0.44
    });

    // 28 Sparkling golden particle shards bursting outwards
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.35;
      const spd = 160 + Math.random() * 340;
      crownState.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 3.5 + Math.random() * 4.5,
        col: i % 3 === 0 ? '#ffffff' : (i % 2 === 0 ? '#ffd700' : '#ff9f1c'),
        shape: i % 4 === 0 ? 'star' : 'spark',
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 14
      });
    }

    if (typeof match !== 'undefined' && match) {
      match.shake = Math.max(match.shake || 0, 12);
      match.freeze = 0.05;
    }
  }

  function addPointFloater(x, y, text, col) {
    crownState.floaters.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y,
      text: text,
      col: col || '#ffd700',
      life: 0.75,
      maxLife: 0.75,
      scale: 1.4
    });
  }

  function addCrownBanner(text, x, y, col, dur) {
    // Limit active banners to avoid text clutter
    if (crownState.banners.length >= 3) crownState.banners.shift();
    crownState.banners.push({
      text: text,
      x: x,
      y: y,
      col: col || '#ffd700',
      life: dur || 2.2,
      maxLife: dur || 2.2,
      scale: 0.6
    });
  }

  /* ==========================================================================
     9. MATCH VICTORY TRIGGER
     ========================================================================== */
  function triggerCrownWin(winner, reason) {
    if (typeof match === 'undefined' || !match || match.state === 'result') return;

    const winnerIndex = (match.players && winner) ? match.players.indexOf(winner) : 0;
    const winnerSlot = winner ? winner.slot : 0;

    match.result = {
      winner: winnerIndex,
      winnerSlot: winnerSlot,
      mode: 'crown',
      reason: reason || 'score_limit',
      scores: Object.assign({}, crownState.scores)
    };

    if (typeof endMatch === 'function') {
      endMatch();
    } else {
      match.state = 'result';
      _sfx('win');
    }
  }

  /* ==========================================================================
     10. UPDATE TICK: updateCrownMode(dt)
     ========================================================================== */
  function updateCrownMode(dt) {
    if (!crownState.active) return;
    dt = (typeof dt === 'number' && dt > 0) ? Math.min(0.5, dt) : (1 / 60);

    // Cooldown decay
    if (typeof match !== 'undefined' && match && match.cooldown > 0) {
      match.cooldown = Math.max(0, match.cooldown - dt);
    }

    const matchActive = (typeof match !== 'undefined' && match && match.state === 'playing');

    // 1. Update FX: Shockwaves (swap-pop removal, capped)
    if (crownState.shockwaves.length > 12) crownState.shockwaves.splice(0, crownState.shockwaves.length - 12);
    for (let i = crownState.shockwaves.length - 1; i >= 0; i--) {
      const sw = crownState.shockwaves[i];
      sw.r += sw.speed * dt;
      sw.life -= dt;
      sw.alpha = Math.max(0, sw.life / sw.maxLife);
      if (sw.life <= 0 || sw.r >= sw.maxR) {
        crownState.shockwaves[i] = crownState.shockwaves[crownState.shockwaves.length - 1];
        crownState.shockwaves.pop();
      }
    }

    // 2. Update FX: Particles (swap-pop removal, capped at 300)
    if (crownState.particles.length > 300) crownState.particles.splice(0, crownState.particles.length - 300);
    for (let i = crownState.particles.length - 1; i >= 0; i--) {
      const p = crownState.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 480 * dt; // Gravity
      if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
      p.life -= dt;
      if (p.life <= 0) {
        crownState.particles[i] = crownState.particles[crownState.particles.length - 1];
        crownState.particles.pop();
      }
    }

    // 3. Update FX: Floaters (capped at 20)
    if (crownState.floaters.length > 20) crownState.floaters.splice(0, crownState.floaters.length - 20);
    for (let i = crownState.floaters.length - 1; i >= 0; i--) {
      const fl = crownState.floaters[i];
      fl.y -= 44 * dt;
      fl.life -= dt;
      fl.scale = _clamp(fl.scale - dt * 0.8, 1.0, 1.6);
      if (fl.life <= 0) {
        crownState.floaters[i] = crownState.floaters[crownState.floaters.length - 1];
        crownState.floaters.pop();
      }
    }

    // 4. Update FX: Banners
    for (let i = crownState.banners.length - 1; i >= 0; i--) {
      const bn = crownState.banners[i];
      bn.y -= 14 * dt;
      bn.life -= dt;
      bn.scale = Math.min(1.0, bn.scale + dt * 4.5);
      if (bn.life <= 0) crownState.banners.splice(i, 1);
    }

    if (!matchActive) return;

    // 5. Unowned Crown Levitation
    if (!crownState.holder) {
      crownState.bobTimer += dt * 3.6;
      crownState.y = crownState.spawnY + Math.sin(crownState.bobTimer) * 8.5;
      crownState.x = crownState.spawnX;

      // Sparkling aura when crown waits on central pedestal
      if (Math.random() < 0.35) {
        crownState.particles.push({
          x: crownState.x + (Math.random() - 0.5) * 32,
          y: crownState.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 30,
          vy: -30 - Math.random() * 40,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          size: 2.5 + Math.random() * 3,
          col: Math.random() < 0.6 ? '#ffd700' : '#ffffff',
          shape: 'spark'
        });
      }
    } else {
      // 6. Owned Crown Behavior
      const king = crownState.holder;

      // Handle king elimination / disconnect
      if (king.isEliminated) {
        crownState.holder = null;
        crownState.holderIndex = -1;
        crownState.x = crownState.spawnX;
        crownState.y = crownState.spawnY;
        addCrownBanner('👑 CROWN RETURNED TO CENTER!', crownState.spawnX, crownState.spawnY - 30, '#ffd700', 2.0);
        return;
      }

      // Smooth crown following king head
      crownState.x = king.x + king.w / 2;
      crownState.y = king.y - 14;

      // Update hold timer (Fatigue accumulator)
      crownState.holdTimer += dt;

      // Update 1.2s Steal Immunity Window
      if (crownState.immunityTimer > 0) {
        crownState.immunityTimer = Math.max(0, crownState.immunityTimer - dt);
      }

      // Update Underdog Vengeance timer
      if (crownState.underdogTimer > 0) {
        crownState.underdogTimer = Math.max(0, crownState.underdogTimer - dt);
        if (crownState.underdogTimer <= 0) {
          crownState.underdogSlot = -1;
          king.underdogTimer = 0;
        }
      }

      // Sky Beacon Alpha Transition
      if (crownState.holdTimer >= CROWN_CONFIG.FATIGUE_THRESHOLD) {
        crownState.beaconAlpha = Math.min(1.0, crownState.beaconAlpha + dt * 2.5);
      } else {
        crownState.beaconAlpha = Math.max(0, crownState.beaconAlpha - dt * 3.5);
      }

      // Point Accumulator: +1 pt every 0.4s (or +2 if Underdog Vengeance)
      crownState.pointTimer += dt;
      while (crownState.pointTimer >= crownState.pointInterval) {
        crownState.pointTimer -= crownState.pointInterval;

        const isUnderdog = (crownState.underdogTimer > 0 && crownState.underdogSlot === king.slot);
        const pts = isUnderdog ? CROWN_CONFIG.UNDERDOG_PTS : CROWN_CONFIG.NORMAL_PTS;

        crownState.scores[king.slot] = (crownState.scores[king.slot] || 0) + pts;
        king.crownPoints = crownState.scores[king.slot];

        // Floating score popup above King
        addPointFloater(
          king.x + king.w / 2,
          king.y - 28,
          isUnderdog ? '+2' : '+1',
          isUnderdog ? '#ff3838' : '#ffd700'
        );

        // Win Condition Check: First to 100 points!
        if (crownState.scores[king.slot] >= crownState.targetScore) {
          crownState.scores[king.slot] = crownState.targetScore;
          triggerCrownWin(king, 'score_limit');
          return;
        }
      }
    }

    // 7. Dynamic Speed Enforcement & Rubberbanding
    const players = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    for (const p of players) {
      if (p.isEliminated || p.isFrozen) continue;

      const baseMax = getCrownPlayerSpeed(p);
      const onSpeed = p.grounded && !!_zoneAtFeet(p, 'speed');
      const isKingP = crownState.holder && crownState.holder.slot === p.slot;
      // King keeps burden even on pads (pad still helps, but capped at +15%):
      const padMult = onSpeed ? (isKingP ? 1.15 : CROWN_CONFIG.SPEED_PAD_MULT) : 1.0;
      const effMax = baseMax * padMult;

      // Trailing chasers with 540 px/s catch-up surge: ramp into high gear (no velocity snap)
      if (baseMax === CROWN_CONFIG.SPEED_CHASER_BOOST && p.grounded) {
        const want = Math.sign(p.vx || p.face || 1) * CROWN_CONFIG.SPEED_CHASER_BOOST;
        p.vx += (want - p.vx) * Math.min(1.0, dt * 8);
      }

      // Smooth deceleration clamp if exceeding assigned mode speed (pads included for king)
      if (Math.abs(p.vx) > effMax) {
        const target = Math.sign(p.vx) * effMax;
        p.vx += (target - p.vx) * Math.min(1.0, dt * 16);
      }
    }

    // 8. Match Time Limit Check
    if (typeof match !== 'undefined' && match && match.timer <= 0) {
      // Find player with highest crown points
      let bestPlayer = players[0] || null;
      let highestPts = -1;
      for (const p of players) {
        const pts = crownState.scores[p.slot] || 0;
        if (pts > highestPts) {
          highestPts = pts;
          bestPlayer = p;
        }
      }
      triggerCrownWin(bestPlayer, 'time_limit');
    }
  }

  /* ==========================================================================
     11. TAG / STEAL DETECTION: checkCrownTag()
     ========================================================================== */
  function checkCrownTag() {
    if (!crownState.active) return;
    if (typeof match === 'undefined' || !match || match.state !== 'playing' || match.cooldown > 0) return;

    const players = match.players;
    if (!players || players.length < 2) return;

    const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
    const isOnlineGuest = isOnline && !NET.isHost;

    // Case 1: Unowned Crown on Central Pedestal
    if (!crownState.holder) {
      const crownBox = {
        x: crownState.x - 22,
        y: crownState.y - 18,
        w: 44,
        h: 36
      };

      for (const p of players) {
        if (p.isEliminated || p.isFrozen) continue;
        if (_hitRectInclusive(_tagBox(p), crownBox)) {
          if (isOnlineGuest) {
            if (p.slot === NET.mySlot) {
              try {
                netBroadcastReliable({ t: 'crown_claim', from: p.slot, x: crownState.x, y: crownState.y });
                match.cooldown = 0.5;
              } catch (e) {}
            }
            return;
          }
          claimCrown(p, false, crownState.x, crownState.y);
          return;
        }
      }
      return;
    }

    // Case 2: Crown Worn by King
    const king = crownState.holder;
    if (!king || king.isEliminated) return;

    // 1.2s Steal Immunity Window: King CANNOT be tagged during this grace period!
    if (crownState.immunityTimer > 0) {
      // If a chaser touches King during immunity, deflect with golden sparks
      for (const chaser of players) {
        if (chaser === king || chaser.isEliminated || chaser.isFrozen) continue;
        if (_hitRectInclusive(_tagBox(chaser), _tagBox(king))) {
          const popX = (chaser.x + king.x) / 2 + 23;
          const popY = (chaser.y + king.y) / 2 + 10;
          // Spawn deflection sparks (rate-limited by nearMiss)
          if (!chaser.lastImmunityDeflect || (typeof tGlobal !== 'undefined' && tGlobal - chaser.lastImmunityDeflect > 0.4)) {
            chaser.lastImmunityDeflect = (typeof tGlobal !== 'undefined') ? tGlobal : Date.now() / 1000;
            addPointFloater(popX, popY - 20, 'IMMUNE! (1.2s)', '#fef08a');
            for (let i = 0; i < 8; i++) {
              const a = Math.random() * Math.PI * 2;
              crownState.particles.push({
                x: popX,
                y: popY,
                vx: Math.cos(a) * 140,
                vy: Math.sin(a) * 140,
                life: 0.25,
                maxLife: 0.25,
                size: 3,
                col: '#ffe66d',
                shape: 'spark'
              });
            }
            _sfx('back');
          }
        }
      }
      return; // Absolute tag immunity active!
    }

    // Tagging is eligible: Chasers hunt King!
    for (const chaser of players) {
      if (chaser === king || chaser.isEliminated || chaser.isFrozen) continue;

      if (_hitRectInclusive(_tagBox(chaser), _tagBox(king))) {
        const popX = (chaser.x + king.x) / 2 + 23;
        const popY = (chaser.y + king.y) / 2 + 10;

        if (isOnlineGuest) {
          if (chaser.slot === NET.mySlot) {
            try {
              netBroadcastReliable({
                t: 'crown_steal',
                from: chaser.slot,
                target: king.slot,
                x: popX,
                y: popY
              });
              match.cooldown = 0.5;
            } catch (e) {}
          }
          return;
        }

        // Host / Offline Crown Steal!
        claimCrown(chaser, true, popX, popY);
        return;
      }
    }
  }

  /* ==========================================================================
     12. RENDERING: drawCrownPlayer(p)
     ========================================================================== */
  function drawCrownPlayer(p) {
    if (!crownState.active || !p || p.isEliminated) return;

    const g = Cctx();
    if (!g) return;

    const isKing = (crownState.holder === p);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const tG = (typeof tGlobal !== 'undefined') ? tGlobal : (Date.now() / 1000);

    // 1. King Fatigue: Golden Sky Beacon (> 15s Continuous Hold)
    if (isKing && crownState.beaconAlpha > 0.02) {
      g.save();
      g.globalAlpha = crownState.beaconAlpha;

      const topY = 0;
      const botY = p.y + p.h;

      // Outer golden radiance
      const wideGrad = g.createLinearGradient(cx - 52, 0, cx + 52, 0);
      wideGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
      wideGrad.addColorStop(0.3, 'rgba(255, 193, 7, 0.20)');
      wideGrad.addColorStop(0.5, 'rgba(255, 235, 59, 0.38)');
      wideGrad.addColorStop(0.7, 'rgba(255, 193, 7, 0.20)');
      wideGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      g.fillStyle = wideGrad;
      g.fillRect(cx - 52, topY, 104, botY - topY);

      // Core white-gold laser pillar
      const coreGrad = g.createLinearGradient(cx - 15, 0, cx + 15, 0);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreGrad.addColorStop(0.3, 'rgba(255, 240, 150, 0.65)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      coreGrad.addColorStop(0.7, 'rgba(255, 240, 150, 0.65)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = coreGrad;
      g.fillRect(cx - 15, topY, 30, botY - topY);

      // Ascending celestial light rings
      const pulseT = tG * 2.8;
      for (let ring = 0; ring < 4; ring++) {
        const ry = botY - ((pulseT + ring * 0.25) % 1.0) * (botY - topY);
        g.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.ellipse(cx, ry, 22, 6, 0, 0, Math.PI * 2);
        g.stroke();
      }

      // Base halo around King
      const baseGrad = g.createRadialGradient(cx, cy, 6, cx, cy, 46);
      baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      baseGrad.addColorStop(0.4, 'rgba(255, 215, 0, 0.42)');
      baseGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      g.fillStyle = baseGrad;
      g.beginPath();
      g.arc(cx, cy, 46, 0, Math.PI * 2);
      g.fill();

      // Warning pill atop King
      const warnY = p.y - 48;
      const pulse = 1.0 + 0.10 * Math.sin(tG * 8);
      g.save();
      g.translate(cx, warnY);
      g.scale(pulse, pulse);
      _rr(g, -55, -12, 110, 22, 6);
      g.fillStyle = 'rgba(220, 38, 38, 0.92)';
      g.fill();
      g.lineWidth = 1.8;
      g.strokeStyle = '#ffd700';
      g.stroke();
      _txt(g, '⚠️ FATIGUE (460 px)', 0, 1, _fn(10, 900), '#ffffff', 'center');
      g.restore();

      g.restore();
    }

    // 2. Underdog Vengeance Flame Aura
    if (isKing && crownState.underdogTimer > 0) {
      g.save();
      const firePulse = 1.0 + 0.15 * Math.sin(tG * 12);
      const fireGrad = g.createRadialGradient(cx, cy, 10, cx, cy, 42 * firePulse);
      fireGrad.addColorStop(0, 'rgba(255, 71, 87, 0.55)');
      fireGrad.addColorStop(0.5, 'rgba(255, 159, 28, 0.35)');
      fireGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      g.fillStyle = fireGrad;
      g.beginPath();
      g.arc(cx, cy, 42 * firePulse, 0, Math.PI * 2);
      g.fill();

      // Floating 2X flame badge
      const badgeY = p.y - 42;
      _rr(g, cx - 34, badgeY - 11, 68, 20, 6);
      g.fillStyle = 'rgba(255, 59, 48, 0.95)';
      g.fill();
      g.strokeStyle = '#ffd700';
      g.lineWidth = 1.6;
      g.stroke();
      _txt(g, '🔥 2X PTS (' + crownState.underdogTimer.toFixed(1) + 's)', cx, badgeY + 1, _fn(9.5, 900), '#ffffff', 'center');
      g.restore();
    }

    // 3. Shimmering Golden Crown Atop King Head
    if (isKing) {
      renderCrownGraphic(g, cx, p.y - 14 + Math.sin(tG * 5) * 2, 1.0, true);
    }

    // 4. 1.2s Steal Immunity Shield (Golden Translucent Aegis)
    if (isKing && crownState.immunityTimer > 0) {
      g.save();
      const remFrac = crownState.immunityTimer / CROWN_CONFIG.IMMUNITY_DURATION;
      const shieldR = 35 + Math.sin(tG * 14) * 2;

      // Shield sphere fill
      const shieldGrad = g.createRadialGradient(cx, cy, 8, cx, cy, shieldR);
      shieldGrad.addColorStop(0, 'rgba(255, 240, 160, 0.10)');
      shieldGrad.addColorStop(0.65, 'rgba(255, 215, 0, 0.25)');
      shieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0.60)');
      g.fillStyle = shieldGrad;
      g.beginPath();
      g.arc(cx, cy, shieldR, 0, Math.PI * 2);
      g.fill();

      // Outer sweep countdown arc (1.2s ticking down)
      g.lineWidth = 3.2;
      g.strokeStyle = '#ffd700';
      g.beginPath();
      g.arc(cx, cy, shieldR, -Math.PI / 2, -Math.PI / 2 + remFrac * Math.PI * 2);
      g.stroke();

      // Hexagonal revolving notches
      const rot = tG * 3.5;
      g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      g.lineWidth = 2.0;
      for (let a = 0; a < 6; a++) {
        const ang = rot + a * (Math.PI / 3);
        const px1 = cx + Math.cos(ang) * (shieldR - 4);
        const py1 = cy + Math.sin(ang) * (shieldR - 4);
        const px2 = cx + Math.cos(ang) * (shieldR + 3);
        const py2 = cy + Math.sin(ang) * (shieldR + 3);
        g.beginPath();
        g.moveTo(px1, py1);
        g.lineTo(px2, py2);
        g.stroke();
      }

      // Shield Pill Badge
      _rr(g, cx - 32, cy - shieldR - 15, 64, 18, 5);
      g.fillStyle = 'rgba(15, 23, 42, 0.90)';
      g.fill();
      g.strokeStyle = '#ffd700';
      g.lineWidth = 1.4;
      g.stroke();
      _txt(g, '🛡️ IMMUNE ' + crownState.immunityTimer.toFixed(1) + 's', cx, cy - shieldR - 5, _fn(9, 900), '#fef08a', 'center');

      g.restore();
    }

    // 5. Chaser Catch-Up Surge Aura (> 30 pts behind)
    if (!isKing && crownState.holder) {
      const kingPts = crownState.scores[crownState.holder.slot] || 0;
      const myPts = crownState.scores[p.slot] || 0;
      if (kingPts - myPts > 30) {
        g.save();
        // Cyan-gold speed streak spark
        const surgePulse = 0.22 + 0.12 * Math.sin(tG * 10);
        g.fillStyle = 'rgba(56, 189, 248, ' + surgePulse.toFixed(2) + ')';
        _rr(g, p.x - 6, p.y - 6, p.w + 12, p.h + 12, 12);
        g.fill();
        g.strokeStyle = 'rgba(255, 215, 0, 0.65)';
        g.lineWidth = 2;
        _rr(g, p.x - 3, p.y - 3, p.w + 6, p.h + 6, 10);
        g.stroke();
        g.restore();
      }
    }
  }

  /* ==========================================================================
     13. RENDERING: drawCrownEntity() & renderCrownGraphic()
     ========================================================================== */
  function renderCrownGraphic(g, cx, cy, scale, sparkle) {
    g.save();
    g.translate(cx, cy);
    if (scale !== 1.0) g.scale(scale, scale);

    const tG = (typeof tGlobal !== 'undefined') ? tGlobal : (Date.now() / 1000);

    // Crown metallic 5-point path
    // Width = 38px, Height = 24px (centered at cx, cy)
    const w = 38, h = 24;
    const x = -w / 2;
    const y = -h / 2;

    // Golden metallic gradient
    const goldGrad = g.createLinearGradient(0, y, 0, y + h);
    goldGrad.addColorStop(0, '#fff3a8');
    goldGrad.addColorStop(0.35, '#ffd700');
    goldGrad.addColorStop(0.7, '#f59e0b');
    goldGrad.addColorStop(1, '#b45309');

    // Draw 5-point crown polygon
    g.beginPath();
    g.moveTo(x, y + h);                   // Bottom-left
    g.lineTo(x + w, y + h);               // Bottom-right
    g.lineTo(x + w, y + 6);               // Far-right point base
    g.lineTo(x + w - 4, y + 2);           // Peak 5 (Far-right)
    g.lineTo(x + w * 0.72, y + 10);       // Valley 4
    g.lineTo(x + w * 0.66, y - 4);        // Peak 4 (Mid-right)
    g.lineTo(x + w * 0.50, y + 8);        // Valley 3 (Center)
    g.lineTo(x + w * 0.50, y - 10);       // Peak 3 (Center Tallest!)
    g.lineTo(x + w * 0.50, y + 8);        // Valley 2 (Center)
    g.lineTo(x + w * 0.34, y - 4);        // Peak 2 (Mid-left)
    g.lineTo(x + w * 0.28, y + 10);       // Valley 1
    g.lineTo(x + 4, y + 2);               // Peak 1 (Far-left)
    g.lineTo(x, y + 6);                   // Far-left point base
    g.closePath();

    g.fillStyle = goldGrad;
    g.fill();

    // Dark golden rim outline
    g.lineWidth = 1.8;
    g.strokeStyle = '#78350f';
    g.stroke();

    // Specular highlight gleam on front facet
    g.beginPath();
    g.moveTo(x + 4, y + h - 4);
    g.lineTo(x + w - 4, y + h - 4);
    g.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    g.lineWidth = 1.6;
    g.stroke();

    // Golden pearls / finials atop the 5 peaks
    const peaks = [
      { px: x + 4, py: y + 2, r: 2.2 },
      { px: x + w * 0.34, py: y - 4, r: 2.6 },
      { px: x + w * 0.50, py: y - 10, r: 3.4 }, // Center pearl
      { px: x + w * 0.66, py: y - 4, r: 2.6 },
      { px: x + w - 4, py: y + 2, r: 2.2 }
    ];

    for (const pk of peaks) {
      g.beginPath();
      g.arc(pk.px, pk.py, pk.r, 0, Math.PI * 2);
      g.fillStyle = '#fef08a';
      g.fill();
      g.lineWidth = 1.0;
      g.strokeStyle = '#78350f';
      g.stroke();
    }

    // Jeweled Filigree Band (Ruby center, Sapphire left, Emerald right)
    const bandY = y + h - 6;

    // Center Ruby
    g.beginPath();
    g.arc(0, bandY, 3.2, 0, Math.PI * 2);
    g.fillStyle = '#ef4444';
    g.fill();
    g.strokeStyle = '#7f1d1d';
    g.lineWidth = 0.8;
    g.stroke();
    // Ruby specular
    g.fillStyle = '#ffffff';
    g.fillRect(-1.2, bandY - 2.2, 1.2, 1.2);

    // Left Sapphire
    g.beginPath();
    g.arc(-10, bandY, 2.4, 0, Math.PI * 2);
    g.fillStyle = '#3b82f6';
    g.fill();
    g.strokeStyle = '#1e3a8a';
    g.lineWidth = 0.8;
    g.stroke();

    // Right Emerald
    g.beginPath();
    g.arc(10, bandY, 2.4, 0, Math.PI * 2);
    g.fillStyle = '#10b981';
    g.fill();
    g.strokeStyle = '#064e3b';
    g.lineWidth = 0.8;
    g.stroke();

    // Star glint twinkling on center peak
    if (sparkle) {
      const glintPulse = 0.5 + 0.5 * Math.sin(tG * 6);
      const glintX = 0;
      const glintY = y - 10;

      g.save();
      g.translate(glintX, glintY);
      g.rotate(tG * 2.2);
      g.fillStyle = 'rgba(255, 255, 255, ' + glintPulse.toFixed(2) + ')';
      // 4-point star
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(1.5, -1.5);
      g.lineTo(6, 0);
      g.lineTo(1.5, 1.5);
      g.lineTo(0, 6);
      g.lineTo(-1.5, 1.5);
      g.lineTo(-6, 0);
      g.lineTo(-1.5, -1.5);
      g.closePath();
      g.fill();
      g.restore();
    }

    g.restore();
  }

  function drawCrownEntity() {
    if (!crownState.active || crownState.holder) return;

    const g = Cctx();
    if (!g) return;

    const cx = crownState.x;
    const cy = crownState.y;
    const tG = (typeof tGlobal !== 'undefined') ? tGlobal : (Date.now() / 1000);

    g.save();

    // 1. Pedestal Light Beam down to platform
    const beamH = 38;
    const beamGrad = g.createLinearGradient(0, cy, 0, cy + beamH);
    beamGrad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
    beamGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    g.fillStyle = beamGrad;
    g.beginPath();
    g.moveTo(cx - 16, cy + 12);
    g.lineTo(cx + 16, cy + 12);
    g.lineTo(cx + 34, cy + beamH);
    g.lineTo(cx - 34, cy + beamH);
    g.closePath();
    g.fill();

    // 2. Ambient Golden Radiance Halo
    const haloGrad = g.createRadialGradient(cx, cy, 6, cx, cy, 48);
    haloGrad.addColorStop(0, 'rgba(255, 240, 160, 0.65)');
    haloGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.28)');
    haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    g.fillStyle = haloGrad;
    g.beginPath();
    g.arc(cx, cy, 48, 0, Math.PI * 2);
    g.fill();

    // 3. Rotating Diamond Sparkle Orbits
    const orbAng = tG * 2.5;
    for (let o = 0; o < 3; o++) {
      const a = orbAng + o * (Math.PI * 2 / 3);
      const ox = cx + Math.cos(a) * 28;
      const oy = cy + Math.sin(a) * 12;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(ox, oy, 2.2, 0, Math.PI * 2);
      g.fill();
    }

    // 4. Render Scaled Crown Graphic
    renderCrownGraphic(g, cx, cy, 1.25, true);

    // 5. "TOUCH TO CLAIM KING" Floating Prompt
    const promptY = cy - 32;
    _rr(g, cx - 64, promptY - 11, 128, 20, 6);
    g.fillStyle = 'rgba(15, 23, 42, 0.88)';
    g.fill();
    g.strokeStyle = '#ffd700';
    g.lineWidth = 1.4;
    g.stroke();
    _txt(g, '👑 TOUCH TO CLAIM', cx, promptY + 1, _fn(9.5, 900), '#fde047', 'center');

    g.restore();
  }

  /* ==========================================================================
     14. IN-GAME WORLD FX RENDERING (Shockwaves, Floaters, Banners)
     ========================================================================== */
  function drawCrownWorldFX() {
    if (!crownState.active) return;
    const g = Cctx();
    if (!g) return;

    // 1. Shockwaves
    for (const sw of crownState.shockwaves) {
      g.save();
      g.globalAlpha = sw.alpha;
      g.lineWidth = 4.5;
      g.strokeStyle = '#ffd700';
      g.beginPath();
      g.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      g.stroke();

      // Inner white ring
      g.lineWidth = 2.2;
      g.strokeStyle = '#ffffff';
      g.beginPath();
      g.arc(sw.x, sw.y, Math.max(0, sw.r - 8), 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }

    // 2. Sparkle Particles
    for (const p of crownState.particles) {
      g.save();
      const a = p.life / p.maxLife;
      g.globalAlpha = a;
      g.fillStyle = p.col;
      if (p.shape === 'star') {
        g.translate(p.x, p.y);
        g.rotate(p.rot || 0);
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        g.beginPath();
        g.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }

    // 3. Floating Score & Combat Floaters
    for (const fl of crownState.floaters) {
      g.save();
      const a = Math.min(1.0, fl.life / (fl.maxLife * 0.4));
      g.globalAlpha = a;
      g.translate(fl.x, fl.y);
      g.scale(fl.scale, fl.scale);
      _txt(g, fl.text, 0, 0, _fn(14, 900), fl.col, 'center');
      g.restore();
    }

    // 4. In-World Event Banners
    for (const bn of crownState.banners) {
      g.save();
      const a = Math.min(1.0, bn.life / (bn.maxLife * 0.3));
      g.globalAlpha = a;
      g.translate(bn.x, bn.y);
      g.scale(bn.scale, bn.scale);

      const bw = 240, bh = 30;
      _rr(g, -bw / 2, -bh / 2, bw, bh, 8);
      g.fillStyle = 'rgba(15, 23, 42, 0.94)';
      g.fill();
      g.lineWidth = 2.0;
      g.strokeStyle = bn.col;
      g.stroke();

      _txt(g, bn.text, 0, 1, _fn(11.5, 900), bn.col, 'center');
      g.restore();
    }
  }

  /* ==========================================================================
     15. HUD & SCORE PROGRESS: drawCrownUI()
     ========================================================================== */
  function drawCrownUI() {
    if (!crownState.active) return;
    const g = Cctx();
    if (!g) return;

    const cw = (typeof CW !== 'undefined') ? CW : 1280;
    const ch = (typeof CH !== 'undefined') ? CH : 720;
    const matchTimer = (typeof match !== 'undefined' && match) ? match.timer : 60;
    const urgent = matchTimer <= 10;

    // 1. Central Header & Mode Status Bar
    const headerW = Math.min(260, cw * 0.36);
    const headerH = 46;
    const headerX = cw / 2 - headerW / 2;
    const headerY = 10;

    g.save();
    // Glass container
    _rr(g, headerX, headerY, headerW, headerH, 12);
    g.fillStyle = urgent ? 'rgba(185, 28, 28, 0.94)' : 'rgba(15, 23, 42, 0.94)';
    g.fill();
    g.lineWidth = 2.4;
    g.strokeStyle = '#ffd700';
    g.stroke();

    // Mode title
    _txt(g, '👑 CROWN KING', cw / 2, headerY + 14, _fn(12, 900), '#fef08a', 'center');
    // Timer & target
    const subText = _fmtTime(matchTimer) + '  •  FIRST TO 100 PTS';
    _txt(g, subText, cw / 2, headerY + 32, _ft(13.5), '#ffffff', 'center');
    g.restore();

    // 2. Player Crown Points Progress Bars (Left Side)
    const players = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
    const cardW = Math.min(210, cw * 0.28);
    const cardH = players.length > 4 ? 26 : 32;
    const cardGap = players.length > 4 ? 30 : 38;
    const startY = 14;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const isKing = (crownState.holder === p);
      const pts = crownState.scores[p.slot] || 0;
      const progress = _clamp(pts / crownState.targetScore, 0, 1.0);
      const col = _getPlayerColor(p);
      const y = startY + i * cardGap;

      g.save();
      // Player card backing
      _rr(g, 12, y, cardW, cardH, 8);
      g.fillStyle = isKing ? 'rgba(255, 215, 0, 0.16)' : 'rgba(15, 23, 42, 0.78)';
      g.fill();
      g.lineWidth = isKing ? 2.0 : 1.2;
      g.strokeStyle = isKing ? '#ffd700' : 'rgba(255, 255, 255, 0.18)';
      g.stroke();

      // Mini Player Color Swatch
      _rr(g, 16, y + (cardH - 16) / 2, 16, 16, 4);
      g.fillStyle = col;
      g.fill();
      g.lineWidth = 1.2;
      g.strokeStyle = '#ffffff';
      g.stroke();

      // Player Label
      const pName = (_isBotSlot(p) ? 'BOT ' : 'P') + (p.slot + 1);
      const kingBadge = isKing ? ' 👑' : '';
      _txt(g, pName + kingBadge, 38, y + cardH * 0.32, _fn(10, 800), isKing ? '#fef08a' : '#cbd5e1', 'left');

      // Points Counter ("45 / 100")
      _txt(g, pts + ' / ' + crownState.targetScore, 12 + cardW - 10, y + cardH * 0.32, _fn(10, 900), '#ffffff', 'right');

      // Progress Bar Track
      const barX = 38;
      const barY = y + cardH * 0.60;
      const barW = cardW - 46;
      const barH = 7;

      _rr(g, barX, barY, barW, barH, 3.5);
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.fill();

      // Progress Fill
      if (progress > 0) {
        const fillW = Math.max(6, barW * progress);
        _rr(g, barX, barY, fillW, barH, 3.5);
        const fillGrad = g.createLinearGradient(barX, 0, barX + fillW, 0);
        fillGrad.addColorStop(0, col);
        fillGrad.addColorStop(1, isKing ? '#ffd700' : '#ffffff');
        g.fillStyle = fillGrad;
        g.fill();
      }

      g.restore();
    }
  }

  /* ==========================================================================
     16. BOT AI INTEGRATION: crownBotThink(p)
     ========================================================================== */
  function crownBotThink(p, dt) {
    if (!crownState.active || !p || p.isEliminated || p.isFrozen) {
      return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
    }

    const stepDt = (typeof dt === 'number' && dt > 0) ? Math.min(0.05, dt) : (1 / 60);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const isKing = (crownState.holder === p);

    // Bot state initialization
    let S = CROWN_BOT_ST[p.slot];
    if (!S) {
      S = CROWN_BOT_ST[p.slot] = {
        dir: 0,
        jumpQ: false,
        jumpHoldT: 0,
        decideT: 0,
        px: p.x,
        py: p.y,
        stuckT: 0,
        unstuckT: 0,
        unstuckDir: 0,
        campT: 0,
        dropHoldT: 0
      };
    }

    // Stuck Tracking & Anti-Stall Escape
    const distMoved = Math.hypot(p.x - S.px, p.y - S.py);
    if (distMoved < 14) {
      S.stuckT += stepDt;
    } else {
      S.stuckT = 0;
      S.px = p.x;
      S.py = p.y;
    }

    if (S.stuckT > 0.42 && S.unstuckT <= 0) {
      S.unstuckT = 0.65;
      S.unstuckDir = (S.dir !== 0 ? -S.dir : (Math.random() < 0.5 ? -1 : 1));
      S.stuckT = 0;
    }

    if (S.unstuckT > 0) {
      S.unstuckT -= stepDt;
      let j = false;
      if (p.grounded || p.airJumps > 0 || (p.wallJumps < 2 && p.sideT > 0)) {
        j = true;
        S.jumpHoldT = 0.14;
      }
      const uh = !!j || S.jumpHoldT > 0;
      if (S.jumpHoldT > 0) S.jumpHoldT -= stepDt;
      return { dir: S.unstuckDir, jumpEdge: j, jumpHeld: uh, downHeld: false };
    }

    // Decay timers
    S.decideT -= stepDt;
    if (S.dropHoldT > 0) S.dropHoldT -= stepDt;

    // AI Decision Cycle (~0.09s)
    if (S.decideT <= 0) {
      S.decideT = 0.09;
      let want = 0;
      let wantJump = false;
      let wantDown = false;

      // ----------------------------------------------------------------------
      // CASE A: UNOWNED CROWN (Sprint & jump to claim central crown!)
      // ----------------------------------------------------------------------
      if (!crownState.holder) {
        const dx = crownState.x - cx;
        const dy = crownState.y - cy;

        want = Math.abs(dx) > 16 ? Math.sign(dx) : (S.dir || 1);

        // Jump if crown is higher or across a gap
        if (dy < -25 && (p.grounded || p.sideT > 0)) {
          wantJump = true;
        }
        if (Math.abs(dx) < 60 && dy < -10 && p.grounded) {
          wantJump = true;
        }

        S.dir = want;
        if (wantJump) S.jumpQ = true;
      }

      // ----------------------------------------------------------------------
      // CASE B: KING BOT (High-Ground Evade, Pink Drop Escapes, Speed Pads!)
      // ----------------------------------------------------------------------
      else if (isKing) {
        const players = (typeof match !== 'undefined' && match && match.players) ? match.players : [];
        let nearestChaser = null;
        let minChaserDistSq = 1e12;

        for (const o of players) {
          if (o === p || o.isEliminated || o.isFrozen) continue;
          const dSq = (o.x - cx) ** 2 + (o.y - cy) ** 2;
          if (dSq < minChaserDistSq) {
            minChaserDistSq = dSq;
            nearestChaser = o;
          }
        }

        if (nearestChaser) {
          const chaserDx = (nearestChaser.x + nearestChaser.w / 2) - cx;
          const chaserDy = (nearestChaser.y + nearestChaser.h / 2) - cy;
          const distChaser = Math.sqrt(minChaserDistSq);

          // 1. Pink Platform Drop-Through Escape:
          // If grounded on pink drop platform and chaser is closing in (< 190px),
          // drop down through the floor to slip under their tag attempt!
          const onPink = _botFullyOnDrop(p);
          if (onPink && distChaser < 190 && Math.abs(chaserDy) < 80) {
            wantDown = true;
            S.dropHoldT = 0.28;
            want = -Math.sign(chaserDx) || (p.face || 1);
          }

          // 2. Speed Pad Sprint Meta:
          // If near or on speed pad, sprint across to leverage the 1.55x boost
          const onSpeed = p.grounded && !!_zoneAtFeet(p, 'speed');
          if (onSpeed) {
            want = -Math.sign(chaserDx) || (p.face || 1);
          }

          // 3. High-Ground Preservation:
          // King seeks elevated tiers. If on bottom floor, navigate upward!
          const arenaH = (typeof H !== 'undefined') ? H : 1320;
          if (p.y > arenaH - 240 && distChaser > 160) {
            wantJump = true;
          }

          // 4. Anti-Cornering Jump-Over:
          // If trapped against edge (< 120px from arena wall) and chaser is approaching:
          const arenaW = (typeof W !== 'undefined') ? W : 2400;
          const nearWall = (p.x < 140 || p.x + p.w > arenaW - 140);
          if (nearWall && distChaser < 160 && (p.grounded || p.sideT > 0)) {
            wantJump = true;
            want = (p.x < arenaW / 2) ? 1 : -1; // Jump inwards away from wall
          } else if (!wantDown) {
            // General Fleeing Direction away from closest chaser
            want = -Math.sign(chaserDx) || 1;
            // Jump over chaser if they charge in head-on at close proximity
            if (distChaser < 90 && Math.abs(chaserDy) < 40 && p.grounded) {
              wantJump = true;
            }
          }
        } else {
          // No chaser nearby: camp high ground
          want = 0;
        }

        S.dir = want;
        if (wantJump) S.jumpQ = true;
      }

      // ----------------------------------------------------------------------
      // CASE C: CHASER BOT (100% Hunt the King with Intercept Trajectories!)
      // ----------------------------------------------------------------------
      else {
        const king = crownState.holder;
        if (king) {
          const kx = king.x + king.w / 2;
          const ky = king.y + king.h / 2;
          const dx = kx - cx;
          const dy = ky - cy;
          const distKing = Math.hypot(dx, dy);

          // Calculate Dynamic Intercept Lead Time
          const leadT = _clamp(distKing / CROWN_CONFIG.SPEED_CHASER_NORMAL, 0.12, 0.38);
          const aimX = kx + _clamp((king.vx || 0) * leadT, -220, 220);
          const aimDx = aimX - cx;

          // Aggressive Chase Movement
          want = Math.abs(aimDx) > 16 ? Math.sign(aimDx) : (Math.sign(dx) || 1);

          // Platform climb / jump navigation
          if (dy < -30 && (p.grounded || p.sideT > 0)) {
            wantJump = true;
          }

          // Gap jumping
          if (Math.abs(dx) > 80 && dy < 10 && p.grounded) {
            wantJump = true;
          }

          // Drop-through pink platform if King is below
          if (dy > 60 && _botFullyOnDrop(p)) {
            wantDown = true;
            S.dropHoldT = 0.22;
          }

          // Jump cut-off when King is in striking range
          if (distKing < 110 && Math.abs(dy) < 50 && p.grounded) {
            wantJump = true;
          }

          S.dir = want;
          if (wantJump) S.jumpQ = true;
        }
      }
    }

    // Execute Jump Commands
    let jumpEdge = false;
    if (S.jumpQ) {
      jumpEdge = true;
      S.jumpQ = false;
      S.jumpHoldT = 0.16; // Full jump height
    }

    const jumpHeld = jumpEdge || S.jumpHoldT > 0;
    if (S.jumpHoldT > 0) S.jumpHoldT -= stepDt;

    const downHeld = S.dropHoldT > 0;

    return {
      dir: S.dir || 0,
      jumpEdge: jumpEdge,
      jumpHeld: jumpHeld,
      downHeld: downHeld
    };
  }

  /* ==========================================================================
     17. AUTO-INTEGRATION HOOKS (Clean Browser Bridge)
     ========================================================================== */
  function attachCrownModeHooks() {
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

  /* ==========================================================================
     18. MODULE EXPORTS (Node.js & CommonJS compatibility)
     ========================================================================== */
  const crownModuleExports = {
    initCrownMode,
    updateCrownMode,
    checkCrownTag,
    drawCrownUI,
    drawCrownPlayer,
    crownBotThink,
    getCrownPlayerSpeed,
    drawCrownEntity,
    drawCrownWorldFX,
    spawnCrownShockwave,
    claimCrown,
    triggerCrownWin,
    findCentralPlatform,
    CROWN_CONFIG,
    crownState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = crownModuleExports;
  }

  return crownModuleExports;
})(typeof globalThis !== 'undefined' ? globalThis : this);
