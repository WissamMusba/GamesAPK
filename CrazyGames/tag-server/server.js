const express = require('express');
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 9000;
const app = express();

// Health check endpoint for uptime monitors (keeps Render / Railway awake 24/7)
app.get('/', (req, res) => res.status(200).json({ status: 'ok', service: 'tag-netplay-signaling' }));
app.get('/health', (req, res) => res.status(200).send('OK'));

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

