const express = require('express');
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 9000;
const app = express();

// Enable JSON body parsing and permissive CORS for CrazyGames iframes and local dev
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
        state: r.state || 'lobby'
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
    console.log(`[NET] Host cleanly closed room: ${cleanId}`);
  }
  res.json({ success: true });
});

const server = app.listen(PORT, () => {
  console.log(`[NET] Tag Signaling Server running on port ${PORT}`);
  console.log(`[NET] Health endpoint: http://localhost:${PORT}/health`);
  console.log(`[NET] PeerJS path: /tag-netplay`);
});

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
