const express = require('express');
const { ExpressPeerServer } = require('peer');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 9000;
const app = express();

// Permissive CORS for CrazyGames iframes and local dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Enable JSON, text, and raw body parsing
app.use(express.json({ limit: '2mb', strict: false }));
app.use(express.text({ type: ['text/*', 'application/*'], limit: '2mb' }));


// In-Memory Active Rooms Directory for Public Matchmaking
// roomId -> { roomId, name, hostName, isPublic, isLocked, players, maxPlayers, map, state: 'lobby'|'playing', lastPing }
const activeRooms = new Map();

// Helper to clean up dead rooms (older than 15s without heartbeat)
function pruneDeadRooms() {
  const now = Date.now();
  for (const [id, r] of activeRooms.entries()) {
    if (now - (r.lastPing || 0) > 15000) {
      activeRooms.delete(id);
      console.log(`[NET] Pruned stale room: ${id}`);
    }
  }
}

// Health check endpoint for uptime monitors (keeps Render / Railway awake 24/7)
app.get('/', (req, res) => res.status(200).json({ status: 'ok', service: 'tag-netplay-signaling' }));
app.get('/health', (req, res) => res.status(200).send('OK'));

// Dynamic TURN Credential Minting Endpoint (Institutional / Strict NAT Traversal)
app.get('/api/turn', (req, res) => {
  const turnServers = [
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

  if (process.env.TURN_SECRET) {
    try {
      const ttl = 86400; // 24 hours
      const user = (Math.floor(Date.now() / 1000) + ttl) + ':tag';
      const pass = crypto.createHmac('sha1', process.env.TURN_SECRET).update(user).digest('base64');
      const domain = process.env.TURN_DOMAIN || 'turn.tag-game.com';
      turnServers.unshift({
        urls: [
          `turns:${domain}:443?transport=tcp`,
          `turn:${domain}:443?transport=tcp`,
          `turns:${domain}:5349?transport=tcp`
        ],
        username: user,
        credential: pass
      });
    } catch (e) {
      console.warn('[TURN] Error generating HMAC TURN credentials:', e.message);
    }
  }

  res.json({ iceServers: turnServers });
});

// Public Room Directory APIs
app.get('/api/rooms', (req, res) => {
  pruneDeadRooms();
  const publicRooms = [];
  for (const r of activeRooms.values()) {
    if (r.isPublic && r.state !== 'closed') {
      publicRooms.push({
        roomId: r.roomId,
        name: r.name || `Room ${r.roomId}`,
        hostName: r.hostName || 'Host',
        isLocked: !!r.isLocked,
        players: r.players || 1,
        maxPlayers: r.maxPlayers || 8,
        map: r.map !== undefined ? r.map : 0,
        teams: !!r.teams,
        state: r.state || 'lobby',
        hostPeerId: r.hostPeerId || r.hostId || ''
      });
    }
  }
  res.json({ rooms: publicRooms });
});

app.post('/api/rooms/update', (req, res) => {
  const data = req.body || {};
  if (!data.roomId) {
    return res.status(400).json({ error: 'roomId required' });
  }
  const cleanId = String(data.roomId).trim().toUpperCase();
  const existing = activeRooms.get(cleanId) || {};
  const updated = {
    ...existing,
    ...data,
    roomId: cleanId,
    lastPing: Date.now()
  };
  activeRooms.set(cleanId, updated);
  res.json({ success: true, room: updated });
});

app.post('/api/rooms/heartbeat', (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  const cleanId = String(roomId).trim().toUpperCase();
  const r = activeRooms.get(cleanId);
  if (r) {
    r.lastPing = Date.now();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

app.post('/api/rooms/close', (req, res) => {
  const { roomId } = req.body || {};
  if (roomId) {
    const cleanId = String(roomId).trim().toUpperCase();
    activeRooms.delete(cleanId);
    relayRooms.delete(cleanId);
    console.log(`[NET] Host cleanly closed room: ${cleanId}`);
  }
  res.json({ success: true });
});


// ================= GAME ANALYTICS & CONVERSION ENGINE =================
const ANALYTICS_MAX_SESSIONS = 2000;
const analyticsSessions = [];

function summarizeSessions(list) {
  const totalSessions = list.length;
  let totalTabTimeSec = 0;
  let totalActiveScreenTimeSec = 0;
  let totalMatchTimeSec = 0;
  let totalMatchesStarted = 0;
  let totalMatchesCompleted = 0;
  let totalRageQuits = 0;
  let totalNormalQuits = 0;
  let totalBounces = 0;
  let totalHumanWins = 0;
  let totalBotWins = 0;
  let totalFpsSum = 0;
  let fpsCount = 0;

  let countActive1m = 0;
  let countActive4m = 0;
  let countActive7m = 0;

  const funnel = {
    linkOpened: totalSessions,
    menuEngaged: 0,
    match1Started: 0,
    match1Completed: 0,
    multiMatches: 0,
    powerPlayers: 0,
    active1m: 0,
    active4m: 0,
    active7m: 0
  };

  const modes = {};
  const devices = { Desktop: 0, Mobile: 0 };
  const botDifficulties = { easy: { humanWins: 0, botWins: 0 }, hard: { humanWins: 0, botWins: 0 } };

  for (const s of list) {
    const tabSec = s.tabLifetimeSec || s.totalTabTimeSec || 0;
    const activeSec = (typeof s.activeScreenTimeSec === 'number' && s.activeScreenTimeSec > 0) ? s.activeScreenTimeSec : tabSec;
    const matchSec = s.totalMatchPlaytimeSec || 0;
    totalTabTimeSec += tabSec;
    totalActiveScreenTimeSec += activeSec;
    totalMatchTimeSec += matchSec;

    const started = s.matchesStarted || 0;
    const completed = s.matchesCompleted || 0;
    totalMatchesStarted += started;
    totalMatchesCompleted += completed;

    if (activeSec < 15 && started === 0) totalBounces++;
    if (activeSec >= 15 || tabSec >= 15 || started > 0) funnel.menuEngaged++;
    if (started >= 1) funnel.match1Started++;
    if (completed >= 1) funnel.match1Completed++;
    if (started >= 2) funnel.multiMatches++;
    if (started >= 5) funnel.powerPlayers++;

    if (activeSec >= 60) { countActive1m++; funnel.active1m++; }
    if (activeSec >= 240) { countActive4m++; funnel.active4m++; }
    if (activeSec >= 420) { countActive7m++; funnel.active7m++; }

    totalRageQuits += s.rageQuits || 0;
    totalNormalQuits += s.normalQuits || 0;
    totalHumanWins += s.humanWins || 0;
    totalBotWins += s.botWins || 0;

    if (s.avgFps) {
      totalFpsSum += s.avgFps;
      fpsCount++;
    }

    const dev = (s.device && s.device.toLowerCase().includes('mobile')) ? 'Mobile' : 'Desktop';
    devices[dev]++;

    if (s.modesPlayed && typeof s.modesPlayed === 'object') {
      for (const [m, cnt] of Object.entries(s.modesPlayed)) {
        modes[m] = (modes[m] || 0) + cnt;
      }
    }

    const diff = s.botDifficulty === 'easy' ? 'easy' : 'hard';
    botDifficulties[diff].humanWins += s.humanWins || 0;
    botDifficulties[diff].botWins += s.botWins || 0;
  }

  const avgTabTimeSec = totalSessions > 0 ? Math.round(totalTabTimeSec / totalSessions) : 0;
  const avgActiveScreenTimeSec = totalSessions > 0 ? Math.round(totalActiveScreenTimeSec / totalSessions) : 0;
  const avgMatchTimeSec = totalMatchesStarted > 0 ? Math.round(totalMatchTimeSec / totalMatchesStarted) : (totalSessions > 0 ? Math.round(totalMatchTimeSec / totalSessions) : 0);
  const conversionRate = totalSessions > 0 ? Math.round((funnel.match1Started / totalSessions) * 100) : 0;
  const completionRate = funnel.match1Started > 0 ? Math.round((funnel.match1Completed / funnel.match1Started) * 100) : 0;
  const bounceRate = totalSessions > 0 ? Math.round((totalBounces / totalSessions) * 100) : 0;
  const rageQuitRate = (totalRageQuits + totalNormalQuits) > 0 ? Math.round((totalRageQuits / (totalRageQuits + totalNormalQuits)) * 100) : 0;
  const humanWinRate = (totalHumanWins + totalBotWins) > 0 ? Math.round((totalHumanWins / (totalHumanWins + totalBotWins)) * 100) : 50;
  const avgFps = fpsCount > 0 ? Math.round((totalFpsSum / fpsCount) * 10) / 10 : 60;

  const conv1mRate = totalSessions > 0 ? Math.round((countActive1m / totalSessions) * 100) : 0;
  const conv4mRate = totalSessions > 0 ? Math.round((countActive4m / totalSessions) * 100) : 0;
  const conv7mRate = totalSessions > 0 ? Math.round((countActive7m / totalSessions) * 100) : 0;

  return {
    totalSessions,
    totalMatchesStarted,
    totalMatchesCompleted,
    avgTabTimeSec,
    avgActiveScreenTimeSec,
    avgMatchTimeSec,
    conversionRate,
    completionRate,
    bounceRate,
    rageQuitRate,
    humanWinRate,
    avgFps,
    conv1mRate,
    conv4mRate,
    conv7mRate,
    countActive1m,
    countActive4m,
    countActive7m,
    funnel,
    modes,
    devices,
    botDifficulties
  };
}

app.post('/api/analytics/session', (req, res) => {
  try {
    let s = req.body || {};
    if (typeof s === 'string') {
      try { s = JSON.parse(s); } catch (e) { s = {}; }
    }
    if (!s.sessionId) s.sessionId = 'sess_' + Date.now().toString(36);
    s.receivedAt = Date.now();
    const existingIdx = analyticsSessions.findIndex(item => item.sessionId === s.sessionId);
    if (existingIdx !== -1) {
      analyticsSessions[existingIdx] = Object.assign(analyticsSessions[existingIdx], s);
    } else {
      analyticsSessions.push(s);
      if (analyticsSessions.length > ANALYTICS_MAX_SESSIONS) {
        analyticsSessions.shift();
      }
    }
    res.json({ success: true, count: analyticsSessions.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/summary', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const globalSummary = summarizeSessions(analyticsSessions);
    const desktopSessions = analyticsSessions.filter(s => !s.device || !s.device.toLowerCase().includes('mobile'));
    const mobileSessions = analyticsSessions.filter(s => s.device && s.device.toLowerCase().includes('mobile'));

    const desktopSummary = summarizeSessions(desktopSessions);
    const mobileSummary = summarizeSessions(mobileSessions);

    res.json(Object.assign({}, globalSummary, {
      desktop: desktopSummary,
      mobile: mobileSummary,
      recentSessions: analyticsSessions.slice(-100).reverse()
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/reset', (req, res) => {
  analyticsSessions.length = 0;
  res.json({ success: true, message: 'Analytics reset successfully' });
});

app.get('/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const p = path.join(__dirname, 'dashboard.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  const tagDash = path.join(__dirname, '..', 'tag', 'dashboard.html');
  if (fs.existsSync(tagDash)) return res.sendFile(tagDash);
  res.send('Dashboard HTML not found.');
});

// Live Web Playable Test Link (Play immediately without downloading or installing)
app.get('/play', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const p = path.join(__dirname, 'game.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  const tagGame = path.join(__dirname, '..', 'tag', 'index.html');
  if (fs.existsSync(tagGame)) return res.sendFile(tagGame);
  res.send('Game HTML not found.');
});
app.get('/game', (req, res) => res.redirect('/play'));

// ================= ZERO-UDP WSS & HTTP LONG-POLL RELAY =================
// roomId -> Map(peerId -> ws)
const relayRooms = new Map();
// "roomId:peerId" -> array of buffered messages for HTTP polling
const relayQueues = new Map();

app.post('/api/relay/send', (req, res) => {
  try {
    const { room, from, to, data } = req.body || {};
    const r = String(room || '').trim().toUpperCase();
    const pid = String(from || '').trim();
    if (r && pid && data) {
      const peers = relayRooms.get(r);
      const targets = to ? [to] : (peers ? [...peers.keys()].filter(k => k !== pid) : []);
      const env = JSON.stringify({ from: pid, data });
      for (const t of targets) {
        const s = peers && peers.get(t);
        if (s && s.readyState === 1) {
          s.send(env);
        } else {
          const k = r + ':' + t;
          if (!relayQueues.has(k)) relayQueues.set(k, { msgs: [], lastAccess: Date.now() });
          const entry = relayQueues.get(k);
          entry.lastAccess = Date.now();
          if (entry.msgs.length < 200) entry.msgs.push({ from: pid, data });
        }
      }
    }
  } catch (e) {
    console.warn('[RELAY HTTP] Send error:', e.message);
  }
  res.json({ ok: true });
});

app.get('/api/relay/poll', (req, res) => {
  const r = String(req.query.room || '').trim().toUpperCase();
  const pid = String(req.query.peerId || '').trim();
  const k = r + ':' + pid;
  const entry = relayQueues.get(k);
  if (entry) {
    const msgs = entry.msgs || [];
    entry.msgs = [];
    entry.lastAccess = Date.now();
    res.json({ msgs });
  } else {
    res.json({ msgs: [] });
  }
});

// Periodic safe TTL cleanup of stale relay queues (older than 30s)
setInterval(() => {
  const now = Date.now();
  for (const [k, entry] of relayQueues.entries()) {
    if (now - (entry.lastAccess || 0) > 30000) {
      relayQueues.delete(k);
    }
  }
}, 15000);

const server = app.listen(PORT, () => {
  console.log(`[NET] Tag Signaling Server running on port ${PORT}`);
  console.log(`[NET] Health endpoint: http://localhost:${PORT}/health`);
  console.log(`[NET] PeerJS path: /tag-netplay`);
  console.log(`[NET] Zero-UDP Relay path: /tag-relay`);
});

// Attach PeerJS Server
const peerServer = ExpressPeerServer(server, {
  path: '/',
  proxied: true,
  alive_timeout: 60000,
  concurrent_limit: 5000
});

app.use('/tag-netplay', peerServer);

peerServer.on('connection', (client) => {
  console.log(`[NET] Peer connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[NET] Peer disconnected: ${client.getId()}`);
});

// Attach Zero-UDP WebSocket Relay Server
const relayWss = new WebSocketServer({ server, path: '/tag-relay' });

relayWss.on('connection', (ws) => {
  let room = '';
  let pid = '';

  ws.on('message', (raw) => {
    try {
      const m = JSON.parse(raw);
      if (m.t === 'join') {
        room = String(m.room || '').trim().toUpperCase();
        pid = String(m.peerId || '').trim();
        if (!relayRooms.has(room)) relayRooms.set(room, new Map());
        relayRooms.get(room).set(pid, ws);
        console.log(`[RELAY WS] Joined room ${room}: ${pid}`);
        return;
      }

      const peers = relayRooms.get(room);
      if (!peers) return;

      const targets = m.to ? [m.to] : [...peers.keys()].filter(k => k !== pid);
      const env = JSON.stringify({ from: pid, data: m.data });
      for (const t of targets) {
        const s = peers.get(t);
        if (s && s.readyState === 1) {
          s.send(env);
        } else {
          const k = room + ':' + t;
          if (!relayQueues.has(k)) relayQueues.set(k, { msgs: [], lastAccess: Date.now() });
          const entry = relayQueues.get(k);
          entry.lastAccess = Date.now();
          if (entry.msgs.length < 200) entry.msgs.push({ from: pid, data: m.data });
        }
      }
    } catch (e) {
      console.warn('[RELAY WS] message parse error:', e.message);
    }
  });

  ws.on('close', () => {
    try {
      if (room && pid && relayRooms.has(room)) {
        relayRooms.get(room).delete(pid);
        console.log(`[RELAY WS] Left room ${room}: ${pid}`);
        if (relayRooms.get(room).size === 0) {
          relayRooms.delete(room);
        }
      }
    } catch (e) {}
  });

  ws.on('error', () => {});
});
