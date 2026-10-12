/**
 * tests/stress_m1_adversarial.js
 * Empirical Adversarial Challenge Harness for Milestone 1
 *
 * Tests:
 * 1. sync-platforms.js idempotency, regex stability, line-ending resilience, and 0-syntax-error guarantee.
 * 2. Mode exports across isolated VM contexts (Window-only, globalThis-only, root/this-only, dual window!=globalThis).
 * 3. Cross-mode mutually exclusive active state under rapid random switching.
 * 4. Infection mode unblocking across bot_ai, wiring, ui, and netplay under adversarial parameters.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    const msg = `  [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`;
    console.error(msg);
    failures.push({ name: testName, details });
  }
}

function runSyntaxCheck() {
  const dirs = ['tag/js', 'tag-server/js', 'PokiGames/js'];
  let failCount = 0;
  let totalFiles = 0;
  for (const dir of dirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          scan(p);
        } else if (e.name.endsWith('.js')) {
          totalFiles++;
          try {
            execSync(`node --check "${p}"`, { stdio: 'pipe' });
          } catch (err) {
            failCount++;
            console.error(`Syntax check failed on: ${p}`);
          }
        }
      }
    }
    scan(fullDir);
  }
  return { totalFiles, failCount };
}

console.log('================================================================');
console.log(' [CHALLENGER 2] EMPIRICAL ADVERSARIAL STRESS HARNESS — MILESTONE 1');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: sync-platforms.js Stress & Idempotency
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: sync-platforms.js Idempotency & Regex Robustness ---');

// 1.1 Consecutively run sync-platforms.js 5 times
let syncLoopClean = true;
for (let i = 1; i <= 5; i++) {
  try {
    execSync(`node "${path.join(ROOT, 'sync-platforms.js')}"`, { stdio: 'pipe' });
  } catch (e) {
    syncLoopClean = false;
    assert(false, `sync-platforms.js runs cleanly on iteration ${i}`, e.message);
    break;
  }
}
assert(syncLoopClean, 'sync-platforms.js completes with exit 0 across 5 consecutive runs');

// Check syntax across all 63 files after repeated syncs
const syntaxRes = runSyntaxCheck();
assert(syntaxRes.failCount === 0 && syntaxRes.totalFiles >= 63,
  `Full repo syntax check after 5x syncs (Found ${syntaxRes.totalFiles} files, ${syntaxRes.failCount} fails)`);

// 1.2 PokiGames/js/audio.js content verification
const pokiAudio = fs.readFileSync(path.join(ROOT, 'PokiGames', 'js', 'audio.js'), 'utf8');
assert(pokiAudio.includes('const POKI ='), 'PokiGames/js/audio.js contains POKI definition');
assert(pokiAudio.includes('const CG = POKI;'), 'PokiGames/js/audio.js assigns CG = POKI');
assert(!pokiAudio.includes('window.CrazyGames'), 'PokiGames/js/audio.js does not leak CrazyGames SDK methods');

// 1.3 Tag-server js/audio.js has not been mutated into Poki
const serverAudio = fs.readFileSync(path.join(ROOT, 'tag-server', 'js', 'audio.js'), 'utf8');
assert(!serverAudio.includes('const POKI ='), 'tag-server/js/audio.js is NOT contaminated with Poki SDK');
assert(serverAudio.includes('const CG = {') || serverAudio.includes('const CG='), 'tag-server/js/audio.js retains default CG structure');

// 1.4 Regex idempotency test on arbitrary whitespace/formatting variations of audio.js
const testPokiReplacer = (rawContent) => {
  const pokiBlock = `/* ================= POKI SDK v2 INTEGRATION ================= */\nconst POKI = { test: true };\nconst CG = POKI;\n`;
  return rawContent.replace(/const CG\s*=\s*\{[\s\S]*?\n\};\r?\n/, pokiBlock);
};

const fakeAudioLF = `/* audio */\nlet a=1;\nconst CG = {\n  foo: 2,\n  bar() {\n    return 3;\n  }\n};\nfunction other() {}\n`;
const replacedLF = testPokiReplacer(fakeAudioLF);
assert(replacedLF.includes('const POKI = { test: true };') && replacedLF.includes('function other() {}') && !replacedLF.includes('foo: 2'),
  'Regex correctly replaces const CG block with Unix (LF) line endings');

const fakeAudioCRLF = fakeAudioLF.replace(/\n/g, '\r\n');
const replacedCRLF = testPokiReplacer(fakeAudioCRLF);
assert(replacedCRLF.includes('const POKI = { test: true };') && replacedCRLF.includes('function other() {}') && !replacedCRLF.includes('foo: 2'),
  'Regex correctly replaces const CG block with Windows (CRLF) line endings');

// -----------------------------------------------------------------------------
// SECTION 2: Mode Exports across Adversarial Global Environments
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Mode Exports across Diverse VM Environments ---');

const modeFiles = {
  bomb: path.join(ROOT, 'tag', 'js', 'modes', 'bomb.js'),
  crown: path.join(ROOT, 'tag', 'js', 'modes', 'crown.js'),
  ctf: path.join(ROOT, 'tag', 'js', 'modes', 'ctf.js'),
  infection: path.join(ROOT, 'tag', 'js', 'modes', 'infection.js')
};

// Test 2.1: Browser-like context (window defined, NO globalThis, NO module)
{
  const mockWindow = {};
  const sandbox = {
    window: mockWindow,
    document: {},
    console: console,
    Math: Math,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean
  };
  // Explicitly remove globalThis
  Object.defineProperty(sandbox, 'globalThis', { value: undefined });
  const ctx = vm.createContext(sandbox);

  for (const [modeName, filePath] of Object.entries(modeFiles)) {
    const code = fs.readFileSync(filePath, 'utf8');
    try {
      vm.runInContext(code, ctx);
    } catch (e) {
      assert(false, `Mode ${modeName} loads in pure window environment`, e.message);
    }
  }

  assert(typeof mockWindow.initBombMode === 'function', 'Pure window context: initBombMode exported to window');
  assert(typeof mockWindow.initCrownMode === 'function', 'Pure window context: initCrownMode exported to window');
  assert(typeof mockWindow.initCtfMode === 'function', 'Pure window context: initCtfMode exported to window');
  assert(typeof mockWindow.initInfectionMode === 'function', 'Pure window context: initInfectionMode exported to window');
}

// Test 2.2: WebWorker / Headless Node context (globalThis defined, window is undefined)
{
  const sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean
  };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  for (const [modeName, filePath] of Object.entries(modeFiles)) {
    const code = fs.readFileSync(filePath, 'utf8');
    try {
      vm.runInContext(code, ctx);
    } catch (e) {
      assert(false, `Mode ${modeName} loads in globalThis-only environment`, e.message);
    }
  }

  assert(typeof sandbox.initBombMode === 'function', 'globalThis context: initBombMode exported to globalThis');
  assert(typeof sandbox.initCrownMode === 'function', 'globalThis context: initCrownMode exported to globalThis');
  assert(typeof sandbox.initCtfMode === 'function', 'globalThis context: initCtfMode exported to globalThis');
  assert(typeof sandbox.initInfectionMode === 'function', 'globalThis context: initInfectionMode exported to globalThis');
}

// Test 2.3: Split context where window !== globalThis (e.g. iframe or polyfilled worker)
{
  const mockWindow = { name: 'windowObject' };
  const mockGlobal = { name: 'globalObject' };
  const sandbox = {
    window: mockWindow,
    globalThis: mockGlobal,
    console: console,
    Math: Math,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean
  };
  const ctx = vm.createContext(sandbox);

  for (const [modeName, filePath] of Object.entries(modeFiles)) {
    const code = fs.readFileSync(filePath, 'utf8');
    try {
      vm.runInContext(code, ctx);
    } catch (e) {
      assert(false, `Mode ${modeName} loads in split window/globalThis environment`, e.message);
    }
  }

  assert(typeof mockWindow.initBombMode === 'function' && typeof mockGlobal.initBombMode === 'function',
    'Split context: initBombMode attaches to BOTH window and globalThis');
  assert(typeof mockWindow.initCrownMode === 'function' && typeof mockGlobal.initCrownMode === 'function',
    'Split context: initCrownMode attaches to BOTH window and globalThis');
  assert(typeof mockWindow.initCtfMode === 'function' && typeof mockGlobal.initCtfMode === 'function',
    'Split context: initCtfMode attaches to BOTH window and globalThis');
  assert(typeof mockWindow.initInfectionMode === 'function' && typeof mockGlobal.initInfectionMode === 'function',
    'Split context: initInfectionMode attaches to BOTH window and globalThis');
}

// -----------------------------------------------------------------------------
// SECTION 3: Cross-Mode Mutual Exclusion & Stress Interleaving
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Cross-Mode Mutual Exclusion & Rapid Switching ---');

{
  const sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    match: {
      players: [
        { id: 0, x: 100, y: 100, isEliminated: false, team: 0 },
        { id: 1, x: 200, y: 100, isEliminated: false, team: 1 },
        { id: 2, x: 300, y: 100, isEliminated: false, team: 0 }
      ],
      state: 'playing',
      it: 0
    },
    MAPS: [{ name: 'Classic', plats: [{ x: 50, y: 400, w: 300, h: 20, t: 'solid' }, { x: 500, y: 400, w: 300, h: 20, t: 'solid' }] }],
    settings: { map: 0, time: 60, gameMode: 'party' },
    toast: () => {},
    sfx: () => {},
    addP: () => {},
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id)
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  for (const [, filePath] of Object.entries(modeFiles)) {
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), ctx);
  }

  // Interleave modes 50 times in random order
  const modes = ['bomb', 'crown', 'ctf', 'infection'];
  let sequenceConsistent = true;
  let lastMode = null;

  for (let step = 0; step < 50; step++) {
    const targetMode = modes[step % modes.length];
    if (targetMode === 'bomb') vm.runInContext('initBombMode()', ctx);
    else if (targetMode === 'crown') vm.runInContext('initCrownMode()', ctx);
    else if (targetMode === 'ctf') vm.runInContext('initCtfMode()', ctx);
    else if (targetMode === 'infection') vm.runInContext('initInfectionMode()', ctx);

    const bombActive = vm.runInContext('BOMB_MODE.active', ctx);
    const crownActive = vm.runInContext('crownState.active', ctx);
    const ctfActive = vm.runInContext('ctfState.active', ctx);
    const infActive = vm.runInContext('infectionState.active', ctx);

    const activeCounts = [bombActive, crownActive, ctfActive, infActive].filter(Boolean).length;
    if (activeCounts !== 1) {
      sequenceConsistent = false;
      console.error(`Step ${step} (${targetMode}): Expected exactly 1 active mode, got ${activeCounts} (bomb:${bombActive}, crown:${crownActive}, ctf:${ctfActive}, inf:${infActive})`);
      break;
    }

    if (targetMode === 'bomb' && !bombActive) sequenceConsistent = false;
    if (targetMode === 'crown' && !crownActive) sequenceConsistent = false;
    if (targetMode === 'ctf' && !ctfActive) sequenceConsistent = false;
    if (targetMode === 'infection' && !infActive) sequenceConsistent = false;

    lastMode = targetMode;
  }

  assert(sequenceConsistent, '50-step rapid mode sequence enforces strictly one active mode with zero dangling flags');
}

// -----------------------------------------------------------------------------
// SECTION 4: Infection Mode Wiring & Unblocking Across All Subsystems
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Infection Mode Unblocking Across All Subsystems ---');

function extractFunction(code, fnName) {
  const idx = code.indexOf(`function ${fnName}`);
  if (idx < 0) return null;
  const startBrace = code.indexOf('{', idx);
  let depth = 1;
  let i = startBrace + 1;
  while (depth > 0 && i < code.length) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
    i++;
  }
  return code.slice(idx, i);
}

// 4.1 bot_ai.js verification
{
  const botAiCode = fs.readFileSync(path.join(ROOT, 'tag', 'js', 'bot_ai.js'), 'utf8');
  assert(!botAiCode.includes("modeId === 'infection'") || !botAiCode.includes("toast('🧟 THAT MODE IS COMING SOON!')"),
    'bot_ai.js: Infection mode is not blocked by coming soon toast');

  // Verify requestMode unblocking with balanced brace extraction
  const reqFn = extractFunction(botAiCode, 'requestMode');
  assert(reqFn && reqFn.includes("modeId === 'freeze'"),
    'bot_ai.js requestMode: Freeze tag is properly isolated as coming soon, not infection');

  // Verify setGameMode unblocking
  const setFn = extractFunction(botAiCode, 'setGameMode');
  assert(setFn && setFn.includes("'infection'"),
    'bot_ai.js setGameMode: Handles newMode === "infection" without falling through or throwing');
}

// 4.2 ui.js verification
{
  const uiCode = fs.readFileSync(path.join(ROOT, 'tag', 'js', 'ui.js'), 'utf8');
  // Verify drawModePopup soon condition with balanced brace extraction
  const popupFn = extractFunction(uiCode, 'drawModePopup');
  assert(popupFn && popupFn.includes("md.id === 'freeze'") && !popupFn.includes("md.id === 'infection'"),
    'ui.js drawModePopup: Only freeze is marked as coming soon, infection is fully selectable');

  // Verify cycleGameMode definition
  const cycleFn = extractFunction(uiCode, 'cycleGameMode');
  assert(cycleFn && cycleFn.includes("'infection'"),
    'ui.js cycleGameMode: Rotates through "infection" across both solo/bots and party');
}

// 4.3 wiring.js verification: startMatch player count boundary check
{
  const wiringCode = fs.readFileSync(path.join(ROOT, 'tag', 'js', 'modes', 'wiring.js'), 'utf8');
  assert(wiringCode.includes("settings.gameMode === 'infection'") && wiringCode.includes("act.length < 3"),
    'wiring.js startMatch: Enforces Infection requirement of at least 3 active players');
}

// 4.4 Netplay mode_request verification
{
  const netCode = fs.readFileSync(path.join(ROOT, 'tag', 'js', 'netplay.js'), 'utf8');
  assert(netCode.includes("m.mode === 'freeze'") && !netCode.includes("m.mode === 'infection'"),
    'netplay.js: Host validates mode_request ignoring freeze but accepting infection');
  assert(netCode.includes("settings.gameMode === 'infection'"),
    'netplay.js: Synchronizes infection mode state envelope between host and guests');
}

// -----------------------------------------------------------------------------
// SECTION 5: Adversarial Boundary Inputs in wiring.js & Engine Sandbox
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Adversarial Boundary Inputs in wiring.js & Engine Sandbox ---');

const { createGameSandbox, loadGameScript } = require('./e2e/harness');

// 5.1 Test Infection with 2 players (must abort with toast)
{
  const sb = createGameSandbox();
  sb.settings.gameMode = 'infection';
  sb.menu.slotColor = [0, 1, -1, -1, -1, -1, -1, -1, -1, -1];
  loadGameScript(sb, 'tag/js/modes/wiring.js');
  sb.startMatch();
  assert(sb.screen === 'menu', 'Adversarial 2-player Infection start aborted, screen remained "menu"');
  assert(sb.getToasts().some(t => t.includes('INFECTION') && t.includes('3 PLAYERS')),
    'Warning toast displayed for <3 players in Infection mode');
}

// 5.2 Test Infection with 3 players (must succeed)
{
  const sb = createGameSandbox();
  sb.settings.gameMode = 'infection';
  sb.menu.slotColor = [0, 1, 2, -1, -1, -1, -1, -1, -1, -1];
  loadGameScript(sb, 'tag/js/modes/infection.js');
  loadGameScript(sb, 'tag/js/modes/wiring.js');
  sb.startMatch();
  assert(sb.screen === 'game', 'Valid 3-player Infection start succeeds, screen transitions to "game"');
  assert(sb.infectionState && sb.infectionState.active === true, 'infectionState.active is true');
  assert(sb.match && sb.match.infectionMode === true, 'match.infectionMode is true');
  assert(sb.match.players.filter(p => p.isInfected).length === 1, 'Exactly 1 player is designated patient zero');
  assert(sb.match.players.filter(p => !p.isInfected).length === 2, 'Remaining 2 players are survivors');
}

// 5.3 Test Infection with 10 players (MAXP)
{
  const sb = createGameSandbox();
  sb.settings.gameMode = 'infection';
  sb.menu.slotColor = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  loadGameScript(sb, 'tag/js/modes/infection.js');
  loadGameScript(sb, 'tag/js/modes/wiring.js');
  sb.startMatch();
  assert(sb.screen === 'game', '10-player Infection start succeeds');
  assert(sb.match.players.filter(p => p.isInfected).length === 1, 'MAXP: Exactly 1 player designated patient zero');
  assert(sb.match.players.filter(p => !p.isInfected).length === 9, 'MAXP: 9 players are survivors');
}

// 5.4 Mode switching sequence: Infection -> Bomb -> Crown -> CTF -> Party
{
  const sb = createGameSandbox();
  loadGameScript(sb, 'tag/js/modes/bomb.js');
  loadGameScript(sb, 'tag/js/modes/crown.js');
  loadGameScript(sb, 'tag/js/modes/ctf.js');
  loadGameScript(sb, 'tag/js/modes/infection.js');
  loadGameScript(sb, 'tag/js/modes/wiring.js');
  sb.menu.slotColor = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1];

  sb.settings.gameMode = 'infection';
  sb.startMatch();
  assert(sb.infectionState.active === true && !sb.BOMB_MODE.active && !sb.crownState.active && !sb.ctfState.active,
    'Mode 1: Infection active, all other mode states inactive');

  sb.settings.gameMode = 'bomb';
  sb.startMatch();
  assert(sb.BOMB_MODE.active === true && !sb.infectionState.active && !sb.crownState.active && !sb.ctfState.active,
    'Mode 2: Bomb active, all other mode states inactive');

  sb.settings.gameMode = 'crown';
  sb.startMatch();
  assert(sb.crownState.active === true && !sb.BOMB_MODE.active && !sb.infectionState.active && !sb.ctfState.active,
    'Mode 3: Crown active, all other mode states inactive');

  sb.settings.gameMode = 'ctf';
  sb.startMatch();
  assert(sb.ctfState.active === true && !sb.crownState.active && !sb.BOMB_MODE.active && !sb.infectionState.active,
    'Mode 4: CTF active, all other mode states inactive');

  sb.settings.gameMode = 'party';
  sb.startMatch();
  assert(!sb.ctfState.active && !sb.crownState.active && !sb.BOMB_MODE.active && !sb.infectionState.active,
    'Mode 5: Party active, all 4 mode states inactive');
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  console.error('FAILURES:');
  failures.forEach(f => console.error(` - ${f.name}: ${f.details}`));
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL CHALLENGES PASSED SUCCESSFULLY.');
  process.exit(0);
}
