# Tag Netplay Dedicated Signaling Server

A lightweight, high-performance WebRTC PeerJS signaling server for Tag Netplay.

## How to Run Locally (On Your Laptop)

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Open terminal in this folder:
   ```bash
   cd CrazyGames/tag-server
   npm install
   npm start
   ```
3. Your server is live on `http://localhost:9000` (path: `/tag-netplay`).

---

## 1-Click Free Cloud Deployment on Render.com

1. Push your repository to GitHub.
2. Log into [Render.com](https://render.com) (free).
3. Click **New +** -> **Web Service** -> Connect your GitHub repo.
4. Settings:
   - **Root Directory**: `CrazyGames/tag-server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free (512 MB RAM)
5. Click **Create Web Service**. Render gives you a secure `https://your-app.onrender.com` URL.

---

## Keeping It Awake 24/7 (Never Sleep)

Render free tier goes to sleep after 15 minutes of inactivity. To keep it awake 24/7 for free:
1. Go to [UptimeRobot.com](https://uptimerobot.com/) (free).
2. Add a new monitor pointing to: `https://your-app.onrender.com/health` every 5-10 minutes.
3. Your server will stay active 24/7 with zero cold starts!
