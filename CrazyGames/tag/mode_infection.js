/**
 * ============================================================================
 * TAG! - INFECTION / ZOMBIE OUTBREAK MODE ('infection')
 * Production-Ready Game Mode Module
 * ============================================================================
 * 
 * Mechanics & Features:
 * 1. Rules & Flow:
 *    - Countdown selects Patient Zero randomly (or after 3s grace period).
 *    - Tags infect survivors (p.isInfected = true).
 *    - Zombies win if all survivors infected; Survivors win if timer expires.
 * 2. Dynamic Balancing & Rubberbanding:
 *    - Phase 1 (1 Infected vs 3+ Survivors):
 *        Patient Zero gets 1.22x speed (615 px/s), higher jump hold lift,
 *        and glowing toxic green slime trail.
 *    - Phase 2 (2v2 Infected vs Survivors):
 *        Infected get 1.08x speed (545 px/s), survivors normal (504 px/s).
 *    - Phase 3 (3+ Infected vs 1 Lone Survivor):
 *        Final survivor enters "Last Stand" mode:
 *        - 1.20x speed boost (605 px/s) + golden protective aura.
 *        - Repulsor pulse every 8s knocking nearby zombies back by 120px.
 *        - Zombie speed drops to normal (520 px/s).
 *        - Surviving round grants +250 Career XP and "Lone Survivor" accolade.
 * 3. Audio / Visual Polish:
 *    - Toxic slime particle emitter & dripping bubble trails.
 *    - Custom zombie faces (evil eyes, sharp teeth, drooling slime) & glowing skull badges.
 *    - Last Stand golden shield aura with rotating runes & repulsor shockwaves.
 *    - Pulsating danger vignette (crimson / toxic green / golden aura).
 * 4. Bot AI:
 *    - Zombie bots swarm nearest survivor, coordinate pincer flanks when 2+ zombies exist.
 *    - Survivor bots flee zombies, seek high ground, and use drop-through pink platforms.
 * 
 * Required Functions Exported:
 *   - initInfectionMode()
 *   - updateInfection(dt)
 *   - checkInfectionTag()
 *   - drawInfectionUI()
 *   - drawInfectionPlayer(p)
 *   - infectionBotThink(p, dt)
 * ============================================================================
 */

(function(root) {
  "use strict";

  // Safe global access
  const gScope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
  // Live bridge to engine globals. Top-level let/const (match, g, SOLIDS, CW/CH,
  // CAREER, NET) are NOT properties of window, so gScope.X reads undefined.
  // These helpers resolve the live lexical bindings instead (TDZ-safe).
  function Imatch(){ try{ return (typeof match !== 'undefined' && match) ? match : null; }catch(e){ return null; } }
  function Ictx(){ try{ if(typeof g !== 'undefined' && g && typeof g.save === 'function') return g; }catch(e){} try{ if(typeof window !== 'undefined' && window.renderCtx) return window.renderCtx; }catch(e){} try{ if(typeof cv !== 'undefined' && cv && cv.getContext) return cv.getContext('2d'); }catch(e){} try{ if(typeof document !== 'undefined'){ const c = document.getElementById('g'); if(c && c.getContext) return c.getContext('2d'); } }catch(e){} return null; }
  function Icw(){ try{ return (typeof CW !== 'undefined' && CW) ? CW : 800; }catch(e){ return 800; } }
  function Ich(){ try{ return (typeof CH !== 'undefined' && CH) ? CH : 600; }catch(e){ return 600; } }
  function Isolids(){ try{ return (typeof SOLIDS !== 'undefined' && SOLIDS) ? SOLIDS : []; }catch(e){ return []; } }
  function Inet(){ try{ return (typeof NET !== 'undefined' && NET) ? NET : null; }catch(e){ return null; } }
  function Icareer(){ try{ return (typeof CAREER !== 'undefined' && CAREER) ? CAREER : null; }catch(e){ return null; } }
  function IsaveCareer(){ try{ if(typeof saveCareer === 'function') return saveCareer; }catch(e){} if(typeof gScope.saveCareer === 'function') return gScope.saveCareer; return null; }


  // ============================================================================
  // CONSTANTS & TUNING
  // ============================================================================
  const INFECTION_CONFIG = {
    // Speeds in px/s
    SPEED_SURVIVOR_BASE: 504,
    SPEED_PATIENT_ZERO: 615,      // Phase 1: 1.22x
    SPEED_INFECTED_P2: 545,       // Phase 2: 1.08x
    SPEED_ZOMBIE_P3: 520,         // Phase 3: normal chase speed
    SPEED_LONE_SURVIVOR: 605,     // Phase 3: 1.20x

    // Jump tuning
    HOLD_LIFT_BASE: 0.10,
    HOLD_LIFT_PATIENT_ZERO: 0.15, // Higher jump lift for Patient Zero
    JUMP_V_BOOST_P0: 1.04,        // Extra tap jump velocity

    // Last Stand tuning
    REPULSOR_INTERVAL: 8.0,       // Seconds between repulsor shockwaves
    REPULSOR_RADIUS: 200,         // Distance within which zombies are repelled
    REPULSOR_KNOCKBACK: 120,      // Knockback distance in pixels
    REPULSOR_IMPULSE_X: 480,      // Velocity impulse X
    REPULSOR_IMPULSE_Y: -280,     // Velocity impulse Y (launches airborne)
    LONE_SURVIVOR_XP_BONUS: 250,  // Career XP bonus for surviving Last Stand

    // Colors
    COLOR_TOXIC_LIME: '#39ff14',
    COLOR_TOXIC_GREEN: '#22c55e',
    COLOR_TOXIC_DARK: '#15803d',
    COLOR_ZOMBIE_SKIN: '#1e3a2f',
    COLOR_GOLD_SHIELD: '#fbbf24',
    COLOR_GOLD_CORE: '#f59e0b',
    COLOR_GOLD_AURA: 'rgba(251, 191, 36, 0.45)',

    // Grace / countdown period before outbreak erupts
    OUTBREAK_COUNTDOWN: 3.0
  };

  // State container for active infection match
  const infectionState = {
    active: false,
    phase: 1, // 1: Patient Zero vs many, 2: 2v2, 3: Last Stand
    outbreakTimer: INFECTION_CONFIG.OUTBREAK_COUNTDOWN,
    outbreakTriggered: false,
    patientZeroSlot: -1,
    loneSurvivorSlot: -1,
    lastStandAnnounced: false,
    slimeParticles: [],
    shockwaves: [],
    vignettePulse: 0,
    roundWon: false
  };

  // ============================================================================
  // PARTICLES & SHOCKWAVE EFFECTS
  // ============================================================================

  /**
   * Adds a toxic slime particle to the simulation
   */
  function addSlimeParticle(x, y, vx, vy, size, col, grav) {
    if (infectionState.slimeParticles.length > 250) return;
    infectionState.slimeParticles.push({
      x: x,
      y: y,
      vx: vx || (Math.random() - 0.5) * 60,
      vy: vy || (Math.random() * 40 + 20),
      size: size || (Math.random() * 3.5 + 2),
      life: Math.random() * 0.4 + 0.3,
      maxLife: 0.7,
      col: col || INFECTION_CONFIG.COLOR_TOXIC_LIME,
      grav: grav !== undefined ? grav : 320
    });
  }

  /**
   * Creates an explosive toxic splatter when a player is infected
   */
  function addInfectionBurst(x, y) {
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 260 + 80;
      const col = (i % 3 === 0) ? '#a3e635' : (i % 2 === 0 ? '#22c55e' : '#39ff14');
      addSlimeParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 60,
        Math.random() * 5 + 3,
        col,
        450
      );
    }
  }

  /**
   * Creates a golden repulsor shockwave
   */
  function addRepulsorShockwave(x, y) {
    infectionState.shockwaves.push({
      x: x,
      y: y,
      r: 15,
      maxR: INFECTION_CONFIG.REPULSOR_RADIUS,
      life: 0.55,
      maxLife: 0.55
    });

    // Golden sparks radiating outward
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 280 + 120;
      if (typeof gScope.addP === 'function') {
        gScope.addP({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.45,
          max: 0.45,
          size: Math.random() * 4 + 2,
          col: '#fbbf24',
          grav: 0,
          shape: 0
        });
      }
    }
  }

  /**
   * Updates all mode-specific particles and shockwaves
   */
  function updateInfectionFX(dt) {
    // Update slime particles
    for (let i = infectionState.slimeParticles.length - 1; i >= 0; i--) {
      const p = infectionState.slimeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        infectionState.slimeParticles[i] = infectionState.slimeParticles[infectionState.slimeParticles.length - 1];
        infectionState.slimeParticles.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }

    // Update shockwaves
    for (let i = infectionState.shockwaves.length - 1; i >= 0; i--) {
      const sw = infectionState.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        infectionState.shockwaves[i] = infectionState.shockwaves[infectionState.shockwaves.length - 1];
        infectionState.shockwaves.pop();
        continue;
      }
      const progress = 1 - (sw.life / sw.maxLife);
      sw.r = 15 + (sw.maxR - 15) * Math.sin(progress * Math.PI * 0.5);
    }
  }

  // ============================================================================
  // AUDIO HELPER
  // ============================================================================
  function playInfectionSfx(type) {
    if (typeof gScope.sfx === 'function') {
      switch (type) {
        case 'outbreak':
          gScope.sfx('go');
          setTimeout(() => { if (typeof gScope.sfx === 'function') gScope.sfx('tag'); }, 120);
          break;
        case 'infect':
          gScope.sfx('tag');
          break;
        case 'repulsor':
          gScope.sfx('boost');
          break;
        case 'last_stand':
          gScope.sfx('win');
          break;
        case 'win_survivors':
          gScope.sfx('win');
          break;
        default:
          gScope.sfx(type);
      }
    }
  }

  // ============================================================================
  // INITIALIZATION: initInfectionMode()
  // ============================================================================
  /**
   * Initializes or restarts the Infection Mode.
   * Called on match start or countdown entry.
   */
  function initInfectionMode() {
    const match = Imatch();
    if (!match || !match.players || match.players.length === 0) return;

    match.infectionMode = true;
    infectionState.active = true;
    infectionState.phase = 1;
    infectionState.outbreakTimer = INFECTION_CONFIG.OUTBREAK_COUNTDOWN;
    infectionState.outbreakTriggered = false;
    infectionState.patientZeroSlot = -1;
    infectionState.loneSurvivorSlot = -1;
    infectionState.lastStandAnnounced = false;
    infectionState.slimeParticles = [];
    infectionState.shockwaves = [];
    infectionState.roundWon = false;

    // Reset infection properties on all players
    for (let i = 0; i < match.players.length; i++) {
      const p = match.players[i];
      p.isInfected = false;
      p.isPatientZero = false;
      p.isLoneSurvivor = false;
      p.repulsorTimer = INFECTION_CONFIG.REPULSOR_INTERVAL;
      p.repulsorFlash = 0;
      p.slimeEmitT = 0;
      p.lastStandAuraT = 0;
    }

    // Select Patient Zero randomly from active players
    const activeIndices = [];
    for (let i = 0; i < match.players.length; i++) {
      if (!match.players[i].isEliminated) activeIndices.push(i);
    }

    if (activeIndices.length > 0) {
      const pickIdx = activeIndices[Math.floor(Math.random() * activeIndices.length)];
      const patientZero = match.players[pickIdx];
      patientZero.isInfected = true;
      patientZero.isPatientZero = true;
      patientZero.infectionOrder = 0;
      match.it = pickIdx;
      infectionState.patientZeroSlot = patientZero.slot;

      // Spawn initial toxic burst
      addInfectionBurst(patientZero.x + patientZero.w / 2, patientZero.y + patientZero.h / 2);
    }

    evaluateInfectionPhase();

    if (typeof gScope.toast === 'function') {
      gScope.toast('☣️ INFECTION OUTBREAK! FLEE PATIENT ZERO!');
    }
    playInfectionSfx('outbreak');
  }

  // ============================================================================
  // PHASE & SPEED BALANCING RESOLUTION
  // ============================================================================

  /**
   * Evaluates current balance phase (Phase 1, Phase 2, or Phase 3 Last Stand).
   */
  function evaluateInfectionPhase() {
    const match = Imatch();
    if (!match || !match.players) return 1;

    const alivePlayers = match.players.filter(p => !p.isEliminated);
    const infected = alivePlayers.filter(p => p.isInfected);
    const survivors = alivePlayers.filter(p => !p.isInfected);

    let phase = 1;

    // Phase 3: Lone Survivor Last Stand — strictly 1 survivor vs 3+ infected
    // (prevents 1v1/1v2 endgames from wrongly granting 605 speed + repulsor)
    if (survivors.length === 1 && infected.length >= 3) {
      phase = 3;
      const lone = survivors[0];
      lone.isLoneSurvivor = true;
      infectionState.loneSurvivorSlot = lone.slot;

      // Reset isLoneSurvivor on any other player
      for (const p of match.players) {
        if (p !== lone) p.isLoneSurvivor = false;
      }

      if (!infectionState.lastStandAnnounced && match.state === 'playing') {
        infectionState.lastStandAnnounced = true;
        if (typeof gScope.toast === 'function') {
          gScope.toast('⚠️ LAST STAND! SURVIVE THE HORDE! (+250 XP BONUS)');
        }
        playInfectionSfx('last_stand');
        match.shake = Math.max(match.shake || 0, 10);
        match.flash = 0.2;
      }
    } else {
      // Clear lone survivor status if survivors > 1
      for (const p of match.players) {
        p.isLoneSurvivor = false;
      }
      infectionState.loneSurvivorSlot = -1;
      infectionState.lastStandAnnounced = false;

      // Phase 2: 2v2 (or balanced infected vs survivors)
      if (infected.length >= 2 && survivors.length >= 2 && infected.length === survivors.length) {
        phase = 2;
      } else if (infected.length === 1 && survivors.length >= 3) {
        // Phase 1: 1 Infected (Patient Zero) vs 3+ Survivors
        phase = 1;
      } else if (infected.length < survivors.length) {
        phase = 1;
      } else {
        phase = 2;
      }
    }

    infectionState.phase = phase;
    return phase;
  }

  /**
   * Returns dynamically adjusted run speed in px/s for player `p`.
   * Directly satisfies:
   * - Phase 1 (1v3+): Patient Zero = 615 px/s (1.22x), Survivors = 504 px/s.
   * - Phase 2 (2v2): Infected = 545 px/s (1.08x), Survivors = 504 px/s.
   * - Phase 3 (3+v1): Lone Survivor = 605 px/s (1.20x), Zombies = 520 px/s.
   */
  function getInfectionPlayerSpeed(p) {
    if (!p) return INFECTION_CONFIG.SPEED_SURVIVOR_BASE;
    const phase = infectionState.phase || evaluateInfectionPhase();

    if (phase === 3) {
      // Phase 3: Lone Survivor gets 1.20x speed boost ($605 px/s), Zombies drop to normal ($520 px/s)
      if (p.isLoneSurvivor) return INFECTION_CONFIG.SPEED_LONE_SURVIVOR;
      if (p.isInfected) return INFECTION_CONFIG.SPEED_ZOMBIE_P3;
      return INFECTION_CONFIG.SPEED_SURVIVOR_BASE;
    }

    if (phase === 2) {
      // Phase 2: Infected get 1.08x speed ($545 px/s), Survivors normal ($504 px/s)
      if (p.isInfected) return INFECTION_CONFIG.SPEED_INFECTED_P2;
      return INFECTION_CONFIG.SPEED_SURVIVOR_BASE;
    }

    // Phase 1: Patient Zero gets 1.22x speed ($615 px/s), Survivors normal ($504 px/s)
    if (p.isInfected || p.isPatientZero) return INFECTION_CONFIG.SPEED_PATIENT_ZERO;
    return INFECTION_CONFIG.SPEED_SURVIVOR_BASE;
  }

  /**
   * Returns extra jump hold duration for Patient Zero in Phase 1
   */
  function getInfectionHoldLift(p) {
    if (p && p.isInfected && infectionState.phase === 1) {
      return INFECTION_CONFIG.HOLD_LIFT_PATIENT_ZERO;
    }
    return INFECTION_CONFIG.HOLD_LIFT_BASE;
  }

  // ============================================================================
  // REPULSOR PULSE MECHANICS
  // ============================================================================

  /**
   * Triggers the 8-second repulsor pulse from the Lone Survivor,
   * knocking all nearby zombies back by 120px.
   */
  function triggerRepulsorPulse(survivor) {
    const match = Imatch();
    if (!match || !match.players || !survivor) return;

    const sx = survivor.x + survivor.w / 2;
    const sy = survivor.y + survivor.h / 2;

    // Add visual expanding shockwave
    addRepulsorShockwave(sx, sy);
    survivor.repulsorFlash = 0.5;
    playInfectionSfx('repulsor');

    if (match) {
      match.shake = Math.max(match.shake || 0, 7);
    }

    // Find and repel all nearby infected zombies
    for (let i = 0; i < match.players.length; i++) {
      const z = match.players[i];
      if (!z.isInfected || z.isEliminated || z === survivor) continue;

      const zx = z.x + z.w / 2;
      const zy = z.y + z.h / 2;
      const dx = zx - sx;
      const dy = zy - sy;
      const dist = Math.hypot(dx, dy);

      if (dist < INFECTION_CONFIG.REPULSOR_RADIUS) {
        // Outward normal vector
        const nx = dist > 0.001 ? (dx / dist) : (Math.random() < 0.5 ? -1 : 1);
        const ny = dist > 0.001 ? (dy / dist) : -0.5;

        // Knockback displacement (120px)
        z.x += nx * INFECTION_CONFIG.REPULSOR_KNOCKBACK;
        z.y += ny * (INFECTION_CONFIG.REPULSOR_KNOCKBACK * 0.4);

        // Apply dynamic velocity blast
        z.vx = nx * INFECTION_CONFIG.REPULSOR_IMPULSE_X;
        z.vy = INFECTION_CONFIG.REPULSOR_IMPULSE_Y;
        z.grounded = false;
        z.gp = null;

        // Safety clamp within arena walls
        const wallW = typeof gScope.WALL === 'number' ? gScope.WALL : 60;
        const arenaW = typeof gScope.W === 'number' ? gScope.W : 2400;
        const arenaH = typeof gScope.H === 'number' ? gScope.H : 1320;
        z.x = Math.max(wallW + 4, Math.min(arenaW - wallW - z.w - 4, z.x));
        z.y = Math.max(wallW + 4, Math.min(arenaH - wallW - z.h - 4, z.y));

        // Impact dust / burst
        if (typeof gScope.dust === 'function') {
          gScope.dust(zx, zy, 8, 140);
        }
      }
    }
  }

  // ============================================================================
  // TAGGING COLLISION & INFECTION: checkInfectionTag()
  // ============================================================================

  /**
   * Helper to compute bounding collision box
   */
  function getPlayerTagBox(p) {
    if (typeof gScope.tagBox === 'function') return gScope.tagBox(p);
    const pad = 5;
    return { x: p.x - pad, y: p.y - pad, w: p.w + 2 * pad, h: p.h + 2 * pad };
  }

  /**
   * Helper to check inclusive rectangle overlap
   */
  function boxesOverlap(a, b) {
    if (typeof gScope.hitRectInclusive === 'function') return gScope.hitRectInclusive(a, b);
    return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
  }

  /**
   * Checks collisions between infected hunters and healthy survivors.
   * Transmits infection on touch (p.isInfected = true) and triggers phase updates.
   */
  function checkInfectionTag() {
    const match = Imatch();
    if (!match || match.state !== 'playing' || match.cooldown > 0) return;
    const P = match.players;
    if (!P || P.length < 2) return;

    const __inet = Inet();
    const isOnline = (__inet && __inet.role !== null);
    const isOnlineGuest = isOnline && !__inet.isHost;

    const hunters = P.filter(p => p.isInfected && !p.isEliminated);
    const runners = P.filter(p => !p.isInfected && !p.isEliminated);

    for (const hunter of hunters) {
      const hBox = getPlayerTagBox(hunter);

      for (const runner of runners) {
        const rBox = getPlayerTagBox(runner);

        if (boxesOverlap(hBox, rBox)) {
          const popX = (hunter.x + runner.x) / 2 + runner.w / 2;
          const popY = (hunter.y + runner.y) / 2 + runner.h / 2;

          if (isOnlineGuest) {
            if (hunter.slot === __inet.mySlot && typeof gScope.netBroadcastReliable === 'function') {
              gScope.netBroadcastReliable({
                t: 'tag_claim',
                from: hunter.slot,
                target: runner.slot,
                x: popX, y: popY,
                hx: Math.round(hunter.x), hy: Math.round(hunter.y),
                tx: Math.round(runner.x), ty: Math.round(runner.y)
              });
              match.cooldown = 0.5;
            }
            return;
          }

          // Infect runner!
          runner.isInfected = true;
          runner.infectionOrder = P.filter(p => p.isInfected).length;
          runner.tagT = 0.5;

          // Increment hunter tags
          const hunterIdx = P.indexOf(hunter);
          if (match.tags) {
            match.tags[hunterIdx] = (match.tags[hunterIdx] || 0) + 1;
          }

          // Visual & Audio juice
          addInfectionBurst(popX, popY);
          if (typeof gScope.ringP === 'function') gScope.ringP(popX, popY, INFECTION_CONFIG.COLOR_TOXIC_LIME);
          playInfectionSfx('infect');

          match.shake = Math.max(match.shake || 0, 9);
          match.flash = 0.14;
          match.tagPop = {
            x: popX,
            y: popY,
            t: 0.65,
            who: P.indexOf(runner),
            hunter: hunterIdx,
            label: 'INFECTED! ☣️'
          };

          // Re-evaluate game balance phase
          evaluateInfectionPhase();

          // WIN CONDITION CHECK: All survivors infected? (Zombies Win)
          const remainingSurvivors = P.filter(p => !p.isInfected && !p.isEliminated);
          if (remainingSurvivors.length === 0) {
            match.result = {
              winningTeam: 'zombies',
              mode: 'infection',
              reason: 'all_infected',
              loser: -1
            };
            if (typeof gScope.endMatch === 'function') {
              gScope.endMatch();
            } else {
              match.state = 'result';
            }
            return;
          }

          match.cooldown = 0.35;
          return;
        }
      }
    }
  }

  // ============================================================================
  // UPDATE LOOP: updateInfection(dt)
  // ============================================================================

  /**
   * Main per-frame update for Infection Mode.
   * Handles:
   * - Slime particle trails for infected players
   * - Last Stand repulsor pulse countdown & trigger
   * - Timer expiry win condition (Survivors Win)
   * - Accolades and +250 XP payout
   */
  function updateInfection(dt) {
    const match = Imatch();
    if (!match) return;

    // Update particles & shockwaves
    updateInfectionFX(dt);

    if (match.state !== 'playing') return;

    // Evaluate phase continually
    evaluateInfectionPhase();

    // Update players
    for (let i = 0; i < match.players.length; i++) {
      const p = match.players[i];
      if (p.isEliminated) continue;

      // 1. Toxic Slime Trails for Infected Players
      if (p.isInfected) {
        p.slimeEmitT = (p.slimeEmitT || 0) + dt;
        // Emit more frequently for Patient Zero or when sprinting
        const emitInterval = p.isPatientZero ? 0.04 : 0.07;
        if (p.slimeEmitT >= emitInterval) {
          p.slimeEmitT = 0;
          const px = p.x + p.w / 2 + (Math.random() - 0.5) * (p.w * 0.7);
          const py = p.y + p.h - 4;
          const col = p.isPatientZero ? '#39ff14' : '#22c55e';
          addSlimeParticle(px, py, -p.vx * 0.15 + (Math.random() - 0.5) * 20, Math.random() * 20 + 10, Math.random() * 3 + 2, col, 200);
        }
      }

      // 2. Last Stand Lone Survivor Repulsor Timer
      if (p.isLoneSurvivor) {
        p.repulsorTimer = (p.repulsorTimer !== undefined ? p.repulsorTimer : INFECTION_CONFIG.REPULSOR_INTERVAL) - dt;
        if (p.repulsorFlash > 0) p.repulsorFlash -= dt;

        if (p.repulsorTimer <= 0) {
          triggerRepulsorPulse(p);
          p.repulsorTimer = INFECTION_CONFIG.REPULSOR_INTERVAL;
        }

        // Golden aura trail
        p.lastStandAuraT = (p.lastStandAuraT || 0) + dt;
        if (p.lastStandAuraT >= 0.05) {
          p.lastStandAuraT = 0;
          if (typeof gScope.addP === 'function') {
            gScope.addP({
              x: p.x + p.w / 2 + (Math.random() - 0.5) * p.w,
              y: p.y + p.h / 2 + (Math.random() - 0.5) * p.h,
              vx: (Math.random() - 0.5) * 30,
              vy: (Math.random() - 0.5) * 30 - 20,
              life: 0.35,
              max: 0.35,
              size: Math.random() * 3.5 + 2,
              col: '#fbbf24',
              grav: -50,
              shape: 0
            });
          }
        }
      }
    }

    // 3. Timer Expiry: Survivors Win!
    if (match.timer <= 0 && !infectionState.roundWon) {
      infectionState.roundWon = true;
      const survivingPlayers = match.players.filter(p => !p.isInfected && !p.isEliminated);

      match.result = {
        winningTeam: 'survivors',
        mode: 'infection',
        reason: 'survived',
        survivors: survivingPlayers.map(p => p.slot),
        _loneSurvivorBonus: (survivingPlayers.length === 1 ? survivingPlayers[0].slot : -1)
      };

      // Lone-survivor accolade/toast only for a true 1-person Last Stand.
      // The +250 XP is awarded once in careerRecordMatch via _loneSurvivorBonus
      // (prevents double-count with the generic match XP).
      try {
        if (survivingPlayers.length === 1) {
          const career = Icareer();
          if (career) {
            if (!career.accolades) career.accolades = [];
            if (!career.accolades.includes('Lone Survivor')) {
              career.accolades.push('Lone Survivor');
            }

            if (typeof gScope.toast === 'function') {
              gScope.toast('🏆 LONE SURVIVOR! +250 CAREER XP & ACCOLADE UNLOCKED!');
            }
            const __saveCareer = IsaveCareer();
            if (__saveCareer) {
              try{ __saveCareer(); }catch(e2){}
            }
          }
        }
      } catch (err) {
        // Safe failover for career persistence
      }

      playInfectionSfx('win_survivors');
      if (typeof gScope.endMatch === 'function') {
        gScope.endMatch();
      } else {
        match.state = 'result';
      }
    }
  }

  // ============================================================================
  // BOT AI INTEGRATION: infectionBotThink(p, dt)
  // ============================================================================

  /**
   * Advanced Bot AI decision making for Infection Mode.
   * - Zombie Bots: Chases nearest survivor, executes coordinated pincer flanks when 2+ zombies exist.
   * - Survivor Bots: Flee zombies, seek high ground, use drop-through pink platforms.
   * Returns: { dir: -1|0|1, jumpEdge: bool, jumpHeld: bool, downHeld: bool }
   */
  function infectionBotThink(p, dt) {
    if (!p) return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
    const match = Imatch();
    if (!match || !match.players) return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };

    const stepDt = (typeof dt === 'number' && dt > 0) ? Math.min(0.05, dt) : 0.016;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const W = typeof gScope.W === 'number' ? gScope.W : 2400;
    const H = typeof gScope.H === 'number' ? gScope.H : 1320;
    const WALL = typeof gScope.WALL === 'number' ? gScope.WALL : 60;
    const solids = Isolids();

    // Initialize bot state tracking if missing
    if (!p._botInfState) {
      p._botInfState = {
        dir: 0,
        jumpQ: false,
        jumpHoldT: 0,
        decideT: 0,
        pinkDropT: 0,
        highGroundT: 0
      };
    }
    const S = p._botInfState;
    S.decideT -= stepDt;
    if (S.pinkDropT > 0) S.pinkDropT -= stepDt;
    if (S.jumpHoldT > 0) S.jumpHoldT -= stepDt;

    // --------------------------------------------------------------------------
    // A. ZOMBIE BOT AI (Swarm & Coordinated Pincer Flank)
    // --------------------------------------------------------------------------
    if (p.isInfected) {
      const survivors = match.players.filter(s => !s.isInfected && !s.isEliminated);
      if (survivors.length === 0) {
        return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
      }

      // 1. Pick target survivor (closest overall)
      let bestDistSq = 1e12;
      let target = survivors[0];
      for (const s of survivors) {
        const dSq = (s.x - cx) ** 2 + (s.y - cy) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          target = s;
        }
      }

      const tx = target.x + target.w / 2;
      const ty = target.y + target.h / 2;
      const dx = tx - cx;
      const dy = ty - cy;

      // 2. Coordinated Pincer Flank when 2+ zombies exist
      const activeZombies = match.players.filter(z => z.isInfected && !z.isEliminated);
      let isFlanker = false;
      let flankTargetX = tx;

      if (activeZombies.length >= 2) {
        // Sort zombies by distance to target survivor
        const sortedZombies = activeZombies.slice().sort((a, b) => {
          const da = (a.x - tx) ** 2 + (a.y - ty) ** 2;
          const db = (b.x - tx) ** 2 + (b.y - ty) ** 2;
          return da - db;
        });

        const primaryChaser = sortedZombies[0];
        if (p !== primaryChaser) {
          isFlanker = true;
          // Flanker aims for the opposite flank to pinch survivor between zombies
          const chaserDx = primaryChaser.x - tx;
          const pinchOffset = (chaserDx < 0) ? 140 : -140;
          flankTargetX = clamp(tx + pinchOffset, WALL + 50, W - WALL - 50);
        }
      }

      const aimX = isFlanker ? flankTargetX : tx;
      const steerDx = aimX - cx;
      let wantDir = Math.abs(steerDx) > 14 ? Math.sign(steerDx) : (Math.sign(dx) || 1);

      // Jump & Pink drop navigation
      let jumpEdge = false;
      let downHeld = false;

      // If survivor is below on a lower tier and zombie is on a pink drop platform -> DROP!
      const onPinkDrop = typeof gScope.botFullyOnDrop === 'function' ? gScope.botFullyOnDrop(p) : (p.gp && p.gp.t === 'drop');
      if (onPinkDrop && dy > 45 && Math.abs(dx) < 240) {
        downHeld = true;
      }

      // Jump over obstacles / walls
      const wallAhead = typeof gScope.botWallAhead === 'function' ? gScope.botWallAhead(p, wantDir, 45) : false;
      const groundAhead = typeof gScope.botGroundAhead === 'function' ? gScope.botGroundAhead(p, wantDir, 65) : true;
      const headBlocked = typeof gScope.botSolidBetween === 'function' ? gScope.botSolidBetween(cx, p.y - 4, cx, p.y - 120, p.gp) : false;

      if (p.grounded) {
        if (wallAhead && !headBlocked) {
          jumpEdge = true;
          S.jumpHoldT = 0.14;
        } else if (!groundAhead && Math.abs(dx) > 60) {
          // Leap across gap
          jumpEdge = true;
          S.jumpHoldT = 0.15;
        } else if (dy < -50 && Math.abs(dx) < 220 && !headBlocked) {
          // Survivor is on high ground -> jump to scale platform!
          jumpEdge = true;
          S.jumpHoldT = p.isPatientZero ? 0.18 : 0.14;
        }
      } else {
        // Airborne: Wall kick or double jump
        if (p.sideT > 0 && p.wallJumps < 2) {
          jumpEdge = true;
          S.jumpHoldT = 0.14;
        } else if (p.airJumps > 0 && dy < -40 && p.vy > -80) {
          // Double jump apex chaining
          jumpEdge = true;
          S.jumpHoldT = 0.14;
        }
      }

      S.dir = wantDir;
      return {
        dir: wantDir,
        jumpEdge: jumpEdge,
        jumpHeld: jumpEdge || (S.jumpHoldT > 0),
        downHeld: downHeld
      };
    }

    // --------------------------------------------------------------------------
    // B. SURVIVOR BOT AI (Flee, Seek High Ground & Pink Drops)
    // --------------------------------------------------------------------------
    const activeZombies = match.players.filter(z => z.isInfected && !z.isEliminated);
    if (activeZombies.length === 0) {
      return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
    }

    // 1. Calculate weighted repulsion vector from all zombies
    let repelX = 0, repelY = 0;
    let nearestZombieDist = 1e12;
    let nearestZombie = activeZombies[0];

    for (const z of activeZombies) {
      const zx = z.x + z.w / 2;
      const zy = z.y + z.h / 2;
      const dist = Math.hypot(cx - zx, cy - zy);
      if (dist < nearestZombieDist) {
        nearestZombieDist = dist;
        nearestZombie = z;
      }
      const weight = 1200 / Math.max(35, dist);
      repelX += ((cx - zx) / (dist || 1)) * weight;
      repelY += ((cy - zy) / (dist || 1)) * weight;
    }

    const nzx = nearestZombie.x + nearestZombie.w / 2;
    const nzy = nearestZombie.y + nearestZombie.h / 2;
    const ndx = nzx - cx;
    const ndy = nzy - cy;

    let wantDir = Math.abs(repelX) > 0.5 ? Math.sign(repelX) : (-Math.sign(ndx) || 1);

    // Turn away from perimeter walls to avoid being cornered
    if (cx <= WALL + 100 && wantDir < 0) wantDir = 1;
    if (cx >= W - WALL - 100 && wantDir > 0) wantDir = -1;

    let jumpEdge = false;
    let downHeld = false;

    // 2. High Ground Seeking & Zoning:
    // If nearest zombie is below, hold upper platform!
    const zombieBelow = (nzy > cy + 65);
    const onSolidHighPlat = p.grounded && p.gp && p.gp.t !== 'drop';

    if (zombieBelow && onSolidHighPlat && nearestZombieDist > 160) {
      // Hold high ground: stay safely away from platform drop edges
      const platL = p.gp.x, platR = p.gp.x + p.gp.w;
      if (p.x < platL + 40 && wantDir < 0) wantDir = 1;
      if (p.x + p.w > platR - 40 && wantDir > 0) wantDir = -1;
      downHeld = false;
    } else if (!zombieBelow && nearestZombieDist < 280) {
      // Zombie is on same tier or above: jump to higher ground!
      if (p.grounded) {
        jumpEdge = true;
        S.jumpHoldT = 0.15;
      }
    }

    // 3. Pink Platform Juke & Drop:
    // If standing on a pink platform and zombie is sprinting on the same tier, drop through!
    const onPinkDrop = typeof gScope.botFullyOnDrop === 'function' ? gScope.botFullyOnDrop(p) : (p.gp && p.gp.t === 'drop');
    if (onPinkDrop && Math.abs(ndy) < 70 && nearestZombieDist < 200 && S.pinkDropT <= 0) {
      downHeld = true;
      S.pinkDropT = 1.8; // Cooldown between intentional drops
    }

    // 4. Corner Wall-Jump Flank:
    const cornerL = (p.x <= WALL + 90 && ndx > 0);
    const cornerR = (p.x + p.w >= W - WALL - 90 && ndx < 0);
    if ((cornerL || cornerR) && nearestZombieDist < 260) {
      // Leap overhead to wall-kick reverse over approaching zombie
      if (p.grounded || p.sideT > 0) {
        jumpEdge = true;
        S.jumpHoldT = 0.16;
        wantDir = cornerL ? 1 : -1;
      }
    }

    // 5. Gap / Wall clearing
    const wallAhead = typeof gScope.botWallAhead === 'function' ? gScope.botWallAhead(p, wantDir, 40) : false;
    const groundAhead = typeof gScope.botGroundAhead === 'function' ? gScope.botGroundAhead(p, wantDir, 70) : true;
    if (p.grounded && (wallAhead || !groundAhead)) {
      jumpEdge = true;
      S.jumpHoldT = 0.14;
    } else if (!p.grounded && p.airJumps > 0 && p.vy > 40) {
      jumpEdge = true;
      S.jumpHoldT = 0.13;
    }

    S.dir = wantDir;
    return {
      dir: wantDir,
      jumpEdge: jumpEdge,
      jumpHeld: jumpEdge || (S.jumpHoldT > 0),
      downHeld: downHeld
    };
  }

  // ============================================================================
  // RENDERING & VISUAL POLISH: drawInfectionPlayer(p)
  // ============================================================================

  /**
   * Renders infection-specific player graphics:
   * - Glowing toxic aura and evil/zombie face for infected
   * - Pulsing skull badge above infected players
   * - Golden protective shield aura and runes for Lone Survivor
   */
  function drawInfectionPlayer(p) {
    if (!p || p.isEliminated) return;
    const g = Ictx();
    if (!g) return;

    const tGlobal = gScope.tGlobal || (Date.now() * 0.001);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;

    // --------------------------------------------------------------------------
    // 1. INFECTED / ZOMBIE RENDERING
    // Character body itself is rendered in zombie green variant; no extra clutter/face/overlays.

    // --------------------------------------------------------------------------
    // 2. LONE SURVIVOR LAST STAND RENDERING
    // --------------------------------------------------------------------------
    if (p.isLoneSurvivor) {
      g.save();

      const pulse = 0.85 + 0.15 * Math.sin(tGlobal * 8);

      // Radiant golden glow
      g.shadowColor = '#ffd700';
      g.shadowBlur = 18 * pulse;

      // Double-layered golden energy shield
      g.lineWidth = 3.0;
      g.strokeStyle = 'rgba(251, 191, 36, 0.95)';
      if (typeof gScope.rr === 'function') {
        gScope.rr(g, p.x - 8, p.y - 8, p.w + 16, p.h + 16, 14);
        g.stroke();
      }

      g.lineWidth = 1.5;
      g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      if (typeof gScope.rr === 'function') {
        gScope.rr(g, p.x - 4, p.y - 4, p.w + 8, p.h + 8, 10);
        g.stroke();
      }

      // Rotating protective shield rune nodes (4 orbiting diamonds)
      for (let k = 0; k < 4; k++) {
        const angle = (tGlobal * 3.2) + (k * Math.PI * 0.5);
        const distR = p.w * 0.78;
        const rx = cx + Math.cos(angle) * distR;
        const ry = cy + Math.sin(angle) * distR;

        g.fillStyle = (k % 2 === 0) ? '#fbbf24' : '#ffffff';
        g.beginPath();
        g.moveTo(rx, ry - 4);
        g.lineTo(rx + 3.5, ry);
        g.lineTo(rx, ry + 4);
        g.lineTo(rx - 3.5, ry);
        g.closePath();
        g.fill();
      }

      // Flash on repulsor blast
      if (p.repulsorFlash > 0) {
        g.fillStyle = 'rgba(255, 255, 255, ' + (p.repulsorFlash * 1.5).toFixed(2) + ')';
        if (typeof gScope.rr === 'function') {
          gScope.rr(g, p.x - 12, p.y - 12, p.w + 24, p.h + 24, 16);
          g.fill();
        }
      }

      // Overhead Last Stand Badge & Repulsor Meter
      const badgeY = p.y - 20;
      if (typeof gScope.ptxt === 'function') {
        gScope.ptxt('🛡️ LAST STAND', cx, badgeY, typeof gScope.FN === 'function' ? gScope.FN(11, 900) : '900 11px sans-serif', '#fbbf24');
      }

      // Mini repulsor cooldown bar under badge
      const barW = 42, barH = 5;
      const barX = cx - barW / 2, barY = p.y - 10;
      const pct = Math.max(0, Math.min(1, 1 - ((p.repulsorTimer || 0) / INFECTION_CONFIG.REPULSOR_INTERVAL)));

      g.fillStyle = 'rgba(20, 20, 20, 0.75)';
      g.fillRect(barX, barY, barW, barH);
      g.fillStyle = pct >= 0.99 ? '#39ff14' : '#fbbf24';
      g.fillRect(barX + 1, barY + 1, (barW - 2) * pct, barH - 2);

      g.restore();
    }
  }

  // ============================================================================
  // HUD & UI POLISH: drawInfectionUI()
  // ============================================================================

  /**
   * Renders the Infection Mode HUD:
   * - Outbreak phase indicator & dynamic scoreboard
   * - Infected vs Survivor counters
   * - Lone Survivor repulsor pulse meter
   * - Red/Gold danger vignette
   */
  function drawInfectionUI() {
    const match = Imatch();
    if (!match) return;
    const g = Ictx();
    const CW = Icw();
    const CH = Ich();
    const tGlobal = gScope.tGlobal || (Date.now() * 0.001);

    // Draw background danger vignette
    drawInfectionVignette();

    // --------------------------------------------------------------------------
    // 1. TOP CENTER HUD PILL
    // --------------------------------------------------------------------------
    const P = match.players || [];
    const numInfected = P.filter(p => p.isInfected && !p.isEliminated).length;
    const numSurvivors = P.filter(p => !p.isInfected && !p.isEliminated).length;

    const pillW = Math.min(340, CW * 0.44);
    const pillH = 46;
    const pillX = CW / 2 - pillW / 2;
    const pillY = 8;
    const urgent = match.timer <= 10 && match.state === 'playing';

    g.save();

    // Main HUD chassis
    if (typeof gScope.rr === 'function') {
      gScope.rr(g, pillX, pillY, pillW, pillH, 12);
      g.fillStyle = urgent ? 'rgba(153, 27, 27, 0.94)' : 'rgba(15, 23, 42, 0.94)';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = infectionState.phase === 3 ? '#fbbf24' : (urgent ? '#ef4444' : '#22c55e');
      g.stroke();
    }

    // Time Remaining (Center)
    const timeStr = typeof gScope.fmtTime === 'function' ? gScope.fmtTime(match.timer) : Math.ceil(match.timer) + 's';
    if (typeof gScope.ptxt === 'function') {
      const timeFont = typeof gScope.FT === 'function' ? gScope.FT(20) : '900 20px sans-serif';
      gScope.ptxt(timeStr, CW / 2, pillY + 16, timeFont, urgent ? '#fff0f0' : '#ffffff');
    }

    // Left Chip: Infected Count
    const leftX = pillX + 16;
    if (typeof gScope.txt === 'function') {
      const statFont = typeof gScope.FN === 'function' ? gScope.FN(10, 900) : '900 10px sans-serif';
      gScope.txt('🧟 ' + numInfected + ' INFECTED', leftX, pillY + 16, statFont, '#86efac', 'left');
    }

    // Right Chip: Survivors Count
    const rightX = pillX + pillW - 16;
    if (typeof gScope.txt === 'function') {
      const statFont = typeof gScope.FN === 'function' ? gScope.FN(10, 900) : '900 10px sans-serif';
      gScope.txt('🏃 ' + numSurvivors + ' ALIVE', rightX, pillY + 16, statFont, '#38bdf8', 'right');
    }

    // Sub-banner beneath timer showing Current Balance Phase
    let phaseText = '☣️ PHASE 1: OUTBREAK';
    let phaseCol = '#86efac';
    if (infectionState.phase === 2) {
      phaseText = '⚔️ PHASE 2: BALANCED 2v2';
      phaseCol = '#facc15';
    } else if (infectionState.phase === 3) {
      phaseText = '🛡️ PHASE 3: LAST STAND!';
      phaseCol = '#fbbf24';
    }

    if (typeof gScope.txt === 'function') {
      const subFont = typeof gScope.FN === 'function' ? gScope.FN(8.5, 900) : '900 8.5px sans-serif';
      gScope.txt(phaseText, CW / 2, pillY + 34, subFont, phaseCol);
    }

    // --------------------------------------------------------------------------
    // 2. LONE SURVIVOR REPULSOR STATUS BAR (if active)
    // --------------------------------------------------------------------------
    const loneSurvivor = P.find(p => p.isLoneSurvivor && !p.isEliminated);
    if (loneSurvivor) {
      const rBarW = Math.min(220, pillW * 0.85);
      const rBarH = 18;
      const rBarX = CW / 2 - rBarW / 2;
      const rBarY = pillY + pillH + 6;

      if (typeof gScope.rr === 'function') {
        gScope.rr(g, rBarX, rBarY, rBarW, rBarH, 6);
        g.fillStyle = 'rgba(15, 23, 42, 0.90)';
        g.fill();
        g.lineWidth = 1.5;
        g.strokeStyle = '#fbbf24';
        g.stroke();

        const pct = Math.max(0, Math.min(1, 1 - ((loneSurvivor.repulsorTimer || 0) / INFECTION_CONFIG.REPULSOR_INTERVAL)));
        const fillW = Math.max(0, (rBarW - 4) * pct);
        g.fillStyle = pct >= 0.99 ? '#39ff14' : '#f59e0b';
        gScope.rr(g, rBarX + 2, rBarY + 2, fillW, rBarH - 4, 4);
        g.fill();
      }

      const repReady = (loneSurvivor.repulsorTimer || 0) <= 0.1;
      const repLabel = repReady ? '⚡ REPULSOR READY!' : ('⚡ PULSE IN ' + Math.ceil(loneSurvivor.repulsorTimer || 0) + 's');
      if (typeof gScope.ptxt === 'function') {
        const repFont = typeof gScope.FN === 'function' ? gScope.FN(9, 900) : '900 9px sans-serif';
        gScope.ptxt(repLabel, CW / 2, rBarY + rBarH / 2, repFont, repReady ? '#ffffff' : '#fef08a');
      }
    }

    g.restore();
  }

  /**
   * Renders the pulsating screen edge danger vignette
   */
  function drawInfectionVignette() {
    const g = Ictx();
    if (!g) return;
    const CW = Icw();
    const CH = Ich();
    const tGlobal = gScope.tGlobal || (Date.now() * 0.001);

    g.save();

    if (infectionState.phase === 3) {
      // Golden & Crimson Last Stand Danger Vignette
      const pulse = 0.25 + 0.15 * Math.sin(tGlobal * 7);
      const grad = g.createRadialGradient(CW / 2, CH / 2, CH * 0.35, CW / 2, CH / 2, CH * 0.95);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, 'rgba(239, 68, 68, ' + (pulse * 0.45).toFixed(2) + ')');
      grad.addColorStop(1, 'rgba(245, 158, 11, ' + (pulse * 0.75).toFixed(2) + ')');

      g.fillStyle = grad;
      g.fillRect(0, 0, CW, CH);
    } else {
      // Toxic Green & Dark Outbreak Vignette
      const pulse = 0.18 + 0.08 * Math.sin(tGlobal * 5);
      const grad = g.createRadialGradient(CW / 2, CH / 2, CH * 0.45, CW / 2, CH / 2, CH * 0.98);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(21, 128, 61, ' + pulse.toFixed(2) + ')');

      g.fillStyle = grad;
      g.fillRect(0, 0, CW, CH);
    }

    g.restore();
  }

  /**
   * Renders expanding shockwaves in world coordinates
   */
  function drawInfectionShockwaves() {
    const g = Ictx();
    if (!g || infectionState.shockwaves.length === 0) return;

    g.save();
    for (const sw of infectionState.shockwaves) {
      const alpha = Math.max(0, sw.life / sw.maxLife);
      g.lineWidth = 4.5 * alpha;
      g.strokeStyle = 'rgba(251, 191, 36, ' + alpha.toFixed(2) + ')';
      g.beginPath();
      g.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      g.stroke();

      g.lineWidth = 2.0 * alpha;
      g.strokeStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(2) + ')';
      g.beginPath();
      g.arc(sw.x, sw.y, Math.max(4, sw.r - 8), 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }

  /**
   * Renders mode slime particles in world coordinates
   */
  function drawInfectionSlime() {
    const g = Ictx();
    if (!g || infectionState.slimeParticles.length === 0) return;

    g.save();
    for (const p of infectionState.slimeParticles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      g.globalAlpha = alpha;
      g.fillStyle = p.col;
      g.beginPath();
      g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // ============================================================================
  // AUTO-INTEGRATION HOOKS FOR TAG! ENGINE
  // ============================================================================

  /**
   * Automatically hooks into TAG!'s engine functions if called in-game
   */
  function hookInfectionMode() {
    // Expose functions globally for direct use by index.html
    gScope.initInfectionMode = initInfectionMode;
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

  // Automatically execute hook
  hookInfectionMode();

  // CommonJS / Node Module Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      initInfectionMode,
      updateInfection,
      checkInfectionTag,
      drawInfectionUI,
      drawInfectionPlayer,
      drawInfectionShockwaves,
      drawInfectionSlime,
      infectionBotThink,
      getInfectionPlayerSpeed,
      getInfectionHoldLift,
      triggerRepulsorPulse,
      infectionState,
      INFECTION_CONFIG,
      hookInfectionMode
    };
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
