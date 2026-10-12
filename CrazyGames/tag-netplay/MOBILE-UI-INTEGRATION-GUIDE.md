# Mobile UI Touch Controls Integration Guide

This guide documents the see-through **Horizontal Movement Joystick** and **Vertical Dual Jump/Drop Slider** controls for `tag-netplay`.

> [!NOTE]
> **Safe Isolation:** To ensure zero conflicts with your other agent currently making changes to `tag-netplay/index.html`, this complete implementation has been placed in a dedicated preview file:
> 📄 **Preview File:** [tag-netplay/index-mobile-ui-preview.html](file:///c:/Users/wissa/Downloads/MainGames/GamesAPK_tmp/CrazyGames/tag-netplay/index-mobile-ui-preview.html)
> 
> Your main file [tag-netplay/index.html](file:///c:/Users/wissa/Downloads/MainGames/GamesAPK_tmp/CrazyGames/tag-netplay/index.html) is **100% UNTOUCHED**.

---

## 🎮 How the Controls Function

1. **Left Horizontal Joystick**:
   * **Movement**: Constrained strictly horizontally (slide left to run left, slide right to run right).
   * **Resting State**: Automatically **snaps back to the center** when released.
   * **Visuals**: Frosted-glass see-through horizontal capsule (`rgba(255, 255, 255, 0.08)`) with subtle direction arrows `◀` and `▶`.

2. **Right Dual Jump & Drop Slider**:
   * **Height**: Exactly $2\times$ the diameter of the knob ($4 \times r$).
   * **Resting State**: Automatically **snaps to the top** when released.
   * **Tap / Press**: Instantly triggers **JUMP** (acts as your primary jump button).
   * **Slide Down**: Dragging downward along the track triggers **DOWN** (drops through pink platforms / fast falls).
   * **Visuals**: Vertical frosted-glass pill track with downward chevron indicator `▼`.

---

## 🛠️ Merge Guide for `tag-netplay/index.html`

Whenever your other agent finishes its 8 changes, you can ask me to merge this with one click, or apply these 3 clean snippets:

### Snippet 1: Add `JOY` State (Around Line 140)
Right after `const TOUCH = { ... };`:
```javascript
/* ================= mobile touch joystick & dual slider system ================= */
const JOY = {
  // Left horizontal joystick (snaps to center)
  leftId: null,
  leftX: 0,        // -1 (left) to +1 (right), rests at 0 (center)
  leftVisX: 0,     // smooth interpolated visual knob position
  boundsL: null,   // { x, y, w, h, cx, cy, maxTravel, r }

  // Right vertical dual jump/drop slider (snaps to top)
  rightId: null,
  rightY: 0,       // 0 (top/rest) to 1 (pulled down)
  rightVisY: 0,    // smooth interpolated visual knob position
  boundsR: null    // { x, y, w, h, cx, cyTop, maxTravel, r }
};
```

---

### Snippet 2: Add Joystick Tracking to Input Handlers (Around Line 215)
In `inputDown(x, y, id)`, `inputMove(x, y, id)`, and `inputUp(id)`:
```javascript
function inputDown(x,y,id){
  initAudio();grabFocus();
  // Check Left horizontal joystick
  if(match && screen === 'game' && isTouch && JOY.boundsL){
    const b = JOY.boundsL;
    if(x >= b.x - 24 && x <= b.x + b.w + 24 && y >= b.y - 24 && y <= b.y + b.h + 24){
      JOY.leftId = id;
      const off = clamp((x - b.cx) / b.maxTravel, -1, 1);
      JOY.leftX = off;
      TOUCH.left = (off < -0.22);
      TOUCH.right = (off > 0.22);
      return;
    }
  }
  // Check Right vertical dual jump/drop slider (snaps to top)
  if(match && screen === 'game' && isTouch && JOY.boundsR){
    const b = JOY.boundsR;
    if(x >= b.x - 24 && x <= b.x + b.w + 24 && y >= b.y - 24 && y <= b.y + b.h + 24){
      JOY.rightId = id;
      TOUCH.jumpEdge = true;
      TOUCH.jumpHeld = true;
      const off = clamp((y - b.cyTop) / b.maxTravel, 0, 1);
      JOY.rightY = off;
      TOUCH.downHeld = (off > 0.35);
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
  if(JOY.leftId === id && JOY.boundsL){
    const b = JOY.boundsL;
    const off = clamp((x - b.cx) / b.maxTravel, -1, 1);
    JOY.leftX = off;
    TOUCH.left = (off < -0.22);
    TOUCH.right = (off > 0.22);
    return;
  }
  if(JOY.rightId === id && JOY.boundsR){
    const b = JOY.boundsR;
    const off = clamp((y - b.cyTop) / b.maxTravel, 0, 1);
    JOY.rightY = off;
    TOUCH.downHeld = (off > 0.35);
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
  }
  const z=touchPts.get(id);
  if(z){
    if(z.hold)keys.delete(z.hold);
    if(z.touchAction)applyTouchAction(z.touchAction,false);
    if(z.upFn)z.upFn();
  }
  touchPts.delete(id);
}
```

---

### Snippet 3: Replace `!isSplitLocal` in `drawTouchButtons()` (Around Line 2535)
Replace the `if(!isSplitLocal){ ... }` block inside `drawTouchButtons()` with:
```javascript
  if(!isSplitLocal){
    /* ================= SLEEK SEE-THROUGH JOYSTICKS (ONLINE & SOLO) ================= */
    const r = isTablet ? clamp(CH * 0.058, 24, 32) : clamp(CH * 0.075, 20, 26);
    const bm = isTablet ? clamp(CH * 0.07, 24, 44) : clamp(CH * 0.06, 16, 26);
    const sm = isTablet ? clamp(CW * 0.045, 26, 48) : clamp(CW * 0.04, 18, 30);
    
    // --- 1. Left Horizontal-Only Joystick (Snaps to Center) ---
    const wL = r * 3.6, hL = r * 2.1;
    const cxL = sm + wL / 2;
    const cyL = CH - bm - hL / 2;
    const xL = cxL - wL / 2, yL = cyL - hL / 2;
    const maxTravelL = (wL - 2 * r) / 2;
    JOY.boundsL = { x: xL, y: yL, w: wL, h: hL, cx: cxL, cy: cyL, maxTravel: maxTravelL, r: r };

    // --- 2. Right Vertical Dual Slider (Height = 2x Diameter, Snaps to Top) ---
    const wR = r * 2.1, hR = r * 4.0;
    const cxR = CW - sm - wR / 2;
    const yR = CH - bm - hR;
    const xR = cxR - wR / 2;
    const cyTopR = yR + r * 1.05;
    const maxTravelR = hR - 2.1 * r;
    JOY.boundsR = { x: xR, y: yR, w: wR, h: hR, cx: cxR, cyTop: cyTopR, maxTravel: maxTravelR, r: r };

    // Smooth visual interpolation for knobs
    JOY.leftVisX += (JOY.leftX - JOY.leftVisX) * 0.40;
    JOY.rightVisY += (JOY.rightY - JOY.rightVisY) * 0.45;

    // --- Render Left Horizontal Track ---
    g.save();
    rr(g, xL, yL, wL, hL, hL / 2);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    g.stroke();

    // Subtle track slot guideline
    g.beginPath();
    g.moveTo(cxL - maxTravelL * 0.85, cyL);
    g.lineTo(cxL + maxTravelL * 0.85, cyL);
    g.lineWidth = 2.5;
    g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    g.stroke();

    // Faint chevrons
    ptxt('◀', xL + r * 0.55, cyL, FN(11, 900), 'rgba(255, 255, 255, 0.28)');
    ptxt('▶', xL + wL - r * 0.55, cyL, FN(11, 900), 'rgba(255, 255, 255, 0.28)');

    // Render Left Knob (rests in center)
    const kxL = cxL + JOY.leftVisX * maxTravelL;
    const leftActive = (TOUCH.left || TOUCH.right);
    g.beginPath();
    g.arc(kxL, cyL, r * 0.88, 0, Math.PI * 2);
    g.fillStyle = leftActive ? 'rgba(0, 210, 211, 0.45)' : 'rgba(255, 255, 255, 0.22)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = leftActive ? '#00d2d3' : 'rgba(255, 255, 255, 0.60)';
    g.stroke();
    g.beginPath();
    g.arc(kxL, cyL, 3, 0, Math.PI * 2);
    g.fillStyle = leftActive ? '#ffffff' : 'rgba(255, 255, 255, 0.50)';
    g.fill();

    // --- Render Right Vertical Track ---
    rr(g, xR, yR, wR, hR, wR / 2);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    g.stroke();

    // Subtle vertical slot guideline
    g.beginPath();
    g.moveTo(cxR, cyTopR + r * 0.2);
    g.lineTo(cxR, cyTopR + maxTravelR);
    g.lineWidth = 2.5;
    g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    g.stroke();

    // Faint down chevron at bottom of slider track
    ptxt('▼', cxR, yR + hR - r * 0.6, FN(11, 900), TOUCH.downHeld ? '#eb4b9b' : 'rgba(235, 75, 155, 0.35)');

    // Render Right Knob (snaps to top, tap jumps, drag down drops)
    const kyR = cyTopR + JOY.rightVisY * maxTravelR;
    g.beginPath();
    g.arc(cxR, kyR, r * 0.88, 0, Math.PI * 2);
    if(TOUCH.downHeld){
      g.fillStyle = 'rgba(235, 75, 155, 0.55)';
      g.strokeStyle = '#eb4b9b';
    } else if(TOUCH.jumpHeld){
      g.fillStyle = 'rgba(46, 204, 113, 0.55)';
      g.strokeStyle = '#2ecc71';
    } else {
      g.fillStyle = 'rgba(255, 255, 255, 0.22)';
      g.strokeStyle = 'rgba(255, 255, 255, 0.60)';
    }
    g.fill();
    g.lineWidth = 2;
    g.stroke();

    // Icon inside knob (▲ for Jump, ▼ when dragged down for Drop)
    const knobIcon = (JOY.rightVisY > 0.40) ? '▼' : '▲';
    const knobCol = (TOUCH.downHeld || TOUCH.jumpHeld) ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
    ptxt(knobIcon, cxR, kyR + (knobIcon === '▲' ? -1 : 1), FN(12, 900), knobCol);

    g.restore();
  }
```
