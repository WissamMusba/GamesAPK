# Slow Online Lobby Join — Diagnosis Report

**Date:** 2026-10-18
**Scope:** `tag/js/netplay.js`, `tag-server/server.js`, `tag/index.html`, `tag/js/main.js`
**Symptom:** Joining an online room takes very long (previously fast), especially on a personal laptop.

---

## 1. How a join actually works (execution path)

```
Click room / press Join
  → netJoinAction()                 netplay.js:4656
  → netEnsureServer()               netplay.js:118     (server choice: probe up to 900ms)
  → netConnectPeer()                netplay.js:2324    (PeerJS → signaling server)
      ├─ fallbackTimer 4s           netplay.js:2400    (destroy peer → public PeerJS cloud)
      ├─ on('open') → peer.connect(host) ×2 (rel+fast)  netplay.js:2481-2484
      ├─ P2P watchdog 3.5s          netplay.js:2486    (→ relay mode or hold)
      └─ guest watchdog 7s (+7s, +7s) netplay.js:2509  (→ retry other server / re-gather ICE / fail)
  → conn open → send `hello`        netplay.js:2668-2684
  → host replies `assign` / `spectator_init`           netplay.js:2868+ / :3212
  → Guest sees "Connected as P1!"   netplay.js:3241    (join complete)
```

Normal warm-server join on a good network: **~2–4 s**.
Cold/slow path: **~10–20 s+**, worst case ~25 s before "Host not responding".

---

## 2. Live server measurements (probed 2026-10-18)

| Endpoint | Result | Time |
|---|---|---|
| `GET /health` | 200 | 1.70 s (first), 0.14 s (warm) |
| `GET /api/turn` | 200 | 0.14 s |
| `GET /api/rooms` | 200 | 0.15 s |
| `GET /tag-netplay/peerjs/id` | 200 | ~1.0 s |
| `POST /api/relay/send` | 200 | 0.15 s |
| `GET /api/relay/poll` | 200 | 0.78 s |
| `WSS /tag-relay` upgrade | 400 | — (inconclusive: tested through a TLS-intercepting proxy; re-test from a normal network) |

**Conclusion:** the deployed Render server is healthy and fast **when awake**. The problem is what the client does when the server is cold/slow, plus first-load costs on a fresh laptop.

---

## 3. Ranked root causes

### #1 — Render free-tier cold start triggers destroy-and-retry cascade (biggest)
- Signaling pinned to `tag-netplay-server.onrender.com` (`netplay.js:8-13`).
- Render free services sleep after ~15 min idle; wake-up takes 30–60 s.
- `server.js:54-56` comment confirms intent: *"Health check endpoint for uptime monitors (keeps Render / Railway awake 24/7)"* — no monitor appears active.
- `netConnectPeer` waits **only 4 seconds** for `open` (`netplay.js:2400-2408`), then **destroys the peer and rebuilds on public PeerJS cloud** (`0.peerjs.com`).
- If the host is on the dedicated server → guest gets `peer-unavailable` → `netGuestTryOtherServer()` (`netplay.js:2283-2304`) rebuilds back to the dedicated server with fresh ICE → 4 s window again. Each hop costs 2–5 s.
- Code comments admit this split-brain: `netplay.js:2279-2282` — *"host and guest can land on different PeerJS servers (dedicated vs public cloud) when the 5.5s fallback fires for only one side (e.g. Render cold start)"*.
- **Typical cold join ≈ 10–20 s.** Best explanation for "used to be fast, now slow".

### #2 — Directory joins can be sent to the wrong signaling server (self-inflicted)
- Host posts room to directory via `netUpdateHostDirectory()` → `netDirBase()` (`netplay.js:3823-3855`).
- `netDirBase()` (`netplay.js:144-152`) uses `NET._srv` (probe-preferred) or `PEER_SERVER_CONFIG` default — it **ignores `NET._onCloud`** and the actually connected peer host.
- So a host that fell back to cloud still lists itself in the Render directory. Guests joining from that list always pay the full miss → switch-server dance (cause #1 again) **even when the server is warm**.
- Invite links solve this via `&srv=` / `&cloud=1` (`netplay.js:2440-2447`), but the `/api/rooms` payload/response has **no server marker** (`server.js:100-112`), and UI room clicks only pass `hostPeerId` (`ui.js:420, 623, 2224, 2268`).

### #3 — Stacked timeouts, no progress feedback
Per join click (worst case):
| Step | Delay | Location |
|---|---|---|
| Server probe | up to 900 ms | `netplay.js:93`, `:75` |
| Custom-server fallback | 4 000 ms | `netplay.js:2400-2408` |
| P2P watchdog | 3 500 ms | `netplay.js:2486-2505` |
| Guest watchdog | 7 000 ms + 7 000 ms ×2 extensions ("Syncing…") | `netplay.js:2509-2551` |
| Relay capability probe | 2 500 ms cap | `netplay.js:992-1003` |

Total worst case ≈ **25 s** of a single static toast (`netToast('Joining room …')`, `netplay.js:4733`).

### #4 — Fresh-laptop / local network factors
- Render-blocking `<script>`s: CrazyGames SDK, **PeerJS from unpkg.com**, Google Fonts (`tag/index.html:16-19`). Fresh cache/DNS = slow boot before join even starts. If unpkg is blocked → "Networking unavailable" (`netplay.js:2411-2414`).
- VPN / filtered DNS / campus Wi‑Fi can block UDP/STUN. STUN/TURN list is `netplay.js:976-981` (Google/Twilio STUN + OpenRelay TURN). No candidates → full 3.5 s P2P delay → WSS relay.
- TLS-intercepting proxies break `WSS /tag-relay` (observed 400 upgrade) → falls to 600 ms HTTP long-poll (`netplay.js:1081-1104`).
- Same-laptop testing with host window in background: Chrome throttles timers; `main.js:26` stops the rAF loop for hidden hosts → guest sees "Syncing…" 7–21 s. Keep both windows visible.

---

## 4. Verify on the affected laptop (2 minutes)

1. **DevTools → Network → filter `onrender`** — check WSS handshake time on join (cold wake = tens of seconds).
2. **DevTools → Console** — every stage logs `[NET] …` warnings (cloud fallback, relay mode, slow join). Append `?debug` to URL for the server probe log (`netplay.js:112`).
3. **`localStorage.tag_srv`** — `"src":"none"` means the last probe hit a sleeping server.
4. **Warm vs cold test** — join right after a session vs after 20+ min idle. Difference confirms cause #1.
5. **Disable VPN/DNS filtering** and retest; inspect `chrome://webrtc-internals` for slow candidate gathering.

---

## 5. Proposed fix plan (pending approval)

| # | Fix | Files | Risk |
|---|---|---|---|
| 1 | **Pin signaling server for list/invite joins**: carry `srv`/`cloud` marker in directory payload + `/api/rooms` whitelist; guest connects straight to host's real server; suppress cloud fallback when host server is known | `netplay.js`, `server.js`, `ui.js` | Low |
| 2 | **Adaptive fallback**: don't destroy a peer that hasn't opened in 4 s on a possibly-cold server; extend window, make cloud fallback last resort | `netplay.js:2400-2408` | Low |
| 3 | **Staged progress toasts**: "Contacting server… → Negotiating P2P… → Syncing with host…" | `netplay.js` (`netJoinAction`, watchdogs) | Very low |
| 4 | **Keep-warm cron**: GitHub Action / UptimeRobot hitting `/health` every 5–10 min | new workflow file | None |
| 5 | **Vendor `peerjs.min.js` locally** + `defer` CDN scripts | `tag/index.html`, new asset | Very low |
| 6 | Optional local testing: run `tag-server` locally, open game with `?selfserver=localhost` (self-host config exists, `netplay.js:20-47`) | docs only | None |

---

## 6. Key line-reference index

| What | Where |
|---|---|
| Server config (Render) | `tag/js/netplay.js:8-13` |
| Self-host config | `tag/js/netplay.js:20-47` |
| Server probe + 900 ms cap | `tag/js/netplay.js:62-142` |
| `netDirBase()` (wrong-server bug) | `tag/js/netplay.js:144-152` |
| ICE/STUN/TURN list | `tag/js/netplay.js:976-981` |
| Relay capability probe (2.5 s) | `tag/js/netplay.js:992-1003` |
| Relay + polling fallback | `tag/js/netplay.js:1014-1104` |
| Host peer-id directory fetch | `tag/js/netplay.js:2251-2277` |
| Split-brain self-heal (`netGuestTryOtherServer`) | `tag/js/netplay.js:2283-2304` |
| `netConnectPeer` (4 s fallback, watchdogs, connects) | `tag/js/netplay.js:2324-2624` |
| Host `hello` → `assign` | `tag/js/netplay.js:2868-2990`, `:3212-3246` |
| Host directory update | `tag/js/netplay.js:3823-3871` |
| `netHostAction` / `netJoinAction` | `tag/js/netplay.js:4550-4756` |
| Guest watchdog extensions | `tag/js/netplay.js:2509-2551` |
| Join UI handlers + `?room=` autojoin | `tag/js/netplay.js:5311-5381` |
| Boot background probe | `tag/js/main.js:231` |
| Hidden host stops rAF | `tag/js/main.js:26` |
| Directory API (no srv field) | `tag-server/server.js:96-116` |
| Keep-awake comment | `tag-server/server.js:54-56` |
| Render-blocking CDN scripts | `tag/index.html:16-19` |

## 7. Status - implemented (2026-10-18)

All six fixes are implemented and mirrored across `tag/`, `tag-server/` and `PokiGames/` (files byte-identical):

1. **Pinned joins.** `netUpdateHostDirectory()` posts the host's real endpoint (`srv`/`cloud`); `tag-server/server.js` `/api/rooms` returns them; `netJoinAction(code, hostPeerId, roomMeta)` pins to it (`NET._pinSrv`). Pinned joins are exempt from cloud fallback and from the flip-to-other-server rescue.
2. **Adaptive fallback** in `netConnectPeer`: the 4s decision is now health-probe verified (1.5s-capped probe starts at 2.2s); an alive-but-slow server gets one 4s extension; pinned joins hold the window; a new 22s pre-open fail guard replaces silent hangs. Recent "no server" probe results are trusted for 30s to skip re-probing.
3. **Staged toasts**: "Joining room..." -> "Reaching host..." (peer open) -> "Syncing with host..." (conn ready); relay kick-in shows "Direct link blocked - using relay...".
4. **Keep-warm cron**: already committed at `.github/workflows/keep-warm.yml` (pings /health every 5 min).
5. **PeerJS vendored**: `peerjs.min.js` (1.5.4, hash-verified against unpkg) now ships in `tag/`, `tag-server/` and `PokiGames/`; all HTML point at the local copy. No CDN dependency at join time.
6. **Local test recipe**: run `node server.js` in `tag-server/` (port 9000), serve `tag-server/` with any static server on another port, open `http://localhost:<staticport>/game.html?selfserver=localhost`.

**Verification done:** `node --check` on all modified JS; live round-trip against a local server confirms `/api/rooms` now carries `srv`/`cloud`; all join call sites and mirror files reviewed. End-to-end two-tab browser automation was flaky in the dev environment (headless WebRTC), so a quick manual join test on two tabs is recommended.

**Deploy notes:**
- Pushing this commit auto-deploys the Poki build (`PokiGames/`) and any Render auto-deploy for `tag-server/`.
- If Render does not auto-deploy, manually redeploy `tag-server` so `/api/rooms` exposes `srv`/`cloud`; until then guests simply stay unpinned (graceful, old behavior).
- Optional: an external uptime monitor (e.g. UptimeRobot) as a backup for the GitHub Actions keep-warm cron, since scheduled workflows can be delayed.
