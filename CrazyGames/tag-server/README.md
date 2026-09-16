# Tag Netplay Dedicated Signaling Server

A lightweight, high-performance WebRTC PeerJS signaling server for Tag Netplay.
Replaces the congested public `0.peerjs.com` cloud server with your own zero-latency, private signaling server.

---

## Option 1: Deploy on Railway (Recommended - Fastest & Does NOT Sleep)

1. Sign up or log into [Railway.app](https://railway.app) (login with GitHub).
2. Click **+ New Project** -> **Deploy from GitHub repo**.
3. Select this repository.
4. Click on the created service card -> **Settings**:
   - Under **Root Directory**, set: `CrazyGames/tag-server` (or leave as `/` if deploying from a dedicated repo).
5. Go to **Networking** in the service settings:
   - Click **Generate Domain**.
   - Railway will provide a secure HTTPS/WSS domain, e.g. `tag-server-production.up.railway.app`.
6. Done! Your server is live 24/7.

---

## Option 2: Deploy on Render.com (100% Free Forever)

1. Push your repository to GitHub.
2. Log into [Render.com](https://render.com) (free).
3. Click **New +** -> **Web Service** -> Connect your GitHub repo.
4. Settings:
   - **Root Directory**: `CrazyGames/tag-server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free (512 MB RAM)
5. Click **Create Web Service**. Render provides your URL: `https://your-app.onrender.com`.

### Keeping Render Awake 24/7 (Free)
Render free tier goes to sleep after 15 minutes of inactivity. To keep it awake:
1. Go to [UptimeRobot.com](https://uptimerobot.com/) (free).
2. Add a new **HTTP(s)** monitor pointing to: `https://your-app.onrender.com/health` checked every 5-10 minutes.
3. Your server will stay active 24/7 with zero cold starts!

---

## How to Connect the Game to Your Server

In `CrazyGames/tag-netplay/index.html`, find `PEER_SERVER_CONFIG`:
```javascript
const PEER_SERVER_CONFIG = {
  host: 'your-app.up.railway.app', // Or 'your-app.onrender.com'
  port: 443,
  path: '/tag-netplay',
  secure: true
};
```
Or test it directly via URL parameter without editing any files:
`https://your-game-url.com/?room=ABCDEF&server=your-app.up.railway.app`

---

## How to Run Locally (On Your Laptop)

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Open terminal in this folder:
   ```bash
   cd CrazyGames/tag-server
   npm install
   npm start
   ```
3. Your server is live on `http://localhost:9000` (path: `/tag-netplay`).

