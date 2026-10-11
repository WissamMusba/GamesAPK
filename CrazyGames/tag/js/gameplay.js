/* ================= camera ================= */
function updateCam(dt){
  let tx,ty,ts;
  const N=match?match.players.length:2;
  if(screen!=='game'||!match){
    tx=W/2;ty=H/2;ts=Math.min(CW/(W+160),CH/(H+160));
  }else{
    const P=match.players;
    let mx=0,my=0,minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,cnt=0;
    for(const p of P){
      if(p.isEliminated) continue;
      mx+=p.x;my+=p.y;minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
      cnt++;
    }
    if(cnt === 0){
      mx = W/2; my = H/2; minX = W/2 - 100; maxX = W/2 + 100; minY = H/2 - 100; maxY = H/2 + 100; cnt = 1;
    }
    tx=mx/cnt+23;ty=my/cnt+23;
    const dx=maxX-minX,dy=maxY-minY;
    const baseN=Math.min(N,8),extraN=Math.max(0,N-8);
    const needW=dx+640+(baseN-2)*220+extraN*110,needH=dy+500+(baseN-2)*120+extraN*60;
    const minS=Math.min(CW/(W+140),CH/(H+140));
    ts=clamp(Math.min(CW/needW,CH/needH),minS,N>=9?0.95:(N>=6?1.05:(N>=4?1.25:1.75)));
  }
  const kp=1-Math.exp(-dt*5.5),ks=1-Math.exp(-dt*3.8);
  cam.x+=(tx-cam.x)*kp;cam.y+=(ty-cam.y)*kp;cam.s+=(ts-cam.s)*ks;
  const vw=CW/cam.s,vh=CH/cam.s;
  cam.x=vw>=W+120?W/2:clamp(cam.x,vw/2-60,W-vw/2+60);
  cam.y=vh>=H+120?H/2:clamp(cam.y,vh/2-60,H-vh/2+60);
}

/* ================= game update & fullscreen ================= */
function toggleFullscreen(){
  try{
    const de = document.documentElement;
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.webkitIsFullScreen);
    const req = de.requestFullscreen || de.webkitRequestFullscreen || de.webkitRequestFullScreen || cv.requestFullscreen || cv.webkitRequestFullscreen || cv.webkitRequestFullScreen || de.mozRequestFullScreen || de.msRequestFullscreen;
    if(!req){
      window.scrollTo(0, 0);
      if(match){ match.mapToast = 'ADD TO HOME SCREEN FOR FULLSCREEN'; match.mapToastT = 2.5; }
      return;
    }
    if(!isFs){
      const target = (de.requestFullscreen || de.webkitRequestFullscreen || de.webkitRequestFullScreen) ? de : cv;
      const p = req.call(target);
      if(p && p.catch) p.catch(()=>{ try{if(match){match.mapToast='ADD TO HOME SCREEN FOR FULLSCREEN';match.mapToastT=2.5;}}catch(e){} });
    }else{
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if(exit){
        const p = exit.call(document);
        if(p && p.catch) p.catch(()=>{});
      }
    }
  }catch(e){}
}
function toggleSound(){
  muted=!muted;
  applyEffectiveMute();
  if(match){match.mapToast='SOUND: '+(muted?'OFF':'ON');match.mapToastT=1.8;}
  sfx('ui');
}
function clearTouchCaptures(){
  try{
    if(typeof JOY!=='undefined'&&JOY){JOY.leftId=null;JOY.leftX=0;JOY.rightId=null;JOY.rightY=0;}
    if(typeof TOUCH!=='undefined'&&TOUCH){TOUCH.left=false;TOUCH.right=false;TOUCH.jumpHeld=false;TOUCH.downHeld=false;TOUCH.jumpEdge=false;}
    if(typeof LOCAL_TOUCH!=='undefined'&&LOCAL_TOUCH){
      for(const k of ['p1','p2']){
        const p=LOCAL_TOUCH[k];if(!p)continue;
        p.joyId=null;p.active=false;p.offX=0;p.left=false;p.right=false;
        p.sldId=null;if('sldV' in p)p.sldV=0;p.jumpHeld=false;p.jumpEdge=false;p.downHeld=false;
      }
    }
    if(typeof touchPts!=='undefined'&&touchPts)touchPts.clear();
  }catch(e){}
}
function togglePause(){
  if(!match)return;
  // Online host menu is LOCAL ONLY: an overlay for the host while the match
  // continues live for everyone (pausing for real would freeze all guests).
  if(typeof NET!=='undefined'&&NET&&NET.role!==null&&NET.isHost){
    if(match.hostMenu){ match.hostMenu=false; sfx('ok'); }
    else if(match.state==='playing'||match.state==='countdown'){ match.hostMenu=true; match.pauseSel=0; clearTouchCaptures(); sfx('back'); }
    return;
  }
  if(match.state==='paused'){
    match.state=match.pausedFrom;
    match.pausedFrom=null;
    try{CG.gameplayStart();}catch(e){}
    sfx('ok');
  }
  else if(match.state==='playing'||match.state==='countdown'){
    match.pausedFrom=match.state;
    match.state='paused';
    match.pauseSel=0;
    clearTouchCaptures();
    try{CG.gameplayStop();}catch(e){}
    sfx('back');
  }
}
function cycleTheme(){
  currentThemeIdx=(currentThemeIdx+1)%THEMES.length;
  if(match){match.mapToast='THEME: '+THEMES[currentThemeIdx].name;match.mapToastT=2.2;}
  sfx('ui');
}
function selectMapQuick(idx){
  settings.map=(idx+MAPS.length)%MAPS.length;
  buildLevel();
  // Online guests have no map powers at all (no preview): the room runs the host map.
  if(typeof NET!=='undefined'&&NET&&NET.role!==null&&!NET.isHost){
    toast('HOST CONTROLS THE MAP');
    sfx('back');
    return;
  }
  if(match){
    match.mapToast='MAP: '+(settings.map+1)+'. '+MAPS[settings.map].name;
    match.mapToastT=2.4;
    startMatch();
  }
  sfx('ok');
}

function updateGame(dt){
  if(!match)return;
  if(anyPressed(['KeyM']) && (!match || match.state !== 'result'))toggleSound();
  // Fullscreen was on F — that collides with TFGH left (F). O is free in-game (O is font-prev only in menu).
  if(anyPressed(['KeyO']))toggleFullscreen();
  if(anyPressed(['KeyP']))togglePause();
  if(anyPressed(['KeyN']))selectMapQuick(settings.map+1);
  if(anyPressed(['KeyB']))cycleTheme();
  if(anyPressed(['KeyV']))voiceToggleMic();
  
  /* Number keys 1-9, 0 to switch to any map instantly */
  for(let k=1;k<=9;k++)if(pressed.has('Digit'+k))selectMapQuick(k-1);
  if(pressed.has('Digit0'))selectMapQuick(9);
  
  for(let i=0;i<4;i++){if(PAD[i]&&PAD[i].pauseE)togglePause();}
  if(match.state==='paused'||match.hostMenu){
    let up=anyPressed(['ArrowUp','KeyW']),dn=anyPressed(['ArrowDown','KeyS']),cf=anyPressed(['Enter','NumpadEnter','Space']);
    for(let i=0;i<4;i++){const pd=PAD[i];if(!pd)continue;up=up||pd.upE;dn=dn||pd.downE;cf=cf||pd.confirmE;}
    if(up){match.pauseSel=(match.pauseSel+5)%6;sfx('ui');}
    if(dn){match.pauseSel=(match.pauseSel+1)%6;sfx('ui');}
    if(cf){
      if(match.pauseSel===0)togglePause();
      else if(match.pauseSel===1){sfx('go');startMatch();}
      else if(match.pauseSel===2){selectMapQuick(settings.map+1);}
      else if(match.pauseSel===3){toggleSound();}
      else if(match.pauseSel===4){toggleFullscreen();}
      else quitToMenu();
    }
    if(!match.hostMenu) return;
    // host menu open: fall through — the match continues live underneath for everyone
  }
  if(match.state==='result'){
    match.resultT+=dt;
    const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
    const isHost = isOnline && NET.isHost, isGuest = isOnline && !NET.isHost;
    const joiner = !!(isHost && NET.midgameJoiner);
    // post-game map vote replaces instant rematch / 5s lobby return
    if(!joiner){
      if(!menu.mapVote || menu.mapVote.mid !== matchIndex){
        if(isGuest){
          menu.mapVote = { mid: matchIndex, opts: [], votes: {}, seq: 0, modeReq: {}, mseq: 0, t: 20, decided: false, waiting: true };
        } else {
          initMapVote();
        }
      }
    }
    const V = menu.mapVote;
    if(V && !V.decided && !joiner){
      V.t -= dt;
      if(!isGuest){
        const voters = mapVoteVoters();
        const voted = voters.filter(function(v){ return V.votes[v] != null; }).length;
        if(voters.length && voted >= voters.length) V.t = Math.min(V.t, 2);
        if(isHost){
          V.syncT = (V.syncT || 0) + dt;
          if(V.syncT >= 1){ V.syncT = 0; broadcastMapVote(); }
        }
        if(V.t <= 0){ decideMapVote(); return; }
      }
    }
    if(isOnline){
      if(joiner){
        match.matchOverTimer = Math.max(0, (match.matchOverTimer != null ? match.matchOverTimer : 5.0) - dt);
        if(match.matchOverTimer <= 0){
          returnToLobby();
          return;
        }
      } else if(!(V && !V.decided)){
        match.matchOverTimer = Math.max(0, (match.matchOverTimer != null ? match.matchOverTimer : 5.0) - dt);
        if(match.matchOverTimer <= 0){
          returnToLobby();
          return;
        }
      }
    } else if(typeof NET!=='undefined' && NET && NET.isHost && NET.midgameJoiner && match.resultT >= 4.0){
      NET.midgameJoiner = false;
      quitToMenu();
      return;
    }
    if(menu.modePopup){
      for(let d = 1; d <= 7; d++){
        if(pressed.has('Digit' + d)){
          requestMode(myVoterId(), MAPVOTE_MODES[d - 1].id);
          menu.modePopup = false;
        }
      }
      if(anyPressed(['Escape','KeyM'])){ menu.modePopup = false; sfx('back'); }
    } else {
      if(pressed.has('Digit1')) castMapVote(myVoterId(), 0);
      if(pressed.has('Digit2')) castMapVote(myVoterId(), 1);
      if(pressed.has('Digit3')) castMapVote(myVoterId(), 2);
      if(anyPressed(['KeyM']) && V && !V.decided){ menu.modePopup = true; sfx('ui'); }
    }
    if(anyPressed(['Enter','NumpadEnter','Space'])){
      if(isGuest || joiner){
        return;
      }
      if(V && !V.decided){ decideMapVote(); return; }
      if(isOnline){ returnToLobby(); return; }
      sfx('go');startMatch();
    }
    for(let i=0;i<4;i++){
      if(PAD[i]&&PAD[i].confirmE){
        if(isGuest || joiner){ continue; }
        if(V && !V.decided){ decideMapVote(); return; }
        if(isOnline){ returnToLobby(); return; }
        sfx('go');startMatch();
      }
    }
    updateParts(dt);updateCam(dt);match.shake*=Math.exp(-dt*7);match.flash=Math.max(0,match.flash-dt);
    return;
  }
  if(match.state==='hunter_round_result'){
    match.resultT = (match.resultT || 0) + dt;
    if(match.roundSummary && !match.roundSummary.isMatchOver){
      match.intermissionTimer = Math.max(0, (match.intermissionTimer != null ? match.intermissionTimer : 15.0) - dt);
      if(match.intermissionTimer <= 0){
        if(typeof NET === 'undefined' || !NET || NET.role === null || NET.isHost){
          advanceHunterRound();
          return;
        }
      }
    } else if(match.roundSummary && match.roundSummary.isMatchOver){
      match.matchOverTimer = Math.max(0, (match.matchOverTimer != null ? match.matchOverTimer : 5.0) - dt);
      if(match.matchOverTimer <= 0){
        returnToLobby();
        return;
      }
    }
    if(match.resultT >= 1.5){
      if(anyPressed(['Enter','NumpadEnter','Space'])){
        if(match.roundSummary && match.roundSummary.isMatchOver){
          returnToLobby();
          return;
        }
        if(typeof NET!=='undefined' && NET && NET.role!==null && !NET.isHost) return;
        advanceHunterRound();
      }
      for(let i=0;i<4;i++){
        if(PAD[i]&&PAD[i].confirmE){
          if(match.roundSummary && match.roundSummary.isMatchOver){
            returnToLobby();
            return;
          }
          if(typeof NET!=='undefined' && NET && NET.role!==null && !NET.isHost) return;
          advanceHunterRound();
        }
      }
    }
    updateParts(dt);updateCam(dt);match.shake*=Math.exp(-dt*7);match.flash=Math.max(0,match.flash-dt);
    return;
  }
  if(match.state==='tutorial'){
    updateParts(dt);updateCam(dt);
    return;
  }

  if(match.freeze>0){match.freeze-=dt;return;}
  match.fade=Math.max(0,match.fade-dt);
  match.mapToastT=Math.max(0,match.mapToastT-dt);
  const inPlay=match.state==='playing';
  if(match.state==='countdown'){
    match.cdT+=dt;
    if(match.cdT>=0.72){
      match.cdT-=0.72;match.cd--;
      if(match.cd<=0){match.state='playing';match.goFlash=0.8;sfx('go');}
      else sfx('count');
    }
  }

  // Spectator camera switching for eliminated runners
  if(match.hunterMode && inPlay){
    const myP = (typeof NET !== 'undefined' && NET && NET.mySlot >= 0) ? match.players.find(p => p.slot === NET.mySlot) : null;
    if(myP && myP.isEliminated){
      if(anyPressed(['Space', 'Enter'])){
        cycleHunterSpectate(myP.team);
      }
    }
  }

  // Killfeed timer decay
  if(match.hunterMode && match.killfeed && match.killfeed.length > 0){
    for(let k = match.killfeed.length - 1; k >= 0; k--){
      match.killfeed[k].t -= dt;
      if(match.killfeed[k].t <= 0) match.killfeed.splice(k, 1);
    }
  }

  for(const p of match.players){
    if(typeof NET !== 'undefined' && NET && NET.role !== null && NET.isHost){
      // Host simulates itself AND its bots (lobby autofill); guests' slots interpolate.
      if(p.slot === NET.mySlot || p.slot === 0 || (NET.botSlots && NET.botSlots.includes(p.slot))){
        physUpdate(p, dt, inPlay);
      } else {
        netApplyRemoteTarget(p, dt);
      }
    } else {
      physUpdate(p, dt, inPlay);
    }
  }
  // Tag before bump — skins kissing counts before bodies push apart.
  checkTag();
  pairCollide();
  if(settings.gameMode === 'infection'){
    try{ if(typeof updateInfection === 'function') updateInfection(dt); }
    catch(e){ logModeErr('updateInfection', e); }
  } else if(settings.gameMode === 'bomb'){
    try{ if(typeof updateBombMode === 'function') updateBombMode(dt); }
    catch(e){ logModeErr('updateBombMode', e); }
  } else if(settings.gameMode === 'crown'){
    try{ if(typeof updateCrownMode === 'function') updateCrownMode(dt); }
    catch(e){ logModeErr('updateCrownMode', e); }
  } else if(settings.gameMode === 'ctf'){
    try{ if(typeof updateCtf === 'function') updateCtf(dt); }
    catch(e){ logModeErr('updateCtf', e); }
  }
  if(inPlay){
    if(match.hunterMode){
      if(match.cageT > 0){
        const prevC = Math.ceil(match.cageT);
        match.cageT -= dt;
        const curC = Math.ceil(Math.max(0, match.cageT));
        if(curC < prevC && curC > 0) sfx('count');
        if(match.cageT <= 0){
          match.cageT = 0;
          sfx('boost');
          match.goFlash = 0.8;
          for(const p of match.players){
            if(p.isHunter){
              ringP(p.x + p.w/2, p.y + p.h/2, p.team === 0 ? '#ff4757' : '#38bdf8');
              dust(p.x + p.w/2, p.y + p.h, 20, 160);
            }
          }
        }
      } else {
        match.timer -= dt;
        for(const p of match.players){
          if(!p.isHunter && !p.isEliminated){
            p.survivalT = (p.survivalT || 0) + dt;
          }
        }
      }
    } else {
      if(match.cooldown>0){
        const c0=Math.ceil(match.cooldown);
        match.cooldown-=dt;
        const c1=Math.ceil(Math.max(0,match.cooldown));
        if(c1<c0&&c1>0)sfx('count');
        if(match.cooldown<=0){match.cooldown=0;match.goFlash=0.8;sfx('go');}
      }
      // Bomb Tag owns its clock via BOMB_MODE.fuse (synced to match.timer by
      // updateBombMode): generic decay here would double-speed the fuse AND
      // endMatch() on first detonation instead of running the elimination loop.
      if(settings.gameMode !== 'bomb') match.timer-=dt;
      if(settings.teams && match.itTeam != null){
        if(!match.teamItTime) match.teamItTime = [0,0,0,0];
        match.teamItTime[match.itTeam] += dt;
      }
    }
    if(settings.gameMode !== 'bomb'){
      const s=Math.ceil(match.timer);
      if(s!==match.lastTick){if(s<=5&&s>0)sfx('tick');match.lastTick=s;}
    }
    if(match.timer<=0 && settings.gameMode !== 'bomb'){
      if(settings.gameMode === 'ctf' && typeof ctfState !== 'undefined' && ctfState.scores[0] === ctfState.scores[1] && !match.isSuddenDeath){
        match.isSuddenDeath = true;
        match.timer = 60;
        toast('⚡ SUDDEN DEATH! NEXT CAPTURE WINS!');
        sfx('go');
      } else {
        match.timer=0;
        if(match.hunterMode) endHunterRound(null);
        else endMatch();
        return;
      }
    }
    match.hintT-=dt;
  }
  match.goFlash-=dt;
  match.flash=Math.max(0,match.flash-dt);
  if(match.tagPop){match.tagPop.t-=dt;if(match.tagPop.t<=0)match.tagPop=null;}
  match.shake*=Math.exp(-dt*7);
  updateParts(dt);
  updateCam(dt);
}
function update(dt){
  if(screen==='menu'){updateMenu(dt);updateCam(dt);}
  else{
    updateGame(dt);
    if(typeof HARNESS !== 'undefined' && HARNESS.active){
      try{ harnessTick(dt); }catch(e){}
    }
  }
  if(typeof updateVoiceProximity==='function')updateVoiceProximity(dt);
}

