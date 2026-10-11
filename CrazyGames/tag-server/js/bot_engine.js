/* ================= TRIAL BOT: P2 chase/flee + anti-stuck =================
   v1 rules: greedy X + jump only if no solid between, detour to platform
   edge when blocked above, bonk counter fallback. Pink drops are
   jump-through (ok to jump), solids are not. */
const BOT={st:{},think:0.09};
function botReset(){BOT.st={};}
function isBotSlot(p){
  try{
    const slot = (typeof p === 'number') ? p : (p && p.slot !== undefined ? p.slot : p);
    if(typeof HARNESS !== 'undefined' && HARNESS.active){
      if(HARNESS.mode === 'playback') return slot === 1;
      return false;
    }
    if(typeof NET !== 'undefined' && NET && NET.role !== null){
      if(NET.botSlots && NET.botSlots.includes(slot)) return true;
      return false;
    }
    if(menu.tab === 'bots') return (slot === 0 || slot === 1);
    if(menu.tab === 'solo') return slot === 1;
    if(menu.botSlots){
      if(Array.isArray(menu.botSlots) && menu.botSlots.includes(slot)) return true;
      if(menu.botSlots.has && menu.botSlots.has(slot)) return true;
    }
    if(menu.slotIsBot && menu.slotIsBot[slot] !== undefined) return !!menu.slotIsBot[slot];
    if(menu.botOn && slot === 1) return true;
    return false;
  }catch(e){return false;}
}
/* Bot collision-query caches: SOLIDS is reassigned per buildLevel, so
   identity comparison safely invalidates. Module-scope probe rect avoids
   one allocation per sample (was ~100/throw). */
let _solidsNoDrop = null, _solidsNoDropRef = null;
let _padsCache = null, _padsCacheRef = null;
const _botProbe = { x: 0, y: 0, w: 0, h: 0 };
function botSolidsNoDrop(){
  if(_solidsNoDropRef !== SOLIDS){ _solidsNoDropRef = SOLIDS; _solidsNoDrop = SOLIDS.filter(s => s.t !== 'drop'); }
  return _solidsNoDrop;
}
function botSolidBetween(ax,ay,bx,by,ignorePlat){
  // Distance-based sampling (max 22px step; 26px pillars need the margin) so thin walls never tunnel through
  const dx=bx-ax, dy=by-ay;
  const dist=Math.hypot(dx,dy);
  const steps=Math.max(3, Math.ceil(dist/22));
  const solids = botSolidsNoDrop();
  for(let i=1; i<steps; i++){
    const t=i/steps;
    _botProbe.x=ax+dx*t-3; _botProbe.y=ay+dy*t-3; _botProbe.w=6; _botProbe.h=6;
    for(const s of solids){
      if(s===ignorePlat)continue;
      if(hitRect(_botProbe,s))return s;
    }
  }
  return null;
}
function botGroundAhead(p,dir,dist){
  if(!dir)return true;
  const d=dist||(p.grounded&&(zoneAtFeet(p,'speed')||Math.abs(p.vx)>380)?125:80);
  const ax=p.x+p.w/2+dir*d,feet=p.y+p.h;
  for(const s of SOLIDS){
    if(ax>=s.x-12&&ax<=s.x+s.w+12&&feet>=s.y-42&&feet<=s.y+24)return true;
    if(s.dy){ // slope: check top at ax
      if(ax>=s.x-12&&ax<=s.x+s.w+12){
        const sy=s.y+(clamp(ax,s.x,s.x+s.w)-s.x)*(s.dy/s.w);
        if(feet>=sy-42&&feet<=sy+24)return true;
      }
    }
  }
  return false;
}
function botWallAhead(p,dir,dist){
  if(!dir)return null;
  const d=dist||44;
  const wx=dir>0?(p.x+p.w):(p.x-d);
  const probe={x:wx, y:p.y+6, w:d, h:p.h-12};
  for(const s of SOLIDS){
    if(s.t==='drop')continue;
    if(hitRect(probe,s))return s;
  }
  return null;
}
function botCeilAbove(p,dist){
  const d=dist||48;
  const probe={x:p.x+4, y:p.y-d, w:p.w-8, h:d};
  for(const s of SOLIDS){
    if(s.t==='drop'||s===p.gp)continue;
    if(hitRect(probe,s))return s;
  }
  return null;
}
function botGetActivePads(){
  if(_padsCacheRef === SOLIDS && _padsCache) return _padsCache;
  const speeds=[], boosts=[];
  for(const s of SOLIDS){
    if(s.t==='speed') speeds.push(s);
    else if(s.t==='boost') boosts.push(s);
  }
  _padsCacheRef = SOLIDS; _padsCache = { speeds, boosts };
  return _padsCache;
}
function botFindSpeedPadMeta(p, target, dx, dy){
  const { speeds, boosts } = botGetActivePads();
  const cx = p.x + p.w / 2;
  const feet = p.y + p.h;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  const hunterDir = Math.sign(dx); // dx = tx - cx; >0 means hunter is to the right
  const distHunter = Math.hypot(dx, dy);

  let best = null;
  let bestScore = -1e9;

  // 1. Evaluate Speed Pads (1.55x sprint multiplier)
  for(const s of speeds){
    const slopeOffset = s.dy ? s.dy * 0.5 : 0;
    const padY = s.y + slopeOffset;
    const dyTier = Math.abs(feet - padY);
    const maxDy = (p.grounded ? 55 : 85) + Math.abs(s.dy || 0) * 0.5;
    if(dyTier > maxDy) continue;

    let distToPad = 0;
    let padDir = 0;
    let entryX = cx;

    if(cx < s.x){
      padDir = 1;
      entryX = s.x;
      distToPad = s.x - cx;
    }else if(cx > s.x + s.w){
      padDir = -1;
      entryX = s.x + s.w;
      distToPad = cx - (s.x + s.w);
    }else{
      // Already on the speed pad!
      distToPad = 0;
      padDir = (dx >= 0) ? -1 : 1;
      entryX = (padDir > 0) ? (s.x + s.w) : s.x;
    }

    if(distToPad > 350) continue;

    // Check if path to pad entry is blocked by solid barrier
    if(distToPad > 20 && botSolidBetween(cx, feet - 16, entryX, padY - 16, p.gp)){
      continue;
    }

    if(distToPad === 0){
      // On speed pad: sprint across it away from hunter!
      const score = 2000 - distHunter;
      if(score > bestScore){
        bestScore = score;
        best = { pad: s, dir: padDir, entryX: entryX, onPad: true, isBoost: false };
      }
      continue;
    }

    // Approaching pad entry:
    const awayFromHunter = (padDir !== hunterDir);
    let accessible = false;

    if(awayFromHunter){
      accessible = true;
    }else{
      // Pad in same direction as hunter: hunter must not be between bot and pad,
      // and hunter must be far enough that bot reaches pad first
      const hunterBetween = (padDir > 0 && tx > cx && tx < entryX + 30) ||
                            (padDir < 0 && tx < cx && tx > entryX - 30);
      const dHunterToPad = Math.hypot(tx - entryX, ty - padY);
      const dBotToPad = distToPad;
      if(!hunterBetween && dHunterToPad > dBotToPad + 120 && distHunter > 130){
        accessible = true;
      }
    }

    if(accessible){
      const score = (awayFromHunter ? 800 : 200) - distToPad;
      if(score > bestScore){
        bestScore = score;
        best = { pad: s, dir: padDir, entryX: entryX, onPad: false, isBoost: false };
      }
    }
  }

  // 2. If no accessible speed pad found, check Boost Pads (1.31x vertical launch)
  if(!best){
    for(const b of boosts){
      const dyTier = Math.abs(feet - b.y);
      if(dyTier > (p.grounded ? 50 : 80)) continue;

      let distToPad = 0;
      let padDir = 0;
      let entryX = cx;

      if(cx < b.x){
        padDir = 1;
        entryX = b.x + b.w / 2;
        distToPad = b.x - cx;
      }else if(cx > b.x + b.w){
        padDir = -1;
        entryX = b.x + b.w / 2;
        distToPad = cx - (b.x + b.w);
      }else{
        distToPad = 0;
        padDir = (dx >= 0) ? -1 : 1;
        entryX = cx;
      }

      if(distToPad > 260) continue;
      if(distToPad > 20 && botSolidBetween(cx, feet - 16, entryX, b.y - 16, p.gp)) continue;

      const awayFromHunter = (padDir !== hunterDir);
      if(distToPad === 0 || awayFromHunter){
        const score = 400 - distToPad;
        if(score > bestScore){
          bestScore = score;
          best = { pad: b, dir: padDir, entryX: entryX, onPad: (distToPad === 0), isBoost: true };
        }
      }
    }
  }

  return best;
}
/* ==========================================================================
   2D BALLISTIC ARC INTERCEPT SOLVER
   Calculates if and when a grounded bot can jump up to tag an airborne runner.
   Zero-alloc: reuses BOT_INTERCEPT_RES instead of returning fresh objects.
   ========================================================================== */
const BOT_INTERCEPT_RES = { interceptDir: 1, shouldJump: false, jumpHold: 0.12, isDoubleJump: false, targetX: 0, timeToHit: 0 };
function botSolveBallisticIntercept(bot, target, dt) {
  // Only intercept if target is airborne and bot has jump capability
  if (!target || target.grounded || (!bot.grounded && bot.airJumps <= 0 && bot.sideT <= 0)) {
    return null;
  }

  const cx = bot.x + bot.w / 2;
  const cy = bot.y + bot.h / 2;
  let tx = target.x + target.w / 2;
  let ty = target.y + target.h / 2;
  let tvx = target.vx || 0;
  let tvy = target.vy || 0;

  const simStep = 0.033; // 30Hz simulation steps
  const maxLookahead = 0.65; // Max 650ms predictive horizon

  for (let t = simStep; t <= maxLookahead; t += simStep) {
    // Integrate target ballistic arc
    tvy = Math.min(1600, tvy + 2100 * simStep);
    tx += tvx * simStep;
    ty += tvy * simStep;

    // Time for bot to sprint horizontally to target coordinate tx
    const dx = tx - cx;
    const tSprintX = Math.abs(dx) / 582; // IT_SPEED

    // Mid-air collision synchronization window (bot reaches X around time t)
    if (Math.abs(tSprintX - t) <= 0.08) {
      const dy = ty - cy; // dy < 0 means target is above bot

      // A. Grounded Single Jump Window (Target 40px to 260px above bot).
      // Vertical sync: the bot's own rise at time t (~-990t + 630t^2, with
      // hold-lift) must actually reach the target's height, otherwise the
      // bot would hop early under a high apex and land before the runner
      // descends. Rejected steps keep scanning later t values.
      const botRise = -990 * t + 630 * t * t;
      if (dy >= -265 && dy <= -35 && bot.grounded && Math.abs(botRise - dy) <= 70) {
        BOT_INTERCEPT_RES.interceptDir = Math.sign(dx) || (bot.face || 1);
        BOT_INTERCEPT_RES.shouldJump = true;
        BOT_INTERCEPT_RES.jumpHold = 0.12;
        BOT_INTERCEPT_RES.isDoubleJump = false;
        BOT_INTERCEPT_RES.targetX = tx;
        BOT_INTERCEPT_RES.timeToHit = t;
        return BOT_INTERCEPT_RES;
      }

      // B. Apex Double Jump Window (Target 265px to 500px above bot)
      if (dy >= -505 && dy < -265 && (bot.airJumps > 0 || (settings.doubleJump && !bot.grounded))) {
        BOT_INTERCEPT_RES.interceptDir = Math.sign(dx) || (bot.face || 1);
        BOT_INTERCEPT_RES.shouldJump = true;
        BOT_INTERCEPT_RES.jumpHold = 0.14;
        BOT_INTERCEPT_RES.isDoubleJump = true;
        BOT_INTERCEPT_RES.targetX = tx;
        BOT_INTERCEPT_RES.timeToHit = t;
        return BOT_INTERCEPT_RES;
      }
    }
  }

  return null;
}
function botInputFor(p,dt){
  if(p.isFrozen) return {dir:0,jumpEdge:false,jumpHeld:false,downHeld:false};
  if(match && match.hunterMode && match.cageT > 0 && p.isHunter) return {dir:0,jumpEdge:false,jumpHeld:false,downHeld:false};
  let S=BOT.st[p.slot];
  if(!S){S=BOT.st[p.slot]={dir:0,jumpQ:false,jumpHoldT:0,decideT:Math.random()*0.09,thinkJit:0.85+Math.random()*0.3,px:p.x,py:p.y,stuckT:0,unstuckT:0,unstuckDir:0,bonks:0,bonkT:0,airT:0,dropHold:0,descLockT:0,descDir:0,airT2:0,exitX:0,hasExit:false,exitLockT:0,exitDir:0,exitGp:null,climbPlat:null,climbOut:0,climbT:0,bannedSide:0,banT:0,banTierY:0,dropNoJumpT:0,pinkJukePhase:0,pinkJukeT:0,pinkJukeCooldown:0,pinkJukePlat:null,pinkJukeDir:0,airBrakeT:0,airBrakeCooldown:0};}
  const slotDiff = (typeof getSlotBotDiff === 'function') ? getSlotBotDiff(p.slot) : (menu.botDifficulty || settings.botDifficulty || 'hard');
  const isEasy = (slotDiff === 'easy');
  const botThinkRate = isEasy ? 0.16 : BOT.think;
  const stepDt=(typeof dt==='number'&&dt>0)?Math.min(0.05,dt):Math.min(0.033,1/60);
  const cx=p.x+p.w/2,cy=p.y+p.h/2;

  const isTeam = !!(settings.teams && match && match.itTeam != null);
  const isCrown = (settings.gameMode === 'crown');
  const isBomb = (settings.gameMode === 'bomb');
  const isInf = (settings.gameMode === 'infection');

  let isIt = false;
  let target = null;
  let rescuingTeammate = false;

  try{
    if(isCrown){
      const isKing = !!(typeof crownState !== 'undefined' && crownState && crownState.holder === p);
      if(typeof crownState === 'undefined' || !crownState || !crownState.holder){
        // Crown is unowned on central platform: all bots sprint to claim it!
        isIt = true;
        const anchor = (typeof findCentralPlatform === 'function') ? findCentralPlatform() : { x: 1200, y: 600 };
        const pedX = (crownState && crownState.spawnX != null) ? crownState.spawnX : anchor.x;
        const pedY = (crownState && crownState.spawnY != null) ? crownState.spawnY : anchor.y;
        target = { x: pedX - 20, y: pedY - 20, w: 40, h: 40, vx: 0, vy: 0, grounded: true };
      } else if(isKing){
        // Bot is the King: runner fleeing from closest chaser using high-ground evasion & speed pads!
        isIt = false;
        let minD = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated || o.isFrozen) continue;
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < minD){ minD = d; target = o; }
        }
      } else {
        // Bot is a chaser: hunt down the King relentlessly!
        isIt = true;
        target = crownState.holder;
      }
    } else if(isBomb){
      const pIdx = match.players.indexOf(p);
      const isCarrier = (typeof BOMB_MODE !== 'undefined' && BOMB_MODE && BOMB_MODE.carrierIdx === pIdx);
      if(isCarrier){
        isIt = true;
        let best = 1e12;
        for(let j = 0; j < match.players.length; j++){
          if(j === pIdx) continue;
          const o = match.players[j];
          if(!o || o.isEliminated) continue;
          const immKey = o.slot != null ? o.slot : j;
          if(BOMB_MODE && BOMB_MODE.passImmunity && (BOMB_MODE.passImmunity[immKey] || 0) > 0) continue;
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < best){ best = d; target = o; }
        }
        if(!target){
          for(let j = 0; j < match.players.length; j++){
            if(j === pIdx) continue;
            const o = match.players[j];
            if(!o || o.isEliminated) continue;
            const d = (o.x - cx)**2 + (o.y - cy)**2;
            if(d < best){ best = d; target = o; }
          }
        }
      } else {
        isIt = false;
        const cIdx = (typeof BOMB_MODE !== 'undefined' && BOMB_MODE) ? BOMB_MODE.carrierIdx : -1;
        target = (cIdx >= 0 && cIdx < match.players.length) ? match.players[cIdx] : null;
      }
    } else if(isInf){
      const isInfected = !!p.isInfected;
      isIt = isInfected;
      if(isInfected){
        let best = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated || o.isInfected) continue;
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < best){ best = d; target = o; }
        }
      } else {
        let minD = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated || !o.isInfected) continue;
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < minD){ minD = d; target = o; }
        }
      }
    } else if(match && match.hunterMode){
      // HUNTER MODE: one hunter per team; cross-team runners are prey.
      // Classic match.it logic does not apply (single-IT index is meaningless
      // here), so identify by p.isHunter — otherwise hunter bots think they
      // are runners, flee from one wrong player, or freeze with no target.
      if(p.isHunter){
        isIt = true;
        let best = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated) continue;
          if(o.team === p.team) continue; // never hunt teammates
          if(o.isHunter) continue; // enemy hunter is not prey
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < best){ best = d; target = o; }
        }
      } else {
        isIt = false;
        let best = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated || !o.isHunter) continue;
          if(o.team === p.team) continue; // only the ENEMY hunter chases us
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < best){ best = d; target = o; }
        }
      }
    } else if(settings.gameMode === 'ctf'){
      const thinkRes = (typeof ctfBotThink === 'function') ? ctfBotThink(p, dt) : null;
      if(thinkRes){
        isIt = thinkRes.isIt;
        target = thinkRes.target;
      }
    } else {
      isIt = isTeam ? (p.team === match.itTeam) : (match && match.players && match.players[match.it] === p);
      if(isIt){
        let best = 1e12;
        let bestHuman = null, bestHumanD = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated) continue;
          if(isTeam && o.team === p.team) continue;
          if(settings.gameMode === 'freeze' && o.isFrozen) continue;
          const d = (o.x - cx)**2 + (o.y - cy)**2;
          if(d < best){ best = d; target = o; }
          if(d < bestHumanD){
            let humanRunner = true;
            try{ humanRunner = !isBotSlot(o); }catch(e){ humanRunner = true; }
            if(humanRunner){ bestHumanD = d; bestHuman = o; }
          }
        }
        if(bestHuman && target !== bestHuman && bestHumanD < best * 2.25){ target = bestHuman; }
      } else {
        let nearestChaser = null;
        let minChaserDist = 1e12;
        for(const o of match.players){
          if(o === p || o.isEliminated) continue;
          const isEnemyChaser = isTeam ? (o.team === match.itTeam && o.team !== p.team) : (o === match.players[match.it]);
          if(isEnemyChaser){
            const d = (o.x - cx)**2 + (o.y - cy)**2;
            if(d < minChaserDist){ minChaserDist = d; nearestChaser = o; }
          }
        }

        // Freeze Tag mode: if chaser is far (>260px) and a teammate is frozen, go rescue them!
        if(settings.gameMode === 'freeze' && (!nearestChaser || minChaserDist > 67600)){
          let nearestFrozen = null;
          let minFreezeDist = 1e12;
          for(const o of match.players){
            if(o === p || !o.isFrozen || o.isEliminated) continue;
            if(isTeam && o.team !== p.team) continue;
            const d = (o.x - cx)**2 + (o.y - cy)**2;
            if(d < minFreezeDist){ minFreezeDist = d; nearestFrozen = o; }
          }
          if(nearestFrozen){
            target = nearestFrozen;
            rescuingTeammate = true;
          }
        }

        if(!target) target = nearestChaser;
      }
    }
  }catch(e){}
  if(!target) return {dir:0,jumpEdge:false,jumpHeld:false,downHeld:false};
  const tx=target.x+target.w/2,ty=target.y+target.h/2;
  const dx=tx-cx,dy=ty-cy;

  // Airborne-reaction timer: how long the current target has been continuously
  // airborne while we hunt it (human-like 2-3 frame delay before intercepts).
  if(isIt && !target.grounded){ S.airReactT=(S.airReactT||0)+stepDt; }
  else { S.airReactT=0; S.interceptActive=false; }

  /* Hound & Anvil role detection: closest hunter bot drives (Hound),
     farther hunter bots cut off the escape route (Anvil). Scalar-only. */
  let myRole = 'hound';
  if(isIt && !rescuingTeammate && target){
    const myDistSq = (target.x - cx) ** 2 + (target.y - cy) ** 2;
    for(const ally of match.players){
      if(ally === p || ally.isEliminated) continue;
      const isAllyHunter = (match && match.hunterMode)
        ? (ally.isHunter && ally.team === p.team)
        : (isCrown ? (ally !== (typeof crownState !== 'undefined' && crownState && crownState.holder)) : (isBomb ? (ally !== (typeof BOMB_MODE !== 'undefined' && BOMB_MODE && match.players[BOMB_MODE.carrierIdx])) : (isTeam ? (ally.team === p.team) : (ally === match.players[match.it]))));
      if(isAllyHunter){
        const allyDistSq = (target.x - (ally.x + ally.w / 2)) ** 2 + (target.y - (ally.y + ally.h / 2)) ** 2;
        if(allyDistSq < myDistSq){ myRole = 'anvil'; break; }
      }
    }
  }

  if(S.dropNoJumpT>0)S.dropNoJumpT-=stepDt;
  if(S.pinkJukeCooldown>0)S.pinkJukeCooldown-=stepDt;
  if(S.airBrakeCooldown>0)S.airBrakeCooldown-=stepDt;

  S.decideT-=stepDt;S.bonkT-=stepDt;
  if(S.bonkT<=0)S.bonks=0;
  // Exit-side blacklist: expires on timer or on real elevation gain
  if(S.banT>0){
    S.banT-=stepDt;
    if(S.banT<=0||p.y<S.banTierY-45){S.bannedSide=0;S.banT=0;}
  }
  // stuck tracking: moved <14px in 0.45s while target far or blocked against wall/perimeter
  const moved=Math.hypot(p.x-S.px,p.y-S.py);
  const far=Math.hypot(dx,dy)>90;
  const wallAheadNow=botWallAhead(p,S.dir,30);
  const nearPerimeter=(p.x<=WALL+25||p.x+p.w>=W-WALL-25);
  const isStuckBlocked=far||wallAheadNow||nearPerimeter;
  if(isStuckBlocked&&moved<14){S.stuckT+=stepDt;}else{S.stuckT=0;S.px=p.x;S.py=p.y;}
  if(moved>=14){S.px=p.x;S.py=p.y;}
  if(S.stuckT>0.45&&S.unstuckT<=0){
    S.unstuckT=0.7;S.unstuckDir=(S.dir!==0?-S.dir:(Math.random()<0.5?-1:1));
    S.stuckT=0;S.bonks=0;
    S.exitLockT=0;S.exitDir=0;S.exitGp=null;S.hasExit=false;
    S.descLockT=0;S.descDir=0;
    S.climbPlat=null;S.climbOut=0;S.climbT=0;
    S.pinkJukePhase=0;S.pinkJukeT=0;
  }
  if(S.unstuckT>0){
    S.unstuckT-=stepDt;
    // spam jumps while unstuck (with hold for full height)
    S.airT-=stepDt;
    let j=false;
    if(p.grounded||p.airJumps>0||(p.wallJumps<2&&p.sideT>0)){if(S.airT<=0){j=true;S.airT=0.28;S.jumpHoldT=0.12;}}
    if(S.dropNoJumpT>0)j=false;
    let uh=!!j||S.jumpHoldT>0;
    if(S.jumpHoldT>0)S.jumpHoldT-=stepDt;
    const r={dir:S.unstuckDir,jumpEdge:j,jumpHeld:uh,downHeld:false};
    if(S.unstuckT<=0)S.decideT=0;
    return r;
  }

  if(S.decideT<=0){
    S.decideT=botThinkRate*(S.thinkJit||1); // init jitter already desyncs bots; no additive phase (would retune difficulty per slot)
    let want=0;
    let isCornerJuke=false;
    let chaseWant = 0;
    let isTargetDescending = false, isTouchdownFrame = false, touchdownX = tx, touchdownY = H - WALL;
    if(rescuingTeammate){
      want = Math.abs(dx) > 12 ? Math.sign(dx) : (S.dir || 1);
      if(dy < -30 && (p.grounded || p.sideT > 0)) S.jumpQ = true;
    }else if(isIt){
      // S4 Dynamic Tag Cutoff when Hunting
      isTargetDescending = p.grounded && (target.vy > 40);
      if(isTargetDescending){
        // Descending target: simulate trajectory to predict exact touchdown spot & frame
        let simX = target.x, simY = target.y, simVx = target.vx || 0, simVy = target.vy;
        let touchdownT = 0;
        const simDt = 0.025;
        for(let t = 0; t < 1.0; t += simDt){
          simVy = Math.min(MAXFALL, simVy + G * simDt);
          simX += simVx * simDt;
          simY += simVy * simDt;
          simX = clamp(simX, WALL, W - WALL - target.w);
          const feet = simY + target.h;
          let landed = false;
          for(const s of SOLIDS){
            if(s.wall && s.y !== H - WALL) continue;
            let surfY = s.y;
            if(s.dy){
              const px = clamp(simX + target.w / 2, s.x, s.x + s.w);
              surfY = s.y + (px - s.x) * (s.dy / s.w);
            }
            if(feet >= surfY && (feet - simVy * simDt) <= surfY + 18){
              if(simX + target.w > s.x + 2 && simX < s.x + s.w - 2){
                touchdownX = simX + target.w / 2;
                touchdownY = surfY;
                touchdownT = t + simDt;
                landed = true;
                break;
              }
            }
          }
          if(landed) break;
          if(feet >= H - WALL){
            touchdownX = simX + target.w / 2;
            touchdownY = H - WALL;
            touchdownT = t + simDt;
            break;
          }
        }
        isTouchdownFrame = (touchdownT <= 0.10) || ((target.y + target.h) >= touchdownY - 35);
        chaseWant = Math.abs(touchdownX - cx) > 12 ? (Math.sign(touchdownX - cx) || 1) : 0;
      }else if(!target.grounded || Math.abs(dx) > 100){
        // Airborne or sprinting across gaps: calculate dynamic lead time cutoff
        const leadT = clamp(Math.hypot(dx, dy) / IT_SPEED, 0.15, 0.40);
        const aimX = tx + clamp((target.vx || 0) * leadT, -260, 260);
        chaseWant = Math.sign(aimX - cx) || 1;
      }else{
        // Grounded close-quarters chase
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if(absDx < 28 && absDy < 36){
          chaseWant = Math.sign(dx) || 0;
        }else if(absDx < 45 && Math.abs(p.vx) > 60){
          chaseWant = Math.sign(p.vx);
        }else{
          chaseWant = absDx > 12 ? Math.sign(dx) : (S.dir || 1);
        }
      }
      want = chaseWant;
      // S5 Ballistic arc intercept: airborne runner overhead -> leap to meet
      // them mid-air instead of running underneath. Gated by human-like
      // reaction delay (target airborne >= 0.05s) and +/-25px aim error so
      // runners can still bait and juke the jump.
      if(!target.grounded && (S.airReactT||0) >= 0.05 && p.dropT <= 0){
        const intercept = botSolveBallisticIntercept(p, target, stepDt);
        if(intercept !== null){
          if(!S.interceptActive){ S.interceptErr = (Math.random()-0.5)*50; }
          S.interceptActive = true;
          const aimX = intercept.targetX + (S.interceptErr || 0);
          want = Math.sign(aimX - cx) || intercept.interceptDir;
          S.jumpQ = true;
          S.jumpHoldT = intercept.jumpHold;
        } else {
          S.interceptActive = false;
        }
      } else {
        S.interceptActive = false;
      }
      // Pincer tactic: the Anvil aims at the projected escape zone (+200px
      // ahead of the runner) instead of the runner's back, pinching them
      // between Hound and Anvil. Skipped while an active mid-air intercept
      // owns the steering, so the intercept leap is never overwritten.
      if(myRole === 'anvil' && !S.interceptActive){
        const runnerRunDir = Math.sign(target.vx || target.face || 1);
        const cutLead = 160 + ((p.slot * 53) % 80);
        const cutoffX = target.x + runnerRunDir * cutLead;
        want = (cutoffX > cx + 15) ? 1 : (cutoffX < cx - 15 ? -1 : (Math.sign(dx) || 1));
        // Runner above and drifting toward a ledge: jump early to contest it
        if(dy < -40 && p.grounded && Math.abs(cutoffX - cx) < 160){
          S.jumpQ = true;
          S.jumpHoldT = 0.12;
        }
      }
    }else{
      // flee: run from IT with predictive intercept calculation
      const predT = 0.32;
      const predTx = tx + clamp((target.vx || 0) * predT, -220, 220);
      const predDx = predTx - cx;
      want = Math.abs(predDx) > 20 ? -Math.sign(predDx) : (Math.abs(dx) > 20 ? -Math.sign(dx) : (S.dir || 1));
      
      // 1. Pink platform bait & pop-up juke (drop beneath and pop up behind hunter!)
      const dropPlat=botFullyOnDrop(p);
      const onPink=!!dropPlat;
      const hunterClosing=Math.sign(target.vx||0)===-Math.sign(dx)||Math.abs(target.vx||0)>90;
      const hunterNearBehind=Math.abs(dy)<60&&Math.abs(dx)>60&&Math.abs(dx)<230&&hunterClosing;
      
      if(onPink&&hunterNearBehind&&S.pinkJukeCooldown<=0&&S.pinkJukePhase===0){
        S.pinkJukePhase=1;
        S.pinkJukeT=0.28;
        S.pinkJukePlat=dropPlat;
        S.pinkJukeDir=want;
      }else if(S.pinkJukePhase===1){
        // Phase 1: Dropping beneath pink floor
        S.pinkJukeT-=stepDt;
        want=S.pinkJukeDir;
        // Check if hunter overshoots past the bot or runs directly overhead:
        const hunterPassed=(Math.sign(dx)===S.pinkJukeDir&&Math.abs(dx)>15)||Math.abs(dx)<45;
        if(hunterPassed||S.pinkJukeT<=0){
          // POP BACK UP BEHIND HUNTER!
          S.pinkJukePhase=2;
          S.pinkJukeT=0.35;
          S.jumpQ=true;
          S.jumpHoldT=0.15;
          want=-S.pinkJukeDir;
        }
      }else if(S.pinkJukePhase===2){
        // Phase 2: Rising through pink floor and sprinting in reverse away from hunter
        S.pinkJukeT-=stepDt;
        want=-S.pinkJukeDir;
        const targetPlatY=S.pinkJukePlat?S.pinkJukePlat.y:p.y;
        if(S.pinkJukeT<=0||(p.grounded&&(p.y+p.h)<=targetPlatY+4)){
          S.pinkJukePhase=0;
          S.pinkJukeCooldown=3.0;
        }
      }else{
        // 2. Corner check: perimeter wall with hunter approaching directly
        const hunterCornerClosing=Math.abs(dx)<320&&Math.abs(dy)<180;
        const cornerL=(p.x<=WALL+130&&dx>0);
        const cornerR=(p.x+p.w>=W-WALL-130&&dx<0);
        if((cornerL||cornerR)&&hunterCornerClosing){
          // EMERGENCY CORNER JUKE: Wall-jump overhead to flank over approaching hunter!
          isCornerJuke=true;
          if(p.grounded){
            want=cornerL?-1:1;
          }else if(p.vy<-20&&p.sideT<=0){
            want=cornerL?-1:1;
          }else{
            want=cornerL?1:-1;
          }
        }else{
          // S3 SPEED & BOOST PAD META AWARENESS:
          // Check for accessible speed/boost pad when hunter is closing in (< 320px) or already on pad
          const distHunter = Math.hypot(dx, dy);
          if(distHunter < 320 || zoneAtFeet(p, 'speed') || zoneAtFeet(p, 'boost')){
            const padMeta = botFindSpeedPadMeta(p, target, dx, dy);
            if(padMeta){
              want = padMeta.dir;
            }
          }
          if(p.x<WALL+80&&want<0)want=1;
          if(p.x+p.w>W-WALL-80&&want>0)want=-1;
        }
      }
    }
    // UP: blocked by solid above -> persistent exit lock on this platform.
    // Pick once (target-relative = minimal total path, no bot-tie flips),
    // hold 0.8s while grounded on the same slab. Wall bail flips it.
    let detour=0;
    const aboveBy=cy-ty; // >0 means target above
    S.hasExit=false;
    if(S.exitLockT>0){S.exitLockT-=botThinkRate;}
    // wall bail: pinned on perimeter while locked -> force opposite
    if(S.exitLockT>0&&S.exitDir&&p.grounded){
      if((S.exitDir<0&&p.x<=WALL+10)||(S.exitDir>0&&p.x+p.w>=W-WALL-10)){
        const flip=-S.exitDir;
        S.exitLockT=0.3;S.exitDir=flip;S.exitGp=p.gp||null;S.hasExit=true;
        detour=flip;want=flip;S.dir=flip;
      }
    }
    // Two-tier routing:
    // Mode A: Direct Greedy Search if there is an unobstructed straight path (open air or through pink platforms)
    // Mode B: Ceiling / Obstacle Detour Router if a solid brown platform or wall is in the line of sight
    const solidInPath = isIt ? botSolidBetween(cx, cy, tx, ty, p.gp) : null;
    const isDirectPath = isIt && !solidInPath;

    if(isDirectPath){
      // TIER 1: DIRECT GREEDY BEELINE (clear air or through pink platforms)
      S.exitLockT=0;S.exitDir=0;S.exitGp=null;S.hasExit=false;
      want=chaseWant;
    }else if(isIt&&aboveBy>50){
      // TIER 2: CEILING / OBSTACLE DETOUR ROUTER (solid platform in way)
      const gp=p.grounded?p.gp:null;
      // 1. Hold existing lock while on this platform to reach exitX without boundary oscillation
      if(S.exitLockT>0&&S.exitDir&&gp&&S.exitGp===gp){
        if(S.targetSideAtLock&&Math.sign(dx)!==S.targetSideAtLock&&Math.abs(dx)>80){
          S.exitLockT=0;S.exitDir=0;S.exitGp=null;S.hasExit=false;
        }else{
          detour=S.exitDir;want=detour;
          S.dropHold=0;S.descLockT=0;S.descDir=0;
          S.hasExit=true;
        }
      }
      // 2. If not locked, check if direct path to target is blocked by solid overhead
      if(!S.hasExit&&gp){
        const blocked=botSolidBetween(cx,p.y-10,tx,ty,p.gp);
        if(blocked&&!blocked.wall){
          const clearL=blocked.x-45,clearR=blocked.x+blocked.w+45;
          const wallL=(blocked.x<=WALL+30),wallR=(blocked.x+blocked.w>=W-WALL-30);
          let exitX=(Math.abs(cx-clearL)<Math.abs(cx-clearR))?clearL:clearR;
          if(S.bannedSide===-1)exitX=clearR;
          else if(S.bannedSide===1)exitX=clearL;
          if(wallL)exitX=clearR;
          if(wallR)exitX=clearL;
          // Verify open air above chosen exit, else take the other side
          if(botSolidBetween(exitX,p.y-20,exitX,Math.min(ty,p.y-280),p.gp)){
            exitX=(exitX===clearL)?clearR:clearL;
          }
          detour=Math.sign(exitX-cx)||1;
          want=detour;
          S.dropHold=0;S.descLockT=0;S.descDir=0;
          S.exitX=exitX;S.hasExit=true;
          S.climbPlat=blocked;S.climbOut=detour;
          S.exitLockT=0.85;S.exitDir=detour;S.exitGp=gp;S.targetSideAtLock=Math.sign(dx);
        }
      }else if(!p.grounded){
        // AIRBORNE: preserve exit lock across the jump so momentum & direction hold
        if(S.exitLockT>0&&S.exitDir){
          detour=S.exitDir;want=detour;S.hasExit=true;
        }
      }else if(p.grounded&&gp&&S.exitGp&&S.exitGp!==gp){
        // Landed on a new platform: ceiling exit accomplished!
        S.exitLockT=0;S.exitDir=0;S.exitGp=null;S.hasExit=false;
      }
    }else{
      if(aboveBy<20){
        S.exitLockT=0;S.exitDir=0;S.exitGp=null;S.hasExit=false;
      }
    }
    // BUG1: stale walk-off lock must die the moment target is above,
    // else it overwrites climb steering + suppresses the jump below.
    if(aboveBy>50){S.descLockT=0;S.descDir=0;}
    // DOWN hysteresis: keep committed walk-off direction briefly
    if(S.descLockT>0){S.descLockT-=botThinkRate;if(S.descDir)want=S.descDir;}
    S.dir=want;
    // jump decisions
    S.jumpQ=false;S.dropHold=Math.max(0,(S.dropHold||0)-botThinkRate);
    const headBlocked=botSolidBetween(cx,p.y-4,cx,p.y-140,p.gp);
    if(p.grounded){
      S.airT2=0;S.climbT=0;S.climbPlat=null;S.climbOut=0;
      const onSpeed=p.grounded&&!!zoneAtFeet(p,'speed');
      const onBoost=p.grounded&&!!zoneAtFeet(p,'boost');
      const fastGround=onSpeed||Math.abs(p.vx)>380;
      const wallDist=fastGround?75:44;
      const wallAhead=botWallAhead(p,want,wallDist);
      const ceilAbove=botCeilAbove(p,48);
      const isJumpableWall=wallAhead&&(wallAhead.y>p.y-170)&&!ceilAbove;
      const isDropEscape=wallAhead&&!isJumpableWall&&!!botFullyOnDrop(p);

      // Phase 3: S1 High-Ground Zoning detection & criteria
      const hunterBelow=ty>(p.y+p.h+70);
      const onSolidPlatform=p.grounded&&p.gp&&!p.gp.wall&&p.gp.t!=='drop';
      const hunterSameTier=Math.abs(ty-(p.y+p.h))<65;
      const hunterDangerClose=Math.abs(dx)<110;
      const isPinkJuke=(S.pinkJukePhase!==0);
      const allowHighGroundDrop=hunterSameTier||hunterDangerClose||isPinkJuke;
      const holdHighGround=!rescuingTeammate&&!isIt&&hunterBelow&&onSolidPlatform&&!allowHighGroundDrop;

      if(isDropEscape){
        // Trapped by giant unjumpable wall/pillar on drop platform: drop down to escape!
        S.jumpQ=false;
      } else if(rescuingTeammate){
        // RESCUING FROZEN TEAMMATE: sprint directly toward teammate, leap gaps and scale ledges!
        if(dy < -30 && (p.grounded || p.sideT > 0)){ S.jumpQ = true; S.jumpHoldT = 0.14; }
        else if(isJumpableWall){ S.jumpQ = true; }
        else if(!botGroundAhead(p, want, fastGround ? 125 : 80)){ S.jumpQ = true; }
        else if(wallAhead && !isJumpableWall){ want = -want; S.dir = want; S.jumpQ = false; }
      } else if(isIt){
        // CHASE: Touchdown ambush, edge launch, boost pad, direct beeline, and climb toward prey above
        const inTagRange = (Math.abs(dx) < 65 && Math.abs(dy) < 80) || (Math.abs(touchdownX - cx) < 65 && Math.abs(touchdownY - (p.y + p.h)) < 60);
        const edgeMargin=onSpeed?72:42;
        let edgeJump=false;
        if(aboveBy>50&&p.gp){
          const dEdge=Math.min(Math.abs(cx-p.gp.x),Math.abs(cx-(p.gp.x+p.gp.w)));
          if(dEdge<edgeMargin)edgeJump=true;
        }
        if(!edgeJump&&S.hasExit&&aboveBy>50&&Math.abs(cx-S.exitX)<(onSpeed?72:52))edgeJump=true;
        if(onBoost&&aboveBy>40){edgeJump=true;}
        if(isDirectPath&&aboveBy>40&&!headBlocked){edgeJump=true;}

        // TRAINED JUMP POLICY INTEGRATION:
        let policyJump = false;
        if(p.gp && target.gp && typeof HARNESS !== 'undefined' && HARNESS.transitions){
          const mapKey = 'map' + settings.map;
          const trMap = HARNESS.transitions[mapKey];
          if(trMap && HARNESS.nodes && HARNESS.nodes.length){
            const fIdx = HARNESS.nodes.indexOf(p.gp);
            const tIdx = HARNESS.nodes.indexOf(target.gp);
            if(fIdx >= 0 && tIdx >= 0 && fIdx !== tIdx){
              const sample = trMap[fIdx + '->' + tIdx];
              if(sample){
                const toLaunch = sample.launchX - cx;
                if(Math.abs(toLaunch) < 40){
                  policyJump = true;
                  S._policyDjDelay = sample.hasDoubleJump ? sample.doubleJumpDelay : 0;
                  S._policyAirT = 0;
                } else if(Math.abs(toLaunch) < 300){
                  want = Math.sign(toLaunch);
                }
              }
            }
          }
        }

        if(policyJump){
          S.jumpQ=true; S.jumpHoldT=0.16;
        }
        else if(isTargetDescending && isTouchdownFrame && inTagRange && !headBlocked && !ceilAbove){
          S.jumpQ=true;
        }
        else if(edgeJump){S.jumpQ=true;}
        else if(aboveBy>70&&Math.abs(dx)<260&&!headBlocked){S.jumpQ=true;}
        else if(isJumpableWall){S.descLockT=0;S.descDir=0;S.jumpQ=true;}
        else if(wallAhead&&!isJumpableWall){
          // Unjumpable barrier: do NOT jump into it, turn around!
          S.jumpQ=false;
          want=-want;S.dir=want;
        }
        else if(Math.abs(p.vx)<60&&want!==0&&far&&!ceilAbove){S.jumpQ=true;}
        else if(!botGroundAhead(p,want,fastGround?125:80)&&far){S.jumpQ=true;} // gap: jump across
      } else {
        // FLEE: Jump over obstacles, gaps, perform corner wall flank, or turn around at unjumpable pillars
        if(S.pinkJukePhase===1){
          // Dropping beneath pink floor, do NOT jump
          S.jumpQ=false;
        }else if(S.pinkJukePhase===2){
          // Pop back up through pink platform
          S.jumpQ=true;S.jumpHoldT=0.15;
        }else if(isCornerJuke){
          S.jumpQ=true;S.jumpHoldT=0.14;
        }else if(onBoost&&Math.hypot(dx,dy)<340&&!ceilAbove){
          // Super-launch off blue boost pad to break hunter's pursuit!
          S.jumpQ=true;S.jumpHoldT=0.16;
        }else if(isJumpableWall){
          S.jumpQ=true;
          if(fastGround)S.jumpHoldT=0.15;
        }else if(wallAhead&&!isJumpableWall&&!isDropEscape){
          // Unjumpable barrier / tall pillar / ceiling-blocked wall:
          // Do NOT run face-first into it! Turn around and evade!
          want=-want; S.dir=want;
          // If hunter is closing in from behind and ceiling is clear, leap over hunter!
          const hunterAheadAfterTurn=(dx*want>0);
          if(hunterAheadAfterTurn&&Math.abs(dx)<140&&!ceilAbove){
            S.jumpQ=true;S.jumpHoldT=0.14;
          }else{
            S.jumpQ=false;
          }
        }else if(holdHighGround){
          // HIGH-GROUND ZONING: prioritize staying on upper platform above hunter!
          // Suppress accidental downward walk-offs, keep running along platform or camp near center / wall-jump corner.
          S.jumpQ=false;
          const platL=p.gp.x, platR=p.gp.x+p.gp.w;
          const platCenter=platL+p.gp.w/2;
          const hasWallL=(platL<=WALL+30)||(p.x<=WALL+35)||!!botWallAhead(p,-1,35);
          const hasWallR=(platR>=W-WALL-30)||(p.x+p.w>=W-WALL-35)||!!botWallAhead(p,1,35);
          const hasGroundL=botGroundAhead(p,-1,45);
          const hasGroundR=botGroundAhead(p,1,45);

          if(p.gp.w<150&&!hasWallL&&!hasWallR&&!hasGroundL&&!hasGroundR){
            // Narrow isolated platform with drops on both sides: camp near platform center
            const dCenter=cx-platCenter;
            if(Math.abs(dCenter)>20){
              want=Math.sign(platCenter-cx); S.dir=want;
            }else{
              want=0; S.dir=0;
            }
          }else if(want>0){
            // Running right: check if approaching an open drop edge or wall-jump corner
            const dEdgeR=platR-(p.x+p.w);
            if(!hasWallR&&!hasGroundR&&dEdgeR<40){
              if(dEdgeR<=10){
                want=-1; S.dir=-1; // step back from ledge
              }else{
                want=0; S.dir=0; // camp safely before edge
              }
            }else if(hasWallR&&dEdgeR<18){
              // Camp in wall-jump corner
              want=0; S.dir=0;
            }
          }else if(want<0){
            // Running left: check if approaching an open drop edge or wall-jump corner
            const dEdgeL=p.x-platL;
            if(!hasWallL&&!hasGroundL&&dEdgeL<40){
              if(dEdgeL<=10){
                want=1; S.dir=1; // step back from ledge
              }else{
                want=0; S.dir=0; // camp safely before edge
              }
            }else if(hasWallL&&dEdgeL<18){
              // Camp in wall-jump corner
              want=0; S.dir=0;
            }
          }
          // ANTI-CAMP: an intentional hold must never look frozen, nor trip the
          // stuck detector into jump-spam jitter. Patrol instead after ~1.2s.
          if(want===0&&S.dir===0){
            S.campT=(S.campT||0)+botThinkRate;
            S.stuckT=0; // intentional hold is not stuck: stops jitter cycle
            if(S.campT>1.2){
              S.campT=0; S.campFlip=!S.campFlip;
              const toH=Math.sign(dx)||1;
              const strollDir=S.campFlip?toH:-toH;
              const strollOk=strollDir>0?(hasGroundR||hasWallR||(platR-(p.x+p.w))>26):(hasGroundL||hasWallL||(p.x-platL)>26);
              if(strollOk){want=strollDir;S.dir=strollDir;}
              else if(strollDir!==0){want=-strollDir;S.dir=-strollDir;}
            }
          }else{S.campT=0;}
        }else if(!botGroundAhead(p,want,fastGround?125:80)&&far){
          S.jumpQ=true;
          if(fastGround)S.jumpHoldT=0.16;
        }
        else if(Math.abs(p.vx)<60&&want!==0&&far&&!ceilAbove){S.jumpQ=true;}
      }
      // DOWN: target clearly below -> pink drop wins, else score 3 fall-lines.
      // Locked while committed so pink/brown seams can't flip dir every think.
      let down=isDropEscape||(S.pinkJukePhase===1)||false;
      if(isDropEscape){S.dropNoJumpT=0.85;}
      const belowGap=ty-(p.y+p.h);
      const sameTier=Math.abs(belowGap)<60&&Math.abs(dx)<200;
      if(isIt&&belowGap>60&&!sameTier){
        const onPink=botFullyOnDrop(p);
        if(isDirectPath&&belowGap>50&&onPink){
          down=true;
        }
        else if(S.descLockT>0&&S.descDir){
          // committed: hold lane, only pink state updates
          want=S.descDir;S.dir=want;
          down=!!onPink;
          if(!down)S.jumpQ=false;
        }
        else if(onPink&&(Math.abs(dx)<220||belowGap<300)){
          down=true;
          S.descLockT=0.25;S.descDir=S.dir||want||Math.sign(dx)||1;
          want=S.descDir;S.dir=want;
        }
        else if(p.gp&&!p.gp.wall){
          const scoreLane=(lx)=>{
            let hits=0;
            const y0=p.y+p.h+10, y1=ty;
            const dyLane=Math.abs(y1-y0);
            const kSteps=Math.max(3, Math.ceil(dyLane/24));
            for(let k=1; k<kSteps; k++){
              const sy=y0+(y1-y0)*k/kSteps;
              const pt={x:lx-3, y:sy-3, w:6, h:6};
              for(const s of SOLIDS){if(s.t==='drop')continue;if(hitRect(pt,s)){hits++;break;}}
            }
            return hits*200+Math.abs(lx-cx);
          };
          const cC=scoreLane(cx),cL=scoreLane(cx-150),cR=scoreLane(cx+150);
          let wdir;
          // default nearest edge, overridden by clearest lane
          const dL0=Math.abs(cx-p.gp.x),dR0=Math.abs(cx-(p.gp.x+p.gp.w));
          wdir=dL0<dR0?-1:1;
          if(cL<cC&&cL<=cR)wdir=-1;else if(cR<cC&&cR<cL)wdir=1;
          // clear-air flank check: if chosen side fall-line to target is empty, keep it
          want=wdir;S.dir=wdir;S.descLockT=0.35;S.descDir=wdir;
          S.jumpQ=false; // walk off cleanly, don't hop
        }
      }
      if(holdHighGround){
        down=false;
        S.wantDown=false;
        S.descLockT=0;
        S.descDir=0;
      }else{
        S.wantDown=down;
      }
      if(S.jumpQ)S.jumpHoldT=Math.max(S.jumpHoldT||0,0.12);
      if(S.descLockT>0&&!down&&!botWallAhead(p,want)){S.jumpQ=false;}
    }else{
      // AIR: gated wall-jumps + relaxed apex chaining + outward-hold anti-clip.
      const belowGapAir=ty-(p.y+p.h);
      const onOuterWall=(p.x<=WALL+16||p.x+p.w>=W-WALL-16);
      const isClimbing=(ty<p.y-40);
      S.airT2=(S.airT2||0)+botThinkRate;
      // Outward hold: rising past an overhang, keep pushing out until feet
      // clear the slab top, else we turn in early and clip the corner.
      if(S.climbPlat&&p.vy<0&&(p.y+p.h)>S.climbPlat.y){
        if(!onOuterWall){S.dir=S.climbOut||S.dir;S.climbT=0.15;}
      }else if(S.climbT>0){
        S.climbT-=botThinkRate;
        if(p.vy<0&&!onOuterWall&&S.climbOut)S.dir=S.climbOut;
        if(S.climbT<=0||(p.y+p.h)<(S.climbPlat?S.climbPlat.y:1e9))S.climbPlat=null;
      }
      if(p.sideT>0&&p.wallJumps<2){
        // Outer walls OK, interior only when climbing.
        if(onOuterWall||isClimbing||!isIt){
          if(belowGapAir<=60||!isIt){S.jumpQ=true;S.jumpHoldT=0.14;}
          else S.jumpQ=false;
        }else S.jumpQ=false;
      }
      else if(p.airJumps>0){
        if(S._policyDjDelay > 0){
          S._policyAirT = (S._policyAirT || 0) + botThinkRate;
          if(S._policyAirT >= S._policyDjDelay){
            S.jumpQ=true; S.jumpHoldT=0.14; S._policyDjDelay=0;
          }
        }
        // Double Jump Apex Chaining:
        // CHASE: Sweet-spot apex chaining (-130 < vy < 110) yields max vertical rise (~420px total)
        const apexWindow=(p.vy>-130&&p.vy<110);
        const headClear=!botSolidBetween(cx,p.y-4,cx,p.y-100,p.gp);
        if(isIt&&aboveBy>50&&apexWindow&&headClear&&S.airT2>0.10){
          const inDir=Math.sign(dx)||S.dir;
          if(p.vy<0&&botWallAhead(p,inDir)&&!onOuterWall){
            S.jumpQ=true;S.jumpHoldT=0.14;
          }else{
            S.jumpQ=true;S.jumpHoldT=0.14;S.dir=inDir;
          }
        }
        // FLEE: Airborne, falling into gap or blocked by wall -> double jump to clear obstacle
        else if(!isIt&&p.vy>50&&S.airT2>0.12){
          if(!botGroundAhead(p,want)||botWallAhead(p,want)){
            S.jumpQ=true;S.jumpHoldT=0.14;
          }
        }
      }
      else if(belowGapAir>60){S.jumpQ=false;}
      S.wantDown=false;
      // Falling: steer onto the slab below, avoiding the player's landing and intercept path!
      if(p.vy>80&&belowGapAir>40){
        S.descLockT=0;S.descDir=0;
        let landingSlab=null,closestDist=1e9;
        for(const s of SOLIDS){
          if(s.t==='drop')continue;
          if(s.y>=p.y+p.h+15&&s.y<=ty+60){
            if(cx>=s.x-40&&cx<=s.x+s.w+40){
              const dist=s.y-(p.y+p.h);
              if(dist<closestDist){closestDist=dist;landingSlab=s;}
            }
          }
        }
        if(landingSlab&&closestDist<180){
          if(isIt){
            // CHASE: steer onto slab toward target
            const safeX=clamp(tx,landingSlab.x+26,landingSlab.x+landingSlab.w-26);
            const offX=safeX-cx;
            if(Math.abs(offX)>36)S.dir=Math.sign(offX);
            else if(Math.abs(offX)<14)S.dir=0;
          }else{
            // FLEE: PREDICTIVE LANDING AVOIDANCE!
            // Calculate where hunter will be when bot lands:
            const timeToLand = Math.max(0.08, (landingSlab.y - (p.y + p.h)) / Math.max(p.vy, 150));
            const predWindow = 0.35;
            const predHunterX = tx + clamp((target.vx || 0) * (timeToLand + predWindow), -260, 260);

            // Steer towards the side of the platform furthest from where hunter will be:
            const leftX = landingSlab.x + 24;
            const rightX = landingSlab.x + landingSlab.w - 24;
            const dLeft = Math.abs(predHunterX - leftX);
            const dRight = Math.abs(predHunterX - rightX);
            const safeX = (dLeft > dRight) ? leftX : rightX;

            // If hunter is intercepting this exact landing spot and bot has an air jump, double-jump away!
            const hunterInterceptDanger = p.airJumps > 0 && Math.abs(predHunterX - cx) < 70 && Math.abs(ty - landingSlab.y) < 90;
            if(hunterInterceptDanger && S.airT2 > 0.12){
              S.jumpQ = true;
              S.jumpHoldT = 0.14;
              S.dir = (predHunterX > cx ? -1 : 1);
            } else {
              const offX = safeX - cx;
              if(Math.abs(offX) > 28) S.dir = Math.sign(offX);
              else if(Math.abs(offX) < 12) S.dir = 0;
            }
          }
        }else if(Math.abs(dx)<60){
          if(isIt&&aboveBy>40&&botSolidBetween(cx,p.y-10,cx,ty,p.gp)){
            S.dir=S.exitDir||(cx<W/2?1:-1);
          }else if(!isIt){
            // Falling straight down: drift away from hunter's predicted path
            const predHunterDir = Math.sign((target.vx || dx) || 1);
            S.dir = -predHunterDir;
          }else{
            S.dir=0;
          }
        }
      }
      // Rising: curl inward once the outward hold is done
      else if(isIt&&p.vy<0&&aboveBy>40&&p.vy>-250){
        if(!S.climbPlat&&Math.abs(dx)>20)S.dir=Math.sign(dx);
      }
      // FLEE AIR STALL / REVERSE FEINT:
      if(!isIt&&S.pinkJukePhase===0){
        const hunterCloseAir=Math.abs(dx)<180&&Math.abs(dy)<120;
        const hunterFast=Math.abs(target.vx||0)>180;
        if(hunterCloseAir&&hunterFast&&S.airBrakeCooldown<=0&&S.airBrakeT<=0){
          S.airBrakeT=0.18;
          S.airBrakeCooldown=2.6;
        }
        if(S.airBrakeT>0){
          S.airBrakeT-=stepDt;
          S.dir=p.vx!==0?-Math.sign(p.vx):0;
        }
      }
    }
  }
  // bonk detect: was rising, now stopped, under a solid
  if(p.vy>=0&&S.wasVy!==undefined&&S.wasVy<-350&&!p.grounded){
    // check ceiling right above head
    const hp={x:p.x+6,y:p.y-14,w:p.w-12,h:12};
    for(const s of SOLIDS){if(s.t==='drop')continue;if(hitRect(hp,s)){S.bonks++;S.bonkT=1.0;break;}}
    if(S.bonks>=2){
      // Genuine ceiling hit while climbing: blacklist the tried side and
      // force the opposite flank for 1.5s (or until elevation is gained)
      S.decideT=0;S.bonks=0;
      let side=S.exitDir;
      if(!side){
        const gp=p.gp||p.lastGp;
        side=gp?(Math.abs(cx-gp.x)<Math.abs(cx-(gp.x+gp.w))?-1:1):1;
      }
      S.bannedSide=side;S.banT=1.5;S.banTierY=p.y;
      S.exitLockT=0;S.exitDir=0;S.exitGp=null;S.hasExit=false;
      S.descLockT=0;S.descDir=0;
      S.climbPlat=null;S.climbOut=0;S.climbT=0;
      S.dir=-side;S.unstuckT=0.5;S.unstuckDir=S.dir;
    }
  }
  S.wasVy=p.vy;
  if(S.dropNoJumpT>0)S.jumpQ=false;
  const j=S.jumpQ;S.jumpQ=false;
  if(j)S.jumpHoldT=Math.max(S.jumpHoldT||0,0.12);
  let hold=!!j;
  if(S.jumpHoldT>0){S.jumpHoldT-=stepDt;hold=true;}
  return{dir:clamp(S.dir||0,-1,1),jumpEdge:!!j,jumpHeld:hold,downHeld:!!S.wantDown};
}

/* ================= PLATFORM NODES GEOMETRY HELPER ================= */
function demoNodes(){
  const r=[];
  for(const s of SOLIDS){
    if(!s.wall && !(s.w < 60 && s.h > s.w * 1.5)) r.push(s);
  }
  return r;
}
function inputFor(p,dt){
  if(p.isFrozen) return {dir:0,jumpEdge:false,jumpHeld:false,downHeld:false};
  if(typeof HARNESS !== 'undefined' && HARNESS.active && HARNESS.mode === 'playback' && p.slot === 1){
    return harnessBotPlaybackInput(p, dt);
  }
  if(isBotSlot(p)) return botInputFor(p,dt);
  
  const schemeIdx = (menu.slotCtrl && menu.slotCtrl[p.slot] != null) ? menu.slotCtrl[p.slot] : p.slot;
  const s = LOCAL_CTRL_SCHEMES[((schemeIdx % LOCAL_CTRL_SCHEMES.length) + LOCAL_CTRL_SCHEMES.length) % LOCAL_CTRL_SCHEMES.length] || LOCAL_CTRL_SCHEMES[0];
  const m = s.map || {};
  
  let dir = 0, jumpEdge = false, jumpHeld = false, downHeld = false;

  // Keyboard mapping
  if(m.L || m.R || m.U || m.D){
    const hasL = Array.isArray(m.L), hasR = Array.isArray(m.R);
    dir += (hasR ? (m.R.some(k => keys.has(k)) ? 1 : 0) : (keys.has(m.R) ? 1 : 0))
         - (hasL ? (m.L.some(k => keys.has(k)) ? 1 : 0) : (keys.has(m.L) ? 1 : 0));
    const hasU = Array.isArray(m.U), hasD = Array.isArray(m.D);
    jumpEdge = jumpEdge || (hasU ? m.U.some(k => pressed.has(k)) : pressed.has(m.U));
    jumpHeld = jumpHeld || (hasU ? m.U.some(k => keys.has(k)) : keys.has(m.U));
    downHeld = downHeld || (hasD ? m.D.some(k => keys.has(k)) : keys.has(m.D));
  }

  // Controller mapping
  if(s.id === 'controller'){
    let ctrlOrder = 0;
    if(menu && menu.slotCtrl){
      for(let sIdx = 0; sIdx < p.slot; sIdx++){
        const eIdx = menu.slotCtrl[sIdx];
        const eScheme = LOCAL_CTRL_SCHEMES[((eIdx % LOCAL_CTRL_SCHEMES.length) + LOCAL_CTRL_SCHEMES.length) % LOCAL_CTRL_SCHEMES.length];
        if(eScheme && eScheme.id === 'controller') ctrlOrder++;
      }
    }
    let connectedCount = 0;
    let pd = null;
    for(let pi = 0; pi < 4; pi++){
      if(PAD[pi] && PAD[pi].connected){
        if(connectedCount === ctrlOrder){
          pd = PAD[pi];
          break;
        }
        connectedCount++;
      }
    }
    if(!pd && PAD[p.slot] && PAD[p.slot].connected) pd = PAD[p.slot];
    if(!pd && PAD[0] && PAD[0].connected) pd = PAD[0];

    if(pd && pd.connected){
      dir += (pd.right ? 1 : 0) - (pd.left ? 1 : 0);
      jumpEdge = jumpEdge || pd.jumpE;
      jumpHeld = jumpHeld || pd.jumpHeld;
      downHeld = downHeld || pd.dropHeld;
    }
  }
  const isOnlineMatch = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isSplitLocal = (isTouch && !isOnlineMatch && match && match.players && match.players.length === 2 && !menu.botOn && menu.tab !== 'solo');
  if(!isSplitLocal && p.slot === (typeof NET !== 'undefined' && NET && NET.mySlot >= 0 ? NET.mySlot : 0)){
    if(TOUCH.left) dir = -1;
    if(TOUCH.right) dir = 1;
    if(TOUCH.jumpEdge) jumpEdge = true;
    if(TOUCH.jumpHeld) jumpHeld = true;
    if(TOUCH.downHeld) downHeld = true;
  }
  if(isSplitLocal){
    const gP = (p.slot === match.players[0].slot) ? LOCAL_TOUCH.p1 : ((p.slot === match.players[1].slot) ? LOCAL_TOUCH.p2 : null);
    if(gP){
      if(gP.left) dir = -1;
      if(gP.right) dir = 1;
      if(gP.jumpEdge){ jumpEdge = true; gP.jumpEdge = false; }
      if(gP.jumpHeld) jumpHeld = true;
      if(gP.downHeld) downHeld = true;
    }
  }
  const _demoOut={dir:clamp(dir,-1,1),jumpEdge:!!jumpEdge,jumpHeld:!!jumpHeld,downHeld:!!downHeld};
  if(typeof HARNESS!=='undefined'&&HARNESS.active&&HARNESS.mode==='record'&&p.slot===0){
    try{harnessPushTrace(p,_demoOut);}catch(e){}
  }

  return _demoOut;
}

function physUpdate(p,dt,allow){
  if(p.isEliminated){ p.vx = 0; p.vy = 0; return; }
  if(p.isFrozen){ p.vx = 0; p.vy = 0; return; }
  if(match && match.hunterMode && match.cageT > 0 && p.isHunter){
    p.vx = 0; p.vy = 0; allow = false;
  }
  const wasG=p.grounded;
  if(wasG)p.coyote=0.11;else p.coyote-=dt;
  let dir=0,jumpP=false,jumpHeld=false,downHeld=false;
  if(p.fumbleT > 0){ p.fumbleT -= dt; dir=0; jumpP=false; jumpHeld=false; downHeld=false; } // CTF fumble stun
  else if(allow){const inp=inputFor(p,dt);dir=inp.dir;jumpP=inp.jumpEdge;jumpHeld=inp.jumpHeld;downHeld=inp.downHeld;}
  const onSpeed=p.grounded&&!!zoneAtFeet(p,'speed');
  if(onSpeed&&!p.padOn)sfx('pad');
  p.padOn=onSpeed;
  const isIt=match.it===match.players.indexOf(p)&&match.state==='playing';
  let baseMax=isIt?IT_SPEED:RUN_SPEED;
  if(match && match.hunterMode){
    // Hunters are the chasers: slot lookup is immune to stale p.isHunter flags.
    const isHunterP=!!p.isHunter||p.slot===match.hunterRed||p.slot===match.hunterBlue;
    baseMax=isHunterP?IT_SPEED:RUN_SPEED;
  }
  if(settings.gameMode === 'infection' && typeof getInfectionPlayerSpeed === 'function'){
    baseMax = getInfectionPlayerSpeed(p);
  } else if(settings.gameMode === 'bomb' && typeof BOMB_MODE !== 'undefined' && BOMB_MODE && BOMB_MODE.carrierIdx === match.players.indexOf(p)){
    baseMax = (typeof BOMB_CONFIG !== 'undefined') ? BOMB_CONFIG.CARRIER_SPEED : 565;
  } else if(settings.gameMode === 'crown' && typeof getCrownPlayerSpeed === 'function'){
    baseMax = getCrownPlayerSpeed(p);
  } else if(settings.gameMode === 'ctf'){
    // Carriers run at normal speed, everyone else hunts at IT speed.
    const isCtfCarrier = (typeof ctfState !== 'undefined' && ctfState && ctfState.flags && ctfState.flags.some(f => f.carrier === p));
    baseMax = isCtfCarrier ? RUN_SPEED : IT_SPEED;
  }
  const maxs=baseMax*(onSpeed?SPEED_MULT:1);
  if(!onSpeed&&Math.abs(p.vx)>maxs){
    const target=Math.sign(p.vx)*maxs;
    p.vx+=(target-p.vx)*Math.min(1,dt*14);
  }
  
  /* SHARP ACCELERATION & SNAPPY BRAKING */
  const acc=p.grounded?ACC:AIR_ACC;
  const dec=p.grounded?DECEL:AIR_DEC;
  if(dir!==0){
    p.face=dir;
    const turning=(p.vx!==0&&Math.sign(p.vx)!==dir);
    p.vx+=dir*(turning?acc+dec*0.9:acc)*dt;
    if(dir*p.vx>maxs)p.vx=dir*maxs;
  }else{
    const d=dec*dt;
    if(Math.abs(p.vx)<=d)p.vx=0;else p.vx-=Math.sign(p.vx)*d;
  }
  
  if(jumpP)p.jbuf=0.16;else p.jbuf-=dt;
  
  /* PINK DROP-THROUGH: only the player's OWN down input counts, and only when
     FULLY standing on pink — the whole body (minus a 6px forgiveness margin)
     must be over the pink span. Straddling brown+pink (like standing on the
     seam) does nothing, so holding S while walking across never clips you. */
  const fullyOn=(plat)=>{
    if(!plat||plat.t!=='drop')return false;
    if(!plat.dy) return (p.x+6>=plat.x)&&(p.x+p.w-6<=plat.x+plat.w);
    if(!(p.x+6>=plat.x && p.x+p.w-6<=plat.x+plat.w)) return false;
    const sy=plat.y + (p.x - plat.x)*plat.dy/plat.w;
    return Math.abs(sy - (p.y+p.h)) < 20;
  };
  const planted=p.grounded&&p.gp&&fullyOn(p.gp);
  const hoverPlat=!p.grounded&&p.vy>-60&&p.vy<160?zoneAtFeet(p,'drop'):null;
  const hoverDrop=!!hoverPlat&&(p.x+6>=hoverPlat.x)&&(p.x+p.w-6<=hoverPlat.x+hoverPlat.w);
  if(downHeld&&(planted||hoverDrop)){
    p.jbuf = 0;
    const dropPlat=planted?p.gp:hoverPlat;
    if(dropPlat){
      p.dropT=0.35;
      p.grounded=false;
      p.gp=null;
      p.y+=8; /* Nudge feet past top surface to drop immediately */
      p.vy=Math.max(p.vy,160);
      sfx('drop');
      dust(p.x+p.w/2,p.y+p.h,5,60);
    }
  }
  if(p.dropT>0)p.dropT-=dt;
  
  /* WALL CONTACT FOR PARKOUR WALL-JUMP (NO SLOW-FALL WALL SLIDE) */
  const onWall=!p.grounded&&p.sideT>0;
  
  /* JUMP HANDLING: Ground, Wall-Jump, Double Jump, and Blue Pad Boost.
     Tap = shorter hop; holding jump sustains reduced gravity for 0.10s so a
     full hold rises just past the old fixed jump height. */
  if(p.jbuf>0 && !downHeld){
    if(p.grounded||p.coyote>0){
      const boost=(p.grounded&&zoneAtFeet(p,'boost'))?BOOST_MULT:1;
      p.vy=-JUMP_V*boost;
      p.vx=clamp(p.vx,-baseMax*1.1,baseMax*1.1);
      if(boost>1){sfx('boost');ringP(p.x+p.w/2,p.y+p.h,'#4a90e2');}else sfx('jump');
      p.grounded=false;p.coyote=0;p.jbuf=0;p.holdT=HOLD_LIFT_T;p.airJumps=settings.doubleJump?1:0;
      p.sy=1.10;p.sx=0.93;dust(p.x+p.w/2,p.y+p.h,5,70);
    }else if(onWall&&p.wallJumps<2){
      /* KICK OFF WALL! (Wall-Jump: Max 2 consecutive) */
      p.wallJumps++;
      p.vy=-JUMP_V*0.96;
      p.vx=-p.wallSide*480;
      p.face=-p.wallSide;
      p.sideT=0;p.jbuf=0;p.holdT=HOLD_LIFT_T;
      p.airJumps=settings.doubleJump?1:0;
      p.sy=1.09;p.sx=0.92;
      sfx('walljump');
      dust(p.x+(p.wallSide<0?0:p.w),p.y+p.h/2,4,80);
    }else if(p.airJumps>0){
      p.vy=-JUMP_V*0.95;p.airJumps--;p.jbuf=0;p.holdT=HOLD_LIFT_T;p.vx=clamp(p.vx,-baseMax*1.1,baseMax*1.1);sfx('djump');
      ringP(p.x+p.w/2,p.y+p.h/2,'#ffffff');p.sy=1.08;p.sx=0.94;
    }
  }

  /* Variable jump height: reduced gravity while jump is held and rising */
  if(p.holdT>0&&jumpHeld&&p.vy<0){p.vy+=G*HOLD_GRAV_F*dt;p.holdT-=dt;}
  else{p.vy+=G*dt;if(jumpHeld&&p.vy>=0)p.holdT=0;}
  if(p.vy>MAXFALL)p.vy=MAXFALL;

  /* Horizontal collision, sub-stepped so sprinters can't tunnel thin walls */
  const hSteps=(Math.abs(p.vx)*dt>13)?2:1;
  for(let hs=0;hs<hSteps;hs++){
  const leftBefore=p.x,rightBefore=p.x+p.w;
  p.x+=p.vx*dt/hSteps;
  for(const s of SOLIDS){
    if(s.t==='drop')continue; /* ONLY pink allows pass-through! */
    if(!s.dy){
      if(!hitRect(p,s))continue;
      /* If s is a thin horizontal platform (shelf/floor, not a vertical wall), only push if approaching from outside */
      if(!s.wall&&s.h<=46){
        const wasOutsideLeft=rightBefore<=s.x+2;
        const wasOutsideRight=leftBefore>=s.x+s.w-2;
        if(!wasOutsideLeft&&!wasOutsideRight)continue;
      }
      const fl=(p.x+p.w)-s.x,fr=(s.x+s.w)-p.x;
      if(fl<fr){p.x=s.x-p.w;if(p.vx>0)p.vx=0;p.wallSide=1;}
      else{p.x=s.x+s.w;if(p.vx<0)p.vx=0;p.wallSide=-1;}
      if((!s.wall||s.h>s.w)&&!wasG&&p.vy>-20){
        p.sideT=0.28;
      }
    }else{
      /* Tilted slope end-walls */
      if(p.vx>0&&p.x+p.w>=s.x&&leftBefore+p.w<=s.x+8){
        const yTop=s.y,yBot=s.y+s.h;
        if(p.y+p.h>yTop+4&&p.y<yBot-4){p.x=s.x-p.w;p.vx=0;p.wallSide=1;p.sideT=0.28;}
      }
      if(p.vx<0&&p.x<=s.x+s.w&&leftBefore>=s.x+s.w-8){
        const yTop=s.y+s.dy,yBot=s.y+s.dy+s.h;
        if(p.y+p.h>yTop+4&&p.y<yBot-4){p.x=s.x+s.w;p.vx=0;p.wallSide=-1;p.sideT=0.28;}
      }
    }
  }
  } /* end sub-step loop */
  
  /* Vertical collision: Slopes & solids are 100% solid! Pink is one-way & fall-through - vertical sub-stepped to prevent tunneling */
  p.grounded=false;
  const vSteps=(Math.abs(p.vy)*dt>23)?2:1;
  const subDt=dt/vSteps;
  for(let vs=0;vs<vSteps;vs++){
    const headBefore=p.y,feetBefore=p.y+p.h;
    p.y+=p.vy*subDt;
  
  for(const s of SOLIDS){
    if(!s.dy){
      /* Flat platform */
      const xOverlap=(p.x+p.w>s.x+2&&p.x<s.x+s.w-2);
      if(!xOverlap)continue;
      
      if(s.t==='drop'){
        /* PINK DROP PLATFORM:
           1. NEVER blocks jumping up (can always jump through from below)
           2. Passes through when dropT>0 (just triggered a drop), OR when the
              player's OWN down is held AND they are FULLY on this pink span.
              Straddling a brown/pink seam while holding S does NOT fall —
              the neighbouring solid still catches you (see solid branch).
           3. Lands only when falling downward and feet cross the top surface */
        const fullyHere=(p.x+6>=s.x)&&(p.x+p.w-6<=s.x+s.w);
        if(p.dropT>0||(downHeld&&fullyHere))continue;
        if(p.vy>0&&feetBefore<=s.y+6&&p.y+p.h>=s.y&&p.y+p.h<=s.y+s.h+10){
          const imp=p.vy;
          p.y=s.y-p.h;
          p.vy=0;
          landOn(p,s,imp,wasG);
        }
        continue;
      }
      
      /* Solid brown, orange speed, or blue boost: FULLY SOLID FROM TOP AND BOTTOM!
         Holding S only lets you fall where pink already let go (dropT>0, or a
         pink span at this height that you are FULLY standing on). A straddler
         holding S still lands on this solid — never sinks through the seam. */
      if(p.vy>0){
        /* Falling down onto platform */
        if(p.dropT>0||downHeld){
          /* If currently dropping through, do NOT catch on adjacent/overlapping solids at same level! */
          const hasDropAtY=SOLIDS.some(d=>d.t==='drop'&&Math.abs(d.y-s.y)<=10&&p.x+p.w>d.x+2&&p.x<d.x+d.w-2&&(p.x+6>=d.x)&&(p.x+p.w-6<=d.x+d.w));
          if(hasDropAtY)continue;
        }
        if(feetBefore<=s.y+8&&p.y+p.h>=s.y&&p.y<s.y+s.h){
          const imp=p.vy;
          p.y=s.y-p.h;
          p.vy=0;
          landOn(p,s,imp,wasG);
        }
      }else if(p.vy<0){
        /* Jumping UP: head bonks the solid underside — UNLESS the player's body
           actually overlaps a pink platform at this height (i.e. jumping up
           through pink that shares the seam). The pink must cover the player's
           center, not merely sit nearby, so brown/pink edge seams stay solid. */
        const midX=p.x+p.w/2;
        const thruPink=SOLIDS.some(d=>d.t==='drop'&&Math.abs(d.y-s.y)<=10&&midX>d.x+4&&midX<d.x+d.w-4);
        if(!thruPink&&headBefore>=s.y+s.h-8&&p.y<=s.y+s.h&&p.y+p.h>s.y){
          p.y=s.y+s.h;
          p.vy=0;
        }
      }
    }else{
      /* Tilted platform / slope */
      const xOverlap=(p.x+p.w>s.x+2&&p.x<s.x+s.w-2);
      if(!xOverlap)continue;
      
      const px=clamp(p.x+p.w/2,s.x,s.x+s.w);
      const syTop=s.y+(px-s.x)*(s.dy/s.w);
      const syBot=syTop+s.h;
      
      if(s.t==='drop'){
        const fullyHere0=(p.x+6>=s.x)&&(p.x+p.w-6<=s.x+s.w);
        if(p.dropT>0||(downHeld&&fullyHere0))continue;
        if(p.vy>0&&feetBefore<=syTop+6&&p.y+p.h>=syTop&&p.y+p.h<=syBot+8){
          const imp=p.vy;
          p.y=syTop-p.h;
          p.vy=0;
          landOn(p,s,imp,wasG);
          p.grounded=true;
          p.vx+=Math.sign(s.dy)*600*subDt;
        }
        continue;
      }
      
      if(p.vy>=0){
        if(p.dropT>0||downHeld){
          const hasDropAtY=SOLIDS.some(d=>d.t==='drop'&&Math.abs(d.y-syTop)<=12&&p.x+p.w>d.x+2&&p.x<d.x+d.w-2&&(p.x+6>=d.x)&&(p.x+p.w-6<=d.x+d.w));
          if(hasDropAtY)continue;
        }
        /* Landing on top of slope */
        if(feetBefore<=syTop+8&&p.y+p.h>=syTop-6&&p.y<syBot){
          const imp=p.vy;
          p.y=syTop-p.h;
          p.vy=0;
          landOn(p,s,imp,wasG);
          p.grounded=true;
          p.vx+=Math.sign(s.dy)*600*subDt;
        }
      }else if(p.vy<0){
        /* Jumping UP into slope: head hits bottom, unless rising through pink at the seam */
        const midX2=p.x+p.w/2;
        const thruPink2=SOLIDS.some(d=>d.t==='drop'&&Math.abs(d.y-syTop)<=12&&midX2>d.x+4&&midX2<d.x+d.w-4);
        if(!thruPink2&&headBefore>=syBot-10&&p.y<=syBot&&p.y+p.h>syTop){
          p.y=syBot;
          p.vy=0;
        }
      }
    }
  }
  }
  
  p.x=clamp(p.x,WALL,W-WALL-p.w);
  if(p.x<=WALL){p.wallSide=-1;if(!p.grounded&&p.vy>-20)p.sideT=0.28;}
  else if(p.x>=W-WALL-p.w){p.wallSide=1;if(!p.grounded&&p.vy>-20)p.sideT=0.28;}
  p.y=clamp(p.y,WALL,H-WALL-p.h);
  if(p.y>=H-WALL-p.h){
    /* Arena floor counts as a landing: squash, dust and sound included */
    if(!wasG&&!p.grounded)landOn(p,SOLIDS[1],p.vy,wasG);
    else{p.grounded=true;p.gp=SOLIDS[1];p.lastGp=SOLIDS[1];p.wallJumps=0;}
    p.vy=0;
  }
  p.sx+=(1-p.sx)*Math.min(1,dt*11);
  p.sy+=(1-p.sy)*Math.min(1,dt*11);
  p.landT-=dt;p.tagT-=dt;p.sideT-=dt;
  p.blinkT-=dt;
  if(p.blinkT<=0){p.blink=0.12;p.blinkT=rand(1.8,4.5);}
  p.blink-=dt;
  
  /* Dynamic Speed Ghost Trail FX */
  if(Math.abs(p.vx)>320||onSpeed){
    p.trail.unshift({x:p.x,y:p.y,alpha:0.45});
    if(p.trail.length>4)p.trail.pop();
  }else{
    if(p.trail.length>0)p.trail.pop();
  }
  for(let tr of p.trail)tr.alpha-=dt*1.8;
  
  /* Unlockable Cosmetic Trails recorded behind moving players */
  if(!p.cosmeticTrail) p.cosmeticTrail = [];
  const curSpd = Math.hypot(p.vx, p.vy);
  if(curSpd > 50 || !p.grounded){
    p.cosmeticTrail.unshift({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: p.vx, vy: p.vy, t: tGlobal });
    if(p.cosmeticTrail.length > 10) p.cosmeticTrail.pop();
  } else if(p.cosmeticTrail.length > 0){
    p.cosmeticTrail.pop();
  }
  
  if(p.grounded&&Math.abs(p.vx)>240&&Math.random()<dt*14)dust(p.x+p.w/2-p.face*16,p.y+p.h-2,1,30);
}

function pairCollide(){
  if(!settings.collision||match.cooldown>0||match.state!=='playing')return;
  const P=match.players;
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
    const a=P[i],b=P[j];
    if(a.isEliminated || b.isEliminated) continue;
    if(match.hunterMode && match.cageT > 0 && (a.isHunter || b.isHunter)) continue;
    if(!hitRect(a,b))continue;
    const ox=Math.min(a.x+a.w-b.x,b.x+b.w-a.x),oy=Math.min(a.y+a.h-b.y,b.y+b.h-a.y);
    if(ox<oy){
      const s=(a.x+a.w/2<b.x+b.w/2)?-1:1;
      a.x+=s*ox/2;b.x-=s*ox/2;
      if(s<0){if(a.vx>0)a.vx=0;if(b.vx<0)b.vx=0;}else{if(a.vx<0)a.vx=0;if(b.vx>0)b.vx=0;}
    }else{
      const s=(a.y+a.h/2<b.y+b.h/2)?-1:1;
      a.y+=s*oy/2;b.y-=s*oy/2;
      if(s<0){if(a.vy>0)a.vy=0;if(b.vy<0)b.vy=0;}else{if(b.vy>0)b.vy=0;if(a.vy<0)a.vy=0;}
    }
  }
}
function tagBox(p){const pad=5;return{x:p.x-pad,y:p.y-pad,w:p.w+2*pad,h:p.h+2*pad};}
function applyTag(newItIdx, popX, popY){
  if(!match || match.state !== 'playing' || match.cooldown > 0) return;
  const P = match.players;
  if(newItIdx < 0 || newItIdx >= P.length) return;
  const oldIt = P[match.it];
  const newIt = P[newItIdx];
  if(!oldIt || !newIt) return;

  match.it = newItIdx;
  if(settings.teams && newIt.team != null){
    match.itTeam = newIt.team;
  }
  match.cooldown = 3;
  match.tags[newItIdx]++;
  match.freeze = 0.09; match.shake = 13; match.flash = 0.14;
  match.tagPop = { t: 0.55, x: popX != null ? popX : (oldIt.x + newIt.x) / 2 + 23, y: popY != null ? popY : (oldIt.y + newIt.y) / 2 + 10 };
  if(newItIdx === 0 || (newIt && newIt.slot === 0)){ try{ SESSION_METRICS.lastTagT = Date.now(); }catch(e){} }
  oldIt.tagT = 0.7; newIt.tagT = 0.7;
  sfx('tag');
  tagBurst(match.tagPop.x, match.tagPop.y, getPlayerColor(oldIt), getPlayerColor(newIt));
}

