# Bot Plan — 00 Overview: from 1v1 brains to a full roster

> Status: PROPOSAL — review each mode file, tick the Decisions, then we implement in rollout order.
> Code refs are to current `tag/js/` (`bot_engine.js` = brain, `bot_ai.js` = menu/lobby, `physUpdate` = body).

## Where bots live today

- **Brain:** `botInputFor(p, dt)` (`bot_engine.js:290`) — returns `{dir, jumpEdge, jumpHeld, downHeld}`. Input-only: the host simulates bot bodies through the exact same `physUpdate` as humans. **This architecture stays.** It is the reason netplay never desyncs on bots, and every plan below assumes it.
- **Body:** `physUpdate` (`bot_engine.js:1263`) — per-mode top speeds already live here (IT 582 / runner 504, infection 504–615, bomb carrier 565, crown 460–540, CTF carrier 504 / others 582).
- **Setup:** `menu.slotIsBot[10]` + `menu.slotBotDiff[10]` (`bot_ai.js:617`), card assign in `ui.js:2451`, autofill in `ui.js:1703`, online `NET.botSlots` + `netAddBot` (`netplay.js:4099`).
- **Target select today:** one branch per mode inside `botInputFor` (`bot_engine.js:311–459`): crown → king/pedestal, bomb → carrier/nearest, infection → nearest enemy, hunter → cross-team, CTF → `ctfBotThink` (the only live `*BotThink`), else party/teams/freeze → nearest + Hound/Anvil split (`≈471+`).

## What changes (pillars)

1. **Difficulty becomes capability masks, not one number.** Today `easy` only slows the think rate (0.09→0.16s, `bot_engine.js:297`) and everything else — intercept solver, pad meta, pincers — runs at full strength. New tiers:
   | | think | intercept solver | pad meta | pincer/roles | aim error | reaction gate |
   |---|---|---|---|---|---|---|
   | easy | 0.22s | off (greedy chase) | off | off | ±90px | 0.25s |
   | normal | 0.14s | on, sloppy | off | Hound only | ±45px | 0.12s |
   | hard | 0.09s | on, sharp | on | Hound+Anvil+mode roles | ±25px | 0.05s |
   New `normal` tier needs a 3-way UI cycle (today `toggleSlotBotDiff` is easy↔hard only, `bot_ai.js:642`).
2. **Target claims.** Today every hunter bot independently picks "nearest", so 3 bots stack one runner, and a 2.25× human-preference (`bot_engine.js:429`) makes it feel rigged. New rule: per-frame claim table (slot→target), second bot takes second-best unless flanking (Anvil keeps its cut-off). Human preference capped at **1.3×**, normal/hard only.
3. **No-target = patrol, never freeze.** The `if(!target) return zero-input` (`bot_engine.js:462`) becomes a fallback: nearest platform center → waypoint patrol. A bot may look dumb for 2s; it may never stand dead.
4. **Mode brains stay in mode files, driving stays in the engine.** Revive the dead `*BotThink` stubs as pure think functions returning `{isIt, target, urge}` (like `ctfBotThink` today). `botInputFor` keeps owning movement. No think function ever writes physics.
5. **Fairness gates are per-tier, not global.** Reaction delay, aim error, and role complexity scale with difficulty. A hard bot may cut you off; an easy bot may never.

## Roster policy (applies to every mode)

| Context | Rule |
|---|---|
| Solo (1P) | pure duel by default: 1 human + 1 bot. Optional +1 bot (menu toggle). This preserves your original 1v1. |
| Local party | humans pick slots; **Fill with bots** button tops up to the mode's ideal count; P1 is never a bot (`ui.js:1743` already guarantees this). |
| Online | host autofill (`netAddBot`) tops up to ideal when lobby < ideal; bots are host-simulated, difficulty = host's per-slot setting (fix: `netplay.js:4102` clobbers difficulty to hard — write `menu.slotBotDiff[targetSlot]` instead). |
| Watch (bots tab) | all-bot exhibition; used for balance testing. |

Per-mode ideal counts live in each mode file. Global caps: never more than 6 bots without a human (perf + chaos), never more bots than `MAXP - humans`.

## Shared movement contract (engine owns, modes don't touch)

- Think at tier rate; steer every frame from last decision (no jitter).
- Coyote/buffer/pads identical to humans (already true via `physUpdate`).
- Stuck recovery (stall detect → unstick window → bonk blacklist) stays global.
- Freeze/cage/eliminated/fumble stun → zero input (already at `bot_engine.js:291–292,1265–1267,1272`).

## Testing (acceptance harness, per mode + global)

Global asserts for a 60s all-bot match on map 0: no bot idle >3s, no NaN positions, ≥1 tag per 20s (mode-adjusted), easy bots score worse than hard bots over 3 runs. Per-mode asserts in each file (e.g. bomb: fuse never hits 0 with carrier standing still… actually it should — asserts must encode *correct* play: carrier passes before 3s, CTF: flag touches home within 45s, etc.).

## Rollout order (easiest brain → hardest)

1. Party FFA (already 80% there — claims + patrol + tiers)
2. Freeze (one new behavior: rescue)
3. Infection (asymmetric speeds + survivor grouping)
4. Bomb (fuse urgency + passing)
5. Crown (immunity + scoring awareness + king holding)
6. Hunter tournament (cage + rounds + cross-team)
7. CTF (attacker/defender/carrier roles — biggest think)
8. Teams (coordination layer on top of party)

## Decisions needed (global)

- [ ] Add `normal` tier to the difficulty UI (3-way cycle)? (Recommended: yes.)
- [ ] Cap human-preference at 1.3×? (Recommended: yes.)
- [ ] Solo stays pure 1v1 by default? (Recommended: yes.)
- [ ] Online autofill target = mode ideal count? (Recommended: yes.)
