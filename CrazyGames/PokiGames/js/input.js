/* ================= mobile touch action state ================= */
const TOUCH = {
  left: false,
  right: false,
  jumpEdge: false,
  jumpHeld: false,
  downHeld: false
};

/* ================= mobile touch joystick & dual slider system ================= */
const JOY = {
  // Left horizontal joystick (floating — spawns at touch position)
  leftId: null,
  leftStartX: 0,   // touch start anchor X
  leftStartY: 0,   // touch start anchor Y
  leftX: 0,        // -1 (left) to +1 (right), rests at 0 (center)
  spawnX: 0,       // touch-down origin: the base can only roam ±1 radius from here
  spawnY: 0,
  leftVisX: 0,     // smooth interpolated visual knob position
  boundsL: null,   // { x, y, w, h, cx, cy, maxTravel, r }

  // Right vertical dual jump/drop slider (snaps to top)
  rightId: null,
  rightY: 0,       // 0 (top/rest) to 1 (pulled down)
  rightVisY: 0,    // smooth interpolated visual knob position
  rightStartY: 0,  // touch start Y to detect downward drag immediately
  boundsR: null    // { x, y, w, h, cx, cyTop, maxTravel, r }
};

/* ================= 2-player local mobile controls (Ergonomic Joysticks + Fixed Buttons) ================= */
const LOCAL_TOUCH = {
  showTutorial: false,
  p1: { joyId: null, startX: 0, startY: 0, curX: 0, curY: 0, active: false, offX: 0, visOffX: 0, left: false, right: false, spX: 0, sldId: null, sldStartY: 0, sldV: 0, jumpHeld: false, jumpEdge: false, downHeld: false },
  p2: { joyId: null, startX: 0, startY: 0, curX: 0, curY: 0, active: false, offX: 0, visOffX: 0, left: false, right: false, spX: 0, sldId: null, sldStartY: 0, sldV: 0, jumpHeld: false, jumpEdge: false, downHeld: false }
};
const GESTURE_SPLIT = LOCAL_TOUCH; // Backward compatibility alias

function calcLocalBounds(){
  const midX = CW / 2;
  const isTablet = (Math.min(CW, CH) >= 500);
  const r = isTablet ? clamp(CH * 0.065, 24, 32) : clamp(CH * 0.080, 22, 28);
  const bm = isTablet ? clamp(CH * 0.07, 24, 42) : clamp(CH * 0.06, 16, 26);
  const maxTravel = r * 1.45;
  const trackW = r * 3.4;
  const trackH = r * 2.0;

  // Corner positioning:
  // Player 1 (Bottom-Left Corner): Joystick at far left, Jump & Drop buttons shifted right by ~1 button diameter for comfortable thumb spacing
  const p1CornerPad = isTablet ? clamp(CW * 0.045, 24, 44) : clamp(CW * 0.040, 16, 28);
  const p1DefJoyX = p1CornerPad + trackW / 2;
  const p1DefJoyY = CH - bm - r * 1.05;
  const p1BtnX = p1DefJoyX + trackW / 2 + r * 3.30;
  const p1DropY = p1DefJoyY;
  const p1JumpY = p1DropY - r * 2.15;
  const p1SplitY = (p1JumpY + p1DropY) / 2;
  const p1BtnMinX = p1BtnX - r * 1.15;
  const p1BtnMaxX = p1BtnX + r * 1.45;
  const p1BtnMinY = p1JumpY - r * 1.35;
  const p1BtnMaxY = p1DropY + r * 1.35;

  // Player 2 (Bottom-Right Corner): Jump & Drop buttons at far right, Joystick shifted left towards center by the same gap
  const p2CornerPad = isTablet ? clamp(CW * 0.045, 24, 44) : clamp(CW * 0.040, 16, 28);
  const p2BtnX = CW - p2CornerPad - r * 1.15;
  const p2DefJoyX = p2BtnX - r * 3.30 - trackW / 2;
  const p2DefJoyY = CH - bm - r * 1.05;
  const p2DropY = p2DefJoyY;
  const p2JumpY = p2DropY - r * 2.15;
  const p2SplitY = (p2JumpY + p2DropY) / 2;
  const p2BtnMinX = p2BtnX - r * 1.15;
  const p2BtnMaxX = p2BtnX + r * 1.45;
  const p2BtnMinY = p2JumpY - r * 1.35;
  const p2BtnMaxY = p2DropY + r * 1.35;

  return {
    midX, r, bm, maxTravel, trackW, trackH,
    p1: { btnX: p1BtnX, jumpY: p1JumpY, dropY: p1DropY, splitY: p1SplitY, btnMinX: p1BtnMinX, btnMaxX: p1BtnMaxX, btnMinY: p1BtnMinY, btnMaxY: p1BtnMaxY, defJoyX: p1DefJoyX, defJoyY: p1DefJoyY },
    p2: { btnX: p2BtnX, jumpY: p2JumpY, dropY: p2DropY, splitY: p2SplitY, btnMinX: p2BtnMinX, btnMaxX: p2BtnMaxX, btnMinY: p2BtnMinY, btnMaxY: p2BtnMaxY, defJoyX: p2DefJoyX, defJoyY: p2DefJoyY }
  };
}

/* Solo-style vertical slider per local half (top = jump, bottom = drop),
   built from the existing button column so halves stay exactly where they were */
function localSlider(b, side){
  const c = (side === 'p2') ? b.p2 : b.p1;
  const sw = b.r * 2.1;
  const bot = c.dropY + b.r * 1.05;
  // Never slide under the in-match HUD button bar (ends at y=48); the jump
  // point and travel stay glued to the visible track so input matches draw.
  const top = Math.max(c.jumpY - b.r * 1.05, 58);
  const cyTop = Math.max(c.jumpY, top);
  const maxTravel = Math.max(10, Math.min(c.dropY - c.jumpY, bot - cyTop));
  return { x: c.btnX - sw / 2, y: top, w: sw, h: Math.max(10, bot - top),
    cx: c.btnX, cyTop: cyTop, maxTravel: maxTravel, r: b.r };
}
/* Shared solo-like slider press semantics for a local-half player */
function localSlidePress(p, myP, sl, y, startY){
  const off = clamp((y - sl.cyTop) / sl.maxTravel, 0, 1);
  if(off > 0.22 || (y - startY > 12)){
    // DROP ONLY, NEVER JUMP
    p.downHeld = true;
    p.jumpEdge = false;
    p.jumpHeld = false;
    if(myP && myP.jbuf > 0) myP.jbuf = 0;
  } else {
    // top knob zone = JUMP
    p.downHeld = false;
    p.jumpEdge = true;
    p.jumpHeld = true;
  }
}

function applyTouchAction(action, isDown){
  if(action === 'left') TOUCH.left = !!isDown;
  else if(action === 'right') TOUCH.right = !!isDown;
  else if(action === 'jump'){
    if(isDown){ TOUCH.jumpEdge = true; TOUCH.jumpHeld = true; }
    else TOUCH.jumpHeld = false;
  } else if(action === 'down') TOUCH.downHeld = !!isDown;
}

/* ================= gamepads ================= */
const GP={prev:[{},{},{},{}],prevAx:[0,0,0,0],prevAy:[0,0,0,0]};
let PAD=[null,null,null,null];
function pollGamepads(){
  const rawPads=navigator.getGamepads?navigator.getGamepads():[];
  for(let i=0;i<4;i++){
    const gd=rawPads[i];
    if(!gd||!gd.connected){PAD[i]=null;continue;}
    const b=n=>gd.buttons[n]&&(typeof gd.buttons[n]==='object'?gd.buttons[n].pressed:gd.buttons[n]>0.5);
    const pv=GP.prev[i]||{};
    const E=n=>b(n)&&!pv[n];
    const ax=gd.axes[0]||0,ay=gd.axes[1]||0;
    const pax=GP.prevAx[i]||0,pay=GP.prevAy[i]||0;
    const left=ax<-0.30||b(14),right=ax>0.30||b(15),up=ay<-0.50||b(12),down=ay>0.50||b(13);
    PAD[i]={
      left,right,up,down,
      leftE:(left&&!(pax<-0.30||pv[14]))||E(14),
      rightE:(right&&!(pax>0.30||pv[15]))||E(15),
      upE:(up&&!(pay<-0.50||pv[12]))||E(12),
      downE:(down&&!(pay>0.50||pv[13]))||E(13),
      jumpE:E(0),
      jumpHeld:!!b(0),
      confirmE:E(0)||E(2)||E(9),
      pauseE:E(9),
      dropHeld:b(1)||down,
      connected:true
    };
    const np={};for(let n=0;n<17;n++)np[n]=b(n);
    GP.prev[i]=np;
    GP.prevAx[i]=ax;
    GP.prevAy[i]=ay;
  }
}

/* ================= touch zones ================= */
const zones=[];const touchPts=new Map();const glow={};
let pointerX = -999, pointerY = -999, pointerDown = false;
function isPointerIn(x, y, w, h){
  return pointerX >= x && pointerX <= x + w && pointerY >= y && pointerY <= y + h;
}
function zone(x,y,w,h,o){
  zones.push({
    x:x,y:y,w:w,h:h,
    press:(o&&o.press)||null,
    hold:(o&&o.hold)||null,
    fn:(o&&o.fn)||null,
    upFn:(o&&o.upFn)||null,
    touchAction:(o&&o.touchAction)||null
  });
}
function zoneAt(x,y,holdOnly){
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];
    if(holdOnly&&!z.hold&&!z.touchAction)continue;
    if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)return z;}
  return null;
}
function inputDown(x,y,id){
  initAudio();grabFocus();
  pointerX = x; pointerY = y; pointerDown = true;
  
  // Tutorial Card dismiss for 2-Player Local Touch
  if(match && screen === 'game' && GESTURE_SPLIT.showTutorial){
    GESTURE_SPLIT.showTutorial = false;
    if(match.state === 'tutorial'){
      match.state = 'countdown';
      match.cd = 3;
      match.cdT = 0;
      sfx('count');
    }
    return;
  }

  // Pause / host menu open: every touch goes to menu zones, never game controls.
  // (Otherwise the floating joystick/slider captures menu taps on touch devices.)
  if(match && (match.state === 'paused' || match.hostMenu)){
    const pz = zoneAt(x, y, false);
    if(pz){
      touchPts.set(id, pz);
      if(pz.hold){keys.add(pz.hold);}
      if(pz.press){for(const c of pz.press){pressed.add(c);glow[c]=tGlobal;}}
      if(pz.touchAction){applyTouchAction(pz.touchAction,true);}
      if(pz.fn)pz.fn();
    }
    return;
  }

  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isPlaying = (match && (match.state === 'playing' || match.state === 'countdown'));
  const isSplitLocal = (!isOnline && match && screen === 'game' && isPlaying && match.players && match.players.length === 2 && isTouch && !menu.botOn && menu.tab !== 'solo');

  // Allow HUD top bar buttons (Pause, Mute, Help) to receive clicks
  if(y <= 55){
    const z = zoneAt(x,y,false);
    if(z){
      touchPts.set(id,z);
      if(z.hold){keys.add(z.hold);}
      if(z.press){for(const c of z.press){pressed.add(c);glow[c]=tGlobal;}}
      if(z.touchAction){applyTouchAction(z.touchAction,true);}
      if(z.fn)z.fn();
      return;
    }
  }

  // 2-Player Local Shared Screen Touch Controls (Fixed Jump/Drop + Floating Side-to-Side Joystick)
  if(isSplitLocal){
    const b = calcLocalBounds();

    if(x < b.midX){
      // --- Player 1 (Left Half) ---
      const p = LOCAL_TOUCH.p1;
      // P1 vertical jump/drop slider (same feel as solo slider)
      const sl1 = localSlider(b, 'p1');
      if(x >= sl1.x - 24 && x <= sl1.x + sl1.w + 24 && y >= sl1.y - 24 && y <= sl1.y + sl1.h + 24){
        p.sldId = id;
        p.sldStartY = y;
        localSlidePress(p, match.players[0], sl1, y, y);
        const myP0 = match.players[0];
        if(!p.downHeld && myP0) myP0.jbuf = 0.16;
        return;
      }
      // Floating Side-to-Side Joystick anywhere else in P1 half!
      p.joyId = id;
      p.startX = x;
      p.spX = x;
      p.startY = y;
      p.curX = x;
      p.curY = y;
      p.active = true;
      p.offX = 0;
      p.left = false;
      p.right = false;
      return;
    } else {
      // --- Player 2 (Right Half) ---
      const p = LOCAL_TOUCH.p2;
      // P2 vertical jump/drop slider (same feel as solo slider)
      const sl2 = localSlider(b, 'p2');
      if(x >= sl2.x - 24 && x <= sl2.x + sl2.w + 24 && y >= sl2.y - 24 && y <= sl2.y + sl2.h + 24){
        p.sldId = id;
        p.sldStartY = y;
        localSlidePress(p, match.players[1], sl2, y, y);
        const myP1 = match.players[1];
        if(!p.downHeld && myP1) myP1.jbuf = 0.16;
        return;
      }
      // Floating Side-to-Side Joystick anywhere else in P2 half!
      p.joyId = id;
      p.startX = x;
      p.spX = x;
      p.startY = y;
      p.curX = x;
      p.curY = y;
      p.active = true;
      p.offX = 0;
      p.left = false;
      p.right = false;
      return;
    }
  }

  // Check Left horizontal joystick (Solo / Online) — FLOATING: spawns wherever you touch on left side
  if(match && screen === 'game' && isPlaying && isTouch && JOY.boundsL && !JOY.leftId){
    const bR = JOY.boundsR;
    const rightEdge = bR ? (bR.x - 30) : (CW * 0.65);
    if(x < rightEdge && y > 55){
      JOY.leftId = id;
      JOY.leftStartX = x;
      JOY.leftStartY = y;
      JOY.spawnX = x;
      JOY.spawnY = y;
      JOY.leftX = 0;
      TOUCH.left = false;
      TOUCH.right = false;
      return;
    }
  }
  // Check Right vertical dual jump/drop slider (Solo / Online)
  if(match && screen === 'game' && isPlaying && isTouch && JOY.boundsR){
    const b = JOY.boundsR;
    if(x >= b.x - 24 && x <= b.x + b.w + 24 && y >= b.y - 24 && y <= b.y + b.h + 24){
      JOY.rightId = id;
      JOY.rightStartY = y;
      const off = clamp((y - b.cyTop) / b.maxTravel, 0, 1);
      JOY.rightY = off;
      
      // If touch starts on or near the drop zone (off > 0.22 or y > b.cyTop + 14) -> DROP ONLY, NEVER JUMP!
      if(off > 0.22 || y > b.cyTop + 14){
        TOUCH.downHeld = true;
        TOUCH.jumpEdge = false;
        TOUCH.jumpHeld = false;
        const myP = getMyPlayer();
        if(myP && myP.jbuf > 0) myP.jbuf = 0;
      } else {
        // Touching the top knob (JUMP ZONE)
        TOUCH.downHeld = false;
        TOUCH.jumpEdge = true;
        TOUCH.jumpHeld = true;
      }
      return;
    }
  }
  const z=zoneAt(x,y,false);
  if(z){
    touchPts.set(id,z);
    if(z.hold){keys.add(z.hold);}
    if(z.press){for(const c of z.press){pressed.add(c);glow[c]=tGlobal;}}
    if(z.touchAction){applyTouchAction(z.touchAction,true);}
    if(z.fn)z.fn();
  }
}
function inputMove(x,y,id){
  pointerX = x; pointerY = y;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isPlaying = (match && (match.state === 'playing' || match.state === 'countdown'));
  const isSplitLocal = (!isOnline && match && screen === 'game' && isPlaying && match.players && match.players.length === 2 && isTouch && !menu.botOn && menu.tab !== 'solo');
  if(isSplitLocal){
    const b = calcLocalBounds();
    // P1 Joystick (leashed drag-follow like solo, pinned to left half)
    if(LOCAL_TOUCH.p1.joyId === id){
      const p = LOCAL_TOUCH.p1;
      p.curX = x; p.curY = y;
      let dx = x - p.startX;
      if(dx > b.maxTravel || dx < -b.maxTravel){
        const lo = b.trackW / 2 + 2, hi = b.midX - b.trackW / 2 - 2;
        p.startX = x - Math.sign(dx) * b.maxTravel;
        if(lo <= hi) p.startX = clamp(p.startX, Math.max(lo, (p.spX || x) - b.maxTravel), Math.min(hi, (p.spX || x) + b.maxTravel));
        dx = x - p.startX;
      }
      p.offX = clamp(dx / b.maxTravel, -1, 1);
      p.left = (p.offX < -0.22);
      p.right = (p.offX > 0.22);
      return;
    }
    // P2 Joystick (leashed drag-follow like solo, pinned to right half)
    if(LOCAL_TOUCH.p2.joyId === id){
      const p = LOCAL_TOUCH.p2;
      p.curX = x; p.curY = y;
      let dx = x - p.startX;
      if(dx > b.maxTravel || dx < -b.maxTravel){
        const lo = b.midX + b.trackW / 2 + 2, hi = CW - b.trackW / 2 - 2;
        p.startX = x - Math.sign(dx) * b.maxTravel;
        if(lo <= hi) p.startX = clamp(p.startX, Math.max(lo, (p.spX || x) - b.maxTravel), Math.min(hi, (p.spX || x) + b.maxTravel));
        dx = x - p.startX;
      }
      p.offX = clamp(dx / b.maxTravel, -1, 1);
      p.left = (p.offX < -0.22);
      p.right = (p.offX > 0.22);
      return;
    }
    // P1 slider drag (top = jump, bottom = drop — solo feel)
    if(LOCAL_TOUCH.p1.sldId === id){
      const p = LOCAL_TOUCH.p1;
      const sl = localSlider(b, 'p1');
      if(Math.hypot(x - sl.cx, y - (sl.cyTop + sl.maxTravel / 2)) > Math.max(sl.w, sl.maxTravel / 2) + 70){
        p.sldId = null; p.jumpHeld = false; p.downHeld = false;
      } else {
        localSlidePress(p, match.players[0], sl, y, p.sldStartY);
      }
      return;
    }
    // P2 slider drag (top = jump, bottom = drop — solo feel)
    if(LOCAL_TOUCH.p2.sldId === id){
      const p = LOCAL_TOUCH.p2;
      const sl = localSlider(b, 'p2');
      if(Math.hypot(x - sl.cx, y - (sl.cyTop + sl.maxTravel / 2)) > Math.max(sl.w, sl.maxTravel / 2) + 70){
        p.sldId = null; p.jumpHeld = false; p.downHeld = false;
      } else {
        localSlidePress(p, match.players[1], sl, y, p.sldStartY);
      }
      return;
    }
    return;
  }

  if(JOY.leftId === id && JOY.boundsL){
    const b = JOY.boundsL;
    let dx = x - JOY.leftStartX;
    // Leashed drag-follow (standard floating-stick feel): pushing past max
    // travel drags the base along, but only within ±1 radius of the touch-down
    // point — then it stops and the input simply holds full deflection.
    if(dx > b.maxTravel || dx < -b.maxTravel){
      const wantX = x - Math.sign(dx) * b.maxTravel;
      JOY.leftStartX = clamp(wantX, JOY.spawnX - b.maxTravel, JOY.spawnX + b.maxTravel);
      JOY.leftStartX = clamp(JOY.leftStartX, b.w / 2 + 4, CW - b.w / 2 - 4);
      dx = x - JOY.leftStartX;
    }
    // Vertical follow, leashed the same way (visual only — stick reads X).
    JOY.leftStartY = clamp(y, JOY.spawnY - b.maxTravel, JOY.spawnY + b.maxTravel);
    const off = clamp(dx / b.maxTravel, -1, 1);
    JOY.leftX = off;
    TOUCH.left = (off < -0.22);
    TOUCH.right = (off > 0.22);
    return;
  }
  if(JOY.rightId === id && JOY.boundsR){
    const b = JOY.boundsR;
    const off = clamp((y - b.cyTop) / b.maxTravel, 0, 1);
    JOY.rightY = off;
    if(off > 0.22 || (y - JOY.rightStartY > 12)){
      TOUCH.downHeld = true;
      TOUCH.jumpHeld = false;
      TOUCH.jumpEdge = false;
      const myP = getMyPlayer();
      if(myP && myP.jbuf > 0) myP.jbuf = 0;
    } else {
      TOUCH.downHeld = false;
      TOUCH.jumpHeld = true;
    }
    return;
  }
  if(!touchPts.has(id))return;
  const cur=touchPts.get(id);
  if(cur&&(cur.hold||cur.touchAction)){
    const z=zoneAt(x,y,true);
    if(z!==cur){
      if(cur&&cur.hold)keys.delete(cur.hold);
      if(cur&&cur.touchAction)applyTouchAction(cur.touchAction,false);
      if(z&&z.hold)keys.add(z.hold);
      if(z&&z.touchAction)applyTouchAction(z.touchAction,true);
      touchPts.set(id,z);
    }
  }else if(cur&&cur.upFn){
    if(x<cur.x-10||x>cur.x+cur.w+10||y<cur.y-10||y>cur.y+cur.h+10){
      touchPts.set(id,null);
    }
  }
}
function inputUp(id){
  pointerDown = false;
  // P1 Local Touch Reset
  if(LOCAL_TOUCH.p1.joyId === id){
    const p = LOCAL_TOUCH.p1;
    p.joyId = null;
    p.active = false;
    p.offX = 0;
    p.left = false;
    p.right = false;
  }
  if(LOCAL_TOUCH.p1.sldId === id){
    LOCAL_TOUCH.p1.sldId = null;
    LOCAL_TOUCH.p1.jumpHeld = false;
    LOCAL_TOUCH.p1.jumpEdge = false;
    LOCAL_TOUCH.p1.downHeld = false;
  }
  // P2 Local Touch Reset
  if(LOCAL_TOUCH.p2.joyId === id){
    const p = LOCAL_TOUCH.p2;
    p.joyId = null;
    p.active = false;
    p.offX = 0;
    p.left = false;
    p.right = false;
  }
  if(LOCAL_TOUCH.p2.sldId === id){
    LOCAL_TOUCH.p2.sldId = null;
    LOCAL_TOUCH.p2.jumpHeld = false;
    LOCAL_TOUCH.p2.jumpEdge = false;
    LOCAL_TOUCH.p2.downHeld = false;
  }

  if(JOY.leftId === id){
    JOY.leftId = null;
    JOY.leftX = 0; // Snaps back to center!
    TOUCH.left = false;
    TOUCH.right = false;
  }
  if(JOY.rightId === id){
    JOY.rightId = null;
    JOY.rightY = 0; // Snaps back to top!
    TOUCH.jumpHeld = false;
    TOUCH.downHeld = false;
    TOUCH.jumpEdge = false;
  }
  const z=touchPts.get(id);
  if(z){
    if(z.hold)keys.delete(z.hold);
    if(z.touchAction)applyTouchAction(z.touchAction,false);
    if(z.upFn)z.upFn();
  }
  touchPts.delete(id);
}
if(window.PointerEvent){
  cv.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const pt=getCanvasCoords(e.clientX,e.clientY);
    inputDown(pt.x,pt.y,e.pointerId!=null?e.pointerId:'touch');
  },{passive:false});
  cv.addEventListener('pointermove',e=>{
    e.preventDefault();
    const pt=getCanvasCoords(e.clientX,e.clientY);
    inputMove(pt.x,pt.y,e.pointerId!=null?e.pointerId:'touch');
  },{passive:false});
  cv.addEventListener('pointerup',e=>{
    inputUp(e.pointerId!=null?e.pointerId:'touch');
  },{passive:false});
  cv.addEventListener('pointercancel',e=>{
    inputUp(e.pointerId!=null?e.pointerId:'touch');
  },{passive:false});
  cv.addEventListener('pointerleave', ()=>{ pointerX = -999; pointerY = -999; pointerDown = false; });
}else{
  cv.addEventListener('touchstart',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      const pt=getCanvasCoords(t.clientX,t.clientY);
      inputDown(pt.x,pt.y,'t'+t.identifier);
    }
  },{passive:false});
  cv.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      const pt=getCanvasCoords(t.clientX,t.clientY);
      inputMove(pt.x,pt.y,'t'+t.identifier);
    }
  },{passive:false});
  cv.addEventListener('touchend',e=>{
    for(const t of e.changedTouches)inputUp('t'+t.identifier);
  },{passive:false});
  cv.addEventListener('touchcancel',e=>{
    for(const t of e.changedTouches)inputUp('t'+t.identifier);
  },{passive:false});
  cv.addEventListener('mousedown',e=>{
    const pt=getCanvasCoords(e.clientX,e.clientY);
    inputDown(pt.x,pt.y,'mouse');
  });
  cv.addEventListener('mousemove',e=>{
    const pt=getCanvasCoords(e.clientX,e.clientY);
    inputMove(pt.x,pt.y,'mouse');
  });
  cv.addEventListener('mouseup',()=>inputUp('mouse'));
  cv.addEventListener('mouseleave',()=>inputUp('mouse'));
}

