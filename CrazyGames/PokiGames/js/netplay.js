/* ================= netplay (host-authoritative P2P) ================= */
const CTRL_SCHEMES = ['WASD', 'Arrows', 'Controller'];

/* Dedicated Signaling Server Configuration (Railway, Render, or self-hosted)
 * Leave host empty '' to use official PeerJS cloud (0.peerjs.com).
 * Or paste your Railway / Render domain e.g. 'tag-server-production.up.railway.app'
 */
const PEER_SERVER_CONFIG = {
  host: 'tag-netplay-server.onrender.com', // Your live dedicated Singapore Render server!
  port: 443,
  path: '/tag-netplay',
  secure: true
};

/* Self-hosted signaling server (run tag-server/server.js on your own machine/VPS).
 * Fill in your public host below, or ?selfserver=HOST in the URL, or set
 * localStorage 'tag_self_server'. Same path as server.js ('/tag-netplay').
 * When self and Render are within 20ms of each other, self wins (free for you).
 */
const SELF_SERVER_CONFIG = {
  host: '', // e.g. 'play.myserver.com' or '192.168.1.50' — empty = self-host disabled
  port: 9000,
  path: '/tag-netplay',
  secure: false
};
const SELF_PREFER_MARGIN_MS = 20; // pick self-host when selfMs <= renderMs + margin
function netSelfHost(){
  try{
    const qp = new URLSearchParams(location.search);
    const q = (qp.get('selfserver') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    if(q) return q;
  }catch(e){}
  try{
    const s = (localStorage.getItem('tag_self_server') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    if(s) return s;
  }catch(e){}
  return ((typeof SELF_SERVER_CONFIG !== 'undefined' ? SELF_SERVER_CONFIG.host : '') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
}
function netSelfCfg(){
  return {
    host: netSelfHost(),
    port: (typeof SELF_SERVER_CONFIG !== 'undefined' && SELF_SERVER_CONFIG.port) || 9000,
    path: (typeof SELF_SERVER_CONFIG !== 'undefined' && SELF_SERVER_CONFIG.path) || '/tag-netplay',
    secure: (typeof SELF_SERVER_CONFIG !== 'undefined' && SELF_SERVER_CONFIG.secure !== undefined) ? SELF_SERVER_CONFIG.secure : false,
    source: 'self'
  };
}
function netRenderCfg(){
  return {
    host: (typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || 'tag-netplay-server.onrender.com',
    port: (typeof PEER_SERVER_CONFIG !== 'undefined' && PEER_SERVER_CONFIG.port) || 443,
    path: (typeof PEER_SERVER_CONFIG !== 'undefined' && PEER_SERVER_CONFIG.path) || '/tag-netplay',
    secure: (typeof PEER_SERVER_CONFIG !== 'undefined' && PEER_SERVER_CONFIG.secure !== undefined) ? PEER_SERVER_CONFIG.secure : true,
    source: 'render'
  };
}
function netCfgBase(cfg){
  const scheme = cfg.secure ? 'https://' : 'http://';
  const defaultPort = cfg.secure ? 443 : 80;
  return scheme + cfg.host + ((cfg.port && cfg.port !== defaultPort) ? (':' + cfg.port) : '');
}
function netTimedHealth(cfg, capMs){
  return new Promise(resolve=>{
    if(!cfg || !cfg.host){ resolve({ ms: Infinity, ok: false }); return; }
    let ctrl = null;
    try{ if(typeof AbortController !== 'undefined') ctrl = new AbortController(); }catch(e){ ctrl = null; }
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let done = false;
    const finish = (ok)=>{
      if(done) return; done = true;
      try{ if(ctrl) ctrl.abort(); }catch(e){}
      const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      resolve({ ms: ok ? (t1 - t0) : Infinity, ok: !!ok });
    };
    const to = setTimeout(()=>finish(false), capMs || 1500);
    try{
      const opts = {};
      if(ctrl) opts.signal = ctrl.signal;
      fetch(netCfgBase(cfg) + '/health', opts).then(r=>{ clearTimeout(to); finish(r && r.ok); }).catch(()=>{ clearTimeout(to); finish(false); });
    }catch(e){ clearTimeout(to); finish(false); }
  });
}
/* Probe self vs Render in parallel. Rule: self wins when selfMs <= renderMs + 20ms.
 * Result cached 5min in localStorage; NET._srv holds the active choice. Silent. */
function netProbeServers(cb, force){
  const done = (cfg)=>{ try{ if(cb) cb(cfg); }catch(e){} };
  // Background probes must never flip servers mid-session; pre-connect ensures (force) always commit.
  const connected = (()=>{ try{ return !!(NET && NET.role !== null && NET.peer && !NET.peer.destroyed && NET.myId); }catch(e){ return false; } })();
  const commit = (cfg)=>{ try{ if(cfg && (force || !connected)) NET._srv = cfg; }catch(e){} };
  try{
    const self = netSelfCfg(), render = netRenderCfg();
    if(!self.host){ // self-host not configured: keep current behavior, still warm the cache
      netTimedHealth(render, 900).then(r=>{
        const cfg = r.ok ? render : null;
        try{
          commit(cfg);
          localStorage.setItem('tag_srv', JSON.stringify({ src: cfg ? 'render' : 'none', t: Date.now() }));
        }catch(e){}
        done(cfg);
      });
      return;
    }
    Promise.all([netTimedHealth(self, 900), netTimedHealth(render, 900)]).then(([s, r])=>{
      let cfg = null;
      if(s.ok && (!r.ok || s.ms <= r.ms + SELF_PREFER_MARGIN_MS)) cfg = self;
      else if(r.ok) cfg = render;
      else if(s.ok) cfg = self;
      try{
        commit(cfg);
        localStorage.setItem('tag_srv', JSON.stringify({ src: cfg ? cfg.source : 'none', t: Date.now() }));
      }catch(e){}
      try{ if(location.search.indexOf('debug') >= 0) console.log('[NET] server probe: self ' + (s.ok ? Math.round(s.ms) + 'ms' : 'down') + ' vs render ' + (r.ok ? Math.round(r.ms) + 'ms' : 'down') + ' => ' + (cfg ? cfg.source + ' ' + cfg.host : 'cloud fallback')); }catch(e){}
      done(cfg);
    });
  }catch(e){ done(null); }
}
/* Ensure a fresh server choice, then continue. Uses cache (<5min) or manual ?server= instantly; else probes (fast when up, <=1.5s worst case). */
function netEnsureServer(fn){
  const go = (cfg)=>{ try{ fn(cfg || null); }catch(e){} };
  try{
    let manual = '';
    try{
      const qp = new URLSearchParams(location.search);
      manual = (qp.get('server') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    }catch(e){}
    if(manual){ const c = { host: manual, port: 443, path: '/tag-netplay', secure: true, source: 'manual' }; NET._srv = c; go(c); return; }
    if(NET._srvHintHost){ // invite-link server hint: same room lives here, skip probing
      const h = NET._srvHintHost;
      const selfH = netSelfHost();
      if(selfH && h.toLowerCase() === selfH.toLowerCase()){ const c = netSelfCfg(); NET._srv = c; go(c); return; }
      const c = { host: h, port: 443, path: '/tag-netplay', secure: true, source: 'hint' };
      NET._srv = c; go(c); return;
    }
    let cached = null;
    try{ cached = JSON.parse(localStorage.getItem('tag_srv') || 'null'); }catch(e){}
    if(cached && cached.t && (Date.now() - cached.t) < 300000 && (cached.src === 'self' || cached.src === 'render')){
      const c = (cached.src === 'self') ? netSelfCfg() : netRenderCfg();
      if(c.host){ NET._srv = c; go(c); return; }
    }
    // A recent "no server reachable" probe (e.g. cold Render) is still accurate
    // seconds later: skip the 900ms re-probe and go straight to the default
    // endpoint — the PeerJS dial itself then becomes the real probe.
    if(cached && cached.src === 'none' && cached.t && (Date.now() - cached.t) < 30000){
      NET._srv = null; go(null); return;
    }
    netProbeServers(go, true);
  }catch(e){ go(null); }
}
/* Directory base URL: same server as signaling (no split-brain). Falls back to Render default. */
function netDirBase(){
  try{
    if(NET._srv && NET._srv.host) return netCfgBase(NET._srv);
  }catch(e){}
  try{
    const customHost = (typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || '';
    return 'https://' + (customHost || 'tag-netplay-server.onrender.com');
  }catch(e){ return 'https://tag-netplay-server.onrender.com'; }
}

/* ================= SESSION LIFECYCLE & ANALYTICS ENGINE ================= */
const SESSION_METRICS = {
  sessionId: 'sess_' + Math.random().toString(36).slice(2, 9),
  startTime: Date.now(),
  activeTimeSec: 0,
  _lastActiveT: Date.now(),
  _isActive: true,
  matchesStarted: 0,
  matchesCompleted: 0,
  totalMatchPlaytimeSec: 0,
  currentMatchStartT: 0,
  modesPlayed: {},
  botDifficulty: 'hard',
  botWins: 0,
  humanWins: 0,
  lastTagT: 0,
  rageQuits: 0,
  normalQuits: 0,
  fpsCounter: 0,
  fpsTimer: 0,
  fpsSamples: [],
  avgFps: 60,
  isEnded: false
};

function updateActiveSessionTime(){
  try{
    const now = Date.now();
    const isVisible = (typeof document !== 'undefined') ? (!document.hidden && document.visibilityState === 'visible') : true;
    if(SESSION_METRICS._isActive && isVisible){
      const dt = Math.max(0, Math.min(30, (now - SESSION_METRICS._lastActiveT) / 1000));
      SESSION_METRICS.activeTimeSec += dt;
    }
    SESSION_METRICS._lastActiveT = now;
    SESSION_METRICS._isActive = isVisible;
  }catch(e){}
}
if(typeof document !== 'undefined'){
  document.addEventListener('visibilitychange', updateActiveSessionTime);
  window.addEventListener('focus', () => {
    SESSION_METRICS._isActive = true;
    SESSION_METRICS._lastActiveT = Date.now();
  });
  window.addEventListener('blur', () => {
    updateActiveSessionTime();
    SESSION_METRICS._isActive = false;
  });
  setInterval(updateActiveSessionTime, 1000);
}

/* ================= DISCORD TELEMETRY & MULTI-CHANNEL SUITE ================= */
function isOrganicPlay(){
  try{
    if(typeof window === 'undefined') return false;
    try{ if(new URLSearchParams(location.search).get('telemetry') === '1') return true; }catch(e){}
    // 1. Headless / automation flags
    if(navigator.webdriver) return false;
    if(window.__nightmare || window._phantom || window.callPhantom || window.__selenium_unwrapped || window.domAutomation || window.domAutomationController) return false;
    // 2. Headless user agent signatures
    const ua = (navigator.userAgent || '').toLowerCase();
    if(ua.includes('headlesschrome') || ua.includes('phantomjs') || ua.includes('playwright') || ua.includes('puppeteer')) return false;
    // 3. Local protocols (file://, blob://, about:)
    const proto = (location.protocol || '').toLowerCase();
    if(proto === 'file:' || proto === 'blob:' || proto === 'about:') return false;
    // 4. Localhost / local IP / private test networks
    const host = (location.hostname || '').toLowerCase();
    if(!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.lan')) return false;
    // 5. Test / automation query params
    if(location.search && /[\?&](test|mock|automated|agent|debug_test|e2e|harness|cypress|playwright|selenium)=/i.test(location.search)) return false;
    return true;
  }catch(e){
    return false;
  }
}

const NET_TELEMETRY_CONFIG = {
  enabled: false,
  alertsWebhookUrl: '',
  alertsMention: '',
  launchesWebhookUrl: '',
  sessionsWebhookUrl: '',
  ntfyTopic: '',
  ntfyServer: ''
};

const NET_ALERTS_CONFIG = {
  get enabled(){ return NET_TELEMETRY_CONFIG.enabled; },
  get discordWebhookUrl(){ return NET_TELEMETRY_CONFIG.alertsWebhookUrl; },
  get discordMention(){ return NET_TELEMETRY_CONFIG.alertsMention; },
  get ntfyTopic(){ return NET_TELEMETRY_CONFIG.ntfyTopic; },
  get ntfyServer(){ return NET_TELEMETRY_CONFIG.ntfyServer; }
};

function buildCgPortalLink(roomCode){
  const code = (roomCode || '').toUpperCase();
  let invitedBy = 'YS0WTkyqWaOxDpfJWLEv7hRzkJ73';
  try{
    if(typeof CG !== 'undefined' && CG && CG._user && (CG._user.id || CG._user.userId)){
      invitedBy = CG._user.id || CG._user.userId;
    }
  }catch(e){}
  return 'https://www.crazygames.com/game/tag-arena-multiplayer?czy_invite=true&utm_source=invite&czy_invited_by=' + encodeURIComponent(invitedBy) + '&room=' + encodeURIComponent(code) + '&roomId=' + encodeURIComponent(code) + (function(){ try{ var s=((NET&&NET._srv&&NET._srv.host)||((typeof PEER_SERVER_CONFIG!=='undefined'?PEER_SERVER_CONFIG.host:'')||'')||'').replace(/^https?:\/\//i,'').replace(/\/+$/,'').trim(); if(/^[A-Za-z0-9.\-:]+$/.test(s)&&s) return '&srv='+encodeURIComponent(s); }catch(e){} return ''; })();
}

// A. #game-alerts: When Host starts a room (with @everyone ping)
function netNotifyRoomCreated(roomCode, hostName, isPublic, maxPlayers){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled) return;
    const mode = (typeof settings !== 'undefined' && settings && settings.gameMode) ? settings.gameMode.toUpperCase() : 'CLASSIC';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const code = (roomCode || '').toUpperCase();
    const joinUrl = buildCgPortalLink(code);

    if(NET_TELEMETRY_CONFIG.alertsWebhookUrl && NET_TELEMETRY_CONFIG.alertsWebhookUrl.trim()){
      const mentionText = NET_TELEMETRY_CONFIG.alertsMention ? (NET_TELEMETRY_CONFIG.alertsMention + ' ') : '';
      const discordPayload = {
        content: mentionText + '🎮 **A player started a TAG game server!**\n🔗 **Join link:** ' + joinUrl,
        username: 'TAG Server Watchdog',
        avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3ae.png',
        embeds: [{
          title: '🎮 New Game Server Hosted!',
          description: '[👉 **Click to Join Room on CrazyGames**](' + joinUrl + ')\n`' + joinUrl + '`',
          color: 0x22c55e,
          fields: [
            { name: 'Room Code', value: '`' + code + '`', inline: true },
            { name: 'Host Player', value: '**' + (hostName || 'Host') + '**', inline: true },
            { name: 'Game Mode', value: mode, inline: true },
            { name: 'Capacity', value: (maxPlayers || MAXP) + ' Players', inline: true },
            { name: 'Visibility', value: isPublic ? '🌐 Public' : '🔒 Private', inline: true },
            { name: 'Time', value: timeStr, inline: true },
            { name: '🆔 Host ID', value: '`' + (function(){ try{ return getOrCreatePlayerId() || 'n/a'; }catch(e){ return 'n/a'; } })() + '`', inline: true },
            { name: '🔗 Host Session', value: '`' + (function(){ try{ return (typeof SESSION_METRICS !== 'undefined' && SESSION_METRICS.sessionId) ? SESSION_METRICS.sessionId : 'n/a'; }catch(e){ return 'n/a'; } })() + '`', inline: true }
          ],
          footer: { text: 'TAG Multiplayer Watchdog • CrazyGames' },
          timestamp: new Date().toISOString()
        }]
      };

      fetch(NET_TELEMETRY_CONFIG.alertsWebhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      }).catch(()=>{});
    }

    if(NET_TELEMETRY_CONFIG.ntfyTopic && NET_TELEMETRY_CONFIG.ntfyTopic.trim()){
      const topic = NET_TELEMETRY_CONFIG.ntfyTopic.trim();
      const ntfyBase = (NET_TELEMETRY_CONFIG.ntfyServer || 'https://ntfy.sh').replace(/\/+$/, '');
      const ntfyUrl = ntfyBase + '/' + encodeURIComponent(topic);
      const ntfyMessage = 'Host: ' + (hostName || 'Host') + ' | Mode: ' + mode + ' | Room: ' + code + ' (' + (isPublic ? 'Public' : 'Private') + ')\nJoin: ' + joinUrl;
      fetch(ntfyUrl, {
        method: 'POST',
        headers: { 'Title': '🎮 Server Hosted: ' + code, 'Priority': 'default', 'Tags': 'video_game,bell', 'Click': joinUrl },
        body: ntfyMessage
      }).catch(()=>{});
    }
  }catch(err){}
}

// B. #game-alerts: SILENT notification when a player joins the lobby (NO @everyone)
function netNotifyPlayerJoinedLobby(guestName, peerId){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled || !NET_TELEMETRY_CONFIG.alertsWebhookUrl) return;
    if(typeof NET === "undefined" || !NET || !NET.isHost) return;
    const code = (NET.room || "").toUpperCase();
    const myProfile = netGetMyProfile();
    const names = [myProfile.name || "Host"];
    for(let i=1; i<MAXP; i++){
      const n = NET.slotsName ? NET.slotsName[i] : "";
      if(n && n.trim()) names.push(n.trim());
    }
    if(NET.spectators && NET.spectators.length){
      for(const sp of NET.spectators){
        if(sp && sp.name && !names.includes(sp.name)) names.push(sp.name);
      }
    }
    const activeCount = Math.max(names.length, 2);
    const max = NET.maxPlayers || MAXP;
    const mode = (typeof settings !== 'undefined' && settings && settings.gameMode) ? settings.gameMode.toUpperCase() : 'CLASSIC';
    const rtt = NET.pings ? NET.pings.get(peerId) : null;
    const pingStr = rtt ? (rtt + "ms") : "Measuring...";
    let guestPid = '', guestSess = '';
    try{ if(NET.peerPid) guestPid = NET.peerPid.get(peerId) || ''; }catch(e){}
    try{ if(NET.peerSess) guestSess = NET.peerSess.get(peerId) || ''; }catch(e){}

    const payload = {
      username: 'TAG Lobby Watchdog',
      content: '`' + (guestPid || 'n/a') + ' | ' + (guestSess || 'n/a') + ' | JOIN ' + code + ' | waiting list`',
      avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png',
      embeds: [{
        title: '👤 Player Joined Lobby (Waiting List)',
        description: "**" + (guestName || "Player") + "** entered room **" + code + "**!",
        color: 0x06b6d4,
        fields: [
          { name: 'Room Code', value: '`' + code + '`', inline: true },
          { name: 'Joining Player', value: '**' + (guestName || 'Player') + '**', inline: true },
          { name: 'Status', value: '⏳ Waiting list (spectator)', inline: true },
          { name: 'Ping to Host', value: '⚡ ' + pingStr, inline: true },
          { name: 'Lobby Capacity', value: activeCount + ' / ' + max + ' Players', inline: true },
          { name: 'Game Mode', value: mode, inline: true },
          { name: 'Players in Room', value: names.slice(0, MAXP).join(', ') || 'Host' },
          { name: '🆔 Guest ID', value: '`' + (guestPid || 'n/a') + '`', inline: true },
          { name: '🔗 Guest Session', value: '`' + (guestSess || 'n/a') + '`', inline: true }
        ],
        footer: { text: 'TAG Lobby Watchdog (Silent Alert)' },
        timestamp: new Date().toISOString()
      }]
    };

    fetch(NET_TELEMETRY_CONFIG.alertsWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(()=>{});
  }catch(e){}
}
function netNotifySlotTaken(name, slot, peerId){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled || !NET_TELEMETRY_CONFIG.alertsWebhookUrl) return;
    if(typeof NET === "undefined" || !NET || !NET.isHost) return;
    const code = (NET.room || "").toUpperCase();
    let pid = '', sess = '';
    try{ if(NET.peerPid) pid = NET.peerPid.get(peerId) || ''; }catch(e){}
    try{ if(NET.peerSess) sess = NET.peerSess.get(peerId) || ''; }catch(e){}
    fetch(NET_TELEMETRY_CONFIG.alertsWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'TAG Lobby Watchdog',
        content: '`' + (pid || 'n/a') + ' | ' + (sess || 'n/a') + ' | SLOT ' + code + ' P' + (slot + 1) + '`',
        avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png',
        embeds: [{
          title: '✅ Player Took Slot P' + (slot + 1),
          description: "**" + (name || "Player") + "** is now playing as **P" + (slot + 1) + "** in room **" + code + "**.",
          color: 0x22c55e,
          fields: [
            { name: 'Room Code', value: '`' + code + '`', inline: true },
            { name: 'Player', value: '**' + (name || 'Player') + '**', inline: true },
            { name: 'Slot', value: 'P' + (slot + 1), inline: true },
            { name: '🆔 Guest ID', value: '`' + (pid || 'n/a') + '`', inline: true },
            { name: '🔗 Guest Session', value: '`' + (sess || 'n/a') + '`', inline: true }
          ],
          footer: { text: 'TAG Lobby Watchdog (Silent Alert)' },
          timestamp: new Date().toISOString()
        }]
      })
    }).catch(()=>{});
  }catch(e){}
}
function netNotifyPlayerLeftLobby(name, slot, peerId, wasPlayer){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled || !NET_TELEMETRY_CONFIG.alertsWebhookUrl) return;
    if(typeof NET === "undefined" || !NET || !NET.isHost) return;
    const code = (NET.room || "").toUpperCase();
    if(!code) return;
    let pid = '', sess = '';
    try{ if(NET.peerPid) pid = NET.peerPid.get(peerId) || ''; }catch(e){}
    try{ if(NET.peerSess) sess = NET.peerSess.get(peerId) || ''; }catch(e){}
    fetch(NET_TELEMETRY_CONFIG.alertsWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'TAG Lobby Watchdog',
        content: '`' + (pid || 'n/a') + ' | ' + (sess || 'n/a') + ' | LEFT ' + code + (wasPlayer ? (' P' + (slot + 1)) : ' (spectator)') + '`',
        avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f6aa.png',
        embeds: [{
          title: wasPlayer ? ('🚪 Player Left (was P' + (slot + 1) + ')') : '🚪 Spectator Left',
          description: "**" + (name || "Player") + "** left room **" + code + "**.",
          color: 0x64748b,
          fields: [
            { name: 'Room Code', value: '`' + code + '`', inline: true },
            { name: 'Player', value: '**' + (name || 'Player') + '**', inline: true },
            { name: 'Was', value: wasPlayer ? ('Playing P' + (slot + 1)) : 'Spectating', inline: true },
            { name: '🆔 Guest ID', value: '`' + (pid || 'n/a') + '`', inline: true },
            { name: '🔗 Guest Session', value: '`' + (sess || 'n/a') + '`', inline: true }
          ],
          footer: { text: 'TAG Lobby Watchdog (Silent Alert)' },
          timestamp: new Date().toISOString()
        }]
      })
    }).catch(()=>{});
  }catch(e){}
}

// C. #game-launches: Tracks game boot, player name, device, timezone, and referrer
function telemetryTrackGameLaunch(){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled || !NET_TELEMETRY_CONFIG.launchesWebhookUrl) return;
    if(sessionStorage.getItem('tag_telemetry_boot_v1')) return;
    sessionStorage.setItem('tag_telemetry_boot_v1', '1');

    let pName = "Guest";
    try{
      const prof = netGetMyProfile();
      if(prof && prof.name) pName = prof.name;
      else if(typeof CG !== "undefined" && CG && CG._user && CG._user.name) pName = CG._user.name;
      else pName = localStorage.getItem("tag_player_name") || "Guest";
    }catch(e){}

    const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Unknown';
    const isMobile = !!(typeof isTouch !== 'undefined' && isTouch);
    const devStr = isMobile ? '📱 Mobile / Touch' : '💻 Desktop / Keyboard';
    const scrStr = (window.screen ? (window.screen.width + "x" + window.screen.height) : "Unknown");
    const qp = new URLSearchParams(location.search);
    const roomQ = (qp.get('room') || qp.get('roomId') || '').toUpperCase();
    const isCg = !!(typeof location !== 'undefined' && location.host && location.host.includes('crazygames'));
    const source = isCg ? 'CrazyGames Portal' : (document.referrer ? document.referrer.slice(0, 50) : 'Direct URL');
    let playerId = '', sessShort = '';
    try{ playerId = getOrCreatePlayerId(); }catch(e){}
    try{ sessShort = (typeof SESSION_METRICS !== 'undefined' && SESSION_METRICS.sessionId) ? SESSION_METRICS.sessionId : ''; }catch(e){}

    const payload = {
      username: 'TAG Analytics • Launches',
      content: '`' + (playerId || 'n/a') + ' | ' + (sessShort || 'n/a') + ' | ' + (isMobile ? 'MOBILE' : 'DESKTOP') + ' | ' + source + ' | room ' + (roomQ || '-') + '`',
      avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f680.png',
      embeds: [{
        title: '🚀 Game Launched',
        description: "**" + pName + "** opened **TAG Arena Multiplayer** in their browser.",
        color: 0x3b82f6,
        fields: [
          { name: 'Player Name', value: '**' + pName + '**', inline: true },
          { name: 'Device Type', value: devStr, inline: true },
          { name: 'Resolution', value: scrStr, inline: true },
          { name: 'Timezone / Region', value: '📍 ' + tz, inline: true },
          { name: 'Launch Source', value: source, inline: true },
          { name: 'Joined via Code', value: roomQ ? ('`' + roomQ + '`') : 'No (Menu Boot)', inline: true },
          { name: 'Player ID', value: '`' + (playerId || 'n/a') + '`', inline: true },
          { name: 'Session', value: '`' + (sessShort || 'n/a') + '`', inline: true }
        ],
        footer: { text: 'TAG Analytics Engine' },
        timestamp: new Date().toISOString()
      }]
    };

    fetch(NET_TELEMETRY_CONFIG.launchesWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(()=>{});
  }catch(e){}
}

// D. #game-launches: Tracks when a player shares an invite link
let _lastInviteTrackT = 0;
function telemetryTrackInviteShared(roomCode){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled || !NET_TELEMETRY_CONFIG.launchesWebhookUrl) return;
    const now = Date.now();
    if(now - _lastInviteTrackT < 6000) return;
    _lastInviteTrackT = now;
    const code = (roomCode || "").toUpperCase();
    let pName = "A player";
    try{
      const prof = netGetMyProfile();
      if(prof && prof.name) pName = prof.name;
    }catch(e){}

    const payload = {
      username: 'TAG Analytics • Invites',
      avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4e8.png',
      embeds: [{
        title: '💌 Invite Link Shared',
        description: "**" + pName + "** clicked **Invite Friend** and copied the share link for room **`" + code + "`**!",
        color: 0xa855f7,
        fields: [
          { name: 'Sender Name', value: '**' + pName + '**', inline: true },
          { name: 'Room Code', value: '`' + code + '`', inline: true },
          { name: 'Game Portal', value: 'CrazyGames', inline: true }
        ],
        footer: { text: 'TAG Analytics Engine' },
        timestamp: new Date().toISOString()
      }]
    };

    fetch(NET_TELEMETRY_CONFIG.launchesWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(()=>{});
  }catch(e){}
}

// E. #match-sessions: Tracks match completion, duration, player identity, FPS, rage-quits, and outcomes
function telemetryTrackMatchEnded(reason = 'completed'){
  try{
    if(!isOrganicPlay()) return;
    if(!NET_TELEMETRY_CONFIG || !NET_TELEMETRY_CONFIG.enabled || !NET_TELEMETRY_CONFIG.sessionsWebhookUrl) return;
    if(typeof match === "undefined" || !match) return;
    if(typeof NET !== "undefined" && NET && NET.role === "guest") return;
    if(match._telemetrySent) return;
    match._telemetrySent = true;

    const start = match.startTime || (Date.now() - 60000);
    const durationSec = Math.max(1, Math.round((Date.now() - start) / 1000));
    // Filter noise: skip misclick exits under 5 seconds
    if(reason === 'quit' && durationSec < 5) return;

    const durationStr = Math.floor(durationSec / 60) + "m " + (durationSec % 60) + "s";
    const mode = (typeof settings !== 'undefined' && settings && settings.gameMode) ? settings.gameMode.toUpperCase() : 'CLASSIC';

    // 1. Resolve human player's identity (CrazyGames username, localStorage, or Guest name)
    let myName = "Guest";
    try {
      const prof = netGetMyProfile();
      if(prof && prof.name && prof.name !== "Host") myName = prof.name;
      else if(typeof CG !== "undefined" && CG && CG._user && CG._user.name) myName = cleanText(CG._user.name).slice(0, 16);
      else if(typeof CG !== "undefined" && CG && typeof CG.getUser === "function" && CG.getUser() && CG.getUser().username) myName = cleanText(CG.getUser().username).slice(0, 16);
      else {
        const stored = localStorage.getItem("tag_player_name");
        if(stored) myName = cleanText(stored).slice(0, 16);
      }
    } catch(e){}
    if(!myName || myName === "Host") myName = "Guest";

    if(typeof NET !== "undefined" && NET && (!NET.slotsName[0] || NET.slotsName[0] === "Host") && (!NET.isHost || NET.mySlot === 0)){
      NET.slotsName[0] = myName;
    }

    // 2. Rage Quit vs Normal Quit vs Completed Analysis
    const isEarlyQuit = (reason === 'quit');
    const timeSinceTag = (SESSION_METRICS.lastTagT > 0) ? (Date.now() - SESSION_METRICS.lastTagT) : 999999;
    const isRageQuit = (isEarlyQuit && timeSinceTag < 12000 && durationSec >= 5);

    if(isEarlyQuit){
      if(isRageQuit) SESSION_METRICS.rageQuits++;
      else SESSION_METRICS.normalQuits++;
    } else {
      SESSION_METRICS.matchesCompleted++;
    }
    SESSION_METRICS.totalMatchPlaytimeSec += durationSec;

    // 3. Extract roster player names
    const playerNamesList = [];
    if(match.players && match.players.length){
      for(let pi=0; pi<match.players.length; pi++){
        const p = match.players[pi];
        let name = "P" + (pi + 1);
        const isBot = (typeof isBotSlot === "function" && isBotSlot(p));

        if(isBot){
          name = "🤖 Bot " + (pi + 1);
        } else if(typeof NET !== "undefined" && NET && NET.role === "host"){
          if(p.slot === 0){
            name = myName + " (Host)";
          } else if(NET.slotsName && NET.slotsName[p.slot] && NET.slotsName[p.slot] !== "Host"){
            name = NET.slotsName[p.slot];
          } else {
            name = "Guest P" + (pi + 1);
          }
        } else if(menu && (menu.tab === "2p" || menu.tab === "4p")){
          if(pi === 0){
            name = myName + " (P1)";
          } else {
            name = "P" + (pi + 1) + " (Local)";
          }
        } else {
          // 1P Solo vs Bot
          if(pi === 0){
            name = myName;
          } else {
            name = "🤖 Bot " + (pi + 1);
          }
        }
        playerNamesList.push(name);
      }
    }
    const rosterStr = playerNamesList.length ? playerNamesList.join(", ") : myName;

    let matchType = "🤖 Solo vs Bot (" + (SESSION_METRICS.botDifficulty === 'easy' ? '⚡ EASY' : '🔥 HARD') + ")";
    let pingSummary = "N/A (Local)";
    if(typeof NET !== "undefined" && NET && NET.role === "host"){
      matchType = "🌐 Online Multiplayer (" + (match.players ? match.players.length : 2) + " Players)";
      if(NET.pings && NET.pings.size > 0){
        const pingsArr = [...NET.pings.values()];
        const avgPing = Math.round(pingsArr.reduce((a,b)=>a+b, 0) / pingsArr.length);
        pingSummary = avgPing + "ms avg (" + pingsArr.join(", ") + "ms)";
      }
    } else if(menu && (menu.tab === "2p" || menu.tab === "4p")){
      matchType = "👥 Local Split-Screen (" + (match.players ? match.players.length : 2) + " Players)";
    }

    // 4. Human vs Bot Win Detection in Solo
    let isHumanWin = false;
    let isBotWin = false;
    if(menu && menu.tab === 'solo' && !isEarlyQuit){
      if(settings.gameMode === "crown" || settings.gameMode === "bomb"){
        isHumanWin = (match.result && match.result.winner === 0);
        isBotWin = !isHumanWin;
      } else if(settings.gameMode === "infection"){
        const p1 = match.players && match.players[0];
        isHumanWin = match.result && match.result.winningTeam === 'survivors' ? (!p1 || !p1.isInfected) : (!!p1 && !!p1.isInfected);
        isBotWin = !isHumanWin;
      } else if(match.result && match.result.loser != null){
        isHumanWin = (match.result.loser !== 0);
        isBotWin = !isHumanWin;
      }
      if(isHumanWin) SESSION_METRICS.humanWins++;
      else if(isBotWin) SESSION_METRICS.botWins++;
    }

    // 5. Dynamic Color Coding
    let cardColor = 0xf59e0b;
    let outcomeTag = '👑 Match Concluded';
    let titleStr = '🏆 Match Completed';

    if(isRageQuit){
      cardColor = 0xef4444; // Crimson Red
      outcomeTag = '💢 Rage Quit (<12s post-tag)';
      titleStr = '💢 Match Session (Rage Quit)';
    } else if(isEarlyQuit){
      cardColor = 0x64748b; // Slate Gray
      outcomeTag = '🚪 Quit to Menu';
      titleStr = '🚪 Match Session (Quit to Menu)';
    } else if(isHumanWin){
      cardColor = 0x22c55e; // Emerald Green
      outcomeTag = '👑 Human Victory';
    } else if(isBotWin){
      cardColor = 0xf59e0b; // Amber Bot Victory
      outcomeTag = '🤖 Bot Victory';
    }

    let winnerStr = isEarlyQuit ? (myName + " (Quit to Menu)") : "Match Concluded";
    if(!isEarlyQuit){
      if(settings.gameMode === "crown"){
        const wIdx = match.result ? match.result.winner : 0;
        const wName = playerNamesList[wIdx] || ("P" + (wIdx + 1));
        const sc = match.result ? match.result.score : 0;
        winnerStr = wName + " (Crown King - " + sc + " pts)";
      } else if(settings.gameMode === "bomb"){
        const wIdx = match.result ? match.result.winner : 0;
        const wName = playerNamesList[wIdx] || ("P" + (wIdx + 1));
        winnerStr = wName + " (Last Survivor)";
      } else if(settings.gameMode === "infection"){
        winnerStr = (match.result && match.result.winningTeam === "survivors") ? "Survivors" : "Zombies";
      } else if(match.result && match.result.winningTeam != null){
        winnerStr = "Team " + (match.result.winningTeam === 0 ? "RED" : "BLUE");
      } else if(match.result && match.result.loser != null){
        const lIdx = match.result.loser;
        const lName = playerNamesList[lIdx] || ("P" + (lIdx + 1));
        const wIdx = lIdx === 0 ? 1 : 0;
        const wName = playerNamesList[wIdx] || ("P" + (wIdx + 1));
        winnerStr = wName + " (Tagged " + lName + ")";
      }
    }

    const fpsRating = (SESSION_METRICS.avgFps >= 50)
      ? ('⚡ ' + SESSION_METRICS.avgFps + ' FPS (Smooth)')
      : ('⚠️ ' + SESSION_METRICS.avgFps + ' FPS (Low FPS)');

    let sessIdStr = '', playerIdStr = '', devShort = '';
    try{ sessIdStr = (typeof SESSION_METRICS !== 'undefined' && SESSION_METRICS.sessionId) ? SESSION_METRICS.sessionId : ''; }catch(e){}
    try{ playerIdStr = getOrCreatePlayerId(); }catch(e){}
    try{ devShort = (typeof isTouch !== 'undefined' && isTouch) ? 'MOBILE' : 'DESKTOP'; }catch(e){ devShort = ''; }

    const matchHistoryStr = 'Match #' + SESSION_METRICS.matchesStarted + ((typeof CAREER !== 'undefined' && CAREER && CAREER.xp) ? (' • ⭐ Level ' + getCareerLevel(CAREER.xp)) : ' (New Player)');

    const descStr = isRageQuit
      ? ("💢 **" + myName + "** rage-quit " + Math.round(timeSinceTag / 1000) + "s after being tagged (playtime: " + durationStr + ").")
      : (isEarlyQuit
        ? ("**" + myName + "** exited the match early after **" + durationStr + "**.")
        : ("**" + myName + "** finished a **" + mode + "** match in **" + durationStr + "** (Result: " + outcomeTag + ")."));

    const payload = {
      username: 'TAG Analytics • Sessions',
      content: '`' + (playerIdStr || 'n/a') + ' | ' + (sessIdStr || 'n/a') + ' | ' + devShort + ' | ' + mode + ' Map' + (settings.map + 1) + ' | ' + durationStr + ' | ' + (isRageQuit ? 'RAGEQUIT' : (isEarlyQuit ? 'QUIT' : 'COMPLETED')) + '`',
      avatar_url: isRageQuit ? 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4a2.png' : (isEarlyQuit ? 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f6aa.png' : 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3c6.png'),
      embeds: [{
        title: titleStr,
        description: descStr,
        color: cardColor,
        fields: [
          { name: '👤 Active Player', value: '**' + myName + '**', inline: true },
          { name: '🎮 Mode & Map', value: mode + ' (Map #' + (settings.map + 1) + ')', inline: true },
          { name: '🕹️ Match Type', value: matchType, inline: true },
          { name: '⏱️ Playtime Duration', value: durationStr, inline: true },
          { name: '🏆 Outcome / Status', value: '**' + outcomeTag + '**', inline: true },
          { name: '⚡ Performance', value: fpsRating, inline: true },
          { name: '🌟 Player Journey', value: matchHistoryStr, inline: true },
          { name: '🌐 Latency', value: pingSummary, inline: true },
          { name: '👥 Players in Match', value: rosterStr },
          { name: '🆔 Player ID', value: '`' + (playerIdStr || 'n/a') + '`', inline: true },
          { name: '🔗 Session', value: '`' + (sessIdStr || 'n/a') + '`', inline: true }
        ],
        footer: { text: isRageQuit ? 'TAG Analytics • Rage Quit Alert' : (isEarlyQuit ? 'TAG Analytics • Early Exit' : 'TAG Analytics Engine') },
        timestamp: new Date().toISOString()
      }]
    };

    fetch(NET_TELEMETRY_CONFIG.sessionsWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(()=>{});
  }catch(e){}
}

// F. Session Telemetry on Tab Close / Link Exit (Funnel & Total Conversion)
function telemetrySendSessionPing(reason){
  try{
    if(typeof SESSION_METRICS === 'undefined') return;
    const isUnload = (reason === 'unload');
    if(isUnload && SESSION_METRICS.isEnded) return;
    if(isUnload) SESSION_METRICS.isEnded = true;

    try{ updateActiveSessionTime(); }catch(e){}
    const tabLifetimeSec = Math.max(1, Math.round((Date.now() - SESSION_METRICS.startTime) / 1000));
    const activeScreenTimeSec = Math.max(1, Math.min(tabLifetimeSec, Math.round(SESSION_METRICS.activeTimeSec || tabLifetimeSec)));
    let myName = "Guest";
    try { myName = netGetMyProfile().name || "Guest"; } catch(e){}

    let funnelStage = 'Stage 1: Bounced (<15s)';
    if(SESSION_METRICS.matchesStarted >= 5) funnelStage = 'Stage 6: Power Player (5+)';
    else if(SESSION_METRICS.matchesStarted >= 2) funnelStage = 'Stage 5: Retained (2+)';
    else if(SESSION_METRICS.matchesCompleted >= 1) funnelStage = 'Stage 4: Completed Match';
    else if(SESSION_METRICS.matchesStarted >= 1) funnelStage = 'Stage 3: Started Match';
    else if(activeScreenTimeSec >= 15 || tabLifetimeSec >= 15) funnelStage = 'Stage 2: Menu Explorer (>15s)';

    let myPid = '';
    try{ myPid = getOrCreatePlayerId() || ''; }catch(e){}
    let myLvl = 1, myXp = 0;
    try{
      if(typeof CAREER !== 'undefined' && CAREER){
        myXp = CAREER.xp || 0;
        myLvl = (typeof getCareerLevel === 'function') ? getCareerLevel(myXp) : (Math.floor(Math.sqrt(Math.max(0, myXp) / 100)) + 1);
      }
    }catch(e){}

    const sessionPayload = {
      sessionId: SESSION_METRICS.sessionId,
      playerId: myPid,
      level: myLvl,
      xp: myXp,
      playerName: myName,
      tabLifetimeSec: tabLifetimeSec,
      activeScreenTimeSec: activeScreenTimeSec,
      totalMatchPlaytimeSec: SESSION_METRICS.totalMatchPlaytimeSec,
      matchesStarted: SESSION_METRICS.matchesStarted,
      matchesCompleted: SESSION_METRICS.matchesCompleted,
      rageQuits: SESSION_METRICS.rageQuits,
      normalQuits: SESSION_METRICS.normalQuits,
      humanWins: SESSION_METRICS.humanWins,
      botWins: SESSION_METRICS.botWins,
      botDifficulty: SESSION_METRICS.botDifficulty,
      avgFps: SESSION_METRICS.avgFps,
      device: (typeof isTouch !== 'undefined' && isTouch) ? 'Mobile' : 'Desktop',
      funnelStage: funnelStage,
      modesPlayed: SESSION_METRICS.modesPlayed,
      reason: reason || 'heartbeat',
      timestamp: Date.now()
    };

    // 1. Save to local device history for dashboard viewing
    try {
      let localHist = [];
      const raw = localStorage.getItem('tag_analytics_sessions_v1');
      if(raw) localHist = JSON.parse(raw);
      const exIdx = localHist.findIndex(x => x.sessionId === sessionPayload.sessionId);
      if(exIdx !== -1) localHist[exIdx] = sessionPayload;
      else localHist.push(sessionPayload);
      if(localHist.length > 50) localHist.shift();
      localStorage.setItem('tag_analytics_sessions_v1', JSON.stringify(localHist));
    } catch(e){}

    // 2. Transmit to server analytics endpoint
    let serverUrl = 'https://tag-netplay-server.onrender.com';
    try {
      if (typeof location !== 'undefined' && location.hostname && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        serverUrl = location.origin;
      } else if (typeof netDirBase === 'function') {
        serverUrl = netDirBase();
      }
    } catch(e){}
    const jsonStr = JSON.stringify(sessionPayload);
    let sent = false;
    if(isUnload && navigator.sendBeacon){
      try {
        sent = navigator.sendBeacon(serverUrl + '/api/analytics/session', jsonStr);
      } catch(e){
        try {
          sent = navigator.sendBeacon(serverUrl + '/api/analytics/session', new Blob([jsonStr], { type: 'text/plain' }));
        } catch(e2){ sent = false; }
      }
    }
    if(!sent){
      fetch(serverUrl + '/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
        keepalive: true,
        mode: 'cors'
      }).catch(()=>{});
    }
  }catch(e){}
}
function telemetryRecordSessionEnd(){
  telemetrySendSessionPing('unload');
}
setTimeout(() => telemetrySendSessionPing('boot'), 300);
setTimeout(() => telemetrySendSessionPing('boot'), 2000);
setInterval(() => telemetrySendSessionPing('heartbeat'), 30000);

const NET = {
  peer: null,
  conns: new Map(), // peerId -> { rel: conn, fast: conn }
  role: null, // 'host' | 'guest' | null
  room: '',
  myId: '',
  mySlot: -1,
  isHost: false,
  isSpectator: false,
  lobbyLocked: false,
  teamsLocked: false,
  isPublic: true,
  maxPlayers: MAXP,
  myCtrl: 'WASD',
  slotsCtrl: ['WASD', 'WASD', 'WASD', 'WASD', 'WASD', 'WASD', 'WASD', 'WASD', 'WASD', 'WASD'],
  slotsReady: [false, false, false, false, false, false, false, false, false, false],
  slotsName: ['Host', '', '', '', '', '', '', '', '', ''],
  spectators: [], // [{ peerId, name, avatar }]
  pings: new Map(), // peerId -> ms
  peerSlots: new Map(), // peerId -> slot (0..9)
  peerNames: new Map(), // peerId -> name
  peerMutes: new Set(), // peerId (local player mute toggles)
  readyCountdown: null, // number (seconds) or null
  publicRooms: [], // cached list of public rooms from server
  lastRoomFetch: 0,
  heartbeatTimer: null,
  pingTimer: null,
  midgameJoiner: false,
  tick: 0,
  seq: 0,
  hostInputs: new Map(),
  guestPrev: null,
  guestNext: null,
  lastRecvT: 0,
  lastRecvTick: -1,
  last3: [],
  _startLock: 0,
  _pinSrv: false,   // join pinned to the host's reported signaling server (directory/invite link)
  _activeSrv: null, // actual signaling endpoint after peer open: { host, port, path, secure } | { cloud: true }
};

/* Text clean profanity filter for usernames & in-game text chat */
function cleanText(txt){
  if(!txt) return '';
  const badPatterns = /\b(fuck|shit|bitch|asshole|nigger|nigga|cunt|dick|cock|pussy|fag|faggot|whore|slut)\b/gi;
  return String(txt).replace(badPatterns, '***');
}

function getUniqueGuestName(baseName, slot){
  const clean = cleanText(baseName || ('Player ' + (slot + 1))).slice(0, 16);
  if(typeof NET === 'undefined' || !NET || !NET.slotsName) return clean;
  const taken = [];
  for(let s = 0; s < MAXP; s++){
    if(s !== slot && NET.slotsName[s]) taken.push(NET.slotsName[s].toLowerCase().trim());
  }
  if(!taken.includes(clean.toLowerCase().trim())) return clean;
  for(let n = 2; n <= 12; n++){
    const cand = clean.slice(0, 13) + ' ' + n;
    if(!taken.includes(cand.toLowerCase().trim())) return cand;
  }
  return clean.slice(0, 12) + ' P' + (slot + 1);
}

/* Local Player Profile detection via CrazyGames SDK v3 or fallback */
function netGetMyProfile(){
  try {
    if(typeof CG!=='undefined'&&CG&&CG._user&&CG._user.name){
      return { name: cleanText(CG._user.name).slice(0, 16), avatar: CG._user.avatar || '' };
    }
    const cgUser = (typeof CG !== 'undefined' && CG && typeof CG.getUser === 'function') ? CG.getUser() : null;
    if(cgUser && cgUser.username){
      return {
        name: cleanText(cgUser.username).slice(0, 16),
        avatar: cgUser.profilePictureUrl || ''
      };
    }
  } catch(e){}
  let stored = '';
  try { stored = localStorage.getItem('tag_player_name') || ''; } catch(e){}
  if(!stored || stored.startsWith('Player ')){
    const guestItems = [
      'Pancake', 'Falcon', 'Ninja', 'Rocket', 'Pizza', 'Tiger', 'Cookie',
      'Waffle', 'Panda', 'Shadow', 'Donut', 'Wizard', 'Mango', 'Viper',
      'Bubble', 'Lightning', 'Blaster', 'Taco', 'Ghost', 'Phoenix', 'Dragon',
      'Sushi', 'Robot', 'Cheetah', 'Burger', 'Fox', 'Comet', 'Spark'
    ];
    const pick = guestItems[Math.floor(Math.random() * guestItems.length)];
    stored = 'Guest ' + pick;
    try { localStorage.setItem('tag_player_name', stored); } catch(e){}
  }
  return { name: cleanText(stored).slice(0, 16), avatar: '' };
}
function getOrCreatePlayerId(){
  try{
    let pid = localStorage.getItem('tag_player_id_v1') || '';
    if(!pid){
      pid = 'pid_' + Math.random().toString(36).slice(2, 10);
      try{ localStorage.setItem('tag_player_id_v1', pid); }catch(e){}
    }
    return pid;
  }catch(e){ return ''; }
}

/* === INSTITUTIONAL FIREWALL TRAVERSAL: TURNS & STATIC RELAY CONFIG === */
const TURN_STATIC_FALLBACK = [
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:80?transport=tcp'
    ],
    username: 'openrelay',
    credential: 'openrelay'
  }
];

let ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  ...TURN_STATIC_FALLBACK
];

// Static ICE_SERVERS configuration already includes Google STUN, Twilio STUN, and OpenRelay TURN.
// Bypassed remote fetch to avoid 404 missing resource warning.
async function netRefreshIce(){
  return;
}

/* Relay capability probe: the live signaling server may predate the relay
   endpoints (/api/turn, /tag-relay). Entering relay mode against such a
   server hijacks a slow-but-working P2P link into a dead end. */
function netProbeRelayCapable(){
  return new Promise(resolve => {
    try{
      if(NET._relayOk === true || NET._relayOk === false){ resolve(NET._relayOk); return; }
      const base = (typeof netDirBase === 'function' ? netDirBase() : 'https://tag-netplay-server.onrender.com');
      let done = false;
      const fin = (v) => { if(done) return; done = true; try{ NET._relayOk = !!v; }catch(e){} resolve(!!v); };
      const to = setTimeout(() => fin(false), 2500);
      fetch(base + '/api/turn', { cache: 'no-store' }).then(r => { clearTimeout(to); fin(r && r.ok); }).catch(() => { clearTimeout(to); fin(false); });
    }catch(e){ resolve(false); }
  });
}

/* === ZERO-UDP CAMPUS & INSTITUTIONAL FIREWALL RELAY (WSS + HTTP LONG-POLL) === */
const RELAY = { mode: 'p2p', ws: null, pollTimer: null, room: '', pid: '', peerReady: false, deadline: 3500, _t0: 0 };
function netRelayBase(){
  try{
    const b = (typeof netDirBase === 'function' ? netDirBase() : 'https://tag-netplay-server.onrender.com');
    return b.replace(/^http/i, 'ws');
  }catch(e){ return 'wss://tag-netplay-server.onrender.com'; }
}

function netEnterRelay(reason){
  if(RELAY.mode === 'relay') return;
  RELAY.mode = 'relay';
  try{ console.warn('[NET] relay mode (' + reason + ')'); }catch(e){}
  try{ netToast('Direct link blocked — using relay…'); }catch(e){}
  try{
    if(typeof VOICE !== 'undefined'){
      try{
        if(VOICE.enabled && VOICE.localStream){ try{ NET._voiceDisabledByRelay = true; }catch(e){} }
      }catch(e){}
      VOICE.enabled = false;
      try{ if(typeof voiceStopLocal === 'function') voiceStopLocal(); }catch(e){}
      try{
        if(VOICE.localStream){
          for(const tr of VOICE.localStream.getAudioTracks()){ try{ tr.enabled = false; }catch(e){} }
        }
      }catch(e){}
    }
  }catch(e){}
  const base = netRelayBase();
  const openWs = () => {
    try{
      RELAY.ws = new WebSocket(base + '/tag-relay');
      RELAY.ws.onopen = () => {
        try{
          RELAY.ws.send(JSON.stringify({
            t: 'join',
            room: (NET.room || RELAY.room || '').toUpperCase(),
            peerId: NET.myId || RELAY.pid
          }));
        }catch(e){}
      };
      RELAY.ws.onmessage = (ev) => {
        try{
          const m = JSON.parse(ev.data);
          if(!m || !m.from || !m.data) return;
          const fakeConn = {
            peer: m.from,
            open: true,
            send: (d) => netRelaySend(m.from, d)
          };
          netOnData(m.data, fakeConn);
        }catch(e){}
      };
      RELAY.ws.onclose = () => { if(RELAY.mode === 'relay' && typeof NET !== 'undefined' && NET && NET.role !== null) netEnterPolling(); };
      RELAY.ws.onerror = () => {
        try{ if(RELAY.ws) RELAY.ws.close(); }catch(e){}
        netEnterPolling();
      };
    }catch(e){ netEnterPolling(); }
  };
  openWs();
}
function netRestoreVoiceAfterRelay(){
  try{
    if(typeof VOICE === 'undefined') return;
    if(!NET._voiceDisabledByRelay) return;
    if(!VOICE.localStream) { try{ NET._voiceDisabledByRelay = false; }catch(e){} return; }
    VOICE.enabled = true;
    try{
      const wantMute = !!(VOICE.muted || VOICE._proxMuted);
      for(const tr of VOICE.localStream.getAudioTracks()){ try{ tr.enabled = !wantMute; }catch(e){} }
    }catch(e){}
    try{ NET._voiceDisabledByRelay = false; }catch(e){}
    try{ console.warn('[NET] voice restored after relay'); }catch(e){}
    try{ if(typeof voiceSyncAllPeers === 'function') voiceSyncAllPeers(); }catch(e){}
  }catch(e){}
}
function netEnterPolling(){
  if(RELAY.pollTimer || RELAY.mode !== 'relay' || typeof NET === 'undefined' || !NET || NET.role === null) return;
  const base = (typeof netDirBase === 'function' ? netDirBase() : 'https://tag-netplay-server.onrender.com');
  RELAY.pollTimer = setInterval(async () => {
    try{
      const rm = (NET.room || RELAY.room || '').toUpperCase();
      const pid = NET.myId || RELAY.pid || '';
      if(!rm || !pid) return;
      const r = await fetch(base + '/api/relay/poll?room=' + encodeURIComponent(rm) + '&peerId=' + encodeURIComponent(pid));
      if(r.ok){
        const j = await r.json();
        for(const m of (j.msgs || [])){
          if(!m || !m.from || !m.data) continue;
          const fakeConn = {
            peer: m.from,
            open: true,
            send: (d) => netRelaySend(m.from, d)
          };
          netOnData(m.data, fakeConn);
        }
      }
    }catch(e){}
  }, 600);
}

function netRelaySend(to, data){
  const base = (typeof netDirBase === 'function' ? netDirBase() : 'https://tag-netplay-server.onrender.com');
  const rm = (NET.room || RELAY.room || '').toUpperCase();
  const from = NET.myId || RELAY.pid || '';
  if(RELAY.ws && RELAY.ws.readyState === 1){
    try{
      RELAY.ws.send(JSON.stringify({ to: to || '', data }));
      return;
    }catch(e){}
  }
  fetch(base + '/api/relay/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: rm, from, to: to || '', data })
  }).catch(()=>{});
}

function getOrCreateConnPair(peerId){
  let pair = NET.conns.get(peerId);
  if(!pair){
    pair = { rel: null, fast: null };
    NET.conns.set(peerId, pair);
  }
  return pair;
}

function netSendFast(peerOrPair, msg){
  if(typeof RELAY !== 'undefined' && RELAY.mode === 'relay'){
    const pid = (typeof peerOrPair === 'string') ? peerOrPair : (peerOrPair && (peerOrPair.peer || peerOrPair.peerId));
    netRelaySend(pid || NET._hostId || '', msg);
    return;
  }
  const pair = (typeof peerOrPair === 'string') ? NET.conns.get(peerOrPair) : peerOrPair;
  if(!pair) return;
  let c = (pair.fast && pair.fast.open) ? pair.fast : null;
  if(!c) return; // never reroute state onto reliable: HOL blocking + backlog spikes
  if(c){
    try {
      const dc = c.dataChannel || c._dc;
      if(dc && dc.bufferedAmount > 32768) return; // Prevent latency queueing
      c.send(msg);
    } catch(e){}
  }
}

function netSendRel(peerOrPair, msg){
  if(typeof RELAY !== 'undefined' && RELAY.mode === 'relay'){
    const pid = (typeof peerOrPair === 'string') ? peerOrPair : (peerOrPair && (peerOrPair.peer || peerOrPair.peerId));
    netRelaySend(pid || NET._hostId || '', msg);
    return;
  }
  const pair = (typeof peerOrPair === 'string') ? NET.conns.get(peerOrPair) : peerOrPair;
  if(!pair) return;
  const c = (pair.rel && pair.rel.open) ? pair.rel : (pair.fast && pair.fast.open ? pair.fast : (pair.open ? pair : null));
  if(c){
    try{
      const dc = c.dataChannel || c._dc;
      // Critical lobby/match messages bypass the drop cap; loss-tolerant
      // traffic (chat/pings) is shed instead of queueing latency.
      const critical = !!msg && !!msg.t && !!{ assign:1, start:1, midgame_start:1, roster_sync:1, settings:1, spectator_init:1, to_menu:1, kicked:1 }[msg.t];
      if(dc && dc.bufferedAmount > (critical ? 65536 : 16384)) return;
      c.send(msg);
    }catch(e){}
  }
}

function netBroadcastReliable(msg, excludePeerId){
  if(typeof RELAY !== 'undefined' && RELAY.mode === 'relay'){
    netRelaySend('', msg);
    return;
  }
  if(typeof NET === 'undefined' || !NET || !NET.conns) return;
  for(const [pid, pair] of NET.conns.entries()){
    if(excludePeerId && pid === excludePeerId) continue;
    netSendRel(pair, msg);
  }
}

/* Tag claims ride fast triple-send (now/+25ms/+50ms); host dedups by _cid.
   Reliable retransmit delay (50-300ms on loss) is what made tags feel late. */
function netSendClaimTriple(msg){
  try{ NET._claimSeq = (NET._claimSeq || 0) + 1; msg._cid = (NET.myId || 'x') + ':' + NET._claimSeq; }catch(e){}
  let snap = msg;
  try{ snap = Object.assign({}, msg); }catch(e){ snap = msg; }
  const fireFast = () => {
    try{
      if(typeof RELAY !== 'undefined' && RELAY.mode === 'relay'){ try{ netRelaySend(NET._hostId || '', snap); }catch(e){} return; }
      if(typeof NET === 'undefined' || !NET || !NET.conns) return;
      for(const pair of NET.conns.values()){ try{ netSendFast(pair, snap); }catch(e){} }
    }catch(e){}
  };
  fireFast();
  try{ setTimeout(fireFast, 25); }catch(e){}
  try{ setTimeout(fireFast, 50); }catch(e){}
  // Rel safety net: if fast is dead the tag still lands (~120ms late, deduped).
  try{ setTimeout(() => {
    try{
      if(typeof RELAY !== 'undefined' && RELAY.mode === 'relay') return;
      if(typeof NET === 'undefined' || !NET || !NET.conns) return;
      for(const pair of NET.conns.values()){ try{ netSendRel(pair, snap); }catch(e){} }
    }catch(e){}
  }, 120); }catch(e){}
}

/* High-efficiency player state packing: reduces payload by 78% and cuts garbage collection pauses */
function packPlayer(p){
  return {
    s: p.slot,
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
    vx: Math.round(p.vx * 10) / 10,
    vy: Math.round(p.vy * 10) / 10,
    f: p.face || 1,
    sx: Math.round((p.sx || 1) * 100) / 100,
    sy: Math.round((p.sy || 1) * 100) / 100,
    g: p.grounded ? 1 : 0,
    aj: p.airJumps || 0,
    po: p.padOn ? 1 : 0,
    lt: Math.round((p.landT || 0) * 100) / 100,
    tt: Math.round((p.tagT || 0) * 100) / 100,
    b: p.blink > 0 ? 1 : 0,
    el: p.isEliminated ? 1 : 0,
    fz: p.isFrozen ? 1 : 0,
    inf: p.isInfected ? 1 : 0,
    pz: p.isPatientZero ? 1 : 0,
    ls: p.isLoneSurvivor ? 1 : 0,
    cp: (p.crownPoints != null ? p.crownPoints : 0),
    ud: (p.underdogTimer > 0 ? Math.round(p.underdogTimer * 100) / 100 : 0),
    sh: (p.shieldT > 0 ? Math.round(p.shieldT * 100) / 100 : 0),
    rsp: p.isRespawning ? 1 : 0
  };
}

/* Hot-path player packing (50Hz): position + visual state only.
   Mode flags (inf/pz/ls/cp/ud) ride the 2s full snapshot instead.
   Steady-state apply paths skip undefined fields; first-sight creation
   defaults them (false/0) until the first full snapshot lands (<=2s). */
function packPlayerHot(p){
  return {
    s: p.slot,
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
    vx: Math.round(p.vx * 10) / 10,
    vy: Math.round(p.vy * 10) / 10,
    f: p.face || 1,
    sx: Math.round((p.sx || 1) * 100) / 100,
    sy: Math.round((p.sy || 1) * 100) / 100,
    g: p.grounded ? 1 : 0,
    aj: p.airJumps || 0,
    po: p.padOn ? 1 : 0,
    lt: Math.round((p.landT || 0) * 100) / 100,
    tt: Math.round((p.tagT || 0) * 100) / 100,
    b: p.blink > 0 ? 1 : 0,
    el: p.isEliminated ? 1 : 0,
    fz: p.isFrozen ? 1 : 0,
    sh: (p.shieldT > 0 ? Math.round(p.shieldT * 100) / 100 : 0),
    rsp: p.isRespawning ? 1 : 0
  };
}

function unpackPlayer(d){
  return {
    slot: d.s != null ? d.s : d.slot,
    x: d.x,
    y: d.y,
    vx: d.vx,
    vy: d.vy,
    face: d.f != null ? d.f : (d.face || 1),
    sx: d.sx != null ? d.sx : 1,
    sy: d.sy != null ? d.sy : 1,
    grounded: d.g != null ? !!d.g : !!d.grounded,
    airJumps: d.aj != null ? d.aj : (d.airJumps || 0),
    padOn: d.po != null ? !!d.po : !!d.padOn,
    landT: d.lt != null ? d.lt : (d.landT || 0),
    tagT: d.tt != null ? d.tt : (d.tagT || 0),
    blink: d.b != null ? (d.b ? 0.12 : 0) : (d.blink || 0),
    isEliminated: d.el != null ? !!d.el : false,
    isFrozen: d.fz != null ? !!d.fz : false,
    isInfected: d.inf != null ? !!d.inf : (d.isInfected !== undefined ? !!d.isInfected : undefined),
    isPatientZero: d.pz != null ? !!d.pz : (d.isPatientZero !== undefined ? !!d.isPatientZero : undefined),
    isLoneSurvivor: d.ls != null ? !!d.ls : (d.isLoneSurvivor !== undefined ? !!d.isLoneSurvivor : undefined),
    crownPoints: d.cp != null ? d.cp : (d.crownPoints !== undefined ? d.crownPoints : undefined),
    underdogTimer: d.ud != null ? d.ud : (d.underdogTimer !== undefined ? d.underdogTimer : undefined),
    shieldT: d.sh != null ? d.sh : (d.shieldT || 0),
    isRespawning: d.rsp != null ? !!d.rsp : (!!d.isRespawning),
    seq: d.seq || 0
  };
}

/* Authoritative mode envelope (host -> guests): infection/bomb/crown state.
   Guests apply read-only; simulation stays host-authoritative. */
function packModeState(){
  try{
    if(settings.gameMode === 'infection' && typeof infectionState !== 'undefined'){
      return { mode: 'infection', phase: infectionState.phase, lone: infectionState.loneSurvivorSlot };
    }
    if(settings.gameMode === 'bomb' && typeof BOMB_MODE !== 'undefined'){
      const imm = {};
      try{ for(const k in BOMB_MODE.passImmunity) imm[k] = Math.round(BOMB_MODE.passImmunity[k] * 100) / 100; }catch(e){}
      return { mode: 'bomb', carrier: BOMB_MODE.carrierIdx, fuse: Math.round(BOMB_MODE.fuse * 100) / 100,
        maxFuse: BOMB_MODE.maxFuse, imm: imm, round: BOMB_MODE.roundNumber, bstate: BOMB_MODE.state };
    }
    if(settings.gameMode === 'crown' && typeof crownState !== 'undefined'){
      return { mode: 'crown', holder: (crownState.holder ? crownState.holder.slot : -1),
        scores: Object.assign({}, crownState.scores), imm: Math.round(crownState.immunityTimer * 100) / 100,
        hold: Math.round(crownState.holdTimer * 100) / 100,
        ud: crownState.underdogSlot, udT: Math.round(crownState.underdogTimer * 100) / 100 };
    }
    if(settings.gameMode === 'ctf' && typeof ctfState !== 'undefined' && ctfState){
      return {
        mode: 'ctf',
        scores: [ctfState.scores[0], ctfState.scores[1]],
        target: ctfState.targetCaptures,
        flags: ctfState.flags.map(f => ({
          team: f.team,
          state: f.state,
          carrier: (f.carrier && f.carrier.slot != null) ? f.carrier.slot : -1,
          x: Math.round((f.x || 0) * 10) / 10,
          y: Math.round((f.y || 0) * 10) / 10,
          hx: Math.round((f.homeX || 0) * 10) / 10,
          hy: Math.round((f.homeY || 0) * 10) / 10
        })),
        bases: ctfState.bases.map(b => ({
          team: b.team,
          x: Math.round(b.x * 10) / 10,
          y: Math.round(b.y * 10) / 10
        })),
        sd: !!(match && match.isSuddenDeath)
      };
    }
  }catch(e){}
  return null;
}
function applyModeState(env){
  if(!env || !env.mode) return;
  try{
    if(env.mode === 'infection' && typeof infectionState !== 'undefined'){
      if(env.phase != null) infectionState.phase = env.phase;
      if(env.lone != null){
        infectionState.loneSurvivorSlot = env.lone;
        if(match && match.players){
          for(const p of match.players) p.isLoneSurvivor = (p.slot === env.lone);
        }
      }
    } else if(env.mode === 'bomb' && typeof BOMB_MODE !== 'undefined' && BOMB_MODE){
      try{ BOMB_MODE.active = true; }catch(e){}
      try{ if(typeof crownState !== 'undefined' && crownState) crownState.active = false; }catch(e){}
      try{ if(typeof ctfState !== 'undefined' && ctfState) ctfState.active = false; }catch(e){}
      if(env.carrier != null){ BOMB_MODE.carrierIdx = env.carrier; if(match) match.it = env.carrier; }
      if(env.fuse != null){ BOMB_MODE.fuse = env.fuse; }
      if(env.maxFuse != null) BOMB_MODE.maxFuse = env.maxFuse;
      if(env.imm) BOMB_MODE.passImmunity = Object.assign({}, env.imm);
      if(env.round != null) BOMB_MODE.roundNumber = env.round;
      if(env.bstate) BOMB_MODE.state = env.bstate;
      if(match && typeof BOMB_MODE.fuse === 'number') match.timer = BOMB_MODE.fuse;
    } else if(env.mode === 'crown' && typeof crownState !== 'undefined' && crownState){
      try{ crownState.active = true; }catch(e){}
      try{ if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE) BOMB_MODE.active = false; }catch(e){}
      try{ if(typeof ctfState !== 'undefined' && ctfState) ctfState.active = false; }catch(e){}
      if(env.scores) crownState.scores = Object.assign({}, env.scores);
      if(env.imm != null) crownState.immunityTimer = env.imm;
      if(env.hold != null) crownState.holdTimer = env.hold;
      if(env.ud !== undefined) crownState.underdogSlot = env.ud;
      if(env.udT != null) crownState.underdogTimer = env.udT;
      if(env.holder != null && match && match.players){
        const hp = match.players.find(p => p.slot === env.holder) || null;
        crownState.holder = hp;
        crownState.holderIndex = hp ? match.players.indexOf(hp) : -1;
        if(hp && match) match.it = crownState.holderIndex;
        if(hp) hp.crownPoints = (crownState.scores[hp.slot] || 0);
      }
    } else if(env.mode === 'ctf' && typeof ctfState !== 'undefined' && ctfState){
      try{ ctfState.active = true; }catch(e){}
      try{ if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE) BOMB_MODE.active = false; }catch(e){}
      try{ if(typeof crownState !== 'undefined' && crownState) crownState.active = false; }catch(e){}
      if(env.scores && Array.isArray(env.scores)){
        ctfState.scores[0] = env.scores[0] || 0;
        ctfState.scores[1] = env.scores[1] || 0;
      }
      if(env.target != null) ctfState.targetCaptures = env.target;
      if(env.sd != null && match) match.isSuddenDeath = !!env.sd;
      if(env.bases && Array.isArray(env.bases)){
        for(let i = 0; i < env.bases.length; i++){
          const eb = env.bases[i];
          if(!eb) continue;
          if(!ctfState.bases[i]){
            ctfState.bases[i] = { team: eb.team != null ? eb.team : i, x: eb.x, y: eb.y, w: (typeof CTF_CONFIG !== 'undefined' ? CTF_CONFIG.PEDESTAL_W : 68), h: (typeof CTF_CONFIG !== 'undefined' ? CTF_CONFIG.PEDESTAL_H : 14), plat: null };
          } else {
            ctfState.bases[i].x = eb.x;
            ctfState.bases[i].y = eb.y;
          }
        }
      }
      if(env.flags && Array.isArray(env.flags)){
        for(let i = 0; i < env.flags.length; i++){
          const ef = env.flags[i];
          if(!ef) continue;
          const localF = ctfState.flags[i] || (ctfState.flags[i] = { team: ef.team != null ? ef.team : i, state: 'home', carrier: null, x: ef.x, y: ef.y, homeX: ef.hx || ef.x, homeY: ef.hy || ef.y, bobT: 0 });
          localF.state = ef.state || 'home';
          if(ef.hx != null) localF.homeX = ef.hx;
          if(ef.hy != null) localF.homeY = ef.hy;
          if(ef.carrier != null && ef.carrier >= 0 && match && match.players){
            const carrierP = match.players.find(p => p.slot === ef.carrier) || null;
            localF.carrier = carrierP;
            if(carrierP){
              localF.x = carrierP.x + carrierP.w / 2;
              localF.y = carrierP.y + carrierP.h / 2 - 14;
            } else {
              localF.x = ef.x;
              localF.y = ef.y;
            }
          } else {
            localF.carrier = null;
            if(localF.state === 'home'){
              localF.x = localF.homeX;
              localF.y = localF.homeY;
            } else {
              localF.x = ef.x;
              localF.y = ef.y;
            }
          }
        }
      }
    }
  }catch(e){}
}

/* Continuous Predictive Smoothing Filter for Remote Players (Host & Guest) */
const _remoteTargets = new Map(); // slot -> target state

function netUpdateRemoteTarget(slot, data, pCurrent){
  if(slot == null || slot < 0) return;
  let tgt = _remoteTargets.get(slot);
  if(!tgt){
    tgt = {
      targetX: data.x, targetY: data.y, targetVx: data.vx, targetVy: data.vy,
      errX: 0, errY: 0,
      face: data.face || 1, sx: data.sx || 1, sy: data.sy || 1,
      grounded: !!data.grounded, airJumps: data.airJumps || 0,
      padOn: !!data.padOn, landT: data.landT || 0, tagT: data.tagT || 0,
      blink: data.blink || 0, seq: (data.seq != null ? data.seq : 0),
      isInfected: data.isInfected !== undefined ? !!data.isInfected : false,
      isPatientZero: data.isPatientZero !== undefined ? !!data.isPatientZero : false,
      isLoneSurvivor: data.isLoneSurvivor !== undefined ? !!data.isLoneSurvivor : false,
      crownPoints: data.crownPoints !== undefined ? data.crownPoints : 0,
      underdogTimer: data.underdogTimer !== undefined ? data.underdogTimer : 0,
      shieldT: data.shieldT || 0, isRespawning: !!data.isRespawning
    };
    _remoteTargets.set(slot, tgt);
  } else {
    // Drop older out-of-order packets if seq is positive
    if(data.seq != null && tgt.seq != null && data.seq > 0 && tgt.seq > 0 && data.seq < tgt.seq) return;
    if(data.seq != null && data.seq > 0) tgt.seq = data.seq;

    // Calculate error between where player visually was and new target
    if(pCurrent){
      const rawDx = pCurrent.x - data.x;
      const rawDy = pCurrent.y - data.y;
      // Warp / teleport / respawn > 240px: snap instantly without error bleed
      if(data.isRespawning || rawDx * rawDx + rawDy * rawDy > 57600){
        pCurrent.x = data.x;
        pCurrent.y = data.y;
        tgt.errX = 0;
        tgt.errY = 0;
      } else {
        tgt.errX = rawDx;
        tgt.errY = data.grounded ? 0 : rawDy;
      }
    } else {
      tgt.errX = 0;
      tgt.errY = 0;
    }

    tgt.targetX = data.x;
    tgt.targetY = data.y;
    tgt.targetVx = data.vx;
    tgt.targetVy = data.vy;
    tgt.face = data.face != null ? data.face : tgt.face;
    tgt.sx = data.sx != null ? data.sx : 1;
    tgt.sy = data.sy != null ? data.sy : 1;
    tgt.grounded = !!data.grounded;
    tgt.airJumps = data.airJumps != null ? data.airJumps : tgt.airJumps;
    tgt.padOn = !!data.padOn;
    tgt.landT = data.landT != null ? data.landT : tgt.landT;
    tgt.tagT = data.tagT != null ? data.tagT : tgt.tagT;
    tgt.blink = data.blink != null ? data.blink : tgt.blink;
    if(data.isInfected !== undefined) tgt.isInfected = !!data.isInfected;
    if(data.isPatientZero !== undefined) tgt.isPatientZero = !!data.isPatientZero;
    if(data.isLoneSurvivor !== undefined) tgt.isLoneSurvivor = !!data.isLoneSurvivor;
    if(data.crownPoints !== undefined) tgt.crownPoints = data.crownPoints || 0;
    if(data.underdogTimer !== undefined) tgt.underdogTimer = data.underdogTimer || 0;
    if(data.shieldT !== undefined) tgt.shieldT = data.shieldT || 0;
    if(data.isRespawning !== undefined) tgt.isRespawning = !!data.isRespawning;
  }
}

function netApplyRemoteTarget(p, dt){
  const tgt = _remoteTargets.get(p.slot);
  if(!tgt) return;

  // Advance authoritative target along velocity vector between packets
  tgt.targetX += tgt.targetVx * dt;
  if(!tgt.grounded){
    tgt.targetY += tgt.targetVy * dt;
  }

  // Smooth exponential decay of error offset (half-life ~40ms: eliminates all micro-stutters and backward snapping)
  const decay = Math.exp(-dt * 18);
  tgt.errX *= decay;
  tgt.errY *= decay;

  // Visual position combines extrapolated target + smoothly decaying error offset
  p.x = tgt.targetX + tgt.errX;
  if(tgt.grounded){
    p.y = tgt.targetY;
    p.grounded = true;
    p.vy = 0;
  } else {
    p.y = tgt.targetY + tgt.errY;
    p.grounded = false;
    p.vy = tgt.targetVy;
  }
  p.vx = tgt.targetVx;

  p.face = tgt.face;
  p.sx += ((tgt.sx || 1) - p.sx) * Math.min(1, dt * 20);
  p.sy += ((tgt.sy || 1) - p.sy) * Math.min(1, dt * 20);
  p.landT = tgt.landT;
  p.tagT = tgt.tagT;
  p.padOn = tgt.padOn;
  p.blink = tgt.blink;
  p.airJumps = tgt.airJumps;
  p.isInfected = !!tgt.isInfected;
  p.isPatientZero = !!tgt.isPatientZero;
  p.isLoneSurvivor = !!tgt.isLoneSurvivor;
  if(tgt.crownPoints != null) p.crownPoints = tgt.crownPoints;
  if(tgt.underdogTimer != null) p.underdogTimer = tgt.underdogTimer;
  if(tgt.shieldT !== undefined) p.shieldT = tgt.shieldT;
  if(tgt.isRespawning !== undefined) p.isRespawning = tgt.isRespawning;

  // Ghost trail FX for remote sprinting player (capped at 2: remotes don't need full trails)
  if(p.trail){
    for(let tr of p.trail) tr.alpha -= dt * 1.8;
    if(Math.abs(p.vx) > 300 || p.padOn){
      p.trail.unshift({ x: p.x, y: p.y, alpha: 0.45 });
      if(p.trail.length > 2) p.trail.pop();
    } else if(p.trail.length > 0){
      p.trail.pop();
    }
  }

  // Visual de-clip: a remote ghost must never RENDER inside a solid platform
  // (extrapolation overshoot). Visual-only: authoritative state untouched.
  // Pink drop-throughs and slopes excluded — passing through those is legal.
  // Skipped off-screen for free.
  try{
    if(typeof SOLIDS !== 'undefined' && SOLIDS && p && p.w && typeof cam !== 'undefined' && cam){
      const vs = 1 / (cam.s || 1);
      const vx0 = cam.x - CW * vs / 2 - 60, vx1 = cam.x + CW * vs / 2 + 60;
      const vy0 = cam.y - CH * vs / 2 - 60, vy1 = cam.y + CH * vs / 2 + 60;
      if(p.x + p.w >= vx0 && p.x <= vx1 && p.y + p.h >= vy0 && p.y <= vy1){
        for(const s of SOLIDS){
          if(!s || s.t === 'drop' || s.dy) continue;
          if(p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y){
            const dx1 = (s.x + s.w) - p.x, dx0 = (p.x + p.w) - s.x;
            const dy1 = (s.y + s.h) - p.y, dy0 = (p.y + p.h) - s.y;
            if(Math.min(dx1, dx0) < Math.min(dy1, dy0)){ p.x += (dx1 < dx0) ? Math.min(dx1, dx0) : -Math.min(dx1, dx0); }
            else { p.y += (dy1 < dy0) ? Math.min(dy1, dy0) : -Math.min(dy1, dy0); }
          }
        }
      }
    }
  }catch(e){}
}

/* ================= proximity voice chat (WebRTC + HTML5 Audio + Web Audio API) ================= */
const VOICE = {
  enabled: false,
  muted: false,
  localStream: null,
  analyser: null,
  analyserData: null,
  speaking: false,
  peers: new Map(), // peerId -> { call, stream, audioEl, source, analyser, analyserData, speaking, remoteMuted }
  supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
};

async function voiceInit(){
  if(!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'){
    netToast('Mic requires HTTPS! Local HTTP blocks microphone.');
    return false;
  }
  if(!VOICE.supported){
    netToast('Voice chat not supported on this browser');
    return false;
  }
  initAudio();
  if(AC && AC.state === 'suspended') AC.resume().catch(()=>{});

  if(VOICE.localStream){
    VOICE.enabled = true;
    VOICE.muted = false;
    for(const track of VOICE.localStream.getAudioTracks()){ track.enabled = true; }
    netBroadcastReliable({ t: 'voice_mute', slot: NET.mySlot, peerId: NET.myId, muted: false });
    netToast('Microphone unmuted 🎙️');
    voiceSyncAllPeers();
    return true;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        googEchoCancellation: { ideal: true },
        googAutoGainControl: { ideal: true },
        googNoiseSuppression: { ideal: true },
        googHighpassFilter: { ideal: true },
        googTypingNoiseDetection: { ideal: true }
      },
      video: false
    });
    VOICE.localStream = stream;
    VOICE.enabled = true;
    VOICE.muted = false;

    if(AC){
      try {
        const src = AC.createMediaStreamSource(stream);
        const ana = AC.createAnalyser();
        ana.fftSize = 128;
        src.connect(ana);
        VOICE.analyser = ana;
        VOICE.analyserData = new Uint8Array(ana.frequencyBinCount);
      } catch(e){}
    }

    netToast('Voice chat active! 🎙️');
    voiceSyncAllPeers();
    return true;
  } catch(err){
    console.warn('Microphone permission error:', err);
    netToast('Microphone access denied or unavailable');
    return false;
  }
}

function boostAudioSender(pc){
  if(!pc || !pc.getSenders) return;
  try {
    const senders = pc.getSenders();
    for(const sender of senders){
      if(sender.track && sender.track.kind === 'audio'){
        const params = sender.getParameters();
        if(params){
          if(!params.encodings || params.encodings.length === 0){
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 96000; // 96 kbps high-definition Opus
          params.encodings[0].priority = 'high';
          params.encodings[0].networkPriority = 'high';
          sender.setParameters(params).catch(()=>{});
        }
      }
    }
  } catch(e){}
}

function voiceToggleMic(){
  try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled){netToast('Chat is disabled on this portal');return;}}catch(e){}
  if(!VOICE.localStream || !VOICE.enabled){
    voiceInit();
    return;
  }
  VOICE.muted = !VOICE.muted;
  for(const track of VOICE.localStream.getAudioTracks()){
    track.enabled = !VOICE.muted && !VOICE._proxMuted; // respect proximity send-gate (no 1-frame blip)
  }
  if(VOICE.muted){
    VOICE.speaking = false;
  }
  netBroadcastReliable({ t: 'voice_mute', slot: NET.mySlot, peerId: NET.myId, muted: VOICE.muted });
  netToast(VOICE.muted ? 'Microphone muted 🔇' : 'Microphone unmuted 🎙️');
  sfx('ui');
}

function voiceCallPeer(peerId, forceNew){
  if(!NET.peer || !peerId || peerId === NET.myId || !VOICE.localStream) return;
  const existing = VOICE.peers.get(peerId);
  // If we already have an active open call with remote audio stream playing, don't recreate it unless forced
  if(existing && existing.call && existing.call.open && existing.stream && !forceNew){
    return;
  }
  // Prevent duplicate concurrent outgoing calls to the same peer
  if(existing && existing._calling) return;

  if(!existing){
    VOICE.peers.set(peerId, {
      call: null,
      stream: null,
      audioEl: null,
      source: null,
      analyser: null,
      analyserData: null,
      speaking: false,
      remoteMuted: false,
      _calling: true
    });
  } else {
    existing._calling = true;
  }

  try {
    const call = NET.peer.call(peerId, VOICE.localStream);
    if(call) voiceWireCall(call);
  } catch(e){
    const ent = VOICE.peers.get(peerId);
    if(ent) ent._calling = false;
  }
}

function voiceSyncAllPeers(){
  try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled)return;}catch(e){}
  if(!NET.peer || !VOICE.localStream) return;
  // If Host: initiate calls to all guests who don't have an active call
  if(NET.isHost){
    for(const peerId of NET.conns.keys()){
      voiceCallPeer(peerId, false);
    }
  } else {
    // If Guest: notify Host that our mic is ready so Host can call us (avoids glare/dual-calling)
    netBroadcastReliable({ t: 'voice_req', peerId: NET.myId, hasStream: true });
  }
}

function voiceWireCall(call){
  const peerId = call.peer;
  let entry = VOICE.peers.get(peerId);
  const prevCall = (entry && entry.call && entry.call !== call) ? entry.call : null;

  if(!entry){
    entry = {
      call: call,
      stream: null,
      audioEl: null,
      source: null,
      analyser: null,
      analyserData: null,
      speaking: false,
      remoteMuted: false,
      _calling: false
    };
    VOICE.peers.set(peerId, entry);
  } else {
    entry.call = call;
    entry._calling = false;
  }

  // Safely close previous call without nuking the active entry
  if(prevCall){
    try { prevCall.close(); } catch(e){}
  }

  const applyBoost = () => {
    if(call.peerConnection) boostAudioSender(call.peerConnection);
  };
  call.on('open', () => {
    entry._calling = false;
    applyBoost();
  });
  setTimeout(applyBoost, 400);

  call.on('stream', remoteStream => {
    const current = VOICE.peers.get(peerId);
    if(!current || (current.call && current.call !== call)) return;
    current.stream = remoteStream;

    // Reuse existing audio element if already created, or create one
    if(!current.audioEl){
      const el = document.createElement('audio');
      el.autoplay = true;
      el.playsInline = true;
      el.style.display = 'none';
      document.body.appendChild(el);
      current.audioEl = el;
    }
    current.audioEl.srcObject = remoteStream;
    current.audioEl.volume = 0.85;
    const playP = current.audioEl.play();
    if(playP && playP.catch) playP.catch(() => {});

    // Analyser setup for visual speaking indicator
    initAudio();
    if(AC){
      try {
        if(AC.state === 'suspended') AC.resume().catch(()=>{});
        if(current.source){ try{ current.source.disconnect(); }catch(e){} }
        const source = AC.createMediaStreamSource(remoteStream);
        const ana = AC.createAnalyser();
        ana.fftSize = 128;
        source.connect(ana);
        current.source = source;
        current.analyser = ana;
        current.analyserData = new Uint8Array(ana.frequencyBinCount);
      } catch(err){
        console.warn('WebAudio analyser setup error:', err);
      }
    }
  });

  call.on('close', () => {
    // CRITICAL FIX: Only clean up if this closed call is ACTUALLY the active call for this peer!
    const current = VOICE.peers.get(peerId);
    if(current && current.call === call){
      if(current.audioEl){
        try{ current.audioEl.pause(); current.audioEl.srcObject = null; current.audioEl.remove(); }catch(e){}
        current.audioEl = null;
      }
      if(current.source){ try{ current.source.disconnect(); }catch(e){} }
      VOICE.peers.delete(peerId);
    }
  });

  call.on('error', e => {
    const current = VOICE.peers.get(peerId);
    if(current && current.call === call) current._calling = false;
  });
}

function updateVoiceProximity(dt){
  // 10Hz is plenty for ears: volume ladders, FFT speaking flags and the mic
  // gate don't need per-frame recompute (this was FFT + finds x peers @60Hz).
  NET._voiceT = (NET._voiceT || 0) + (dt || 0.016);
  if(NET._voiceT < 0.1) return;
  NET._voiceDT = NET._voiceT; NET._voiceT = 0;
  const inGame = (match && screen === 'game' && match.players && match.players.length > 0);
  const isPlaying = (inGame && match.state === 'playing');
  let myP = null;
  if(inGame){
    if(typeof getMyPlayer === 'function') myP = getMyPlayer();
    if(!myP && NET.mySlot >= 0) myP = match.players.find(p => p.slot === NET.mySlot);
    if(!myP) myP = match.players[0];
  }
  const myPos = myP ? { x: myP.x, y: myP.y } : null;

  let nearestPeerDist = Infinity; // for send-side mic gating below
  for(const [peerId, entry] of VOICE.peers.entries()){
    const isMutedByMe = NET.peerMutes && NET.peerMutes.has(peerId);
    let targetVol = isMutedByMe ? 0 : 0.85; // Default clear volume for menu, lobby, countdown, results

    if(isPlaying && myPos && !isMutedByMe){
      let targetSlot = NET.peerSlots ? NET.peerSlots.get(peerId) : undefined;
      if(targetSlot === undefined){
        if(!NET.isHost && (typeof netIsHostPeerId==='function'?netIsHostPeerId(peerId):String(peerId||'').endsWith('-host'))) targetSlot = 0;
        else if(NET.isHost){
          for(let s = 1; s < (NET.maxPlayers || MAXP); s++){
            const ent = NET.hostInputs.get(s);
            if(ent && ent.owner === peerId){ targetSlot = s; break; }
          }
        }
      }

      const targetP = (targetSlot != null && targetSlot !== NET.mySlot)
        ? match.players.find(p => p.slot === targetSlot)
        : (NET.isHost ? null : match.players.find(p => p.slot === 0));

      if(targetP && myPos && targetP.x != null && myPos.x != null){
        const dx = targetP.x - myPos.x;
        const dy = targetP.y - myPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < nearestPeerDist) nearestPeerDist = dist;

        // Real-life stepped proximity: distinct audible cuts as distance changes,
        // updating every frame while chasing. Generally hearable until pretty far.
        // Near (<= 350px): full volume. Beyond 1300px: muted (matches mic gate).
        const closeRadius = 350;
        const maxDist = 1300;
        if(isNaN(dist) || dist <= closeRadius){
          targetVol = 1.0;
        } else if(dist < 550){
          targetVol = 0.75;
        } else if(dist < 750){
          targetVol = 0.5;
        } else if(dist < 950){
          targetVol = 0.3;
        } else if(dist < 1150){
          targetVol = 0.15;
        } else if(dist < maxDist){
          targetVol = 0.05;
        } else {
          targetVol = 0.0;
        }
      }
    }

    // Direct HTML5 Audio volume control & continuous playback watchdog
    if(entry.audioEl){
      try {
        const curV = entry.audioEl.volume;
        const nextV = curV + (targetVol - curV) * Math.min(1, (NET._voiceDT || 0.1) * 14);
        entry.audioEl.volume = isMutedByMe ? 0 : clamp(nextV, 0, 1.0);
        if(entry.audioEl.paused && entry.audioEl.srcObject && !isMutedByMe){
          entry.audioEl.play().catch(()=>{});
        }
      } catch(e){}
    }

    if(entry.analyser && entry.analyserData){
      if(entry.remoteMuted || isMutedByMe){
        entry.speaking = false;
      } else {
        entry.analyser.getByteFrequencyData(entry.analyserData);
        let sum = 0;
        for(let i = 0; i < entry.analyserData.length; i++) sum += entry.analyserData[i];
        entry.speaking = (sum / entry.analyserData.length) > 13;
      }
    }
  }

  // Send-side bandwidth gate: while playing and NOBODY is within earshot,
  // stop sending mic audio so the uplink serves game traffic. Restores instantly.
  // Hysteresis band (mute past 1300px, back on inside 1100px) stops the mic from
  // rapidly cutting in/out when hovering at the edge — the nearby cutoff cause.
  // Lobby/menu unaffected (people talk there). Never overrides user mute.
  try{
    let wantProxMute = false;
    if(isPlaying && myPos && VOICE.peers.size > 0){
      if(VOICE._proxMuted) wantProxMute = !(nearestPeerDist <= 1100);
      else wantProxMute = nearestPeerDist >= 1300;
    }
    if(wantProxMute !== !!VOICE._proxMuted){
      VOICE._proxMuted = wantProxMute;
      if(VOICE.localStream){
        for(const track of VOICE.localStream.getAudioTracks()){ track.enabled = !VOICE.muted && !wantProxMute; }
      }
    } else if(!wantProxMute && VOICE.localStream){
      // keep user-mute state authoritative when gate is open
      for(const track of VOICE.localStream.getAudioTracks()){ if(track.enabled === !!VOICE.muted) track.enabled = !VOICE.muted; }
    }
  }catch(eGate){}

  if(VOICE.analyser && VOICE.analyserData && !VOICE.muted && VOICE.enabled){
    VOICE.analyser.getByteFrequencyData(VOICE.analyserData);
    let sum = 0;
    for(let i = 0; i < VOICE.analyserData.length; i++) sum += VOICE.analyserData[i];
    VOICE.speaking = (sum / VOICE.analyserData.length) > 13;
  } else {
    VOICE.speaking = false;
  }
  // Cached speaking-slot set so drawPlayers doesn't re-scan voice peers per player.
  try{
    const ss = NET._speakingSlots || (NET._speakingSlots = new Set());
    ss.clear();
    for(const [pid, entry] of VOICE.peers.entries()){
      if(!entry.speaking || entry.remoteMuted) continue;
      if(NET.peerMutes && NET.peerMutes.has(pid)) continue;
      const sl = NET.peerSlots ? NET.peerSlots.get(pid) : undefined;
      if(sl != null) ss.add(sl);
    }
    if(VOICE.speaking && NET.mySlot >= 0) ss.add(NET.mySlot);
    NET._speakingT = performance.now();
  }catch(e){}
}

function isPlayerSpeaking(slot){
  if(!match) return false;
  if(slot === NET.mySlot){
    return !!VOICE.speaking;
  }
  try{
    if(NET._speakingSlots && (performance.now() - (NET._speakingT || 0)) < 300){
      return NET._speakingSlots.has(slot);
    }
  }catch(e){}
  for(const [peerId, entry] of VOICE.peers.entries()){
    const isMutedByMe = NET.peerMutes && NET.peerMutes.has(peerId);
    if(entry.speaking && !entry.remoteMuted && !isMutedByMe){
      let pSlot = NET.peerSlots ? NET.peerSlots.get(peerId) : undefined;
      if(pSlot === undefined){
        if(!NET.isHost && (typeof netIsHostPeerId==='function'?netIsHostPeerId(peerId):String(peerId||'').endsWith('-host'))) pSlot = 0;
        else if(NET.isHost){
          for(let s = 1; s < (NET.maxPlayers || MAXP); s++){
            const ent = NET.hostInputs.get(s);
            if(ent && ent.owner === peerId){ pSlot = s; break; }
          }
        }
      }
      if(pSlot === slot) return true;
    }
  }
  return false;
}

function voiceEnsurePlayback(){
  if(AC && AC.state === 'suspended') AC.resume().catch(()=>{});
  for(const entry of VOICE.peers.values()){
    if(entry.audioEl && entry.audioEl.paused && entry.audioEl.srcObject){
      entry.audioEl.play().catch(()=>{});
    }
  }
}
window.addEventListener('click', voiceEnsurePlayback, { passive: true });
window.addEventListener('keydown', voiceEnsurePlayback, { passive: true });

// Auto-healing watchdog: ensures active voice calls stay connected across match restarts and screen changes
setInterval(() => {
  if(typeof NET === 'undefined' || !NET || NET.role === null || !NET.peer || NET.peer.destroyed) return;
  if(typeof VOICE === 'undefined' || !VOICE.enabled || !VOICE.localStream) return;
  try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled)return;}catch(e){}
  for(const peerId of NET.conns.keys()){
    const ent = VOICE.peers.get(peerId);
    if(!ent || !ent.call || !ent.call.open || !ent.stream){
      if(NET.isHost){
        voiceCallPeer(peerId, false);
      } else {
        netSendRel(peerId, { t: 'voice_req', peerId: NET.myId, hasStream: true });
      }
    }
  }
}, 2500);

function netToast(m){
  toast(m);
  const t = document.getElementById('netToast');
  if(!t) return;
  t.textContent = m;
  t.style.display = 'block';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.display = 'none'; }, 2800);
}

function netShow(on){
  const el = document.getElementById('netUI');
  if(el) el.classList.toggle('on', !!on);
}

function netLink(room){
  const code = (room || '').toUpperCase();
  // Pin the invite to our signaling server so host+guest never split brain.
  let srvQ = '';
  try{
    srvQ = ((NET && NET._srv && NET._srv.host) || ((typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || '') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    if(!/^[A-Za-z0-9.\-:]+$/.test(srvQ)) srvQ = '';
  }catch(e){ srvQ = ''; }
  let invitedBy = 'YS0WTkyqWaOxDpfJWLEv7hRzkJ73';
  try{
    if(typeof CG !== 'undefined' && CG && CG._user && (CG._user.id || CG._user.userId)){
      invitedBy = CG._user.id || CG._user.userId;
    }
  }catch(e){}

  const isCrazyHost = (typeof location !== 'undefined' && location.host && location.host.indexOf('crazygames') >= 0);
  const isLocalOrFile = (typeof location === 'undefined' || !location.origin || location.origin.startsWith('file:') || location.origin.includes('localhost') || location.origin.includes('127.0.0.1'));
  
  if(isCrazyHost || isLocalOrFile){
    return 'https://www.crazygames.com/game/tag-arena-multiplayer?czy_invite=true&utm_source=invite&czy_invited_by=' + encodeURIComponent(invitedBy) + '&room=' + encodeURIComponent(code) + '&roomId=' + encodeURIComponent(code) + (srvQ ? ('&srv=' + encodeURIComponent(srvQ)) : '');
  }

  let p = location.pathname;
  if(p.endsWith('/')) p = p + 'index.html';
  else if(/\/[^\/]+\.[a-z]+$/i.test(p)) p = p.replace(/\/[^\/]*$/, '/');
  else p = p + '/';
  return location.origin + p + '?room=' + code + (srvQ ? ('&srv=' + encodeURIComponent(srvQ)) : '');
}

/* Copy the portal invite link when available, else the ?room= fallback link */
function netCopyInviteToClipboard(doneMsg){
  const msg = doneMsg || 'Invite link copied! Share with your friend.';
  const fallback = () => {
    try{
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(netLink(NET.room)).catch(()=>{});
      try{ telemetryTrackInviteShared(NET.room); }catch(e){}
      netToast(msg);
    }catch(e){}
  };
  try{
    if(typeof CG!=='undefined'&&CG&&typeof CG.getInviteLink==='function'&&NET&&NET.room){
      CG.getInviteLink(NET.room).then(sdkLink=>{
        let l = sdkLink;
        if(l && typeof l !== 'string'){ try{ l = String(l); }catch(e){ l = null; } }
        try{if(l&&l.indexOf('game-files.crazygames.com')>=0) l=l.replace(/\/\?room=/,'/index.html?room=');}catch(e){}
        if(!l){ fallback(); return; }
        try{
          if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(()=>netToast(msg)).catch(()=>prompt('Copy invite link:', l));
          else prompt('Copy invite link:', l);
        }catch(e){ fallback(); }
      }).catch(fallback);
      return;
    }
  }catch(e){}
  fallback();
}

async function netCopyLink(){
  let l = null;
  try{
    if(typeof CG!=='undefined'&&CG&&typeof CG.getInviteLink==='function'&&NET&&NET.room){
      l = await CG.getInviteLink(NET.room);
      if(l && typeof l !== 'string'){ try{ l = String(l); }catch(e){ l = null; } }
    }
  }catch(e){ l = null; }
  if(!l) l = netLink(NET.room);
  try{if(l&&l.indexOf('game-files.crazygames.com')>=0) l=l.replace(/\/\?room=/,'/index.html?room=');}catch(e){}
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(l).then(() => { netToast('Invite link copied! Send it to your friend.'); try{ telemetryTrackInviteShared(NET.room); }catch(e){} }).catch(() => prompt('Copy invite link:', l));
  } else {
    prompt('Copy invite link:', l);
  }
}

function netMakeCode(){
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0; i<6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

/* Sample controls based on player's chosen scheme */
function sampleControls(scheme){
  let dir = 0, jumpEdge = false, jumpHeld = false, downHeld = false;
  if(scheme === 'WASD'){
    const L = keys.has('KeyA') || keys.has('KeyQ');
    const R = keys.has('KeyD');
    dir = (R ? 1 : 0) - (L ? 1 : 0);
    jumpEdge = pressed.has('KeyW') || pressed.has('Space');
    jumpHeld = keys.has('KeyW') || keys.has('Space');
    downHeld = keys.has('KeyS');
  } else if(scheme === 'Arrows'){
    const L = keys.has('ArrowLeft');
    const R = keys.has('ArrowRight');
    dir = (R ? 1 : 0) - (L ? 1 : 0);
    jumpEdge = pressed.has('ArrowUp') || pressed.has('Space');
    jumpHeld = keys.has('ArrowUp') || keys.has('Space');
    downHeld = keys.has('ArrowDown');
  } else if(scheme === 'IJKL'){
    const L = keys.has('KeyJ');
    const R = keys.has('KeyL');
    dir = (R ? 1 : 0) - (L ? 1 : 0);
    jumpEdge = pressed.has('KeyI');
    jumpHeld = keys.has('KeyI');
    downHeld = keys.has('KeyK');
  } else if(scheme === 'TFGH'){
    const L = keys.has('KeyF');
    const R = keys.has('KeyH');
    dir = (R ? 1 : 0) - (L ? 1 : 0);
    jumpEdge = pressed.has('KeyT');
    jumpHeld = keys.has('KeyT');
    downHeld = keys.has('KeyG');
  } else if(scheme === 'Controller'){
    for(let pi=0; pi<4; pi++){
      const pd = PAD[pi];
      if(pd && pd.connected){
        dir = (pd.right ? 1 : 0) - (pd.left ? 1 : 0);
        jumpEdge = pd.jumpE;
        jumpHeld = pd.jumpHeld;
        downHeld = pd.dropHeld;
        break;
      }
    }
  }
  // Allow connected controller to drive any scheme seamlessly
  for(let pi=0; pi<4; pi++){
    const pd = PAD[pi];
    if(pd && pd.connected){
      if(pd.left) dir = -1;
      if(pd.right) dir = 1;
      if(pd.jumpE) jumpEdge = true;
      if(pd.jumpHeld) jumpHeld = true;
      if(pd.dropHeld) downHeld = true;
      break;
    }
  }
  // Mobile / Tablet on-screen touch controls
  if(TOUCH.left) dir = -1;
  if(TOUCH.right) dir = 1;
  if(TOUCH.jumpEdge) jumpEdge = true;
  if(TOUCH.jumpHeld) jumpHeld = true;
  if(TOUCH.downHeld) downHeld = true;

  return { dir: clamp(dir, -1, 1), jumpEdge: !!jumpEdge, jumpHeld: !!jumpHeld, downHeld: !!downHeld };
}

/* Input shim: host runs local input for slot 0 (or its own slot); guest inputs are buffered */
const _inputFor = inputFor;
function inputForNet(p,dt){
  if(NET.role !== null){
    if(NET.isHost){
      const slot = p.slot;
      if(isBotSlot(p)){
        return botInputFor(p, dt);
      }
      if(!NET.isSpectator && NET.mySlot >= 0 && slot === NET.mySlot){
        return sampleControls(NET.myCtrl || 'WASD');
      }
      const ext = NET.hostInputs.get(slot);
      if(ext){
        let edge = false;
        if(ext.jumpQueue > 0){
          ext.jumpQueue--;
          edge = true;
        } else if(ext.consumeEdge){
          ext.consumeEdge = false;
          edge = true;
        }
        return { dir: clamp(ext.dir, -1, 1), jumpEdge: edge, jumpHeld: !!ext.jumpHeld, downHeld: !!ext.downHeld };
      }
      return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
    } else {
      if(p.slot === NET.mySlot){
        return NET.myCurrentInput || sampleControls(NET.myCtrl || 'WASD');
      }
      return { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false };
    }
  }
  return _inputFor(p,dt);
}
inputFor = inputForNet;

/* Host peer-id helpers: host ids are deterministic 'tag-<room>-host'; guests resolve via directory (netFetchHostPeerId) or hint; legacy ?h= suffix ignored */
function netMakeSuffix(n){
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0; i<(n||4); i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
function netHostIdPrefix(room){
  const r = String(room != null ? room : (typeof NET!=='undefined'&&NET?NET.room:'')) .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  return 'tag-' + r + '-host';
}
function netIsHostPeerId(peerId){
  try{
    if(!peerId) return false;
    if(typeof NET!=='undefined'&&NET&&NET._hostId&&peerId===NET._hostId) return true;
    const pfx = netHostIdPrefix();
    if(peerId===pfx) return true;
    if(peerId.indexOf(pfx + '-')===0) return true;
    if(typeof NET!=='undefined'&&NET&&NET.peerSlots&&NET.peerSlots.get(peerId)===0) return true;
  }catch(e){}
  return false;
}
/* Look up the host's full randomized peer id from the signaling directory */
function netFetchHostPeerId(roomCode){
  return new Promise(resolve=>{
    try{
      const serverUrl = netDirBase();
      let ctrl = null;
      try{ if(typeof AbortController!=='undefined') ctrl = new AbortController(); }catch(e){ ctrl = null; }
      const opts = {};
      if(ctrl) opts.signal = ctrl.signal;
      const to = setTimeout(()=>{ try{ if(ctrl) ctrl.abort(); }catch(e){} resolve(''); }, 2200);
      fetch(serverUrl + '/api/rooms', opts).then(res=>{
        if(!res || !res.ok) throw 0;
        return res.json();
      }).then(data=>{
        clearTimeout(to);
        let hid = '';
        try{
          const rooms = (data && data.rooms) || [];
          const want = String(roomCode || '').toUpperCase();
          for(const rm of rooms){
            if(rm && String(rm.roomId || '').toUpperCase()===want && (rm.hostPeerId || rm.hostId)){ hid = rm.hostPeerId || rm.hostId; break; }
          }
        }catch(e){}
        resolve(hid || '');
      }).catch(()=>{ clearTimeout(to); resolve(''); });
    }catch(e){ resolve(''); }
  });
}

/* Guest self-heal for signaling split-brain: host and guest can land on
   different PeerJS servers (dedicated vs public cloud) when the 5.5s fallback
   fires for only one side (e.g. Render cold start). Retry once on the other
   server instead of dying with "host not found". */
function netGuestTryOtherServer(room){
  try{
    if(!NET || NET.role !== 'guest') return false;
    if(NET.mySlot >= 0 || NET.isSpectator) return false; // joined: never switch mid-session
    // Pinned to a specific dedicated server: the host is provably hosted there,
    // so don't waste a rebuild flipping to the cloud. Cloud pins may still
    // self-heal to the dedicated server (stale invite markers happen).
    if(NET._pinSrv && !NET._onCloud) return false;
    if((NET._srvRetry || 0) >= 1) return false;
    try{
      for(const pair of NET.conns.values()){
        if((pair.rel && pair.rel.open) || (pair.fast && pair.fast.open)) return false; // live link: never destroy it
      }
    }catch(e){}
    if(NET._onCloud){
      const hasCustom = !!((NET._srv && NET._srv.host) || ((typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || ''));
      if(!hasCustom) return false;
      NET._srvRetry = (NET._srvRetry || 0) + 1;
      netConnectPeer(room, false, false); // try dedicated server
    } else {
      NET._srvRetry = (NET._srvRetry || 0) + 1;
      netConnectPeer(room, false, true); // try public cloud
    }
    return true;
  }catch(e){ return false; }
}

/* Intentional peer teardown for fallback/retry: destroy fires 'close'
   asynchronously, and the close handler wipes hosting state. Detach first
   so a rebuild never looks like a disconnect. */
function netDestroyPeerForRebuild(){
  try{
    NET._rebuilding = true;
    const p = NET.peer;
    NET.peer = null;
    if(p){
      try{ if(typeof p.removeAllListeners === 'function') p.removeAllListeners('close'); }catch(e){}
      try{ if(typeof p.off === 'function') p.off('close'); }catch(e){}
      try{ p.destroy(); }catch(e){}
    }
  }catch(e){ try{ NET._rebuilding = true; NET.peer = null; }catch(e2){} }
}

/* PeerJS connect (Supports dedicated Railway/Render server with zero-failure cloud fallback) */
/* PeerJS connect (Supports dedicated Railway/Render server with zero-failure cloud & zero-UDP relay fallback) */
async function netConnectPeer(room, isHost, forceFallback = false){
  try{ await netRefreshIce(); }catch(e){}
  try{ if(NET._forceCloud && !isHost){ NET._forceCloud = false; forceFallback = true; } }catch(e){}
  try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}
  if(NET.peer){
    netDestroyPeerForRebuild();
  }
  const cleanRoom = room.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  try{ if(typeof NET!=='undefined'&&NET) NET._joinHostId = NET._joinHostId || ''; }catch(e){}
  const id = isHost
    ? ('tag-' + cleanRoom + '-host')
    : ('tag-' + cleanRoom + '-g' + Math.floor(Math.random() * 1e6));
  try{
    if(typeof NET!=='undefined'&&NET){
      if(isHost){ NET._hostId = id; }
      else if(!NET._hostId){ NET._hostId = ''; }
    }
  }catch(e){}

  if(typeof RELAY !== 'undefined'){
    RELAY.mode = 'p2p';
    RELAY.room = cleanRoom;
    RELAY.pid = id;
    try{ if(typeof netRestoreVoiceAfterRelay === 'function') netRestoreVoiceAfterRelay(); }catch(e){}
    try{ netProbeRelayCapable(); }catch(e){} // warm relay-support cache for the 3.5s watchdog
    try{ NET._helloSent = false; }catch(e){}
    if(RELAY.ws){ try{ RELAY.ws.close(); }catch(e){} RELAY.ws = null; }
    if(RELAY.hostWs){ try{ RELAY.hostWs.close(); }catch(e){} RELAY.hostWs = null; }
    if(RELAY.pollTimer){ clearInterval(RELAY.pollTimer); RELAY.pollTimer = null; }
  }
  
  // Server choice: manual ?server=... wins, else probed self/render pick (NET._srv), else PEER_SERVER_CONFIG
  let customHost = '';
  let effPort = 443, effPath = '/tag-netplay', effSecure = true;
  try {
    const qp = new URLSearchParams(location.search);
    customHost = qp.get('server') || '';
    if(customHost){
      customHost = customHost.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    } else if(NET._srv && NET._srv.host){
      customHost = NET._srv.host; effPort = NET._srv.port || 443; effPath = NET._srv.path || '/tag-netplay'; effSecure = (NET._srv.secure !== undefined) ? NET._srv.secure : true;
    } else {
      customHost = ((typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || '');
      customHost = customHost.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
      effPort = (typeof PEER_SERVER_CONFIG !== 'undefined' && PEER_SERVER_CONFIG.port) || 443;
      effPath = (typeof PEER_SERVER_CONFIG !== 'undefined' && PEER_SERVER_CONFIG.path) || '/tag-netplay';
      effSecure = (typeof PEER_SERVER_CONFIG !== 'undefined' && PEER_SERVER_CONFIG.secure !== undefined) ? PEER_SERVER_CONFIG.secure : true;
    }
  } catch(e){}

  let peerOptions = {
    debug: 0,
    config: {
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 0,
      iceTransportPolicy: 'all'
    }
  };
  let usingCustom = false;
  if(customHost && !forceFallback){    usingCustom = true;
    peerOptions = {
      host: customHost,
      port: effPort,
      path: effPath,
      secure: effSecure,
      debug: 0,
      config: {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 0,
        iceTransportPolicy: 'all'
      }
    };
  }

  let fallbackTimer = null;
  try{ NET._onCloud = !usingCustom; }catch(e){}
  try{ NET._activeSrv = null; }catch(e){}
  // Pre-open fail guard: a peer that never opens (pinned server, cloud dial,
  // or dead network) must fail loudly instead of hanging on "Joining…" forever.
  // The post-open guest watchdog only arms after 'open', so this covers the gap.
  try{ if(NET._openFailTimer){ clearTimeout(NET._openFailTimer); NET._openFailTimer = null; } }catch(e){}
  if(!isHost){
    NET._openFailTimer = setTimeout(() => {
      try{
        if(NET && NET.role === 'guest' && !NET.myId && NET.peer && NET.peer.open === false){
          netToast('Server unreachable — try again.');
          netLeaveRoom('Server unreachable');
        }
      }catch(e){}
    }, 22000);
  }
  if(usingCustom){
    const pinned = (()=>{ try{ return !!NET._pinSrv; }catch(e){ return false; } })();
    // Adaptive cloud fallback. A blind "destroy at 4s" used to turn a waking
    // Render instance (30-60s cold boot) into a destroy→cloud→miss→rebuild
    // cascade that took 10-20s per join. Now:
    //  - pinned joins (host server known from directory/invite): never yank
    //    to the cloud — the host is provably not there; hold the window and
    //    let the watchdogs + fail guard arbitrate.
    //  - unpinned joins: a parallel health probe decides. An alive-but-slow
    //    server gets one extension instead of a destructive rebuild.
    let alive = { state: 'pending', ok: false };
    let ext = 0;
    setTimeout(() => {
      try{
        if(NET.peer && NET.myId) return; // already open: no probe needed
        netTimedHealth({ host: customHost, port: effPort, path: effPath, secure: effSecure }, 1500).then(r => {
          alive.state = 'done'; alive.ok = !!(r && r.ok);
        });
      }catch(e){ alive.state = 'done'; alive.ok = false; }
    }, 2200);
    const decide = () => {
      try{
        if(NET.peer && NET.myId) return; // opened while deciding: keep it
        if(pinned){
          try{ console.warn('[NET] pinned server slow, holding window'); }catch(e){}
          return; // watchdogs + fail guard own the failure path
        }
        if(alive.state === 'pending'){ setTimeout(decide, 400); return; }
        if(alive.ok && ext < 1){
          ext++;
          try{ console.warn('[NET] server alive but slow, extending window'); }catch(e){}
          setTimeout(decide, 4000);
          return;
        }
      }catch(e){}
      console.warn('Custom server connection timed out, falling back to public PeerJS cloud.');
      try{ console.warn('[NET] cloud fallback'); }catch(e){}
      try{ netConnectPeer(room, isHost, true); }catch(e){}
    };
    fallbackTimer = setTimeout(decide, 4000);
  }
  try{ NET._fallbackTimer = fallbackTimer; }catch(e){}

  if(typeof Peer === 'undefined'){
    netToast('Networking unavailable (blocked script). Playing offline.');
    try{ netLeaveRoom(); }catch(e){}
    return;
  }
  try {
    NET.peer = new Peer(id, peerOptions);
  } catch(err){
    if(usingCustom){
      netConnectPeer(room, isHost, true);
      return;
    }
    throw err;
  }
  
  NET.peer.on('open', id2 => {
    if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer = null; }
    try{ NET._fallbackTimer = null; }catch(e){}
    try{ if(NET._openFailTimer){ clearTimeout(NET._openFailTimer); NET._openFailTimer = null; } }catch(e){}
    try{ NET._activeSrv = usingCustom ? { host: customHost, port: effPort, path: effPath, secure: effSecure } : { cloud: true }; }catch(e){}
    try{ NET._rebuilding = false; }catch(e){} // rebuild survived: future closes are real
    NET.myId = id2;
    NET.peerSlots.clear();
    if(usingCustom){
      console.log('[NET] Connected to dedicated signaling server:', customHost);
    }
    if(isHost){
      try{ NET._hostReconn = 0; NET._idRetry = 0; }catch(e){}
      NET.peerSlots.set(id2, 0);
      NET.peer.on('connection', c => netWireConn(c, true));
      netToast('Hosting room ' + room.toUpperCase() + '! Link copied.');
      // Sync the URL to the ACTUAL server (post-fallback truth) so a
      // re-copied link pins guests to the right signaling server.
      try{
        const u = new URL(location.href);
        if(usingCustom && customHost){ u.searchParams.set('srv', customHost); u.searchParams.delete('cloud'); }
        else { u.searchParams.delete('srv'); u.searchParams.set('cloud', '1'); }
        history.replaceState(null, '', u.pathname + u.search);
      }catch(e){}
      setTimeout(() => { netBroadcastSettings(); netBroadcastRoster(); }, 400);

      // Host also registers with relay server in the background for zero-UDP guests
      try {
        const base = netRelayBase();
        const hostRelayWs = new WebSocket(base + '/tag-relay');
        try{ RELAY.hostWs = hostRelayWs; }catch(e){} // tracked so leave/connect can close it
        hostRelayWs.onopen = () => {
          try { hostRelayWs.send(JSON.stringify({ t: 'join', room: cleanRoom.toUpperCase(), peerId: id2 })); } catch(e){}
        };
        hostRelayWs.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data);
            if (m && m.from && m.data) {
              const fakeConn = {
                peer: m.from,
                open: true,
                send: (d) => {
                  if (hostRelayWs.readyState === 1) {
                    try { hostRelayWs.send(JSON.stringify({ to: m.from, data: d })); return; } catch(e){}
                  }
                  netRelaySend(m.from, d);
                }
              };
              netOnData(m.data, fakeConn);
            }
          } catch(e) {}
        };
      } catch(e) {}
    } else {
      const hostId = NET._joinHostId || ('tag-' + cleanRoom + '-host');
      NET._hostId = hostId;
      NET.peerSlots.set(hostId, 0);
      netToast('Reaching host…');
      const connRel = NET.peer.connect(hostId, { reliable: true, label: 'rel' });
      netWireConn(connRel, false);
      const connFast = NET.peer.connect(hostId, { reliable: false, ordered: false, maxRetransmits: 0, label: 'fast' });
      netWireConn(connFast, false);

      // 3.5s P2P watchdog for campus / institutional firewalls
      RELAY._t0 = performance.now();
      setTimeout(() => {
        try {
          if (!NET || NET.role !== 'guest' || RELAY.mode === 'relay') return;
          const pair = NET.conns.get(NET._hostId || hostId);
          const open = pair && ((pair.rel && pair.rel.open) || (pair.fast && pair.fast.open));
          if (!open) {
            // Only abandon P2P when this server actually supports relay —
            // otherwise a dead relay hijacks a slow-but-working P2P link.
            if(NET._relayOk === true){
              console.warn('[NET] P2P channel not open after 3.5s, switching to relay mode.');
              netEnterRelay('no-p2p-3.5s');
              netRelaySend(hostId, netHelloPayload());
            } else {
              console.warn('[NET] P2P slow after 3.5s, no relay on this server — holding P2P window.');
            }
          }
        } catch(e) {}
      }, RELAY.deadline || 3500);

      // Join watchdog: only kills truly dead links. A live-but-unassigned
      // link (host slow to answer) just gets more time — never destroyed.
      const armGuestWatchdog = (ms) => {
        try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}
        NET._guestTimeout = setTimeout(() => {
          try{
            if(!NET || NET.role !== 'guest') return;
            let ok = false, linkOpen = false;
            try{
              const pair = NET.conns.get(NET._hostId || hostId);
              linkOpen = !!(pair && ((pair.rel && pair.rel.open) || (pair.fast && pair.fast.open)));
              if(linkOpen && (NET.mySlot >= 0 || NET.isSpectator)) ok = true;
              if(RELAY.mode === 'relay' && (NET.mySlot >= 0 || NET.isSpectator)) ok = true;
            }catch(e){}
            if(ok) return;
            if(linkOpen){
              // Cap the extensions: a truly mute host must eventually fail
              // instead of syncing forever (and blocking fresh invites).
              NET._syncExt = (NET._syncExt || 0) + 1;
              if(NET._syncExt > 2){
                try{ if(typeof CG!=='undefined'&&CG&&typeof CG.leftRoom==='function')CG.leftRoom(); }catch(e){}
                netToast('Host not responding.');
                netLeaveRoom('Host not responding');
                return;
              }
              netToast('Syncing…');
              armGuestWatchdog(7000);
              return;
            }
            if(netGuestTryOtherServer(NET.room)){ try{ console.warn('[NET] retrying other server'); }catch(e){} return; }
            if(!(NET._p2pRetry || 0)){
              // Same-server re-gather: first attempt often stalls on slow ICE,
              // a fresh Peer almost always connects. Final failure lands below.
              NET._p2pRetry = 1;
              try{ console.warn('[NET] slow join, re-gathering ICE'); }catch(e){}
              try{ netConnectPeer(NET.room, false, !!NET._onCloud); }catch(e){}
              return;
            }
            try{ if(typeof CG!=='undefined'&&CG&&typeof CG.leftRoom==='function')CG.leftRoom(); }catch(e){}
            netToast('Could not find host. Check the room code.');
            netLeaveRoom('Room unavailable');
          }catch(e){}
        }, ms || 7000);
      };
      armGuestWatchdog(7000);
    }
  });

  NET.peer.on('call', call => {
    call.answer(VOICE.localStream || undefined);
    voiceWireCall(call);
  });

  NET.peer.on('error', e => {
    const t = String(e.type || e.message || 'error').toLowerCase();
    if(usingCustom && (t.includes('server-error') || t.includes('socket-error') || t.includes('network') || t.includes('could not connect'))){
      if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer = null; }
      try{ console.warn('[NET] custom server error, cloud fallback'); }catch(e){}
      netConnectPeer(room, isHost, true);
      return;
    }
    if(/ice|failed|disconnected/i.test(t)){
      netEnterRelay('ice-failed');
      return;
    }
    if(t.includes('peer-unavailable')){
      try{
        if(!isHost && NET._dirHostId && NET._dirHostId !== (NET._joinHostId || '')){
          NET._joinHostId = NET._dirHostId;
          try{ NET._dirHostId = ''; }catch(e){}
          try{ console.warn('[NET] retrying with directory host id'); }catch(e){}
          try{ netConnectPeer(room, false, !!NET._onCloud); }catch(e){}
          return;
        }
      }catch(e){}
      if(!isHost && netGuestTryOtherServer(room)){ try{ console.warn('[NET] host not on this server, retrying other'); }catch(e){} return; }
      if((NET._srvRetry || 0) > 0) return; // retry in flight: watchdog is the final arbiter
      netToast('Host not found. Room may be closed.');
    } else if(t.includes('unavailable-id')){
      // Stale self-registration (re-host same code within server expiry).
      // Retry with backoff first: the stale entry usually expires in seconds.
      if(isHost){
        NET._idRetry = (NET._idRetry || 0) + 1;
        if(NET._idRetry <= 3){
          try{ console.warn('[NET] id taken, retry ' + NET._idRetry + '/3 in ' + (2000 * NET._idRetry) + 'ms'); }catch(e){}
          setTimeout(()=>{ try{ if(NET && NET.role === 'host' && NET.room) netConnectPeer(NET.room, true); }catch(e){} }, 2000 * NET._idRetry);
          return;
        }
        try{ netLeaveRoom('Room code taken, try again'); }catch(e){} return;
      }
      netToast('Room code already in use. Please try again.');
    } else {
      netToast('Network: ' + t.slice(0, 50));
    }
  });

  NET.peer.on('disconnected', () => {
    try{ NET.peer.reconnect(); }catch(e){}
  });

  NET.peer.on('close', () => {
    try{ if(NET._rebuilding){ NET._rebuilding = false; return; } }catch(e){}
    // Hosting is sticky: an empty lobby that loses signaling reconnects in
    // place — never dump the host to the public directory.
    try{
      if(NET.isHost && NET.room){
        NET._hostReconn = (NET._hostReconn || 0) + 1;
        if(NET._hostReconn <= 3){
          netToast('Connection lost. Reconnecting…');
          try{ netConnectPeer(NET.room, true); }catch(e){}
          return;
        }
      }
    }catch(e){}
    netToast('Online session ended');
    netLeaveRoom();
  });
}

function netHelloPayload(extra){
  let base = { t: 'hello', ctrl: 'WASD', name: 'Player', avatar: '' };
  try{
    const prof = netGetMyProfile();
    base.ctrl = NET.myCtrl || 'WASD';
    base.name = prof.name;
    base.avatar = prof.avatar || '';
  }catch(e){}
  try{ base.pid = getOrCreatePlayerId() || ''; }catch(e){ base.pid = ''; }
  try{ base.sess = (typeof SESSION_METRICS !== 'undefined' && SESSION_METRICS.sessionId) ? SESSION_METRICS.sessionId : ''; }catch(e){ base.sess = ''; }
  if(extra && typeof extra === 'object'){ try{ for(const k of Object.keys(extra)){ base[k] = extra[k]; } }catch(e){} }
  return base;
}
function netRememberPeerIds(peerId, m){
  try{
    if(!NET) return;
    if(!NET.peerPid){ NET.peerPid = new Map(); }
    if(!NET.peerSess){ NET.peerSess = new Map(); }
    if(m && m.pid) NET.peerPid.set(peerId, String(m.pid).slice(0, 24));
    if(m && m.sess) NET.peerSess.set(peerId, String(m.sess).slice(0, 24));
  }catch(e){}
}
function netForgetPeer(peerId){
  try{ if(NET.peerPid) NET.peerPid.delete(peerId); }catch(e){}
  try{ if(NET.peerSess) NET.peerSess.delete(peerId); }catch(e){}
}
function netLobbyDup(key, ms){
  try{
    const now = Date.now();
    if(!NET._lobbyDup) NET._lobbyDup = {};
    if(NET._lobbyDup[key] && (now - NET._lobbyDup[key]) < (ms || 30000)) return true;
    NET._lobbyDup[key] = now;
    return false;
  }catch(e){ return false; }
}
function netWireConn(conn, isHostSide){
  const peerId = conn.peer;
  const pair = getOrCreateConnPair(peerId);
  const isFast = (conn.label === 'fast');
  if(isFast) pair.fast = conn;
  else pair.rel = conn;

  const onReady = () => {
    // Only disarm the join watchdog once the host actually assigned us (open != joined)
    if(NET._guestTimeout && (NET.mySlot >= 0 || NET.isSpectator)){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; }
    if(!isHostSide && !NET._helloSent){
      NET._helloSent = true; // first open wire wins; host dedupes by peerId
      const myProfile = netGetMyProfile();
      conn.send(netHelloPayload());
      netToast('Syncing with host…');
      if(!isFast && VOICE.enabled && VOICE.localStream){
        conn.send({ t: 'voice_req', peerId: NET.myId, hasStream: true });
      }
    } else if(isHostSide && !isFast){
      netToast('Guest connected!');
      if(VOICE.enabled && VOICE.localStream){
        setTimeout(() => voiceCallPeer(peerId, false), 500);
      }
    }
  };

  if(conn.open){
    onReady();
  } else {
    conn.on('open', onReady);
  }

  conn.on('data', d => netOnData(d, conn));

  conn.on('close', () => {
    if(isFast) pair.fast = null;
    else pair.rel = null;
    if(!pair.rel && !pair.fast){
      let _leftName = '', _leftPid = '', _leftSess = '';
      try{ _leftName = NET.peerNames.get(peerId) || ''; }catch(e){}
      try{ if(NET.peerPid) _leftPid = NET.peerPid.get(peerId) || ''; }catch(e){}
      try{ if(NET.peerSess) _leftSess = NET.peerSess.get(peerId) || ''; }catch(e){}
      NET.conns.delete(peerId);
      NET.pings.delete(peerId);
      NET.peerNames.delete(peerId);
      if(NET.isHost){
        let removedSlot = -1;
        for(let i=1; i<MAXP; i++){
          const ent = NET.hostInputs.get(i);
          if(ent && ent.owner === peerId){
            removedSlot = i;
            NET.hostInputs.delete(i);
            NET.peerSlots.delete(peerId);
            _remoteTargets.delete(i);
            menu.slotColor[i] = -1;
            NET.slotsReady[i] = false;
            NET.slotsName[i] = '';
            if(match && match.players){
              const idx = match.players.findIndex(p => p.slot === i);
              if(idx !== -1){
                const wasIt = (match.it === idx);
                const removedPlayer = match.players[idx];
                match.players.splice(idx, 1);
                if(match.tags) match.tags.splice(idx, 1);
                if(match.players.length > 0){
                  if(wasIt){
                    // Find the player CLOSEST to the disconnecting player
                    let closestIdx = 0, closestDist = Infinity;
                    for(let pi=0; pi<match.players.length; pi++){
                      const remP = match.players[pi];
                      const d2 = Math.hypot(remP.x - removedPlayer.x, remP.y - removedPlayer.y);
                      if(d2 < closestDist){
                        closestDist = d2;
                        closestIdx = pi;
                      }
                    }
                    match.it = closestIdx;
                    match.cooldown = 1.8;
                    match.freeze = 0.3;
                    const newItP = match.players[closestIdx];
                    const newName = (newItP ? NET.slotsName[newItP.slot] : '') || ('P' + (closestIdx+1));
                    netToast(newName + ' is now IT (closest player)! 🏃');
                  } else if(match.it >= match.players.length){
                    match.it = 0;
                  }
                }
              }
            }
            break;
          }
        }
        // Also remove from spectators queue if present
        NET.spectators = NET.spectators.filter(s => s.peerId !== peerId);
        if(removedSlot !== -1 && menu.hunterVotes){
          delete menu.hunterVotes[removedSlot];
          for(const k of Object.keys(menu.hunterVotes)){
            if(menu.hunterVotes[k] === removedSlot) delete menu.hunterVotes[k];
          }
          if(settings.gameMode === 'hunter') updateElectedHuntersFromVotes();
        }
        netBroadcastSettings();
        netBroadcastRoster();
        netUpdateHostDirectory();
        netToast(removedSlot !== -1 ? ('P' + (removedSlot + 1) + ' disconnected') : 'A spectator left');
        try{
          const _ln = _leftName || (removedSlot !== -1 ? ('P' + (removedSlot + 1)) : 'Spectator');
          if(typeof netNotifyPlayerLeftLobby === 'function') netNotifyPlayerLeftLobby(_ln, removedSlot, peerId, removedSlot !== -1);
        }catch(e){}
        // Host left alone mid-match (and host has no pause menu online):
        // back to lobby with the room still open instead of running solo forever.
        if(match && (match.state === 'playing' || match.state === 'countdown') && match.players && match.players.length < 2){
          netToast('Everyone left — back to lobby');
          quitToMenu();
        }
      } else {
        try{
          if(NET.role === 'guest' && !NET.isHost && typeof netRetrySameHost === 'function' && netRetrySameHost(peerId)) return;
          if(typeof netStartMigration === 'function' && NET.role === 'guest' && !NET.isHost){
            netToast('Host disconnected. Migrating…');
            if(!netStartMigration('host-close')) netLeaveRoom('Host disconnected');
          } else {
            netToast('Host disconnected. Returning to menu.');
            netLeaveRoom();
          }
        }catch(e){ try{ netLeaveRoom(); }catch(e2){} }
      }
      try{ netForgetPeer(peerId); }catch(e){}
    }
  });

  conn.on('error', (e) => {
    try{
      let em = '';
      try{ em = String((e && (e.type || e.message)) || 'conn-error').slice(0, 80); }catch(ee){ em = 'conn-error'; }
      try{ console.warn('[NET] conn error', peerId, em); }catch(ee){}
      try{
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if(!NET._lastConnErrToast || (now - NET._lastConnErrToast) > 8000){
          NET._lastConnErrToast = now;
          try{ console.warn('[NET] connection hiccup'); }catch(ee){}
        }
      }catch(ee){}
      try{
        if(!NET.isHost && NET.role === 'guest' && (NET.mySlot >= 0 || NET.isSpectator)){
          let hostOpen = false;
          try{
            const hid2 = NET._hostId || peerId;
            const hp = NET.conns.get(hid2);
            if(hp && ((hp.rel && hp.rel.open) || (hp.fast && hp.fast.open))) hostOpen = true;
          }catch(ee){}
          if(!hostOpen && NET._relayOk === true && typeof RELAY !== 'undefined' && RELAY.mode !== 'relay'){ try{ netEnterRelay('conn-error'); }catch(ee){} }
        }
      }catch(ee){}
    }catch(ee){}
  });
}

function netOnData(m, c){
  if(!m || !m.t || !c || !c.peer) return;
  try{
    if(NET && NET.role === 'guest' && !NET.isHost){
      if(m.t === 'ping' || m.t === 'pong' || m.t === 'state' || m.t === 'roster_sync' || m.t === 'assign' || m.t === 'spectator_init' || m.t === 'midgame_start'){ NET._hostRetry = 0; }
    }
  }catch(e){}

  // 1. Live Ping / Pong exchange
  if(m.t === 'ping'){
    c.send({ t: 'pong', pingT: m.pingT });
    return;
  }
  if(m.t === 'pong'){
    if(m.pingT){
      const rtt = Math.round(performance.now() - m.pingT);
      // Min-filter with 30s expiry: stale low sticks after route worsens.
      try{
        NET._pingMin = NET._pingMin || {};
        const nowP = performance.now();
        const e = NET._pingMin[c.peer];
        if(!e || rtt < e.rtt || (nowP - e.t) > 30000) NET._pingMin[c.peer] = { rtt: rtt, t: nowP };
        NET.pings.set(c.peer, NET._pingMin[c.peer].rtt);
      }catch(err){ NET.pings.set(c.peer, rtt); }
    }
    return;
  }

  // 2. Chat messaging & relay
  if(m.t === 'chat'){
    try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled)return;}catch(e){}
    const author = cleanText(m.name || 'Player').slice(0, 16);
    const text = cleanText(m.text || '').slice(0, 120);
    if(text){
      // Echo suppression by unique peer id only — never by name. (Name comparison
      // wrongly hid the host's messages whenever two devices shared a guest name,
      // e.g. same browser tabs or identical random Guest picks.)
      const isFromMe = !!(m.sender && NET.myId && m.sender === NET.myId);
      if(!isFromMe){
        netAddChatMessage(author, text, m.color || '#38bdf8');
      }
      if(NET.isHost){
        // Relay to other peers, EXCLUDING the sender peer!
        netBroadcastReliable({ t: 'chat', name: author, text: text, color: m.color || '#38bdf8', sender: c.peer }, c.peer);
      }
    }
    return;
  }

  // 3. Hello & join / spectator logic
  if(m.t === 'hello' && NET.isHost){
    try{
      if(m.migrated && m.oldSlot >= 1 && m.oldSlot < 8 && (NET._migratedHost || (NET._migrationPeers && NET._migrationPeers[c.peer] === (m.oldSlot | 0)))){
        const wantSlot = m.oldSlot | 0;
        const guestNameM = cleanText(m.name || 'Player').slice(0, 16);
        NET.peerNames.set(c.peer, guestNameM);
        try{ netRememberPeerIds(c.peer, m); }catch(e){}
        var _wantEnt = null;
        try{ _wantEnt = NET.hostInputs.get(wantSlot); }catch(e){}
        if((!NET.hostInputs.has(wantSlot) || (_wantEnt && _wantEnt.owner === c.peer)) && menu.slotColor[wantSlot] >= 0){
          NET.hostInputs.set(wantSlot, { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false, consumeEdge: false, owner: c.peer, seq: 0 });
          NET.peerSlots.set(c.peer, wantSlot);
          if(NET.spectators) NET.spectators = NET.spectators.filter(sp => sp.peerId !== c.peer);
          const slotsPeerM = [NET.myId || '', '', '', '', '', '', '', '', '', ''];
          for(let i = 1; i < MAXP; i++){ const ent = NET.hostInputs.get(i); if(ent && ent.owner) slotsPeerM[i] = ent.owner; }
          try{ slotsPeerM[NET.mySlot] = ''; }catch(e){}
          c.send({ t: 'assign', slot: wantSlot, settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterRotate: settings.hunterRotate, slotColor: menu.slotColor.slice(), slotTeam: menu.slotTeam.slice() }, mapData: MAPS[settings.map % MAPS.length], slotsCtrl: NET.slotsCtrl.slice(), slotsReady: NET.slotsReady.slice(), slotsName: NET.slotsName.slice(), botSlots: NET.botSlots ? NET.botSlots.slice() : [], slotsPeer: slotsPeerM });
          netBroadcastRoster();
          netUpdateHostDirectory();
          netToast(guestNameM + ' rejoined as P' + (wantSlot + 1));
          try{ NET._migrating = false; }catch(e){}
          if(match && screen === 'game' && match.state && (match.state === 'playing' || match.state === 'countdown' || match.state === 'paused')){
            try{
              const payload = { it: match.it, cooldownN: match.cooldown, matchIndex: matchIndex, currentThemeIdx: currentThemeIdx, lastStartIT: lastStartIT, timer: match.timer, state: match.state, cd: match.cd, cdT: match.cdT, tags: (match.tags ? match.tags.slice() : []), hunterMode: !!match.hunterMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterScores: match.hunterScores, hunterRound: match.hunterRound, cageT: match.cageT, players: match.players.map(p => packPlayer(p)), modeEnv: (typeof packModeState === 'function' ? packModeState() : null) };
              netSendRel(c, { t: 'midgame_start', settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, slotColor: menu.slotColor.slice(), slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []) }, mapData: MAPS[settings.map % MAPS.length], payload: payload, isSpectator: false });
            }catch(e){}
          }
          return;
        }
      }
    }catch(e){}
    try{
      const _rePid = (m && m.pid) ? String(m.pid) : '';
      if(_rePid && !m.migrated){
        let _oldPeer = null;
        try{
          if(NET.peerPid){
            for(const _e of NET.peerPid.entries()){ if(_e[1] === _rePid && _e[0] !== c.peer){ _oldPeer = _e[0]; break; } }
          }
        }catch(e){}
        if(_oldPeer){
          let _stillOpen = false;
          try{ const _op = NET.conns.get(_oldPeer); if(_op && ((_op.rel && _op.rel.open) || (_op.fast && _op.fast.open))) _stillOpen = true; }catch(e){}
          if(!_stillOpen){
            try{ netRememberPeerIds(c.peer, m); }catch(e){}
            const _reName = cleanText(m.name || 'Player').slice(0, 16);
            NET.peerNames.set(c.peer, _reName);
            let _oldSlot = -1;
            try{ for(const _se of NET.hostInputs.entries()){ if(_se[1].owner === _oldPeer){ _oldSlot = _se[0]; break; } } }catch(e){}
            try{
              const _oo = NET.conns.get(_oldPeer);
              if(_oo){ try{ _oo.rel && _oo.rel.close(); }catch(e){} try{ _oo.fast && _oo.fast.close(); }catch(e){} }
              NET.conns.delete(_oldPeer);
            }catch(e){}
            try{ NET.peerSlots.delete(_oldPeer); }catch(e){}
            try{ NET.peerNames.delete(_oldPeer); }catch(e){}
            try{ NET.pings.delete(_oldPeer); }catch(e){}
            try{ netForgetPeer(_oldPeer); }catch(e){}
            try{ if(NET.spectators) NET.spectators = NET.spectators.filter(sp => sp.peerId !== _oldPeer); }catch(e){}
            try{ if(typeof _remoteTargets !== 'undefined') _remoteTargets.delete(_oldSlot); }catch(e){}
            if(_oldSlot >= 1){
              try{ NET.hostInputs.delete(_oldSlot); }catch(e){}
              NET.hostInputs.set(_oldSlot, { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false, consumeEdge: false, owner: c.peer, seq: 0 });
              NET.peerSlots.set(c.peer, _oldSlot);
              if(NET.spectators) NET.spectators = NET.spectators.filter(sp => sp.peerId !== c.peer);
              const slotsPeerR = [NET.myId || '', '', '', '', '', '', '', '', '', ''];
              for(let i = 1; i < MAXP; i++){ const ent = NET.hostInputs.get(i); if(ent && ent.owner) slotsPeerR[i] = ent.owner; }
              c.send({ t: 'assign', slot: _oldSlot, settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterRotate: settings.hunterRotate, slotColor: menu.slotColor.slice(), slotTeam: menu.slotTeam.slice() }, mapData: MAPS[settings.map % MAPS.length], slotsCtrl: NET.slotsCtrl.slice(), slotsReady: NET.slotsReady.slice(), slotsName: NET.slotsName.slice(), botSlots: NET.botSlots ? NET.botSlots.slice() : [], slotsPeer: slotsPeerR });
              netBroadcastSettings();
              netBroadcastRoster();
              netUpdateHostDirectory();
              netToast(_reName + ' rejoined as P' + (_oldSlot + 1));
              try{ NET._migrating = false; }catch(e){}
              if(match && screen === 'game' && match.state && (match.state === 'playing' || match.state === 'countdown' || match.state === 'paused')){
                try{
                  const payload = { it: match.it, cooldownN: match.cooldown, matchIndex: matchIndex, currentThemeIdx: currentThemeIdx, lastStartIT: lastStartIT, timer: match.timer, state: match.state, cd: match.cd, cdT: match.cdT, tags: (match.tags ? match.tags.slice() : []), hunterMode: !!match.hunterMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterScores: match.hunterScores, hunterRound: match.hunterRound, cageT: match.cageT, players: match.players.map(p => packPlayer(p)), modeEnv: (typeof packModeState === 'function' ? packModeState() : null) };
                  netSendRel(c, { t: 'midgame_start', settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, slotColor: menu.slotColor.slice(), slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []) }, mapData: MAPS[settings.map % MAPS.length], payload: payload, isSpectator: false });
                }catch(e){}
              }
              return;
            }
          }
        }
      }
    }catch(e){}
    const guestName = cleanText(m.name || 'Player').slice(0, 16);
    const guestAvatar = m.avatar || '';
    NET.peerNames.set(c.peer, guestName);
    try{ netRememberPeerIds(c.peer, m); }catch(e){}
    try{ setTimeout(() => { try{ if(netLobbyDup('join:' + c.peer)) return; netNotifyPlayerJoinedLobby(guestName, c.peer); }catch(e){} }, 350); }catch(e){}

    // All new joiners start in the Waiting List / Spectator queue
    if(!NET.spectators) NET.spectators = [];
    if(!NET.spectators.some(sp => sp.peerId === c.peer)){
      NET.spectators.push({ peerId: c.peer, name: guestName, avatar: guestAvatar });
    }
    const slotsPeer = [NET.myId || '', '', '', '', '', '', '', '', '', ''];
    for(let i=1; i<MAXP; i++){
      const ent = NET.hostInputs.get(i);
      if(ent && ent.owner) slotsPeer[i] = ent.owner;
    }
    c.send({
      t: 'spectator_init',
      room: NET.room,
      hostName: NET.slotsName[0] || 'Host',
      settings: {
        map: settings.map,
        doubleJump: settings.doubleJump,
        collision: settings.collision,
        teams: settings.teams,
        gameMode: settings.gameMode,
        hunterRed: settings.hunterRed,
        hunterBlue: settings.hunterBlue,
        hunterRotate: settings.hunterRotate,
        slotColor: menu.slotColor.slice(),
        slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []),
        ready: NET.slotsReady.slice(),
        names: NET.slotsName.slice(),
        slotsPeer: slotsPeer
      },
      mapData: MAPS[settings.map % MAPS.length],
      spectating: true
    });
    netToast(guestName + ' joined the waiting list ⏳');
    netBroadcastRoster();
    netUpdateHostDirectory();

    // Snapshot only for watchable live states. Result/round-result screens
    // carry no result payload here, so those joiners wait in the lobby and
    // auto-join next round instead of building a result screen with null data.
    const snapStates = { playing: 1, countdown: 1, paused: 1 };
    const isMidgame = !!(match && screen === 'game' && match.state && snapStates[match.state]);
    if(isMidgame){
      const payload = {
        it: match.it,
        cooldownN: match.cooldown,
        matchIndex: matchIndex,
        currentThemeIdx: currentThemeIdx,
        lastStartIT: lastStartIT,
        timer: match.timer,
        state: match.state,
        cd: match.cd,
        cdT: match.cdT,
        tags: (match.tags ? match.tags.slice() : []),
        hunterMode: !!match.hunterMode,
        hunterRed: settings.hunterRed,
        hunterBlue: settings.hunterBlue,
        hunterScores: match.hunterScores,
        hunterRound: match.hunterRound,
        cageT: match.cageT,
        players: match.players.map(p => packPlayer(p)),
        modeEnv: (typeof packModeState === 'function' ? packModeState() : null)
      };
      netSendRel(c, {
        t: 'midgame_start',
        settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, slotColor: menu.slotColor.slice(), slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []) },
        mapData: MAPS[settings.map % MAPS.length],
        payload: payload,
        isSpectator: true
      });
    }
    return;
  } else if(m.t === 'claim_slot' && NET.isHost){
    if(NET.lobbyLocked){
      c.send({ t: 'toast', msg: 'Lobby is locked by the host.' });
      return;
    }
    let reqSlot = m.slot | 0;
    const isBotSlotCandidate = (s) => (NET.botSlots && NET.botSlots.includes(s));
    if(!(reqSlot >= 1 && reqSlot < MAXP && (!NET.hostInputs.has(reqSlot) || isBotSlotCandidate(reqSlot)) && (menu.slotColor[reqSlot] === -1 || isBotSlotCandidate(reqSlot)))){
      // Requested slot taken in a race: fall back to the first free slot (or first bot slot)
      reqSlot = -1;
      for(let s = 1; s < MAXP; s++){
        if(!NET.hostInputs.has(s) && menu.slotColor[s] === -1){ reqSlot = s; break; }
      }
      if(reqSlot < 0){
        for(let s = 1; s < MAXP; s++){
          if(isBotSlotCandidate(s)){ reqSlot = s; break; }
        }
      }
      if(reqSlot < 0){
        c.send({ t: 'toast', msg: 'Lobby is full.' });
        return;
      }
    }
    // If slot was occupied by a bot, remove bot from NET.botSlots
    if(NET.botSlots && NET.botSlots.includes(reqSlot)){
      NET.botSlots = NET.botSlots.filter(s => s !== reqSlot);
    }
    {
      const guestName = NET.peerNames.get(c.peer) || 'Player';
      if(NET.spectators){
        NET.spectators = NET.spectators.filter(sp => sp.peerId !== c.peer);
      }
      for(const [s, inp] of NET.hostInputs.entries()){
        if(inp.owner === c.peer){
          NET.hostInputs.delete(s);
          menu.slotColor[s] = -1;
          NET.slotsReady[s] = false;
          NET.slotsName[s] = '';
          if(typeof _remoteTargets !== 'undefined') _remoteTargets.delete(s);
        }
      }
      NET.hostInputs.set(reqSlot, { dir:0, jumpEdge:false, jumpHeld:false, downHeld:false, consumeEdge:false, owner: c.peer, seq: 0 });
      NET.peerSlots.set(c.peer, reqSlot);
      NET.slotsCtrl[reqSlot] = 'WASD';
      NET.slotsReady[reqSlot] = false;
      NET.slotsName[reqSlot] = getUniqueGuestName(guestName, reqSlot);

      const taken = menu.slotColor.filter(v => v >= 0);
      let pick = -1;
      for(let pi=0; pi<PALETTE.length; pi++){ if(!taken.includes(pi)){ pick = pi; break; } }
      if(pick === -1) pick = reqSlot % PALETTE.length;
      menu.slotColor[reqSlot] = pick;

      if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
      let redCount = 0, blueCount = 0;
      for(let s=0; s<MAXP; s++){
        if(menu.slotColor[s] >= 0){
          if(menu.slotTeam[s] === 0) redCount++; else blueCount++;
        }
      }
      // Honor the team panel the guest tapped (falls back to minority on ±1 clash)
      let want = (m.team === 0 || m.team === 1) ? m.team : -1;
      if(want < 0){
        want = (redCount <= blueCount) ? 0 : 1;
      } else if(settings.gameMode === 'hunter' && Math.abs((redCount + (want === 0 ? 1 : 0)) - (blueCount + (want === 1 ? 1 : 0))) > 1){
        want = (redCount <= blueCount) ? 0 : 1;
        c.send({ t: 'toast', msg: 'That team is full (±1 balance) — joined ' + (want === 0 ? 'RED' : 'BLUE') });
      }
      menu.slotTeam[reqSlot] = want;

      const slotsPeer = [NET.myId || '', '', '', '', '', '', '', '', '', ''];
      for(let i=1; i<MAXP; i++){
        const ent = NET.hostInputs.get(i);
        if(ent && ent.owner) slotsPeer[i] = ent.owner;
      }
      c.send({
        t: 'assign',
        slot: reqSlot,
        settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterRotate: settings.hunterRotate, slotColor: menu.slotColor.slice(), slotTeam: menu.slotTeam.slice() },
        mapData: MAPS[settings.map % MAPS.length],
        slotsCtrl: NET.slotsCtrl.slice(),
        slotsReady: NET.slotsReady.slice(),
        slotsName: NET.slotsName.slice(),
        botSlots: NET.botSlots ? NET.botSlots.slice() : [],
        slotsPeer: slotsPeer
      });
      netBroadcastSettings();
      netBroadcastRoster();
      netUpdateHostDirectory();
      netToast(guestName + ' joined as P' + (reqSlot + 1));
      try{ if(typeof netNotifySlotTaken === 'function' && !netLobbyDup('slot:' + c.peer + ':' + reqSlot)) netNotifySlotTaken(NET.slotsName[reqSlot] || guestName, reqSlot, c.peer); }catch(e){}
    }
    return;
  } else if(m.t === 'to_spectator' && NET.isHost){
    let fromSlot = -1;
    for(const [s, inp] of NET.hostInputs.entries()){
      if(inp.owner === c.peer){
        fromSlot = s;
        break;
      }
    }
    if(fromSlot > 0){
      netMovePlayerToWaitlist(fromSlot);
    }
    return;
  } else if(m.t === 'spectator_init' && !NET.isHost){
    NET.isSpectator = true;
    NET.mySlot = -1;
    // Host proof: we are talking to the host, so the join watchdog must die
    // here (open != joined was killing slow-but-working joins at 7s).
    try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}
    try{ NET._lastHostMsgT = performance.now(); NET.lastRecvT = performance.now(); NET._migrating = false; }catch(e){}
    if(m.settings){
      settings.map = m.settings.map | 0;
      settings.doubleJump = !!m.settings.doubleJump;
      settings.collision = !!m.settings.collision;
      if(m.settings.teams != null) settings.teams = !!m.settings.teams;
      if(m.settings.gameMode) settings.gameMode = m.settings.gameMode;
      if(m.settings.ctfTargetCaptures != null) settings.ctfTargetCaptures = m.settings.ctfTargetCaptures;
      if(m.settings.hunterRed != null) settings.hunterRed = m.settings.hunterRed;
      if(m.settings.hunterBlue != null) settings.hunterBlue = m.settings.hunterBlue;
      if(m.settings.slotColor) menu.slotColor = m.settings.slotColor.slice();
      if(m.settings.slotTeam) menu.slotTeam = m.settings.slotTeam.slice();
    }
    if(m.mapData) MAPS[settings.map % MAPS.length] = m.mapData;
    buildLevel();
    netShow(false);
    netToast('Joined as Spectator 👁️');
  } else if(m.t === 'midgame_start' && !NET.isHost){
    try{ NET._lastHostMsgT = performance.now(); NET.lastRecvT = performance.now(); NET._migrating = false; }catch(e){}
    if(m.isSpectator) NET.isSpectator = true;
    settings.map = m.settings.map | 0;
    settings.doubleJump = !!m.settings.doubleJump;
    settings.collision = !!m.settings.collision;
    if(m.settings.teams != null) settings.teams = !!m.settings.teams;
    if(m.settings.gameMode) settings.gameMode = m.settings.gameMode;
    if(m.settings.ctfTargetCaptures != null) settings.ctfTargetCaptures = m.settings.ctfTargetCaptures;
    if(m.settings.hunterRed != null) settings.hunterRed = m.settings.hunterRed;
    if(m.settings.hunterBlue != null) settings.hunterBlue = m.settings.hunterBlue;
    if(m.settings.slotColor) menu.slotColor = m.settings.slotColor.slice();
    if(m.settings.slotTeam) menu.slotTeam = m.settings.slotTeam.slice();
    if(m.mapData) MAPS[settings.map % MAPS.length] = m.mapData;
    buildLevel();
    startMatchNetGuest(m.payload);
    if(match && m.payload){
      if(m.payload.timer != null) match.timer = m.payload.timer;
      if(m.payload.state != null) match.state = m.payload.state;
      if(m.payload.cd != null) match.cd = m.payload.cd;
      if(m.payload.cooldownN != null) match.cooldown = m.payload.cooldownN;
      if(m.payload.itTeam !== undefined) match.itTeam = m.payload.itTeam;
      if(m.payload.teamItTime) match.teamItTime = m.payload.teamItTime.slice();
      if(m.payload.tags) match.tags = m.payload.tags.slice();
      if(m.payload.cageT != null) match.cageT = m.payload.cageT;
      if(m.payload.hunterScores) match.hunterScores = { ...m.payload.hunterScores };
      if(m.payload.hunterRound != null) match.hunterRound = m.payload.hunterRound;
      if(m.payload.players && Array.isArray(m.payload.players)){
        for(const rawP of m.payload.players){
          const pData = unpackPlayer(rawP);
          const pObj = match.players.find(p => p.slot === pData.slot);
          if(pObj){
            pObj.x = pData.x;
            pObj.y = pData.y;
            pObj.vx = pData.vx;
            pObj.vy = pData.vy;
            if(pData.isEliminated !== undefined) pObj.isEliminated = !!pData.isEliminated;
            if(pData.isInfected !== undefined) pObj.isInfected = !!pData.isInfected;
            if(pData.isPatientZero !== undefined) pObj.isPatientZero = !!pData.isPatientZero;
            if(pData.isLoneSurvivor !== undefined) pObj.isLoneSurvivor = !!pData.isLoneSurvivor;
            if(pData.crownPoints !== undefined) pObj.crownPoints = pData.crownPoints;
            if(pData.underdogTimer !== undefined) pObj.underdogTimer = pData.underdogTimer;
            if(pData.shieldT !== undefined) pObj.shieldT = pData.shieldT;
            if(pData.isRespawning !== undefined) pObj.isRespawning = !!pData.isRespawning;
            if(pData.slot !== NET.mySlot){
              netUpdateRemoteTarget(pData.slot, pData, pObj);
            }
          }
        }
      }
      if(m.payload.modeEnv && typeof applyModeState === 'function'){ try{ applyModeState(m.payload.modeEnv); }catch(e){} }
    }
    netShow(false);
    netToast('Watching match in progress! 👁️');
  } else if(m.t === 'assign' && !NET.isHost){
    NET.isSpectator = false;
    NET.mySlot = m.slot;
    try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}
    try{ NET._lastHostMsgT = performance.now(); NET.lastRecvT = performance.now(); NET._migrating = false; }catch(e){}
    if(m.settings){
      settings.map = m.settings.map | 0;
      settings.doubleJump = !!m.settings.doubleJump;
      settings.collision = !!m.settings.collision;
      if(m.settings.teams != null) settings.teams = !!m.settings.teams;
      if(m.settings.gameMode) settings.gameMode = m.settings.gameMode;
      if(m.settings.ctfTargetCaptures != null) settings.ctfTargetCaptures = m.settings.ctfTargetCaptures;
      if(m.settings.hunterRed != null) settings.hunterRed = m.settings.hunterRed;
      if(m.settings.hunterBlue != null) settings.hunterBlue = m.settings.hunterBlue;
      if(m.settings.slotColor) menu.slotColor = m.settings.slotColor.slice();
      if(m.settings.slotTeam) menu.slotTeam = m.settings.slotTeam.slice();
    }
    if(m.mapData) MAPS[settings.map % MAPS.length] = m.mapData;
    if(m.slotsCtrl) NET.slotsCtrl = m.slotsCtrl.slice();
    if(m.slotsReady) NET.slotsReady = m.slotsReady.slice();
    if(m.slotsName) NET.slotsName = m.slotsName.slice();
    if(m.botSlots && Array.isArray(m.botSlots)) NET.botSlots = m.botSlots.slice();
    if(m.slotsPeer && Array.isArray(m.slotsPeer)){
      for(let s=0; s<m.slotsPeer.length; s++){
        if(m.slotsPeer[s]) NET.peerSlots.set(m.slotsPeer[s], s);
      }
    }
    buildLevel();
    netShow(false);
    netToast('Connected as P' + (m.slot + 1) + '! Click Ready.');
    try{
      if(typeof CG !== 'undefined' && CG && typeof CG.updateRoom === 'function' && NET.room){
        CG.updateRoom(NET.room, null, true);
      }
    }catch(e){}
  } else if(m.t === 'roster_sync'){
    if(!NET.isHost && NET.role==='guest' && c && c.peer && NET._hostId && c.peer!==NET._hostId) return;
    try{ if(!NET.isHost){ NET._lastHostMsgT = performance.now(); } }catch(e){}
    if(m.slotsCtrl) NET.slotsCtrl = m.slotsCtrl.slice();
    if(m.slotsReady) NET.slotsReady = m.slotsReady.slice();
    if(m.slotsName) NET.slotsName = m.slotsName.slice();
    if(m.spectators) NET.spectators = m.spectators.slice();
    if(m.lobbyLocked !== undefined) NET.lobbyLocked = !!m.lobbyLocked;
    if(m.teamsLocked !== undefined) NET.teamsLocked = !!m.teamsLocked;
    if(m.readyCountdown !== undefined) NET.readyCountdown = m.readyCountdown;
    if(m.botSlots && Array.isArray(m.botSlots)) NET.botSlots = m.botSlots.slice();
    if(m.slotColor){
      menu.slotColor = m.slotColor.slice();
      buildLevel();
    }
    if(m.slotTeam) menu.slotTeam = m.slotTeam.slice();
    if(m.hunterRed != null) settings.hunterRed = m.hunterRed;
    if(m.hunterBlue != null) settings.hunterBlue = m.hunterBlue;
    if(m.hunterVotes) menu.hunterVotes = { ...m.hunterVotes };
    try{
      if(!NET.isHost && typeof CG !== 'undefined' && CG && typeof CG.updateRoom === 'function' && NET.room){
        const pCount = (m.slotsName ? m.slotsName.filter(Boolean).length : 2);
        CG.updateRoom(NET.room, new Array(pCount).fill(0), !m.lobbyLocked);
      }
    }catch(e){}
    if(m.pings && typeof m.pings === 'object'){
      for(const [pid, pingVal] of Object.entries(m.pings)){
        NET.pings.set(pid, pingVal);
      }
    }
    if(m.slotsPeer && Array.isArray(m.slotsPeer)){
      for(let s=0; s<m.slotsPeer.length; s++){
        const pid = m.slotsPeer[s];
        if(pid){
          NET.peerSlots.set(pid, s);
          if(VOICE.enabled && VOICE.localStream && pid !== NET.myId && !VOICE.peers.has(pid)){
            if(NET.myId > pid) voiceCallPeer(pid, false);
          }
        }
      }
    }
  } else if(m.t === 'team'){
    if(NET.isHost && !NET.teamsLocked){
      if(match && (match.state === 'playing' || match.state === 'countdown' || match.state === 'paused')) return;
      const senderSlot = (NET.peerSlots && c && c.peer) ? NET.peerSlots.get(c.peer) : null;
      if(senderSlot !== m.slot) return;
      if(m.slot >= 0 && m.slot < MAXP && m.team != null){
        if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
        menu.slotTeam[m.slot] = m.team;
        if(settings.gameMode === 'hunter') updateElectedHuntersFromVotes();
        netBroadcastRoster();
      }
    }
  } else if(m.t === 'ready'){
    if(NET.isHost){
      const senderSlot = (NET.peerSlots && c && c.peer) ? NET.peerSlots.get(c.peer) : null;
      if(senderSlot !== m.slot) return;
      if(m.slot >= 0 && m.slot < MAXP){
        NET.slotsReady[m.slot] = !!m.ready;
        netBroadcastRoster();
        netCheckReadyCountdown();
      }
    }
  } else if(m.t === 'ctrl'){
    if(NET.isHost){
      const senderSlot = (NET.peerSlots && c && c.peer) ? NET.peerSlots.get(c.peer) : null;
      if(senderSlot !== m.slot) return;
      if(m.slot >= 0 && m.slot < MAXP && m.ctrl){
        NET.slotsCtrl[m.slot] = m.ctrl;
        netBroadcastRoster();
      }
    }
  } else if(m.t === 'color'){
    if(NET.isHost && !NET.teamsLocked){
      const senderSlot = (NET.peerSlots && c && c.peer) ? NET.peerSlots.get(c.peer) : null;
      if(senderSlot !== m.slot) return;
      if(m.slot >= 0 && m.slot < MAXP && m.color >= 0){
        menu.slotColor[m.slot] = m.color;
        buildLevel();
        netBroadcastSettings();
        netBroadcastRoster();
      }
    }
  } else if(m.t === 'settings' && !NET.isHost){
    if(m.mapData) MAPS[settings.map % MAPS.length] = m.mapData;
    settings.map = m.settings.map | 0;
    settings.doubleJump = !!m.settings.doubleJump;
    settings.collision = !!m.settings.collision;
    if(m.settings.teams != null) settings.teams = !!m.settings.teams;
    if(m.settings.gameMode) settings.gameMode = m.settings.gameMode;
    if(m.settings.ctfTargetCaptures != null) settings.ctfTargetCaptures = m.settings.ctfTargetCaptures;
    if(m.settings.hunterRed != null) settings.hunterRed = m.settings.hunterRed;
    if(m.settings.hunterBlue != null) settings.hunterBlue = m.settings.hunterBlue;
    if(m.settings.hunterRotate != null) settings.hunterRotate = !!m.settings.hunterRotate;
    if(m.settings.slotColor) menu.slotColor = m.settings.slotColor.slice();
    if(m.settings.slotTeam) menu.slotTeam = m.settings.slotTeam.slice();
    buildLevel();
  } else if(m.t === 'p_state' && NET.isHost){
    const slot = m.s != null ? m.s : m.slot;
    if(slot === NET.mySlot || slot === 0) return;
    const pData = unpackPlayer(m);
    let pObj = (match && match.players) ? match.players.find(p => p.slot === slot) : null;
    if(!pObj && match && match.players){
      const col = (menu.slotColor[slot] >= 0) ? menu.slotColor[slot] : (slot % PALETTE.length);
      pObj = makePlayer(match.players.length, slot, col);
      pObj.x = pData.x;
      pObj.y = pData.y;
      match.players.push(pObj);
      if(match.tags.length < match.players.length) match.tags.push(0);
    }
    netUpdateRemoteTarget(slot, pData, pObj);
  } else if(m.t === 'tag_claim' && NET.isHost){
    try{
      if(m._cid){
        NET._seenClaims = NET._seenClaims || [];
        if(NET._seenClaims.indexOf(m._cid) >= 0) return;
        NET._seenClaims.push(m._cid);
        if(NET._seenClaims.length > 60) NET._seenClaims.splice(0, NET._seenClaims.length - 60);
      }
    }catch(e){}
    if(match && match.state === 'playing' && match.cooldown <= 0){
      const P = match.players;
      const hunterIdx = P.findIndex(p => p.slot === m.from);
      if(hunterIdx !== -1){
        const hunterP = P[hunterIdx];
        if(match.hunterMode){
          if(hunterP.isHunter){
            const targetIdx = P.findIndex(p => p.slot === m.target);
            if(targetIdx !== -1){
              const tgtP = P[targetIdx];
              if(tgtP && tgtP.team !== hunterP.team && !tgtP.isHunter && !tgtP.isEliminated){
                let okClaim = false;
                try{
                  if(Number.isFinite(m.hx) && Number.isFinite(m.hy) && Number.isFinite(m.tx) && Number.isFinite(m.ty)){
                    let rtt = 0;
                    try{
                      rtt = (typeof NET.pings.get === 'function' ? (NET.pings.get(c.peer) || 0) : 0);
                      if(!rtt && NET.peerSlots && typeof NET.peerSlots.forEach === 'function'){
                        NET.peerSlots.forEach((sl, pid)=>{ if(sl === m.from && !rtt) rtt = NET.pings.get(pid) || 0; });
                      }
                    }catch(eRtt){}
                    const slack = 40 + 582 * Math.min(500, Math.max(0, rtt)) / 2000;
                    const pad = 5 + slack;
                    const hb = { x: m.hx - pad, y: m.hy - pad, w: 46 + 2 * pad, h: 46 + 2 * pad };
                    const tb = { x: m.tx - pad, y: m.ty - pad, w: 46 + 2 * pad, h: 46 + 2 * pad };
                    okClaim = hitRectInclusive(hb, tb);
                  } else {
                    const distSq = (hunterP.x - tgtP.x)**2 + (hunterP.y - tgtP.y)**2;
                    okClaim = (distSq < 45000);
                  }
                }catch(eClaim){
                  const distSq = (hunterP.x - tgtP.x)**2 + (hunterP.y - tgtP.y)**2;
                  okClaim = (distSq < 45000);
                }
                if(okClaim){
                  eliminateHunterRunner(hunterP, tgtP, m.x, m.y);
                }
              }
            }
          }
        } else {
          const isHunter = settings.teams ? (hunterP.team === match.itTeam) : (hunterIdx === match.it);
          if(isHunter){
            const targetIdx = P.findIndex(p => p.slot === m.target);
            if(targetIdx !== -1){
              const tgtP = P[targetIdx];
              const canTag = settings.teams ? (tgtP.team !== match.itTeam) : (targetIdx !== match.it);
              if(canTag && tgtP){
                // Claimer-view overlap check (kills >150px phantom tags): test the positions
                // the claimer actually saw, plus slack scaled by measured RTT. Legacy
                // claims without coords fall back to the old radius check.
                let okClaim = false;
                try{
                  if(Number.isFinite(m.hx) && Number.isFinite(m.hy) && Number.isFinite(m.tx) && Number.isFinite(m.ty)){
                    let rtt = 0;
                    try{
                      rtt = (typeof NET.pings.get === 'function' ? (NET.pings.get(c.peer) || 0) : 0);
                      if(!rtt && NET.peerSlots && typeof NET.peerSlots.forEach === 'function'){
                        NET.peerSlots.forEach((sl, pid)=>{ if(sl === m.from && !rtt) rtt = NET.pings.get(pid) || 0; });
                      }
                    }catch(eRtt){}
                    const slack = 40 + 582 * Math.min(500, Math.max(0, rtt)) / 2000; // 40px + IT_SPEED*RTT/2
                    const pad = 5 + slack;
                    const hb = { x: m.hx - pad, y: m.hy - pad, w: 46 + 2 * pad, h: 46 + 2 * pad };
                    const tb = { x: m.tx - pad, y: m.ty - pad, w: 46 + 2 * pad, h: 46 + 2 * pad };
                    okClaim = hitRectInclusive(hb, tb);
                  } else {
                    const distSq = (hunterP.x - tgtP.x)**2 + (hunterP.y - tgtP.y)**2;
                    okClaim = (distSq < 45000);
                  }
                }catch(eClaim){
                  const distSq = (hunterP.x - tgtP.x)**2 + (hunterP.y - tgtP.y)**2;
                  okClaim = (distSq < 45000);
                }
                if(okClaim){
                  applyTag(targetIdx, m.x, m.y);
                }
              }
            }
          }
        }
      }
    }
  } else if((m.t === 'crown_claim' || m.t === 'crown_steal') && NET.isHost){
    try{
      if(m._cid){
        NET._seenClaims = NET._seenClaims || [];
        if(NET._seenClaims.indexOf(m._cid) >= 0) return;
        NET._seenClaims.push(m._cid);
        if(NET._seenClaims.length > 60) NET._seenClaims.splice(0, NET._seenClaims.length - 60);
      }
    }catch(e){}
    if(match && match.state === 'playing' && typeof crownState !== 'undefined' && crownState && typeof claimCrown === 'function'){
      const P = match.players;
      const claimer = P.find(p => p.slot === m.from);
      if(claimer && !claimer.isEliminated){
        if(m.t === 'crown_claim' && !crownState.holder){
          claimCrown(claimer, false, m.x, m.y);
        } else if(m.t === 'crown_steal' && crownState.holder && crownState.immunityTimer <= 0){
          claimCrown(claimer, true, m.x, m.y);
        }
      }
    }
  } else if(m.t === 'hunter_vote' && NET.isHost){
    if(!NET.teamsLocked && m.voter >= 0 && m.voter < 8){
      if(match && (match.state === 'playing' || match.state === 'countdown' || match.state === 'paused')) return;
      if(!menu.hunterVotes) menu.hunterVotes = {};
      const vTeam = m.team != null ? m.team : ((menu.slotTeam ? menu.slotTeam[m.voter] : m.voter) % 2);
      menu.hunterVotes[m.voter] = { team: vTeam, cand: m.candidate };
      updateElectedHuntersFromVotes();
      netBroadcastReliable({
        t: 'hunter_votes_sync',
        hunterVotes: menu.hunterVotes,
        hunterRed: settings.hunterRed,
        hunterBlue: settings.hunterBlue
      });
      netBroadcastRoster();
    }
  } else if(m.t === 'hunter_votes_sync' && !NET.isHost){
    if(m.hunterVotes) menu.hunterVotes = { ...m.hunterVotes };
    if(m.hunterRed != null) settings.hunterRed = m.hunterRed;
    if(m.hunterBlue != null) settings.hunterBlue = m.hunterBlue;
    if(match){
      match.hunterRed = settings.hunterRed;
      match.hunterBlue = settings.hunterBlue;
    }
  } else if(m.t === 'map_vote' && NET.isHost){
    const V = menu.mapVote;
    if(!V || V.decided || !match || match.state !== 'result') return;
    const v = m.voter | 0;
    if(!(v >= 0 && v < 8) || menu.slotColor[v] < 0) return;
    if(NET.botSlots && NET.botSlots.indexOf(v) >= 0) return;
    const pk = m.pick | 0;
    if(pk < 0 || pk > 2 || !V.opts || V.opts.length < 3) return;
    V.seq++;
    V.votes[v] = { pick: pk, seq: V.seq };
    sfx('ui');
    broadcastMapVote();
  } else if(m.t === 'mode_request' && NET.isHost){
    const V = menu.mapVote;
    if(!V || V.decided || !match || match.state !== 'result') return;
    const v = m.voter | 0;
    if(!(v >= 0 && v < 8) || menu.slotColor[v] < 0) return;
    if(NET.botSlots && NET.botSlots.indexOf(v) >= 0) return;
    let ok = false;
    for(const md of MAPVOTE_MODES){ if(md.id === m.mode){ ok = true; break; } }
    if(!ok) return;
    if(m.mode === 'freeze') return;
    V.mseq++;
    V.modeReq[v] = { mode: m.mode, seq: V.mseq };
    sfx('ok');
    broadcastMapVote();
  } else if(m.t === 'mapvote_sync' && !NET.isHost){
    if(m.vote && match && match.state === 'result'){
      menu.mapVote = m.vote;
    }
  } else if(m.t === 'set_hunter' && NET.isHost){
    if(!NET.teamsLocked && m.slot >= 0 && m.slot < 8 && menu.slotColor[m.slot] >= 0){
      if(match && (match.state === 'playing' || match.state === 'countdown' || match.state === 'paused')) return;
      const t = (m.team != null ? m.team : ((menu.slotTeam ? menu.slotTeam[m.slot] : m.slot) % 2));
      if(t === 0) settings.hunterRed = m.slot;
      else settings.hunterBlue = m.slot;
      netBroadcastSettings();
      netBroadcastRoster();
    }
  } else if(m.t === 'hunter_catch' && !NET.isHost){
    if(match && match.hunterMode && match.players){
      const hunter = match.players.find(p => p.slot === m.hunterSlot);
      const runner = match.players.find(p => p.slot === m.runnerSlot);
      if(hunter && runner){
        eliminateHunterRunner(hunter, runner, m.x, m.y);
      }
    }
  } else if(m.t === 'hunter_score' && !NET.isHost){
    if(match){
      match.roundSummary = m.summary;
      if(m.summary && m.summary.cumulative){
        match.hunterScores = { ...m.summary.cumulative };
      }
      match.state = 'hunter_round_result';
      match.resultT = 0;
      // Career (guest device, one-shot): tournament titles/wins
      try{
        const s = m.summary;
        if(s && s.isMatchOver && !match._careerRecorded && NET.mySlot >= 0){
          const cum = s.cumulative || {};
          const myTeamG = (menu.slotTeam && menu.slotTeam[NET.mySlot] != null) ? menu.slotTeam[NET.mySlot] : (NET.mySlot % 2);
          const tiedG = (cum[0] === cum[1]);
          const wonG = !tiedG && ((cum[0] > cum[1] ? 0 : 1) === myTeamG);
          match._careerRecorded = true;
          CAREER.m++;
          if(wonG){ CAREER.w++; CAREER.titles++; CAREER.streak++; if(CAREER.streak > CAREER.bestStreak) CAREER.bestStreak = CAREER.streak; }
          else if(!tiedG){ CAREER.streak = 0; }
          saveCareer();
        }
      }catch(e){}
      confetti();
      sfx('win');
    }
  } else if(m.t === 'input' && NET.isHost){
    const ent = NET.hostInputs.get(m.slot);
    if(!ent || ent.owner !== c.peer) return;
    if(m.inputs && Array.isArray(m.inputs)){
      for(const inp of m.inputs){
        if(!inp || inp.seq <= ent.seq) continue;
        ent.seq = inp.seq; ent.dir = inp.dir | 0; ent.jumpHeld = !!inp.jumpHeld; ent.downHeld = !!inp.downHeld;
        if(inp.jumpEdge) ent.jumpQueue = Math.min(3, (ent.jumpQueue || 0) + 1);
      }
    } else {
      if(m.seq <= ent.seq) return;
      ent.seq = m.seq; ent.dir = m.dir | 0; ent.jumpHeld = !!m.jumpHeld; ent.downHeld = !!m.downHeld;
      if(m.jumpEdge) ent.jumpQueue = Math.min(3, (ent.jumpQueue || 0) + 1);
    }
  } else if(m.t === 'state' && !NET.isHost){
    if(!NET.isHost && NET.role==='guest' && c && c.peer && NET._hostId && c.peer!==NET._hostId) return;
    if(m.tick != null){
      if(m.tick <= NET.lastRecvTick) return;
      NET.lastRecvTick = m.tick;
    }
    NET.lastRecvT = performance.now();
    try{ NET._lastHostMsgT = performance.now(); NET._migrating = false; }catch(e){}
    if(m.settings){
      settings.map = m.settings.map; settings.doubleJump = m.settings.doubleJump; settings.collision = m.settings.collision;
      if(m.settings.teams != null) settings.teams = !!m.settings.teams;
      if(m.settings.gameMode) settings.gameMode = m.settings.gameMode;
      if(m.settings.ctfTargetCaptures != null) settings.ctfTargetCaptures = m.settings.ctfTargetCaptures;
    }
    if(match){
      if(m.hunterScores) match.hunterScores = { ...m.hunterScores };
      if(m.hunterRound != null) match.hunterRound = m.hunterRound;
      if(m.cageT != null) match.cageT = m.cageT;
      // Continuous mode clocks ride hot (fuse/hold/immunity), never the 2s cold cadence.
      if(m.fuse != null && typeof BOMB_MODE !== 'undefined' && BOMB_MODE){ BOMB_MODE.fuse = m.fuse; if(match) match.timer = m.fuse; }
      if(m.hold != null && typeof crownState !== 'undefined' && crownState){ crownState.holdTimer = m.hold; }
      if(m.cimm != null && typeof crownState !== 'undefined' && crownState){ crownState.immunityTimer = m.cimm; }
      if(m.result !== undefined) match.result = m.result;
      if(m.resultT !== undefined) match.resultT = m.resultT;
      if(m.roundSummary !== undefined) match.roundSummary = m.roundSummary;
      if(m.state){
        if(match.state === 'paused' && match.pausedFrom){
          // Guest is in the pause menu (e.g. about to leave): hold the screen,
          // keep syncing everything else below. Resume re-syncs on next packet.
        } else {
          if(match.state !== m.state){
            if(m.state === 'playing') sfx('go');
            if(m.state === 'result'){ confetti(); sfx('win'); }
          }
          match.state = m.state;
        }
      }
      if(m.cd != null) match.cd = m.cd;
      if(m.cdT != null) match.cdT = m.cdT;
      if(m.goFlash != null) match.goFlash = m.goFlash;
      if(m.tags) match.tags = m.tags.slice();
      if(m.shake && m.shake > match.shake) match.shake = m.shake;
      if(m.flash && m.flash > match.flash) match.flash = m.flash;
      if(m.payloadTagPop){
        if(!match.tagPop){
          sfx('tag');
          const itP = match.players[m.it];
          const col1 = itP && PALETTE[itP.colIdx] ? PALETTE[itP.colIdx].c : '#ffffff';
          tagBurst(m.payloadTagPop.x, m.payloadTagPop.y, col1, '#ffea88');
        }
        match.tagPop = m.payloadTagPop;
      }
      match.it = m.it;
      if(m.itTeam !== undefined) match.itTeam = m.itTeam;
      if(m.teamItTime) match.teamItTime = m.teamItTime.slice();
      // Host is authoritative: take freeze + cooldown from state (freeze was sent but ignored).
      // Cooldown only ever decreases host-side, so take max to avoid resurrecting expired debounce.
      if(m.freeze != null && m.freeze > (match.freeze || 0)) match.freeze = m.freeze;
      if(m.cooldown != null) match.cooldown = Math.max(match.cooldown || 0, m.cooldown);
      match.timer = m.timer;
      if(m.modeEnv && typeof applyModeState === 'function'){ try{ applyModeState(m.modeEnv); }catch(e){} }

      // Update all players
      if(m.players && Array.isArray(m.players)){
        const activeRemoteSlots = new Set();
        for(let i = 0; i < m.players.length; i++){
          const pData = unpackPlayer(m.players[i]);
          const slot = (pData.slot != null) ? pData.slot : i;

          if(slot === NET.mySlot){
            // Local player is self-authoritative for position, but sync elimination + mode flags from host!
            let myP = match.players.find(p => p.slot === slot);
            if(myP && pData.isEliminated !== undefined && pData.isEliminated !== myP.isEliminated){
              myP.isEliminated = !!pData.isEliminated;
            }
            if(myP){
              if(pData.isInfected !== undefined) myP.isInfected = !!pData.isInfected;
              if(pData.isPatientZero !== undefined) myP.isPatientZero = !!pData.isPatientZero;
              if(pData.isLoneSurvivor !== undefined) myP.isLoneSurvivor = !!pData.isLoneSurvivor;
              if(pData.crownPoints !== undefined) myP.crownPoints = pData.crownPoints;
              if(pData.underdogTimer !== undefined) myP.underdogTimer = pData.underdogTimer;
              if(pData.isFrozen !== undefined) myP.isFrozen = !!pData.isFrozen;
              if(pData.shieldT !== undefined) myP.shieldT = pData.shieldT;
              if(pData.isRespawning !== undefined) myP.isRespawning = !!pData.isRespawning;
            }
          } else {
            activeRemoteSlots.add(slot);
            let pObj = match.players.find(p => p.slot === slot);
            if(!pObj){
              const col = (menu.slotColor[slot] >= 0) ? menu.slotColor[slot] : (slot % PALETTE.length);
              pObj = makePlayer(match.players.length, slot, col);
              pObj.x = pData.x;
              pObj.y = pData.y;
              match.players.push(pObj);
              if(match.tags.length < match.players.length) match.tags.push(0);
            }
            if(pData.isEliminated !== undefined) pObj.isEliminated = !!pData.isEliminated;
            if(pData.isFrozen !== undefined) pObj.isFrozen = !!pData.isFrozen;
            if(pData.isInfected !== undefined) pObj.isInfected = !!pData.isInfected;
            if(pData.isPatientZero !== undefined) pObj.isPatientZero = !!pData.isPatientZero;
            if(pData.isLoneSurvivor !== undefined) pObj.isLoneSurvivor = !!pData.isLoneSurvivor;
            if(pData.crownPoints !== undefined) pObj.crownPoints = pData.crownPoints;
            if(pData.underdogTimer !== undefined) pObj.underdogTimer = pData.underdogTimer;
            if(pData.shieldT !== undefined) pObj.shieldT = pData.shieldT;
            if(pData.isRespawning !== undefined) pObj.isRespawning = !!pData.isRespawning;
            if(m.tick != null) pData.seq = m.tick;
            netUpdateRemoteTarget(slot, pData, pObj);
          }
        }
        if(match.players.length > m.players.length){
          match.players = match.players.filter(p => p.slot === NET.mySlot || activeRemoteSlots.has(p.slot));
        }
      }
      // Career (guest device, one-shot): party/teams result
      try{
        if(match.state === 'result' && !match._careerRecorded && match.result && NET.mySlot >= 0 && match.tags){
          const mi2 = match.players.findIndex(p => p.slot === NET.mySlot);
          if(mi2 >= 0){
            match._careerRecorded = true;
            const tg = match.tags[mi2] || 0;
            let won2 = false;
            if(match.result.winningTeam != null){ won2 = match.players[mi2].team === match.result.winningTeam; }
            else { won2 = (mi2 !== match.result.loser); }
            careerRecordMatch(won2, tg, null);
          }
        }
      }catch(e){}
    }
  } else if(m.t === 'start' && !NET.isHost){
    settings.map = m.settings.map | 0;
    settings.doubleJump = !!m.settings.doubleJump;
    settings.collision = !!m.settings.collision;
    if(m.settings.teams != null) settings.teams = !!m.settings.teams;
    if(m.settings.gameMode) settings.gameMode = m.settings.gameMode;
    if(m.settings.ctfTargetCaptures != null) settings.ctfTargetCaptures = m.settings.ctfTargetCaptures;
    if(m.settings.hunterRed != null) settings.hunterRed = m.settings.hunterRed;
    if(m.settings.hunterBlue != null) settings.hunterBlue = m.settings.hunterBlue;
    if(m.settings.slotColor) menu.slotColor = m.settings.slotColor.slice();
    if(m.settings.slotTeam) menu.slotTeam = m.settings.slotTeam.slice();
    if(m.mapData) MAPS[settings.map % MAPS.length] = m.mapData;
    buildLevel();
    startMatchNetGuest(m.payload);
    netShow(false);
  } else if(m.t === 'to_menu' && !NET.isHost){
    match = null;
    screen = 'menu';
    menu.tab = 'online';
  } else if(m.t === 'kicked' && !NET.isHost){
    netToast('You were removed from the room.');
    netLeaveRoom();
  } else if(m.t === 'full'){
    // Old-host compat: room-full redirect (new hosts send spectator_init instead)
    netToast('Room is full.');
    netLeaveRoom();
  } else if(m.t === 'toast'){
    netToast(m.msg || '');
  } else if(m.t === 'voice_req'){
    try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled)return;}catch(e){}
    const peerId = m.peerId || c.peer;
    if(VOICE.enabled && VOICE.localStream){
      voiceCallPeer(peerId, false);
    } else if(m.hasStream){
      c.send({ t: 'voice_guest_call', peerId: NET.myId });
    }
  } else if(m.t === 'voice_guest_call'){
    try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled)return;}catch(e){}
    const peerId = m.peerId || c.peer;
    if(VOICE.enabled && VOICE.localStream){
      voiceCallPeer(peerId, false);
    }
  } else if(m.t === 'voice_mute'){
    const peerEntry = VOICE.peers.get(c.peer) || VOICE.peers.get(m.peerId);
    if(peerEntry){
      peerEntry.remoteMuted = !!m.muted;
      if(m.muted) peerEntry.speaking = false;
    }
  }
}

/* In-Game Text Chat UI Manager */
function netAddChatMessage(author, text, color){
  try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled)return;}catch(e){}
  const logs = document.getElementById('chatLogs');
  if(!logs) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'chatMsg';
  const authorSpan = document.createElement('span');
  authorSpan.className = 'author';
  authorSpan.style.color = color || '#38bdf8';
  authorSpan.textContent = author + ': ';
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  msgEl.appendChild(authorSpan);
  msgEl.appendChild(textSpan);
  logs.appendChild(msgEl);
  logs.scrollTop = logs.scrollHeight;

  // Auto-expire chat message display after 9 seconds if chat box is not active
  setTimeout(() => {
    if(!document.getElementById('chatUI').classList.contains('active')){
      msgEl.style.transition = 'opacity 0.6s ease';
      msgEl.style.opacity = '0';
      setTimeout(() => { try { msgEl.remove(); }catch(e){} }, 600);
    }
  }, 9000);
}

function netSendChat(text){
  try{if(typeof CG!=='undefined'&&CG&&CG.chatDisabled){netToast('Chat is disabled on this portal');return;}}catch(e){}
  const clean = cleanText(text).trim().slice(0, 120);
  if(!clean) return;
  const myProfile = netGetMyProfile();
  const myCol = (NET.mySlot >= 0 && menu.slotColor[NET.mySlot] >= 0) ? PALETTE[menu.slotColor[NET.mySlot]].c : '#2ecc71';
  netAddChatMessage(myProfile.name, clean, myCol);

  if(NET.isHost){
    netBroadcastReliable({ t: 'chat', name: myProfile.name, text: clean, color: myCol, sender: NET.myId || 'host' });
  } else {
    for(const pair of NET.conns.values()){
      netSendRel(pair, { t: 'chat', name: myProfile.name, text: clean, color: myCol, sender: NET.myId });
    }
  }
}

function chatToggle(){
  const chatUI = document.getElementById('chatUI');
  const chatInp = document.getElementById('chatInput');
  if(!chatUI || !chatInp) return;
  const isActive = chatUI.classList.contains('active');
  if(isActive){
    const v = chatInp.value.trim();
    if(v) netSendChat(v);
    chatInp.value = '';
    chatInp.blur();
    chatUI.classList.remove('active');
  } else {
    chatUI.classList.add('active');
    setTimeout(() => { chatInp.focus(); }, 15);
  }
}
window.chatToggle = chatToggle;

/* Host Signaling Server Directory Updates & Heartbeats */
function netUpdateHostDirectory(){
  if(!NET.isHost || !NET.room) return;
  const serverUrl = netDirBase();
  const activeCount = menu.slotColor.filter(c => c >= 0).length;
  // Report the ACTUAL signaling endpoint this host is reachable on (post
  // cloud-fallback truth), not just the probe-preferred one — otherwise
  // guests joining from the directory always miss and rebuild (slow joins).
  let _dirSrv = '', _dirCloud = false;
  try{
    const asrv = NET._activeSrv;
    if(asrv && asrv.cloud){ _dirCloud = true; }
    else if(asrv && asrv.host){ _dirSrv = asrv.host; }
    else if(NET._onCloud){ _dirCloud = true; }
    else if(NET._srv && NET._srv.host){ _dirSrv = NET._srv.host; }
    else {
      const hh = ((typeof PEER_SERVER_CONFIG !== 'undefined' ? PEER_SERVER_CONFIG.host : '') || '');
      if(hh) _dirSrv = hh;
    }
  }catch(e){}
  const payload = {
    roomId: NET.room,
    name: (NET.slotsName[0] || 'Host') + "'s Arena",
    hostName: NET.slotsName[0] || 'Host',
    hostPeerId: NET._hostId || NET.myId || '',
    isPublic: !!NET.isPublic,
    isLocked: !!NET.lobbyLocked,
    players: activeCount,
    maxPlayers: NET.maxPlayers || MAXP,
    map: settings.map,
    teams: !!settings.teams,
    state: (match && screen === 'game') ? 'playing' : 'lobby',
    srv: _dirSrv,
    cloud: _dirCloud
  };
  try {
    // One retry: the first POST often dies to Render cold-start, and a lost
    // update makes a live room invisible in the directory until next heartbeat.
    const doUpdate = (retryLeft) => {
      fetch(serverUrl + '/api/rooms/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => {
        if((!r || !r.ok) && retryLeft > 0){ setTimeout(() => { try{ doUpdate(retryLeft - 1); }catch(e){} }, 2000); }
      }).catch(() => {
        if(retryLeft > 0){ setTimeout(() => { try{ doUpdate(retryLeft - 1); }catch(e){} }, 2000); }
      });
    };
    doUpdate(1);
  } catch(e){}

  // CrazyGames SDK v3 updateRoom (object form; locked/full rooms are not joinable)
  try {
    const pList = [];
    for(let i=0; i<MAXP; i++){
      if(menu.slotColor[i] >= 0){
        pList.push({ id: 'p' + i, username: NET.slotsName[i] || ('Player ' + (i+1)) });
      }
    }
    let joinable = true;
    try{
      if(NET.lobbyLocked) joinable = false;
      else if(pList.length >= (NET.maxPlayers || MAXP)) joinable = false;
    }catch(e){}
    if(typeof CG!=='undefined'&&CG&&typeof CG.updateRoom==='function')CG.updateRoom(NET.room, pList, joinable);
  } catch(e){}
}

/* Public Room Browser directory fetch */
async function netFetchPublicRooms(){
  const now = performance.now();
  if(now - NET.lastRoomFetch < 2000) return NET.publicRooms;
  if(NET._roomsFetching) return NET.publicRooms; // Refresh spam: reuse in-flight fetch
  NET._roomsFetching = true;
  try{ netProbeServers(); }catch(e){} // background refresh of self/render pick while browsing
  try{ netProbeRelayCapable(); }catch(e){} // pre-warm so the 3.5s join decision is ready
  const serverUrl = netDirBase();
  try {
    // Throttle applies to successful fetches only: a failed fetch must not
    // make Refresh a 3s no-op, or the list wrongly stays empty.
    let ctrl = null;
    try{ if(typeof AbortController !== 'undefined') ctrl = new AbortController(); }catch(e){ ctrl = null; }
    const opts = {};
    if(ctrl) opts.signal = ctrl.signal;
    const to = setTimeout(() => { try{ if(ctrl) ctrl.abort(); }catch(e){} }, 2500);
    const res = await fetch(serverUrl + '/api/rooms', opts);
    clearTimeout(to);
    if(res.ok){
      const data = await res.json();
      NET.publicRooms = data.rooms || [];
      NET.lastRoomFetch = performance.now();
    }
  } catch(e){}
  try{ NET._roomsFetching = false; }catch(e){}
  return NET.publicRooms;
}

/* Host Controls: Kick, Admit Spectator, Lock Lobby, Lock Teams, Swap Teams */
function netKickPlayer(slotOrPeer){
  if(!NET.isHost) return;
  let targetPeer = null;
  let targetSlot = -1;
  if(typeof slotOrPeer === 'number'){
    targetSlot = slotOrPeer;
    for(const [pid, s] of NET.peerSlots.entries()){
      if(s === targetSlot){ targetPeer = pid; break; }
    }
  } else {
    targetPeer = slotOrPeer;
    targetSlot = NET.peerSlots.get(targetPeer) || -1;
  }
  if(targetPeer){
    const pair = NET.conns.get(targetPeer);
    if(pair) netSendRel(pair, { t: 'kicked' });
  }
  let wasBot = false;
  let kickName = '';
  try{ kickName = (targetSlot > 0 && NET.slotsName[targetSlot]) ? NET.slotsName[targetSlot] : (NET.peerNames.get(targetPeer) || 'Player'); }catch(e){}
  if(targetSlot > 0){
    NET.hostInputs.delete(targetSlot);
    menu.slotColor[targetSlot] = -1;
    NET.slotsReady[targetSlot] = false;
    NET.slotsName[targetSlot] = '';
    _remoteTargets.delete(targetSlot);
    if(NET.botSlots && NET.botSlots.includes(targetSlot)){
      wasBot = true;
      NET.botSlots = NET.botSlots.filter(s => s !== targetSlot);
    }
    if(settings.gameMode === 'hunter'){
      if(menu.hunterVotes){
        delete menu.hunterVotes[targetSlot];
        for(const k of Object.keys(menu.hunterVotes)){
          if(menu.hunterVotes[k] === targetSlot) delete menu.hunterVotes[k];
        }
      }
      enforceHunterBalance();
      validateHunterRoles();
    }
  }
  if(targetPeer){
    NET.peerSlots.delete(targetPeer);
    NET.peerNames.delete(targetPeer);
    try{ netForgetPeer(targetPeer); }catch(e){}
    NET.pings.delete(targetPeer);
    NET.spectators = NET.spectators.filter(s => s.peerId !== targetPeer);
  }
  netBroadcastSettings();
  netBroadcastRoster();
  netUpdateHostDirectory();
  netToast(wasBot ? '🤖 Bot removed' : 'Player removed');
  try{ if(!wasBot && targetPeer && typeof netNotifyPlayerLeftLobby === 'function') netNotifyPlayerLeftLobby(kickName + ' (kicked)', targetSlot, targetPeer, targetSlot > 0); }catch(e){}
}

function netAdmitSpectator(peerId, targetSlot, teamIdx){
  if(!NET.isHost) return;
  const specIdx = NET.spectators.findIndex(s => s.peerId === peerId);
  if(specIdx === -1) return;
  const spec = NET.spectators[specIdx];

  // Find open slot (prioritize targetSlot if specified and available)
  let slot = -1;
  if(targetSlot != null && targetSlot >= 1 && targetSlot < MAXP && !NET.hostInputs.has(targetSlot) && menu.slotColor[targetSlot] === -1){
    slot = targetSlot;
  } else {
    for(let i=1; i<MAXP; i++){
      if(!NET.hostInputs.has(i) && menu.slotColor[i] === -1){
        slot = i;
        break;
      }
    }
  }
  if(slot === -1){
    netToast('No open slots available (10 players max)');
    return;
  }

  NET.spectators.splice(specIdx, 1);
  NET.hostInputs.set(slot, { dir:0, jumpEdge:false, jumpHeld:false, downHeld:false, consumeEdge:false, owner: peerId, seq: 0 });
  NET.peerSlots.set(peerId, slot);
  NET.slotsCtrl[slot] = 'WASD';
  NET.slotsReady[slot] = false;
  NET.slotsName[slot] = getUniqueGuestName(spec.name, slot);

  const taken = menu.slotColor.filter(v => v >= 0);
  let pick = -1;
  for(let pi=0; pi<PALETTE.length; pi++){
    if(!taken.includes(pi)){ pick = pi; break; }
  }
  if(pick === -1) pick = slot % PALETTE.length;
  menu.slotColor[slot] = pick;
  // Honor the requested team panel (falls back to minority on ±1 clash)
  if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  let wantAdmit = (teamIdx === 0 || teamIdx === 1) ? teamIdx : -1;
  if(wantAdmit < 0){
    let r0 = 0, b0 = 0;
    for(const s of activeSlots()){ if(s === slot) continue; (((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === 0) ? r0++ : b0++; }
    wantAdmit = (r0 <= b0) ? 0 : 1;
  } else if(settings.gameMode === 'hunter'){
    let r0 = 0, b0 = 0;
    for(const s of activeSlots()){ if(s === slot) continue; (((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === 0) ? r0++ : b0++; }
    if(Math.abs((r0 + (wantAdmit === 0 ? 1 : 0)) - (b0 + (wantAdmit === 1 ? 1 : 0))) > 1){
      wantAdmit = (r0 <= b0) ? 0 : 1;
    }
  }
  menu.slotTeam[slot] = wantAdmit;
  if(settings.gameMode === 'hunter'){
    enforceHunterBalance();
    validateHunterRoles();
  }

  const pair = NET.conns.get(peerId);
  if(pair){
    const slotsPeer = [NET.myId || '', '', '', '', '', '', '', '', '', ''];
    for(let i=1; i<MAXP; i++){
      const ent = NET.hostInputs.get(i);
      if(ent && ent.owner) slotsPeer[i] = ent.owner;
    }
    netSendRel(pair, {
      t: 'assign',
      slot: slot,
      settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterRotate: settings.hunterRotate, slotColor: menu.slotColor.slice(), slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []) },
      mapData: MAPS[settings.map % MAPS.length],
      slotsCtrl: NET.slotsCtrl.slice(),
      slotsReady: NET.slotsReady.slice(),
      slotsName: NET.slotsName.slice(),
      botSlots: NET.botSlots ? NET.botSlots.slice() : [],
      slotsPeer: slotsPeer
    });
  }

  netBroadcastSettings();
  netBroadcastRoster();
  netUpdateHostDirectory();
  netToast((spec.name || 'Spectator') + ' admitted as P' + (slot+1));
}

function netAddBot(preferredSlot, preferredTeam){
  if(typeof NET === 'undefined' || !NET || !NET.isHost) return;
  if(!NET.botSlots) NET.botSlots = [];
  if(NET.botSlots.length >= 2){
    netToast('Max 2 bots in online lobby!');
    sfx('back');
    return;
  }
  // Find open slot (1 to 9)
  let targetSlot = -1;
  if(preferredSlot != null && preferredSlot >= 1 && preferredSlot < MAXP && menu.slotColor[preferredSlot] === -1 && !NET.hostInputs.has(preferredSlot) && !NET.botSlots.includes(preferredSlot)){
    targetSlot = preferredSlot;
  } else {
    for(let s = 1; s < MAXP; s++){
      if(menu.slotColor[s] === -1 && !NET.hostInputs.has(s) && !NET.botSlots.includes(s)){
        targetSlot = s;
        break;
      }
    }
  }
  if(targetSlot === -1){
    netToast('Lobby is full! (10 players max)');
    sfx('back');
    return;
  }

  // Clear 5-sec autofill timer if pending
  if(typeof _botAutofillTimer !== 'undefined' && _botAutofillTimer){
    clearTimeout(_botAutofillTimer);
    _botAutofillTimer = null;
  }

  // Pick unique color from PALETTE
  const taken = menu.slotColor.filter(v => v >= 0);
  let pick = -1;
  for(let pi = 0; pi < PALETTE.length; pi++){
    if(!taken.includes(pi)){ pick = pi; break; }
  }
  if(pick === -1) pick = targetSlot % PALETTE.length;
  menu.slotColor[targetSlot] = pick;

  // Assign team (balance if teams or hunter mode)
  if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  let wantTeam = (preferredTeam === 0 || preferredTeam === 1) ? preferredTeam : -1;
  if(wantTeam < 0){
    let r0 = 0, b0 = 0;
    for(const s of activeSlots()){
      if(s === targetSlot) continue;
      (((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === 0) ? r0++ : b0++;
    }
    wantTeam = (r0 <= b0) ? 0 : 1;
  } else if(settings.gameMode === 'hunter'){
    let r0 = 0, b0 = 0;
    for(const s of activeSlots()){
      if(s === targetSlot) continue;
      (((menu.slotTeam ? menu.slotTeam[s] : s) % 2) === 0) ? r0++ : b0++;
    }
    if(Math.abs((r0 + (wantTeam === 0 ? 1 : 0)) - (b0 + (wantTeam === 1 ? 1 : 0))) > 1){
      wantTeam = (r0 <= b0) ? 0 : 1;
    }
  }
  menu.slotTeam[targetSlot] = wantTeam;

  NET.slotsCtrl[targetSlot] = 'CPU';
  NET.slotsReady[targetSlot] = true;
  const botNum = NET.botSlots.length + 1;
  NET.slotsName[targetSlot] = '🤖 HARD BOT ' + botNum;
  NET.botSlots.push(targetSlot);
  settings.botDifficulty = 'hard';
  menu.botDifficulty = 'hard';

  if(settings.gameMode === 'hunter'){
    enforceHunterBalance();
    validateHunterRoles();
  }

  buildLevel();
  netBroadcastSettings();
  netBroadcastRoster();
  netUpdateHostDirectory();
  sfx('ok');
  netToast('🤖 Added Bot to slot P' + (targetSlot + 1));
}

function netRemoveBot(slot){
  if(typeof NET === 'undefined' || !NET || !NET.isHost) return;
  if(slot != null){
    if(NET.botSlots && NET.botSlots.includes(slot)){
      netKickPlayer(slot);
    }
  } else if(NET.botSlots && NET.botSlots.length > 0){
    const lastBot = NET.botSlots[NET.botSlots.length - 1];
    netKickPlayer(lastBot);
  }
}

function netClaimSlot(s, teamIdx){
  if(s < 1 || s >= MAXP) return;
  if(NET.isHost){
    if(NET.spectators && NET.spectators.length > 0){
      netAdmitSpectator(NET.spectators[0].peerId, s, teamIdx);
    } else {
      netCopyLink();
    }
    return;
  }
  if(NET.lobbyLocked){
    netToast('Lobby is locked by the host.');
    return;
  }
  for(const pair of NET.conns.values()){
    netSendRel(pair, { t: 'claim_slot', slot: s, team: (teamIdx === 0 || teamIdx === 1) ? teamIdx : undefined });
  }
  sfx('go');
  netToast('Joining ' + (teamIdx === 0 ? 'RED...' : (teamIdx === 1 ? 'BLUE...' : ('slot P' + (s + 1) + '...'))));
}

function netRequestJoinGame(){
  if(NET.role === null) return;
  if(NET.isHost){
    netHostToggleSpectate();
    return;
  }
  if(NET.lobbyLocked){
    netToast('Lobby is locked by the host.');
    return;
  }
  let openSlot = -1;
  for(let s=1; s<MAXP; s++){
    if(menu.slotColor[s] === -1){
      openSlot = s;
      break;
    }
  }
  if(openSlot === -1){
    netToast('All player slots are full!');
    return;
  }
  netClaimSlot(openSlot);
}

function netHostToggleSpectate(){
  if(!NET.isHost) return;
  const wasSpectator = !!NET.isSpectator;
  if(!wasSpectator){
    // Host switches to Spectator
    NET.isSpectator = true;
    NET.mySlot = -1;
    menu.slotColor[0] = -1;
    NET.slotsReady[0] = false;
    NET.slotsName[0] = '';
    const myProfile = netGetMyProfile();
    if(!NET.spectators) NET.spectators = [];
    if(!NET.spectators.some(sp => sp.peerId === (NET.myId || 'host'))){
      NET.spectators.unshift({ peerId: NET.myId || 'host', name: (myProfile.name || 'Host') + ' (Host)' });
    }
    sfx('back');
    netToast('Host switched to 👁️ Spectator Mode');
  } else {
    // Host switches back to Playing: reclaim Slot 0 (or first open slot)
    let claimSlot = 0;
    if(menu.slotColor[0] !== -1){
      for(let s = 0; s < MAXP; s++){
        if(menu.slotColor[s] === -1 && !NET.hostInputs.has(s)){
          claimSlot = s;
          break;
        }
      }
    }
    NET.isSpectator = false;
    NET.mySlot = claimSlot;
    const taken = menu.slotColor.filter(c => c >= 0);
    let pick = -1;
    for(let p = 0; p < PALETTE.length; p++){
      if(!taken.includes(p)){ pick = p; break; }
    }
    menu.slotColor[claimSlot] = (pick >= 0 ? pick : claimSlot % PALETTE.length);
    NET.slotsReady[claimSlot] = true;
    const myProfile = netGetMyProfile();
    NET.slotsName[claimSlot] = myProfile.name || 'Host';
    if(NET.spectators){
      NET.spectators = NET.spectators.filter(sp => sp.peerId !== (NET.myId || 'host'));
    }
    sfx('go');
    netToast('Host joined as Player (' + (claimSlot === 0 ? 'P1' : ('P' + (claimSlot+1))) + ')');
  }
  netBroadcastSettings();
  netBroadcastRoster();
}

function netRequestSpectate(){
  if(NET.role === null) return;
  if(NET.isHost){
    netHostToggleSpectate();
    return;
  }
  if(NET.isSpectator || NET.mySlot === -1){
    netToast('Already spectating.');
    return;
  }
  for(const pair of NET.conns.values()){
    netSendRel(pair, { t: 'to_spectator' });
  }
  sfx('back');
  netToast('Moved to Spectators.');
}

function netMovePlayerToWaitlist(slot){
  if(!NET.isHost || slot <= 0 || slot >= MAXP) return;
  if(menu.slotColor[slot] < 0) return;

  let targetPeer = null;
  for(const [pid, s] of NET.peerSlots.entries()){
    if(s === slot){ targetPeer = pid; break; }
  }
  if(!targetPeer) return;

  const pName = NET.slotsName[slot] || ('Guest ' + (slot+1));
  if(!NET.spectators) NET.spectators = [];
  if(!NET.spectators.some(sp => sp.peerId === targetPeer)){
    NET.spectators.push({ peerId: targetPeer, name: pName });
  }

  NET.hostInputs.delete(slot);
  menu.slotColor[slot] = -1;
  NET.slotsReady[slot] = false;
  NET.slotsName[slot] = '';
  NET.peerSlots.delete(targetPeer);
  if(typeof _remoteTargets !== 'undefined') _remoteTargets.delete(slot);

  const pair = NET.conns.get(targetPeer);
  if(pair){
    netSendRel(pair, {
      t: 'spectator_init',
      settings: {
        map: settings.map,
        doubleJump: settings.doubleJump,
        collision: settings.collision,
        teams: settings.teams,
        gameMode: settings.gameMode,
        hunterRed: settings.hunterRed,
        hunterBlue: settings.hunterBlue,
        hunterRotate: settings.hunterRotate,
        slotColor: menu.slotColor.slice(),
        slotTeam: menu.slotTeam.slice(),
        ready: NET.slotsReady.slice(),
        names: NET.slotsName.slice()
      }
    });
  }
  sfx('ui');
  netBroadcastSettings();
  netBroadcastRoster();
  netUpdateHostDirectory();
  netToast(pName + ' moved to waitlist');
}

function netSwapPlayerTeam(slot){
  if(!NET.isHost || NET.teamsLocked || slot < 0 || slot >= MAXP) return;
  if(menu.slotColor[slot] < 0) return;
  if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  const targetTeam = ((menu.slotTeam[slot] || 0) + 1) % TEAMS.length;

  menu.slotTeam[slot] = targetTeam;
  sfx('ui');
  if(settings.gameMode === 'hunter') updateElectedHuntersFromVotes();
  netBroadcastRoster();
}

function netSetPlayerTeam(slot, teamIdx){
  if(!NET.isHost || slot < 0 || slot >= MAXP) return;
  if(menu.slotColor[slot] < 0) return;
  if(!menu.slotTeam) menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  const targetTeam = teamIdx % TEAMS.length;

  menu.slotTeam[slot] = targetTeam;
  sfx('ok');
  if(settings.gameMode === 'hunter') updateElectedHuntersFromVotes();
  netBroadcastRoster();
  netToast((NET.slotsName[slot] || ('P' + (slot+1))) + ' moved to ' + TEAMS[targetTeam].name);
}

function netLockTeams(lock){
  if(!NET.isHost) return;
  NET.teamsLocked = !!lock;
  sfx('ui');
  netBroadcastRoster();
  netToast(NET.teamsLocked ? 'Teams locked by Host 🔒' : 'Teams unlocked 🔓');
}

function netLockLobby(lock){
  if(!NET.isHost) return;
  NET.lobbyLocked = !!lock;
  sfx('ui');
  netBroadcastRoster();
  netUpdateHostDirectory();
  netToast(NET.lobbyLocked ? 'Lobby locked to new players 🔒' : 'Lobby open to new players 🔓');
}

/* 15-Second AFK Ready Countdown & Force Start */
let _readyTimerInterval = null;
let _botAutofillTimer = null;
function netCheckReadyCountdown(){
  if(!NET.isHost || (match && screen === 'game')) return;
  const activeCount = menu.slotColor.filter(c => c >= 0).length;
  if(activeCount < 2){
    NET.readyCountdown = null;
    return;
  }
  // Check if at least 1 guest is ready
  let anyGuestReady = false;
  for(let i=1; i<MAXP; i++){
    if(NET.isHost && i === NET.mySlot) continue;
    if(menu.slotColor[i] >= 0 && NET.slotsReady[i]){
      anyGuestReady = true;
      break;
    }
  }
  if(anyGuestReady && NET.readyCountdown === null){
    NET.readyCountdown = 15;
    if(_readyTimerInterval) clearInterval(_readyTimerInterval);
    _readyTimerInterval = setInterval(() => {
      if(NET.readyCountdown === null || NET.role !== 'host' || (match && screen === 'game')){
        clearInterval(_readyTimerInterval);
        _readyTimerInterval = null;
        return;
      }
      NET.readyCountdown--;
      netBroadcastRoster();
      if(NET.readyCountdown <= 0){
        clearInterval(_readyTimerInterval);
        _readyTimerInterval = null;
        netAutoDemoteAndStart();
      }
    }, 1000);
  }
}

function netAutoDemoteAndStart(){
  if(!NET.isHost) return;
  // Demote unready guests to spectators
  for(let i=1; i<MAXP; i++){
    if(NET.isHost && i === NET.mySlot) continue;
    if(menu.slotColor[i] >= 0 && !NET.slotsReady[i]){
      const ent = NET.hostInputs.get(i);
      const peerId = ent ? ent.owner : null;
      if(peerId){
        const pName = NET.slotsName[i] || 'Player';
        NET.spectators.push({ peerId: peerId, name: pName, avatar: '' });
        const pair = NET.conns.get(peerId);
        if(pair){
          netSendRel(pair, {
            t: 'spectator_init',
            room: NET.room,
            hostName: NET.slotsName[0] || 'Host',
            settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterRotate: settings.hunterRotate, slotColor: menu.slotColor.slice(), slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []) },
            mapData: MAPS[settings.map % MAPS.length],
            spectating: true
          });
        }
      }
      NET.hostInputs.delete(i);
      menu.slotColor[i] = -1;
      NET.slotsReady[i] = false;
      NET.slotsName[i] = '';
      _remoteTargets.delete(i);
    }
  }
  netBroadcastRoster();
  netForceStart();
}

function netForceStart(){
  if(!NET.isHost) return;
  const activeCount = menu.slotColor.filter(c => c >= 0).length;
  const isHunter = (settings.gameMode === 'hunter');
  const isTeamMode = (settings.teams || isHunter || settings.gameMode === 'teams');
  if(isHunter){
    validateHunterRoles();
    if(activeCount < 4){
      netToast('🎯 HUNTER MODE REQUIRES AT LEAST 4 PLAYERS!');
      return;
    }
  }
  if(isTeamMode && activeCount >= 2){
    const act = activeSlots();
    let redCount = 0, blueCount = 0;
    for(const s of act){
      const t = (menu.slotTeam && menu.slotTeam[s] != null) ? (menu.slotTeam[s] % 2) : (s % 2);
      if(t === 0) redCount++; else blueCount++;
    }
    if(Math.abs(redCount - blueCount) > 1){
      netToast('⚠️ TEAMS MUST BE BALANCED (MAX ±1 DIFFERENCE)');
      return;
    }
  } else if(settings.gameMode === 'freeze' && activeCount < 3){
    netToast('⚠️ FREEZE REQUIRES AT LEAST 3 PLAYERS!');
    return;
  } else if(activeCount < 2){
    netToast('Need at least 2 players to start');
    return;
  }
  NET.readyCountdown = null;
  sfx('go');
  startMatch();
}

function netBroadcastSettings(){
  if(!NET.isHost) return;
  const payload = { settings: { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode, ctfTargetCaptures: settings.ctfTargetCaptures, hunterRed: settings.hunterRed, hunterBlue: settings.hunterBlue, hunterRotate: settings.hunterRotate, slotColor: menu.slotColor.slice(), slotTeam: (menu.slotTeam ? menu.slotTeam.slice() : []) }, mapData: MAPS[settings.map % MAPS.length] };
  netBroadcastReliable({ t: 'settings', settings: payload.settings, mapData: payload.mapData });
}

function netBroadcastRoster(){
  if(!NET.isHost) return;
  const slotsPeer = ['', '', '', '', '', '', '', '', '', ''];
  if(!NET.isSpectator && NET.mySlot >= 0 && NET.mySlot < MAXP){
    slotsPeer[NET.mySlot] = NET.myId || '';
  }
  for(let i=0; i<MAXP; i++){
    const ent = NET.hostInputs.get(i);
    if(ent && ent.owner) slotsPeer[i] = ent.owner;
  }
  // Convert pings Map to object for serializing
  const pingsObj = {};
  for(const [pid, pingVal] of NET.pings.entries()){
    pingsObj[pid] = pingVal;
  }
  const msg = {
    t: 'roster_sync',
    slotsCtrl: NET.slotsCtrl.slice(),
    slotsReady: NET.slotsReady.slice(),
    slotsName: NET.slotsName.slice(),
    slotColor: menu.slotColor.slice(),
    slotTeam: menu.slotTeam ? menu.slotTeam.slice() : [],
    slotsPeer: slotsPeer,
    spectators: NET.spectators.slice(),
    lobbyLocked: !!NET.lobbyLocked,
    teamsLocked: !!NET.teamsLocked,
    readyCountdown: NET.readyCountdown,
    botSlots: NET.botSlots ? NET.botSlots.slice() : [],
    hunterRed: settings.hunterRed,
    hunterBlue: settings.hunterBlue,
    hunterVotes: menu.hunterVotes ? { ...menu.hunterVotes } : {},
    pings: pingsObj
  };
  netBroadcastReliable(msg);
  try{if(typeof netUpdateHostDirectory==='function')netUpdateHostDirectory();}catch(e){}
}

function netBroadcastState(state){
  for(const pair of NET.conns.values()){
    netSendFast(pair, { t: 'state', ...state });
  }
}

function netToggleMyReady(){
  if(NET.role === null) return;
  const mySlot = NET.mySlot;
  if(mySlot < 0 || mySlot >= MAXP) return;
  const newReady = !NET.slotsReady[mySlot];
  NET.slotsReady[mySlot] = newReady;
  sfx('ui');
  if(NET.isHost){
    netBroadcastRoster();
    netCheckReadyCountdown();
  } else {
    for(const pair of NET.conns.values()){
      netSendRel(pair, { t: 'ready', slot: mySlot, ready: newReady });
    }
  }
}

function netCycleMyControl(){
  const curIdx = CTRL_SCHEMES.indexOf(NET.myCtrl);
  const nextScheme = CTRL_SCHEMES[(curIdx + 1) % CTRL_SCHEMES.length];
  NET.myCtrl = nextScheme;
  sfx('ui');
  const mySlot = NET.mySlot;
  if(mySlot >= 0 && mySlot < MAXP){
    NET.slotsCtrl[mySlot] = nextScheme;
    if(NET.isHost){
      netBroadcastRoster();
    } else {
      for(const pair of NET.conns.values()){
        netSendRel(pair, { t: 'ctrl', slot: mySlot, ctrl: nextScheme });
      }
    }
  }
}

function netCycleMyColor(d){
  if(NET.role === null || NET.isHost || NET.teamsLocked) return;
  const slot = NET.mySlot;
  if(slot < 0) return;
  const taken = menu.slotColor.filter((c, k) => c >= 0 && k !== slot);
  const list = PALETTE.map((p, idx) => idx).filter(idx => taken.indexOf(idx) < 0);
  if(list.length === 0) return;
  let cur = list.indexOf(menu.slotColor[slot]);
  cur = (cur + d + list.length) % list.length;
  menu.slotColor[slot] = list[cur];
  buildLevel();
  sfx('ui');
  for(const pair of NET.conns.values()){
    netSendRel(pair, { t: 'color', slot: slot, color: list[cur] });
  }
}

function netHostAction(isPublic = true){
  // Clean re-host: close the previous room and drop its session state, so a
  // new room never inherits stale guests, timers, or directory ghosts. The
  // host lobby stays put — never bounce to the public directory.
  try{
    if(NET && NET.room && NET.role !== null){
      try{ fetch(netDirBase() + '/api/rooms/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: NET.room }), keepalive: true }).catch(()=>{}); }catch(e){}
    }
  }catch(e){}
  try{
    for(const pair of NET.conns.values()){ try{ pair.rel && pair.rel.close(); }catch(e){} try{ pair.fast && pair.fast.close(); }catch(e){} }
  }catch(e){}
  try{ NET.conns.clear(); NET.hostInputs.clear(); }catch(e){}
  try{ if(NET.peerSlots) NET.peerSlots.clear(); if(NET.peerNames) NET.peerNames.clear(); if(NET.pings) NET.pings.clear(); }catch(e){}
  try{ if(NET.peerPid) NET.peerPid.clear(); if(NET.peerSess) NET.peerSess.clear(); }catch(e){}
  try{ NET._lobbyDup = {}; }catch(e){}
  try{ if(NET._fallbackTimer){ clearTimeout(NET._fallbackTimer); NET._fallbackTimer = null; } }catch(e){}
  try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}
  try{ NET._srvRetry = 0; NET._p2pRetry = 0; NET._syncExt = 0; NET._rebuilding = false; NET._helloSent = false; NET._hostReconn = 0; NET._pinSrv = false; NET._activeSrv = null; }catch(e){}
  const code = netMakeCode();
  NET.role = 'host';
  NET.isHost = true;
  NET.isSpectator = false;
  NET.room = code;
  try{ NET._joinHostId = ''; }catch(e){}
  NET.isPublic = !!isPublic;
  NET.lobbyLocked = false;
  NET.teamsLocked = false;
  NET.readyCountdown = null;
  NET.spectators = [];
  NET.mySlot = 0;
  NET.myCtrl = 'WASD';
  NET.slotsCtrl[0] = 'WASD';
  NET.slotsReady = [false, false, false, false, false, false, false, false, false, false];
  const myProfile = netGetMyProfile();
  NET.slotsName = [myProfile.name, '', '', '', '', '', '', '', '', ''];
  NET.midgameJoiner = false;
  menu.mode = 'rows';
  setMenuTab('online');
  menu.slotColor = [menu.slotColor[0] >= 0 ? menu.slotColor[0] : 0, -1, -1, -1, -1, -1, -1, -1, -1, -1];
  menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  try{
    let keep = '';
    try{
      const qp0 = new URLSearchParams(location.search);
      const ms = (qp0.get('server') || '').slice(0, 64);
      if(ms && /^[A-Za-z0-9.\-:]+$/.test(ms.replace(/^https?:\/\//i, '').replace(/\/+$/, ''))) keep += '&server=' + encodeURIComponent(ms);
      const sq = (qp0.get('srv') || '').slice(0, 64);
      if(sq && /^[A-Za-z0-9.\-:]+$/.test(sq.replace(/^https?:\/\//i, '').replace(/\/+$/, ''))) keep += '&srv=' + encodeURIComponent(sq);
      if(qp0.get('cloud') === '1') keep += '&cloud=1';
    }catch(e){}
    history.replaceState(null, '', '?room=' + code + keep);
  }catch(e){ try{ history.replaceState(null, '', '?room=' + code); }catch(e2){} }
  
  netCopyLink();
  try{ netNotifyRoomCreated(code, myProfile.name, isPublic, (NET && NET.maxPlayers) || MAXP); }catch(e){}
  try{
    if(typeof CG !== 'undefined' && CG && typeof CG.updateRoom === 'function'){
      CG.updateRoom(code, [{ id: 'p0', username: myProfile.name }], true);
    }
    if(typeof CG !== 'undefined' && CG && typeof CG.showInviteButton === 'function'){
      CG.showInviteButton(code);
    }
  }catch(e){}
  try{
    setTimeout(()=>{try{if(NET.isHost&&NET.room===code&&typeof netUpdateHostDirectory==='function')netUpdateHostDirectory();}catch(e){}},1200);
    setTimeout(()=>{try{if(NET.isHost&&NET.room===code&&typeof netUpdateHostDirectory==='function')netUpdateHostDirectory();}catch(e){}},3500);
    setTimeout(()=>{try{if(NET.isHost&&NET.room===code&&typeof CG!=='undefined'&&CG&&typeof CG.showInviteButton==='function')CG.showInviteButton(code);}catch(e){}},1500);
  }catch(e){}
  NET.botSlots = [];
  netEnsureServer(()=>netConnectPeer(code, true)); // fresh self/render pick (self wins within 20ms) before hosting
  netShow(false);

  // Auto-fill lobby with a Hard Bot if no one joins in 5 seconds
  if(typeof _botAutofillTimer !== 'undefined' && _botAutofillTimer) clearTimeout(_botAutofillTimer);
  _botAutofillTimer = setTimeout(() => {
    try{
      if(!NET.isHost || NET.role !== 'host' || NET.room !== code || (match && screen === 'game')) return;
      if(!NET.isPublic) return; // private room: host invited friends, no bot
      const act = activeSlots();
      // If only host is in lobby (1 player), no guests connected, and no bot added yet
      if(act.length <= 1 && NET.hostInputs.size === 0 && (!NET.botSlots || NET.botSlots.length === 0)){
        netAddBot();
      }
    }catch(e){}
  }, 5000);

  // Start ping heartbeat timer & signaling server heartbeat
  if(NET.heartbeatTimer) clearInterval(NET.heartbeatTimer);
  NET.heartbeatTimer = setInterval(() => {
    if(NET.role === 'host' && NET.room){
      netUpdateHostDirectory();
    }
  }, 5000);

  if(NET.pingTimer) clearInterval(NET.pingTimer);
  NET.pingTimer = setInterval(() => {
    if(NET.role !== null){
      const pingPayload = { t: 'ping', pingT: performance.now() };
      for(const pair of NET.conns.values()){
        netSendFast(pair, pingPayload);
      }
    }
  }, 2000);
}

function netJoinAction(codeParam, hostPeerIdParam, roomMetaParam){
  try{ NET._pinSrv = false; }catch(e){}
  let code = codeParam;
  let hintHost = (typeof hostPeerIdParam === 'string' && hostPeerIdParam) ? hostPeerIdParam : '';
  if(!code){
    const el = document.getElementById('netCode');
    if(el) el.value = '';
    netShow(true);
    if(el) el.focus();
    return;
  }
  let hHint = '';
  try{ const hm = String(code).match(/[?&]h=([A-Za-z0-9]+)/); if(hm) hHint = hm[1].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }catch(e){}
  try{
    const sm = String(code).match(/[?&]srv=([^&]+)/);
    if(sm){ const sh = decodeURIComponent(sm[1]).replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim().slice(0, 64); if(/^[A-Za-z0-9.\-:]+$/.test(sh) && sh){ NET._srvHintHost = sh; NET._pinSrv = true; } }
    else if(!NET._srvHintHost){ NET._srvHintHost = ''; } // keep boot/?srv= hint: bare codes carry no server info
  }catch(e){}
  try{
    // Host on public cloud pins guests via &cloud=1 (set by host URL sync).
    const qp0 = new URLSearchParams(location.search);
    if(qp0.get('cloud') === '1'){ NET._forceCloud = true; NET._pinSrv = true; }
    else {
      const cm = String(code).match(/[?&]cloud=1/);
      if(cm){ NET._forceCloud = true; NET._pinSrv = true; }
    }
  }catch(e){}
  try{
    // Directory room entry: pin the host's real signaling server so the guest
    // dials it directly (and never gets yanked to the cloud by the fallback).
    const rmMeta = roomMetaParam || null;
    if(rmMeta){
      const mSrv = String(rmMeta.srv || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim().slice(0, 64);
      if(mSrv && /^[A-Za-z0-9.\-:]+$/.test(mSrv)){ NET._srvHintHost = mSrv; NET._pinSrv = true; }
      if(rmMeta.cloud){ NET._forceCloud = true; NET._pinSrv = true; }
    }
  }catch(e){}
  if(code.includes('room=')){
    try{
      const u = new URL(code);
      code = u.searchParams.get('room') || '';
    }catch(e){
      const m = code.match(/room=([A-Za-z0-9]+)/);
      if(m) code = m[1];
    }
  }
  code = code.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  if(code.length < 4){
    netToast('Enter a 4-6 letter room code');
    return;
  }
  try{
    if(hintHost) NET._joinHostId = hintHost;
    else NET._joinHostId = '';
    NET._hostId = '';
    try{ NET._hHint = hHint || ''; }catch(e){}
  }catch(e){}
  NET.role = 'guest';
  NET.isHost = false;
  NET.isSpectator = false;
  NET.room = code;
  NET._srvRetry = 0;
  NET._p2pRetry = 0;
  NET._syncExt = 0;
  try{ NET._seenClaims = []; }catch(e){}
  NET.mySlot = -1;
  NET.myCtrl = 'WASD';
  NET.slotsReady = [false, false, false, false, false, false, false, false, false, false];
  NET.midgameJoiner = false;
  menu.mode = 'rows';
  setMenuTab('online');
  try{
    let srvKeep = '';
    try{
      if(NET._srvHintHost) srvKeep = '&srv=' + encodeURIComponent(NET._srvHintHost);
      else if(NET._srv && NET._srv.host) srvKeep = '&srv=' + encodeURIComponent(NET._srv.host);
    }catch(e){}
    let cloudKeep = '';
    try{ if(NET._forceCloud) cloudKeep = '&cloud=1'; }catch(e){}
    let serverKeep = '';
    try{
      const qpG = new URLSearchParams(location.search);
      const svG = (qpG.get('server') || '').slice(0, 64);
      if(svG && /^[A-Za-z0-9.\-:]+$/.test(svG.replace(/^https?:\/\//i, '').replace(/\/+$/, ''))) serverKeep = '&server=' + encodeURIComponent(svG);
    }catch(e){}
    history.replaceState(null, '', '?room=' + code + srvKeep + cloudKeep + serverKeep);
  }catch(e){ try{ history.replaceState(null, '', '?room=' + code); }catch(e2){} }
  netShow(false);
  netToast('Joining room ' + code + '…');
  netEnsureServer(()=>{
    try{ netConnectPeer(code, false); }catch(e){}
    try{
      netFetchHostPeerId(code).then(hid=>{
        try{
          if(hid && NET.role === 'guest' && !NET.isHost && NET.mySlot < 0 && !NET.isSpectator){
            if(hid !== NET._joinHostId) NET._dirHostId = hid;
          }
        }catch(e){}
      }).catch(()=>{});
    }catch(e){}
  }); // fast connect first, directory lookup in background for retry

  if(NET.pingTimer) clearInterval(NET.pingTimer);
  NET.pingTimer = setInterval(() => {
    if(NET.role !== null){
      const pingPayload = { t: 'ping', pingT: performance.now() };
      for(const pair of NET.conns.values()){
        netSendFast(pair, pingPayload);
      }
    }
  }, 2000);
}

/* Host migration: second-longest player (lowest active slot) becomes new host on silent/disconnect */
function netElectMigrationHost(){
  try{
    const cands = [];
    for(let s = 1; s < MAXP; s++){
      try{
        if(!(menu.slotColor && menu.slotColor[s] >= 0)) continue;
        let pid = '';
        try{
          for(const [id, sl] of NET.peerSlots.entries()){ if(sl === s){ pid = id; break; } }
          if(!pid && s === NET.mySlot && NET.myId) pid = NET.myId;
        }catch(e){}
        if(pid) cands.push({ slot: s, peerId: pid });
      }catch(e){}
    }
    if(!cands.length && NET.mySlot >= 1 && NET.myId){
      try{ if(menu.slotColor && menu.slotColor[NET.mySlot] >= 0) cands.push({ slot: NET.mySlot, peerId: NET.myId }); }catch(e){}
    }
    cands.sort((a, b) => a.slot - b.slot);
    return cands.length ? cands[0] : null;
  }catch(e){ return null; }
}
function netPromoteToHost(reason){
  try{
    if(NET.isHost) return;
    const meSlot = NET.mySlot;
    if(!(meSlot >= 1)) return;
    try{ NET._migrating = true; }catch(e){}
    const oldPeers = {};
    try{
      for(const [pid, sl] of NET.peerSlots.entries()){ oldPeers[pid] = sl; }
      if(NET.myId) oldPeers[NET.myId] = meSlot;
      NET._migrationPeers = oldPeers;
    }catch(e){}
    const oldHostPeer = NET._hostId || '';
    try{
      menu.slotColor[0] = -1; NET.slotsReady[0] = false; NET.slotsName[0] = '';
      if(oldHostPeer){ try{ NET.peerSlots.delete(oldHostPeer); }catch(e){} try{ NET.peerNames.delete(oldHostPeer); }catch(e){} try{ netForgetPeer(oldHostPeer); }catch(e){} try{ NET.pings.delete(oldHostPeer); }catch(e){} try{ NET.conns.delete(oldHostPeer); }catch(e){} }
    }catch(e){}
    NET.isHost = true;
    NET.role = 'host';
    NET.isSpectator = false;
    try{ NET._hostId = NET.myId; NET._joinHostId = ''; }catch(e){}
    try{ NET.lobbyLocked = false; NET.teamsLocked = false; NET.readyCountdown = null; NET.midgameJoiner = false; }catch(e){}
    try{ NET.slotsReady[meSlot] = true; }catch(e){}
    try{ if(_readyTimerInterval){ clearInterval(_readyTimerInterval); _readyTimerInterval = null; } }catch(e){}
    try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}
    try{ NET._srvRetry = 0; NET._p2pRetry = 0; NET._syncExt = 0; NET._hostRetry = 0; NET._helloSent = false; NET._rebuilding = false; NET._dirHostId = ''; }catch(e){}
    try{ if(!NET.spectators) NET.spectators = []; }catch(e){}
    try{ if(NET.myId && NET.peerSlots && !NET.peerSlots.has(NET.myId)) NET.peerSlots.set(NET.myId, meSlot); }catch(e){}
    try{
      NET.hostInputs.clear();
      for(let s = 1; s < MAXP; s++){
        if(!(menu.slotColor && menu.slotColor[s] >= 0)) continue;
        if(s === meSlot) continue;
        let owner = null;
        try{ for(const [pid, sl] of NET.peerSlots.entries()){ if(sl === s){ owner = pid; break; } } }catch(e){}
        if(owner){ NET.hostInputs.set(s, { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false, consumeEdge: false, owner: owner, seq: 0 }); }
        else if(NET.botSlots && NET.botSlots.includes(s)){ NET.hostInputs.set(s, { dir: 0, jumpEdge: false, jumpHeld: false, downHeld: false, consumeEdge: false, owner: 'bot', seq: 0 }); }
      }
    }catch(e){}
    try{
      if(match && match.players){
        const oi = match.players.findIndex(p => p.slot === 0);
        if(oi !== -1){
          const wasIt = (match.it === oi);
          const removedPlayer = match.players[oi];
          match.players.splice(oi, 1);
          if(match.tags) match.tags.splice(oi, 1);
          if(match.players.length > 0){
            if(wasIt){
              let closestIdx = 0, closestDist = Infinity;
              for(let pi = 0; pi < match.players.length; pi++){
                const remP = match.players[pi];
                const d2 = Math.hypot(remP.x - removedPlayer.x, remP.y - removedPlayer.y);
                if(d2 < closestDist){ closestDist = d2; closestIdx = pi; }
              }
              match.it = closestIdx;
              match.cooldown = 1.8;
              match.freeze = 0.3;
            } else if(match.it >= match.players.length){ match.it = 0; }
          }
        }
        try{
          if(match && match.players && match.players.length < 2 && (match.state === 'playing' || match.state === 'countdown')){
            try{ netBroadcastReliable({ t: 'to_menu' }); }catch(e){}
            try{ match = null; screen = 'menu'; }catch(e){}
            try{ if(typeof menu !== 'undefined' && menu){ menu.tab = 'online'; menu.mode = 'rows'; } }catch(e){}
          }
        }catch(e){}
      } else {
        try{ if(typeof menu !== 'undefined' && menu && typeof screen !== 'undefined' && screen !== 'game'){ menu.mode = 'rows'; } }catch(e){}
      }
    }catch(e){}
    try{
      if(NET.peer && typeof NET.peer.on === 'function' && !NET.peer._netHostWired){ NET.peer.on('connection', function(c){ try{ netWireConn(c, true); }catch(e){} }); try{ NET.peer._netHostWired = true; }catch(e){} }
      else if(NET.peer && NET.peer._netHostWired){ try{ console.warn('[NET] host listener already attached'); }catch(e){} }
    }catch(e){}
    try{ if(NET.heartbeatTimer){ clearInterval(NET.heartbeatTimer); NET.heartbeatTimer = null; } }catch(e){}
    try{
      NET.heartbeatTimer = setInterval(function(){ try{ if(NET.role === 'host' && NET.room && typeof netUpdateHostDirectory === 'function') netUpdateHostDirectory(); }catch(e){} }, 5000);
    }catch(e){}
    try{ if(NET.pingTimer){ clearInterval(NET.pingTimer); NET.pingTimer = null; } }catch(e){}
    try{
      NET.pingTimer = setInterval(function(){
        try{
          if(NET.role !== null){
            var pingPayload = { t: 'ping', pingT: performance.now() };
            for(const pair of NET.conns.values()){ try{ netSendFast(pair, pingPayload); }catch(e){} }
          }
        }catch(e){}
      }, 2000);
    }catch(e){}
    try{ if(typeof _botAutofillTimer !== 'undefined' && _botAutofillTimer){ clearTimeout(_botAutofillTimer); _botAutofillTimer = null; } }catch(e){}
    try{
      var _promoteCode = NET.room;
      _botAutofillTimer = setTimeout(function(){
        try{
          if(!NET.isHost || NET.role !== 'host' || NET.room !== _promoteCode || (match && screen === 'game')) return;
          if(!NET.isPublic) return;
          var act = activeSlots();
          if(act.length <= 1 && NET.hostInputs.size === 0 && (!NET.botSlots || NET.botSlots.length === 0)){ try{ netAddBot(); }catch(e){} }
        }catch(e){}
      }, 5000);
    }catch(e){}
    try{
      if(typeof WebSocket !== 'undefined' && typeof netRelayBase === 'function' && typeof netOnData === 'function'){
        try{ if(typeof RELAY !== 'undefined' && RELAY.hostWs){ try{ RELAY.hostWs.close(); }catch(e){} try{ RELAY.hostWs = null; }catch(e){} } }catch(e){}
        var _relayBase = netRelayBase();
        var _relayRoom = (NET.room || '').toUpperCase();
        var _relayPid = NET.myId || '';
        if(_relayBase && _relayRoom && _relayPid){
          var hostRelayWs2 = new WebSocket(_relayBase + '/tag-relay');
          try{ RELAY.hostWs = hostRelayWs2; }catch(e){}
          hostRelayWs2.onopen = function(){ try{ hostRelayWs2.send(JSON.stringify({ t: 'join', room: _relayRoom, peerId: _relayPid })); }catch(e){} };
          hostRelayWs2.onmessage = function(ev){
            try{
              var m2 = JSON.parse(ev.data);
              if(m2 && m2.from && m2.data){
                var fakeConn2 = { peer: m2.from, open: true, send: function(d){ try{ if(hostRelayWs2.readyState === 1){ try{ hostRelayWs2.send(JSON.stringify({ to: m2.from, data: d })); return; }catch(e){} } try{ netRelaySend(m2.from, d); }catch(e){} }catch(e){} } };
                try{ netOnData(m2.data, fakeConn2); }catch(e){}
              }
            }catch(e){}
          };
        }
      }
    }catch(e){}
    try{ netBroadcastRoster(); }catch(e){}
    try{ netBroadcastSettings(); }catch(e){}
    try{ netUpdateHostDirectory(); }catch(e){}
    try{ netCheckReadyCountdown(); }catch(e){}
    try{ setTimeout(function(){ try{ if(NET.isHost && NET.room && typeof netUpdateHostDirectory === 'function') netUpdateHostDirectory(); }catch(e){} }, 1200); }catch(e){}
    try{ setTimeout(function(){ try{ if(NET.isHost && NET.room && typeof netUpdateHostDirectory === 'function') netUpdateHostDirectory(); }catch(e){} }, 3500); }catch(e){}
    try{ netToast('Host left — you are now host (P' + (meSlot + 1) + ')'); }catch(e){}
    try{ NET._migrating = false; NET._migratedHost = true; NET.lastRecvT = performance.now(); NET._lastHostMsgT = performance.now(); }catch(e){}
  }catch(e){ try{ NET._migrating = false; }catch(e2){} }
}
function netRejoinMigratedHost(newHostPeerId){
  try{
    if(NET.isHost) return;
    if(!newHostPeerId) return;
    try{ NET._migrating = true; }catch(e){}
    try{
      const oldHost = NET._hostId;
      if(oldHost && NET.conns.has(oldHost)){
        const pair = NET.conns.get(oldHost);
        try{ pair.rel && pair.rel.close(); }catch(e){}
        try{ pair.fast && pair.fast.close(); }catch(e){}
        try{ NET.conns.delete(oldHost); }catch(e){}
      }
    }catch(e){}
    try{
      const connRel = NET.peer.connect(newHostPeerId, { reliable: true, label: 'rel' });
      netWireConn(connRel, false);
      const connFast = NET.peer.connect(newHostPeerId, { reliable: false, ordered: false, maxRetransmits: 0, label: 'fast' });
      netWireConn(connFast, false);
    }catch(e){}
    try{ NET._hostId = newHostPeerId; }catch(e){}
    try{
      setTimeout(()=>{
        try{
          for(const pair of NET.conns.values()){ try{ netSendRel(pair, netHelloPayload({ migrated: true, oldSlot: NET.mySlot })); }catch(e){} break; }
        }catch(e){}
      }, 800);
    }catch(e){}
    try{ netToast('Host migrated, rejoining…'); }catch(e){}
  }catch(e){ try{ NET._migrating = false; }catch(e2){} }
}
function netStartMigration(reason){
  try{
    if(!NET || NET.role !== 'guest' || NET.isHost) return false;
    if(NET._migrating) return true;
    if(NET._migrationCooldown && (performance.now() - NET._migrationCooldown) < 5000) return true;
    try{ NET._migrationCooldown = performance.now(); }catch(e){}
    const elected = netElectMigrationHost();
    if(!elected){ try{ netLeaveRoom('Host left'); }catch(e){} return true; }
    try{ NET._migrating = true; }catch(e){}
    if(elected.slot === NET.mySlot){
      try{
        try{ NET._migrateCheckT = performance.now(); }catch(e){}
        let _settled = false;
        const _doPromote = ()=>{ if(_settled) return; _settled = true; try{ netPromoteToHost(reason); }catch(e){ try{ NET._migrating = false; }catch(e2){} } };
        setTimeout(_doPromote, 3000);
        netFetchHostPeerId(NET.room).then(hid=>{
          if(_settled) return;
          try{
            if((NET._lastHostMsgT || 0) > (NET._migrateCheckT || 0)){ _settled = true; try{ console.warn('[NET] migration aborted, host still live'); }catch(e){} try{ NET._migrating = false; }catch(e){} try{ netRetrySameHost(NET._hostId); }catch(e){} return; }
            if(hid && hid === NET._hostId && hid !== NET.myId){ _settled = true; try{ console.warn('[NET] migration aborted, directory still pins old host'); }catch(e){} try{ NET._migrating = false; }catch(e){} try{ netRetrySameHost(NET._hostId); }catch(e){} return; }
          }catch(e){}
          _doPromote();
        }).catch(()=>{ _doPromote(); });
      }catch(e){ try{ NET._migrating = false; }catch(e2){} }
    } else {
      try{ netRejoinMigratedHost(elected.peerId); }catch(e){ try{ NET._migrating = false; }catch(e2){} }
      try{
        setTimeout(()=>{
          try{
            if(!NET || NET.isHost || NET.role !== 'guest') return;
            if(NET.mySlot >= 0 || NET.isSpectator){ try{ NET._migrating = false; }catch(e){} return; }
            try{ NET._migrating = false; }catch(e){}
            try{ netLeaveRoom('Rejoin failed'); }catch(e){}
          }catch(e){}
        }, 12000);
      }catch(e){}
    }
    return true;
  }catch(e){ return false; }
}
function netCheckSilentHost(){
  try{
    if(!NET || NET.role !== 'guest' || NET.isHost) return;
    if(NET._migrating) return;
    if(NET.mySlot < 0 && !NET.isSpectator) return;
    try{
      if(typeof match === 'undefined' || !match) return;
      if(match.state !== 'playing' && match.state !== 'countdown' && match.state !== 'paused') return;
    }catch(e){ return; }
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const lastT = NET._lastHostMsgT || NET.lastRecvT || 0;
    if(!lastT) return;
    if((now - lastT) > 10000){
      try{ console.warn('[NET] silent host 10s, retry same host first'); }catch(e){}
      try{ if(typeof netRetrySameHost === 'function' && netRetrySameHost(NET._hostId)) return; }catch(e){}
      netStartMigration('silent-host');
    }
  }catch(e){}
}
function netRetrySameHost(hostPeerId){  try{
    if(!NET || NET.role !== 'guest' || NET.isHost) return false;
    if(NET._migrating) return true;
    const hid = hostPeerId || NET._hostId;
    if(!hid || !NET.peer || NET.peer.destroyed) return false;
    NET._hostRetry = (NET._hostRetry || 0);
    if(NET._hostRetry >= 3) return false;
    NET._hostRetry++;
    try{ console.warn('[NET] host link lost, retry ' + NET._hostRetry + '/3 to same host'); }catch(e){}
    if(NET._hostRetry === 1){ try{ netToast('Connection lost. Reconnecting…'); }catch(e){} }
    try{ NET._helloSent = false; }catch(e){}
    setTimeout(()=>{
      try{
        if(!NET || NET.role !== 'guest' || NET.isHost) return;
        const p = NET.conns.get(hid);
        if(p && ((p.rel && p.rel.open) || (p.fast && p.fast.open))) { NET._hostRetry = 0; return; }
        if(!NET.peer || NET.peer.destroyed) return;
        const cR = NET.peer.connect(hid, { reliable: true, label: 'rel' });
        netWireConn(cR, false);
        const cF = NET.peer.connect(hid, { reliable: false, ordered: false, maxRetransmits: 0, label: 'fast' });
        netWireConn(cF, false);
        setTimeout(()=>{
          try{
            if(!NET || NET.role !== 'guest' || NET.isHost) return;
            const p2 = NET.conns.get(hid);
            const open2 = !!(p2 && ((p2.rel && p2.rel.open) || (p2.fast && p2.fast.open)));
            if(open2) return;
            if((NET._hostRetry || 0) < 3){ netRetrySameHost(hid); }
            else { NET._hostRetry = 0; netStartMigration('host-retry-exhausted'); }
          }catch(e){}
        }, 3000);
      }catch(e){}
    }, 1200);
    return true;
  }catch(e){ return false; }
}
try{
  if(typeof document !== 'undefined' && document.addEventListener){
    document.addEventListener('visibilitychange', ()=>{
      try{
        if(document.visibilityState !== 'visible') return;
        if(!NET || NET.role !== 'guest' || NET.isHost) return;
        if(NET._migrating) return;
        const hid = NET._hostId;
        if(!hid) return;
        const p = NET.conns.get(hid);
        const open = !!(p && ((p.rel && p.rel.open) || (p.fast && p.fast.open)));
        if(!open && typeof netRetrySameHost === 'function'){ netRetrySameHost(hid); }
      }catch(e){}
    });
  }
}catch(e){}
function netLeaveRoom(reason){
  let wasInRoom = false;
  try{ wasInRoom = !!(NET && (NET.role !== null || NET.room)); }catch(e){}
  if(wasInRoom){
    try{ if(typeof CG!=='undefined'&&CG&&typeof CG.leftRoom==='function')CG.leftRoom(); }catch(e){}
  }
  if(NET.isHost && NET.room){
    const serverUrl = netDirBase();
    try {
      const payload = JSON.stringify({ roomId: NET.room });
      if(navigator.sendBeacon){
        navigator.sendBeacon(serverUrl + '/api/rooms/close', new Blob([payload], { type: 'application/json' }));
      }
      fetch(serverUrl + '/api/rooms/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    } catch(e){}
  }
  if(typeof RELAY !== "undefined"){
      RELAY.mode = "p2p";
      if(RELAY.ws){ try{ RELAY.ws.close(); }catch(e){} RELAY.ws = null; }
      if(RELAY.hostWs){ try{ RELAY.hostWs.close(); }catch(e){} RELAY.hostWs = null; }
      if(RELAY.pollTimer){ clearInterval(RELAY.pollTimer); RELAY.pollTimer = null; }
    }
  try{ if(NET._fallbackTimer){ clearTimeout(NET._fallbackTimer); NET._fallbackTimer = null; } }catch(e){}
  try{ if(NET._openFailTimer){ clearTimeout(NET._openFailTimer); NET._openFailTimer = null; } }catch(e){}
  try{ NET._rebuilding = false; }catch(e){}
  if(NET.heartbeatTimer){ clearInterval(NET.heartbeatTimer); NET.heartbeatTimer = null; }
  if(NET.pingTimer){ clearInterval(NET.pingTimer); NET.pingTimer = null; }
  if(_readyTimerInterval){ clearInterval(_readyTimerInterval); _readyTimerInterval = null; }
  if(typeof _botAutofillTimer !== 'undefined' && _botAutofillTimer){ clearTimeout(_botAutofillTimer); _botAutofillTimer = null; }
  try{ if(NET._guestTimeout){ clearTimeout(NET._guestTimeout); NET._guestTimeout = null; } }catch(e){}

  if(NET.peer){
    try{ NET.peer.destroy(); }catch(e){}
    NET.peer = null;
  }
  for(const pair of NET.conns.values()){
    if(pair.rel){ try{ pair.rel.close(); }catch(e){} }
    if(pair.fast){ try{ pair.fast.close(); }catch(e){} }
  }
  NET.conns.clear();
  if(typeof VOICE !== 'undefined' && VOICE.peers){
    for(const entry of VOICE.peers.values()){
      if(entry.audioEl){
        try{ entry.audioEl.pause(); entry.audioEl.srcObject = null; entry.audioEl.remove(); }catch(e){}
      }
      if(entry.call){ try{ entry.call.close(); }catch(e){} }
    }
    VOICE.peers.clear();
  }
  if(NET.peerSlots) NET.peerSlots.clear();
  if(NET.peerNames) NET.peerNames.clear();
  if(NET.pings) NET.pings.clear();
  try{ if(NET.peerPid) NET.peerPid.clear(); if(NET.peerSess) NET.peerSess.clear(); }catch(e){}
  try{ NET._lobbyDup = {}; }catch(e){}
  NET.spectators = [];
  NET.botSlots = [];
  try{ NET._lastSentState = null; NET._lastFullT = 0; NET._seenClaims = []; }catch(e){}
  NET.role = null;
  NET.room = '';
  NET.mySlot = -1;
  NET.isHost = false;
  NET.isSpectator = false;
  try{ NET._hostId = ''; NET._hostSuffix = ''; NET._joinHostId = ''; NET._pinSrv = false; NET._activeSrv = null; }catch(e){}
  NET.midgameJoiner = false;
  NET.hostInputs.clear();
  NET.slotsReady = [false, false, false, false, false, false, false, false, false, false];
  NET.slotsName = ['Host', '', '', '', '', '', '', '', '', ''];
  NET.lastRecvTick = -1;
  try{ NET.lastRecvT = 0; NET._lastHostMsgT = 0; }catch(e){}
  try{ NET._migrating = false; NET._migratedHost = false; NET._migrationPeers = null; NET._migrationCooldown = 0; NET._lastConnErrToast = 0; NET._hostRetry = 0; NET._dirHostId = ''; }catch(e){}
  try{ NET._lobbyDup = {}; }catch(e){}
  try{ if(typeof netRestoreVoiceAfterRelay === 'function') netRestoreVoiceAfterRelay(); }catch(e){}
  _remoteTargets.clear();
  menu.slotColor = [0, 2, -1, -1, -1, -1, -1, -1, -1, -1];
  menu.slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  // If we were mid-match (host quit, kicked, or failed join), actually leave the
  // arena for the menu — otherwise guests stare at a frozen game that will never sync.
  try{
    if(match && !match._telemetrySent){ try{ telemetryTrackMatchEnded('quit'); }catch(e){} }
    if(match && screen === 'game'){ match = null; screen = 'menu'; }
    if(typeof GESTURE_SPLIT !== 'undefined' && GESTURE_SPLIT) GESTURE_SPLIT.showTutorial = false;
  }catch(e){}
  history.replaceState(null, '', location.pathname);
  netShow(false);
  const chatUI = document.getElementById('chatUI');
  if(chatUI){
    chatUI.classList.remove('active');
    chatUI.classList.remove('online');
  }
  netToast(reason || 'Playing offline');
}

/* Match bootstrap wrappers */
function startMatchNetGuest(p){
  try{
    SESSION_METRICS.matchesStarted++;
    SESSION_METRICS.currentMatchStartT = Date.now();
    const curM = settings.gameMode || 'party';
    SESSION_METRICS.modesPlayed[curM] = (SESSION_METRICS.modesPlayed[curM] || 0) + 1;
    try{ telemetrySendSessionPing('match_start'); }catch(e){}
  }catch(e){}
  if(p.matchIndex != null) matchIndex = p.matchIndex;
  if(p.currentThemeIdx != null) currentThemeIdx = p.currentThemeIdx;
  if(p.lastStartIT != null) lastStartIT = p.lastStartIT;
  const act = activeSlots();
  buildLevel();
  const players = act.map((slot, i) => makePlayer(i, slot, menu.slotColor[slot]));
  const initState = p.state || 'countdown';
  const isHunter = !!(p.hunterMode || settings.gameMode === 'hunter');
  if(p.hunterRed != null) settings.hunterRed = p.hunterRed;
  if(p.hunterBlue != null) settings.hunterBlue = p.hunterBlue;
  if(p.hunterHistory != null){
    if(!menu.hunterHistory) menu.hunterHistory = {};
    menu.hunterHistory = { ...p.hunterHistory };
  }
  menu.hunterVotes = {};
  menu.mapVote = null;
  menu.modePopup = false;
  match = {
    startTime: Date.now(),
    state: initState,
    cd: p.cd != null ? p.cd : 3,
    cdT: p.cdT != null ? p.cdT : 0,
    timer: p.timer != null ? p.timer : (isHunter ? 60 : settings.time),
    lastTick: Math.ceil(p.timer != null ? p.timer : (isHunter ? 60 : settings.time)),
    it: p.it != null ? p.it : 0,
    itTeam: p.itTeam != null ? p.itTeam : (players[p.it || 0] ? players[p.it || 0].team : null),
    hunterMode: isHunter,
    hunterRed: settings.hunterRed,
    hunterBlue: settings.hunterBlue,
    hunterScores: p.hunterScores ? { ...p.hunterScores } : { 0: 0, 1: 0 },
    hunterRound: p.hunterRound != null ? p.hunterRound : 1,
    hunterMaxRounds: 3,
    hunterWipeTime: { 0: null, 1: null },
    hunterHistory: p.hunterHistory ? { ...p.hunterHistory } : {},
    cageT: p.cageT != null ? p.cageT : (isHunter ? 3.0 : 0),
    killfeed: [],
    killfeedT: 0,
    spectateTarget: null,
    teamItTime: p.teamItTime ? p.teamItTime.slice() : [0, 0, 0, 0],
    cooldown: p.cooldownN != null ? p.cooldownN : 0,
    goFlash: 0, freeze: 0, shake: 0, flash: 0, fade: 0.6, tagPop: null, resultT: 0,
    tags: p.tags ? p.tags.slice() : players.map(() => 0),
    hintT: 7, players: players, result: null, roundSummary: null, pausedFrom: null, pauseSel: 0,
    mapToast: MAPS[settings.map % MAPS.length].name, mapToastT: 2.5
  };
  // Spectator-safe: 'start'/'midgame_start' carry no mode init, so ensure HUD
  // active flags without resetting fuse/scores (init funcs would reset state).
  // Deactivate the other mode so a stale flag can't leak into the next match.
  try{
    if(typeof BOMB_MODE !== 'undefined' && BOMB_MODE) BOMB_MODE.active = (settings.gameMode === 'bomb');
    if(typeof crownState !== 'undefined' && crownState) crownState.active = (settings.gameMode === 'crown');
    if(typeof ctfState !== 'undefined' && ctfState){
      ctfState.active = (settings.gameMode === 'ctf');
      if(settings.gameMode === 'ctf' && typeof findCtfBases === 'function'){
        const bases = findCtfBases();
        if(bases){
          ctfState.bases[0] = { team: 0, x: bases.red.x, y: bases.red.y, w: (typeof CTF_CONFIG !== 'undefined' ? CTF_CONFIG.PEDESTAL_W : 68), h: (typeof CTF_CONFIG !== 'undefined' ? CTF_CONFIG.PEDESTAL_H : 14), plat: bases.red.plat };
          ctfState.bases[1] = { team: 1, x: bases.blue.x, y: bases.blue.y, w: (typeof CTF_CONFIG !== 'undefined' ? CTF_CONFIG.PEDESTAL_W : 68), h: (typeof CTF_CONFIG !== 'undefined' ? CTF_CONFIG.PEDESTAL_H : 14), plat: bases.blue.plat };
          if(ctfState.flags[0] && ctfState.flags[0].state === 'home'){ ctfState.flags[0].homeX = bases.red.x; ctfState.flags[0].homeY = bases.red.y - 20; ctfState.flags[0].x = bases.red.x; ctfState.flags[0].y = bases.red.y - 20; }
          if(ctfState.flags[1] && ctfState.flags[1].state === 'home'){ ctfState.flags[1].homeX = bases.blue.x; ctfState.flags[1].homeY = bases.blue.y - 20; ctfState.flags[1].x = bases.blue.x; ctfState.flags[1].y = bases.blue.y - 20; }
        }
      }
    }
  }catch(e){}
  screen = 'game';
  try{ CG.gameplayStart(); }catch(e){}
  if(initState === 'countdown') sfx('count');
  netShow(false);
}

function getMyPlayer(){
  if(!match || NET.mySlot < 0) return null;
  return match.players.find(p => p.slot === NET.mySlot) || (NET.mySlot < match.players.length ? match.players[NET.mySlot] : null);
}

/* 50Hz Host hot-state broadcast + 20Hz Guest delta transmission (full snapshot every 2s / on state change) */
let _netStateT = 0, _netInputT = 0;
function netTick(dt){
  if(NET.role === null) return;
  if(NET.isHost){
    // 50Hz hot (positions, visual state, live clocks: timer/cooldown/fuse/
    // hold/cageT) + full snapshot every 2s / on state change (round end,
    // pause menu) / first tick. Infrequent data (settings, tags, scores,
    // mode envelope) never rides the hot path.
    _netStateT += dt;
    if(_netStateT >= 0.02 && match && match.players){
      _netStateT -= 0.02;
      if(_netStateT > 0.1) _netStateT = 0; // don't spiral after a hitch
      const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const full = !NET._lastSentState || (match.state !== NET._lastSentState) || (nowMs - (NET._lastFullT || 0) >= 2000);
      const packedPlayers = match.players.map(p => full ? packPlayer(p) : packPlayerHot(p));
      const env = {
        players: packedPlayers,
        it: match.it,
        itTeam: match.itTeam,
        cooldown: Math.round(match.cooldown * 100) / 100,
        timer: Math.round(match.timer * 10) / 10,
        payloadTagPop: match.tagPop,
        state: match.state,
        cd: match.cd,
        cdT: match.cdT != null ? Math.round(match.cdT * 100) / 100 : 0,
        goFlash: match.goFlash != null ? Math.round(match.goFlash * 100) / 100 : 0,
        freeze: match.freeze != null ? Math.round(match.freeze * 100) / 100 : 0,
        shake: match.shake != null ? Math.round(match.shake * 10) / 10 : 0,
        flash: match.flash != null ? Math.round(match.flash * 10) / 10 : 0,
        cageT: match.hunterMode ? Math.round(match.cageT * 100) / 100 : null,
        teamItTime: match.teamItTime ? match.teamItTime.slice() : null,
        fuse: (settings.gameMode === 'bomb' && typeof BOMB_MODE !== 'undefined' && BOMB_MODE) ? Math.round(BOMB_MODE.fuse * 100) / 100 : null,
        hold: (settings.gameMode === 'crown' && typeof crownState !== 'undefined' && crownState) ? Math.round(crownState.holdTimer * 100) / 100 : null,
        cimm: (settings.gameMode === 'crown' && typeof crownState !== 'undefined' && crownState) ? Math.round(crownState.immunityTimer * 100) / 100 : null,
        tick: NET.tick++
      };
      if(full){
        env.settings = { map: settings.map, doubleJump: settings.doubleJump, collision: settings.collision, teams: settings.teams, gameMode: settings.gameMode };
        env.tags = match.tags.slice();
        env.hunterScores = match.hunterMode ? match.hunterScores : null;
        env.hunterRound = match.hunterMode ? match.hunterRound : null;
        env.roundSummary = match.roundSummary || null;
        env.result = match.result;
        env.resultT = match.resultT != null ? Math.round(match.resultT * 100) / 100 : 0;
        env.modeEnv = (typeof packModeState === 'function' ? packModeState() : null);
      }
      netBroadcastState(env);
      NET._lastSentState = match.state;
      if(full) NET._lastFullT = nowMs;
    }
  } else {
    // Guest: silent-host detection works in lobby + match (roster/state timeout 10s)
    try{ if(typeof netCheckSilentHost === 'function') netCheckSilentHost(); }catch(e){}
    // Guest: send local player delta (position + visual state) at 20Hz over fast channel
    if(NET.mySlot === -1 || !match) return;
    _netInputT += dt;
    if(_netInputT >= 0.05){
      _netInputT -= 0.05;
      if(_netInputT > 0.2) _netInputT = 0;
      const myP = getMyPlayer();
      if(myP){
        const pData = packPlayerHot(myP);
        pData.t = 'p_state';
        pData.seq = ++NET.seq;
        for(const pair of NET.conns.values()){
          netSendFast(pair, pData);
        }
      }
    }
  }
}

/* Modal UI wiring & Chat send events */
function netInitUI(){
  const joinGo = document.getElementById('netJoinGo'),
    closeBtn = document.getElementById('netClose'),
    codeEl = document.getElementById('netCode'),
    chatInp = document.getElementById('chatInput'),
    chatSend = document.getElementById('chatSendBtn');

  if(joinGo){
    joinGo.onclick = () => {
      const v = codeEl ? codeEl.value.trim() : '';
      if(v) netJoinAction(v);
    };
  }
  if(closeBtn){
    closeBtn.onclick = () => netShow(false);
  }
  if(codeEl){
    codeEl.onkeydown = e => {
      if(e.key === 'Enter'){
        const v = codeEl.value.trim();
        if(v) netJoinAction(v);
      } else if(e.key === 'Escape'){
        netShow(false);
      }
    };
  }

  // Chat input events
  if(chatSend){
    chatSend.onclick = () => {
      if(chatInp){
        const v = chatInp.value.trim();
        if(v) netSendChat(v);
        chatInp.value = '';
        chatInp.blur();
        const chatUI = document.getElementById('chatUI');
        if(chatUI) chatUI.classList.remove('active');
      }
    };
  }
  if(chatInp){
    chatInp.onkeydown = e => {
      e.stopPropagation();
      if(e.key === 'Enter'){
        e.preventDefault();
        const v = chatInp.value.trim();
        if(v) netSendChat(v);
        chatInp.value = '';
        chatInp.blur();
        const chatUI = document.getElementById('chatUI');
        if(chatUI) chatUI.classList.remove('active');
      } else if(e.key === 'Escape'){
        e.preventDefault();
        chatInp.blur();
        const chatUI = document.getElementById('chatUI');
        if(chatUI) chatUI.classList.remove('active');
      }
    };
  }

  // Check URL ?room= parameter on boot -> auto-joins immediately!
  const qp = new URLSearchParams(location.search);
  const roomQ = (qp.get('room') || qp.get('roomId') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  try{ // carry ?srv= server hint (stripped from code) so guest probes the host's directory
    const srvQ = (qp.get('srv') || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim().slice(0, 64);
    if(srvQ && /^[A-Za-z0-9.\-:]+$/.test(srvQ)){ NET._srvHintHost = srvQ; NET._pinSrv = true; }
  }catch(e){}
  if(roomQ){
    netJoinAction(roomQ);
  }
}
