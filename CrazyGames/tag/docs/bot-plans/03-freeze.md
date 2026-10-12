# Bot Plan — 03 Freeze Tag

> One new verb: **rescue**. Everything else is party chase. Smallest brain upgrade after party — do this second.

## Mode recap
- Runners vs IT team (`match.itTeam`); tagged runner freezes in place (`vx=vy=0`, `hunter.js:935`); teammate touch unfreezes instantly (`hunter.js:907`); all runners frozen → hunters win (`:949`, `endMatch`); timer out → runners win (`career.js:191`). Tag/rescue path `hunter.js:898` (rescue loop has NO host/guest guard — guest self-unfreeze flickers; engine must not rely on guest-side rescue).
- Min 3 players (`wiring.js:210`). Currently vote-gated "coming soon" (`bot_ai.js:1072`) but menu-playable.

## Bots today
- Hunter bot: nearest unfrozen runner ✓ (`bot_engine.js:420` skips frozen).
- Runner bot: flees chaser; **rescues only if chaser >260px away** (`:443–456`) — too timid, and `rescuingTeammate` never changes steering priority downstream (Anvil logic can override a rescue run).
- Gaps: no rescue courage model, frozen bots are statues (correct — input zeroed), no "guard the frozen" hunter play, no endgame urgency.

## Roster
| | Count | Notes |
|---|---|---|
| Min | 3 | 1 hunter + 2 runners (min legal). |
| Ideal | 5–6 | 2 hunters + 3–4 runners. Rescue chains need bodies. |
| Max | 8 | more runners = unfreezable swarm; more hunters = oppressive. |
| Solo | 1 human runner + 1 hunter bot + 2 runner bots | human learns rescue play with bot backup. |

## Behavior spec
- **Runner bots — rescue courage:** compute `risk = chaserDist / frozenDist`. If risk > 1.6 (chaser far), go rescue at full speed. If 0.8–1.6, feint: approach to 200px, bait chaser toward you, peel off (normal/hard). If < 0.8, keep fleeing — no suicide rescues on easy, ever; hard may attempt if timer <20s and team is losing.
- **Runner bots — chain rescues:** after unfreezing a mate, both split opposite directions (180° split) for 2s so the hunter can't re-tag both. The rescued bot gets 1.5s "sprint bonus" courage (runs through chaser radius to escape).
- **Hunter bots:** nearest unfrozen runner, BUT if a rescue run is detected (runner bot heading at a frozen mate), nearest hunter intercepts the *rescuer*, not the frozen statue (cut the play, not the player). Second hunter guards the biggest frozen cluster (stands ~150px off, waits). This creates the mode's signature standoff.
- **Frozen bots:** statues (no change). On unfreeze: 1s confusion? No — instant full brain (unfreeze pops are celebratory; a stumbling bot feels broken, not fair).
- **Endgame:** hunters ahead (≥half runners frozen) + <20s → hunters abandon guard, all-out chase. Runners ahead + <20s → runners stop rescuing unless risk > 2.5 (protect the lead).

## Difficulty in this mode
- easy: rescues only when chaser >400px away; hunters never guard, never intercept rescuers.
- normal: 260px rule (today's) + split-after-rescue.
- hard: full courage model + guard + intercept + endgame.

## Tuning
| Knob | Value | Notes |
|---|---|---|
| Rescue courage (normal) | chaser >260px | today's value, keep |
| Rescue courage (hard) | risk ratio 1.6 | dynamic |
| Guard distance | 150px off cluster | |
| Split duration | 2s opposite dirs | |
| Sprint bonus (rescued) | 1.5s | courage override |

## Acceptance tests
- 2 hunters + 4 runners, 60s: ≥2 rescues occur (rescue path exercised), match doesn't end all-frozen in <30s (bots aren't free kills).
- Frozen bot: zero input, zero drift (already true — regression guard).
- Hunter bot with 2 frozen + 1 free runner: targets the free runner (no statue-chasing).

## Decisions needed
- [ ] Hard bots may attempt risky (<0.8) rescues late-game?
- [ ] Hunter guard-the-cluster play (can feel campy — add only with a visible "guarding" indicator)?
- [ ] Un-gate freeze from map vote (it's fully implemented)?
