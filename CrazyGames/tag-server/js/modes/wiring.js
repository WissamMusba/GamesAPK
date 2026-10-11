/* Export live mode references to top-level lexical scope */
var initInfectionMode = (typeof window !== "undefined" && window.initInfectionMode) || (typeof globalThis !== "undefined" ? globalThis.initInfectionMode : null);
var updateInfection = (typeof window !== "undefined" && window.updateInfection) || (typeof globalThis !== "undefined" ? globalThis.updateInfection : null);
var checkInfectionTag = (typeof window !== "undefined" && window.checkInfectionTag) || (typeof globalThis !== "undefined" ? globalThis.checkInfectionTag : null);
var drawInfectionUI = (typeof window !== "undefined" && window.drawInfectionUI) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionUI : null);
var drawInfectionPlayer = (typeof window !== "undefined" && window.drawInfectionPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionPlayer : null);
var infectionBotThink = (typeof window !== "undefined" && window.infectionBotThink) || (typeof globalThis !== "undefined" ? globalThis.infectionBotThink : null);
var getInfectionPlayerSpeed = (typeof window !== "undefined" && window.getInfectionPlayerSpeed) || (typeof globalThis !== "undefined" ? globalThis.getInfectionPlayerSpeed : null);
var getInfectionHoldLift = (typeof window !== "undefined" && window.getInfectionHoldLift) || (typeof globalThis !== "undefined" ? globalThis.getInfectionHoldLift : null);
var drawInfectionShockwaves = (typeof window !== "undefined" && window.drawInfectionShockwaves) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionShockwaves : null);
var drawInfectionSlime = (typeof window !== "undefined" && window.drawInfectionSlime) || (typeof globalThis !== "undefined" ? globalThis.drawInfectionSlime : null);
var triggerRepulsorPulse = (typeof window !== "undefined" && window.triggerRepulsorPulse) || (typeof globalThis !== "undefined" ? globalThis.triggerRepulsorPulse : null);
var infectionState = (typeof window !== "undefined" && window.infectionState) || (typeof globalThis !== "undefined" ? globalThis.infectionState : null);
var INFECTION_CONFIG = (typeof window !== "undefined" && window.INFECTION_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.INFECTION_CONFIG : null);
var InfectionMode = (typeof window !== "undefined" && window.InfectionMode) || (typeof globalThis !== "undefined" ? globalThis.InfectionMode : null);

var initBombMode = (typeof window !== "undefined" && window.initBombMode) || (typeof globalThis !== "undefined" ? globalThis.initBombMode : null);
var updateBombMode = (typeof window !== "undefined" && window.updateBombMode) || (typeof globalThis !== "undefined" ? globalThis.updateBombMode : null);
var checkBombTag = (typeof window !== "undefined" && window.checkBombTag) || (typeof globalThis !== "undefined" ? globalThis.checkBombTag : null);
var drawBombUI = (typeof window !== "undefined" && window.drawBombUI) || (typeof globalThis !== "undefined" ? globalThis.drawBombUI : null);
var drawBombPlayer = (typeof window !== "undefined" && window.drawBombPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawBombPlayer : null);
var bombBotThink = (typeof window !== "undefined" && window.bombBotThink) || (typeof globalThis !== "undefined" ? globalThis.bombBotThink : null);
var BOMB_MODE = (typeof window !== "undefined" && window.BOMB_MODE) || (typeof globalThis !== "undefined" ? globalThis.BOMB_MODE : null);
var BOMB_CONFIG = (typeof window !== "undefined" && window.BOMB_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.BOMB_CONFIG : null);
var ModeBomb = (typeof window !== "undefined" && window.ModeBomb) || (typeof globalThis !== "undefined" ? globalThis.ModeBomb : null);

var initCrownMode = (typeof window !== "undefined" && window.initCrownMode) || (typeof globalThis !== "undefined" ? globalThis.initCrownMode : null);
var updateCrownMode = (typeof window !== "undefined" && window.updateCrownMode) || (typeof globalThis !== "undefined" ? globalThis.updateCrownMode : null);
var checkCrownTag = (typeof window !== "undefined" && window.checkCrownTag) || (typeof globalThis !== "undefined" ? globalThis.checkCrownTag : null);
var drawCrownUI = (typeof window !== "undefined" && window.drawCrownUI) || (typeof globalThis !== "undefined" ? globalThis.drawCrownUI : null);
var drawCrownPlayer = (typeof window !== "undefined" && window.drawCrownPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawCrownPlayer : null);
var crownBotThink = (typeof window !== "undefined" && window.crownBotThink) || (typeof globalThis !== "undefined" ? globalThis.crownBotThink : null);
var getCrownPlayerSpeed = (typeof window !== "undefined" && window.getCrownPlayerSpeed) || (typeof globalThis !== "undefined" ? globalThis.getCrownPlayerSpeed : null);
var drawCrownEntity = (typeof window !== "undefined" && window.drawCrownEntity) || (typeof globalThis !== "undefined" ? globalThis.drawCrownEntity : null);
var drawCrownWorldFX = (typeof window !== "undefined" && window.drawCrownWorldFX) || (typeof globalThis !== "undefined" ? globalThis.drawCrownWorldFX : null);
var spawnCrownShockwave = (typeof window !== "undefined" && window.spawnCrownShockwave) || (typeof globalThis !== "undefined" ? globalThis.spawnCrownShockwave : null);
var CROWN_CONFIG = (typeof window !== "undefined" && window.CROWN_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.CROWN_CONFIG : null);
var crownState = (typeof window !== "undefined" && window.crownState) || (typeof globalThis !== "undefined" ? globalThis.crownState : null);
var CrownMode = (typeof window !== "undefined" && window.CrownMode) || (typeof globalThis !== "undefined" ? globalThis.CrownMode : null);

var initCtfMode = (typeof window !== "undefined" && window.initCtfMode) || (typeof globalThis !== "undefined" ? globalThis.initCtfMode : null);
var updateCtf = (typeof window !== "undefined" && window.updateCtf) || (typeof globalThis !== "undefined" ? globalThis.updateCtf : null);
var checkCtfTag = (typeof window !== "undefined" && window.checkCtfTag) || (typeof globalThis !== "undefined" ? globalThis.checkCtfTag : null);
var drawCtfUI = (typeof window !== "undefined" && window.drawCtfUI) || (typeof globalThis !== "undefined" ? globalThis.drawCtfUI : null);
var drawCtfPlayer = (typeof window !== "undefined" && window.drawCtfPlayer) || (typeof globalThis !== "undefined" ? globalThis.drawCtfPlayer : null);
var drawCtfEntities = (typeof window !== "undefined" && window.drawCtfEntities) || (typeof globalThis !== "undefined" ? globalThis.drawCtfEntities : null);
var drawCtfWorldFX = (typeof window !== "undefined" && window.drawCtfWorldFX) || (typeof globalThis !== "undefined" ? globalThis.drawCtfWorldFX : null);
var ctfBotThink = (typeof window !== "undefined" && window.ctfBotThink) || (typeof globalThis !== "undefined" ? globalThis.ctfBotThink : null);
var triggerCtfWin = (typeof window !== "undefined" && window.triggerCtfWin) || (typeof globalThis !== "undefined" ? globalThis.triggerCtfWin : null);
var ctfState = (typeof window !== "undefined" && window.ctfState) || (typeof globalThis !== "undefined" ? globalThis.ctfState : null);
var CTF_CONFIG = (typeof window !== "undefined" && window.CTF_CONFIG) || (typeof globalThis !== "undefined" ? globalThis.CTF_CONFIG : null);
var CtfMode = (typeof window !== "undefined" && window.CtfMode) || (typeof globalThis !== "undefined" ? globalThis.CtfMode : null);


function startMatch(){
  if(typeof NET !== 'undefined' && NET && (menu.tab === 'solo' || menu.tab === 'bots' || menu.tab === '2p' || NET.role === null)){ NET.isSpectator = false; }
  try{ NET._lastSentState = null; NET._lastFullT = 0; NET._seenClaims = []; }catch(e){} // force full snapshot on first tick
  try{
    SESSION_METRICS.matchesStarted++;
    SESSION_METRICS.currentMatchStartT = Date.now();
    const curM = settings.gameMode || 'party';
    SESSION_METRICS.modesPlayed[curM] = (SESSION_METRICS.modesPlayed[curM] || 0) + 1;
    SESSION_METRICS.botDifficulty = menu.botDifficulty || 'hard';
    try{ telemetrySendSessionPing('match_start'); }catch(e){}
  }catch(e){}
  if(match && !match._telemetrySent){ try{ telemetryTrackMatchEnded('quit'); }catch(e){} }
  if(menu.tab === 'solo'){
    const soloModes = ['party', 'bomb', 'crown', 'ctf'];
    if(soloModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
  } else if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf'];
    if(botModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
    menu.botOn = true;
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  } else if(menu.tab === 'teams') settings.teams = true;
  if(settings.gameMode === 'ctf'){
    settings.teams = true;
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  }
  if(settings.randomMap){
    settings.map = Math.floor(rand(MAPS.length));
  }
  // Starting a solo/bot or local-party match while in an online room:
  // leave the room first (any role), then start offline. Online-tab guests stay blocked.
  if(typeof NET!=='undefined' && NET && NET.role!==null && (menu.tab==='solo' || menu.tab==='2p' || menu.tab==='bots')){
    try{if(NET.isHost) netBroadcastReliable({t:'to_menu'});}catch(e){}
    try{if(typeof netLeaveRoom==='function')netLeaveRoom(menu.tab==='solo'?'Solo mode — left online room':(menu.tab==='bots'?'Watch bots — left online room':'Local mode — left online room'));}catch(e){}
  }
  if(typeof NET!=='undefined' && NET && NET.role!==null && !NET.isHost){
    toast('HOST RESTARTS THE MATCH');
    return;
  }
  // Auto-admit waiting guest spectators into open slots before starting next round (never host)
  if(typeof NET !== 'undefined' && NET && NET.isHost && NET.spectators && NET.spectators.length > 0){
    const guestSpecs = NET.spectators.filter(sp => sp.peerId !== (NET.myId || 'host') && sp.peerId !== 'host');
    for(let s = 1; s < MAXP; s++){
      if(menu.slotColor[s] === -1 && !NET.hostInputs.has(s) && guestSpecs.length > 0){
        const nextSpec = guestSpecs.shift();
        netAdmitSpectator(nextSpec.peerId, s);
      }
    }
  }
  if(typeof NET !== 'undefined' && NET && NET.role !== null && NET.isSpectator){
    NET.mySlot = -1;
    if(NET.isHost && !NET.hostInputs.has(0)){
      menu.slotColor[0] = -1;
    }
  }
  ensureUniqueLocalColors();
  const act=activeSlots();
  const isHunter = (settings.gameMode === 'hunter');
  const isCtf = (settings.gameMode === 'ctf');
  const isTeamMode = (settings.teams || isHunter || isCtf || settings.gameMode === 'teams');
  if(isHunter){
    validateHunterRoles();
    if(act.length < 4){
      menu.mode = 'slots';
      menu.row = 0;
      toast('🎯 HUNTER MODE REQUIRES AT LEAST 4 PLAYERS!');
      sfx('back');
      return;
    }
  }
  if(isTeamMode && act.length >= 2){
    let redCount = 0, blueCount = 0;
    for(const s of act){
      const t = (menu.slotTeam && menu.slotTeam[s] != null) ? (menu.slotTeam[s] % 2) : (s % 2);
      if(t === 0) redCount++; else blueCount++;
    }
    if(Math.abs(redCount - blueCount) > 1){
      toast('⚠️ TEAMS MUST BE BALANCED (MAX ±1 DIFFERENCE)');
      sfx('back');
      return;
    }
  } else if((settings.gameMode === 'infection' || settings.gameMode === 'freeze') && act.length < 3){
    toast('⚠️ ' + (settings.gameMode === 'infection' ? 'INFECTION' : 'FREEZE') + ' REQUIRES AT LEAST 3 PLAYERS!');
    sfx('back');
    return;
  } else if(act.length<2){
    menu.mode='slots';
    menu.row=0;
    toast('CHOOSE AT LEAST 2 PLAYERS!');
    sfx('back');
    return;
  }
  try{parts.length = 0;}catch(e){}
  try{CG.gameplayStart();}catch(e){}
  matchIndex++;
  /* AUTOMATIC CLEAN GRADIENT BACKGROUND CHANGE ON EVERY MATCH */
  currentThemeIdx=(matchIndex-1)%THEMES.length;
  const N=act.length;
  let it;
  if(matchIndex%2===1)it=Math.floor(rand(N));
  else it=(lastStartIT+1)%N;
  lastStartIT=it;
  buildLevel();
  const players=act.map((slot,i)=>makePlayer(i,slot,menu.slotColor[slot]));
  const itTeam = settings.teams ? players[it].team : null;
  const isOnlineMatch = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isSplitLocalTouch = (isTouch && !isOnlineMatch && act.length === 2 && !menu.botOn && menu.tab !== 'solo');
  const initState = isSplitLocalTouch ? 'tutorial' : 'countdown';
  if(isSplitLocalTouch){
    LOCAL_TOUCH.showTutorial = true;
    LOCAL_TOUCH.p1.joyId = null; LOCAL_TOUCH.p1.active = false; LOCAL_TOUCH.p1.left = false; LOCAL_TOUCH.p1.right = false; LOCAL_TOUCH.p1.offX = 0; LOCAL_TOUCH.p1.visOffX = 0; LOCAL_TOUCH.p1.spX = 0; LOCAL_TOUCH.p1.sldId = null; LOCAL_TOUCH.p1.sldV = 0; LOCAL_TOUCH.p1.jumpHeld = false; LOCAL_TOUCH.p1.jumpEdge = false; LOCAL_TOUCH.p1.downHeld = false;
    LOCAL_TOUCH.p2.joyId = null; LOCAL_TOUCH.p2.active = false; LOCAL_TOUCH.p2.left = false; LOCAL_TOUCH.p2.right = false; LOCAL_TOUCH.p2.offX = 0; LOCAL_TOUCH.p2.visOffX = 0; LOCAL_TOUCH.p2.spX = 0; LOCAL_TOUCH.p2.sldId = null; LOCAL_TOUCH.p2.sldV = 0; LOCAL_TOUCH.p2.jumpHeld = false; LOCAL_TOUCH.p2.jumpEdge = false; LOCAL_TOUCH.p2.downHeld = false;
  } else {
    LOCAL_TOUCH.showTutorial = false;
  }

  let hHistory = (match && match.hunterHistory) ? { ...match.hunterHistory } : {};
  if(isHunter){
    hHistory[settings.hunterRed] = (hHistory[settings.hunterRed] || 0) + 1;
    hHistory[settings.hunterBlue] = (hHistory[settings.hunterBlue] || 0) + 1;
    if(menu.hunterHistory){
      menu.hunterHistory[settings.hunterRed] = hHistory[settings.hunterRed];
      menu.hunterHistory[settings.hunterBlue] = hHistory[settings.hunterBlue];
    }
    menu.hunterVotes = {};
  }

  match={startTime:Date.now(),state:initState,cd:3,cdT:0,timer:isHunter?60:settings.time,lastTick:isHunter?60:settings.time,it:it,itTeam:itTeam,
    hunterMode:isHunter,hunterRed:settings.hunterRed,hunterBlue:settings.hunterBlue,
    hunterScores:(match && match.hunterScores)?match.hunterScores:{0:0,1:0},
    hunterRound:(match && match.hunterRound)?match.hunterRound:1,
    hunterMaxRounds:3,hunterWipeTime:{0:null,1:null},hunterHistory:hHistory,
    cageT:isHunter?3.0:0,killfeed:[],killfeedT:0,spectateTarget:null,
    teamItTime:[0,0,0,0],cooldown:0,
    goFlash:0,freeze:0,shake:0,flash:0,fade:0.6,tagPop:null,resultT:0,
    tags:players.map(()=>0),hintT:7,players:players,result:null,roundSummary:null,pausedFrom:null,pauseSel:0,
    mapToast:(settings.randomMap?('🎲 RANDOM: '+MAPS[settings.map].name):MAPS[settings.map].name),mapToastT:2.5};
  try{botReset();}catch(e){}
  menu.mapVote = null;
  menu.modePopup = false;
  if(settings.gameMode === 'infection'){
    if(typeof initInfectionMode === 'function') initInfectionMode();
  } else if(settings.gameMode === 'bomb'){
    if(typeof initBombMode === 'function') initBombMode();
  } else if(settings.gameMode === 'crown'){
    match.it = -1;
    if(typeof initCrownMode === 'function') initCrownMode();
  } else if(settings.gameMode === 'ctf'){
    match.it = -1;
    if(typeof initCtfMode === 'function') initCtfMode();
  }
  // Clear stale mode flags when leaving bomb/crown/ctf (init only sets active=true).
  try{
    if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE && settings.gameMode !== 'bomb') BOMB_MODE.active = false;
    if(typeof crownState !== 'undefined' && crownState && settings.gameMode !== 'crown') crownState.active = false;
    if(typeof ctfState !== 'undefined' && ctfState && settings.gameMode !== 'ctf') ctfState.active = false;
  }catch(e){}
  screen='game';
  if(!isSplitLocalTouch) sfx('count');

  // Broadcast to all connected netplay guests
  if(typeof NET!=='undefined' && NET && NET.role!==null && NET.isHost && NET.conns.size>0){
    const payload={it:match.it, itTeam:match.itTeam, cooldownN:0, matchIndex:matchIndex, currentThemeIdx:currentThemeIdx, lastStartIT:lastStartIT, hunterMode:isHunter, hunterRed:settings.hunterRed, hunterBlue:settings.hunterBlue, hunterRound:match.hunterRound, hunterScores:match.hunterScores, cageT:match.cageT, hunterHistory:hHistory};
    netBroadcastReliable({t:'start',settings:{map:settings.map,doubleJump:settings.doubleJump,collision:settings.collision,teams:settings.teams,gameMode:settings.gameMode,ctfTargetCaptures:settings.ctfTargetCaptures,hunterRed:settings.hunterRed,hunterBlue:settings.hunterBlue,slotColor:menu.slotColor.slice(),slotTeam:(menu.slotTeam?menu.slotTeam.slice():[])},mapData:MAPS[settings.map%MAPS.length],payload:payload});
  }
}
function quitToMenu(){
  try{CG.gameplayStop();}catch(e){}
  if(match && !match._telemetrySent){ try{ telemetryTrackMatchEnded('quit'); }catch(e){} }
  if(typeof NET!=='undefined' && NET && NET.role!==null && NET.isHost){
    try{if(typeof CG!=='undefined'&&CG&&typeof CG.leftRoom==='function')CG.leftRoom();}catch(e){}
    netBroadcastReliable({t:'to_menu'});
  } else if(typeof NET!=='undefined' && NET && NET.role!==null && !NET.isHost){
    // Guest leaving: fully disconnect so the host drops the slot.
    try{if(typeof netLeaveRoom==='function')netLeaveRoom();}catch(e){}
  } else {
    try{if(typeof CG!=='undefined'&&CG&&typeof CG.leftRoom==='function')CG.leftRoom();}catch(e){}
  }
  GESTURE_SPLIT.showTutorial = false;
  match=null;screen='menu';sfx('back');
}

function returnToLobby(){
  try{CG.gameplayStop();}catch(e){}
  if(match && !match._telemetrySent){ try{ telemetryTrackMatchEnded('quit'); }catch(e){} }
  GESTURE_SPLIT.showTutorial = false;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  if(isOnline){
    if(NET.isHost){
      netBroadcastReliable({t:'to_menu'});
    }
    match = null;
    screen = 'menu';
    menu.tab = 'online';
    sfx('back');
  } else {
    quitToMenu();
  }
}

