/* ==========================================================================
   BUNDLED MODE: CAPTURE THE FLAG (CTF)
   ========================================================================== */
/**
 * ============================================================================
 * TAG! - CAPTURE THE FLAG MODE ('ctf')
 * Production-Ready Game Mode Module
 * ============================================================================
 * 
 * Mechanics & Features:
 * 1. Mode Setup:
 *    - Mode ID: 'ctf', Mode Name: '🚩 CAPTURE THE FLAG'.
 *    - Red Team (Team 0, Left) vs Blue Team (Team 1, Right).
  *    - Supports 2, 3, 4 up to 10 players, works offline and online.
 *    - Target Captures: 3 (or 5, configurable in settings).
 * 2. Base & Flag Mechanics:
 *    - Dynamic platform bases: Red Base (Left) & Blue Base (Right).
 *    - Two flags: Red Flag at Red Base, Blue Flag at Blue Base.
 *    - Touching enemy flag picks it up (flag.state = 'carried').
 *    - Carrier moves at 1.0x normal speed (RUN_SPEED = 504 px/s).
 *    - Flag waves on carrier's back while running.
 * 3. Tagging & Return:
 *    - Opponent tagging the carrier instantly returns the flag to home base.
 *    - Tagged player respawns at home base after 1.5s with a 2.0s invulnerability shield.
 *    - Alternative "Drop on Tag" code preserved as commented-out option.
 * 4. Scoring & Victory:
 *    - Carrier captures by bringing enemy flag to own base pedestal while own flag is safe at home.
 *    - First to target captures wins immediately.
 *    - Highest score wins on timer expiry (Sudden Death if tied).
 * 5. Bot AI (Dynamic Priority):
 *    - Carrier sprints home to capture (or evades if own flag is stolen).
 *    - Defenders hunt enemy carrier to return flag.
 *    - Attackers sprint to enemy base to steal flag.
 * 6. Visuals & HUD:
 *    - Top banner scoreboard with live flag states and target chip.
 *    - Glowing neon base pedestals and holographic vertical beacons.
 *    - Animated cloth waving physics for flags.
 * ============================================================================
 */

(function(root) {
  "use strict";

  const gScope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : root);

  function Imatch(){ try{ return (typeof match !== 'undefined' && match) ? match : null; }catch(e){ return null; } }
  function Ictx(){ try{ if(typeof g !== 'undefined' && g && typeof g.save === 'function') return g; }catch(e){} try{ if(typeof window !== 'undefined' && window.renderCtx) return window.renderCtx; }catch(e){} try{ if(typeof cv !== 'undefined' && cv && cv.getContext) return cv.getContext('2d'); }catch(e){} try{ if(typeof document !== 'undefined'){ const c = document.getElementById('g'); if(c && c.getContext) return c.getContext('2d'); } }catch(e){} return null; }
  function Icw(){ try{ return (typeof CW !== 'undefined' && CW) ? CW : 800; }catch(e){ return 800; } }
  function Ich(){ try{ return (typeof CH !== 'undefined' && CH) ? CH : 600; }catch(e){ return 600; } }
  function Isolids(){ try{ return (typeof SOLIDS !== 'undefined' && SOLIDS) ? SOLIDS : []; }catch(e){ return []; } }
  function Iteams(){ try{ return (typeof TEAMS !== 'undefined' && TEAMS) ? TEAMS : []; }catch(e){ return []; } }
  function Isettings(){ try{ return (typeof settings !== 'undefined' && settings) ? settings : { ctfTargetCaptures: 3 }; }catch(e){ return { ctfTargetCaptures: 3 }; } }

  const CTF_CONFIG = {
    SPEED_NORMAL: 504,
    RESPAWN_DELAY: 1.5,
    SHIELD_DURATION: 2.0,
    DEFAULT_TARGET_CAPTURES: 3,
    FLAG_WIDTH: 44,
    FLAG_HEIGHT: 28,
    POLE_HEIGHT: 58,
    PEDESTAL_W: 84,
    PEDESTAL_H: 16,
    PICKUP_RADIUS: 34,
    CAPTURE_RADIUS: 42
  };

  const ctfState = {
    active: false,
    targetCaptures: 3,
    scores: [0, 0],
    lastCaptureTeam: null,
    bases: [
      { team: 0, x: 260, y: 720, w: 84, h: 16, plat: null },
      { team: 1, x: 2140, y: 720, w: 84, h: 16, plat: null }
    ],
    flags: [
      { team: 0, state: 'home', carrier: null, x: 260, y: 700, homeX: 260, homeY: 700, bobT: 0 },
      { team: 1, state: 'home', carrier: null, x: 2140, y: 700, homeX: 2140, homeY: 700, bobT: 0 }
    ],
    particles: [],
    shockwaves: [],
    floaters: [],
    banners: [],
    beaconAlpha: 0.8
  };

  function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

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

  function _ptxt(ctx, str, x, y, font, fill, align, lw) {
    if (typeof ptxt === 'function') { ptxt(str, x, y, font, fill, align, lw); return; }
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = lw || 3;
    ctx.strokeStyle = '#0a101d';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function _toast(str) {
    try { if (typeof toast === 'function') toast(str); } catch (e) {}
  }

  /* -------------------------------------------------------------------------
     Platform Base Detection: findCtfBases()
     Detects solid platform on far left (Red Base) and far right (Blue Base).
     ------------------------------------------------------------------------- */
  function findCtfBases() {
    const solids = Isolids();
    const arenaW = (typeof W !== 'undefined') ? W : 2400;
    const arenaH = (typeof H !== 'undefined') ? H : 1320;

    let redPlat = null, bluePlat = null;
    let redScore = 1e9, blueScore = 1e9;
    const redTargetX = arenaW * 0.16;
    const blueTargetX = arenaW * 0.84;
    const targetY = arenaH * 0.60;

    for (const s of solids) {
      if (s.wall || s.h > 80 || s.y >= arenaH - 85 || s.w < 80) continue;
      const px = s.x + s.w / 2;
      const py = s.y;

      // Left side candidate (Red Base)
      if (px < arenaW * 0.42) {
        const dx = px - redTargetX;
        const dy = (py - targetY) * 1.2;
        let score = Math.hypot(dx, dy);
        if (s.t === 'solid') score -= 80;
        if (s.y > arenaH - 240) score += 120;
        if (score < redScore) {
          redScore = score;
          redPlat = s;
        }
      }

      // Right side candidate (Blue Base)
      if (px > arenaW * 0.58) {
        const dx = px - blueTargetX;
        const dy = (py - targetY) * 1.2;
        let score = Math.hypot(dx, dy);
        if (s.t === 'solid') score -= 80;
        if (s.y > arenaH - 240) score += 120;
        if (score < blueScore) {
          blueScore = score;
          bluePlat = s;
        }
      }
    }

    const rx = redPlat ? (redPlat.x + redPlat.w / 2) : (arenaW * 0.16);
    const ry = redPlat ? (redPlat.y - 12) : (arenaH * 0.62);
    const bx = bluePlat ? (bluePlat.x + bluePlat.w / 2) : (arenaW * 0.84);
    const by = bluePlat ? (bluePlat.y - 12) : (arenaH * 0.62);

    return {
      red: { x: rx, y: ry, plat: redPlat },
      blue: { x: bx, y: by, plat: bluePlat }
    };
  }

  /* -------------------------------------------------------------------------
     Visual Helpers: Floaters, Banners, Shockwaves, Particles
     ------------------------------------------------------------------------- */
  function addCtfFloater(text, x, y, col, duration) {
    ctfState.floaters.push({
      text: text,
      x: x,
      y: y,
      vy: -45,
      col: col || '#ffffff',
      life: duration || 1.4,
      maxLife: duration || 1.4
    });
  }

  function addCtfBanner(text, x, y, col, duration) {
    ctfState.banners.push({
      text: text,
      x: x,
      y: y,
      col: col || '#ffd166',
      life: duration || 2.4,
      maxLife: duration || 2.4
    });
  }

  function spawnCtfShockwave(x, y, col) {
    ctfState.shockwaves.push({
      x: x,
      y: y,
      r: 10,
      maxR: 90,
      col: col || '#ffffff',
      life: 0.5,
      maxLife: 0.5
    });
  }

  function spawnCtfSparkles(x, y, col, count) {
    count = count || 16;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() * 0.4);
      const spd = 60 + Math.random() * 160;
      ctfState.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 30,
        grav: 180,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        size: 3 + Math.random() * 4,
        col: col || '#ffd700'
      });
    }
  }

  /* -------------------------------------------------------------------------
     Lifecycle: initCtfMode()
     ------------------------------------------------------------------------- */
  function initCtfMode() {
    ctfState.active = true;
    try {
      const glob = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : (typeof root !== 'undefined' ? root : {}));
      if (typeof BOMB_MODE !== 'undefined' && BOMB_MODE) BOMB_MODE.active = false;
      if (glob && glob.BOMB_MODE) glob.BOMB_MODE.active = false;
      if (typeof crownState !== 'undefined' && crownState) crownState.active = false;
      if (glob && glob.crownState) glob.crownState.active = false;
      if (typeof infectionState !== 'undefined' && infectionState) infectionState.active = false;
      if (glob && glob.infectionState) glob.infectionState.active = false;
    } catch (e) {}
    const sett = Isettings();
    ctfState.targetCaptures = (sett && sett.ctfTargetCaptures) ? sett.ctfTargetCaptures : CTF_CONFIG.DEFAULT_TARGET_CAPTURES;
    ctfState.scores = [0, 0];
    ctfState.lastCaptureTeam = null;
    ctfState.particles = [];
    ctfState.shockwaves = [];
    ctfState.floaters = [];
    ctfState.banners = [];

    const bases = findCtfBases();
    ctfState.bases[0] = { team: 0, x: bases.red.x, y: bases.red.y, w: CTF_CONFIG.PEDESTAL_W, h: CTF_CONFIG.PEDESTAL_H, plat: bases.red.plat };
    ctfState.bases[1] = { team: 1, x: bases.blue.x, y: bases.blue.y, w: CTF_CONFIG.PEDESTAL_W, h: CTF_CONFIG.PEDESTAL_H, plat: bases.blue.plat };

    ctfState.flags[0] = {
      team: 0,
      state: 'home',
      carrier: null,
      x: bases.red.x,
      y: bases.red.y - 20,
      homeX: bases.red.x,
      homeY: bases.red.y - 20,
      bobT: 0
    };
    ctfState.flags[1] = {
      team: 1,
      state: 'home',
      carrier: null,
      x: bases.blue.x,
      y: bases.blue.y - 20,
      homeX: bases.blue.x,
      homeY: bases.blue.y - 20,
      bobT: 0
    };

    const m = Imatch();
    if (m && m.players) {
      for (const p of m.players) {
        p.shieldT = 0;
        p.isRespawning = false;
        p.respawnT = 0;
      }
    }

    spawnCtfSparkles(bases.red.x, bases.red.y, '#e8433f', 20);
    spawnCtfSparkles(bases.blue.x, bases.blue.y, '#2f9be8', 20);
    addCtfBanner('🚩 CAPTURE THE FLAG! FIRST TO ' + ctfState.targetCaptures, (bases.red.x + bases.blue.x) / 2, Math.min(bases.red.y, bases.blue.y) - 90, '#ffd166', 3.0);
    _sfx('go');
  }

  /* -------------------------------------------------------------------------
     Update Tick: updateCtf(dt)
     ------------------------------------------------------------------------- */
  function updateCtf(dt) {
    if (!ctfState.active) return;
    dt = (typeof dt === 'number' && dt > 0) ? Math.min(0.1, dt) : (1 / 60);

    const m = Imatch();
    if (!m || !m.players) return;
    const inPlay = (m.state === 'playing');
    const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
    const isHostOrLocal = !isOnline || (NET && NET.isHost);

    // 1. Particle & VFX simulation
    for (let i = ctfState.particles.length - 1; i >= 0; i--) {
      const pt = ctfState.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { ctfState.particles.splice(i, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += (pt.grav || 100) * dt;
    }
    for (let i = ctfState.shockwaves.length - 1; i >= 0; i--) {
      const sw = ctfState.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) { ctfState.shockwaves.splice(i, 1); continue; }
      const f = 1 - (sw.life / sw.maxLife);
      sw.r = 10 + f * (sw.maxR - 10);
    }
    for (let i = ctfState.floaters.length - 1; i >= 0; i--) {
      const fl = ctfState.floaters[i];
      fl.life -= dt;
      if (fl.life <= 0) { ctfState.floaters.splice(i, 1); continue; }
      fl.y += fl.vy * dt;
    }
    for (let i = ctfState.banners.length - 1; i >= 0; i--) {
      const bn = ctfState.banners[i];
      bn.life -= dt;
      if (bn.life <= 0) { ctfState.banners.splice(i, 1); continue; }
    }

    // 2. Player respawn timers and shield decay
    for (const p of m.players) {
      if (p.shieldT > 0) {
        p.shieldT = Math.max(0, p.shieldT - dt);
      }
      if (p.isRespawning) {
        p.respawnT -= dt;
        p.vx = 0; p.vy = 0;
        const base = ctfState.bases[p.team != null ? (p.team % 2) : 0];
        if (base) {
          p.x = base.x - p.w / 2;
          p.y = base.y - p.h;
        }
        if (p.respawnT <= 0) {
          p.isRespawning = false;
          p.respawnT = 0;
          p.shieldT = CTF_CONFIG.SHIELD_DURATION;
          spawnCtfSparkles(p.x + p.w / 2, p.y + p.h / 2, p.team === 0 ? '#ff6b6b' : '#38bdf8', 18);
          _sfx('boost');
        }
      }
    }

    // 3. Flag physics & carrier tracking
    for (let t = 0; t < 2; t++) {
      const flag = ctfState.flags[t];
      flag.bobT += dt * 3;
      if (flag.state === 'home') {
        flag.x = flag.homeX;
        flag.y = flag.homeY + Math.sin(flag.bobT) * 4;
      } else if (flag.state === 'carried' && flag.carrier) {
        const c = flag.carrier;
        if (c.isEliminated || c.isRespawning) {
          // Carrier died or respawned -> return flag to home base
          flag.state = 'home';
          flag.carrier = null;
          flag.x = flag.homeX;
          flag.y = flag.homeY;
          addCtfFloater('FLAG RETURNED!', flag.homeX, flag.homeY - 30, t === 0 ? '#ff6b6b' : '#38bdf8', 1.8);
          _sfx('ui');
        } else {
          flag.x = c.x + c.w / 2;
          flag.y = c.y + c.h / 2 - 14;
          // Spawn carrier running sparkle trail
          if (Math.abs(c.vx) > 80 && Math.random() < 0.35) {
            ctfState.particles.push({
              x: flag.x - (c.face || 1) * 12,
              y: flag.y,
              vx: -(c.face || 1) * 30 + (Math.random() - 0.5) * 20,
              vy: -20 + (Math.random() - 0.5) * 20,
              grav: 60,
              life: 0.3,
              maxLife: 0.3,
              size: 3,
              col: t === 0 ? '#ff6b6b' : '#38bdf8'
            });
          }
        }
      } else if (flag.state === 'dropped') {
        // Fumbled flag lies where it fell: 20s to recover, then replays home.
        flag.dropTimer = (flag.dropTimer != null ? flag.dropTimer : 20) - dt;
        if (flag.dropTimer <= 0) {
          flag.state = 'home';
          flag.carrier = null;
          flag.x = flag.homeX;
          flag.y = flag.homeY;
          addCtfFloater('FLAG RETURNED!', flag.homeX, flag.homeY - 30, t === 0 ? '#ff6b6b' : '#38bdf8', 1.8);
        }
      }
    }

    if (!inPlay || !isHostOrLocal) return;

    // 4b. Dropped Flag Touch (teammate returns it / enemy picks it up)
    for (let t = 0; t < 2; t++) {
      const dFlag = ctfState.flags[t];
      if (!dFlag || dFlag.state !== 'dropped') continue;
      for (const p of m.players) {
        if (p.isEliminated || p.isRespawning) continue;
        const hitD = _hitRectInclusive(_tagBox(p), {
          x: dFlag.x - CTF_CONFIG.PICKUP_RADIUS,
          y: dFlag.y - CTF_CONFIG.PICKUP_RADIUS,
          w: CTF_CONFIG.PICKUP_RADIUS * 2,
          h: CTF_CONFIG.PICKUP_RADIUS * 2
        });
        if (!hitD) continue;
        if (p.team === t) {
          dFlag.state = 'home';
          dFlag.carrier = null;
          dFlag.x = dFlag.homeX;
          dFlag.y = dFlag.homeY;
          addCtfFloater('FLAG RETURNED!', dFlag.homeX, dFlag.homeY - 40, t === 0 ? '#ff6b6b' : '#38bdf8', 2.0);
          _toast('🛡️ ' + (t === 0 ? 'RED' : 'BLUE') + ' TEAM RECOVERED THEIR FLAG!');
          _sfx('ok');
        } else {
          dFlag.state = 'carried';
          dFlag.carrier = p;
          p.shieldT = 2.0;
          spawnCtfSparkles(dFlag.x, dFlag.y, t === 0 ? '#ff4757' : '#38bdf8', 24);
          addCtfFloater('FLAG RECOVERED! (SHIELDED)', dFlag.x, dFlag.y - 40, '#ffd166', 2.0);
          _toast('🚩 ' + (p.team === 0 ? 'RED' : 'BLUE') + ' TEAM RECOVERED THE FLAG!');
          _sfx('boost');
        }
        break;
      }
    }

    // 4. Flag Pickup Check (Runner touches enemy flag at base)
    for (let team = 0; team < 2; team++) {
      const enemyTeam = 1 - team;
      const enemyFlag = ctfState.flags[enemyTeam];
      if (enemyFlag.state === 'home') {
        for (const p of m.players) {
          if (p.isEliminated || p.isRespawning || p.team !== team) continue;
          const hit = _hitRectInclusive(_tagBox(p), {
            x: enemyFlag.x - CTF_CONFIG.PICKUP_RADIUS,
            y: enemyFlag.y - CTF_CONFIG.PICKUP_RADIUS,
            w: CTF_CONFIG.PICKUP_RADIUS * 2,
            h: CTF_CONFIG.PICKUP_RADIUS * 2
          });
          if (hit) {
            enemyFlag.state = 'carried';
            enemyFlag.carrier = p;
            p.shieldT = 2.0; // 2.0s anti-camp immunity on flag pickup
            spawnCtfSparkles(enemyFlag.x, enemyFlag.y, enemyTeam === 0 ? '#ff4757' : '#38bdf8', 24);
            addCtfFloater('FLAG STOLEN! (SHIELDED)', enemyFlag.x, enemyFlag.y - 40, '#ffd166', 2.0);
            _toast((team === 0 ? '🔴 RED' : '🔵 BLUE') + ' TEAM STOLE FLAG! (🛡️ 2s IMMUNITY)');
            _sfx('boost');
            break;
          }
        }
      }
    }

    // 5. Flag Capture Check (Carrier brings enemy flag to own base pedestal)
    for (let team = 0; team < 2; team++) {
      const enemyTeam = 1 - team;
      const enemyFlag = ctfState.flags[enemyTeam];
      const ownFlag = ctfState.flags[team];
      const ownBase = ctfState.bases[team];

      if (enemyFlag.state === 'carried' && enemyFlag.carrier && enemyFlag.carrier.team === team) {
        const carrier = enemyFlag.carrier;
        const hitBase = _hitRectInclusive(_tagBox(carrier), {
          x: ownBase.x - CTF_CONFIG.CAPTURE_RADIUS,
          y: ownBase.y - CTF_CONFIG.CAPTURE_RADIUS,
          w: CTF_CONFIG.CAPTURE_RADIUS * 2,
          h: CTF_CONFIG.CAPTURE_RADIUS * 2
        });

        if (hitBase) {
          // Precondition: Own team's flag MUST be safe at home base!
          if (ownFlag.state === 'home') {
            // CAPTURE SCORED!
            ctfState.scores[team]++;
            ctfState.lastCaptureTeam = team;
            enemyFlag.state = 'home';
            enemyFlag.carrier = null;
            enemyFlag.x = enemyFlag.homeX;
            enemyFlag.y = enemyFlag.homeY;

            spawnCtfShockwave(ownBase.x, ownBase.y, team === 0 ? '#ff4757' : '#38bdf8');
            spawnCtfSparkles(ownBase.x, ownBase.y, '#ffd700', 36);
            addCtfFloater('+1 CAPTURE!', ownBase.x, ownBase.y - 50, '#2ecc71', 2.4);
            addCtfBanner((team === 0 ? '🔴 RED' : '🔵 BLUE') + ' TEAM SCORED A CAPTURE!', ownBase.x, ownBase.y - 90, team === 0 ? '#ff6b6b' : '#38bdf8', 2.8);
            _toast('🚩 ' + (team === 0 ? 'RED' : 'BLUE') + ' TEAM CAPTURED A FLAG! (' + ctfState.scores[team] + '/' + ctfState.targetCaptures + ')');
            _sfx('win');

            // Victory Check: First to target captures wins!
            if (ctfState.scores[team] >= ctfState.targetCaptures) {
              triggerCtfWin(team);
              return;
            }
            // If in Sudden Death: first capture ends match!
            if (m.isSuddenDeath) {
              triggerCtfWin(team);
              return;
            }
          } else {
            // Own flag is stolen! Carrier cannot capture until flag is reclaimed.
            if (!carrier._warnThrottled || (Date.now() - carrier._warnThrottled > 2000)) {
              carrier._warnThrottled = Date.now();
              addCtfFloater('RECLAIM YOUR FLAG FIRST!', ownBase.x, ownBase.y - 40, '#f87171', 1.8);
              _toast('⚠️ OWN FLAG MUST BE AT BASE TO CAPTURE!');
              _sfx('back');
            }
          }
        }
      }
    }
  }

  /* -------------------------------------------------------------------------
     Tagging & Instant Return: checkCtfTag()
     ------------------------------------------------------------------------- */
  function isModeHost() {
    if (typeof NET === 'undefined' || !NET || NET.role === null) return true;
    return !!NET.isHost;
  }

  function checkCtfTag() {
    if (!ctfState.active) return;
    if (typeof isModeHost === 'function' && !isModeHost()) return;
    const m = Imatch();
    if (!m || m.state !== 'playing' || !m.players || m.players.length < 2) return;

    const P = m.players;
    const arenaW = (typeof W !== 'undefined') ? W : 2400;

    for (let i = 0; i < P.length; i++) {
      const p1 = P[i];
      if (p1.isEliminated || p1.isRespawning) continue;

      for (let j = i + 1; j < P.length; j++) {
        const p2 = P[j];
        if (p2.isEliminated || p2.isRespawning) continue;
        if (p1.team === p2.team) continue; // Teammates cannot tag each other

        const box1 = _tagBox(p1);
        const box2 = _tagBox(p2);
        if (!_hitRectInclusive(box1, box2)) continue;

        // One of the players must be susceptible to tag (shield protects)
        const p1HasShield = (p1.shieldT > 0);
        const p2HasShield = (p2.shieldT > 0);

        const p1HasEnemyFlag = (ctfState.flags[1 - p1.team] && ctfState.flags[1 - p1.team].carrier === p1);
        const p2HasEnemyFlag = (ctfState.flags[1 - p2.team] && ctfState.flags[1 - p2.team].carrier === p2);

        // Case FUMBLE: two carriers collide head-on -> both drop flags on the
        // spot + 0.8s stun. Loose flags are up for grabs (see dropped rules).
        if (p1HasEnemyFlag && p2HasEnemyFlag && !p1HasShield && !p2HasShield) {
          handleCtfFumble(p1, p2);
          continue;
        }
        // Case A: p1 has enemy flag and is tagged by defender p2
        if (p1HasEnemyFlag && !p1HasShield) {
          handleCtfTagCarrier(p2, p1, 1 - p1.team);
          continue;
        }
        // Case B: p2 has enemy flag and is tagged by defender p1
        if (p2HasEnemyFlag && !p2HasShield) {
          handleCtfTagCarrier(p1, p2, 1 - p2.team);
          continue;
        }

        // ONLY players carrying the enemy flag can be tagged. Non-carriers pass right through each other!
      }
    }
  }

  function handleCtfFumble(c1, c2){
    // Both carriers drop their flag where they stand + short stun.
    const drops = [
      { carrier: c1, flag: ctfState.flags[1 - c1.team] },
      { carrier: c2, flag: ctfState.flags[1 - c2.team] }
    ];
    for(const d of drops){
      if(!d.flag || d.flag.carrier !== d.carrier) continue;
      d.flag.state = 'dropped';
      d.flag.carrier = null;
      d.flag.x = d.carrier.x + d.carrier.w / 2;
      d.flag.y = d.carrier.y + d.carrier.h / 2;
      d.flag.dropTimer = 20.0;
      d.carrier.fumbleT = 0.8;
      d.carrier.vx = 0; d.carrier.vy = 0;
      spawnCtfShockwave(d.flag.x, d.flag.y, '#ffd166');
      spawnCtfSparkles(d.flag.x, d.flag.y, '#ffd166', 20);
    }
    addCtfFloater('💥 FLAG FUMBLE!', (c1.x + c2.x) / 2, Math.min(c1.y, c2.y) - 30, '#ffd166', 2.0);
    _toast('💥 CARRIERS COLLIDE — BOTH FLAGS DROPPED!');
    _sfx('tag');
  }

  function handleCtfTagCarrier(defender, carrier, flagTeam) {
    const flag = ctfState.flags[flagTeam];

    /* =========================================================================
     * ALTERNATIVE CTF RULE: DROP ON TAG + TOUCH TO RETURN
     * =========================================================================
     * To switch from Instant Return to Drop on Tag:
     * 1. Set flag state to 'dropped':
     *    flag.state = 'dropped';
     *    flag.carrier = null;
     *    flag.x = carrier.x + carrier.w / 2;
     *    flag.y = carrier.y + carrier.h / 2;
     *    flag.dropTimer = 20.0;
     * 2. In update loop:
     *    - If teammate touches dropped flag: returns home instantly.
     *    - If enemy touches dropped flag: enemy picks it back up!
     * ========================================================================= */

    // DEFAULT RULE: INSTANT RETURN TO HOME BASE
    flag.state = 'home';
    flag.carrier = null;
    flag.x = flag.homeX;
    flag.y = flag.homeY;

    // Carrier eliminated & queues 1.5s respawn
    carrier.isRespawning = true;
    carrier.respawnT = CTF_CONFIG.RESPAWN_DELAY;
    carrier.vx = 0; carrier.vy = 0;

    spawnCtfShockwave(carrier.x + carrier.w / 2, carrier.y + carrier.h / 2, '#ffffff');
    spawnCtfSparkles(carrier.x + carrier.w / 2, carrier.y + carrier.h / 2, defender.team === 0 ? '#ff4757' : '#38bdf8', 24);
    spawnCtfSparkles(flag.homeX, flag.homeY, defender.team === 0 ? '#ff4757' : '#38bdf8', 20);

    addCtfFloater('FLAG RETURNED!', flag.homeX, flag.homeY - 40, defender.team === 0 ? '#ff6b6b' : '#38bdf8', 2.0);
    addCtfFloater('CARRIER TAGGED!', carrier.x + carrier.w / 2, carrier.y - 20, '#f87171', 1.8);
    _toast('🛡️ ' + (defender.team === 0 ? 'RED' : 'BLUE') + ' TEAM RETURNED THEIR FLAG!');
    _sfx('tag');
  }

  function handleCtfTagIntruder(defender, intruder) {
    intruder.isRespawning = true;
    intruder.respawnT = CTF_CONFIG.RESPAWN_DELAY;
    intruder.vx = 0; intruder.vy = 0;

    spawnCtfSparkles(intruder.x + intruder.w / 2, intruder.y + intruder.h / 2, defender.team === 0 ? '#ff4757' : '#38bdf8', 18);
    addCtfFloater('TAGGED!', intruder.x + intruder.w / 2, intruder.y - 20, '#f87171', 1.6);
    _toast((defender.team === 0 ? '🔴 RED' : '🔵 BLUE') + ' DEFENDER TAGGED AN INTRUDER!');
    _sfx('tag');
  }

  /* -------------------------------------------------------------------------
     Victory Trigger: triggerCtfWin(winningTeam)
     ------------------------------------------------------------------------- */
  function triggerCtfWin(winningTeam) {
    if (typeof isModeHost === 'function' && !isModeHost()) return;
    const m = Imatch();
    if (!m) return;
    m.result = {
      winningTeam: winningTeam,
      mode: 'ctf',
      scores: [ctfState.scores[0], ctfState.scores[1]],
      reason: 'target_reached'
    };
    if (typeof endMatch === 'function') endMatch();
  }

  /* -------------------------------------------------------------------------
     Helper: Draw High-Detail Swallowtail Pennant Flag
     ------------------------------------------------------------------------- */
  function drawPennantBanner(g, poleX, topY, fw, fh, dir, team, tG, isCarried, isStolen) {
    g.save();
    const baseCol = team === 0 ? '#dc2626' : '#2563eb';
    const brightCol = team === 0 ? '#ff6b6b' : '#38bdf8';
    const deepCol = team === 0 ? '#881337' : '#1e3a8a';
    const trimCol = '#fef08a';

    const waveFreq = isCarried ? 16.0 : 6.0;
    const waveAmp = isCarried ? 7.0 : 4.5;
    const w1 = Math.sin(tG * waveFreq) * waveAmp;
    const w2 = Math.cos(tG * (waveFreq * 1.35)) * (waveAmp * 0.55);
    const w3 = Math.sin(tG * (waveFreq * 0.8) + 1.2) * (waveAmp * 0.65);

    // Tips of swallowtail fork
    const tipTopX = poleX + dir * fw;
    const tipTopY = topY + w1;

    const tipBtmX = poleX + dir * fw;
    const tipBtmY = topY + fh + w2;

    // Inner chevron notch cut inward
    const notchX = poleX + dir * (fw * 0.66);
    const notchY = topY + fh * 0.5 + w3;

    if (isStolen) {
      // Pulsing holographic wireframe for stolen home flag
      g.setLineDash([4, 4]);
      g.lineWidth = 2.0;
      g.strokeStyle = team === 0 ? 'rgba(244, 63, 94, 0.75)' : 'rgba(56, 189, 248, 0.75)';
      g.beginPath();
      g.moveTo(poleX, topY);
      g.lineTo(tipTopX, tipTopY);
      g.lineTo(notchX, notchY);
      g.lineTo(tipBtmX, tipBtmY);
      g.lineTo(poleX, topY + fh);
      g.closePath();
      g.stroke();
      g.restore();
      return;
    }

    // Dynamic S-curve swallowtail pennant path
    g.beginPath();
    g.moveTo(poleX, topY);

    // Top rippling edge
    const cp1X = poleX + dir * (fw * 0.38);
    const cp1Y = topY - w2 * 0.75;
    const cp2X = poleX + dir * (fw * 0.72);
    const cp2Y = topY + w1 * 1.05;
    g.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipTopX, tipTopY);

    // Inner fork notch
    g.lineTo(notchX, notchY);

    // Bottom fork tip
    g.lineTo(tipBtmX, tipBtmY);

    // Bottom rippling edge back to pole
    const cp3X = poleX + dir * (fw * 0.72);
    const cp3Y = topY + fh + w1 * 0.85;
    const cp4X = poleX + dir * (fw * 0.38);
    const cp4Y = topY + fh - w2 * 0.55;
    g.bezierCurveTo(cp3X, cp3Y, cp4X, cp4Y, poleX, topY + fh);
    g.closePath();

    // 1. Silk cloth gradient fill
    const clothGrad = g.createLinearGradient(poleX, topY, tipTopX, topY);
    clothGrad.addColorStop(0.0, brightCol);
    clothGrad.addColorStop(0.45, baseCol);
    clothGrad.addColorStop(1.0, deepCol);
    g.fillStyle = clothGrad;
    g.fill();

    // 2. Wave specular shading ripples across silk
    const shadeGrad = g.createLinearGradient(poleX, topY, tipTopX, topY);
    shadeGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.22)');
    shadeGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.20)');
    shadeGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.28)');
    shadeGrad.addColorStop(0.78, 'rgba(0, 0, 0, 0.22)');
    shadeGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.12)');
    g.fillStyle = shadeGrad;
    g.fill();

    // 3. Embroidered golden silk trim border
    g.strokeStyle = trimCol;
    g.lineWidth = 1.8;
    g.stroke();

    // 4. Team Heraldic Insignia in center of pennant field
    const emblemX = poleX + dir * (fw * 0.36);
    const emblemY = topY + fh * 0.5 + 1 + (w1 + w2) * 0.25;
    const emblemIcon = team === 0 ? '🔥' : '⚡';
    _txt(g, emblemIcon, emblemX, emblemY, _fn(Math.round(fh * 0.52), 900), '#ffffff', 'center');

    g.restore();
  }

  /* -------------------------------------------------------------------------
     Rendering: World Pedestals, Beacons, Flags & FX
     ------------------------------------------------------------------------- */
  function drawCtfEntities() {
    if (!ctfState.active) return;
    const g = Ictx();
    if (!g) return;

    const tG = (typeof tGlobal !== 'undefined') ? tGlobal : (Date.now() / 1000);

    // Render Red Base (0) and Blue Base (1)
    for (let t = 0; t < 2; t++) {
      const base = ctfState.bases[t];
      const flag = ctfState.flags[t];
      const baseCol = t === 0 ? '#dc2626' : '#2563eb';
      const brightCol = t === 0 ? '#ff6b6b' : '#38bdf8';
      const glowCol = t === 0 ? 'rgba(220, 38, 38, ' : 'rgba(37, 99, 235, ';

      g.save();

      // 1. Majestic Volumetric Conical Beacon Beam
      const beamH = 680;
      const beamBaseW = 56 + Math.sin(tG * 3 + t) * 6;
      const beamTopW = 130 + Math.sin(tG * 2.5 + t) * 12;

      const beamGrad = g.createLinearGradient(base.x, base.y - beamH, base.x, base.y);
      beamGrad.addColorStop(0, glowCol + '0)');
      beamGrad.addColorStop(0.35, glowCol + '0.04)');
      beamGrad.addColorStop(0.75, glowCol + '0.14)');
      beamGrad.addColorStop(1, glowCol + '0.35)');

      g.beginPath();
      g.moveTo(base.x - beamBaseW / 2, base.y);
      g.lineTo(base.x - beamTopW / 2, base.y - beamH);
      g.lineTo(base.x + beamTopW / 2, base.y - beamH);
      g.lineTo(base.x + beamBaseW / 2, base.y);
      g.closePath();
      g.fillStyle = beamGrad;
      g.fill();

      // Central vertical ray core
      const coreW = 6 + Math.sin(tG * 6 + t) * 2;
      const coreGrad = g.createLinearGradient(base.x, base.y - beamH, base.x, base.y);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreGrad.addColorStop(0.4, glowCol + '0.15)');
      coreGrad.addColorStop(1, '#ffffff');
      g.fillStyle = coreGrad;
      g.fillRect(base.x - coreW / 2, base.y - beamH, coreW, beamH);

      // Ascending energy motes inside beam volume
      for (let m = 0; m < 5; m++) {
        const motePhase = (tG * 75 + m * 137 + t * 50) % beamH;
        const moteY = base.y - motePhase;
        const progress = motePhase / beamH;
        const curMoteSpan = beamBaseW + (beamTopW - beamBaseW) * progress;
        const moteX = base.x + Math.sin(tG * 2.2 + m * 1.8) * (curMoteSpan * 0.35);
        const moteAlpha = Math.sin(progress * Math.PI) * 0.75;
        g.beginPath();
        g.arc(moteX, moteY, 2.5 + (m % 2), 0, Math.PI * 2);
        g.fillStyle = brightCol;
        g.globalAlpha = moteAlpha;
        g.fill();
        g.globalAlpha = 1.0;
      }

      // 2. Base Platform Pedestal Altar
      const pw = base.w;
      const ph = base.h;
      const px = base.x - pw / 2;
      const py = base.y;

      // Lower Plinth Tier
      _rr(g, px - 6, py + 4, pw + 12, ph - 2, 4);
      g.fillStyle = '#090d16';
      g.fill();
      g.strokeStyle = glowCol + '0.45)';
      g.lineWidth = 1.5;
      g.stroke();

      // Main Upper Altar Slab
      _rr(g, px, py, pw, ph, 5);
      const pedGrad = g.createLinearGradient(px, py, px, py + ph);
      pedGrad.addColorStop(0, '#1e293b');
      pedGrad.addColorStop(0.5, '#0f172a');
      pedGrad.addColorStop(1, '#020617');
      g.fillStyle = pedGrad;
      g.fill();
      g.lineWidth = 2.0;
      g.strokeStyle = brightCol;
      g.stroke();

      // Glowing core line inside pedestal
      g.beginPath();
      g.moveTo(px + 10, py + ph / 2);
      g.lineTo(px + pw - 10, py + ph / 2);
      g.lineWidth = 2.0;
      g.strokeStyle = brightCol;
      g.stroke();

      // Concentric Pulsing Base Beacon Rings on pedestal floor
      const ringPulse1 = 28 + Math.sin(tG * 4 + t) * 2.5;
      const ringPulse2 = 16 + Math.cos(tG * 3 + t) * 1.5;
      g.beginPath();
      g.ellipse(base.x, py + 2, ringPulse1, 7, 0, 0, Math.PI * 2);
      g.strokeStyle = brightCol;
      g.lineWidth = 1.8;
      g.stroke();

      g.beginPath();
      g.ellipse(base.x, py + 2, ringPulse2, 4, 0, 0, Math.PI * 2);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.2;
      g.stroke();

      // Energetic flux dots circulating on the ring
      for (let c = 0; c < 3; c++) {
        const ang = tG * 2.8 + c * (Math.PI * 2 / 3);
        const dotX = base.x + Math.cos(ang) * ringPulse1;
        const dotY = py + 2 + Math.sin(ang) * 7;
        g.beginPath();
        g.arc(dotX, dotY, 2, 0, Math.PI * 2);
        g.fillStyle = '#ffffff';
        g.fill();
      }

      // Base Team Label Pill
      const pillW = 86;
      const pillH = 18;
      _rr(g, base.x - pillW / 2, py + ph + 4, pillW, pillH, 5);
      g.fillStyle = 'rgba(10, 16, 26, 0.90)';
      g.fill();
      g.strokeStyle = brightCol;
      g.lineWidth = 1.5;
      g.stroke();
      _txt(g, (t === 0 ? '🔴 RED BASE' : '🔵 BLUE BASE'), base.x, py + ph + 13, _fn(9, 900), '#ffffff', 'center');

      // 3. Flag Pole & Finial
      const poleX = base.x;
      const poleBaseY = py;
      const poleTopY = py - CTF_CONFIG.POLE_HEIGHT;

      // Pole Socket Bracket on base
      _rr(g, poleX - 7, poleBaseY - 5, 14, 6, 2);
      g.fillStyle = '#64748b';
      g.fill();
      g.strokeStyle = '#cbd5e1';
      g.lineWidth = 1.0;
      g.stroke();

      // Flagpole - shaded 3D gradient cylinder
      const poleGrad = g.createLinearGradient(poleX - 2.5, poleBaseY, poleX + 2.5, poleBaseY);
      poleGrad.addColorStop(0, '#64748b');
      poleGrad.addColorStop(0.35, '#f8fafc');
      poleGrad.addColorStop(0.7, '#94a3b8');
      poleGrad.addColorStop(1, '#334155');

      g.beginPath();
      g.moveTo(poleX, poleBaseY);
      g.lineTo(poleX, poleTopY);
      g.lineWidth = 4.5;
      g.strokeStyle = poleGrad;
      g.stroke();

      // Golden Cross Collar below finial
      g.beginPath();
      g.ellipse(poleX, poleTopY + 2, 4.5, 2, 0, 0, Math.PI * 2);
      g.fillStyle = '#cbd5e1';
      g.fill();

      // Spearhead Finial (Golden Lance)
      g.beginPath();
      g.moveTo(poleX, poleTopY - 10);
      g.lineTo(poleX + 5, poleTopY - 1);
      g.lineTo(poleX, poleTopY + 1);
      g.lineTo(poleX - 5, poleTopY - 1);
      g.closePath();
      const goldGrad = g.createLinearGradient(poleX - 5, poleTopY - 10, poleX + 5, poleTopY + 1);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.5, '#eab308');
      goldGrad.addColorStop(1, '#a16207');
      g.fillStyle = goldGrad;
      g.fill();
      g.strokeStyle = '#fef9c3';
      g.lineWidth = 1.0;
      g.stroke();

      // Radiant Star Flare on Finial Tip
      const flareSize = 3.5 + Math.sin(tG * 6 + t) * 1.0;
      g.beginPath();
      g.arc(poleX, poleTopY - 10, flareSize * 0.7, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255, 255, 255, 0.9)';
      g.fill();

      // 4. Planted Home Flag Cloth (or Ghost Wireframe if stolen)
      const fw = CTF_CONFIG.FLAG_WIDTH;
      const fh = CTF_CONFIG.FLAG_HEIGHT;
      const clothDir = t === 0 ? 1 : -1;

      if (flag.state === 'home') {
        drawPennantBanner(g, poleX, poleTopY + 3, fw, fh, clothDir, t, tG, false, false);
      } else {
        drawPennantBanner(g, poleX, poleTopY + 3, fw, fh, clothDir, t, tG, false, true);

        // Warning Hologram Floater above pole
        const warnY = poleTopY - 22;
        const warnPulse = 0.8 + 0.2 * Math.sin(tG * 8);
        _rr(g, poleX - 48, warnY - 9, 96, 18, 4);
        g.fillStyle = 'rgba(15, 23, 42, 0.90)';
        g.fill();
        g.strokeStyle = t === 0 ? '#f43f5e' : '#38bdf8';
        g.lineWidth = 1.2;
        g.stroke();
        _txt(g, '⚠️ STOLEN!', poleX, warnY + 1, _fn(9, 900), (t === 0 ? '#fda4af' : '#7dd3fc'), 'center');
      }

      g.restore();
    }
  }

  function drawCtfWorldFX() {
    if (!ctfState.active) return;
    const g = Ictx();
    if (!g) return;

    // 1. Shockwaves
    for (const sw of ctfState.shockwaves) {
      g.save();
      const alpha = sw.life / sw.maxLife;
      g.beginPath();
      g.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      g.strokeStyle = sw.col;
      g.lineWidth = 3.5 * alpha;
      g.globalAlpha = alpha;
      g.stroke();
      g.restore();
    }

    // 2. Particles
    for (const pt of ctfState.particles) {
      g.save();
      const alpha = pt.life / pt.maxLife;
      g.beginPath();
      g.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
      g.fillStyle = pt.col;
      g.globalAlpha = alpha;
      g.fill();
      g.restore();
    }

    // 3. Floating texts
    for (const fl of ctfState.floaters) {
      const alpha = _clamp(fl.life / (fl.maxLife * 0.4), 0, 1);
      _ptxt(g, fl.text, fl.x, fl.y, _fn(13, 900), fl.col, 'center', 3);
    }

    // 4. World Banners
    for (const bn of ctfState.banners) {
      const alpha = _clamp(bn.life / (bn.maxLife * 0.3), 0, 1);
      _rr(g, bn.x - 140, bn.y - 18, 280, 36, 18);
      g.fillStyle = 'rgba(15, 23, 42, ' + (0.92 * alpha) + ')';
      g.fill();
      g.strokeStyle = bn.col;
      g.lineWidth = 2.0;
      g.globalAlpha = alpha;
      g.stroke();
      _txt(g, bn.text, bn.x, bn.y + 1, _fn(12, 900), bn.col, 'center', alpha);
    }
  }

  /* -------------------------------------------------------------------------
     Player Rendering: Flag Carrier Backpack & Shield Dome
     ------------------------------------------------------------------------- */
  function drawCtfPlayer(p) {
    if (!ctfState.active || !p || p.isEliminated) return;
    const g = Ictx();
    if (!g) return;

    const tG = (typeof tGlobal !== 'undefined') ? tGlobal : (Date.now() / 1000);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const fdir = p.face || 1;

    // 1. Invulnerability Shield Dome (2.0s post-respawn)
    if (p.shieldT > 0) {
      g.save();
      const shieldR = p.w * 0.88 + Math.sin(tG * 12 + p.slot) * 2;
      const remFrac = p.shieldT / CTF_CONFIG.SHIELD_DURATION;

      // Shield sphere fill
      const shieldGrad = g.createRadialGradient(cx, cy, 6, cx, cy, shieldR);
      shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      shieldGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.30)');
      shieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0.65)');
      g.fillStyle = shieldGrad;
      g.beginPath();
      g.arc(cx, cy, shieldR, 0, Math.PI * 2);
      g.fill();

      // Outer sweep countdown arc
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 3.0;
      g.beginPath();
      g.arc(cx, cy, shieldR, -Math.PI / 2, -Math.PI / 2 + remFrac * Math.PI * 2);
      g.stroke();

      // Shield remaining label pill
      _rr(g, cx - 34, cy - shieldR - 16, 68, 16, 4);
      g.fillStyle = 'rgba(15, 23, 42, 0.90)';
      g.fill();
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 1.2;
      g.stroke();
      _txt(g, '🛡️ SHIELD ' + p.shieldT.toFixed(1) + 's', cx, cy - shieldR - 8, _fn(8.5, 900), '#7dd3fc', 'center');

      g.restore();
    }

    // 2. Ghostly respawn counter circle (if player is respawning)
    if (p.isRespawning) {
      g.save();
      g.globalAlpha = 0.45 + 0.25 * Math.sin(tG * 8);
      _rr(g, cx - 30, cy - 36, 60, 20, 6);
      g.fillStyle = 'rgba(15, 23, 42, 0.9)';
      g.fill();
      g.strokeStyle = '#f87171';
      g.lineWidth = 1.5;
      g.stroke();
      _txt(g, 'RESPAWN ' + p.respawnT.toFixed(1) + 's', cx, cy - 26, _fn(8.5, 900), '#fca5a5', 'center');
      g.restore();
    }

    // 3. Flag Carrier Backpack Flag & Hero Overhead Indicator
    const enemyTeam = 1 - (p.team != null ? (p.team % 2) : 0);
    const enemyFlag = ctfState.flags[enemyTeam];
    const isCarryingFlag = (enemyFlag && enemyFlag.state === 'carried' && enemyFlag.carrier === p);

    if (isCarryingFlag) {
      g.save();
      const flagCol = enemyTeam === 0 ? '#dc2626' : '#2563eb';
      const brightFlagCol = enemyTeam === 0 ? '#ff6b6b' : '#38bdf8';

      // Backpack harness socket on runner's back
      const harnessX = cx - fdir * 10;
      const harnessY = cy + 2;

      _rr(g, harnessX - 4, harnessY - 4, 8, 8, 2);
      g.fillStyle = '#1e293b';
      g.fill();
      g.strokeStyle = brightFlagCol;
      g.lineWidth = 1.2;
      g.stroke();

      // Dynamic Mast Angle responds to velocity
      const vx = p.vx || 0;
      const vy = p.vy || 0;
      const baseTilt = (fdir === 1 ? -0.42 : 0.42);
      const velTilt = -(vx * 0.00075) - (vy * 0.00035);
      const mastAngle = baseTilt + velTilt;
      const mastLen = 50;
      const mastTipX = harnessX + Math.sin(mastAngle) * mastLen;
      const mastTipY = harnessY - Math.cos(mastAngle) * mastLen;

      // Metallic Mast
      g.beginPath();
      g.moveTo(harnessX, harnessY);
      g.lineTo(mastTipX, mastTipY);
      g.lineWidth = 3.5;
      g.strokeStyle = '#cbd5e1';
      g.stroke();

      // Golden spear finial on mast tip
      g.beginPath();
      g.arc(mastTipX, mastTipY, 3.5, 0, Math.PI * 2);
      g.fillStyle = '#facc15';
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.0;
      g.stroke();

      // Trailing swallowtail pennant flowing behind runner
      const clothW = 38;
      const clothH = 24;
      const trailDir = -fdir; // Pennant streams opposite to facing direction
      drawPennantBanner(g, mastTipX, mastTipY + 2, clothW, clothH, trailDir, enemyTeam, tG, true, false);

      // Trailing sparkle particles in runner's wake
      if (Math.random() < 0.35) {
        ctfState.particles.push({
          x: mastTipX + (Math.random() - 0.5) * 6,
          y: mastTipY + (Math.random() - 0.5) * 6,
          vx: -vx * 0.2 + (Math.random() - 0.5) * 30,
          vy: -vy * 0.2 + (Math.random() - 0.5) * 30,
          grav: 40,
          life: 0.25 + Math.random() * 0.2,
          maxLife: 0.45,
          size: 2.5 + Math.random() * 2,
          col: brightFlagCol
        });
      }

      // 4. Overhead Hero Marker / Flag Indicator
      const markerY = cy - p.h / 2 - 34 + Math.sin(tG * 6) * 3;
      const badgeW = 90;
      const badgeH = 18;

      _rr(g, cx - badgeW / 2, markerY - badgeH / 2, badgeW, badgeH, 6);
      g.fillStyle = 'rgba(15, 23, 42, 0.92)';
      g.fill();
      g.strokeStyle = brightFlagCol;
      g.lineWidth = 1.8;
      g.stroke();

      const teamName = enemyTeam === 0 ? 'RED' : 'BLUE';
      _txt(g, '🚩 ' + teamName + ' FLAG', cx, markerY, _fn(8.5, 900), '#ffffff', 'center');

      // Downward pointer arrow
      g.beginPath();
      g.moveTo(cx - 5, markerY + badgeH / 2 + 1);
      g.lineTo(cx + 5, markerY + badgeH / 2 + 1);
      g.lineTo(cx, markerY + badgeH / 2 + 6);
      g.closePath();
      g.fillStyle = brightFlagCol;
      g.fill();

      g.restore();
    }
  }

  /* -------------------------------------------------------------------------
     HUD: Top Banner Scoreboard
     ------------------------------------------------------------------------- */
  function drawCtfUI() {
    if (!ctfState.active) return;
    const g = Ictx();
    if (!g) return;

    const cw = Icw();
    const m = Imatch();
    const tG = (typeof tGlobal !== 'undefined') ? tGlobal : (Date.now() / 1000);

    const bannerW = Math.min(380, cw - 40);
    const bannerH = 46;
    const bannerX = cw / 2 - bannerW / 2;
    const bannerY = 10;

    g.save();

    // 1. Sleek Frosted Glass Container
    _rr(g, bannerX, bannerY, bannerW, bannerH, 14);
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.fill();
    g.lineWidth = 2.0;
    g.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    g.stroke();

    // 2. Red Team Score Capsule (Left)
    const redScoreW = 86;
    const redX = bannerX + 10;
    const redY = bannerY + 6;
    _rr(g, redX, redY, redScoreW, 34, 8);
    g.fillStyle = 'rgba(232, 67, 63, 0.25)';
    g.fill();
    g.strokeStyle = '#e8433f';
    g.lineWidth = 1.8;
    g.stroke();

    _txt(g, '🚩 ' + ctfState.scores[0], redX + redScoreW / 2, redY + 13, _ft(14), '#ff6b6b', 'center');
    const redFlagSafe = (ctfState.flags[0].state === 'home');
    const redFlagText = redFlagSafe ? 'SAFE' : 'STOLEN!';
    const redFlagCol = redFlagSafe ? '#2ed573' : '#ff4757';
    _txt(g, redFlagText, redX + redScoreW / 2, redY + 26, _fn(7.5, 900), redFlagCol, 'center');

    // 3. Blue Team Score Capsule (Right)
    const blueScoreW = 86;
    const blueX = bannerX + bannerW - blueScoreW - 10;
    const blueY = bannerY + 6;
    _rr(g, blueX, blueY, blueScoreW, 34, 8);
    g.fillStyle = 'rgba(47, 155, 232, 0.25)';
    g.fill();
    g.strokeStyle = '#2f9be8';
    g.lineWidth = 1.8;
    g.stroke();

    _txt(g, ctfState.scores[1] + ' 🚩', blueX + blueScoreW / 2, blueY + 13, _ft(14), '#38bdf8', 'center');
    const blueFlagSafe = (ctfState.flags[1].state === 'home');
    const blueFlagText = blueFlagSafe ? 'SAFE' : 'STOLEN!';
    const blueFlagCol = blueFlagSafe ? '#2ed573' : '#ff4757';
    _txt(g, blueFlagText, blueX + blueScoreW / 2, blueY + 26, _fn(7.5, 900), blueFlagCol, 'center');

    // 4. Center Section: Target Chip & Match Clock
    const midX = cw / 2;
    if (m && m.isSuddenDeath) {
      const sdPulse = 0.8 + 0.2 * Math.sin(tG * 10);
      _rr(g, midX - 60, bannerY + 6, 120, 18, 6);
      g.fillStyle = 'rgba(239, 68, 68, ' + sdPulse + ')';
      g.fill();
      _txt(g, '⚡ SUDDEN DEATH ⚡', midX, bannerY + 15, _fn(9, 900), '#ffffff', 'center');
    } else {
      _rr(g, midX - 58, bannerY + 6, 116, 18, 6);
      g.fillStyle = 'rgba(255, 255, 255, 0.08)';
      g.fill();
      _txt(g, '🎯 FIRST TO ' + ctfState.targetCaptures, midX, bannerY + 15, _fn(9, 900), '#ffd166', 'center');
    }

    const timerStr = (m && m.timer != null) ? (typeof fmtTime === 'function' ? fmtTime(m.timer) : Math.ceil(m.timer) + 's') : '2:00';
    _txt(g, '⏱️ ' + timerStr, midX, bannerY + 34, _fn(11, 800), '#ffffff', 'center');

    g.restore();
  }

  /* -------------------------------------------------------------------------
     Bot AI Hook: ctfBotThink(p, dt)
     ------------------------------------------------------------------------- */
  function ctfBotThink(p, dt) {
    if (!ctfState.active || !p || p.isEliminated || p.isRespawning) {
      return { isIt: false, target: null };
    }
    const myTeam = p.team != null ? (p.team % 2) : 0;
    const enemyTeam = 1 - myTeam;
    const ownFlag = ctfState.flags[myTeam];
    const enemyFlag = ctfState.flags[enemyTeam];
    const ownBase = ctfState.bases[myTeam];
    const enemyBase = ctfState.bases[enemyTeam];
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;

    const hasEnemyFlag = (enemyFlag && enemyFlag.carrier === p);
    const ownFlagStolen = (ownFlag && ownFlag.state === 'carried' && ownFlag.carrier);
    const teammateHasFlag = (enemyFlag && enemyFlag.state === 'carried' && enemyFlag.carrier && enemyFlag.carrier.team === myTeam && enemyFlag.carrier !== p);

    const m = Imatch();
    const players = (m && m.players) ? m.players : [];

    // Priority 1: Bot has enemy flag
    if (hasEnemyFlag) {
      if (!ownFlagStolen) {
        // Own flag is safe at home: sprint directly to home base pedestal to capture!
        return {
          isIt: true,
          target: { x: ownBase.x - 23, y: ownBase.y - 36, w: 46, h: 46, vx: 0, vy: 0, grounded: true }
        };
      } else {
        // Own flag stolen: evade nearest enemy while waiting near base
        let nearestDef = null, minD = 1e12;
        for (const o of players) {
          if (o === p || o.isEliminated || o.team === myTeam || o.isRespawning) continue;
          const d = (o.x - cx) ** 2 + (o.y - cy) ** 2;
          if (d < minD) { minD = d; nearestDef = o; }
        }
        if (nearestDef && minD < 360000) {
          return { isIt: false, target: nearestDef };
        }
        return {
          isIt: true,
          target: { x: ownBase.x - 23, y: ownBase.y - 36, w: 46, h: 46, vx: 0, vy: 0, grounded: true }
        };
      }
    }

    // Priority 2: Home flag is stolen: intercept and tag the enemy carrier!
    if (ownFlagStolen) {
      return { isIt: true, target: ownFlag.carrier };
    }

    // Priority 3: Teammate has enemy flag: escort carrier or defend base
    if (teammateHasFlag) {
      const carrier = enemyFlag.carrier;
      let nearestThreat = null, minThreatD = 1e12;
      for (const o of players) {
        if (o.team === myTeam || o.isEliminated || o.isRespawning) continue;
        const d = (o.x - carrier.x) ** 2 + (o.y - carrier.y) ** 2;
        if (d < minThreatD) { minThreatD = d; nearestThreat = o; }
      }
      if (nearestThreat && minThreatD < 250000) {
        return { isIt: true, target: nearestThreat };
      }
      return { isIt: true, target: carrier };
    }

    // Priority 4: Default: sprint to enemy base to steal the enemy flag!
    if (enemyFlag && enemyFlag.state === 'home') {
      return {
        isIt: true,
        target: { x: enemyFlag.x - 23, y: enemyFlag.y - 23, w: 46, h: 46, vx: 0, vy: 0, grounded: true }
      };
    }
    return {
      isIt: true,
      target: { x: enemyBase.x - 23, y: enemyBase.y - 36, w: 46, h: 46, vx: 0, vy: 0, grounded: true }
    };
  }

  /* -------------------------------------------------------------------------
     Module Exports
     ------------------------------------------------------------------------- */
  const ctfModuleExports = {
    initCtfMode: initCtfMode,
    updateCtf: updateCtf,
    checkCtfTag: checkCtfTag,
    drawCtfUI: drawCtfUI,
    drawCtfPlayer: drawCtfPlayer,
    drawCtfEntities: drawCtfEntities,
    drawCtfWorldFX: drawCtfWorldFX,
    ctfBotThink: ctfBotThink,
    triggerCtfWin: triggerCtfWin,
    findCtfBases: findCtfBases,
    CTF_CONFIG: CTF_CONFIG,
    ctfState: ctfState
  };

  const targets = [];
  if (typeof window !== 'undefined' && targets.indexOf(window) < 0) targets.push(window);
  if (typeof globalThis !== 'undefined' && targets.indexOf(globalThis) < 0) targets.push(globalThis);
  if (typeof root !== 'undefined' && root && targets.indexOf(root) < 0) targets.push(root);

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    t.initCtfMode = initCtfMode;
    t.updateCtf = updateCtf;
    t.checkCtfTag = checkCtfTag;
    t.drawCtfUI = drawCtfUI;
    t.drawCtfPlayer = drawCtfPlayer;
    t.drawCtfEntities = drawCtfEntities;
    t.drawCtfWorldFX = drawCtfWorldFX;
    t.ctfBotThink = ctfBotThink;
    t.triggerCtfWin = triggerCtfWin;
    t.ctfState = ctfState;
    t.CTF_CONFIG = CTF_CONFIG;
    t.CtfMode = ctfModuleExports;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ctfModuleExports;
  }

  return ctfModuleExports;
})(typeof globalThis !== 'undefined' ? globalThis : this);

