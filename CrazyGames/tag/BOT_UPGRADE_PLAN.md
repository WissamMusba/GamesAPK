# 🤖 TAG! — Bot AI Upgrade Implementation Plan: Pincer Tactics, Arc Interception & Watch Mode

> **Target File:** `CrazyGames/tag/index.html`  
> **Author:** Antigravity Engineering  
> **Execution Mode:** User implementation with AI auditor review  

---

## 1. Executive Summary & Goals

This implementation plan guides you step-by-step through upgrading the bot intelligence in `tag/index.html` without risking physics stability or breaking existing game modes.

### The 3 Core Deliverables:
1. **Spectator "Watch Bots" Mode:** Seamless 1-click spectator experience where 2 to 4 bots battle each other on any map and in any game mode (FFA, Freeze, Infection, Bomb, Crown).
2. **2D Ballistic Arc Jump Interception:** Instead of running helplessly along the floor when a human leap-frogs overhead, the hunter bot calculates the runner's aerial trajectory and executes an athletic mid-air intercept jump.
3. **Multi-Bot Pincer / Swarm Tactics (The Hound & The Anvil):** When 2 or more bots chase a runner, Bot 1 chases from behind while Bot 2 cuts off the forward landing zone, eliminating conga-lines and creating high-tension pincer traps.

---

## 2. ⚠️ What NOT to Do (Golden Guardrails)

* ❌ **DO NOT touch `physUpdate(p, dt, allow)` core constants:**
  - Do not change $G = 2100$, $JUMP\_V = 990$, $HOLD\_LIFT\_T = 0.10$, $RUN\_SPEED = 504$, or $IT\_SPEED = 582$. Human parkour feel and timings must stay 100% intact.
* ❌ **DO NOT touch multi-bot slot assignment:**
  - Keep `menu.slotIsBot`, `isBotSlot(p)`, and `isSlotBot(slotIdx)` exactly as they are. They are already decoupled and verified.
* ❌ **DO NOT touch Bomb Tag shield waiting or Freeze Tag rescue range:**
  - Keep the Bomb bot's center-lane stall during 2.0s shields and the Freeze Tag $260\text{px}$ rescue radius.
* ❌ **DO NOT make the bot an unbeatable frame-0 aimbot:**
  - Every mid-air intercept must have human-like reaction latency (2–3 frames / $0.05\text{s}$–$0.08\text{s}$ decision lag) and a small error margin ($\pm 25\text{px}$), so humans can still bait and juke the bot.
* ❌ **DO NOT allocate objects inside the 60fps loop:**
  - Reuse scalar variables and math calculations; do not allocate arrays or objects inside `solveBallisticIntercept` every frame.

---

## 3. Phase 1: "Watch Bots" Spectator Mode Audit

### What to Verify in `tag/index.html`:
1. **Menu Tab Hook (`menu.tab === 'bots'`):**
   - Ensure clicking the **⚔️ WATCH BOTS** tab in the top header sets `menu.tab = 'bots'`, sets slots 0 and 1 as bots (`menu.slotIsBot = [true, true, ...]`), and sets `menu.mode = 'rows'`.
   - In `drawMenu()`, verify the giant bottom action button displays:
     ```javascript
     if (isBots) startLabel = '▶ WATCH BOTS BATTLE';
     ```
2. **Spectator In-Game UX:**
   - Verify that on-screen touch buttons and mobile joysticks are automatically hidden during watch mode via `isBotVsBotWatch()`.
   - Ensure the results screen at match end allows pressing `SPACE`, `ENTER`, or clicking anywhere to start the next bot match immediately.
3. **Mode Freedom:**
   - In `cycleGameMode(d)`, ensure that while in the `bots` tab, you can freely cycle between all game modes (`party`, `freeze`, `infection`, `bomb`, `crown`) so you can watch bot tournaments across all modes!
   - *Fix if needed:* In `cycleGameMode`, remove the restriction `if(menu.tab === 'bots') return toast('...');` so bots can play all game modes.

---

## 4. Phase 2: 2D Ballistic Arc Jump Interception

### The Problem:
Currently, when a runner jumps into the air, the hunter bot only leads their horizontal X along the floor (`aimX = tx + vx * leadT`). The bot runs directly underneath the airborne human, stares at the ceiling, and misses the tag.

### Physics Formulation:
While airborne, the runner's vertical trajectory follows:
$$y(t) = y_0 + v_{y0} \cdot t + \frac{1}{2} G \cdot t^2 \quad (\text{with } G = 2100\text{ px/s}^2, \; v_y \le 1600\text{ px/s})$$

Single full-hold jump reach: $\Delta y = -270\text{ px}$  
Apex double-jump reach: $\Delta y = -510\text{ px}$  
Hunter horizontal sprint: $v_x = 582\text{ px/s}$

### Concrete Code Implementation:

Add this standalone helper function right above `botInputFor(p, dt)` (around line 7500):

```javascript
/* ==========================================================================
   2D BALLISTIC ARC INTERCEPT SOLVER
   Calculates if and when a grounded bot can jump up to tag an airborne runner.
   ========================================================================== */
function botSolveBallisticIntercept(bot, target, dt) {
  // Only intercept if target is airborne and bot has jump capability
  if (!target || target.grounded || (!bot.grounded && bot.airJumps <= 0 && bot.sideT <= 0)) {
    return null;
  }

  const cx = bot.x + bot.w / 2;
  const cy = bot.y + bot.h / 2;
  let tx = target.x + target.w / 2;
  let ty = target.y + target.h / 2;
  let tvx = target.vx || 0;
  let tvy = target.vy || 0;

  const simStep = 0.033; // 30Hz simulation steps
  const maxLookahead = 0.65; // Max 650ms predictive horizon

  for (let t = simStep; t <= maxLookahead; t += simStep) {
    // Integrate target ballistic arc
    tvy = Math.min(1600, tvy + 2100 * simStep);
    tx += tvx * simStep;
    ty += tvy * simStep;

    // Time for bot to sprint horizontally to target coordinate tx
    const dx = tx - cx;
    const tSprintX = Math.abs(dx) / 582; // IT_SPEED

    // Mid-air collision synchronization window (bot reaches X around time t)
    if (Math.abs(tSprintX - t) <= 0.08) {
      const dy = ty - cy; // dy < 0 means target is above bot

      // A. Grounded Single Jump Window (Target 40px to 260px above bot)
      if (dy >= -265 && dy <= -35 && bot.grounded) {
        return {
          interceptDir: Math.sign(dx) || (bot.face || 1),
          shouldJump: true,
          jumpHold: 0.12,
          isDoubleJump: false,
          targetX: tx,
          timeToHit: t
        };
      }

      // B. Apex Double Jump Window (Target 265px to 500px above bot)
      if (dy >= -505 && dy < -265 && (bot.airJumps > 0 || (settings.doubleJump && !bot.grounded))) {
        return {
          interceptDir: Math.sign(dx) || (bot.face || 1),
          shouldJump: true,
          jumpHold: 0.14,
          isDoubleJump: true,
          targetX: tx,
          timeToHit: t
        };
      }
    }
  }

  return null;
}
```

### Hooking Into `botInputFor(p, dt)`:
Inside `botInputFor(p, dt)`, inside the `if(isIt)` hunting block (around lines 7625–7684):
1. Call `const intercept = botSolveBallisticIntercept(p, target, stepDt);`.
2. If `intercept !== null`:
   - Set `want = intercept.interceptDir`.
   - Set `S.jumpQ = true; S.jumpHoldT = intercept.jumpHold;`.
   - Skip horizontal ground-lead logic because the bot is locked into the mid-air intercept trajectory.
3. **Reaction Delay Check:** Guard with `if (S.decideT <= botThinkRate * 0.5)` so the bot only reacts after a human-like delay, giving players a chance to feint in mid-air.

---

## 5. Phase 3: Multi-Bot Swarm Pincer Tactics (The Hound & The Anvil)

### The Problem:
When 2 or more bots are on the hunting team (or in Infection mode with multiple zombies), all bots calculate the exact same path. They stack directly on top of each other, forming a single conga-line that is trivially easy to jump over.

### The Solution:
Differentiate bot roles dynamically based on proximity:
* **The Hound (Closest Bot):** Takes the direct pursuit vector, driving the runner forward.
* **The Anvil (Flanking Bot):** Takes an anticipatory cutoff vector, predicting where the runner will land/escape and heading there to cut them off.

### Concrete Code Implementation:

Inside `botInputFor(p, dt)` in `tag/index.html` (around line 7530):

```javascript
/* Determine if this bot is the primary chaser (Hound) or cut-off ambusher (Anvil) */
let myRole = 'hound';
if (isIt) {
  let myDistSq = (target.x - cx) ** 2 + (target.y - cy) ** 2;
  // Check if any teammate hunter bot is closer to this target than I am
  for (const ally of match.players) {
    if (ally === p || ally.isEliminated) continue;
    const isAllyHunter = isTeam ? (ally.team === p.team) : (ally === match.players[match.it]);
    if (isAllyHunter) {
      const allyDistSq = (target.x - (ally.x + ally.w / 2)) ** 2 + (target.y - (ally.y + ally.h / 2)) ** 2;
      if (allyDistSq < myDistSq) {
        myRole = 'anvil'; // Ally is closer; I will flank and cut off the runner!
        break;
      }
    }
  }
}
```

### Modifying Chase Steering for 'The Anvil':
When `myRole === 'anvil'`:
Instead of aiming at `target.x`, the Anvil aims at the **projected escape platform**:
```javascript
if (isIt && myRole === 'anvil') {
  // Predict runner's forward momentum 0.4s into the future
  const runnerRunDir = Math.sign(target.vx || target.face || 1);
  const cutoffX = target.x + runnerRunDir * 200; // 200px ahead of runner
  
  // Aim toward the cutoff zone rather than the runner's back
  want = (cutoffX > cx + 15) ? 1 : (cutoffX < cx - 15 ? -1 : (Math.sign(dx) || 1));
  
  // If runner is above and moving toward an edge, jump early to contest the platform ledge
  if (dy < -40 && p.grounded && Math.abs(cutoffX - cx) < 160) {
    S.jumpQ = true;
    S.jumpHoldT = 0.12;
  }
}
```

---

## 6. Step-by-Step Execution Plan

Follow these steps in order:

### Step 1: Polish the "Watch Bots" Tab
- Open `tag/index.html`.
- Search for `modeTabs` (around line 12610).
- Confirm the `bots` tab is present.
- In `cycleGameMode()`, make sure mode switching is enabled for the `bots` tab so you can test all game modes with bots.

### Step 2: Add `botSolveBallisticIntercept`
- Add the helper function above `botInputFor(p, dt)` (around line 7500).
- In `botInputFor(p, dt)`, call the helper under `if (isIt)`.
- Test that single-jump and double-jump mid-air catches trigger cleanly.

### Step 3: Add Swarm Pincer Roles (Hound & Anvil)
- Add the role detection loop right after target acquisition.
- When `myRole === 'anvil'`, apply the $+200\text{px}$ forward cutoff aim.
- Watch 2 bots chase 1 runner to confirm they split up and pinch the runner.

### Step 4: Validate Syntax & Run Automated Audit
Run the Node.js syntax verification command:
```powershell
node -e "const fs = require('fs'); const { execSync } = require('child_process'); const s = fs.readFileSync('tag/index.html', 'utf8'); const st = s.indexOf('<script>') + 8; const en = s.lastIndexOf('</script>'); fs.writeFileSync('temp_test.js', s.slice(st, en)); execSync('node --check temp_test.js', { stdio: 'inherit' }); fs.unlinkSync('temp_test.js'); console.log('Syntax: 100% PASS!');"
```

---

## 7. Self-Check Verification Checklist

Before reporting back, check off these items:
- [ ] `node --check` passes with zero syntax errors.
- [ ] Selecting the **⚔️ WATCH BOTS** tab starts a bot vs bot match.
- [ ] In Watch Bots mode, no on-screen touch buttons appear.
- [ ] When a runner jumps over the hunter bot, the bot leaps up to intercept them mid-air rather than running underneath on the floor.
- [ ] In 2v2 or Infection, 2 hunter bots flank the runner from opposite sides instead of walking in a single file line.
- [ ] Bomb Tag bots still hold center during 2.0s immunity shields.
- [ ] Freeze Tag bots still rescue frozen teammates within $260\text{px}$.

---

## 8. When You Are Ready
Once you have made the changes in `tag/index.html`, simply say:
> *"I finished implementing the bot upgrades. Check it and verify if it's done properly!"*

I will immediately run an automated verification sweep across syntax, kinematics, and logic to give you a full audit!
