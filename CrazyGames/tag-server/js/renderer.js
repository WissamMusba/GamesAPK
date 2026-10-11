/* ================= text/ui ================= */
function txt(s,x,y,font,col,align,alpha){
  g.save();
  if(alpha!==undefined)g.globalAlpha=alpha;
  g.font=font;g.fillStyle=col;g.textAlign=align||'center';g.textBaseline='middle';
  g.fillText(s,x,y);g.restore();
}
function ptxt(s,x,y,font,fill,align,lw){
  g.save();
  g.font=font;g.textAlign=align||'center';g.textBaseline='middle';g.lineJoin='round';
  const m=/([0-9.]+)px/.exec(font);
  g.strokeStyle=INK;g.lineWidth=lw||Math.max(3,(m?parseFloat(m[1]):14)*0.16);
  g.strokeText(s,x,y);
  g.fillStyle=fill||'#ffffff';g.fillText(s,x,y);
  g.restore();
}
function pill(x,y,w,h,fill,stroke){
  rr(g,x,y,w,h,h/2);
  g.fillStyle=fill;g.fill();
  if(stroke){g.lineWidth=2.5;g.strokeStyle=stroke;g.stroke();}
}
function fmtTime(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

function shadeColor(color, percent) {
  if(!color) return '#1e293b';
  if(color.startsWith('rgba') || color.startsWith('rgb')) return 'rgba(0,0,0,0.35)';
  let num = parseInt(color.replace('#',''), 16);
  if(isNaN(num)) return '#141414';
  let amt = Math.round(2.55 * percent);
  let R = clamp((num >> 16) + amt, 0, 255);
  let G = clamp(((num >> 8) & 0x00FF) + amt, 0, 255);
  let B = clamp((num & 0x0000FF) + amt, 0, 255);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function drawJuicyBtn(x, y, w, h, o){
  o = o || {};
  const r = (o.r !== undefined) ? o.r : Math.min(14, Math.floor(h / 2));
  const depth = (o.depth !== undefined) ? o.depth : clamp(Math.round(h * 0.11), 3, 5);
  const isHover = !isTouch && isPointerIn(x, y, w, h + depth);
  const isPress = isHover && pointerDown;
  const disabled = !!o.disabled;
  
  const pushY = disabled ? 0 : (isPress ? (depth - 1) : (isHover ? -1 : 0));
  const curDepth = disabled ? depth : (isPress ? 1 : (isHover ? depth + 1 : depth));
  
  const baseBg = disabled ? '#64748b' : (o.bg || '#2ecc71');
  const darkBg = disabled ? '#334155' : (o.darkBg || (baseBg.startsWith('#') ? shadeColor(baseBg, -36) : 'rgba(0,0,0,0.35)'));
  
  g.save();
  // 1. Ambient soft drop shadow
  rr(g, x, y + depth + 2, w, h, r);
  g.fillStyle = 'rgba(15, 23, 42, 0.22)';
  g.fill();
  
  // 2. 3D Bottom Bevel / Extrusion
  rr(g, x, y + pushY + curDepth, w, h, r);
  g.fillStyle = darkBg;
  g.fill();
  g.lineWidth = o.borderWidth || 2.5;
  g.strokeStyle = o.borderColor || INK;
  g.stroke();
  
  // 3. Top Button Face
  rr(g, x, y + pushY, w, h, r);
  if(o.gradient && !disabled){
    const grad = g.createLinearGradient(x, y + pushY, x, y + pushY + h);
    grad.addColorStop(0, shadeColor(baseBg, 12));
    grad.addColorStop(1, baseBg);
    g.fillStyle = grad;
  } else {
    g.fillStyle = (isHover && !disabled && baseBg.startsWith('#')) ? shadeColor(baseBg, 10) : baseBg;
  }
  g.fill();
  
  // 4. Glossy Top Sheen
  g.save();
  rr(g, x, y + pushY, w, h, r);
  g.clip();
  
  const glossH = Math.max(8, h * 0.44);
  const glossGrad = g.createLinearGradient(x, y + pushY, x, y + pushY + glossH);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
  g.fillStyle = glossGrad;
  g.fillRect(x, y + pushY, w, glossH);
  
  // Specular shine sweep across button (juice!)
  if(o.shine && !disabled){
    const shineProgress = ((tGlobal * 0.75) % 2.8) - 0.4;
    if(shineProgress >= 0 && shineProgress <= 1.4){
      const shineX = x - w * 0.3 + shineProgress * (w * 1.6);
      const sGrad = g.createLinearGradient(shineX - 25, y + pushY, shineX + 25, y + pushY);
      sGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      sGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = sGrad;
      g.transform(1, 0, -0.3, 1, 0, 0);
      g.fillRect(shineX - 30, y + pushY - 10, 60, h + 20);
    }
  }
  g.restore(); // end gloss clip
  
  // 5. Button Outline
  rr(g, x, y + pushY, w, h, r);
  g.lineWidth = o.borderWidth || 2.5;
  g.strokeStyle = o.borderColor || INK;
  g.stroke();
  
  // 6. Label & Subtext
  const textCol = disabled ? '#94a3b8' : (o.textColor || '#ffffff');
  const cy = y + pushY + h / 2;
  const cx = x + w / 2;
  
  if(o.label){
    const fs = o.fontSize || clamp(h * 0.40, 11, 18);
    const sub = o.sub;
    const fontStr = o.font || (o.boldFont ? FT(fs) : FN(fs, 900));
    
    g.save();
    g.font = fontStr;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    
    const textY = cy + (sub ? -h * 0.12 : 1);
    
    if(o.textShadow !== false){
      g.fillStyle = o.textShadow || (textCol === '#ffffff' ? 'rgba(0, 0, 0, 0.40)' : 'rgba(255, 255, 255, 0.50)');
      g.fillText(o.label, cx, textY + 1.2);
    }
    g.fillStyle = textCol;
    g.fillText(o.label, cx, textY);
    
    if(sub){
      const subFs = o.subFontSize || Math.max(9, fs * 0.65);
      g.font = FN(subFs, 800);
      g.fillStyle = o.subColor || (textCol === '#ffffff' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.70)');
      g.fillText(sub, cx, cy + h * 0.26);
    }
    g.restore();
  }
  
  if(o.badge){
    const bw = 32, bh = 14;
    const bx = x + w - bw - 2, by = y + pushY - 4;
    rr(g, bx, by, bw, bh, 4);
    g.fillStyle = '#ff4757'; g.fill();
    g.lineWidth = 1; g.strokeStyle = '#ffffff'; g.stroke();
    txt(o.badge, bx + bw/2, by + bh/2 + 1, FN(8, 900), '#ffffff');
  }
  
  g.restore();
  
  if(o.fn && !disabled){
    zone(x, y, w, h + depth, { fn: o.fn });
  }
}

function drawJuicyIconBtn(x, y, sz, o){
  o = o || {};
  const r = o.r || 9;
  const depth = o.depth || 3;
  const isHover = !isTouch && isPointerIn(x, y, sz, sz + depth);
  const isPress = isHover && pointerDown;
  const pushY = isPress ? (depth - 1) : (isHover ? -1 : 0);
  const curDepth = isPress ? 1 : (isHover ? depth + 1 : depth);
  const baseBg = o.bg || 'rgba(255, 255, 255, 0.94)';
  const darkBg = o.darkBg || (baseBg.startsWith('#') ? shadeColor(baseBg, -25) : 'rgba(203, 213, 225, 0.95)');
  
  g.save();
  rr(g, x, y + depth + 1, sz, sz, r);
  g.fillStyle = 'rgba(15, 23, 42, 0.20)';
  g.fill();
  
  rr(g, x, y + pushY + curDepth, sz, sz, r);
  g.fillStyle = darkBg;
  g.fill();
  g.lineWidth = 2.2;
  g.strokeStyle = INK;
  g.stroke();
  
  rr(g, x, y + pushY, sz, sz, r);
  g.fillStyle = (isHover && baseBg.startsWith('#')) ? shadeColor(baseBg, 8) : baseBg;
  g.fill();
  
  g.save();
  rr(g, x, y + pushY, sz, sz, r);
  g.clip();
  const glossH = sz * 0.44;
  const glossGrad = g.createLinearGradient(x, y + pushY, x, y + pushY + glossH);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
  g.fillStyle = glossGrad;
  g.fillRect(x, y + pushY, sz, glossH);
  g.restore();
  
  rr(g, x, y + pushY, sz, sz, r);
  g.lineWidth = 2.2;
  g.strokeStyle = INK;
  g.stroke();
  
  if(o.renderContent){
    o.renderContent(x, y + pushY, sz);
  } else if(o.icon){
    g.font = FN(o.iconSize || Math.floor(sz * 0.46), 900);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = o.iconColor || '#1e293b';
    g.fillText(o.icon, x + sz/2, y + pushY + sz/2 + 1);
  }
  g.restore();
  
  if(o.fn || o.upFn){
    zone(x, y, sz, sz + depth, { fn: o.fn, upFn: o.upFn });
  }
}

/* Crisp vector refresh glyph — resolution-independent circular arrow, no emoji-font lottery */
function drawRefreshGlyph(cx, cy, r, col){
  g.save();
  g.strokeStyle = col; g.fillStyle = col;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = Math.max(1.6, r * 0.36);
  const a1 = -Math.PI / 2;              // arc ends at top...
  const a0 = a1 - Math.PI * 1.62;       // ...sweeping ~292deg clockwise (gap upper-right)
  g.beginPath();
  g.arc(cx, cy, r, a0, a1);
  g.stroke();
  // arrowhead at arc end, pointing clockwise along tangent
  const ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r;
  const tx = -Math.sin(a1), ty = Math.cos(a1);
  const px = -ty, py = tx, s = r * 1.05, k = s * 0.62;
  g.beginPath();
  g.moveTo(ex + tx * s, ey + ty * s);
  g.lineTo(ex + px * k, ey + py * k);
  g.lineTo(ex - px * k, ey - py * k);
  g.closePath();
  g.fill();
  g.restore();
}

/* Shared vertical jump/drop slider — the solo right-slider look & feel, reused
   verbatim for each local half so both control schemes are pixel-identical:
   tap top = jump ▲, drag down = drop v. */
function drawVertSlider(cx, cyTop, maxTravel, r, jumpHeld, downHeld, visY){
  const sw = r * 2.1, sh = maxTravel + r * 2.1;
  const x0 = cx - sw / 2, y0 = cyTop - r * 1.05;
  rr(g, x0, y0, sw, sh, sw / 2);
  g.fillStyle = 'rgba(255, 255, 255, 0.08)';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  g.stroke();
  g.beginPath();
  g.moveTo(cx, cyTop + r * 0.2);
  g.lineTo(cx, cyTop + maxTravel);
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.stroke();
  const cyBot = y0 + sh - r * 1.05;
  g.beginPath();
  g.arc(cx, cyBot, r * 0.76, 0, TAU);
  g.fillStyle = downHeld ? 'rgba(235, 75, 155, 0.45)' : 'rgba(235, 75, 155, 0.14)';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = downHeld ? '#eb4b9b' : 'rgba(235, 75, 155, 0.50)';
  g.stroke();
  ptxt('v', cx, cyBot + 1, FN(11, 900), downHeld ? '#ffffff' : 'rgba(235, 75, 155, 0.85)');
  const ky = cyTop + visY * maxTravel;
  g.beginPath();
  g.arc(cx, ky, r * 0.88, 0, TAU);
  if(downHeld || visY > 0.25){
    g.fillStyle = 'rgba(235, 75, 155, 0.65)';
    g.strokeStyle = '#eb4b9b';
  } else if(jumpHeld){
    g.fillStyle = 'rgba(46, 204, 113, 0.65)';
    g.strokeStyle = '#2ecc71';
  } else {
    g.fillStyle = 'rgba(255, 255, 255, 0.22)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.60)';
  }
  g.fill();
  g.lineWidth = 2;
  g.stroke();
  const ic = (downHeld || visY > 0.25) ? 'v' : '▲';
  const icCol = (downHeld || jumpHeld || visY > 0.25) ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
  ptxt(ic, cx, ky + (ic === '▲' ? -1 : 1), FN(12, 900), icCol);
}

/* Crisp vector microphone glyph (mute/unmute) — no emoji */
function drawMicGlyph(cx, cy, s, col, muted){
  g.save();
  g.strokeStyle = col; g.fillStyle = col;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // capsule body
  const bw = s * 0.62, bh = s * 1.0;
  const bx = cx - bw / 2, by = cy - bh / 2 - s * 0.14;
  g.lineWidth = Math.max(1.6, s * 0.18);
  rr(g, bx, by, bw, bh, bw / 2); g.stroke();
  // grille tick
  g.lineWidth = Math.max(1.2, s * 0.12);
  g.beginPath(); g.moveTo(bx + bw * 0.28, by + bh * 0.32); g.lineTo(bx + bw * 0.72, by + bh * 0.32); g.stroke();
  // cradle
  const crY = by + bh * 0.78;
  g.lineWidth = Math.max(1.6, s * 0.15);
  g.beginPath(); g.arc(cx, crY, s * 0.52, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  // stand + base
  g.beginPath(); g.moveTo(cx, crY + s * 0.52); g.lineTo(cx, cy + s * 0.95); g.stroke();
  g.beginPath(); g.moveTo(cx - s * 0.36, cy + s * 0.95); g.lineTo(cx + s * 0.36, cy + s * 0.95); g.stroke();
  // muted slash
  if(muted){
    g.lineWidth = Math.max(2, s * 0.22);
    g.strokeStyle = '#ff4757';
    g.beginPath(); g.moveTo(cx - s * 0.85, cy - s * 0.95); g.lineTo(cx + s * 0.85, cy + s * 0.95); g.stroke();
  }
  g.restore();
}

function drawJuicyChip(x, y, w, h, o){
  o = o || {};
  const r = o.r || 6;
  const depth = o.depth || 3;
  const isHover = !isTouch && isPointerIn(x, y, w, h + depth);
  const isPress = isHover && pointerDown;
  const pushY = isPress ? (depth - 1) : (isHover ? -1 : 0);
  const curDepth = isPress ? 1 : (isHover ? depth + 1 : depth);
  const active = !!o.active;
  const baseBg = active ? (o.activeBg || '#2ed573') : (o.bg || 'rgba(255, 255, 255, 0.12)');
  const darkBg = active ? (o.activeDarkBg || (baseBg.startsWith('#') ? shadeColor(baseBg, -30) : 'rgba(0, 0, 0, 0.35)')) : (o.darkBg || 'rgba(0, 0, 0, 0.28)');
  
  g.save();
  rr(g, x, y + pushY + curDepth, w, h, r);
  g.fillStyle = darkBg;
  g.fill();
  g.lineWidth = active ? 2 : 1.5;
  g.strokeStyle = active ? (o.activeBorder || INK) : (o.border || 'rgba(255, 255, 255, 0.25)');
  g.stroke();
  
  rr(g, x, y + pushY, w, h, r);
  g.fillStyle = isHover && !active ? 'rgba(255, 255, 255, 0.22)' : baseBg;
  g.fill();
  
  g.save();
  rr(g, x, y + pushY, w, h, r);
  g.clip();
  const glossH = h * 0.44;
  const glossGrad = g.createLinearGradient(x, y + pushY, x, y + pushY + glossH);
  glossGrad.addColorStop(0, active ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.18)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  g.fillStyle = glossGrad;
  g.fillRect(x, y + pushY, w, glossH);
  g.restore();
  
  rr(g, x, y + pushY, w, h, r);
  g.lineWidth = active ? 2 : 1.5;
  g.strokeStyle = active ? (o.activeBorder || INK) : (o.border || 'rgba(255, 255, 255, 0.25)');
  g.stroke();
  
  if(o.label){
    const fs = o.fontSize || 11;
    const col = active ? (o.activeText || '#ffffff') : (o.textColor || '#94a3b8');
    g.font = FN(fs, 900);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let txC = x + w/2;
    if(o.icon === 'refresh'){
      // vector glyph + optically centered icon+text group (no emoji)
      const tw = g.measureText(o.label).width;
      const gs = fs * 1.05, gap = 5;
      drawRefreshGlyph(txC - (tw + gap + gs) / 2 + gs / 2, y + pushY + h/2 + 1, gs / 2, col);
      txC += (gs + gap) / 2;
    } else if(o.icon === 'mic'){
      const tw = g.measureText(o.label).width;
      const gs = fs * 1.05, gap = 5;
      drawMicGlyph(txC - (tw + gap + gs) / 2 + gs / 2, y + pushY + h/2 + 1, gs / 2, col, !!o.iconMuted);
      txC += (gs + gap) / 2;
    }
    if(active && col === '#ffffff'){
      g.fillStyle = 'rgba(0, 0, 0, 0.35)';
      g.fillText(o.label, txC, y + pushY + h/2 + 2);
    }
    g.fillStyle = col;
    g.fillText(o.label, txC, y + pushY + h/2 + 1);
  }
  
  if(o.badge){
    const nbFs = (o.badge.length > 5 ? 6.5 : (o.badge.length > 3 ? 7 : 7.5));
    g.font = FN(nbFs, 900);
    const tw = g.measureText(o.badge).width;
    const nbW = Math.max(26, Math.floor(tw + 8)), nbH = 13;
    const nbX = x + w - nbW - 2, nbY = y + pushY - 4;
    rr(g, nbX, nbY, nbW, nbH, 3);
    g.fillStyle = o.badgeBg || '#ff4757'; g.fill();
    g.lineWidth = 1; g.strokeStyle = '#ffffff'; g.stroke();
    txt(o.badge, nbX + nbW/2, nbY + nbH/2 + 1, FN(nbFs, 900), '#ffffff');
  }
  
  g.restore();
  
  if(o.fn){
    zone(x, y, w, h + depth, { fn: o.fn });
  }
}

function simpleButton(x,y,w,h,label,fn,sub,bgCol){
  drawJuicyBtn(x, y, w, h, {
    label: label,
    sub: sub,
    bg: bgCol || '#ffffff',
    darkBg: bgCol ? shadeColor(bgCol, -30) : '#cbd5e1',
    textColor: bgCol ? '#ffffff' : '#1c6b38',
    textShadow: bgCol ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.7)',
    r: Math.floor(h / 2),
    depth: clamp(Math.round(h * 0.12), 3, 5),
    fn: fn,
    shine: true
  });
}
function padGlyph(x,y,s,lit){
  g.save();
  g.translate(x,y);
  rr(g,-s,-s*0.6,s*2,s*1.2,s*0.5);
  g.fillStyle=lit?'#3a5a3a':'#22301c';g.fill();
  g.lineWidth=2.5;g.strokeStyle=lit?'#ffffff':'rgba(255,255,255,0.4)';g.stroke();
  g.fillStyle=lit?'#ffffff':'rgba(255,255,255,0.4)';
  g.fillRect(-s*0.55,-s*0.12,s*0.5,s*0.24);
  g.fillRect(-s*0.42,-s*0.36,s*0.24,s*0.72);
  g.beginPath();g.arc(s*0.45,-s*0.15,s*0.14,0,TAU);g.fill();
  g.beginPath();g.arc(s*0.65,s*0.1,s*0.14,0,TAU);g.fill();
  g.restore();
}

/* ================= characters with ghost trails ================= */
function drawChar(gx,x,y,size,col,o){
  o=o||{};
  const f=o.face||'idle';
  const moving=o.moving&&o.grounded;
  gx.save();
  const shx=o.shake?(Math.random()-0.5)*o.shake:0;
  gx.translate(x+size/2+shx,y+size);
  gx.rotate(o.tilt||0);
  gx.scale(o.sx||1,o.sy||1);
  gx.translate(-size/2,-size);
  if(o.grounded&&!moving){
    gx.fillStyle=INK;
    rr(gx,size*0.2,size*0.94,size*0.2,size*0.12,size*0.06);gx.fill();
    rr(gx,size*0.6,size*0.94,size*0.2,size*0.12,size*0.06);gx.fill();
  }
  rr(gx,0,0,size,size,size*0.14);
  gx.fillStyle=col;gx.fill();
  gx.lineWidth=Math.max(2.5,size*0.09);gx.strokeStyle=INK;gx.stroke();
  gx.save();rr(gx,0,0,size,size,size*0.14);gx.clip();
  gx.fillStyle='rgba(255,255,255,0.20)';
  rr(gx,size*0.08,size*0.06,size*0.5,size*0.16,size*0.08);gx.fill();
  gx.fillStyle='rgba(0,0,0,0.14)';
  gx.fillRect(0,size*0.78,size,size*0.22);
  gx.restore();
  const lx=(o.lookX||0),ly=(o.lookY||0);
  const fx=lx*size*0.06+(o.fdir||0)*size*0.02,fy=ly*size*0.05;
  const ex1=size*0.33+fx,ex2=size*0.67+fx,ey=size*0.42+fy;
  const ew=size*0.13;let eh=size*0.17;
  gx.fillStyle=INK;
  if(f==='land'||f==='happy'){
    gx.lineWidth=size*0.06;gx.strokeStyle=INK;gx.lineCap='round';
    gx.beginPath();gx.moveTo(ex1-ew*0.7,ey+ew*0.5);gx.lineTo(ex1,ey-ew*0.4);gx.lineTo(ex1+ew*0.7,ey+ew*0.5);gx.stroke();
    gx.beginPath();gx.moveTo(ex2-ew*0.7,ey+ew*0.5);gx.lineTo(ex2,ey-ew*0.4);gx.lineTo(ex2+ew*0.7,ey+ew*0.5);gx.stroke();
    gx.fillStyle='rgba(255,120,150,0.55)';
    gx.beginPath();gx.arc(size*0.18,size*0.6,size*0.06,0,TAU);gx.fill();
    gx.beginPath();gx.arc(size*0.82,size*0.6,size*0.06,0,TAU);gx.fill();
  }else if(f==='tagged'){
    gx.lineWidth=size*0.05;gx.strokeStyle=INK;gx.lineCap='round';
    gx.beginPath();gx.moveTo(ex1-ew*0.7,ey-ew*0.7);gx.lineTo(ex1+ew*0.7,ey+ew*0.7);gx.moveTo(ex1+ew*0.7,ey-ew*0.7);gx.lineTo(ex1-ew*0.7,ey+ew*0.7);gx.stroke();
    gx.beginPath();gx.moveTo(ex2-ew*0.7,ey-ew*0.7);gx.lineTo(ex2+ew*0.7,ey+ew*0.7);gx.moveTo(ex2+ew*0.7,ey-ew*0.7);gx.lineTo(ex2-ew*0.7,ey+ew*0.7);gx.stroke();
  }else{
    if(o.blink)eh=size*0.05;
    if(f==='fall')eh=size*0.24;
    gx.fillRect(ex1-ew/2,ey-eh/2,ew,eh);
    gx.fillRect(ex2-ew/2,ey-eh/2,ew,eh);
    if(!o.blink){
      gx.fillStyle='rgba(255,255,255,0.9)';
      const gl=Math.max(1.5,size*0.045);
      gx.fillRect(ex1-ew*0.28,ey-eh*0.32,gl,gl);
      gx.fillRect(ex2-ew*0.28,ey-eh*0.32,gl,gl);
      gx.fillStyle=INK;
    }
  }
  const mx=size*0.5+fx*0.5,my=size*0.7+fy*0.4;
  if(f==='idle')gx.fillRect(mx-size*0.07,my-size*0.025,size*0.14,size*0.05);
  else if(f==='run')gx.fillRect(mx-size*0.09,my-size*0.05,size*0.18,size*0.1);
  else if(f==='jump')gx.fillRect(mx-size*0.05,my-size*0.05,size*0.1,size*0.1);
  else if(f==='fall'||f==='tagged'){gx.beginPath();gx.arc(mx,my,size*0.08,0,TAU);gx.fill();}
  else if(f==='land'||f==='happy')gx.fillRect(mx-size*0.12,my-size*0.06,size*0.24,size*0.11);
  else if(f==='sad')gx.fillRect(mx-size*0.07,my+size*0.02,size*0.14,size*0.045);
  gx.restore();
}
function faceFor(p){
  if(p.isFrozen) return 'sad';
  if(match.state==='result')return match.result.loser===match.players.indexOf(p)?'sad':'happy';
  if(p.tagT>0)return'tagged';
  if(p.landT>0)return'land';
  if(!p.grounded)return p.vy<0?'jump':'fall';
  if(Math.abs(p.vx)>60)return'run';
  return'idle';
}

/* ===== PROFESSIONAL 2.5D PLATFORMS WITH DYNAMIC MATERIALS & DEPTH ===== */
function drawPlat(s){
  g.save();
  
  /* 1. SOFT 2.5D DROP SHADOW */
  g.fillStyle='rgba(0,0,0,0.32)';
  if(!s.dy){
    g.fillRect(s.x+4, s.y+s.h, s.w-8, 7);
  }else{
    g.beginPath();
    g.moveTo(s.x+4, s.y+s.h);
    g.lineTo(s.x+s.w-4, s.y+s.dy+s.h);
    g.lineTo(s.x+s.w-4, s.y+s.dy+s.h+7);
    g.lineTo(s.x+4, s.y+s.h+7);
    g.closePath();
    g.fill();
  }
  
  if(!s.dy){
    /* ---------------- FLAT PLATFORM ---------------- */
    if(s.t==='drop'){
      /* === PINK DROP-THROUGH PLATFORM: Luminous Cyber Safety Grate === */
      // Base dark frame
      g.fillStyle='#9e1b5c';
      g.fillRect(s.x, s.y, s.w, s.h);
      // Semi-transparent vibrant pink core
      g.fillStyle='rgba(235, 75, 155, 0.88)';
      g.fillRect(s.x+2, s.y+2, s.w-4, s.h-4);
      // Animated downward drop affordance chevrons
      const pulse=0.45+0.35*Math.sin(tGlobal*4.5);
      g.fillStyle='rgba(255,255,255,'+pulse.toFixed(2)+')';
      for(let x=s.x+18; x<s.x+s.w-12; x+=32){
        g.beginPath();
        g.moveTo(x-6, s.y+8);
        g.lineTo(x, s.y+15);
        g.lineTo(x+6, s.y+8);
        g.lineTo(x+4, s.y+6);
        g.lineTo(x, s.y+11);
        g.lineTo(x-4, s.y+6);
        g.closePath();
        g.fill();
      }
      // Glowing neon top laser rail
      g.fillStyle='rgba(255,190,225,0.92)';
      g.fillRect(s.x, s.y, s.w, 3);
      g.lineWidth=2; g.strokeStyle='#3e081e';
      g.strokeRect(s.x, s.y, s.w, s.h);
      
    }else if(s.t==='speed'){
      /* === ORANGE SPEEDWAY: Animated High-Speed Conveyor Belt === */
      // Dark chassis base
      g.fillStyle='#1e2229';
      g.fillRect(s.x, s.y, s.w, s.h);
      // Vibrant safety orange running belt
      g.fillStyle='#f07818';
      g.fillRect(s.x+2, s.y+2, s.w-4, s.h-4);
      // Animated chevrons radiating outward from the middle <<> >>.
      // (Speed boosts all directions, so the pad must not imply left or right.)
      // d grows with scroll so chevrons travel OUTWARD, matching where they point.
      const scroll=(tGlobal*200)%36;
      const cxm=s.x+s.w/2;
      g.save();
      g.beginPath(); g.rect(s.x+8, s.y+3, s.w-16, s.h-6); g.clip();
      g.fillStyle='rgba(255,240,130,0.92)';
      const chevR=(x,dir)=>{
        g.beginPath();
        g.moveTo(x-8*dir, s.y+5);
        g.lineTo(x+3*dir, s.y+s.h/2);
        g.lineTo(x-8*dir, s.y+s.h-5);
        g.lineTo(x-3*dir, s.y+s.h-5);
        g.lineTo(x+8*dir, s.y+s.h/2);
        g.lineTo(x-3*dir, s.y+5);
        g.closePath();
        g.fill();
      };
      for(let d=scroll; d<s.w/2-8; d+=36){chevR(cxm+d,1);chevR(cxm-d,-1);}
      /* Hollow center diamond: two arrow outlines tip-to-tip (<>), the outward-flow origin */
      const dcy=s.y+s.h/2,ds=Math.min(13,(s.h-10)/2);
      g.lineWidth=Math.max(2.5,ds*0.35);g.lineJoin='round';g.lineCap='round';
      g.strokeStyle='rgba(255,240,130,0.95)';
      g.beginPath(); /* left arrow < */
      g.moveTo(cxm-ds*0.2, dcy-ds);
      g.lineTo(cxm-ds*1.1, dcy);
      g.lineTo(cxm-ds*0.2, dcy+ds);
      g.stroke();
      g.beginPath(); /* right arrow > */
      g.moveTo(cxm+ds*0.2, dcy-ds);
      g.lineTo(cxm+ds*1.1, dcy);
      g.lineTo(cxm+ds*0.2, dcy+ds);
      g.stroke();
      g.restore();
      // Mechanical end roller caps
      g.fillStyle='#64748b';
      rr(g, s.x, s.y+1, 8, s.h-2, 3); g.fill();
      rr(g, s.x+s.w-8, s.y+1, 8, s.h-2, 3); g.fill();
      // Glowing amber top edge
      g.fillStyle='rgba(255,255,255,0.45)';
      g.fillRect(s.x+8, s.y+1, s.w-16, 2);
      g.lineWidth=2; g.strokeStyle='#141414';
      g.strokeRect(s.x, s.y, s.w, s.h);
      
    }else if(s.t==='boost'){
      /* === BLUE BOOST PLATFORM: Pneumatic Hydraulic Launch Spring === */
      // Heavy metallic housing
      g.fillStyle='#1e293b';
      g.fillRect(s.x, s.y, s.w, s.h);
      // Visible twin spring coils
      g.strokeStyle='#94a3b8'; g.lineWidth=3;
      for(let k of [s.x+s.w*0.25, s.x+s.w*0.75]){
        g.beginPath();
        g.moveTo(k-8, s.y+s.h-4); g.lineTo(k+8, s.y+s.h-8);
        g.lineTo(k-8, s.y+s.h-12); g.lineTo(k+8, s.y+s.h-16);
        g.stroke();
      }
      // Top electric blue launch plate
      g.fillStyle='#2563eb';
      g.fillRect(s.x+3, s.y+1, s.w-6, s.h*0.55);
      // Concentric pulsing energy ripple
      const rip=(tGlobal*28)%(s.w*0.35);
      g.strokeStyle='rgba(147, 197, 253, 0.7)'; g.lineWidth=2;
      g.beginPath();
      g.ellipse(s.x+s.w/2, s.y+s.h*0.3, Math.min(s.w*0.38, rip+12), 4, 0, 0, TAU);
      g.stroke();
      // Emissive cyan top highlight
      g.fillStyle='rgba(255,255,255,0.7)';
      g.fillRect(s.x+6, s.y+1, s.w-12, 2.5);
      g.lineWidth=2.5; g.strokeStyle='#0f172a';
      g.strokeRect(s.x, s.y, s.w, s.h);
      
    }else{
      /* === SOLID PLATFORM: Tangible Distressed Hardwood & Iron Bevels === */
      // Deep 3D bottom bevel
      g.fillStyle='#23140b';
      g.fillRect(s.x, s.y+s.h-5, s.w, 5);
      // Warm rich wood/stone slab
      g.fillStyle='#4c301c';
      g.fillRect(s.x, s.y, s.w, s.h-5);
      // Plank division seams every 72px
      for(let px=s.x+72; px<s.x+s.w-20; px+=72){
        g.fillStyle='#1f1109';
        g.fillRect(px, s.y+1, 2, s.h-6);
        g.fillStyle='rgba(255,255,255,0.08)';
        g.fillRect(px+2, s.y+1, 1, s.h-6);
      }
      // Subtle metallic corner bracket rivets
      g.fillStyle='#d4af37';
      for(let rx of [s.x+8, s.x+s.w-8]){
        g.beginPath(); g.arc(rx, s.y+s.h/2-2, 2.2, 0, TAU); g.fill();
      }
      // Crisp top bevel highlight
      g.fillStyle='rgba(255,255,255,0.18)';
      g.fillRect(s.x, s.y+1, s.w, 3);
      g.lineWidth=2; g.strokeStyle='#141414';
      g.strokeRect(s.x, s.y, s.w, s.h);
    }
    
  }else{
    /* ---------------- TILTED PLATFORM / SLOPE ---------------- */
    g.beginPath();
    g.moveTo(s.x, s.y);
    g.lineTo(s.x+s.w, s.y+s.dy);
    g.lineTo(s.x+s.w, s.y+s.dy+s.h);
    g.lineTo(s.x, s.y+s.h);
    g.closePath();
    
    if(s.t==='drop') g.fillStyle='#ba2671';
    else if(s.t==='speed') g.fillStyle='#e06b12';
    else if(s.t==='boost') g.fillStyle='#2563eb';
    else g.fillStyle='#442917';
    g.fill();
    
    // Tilted top highlight
    g.strokeStyle='rgba(255,255,255,0.22)';
    g.lineWidth=3;
    g.beginPath(); g.moveTo(s.x, s.y+1); g.lineTo(s.x+s.w, s.y+s.dy+1); g.stroke();
    // Tilted bottom shadow
    g.strokeStyle='#170b05';
    g.lineWidth=4;
    g.beginPath(); g.moveTo(s.x, s.y+s.h-2); g.lineTo(s.x+s.w, s.y+s.dy+s.h-2); g.stroke();
    // Border
    g.strokeStyle='#141414'; g.lineWidth=2;
    g.stroke();
  }
  
  g.restore();
}

function drawWorld(){
  drawInterior();
  const th=THEMES[currentThemeIdx];
  const walls=[[0,0,W,WALL],[0,H-WALL,W,WALL],[0,0,WALL,H],[W-WALL,0,WALL,H]];
  for(const wl of walls){
    g.fillStyle=th.wallCol||'#3a281a';
    g.fillRect(wl[0],wl[1],wl[2],wl[3]);
    g.lineWidth=4;g.strokeStyle=INK;
    g.strokeRect(wl[0],wl[1],wl[2],wl[3]);
    g.fillStyle='rgba(255,255,255,0.08)';
    g.fillRect(wl[0]+4,wl[1]+4,wl[2]-8,Math.min(8,wl[3]-8));
  }
  for(const s of SOLIDS){if(!s.wall)drawPlat(s);}
  if(settings.gameMode === 'crown'){
    if(typeof drawCrownEntity === 'function') drawCrownEntity();
    if(typeof drawCrownWorldFX === 'function') drawCrownWorldFX();
  }
  if(settings.gameMode === 'ctf'){
    if(typeof drawCtfEntities === 'function') drawCtfEntities();
    if(typeof drawCtfWorldFX === 'function') drawCtfWorldFX();
  }
  if(settings.gameMode === 'infection'){
    if(typeof drawInfectionShockwaves === 'function') drawInfectionShockwaves();
    if(typeof drawInfectionSlime === 'function') drawInfectionSlime();
  }
}

function drawITArrow(p){
  const bob=Math.sin(tGlobal*6)*4;
  const cx=p.x+p.w/2,ty=p.y-36+bob;
  g.save();
  // Golden crown chevron badge
  g.fillStyle='#ffc107';g.strokeStyle=INK;g.lineWidth=3;g.lineJoin='round';
  g.beginPath();
  g.moveTo(cx-16,ty-15);
  g.lineTo(cx+16,ty-15);
  g.lineTo(cx,ty+5);
  g.closePath();
  g.fill();g.stroke();
  if(match&&match.state==='playing'&&match.cooldown>0){
    ptxt(String(Math.ceil(match.cooldown)),cx,ty-30,FT(28),'#ffffff');
  }
  g.restore();
}

function drawCosmeticTrail(p){
  // Kept out of circulation for now — reserved for future cosmetics shop
  return;
  if(!p.cosmeticTrail || p.cosmeticTrail.length < 2) return;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const mySlot = isOnline ? NET.mySlot : 0;
  const trailId = (p.slot === mySlot)
    ? (CAREER.trail || 0)
    : (p.slot % COSMETIC_TRAILS.length);

  g.save();
  const pts = p.cosmeticTrail;
  const n = pts.length;

  if(trailId === 0){
    // Trail 1: Speed Sparks (Default) - Electric gold/white sparks & lightning crackles
    for(let k = 0; k < n; k++){
      const pt = pts[k];
      const a = (1 - k / n) * 0.85;
      const jx = Math.sin(tGlobal * 25 + k * 3.7) * 7;
      const jy = Math.cos(tGlobal * 25 + k * 2.3) * 7;
      const sx = pt.x + jx, sy = pt.y + jy;
      const sz = Math.max(1.5, (1 - k / n) * 5.5);
      g.fillStyle = (k % 2 === 0) ? '#ffd166' : '#ffffff';
      g.beginPath();
      g.moveTo(sx, sy - sz);
      g.lineTo(sx + sz * 0.6, sy);
      g.lineTo(sx, sy + sz);
      g.lineTo(sx - sz * 0.6, sy);
      g.closePath();
      g.globalAlpha = a;
      g.fill();

      if(k < n - 1){
        const nextPt = pts[k + 1];
        g.strokeStyle = 'rgba(255, 209, 102, ' + (a * 0.65).toFixed(2) + ')';
        g.lineWidth = (1 - k / n) * 2;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(nextPt.x, nextPt.y);
        g.stroke();
      }
    }
  } else if(trailId === 1){
    // Trail 2: Neon Ribbon (Level 2+) - Luminous cyan/blue electric ribbon
    g.shadowColor = '#00d2d3';
    g.shadowBlur = 10;
    for(let k = 0; k < n - 1; k++){
      const p0 = pts[k], p1 = pts[k + 1];
      const a = (1 - k / n);
      const w0 = Math.max(2, (1 - k / n) * 16);
      g.fillStyle = 'rgba(0, 242, 254, ' + (a * 0.45).toFixed(2) + ')';
      g.beginPath();
      g.arc(p0.x, p0.y, w0 * 0.5, 0, TAU);
      g.fill();

      g.strokeStyle = 'rgba(255, 255, 255, ' + (a * 0.8).toFixed(2) + ')';
      g.lineWidth = Math.max(1, (1 - k / n) * 3);
      g.beginPath();
      g.moveTo(p0.x, p0.y);
      g.lineTo(p1.x, p1.y);
      g.stroke();
    }
  } else if(trailId === 2){
    // Trail 3: Hellfire Flames (Level 4+) - Blazing embers & fire smoke rising
    g.shadowColor = '#ef4444';
    g.shadowBlur = 8;
    for(let k = 0; k < n; k++){
      const pt = pts[k];
      const a = (1 - k / n);
      const riseY = -k * 3.5 + Math.sin(tGlobal * 14 + k) * 3;
      const flkX = Math.cos(tGlobal * 12 + k * 2) * 5;
      const fx = pt.x + flkX, fy = pt.y + riseY;
      const sz = Math.max(2, (1 - k / n) * 13);
      const col = (k < n * 0.3) ? '#fef08a' : (k < n * 0.65 ? '#f97316' : '#ef4444');
      g.fillStyle = col;
      g.globalAlpha = a * 0.65;
      g.beginPath();
      g.arc(fx, fy, sz, 0, TAU);
      g.fill();

      if(k % 2 === 0){
        g.fillStyle = '#ffffff';
        g.globalAlpha = a * 0.9;
        g.beginPath();
        g.arc(fx + Math.sin(k) * 4, fy - sz * 0.6, Math.max(1, sz * 0.25), 0, TAU);
        g.fill();
      }
    }
  } else if(trailId === 3){
    // Trail 4: Rainbow Comet (Level 6+) - Prismatic shifting chromatic star dust
    for(let k = 0; k < n; k++){
      const pt = pts[k];
      const a = (1 - k / n);
      const hue = (tGlobal * 240 + k * 35) % 360;
      const sz = Math.max(2, (1 - k / n) * 12);
      g.shadowColor = 'hsl(' + hue + ', 100%, 70%)';
      g.shadowBlur = 10;
      g.fillStyle = 'hsla(' + hue + ', 100%, 65%, ' + (a * 0.65).toFixed(2) + ')';
      g.beginPath();
      g.arc(pt.x, pt.y, sz, 0, TAU);
      g.fill();

      if(k % 3 === 0){
        const starSz = sz * 0.9;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.2;
        g.globalAlpha = a * 0.85;
        g.beginPath();
        g.moveTo(pt.x - starSz, pt.y);
        g.lineTo(pt.x + starSz, pt.y);
        g.moveTo(pt.x, pt.y - starSz);
        g.lineTo(pt.x, pt.y + starSz);
        g.stroke();
      }
    }
  }
  g.restore();
}

function drawPlayers(){
  const P=match.players;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const viewerSlot = (isOnline && NET.mySlot >= 0) ? NET.mySlot : 0;

  for(let i=0;i<P.length;i++){
    const p=P[i];
    if(p.isEliminated) continue;
    if(match.hunterMode && !shouldRenderHunterPlayer(viewerSlot, p)) continue;

    const col=getPlayerColor(p);
    const isIt=match.hunterMode
      ? false
      : (settings.teams ? (p.team === match.itTeam && match.state !== 'result') : (match.it===i&&match.state!=='result'));
    
    /* 1. Dynamic Contact Shadow on Ground/Platform */
    g.fillStyle='rgba(0,0,0,0.28)';
    g.beginPath();
    g.ellipse(p.x+p.w/2, p.y+p.h+1, p.w*0.42*(p.sx||1), 4.5*(p.sy||1), 0, 0, TAU);
    g.fill();
    
    /* Draw Ghost Afterimage Trails */
    for(let tr of p.trail){
      if(tr.alpha>0.02){
        g.save();
        g.globalAlpha=tr.alpha*0.38;
        drawChar(g,tr.x,tr.y,p.w,col,{face:'run',sx:1,sy:1,grounded:false,moving:true});
        g.restore();
      }
    }
    
    if(isIt){
      /* Pulsing fiery red-gold aura */
      const auraP=0.22+0.14*Math.sin(tGlobal*8);
      g.fillStyle='rgba(235, 60, 40, '+auraP.toFixed(2)+')';
      rr(g,p.x-8,p.y-8,p.w+16,p.h+16,14);g.fill();
      g.strokeStyle='rgba(255, 200, 40, 0.55)';
      g.lineWidth=2.5;
      rr(g,p.x-4,p.y-4,p.w+8,p.h+8,11);g.stroke();
    } else if(match.hunterMode && p.isHunter && match.cageT <= 0){
      /* Pulsing Hunter Aura */
      const hPulse = 0.25 + 0.15 * Math.sin(tGlobal * 10);
      const hCol = p.team === 0 ? ('rgba(235, 60, 40, ' + hPulse.toFixed(2) + ')') : ('rgba(56, 189, 248, ' + hPulse.toFixed(2) + ')');
      const hBorder = p.team === 0 ? 'rgba(255, 107, 129, 0.75)' : 'rgba(56, 189, 248, 0.75)';
      g.fillStyle = hCol;
      rr(g, p.x - 8, p.y - 8, p.w + 16, p.h + 16, 14); g.fill();
      g.strokeStyle = hBorder;
      g.lineWidth = 2.5;
      rr(g, p.x - 4, p.y - 4, p.w + 8, p.h + 8, 11); g.stroke();
    }

    /* Draw Cosmetic Trail behind moving players */
    drawCosmeticTrail(p);

    drawChar(g,p.x,p.y,p.w,col,{
      face:faceFor(p),sx:p.sx,sy:p.sy,tilt:clamp(p.vx*0.00025,-0.1,0.1),
      lookX:clamp(p.vx/300,-1,1)*0.7+p.face*0.3,lookY:!p.grounded?(p.vy<0?-0.8:0.8):0,
      fdir:p.face,blink:p.blink>0,shake:p.tagT>0.45?4:0,
      moving:Math.abs(p.vx)>60,grounded:p.grounded,seed:p.seed
    });

    /* Draw Infection Player FX (Zombie face, slime, Last Stand shield) */
    if(settings.gameMode === 'infection' && typeof drawInfectionPlayer === 'function'){
      drawInfectionPlayer(p);
    }
    /* Draw Bomb Player FX (Animated ticking head bomb, 2s anti-retag forcefield) */
    if(settings.gameMode === 'bomb' && typeof drawBombPlayer === 'function'){
      drawBombPlayer(p);
    }
    /* Draw Crown Player FX (Crown on head, 1.2s golden aegis shield, fatigue beacon) */
    if(settings.gameMode === 'crown' && typeof drawCrownPlayer === 'function'){
      drawCrownPlayer(p);
    }
    /* Draw CTF Player FX (Flag carrier backpack flag, 2s invulnerability shield, respawn ghost) */
    if(settings.gameMode === 'ctf' && typeof drawCtfPlayer === 'function'){
      drawCtfPlayer(p);
    }

    /* Draw crystalline ice cube over frozen players with blue glow */
    if(p.isFrozen){
      g.save();
      const isLowFX = (typeof isTouch !== 'undefined' && isTouch);
      const icePulse = 0.85 + 0.15 * Math.sin(tGlobal * 5 + (p.seed || 0));
      g.shadowColor = '#38bdf8';
      g.shadowBlur = isLowFX ? 0 : 14 * icePulse;

      const bx = p.x - 4, by = p.y - 4, bw = p.w + 8, bh = p.h + 8;
      let iceGrad = null;
      if(!isLowFX){
        iceGrad = g.createLinearGradient(bx, by, bx + bw, by + bh);
        iceGrad.addColorStop(0, 'rgba(186, 230, 253, 0.72)');
        iceGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.40)');
        iceGrad.addColorStop(1, 'rgba(14, 165, 233, 0.75)');
      }

      rr(g, bx, by, bw, bh, 8);
      g.fillStyle = iceGrad || 'rgba(56, 189, 248, 0.55)';
      g.fill();

      g.lineWidth = 2.5;
      g.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      g.stroke();

      // Crystalline facet highlights
      g.beginPath();
      g.moveTo(bx + 4, by + 4);
      g.lineTo(bx + bw * 0.4, by + 4);
      g.lineTo(bx + 4, by + bh * 0.4);
      g.closePath();
      g.fillStyle = 'rgba(255, 255, 255, 0.6)';
      g.fill();

      // Crystal prism diagonal lines
      g.lineWidth = 1.2;
      g.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      g.beginPath();
      g.moveTo(bx + bw * 0.25, by + 4);
      g.lineTo(bx + bw * 0.85, by + bh - 4);
      g.moveTo(bx + bw - 4, by + bh * 0.35);
      g.lineTo(bx + bw * 0.35, by + bh - 4);
      g.stroke();

      g.restore();

      ptxt('❄️ FROZEN', p.x + p.w / 2, p.y - 14, FN(10, 900), '#bae6fd');
    }

    if(match.hunterMode){
      if(p.isHunter){
        if(match.cageT > 0){
          drawHunterCage(p);
        } else {
          const hTitle = p.team === 0 ? '👑 RED HUNTER' : '👑 BLUE HUNTER';
          ptxt(hTitle, p.x + p.w/2, p.y - 14, FN(10.5, 900), p.team === 0 ? '#ff6b81' : '#38bdf8');
        }
      } else {
        const rName = getPlayerDisplayName(p);
        ptxt(rName, p.x + p.w/2, p.y - 12, FN(10, 900), col);
      }
    } else {
      const teamBadge = settings.teams ? ((p.team === 0 ? ' [RED]' : (p.team === 1 ? ' [BLUE]' : ' [GRN]'))) : '';
      ptxt('P'+(p.slot+1)+teamBadge,p.x+p.w/2,p.y-12,FN(11,900),col);
    }

    // Proximity voice speaking indicator
    if(typeof isPlayerSpeaking==='function' && isPlayerSpeaking(p.slot!=null?p.slot:i)){
      const spkY=p.y-26, spkX=p.x+p.w/2;
      const pulse=1+0.18*Math.sin(tGlobal*14);
      g.save();
      g.translate(spkX, spkY);
      g.scale(pulse, pulse);
      g.beginPath();g.arc(0,0,10,0,TAU);
      g.fillStyle='rgba(46, 204, 113, 0.9)';g.fill();
      g.lineWidth=1.5;g.strokeStyle='#ffffff';g.stroke();
      ptxt('🎙️',0,0.5,FN(8.5,900),'#ffffff');
      g.strokeStyle='rgba(46, 204, 113, 0.65)';g.lineWidth=1.8;
      g.beginPath();g.arc(0,0,15,-0.6,0.6);g.stroke();
      g.beginPath();g.arc(0,0,15,Math.PI-0.6,Math.PI+0.6);g.stroke();
      g.restore();
    }
    if(match.state==='playing'&&match.cooldown>0&&!match.hunterMode){
      g.save();
      g.globalAlpha=0.3+0.2*Math.sin(tGlobal*8);
      g.strokeStyle='#ffffff';g.lineWidth=3;
      g.beginPath();g.arc(p.x+p.w/2,p.y+p.h/2,p.w*0.85,0,TAU);g.stroke();
      g.restore();
    }
  }
  if(match.state!=='result'&&match.state!=='hunter_round_result'&&!match.hunterMode&&settings.gameMode!=='crown'&&settings.gameMode!=='bomb'&&settings.gameMode!=='infection'&&settings.gameMode!=='ctf'){
    if(settings.teams && match.itTeam != null){
      for(const p of P){
        if(p.team === match.itTeam) drawITArrow(p);
      }
    } else {
      drawITArrow(P[match.it]);
    }
  }
}

function drawTagPop(){
  if(!match.tagPop)return;
  const tp=match.tagPop,k=1-clamp(tp.t/0.55,0,1);
  g.save();
  g.translate(tp.x,tp.y);
  g.globalAlpha=1-k;
  g.rotate(k*0.5);
  const R=40+k*170;
  g.fillStyle='#ffcf3f';
  g.beginPath();
  for(let i=0;i<16;i++){
    const a=TAU*i/16,rad=i%2===0?R:R*0.55;
    g.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);
  }
  g.closePath();g.fill();
  g.lineWidth=5;g.strokeStyle=INK;g.stroke();
  g.rotate(-k*0.5);
  const sc=0.6+easeOut(Math.min(1,k*3))*0.5;
  g.scale(sc,sc);
  g.font=FT(46);g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  g.strokeStyle=INK;g.lineWidth=8;g.strokeText('TAG!',0,0);
  g.fillStyle='#ffffff';g.fillText('TAG!',0,0);
  g.restore();
}

