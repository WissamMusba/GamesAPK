/**
 * sync-platforms.js
 * Automatically synchronizes game logic between CrazyGames (tag/index.html)
 * and Poki (PokiGames/index.html) while preserving platform-specific SDKs.
 * 
 * Usage:
 *   node sync-platforms.js          # Run one-off sync (tag -> PokiGames & tag-server)
 *   node sync-platforms.js --watch  # Live file watcher: auto-syncs on Ctrl+S
 *   node sync-platforms.js --hook   # Installs automatic git pre-commit hook
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TAG_FILE = path.join(ROOT, 'tag', 'index.html');
const POKI_FILE = path.join(ROOT, 'PokiGames', 'index.html');
const SERVER_FILE = path.join(ROOT, 'tag-server', 'game.html');

// Platform SDK blocks
const POKI_HEAD_SCRIPT = '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>';
const CG_HEAD_SCRIPT = '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>';

function buildPokiSdkBlock() {
  return `let AC=null,master=null,muted=false,sdkMuted=false;
let _pokiBoot=null;

/* ================= POKI SDK v2 INTEGRATION ================= */
const POKI = {
  ready: false,
  isPlaying: false,
  adblock: false,
  chatDisabled: false,
  _user: null,

  boot() {
    return new Promise(res => {
      let _done = false;
      const finish = () => { try { if (!_done) { _done = true; res(); } } catch(e){} };
      try { setTimeout(finish, 4000); } catch(e){}

      if (typeof PokiSDK === 'undefined') {
        console.warn('[Poki] PokiSDK not found, running standalone.');
        finish();
        return;
      }
      try {
        PokiSDK.init().then(() => {
          this.ready = true;
          this.adblock = false;
          console.log('[Poki] SDK initialized successfully.');
          try { PokiSDK.gameLoadingFinished(); } catch(e){}
          finish();
        }).catch(() => {
          this.ready = true;
          this.adblock = true;
          console.warn('[Poki] SDK init failed (adblocker likely active). Continuing normally.');
          try { PokiSDK.gameLoadingFinished(); } catch(e){}
          finish();
        });
      } catch(e) {
        finish();
      }
    });
  },

  loadingFinished() {
    try {
      if (typeof PokiSDK !== 'undefined') PokiSDK.gameLoadingFinished();
    } catch(e){}
  },

  gameplayStart() {
    try {
      if (!this.isPlaying && typeof PokiSDK !== 'undefined') {
        PokiSDK.gameplayStart();
        this.isPlaying = true;
      }
    } catch(e){}
  },

  gameplayStop() {
    try {
      if (this.isPlaying && typeof PokiSDK !== 'undefined') {
        PokiSDK.gameplayStop();
        this.isPlaying = false;
      }
    } catch(e){}
  },

  commercialBreak(onDone) {
    this.gameplayStop();
    applySdkMute(true);
    if (typeof PokiSDK !== 'undefined') {
      PokiSDK.commercialBreak(() => {
        applySdkMute(true);
      }).then(() => {
        applySdkMute(false);
        if (typeof onDone === 'function') onDone();
      }).catch(() => {
        applySdkMute(false);
        if (typeof onDone === 'function') onDone();
      });
    } else {
      applySdkMute(false);
      if (typeof onDone === 'function') onDone();
    }
  },

  rewardedBreak(onSuccess) {
    this.gameplayStop();
    applySdkMute(true);
    if (typeof PokiSDK !== 'undefined') {
      PokiSDK.rewardedBreak().then(success => {
        applySdkMute(false);
        if (typeof onSuccess === 'function') onSuccess(success);
      }).catch(() => {
        applySdkMute(false);
        if (typeof onSuccess === 'function') onSuccess(false);
      });
    } else {
      applySdkMute(false);
      if (typeof onSuccess === 'function') onSuccess(true);
    }
  },

  happytime() {},
  getUser() { return null; },
  async getUserAsync() { return null; },
  updateRoom(roomId, playerList, isJoinable) {},
  leftRoom() {},
  showInviteButton() { return false; },
  hideInviteButton() {},

  async getInviteLink(roomId) {
    if (typeof PokiSDK !== 'undefined' && typeof PokiSDK.shareableURL === 'function') {
      try {
        const link = await PokiSDK.shareableURL({ room: roomId });
        if (link) return link;
      } catch(e){}
    }
    try {
      return location.origin + location.pathname + '?room=' + encodeURIComponent(roomId);
    } catch(e){
      return null;
    }
  }
};

// Backward-compatible alias
const CG = POKI;
let _cgBoot = null;`;
}

function syncTagToPoki() {
  if (!fs.existsSync(TAG_FILE)) {
    console.error('Error: tag/index.html not found!');
    return false;
  }

  let content = fs.readFileSync(TAG_FILE, 'utf8');

  // 1. Swap head script tag
  content = content.replace(/<script src="https:\/\/sdk\.crazygames\.com\/crazygames-sdk-v3\.js"><\/script>/i, POKI_HEAD_SCRIPT);

  // 2. Swap CG SDK object with POKI SDK object
  // Locate audio/sdk block starting with "let AC=null" up to "function applySdkMute"
  const sdkRegex = /let AC=null,master=null,muted=false,sdkMuted=false;[\s\S]*?(?=function applySdkMute)/;
  if (sdkRegex.test(content)) {
    content = content.replace(sdkRegex, buildPokiSdkBlock() + '\n');
  }

  // 3. Swap lobby status indicator
  content = content.replace(
    /const sdkOk=!!\(window\.CrazyGames[\s\S]*?(?=\s*\/\/ Mic Mute)/,
    `const sdkOk=(typeof PokiSDK!=='undefined');
    const dot=sdkOk?'● POKI SDK':'○ STANDALONE';
    const dotCol=sdkOk?'#2ecc71':'#64748b';
    txt(dot, startX + 118, stageY + topH/2 + 1, FN(9, 800), dotCol, 'left');
    if(typeof netUpdateHostDirectory==='function'){
      if(!drawOnlineLobby._portalRetry||Date.now()-drawOnlineLobby._portalRetry>4000){
        drawOnlineLobby._portalRetry=Date.now();
        try{netUpdateHostDirectory();}catch(e){}
      }
    }
  }catch(e){}`
  );

  // 4. Clean portal link builders and invite links
  content = content.replace(/crazygames-tag-server-alerts/g, 'poki-tag-server-alerts');
  content = content.replace(/Click to Join Room on CrazyGames/g, 'Click to Join Room');
  content = content.replace(/TAG Multiplayer Watchdog • CrazyGames/g, 'TAG Multiplayer Watchdog • Poki');
  content = content.replace(/Game Portal', value: 'CrazyGames'/g, "Game Portal', value: 'Poki'");
  content = content.replace(/\/\* Local Player Profile detection via CrazyGames SDK v3 or fallback \*\//g, '/* Local Player Profile detection or fallback */');
  content = content.replace(/\/\/ 1\. Resolve human player's identity \(CrazyGames username, localStorage, or Guest name\)/g, "// 1. Resolve human player's identity (localStorage or Guest name)");
  content = content.replace(/\/\/ CrazyGames SDK v3 updateRoom[^\n]*/g, '// Update room state');
  content = content.replace(/const PINNED_FONTIdx=8; \/\/ font #9 = Baloo 2 — pinned for CrazyGames/g, 'const PINNED_FONTIdx=8; // font #9 = Baloo 2');
  content = content.replace(/game-files\.crazygames\.com/g, 'poki.com');
  content = content.replace(/try\{\s*if\(!_cgBoot\)\s*_cgBoot\s*=\s*CG\.boot\(\);\s*\}catch\(e\)\{\}/g, 'try{ if(!_pokiBoot) _pokiBoot = POKI.boot(); }catch(e){}');
  content = content.replace(/respect CrazyGames rules/g, 'respect Poki rules');

  // 5. Replace buildCgPortalLink with clean Poki portal link
  const cgPortalFnRegex = /function buildCgPortalLink\s*\([^)]*\)\s*\{[\s\S]*?(?=\n\/\/ [A-Z]\. )/;
  if (cgPortalFnRegex.test(content)) {
    content = content.replace(cgPortalFnRegex, `function buildPokiPortalLink(roomCode){
  const code = (roomCode || '').toUpperCase();
  try{
    return location.origin + location.pathname + '?room=' + encodeURIComponent(code);
  }catch(e){
    return '?room=' + encodeURIComponent(code);
  }
}\n`);
    content = content.replace(/buildCgPortalLink\(/g, 'buildPokiPortalLink(');
  }

  // 6. Replace isCg telemetry detection with isPoki detection
  content = content.replace(
    /const isCg = !!\(typeof location !== 'undefined' && location\.host && location\.host\.includes\('crazygames'\)\);\s*\n\s*const source = isCg \? 'CrazyGames Portal' : \(document\.referrer \? document\.referrer\.slice\(0, 50\) : 'Direct URL'\);/,
    `const isPoki = !!(typeof location !== 'undefined' && location.host && location.host.includes('poki'));\n    const source = isPoki ? 'Poki Portal' : (document.referrer ? document.referrer.slice(0, 50) : 'Direct URL');`
  );

  // 7. Replace netLink with clean Poki/generic room link
  const netLinkFnRegex = /function netLink\s*\([^)]*\)\s*\{[\s\S]*?(?=\n\/\* Copy the portal invite link)/;
  if (netLinkFnRegex.test(content)) {
    content = content.replace(netLinkFnRegex, `function netLink(room){
  const code = (room || '').toUpperCase();
  let srvQ = '';
  try{
    srvQ = ((NET && NET._srv && NET._srv.host) || ((typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || '') || '').replace(/^https?:\\\/\\\//i, '').replace(/\\\/+$/, '').trim();
    if(!/^[A-Za-z0-9.\\-:]+$/.test(srvQ)) srvQ = '';
  }catch(e){ srvQ = ''; }
  let p = location.pathname;
  if(p.endsWith('/')) p = p + 'index.html';
  else if(/\\\/[^\\\/]+\\.[a-z]+$/i.test(p)) p = p.replace(/\\\/[^\\\/]*$/, '/');
  else p = p + '/';
  return location.origin + p + '?room=' + code + (srvQ ? ('&srv=' + encodeURIComponent(srvQ)) : '');
}\n`);
  }

  // Write to PokiGames/index.html
  if (!fs.existsSync(path.dirname(POKI_FILE))) {
    fs.mkdirSync(path.dirname(POKI_FILE), { recursive: true });
  }
  fs.writeFileSync(POKI_FILE, content, 'utf8');

  // Also sync to tag-server/game.html
  if (fs.existsSync(path.dirname(SERVER_FILE))) {
    fs.copyFileSync(TAG_FILE, SERVER_FILE);
  }

  console.log(`[SYNC SUCCESS] Synchronized tag/index.html -> PokiGames/index.html (${content.length} bytes) and tag-server/game.html`);
  return true;
}

// CLI args
const args = process.argv.slice(2);

if (args.includes('--hook')) {
  // Install Git pre-commit hook
  let gitRoot = null;
  try {
    const { execSync } = require('child_process');
    gitRoot = execSync('git rev-parse --show-toplevel', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch(e) {
    if (fs.existsSync(path.join(ROOT, '.git'))) gitRoot = ROOT;
    else if (fs.existsSync(path.join(ROOT, '..', '.git'))) gitRoot = path.join(ROOT, '..');
  }

  const hookDir = gitRoot ? path.join(gitRoot, '.git', 'hooks') : null;
  const hookFile = hookDir ? path.join(hookDir, 'pre-commit') : null;
  if (hookDir && fs.existsSync(hookDir)) {
    const hookScript = `#!/bin/sh\ncd CrazyGames 2>/dev/null || cd .\nnode sync-platforms.js\ngit add PokiGames/index.html tag-server/game.html 2>/dev/null || true\n`;
    fs.writeFileSync(hookFile, hookScript, { mode: 0o755 });
    console.log('[HOOK] Git pre-commit hook installed successfully at ' + hookFile + '! Every commit will auto-sync.');
  } else {
    console.log('[HOOK] .git/hooks directory not found.');
  }
  process.exit(0);
}

if (args.includes('--watch')) {
  console.log('[WATCH] Watching tag/index.html for changes... (Press Ctrl+C to stop)');
  let debounce = null;
  fs.watch(TAG_FILE, (event) => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log('[WATCH] Change detected in tag/index.html. Syncing...');
      syncTagToPoki();
    }, 300);
  });
} else {
  syncTagToPoki();
}
