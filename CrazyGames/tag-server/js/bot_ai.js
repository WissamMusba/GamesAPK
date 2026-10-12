/* ================= PLATFORM TRAINING HARNESS & BOT MIMICRY ENGINE ================= */
const HARNESS = {
  active: false,
  mode: 'record',      // 'record' | 'playback'
  map: 0,
  nodes: [],
  mirrorMap: new Map(),
  cases: [],
  ci: 0,
  t: 0,
  par: 5.0,
  holdT: 0,
  started: false,
  startX: 0,
  startY: 0,
  startVx: 0,
  trace: [],
  stagedSample: null,  // Holds completed jump waiting for user KEEP [K] or DISCARD [D]
  transitions: {},     // mapIdx -> { "from->to": sample }
  playbackT: 0,
  playbackStep: 0,
  done: 0,
  okN: 0
};
const DEMO = HARNESS; // alias for legacy hooks

function harnessLoadStored(){
  try{
    const raw = localStorage.getItem('tag_jump_policy_v1');
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object') HARNESS.transitions = parsed;
    }
  }catch(e){}
}
harnessLoadStored();

function harnessSaveStored(){
  try{
    localStorage.setItem('tag_jump_policy_v1', JSON.stringify(HARNESS.transitions));
  }catch(e){}
}

function harnessBuildCases(mapIdx){
  HARNESS.map = mapIdx;
  HARNESS.nodes = [];
  // 1. Extract valid platform surfaces (exclude floor wall and narrow vertical pillars)
  for(let i = 1; i < SOLIDS.length; i++){
    const s = SOLIDS[i];
    if(s.wall && s.y !== H - WALL) continue;
    if(s.w < 50 && s.h > s.w * 1.5) continue;
    HARNESS.nodes.push(s);
  }

  // 2. Identify symmetric pairs across arena midline (W = 2400)
  HARNESS.mirrorMap.clear();
  for(let i = 0; i < HARNESS.nodes.length; i++){
    const a = HARNESS.nodes[i];
    const aMid = a.x + a.w / 2;
    for(let j = 0; j < HARNESS.nodes.length; j++){
      const b = HARNESS.nodes[j];
      const bMid = b.x + b.w / 2;
      if(Math.abs(bMid - (W - aMid)) < 30 && Math.abs(b.y - a.y) < 16){
        HARNESS.mirrorMap.set(i, j);
        break;
      }
    }
  }

  // 3. Generate candidate pairs with STRICT SKILL PRUNING:
  // Removes all trivial downward drops, flat walk-overs, and baby hops
  const cases = [];
  const visitedCanonical = new Set();

  for(let i = 0; i < HARNESS.nodes.length; i++){
    const A = HARNESS.nodes[i];
    for(let j = 0; j < HARNESS.nodes.length; j++){
      if(i === j) continue;
      const B = HARNESS.nodes[j];
      const dy = B.y - A.y;
      const gap = Math.max(0, B.x - (A.x + A.w), A.x - (B.x + B.w));
      const dx = Math.abs((B.x + B.w / 2) - (A.x + A.w / 2));
      const maxRise = (A.t === 'boost') ? 690 : 510;

      // Filter 1: Reach limits
      if(dy < -maxRise || dx > 850) continue;

      // Filter 2: Prune ALL downward drops (dy > 40) - greedy bot/gravity handles drops easily
      if(dy > 40) continue;

      // Filter 3: Prune flat/near-flat step-overs and small hops (|dy| <= 40, gap < 180)
      if(Math.abs(dy) <= 40 && gap < 180) continue;

      // Filter 4: Prune low upward hops with small gap (-75 <= dy <= 0, gap < 140)
      if(dy <= 0 && dy >= -75 && gap < 140) continue;

      // Filter 5: Overly distant horizontal reach on normal platform without speed boost
      if(A.t !== 'speed' && A.t !== 'boost' && gap > 560) continue;

      // Filter 6: Prune bilateral symmetric duplicates
      const mI = HARNESS.mirrorMap.get(i), mJ = HARNESS.mirrorMap.get(j);
      if(mI !== undefined && mJ !== undefined){
        const canonicalKey = (mI < i || (mI === i && mJ < j)) ? (mI + '->' + mJ) : (i + '->' + j);
        if(visitedCanonical.has(canonicalKey)) continue;
        visitedCanonical.add(canonicalKey);
      }

      const parT = Math.max(2.8, 1.2 + dx / 380 + Math.abs(dy) / 280);
      cases.push({ from: i, to: j, dx, dy, gap, par: parT });
    }
  }
  HARNESS.cases = cases;
  HARNESS.ci = 0;
  HARNESS.stagedSample = null;
}

function harnessCurCase(){
  if(!HARNESS.cases.length) return null;
  return HARNESS.cases[HARNESS.ci % HARNESS.cases.length];
}

function harnessResetTrial(){
  const c = harnessCurCase();
  if(!c || !match || !match.players || !match.players.length) return;
  const A = HARNESS.nodes[c.from], B = HARNESS.nodes[c.to];
  const p0 = match.players[0];
  const curKey = c.from + '->' + c.to;
  const mapKey = 'map' + HARNESS.map;
  const savedSample = HARNESS.transitions[mapKey] && HARNESS.transitions[mapKey][curKey];
  const activeSample = HARNESS.stagedSample || savedSample;

  if(HARNESS.mode === 'record'){
    // Player 0 spawns on Platform A
    p0.x = clamp(A.x + A.w / 2 - p0.w / 2, A.x + 8, A.x + A.w - p0.w - 8);
    p0.y = (A.dy ? A.y + (p0.x - A.x) * (A.dy / A.w) : A.y) - p0.h - 4;
    p0.vx = 0; p0.vy = 0; p0.airJumps = 1;
    p0.grounded = true; p0.gp = A;
  } else {
    // Playback mode: Player 0 stands on Target B, Bot (P1) spawns at exact recorded launch origin on Platform A
    p0.x = clamp(B.x + B.w / 2 - p0.w / 2, B.x + 8, B.x + B.w - p0.w - 8);
    p0.y = (B.dy ? B.y + (p0.x - B.x) * (B.dy / B.w) : B.y) - p0.h - 4;
    p0.vx = 0; p0.vy = 0; p0.grounded = true; p0.gp = B;

    if(match.players.length > 1){
      const p1 = match.players[1];
      const spawnX = activeSample ? activeSample.startX : clamp(A.x + A.w / 2 - p1.w / 2, A.x + 8, A.x + A.w - p1.w - 8);
      const spawnY = activeSample ? activeSample.startY : ((A.dy ? A.y + (spawnX - A.x) * (A.dy / A.w) : A.y) - p1.h - 4);
      p1.x = spawnX;
      p1.y = spawnY;
      p1.vx = activeSample ? (activeSample.startVx || 0) : 0;
      p1.vy = 0;
      p1.airJumps = 1;
      p1.grounded = true;
      p1.gp = A;
      p1._pbStepIdx = 0;
    }
  }

  HARNESS.t = 0;
  HARNESS.holdT = 0;
  HARNESS.started = false;
  HARNESS.trace = [];
  HARNESS.playbackT = 0;
  HARNESS.playbackStep = 0;
}

function harnessStart(mapIdx){
  if(mapIdx === undefined) mapIdx = settings.map || 0;
  settings.map = ((mapIdx % MAPS.length) + MAPS.length) % MAPS.length;
  buildLevel();
  HARNESS.active = true;
  HARNESS.mode = 'record';
  harnessBuildCases(settings.map);

  menu.botOn = true;
  menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  startMatch();
  match.state = 'playing';
  match.cooldown = 0;
  match.it = 0;
  match.timer = 9999;
  harnessResetTrial();
  toast('🎯 HARNESS: Jump to glowing platform! [T] Test Bot [K] Keep [D] Discard [E] Restart');
}

function harnessFeetOn(p, s){
  if(!p || !s) return false;
  const feet = p.y + p.h;
  const sTop = s.dy ? s.y + (clamp(p.x + p.w / 2, s.x, s.x + s.w) - s.x) * (s.dy / s.w) : s.y;
  const onX = (p.x + p.w > s.x + 4) && (p.x < s.x + s.w - 4);
  const onY = (feet >= sTop - 6) && (feet <= sTop + 24);
  return onX && onY && (p.grounded || Math.abs(p.vy) < 80);
}

function harnessStageRecordedSample(){
  const c = harnessCurCase();
  if(!c || !HARNESS.trace.length) return;
  const key = c.from + '->' + c.to;

  const launchStep = HARNESS.trace.find(s => s.je) || HARNESS.trace[0];
  const djStep = HARNESS.trace.find((s, idx) => idx > 0 && s.je);

  HARNESS.stagedSample = {
    key: key,
    from: c.from,
    to: c.to,
    map: HARNESS.map,
    time: +HARNESS.t.toFixed(2),
    startX: HARNESS.startX || HARNESS.trace[0].x,
    startY: HARNESS.startY || HARNESS.trace[0].y,
    startVx: HARNESS.startVx || HARNESS.trace[0].vx,
    launchX: launchStep ? launchStep.x : 0,
    hasDoubleJump: !!djStep,
    doubleJumpDelay: djStep ? +(djStep.t - (launchStep ? launchStep.t : 0)).toFixed(2) : 0,
    trace: HARNESS.trace.map(s => ({
      t: +s.t.toFixed(3),
      x: s.x, y: s.y,
      vx: s.vx, vy: s.vy,
      d: s.d, je: s.je, jh: s.jh, dn: s.dn
    }))
  };
}

function harnessCommitStagedSample(){
  const sample = HARNESS.stagedSample;
  if(!sample) return false;
  const mapKey = 'map' + HARNESS.map;
  if(!HARNESS.transitions[mapKey]) HARNESS.transitions[mapKey] = {};
  HARNESS.transitions[mapKey][sample.key] = sample;

  // Auto-mirror if bilateral symmetry exists
  const mFrom = HARNESS.mirrorMap.get(sample.from), mTo = HARNESS.mirrorMap.get(sample.to);
  if(mFrom !== undefined && mTo !== undefined){
    const mirrorKey = mFrom + '->' + mTo;
    const mirroredSample = {
      key: mirrorKey,
      from: mFrom,
      to: mTo,
      map: HARNESS.map,
      time: sample.time,
      startX: Math.round(W - sample.startX - 46),
      startY: sample.startY,
      startVx: -sample.startVx,
      launchX: Math.round(W - sample.launchX - 46),
      hasDoubleJump: sample.hasDoubleJump,
      doubleJumpDelay: sample.doubleJumpDelay,
      trace: sample.trace.map(s => ({
        t: s.t,
        x: Math.round(W - s.x - 46),
        y: s.y,
        vx: -s.vx,
        vy: s.vy,
        d: -s.d,
        je: s.je,
        jh: s.jh,
        dn: s.dn
      }))
    };
    HARNESS.transitions[mapKey][mirrorKey] = mirroredSample;
  }

  harnessSaveStored();
  HARNESS.stagedSample = null;
  HARNESS.done++;
  HARNESS.okN++;
  return true;
}

function harnessDiscardCurrent(andRetry){
  const c = harnessCurCase();
  if(!c) return;
  const key = c.from + '->' + c.to;
  const mapKey = 'map' + HARNESS.map;
  let discardedSomething = false;

  if(HARNESS.stagedSample){
    HARNESS.stagedSample = null;
    discardedSomething = true;
  }

  if(HARNESS.transitions[mapKey] && HARNESS.transitions[mapKey][key]){
    delete HARNESS.transitions[mapKey][key];
    const mFrom = HARNESS.mirrorMap.get(c.from), mTo = HARNESS.mirrorMap.get(c.to);
    if(mFrom !== undefined && mTo !== undefined){
      const mirrorKey = mFrom + '->' + mTo;
      if(HARNESS.transitions[mapKey][mirrorKey]) delete HARNESS.transitions[mapKey][mirrorKey];
    }
    harnessSaveStored();
    discardedSomething = true;
  }

  if(HARNESS.mode === 'playback' || andRetry){
    HARNESS.mode = 'record';
  }

  harnessResetTrial();
  sfx('back');

  if(andRetry){
    toast('🔄 REMOVED & RETRYING — Jump when ready!');
  } else if(discardedSomething){
    toast('🗑️ CASE DATA REMOVED (Back to Record Mode)');
  } else {
    toast('🔄 RESET (No saved data on this case)');
  }
}

function harnessExportJSON(){
  try{
    const mapKey = 'map' + HARNESS.map;
    const data = {
      game: 'tag-arena',
      map: HARNESS.map,
      mapName: MAPS[HARNESS.map].name,
      transitions: HARNESS.transitions[mapKey] || {}
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tag_jump_policy_map' + HARNESS.map + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} }, 800);
    toast('💾 Saved policy for ' + MAPS[HARNESS.map].name);
  }catch(e){
    toast('Error saving JSON');
  }
}

function harnessToggleBotTest(){
  const c = harnessCurCase();
  if(!c) return;
  const key = c.from + '->' + c.to;
  const mapKey = 'map' + HARNESS.map;
  const savedSample = HARNESS.transitions[mapKey] && HARNESS.transitions[mapKey][key];
  const activeSample = HARNESS.stagedSample || savedSample;

  if(HARNESS.mode === 'record'){
    if(!activeSample){
      toast('⚠️ Jump successfully first (or choose a saved case) to test bot!');
      sfx('back');
      return;
    }
    HARNESS.mode = 'playback';
    harnessResetTrial();
    toast('🤖 BOT TEST MODE: Watch bot jump at you! [E] Restart [K] Keep [D] Remove [R] Remove & Retry');
    sfx('go');
  } else {
    HARNESS.mode = 'record';
    harnessResetTrial();
    toast('🏃 RECORD MODE: Jump to glowing platform');
    sfx('ui');
  }
}

function harnessTick(dt){
  if(!HARNESS.active || !match || screen !== 'game') return;
  match.timer = 9999; match.lastTick = 9999;
  if(match.state === 'paused') return;

  const pl = match.players[0];
  if(!pl) return;

  // Key controls:
  // E: Quick restart
  if(pressed.has('KeyE')){
    harnessResetTrial();
    sfx('back');
    toast('🔄 TRIAL RESTARTED (E)');
    return;
  }
  // T: Toggle bot test mode
  if(pressed.has('KeyT')){
    harnessToggleBotTest();
    return;
  }
  // K or Enter: Keep / Save
  if(pressed.has('KeyK') || pressed.has('Enter')){
    if(HARNESS.stagedSample){
      harnessCommitStagedSample();
      sfx('go');
      toast('✅ JUMP SAVED & APPROVED! Moving to next case...');
      HARNESS.ci = (HARNESS.ci + 1) % HARNESS.cases.length;
      HARNESS.mode = 'record';
      harnessResetTrial();
      return;
    } else {
      const c = harnessCurCase();
      const key = c ? (c.from + '->' + c.to) : '';
      const mapKey = 'map' + HARNESS.map;
      if(HARNESS.transitions[mapKey] && HARNESS.transitions[mapKey][key]){
        toast('✅ Case already saved! Moving to next case...');
        HARNESS.ci = (HARNESS.ci + 1) % HARNESS.cases.length;
        HARNESS.mode = 'record';
        harnessResetTrial();
        return;
      } else {
        toast('⚠️ Complete a jump first before keeping!');
      }
    }
  }
  // R: Remove & Retry immediately in one button press
  if(pressed.has('KeyR')){
    harnessDiscardCurrent(true);
    return;
  }
  // D / Delete / Backspace: Discard / Remove
  if(pressed.has('KeyD') || pressed.has('Backspace') || pressed.has('Delete')){
    harnessDiscardCurrent(false);
    return;
  }
  // Browse cases: [ / P / ArrowLeft for Previous
  if(pressed.has('BracketLeft') || pressed.has('KeyP') || (HARNESS.mode === 'playback' && pressed.has('ArrowLeft'))){
    HARNESS.ci = (HARNESS.ci - 1 + HARNESS.cases.length) % HARNESS.cases.length;
    HARNESS.stagedSample = null;
    harnessResetTrial();
    toast('◀ PREVIOUS CASE (' + (HARNESS.ci + 1) + '/' + HARNESS.cases.length + ')');
    return;
  }
  // Browse cases: ] / N / ArrowRight for Next
  if(pressed.has('BracketRight') || pressed.has('KeyN') || (HARNESS.mode === 'playback' && pressed.has('ArrowRight'))){
    HARNESS.ci = (HARNESS.ci + 1) % HARNESS.cases.length;
    HARNESS.stagedSample = null;
    harnessResetTrial();
    toast('▶ NEXT CASE (' + (HARNESS.ci + 1) + '/' + HARNESS.cases.length + ')');
    return;
  }
  // Z: Save / Export
  if(pressed.has('KeyZ')){
    harnessExportJSON();
    return;
  }

  // Switch map with number keys 1-9, 0
  for(let k = 1; k <= 9; k++){
    if(pressed.has('Digit' + k)){
      harnessStart(k - 1);
      return;
    }
  }
  if(pressed.has('Digit0')){
    harnessStart(9);
    return;
  }

  const c = harnessCurCase();
  if(!c) return;
  const A = HARNESS.nodes[c.from], tgt = HARNESS.nodes[c.to];

  if(HARNESS.mode === 'record'){
    if(!HARNESS.started){
      if(keys.has('KeyA') || keys.has('KeyD') || keys.has('KeyW') || keys.has('Space') ||
         keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('ArrowUp')){
        HARNESS.started = true;
        HARNESS.startX = Math.round(pl.x);
        HARNESS.startY = Math.round(pl.y);
        HARNESS.startVx = Math.round(pl.vx);
        HARNESS.t = 0;
      } else {
        return;
      }
    }

    HARNESS.t += dt;

    // Check invalid landing: touched arena floor or unintended platform before target
    if(pl.grounded && pl.gp && pl.gp !== A && pl.gp !== tgt){
      toast('❌ TOUCHED OTHER FLOOR — [E] TO RETRY');
      sfx('back');
      harnessResetTrial();
      return;
    }

    if(harnessFeetOn(pl, tgt)){
      HARNESS.holdT += dt;
      if(HARNESS.holdT >= 0.20 && !HARNESS.stagedSample){
        harnessStageRecordedSample();
        sfx('ok');
        toast('🎯 JUMP RECORDED! [T] Test Bot | [K] Keep & Save | [D] Discard');
      }
    } else {
      if(!HARNESS.stagedSample) HARNESS.holdT = 0;
    }

    if(HARNESS.t >= c.par && !HARNESS.stagedSample){
      toast('⏰ TIME OVER PAR (' + c.par.toFixed(1) + 's) — [E] TO RETRY');
      sfx('back');
      harnessResetTrial();
      return;
    }
  } else {
    // Playback mode:
    HARNESS.playbackT += dt;
    const botP = match.players[1];
    if(botP && harnessFeetOn(botP, tgt)){
      HARNESS.holdT += dt;
      if(HARNESS.holdT >= 0.4){
        sfx('go');
        toast('🎯 BOT REACHED YOU CLEANLY! [K] Keep & Save | [D] Discard | [E] Retry');
        HARNESS.holdT = 0;
      }
    }
  }
}

function harnessPushTrace(p, inp){
  if(!HARNESS.active || HARNESS.mode !== 'record' || !HARNESS.started || p.slot !== 0) return;
  if(HARNESS.stagedSample) return; // Stop recording once landed cleanly
  HARNESS.trace.push({
    t: +HARNESS.t.toFixed(3),
    x: Math.round(p.x),
    y: Math.round(p.y),
    vx: Math.round(p.vx),
    vy: Math.round(p.vy),
    d: inp.dir,
    je: inp.jumpEdge ? 1 : 0,
    jh: inp.jumpHeld ? 1 : 0,
    dn: inp.downHeld ? 1 : 0,
    g: p.grounded ? 1 : 0
  });
}

function harnessBotPlaybackInput(p, dt){
  const c = harnessCurCase();
  if(!c) return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
  const key = c.from + '->' + c.to;
  const mapKey = 'map' + HARNESS.map;
  const sample = HARNESS.stagedSample || (HARNESS.transitions[mapKey] && HARNESS.transitions[mapKey][key]);
  if(!sample || !sample.trace || !sample.trace.length){
    return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
  }

  const curT = HARNESS.playbackT;
  if(!p._pbStepIdx) p._pbStepIdx = 0;

  let jumpEdge = false;
  let step = sample.trace[Math.min(p._pbStepIdx, sample.trace.length - 1)];

  // Scan all trace samples up to current playback time so jump edges are NEVER missed
  while(p._pbStepIdx < sample.trace.length && sample.trace[p._pbStepIdx].t <= curT){
    const s = sample.trace[p._pbStepIdx];
    if(s.je === 1) jumpEdge = true;
    step = s;
    p._pbStepIdx++;
  }

  // Trajectory stabilization: nudge ground velocity toward recorded velocity to eliminate frame rate drift
  if(p.grounded && Math.abs(p.x - step.x) > 3){
    p.vx += clamp((step.x - p.x) * 4, -50, 50);
  }

  return {
    dir: step.d,
    jumpEdge: jumpEdge,
    jumpHeld: !!step.jh,
    downHeld: !!step.dn
  };
}

function harnessOverlay(){
  if(!HARNESS.active || !match || screen !== 'game') return;
  const c = harnessCurCase();
  if(!c) return;
  const A = HARNESS.nodes[c.from], B = HARNESS.nodes[c.to];

  // Draw glowing box on target platform B
  const bx = (B.x + B.w / 2 - cam.x) * cam.s + CW / 2;
  const by = (B.y + (B.dy ? B.dy / 2 : B.h / 2) - cam.y) * cam.s + CH / 2;
  const bw = B.w * cam.s + 18, bh = 46 * cam.s + 18;
  const pulse = 0.6 + 0.4 * Math.sin(tGlobal * 6);

  g.save();
  g.globalAlpha = 0.4 + 0.4 * pulse;
  g.strokeStyle = '#2ecc71';
  g.lineWidth = 4;
  rr(g, bx - bw / 2, by - bh / 2, bw, bh, 10);
  g.stroke();
  g.restore();

  // Floating chevron above target
  ptxt('▼', bx, by - bh / 2 - 20 - Math.abs(Math.sin(tGlobal * 5)) * 10, FN(22, 900), '#2ecc71');

  // Case Status
  const key = c.from + '->' + c.to;
  const mapKey = 'map' + HARNESS.map;
  const isSaved = !!(HARNESS.transitions[mapKey] && HARNESS.transitions[mapKey][key]);
  const isStaged = !!HARNESS.stagedSample;

  const statusText = isStaged ? '🟡 RECORDED (Ready to Test/Save)' : (isSaved ? '✅ SAVED & APPROVED' : '⭕ UNRECORDED');
  const statusCol = isStaged ? '#f5d76e' : (isSaved ? '#2ecc71' : '#bdc3c7');

  const mapName = MAPS[HARNESS.map] ? MAPS[HARNESS.map].name : 'MAP ' + HARNESS.map;
  const modeTag = HARNESS.mode === 'playback' ? '🤖 BOT TEST MODE' : '🏃 RECORDING';

  ptxt(mapName + ' • CASE ' + (HARNESS.ci + 1) + '/' + HARNESS.cases.length + ' • ' + modeTag, CW / 2, 30, FT(20), '#ffffff');
  ptxt('STATUS: ' + statusText + '  |  Rise: ' + (-c.dy) + 'px  Gap: ' + c.gap + 'px', CW / 2, 54, FN(14, 800), statusCol);

  if(HARNESS.mode === 'record'){
    if(isStaged){
      ptxt('🎯 JUMP RECORDED! [T] Test Bot  |  [K] Keep & Save  |  [D] Remove  |  [R] Remove & Retry', CW / 2, 78, FN(15, 900), '#2ecc71');
    } else {
      const timeCol = HARNESS.t > c.par * 0.75 ? '#ff4757' : '#2ed573';
      ptxt(HARNESS.started ? HARNESS.t.toFixed(1) + 's / ' + c.par.toFixed(1) + 's par' : 'PRESS WASD / ARROWS TO START JUMP', CW / 2, 78, FN(15, 800), timeCol);
    }
  } else {
    ptxt('WATCHING BOT REPLAY! [K] Keep & Save  |  [D] Remove  |  [R] Remove & Retry  |  [E] Re-run Bot', CW / 2, 78, FN(15, 900), '#38ef7d');
  }

  // Bottom action bar
  ptxt('[T] TEST BOT   [K] KEEP & SAVE   [D] REMOVE   [R] REMOVE & RETRY   [E] RESTART   [←/→] BROWSE', CW / 2, CH - 22, FN(12, 800), 'rgba(255,255,255,0.92)');
}

function demoOverlay(){ harnessOverlay(); }
window.HARNESS = HARNESS;
window.harnessStart = harnessStart;
var screen = (typeof globalThis !== 'undefined' && typeof globalThis.screen === 'string') ? globalThis.screen : 'menu', tGlobal = (typeof globalThis !== 'undefined' && typeof globalThis.tGlobal === 'number') ? globalThis.tGlobal : 0;
const menu = ((typeof globalThis !== 'undefined' && globalThis.menu) || (typeof window !== 'undefined' && window.menu)) ? ((typeof globalThis !== 'undefined' && globalThis.menu) || window.menu) : {tab:'solo',mode:'rows',slotColor:[0,1,-1,-1,-1,-1,-1,-1,-1,-1],slotTeam:[0,1,0,1,0,1,0,1,0,1],slotCtrl:[0,1,2,3,0,1,2,3,0,1],row:4,rule:0,toast:null,toastT:0,botOn:false,botDifficulty:'hard',slotBotDiff:['hard','hard','hard','hard','hard','hard','hard','hard','hard','hard'],mapModal:false,onlineModal:false,slotIsBot:[false,false,false,false,false,false,false,false,false,false],botSlots:null};
if(typeof window !== 'undefined') window.menu = menu;
if(typeof globalThis !== 'undefined') globalThis.menu = menu;
function isSlotBot(slotIdx){
  if(menu.tab === 'solo') return slotIdx === 1;
  if(menu.tab === 'bots') return slotIdx === 0 || slotIdx === 1;
  if(typeof NET !== 'undefined' && NET && NET.role !== null){
    if(NET.botSlots && NET.botSlots.includes(slotIdx)) return true;
    return false;
  }
  if(menu.botSlots){
    if(Array.isArray(menu.botSlots)) return menu.botSlots.includes(slotIdx);
    if(menu.botSlots.has) return menu.botSlots.has(slotIdx);
  }
  if(menu.slotIsBot && menu.slotIsBot[slotIdx] !== undefined) return !!menu.slotIsBot[slotIdx];
  return false;
}
const ROWS=['CHANGE PLAYERS','MAP','TIMER','RULES','START'];
const RULE_NAMES=['DOUBLE JUMP'];
function toast(m){menu.toast=m;menu.toastT=2.2;}

function getSlotBotDiff(slot){
  if(menu.slotBotDiff && menu.slotBotDiff[slot]) return menu.slotBotDiff[slot];
  return menu.botDifficulty || 'hard';
}
function toggleSlotBotDiff(slot){
  if(!menu.slotBotDiff) menu.slotBotDiff = ['hard','hard','hard','hard','hard','hard','hard','hard','hard','hard'];
  const cur = getSlotBotDiff(slot);
  const next = (cur === 'easy') ? 'hard' : 'easy';
  menu.slotBotDiff[slot] = next;
  sfx('ok');
  toast('🤖 BOT ' + (slot+1) + ': ' + next.toUpperCase() + (next === 'hard' ? ' 🔥 (SMART)' : ' 🌱 (RELAXED)'));
}

function setBotDifficulty(diff){
  if(diff !== 'easy' && diff !== 'hard') diff = 'hard';
  menu.botDifficulty = diff;
  settings.botDifficulty = diff;
  if(!menu.slotBotDiff) menu.slotBotDiff = ['hard','hard','hard','hard','hard','hard','hard','hard','hard','hard'];
  for(let i=0; i<MAXP; i++) menu.slotBotDiff[i] = diff;
  toast('ALL BOTS DIFFICULTY: ' + diff.toUpperCase() + (diff === 'hard' ? ' (DEFAULT)' : ''));
  sfx('ok');
}
function toggleBotDifficulty(){
  setBotDifficulty(menu.botDifficulty === 'easy' ? 'hard' : 'easy');
}

function setMenuTab(tab){
  if(tab !== 'solo' && tab !== '2p' && tab !== 'online' && tab !== 'bots') tab = '2p';
  menu.tab = tab;
  const validModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
  const curMode = (settings.gameMode && validModes.indexOf(settings.gameMode) >= 0) ? settings.gameMode : 'party';
  if(tab === 'solo'){
    menu.botOn = true;
    settings.gameMode = curMode;
    menu.gameMode = curMode;
    settings.teams = (curMode === 'ctf');
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  } else if(tab === 'bots'){
    menu.botOn = true;
    settings.gameMode = curMode;
    menu.gameMode = curMode;
    settings.teams = (curMode === 'ctf');
    menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  } else if(tab === '2p'){
    menu.botOn = false;
    menu.slotIsBot = [false, false, false, false, false, false, false, false, false, false];
    if(menu.slotColor[0] < 0) menu.slotColor[0] = 0;
    if(menu.slotColor[1] < 0) menu.slotColor[1] = 1;
    ensureUniqueLocalColors();
  } else if(tab === 'online'){
    menu.botOn = false;
    if(typeof netRefreshPublicRooms === 'function') netRefreshPublicRooms();
  }
  ensureUniqueLocalColors();
  sfx('ui');
}
function ensureUniqueLocalColors(){
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const max = isOnline ? MAXP : 4;
  const taken = new Set();
  for(let i = 0; i < max; i++){
    if(menu.slotColor[i] < 0) continue;
    let col = menu.slotColor[i];
    if(taken.has(col) || col >= PALETTE.length){
      // Reassign to first untaken color in PALETTE
      for(let p = 0; p < PALETTE.length; p++){
        if(!taken.has(p)){
          menu.slotColor[i] = p;
          col = p;
          break;
        }
      }
    }
    taken.add(col);
  }
}
function activeSlots(){
  const max = (typeof NET !== 'undefined' && NET && NET.role !== null) ? MAXP : 4;
  const r = [];
  for(let i = 0; i < max; i++){
    if(menu.slotColor[i] >= 0) r.push(i);
  }
  return r;
}
function cycleTeam(i, d){
  if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost && NET.teamsLocked){
    toast('TEAMS ARE LOCKED BY THE HOST');
    sfx('back');
    return;
  }
  if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  const curTeam = (menu.slotTeam[i] || 0) % TEAMS.length;
  const targetTeam = (curTeam + d + TEAMS.length) % TEAMS.length;

  menu.slotTeam[i] = targetTeam;
  sfx('ui');
  if(settings.gameMode === 'hunter') updateElectedHuntersFromVotes();
  if(typeof NET !== 'undefined' && NET && NET.role !== null){
    if(NET.isHost) netBroadcastRoster();
    else {
      for(const pair of NET.conns.values()){
        netSendRel(pair, { t: 'team', slot: i, team: menu.slotTeam[i] });
      }
    }
  }
}

// First free player slot (1..9) from my current roster view
function firstFreeSlot(){
  for(let s = 1; s < MAXP; s++){
    const takenHost = (typeof NET !== 'undefined' && NET && NET.isHost && NET.hostInputs) ? NET.hostInputs.has(s) : false;
    if(!takenHost && menu.slotColor[s] === -1) return s;
  }
  return -1;
}

// Tap-a-team-panel = join THAT team (first free slot). Returns true if handled.
function joinTeamFromPanel(teamIdx){
  const teamName = teamIdx === 0 ? 'RED' : 'BLUE';
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  if(!isOnline){
    // Local setup: activate the first free slot straight into this team
    const free = firstFreeSlot();
    if(free < 0){ toast('No free slots!'); sfx('back'); return true; }
    const taken = menu.slotColor.filter(v => v >= 0);
    let pick = -1;
    for(let pi = 0; pi < PALETTE.length; pi++){ if(!taken.includes(pi)){ pick = pi; break; } }
    menu.slotColor[free] = (pick >= 0 ? pick : free % PALETTE.length);
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    menu.slotTeam[free] = teamIdx;
    if(settings.gameMode === 'hunter'){ validateHunterRoles(); }
    sfx('ok');
    toast('P' + (free + 1) + ' joined ' + teamName + '!');
    return true;
  }
  if(NET.mySlot >= 0){
    // Already playing: move MY slot to the tapped team (balance-guarded)
    setPlayerTeam(NET.mySlot, teamIdx);
    return true;
  }
  // Spectator: claim the first free slot FOR the tapped team
  if(NET.lobbyLocked){ netToast('Lobby is locked by the host.'); return true; }
  const free = firstFreeSlot();
  if(free < 0){ netToast('All player slots are full!'); return true; }
  netClaimSlot(free, teamIdx);
  return true;
}
// Same lock + hunter-balance rules as cycleTeam.
function setPlayerTeam(i, teamIdx){
  if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost && NET.teamsLocked){
    toast('TEAMS ARE LOCKED BY THE HOST');
    sfx('back');
    return;
  }
  if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  const targetTeam = ((teamIdx % TEAMS.length) + TEAMS.length) % TEAMS.length;
  const curTeam = (menu.slotTeam[i] || 0) % TEAMS.length;
  menu.slotTeam[i] = targetTeam;
  sfx('ui');
  if(settings.gameMode === 'hunter') updateElectedHuntersFromVotes();
  if(typeof NET !== 'undefined' && NET && NET.role !== null){
    if(NET.isHost) netBroadcastRoster();
    else {
      for(const pair of NET.conns.values()){
        netSendRel(pair, { t: 'team', slot: i, team: menu.slotTeam[i] });
      }
    }
  }
}

if(!menu.hunterVotes) menu.hunterVotes = {};
if(!menu.hunterHistory) menu.hunterHistory = {};

function getHunterTeamCounts(){
  const act = activeSlots();
  let red = 0, blue = 0;
  for(const s of act){
    const t = (menu.slotTeam ? menu.slotTeam[s] : s) % 2;
    if(t === 0) red++; else blue++;
  }
  return { red: red, blue: blue, diff: Math.abs(red - blue) };
}

function enforceHunterBalance(){
  const act = activeSlots();
  if(act.length < 2) return;
  let red = 0, blue = 0;
  for(const s of act){
    const t = (menu.slotTeam ? menu.slotTeam[s] : s) % 2;
    if(t === 0) red++; else blue++;
  }
  if(Math.abs(red - blue) > 1){
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    let r = 0, b = 0;
    for(let k = 0; k < act.length; k++){
      const s = act[k];
      if(r <= b){ menu.slotTeam[s] = 0; r++; }
      else { menu.slotTeam[s] = 1; b++; }
    }
  }
}

function getCandidateVoteCount(slot, team){
  if(!menu.hunterVotes) return 0;
  const act = activeSlots();
  let cnt = 0;
  for(const [voter, voteVal] of Object.entries(menu.hunterVotes)){
    const v = parseInt(voter);
    if(!act.includes(v)) continue;
    const cand = (voteVal && typeof voteVal === 'object') ? voteVal.cand : voteVal;
    const candTeam = (voteVal && typeof voteVal === 'object' && voteVal.team != null) ? voteVal.team : ((menu.slotTeam ? menu.slotTeam[v] : v) % 2);
    if(team != null && candTeam !== team) continue;
    if(slot === 'random'){
      if(cand === 'random' || cand === -1 || cand === '-1') cnt++;
    } else {
      if(parseInt(cand) === slot) cnt++;
    }
  }
  return cnt;
}

function resolveTeamHunter(team){
  const act = activeSlots();
  const teamSlots = act.filter(s => ((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === team);
  if(teamSlots.length === 0) return 0;
  if(teamSlots.length === 1) return teamSlots[0];

  const hist = (match && match.hunterHistory) ? match.hunterHistory : (menu.hunterHistory || {});

  // 1. Tally votes for each candidate on this team, and random votes
  const votes = {};
  for(const s of teamSlots) votes[s] = 0;
  let randomVotes = 0;

  if(menu.hunterVotes){
    for(const [voter, voteVal] of Object.entries(menu.hunterVotes)){
      const v = parseInt(voter);
      if(!act.includes(v)) continue;
      const cand = (voteVal && typeof voteVal === 'object') ? voteVal.cand : voteVal;
      const vTeam = (voteVal && typeof voteVal === 'object' && voteVal.team != null) ? voteVal.team : ((menu.slotTeam ? menu.slotTeam[v] : v) % 2);
      if(vTeam === team){
        if(cand === 'random' || cand === -1 || cand === '-1'){
          randomVotes++;
        } else {
          const c = parseInt(cand);
          if(teamSlots.includes(c)){
            votes[c] = (votes[c] || 0) + 1;
          }
        }
      }
    }
  }

  // 2. Find maximum vote count among candidates
  let maxCandidateVotes = -1;
  for(const s of teamSlots){
    if((votes[s] || 0) > maxCandidateVotes) maxCandidateVotes = votes[s] || 0;
  }

  // If random strictly won
  if(randomVotes > maxCandidateVotes && randomVotes > 0){
    let minR = 1e9;
    for(const s of teamSlots){
      const r = hist[s] || 0;
      if(r < minR) minR = r;
    }
    const leastRounds = teamSlots.filter(s => (hist[s] || 0) === minR);
    const curHunter = (team === 0 ? settings.hunterRed : settings.hunterBlue);
    if(leastRounds.includes(curHunter)) return curHunter;
    return leastRounds[0];
  }

  const topCandidates = teamSlots.filter(s => (votes[s] || 0) === maxCandidateVotes);
  if(topCandidates.length === 1 && maxCandidateVotes > randomVotes){
    return topCandidates[0];
  }

  // 3. Tie breaker: pick candidate(s) with LEAST hunter rounds played
  let minRounds = 1e9;
  for(const s of topCandidates){
    const r = hist[s] || 0;
    if(r < minRounds) minRounds = r;
  }
  const leastRoundCandidates = topCandidates.filter(s => (hist[s] || 0) === minRounds);

  // 4. Stable tie breaker: if currently configured hunter is in leastRoundCandidates, keep it!
  const curHunter = (team === 0 ? settings.hunterRed : settings.hunterBlue);
  if(leastRoundCandidates.includes(curHunter)) return curHunter;
  return leastRoundCandidates[0];
}

function updateElectedHuntersFromVotes(){
  settings.hunterRed = resolveTeamHunter(0);
  settings.hunterBlue = resolveTeamHunter(1);
  if(match){
    match.hunterRed = settings.hunterRed;
    match.hunterBlue = settings.hunterBlue;
  }
}

function castHunterVote(voterSlot, candSlot){
  if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost && NET.teamsLocked){
    toast('VOTING LOCKED BY HOST');
    sfx('back');
    return;
  }
  if(!menu.hunterVotes) menu.hunterVotes = {};
  const vTeam = (menu.slotTeam && voterSlot >= 0 && menu.slotTeam[voterSlot] != null) ? (menu.slotTeam[voterSlot] % 2) : ((voterSlot >= 0 ? voterSlot : 0) % 2);
  menu.hunterVotes[voterSlot] = { team: vTeam, cand: candSlot };
  sfx('ok');

  if(typeof NET === 'undefined' || !NET || NET.role === null || NET.isHost){
    updateElectedHuntersFromVotes();
  }

  let candName = 'Fair pick';
  if(candSlot !== 'random' && candSlot >= 0){
    candName = (typeof NET !== 'undefined' && NET && NET.slotsName && NET.slotsName[candSlot]) ? (('P' + (candSlot + 1)) + ' ' + NET.slotsName[candSlot]) : ('P' + (candSlot + 1));
  }
  toast(candSlot === 'random' ? '🎲 Fair pick: fewest hunts first!' : ('✓ Your tap: ' + candName + ' hunts next!'));

  if(typeof NET !== 'undefined' && NET && NET.role !== null){
    if(NET.isHost){
      netBroadcastReliable({
        t: 'hunter_votes_sync',
        hunterVotes: menu.hunterVotes,
        hunterRed: settings.hunterRed,
        hunterBlue: settings.hunterBlue
      });
      netBroadcastSettings();
      netBroadcastRoster();
    } else {
      for(const pair of NET.conns.values()){
        netSendRel(pair, { t: 'hunter_vote', voter: voterSlot, team: vTeam, candidate: candSlot });
      }
    }
  }
}

function validateHunterRoles(){
  enforceHunterBalance();
  updateElectedHuntersFromVotes();
}

/* ================= POST-GAME MAP VOTE + MODE REQUESTS =================
   After a match: 3 map cards with live previews, one vote per human.
   Highest count wins; ties go to whichever map reached the count FIRST
   (the Nth-vote sequence number decides). Zero votes => random pick.
   Mode requests work the same way (earliest request wins ties, else current).
   Online: host owns the state and broadcasts; guests send votes. */
const MAPVOTE_MODES = [
  {id:'party', icon:'👥', label:'PARTY'},
  {id:'teams', icon:'⚔️', label:'TEAMS'},
  {id:'ctf', icon:'🚩', label:'CTF'},
  {id:'freeze', icon:'❄️', label:'FREEZE'},
  {id:'infection', icon:'🧟', label:'INFECTION'},
  {id:'bomb', icon:'💣', label:'BOMB'},
  {id:'crown', icon:'👑', label:'CROWN'},
  {id:'hunter', icon:'🎯', label:'HUNTER'}
];
function mapVoteVoters(){
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  if(isOnline){
    if(!NET.isHost) return [(NET.mySlot != null ? NET.mySlot : -1)];
    const r = [];
    const act = (typeof activeSlots === 'function') ? activeSlots() : [];
    for(const s of act){
      if(NET.botSlots && NET.botSlots.indexOf(s) >= 0) continue;
      r.push(s);
    }
    return r;
  }
  let humans = [];
  try{ humans = activeSlots().filter(function(s){ return !isSlotBot(s); }); }catch(e){ humans = [0]; }
  return humans.length ? ['local_0', 'L', 0] : [];
}
function myVoterId(){
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  if(isOnline) return (NET.mySlot != null ? NET.mySlot : -1);
  return 'local_0';
}
function initMapVote(){
  const opts = [];
  const tried = {};
  tried[settings.map] = true;
  let guard = 0;
  while(opts.length < 3 && guard++ < 60){
    const m = Math.floor(Math.random() * MAPS.length);
    if(tried[m]) continue;
    tried[m] = true;
    opts.push(m);
  }
  for(let m = 0; m < MAPS.length && opts.length < 3; m++){
    if(opts.indexOf(m) < 0) opts.push(m);
  }
  const voters = mapVoteVoters();
  menu.mapVote = { mid: matchIndex, opts: opts, votes: {}, seq: 0,
    modeReq: {}, mseq: 0, t: voters.length ? 20 : 6, decided: false, syncT: 0 };
  menu.modePopup = false;
  const isHost = (typeof NET !== 'undefined' && NET && NET.role !== null && NET.isHost);
  if(isHost) broadcastMapVote();
}
function broadcastMapVote(){
  if(typeof NET === 'undefined' || !NET || !NET.isHost) return;
  if(!menu.mapVote) return;
  try{ netBroadcastReliable({ t: 'mapvote_sync', vote: menu.mapVote }); }catch(e){}
}
function castMapVote(voter, pick){
  const V = menu.mapVote;
  if(!V || V.decided || !V.opts || V.opts.length < 3) return;
  pick = pick | 0;
  if(pick < 0 || pick > 2) return;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isGuest = isOnline && !NET.isHost;
  if(isGuest){
    V.votes[voter] = pick;
    try{ for(const pair of NET.conns.values()) netSendRel(pair, { t: 'map_vote', voter: voter, pick: pick }); }catch(e){}
    sfx('ui');
    return;
  }
  const voters = (typeof mapVoteVoters === 'function') ? mapVoteVoters() : ['local_0'];
  if(voters.indexOf(voter) < 0) return;
  V.seq = (V.seq || 0) + 1;
  V.votes[voter] = pick;
  sfx('ui');
  broadcastMapVote();
}
function requestMode(voter, modeId){
  const V = menu.mapVote;
  if(!V || V.decided) return;
  let ok = false;
  for(const m of MAPVOTE_MODES){ if(m.id === modeId){ ok = true; break; } }
  if(!ok) return;
  if(modeId === 'freeze'){ toast('❄️ THAT MODE IS COMING SOON!'); sfx('back'); return; }
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isGuest = isOnline && !NET.isHost;
  if(menu.tab === 'solo' && ['party', 'bomb', 'crown', 'ctf', 'infection'].indexOf(modeId) < 0){ toast('🤖 SOLO: FFA/BOMB/CROWN/CTF/INFECTION ONLY'); sfx('back'); return; }
  if(menu.tab === 'bots' && ['party','freeze','infection','bomb','crown','ctf'].indexOf(modeId) < 0){ toast('🤖 WATCH: FFA/CTF ONLY'); sfx('back'); return; }
  if(isGuest){
    V.modeReq[voter] = { mode: modeId, seq: -1 };
    try{ for(const pair of NET.conns.values()) netSendRel(pair, { t: 'mode_request', voter: voter, mode: modeId }); }catch(e){}
    sfx('ok');
    toast('📣 REQUESTED ' + modeId.toUpperCase() + '!');
    return;
  }
  const voters = (typeof mapVoteVoters === 'function') ? mapVoteVoters() : ['local_0'];
  if(voters.indexOf(voter) < 0) return;
  V.mseq = (V.mseq || 0) + 1;
  V.modeReq[voter] = { mode: modeId, seq: V.mseq };
  sfx('ok');
  toast('📣 REQUESTED ' + modeId.toUpperCase() + '!');
  broadcastMapVote();
}
function tallyMapVote(){
  const V = menu.mapVote;
  const counts = [0, 0, 0], last = [-1, -1, -1];
  if(V){
    for(const k of Object.keys(V.votes || {})){
      const o = V.votes[k];
      if(o == null) continue;
      const pk = (typeof o === 'object' && o !== null && o.pick != null ? o.pick : o) | 0;
      if(pk < 0 || pk > 2) continue;
      counts[pk]++;
      const sq = (typeof o === 'object' && o !== null && o.seq != null ? o.seq : -1) | 0;
      if(sq > last[pk]) last[pk] = sq;
    }
  }
  let best = 0;
  for(let i = 1; i < 3; i++){
    if(counts[i] > counts[best] || (counts[i] === counts[best] && last[i] < last[best])) best = i;
  }
  return { counts: counts, best: best, total: counts[0] + counts[1] + counts[2] };
}
function tallyModeReq(){
  const V = menu.mapVote;
  const counts = {}, first = {};
  if(V){
    for(const k of Object.keys(V.modeReq || {})){
      const o = V.modeReq[k];
      if(!o || !o.mode) continue;
      counts[o.mode] = (counts[o.mode] || 0) + 1;
      const sq = (o.seq == null ? -1 : o.seq) | 0;
      if(first[o.mode] == null || sq < first[o.mode]) first[o.mode] = sq;
    }
  }
  let best = null, bn = 0, bf = 1e12;
  for(const k of Object.keys(counts)){
    if(counts[k] > bn || (counts[k] === bn && first[k] < bf)){ bn = counts[k]; bf = first[k]; best = k; }
  }
  return { counts: counts, best: best, total: bn };
}
function decideMapVote(){
  const V = menu.mapVote;
  if(!V || V.decided) return;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  if(isOnline && !NET.isHost) return;
  V.decided = true;
  const T = tallyMapVote();
  let bi;
  if(T.total === 0 || V.opts.length < 3){
    bi = Math.floor(Math.random() * Math.max(1, V.opts.length));
    toast('🎲 NO VOTES — RANDOM MAP!');
  } else {
    bi = T.best;
  }
  const mapIdx = V.opts[bi] != null ? V.opts[bi] : settings.map;
  const M = tallyModeReq();
  let modeId = (M.best && M.total > 0) ? M.best : settings.gameMode;
  settings.map = ((mapIdx % MAPS.length) + MAPS.length) % MAPS.length;
  if(modeId && modeId !== settings.gameMode){
    if(modeId === 'hunter' && activeSlots().length < 4){
      toast('🎯 HUNTER NEEDS 4+ PLAYERS — MODE UNCHANGED');
    } else {
      setGameMode(modeId);
    }
  }
  buildLevel();
  const mname = MAPS[settings.map].name;
  toast('🗺️ ' + mname + ' WINS!' + (T.total ? (' (' + T.counts[bi] + ' VOTE' + (T.counts[bi] === 1 ? '' : 'S') + ')') : ''));
  sfx('go');
  menu.mapVote = null;
  menu.modePopup = false;
  startMatch();
}

function setTeamHunterChoice(teamIdx, cand){
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const teamSlots = activeSlots().filter(s => ((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === teamIdx);
  if(teamSlots.length === 0) return;

  if(!isOnline){
    if(cand === 'random'){
      const hist = (match && match.hunterHistory) ? match.hunterHistory : (menu.hunterHistory || {});
      let minR = 1e9;
      for(const s of teamSlots){ const r = hist[s] || 0; if(r < minR) minR = r; }
      const leastR = teamSlots.filter(s => (hist[s] || 0) === minR);
      const pick = leastR[Math.floor(Math.random() * leastR.length)];
      if(teamIdx === 0) settings.hunterRed = pick; else settings.hunterBlue = pick;
      if(!menu.hunterVotes) menu.hunterVotes = {};
      for(const s of teamSlots) menu.hunterVotes[s] = { team: teamIdx, cand: 'random' };
      toast('🎲 Fair pick: ' + ('P' + (pick + 1)) + ' hunts for ' + (teamIdx === 0 ? 'RED' : 'BLUE') + ' (fewest hunts first)');
    } else {
      if(teamIdx === 0) settings.hunterRed = cand; else settings.hunterBlue = cand;
      if(!menu.hunterVotes) menu.hunterVotes = {};
      for(const s of teamSlots) menu.hunterVotes[s] = { team: teamIdx, cand: cand };
      toast('👑 ' + ('P' + (cand + 1)) + ' hunts for ' + (teamIdx === 0 ? 'RED' : 'BLUE') + ' next!');
    }
    if(match){
      match.hunterRed = settings.hunterRed;
      match.hunterBlue = settings.hunterBlue;
    }
    sfx('ok');
    return;
  }

  // Online Multiplayer
  const mySlot = NET.mySlot;
  const myTeam = (menu.slotTeam && mySlot >= 0 && menu.slotTeam[mySlot] != null) ? (menu.slotTeam[mySlot] % 2) : ((mySlot >= 0 ? mySlot : 0) % 2);

  if(mySlot < 0){
    toast('⚠️ Spectators watch — players tap their own team!');
    sfx('back');
    return;
  }
  if(myTeam === teamIdx){
    const voter = mySlot;
    castHunterVote(voter, cand);
  } else {
    toast('⚠️ Tap YOUR team box — you hunt with them!');
    sfx('back');
  }
}

function selectHunterRole(slot){
  const sTeam = (menu.slotTeam ? menu.slotTeam[slot] : slot) % 2;
  setTeamHunterChoice(sTeam, slot);
}

function setGameMode(newMode){
  if(menu.tab === 'solo'){
    const soloModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(soloModes.indexOf(newMode) < 0){
      toast('🤖 SOLO SUPPORTS FFA, BOMB, CROWN, CTF & INFECTION');
      sfx('back');
      return;
    }
  }
  if(menu.tab === 'bots'){
    const botModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
    if(botModes.indexOf(newMode) < 0){
      toast('🤖 WATCH MODE: FFA, BOMB, CROWN, CTF OR INFECTION');
      sfx('back');
      return;
    }
  }
  settings.gameMode = newMode;
  menu.gameMode = newMode;

  if(newMode === 'party'){
    settings.teams = false;
    toast('👥 FREE-FOR-ALL PARTY MODE');
    sfx('ui');
  } else if(newMode === 'teams'){
    settings.teams = true;
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    toast('⚔️ TEAM TAG MODE: ON (RED VS BLUE)');
    sfx('ok');
  } else if(newMode === 'hunter'){
    settings.teams = true;
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    validateHunterRoles();
    toast('🎯 HUNTER MODE: CROSS-HUNT ELIMINATION (TRY NOW!)');
    sfx('ok');
  } else if(newMode === 'freeze'){
    settings.teams = true;
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    toast('❄️ FREEZE TAG: FREEZE ENEMY RUNNERS!');
    sfx('ok');
  } else if(newMode === 'infection'){
    settings.teams = false;
    toast('🧟 INFECTION: OUTRUN THE OUTBREAK!');
    sfx('ok');
  } else if(newMode === 'bomb'){
    settings.teams = false;
    toast('💣 BOMB TAG: HOT POTATO PASS!');
    sfx('ok');
  } else if(newMode === 'crown'){
    settings.teams = false;
    toast('👑 CROWN KING: TOUCH CROWN, HOLD TO 100 PTS!');
    sfx('ok');
  } else if(newMode === 'ctf'){
    settings.teams = true;
    if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    toast('🚩 CAPTURE THE FLAG: RED VS BLUE');
    sfx('ok');
  }

  if(typeof NET !== 'undefined' && NET && NET.isHost){
    netBroadcastSettings();
    netBroadcastRoster();
  }
}

function cycleGameMode(d){
  if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){
    toast('HOST SELECTS GAME MODE');
    sfx('back');
    return;
  }
  const modes = (menu.tab === 'bots' || menu.tab === 'solo')
    ? ['party', 'ctf', 'bomb', 'crown', 'infection']
    : ['party', 'teams', 'ctf', 'bomb', 'crown', 'infection', 'hunter'];
  let curIdx = modes.indexOf(settings.gameMode || (settings.teams ? 'teams' : 'party'));
  if(curIdx < 0) curIdx = 0;
  const nextIdx = (curIdx + (d || 1) + modes.length) % modes.length;
  setGameMode(modes[nextIdx]);
}

function toggleTeams(){
  cycleGameMode(1);
}
function cycleSlot(i,d){
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const max = isOnline ? MAXP : 4;
  const taken = new Set();
  for(let s = 0; s < max; s++){
    if(s !== i && menu.slotColor[s] >= 0){
      taken.add(menu.slotColor[s]);
    }
  }
  const available = [];
  for(let p = 0; p < PALETTE.length; p++){
    if(!taken.has(p)) available.push(p);
  }
  if(available.length === 0) return;
  let cur = available.indexOf(menu.slotColor[i]);
  if(cur < 0) cur = 0;
  cur = (cur + d + available.length) % available.length;
  menu.slotColor[i] = available[cur];
  ensureUniqueLocalColors();
  if(settings.gameMode === 'hunter'){
    enforceHunterBalance();
    validateHunterRoles();
  }
  sfx('ui');
}
function ruleValue(){return settings.doubleJump;}
function toggleRule(){
  settings.doubleJump = !settings.doubleJump;
  sfx('ui');
  if(typeof NET!=='undefined' && NET && NET.isHost) netBroadcastSettings();
}
function rowEdit(d){
  if(typeof NET!=='undefined' && NET && NET.role!==null && !NET.isHost){
    toast('HOST CONTROLS MAP & RULES');
    sfx('back');
    return;
  }
  switch(menu.row){
    case 1:settings.map=(settings.map+d+MAPS.length)%MAPS.length;buildLevel();sfx('ui');break;
    case 2:settings.timeIdx=(settings.timeIdx+d+TIMES.length)%TIMES.length;sfx('ui');break;
    case 3:menu.rule=(menu.rule+d+2)%2;sfx('ui');break;
  }
  if(typeof NET!=='undefined' && NET && NET.isHost && typeof netBroadcastSettings==='function') netBroadcastSettings();
}
function rowEnter(){
  if(menu.row===0){
    if(typeof NET!=='undefined' && NET && NET.role!==null){
      // in online mode, row 0 is online roster status
      if(NET.isHost && activeSlots().length<2){
        netCopyInviteToClipboard('Invite link copied! Share with your friend.');
      }
      return;
    }
    menu.mode='slots';sfx('ok');
  }
  else if(menu.row===4){
    if(typeof NET!=='undefined' && NET && NET.role!==null){
      if(!NET.isHost){
        toast('WAITING FOR HOST TO START');
        sfx('back');
        return;
      }
      const act=activeSlots();
      if(act.length<2){
        netCopyInviteToClipboard('Invite link copied! Send it to your friend.');
        toast('WAITING FOR A FRIEND TO JOIN!');
        sfx('back');
        return;
      }
      const allReady=act.every(s=>NET.slotsReady[s]);
      if(!allReady){
        toast('WAITING FOR ALL PLAYERS TO HIT READY!');
        sfx('back');
        return;
      }
      sfx('go');
      startMatch();
      return;
    }
    if(activeSlots().length<2){
      menu.mode='slots';
      menu.row=0;
      toast('CHOOSE AT LEAST 2 PLAYERS!');
      sfx('back');
    }else{
      sfx('go');
      startMatch();
    }
  }
  else if(menu.row===3){
    if(typeof NET!=='undefined' && NET && NET.role!==null && !NET.isHost){
      toast('HOST CONTROLS MAP & RULES');
      sfx('back');
      return;
    }
    toggleRule();
  }
  else rowEdit(1);
}
function menuConfirm(){
  if(menu.mode==='slots'){
    if(activeSlots().length<2){toast('CHOOSE AT LEAST 2 PLAYERS!');sfx('back');}
    else{menu.mode='rows';menu.row=1;sfx('ok');}
  }else rowEnter();
}
function updateMenu(dt){
  if(anyPressed(['KeyM'])){muted=!muted;applyEffectiveMute();}
  if(anyPressed(['KeyB']) && menu.tab !== 'bots'){
    menu.botOn=!menu.botOn;
    sfx('ui');
    toast(menu.botOn?'BOT: ON':'BOT: OFF');
  }
  menu.toastT-=dt;

  // Map hotkeys: 1-9, 0
  const digits = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'];
  for(let i=0; i<digits.length; i++){
    if(pressed.has(digits[i])){
      settings.map = i % MAPS.length;
      buildLevel();
      sfx('ok');
    }
  }

  // Escape closes modals
  if(pressed.has('Escape')){
    if(menu.onlineModal){
      menu.onlineModal = false;
      sfx('back');
      return;
    }
    if(menu.mapModal){
      menu.mapModal = false;
      sfx('back');
      return;
    }
  }

  // Space or Enter starts match immediately
  if(anyPressed(['Enter','NumpadEnter','Space'])){
    if(menu.mapModal){
      menu.mapModal = false;
    } else if(menu.tab !== 'online'){
      if(activeSlots().length < 2){
        menu.slotColor[0] = 0; menu.slotColor[1] = 1;
      }
      sfx('go');
      startMatch();
    }
  }
}

if(typeof window !== 'undefined'){
  window.setMenuTab = setMenuTab;
  window.setGameMode = setGameMode;
  window.cycleGameMode = cycleGameMode;
  window.requestMode = requestMode;
}
if(typeof globalThis !== 'undefined'){
  globalThis.setMenuTab = setMenuTab;
  globalThis.setGameMode = setGameMode;
  globalThis.cycleGameMode = cycleGameMode;
  globalThis.requestMode = requestMode;
}
if(typeof module !== 'undefined' && module.exports){
  module.exports = { menu, setMenuTab, setGameMode, cycleGameMode, requestMode };
}

