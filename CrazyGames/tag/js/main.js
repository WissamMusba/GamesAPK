/* ================= main loop ================= */
function render(){
  if(typeof syncDOMUI==='function')syncDOMUI();
  zones.length=0;
  g.setTransform(DPR,0,0,DPR,0,0);
  if(NET.role!==null && NET.isHost && match && screen==='game'){
    // small host badge
    g.save();g.font='700 12px Outfit,system-ui,sans-serif';g.fillStyle='rgba(255,176,32,0.95)';g.fillText('HOST • '+NET.room.toUpperCase(),CW-12,18);g.textAlign='right';g.restore();
  }
  if(NET.role!==null && !NET.isHost && match && screen==='game'){
    g.save();g.font='700 12px Outfit,system-ui,sans-serif';g.fillStyle='rgba(0,210,211,0.95)';g.fillText('GUEST • '+NET.room.toUpperCase(),CW-12,18);g.textAlign='right';g.restore();
  }
  if(screen==='menu')drawMenu();
  else if(match){drawGame();if(typeof DEMO!=='undefined'&&DEMO.active){try{demoOverlay();}catch(e){}}}
  if(!isTouch){
    const hz = zoneAt(pointerX, pointerY, false);
    const wantPointer = !!(hz && (hz.fn || hz.upFn || hz.touchAction));
    if(cv.style.cursor !== (wantPointer ? 'pointer' : 'default')){
      cv.style.cursor = wantPointer ? 'pointer' : 'default';
    }
  }
}
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  if(!last) last = now;
  if(document.hidden && NET.role !== null && NET.isHost){
    return;
  }
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
  last = now;
  tGlobal += dt;
  if(typeof SESSION_METRICS !== 'undefined'){
    SESSION_METRICS.fpsCounter = (SESSION_METRICS.fpsCounter || 0) + 1;
    if(!SESSION_METRICS.fpsTimer) SESSION_METRICS.fpsTimer = now;
    if(now - SESSION_METRICS.fpsTimer >= 1000){
      const curFps = Math.min(60, Math.round(SESSION_METRICS.fpsCounter * 1000 / (now - SESSION_METRICS.fpsTimer)));
      if(!SESSION_METRICS.fpsSamples) SESSION_METRICS.fpsSamples = [];
      SESSION_METRICS.fpsSamples.push(curFps);
      if(SESSION_METRICS.fpsSamples.length > 30) SESSION_METRICS.fpsSamples.shift();
      SESSION_METRICS.avgFps = Math.round(SESSION_METRICS.fpsSamples.reduce((a,b)=>a+b, 0) / SESSION_METRICS.fpsSamples.length);
      SESSION_METRICS.fpsCounter = 0;
      SESSION_METRICS.fpsTimer = now;
    }
  }
  
  // Global gamepad polling for every client
  pollGamepads();

  // Netplay tick (smoothed by render interp)
  if(NET.role !== null){
    netTick(dt);
  }
  try{
    if(NET.role !== null && !NET.isHost && match){
      // Tag freeze is host-authoritative: hold everything for 0.09s like the host does
      if(match.freeze > 0){ match.freeze -= dt; }
      else{
        const inPlay = match.state === 'playing';
        // Guest countdown backup: tick 3-2-1 locally so the display never sticks
        // if host packets stall; host values snap-correct on arrival. Never flips
        // to playing locally — that transition always comes from the host.
        if(match.state === 'countdown'){
          match.cdT = (match.cdT || 0) + dt;
          while(match.cdT >= 0.72 && match.cd > 1){ match.cdT -= 0.72; match.cd--; sfx('count'); }
          if(match.cdT >= 0.72) match.cdT = 0.72;
        }
        // Tag-cooldown display backup (same idea): decay locally so guests always
        // see 3-2-1 above the arrow; host packets snap-correct on arrival.
        if(match.state === 'playing' && match.cooldown > 0) match.cooldown = Math.max(0, match.cooldown - dt);
        const myP = getMyPlayer();
        if(myP){
          physUpdate(myP, dt, inPlay);
        }
        // Smooth continuous predictive interpolation for all remote players
        for(const p of match.players){
          if(p.slot !== NET.mySlot){
            netApplyRemoteTarget(p, dt);
          }
        }
        checkTag();
        if(settings.gameMode === 'infection'){
          try{ if(typeof updateInfection === 'function') updateInfection(dt); }catch(e){}
        } else if(settings.gameMode === 'bomb'){
          try{ if(typeof updateBombMode === 'function') updateBombMode(dt); }catch(e){}
        } else if(settings.gameMode === 'crown'){
          try{ if(typeof updateCrownMode === 'function') updateCrownMode(dt); }catch(e){}
        } else if(settings.gameMode === 'ctf'){
          try{ if(typeof updateCtf === 'function') updateCtf(dt); }catch(e){}
        }
        if(typeof updateVoiceProximity === 'function') updateVoiceProximity(dt);
        if(anyPressed(['KeyM']) && (!match || match.state !== 'result')) toggleSound();
        if(anyPressed(['KeyO'])) toggleFullscreen();
        updateCam(dt);
        updateParts(dt);
        if(match.tagPop){ match.tagPop.t -= dt; if(match.tagPop.t <= 0) match.tagPop = null; }
        match.goFlash = Math.max(0, (match.goFlash || 0) - dt);
        match.flash = Math.max(0, (match.flash || 0) - dt);
        match.fade = Math.max(0, (match.fade || 0) - dt);
        match.shake = (match.shake || 0) * Math.exp(-dt * 7);
        if(match.state === 'result'){
          match.resultT = (match.resultT || 0) + dt;
          if(!menu.mapVote || menu.mapVote.mid !== matchIndex){
            menu.mapVote = { mid: matchIndex, opts: [], votes: {}, seq: 0, modeReq: {}, mseq: 0, t: 20, decided: false, waiting: true };
          }
          const GV = menu.mapVote;
          if(GV && !GV.decided){
            GV.t -= dt;
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
              if(anyPressed(['KeyM']) && GV && !GV.decided){ menu.modePopup = true; sfx('ui'); }
            }
          }
        }
      } // end freeze gate
    } else {
      update(dt);
    }
    render();
  }catch(err){ try{ logModeErr('frame', err); }catch(e2){} }
  TOUCH.jumpEdge = false;
  pressed.clear();
}

/* Background tick worker: keeps host simulation and net broadcasting alive even if the tab is hidden or minimized */
let bgWorker = null;
function backgroundStep(){
  if(!document.hidden || NET.role === null) return;
  const now = performance.now();
  if(!last) last = now;
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
  last = now;
  tGlobal += dt;
  pollGamepads();
  if(NET.isHost){
    if(match && match.state !== 'paused'){
      updateGame(dt);
    }
  } else if(match && match.state !== 'paused'){
    const myP = getMyPlayer();
    if(myP) physUpdate(myP, dt, match.state === 'playing');
  }
  netTick(dt);
  TOUCH.jumpEdge = false;
  pressed.clear();
}

try {
  const blob = new Blob([`
    let tid = null;
    self.onmessage = function(e){
      if(e.data === 'start'){
        if(!tid) tid = setInterval(() => self.postMessage('tick'), 16);
      } else if(e.data === 'stop'){
        if(tid){ clearInterval(tid); tid = null; }
      }
    };
  `], { type: 'application/javascript' });
  bgWorker = new Worker(URL.createObjectURL(blob));
  bgWorker.onmessage = function(){
    backgroundStep();
  };
  bgWorker.postMessage('start');
} catch(err) {
  setInterval(() => {
    backgroundStep();
  }, 16);
}

document.addEventListener('visibilitychange', () => {
  last = performance.now();
});

const onTabCloseCloseRoom = () => {
  if(typeof match !== 'undefined' && match && !match._telemetrySent){ try{ telemetryTrackMatchEnded('quit'); }catch(e){} }
  try{ telemetryRecordSessionEnd(); }catch(e){}
  if(typeof NET !== 'undefined' && NET && NET.isHost && NET.room){
    try {
      const serverUrl = netDirBase();
      const payload = JSON.stringify({ roomId: NET.room });
      if(navigator.sendBeacon){
        navigator.sendBeacon(serverUrl + '/api/rooms/close', new Blob([payload], { type: 'application/json' }));
      }
    } catch(e){}
  }
};
window.addEventListener('beforeunload', onTabCloseCloseRoom);
window.addEventListener('pagehide', onTabCloseCloseRoom);
syncCustomMaps();
/* Editor launch: tag_map_editor.html "Full Game" stores the map you're viewing
   plus default 2P settings; the game jumps straight into that match. */
try{
  const raw=localStorage.getItem('tag_arena_launch_v1');
  if(raw){
    localStorage.removeItem('tag_arena_launch_v1');
    const L=JSON.parse(raw);
    if(Number.isInteger(L.map)&&L.map>=0&&L.map<MAPS.length)settings.map=L.map;
    settings.doubleJump=L.doubleJump!==false;
    settings.collision=!!L.collision;
    if(L.slots&&L.slots.length>=2)menu.slotColor=L.slots.slice(0,4);
    menu.mode='rows';
    startMatch();
  }
}catch(e){/* normal menu boot */}
buildLevel();
netInitUI();
try{ telemetryTrackGameLaunch(); }catch(e){}

/* Training harness launch: ?train (map 0) or ?train=N (map N) or ?harness=N */
try{
  const qp = new URLSearchParams(location.search);
  const tq = qp.get('train') || qp.get('harness') || qp.get('demo');
  if(tq !== null){
    let mi = (tq === '' || tq === 'true') ? 0 : parseInt(tq, 10);
    if(!Number.isInteger(mi)) mi = 0;
    settings.map = ((mi % MAPS.length) + MAPS.length) % MAPS.length;
    harnessStart(settings.map);
  }
}catch(e){}

try{ if(!_cgBoot) _cgBoot = CG.boot(); }catch(e){}
try{ setTimeout(()=>{ try{ netProbeServers(); }catch(e){} }, 2500); }catch(e){} // background self/render probe so Host/Join has a fresh pick
requestAnimationFrame(frame);
/*
TOMORROW - LIVE DASHBOARD PLAN - ALL COMMENTED OUT - NOTHING RUNS
GOAL: per-click playtime join-to-leave for all players, avg desktop vs mobile,
returning players, total plays, live dashboard, conversion over 60s,
time per mode and map, most played map and mode, solo-bot experience,
lobby wait after host, private vs public counts, directory visibility.
STEP 1 - BACKEND CHECK: confirm access to tag-netplay-server render code.
If yes add 2 tables: sessions and events. If no create tiny backend first.
STEP 2 - PLAYER ID: add persistent id in localStorage tag_player_id_v1.
Use it in every event to count returning players and total plays.
STEP 3 - ADD 3 MISSING EVENTS:
 A session_start once per tab with playerId device mobile-touch resolution source roomQ.
 B lobby_join and lobby_leave with room code slot peerId timestamp for per-click playtime.
 C directory_view when server list opened plus wait_time firstJoin minus hostTime.
STEP 4 - KEEP EXISTING: lobby_host public-private mode map, match_start match_end
with mode map-name not just map-number players winner duration, invite shared.
Add map-name to match_end payload.
STEP 5 - SEND: change telemetryTrack functions to POST json to server api-track
with keepalive and sendBeacon on close. Keep Discord only for alerts.
STEP 6 - DASHBOARD PAGE: password page polling every 5s. Widgets:
 online now, today plays, avg playtime desktop, avg playtime mobile,
 conversion pct over 60s, top maps, top modes, avg duration per mode-map,
 private vs public pie, avg lobby wait, solo humanWins vs botWins plus rageQuits.
STEP 7 - PRIVACY: no full IP, no chat text, respect CrazyGames rules, add opt-out.
Test with 3 players: kill host, check migration still works, check events arrive.
*/

