/* ================= match ================= */
let matchIndex=0,lastStartIT=0;
let match=null;
const cam={x:W/2,y:H/2,s:0.5};

function findSafeSpawn(team, isHunter, playerIndex, totalPlayers){
  const P_W = 46, P_H = 46;

  function isSpotSafe(sx, sy){
    if(sx < WALL + 10 || sx + P_W > W - WALL - 10) return false;
    if(sy < WALL + 10 || sy + P_H > H - WALL) return false;
    const body = { x: sx + 2, y: sy + 2, w: P_W - 4, h: P_H - 4 };
    if(SOLIDS.some(s => hitRect(body, s))) return false;
    const head = { x: sx + 4, y: sy - 20, w: P_W - 8, h: 20 };
    if(SOLIDS.some(s => hitRect(head, s))) return false;
    return true;
  }

  // 1. Collect all valid flat platforms from SOLIDS
  const candidateSpots = [];
  for(const s of SOLIDS){
    if(s.dy || s.w < 60) continue; // Skip slopes and thin vertical walls
    if(s.t === 'speed' || s.t === 'boost' || s.t === 'drop') continue; // Exclude speed/boost pads and hazards
    const surfaceY = s.y;
    const testY = surfaceY - P_H;

    // Try center, left edge, and right edge of platform
    const spots = [
      Math.round(s.x + s.w / 2 - P_W / 2),
      Math.round(s.x + 16),
      Math.round(s.x + s.w - P_W - 16)
    ];
    for(const testX of spots){
      if(isSpotSafe(testX, testY)){
        candidateSpots.push({ x: testX, y: testY, platY: surfaceY, plat: s });
      }
    }
  }

  // 2. Also check the arena floor (accounting for any boost/speed pads on floor)
  for(let fx = WALL + 80; fx < W - WALL - 80; fx += 80){
    let floorSurfaceY = H - WALL;
    let onHazard = false;
    for(const s of SOLIDS){
      if(!s.dy && fx + P_W > s.x && fx < s.x + s.w){
        if(s.t === 'speed' || s.t === 'boost' || s.t === 'drop'){
          onHazard = true;
          break;
        }
        if(s.y < floorSurfaceY && s.y >= H - WALL - 120){
          floorSurfaceY = s.y;
        }
      }
    }
    if(onHazard) continue;
    const fy = floorSurfaceY - P_H;
    if(isSpotSafe(fx, fy)){
      candidateSpots.push({ x: fx, y: fy, platY: floorSurfaceY, isFloor: true });
    }
  }

  if(isHunter){
    if(team === 0){
      // Red Hunter: leftmost bottom spot
      const leftSpots = candidateSpots.filter(p => p.x < W * 0.45).sort((a,b) => b.y - a.y || a.x - b.x);
      if(leftSpots.length > 0) return { x: leftSpots[0].x, y: leftSpots[0].y, face: 1 };
    } else {
      // Blue Hunter: rightmost bottom spot
      const rightSpots = candidateSpots.filter(p => p.x > W * 0.55).sort((a,b) => b.y - a.y || b.x - a.x);
      if(rightSpots.length > 0) return { x: rightSpots[0].x, y: rightSpots[0].y, face: -1 };
    }
  } else {
    if(team === 0){
      // Red Runners: upper platforms on right half
      const rightRunners = candidateSpots.filter(p => p.x > W * 0.40 && p.y < H * 0.85).sort((a,b) => a.y - b.y);
      if(rightRunners.length > 0){
        const pick = rightRunners[playerIndex % rightRunners.length];
        return { x: pick.x, y: pick.y, face: -1 };
      }
    } else {
      // Blue Runners: upper platforms on left half
      const leftRunners = candidateSpots.filter(p => p.x < W * 0.60 && p.y < H * 0.85).sort((a,b) => a.y - b.y);
      if(leftRunners.length > 0){
        const pick = leftRunners[playerIndex % leftRunners.length];
        return { x: pick.x, y: pick.y, face: 1 };
      }
    }
  }

  // Fallback: pick any safe spot
  if(candidateSpots.length > 0){
    const pick = candidateSpots[playerIndex % candidateSpots.length];
    return { x: pick.x, y: pick.y, face: pick.x < W/2 ? 1 : -1 };
  }

  // Absolute fallback: center of arena
  return { x: W/2 - 23, y: H/2 - 23, face: 1 };
}

function makePlayer(i,slot,colIdx){
  const N=activeSlots().length;
  const s=SLOTS[slot] || SLOTS[0];
  const team = (menu.slotTeam && menu.slotTeam[slot] != null) ? menu.slotTeam[slot] : (slot % 2);
  let x, y, face;

  const isHunterMode = (settings.gameMode === 'hunter');
  let roleHunter = false;

  if(isHunterMode){
    roleHunter = (team === 0 && slot === settings.hunterRed) || (team === 1 && slot === settings.hunterBlue);
    const safeSpawn = findSafeSpawn(team, roleHunter, i, N);
    x = safeSpawn.x;
    y = safeSpawn.y;
    face = safeSpawn.face;
  } else {
    // Normal party / teams spawn: verify and safe-snap to avoid platform clipping
    let candidateX = Math.round(WALL + (W - 2 * WALL) * ((i + 0.5) / N)) - 23;
    let surfaceY = H - WALL;
    for(const s of SOLIDS){
      if(!s.dy && candidateX + 46 > s.x && candidateX < s.x + s.w){
        if(s.y < surfaceY && s.y >= H - WALL - 120){
          surfaceY = s.y;
        }
      }
    }
    x = candidateX;
    y = surfaceY - 46;
    face = (i % 2 === 0 ? 1 : -1);
  }

  // Emergency safety guard: verify 0 solid overlap
  for(let pass = 0; pass < 5; pass++){
    const pBox = { x: x + 2, y: y + 2, w: 42, h: 42 };
    const coll = SOLIDS.find(s => hitRect(pBox, s));
    if(!coll) break;
    y = coll.y - 46;
  }

  return {x:x,y:y,w:46,h:46,vx:0,vy:0,grounded:true,gp:SOLIDS[1],lastGp:SOLIDS[1],
    face:face,airJumps:settings.doubleJump?1:0,wallJumps:0,coyote:0,jbuf:0,holdT:0,dropT:0,sideT:0,wallSide:0,
    sx:1,sy:1,landT:0,tagT:0,padOn:false,blinkT:rand(1.5,4),blink:0,seed:i*3.7,
    slot:slot,colIdx:colIdx,team:team,trail:[],cosmeticTrail:[],isHunter:roleHunter,isEliminated:false,survivalT:0,isFrozen:false};
}
