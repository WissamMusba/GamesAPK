/**
 * dom_ui.js - Modern Hybrid DOM Menu UI Controller for TAG!
 * Seamlessly manages responsive glassmorphic cards, player customization,
 * game modes, map selection, and WebRTC multiplayer hub while keeping
 * 60fps canvas performance for gameplay.
 */

(function(global) {
  'use strict';

  const MODE_METAS = {
    party: {
      name: 'PARTY TAG',
      badge: 'FREE-FOR-ALL',
      desc: 'Classic Free-for-All. Whoever is IT when the clock expires loses!'
    },
    bomb: {
      name: 'BOMB TAG',
      badge: 'HOT POTATO',
      desc: 'Pass the ticking explosive! Whoever holds the bomb at detonation is eliminated!'
    },
    crown: {
      name: 'CROWN KING',
      badge: 'OBJECTIVE',
      desc: 'Touch the golden crown and hold it to earn points and claim the throne!'
    },
    ctf: {
      name: 'CAPTURE FLAG',
      badge: 'RED VS BLUE',
      desc: 'Infiltrate enemy base, steal their flag, and bring it back home to score!'
    },
    infection: {
      name: 'INFECTION',
      badge: 'SURVIVAL',
      desc: 'One patient zero zombie hunts survivors. Last runner standing wins!'
    },
    hunter: {
      name: 'HUNTER SHOWDOWN',
      badge: '1 VS 3',
      desc: 'One apex predator hunts down all runners before the clock runs out!'
    },
    teams: {
      name: 'TEAM TAG',
      badge: 'RED VS BLUE',
      desc: 'Team-based tag battle. Tag opposing runners to win for your squad!'
    }
  };

  const CONTROL_HINTS = [
    'WASD / Space / D-Pad',
    'Arrow Keys',
    'IJKL Keys',
    'Numpad 8456'
  ];

  let _domInitialized = false;
  let _lastSyncTime = 0;
  let _lastStateKey = '';

  function initDOMUI() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay || _domInitialized) return;
    _domInitialized = true;

    // 1. Header Tools
    const btnTheme = document.getElementById('ui-btn-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        if (typeof cycleTheme === 'function') cycleTheme();
        syncDOMUI(true);
      });
    }

    const btnSound = document.getElementById('ui-btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        if (typeof toggleSound === 'function') toggleSound();
        syncDOMUI(true);
      });
    }

    const btnFullscreen = document.getElementById('ui-btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (typeof toggleFullscreen === 'function') toggleFullscreen();
      });
    }

    // 2. Navigation Tabs
    const tabBtns = overlay.querySelectorAll('.mode-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (typeof setMenuTab === 'function') {
          setMenuTab(tab);
        } else if (typeof menu !== 'undefined') {
          menu.tab = tab;
        }
        syncDOMUI(true);
      });
    });

    // 3. Game Mode Navigation
    const modePrev = document.getElementById('ui-mode-prev');
    if (modePrev) {
      modePrev.addEventListener('click', () => {
        if (typeof cycleGameMode === 'function') cycleGameMode(-1);
        syncDOMUI(true);
      });
    }

    const modeNext = document.getElementById('ui-mode-next');
    if (modeNext) {
      modeNext.addEventListener('click', () => {
        if (typeof cycleGameMode === 'function') cycleGameMode(1);
        syncDOMUI(true);
      });
    }

    const modeChips = overlay.querySelectorAll('#ui-mode-chips .chip-btn');
    modeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const m = chip.dataset.mode;
        if (typeof setGameMode === 'function') {
          setGameMode(m);
        } else if (typeof settings !== 'undefined') {
          settings.gameMode = m;
          settings.teams = (m === 'teams' || m === 'ctf' || m === 'hunter');
        }
        syncDOMUI(true);
      });
    });

    // 4. Map & Arena Selection
    const mapPrev = document.getElementById('ui-map-prev');
    if (mapPrev) {
      mapPrev.addEventListener('click', () => {
        if (typeof settings !== 'undefined' && typeof MAPS !== 'undefined' && MAPS.length) {
          settings.map = (settings.map - 1 + MAPS.length) % MAPS.length;
          if (typeof buildLevel === 'function') buildLevel();
          if (typeof sfx === 'function') sfx('ui');
        }
        syncDOMUI(true);
      });
    }

    const mapNext = document.getElementById('ui-map-next');
    if (mapNext) {
      mapNext.addEventListener('click', () => {
        if (typeof settings !== 'undefined' && typeof MAPS !== 'undefined' && MAPS.length) {
          settings.map = (settings.map + 1) % MAPS.length;
          if (typeof buildLevel === 'function') buildLevel();
          if (typeof sfx === 'function') sfx('ui');
        }
        syncDOMUI(true);
      });
    }

    // 5. Match Time Chips
    const timeChips = overlay.querySelectorAll('#ui-time-chips .time-chip');
    timeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const idx = parseInt(chip.dataset.timeIdx, 10);
        if (typeof settings !== 'undefined') {
          settings.timeIdx = idx;
          if (typeof sfx === 'function') sfx('ui');
        }
        syncDOMUI(true);
      });
    });

    // 6. Online Multiplayer Hub
    const btnHost = document.getElementById('ui-btn-host');
    if (btnHost) {
      btnHost.addEventListener('click', () => {
        if (typeof netHostAction === 'function') netHostAction(true);
        syncDOMUI(true);
      });
    }

    const btnJoin = document.getElementById('ui-btn-join');
    const inputJoin = document.getElementById('ui-join-input');
    if (btnJoin && inputJoin) {
      btnJoin.addEventListener('click', () => {
        const val = (inputJoin.value || '').trim().toUpperCase();
        if (val && typeof netJoinAction === 'function') {
          netJoinAction(val);
        }
      });
      inputJoin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          btnJoin.click();
        }
      });
    }

    const btnCopyCode = document.getElementById('ui-btn-copy-code');
    if (btnCopyCode) {
      btnCopyCode.addEventListener('click', () => {
        if (typeof NET !== 'undefined' && NET && NET.room) {
          const url = (typeof location !== 'undefined') ? (location.origin + location.pathname + '?room=' + encodeURIComponent(NET.room)) : NET.room;
          if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
              if (typeof netToast === 'function') netToast('Link copied to clipboard!');
            }).catch(() => {
              if (typeof netToast === 'function') netToast('Room code: ' + NET.room);
            });
          } else {
            if (typeof netToast === 'function') netToast('Room code: ' + NET.room);
          }
        }
      });
    }

    // 7. Launch Match Button
    const btnLaunch = document.getElementById('ui-btn-launch');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        if (typeof sfx === 'function') sfx('go');
        if (typeof startMatch === 'function') startMatch();
        syncDOMUI(true);
      });
    }

    syncDOMUI(true);
  }

  function syncDOMUI(force = false) {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const curScreen = (typeof screen !== 'undefined') ? screen : (global.screen || 'menu');
    const isMenu = (curScreen === 'menu');

    if (!isMenu) {
      if (overlay.classList.contains('active')) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
      return;
    }

    if (!overlay.classList.contains('active')) {
      overlay.classList.add('active');
      overlay.style.display = 'flex';
    }

    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (!force && (now - _lastSyncTime < 80)) return;
    _lastSyncTime = now;

    const curTab = (typeof menu !== 'undefined' && menu.tab) ? menu.tab : 'solo';
    const curMode = (typeof settings !== 'undefined' && settings.gameMode) ? settings.gameMode : 'party';
    const curMapIdx = (typeof settings !== 'undefined') ? (settings.map || 0) : 0;
    const curTimeIdx = (typeof settings !== 'undefined') ? (settings.timeIdx || 1) : 1;

    // 1. Sync Active Tab
    const tabBtns = overlay.querySelectorAll('.mode-tab-btn');
    tabBtns.forEach(btn => {
      const match = (btn.dataset.tab === curTab);
      btn.classList.toggle('active', match);
    });

    // 2. Sync Cards Visibility (Players vs Online)
    const playersCard = document.getElementById('ui-players-card');
    const onlineCard = document.getElementById('ui-online-card');
    if (playersCard && onlineCard) {
      if (curTab === 'online') {
        playersCard.style.display = 'none';
        onlineCard.style.display = 'flex';
      } else {
        playersCard.style.display = 'flex';
        onlineCard.style.display = 'none';
      }
    }

    // 3. Sync Game Mode Info & Chips
    const meta = MODE_METAS[curMode] || MODE_METAS.party;
    const modeNameEl = document.getElementById('ui-mode-name');
    const modeBadgeEl = document.getElementById('ui-mode-badge');
    const modeDescEl = document.getElementById('ui-mode-desc');

    if (modeNameEl && modeNameEl.textContent !== meta.name) modeNameEl.textContent = meta.name;
    if (modeBadgeEl && modeBadgeEl.textContent !== meta.badge) modeBadgeEl.textContent = meta.badge;
    if (modeDescEl && modeDescEl.textContent !== meta.desc) modeDescEl.textContent = meta.desc;

    const modeChips = overlay.querySelectorAll('#ui-mode-chips .chip-btn');
    modeChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.mode === curMode);
    });

    // 4. Sync Map Info
    if (typeof MAPS !== 'undefined' && Array.isArray(MAPS) && MAPS.length) {
      const mapObj = MAPS[curMapIdx % MAPS.length];
      const mapNumEl = document.getElementById('ui-map-num');
      const mapNameEl = document.getElementById('ui-map-name');
      const mapDescEl = document.getElementById('ui-map-desc');
      const mapText = 'MAP ' + ((curMapIdx % MAPS.length) + 1) + ' / ' + MAPS.length;

      if (mapNumEl && mapNumEl.textContent !== mapText) mapNumEl.textContent = mapText;
      if (mapNameEl && mapObj && mapNameEl.textContent !== mapObj.name) mapNameEl.textContent = mapObj.name;
      if (mapDescEl && mapDescEl.textContent !== 'Dynamic arena platforms & juke routes') {
        mapDescEl.textContent = 'Dynamic arena platforms & juke routes';
      }
    }

    // 5. Sync Time Chips
    const timeChips = overlay.querySelectorAll('#ui-time-chips .time-chip');
    timeChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.timeIdx, 10) === curTimeIdx);
    });

    // 6. Sync Player Slots Roster
    renderPlayerSlots(curTab);

    // 7. Sync Online Multiplayer Status
    if (curTab === 'online') {
      const netStatus = document.getElementById('ui-net-status');
      const hostDetails = document.getElementById('ui-host-details');
      const roomCodeEl = document.getElementById('ui-room-code');

      if (typeof NET !== 'undefined' && NET && NET.role !== null) {
        if (NET.room) {
          if (roomCodeEl) roomCodeEl.textContent = NET.room.toUpperCase();
          if (hostDetails) hostDetails.style.display = 'block';
          if (netStatus) {
            netStatus.textContent = NET.isHost ? 'HOSTING (' + NET.room.toUpperCase() + ')' : 'IN ROOM (' + NET.room.toUpperCase() + ')';
            netStatus.className = 'mode-pill-badge badge-green';
          }
        }
      } else {
        if (hostDetails) hostDetails.style.display = 'none';
        if (netStatus) {
          netStatus.textContent = 'P2P READY';
          netStatus.className = 'mode-pill-badge badge-cyan';
        }
      }
    }

    // 8. Sync Sound Tool Icon
    const btnSound = document.getElementById('ui-btn-sound');
    if (btnSound && typeof muted !== 'undefined') {
      btnSound.innerHTML = muted
        ? '🔇 <span class="tool-txt">Muted</span>'
        : '🔊 <span class="tool-txt">Sound</span>';
    }
  }

  function renderPlayerSlots(tab) {
    const container = document.getElementById('ui-player-slots');
    if (!container || typeof menu === 'undefined' || typeof PALETTE === 'undefined') return;

    const slotsCount = 4;
    let html = '';

    for (let i = 0; i < slotsCount; i++) {
      const colIdx = (menu.slotColor && menu.slotColor[i] >= 0) ? menu.slotColor[i] : -1;
      const isActive = (colIdx >= 0);
      const isBot = !!(menu.slotIsBot && menu.slotIsBot[i]) || (tab === 'bots') || (tab === 'solo' && i > 0 && isActive);
      const palColor = (colIdx >= 0 && PALETTE[colIdx % PALETTE.length]) ? PALETTE[colIdx % PALETTE.length].c : '#64748b';
      const palName = (colIdx >= 0 && PALETTE[colIdx % PALETTE.length]) ? PALETTE[colIdx % PALETTE.length].name : 'OFF';

      let roleLabel = 'OFF';
      let roleClass = 'role-off';
      if (isActive) {
        if (isBot) {
          roleLabel = 'BOT';
          roleClass = 'role-bot';
        } else {
          roleLabel = 'HUMAN';
          roleClass = 'role-human';
        }
      }

      const ctrlText = CONTROL_HINTS[i] || 'Touch / D-Pad';

      html += `
        <div class="player-slot-card ${isActive ? 'slot-active' : 'slot-inactive'}" data-slot="${i}">
          <div class="slot-header">
            <span class="slot-name">P${i + 1}</span>
            <button class="slot-role-badge ${roleClass}" data-action="toggle-role" data-slot="${i}">${roleLabel}</button>
          </div>
          <div class="slot-color-row">
            <button class="color-swatch" data-action="cycle-color" data-slot="${i}" style="background-color: ${palColor};" title="Click to change color">
              <span class="swatch-ring"></span>
            </button>
            <div class="color-meta">
              <span class="color-title">${palName}</span>
              <span class="ctrl-hint">${ctrlText}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (container.dataset.renderedHtml !== html) {
      container.innerHTML = html;
      container.dataset.renderedHtml = html;

      // Attach event listeners to dynamic slot items
      container.querySelectorAll('[data-action="toggle-role"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const s = parseInt(btn.dataset.slot, 10);
          toggleSlotRole(s, tab);
          syncDOMUI(true);
        });
      });

      container.querySelectorAll('[data-action="cycle-color"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const s = parseInt(btn.dataset.slot, 10);
          cycleSlotColor(s);
          syncDOMUI(true);
        });
      });
    }
  }

  function toggleSlotRole(slot, tab) {
    if (typeof menu === 'undefined') return;
    if (tab === 'solo') {
      if (slot === 0) return; // P1 is always Human in Solo
      // Toggle Bot vs Off
      if (menu.slotColor[slot] >= 0) {
        menu.slotColor[slot] = -1;
      } else {
        cycleSlotColor(slot);
      }
    } else if (tab === 'bots') {
      // Toggle Bot vs Off
      if (menu.slotColor[slot] >= 0) {
        menu.slotColor[slot] = -1;
      } else {
        cycleSlotColor(slot);
      }
    } else {
      // Local 2-4P: Human -> Bot -> Off -> Human
      if (menu.slotColor[slot] < 0) {
        cycleSlotColor(slot);
        if (menu.slotIsBot) menu.slotIsBot[slot] = false;
      } else if (!menu.slotIsBot || !menu.slotIsBot[slot]) {
        if (!menu.slotIsBot) menu.slotIsBot = [false, false, false, false];
        menu.slotIsBot[slot] = true;
      } else {
        menu.slotColor[slot] = -1;
        if (menu.slotIsBot) menu.slotIsBot[slot] = false;
      }
    }
    if (typeof ensureUniqueLocalColors === 'function') ensureUniqueLocalColors();
    if (typeof sfx === 'function') sfx('ui');
  }

  function cycleSlotColor(slot) {
    if (typeof cycleSlot === 'function') {
      cycleSlot(slot, 1);
    } else if (typeof menu !== 'undefined' && typeof PALETTE !== 'undefined') {
      const cur = menu.slotColor[slot];
      menu.slotColor[slot] = (cur + 1) % PALETTE.length;
    }
    if (typeof sfx === 'function') sfx('ui');
  }

  // Auto-init on script load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDOMUI);
    } else {
      initDOMUI();
    }
  }

  // Export globally
  global.initDOMUI = initDOMUI;
  global.syncDOMUI = syncDOMUI;

})(typeof window !== 'undefined' ? window : globalThis);
