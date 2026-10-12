/* Dynamic mode hook resolver avoiding stale null references */
function getModeHook(name) {
  if (typeof window !== "undefined" && window[name] !== undefined) return window[name];
  if (typeof globalThis !== "undefined" && globalThis[name] !== undefined) return globalThis[name];
  return null;
}

/* Export live mode references to top-level lexical scope */
var initInfectionMode = getModeHook('initInfectionMode');
var updateInfection = getModeHook('updateInfection');
var checkInfectionTag = getModeHook('checkInfectionTag');
var drawInfectionUI = getModeHook('drawInfectionUI');
var drawInfectionPlayer = getModeHook('drawInfectionPlayer');
var infectionBotThink = getModeHook('infectionBotThink');
var getInfectionPlayerSpeed = getModeHook('getInfectionPlayerSpeed');
var getInfectionHoldLift = getModeHook('getInfectionHoldLift');
var drawInfectionShockwaves = getModeHook('drawInfectionShockwaves');
var drawInfectionSlime = getModeHook('drawInfectionSlime');
var triggerRepulsorPulse = getModeHook('triggerRepulsorPulse');
var infectionState = getModeHook('infectionState');
var INFECTION_CONFIG = getModeHook('INFECTION_CONFIG');
var InfectionMode = getModeHook('InfectionMode');

var initBombMode = getModeHook('initBombMode');
var updateBombMode = getModeHook('updateBombMode');
var checkBombTag = getModeHook('checkBombTag');
var drawBombUI = getModeHook('drawBombUI');
var drawBombPlayer = getModeHook('drawBombPlayer');
var bombBotThink = getModeHook('bombBotThink');
var BOMB_MODE = getModeHook('BOMB_MODE');
var BOMB_CONFIG = getModeHook('BOMB_CONFIG');
var ModeBomb = getModeHook('ModeBomb');

var initCrownMode = getModeHook('initCrownMode');
var updateCrownMode = getModeHook('updateCrownMode');
var checkCrownTag = getModeHook('checkCrownTag');
var drawCrownUI = getModeHook('drawCrownUI');
var drawCrownPlayer = getModeHook('drawCrownPlayer');
var crownBotThink = getModeHook('crownBotThink');
var getCrownPlayerSpeed = getModeHook('getCrownPlayerSpeed');
var drawCrownEntity = getModeHook('drawCrownEntity');
var drawCrownWorldFX = getModeHook('drawCrownWorldFX');
var spawnCrownShockwave = getModeHook('spawnCrownShockwave');
var CROWN_CONFIG = getModeHook('CROWN_CONFIG');
var crownState = getModeHook('crownState');
var CrownMode = getModeHook('CrownMode');

var initCtfMode = getModeHook('initCtfMode');
var updateCtf = getModeHook('updateCtf');
var checkCtfTag = getModeHook('checkCtfTag');
var drawCtfUI = getModeHook('drawCtfUI');
var drawCtfPlayer = getModeHook('drawCtfPlayer');
var drawCtfEntities = getModeHook('drawCtfEntities');
var drawCtfWorldFX = getModeHook('drawCtfWorldFX');
var ctfBotThink = getModeHook('ctfBotThink');
var triggerCtfWin = getModeHook('triggerCtfWin');
var ctfState = getModeHook('ctfState');
var CTF_CONFIG = getModeHook('CTF_CONFIG');
var CtfMode = getModeHook('CtfMode');

function refreshModeBindings() {
  initInfectionMode = getModeHook('initInfectionMode') || initInfectionMode;
  updateInfection = getModeHook('updateInfection') || updateInfection;
  checkInfectionTag = getModeHook('checkInfectionTag') || checkInfectionTag;
  drawInfectionUI = getModeHook('drawInfectionUI') || drawInfectionUI;
  drawInfectionPlayer = getModeHook('drawInfectionPlayer') || drawInfectionPlayer;
  infectionBotThink = getModeHook('infectionBotThink') || infectionBotThink;
  getInfectionPlayerSpeed = getModeHook('getInfectionPlayerSpeed') || getInfectionPlayerSpeed;
  getInfectionHoldLift = getModeHook('getInfectionHoldLift') || getInfectionHoldLift;
  drawInfectionShockwaves = getModeHook('drawInfectionShockwaves') || drawInfectionShockwaves;
  drawInfectionSlime = getModeHook('drawInfectionSlime') || drawInfectionSlime;
  triggerRepulsorPulse = getModeHook('triggerRepulsorPulse') || triggerRepulsorPulse;
  infectionState = getModeHook('infectionState') || infectionState;
  INFECTION_CONFIG = getModeHook('INFECTION_CONFIG') || INFECTION_CONFIG;
  InfectionMode = getModeHook('InfectionMode') || InfectionMode;

  initBombMode = getModeHook('initBombMode') || initBombMode;
  updateBombMode = getModeHook('updateBombMode') || updateBombMode;
  checkBombTag = getModeHook('checkBombTag') || checkBombTag;
  drawBombUI = getModeHook('drawBombUI') || drawBombUI;
  drawBombPlayer = getModeHook('drawBombPlayer') || drawBombPlayer;
  bombBotThink = getModeHook('bombBotThink') || bombBotThink;
  BOMB_MODE = getModeHook('BOMB_MODE') || BOMB_MODE;
  BOMB_CONFIG = getModeHook('BOMB_CONFIG') || BOMB_CONFIG;
  ModeBomb = getModeHook('ModeBomb') || ModeBomb;

  initCrownMode = getModeHook('initCrownMode') || initCrownMode;
  updateCrownMode = getModeHook('updateCrownMode') || updateCrownMode;
  checkCrownTag = getModeHook('checkCrownTag') || checkCrownTag;
  drawCrownUI = getModeHook('drawCrownUI') || drawCrownUI;
  drawCrownPlayer = getModeHook('drawCrownPlayer') || drawCrownPlayer;
  crownBotThink = getModeHook('crownBotThink') || crownBotThink;
  getCrownPlayerSpeed = getModeHook('getCrownPlayerSpeed') || getCrownPlayerSpeed;
  drawCrownEntity = getModeHook('drawCrownEntity') || drawCrownEntity;
  drawCrownWorldFX = getModeHook('drawCrownWorldFX') || drawCrownWorldFX;
  spawnCrownShockwave = getModeHook('spawnCrownShockwave') || spawnCrownShockwave;
  CROWN_CONFIG = getModeHook('CROWN_CONFIG') || CROWN_CONFIG;
  crownState = getModeHook('crownState') || crownState;
  CrownMode = getModeHook('CrownMode') || CrownMode;

  initCtfMode = getModeHook('initCtfMode') || initCtfMode;
  updateCtf = getModeHook('updateCtf') || updateCtf;
  checkCtfTag = getModeHook('checkCtfTag') || checkCtfTag;
  drawCtfUI = getModeHook('drawCtfUI') || drawCtfUI;
  drawCtfPlayer = getModeHook('drawCtfPlayer') || drawCtfPlayer;
  drawCtfEntities = getModeHook('drawCtfEntities') || drawCtfEntities;
  drawCtfWorldFX = getModeHook('drawCtfWorldFX') || drawCtfWorldFX;
  ctfBotThink = getModeHook('ctfBotThink') || ctfBotThink;
  triggerCtfWin = getModeHook('triggerCtfWin') || triggerCtfWin;
  ctfState = getModeHook('ctfState') || ctfState;
  CTF_CONFIG = getModeHook('CTF_CONFIG') || CTF_CONFIG;
  CtfMode = getModeHook('CtfMode') || CtfMode;
}


function startMatch(){
  if(typeof settings === 'undefined' || !settings) settings = {};
  if(settings.map == null) settings.map = 0;
  if(settings.time == null) settings.time = 60;
  if(!settings.gameMode) settings.gameMode = 'party';
  if(typeof menu === 'undefined' || !menu) menu = {};
  if(!menu.slotColor) menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
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
    const soloModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(soloModes.indexOf(settings.gameMode) < 0){
      settings.gameMode = 'party';
    }
    settings.teams = (settings.gameMode === 'ctf');
    menu.gameMode = settings.gameMode;
  } else if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
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
    menu.mode = 'slots';
    menu.row = 0;
    const modeName = settings.gameMode.toUpperCase();
    toast(`⚠️ ${modeName} REQUIRES AT LEAST 3 PLAYERS!`);
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

  const mapObj = (typeof MAPS !== 'undefined' && Array.isArray(MAPS) && MAPS[settings.map]) ? MAPS[settings.map] : { name: 'Classic' };
  const mapName = mapObj.name || 'Classic';

  match={startTime:Date.now(),state:initState,cd:3,cdT:0,timer:isHunter?60:settings.time,lastTick:isHunter?60:settings.time,it:it,itTeam:itTeam,
    hunterMode:isHunter,hunterRed:settings.hunterRed,hunterBlue:settings.hunterBlue,
    hunterScores:(match && match.hunterScores)?match.hunterScores:{0:0,1:0},
    hunterRound:(match && match.hunterRound)?match.hunterRound:1,
    hunterMaxRounds:3,hunterWipeTime:{0:null,1:null},hunterHistory:hHistory,
    cageT:isHunter?3.0:0,killfeed:[],killfeedT:0,spectateTarget:null,
    teamItTime:[0,0,0,0],cooldown:0,
    goFlash:0,freeze:0,shake:0,flash:0,fade:0.6,tagPop:null,resultT:0,
    tags:players.map(()=>0),hintT:7,players:players,result:null,roundSummary:null,pausedFrom:null,pauseSel:0,
    mapToast:(settings.randomMap?('🎲 RANDOM: '+mapName):mapName),mapToastT:2.5};
  try{botReset();}catch(e){}
  refreshModeBindings();
  menu.mapVote = null;
  menu.modePopup = false;
  if(settings.gameMode === 'infection'){
    const fn = (typeof initInfectionMode === 'function') ? initInfectionMode : getModeHook('initInfectionMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initInfectionMode not found');
  } else if(settings.gameMode === 'bomb'){
    const fn = (typeof initBombMode === 'function') ? initBombMode : getModeHook('initBombMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initBombMode not found');
  } else if(settings.gameMode === 'crown'){
    match.it = -1;
    const fn = (typeof initCrownMode === 'function') ? initCrownMode : getModeHook('initCrownMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initCrownMode not found');
  } else if(settings.gameMode === 'ctf'){
    match.it = -1;
    const fn = (typeof initCtfMode === 'function') ? initCtfMode : getModeHook('initCtfMode');
    if(typeof fn === 'function') fn();
    else console.warn('[WIRING] initCtfMode not found');
  }
  // Clear stale mode flags when leaving bomb/crown/ctf/infection (init only sets active=true).
  try{
    const bState = (typeof BOMB_MODE !== 'undefined' && BOMB_MODE) || getModeHook('BOMB_MODE');
    if(bState && settings.gameMode !== 'bomb') bState.active = false;
    const crState = (typeof crownState !== 'undefined' && crownState) || getModeHook('crownState');
    if(crState && settings.gameMode !== 'crown') crState.active = false;
    const ctState = (typeof ctfState !== 'undefined' && ctfState) || getModeHook('ctfState');
    if(ctState && settings.gameMode !== 'ctf') ctState.active = false;
    const infState = (typeof infectionState !== 'undefined' && infectionState) || getModeHook('infectionState');
    if(infState && settings.gameMode !== 'infection') infState.active = false;
  }catch(e){}
  screen='game';
  if(!isSplitLocalTouch) sfx('count');

  // Broadcast to all connected netplay guests
  if(typeof NET!=='undefined' && NET && NET.role!==null && NET.isHost && NET.conns.size>0){
    const payload={it:match.it, itTeam:match.itTeam, cooldownN:0, matchIndex:matchIndex, currentThemeIdx:currentThemeIdx, lastStartIT:lastStartIT, hunterMode:isHunter, hunterRed:settings.hunterRed, hunterBlue:settings.hunterBlue, hunterRound:match.hunterRound, hunterScores:match.hunterScores, cageT:match.cageT, hunterHistory:hHistory};
    const mapsLen = (typeof MAPS !== 'undefined' && Array.isArray(MAPS) && MAPS.length) ? MAPS.length : 1;
    const mapData = (typeof MAPS !== 'undefined' && Array.isArray(MAPS)) ? MAPS[(settings.map || 0) % mapsLen] : null;
    netBroadcastReliable({t:'start',settings:{map:settings.map,doubleJump:settings.doubleJump,collision:settings.collision,teams:settings.teams,gameMode:settings.gameMode,ctfTargetCaptures:settings.ctfTargetCaptures,hunterRed:settings.hunterRed,hunterBlue:settings.hunterBlue,slotColor:menu.slotColor.slice(),slotTeam:(menu.slotTeam?menu.slotTeam.slice():[])},mapData:mapData,payload:payload});
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

// Attach wiring functions globally and export for test harnesses
const wTargets = [];
if (typeof window !== 'undefined' && wTargets.indexOf(window) < 0) wTargets.push(window);
if (typeof globalThis !== 'undefined' && wTargets.indexOf(globalThis) < 0) wTargets.push(globalThis);
for (let i = 0; i < wTargets.length; i++) {
  const wt = wTargets[i];
  wt.startMatch = startMatch;
  wt.quitToMenu = quitToMenu;
  wt.returnToLobby = returnToLobby;
  wt.refreshModeBindings = refreshModeBindings;
  wt.getModeHook = getModeHook;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startMatch,
    quitToMenu,
    returnToLobby,
    refreshModeBindings,
    getModeHook
  };
}

