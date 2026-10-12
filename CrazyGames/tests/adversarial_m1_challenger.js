/**
 * Empirical Challenger Adversarial Stress Suite for Milestone 1
 * Features: 1 (Syntax), 2 (Runtime Exports), 3 (Mode Fallback), 4 (Infection Wiring)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const { createGameSandbox, loadGameScript } = require('./e2e/harness');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function runTest(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

console.log('='.repeat(80));
console.log(' STARTING ADVERSARIAL CHALLENGER SUITE: MILESTONE 1');
console.log('='.repeat(80));

// ============================================================================
// PART 1: Syntax Parsing Across All Distributions (tag, tag-server, PokiGames)
// ============================================================================
console.log('\n--- PART 1: Syntax Parsing & Platform Verification ---');

const targetDirs = ['tag/js', 'tag-server/js', 'PokiGames/js'];
const allJsFiles = [];

function scanDir(dir) {
  const fullDir = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(fullDir)) return;
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      scanDir(rel);
    } else if (entry.name.endsWith('.js')) {
      allJsFiles.push(rel);
    }
  }
}

for (const d of targetDirs) {
  scanDir(d);
}

runTest(`Discovered all JS files across distributions (Found ${allJsFiles.length} files)`, () => {
  assert(allJsFiles.length >= 60, `Expected at least 60 JS files, found ${allJsFiles.length}`);
});

runTest(`node --check passes cleanly on all ${allJsFiles.length} files`, () => {
  const failed = [];
  for (const rel of allJsFiles) {
    const full = path.join(REPO_ROOT, rel);
    try {
      execSync(`node --check "${full}"`, { stdio: 'pipe' });
    } catch (e) {
      failed.push({ file: rel, error: e.message });
    }
  }
  assert(failed.length === 0, `Syntax errors in ${failed.length} files: ${JSON.stringify(failed)}`);
});

runTest('Strict mode evaluation of core mode modules', () => {
  const coreModes = [
    'tag/js/match.js',
    'tag/js/modes/bomb.js',
    'tag/js/modes/crown.js',
    'tag/js/modes/ctf.js',
    'tag/js/modes/infection.js',
    'tag/js/modes/wiring.js'
  ];
  for (const rel of coreModes) {
    const code = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const script = new vm.Script(`"use strict";\n${code}`);
    assert(script, `Failed compiling strict script for ${rel}`);
  }
});

// ============================================================================
// PART 2: Mode Initialization & State Verification Under Full Engine Wiring
// ============================================================================
console.log('\n--- PART 2: Mode Initialization & State Setup ---');

function createWiredSandbox() {
  const sb = createGameSandbox();
  sb.SLOTS = [
    { label: 'WASD', pad: 0 },
    { label: 'Arrows', pad: 1 },
    { label: 'IJKL', pad: 2 },
    { label: 'TFGH', pad: 3 },
    { label: 'P5', pad: 4 },
    { label: 'P6', pad: 5 },
    { label: 'P7', pad: 6 },
    { label: 'P8', pad: 7 },
    { label: 'P9', pad: 8 },
    { label: 'P10', pad: 9 }
  ];
  sb.SOLIDS = [
    { x: 0, y: 1300, w: 2400, h: 100, t: 'solid' },
    { x: 0, y: 1300, w: 2400, h: 100, t: 'solid' }
  ];
  loadGameScript(sb, 'tag/js/match.js');
  loadGameScript(sb, 'tag/js/modes/bomb.js');
  loadGameScript(sb, 'tag/js/modes/crown.js');
  loadGameScript(sb, 'tag/js/modes/ctf.js');
  loadGameScript(sb, 'tag/js/modes/infection.js');
  loadGameScript(sb, 'tag/js/modes/wiring.js');
  loadGameScript(sb, 'tag/js/bot_ai.js');
  loadGameScript(sb, 'tag/js/ui.js');

  // VM accessor helpers
  sb.getScreen = () => vm.runInContext('screen', sb);
  sb.getSettings = () => vm.runInContext('settings', sb);
  sb.getMenu = () => vm.runInContext('menu', sb);
  sb.getMatch = () => vm.runInContext('match', sb);
  return sb;
}

runTest('Bomb Mode startMatch() initializes authentic BOMB_MODE and does not fallback', () => {
  const sb = createWiredSandbox();
  sb.setMenuTab('solo');
  sb.setGameMode('bomb');
  sb.getMenu().slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  sb.startMatch();

  assert(sb.getScreen() === 'game', `Expected screen === 'game', got ${sb.getScreen()}`);
  assert(sb.getSettings().gameMode === 'bomb', `Expected gameMode === 'bomb', got ${sb.getSettings().gameMode}`);
  assert(sb.getMenu().gameMode === 'bomb', `Expected menu.gameMode === 'bomb', got ${sb.getMenu().gameMode}`);
  assert(sb.BOMB_MODE && sb.BOMB_MODE.active === true, 'Expected BOMB_MODE.active === true');
  assert(sb.crownState && sb.crownState.active === false, 'Expected crownState.active === false');
  assert(sb.ctfState && sb.ctfState.active === false, 'Expected ctfState.active === false');
  assert(sb.infectionState && sb.infectionState.active === false, 'Expected infectionState.active === false');
  assert(sb.BOMB_MODE.carrierIdx >= 0, 'Expected valid BOMB_MODE.carrierIdx');
  assert(sb.BOMB_MODE.state === 'playing', 'Expected BOMB_MODE.state === "playing"');
});

runTest('Crown Mode startMatch() initializes authentic crownState and does not fallback', () => {
  const sb = createWiredSandbox();
  sb.setMenuTab('solo');
  sb.setGameMode('crown');
  sb.getMenu().slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  sb.startMatch();

  assert(sb.getScreen() === 'game', `Expected screen === 'game', got ${sb.getScreen()}`);
  assert(sb.getSettings().gameMode === 'crown', `Expected gameMode === 'crown', got ${sb.getSettings().gameMode}`);
  assert(sb.getMenu().gameMode === 'crown', `Expected menu.gameMode === 'crown', got ${sb.getMenu().gameMode}`);
  assert(sb.crownState && sb.crownState.active === true, 'Expected crownState.active === true');
  assert(sb.BOMB_MODE && sb.BOMB_MODE.active === false, 'Expected BOMB_MODE.active === false');
  assert(sb.ctfState && sb.ctfState.active === false, 'Expected ctfState.active === false');
  assert(sb.infectionState && sb.infectionState.active === false, 'Expected infectionState.active === false');
  assert(sb.getMatch() && sb.getMatch().it === -1, 'Expected match.it === -1 in Crown Mode');
  assert(typeof sb.crownState.scores === 'object', 'Expected scores object initialized');
});

runTest('CTF Mode startMatch() initializes authentic ctfState, enforces teams, and does not fallback', () => {
  const sb = createWiredSandbox();
  sb.setMenuTab('solo');
  sb.setGameMode('ctf');
  sb.getMenu().slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  sb.startMatch();

  assert(sb.getScreen() === 'game', `Expected screen === 'game', got ${sb.getScreen()}`);
  assert(sb.getSettings().gameMode === 'ctf', `Expected gameMode === 'ctf', got ${sb.getSettings().gameMode}`);
  assert(sb.getMenu().gameMode === 'ctf', `Expected menu.gameMode === 'ctf', got ${sb.getMenu().gameMode}`);
  assert(sb.getSettings().teams === true, 'Expected settings.teams === true in CTF');
  assert(sb.ctfState && sb.ctfState.active === true, 'Expected ctfState.active === true');
  assert(sb.BOMB_MODE && sb.BOMB_MODE.active === false, 'Expected BOMB_MODE.active === false');
  assert(sb.crownState && sb.crownState.active === false, 'Expected crownState.active === false');
  assert(sb.infectionState && sb.infectionState.active === false, 'Expected infectionState.active === false');
  assert(sb.ctfState.bases && sb.ctfState.bases.length === 2, 'Expected 2 team bases in CTF');
  assert(sb.ctfState.flags && sb.ctfState.flags.length === 2, 'Expected 2 flags in CTF');
});

runTest('Infection Mode with <3 players aborts with warning and does NOT enter game', () => {
  const sb = createWiredSandbox();
  sb.setMenuTab('solo');
  sb.setGameMode('infection');
  sb.getMenu().slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1]; // 2 players
  sb.startMatch();

  assert(sb.getScreen() === 'menu', `Expected screen === 'menu' (abort), got ${sb.getScreen()}`);
  assert(sb.infectionState && sb.infectionState.active === false, 'Expected infectionState not active');
});

runTest('Infection Mode with >=3 players initializes authentic infectionState without fallback', () => {
  const sb = createWiredSandbox();
  sb.setMenuTab('solo');
  sb.setGameMode('infection');
  sb.getMenu().slotColor = [0, 1, 2, -1, -1, -1, -1, -1, -1, -1]; // 3 players
  sb.startMatch();

  assert(sb.getScreen() === 'game', `Expected screen === 'game', got ${sb.getScreen()}`);
  assert(sb.getSettings().gameMode === 'infection', `Expected gameMode === 'infection', got ${sb.getSettings().gameMode}`);
  assert(sb.getMenu().gameMode === 'infection', `Expected menu.gameMode === 'infection', got ${sb.getMenu().gameMode}`);
  assert(sb.infectionState && sb.infectionState.active === true, 'Expected infectionState.active === true');
  assert(sb.BOMB_MODE && sb.BOMB_MODE.active === false, 'Expected BOMB_MODE.active === false');
  assert(sb.crownState && sb.crownState.active === false, 'Expected crownState.active === false');
  assert(sb.ctfState && sb.ctfState.active === false, 'Expected ctfState.active === false');
  assert(sb.getMatch() && sb.getMatch().infectionMode === true, 'Expected match.infectionMode === true');
});

// ============================================================================
// PART 3: Consecutive Mode Transitions & Deactivation Cleanness (100 Cycles)
// ============================================================================
console.log('\n--- PART 3: Rapid Mode Transitions & Flag Cleanup ---');

runTest('100 Consecutive Mode Transitions ensure exactly one mode active and zero flag leakage', () => {
  const sb = createWiredSandbox();
  const modes = ['bomb', 'crown', 'ctf', 'infection', 'party'];
  sb.getMenu().slotColor = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1]; // 4 players

  for (let i = 0; i < 100; i++) {
    const targetMode = modes[i % modes.length];
    sb.setGameMode(targetMode);
    if (targetMode === 'ctf') {
      sb.getMenu().slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    }
    sb.startMatch();

    assert(sb.getScreen() === 'game', `Cycle ${i}: Expected screen === 'game'`);
    assert(sb.getSettings().gameMode === targetMode, `Cycle ${i}: Expected gameMode === '${targetMode}', got '${sb.getSettings().gameMode}'`);

    const bombActive = !!(sb.BOMB_MODE && sb.BOMB_MODE.active);
    const crownActive = !!(sb.crownState && sb.crownState.active);
    const ctfActive = !!(sb.ctfState && sb.ctfState.active);
    const infActive = !!(sb.infectionState && sb.infectionState.active);

    if (targetMode === 'bomb') {
      assert(bombActive && !crownActive && !ctfActive && !infActive, `Cycle ${i}: Only bomb should be active`);
    } else if (targetMode === 'crown') {
      assert(!bombActive && crownActive && !ctfActive && !infActive, `Cycle ${i}: Only crown should be active`);
    } else if (targetMode === 'ctf') {
      assert(!bombActive && !crownActive && ctfActive && !infActive, `Cycle ${i}: Only ctf should be active`);
    } else if (targetMode === 'infection') {
      assert(!bombActive && !crownActive && !ctfActive && infActive, `Cycle ${i}: Only infection should be active`);
    } else if (targetMode === 'party') {
      assert(!bombActive && !crownActive && !ctfActive && !infActive, `Cycle ${i}: No special modes should be active in party`);
    }

    sb.quitToMenu();
    assert(sb.getScreen() === 'menu', `Cycle ${i}: Expected screen === 'menu' after quit`);
  }
});

// ============================================================================
// PART 4: Tab Cycling & Mode Preservation
// ============================================================================
console.log('\n--- PART 4: Tab Cycling & Mode Preservation Invariants ---');

runTest('Tab cycling between solo, bots, and 2p preserves Bomb, Crown, CTF, Infection', () => {
  const sb = createWiredSandbox();
  const testModes = ['bomb', 'crown', 'ctf', 'infection'];
  const tabs = ['solo', 'bots', '2p', 'solo', 'bots', '2p'];

  for (const m of testModes) {
    sb.setMenuTab('solo');
    sb.setGameMode(m);
    assert(sb.getSettings().gameMode === m, `Initial mode setup failed for ${m}`);

    for (const t of tabs) {
      sb.setMenuTab(t);
      assert(sb.getSettings().gameMode === m, `Tab ${t} corrupted mode ${m} to ${sb.getSettings().gameMode}`);
      assert(sb.getMenu().gameMode === m, `Tab ${t} corrupted menu.gameMode to ${sb.getMenu().gameMode}`);
    }
  }
});

runTest('cycleGameMode across solo and bots iterates through all 5 valid modes properly', () => {
  const sb = createWiredSandbox();
  const expectedCycle = ['party', 'ctf', 'bomb', 'crown', 'infection'];

  for (const tab of ['solo', 'bots']) {
    sb.setMenuTab(tab);
    sb.setGameMode('party');

    for (let step = 1; step < expectedCycle.length; step++) {
      sb.cycleGameMode(1);
      const expectedMode = expectedCycle[step];
      assert(sb.getSettings().gameMode === expectedMode, `Tab ${tab}: Step ${step} expected ${expectedMode}, got ${sb.getSettings().gameMode}`);
    }

    // Wrap around back to party
    sb.cycleGameMode(1);
    assert(sb.getSettings().gameMode === 'party', `Tab ${tab}: Wrap around expected party, got ${sb.getSettings().gameMode}`);

    // Cycle backwards
    sb.cycleGameMode(-1);
    assert(sb.getSettings().gameMode === 'infection', `Tab ${tab}: Backward cycle expected infection, got ${sb.getSettings().gameMode}`);
  }
});

// ============================================================================
// PART 5: Adversarial Stateful Fuzzer (1,000 Iterations)
// ============================================================================
console.log('\n--- PART 5: Stateful Fuzzing Harness (1,000 Iterations) ---');

runTest('Adversarial Fuzzer (1,000 pseudo-random UI and Engine actions)', () => {
  const sb = createWiredSandbox();
  const validTabs = ['solo', 'bots', '2p', 'online'];
  const validModes = ['party', 'bomb', 'crown', 'ctf', 'infection'];
  let seed = 12345;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let step = 0; step < 1000; step++) {
    const action = Math.floor(pseudoRandom() * 6);

    switch (action) {
      case 0: { // setMenuTab (if in game, quit first)
        if (sb.getScreen() === 'game') sb.quitToMenu();
        const tab = validTabs[Math.floor(pseudoRandom() * validTabs.length)];
        sb.setMenuTab(tab);
        break;
      }
      case 1: { // cycleGameMode forward or backward (if in game, quit first)
        if (sb.getScreen() === 'game') sb.quitToMenu();
        const dir = pseudoRandom() < 0.5 ? 1 : -1;
        sb.cycleGameMode(dir);
        break;
      }
      case 2: { // setGameMode directly (if in game, quit first)
        if (sb.getScreen() === 'game') sb.quitToMenu();
        const mode = validModes[Math.floor(pseudoRandom() * validModes.length)];
        sb.setGameMode(mode);
        break;
      }
      case 3: { // startMatch
        // If in game, quit first then start
        if (sb.getScreen() === 'game') sb.quitToMenu();
        // Randomize player slots between 3 and 4 players (satisfies Infection & other modes)
        const pCount = 3 + Math.floor(pseudoRandom() * 2);
        const slots = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
        for (let s = 0; s < pCount; s++) slots[s] = s;
        sb.getMenu().slotColor = slots;
        sb.getMenu().slotTeam = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
        sb.startMatch();

        // When match starts, verify mode activation invariant
        if (sb.getScreen() === 'game') {
          const b = !!(sb.BOMB_MODE && sb.BOMB_MODE.active);
          const cr = !!(sb.crownState && sb.crownState.active);
          const ct = !!(sb.ctfState && sb.ctfState.active);
          const inf = !!(sb.infectionState && sb.infectionState.active);
          const activeCount = (b ? 1 : 0) + (cr ? 1 : 0) + (ct ? 1 : 0) + (inf ? 1 : 0);

          assert(activeCount <= 1, `Step ${step}: Multiple modes active! b=${b}, cr=${cr}, ct=${ct}, inf=${inf}`);
          const curMode = sb.getSettings().gameMode;
          if (curMode === 'party') {
            assert(activeCount === 0, `Step ${step}: Party mode but a mode was active!`);
          } else if (curMode === 'bomb') {
            assert(b, `Step ${step}: Bomb selected but BOMB_MODE.active is false`);
          } else if (curMode === 'crown') {
            assert(cr, `Step ${step}: Crown selected but crownState.active is false`);
          } else if (curMode === 'ctf') {
            assert(ct, `Step ${step}: CTF selected but ctfState.active is false`);
          } else if (curMode === 'infection') {
            assert(inf, `Step ${step}: Infection selected but infectionState.active is false`);
          }
        }
        break;
      }
      case 4: { // quitToMenu
        sb.quitToMenu();
        assert(sb.getScreen() === 'menu', `Step ${step}: quitToMenu failed to return to menu`);
        break;
      }
      case 5: { // returnToLobby
        sb.returnToLobby();
        assert(sb.getScreen() === 'menu', `Step ${step}: returnToLobby failed to return to menu`);
        break;
      }
    }

    // Invariant Checks after EVERY step
    const menu = sb.getMenu();
    const settings = sb.getSettings();
    assert(menu.tab !== undefined && menu.tab !== null, `Step ${step}: menu.tab became invalid`);
    assert(settings.gameMode !== undefined && settings.gameMode !== null, `Step ${step}: settings.gameMode became invalid`);
  }
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log(` CHALLENGER SUITE COMPLETE`);
console.log(` PASSED: ${passCount}`);
console.log(` FAILED: ${failCount}`);
console.log('='.repeat(80));

if (failCount > 0) {
  console.error('\nFAILURES SUMMARY:');
  for (const f of failures) {
    console.error(`- ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL ADVERSARIAL STRESS TESTS PASSED CLEANLY.');
  process.exit(0);
}
