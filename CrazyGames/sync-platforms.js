/**
 * sync-platforms.js
 * Automatically synchronizes modular game files between CrazyGames (tag/)
 * and Poki (PokiGames/) and tag-server/ while preserving platform-specific SDKs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TAG_DIR = path.join(ROOT, 'tag');
const POKI_DIR = path.join(ROOT, 'PokiGames');
const SERVER_DIR = path.join(ROOT, 'tag-server');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncTag() {
  console.log('[SYNC] Synchronizing modular files across platforms...');

  // 1. Sync js and css to tag-server
  if (fs.existsSync(SERVER_DIR)) {
    copyDirRecursive(path.join(TAG_DIR, 'js'), path.join(SERVER_DIR, 'js'));
    copyDirRecursive(path.join(TAG_DIR, 'css'), path.join(SERVER_DIR, 'css'));
    fs.copyFileSync(path.join(TAG_DIR, 'index.html'), path.join(SERVER_DIR, 'game.html'));
  }

  // 2. Sync js and css to PokiGames
  if (fs.existsSync(POKI_DIR)) {
    copyDirRecursive(path.join(TAG_DIR, 'js'), path.join(POKI_DIR, 'js'));
    copyDirRecursive(path.join(TAG_DIR, 'css'), path.join(POKI_DIR, 'css'));

    // Adapt Poki audio.js for PokiSDK
    const pokiAudioPath = path.join(POKI_DIR, 'js', 'audio.js');
    if (fs.existsSync(pokiAudioPath)) {
      let audioContent = fs.readFileSync(pokiAudioPath, 'utf8');
      // Inject Poki boot / SDK wrapper if not present
      if (!audioContent.includes('const POKI =')) {
        const pokiBlock = `/* ================= POKI SDK v2 INTEGRATION ================= */
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
      if (typeof PokiSDK === 'undefined') { finish(); return; }
      try {
        PokiSDK.init().then(() => {
          this.ready = true;
          this.adblock = false;
          try { PokiSDK.gameLoadingFinished(); } catch(e){}
          finish();
        }).catch(() => {
          this.ready = true;
          this.adblock = true;
          try { PokiSDK.gameLoadingFinished(); } catch(e){}
          finish();
        });
      } catch(e) { finish(); }
    });
  },
  loadingFinished() { try { if (typeof PokiSDK !== 'undefined') PokiSDK.gameLoadingFinished(); } catch(e){} },
  gameplayStart() { try { if (!this.isPlaying && typeof PokiSDK !== 'undefined') { PokiSDK.gameplayStart(); this.isPlaying = true; } } catch(e){} },
  gameplayStop() { try { if (this.isPlaying && typeof PokiSDK !== 'undefined') { PokiSDK.gameplayStop(); this.isPlaying = false; } } catch(e){} },
  commercialBreak(onDone) { this.gameplayStop(); applySdkMute(true); if (typeof PokiSDK !== 'undefined') { PokiSDK.commercialBreak(() => applySdkMute(true)).then(() => { applySdkMute(false); if (onDone) onDone(); }).catch(() => { applySdkMute(false); if (onDone) onDone(); }); } else { applySdkMute(false); if (onDone) onDone(); } },
  rewardedBreak(onSuccess) { this.gameplayStop(); applySdkMute(true); if (typeof PokiSDK !== 'undefined') { PokiSDK.rewardedBreak().then(s => { applySdkMute(false); if (onSuccess) onSuccess(s); }).catch(() => { applySdkMute(false); if (onSuccess) onSuccess(false); }); } else { applySdkMute(false); if (onSuccess) onSuccess(true); } },
  happytime() {},
  getUser() { return null; },
  async getUserAsync() { return null; },
  updateRoom(roomId, playerList, isJoinable) {},
  leftRoom() {},
  showInviteButton() { return false; },
  hideInviteButton() {},
  async getInviteLink(roomId) {
    if (typeof PokiSDK !== 'undefined' && typeof PokiSDK.shareableURL === 'function') {
      try { const link = await PokiSDK.shareableURL({ room: roomId }); if (link) return link; } catch(e){}
    }
    try { return location.origin + location.pathname + '?room=' + encodeURIComponent(roomId); } catch(e){ return null; }
  }
};
const CG = POKI;\n`;
        audioContent = audioContent.replace(/const CG\s*=\s*\{[\s\S]*?\n\};\r?\n/, pokiBlock);
        fs.writeFileSync(pokiAudioPath, audioContent, 'utf8');
      }
    }

    // Sync Poki index.html shell
    let pokiHtml = fs.readFileSync(path.join(TAG_DIR, 'index.html'), 'utf8');
    pokiHtml = pokiHtml.replace(/<script src="https:\/\/sdk\.crazygames\.com\/crazygames-sdk-v3\.js"><\/script>/i, '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>\n<script src="poki-safety.js"></script>');
    fs.writeFileSync(path.join(POKI_DIR, 'index.html'), pokiHtml, 'utf8');
  }

  console.log('[SYNC SUCCESS] Synchronized modular architecture to PokiGames and tag-server!');
  return true;
}

syncTag();
