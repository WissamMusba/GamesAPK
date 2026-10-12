# Level 9 — Design Plan (DUAL TOWERS, rebuilt)

**Date:** 2026-09-13 · **Target:** `index.html` `const LEVELS[8]` only · Preview: `level9.html`

---

## The idea

The name promises **two towers**. Right now there are three, two of them almost coincident (x=1200 and x=1300), and the crumble platforms drop in 0.45s — fast enough that they're just a reflex test, not a decision.

**The concept: two pressures that pull in opposite directions.**

- The **collapse timer** pushes you *forward* — every platform starts dying the moment you touch it, so standing still is losing.
- The **tower beams** push you *back* — stepping into a beam is safe for 0.9s, so charging blindly gets you caught.

Neither pressure is interesting alone. Together they force the one thing this level should be about: **finding the rhythm where you move fast enough to stay ahead of the collapse, but slow enough to stay out of the light.** That's the whole level.

To make that work, the crumble platforms get your requested **4-second hold** instead of 0.45s. Four seconds is *long* — long enough that you'll be tempted to stop and wait for a beam. That temptation is the trap. Waiting out a tower costs you ~1s; waiting out the collapse costs you the platform.

---

## Layout (w=3600, door 3300, par 40)

```
        C1    C2    C3    C4    C5    C6    C7    C8        H1(key)
ground  ─┐  ┌─┐  ┌─┐  ┌─┐  ┌─┐  ┌─┐  ┌─┐  ┌─┐  ┌─┐        ┌──┐   plateau
         │  │ │  │ │  │ │  │ │  │ │  │ │  │ │  │ │        │  │   ┌────┐
   ▲A────┘  └─┘  └─┘  └─┘  └─┘  └─┘  └─┘  └─┘  └──────────┘  └───┘    ──► gate
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ spikes ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  safe  ▓▓▓
                        ▲B
```

**The chain — 8 crumble platforms, `collapse 4.0s`, `respawn 6.0s`**

| | x | y | | | x | y |
|---|---|---|---|---|---|---|
| C1 | 620 | 500 | | C5 | 1660 | 450 |
| C2 | 880 | 450 | | C6 | 1920 | 420 |
| C3 | 1140 | 400 | | C7 | 2180 | 450 |
| C4 | 1400 | 420 | | C8 | 2440 | 420 |

Gaps are all **100px** and rises **≤60px** — deliberately *easy* jumps. The difficulty is not the platforming, it's the timing. A 6s respawn means a dropped platform stays gone long enough that you commit to a route.

**Tower A** — ceiling, x=760, sweeps 600→1350 at ty=520, speed 0.3, grace 0.9s
**Tower B** — ceiling, x=1900, sweeps 1300→2800 at ty=520, speed 0.3, grace 0.9s

Each watches half the chain. Both are mounted **off-centre** from the platforms they watch — the lesson from level 8: a ceiling tower directly above its target only clips you when the beam is near its own x, so it never actually catches anyone.

**Why the numbers work:** the beam at platform height covers x≈616–1245 (A) and 1361–2708 (B) — so **every platform on the chain is watched by exactly one tower**, with no gaps and no overlap. Standing on a watched platform gets you caught in 0.9s; crossing one takes 0.5s. So: cross, don't linger. Waiting is only safe on the two ends of a sweep.

**The key gate (the set-piece):** the plate that raises the key platform sits on **C8 — a crumble platform**. Step on it, and you have 4 seconds to jump to the raised platform and grab the key while Tower B sweeps across you. Miss the window and C8 drops out from under you.

**The rest**
- Ground spikes `560→2760` under the whole chain, so a missed jump is fatal and the chain is genuinely one-way.
- Fixed plateau `[2760,440,260]` — the only safe ground, with an elevated spike at its far end.
- A spike-trap plate on the plateau, so the last thing the level does is lie to you.
- 4 guards, all on **fixed** platforms only (a guard standing on a crumble platform collapses it at 0.7s, not 4s — that's an engine detail, not a choice).
- 3 hide spots at the correct y (ground `y:610`, plateau `y:440`) so stealth actually works.
- 11 orbs, every one reachable from a standing or single-jump position, none in a pocket.

---

## What I'm deliberately not doing

- **No blades, no fire jets.** The two-pressure tension is the idea; adding a third hazard would just make it noisy. (And editor levels can't hold blades anyway.)
- **No 0.45s crumble anywhere.** If a platform needs to be punishing, the *towers* punish — the floor should be about commitment, not reflexes.
- **Not renaming it.** DUAL TOWERS will finally mean two towers.

## Success criteria

1. Beatable, door reachable, key reachable.
2. Every chain platform is watched by exactly one tower — no safe sliver, no dead zone.
3. Standing on a watched platform → caught in ~0.9s. Crossing one → clean.
4. Standing on any chain platform for 4s → it drops.
5. 5/5 hide spots usable, 11/11 orbs reachable, no runtime errors.

---

## Correction after verification — the plan above was wrong about the towers

The first build had each tower sweeping **half the chain** (1150px / 1500px at speed 0.3). In-game, **neither tower ever caught anyone.** The maths says why:

> A beam's dwell on a fixed spot is `2 × tolerance ÷ (sweepWidth × 1.5 × speed)`.
> Half-chain sweep: **0.09–0.11s**. The grace is 0.9s.
> The beam was gone eight times faster than it could ever accumulate exposure.

There's a second constraint I'd missed: the beam has to **come back** before the platform dies. A slow sweep that dwells long enough takes >6s to return, but the stone drops at 4s — so the collapse always won and the towers were decoration.

Solving both at once: the sweep width is *forced* (it must map to the platform width, so `sweep × frac = 150px`), leaving only beam width and speed free.

| spread | speed | dwell | cycle | |
|---|---|---|---|---|
| 38 | 0.30 | 0.83s | 6.67s | fails — too slow to return |
| 90 | 0.60 | 0.82s | 3.33s | fails — dwell under the grace |
| **130** | **0.60** | **1.14s** | **3.33s** | **both satisfied** |

So **each tower now watches exactly one platform**, and the level is built around that: **two towers, two lit platforms.** The rest of the chain is dark but still collapsing — you sprint the dark stone and time the lit stone. That's a better level than the one I planned, and it's the only version where the name means anything.

Measured in-game:

```
CHAIN[0] (620)   TA misses   | TB misses     <- dark
CHAIN[1] (880)   TA catches 0.88s | TB misses  <- LIT by tower A
CHAIN[2] (1140)  TA misses   | TB misses     <- dark
CHAIN[3] (1400)  TA misses   | TB misses     <- dark
CHAIN[4] (1660)  TA misses   | TB misses     <- dark
CHAIN[5] (1920)  TA misses   | TB catches 0.88s  <- LIT by tower B
```

Exactly two lit platforms, caught in 0.88s against a 0.9s grace. Crossing one takes 0.5s, so crossing is clean and loitering is fatal.

