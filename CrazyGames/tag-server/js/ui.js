/* ================= MENU ================= */
/* ================= MENU (Fully Responsive Layout) ================= */
function slotCardRects(){
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isPortrait = (CH > CW && CW < 640);
  const isShortH = (CH < 640);
  const isPhone2P = (isTouch && !isOnline && (CW < 950 || CH < 600));
  const r = [];

  if(isPhone2P){
    // Mobile Phone Local: 2 large, prominent, easy-to-tap cards centered
    const maxRowW = Math.min(CW - 24, 460);
    const gap = 16;
    const cw = Math.floor((maxRowW - gap) / 2);
    const chh = Math.floor(clamp(CH * 0.22, 80, 115));
    const totalW = 2 * cw + gap;
    const x0 = Math.floor(CW / 2 - totalW / 2);
    const y = Math.floor(clamp(CH * 0.23, 86, 175));
    r.push({ x: x0, y: y, w: cw, h: chh });
    r.push({ x: x0 + cw + gap, y: y, w: cw, h: chh });
    return r;
  }

  if(isPortrait){
    // Mobile Portrait: 2x2 Grid so cards never get squished or overflow screen
    const marginX = Math.max(10, Math.floor(CW * 0.035));
    const gapX = 10;
    const cw = Math.floor((CW - marginX * 2 - gapX) / 2);
    const chh = isOnline ? Math.floor(clamp(CH * 0.165, 125, 155)) : Math.floor(clamp(CH * 0.11, 75, 95));
    const gapY = 8;
    const y0 = Math.floor(Math.max(96, CH * 0.155));
    for(let i = 0; i < 4; i++){
      const col = i % 2;
      const row = Math.floor(i / 2);
      r.push({
        x: marginX + col * (cw + gapX),
        y: y0 + row * (chh + gapY),
        w: cw,
        h: chh
      });
    }
    return r;
  }

  // Landscape / Laptop / Desktop: 4 cards in a single row
  const marginX = Math.max(14, Math.floor(CW * 0.025));
  const maxRowW = Math.min(CW - marginX * 2, 880);
  const gap = Math.floor(clamp(CW * 0.016, 8, 22));
  const cw = Math.floor((maxRowW - gap * 3) / 4);

  // Height adapts dynamically to CH so cards NEVER crush menu rows below
  const chh = isOnline
    ? Math.floor(clamp(CH * 0.23, isShortH ? 112 : 132, 180))
    : Math.floor(clamp(CH * 0.15, 65, 105));

  const totalW = 4 * cw + 3 * gap;
  const x0 = Math.floor(CW / 2 - totalW / 2);
  // Safely position below TAG title
  const y = isOnline
    ? Math.floor(clamp(CH * (isShortH ? 0.17 : 0.21), isShortH ? 82 : 110, 190))
    : Math.floor(clamp(CH * 0.24, 90, 210));

  for(let i = 0; i < 4; i++){
    r.push({ x: x0 + i * (cw + gap), y: y, w: cw, h: chh });
  }
  return r;
}

/* ================= MINI MAP RENDERER FOR MODAL ================= */
function drawMiniMap(gx, mIdx, mx, my, mw, mh){
  const M = MAPS[mIdx % MAPS.length];
  if(!M) return;
  gx.save();
  rr(gx, mx, my, mw, mh, 6);
  gx.clip();
  const bgGr = gx.createLinearGradient(mx, my, mx, my + mh);
  bgGr.addColorStop(0, '#100c1e');
  bgGr.addColorStop(1, '#221325');
  gx.fillStyle = bgGr;
  gx.fillRect(mx, my, mw, mh);

  const sx = mw / 2400, sy = mh / 1350;

  // Outer walls
  gx.fillStyle = '#2d1b24';
  const wallTh = 46 * sy;
  gx.fillRect(mx, my, mw, wallTh);
  gx.fillRect(mx, my + mh - wallTh, mw, wallTh);
  gx.fillRect(mx, my, 46 * sx, mh);
  gx.fillRect(mx + mw - 46 * sx, my, 46 * sx, mh);

  // Solids
  gx.fillStyle = '#7a5a43';
  for(const a of M.solids){
    gx.fillRect(mx + a[0] * sx, my + a[1] * sy, Math.max(2, a[2] * sx), Math.max(2, (a[3] || 26) * sy));
  }
  // Drops (pink)
  gx.fillStyle = '#eb4b9b';
  for(const a of M.drops){
    gx.fillRect(mx + a[0] * sx, my + a[1] * sy, Math.max(2, a[2] * sx), Math.max(2, (a[3] || 24) * sy));
  }
  // Speeds (cyan)
  gx.fillStyle = '#00d2d3';
  for(const a of M.speeds){
    gx.fillRect(mx + a[0] * sx, my + a[1] * sy, Math.max(2, a[2] * sx), Math.max(2, (a[3] || 26) * sy));
  }
  // Boosts (yellow/gold)
  gx.fillStyle = '#ffd166';
  for(const a of M.boosts){
    gx.fillRect(mx + a[0] * sx, my + a[1] * sy, Math.max(2, a[2] * sx), Math.max(2, (a[3] || 26) * sy));
  }
  gx.restore();

  rr(gx, mx, my, mw, mh, 6);
  gx.lineWidth = 1.5;
  gx.strokeStyle = (mIdx === settings.map) ? '#2ecc71' : 'rgba(255,255,255,0.2)';
  gx.stroke();
}

/* ================= 10-MAP PREVIEW MODAL ================= */
function drawMapModal(){
  if(!menu.mapModal) return;

  g.fillStyle = 'rgba(6, 9, 16, 0.88)';
  g.fillRect(0, 0, CW, CH);
  zone(0, 0, CW, CH, { fn: () => { menu.mapModal = false; sfx('back'); } });

  const modalW = Math.min(CW - 20, 880);
  const modalH = Math.min(CH - 20, 580);
  const modalX = Math.floor(CW / 2 - modalW / 2);
  const modalY = Math.floor(CH / 2 - modalH / 2);

  rr(g, modalX - 3, modalY - 3, modalW + 6, modalH + 6, 16);
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  rr(g, modalX, modalY, modalW, modalH, 14);
  g.fillStyle = '#121826'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  zone(modalX, modalY, modalW, modalH, { fn: () => {} });

  const headH = clamp(modalH * 0.11, 36, 48);
  ptxt('SELECT ARENA MAP', modalX + modalW / 2, modalY + headH / 2 + 2, FT(clamp(modalW * 0.034, 16, 22)), '#ffffff');

  const cbSz = Math.min(32, headH - 10);
  const cbX = modalX + modalW - cbSz - 12, cbY = modalY + (headH - cbSz) / 2;
  drawJuicyIconBtn(cbX, cbY, cbSz, {
    r: 8,
    depth: 3,
    bg: '#e74c3c',
    darkBg: '#b91c1c',
    icon: '✕',
    iconColor: '#ffffff',
    iconSize: 13,
    fn: () => { menu.mapModal = false; sfx('back'); }
  });

  const isWide = (modalW >= 640);
  const isMedium = (modalW >= 460 && !isWide);
  const cols = isWide ? 5 : (isMedium ? 3 : 2);
  const rows = Math.ceil(10 / cols);

  const gridPad = 12;
  const availGridW = modalW - gridPad * 2;
  const randBtnH = clamp(modalH * 0.080, 26, 34);
  const randBtnW = Math.min(availGridW, 380);
  const randBtnX = Math.floor(modalX + modalW / 2 - randBtnW / 2);
  const randBtnY = modalY + headH + 2;

  const isRand = !!settings.randomMap;
  drawJuicyBtn(randBtnX, randBtnY, randBtnW, randBtnH, {
    label: isRand ? '🎲 RANDOM ARENA  ✓' : '🎲 RANDOM ARENA  (Surprise map every match)',
    active: isRand,
    bg: isRand ? '#f39c12' : 'rgba(255, 255, 255, 0.12)',
    darkBg: isRand ? '#b45309' : 'rgba(0, 0, 0, 0.35)',
    textColor: isRand ? '#0f172a' : '#ffffff',
    textShadow: isRand ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)',
    r: 8,
    depth: 3,
    fontSize: clamp(randBtnW * 0.038, 10.5, 13),
    fn: () => {
      settings.randomMap = true;
      menu.mapModal = false;
      toast('🎲 RANDOM ARENAS: ON');
      sfx('ok');
    }
  });

  const gridTopY = randBtnY + randBtnH + 6;
  const availGridH = modalH - (gridTopY - modalY) - gridPad;
  const cellW = Math.floor((availGridW - (cols - 1) * 8) / cols);
  const cellH = Math.floor((availGridH - (rows - 1) * 8) / rows);

  for(let m = 0; m < 10; m++){
    const c = m % cols;
    const r = Math.floor(m / cols);
    const cx = modalX + gridPad + c * (cellW + 8);
    const cy = gridTopY + r * (cellH + 8);
    const isSel = (!settings.randomMap && m === settings.map);

    rr(g, cx, cy, cellW, cellH, 8);
    g.fillStyle = isSel ? 'rgba(46, 204, 113, 0.22)' : 'rgba(255,255,255,0.06)';
    g.fill();
    g.lineWidth = isSel ? 2.5 : 1.5;
    g.strokeStyle = isSel ? '#2ecc71' : 'rgba(255,255,255,0.18)';
    g.stroke();

    const labelH = clamp(cellH * 0.28, 16, 26);
    const thumbPad = 4;
    const thumbW = cellW - thumbPad * 2;
    const thumbH = Math.max(18, cellH - labelH - thumbPad * 2);
    drawMiniMap(g, m, cx + thumbPad, cy + thumbPad, thumbW, thumbH);

    if(isSel){
      const bW = 20, bH = 16;
      rr(g, cx + thumbPad + thumbW - bW - 2, cy + thumbPad + 2, bW, bH, 4);
      g.fillStyle = '#2ecc71'; g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();
      txt('✓', cx + thumbPad + thumbW - bW/2 - 2, cy + thumbPad + bH/2 + 2, FN(10, 900), '#ffffff');
    }

    const shortName = (m + 1) + '. ' + MAPS[m].name;
    const fs = clamp(cellW * 0.082, 9, 12);
    txt(shortName, cx + cellW / 2, cy + cellH - labelH / 2, FN(fs, 900), isSel ? '#2ecc71' : '#f1f2f6');

    zone(cx, cy, cellW, cellH, { fn: () => {
      settings.randomMap = false;
      settings.map = m;
      buildLevel();
      menu.mapModal = false;
      sfx('ok');
    }});
  }
}

/* ================= ONLINE MULTIPLAYER COMING SOON MODAL ================= */
function drawOnlineComingSoonModal(){
  if(!menu.onlineModal) return;

  g.fillStyle = 'rgba(6, 9, 16, 0.88)';
  g.fillRect(0, 0, CW, CH);
  zone(0, 0, CW, CH, { fn: () => { menu.onlineModal = false; sfx('back'); } });

  const modalW = Math.min(CW - 24, 460);
  const modalH = Math.min(CH - 24, 340);
  const modalX = Math.floor(CW / 2 - modalW / 2);
  const modalY = Math.floor(CH / 2 - modalH / 2);

  rr(g, modalX - 3, modalY - 3, modalW + 6, modalH + 6, 18);
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  rr(g, modalX, modalY, modalW, modalH, 16);
  g.fillStyle = '#121826'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  zone(modalX, modalY, modalW, modalH, { fn: () => {} });

  // Close Button
  const cbSz = 30;
  const cbX = modalX + modalW - cbSz - 12, cbY = modalY + 12;
  rr(g, cbX, cbY, cbSz, cbSz, 8);
  g.fillStyle = '#e74c3c'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  ptxt('✕', cbX + cbSz / 2, cbY + cbSz / 2 + 1, FN(13, 900), '#ffffff');
  zone(cbX, cbY, cbSz, cbSz, { fn: () => { menu.onlineModal = false; sfx('back'); } });

  // Header Title
  ptxt('🌐 PRIVATE MULTIPLAYER', modalX + modalW / 2, modalY + 32, FT(clamp(modalW * 0.052, 16, 21)), '#ffffff');

  // Glowing Badge
  const badgeW = 140, badgeH = 22;
  pill(modalX + modalW / 2 - badgeW / 2, modalY + 48, badgeW, badgeH, 'rgba(46, 204, 113, 0.22)', '#2ecc71');
  ptxt('🚀 COMING SOON', modalX + modalW / 2, modalY + 59, FN(10.5, 900), '#2ecc71');

  // Tentative Release Date Note Pill
  const dateW = Math.min(modalW - 48, 250), dateH = 22;
  pill(modalX + modalW / 2 - dateW / 2, modalY + 74, dateW, dateH, 'rgba(255, 209, 102, 0.16)', 'rgba(255, 209, 102, 0.6)');
  txt('📅 Target: ~Sept 31 (Tentative)', modalX + modalW / 2, modalY + 85, FN(10, 900), '#ffd166');

  // Bullet items card
  const boxY = modalY + 102;
  const boxH = modalH - 172;
  rr(g, modalX + 16, boxY, modalW - 32, boxH, 10);
  g.fillStyle = 'rgba(255, 255, 255, 0.05)'; g.fill();
  g.lineWidth = 1; g.strokeStyle = 'rgba(255, 255, 255, 0.15)'; g.stroke();

  const lines = [
    '🔒 Private Room Codes (e.g. "TAG4")',
    '📱 Cross-Platform (Phones, Tablets & PC)',
    '⚔️ 2-4 Player Tag & 2v2 Team Battles',
    '⚡ Direct Low-Latency Netplay'
  ];
  const itemH = boxH / lines.length;
  for(let i = 0; i < lines.length; i++){
    ptxt(lines[i], modalX + 28, boxY + (i + 0.5) * itemH + 1, FN(clamp(modalW * 0.033, 10.5, 12.5), 800), '#e2e8f0', 'left');
  }

  // Action Button
  const btnW = Math.min(modalW - 40, 220), btnH = 38;
  const btnX = Math.floor(modalX + modalW / 2 - btnW / 2), btnY = modalY + modalH - btnH - 16;
  rr(g, btnX - 2, btnY - 2, btnW + 4, btnH + 4, 12);
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  rr(g, btnX, btnY, btnW, btnH, 10);
  g.fillStyle = '#2ecc71'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#ffffff'; g.stroke();
  ptxt('GOT IT!', btnX + btnW / 2, btnY + btnH / 2 + 1, FT(14), '#ffffff');
  zone(btnX - 2, btnY - 2, btnW + 4, btnH + 4, { fn: () => { menu.onlineModal = false; sfx('ok'); } });
}

function cycleMap(d){
  if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){
    toast('HOST SELECTS THE ARENA');
    sfx('back');
    return;
  }
  if(settings.randomMap){
    settings.randomMap = false;
    settings.map = (d > 0) ? 0 : (MAPS.length - 1);
  } else {
    if(d > 0 && settings.map === MAPS.length - 1){
      settings.randomMap = true;
    } else if(d < 0 && settings.map === 0){
      settings.randomMap = true;
    } else {
      settings.map = (settings.map + d + MAPS.length) % MAPS.length;
    }
  }
  buildLevel();
  sfx('ui');
  if(typeof NET !== 'undefined' && NET && NET.isHost){
    netBroadcastSettings();
  }
}


/* ================= ONLINE MULTIPLAYER HUB (BROWSER & LOBBY VIEW) ================= */
let _lastOnlineFetch = 0;
function drawOnlineHub(stageY, stageH){
  // Check periodically for public room list updates if not in a room
  if(NET.role === null){
    const now = performance.now();
    if(now - _lastOnlineFetch > 2500){
      _lastOnlineFetch = now;
      netFetchPublicRooms();
    }
  }

  // Side-by-side on desktop-wide AND on touch (mobile portrait included);
  // narrow touch columns switch to compact labels so everything stays tappable.
  const isWide = (CW >= 780) || (isTouch && CW >= 380);
  const compactHub = isTouch && CW < 780;
  const pad = 12;
  const availW = (NET.role !== null) ? Math.min(CW - 24, 1080) : Math.min(CW - 24, 880);
  const startX = Math.floor(CW / 2 - availW / 2);

  // If player is IN A ROOM (as Host or Guest) -> Draw Lobby View!
  if(NET.role !== null){
    drawOnlineLobby(startX, stageY, availW, stageH);
    return;
  }

  // Not in a room: Draw Online Hub (Left: Host Game & Quick Join; Right: Public Rooms Browser)
  const leftW = isWide ? Math.floor(availW * 0.40) : availW;
  const rightW = isWide ? (availW - leftW - 14) : availW;
  const rightX = isWide ? (startX + leftW + 14) : startX;
  const leftH = isWide ? stageH : Math.floor(stageH * 0.48);
  const rightH = isWide ? stageH : (stageH - leftH - 10);
  const rightY = isWide ? stageY : (stageY + leftH + 10);

  // --- LEFT PANEL: Host / Join ---
  rr(g, startX, stageY, leftW, leftH, 12);
  g.fillStyle = 'rgba(16, 22, 34, 0.92)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.stroke();

  ptxt(compactHub ? '⚡ HOST / JOIN' : '⚡ CREATE OR JOIN ROOM', startX + leftW/2, stageY + 22, FT(clamp(leftW * 0.056, 11, 14)), '#ffd166');

  // Room Privacy Selector (Public / Private)
  const privY = stageY + 42;
  const privH = 30;
  const privW = Math.floor((leftW - 24) / 2);
  // Public button
  drawJuicyChip(startX + 10, privY, privW, privH, {
    label: compactHub ? 'PUBLIC' : '🌐 PUBLIC',
    active: NET.isPublic,
    activeBg: '#2ecc71',
    activeDarkBg: '#166534',
    activeText: '#ffffff',
    textColor: '#94a3b8',
    fontSize: 11,
    fn: () => { NET.isPublic = true; sfx('ui'); }
  });

  // Private button
  drawJuicyChip(startX + 14 + privW, privY, privW, privH, {
    label: compactHub ? 'PRIVATE' : '🔒 PRIVATE',
    active: !NET.isPublic,
    activeBg: '#f39c12',
    activeDarkBg: '#b45309',
    activeText: '#0f172a',
    textColor: '#94a3b8',
    fontSize: 11,
    fn: () => { NET.isPublic = false; sfx('ui'); }
  });

  // Big HOST ROOM button
  const hostBtnY = privY + privH + 12;
  const hostBtnH = clamp(leftH * 0.18, 34, 42);
  const hostBtnW = leftW - 20;
  drawJuicyBtn(startX + 10, hostBtnY, hostBtnW, hostBtnH, {
    label: compactHub ? '👑 HOST' : '👑 HOST NEW ROOM',
    bg: '#27ae60',
    darkBg: '#166534',
    depth: 4,
    shine: true,
    boldFont: true,
    fontSize: 13,
    fn: () => { sfx('go'); netHostAction(NET.isPublic); }
  });

  // Join Room by Code / Link Button
  const joinBtnY = hostBtnY + hostBtnH + 12;
  const joinBtnH = clamp(leftH * 0.16, 32, 38);
  drawJuicyBtn(startX + 10, joinBtnY, hostBtnW, joinBtnH, {
    label: compactHub ? '🔑 JOIN' : '🔑 ENTER ROOM CODE / LINK',
    bg: 'rgba(56, 189, 248, 0.25)',
    darkBg: 'rgba(2, 132, 199, 0.55)',
    borderColor: '#38bdf8',
    textColor: '#38bdf8',
    depth: 4,
    fontSize: 12,
    fn: () => { sfx('ui'); netJoinAction(); }
  });

  // Help info text at bottom of left card
  const infoY = joinBtnY + joinBtnH + 12;
  if(infoY < stageY + leftH - 10){
    txt('🎮 Invite friends with link or 4-6 letter code', startX + leftW/2, infoY + 8, FN(10.5, 800), '#94a3b8');
    txt('🔊 Proximity Voice Chat & Text Chat ready', startX + leftW/2, infoY + 24, FN(10, 800), '#64748b');
  }

  // --- RIGHT PANEL: Browsable Public Rooms Lobby ---
  rr(g, rightX, rightY, rightW, rightH, 12);
  g.fillStyle = 'rgba(16, 22, 34, 0.92)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.stroke();

  ptxt(rightW < 300 ? '🌐 ROOMS' : '🌐 PUBLIC ROOMS DIRECTORY', rightX + rightW/2 - 30, rightY + 20, FT(clamp(rightW * 0.045, 11, 14)), '#ffffff');

  // Polished Refresh button
  const refBtnW = 84, refBtnH = 25;
  const refBtnX = rightX + rightW - refBtnW - 10, refBtnY = rightY + 8;
  drawJuicyChip(refBtnX, refBtnY, refBtnW, refBtnH, {
    label: 'Refresh',
    icon: 'refresh',
    active: true,
    activeBg: 'rgba(56, 189, 248, 0.22)',
    activeDarkBg: 'rgba(2, 132, 199, 0.45)',
    activeText: '#38bdf8',
    activeBorder: '#38bdf8',
    fontSize: 10.5,
    fn: () => { sfx('ui'); netFetchPublicRooms(); }
  });

  // Rooms table header
  const tableY = rightY + 38;
  const rowH = clamp((rightH - 46) / 5, 28, 36);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(rightX + 6, tableY, rightW - 12, 22);
  txt('HOST / ROOM', rightX + 16, tableY + 12, FN(10, 800), '#94a3b8', 'left');
  txt('PLAYERS', rightX + rightW * 0.44, tableY + 12, FN(10, 800), '#94a3b8');
  txt('MAP / MODE', rightX + rightW * 0.68, tableY + 12, FN(10, 800), '#94a3b8');
  txt('ACTION', rightX + rightW - 38, tableY + 12, FN(10, 800), '#94a3b8');

  // Render rooms
  const rooms = NET.publicRooms || [];
  if(rooms.length === 0){
    txt('No public rooms active right now. Host one!', rightX + rightW/2, tableY + 50, FN(12, 800), '#94a3b8');
  } else {
    const maxShow = Math.min(rooms.length, 5);
    for(let r = 0; r < maxShow; r++){
      const rm = rooms[r];
      const ry = tableY + 24 + r * rowH;
      rr(g, rightX + 6, ry + 2, rightW - 12, rowH - 4, 6);
      g.fillStyle = (r % 2 === 0) ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
      g.fill();

      // Host Name & code - dynamically measured so it never overflows
      let hostDisp = (rm.hostName || 'Host') + ' (' + rm.roomId + ')';
      const hostMaxW = rightW * 0.36;
      g.font = FN(11, 900);
      if(g.measureText(hostDisp).width > hostMaxW){
        while(hostDisp.length > 5 && g.measureText(hostDisp + '…').width > hostMaxW){
          hostDisp = hostDisp.slice(0, -1);
        }
        hostDisp += '…';
      }
      txt(hostDisp, rightX + 16, ry + rowH/2, FN(11, 900), '#ffffff', 'left');
      // Players count
      txt(rm.players + '/' + (rm.maxPlayers || MAXP), rightX + rightW * 0.44, ry + rowH/2, FN(11, 800), '#ffd166');
      // Map / Mode
      const mapName = (MAPS[rm.map % MAPS.length] || {}).name || ('Map ' + ((rm.map || 0) + 1));
      const modeLabel = rm.teams ? '⚔️ Teams' : 'FFA';
      txt(mapName.slice(0, 10) + ' • ' + modeLabel, rightX + rightW * 0.68, ry + rowH/2, FN(10, 800), '#38bdf8');

      // Join button
      const jbW = 58, jbH = rowH - 8;
      const jbX = rightX + rightW - jbW - 10, jbY = ry + 4;
      const isLocked = rm.isLocked;
      drawJuicyChip(jbX, jbY, jbW, jbH, {
        label: isLocked ? '👁️ Spec' : '▶ Join',
        active: true,
        activeBg: isLocked ? '#e67e22' : '#2ecc71',
        activeDarkBg: isLocked ? '#b45309' : '#166534',
        activeText: '#ffffff',
        fontSize: 10,
        fn: () => { sfx('go'); netJoinAction(rm.roomId, rm.hostPeerId || rm.hostId || ''); }
      });
    }
  }
}

/* ================= ONLINE LOBBY VIEW (WAITLIST, ROSTER, HOST CONTROLS) ================= */
function drawOnlineLobby(startX, stageY, availW, stageH){
  // Lobby Header: Room code, Invite Link, Status
  const topH = 34;
  rr(g, startX, stageY, availW, topH, 8);
  g.fillStyle = 'rgba(20, 28, 44, 0.94)'; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.2)'; g.stroke();

  ptxt('ROOM: ' + NET.room.toUpperCase(), startX + 14, stageY + topH/2 + 1, FT(13), '#ffd166', 'left');
  try{
    const sdkOk=!!(window.CrazyGames&&window.CrazyGames.SDK&&window.CrazyGames.SDK.game&&window.CrazyGames.SDK.game.updateRoom);
    const announced=!!(window._cgLastRoom&&window._cgLastRoom.roomId===NET.room&&window._cgLastRoom.join!==false);
    const invited=!!window._cgInviteShown;
    const dot=sdkOk?(announced?'● PORTAL OK':'○ WAITING'):'○ NO SDK';
    const dotCol=!sdkOk?'#64748b':(announced?'#2ecc71':'#f39c12');
    txt(dot, startX + 118, stageY + topH/2 + 1, FN(9, 800), dotCol, 'left');
    if(!announced||!invited){ if(typeof netUpdateHostDirectory==='function'){ if(!drawOnlineLobby._portalRetry||Date.now()-drawOnlineLobby._portalRetry>4000){ drawOnlineLobby._portalRetry=Date.now(); try{netUpdateHostDirectory();}catch(e){} try{if(typeof CG!=='undefined'&&CG&&typeof CG.showInviteButton==='function')CG.showInviteButton(NET.room);}catch(e){} } } }
  }catch(e){}

  // Mic Mute/Unmute Button (vector mic glyph, no emoji)
  const micIsMuted = (typeof VOICE !== 'undefined' && !!VOICE.muted);
  const micBtnW = 86, micBtnH = 24;
  const micBtnX = startX + 212, micBtnY = stageY + 5;
  drawJuicyChip(micBtnX, micBtnY, micBtnW, micBtnH, {
    label: micIsMuted ? 'MUTED' : 'MIC',
    icon: 'mic',
    iconMuted: micIsMuted,
    active: true,
    activeBg: micIsMuted ? 'rgba(231, 76, 60, 0.25)' : 'rgba(46, 204, 113, 0.25)',
    activeDarkBg: micIsMuted ? 'rgba(185, 28, 28, 0.5)' : 'rgba(22, 101, 52, 0.5)',
    activeText: micIsMuted ? '#ff6b81' : '#2ecc71',
    activeBorder: micIsMuted ? '#e74c3c' : '#2ecc71',
    fontSize: 10.5,
    fn: () => { sfx('ui'); if(typeof voiceToggleMic === 'function') voiceToggleMic(); }
  });

  // Chat Toggle Button in Header
  const chatBtnW = 76, chatBtnH = 24;
  const chatBtnX = micBtnX + micBtnW + 8, chatBtnY = stageY + 5;
  drawJuicyChip(chatBtnX, chatBtnY, chatBtnW, chatBtnH, {
    label: '💬 Chat',
    active: true,
    activeBg: 'rgba(46, 204, 113, 0.25)',
    activeDarkBg: 'rgba(22, 101, 52, 0.5)',
    activeText: '#2ecc71',
    activeBorder: '#2ecc71',
    fontSize: 10.5,
    fn: () => { sfx('ui'); if(typeof chatToggle==='function') chatToggle(); }
  });

  // 15s Ready Countdown Badge if ticking down
  if(NET.readyCountdown !== null && NET.readyCountdown !== undefined){
    const cdStr = '⏳ Starting in ' + NET.readyCountdown + 's';
    pill(startX + availW/2 - 60, stageY + 5, 120, 24, 'rgba(231, 76, 60, 0.3)', '#ff4757');
    txt(cdStr, startX + availW/2, stageY + 18, FN(11, 900), '#ff6b81');
  }

  // Host Controls on Top Right (Add Bot, Lock Teams, Lock Lobby)
  if(NET.isHost){
    const isNarrowHeader = (availW < 740);
    const botCount = (NET.botSlots || []).length;
    const botBtnW = isNarrowHeader ? 74 : 86, botBtnH = 24;
    const ltBtnW = isNarrowHeader ? 80 : 90, ltBtnH = 24;
    const llBtnW = isNarrowHeader ? 74 : 84, llBtnH = 24;
    const leaveBtnW = isNarrowHeader ? 64 : 72;

    const llBtnX = startX + availW - leaveBtnW - 6 - llBtnW - 6;
    const ltBtnX = llBtnX - ltBtnW - 6;
    const botBtnX = ltBtnX - botBtnW - 6;

    const botLabel = botCount >= 2 ? (isNarrowHeader ? '🤖 (2/2)' : '🤖 Bots (2/2)') : (botCount === 1 ? (isNarrowHeader ? '🤖 +Bot (1/2)' : '🤖 + Bot (1/2)') : '🤖 + Bot');
    drawJuicyChip(botBtnX, stageY + 5, botBtnW, botBtnH, {
      label: botLabel,
      active: botCount > 0,
      activeBg: botCount >= 2 ? '#6366f1' : '#8b5cf6',
      activeDarkBg: botCount >= 2 ? '#4338ca' : '#6d28d9',
      activeText: '#ffffff',
      textColor: '#cbd5e1',
      fontSize: 9.5,
      fn: () => {
        if(botCount >= 2){
          netToast('Max 2 bots in online lobby! Use ✕ on slot to remove');
          sfx('back');
        } else {
          netAddBot();
        }
      }
    });

    // Lock Teams Toggle
    drawJuicyChip(ltBtnX, stageY + 5, ltBtnW, ltBtnH, {
      label: NET.teamsLocked ? '🔒 Teams Lock' : '🔓 Teams Open',
      active: NET.teamsLocked,
      activeBg: '#e74c3c',
      activeDarkBg: '#b91c1c',
      activeText: '#ffffff',
      textColor: '#cbd5e1',
      fontSize: 9.5,
      fn: () => netLockTeams(!NET.teamsLocked)
    });

    // Lock Lobby Toggle
    drawJuicyChip(llBtnX, stageY + 5, llBtnW, llBtnH, {
      label: NET.lobbyLocked ? '🔒 Locked' : '🔓 Open',
      active: NET.lobbyLocked,
      activeBg: '#e67e22',
      activeDarkBg: '#b45309',
      activeText: '#ffffff',
      textColor: '#cbd5e1',
      fontSize: 9.5,
      fn: () => netLockLobby(!NET.lobbyLocked)
    });
  }

  // Leave Room Button
  const isNarrowHeaderLeave = (availW < 740);
  const leaveBtnW = isNarrowHeaderLeave ? 64 : 72, leaveBtnH = 24;
  const leaveBtnX = startX + availW - leaveBtnW - 6, leaveBtnY = stageY + 5;
  drawJuicyChip(leaveBtnX, leaveBtnY, leaveBtnW, leaveBtnH, {
    label: '🚪 Leave',
    active: true,
    activeBg: 'rgba(231, 76, 60, 0.25)',
    activeDarkBg: 'rgba(185, 28, 28, 0.5)',
    activeText: '#ff6b81',
    activeBorder: '#e74c3c',
    fontSize: 10.5,
    fn: () => { sfx('back'); netLeaveRoom(); }
  });

  // Ensure chat overlay is enabled for room
  const chatUIEl = document.getElementById('chatUI');
  if(chatUIEl && !chatUIEl.classList.contains('online')) chatUIEl.classList.add('online');

  // Main 3-Column Layout:
  // Left: People who are playing (10 Slots Roster)
  // Center: "YOU" Player Card (scaled for desktop/laptop and mobile)
  // Right: Waiting List / Spectators
  const contentY0 = stageY + topH + 6;
  const contentH = stageH - topH - 10;

  const isShortH = (contentH < 280);
  const isNarrowW = (availW < 640);
  const panelH = isShortH ? clamp(contentH, 160, 240) : clamp(Math.floor(contentH * 0.94), 260, 420);
  const panelY = Math.floor(contentY0 + (contentH - panelH) / 2);

  // Column widths:
  const sideW = isNarrowW ? Math.max(140, Math.floor((availW - 16) * 0.31)) : clamp(Math.floor(availW * 0.28), 190, 260);

  // Left side: PLAYING
  const leftX = startX;
  const leftW = sideW;

  // Right side: WAITING LIST
  const rightW = sideW;
  const rightX = startX + availW - rightW;

  // Center: YOU
  const centerStartX = leftX + leftW + 10;
  const centerW = Math.max(160, rightX - centerStartX - 10);
  const cardW = isNarrowW ? centerW : clamp(Math.floor(centerW * 0.92), 260, 420);
  const cardX = Math.floor(centerStartX + centerW/2 - cardW/2);

  const headH = isShortH ? 24 : clamp(Math.floor(panelH * 0.09), 26, 32);

  // --- 1. LEFT PANEL: People who are playing (10-slot Roster or Hunter Mode Split Teams) ---
  if(settings.gameMode === 'hunter'){
    const gap = 8;
    const teamBoxH = Math.floor((panelH - gap) / 2);
    const teamHeadH = isShortH ? 24 : clamp(Math.floor(teamBoxH * 0.19), 26, 30);

    function drawLobbyHunterTeam(teamIdx, boxY){
      const isRed = (teamIdx === 0);
      const teamColor = isRed ? '#ff4757' : '#38bdf8';
      const isConnSlot = (s) => (s === 0 ? true : (NET.isHost ? (NET.hostInputs.has(s) || menu.slotColor[s] >= 0) : menu.slotColor[s] >= 0));
      const allTeam = Array.from({length: MAXP}, (_, i) => i).filter(s => ((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === teamIdx);
      const nTeamRows = (typeof activeSlots === 'function' && activeSlots().length > 8) ? 5 : 4;
      const connTeam = allTeam.filter(isConnSlot).slice(0, nTeamRows);
      const teamActive = connTeam;
      const electedHunter = isRed ? settings.hunterRed : settings.hunterBlue;
      // 'Fair pick' highlight: every connected voter on this team voted random
      let isRandElected = false;
      if(menu.hunterVotes){
        const tv = [];
        for(const [v, voteVal] of Object.entries(menu.hunterVotes)){
          const voter = parseInt(v);
          if(!connTeam.includes(voter)) continue;
          const cc = (voteVal && typeof voteVal === 'object') ? voteVal.cand : voteVal;
          tv.push(cc);
        }
        isRandElected = tv.length > 0 && tv.every(x => x === 'random' || x === -1 || x === '-1');
      }

      // Box frame
      rr(g, leftX, boxY, leftW, teamBoxH, 10);
      g.fillStyle = 'rgba(14, 20, 32, 0.94)'; g.fill();
      g.lineWidth = 1.5; g.strokeStyle = isRed ? 'rgba(255, 71, 87, 0.55)' : 'rgba(56, 189, 248, 0.55)'; g.stroke();

      // Team Header
      rr(g, leftX, boxY, leftW, teamHeadH, 8);
      g.fillStyle = isRed ? 'rgba(235, 60, 40, 0.35)' : 'rgba(56, 189, 248, 0.35)'; g.fill();

      // Team Title
      g.textAlign = 'left';
      const teamTitle = (isRed ? '🔴 RED (' : '🔵 BLUE (') + teamActive.length + '/' + nTeamRows + ')';
      txt(teamTitle, leftX + 8, boxY + teamHeadH/2 + 1, FN(clamp(teamHeadH * 0.42, 9.5, 11.5), 900), teamColor, 'left');

      // 🎲 Random Button in header
      const randW = clamp(leftW * 0.36, 52, 68);
      const randH = teamHeadH - 6;
      const randX = leftX + leftW - randW - 4;
      const randY = boxY + 3;
      rr(g, randX, randY, randW, randH, 4);
      g.fillStyle = isRandElected ? 'rgba(255, 209, 102, 0.35)' : 'rgba(0, 0, 0, 0.4)'; g.fill();
      g.lineWidth = 1; g.strokeStyle = isRandElected ? '#ffd166' : 'rgba(255, 255, 255, 0.25)'; g.stroke();
      txt((isRandElected ? '👑 ' : '') + '🎲 Rand', randX + randW/2, randY + randH/2 + 1, FN(clamp(randH * 0.46, 8, 10), 900), isRandElected ? '#ffd166' : '#ffffff');
      zone(randX, randY, randW, randH, { fn: () => setTeamHunterChoice(teamIdx, 'random') });

      // 4-5 Player Rows per team (tiered: <=8 keeps legacy 4 rows; 9-10 use 5)
      const rowAvailH = teamBoxH - teamHeadH - 4;
      const rowH = Math.floor(rowAvailH / nTeamRows);

      for(let i = 0; i < nTeamRows; i++){
        const s = (i < connTeam.length) ? connTeam[i] : null;
        const ry = boxY + teamHeadH + 2 + i * rowH;
        const isConn = (s !== null && isConnSlot(s));
        const isMe = (s === NET.mySlot);
        const col = getSlotColor(s, menu.slotColor, menu.slotTeam);
        const isHunterSlot = (electedHunter === s && !isRandElected);
        const votes = getCandidateVoteCount(s, teamIdx);

        rr(g, leftX + 4, ry, leftW - 8, rowH - 2, 5);
        g.fillStyle = isHunterSlot ? (isRed ? 'rgba(235, 60, 40, 0.30)' : 'rgba(56, 189, 248, 0.30)') : (isMe ? 'rgba(56, 189, 248, 0.16)' : (isConn ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.25)'));
        g.fill();
        if(isHunterSlot){
          g.lineWidth = 1.5; g.strokeStyle = '#ffd166'; g.stroke();
        } else if(isMe){
          g.lineWidth = 1.2; g.strokeStyle = '#38bdf8'; g.stroke();
        }

        if(isConn){
          const swSz = clamp(rowH - 8, 12, 16);
          rr(g, leftX + 6, ry + (rowH - swSz)/2, swSz, swSz, 3);
          g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();

          const defaultName = (s === 0 ? 'Host' : ('Guest ' + (s+1)));
          let who = NET.slotsName[s] || defaultName;
          if(isMe) who += ' (YOU)';

          const hasHostControls = (NET.isHost && !isMe);
          const rightIconsW = hasHostControls ? 70 : 48;
          const maxTextW = Math.max(28, leftW - (swSz + rightIconsW + 16));

          g.font = FN(clamp(rowH * 0.38, 8.5, 11), 900);
          g.textAlign = 'left';
          g.fillStyle = isHunterSlot ? '#ffd166' : (isMe ? '#38bdf8' : '#ffffff');
          let dispWho = who;
          if(g.measureText(dispWho).width > maxTextW){
            while(dispWho.length > 3 && g.measureText(dispWho + '…').width > maxTextW){
              dispWho = dispWho.slice(0, -1);
            }
            dispWho += '…';
          }
          g.fillText(dispWho, leftX + 6 + swSz + 4, ry + rowH/2 + 3);

          // Role Badge / Pick indicator
          const badgeX = leftX + leftW - (hasHostControls ? 50 : 26);
          if(isHunterSlot){
            ptxt('👑 HUNTER', badgeX, ry + rowH/2 + 1, FN(clamp(rowH * 0.34, 7.5, 9.5), 900), '#ffd166');
          } else {
            const vLabel = votes > 0 ? (votes + ' 🗳️') : '🎯 PICK';
            ptxt(vLabel, badgeX, ry + rowH/2 + 1, FN(clamp(rowH * 0.32, 7, 9), 800), '#94a3b8');
          }

          // Host quick kick
          if(hasHostControls){
            const qSz = clamp(rowH - 8, 12, 16);
            const qY = ry + (rowH - qSz)/2;
            const kickX = leftX + leftW - qSz - 4;
            rr(g, kickX, qY, qSz, qSz, 3);
            g.fillStyle = '#e74c3c'; g.fill();
            txt('✕', kickX + qSz/2, qY + qSz/2 + 1, FN(clamp(qSz * 0.55, 7, 9), 900), '#ffffff');
            zone(kickX, qY, qSz, qSz, { fn: () => netKickPlayer(s) });
          }

          // Tapping a row joins THAT team. The 👑/🎯 badge picks the hunter.
          zone(leftX + 4, ry, leftW - (hasHostControls ? 26 : 8), rowH - 2, { fn: () => {
            if(typeof NET !== 'undefined' && NET && NET.role !== null){
              joinTeamFromPanel(teamIdx);
            } else {
              setTeamHunterChoice(teamIdx, s);
            }
          }});
          // Hunter-pick badge (registered last = wins the tap on the badge)
          zone(badgeX - 24, ry + 1, 46, rowH - 4, { fn: () => {
            setTeamHunterChoice(teamIdx, s);
          }});
        } else {
          // Open row: tap to join THIS team (first free slot)
          const joinLabel = isRed ? '+ JOIN RED' : '+ JOIN BLUE';
          g.font = FN(clamp(rowH * 0.36, 8.5, 10.5), 800); g.textAlign = 'left'; g.fillStyle = isRed ? 'rgba(255,107,129,0.9)' : 'rgba(56,189,248,0.9)';
          g.fillText(joinLabel, leftX + 8, ry + rowH/2 + 3);
          zone(leftX + 4, ry, leftW - 8, rowH - 2, { fn: () => {
            joinTeamFromPanel(teamIdx);
          }});
        }
      }
    }

    drawLobbyHunterTeam(0, panelY);
    drawLobbyHunterTeam(1, panelY + teamBoxH + gap);
  } else {
    // --- 1. LEFT PANEL: People who are playing (10-slot Roster) ---
    rr(g, leftX, panelY, leftW, panelH, 10);
    g.fillStyle = 'rgba(14, 20, 32, 0.92)'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.2)'; g.stroke();

    rr(g, leftX, panelY, leftW, headH, 8);
    g.fillStyle = 'rgba(24, 32, 48, 0.96)'; g.fill();
    const act = activeSlots();
    ptxt('🎮 PLAYING (' + act.length + '/10)', leftX + leftW/2, panelY + headH/2 + 1, FN(clamp(headH * 0.42, 10, 12), 900), '#2ecc71');

    // 10 Slot Rows (tiered: <=8 keeps legacy 8-row rowH; 9-10 shrink to fit)
    const rowAvailH = panelH - headH - 4;
    const nLobbyRows = (act.length > 8) ? MAXP : 8;
    const rowH = Math.floor(rowAvailH / nLobbyRows);
    for(let s = 0; s < nLobbyRows; s++){
      const ry = panelY + headH + 2 + s * rowH;
      const isConn = (s === 0 ? (menu.slotColor[s] >= 0 || !NET.isHost) : (NET.isHost ? (NET.hostInputs.has(s) || menu.slotColor[s] >= 0) : menu.slotColor[s] >= 0));
      const isMe = (s === NET.mySlot);
      const col = getSlotColor(s, menu.slotColor, menu.slotTeam);
      const isRdy = !!NET.slotsReady[s];

      rr(g, leftX + 4, ry, leftW - 8, rowH - 2, 5);
      g.fillStyle = isMe ? 'rgba(56, 189, 248, 0.20)' : (isConn ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.25)');
      g.fill();
      if(isMe){ g.lineWidth = 1.5; g.strokeStyle = '#38bdf8'; g.stroke(); }

      if(isConn){
        // Mini avatar swatch
        const swSz = clamp(rowH - 8, 12, 18);
        rr(g, leftX + 7, ry + (rowH - swSz)/2, swSz, swSz, 3);
        g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();

        // Player name - dynamically measured to avoid cutoffs
        const defaultName = (s === 0 ? 'Host' : ('Guest ' + (s+1)));
        let who = NET.slotsName[s] || defaultName;
        if(isMe) who += ' (YOU)';
        else if(s === 0) who += ' 👑';

        const hasHostControls = (NET.isHost && !isMe);
        const rightIconsW = (hasHostControls ? 56 : (settings.teams ? 36 : 22));
        const maxTextW = Math.max(40, leftW - (swSz + rightIconsW + 18));
        g.font = FN(clamp(rowH * 0.38, 9, 11.5), 900);
        g.textAlign = 'left';
        g.fillStyle = isMe ? '#38bdf8' : '#ffffff';
        let dispWho = who;
        if(g.measureText(dispWho).width > maxTextW){
          while(dispWho.length > 3 && g.measureText(dispWho + '…').width > maxTextW){
            dispWho = dispWho.slice(0, -1);
          }
          dispWho += '…';
        }
        g.fillText(dispWho, leftX + 7 + swSz + 5, ry + rowH/2 + 3.5);

        // Team Badge if teams active
        if(settings.teams){
          const tm = (menu.slotTeam && menu.slotTeam[s] != null) ? menu.slotTeam[s] : (s % 2);
          const tmIcon = (TEAMS[tm] ? TEAMS[tm].icon : '🔴');
          ptxt(tmIcon, leftX + leftW - (hasHostControls ? 56 : 24), ry + rowH/2 + 1, FN(clamp(rowH * 0.35, 8.5, 10.5), 900), '#ffffff');
        }

        // Ready icon
        ptxt(isRdy ? '✓' : '⏳', leftX + leftW - (hasHostControls ? 44 : 12), ry + rowH/2 + 1, FN(clamp(rowH * 0.38, 9.5, 11.5), 900), isRdy ? '#2ecc71' : '#e67e22');

        // Host Quick Actions on other players (Swap Team, Waitlist, Kick)
        if(hasHostControls){
          // Quick Move to Waitlist (⏳)
          const qSz = clamp(rowH - 10, 13, 18);
          const qY = ry + (rowH - qSz)/2;
          const wlBtnX = leftX + leftW - qSz * 2 - 8;
          rr(g, wlBtnX, qY, qSz, qSz, 3);
          g.fillStyle = 'rgba(56, 189, 248, 0.35)'; g.fill();
          txt('⏳', wlBtnX + qSz/2, qY + qSz/2 + 1, FN(clamp(qSz * 0.55, 7.5, 9.5), 900), '#38bdf8');
          zone(wlBtnX, qY, qSz, qSz, { fn: () => netMovePlayerToWaitlist(s) });

          // Quick Kick (✕)
          const kickX = leftX + leftW - qSz - 4;
          rr(g, kickX, qY, qSz, qSz, 3);
          g.fillStyle = '#e74c3c'; g.fill();
          txt('✕', kickX + qSz/2, qY + qSz/2 + 1, FN(clamp(qSz * 0.55, 7.5, 9.5), 900), '#ffffff');
          zone(kickX, qY, qSz, qSz, { fn: () => netKickPlayer(s) });

          // Clicking the player row opens the full management dialog!
          zone(leftX + 4, ry, leftW - 36, rowH - 2, { fn: () => {
            NET.manageSlot = (NET.manageSlot === s ? null : s);
            sfx('ui');
          } });
        }
      } else {
        g.font = FN(clamp(rowH * 0.38, 9, 11), 800); g.textAlign = 'left'; g.fillStyle = '#64748b';
        g.fillText('+ P' + (s+1) + ' OPEN', leftX + 10, ry + rowH/2 + 3);
        zone(leftX + 4, ry, leftW - 8, rowH - 2, { fn: () => netClaimSlot(s) });
      }
    }
  }

  // --- 2. RIGHT PANEL: Waiting list / Spectator Queue ---
  rr(g, rightX, panelY, rightW, panelH, 10);
  g.fillStyle = 'rgba(14, 20, 32, 0.92)'; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.2)'; g.stroke();

  rr(g, rightX, panelY, rightW, headH, 8);
  g.fillStyle = 'rgba(24, 32, 48, 0.96)'; g.fill();
  const specList = NET.spectators || [];
  ptxt('⏳ WAITING LIST (' + specList.length + ')', rightX + rightW/2, panelY + headH/2 + 1, FN(clamp(headH * 0.42, 10, 12), 900), '#ffd166');

  if(specList.length === 0){
    txt('No one in waiting list', rightX + rightW/2, panelY + panelH * 0.38, FN(clamp(panelH * 0.045, 10, 12), 800), '#64748b');
    txt('Share link to invite!', rightX + rightW/2, panelY + panelH * 0.50, FN(clamp(panelH * 0.04, 9, 11), 800), '#475569');
    const invW = rightW - 28, invH = clamp(panelH * 0.10, 24, 32);
    const invX = rightX + 14, invY = panelY + panelH * 0.65;
    rr(g, invX, invY, invW, invH, 6);
    g.fillStyle = 'rgba(56, 189, 248, 0.15)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = '#38bdf8'; g.stroke();
    txt('🔗 Invite Friend', invX + invW/2, invY + invH/2 + 1, FN(clamp(invH * 0.42, 10, 12), 900), '#38bdf8');
    zone(invX, invY, invW, invH, { fn: () => { sfx('ui'); netCopyLink(); } });
  } else {
    const rowH = Math.floor(clamp((panelH - headH - 6) / Math.max(specList.length, 5), 24, 38));
    for(let i = 0; i < Math.min(specList.length, 6); i++){
      const spec = specList[i];
      const ry = panelY + headH + 3 + i * rowH;
      rr(g, rightX + 4, ry, rightW - 8, rowH - 2, 5);
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill();

      // Spectator name - dynamically fitted
      const specMaxW = rightW - (NET.isHost ? 80 : 24);
      let specDisp = '👁️ ' + (spec.name || 'Guest Spec');
      g.font = FN(clamp(rowH * 0.38, 9.5, 11.5), 800);
      if(g.measureText(specDisp).width > specMaxW){
        while(specDisp.length > 5 && g.measureText(specDisp + '…').width > specMaxW){
          specDisp = specDisp.slice(0, -1);
        }
        specDisp += '…';
      }
      txt(specDisp, rightX + 8, ry + rowH/2, FN(clamp(rowH * 0.38, 9.5, 11.5), 800), '#ffffff', 'left');

      if(NET.isHost){
        // Admit button
        const admW = clamp(rowH * 1.5, 38, 52), admH = rowH - 6;
        const admX = rightX + rightW - admW - 22, admY = ry + 3;
        rr(g, admX, admY, admW, admH, 4);
        g.fillStyle = '#27ae60'; g.fill();
        txt('ADMIT', admX + admW/2, admY + admH/2 + 1, FN(clamp(admH * 0.42, 8, 10), 900), '#ffffff');
        zone(admX, admY, admW, admH, { fn: () => netAdmitSpectator(spec.peerId) });

        // Kick spectator button
        const kSz = clamp(rowH - 10, 13, 18);
        const kX = rightX + rightW - kSz - 4, kY = ry + (rowH - kSz)/2;
        rr(g, kX, kY, kSz, kSz, 3);
        g.fillStyle = '#e74c3c'; g.fill();
        txt('✕', kX + kSz/2, kY + kSz/2 + 1, FN(clamp(kSz * 0.55, 7.5, 9.5), 900), '#ffffff');
        zone(kX, kY, kSz, kSz, { fn: () => netKickPlayer(spec.peerId) });
      }
    }
  }

  // --- 3. CENTER STAGE: "YOU" Player Card ---
  // Perfectly matching panelH in height and scaled for desktop/laptop & mobile
  rr(g, cardX - 2, panelY - 2, cardW + 4, panelH + 4, 12);
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  rr(g, cardX, panelY, cardW, panelH, 10);
  const myCol = getSlotColor(NET.mySlot, menu.slotColor, menu.slotTeam);
  g.fillStyle = 'rgba(20, 28, 44, 0.96)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = myCol; g.stroke();

  const cx = cardX + cardW/2;
  const isMeReady = (NET.mySlot >= 0 && !!NET.slotsReady[NET.mySlot]);
  const isSpectatorMe = (NET.isSpectator || NET.mySlot === -1);

  // Header: YOU (P1 HOST) or (P2 GUEST) or (SPEC)
  const myRoleStr = NET.isHost ? '👑 HOST' : (isSpectatorMe ? '👁️ SPECTATOR' : 'GUEST');
  const mySlotStr = (NET.mySlot >= 0) ? ('P' + (NET.mySlot + 1)) : 'SPEC';
  const myName = (NET.mySlot >= 0 && NET.slotsName[NET.mySlot]) ? NET.slotsName[NET.mySlot] : netGetMyProfile().name;
  const headerFontSize = isShortH ? 10.5 : (cardW > 300 ? 13 : 11.5);
  const headerY = panelY + (isShortH ? 14 : 20);

  let headDisp = 'YOU: ' + myName + ' (' + mySlotStr + ' ' + myRoleStr + ')';
  g.font = FN(headerFontSize, 900);
  if(g.measureText(headDisp).width > cardW - 16){
    headDisp = myName + ' (' + mySlotStr + ' ' + myRoleStr + ')';
    if(g.measureText(headDisp).width > cardW - 16){
      headDisp = myName.slice(0, 10) + '… (' + mySlotStr + ')';
    }
  }
  ptxt(headDisp, cx, headerY, FN(headerFontSize, 900), '#38bdf8');

  const btnW = Math.min(cardW - (isShortH ? 16 : 28), 340);
  const rdyH = isShortH ? 24 : clamp(Math.floor(panelH * 0.098), 28, 38);
  const ctrlH = isShortH ? 20 : clamp(Math.floor(panelH * 0.082), 22, 32);
  const teamH = isShortH ? 22 : clamp(Math.floor(panelH * 0.088), 24, 34);
  const pad = isShortH ? 3 : clamp(Math.floor(panelH * 0.02), 5, 8);

  const rdyY = panelY + panelH - rdyH - (isShortH ? 6 : 12);
  const ctrlY = rdyY - ctrlH - pad;
  const teamY = ctrlY - teamH - pad;

  // Mini avatar - dynamically scaled
  const avTop = headerY + (isShortH ? 12 : 20);
  const avAvailH = Math.max(20, teamY - avTop);
  const avY = avTop + avAvailH * 0.50;
  const charSz = isShortH ? clamp(avAvailH * 0.65, 20, 28) : clamp(avAvailH * 0.62, 32, 54);
  drawChar(g, cx, avY, charSz, myCol, { face: isMeReady ? 'cool' : 'happy', grounded: true, seed: (NET.mySlot >= 0 ? NET.mySlot : 0) * 3 });

  // Team / Color Selector row
  const isTeamLockedForMe = (!NET.isHost && !!NET.teamsLocked);
  rr(g, cx - btnW/2, teamY, btnW, teamH, 6);
  g.fillStyle = isTeamLockedForMe ? 'rgba(230, 126, 34, 0.20)' : 'rgba(0,0,0,0.55)'; g.fill();
  g.lineWidth = 1.2; g.strokeStyle = isTeamLockedForMe ? '#e67e22' : 'rgba(255,255,255,0.3)'; g.stroke();
  const teamFontSize = clamp(teamH * 0.42, 10, 12.5);
  if(settings.gameMode === 'hunter'){
    const myTeam = (menu.slotTeam && NET.mySlot >= 0 && menu.slotTeam[NET.mySlot] != null) ? menu.slotTeam[NET.mySlot] : ((NET.mySlot >= 0 ? NET.mySlot : 0) % 2);
    const isMeHunter = (myTeam === 0 && settings.hunterRed === NET.mySlot) || (myTeam === 1 && settings.hunterBlue === NET.mySlot);
    const crown = isMeHunter ? '  👑' : '';
    const teamLabel = isTeamLockedForMe ? ('🔒 ' + (myTeam === 0 ? '🔴 RED' : '🔵 BLUE') + crown) : ((myTeam === 0 ? '[🔴 RED]' : '🔴 RED') + '  ' + (myTeam === 1 ? '[🔵 BLUE]' : '🔵 BLUE') + crown);
    ptxt(teamLabel, cx, teamY + teamH/2 + 1, FN(teamFontSize, 900), isMeHunter ? '#ffd166' : '#ffffff');
    if(NET.mySlot >= 0){
      if(isTeamLockedForMe){
        zone(cx - btnW/2, teamY, btnW, teamH, { fn: () => { toast('TEAMS ARE LOCKED BY THE HOST'); sfx('back'); } });
      } else {
        zone(cx - btnW/2, teamY, btnW * 0.45, teamH, { fn: () => setPlayerTeam(NET.mySlot, 0) });
        zone(cx + btnW * 0.05, teamY, btnW * 0.45, teamH, { fn: () => setPlayerTeam(NET.mySlot, 1) });
      }
    }
  } else if(settings.teams){
    const myTeam = (menu.slotTeam && NET.mySlot >= 0 && menu.slotTeam[NET.mySlot] != null) ? menu.slotTeam[NET.mySlot] : ((NET.mySlot >= 0 ? NET.mySlot : 0) % 2);
    const teamLabel = isTeamLockedForMe ? ('🔒 ' + (myTeam === 0 ? '🔴 RED' : '🔵 BLUE')) : ((myTeam === 0 ? '[🔴 RED]' : '🔴 RED') + '  ' + (myTeam === 1 ? '[🔵 BLUE]' : '🔵 BLUE'));
    ptxt(teamLabel, cx, teamY + teamH/2 + 1, FN(teamFontSize, 900), isTeamLockedForMe ? '#ffd166' : '#ffffff');
    if(NET.mySlot >= 0){
      if(isTeamLockedForMe){
        zone(cx - btnW/2, teamY, btnW, teamH, { fn: () => { toast('TEAMS ARE LOCKED BY THE HOST'); sfx('back'); } });
      } else {
        zone(cx - btnW/2, teamY, btnW * 0.45, teamH, { fn: () => setPlayerTeam(NET.mySlot, 0) });
        zone(cx + btnW * 0.05, teamY, btnW * 0.45, teamH, { fn: () => setPlayerTeam(NET.mySlot, 1) });
      }
    }
  } else {
    const curCol = (NET.mySlot >= 0 && menu.slotColor[NET.mySlot] >= 0) ? menu.slotColor[NET.mySlot] : (NET.mySlot >= 0 ? NET.mySlot : 0);
    const colName = (PALETTE[curCol % PALETTE.length] || PALETTE[0]).name;
    const colLabel = isTeamLockedForMe ? ('🔒 🎨 ' + colName) : ('‹  🎨 ' + colName + '  ›');
    ptxt(colLabel, cx, teamY + teamH/2 + 1, FN(teamFontSize, 900), isTeamLockedForMe ? '#ffd166' : '#ffffff');
    if(NET.mySlot >= 0){
      if(isTeamLockedForMe){
        zone(cx - btnW/2, teamY, btnW, teamH, { fn: () => { toast('TEAMS ARE LOCKED BY THE HOST'); sfx('back'); } });
      } else {
        zone(cx - btnW/2, teamY, btnW * 0.45, teamH, { fn: () => {
          if(NET.isHost){ cycleSlot(NET.mySlot, -1); netBroadcastSettings(); netBroadcastRoster(); }
          else netCycleMyColor(-1);
        }});
        zone(cx + btnW * 0.05, teamY, btnW * 0.45, teamH, { fn: () => {
          if(NET.isHost){ cycleSlot(NET.mySlot, 1); netBroadcastSettings(); netBroadcastRoster(); }
          else netCycleMyColor(1);
        }});
      }
    }
  }

  // Control Scheme row
  rr(g, cx - btnW/2, ctrlY, btnW, ctrlH, 6);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke();
  const ctrlName = NET.myCtrl || 'WASD';
  const ctrlIcon = (ctrlName === 'Controller') ? '🕹️' : (ctrlName === 'Arrows' ? '⬆️' : '🎮');
  ptxt(ctrlIcon + ' ' + ctrlName + '  ▾', cx, ctrlY + ctrlH/2 + 1, FN(clamp(ctrlH * 0.44, 9.5, 12), 900), '#ffffff');
  zone(cx - btnW/2, ctrlY, btnW, ctrlH, { fn: () => netCycleMyControl() });

  // Action / Ready Buttons:
  const rdyFontSize = clamp(rdyH * 0.42, 10.5, 13);
  if(isSpectatorMe){
    // Spectator View: "JOIN GAME" Button (if lobby unlocked for guests, always available for host)
    if(NET.lobbyLocked && !NET.isHost){
      drawJuicyChip(cx - btnW/2, rdyY, btnW, rdyH, {
        label: '🔒 LOBBY LOCKED BY HOST',
        active: false,
        bg: 'rgba(230, 126, 34, 0.25)',
        darkBg: 'rgba(180, 83, 9, 0.4)',
        textColor: '#f39c12',
        fontSize: clamp(rdyH * 0.38, 9.5, 11.5),
        fn: () => netToast('Lobby is locked by the host.')
      });
    } else {
      drawJuicyChip(cx - btnW/2, rdyY, btnW, rdyH, {
        label: '▶ JOIN GAME',
        active: true,
        activeBg: '#27ae60',
        activeDarkBg: '#166534',
        activeText: '#ffffff',
        fontSize: rdyFontSize,
        fn: () => netRequestJoinGame()
      });
    }
  } else if(!isSpectatorMe){
    // Active Player (Host or Guest): Ready Button + Spectate Button side by side
    const specBtnW = Math.max(68, Math.floor(btnW * 0.30));
    const rdyBtnW = btnW - specBtnW - 6;
    const rdyBtnX = cx - btnW/2;
    const specBtnX = rdyBtnX + rdyBtnW + 6;

    // Ready Button
    drawJuicyChip(rdyBtnX, rdyY, rdyBtnW, rdyH, {
      label: isMeReady ? 'READY ✓' : (NET.isHost ? 'READY ✓' : 'READY?'),
      active: isMeReady,
      activeBg: '#27ae60',
      activeDarkBg: '#166534',
      activeText: '#ffffff',
      textColor: '#ffd166',
      fontSize: rdyFontSize,
      fn: () => netToggleMyReady()
    });

    // Spectate Button
    drawJuicyChip(specBtnX, rdyY, specBtnW, rdyH, {
      label: '👁️ Spec',
      active: true,
      activeBg: 'rgba(56, 189, 248, 0.25)',
      activeDarkBg: 'rgba(2, 132, 199, 0.5)',
      activeText: '#38bdf8',
      activeBorder: '#38bdf8',
      fontSize: clamp(rdyH * 0.38, 9.5, 11.5),
      fn: () => (NET.isHost ? netHostToggleSpectate() : netRequestSpectate())
    });
  } else {
    // Fallback
    drawJuicyChip(cx - btnW/2, rdyY, btnW, rdyH, {
      label: isMeReady ? 'READY ✓' : 'CLICK TO READY',
      active: isMeReady,
      activeBg: '#27ae60',
      activeDarkBg: '#166534',
      activeText: '#ffffff',
      textColor: '#ffd166',
      fontSize: rdyFontSize,
      fn: () => netToggleMyReady()
    });
  }

  // --- 4. HOST PLAYER MANAGEMENT MODAL ---
  if(NET.isHost && NET.manageSlot !== null && NET.manageSlot !== undefined && NET.manageSlot > 0 && menu.slotColor[NET.manageSlot] >= 0){
    const ms = NET.manageSlot;
    const mpName = NET.slotsName[ms] || ('Guest ' + (ms+1));
    const mpCol = getSlotColor(ms, menu.slotColor, menu.slotTeam);

    // Dim background overlay
    g.fillStyle = 'rgba(5, 8, 15, 0.75)';
    g.fillRect(0, 0, CW, CH);
    zone(0, 0, CW, CH, { fn: () => { NET.manageSlot = null; } });

    const mW = Math.min(300, CW - 32);
    const mH = settings.teams ? 210 : 170;
    const mX = Math.floor(CW/2 - mW/2);
    const mY = Math.floor(CH/2 - mH/2);

    rr(g, mX - 2, mY - 2, mW + 4, mH + 4, 14);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    rr(g, mX, mY, mW, mH, 12);
    g.fillStyle = 'rgba(20, 28, 44, 0.98)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = mpCol; g.stroke();

    ptxt('MANAGE: ' + mpName + ' (P' + (ms+1) + ')', mX + mW/2, mY + 20, FT(12), '#ffd166');

    let mBtnY = mY + 42;
    const mbW = mW - 28;
    const mbH = 28;
    const mbGap = 8;

    // Option 1: Swap Team (if teams mode) - Opens 4-team color pop-up flyout
    if(settings.teams){
      const curTeam = (menu.slotTeam && menu.slotTeam[ms] != null) ? (menu.slotTeam[ms] % TEAMS.length) : (ms % 2);
      const curTeamDef = TEAMS[curTeam] || TEAMS[0];
      rr(g, mX + 14, mBtnY, mbW, mbH, 6);
      g.fillStyle = 'rgba(243, 156, 18, 0.25)'; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = '#f39c12'; g.stroke();
      txt('⚔️ Swap Teams (' + curTeamDef.icon + ') ▸', mX + mW/2, mBtnY + mbH/2 + 1, FN(10.5, 900), '#ffd166');
      zone(mX + 14, mBtnY, mbW, mbH, { fn: () => {
        NET.teamPickerOpen = !NET.teamPickerOpen;
        sfx('ui');
      } });
      mBtnY += mbH + mbGap;

      // Small pop-up flyout beside it showing all 4 team colors
      if(NET.teamPickerOpen){
        const popW = 148;
        const popH = TEAMS.length * 28 + 26;
        let popX = (mX + mW + popW + 10 <= CW) ? (mX + mW + 8) : ((mX - popW - 8 >= 0) ? (mX - popW - 8) : (mX + 14));
        let popY = (mX + mW + popW + 10 <= CW || mX - popW - 8 >= 0) ? mY + 12 : (mBtnY + 4);

        // Pop-up frame
        rr(g, popX - 2, popY - 2, popW + 4, popH + 4, 12);
        g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
        rr(g, popX, popY, popW, popH, 10);
        g.fillStyle = 'rgba(16, 24, 38, 0.98)'; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke();
        zone(popX, popY, popW, popH, { fn: () => {} });

        txt('SELECT TEAM (4)', popX + popW/2, popY + 13, FN(9.5, 900), '#94a3b8');

        for(let t = 0; t < TEAMS.length; t++){
          const tm = TEAMS[t];
          const ty = popY + 24 + t * 28;
          const isThisCur = (curTeam === t);
          rr(g, popX + 8, ty, popW - 16, 24, 6);
          g.fillStyle = isThisCur ? tm.base : 'rgba(255,255,255,0.08)'; g.fill();
          g.lineWidth = isThisCur ? 2 : 1;
          g.strokeStyle = isThisCur ? '#ffffff' : tm.base; g.stroke();

          txt(tm.icon + ' ' + tm.name + (isThisCur ? ' ✓' : ''), popX + popW/2, ty + 12 + 1, FN(9.5, 900), '#ffffff');
          zone(popX + 8, ty, popW - 16, 24, { fn: () => {
            netSetPlayerTeam(ms, t);
            NET.teamPickerOpen = false;
          } });
        }
      }
    }

    // Option 2: Move to Waiting List
    rr(g, mX + 14, mBtnY, mbW, mbH, 6);
    g.fillStyle = 'rgba(56, 189, 248, 0.25)'; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = '#38bdf8'; g.stroke();
    txt('⏳ Move to Waiting List', mX + mW/2, mBtnY + mbH/2 + 1, FN(10.5, 900), '#38bdf8');
    zone(mX + 14, mBtnY, mbW, mbH, { fn: () => { netMovePlayerToWaitlist(ms); NET.manageSlot = null; NET.teamPickerOpen = false; } });
    mBtnY += mbH + mbGap;

    // Option 3: Kick from Room / Remove Bot
    const isBot = (NET.botSlots && NET.botSlots.includes(ms));
    rr(g, mX + 14, mBtnY, mbW, mbH, 6);
    g.fillStyle = 'rgba(231, 76, 60, 0.25)'; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = '#e74c3c'; g.stroke();
    txt(isBot ? '🤖 Remove Bot' : '🚫 Kick from Room', mX + mW/2, mBtnY + mbH/2 + 1, FN(10.5, 900), '#ff6b81');
    zone(mX + 14, mBtnY, mbW, mbH, { fn: () => { netKickPlayer(ms); NET.manageSlot = null; NET.teamPickerOpen = false; } });
    mBtnY += mbH + mbGap;

    // Option 4: Close
    rr(g, mX + 14, mBtnY, mbW, mbH, 6);
    g.fillStyle = 'rgba(255, 255, 255, 0.12)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = 'rgba(255, 255, 255, 0.3)'; g.stroke();
    txt('✕ Close', mX + mW/2, mBtnY + mbH/2 + 1, FN(10.5, 900), '#ffffff');
    zone(mX + 14, mBtnY, mbW, mbH, { fn: () => { NET.manageSlot = null; NET.teamPickerOpen = false; } });
  }
}

/* ================= SPECTATOR HUD BANNER ================= */
function drawSpectatorBanner(){
  if(!match) return;
  if(menu.tab === 'solo' || menu.tab === 'bots' || menu.tab === '2p') return;
  if(typeof NET === 'undefined' || !NET || !NET.isSpectator || NET.role === null || menu.tab !== 'online') return;
  const myIdx = (typeof myMatchIndex === 'function') ? myMatchIndex() : 0;
  if(myIdx >= 0) return;
  g.save();
  const banW = Math.min(CW - 24, 460);
  const banH = 38;
  const banX = CW / 2 - banW / 2;
  // Sit BELOW the center timer pill (y 8..48) so spectators keep the clock,
  // tag pills and mode HUD visible instead of painting over them.
  // Drop further while the killfeed toast (y 58..84) is live to avoid stacking.
  let banY = 56;
  try{
    if(match.killfeed && match.killfeed.length > 0 && match.killfeed[0] && match.killfeed[0].t > 0) banY = 100;
  }catch(e){}

  // Background Glass Pill
  rr(g, banX, banY, banW, banH, 19);
  g.fillStyle = 'rgba(15, 23, 42, 0.90)';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#38bdf8';
  g.stroke();

  // Pulse dot icon
  const dotX = banX + 22, dotY = banY + banH / 2;
  const pulse = (Math.sin(performance.now() * 0.006) + 1) / 2;
  g.beginPath();
  g.arc(dotX, dotY, 4 + pulse * 2, 0, TAU);
  g.fillStyle = 'rgba(56, 189, 248, 0.4)';
  g.fill();
  g.beginPath();
  g.arc(dotX, dotY, 4, 0, TAU);
  g.fillStyle = '#38bdf8';
  g.fill();

  // Text Info
  const secLeft = Math.max(0, Math.ceil(match.timer || 0));
  const mainTxt = 'SPECTATING  •  Round ends in ' + secLeft + 's';
  ptxt(mainTxt, banX + banW / 2 + 6, banY + banH / 2 - 4, FT(clamp(banW * 0.034, 12, 14.5)), '#ffffff', 'center', 3);
  txt('You will auto-join when this round finishes  •  [TAB] Players', banX + banW / 2 + 6, banY + banH / 2 + 9, FN(9.5, 800), '#94a3b8', 'center');

  g.restore();
}

/* ================= IN-GAME TAB SCOREBOARD OVERLAY ================= */
function drawScoreboardOverlay(){
  g.save();
  g.fillStyle = 'rgba(10, 15, 25, 0.88)';
  g.fillRect(0, 0, CW, CH);
  zone(0, 0, CW, CH, { fn: () => { scoreboardOpen = false; sfx('back'); } });

  const boxW = Math.min(CW - 24, 620);
  const boxH = Math.min(CH - 24, 440);
  const boxX = Math.floor(CW / 2 - boxW / 2);
  const boxY = Math.floor(CH / 2 - boxH / 2);

  rr(g, boxX - 2, boxY - 2, boxW + 4, boxH + 4, 14);
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  rr(g, boxX, boxY, boxW, boxH, 12);
  g.fillStyle = '#141d2e'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.2)'; g.stroke();
  zone(boxX, boxY, boxW, boxH, { fn: () => {} });

  // Header Title
  ptxt('MATCH SCOREBOARD & PLAYERS', boxX + boxW/2, boxY + 24, FT(clamp(boxW * 0.038, 14, 18)), '#ffffff');
  txt('Press [TAB] to toggle scoreboard', boxX + boxW/2, boxY + 44, FN(10.5, 800), '#94a3b8');

  // Close Button
  const cxSz = 26;
  const cxX = boxX + boxW - cxSz - 12, cxY = boxY + 12;
  rr(g, cxX, cxY, cxSz, cxSz, 6);
  g.fillStyle = '#e74c3c'; g.fill();
  txt('✕', cxX + cxSz/2, cxY + cxSz/2 + 1, FN(11, 900), '#ffffff');
  zone(cxX, cxY, cxSz, cxSz, { fn: () => { scoreboardOpen = false; sfx('back'); } });

  // Columns Header
  const tableY = boxY + 62;
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(boxX + 12, tableY, boxW - 24, 24);
  txt('PLAYER', boxX + 24, tableY + 13, FN(10, 800), '#94a3b8', 'left');
  txt('ROLE / TEAM', boxX + boxW * 0.40, tableY + 13, FN(10, 800), '#94a3b8');
  txt('PING', boxX + boxW * 0.65, tableY + 13, FN(10, 800), '#94a3b8');
  txt('VOICE', boxX + boxW - 45, tableY + 13, FN(10, 800), '#94a3b8');

  // Render match players
  const players = (match && match.players) ? match.players : [];
  const rowH = clamp((boxH - 100) / Math.max(players.length, 6), 32, 40);

  for(let i = 0; i < players.length; i++){
    const p = players[i];
    const ry = tableY + 28 + i * rowH;
    const isMe = (p.slot === NET.mySlot);
    const col = getSlotColor(p.slot, menu.slotColor, menu.slotTeam);
    const pName = (NET.slotsName && NET.slotsName[p.slot]) ? NET.slotsName[p.slot] : ('Player ' + (p.slot+1));

    rr(g, boxX + 12, ry, boxW - 24, rowH - 4, 6);
    g.fillStyle = isMe ? 'rgba(56, 189, 248, 0.12)' : (i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)');
    g.fill();

    // Player color dot + Name
    g.beginPath(); g.arc(boxX + 26, ry + (rowH-4)/2, 6, 0, Math.PI * 2);
    g.fillStyle = col || '#2ecc71'; g.fill();
    txt(pName + (isMe ? ' (YOU)' : ''), boxX + 40, ry + (rowH-4)/2 + 1, FN(11.5, 900), isMe ? '#38bdf8' : '#ffffff', 'left');

    // Role / Team badge
    let roleText = 'RUNNER';
    if(settings.teams){
      roleText = (p.team === 0 ? '🔴 RED TEAM' : '🔵 BLUE TEAM');
    } else if(match.it === i){
      roleText = '🔥 IT';
    }
    txt(roleText, boxX + boxW * 0.40, ry + (rowH-4)/2 + 1, FN(10.5, 900), (match.it === i || p.team === match.itTeam) ? '#ff4757' : '#ffd166');

    // Ping
    let peerIdForSlot = null;
    if(p.slot === 0 && !NET.isHost){
      try{
        for(const [pid, s] of NET.peerSlots.entries()){ if(s === 0){ peerIdForSlot = pid; break; } }
        if(!peerIdForSlot) peerIdForSlot = 'tag-' + NET.room.toLowerCase() + '-host';
      }catch(e){ peerIdForSlot = 'tag-' + NET.room.toLowerCase() + '-host'; }
    }
    else {
      for(const [pid, s] of NET.peerSlots.entries()){
        if(s === p.slot){ peerIdForSlot = pid; break; }
      }
    }
    const pingVal = peerIdForSlot ? NET.pings.get(peerIdForSlot) : (isMe ? 15 : null);
    const pingStr = pingVal != null ? (pingVal + 'ms') : '--';
    const pingCol = pingVal != null ? (pingVal < 60 ? '#2ecc71' : (pingVal < 120 ? '#f1c40f' : '#e74c3c')) : '#94a3b8';
    txt(pingStr, boxX + boxW * 0.65, ry + (rowH-4)/2 + 1, FN(11, 800), pingCol);

    // Voice Mute Button
    if(!isMe && peerIdForSlot){
      const isMuted = NET.peerMutes && NET.peerMutes.has(peerIdForSlot);
      const muteBtnW = 60, muteBtnH = rowH - 10;
      const muteBtnX = boxX + boxW - muteBtnW - 20, muteBtnY = ry + 3;
      rr(g, muteBtnX, muteBtnY, muteBtnW, muteBtnH, 4);
      g.fillStyle = isMuted ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.2)'; g.fill();
      g.lineWidth = 1; g.strokeStyle = isMuted ? '#e74c3c' : '#2ecc71'; g.stroke();
      txt(isMuted ? '🔇 MUTED' : '🔊 MUTE', muteBtnX + muteBtnW/2, muteBtnY + muteBtnH/2 + 1, FN(9, 900), isMuted ? '#ff6b81' : '#2ecc71');
      zone(muteBtnX, muteBtnY, muteBtnW, muteBtnH, { fn: () => {
        if(isMuted) NET.peerMutes.delete(peerIdForSlot);
        else NET.peerMutes.add(peerIdForSlot);
        sfx('ui');
      }});
    }
  }
  g.restore();
}

/* ================= MODERN RESPONSIVE ARENA MENU ================= */
function drawMenu(){
  if(menu.tab !== 'solo' && menu.tab !== '2p' && menu.tab !== 'online' && menu.tab !== 'bots') menu.tab = '2p';

  // 1. Render live arena map in background!
  g.save();
  g.translate(CW/2, CH/2); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
  drawNightWorld();
  drawWorld();
  g.restore();

  // Frosted dark overlay so menu controls pop cleanly
  g.fillStyle = 'rgba(10, 8, 20, 0.72)';
  g.fillRect(0, 0, CW, CH);

  const isShortH = (CH < 500);
  const isNarrowW = (CW < 560);
  const isMobile = (CW < 700 || CH < 500);
  const isSolo = (menu.tab === 'solo');
  const isBots = (menu.tab === 'bots');
  const isTeams = (settings.teams && !isSolo && !isBots);
  if(isSolo) settings.teams = (settings.gameMode === 'ctf');
  if(isBots) settings.teams = (settings.gameMode === 'freeze' || settings.gameMode === 'ctf');

  // 2. Header Bar
  const headY = isShortH ? 6 : 10;
  const headH = clamp(CH * 0.08, isShortH ? 30 : 36, 46);

  // Sound & Theme buttons on top-right
  const si = Math.floor(clamp(headH * 0.88, 28, 38));
  const soundX = CW - si - 12;
  drawJuicyIconBtn(soundX, headY, si, {
    r: 8,
    depth: 3,
    bg: 'rgba(255, 255, 255, 0.92)',
    darkBg: 'rgba(203, 213, 225, 0.95)',
    renderContent: (x, y, sz) => {
      g.fillStyle = '#3a5a3a';
      g.beginPath();
      g.moveTo(x + 8, y + sz/2 - 4);
      g.lineTo(x + 8, y + sz/2 + 4);
      g.lineTo(x + 14, y + sz/2 + 4);
      g.lineTo(x + 21, y + sz/2 + 10);
      g.lineTo(x + 21, y + sz/2 - 10);
      g.lineTo(x + 14, y + sz/2 - 4);
      g.closePath(); g.fill();
      if(muted){
        g.strokeStyle = '#c0392b'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x + 23, y + sz/2 - 7); g.lineTo(x + 32, y + sz/2 + 7); g.stroke();
      }
    },
    fn: () => { muted = !muted; applyEffectiveMute(); }
  });

  const themeX = soundX - si - 8;
  drawJuicyIconBtn(themeX, headY, si, {
    r: 8,
    depth: 3,
    bg: 'rgba(255, 255, 255, 0.92)',
    darkBg: 'rgba(203, 213, 225, 0.95)',
    icon: '🎨',
    iconSize: Math.floor(si * 0.44),
    fn: () => { cycleTheme(); }
  });

  // Game Logo (Left)
  const logoFs = clamp(headH * 0.82, 22, 42);
  const logoW = 76;
  ptxt('TAG!', 14 + logoW * 0.4, headY + headH * 0.52, FT(logoFs), '#ffffff');

  // Mode Navigation Tabs (Pills in Center: Local Party & 1P Solo with BETA badge)
  // NOTE: WATCH BOTS hidden for now (logic kept — re-add entry to restore).
  const modeTabs = [
    { id: '2p', label: '👥 2-4P PARTY', short: '👥 PARTY' },
    { id: 'solo', label: '🤖 1P SOLO', short: '🤖 SOLO', badge: 'BETA' },
    { id: 'online', label: '🌐 ONLINE HUB', short: '🌐 ONLINE' }
  ];
  const tabW = clamp((themeX - 14 - logoW - 20) / modeTabs.length, isNarrowW ? 62 : 90, 150);
  const tabH = clamp(headH * 0.84, 28, 36);
  const tabsTotalW = tabW * modeTabs.length + (modeTabs.length - 1) * 8;
  const tabsX = Math.max(14 + logoW + 8, Math.floor(CW / 2 - tabsTotalW / 2));

  for(let t = 0; t < modeTabs.length; t++){
    const tab = modeTabs[t];
    const tx = tabsX + t * (tabW + 8);
    const ty = headY + (headH - tabH) / 2;
    const isAct = (menu.tab === tab.id);
    const tLabel = isNarrowW ? tab.short : tab.label;
    const tFs = clamp(tabW * 0.095, 11, 13.5);

    drawJuicyBtn(tx, ty, tabW, tabH, {
      label: tLabel,
      bg: isAct ? '#ffffff' : 'rgba(255, 255, 255, 0.14)',
      darkBg: isAct ? '#cbd5e1' : 'rgba(0, 0, 0, 0.32)',
      textColor: isAct ? '#0f172a' : '#cbd5e1',
      textShadow: isAct ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.4)',
      r: 8,
      depth: 3,
      fontSize: tFs,
      badge: tab.badge,
      fn: () => setMenuTab(tab.id)
    });
  }

  // 3. Layout vertical budgeting
  const headerBottom = headY + headH + (isShortH ? 4 : 6);
  const bottomMargin = isTouch ? Math.max(14, isShortH ? 12 : 20) : (isShortH ? 6 : 12);
  const startBtnH = clamp(CH * 0.080, isShortH ? 32 : 36, 44);
  const startBtnW = Math.min(CW - 28, 340);
  const startBtnY = CH - startBtnH - bottomMargin;
  // Career band (retention line) sits between settings strip and start button; 0 for first-timers
  const careerBandH = (typeof CAREER !== 'undefined' && CAREER && CAREER.m > 0) ? 18 : 0;

  // Settings strip directly above start button
  const stripH = isNarrowW ? (isShortH ? 56 : 64) : clamp(CH * 0.075, isShortH ? 30 : 34, 40);
  const stripW = Math.min(CW - 24, 880);
  const stripX = Math.floor(CW/2 - stripW/2);
  const stripY = startBtnY - careerBandH - stripH - (isShortH ? 4 : 8);

  // Center Stage Area
  const stageY = headerBottom;
  const stageH = (menu.tab === 'online')
    ? (NET.role !== null ? Math.max(70, stripY - stageY - (isShortH ? 4 : 6)) : Math.max(70, CH - stageY - bottomMargin))
    : Math.max(70, stripY - stageY - (isShortH ? 4 : 6));

  if(isTouch && CH > CW){
    const pillW = Math.min(CW - 24, 250);
    const pillH = 20;
    const pillX = Math.floor(CW/2 - pillW/2);
    const pillY = Math.floor(stageY + 1);
    rr(g, pillX, pillY, pillW, pillH, 10);
    g.fillStyle = 'rgba(234, 179, 8, 0.20)'; g.fill();
    g.strokeStyle = '#eab308'; g.lineWidth = 1; g.stroke();
    ptxt('🔄 ROTATE PHONE FOR WIDE VIEW', CW/2, pillY + pillH/2 + 1, FN(10, 900), '#fef08a');
  }

  if(menu.tab === 'online'){
    drawOnlineHub(stageY, stageH);
  } else {
  // 4. Center Stage Content (1P SOLO, 2-4 PLAYERS & TEAMS)
  // Determine active slots
  let actSlots = [0];
  if(isSolo || isBots){
    actSlots = [0, 1]; // P1 Human, P2 BOT (bots tab: BOT 1, BOT 2)
  } else {
    if(menu.slotColor[0] < 0) menu.slotColor[0] = 0;
    if(menu.slotColor[1] < 0) menu.slotColor[1] = 1;
    actSlots = [0, 1];
    // Touch devices have no P3/P4 controls: local party is capped at 2 players.
    if(isTouch){ menu.slotColor[2] = -1; menu.slotColor[3] = -1; }
    if(menu.slotColor[2] >= 0) actSlots.push(2);
    if(menu.slotColor[3] >= 0) actSlots.push(3);
  }

  // Top sub-header in stage: Player count pills, Team Tag header, or Bot Difficulty pills
  const stageTopPad = clamp(stageH * 0.13, 24, 30);
  const pillY = stageY + 2;
  const ph = stageTopPad - 4;

  if(isSolo || isBots){
    const diffOpts = [
      { id: 'easy', label: '⚡ EASY', col: '#2ed573' },
      { id: 'hard', label: '🔥 HARD (DEF)', col: '#ff4757' }
    ];
    const pw = clamp(CW * 0.20, 78, 115);
    const totalPillsW = diffOpts.length * pw + (diffOpts.length - 1) * 8;
    const pillsStartX = Math.floor(CW / 2 - totalPillsW / 2);

    txt('BOT DIFFICULTY:', pillsStartX - 10, pillY + ph/2 + 1, FN(clamp(CW * 0.024, 10, 11.5), 900), 'rgba(255,255,255,0.75)', 'right');

    for(let k = 0; k < diffOpts.length; k++){
      const opt = diffOpts[k];
      const px = pillsStartX + k * (pw + 8);
      const isCur = ((menu.botDifficulty || 'hard') === opt.id);
      drawJuicyChip(px, pillY, pw, ph, {
        label: opt.label,
        active: isCur,
        activeBg: opt.col,
        activeDarkBg: shadeColor(opt.col, -30),
        activeText: '#ffffff',
        fontSize: 10.5,
        fn: () => setBotDifficulty(opt.id)
      });
    }
  } else {
    const isHunterMode = (settings.gameMode === 'hunter');
    // Touch: P3/P4 have no on-screen controls, so only 2-player is offered.
    const countOpts = (typeof isTouch !== 'undefined' && isTouch)
      ? (isHunterMode ? [4] : [2])
      : (isHunterMode ? [4, 6, 8] : [2, 3, 4]);
    const pw = clamp(CW * 0.16, 56, 84);
    const totalPillsW = countOpts.length * pw + (countOpts.length - 1) * 6;
    const pillsStartX = Math.floor(CW / 2 - totalPillsW / 2);

    if(isHunterMode){
      let redCount = 0, blueCount = 0;
      for(const s of actSlots){
        const t = (menu.slotTeam && menu.slotTeam[s] != null) ? (menu.slotTeam[s] % 2) : (s % 2);
        if(t === 0) redCount++; else blueCount++;
      }
      const isUneven = (redCount !== blueCount);
      const isLow = (actSlots.length < 4);
      let statusStr = '🎯 HUNTER (REC 6, 8 OR 10):';
      let statusCol = '#e056fd';
      if(isLow){
        statusStr = '⚠️ MIN 4 PLAYERS NEEDED:';
        statusCol = '#ff6b81';
      } else if(isUneven){
        statusStr = '⚠️ UNEVEN (' + redCount + 'R v ' + blueCount + 'B) - REC 6-10:';
        statusCol = '#ffd166';
      }
      txt(statusStr, pillsStartX - 10, pillY + ph/2 + 1, FN(clamp(CW * 0.024, 9.5, 11.5), 900), statusCol, 'right');
    } else if(settings.gameMode === 'ctf'){
      let redCount = 0, blueCount = 0;
      for(const s of actSlots){
        const t = (menu.slotTeam && menu.slotTeam[s] != null) ? (menu.slotTeam[s] % 2) : (s % 2);
        if(t === 0) redCount++; else blueCount++;
      }
      const ctfRatioStr = '🚩 ' + redCount + ' RED vs ' + blueCount + ' BLUE:';
      txt(ctfRatioStr, pillsStartX - 10, pillY + ph/2 + 1, FN(clamp(CW * 0.024, 10, 12), 900), '#ff6b6b', 'right');
    } else if(isTeams){
      let redCount = 0, blueCount = 0;
      for(const s of actSlots){
        const t = (menu.slotTeam && menu.slotTeam[s] != null) ? (menu.slotTeam[s] % 2) : (s % 2);
        if(t === 0) redCount++; else blueCount++;
      }
      const ratioStr = '⚔️ ' + redCount + ' RED vs ' + blueCount + ' BLUE:';
      txt(ratioStr, pillsStartX - 10, pillY + ph/2 + 1, FN(clamp(CW * 0.024, 10, 12), 900), '#ffd166', 'right');
    } else if(settings.gameMode === 'crown'){
      txt('👑 CROWN (REC 3-4P):', pillsStartX - 10, pillY + ph/2 + 1, FN(clamp(CW * 0.024, 9.5, 11.5), 900), '#facc15', 'right');
    } else if(settings.gameMode === 'bomb'){
      const isDuo = (actSlots.length === 2);
      const bStr = isDuo ? '💣 BOMB (20s DUEL - REC 3+):' : '💣 BOMB TAG (REC 3+):';
      txt(bStr, pillsStartX - 10, pillY + ph/2 + 1, FN(clamp(CW * 0.024, 9.5, 11.5), 900), '#f87171', 'right');
    } else {
      txt('LOCAL PLAYERS:', pillsStartX - 10, pillY + ph/2 + 1, FN(10.5, 900), 'rgba(255,255,255,0.75)', 'right');
    }

    for(let k = 0; k < countOpts.length; k++){
      const numP = countOpts[k];
      const px = pillsStartX + k * (pw + 6);
      const isCurCount = (actSlots.length === numP);
      drawJuicyChip(px, pillY, pw, ph, {
        label: numP + ' PLAYERS',
        active: isCurCount,
        activeBg: '#2ed573',
        activeDarkBg: '#166534',
        activeText: '#ffffff',
        fontSize: 10.5,
        fn: () => {
          for(let s = 0; s < MAXP; s++){
            if(s < numP){
              if(menu.slotColor[s] < 0) menu.slotColor[s] = s % PALETTE.length;
            } else {
              menu.slotColor[s] = -1;
              if(menu.slotIsBot) menu.slotIsBot[s] = false;
            }
          }
          ensureUniqueLocalColors();
          if(isHunterMode) validateHunterRoles();
          sfx(numP === 2 ? 'ui' : 'ok');
        }
      });
    }
  }

  // Local Multiplayer Bot Opponents Tick Box & Selector (2, 3, 4 players)
  const showBotBar = (!isSolo && !isBots && actSlots.length >= 2 && (typeof NET === 'undefined' || !NET || NET.role === null));
  if(showBotBar){
    const botBarY = pillY + ph + 4;
    const botBarH = 22;
    const curBotCount = actSlots.filter(s => isSlotBot(s)).length;
    const hasBots = (curBotCount > 0);

    const tickW = clamp(Math.floor(CW * 0.22), 110, 135);
    const optW = clamp(Math.floor(CW * 0.11), 48, 64);
    const botCounts = [1, 2, 3, 4];
    const totalBarW = tickW + (hasBots ? (botCounts.length * (optW + 5) + 6) : 0);
    const barStartX = Math.floor(CW / 2 - totalBarW / 2);

    // Draw Tick Box Chip
    drawJuicyChip(barStartX, botBarY, tickW, botBarH, {
      label: hasBots ? '☑ Play vs Bots' : '☐ Play vs Bots',
      active: hasBots,
      activeBg: '#e056fd',
      activeDarkBg: '#9333ea',
      activeText: '#ffffff',
      textColor: hasBots ? '#ffffff' : 'rgba(255,255,255,0.7)',
      fontSize: clamp(botBarH * 0.44, 9.5, 11),
      fn: () => {
        if(!menu.slotIsBot) menu.slotIsBot = [false, false, false, false, false, false, false, false, false, false];
        if(hasBots){
          for(let s = 0; s < MAXP; s++) menu.slotIsBot[s] = false;
          sfx('back');
          toast('👤 ALL PLAYERS SET TO HUMAN');
        } else {
          // Default to 1 bot opponent
          const targetSlot = (actSlots.length > 1) ? actSlots[actSlots.length - 1] : 1;
          menu.slotIsBot[targetSlot] = true;
          sfx('ok');
          toast('🤖 1 BOT OPPONENT ENABLED');
        }
      }
    });

    if(hasBots){
      let chipX = barStartX + tickW + 6;
      for(let bi = 0; bi < botCounts.length; bi++){
        const bc = botCounts[bi];
        const isSelected = (curBotCount === bc);
        drawJuicyChip(chipX, botBarY, optW, botBarH, {
          label: bc === 1 ? '1 Bot' : (bc + ' Bots'),
          active: isSelected,
          activeBg: '#a855f7',
          activeDarkBg: '#7e22ce',
          activeText: '#ffffff',
          textColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
          fontSize: clamp(botBarH * 0.42, 9, 10.5),
          fn: () => {
            if(!menu.slotIsBot) menu.slotIsBot = [false, false, false, false, false, false, false, false, false, false];
            if(bc === 4){
              for(let s = 0; s < 4; s++){
                if(menu.slotColor[s] < 0) menu.slotColor[s] = s % PALETTE.length;
                menu.slotIsBot[s] = true;
              }
              ensureUniqueLocalColors();
              sfx('ui');
              toast('🤖 4 BOTS CONFIGURED (ALL BOTS)');
              return;
            }
            menu.slotIsBot[0] = false; // P1 is human
            const neededSlots = Math.max(actSlots.length, bc + 1);
            for(let s = 0; s < neededSlots; s++){
              if(menu.slotColor[s] < 0) menu.slotColor[s] = s % PALETTE.length;
            }
            ensureUniqueLocalColors();
            const newAct = activeSlots();
            for(let s = 0; s < MAXP; s++){
              if(s === 0){
                menu.slotIsBot[s] = false;
              } else if(newAct.includes(s)){
                menu.slotIsBot[s] = (s >= newAct.length - bc);
              } else {
                menu.slotIsBot[s] = false;
              }
            }
            sfx('ui');
            toast('🤖 PLAYING AGAINST ' + bc + ' BOT' + (bc > 1 ? 'S' : '') + '!');
          }
        });
        chipX += optW + 5;
      }
    }
  }

  const botBarOffset = showBotBar ? 26 : 0;
  const cardsAreaY = stageY + stageTopPad + botBarOffset;
  const cardsAreaH = stageH - stageTopPad - botBarOffset;

  // Check if 4 cards should wrap to 2x2 grid on small mobile
  const use2x2 = (!isSolo && !isBots && actSlots.length === 4 && CW < 680);
  const showAddCard = (!isSolo && !isBots && actSlots.length < 4 && CW >= 580 && !use2x2 && !isTouch);
  const totalItems = actSlots.length + (showAddCard ? 1 : 0);

  const cardGap = clamp(CW * 0.016, 6, 14);
  const maxGridW = Math.min(CW - 20, 920);

  if(use2x2){
    // 2x2 grid on small phones for 4 players
    const cW = Math.floor((maxGridW - cardGap) / 2);
    const cH = Math.floor((cardsAreaH - cardGap) / 2);
    for(let idx = 0; idx < 4; idx++){
      const colIdx = idx % 2;
      const rowIdx = Math.floor(idx / 2);
      const cx = Math.floor(CW / 2 - maxGridW / 2) + colIdx * (cW + cardGap);
      const cy = cardsAreaY + rowIdx * (cH + cardGap);
      drawPlayerCard(cx, cy, cW, cH, actSlots[idx], isSlotBot(actSlots[idx]), !isSolo && !isBots && actSlots[idx] >= 2);
    }
  } else {
    // Single horizontal row
    const cardW = Math.floor(clamp((maxGridW - (totalItems - 1) * cardGap) / totalItems, 95, 205));
    const cardH = Math.floor(clamp(cardsAreaH * 0.94, Math.min(80, cardsAreaH), 215));
    const totalRowW = totalItems * cardW + (totalItems - 1) * cardGap;
    const startX = Math.floor(CW / 2 - totalRowW / 2);
    const cardY = Math.floor(cardsAreaY + (cardsAreaH - cardH) / 2);

    for(let k = 0; k < actSlots.length; k++){
      const slot = actSlots[k];
      const cx = startX + k * (cardW + cardGap);
      const isBot = (isSolo && slot === 1) || (isBots && (slot === 0 || slot === 1)) || isSlotBot(slot);
      drawPlayerCard(cx, cardY, cardW, cardH, slot, isBot, !isSolo && !isBots && slot >= 2);
    }

    // Draw "+ ADD PLAYER" card if slots available
    if(showAddCard){
      const nextSlot = actSlots.length;
      const addX = startX + actSlots.length * (cardW + cardGap);
      drawAddPlayerCard(addX, cardY, cardW, cardH, nextSlot);
    }
  }

  const isMobilePhone = (typeof isTouch !== 'undefined' && isTouch) || (CW < 780);

  // 4b. COMING SOON promo sticker (Cycles: 🗺️ NEW MAPS <-> 🧟 INFECTED <-> ❄️ FREEZE TAG)
  // Hide when 4 players are active in local multiplayer to avoid overlapping 4th player card
  const curPCount = (actSlots && actSlots.length) ? actSlots.length : 2;
  const hideSticker4P = (curPCount >= 4 && menu.tab !== 'solo' && menu.tab !== 'bots');

  if(!hideSticker4P){
    const isWideScreen = (CW >= 880);
    const isMediumScreen = (CW >= 680 && CW < 880);
    let stickW, stickH, stickX, stickY, stickTilt;
    if(isMobilePhone){
      stickW = clamp(CW * 0.25, 118, 146);
      stickH = clamp(CH * 0.14, 48, 62);
      stickX = CW - stickW - 6;
      stickY = headY + headH + 4;
      stickTilt = -0.04;
    } else if(isWideScreen){
      stickW = 186; stickH = 88;
      stickX = CW - stickW - 20;
      stickY = headY + headH + 18;
      stickTilt = -0.06 + 0.02 * Math.sin(tGlobal * 1.3);
    } else {
      stickW = 152; stickH = 76;
      stickX = CW - stickW - 14;
      stickY = headY + headH + 12;
      stickTilt = -0.06 + 0.02 * Math.sin(tGlobal * 1.3);
    }

    // Rotating spotlight every 3s: 0: 🗺️ NEW MAPS, 1: 🧟 INFECTED, 2: ❄️ FREEZE TAG
    const promoStage = Math.floor(tGlobal / 3) % 3;
    let promoMode = 'maps';
    let promoIcon = '🗺️';
    let promoName = 'NEW MAPS';
    let promoDesc = 'Fresh arenas & layouts';
    let promoGlow = '56,189,248'; // Cyan
    let cornerIcon1 = '🗺️', cornerIcon2 = '🧭';

    if(promoStage === 1){
      promoMode = 'infected';
      promoIcon = '🧟';
      promoName = 'INFECTED';
      promoDesc = 'Outrun Patient Zero';
      promoGlow = '34,197,94'; // Toxic Green
      cornerIcon1 = '🧟'; cornerIcon2 = '☣️';
    } else if(promoStage === 2){
      promoMode = 'freeze';
      promoIcon = '❄️';
      promoName = 'FREEZE TAG';
      promoDesc = 'Freeze the whole crew';
      promoGlow = '103,232,249'; // Frost Cyan
      cornerIcon1 = '❄️'; cornerIcon2 = '🧊';
    }
    const switchPulse = Math.max(0, 1 - (tGlobal % 3) * 2.5); // name pops right after each switch

    g.save();
    const scx = stickX + stickW / 2;
    const scy = stickY + stickH / 2;
    g.translate(scx, scy);
    g.rotate(stickTilt);
    g.translate(-stickW / 2, -stickH / 2);

    // Soft drop shadow
    rr(g, 3, 5, stickW, stickH, isMobilePhone ? 9 : 12);
    g.fillStyle = 'rgba(0, 0, 0, 0.45)'; g.fill();

    // Die-cut white vinyl border
    rr(g, -2.5, -2.5, stickW + 5, stickH + 5, isMobilePhone ? 11 : 14);
    g.fillStyle = '#ffffff'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();

    // Sticker inner body
    rr(g, 0, 0, stickW, stickH, isMobilePhone ? 8 : 11);
    g.fillStyle = '#161329'; g.fill();

    // Glowing border pulse in matching mode color
    const stickerPulse = 0.55 + 0.35 * Math.sin(tGlobal * 5);
    g.lineWidth = isMobilePhone ? 1.5 : 2;
    g.strokeStyle = 'rgba(' + promoGlow + ', ' + stickerPulse + ')';
    g.stroke();

    if(isMobilePhone){
      // 1. "✨ COMING SOON" eyebrow in gold
      ptxt('✨ COMING SOON', stickW / 2, stickH * 0.18, FN(clamp(stickH * 0.15, 8, 9.5), 900), '#ffd166');
      // 2. Rotating name
      const nameFsMob = clamp(stickH * 0.23, 10.5, 13) * (1 + 0.10 * switchPulse);
      ptxt(promoIcon + ' ' + promoName, stickW / 2, stickH * 0.45, FT(nameFsMob), '#ffffff');
      // 3. Pill
      const pillWMob = stickW - 14;
      const pillHMob = Math.floor(stickH * 0.26);
      const pillYMob = stickH - pillHMob - 4;
      pill(7, pillYMob, pillWMob, pillHMob, 'rgba(' + promoGlow + ', 0.22)', 'rgba(' + promoGlow + ', 0.85)');
      txt('OCT 12TH (TENT.)', stickW / 2, pillYMob + pillHMob / 2 + 1, FN(clamp(pillHMob * 0.52, 7.5, 9.5), 900), '#ffffff');
    } else {
      // 1. "✨ COMING SOON" eyebrow in gold
      ptxt('✨ COMING SOON', stickW / 2, stickH * 0.17, FN(clamp(stickH * 0.11, 8, 9.5), 900), '#ffd166');

      // 2. Rotating name, pops on every switch
      const nameFs = clamp(stickH * 0.21, 12, 16) * (1 + 0.12 * switchPulse);
      ptxt(promoIcon + ' ' + promoName, stickW / 2, stickH * 0.42, FT(nameFs), '#ffffff');

      // 3. Hook line
      const smallFs = clamp(stickH * 0.13, 8.5, 10.5);
      txt(promoDesc, stickW / 2, stickH * 0.60, FN(smallFs, 800), '#e2e8f0');

      // 4. Note pill + floating corner icons riding the tilt
      const notePillW = stickW - 16;
      const notePillH = Math.floor(stickH * 0.22);
      const notePillY = stickH - notePillH - 6;
      pill(8, notePillY, notePillW, notePillH, 'rgba(' + promoGlow + ', 0.20)', 'rgba(' + promoGlow + ', 0.75)');
      txt('COMING SOON • OCT 12TH', stickW / 2, notePillY + notePillH / 2 + 1, FN(clamp(notePillH * 0.48, 8, 9.5), 900), '#ffffff');
      const bobA = Math.sin(tGlobal * 2.2) * 2.5, bobB = Math.sin(tGlobal * 2.2 + 2.1) * 2.5;
      ptxt(cornerIcon1, 2, 12 + bobA, FN(13, 900), '#ffffff');
      ptxt(cornerIcon2, stickW - 2, stickH - 2 + bobB, FN(13, 900), '#ffffff');
    }
    g.restore();

    // Click zone for the sticker
    zone(stickX - 6, stickY - 6, stickW + 12, stickH + 12, {
      fn: () => {
        if(promoStage === 0){
          toast('🗺️ NEW MAPS COMING SOON! TENTATIVE DATE: OCT 12TH');
        } else if(promoStage === 1){
          toast('🧟 INFECTED MODE COMING SOON! TENTATIVE DATE: OCT 12TH');
        } else {
          toast('❄️ FREEZE TAG COMING SOON! TENTATIVE DATE: OCT 12TH');
        }
        sfx('ui');
      }
    });
  }
  }

  if(menu.tab !== 'online' || (typeof NET !== 'undefined' && NET && NET.role !== null)){
  // 5. Settings Strip
  rr(g, stripX, stripY, stripW, stripH, 12);
  g.fillStyle = 'rgba(14, 18, 28, 0.94)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.stroke();

  const mapLabelText = settings.randomMap ? '🎲 RANDOM ARENA ▾' : ('🗺️ ' + (settings.map + 1) + '. ' + MAPS[settings.map].name + ' ▾');

  if(isNarrowW){
    // Statically stacked for narrow mobile phones
    const rowH1 = Math.floor(stripH / 2);
    // Row 1: Map Selector
    const mapY = stripY + 3;
    const arrowW = 34;
    // Left Arrow
    drawJuicyChip(stripX + 6, mapY, arrowW, rowH1 - 6, {
      label: '◀',
      fontSize: 13,
      textColor: '#ffffff',
      fn: () => cycleMap(-1)
    });

    // Right Arrow
    const rightNarrowX = stripX + stripW - arrowW - 6;
    drawJuicyChip(rightNarrowX, mapY, arrowW, rowH1 - 6, {
      label: '▶',
      fontSize: 13,
      textColor: '#ffffff',
      fn: () => cycleMap(1)
    });

    // Middle Map Name (Opens Modal!)
    const mapMidW = stripW - arrowW * 2 - 24;
    const mapMidX = stripX + arrowW + 12;
    drawJuicyChip(mapMidX, mapY, mapMidW, rowH1 - 6, {
      label: mapLabelText,
      active: settings.randomMap,
      activeBg: 'rgba(255, 209, 102, 0.35)',
      activeDarkBg: 'rgba(180, 83, 9, 0.5)',
      activeText: '#ffd166',
      activeBorder: '#ffd166',
      textColor: '#ffffff',
      fontSize: 11.5,
      fn: () => {
        if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){ toast('HOST SELECTS THE ARENA'); sfx('back'); return; }
        menu.mapModal = true; sfx('ok');
      }
    });

    // Row 2: Chips (2x Jump, 120s Timer, and NEW GAMEMODE: Teams)
    const chipsY = stripY + rowH1 + 1;
    const chipW = Math.floor((stripW - 24) / 3);
    const chipH = rowH1 - 6;

    // Chip 1: Double Jump
    drawJuicyChip(stripX + 6, chipsY, chipW, chipH, {
      label: '2x JUMP',
      active: settings.doubleJump,
      activeBg: '#2ed573',
      activeDarkBg: '#166534',
      activeText: '#ffffff',
      fontSize: 10.5,
      fn: () => {
        if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){ toast('HOST CONTROLS ROOM MODIFIERS'); sfx('back'); return; }
        settings.doubleJump = !settings.doubleJump; sfx('ui');
        if(typeof NET !== 'undefined' && NET && NET.isHost) netBroadcastSettings();
      }
    });

    // Chip 2: Timer (or Target Captures if CTF)
    const isCtf_mob = (settings.gameMode === 'ctf');
    const chip2Label_mob = isCtf_mob ? ('🎯 ' + (settings.ctfTargetCaptures || 3) + ' CAPS') : ('⏱️ ' + settings.time + 's');
    const chip2Bg_mob = isCtf_mob ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 209, 102, 0.22)';
    const chip2DarkBg_mob = isCtf_mob ? 'rgba(153, 27, 27, 0.5)' : 'rgba(180, 83, 9, 0.45)';
    const chip2Text_mob = isCtf_mob ? '#ff6b6b' : '#ffd166';
    const chip2Border_mob = isCtf_mob ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 209, 102, 0.55)';
    drawJuicyChip(stripX + 12 + chipW, chipsY, chipW, chipH, {
      label: chip2Label_mob,
      active: true,
      activeBg: chip2Bg_mob,
      activeDarkBg: chip2DarkBg_mob,
      activeText: chip2Text_mob,
      activeBorder: chip2Border_mob,
      fontSize: 10.5,
      fn: () => {
        if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){
          toast(isCtf_mob ? 'HOST CONTROLS TARGET CAPTURES' : 'HOST CONTROLS ROOM TIMER');
          sfx('back'); return;
        }
        if(isCtf_mob){
          settings.ctfTargetCaptures = (settings.ctfTargetCaptures === 3 ? 5 : 3);
          toast('🎯 TARGET CAPTURES: ' + settings.ctfTargetCaptures);
          sfx('ui');
        } else {
          settings.timeIdx = (settings.timeIdx + 1) % TIMES.length;
          sfx('ui');
        }
        if(typeof NET !== 'undefined' && NET && NET.isHost) netBroadcastSettings();
      }
    });

    // Chip 3: Game Mode (Party -> Teams -> Hunter)
    const chip3X = stripX + 18 + chipW * 2;
    const curGM_mob = settings.gameMode || (settings.teams ? 'teams' : 'party');
    let gmLabel_mob = '👥 PARTY', gmBadge_mob = 'TRY NEW MODES!', gmBadgeBg_mob = '#ff4757';
    let gmActive_mob = false, gmBg_mob = '#f39c12', gmDarkBg_mob = '#b45309';
    let gmText_mob = '#cbd5e1', gmBorder_mob = 'rgba(255,255,255,0.2)';

    if(curGM_mob === 'hunter'){
      gmLabel_mob = '🎯 HUNTER';
      gmBadge_mob = 'TRY NOW!';
      gmBadgeBg_mob = '#e056fd';
      gmActive_mob = true;
      gmBg_mob = '#8b5cf6';
      gmDarkBg_mob = '#4c1d95';
      gmText_mob = '#ffffff';
      gmBorder_mob = '#e056fd';
    } else if(curGM_mob === 'teams'){
      gmLabel_mob = '⚔️ TEAMS';
      gmBadge_mob = 'NEW!';
      gmBadgeBg_mob = '#e056fd';
      gmActive_mob = true;
      gmBg_mob = '#f39c12';
      gmDarkBg_mob = '#b45309';
      gmText_mob = '#0f172a';
      gmBorder_mob = '#ffffff';
    } else if(curGM_mob === 'freeze'){
      gmLabel_mob = '❄️ FREEZE';
      gmActive_mob = true;
      gmBg_mob = '#0ea5e9';
      gmDarkBg_mob = '#0369a1';
      gmText_mob = '#ffffff';
      gmBorder_mob = '#38bdf8';
    } else if(curGM_mob === 'infection'){
      gmLabel_mob = '🧟 INFECTION';
      gmBadge_mob = 'HOT!';
      gmBadgeBg_mob = '#10b981';
      gmActive_mob = true;
      gmBg_mob = '#059669';
      gmDarkBg_mob = '#065f46';
      gmText_mob = '#ffffff';
      gmBorder_mob = '#34d399';
    } else if(curGM_mob === 'bomb'){
      gmLabel_mob = '💣 BOMB';
      gmBadge_mob = 'WILD!';
      gmBadgeBg_mob = '#ef4444';
      gmActive_mob = true;
      gmBg_mob = '#dc2626';
      gmDarkBg_mob = '#991b1b';
      gmText_mob = '#ffffff';
      gmBorder_mob = '#f87171';
    } else if(curGM_mob === 'crown'){
      gmLabel_mob = '👑 CROWN';
      gmBadge_mob = 'NEW!';
      gmBadgeBg_mob = '#eab308';
      gmActive_mob = true;
      gmBg_mob = '#ca8a04';
      gmDarkBg_mob = '#854d0e';
      gmText_mob = '#ffffff';
      gmBorder_mob = '#fef08a';
    } else if(curGM_mob === 'ctf'){
      gmLabel_mob = '🚩 CTF';
      gmBadge_mob = 'NEW!';
      gmBadgeBg_mob = '#ef4444';
      gmActive_mob = true;
      gmBg_mob = '#dc2626';
      gmDarkBg_mob = '#991b1b';
      gmText_mob = '#ffffff';
      gmBorder_mob = '#f87171';
    }

    drawJuicyChip(chip3X, chipsY, chipW, chipH, {
      label: gmLabel_mob,
      active: gmActive_mob,
      activeBg: gmBg_mob,
      activeDarkBg: gmDarkBg_mob,
      activeText: gmText_mob,
      activeBorder: gmBorder_mob,
      textColor: curGM_mob === 'hunter' ? '#ffffff' : (curGM_mob === 'teams' ? '#ffd166' : '#cbd5e1'),
      fontSize: 10.5,
      badge: gmBadge_mob,
      badgeBg: gmBadgeBg_mob,
      fn: () => cycleGameMode(1)
    });

  } else {
    // Single sleek horizontal dock for desktop & tablets
    const itemH = stripH - 10;
    const itemY = stripY + 5;

    // Map Selector Box (Left half)
    const mapBoxW = clamp(stripW * 0.48, 220, 360);
    const arrowW = 34;

    // Left Arrow
    drawJuicyChip(stripX + 6, itemY, arrowW, itemH, {
      label: '◀',
      fontSize: 14,
      textColor: '#ffffff',
      fn: () => cycleMap(-1)
    });

    // Right Arrow
    const rightArrowX = stripX + 6 + mapBoxW - arrowW;
    drawJuicyChip(rightArrowX, itemY, arrowW, itemH, {
      label: '▶',
      fontSize: 14,
      textColor: '#ffffff',
      fn: () => cycleMap(1)
    });

    // Middle Map Name (Opens Modal!)
    const mapMidW = mapBoxW - arrowW * 2 - 8;
    const mapMidX = stripX + 6 + arrowW + 4;
    drawJuicyChip(mapMidX, itemY, mapMidW, itemH, {
      label: mapLabelText,
      active: settings.randomMap,
      activeBg: 'rgba(255, 209, 102, 0.35)',
      activeDarkBg: 'rgba(180, 83, 9, 0.5)',
      activeText: '#ffd166',
      activeBorder: '#ffd166',
      textColor: '#ffffff',
      fontSize: clamp(itemH * 0.40, 11, 13.5),
      fn: () => {
        if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){ toast('HOST SELECTS THE ARENA'); sfx('back'); return; }
        menu.mapModal = true; sfx('ok');
      }
    });

    // Right side: 3 Modifier Chips
    const chipsX = stripX + 6 + mapBoxW + 12;
    const chipsAvailW = stripW - (chipsX - stripX) - 10;
    const chipW = Math.floor((chipsAvailW - 12) / 3);

    // Chip 1: Double Jump
    drawJuicyChip(chipsX, itemY, chipW, itemH, {
      label: '2x JUMP',
      active: settings.doubleJump,
      activeBg: '#2ed573',
      activeDarkBg: '#166534',
      activeText: '#ffffff',
      fontSize: 11.5,
      fn: () => {
        if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){ toast('HOST CONTROLS ROOM MODIFIERS'); sfx('back'); return; }
        settings.doubleJump = !settings.doubleJump; sfx('ui');
        if(typeof NET !== 'undefined' && NET && NET.isHost) netBroadcastSettings();
      }
    });

    // Chip 2: Timer (or Target Captures if CTF)
    const isCtf_desk = (settings.gameMode === 'ctf');
    const chip2Label_desk = isCtf_desk ? ('🎯 ' + (settings.ctfTargetCaptures || 3) + ' CAPS') : ('⏱️ ' + settings.time + 's');
    const chip2Bg_desk = isCtf_desk ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 209, 102, 0.22)';
    const chip2DarkBg_desk = isCtf_desk ? 'rgba(153, 27, 27, 0.5)' : 'rgba(180, 83, 9, 0.45)';
    const chip2Text_desk = isCtf_desk ? '#ff6b6b' : '#ffd166';
    const chip2Border_desk = isCtf_desk ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 209, 102, 0.55)';
    drawJuicyChip(chipsX + chipW + 6, itemY, chipW, itemH, {
      label: chip2Label_desk,
      active: true,
      activeBg: chip2Bg_desk,
      activeDarkBg: chip2DarkBg_desk,
      activeText: chip2Text_desk,
      activeBorder: chip2Border_desk,
      fontSize: 11.5,
      fn: () => {
        if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){
          toast(isCtf_desk ? 'HOST CONTROLS TARGET CAPTURES' : 'HOST CONTROLS ROOM TIMER');
          sfx('back'); return;
        }
        if(isCtf_desk){
          settings.ctfTargetCaptures = (settings.ctfTargetCaptures === 3 ? 5 : 3);
          toast('🎯 TARGET CAPTURES: ' + settings.ctfTargetCaptures);
          sfx('ui');
        } else {
          settings.timeIdx = (settings.timeIdx + 1) % TIMES.length;
          sfx('ui');
        }
        if(typeof NET !== 'undefined' && NET && NET.isHost) netBroadcastSettings();
      }
    });

    // Chip 3: Game Mode (Party -> Teams -> Hunter)
    const chip3X = chipsX + chipW * 2 + 12;
    const curGM_desk = settings.gameMode || (settings.teams ? 'teams' : 'party');
    let gmLabel_desk = '👥 FFA PARTY', gmBadge_desk = 'TRY NEW MODES!', gmBadgeBg_desk = '#ff4757';
    let gmActive_desk = false, gmBg_desk = '#f39c12', gmDarkBg_desk = '#b45309';
    let gmText_desk = '#cbd5e1', gmBorder_desk = 'rgba(255,255,255,0.2)';

    if(curGM_desk === 'hunter'){
      gmLabel_desk = '🎯 HUNTER MODE';
      gmBadge_desk = 'TRY NOW!';
      gmBadgeBg_desk = '#e056fd';
      gmActive_desk = true;
      gmBg_desk = '#8b5cf6';
      gmDarkBg_desk = '#4c1d95';
      gmText_desk = '#ffffff';
      gmBorder_desk = '#e056fd';
    } else if(curGM_desk === 'teams'){
      gmLabel_desk = '⚔️ TEAMS';
      gmBadge_desk = 'NEW!';
      gmBadgeBg_desk = '#e056fd';
      gmActive_desk = true;
      gmBg_desk = '#f39c12';
      gmDarkBg_desk = '#b45309';
      gmText_desk = '#0f172a';
      gmBorder_desk = '#ffffff';
    } else if(curGM_desk === 'freeze'){
      gmLabel_desk = '❄️ FREEZE TAG';
      gmActive_desk = true;
      gmBg_desk = '#0ea5e9';
      gmDarkBg_desk = '#0369a1';
      gmText_desk = '#ffffff';
      gmBorder_desk = '#38bdf8';
    } else if(curGM_desk === 'infection'){
      gmLabel_desk = '🧟 INFECTION';
      gmBadge_desk = 'HOT!';
      gmBadgeBg_desk = '#10b981';
      gmActive_desk = true;
      gmBg_desk = '#059669';
      gmDarkBg_desk = '#065f46';
      gmText_desk = '#ffffff';
      gmBorder_desk = '#34d399';
    } else if(curGM_desk === 'bomb'){
      gmLabel_desk = '💣 BOMB TAG';
      gmBadge_desk = 'WILD!';
      gmBadgeBg_desk = '#ef4444';
      gmActive_desk = true;
      gmBg_desk = '#dc2626';
      gmDarkBg_desk = '#991b1b';
      gmText_desk = '#ffffff';
      gmBorder_desk = '#f87171';
    } else if(curGM_desk === 'crown'){
      gmLabel_desk = '👑 CROWN KING';
      gmBadge_desk = 'NEW!';
      gmBadgeBg_desk = '#eab308';
      gmActive_desk = true;
      gmBg_desk = '#ca8a04';
      gmDarkBg_desk = '#854d0e';
      gmText_desk = '#ffffff';
      gmBorder_desk = '#fef08a';
    } else if(curGM_desk === 'ctf'){
      gmLabel_desk = '🚩 CTF MODE';
      gmBadge_desk = 'NEW!';
      gmBadgeBg_desk = '#ef4444';
      gmActive_desk = true;
      gmBg_desk = '#dc2626';
      gmDarkBg_desk = '#991b1b';
      gmText_desk = '#ffffff';
      gmBorder_desk = '#f87171';
    }

    drawJuicyChip(chip3X, itemY, chipW, itemH, {
      label: gmLabel_desk,
      active: gmActive_desk,
      activeBg: gmBg_desk,
      activeDarkBg: gmDarkBg_desk,
      activeText: gmText_desk,
      activeBorder: gmBorder_desk,
      textColor: curGM_desk === 'hunter' ? '#ffffff' : (curGM_desk === 'teams' ? '#ffd166' : '#cbd5e1'),
      fontSize: 11.5,
      badge: gmBadge_desk,
      badgeBg: gmBadgeBg_desk,
      fn: () => cycleGameMode(1)
    });
  }
  }

  // 6. Giant START MATCH Button / Online Action Button
  if(menu.tab === 'online'){
    if(NET.role !== null){
      const startBtnX = Math.floor(CW/2 - startBtnW/2);
      if(NET.isHost){
        const actCount = activeSlots().length;
        const canStart = actCount >= 2;
        const hostLabel = canStart ? '▶ START ONLINE MATCH (SPACE)' : '⏳ WAITING FOR PLAYERS (MIN 2)';
        drawJuicyBtn(startBtnX, startBtnY, startBtnW, startBtnH, {
          label: hostLabel,
          bg: canStart ? '#2ecc71' : '#64748b',
          darkBg: canStart ? '#166534' : '#334155',
          depth: 5,
          shine: canStart,
          boldFont: true,
          fontSize: clamp(startBtnH * 0.38, 12, 16),
          disabled: !canStart,
          fn: canStart ? () => netForceStart() : null
        });
      } else if(NET.isSpectator){
        drawJuicyBtn(startBtnX, startBtnY, startBtnW, startBtnH, {
          label: '👁️ SPECTATING MATCH',
          bg: '#38bdf8',
          darkBg: '#0284c7',
          depth: 5,
          boldFont: true,
          fontSize: clamp(startBtnH * 0.38, 12, 16)
        });
      } else {
        const myReady = (NET.mySlot >= 0 && NET.slotsReady[NET.mySlot]);
        const guestLabel = myReady ? '✓ READY (WAITING FOR HOST)' : '▶ CLICK TO READY UP';
        drawJuicyBtn(startBtnX, startBtnY, startBtnW, startBtnH, {
          label: guestLabel,
          bg: myReady ? '#2ecc71' : '#f39c12',
          darkBg: myReady ? '#166534' : '#b45309',
          depth: 5,
          shine: true,
          boldFont: true,
          fontSize: clamp(startBtnH * 0.38, 12, 16),
          fn: () => netToggleMyReady()
        });
      }
      // Tiny hint: scoreboard (ping + mute) lives behind TAB / timer tap in-match.
      txt(isTouch ? '💡 In-match: tap the timer to check ping / mute players' : '💡 In-match: press TAB to check ping / mute players',
        CW/2, startBtnY + startBtnH + 9, FN(9, 800), 'rgba(255,255,255,0.55)');
    }
  } else {
    const startBtnX = Math.floor(CW/2 - startBtnW/2);
    let startLabel = isTouch ? '▶ START MATCH' : '▶ START MATCH  (SPACE / ENTER)';
    if(isBots) startLabel = (settings.gameMode === 'ctf') ? '🚩 WATCH CTF BATTLE' : '▶ WATCH BOTS BATTLE';
    else if(settings.gameMode === 'ctf') startLabel = isTouch ? '🚩 START CTF MATCH' : '🚩 START CTF MATCH (SPACE)';
    else if(settings.gameMode === 'hunter') startLabel = isTouch ? '🎯 START HUNTER MATCH' : '🎯 START HUNTER MATCH (SPACE)';
    else if(settings.gameMode === 'freeze') startLabel = isTouch ? '❄️ START FREEZE MATCH' : '❄️ START FREEZE MATCH (SPACE)';
    else if(settings.gameMode === 'crown') startLabel = isTouch ? '👑 START CROWN MATCH' : '👑 START CROWN MATCH (SPACE)';
    else if(settings.gameMode === 'infection') startLabel = isTouch ? '🧟 START INFECTION MATCH' : '🧟 START INFECTION MATCH (SPACE)';
    else if(settings.gameMode === 'bomb') startLabel = isTouch ? '💣 START BOMB MATCH' : '💣 START BOMB MATCH (SPACE)';
    else if(isTeams) startLabel = isTouch ? '⚔️ START TEAM MATCH' : '⚔️ START TEAM MATCH (SPACE)';
    const labelFs = clamp(startBtnH * 0.38, 12.5, 16.5);
    const startBg = settings.gameMode === 'ctf' ? '#dc2626' : (settings.gameMode === 'hunter' ? '#8b5cf6' : (settings.gameMode === 'freeze' ? '#0ea5e9' : (settings.gameMode === 'crown' ? '#ca8a04' : (settings.gameMode === 'infection' ? '#059669' : (settings.gameMode === 'bomb' ? '#dc2626' : (isTeams ? '#f1c40f' : '#2ecc71'))))));
    const startDarkBg = settings.gameMode === 'ctf' ? '#991b1b' : (settings.gameMode === 'hunter' ? '#4c1d95' : (settings.gameMode === 'freeze' ? '#0369a1' : (settings.gameMode === 'crown' ? '#854d0e' : (settings.gameMode === 'infection' ? '#065f46' : (settings.gameMode === 'bomb' ? '#991b1b' : (isTeams ? '#b45309' : '#166534'))))));
    const isDarkText = (!isTeams || settings.gameMode === 'ctf' || settings.gameMode === 'hunter' || settings.gameMode === 'freeze' || settings.gameMode === 'crown' || settings.gameMode === 'infection' || settings.gameMode === 'bomb') ? false : true;
    drawJuicyBtn(startBtnX, startBtnY, startBtnW, startBtnH, {
      label: startLabel,
      bg: startBg,
      darkBg: startDarkBg,
      textColor: isDarkText ? '#0f172a' : '#ffffff',
      textShadow: isDarkText ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
      depth: 5,
      shine: true,
      boldFont: true,
      fontSize: labelFs,
      fn: () => {
        if(settings.gameMode === 'hunter'){
          validateHunterRoles();
          if(activeSlots().length < 4){
            toast('🎯 HUNTER MODE REQUIRES AT LEAST 4 PLAYERS!');
            sfx('back');
            return;
          }
        } else if(settings.gameMode === 'freeze' && activeSlots().length < 3){
          toast('⚠️ FREEZE REQUIRES AT LEAST 3 PLAYERS!');
          sfx('back');
          return;
        } else if(activeSlots().length < 2){
          if(typeof NET === 'undefined' || !NET || NET.role === null || !NET.isSpectator){
            menu.slotColor[0] = 0; menu.slotColor[1] = 1;
          }
        }
        sfx('go');
        startMatch();
      }
    });
  }
  // Career line (retention: reason to come back) — centered in its reserved band with click to switch trail
  const _mcl = (typeof careerLine === 'function') ? careerLine() : '';
  if(_mcl && careerBandH > 0){
    txt(_mcl, CW/2, startBtnY - careerBandH/2 + 1, FN(10, 800), 'rgba(255,209,102,0.85)');
    zone(CW/2 - 190, startBtnY - careerBandH, 380, careerBandH + 4, {
      fn: () => cycleCosmeticTrail(1)
    });
  }
  // 7. Toast Message
  if(menu.toastT > 0 && menu.toast){
    const a = clamp(menu.toastT, 0, 1);
    g.save(); g.globalAlpha = a;
    g.font = FN(15, 900);
    const w4 = g.measureText(menu.toast).width + 44;
    pill(CW/2 - w4/2, CH * 0.44, w4, 38, 'rgba(30,30,30,0.88)', '#ffffff');
    txt(menu.toast, CW/2, CH * 0.44 + 20, FN(14, 900), '#ffffff');
    g.restore();
  }

  // 8. Modals (draw on top if open)
  drawMapModal();
  drawOnlineComingSoonModal();
}

/* Helper to render an individual Player Card with interactive controls */
function drawPlayerCard(cx, cardY, cardW, cardH, slotIdx, isBot, canRemove){
  const col = getSlotColor(slotIdx, menu.slotColor, menu.slotTeam);
  const centerX = cx + cardW / 2;
  const slotTeam = (menu.slotTeam && menu.slotTeam[slotIdx] != null) ? (menu.slotTeam[slotIdx] % 2) : (slotIdx % 2);
  const isHunter = (settings.gameMode === 'hunter') && ((slotTeam === 0 && settings.hunterRed === slotIdx) || (slotTeam === 1 && settings.hunterBlue === slotIdx));

  rr(g, cx - 2, cardY - 2, cardW + 4, cardH + 4, 14);
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  rr(g, cx, cardY, cardW, cardH, 12);
  g.fillStyle = 'rgba(16, 22, 34, 0.90)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = isBot ? '#ff4757' : (isHunter ? '#ffd166' : col); g.stroke();

  // Header Title
  const headTitleH = clamp(cardH * 0.16, 16, 24);
  const pTitle = isBot ? ('🤖 BOT' + ((menu.tab === 'bots') ? ' ' + (slotIdx + 1) : '')) : ('PLAYER ' + (slotIdx + 1));
  ptxt(pTitle, centerX, cardY + headTitleH * 0.62, FT(clamp(cardW * 0.082, 10.5, 13.5)), isBot ? '#ff6b81' : col);
  if(slotIdx > 0 && menu.tab !== 'bots' && menu.tab !== 'solo' && (typeof NET === 'undefined' || !NET || NET.role === null)){
    zone(cx, cardY, cardW - (canRemove ? 26 : 0), headTitleH + 6, {
      fn: () => {
        if(!menu.slotIsBot) menu.slotIsBot = [false, false, false, false, false, false, false, false, false, false];
        menu.slotIsBot[slotIdx] = !menu.slotIsBot[slotIdx];
        sfx('ui');
        toast((menu.slotIsBot[slotIdx] ? '🤖 BOT ' : '👤 HUMAN ') + 'ASSIGNED TO P' + (slotIdx + 1));
      }
    });
  }

  // Remove Button (✕) on P3 / P4 cards
  if(canRemove){
    const rxSz = clamp(cardW * 0.12, 18, 22);
    const rxX = cx + cardW - rxSz - 4, rxY = cardY + 4;
    drawJuicyIconBtn(rxX, rxY, rxSz, {
      r: 6,
      depth: 2,
      bg: '#e74c3c',
      darkBg: '#b91c1c',
      icon: '✕',
      iconColor: '#ffffff',
      iconSize: 10,
      fn: () => {
        menu.slotColor[slotIdx] = -1;
        if(slotIdx === 2) menu.slotColor[3] = -1;
        if(settings.gameMode === 'hunter') validateHunterRoles();
        sfx('back');
      }
    });
  }

  // Avatar in middle
  const avY = isBot ? (cardY + cardH * 0.36) : (cardY + cardH * 0.40);
  const charSz = clamp(cardH * 0.27, 20, 40);
  drawChar(g, centerX, avY, charSz, col, { face: isBot ? 'cool' : 'happy', grounded: true, seed: slotIdx * 3 });

  // Per-Bot Difficulty Chip (Easy / Hard per bot)
  if(isBot){
    const diffH = clamp(cardH * 0.11, 15, 20);
    const diffY = cardY + cardH * 0.50;
    const diffW = cardW - 14;
    const diffX = cx + 7;
    const slotDiff = (typeof getSlotBotDiff === 'function') ? getSlotBotDiff(slotIdx) : 'hard';
    const isHard = (slotDiff === 'hard');

    rr(g, diffX, diffY, diffW, diffH, 5);
    g.fillStyle = isHard ? 'rgba(235, 60, 40, 0.22)' : 'rgba(46, 204, 113, 0.22)';
    g.fill();
    g.lineWidth = 1.2;
    g.strokeStyle = isHard ? '#ff6b81' : '#2ed573';
    g.stroke();

    ptxt('‹', diffX + 7, diffY + diffH/2 + 1, FT(10), '#ffffff');
    ptxt('›', diffX + diffW - 7, diffY + diffH/2 + 1, FT(10), '#ffffff');

    const diffFs = clamp(cardW * 0.065, 8.5, 10.5);
    const diffLabel = isHard ? '🔥 HARD BOT' : '🌱 EASY BOT';
    ptxt(diffLabel, centerX, diffY + diffH/2 + 1, FN(diffFs, 900), isHard ? '#ff6b81' : '#2ed573');

    zone(diffX, diffY, diffW, diffH, { fn: () => toggleSlotBotDiff(slotIdx) });
  }

  // Hunter Mode Role Badge / Picker
  if(settings.gameMode === 'hunter'){
    const roleH = clamp(cardH * 0.11, 15, 19);
    const roleY = cardY + cardH * 0.54;
    const roleW = cardW - 14;
    const roleX = cx + 7;
    const candVotes = getCandidateVoteCount(slotIdx, slotTeam);
    const isMeCard = (typeof NET !== 'undefined' && NET && NET.role !== null && NET.mySlot === slotIdx);
    const youTag = isMeCard ? ' (YOU)' : '';
    const tapBadge = candVotes === 1 ? ' • 1 tap' : (candVotes > 1 ? (' • ' + candVotes + ' taps') : '');
    if(isHunter){
      rr(g, roleX, roleY, roleW, roleH, 5);
      g.fillStyle = slotTeam === 0 ? 'rgba(235, 60, 40, 0.88)' : 'rgba(47, 155, 232, 0.88)';
      g.fill();
      g.lineWidth = 1.2; g.strokeStyle = '#ffd166'; g.stroke();
      txt('👑 HUNTS NEXT' + youTag + tapBadge, centerX, roleY + roleH/2 + 1, FN(clamp(roleH * 0.55, 8.5, 10.5), 900), '#ffffff');
      zone(roleX, roleY, roleW, roleH, { fn: () => selectHunterRole(slotIdx) });
    } else {
      rr(g, roleX, roleY, roleW, roleH, 5);
      g.fillStyle = 'rgba(255, 255, 255, 0.08)'; g.fill();
      g.lineWidth = 1; g.strokeStyle = 'rgba(255, 255, 255, 0.22)'; g.stroke();
      txt('👆 TAP = HUNTER' + youTag + tapBadge, centerX, roleY + roleH/2 + 1, FN(clamp(roleH * 0.50, 7.5, 9), 800), '#cbd5e1');
      zone(roleX, roleY, roleW, roleH, { fn: () => selectHunterRole(slotIdx) });
    }
  }

  // Control Selector Bar (WASD / Arrows / IJKL / TFGH / CONTROLLER / 🤖 BOT)
  const ctrlH = clamp(cardH * 0.14, 18, 24);
  const ctrlY = cardY + cardH * 0.63;
  const ctrlW = cardW - 14;
  const ctrlX = cx + 7;

  rr(g, ctrlX, ctrlY, ctrlW, ctrlH, 6);
  g.fillStyle = 'rgba(255, 255, 255, 0.09)'; g.fill();
  g.lineWidth = 1; g.strokeStyle = isBot ? 'rgba(255,107,129,0.45)' : 'rgba(255, 255, 255, 0.28)'; g.stroke();

  // Left arrow
  ptxt('‹', ctrlX + 8, ctrlY + ctrlH/2 + 1, FT(11), '#ffffff');
  zone(ctrlX, ctrlY, 22, ctrlH, { fn: () => cycleSlotCtrl(slotIdx, -1) });

  // Right arrow
  ptxt('›', ctrlX + ctrlW - 8, ctrlY + ctrlH/2 + 1, FT(11), '#ffffff');
  zone(ctrlX + ctrlW - 22, ctrlY, 22, ctrlH, { fn: () => cycleSlotCtrl(slotIdx, 1) });

  // Control Label
  let ctrlLabel = 'WASD';
  if(isBot){
    ctrlLabel = '🤖 BOT';
  } else {
    const curCtrlIdx = (menu.slotCtrl && menu.slotCtrl[slotIdx] != null) ? menu.slotCtrl[slotIdx] : slotIdx;
    const curCtrl = LOCAL_CTRL_SCHEMES[((curCtrlIdx % LOCAL_CTRL_SCHEMES.length) + LOCAL_CTRL_SCHEMES.length) % LOCAL_CTRL_SCHEMES.length];
    ctrlLabel = curCtrl ? curCtrl.label : 'WASD';
  }
  const ctrlFs = clamp(cardW * 0.065, 8.5, 10.5);
  ptxt(ctrlLabel, centerX, ctrlY + ctrlH/2 + 1, FN(ctrlFs, 900), isBot ? '#ff6b81' : '#ffd166');
  zone(ctrlX + 22, ctrlY, ctrlW - 44, ctrlH, { fn: () => cycleSlotCtrl(slotIdx, 1) });

  // Color Cycler Bar
  const barH = clamp(cardH * 0.14, 18, 24);
  const barY = cardY + cardH - barH - 7;
  const barW = cardW - 14;
  const barX = cx + 7;

  rr(g, barX, barY, barW, barH, 6);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
  g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.2)'; g.stroke();

  // Left = RED, Right = BLUE (direct pick, no toggle)
  const cardTeam = settings.teams ? ((menu.slotTeam && menu.slotTeam[slotIdx] != null) ? (menu.slotTeam[slotIdx] % TEAMS.length) : (slotIdx % 2)) : -1;
  ptxt('🔴', barX + 8, barY + barH/2 + 1, FT(12), (!settings.teams || cardTeam === 0) ? '#ffd166' : 'rgba(255,255,255,0.45)');
  zone(barX, barY, 20, barH, { fn: () => {
    if(settings.teams) setPlayerTeam(slotIdx, 0); else cycleSlot(slotIdx, -1);
  }});

  // Right Arrow
  ptxt('🔵', barX + barW - 8, barY + barH/2 + 1, FT(12), (!settings.teams || cardTeam === 1) ? '#ffd166' : 'rgba(255,255,255,0.45)');
  zone(barX + barW - 20, barY, 20, barH, { fn: () => {
    if(settings.teams) setPlayerTeam(slotIdx, 1); else cycleSlot(slotIdx, 1);
  }});

  // Color / Team Name in Middle
  let colName = '';
  if(settings.teams){
    const tIdx = (menu.slotTeam && menu.slotTeam[slotIdx] != null) ? (menu.slotTeam[slotIdx] % TEAMS.length) : (slotIdx % 2);
    const teamDef = TEAMS[tIdx] || TEAMS[0];
    colName = teamDef ? teamDef.name : 'TEAM';
  } else {
    const curCol = (menu.slotColor[slotIdx] >= 0) ? menu.slotColor[slotIdx] : slotIdx;
    colName = (PALETTE[curCol % PALETTE.length] || PALETTE[0]).name;
  }
  ptxt(colName, centerX, barY + barH/2 + 1, FN(clamp(cardW * 0.068, 8.5, 10.5), 900), '#ffffff');
  if(!settings.teams){
    zone(barX + 20, barY, barW - 40, barH, { fn: () => {
      cycleSlot(slotIdx, 1);
    }});
  }
}

/* Helper to render "+ ADD PLAYER" card */
function drawAddPlayerCard(cx, cardY, cardW, cardH, nextSlot){
  const isHover = !isTouch && isPointerIn(cx, cardY, cardW, cardH);
  const pushY = (isHover && pointerDown) ? 2 : (isHover ? -2 : 0);
  const centerX = cx + cardW / 2;
  const centerY = cardY + cardH / 2 + pushY;

  // Dashed style box with hover lift
  rr(g, cx, cardY + pushY, cardW, cardH, 12);
  g.fillStyle = isHover ? 'rgba(46, 204, 113, 0.08)' : 'rgba(255, 255, 255, 0.04)'; g.fill();
  g.lineWidth = isHover ? 2.5 : 2;
  g.setLineDash ? g.setLineDash([6, 5]) : null;
  g.strokeStyle = isHover ? '#2ecc71' : 'rgba(255, 255, 255, 0.35)';
  g.stroke();
  g.setLineDash ? g.setLineDash([]) : null;

  // Plus 3D Button
  const plusSz = clamp(cardW * 0.32, 34, 48);
  drawJuicyIconBtn(centerX - plusSz/2, centerY - plusSz/2 - 12, plusSz, {
    r: Math.floor(plusSz / 2),
    depth: 3,
    bg: '#2ecc71',
    darkBg: '#166534',
    icon: '+',
    iconColor: '#ffffff',
    iconSize: Math.round(plusSz * 0.70)
  });

  ptxt('+ ADD P' + (nextSlot + 1), centerX, centerY + plusSz/2 + 6, FN(clamp(cardW * 0.08, 11, 13), 900), isHover ? '#2ed573' : '#2ecc71');
  ptxt('(CLICK TO JOIN)', centerX, centerY + plusSz/2 + 20, FN(clamp(cardW * 0.058, 8.5, 10), 800), 'rgba(255,255,255,0.6)');

  zone(cx, cardY, cardW, cardH, { fn: () => {
    const taken = menu.slotColor.filter(c => c >= 0);
    let pick = -1;
    for(let p = 0; p < PALETTE.length; p++){
      if(!taken.includes(p)){ pick = p; break; }
    }
    menu.slotColor[nextSlot] = (pick >= 0 ? pick : nextSlot % PALETTE.length);
    ensureUniqueLocalColors();
    if(settings.gameMode === 'hunter'){
      enforceHunterBalance();
      validateHunterRoles();
    }
    sfx('ok');
  }});
}
/* ================= HUD / pause / result ================= */
function tri(x,y,r,dir){
  g.beginPath();
  if(dir===0){g.moveTo(x+r*0.45,y-r*0.55);g.lineTo(x+r*0.45,y+r*0.55);g.lineTo(x-r*0.55,y);}
  else if(dir===1){g.moveTo(x-r*0.45,y-r*0.55);g.lineTo(x-r*0.45,y+r*0.55);g.lineTo(x+r*0.55,y);}
  else if(dir===2){g.moveTo(x-r*0.55,y+r*0.45);g.lineTo(x+r*0.55,y+r*0.45);g.lineTo(x,y-r*0.55);}
  else{g.moveTo(x-r*0.55,y-r*0.45);g.lineTo(x+r*0.55,y-r*0.45);g.lineTo(x,y+r*0.55);}
  g.closePath();
}
function drawPadBtn(cx,cy,r,dir,o){
  const active=o.hold?keys.has(o.hold):(tGlobal-(glow[o.pk]||-9))<0.15;
  const pushY = active ? 2 : 0;
  // 3D bottom shadow
  g.beginPath();g.arc(cx,cy+3,r,0,TAU);
  g.fillStyle='rgba(0,0,0,0.3)';g.fill();
  
  // Base circle
  g.beginPath();g.arc(cx,cy+pushY,r,0,TAU);
  g.fillStyle=active?'rgba(255,255,255,0.85)':'rgba(15,23,42,0.75)';
  g.fill();
  g.lineWidth=2.5;g.strokeStyle=active?'#ffffff':'rgba(255,255,255,0.45)';g.stroke();
  
  // Top gloss arc
  g.save();
  g.beginPath();g.arc(cx,cy+pushY,r,0,TAU);g.clip();
  g.beginPath();g.arc(cx,cy+pushY-r*0.35,r,0,TAU);
  g.fillStyle='rgba(255,255,255,0.25)';g.fill();
  g.restore();

  tri(cx,cy+pushY,r*0.55,dir);
  g.fillStyle=active?'#143c26':'#ffffff';
  g.fill();
  zone(cx-r-12,cy-r-12,r*2+24,r*2+24,o);
}

function drawPadBtnAction(cx,cy,r,actionKey,symbol,glowCol,label){
  let active = false;
  if(actionKey === 'left') active = TOUCH.left;
  else if(actionKey === 'right') active = TOUCH.right;
  else if(actionKey === 'jump') active = TOUCH.jumpHeld;
  else if(actionKey === 'down') active = TOUCH.downHeld;
  
  const pushY = active ? 2.5 : 0;
  g.save();
  if(active){
    g.beginPath(); g.arc(cx,cy,r+7,0,TAU);
    g.fillStyle=glowCol||'rgba(255,255,255,0.3)';
    g.fill();
  }
  
  // 3D bottom bevel/shadow
  g.beginPath(); g.arc(cx,cy+4,r,0,TAU);
  g.fillStyle='rgba(0,0,0,0.35)'; g.fill();
  
  // Frosted circular button
  g.beginPath(); g.arc(cx,cy+pushY,r,0,TAU);
  g.fillStyle=active?'rgba(255,255,255,0.92)':'rgba(15,23,42,0.72)';
  g.fill();
  g.lineWidth=active?3.5:2.5;
  g.strokeStyle=active?'#ffffff':'rgba(255,255,255,0.45)';
  g.stroke();
  
  // Top gloss highlight
  g.save();
  g.beginPath(); g.arc(cx,cy+pushY,r,0,TAU); g.clip();
  g.beginPath(); g.arc(cx,cy+pushY-r*0.38,r,0,TAU);
  g.fillStyle='rgba(255,255,255,0.22)'; g.fill();
  g.restore();
  
  // Symbol icon
  g.font=FN(Math.round(r*(label?0.62:0.72)),900);
  g.textAlign='center';
  g.textBaseline='middle';
  g.fillStyle=active?'#0f172a':'#ffffff';
  g.fillText(symbol,cx,cy+pushY+(label?-r*0.12:1));
  
  // Optional small label below icon (e.g. JUMP, DROP on tablet)
  if(label && r>=34){
    g.font=FN(Math.max(9,Math.round(r*0.22)),900);
    g.fillStyle=active?'#0f172a':'rgba(255,255,255,0.75)';
    g.fillText(label,cx,cy+pushY+r*0.52);
  }
  g.restore();
  
  // Generous touch hitbox
  const padH=16;
  zone(cx-r-padH,cy-r-padH,2*(r+padH),2*(r+padH),{
    touchAction: actionKey
  });
}

function drawTouchButtons(){
  if(!match) return;
  
  const isOnline=(typeof NET!=='undefined' && NET && NET.role!==null);
  const isSplitLocal=(!isOnline && match.players.length===2 && !menu.botOn && menu.tab !== 'solo');
  const isTablet=Math.min(CW,CH)>=550 || (CW/CH<1.7 && Math.min(CW,CH)>=480);
  
  if(!isSplitLocal){
    /* ================= SLEEK SEE-THROUGH JOYSTICKS (ONLINE & SOLO) ================= */
    const r = isTablet ? clamp(CH * 0.058, 24, 32) : clamp(CH * 0.075, 20, 26);
    const bm = isTablet ? clamp(CH * 0.07, 24, 44) : clamp(CH * 0.06, 16, 26);
    const sm = isTablet ? clamp(CW * 0.045, 26, 48) : clamp(CW * 0.04, 18, 30);
    
    // --- 1. Left Horizontal-Only Joystick (Floating — spawns at touch position) ---
    const wL = r * 4.2, hL = r * 2.1;
    const defCxL = sm + wL / 2;
    const defCyL = CH - bm - hL / 2;
    const cxL = JOY.leftId ? JOY.leftStartX : defCxL;
    const cyL = JOY.leftId ? clamp(JOY.leftStartY, hL / 2 + 56, CH - hL / 2) : defCyL;
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

    // --- Render Right Vertical Track (shared slider component) ---
    drawVertSlider(cxR, cyTopR, maxTravelR, r, TOUCH.jumpHeld, TOUCH.downHeld, JOY.rightVisY);

    g.restore();
  } else {
    /* ================= 2-PLAYER LOCAL SPLIT (SIDE-TO-SIDE JOYSTICK + FIXED JUMP/DROP) ================= */
    const b = calcLocalBounds();
    const colP1 = (match.players[0] && PALETTE[match.players[0].colIdx]) ? PALETTE[match.players[0].colIdx].c : '#e8433f';
    const colP2 = (match.players[1] && PALETTE[match.players[1].colIdx]) ? PALETTE[match.players[1].colIdx].c : '#2f9be8';

    g.save();

    // 1. Subtle Center Dashed Midline
    g.setLineDash([6, 8]);
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.beginPath();
    g.moveTo(b.midX, 52);
    g.lineTo(b.midX, CH - 14);
    g.stroke();
    g.setLineDash([]);

    // 2. Ambient Corner Watermarks
    const isNarrow = (CW < 600);
    ptxt('P1 ZONE', Math.max(34, CW * 0.08), 34, FN(isNarrow ? 10 : 12, 900), rgba(colP1, 0.45));
    ptxt('P2 ZONE', CW - Math.max(34, CW * 0.08), 34, FN(isNarrow ? 10 : 12, 900), rgba(colP2, 0.45));

    // Helper to draw a player's controls
    const drawPlayerControls = (pData, cfg, col, side) => {
      // Smooth visual knob interpolation
      pData.visOffX += (pData.offX - pData.visOffX) * 0.40;

      // --- A. Side-to-Side Joystick Track ---
      // If active, anchor track at touch position. If idle, show at default resting position.
      const jx = pData.active ? pData.startX : cfg.defJoyX;
      const jy = pData.active ? pData.startY : cfg.defJoyY;
      const tw = b.trackW, th = b.trackH;

      rr(g, jx - tw / 2, jy - th / 2, tw, th, th / 2);
      g.fillStyle = pData.active ? rgba(col, 0.12) : 'rgba(255, 255, 255, 0.08)';
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = pData.active ? rgba(col, 0.50) : 'rgba(255, 255, 255, 0.20)';
      g.stroke();

      // Track slot line
      g.beginPath();
      g.moveTo(jx - b.maxTravel * 0.85, jy);
      g.lineTo(jx + b.maxTravel * 0.85, jy);
      g.lineWidth = 2.5;
      g.strokeStyle = pData.active ? rgba(col, 0.25) : 'rgba(255, 255, 255, 0.10)';
      g.stroke();

      // Chevrons inside track
      ptxt('◀', jx - tw / 2 + b.r * 0.5, jy, FN(10, 900), pData.left ? '#ffffff' : 'rgba(255, 255, 255, 0.30)');
      ptxt('▶', jx + tw / 2 - b.r * 0.5, jy, FN(10, 900), pData.right ? '#ffffff' : 'rgba(255, 255, 255, 0.30)');

      // Joystick Knob
      const kx = jx + pData.visOffX * b.maxTravel;
      const isJoyActive = (pData.left || pData.right);
      g.beginPath();
      g.arc(kx, jy, b.r * 0.82, 0, TAU);
      g.fillStyle = isJoyActive ? rgba(col, 0.65) : 'rgba(255, 255, 255, 0.22)';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = isJoyActive ? '#ffffff' : rgba(col, 0.60);
      g.stroke();

      // Knob center pip or arrow
      const knobIcon = pData.left ? '◀' : (pData.right ? '▶' : '•');
      ptxt(knobIcon, kx, jy + (knobIcon === '•' ? 0 : 1), FN(12, 900), isJoyActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)');

      // --- B+C. Solo-style vertical slider (top = jump, bottom = drop) ---
      // Slide knob mirrors the solo right slider: tap top to jump, drag down to drop.
      // Geometry comes from localSlider() — the exact object input uses.
      pData.sldV += ((pData.downHeld ? 1 : 0) - (pData.sldV || 0)) * 0.45;
      const sl = localSlider(b, side || (cfg.btnX < b.midX ? 'p1' : 'p2'));
      drawVertSlider(sl.cx, sl.cyTop, sl.maxTravel, b.r, pData.jumpHeld, pData.downHeld, pData.sldV || 0);
    };

    drawPlayerControls(LOCAL_TOUCH.p1, b.p1, colP1);
    drawPlayerControls(LOCAL_TOUCH.p2, b.p2, colP2);

    g.restore();
  }

  // ================= 4. PRE-MATCH TUTORIAL THUMBNAIL CARD =================
  if(GESTURE_SPLIT.showTutorial && match){
    drawLocalTutorialCard();
  }
}

function drawLocalTutorialCard(){
  g.save();
  // Semi-transparent backdrop
  g.fillStyle = 'rgba(7, 11, 20, 0.88)';
  g.fillRect(0, 0, CW, CH);

  const cardW = Math.min(CW * 0.92, 560);
  const cardH = Math.min(CH * 0.84, 370);
  const cardX = CW / 2 - cardW / 2;
  const cardY = CH / 2 - cardH / 2;

  // Outer shadow & card body
  rr(g, cardX, cardY, cardW, cardH, 18);
  g.fillStyle = '#131b2b';
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = '#2ecc71';
  g.stroke();

  // Header pill
  const pw = Math.min(cardW * 0.85, 360), ph = 34;
  rr(g, CW / 2 - pw / 2, cardY + 16, pw, ph, 17);
  g.fillStyle = '#1e2b42';
  g.fill();
  g.lineWidth = 1.8;
  g.strokeStyle = '#2ecc71';
  g.stroke();
  ptxt('📱 2-PLAYER TOUCH CONTROLS', CW / 2, cardY + 16 + ph / 2 + 1, FN(14, 900), '#ffffff');

  // Subtitle
  ptxt('Ergonomic Joysticks • Slide-Up Jump & Slide-Down Drop', CW / 2, cardY + 66, FN(11, 700), '#94a3b8');

  // Two columns: Left (P1) and Right (P2)
  const colW = (cardW - 36) / 2;
  const colH = cardH - 165;
  const colY = cardY + 86;
  const col1X = cardX + 14;
  const col2X = cardX + cardW / 2 + 4;

  const colP1 = (match.players[0] && PALETTE[match.players[0].colIdx]) ? PALETTE[match.players[0].colIdx].c : '#e8433f';
  const colP2 = (match.players[1] && PALETTE[match.players[1].colIdx]) ? PALETTE[match.players[1].colIdx].c : '#2f9be8';

  // --- Column 1: Player 1 (Left Half) ---
  rr(g, col1X, colY, colW, colH, 12);
  g.fillStyle = 'rgba(255, 255, 255, 0.04)';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = rgba(colP1, 0.55);
  g.stroke();

  // P1 Header badge
  rr(g, col1X + 10, colY + 10, colW - 20, 26, 8);
  g.fillStyle = rgba(colP1, 0.25);
  g.fill();
  g.lineWidth = 1.2;
  g.strokeStyle = colP1;
  g.stroke();
  ptxt('P1 (LEFT HALF OF SCREEN)', col1X + colW / 2, colY + 23, FN(11, 900), '#ffffff');

  // P1 Instructions
  const isMini = (colH < 130);
  const rowH = isMini ? 25 : 30;
  const rowY0 = colY + 48;
  ptxt('🕹️  TOUCH ANYWHERE TO RUN', col1X + colW / 2, rowY0, FN(isMini ? 10 : 11.5, 800), '#e2e8f0');
  ptxt('▲  SLIDE UP = JUMP', col1X + colW / 2, rowY0 + rowH, FN(isMini ? 10 : 11.5, 800), '#2ecc71');
  ptxt('v  SLIDE DOWN = DROP', col1X + colW / 2, rowY0 + rowH * 2, FN(isMini ? 10 : 11.5, 800), '#f472b6');

  // --- Column 2: Player 2 (Right Half) ---
  rr(g, col2X, colY, colW, colH, 12);
  g.fillStyle = 'rgba(255, 255, 255, 0.04)';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = rgba(colP2, 0.55);
  g.stroke();

  // P2 Header badge
  rr(g, col2X + 10, colY + 10, colW - 20, 26, 8);
  g.fillStyle = rgba(colP2, 0.25);
  g.fill();
  g.lineWidth = 1.2;
  g.strokeStyle = colP2;
  g.stroke();
  ptxt('P2 (RIGHT HALF OF SCREEN)', col2X + colW / 2, colY + 23, FN(11, 900), '#ffffff');

  // P2 Instructions
  ptxt('🕹️  TOUCH ANYWHERE TO RUN', col2X + colW / 2, rowY0, FN(isMini ? 10 : 11.5, 800), '#e2e8f0');
  ptxt('▲  SLIDE UP = JUMP', col2X + colW / 2, rowY0 + rowH, FN(isMini ? 10 : 11.5, 800), '#2ecc71');
  ptxt('v  SLIDE DOWN = DROP', col2X + colW / 2, rowY0 + rowH * 2, FN(isMini ? 10 : 11.5, 800), '#f472b6');

  // Glowing Start Button at bottom
  const btnW = Math.min(cardW * 0.72, 280), btnH = 40;
  const btnX = CW / 2 - btnW / 2, btnY = cardY + cardH - btnH - 14;
  const pulse = 0.85 + Math.sin(tGlobal * 5) * 0.15;
  rr(g, btnX, btnY, btnW, btnH, 10);
  g.fillStyle = 'rgba(46, 204, 113, ' + pulse + ')';
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = '#ffffff';
  g.stroke();
  ptxt('▶ TAP ANYWHERE TO PLAY', CW / 2, btnY + btnH / 2 + 1, FN(13.5, 900), '#ffffff');

  g.restore();
}

/* Mode-error telemetry: one console line per first throw per site (no spam).
   Lets a real-browser repro reveal the actual stack instead of a silent frame. */
const _modeErrSeen = {};
function logModeErr(where, err){
  try{
    if(_modeErrSeen[where]) return;
    _modeErrSeen[where] = true;
    console.error('[TAG] mode fault @' + where +
      ' mode=' + ((typeof settings !== 'undefined' && settings.gameMode) || '?') +
      ' state=' + ((typeof match !== 'undefined' && match && match.state) || '?'),
      (err && err.stack) || err);
  }catch(e){}
}
/* Minimal timer HUD fallback: guarantees a timer is always visible even if a
   mode-specific HUD is missing or throws mid-draw. */
function drawFallbackTimerHUD(){
  try{
    if(typeof match === 'undefined' || !match) return;
    const urgent = match.timer <= 10 && match.state === 'playing';
    const tw = Math.min(150, CW * 0.28), th = 40;
    rr(g, CW / 2 - tw / 2, 8, tw, th, 10);
    g.fillStyle = 'rgba(20, 28, 42, 0.92)';
    g.fill();
    g.lineWidth = 2.5; g.strokeStyle = urgent ? '#ef4444' : INK; g.stroke();
    ptxt(fmtTime(match.timer), CW / 2, 8 + th / 2 + 1, FT(Math.min(22, th * 0.54)), '#ffffff');
  }catch(e){ logModeErr('drawFallbackTimerHUD', e); }
}
function drawHUD(){
  var _modeChromeDone = false;
  if(settings.gameMode === 'infection'){
    try{ if(typeof drawInfectionUI === 'function') drawInfectionUI(); else drawFallbackTimerHUD(); }
    catch(e){ logModeErr('drawInfectionUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
    return;
  }
  if(settings.gameMode === 'bomb'){
    try{ if(typeof drawBombUI === 'function') drawBombUI(); else drawFallbackTimerHUD(); }
    catch(e){ logModeErr('drawBombUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
    _modeChromeDone = true;
  } else if(settings.gameMode === 'crown'){
    try{ if(typeof drawCrownUI === 'function') drawCrownUI(); else drawFallbackTimerHUD(); }
    catch(e){ logModeErr('drawCrownUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
    _modeChromeDone = true;
  } else if(settings.gameMode === 'ctf'){
    try{ if(typeof drawCtfUI === 'function') drawCtfUI(); else drawFallbackTimerHUD(); }
    catch(e){ logModeErr('drawCtfUI', e); try{ drawFallbackTimerHUD(); }catch(e2){} }
    _modeChromeDone = true;
  } else if(match && match.hunterMode){
    drawHunterHUD();
    return;
  }
  if(!_modeChromeDone){
  const urgent=match.timer<=10&&match.state==='playing';
  const tw=Math.min(150,CW*0.28),th=40;
  rr(g,CW/2-tw/2,8,tw,th,10);
  g.fillStyle=urgent?'rgba(190, 24, 24, 0.92)':'rgba(20, 28, 42, 0.92)';
  g.fill();
  g.lineWidth=2.5;g.strokeStyle=urgent?'#ef4444':INK;g.stroke();
  ptxt(fmtTime(match.timer),CW/2,8+th/2+1,FT(Math.min(22,th*0.54)),urgent?'#fff0f0':'#ffffff');
  // Touch has no Tab key: tapping the timer pill opens the scoreboard (mute players).
  if(isTouch) zone(CW/2-tw/2-6,2,tw+12,th+12,{fn:()=>{scoreboardOpen=!scoreboardOpen;sfx('ui');}});
  
  const P=match.players;
  const pillH = P.length > 7 ? 18 : (P.length > 4 ? 22 : 26);
  const pillGap = P.length > 7 ? 21 : (P.length > 4 ? 25 : 30);
  for(let i=0;i<P.length;i++){
    const p = P[i];
    const isIt = settings.teams ? (p.team === match.itTeam && match.state !== 'result') : (match.it === i && match.state !== 'result');
    const y = 10 + i * pillGap;
    g.save(); g.globalAlpha = isIt ? 1 : 0.75;
    const teamBadge = settings.teams ? ((p.team === 0 ? '🔴 ' : (p.team === 1 ? '🔵 ' : '🟢 '))) : '';
    const label = teamBadge + (isBotSlot(p) ? '🤖 BOT' : ('P' + (p.slot + 1))) + (isIt ? ' IT' : '');
    pill(10, y, isIt ? 128 : 98, pillH, isIt ? 'rgba(255,210,63,0.92)' : 'rgba(0,0,0,0.3)', isIt ? INK : 'rgba(0,0,0,0.5)');
    g.fillStyle = getPlayerColor(p);
    rr(g, 14, y + (pillH - 16) / 2, 16, 16, 4); g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    txt(label, 36, y + pillH / 2 + 1, FN(P.length > 7 ? 9 : (P.length > 4 ? 10 : 11), 900), isIt ? '#3a2c00' : '#ffffff', 'left');
    g.restore();
  }
  }
  /* Touch scoreboard tap for bomb/crown: classic timer pill is skipped above,
     so re-add its tap zone here (same coords) when a mode header drew instead. */
  if(_modeChromeDone && isTouch){
    try{
      const _tw2=Math.min(150,CW*0.28),_th2=40;
      zone(CW/2-_tw2/2-6,2,_tw2+12,_th2+12,{fn:()=>{scoreboardOpen=!scoreboardOpen;sfx('ui');}});
    }catch(e){}
  }
  
  /* In-game control bar: Pause, Sound, Fullscreen, Voice */
  const btnSize=38;
  const xPause=CW-btnSize-12;
  const xMute=xPause-btnSize-8;
  const xFull=xMute-btnSize-8;
  const xVoice=xFull-btnSize-8;
  const xChat=xVoice-btnSize-8;
  
  // Pause button
  drawJuicyIconBtn(xPause, 10, btnSize, {
    r: 9,
    depth: 3,
    renderContent: (x, y, sz) => {
      g.fillStyle = '#1e293b';
      g.fillRect(x + 12, y + 10, 4, 18);
      g.fillRect(x + 22, y + 10, 4, 18);
    },
    fn: togglePause
  });
  
  // Audio Mute/Unmute button
  drawJuicyIconBtn(xMute, 10, btnSize, {
    r: 9,
    depth: 3,
    renderContent: (x, y, sz) => {
      g.fillStyle = '#1e293b';
      g.beginPath();
      g.moveTo(x + 10, y + sz/2 - 4);
      g.lineTo(x + 14, y + sz/2 - 4);
      g.lineTo(x + 20, y + sz/2 - 10);
      g.lineTo(x + 20, y + sz/2 + 10);
      g.lineTo(x + 14, y + sz/2 + 4);
      g.lineTo(x + 10, y + sz/2 + 4);
      g.closePath();
      g.fill();
      if(!muted){
        g.strokeStyle = '#1e293b'; g.lineWidth = 2.2;
        g.beginPath(); g.arc(x + 19, y + sz/2, 6, -0.6, 0.6); g.stroke();
      } else {
        g.strokeStyle = '#ef4444'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x + 8, y + 8); g.lineTo(x + sz - 8, y + sz - 8); g.stroke();
      }
    },
    fn: toggleSound
  });
  
  // Fullscreen button
  drawJuicyIconBtn(xFull, 10, btnSize, {
    r: 9,
    depth: 3,
    renderContent: (x, y, sz) => {
      g.strokeStyle = '#1e293b'; g.lineWidth = 2.5;
      const isFull = !!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement||document.webkitIsFullScreen);
      if(!isFull){
        const m = 10;
        g.beginPath(); g.moveTo(x + m, y + m + 5); g.lineTo(x + m, y + m); g.lineTo(x + m + 5, y + m); g.stroke();
        g.beginPath(); g.moveTo(x + sz - m - 5, y + m); g.lineTo(x + sz - m, y + m); g.lineTo(x + sz - m, y + m + 5); g.stroke();
        g.beginPath(); g.moveTo(x + m, y + sz - m - 5); g.lineTo(x + m, y + sz - m); g.lineTo(x + m + 5, y + sz - m); g.stroke();
        g.beginPath(); g.moveTo(x + sz - m - 5, y + sz - m); g.lineTo(x + sz - m, y + sz - m); g.lineTo(x + sz - m, y + sz - m - 5); g.stroke();
      } else {
        const m = 11;
        g.strokeRect(x + m, y + m, sz - 2 * m, sz - 2 * m);
      }
    },
    fn: toggleFullscreen
  });
  
  // Proximity Voice Chat button (online) or Help/Tutorial button (2-player local touch)
  if(typeof NET !== 'undefined' && NET && NET.role !== null){
    const vOn = (typeof VOICE !== 'undefined' && VOICE.enabled);
    const vMuted = (typeof VOICE !== 'undefined' && VOICE.muted);
    drawJuicyIconBtn(xVoice, 10, btnSize, {
      r: 9,
      depth: 3,
      bg: vOn ? (vMuted ? '#e74c3c' : '#27ae60') : 'rgba(255, 255, 255, 0.92)',
      darkBg: vOn ? (vMuted ? '#b91c1c' : '#166534') : 'rgba(203, 213, 225, 0.95)',
      icon: vOn ? (vMuted ? '🔇' : '🎙️') : '🎙️',
      iconColor: vOn ? '#ffffff' : '#1e293b',
      iconSize: 15,
      fn: voiceToggleMic
    });

    // In-game text chat toggle button
    drawJuicyIconBtn(xChat, 10, btnSize, {
      r: 9,
      depth: 3,
      icon: '💬',
      iconColor: '#1e293b',
      iconSize: 15,
      fn: () => { if(typeof chatToggle === 'function') chatToggle(); }
    });
  } else if(isTouch && match.players && match.players.length === 2 && !menu.botOn && menu.tab !== 'solo'){
    drawJuicyIconBtn(xVoice, 10, btnSize, {
      r: 9,
      depth: 3,
      icon: '?',
      iconColor: '#1e293b',
      iconSize: 18,
      fn: () => { GESTURE_SPLIT.showTutorial = true; sfx('ui'); }
    });
  }
  
  if(match.state==='countdown')drawBigCount(match.cd,'GET READY!');
  if(match.goFlash>0&&match.state==='playing'){
    const a=clamp(match.goFlash/0.8,0,1);
    const sc2=1+(1-a)*0.6;
    g.save();g.translate(CW/2,CH*0.4);g.scale(sc2,sc2);g.globalAlpha=a;
    g.font=FT(Math.min(90,CW*0.16));g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    g.strokeStyle=INK;g.lineWidth=10;g.strokeText('GO!',0,0);
    g.fillStyle='#8ef0b0';g.fillText('GO!',0,0);
    g.restore();
  }
  
  /* On-screen map and theme toast notification */
  if(match.mapToastT>0&&match.mapToast){
    const a=clamp(match.mapToastT,0,1);
    g.save();g.globalAlpha=a;
    ptxt(match.mapToast,CW/2,64,FN(Math.min(18,CW*0.032),900),'#ffea88');
    g.restore();
  }
  
  if(match.hintT>0&&match.state!=='result'&&!isTouch){
    const a=clamp(match.hintT,0,1);
    ptxt('HOLD S / ↓ ON PINK TO DROP   •   WALL-JUMP ON WALLS   •   N = NEXT MAP   •   M = MUTE   •   F = FULLSCREEN',CW/2,CH-20,FN(12,800),'rgba(255,255,255,'+(a*0.75).toFixed(2)+')');
  }
  if(isTouch&&CH>CW&&match.state!=='result'){
    ptxt('ROTATE FOR WIDE VIEW',CW/2,54,FN(12,900),'rgba(255,255,255,0.9)');
  }

  /* In-game Tab Scoreboard / Spectator HUD Overlay */
  if(scoreboardOpen){
    drawScoreboardOverlay();
  } else if(typeof NET !== 'undefined' && NET && NET.role !== null && NET.isSpectator && menu.tab === 'online' && match && match.state === 'playing'){
    const myIdx = (typeof myMatchIndex === 'function') ? myMatchIndex() : 0;
    if(myIdx < 0) drawSpectatorBanner();
  }
}

function drawBigCount(num,label){
  const ph=clamp(match?match.cdT/0.72:0,0,1);
  const sc=1.35-0.35*easeOut(Math.min(1,ph*3));
  g.save();
  g.translate(CW/2,CH*0.4);
  g.scale(sc,sc);
  ptxt(String(num),0,0,FT(Math.min(100,CW*0.18)),'#ffffff');
  g.restore();
  ptxt(label,CW/2,CH*0.4-Math.min(100,CW*0.14),FN(Math.min(18,CW*0.036),900),'#ffffff');
}

function drawPause(){
  g.fillStyle='rgba(10,16,24,0.78)';g.fillRect(0,0,CW,CH);
  const pw=Math.min(460,CW-30),ph=Math.min(360,CH-24);
  const px=CW/2-pw/2,py=CH/2-ph/2;
  rr(g,px,py,pw,ph,20);
  g.fillStyle='rgba(20,28,42,0.96)';g.fill();g.lineWidth=4;g.strokeStyle=INK;g.stroke();
  ptxt('PAUSED',CW/2,py+32,FT(Math.min(28,ph*0.09)),'#ffffff');
  ptxt('MAP '+(settings.map+1)+': '+MAPS[settings.map].name,CW/2,py+56,FN(Math.min(13,ph*0.045),800),'#a0c0e8');
  // Online guests get a trimmed menu: no RESTART, no NEXT MAP (host-only powers).
  const isGuestPause=(typeof NET!=='undefined'&&NET&&NET.role!==null&&!NET.isHost);
  const opts=isGuestPause?['RESUME','SOUND: '+(muted?'OFF':'ON'),'FULLSCREEN','QUIT TO MENU']:['RESUME','RESTART','NEXT MAP','SOUND: '+(muted?'OFF':'ON'),'FULLSCREEN','QUIT TO MENU'];
  const nP=opts.length;
  const rowH = clamp((ph - 76) / nP, 26, 42);
  const btnH = Math.min(34, rowH - 4);
  const btnW = Math.min(300, pw - 30);
  for(let i=0;i<nP;i++){
    const y=py + 72 + i*rowH + rowH/2;
    const sel=match.pauseSel===i;
    const oid=opts[i];
    drawJuicyBtn(CW/2 - btnW/2, y - btnH/2, btnW, btnH, {
      label: opts[i],
      bg: sel ? '#2ecc71' : 'rgba(30, 41, 59, 0.85)',
      darkBg: sel ? '#166534' : 'rgba(15, 23, 42, 0.95)',
      textColor: sel ? '#ffffff' : '#cbd5e1',
      textShadow: sel ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.6)',
      r: Math.floor(btnH / 2),
      depth: 3,
      fontSize: sel ? 15 : 13.5,
      fn: () => {
        if(oid==='RESUME')togglePause();
        else if(oid==='RESTART'){sfx('go');startMatch();}
        else if(oid==='NEXT MAP'){selectMapQuick(settings.map+1);}
        else if(oid && oid.indexOf('SOUND')===0){toggleSound();}
        else if(oid==='FULLSCREEN'){toggleFullscreen();}
        else quitToMenu();
      }
    });
  }
}

/* Mini map preview rendered straight from MAPS data (no level rebuild). */
function drawMapThumb(x, y, w, h, mapIdx, votes, leader, myPick){
  const M = MAPS[((mapIdx % MAPS.length) + MAPS.length) % MAPS.length];
  rr(g, x, y, w, h, 8);
  g.fillStyle = 'rgba(8,12,22,0.95)';
  g.fill();
  g.lineWidth = leader ? 3 : 1.5;
  g.strokeStyle = leader ? '#ffd166' : (myPick ? '#2ecc71' : 'rgba(255,255,255,0.25)');
  g.stroke();
  if(!M){ return; }
  g.save();
  rr(g, x, y, w, h, 8);
  g.clip();
  const s = Math.min(w / 2400, h / 1320);
  const ox = x + (w - 2400 * s) / 2, oy = y + (h - 1320 * s) / 2;
  const lists = [
    [M.solids, '#5b6b8c'], [M.speeds, '#f5a623'],
    [M.drops, '#f06292'], [M.boosts, '#4a90e2']
  ];
  for(const entry of lists){
    g.fillStyle = entry[1];
    const arr = entry[0] || [];
    for(const a of arr){
      g.fillRect(ox + a[0] * s, oy + a[1] * s, Math.max(1.5, a[2] * s), Math.max(1.5, a[3] * s));
    }
  }
  g.restore();
  // name scrim + vote pill
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(x, y + h - 20, w, 20);
  txt(M.name, x + w / 2, y + h - 10, FN(Math.min(11, w * 0.075), 900), '#ffffff');
  const pillTxt = (leader ? '👑 ' : '') + '×' + votes;
  g.font = FN(12, 900);
  const ptw = g.measureText(pillTxt).width + 14;
  const pxx = x + w - ptw - 5, pyy = y + 5;
  rr(g, pxx, pyy, ptw, 18, 9);
  g.fillStyle = leader ? 'rgba(255,209,102,0.92)' : 'rgba(0,0,0,0.6)';
  g.fill();
  txt(pillTxt, pxx + ptw / 2, pyy + 10, FN(11, 900), leader ? '#3a2c00' : '#ffffff');
  if(myPick){
    txt('✓ YOU', x + 6, y + 14, FN(10, 900), '#2ecc71', 'left');
  }
}
/* Post-game voting panel: 3 map cards + mode button + skip/menu. Bottom-anchored. */
function drawVotePanel(){
  const V = menu.mapVote;
  const bw = Math.min(560, CW - 20);
  const bx = CW / 2 - bw / 2;
  if(!V || !V.opts || V.opts.length < 3){
    const wh = 52;
    const wy = CH - wh - 10;
    rr(g, bx, wy, bw, wh, 12);
    g.fillStyle = 'rgba(20,28,42,0.94)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke();
    ptxt('⏳ WAITING FOR HOST…', CW / 2, wy + 27, FN(13, 900), '#cbd5e1');
    return;
  }
  const T = tallyMapVote();
  const M = tallyModeReq();
  const gap = 10;
  const tw = Math.min(170, (bw - 20 - gap * 2) / 3);
  const th = tw * 0.55;
  const dots = [];
  for(const k of Object.keys(V.votes || {})){
    const o = V.votes[k];
    if(!o || o.pick == null) continue;
    let col = '#ffffff';
    if(k !== 'L'){
      const slot = parseInt(k, 10);
      const pl = match && match.players ? match.players.find(function(p){ return p.slot === slot; }) : null;
      if(pl) col = getPlayerColor(pl);
    }
    dots.push(col);
  }
  const hTitle = 26, hThumbs = th + 26, hDots = dots.length ? 18 : 0, hMode = 24, hBtns = 40;
  const totalH = hTitle + hThumbs + hDots + hMode + hBtns + 18;
  const by = Math.max(8, CH - totalH - 8);
  rr(g, bx, by, bw, totalH, 14);
  g.fillStyle = 'rgba(20,28,42,0.96)'; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  const tLeft = Math.max(0, Math.ceil(V.t));
  ptxt('🗺️ VOTE NEXT MAP (' + tLeft + 's)', CW / 2, by + 14, FN(14, 900), '#ffd166');
  const tx0 = CW / 2 - (tw * 3 + gap * 2) / 2;
  const ty = by + hTitle;
  const me = myVoterId();
  const myPick = (V.votes[me] != null) ? (V.votes[me].pick | 0) : -1;
  for(let i = 0; i < 3; i++){
    const cx = tx0 + i * (tw + gap);
    const leader = (T.total > 0 && T.best === i);
    drawMapThumb(cx, ty, tw, th, V.opts[i], T.counts[i], leader, myPick === i);
    zone(cx - 2, ty - 2, tw + 4, th + 26, { fn: (function(idx){ return function(){ castMapVote(myVoterId(), idx); }; })(i) });
    txt((i + 1) + '', cx + tw / 2, ty + th + 12, FN(10, 800), 'rgba(255,255,255,0.5)');
  }
  let by2 = ty + hThumbs;
  if(dots.length){
    const dx0 = CW / 2 - (Math.min(dots.length, 12) * 14) / 2;
    for(let d = 0; d < dots.length && d < 12; d++){
      g.beginPath();
      g.arc(dx0 + d * 14 + 7, by2 + 7, 5, 0, TAU);
      g.fillStyle = dots[d];
      g.fill();
    }
    by2 += 18;
  }
  let modeLine = '🎮 MODE: ' + settings.gameMode.toUpperCase() + '  •  no requests yet — tap MODE to change';
  if(M.best && M.total > 0){
    let icon = '';
    for(const mm of MAPVOTE_MODES){ if(mm.id === M.best) icon = mm.icon; }
    modeLine = '🎮 MODE: ' + icon + ' ' + M.best.toUpperCase() + ' ×' + M.total + '  •  tap MODE to change';
  }
  txt(modeLine, CW / 2, by2 + 8, FN(11, 800), '#cbd5e1');
  by2 += 24;
  const isOnline = (typeof NET !== 'undefined' && NET && NET.role !== null);
  const isGuest = isOnline && !NET.isHost;
  const bH = 34;
  const bModeW = 150, bSkipW = 130, bMenuW = 110;
  const bTotal = bModeW + 10 + (isGuest ? 0 : bSkipW + 10) + bMenuW;
  let sx = CW / 2 - bTotal / 2;
  simpleButton(sx, by2, bModeW, bH, '🎮 MODE', function(){ menu.modePopup = true; sfx('ui'); }, null, '#8b5cf6');
  sx += bModeW + 10;
  if(!isGuest){
    simpleButton(sx, by2, bSkipW, bH, '⏭ START NOW', function(){ decideMapVote(); }, null, '#2ecc71');
    sx += bSkipW + 10;
  }
  simpleButton(sx, by2, bMenuW, bH, isOnline ? '🚪 QUIT' : 'MENU', function(){ quitToMenu(); }, null, '#475569');
}
/* Mode request popup: 7 modes with live request counts. */
function drawModePopup(){
  if(!menu.modePopup) return;
  const V = menu.mapVote;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 0, CW, CH);
  const pw = Math.min(420, CW - 40);
  const rowH = 36;
  const ph = 52 + MAPVOTE_MODES.length * (rowH + 6) + 52;
  const px = CW / 2 - pw / 2, py = CH / 2 - ph / 2;
  rr(g, px, py, pw, ph, 14);
  g.fillStyle = 'rgba(20,28,42,0.97)';
  g.fill();
  g.lineWidth = 2.5; g.strokeStyle = '#8b5cf6'; g.stroke();
  ptxt('🎮 REQUEST NEXT MODE', CW / 2, py + 22, FN(15, 900), '#ffffff');
  zone(0, 0, CW, CH, { fn: function(){ menu.modePopup = false; } });
  const M = tallyModeReq();
  const me = myVoterId();
  const myMode = (V && V.modeReq[me]) ? V.modeReq[me].mode : null;
  for(let i = 0; i < MAPVOTE_MODES.length; i++){
    const md = MAPVOTE_MODES[i];
    const ry = py + 44 + i * (rowH + 6);
    const cnt = (M.counts && M.counts[md.id]) || 0;
    const mine = (myMode === md.id);
    const soon = (md.id === 'freeze');
    rr(g, px + 12, ry, pw - 24, rowH, 8);
    g.fillStyle = soon ? 'rgba(255,255,255,0.03)' : (mine ? 'rgba(46,204,113,0.25)' : 'rgba(255,255,255,0.06)');
    g.fill();
    g.lineWidth = mine && !soon ? 2.5 : 1.2;
    g.strokeStyle = mine && !soon ? '#2ecc71' : 'rgba(255,255,255,0.2)';
    g.stroke();
    txt(md.icon + '  ' + md.label, px + 24, ry + rowH / 2 + 1, FN(13, 900), soon ? 'rgba(255,255,255,0.35)' : '#ffffff', 'left');
    txt(soon ? 'COMING SOON' : (cnt ? ('×' + cnt) : ''), px + pw - 24, ry + rowH / 2 + 1, FN(soon ? 10 : 13, 900), soon ? '#ffd166' : '#ffd166', 'right');
    if(soon){
      zone(px + 12, ry, pw - 24, rowH, { fn: function(){ toast('❄️ THAT MODE IS COMING SOON!'); sfx('back'); } });
    } else {
      zone(px + 12, ry, pw - 24, rowH, { fn: (function(id){ return function(){ requestMode(myVoterId(), id); }; })(md.id) });
    }
    txt((i + 1) + '', px + pw - 14, ry - 2, FN(8, 800), 'rgba(255,255,255,0.35)', 'right');
  }
  const cy = py + ph - 40;
  simpleButton(CW / 2 - 70, cy, 140, 32, 'CLOSE', function(){ menu.modePopup = false; sfx('back'); }, null, '#475569');
}
function drawResult(){
  g.fillStyle='rgba(10,16,24,0.72)';g.fillRect(0,0,CW,CH);
  if(!isTouch){
    zone(0,0,CW,CH,{fn:()=>{
      if(menu.mapVote && !menu.mapVote.decided) return;
      if(typeof NET!=='undefined' && NET && NET.role!==null){
        if(!NET.isHost) return;
        if(NET.midgameJoiner){
          NET.midgameJoiner = false;
          quitToMenu();
          return;
        }
      }
      sfx('go');startMatch();
    }});
  }
  const t=match.resultT;
  if(t<0.9){
    const sc=1.4-0.4*easeOut(Math.min(1,t*4));
    g.save();g.translate(CW/2,CH*0.26);g.scale(sc,sc);
    ptxt("TIME'S UP!",0,0,FT(Math.min(80,CW*0.12)),'#ffcf3f');
    g.restore();
  }
  const ap=easeBack(clamp((t-0.35)*2.2,0,1));
  if(ap<=0)return;
  const P=match.players;
  const isTeamMatch = !!(settings.teams && match.result && match.result.winningTeam != null);
  const bannerOff = (CH < 520) ? 28 : 0;
  const pw=Math.min(740,CW-30),ph=Math.min(440,CH-36 - bannerOff);
  const px=CW/2-pw/2,py=(CH - bannerOff)/2-ph/2;
  g.save();
  g.translate(CW/2,CH/2);g.scale(ap,ap);g.translate(-CW/2,-CH/2);
  rr(g,px,py,pw,ph,20);
  g.fillStyle='rgba(20,28,42,0.96)';g.fill();g.lineWidth=4;g.strokeStyle=INK;g.stroke();

  if(settings.gameMode === 'crown'){
    const winIdx = (match.result && match.result.winner != null) ? match.result.winner : 0;
    const winnerP = P[winIdx] || P[0];
    const winName = isBotSlot(winnerP) ? 'BOT ' + (winnerP.slot + 1) : 'PLAYER ' + (winnerP.slot + 1);
    const winTitle = '👑 ' + winName + ' WINS!';
    ptxt(winTitle, CW/2, py+ph*0.13, FT(Math.min(38,CW*0.055)), '#fef08a');
    const winPts = (typeof crownState !== 'undefined' && crownState.scores) ? (crownState.scores[winnerP.slot] || 0) : 100;
    const subText = 'CROWN CHAMPION WITH ' + winPts + ' POINTS!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')';
    ptxt(subText, CW/2, py+ph*0.25, FN(Math.min(14,CW*0.028),800), '#ffffff');
    const psz=Math.min(60,ph*0.18);
    drawChar(g, CW/2, py+ph*0.48 - Math.abs(Math.sin(tGlobal*5))*10, psz, getPlayerColor(winnerP), { face: 'happy', fdir: 1, grounded: true, seed: 1 });
  } else if(settings.gameMode === 'bomb'){
    const winIdx = (match.result && match.result.winner != null) ? match.result.winner : 0;
    const winnerP = P[winIdx] || P[0];
    const winName = isBotSlot(winnerP) ? 'BOT ' + (winnerP.slot + 1) : 'PLAYER ' + (winnerP.slot + 1);
    const winTitle = '💣 ' + winName + ' SURVIVED!';
    ptxt(winTitle, CW/2, py+ph*0.13, FT(Math.min(38,CW*0.055)), '#ef4444');
    const subText = 'LAST PLAYER STANDING IN BOMB TAG!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')';
    ptxt(subText, CW/2, py+ph*0.25, FN(Math.min(14,CW*0.028),800), '#ffffff');
    const psz=Math.min(60,ph*0.18);
    drawChar(g, CW/2, py+ph*0.48 - Math.abs(Math.sin(tGlobal*5))*10, psz, getPlayerColor(winnerP), { face: 'happy', fdir: 1, grounded: true, seed: 1 });
  } else if(settings.gameMode === 'infection'){
    const isZombieWin = match.result && match.result.winningTeam === 'zombies';
    const winTitle = isZombieWin ? '🧟 OUTBREAK CONSUMED ALL!' : '🛡️ SURVIVORS OUTLASTED!';
    const winCol = isZombieWin ? '#10b981' : '#38bdf8';
    ptxt(winTitle, CW/2, py+ph*0.13, FT(Math.min(38,CW*0.055)), winCol);
    const subText = isZombieWin
      ? ('ALL RUNNERS INFECTED!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')')
      : ('THE SURVIVORS OUTLASTED THE HORDE!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')');
    ptxt(subText, CW/2, py+ph*0.25, FN(Math.min(14,CW*0.028),800), '#ffffff');
    const winPlayers = P.filter(p => isZombieWin ? p.isInfected : !p.isInfected);
    const psz=Math.min(54,ph*0.16);
    const startX = CW/2 - ((Math.max(1, winPlayers.length) - 1) * psz * 1.5) / 2;
    for(let mi = 0; mi < winPlayers.length; mi++){
      const p = winPlayers[mi];
      drawChar(g, startX + mi * psz * 1.5, py+ph*0.46 - Math.abs(Math.sin(tGlobal*5 + mi))*8, psz, getPlayerColor(p), { face: 'happy', fdir: 1, grounded: true, seed: mi*3 });
    }
  } else if(isTeamMatch){
    const winTeamIdx = match.result.winningTeam;
    if(match.result && match.result.mode === 'ctf' && winTeamIdx === -1){
      ptxt('🤝 STALEMATE DRAW!', CW/2, py+ph*0.13, FT(Math.min(38,CW*0.055)), '#ffd166');
      ptxt('TIED ' + match.result.scores[0] + ' - ' + match.result.scores[1] + ' CAPTURES!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')', CW/2, py+ph*0.25, FN(Math.min(14,CW*0.028),800), '#ffffff');
      const psz=Math.min(54,ph*0.16);
      const startX = CW/2 - ((P.length - 1) * psz * 1.5) / 2;
      for(let mi = 0; mi < P.length; mi++){
        const p = P[mi];
        drawChar(g, startX + mi * psz * 1.5, py+ph*0.46 - Math.abs(Math.sin(tGlobal*5 + mi))*8, psz, getPlayerColor(p), { face: 'neutral', fdir: 1, grounded: true, seed: mi*3 });
      }
    } else {
      const winTeam = TEAMS[winTeamIdx] || TEAMS[0];
      const teamMates = P.filter(p => p.team === winTeamIdx);
      const winTitle = winTeam.icon + ' ' + winTeam.name + ' WINS!';
      ptxt(winTitle, CW/2, py+ph*0.13, FT(Math.min(38,CW*0.055)), winTeam.base);
      const subText = (match.result && match.result.mode === 'freeze')
        ? ((match.result.reason === 'all_frozen' ? 'ALL RUNNERS FROZEN!' : 'RUNNERS SURVIVED THE CLOCK!') + '   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')')
        : (match.result && match.result.mode === 'ctf')
          ? ((match.result.reason === 'target_reached' ? ('CAPTURED ' + (ctfState ? ctfState.targetCaptures : 3) + ' FLAGS FIRST!') : ('MOST CAPTURES BEFORE TIME EXPIRED! (' + match.result.scores[0] + '-' + match.result.scores[1] + ')')) + '   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')')
          : ('LOWEST TIME AS IT!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')');
      ptxt(subText, CW/2, py+ph*0.25, FN(Math.min(14,CW*0.028),800), '#ffffff');
      const psz=Math.min(54,ph*0.16);
      const startX = CW/2 - ((teamMates.length - 1) * psz * 1.5) / 2;
      for(let mi = 0; mi < teamMates.length; mi++){
        const p = teamMates[mi];
        drawChar(g, startX + mi * psz * 1.5, py+ph*0.46 - Math.abs(Math.sin(tGlobal*5 + mi))*8, psz, getPlayerColor(p), { face: 'happy', fdir: 1, grounded: true, seed: mi*3 });
      }
    }
  } else {
    const loser=match.result.loser != null ? match.result.loser : match.it;
    const winners=P.map((p,i)=>i).filter(i=>i!==loser);
    const wcol=PALETTE[(P[winners[0]] && P[winners[0]].colIdx) || 0].c;
    ptxt(winners.length===1?('PLAYER '+(winners[0]+1)+' WINS!'):(winners.map(w=>'P'+(w+1)).join(' + ')+' WIN!'),CW/2,py+ph*0.12,FT(Math.min(38,CW*0.055)),wcol);
    ptxt('PLAYER '+(loser+1)+' WAS IT - LOSES!   (MAP '+(settings.map+1)+': '+MAPS[settings.map].name+')',CW/2,py+ph*0.24,FN(Math.min(14,CW*0.028),800),'#ffffff');
    const psz=Math.min(60,ph*0.17);
    drawChar(g,CW/2-psz*2.4,py+ph*0.45-Math.abs(Math.sin(tGlobal*5))*10,psz,getPlayerColor(P[winners[0]]),{face:'happy',fdir:1,grounded:true,seed:2});
    if(P[loser]) drawChar(g,CW/2+psz*1.4,py+ph*0.48,psz,getPlayerColor(P[loser]),{face:'sad',fdir:-1,tilt:-0.06,grounded:true,seed:5});
  }
  txt('TAGS - '+P.map((p,i)=>'P'+(i+1)+': '+match.tags[i]).join('  •  '),CW/2,py+ph*0.66,FN(13,900),'#cfe9d6');
  const _cl = (typeof careerLine === 'function') ? careerLine() : '';
  if(_cl) txt(_cl, CW/2, py+ph*0.66 + 22, FN(11, 800), '#ffd166');
  g.restore();
  drawVotePanel();
  drawModePopup();
}

function drawGame(){
  g.save();
  g.translate(CW/2,CH/2);g.scale(cam.s,cam.s);g.translate(-cam.x,-cam.y);
  drawNightWorld();
  g.restore();
  const shx=(Math.random()-0.5)*match.shake,shy=(Math.random()-0.5)*match.shake;
  g.save();
  g.translate(CW/2,CH/2);
  g.scale(cam.s,cam.s);
  g.translate(-cam.x+shx,-cam.y+shy);
  drawWorld();
  drawParts();
  drawPlayers();
  drawTagPop();
  g.restore();
  if(match.flash>0){
    g.fillStyle='rgba(255,255,255,'+(match.flash*1.4).toFixed(3)+')';
    g.fillRect(0,0,CW,CH);
  }
  if(match.fade>0){
    g.fillStyle='rgba(255,255,255,'+(match.fade*1.2).toFixed(3)+')';
    g.fillRect(0,0,CW,CH);
  }
  drawHUD();
  if(match.state==='paused'||match.hostMenu)drawPause();
  else if(match.state==='result')drawResult();
  else if(match.state==='hunter_round_result')drawHunterRoundResult();
  else if(isTouch && !isBotVsBotWatch())drawTouchButtons();
}

function isBotVsBotWatch(){
  try{
    return menu.tab === 'bots' && !!match && !!match.players && match.players.length === 2 &&
      match.players.every(p => isBotSlot(p));
  }catch(e){ return false; }
}

function cycleGameMode(d){
  const modes = (menu.tab === 'bots' || menu.tab === 'solo')
    ? ['party', 'ctf', 'bomb', 'crown', 'infection']
    : ['party', 'teams', 'ctf', 'bomb', 'crown', 'infection', 'hunter'];
  if(typeof NET !== 'undefined' && NET && NET.role !== null && !NET.isHost){
    toast('HOST SELECTS GAME MODE');
    sfx('back');
    return;
  }
  let curIdx = modes.indexOf(settings.gameMode || (settings.teams ? 'teams' : 'party'));
  if(curIdx < 0) curIdx = 0;
  const nextIdx = (curIdx + (d || 1) + modes.length) % modes.length;
  if(typeof setGameMode === 'function'){
    setGameMode(modes[nextIdx]);
  } else {
    settings.gameMode = modes[nextIdx];
    settings.teams = (modes[nextIdx] === 'teams' || modes[nextIdx] === 'hunter' || modes[nextIdx] === 'ctf');
  }
}

if(typeof window !== 'undefined'){
  window.cycleGameMode = cycleGameMode;
}
if(typeof globalThis !== 'undefined'){
  globalThis.cycleGameMode = cycleGameMode;
}
if(typeof module !== 'undefined' && module.exports){
  try { module.exports.cycleGameMode = cycleGameMode; } catch(e){}
}


