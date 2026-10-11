/* ================= HUNTER MODE CORE ENGINE ================= */
function getPlayerDisplayName(p){
  if(!p) return 'Player';
  if(typeof NET !== 'undefined' && NET && NET.slotsName && NET.slotsName[p.slot]){
    return NET.slotsName[p.slot];
  }
  return 'Player ' + (p.slot + 1);
}

function eliminateHunterRunner(hunter, runner, popX, popY){
  if(!match || !match.hunterMode || runner.isEliminated) return;
  runner.isEliminated = true;
  runner.eliminatedTime = Math.max(0.1, Math.round((60 - match.timer) * 10) / 10);
  runner.survivalT = runner.eliminatedTime;

  if(!match.tournamentStats) match.tournamentStats = { tags: {}, survival: {} };
  match.tournamentStats.tags[hunter.slot] = (match.tournamentStats.tags[hunter.slot] || 0) + 1;

  match.freeze = 0.08;
  match.shake = 13;
  match.flash = 0.12;
  match.tagPop = { t: 0.55, x: popX != null ? popX : runner.x + 23, y: popY != null ? popY : runner.y + 10 };
  runner.tagT = 0.7;
  hunter.tagT = 0.7;
  sfx('tag');
  tagBurst(match.tagPop.x, match.tagPop.y, getPlayerColor(hunter), getPlayerColor(runner));

  const hunterName = getPlayerDisplayName(hunter);
  const runnerName = getPlayerDisplayName(runner);
  const enemyTeam = runner.team;
  const livingRunners = match.players.filter(p => p.team === enemyTeam && !p.isHunter && !p.isEliminated);
  const leftCount = livingRunners.length;
  const leftMsg = leftCount === 1 ? '1 runner left!' : (leftCount + ' runners left');
  const toastMsg = '💥 ' + hunterName + ' caught ' + runnerName + '! (' + leftMsg + ')';

  if(!match.killfeed) match.killfeed = [];
  match.killfeed.unshift({ msg: toastMsg, t: 3.5, team: hunter.team });
  if(match.killfeed.length > 3) match.killfeed.pop();
  toast(toastMsg);

  // Broadcast elimination if online host
  if(typeof NET !== 'undefined' && NET && NET.role !== null && NET.isHost){
    netBroadcastReliable({
      t: 'hunter_catch',
      hunterSlot: hunter.slot,
      runnerSlot: runner.slot,
      x: match.tagPop.x,
      y: match.tagPop.y
    });
  }

  // Check Full Wipe:
  if(leftCount === 0){
    match.hunterWipeTime[hunter.team] = Math.round((60 - match.timer) * 10) / 10;
    endHunterRound(hunter.team);
  }
}

function endHunterRound(wiperTeam){
  if(!match || !match.hunterMode || match.state === 'hunter_round_result') return;
  try{ CG.happytime(); }catch(e){}
  try{ CG.gameplayStop(); }catch(e){}

  match.state = 'hunter_round_result';
  match.resultT = 0;
  match.intermissionTimer = 15.0;

  const P = match.players;
  const redRunners = P.filter(p => p.team === 0 && !p.isHunter);
  const blueRunners = P.filter(p => p.team === 1 && !p.isHunter);
  const nRed = redRunners.length || 1;
  const nBlue = blueRunners.length || 1;

  // 1. Capture Points (Max 50 pts)
  const redCaught = blueRunners.filter(p => p.isEliminated).length;
  const blueCaught = redRunners.filter(p => p.isEliminated).length;
  const redCapturePts = Math.round(50 * (redCaught / nBlue));
  const blueCapturePts = Math.round(50 * (blueCaught / nRed));

  // 2. Hunter Speed Bonus (Max 30 pts)
  let redSpeedPts = 0;
  if(match.hunterWipeTime[0] != null){
    redSpeedPts = Math.round(30 * Math.max(0, (60 - match.hunterWipeTime[0]) / 60));
  }
  let blueSpeedPts = 0;
  if(match.hunterWipeTime[1] != null){
    blueSpeedPts = Math.round(30 * Math.max(0, (60 - match.hunterWipeTime[1]) / 60));
  }

  // 3. Runner Survival Bonus (Max 20 pts)
  const elapsed = Math.max(1, 60 - match.timer);
  let redSurvivalSum = 0;
  for(const r of redRunners){
    redSurvivalSum += (r.isEliminated ? (r.survivalT || r.eliminatedTime || 0) : elapsed);
  }
  const redSurvivalPts = Math.round(20 * (redSurvivalSum / (nRed * 60)));

  let blueSurvivalSum = 0;
  for(const r of blueRunners){
    blueSurvivalSum += (r.isEliminated ? (r.survivalT || r.eliminatedTime || 0) : elapsed);
  }
  const blueSurvivalPts = Math.round(20 * (blueSurvivalSum / (nBlue * 60)));

  // Round Totals
  const redRoundTotal = Math.min(100, redCapturePts + redSpeedPts + redSurvivalPts);
  const blueRoundTotal = Math.min(100, blueCapturePts + blueSpeedPts + blueSurvivalPts);

  if(!match.hunterScores) match.hunterScores = { 0: 0, 1: 0 };
  match.hunterScores[0] += redRoundTotal;
  match.hunterScores[1] += blueRoundTotal;

  if(!match.tournamentStats) match.tournamentStats = { tags: {}, survival: {} };
  for(const p of P){
    if(!p.isHunter){
      const surv = p.isEliminated ? (p.survivalT || 0) : 60;
      match.tournamentStats.survival[p.slot] = (match.tournamentStats.survival[p.slot] || 0) + surv;
    }
  }

  const isMatchOver = (match.hunterRound >= match.hunterMaxRounds);
  if(isMatchOver && !match._telemetrySent){
    try{ telemetryTrackMatchEnded(); }catch(e){}
  }
  match.roundSummary = {
    round: match.hunterRound,
    wiperTeam: wiperTeam,
    red: { capture: redCapturePts, speed: redSpeedPts, survival: redSurvivalPts, total: redRoundTotal },
    blue: { capture: blueCapturePts, speed: blueSpeedPts, survival: blueSurvivalPts, total: blueRoundTotal },
    cumulative: { 0: match.hunterScores[0], 1: match.hunterScores[1] },
    tournamentStats: match.tournamentStats,
    isMatchOver: isMatchOver
  };

  // Career: best single-round survival + tournament titles (this device)
  try{
    const isOnlineH = (typeof NET !== 'undefined' && NET && NET.role !== null);
    const mySlotH = isOnlineH ? NET.mySlot : 0;
    if(mySlotH != null && mySlotH >= 0){
      const me = P.find(p => p.slot === mySlotH);
      if(me && !me.isHunter){
        const mySurv = me.isEliminated ? (me.survivalT || 0) : elapsed;
        if(mySurv > CAREER.surv){ CAREER.surv = Math.round(mySurv * 10) / 10; }
      }
      if(isMatchOver){
        const s = match.roundSummary.cumulative;
        const myTeam = me ? me.team : ((menu.slotTeam && menu.slotTeam[mySlotH] != null) ? menu.slotTeam[mySlotH] : (mySlotH % 2));
        const tied = (s[0] === s[1]);
        const wonT = !tied && ((s[0] > s[1] ? 0 : 1) === myTeam);
        CAREER.m++;
        if(wonT){ CAREER.w++; CAREER.titles++; CAREER.streak++; if(CAREER.streak > CAREER.bestStreak) CAREER.bestStreak = CAREER.streak; }
        else if(!tied){ CAREER.streak = 0; }
      }
      saveCareer();
    }
  }catch(e){}

  confetti();
  sfx('win');

  if(typeof NET !== 'undefined' && NET && NET.role !== null && NET.isHost){
    netBroadcastReliable({ t: 'hunter_score', summary: match.roundSummary });
  }
}

function advanceHunterRound(){
  if(!match || !match.hunterMode) return;
  if(match.roundSummary && match.roundSummary.isMatchOver){
    match.hunterRound = 1;
    match.hunterScores = { 0: 0, 1: 0 };
    match.hunterHistory = {};
    match.tournamentStats = { tags: {}, survival: {} };
    if(menu.hunterHistory) menu.hunterHistory = {};
    menu.hunterVotes = {};
    startMatch();
    return;
  }

  // Resolve team hunters from votes / tie-breakers (fewest hunter rounds first, then random)
  const electedRed = resolveTeamHunter(0);
  const electedBlue = resolveTeamHunter(1);
  settings.hunterRed = electedRed;
  settings.hunterBlue = electedBlue;

  // Track hunter history rounds
  if(!match.hunterHistory) match.hunterHistory = {};
  match.hunterHistory[electedRed] = (match.hunterHistory[electedRed] || 0) + 1;
  match.hunterHistory[electedBlue] = (match.hunterHistory[electedBlue] || 0) + 1;
  if(menu.hunterHistory){
    menu.hunterHistory[electedRed] = match.hunterHistory[electedRed];
    menu.hunterHistory[electedBlue] = match.hunterHistory[electedBlue];
  }

  // Clear votes for upcoming rounds
  menu.hunterVotes = {};

  match.hunterRound++;
  match.roundSummary = null;
  match.hunterWipeTime = { 0: null, 1: null };

  match.hunterRed = settings.hunterRed;
  match.hunterBlue = settings.hunterBlue;
  match.cageT = 3.0;
  match.timer = 60;
  match.lastTick = 60;
  match.killfeed = [];
  match.spectateTarget = null;
  match.tagPop = null;
  match.state = 'countdown';
  match.cd = 3;
  match.cdT = 0;

  buildLevel();
  match.players = activeSlots().map((slot, i) => makePlayer(i, slot, menu.slotColor[slot]));

  sfx('count');

  if(typeof NET !== 'undefined' && NET && NET.role !== null && NET.isHost){
    const payload = {
      it: match.it, itTeam: match.itTeam, cooldownN: 0, matchIndex: matchIndex,
      currentThemeIdx: currentThemeIdx, lastStartIT: lastStartIT,
      hunterMode: true, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue,
      hunterRound: match.hunterRound, hunterScores: match.hunterScores, cageT: match.cageT,
      hunterHistory: match.hunterHistory
    };
    netBroadcastReliable({
      t: 'start',
      settings: {
        map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision,
        teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed,
        hunterBlue: settings.hunterBlue, slotColor: menu.slotColor.slice(),
        slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : [])
      },
      mapData: MAPS[settings.map % MAPS.length],
      payload: payload
    });
  }
}

function cycleHunterSpectate(team){
  if(!match || !match.hunterMode) return;
  const friendlyAlive = match.players.filter(p => p.team === team && !p.isEliminated);
  if(friendlyAlive.length === 0) return;
  let curIdx = friendlyAlive.findIndex(p => p.slot === match.spectateTarget);
  curIdx = (curIdx + 1) % friendlyAlive.length;
  match.spectateTarget = friendlyAlive[curIdx].slot;
  sfx('ui');
}

function shouldRenderHunterPlayer(viewerSlot, targetPlayer){
  if(typeof NET === 'undefined' || !NET || NET.role === null) return true; // Local couch: show all!
  if(viewerSlot == null || viewerSlot < 0) return true; // Online spectator: show all!
  if(targetPlayer.slot === viewerSlot) return true; // Always show self!
  if(targetPlayer.isEliminated) return false;

  const myP = match.players.find(p => p.slot === viewerSlot);
  if(!myP) return true;

  const isMyTeamRed = (myP.team === 0);
  const isMeHunter = (myP.slot === (isMyTeamRed ? match.hunterRed : match.hunterBlue));

  if(isMeHunter){
    // Hunter ONLY sees opposing runners!
    return (targetPlayer.team !== myP.team && targetPlayer.slot !== (isMyTeamRed ? match.hunterBlue : match.hunterRed));
  } else {
    // Runner sees opposing hunter + friendly runners!
    const isEnemyHunter = (targetPlayer.slot === (isMyTeamRed ? match.hunterBlue : match.hunterRed));
    const isFriendlyRunner = (targetPlayer.team === myP.team && targetPlayer.slot !== (isMyTeamRed ? match.hunterRed : match.hunterBlue));
    return isEnemyHunter || isFriendlyRunner;
  }
}

function drawHunterCage(p){
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const rad = p.w * 0.95;
  const cageCol = (p.team === 0 ? '#ff4757' : '#38bdf8');
  const glowAlpha = 0.18 + 0.10 * Math.sin(tGlobal * 14);

  g.save();
  // Forcefield glow dome with dynamic voltage pulsation
  g.beginPath();
  g.arc(cx, cy, rad, 0, TAU);
  g.fillStyle = p.team === 0 ? ('rgba(255, 71, 87, ' + glowAlpha.toFixed(2) + ')') : ('rgba(56, 189, 248, ' + glowAlpha.toFixed(2) + ')');
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = cageCol;
  g.stroke();

  // Animated revolving electric spark nodes & laser barrier cage
  g.beginPath();
  g.lineWidth = 1.2;
  g.strokeStyle = p.team === 0 ? 'rgba(255, 140, 155, 0.7)' : 'rgba(147, 222, 255, 0.7)';
  for(let a = 0; a < 6; a++){
    const ang = tGlobal * 3.5 + a * (TAU / 6);
    const ax = cx + Math.cos(ang) * rad;
    const ay = cy + Math.sin(ang) * rad;
    if(a === 0) g.moveTo(ax, ay); else g.lineTo(ax, ay);
  }
  g.closePath();
  g.stroke();

  // Draw node sparks
  for(let a = 0; a < 6; a++){
    const ang = tGlobal * 3.5 + a * (TAU / 6);
    const ax = cx + Math.cos(ang) * rad;
    const ay = cy + Math.sin(ang) * rad;
    g.beginPath();
    g.arc(ax, ay, 3, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
  }

  // Internal electric spark arc
  const arcJitter = (Math.sin(tGlobal * 28) * 8);
  g.beginPath();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 1.2;
  g.moveTo(cx - 14, cy - 14);
  g.lineTo(cx + arcJitter, cy);
  g.lineTo(cx + 14, cy + 14);
  g.stroke();

  // 3-2-1 Countdown number above cage
  const cdSec = Math.max(1, Math.ceil(match.cageT));
  ptxt(cdSec + '', cx, p.y - 28, FT(22), '#ffd166');
  txt('⚡ CAGED', cx, p.y - 12, FN(9.5, 900), cageCol);
  g.restore();
}

function drawHunterHUD(){
  const P = match.players;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const mySlot = (isOnline && NET.mySlot >= 0) ? NET.mySlot : 0;
  const myP = P.find(p => p.slot === mySlot);

  // 1. Center Timer Pill
  const tw = Math.min(150, CW * 0.26), th = 42;
  const cx = CW / 2, cy = 8;
  const isCaged = match.cageT > 0;
  const urgent = !isCaged && match.timer <= 10 && match.state === 'playing';

  rr(g, cx - tw/2, cy, tw, th, 10);
  g.fillStyle = isCaged ? 'rgba(139, 92, 246, 0.92)' : (urgent ? 'rgba(190, 24, 24, 0.92)' : 'rgba(20, 28, 42, 0.94)');
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = isCaged ? '#c084fc' : (urgent ? '#ef4444' : INK);
  g.stroke();

  if(isCaged){
    ptxt('⚡ ' + Math.ceil(match.cageT) + 's', cx, cy + th * 0.40, FT(16), '#ffd166');
    txt('CAGED', cx, cy + th * 0.78, FN(9, 900), '#ffffff');
  } else {
    ptxt(fmtTime(match.timer), cx, cy + th * 0.40, FT(Math.min(22, th * 0.52)), urgent ? '#fff0f0' : '#ffffff');
    txt('ROUND ' + (match.hunterRound || 1) + '/' + (match.hunterMaxRounds || 3), cx, cy + th * 0.78, FN(9, 900), '#cbd5e1');
  }

  // 2. Control bar on the far right (Pause, Mute, Fullscreen, Voice, Chat)
  const btnSize = 34;
  const xPause = CW - btnSize - 12;
  const xMute = xPause - btnSize - 6;
  const xFull = xMute - btnSize - 6;
  const rightBtnsLeftEdge = isOnline ? (xFull - btnSize * 2 - 12) : (xFull - 6);

  // 3. Team Status Panels
  const availW = Math.max(160, Math.min(320, (cx - tw/2 - 20)));
  const panelH = 46;
  const panelY = 8;

  // --- RED TEAM PANEL (Left) ---
  const redHunterP = P.find(p => p.team === 0 && p.slot === match.hunterRed);
  const redRunners = P.filter(p => p.team === 0 && p.slot !== match.hunterRed);
  const redX = 12;
  rr(g, redX, panelY, availW, panelH, 8);
  g.fillStyle = 'rgba(20, 28, 42, 0.92)'; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = '#ff4757'; g.stroke();

  // Red Team Header
  const redHunterName = redHunterP ? getPlayerDisplayName(redHunterP) : 'Red Hunter';
  txt('👑 ' + redHunterName, redX + 8, panelY + 12, FN(10, 900), '#ff6b81', 'left');
  txt((match.hunterScores ? match.hunterScores[0] : 0) + ' PTS', redX + availW - 8, panelY + 12, FN(10, 900), '#ffd166', 'right');

  // Red Runners Row
  const redChipW = Math.floor((availW - 12) / Math.max(1, redRunners.length));
  for(let ri = 0; ri < redRunners.length; ri++){
    const r = redRunners[ri];
    const rx = redX + 6 + ri * redChipW;
    const ry = panelY + 24;
    const rw = redChipW - 4;
    const rcol = getPlayerColor(r);
    const alive = !r.isEliminated;

    rr(g, rx, ry, rw, 16, 3);
    g.fillStyle = alive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.4)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = alive ? rcol : '#475569'; g.stroke();

    // Swatch dot
    g.beginPath(); g.arc(rx + 8, ry + 8, 4, 0, TAU);
    g.fillStyle = rcol; g.fill();

    const rName = getPlayerDisplayName(r).slice(0, 5);
    const rStat = alive ? '●' : '☠';
    txt(rName + ' ' + rStat, rx + 14, ry + 9, FN(8.5, 900), alive ? '#ffffff' : '#64748b', 'left');
  }

  // --- BLUE TEAM PANEL (Right, before utility buttons) ---
  const blueHunterP = P.find(p => p.team === 1 && p.slot === match.hunterBlue);
  const blueRunners = P.filter(p => p.team === 1 && p.slot !== match.hunterBlue);
  const blueX = Math.max(cx + tw/2 + 8, rightBtnsLeftEdge - availW - 8);
  rr(g, blueX, panelY, availW, panelH, 8);
  g.fillStyle = 'rgba(20, 28, 42, 0.92)'; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = '#38bdf8'; g.stroke();

  // Blue Team Header
  const blueHunterName = blueHunterP ? getPlayerDisplayName(blueHunterP) : 'Blue Hunter';
  txt('👑 ' + blueHunterName, blueX + 8, panelY + 12, FN(10, 900), '#38bdf8', 'left');
  txt((match.hunterScores ? match.hunterScores[1] : 0) + ' PTS', blueX + availW - 8, panelY + 12, FN(10, 900), '#ffd166', 'right');

  // Blue Runners Row
  const blueChipW = Math.floor((availW - 12) / Math.max(1, blueRunners.length));
  for(let bi = 0; bi < blueRunners.length; bi++){
    const r = blueRunners[bi];
    const bx = blueX + 6 + bi * blueChipW;
    const by = panelY + 24;
    const bw = blueChipW - 4;
    const bcol = getPlayerColor(r);
    const alive = !r.isEliminated;

    rr(g, bx, by, bw, 16, 3);
    g.fillStyle = alive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.4)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = alive ? bcol : '#475569'; g.stroke();

    // Swatch dot
    g.beginPath(); g.arc(bx + 8, by + 8, 4, 0, TAU);
    g.fillStyle = bcol; g.fill();

    const rName = getPlayerDisplayName(r).slice(0, 5);
    const rStat = alive ? '●' : '☠';
    txt(rName + ' ' + rStat, bx + 14, by + 9, FN(8.5, 900), alive ? '#ffffff' : '#64748b', 'left');
  }

  // 4. Floating Killfeed / Toast Banner
  if(match.killfeed && match.killfeed.length > 0){
    const kItem = match.killfeed[0];
    if(kItem && kItem.t > 0){
      const kAlpha = clamp(kItem.t, 0, 1);
      g.save(); g.globalAlpha = kAlpha;
      g.font = FN(11, 900);
      const kw = g.measureText(kItem.msg).width + 36;
      pill(cx - kw/2, 58, kw, 26, 'rgba(15, 23, 42, 0.94)', kItem.team === 0 ? '#ff4757' : '#38bdf8');
      txt(kItem.msg, cx, 58 + 14, FN(10.5, 900), '#ffffff');
      g.restore();
    }
  }

  // 5. Spectator status footer if local player is eliminated
  if(myP && myP.isEliminated){
    let specTargetP = P.find(p => p.slot === match.spectateTarget);
    const specName = specTargetP ? getPlayerDisplayName(specTargetP) : 'Teammate';
    const specFooterW = Math.min(360, CW - 24);
    const specFooterY = CH - 44;
    pill(cx - specFooterW/2, specFooterY, specFooterW, 30, 'rgba(15, 23, 42, 0.92)', '#e056fd');
    const specTxt = isTouch ? ('👁️ SPECTATING ' + specName + ' (TAP TO CYCLE)') : ('👁️ SPECTATING ' + specName + ' (SPACE TO CYCLE)');
    txt(specTxt, cx, specFooterY + 16, FN(10.5, 900), '#ffffff');
    if(isTouch){
      zone(cx - specFooterW/2, specFooterY, specFooterW, 30, { fn: () => cycleHunterSpectate(myP.team) });
    }
  }

  // 6. Action buttons (Pause, Mute, Fullscreen, Voice, Chat)
  drawJuicyIconBtn(xPause, 10, btnSize, {
    r: 8, depth: 2,
    renderContent: (x, y, sz) => {
      g.fillStyle = '#1e293b';
      g.fillRect(x + 10, y + 8, 4, 16);
      g.fillRect(x + 18, y + 8, 4, 16);
    },
    fn: togglePause
  });

  drawJuicyIconBtn(xMute, 10, btnSize, {
    r: 8, depth: 2,
    renderContent: (x, y, sz) => {
      g.fillStyle = '#1e293b';
      g.beginPath();
      g.moveTo(x + 8, y + sz/2 - 3);
      g.lineTo(x + 12, y + sz/2 - 3);
      g.lineTo(x + 18, y + sz/2 - 8);
      g.lineTo(x + 18, y + sz/2 + 8);
      g.lineTo(x + 12, y + sz/2 + 3);
      g.lineTo(x + 8, y + sz/2 + 3);
      g.closePath();
      g.fill();
      if(!muted){
        g.strokeStyle = '#1e293b'; g.lineWidth = 2;
        g.beginPath(); g.arc(x + 17, y + sz/2, 5, -0.6, 0.6); g.stroke();
      } else {
        g.strokeStyle = '#ef4444'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x + 7, y + 7); g.lineTo(x + sz - 7, y + sz - 7); g.stroke();
      }
    },
    fn: toggleSound
  });

  drawJuicyIconBtn(xFull, 10, btnSize, {
    r: 8, depth: 2,
    renderContent: (x, y, sz) => {
      g.strokeStyle = '#1e293b'; g.lineWidth = 2.2;
      const isFull = !!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement||document.webkitIsFullScreen);
      if(!isFull){
        const m = 9;
        g.beginPath(); g.moveTo(x + m, y + m + 4); g.lineTo(x + m, y + m); g.lineTo(x + m + 4, y + m); g.stroke();
        g.beginPath(); g.moveTo(x + sz - m - 4, y + m); g.lineTo(x + sz - m, y + m); g.lineTo(x + sz - m, y + m + 4); g.stroke();
        g.beginPath(); g.moveTo(x + m, y + sz - m - 4); g.lineTo(x + m, y + sz - m); g.lineTo(x + m + 4, y + sz - m); g.stroke();
        g.beginPath(); g.moveTo(x + sz - m - 4, y + sz - m); g.lineTo(x + sz - m, y + sz - m); g.lineTo(x + sz - m, y + sz - m - 4); g.stroke();
      } else {
        const m = 10;
        g.strokeRect(x + m, y + m, sz - 2 * m, sz - 2 * m);
      }
    },
    fn: toggleFullscreen
  });

  if(isOnline){
    const xVoice = xFull - btnSize - 6;
    const xChat = xVoice - btnSize - 6;
    const vOn = (typeof VOICE !== 'undefined' && VOICE.enabled);
    const vMuted = (typeof VOICE !== 'undefined' && VOICE.muted);
    drawJuicyIconBtn(xVoice, 10, btnSize, {
      r: 8, depth: 2,
      bg: vOn ? (vMuted ? '#e74c3c' : '#27ae60') : 'rgba(255, 255, 255, 0.92)',
      darkBg: vOn ? (vMuted ? '#b91c1c' : '#166534') : 'rgba(203, 213, 225, 0.95)',
      icon: vOn ? (vMuted ? '🔇' : '🎙️') : '🎙️',
      iconColor: vOn ? '#ffffff' : '#1e293b',
      iconSize: 13,
      fn: voiceToggleMic
    });

    drawJuicyIconBtn(xChat, 10, btnSize, {
      r: 8, depth: 2,
      icon: '💬',
      iconColor: '#1e293b',
      iconSize: 13,
      fn: () => { if(typeof chatToggle === 'function') chatToggle(); }
    });
  }
}

function drawHunterRoundResult(){
  g.fillStyle = 'rgba(10, 16, 24, 0.84)';
  g.fillRect(0, 0, CW, CH);

  const summary = match.roundSummary;
  if(!summary) return;

  const t = match.resultT || 0;
  const ap = easeBack(clamp(t * 2.5, 0, 1));
  if(ap <= 0) return;

  const isShort = CH < 540;
  const pw = Math.min(740, CW - 20);
  const ph = Math.min(summary.isMatchOver ? 440 : (isShort ? 470 : 510), CH - 16);
  const px = CW / 2 - pw / 2;
  const py = CH / 2 - ph / 2;

  g.save();
  g.translate(CW / 2, CH / 2);
  g.scale(ap, ap);
  g.translate(-CW / 2, -CH / 2);

  rr(g, px, py, pw, ph, 16);
  g.fillStyle = 'rgba(18, 24, 38, 0.98)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = INK;
  g.stroke();

  // Header Title
  let roundTitle = 'ROUND ' + summary.round + ' OF ' + match.hunterMaxRounds + ' COMPLETE!';
  let roundCol = '#ffd166';
  if(summary.wiperTeam === 0){
    roundTitle = '🔴 RED TEAM WIPED BLUE!';
    roundCol = '#ff4757';
  } else if(summary.wiperTeam === 1){
    roundTitle = '🔵 BLUE TEAM WIPED RED!';
    roundCol = '#38bdf8';
  } else {
    roundTitle = "⏱️ TIME'S UP - POINTS ROUND!";
  }
  ptxt(roundTitle, CW / 2, py + (isShort ? 24 : 28), FT(clamp(pw * 0.048, 17, 24)), roundCol);

  // Split Scoring Breakdown (Side by Side)
  const colW = (pw - 36) / 2;
  const colH = isShort ? 94 : 108;
  const colY = py + (isShort ? 44 : 50);

  // --- RED TEAM CARD ---
  const redX = px + 12;
  rr(g, redX, colY, colW, colH, 10);
  g.fillStyle = 'rgba(235, 60, 40, 0.08)'; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = '#ff4757'; g.stroke();

  ptxt('🔴 RED TEAM', redX + colW/2, colY + 18, FT(15), '#ff6b81');
  const rY0 = colY + 38;
  txt('Capture: +' + summary.red.capture + ' pts  •  Speed: +' + summary.red.speed + ' pts  •  Survival: +' + summary.red.survival + ' pts', redX + colW/2, rY0, FN(10.5, 800), '#cbd5e1');

  rr(g, redX + 10, colY + colH - (isShort ? 32 : 36), colW - 20, isShort ? 26 : 30, 6);
  g.fillStyle = 'rgba(235, 60, 40, 0.22)'; g.fill();
  ptxt('ROUND +' + summary.red.total + '  •  TOTAL: ' + summary.cumulative[0] + ' PTS', redX + colW/2, colY + colH - (isShort ? 18 : 20), FN(11.5, 900), '#ffd166');

  // --- BLUE TEAM CARD ---
  const blueX = px + 24 + colW;
  rr(g, blueX, colY, colW, colH, 10);
  g.fillStyle = 'rgba(56, 189, 248, 0.08)'; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = '#38bdf8'; g.stroke();

  ptxt('🔵 BLUE TEAM', blueX + colW/2, colY + 18, FT(15), '#38bdf8');
  const bY0 = colY + 38;
  txt('Capture: +' + summary.blue.capture + ' pts  •  Speed: +' + summary.blue.speed + ' pts  •  Survival: +' + summary.blue.survival + ' pts', blueX + colW/2, bY0, FN(10.5, 800), '#cbd5e1');

  rr(g, blueX + 10, colY + colH - (isShort ? 32 : 36), colW - 20, isShort ? 26 : 30, 6);
  g.fillStyle = 'rgba(56, 189, 248, 0.22)'; g.fill();
  ptxt('ROUND +' + summary.blue.total + '  •  TOTAL: ' + summary.cumulative[1] + ' PTS', blueX + colW/2, colY + colH - (isShort ? 18 : 20), FN(11.5, 900), '#ffd166');

  // Buttons at bottom
  const btnW = Math.min(220, (pw - 40) / 2);
  const btnH = isShort ? 34 : 38;
  const btnY = py + ph - btnH - (isShort ? 10 : 14);

  if(summary.isMatchOver){
    const champ = summary.cumulative[0] > summary.cumulative[1]
      ? '🔴 RED TEAM'
      : (summary.cumulative[1] > summary.cumulative[0] ? '🔵 BLUE TEAM' : '🤝 TIE MATCH');
    ptxt('🏆 ' + champ + ' WINS THE TOURNAMENT!', CW / 2, colY + colH + 20, FT(clamp(pw * 0.045, 16, 22)), '#ffd166');

    // Tournament Accolades
    const accY = colY + colH + 34;
    const accH = Math.max(48, btnY - accY - 14);
    const accW = colW;
    const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
    const tStats = summary.tournamentStats || (match && match.tournamentStats) || { tags: {}, survival: {} };

    // Find Apex Predator (most tags)
    let bestHunterSlot = -1, maxTags = 0;
    for(const [s, tags] of Object.entries(tStats.tags || {})){
      if(tags > maxTags){ maxTags = tags; bestHunterSlot = parseInt(s, 10); }
    }
    const apexName = (bestHunterSlot >= 0 ? ((isOnline && NET.slotsName && NET.slotsName[bestHunterSlot]) || ('P' + (bestHunterSlot + 1))) : 'None');

    // Find Ghost Runner (longest survival)
    let bestRunnerSlot = -1, maxSurv = 0;
    for(const [s, surv] of Object.entries(tStats.survival || {})){
      if(surv > maxSurv){ maxSurv = Math.round(surv); bestRunnerSlot = parseInt(s, 10); }
    }
    const ghostName = (bestRunnerSlot >= 0 ? ((isOnline && NET.slotsName && NET.slotsName[bestRunnerSlot]) || ('P' + (bestRunnerSlot + 1))) : 'None');

    // Apex Predator Box
    rr(g, redX, accY, accW, accH, 8);
    g.fillStyle = 'rgba(235, 60, 40, 0.12)'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = '#ffd166'; g.stroke();
    ptxt('🦁 APEX PREDATOR', redX + accW/2, accY + accH * 0.34, FN(clamp(accW * 0.08, 10, 13), 900), '#ffd166');
    txt(apexName + ' (' + maxTags + ' tags)', redX + accW/2, accY + accH * 0.72, FN(clamp(accW * 0.075, 9.5, 12), 800), '#ffffff');

    // Ghost Runner Box
    rr(g, blueX, accY, accW, accH, 8);
    g.fillStyle = 'rgba(56, 189, 248, 0.12)'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = '#38bdf8'; g.stroke();
    ptxt('👻 GHOST RUNNER', blueX + accW/2, accY + accH * 0.34, FN(clamp(accW * 0.08, 10, 13), 900), '#38bdf8');
    txt(ghostName + ' (' + maxSurv + 's survived)', blueX + accW/2, accY + accH * 0.72, FN(clamp(accW * 0.075, 9.5, 12), 800), '#ffffff');

    const lobbySec = Math.max(0, Math.ceil(match.matchOverTimer != null ? match.matchOverTimer : 5));
    simpleButton(CW / 2 - btnW - 8, btnY, btnW, btnH, '⏳ LOBBY (' + lobbySec + 's)', () => {
      returnToLobby();
    }, null, '#8b5cf6');

    simpleButton(CW / 2 + 8, btnY, btnW, btnH, '🚪 QUIT ROOM', () => {
      quitToMenu();
    }, null, '#475569');
  } else {
    // --- INTERMISSION HUNTER ELECTION PANEL ---
    const voteY = colY + colH + (isShort ? 8 : 12);
    const voteH = btnY - voteY - (isShort ? 8 : 12);
    const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
    const mySlot = isOnline ? NET.mySlot : 0;
    const myTeam = (mySlot >= 0 && menu.slotTeam) ? (menu.slotTeam[mySlot] % 2) : 0;
    const hist = match.hunterHistory || menu.hunterHistory || {};

    // 1. Red Election Box
    rr(g, redX, voteY, colW, voteH, 8);
    g.fillStyle = 'rgba(235, 60, 40, 0.05)'; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(235, 60, 40, 0.35)'; g.stroke();

    const curRedElected = resolveTeamHunter(0);
    const curRedPName = (isOnline && NET.slotsName && NET.slotsName[curRedElected]) || ('P' + (curRedElected + 1));
    const curRedName = ('P' + (curRedElected + 1)) + ' • ' + curRedPName;
    const redSlots = activeSlots().filter(s => ((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === 0);
    const canVoteRed = !isOnline || (NET.mySlot >= 0 && myTeam === 0);
    const redItems = redSlots.concat(['random']);
    const isMyRed = !isOnline || (isOnline && myTeam === 0);
    const redHeader = !isOnline ? '🔴 RED: TAP TO CHOOSE HUNTER' : (isMyRed ? '🔴 RED — YOUR TEAM: TAP ONE' : '🔴 RED — OTHER TEAM 🔒');
    const redSub = '👑 Now hunting: ' + curRedName;
    ptxt(redHeader, redX + colW/2, voteY + 15, FN(11, 900), '#ff6b81');
    ptxt(redSub, redX + colW/2, voteY + 30, FN(9.5, 800), '#ffd166');

    // 2. Blue Election Box
    rr(g, blueX, voteY, colW, voteH, 8);
    g.fillStyle = 'rgba(56, 189, 248, 0.05)'; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(56, 189, 248, 0.35)'; g.stroke();

    const curBlueElected = resolveTeamHunter(1);
    const curBluePName = (isOnline && NET.slotsName && NET.slotsName[curBlueElected]) || ('P' + (curBlueElected + 1));
    const curBlueName = ('P' + (curBlueElected + 1)) + ' • ' + curBluePName;
    const blueSlots = activeSlots().filter(s => ((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === 1);
    const canVoteBlue = !isOnline || (NET.mySlot >= 0 && myTeam === 1);
    const blueItems = blueSlots.concat(['random']);
    const isMyBlue = !isOnline || (isOnline && myTeam === 1);
    const blueHeader = !isOnline ? '🔵 BLUE: TAP TO CHOOSE HUNTER' : (isMyBlue ? '🔵 BLUE — YOUR TEAM: TAP ONE' : '🔵 BLUE — OTHER TEAM 🔒');
    const blueSub = '👑 Now hunting: ' + curBlueName;
    ptxt(blueHeader, blueX + colW/2, voteY + 15, FN(11, 900), '#38bdf8');
    ptxt(blueSub, blueX + colW/2, voteY + 30, FN(9.5, 800), '#ffd166');

    // Reusable 2-row chip wrapping renderer
    function drawElectionChips(items, curElected, canVote, teamIdx, boxX, teamSlots){
      const N = items.length;
      const numRows = N > 3 ? 2 : 1;
      const C0 = numRows === 1 ? N : Math.ceil(N / 2);
      const C1 = numRows === 1 ? 0 : (N - C0);
      const availH = voteH - 42;
      const itemH = clamp(Math.floor((availH - (numRows - 1) * 6) / numRows), 28, 36);
      const totalChipsH = numRows * itemH + (numRows - 1) * 6;
      const iy0 = voteY + 40 + Math.max(0, Math.floor((availH - totalChipsH) / 2));
      const iy1 = iy0 + itemH + 6;

      items.forEach((cand, idx) => {
        const r = (numRows > 1 && idx >= C0) ? 1 : 0;
        const colIdx = r === 0 ? idx : (idx - C0);
        const rowCount = r === 0 ? C0 : C1;
        const gap = 4;
        const itemW = Math.floor((colW - 16 - (rowCount - 1) * gap) / rowCount);
        const rowW = rowCount * itemW + (rowCount - 1) * gap;
        const rowStartX = boxX + Math.floor((colW - rowW) / 2);
        const ix = rowStartX + colIdx * (itemW + gap);
        const iy = r === 0 ? iy0 : iy1;

        const isCandElected = (cand !== 'random' && curElected === cand);
        const isRand = (cand === 'random');
        const votes = getCandidateVoteCount(cand, teamIdx);
        const hunts = isRand ? 0 : (hist[cand] || 0);
        const isMe = !isRand && isOnline && NET && NET.mySlot === cand;
        const slotTag = isRand ? '' : ('P' + (cand + 1));
        const pName = isRand ? '' : (((isOnline && NET.slotsName && NET.slotsName[cand]) || slotTag));
        const baseName = isRand ? (itemW < 70 ? '🎲 Fair pick' : '🎲 Fair pick') : (slotTag + (isMe ? ' (YOU)' : '') + ' • ' + pName);
        const name = isRand ? baseName : (itemW < 78 && !isMe ? (slotTag + ' ' + String(pName).slice(0, 5)) : baseName);
        const myVote = (menu.hunterVotes && menu.hunterVotes[mySlot]);
        const myCand = (myVote && typeof myVote === 'object') ? myVote.cand : myVote;
        const isVotedByMe = (myCand === cand);

        g.save();
        if(!canVote) g.globalAlpha = 0.45;
        rr(g, ix, iy, itemW, itemH, 5);
        g.fillStyle = isCandElected ? (teamIdx === 0 ? 'rgba(235, 60, 40, 0.35)' : 'rgba(56, 189, 248, 0.35)') : (isVotedByMe ? 'rgba(255, 209, 102, 0.30)' : 'rgba(255, 255, 255, 0.07)');
        g.fill();
        g.lineWidth = (isCandElected || isVotedByMe) ? 1.5 : 0.8;
        g.strokeStyle = (isCandElected || isVotedByMe) ? '#ffd166' : 'rgba(255,255,255,0.25)';
        g.stroke();

        const check = isVotedByMe ? '✓ ' : '';
        const label = check + (isCandElected ? '👑 ' : '') + name;
        const tapWord = votes === 1 ? '1 tap' : (votes + ' taps');
        const subLabel = isRand ? (tapWord + ' • fair') : (tapWord + ' • H×' + hunts);
        ptxt(label, ix + itemW/2, iy + itemH * 0.38, FN(clamp(itemW * 0.11, 8, 10), 900), isCandElected ? '#ffd166' : '#ffffff');
        ptxt(subLabel, ix + itemW/2, iy + itemH * 0.76, FN(clamp(itemW * 0.095, 7, 8.5), 800), isVotedByMe ? '#ffd166' : '#cbd5e1');
        g.restore();

        zone(ix, iy, itemW, itemH, { fn: () => {
          if(!canVote){
            toast('⚠️ Tap YOUR team box — you hunt with them!');
            sfx('back');
            return;
          }
          setTeamHunterChoice(teamIdx, cand);
        }});
      });
    }

    drawElectionChips(redItems, curRedElected, canVoteRed, 0, redX, redSlots);
    drawElectionChips(blueItems, curBlueElected, canVoteBlue, 1, blueX, blueSlots);

    // One-line how voting works (plain language, always visible)
    const ruleHint = !isOnline ? 'Tap a player = they hunt • 🎲 Fair pick = fewest hunts first' : (isMyRed && !isMyBlue ? 'You are RED: tap a red box • most taps hunts • tie → fewest hunts' : (!isMyRed && isMyBlue ? 'You are BLUE: tap a blue box • most taps hunts • tie → fewest hunts' : 'Tap YOUR team box • most taps hunts • tie → fewest hunts'));
    txt(ruleHint, CW / 2, btnY - 10, FN(9, 800), 'rgba(203,213,225,0.9)');

    // 15s AFK Intermission Countdown
    const afkSec = Math.max(0, Math.ceil(match.intermissionTimer != null ? match.intermissionTimer : 15));

    // Next Round Action Button
    if(isOnline && !NET.isHost){
      // Guest: view-only waiting status
      rr(g, CW / 2 - btnW - 8, btnY, btnW, btnH, 8);
      g.fillStyle = 'rgba(71, 85, 105, 0.8)'; g.fill();
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.2)'; g.stroke();
      ptxt('⏳ WAITING FOR HOST (' + afkSec + 's)', CW / 2 - btnW/2 - 8, btnY + btnH/2 + 1, FN(clamp(btnW * 0.065, 10, 12), 900), '#cbd5e1');
    } else {
      simpleButton(CW / 2 - btnW - 8, btnY, btnW, btnH, '▶ START ROUND ' + (summary.round + 1) + ' (' + afkSec + 's)', () => {
        advanceHunterRound();
      }, null, '#8b5cf6');
    }

    simpleButton(CW / 2 + 8, btnY, btnW, btnH, '🚪 MENU', () => {
      quitToMenu();
    }, null, '#475569');
  }

  g.restore();
}

function checkTag(){
  if(!match || match.state !== 'playing' || match.cooldown > 0) return;
  const P = match.players;
  if(!P || P.length < 2) return;

  if(settings.gameMode === 'infection'){
    try{ if(typeof checkInfectionTag === 'function') checkInfectionTag(); }
    catch(e){ logModeErr('checkInfectionTag', e); }
    return;
  }
  if(settings.gameMode === 'bomb'){
    try{ if(typeof checkBombTag === 'function') checkBombTag(); }
    catch(e){ logModeErr('checkBombTag', e); }
    return;
  }
  if(settings.gameMode === 'crown'){
    try{ if(typeof checkCrownTag === 'function') checkCrownTag(); }
    catch(e){ logModeErr('checkCrownTag', e); }
    return;
  }
  if(settings.gameMode === 'ctf'){
    try{ if(typeof checkCtfTag === 'function') checkCtfTag(); }
    catch(e){ logModeErr('checkCtfTag', e); }
    return;
  }

  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isOnlineGuest = isOnline && !NET.isHost;

  if(match.hunterMode){
    if(match.cageT > 0) return; // Hunters caged during countdown!
    const redHunter = P.find(p => p.team === 0 && p.slot === match.hunterRed);
    if(redHunter && !redHunter.isEliminated){
      const blueRunners = P.filter(p => p.team === 1 && p.slot !== match.hunterBlue && !p.isEliminated);
      for(const runner of blueRunners){
        if(hitRectInclusive(tagBox(redHunter), tagBox(runner))){
          const popX = (redHunter.x + runner.x) / 2 + 23, popY = (redHunter.y + runner.y) / 2 + 10;
          if(isOnlineGuest){
            if(redHunter.slot === NET.mySlot){
              netSendClaimTriple({ t: 'tag_claim', from: redHunter.slot, target: runner.slot, x: popX, y: popY, hx: Math.round(redHunter.x), hy: Math.round(redHunter.y), tx: Math.round(runner.x), ty: Math.round(runner.y) });
              match.cooldown = 0.6;
            }
            return;
          }
          eliminateHunterRunner(redHunter, runner, popX, popY);
          return;
        } else {
          const dSq = (redHunter.x - runner.x)**2 + (redHunter.y - runner.y)**2;
          if(dSq < 5500 && (!runner.lastNearMiss || tGlobal - runner.lastNearMiss > 1.2)){
            runner.lastNearMiss = tGlobal;
            dust(runner.x + runner.w/2, runner.y + runner.h/2, 5);
          }
        }
      }
    }
    const blueHunter = P.find(p => p.team === 1 && p.slot === match.hunterBlue);
    if(blueHunter && !blueHunter.isEliminated){
      const redRunners = P.filter(p => p.team === 0 && p.slot !== match.hunterRed && !p.isEliminated);
      for(const runner of redRunners){
        if(hitRectInclusive(tagBox(blueHunter), tagBox(runner))){
          const popX = (blueHunter.x + runner.x) / 2 + 23, popY = (blueHunter.y + runner.y) / 2 + 10;
          if(isOnlineGuest){
            if(blueHunter.slot === NET.mySlot){
              netSendClaimTriple({ t: 'tag_claim', from: blueHunter.slot, target: runner.slot, x: popX, y: popY, hx: Math.round(blueHunter.x), hy: Math.round(blueHunter.y), tx: Math.round(runner.x), ty: Math.round(runner.y) });
              match.cooldown = 0.6;
            }
            return;
          }
          eliminateHunterRunner(blueHunter, runner, popX, popY);
          return;
        } else {
          const dSq = (blueHunter.x - runner.x)**2 + (blueHunter.y - runner.y)**2;
          if(dSq < 5500 && (!runner.lastNearMiss || tGlobal - runner.lastNearMiss > 1.2)){
            runner.lastNearMiss = tGlobal;
            dust(runner.x + runner.w/2, runner.y + runner.h/2, 5);
          }
        }
      }
    }
    return;
  }

  if(settings.gameMode === 'freeze'){
    // 1. UNFREEZE RESCUE: If an unfrozen teammate collides with a frozen teammate, unfreeze them!
    for(const p of P){
      if(p.isFrozen || p.isEliminated) continue;
      if(settings.teams && p.team === match.itTeam) continue;
      for(const tm of P){
        if(tm === p || !tm.isFrozen || tm.isEliminated) continue;
        if(settings.teams && tm.team !== p.team) continue;
        if(hitRectInclusive(tagBox(p), tagBox(tm))){
          tm.isFrozen = false;
          const popX = tm.x + tm.w / 2, popY = tm.y + tm.h / 2;
          dust(popX, popY, 12, 180);
          ringP(popX, popY, '#38bdf8');
          sfx('win');
          match.flash = 0.12;
          match.tagPop = { x: popX, y: popY, t: 0.5, who: P.indexOf(tm), hunter: P.indexOf(p), label: 'UNFROZEN!' };
        }
      }
    }

    // 2. TAGGING: When IT tags an unfrozen runner on opposing team, freeze them!
    const hunters = P.filter(p => settings.teams ? (p.team === match.itTeam) : (P.indexOf(p) === match.it));
    const runners = P.filter(p => settings.teams ? (p.team !== match.itTeam) : (P.indexOf(p) !== match.it));

    for(const hunter of hunters){
      if(hunter.isFrozen || hunter.isEliminated) continue;
      for(const runner of runners){
        if(runner.isFrozen || runner.isEliminated) continue;
        if(hitRectInclusive(tagBox(hunter), tagBox(runner))){
          const popX = (hunter.x + runner.x) / 2 + 23, popY = (hunter.y + runner.y) / 2 + 10;
          if(isOnlineGuest){
            if(hunter.slot === NET.mySlot){
              netSendClaimTriple({ t: 'tag_claim', from: hunter.slot, target: runner.slot, x: popX, y: popY, hx: Math.round(hunter.x), hy: Math.round(hunter.y), tx: Math.round(runner.x), ty: Math.round(runner.y) });
              match.cooldown = 0.6;
            }
            return;
          }
          runner.isFrozen = true;
          runner.vx = 0;
          runner.vy = 0;
          dust(popX, popY, 12, 160);
          tagBurst(popX, popY, '#38bdf8', '#00d2d3');
          sfx('tag');
          match.freeze = 0.08;
          match.shake = 8;
          match.tags[P.indexOf(hunter)] = (match.tags[P.indexOf(hunter)] || 0) + 1;
          match.tagPop = { x: popX, y: popY, t: 0.6, who: P.indexOf(runner), hunter: P.indexOf(hunter), label: 'FROZEN!' };

          // WIN CONDITION: If all runners on a team are frozen, hunter team immediately wins!
          const activeRunners = runners.filter(r => !r.isEliminated);
          const allFrozen = activeRunners.length > 0 && activeRunners.every(r => r.isFrozen);
          if(allFrozen){
            const winTeam = match.itTeam != null ? match.itTeam : P.indexOf(hunter);
            match.result = { winningTeam: winTeam, mode: 'freeze', reason: 'all_frozen' };
            endMatch();
            return;
          }
          match.cooldown = 0.4;
          return;
        }
      }
    }
    return;
  }

  if(settings.teams && match.itTeam != null){
    // "Hunt Together": ALL players on the itTeam hunt together!
    const hunters = P.filter(p => p.team === match.itTeam);
    const runners = P.filter(p => p.team !== match.itTeam);
    for(const hunter of hunters){
      for(const runner of runners){
        if(hitRectInclusive(tagBox(hunter), tagBox(runner))){
          const popX = (hunter.x + runner.x) / 2 + 23, popY = (hunter.y + runner.y) / 2 + 10;
          if(isOnlineGuest){
            if(hunter.slot === NET.mySlot){
              netSendClaimTriple({ t: 'tag_claim', from: hunter.slot, target: runner.slot, x: popX, y: popY, hx: Math.round(hunter.x), hy: Math.round(hunter.y), tx: Math.round(runner.x), ty: Math.round(runner.y) });
              match.cooldown = 0.6;
            }
            return;
          }
          applyTag(P.indexOf(runner), popX, popY);
          return;
        }
      }
    }
    return;
  }

  // Classic Free-for-All
  const it = P[match.it];
  if(!it) return;
  for(let j = 0; j < P.length; j++){
    if(j === match.it) continue;
    if(hitRectInclusive(tagBox(it), tagBox(P[j]))){
      if(isOnlineGuest){
        if(it.slot === NET.mySlot){
          const popX = (it.x + P[j].x) / 2 + 23, popY = (it.y + P[j].y) / 2 + 10;
          netSendClaimTriple({ t: 'tag_claim', from: it.slot, target: P[j].slot, x: popX, y: popY, hx: Math.round(it.x), hy: Math.round(it.y), tx: Math.round(P[j].x), ty: Math.round(P[j].y) });
          match.cooldown = 0.6;
        }
        return;
      }
      applyTag(j, (it.x + P[j].x) / 2 + 23, (it.y + P[j].y) / 2 + 10);
      return;
    }
  }
}
