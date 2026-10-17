/**
 * vector_icons.js - Crisp SVG vector icons rendered directly on HTML5 Canvas
 * Replaces blurry emoji and raster icons with resolution-independent vector paths.
 */

(function(global) {
  'use strict';

  const TAU = Math.PI * 2;

  function drawSvgRobot(g, cx, cy, sz, col = '#ff6b81') {
    g.save();
    // Head Chassis
    const hw = sz * 0.76, hh = sz * 0.62, hr = sz * 0.16;
    const x0 = cx - hw / 2, y0 = cy - hh / 2 + sz * 0.05;
    
    // Antenna
    g.lineWidth = Math.max(1.5, sz * 0.07);
    g.strokeStyle = col;
    g.beginPath();
    g.moveTo(cx, y0);
    g.lineTo(cx, y0 - sz * 0.22);
    g.stroke();
    // Antenna orb
    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(cx, y0 - sz * 0.23, sz * 0.08, 0, TAU);
    g.fill();
    g.strokeStyle = '#000000';
    g.lineWidth = 1;
    g.stroke();

    // Ear bolts
    g.fillStyle = '#94a3b8';
    g.fillRect(x0 - sz * 0.09, cy - sz * 0.06, sz * 0.10, sz * 0.18);
    g.fillRect(x0 + hw - sz * 0.01, cy - sz * 0.06, sz * 0.10, sz * 0.18);

    // Head base
    g.beginPath();
    g.roundRect ? g.roundRect(x0, y0, hw, hh, hr) : g.rect(x0, y0, hw, hh);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = Math.max(2, sz * 0.08);
    g.strokeStyle = '#0f172a';
    g.stroke();

    // Dark Visor
    const vw = hw * 0.72, vh = hh * 0.44;
    const vx = cx - vw / 2, vy = y0 + hh * 0.22;
    g.beginPath();
    g.roundRect ? g.roundRect(vx, vy, vw, vh, sz * 0.08) : g.rect(vx, vy, vw, vh);
    g.fillStyle = '#0f172a';
    g.fill();

    // Glowing Eyes
    g.fillStyle = '#00f0ff';
    const ew = sz * 0.075;
    g.beginPath();
    g.arc(cx - vw * 0.26, vy + vh / 2, ew, 0, TAU);
    g.arc(cx + vw * 0.26, vy + vh / 2, ew, 0, TAU);
    g.fill();
    // Eye shine
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx - vw * 0.26 + 1.2, vy + vh / 2 - 1.2, ew * 0.45, 0, TAU);
    g.arc(cx + vw * 0.26 + 1.2, vy + vh / 2 - 1.2, ew * 0.45, 0, TAU);
    g.fill();

    // Mouth Grill
    g.strokeStyle = '#64748b';
    g.lineWidth = Math.max(1.2, sz * 0.05);
    g.beginPath();
    g.moveTo(cx - vw * 0.28, y0 + hh * 0.82);
    g.lineTo(cx + vw * 0.28, y0 + hh * 0.82);
    g.stroke();

    g.restore();
  }

  function drawSvgPerson(g, cx, cy, sz, col = '#ffffff') {
    g.save();
    g.fillStyle = col;
    // Head
    g.beginPath();
    g.arc(cx, cy - sz * 0.16, sz * 0.20, 0, TAU);
    g.fill();
    // Torso / Shoulders
    g.beginPath();
    g.arc(cx, cy + sz * 0.42, sz * 0.36, Math.PI * 1.15, Math.PI * 1.85);
    g.fill();
    g.restore();
  }

  function drawSvgUsers(g, cx, cy, sz, col = '#ffffff') {
    g.save();
    drawSvgPerson(g, cx - sz * 0.18, cy + sz * 0.06, sz * 0.82, 'rgba(255,255,255,0.65)');
    drawSvgPerson(g, cx + sz * 0.14, cy - sz * 0.04, sz * 0.94, col);
    g.restore();
  }

  function drawSvgGlobe(g, cx, cy, sz, col = '#00f0ff') {
    g.save();
    g.strokeStyle = col;
    g.lineWidth = Math.max(1.5, sz * 0.08);
    // Outer circle
    const r = sz * 0.40;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    // Equator line
    g.beginPath();
    g.moveTo(cx - r, cy);
    g.lineTo(cx + r, cy);
    g.stroke();
    // Meridian ellipse
    g.beginPath();
    g.ellipse(cx, cy, r * 0.45, r, 0, 0, TAU);
    g.stroke();
    g.restore();
  }

  function drawSvgStopwatch(g, cx, cy, sz, col = '#f5a623') {
    g.save();
    const r = sz * 0.34;
    // Top crown button
    g.fillStyle = col;
    g.fillRect(cx - sz * 0.07, cy - r - sz * 0.16, sz * 0.14, sz * 0.12);
    // Body circle
    g.beginPath();
    g.arc(cx, cy + sz * 0.04, r, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = Math.max(2, sz * 0.09);
    g.strokeStyle = '#0f172a';
    g.stroke();
    // Center pin
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(cx, cy + sz * 0.04, sz * 0.06, 0, TAU);
    g.fill();
    // Clock hands
    g.strokeStyle = '#0f172a';
    g.lineWidth = Math.max(1.5, sz * 0.06);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx, cy + sz * 0.04);
    g.lineTo(cx, cy + sz * 0.04 - r * 0.65);
    g.moveTo(cx, cy + sz * 0.04);
    g.lineTo(cx + r * 0.45, cy + sz * 0.04);
    g.stroke();
    g.restore();
  }

  function drawSvgCrown(g, cx, cy, sz, col = '#facc15') {
    g.save();
    const w = sz * 0.90, h = sz * 0.68;
    const y0 = cy + h * 0.32;
    // Golden crown body
    g.beginPath();
    g.moveTo(cx - w / 2, y0);
    g.lineTo(cx - w / 2, y0 - h * 0.72);
    g.lineTo(cx - w * 0.22, y0 - h * 0.36);
    g.lineTo(cx, y0 - h);
    g.lineTo(cx + w * 0.22, y0 - h * 0.36);
    g.lineTo(cx + w / 2, y0 - h * 0.72);
    g.lineTo(cx + w / 2, y0);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.lineWidth = Math.max(1.8, sz * 0.08);
    g.strokeStyle = '#0f172a';
    g.stroke();
    // Crown base rim highlight
    g.fillStyle = '#fef08a';
    g.fillRect(cx - w * 0.44, y0 - h * 0.18, w * 0.88, h * 0.14);
    // Center Ruby Jewel
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(cx, y0 - h * 0.92, sz * 0.08, 0, TAU);
    g.fill();
    g.strokeStyle = '#0f172a';
    g.lineWidth = 1;
    g.stroke();
    // Side Sapphire Jewels
    g.fillStyle = '#06b6d4';
    g.beginPath();
    g.arc(cx - w / 2, y0 - h * 0.65, sz * 0.07, 0, TAU);
    g.arc(cx + w / 2, y0 - h * 0.65, sz * 0.07, 0, TAU);
    g.fill();
    g.stroke();
    g.restore();
  }

  function drawSvgBomb(g, cx, cy, sz, col = '#ef4444') {
    g.save();
    const r = sz * 0.34;
    const by = cy + sz * 0.09;
    // Bomb fuse with spark
    g.strokeStyle = '#f59e0b';
    g.lineWidth = Math.max(2, sz * 0.08);
    g.beginPath();
    g.moveTo(cx, by - r);
    g.quadraticCurveTo(cx + sz * 0.20, by - r - sz * 0.22, cx + sz * 0.28, by - r - sz * 0.16);
    g.stroke();
    // Fiery spark glow
    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(cx + sz * 0.28, by - r - sz * 0.16, sz * 0.10, 0, TAU);
    g.fill();
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(cx + sz * 0.28, by - r - sz * 0.16, sz * 0.05, 0, TAU);
    g.fill();
    // Bomb ball
    g.beginPath();
    g.arc(cx, by, r, 0, TAU);
    g.fillStyle = '#1e293b';
    g.fill();
    g.lineWidth = Math.max(2, sz * 0.08);
    g.strokeStyle = '#0f172a';
    g.stroke();
    // Specular shine
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx - r * 0.35, by - r * 0.35, r * 0.28, 0, TAU);
    g.fill();
    g.restore();
  }

  function drawSvgFlag(g, cx, cy, sz, col = '#8b5cf6') {
    g.save();
    const poleH = sz * 0.85;
    const px = cx - sz * 0.22;
    const topY = cy - sz * 0.38;
    // Pole
    g.strokeStyle = '#94a3b8';
    g.lineWidth = Math.max(2, sz * 0.08);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(px, topY);
    g.lineTo(px, topY + poleH);
    g.stroke();
    // Finial
    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(px, topY, sz * 0.07, 0, TAU);
    g.fill();
    // Flag cloth
    const fw = sz * 0.50, fh = sz * 0.38;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(px, topY + sz * 0.05);
    g.lineTo(px + fw, topY + sz * 0.05 + fh / 2);
    g.lineTo(px, topY + sz * 0.05 + fh);
    g.closePath();
    g.fill();
    g.lineWidth = Math.max(1.5, sz * 0.06);
    g.strokeStyle = '#0f172a';
    g.stroke();
    g.restore();
  }

  function drawSvgBiohazard(g, cx, cy, sz, col = '#10b981') {
    g.save();
    g.strokeStyle = col;
    g.lineWidth = Math.max(2, sz * 0.09);
    // Outer circle
    const r = sz * 0.36;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    // Center ring
    g.fillStyle = col;
    g.beginPath();
    g.arc(cx, cy, sz * 0.14, 0, TAU);
    g.fill();
    // Three biohazard petals
    for (let i = 0; i < 3; i++) {
      const ang = (i * TAU) / 3 - Math.PI / 2;
      const px = cx + Math.cos(ang) * (r * 0.65);
      const py = cy + Math.sin(ang) * (r * 0.65);
      g.beginPath();
      g.arc(px, py, sz * 0.19, 0, TAU);
      g.stroke();
    }
    g.restore();
  }

  function drawSvgMap(g, cx, cy, sz, col = '#38bdf8') {
    g.save();
    const w = sz * 0.88, h = sz * 0.70;
    const x0 = cx - w / 2, y0 = cy - h / 2;
    const colW = w / 3;
    // 3 folded panels
    g.lineWidth = Math.max(1.5, sz * 0.08);
    g.strokeStyle = '#0f172a';
    // Panel 1 (left)
    g.beginPath();
    g.moveTo(x0, y0 + h * 0.12);
    g.lineTo(x0 + colW, y0);
    g.lineTo(x0 + colW, y0 + h * 0.88);
    g.lineTo(x0, y0 + h);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.stroke();
    // Panel 2 (center)
    g.beginPath();
    g.moveTo(x0 + colW, y0);
    g.lineTo(x0 + colW * 2, y0 + h * 0.12);
    g.lineTo(x0 + colW * 2, y0 + h);
    g.lineTo(x0 + colW, y0 + h * 0.88);
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
    g.stroke();
    // Panel 3 (right)
    g.beginPath();
    g.moveTo(x0 + colW * 2, y0 + h * 0.12);
    g.lineTo(x0 + w, y0);
    g.lineTo(x0 + w, y0 + h * 0.88);
    g.lineTo(x0 + colW * 2, y0 + h);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.stroke();
    // Map destination pin
    const px = cx, py = cy - h * 0.06;
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(px, py, sz * 0.12, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(px - sz * 0.10, py + sz * 0.04);
    g.lineTo(px, py + sz * 0.24);
    g.lineTo(px + sz * 0.10, py + sz * 0.04);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(px, py, sz * 0.045, 0, TAU);
    g.fill();
    g.restore();
  }

  function drawSvgDice(g, cx, cy, sz, col = '#f59e0b') {
    g.save();
    const d = sz * 0.78;
    const r = sz * 0.16;
    const x0 = cx - d / 2, y0 = cy - d / 2;
    // Rounded dice base
    g.beginPath();
    g.roundRect ? g.roundRect(x0, y0, d, d, r) : g.rect(x0, y0, d, d);
    g.fillStyle = col;
    g.fill();
    g.lineWidth = Math.max(1.8, sz * 0.08);
    g.strokeStyle = '#0f172a';
    g.stroke();
    // Specular highlight
    g.fillStyle = 'rgba(255, 255, 255, 0.4)';
    g.beginPath();
    g.roundRect ? g.roundRect(x0 + 2, y0 + 2, d - 4, d * 0.36, [r * 0.8, r * 0.8, 0, 0]) : g.rect(x0 + 2, y0 + 2, d - 4, d * 0.36);
    g.fill();
    // 5 Pips
    g.fillStyle = '#0f172a';
    const pr = sz * 0.07;
    const pOff = d * 0.26;
    const pips = [
      [cx, cy],
      [cx - pOff, cy - pOff],
      [cx + pOff, cy - pOff],
      [cx - pOff, cy + pOff],
      [cx + pOff, cy + pOff]
    ];
    for (const [px, py] of pips) {
      g.beginPath();
      g.arc(px, py, pr, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  function drawSvgDoubleJump(g, cx, cy, sz, col = '#22c55e') {
    g.save();
    g.strokeStyle = col;
    g.lineWidth = Math.max(2.4, sz * 0.16);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const hw = sz * 0.36;
    // Upper chevron
    const y1 = cy - sz * 0.16;
    g.beginPath();
    g.moveTo(cx - hw, y1 + sz * 0.22);
    g.lineTo(cx, y1);
    g.lineTo(cx + hw, y1 + sz * 0.22);
    g.stroke();
    // Lower chevron
    const y2 = cy + sz * 0.16;
    g.beginPath();
    g.moveTo(cx - hw, y2 + sz * 0.22);
    g.lineTo(cx, y2);
    g.lineTo(cx + hw, y2 + sz * 0.22);
    g.stroke();
    g.restore();
  }

  function drawSvgRadar(g, cx, cy, sz, col = '#38bdf8') {
    g.save();
    const r = sz * 0.44;
    // Outer tactical ring
    g.strokeStyle = col;
    g.lineWidth = Math.max(1.8, sz * 0.08);
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    // Inner rings
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    g.beginPath();
    g.arc(cx, cy, r * 0.65, 0, TAU);
    g.arc(cx, cy, r * 0.30, 0, TAU);
    g.stroke();
    // Crosshairs
    g.beginPath();
    g.moveTo(cx - r, cy);
    g.lineTo(cx + r, cy);
    g.moveTo(cx, cy - r);
    g.lineTo(cx, cy + r);
    g.stroke();
    // Center point
    g.fillStyle = '#22c55e';
    g.beginPath();
    g.arc(cx, cy, sz * 0.08, 0, TAU);
    g.fill();
    g.restore();
  }

  function drawSvgSnowflake(g, cx, cy, sz, col = '#06b6d4') {
    g.save();
    g.strokeStyle = col;
    g.lineWidth = Math.max(1.8, sz * 0.07);
    g.lineCap = 'round';
    const r = sz * 0.36;
    for (let i = 0; i < 6; i++) {
      const ang = (i * TAU) / 6;
      const x1 = cx + Math.cos(ang) * r;
      const y1 = cy + Math.sin(ang) * r;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(x1, y1);
      // Small branches
      const bx = cx + Math.cos(ang) * (r * 0.65);
      const by = cy + Math.sin(ang) * (r * 0.65);
      const b1 = ang + Math.PI / 4, b2 = ang - Math.PI / 4;
      g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(b1) * (r * 0.32), by + Math.sin(b1) * (r * 0.32));
      g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(b2) * (r * 0.32), by + Math.sin(b2) * (r * 0.32));
      g.stroke();
    }
    g.restore();
  }

  function drawSvgFlame(g, cx, cy, sz, col = '#f97316') {
    g.save();
    const w = sz * 0.65, h = sz * 0.85;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx, cy - h / 2);
    g.quadraticCurveTo(cx + w / 2, cy - h * 0.1, cx + w / 2, cy + h * 0.25);
    g.quadraticCurveTo(cx + w / 2, cy + h / 2, cx, cy + h / 2);
    g.quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2, cy + h * 0.25);
    g.quadraticCurveTo(cx - w / 2, cy - h * 0.1, cx, cy - h / 2);
    g.fill();
    g.lineWidth = Math.max(1.5, sz * 0.07);
    g.strokeStyle = '#0f172a';
    g.stroke();
    // Inner yellow flame
    g.fillStyle = '#facc15';
    g.beginPath();
    g.moveTo(cx, cy - h * 0.1);
    g.quadraticCurveTo(cx + w * 0.25, cy + h * 0.15, cx, cy + h * 0.40);
    g.quadraticCurveTo(cx - w * 0.25, cy + h * 0.15, cx, cy - h * 0.1);
    g.fill();
    g.restore();
  }

  function drawSvgCheck(g, cx, cy, sz, col = '#22c55e') {
    g.save();
    g.strokeStyle = col;
    g.lineWidth = Math.max(2.5, sz * 0.18);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(cx - sz * 0.34, cy + sz * 0.02);
    g.lineTo(cx - sz * 0.08, cy + sz * 0.28);
    g.lineTo(cx + sz * 0.34, cy - sz * 0.28);
    g.stroke();
    g.restore();
  }

  function drawSvgChevron(g, cx, cy, sz, dir = 'left', col = '#ffffff') {
    g.save();
    g.strokeStyle = col;
    g.lineWidth = Math.max(2.2, sz * 0.14);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    const d = sz * 0.28;
    if (dir === 'left') {
      g.moveTo(cx + d * 0.6, cy - d);
      g.lineTo(cx - d * 0.6, cy);
      g.lineTo(cx + d * 0.6, cy + d);
    } else if (dir === 'right') {
      g.moveTo(cx - d * 0.6, cy - d);
      g.lineTo(cx + d * 0.6, cy);
      g.lineTo(cx - d * 0.6, cy + d);
    } else if (dir === 'down') {
      g.moveTo(cx - d, cy - d * 0.5);
      g.lineTo(cx, cy + d * 0.5);
      g.lineTo(cx + d, cy - d * 0.5);
    }
    g.stroke();
    g.restore();
  }

  function drawSvgPalette(g, cx, cy, sz, col = '#f59e0b') {
    g.save();
    const r = sz * 0.40;
    // Palette body
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(cx, cy, r * 1.05, r * 0.85, -0.2, 0, TAU);
    g.fill();
    g.lineWidth = Math.max(1.8, sz * 0.08);
    g.strokeStyle = '#0f172a';
    g.stroke();
    // Paint wells
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
    for(let i = 0; i < 4; i++){
      const a = (i * TAU) / 4.8 - 0.4;
      const px = cx + Math.cos(a) * (r * 0.55);
      const py = cy + Math.sin(a) * (r * 0.42);
      g.fillStyle = colors[i];
      g.beginPath();
      g.arc(px, py, sz * 0.09, 0, TAU);
      g.fill();
    }
    // Thumb hole
    g.fillStyle = '#cbd5e1';
    g.beginPath();
    g.arc(cx - r * 0.45, cy + r * 0.20, sz * 0.08, 0, TAU);
    g.fill();
    g.restore();
  }

  function drawSvgSound(g, cx, cy, sz, col = '#22c55e', muted = false) {
    g.save();
    g.fillStyle = col;
    // Speaker horn
    g.beginPath();
    g.moveTo(cx - sz * 0.30, cy - sz * 0.16);
    g.lineTo(cx - sz * 0.12, cy - sz * 0.16);
    g.lineTo(cx + sz * 0.08, cy - sz * 0.32);
    g.lineTo(cx + sz * 0.08, cy + sz * 0.32);
    g.lineTo(cx - sz * 0.12, cy + sz * 0.16);
    g.lineTo(cx - sz * 0.30, cy + sz * 0.16);
    g.closePath();
    g.fill();
    g.lineWidth = Math.max(1.5, sz * 0.06);
    g.strokeStyle = '#0f172a';
    g.stroke();

    if(muted){
      // Red slash
      g.strokeStyle = '#ef4444';
      g.lineWidth = Math.max(2, sz * 0.10);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx + sz * 0.14, cy - sz * 0.20);
      g.lineTo(cx + sz * 0.34, cy + sz * 0.20);
      g.stroke();
    } else {
      // Sound waves
      g.strokeStyle = col;
      g.lineWidth = Math.max(1.8, sz * 0.08);
      g.lineCap = 'round';
      g.beginPath();
      g.arc(cx + sz * 0.04, cy, sz * 0.22, -Math.PI * 0.32, Math.PI * 0.32);
      g.stroke();
      g.beginPath();
      g.arc(cx + sz * 0.04, cy, sz * 0.36, -Math.PI * 0.32, Math.PI * 0.32);
      g.stroke();
    }
    g.restore();
  }

  // Export functions to global
  global.drawSvgRobot = drawSvgRobot;
  global.drawSvgPerson = drawSvgPerson;
  global.drawSvgUsers = drawSvgUsers;
  global.drawSvgGlobe = drawSvgGlobe;
  global.drawSvgStopwatch = drawSvgStopwatch;
  global.drawSvgCrown = drawSvgCrown;
  global.drawSvgBomb = drawSvgBomb;
  global.drawSvgFlag = drawSvgFlag;
  global.drawSvgBiohazard = drawSvgBiohazard;
  global.drawSvgSnowflake = drawSvgSnowflake;
  global.drawSvgFlame = drawSvgFlame;
  global.drawSvgCheck = drawSvgCheck;
  global.drawSvgChevron = drawSvgChevron;
  global.drawSvgPalette = drawSvgPalette;
  global.drawSvgSound = drawSvgSound;
  global.drawSvgMap = drawSvgMap;
  global.drawSvgDice = drawSvgDice;
  global.drawSvgDoubleJump = drawSvgDoubleJump;
  global.drawSvgRadar = drawSvgRadar;

})(typeof window !== 'undefined' ? window : globalThis);
