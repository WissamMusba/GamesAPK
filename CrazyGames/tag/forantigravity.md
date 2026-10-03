# TAG! Institutional Firewall Traversal — Audit + Blueprint

Audited: `tag/index.html:14600-16023` (`PEER_SERVER_CONFIG`, `ICE_SERVERS:14921`, `netConnectPeer:15877`), `tag-server/server.js:1-121`.

## 1. Current Topology Audit — Why Campus Wi-Fi Breaks

| Layer | Current | What Kills It On Campus |
|---|---|---|
| **Signaling** | PeerJS `1.5.4` (unpkg) -> `tag-netplay-server.onrender.com:443/tag-netplay?secure:true`, 5.5s fallback to `0.peerjs.com` cloud. Health-probe picks `self:9000` vs `render:443`. | OK on port `443/WSS` — but: `unpkg.com` and `*.onrender.com` are commonly blocklisted by school allow-lists. No SNI fallback. `self:9000/ws` (insecure, non-standard port) is always blocked. DPI that strips `Upgrade: websocket` kills both. |
| **NAT traversal** | `ICE_SERVERS`: 5x Google `stun:*19302` + `global.stun.twilio:3478` + **single** `turn:openrelay.metered.ca:80,443,443?transport=tcp` (`openrelay/openrelay`). | Fatal. STUN does nothing behind symmetric NAT / UDP-blocked firewall. Single public TURN = single point of failure: OpenRelay public is throttled, no SLA, frequently `401/486 allocation quota reached`. **No `turns:` (TURN-over-TLS) entry**, so no traffic actually disguised as HTTPS. UDP `3478` + `80` TURN is dropped by default on Palo Alto / Fortinet / Cisco Umbrella school profiles. |
| **PeerConnection** | `new Peer(id,{config:{iceServers}})` — default `iceTransportPolicy:all`. Dual `DataConnection`: `rel{reliable:true}` + `fast{reliable:false,ordered:false,maxRetransmits:0}`. Guest watchdog `7s`, signaling fallback `5.5s`. | No `3.5s` media watchdog. `open != reachable`: `conn.on('open')` fires via signaling, but if ICE never yields `srflx/relay` candidate, game hangs until 7s `Room unavailable`. No ICE-restart, no `relay-only` retry, no `webrtc-internals` diagnostics surfaced. |
| **Fallback** | None. If `rel+fast` both fail → `netLeaveRoom()`. | Zero-UDP clients (Chromebook with UDP disabled by admin, corporate proxy that only allows `CONNECT:443`) can never play. |

Root cause in one line: **signaling is already on 443, but media is not.** Firewalls allow your lobby, then drop your game packets.

## 2. TURN Relay + Port 443 Encapsulation

Goal: make relay traffic byte-identical to HTTPS: `TURNS (TLS over TCP/443)` + `TURN/TCP:443`. DPI sees `ClientHello → SNI: turn.yourdomain.com:443`.

### 2a. Self-hosted `coturn` (primary, ~$5/mo, unlimited)

Co-locate with signaling so one domain/SNI covers both. On same VPS that serves `tag-server/`:

```bash
# VPS: Ubuntu, DNS A: turn.tag-game.com -> VPS IP, open ONLY 80/443
apt install coturn && certbot certonly --standalone -d turn.tag-game.com
```

`/etc/turnserver.conf` (drop-in):
```conf
listening-port=443
tls-listening-port=443
alt-listening-port=3478
alt-tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=<VPS_PUBLIC_IP>
external-ip=<VPS_PUBLIC_IP>
realm=turn.tag-game.com
server-name=turn.tag-game.com
cert=/etc/letsencrypt/live/turn.tag-game.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.tag-game.com/privkey.pem
user=tag:REPLACE_LONG_RANDOM_SECRET
lt-cred-mech
use-auth-secret
static-auth-secret=REPLACE_LONG_RANDOM_SECRET_32B
total-quota=1000
bps-capacity=0
stale-nonce=600
no-multicast-peers
allowed-peer-ip=0.0.0.0-255.255.255.255
log-file=/var/log/turn.log
```

> `use-auth-secret` lets `tag-server` mint time-limited credentials (no hardcoded password in `index.html`). Add to `server.js`:
```js
const crypto=require('crypto');
function mintTurnCred(name='tag', ttl=86400){
  const user=(Math.floor(Date.now()/1000)+ttl)+':'+name;
  const pass=crypto.createHmac('sha1',process.env.TURN_SECRET).update(user).digest('base64');
  return {username:user,credential:pass};
}
app.get('/api/turn', (req,res)=>res.json({turns:[
  {urls:['turns:turn.tag-game.com:443?transport=tcp','turns:turn.tag-game.com:5349?transport=tcp','turn:turn.tag-game.com:443?transport=tcp']},
  ...mintTurnCredCache()]}));
```

Test: `turnutils_uclient -T -p 443 -W <SECRET> turns:turn.tag-game.com` must show `relay 1.2.3.4:xxx`.

### 2b. Free/cheap redundancy (order matters)

| Provider | Free tier | URL form to use | Note |
|---|---|---|---|
| `OpenRelay` (current) | public, unlimited but throttled | `turn:openrelay.metered.ca:443?transport=tcp` | Keep as last-resort only. |
| `Metered.ca` | 50 GB/mo TURN free, API-minted creds | `turns:a.metered.ca:443?transport=tcp` via `GET https://tag.metered.live/api/v1/turn/credentials?apiKey=KEY` | Best free SLA. |
| `Xirsys` | trial + pay-as-go | `turns:global.xirsys.net:443?transport=tcp` | Good US/EU. |
| `Cloudflare Calls` | $5/1M mins, TURN over 443+5349 | `turns:turn.cloudflare.com:443?transport=tcp` | Cheapest at scale, requires API token. |

Never hardcode >1 static secret in client. Fetch at boot, cache 23h.

## 3. Zero-UDP Fallback: WSS → Long-Poll Relay

If no `open` DataChannel within `3.5s`, downgrade to authoritative relay on same `443` host. Game logic doesn't change — only transport.

```
Guest                    Signaling+Relay (existing tag-server:443)
 |---WSS /tag-netplay--->|  PeerJS signaling (unchanged)
 |---ICE (hostile)---X   |  UDP dropped / symmetric NAT
 |---WSS /tag-relay----->|  JOIN {room,peerId} → server forwards
 |<--game packets 20Hz-->|  host is still authoritative sim
 [WSS blocked?] ---fallback---> POST /api/relay/send + GET /api/relay/poll (plain HTTPS, no Upgrade)
```

Server cost: ~2KB/s/player at 20Hz with your `packPlayer()` (~78% packed already). Voice must auto-mute in relay mode.

Server diff (`tag-server/server.js`, add `npm i ws`):
```js
const {WebSocketServer}=require('ws');
const relayWss=new WebSocketServer({server,path:'/tag-relay'});
const relayRooms=new Map(); // roomId -> Map(peerId->ws)
const relayQueues=new Map(); // "room:peerId" -> [msg] for long-poll
relayWss.on('connection',ws=>{
  let room='',pid='';
  ws.on('message',raw=>{
    try{
      const m=JSON.parse(raw);
      if(m.t==='join'){room=m.room;pid=m.peerId;
        if(!relayRooms.has(room))relayRooms.set(room,new Map());
        relayRooms.get(room).set(pid,ws);return;}
      const peers=relayRooms.get(room); if(!peers)return;
      const targets=m.to?[m.to]:[...peers.keys()].filter(k=>k!==pid);
      for(const t of targets){
        const s=peers.get(t);
        const env=JSON.stringify({from:pid,data:m.data});
        if(s&&s.readyState===1)s.send(env);
        else{const k=room+':'+t;if(!relayQueues.has(k))relayQueues.set(k,[]);relayQueues.get(k).push({from:pid,data:m.data});}
      }
    }catch(e){}
  });
  ws.on('close',()=>{try{relayRooms.get(room)?.delete(pid);}catch(e){}});
});
// Long-poll fallback when Upgrade is stripped by proxy
app.post('/api/relay/send',(req,res)=>{ /* same fan-out, push to relayQueues */ res.json({ok:true}); });
app.get('/api/relay/poll',(req,res)=>{
  const k=(req.query.room||'')+':'+(req.query.peerId||'');
  const q=relayQueues.get(k)||[]; relayQueues.set(k,[]); res.json({msgs:q});
});
```

## 4. Drop-in Blueprint for `tag/index.html`

Replace `ICE_SERVERS:14921` and patch `netConnectPeer:15877` + `netSend*`. All namespaced to avoid collisions.

```js
/* === REPLACE ICE_SERVERS block === */
const TURN_STATIC_FALLBACK = [
  { urls:['turn:openrelay.metered.ca:443?transport=tcp','turn:openrelay.metered.ca:80?transport=tcp'],
    username:'openrelay', credential:'openrelay' }
];
let ICE_SERVERS = [
  { urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:global.stun.twilio.com:3478'] },
  ...TURN_STATIC_FALLBACK
];
// Boot: fetch dynamic TURNS (self coturn + Metered) — call once at load
async function netRefreshIce(){
  try{
    const base = (typeof netDirBase==='function'?netDirBase():'https://tag-netplay-server.onrender.com');
    const r = await fetch(base+'/api/turn',{cache:'no-store'});
    if(r.ok){ const j=await r.json();
      if(j&&j.iceServers&&j.iceServers.length) ICE_SERVERS=[ICE_SERVERS[0],...j.iceServers,...TURN_STATIC_FALLBACK];
    }
  }catch(e){}
  try{
    // Metered REST (optional second source)
    // const m=await fetch('https://tag.metered.live/api/v1/turn/credentials?apiKey=YOUR_KEY').then(r=>r.json());
    // if(m&&m.length) ICE_SERVERS.push(...m);
  }catch(e){}
}

/* === ADD: relay transport (place after NET decl) === */
const RELAY = { mode:'p2p', ws:null, pollTimer:null, room:'', pid:'', peerReady:false, deadline:3500, _t0:0 };
function netRelayBase(){ try{return (typeof netDirBase==='function'?netDirBase():'').replace(/^http/,'ws');}catch(e){return '';} }
function netEnterRelay(reason){
  if(RELAY.mode==='relay')return; RELAY.mode='relay';
  try{netToast('Strict network detected — relay mode ('+reason+')');}catch(e){}
  try{ if(typeof VOICE!=='undefined'){VOICE.enabled=false; try{voiceStopLocal();}catch(e){} } }catch(e){}
  const base=netRelayBase();
  const openWs=()=>{
    try{
      RELAY.ws=new WebSocket(base+'/tag-relay');
      RELAY.ws.onopen=()=>{RELAY.ws.send(JSON.stringify({t:'join',room:NET.room,peerId:NET.myId}));};
      RELAY.ws.onmessage=(ev)=>{try{const m=JSON.parse(ev.data);netOnData(m.data,{peer:m.from,send:(d)=>netRelaySend(m.from,d)});}catch(e){}};
      RELAY.ws.onclose=()=>netEnterPolling();
      RELAY.ws.onerror=()=>{try{RELAY.ws.close();}catch(e){} netEnterPolling();};
    }catch(e){netEnterPolling();}
  };
  openWs();
  // 3.5s P2P watchdog is armed in netConnectPeer below; this fn is its target
}
function netEnterPolling(){
  if(RELAY.pollTimer)return;
  const base=(typeof netDirBase==='function'?netDirBase():'');
  RELAY.pollTimer=setInterval(async()=>{
    try{
      const r=await fetch(base+'/api/relay/poll?room='+encodeURIComponent(NET.room)+'&peerId='+encodeURIComponent(NET.myId));
      const j=await r.json();
      for(const m of (j.msgs||[])) netOnData(m.data,{peer:m.from,send:(d)=>netRelaySend(m.from,d)});
    }catch(e){}
  },600);
}
function netRelaySend(to,data){
  const base=(typeof netDirBase==='function'?netDirBase():'');
  if(RELAY.ws&&RELAY.ws.readyState===1){RELAY.ws.send(JSON.stringify({to,data}));return;}
  fetch(base+'/api/relay/send',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({room:NET.room,from:NET.myId,to,data})}).catch(()=>{});
}

/* === PATCH netSendFast / netSendRel: prepend relay check === */
function netSendFast_patched(peerOrPair,msg){
  if(RELAY.mode==='relay'){ const pid=(typeof peerOrPair==='string')?peerOrPair:peerOrPair?.peerId; netRelaySend(pid||'HOST',msg); return; }
  // ...existing body
}
function netSendRel_patched(peerOrPair,msg){
  if(RELAY.mode==='relay'){ const pid=(typeof peerOrPair==='string')?peerOrPair:peerOrPair?.peerId; netRelaySend(pid||'HOST',msg); return; }
  // ...existing body
}

/* === PATCH netConnectPeer: peerOptions + 3.5s watchdog === */
 // peerOptions = { host,port,path,secure, debug:0,
 //   config:{ iceServers:ICE_SERVERS, iceCandidatePoolSize:2, iceTransportPolicy:'all' } };
 // After NET.peer.on('open'): RELAY._t0=performance.now(); RELAY.mode='p2p';
 // setTimeout(()=>{ const pair=NET.conns.get(NET._hostId); const open=pair&&(pair.rel?.open||pair.fast?.open);
 //   if(!open) netEnterRelay('no-p2p-3.5s'); }, RELAY.deadline);
 // On ICE failure retry once with {iceTransportPolicy:'relay'} before relay:
 // NET.peer.on('error',e=>{ if(/ice|failed|disconnected/i.test(e.type||'')) netEnterRelay('ice-failed'); });
```

Wire-up checklist in `netConnectPeer`: call `await netRefreshIce()` before `new Peer()`, set `RELAY.room=cleanRoom; RELAY.pid=id`, arm watchdog only for guests; host just advertises `relay:true` in `spectator_init` so guests know to use it.

### Testing Checklist (simulate school NAT locally)

1. `chrome://webrtc-internals` — create room, verify `candidate-pair: relay/udp or relay/tcp` appears; if only `host/srflx`, TURNS creds are wrong.
2. Block UDP: Windows Firewall outbound block `UDP 3478,19302,5349` + `chrome --disable-webrtc-encryption` off; game must flip to `relay mode` toast ≤3.5s and remain playable.
3. Block `Upgrade`: `curl -i -N -H "Connection: Upgrade" https://tag-netplay-server.onrender.com/tag-relay` must fail through school proxy test (use Burp/ZAP to strip `Upgrade`); verify long-poll `POST /api/relay/send` still moves players.
4. Throttle: DevTools Network `Slow 3G` + CPU 4x — `bufferedAmount>32768` guard in `netSendFast` must drop, no disconnect.
5. Cross-network: phone on LTE + laptop on university Wi-Fi, both join same code; if P2P fails, both show relay and `ping` via `pong` still <400ms.
6. Load: `turnutils_uclient -T turns:turn.tag-game.com:443` x 50 parallel; `total-quota=1000` must not return `486`.

Do the above and university/school symmetric-NAT + UDP-block + DPI cases all converge on the same working path: `HTTPS/443 → WSS relay → game`, with WebRTC P2P used opportunistically when allowed.
