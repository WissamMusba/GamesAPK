/* ================= career persistence (retention: wins, tags, streaks, titles) ================= */
const CAREER_KEY = 'tag_career_v1';
function defaultCareer(){ return { m:0, w:0, tags:0, best:0, streak:0, bestStreak:0, titles:0, surv:0, xp:0, trail:0 }; }
function loadCareer(){
  try{
    const raw = localStorage.getItem(CAREER_KEY);
    if(!raw) return defaultCareer();
    const c = JSON.parse(raw), d = defaultCareer();
    for(const k of Object.keys(d)){
      if(typeof c[k] === 'number' && isFinite(c[k]) && c[k] >= 0) d[k] = (k === 'surv') ? Math.round(c[k] * 10) / 10 : Math.floor(c[k]);
    }
    if(!c.xp && (d.m > 0 || d.tags > 0 || d.w > 0)){
      d.xp = d.m * 50 + d.w * 100 + d.tags * 25;
    }
    return d;
  }catch(e){ return defaultCareer(); }
}
function saveCareer(){ try{ localStorage.setItem(CAREER_KEY, JSON.stringify(CAREER)); }catch(e){} }
let CAREER = loadCareer();

/* Cosmetic Unlockable Trails (milestones at Lv 1, 2, 4, 6) */
const COSMETIC_TRAILS = [
  { id: 0, name: 'Speed Sparks', reqLevel: 1, icon: '⚡', color: '#ffd166', desc: 'Default electric sparks' },
  { id: 1, name: 'Neon Ribbon', reqLevel: 2, icon: '✨', color: '#38bdf8', desc: 'Cyan neon ribbon (Lv 2+)' },
  { id: 2, name: 'Hellfire Flames', reqLevel: 4, icon: '🔥', color: '#ff4757', desc: 'Blazing flame embers (Lv 4+)' },
  { id: 3, name: 'Rainbow Comet', reqLevel: 6, icon: '🌈', color: '#a855f7', desc: 'Prismatic comet dust (Lv 6+)' }
];

function getCareerLevel(xp){
  const x = (typeof xp === 'number' && isFinite(xp)) ? xp : (CAREER.xp || 0);
  return Math.floor(Math.sqrt(Math.max(0, x) / 100)) + 1;
}

function getCareerProgress(xp){
  const x = (typeof xp === 'number' && isFinite(xp)) ? xp : (CAREER.xp || 0);
  const lvl = getCareerLevel(x);
  const curLvlXp = (lvl - 1) * (lvl - 1) * 100;
  const nextLvlXp = lvl * lvl * 100;
  const need = nextLvlXp - curLvlXp;
  const prog = Math.max(0, Math.min(need, x - curLvlXp));
  return { level: lvl, cur: prog, need: need, pct: Math.min(1, prog / need) };
}

function isTrailUnlocked(trailId){
  const trail = COSMETIC_TRAILS[trailId];
  if(!trail) return false;
  return getCareerLevel() >= trail.reqLevel;
}

function cycleCosmeticTrail(d){
  const cur = CAREER.trail || 0;
  const dir = d || 1;
  let next = cur;
  for(let step = 1; step <= COSMETIC_TRAILS.length; step++){
    const cand = (cur + step * dir + COSMETIC_TRAILS.length * 10) % COSMETIC_TRAILS.length;
    if(isTrailUnlocked(cand)){
      next = cand;
      break;
    }
  }
  CAREER.trail = next;
  saveCareer();
  toast(COSMETIC_TRAILS[next].icon + ' TRAIL: ' + COSMETIC_TRAILS[next].name.toUpperCase());
  sfx('ui');
}

function myMatchIndex(){
  if(!match || !match.players) return -1;
  if(menu.tab === 'bots') return -1; // bot-vs-bot watch mode: no human career
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const mySlot = isOnline ? NET.mySlot : 0;
  if(mySlot == null || mySlot < 0) return -1;
  return match.players.findIndex(p => p.slot === mySlot);
}

function careerRecordMatch(won, myTags, mySurv){
  CAREER.m++;
  myTags = Math.max(0, myTags | 0);
  CAREER.tags += myTags;
  if(myTags > CAREER.best) CAREER.best = myTags;
  if(mySurv != null && mySurv > CAREER.surv) CAREER.surv = Math.round(mySurv * 10) / 10;
  if(won){ CAREER.w++; CAREER.streak++; if(CAREER.streak > CAREER.bestStreak) CAREER.bestStreak = CAREER.streak; }
  else CAREER.streak = 0;

  // Career XP and Level Progression
  const oldLvl = getCareerLevel(CAREER.xp);
  let gainXp = 50 + (myTags * 25);
  if(won) gainXp += 100;
  if(CAREER.streak > 1) gainXp += Math.min(100, CAREER.streak * 15);
  if(mySurv != null) gainXp += Math.min(100, Math.floor(mySurv * 2));
  try{
    const bonusSlot = (typeof match !== 'undefined' && match && match.result) ? match.result._loneSurvivorBonus : -1;
    const mySlotNow = (typeof NET !== 'undefined' && NET && NET.role !== null) ? NET.mySlot : 0;
    if(won && bonusSlot != null && bonusSlot >= 0 && bonusSlot === mySlotNow){
      gainXp += 250;
    }
  }catch(e){}
  CAREER.xp = (CAREER.xp || 0) + gainXp;

  const newLvl = getCareerLevel(CAREER.xp);
  if(newLvl > oldLvl){
    sfx('win');
    confetti();
    const newTrail = COSMETIC_TRAILS.find(t => t.reqLevel === newLvl);
    if(newTrail){
      CAREER.trail = newTrail.id;
      toast('🎉 LEVEL ' + newLvl + '! UNLOCKED ' + newTrail.icon + ' ' + newTrail.name.toUpperCase() + ' TRAIL!');
    } else {
      toast('🎉 LEVEL UP! REACHED LEVEL ' + newLvl + '!');
    }
  }
  saveCareer();
}

function careerLine(){
  if(!CAREER) return '';
  const lvl = getCareerLevel(CAREER.xp);
  const prog = getCareerProgress(CAREER.xp);
  let s = '⭐ LVL ' + lvl + ' (' + prog.cur + '/' + prog.need + ' XP)';
  if(CAREER.m > 0){
    s += ' • 🏆 ' + CAREER.w + 'W/' + CAREER.m + ' • 🏷️ ' + CAREER.tags + ' tags';
    if(CAREER.streak >= 2) s += ' • 🔥 x' + CAREER.streak;
  }
  return s;
}

function endMatch(){
  try{CG.happytime();}catch(e){}try{CG.gameplayStop();}catch(e){}
  match.state='result';
  match.hostMenu=false;
  if(settings.gameMode === 'infection'){
    if(!match.result || match.result.winningTeam == null){
      const livingSurvivors = match.players.filter(p => !p.isInfected && !p.isEliminated);
      match.result = {
        winningTeam: livingSurvivors.length > 0 ? 'survivors' : 'zombies',
        mode: 'infection',
        reason: livingSurvivors.length > 0 ? 'survived' : 'all_infected',
        survivors: livingSurvivors.map(p => p.slot)
      };
    }
  } else if(settings.gameMode === 'bomb'){
    if(!match.result || match.result.winner == null){
      const alive = match.players.filter(p => !p.isEliminated);
      const wIdx = alive.length > 0 ? match.players.indexOf(alive[0]) : 0;
      match.result = {
        winner: wIdx,
        loser: (typeof BOMB_MODE !== 'undefined' && BOMB_MODE) ? BOMB_MODE.carrierIdx : -1,
        mode: 'bomb'
      };
    }
  } else if(settings.gameMode === 'crown'){
    if(!match.result || match.result.winner == null){
      let bestP = 0, bestScore = -1;
      if(typeof crownState !== 'undefined' && crownState.scores){
        for(let si = 0; si < match.players.length; si++){
          const sc = crownState.scores[match.players[si].slot] || 0;
          if(sc > bestScore){ bestScore = sc; bestP = si; }
        }
      }
      match.result = {
        winner: bestP,
        mode: 'crown',
        score: bestScore
      };
      if(typeof crownState !== 'undefined' && crownState){
        crownState.floaters = [];
        crownState.banners = [];
        crownState.shockwaves = [];
      }
    }
  } else if(settings.gameMode === 'ctf'){
    if(!match.result || match.result.winningTeam == null){
      const redCaps = (typeof ctfState !== 'undefined' && ctfState) ? ctfState.scores[0] : 0;
      const blueCaps = (typeof ctfState !== 'undefined' && ctfState) ? ctfState.scores[1] : 0;
      let winTeam = -1;
      if(redCaps > blueCaps) winTeam = 0;
      else if(blueCaps > redCaps) winTeam = 1;
      else winTeam = -1;
      match.result = {
        winningTeam: winTeam,
        mode: 'ctf',
        scores: [redCaps, blueCaps],
        reason: winTeam === -1 ? 'draw' : 'score'
      };
      if(typeof ctfState !== 'undefined' && ctfState){
        ctfState.floaters = [];
        ctfState.banners = [];
        ctfState.shockwaves = [];
      }
    }
  } else if(settings.gameMode === 'freeze'){
    if(!match.result || match.result.winningTeam == null){
      // Timer expired in Freeze Tag: runners win!
      const hunterTeam = match.itTeam != null ? match.itTeam : 0;
      const runnerTeam = (hunterTeam === 0 ? 1 : 0);
      match.result = { winningTeam: runnerTeam, mode: 'freeze', reason: 'survived' };
    }
  } else if(settings.teams && match.teamItTime){
    // Team with the lowest total IT time wins!
    const activeTeams = Array.from(new Set(match.players.map(p => p.team)));
    let bestTeam = activeTeams[0] || 0;
    let minTime = match.teamItTime[bestTeam] || 0;
    for(const tm of activeTeams){
      const tmTime = match.teamItTime[tm] || 0;
      if(tmTime < minTime){
        minTime = tmTime;
        bestTeam = tm;
      }
    }
    match.result={winningTeam: bestTeam, teamItTime: match.teamItTime.slice()};
  } else {
    match.result={loser:match.it};
  }
  // Career persistence (this device: P1 offline, my slot online; spectators skipped)
  try{
    const mi = myMatchIndex();
    if(mi >= 0){
      const myTags = (match.tags[mi] != null) ? match.tags[mi] : 0;
      let won = false;
      if(settings.gameMode === 'infection'){
        const mp = match.players[mi];
        won = match.result && match.result.winningTeam === 'survivors' ? (!mp.isInfected) : (!!mp.isInfected);
      } else if(settings.gameMode === 'bomb' || settings.gameMode === 'crown'){
        won = (match.result && mi === match.result.winner);
      } else if(match.result.winningTeam != null){
        const mp = match.players[mi];
        won = !!mp && mp.team === match.result.winningTeam;
      } else {
        won = (mi !== match.result.loser);
      }
      careerRecordMatch(won, myTags, null);
    }
  }catch(e){}
  match.resultT=0;
  confetti();
  sfx('win');
  if(!match._telemetrySent){
    try{ telemetryTrackMatchEnded(); }catch(e){}
    try{ telemetrySendSessionPing('match_end'); }catch(e){}
  }
  if(typeof NET!=='undefined' && NET && NET.isHost && NET.midgameJoiner){
    netToast('New player joined — returning to lobby!');
  }
}

